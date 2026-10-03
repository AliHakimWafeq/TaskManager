"use server";

import { and, asc, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/lib/db";
import { projects, statuses, taskLabels, tasks } from "@/lib/db/schema";
import {
  createTaskSchema,
  moveTaskSchema,
  updateTaskSchema,
  type ActionResult,
} from "@/lib/validation";

function fail(e: unknown): { ok: false; error: string } {
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Invalid input" };
  return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
}

const nowIso = () => new Date().toISOString();

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function nextPosition(tx: Tx, statusId: string) {
  const r = tx
    .select({ m: sql<number>`coalesce(max(${tasks.position}), -1)` })
    .from(tasks)
    .where(eq(tasks.statusId, statusId))
    .get();
  return (r?.m ?? -1) + 1;
}

function completedAtFor(tx: Tx, statusId: string, current: string | null) {
  const s = tx.select({ type: statuses.type }).from(statuses).where(eq(statuses.id, statusId)).get();
  if (!s) throw new Error("Status not found");
  if (s.type === "completed") return current ?? nowIso();
  return null;
}

export async function createTask(
  input: z.input<typeof createTaskSchema>,
): Promise<ActionResult<{ id: string; identifier: string }>> {
  try {
    const data = createTaskSchema.parse(input);
    const result = db.transaction((tx) => {
      const project = tx.select().from(projects).where(eq(projects.id, data.projectId)).get();
      if (!project) throw new Error("Project not found");

      let statusId = data.statusId;
      if (!statusId) {
        const first = tx
          .select({ id: statuses.id })
          .from(statuses)
          .where(eq(statuses.projectId, project.id))
          .orderBy(asc(statuses.position))
          .get();
        if (!first) throw new Error("Project has no statuses");
        statusId = first.id;
      } else {
        const ok = tx
          .select({ id: statuses.id })
          .from(statuses)
          .where(and(eq(statuses.id, statusId), eq(statuses.projectId, project.id)))
          .get();
        if (!ok) throw new Error("Status does not belong to this project");
      }

      if (data.parentId) {
        const parent = tx.select({ projectId: tasks.projectId }).from(tasks).where(eq(tasks.id, data.parentId)).get();
        if (!parent || parent.projectId !== project.id) throw new Error("Invalid parent task");
      }

      const number = project.nextTaskNumber;
      tx.update(projects)
        .set({ nextTaskNumber: number + 1, updatedAt: nowIso() })
        .where(eq(projects.id, project.id))
        .run();

      const id = nanoid();
      tx.insert(tasks)
        .values({
          id,
          projectId: project.id,
          number,
          title: data.title,
          description: data.description ?? null,
          statusId,
          priority: data.priority,
          dueDate: data.dueDate ?? null,
          parentId: data.parentId ?? null,
          position: nextPosition(tx, statusId),
          completedAt: completedAtFor(tx, statusId, null),
        })
        .run();
      for (const labelId of data.labelIds) {
        tx.insert(taskLabels).values({ taskId: id, labelId }).run();
      }
      return { id, identifier: `${project.key}-${number}` };
    });
    revalidatePath("/", "layout");
    return { ok: true, data: result };
  } catch (e) {
    return fail(e);
  }
}

export async function updateTask(
  input: z.input<typeof updateTaskSchema>,
): Promise<ActionResult> {
  try {
    const { id, ...data } = updateTaskSchema.parse(input);
    db.transaction((tx) => {
      const task = tx.select().from(tasks).where(eq(tasks.id, id)).get();
      if (!task) throw new Error("Task not found");
      const patch: Partial<typeof tasks.$inferInsert> = { ...data, updatedAt: nowIso() };

      if (data.statusId && data.statusId !== task.statusId) {
        const ok = tx
          .select({ id: statuses.id })
          .from(statuses)
          .where(and(eq(statuses.id, data.statusId), eq(statuses.projectId, task.projectId)))
          .get();
        if (!ok) throw new Error("Status does not belong to this project");
        patch.position = nextPosition(tx, data.statusId);
        patch.completedAt = completedAtFor(tx, data.statusId, task.completedAt);
      }
      if (data.parentId !== undefined && data.parentId !== null) {
        if (data.parentId === id) throw new Error("A task can’t be its own parent");
        const parent = tx.select({ projectId: tasks.projectId, parentId: tasks.parentId }).from(tasks).where(eq(tasks.id, data.parentId)).get();
        if (!parent || parent.projectId !== task.projectId) throw new Error("Invalid parent task");
      }
      tx.update(tasks).set(patch).where(eq(tasks.id, id)).run();
    });
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

export async function setTaskLabels(taskId: string, labelIds: string[]): Promise<ActionResult> {
  try {
    db.transaction((tx) => {
      tx.delete(taskLabels).where(eq(taskLabels.taskId, taskId)).run();
      for (const labelId of new Set(labelIds)) {
        tx.insert(taskLabels).values({ taskId, labelId }).run();
      }
      tx.update(tasks).set({ updatedAt: nowIso() }).where(eq(tasks.id, taskId)).run();
    });
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

/** Move a task to a column at an index; resequences affected columns. */
export async function moveTask(input: z.input<typeof moveTaskSchema>): Promise<ActionResult> {
  try {
    const { taskId, toStatusId, toIndex } = moveTaskSchema.parse(input);
    db.transaction((tx) => {
      const task = tx.select().from(tasks).where(eq(tasks.id, taskId)).get();
      if (!task) throw new Error("Task not found");
      const target = tx
        .select()
        .from(statuses)
        .where(and(eq(statuses.id, toStatusId), eq(statuses.projectId, task.projectId)))
        .get();
      if (!target) throw new Error("Status does not belong to this project");

      const columnIds = (statusId: string) =>
        tx
          .select({ id: tasks.id })
          .from(tasks)
          .where(and(eq(tasks.statusId, statusId), ne(tasks.id, taskId), sql`${tasks.parentId} IS NULL`))
          .orderBy(asc(tasks.position), asc(tasks.createdAt))
          .all()
          .map((r) => r.id);

      const resequence = (ids: string[]) =>
        ids.forEach((id, i) => tx.update(tasks).set({ position: i }).where(eq(tasks.id, id)).run());

      if (task.statusId !== toStatusId) resequence(columnIds(task.statusId));
      const targetIds = columnIds(toStatusId);
      targetIds.splice(Math.min(toIndex, targetIds.length), 0, taskId);
      resequence(targetIds);

      tx.update(tasks)
        .set({
          statusId: toStatusId,
          updatedAt: nowIso(),
          completedAt: completedAtFor(tx, toStatusId, task.completedAt),
        })
        .where(eq(tasks.id, taskId))
        .run();
    });
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteTask(id: string): Promise<ActionResult> {
  try {
    db.transaction((tx) => {
      tx.update(tasks).set({ parentId: null }).where(eq(tasks.parentId, id)).run();
      tx.delete(tasks).where(eq(tasks.id, id)).run();
    });
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

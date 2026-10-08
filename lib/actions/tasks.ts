"use server";

import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/lib/db";
import { attachments, labels, projects, statuses, taskLabels, tasks } from "@/lib/db/schema";
import { removeUploadFiles } from "@/lib/uploads";
import {
  createTaskSchema,
  id as idSchema,
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

function assertStatusInProject(tx: Tx, statusId: string, projectId: string) {
  const ok = tx
    .select({ id: statuses.id })
    .from(statuses)
    .where(and(eq(statuses.id, statusId), eq(statuses.projectId, projectId)))
    .get();
  if (!ok) throw new Error("Status does not belong to this project");
}

/** Only labels from the task's project or global labels may be attached. */
function assertLabelsAllowed(tx: Tx, labelIds: string[], projectId: string) {
  if (labelIds.length === 0) return;
  const allowed = tx
    .select({ id: labels.id })
    .from(labels)
    .where(and(inArray(labels.id, labelIds), or(eq(labels.projectId, projectId), isNull(labels.projectId))))
    .all();
  if (allowed.length !== new Set(labelIds).size) throw new Error("One or more labels are not available in this project");
}

/** Subtasks are one level deep: the parent must be a top-level task in the same project. */
function assertValidParent(tx: Tx, taskId: string | null, parentId: string, projectId: string) {
  if (taskId && parentId === taskId) throw new Error("A task can’t be its own parent");
  const parent = tx
    .select({ projectId: tasks.projectId, parentId: tasks.parentId })
    .from(tasks)
    .where(eq(tasks.id, parentId))
    .get();
  if (!parent || parent.projectId !== projectId) throw new Error("The parent must be a task in the same project");
  if (parent.parentId) throw new Error("Subtasks can’t have their own subtasks");
  if (taskId) {
    const child = tx.select({ id: tasks.id }).from(tasks).where(eq(tasks.parentId, taskId)).get();
    if (child) throw new Error("This task has subtasks, so it can’t become a subtask");
  }
}

/** Attach any uploaded images referenced in a description to the task. */
function linkAttachments(tx: Tx, taskId: string, description: string | null | undefined) {
  if (!description) return;
  const names = [...description.matchAll(/\/api\/uploads\/([A-Za-z0-9_-]{1,32}\.[a-z0-9]{2,5})/g)].map((m) => m[1]);
  if (names.length === 0) return;
  tx.update(attachments)
    .set({ taskId })
    .where(and(inArray(attachments.filename, [...new Set(names)]), isNull(attachments.taskId)))
    .run();
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
        assertStatusInProject(tx, statusId, project.id);
      }
      if (data.parentId) assertValidParent(tx, null, data.parentId, project.id);
      assertLabelsAllowed(tx, data.labelIds, project.id);

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
      for (const labelId of new Set(data.labelIds)) {
        tx.insert(taskLabels).values({ taskId: id, labelId }).run();
      }
      linkAttachments(tx, id, data.description);
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
        assertStatusInProject(tx, data.statusId, task.projectId);
        patch.position = nextPosition(tx, data.statusId);
        patch.completedAt = completedAtFor(tx, data.statusId, task.completedAt);
      }
      if (data.parentId) assertValidParent(tx, id, data.parentId, task.projectId);
      tx.update(tasks).set(patch).where(eq(tasks.id, id)).run();
      if (data.description !== undefined) linkAttachments(tx, id, data.description);
    });
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

export async function setTaskLabels(taskId: string, labelIds: string[]): Promise<ActionResult> {
  try {
    const tid = idSchema.parse(taskId);
    const ids = z.array(idSchema).max(50).parse(labelIds);
    db.transaction((tx) => {
      const task = tx.select({ projectId: tasks.projectId }).from(tasks).where(eq(tasks.id, tid)).get();
      if (!task) throw new Error("Task not found");
      assertLabelsAllowed(tx, ids, task.projectId);
      tx.delete(taskLabels).where(eq(taskLabels.taskId, tid)).run();
      for (const labelId of new Set(ids)) {
        tx.insert(taskLabels).values({ taskId: tid, labelId }).run();
      }
      tx.update(tasks).set({ updatedAt: nowIso() }).where(eq(tasks.id, tid)).run();
    });
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Move a task into a column, placing it relative to its visible neighbours.
 * Using neighbour ids (not an index) keeps ordering correct when the board is filtered
 * or subtasks are hidden. Without neighbours the task goes to the end of the column.
 */
export async function moveTask(input: z.input<typeof moveTaskSchema>): Promise<ActionResult> {
  try {
    const { taskId, toStatusId, beforeId, afterId } = moveTaskSchema.parse(input);
    db.transaction((tx) => {
      const task = tx.select().from(tasks).where(eq(tasks.id, taskId)).get();
      if (!task) throw new Error("Task not found");
      assertStatusInProject(tx, toStatusId, task.projectId);

      const columnIds = (statusId: string) =>
        tx
          .select({ id: tasks.id })
          .from(tasks)
          .where(and(eq(tasks.statusId, statusId), sql`${tasks.id} <> ${taskId}`))
          .orderBy(asc(tasks.position), asc(tasks.createdAt))
          .all()
          .map((r) => r.id);
      const resequence = (ids: string[]) =>
        ids.forEach((id, i) => tx.update(tasks).set({ position: i }).where(eq(tasks.id, id)).run());

      if (task.statusId !== toStatusId) resequence(columnIds(task.statusId));
      const target = columnIds(toStatusId);
      let index = target.length;
      if (afterId && target.includes(afterId)) index = target.indexOf(afterId) + 1;
      else if (beforeId && target.includes(beforeId)) index = target.indexOf(beforeId);
      target.splice(index, 0, taskId);
      resequence(target);

      if (task.statusId !== toStatusId) {
        tx.update(tasks)
          .set({
            statusId: toStatusId,
            updatedAt: nowIso(),
            completedAt: completedAtFor(tx, toStatusId, task.completedAt),
          })
          .where(eq(tasks.id, taskId))
          .run();
      }
    });
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Delete a task and the image files only it referenced. Subtasks become top-level.
 * Pass `redirectTo` when deleting from the task's own page so we navigate away
 * before the deleted page re-renders.
 */
export async function deleteTask(id: string, redirectTo?: string): Promise<ActionResult> {
  let files: string[] = [];
  try {
    const tid = idSchema.parse(id);
    files = db.transaction((tx) => {
      const owned = tx
        .select({ filename: attachments.filename })
        .from(attachments)
        .where(eq(attachments.taskId, tid))
        .all()
        .map((a) => a.filename);
      tx.delete(attachments).where(eq(attachments.taskId, tid)).run();
      tx.update(tasks).set({ parentId: null }).where(eq(tasks.parentId, tid)).run();
      tx.delete(tasks).where(eq(tasks.id, tid)).run();
      return owned;
    });
  } catch (e) {
    return fail(e);
  }
  await removeUploadFiles(files);
  revalidatePath("/", "layout");
  if (redirectTo && redirectTo.startsWith("/")) redirect(redirectTo);
  return { ok: true, data: undefined };
}

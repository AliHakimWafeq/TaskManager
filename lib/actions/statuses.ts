"use server";

import { and, asc, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/lib/db";
import { statuses, tasks } from "@/lib/db/schema";
import { createStatusSchema, updateStatusSchema, type ActionResult } from "@/lib/validation";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Tasks in a "completed" status carry completedAt; all others don't. */
function syncCompletedAt(tx: Tx, statusId: string, completed: boolean) {
  if (completed) {
    tx.update(tasks)
      .set({ completedAt: new Date().toISOString() })
      .where(and(eq(tasks.statusId, statusId), sql`${tasks.completedAt} IS NULL`))
      .run();
  } else {
    tx.update(tasks).set({ completedAt: null }).where(eq(tasks.statusId, statusId)).run();
  }
}

function fail(e: unknown): { ok: false; error: string } {
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Invalid input" };
  return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
}

export async function createStatus(
  input: z.input<typeof createStatusSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const data = createStatusSchema.parse(input);
    const id = nanoid();
    const max = db
      .select({ m: sql<number>`coalesce(max(${statuses.position}), -1)` })
      .from(statuses)
      .where(eq(statuses.projectId, data.projectId))
      .get();
    db.insert(statuses)
      .values({ id, ...data, position: (max?.m ?? -1) + 1 })
      .run();
    revalidatePath("/", "layout");
    return { ok: true, data: { id } };
  } catch (e) {
    return fail(e);
  }
}

export async function updateStatus(
  input: z.input<typeof updateStatusSchema>,
): Promise<ActionResult> {
  try {
    const { id, ...data } = updateStatusSchema.parse(input);
    db.transaction((tx) => {
      const status = tx.select().from(statuses).where(eq(statuses.id, id)).get();
      if (!status) throw new Error("Status not found");
      if (data.hidden === true && !status.hidden) {
        const visibleOthers = tx
          .select({ c: sql<number>`count(*)` })
          .from(statuses)
          .where(and(eq(statuses.projectId, status.projectId), ne(statuses.id, id), eq(statuses.hidden, false)))
          .get();
        if ((visibleOthers?.c ?? 0) === 0) throw new Error("At least one column has to stay visible");
      }
      tx.update(statuses).set(data).where(eq(statuses.id, id)).run();
      if (data.type && data.type !== status.type) syncCompletedAt(tx, id, data.type === "completed");
    });
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

export async function reorderStatuses(
  projectId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  try {
    db.transaction((tx) => {
      orderedIds.forEach((id, i) => {
        tx.update(statuses)
          .set({ position: i })
          .where(and(eq(statuses.id, id), eq(statuses.projectId, projectId)))
          .run();
      });
    });
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

/** Delete a status. Tasks in it are moved to `moveToStatusId` (required if any exist). */
export async function deleteStatus(
  id: string,
  moveToStatusId?: string,
): Promise<ActionResult> {
  try {
    const status = db.select().from(statuses).where(eq(statuses.id, id)).get();
    if (!status) return { ok: false, error: "Status not found" };
    const siblings = db
      .select()
      .from(statuses)
      .where(eq(statuses.projectId, status.projectId))
      .orderBy(asc(statuses.position))
      .all();
    if (siblings.length <= 1) return { ok: false, error: "A project needs at least one status" };

    const count = db
      .select({ c: sql<number>`count(*)` })
      .from(tasks)
      .where(eq(tasks.statusId, id))
      .get();
    if ((count?.c ?? 0) > 0) {
      const target = siblings.find((s) => s.id === moveToStatusId && s.id !== id);
      if (!target) return { ok: false, error: "Choose a status to move existing tasks to" };
    }

    db.transaction((tx) => {
      if (moveToStatusId && (count?.c ?? 0) > 0) {
        const max = tx
          .select({ m: sql<number>`coalesce(max(${tasks.position}), -1)` })
          .from(tasks)
          .where(eq(tasks.statusId, moveToStatusId))
          .get();
        tx.update(tasks)
          .set({ statusId: moveToStatusId, position: sql`${tasks.position} + ${(max?.m ?? -1) + 1}` })
          .where(eq(tasks.statusId, id))
          .run();
        const target = siblings.find((x) => x.id === moveToStatusId);
        syncCompletedAt(tx, moveToStatusId, target?.type === "completed");
      }
      tx.delete(statuses).where(eq(statuses.id, id)).run();
      // Keep at least one visible column.
      const remaining = siblings.filter((x) => x.id !== id);
      if (remaining.length && remaining.every((x) => x.hidden)) {
        tx.update(statuses).set({ hidden: false }).where(eq(statuses.id, remaining[0].id)).run();
      }
      siblings
        .filter((s) => s.id !== id)
        .forEach((s, i) => tx.update(statuses).set({ position: i }).where(eq(statuses.id, s.id)).run());
    });
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

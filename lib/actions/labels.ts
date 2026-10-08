"use server";

import { and, eq, isNull, ne, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/lib/db";
import { labels } from "@/lib/db/schema";
import { createLabelSchema, updateLabelSchema, type ActionResult } from "@/lib/validation";

/** A label name must be unique among the labels visible in its scope (project + global). */
function assertUniqueName(name: string, projectId: string | null, exceptId?: string) {
  const scope = projectId
    ? or(eq(labels.projectId, projectId), isNull(labels.projectId))
    : sql`1 = 1`; // a new global label must not clash with any label anywhere
  const clash = db
    .select({ id: labels.id })
    .from(labels)
    .where(and(scope, sql`lower(${labels.name}) = lower(${name})`, exceptId ? ne(labels.id, exceptId) : undefined))
    .get();
  if (clash) throw new Error("A label with that name already exists");
}

function fail(e: unknown): { ok: false; error: string } {
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Invalid input" };
  const msg = e instanceof Error ? e.message : "Something went wrong";
  if (/UNIQUE constraint failed/.test(msg)) return { ok: false, error: "A label with that name already exists" };
  return { ok: false, error: msg };
}

export async function createLabel(
  input: z.input<typeof createLabelSchema>,
): Promise<ActionResult<{ id: string; name: string; color: string; projectId: string | null }>> {
  try {
    const data = createLabelSchema.parse(input);
    assertUniqueName(data.name, data.projectId);
    const id = nanoid();
    db.insert(labels).values({ id, ...data }).run();
    revalidatePath("/", "layout");
    return { ok: true, data: { id, ...data } };
  } catch (e) {
    return fail(e);
  }
}

export async function updateLabel(
  input: z.input<typeof updateLabelSchema>,
): Promise<ActionResult> {
  try {
    const { id, ...data } = updateLabelSchema.parse(input);
    if (data.name) {
      const current = db.select().from(labels).where(eq(labels.id, id)).get();
      if (!current) throw new Error("Label not found");
      assertUniqueName(data.name, current.projectId, id);
    }
    db.update(labels).set(data).where(eq(labels.id, id)).run();
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteLabel(id: string): Promise<ActionResult> {
  try {
    db.delete(labels).where(eq(labels.id, id)).run();
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

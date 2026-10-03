"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { z } from "zod";
import { DEFAULT_STATUSES } from "@/lib/constants";
import { db } from "@/lib/db";
import { projects, statuses } from "@/lib/db/schema";
import { createProjectSchema, updateProjectSchema, type ActionResult } from "@/lib/validation";

function fail(e: unknown): { ok: false; error: string } {
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Invalid input" };
  const msg = e instanceof Error ? e.message : "Something went wrong";
  if (/UNIQUE constraint failed: projects\.key/.test(msg)) return { ok: false, error: "That key is already in use" };
  return { ok: false, error: msg };
}

export async function createProject(
  input: z.input<typeof createProjectSchema>,
): Promise<ActionResult<{ id: string; key: string }>> {
  try {
    const data = createProjectSchema.parse(input);
    const id = nanoid();
    db.transaction((tx) => {
      tx.insert(projects)
        .values({ id, name: data.name, key: data.key, color: data.color, description: data.description ?? null })
        .run();
      DEFAULT_STATUSES.forEach((s, i) => {
        tx.insert(statuses)
          .values({ id: nanoid(), projectId: id, name: s.name, color: s.color, type: s.type, position: i })
          .run();
      });
    });
    revalidatePath("/", "layout");
    return { ok: true, data: { id, key: data.key } };
  } catch (e) {
    return fail(e);
  }
}

export async function updateProject(
  input: z.input<typeof updateProjectSchema>,
): Promise<ActionResult> {
  try {
    const { id, ...data } = updateProjectSchema.parse(input);
    db.update(projects)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(projects.id, id))
      .run();
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  try {
    db.delete(projects).where(eq(projects.id, id)).run();
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

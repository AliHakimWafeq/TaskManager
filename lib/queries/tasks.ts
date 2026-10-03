import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";

/** Map of statusId -> task count for a project. */
export function countTasksByStatus(projectId: string): Record<string, number> {
  const rows = db
    .select({ statusId: tasks.statusId, c: sql<number>`count(*)` })
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .groupBy(tasks.statusId)
    .all();
  return Object.fromEntries(rows.map((r) => [r.statusId, r.c]));
}

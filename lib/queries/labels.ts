import { asc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { labels } from "@/lib/db/schema";

/** Labels usable in a project: its own plus global ones. */
export function listLabelsForProject(projectId: string) {
  return db
    .select()
    .from(labels)
    .where(or(eq(labels.projectId, projectId), isNull(labels.projectId)))
    .orderBy(asc(labels.name))
    .all();
}

export function listAllLabels() {
  return db.select().from(labels).orderBy(asc(labels.name)).all();
}

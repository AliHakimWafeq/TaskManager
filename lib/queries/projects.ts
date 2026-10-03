import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, statuses } from "@/lib/db/schema";

export function listProjects() {
  return db.select().from(projects).orderBy(asc(projects.createdAt)).all();
}

export function getProjectByKey(key: string) {
  return db.select().from(projects).where(eq(projects.key, key.toUpperCase())).get() ?? null;
}

export function getProjectById(id: string) {
  return db.select().from(projects).where(eq(projects.id, id)).get() ?? null;
}

export function listStatuses(projectId: string) {
  return db
    .select()
    .from(statuses)
    .where(eq(statuses.projectId, projectId))
    .orderBy(asc(statuses.position))
    .all();
}

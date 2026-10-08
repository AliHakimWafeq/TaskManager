"use server";

import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { likePattern } from "@/lib/filters";

export type SearchHit = {
  id: string;
  identifier: string;
  title: string;
  projectName: string;
  projectColor: string;
  statusType: string;
  statusColor: string;
};

export async function searchTasks(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (!q) return [];
  const pattern = likePattern(q.slice(0, 100));
  const rows = db.query.tasks
    .findMany({
      where: sql`(${tasks.title} like ${pattern} escape '\\' or (select p.key || '-' || ${tasks.number} from projects p where p.id = ${tasks.projectId}) like ${pattern.toUpperCase()} escape '\\')`,
      with: {
        project: { columns: { key: true, name: true, color: true } },
        status: { columns: { type: true, color: true } },
      },
      orderBy: [desc(tasks.updatedAt)],
      limit: 15,
    })
    .sync();
  return rows.map((r) => ({
    id: r.id,
    identifier: `${r.project.key}-${r.number}`,
    title: r.title,
    projectName: r.project.name,
    projectColor: r.project.color,
    statusType: r.status.type,
    statusColor: r.status.color,
  }));
}

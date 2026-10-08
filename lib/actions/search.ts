"use server";

import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { idMatchCondition, likePattern, parseSearchQuery, searchCondition } from "@/lib/filters";

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
  // Titles, exact IDs ("BLB-104", "104"), and partial IDs while typing ("BLB-10").
  const { text } = parseSearchQuery(q);
  const partialId = sql`(select p.key || '-' || ${tasks.number} from projects p where p.id = ${tasks.projectId}) like ${likePattern(text.replace(/^#/, "")).toUpperCase()} escape '\\'`;
  const exact = idMatchCondition(q);
  const rows = db.query.tasks
    .findMany({
      where: sql`(${searchCondition(q)} or ${partialId})`,
      with: {
        project: { columns: { key: true, name: true, color: true } },
        status: { columns: { type: true, color: true } },
      },
      // Exact ID hits first, then most recently updated.
      orderBy: [...(exact ? [sql`case when ${exact} then 0 else 1 end`] : []), desc(tasks.updatedAt)],
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

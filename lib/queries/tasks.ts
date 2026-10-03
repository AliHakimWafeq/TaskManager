import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { labels, projects, statuses, tasks } from "@/lib/db/schema";
import type { Label, Project, Status, Task } from "@/lib/db/schema";
import { PRIORITY_ORDER } from "@/lib/constants";

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

export type TaskRow = Task & {
  identifier: string;
  project: Pick<Project, "id" | "key" | "name" | "color">;
  status: Status;
  labels: Label[];
  subtaskCount: number;
  subtaskDone: number;
};

export type SortKey = "manual" | "priority" | "dueDate" | "createdAt" | "updatedAt" | "title";

/**
 * Load tasks with everything cards and rows need. `where` is an optional extra
 * predicate (see lib/filters.ts). Sorting is applied in JS; data sets are small.
 */
export function queryTasks(opts: {
  projectId?: string;
  where?: SQL;
  sort?: SortKey;
  includeSubtasks?: boolean;
} = {}): TaskRow[] {
  const conds: SQL[] = [];
  if (opts.projectId) conds.push(eq(tasks.projectId, opts.projectId));
  if (opts.where) conds.push(opts.where);
  if (!opts.includeSubtasks) conds.push(sql`${tasks.parentId} IS NULL`);

  const rows = db.query.tasks.findMany({
    where: conds.length ? and(...conds) : undefined,
    with: {
      project: { columns: { id: true, key: true, name: true, color: true } },
      status: true,
      taskLabels: { with: { label: true } },
      subtasks: { with: { status: { columns: { type: true } } }, columns: { id: true } },
    },
    orderBy: [asc(tasks.position), desc(tasks.createdAt)],
  }).sync();

  const out: TaskRow[] = rows.map((r) => {
    const { taskLabels, subtasks, ...task } = r;
    return {
      ...task,
      identifier: `${r.project.key}-${r.number}`,
      labels: taskLabels.map((tl) => tl.label).sort((a, b) => a.name.localeCompare(b.name)),
      subtaskCount: subtasks.length,
      subtaskDone: subtasks.filter((s) => s.status.type === "completed").length,
    };
  });

  return sortTasks(out, opts.sort ?? "manual");
}

export function sortTasks(rows: TaskRow[], sort: SortKey) {
  const prio = (p: string) => PRIORITY_ORDER.indexOf(p as (typeof PRIORITY_ORDER)[number]);
  const cmp: Record<SortKey, (a: TaskRow, b: TaskRow) => number> = {
    manual: (a, b) => a.status.position - b.status.position || a.position - b.position,
    priority: (a, b) => prio(a.priority) - prio(b.priority) || a.position - b.position,
    dueDate: (a, b) =>
      (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || prio(a.priority) - prio(b.priority),
    createdAt: (a, b) => b.createdAt.localeCompare(a.createdAt),
    updatedAt: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    title: (a, b) => a.title.localeCompare(b.title),
  };
  return [...rows].sort(cmp[sort]);
}

export type TaskDetail = TaskRow & {
  subtasks: (Pick<Task, "id" | "number" | "title" | "statusId" | "priority" | "position"> & {
    status: Status;
    identifier: string;
  })[];
  parent: (Pick<Task, "id" | "number" | "title"> & { identifier: string }) | null;
};

export function getTaskByIdentifier(key: string, number: number): TaskDetail | null {
  const project = db.select().from(projects).where(eq(projects.key, key)).get();
  if (!project) return null;
  const row = db.query.tasks.findFirst({
    where: and(eq(tasks.projectId, project.id), eq(tasks.number, number)),
    with: {
      project: { columns: { id: true, key: true, name: true, color: true } },
      status: true,
      taskLabels: { with: { label: true } },
      subtasks: {
        with: { status: true },
        columns: { id: true, number: true, title: true, statusId: true, priority: true, position: true },
        orderBy: [asc(tasks.position), asc(tasks.number)],
      },
      parent: { columns: { id: true, number: true, title: true } },
    },
  }).sync();
  if (!row) return null;
  const { taskLabels, subtasks, parent, ...task } = row;
  return {
    ...task,
    identifier: `${project.key}-${row.number}`,
    labels: taskLabels.map((tl) => tl.label).sort((a, b) => a.name.localeCompare(b.name)),
    subtaskCount: subtasks.length,
    subtaskDone: subtasks.filter((s) => s.status.type === "completed").length,
    subtasks: subtasks.map((s) => ({ ...s, identifier: `${project.key}-${s.number}` })),
    parent: parent ? { ...parent, identifier: `${project.key}-${parent.number}` } : null,
  };
}

export function getTaskById(id: string) {
  return db.select().from(tasks).where(eq(tasks.id, id)).get() ?? null;
}

export { labels, statuses };

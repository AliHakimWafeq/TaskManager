import { and, eq, inArray, isNull, like, lt, lte, sql, type SQL } from "drizzle-orm";
import { PRIORITIES, STATUS_TYPES, type Priority, type StatusType } from "@/lib/enums";
import { tasks } from "@/lib/db/schema";
import { todayIso } from "@/lib/dates";
import type { SortKey } from "@/lib/queries/tasks";

export const DUE_OPTIONS = ["overdue", "today", "week", "none", "any"] as const;
export type DueFilter = (typeof DUE_OPTIONS)[number];
export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "priority", label: "Priority" },
  { value: "dueDate", label: "Due date" },
  { value: "updatedAt", label: "Last updated" },
  { value: "createdAt", label: "Newest" },
  { value: "title", label: "Title" },
];

export type Filters = {
  q: string;
  status: string[]; // status ids (project views)
  type: StatusType[]; // status types (inbox)
  priority: Priority[];
  label: string[]; // label ids
  project: string[]; // project ids (inbox)
  due: DueFilter | null;
  sort: SortKey;
};

export type SearchParams = Record<string, string | string[] | undefined>;

const list = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? v.split(",") : []).map((s) => s.trim()).filter(Boolean);

export function parseFilters(sp: SearchParams): Filters {
  const sort = typeof sp.sort === "string" ? sp.sort : "manual";
  const due = typeof sp.due === "string" ? sp.due : null;
  return {
    q: typeof sp.q === "string" ? sp.q.trim() : "",
    status: list(sp.status),
    type: list(sp.type).filter((t): t is StatusType => (STATUS_TYPES as readonly string[]).includes(t)),
    priority: list(sp.priority).filter((p): p is Priority => (PRIORITIES as readonly string[]).includes(p)),
    label: list(sp.label),
    project: list(sp.project),
    due: due && (DUE_OPTIONS as readonly string[]).includes(due) ? (due as DueFilter) : null,
    sort: SORT_OPTIONS.some((s) => s.value === sort) ? (sort as SortKey) : "manual",
  };
}

export function hasActiveFilters(f: Filters) {
  return !!(f.q || f.status.length || f.type.length || f.priority.length || f.label.length || f.project.length || f.due);
}

/** Build the SQL predicate for queryTasks. */
export function filtersToWhere(f: Filters): SQL | undefined {
  const conds: SQL[] = [];
  if (f.q) conds.push(like(tasks.title, `%${f.q.replace(/[%_]/g, (m) => `\\${m}`)}%`));
  if (f.status.length) conds.push(inArray(tasks.statusId, f.status));
  if (f.priority.length) conds.push(inArray(tasks.priority, f.priority));
  if (f.project.length) conds.push(inArray(tasks.projectId, f.project));
  // Note: inside relational queries Drizzle rewrites referenced columns to the main table alias,
  // so correlated subqueries spell out the other tables' identifiers explicitly.
  const values = (xs: string[]) => sql.join(xs.map((x) => sql`${x}`), sql`, `);
  if (f.type.length) {
    conds.push(
      sql`exists (select 1 from statuses s where s.id = ${tasks.statusId} and s.type in (${values(f.type)}))`,
    );
  }
  if (f.label.length) {
    conds.push(
      sql`exists (select 1 from task_labels tl where tl.task_id = ${tasks.id} and tl.label_id in (${values(f.label)}))`,
    );
  }
  if (f.due) {
    const today = todayIso();
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const week = d.toISOString().slice(0, 10);
    const notDone = sql`not exists (select 1 from statuses s where s.id = ${tasks.statusId} and s.type in ('completed','cancelled'))`;
    switch (f.due) {
      case "overdue":
        conds.push(and(lt(tasks.dueDate, today), notDone)!);
        break;
      case "today":
        conds.push(eq(tasks.dueDate, today));
        break;
      case "week":
        conds.push(and(sql`${tasks.dueDate} >= ${today}`, lte(tasks.dueDate, week))!);
        break;
      case "none":
        conds.push(isNull(tasks.dueDate));
        break;
      case "any":
        conds.push(sql`${tasks.dueDate} is not null`);
        break;
    }
  }
  return conds.length ? and(...conds) : undefined;
}

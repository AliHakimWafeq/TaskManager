import { asc, eq, isNull, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { PALETTE } from "@/lib/constants";
import { db } from "@/lib/db";
import { labels, projects, statuses } from "@/lib/db/schema";
import { docToMarkdown } from "@/lib/editor/markdown";
import { PRIORITIES } from "@/lib/enums";
import { HttpError } from "@/lib/http";
import { parseIdentifier } from "@/lib/identifiers";
import { getTaskByIdentifier, type TaskDetail, type TaskRow } from "@/lib/queries/tasks";
import { isoDate } from "@/lib/validation";

/** JSON API request bodies. Descriptions are Markdown; names are resolved server-side. */
export const apiCreateTaskSchema = z.object({
  project: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(200_000).optional(),
  status: z.string().optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueDate: isoDate.nullable().optional(),
  labels: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  parent: z.string().optional(),
});

export const apiUpdateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(200_000).nullable().optional(),
  appendDescription: z.string().max(200_000).optional(),
  status: z.string().optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueDate: isoDate.nullable().optional(),
  labels: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  parent: z.string().nullable().optional(),
});

export function requireProject(key: string) {
  const project = db.select().from(projects).where(eq(projects.key, key.trim().toUpperCase())).get();
  if (!project) throw new HttpError(404, `Project ${key} not found`);
  return project;
}

/** Match a status by name (case-insensitive) or by type ("completed", "started", ...). */
export function requireStatus(projectId: string, nameOrType: string) {
  const all = db.select().from(statuses).where(eq(statuses.projectId, projectId)).orderBy(asc(statuses.position)).all();
  const q = nameOrType.trim().toLowerCase();
  const match = all.find((s) => s.name.toLowerCase() === q) ?? all.find((s) => s.type === q);
  if (!match) throw new HttpError(400, `Unknown status "${nameOrType}". Available: ${all.map((s) => s.name).join(", ")}`);
  return match;
}

/** Resolve label names to ids, creating missing project labels. */
export function resolveLabels(projectId: string, names: string[]) {
  const available = db
    .select()
    .from(labels)
    .where(or(eq(labels.projectId, projectId), isNull(labels.projectId)))
    .all();
  return names.map((name, i) => {
    const hit = available.find((l) => l.name.toLowerCase() === name.toLowerCase());
    if (hit) return hit.id;
    const id = nanoid();
    const used = new Set(available.map((l) => l.color));
    const color = PALETTE.find((c) => !used.has(c)) ?? PALETTE[(available.length + i) % PALETTE.length];
    db.insert(labels).values({ id, projectId, name, color }).run();
    available.push({ id, projectId, name, color });
    return id;
  });
}

export function requireTask(identifier: string) {
  const parsed = parseIdentifier(identifier);
  if (!parsed) throw new HttpError(400, `"${identifier}" is not a task identifier like WEB-12`);
  const task = getTaskByIdentifier(parsed.key, parsed.number);
  if (!task) throw new HttpError(404, `Task ${identifier} not found`);
  return task;
}

export function serializeRow(t: TaskRow, origin: string) {
  return {
    identifier: t.identifier,
    title: t.title,
    project: t.project.key,
    status: t.status.name,
    statusType: t.status.type,
    priority: t.priority,
    dueDate: t.dueDate,
    labels: t.labels.map((l) => l.name),
    parent: t.parent?.identifier ?? null,
    subtasks: { total: t.subtaskCount, done: t.subtaskDone },
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    completedAt: t.completedAt,
    url: `${origin}/issue/${t.identifier}`,
  };
}

export function serializeDetail(t: TaskDetail, origin: string) {
  return {
    ...serializeRow(t, origin),
    description: docToMarkdown(t.description),
    subtasks: t.subtasks.map((s) => ({ identifier: s.identifier, title: s.title, status: s.status.name })),
  };
}

export function originOf(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

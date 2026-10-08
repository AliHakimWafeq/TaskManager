import { z } from "zod";
import { PRIORITIES, STATUS_TYPES } from "@/lib/enums";

export const id = z.string().min(1).max(64);
export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color");
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

export const projectKeySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z][A-Z0-9]{1,4}$/, "Key must be 2–5 letters/numbers, starting with a letter");

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  key: projectKeySchema,
  color: hexColor.default("#6366f1"),
  description: z.string().trim().max(500).optional(),
});

export const updateProjectSchema = z.object({
  id,
  name: z.string().trim().min(1).max(80).optional(),
  color: hexColor.optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

export const createStatusSchema = z.object({
  projectId: id,
  name: z.string().trim().min(1).max(40),
  color: hexColor.default("#9ca3af"),
  type: z.enum(STATUS_TYPES).default("unstarted"),
});

export const updateStatusSchema = z.object({
  id,
  name: z.string().trim().min(1).max(40).optional(),
  color: hexColor.optional(),
  type: z.enum(STATUS_TYPES).optional(),
  hidden: z.boolean().optional(),
});

export const createTaskSchema = z.object({
  projectId: id,
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().nullable().optional(),
  statusId: id.optional(),
  priority: z.enum(PRIORITIES).default("none"),
  dueDate: isoDate.nullable().optional(),
  parentId: id.nullable().optional(),
  labelIds: z.array(id).default([]),
});

export const updateTaskSchema = z.object({
  id,
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  statusId: id.optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueDate: isoDate.nullable().optional(),
  parentId: id.nullable().optional(),
});

export const moveTaskSchema = z.object({
  taskId: id,
  toStatusId: id,
  /** The visible card the task was dropped in front of. */
  beforeId: id.nullable().optional(),
  /** The visible card the task was dropped after. */
  afterId: id.nullable().optional(),
});

export const createLabelSchema = z.object({
  projectId: id.nullable().default(null),
  name: z.string().trim().min(1).max(40),
  color: hexColor.default("#9ca3af"),
});

export const updateLabelSchema = z.object({
  id,
  name: z.string().trim().min(1).max(40).optional(),
  color: hexColor.optional(),
});

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

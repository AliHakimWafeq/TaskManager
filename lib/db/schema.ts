import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { PRIORITIES, STATUS_TYPES } from "@/lib/enums";

export type { Priority, StatusType } from "@/lib/enums";

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  key: text("key").notNull().unique(),
  description: text("description"),
  color: text("color").notNull().default("#6366f1"),
  nextTaskNumber: integer("next_task_number").notNull().default(1),
  createdAt: text("created_at").notNull().default(now),
  updatedAt: text("updated_at").notNull().default(now),
});

export const statuses = sqliteTable(
  "statuses",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#9ca3af"),
    type: text("type", { enum: STATUS_TYPES }).notNull().default("unstarted"),
    position: integer("position").notNull().default(0),
    hidden: integer("hidden_on_board", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("statuses_project_idx").on(t.projectId, t.position)],
);

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    description: text("description"), // Tiptap JSON document, serialized
    statusId: text("status_id")
      .notNull()
      .references(() => statuses.id),
    priority: text("priority", { enum: PRIORITIES }).notNull().default("none"),
    dueDate: text("due_date"), // YYYY-MM-DD
    position: integer("position").notNull().default(0),
    parentId: text("parent_id"),
    createdAt: text("created_at").notNull().default(now),
    updatedAt: text("updated_at").notNull().default(now),
    completedAt: text("completed_at"),
  },
  (t) => [
    uniqueIndex("tasks_project_number_idx").on(t.projectId, t.number),
    index("tasks_status_idx").on(t.statusId, t.position),
    index("tasks_parent_idx").on(t.parentId),
  ],
);

export const labels = sqliteTable(
  "labels",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }), // null = global label
    name: text("name").notNull(),
    color: text("color").notNull().default("#9ca3af"),
  },
  (t) => [uniqueIndex("labels_project_name_idx").on(t.projectId, t.name)],
);

export const taskLabels = sqliteTable(
  "task_labels",
  {
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    labelId: text("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.labelId] })],
);

export const attachments = sqliteTable(
  "attachments",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id").references(() => tasks.id, { onDelete: "set null" }),
    filename: text("filename").notNull().unique(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    createdAt: text("created_at").notNull().default(now),
  },
  (t) => [index("attachments_task_idx").on(t.taskId)],
);

// Relations (for db.query.* relational API)
export const projectsRelations = relations(projects, ({ many }) => ({
  statuses: many(statuses),
  tasks: many(tasks),
  labels: many(labels),
}));

export const statusesRelations = relations(statuses, ({ one, many }) => ({
  project: one(projects, { fields: [statuses.projectId], references: [projects.id] }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  status: one(statuses, { fields: [tasks.statusId], references: [statuses.id] }),
  parent: one(tasks, {
    fields: [tasks.parentId],
    references: [tasks.id],
    relationName: "subtasks",
  }),
  subtasks: many(tasks, { relationName: "subtasks" }),
  taskLabels: many(taskLabels),
  attachments: many(attachments),
}));

export const labelsRelations = relations(labels, ({ one, many }) => ({
  project: one(projects, { fields: [labels.projectId], references: [projects.id] }),
  taskLabels: many(taskLabels),
}));

export const taskLabelsRelations = relations(taskLabels, ({ one }) => ({
  task: one(tasks, { fields: [taskLabels.taskId], references: [tasks.id] }),
  label: one(labels, { fields: [taskLabels.labelId], references: [labels.id] }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  task: one(tasks, { fields: [attachments.taskId], references: [tasks.id] }),
}));

export type Project = typeof projects.$inferSelect;
export type Status = typeof statuses.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Label = typeof labels.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;

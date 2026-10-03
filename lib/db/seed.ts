import { nanoid } from "nanoid";
import { db } from "./index";
import { runMigrations } from "./migrate";
import { labels, projects, statuses, taskLabels, tasks } from "./schema";
import { DEFAULT_STATUSES } from "../constants";

runMigrations();

const existing = db.select({ id: projects.id }).from(projects).all();
if (existing.length > 0) {
  console.log("Database already has projects; skipping seed.");
  process.exit(0);
}

const doc = (text: string) =>
  JSON.stringify({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  });

const today = new Date();
const d = (offset: number) => {
  const x = new Date(today);
  x.setDate(x.getDate() + offset);
  return x.toISOString().slice(0, 10);
};

db.transaction((tx) => {
  const projectId = nanoid();
  tx.insert(projects)
    .values({
      id: projectId,
      name: "Web App",
      key: "WEB",
      color: "#6366f1",
      description: "Demo project seeded for development.",
    })
    .run();

  const statusIds = DEFAULT_STATUSES.map((s, i) => {
    const id = nanoid();
    tx.insert(statuses)
      .values({ id, projectId, name: s.name, color: s.color, type: s.type, position: i })
      .run();
    return id;
  });
  const [backlog, todo, inProgress, done] = statusIds;

  const labelDefs = [
    { name: "Bug", color: "#ef4444" },
    { name: "Feature", color: "#8b5cf6" },
    { name: "Design", color: "#ec4899" },
    { name: "Infra", color: "#0ea5e9" },
  ];
  const labelIds: Record<string, string> = {};
  for (const l of labelDefs) {
    const id = nanoid();
    tx.insert(labels).values({ id, projectId, name: l.name, color: l.color }).run();
    labelIds[l.name] = id;
  }

  const seedTasks: {
    title: string;
    statusId: string;
    priority: "none" | "low" | "medium" | "high" | "urgent";
    dueDate?: string;
    labels?: string[];
    body?: string;
  }[] = [
    { title: "Set up CI pipeline", statusId: done, priority: "high", labels: ["Infra"] },
    { title: "Design onboarding flow", statusId: done, priority: "medium", labels: ["Design"] },
    { title: "Implement login page", statusId: inProgress, priority: "urgent", dueDate: d(1), labels: ["Feature"] },
    { title: "Fix flaky checkout test", statusId: inProgress, priority: "high", dueDate: d(-1), labels: ["Bug"] },
    { title: "Add dark mode toggle", statusId: todo, priority: "medium", labels: ["Feature", "Design"] },
    { title: "Write API docs", statusId: todo, priority: "low", dueDate: d(7) },
    { title: "Image upload returns 500 on large files", statusId: todo, priority: "urgent", labels: ["Bug"] },
    { title: "Migrate to Postgres", statusId: backlog, priority: "none", labels: ["Infra"] },
    { title: "Explore keyboard shortcuts", statusId: backlog, priority: "low" },
    { title: "Refresh marketing site", statusId: backlog, priority: "medium", labels: ["Design"] },
    { title: "Rate limiting on public API", statusId: backlog, priority: "high", labels: ["Infra", "Feature"] },
    { title: "Audit accessibility", statusId: todo, priority: "medium", dueDate: d(14), labels: ["Design"] },
  ];

  const positions: Record<string, number> = {};
  let number = 1;
  for (const t of seedTasks) {
    const id = nanoid();
    const position = positions[t.statusId] ?? 0;
    positions[t.statusId] = position + 1;
    tx.insert(tasks)
      .values({
        id,
        projectId,
        number: number++,
        title: t.title,
        description: doc(t.body ?? `Details for "${t.title}".`),
        statusId: t.statusId,
        priority: t.priority,
        dueDate: t.dueDate ?? null,
        position,
        completedAt: t.statusId === done ? new Date().toISOString() : null,
      })
      .run();
    for (const name of t.labels ?? []) {
      tx.insert(taskLabels).values({ taskId: id, labelId: labelIds[name] }).run();
    }
  }
  tx.update(projects).set({ nextTaskNumber: number }).run();
});

console.log("Seeded demo project WEB with 12 tasks.");

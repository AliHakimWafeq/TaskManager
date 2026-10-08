import { createTask } from "@/lib/actions/tasks";
import { apiCreateTaskSchema, originOf, requireProject, requireStatus, requireTask, resolveLabels, serializeDetail, serializeRow } from "@/lib/api";
import { markdownToDoc } from "@/lib/editor/markdown";
import { filtersToWhere, parseFilters } from "@/lib/filters";
import { handler, HttpError, json, readJson } from "@/lib/http";
import { getPreferences } from "@/lib/preferences";
import { queryTasks } from "@/lib/queries/tasks";

/**
 * GET /api/tasks?project=WEB&q=login&priority=high,urgent&type=started&due=overdue&sort=priority&subtasks=1
 * Lists tasks (top-level only unless subtasks=1).
 */
export const GET = handler(async (req: Request) => {
  const url = new URL(req.url);
  const sp = Object.fromEntries(url.searchParams.entries());
  const filters = parseFilters(sp);
  const projectKey = url.searchParams.get("project");
  const project = projectKey ? requireProject(projectKey) : null;
  const { today } = await getPreferences();
  const rows = queryTasks({
    projectId: project?.id,
    where: filtersToWhere({ ...filters, project: [] }, today),
    sort: filters.sort === "manual" && !project ? "updatedAt" : filters.sort,
    includeSubtasks: url.searchParams.get("subtasks") === "1",
  });
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100) || 100, 500);
  return json(rows.slice(0, limit).map((t) => serializeRow(t, originOf(req))));
});

/** POST /api/tasks: create a task. `description` is Markdown. */
export const POST = handler(async (req: Request) => {
  const body = apiCreateTaskSchema.parse(await readJson(req));
  const project = requireProject(body.project);
  const res = await createTask({
    projectId: project.id,
    title: body.title,
    description: body.description ? markdownToDoc(body.description) : null,
    statusId: body.status ? requireStatus(project.id, body.status).id : undefined,
    priority: body.priority ?? "none",
    dueDate: body.dueDate ?? null,
    parentId: body.parent ? requireTask(body.parent).id : null,
    labelIds: body.labels ? resolveLabels(project.id, body.labels) : [],
  });
  if (!res.ok) throw new HttpError(400, res.error);
  return json(serializeDetail(requireTask(res.data.identifier), originOf(req)), 201);
});

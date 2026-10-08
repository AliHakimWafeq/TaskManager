import { deleteTask, setTaskLabels, updateTask } from "@/lib/actions/tasks";
import { apiUpdateTaskSchema, originOf, requireStatus, requireTask, resolveLabels, serializeDetail } from "@/lib/api";
import { docToMarkdown, markdownToDoc } from "@/lib/editor/markdown";
import { handler, HttpError, json, readJson } from "@/lib/http";

type Ctx = { params: Promise<{ identifier: string }> };

/** GET /api/tasks/WEB-12: task with its description as Markdown. */
export const GET = handler(async (req: Request, ctx: Ctx) => {
  const { identifier } = await ctx.params;
  return json(serializeDetail(requireTask(identifier), originOf(req)));
});

/**
 * PATCH /api/tasks/WEB-12: partial update.
 * `description` replaces the body (Markdown, null clears it); `appendDescription` adds Markdown at the end.
 * `labels` replaces the label set by name; `parent` takes an identifier or null.
 */
export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const { identifier } = await ctx.params;
  const body = apiUpdateTaskSchema.parse(await readJson(req));
  const task = requireTask(identifier);
  if (body.description !== undefined && body.appendDescription !== undefined) {
    throw new HttpError(400, "Send either description or appendDescription, not both");
  }

  let description: string | null | undefined;
  if (body.description !== undefined) description = body.description === null ? null : markdownToDoc(body.description);
  if (body.appendDescription !== undefined) {
    const current = docToMarkdown(task.description);
    description = markdownToDoc(current ? `${current}\n\n${body.appendDescription}` : body.appendDescription);
  }

  const patch = {
    title: body.title,
    description,
    statusId: body.status ? requireStatus(task.projectId, body.status).id : undefined,
    priority: body.priority,
    dueDate: body.dueDate,
    parentId: body.parent === undefined ? undefined : body.parent === null ? null : requireTask(body.parent).id,
  };
  if (Object.values(patch).some((v) => v !== undefined)) {
    const res = await updateTask({ id: task.id, ...patch });
    if (!res.ok) throw new HttpError(400, res.error);
  }
  if (body.labels) {
    const res = await setTaskLabels(task.id, resolveLabels(task.projectId, body.labels));
    if (!res.ok) throw new HttpError(400, res.error);
  }
  return json(serializeDetail(requireTask(identifier), originOf(req)));
});

/** DELETE /api/tasks/WEB-12 */
export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const { identifier } = await ctx.params;
  const task = requireTask(identifier);
  const res = await deleteTask(task.id);
  if (!res.ok) throw new HttpError(400, res.error);
  return json({ deleted: identifier });
});

import { listLabelsForProject } from "@/lib/queries/labels";
import { listProjects, listStatuses } from "@/lib/queries/projects";
import { handler, json } from "@/lib/http";

/** GET /api/projects: projects with their statuses (in board order) and labels. */
export const GET = handler(async () =>
  json(
    listProjects().map((p) => ({
      key: p.key,
      name: p.name,
      description: p.description,
      statuses: listStatuses(p.id).map((s) => ({ name: s.name, type: s.type, hidden: s.hidden })),
      labels: listLabelsForProject(p.id).map((l) => ({ name: l.name, global: l.projectId === null })),
    })),
  ),
);

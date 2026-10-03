import { listLabelsForProject } from "./labels";
import { listProjects, listStatuses } from "./projects";
import type { Label, Project, Status } from "@/lib/db/schema";

export type ProjectMeta = { project: Project; statuses: Status[]; labels: Label[] };

/** Every project with its statuses and labels; small enough to ship to the client for pickers. */
export function listProjectsWithMeta(): ProjectMeta[] {
  return listProjects().map((project) => ({
    project,
    statuses: listStatuses(project.id),
    labels: listLabelsForProject(project.id),
  }));
}

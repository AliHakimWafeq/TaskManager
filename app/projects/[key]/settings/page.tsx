import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import { LabelsManager } from "@/components/projects/labels-manager";
import { ProjectSettingsForm } from "@/components/projects/project-settings-form";
import { StatusesManager } from "@/components/projects/statuses-manager";
import { listLabelsForProject } from "@/lib/queries/labels";
import { getProjectByKey, listStatuses } from "@/lib/queries/projects";
import { countTasksByStatus } from "@/lib/queries/tasks";

export const metadata = { title: "Settings" };

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const project = getProjectByKey(key);
  if (!project) notFound();
  const statuses = listStatuses(project.id);
  const counts = countTasksByStatus(project.id);
  const labels = listLabelsForProject(project.id);

  return (
    <>
      <PageHeader>
        <span className="size-2.5 rounded-sm" style={{ backgroundColor: project.color }} />
        {project.name}
        <span className="text-muted-foreground">/ Settings</span>
      </PageHeader>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-8">
          <section className="grid gap-4">
            <div>
              <h2 className="text-sm font-semibold">General</h2>
              <p className="text-xs text-muted-foreground">Name, color and description.</p>
            </div>
            <ProjectSettingsForm project={project} />
          </section>

          <section className="grid gap-4">
            <div>
              <h2 className="text-sm font-semibold">Statuses</h2>
              <p className="text-xs text-muted-foreground">
                Board columns, in order. Drag to reorder. The type controls sorting and what counts as done.
              </p>
            </div>
            <StatusesManager projectId={project.id} statuses={statuses} counts={counts} />
          </section>

          <section className="grid gap-4">
            <div>
              <h2 className="text-sm font-semibold">Labels</h2>
              <p className="text-xs text-muted-foreground">
                Labels for this project. Global labels (available everywhere) are marked.
              </p>
            </div>
            <LabelsManager projectId={project.id} labels={labels} />
          </section>

          <section className="grid gap-4 rounded-lg border border-destructive/30 p-4">
            <div>
              <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
              <p className="text-xs text-muted-foreground">
                Deleting a project removes all of its tasks, statuses and labels.
              </p>
            </div>
            <div>
              <DeleteProjectButton projectId={project.id} projectName={project.name} />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

import { notFound } from "next/navigation";
import { Board } from "@/components/board/board";
import { PageHeader } from "@/components/layout/page-header";
import { listLabelsForProject } from "@/lib/queries/labels";
import { getProjectByKey, listStatuses } from "@/lib/queries/projects";
import { queryTasks } from "@/lib/queries/tasks";

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return { title: getProjectByKey(key)?.name ?? "Project" };
}

export default async function ProjectBoardPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const project = getProjectByKey(key);
  if (!project) notFound();
  const statuses = listStatuses(project.id);
  const labels = listLabelsForProject(project.id);
  const tasks = queryTasks({ projectId: project.id });

  return (
    <>
      <PageHeader>
        <span className="size-2.5 rounded-sm" style={{ backgroundColor: project.color }} />
        {project.name}
        <span className="text-muted-foreground">/ Board</span>
      </PageHeader>
      <div className="min-h-0 flex-1">
        <Board meta={{ project, statuses, labels }} statuses={statuses} tasks={tasks} />
      </div>
    </>
  );
}

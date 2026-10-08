import { notFound } from "next/navigation";
import { TaskDetail } from "@/components/task/task-detail";
import { parseIdentifier } from "@/lib/identifiers";
import { listLabelsForProject } from "@/lib/queries/labels";
import { listStatuses } from "@/lib/queries/projects";
import { getTaskByIdentifier, listParentCandidates } from "@/lib/queries/tasks";

export async function generateMetadata({ params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params;
  const parsed = parseIdentifier(identifier);
  const task = parsed && getTaskByIdentifier(parsed.key, parsed.number);
  return { title: task ? `${task.identifier} ${task.title}` : "Not found" };
}

export default async function IssuePage({ params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params;
  const parsed = parseIdentifier(identifier);
  if (!parsed) notFound();
  const task = getTaskByIdentifier(parsed.key, parsed.number);
  if (!task) notFound();
  return (
    <div className="flex-1 overflow-y-auto">
      <TaskDetail
        task={task}
        statuses={listStatuses(task.projectId)}
        labels={listLabelsForProject(task.projectId)}
        parentCandidates={listParentCandidates(task.projectId, task.id)}
        mode="page"
      />
    </div>
  );
}

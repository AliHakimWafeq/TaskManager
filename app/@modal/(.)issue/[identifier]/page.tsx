import { notFound } from "next/navigation";
import { TaskDetail } from "@/components/task/task-detail";
import { TaskSheet } from "@/components/task/task-sheet";
import { parseIdentifier } from "@/lib/identifiers";
import { listLabelsForProject } from "@/lib/queries/labels";
import { listStatuses } from "@/lib/queries/projects";
import { getTaskByIdentifier, listParentCandidates } from "@/lib/queries/tasks";

export default async function IssueModal({ params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params;
  const parsed = parseIdentifier(identifier);
  if (!parsed) notFound();
  const task = getTaskByIdentifier(parsed.key, parsed.number);
  if (!task) notFound();
  return (
    <TaskSheet title={`${task.identifier} ${task.title}`}>
      <TaskDetail
        task={task}
        statuses={listStatuses(task.projectId)}
        labels={listLabelsForProject(task.projectId)}
        parentCandidates={listParentCandidates(task.projectId, task.id)}
        mode="sheet"
      />
    </TaskSheet>
  );
}

import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/list/filter-bar";
import { TaskTable } from "@/components/list/task-table";
import { filtersToWhere, parseFilters, type SearchParams } from "@/lib/filters";
import { listLabelsForProject } from "@/lib/queries/labels";
import { getProjectByKey, listStatuses } from "@/lib/queries/projects";
import { queryTasks } from "@/lib/queries/tasks";

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return { title: `${getProjectByKey(key)?.name ?? "Project"} list` };
}

export default async function ProjectListPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { key } = await params;
  const project = getProjectByKey(key);
  if (!project) notFound();
  const filters = parseFilters(await searchParams);
  const statuses = listStatuses(project.id);
  const labels = listLabelsForProject(project.id);
  const tasks = queryTasks({ projectId: project.id, where: filtersToWhere(filters), sort: filters.sort });

  return (
    <>
      <PageHeader>
        <span className="size-2.5 rounded-sm" style={{ backgroundColor: project.color }} />
        {project.name}
        <span className="text-muted-foreground">/ List</span>
        <span className="font-mono text-[11px] text-muted-foreground">{tasks.length}</span>
      </PageHeader>
      <div className="border-b px-4 py-2">
        <FilterBar filters={filters} statuses={statuses} labels={labels} />
      </div>
      <div className="flex-1 overflow-y-auto">
        <TaskTable tasks={tasks} />
      </div>
    </>
  );
}

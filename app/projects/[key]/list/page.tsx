import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, SortSelect } from "@/components/list/filter-bar";
import { SubtasksToggle } from "@/components/list/subtasks-toggle";
import { TaskTable } from "@/components/list/task-table";
import { getPreferences } from "@/lib/preferences";
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
  const prefs = await getPreferences();
  const statuses = listStatuses(project.id);
  const labels = listLabelsForProject(project.id);
  const tasks = queryTasks({
    projectId: project.id,
    where: filtersToWhere(filters, prefs.today),
    sort: filters.sort,
    includeSubtasks: prefs.showSubtasks,
  });

  return (
    <>
      <PageHeader>
        <span className="size-2.5 rounded-sm" style={{ backgroundColor: project.color }} />
        {project.name}
        <span className="text-muted-foreground">/ List</span>
        <span className="font-mono text-[11px] text-muted-foreground">{tasks.length}</span>
      </PageHeader>
      <div className="flex flex-col gap-2 border-b px-3 py-2 sm:flex-row sm:items-start sm:px-4">
        <FilterBar filters={filters} statuses={statuses} labels={labels} className="min-w-0 flex-1" />
        <div className="flex shrink-0 items-center gap-1.5">
          <SubtasksToggle show={prefs.showSubtasks} />
          <SortSelect value={filters.sort} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <TaskTable tasks={tasks} today={prefs.today} />
      </div>
    </>
  );
}

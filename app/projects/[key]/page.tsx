import { notFound } from "next/navigation";
import { Board } from "@/components/board/board";
import { ColumnVisibility } from "@/components/board/column-visibility";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/list/filter-bar";
import { filtersToWhere, hasActiveFilters, parseFilters, type SearchParams } from "@/lib/filters";
import { listLabelsForProject } from "@/lib/queries/labels";
import { getProjectByKey, listStatuses } from "@/lib/queries/projects";
import { countTasksByStatus, queryTasks } from "@/lib/queries/tasks";

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return { title: getProjectByKey(key)?.name ?? "Project" };
}

export default async function ProjectBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { key } = await params;
  const filters = parseFilters(await searchParams);
  const project = getProjectByKey(key);
  if (!project) notFound();
  const statuses = listStatuses(project.id);
  const labels = listLabelsForProject(project.id);
  const tasks = queryTasks({ projectId: project.id, where: filtersToWhere(filters) });
  const counts = countTasksByStatus(project.id);
  // An explicit status filter decides the columns; otherwise respect per-status visibility.
  const statusFilterActive = filters.status.length > 0;
  const visibleStatusIds = statuses
    .filter((s) => (statusFilterActive ? filters.status.includes(s.id) : !s.hidden))
    .map((s) => s.id);

  return (
    <>
      <PageHeader>
        <span className="size-2.5 rounded-sm" style={{ backgroundColor: project.color }} />
        {project.name}
        <span className="text-muted-foreground">/ Board</span>
        {hasActiveFilters(filters) && (
          <span className="font-mono text-[11px] text-muted-foreground">{tasks.length} shown</span>
        )}
      </PageHeader>
      <div className="flex flex-wrap items-center gap-1.5 border-b px-4 py-2">
        <FilterBar filters={filters} statuses={statuses} labels={labels} showSort={false} className="flex-1" />
        <ColumnVisibility statuses={statuses} counts={counts} disabled={statusFilterActive} />
      </div>
      <div className="min-h-0 flex-1">
        <Board
          meta={{ project, statuses, labels }}
          statuses={statuses}
          visibleStatusIds={visibleStatusIds}
          tasks={tasks}
        />
      </div>
    </>
  );
}

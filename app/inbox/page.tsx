import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, SortSelect } from "@/components/list/filter-bar";
import { SubtasksToggle } from "@/components/list/subtasks-toggle";
import { TaskTable } from "@/components/list/task-table";
import { getPreferences } from "@/lib/preferences";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { Button } from "@/components/ui/button";
import { filtersToWhere, parseFilters, type SearchParams } from "@/lib/filters";
import { listAllLabels } from "@/lib/queries/labels";
import { listProjects } from "@/lib/queries/projects";
import { queryTasks } from "@/lib/queries/tasks";

export const metadata = { title: "Inbox" };

export default async function InboxPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = parseFilters(await searchParams);
  const prefs = await getPreferences();
  if (filters.sort === "manual") filters.sort = "updatedAt";
  const projects = listProjects();
  const labels = listAllLabels();
  const tasks = queryTasks({
    where: filtersToWhere(filters, prefs.today),
    sort: filters.sort,
    includeSubtasks: prefs.showSubtasks,
  });

  if (projects.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm font-medium">Welcome</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Create your first project to start adding tasks. Each project gets its own board and workflow.
        </p>
        <CreateProjectDialog trigger={<Button size="sm">Create a project</Button>} />
      </div>
    );
  }

  return (
    <>
      <PageHeader>
        Inbox
        <span className="font-mono text-[11px] text-muted-foreground">{tasks.length}</span>
      </PageHeader>
      <div className="flex flex-col gap-2 border-b px-3 py-2 sm:flex-row sm:items-start sm:px-4">
        <FilterBar filters={filters} labels={labels} projects={projects} className="min-w-0 flex-1" />
        <div className="flex shrink-0 items-center gap-1.5">
          <SubtasksToggle show={prefs.showSubtasks} />
          <SortSelect value={filters.sort} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <TaskTable tasks={tasks} today={prefs.today} showProject emptyText="No tasks yet. Press C to create one." />
      </div>
    </>
  );
}

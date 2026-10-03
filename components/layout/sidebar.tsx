import { CheckSquare2 } from "lucide-react";
import Link from "next/link";
import { CommandPalette } from "@/components/layout/command-palette";
import { NewTaskButton } from "@/components/task/new-task-button";
import { listProjectsWithMeta } from "@/lib/queries/meta";
import { SidebarNav } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";

export function Sidebar() {
  const meta = listProjectsWithMeta();
  const projects = meta.map((m) => m.project);
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-12 items-center justify-between px-3">
        <Link href="/inbox" className="flex items-center gap-2 font-semibold">
          <CheckSquare2 className="size-4 text-primary" />
          Tasks
        </Link>
        <ThemeToggle />
      </div>
      <div className="px-3 pb-2">
        <NewTaskButton projects={meta} />
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        <SidebarNav projects={projects} />
      </div>
      <div className="flex items-center justify-between border-t border-sidebar-border px-3 py-2 text-[11px] text-muted-foreground">
        <span>Search</span>
        <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">⌘K</kbd>
      </div>
      <CommandPalette projects={projects} />
    </aside>
  );
}

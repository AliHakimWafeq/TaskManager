import { CheckSquare2 } from "lucide-react";
import Link from "next/link";
import { SearchButton } from "@/components/layout/search-button";
import { NewTaskButton } from "@/components/task/new-task-button";
import type { Project } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";

/** Navigation column. Pure presentation: global shortcuts and dialogs live in the layout. */
export function Sidebar({ projects, className }: { projects: Project[]; className?: string }) {
  return (
    <aside className={cn("flex h-full w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar", className)}>
      <div className="flex h-12 items-center justify-between px-3">
        <Link href="/inbox" className="flex items-center gap-2 font-semibold">
          <CheckSquare2 className="size-4 text-primary" />
          Tasks
        </Link>
        <ThemeToggle />
      </div>
      <div className="px-3 pb-2">
        <NewTaskButton disabled={projects.length === 0} />
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        <SidebarNav projects={projects} />
      </div>
      <SearchButton />
    </aside>
  );
}

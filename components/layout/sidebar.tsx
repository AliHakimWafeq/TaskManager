import { CheckSquare2 } from "lucide-react";
import Link from "next/link";
import { listProjects } from "@/lib/queries/projects";
import { SidebarNav } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";

export function Sidebar() {
  const projects = listProjects();
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-12 items-center justify-between px-3">
        <Link href="/inbox" className="flex items-center gap-2 font-semibold">
          <CheckSquare2 className="size-4 text-primary" />
          Tasks
        </Link>
        <ThemeToggle />
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        <SidebarNav projects={projects} />
      </div>
    </aside>
  );
}

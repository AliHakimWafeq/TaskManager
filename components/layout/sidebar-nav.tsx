"use client";

import { Inbox, KanbanSquare, List, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/db/schema";

function NavLink({
  href,
  active,
  children,
  className,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-7 items-center gap-2 rounded-md px-2 text-[13px] text-sidebar-foreground/80 outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring",
        active && "bg-sidebar-accent text-sidebar-foreground font-medium",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function SidebarNav({ projects }: { projects: Project[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-4 px-2">
      <div className="flex flex-col gap-0.5">
        <NavLink href="/inbox" active={pathname === "/inbox"}>
          <Inbox className="size-4 text-muted-foreground" />
          Inbox
        </NavLink>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between pr-1 pl-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Projects
          <CreateProjectDialog />
        </div>
        <div className="flex flex-col gap-0.5">
          {projects.length === 0 && (
            <p className="px-2 py-1 text-xs text-muted-foreground">No projects yet.</p>
          )}
          {projects.map((p) => {
            const base = `/projects/${p.key}`;
            const inProject = pathname === base || pathname.startsWith(base + "/");
            return (
              <div key={p.id} className="flex flex-col gap-0.5">
                <NavLink href={base} active={pathname === base}>
                  <span
                    className="size-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="truncate">{p.name}</span>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                    {p.key}
                  </span>
                </NavLink>
                {inProject && (
                  <div className="ml-4 flex flex-col gap-0.5 border-l border-sidebar-border pl-1">
                    <NavLink href={base} active={pathname === base} className="h-6 text-xs">
                      <KanbanSquare className="size-3.5 text-muted-foreground" /> Board
                    </NavLink>
                    <NavLink href={`${base}/list`} active={pathname === `${base}/list`} className="h-6 text-xs">
                      <List className="size-3.5 text-muted-foreground" /> List
                    </NavLink>
                    <NavLink href={`${base}/settings`} active={pathname === `${base}/settings`} className="h-6 text-xs">
                      <Settings className="size-3.5 text-muted-foreground" /> Settings
                    </NavLink>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

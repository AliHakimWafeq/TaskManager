"use client";

import { Inbox, KanbanSquare, List, Plus, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusIcon } from "@/components/task/icons";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { searchTasks, type SearchHit } from "@/lib/actions/search";
import type { Project } from "@/lib/db/schema";
import type { StatusType } from "@/lib/enums";

export const NEW_TASK_EVENT = "taskmanager:new-task";
export const OPEN_PALETTE_EVENT = "taskmanager:open-palette";

export function CommandPalette({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented) return; // e.g. the editor used ⌘K to add a link
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      const t = setTimeout(() => setHits([]), 0);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    const t = setTimeout(() => {
      searchTasks(q).then((r) => {
        if (!cancelled) setHits(r);
      });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, open]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
      title="Command palette"
      description="Search tasks and jump to pages"
    >
      <Command shouldFilter={!query.trim() || hits.length === 0}>
      <CommandInput placeholder="Search tasks, or type a command…" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        {hits.length > 0 && (
          <CommandGroup heading="Tasks">
            {hits.map((h) => (
              <CommandItem key={h.id} value={`${h.identifier} ${h.title}`} onSelect={() => go(`/issue/${h.identifier}`)}>
                <StatusIcon type={h.statusType as StatusType} color={h.statusColor} />
                <span className="font-mono text-[11px] text-muted-foreground">{h.identifier}</span>
                <span className="truncate">{h.title}</span>
                <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span className="size-2 rounded-sm" style={{ backgroundColor: h.projectColor }} />
                  {h.projectName}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Actions">
          <CommandItem
            value="new task create"
            onSelect={() => {
              setOpen(false);
              window.dispatchEvent(new CustomEvent(NEW_TASK_EVENT));
            }}
          >
            <Plus /> New task
          </CommandItem>
          <CommandItem value="inbox" onSelect={() => go("/inbox")}>
            <Inbox /> Go to Inbox
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Projects">
          {projects.map((p) => (
            <CommandItem key={p.id} value={`${p.name} ${p.key} board`} onSelect={() => go(`/projects/${p.key}`)}>
              <span className="size-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
              {p.name}
              <span className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
                <KanbanSquare className="size-3" /> Board
              </span>
            </CommandItem>
          ))}
          {projects.map((p) => (
            <CommandItem key={`${p.id}-list`} value={`${p.name} ${p.key} list`} onSelect={() => go(`/projects/${p.key}/list`)}>
              <span className="size-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
              {p.name}
              <span className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
                <List className="size-3" /> List
              </span>
            </CommandItem>
          ))}
          {projects.map((p) => (
            <CommandItem key={`${p.id}-settings`} value={`${p.name} ${p.key} settings`} onSelect={() => go(`/projects/${p.key}/settings`)}>
              <span className="size-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
              {p.name}
              <span className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
                <Settings className="size-3" /> Settings
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
      </Command>
    </CommandDialog>
  );
}

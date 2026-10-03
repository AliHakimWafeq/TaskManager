"use client";

import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ProjectMeta } from "@/lib/queries/meta";
import { CreateTaskDialog } from "./create-task-dialog";

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

/** Sidebar "New task" button plus the global `C` shortcut. */
export function NewTaskButton({ projects }: { projects: ProjectMeta[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const currentKey = /^\/projects\/([^/]+)/.exec(pathname)?.[1]?.toUpperCase();
  const current = projects.find((p) => p.project.key === currentKey);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "c" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTypingTarget(e.target)) {
        if (document.querySelector("[role=dialog]")) return;
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (projects.length === 0) return null;

  return (
    <>
      <Button size="sm" className="w-full justify-start" onClick={() => setOpen(true)}>
        <Plus /> New task
        <kbd className="ml-auto rounded bg-primary-foreground/20 px-1 font-mono text-[10px]">C</kbd>
      </Button>
      {open && (
        <CreateTaskDialog
          open={open}
          onOpenChange={setOpen}
          projects={projects}
          defaultProjectId={current?.project.id}
        />
      )}
    </>
  );
}

"use client";

import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { NEW_TASK_EVENT } from "@/components/layout/command-palette";
import type { ProjectMeta } from "@/lib/queries/meta";
import { CreateTaskDialog } from "./create-task-dialog";

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

/** Sidebar button: asks the single global dialog host to open. */
export function NewTaskButton({ disabled }: { disabled?: boolean }) {
  if (disabled) return null;
  return (
    <Button
      size="sm"
      className="w-full justify-start"
      aria-keyshortcuts="c"
      onClick={() => window.dispatchEvent(new CustomEvent(NEW_TASK_EVENT))}
    >
      <Plus /> New task
      <kbd aria-hidden className="ml-auto rounded bg-primary-foreground/20 px-1 font-mono text-[10px]">
        C
      </kbd>
    </Button>
  );
}

/** Mounted once in the layout: owns the create dialog and the global `C` shortcut. */
export function NewTaskHost({ projects }: { projects: ProjectMeta[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // Default to the project in view: /projects/KEY/... or /issue/KEY-12.
  const currentKey = (
    /^\/projects\/([^/]+)/.exec(pathname)?.[1] ?? /^\/issue\/([A-Za-z][A-Za-z0-9]*)-\d+/.exec(pathname)?.[1]
  )?.toUpperCase();
  const current = projects.find((p) => p.project.key === currentKey);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "c" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTypingTarget(e.target)) {
        if (document.querySelector("[role=dialog]")) return;
        e.preventDefault();
        setOpen(true);
      }
    }
    const onEvent = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(NEW_TASK_EVENT, onEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(NEW_TASK_EVENT, onEvent);
    };
  }, []);

  if (projects.length === 0 || !open) return null;
  return (
    <CreateTaskDialog open={open} onOpenChange={setOpen} projects={projects} defaultProjectId={current?.project.id} />
  );
}

"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EyeOff, GripHorizontal, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { StatusIcon } from "@/components/task/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { createTask } from "@/lib/actions/tasks";
import type { Status } from "@/lib/db/schema";
import type { TaskRow } from "@/lib/queries/tasks";
import { cn } from "@/lib/utils";
import { SortableTaskCard } from "./task-card";

/** Keeps clicks and key presses on header buttons from starting a column drag. */
const stopDrag = {
  onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
  onTouchStart: (e: React.TouchEvent) => e.stopPropagation(),
};

export function ColumnShell({
  status,
  count,
  children,
  headerProps,
  gripProps,
  onAdd,
  onHide,
  dragging,
}: {
  status: Status;
  count: number;
  children: React.ReactNode;
  /** Pointer/touch drag listeners for the whole header (no semantics). */
  headerProps?: React.HTMLAttributes<HTMLDivElement>;
  /** Accessible drag handle: attributes, keyboard listener and activator ref. */
  gripProps?: React.ButtonHTMLAttributes<HTMLButtonElement> & { ref?: (el: HTMLElement | null) => void };
  onAdd?: () => void;
  onHide?: () => void;
  dragging?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-full w-72 shrink-0 flex-col rounded-xl bg-muted/40 dark:bg-muted/20",
        dragging && "shadow-xl ring-1 ring-ring/40",
      )}
    >
      <div
        {...headerProps}
        className={cn("group/col flex h-10 items-center gap-2 px-3", headerProps && "cursor-grab touch-manipulation")}
      >
        <StatusIcon type={status.type} color={status.color} />
        <h2 className="truncate text-[13px] font-medium">{status.name}</h2>
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
          {count}
          <span className="sr-only"> tasks</span>
        </span>
        {gripProps ? (
          <button
            type="button"
            {...gripProps}
            aria-label={`Reorder ${status.name} column`}
            className="reveal-on-hover ml-auto flex size-6 cursor-grab items-center justify-center rounded-md text-muted-foreground opacity-0 outline-none transition-opacity group-hover/col:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <GripHorizontal className="size-3.5" />
          </button>
        ) : (
          <GripHorizontal className="ml-auto size-3.5 text-muted-foreground" aria-hidden />
        )}
        {onHide && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  {...stopDrag}
                  aria-label={`Hide ${status.name} column`}
                  className="reveal-on-hover opacity-0 transition-opacity group-hover/col:opacity-100 focus-visible:opacity-100"
                  onClick={onHide}
                />
              }
            >
              <EyeOff />
            </TooltipTrigger>
            <TooltipContent>Hide column</TooltipContent>
          </Tooltip>
        )}
        {onAdd && (
          <Button variant="ghost" size="icon-xs" {...stopDrag} aria-label={`Add task to ${status.name}`} onClick={onAdd}>
            <Plus />
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

export function BoardColumn({
  status,
  tasks,
  projectId,
  onOpenCreate,
  onHide,
}: {
  status: Status;
  tasks: TaskRow[];
  projectId: string;
  onOpenCreate: (statusId: string) => void;
  onHide?: (statusId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: `col:${status.id}`,
    data: { type: "column", status },
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `col:${status.id}`,
    data: { type: "column", status },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("h-full", isDragging && "opacity-30")}
    >
      <ColumnShell
        status={status}
        count={tasks.length}
        headerProps={{
          onMouseDown: listeners?.onMouseDown as React.MouseEventHandler<HTMLDivElement> | undefined,
          onTouchStart: listeners?.onTouchStart as React.TouchEventHandler<HTMLDivElement> | undefined,
        }}
        gripProps={{
          ...(attributes as unknown as React.ButtonHTMLAttributes<HTMLButtonElement>),
          onKeyDown: listeners?.onKeyDown as React.KeyboardEventHandler<HTMLButtonElement> | undefined,
          ref: setActivatorNodeRef,
        }}
        onAdd={() => onOpenCreate(status.id)}
        onHide={onHide ? () => onHide(status.id) : undefined}
      >
        <div
          ref={setDropRef}
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-2 transition-colors",
            isOver && "bg-primary/5",
          )}
        >
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-2">
              {tasks.map((t) => (
                <SortableTaskCard key={t.id} task={t} />
              ))}
            </ul>
          </SortableContext>
          <QuickAdd projectId={projectId} statusId={status.id} />
        </div>
      </ColumnShell>
    </div>
  );
}

function QuickAdd({ projectId, statusId }: { projectId: string; statusId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    const t = title.trim();
    if (!t) return;
    start(async () => {
      const res = await createTask({ projectId, title: t, statusId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setTitle("");
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="size-3.5" /> Add task
      </button>
    );
  }
  return (
    <div className="mt-2 rounded-lg border bg-card p-1">
      <Input
        autoFocus
        value={title}
        disabled={pending}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title, Enter to add"
        aria-label="New task title"
        className="h-7 border-0 bg-transparent shadow-none focus-visible:ring-0"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
          if (e.key === "Escape") {
            setOpen(false);
            setTitle("");
          }
        }}
        onBlur={() => {
          if (!title.trim()) setOpen(false);
        }}
      />
    </div>
  );
}

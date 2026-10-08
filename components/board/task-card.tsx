"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarIcon, CheckSquare2, CornerDownRight } from "lucide-react";
import Link from "next/link";
import { useToday } from "@/components/layout/today-provider";
import { PriorityIcon, LabelChip } from "@/components/task/icons";
import { PRIORITY_META } from "@/lib/constants";
import { formatDue, isOverdue } from "@/lib/dates";
import type { TaskRow } from "@/lib/queries/tasks";
import { cn } from "@/lib/utils";

export function TaskCardContent({ task, dragging }: { task: TaskRow; dragging?: boolean }) {
  const today = useToday();
  const completed = task.status.type === "completed";
  const overdue = isOverdue(task.dueDate, completed, today);
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-card p-2.5 text-[13px] shadow-xs transition-colors hover:border-foreground/20",
        dragging && "rotate-[1.5deg] shadow-xl ring-1 ring-ring/40",
      )}
    >
      {task.parent && (
        <div className="-mb-1 flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
          <CornerDownRight className="size-3 shrink-0" />
          <span className="font-mono">{task.parent.identifier}</span>
          <span className="truncate">{task.parent.title}</span>
        </div>
      )}
      <div className="flex items-start gap-2">
        <PriorityIcon priority={task.priority} className={cn("mt-0.5", PRIORITY_META[task.priority].className)} />
        <span className={cn("line-clamp-3 leading-snug", completed && "text-muted-foreground line-through")}>
          {task.title}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
        <span className="font-mono">{task.identifier}</span>
        {task.dueDate && (
          <span className={cn("flex items-center gap-1", overdue && "text-red-500")}>
            <CalendarIcon className="size-3" />
            {formatDue(task.dueDate, today)}
          </span>
        )}
        {task.subtaskCount > 0 && (
          <span className="flex items-center gap-1">
            <CheckSquare2 className="size-3" />
            {task.subtaskDone}/{task.subtaskCount}
          </span>
        )}
        {task.labels.map((l) => (
          <LabelChip key={l.id} name={l.name} color={l.color} className="h-4 px-1.5 text-[10px]" />
        ))}
      </div>
    </div>
  );
}

export function SortableTaskCard({ task }: { task: TaskRow }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", task },
  });
  // The link itself is the drag handle: one tab stop, Enter opens it, Space drags it.
  const dragAttributes = {
    "aria-roledescription": attributes["aria-roledescription"],
    "aria-describedby": attributes["aria-describedby"],
    "aria-pressed": attributes["aria-pressed"],
  };
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("touch-none", isDragging && "opacity-30")}
    >
      <Link
        href={`/issue/${task.identifier}`}
        className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        draggable={false}
        aria-label={`${task.identifier} ${task.title}`}
        {...dragAttributes}
        {...listeners}
      >
        <TaskCardContent task={task} />
      </Link>
    </li>
  );
}

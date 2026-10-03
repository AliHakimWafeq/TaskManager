import { CalendarIcon, CheckSquare2 } from "lucide-react";
import Link from "next/link";
import { LabelChip, PriorityIcon, StatusIcon } from "@/components/task/icons";
import { PRIORITY_META } from "@/lib/constants";
import { formatDue, formatRelative, isOverdue } from "@/lib/dates";
import type { TaskRow } from "@/lib/queries/tasks";
import { cn } from "@/lib/utils";

export function TaskTable({
  tasks,
  showProject = false,
  emptyText = "No tasks match.",
}: {
  tasks: TaskRow[];
  showProject?: boolean;
  emptyText?: string;
}) {
  if (tasks.length === 0) {
    return <div className="px-4 py-12 text-center text-xs text-muted-foreground">{emptyText}</div>;
  }
  return (
    <ul className="divide-y">
      {tasks.map((t) => {
        const completed = t.status.type === "completed";
        const overdue = isOverdue(t.dueDate, completed);
        return (
          <li key={t.id}>
            <Link
              href={`/issue/${t.identifier}`}
              className="flex h-9 items-center gap-3 px-4 text-[13px] hover:bg-muted/50"
            >
              <PriorityIcon priority={t.priority} className={cn("size-3.5", PRIORITY_META[t.priority].className)} />
              <span className="w-16 shrink-0 font-mono text-[11px] text-muted-foreground">{t.identifier}</span>
              <StatusIcon type={t.status.type} color={t.status.color} />
              <span className={cn("min-w-0 flex-1 truncate", completed && "text-muted-foreground line-through")}>
                {t.title}
              </span>
              {showProject && (
                <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground md:flex">
                  <span className="size-2 rounded-sm" style={{ backgroundColor: t.project.color }} />
                  {t.project.name}
                </span>
              )}
              <span className="hidden items-center gap-1 lg:flex">
                {t.labels.slice(0, 3).map((l) => (
                  <LabelChip key={l.id} name={l.name} color={l.color} className="h-4 px-1.5 text-[10px]" />
                ))}
                {t.labels.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{t.labels.length - 3}</span>
                )}
              </span>
              {t.subtaskCount > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <CheckSquare2 className="size-3" />
                  {t.subtaskDone}/{t.subtaskCount}
                </span>
              )}
              {t.dueDate && (
                <span className={cn("flex w-20 items-center gap-1 text-[11px] text-muted-foreground", overdue && "text-red-500")}>
                  <CalendarIcon className="size-3" />
                  {formatDue(t.dueDate)}
                </span>
              )}
              <span className="hidden w-14 text-right text-[11px] text-muted-foreground sm:block">
                {formatRelative(t.updatedAt)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

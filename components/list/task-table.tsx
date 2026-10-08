import { CalendarIcon, CheckSquare2, CornerDownRight } from "lucide-react";
import Link from "next/link";
import { LabelChip, PriorityIcon, StatusIcon } from "@/components/task/icons";
import { PRIORITY_META } from "@/lib/constants";
import { formatDue, formatRelative, isOverdue } from "@/lib/dates";
import type { TaskRow } from "@/lib/queries/tasks";
import { cn } from "@/lib/utils";

export function TaskTable({
  tasks,
  today,
  showProject = false,
  emptyText = "No tasks match.",
}: {
  tasks: TaskRow[];
  today: string;
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
        const overdue = isOverdue(t.dueDate, completed, today);
        return (
          <li key={t.id}>
            <Link
              href={`/issue/${t.identifier}`}
              className="flex h-9 items-center gap-3 px-4 text-[13px] hover:bg-muted/50"
            >
              <PriorityIcon priority={t.priority} className={cn("size-3.5", PRIORITY_META[t.priority].className)} />
              <span className="w-16 shrink-0 font-mono text-[11px] text-muted-foreground">{t.identifier}</span>
              <StatusIcon type={t.status.type} color={t.status.color} />
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className={cn("min-w-0 truncate", completed && "text-muted-foreground line-through")}>{t.title}</span>
                {t.parent && (
                  <span
                    className="flex max-w-[45%] shrink-0 items-center gap-1 rounded-full border px-1.5 py-px text-[11px] whitespace-nowrap text-muted-foreground"
                    title={`Subtask of ${t.parent.identifier} ${t.parent.title}`}
                  >
                    <CornerDownRight className="size-3 shrink-0" />
                    <span className="font-mono">{t.parent.identifier}</span>
                    <span className="hidden truncate xl:inline">{t.parent.title}</span>
                  </span>
                )}
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
                  {formatDue(t.dueDate, today)}
                </span>
              )}
              <span className="hidden w-14 text-right text-[11px] text-muted-foreground sm:block" suppressHydrationWarning>
                {formatRelative(t.updatedAt)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

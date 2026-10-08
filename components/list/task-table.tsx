import { CalendarIcon, CheckSquare2, CornerDownRight } from "lucide-react";
import Link from "next/link";
import { LabelChip, PriorityIcon, StatusIcon } from "@/components/task/icons";
import { PRIORITY_META, STATUS_TYPE_META } from "@/lib/constants";
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
  emptyText?: React.ReactNode;
}) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-xs text-muted-foreground">
        {emptyText}
      </div>
    );
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
              className="flex h-9 items-center gap-3 px-4 text-[13px] outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <PriorityIcon priority={t.priority} className={cn("size-3.5", PRIORITY_META[t.priority].className)} />
              <span className="sr-only">
                {PRIORITY_META[t.priority].label} priority, {t.status.name} ({STATUS_TYPE_META[t.status.type].label}).
              </span>
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
                  <LabelChip key={l.id} name={l.name} color={l.color} className="h-4 px-1.5 text-[11px]" />
                ))}
                {t.labels.length > 3 && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">+{t.labels.length - 3}</span>
                )}
              </span>
              {/* Fixed-width slots keep columns aligned whether or not a row has data. */}
              <span className="hidden w-12 shrink-0 items-center gap-1 text-[11px] text-muted-foreground tabular-nums sm:flex">
                {t.subtaskCount > 0 && (
                  <>
                    <CheckSquare2 className="size-3" aria-hidden />
                    <span className="sr-only">Subtasks done:</span>
                    {t.subtaskDone}/{t.subtaskCount}
                  </>
                )}
              </span>
              <span
                className={cn(
                  "flex w-24 shrink-0 items-center gap-1 text-[11px] whitespace-nowrap text-muted-foreground tabular-nums",
                  overdue && "text-red-600 dark:text-red-400",
                )}
              >
                {t.dueDate && (
                  <>
                    <CalendarIcon className="size-3" aria-hidden />
                    <span className="sr-only">{overdue ? "Overdue, due" : "Due"}</span>
                    {formatDue(t.dueDate, today)}
                  </>
                )}
              </span>
              <span className="hidden w-14 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums sm:block" suppressHydrationWarning>
                {formatRelative(t.updatedAt)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

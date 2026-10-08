"use client";

import { Check, Copy, ExternalLink, Link2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { createTask, deleteTask, setTaskLabels, updateTask } from "@/lib/actions/tasks";
import { formatRelative } from "@/lib/dates";
import type { Label, Status } from "@/lib/db/schema";
import type { Priority } from "@/lib/enums";
import type { TaskDetail as TaskDetailData } from "@/lib/queries/tasks";
import { cn } from "@/lib/utils";
import { Editor } from "@/components/editor/editor";
import { PriorityIcon, StatusIcon } from "./icons";
import { DueDatePicker, LabelPicker, ParentPicker, PriorityPicker, StatusPicker } from "./pickers";

type Patch = Partial<Pick<TaskDetailData, "title" | "description" | "statusId" | "priority" | "dueDate" | "parentId">> & {
  labelIds?: string[];
};

export function TaskDetail({
  task,
  statuses,
  labels: initialLabels,
  parentCandidates,
  mode,
}: {
  task: TaskDetailData;
  statuses: Status[];
  labels: Label[];
  parentCandidates: { id: string; number: number; title: string }[];
  mode: "page" | "sheet";
}) {
  const router = useRouter();
  const [, start] = useTransition();
  // Server-provided labels win; locally created ones are kept until the server catches up.
  const [localLabels, setLocalLabels] = useState<Label[]>([]);
  const labels = [...initialLabels, ...localLabels.filter((l) => !initialLabels.some((i) => i.id === l.id))];
  const [opt, apply] = useOptimistic(task, (cur, patch: Patch) => {
    const { labelIds, ...rest } = patch;
    const next = { ...cur, ...rest };
    if (rest.statusId) next.status = statuses.find((s) => s.id === rest.statusId) ?? cur.status;
    if (labelIds) next.labels = labels.filter((l) => labelIds.includes(l.id));
    return next;
  });

  function update(patch: Patch) {
    start(async () => {
      apply(patch);
      const { labelIds, ...rest } = patch;
      const res = labelIds
        ? await setTaskLabels(task.id, labelIds)
        : await updateTask({ id: task.id, ...rest });
      if (!res.ok) toast.error(res.error);
    });
  }

  const completed = opt.status.type === "completed";
  // Inside the side sheet, hopping between tasks replaces history so one close returns to the board.
  const replace = mode === "sheet";

  return (
    <div className={cn("flex flex-col gap-5", mode === "page" && "mx-auto w-full max-w-3xl px-8 py-8")}>
      <div className={cn("flex min-h-7 items-center gap-2 text-xs text-muted-foreground", mode === "sheet" && "pr-9")}>
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2">
          <Link
            href={`/projects/${task.project.key}`}
            className="flex max-w-[40%] min-w-0 items-center gap-1.5 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: task.project.color }} aria-hidden />
            <span className="truncate">{task.project.name}</span>
          </Link>
          <span aria-hidden>›</span>
          {task.parent && (
            <>
              <Link
                href={`/issue/${task.parent.identifier}`}
                replace={replace}
                className="min-w-0 truncate rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                title={task.parent.title}
              >
                <span className="font-mono">{task.parent.identifier}</span> {task.parent.title}
              </Link>
              <span aria-hidden>›</span>
            </>
          )}
          <span className="shrink-0 font-mono" aria-current="page">
            {task.identifier}
          </span>
        </nav>
        <div className="ml-auto flex items-center gap-0.5">
          <CopyButton text={() => `${window.location.origin}/issue/${task.identifier}`} label="Copy link" icon={<Link2 />} />
          <CopyButton text={() => task.identifier} label="Copy ID" icon={<Copy />} />
          {mode === "sheet" && (
            <Tooltip>
              <TooltipTrigger
                render={
                  // A plain anchor forces a document load. A client-side push to the same
                  // URL would be intercepted again and keep showing the sheet.
                  <a
                    href={`/issue/${task.identifier}`}
                    aria-label="Open full page"
                    className="flex size-6 items-center justify-center rounded-md hover:bg-muted hover:text-foreground [&_svg]:size-3"
                  />
                }
              >
                <ExternalLink />
              </TooltipTrigger>
              <TooltipContent>Open full page</TooltipContent>
            </Tooltip>
          )}
          <DeleteTaskButton
            identifier={task.identifier}
            onDelete={async () => {
              if (mode === "sheet") {
                // Close the sheet first so the deleted task never re-renders.
                router.back();
                return deleteTask(task.id);
              }
              return deleteTask(task.id, `/projects/${task.project.key}`);
            }}
          />
        </div>
      </div>

      <textarea
        key={task.title}
        defaultValue={task.title}
        rows={1}
        aria-label="Title"
        className="field-sizing-content -mx-1 w-[calc(100%+0.5rem)] resize-none rounded-md bg-transparent px-1 text-xl font-semibold leading-snug break-words outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        placeholder="Task title"
        onBlur={(e) => {
          const v = e.target.value.trim();
          if (v && v !== task.title) update({ title: v });
          else e.target.value = task.title;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            (e.target as HTMLTextAreaElement).blur();
          }
          if (e.key === "Escape") {
            (e.target as HTMLTextAreaElement).value = task.title;
            (e.target as HTMLTextAreaElement).blur();
          }
        }}
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <StatusPicker value={opt.statusId} statuses={statuses} onChange={(statusId) => update({ statusId })} />
        <PriorityPicker value={opt.priority} onChange={(priority) => update({ priority })} />
        <DueDatePicker value={opt.dueDate} completed={completed} onChange={(dueDate) => update({ dueDate })} />
        {task.subtaskCount === 0 && (
          <ParentPicker
            value={opt.parentId}
            current={task.parent}
            candidates={parentCandidates}
            projectKey={task.project.key}
            onChange={(parentId) => update({ parentId })}
          />
        )}
        <LabelPicker
          value={opt.labels.map((l) => l.id)}
          labels={labels}
          projectId={task.projectId}
          onChange={(labelIds) => update({ labelIds })}
          onLabelCreated={(l) => setLocalLabels((prev) => [...prev, l])}
        />
      </div>

      <Editor
        key={task.id}
        content={task.description}
        taskId={task.id}
        onChange={(description) => update({ description })}
      />

      <Subtasks task={opt} statuses={statuses} replace={replace} />

      <p className="text-[11px] text-muted-foreground" suppressHydrationWarning>
        Created {formatRelative(task.createdAt)} · Updated {formatRelative(task.updatedAt)}
        {task.completedAt && <> · Completed {formatRelative(task.completedAt)}</>}
      </p>
    </div>
  );
}

function CopyButton({ text, label, icon }: { text: () => string; label: string; icon: React.ReactNode }) {
  const [done, setDone] = useState(false);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={label}
            onClick={() => {
              navigator.clipboard.writeText(text()).then(() => {
                setDone(true);
                setTimeout(() => setDone(false), 1200);
              });
            }}
          />
        }
      >
        {done ? <Check className="text-green-500" /> : icon}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function DeleteTaskButton({
  identifier,
  onDelete,
}: {
  identifier: string;
  onDelete: () => Promise<{ ok: boolean; error?: string } | undefined>;
}) {
  const [pending, start] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button variant="ghost" size="icon-xs" aria-label="Delete task" className="hover:text-destructive" />}
      >
        <Trash2 />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {identifier}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the task. Subtasks are kept and become top-level tasks.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await onDelete();
                // A redirecting delete resolves without a result.
                if (res && !res.ok) toast.error(res.error ?? "Could not delete the task");
                else toast.success(`${identifier} deleted`);
              })
            }
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Subtasks({ task, statuses, replace }: { task: TaskDetailData; statuses: Status[]; replace: boolean }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, start] = useTransition();
  const [, startToggle] = useTransition();
  const [optimisticDone, setOptimisticDone] = useOptimistic(
    {} as Record<string, boolean>,
    (cur, next: { id: string; done: boolean }) => ({ ...cur, [next.id]: next.done }),
  );
  const doneStatus = statuses.find((s) => s.type === "completed");
  const openStatus =
    statuses.find((s) => s.type === "unstarted") ?? statuses.find((s) => s.type !== "completed" && s.type !== "cancelled") ?? statuses[0];

  function add() {
    const t = title.trim();
    if (!t) return;
    start(async () => {
      const res = await createTask({ projectId: task.projectId, title: t, parentId: task.id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setTitle("");
    });
  }

  if (task.parent) return null; // one level of nesting only
  const isDone = (s: (typeof task.subtasks)[number]) => optimisticDone[s.id] ?? s.status.type === "completed";
  const doneCount = task.subtasks.filter(isDone).length;

  function toggle(s: (typeof task.subtasks)[number], done: boolean) {
    const target = done ? doneStatus : openStatus;
    if (!target) return;
    startToggle(async () => {
      setOptimisticDone({ id: s.id, done });
      const r = await updateTask({ id: s.id, statusId: target.id });
      if (!r.ok) toast.error(r.error);
    });
  }

  return (
    <section className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-muted-foreground">
          Subtasks
          {task.subtaskCount > 0 && (
            <span className="ml-1.5 font-mono tabular-nums">
              {doneCount}/{task.subtaskCount}
            </span>
          )}
        </h3>
        {!adding && (
          <Button variant="ghost" size="xs" className="text-muted-foreground" onClick={() => setAdding(true)}>
            <Plus /> Add subtask
          </Button>
        )}
      </div>
      {task.subtaskCount > 0 && (
        <div
          className="h-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Subtasks completed"
          aria-valuemin={0}
          aria-valuemax={task.subtaskCount}
          aria-valuenow={doneCount}
        >
          <div
            className="h-full origin-left bg-green-500 transition-transform"
            style={{ transform: `scaleX(${doneCount / task.subtaskCount})` }}
          />
        </div>
      )}
      <ul className="divide-y rounded-md border">
        {task.subtasks.map((s) => {
          const done = isDone(s);
          return (
            <li key={s.id} className="flex items-center gap-2 px-2 py-1.5 text-[13px]">
              <Checkbox
                checked={done}
                aria-label={`${done ? "Reopen" : "Complete"} ${s.identifier} ${s.title}`}
                disabled={!doneStatus}
                onCheckedChange={(c) => toggle(s, c === true)}
              />
              <StatusIcon type={s.status.type} color={s.status.color} />
              <span className="font-mono text-[11px] text-muted-foreground">{s.identifier}</span>
              <Link
                href={`/issue/${s.identifier}`}
                replace={replace}
                className={cn(
                  "min-w-0 flex-1 truncate rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring",
                  done && "text-muted-foreground line-through",
                )}
              >
                {s.title}
              </Link>
              <PriorityIcon priority={s.priority as Priority} className="size-3.5 text-muted-foreground" />
            </li>
          );
        })}
        {adding && (
          <li className="flex items-center gap-2 px-2 py-1">
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Subtask title, press Enter"
              aria-label="New subtask title"
              className="h-7 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) add();
                if (e.key === "Escape") {
                  setAdding(false);
                  setTitle("");
                }
              }}
              onBlur={() => {
                if (!title.trim()) setAdding(false);
              }}
              disabled={pending}
            />
          </li>
        )}
        {task.subtasks.length === 0 && !adding && (
          <li className="px-2 py-1.5 text-xs text-muted-foreground">No subtasks.</li>
        )}
      </ul>
    </section>
  );
}

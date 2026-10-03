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
import { Editor } from "./editor";
import { PriorityIcon, StatusIcon } from "./icons";
import { DueDatePicker, LabelPicker, PriorityPicker, StatusPicker } from "./pickers";

type Patch = Partial<Pick<TaskDetailData, "title" | "description" | "statusId" | "priority" | "dueDate">> & {
  labelIds?: string[];
};

export function TaskDetail({
  task,
  statuses,
  labels: initialLabels,
  mode,
}: {
  task: TaskDetailData;
  statuses: Status[];
  labels: Label[];
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

  return (
    <div className={cn("flex flex-col gap-5", mode === "page" && "mx-auto w-full max-w-3xl px-8 py-8")}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href={`/projects/${task.project.key}`} className="flex items-center gap-1.5 hover:text-foreground">
          <span className="size-2 rounded-sm" style={{ backgroundColor: task.project.color }} />
          {task.project.name}
        </Link>
        <span>›</span>
        <span className="font-mono">{task.identifier}</span>
        {task.parent && (
          <>
            <span>›</span>
            <Link href={`/issue/${task.parent.identifier}`} className="truncate hover:text-foreground">
              {task.parent.title}
            </Link>
          </>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          <CopyButton text={`${typeof window !== "undefined" ? window.location.origin : ""}/issue/${task.identifier}`} label="Copy link" icon={<Link2 />} />
          <CopyButton text={task.identifier} label="Copy ID" icon={<Copy />} />
          {mode === "sheet" && (
            <Tooltip>
              <TooltipTrigger
                render={<Button variant="ghost" size="icon-xs" aria-label="Open full page" onClick={() => router.push(`/issue/${task.identifier}`)} />}
              >
                <ExternalLink />
              </TooltipTrigger>
              <TooltipContent>Open full page</TooltipContent>
            </Tooltip>
          )}
          <DeleteTaskButton
            taskId={task.id}
            identifier={task.identifier}
            afterDelete={() => (mode === "sheet" ? router.back() : router.push(`/projects/${task.project.key}`))}
          />
        </div>
      </div>

      <textarea
        key={task.title}
        defaultValue={task.title}
        rows={1}
        aria-label="Title"
        className="field-sizing-content w-full resize-none bg-transparent text-xl font-semibold leading-snug outline-none placeholder:text-muted-foreground"
        placeholder="Task title"
        onBlur={(e) => {
          const v = e.target.value.trim();
          if (v && v !== task.title) update({ title: v });
          else e.target.value = task.title;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
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

      <Subtasks task={opt} statuses={statuses} />

      <p className="text-[11px] text-muted-foreground">
        Created {formatRelative(task.createdAt)} · Updated {formatRelative(task.updatedAt)}
        {task.completedAt && <> · Completed {formatRelative(task.completedAt)}</>}
      </p>
    </div>
  );
}

function CopyButton({ text, label, icon }: { text: string; label: string; icon: React.ReactNode }) {
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
              navigator.clipboard.writeText(text).then(() => {
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
  taskId,
  identifier,
  afterDelete,
}: {
  taskId: string;
  identifier: string;
  afterDelete: () => void;
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
                const res = await deleteTask(taskId);
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success(`${identifier} deleted`);
                afterDelete();
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

function Subtasks({ task, statuses }: { task: TaskDetailData; statuses: Status[] }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, start] = useTransition();
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

  return (
    <section className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-muted-foreground">
          Subtasks
          {task.subtaskCount > 0 && (
            <span className="ml-1.5 font-mono">
              {task.subtaskDone}/{task.subtaskCount}
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
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${(task.subtaskDone / task.subtaskCount) * 100}%` }}
          />
        </div>
      )}
      <ul className="divide-y rounded-md border">
        {task.subtasks.map((s) => {
          const done = s.status.type === "completed";
          return (
            <li key={s.id} className="flex items-center gap-2 px-2 py-1.5 text-[13px]">
              <Checkbox
                checked={done}
                aria-label={done ? "Reopen subtask" : "Complete subtask"}
                disabled={!doneStatus}
                onCheckedChange={(c) => {
                  const target = c ? doneStatus : openStatus;
                  if (!target) return;
                  updateTask({ id: s.id, statusId: target.id }).then((r) => !r.ok && toast.error(r.error));
                }}
              />
              <StatusIcon type={s.status.type} color={s.status.color} />
              <span className="font-mono text-[11px] text-muted-foreground">{s.identifier}</span>
              <Link
                href={`/issue/${s.identifier}`}
                className={cn("flex-1 truncate hover:underline", done && "text-muted-foreground line-through")}
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
              className="h-7 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              onKeyDown={(e) => {
                if (e.key === "Enter") add();
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

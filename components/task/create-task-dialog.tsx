"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ModKbd } from "@/components/layout/kbd";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTask } from "@/lib/actions/tasks";
import type { Label } from "@/lib/db/schema";
import type { Priority } from "@/lib/enums";
import type { ProjectMeta } from "@/lib/queries/meta";
import { Editor } from "./editor";
import { DueDatePicker, LabelPicker, PriorityPicker, StatusPicker } from "./pickers";

function dedupeById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  projects,
  defaultProjectId,
  defaultStatusId,
  parentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectMeta[];
  defaultProjectId?: string;
  defaultStatusId?: string;
  parentId?: string;
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.project.id ?? "");
  const meta = projects.find((p) => p.project.id === projectId) ?? projects[0];
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState<string | null>(null);
  const [statusId, setStatusId] = useState<string | undefined>(defaultStatusId);
  const [priority, setPriority] = useState<Priority>("none");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [extraLabels, setExtraLabels] = useState<Label[]>([]);
  const [createMore, setCreateMore] = useState(false);
  const [pending, start] = useTransition();
  const [editorKey, setEditorKey] = useState(0);

  const effectiveStatusId =
    statusId && meta?.statuses.some((s) => s.id === statusId) ? statusId : meta?.statuses[0]?.id;
  const labels = dedupeById([
    ...(meta?.labels ?? []),
    ...extraLabels.filter((l) => l.projectId === projectId || l.projectId === null),
  ]);

  function reset(keepProject = true) {
    setTitle("");
    setDescription(null);
    setPriority("none");
    setDueDate(null);
    setLabelIds([]);
    setEditorKey((k) => k + 1);
    if (!keepProject) setStatusId(defaultStatusId);
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!meta || !title.trim()) return;
    start(async () => {
      const res = await createTask({
        projectId: meta.project.id,
        title,
        description,
        statusId: effectiveStatusId,
        priority,
        dueDate,
        labelIds,
        parentId: parentId ?? null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${res.data.identifier} created`, {
        action: { label: "Open", onClick: () => router.push(`/issue/${res.data.identifier}`) },
      });
      reset();
      if (!createMore) onOpenChange(false);
    });
  }

  if (!meta) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[12%] translate-y-0 gap-0 p-0 sm:max-w-2xl">
        <form onSubmit={submit} className="contents">
          <DialogHeader className="flex-row items-center gap-2 space-y-0 px-4 pt-3 pb-0">
            {projects.length > 1 && !parentId ? (
              <Select
                value={projectId}
                items={projects.map((p) => ({ value: p.project.id, label: p.project.name }))}
                onValueChange={(v) => {
                  if (v) {
                    setProjectId(v as string);
                    setStatusId(undefined);
                    setLabelIds([]);
                  }
                }}
              >
                <SelectTrigger size="sm" className="h-6 gap-1 border-0 bg-muted px-2 text-xs dark:bg-muted">
                  <span className="size-2 rounded-sm" style={{ backgroundColor: meta.project.color }} />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.project.id} value={p.project.id}>
                      <span className="size-2 rounded-sm" style={{ backgroundColor: p.project.color }} />
                      {p.project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="flex items-center gap-1.5 rounded bg-muted px-2 py-0.5 text-xs">
                <span className="size-2 rounded-sm" style={{ backgroundColor: meta.project.color }} />
                {meta.project.name}
              </span>
            )}
            <span className="text-xs text-muted-foreground">›</span>
            <DialogTitle className="text-xs font-normal text-muted-foreground">
              {parentId ? "New subtask" : "New task"}
            </DialogTitle>
            <DialogDescription className="sr-only">Create a new task</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 px-4 pt-2 pb-3">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              aria-label="Title"
              className="w-full bg-transparent text-lg font-medium outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
            />
            <Editor
              key={`${projectId}-${editorKey}`}
              content={null}
              onChange={setDescription}
              minHeight="5rem"
              placeholder="Add description… (paste or drop images)"
            />
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {effectiveStatusId && (
                <StatusPicker value={effectiveStatusId} statuses={meta.statuses} onChange={setStatusId} />
              )}
              <PriorityPicker value={priority} onChange={setPriority} />
              <DueDatePicker value={dueDate} onChange={setDueDate} />
              <LabelPicker
                value={labelIds}
                labels={labels}
                projectId={meta.project.id}
                onChange={setLabelIds}
                onLabelCreated={(l) => setExtraLabels((prev) => [...prev, l])}
              />
            </div>
          </div>

          <DialogFooter className="flex-row items-center justify-between gap-2 border-t px-4 py-2.5 sm:justify-between">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground select-none">
              <input
                type="checkbox"
                checked={createMore}
                onChange={(e) => setCreateMore(e.target.checked)}
                className="accent-primary"
              />
              Create more
            </label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={pending || !title.trim()}>
                Create task
                <ModKbd keyLabel="↵" className="ml-1 border-0 bg-primary-foreground/20" />
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createStatus, deleteStatus, reorderStatuses, updateStatus } from "@/lib/actions/statuses";
import { STATUS_TYPE_META } from "@/lib/constants";
import type { Status } from "@/lib/db/schema";
import { STATUS_TYPES, type StatusType } from "@/lib/enums";
import { ColorPicker } from "./color-picker";

const typeItems = STATUS_TYPES.map((t) => ({ value: t, label: STATUS_TYPE_META[t].label }));

export function StatusesManager({
  projectId,
  statuses,
  counts,
}: {
  projectId: string;
  statuses: Status[];
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const serverKey = statuses.map((s) => s.id).join("|");
  const [order, setOrder] = useState<string[] | null>(null);
  const [prevKey, setPrevKey] = useState(serverKey);
  if (prevKey !== serverKey) {
    setPrevKey(serverKey);
    setOrder(null);
  }
  const byId = new Map(statuses.map((s) => [s.id, s]));
  const items = (order ?? statuses.map((s) => s.id)).map((id) => byId.get(id)!).filter(Boolean);

  const [newName, setNewName] = useState("");
  const [pending, start] = useTransition();
  const [deleting, setDeleting] = useState<Status | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = items.map((s) => s.id);
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    setOrder(next);
    start(async () => {
      const res = await reorderStatuses(projectId, next);
      if (!res.ok) {
        toast.error(res.error);
        setOrder(null);
      }
      router.refresh();
    });
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    start(async () => {
      const res = await createStatus({ projectId, name: newName });
      if (!res.ok) { toast.error(res.error); return; }
      setNewName("");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-2">
      <DndContext id="statuses-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ul className="grid gap-1">
            {items.map((s) => (
              <StatusRow
                key={s.id}
                status={s}
                count={counts[s.id] ?? 0}
                onDelete={() => setDeleting(s)}
                canDelete={items.length > 1}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <form onSubmit={add} className="flex items-center gap-2 pl-7">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New status name"
          aria-label="New status name"
          className="h-8 max-w-xs"
        />
        <Button type="submit" size="sm" variant="outline" disabled={pending || !newName.trim()}>
          <Plus /> Add status
        </Button>
      </form>

      <DeleteStatusDialog
        status={deleting}
        count={deleting ? (counts[deleting.id] ?? 0) : 0}
        others={items.filter((s) => s.id !== deleting?.id)}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function StatusRow({
  status,
  count,
  onDelete,
  canDelete,
}: {
  status: Status;
  count: number;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: status.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  function save(patch: { name?: string; color?: string; type?: StatusType; hidden?: boolean }) {
    updateStatus({ id: status.id, ...patch }).then((res) => {
      if (!res.ok) toast.error(res.error);
      router.refresh();
    });
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex flex-wrap items-center gap-2 rounded-md border bg-card px-2 py-1.5 sm:flex-nowrap ${isDragging ? "z-10 shadow-lg" : ""}`}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
        aria-label={`Reorder ${status.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label={`Color of ${status.name}`}
              className="size-3.5 shrink-0 rounded-full ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              style={{ backgroundColor: status.color }}
            />
          }
        />
        <PopoverContent className="w-auto p-2" align="start">
          <ColorPicker value={status.color} onChange={(c) => save({ color: c })} />
        </PopoverContent>
      </Popover>

      <Input
        key={status.name}
        defaultValue={status.name}
        aria-label={`Name of ${status.name}`}
        className="h-7 min-w-28 flex-1 border-transparent bg-transparent text-[13px] shadow-none hover:border-input focus-visible:border-ring md:text-[13px] dark:bg-transparent"
        onBlur={(e) => {
          const v = e.target.value.trim();
          if (v && v !== status.name) save({ name: v });
          else e.target.value = status.name;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            (e.target as HTMLInputElement).value = status.name;
            (e.target as HTMLInputElement).blur();
          }
        }}
      />

      <Select
        value={status.type}
        items={typeItems}
        onValueChange={(v) => v && v !== status.type && save({ type: v as StatusType })}
      >
        <SelectTrigger size="sm" className="w-28 shrink-0 text-xs" aria-label={`Type of ${status.name}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {typeItems.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span
        className="w-8 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums"
        title={`${count} ${count === 1 ? "task" : "tasks"}`}
      >
        {count}
        <span className="sr-only"> {count === 1 ? "task" : "tasks"}</span>
      </span>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={status.hidden ? `Show ${status.name} on board` : `Hide ${status.name} from board`}
              className={status.hidden ? "text-muted-foreground" : ""}
              onClick={() => save({ hidden: !status.hidden })}
            />
          }
        >
          {status.hidden ? <EyeOff /> : <Eye />}
        </TooltipTrigger>
        <TooltipContent>{status.hidden ? "Hidden on board. Click to show" : "Shown on board. Click to hide"}</TooltipContent>
      </Tooltip>

      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Delete ${status.name}`}
        disabled={!canDelete}
        onClick={onDelete}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 />
      </Button>
    </li>
  );
}

function DeleteStatusDialog({
  status,
  count,
  others,
  onClose,
}: {
  status: Status | null;
  count: number;
  others: Status[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [target, setTarget] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const needsTarget = count > 0;
  const chosen = target && others.some((o) => o.id === target) ? target : (others[0]?.id ?? null);

  return (
    <AlertDialog open={!!status} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{status?.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {needsTarget
              ? `${count} ${count === 1 ? "task is" : "tasks are"} in this status. Choose where to move ${count === 1 ? "it" : "them"}.`
              : "This status has no tasks and will be removed."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {needsTarget && (
          <Select
            value={chosen}
            items={others.map((o) => ({ value: o.id, label: o.name }))}
            onValueChange={(v) => setTarget(v as string)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {others.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending || (needsTarget && !chosen)}
            onClick={() =>
              start(async () => {
                if (!status) return;
                const res = await deleteStatus(status.id, needsTarget ? (chosen ?? undefined) : undefined);
                if (!res.ok) { toast.error(res.error); return; }
                onClose();
                router.refresh();
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

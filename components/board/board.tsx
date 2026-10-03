"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type Active,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import { CreateTaskDialog } from "@/components/task/create-task-dialog";
import { reorderStatuses } from "@/lib/actions/statuses";
import { moveTask } from "@/lib/actions/tasks";
import type { Status } from "@/lib/db/schema";
import type { ProjectMeta } from "@/lib/queries/meta";
import type { TaskRow } from "@/lib/queries/tasks";
import { BoardColumn, ColumnShell } from "./column";
import { TaskCardContent } from "./task-card";

type Columns = Record<string, string[]>; // statusId -> ordered task ids

function buildColumns(statuses: Status[], tasks: TaskRow[]): Columns {
  const cols: Columns = Object.fromEntries(statuses.map((s) => [s.id, []]));
  for (const t of tasks) cols[t.statusId]?.push(t.id);
  return cols;
}

const colId = (statusId: string) => `col:${statusId}`;
/** Top edge of the dragged item's current rect (module-level so lint doesn't mistake it for a React ref). */
const draggedTop = (a: Active) => a.rect.current.translated?.top ?? null;
const isCol = (id: string | number) => String(id).startsWith("col:");
const stripCol = (id: string | number) => String(id).slice(4);

export function Board({ meta, statuses, tasks }: { meta: ProjectMeta; statuses: Status[]; tasks: TaskRow[] }) {
  const tasksById = new Map(tasks.map((t) => [t.id, t]));
  const serverColumns = buildColumns(statuses, tasks);
  const serverKey = JSON.stringify({ s: statuses.map((s) => s.id), c: serverColumns });

  const [state, setState] = useState({ key: serverKey, statusOrder: statuses.map((s) => s.id), columns: serverColumns });
  const [active, setActive] = useState<{ id: string; type: "task" | "column" } | null>(null);
  const [createFor, setCreateFor] = useState<string | null>(null);
  const [, start] = useTransition();

  // Adopt fresh server data whenever it changes and nothing is being dragged.
  if (state.key !== serverKey && !active) {
    setState({ key: serverKey, statusOrder: statuses.map((s) => s.id), columns: serverColumns });
  }

  const statusById = new Map(statuses.map((s) => [s.id, s]));
  const orderedStatuses = state.statusOrder.map((id) => statusById.get(id)).filter((s): s is Status => !!s);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findColumnOf = useCallback(
    (id: string, columns: Columns) => {
      if (isCol(id)) return stripCol(id);
      return Object.keys(columns).find((k) => columns[k].includes(id));
    },
    [],
  );

  // Columns: closest corners among column ids. Tasks: prefer pointer-within, fall back to rect intersection.
  const collision: CollisionDetection = (args) => {
    if (active?.type === "column") {
      return closestCorners({ ...args, droppableContainers: args.droppableContainers.filter((c) => isCol(c.id)) });
    }
    const within = pointerWithin(args);
    const hits = within.length ? within : rectIntersection(args);
    // Prefer task hits over the column container so insertion index is accurate.
    const taskHit = hits.find((h) => !isCol(h.id));
    return taskHit ? [taskHit] : hits.filter((h) => isCol(h.id)).slice(0, 1);
  };

  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    setActive({ id, type: isCol(id) ? "column" : "task" });
  }

  function onDragOver(e: DragOverEvent) {
    const { active: a, over } = e;
    if (!over || active?.type !== "task") return;
    const activeId = String(a.id);
    const overId = String(over.id);
    setState((prev) => {
      const from = findColumnOf(activeId, prev.columns);
      const to = findColumnOf(overId, prev.columns);
      if (!from || !to || from === to) return prev;
      const fromIds = prev.columns[from].filter((id) => id !== activeId);
      const toIds = [...prev.columns[to]];
      let index = toIds.length;
      if (!isCol(overId)) {
        const overIndex = toIds.indexOf(overId);
        const top = draggedTop(a);
        const below = top !== null && top > over.rect.top + over.rect.height / 2;
        index = overIndex + (below ? 1 : 0);
      }
      toIds.splice(index, 0, activeId);
      return { ...prev, columns: { ...prev.columns, [from]: fromIds, [to]: toIds } };
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const { active: a, over } = e;
    const activeId = String(a.id);
    const type = active?.type;
    setActive(null);
    if (!over) return;
    const overId = String(over.id);

    if (type === "column") {
      const from = state.statusOrder.indexOf(stripCol(activeId));
      const to = state.statusOrder.indexOf(stripCol(overId));
      if (from < 0 || to < 0 || from === to) return;
      const next = arrayMove(state.statusOrder, from, to);
      setState((p) => ({ ...p, statusOrder: next }));
      start(async () => {
        const res = await reorderStatuses(meta.project.id, next);
        if (!res.ok) toast.error(res.error);
      });
      return;
    }

    // Task: finalize index within the (possibly new) column.
    const col = findColumnOf(activeId, state.columns);
    if (!col) return;
    let ids = [...state.columns[col]];
    const oldIndex = ids.indexOf(activeId);
    let newIndex = oldIndex;
    if (!isCol(overId) && overId !== activeId && ids.includes(overId)) {
      newIndex = ids.indexOf(overId);
      ids = arrayMove(ids, oldIndex, newIndex);
    }
    const task = tasksById.get(activeId);
    const unchanged = task && task.statusId === col && serverColumns[col]?.indexOf(activeId) === newIndex;
    setState((p) => ({ ...p, columns: { ...p.columns, [col]: ids } }));
    if (unchanged) return;
    start(async () => {
      const res = await moveTask({ taskId: activeId, toStatusId: col, toIndex: newIndex });
      if (!res.ok) {
        toast.error(res.error);
        setState({ key: serverKey, statusOrder: statuses.map((s) => s.id), columns: serverColumns });
      }
    });
  }

  const activeTask = active?.type === "task" ? tasksById.get(active.id) : undefined;
  const activeStatus = active?.type === "column" ? statusById.get(stripCol(active.id)) : undefined;

  return (
    <>
      <DndContext
        id={`board-${meta.project.id}`}
        sensors={sensors}
        collisionDetection={collision}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActive(null)}
      >
        <SortableContext items={state.statusOrder.map(colId)} strategy={horizontalListSortingStrategy}>
          <div className="flex h-full gap-3 overflow-x-auto px-4 py-3">
            {orderedStatuses.map((s) => (
              <BoardColumn
                key={s.id}
                status={s}
                projectId={meta.project.id}
                tasks={(state.columns[s.id] ?? []).map((id) => tasksById.get(id)).filter((t): t is TaskRow => !!t)}
                onOpenCreate={setCreateFor}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={{ duration: 150 }}>
          {activeTask && (
            <div className="w-[calc(18rem-1rem)]">
              <TaskCardContent task={activeTask} dragging />
            </div>
          )}
          {activeStatus && (
            <ColumnShell status={activeStatus} count={state.columns[activeStatus.id]?.length ?? 0} dragging>
              <div className="h-24" />
            </ColumnShell>
          )}
        </DragOverlay>
      </DndContext>

      {createFor && (
        <CreateTaskDialog
          open={!!createFor}
          onOpenChange={(o) => !o && setCreateFor(null)}
          projects={[meta]}
          defaultProjectId={meta.project.id}
          defaultStatusId={createFor}
        />
      )}
    </>
  );
}

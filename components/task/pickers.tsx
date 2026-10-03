"use client";

import { CalendarIcon, Check, Plus, Tag, X } from "lucide-react";
import { parseISO } from "date-fns";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createLabel } from "@/lib/actions/labels";
import { PRIORITY_META, PRIORITY_ORDER } from "@/lib/constants";
import { formatDue, isOverdue, toIsoDate } from "@/lib/dates";
import type { Label, Status } from "@/lib/db/schema";
import type { Priority } from "@/lib/enums";
import { cn } from "@/lib/utils";
import { LabelChip, PriorityIcon, StatusIcon } from "./icons";

const chip =
  "h-7 gap-1.5 px-2 text-xs font-normal text-foreground/90 border-border/70 bg-transparent hover:bg-muted dark:bg-transparent";

export function StatusPicker({
  value,
  statuses,
  onChange,
  compact,
}: {
  value: string;
  statuses: Status[];
  onChange: (statusId: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = statuses.find((s) => s.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size={compact ? "icon-xs" : "sm"}
            className={compact ? "size-6 border-transparent" : chip}
            aria-label="Change status"
          />
        }
      >
        {current && <StatusIcon type={current.type} color={current.color} />}
        {!compact && (current?.name ?? "Status")}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder="Change status…" />
          <CommandList>
            <CommandEmpty>No status found.</CommandEmpty>
            <CommandGroup>
              {statuses.map((s) => (
                <CommandItem
                  key={s.id}
                  value={s.name}
                  onSelect={() => {
                    onChange(s.id);
                    setOpen(false);
                  }}
                >
                  <StatusIcon type={s.type} color={s.color} />
                  {s.name}
                  {s.id === value && <Check className="ml-auto size-3.5" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function PriorityPicker({
  value,
  onChange,
  compact,
}: {
  value: Priority;
  onChange: (p: Priority) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size={compact ? "icon-xs" : "sm"}
            className={compact ? "size-6 border-transparent" : chip}
            aria-label="Change priority"
          />
        }
      >
        <PriorityIcon priority={value} className={PRIORITY_META[value].className} />
        {!compact && PRIORITY_META[value].label}
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <Command>
          <CommandInput placeholder="Set priority…" />
          <CommandList>
            <CommandEmpty>No match.</CommandEmpty>
            <CommandGroup>
              {PRIORITY_ORDER.map((p) => (
                <CommandItem
                  key={p}
                  value={PRIORITY_META[p].label}
                  onSelect={() => {
                    onChange(p);
                    setOpen(false);
                  }}
                >
                  <PriorityIcon priority={p} className={PRIORITY_META[p].className} />
                  {PRIORITY_META[p].label}
                  {p === value && <Check className="ml-auto size-3.5" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function DueDatePicker({
  value,
  onChange,
  completed = false,
}: {
  value: string | null;
  onChange: (iso: string | null) => void;
  completed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const overdue = isOverdue(value, completed);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(chip, overdue && "text-red-500 border-red-500/40")}
            aria-label="Set due date"
          />
        }
      >
        <CalendarIcon className="size-3.5" />
        {value ? formatDue(value) : "Due date"}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ? parseISO(value) : undefined}
          defaultMonth={value ? parseISO(value) : undefined}
          onSelect={(d) => {
            onChange(d ? toIsoDate(d) : null);
            setOpen(false);
          }}
        />
        {value && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <X /> Clear due date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function LabelPicker({
  value,
  labels,
  projectId,
  onChange,
  onLabelCreated,
  compact,
}: {
  value: string[];
  labels: Label[];
  projectId: string;
  onChange: (labelIds: string[]) => void;
  onLabelCreated?: (label: Label) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, start] = useTransition();
  const selected = labels.filter((l) => value.includes(l.id));
  const exact = labels.some((l) => l.name.toLowerCase() === query.trim().toLowerCase());

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  function create() {
    const name = query.trim();
    if (!name) return;
    start(async () => {
      const res = await createLabel({ projectId, name });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      onLabelCreated?.(res.data);
      onChange([...value, res.data.id]);
      setQuery("");
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(chip, "max-w-full")}
            aria-label="Edit labels"
          />
        }
      >
        <Tag className="size-3.5" />
        {selected.length === 0 && !compact && "Labels"}
        {selected.length > 0 && (
          <span className="flex flex-wrap items-center gap-1">
            {selected.map((l) => (
              <LabelChip key={l.id} name={l.name} color={l.color} className="h-4 border-0 bg-muted px-1.5" />
            ))}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        <Command>
          <CommandInput placeholder="Add labels…" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>{query.trim() ? "No matching labels." : "No labels yet."}</CommandEmpty>
            <CommandGroup>
              {labels.map((l) => (
                <CommandItem key={l.id} value={l.name} onSelect={() => toggle(l.id)}>
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                  {l.name}
                  {l.projectId === null && (
                    <span className="ml-1 text-[10px] text-muted-foreground">global</span>
                  )}
                  {value.includes(l.id) && <Check className="ml-auto size-3.5" />}
                </CommandItem>
              ))}
            </CommandGroup>
            {query.trim() && !exact && (
              <CommandGroup forceMount>
                <CommandItem value={`__create_${query}`} onSelect={create} disabled={pending} forceMount>
                  <Plus className="size-3.5" /> Create “{query.trim()}”
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

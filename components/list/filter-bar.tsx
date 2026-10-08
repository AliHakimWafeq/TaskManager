"use client";

import { ArrowUpDown, Check, Filter, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { PriorityIcon, StatusIcon } from "@/components/task/icons";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRIORITY_META, PRIORITY_ORDER, STATUS_TYPE_META } from "@/lib/constants";
import type { Label, Project, Status } from "@/lib/db/schema";
import { STATUS_TYPES } from "@/lib/enums";
import { DUE_OPTIONS, SORT_OPTIONS, type Filters } from "@/lib/filters";
import { cn } from "@/lib/utils";

const DUE_LABELS: Record<(typeof DUE_OPTIONS)[number], string> = {
  overdue: "Overdue",
  today: "Due today",
  week: "Due this week",
  none: "No due date",
  any: "Has due date",
};

type Option = { value: string; label: string; icon?: React.ReactNode };

export function FilterBar({
  filters,
  statuses,
  labels,
  projects,
  className,
}: {
  filters: Filters;
  statuses?: Status[];
  labels: Label[];
  projects?: Project[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, start] = useTransition();
  const [q, setQ] = useState(filters.q);

  function set(key: string, values: string[] | string | null) {
    // Read the live URL so a debounced search and a filter click don't overwrite each other.
    const next = new URLSearchParams(typeof window !== "undefined" ? window.location.search : sp.toString());
    const v = Array.isArray(values) ? values.join(",") : values;
    if (!v) next.delete(key);
    else next.set(key, v);
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  }

  // Debounced search.
  useEffect(() => {
    if (q === filters.q) return;
    const t = setTimeout(() => set("q", q.trim() || null), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const active =
    filters.status.length + filters.type.length + filters.priority.length + filters.label.length + filters.project.length + (filters.due ? 1 : 0);

  const statusOptions: Option[] | undefined = statuses?.map((s) => ({
    value: s.id,
    label: s.name,
    icon: <StatusIcon type={s.type} color={s.color} />,
  }));
  const typeOptions: Option[] = STATUS_TYPES.map((t) => ({
    value: t,
    label: STATUS_TYPE_META[t].label,
    icon: <StatusIcon type={t} color="currentColor" className="text-muted-foreground" />,
  }));
  const priorityOptions: Option[] = PRIORITY_ORDER.map((p) => ({
    value: p,
    label: PRIORITY_META[p].label,
    icon: <PriorityIcon priority={p} className={PRIORITY_META[p].className} />,
  }));
  const labelOptions: Option[] = labels.map((l) => ({
    value: l.id,
    label: l.name,
    icon: <span className="size-2.5 rounded-full" style={{ backgroundColor: l.color }} />,
  }));
  const projectOptions: Option[] | undefined = projects?.map((p) => ({
    value: p.id,
    label: p.name,
    icon: <span className="size-2.5 rounded-sm" style={{ backgroundColor: p.color }} />,
  }));
  const dueOptions: Option[] = DUE_OPTIONS.map((d) => ({ value: d, label: DUE_LABELS[d] }));

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="h-7 w-44 rounded-md border bg-transparent pr-6 pl-7 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring"
        />
        {q && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQ("")}
            className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {projectOptions && (
        <MultiFilter label="Project" options={projectOptions} value={filters.project} onChange={(v) => set("project", v)} />
      )}
      {statusOptions ? (
        <MultiFilter label="Status" options={statusOptions} value={filters.status} onChange={(v) => set("status", v)} />
      ) : (
        <MultiFilter label="Status" options={typeOptions} value={filters.type} onChange={(v) => set("type", v)} />
      )}
      <MultiFilter label="Priority" options={priorityOptions} value={filters.priority} onChange={(v) => set("priority", v)} />
      <MultiFilter label="Label" options={labelOptions} value={filters.label} onChange={(v) => set("label", v)} />
      <MultiFilter
        label="Due"
        options={dueOptions}
        value={filters.due ? [filters.due] : []}
        single
        onChange={(v) => set("due", v[0] ?? null)}
      />

      {active > 0 && (
        <Button
          variant="ghost"
          size="xs"
          className="text-muted-foreground"
          onClick={() => {
            const next = new URLSearchParams();
            if (filters.sort !== "manual") next.set("sort", filters.sort);
            if (filters.q) next.set("q", filters.q);
            start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
          }}
        >
          <X /> Clear
        </Button>
      )}

    </div>
  );
}

function MultiFilter({
  label,
  options,
  value,
  onChange,
  single,
}: {
  label: string;
  options: Option[];
  value: string[];
  onChange: (v: string[]) => void;
  single?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.filter((o) => value.includes(o.value));
  const activeCls = selected.length > 0;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="xs"
            className={cn(
              "h-7 gap-1 border-dashed px-2 text-xs font-normal text-muted-foreground",
              activeCls && "border-solid text-foreground",
            )}
          />
        }
      >
        {!activeCls && <Filter className="size-3" />}
        {label}
        {selected.length > 0 && (
          <span className="flex items-center gap-1 border-l pl-1.5">
            {selected.slice(0, 2).map((o) => (
              <span key={o.value} className="flex items-center gap-1">
                {o.icon}
                {o.label}
              </span>
            ))}
            {selected.length > 2 && <span className="text-muted-foreground">+{selected.length - 2}</span>}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Filter ${label.toLowerCase()}…`} />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const checked = value.includes(o.value);
                return (
                  <CommandItem
                    key={o.value}
                    value={o.label}
                    onSelect={() => {
                      if (single) {
                        onChange(checked ? [] : [o.value]);
                        setOpen(false);
                      } else {
                        onChange(checked ? value.filter((v) => v !== o.value) : [...value, o.value]);
                      }
                    }}
                  >
                    <span
                      className={cn(
                        "flex size-3.5 items-center justify-center rounded-sm border",
                        checked ? "border-primary bg-primary text-primary-foreground" : "opacity-50",
                      )}
                    >
                      {checked && <Check className="size-3" />}
                    </span>
                    {o.icon}
                    {o.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {value.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem value="__clear" onSelect={() => onChange([])} className="justify-center text-muted-foreground">
                    Clear
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Sort control for list views; writes `sort` to the URL. */
export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, start] = useTransition();
  return (
    <div className="flex items-center">
      <Select
        value={value}
        items={SORT_OPTIONS}
        onValueChange={(v) => {
          const next = new URLSearchParams(window.location.search);
          if (!v || v === "manual") next.delete("sort");
          else next.set("sort", v as string);
          start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
        }}
      >
        <SelectTrigger
          size="sm"
          aria-label="Sort"
          className="h-7 gap-1 border-dashed px-2 text-xs font-normal text-muted-foreground dark:bg-transparent"
        >
          <ArrowUpDown className="size-3" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

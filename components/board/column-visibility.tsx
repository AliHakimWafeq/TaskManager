"use client";

import { Check, Columns3 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { StatusIcon } from "@/components/task/icons";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { updateStatus } from "@/lib/actions/statuses";
import type { Status } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

/** Show/hide board columns. Persisted on each status (statuses.hidden). */
export function ColumnVisibility({
  statuses,
  counts,
  disabled,
}: {
  statuses: Status[];
  counts: Record<string, number>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const hiddenCount = statuses.filter((s) => s.hidden).length;

  function setHidden(ids: string[], hidden: boolean) {
    start(async () => {
      const results = await Promise.all(ids.map((id) => updateStatus({ id, hidden })));
      const failed = results.find((r) => !r.ok);
      if (failed && !failed.ok) toast.error(failed.error);
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="xs"
            disabled={disabled}
            className={cn(
              "h-7 gap-1 border-dashed px-2 text-xs font-normal text-muted-foreground",
              hiddenCount > 0 && "border-solid text-foreground",
            )}
            aria-label="Choose visible columns"
          />
        }
      >
        <Columns3 className="size-3" />
        Columns
        {hiddenCount > 0 && (
          <span className="border-l pl-1.5 text-muted-foreground">{hiddenCount} hidden</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="end">
        <Command>
          <CommandList>
            <CommandGroup heading="Visible columns">
              {statuses.map((s) => {
                const visible = !s.hidden;
                const lastVisible = visible && statuses.filter((x) => !x.hidden).length === 1;
                return (
                  <CommandItem
                    key={s.id}
                    value={s.name}
                    disabled={pending || lastVisible}
                    onSelect={() => setHidden([s.id], visible)}
                  >
                    <span
                      className={cn(
                        "flex size-3.5 items-center justify-center rounded-sm border",
                        visible ? "border-primary bg-primary text-primary-foreground" : "opacity-50",
                      )}
                    >
                      {visible && <Check className="size-3" aria-hidden />}
                      <span className="sr-only">{visible ? "Shown:" : "Hidden:"}</span>
                    </span>
                    <StatusIcon type={s.type} color={s.color} />
                    <span className="truncate">{s.name}</span>
                    <span className="ml-auto font-mono text-[11px] text-muted-foreground">{counts[s.id] ?? 0}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {hiddenCount > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="__show_all"
                    disabled={pending}
                    className="justify-center text-muted-foreground"
                    onSelect={() =>
                      setHidden(
                        statuses.filter((s) => s.hidden).map((s) => s.id),
                        false,
                      )
                    }
                  >
                    Show all columns
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

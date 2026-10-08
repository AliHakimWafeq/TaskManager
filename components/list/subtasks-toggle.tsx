"use client";

import { ListTree } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { setShowSubtasks } from "@/lib/actions/preferences";
import { cn } from "@/lib/utils";

/** Show subtasks as their own cards/rows on boards and lists. Remembered per browser. */
export function SubtasksToggle({ show }: { show: boolean }) {
  const [pending, start] = useTransition();
  const [value, setValue] = useOptimistic(show);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            size="xs"
            aria-pressed={value}
            disabled={pending}
            onClick={() =>
              start(async () => {
                setValue(!value);
                await setShowSubtasks(!value);
              })
            }
            className={cn(
              "h-7 gap-1 px-2 text-xs font-normal",
              value ? "border-solid text-foreground" : "border-dashed text-muted-foreground",
            )}
          />
        }
      >
        <ListTree className="size-3" />
        Subtasks
        <span className="border-l pl-1.5 text-muted-foreground">{value ? "Shown" : "Hidden"}</span>
      </TooltipTrigger>
      <TooltipContent>{value ? "Hide subtasks from the board and lists" : "Show subtasks as their own tickets"}</TooltipContent>
    </Tooltip>
  );
}

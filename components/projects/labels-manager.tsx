"use client";

import { Globe, Plus, Trash2 } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { createLabel, deleteLabel, updateLabel } from "@/lib/actions/labels";
import { PALETTE } from "@/lib/constants";
import type { Label as LabelRow } from "@/lib/db/schema";
import { ColorPicker } from "./color-picker";

export function LabelsManager({ projectId, labels }: { projectId: string; labels: LabelRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(PALETTE[1]);
  const [global, setGlobal] = useState(false);
  const [pending, start] = useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await createLabel({ projectId: global ? null : projectId, name, color });
      if (!res.ok) { toast.error(res.error); return; }
      setName("");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-2">
      <ul className="grid gap-1">
        {labels.length === 0 && (
          <li className="text-xs text-muted-foreground">No labels yet.</li>
        )}
        {labels.map((l) => (
          <LabelRowItem key={l.id} label={l} />
        ))}
      </ul>
      <form onSubmit={add} className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                aria-label="Label color"
                className="size-5 shrink-0 rounded-md ring-offset-2 ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ backgroundColor: color }}
              />
            }
          />
          <PopoverContent className="w-auto p-2" align="start">
            <ColorPicker value={color} onChange={setColor} />
          </PopoverContent>
        </Popover>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New label name"
          aria-label="New label name"
          className="h-8 max-w-xs"
        />
        <Label className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
          <Checkbox checked={global} onCheckedChange={(c) => setGlobal(c === true)} />
          Global
        </Label>
        <Button type="submit" size="sm" variant="outline" disabled={pending || !name.trim()}>
          <Plus /> Add label
        </Button>
      </form>
    </div>
  );
}

function LabelRowItem({ label }: { label: LabelRow }) {
  const router = useRouter();
  function save(patch: { name?: string; color?: string }) {
    updateLabel({ id: label.id, ...patch }).then((res) => {
      if (!res.ok) toast.error(res.error);
      router.refresh();
    });
  }
  return (
    <li className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5">
      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label={`Color of ${label.name}`}
              className="size-3.5 shrink-0 rounded-full ring-offset-2 ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ backgroundColor: label.color }}
            />
          }
        />
        <PopoverContent className="w-auto p-2" align="start">
          <ColorPicker value={label.color} onChange={(c) => save({ color: c })} />
        </PopoverContent>
      </Popover>
      <Input
        key={label.name}
        defaultValue={label.name}
        aria-label={`Name of ${label.name}`}
        className="h-7 min-w-28 flex-1 border-transparent bg-transparent text-[13px] shadow-none hover:border-input focus-visible:border-ring md:text-[13px] dark:bg-transparent"
        onBlur={(e) => {
          const v = e.target.value.trim();
          if (v && v !== label.name) save({ name: v });
          else e.target.value = label.name;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
      {label.projectId === null && (
        <Tooltip>
          <TooltipTrigger
            render={
              <span
                tabIndex={0}
                className="rounded-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            }
          >
            <Globe className="size-3.5" aria-hidden />
            <span className="sr-only">Global label</span>
          </TooltipTrigger>
          <TooltipContent>Global label, available in every project</TooltipContent>
        </Tooltip>
      )}
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Delete label ${label.name}`}
              className="text-muted-foreground hover:text-destructive"
            />
          }
        >
          <Trash2 />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete label “{label.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {label.projectId === null
                ? "This is a global label. It will be removed from tasks in every project."
                : "It will be removed from every task in this project."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                deleteLabel(label.id).then((res) => {
                  if (!res.ok) toast.error(res.error);
                  router.refresh();
                })
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

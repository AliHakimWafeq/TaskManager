"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProject } from "@/lib/actions/projects";
import { PALETTE } from "@/lib/constants";
import { suggestProjectKey } from "@/lib/identifiers";
import { ColorPicker } from "./color-picker";

export function CreateProjectDialog({ trigger }: { trigger?: React.ReactElement }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [color, setColor] = useState<string>(PALETTE[0]);
  const [pending, start] = useTransition();

  function reset() {
    setName("");
    setKey("");
    setKeyTouched(false);
    setColor(PALETTE[0]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await createProject({ name, key, color });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Project ${res.data.key} created`);
      setOpen(false);
      reset();
      router.push(`/projects/${res.data.key}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button variant="ghost" size="icon-xs" aria-label="New project">
              <Plus />
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="contents">
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Projects group tasks and have their own workflow statuses.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                autoFocus
                value={name}
                placeholder="Web App"
                onChange={(e) => {
                  setName(e.target.value);
                  if (!keyTouched) setKey(suggestProjectKey(e.target.value));
                }}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="project-key">Key</Label>
              <Input
                id="project-key"
                value={key}
                placeholder="WEB"
                className="font-mono uppercase"
                maxLength={5}
                onChange={(e) => {
                  setKeyTouched(true);
                  setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
                }}
              />
              <p className="text-xs text-muted-foreground">
                Task IDs will look like <span className="font-mono">{key || "KEY"}-1</span>.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label>Color</Label>
              <ColorPicker value={color} onChange={setColor} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !name.trim() || key.length < 2}>
              {pending ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProject } from "@/lib/actions/projects";
import type { Project } from "@/lib/db/schema";
import { ColorPicker } from "./color-picker";

export function ProjectSettingsForm({ project }: { project: Project }) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [color, setColor] = useState(project.color);
  const [pending, start] = useTransition();

  const dirty =
    name !== project.name || description !== (project.description ?? "") || color !== project.color;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await updateProject({
        id: project.id,
        name,
        description: description.trim() || null,
        color,
      });
      if (!res.ok) toast.error(res.error);
      else toast.success("Project updated");
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="key">Key</Label>
        <Input id="key" value={project.key} disabled className="w-28 font-mono" />
        <p className="text-xs text-muted-foreground">Keys can’t be changed once tasks use them.</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Color</Label>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <div>
        <Button type="submit" size="sm" disabled={!dirty || pending || !name.trim()}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

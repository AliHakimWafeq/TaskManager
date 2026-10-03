import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { getProjectByKey } from "@/lib/queries/projects";

export default async function ProjectBoardPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const project = getProjectByKey(key);
  if (!project) notFound();
  return (
    <>
      <PageHeader>
        <span className="size-2.5 rounded-sm" style={{ backgroundColor: project.color }} />
        {project.name}
        <span className="text-muted-foreground">/ Board</span>
      </PageHeader>
      <div className="p-4 text-sm text-muted-foreground">Board coming next.</div>
    </>
  );
}

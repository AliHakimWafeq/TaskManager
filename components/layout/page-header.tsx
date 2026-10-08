import { cn } from "@/lib/utils";

export function PageHeader({
  children,
  actions,
  className,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex h-12 shrink-0 items-center justify-between gap-3 border-b px-4",
        className,
      )}
    >
      <h1 className="flex min-w-0 items-center gap-2 text-sm font-medium">{children}</h1>
      {actions && <div className="flex items-center gap-1.5">{actions}</div>}
    </header>
  );
}

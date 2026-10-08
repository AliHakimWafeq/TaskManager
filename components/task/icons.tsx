import type { Priority, StatusType } from "@/lib/enums";
import { cn } from "@/lib/utils";

/** Linear-style priority glyph: bars for low/medium/high, badge for urgent, dashes for none. */
export function PriorityIcon({ priority, className }: { priority: Priority; className?: string }) {
  const c = cn("size-4 shrink-0", className);
  if (priority === "urgent") {
    return (
      <svg viewBox="0 0 16 16" className={cn(c, "text-orange-500")} aria-hidden>
        <rect x="1" y="1" width="14" height="14" rx="3" fill="currentColor" />
        <path d="M8 4v5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="8" cy="11.6" r="1" fill="white" />
      </svg>
    );
  }
  const filled = priority === "high" ? 3 : priority === "medium" ? 2 : priority === "low" ? 1 : 0;
  return (
    <svg viewBox="0 0 16 16" className={c} aria-hidden>
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={1.5 + i * 5}
          y={11 - i * 4}
          width="3"
          height={4 + i * 4}
          rx="1"
          fill="currentColor"
          className={i < filled ? "opacity-100" : "opacity-25"}
          strokeDasharray={priority === "none" ? "1.5 1.5" : undefined}
        />
      ))}
    </svg>
  );
}

/** Linear-style status glyph driven by type; colored by the status color. */
export function StatusIcon({
  type,
  color,
  className,
}: {
  type: StatusType;
  color: string;
  className?: string;
}) {
  const c = cn("size-3.5 shrink-0", className);
  const stroke = { stroke: color, strokeWidth: 1.6, fill: "none" } as const;
  switch (type) {
    case "backlog":
      return (
        <svg viewBox="0 0 16 16" className={c} aria-hidden>
          <circle cx="8" cy="8" r="6" {...stroke} strokeDasharray="2.2 2" />
        </svg>
      );
    case "started":
      return (
        <svg viewBox="0 0 16 16" className={c} aria-hidden>
          <circle cx="8" cy="8" r="6" {...stroke} />
          <path d="M8 4.5a3.5 3.5 0 0 1 0 7z" fill={color} />
        </svg>
      );
    case "completed":
      return (
        <svg viewBox="0 0 16 16" className={c} aria-hidden>
          <circle cx="8" cy="8" r="6.8" fill={color} />
          <path d="M5 8.2l2 2 4-4.2" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "cancelled":
      return (
        <svg viewBox="0 0 16 16" className={c} aria-hidden>
          <circle cx="8" cy="8" r="6.8" fill={color} />
          <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 16 16" className={c} aria-hidden>
          <circle cx="8" cy="8" r="6" {...stroke} />
        </svg>
      );
  }
}

export function LabelChip({ name, color, className }: { name: string; color: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 max-w-32 min-w-0 items-center gap-1 rounded-full border px-1.5 text-[11px] text-foreground/90",
        className,
      )}
      title={name}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      <span className="truncate">{name}</span>
    </span>
  );
}

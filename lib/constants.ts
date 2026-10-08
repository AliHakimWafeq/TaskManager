import type { Priority, StatusType } from "@/lib/enums";

export const PRIORITY_META: Record<
  Priority,
  { label: string; rank: number; className: string }
> = {
  urgent: { label: "Urgent", rank: 0, className: "text-orange-500" },
  high: { label: "High", rank: 1, className: "text-foreground" },
  medium: { label: "Medium", rank: 2, className: "text-foreground" },
  low: { label: "Low", rank: 3, className: "text-muted-foreground" },
  none: { label: "No priority", rank: 4, className: "text-muted-foreground/60" },
};

export const PRIORITY_ORDER = ["urgent", "high", "medium", "low", "none"] as const;

export const STATUS_TYPE_META: Record<StatusType, { label: string; rank: number }> = {
  backlog: { label: "Backlog", rank: 0 },
  unstarted: { label: "Unstarted", rank: 1 },
  started: { label: "Started", rank: 2 },
  completed: { label: "Completed", rank: 3 },
  cancelled: { label: "Cancelled", rank: 4 },
};

export const DEFAULT_STATUSES: {
  name: string;
  color: string;
  type: StatusType;
}[] = [
  { name: "Backlog", color: "#9ca3af", type: "backlog" },
  { name: "Todo", color: "#a1a1aa", type: "unstarted" },
  { name: "In Progress", color: "#eab308", type: "started" },
  { name: "Done", color: "#22c55e", type: "completed" },
];

export const PALETTE_NAMES: Record<string, string> = {
  "#6366f1": "Indigo",
  "#8b5cf6": "Violet",
  "#ec4899": "Pink",
  "#ef4444": "Red",
  "#f97316": "Orange",
  "#eab308": "Yellow",
  "#22c55e": "Green",
  "#14b8a6": "Teal",
  "#0ea5e9": "Sky",
  "#64748b": "Slate",
};

export const PALETTE = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#0ea5e9", // sky
  "#64748b", // slate
] as const;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

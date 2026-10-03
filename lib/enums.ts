export const PRIORITIES = ["none", "low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STATUS_TYPES = [
  "backlog",
  "unstarted",
  "started",
  "completed",
  "cancelled",
] as const;
export type StatusType = (typeof STATUS_TYPES)[number];

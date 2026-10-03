"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const subscribeNoop = () => () => {};

function detectMac() {
  if (typeof navigator === "undefined") return true;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? nav.platform ?? "";
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/** True on Apple platforms (⌘), false on Windows/Linux (Ctrl). Server renders the Mac variant. */
export function useIsMac() {
  return useSyncExternalStore(subscribeNoop, detectMac, () => true);
}

/** Renders a shortcut like "⌘K" on Mac and "Ctrl+K" elsewhere. */
export function ModKbd({ keyLabel, className }: { keyLabel: string; className?: string }) {
  const isMac = useIsMac();
  return (
    <kbd className={cn("rounded border bg-muted px-1 font-mono text-[10px]", className)}>
      {isMac ? `⌘${keyLabel}` : `Ctrl+${keyLabel}`}
    </kbd>
  );
}

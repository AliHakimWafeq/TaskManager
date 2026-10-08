"use client";

import { Search } from "lucide-react";
import { OPEN_PALETTE_EVENT } from "./command-palette";
import { ModKbd } from "./kbd";

/** Opens the command palette; the only way in on touch devices. */
export function SearchButton() {
  return (
    <button
      type="button"
      aria-keyshortcuts="Meta+K Control+K"
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_PALETTE_EVENT))}
      className="flex w-full items-center gap-2 border-t border-sidebar-border px-3 py-2 text-[11px] text-muted-foreground outline-none hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      <Search className="size-3.5" aria-hidden />
      <span>Search</span>
      <span aria-hidden className="ml-auto">
        <ModKbd keyLabel="K" />
      </span>
    </button>
  );
}

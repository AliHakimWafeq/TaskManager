"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

/** Side panel used by the intercepting route. Closes by navigating back. */
export function TaskSheet({ children, title }: { children: React.ReactNode; title: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  // Focus the (visually hidden) title on open: announced to screen readers, no stray focus ring.
  const titleRef = useRef<HTMLHeadingElement>(null);

  // If the user navigates elsewhere while the slot is still mounted, hide it.
  if (!pathname.startsWith("/issue/")) return null;

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setOpen(false);
          router.back();
        }
      }}
    >
      <SheetContent
        side="right"
        initialFocus={titleRef}
        className="w-full gap-0 overflow-y-auto overscroll-contain p-6 pt-4 sm:max-w-2xl"
      >
        <SheetTitle ref={titleRef} tabIndex={-1} className="sr-only">
          {title}
        </SheetTitle>
        <SheetDescription className="sr-only">Task details</SheetDescription>
        {children}
      </SheetContent>
    </Sheet>
  );
}

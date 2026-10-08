"use client";

import { CheckSquare2, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

/** Top bar with a slide-out sidebar, shown below the md breakpoint. */
export function MobileNav({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(false);
  }
  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b px-2 md:hidden">
      <Button variant="ghost" size="icon-sm" aria-label="Open navigation" onClick={() => setOpen(true)}>
        <Menu />
      </Button>
      <Link href="/inbox" className="flex items-center gap-2 text-sm font-semibold">
        <CheckSquare2 className="size-4 text-primary" /> Tasks
      </Link>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-56 p-0 sm:max-w-56">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Projects and views</SheetDescription>
          {children}
        </SheetContent>
      </Sheet>
    </div>
  );
}

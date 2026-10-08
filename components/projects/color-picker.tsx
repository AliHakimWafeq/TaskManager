"use client";

import { Check } from "lucide-react";
import { PALETTE, PALETTE_NAMES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function ColorPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label="Color" className={cn("flex flex-wrap gap-1.5", className)}>
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-label={PALETTE_NAMES[c] ?? c}
          aria-checked={value.toLowerCase() === c}
          onClick={() => onChange(c)}
          className="flex size-6 items-center justify-center rounded-md border border-transparent transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:hover:scale-100 focus-visible:ring-ring focus-visible:outline-none"
          style={{ backgroundColor: c }}
        >
          {value.toLowerCase() === c && <Check className="size-3.5 text-white drop-shadow" />}
        </button>
      ))}
    </div>
  );
}

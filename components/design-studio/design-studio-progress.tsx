"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type DesignStudioStepId =
  | "blank"
  | "location"
  | "artwork"
  | "specs"
  | "save";

const STEPS: Array<{ id: DesignStudioStepId; label: string }> = [
  { id: "blank", label: "Blank" },
  { id: "location", label: "Location" },
  { id: "artwork", label: "Artwork" },
  { id: "specs", label: "Specs" },
  { id: "save", label: "Save" },
];

export function DesignStudioProgress({
  completed,
  className,
}: {
  completed: Partial<Record<DesignStudioStepId, boolean>>;
  className?: string;
}) {
  return (
    <ol
      className={cn(
        "flex flex-wrap items-center gap-1.5 sm:gap-2",
        className
      )}
      aria-label="Design studio progress"
    >
      {STEPS.map((step, index) => {
        const done = Boolean(completed[step.id]);
        return (
          <li key={step.id} className="flex items-center gap-1.5 sm:gap-2">
            {index > 0 ? (
              <span
                className="hidden h-px w-4 bg-[#e3e3e3] sm:block"
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide",
                done
                  ? "border-[#86d4a8] bg-[#e8f5ee] text-[#0d5c2e]"
                  : "border-[#e3e3e3] bg-white text-[#8a8a8a]"
              )}
            >
              {done ? <Check className="size-3" strokeWidth={2.5} /> : null}
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

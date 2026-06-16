"use client";

import { Check } from "lucide-react";
import { decorationLabel } from "@/lib/format";
import type { OrderFlowStep } from "@/lib/production-flow";
import { cn } from "@/lib/utils";

/** Minimal progress dots for queue rows */
export function FlowProgressDots({
  steps,
  className,
}: {
  steps: OrderFlowStep[];
  className?: string;
}) {
  if (steps.length <= 1) return null;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {steps.map((step) => (
        <span
          key={step.key}
          title={step.imprintLabel}
          className={cn(
            "size-2 rounded-full shrink-0",
            step.status === "scheduled" && "bg-emerald-500",
            step.status === "ready" &&
              "bg-brand-primary ring-2 ring-brand-primary/25 ring-offset-1",
            step.status === "blocked" && "bg-border"
          )}
        />
      ))}
    </div>
  );
}

/** Expandable step list — no actions, just status */
export function FlowStepList({
  steps,
  alwaysShow = false,
}: {
  steps: OrderFlowStep[];
  alwaysShow?: boolean;
}) {
  if (!alwaysShow && steps.length <= 1) return null;
  if (steps.length === 0) return null;

  return (
    <ul className="space-y-1.5 text-xs text-brand-muted">
      {steps.map((step) => (
        <li key={step.key} className="flex items-center gap-2">
          {step.status === "scheduled" ? (
            <Check className="size-3.5 shrink-0 text-emerald-600" />
          ) : step.status === "ready" ? (
            <span className="size-2 shrink-0 rounded-full bg-brand-primary" />
          ) : (
            <span className="size-2 shrink-0 rounded-full bg-border" />
          )}
          <span
            className={cn(
              step.status === "ready" && "font-medium text-brand-ink"
            )}
          >
            {step.imprintLabel}
          </span>
          <span className="text-brand-muted/80">
            · {decorationLabel(step.decoration)}
          </span>
          {step.status === "scheduled" && step.scheduledSummary && (
            <span className="text-emerald-700 truncate">
              · {step.scheduledSummary}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

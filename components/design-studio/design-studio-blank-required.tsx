"use client";

import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  dashboardCardClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export function DesignStudioBlankRequired({
  contextLabel = "order",
  onAddBlank,
  addBlankLabel = "Add a blank",
  className,
  embedded = false,
}: {
  /** Shown in copy: order | order request | product */
  contextLabel?: string;
  onAddBlank?: () => void;
  addBlankLabel?: string;
  className?: string;
  /** When true, omit the outer card chrome (e.g. inside a dialog). */
  embedded?: boolean;
}) {
  const body = (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-10 text-center sm:px-5">
      <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-dashed border-[#c9cccf] bg-[#fafafa]">
        <ImagePlus className="size-5 text-[#8a8a8a]" strokeWidth={1.5} />
      </span>
      <p className="mt-4 text-[15px] font-semibold text-[#303030]">
        Add a blank to open Design studio
      </p>
      <p className={cn("mt-1.5", dashboardTaskDetailClass)}>
        Please add a blank to your {contextLabel} in order to view it in the
        Design studio. The blank is the garment your artwork is placed on.
      </p>
      {onAddBlank ? (
        <Button
          type="button"
          className={cn(dashboardPrimaryButtonClass, "mt-5 h-10 px-4")}
          onClick={onAddBlank}
        >
          <ImagePlus className="size-3.5" />
          {addBlankLabel}
        </Button>
      ) : null}
    </div>
  );

  if (embedded) {
    return <div className={className}>{body}</div>;
  }

  return <section className={cn(dashboardCardClass, className)}>{body}</section>;
}

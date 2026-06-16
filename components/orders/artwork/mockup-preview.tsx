"use client";

import { CheckCircle2, Shirt } from "lucide-react";
import { decorationLabel, formatDateTime } from "@/lib/format";
import type { MockupEntry } from "@/lib/job-imprints";
import { cn } from "@/lib/utils";
import { ArtworkStatusBadge } from "./artwork-status-badge";

export function MockupPreview({
  entry,
  pinned,
  selected,
  onClick,
  compact,
  fill,
}: {
  entry: MockupEntry;
  pinned?: boolean;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
  /** Stretch to fill a panel (e.g. artwork detail modal) */
  fill?: boolean;
}) {
  const { job, imprint } = entry;
  const file = imprint.artwork;
  const approved = file.status === "approved";
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "overflow-hidden rounded-2xl border bg-white shadow-sm text-left w-full transition-shadow",
        fill && "flex h-full min-h-0 flex-col",
        pinned
          ? "border-2 border-brand-primary/40 ring-2 ring-brand-primary/15"
          : selected
            ? "border-brand-primary ring-2 ring-brand-primary/20"
            : "border-border",
        onClick && "hover:shadow-md cursor-pointer"
      )}
    >
      <div
        className={cn(
          "relative flex flex-col items-center justify-center px-6 py-10",
          fill
            ? "min-h-0 flex-1 py-8"
            : compact
              ? "min-h-[160px]"
              : "min-h-[200px] sm:min-h-[240px]",
          approved
            ? "bg-gradient-to-b from-brand-surface to-white"
            : "bg-gradient-to-b from-amber-50/80 to-white"
        )}
      >
        <div
          className={cn(
            "absolute inset-x-8 top-8 bottom-16 rounded-xl border-2 border-dashed",
            approved ? "border-brand-primary/25" : "border-amber-300/60"
          )}
        />
        <div className="relative z-10 flex flex-col items-center text-center max-w-xs">
          <div
            className={cn(
              "mb-4 flex size-16 items-center justify-center rounded-2xl",
              approved
                ? "bg-brand-primary/10 text-brand-primary"
                : "bg-amber-100 text-amber-800"
            )}
          >
            <Shirt className="size-8" strokeWidth={1.5} />
          </div>
          {pinned && (
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-brand-primary">
              This run
            </p>
          )}
          <p className="text-xs font-bold uppercase tracking-widest text-brand-muted">
            {imprint.label}
          </p>
          <p className="mt-2 text-base font-semibold text-brand-ink leading-snug">
            {decorationLabel(imprint.decoration)}
          </p>
          <p className="mt-1 text-sm text-brand-muted">{job.name}</p>
          {file.mockupLabel && (
            <p className="mt-2 text-sm text-brand-muted">{file.mockupLabel}</p>
          )}
        </div>
        {approved && (
          <span className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white">
            <CheckCircle2 className="size-3.5" />
            Approved
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-brand-ink">
            {file.name}
          </p>
          <p className="text-xs text-brand-muted">
            v{file.version} · {formatDateTime(file.uploadedAt)}
          </p>
        </div>
        <ArtworkStatusBadge status={file.status} />
      </div>
    </Wrapper>
  );
}

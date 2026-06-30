"use client";

import { CheckCircle2, Shirt } from "lucide-react";
import { decorationLabel, formatDateTime } from "@/lib/format";
import type { MockupEntry } from "@/lib/job-imprints";
import { dashboardElevatedShadow } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";
import { ArtworkStatusBadge } from "./artwork-status-badge";

export function MockupPreview({
  entry,
  pinned,
  selected,
  onClick,
  compact,
  fill,
  banner,
}: {
  entry: MockupEntry;
  pinned?: boolean;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
  /** Stretch to fill a panel (e.g. artwork detail modal) */
  fill?: boolean;
  /** Wide header-style preview for event modals */
  banner?: boolean;
}) {
  const { job, imprint } = entry;
  const file = imprint.artwork;
  const approved = file.status === "approved";
  const hasPreview = Boolean(file.previewUrl);
  const noMockupAttached = file.name === "No mockup attached";
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "overflow-hidden rounded-lg border bg-white text-left w-full transition-shadow",
        fill && "flex h-full min-h-0 flex-col",
        banner && "rounded-lg",
        pinned
          ? "border-2 border-[#2c6ecb]/40 ring-2 ring-[#2c6ecb]/15"
          : selected
            ? "border-[#2c6ecb] ring-2 ring-[#2c6ecb]/20"
            : "border-[#e3e3e3]",
        onClick && "hover:shadow-md cursor-pointer"
      )}
    >
      <div
        className={cn(
          "relative flex flex-col items-center justify-center",
          hasPreview
            ? banner
              ? "min-h-0 bg-[#f6f6f7] p-2"
              : compact
                ? "min-h-[160px] p-2"
                : "min-h-[200px] p-3 sm:min-h-[240px]"
            : cn(
                "px-6 py-10",
                fill
                  ? "min-h-0 flex-1 py-8"
                  : compact
                    ? "min-h-[160px]"
                    : "min-h-[200px] sm:min-h-[240px]",
                approved
                  ? "bg-gradient-to-b from-[#f4f7fd] to-white"
                  : "bg-gradient-to-b from-[#fff8eb] to-white"
              )
        )}
      >
        {hasPreview ? (
          <img
            src={file.previewUrl}
            alt={file.name}
            className={cn(
              "max-h-full w-full object-contain",
              banner ? "max-h-[160px]" : compact ? "max-h-[140px]" : "max-h-[220px]"
            )}
          />
        ) : (
          <>
            <div
              className={cn(
                "absolute inset-x-8 top-8 bottom-16 rounded-xl border-2 border-dashed",
                approved ? "border-[#2c6ecb]/25" : "border-[#f0d9a8]"
              )}
            />
            <div className="relative z-10 flex flex-col items-center text-center max-w-xs">
              <div
                className={cn(
                  "mb-4 flex size-16 items-center justify-center rounded-2xl",
                  approved
                    ? "bg-[#f4f7fd] text-[#2c6ecb]"
                    : "bg-[#fff8eb] text-[#8a6116]"
                )}
              >
                <Shirt className="size-8" strokeWidth={1.5} />
              </div>
              {pinned && (
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[#2c6ecb]">
                  This run
                </p>
              )}
              <p className="text-xs font-bold uppercase tracking-widest text-[#8a8a8a]">
                {imprint.label}
              </p>
              <p className="mt-2 text-base font-semibold text-[#303030] leading-snug">
                {noMockupAttached
                  ? "No mockup attached to this proof"
                  : decorationLabel(imprint.decoration)}
              </p>
              {!noMockupAttached ? (
                <p className="mt-1 text-sm text-[#8a8a8a]">{job.name}</p>
              ) : (
                <p className="mt-1 text-sm text-[#8a8a8a]">
                  {job.name} · Upload a mockup to send this proof
                </p>
              )}
              {file.mockupLabel && (
                <p className="mt-2 text-sm text-[#8a8a8a]">{file.mockupLabel}</p>
              )}
            </div>
          </>
        )}
        {approved && (
          <span
            className={cn(
              "absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg border border-[#bfe6cd] bg-[#e8f5ee] px-2.5 py-1 text-[12px] font-semibold leading-none text-[#0d5c2e]",
              dashboardElevatedShadow
            )}
          >
            <CheckCircle2 className="size-3.5" />
            Approved
          </span>
        )}
      </div>
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 border-t border-[#ebebeb] px-4 py-3 sm:px-5",
          banner && "bg-white px-3 py-2"
        )}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[#303030]">
            {noMockupAttached ? "No mockup attached" : file.name}
          </p>
          <p className="text-xs text-[#8a8a8a]">
            {imprint.label} · v{file.version} · {formatDateTime(file.uploadedAt)}
          </p>
        </div>
        <ArtworkStatusBadge status={file.status} />
      </div>
    </Wrapper>
  );
}

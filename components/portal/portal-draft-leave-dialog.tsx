"use client";

import { Loader2 } from "lucide-react";

export function PortalDraftLeaveDialog({
  open,
  accent,
  saving,
  error,
  onStay,
  onDiscard,
  onSave,
}: {
  open: boolean;
  accent: string;
  saving?: boolean;
  error?: string | null;
  onStay: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="absolute inset-0" onClick={onStay} aria-hidden />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="px-5 py-5">
          <h2 className="text-[17px] font-semibold text-[#303030]">
            Save this as a draft?
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#616161]">
            You have an unfinished order request. Save it as a draft so you can
            pick it back up later from your requests list.
          </p>
          {error ? (
            <p className="mt-3 rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 border-t border-[#ebebeb] px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onStay}
            disabled={saving}
            className="h-10 rounded-lg px-4 text-[14px] font-medium text-[#616161] hover:bg-[#f6f6f7] disabled:opacity-60"
          >
            Keep editing
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={saving}
            className="h-10 rounded-lg border border-[#ebebeb] bg-white px-4 text-[14px] font-medium text-[#8f1f1f] hover:bg-[#fff1f1] disabled:opacity-60"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-[14px] font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: accent }}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save draft
          </button>
        </div>
      </div>
    </div>
  );
}

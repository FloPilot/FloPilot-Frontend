"use client";

import { useEffect, useState } from "react";
import { addDays, format } from "date-fns";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { ArtworkStatusBadge } from "@/components/orders/artwork/artwork-status-badge";
import { ProofActionButton } from "@/components/orders/artwork/proof-action-button";
import { StaffArtistSelect } from "@/components/staff/staff-artist-select";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  canMarkArtComplete,
  canSubmitProofToArt,
  artworkStatusDetail,
  artDueDateKey,
  isArtworkReturnedToTeam,
} from "@/lib/artwork-status";
import {
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import type { ArtworkFile, Job, JobImprint, Order } from "@/types";
import { cn } from "@/lib/utils";

function defaultArtDueDate(order: Order, artwork: ArtworkFile): string {
  const existing = artDueDateKey(artwork.artDueAt);
  if (existing) return existing;
  const inHands = artDueDateKey(order.inHandsDate);
  if (inHands) return inHands;
  return format(addDays(new Date(), 3), "yyyy-MM-dd");
}

export function ProofArtWorkflowPanel({
  order,
  job,
  imprint,
  artworkStatus,
  readOnly = false,
}: {
  order: Order;
  job: Job;
  imprint: JobImprint;
  artworkStatus: ArtworkFile["status"];
  readOnly?: boolean;
}) {
  const { setArtworkStatus } = useSchedule();
  const [busy, setBusy] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftAssigneeId, setDraftAssigneeId] = useState<
    string | null | undefined
  >(undefined);
  const artwork = imprint.artwork;
  const [dueAt, setDueAt] = useState(() => defaultArtDueDate(order, artwork));
  const detail = artworkStatusDetail(artwork);
  const canSubmit = canSubmitProofToArt(artworkStatus);
  const canComplete = canMarkArtComplete(artworkStatus);
  const artLocked = isArtworkReturnedToTeam(artworkStatus);
  const assigneeId =
    draftAssigneeId !== undefined
      ? draftAssigneeId
      : (artwork.artAssigneeId ?? null);

  useEffect(() => {
    setDraftAssigneeId(undefined);
  }, [artwork.artAssigneeId, artwork.artAssigneeName]);

  useEffect(() => {
    setDueAt(defaultArtDueDate(order, artwork));
  }, [artwork.artDueAt, order.inHandsDate, order.id, imprint.id]);

  const runStatus = async (
    status: ArtworkFile["status"],
    options?: { assigneeId?: string | null; dueAt?: string | null }
  ) => {
    if (busy || readOnly) return;
    setBusy(true);
    setError(null);
    try {
      await setArtworkStatus(order.id, job.id, imprint.id, status, options);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update artwork status."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleAssigneeChange = async (artistId: string | null) => {
    if (busy || readOnly) return;
    const current = artwork.artAssigneeId ?? null;
    if (artistId === current && draftAssigneeId === undefined) return;
    setDraftAssigneeId(artistId);
    setBusy(true);
    setAssigning(true);
    setError(null);
    try {
      await setArtworkStatus(order.id, job.id, imprint.id, artworkStatus, {
        assigneeId: artistId,
        clearAssignee: !artistId,
      });
    } catch (err) {
      setDraftAssigneeId(undefined);
      setError(
        err instanceof Error
          ? err.message
          : "Could not assign this artist. Try again."
      );
    } finally {
      setAssigning(false);
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (!dueAt.trim()) {
      setError("Pick a due date before submitting to artwork.");
      return;
    }
    await runStatus("with_art", {
      assigneeId: assigneeId ?? undefined,
      dueAt: dueAt.trim(),
    });
  };

  return (
    <div
      className={cn(
        dashboardInsetSurfaceClass,
        "space-y-3 px-3 py-3",
        artLocked &&
          "border-[#86d4a8]/50 bg-[#f3faf6] shadow-[inset_0_0_0_1px_rgba(134,212,168,0.35)]"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className={cn(
            "text-[11px] font-semibold uppercase tracking-wide",
            artLocked ? "text-[#0d5c2e]" : "text-[#8a8a8a]"
          )}
        >
          Art department
        </p>
        {artLocked ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-[#e8f5ee] px-2 py-0.5 text-[11px] font-semibold text-[#0d5c2e]">
            <CheckCircle2 className="size-3" />
            Complete
          </span>
        ) : (
          <ArtworkStatusBadge status={artworkStatus} />
        )}
      </div>

      {artLocked ? (
        <div className="space-y-1.5">
          <p className="text-[13px] font-semibold text-[#0d5c2e]">
            Artwork finished and sent back to the team
          </p>
          <p className="text-[12px] leading-relaxed text-[#1f6b3a]/90">
            {artwork.artAssigneeName?.trim()
              ? `${artwork.artAssigneeName.trim()} completed this location. Artist assignment is locked.`
              : "This location is complete and back with the team. Artist assignment is locked."}
          </p>
          {artwork.artAssigneeName?.trim() ? (
            <p className="text-[12px] font-medium text-[#0d5c2e]">
              Artist · {artwork.artAssigneeName.trim()}
            </p>
          ) : null}
        </div>
      ) : (
        <p className={dashboardTaskDetailClass}>
          {artworkStatus === "with_art"
            ? "Submitted to artwork. Assign an artist if needed, then mark complete when tech packs and mockups are ready to send back to the team."
            : "Upload proofs here, assign an artist and due date, then submit to the art department."}
        </p>
      )}

      {!artLocked && detail ? (
        <p className="text-[12px] font-medium text-[#303030]">{detail}</p>
      ) : null}

      {!readOnly && !artLocked ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-[11px] font-medium text-[#8a8a8a]">
              Assign artist
            </Label>
            {assigning ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#8a8a8a]">
                <Loader2 className="size-3 animate-spin" aria-hidden />
                Saving…
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <StaffArtistSelect
                id={`proof-artist-${order.id}-${imprint.id}`}
                value={assigneeId}
                onChange={(id) => void handleAssigneeChange(id)}
                disabled={busy}
                placeholder="Unassigned"
                triggerClassName={cn("h-9", assigning && "opacity-80")}
              />
            </div>
            {assigning ? (
              <Loader2
                className="size-4 shrink-0 animate-spin text-[#2c6ecb]"
                aria-label="Saving artist assignment"
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {!readOnly && !artLocked && (canSubmit || artworkStatus === "with_art") ? (
        <div className="space-y-1.5">
          <Label
            htmlFor={`proof-due-${order.id}-${imprint.id}`}
            className="text-[11px] font-medium text-[#8a8a8a]"
          >
            Art due date
          </Label>
          <Input
            id={`proof-due-${order.id}-${imprint.id}`}
            type="date"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            disabled={busy}
            className={cn(dashboardControlClass, "h-9")}
          />
        </div>
      ) : null}

      {error ? (
        <p className="rounded-md border border-[#e7b4b4] bg-[#fdf2f2] px-2.5 py-1.5 text-[12px] font-medium text-[#b42318]">
          {error}
        </p>
      ) : null}

      {!readOnly && !artLocked ? (
        <div className="flex flex-wrap gap-2">
          {canSubmit ? (
            <ProofActionButton
              variant="primary"
              className="h-8 flex-1 text-[12px]"
              disabled={busy || !dueAt.trim()}
              successLabel="Submitted"
              onClick={() => void handleSubmit()}
            >
              <span className="inline-flex items-center gap-1.5">
                <Send className="size-3.5" />
                Submit to artwork
              </span>
            </ProofActionButton>
          ) : null}

          {canComplete ? (
            <ProofActionButton
              variant="success"
              className="h-8 flex-1 text-[12px]"
              disabled={busy}
              successLabel="Sent to team"
              loadingLabel="Sending back to team…"
              onClick={() => void runStatus("art_ready")}
            >
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5" />
                Complete & send back to team
              </span>
            </ProofActionButton>
          ) : null}

          {artworkStatus === "with_art" && dueAt.trim() ? (
            <ProofActionButton
              variant="secondary"
              className="h-8 flex-1 text-[12px]"
              disabled={busy}
              successLabel="Updated"
              onClick={() =>
                void runStatus("with_art", { dueAt: dueAt.trim() })
              }
            >
              Update due date
            </ProofActionButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

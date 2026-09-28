"use client";

import { useState } from "react";
import { CheckCircle2, Palette, Send } from "lucide-react";
import { ArtworkStatusBadge } from "@/components/orders/artwork/artwork-status-badge";
import { ProofActionButton } from "@/components/orders/artwork/proof-action-button";
import { StaffArtistSelect } from "@/components/staff/staff-artist-select";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Label } from "@/components/ui/label";
import {
  canMarkArtComplete,
  canSubmitProofToArt,
  artworkStatusDetail,
} from "@/lib/artwork-status";
import {
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import type { ArtworkFile, Job, JobImprint, Order } from "@/types";
import { cn } from "@/lib/utils";

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
  const artwork = imprint.artwork;
  const detail = artworkStatusDetail(artwork);
  const canSubmit = canSubmitProofToArt(artworkStatus);
  const canComplete = canMarkArtComplete(artworkStatus);

  const runStatus = async (
    status: ArtworkFile["status"],
    options?: { assigneeId?: string | null }
  ) => {
    if (busy || readOnly) return;
    setBusy(true);
    try {
      await setArtworkStatus(order.id, job.id, imprint.id, status, options);
    } finally {
      setBusy(false);
    }
  };

  const handleAssigneeChange = async (artistId: string | null) => {
    if (busy || readOnly) return;
    const current = artwork.artAssigneeId ?? null;
    if (artistId === current) return;
    setBusy(true);
    try {
      await setArtworkStatus(order.id, job.id, imprint.id, artworkStatus, {
        assigneeId: artistId,
        clearAssignee: !artistId,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn(dashboardInsetSurfaceClass, "space-y-3 px-3 py-3")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
          Art department
        </p>
        <ArtworkStatusBadge status={artworkStatus} />
      </div>

      <p className={dashboardTaskDetailClass}>
        {artworkStatus === "art_ready"
          ? "Artwork is complete. Send proofs and the estimate to the client from the Estimate tab when ready."
          : artworkStatus === "with_art"
            ? "Submitted to artwork. Assign an artist if needed, then mark complete when tech packs and mockups are ready."
            : "Upload proofs here, assign an artist, then submit to the art department."}
      </p>

      {detail ? (
        <p className="text-[12px] font-medium text-[#303030]">{detail}</p>
      ) : null}

      {!readOnly ? (
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-[#8a8a8a]">
            Assign artist
          </Label>
          <StaffArtistSelect
            id={`proof-artist-${order.id}-${imprint.id}`}
            value={artwork.artAssigneeId}
            onChange={(id) => void handleAssigneeChange(id)}
            disabled={busy}
            placeholder="Unassigned"
            triggerClassName="h-9"
          />
        </div>
      ) : artwork.artAssigneeName ? (
        <p className="text-[12px] text-[#616161]">
          Artist · {artwork.artAssigneeName}
        </p>
      ) : null}

      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          {canSubmit ? (
            <ProofActionButton
              variant="primary"
              className="h-8 flex-1 text-[12px]"
              disabled={busy}
              successLabel="Submitted"
              onClick={() =>
                void runStatus("with_art", {
                  assigneeId: artwork.artAssigneeId ?? undefined,
                })
              }
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
              successLabel="Complete"
              onClick={() => void runStatus("art_ready")}
            >
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5" />
                Artwork complete
              </span>
            </ProofActionButton>
          ) : null}

          {artworkStatus === "art_ready" ? (
            <div className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-[#e8f1ff] px-3 text-[12px] font-medium text-[#1f4b99]">
              <Palette className="size-3.5" />
              Ready to send to client
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

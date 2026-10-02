"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, format } from "date-fns";
import {
  CheckCircle2,
  Eye,
  FileUp,
  ImageIcon,
  Loader2,
  Send,
} from "lucide-react";
import { ArtworkStatusBadge } from "@/components/orders/artwork/artwork-status-badge";
import { ProofActionButton } from "@/components/orders/artwork/proof-action-button";
import { DecorationTypePill } from "@/components/orders/decoration-type-pill";
import { SendProofsEstimateDialog } from "@/components/orders/send-proofs-estimate-dialog";
import { FilePreviewDialog } from "@/components/files/file-preview-dialog";
import { StaffArtistSelect } from "@/components/staff/staff-artist-select";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useNameBeforeUpload } from "@/hooks/use-name-before-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readUploadContent } from "@/lib/artwork-preview";
import {
  artDueDateKey,
  canMarkArtComplete,
  canSubmitProofToArt,
  formatArtDueLabel,
  isArtworkReturnedToTeam,
  rollupArtworkStatus,
  sharedArtAssigneeId,
} from "@/lib/artwork-status";
import { canCompleteArtworkProof } from "@/lib/artwork-proof-readiness";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import {
  normalizeDesignCode,
  suggestDesignCode,
} from "@/lib/design-code";
import { filePreviewSource } from "@/lib/file-preview";
import { imprintDisplayName } from "@/lib/imprint-display";
import {
  getOrderTechPackFiles,
  ORDER_FILE_KIND_LABELS,
} from "@/lib/order-files";
import { formatDateTime } from "@/lib/format";
import { getProofSlides } from "@/lib/proof-slides";
import type { ArtworkFile, Job, JobImprint, Order } from "@/types";
import { cn } from "@/lib/utils";

type ProofStep = { job: Job; imprint: JobImprint };

function defaultOrderArtDueDate(order: Order, steps: ProofStep[]): string {
  for (const step of steps) {
    const existing = artDueDateKey(step.imprint.artwork.artDueAt);
    if (existing) return existing;
  }
  const inHands = artDueDateKey(order.inHandsDate);
  if (inHands) return inHands;
  return format(addDays(new Date(), 3), "yyyy-MM-dd");
}

export function ProofOrderSummaryPanel({
  order,
  proofSteps,
  readOnly = false,
  onSelectProof,
  mode = "order",
}: {
  order: Order;
  proofSteps: ProofStep[];
  readOnly?: boolean;
  onSelectProof: (jobId: string, imprintId: string) => void;
  /** Order Proofs tab vs art department hand-back summary. */
  mode?: "order" | "art_department";
}) {
  const { setArtworkStatus, uploadOrderFile, updateOrderDesignCode } =
    useSchedule();
  const { promptRename, nameFilesDialog } = useNameBeforeUpload();
  const [busy, setBusy] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendMessage, setSendMessage] = useState<string | null>(null);
  const [uploadingTechPack, setUploadingTechPack] = useState(false);
  const [savingDesignCode, setSavingDesignCode] = useState(false);
  const [designCodeDraft, setDesignCodeDraft] = useState(
    () => order.designCode?.trim() || ""
  );
  const [preview, setPreview] = useState<{
    url: string;
    name: string;
    subtitle?: string;
  } | null>(null);
  const techPackInputRef = useRef<HTMLInputElement>(null);
  const [draftAssigneeId, setDraftAssigneeId] = useState<
    string | null | undefined
  >(undefined);
  const [dueAt, setDueAt] = useState(() =>
    defaultOrderArtDueDate(order, proofSteps)
  );
  const isArtDept = mode === "art_department";

  const statuses = useMemo(
    () => proofSteps.map((step) => step.imprint.artwork.status),
    [proofSteps]
  );
  const artworks = useMemo(
    () => proofSteps.map((step) => step.imprint.artwork),
    [proofSteps]
  );
  const rollup = rollupArtworkStatus(statuses);
  const serverAssigneeId = sharedArtAssigneeId(artworks);
  const assigneeId =
    draftAssigneeId !== undefined ? draftAssigneeId : serverAssigneeId;

  const submittable = proofSteps.filter((step) =>
    canSubmitProofToArt(step.imprint.artwork.status)
  );
  const completable = proofSteps.filter(
    (step) =>
      canMarkArtComplete(step.imprint.artwork.status) &&
      canCompleteArtworkProof(step.imprint).ok
  );
  const blockedComplete = proofSteps.filter(
    (step) =>
      canMarkArtComplete(step.imprint.artwork.status) &&
      !canCompleteArtworkProof(step.imprint).ok
  );
  const techPackFiles = useMemo(
    () => getOrderTechPackFiles(order),
    [order]
  );
  const sharedArtistName = useMemo(() => {
    if (!serverAssigneeId) return null;
    const name = artworks
      .find((artwork) => artwork.artAssigneeId === serverAssigneeId)
      ?.artAssigneeName?.trim();
    return name || null;
  }, [artworks, serverAssigneeId]);
  const artReturnedToTeam =
    proofSteps.length > 0 &&
    proofSteps.every((step) =>
      isArtworkReturnedToTeam(step.imprint.artwork.status)
    );
  const artLocked = artReturnedToTeam;
  const completedByName =
    sharedArtistName ||
    artworks.find((artwork) => artwork.artAssigneeName?.trim())
      ?.artAssigneeName?.trim() ||
    null;

  useEffect(() => {
    setDraftAssigneeId(undefined);
  }, [serverAssigneeId]);

  useEffect(() => {
    setDueAt(defaultOrderArtDueDate(order, proofSteps));
  }, [order.id, order.inHandsDate, proofSteps]);

  useEffect(() => {
    setDesignCodeDraft(order.designCode?.trim() || "");
  }, [order.id, order.designCode]);

  const handleSaveDesignCode = async () => {
    if (busy || readOnly || savingDesignCode) return;
    const next = normalizeDesignCode(designCodeDraft);
    const current = normalizeDesignCode(order.designCode);
    if ((next || "") === (current || "")) return;
    setSavingDesignCode(true);
    setError(null);
    setSendMessage(null);
    try {
      await updateOrderDesignCode(order.id, next || "");
      setSendMessage(
        next ? `Design code set to ${next}.` : "Design code cleared."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save the design code."
      );
    } finally {
      setSavingDesignCode(false);
    }
  };

  const runForSteps = async (
    steps: ProofStep[],
    status: ArtworkFile["status"],
    options?: {
      assigneeId?: string | null;
      clearAssignee?: boolean;
      dueAt?: string | null;
    }
  ) => {
    for (const step of steps) {
      await setArtworkStatus(
        order.id,
        step.job.id,
        step.imprint.id,
        status,
        options
      );
    }
  };

  const handleAssigneeChange = async (artistId: string | null) => {
    if (busy || readOnly || proofSteps.length === 0) return;
    if (artistId === serverAssigneeId && draftAssigneeId === undefined) return;
    setDraftAssigneeId(artistId);
    setBusy(true);
    setAssigning(true);
    setError(null);
    setSendMessage(null);
    try {
      for (const step of proofSteps) {
        await setArtworkStatus(
          order.id,
          step.job.id,
          step.imprint.id,
          step.imprint.artwork.status,
          {
            assigneeId: artistId,
            clearAssignee: !artistId,
          }
        );
      }
    } catch (err) {
      setDraftAssigneeId(undefined);
      setError(
        err instanceof Error
          ? err.message
          : "Could not assign this artist to all proofs."
      );
    } finally {
      setAssigning(false);
      setBusy(false);
    }
  };

  const handleSubmitAll = async () => {
    if (busy || readOnly || submittable.length === 0) return;
    if (!dueAt.trim()) {
      setError("Pick a due date before submitting to artwork.");
      return;
    }
    setBusy(true);
    setError(null);
    setSendMessage(null);
    try {
      await runForSteps(submittable, "with_art", {
        assigneeId: assigneeId ?? undefined,
        dueAt: dueAt.trim(),
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not submit proofs to artwork."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteAll = async () => {
    if (busy || readOnly || completable.length === 0) return;
    if (blockedComplete.length > 0) {
      setError(
        `${blockedComplete.length} proof${
          blockedComplete.length === 1 ? "" : "s"
        } still need images and ink colors before they can be sent back to the team.`
      );
      return;
    }
    setBusy(true);
    setError(null);
    setSendMessage(null);
    try {
      await runForSteps(completable, "art_ready");
      setSendMessage(
        isArtDept
          ? `Sent ${completable.length} proof${
              completable.length === 1 ? "" : "s"
            } back to the team for review.`
          : null
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not mark proofs artwork complete."
      );
    } finally {
      setBusy(false);
    }
  };

  const dueTargets = useMemo(
    () =>
      proofSteps.filter(
        (step) =>
          step.imprint.artwork.status === "pending" ||
          step.imprint.artwork.status === "with_art" ||
          step.imprint.artwork.status === "revision_requested" ||
          step.imprint.artwork.status === "art_ready"
      ),
    [proofSteps]
  );

  const handleUpdateDueDates = async () => {
    if (busy || readOnly || dueTargets.length === 0) return;
    if (!dueAt.trim()) {
      setError("Pick a due date first.");
      return;
    }
    setBusy(true);
    setError(null);
    setSendMessage(null);
    try {
      for (const step of dueTargets) {
        await setArtworkStatus(
          order.id,
          step.job.id,
          step.imprint.id,
          step.imprint.artwork.status,
          { dueAt: dueAt.trim() }
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update art due dates."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSendAll = () => {
    if (busy || readOnly) return;
    setError(null);
    setSendOpen(true);
  };

  const handleTechPackUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length || readOnly || uploadingTechPack) return;

    const named = await promptRename(files, {
      title:
        files.length > 1
          ? `Name ${files.length} tech packs`
          : "Name this tech pack",
      description:
        "Choose a clear name before uploading the summary proof / tech pack.",
    });
    if (!named?.length) return;

    setUploadingTechPack(true);
    setError(null);
    setSendMessage(null);
    try {
      for (const { file, name } of named) {
        const { base64, contentType, error: readError } =
          await readUploadContent(file);
        if (readError) throw new Error(readError);
        await uploadOrderFile(order.id, {
          name,
          kind: "tech_pack",
          uploadedBy: "Shop",
          contentBase64: base64,
          contentType,
          notes: "Order summary proof / tech pack",
        });
      }
      setSendMessage(
        named.length === 1
          ? "Summary tech pack added to this order."
          : `${named.length} tech pack files added to this order.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not upload the tech pack."
      );
    } finally {
      setUploadingTechPack(false);
    }
  };

  return (
    <div
      className={cn(
        isArtDept ? "h-full min-h-0 overflow-y-auto" : dashboardCardClass,
        "space-y-5 p-4 sm:p-5"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className={dashboardTaskTitleClass}>
            {isArtDept ? "Send back to the team" : "Order artwork"}
          </h3>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            {isArtDept
              ? "Finish every location, then hand the whole order back to the internal team in one pass — same idea as submitting to artwork."
              : "Review every proof, assign one artist, and send the whole order to art in one pass."}
          </p>
        </div>
        {rollup ? <ArtworkStatusBadge status={rollup} /> : null}
      </div>

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
            {isArtDept ? "Art hand-off" : "Art department"}
          </p>
          {artLocked ? (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#e8f5ee] px-2 py-0.5 text-[11px] font-semibold text-[#0d5c2e]">
              <CheckCircle2 className="size-3" />
              Complete
            </span>
          ) : sharedArtistName ? (
            <p className="text-[12px] font-medium text-[#303030]">
              Artist · {sharedArtistName}
            </p>
          ) : (
            <p className="text-[12px] text-[#8a8a8a]">
              {proofSteps.length} proof{proofSteps.length === 1 ? "" : "s"}
            </p>
          )}
        </div>

        {artLocked ? (
          <div className="space-y-2">
            <p className="text-[13px] font-semibold text-[#0d5c2e]">
              Artwork finished and sent back to the team
            </p>
            <p className="text-[12px] leading-relaxed text-[#1f6b3a]/90">
              {completedByName
                ? `${completedByName} completed these proofs. Assign and due date are locked — send proofs & estimate when you’re ready.`
                : "These proofs are complete and back with the team. Assign and due date are locked — send proofs & estimate when you’re ready."}
            </p>
            {completedByName ? (
              <p className="text-[12px] font-medium text-[#0d5c2e]">
                Artist · {completedByName}
              </p>
            ) : null}
          </div>
        ) : null}

        {!readOnly && !artLocked ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-[11px] font-medium text-[#8a8a8a]">
                Assign artist to all proofs
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
                  id={`proof-artist-order-${order.id}${isArtDept ? "-art" : ""}`}
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

        {!readOnly && !isArtDept && !artLocked ? (
          <div className="space-y-1.5">
            <Label
              htmlFor={`proof-due-order-${order.id}`}
              className="text-[11px] font-medium text-[#8a8a8a]"
            >
              Art due date
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id={`proof-due-order-${order.id}`}
                type="date"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                disabled={busy}
                className={cn(dashboardControlClass, "h-9 min-w-0 flex-1")}
              />
              {dueTargets.length > 0 && submittable.length === 0 ? (
                <ProofActionButton
                  variant="secondary"
                  className="h-9 shrink-0 text-[12px]"
                  disabled={busy || !dueAt.trim()}
                  successLabel="Saved"
                  onClick={() => void handleUpdateDueDates()}
                >
                  Save due date
                </ProofActionButton>
              ) : null}
            </div>
            <p className="text-[11px] text-[#8a8a8a]">
              Applies to every proof on this order when you submit or save.
            </p>
          </div>
        ) : null}

        {!readOnly ? (
          <div className="flex flex-wrap gap-2">
            {!isArtDept && !artLocked && submittable.length > 0 ? (
              <ProofActionButton
                variant="primary"
                className="h-8 flex-1 text-[12px]"
                disabled={busy || !dueAt.trim()}
                successLabel="Submitted"
                onClick={() => void handleSubmitAll()}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Send className="size-3.5" />
                  Submit all to artwork
                  {submittable.length > 0
                    ? ` (${submittable.length})`
                    : ""}
                </span>
              </ProofActionButton>
            ) : null}
            {!artLocked && completable.length > 0 ? (
              <ProofActionButton
                variant={isArtDept ? "primary" : "success"}
                className="h-8 flex-1 text-[12px]"
                disabled={busy}
                successLabel="Sent to team"
                loadingLabel="Sending back to team…"
                onClick={() => void handleCompleteAll()}
              >
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5" />
                  {isArtDept
                    ? "Complete & send all back to team"
                    : "Mark all complete & send to team"}
                  {completable.length > 0
                    ? ` (${completable.length})`
                    : ""}
                </span>
              </ProofActionButton>
            ) : null}
            {!isArtDept ? (
              <button
                type="button"
                className={cn(
                  artLocked
                    ? "border-brand-primary bg-brand-primary text-white hover:bg-brand-primary/90"
                    : "border-[#e3e3e3] bg-white text-[#303030] hover:bg-[#fafafa]",
                  "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 text-[12px] font-medium transition-colors disabled:opacity-50"
                )}
                disabled={busy}
                onClick={handleSendAll}
              >
                <Send className="size-3.5" />
                Send proofs & estimate
              </button>
            ) : null}
            {isArtDept && artLocked ? (
              <div className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-[#e8f5ee] px-3 text-[12px] font-semibold text-[#0d5c2e]">
                <CheckCircle2 className="size-3.5" />
                Sent back to the team
              </div>
            ) : null}
            {isArtDept &&
            !artLocked &&
            completable.length === 0 &&
            blockedComplete.length === 0 ? (
              <div className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-[#e8f1ff] px-3 text-[12px] font-medium text-[#1f4b99]">
                <CheckCircle2 className="size-3.5" />
                All proofs are with the team
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className="rounded-md border border-[#e7b4b4] bg-[#fdf2f2] px-2.5 py-1.5 text-[12px] font-medium text-[#b42318]">
            {error}
          </p>
        ) : null}
        {sendMessage ? (
          <p className="rounded-md border border-[#86d4a8] bg-[#e8f5ee] px-2.5 py-1.5 text-[12px] font-medium text-[#0d5c2e]">
            {sendMessage}
          </p>
        ) : null}
        {!artLocked && blockedComplete.length > 0 ? (
          <p className="rounded-md border border-[#f0e0b2] bg-[#fffbeb] px-2.5 py-1.5 text-[12px] text-[#7a5b00]">
            {blockedComplete.length} proof
            {blockedComplete.length === 1 ? "" : "s"} still need proof images
            and ink colors before they can be sent back to the team. Open each
            location to finish them.
          </p>
        ) : null}
        {busy && isArtDept ? (
          <p className="inline-flex items-center gap-2 rounded-md border border-[#c4d7f2] bg-[#f4f7fd] px-2.5 py-1.5 text-[12px] font-medium text-[#1f4b99]">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Sending proofs back to the internal team…
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Design code
            </p>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              Shop-facing job code for this artwork package — searchable in
              Designs.
            </p>
          </div>
        </div>
        {readOnly ? (
          <div
            className={cn(
              dashboardInsetSurfaceClass,
              "px-3 py-2.5 text-[13px] font-medium text-[#303030]"
            )}
          >
            {order.designCode?.trim() || (
              <span className="font-normal text-[#8a8a8a]">No design code</span>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={designCodeDraft}
              onChange={(event) => setDesignCodeDraft(event.target.value)}
              onBlur={() => void handleSaveDesignCode()}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSaveDesignCode();
                }
              }}
              placeholder={suggestDesignCode(order)}
              disabled={busy || savingDesignCode}
              className={cn(
                dashboardControlClass,
                "h-9 min-w-0 flex-1 font-mono text-[13px] uppercase tracking-wide"
              )}
              aria-label="Design code"
            />
            {!order.designCode?.trim() ? (
              <Button
                type="button"
                className={cn(dashboardControlClass, "h-9 shrink-0 text-[12px]")}
                disabled={busy || savingDesignCode}
                onClick={() => {
                  setDesignCodeDraft(suggestDesignCode(order));
                  void (async () => {
                    setSavingDesignCode(true);
                    setError(null);
                    try {
                      const suggested = suggestDesignCode(order);
                      await updateOrderDesignCode(order.id, suggested);
                      setDesignCodeDraft(suggested);
                      setSendMessage(`Design code set to ${suggested}.`);
                    } catch (err) {
                      setError(
                        err instanceof Error
                          ? err.message
                          : "Could not save the design code."
                      );
                    } finally {
                      setSavingDesignCode(false);
                    }
                  })();
                }}
              >
                Use {suggestDesignCode(order)}
              </Button>
            ) : null}
            {savingDesignCode ? (
              <Loader2
                className="size-4 shrink-0 animate-spin text-[#2c6ecb]"
                aria-label="Saving design code"
              />
            ) : null}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Tech pack / summary proof
            </p>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              Optional order-level pack that covers every location — upload it
              here from the summary.
            </p>
          </div>
          {!readOnly ? (
            <>
              <input
                ref={techPackInputRef}
                type="file"
                className="hidden"
                multiple
                accept="image/*,.pdf,.ai,.eps,.psd,.zip"
                onChange={(event) => void handleTechPackUpload(event)}
              />
              <Button
                type="button"
                className={cn(dashboardControlClass, "h-8 shrink-0 text-[12px]")}
                disabled={busy || uploadingTechPack}
                onClick={() => techPackInputRef.current?.click()}
              >
                {uploadingTechPack ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <FileUp className="size-3.5" />
                )}
                {uploadingTechPack ? "Uploading…" : "Upload tech pack"}
              </Button>
            </>
          ) : null}
        </div>
        {techPackFiles.length > 0 ? (
          <ul className="space-y-2">
            {techPackFiles.map((file) => (
              <li
                key={file.id}
                className={cn(
                  dashboardInsetSurfaceClass,
                  "flex items-center justify-between gap-3 px-3 py-2.5"
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[#303030]">
                    {file.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#8a8a8a]">
                    {ORDER_FILE_KIND_LABELS.tech_pack}
                    {" · "}
                    {formatDateTime(file.uploadedAt)}
                  </p>
                </div>
                {filePreviewSource(file) ? (
                  <button
                    type="button"
                    onClick={() =>
                      setPreview({
                        url: filePreviewSource(file)!,
                        name: file.name,
                        subtitle: ORDER_FILE_KIND_LABELS.tech_pack,
                      })
                    }
                    className={cn(
                      dashboardControlClass,
                      "inline-flex h-8 shrink-0 items-center gap-1.5 px-2.5 text-[12px]"
                    )}
                  >
                    <Eye className="size-3.5" />
                    Preview
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p
            className={cn(
              dashboardInsetSurfaceClass,
              "px-3 py-3 text-[12px] text-[#8a8a8a]"
            )}
          >
            No order tech pack yet.
            {!readOnly
              ? " Upload a PDF or image that summarizes the whole order."
              : ""}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
          All proofs
        </p>
        <ul className="space-y-2">
          {proofSteps.map(({ job, imprint }) => {
            const slides = getProofSlides(imprint.artwork);
            const thumb = slides[0]?.previewUrl || imprint.artwork.previewUrl;
            const artist = imprint.artwork.artAssigneeName?.trim();
            const ready = canCompleteArtworkProof(imprint);

            return (
              <li key={`${job.id}-${imprint.id}`}>
                <button
                  type="button"
                  onClick={() => onSelectProof(job.id, imprint.id)}
                  className={cn(
                    dashboardInsetSurfaceClass,
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#f4f7fd]"
                  )}
                >
                  <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#ebebeb] bg-[#fafafa]">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="size-4 text-[#c9c9c9]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[13px] font-semibold text-[#303030]">
                        {imprintDisplayName(imprint)}
                      </p>
                      <ArtworkStatusBadge
                        status={imprint.artwork.status}
                        className="scale-90"
                      />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <DecorationTypePill decoration={imprint.decoration} />
                      {artist ? (
                        <span className="text-[11px] text-[#8a8a8a]">
                          Artist · {artist}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#8a8a8a]">
                          Unassigned
                        </span>
                      )}
                      {imprint.artwork.artDueAt ? (
                        <span className="text-[11px] text-[#8a8a8a]">
                          Due {formatArtDueLabel(imprint.artwork.artDueAt)}
                        </span>
                      ) : null}
                      {!ready.ok ? (
                        <span className="text-[11px] font-medium text-[#9a6700]">
                          Needs{" "}
                          {[
                            ready.missing.some((item) =>
                              item.toLowerCase().includes("image")
                            )
                              ? "proof images"
                              : null,
                            ready.missing.some((item) =>
                              item.toLowerCase().includes("color")
                            )
                              ? "colors"
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <SendProofsEstimateDialog
        order={order}
        open={sendOpen}
        onOpenChange={setSendOpen}
        onSent={(message) => {
          setSendMessage(message);
          setError(null);
        }}
      />

      <FilePreviewDialog
        open={Boolean(preview)}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        title={preview?.name || "File"}
        subtitle={preview?.subtitle}
        url={preview?.url ?? null}
        filename={preview?.name}
      />
      {nameFilesDialog}
    </div>
  );
}

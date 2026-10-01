"use client";

import { useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  FileUp,
  Loader2,
  Palette,
  RotateCcw,
  Send,
  Upload,
} from "lucide-react";
import { ProofSlidesEditor } from "@/components/orders/artwork/proof-slides-gallery";
import { ImprintInkColorsEditor } from "@/components/orders/imprint-ink-colors-editor";
import { ProofNotesThread } from "@/components/orders/proof-notes-thread";
import { StaffArtistSelect } from "@/components/staff/staff-artist-select";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useNameBeforeUpload } from "@/hooks/use-name-before-upload";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  LabeledSelectValue,
  SelectTrigger,
} from "@/components/ui/select";
import { readUploadContent } from "@/lib/artwork-preview";
import { canCompleteArtworkProof } from "@/lib/artwork-proof-readiness";
import {
  dashboardControlClass,
  dashboardPrimaryButtonClass,
} from "@/lib/dashboard-styles";
import { decorationLabel, formatDateTime } from "@/lib/format";
import {
  getArtworkEntryContext,
  getRelatedArtworkFiles,
  type ArtworkQueueEntry,
} from "@/lib/artwork-queue";
import { resolveArtworkRevisionNotes } from "@/lib/artwork-routes";
import { EMPTY_INK_COLORS } from "@/lib/imprint-design";
import { resolveArtworkDisplayName } from "@/lib/proof-slides";
import {
  getOrderTechPackFiles,
  ORDER_FILE_KIND_LABELS,
} from "@/lib/order-files";
import { ARTWORK_STATUS_LABELS } from "@/lib/artwork-status";
import type { ArtworkFile, ImprintInkColor } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: ArtworkFile["status"]; label: string }[] =
  (
    Object.entries(ARTWORK_STATUS_LABELS) as [
      ArtworkFile["status"],
      string,
    ][]
  ).map(([value, label]) => ({ value, label }));

export function ArtworkProofDetail({
  entry,
  readOnly = false,
}: {
  entry: ArtworkQueueEntry;
  readOnly?: boolean;
}) {
  const {
    orders,
    setArtworkStatus,
    addArtworkProofNote,
    updateImprintInkColors,
    uploadOrderFile,
  } = useSchedule();
  const { promptRename, nameFilesDialog } = useNameBeforeUpload();

  const liveEntry = useMemo(() => {
    const { imprint } = getArtworkEntryContext(orders, entry);
    if (!imprint) return entry;
    return { ...entry, artwork: imprint.artwork };
  }, [orders, entry]);

  const { order, job, imprint } = getArtworkEntryContext(orders, liveEntry);
  const proofNotes = useMemo(
    () => resolveArtworkRevisionNotes(order, liveEntry),
    [order, liveEntry]
  );

  const [completingArt, setCompletingArt] = useState(false);
  const [proofFeedback, setProofFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionDraft, setRevisionDraft] = useState("");
  const [uploadingLocationFile, setUploadingLocationFile] = useState(false);
  const [uploadingTechPack, setUploadingTechPack] = useState(false);
  const locationFileInputRef = useRef<HTMLInputElement>(null);
  const techPackInputRef = useRef<HTMLInputElement>(null);

  const relatedFiles = getRelatedArtworkFiles(order, liveEntry);
  const additionalFiles = relatedFiles.filter(
    (file) => file.id !== liveEntry.artwork.id
  );
  const techPackFiles = useMemo(
    () => (order ? getOrderTechPackFiles(order) : []),
    [order]
  );
  const notes = imprint?.notes;
  const hasSpecs =
    notes?.dimensions ||
    notes?.placement ||
    notes?.colors ||
    notes?.instructions;
  const locked = readOnly || liveEntry.archived;
  const isFinishing = imprint?.decoration === "finishing";
  const readiness = canCompleteArtworkProof(imprint);
  const colorsTitle =
    imprint?.decoration === "dtf"
      ? "Transfer specs"
      : imprint?.decoration === "screen_print"
        ? "Ink colors & Pantones"
        : "Colors & Pantones";

  const handleStatusChange = (
    status: ArtworkFile["status"],
    options?: {
      message?: string;
      messageRole?: "staff" | "customer";
      assigneeId?: string | null;
      clearAssignee?: boolean;
    }
  ) => {
    setArtworkStatus(
      liveEntry.orderId,
      liveEntry.jobId,
      liveEntry.imprintId,
      status,
      status === "revision_requested" && options?.message
        ? {
            message: options.message,
            messageRole: options.messageRole ?? "staff",
            notifyOrderMessage: false,
            assigneeId: options.assigneeId,
            clearAssignee: options.clearAssignee,
          }
        : options?.assigneeId !== undefined || options?.clearAssignee
          ? {
              assigneeId: options.assigneeId,
              clearAssignee: options.clearAssignee,
            }
          : undefined
    );
    if (status === "revision_requested") {
      setShowRevisionForm(false);
      setRevisionDraft("");
    }
  };

  const handleAssigneeChange = (artistId: string | null) => {
    const current = liveEntry.artwork.artAssigneeId ?? null;
    if (artistId === current) return;
    handleStatusChange(liveEntry.artwork.status, {
      assigneeId: artistId,
      clearAssignee: !artistId,
    });
  };

  const submitRevisionRequest = () => {
    const message = revisionDraft.trim();
    if (!message) return;
    handleStatusChange("revision_requested", {
      message,
      messageRole: "staff",
    });
  };

  const handleCompleteAndSendToTeam = async () => {
    if (!readiness.ok) {
      setProofFeedback({
        message: `Finish before sending back to the team: ${readiness.missing.join(
          " · "
        )}`,
        type: "error",
      });
      return;
    }
    setCompletingArt(true);
    setProofFeedback(null);
    try {
      await setArtworkStatus(
        liveEntry.orderId,
        liveEntry.jobId,
        liveEntry.imprintId,
        "art_ready"
      );
      setProofFeedback({
        message:
          "Artwork marked complete and sent back to the team. They’ll review it, then send the proof to the customer.",
        type: "success",
      });
    } catch (err) {
      setProofFeedback({
        message:
          err instanceof Error
            ? err.message
            : "Could not send this proof back to the team.",
        type: "error",
      });
    } finally {
      setCompletingArt(false);
    }
  };

  const persistInkColors = async (inkColors: ImprintInkColor[]) => {
    await updateImprintInkColors(
      liveEntry.orderId,
      liveEntry.jobId,
      liveEntry.imprintId,
      inkColors
    );
  };

  const handleLocationFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length || !order || !job || !imprint || locked) return;

    const named = await promptRename(files, {
      title:
        files.length > 1
          ? `Name ${files.length} artwork files`
          : "Name this artwork file",
      description:
        "Choose a clear name before uploading so production can find the right file.",
    });
    if (!named?.length) return;

    setUploadingLocationFile(true);
    setProofFeedback(null);
    try {
      for (const { file, name } of named) {
        const { base64, contentType, error } = await readUploadContent(file);
        if (error) throw new Error(error);
        await uploadOrderFile(order.id, {
          name,
          kind: "production_art",
          uploadedBy: "Shop",
          contentBase64: base64,
          contentType,
          jobId: job.id,
          imprintId: imprint.id,
        });
      }
      setProofFeedback({
        message:
          named.length === 1
            ? "Artwork file uploaded for this location."
            : `${named.length} artwork files uploaded for this location.`,
        type: "success",
      });
    } catch (err) {
      setProofFeedback({
        message:
          err instanceof Error
            ? err.message
            : "Could not upload artwork for this location.",
        type: "error",
      });
    } finally {
      setUploadingLocationFile(false);
    }
  };

  const handleTechPackUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length || !order || locked) return;

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
    setProofFeedback(null);
    try {
      for (const { file, name } of named) {
        const { base64, contentType, error } = await readUploadContent(file);
        if (error) throw new Error(error);
        await uploadOrderFile(order.id, {
          name,
          kind: "tech_pack",
          uploadedBy: "Shop",
          contentBase64: base64,
          contentType,
          notes: "Order summary proof / tech pack",
        });
      }
      setProofFeedback({
        message:
          named.length === 1
            ? "Summary tech pack added to this order."
            : `${named.length} tech pack files added to this order.`,
        type: "success",
      });
    } catch (err) {
      setProofFeedback({
        message:
          err instanceof Error
            ? err.message
            : "Could not upload the tech pack.",
        type: "error",
      });
    } finally {
      setUploadingTechPack(false);
    }
  };

  return (
    <div className="grid min-h-0 h-full flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div className="flex min-h-0 flex-col overflow-hidden border-b border-[#ebebeb] bg-[#fafafa] p-4 sm:p-5 lg:border-b-0 lg:border-r">
        {job && imprint && !isFinishing ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <ProofSlidesEditor
              orderId={liveEntry.orderId}
              job={job}
              imprint={imprint}
              readOnly={locked}
            />
          </div>
        ) : job && imprint && isFinishing ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[#e3e3e3] bg-white/60 p-8 text-sm text-[#616161]">
            Finishing step — no proof images
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[#e3e3e3] bg-white/60 p-8 text-sm text-[#616161]">
            Preview unavailable
          </div>
        )}
      </div>

      <div className="scroll-pane min-h-0 space-y-5 overflow-y-auto overscroll-y-contain p-4 sm:p-5">
          <section className="rounded-lg border border-[#e3e3e3] bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#616161]">
                Art workflow
              </p>
              <Select
                value={liveEntry.artwork.status}
                onValueChange={(value) => {
                  if (!value) return;
                  if (value === "art_ready" && !readiness.ok) {
                    setProofFeedback({
                      message: `Finish before marking complete: ${readiness.missing.join(
                        " · "
                      )}`,
                      type: "error",
                    });
                    return;
                  }
                  handleStatusChange(value as ArtworkFile["status"]);
                }}
                disabled={locked}
              >
                <SelectTrigger
                  className={cn(
                    dashboardControlClass,
                    "h-9 w-full max-w-[220px]"
                  )}
                >
                  <LabeledSelectValue
                    value={liveEntry.artwork.status}
                    options={STATUS_OPTIONS}
                  />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="mt-3 text-[12px] leading-relaxed text-[#8a8a8a]">
              {liveEntry.artwork.status === "art_ready"
                ? "This proof is back with the internal team. They’ll confirm it looks right, then send it to the customer from the order."
                : liveEntry.artwork.status === "approved"
                  ? "This location is approved."
                  : "Finish proof images and colors, then send this back to the team for review. The team sends proofs to the customer — not the art queue."}
            </p>

            <div className="mt-4 space-y-1.5">
              <Label className="text-[11px] font-medium text-[#8a8a8a]">
                Assign artist
              </Label>
              <StaffArtistSelect
                id={`art-detail-artist-${liveEntry.imprintId}`}
                value={liveEntry.artwork.artAssigneeId}
                onChange={handleAssigneeChange}
                disabled={locked}
                placeholder="Unassigned"
                triggerClassName="h-9"
              />
            </div>

            {!readiness.ok &&
            (liveEntry.artwork.status === "with_art" ||
              liveEntry.artwork.status === "revision_requested" ||
              liveEntry.artwork.status === "pending") ? (
              <p className="mt-3 rounded-lg border border-[#f0e0b2] bg-[#fffbeb] px-3 py-2 text-[12px] text-[#7a5b00]">
                Still needed: {readiness.missing.join(" · ")}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {liveEntry.artwork.status === "pending" ? (
                <Button
                  type="button"
                  className={cn(dashboardPrimaryButtonClass, "h-9")}
                  onClick={() =>
                    handleStatusChange("with_art", {
                      assigneeId: liveEntry.artwork.artAssigneeId ?? undefined,
                    })
                  }
                  disabled={locked}
                >
                  <Send className="size-3.5" />
                  Submit to artwork
                </Button>
              ) : null}

              {liveEntry.artwork.status === "with_art" ||
              liveEntry.artwork.status === "revision_requested" ? (
                <Button
                  type="button"
                  className={cn(
                    dashboardPrimaryButtonClass,
                    "h-9 min-w-[12rem]",
                    completingArt && "opacity-90"
                  )}
                  onClick={() => void handleCompleteAndSendToTeam()}
                  disabled={locked || completingArt || !readiness.ok}
                  aria-busy={completingArt || undefined}
                >
                  {completingArt ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Palette className="size-3.5" />
                  )}
                  {completingArt
                    ? "Sending back to team…"
                    : "Complete & send back to team"}
                </Button>
              ) : null}

              {liveEntry.artwork.status === "art_ready" ? (
                <div className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#e8f1ff] px-3 text-[12px] font-medium text-[#1f4b99]">
                  <CheckCircle2 className="size-3.5" />
                  With the team for review
                </div>
              ) : null}

              <Button
                type="button"
                className={cn(dashboardControlClass, "h-9")}
                onClick={() => setShowRevisionForm((current) => !current)}
                disabled={
                  locked ||
                  completingArt ||
                  liveEntry.artwork.status === "approved"
                }
              >
                <RotateCcw className="size-3.5" />
                Request revision
              </Button>
            </div>

            {completingArt ? (
              <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#c4d7f2] bg-[#f4f7fd] px-3 py-2 text-[12px] font-medium text-[#1f4b99]">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Sending this proof back to the internal team…
              </p>
            ) : null}
            {showRevisionForm ? (
              <div className="mt-4 space-y-2 rounded-lg border border-[#ebebeb] bg-[#fafafa] p-3">
                <label className="text-[12px] font-medium text-[#616161]">
                  What needs to change on this proof?
                </label>
                <textarea
                  value={revisionDraft}
                  onChange={(event) => setRevisionDraft(event.target.value)}
                  rows={3}
                  placeholder="Describe the revision for this location…"
                  className="w-full resize-none rounded-lg border border-[#e3e3e3] bg-white px-3 py-2.5 text-[13px] text-[#303030] outline-none focus:border-[#2c6ecb] focus:ring-2 focus:ring-[#2c6ecb]/15"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className={cn(dashboardPrimaryButtonClass, "h-8 text-[12px]")}
                    disabled={!revisionDraft.trim() || locked}
                    onClick={submitRevisionRequest}
                  >
                    Save revision request
                  </Button>
                  <Button
                    type="button"
                    className={cn(dashboardControlClass, "h-8 text-[12px]")}
                    onClick={() => {
                      setShowRevisionForm(false);
                      setRevisionDraft("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}

            {proofFeedback ? (
              <p
                className={cn(
                  "mt-3 rounded-lg border px-3 py-2 text-[13px] font-medium",
                  proofFeedback.type === "error"
                    ? "border-[#e7b4b4] bg-[#fdf2f2] text-[#b42318]"
                    : "border-[#86d4a8] bg-[#e8f5ee] text-[#0d5c2e]"
                )}
              >
                {proofFeedback.message}
              </p>
            ) : null}
          </section>

          <ProofNotesThread
            notes={proofNotes}
            title="Proof notes"
            alwaysShow
            disabled={locked}
            emptyLabel={
              liveEntry.artwork.status === "revision_requested"
                ? "Revision was requested but no message was saved on this proof yet. Reply below or check the order message thread."
                : "Customer and team notes tied to this proof will appear here."
            }
            replyPlaceholder="Reply to the customer about this proof…"
            onSendReply={(message) =>
              addArtworkProofNote(
                liveEntry.orderId,
                liveEntry.jobId,
                liveEntry.imprintId,
                message
              )
            }
          />

          {imprint && !isFinishing ? (
            <section className="rounded-lg border border-[#e3e3e3] bg-white p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#616161]">
                  {colorsTitle}
                </p>
                {!readiness.ok &&
                readiness.missing.includes("Add ink / Pantone colors") ? (
                  <span className="rounded-md bg-[#fff4e5] px-2 py-0.5 text-[11px] font-semibold text-[#9a6700]">
                    Required to finish
                  </span>
                ) : null}
              </div>
              <p className="mb-3 text-[12px] leading-relaxed text-[#8a8a8a]">
                Enter the ink / Pantone colors for this location before sending
                the proof back to the team.
              </p>
              <ImprintInkColorsEditor
                inkColors={imprint.inkColors ?? EMPTY_INK_COLORS}
                readOnly={locked}
                decoration={imprint.decoration}
                onPersist={persistInkColors}
              />
            </section>
          ) : null}

          {hasSpecs ? (
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#616161]">
                Production specs
              </h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                {notes?.dimensions ? (
                  <div className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-2.5">
                    <dt className="text-xs text-[#616161]">Print size</dt>
                    <dd className="mt-0.5 font-medium text-[#303030]">
                      {notes.dimensions}
                    </dd>
                  </div>
                ) : null}
                {notes?.placement ? (
                  <div className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-2.5">
                    <dt className="text-xs text-[#616161]">Placement</dt>
                    <dd className="mt-0.5 font-medium text-[#303030]">
                      {notes.placement}
                    </dd>
                  </div>
                ) : null}
                {notes?.colors ? (
                  <div className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-2.5 sm:col-span-2">
                    <dt className="text-xs text-[#616161]">Colors</dt>
                    <dd className="mt-0.5 font-medium text-[#303030]">
                      {notes.colors}
                    </dd>
                  </div>
                ) : null}
                {notes?.instructions ? (
                  <div className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-2.5 sm:col-span-2">
                    <dt className="text-xs text-[#616161]">Notes</dt>
                    <dd className="mt-0.5 font-medium leading-relaxed text-[#303030]">
                      {notes.instructions}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[#616161]">
                Files for this location
              </h3>
              {!locked ? (
                <>
                  <input
                    ref={locationFileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    onChange={(event) => void handleLocationFileUpload(event)}
                  />
                  <Button
                    type="button"
                    className={cn(dashboardControlClass, "h-8 text-[12px]")}
                    disabled={uploadingLocationFile}
                    onClick={() => locationFileInputRef.current?.click()}
                  >
                    {uploadingLocationFile ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Upload className="size-3.5" />
                    )}
                    {uploadingLocationFile ? "Uploading…" : "Upload artwork"}
                  </Button>
                </>
              ) : null}
            </div>
            <div className="divide-y divide-[#ebebeb] overflow-hidden rounded-lg border border-[#e3e3e3] bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#303030]">
                    {resolveArtworkDisplayName(liveEntry.artwork)}
                  </p>
                  <p className="mt-0.5 text-xs text-[#616161]">
                    Current · v{liveEntry.artwork.version}
                    {imprint ? ` · ${decorationLabel(imprint.decoration)}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-[#616161]">
                  {formatDateTime(liveEntry.artwork.uploadedAt)}
                </span>
              </div>

              {additionalFiles.map((file) => (
                <div
                  key={file.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4",
                    file.archived && "bg-[#f6f6f7]"
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-[#303030]">
                      {file.name}
                    </p>
                    <p className="mt-0.5 text-xs text-[#616161]">
                      {ORDER_FILE_KIND_LABELS[file.kind]}
                      {file.version ? ` · v${file.version}` : ""}
                      {file.archived ? " · Previous version" : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-[#616161]">
                    {formatDateTime(file.uploadedAt)}
                  </span>
                </div>
              ))}

              {additionalFiles.length === 0 ? (
                <div className="px-4 py-5 text-center text-sm text-[#616161]">
                  No other files for this location yet. Upload production art
                  here, or add proof images in the preview.
                </div>
              ) : null}
            </div>
          </section>

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#616161]">
                  Order tech pack
                </h3>
                <p className="mt-1 text-[12px] text-[#8a8a8a]">
                  Optional summary proof / tech pack that covers every location
                  on this order. Shows on the order Proofs summary.
                </p>
              </div>
              {!locked ? (
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
                    className={cn(dashboardControlClass, "h-8 text-[12px]")}
                    disabled={uploadingTechPack}
                    onClick={() => techPackInputRef.current?.click()}
                  >
                    {uploadingTechPack ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <FileUp className="size-3.5" />
                    )}
                    {uploadingTechPack ? "Uploading…" : "Add tech pack"}
                  </Button>
                </>
              ) : null}
            </div>
            <div className="divide-y divide-[#ebebeb] overflow-hidden rounded-lg border border-[#e3e3e3] bg-white">
              {techPackFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#303030]">
                      {file.name}
                    </p>
                    <p className="mt-0.5 text-xs text-[#616161]">
                      {ORDER_FILE_KIND_LABELS.tech_pack}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-[#616161]">
                    {formatDateTime(file.uploadedAt)}
                  </span>
                </div>
              ))}
              {techPackFiles.length === 0 ? (
                <div className="px-4 py-5 text-center text-sm text-[#616161]">
                  No order-level tech pack yet.
                </div>
              ) : null}
            </div>
          </section>
      </div>
      {nameFilesDialog}
    </div>
  );
}

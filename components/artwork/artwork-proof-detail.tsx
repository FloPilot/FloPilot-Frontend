"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, RotateCcw, Send } from "lucide-react";
import { MockupPreview } from "@/components/orders/artwork/mockup-preview";
import { ProofNotesThread } from "@/components/orders/proof-notes-thread";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  LabeledSelectValue,
  SelectTrigger,
} from "@/components/ui/select";
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
import { ORDER_FILE_KIND_LABELS } from "@/lib/order-files";
import type { ArtworkFile } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: ArtworkFile["status"]; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "revision_requested", label: "Revision requested" },
  { value: "approved", label: "Approved" },
];

export function ArtworkProofDetail({
  entry,
  readOnly = false,
}: {
  entry: ArtworkQueueEntry;
  readOnly?: boolean;
}) {
  const { orders, setArtworkStatus, addArtworkProofNote, sendProofToCustomer } =
    useSchedule();

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

  const [sendingProof, setSendingProof] = useState(false);
  const [proofFeedback, setProofFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionDraft, setRevisionDraft] = useState("");

  const relatedFiles = getRelatedArtworkFiles(order, liveEntry);
  const additionalFiles = relatedFiles.filter(
    (file) => file.id !== liveEntry.artwork.id
  );
  const notes = imprint?.notes;
  const hasSpecs =
    notes?.dimensions ||
    notes?.placement ||
    notes?.colors ||
    notes?.instructions;
  const locked = readOnly || liveEntry.archived;

  const handleStatusChange = (
    status: ArtworkFile["status"],
    options?: { message?: string; messageRole?: "staff" | "customer" }
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
          }
        : undefined
    );
    if (status === "revision_requested") {
      setShowRevisionForm(false);
      setRevisionDraft("");
    }
  };

  const submitRevisionRequest = () => {
    const message = revisionDraft.trim();
    if (!message) return;
    handleStatusChange("revision_requested", {
      message,
      messageRole: "staff",
    });
  };

  const handleSendProof = async () => {
    setSendingProof(true);
    setProofFeedback(null);
    try {
      const email = await sendProofToCustomer(
        liveEntry.orderId,
        liveEntry.jobId,
        liveEntry.imprintId
      );
      setProofFeedback({
        message: `Proof emailed to ${email.to}.`,
        type: "success",
      });
    } catch (err) {
      setProofFeedback({
        message:
          err instanceof Error
            ? err.message
            : "Could not send the email. Please try again.",
        type: "error",
      });
    } finally {
      setSendingProof(false);
    }
  };

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div className="flex min-h-0 flex-col border-b border-[#ebebeb] bg-[#fafafa] p-4 sm:p-5 lg:border-b-0 lg:border-r">
        {job && imprint ? (
          <div className="flex min-h-[280px] flex-1 flex-col lg:min-h-[420px]">
            <MockupPreview entry={{ job, imprint }} fill />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[#e3e3e3] bg-white/60 p-8 text-sm text-[#616161]">
            Preview unavailable
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-col overflow-hidden">
        <div className="scroll-pane min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-y-contain p-4 sm:p-5">
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

          <section className="rounded-lg border border-[#e3e3e3] bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#616161]">
                Review actions
              </p>
              <Select
                value={liveEntry.artwork.status}
                onValueChange={(value) => {
                  if (!value) return;
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

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                className={cn(dashboardPrimaryButtonClass, "h-9")}
                onClick={() => void handleSendProof()}
                disabled={
                  locked ||
                  liveEntry.artwork.status === "approved" ||
                  sendingProof
                }
              >
                <Send className="size-3.5" />
                {sendingProof ? "Sending…" : "Send proof"}
              </Button>
              <Button
                type="button"
                className={cn(dashboardControlClass, "h-9")}
                onClick={() => handleStatusChange("approved")}
                disabled={locked || liveEntry.artwork.status === "approved"}
              >
                <CheckCircle2 className="size-3.5" />
                Approve
              </Button>
              <Button
                type="button"
                className={cn(dashboardControlClass, "h-9")}
                onClick={() => setShowRevisionForm((current) => !current)}
                disabled={locked || liveEntry.artwork.status === "approved"}
              >
                <RotateCcw className="size-3.5" />
                Request revision
              </Button>
            </div>

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
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#616161]">
              Files
            </h3>
            <div className="divide-y divide-[#ebebeb] overflow-hidden rounded-lg border border-[#e3e3e3] bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#303030]">
                    {liveEntry.artwork.name}
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
                  No other files for this location.
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

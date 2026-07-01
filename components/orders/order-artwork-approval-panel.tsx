"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  FileImage,
  FileText,
  RotateCcw,
  Send,
} from "lucide-react";
import { PdfPreviewDialog } from "@/components/orders/pdf-preview-dialog";
import { ArtworkStatusBadge } from "@/components/orders/artwork/artwork-status-badge";
import { MockupPreview } from "@/components/orders/artwork/mockup-preview";
import { ProofActionButton } from "@/components/orders/artwork/proof-action-button";
import { ProofApprovalProgressBar } from "@/components/orders/artwork/proof-approval-progress";
import { useSchedule } from "@/components/providers/schedule-provider";
import { decorationLabel } from "@/lib/format";
import { getArtworkApprovalSummary } from "@/lib/order-health";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

export function OrderArtworkApprovalPanel({
  order,
}: {
  order: Order;
  onOpenFiles?: (jobId: string, imprintId: string) => void;
}) {
  const {
    setArtworkStatus,
    sendProofToCustomer,
    sendProofsAndEstimate,
    previewOrderDocument,
  } = useSchedule();
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadProofsPdf = useCallback(
    () => previewOrderDocument(order.id, "proofs"),
    [previewOrderDocument, order.id]
  );

  const summary = useMemo(() => getArtworkApprovalSummary(order), [order]);
  const [expanded, setExpanded] = useState(
    () => !getArtworkApprovalSummary(order).allApproved
  );
  const wasAllApprovedRef = useRef(summary.allApproved);

  useEffect(() => {
    const justCompleted =
      !wasAllApprovedRef.current && summary.allApproved;
    wasAllApprovedRef.current = summary.allApproved;

    if (!summary.allApproved) return;

    if (justCompleted) {
      const timer = window.setTimeout(() => setExpanded(false), 1300);
      return () => window.clearTimeout(timer);
    }
  }, [summary.allApproved]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 5000);
  };

  const handleSendProof = async (
    jobId: string,
    imprintId: string,
    label: string
  ) => {
    try {
      const email = await sendProofToCustomer(order.id, jobId, imprintId);
      showToast(`Proof emailed to ${email.to} (${label}).`);
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Could not send the email. Please try again.",
        "error"
      );
      throw err;
    }
  };

  // Emails the customer the combined proofs + estimate PDF with approve links.
  const handleSendProofsAndEstimate = async () => {
    try {
      const email = await sendProofsAndEstimate(order.id);
      showToast(`Proofs & estimate emailed to ${email.to}.`);
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Could not send the email. Please try again.",
        "error"
      );
      throw err;
    }
  };

  if (summary.total === 0) {
    return (
      <section className={dashboardCardClass}>
        <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
          <h2 className={dashboardTaskTitleClass}>Proof approval</h2>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            Add decoration events first — then send and approve proofs per
            location before production.
          </p>
        </div>
      </section>
    );
  }

  const pendingCount = summary.pending + summary.revisionRequested;
  const compactComplete = summary.allApproved && !expanded;

  return (
    <section
      className={cn(
        dashboardCardClass,
        "transition-[border-color,box-shadow] duration-300",
        compactComplete && "border-[#86d4a8] bg-[#fafffe]"
      )}
    >
      <div
        className={cn(
          "border-b border-[#ebebeb]",
          compactComplete ? "px-4 py-3 sm:px-5" : "px-4 py-3.5 sm:px-5"
        )}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left transition-colors hover:bg-[#fafafa] -m-1.5 p-1.5"
            aria-expanded={expanded}
          >
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-300",
                summary.allApproved
                  ? "bg-[#e8f5ee] text-[#0d5c2e]"
                  : "bg-[#f4f7fd] text-[#2c6ecb]"
              )}
            >
              {summary.allApproved ? (
                <CheckCircle2 className="size-4" strokeWidth={2} />
              ) : (
                <FileImage className="size-4" strokeWidth={1.75} />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={dashboardTaskTitleClass}>Proof approval</h2>
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums transition-colors duration-300",
                    summary.allApproved
                      ? "bg-[#e8f5ee] text-[#0d5c2e]"
                      : "bg-[#f1f1f1] text-[#616161]"
                  )}
                >
                  {summary.approved}/{summary.total} approved
                </span>
              </div>

              <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                {compactComplete
                  ? "All proofs approved — ready for production."
                  : expanded
                    ? "Send proofs to the customer and mark each location approved when signed off."
                    : pendingCount > 0
                      ? `${pendingCount} proof${pendingCount !== 1 ? "s" : ""} still need attention.`
                      : "Manage proofs for each decoration location."}
              </p>
            </div>

            <ChevronDown
              className={cn(
                "mt-1 size-4 shrink-0 text-[#8a8a8a] transition-transform duration-200",
                expanded && "rotate-180"
              )}
            />
          </button>

          {!expanded && pendingCount > 0 ? (
            <ProofActionButton
              variant="primary"
              className="mt-0.5 shrink-0"
              successLabel="Sent"
              onClick={handleSendProofsAndEstimate}
            >
              <span className="inline-flex items-center gap-1.5">
                <Send className="size-3.5" />
                Send to customer
              </span>
            </ProofActionButton>
          ) : null}
        </div>

        {!expanded ? (
          <ProofApprovalProgressBar
            approved={summary.approved}
            total={summary.total}
            size={compactComplete ? "sm" : "md"}
            className="mt-3 transition-all duration-500"
          />
        ) : null}

        {toast ? (
          <div
            className={cn(
              "mt-3 rounded-lg border px-3 py-2 text-[13px] font-medium",
              toast.type === "error"
                ? "border-[#e7b4b4] bg-[#fdf2f2] text-[#b42318]"
                : "border-[#86d4a8] bg-[#e8f5ee] text-[#0d5c2e]"
            )}
          >
            {toast.message}
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-4 p-4 sm:p-5">
            <ProofApprovalProgressBar
              approved={summary.approved}
              total={summary.total}
            />

            <div className="flex flex-wrap items-center gap-2">
              {pendingCount > 0 ? (
                <ProofActionButton
                  variant="primary"
                  successLabel="Emailed"
                  onClick={handleSendProofsAndEstimate}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Send className="size-3.5" />
                    Send proofs + estimate
                  </span>
                </ProofActionButton>
              ) : null}
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className={cn(
                  dashboardControlClass,
                  "inline-flex h-9 items-center gap-1.5 px-3 text-[13px]"
                )}
              >
                <FileText className="size-3.5" />
                Preview proofs
              </button>
              {summary.revisionRequested > 0 ? (
                <span className="text-[12px] font-medium text-[#8a6116]">
                  {summary.revisionRequested} revision
                  {summary.revisionRequested !== 1 ? "s" : ""} requested
                </span>
              ) : null}
            </div>

          {summary.needsCustomerReview && !summary.allApproved ? (
            <div className="rounded-lg border border-[#c4d7f2] bg-[#f4f7fd] px-3.5 py-3 text-[13px] text-[#303030]">
              Use <strong>Send proof</strong> on each location to email one
              proof at a time, or <strong>Send proofs + estimate</strong> for
              the full review package. Customers open their customer portal from
              either email.
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-2">
            {summary.items.map(({ job, imprint }) => (
              <article
                key={imprint.id}
                className={cn(
                  dashboardInsetSurfaceClass,
                  "space-y-3 p-3",
                  imprint.artwork.status === "approved" &&
                    "border-[#86d4a8]/40 bg-[#fafffe]"
                )}
              >
                <MockupPreview entry={{ job, imprint }} compact />

                <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[#303030]">
                      {imprint.label}
                    </p>
                    <p className="truncate text-[12px] text-[#616161]">
                      {job.name} · {decorationLabel(imprint.decoration)} · v
                      {imprint.artwork.version}
                    </p>
                  </div>
                  <ArtworkStatusBadge status={imprint.artwork.status} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <ProofActionButton
                    variant="primary"
                    className="min-w-[120px] flex-1"
                    disabled={imprint.artwork.status === "approved"}
                    successLabel="Sent"
                    onClick={() =>
                      handleSendProof(job.id, imprint.id, imprint.label)
                    }
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Send className="size-3.5" />
                      Send proof
                    </span>
                  </ProofActionButton>
                  <ProofActionButton
                    variant="success"
                    className="min-w-[108px] flex-1"
                    disabled={imprint.artwork.status === "approved"}
                    successLabel="Approved"
                    onClick={() =>
                      setArtworkStatus(
                        order.id,
                        job.id,
                        imprint.id,
                        "approved"
                      )
                    }
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5" />
                      {imprint.artwork.status === "approved"
                        ? "Approved"
                        : "Approve"}
                    </span>
                  </ProofActionButton>
                  <ProofActionButton
                    variant="muted"
                    className="min-w-[100px]"
                    disabled={imprint.artwork.status === "revision_requested"}
                    successLabel="Saved"
                    onClick={() =>
                      setArtworkStatus(
                        order.id,
                        job.id,
                        imprint.id,
                        "revision_requested"
                      )
                    }
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <RotateCcw className="size-3.5" />
                      Revision
                    </span>
                  </ProofActionButton>
                </div>
              </article>
            ))}
          </div>
          </div>
        </div>
      </div>

      <PdfPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={`Proofs · Order ${order.number}`}
        subtitle="These are the art approval pages the customer receives."
        load={loadProofsPdf}
      />
    </section>
  );
}

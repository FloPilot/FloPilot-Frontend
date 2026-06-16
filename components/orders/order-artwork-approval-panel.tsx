"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileImage,
  RotateCcw,
  Send,
} from "lucide-react";
import { ArtworkStatusBadge } from "@/components/orders/artwork/artwork-status-badge";
import { MockupPreview } from "@/components/orders/artwork/mockup-preview";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { decorationLabel } from "@/lib/format";
import { getArtworkApprovalSummary } from "@/lib/order-health";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

export function OrderArtworkApprovalPanel({
  order,
  onOpenFiles,
}: {
  order: Order;
  onOpenFiles: (jobId: string, imprintId: string) => void;
}) {
  const { setArtworkStatus, sendProofToCustomer } = useSchedule();
  const [toast, setToast] = useState<string | null>(null);

  const summary = useMemo(() => getArtworkApprovalSummary(order), [order]);
  const [expanded, setExpanded] = useState(false);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 4000);
  };

  const handleSendProof = (jobId: string, imprintId: string, label: string) => {
    sendProofToCustomer(order.id, jobId, imprintId);
    showToast(`Proof sent for ${label}. Customer can approve in their portal.`);
  };

  const handleSendAllProofs = () => {
    const pending = summary.items.filter(
      (item) => item.artwork.status !== "approved"
    );
    if (pending.length === 0) return;
    pending.forEach((item) => {
      sendProofToCustomer(order.id, item.job.id, item.imprint.id);
    });
    showToast(
      `Sent ${pending.length} proof${pending.length !== 1 ? "s" : ""} to ${order.customerName.split(" ")[0]}.`
    );
  };

  if (summary.total === 0) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="py-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileImage className="size-4" />
            Artwork approval
          </CardTitle>
          <CardDescription>
            Add production events with decoration artwork to request customer
            approval before scheduling.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const pendingCount = summary.pending + summary.revisionRequested;

  return (
    <Card
      className={cn(
        "border-border/60 shadow-sm overflow-hidden transition-colors",
        summary.needsCustomerReview && !expanded && "border-brand-primary/20",
        summary.allApproved && !expanded && "border-emerald-200/80"
      )}
    >
      <CardHeader className={cn("pb-0", expanded ? "pb-4" : "py-3")}>
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left transition-colors hover:bg-brand-primary/[0.04] -m-2 p-2"
            aria-expanded={expanded}
          >
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl",
                summary.allApproved
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-brand-primary/8 text-brand-primary"
              )}
            >
              {summary.allApproved ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <FileImage className="size-4" />
              )}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <CardTitle className="text-base">Artwork approval</CardTitle>
                <span
                  className={cn(
                    "text-xs font-semibold tabular-nums",
                    summary.allApproved ? "text-emerald-700" : "text-brand-ink"
                  )}
                >
                  {summary.approved}/{summary.total} approved
                </span>
              </div>

              {!expanded && (
                <p className="mt-0.5 text-sm text-brand-muted">
                  {summary.allApproved
                    ? "All proofs approved — click to review or resend."
                    : pendingCount > 0
                      ? `${pendingCount} proof${pendingCount !== 1 ? "s" : ""} need attention — click to manage.`
                      : "Click to manage artwork proofs."}
                </p>
              )}

              {expanded && (
                <CardDescription className="mt-1">
                  Send proofs to the customer and track approval before
                  production.
                </CardDescription>
              )}

              {!expanded && (
                <div className="mt-2 h-1.5 max-w-[200px] rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      summary.allApproved ? "bg-emerald-500" : "bg-brand-primary"
                    )}
                    style={{
                      width: `${Math.round((summary.approved / summary.total) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>

            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-brand-muted transition-transform mt-1",
                expanded && "rotate-180"
              )}
            />
          </button>

          {!expanded && pendingCount > 0 && (
            <Button
              size="sm"
              className="rounded-full shrink-0 mt-0.5"
              onClick={(event) => {
                event.stopPropagation();
                handleSendAllProofs();
              }}
            >
              <Send className="size-3.5" />
              <span className="hidden sm:inline">Send all</span>
            </Button>
          )}
        </div>

        {expanded && (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3 pl-12">
              <div className="flex items-center gap-2 text-sm">
                {summary.pending > 0 && (
                  <span className="text-brand-muted">
                    {summary.pending} awaiting review
                  </span>
                )}
                {summary.revisionRequested > 0 && (
                  <span className="text-amber-700">
                    {summary.revisionRequested} revision
                    {summary.revisionRequested !== 1 ? "s" : ""} requested
                  </span>
                )}
              </div>
              <div className="h-2 flex-1 min-w-[120px] max-w-xs rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    summary.allApproved ? "bg-emerald-500" : "bg-brand-primary"
                  )}
                  style={{
                    width: `${Math.round((summary.approved / summary.total) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 pl-12">
              {pendingCount > 0 && (
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={handleSendAllProofs}
                >
                  <Send className="size-3.5" />
                  Send all proofs
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="rounded-full bg-white"
                onClick={() =>
                  onOpenFiles(summary.items[0].job.id, summary.items[0].imprint.id)
                }
              >
                <ExternalLink className="size-3.5" />
                Files & mockups
              </Button>
            </div>

            {toast && (
              <div className="mt-4 ml-12 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
                {toast}
              </div>
            )}

            {summary.needsCustomerReview && !summary.allApproved && (
              <div className="mt-4 ml-12 rounded-xl border border-brand-primary/15 bg-brand-primary/[0.05] px-4 py-3 text-sm text-brand-ink">
                Send proofs when mockups are ready. The customer receives a
                portal message and can approve or request changes before you
                schedule production.
              </div>
            )}
          </>
        )}

        {!expanded && toast && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
            {toast}
          </div>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-2">
          <div className="grid gap-4 lg:grid-cols-2">
            {summary.items.map(({ job, imprint }) => (
              <div
                key={imprint.id}
                className="rounded-xl border border-border/70 bg-white p-3 space-y-3"
              >
                <MockupPreview entry={{ job, imprint }} compact />

                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {imprint.label}
                    </p>
                    <p className="text-xs text-brand-muted truncate">
                      {job.name} · {decorationLabel(imprint.decoration)} · v
                      {imprint.artwork.version}
                    </p>
                  </div>
                  <ArtworkStatusBadge status={imprint.artwork.status} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="rounded-full flex-1 sm:flex-none"
                    onClick={() =>
                      handleSendProof(job.id, imprint.id, imprint.label)
                    }
                    disabled={imprint.artwork.status === "approved"}
                  >
                    <Send className="size-3.5" />
                    Send proof
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() =>
                      setArtworkStatus(
                        order.id,
                        job.id,
                        imprint.id,
                        "approved"
                      )
                    }
                    disabled={imprint.artwork.status === "approved"}
                  >
                    <CheckCircle2 className="size-3.5" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() =>
                      setArtworkStatus(
                        order.id,
                        job.id,
                        imprint.id,
                        "revision_requested"
                      )
                    }
                  >
                    <RotateCcw className="size-3.5" />
                    Revision
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import {
  fetchCustomerReview,
  reactivateReviewUrl,
  submitCustomerReviewAction,
  type CustomerReviewSession,
  type ReviewProof,
} from "@/lib/customer-review-api";
import {
  fetchCustomerPortalOrder,
  reactivatePortalUrl,
  submitCustomerPortalAction,
} from "@/lib/customer-portal-api";
import { CustomerEstimateBreakdownTable } from "@/components/estimate/estimate-breakdown-table";
import { ProofNotesThread } from "@/components/orders/proof-notes-thread";
import { resolveReviewProofNotes } from "@/lib/artwork-routes";
import { decorationLabel, formatDate } from "@/lib/format";
import { useLockDocumentScroll } from "@/hooks/use-lock-document-scroll";
import { cn } from "@/lib/utils";

type Step =
  | { kind: "estimate" }
  | { kind: "proof"; proof: ReviewProof };

function buildSteps(session: CustomerReviewSession): Step[] {
  return [
    { kind: "estimate" },
    ...(session.proofs || []).map((proof) => ({ kind: "proof" as const, proof })),
  ];
}

function stepStatus(step: Step, session: CustomerReviewSession): "approved" | "revision" | "pending" {
  if (step.kind === "estimate") {
    return session.order?.quoteApproved ? "approved" : "pending";
  }
  const status = step.proof.artwork.status;
  if (status === "approved") return "approved";
  if (status === "revision_requested") return "revision";
  return "pending";
}

export function CustomerReviewFlow({
  token,
  portalToken,
  orderId,
  initialSession = null,
  mode = "customer",
  embedded = false,
  hideHeader = false,
  onSessionChange,
}: {
  token?: string;
  portalToken?: string;
  orderId?: string;
  initialSession?: CustomerReviewSession | null;
  mode?: "customer" | "preview";
  embedded?: boolean;
  hideHeader?: boolean;
  onSessionChange?: (session: CustomerReviewSession) => void;
}) {
  const isPreview = mode === "preview";
  const isPortal = Boolean(portalToken && orderId);
  useLockDocumentScroll(!embedded);
  const searchParams = useSearchParams();
  const [session, setSession] = useState<CustomerReviewSession | null>(
    initialSession
  );
  const [loading, setLoading] = useState(
    !initialSession && Boolean(token || (portalToken && orderId))
  );
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [revisionDraft, setRevisionDraft] = useState("");
  const [showRevision, setShowRevision] = useState(false);
  const [acting, setActing] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isPortal && portalToken && orderId) {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCustomerPortalOrder(portalToken, orderId);
        setSession(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not load your review."
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomerReview(token);
      setSession(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load your review."
      );
    } finally {
      setLoading(false);
    }
  }, [isPortal, portalToken, orderId, token]);

  useEffect(() => {
    if (initialSession) {
      setSession(initialSession);
      setLoading(false);
      return;
    }
    void load();
  }, [load, portalToken, orderId, token]);

  const steps = useMemo(
    () => (session && !session.expired ? buildSteps(session) : []),
    [session]
  );

  useEffect(() => {
    if (!session || session.expired) return;
    const focus = searchParams.get("focus");
    if (!focus) return;

    const [jobId, imprintId] = focus.split(":");
    if (!jobId || !imprintId) return;

    const idx = buildSteps(session).findIndex(
      (step) =>
        step.kind === "proof" &&
        step.proof.jobId === jobId &&
        step.proof.imprintId === imprintId
    );
    if (idx >= 0) setStepIndex(idx);
  }, [session, searchParams]);

  const currentStep = steps[stepIndex];
  const accent = session?.shop?.primaryColor || "#2c6ecb";

  const showToast = (message: string) => {
    setActionToast(message);
    setTimeout(() => setActionToast(null), 4000);
  };

  const applySession = (next: CustomerReviewSession) => {
    setSession(next);
    setRevisionDraft("");
    setShowRevision(false);
    onSessionChange?.(next);
  };

  const runAction = async (
    body: Parameters<typeof submitCustomerReviewAction>[1]
  ) => {
    if (isPreview) return;
    if (isPortal && portalToken && orderId) {
      setActing(true);
      try {
        const { order } = await submitCustomerPortalAction(
          portalToken,
          orderId,
          body
        );
        applySession(order);
        showToast("Saved — thank you!");
        if (stepIndex < steps.length - 1 && body.action.startsWith("approve")) {
          setStepIndex((i) => i + 1);
        }
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Something went wrong. Try again."
        );
      } finally {
        setActing(false);
      }
      return;
    }

    if (!token) return;
    setActing(true);
    try {
      const { order } = await submitCustomerReviewAction(token, body);
      applySession(order);
      showToast("Saved — thank you!");
      if (stepIndex < steps.length - 1 && body.action.startsWith("approve")) {
        setStepIndex((i) => i + 1);
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
    } finally {
      setActing(false);
    }
  };

  const submitProofComment = async (proof: ReviewProof, message: string) => {
    if (isPreview) return;

    const body = {
      action: "add_proof_comment" as const,
      jobId: proof.jobId,
      imprintId: proof.imprintId,
      message,
    };

    if (isPortal && portalToken && orderId) {
      const { order } = await submitCustomerPortalAction(
        portalToken,
        orderId,
        body
      );
      applySession(order);
      showToast("Message sent!");
      return;
    }

    if (!token) throw new Error("This review link has expired.");

    const { order } = await submitCustomerReviewAction(token, body);
    applySession(order);
    showToast("Message sent!");
  };

  const submitEstimateComment = async (message: string) => {
    if (isPreview) return;

    const body = {
      action: "add_estimate_comment" as const,
      message,
    };

    if (isPortal && portalToken && orderId) {
      const { order } = await submitCustomerPortalAction(
        portalToken,
        orderId,
        body
      );
      applySession(order);
      showToast("Message sent!");
      return;
    }

    if (!token) throw new Error("This review link has expired.");

    const { order } = await submitCustomerReviewAction(token, body);
    applySession(order);
    showToast("Message sent!");
  };

  if (loading) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 text-[#616161]",
          embedded ? "min-h-[320px]" : "min-h-[60vh]"
        )}
      >
        <Loader2 className="size-6 animate-spin" style={{ color: accent }} />
        <p className="text-[14px]">
          {isPreview ? "Loading customer preview…" : "Loading your review…"}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-[#ebebeb] bg-white p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto size-8 text-[#d72c0d]" />
        <h1 className="mt-4 text-[18px] font-semibold text-[#303030]">
          Couldn&apos;t open this review
        </h1>
        <p className="mt-2 text-[14px] text-[#616161]">{error}</p>
      </div>
    );
  }

  if (session?.expired && !isPreview) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-[#ebebeb] bg-white p-8 text-center shadow-sm">
        <RefreshCw className="mx-auto size-8 text-[#616161]" />
        <h1 className="mt-4 text-[18px] font-semibold text-[#303030]">
          This review link has expired
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[#616161]">
          {session.orderNumber
            ? `Your link for order ${session.orderNumber} is no longer active.`
            : "Your review link is no longer active."}{" "}
          Request a new one and your original link will work again for 7 days.
        </p>
        <a
          href={
            session.reactivateUrl ||
            (isPortal && portalToken
              ? reactivatePortalUrl(portalToken)
              : token
                ? reactivateReviewUrl(token)
                : "#")
          }
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg px-6 text-[14px] font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          Request a new link
        </a>
      </div>
    );
  }

  if (!session?.order || !currentStep) return null;

  const currentStatus = stepStatus(currentStep, session);

  return (
    <div
      className={cn(
        embedded
          ? "min-h-0 bg-[#f6f6f7]"
          : "flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-[#f6f6f7]"
      )}
      style={
        {
          "--review-accent": accent,
        } as React.CSSProperties
      }
    >
      {isPreview ? (
        <div className="border-b border-[#d7e3fb] bg-[#f4f7fd] px-4 py-2.5 text-center text-[12px] font-medium text-[#2c6ecb]">
          Staff preview — this is what your customer sees. Approvals and
          messages are disabled here.
        </div>
      ) : null}

      {!hideHeader ? (
      <header className="shrink-0 border-b border-[#ebebeb] bg-white">
        <div
          className={cn(
            "mx-auto flex items-center justify-between gap-4 px-4 py-4",
            embedded ? "max-w-full sm:px-5" : "max-w-3xl sm:px-6"
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            {session.shop?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.shop.logoUrl}
                alt={session.shop.name}
                className="h-9 max-w-[140px] object-contain"
              />
            ) : (
              <span className="truncate text-[16px] font-semibold text-[#303030]">
                {session.shop?.name}
              </span>
            )}
          </div>
          <div className="text-right text-[12px] text-[#8a8a8a]">
            <p className="font-medium text-[#303030]">
              Order {session.order.number}
            </p>
            <p>In-hands {formatDate(session.order.inHandsDate)}</p>
          </div>
        </div>

        <div
          className={cn(
            "mx-auto px-4 pb-4",
            embedded ? "max-w-full sm:px-5" : "max-w-3xl sm:px-6"
          )}
        >
          <div className="flex items-center justify-center gap-2">
            {steps.map((step, idx) => {
              const status = stepStatus(step, session);
              const active = idx === stepIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setStepIndex(idx)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg px-2 py-1 transition-colors",
                    active && "bg-[#f4f7fd]"
                  )}
                  aria-label={
                    step.kind === "estimate"
                      ? "Estimate"
                      : step.proof.artwork.name
                  }
                >
                  <span
                    className={cn(
                      "size-2.5 rounded-full transition-colors",
                      status === "approved" && "bg-[var(--review-accent)]",
                      status === "revision" && "bg-[#d97706]",
                      status === "pending" && "bg-[#d4d4d4]",
                      active && status === "pending" && "ring-2 ring-[var(--review-accent)]/30"
                    )}
                  />
                  <span
                    className={cn(
                      "max-w-[72px] truncate text-[10px] font-medium",
                      active ? "text-[var(--review-accent)]" : "text-[#8a8a8a]"
                    )}
                  >
                    {step.kind === "estimate"
                      ? "Estimate"
                      : step.proof.label.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>
      ) : null}

      <main
        className={cn(
          "mx-auto px-4 py-6",
          embedded
            ? "max-w-full sm:px-5 sm:py-4"
            : "scroll-pane min-h-0 flex-1 overflow-y-auto overscroll-y-contain max-w-3xl sm:px-6"
        )}
      >
        {hideHeader ? (
          <div className="mb-4 flex items-center justify-center gap-2">
            {steps.map((step, idx) => {
              const status = stepStatus(step, session);
              const active = idx === stepIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setStepIndex(idx)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg px-2 py-1 transition-colors",
                    active && "bg-[#f4f7fd]"
                  )}
                  aria-label={
                    step.kind === "estimate"
                      ? "Estimate"
                      : step.proof.artwork.name
                  }
                >
                  <span
                    className={cn(
                      "size-2.5 rounded-full transition-colors",
                      status === "approved" && "bg-[var(--review-accent)]",
                      status === "revision" && "bg-[#d97706]",
                      status === "pending" && "bg-[#d4d4d4]",
                      active && status === "pending" && "ring-2 ring-[var(--review-accent)]/30"
                    )}
                  />
                  <span
                    className={cn(
                      "max-w-[72px] truncate text-[10px] font-medium",
                      active ? "text-[var(--review-accent)]" : "text-[#8a8a8a]"
                    )}
                  >
                    {step.kind === "estimate"
                      ? "Estimate"
                      : step.proof.label.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
        {actionToast ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#cdeccd] bg-[#f1faf1] px-3 py-2.5 text-[13px] text-[#0f7a3d]">
            <CheckCircle2 className="size-4 shrink-0" />
            {actionToast}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-[#ebebeb] bg-white shadow-sm">
          {currentStep.kind === "estimate" ? (
            <EstimateStep
              session={session}
              embedded={embedded}
              readOnly={isPreview}
              onSendReply={
                isPreview
                  ? undefined
                  : (message) => submitEstimateComment(message)
              }
            />
          ) : (
            <ProofStep
              proof={currentStep.proof}
              session={session}
              embedded={embedded}
              readOnly={isPreview}
              onSendReply={
                isPreview
                  ? undefined
                  : (message) => submitProofComment(currentStep.proof, message)
              }
            />
          )}

          <div className="border-t border-[#ebebeb] bg-[#fafafa] p-4 sm:p-5">
            {currentStatus === "approved" ? (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#86d4a8] bg-[#f1faf1] px-3 py-2.5 text-[13px] font-medium text-[#0d5c2e]">
                <CheckCircle2 className="size-4" />
                {currentStep.kind === "estimate"
                  ? "Estimate approved"
                  : "Proof approved"}
              </div>
            ) : currentStatus === "revision" ? (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#f0d9a8] bg-[#fff8eb] px-3 py-2.5 text-[13px] text-[#8a6116]">
                <MessageSquare className="size-4" />
                Revision requested — we&apos;ll follow up shortly.
              </div>
            ) : null}

            {!isPreview && showRevision ? (
              <div className="mb-4 space-y-2">
                <label className="text-[12px] font-medium text-[#616161]">
                  What would you like changed?
                </label>
                <textarea
                  value={revisionDraft}
                  onChange={(e) => setRevisionDraft(e.target.value)}
                  rows={3}
                  placeholder="Describe the changes you need…"
                  className="w-full resize-none rounded-lg border border-[#e3e3e3] bg-white px-3 py-2.5 text-[14px] text-[#303030] outline-none focus:border-[var(--review-accent)] focus:ring-2 focus:ring-[var(--review-accent)]/15"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={acting || !revisionDraft.trim()}
                    onClick={() => {
                      if (currentStep.kind === "estimate") {
                        void runAction({
                          action: "request_revision",
                          scope: "estimate",
                          message: revisionDraft.trim(),
                        });
                      } else {
                        void runAction({
                          action: "request_revision",
                          scope: "artwork",
                          jobId: currentStep.proof.jobId,
                          imprintId: currentStep.proof.imprintId,
                          message: revisionDraft.trim(),
                        });
                      }
                    }}
                    className="inline-flex h-9 items-center rounded-lg px-4 text-[13px] font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: accent }}
                  >
                    {acting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Send revision request"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRevision(false);
                      setRevisionDraft("");
                    }}
                    className="inline-flex h-9 items-center rounded-lg border border-[#e3e3e3] bg-white px-4 text-[13px] font-medium text-[#616161]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : !isPreview ? (
              <div className="mb-4 flex flex-wrap gap-2">
                {currentStatus !== "approved" ? (
                  <>
                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => {
                        if (currentStep.kind === "estimate") {
                          void runAction({ action: "approve_estimate" });
                        } else {
                          void runAction({
                            action: "approve_artwork",
                            jobId: currentStep.proof.jobId,
                            imprintId: currentStep.proof.imprintId,
                          });
                        }
                      }}
                      className="inline-flex h-10 items-center gap-1.5 rounded-lg px-5 text-[14px] font-semibold text-white disabled:opacity-50"
                      style={{ backgroundColor: accent }}
                    >
                      {acting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      {currentStep.kind === "estimate"
                        ? "Approve estimate"
                        : "Approve this proof"}
                    </button>
                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => setShowRevision(true)}
                      className="inline-flex h-10 items-center rounded-lg border border-[#e3e3e3] bg-white px-4 text-[13px] font-medium text-[#303030]"
                    >
                      Request changes
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            className="inline-flex h-10 items-center gap-1 rounded-lg border border-[#e3e3e3] bg-white px-4 text-[13px] font-medium text-[#303030] disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
            Previous
          </button>
          <p className="text-[12px] text-[#8a8a8a]">
            Step {stepIndex + 1} of {steps.length}
          </p>
          <button
            type="button"
            disabled={stepIndex >= steps.length - 1}
            onClick={() =>
              setStepIndex((i) => Math.min(steps.length - 1, i + 1))
            }
            className="inline-flex h-10 items-center gap-1 rounded-lg border border-[#e3e3e3] bg-white px-4 text-[13px] font-medium text-[#303030] disabled:opacity-40"
          >
            Next
            <ChevronRight className="size-4" />
          </button>
        </div>

        {session.portalHomeUrl && !isPreview && !isPortal ? (
          <p className="mt-6 text-center text-[12px] text-[#616161]">
            <Link
              href={session.portalHomeUrl}
              className="font-semibold underline"
              style={{ color: accent }}
            >
              View all your orders in the customer portal
            </Link>
          </p>
        ) : null}

        {session.order.reviewExpiresAt && !isPreview && token && !isPortal ? (
          <p className="mt-6 text-center text-[11px] text-[#8a8a8a]">
            Review link valid until{" "}
            {new Date(session.order.reviewExpiresAt).toLocaleDateString(
              "en-US",
              { month: "short", day: "numeric", year: "numeric" }
            )}
            .{" "}
            <a
              href={reactivateReviewUrl(token)}
              className="font-medium underline"
              style={{ color: accent }}
            >
              Need more time?
            </a>
          </p>
        ) : null}
      </main>
    </div>
  );
}

function EstimateStep({
  session,
  embedded = false,
  readOnly = false,
  onSendReply,
}: {
  session: CustomerReviewSession;
  embedded?: boolean;
  readOnly?: boolean;
  onSendReply?: (message: string) => Promise<void> | void;
}) {
  const est = session.estimate!;

  return (
    <div className={cn("p-4", embedded ? "sm:p-5" : "sm:p-6")}>
      <h1 className="text-[20px] font-semibold text-[#303030]">Your estimate</h1>
      <p className="mt-1 text-[14px] text-[#616161]">
        Hi {session.customer?.name?.split(" ")[0] || "there"} — here&apos;s the
        pricing breakdown for your order.
      </p>
      {est.rateSheetName && !est.usingShopPricing ? (
        <p className="mt-2 text-[13px] font-medium text-[#2c6ecb]">
          Pricing sheet: {est.rateSheetName}
        </p>
      ) : est.usingShopPricing && est.hasNegotiatedPricing ? (
        <p className="mt-2 text-[13px] text-[#616161]">
          Shop standard pricing applies to this order.
        </p>
      ) : null}

      <ProofNotesThread
        notes={est.revisionNotes}
        title="Notes for your estimate"
        className="mt-5"
        alwaysShow
        disabled={readOnly}
        emptyLabel="Questions or notes about your estimate will appear here."
        replyPlaceholder="Ask a question or reply about your estimate…"
        sendLabel="Send message"
        onSendReply={onSendReply}
      />

      <div className="mt-5">
        <CustomerEstimateBreakdownTable
          rows={est.rows}
          garmentSubtotal={est.garmentSubtotal}
          decorationSubtotal={est.decorationSubtotal}
          subtotal={est.subtotal}
          tax={est.tax}
          taxRate={est.taxRate}
          total={est.total}
          paid={est.paid}
          balance={est.balance}
          accentColor="var(--review-accent)"
        />
      </div>
    </div>
  );
}

function ProofStep({
  proof,
  session,
  embedded = false,
  readOnly = false,
  onSendReply,
}: {
  proof: ReviewProof;
  session: CustomerReviewSession;
  embedded?: boolean;
  readOnly?: boolean;
  onSendReply?: (message: string) => Promise<void> | void;
}) {
  const proofNotes = resolveReviewProofNotes(proof, {
    customerName: session.customer?.name,
    messages: session.messages,
  });

  return (
    <div className={cn("p-4", embedded ? "sm:p-5" : "sm:p-6")}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
        Art proof
      </p>
      <h1 className="mt-1 text-[20px] font-semibold text-[#303030]">
        {proof.artwork.name || proof.label}
      </h1>
      <p className="mt-1 text-[14px] text-[#616161]">
        {proof.label} · {decorationLabel(proof.decoration)} · v
        {proof.artwork.version}
      </p>

      <div className="mt-5 flex items-center justify-center rounded-xl border border-[#ebebeb] bg-[#f6f6f7] p-4">
        {proof.artwork.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proof.artwork.previewUrl}
            alt={proof.artwork.name}
            className={cn(
              "w-auto rounded-lg bg-white shadow-sm",
              embedded ? "max-h-[min(44vh,380px)]" : "max-h-[min(52vh,420px)]"
            )}
          />
        ) : (
          <p className="py-16 text-[13px] text-[#8a8a8a]">
            Preview not available — contact us if you need the file.
          </p>
        )}
      </div>

      {proof.inkColors.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {proof.inkColors.map((ink, i) => (
            <span
              key={i}
              className="rounded-md border border-[#ebebeb] bg-[#fafafa] px-2.5 py-1 text-[12px] text-[#616161]"
            >
              {ink.name}
              {ink.pmsCode ? ` · ${ink.pmsCode}` : ""}
            </span>
          ))}
        </div>
      ) : null}

      <ProofNotesThread
        notes={proofNotes}
        title="Notes for this proof"
        className="mt-4"
        alwaysShow
        disabled={readOnly}
        emptyLabel="Messages about this proof location will appear here."
        replyPlaceholder="Ask a question or reply about this proof…"
        sendLabel="Send message"
        onSendReply={onSendReply}
      />
    </div>
  );
}

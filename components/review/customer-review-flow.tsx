"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import {
  fetchCustomerReview,
  reactivateReviewUrl,
  submitCustomerReviewAction,
  type CustomerReviewSession,
  type ReviewProof,
} from "@/lib/customer-review-api";
import { decorationLabel } from "@/lib/format";
import { formatCurrency, formatDate } from "@/lib/format";
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
  initialSession = null,
  mode = "customer",
  embedded = false,
}: {
  token?: string;
  initialSession?: CustomerReviewSession | null;
  mode?: "customer" | "preview";
  embedded?: boolean;
}) {
  const isPreview = mode === "preview";
  const [session, setSession] = useState<CustomerReviewSession | null>(
    initialSession
  );
  const [loading, setLoading] = useState(!initialSession && !!token);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [messageDraft, setMessageDraft] = useState("");
  const [revisionDraft, setRevisionDraft] = useState("");
  const [showRevision, setShowRevision] = useState(false);
  const [acting, setActing] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  const load = useCallback(async () => {
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
  }, [token]);

  useEffect(() => {
    if (initialSession) {
      setSession(initialSession);
      setLoading(false);
      return;
    }
    void load();
  }, [initialSession, load]);

  const steps = useMemo(
    () => (session && !session.expired ? buildSteps(session) : []),
    [session]
  );

  const currentStep = steps[stepIndex];
  const accent = session?.shop?.primaryColor || "#2c6ecb";

  const showToast = (message: string) => {
    setActionToast(message);
    setTimeout(() => setActionToast(null), 4000);
  };

  const applySession = (next: CustomerReviewSession) => {
    setSession(next);
    setMessageDraft("");
    setRevisionDraft("");
    setShowRevision(false);
  };

  const runAction = async (
    body: Parameters<typeof submitCustomerReviewAction>[1]
  ) => {
    if (isPreview || !token) return;
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
            (token ? reactivateReviewUrl(token) : "#")
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
        embedded ? "min-h-0 bg-[#f6f6f7]" : "min-h-screen bg-[#f6f6f7]"
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

      <header className="border-b border-[#ebebeb] bg-white">
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

      <main
        className={cn(
          "mx-auto px-4 py-6",
          embedded ? "max-w-full sm:px-5 sm:py-4" : "max-w-3xl sm:px-6"
        )}
      >
        {actionToast ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#cdeccd] bg-[#f1faf1] px-3 py-2.5 text-[13px] text-[#0f7a3d]">
            <CheckCircle2 className="size-4 shrink-0" />
            {actionToast}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-[#ebebeb] bg-white shadow-sm">
          {currentStep.kind === "estimate" ? (
            <EstimateStep session={session} embedded={embedded} />
          ) : (
            <ProofStep proof={currentStep.proof} embedded={embedded} />
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

            <MessagesPanel
              messages={session.messages || []}
              draft={messageDraft}
              onDraftChange={setMessageDraft}
              onSend={() => {
                if (!messageDraft.trim()) return;
                void runAction({
                  action: "send_message",
                  message: messageDraft.trim(),
                });
              }}
              acting={acting}
              accent={accent}
              readOnly={isPreview}
            />
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

        {session.order.reviewExpiresAt && !isPreview && token ? (
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
}: {
  session: CustomerReviewSession;
  embedded?: boolean;
}) {
  const est = session.estimate!;
  const garmentRows = est.rows.filter((r) => r.kind === "garment");
  const decorationRows = est.rows.filter((r) => r.kind === "decoration");

  return (
    <div className={cn("p-4", embedded ? "sm:p-5" : "sm:p-6")}>
      <h1 className="text-[20px] font-semibold text-[#303030]">Your estimate</h1>
      <p className="mt-1 text-[14px] text-[#616161]">
        Hi {session.customer?.name?.split(" ")[0] || "there"} — here&apos;s the
        pricing breakdown for your order.
      </p>

      <div className="mt-5 overflow-hidden rounded-xl border border-[#ebebeb]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#fafafa] text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Unit</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {garmentRows.map((row, i) => (
              <tr key={`g-${i}`} className="border-t border-[#f0f0f0]">
                <td className="px-3 py-2.5">
                  <p className="font-medium text-[#303030]">{row.description}</p>
                  {row.detail ? (
                    <p className="text-[11px] text-[#8a8a8a]">{row.detail}</p>
                  ) : null}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{row.qty}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-[#616161]">
                  {formatCurrency(row.unitCost)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                  {formatCurrency(row.lineTotal)}
                </td>
              </tr>
            ))}
            {decorationRows.map((row, i) => (
              <tr key={`d-${i}`} className="border-t border-[#f0f0f0] bg-[#fafcff]">
                <td className="px-3 py-2.5">
                  <p className="font-medium text-[#303030]">{row.description}</p>
                  {row.detail ? (
                    <p className="text-[11px] text-[#8a8a8a]">{row.detail}</p>
                  ) : null}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{row.qty}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-[#616161]">
                  {formatCurrency(row.unitCost)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                  {formatCurrency(row.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-[#fafafa]">
            <tr className="border-t border-[#ebebeb]">
              <td colSpan={3} className="px-3 py-2 text-right text-[12px] text-[#616161]">
                Subtotal
              </td>
              <td className="px-3 py-2 text-right font-medium tabular-nums">
                {formatCurrency(est.subtotal)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="px-3 py-2 text-right text-[12px] text-[#616161]">
                Tax
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatCurrency(est.tax)}
              </td>
            </tr>
            <tr className="border-t border-[#ebebeb]">
              <td colSpan={3} className="px-3 py-3 text-right text-[14px] font-semibold text-[#303030]">
                Total
              </td>
              <td
                className="px-3 py-3 text-right text-[18px] font-bold tabular-nums"
                style={{ color: "var(--review-accent)" }}
              >
                {formatCurrency(est.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function ProofStep({
  proof,
  embedded = false,
}: {
  proof: ReviewProof;
  embedded?: boolean;
}) {
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
    </div>
  );
}

function MessagesPanel({
  messages,
  draft,
  onDraftChange,
  onSend,
  acting,
  accent,
  readOnly = false,
}: {
  messages: CustomerReviewSession["messages"];
  draft: string;
  onDraftChange: (v: string) => void;
  onSend: () => void;
  acting: boolean;
  accent: string;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(messages && messages.length > 0);

  return (
    <div className="rounded-xl border border-[#ebebeb] bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-[13px] font-medium text-[#303030]"
      >
        <span className="inline-flex items-center gap-2">
          <MessageSquare className="size-4 text-[#616161]" />
          Messages ({messages?.length || 0})
        </span>
        <ChevronRight
          className={cn(
            "size-4 text-[#8a8a8a] transition-transform",
            open && "rotate-90"
          )}
        />
      </button>

      {open ? (
        <div className="border-t border-[#ebebeb] px-3 py-3">
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {(messages || []).length === 0 ? (
              <p className="text-[12px] text-[#8a8a8a]">
                No messages yet. Ask a question anytime.
              </p>
            ) : (
              (messages || []).map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "rounded-lg px-3 py-2 text-[13px]",
                    m.role === "customer"
                      ? "ml-4 bg-[#f4f7fd] text-[#303030]"
                      : "mr-4 bg-[#fafafa] text-[#303030]"
                  )}
                >
                  <p className="text-[11px] font-medium text-[#8a8a8a]">
                    {m.author} ·{" "}
                    {new Date(m.timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap">{m.content}</p>
                </div>
              ))
            )}
          </div>
          {!readOnly ? (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                placeholder="Ask a question…"
                className="min-w-0 flex-1 rounded-lg border border-[#e3e3e3] px-3 py-2 text-[13px] outline-none focus:border-[var(--review-accent)]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
              />
              <button
                type="button"
                disabled={acting || !draft.trim()}
                onClick={onSend}
                className="shrink-0 rounded-lg px-4 text-[13px] font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: accent }}
              >
                Send
              </button>
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-[#8a8a8a]">
              Customers can send messages from their review link.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

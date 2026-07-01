"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { CustomerReviewFlow } from "@/components/review/customer-review-flow";
import { useCustomerPortal } from "@/components/portal/customer-portal-provider";
import {
  fetchCustomerPortalOrder,
  portalHomePath,
  portalStatusLabel,
  portalStatusTone,
  reactivatePortalUrl,
  type CustomerPortalOrderSession,
} from "@/lib/customer-portal-api";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CustomerPortalOrderView({ orderId }: { orderId: string }) {
  const { token, accent, refresh: refreshDashboard } = useCustomerPortal();
  const [session, setSession] = useState<CustomerPortalOrderSession | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomerPortalOrder(token, orderId);
      setSession(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load this order."
      );
    } finally {
      setLoading(false);
    }
  }, [token, orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSessionUpdate = (next: CustomerPortalOrderSession) => {
    setSession(next);
    void refreshDashboard();
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-[#616161]">
        <Loader2 className="size-6 animate-spin" style={{ color: accent }} />
        <p className="text-[14px]">Loading order…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[#ebebeb] bg-white p-8 text-center shadow-sm">
        <p className="text-[18px] font-semibold text-[#303030]">
          Couldn&apos;t load this order
        </p>
        <p className="mt-2 text-[14px] text-[#616161]">{error}</p>
        <Link
          href={portalHomePath(token)}
          className="mt-4 inline-flex text-[13px] font-medium underline"
          style={{ color: accent }}
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (session?.expired) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-[#ebebeb] bg-white p-8 text-center shadow-sm">
        <RefreshCw className="mx-auto size-8 text-[#616161]" />
        <h1 className="mt-4 text-[18px] font-semibold text-[#303030]">
          Your portal link has expired
        </h1>
        <a
          href={session.reactivateUrl || reactivatePortalUrl(token)}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg px-6 text-[14px] font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          Renew portal access
        </a>
      </div>
    );
  }

  if (!session?.order) return null;

  const status = session.order.status;
  const tone = portalStatusTone(status);
  const estimate = session.estimate;
  const needsAction =
    !session.order.quoteApproved ||
    (session.proofs || []).some((proof) => proof.artwork.status !== "approved");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={portalHomePath(token)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e3e3e3] bg-white px-3 text-[13px] font-medium text-[#303030] transition-colors hover:bg-[#fafafa]"
        >
          <ArrowLeft className="size-3.5" />
          All orders
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-[20px] font-semibold text-[#303030] sm:text-[22px]">
            Order {session.order.number}
          </h1>
          <p className="text-[13px] text-[#616161]">
            In-hands {formatDate(session.order.inHandsDate)}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold",
            tone === "warning" && "bg-[#fff1d6] text-[#8a6116]",
            tone === "info" && "bg-[#ebf4ff] text-[#2c6ecb]",
            tone === "success" && "bg-[#f1faf1] text-[#0d5c2e]",
            tone === "neutral" && "bg-[#f1f1f1] text-[#616161]"
          )}
        >
          {portalStatusLabel(status)}
        </span>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <CustomerReviewFlow
            portalToken={token}
            orderId={orderId}
            initialSession={session}
            mode="customer"
            embedded
            hideHeader
            onSessionChange={handleSessionUpdate}
          />
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <section
            className="overflow-hidden rounded-2xl border shadow-sm"
            style={{ borderColor: `${accent}33` }}
          >
            <div
              className="px-4 py-3 text-[13px] font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              Order summary
            </div>
            <div className="space-y-2.5 bg-white p-4 text-[13px]">
              <div className="flex justify-between gap-3">
                <span className="text-[#616161]">Subtotal</span>
                <span className="font-medium tabular-nums text-[#303030]">
                  {formatCurrency(estimate?.subtotal ?? 0)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[#616161]">Tax</span>
                <span className="font-medium tabular-nums text-[#303030]">
                  {formatCurrency(estimate?.tax ?? 0)}
                </span>
              </div>
              <div className="flex justify-between gap-3 border-t border-[#f1f1f1] pt-2.5">
                <span className="font-semibold text-[#303030]">Total</span>
                <span className="font-semibold tabular-nums text-[#303030]">
                  {formatCurrency(estimate?.total ?? 0)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[#616161]">Paid</span>
                <span className="font-medium tabular-nums text-[#303030]">
                  {formatCurrency(estimate?.paid ?? 0)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[#616161]">Balance due</span>
                <span className="font-semibold tabular-nums text-[#303030]">
                  {formatCurrency(estimate?.balance ?? 0)}
                </span>
              </div>
            </div>
          </section>

          {needsAction ? (
            <section className="rounded-2xl border border-[#f0d9a8] bg-[#fff8eb] p-4">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8a6116]">
                Action required
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-[#616161]">
                {!session.order.quoteApproved
                  ? "Review and approve your estimate, then sign off on each proof."
                  : "One or more proofs still need your approval."}
              </p>
            </section>
          ) : (
            <section className="rounded-2xl border border-[#cdeccd] bg-[#f1faf1] p-4">
              <p className="text-[13px] font-medium text-[#0d5c2e]">
                Estimate and proofs approved — thank you!
              </p>
            </section>
          )}

          {session.shop?.email ? (
            <p className="text-center text-[12px] text-[#8a8a8a]">
              Questions about this order?{" "}
              <a
                href={`mailto:${session.shop.email}`}
                className="font-medium underline"
                style={{ color: accent }}
              >
                Email {session.shop.name}
              </a>
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

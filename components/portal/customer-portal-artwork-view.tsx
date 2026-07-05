"use client";

import { useEffect, useState } from "react";
import { ImageIcon, Loader2 } from "lucide-react";
import { useCustomerPortal } from "@/components/portal/customer-portal-provider";
import {
  fetchCustomerPortalArtwork,
  type CustomerPortalArtworkItem,
  type CustomerPortalArtworkResponse,
} from "@/lib/customer-portal-api";
import {
  dashboardCardClass,
  dashboardSectionTitleClass,
} from "@/lib/dashboard-styles";
import { decorationLabel, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

function ArtworkStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
        status === "approved" && "bg-[#f1faf1] text-[#0d5c2e]",
        status === "revision_requested" && "bg-[#fff1d6] text-[#8a6116]",
        status === "pending" && "bg-[#ebf4ff] text-[#2c6ecb]"
      )}
    >
      {status === "approved"
        ? "Approved"
        : status === "revision_requested"
          ? "Revision requested"
          : "Pending review"}
    </span>
  );
}

function ArtworkCard({ design }: { design: CustomerPortalArtworkItem }) {
  return (
    <article className="overflow-hidden rounded-xl border border-[#ebebeb] bg-white">
      <div className="relative aspect-[4/3] bg-[#f6f6f7]">
        {design.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={design.previewUrl}
            alt={design.name}
            className="size-full object-contain p-3"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center text-[#b5b5b5]">
            <ImageIcon className="size-10" strokeWidth={1.25} />
            <p className="mt-2 text-[12px]">No preview</p>
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-semibold leading-snug text-[#303030]">
            {design.name}
          </h3>
          <ArtworkStatusBadge status={design.status} />
        </div>
        {design.locationLabel ? (
          <p className="text-[13px] text-[#616161]">{design.locationLabel}</p>
        ) : null}
        {design.decoration ? (
          <p className="text-[12px] text-[#8a8a8a]">
            {decorationLabel(design.decoration)}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-[12px] text-[#8a8a8a]">
          {design.sourceOrderNumber ? (
            <span>Order {design.sourceOrderNumber}</span>
          ) : null}
          {design.lastUsedAt ? (
            <span>Updated {formatDate(design.lastUsedAt)}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function CustomerPortalArtworkView() {
  const { token, accent } = useCustomerPortal();
  const [data, setData] = useState<CustomerPortalArtworkResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchCustomerPortalArtwork(token);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load artwork."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const designs = data?.designs ?? [];

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-[#616161]">
        <Loader2 className="size-6 animate-spin" style={{ color: accent }} />
        <p className="text-[14px]">Loading your artwork…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[#f5b5b5] bg-[#fff1f1] px-4 py-6 text-center text-[14px] text-[#8f1f1f]">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={dashboardSectionTitleClass}>Your artwork</h1>
        <p className="mt-1 max-w-2xl text-[14px] text-[#616161]">
          All designs linked to your account. Approved artwork can be reused on
          future orders.
        </p>
      </div>

      {designs.length === 0 ? (
        <section className={cn(dashboardCardClass, "px-6 py-12 text-center")}>
          <div
            className="mx-auto flex size-12 items-center justify-center rounded-xl bg-[#f1f1f1]"
            style={{ color: accent }}
          >
            <ImageIcon className="size-5" strokeWidth={1.75} />
          </div>
          <h2 className="mt-4 text-[17px] font-semibold text-[#303030]">
            No artwork yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-[#616161]">
            When your shop uploads proofs or saves designs to your account,
            they&apos;ll show up here.
          </p>
        </section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map((design) => (
            <ArtworkCard key={design.id} design={design} />
          ))}
        </div>
      )}
    </div>
  );
}

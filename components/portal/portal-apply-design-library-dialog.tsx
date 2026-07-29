"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookMarked,
  ImageIcon,
  Loader2,
  Search,
  Shirt,
} from "lucide-react";
import { usePortalAccess } from "@/components/portal/use-portal-access";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchCustomerPortalArtwork,
  type CustomerPortalArtworkItem,
} from "@/lib/customer-portal-api";
import { decorationLabel, formatDate } from "@/lib/format";
import {
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

function statusLabel(status: CustomerPortalArtworkItem["status"]) {
  if (status === "approved") return "Approved";
  if (status === "revision_requested") return "Revision";
  return "Pending";
}

function DesignCard({
  design,
  selected,
  onSelect,
}: {
  design: CustomerPortalArtworkItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "overflow-hidden rounded-xl border bg-white text-left transition-colors",
        selected
          ? "border-[#2c6ecb] ring-2 ring-[#2c6ecb]/20"
          : "border-[#ebebeb] hover:border-[#c9cccf]"
      )}
    >
      <div className="relative aspect-[4/3] bg-[#f6f6f7]">
        {design.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={design.previewUrl}
            alt={design.name}
            className="size-full object-contain p-2"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[#c9cccf]">
            <Shirt className="size-8" strokeWidth={1.5} />
          </div>
        )}
        <span
          className={cn(
            "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold",
            design.status === "approved"
              ? "bg-[#eaf6ee] text-[#0d5c2e]"
              : design.status === "revision_requested"
                ? "bg-[#fff4d6] text-[#8a6116]"
                : "bg-[#ebf4ff] text-[#2c6ecb]"
          )}
        >
          {statusLabel(design.status)}
        </span>
      </div>
      <div className="space-y-0.5 px-3 py-2.5">
        <p className="truncate text-[13px] font-semibold text-[#303030]">
          {design.name}
        </p>
        <p className="truncate text-[11px] text-[#8a8a8a]">
          {[
            design.locationLabel,
            design.decoration ? decorationLabel(design.decoration) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </button>
  );
}

export function PortalApplyDesignLibraryDialog({
  open,
  onOpenChange,
  accent,
  locationKey,
  locationLabel,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accent: string;
  locationKey?: string;
  locationLabel?: string;
  onApply: (design: CustomerPortalArtworkItem) => void;
}) {
  const { mode, getAccessToken } = usePortalAccess();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [designs, setDesigns] = useState<CustomerPortalArtworkItem[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preferMatchingLocation, setPreferMatchingLocation] = useState(true);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedId(null);
    setError(null);
    setPreferMatchingLocation(true);
    setLoading(true);
    void (async () => {
      try {
        const token = await getAccessToken();
        const result = await fetchCustomerPortalArtwork(token, {
          mode: mode === "auth" ? "auth" : "invite",
        });
        setDesigns(
          (result.designs || []).filter((design) => Boolean(design.previewUrl))
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load your design library."
        );
        setDesigns([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, getAccessToken, mode]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let rows = designs.slice();

    if (preferMatchingLocation && locationKey) {
      const matched = rows.filter(
        (design) =>
          design.locationKey === locationKey ||
          (locationLabel &&
            design.locationLabel?.toLowerCase() ===
              locationLabel.toLowerCase())
      );
      if (matched.length > 0) rows = matched;
    }

    // Prefer approved designs first.
    rows.sort((a, b) => {
      const aScore = a.status === "approved" ? 0 : 1;
      const bScore = b.status === "approved" ? 0 : 1;
      if (aScore !== bScore) return aScore - bScore;
      return (
        new Date(b.lastUsedAt || 0).getTime() -
        new Date(a.lastUsedAt || 0).getTime()
      );
    });

    if (!needle) return rows;
    return rows.filter((design) => {
      const haystack = [
        design.name,
        design.locationLabel,
        design.imprintCustomLabel,
        design.sourceOrderNumber,
        design.decoration ? decorationLabel(design.decoration) : "",
        ...(design.pmsCodes || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [designs, query, preferMatchingLocation, locationKey, locationLabel]);

  const selected = designs.find((design) => design.id === selectedId) || null;
  const matchingCount =
    locationKey || locationLabel
      ? designs.filter(
          (design) =>
            design.locationKey === locationKey ||
            (locationLabel &&
              design.locationLabel?.toLowerCase() ===
                locationLabel.toLowerCase())
        ).length
      : 0;

  const handleApply = () => {
    if (!selected) return;
    onApply(selected);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[min(88vh,760px)] max-h-[min(88vh,760px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
      >
        <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-5 py-4">
          <DialogTitle className={dashboardTaskTitleClass}>
            Apply from your library
          </DialogTitle>
          <p className={dashboardTaskDetailClass}>
            Reuse an approved design — like a neck label — so it&apos;s uploaded
            once and attached here.
            {locationLabel ? ` Showing options for ${locationLabel}.` : ""}
          </p>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[12rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#8a8a8a]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, location, order…"
                className="h-10 w-full rounded-lg border border-[#ebebeb] bg-white pl-9 pr-3 text-[13px] text-[#303030] outline-none focus:border-[#c9cccf]"
              />
            </div>
            {matchingCount > 0 ? (
              <button
                type="button"
                onClick={() => setPreferMatchingLocation((v) => !v)}
                className={cn(
                  "h-10 rounded-lg border px-3 text-[12px] font-medium",
                  preferMatchingLocation
                    ? "border-transparent text-white"
                    : "border-[#ebebeb] bg-white text-[#303030] hover:bg-[#fafafa]"
                )}
                style={
                  preferMatchingLocation
                    ? { backgroundColor: accent }
                    : undefined
                }
              >
                {preferMatchingLocation
                  ? `This location (${matchingCount})`
                  : "All designs"}
              </button>
            ) : null}
          </div>

          {loading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-[#616161]">
              <Loader2
                className="size-6 animate-spin"
                style={{ color: accent }}
              />
              <p className="text-[13px]">Loading your design library…</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-[#f5b5b5] bg-[#fff1f1] px-4 py-3 text-[13px] text-[#8f1f1f]">
              {error}
            </div>
          ) : designs.length === 0 ? (
            <div
              className={cn(
                dashboardInsetSurfaceClass,
                "flex flex-1 flex-col items-center justify-center px-4 py-10 text-center"
              )}
            >
              <ImageIcon className="size-8 text-[#c9cccf]" strokeWidth={1.5} />
              <p className="mt-3 text-[14px] font-semibold text-[#303030]">
                No saved designs yet
              </p>
              <p className="mt-1 max-w-sm text-[13px] text-[#616161]">
                When your shop saves proofs to your artwork library, you can
                reuse them here on future order requests.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-[13px] text-[#8a8a8a]">
              No designs match that search.
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((design) => (
                  <DesignCard
                    key={design.id}
                    design={design}
                    selected={selectedId === design.id}
                    onSelect={() => setSelectedId(design.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {selected ? (
            <div className="shrink-0 rounded-xl border border-[#ebebeb] bg-[#fafafa] px-3.5 py-3">
              <p className="text-[12px] font-semibold text-[#303030]">
                Selected · {selected.name}
              </p>
              <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                {[
                  selected.locationLabel,
                  selected.sourceOrderNumber
                    ? `Order ${selected.sourceOrderNumber}`
                    : null,
                  selected.lastUsedAt
                    ? `Updated ${formatDate(selected.lastUsedAt)}`
                    : null,
                  (selected.pmsCodes || []).length
                    ? `${selected.pmsCodes!.length} PMS`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 items-center rounded-lg border border-[#ebebeb] bg-white px-3.5 text-[13px] font-medium text-[#303030] hover:bg-[#f6f6f7]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selected}
            onClick={handleApply}
            className={cn(
              dashboardPrimaryButtonClass,
              "h-9 px-4 text-[13px] disabled:opacity-50"
            )}
            style={accent ? { backgroundColor: accent } : undefined}
          >
            <BookMarked className="size-3.5" />
            Use this design
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

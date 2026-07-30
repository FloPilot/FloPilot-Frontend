"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ClipboardCheck,
  Lightbulb,
  Loader2,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { FloPilotWatermark } from "@/components/branding/flopilot-watermark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  getPublicClientStore,
  submitClientStoreOrder,
  submitClientStoreVote,
} from "@/lib/api";
import {
  clearClientStoreReview,
  readClientStoreReview,
  readClientStoreVoter,
  reviewDecisionKey,
  setClientStoreVoterName,
  upsertClientStoreVote,
  writeClientStoreReview,
  type StoredClientStoreReviewDecision,
  type StoredClientStoreVote,
} from "@/lib/client-store-review";
import type {
  ClientStoreColorVariant,
  ClientStoreReviewDecision,
  ClientStoreReviewPhase,
  ClientStoreReviewVote,
  ClientStoreVoteSummaryRow,
  PublicClientStore,
  PublicClientStoreProduct,
} from "@/lib/client-stores";
import {
  clientStoreReviewPhase,
  getEnabledColorVariants,
  getMockupsForColor,
  getPrimaryMockupUrl,
} from "@/lib/client-stores";
import {
  CUSTOMER_ACCENT_OPTIONS,
  type CustomerAccent,
} from "@/lib/production-customer-colors";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

function accentFor(key?: string): CustomerAccent {
  return (
    CUSTOMER_ACCENT_OPTIONS.find((opt) => opt.key === key) ||
    CUSTOMER_ACCENT_OPTIONS[0]
  );
}

function decisionMapFromRows(
  rows: StoredClientStoreReviewDecision[]
): Record<string, StoredClientStoreReviewDecision> {
  const next: Record<string, StoredClientStoreReviewDecision> = {};
  for (const row of rows) {
    next[reviewDecisionKey(row.productId, row.color)] = {
      ...row,
      color: row.color || "",
    };
  }
  return next;
}

function voteMapFromRows(
  rows: StoredClientStoreVote[]
): Record<string, ClientStoreReviewVote> {
  const next: Record<string, ClientStoreReviewVote> = {};
  for (const row of rows) {
    next[reviewDecisionKey(row.productId, row.color)] = row.vote;
  }
  return next;
}

function voteSummaryMap(
  rows: ClientStoreVoteSummaryRow[] | undefined
): Record<string, ClientStoreVoteSummaryRow> {
  const next: Record<string, ClientStoreVoteSummaryRow> = {};
  for (const row of rows || []) {
    next[row.key || reviewDecisionKey(row.productId, row.color)] = row;
  }
  return next;
}

/** Color options to review for a product (one synthetic option if none). */
function reviewColorOptions(
  product: PublicClientStoreProduct
): Array<Pick<ClientStoreColorVariant, "id" | "name" | "colorHex" | "swatchUrl">> {
  const variants = getEnabledColorVariants(product);
  if (variants.length > 0) {
    return variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      colorHex: variant.colorHex,
      swatchUrl: variant.swatchUrl,
    }));
  }
  return [{ id: "default", name: "" }];
}

function VoteTally({
  up,
  down,
  compact,
}: {
  up: number;
  down: number;
  compact?: boolean;
}) {
  if (up === 0 && down === 0) {
    return (
      <span className={cn("text-[#b0b0b5]", compact ? "text-[11px]" : "text-[12px]")}>
        No votes yet
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-semibold tabular-nums",
        compact ? "text-[11px]" : "text-[12px]"
      )}
    >
      <span className="inline-flex items-center gap-1 text-emerald-700">
        <ThumbsUp className={compact ? "size-3" : "size-3.5"} />
        {up}
      </span>
      <span className="inline-flex items-center gap-1 text-[#8a8a8a]">
        <ThumbsDown className={compact ? "size-3" : "size-3.5"} />
        {down}
      </span>
    </span>
  );
}

function ColorSwatch({
  name,
  colorHex,
  swatchUrl,
  size = "md",
  selected,
  decision,
  myVote,
  onClick,
}: {
  name: string;
  colorHex?: string;
  swatchUrl?: string;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  decision?: ClientStoreReviewDecision;
  myVote?: ClientStoreReviewVote;
  onClick?: () => void;
}) {
  const dim =
    size === "lg" ? "size-9" : size === "sm" ? "size-5" : "size-7";
  const fill = colorHex || "#d4d4d8";
  const title = name || "Default";

  const inner = (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full border",
        dim,
        selected ? "ring-2 ring-[#303030] ring-offset-2" : "border-[#c9cccf]",
        decision === "included" && "ring-2 ring-emerald-500 ring-offset-1",
        decision === "excluded" && "opacity-50",
        myVote === "up" && !decision && "ring-2 ring-emerald-500 ring-offset-1",
        myVote === "down" && !decision && "opacity-50"
      )}
      style={{
        background: swatchUrl ? undefined : fill,
      }}
      title={title}
    >
      {swatchUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={swatchUrl}
          alt=""
          className="size-full rounded-full object-cover"
        />
      ) : null}
      {decision === "included" || myVote === "up" ? (
        <span className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
          {decision === "included" ? (
            <Check className="size-2.5" strokeWidth={3} />
          ) : (
            <ThumbsUp className="size-2" strokeWidth={3} />
          )}
        </span>
      ) : null}
      {decision === "excluded" || myVote === "down" ? (
        <span className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-[#616161] text-white shadow-sm">
          {decision === "excluded" ? (
            <X className="size-2.5" strokeWidth={3} />
          ) : (
            <ThumbsDown className="size-2" strokeWidth={3} />
          )}
        </span>
      ) : null}
    </span>
  );

  if (!onClick) return inner;
  return (
    <button type="button" onClick={onClick} className="rounded-full">
      {inner}
    </button>
  );
}

function productDecisionSummary(
  product: PublicClientStoreProduct,
  decisions: Record<string, StoredClientStoreReviewDecision>
): {
  total: number;
  reviewed: number;
  included: number;
  excluded: number;
  status: "none" | "partial" | "all-included" | "all-excluded" | "mixed";
} {
  const colors = reviewColorOptions(product);
  let included = 0;
  let excluded = 0;
  for (const color of colors) {
    const row = decisions[reviewDecisionKey(product.id, color.name)];
    if (row?.decision === "included") included += 1;
    if (row?.decision === "excluded") excluded += 1;
  }
  const reviewed = included + excluded;
  const total = colors.length;
  let status: "none" | "partial" | "all-included" | "all-excluded" | "mixed" =
    "none";
  if (reviewed === 0) status = "none";
  else if (reviewed < total) status = "partial";
  else if (included === total) status = "all-included";
  else if (excluded === total) status = "all-excluded";
  else status = "mixed";
  return { total, reviewed, included, excluded, status };
}

function productVoteSummary(
  product: PublicClientStoreProduct,
  myVotes: Record<string, ClientStoreReviewVote>,
  totals: Record<string, ClientStoreVoteSummaryRow>
): {
  total: number;
  voted: number;
  up: number;
  down: number;
} {
  const colors = reviewColorOptions(product);
  let voted = 0;
  let up = 0;
  let down = 0;
  for (const color of colors) {
    const key = reviewDecisionKey(product.id, color.name);
    if (myVotes[key]) voted += 1;
    const row = totals[key];
    up += row?.up || 0;
    down += row?.down || 0;
  }
  return { total: colors.length, voted, up, down };
}

function ReviewProductCard({
  product,
  phase,
  decisions,
  myVotes,
  voteTotals,
  showPrices,
  onOpen,
}: {
  product: PublicClientStoreProduct;
  phase: ClientStoreReviewPhase;
  decisions: Record<string, StoredClientStoreReviewDecision>;
  myVotes: Record<string, ClientStoreReviewVote>;
  voteTotals: Record<string, ClientStoreVoteSummaryRow>;
  showPrices: boolean;
  onOpen: () => void;
}) {
  const colors = reviewColorOptions(product);
  const summary = productDecisionSummary(product, decisions);
  const voteSummary = productVoteSummary(product, myVotes, voteTotals);
  const isVoting = phase === "voting";
  const previewColor =
    colors.find((color) => {
      const key = reviewDecisionKey(product.id, color.name);
      if (isVoting) return myVotes[key] === "up";
      return decisions[key]?.decision === "included";
    }) || colors[0];
  const mockup =
    getMockupsForColor(product, previewColor?.name || undefined)[0] ||
    getPrimaryMockupUrl(product);

  const badge =
    isVoting
      ? voteSummary.voted > 0
        ? voteSummary.voted === voteSummary.total
          ? `${voteSummary.voted} voted`
          : `${voteSummary.voted}/${voteSummary.total} voted`
        : null
      : summary.reviewed > 0
        ? summary.status === "all-included"
          ? "Include"
          : summary.status === "all-excluded"
            ? "Pass"
            : `${summary.reviewed}/${summary.total} reviewed`
        : null;

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border bg-white transition-[border-color,box-shadow,transform] duration-300",
        !isVoting && summary.status === "all-included"
          ? "border-emerald-300 shadow-[0_10px_28px_rgba(16,185,129,0.12)]"
          : !isVoting && summary.status === "all-excluded"
            ? "border-[#e3e3e3] opacity-[0.72]"
            : (!isVoting &&
                  (summary.status === "partial" || summary.status === "mixed")) ||
                (isVoting && voteSummary.voted > 0)
              ? "border-[#c4d7f2] shadow-[0_8px_22px_rgba(44,110,203,0.08)]"
              : "border-[#ebebeb] shadow-[0_6px_20px_rgba(26,26,26,0.05)] hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(26,26,26,0.08)]"
      )}
    >
      <button type="button" onClick={onOpen} className="relative text-left">
        <div className="aspect-[4/5] bg-[#f7f7f8]">
          {mockup ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mockup}
              alt=""
              className="size-full object-contain p-5 transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-[12px] text-[#8a8a8a]">
              No image
            </div>
          )}
        </div>
        {badge ? (
          <span
            className={cn(
              "absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm",
              !isVoting && summary.status === "all-included"
                ? "bg-emerald-600"
                : !isVoting && summary.status === "all-excluded"
                  ? "bg-[#616161]"
                  : "bg-[#2c6ecb]"
            )}
          >
            {!isVoting && summary.status === "all-included" ? (
              <Check className="size-3" strokeWidth={2.5} />
            ) : null}
            {!isVoting && summary.status === "all-excluded" ? (
              <X className="size-3" strokeWidth={2.5} />
            ) : null}
            {isVoting ? <ThumbsUp className="size-3" strokeWidth={2.5} /> : null}
            {badge}
          </span>
        ) : null}
      </button>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <button type="button" onClick={onOpen} className="text-left">
          <p className="text-[14px] font-semibold leading-snug text-[#1f2430]">
            {product.name}
          </p>
          <p className="mt-1 text-[12px] text-[#7a7f8c]">
            {[product.brand, `${colors.length} color${colors.length === 1 ? "" : "s"}`]
              .filter(Boolean)
              .join(" · ") || "Apparel"}
          </p>
          {showPrices && product.sellPrice != null ? (
            <p className="mt-1.5 text-[13px] font-semibold tabular-nums text-[#303030]">
              {formatCurrency(product.sellPrice)}
            </p>
          ) : null}
          {product.insights ? (
            <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-[#5a6478]">
              {product.insights}
            </p>
          ) : product.description ? (
            <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-[#5a6478]">
              {product.description}
            </p>
          ) : null}
        </button>

        {(voteSummary.up > 0 || voteSummary.down > 0) && (
          <VoteTally up={voteSummary.up} down={voteSummary.down} compact />
        )}

        {colors.some((color) => color.name) ? (
          <div className="flex flex-wrap items-center gap-2">
            {colors.map((color) => {
              const key = reviewDecisionKey(product.id, color.name);
              return (
                <ColorSwatch
                  key={color.id}
                  name={color.name}
                  colorHex={color.colorHex}
                  swatchUrl={color.swatchUrl}
                  size="sm"
                  decision={decisions[key]?.decision}
                  myVote={isVoting ? myVotes[key] : undefined}
                  onClick={onOpen}
                />
              );
            })}
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          className="mt-auto h-9 rounded-lg border-[#e3e3e3] text-[12px] font-semibold text-[#303030]"
          onClick={onOpen}
        >
          {isVoting ? "Vote on colors" : "Review colors"}
        </Button>
      </div>
    </article>
  );
}

function ReviewProductDetail({
  product,
  phase,
  decisions,
  myVotes,
  voteTotals,
  accentHex,
  showPrices,
  brandFallback,
  votingBusyKey,
  voteError,
  onBack,
  onDecide,
  onNoteChange,
  onVote,
}: {
  product: PublicClientStoreProduct;
  phase: ClientStoreReviewPhase;
  decisions: Record<string, StoredClientStoreReviewDecision>;
  myVotes: Record<string, ClientStoreReviewVote>;
  voteTotals: Record<string, ClientStoreVoteSummaryRow>;
  accentHex: string;
  showPrices: boolean;
  brandFallback?: string;
  votingBusyKey: string | null;
  voteError?: string | null;
  onBack: () => void;
  onDecide: (
    color: string,
    decision: ClientStoreReviewDecision,
    note?: string
  ) => void;
  onNoteChange: (color: string, note: string) => void;
  onVote: (color: string, vote: ClientStoreReviewVote) => void;
}) {
  const colors = reviewColorOptions(product);
  const [color, setColor] = useState(colors[0]?.name || "");
  const activeKey = reviewDecisionKey(product.id, color);
  const activeDecision = decisions[activeKey] || undefined;
  const activeVote = myVotes[activeKey];
  const activeTotals = voteTotals[activeKey];
  const mockups = getMockupsForColor(product, color || undefined);
  const [mockupIndex, setMockupIndex] = useState(0);
  const [localNote, setLocalNote] = useState(activeDecision?.note || "");
  const activeMockup =
    mockups[mockupIndex] || getPrimaryMockupUrl(product);
  const activeColorMeta =
    colors.find((row) => row.name === color) || colors[0];
  const summary = productDecisionSummary(product, decisions);
  const isVoting = phase === "voting";
  const busy = votingBusyKey === activeKey;

  useEffect(() => {
    setColor(colors[0]?.name || "");
    setMockupIndex(0);
  }, [product.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLocalNote(activeDecision?.note || "");
    setMockupIndex(0);
  }, [color, product.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLocalNote(activeDecision?.note || "");
  }, [activeDecision?.note]);

  return (
    <div className="mx-auto grid max-w-[1100px] gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-10">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#616161] transition-colors hover:text-[#303030]"
        >
          <ArrowLeft className="size-3.5" />
          Back to products
        </button>
        <div className="overflow-hidden rounded-2xl border border-[#ebebeb] bg-[#f7f7f8]">
          <div className="aspect-square">
            {activeMockup ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeMockup}
                alt=""
                className="size-full object-contain p-8"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-sm text-[#8a8a8a]">
                No image
              </div>
            )}
          </div>
          {mockups.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto border-t border-[#ebebeb] bg-white p-3">
              {mockups.map((url, index) => (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  onClick={() => setMockupIndex(index)}
                  className={cn(
                    "size-14 shrink-0 overflow-hidden rounded-lg border bg-[#f7f7f8]",
                    index === mockupIndex
                      ? "border-[#303030]"
                      : "border-transparent"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="size-full object-contain p-1" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8a8a8a]">
          {product.brand || brandFallback || "Product"}
        </p>
        <h1 className="mt-2 text-[1.75rem] font-semibold tracking-tight text-[#1f2430]">
          {product.name}
        </h1>
        {showPrices && product.sellPrice != null ? (
          <p className="mt-2 text-[15px] font-semibold tabular-nums text-[#303030]">
            {formatCurrency(product.sellPrice)}
          </p>
        ) : null}

        {product.description ? (
          <p className="mt-3 text-[14px] leading-relaxed text-[#5a6478]">
            {product.description}
          </p>
        ) : null}

        {product.insights ? (
          <div className="mt-4 flex gap-2.5 rounded-xl border border-amber-100 bg-amber-50/70 px-3.5 py-3">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p className="text-[13px] leading-relaxed text-[#5a4a2a]">
              {product.insights}
            </p>
          </div>
        ) : null}

        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Colors to {isVoting ? "vote on" : "review"}
            </p>
            <p className="text-[11px] tabular-nums text-[#8a8a8a]">
              {isVoting
                ? `${Object.keys(myVotes).filter((key) =>
                    colors.some(
                      (c) => reviewDecisionKey(product.id, c.name) === key
                    )
                  ).length} of ${summary.total} voted`
                : `${summary.reviewed} of ${summary.total} decided`}
            </p>
          </div>
          <div className="mt-3 space-y-2">
            {colors.map((option) => {
              const key = reviewDecisionKey(product.id, option.name);
              const row = decisions[key];
              const mine = myVotes[key];
              const totals = voteTotals[key];
              const isActive = color === option.name;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setColor(option.name)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                    isActive
                      ? "border-[#303030] bg-[#fafafa]"
                      : "border-[#ebebeb] bg-white hover:border-[#c9cccf]"
                  )}
                >
                  <ColorSwatch
                    name={option.name}
                    colorHex={option.colorHex}
                    swatchUrl={option.swatchUrl}
                    size="md"
                    selected={isActive}
                    decision={row?.decision}
                    myVote={isVoting ? mine : undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[#303030]">
                      {option.name || "Standard"}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p
                        className={cn(
                          "text-[11px] font-medium",
                          isVoting
                            ? mine === "up"
                              ? "text-emerald-700"
                              : mine === "down"
                                ? "text-[#8a8a8a]"
                                : "text-[#b0b0b5]"
                            : row?.decision === "included"
                              ? "text-emerald-700"
                              : row?.decision === "excluded"
                                ? "text-[#8a8a8a]"
                                : "text-[#b0b0b5]"
                        )}
                      >
                        {isVoting
                          ? mine === "up"
                            ? "You liked this"
                            : mine === "down"
                              ? "You passed"
                              : "Not voted yet"
                          : row?.decision === "included"
                            ? "Included"
                            : row?.decision === "excluded"
                              ? "Passed"
                              : "Not reviewed yet"}
                      </p>
                      <VoteTally
                        up={totals?.up || 0}
                        down={totals?.down || 0}
                        compact
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[#ebebeb] bg-white p-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            {isVoting ? "Voting on" : "Reviewing"}
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ColorSwatch
                name={activeColorMeta?.name || ""}
                colorHex={activeColorMeta?.colorHex}
                swatchUrl={activeColorMeta?.swatchUrl}
                size="lg"
                decision={activeDecision?.decision}
                myVote={isVoting ? activeVote : undefined}
              />
              <p className="text-[15px] font-semibold text-[#1f2430]">
                {activeColorMeta?.name || "Standard"}
              </p>
            </div>
            <VoteTally
              up={activeTotals?.up || 0}
              down={activeTotals?.down || 0}
            />
          </div>

          {isVoting ? (
            <>
              {voteError ? (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                  {voteError}
                </p>
              ) : null}
              <div className="mt-4 grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                className={cn(
                  "h-12 rounded-xl border-[#e3e3e3] text-[13px] font-semibold",
                  activeVote === "down" &&
                    "border-[#303030] bg-[#303030] text-white hover:bg-[#303030] hover:text-white"
                )}
                onClick={() => onVote(color, "down")}
              >
                {busy && activeVote !== "up" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ThumbsDown className="size-4" />
                )}
                Thumbs down
              </Button>
              <Button
                type="button"
                disabled={busy}
                className={cn(
                  "h-12 rounded-xl text-[13px] font-semibold text-white hover:opacity-95",
                  activeVote === "up" && "ring-2 ring-offset-2 ring-emerald-500"
                )}
                style={{ background: accentHex }}
                onClick={() => onVote(color, "up")}
              >
                {busy && activeVote !== "down" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ThumbsUp className="size-4" />
                )}
                Thumbs up
              </Button>
            </div>
            </>
          ) : (
            <>
              <div className="mt-4">
                <Label htmlFor="review-note" className="text-[12px] text-[#616161]">
                  Optional note for this color
                </Label>
                <Textarea
                  id="review-note"
                  value={localNote}
                  onChange={(e) => {
                    setLocalNote(e.target.value);
                    onNoteChange(color, e.target.value);
                  }}
                  placeholder="Fit preference, decoration idea, quantity guess…"
                  className="mt-1.5 min-h-[84px] rounded-xl border-[#e3e3e3] text-[13px]"
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-11 rounded-xl border-[#e3e3e3] text-[13px] font-semibold",
                    activeDecision?.decision === "excluded" &&
                      "border-[#303030] bg-[#303030] text-white hover:bg-[#303030] hover:text-white"
                  )}
                  onClick={() => onDecide(color, "excluded", localNote)}
                >
                  <X className="size-4" />
                  Pass color
                </Button>
                <Button
                  type="button"
                  className="h-11 rounded-xl text-[13px] font-semibold text-white hover:opacity-95"
                  style={{ background: accentHex }}
                  onClick={() => onDecide(color, "included", localNote)}
                >
                  <Check className="size-4" />
                  Include color
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function PublicReviewStorefrontView({ token }: { token: string }) {
  const [store, setStore] = useState<PublicClientStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PublicClientStoreProduct | null>(
    null
  );
  const [decisions, setDecisions] = useState<
    Record<string, StoredClientStoreReviewDecision>
  >({});
  const [myVotes, setMyVotes] = useState<Record<string, ClientStoreReviewVote>>(
    {}
  );
  const [voteTotals, setVoteTotals] = useState<
    Record<string, ClientStoreVoteSummaryRow>
  >({});
  const [voterId, setVoterId] = useState("");
  const [voterName, setVoterName] = useState("");
  const [votingBusyKey, setVotingBusyKey] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const accent = accentFor(store?.accentColorKey);
  const accentHex = accent?.hex || "#2c6ecb";
  const showPrices = store?.settings?.showPrices === true;
  const pageBackground =
    store?.settings?.pageBackgroundColor?.trim() || "#ffffff";
  const phase = clientStoreReviewPhase(store);
  const isVoting = phase === "voting";

  const load = useCallback(
    async (pwd?: string) => {
      setLoading(true);
      setError(null);
      setPasswordError(null);
      try {
        const res = await getPublicClientStore(token, {
          password: pwd || undefined,
        });
        setStore(res.store);
        setDecisions(decisionMapFromRows(readClientStoreReview(token)));
        const voter = readClientStoreVoter(token);
        setVoterId(voter.voterId);
        setVoterName(voter.voterName);
        setMyVotes(voteMapFromRows(voter.votes));
        setVoteTotals(voteSummaryMap(res.store.voteSummary));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not load this store.";
        if (pwd) setPasswordError(message);
        else setError(message);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const persistDecisions = useCallback(
    (next: Record<string, StoredClientStoreReviewDecision>) => {
      setDecisions(next);
      writeClientStoreReview(token, Object.values(next));
    },
    [token]
  );

  const setDecision = useCallback(
    (
      productId: string,
      color: string,
      decision: ClientStoreReviewDecision,
      note?: string
    ) => {
      const key = reviewDecisionKey(productId, color);
      const existing = decisions[key];
      persistDecisions({
        ...decisions,
        [key]: {
          productId,
          color: color || "",
          decision,
          note: note ?? existing?.note,
        },
      });
    },
    [decisions, persistDecisions]
  );

  const setNote = useCallback(
    (productId: string, color: string, note: string) => {
      const key = reviewDecisionKey(productId, color);
      const existing = decisions[key];
      if (!existing) return;
      persistDecisions({
        ...decisions,
        [key]: { ...existing, note },
      });
    },
    [decisions, persistDecisions]
  );

  const handleVote = useCallback(
    async (productId: string, color: string, vote: ClientStoreReviewVote) => {
      if (!store?.isOpen || !voterId) return;
      if (!voterName.trim()) {
        setVoteError("Add your name above so the team knows who voted.");
        return;
      }
      const key = reviewDecisionKey(productId, color);
      setVotingBusyKey(key);
      setVoteError(null);
      try {
        setClientStoreVoterName(token, voterName);
        const res = await submitClientStoreVote(token, {
          voterId,
          voterName: voterName.trim(),
          productId,
          color: color || undefined,
          vote,
          password: password || undefined,
        });
        const votes = upsertClientStoreVote(token, {
          productId,
          color: color || "",
          vote,
        });
        setMyVotes(voteMapFromRows(votes));
        setVoteTotals(voteSummaryMap(res.voteSummary));
      } catch (err) {
        setVoteError(
          err instanceof Error ? err.message : "Could not save your vote."
        );
      } finally {
        setVotingBusyKey(null);
      }
    },
    [password, store?.isOpen, token, voterId, voterName]
  );

  const products = store?.products || [];
  const reviewTargets = useMemo(() => {
    const rows: Array<{ productId: string; color: string }> = [];
    for (const product of products) {
      for (const color of reviewColorOptions(product)) {
        rows.push({ productId: product.id, color: color.name });
      }
    }
    return rows;
  }, [products]);

  const reviewedCount = useMemo(
    () =>
      reviewTargets.filter(
        (row) => decisions[reviewDecisionKey(row.productId, row.color)]
      ).length,
    [reviewTargets, decisions]
  );
  const includedCount = useMemo(
    () =>
      reviewTargets.filter(
        (row) =>
          decisions[reviewDecisionKey(row.productId, row.color)]?.decision ===
          "included"
      ).length,
    [reviewTargets, decisions]
  );
  const excludedCount = reviewedCount - includedCount;
  const votedCount = useMemo(
    () =>
      reviewTargets.filter(
        (row) => myVotes[reviewDecisionKey(row.productId, row.color)]
      ).length,
    [reviewTargets, myVotes]
  );
  const progress = isVoting
    ? reviewTargets.length > 0
      ? Math.round((votedCount / reviewTargets.length) * 100)
      : 0
    : reviewTargets.length > 0
      ? Math.round((reviewedCount / reviewTargets.length) * 100)
      : 0;

  const handleSubmit = async () => {
    if (!store) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const rows = Object.values(decisions);
      if (rows.length === 0) {
        throw new Error("Mark at least one color as included or not included.");
      }
      await submitClientStoreOrder(token, {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
        password: password || undefined,
        decisions: rows.map((row) => ({
          productId: row.productId,
          color: row.color || undefined,
          decision: row.decision,
          note: row.note,
        })),
      });
      clearClientStoreReview(token);
      setSubmitted(true);
      setSheetOpen(false);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Could not submit your review."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !store) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white text-sm text-[#616161]">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading review store…
      </div>
    );
  }

  if (error && !store) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f6f6f7] px-4">
        <div className="max-w-md rounded-2xl border border-[#e3e3e3] bg-white p-6 text-center shadow-sm">
          <p className="text-[15px] font-semibold text-[#303030]">
            Store unavailable
          </p>
          <p className="mt-2 text-[13px] text-[#616161]">{error}</p>
        </div>
      </div>
    );
  }

  if (!store) return null;

  if (store.passwordProtected && !store.unlocked) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center px-4"
        style={{ background: pageBackground }}
      >
        <div className="w-full max-w-sm rounded-2xl border border-[#e3e3e3] bg-white p-6 shadow-sm">
          <p className="text-[16px] font-semibold text-[#303030]">{store.name}</p>
          <p className="mt-1 text-[13px] text-[#616161]">
            Enter the store password to continue.
          </p>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-4 h-10 rounded-lg border-[#e3e3e3]"
            placeholder="Password"
            onKeyDown={(e) => {
              if (e.key === "Enter") void load(password);
            }}
          />
          {passwordError ? (
            <p className="mt-2 text-[12px] text-red-600">{passwordError}</p>
          ) : null}
          <Button
            type="button"
            className="mt-4 h-10 w-full rounded-lg text-white hover:opacity-95"
            style={{ background: accentHex }}
            onClick={() => void load(password)}
          >
            Enter review store
          </Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div
        className="flex min-h-dvh flex-col"
        style={{ background: pageBackground }}
      >
        <header className="border-b border-[#ebebeb] bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-[1200px] items-center px-4 sm:px-6">
            <p className="text-[14px] font-semibold text-[#303030]">
              {store.name}
            </p>
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center px-4 py-16">
          <div className="max-w-md text-center">
            <div
              className="mx-auto flex size-14 items-center justify-center rounded-full text-white"
              style={{ background: accentHex }}
            >
              <ClipboardCheck className="size-6" />
            </div>
            <p className="mt-5 text-[24px] font-semibold tracking-tight text-[#1f2430]">
              Review submitted
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-[#5a6478]">
              Thanks — the shop has your color picks
              {includedCount > 0
                ? ` (${includedCount} included${excludedCount > 0 ? `, ${excludedCount} passed` : ""})`
                : ""}
              .
            </p>
            <Button
              type="button"
              className="mt-6 h-10 rounded-lg px-5 text-white hover:opacity-95"
              style={{ background: accentHex }}
              onClick={() => {
                setSubmitted(false);
                setDecisions({});
                setSelected(null);
              }}
            >
              Review again
            </Button>
          </div>
        </div>
        <FloPilotWatermark />
      </div>
    );
  }

  return (
    <div
      className="flex h-dvh max-h-dvh flex-col overflow-hidden"
      style={{ background: pageBackground }}
    >
      <header className="shrink-0 border-b border-[#ebebeb] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {store.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={store.logoUrl}
                  alt=""
                  className="h-7 w-auto object-contain"
                />
              ) : null}
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-[#303030]">
                  {store.name}
                </p>
                <p className="truncate text-[11px] font-medium uppercase tracking-wide text-[#8a8a8a]">
                  {isVoting ? "Team voting" : "Product selection"}
                </p>
              </div>
            </div>
          </div>
          {!isVoting ? (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-[#e3e3e3] bg-white px-3 text-[12px] font-semibold text-[#303030] shadow-sm transition-colors hover:bg-[#f6f6f7]"
            >
              <ClipboardCheck className="size-3.5" style={{ color: accentHex }} />
              Selections
              {includedCount > 0 ? (
                <span
                  className="inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
                  style={{ background: accentHex }}
                >
                  {includedCount}
                </span>
              ) : null}
            </button>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Label htmlFor="voter-name-header" className="sr-only">
                Your name
              </Label>
              <Input
                id="voter-name-header"
                value={voterName}
                onChange={(e) => {
                  setVoterName(e.target.value);
                  setClientStoreVoterName(token, e.target.value);
                }}
                placeholder="Your name"
                className="h-9 w-40 rounded-full border-[#e3e3e3] px-3 text-[12px]"
              />
            </div>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        {!store.isOpen ? (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-[13px] text-amber-900">
            This review store is not currently accepting responses.
          </div>
        ) : null}

        {selected ? (
          <ReviewProductDetail
            product={selected}
            phase={phase}
            decisions={decisions}
            myVotes={myVotes}
            voteTotals={voteTotals}
            accentHex={accentHex}
            showPrices={showPrices}
            brandFallback={store.company || store.customerName}
            votingBusyKey={votingBusyKey}
            voteError={voteError}
            onBack={() => setSelected(null)}
            onDecide={(color, decision, note) => {
              setDecision(selected.id, color, decision, note);
            }}
            onNoteChange={(color, note) => {
              setNote(selected.id, color, note);
            }}
            onVote={(color, vote) => {
              void handleVote(selected.id, color, vote);
            }}
          />
        ) : (
          <main className="mx-auto max-w-[1200px] px-4 pb-36 pt-8 sm:px-6 sm:pt-10">
            <div className="mb-8 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#e3e3e3] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
                <Sparkles className="size-3" style={{ color: accentHex }} />
                {isVoting ? "Internal vote" : "Client selection"}
              </div>
              <h1 className="mt-4 text-[2rem] font-semibold tracking-tight text-[#1f2430] sm:text-[2.35rem]">
                {store.headline ||
                  (isVoting ? "Vote on the lineup" : "Review the lineup")}
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-[#5a6478]">
                {store.settings.reviewPrompt ||
                  store.description ||
                  (isVoting
                    ? "Browse each style and thumbs up or down the colors your team likes. Votes save as you go."
                    : "Browse each style, review the colors being offered, and mark what you’d like included — or pass on the rest.")}
              </p>
            </div>

            {isVoting ? (
              <div className="mb-6 rounded-2xl border border-[#ebebeb] bg-white p-4 sm:hidden">
                <Label
                  htmlFor="voter-name-mobile"
                  className="text-[12px] font-medium text-[#616161]"
                >
                  Your name
                </Label>
                <Input
                  id="voter-name-mobile"
                  value={voterName}
                  onChange={(e) => {
                    setVoterName(e.target.value);
                    setClientStoreVoterName(token, e.target.value);
                  }}
                  placeholder="So teammates know who voted"
                  className="mt-1.5 h-10 rounded-lg border-[#e3e3e3] text-[13px]"
                />
              </div>
            ) : null}

            {voteError ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                {voteError}
              </div>
            ) : null}

            {products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d7d7d7] bg-white px-6 py-16 text-center text-[14px] text-[#8a8a8a]">
                No products are available in this review yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <ReviewProductCard
                    key={product.id}
                    product={product}
                    phase={phase}
                    decisions={decisions}
                    myVotes={myVotes}
                    voteTotals={voteTotals}
                    showPrices={showPrices}
                    onOpen={() => setSelected(product)}
                  />
                ))}
              </div>
            )}
          </main>
        )}
      </div>

      {!selected ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-3 pb-3 sm:px-6 sm:pb-5">
          <div className="pointer-events-auto mx-auto flex max-w-[720px] items-center gap-4 rounded-2xl border border-[#e3e3e3] bg-white/95 p-3 shadow-[0_18px_40px_rgba(26,26,26,0.12)] backdrop-blur">
            <div className="min-w-0 flex-1 pl-1">
              <div className="flex items-center justify-between gap-3 text-[12px]">
                <span className="font-semibold text-[#303030]">
                  {isVoting
                    ? `${votedCount} of ${reviewTargets.length} colors voted`
                    : `${reviewedCount} of ${reviewTargets.length} colors reviewed`}
                </span>
                <span className="tabular-nums text-[#8a8a8a]">
                  {isVoting
                    ? "Votes save automatically"
                    : `${includedCount} include · ${excludedCount} pass`}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#ececec]">
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${progress}%`, background: accentHex }}
                />
              </div>
            </div>
            {!isVoting ? (
              <Button
                type="button"
                disabled={!store.isOpen || reviewedCount === 0}
                className="h-10 shrink-0 rounded-xl px-4 text-[13px] font-semibold text-white hover:opacity-95"
                style={{ background: accentHex }}
                onClick={() => setSheetOpen(true)}
              >
                Submit review
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {!isVoting ? (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
            <div className="shrink-0 border-b border-[#ebebeb] px-5 pb-4 pt-5 pr-12">
              <SheetHeader className="space-y-1 p-0 text-left">
                <SheetTitle className="text-[17px] font-semibold tracking-tight text-[#1f2430]">
                  Your selections
                </SheetTitle>
              </SheetHeader>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  {includedCount} included
                </span>
                <span className="inline-flex items-center rounded-full bg-[#f1f1f1] px-2.5 py-1 text-[11px] font-semibold text-[#616161]">
                  {excludedCount} passed
                </span>
                {reviewTargets.length - reviewedCount > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-[#eef3fb] px-2.5 py-1 text-[11px] font-semibold text-[#2c6ecb]">
                    {reviewTargets.length - reviewedCount} left
                  </span>
                ) : null}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-5 px-5 py-4">
                <section>
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a8a8a]">
                    Reviewed colors
                  </p>
                  {Object.values(decisions).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-8 text-center text-[13px] leading-relaxed text-[#8a8a8a]">
                      Open a product and mark each color as Include or Pass.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {products.flatMap((product) =>
                        reviewColorOptions(product)
                          .filter(
                            (color) =>
                              decisions[
                                reviewDecisionKey(product.id, color.name)
                              ]
                          )
                          .map((color) => {
                            const row =
                              decisions[
                                reviewDecisionKey(product.id, color.name)
                              ];
                            const mockup =
                              getMockupsForColor(
                                product,
                                color.name || undefined
                              )[0] || getPrimaryMockupUrl(product);
                            const included = row.decision === "included";
                            const totals =
                              voteTotals[
                                reviewDecisionKey(product.id, color.name)
                              ];
                            return (
                              <div
                                key={reviewDecisionKey(product.id, color.name)}
                                className={cn(
                                  "flex items-start gap-3 rounded-xl border px-3 py-3",
                                  included
                                    ? "border-emerald-200 bg-emerald-50/40"
                                    : "border-[#ebebeb] bg-[#fafafa]"
                                )}
                              >
                                <div className="size-14 shrink-0 overflow-hidden rounded-lg border border-white bg-white shadow-sm">
                                  {mockup ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={mockup}
                                      alt=""
                                      className="size-full object-contain p-1.5"
                                    />
                                  ) : null}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[13px] font-semibold leading-snug text-[#1f2430]">
                                    {product.name}
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                    {color.name ? (
                                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e3e3e3] bg-white px-2 py-0.5 text-[11px] font-medium text-[#616161]">
                                        <ColorSwatch
                                          name={color.name}
                                          colorHex={color.colorHex}
                                          swatchUrl={color.swatchUrl}
                                          size="sm"
                                        />
                                        {color.name}
                                      </span>
                                    ) : null}
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                        included
                                          ? "bg-emerald-600 text-white"
                                          : "bg-[#616161] text-white"
                                      )}
                                    >
                                      {included ? (
                                        <Check className="size-2.5" strokeWidth={3} />
                                      ) : (
                                        <X className="size-2.5" strokeWidth={3} />
                                      )}
                                      {included ? "Include" : "Pass"}
                                    </span>
                                  </div>
                                  {(totals?.up || 0) + (totals?.down || 0) >
                                  0 ? (
                                    <div className="mt-1.5">
                                      <VoteTally
                                        up={totals?.up || 0}
                                        down={totals?.down || 0}
                                        compact
                                      />
                                    </div>
                                  ) : null}
                                  {row.note ? (
                                    <p className="mt-1.5 text-[12px] leading-relaxed text-[#616161]">
                                      {row.note}
                                    </p>
                                  ) : null}
                                </div>
                                <button
                                  type="button"
                                  aria-label="Clear selection"
                                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-[#8a8a8a] transition-colors hover:bg-white hover:text-[#303030]"
                                  onClick={() => {
                                    const next = { ...decisions };
                                    delete next[
                                      reviewDecisionKey(product.id, color.name)
                                    ];
                                    persistDecisions(next);
                                  }}
                                >
                                  <X className="size-4" />
                                </button>
                              </div>
                            );
                          })
                      )}
                    </div>
                  )}
                </section>

                <section className="space-y-3 border-t border-[#ebebeb] pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a8a8a]">
                    Your contact
                  </p>
                  <div>
                    <Label
                      htmlFor="reviewer-name"
                      className="text-[12px] font-medium text-[#616161]"
                    >
                      Name
                    </Label>
                    <Input
                      id="reviewer-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1.5 h-10 rounded-lg border-[#e3e3e3] text-[13px]"
                      placeholder="Alex Morgan"
                    />
                  </div>
                  {store.settings.collectEmail !== false ? (
                    <div>
                      <Label
                        htmlFor="reviewer-email"
                        className="text-[12px] font-medium text-[#616161]"
                      >
                        Email
                      </Label>
                      <Input
                        id="reviewer-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1.5 h-10 rounded-lg border-[#e3e3e3] text-[13px]"
                        placeholder="alex@company.com"
                      />
                    </div>
                  ) : null}
                  {store.settings.collectPhone ? (
                    <div>
                      <Label
                        htmlFor="reviewer-phone"
                        className="text-[12px] font-medium text-[#616161]"
                      >
                        Phone
                      </Label>
                      <Input
                        id="reviewer-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="mt-1.5 h-10 rounded-lg border-[#e3e3e3] text-[13px]"
                      />
                    </div>
                  ) : null}
                  <div>
                    <Label
                      htmlFor="reviewer-notes"
                      className="text-[12px] font-medium text-[#616161]"
                    >
                      Notes{" "}
                      <span className="font-normal text-[#8a8a8a]">
                        (optional)
                      </span>
                    </Label>
                    <Textarea
                      id="reviewer-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="mt-1.5 min-h-[72px] rounded-lg border-[#e3e3e3] text-[13px]"
                      placeholder="Anything the shop should know about this lineup…"
                    />
                  </div>
                  {submitError ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                      {submitError}
                    </p>
                  ) : null}
                </section>
              </div>
            </div>

            <div className="shrink-0 border-t border-[#ebebeb] bg-white px-5 py-4">
              <Button
                type="button"
                disabled={
                  submitting ||
                  !store.isOpen ||
                  reviewedCount === 0 ||
                  !name.trim() ||
                  (store.settings.collectEmail !== false && !email.trim())
                }
                className="h-11 w-full rounded-xl text-[14px] font-semibold text-white hover:opacity-95"
                style={{ background: accentHex }}
                onClick={() => void handleSubmit()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Submit review"
                )}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      ) : null}

      <FloPilotWatermark />
    </div>
  );
}

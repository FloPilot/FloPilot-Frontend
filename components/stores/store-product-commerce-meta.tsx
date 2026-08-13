"use client";

import type { PublicClientStoreProduct } from "@/lib/client-stores";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export type StoreProductCommerceFact = {
  key: "decoration" | "moq" | "setup";
  label: string;
  value: string;
};

export function getStoreProductCommerceFacts(
  product: Pick<
    PublicClientStoreProduct,
    "decorationType" | "minOrderQty" | "setupFee"
  > | null | undefined,
  options?: { hideSetupFee?: boolean }
): StoreProductCommerceFact[] {
  if (!product) return [];
  const facts: StoreProductCommerceFact[] = [];
  const decoration = String(product.decorationType || "").trim();
  if (decoration) {
    facts.push({
      key: "decoration",
      label: "Decoration",
      value: decoration,
    });
  }
  const moq = Math.max(0, Math.floor(Number(product.minOrderQty) || 0));
  if (moq > 0) {
    facts.push({
      key: "moq",
      label: "Min. order",
      value: `${moq}`,
    });
  }
  const setup = Math.max(0, Number(product.setupFee) || 0);
  if (!options?.hideSetupFee && setup > 0) {
    facts.push({
      key: "setup",
      label: "Setup",
      value: formatCurrency(setup),
    });
  }
  return facts;
}

/** Compact one-line facts for product cards (review + shop grids). */
export function StoreProductCommerceMeta({
  product,
  className,
  hideSetupFee,
  density = "card",
}: {
  product: Pick<
    PublicClientStoreProduct,
    "decorationType" | "minOrderQty" | "setupFee"
  > | null | undefined;
  className?: string;
  hideSetupFee?: boolean;
  /** card = inline under title; detail = clearer labeled rows for PDP / review detail */
  density?: "card" | "detail";
}) {
  const facts = getStoreProductCommerceFacts(product, { hideSetupFee });
  if (!facts.length) return null;

  if (density === "detail") {
    return (
      <dl
        className={cn(
          "mt-3 grid gap-2 rounded-xl border border-[#ebebeb] bg-[#fafafa] px-3.5 py-3",
          className
        )}
      >
        {facts.map((fact) => (
          <div
            key={fact.key}
            className="flex items-baseline justify-between gap-4 text-[13px]"
          >
            <dt className="shrink-0 text-[#8a8a8a]">{fact.label}</dt>
            <dd className="min-w-0 text-right font-medium tabular-nums text-[#303030]">
              {fact.key === "moq" ? `${fact.value} pieces` : fact.value}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  const decoration = facts.find((f) => f.key === "decoration");
  const rest = facts.filter((f) => f.key !== "decoration");

  return (
    <div className={cn("mt-1.5 space-y-0.5", className)}>
      {decoration ? (
        <p className="text-[12px] font-medium text-[#5a6478]">
          {decoration.value}
        </p>
      ) : null}
      {rest.length > 0 ? (
        <p className="text-[12px] tabular-nums text-[#8a8a8a]">
          {rest
            .map((fact) =>
              fact.key === "moq"
                ? `Min. ${fact.value}`
                : `${fact.label} ${fact.value}`
            )
            .join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

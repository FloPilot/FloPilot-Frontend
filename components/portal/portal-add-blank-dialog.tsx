"use client";

import { useEffect, useMemo, useState } from "react";
import { AddSsBlankPanel } from "@/components/orders/add-ss-blank-panel";
import { usePortalAccess } from "@/components/portal/use-portal-access";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchPortalStyleDetail,
  listPortalBrands,
  searchPortalCatalog,
} from "@/lib/customer-portal-api";
import {
  createEmptyDraftLineItem,
  emptySizes,
  ORDER_REQUEST_SIZE_KEYS,
  pieceCountFromSizes,
  type OrderRequestDraftLineItem,
} from "@/lib/order-requests";
import {
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import type {
  SupplierProviderId,
  SupplierStyleSummary,
} from "@/lib/supplier-integrations";
import type { LineItem } from "@/types";
import { cn } from "@/lib/utils";

type AddSource = "manual" | "ss" | "sanmar";

type PortalProviderMeta = {
  id: string;
  label: string;
  connected: boolean;
};

function SourceTabs({
  source,
  ssConnected,
  sanMarConnected,
  onChange,
}: {
  source: AddSource;
  ssConnected: boolean;
  sanMarConnected: boolean;
  onChange: (source: AddSource) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-[#ebebeb] bg-[#f6f6f7] p-1">
      <button
        type="button"
        onClick={() => onChange("manual")}
        className={cn(
          "min-w-[7rem] flex-1 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
          source === "manual"
            ? "bg-white text-[#303030] shadow-sm"
            : "text-[#616161] hover:text-[#303030]"
        )}
      >
        Manual
      </button>
      {ssConnected ? (
        <button
          type="button"
          onClick={() => onChange("ss")}
          className={cn(
            "flex min-w-[7rem] flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
            source === "ss"
              ? "bg-white text-[#303030] shadow-sm"
              : "text-[#616161] hover:text-[#303030]"
          )}
        >
          S&amp;S
          <span className="rounded bg-[#e8f5ee] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0d5c2e]">
            Live
          </span>
        </button>
      ) : null}
      {sanMarConnected ? (
        <button
          type="button"
          onClick={() => onChange("sanmar")}
          className={cn(
            "flex min-w-[7rem] flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
            source === "sanmar"
              ? "bg-white text-[#303030] shadow-sm"
              : "text-[#616161] hover:text-[#303030]"
          )}
        >
          SanMar
          <span className="rounded bg-[#e8f5ee] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0d5c2e]">
            Live
          </span>
        </button>
      ) : null}
    </div>
  );
}

function lineItemToDraft(item: LineItem): OrderRequestDraftLineItem {
  const prefix = item.supplier === "sanMar" ? "sm:" : "ss:";
  const colorCode = item.colorKey?.startsWith(prefix)
    ? item.colorKey.slice(prefix.length)
    : "";
  const sizes: Record<string, number> = { ...emptySizes() };
  for (const row of item.sizes) {
    sizes[row.size] = row.quantity;
  }

  return {
    id: item.id,
    source: "supplier",
    brand: item.brand || "",
    productName: item.productName || "",
    styleNumber: item.supplierPartNumber || "",
    color: item.color || "",
    colorCode,
    sizes,
    unitCost: item.unitCost,
    supplierProvider: item.supplier,
    supplierSku: item.supplierPartNumber,
    previewUrl: item.imageUrl,
    notes: "",
  };
}

export function PortalAddBlankDialog({
  open,
  onOpenChange,
  providers,
  accent,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providers: PortalProviderMeta[];
  accent?: string;
  onAdd: (item: OrderRequestDraftLineItem) => void;
}) {
  const { mode, getAccessToken } = usePortalAccess();
  const portalMode = mode === "auth" ? "auth" : "invite";

  const ssConnected = providers.some(
    (p) => p.connected && (p.id === "ssActivewear" || p.id === "ss")
  );
  const sanMarConnected = providers.some(
    (p) => p.connected && (p.id === "sanMar" || p.id === "sanmar")
  );

  const [source, setSource] = useState<AddSource>("manual");
  const [brand, setBrand] = useState("");
  const [productName, setProductName] = useState("");
  const [styleNumber, setStyleNumber] = useState("");
  const [color, setColor] = useState("");
  const [sizes, setSizes] = useState(emptySizes);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSource(ssConnected ? "ss" : sanMarConnected ? "sanmar" : "manual");
    setBrand("");
    setProductName("");
    setStyleNumber("");
    setColor("");
    setSizes(emptySizes());
    setError(null);
  }, [open, ssConnected, sanMarConnected]);

  const pieceCount = pieceCountFromSizes(sizes);

  const ssCatalogClient = useMemo(
    () => ({
      search: async (
        query: string,
        options: { brand?: string; limit?: number }
      ) => {
        const token = await getAccessToken();
        return searchPortalCatalog(token, query, {
          mode: portalMode,
          provider: "ssActivewear",
          brand: options.brand,
          limit: options.limit,
        });
      },
      listBrands: async () => {
        const token = await getAccessToken();
        return listPortalBrands(token, "ssActivewear", { mode: portalMode });
      },
      getStyleDetail: async (style: SupplierStyleSummary) => {
        const token = await getAccessToken();
        return fetchPortalStyleDetail(token, style, "ssActivewear", {
          mode: portalMode,
        });
      },
    }),
    [getAccessToken, portalMode]
  );

  const sanMarCatalogClient = useMemo(
    () => ({
      search: async (
        query: string,
        options: { brand?: string; limit?: number }
      ) => {
        const token = await getAccessToken();
        return searchPortalCatalog(token, query, {
          mode: portalMode,
          provider: "sanMar",
          brand: options.brand,
          limit: options.limit,
        });
      },
      listBrands: async () => {
        const token = await getAccessToken();
        return listPortalBrands(token, "sanMar", { mode: portalMode });
      },
      getStyleDetail: async (style: SupplierStyleSummary) => {
        const token = await getAccessToken();
        return fetchPortalStyleDetail(token, style, "sanMar", {
          mode: portalMode,
        });
      },
    }),
    [getAccessToken, portalMode]
  );

  const handleOpenChange = (next: boolean) => {
    if (!next) setError(null);
    onOpenChange(next);
  };

  const submitManual = () => {
    if (pieceCount <= 0) {
      setError("Enter a quantity for at least one size.");
      return;
    }
    if (!brand.trim() && !productName.trim()) {
      setError("Enter a brand or product name.");
      return;
    }

    const item: OrderRequestDraftLineItem = {
      ...createEmptyDraftLineItem(),
      source: "manual",
      brand: brand.trim(),
      productName: productName.trim(),
      styleNumber: styleNumber.trim(),
      color: color.trim(),
      sizes: { ...sizes },
    };
    onAdd(item);
    handleOpenChange(false);
  };

  const submitSupplierItem = async (item: LineItem) => {
    onAdd(lineItemToDraft(item));
    handleOpenChange(false);
  };

  const activeProvider: SupplierProviderId | null =
    source === "ss" ? "ssActivewear" : source === "sanmar" ? "sanMar" : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "flex h-[min(90vh,820px)] max-h-[min(90vh,820px)] flex-col gap-0 overflow-hidden p-0",
          activeProvider ? "sm:max-w-4xl" : "sm:max-w-3xl"
        )}
      >
        <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-5 py-4">
          <DialogTitle className={dashboardTaskTitleClass}>Add blank</DialogTitle>
          <p className={dashboardTaskDetailClass}>
            {source === "ss"
              ? "Search the S&S catalog with live styles, colors, and stock."
              : source === "sanmar"
                ? "Search SanMar by style number or brand with live inventory."
                : "Enter garment details and quantities by size."}
          </p>
        </DialogHeader>

        <div
          className={cn(
            "min-h-0 flex-1",
            activeProvider
              ? "flex flex-col gap-3 overflow-hidden px-5 py-4"
              : "overflow-y-auto px-5 py-4"
          )}
        >
          <div className="shrink-0">
            <SourceTabs
              source={source}
              ssConnected={ssConnected}
              sanMarConnected={sanMarConnected}
              onChange={setSource}
            />
          </div>

          {source === "ss" && ssConnected ? (
            <div className="min-h-0 flex-1">
              <AddSsBlankPanel
                provider="ssActivewear"
                lineItems={[]}
                saving={false}
                catalogClient={ssCatalogClient}
                hidePricing
                onAdd={submitSupplierItem}
              />
            </div>
          ) : null}

          {source === "sanmar" && sanMarConnected ? (
            <div className="min-h-0 flex-1">
              <AddSsBlankPanel
                provider="sanMar"
                lineItems={[]}
                saving={false}
                catalogClient={sanMarCatalogClient}
                hidePricing
                onAdd={submitSupplierItem}
              />
            </div>
          ) : null}

          {source === "manual" ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Brand
                  </Label>
                  <Input
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Gildan"
                    className={cn(dashboardControlClass, "h-10")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Product name
                  </Label>
                  <Input
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Softstyle Tee"
                    className={cn(dashboardControlClass, "h-10")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Style #
                  </Label>
                  <Input
                    value={styleNumber}
                    onChange={(e) => setStyleNumber(e.target.value)}
                    placeholder="Optional"
                    className={cn(dashboardControlClass, "h-10")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Color
                  </Label>
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="e.g. Navy"
                    className={cn(dashboardControlClass, "h-10")}
                  />
                </div>
              </div>

              <div className={cn(dashboardInsetSurfaceClass, "overflow-hidden")}>
                <div className="border-b border-[#ebebeb] bg-[#fafafa] px-4 py-3">
                  <p className="text-[13px] font-semibold text-[#303030]">
                    Size quantities
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#616161]">
                    Enter how many pieces you need in each size.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-5">
                  {ORDER_REQUEST_SIZE_KEYS.map((size) => (
                    <div key={size} className="space-y-1.5">
                      <p className="text-[11px] font-medium text-[#616161]">
                        {size}
                      </p>
                      <Input
                        type="number"
                        min={0}
                        value={sizes[size] || ""}
                        placeholder="0"
                        onChange={(e) => {
                          const next = Math.max(
                            0,
                            parseInt(e.target.value, 10) || 0
                          );
                          setSizes((current) => ({
                            ...current,
                            [size]: next,
                          }));
                        }}
                        className="h-9 rounded-lg border-[#e3e3e3] text-right text-[13px] tabular-nums"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {error ? (
                <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {source === "manual" ? (
          <div className="flex shrink-0 justify-end border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4">
            <Button
              type="button"
              className={cn(dashboardPrimaryButtonClass, "h-9 px-4 text-[13px]")}
              style={accent ? { backgroundColor: accent } : undefined}
              onClick={submitManual}
            >
              Add blank
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

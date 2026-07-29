"use client";

import { useRef, useState } from "react";
import {
  Check,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { usePortalAccess } from "@/components/portal/use-portal-access";
import {
  parsePortalVendorPurchaseOrder,
  type PortalVendorPoParseResult,
} from "@/lib/customer-portal-api";
import {
  createDraftId,
  createEmptyDraftLineItem,
  emptySizes,
  ORDER_REQUEST_SIZE_KEYS,
  pieceCountFromSizes,
  type OrderRequestDraftLineItem,
  type OrderRequestDraftVendorPo,
} from "@/lib/order-requests";
import { cn } from "@/lib/utils";

const ACCEPTED =
  "application/pdf,image/png,image/jpeg,image/jpg,image/webp,.pdf,.png,.jpg,.jpeg,.webp";

type Stage = "upload" | "parsing" | "review" | "manual" | "confirmed";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

function dataUrlToBase64(dataUrl: string) {
  const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/i);
  return match?.[1] || "";
}

function parsedToDraftItems(
  lines: PortalVendorPoParseResult["lineItems"]
): OrderRequestDraftLineItem[] {
  return lines.map((line) => {
    const sizes = { ...emptySizes() };
    for (const [size, qty] of Object.entries(line.sizes || {})) {
      const key = size.toUpperCase();
      sizes[key] = Number(qty) || 0;
    }
    return {
      id: createDraftId("blank"),
      source: "vendor_po",
      brand: line.brand || "",
      productName: line.productName || "",
      styleNumber: line.styleNumber || "",
      color: line.color || "",
      colorCode: "",
      sizes,
      notes: "",
    };
  });
}

function LineEditor({
  item,
  accent,
  onChange,
  onRemove,
}: {
  item: OrderRequestDraftLineItem;
  accent: string;
  onChange: (next: OrderRequestDraftLineItem) => void;
  onRemove: () => void;
}) {
  const total = pieceCountFromSizes(item.sizes);
  return (
    <li className="overflow-hidden rounded-xl border border-[#ebebeb] bg-white">
      <div className="grid gap-3 border-b border-[#ebebeb] bg-[#fafafa] px-3.5 py-3 sm:grid-cols-[1fr_auto]">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className="h-9 rounded-lg border border-[#ebebeb] bg-white px-3 text-[13px] text-[#303030] outline-none focus:border-[#c9cccf]"
            value={item.brand}
            onChange={(e) => onChange({ ...item, brand: e.target.value })}
            placeholder="Brand"
          />
          <input
            className="h-9 rounded-lg border border-[#ebebeb] bg-white px-3 text-[13px] text-[#303030] outline-none focus:border-[#c9cccf]"
            value={item.productName}
            onChange={(e) =>
              onChange({ ...item, productName: e.target.value })
            }
            placeholder="Product name"
          />
          <input
            className="h-9 rounded-lg border border-[#ebebeb] bg-white px-3 text-[13px] text-[#303030] outline-none focus:border-[#c9cccf]"
            value={item.styleNumber}
            onChange={(e) =>
              onChange({ ...item, styleNumber: e.target.value })
            }
            placeholder="Style #"
          />
          <input
            className="h-9 rounded-lg border border-[#ebebeb] bg-white px-3 text-[13px] text-[#303030] outline-none focus:border-[#c9cccf]"
            value={item.color}
            onChange={(e) => onChange({ ...item, color: e.target.value })}
            placeholder="Color"
          />
        </div>
        <div className="flex items-start justify-between gap-2 sm:flex-col sm:items-end">
          <p className="text-[12px] text-[#8a8a8a]">
            <span
              className="font-semibold tabular-nums text-[#303030]"
              style={{ color: accent }}
            >
              {total.toLocaleString()}
            </span>{" "}
            pcs
          </p>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-[#ebebeb] bg-white text-[#8f1f1f] hover:bg-[#fff1f1]"
            aria-label="Remove garment"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2 px-3.5 py-3 sm:grid-cols-10">
        {ORDER_REQUEST_SIZE_KEYS.map((size) => (
          <label key={size} className="space-y-1">
            <span className="block text-center text-[11px] font-medium text-[#8a8a8a]">
              {size}
            </span>
            <input
              type="number"
              min={0}
              value={item.sizes[size] || ""}
              placeholder="0"
              onChange={(e) =>
                onChange({
                  ...item,
                  sizes: {
                    ...item.sizes,
                    [size]: Math.max(0, parseInt(e.target.value, 10) || 0),
                  },
                })
              }
              className="h-9 w-full rounded-lg border border-[#ebebeb] bg-white px-1 text-center text-[13px] tabular-nums outline-none focus:border-[#c9cccf]"
            />
          </label>
        ))}
      </div>
    </li>
  );
}

export function PortalVendorPoPanel({
  accent,
  vendorPo,
  lineItems,
  onVendorPoChange,
  onLineItemsChange,
}: {
  accent: string;
  vendorPo: OrderRequestDraftVendorPo | null;
  lineItems: OrderRequestDraftLineItem[];
  onVendorPoChange: (next: OrderRequestDraftVendorPo | null) => void;
  onLineItemsChange: (next: OrderRequestDraftLineItem[]) => void;
}) {
  const { mode, getAccessToken } = usePortalAccess();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const stage: Stage = (() => {
    if (vendorPo?.confirmed && lineItems.length > 0) return "confirmed";
    if (vendorPo?.parseStatus === "parsing") return "parsing";
    if (vendorPo?.parseStatus === "manual") return "manual";
    if (
      vendorPo?.parseStatus === "parsed" ||
      (vendorPo?.parseStatus === "failed" && lineItems.length > 0)
    ) {
      return "review";
    }
    if (vendorPo?.parseStatus === "failed") return "manual";
    return "upload";
  })();

  const totalPieces = lineItems.reduce(
    (sum, item) => sum + pieceCountFromSizes(item.sizes),
    0
  );

  const startManual = () => {
    setError(null);
    onVendorPoChange({
      fileName: vendorPo?.fileName || "",
      contentType: vendorPo?.contentType || "",
      fileUrl: vendorPo?.fileUrl || "",
      vendorName: vendorPo?.vendorName || "",
      poNumber: vendorPo?.poNumber || "",
      parseStatus: "manual",
      parseNotes: "Entered manually",
      confirmed: false,
    });
    if (lineItems.length === 0) {
      onLineItemsChange([createEmptyDraftLineItem()]);
    }
  };

  const resetUpload = () => {
    setError(null);
    onVendorPoChange(null);
    onLineItemsChange([]);
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const type = file.type || "";
    const okType =
      type === "application/pdf" ||
      type === "application/octet-stream" ||
      type.startsWith("image/") ||
      /\.(pdf|png|jpe?g|webp)$/i.test(file.name);
    if (!okType) {
      setError("Upload a PDF or photo of your vendor purchase order.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("That file is too large. Keep it under 8 MB.");
      return;
    }

    setError(null);
    let dataUrl = "";
    try {
      dataUrl = await readFileAsDataUrl(file);
    } catch {
      setError("Could not read that file.");
      return;
    }

    const contentType =
      type && type !== "application/octet-stream"
        ? type
        : /\.pdf$/i.test(file.name)
          ? "application/pdf"
          : /\.png$/i.test(file.name)
            ? "image/png"
            : /\.webp$/i.test(file.name)
              ? "image/webp"
              : type.startsWith("image/")
                ? type
                : "application/pdf";
    onVendorPoChange({
      fileName: file.name,
      contentType,
      fileUrl: dataUrl,
      vendorName: "",
      poNumber: "",
      parseStatus: "parsing",
      confirmed: false,
    });
    onLineItemsChange([]);

    try {
      const accessToken = await getAccessToken();
      const result = await parsePortalVendorPurchaseOrder(
        accessToken,
        {
          fileName: file.name,
          contentType,
          base64: dataUrlToBase64(dataUrl),
        },
        { mode: mode === "auth" ? "auth" : "invite" }
      );

      if (!result.readable || result.lineItems.length === 0) {
        onVendorPoChange({
          fileName: file.name,
          contentType,
          fileUrl: dataUrl,
          vendorName: result.vendorName || "",
          poNumber: result.poNumber || "",
          parseStatus: "failed",
          parseConfidence: result.confidence,
          parseNotes:
            result.notes ||
            "We couldn’t reliably read styles and quantities from that file.",
          confirmed: false,
        });
        onLineItemsChange([]);
        return;
      }

      onVendorPoChange({
        fileName: file.name,
        contentType,
        fileUrl: dataUrl,
        vendorName: result.vendorName || "",
        poNumber: result.poNumber || "",
        parseStatus: "parsed",
        parseConfidence: result.confidence,
        parseNotes: result.notes || "",
        confirmed: false,
      });
      onLineItemsChange(parsedToDraftItems(result.lineItems));
    } catch (err) {
      onVendorPoChange({
        fileName: file.name,
        contentType,
        fileUrl: dataUrl,
        vendorName: "",
        poNumber: "",
        parseStatus: "failed",
        parseConfidence: "low",
        parseNotes:
          err instanceof Error
            ? err.message
            : "Could not read that document.",
        confirmed: false,
      });
      onLineItemsChange([]);
    }
  };

  const updateItem = (id: string, next: OrderRequestDraftLineItem) => {
    onLineItemsChange(lineItems.map((row) => (row.id === id ? next : row)));
  };

  const confirmReview = () => {
    const valid = lineItems.filter(
      (item) =>
        (item.brand.trim() || item.productName.trim()) &&
        pieceCountFromSizes(item.sizes) > 0
    );
    if (valid.length === 0) {
      setError("Confirm at least one garment with a size quantity.");
      return;
    }
    if (!(vendorPo?.poNumber || "").trim()) {
      setError("Add the vendor purchase order number so the shop can match it.");
      return;
    }
    setError(null);
    onLineItemsChange(valid);
    onVendorPoChange({
      ...(vendorPo as OrderRequestDraftVendorPo),
      parseStatus:
        vendorPo?.parseStatus === "manual" ? "manual" : "parsed",
      confirmed: true,
    });
  };

  if (stage === "confirmed") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#d7e7dc] bg-[#f4faf6] px-4 py-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[#245c3c]">
              <Check className="size-3.5" strokeWidth={2.5} />
              Vendor blanks confirmed
            </p>
            <p className="mt-0.5 text-[12px] text-[#3d6b50]">
              {vendorPo?.poNumber ? `PO ${vendorPo.poNumber}` : "PO on file"}
              {vendorPo?.vendorName ? ` · ${vendorPo.vendorName}` : ""}
              {" · "}
              {lineItems.length} garment{lineItems.length === 1 ? "" : "s"} ·{" "}
              {totalPieces.toLocaleString()} pieces
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onVendorPoChange(
                vendorPo
                  ? { ...vendorPo, confirmed: false }
                  : vendorPo
              )
            }
            className="h-8 rounded-lg border border-[#cfe0d5] bg-white px-3 text-[12px] font-medium text-[#245c3c] hover:bg-[#eef7f1]"
          >
            Edit
          </button>
        </div>

        <ul className="space-y-2">
          {lineItems.map((item, index) => {
            const pieces = pieceCountFromSizes(item.sizes);
            const sizeSummary = Object.entries(item.sizes)
              .filter(([, qty]) => (qty || 0) > 0)
              .map(([size, qty]) => `${size} ${qty}`)
              .join(" · ");
            return (
              <li
                key={item.id}
                className="rounded-xl border border-[#ebebeb] bg-white px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[#303030]">
                      {[item.brand, item.productName].filter(Boolean).join(" · ") ||
                        `Garment ${index + 1}`}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-[#8a8a8a]">
                      {[item.styleNumber && `Style ${item.styleNumber}`, item.color]
                        .filter(Boolean)
                        .join(" · ")}
                      {sizeSummary ? ` · ${sizeSummary}` : ""}
                    </p>
                  </div>
                  <p className="text-[13px] font-semibold tabular-nums text-[#303030]">
                    {pieces.toLocaleString()}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stage === "upload" || stage === "parsing" ? (
        <div
          className={cn(
            "rounded-xl border border-dashed px-4 py-10 text-center transition-colors",
            dragging
              ? "border-[#2c6ecb] bg-[#f4f7fd]"
              : "border-[#d4d4d4] bg-[#fafafa]",
            stage === "parsing" && "pointer-events-none opacity-80"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void handleFile(e.dataTransfer.files?.[0] ?? null);
          }}
        >
          {stage === "parsing" ? (
            <>
              <Loader2
                className="mx-auto size-8 animate-spin"
                style={{ color: accent }}
              />
              <p className="mt-3 text-[14px] font-semibold text-[#303030]">
                Reading your purchase order…
              </p>
              <p className="mt-1 text-[13px] text-[#616161]">
                Pulling out styles, colors, and size counts
                {vendorPo?.fileName ? ` from ${vendorPo.fileName}` : ""}.
              </p>
            </>
          ) : (
            <>
              <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full border border-[#ebebeb] bg-white">
                <FileText className="size-5 text-[#8a8a8a]" strokeWidth={1.5} />
              </span>
              <p className="mt-3 text-[14px] font-semibold text-[#303030]">
                Upload your vendor blanks PO
              </p>
              <p className="mx-auto mt-1 max-w-md text-[13px] text-[#616161]">
                Drop a PDF or photo from S&amp;S, SanMar, or another blank
                supplier. We’ll draft the garments for you to review.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold text-white"
                  style={{ backgroundColor: accent }}
                >
                  <Upload className="size-3.5" />
                  Upload PO
                </button>
                <button
                  type="button"
                  onClick={startManual}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#ebebeb] bg-white px-4 text-[13px] font-medium text-[#303030] hover:bg-[#f6f6f7]"
                >
                  Enter manually
                </button>
              </div>
              <p className="mt-3 inline-flex items-center gap-1 text-[11px] text-[#8a8a8a]">
                <Sparkles className="size-3" />
                Auto-read works best with clear PDFs
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => {
              void handleFile(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
        </div>
      ) : null}

      {stage === "manual" && vendorPo?.parseStatus === "failed" ? (
        <div className="rounded-xl border border-[#f0e0b2] bg-[#fffbf0] px-4 py-3 text-[13px] text-[#8a6116]">
          <p className="font-semibold">Couldn’t auto-read that file</p>
          <p className="mt-0.5">
            {vendorPo.parseNotes ||
              "Enter the garments below, or try a clearer PDF / photo."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startManual}
              className="inline-flex h-8 items-center rounded-lg border border-[#e8d49a] bg-white px-3 text-[12px] font-medium text-[#8a6116] hover:bg-[#fff8e8]"
            >
              Enter garments manually
            </button>
            <button
              type="button"
              onClick={resetUpload}
              className="inline-flex h-8 items-center rounded-lg border border-[#e8d49a] bg-white px-3 text-[12px] font-medium text-[#8a6116] hover:bg-[#fff8e8]"
            >
              Try another file
            </button>
          </div>
        </div>
      ) : null}

      {(stage === "review" || stage === "manual") &&
      !(stage === "manual" && vendorPo?.parseStatus === "failed" && lineItems.length === 0) ? (
        <>
          {vendorPo?.parseStatus === "parsed" ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#d7e3f5] bg-[#f4f7fd] px-4 py-3 text-[13px] text-[#2c6ecb]">
              <Sparkles className="size-3.5 shrink-0" />
              <p>
                Drafted from{" "}
                <span className="font-semibold">
                  {vendorPo.fileName || "your PO"}
                </span>
                {vendorPo.parseConfidence
                  ? ` · ${vendorPo.parseConfidence} confidence`
                  : ""}
                . Confirm the PO number and counts before continuing.
              </p>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-[12px] font-medium text-[#616161]">
                Vendor PO number
              </label>
              <input
                className="h-10 w-full rounded-lg border border-[#ebebeb] bg-white px-3 text-[13px] text-[#303030] outline-none focus:border-[#c9cccf]"
                value={vendorPo?.poNumber || ""}
                onChange={(e) =>
                  onVendorPoChange(
                    vendorPo
                      ? { ...vendorPo, poNumber: e.target.value }
                      : {
                          fileName: "",
                          contentType: "",
                          fileUrl: "",
                          vendorName: "",
                          poNumber: e.target.value,
                          parseStatus: "manual",
                          confirmed: false,
                        }
                  )
                }
                placeholder="e.g. 45001234"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[12px] font-medium text-[#616161]">
                Vendor (optional)
              </label>
              <input
                className="h-10 w-full rounded-lg border border-[#ebebeb] bg-white px-3 text-[13px] text-[#303030] outline-none focus:border-[#c9cccf]"
                value={vendorPo?.vendorName || ""}
                onChange={(e) =>
                  onVendorPoChange(
                    vendorPo
                      ? { ...vendorPo, vendorName: e.target.value }
                      : {
                          fileName: "",
                          contentType: "",
                          fileUrl: "",
                          vendorName: e.target.value,
                          poNumber: "",
                          parseStatus: "manual",
                          confirmed: false,
                        }
                  )
                }
                placeholder="e.g. S&S Activewear"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-[14px] font-semibold text-[#303030]">
                Garments on this PO
              </h3>
              <p className="text-[12px] text-[#8a8a8a]">
                {lineItems.length} line{lineItems.length === 1 ? "" : "s"} ·{" "}
                {totalPieces.toLocaleString()} pieces — fix anything that looks
                off
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  onLineItemsChange([
                    ...lineItems,
                    createEmptyDraftLineItem(),
                  ])
                }
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#ebebeb] bg-white px-3 text-[12px] font-medium text-[#303030] hover:bg-[#f6f6f7]"
              >
                <Plus className="size-3.5" />
                Add garment
              </button>
              <button
                type="button"
                onClick={resetUpload}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#ebebeb] bg-white px-3 text-[12px] font-medium text-[#303030] hover:bg-[#f6f6f7]"
              >
                <Upload className="size-3.5" />
                New upload
              </button>
            </div>
          </div>

          <ul className="space-y-3">
            {lineItems.map((item) => (
              <LineEditor
                key={item.id}
                item={item}
                accent={accent}
                onChange={(next) => updateItem(item.id, next)}
                onRemove={() =>
                  onLineItemsChange(lineItems.filter((row) => row.id !== item.id))
                }
              />
            ))}
          </ul>

          <div className="flex flex-wrap justify-end gap-2 border-t border-[#ebebeb] pt-4">
            <button
              type="button"
              onClick={confirmReview}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              <Check className="size-3.5" />
              Confirm blanks
            </button>
          </div>
        </>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

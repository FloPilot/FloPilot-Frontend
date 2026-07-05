"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  Printer,
  Trash2,
  Upload,
} from "lucide-react";
import { useSchedule } from "@/components/providers/schedule-provider";
import { readUploadContent } from "@/lib/artwork-preview";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { ProofActionButton } from "@/components/orders/artwork/proof-action-button";
import { AddBlankItemDialog } from "@/components/orders/add-blank-item-dialog";
import { InkPrepLocationCard } from "@/components/orders/ink-prep-location-card";
import { RemoveBlankSizeDialog } from "@/components/orders/remove-blank-size-dialog";
import {
  BLANK_SOURCE_LABELS,
  computeMaterialLineStatus,
  countExpectedGarmentPieces,
  GARMENT_RECEIVE_STATUS_STYLES,
  getDtfReceivingLines,
  getGarmentReceivingLines,
  getInkPrepLines,
  getScreenSetupLine,
  mergeOrderMaterials,
  materialStatusLabel,
} from "@/lib/order-materials";
import {
  inkPrepLineFromColorToggle,
  inkPrepLineMarkAll,
} from "@/lib/ink-prep";
import { lineItemPieceCount } from "@/lib/order-estimate";
import { blanksTabLabel } from "@/lib/order-detail-tabs";
import { blankSourceLabel } from "@/lib/order-receiving-checkpoints";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import {
  normalizeMarkupPercent,
  orderCustomerGarmentSubtotal,
  resolveLineItemCustomerUnitPrice,
  resolveLineItemMarkupPercent,
  shouldShowBlankPricing,
} from "@/lib/blank-pricing";
import { canEditOrderBlanks, orderBlanksEditHint } from "@/lib/order-blanks";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  compactOrderNumberForLabel,
  NEW_ORDER_COLORS,
  NEW_ORDER_PRODUCTS,
  NEW_ORDER_SIZES,
} from "@/lib/create-order";
import {
  buildLineItemFromCatalog,
  guessColorKey,
  guessProductKey,
  serializeLineItemForApi,
  sizesToRecord,
} from "@/lib/line-items";
import {
  isSupplierLineItem,
  rebuildSupplierLineItemQuantity,
} from "@/lib/supplier-line-items";
import type {
  BlankSource,
  ImprintInkColor,
  JobImprint,
  LineItem,
  Order,
  OrderFile,
  OrderMaterialLine,
} from "@/types";
import { cn } from "@/lib/utils";

function QtyOrderedInput({
  value,
  disabled,
  onSave,
}: {
  value: number;
  disabled?: boolean;
  onSave: (quantity: number) => void;
}) {
  const [draft, setDraft] = useState(String(value || ""));

  useEffect(() => {
    setDraft(String(value || ""));
  }, [value]);

  const commit = () => {
    const parsed = Math.max(0, parseInt(draft, 10) || 0);
    setDraft(String(parsed));
    if (parsed !== value) {
      onSave(parsed);
    }
  };

  return (
    <div className="flex justify-end">
      <Input
        type="number"
        min={0}
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className="h-8 w-[72px] rounded-lg border-[#e3e3e3] text-right text-sm tabular-nums"
      />
    </div>
  );
}

function MarkupPercentInput({
  value,
  disabled,
  onSave,
}: {
  value: number;
  disabled?: boolean;
  onSave: (markupPercent: number) => void;
}) {
  const [draft, setDraft] = useState(String(value || ""));

  useEffect(() => {
    setDraft(String(value || ""));
  }, [value]);

  const commit = () => {
    const parsed = normalizeMarkupPercent(Number(draft) || 0);
    setDraft(String(parsed));
    if (parsed !== value) {
      onSave(parsed);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <Input
        type="number"
        min={0}
        step="0.1"
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className="h-8 w-[72px] rounded-lg border-[#e3e3e3] text-right text-sm tabular-nums"
      />
      <span className="text-[12px] text-[#8a8a8a]">%</span>
    </div>
  );
}

function CustomerUnitPriceInput({
  value,
  disabled,
  onSave,
}: {
  value: number;
  disabled?: boolean;
  onSave: (customerUnitPrice: number) => void;
}) {
  const [draft, setDraft] = useState(value > 0 ? value.toFixed(2) : "");

  useEffect(() => {
    setDraft(value > 0 ? value.toFixed(2) : "");
  }, [value]);

  const commit = () => {
    const parsed = Math.max(0, Number(draft) || 0);
    setDraft(parsed > 0 ? parsed.toFixed(2) : "");
    if (parsed !== value) {
      onSave(parsed);
    }
  };

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-[#8a8a8a]">
        $
      </span>
      <Input
        type="number"
        min={0}
        step="0.01"
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className="h-8 w-[88px] rounded-lg border-[#e3e3e3] pl-5 text-right text-sm tabular-nums"
      />
    </div>
  );
}

function splitFileName(name: string): { base: string; ext: string } {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return { base: name, ext: "" };
  return { base: name.slice(0, dot), ext: name.slice(dot) };
}

function rebuildLineItemQuantity(
  order: Order,
  lineItemId: string,
  size: string,
  quantity: number
): LineItem | null {
  const item = order.lineItems.find((entry) => entry.id === lineItemId);
  if (!item || !size) return null;

  if (isSupplierLineItem(item)) {
    return rebuildSupplierLineItemQuantity(item, size, quantity);
  }

  const productKey = guessProductKey(item);
  const colorKey = guessColorKey(item);
  const sizeRecord = sizesToRecord(item.sizes);
  const sizeKey = size as (typeof NEW_ORDER_SIZES)[number];

  return {
    ...buildLineItemFromCatalog(
      productKey as (typeof NEW_ORDER_PRODUCTS)[number]["key"],
      colorKey as (typeof NEW_ORDER_COLORS)[number]["key"],
      {
        ...sizeRecord,
        ...(sizeKey in sizeRecord ? { [sizeKey]: quantity } : {}),
      },
      item.id
    ),
    unitCost: item.unitCost,
    markupPercent: item.markupPercent,
    customerUnitPrice: item.customerUnitPrice,
    supplier: item.supplier,
    supplierPartNumber: item.supplierPartNumber,
    supplierStyleId: item.supplierStyleId,
  };
}

function ReceivingStatusPill({ status }: { status: OrderMaterialLine["status"] }) {
  const tone =
    status === "received"
      ? "bg-[#e8f5ee] text-[#0d5c2e]"
      : status === "partial"
        ? "bg-[#fde2e2] text-[#8f1f1f]"
        : "bg-[#fde2e2] text-[#8f1f1f]";

  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium",
        tone
      )}
    >
      {materialStatusLabel(status)}
    </span>
  );
}

function QtyReceivedInput({
  line,
  saving,
  onSave,
}: {
  line: OrderMaterialLine;
  saving: boolean;
  onSave: (receivedQty: number) => void;
}) {
  const [value, setValue] = useState(String(line.receivedQty || ""));

  useEffect(() => {
    setValue(String(line.receivedQty || ""));
  }, [line.receivedQty]);

  const commit = () => {
    const parsed = Number(value);
    const receivedQty =
      Number.isFinite(parsed) && parsed >= 0
        ? Math.min(Math.floor(parsed), line.expectedQty)
        : 0;
    setValue(String(receivedQty));
    if (receivedQty !== line.receivedQty) {
      onSave(receivedQty);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Input
        type="number"
        min={0}
        max={line.expectedQty}
        value={value}
        disabled={saving}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className="h-8 w-[72px] rounded-lg border-[#e3e3e3] text-right text-sm tabular-nums"
      />
      <Button
        type="button"
        variant="outline"
        disabled={saving || line.receivedQty >= line.expectedQty}
        className={cn(dashboardControlClass, "h-8 px-2 text-[11px]")}
        onClick={() => {
          setValue(String(line.expectedQty));
          onSave(line.expectedQty);
        }}
      >
        All
      </Button>
    </div>
  );
}

function findImprint(
  order: Order,
  jobId: string,
  imprintId: string
): JobImprint | undefined {
  const job = order.jobs.find((entry) => entry.id === jobId);
  return job?.imprints.find((entry) => entry.id === imprintId);
}

function ScreenSetupRow({
  line,
  saving,
  onToggle,
}: {
  line: OrderMaterialLine;
  saving: boolean;
  onToggle: (done: boolean) => void | Promise<void>;
}) {
  const done = line.status === "received";
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    if (pending || saving) return;
    setPending(true);
    try {
      await onToggle(!done);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      disabled={saving || pending}
      onClick={handleClick}
      aria-busy={pending}
      className={cn(
        dashboardInsetSurfaceClass,
        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
        done ? "border-[#b7d8b7] bg-[#f6fbf5]" : "hover:border-[#c9d7ef]",
        (saving || pending) && "opacity-90"
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
          done
            ? "border-[#0d5c2e] bg-[#0d5c2e] text-white"
            : pending
              ? "border-[#2c6ecb] bg-white text-[#2c6ecb]"
              : "border-[#c9c9c9] bg-white"
        )}
      >
        {pending ? (
          <Loader2 className="size-3 animate-spin" strokeWidth={3} />
        ) : done ? (
          <Check className="size-3" strokeWidth={3} />
        ) : null}
      </span>
      <Printer className="size-4 shrink-0 text-[#2c6ecb]" />
      <span className="min-w-0 flex-1 text-sm font-semibold text-[#303030]">
        {line.label}
      </span>
      {pending ? (
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#616161]">
          <Loader2 className="size-3.5 animate-spin" />
          {done ? "Updating…" : "Marking burned…"}
        </span>
      ) : (
        <ReceivingStatusPill status={line.status} />
      )}
    </button>
  );
}

function ScreenFilesSection({
  files,
  uploading,
  error,
  onUploadClick,
  onPreview,
  onDelete,
  deletingFileId,
}: {
  files: import("@/types").OrderFile[];
  uploading: boolean;
  error: string | null;
  onUploadClick: () => void;
  onPreview: (file: import("@/types").OrderFile) => void;
  onDelete: (file: import("@/types").OrderFile) => void;
  deletingFileId: string | null;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-[#303030]">
            Screen files
          </h3>
          <p className={dashboardTaskDetailClass}>
            Push the burn-ready films here so the floor can download and burn
            screens.
          </p>
        </div>
        <Button
          type="button"
          disabled={uploading}
          className={cn(dashboardControlClass, "h-8 shrink-0 text-[12px]")}
          onClick={onUploadClick}
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Upload className="size-3.5" />
          )}
          {uploading ? "Uploading…" : "Upload screen file"}
        </Button>
      </div>

      {error ? (
        <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[12px] text-[#8f1f1f]">
          {error}
        </p>
      ) : null}

      {files.length === 0 ? (
        <div
          className={cn(
            dashboardInsetSurfaceClass,
            "flex flex-col items-center justify-center gap-1 px-4 py-8 text-center"
          )}
        >
          <FileText className="size-5 text-[#8a8a8a]" />
          <p className="text-[13px] font-medium text-[#303030]">
            No screen files yet
          </p>
          <p className="text-[12px] text-[#8a8a8a]">
            Upload separations or burn films for the team to download.
          </p>
        </div>
      ) : (
        <div className={cn(dashboardInsetSurfaceClass, "divide-y divide-[#ebebeb]")}>
          {files.map((file) => {
            const isDeleting = deletingFileId === file.id;
            return (
              <div
                key={file.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 transition-opacity",
                  isDeleting && "opacity-50"
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f1f5fc] text-[#2c6ecb]">
                  <FileText className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[#303030]">
                    {file.name}
                  </p>
                  <p className="text-[12px] text-[#8a8a8a]">
                    {file.uploadedBy} · {formatDateTime(file.uploadedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {file.previewUrl ? (
                    <button
                      type="button"
                      aria-label={`Preview ${file.name}`}
                      onClick={() => onPreview(file)}
                      className={cn(
                        dashboardControlClass,
                        "inline-flex h-8 items-center gap-1.5 px-2.5 text-[12px] font-medium text-[#303030] hover:bg-[#fafafa]"
                      )}
                    >
                      <Eye className="size-3.5" />
                      Preview
                    </button>
                  ) : null}
                  {file.downloadUrl || file.previewUrl ? (
                    <a
                      href={file.downloadUrl || file.previewUrl}
                      download={file.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        dashboardControlClass,
                        "inline-flex h-8 items-center gap-1.5 px-2.5 text-[12px] font-medium text-[#303030] hover:bg-[#fafafa]"
                      )}
                    >
                      <Download className="size-3.5" />
                      Download
                    </a>
                  ) : (
                    <span className="text-[11px] text-[#8a8a8a]">
                      Filename only
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={`Delete ${file.name}`}
                    disabled={isDeleting}
                    onClick={() => onDelete(file)}
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-transparent text-[#8a8a8a] transition-colors hover:border-[#f5b5b5] hover:bg-[#fff1f1] hover:text-[#c0392b] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeleting ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ScreenFileNameDialog({
  open,
  onOpenChange,
  orderNumber,
  file,
  uploading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string;
  file: File | null;
  uploading: boolean;
  onConfirm: (fullName: string) => void;
}) {
  const prefix = compactOrderNumberForLabel(orderNumber);
  const { base, ext } = useMemo(
    () => splitFileName(file?.name ?? ""),
    [file]
  );
  const [name, setName] = useState(base);

  useEffect(() => {
    setName(base);
  }, [base]);

  const trimmed = name.trim();
  const fullName = `${prefix} - ${trimmed}${ext}`;
  const canSave = trimmed.length > 0 && !uploading;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!uploading) onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton
        className="gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <DialogHeader className="border-b border-[#ebebeb] px-5 py-4">
          <DialogTitle className={dashboardTaskTitleClass}>
            Name screen file
          </DialogTitle>
          <p className={dashboardTaskDetailClass}>
            Files are prefixed with the order number so the floor can match them
            to this job fast.
          </p>
        </DialogHeader>

        <div className="space-y-3 px-5 py-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              File name
            </Label>
            <div className="flex items-center gap-1 rounded-lg border border-[#e3e3e3] bg-white px-2 transition-colors focus-within:border-[#2c6ecb]">
              <span className="shrink-0 py-2 pl-1 text-[13px] font-semibold tabular-nums text-[#616161]">
                {prefix} -
              </span>
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && canSave) onConfirm(fullName);
                }}
                placeholder="front-left-chest"
                className="h-9 min-w-0 flex-1 border-0 bg-transparent text-[13px] text-[#303030] outline-none placeholder:text-[#b0b0b0]"
              />
              {ext ? (
                <span className="shrink-0 py-2 pr-1 text-[13px] text-[#8a8a8a]">
                  {ext}
                </span>
              ) : null}
            </div>
            <p className="text-[12px] text-[#8a8a8a]">
              Saves as{" "}
              <span className="font-medium text-[#303030]">{fullName}</span>
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4">
          <Button
            type="button"
            variant="ghost"
            disabled={uploading}
            className="h-9 rounded-lg"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSave}
            className={cn(dashboardPrimaryButtonClass, "h-9 px-4 text-[13px]")}
            onClick={() => onConfirm(fullName)}
          >
            {uploading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Uploading…
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FilePreviewDialog({
  open,
  onOpenChange,
  file,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: OrderFile | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="gap-0 overflow-hidden p-0 sm:max-w-3xl"
      >
        <DialogHeader className="border-b border-[#ebebeb] px-5 py-4 pr-12">
          <DialogTitle className={cn(dashboardTaskTitleClass, "truncate")}>
            {file?.name ?? "Preview"}
          </DialogTitle>
          <p className={dashboardTaskDetailClass}>
            {file
              ? `${file.uploadedBy} · ${formatDateTime(file.uploadedAt)}`
              : ""}
          </p>
        </DialogHeader>

        <div className="flex max-h-[70vh] items-center justify-center overflow-auto bg-[#f6f6f7] p-4">
          {file?.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={file.previewUrl}
              alt={file.name}
              className="max-h-[62vh] w-auto rounded-md bg-white shadow-sm"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <FileText className="size-6 text-[#8a8a8a]" />
              <p className="text-[13px] text-[#8a8a8a]">
                No preview available for this file.
              </p>
            </div>
          )}
        </div>

        {file?.downloadUrl || file?.previewUrl ? (
          <div className="flex justify-end gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4">
            <a
              href={file.downloadUrl || file.previewUrl}
              download={file.name}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                dashboardControlClass,
                "inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[13px] font-medium text-[#303030] hover:bg-[#fafafa]"
              )}
            >
              <Download className="size-3.5" />
              Download original
            </a>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DeleteFileDialog({
  open,
  onOpenChange,
  file,
  deleting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: import("@/types").OrderFile | null;
  deleting: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!deleting) onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton
        className="gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <DialogHeader className="border-b border-[#ebebeb] px-5 py-4">
          <DialogTitle className={dashboardTaskTitleClass}>
            Delete file
          </DialogTitle>
          <p className={dashboardTaskDetailClass}>
            This permanently removes the file from this order and from storage.
            This can&apos;t be undone.
          </p>
        </DialogHeader>

        <div className="px-5 py-4">
          <div
            className={cn(
              dashboardInsetSurfaceClass,
              "flex items-center gap-3 px-4 py-3"
            )}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#fff1f1] text-[#c0392b]">
              <FileText className="size-4" />
            </span>
            <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#303030]">
              {file?.name ?? "This file"}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4">
          <Button
            type="button"
            variant="ghost"
            disabled={deleting}
            className="h-9 rounded-lg"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={deleting}
            className="h-9 rounded-lg bg-[#c0392b] px-4 text-[13px] font-medium text-white hover:bg-[#a93226]"
            onClick={onConfirm}
          >
            {deleting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete file"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type OrderMaterialsSection = "blanks" | "dtf" | "screens" | "inks";

export function OrderMaterialsPanel({
  order,
  section,
}: {
  order: Order;
  section?: OrderMaterialsSection;
}) {
  const {
    updateOrderMaterials,
    updateOrderLineItem,
    removeOrderLineItem,
    uploadOrderFile,
    deleteOrderFile,
    updateImprintInkColors,
  } = useSchedule();
  const { settings } = useShopSettings();
  const shopDefaultMarkup = settings.pricingMatrix.blankMarkupPercent ?? 0;
  const showBlankPricing = shouldShowBlankPricing(order);
  const [saving, setSaving] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<OrderMaterialLine | null>(null);
  const [removingRowId, setRemovingRowId] = useState<string | null>(null);
  const screenFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingScreenFile, setUploadingScreenFile] = useState(false);
  const [screenFileError, setScreenFileError] = useState<string | null>(null);
  const [pendingScreenFile, setPendingScreenFile] = useState<File | null>(null);
  const [deleteFileTarget, setDeleteFileTarget] = useState<OrderFile | null>(
    null
  );
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<OrderFile | null>(null);
  const canEditBlanks = canEditOrderBlanks(order);
  const [blankSource, setBlankSourceState] = useState<BlankSource | undefined>(
    () => order.materials?.blankSource
  );

  const materials = useMemo(() => mergeOrderMaterials(order), [order]);
  const garmentLines = getGarmentReceivingLines(materials);
  const dtfLines = getDtfReceivingLines(materials);
  const screenLine = getScreenSetupLine(materials);
  const inkLines = getInkPrepLines(materials);
  const pieceCount = countExpectedGarmentPieces(order);
  const garmentSubtotal = useMemo(
    () =>
      showBlankPricing
        ? orderCustomerGarmentSubtotal(order, shopDefaultMarkup)
        : 0,
    [order, shopDefaultMarkup, showBlankPricing]
  );
  const screenFiles = useMemo(
    () => (order.files ?? []).filter((file) => file.kind === "separation"),
    [order.files]
  );

  const garmentRowGroups = useMemo(() => {
    const rowSpanByLineId = new Map<string, number>();
    const isFirstRow = new Map<string, boolean>();
    const counts = new Map<string, number>();

    for (const line of garmentLines) {
      const key = line.lineItemId ?? line.id;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const seen = new Set<string>();
    for (const line of garmentLines) {
      const key = line.lineItemId ?? line.id;
      if (!seen.has(key)) {
        seen.add(key);
        isFirstRow.set(line.id, true);
        rowSpanByLineId.set(line.id, counts.get(key) ?? 1);
      } else {
        isFirstRow.set(line.id, false);
      }
    }

    return { rowSpanByLineId, isFirstRow };
  }, [garmentLines]);

  const allReceived = materials.lines.every((line) => line.status === "received");

  useEffect(() => {
    setBlankSourceState(order.materials?.blankSource ?? materials.blankSource);
  }, [order.materials?.blankSource, materials.blankSource]);

  const saveMaterials = async (
    patch: Partial<Pick<import("@/types").OrderMaterials, "lines" | "blankSource">>
  ) => {
    const nextBlankSource =
      patch.blankSource !== undefined
        ? patch.blankSource
        : order.materials?.blankSource ?? materials.blankSource;

    setSaving(true);
    try {
      return await updateOrderMaterials(order.id, {
        lines: patch.lines ?? materials.lines,
        blankSource: nextBlankSource,
      });
    } finally {
      setSaving(false);
    }
  };

  const saveLines = async (lines: OrderMaterialLine[]) => {
    await saveMaterials({ lines });
  };

  const setBlankSource = async (next: BlankSource) => {
    if (blankSource === next) return;

    const previous = blankSource;
    setBlankSourceState(next);
    try {
      const saved = await saveMaterials({ blankSource: next });
      if (saved?.materials?.blankSource !== next) {
        throw new Error("Goods source did not save");
      }
    } catch {
      setBlankSourceState(previous);
    }
  };

  const updateLine = (lineId: string, receivedQty: number) => {
    const lines = materials.lines.map((line) => {
      if (line.id !== lineId) return line;
      const nextQty = Math.min(Math.max(0, receivedQty), line.expectedQty);
      return {
        ...line,
        receivedQty: nextQty,
        status: computeMaterialLineStatus(line.expectedQty, nextQty),
      };
    });
    saveLines(lines);
  };

  const updateOrderedQty = async (
    line: OrderMaterialLine,
    quantity: number
  ) => {
    if (!line.lineItemId || !line.size) return;
    const rebuilt = rebuildLineItemQuantity(
      order,
      line.lineItemId,
      line.size,
      quantity
    );
    if (!rebuilt) return;

    setSaving(true);
    try {
      await updateOrderLineItem(order.id, line.lineItemId, rebuilt);
    } finally {
      setSaving(false);
    }
  };

  const updateLineItemPricing = async (
    lineItemId: string,
    patch: { markupPercent?: number; customerUnitPrice?: number }
  ) => {
    const item = order.lineItems.find((entry) => entry.id === lineItemId);
    if (!item) return;

    const nextItem: LineItem = { ...item };

    if (patch.markupPercent !== undefined) {
      nextItem.markupPercent = normalizeMarkupPercent(patch.markupPercent);
      delete nextItem.customerUnitPrice;
    }

    if (patch.customerUnitPrice !== undefined) {
      nextItem.customerUnitPrice =
        Math.round(Math.max(0, patch.customerUnitPrice) * 100) / 100;
      delete nextItem.markupPercent;
    }

    setSaving(true);
    try {
      await updateOrderLineItem(
        order.id,
        lineItemId,
        serializeLineItemForApi(nextItem)
      );
    } finally {
      setSaving(false);
    }
  };

  const removeGarmentRow = async (line: OrderMaterialLine) => {
    if (!line.lineItemId || !line.size) return;

    const item = order.lineItems.find((entry) => entry.id === line.lineItemId);
    if (!item) return;

    const remainingSizes = item.sizes.filter(
      (row) => row.size !== line.size && row.quantity > 0
    );

    setRemovingRowId(line.id);
    try {
      if (remainingSizes.length === 0) {
        await removeOrderLineItem(order.id, line.lineItemId);
      } else {
        await updateOrderedQty(line, 0);
      }
      setRemoveTarget(null);
    } finally {
      setRemovingRowId(null);
    }
  };

  const removeBlockedReason = (line: OrderMaterialLine | null) => {
    if (!line) return null;
    if (pieceCount <= line.expectedQty) {
      return "This order needs at least one blank piece. Add another size before removing this one.";
    }
    return null;
  };

  const blanksHeader = (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className={dashboardTaskTitleClass}>{blanksTabLabel(order)}</h2>
          <span className="rounded-md bg-[#f1f1f1] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#616161]">
            {pieceCount} pcs
          </span>
        </div>
        <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
          {orderBlanksEditHint(order)}
          {showBlankPricing ? (
            <> Blank pricing is staff only — not shown in the customer portal.</>
          ) : null}
        </p>
      </div>
      {canEditBlanks ? (
        <Button
          type="button"
          disabled={saving}
          className={cn(dashboardControlClass, "h-8 shrink-0 text-[12px]")}
          onClick={() => setAddItemOpen(true)}
        >
          <Plus className="size-3.5" />
          Add item
        </Button>
      ) : null}
    </div>
  );

  const blanksTable = (
    <div className={cn(dashboardInsetSurfaceClass, "overflow-hidden")}>
      <div className="overflow-x-auto">
        <table
          className={cn(
            "w-full text-[13px]",
            showBlankPricing ? "min-w-[1120px]" : "min-w-[880px]"
          )}
        >
          <thead>
            <tr className="border-b border-[#ebebeb] bg-[#fafafa]">
              <th className="min-w-[180px] px-4 py-2.5 text-left font-medium text-[#616161]">
                Product
              </th>
              <th className="min-w-[100px] px-3 py-2.5 text-left font-medium text-[#616161]">
                Color
              </th>
              <th className="w-16 px-3 py-2.5 text-left font-medium text-[#616161]">
                Size
              </th>
              <th className="w-28 px-3 py-2.5 text-right font-medium text-[#616161]">
                Ordered
              </th>
              <th className="w-40 px-3 py-2.5 text-right font-medium text-[#616161]">
                Received
              </th>
              {showBlankPricing ? (
                <>
                  <th className="w-28 px-3 py-2.5 text-right font-medium text-[#616161]">
                    Blank cost
                  </th>
                  <th className="w-28 px-3 py-2.5 text-right font-medium text-[#616161]">
                    Markup %
                  </th>
                  <th className="w-32 px-3 py-2.5 text-right font-medium text-[#616161]">
                    Customer cost
                  </th>
                </>
              ) : null}
              <th className="w-24 px-3 py-2.5 text-right font-medium text-[#616161]">
                Status
              </th>
              {canEditBlanks ? (
                <th className="w-12 px-2 py-2.5 text-center font-medium text-[#616161]">
                  <span className="sr-only">Remove</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {garmentLines.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    (canEditBlanks ? 1 : 0) +
                    6 +
                    (showBlankPricing ? 3 : 0)
                  }
                  className="px-4 py-8 text-center text-[13px] text-[#616161]"
                >
                  No line items yet — click Add item to start this order.
                </td>
              </tr>
            ) : (
              garmentLines.map((line) => {
                const lineItem = order.lineItems.find(
                  (entry) => entry.id === line.lineItemId
                );
                const shopUnitCost = lineItem?.unitCost ?? 0;
                const shopLineTotal = shopUnitCost * line.expectedQty;
                const customerUnitPrice = lineItem
                  ? resolveLineItemCustomerUnitPrice(lineItem, shopDefaultMarkup)
                  : 0;
                const customerLineTotal = customerUnitPrice * line.expectedQty;
                const markupPercent = lineItem
                  ? resolveLineItemMarkupPercent(lineItem, shopDefaultMarkup)
                  : shopDefaultMarkup;
                const isFirstInGroup = garmentRowGroups.isFirstRow.get(line.id) ?? true;
                const rowSpan = garmentRowGroups.rowSpanByLineId.get(line.id);
                const isRemoving = removingRowId === line.id;
                const removeBlocked = removeBlockedReason(line);
                const rowStyles =
                  line.status === "received"
                    ? undefined
                    : GARMENT_RECEIVE_STATUS_STYLES[line.status];

                return (
                  <tr
                    key={line.id}
                    className={cn(
                      "border-b border-[#ebebeb] last:border-0",
                      rowStyles?.row
                    )}
                  >
                    {isFirstInGroup ? (
                      <>
                        <td
                          rowSpan={rowSpan}
                          className="border-r border-[#f0f0f0] px-4 py-3 align-top"
                        >
                          <p className="font-medium text-[#303030]">
                            {line.productName ?? line.label}
                          </p>
                          {line.brand ? (
                            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-[#8a8a8a]">
                              <span>{line.brand}</span>
                              {lineItem?.supplier === "ssActivewear" ? (
                                <span className="rounded bg-[#eef1ff] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-primary">
                                  S&amp;S
                                </span>
                              ) : null}
                            </p>
                          ) : null}
                        </td>
                        <td
                          rowSpan={rowSpan}
                          className="border-r border-[#f0f0f0] px-3 py-3 align-top text-[#616161]"
                        >
                          {line.color ?? "—"}
                        </td>
                      </>
                    ) : null}
                    <td className="px-3 py-3 font-semibold text-[#303030]">
                      {line.size ?? "—"}
                    </td>
                    <td className="px-3 py-3">
                      {canEditBlanks ? (
                        <QtyOrderedInput
                          value={line.expectedQty}
                          disabled={saving || isRemoving}
                          onSave={(qty) => updateOrderedQty(line, qty)}
                        />
                      ) : (
                        <div className="text-right tabular-nums text-[#303030]">
                          {line.expectedQty}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <QtyReceivedInput
                        line={line}
                        saving={saving || isRemoving}
                        onSave={(qty) => updateLine(line.id, qty)}
                      />
                    </td>
                    {showBlankPricing ? (
                      <>
                        <td className="px-3 py-3 text-right">
                          <p className="font-medium tabular-nums text-[#303030]">
                            {formatCurrency(shopLineTotal)}
                          </p>
                          {shopUnitCost > 0 ? (
                            <p className="mt-0.5 text-[11px] tabular-nums text-[#8a8a8a]">
                              {formatCurrency(shopUnitCost)}/ea
                            </p>
                          ) : null}
                        </td>
                        {isFirstInGroup && line.lineItemId ? (
                          <td
                            rowSpan={rowSpan}
                            className="border-l border-[#f0f0f0] px-3 py-3 align-top"
                          >
                            {canEditBlanks ? (
                              <MarkupPercentInput
                                value={markupPercent}
                                disabled={saving || isRemoving}
                                onSave={(nextMarkup) =>
                                  updateLineItemPricing(line.lineItemId!, {
                                    markupPercent: nextMarkup,
                                  })
                                }
                              />
                            ) : (
                              <div className="text-right tabular-nums text-[#303030]">
                                {markupPercent}%
                              </div>
                            )}
                          </td>
                        ) : null}
                        <td className="px-3 py-3 text-right">
                          <p className="font-medium tabular-nums text-[#303030]">
                            {formatCurrency(customerLineTotal)}
                          </p>
                          {isFirstInGroup && line.lineItemId ? (
                            canEditBlanks ? (
                              <div className="mt-2 flex justify-end">
                                <CustomerUnitPriceInput
                                  value={customerUnitPrice}
                                  disabled={saving || isRemoving}
                                  onSave={(nextPrice) =>
                                    updateLineItemPricing(line.lineItemId!, {
                                      customerUnitPrice: nextPrice,
                                    })
                                  }
                                />
                              </div>
                            ) : (
                              <p className="mt-0.5 text-[11px] tabular-nums text-[#8a8a8a]">
                                {formatCurrency(customerUnitPrice)}/ea
                              </p>
                            )
                          ) : !isFirstInGroup ? (
                            <p className="mt-0.5 text-[11px] tabular-nums text-[#8a8a8a]">
                              {formatCurrency(customerUnitPrice)}/ea
                            </p>
                          ) : null}
                        </td>
                      </>
                    ) : null}
                    <td className="px-3 py-3 text-right">
                      <ReceivingStatusPill status={line.status} />
                    </td>
                    {canEditBlanks ? (
                      <td className="px-2 py-3 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={saving || removingRowId !== null}
                          className="size-8 text-[#8a8a8a] hover:border hover:border-[#f5b5b5] hover:bg-[#fff1f1] hover:text-[#8f1f1f]"
                          aria-label={`Remove ${line.size} ${line.color ?? ""} ${line.productName ?? line.label}`}
                          title={
                            removeBlocked
                              ? "Add another blank before removing the last pieces"
                              : `Remove ${line.size}`
                          }
                          onClick={() => setRemoveTarget(line)}
                        >
                          {isRemoving ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
          {garmentLines.length > 0 && showBlankPricing ? (
            <tfoot>
              <tr className="border-t border-[#ebebeb] bg-[#fafafa]">
                <td
                  colSpan={5}
                  className="px-4 py-2.5 text-right text-[12px] font-semibold text-[#616161]"
                >
                  Customer garment subtotal
                </td>
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5 text-right text-[13px] font-semibold tabular-nums text-[#303030]">
                  {formatCurrency(garmentSubtotal)}
                </td>
                <td colSpan={canEditBlanks ? 2 : 1} />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );

  const toggleScreen = (done: boolean) => {
    if (!screenLine) return Promise.resolve();
    const lines = materials.lines.map((line) =>
      line.id === screenLine.id
        ? {
            ...line,
            expectedQty: 1,
            receivedQty: done ? 1 : 0,
            status: done ? ("received" as const) : ("waiting" as const),
          }
        : line
    );
    return saveLines(lines);
  };

  const toggleInkColorPrep = async (
    lineId: string,
    colorId: string,
    prepped: boolean
  ) => {
    const lines = materials.lines.map((line) => {
      if (line.id !== lineId || !line.jobId || !line.imprintId) return line;
      const imprint = findImprint(order, line.jobId, line.imprintId);
      if (!imprint) return line;
      return inkPrepLineFromColorToggle(line, imprint, colorId, prepped);
    });
    await saveLines(lines);
  };

  const markInkLocationPrep = async (lineId: string, prepped: boolean) => {
    const lines = materials.lines.map((line) => {
      if (line.id !== lineId || !line.jobId || !line.imprintId) return line;
      const imprint = findImprint(order, line.jobId, line.imprintId);
      if (!imprint) return line;
      return inkPrepLineMarkAll(line, imprint, prepped);
    });
    await saveLines(lines);
  };

  const persistImprintInkColors = (
    jobId: string,
    imprintId: string,
    inkColors: ImprintInkColor[]
  ) => updateImprintInkColors(order.id, jobId, imprintId, inkColors);

  const handleScreenFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setScreenFileError(null);
    setPendingScreenFile(file);
  };

  const confirmScreenFileUpload = async (fullName: string) => {
    if (!pendingScreenFile) return;

    setScreenFileError(null);
    setUploadingScreenFile(true);
    try {
      const { base64, contentType, error } =
        await readUploadContent(pendingScreenFile);
      if (error) {
        setScreenFileError(error);
        return;
      }
      await uploadOrderFile(order.id, {
        name: fullName,
        kind: "separation",
        uploadedBy: "Shop",
        contentBase64: base64,
        contentType,
      });
      setPendingScreenFile(null);
    } catch {
      setScreenFileError("Could not upload this file. Try again.");
    } finally {
      setUploadingScreenFile(false);
    }
  };

  const confirmDeleteFile = async () => {
    if (!deleteFileTarget) return;

    setDeletingFileId(deleteFileTarget.id);
    try {
      await deleteOrderFile(order.id, deleteFileTarget.id);
      setDeleteFileTarget(null);
    } catch {
      setScreenFileError("Could not delete this file. Try again.");
    } finally {
      setDeletingFileId(null);
    }
  };

  const sectionTitle =
    section === "dtf"
      ? "DTF sheets"
      : section === "screens"
        ? "Screens"
        : section === "inks"
          ? "Inks"
        : section === "blanks"
          ? blanksTabLabel(order)
          : "Receiving";

  const sectionDescription =
    section === "dtf"
      ? "Receive transfer sheets per print location before scheduling DTF production."
      : section === "screens"
        ? "Burn and prep screens for every screen print location on this order."
        : section === "inks"
          ? "Mix and prep ink for each screen print location before production."
        : "Confirm blank garments by size and who is ordering the goods.";

  const sectionEmpty =
    section === "dtf"
      ? dtfLines.length === 0
      : section === "screens"
        ? !screenLine
        : section === "inks"
          ? inkLines.length === 0
        : false;

  const showBlanks = !section || section === "blanks";
  const showDtf = !section || section === "dtf";
  const showScreens = !section || section === "screens";

  if (section === "blanks") {
    return (
      <>
        <section className={dashboardCardClass}>
          {blanksHeader}
          <div className="space-y-5 p-4 sm:p-5">
            {garmentLines.length > 0 ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[13px] font-semibold text-[#303030]">
                    Who orders the goods?
                  </h3>
                  <span
                    className={cn(
                      "inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                      blankSource
                        ? "border-[#86d4a8] bg-[#e8f5ee] text-[#0d5c2e]"
                        : "border-[#f0d9a8] bg-[#ffef9d] text-[#4a3800]"
                    )}
                  >
                    {blankSource ? blankSourceLabel(blankSource) : "Not set"}
                  </span>
                </div>
                <p className={dashboardTaskDetailClass}>
                  Shop PO vs customer-supplied garments — shown on the orders list.
                </p>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(BLANK_SOURCE_LABELS) as [BlankSource, string][]).map(
                    ([value, label]) => (
                      <ProofActionButton
                        key={value}
                        variant="secondary"
                        selected={blankSource === value}
                        disabled={saving || !canEditBlanks}
                        successLabel="Saved"
                        className="h-9 flex-1 text-[13px] sm:flex-none"
                        onClick={() => setBlankSource(value)}
                      >
                        {label}
                      </ProofActionButton>
                    )
                  )}
                </div>
              </div>
            ) : null}

            {blanksTable}
          </div>
        </section>
        <AddBlankItemDialog
          open={addItemOpen}
          onOpenChange={setAddItemOpen}
          orderId={order.id}
          order={order}
        />
        <RemoveBlankSizeDialog
          open={removeTarget !== null}
          onOpenChange={(open) => {
            if (!open) setRemoveTarget(null);
          }}
          line={removeTarget}
          blockedReason={removeBlockedReason(removeTarget)}
          saving={removingRowId !== null}
          onConfirm={() => {
            if (removeTarget) void removeGarmentRow(removeTarget);
          }}
        />
      </>
    );
  }

  if (section === "inks") {
    return (
      <section className={dashboardCardClass}>
        <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
          <h2 className={dashboardTaskTitleClass}>Inks</h2>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            Mix and prep each Pantone for every screen print location. PMS
            edits here update proofs and artwork on the order.
          </p>
        </div>
        <div className="space-y-5 p-4 sm:p-5">
          {inkLines.length === 0 ? (
            <p className={dashboardTaskDetailClass}>
              Add a screen print event first — then prep ink for each location.
            </p>
          ) : (
            <div className="space-y-3">
              {inkLines.map((line) => {
                if (!line.jobId || !line.imprintId) return null;
                const job = order.jobs.find((entry) => entry.id === line.jobId);
                const imprint = findImprint(
                  order,
                  line.jobId,
                  line.imprintId
                );
                if (!job || !imprint) return null;

                return (
                  <InkPrepLocationCard
                    key={line.id}
                    line={line}
                    job={job}
                    imprint={imprint}
                    saving={saving}
                    onToggleColorPrep={(colorId, prepped) =>
                      toggleInkColorPrep(line.id, colorId, prepped)
                    }
                    onMarkAllPrep={(prepped) =>
                      markInkLocationPrep(line.id, prepped)
                    }
                    onPersistInkColors={(inkColors) =>
                      persistImprintInkColors(
                        line.jobId!,
                        line.imprintId!,
                        inkColors
                      )
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>
    );
  }

  if (section && sectionEmpty) {
    return (
      <section className={dashboardCardClass}>
        <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
          <h2 className={dashboardTaskTitleClass}>{sectionTitle}</h2>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            {section === "dtf"
              ? "Add a DTF decoration event first — then receive sheets per location here."
              : section === "screens"
                ? "Add a screen print event first — then confirm screens are burned and ready."
                : section === "inks"
                  ? "Add a screen print event first — then confirm ink is mixed and ready."
                : "Add products to this order first."}
          </p>
        </div>
      </section>
    );
  }

  if (
    !section &&
    garmentLines.length === 0 &&
    dtfLines.length === 0 &&
    !screenLine
  ) {
    return (
      <section className={dashboardCardClass}>
        <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
          <h2 className={dashboardTaskTitleClass}>Receiving</h2>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            Add products and production events first — then confirm blanks and
            transfers here before scheduling.
          </p>
        </div>
      </section>
    );
  }

  return (
    <>
    <section className={dashboardCardClass}>
      <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
        <h2 className={dashboardTaskTitleClass}>{sectionTitle}</h2>
        <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
          {sectionDescription}
        </p>
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        {allReceived && !section ? (
          <div className="rounded-lg border border-[#b7d8b7] bg-[#e3f1df] px-4 py-3 text-sm font-medium text-[#0d5c2e]">
            All receiving items done — ready to schedule production.
          </div>
        ) : null}

        {showBlanks && garmentLines.length > 0 ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[13px] font-semibold text-[#303030]">
                Who orders the goods?
              </h3>
              <span
                className={cn(
                  "inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                  blankSource
                    ? "border-[#86d4a8] bg-[#e8f5ee] text-[#0d5c2e]"
                    : "border-[#f0d9a8] bg-[#ffef9d] text-[#4a3800]"
                )}
              >
                {blankSource ? blankSourceLabel(blankSource) : "Not set"}
              </span>
            </div>
            <p className={dashboardTaskDetailClass}>
              Shop PO vs customer-supplied garments — shown on the orders list.
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(BLANK_SOURCE_LABELS) as [BlankSource, string][]).map(
                ([value, label]) => (
                  <ProofActionButton
                    key={value}
                    variant="secondary"
                    selected={blankSource === value}
                    disabled={saving}
                    successLabel="Saved"
                    className="h-9 flex-1 text-[13px] sm:flex-none"
                    onClick={() => setBlankSource(value)}
                  >
                    {label}
                  </ProofActionButton>
                )
              )}
            </div>
          </div>
        ) : null}

        {showBlanks && garmentLines.length > 0 ? (
          <div className="space-y-2">{blanksTable}</div>
        ) : null}

        {showDtf && dtfLines.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-[#303030]">
              DTF sheets
            </h3>
            <p className={dashboardTaskDetailClass}>
              One row per print location — {pieceCount} sheet
              {pieceCount !== 1 ? "s" : ""} needed for each decoration on this
              order.
            </p>
            <div className={cn(dashboardInsetSurfaceClass, "overflow-hidden")}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-[13px]">
                  <thead>
                    <tr className="border-b border-[#ebebeb] bg-[#fafafa]">
                      <th className="px-4 py-2.5 text-left font-medium text-[#616161]">
                        Location
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                        Ordered
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium text-[#616161]">
                        Received
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium text-[#616161]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dtfLines.map((line) => (
                      <tr
                        key={line.id}
                        className="border-b border-[#ebebeb] last:border-0"
                      >
                        <td className="px-4 py-3 font-medium text-[#303030]">
                          {line.label}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-[#303030]">
                          {line.expectedQty}
                        </td>
                        <td className="px-3 py-3">
                          <QtyReceivedInput
                            line={line}
                            saving={saving}
                            onSave={(qty) => updateLine(line.id, qty)}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ReceivingStatusPill status={line.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {showScreens && screenLine ? (
          <div className="space-y-5">
            <input
              ref={screenFileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.ai,.eps,.svg,.png,.jpg,.jpeg,.tif,.tiff"
              onChange={handleScreenFileChange}
            />

            <ScreenFilesSection
              files={screenFiles}
              uploading={uploadingScreenFile}
              error={screenFileError}
              onUploadClick={() => screenFileInputRef.current?.click()}
              onPreview={(file) => setPreviewFile(file)}
              onDelete={(file) => setDeleteFileTarget(file)}
              deletingFileId={deletingFileId}
            />

            <div className="space-y-2">
              <h3 className="text-[13px] font-semibold text-[#303030]">
                Screen prep
              </h3>
              <p className={dashboardTaskDetailClass}>
                Once the films are burned, mark screens ready for production.
              </p>
              <ScreenSetupRow
                line={screenLine}
                saving={saving}
                onToggle={toggleScreen}
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
    <ScreenFileNameDialog
      open={pendingScreenFile !== null}
      onOpenChange={(open) => {
        if (!open) setPendingScreenFile(null);
      }}
      orderNumber={order.number}
      file={pendingScreenFile}
      uploading={uploadingScreenFile}
      onConfirm={(fullName) => void confirmScreenFileUpload(fullName)}
    />
    <DeleteFileDialog
      open={deleteFileTarget !== null}
      onOpenChange={(open) => {
        if (!open) setDeleteFileTarget(null);
      }}
      file={deleteFileTarget}
      deleting={deletingFileId !== null}
      onConfirm={() => void confirmDeleteFile()}
    />
    <FilePreviewDialog
      open={previewFile !== null}
      onOpenChange={(open) => {
        if (!open) setPreviewFile(null);
      }}
      file={previewFile}
    />
    </>
  );
}

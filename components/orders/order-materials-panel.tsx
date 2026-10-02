"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Trash2,
  Upload,
} from "lucide-react";
import { useRegisterUnsavedChanges } from "@/components/layout/staff-unsaved-changes-provider";
import { FilePreviewDialog } from "@/components/files/file-preview-dialog";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useNameBeforeUpload } from "@/hooks/use-name-before-upload";
import { readUploadContent } from "@/lib/artwork-preview";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { filePreviewSource } from "@/lib/file-preview";
import { ProofActionButton } from "@/components/orders/artwork/proof-action-button";
import { AddBlankItemDialog } from "@/components/orders/add-blank-item-dialog";
import { EditBlankItemDialog } from "@/components/orders/edit-blank-item-dialog";
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
  isGarmentOverReceived,
  materialReceiveOverage,
  mergeOrderMaterials,
  materialStatusLabel,
  receiveAllGarmentLines,
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
import { formatBrandProductName } from "@/lib/format-product-name";
import {
  compactOrderNumberForLabel,
  NEW_ORDER_COLORS,
  NEW_ORDER_PRODUCTS,
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
  onSave: (markupPercent: number) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState(String(value || ""));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(String(value || ""));
  }, [value]);

  const commit = async () => {
    if (saving) return;
    const parsed = normalizeMarkupPercent(Number(draft) || 0);
    setDraft(String(parsed));
    if (parsed === value) return;

    setSaving(true);
    try {
      await onSave(parsed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Input
        type="number"
        min={0}
        step="0.1"
        value={draft}
        disabled={disabled || saving}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          void commit();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className="h-8 w-[72px] rounded-lg border-[#e3e3e3] text-right text-sm tabular-nums"
      />
      <span className="text-[12px] text-[#8a8a8a]">%</span>
      {saving ? (
        <Loader2
          className="size-3.5 shrink-0 animate-spin text-brand-primary"
          aria-label="Saving markup"
        />
      ) : (
        <span className="size-3.5 shrink-0" aria-hidden />
      )}
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

  return {
    ...buildLineItemFromCatalog(
      productKey as (typeof NEW_ORDER_PRODUCTS)[number]["key"],
      colorKey as (typeof NEW_ORDER_COLORS)[number]["key"],
      {
        ...sizeRecord,
        [size]: quantity,
      },
      item.id
    ),
    unitCost: item.unitCost,
    markupPercent: item.markupPercent,
    customerUnitPrice: item.customerUnitPrice,
    supplier: item.supplier,
    supplierPartNumber: item.supplierPartNumber,
    supplierStyleId: item.supplierStyleId,
    imageUrl: item.imageUrl,
    colorHex: item.colorHex,
  };
}

function ReceivingStatusPill({
  line,
}: {
  line: Pick<OrderMaterialLine, "status" | "kind" | "receivedQty" | "expectedQty">;
}) {
  if (materialReceiveOverage(line as OrderMaterialLine) > 0) {
    return (
      <span className="inline-flex rounded-md bg-[#fffbeb] px-2 py-0.5 text-[11px] font-medium text-amber-900">
        Over (+{materialReceiveOverage(line as OrderMaterialLine)})
      </span>
    );
  }

  const tone =
    line.status === "received"
      ? "bg-[#e8f5ee] text-[#0d5c2e]"
      : line.status === "partial"
        ? "bg-[#fde2e2] text-[#8f1f1f]"
        : "bg-[#fff8eb] text-[#8a6116]";

  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium",
        tone
      )}
    >
      {materialStatusLabel(line.status)}
    </span>
  );
}

function QtyReceivedInput({
  line,
  saving,
  onCommit,
  commitOnChange = false,
}: {
  line: OrderMaterialLine;
  saving: boolean;
  onCommit: (receivedQty: number) => void;
  /** When true, commits on each keystroke so status can update without saving. */
  commitOnChange?: boolean;
}) {
  const [value, setValue] = useState(String(line.receivedQty || ""));

  useEffect(() => {
    setValue(String(line.receivedQty || ""));
  }, [line.receivedQty]);

  const normalize = (raw: string) => {
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0
      ? Math.max(0, Math.floor(parsed))
      : 0;
  };

  const commit = (raw: string, { normalizeValue = true } = {}) => {
    const receivedQty = normalize(raw);
    if (normalizeValue) setValue(String(receivedQty));
    if (receivedQty !== line.receivedQty) {
      onCommit(receivedQty);
    }
  };

  const overage = materialReceiveOverage(line);

  return (
    <div className="flex justify-end">
      <Input
        type="number"
        min={0}
        inputMode="numeric"
        value={value}
        disabled={saving}
        onChange={(event) => {
          const next = event.target.value;
          setValue(next);
          if (commitOnChange && next.trim() !== "") {
            const parsed = Number(next);
            if (Number.isFinite(parsed) && parsed >= 0) {
              onCommit(Math.max(0, Math.floor(parsed)));
            }
          }
        }}
        onBlur={() => commit(value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className={cn(
          "h-8 w-[72px] rounded-lg border-[#e3e3e3] text-right text-sm tabular-nums",
          overage > 0 && "border-amber-300 bg-[#fffbeb]"
        )}
        aria-label={`Received quantity for ${line.size ?? "size"}`}
      />
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

type PendingScreenUpload = {
  localId: string;
  name: string;
  contentBase64: string;
  contentType: string;
  previewUrl: string | null;
};

function createPendingScreenId() {
  return `pending-screen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
        <ReceivingStatusPill line={line} />
      )}
    </button>
  );
}

function ScreenFilesSection({
  files,
  pendingUploads,
  uploading,
  error,
  onUploadClick,
  onPreview,
  onDelete,
  onRemovePending,
  deletingFileId,
}: {
  files: import("@/types").OrderFile[];
  pendingUploads: PendingScreenUpload[];
  uploading: boolean;
  error: string | null;
  onUploadClick: () => void;
  onPreview: (file: {
    name: string;
    url: string | null;
    subtitle?: string;
  }) => void;
  onDelete: (file: import("@/types").OrderFile) => void;
  onRemovePending: (localId: string) => void;
  deletingFileId: string | null;
}) {
  const hasFiles = files.length > 0 || pendingUploads.length > 0;

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
          {uploading ? "Adding…" : "Upload screen file"}
        </Button>
      </div>

      {error ? (
        <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[12px] text-[#8f1f1f]">
          {error}
        </p>
      ) : null}

      {!hasFiles ? (
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
            const previewUrl = filePreviewSource(file);
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
                  {previewUrl ? (
                    <button
                      type="button"
                      aria-label={`Preview ${file.name}`}
                      onClick={() =>
                        onPreview({
                          name: file.name,
                          url: previewUrl,
                          subtitle: `${file.uploadedBy} · ${formatDateTime(file.uploadedAt)}`,
                        })
                      }
                      className={cn(
                        dashboardControlClass,
                        "inline-flex h-8 items-center gap-1.5 px-2.5 text-[12px] font-medium text-[#303030] hover:bg-[#fafafa]"
                      )}
                    >
                      <Eye className="size-3.5" />
                      Preview
                    </button>
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

          {pendingUploads.map((entry) => (
            <div
              key={entry.localId}
              className="flex items-center gap-3 bg-[#f8faff] px-4 py-3"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#e8f0fb] text-[#2c6ecb]">
                <FileText className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-[13px] font-medium text-[#303030]">
                    {entry.name}
                  </p>
                  <span className="rounded-md bg-[#e8f0fb] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2c6ecb]">
                    Pending save
                  </span>
                </div>
                <p className="text-[12px] text-[#8a8a8a]">
                  Uploads when you save from the top bar
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {entry.previewUrl ? (
                  <button
                    type="button"
                    aria-label={`Preview ${entry.name}`}
                    onClick={() =>
                      onPreview({
                        name: entry.name,
                        url: entry.previewUrl,
                        subtitle: "Screen file (pending)",
                      })
                    }
                    className={cn(
                      dashboardControlClass,
                      "inline-flex h-8 items-center gap-1.5 px-2.5 text-[12px] font-medium text-[#303030] hover:bg-[#fafafa]"
                    )}
                  >
                    <Eye className="size-3.5" />
                    Preview
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label={`Remove ${entry.name}`}
                  onClick={() => onRemovePending(entry.localId)}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-transparent text-[#8a8a8a] transition-colors hover:border-[#f5b5b5] hover:bg-[#fff1f1] hover:text-[#c0392b]"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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
            Remove file
          </DialogTitle>
          <p className={dashboardTaskDetailClass}>
            This marks the file for removal. It is deleted when you save from
            the top bar — Discard keeps it.
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
                Removing…
              </>
            ) : (
              "Remove file"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type OrderMaterialsSection =
  | "blanks"
  | "received_goods"
  | "dtf"
  | "screens"
  | "inks";

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
  const [editItem, setEditItem] = useState<LineItem | null>(null);
  const [removeTarget, setRemoveTarget] = useState<OrderMaterialLine | null>(null);
  const [removingRowId, setRemovingRowId] = useState<string | null>(null);
  const screenFileInputRef = useRef<HTMLInputElement>(null);
  const [stagingScreenFile, setStagingScreenFile] = useState(false);
  const [screenFileError, setScreenFileError] = useState<string | null>(null);
  const { promptRename, nameFilesDialog } = useNameBeforeUpload();
  const [deleteFileTarget, setDeleteFileTarget] = useState<OrderFile | null>(
    null
  );
  const [previewFile, setPreviewFile] = useState<{
    name: string;
    url: string | null;
    subtitle?: string;
  } | null>(null);
  /** Local screen burned toggle — persist via the top save bar. */
  const [screenBurnedDraft, setScreenBurnedDraft] = useState<boolean | null>(
    null
  );
  const [pendingScreenUploads, setPendingScreenUploads] = useState<
    PendingScreenUpload[]
  >([]);
  const [pendingScreenDeleteIds, setPendingScreenDeleteIds] = useState<
    string[]
  >([]);
  const canEditBlanks = canEditOrderBlanks(order);
  const [draftLineItems, setDraftLineItems] = useState<LineItem[]>(
    () => order.lineItems
  );
  const [draftBlankSource, setDraftBlankSource] = useState<
    BlankSource | undefined
  >(() => order.materials?.blankSource);
  /** Local receive qty edits — status updates live; persist via the top save bar. */
  const [receiveDraftLines, setReceiveDraftLines] = useState<
    OrderMaterialLine[] | null
  >(null);
  /** Local ink prep toggles — status updates live; persist via the top save bar. */
  const [inkDraftLines, setInkDraftLines] = useState<OrderMaterialLine[] | null>(
    null
  );

  useEffect(() => {
    setDraftLineItems(order.lineItems);
    setDraftBlankSource(order.materials?.blankSource);
  }, [order.id, order.lineItems, order.materials?.blankSource]);

  const workingOrder = useMemo(
    () => ({
      ...order,
      lineItems: draftLineItems,
      materials: {
        lines: order.materials?.lines ?? [],
        blankSource: draftBlankSource,
        updatedAt: order.materials?.updatedAt,
      },
    }),
    [order, draftLineItems, draftBlankSource]
  );

  const blankSource = draftBlankSource;
  const materials = useMemo(
    () => mergeOrderMaterials(workingOrder),
    [workingOrder]
  );

  useEffect(() => {
    setReceiveDraftLines(null);
    setInkDraftLines(null);
    setScreenBurnedDraft(null);
    setPendingScreenUploads((current) => {
      for (const entry of current) {
        if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
      }
      return [];
    });
    setPendingScreenDeleteIds([]);
    setScreenFileError(null);
  }, [order.id]);

  const pendingScreenUploadsRef = useRef(pendingScreenUploads);
  pendingScreenUploadsRef.current = pendingScreenUploads;
  useEffect(() => {
    return () => {
      for (const entry of pendingScreenUploadsRef.current) {
        if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
      }
    };
  }, []);

  const receiveMaterials = useMemo(() => {
    if (!receiveDraftLines) return materials;
    return { ...materials, lines: receiveDraftLines };
  }, [materials, receiveDraftLines]);

  const inkMaterials = useMemo(() => {
    if (!inkDraftLines) return materials;
    return { ...materials, lines: inkDraftLines };
  }, [materials, inkDraftLines]);

  const garmentLines = getGarmentReceivingLines(materials);
  const receiveGarmentLines = getGarmentReceivingLines(receiveMaterials);
  const dtfLines = getDtfReceivingLines(materials);
  const savedScreenLine = getScreenSetupLine(materials);
  const screenLine = useMemo(() => {
    if (!savedScreenLine || screenBurnedDraft === null) return savedScreenLine;
    return {
      ...savedScreenLine,
      expectedQty: 1,
      receivedQty: screenBurnedDraft ? 1 : 0,
      status: screenBurnedDraft
        ? ("received" as const)
        : ("waiting" as const),
    };
  }, [savedScreenLine, screenBurnedDraft]);
  const inkLines = getInkPrepLines(inkMaterials);
  const pieceCount = countExpectedGarmentPieces(workingOrder);
  const garmentSubtotal = useMemo(
    () =>
      showBlankPricing
        ? orderCustomerGarmentSubtotal(workingOrder, shopDefaultMarkup)
        : 0,
    [workingOrder, shopDefaultMarkup, showBlankPricing]
  );
  const savedScreenFiles = useMemo(
    () => (order.files ?? []).filter((file) => file.kind === "separation"),
    [order.files]
  );
  const screenFiles = useMemo(
    () =>
      savedScreenFiles.filter(
        (file) => !pendingScreenDeleteIds.includes(file.id)
      ),
    [savedScreenFiles, pendingScreenDeleteIds]
  );

  const garmentRowGroups = useMemo(() => {
    const rowSpanByLineId = new Map<string, number>();
    const isFirstRow = new Map<string, boolean>();
    const counts = new Map<string, number>();
    const linesForGroups =
      section === "blanks" || section === "received_goods"
        ? receiveGarmentLines
        : garmentLines;

    for (const line of linesForGroups) {
      const key = line.lineItemId ?? line.id;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const seen = new Set<string>();
    for (const line of linesForGroups) {
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
  }, [garmentLines, receiveGarmentLines, section]);

  const allReceived = materials.lines.every((line) => line.status === "received");

  const blanksDirty = useMemo(() => {
    const sourceChanged =
      (draftBlankSource ?? null) !== (order.materials?.blankSource ?? null);
    const itemsChanged =
      JSON.stringify(draftLineItems) !== JSON.stringify(order.lineItems);
    return sourceChanged || itemsChanged;
  }, [
    draftBlankSource,
    draftLineItems,
    order.materials?.blankSource,
    order.lineItems,
  ]);

  const saveMaterials = async (
    patch: Partial<Pick<import("@/types").OrderMaterials, "lines" | "blankSource">>
  ) => {
    const nextBlankSource =
      patch.blankSource !== undefined
        ? patch.blankSource
        : draftBlankSource ?? order.materials?.blankSource;

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

  const discardBlanksDraft = useCallback(() => {
    setDraftLineItems(order.lineItems);
    setDraftBlankSource(order.materials?.blankSource);
  }, [order.lineItems, order.materials?.blankSource]);

  const saveBlanksDraft = useCallback(async () => {
    if (!blanksDirty) return;
    setSaving(true);
    try {
      const baselineById = new Map(
        order.lineItems.map((item) => [item.id, item] as const)
      );
      for (const item of draftLineItems) {
        const baseline = baselineById.get(item.id);
        if (
          !baseline ||
          JSON.stringify(item) === JSON.stringify(baseline)
        ) {
          continue;
        }
        await updateOrderLineItem(
          order.id,
          item.id,
          serializeLineItemForApi(item)
        );
      }
      if (
        (draftBlankSource ?? null) !== (order.materials?.blankSource ?? null)
      ) {
        await updateOrderMaterials(order.id, {
          // Prefer receive draft so a concurrent blanks+received save
          // does not write stale received quantities.
          lines: receiveDraftLines ?? order.materials?.lines ?? materials.lines,
          blankSource: draftBlankSource,
        });
      }
    } finally {
      setSaving(false);
    }
  }, [
    blanksDirty,
    draftLineItems,
    draftBlankSource,
    receiveDraftLines,
    order.id,
    order.lineItems,
    order.materials,
    materials.lines,
    updateOrderLineItem,
    updateOrderMaterials,
  ]);

  useRegisterUnsavedChanges(
    canEditBlanks &&
      blanksDirty &&
      (section === "blanks" || section === "received_goods" || !section)
      ? {
          dirty: true,
          saving,
          label: "Unsaved blanks",
          persistAcrossTabs: false,
          onSave: () => saveBlanksDraft(),
          onDiscard: discardBlanksDraft,
        }
      : null,
    `order-blanks-${order.id}`
  );

  const receiveDirty = useMemo(() => {
    if (!receiveDraftLines) return false;
    const savedById = new Map(
      materials.lines.map((line) => [line.id, line.receivedQty ?? 0])
    );
    return receiveDraftLines.some((line) => {
      if (line.kind !== "garments") return false;
      return (savedById.get(line.id) ?? 0) !== (line.receivedQty ?? 0);
    });
  }, [receiveDraftLines, materials.lines]);

  const patchReceiveQty = useCallback(
    (lineId: string, receivedQty: number) => {
      const base = receiveDraftLines ?? materials.lines;
      const nextQty = Math.max(0, Math.floor(receivedQty));
      setReceiveDraftLines(
        base.map((line) => {
          if (line.id !== lineId) return line;
          const extras = Math.max(0, nextQty - line.expectedQty);
          const overageNote =
            line.kind === "garments"
              ? `Received ${extras} extra piece${extras === 1 ? "" : "s"}`
              : undefined;
          return {
            ...line,
            receivedQty: nextQty,
            status: computeMaterialLineStatus(line.expectedQty, nextQty),
            notes:
              extras > 0 && overageNote
                ? overageNote
                : line.notes?.startsWith("Received ")
                  ? undefined
                  : line.notes,
          };
        })
      );
    },
    [receiveDraftLines, materials.lines]
  );

  const markAllReceivedDraft = useCallback(() => {
    const next = receiveAllGarmentLines(
      { ...receiveMaterials, lines: receiveDraftLines ?? materials.lines },
      "Shop"
    );
    setReceiveDraftLines(next.lines);
  }, [receiveMaterials, receiveDraftLines, materials.lines]);

  const saveReceiveDraft = useCallback(async () => {
    if (!receiveDraftLines || !receiveDirty) return;
    setSaving(true);
    try {
      await updateOrderMaterials(order.id, {
        lines: receiveDraftLines,
        blankSource: draftBlankSource ?? order.materials?.blankSource,
      });
      setReceiveDraftLines(null);
    } finally {
      setSaving(false);
    }
  }, [
    receiveDraftLines,
    receiveDirty,
    updateOrderMaterials,
    order.id,
    order.materials?.blankSource,
    draftBlankSource,
  ]);

  const discardReceiveDraft = useCallback(() => {
    setReceiveDraftLines(null);
  }, []);

  useRegisterUnsavedChanges(
    (section === "received_goods" || section === "blanks") && receiveDirty
      ? {
          dirty: true,
          saving,
          label: "Unsaved received quantities",
          persistAcrossTabs: false,
          onSave: () => saveReceiveDraft(),
          onDiscard: discardReceiveDraft,
        }
      : null,
    `order-received-goods-${order.id}`
  );

  const inkDirty = useMemo(() => {
    if (!inkDraftLines) return false;
    const savedById = new Map(
      materials.lines
        .filter((line) => line.kind === "ink_prep")
        .map((line) => [
          line.id,
          {
            status: line.status,
            ids: [...(line.preppedInkColorIds ?? [])].sort().join(","),
          },
        ] as const)
    );
    return inkDraftLines.some((line) => {
      if (line.kind !== "ink_prep") return false;
      const saved = savedById.get(line.id);
      if (!saved) return true;
      const nextIds = [...(line.preppedInkColorIds ?? [])].sort().join(",");
      return saved.status !== line.status || saved.ids !== nextIds;
    });
  }, [inkDraftLines, materials.lines]);

  const saveInkDraft = useCallback(async () => {
    if (!inkDraftLines || !inkDirty) return;
    setSaving(true);
    try {
      await updateOrderMaterials(order.id, {
        lines: inkDraftLines,
        blankSource: draftBlankSource ?? order.materials?.blankSource,
      });
      setInkDraftLines(null);
    } finally {
      setSaving(false);
    }
  }, [
    inkDraftLines,
    inkDirty,
    updateOrderMaterials,
    order.id,
    order.materials?.blankSource,
    draftBlankSource,
  ]);

  const discardInkDraft = useCallback(() => {
    setInkDraftLines(null);
  }, []);

  useRegisterUnsavedChanges(
    section === "inks" && inkDirty
      ? {
          dirty: true,
          saving,
          label: "Unsaved ink prep",
          persistAcrossTabs: false,
          onSave: () => saveInkDraft(),
          onDiscard: discardInkDraft,
        }
      : null,
    `order-inks-${order.id}`
  );

  const screenBurnDirty = useMemo(() => {
    if (screenBurnedDraft === null || !savedScreenLine) return false;
    return (savedScreenLine.status === "received") !== screenBurnedDraft;
  }, [screenBurnedDraft, savedScreenLine]);

  const screenFilesDirty =
    pendingScreenUploads.length > 0 || pendingScreenDeleteIds.length > 0;
  const screensDirty = screenBurnDirty || screenFilesDirty;

  const discardScreensDraft = useCallback(() => {
    setScreenBurnedDraft(null);
    setPendingScreenUploads((current) => {
      for (const entry of current) {
        if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
      }
      return [];
    });
    setPendingScreenDeleteIds([]);
    setScreenFileError(null);
  }, []);

  const saveScreensDraft = useCallback(async () => {
    if (!screensDirty) return;
    setSaving(true);
    setScreenFileError(null);
    try {
      if (screenBurnDirty && savedScreenLine) {
        const burned = screenBurnedDraft === true;
        const lines = materials.lines.map((line) =>
          line.id === savedScreenLine.id
            ? {
                ...line,
                expectedQty: 1,
                receivedQty: burned ? 1 : 0,
                status: burned
                  ? ("received" as const)
                  : ("waiting" as const),
              }
            : line
        );
        await updateOrderMaterials(order.id, {
          lines,
          blankSource: draftBlankSource ?? order.materials?.blankSource,
        });
        setScreenBurnedDraft(null);
      }
      for (const fileId of pendingScreenDeleteIds) {
        await deleteOrderFile(order.id, fileId);
      }
      for (const entry of pendingScreenUploads) {
        await uploadOrderFile(order.id, {
          name: entry.name,
          kind: "separation",
          uploadedBy: "Shop",
          contentBase64: entry.contentBase64,
          contentType: entry.contentType,
        });
      }
      setPendingScreenUploads((current) => {
        for (const entry of current) {
          if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
        }
        return [];
      });
      setPendingScreenDeleteIds([]);
    } catch (err) {
      setScreenFileError(
        err instanceof Error
          ? err.message
          : "Could not save screen changes. Try again."
      );
      throw err;
    } finally {
      setSaving(false);
    }
  }, [
    screensDirty,
    screenBurnDirty,
    savedScreenLine,
    screenBurnedDraft,
    materials.lines,
    pendingScreenDeleteIds,
    pendingScreenUploads,
    updateOrderMaterials,
    deleteOrderFile,
    uploadOrderFile,
    order.id,
    order.materials?.blankSource,
    draftBlankSource,
  ]);

  useRegisterUnsavedChanges(
    section === "screens" && screensDirty
      ? {
          dirty: true,
          saving,
          label: "Unsaved screens",
          persistAcrossTabs: false,
          onSave: () => saveScreensDraft(),
          onDiscard: discardScreensDraft,
        }
      : null,
    `order-screens-${order.id}`
  );

  const setBlankSource = (next: BlankSource) => {
    if (draftBlankSource === next) return;
    setDraftBlankSource(next);
  };

  const updateLine = (lineId: string, receivedQty: number) => {
    const lines = materials.lines.map((line) => {
      if (line.id !== lineId) return line;
      const nextQty = Math.max(0, Math.floor(receivedQty));
      const extras = Math.max(0, nextQty - line.expectedQty);
      const overageNote =
        line.kind === "dtf_transfers"
          ? `Received ${extras} extra DTF sheet${extras === 1 ? "" : "s"}`
          : line.kind === "garments"
            ? `Received ${extras} extra piece${extras === 1 ? "" : "s"}`
            : undefined;
      return {
        ...line,
        receivedQty: nextQty,
        status: computeMaterialLineStatus(line.expectedQty, nextQty),
        notes:
          extras > 0 && overageNote
            ? overageNote
            : line.notes?.startsWith("Received ")
              ? undefined
              : line.notes,
      };
    });
    void saveLines(lines);
  };

  const updateOrderedQty = (line: OrderMaterialLine, quantity: number) => {
    if (!line.lineItemId || !line.size) return;
    const rebuilt = rebuildLineItemQuantity(
      workingOrder,
      line.lineItemId,
      line.size,
      quantity
    );
    if (!rebuilt) return;
    setDraftLineItems((current) =>
      current.map((item) => (item.id === rebuilt.id ? rebuilt : item))
    );
  };

  const updateLineItemPricing = (
    lineItemId: string,
    patch: { markupPercent?: number; customerUnitPrice?: number }
  ) => {
    setDraftLineItems((current) =>
      current.map((item) => {
        if (item.id !== lineItemId) return item;
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
        return nextItem;
      })
    );
  };

  const persistOrderedQtyImmediate = async (
    line: OrderMaterialLine,
    quantity: number
  ) => {
    if (!line.lineItemId || !line.size) return;
    const rebuilt = rebuildLineItemQuantity(
      workingOrder,
      line.lineItemId,
      line.size,
      quantity
    );
    if (!rebuilt) return;
    setSaving(true);
    try {
      await updateOrderLineItem(
        order.id,
        line.lineItemId,
        serializeLineItemForApi(rebuilt)
      );
    } finally {
      setSaving(false);
    }
  };

  const removeGarmentRow = async (line: OrderMaterialLine) => {
    if (!line.lineItemId || !line.size) return;

    const item = draftLineItems.find((entry) => entry.id === line.lineItemId);
    if (!item) return;

    const remainingSizes = item.sizes.filter(
      (row) => row.size !== line.size && row.quantity > 0
    );

    setRemovingRowId(line.id);
    try {
      if (remainingSizes.length === 0) {
        await removeOrderLineItem(order.id, line.lineItemId);
      } else {
        await persistOrderedQtyImmediate(line, 0);
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
              <th className="w-28 px-3 py-2.5 text-right font-medium text-[#616161]">
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
            {receiveGarmentLines.length === 0 ? (
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
              receiveGarmentLines.map((line) => {
                const lineItem = draftLineItems.find(
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
                const productTitle = formatBrandProductName(
                  line.brand,
                  line.productName ?? line.label
                );

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
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-[#303030]">
                                {productTitle || "Item"}
                              </p>
                              {lineItem?.supplier === "ssActivewear" ||
                              lineItem?.supplier === "sanMar" ? (
                                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-[#8a8a8a]">
                                  {lineItem?.supplier === "ssActivewear" ? (
                                    <span className="rounded bg-[#eef1ff] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-primary">
                                      S&amp;S
                                    </span>
                                  ) : null}
                                  {lineItem?.supplier === "sanMar" ? (
                                    <span className="rounded bg-[#eef1ff] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-primary">
                                      SanMar
                                    </span>
                                  ) : null}
                                </p>
                              ) : null}
                            </div>
                            {canEditBlanks && lineItem ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={saving || removingRowId !== null}
                                className="size-8 shrink-0 text-[#8a8a8a] hover:border hover:border-[#c9d7ef] hover:bg-[#f8faff] hover:text-[#303030]"
                                aria-label={`Edit ${line.productName ?? line.label}`}
                                title="Edit product, color, and sizes"
                                onClick={() => setEditItem(lineItem)}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                            ) : null}
                          </div>
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
                        commitOnChange
                        onCommit={(qty) => patchReceiveQty(line.id, qty)}
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
                      <ReceivingStatusPill line={line} />
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

  const receivedGoodsTable = (
    <div className={cn(dashboardInsetSurfaceClass, "overflow-hidden")}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-[13px]">
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
              <th className="w-28 px-3 py-2.5 text-right font-medium text-[#616161]">
                Received
              </th>
              <th className="w-28 px-3 py-2.5 text-right font-medium text-[#616161]">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {receiveGarmentLines.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-[13px] text-[#616161]"
                >
                  No blanks on this order yet — add them on the{" "}
                  {blanksTabLabel(order)} tab first.
                </td>
              </tr>
            ) : (
              receiveGarmentLines.map((line) => {
                const isFirstInGroup =
                  garmentRowGroups.isFirstRow.get(line.id) ?? true;
                const rowSpan = garmentRowGroups.rowSpanByLineId.get(line.id);
                const rowStyles =
                  line.status === "received"
                    ? undefined
                    : GARMENT_RECEIVE_STATUS_STYLES[line.status];
                const productTitle = formatBrandProductName(
                  line.brand,
                  line.productName ?? line.label
                );

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
                            {productTitle || "Item"}
                          </p>
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
                    <td className="px-3 py-3 text-right tabular-nums text-[#303030]">
                      {line.expectedQty}
                    </td>
                    <td className="px-3 py-3">
                      <QtyReceivedInput
                        line={line}
                        saving={saving}
                        commitOnChange
                        onCommit={(qty) => patchReceiveQty(line.id, qty)}
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <ReceivingStatusPill line={line} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const blankSourceBlock =
    garmentLines.length > 0 ? (
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
    ) : null;

  const overReceivedNotice = receiveGarmentLines.some((line) =>
    isGarmentOverReceived(line)
  ) ? (
    <div className="rounded-lg border border-amber-300 bg-[#fffbeb] px-3 py-2.5 text-[13px] text-amber-950">
      <p className="font-semibold">Received more than ordered</p>
      <p className="mt-0.5 text-[12px] text-amber-900/90">
        Extra blanks are OK — enter the full qty received so inventory and the
        floor stay accurate. Produced goods (after print) are tracked separately
        on the Produced goods tab.
      </p>
    </div>
  ) : null;

  const toggleScreen = (done: boolean) => {
    if (!savedScreenLine) return;
    setScreenBurnedDraft(done);
  };

  const toggleInkColorPrep = (
    lineId: string,
    colorId: string,
    prepped: boolean
  ) => {
    const base = inkDraftLines ?? materials.lines;
    setInkDraftLines(
      base.map((line) => {
        if (line.id !== lineId || !line.jobId || !line.imprintId) return line;
        const imprint = findImprint(order, line.jobId, line.imprintId);
        if (!imprint) return line;
        return inkPrepLineFromColorToggle(line, imprint, colorId, prepped);
      })
    );
  };

  const markInkLocationPrep = (lineId: string, prepped: boolean) => {
    const base = inkDraftLines ?? materials.lines;
    setInkDraftLines(
      base.map((line) => {
        if (line.id !== lineId || !line.jobId || !line.imprintId) return line;
        const imprint = findImprint(order, line.jobId, line.imprintId);
        if (!imprint) return line;
        return inkPrepLineMarkAll(line, imprint, prepped);
      })
    );
  };

  const persistImprintInkColors = (
    jobId: string,
    imprintId: string,
    inkColors: ImprintInkColor[]
  ) => updateImprintInkColors(order.id, jobId, imprintId, inkColors);

  const handleScreenFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setScreenFileError(null);
    const named = await promptRename(files, {
      title:
        files.length > 1
          ? `Review ${files.length} screen files`
          : "Name screen file",
      description:
        "Files are prefixed with the order number so the floor can match them to this job fast.",
      namePrefix: compactOrderNumberForLabel(order.number),
    });
    if (!named?.length) return;

    setStagingScreenFile(true);
    try {
      const staged: PendingScreenUpload[] = [];
      for (const { file, name } of named) {
        const { base64, contentType, error } = await readUploadContent(file);
        if (error) throw new Error(error);
        const previewUrl = file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : null;
        staged.push({
          localId: createPendingScreenId(),
          name,
          contentBase64: base64,
          contentType,
          previewUrl,
        });
      }
      setPendingScreenUploads((current) => [...current, ...staged]);
    } catch (err) {
      setScreenFileError(
        err instanceof Error
          ? err.message
          : "Could not stage these files. Try again."
      );
    } finally {
      setStagingScreenFile(false);
    }
  };

  const removePendingScreenUpload = (localId: string) => {
    setPendingScreenUploads((current) => {
      const target = current.find((entry) => entry.localId === localId);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((entry) => entry.localId !== localId);
    });
  };

  const confirmDeleteFile = () => {
    if (!deleteFileTarget) return;
    setPendingScreenDeleteIds((current) =>
      current.includes(deleteFileTarget.id)
        ? current
        : [...current, deleteFileTarget.id]
    );
    setDeleteFileTarget(null);
  };

  const sectionTitle =
    section === "dtf"
      ? "DTF sheets"
      : section === "screens"
        ? "Screens"
        : section === "inks"
          ? "Inks"
          : section === "received_goods"
            ? "Received goods"
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
          : section === "received_goods"
            ? "Mark blank garments received by size when the shipment arrives. Save from the top bar when you’re done."
            : "Confirm blank garments by size and who is ordering the goods. Received qty edits save from the top bar.";

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

  if (section === "received_goods") {
    const allDraftReceived =
      receiveGarmentLines.length > 0 &&
      receiveGarmentLines.every((line) => line.status === "received");

    return (
      <section className={dashboardCardClass}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={dashboardTaskTitleClass}>Received goods</h2>
              {receiveGarmentLines.length > 0 ? (
                <span className="rounded-md bg-[#f1f1f1] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#616161]">
                  {
                    receiveGarmentLines.filter(
                      (line) => line.status === "received"
                    ).length
                  }
                  /{receiveGarmentLines.length} sizes in
                </span>
              ) : null}
            </div>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              Type qty received when blanks arrive — status updates as you type.
              Manage styles on the {blanksTabLabel(order)} tab.
            </p>
          </div>
          {receiveGarmentLines.length > 0 ? (
            <Button
              type="button"
              disabled={saving || allDraftReceived}
              className={cn(dashboardControlClass, "h-8 shrink-0 text-[12px]")}
              onClick={markAllReceivedDraft}
              title="Fill every size to the ordered quantity"
            >
              <Check className="size-3.5" />
              Receive all
            </Button>
          ) : null}
        </div>
        <div className="space-y-5 p-4 sm:p-5">
          {blankSourceBlock}
          {overReceivedNotice}
          {receivedGoodsTable}
        </div>
      </section>
    );
  }

  if (section === "blanks") {
    return (
      <>
        <section className={dashboardCardClass}>
          {blanksHeader}
          <div className="space-y-5 p-4 sm:p-5">
            {blankSourceBlock}
            {overReceivedNotice}
            {blanksTable}
          </div>
        </section>
        <AddBlankItemDialog
          open={addItemOpen}
          onOpenChange={setAddItemOpen}
          orderId={order.id}
          order={order}
        />
        <EditBlankItemDialog
          open={editItem !== null}
          onOpenChange={(next) => {
            if (!next) setEditItem(null);
          }}
          orderId={order.id}
          order={order}
          item={editItem}
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
            Mix and prep each Pantone for every screen print location. Prep
            status saves from the top bar. PMS edits here update proofs and
            artwork on the order.
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
            Receiving complete — keep scheduling production on the calendar.
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
                          <div>{line.label}</div>
                          {line.notes ? (
                            <p className="mt-0.5 text-[11px] font-normal text-amber-800">
                              {line.notes}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-[#303030]">
                          {line.expectedQty}
                        </td>
                        <td className="px-3 py-3">
                          <QtyReceivedInput
                            line={line}
                            saving={saving}
                            onCommit={(qty) => updateLine(line.id, qty)}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ReceivingStatusPill line={line} />
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
              multiple
              onChange={handleScreenFileChange}
            />

            <ScreenFilesSection
              files={screenFiles}
              pendingUploads={pendingScreenUploads}
              uploading={stagingScreenFile || saving}
              error={screenFileError}
              onUploadClick={() => screenFileInputRef.current?.click()}
              onPreview={(file) => setPreviewFile(file)}
              onDelete={(file) => setDeleteFileTarget(file)}
              onRemovePending={removePendingScreenUpload}
              deletingFileId={null}
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
    {nameFilesDialog}
    <DeleteFileDialog
      open={deleteFileTarget !== null}
      onOpenChange={(open) => {
        if (!open) setDeleteFileTarget(null);
      }}
      file={deleteFileTarget}
      deleting={false}
      onConfirm={confirmDeleteFile}
    />
    <FilePreviewDialog
      open={Boolean(previewFile?.url)}
      onOpenChange={(open) => {
        if (!open) setPreviewFile(null);
      }}
      title={previewFile?.name || "File"}
      subtitle={previewFile?.subtitle}
      url={previewFile?.url ?? null}
      filename={previewFile?.name}
    />
    </>
  );
}

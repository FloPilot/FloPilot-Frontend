"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Loader2, Plus, Star, Tag, Trash2 } from "lucide-react";
import { PricingMatrixEditor } from "@/components/pricing/pricing-matrix-editor";
import { CustomerContractFeesEditor } from "@/components/pricing/customer-contract-fees-editor";
import { CustomerRateSheetDeleteDialog } from "@/components/customers/customer-rate-sheet-delete-dialog";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  countRateSheetMethods,
  emptyRateSheet,
  rateSheetSummary,
  sortRateSheets,
} from "@/lib/customer-pricing";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { formatDate } from "@/lib/format";
import type {
  Customer,
  CustomerNegotiatedPricing,
  CustomerNegotiatedRateSheet,
} from "@/types";
import { cn } from "@/lib/utils";

function ensureSingleDefault(
  sheets: CustomerNegotiatedRateSheet[]
): CustomerNegotiatedRateSheet[] {
  if (sheets.length === 0) return sheets;
  const enabled = sheets.filter((sheet) => sheet.enabled);
  const pool = enabled.length > 0 ? enabled : sheets;
  const defaultSheet = sheets.find((sheet) => sheet.isDefault) ?? pool[0];
  return sheets.map((sheet) => ({
    ...sheet,
    isDefault: sheet.id === defaultSheet.id,
  }));
}

export function CustomerNegotiatedPricingSection({
  customer,
  onSave,
  className,
}: {
  customer: Customer;
  onSave: (negotiatedPricing: CustomerNegotiatedPricing) => Promise<void>;
  className?: string;
}) {
  const { settings } = useShopSettings();
  const currency = settings.companyProfile.currency || "USD";

  const savedSheets = useMemo(
    () => sortRateSheets(customer.negotiatedPricing?.rateSheets ?? []),
    [customer.negotiatedPricing?.rateSheets]
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [sheetDraft, setSheetDraft] = useState<CustomerNegotiatedRateSheet>(
    emptyRateSheet()
  );
  const [accountSummary, setAccountSummary] = useState(
    customer.negotiatedPricing?.summary ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerNegotiatedRateSheet | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const openNewSheet = () => {
    const draft = emptyRateSheet();
    draft.isDefault = savedSheets.length === 0;
    setEditingSheetId(null);
    setSheetDraft(draft);
    setDraftError(null);
    setDialogOpen(true);
  };

  const openEditSheet = (sheet: CustomerNegotiatedRateSheet) => {
    setEditingSheetId(sheet.id);
    setSheetDraft({ ...sheet });
    setDraftError(null);
    setDialogOpen(true);
  };

  const persistPricing = async (
    rateSheets: CustomerNegotiatedRateSheet[],
    summary = accountSummary
  ) => {
    setSaving(true);
    try {
      await onSave({
        summary: summary.trim(),
        updatedAt: new Date().toISOString(),
        rateSheets: ensureSingleDefault(rateSheets),
      });
    } finally {
      setSaving(false);
    }
  };

  const saveSheetDraft = async () => {
    const trimmedName = sheetDraft.name.trim() || "Negotiated rates";
    const nextSheet: CustomerNegotiatedRateSheet = {
      ...sheetDraft,
      name: trimmedName,
      notes: sheetDraft.notes?.trim() || "",
      updatedAt: new Date().toISOString(),
    };

    if (countRateSheetMethods(nextSheet) === 0) {
      setDraftError("Add at least one decoration method with pricing rows.");
      return;
    }

    const withoutEdited = editingSheetId
      ? savedSheets.filter((sheet) => sheet.id !== editingSheetId)
      : savedSheets;
    const clearedDefaults = nextSheet.isDefault
      ? withoutEdited.map((sheet) => ({ ...sheet, isDefault: false }))
      : withoutEdited;
    const nextSheets = sortRateSheets([...clearedDefaults, nextSheet]);

    await persistPricing(nextSheets);
    setDialogOpen(false);
    setEditingSheetId(null);
    setDraftError(null);
  };

  const deleteSheet = async (sheetId: string) => {
    setDeleting(true);
    try {
      await persistPricing(savedSheets.filter((sheet) => sheet.id !== sheetId));
      setDeleteTarget(null);
      setDialogOpen(false);
      setEditingSheetId(null);
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteConfirm = () => {
    const sheet = savedSheets.find((entry) => entry.id === editingSheetId);
    if (sheet) setDeleteTarget(sheet);
  };

  return (
    <>
      <section className={cn(dashboardCardClass, className)}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ebebeb] px-4 py-3 sm:px-5">
          <div>
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#303030]">
              <Tag className="size-4 text-[#2c6ecb]" />
              Negotiated pricing
            </h2>
            <p className={cn("mt-1", dashboardTaskDetailClass)}>
              Account-specific rate sheets — upload CSV matrices like Settings →
              Pricing. The default sheet applies to this customer&apos;s orders
              and portal.
            </p>
          </div>
          <Button
            type="button"
            className={cn(dashboardPrimaryButtonClass, "h-9 rounded-lg")}
            onClick={openNewSheet}
            disabled={saving}
          >
            <Plus className="size-3.5" />
            Add rate sheet
          </Button>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div
            className={cn(dashboardInsetSurfaceClass, "space-y-2 rounded-lg p-3.5")}
          >
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Customer-facing note (optional)
            </Label>
            <Textarea
              value={accountSummary}
              onChange={(event) => setAccountSummary(event.target.value)}
              rows={2}
              placeholder="e.g. 2025 contract rates — contact us for rush pricing"
              className="min-h-[72px] rounded-lg border-[#e3e3e3] text-sm"
            />
            <div className="flex justify-end">
              <button
                type="button"
                className={cn(dashboardControlClass, "h-8 px-3 text-[12px]")}
                disabled={saving}
                onClick={() => void persistPricing(savedSheets)}
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Save note
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {savedSheets.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-6 text-center">
                <p className="text-[13px] font-medium text-[#303030]">
                  No negotiated rates yet
                </p>
                <p
                  className={cn("mx-auto mt-1 max-w-xs", dashboardTaskDetailClass)}
                >
                  Upload a pricing matrix for this customer — orders will use
                  their default rate sheet instead of shop pricing.
                </p>
              </div>
            ) : (
              savedSheets.map((sheet) => (
                <button
                  key={sheet.id}
                  type="button"
                  onClick={() => openEditSheet(sheet)}
                  className="group flex w-full items-start justify-between gap-3 rounded-lg border border-[#ebebeb] bg-white px-3.5 py-3 text-left transition-colors hover:border-[#d4d4d4] hover:bg-[#fafafa]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-semibold text-[#303030]">
                        {sheet.name}
                      </p>
                      {sheet.isDefault ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f7fd] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2c6ecb]">
                          <Star className="size-3 fill-current" />
                          Default
                        </span>
                      ) : null}
                      {!sheet.enabled ? (
                        <span className="rounded-full bg-[#f1f1f1] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#616161]">
                          Disabled
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[12px] text-[#616161]">
                      {rateSheetSummary(sheet)}
                    </p>
                    {sheet.updatedAt ? (
                      <p className="mt-1 text-[11px] text-[#8a8a8a]">
                        Updated {formatDate(sheet.updatedAt)}
                      </p>
                    ) : null}
                  </div>
                  <ChevronRight className="mt-1 size-4 shrink-0 text-[#8a8a8a] transition-transform group-hover:translate-x-0.5 group-hover:text-[#2c6ecb]" />
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[min(94vh,900px)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="shrink-0 border-b border-[#ebebeb] bg-[#fafafa] px-5 py-4 text-left">
            <DialogTitle className={dashboardTaskTitleClass}>
              {editingSheetId ? "Edit rate sheet" : "Add rate sheet"}
            </DialogTitle>
            <DialogDescription className={dashboardTaskDetailClass}>
              Build or import a pricing matrix for {customer.company}. Set each
              method&apos;s decoration type so renamed display names still price
              screen print, embroidery, and DTF orders correctly.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  Rate sheet name
                </Label>
                <Input
                  value={sheetDraft.name}
                  onChange={(event) =>
                    setSheetDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="2025 Contract, VIP rates"
                  className="h-9 rounded-lg border-[#e3e3e3]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  Internal notes
                </Label>
                <Input
                  value={sheetDraft.notes ?? ""}
                  onChange={(event) =>
                    setSheetDraft((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Optional context for your team"
                  className="h-9 rounded-lg border-[#e3e3e3]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-[13px] text-[#303030]">
                <input
                  type="checkbox"
                  checked={Boolean(sheetDraft.isDefault)}
                  onChange={(event) =>
                    setSheetDraft((current) => ({
                      ...current,
                      isDefault: event.target.checked,
                    }))
                  }
                  className="size-4 rounded border-[#c9c9c9]"
                />
                Default rate sheet for this customer
              </label>
              <label className="flex items-center gap-2 text-[13px] text-[#303030]">
                <input
                  type="checkbox"
                  checked={sheetDraft.enabled !== false}
                  onChange={(event) =>
                    setSheetDraft((current) => ({
                      ...current,
                      enabled: event.target.checked,
                    }))
                  }
                  className="size-4 rounded border-[#c9c9c9]"
                />
                Active
              </label>
            </div>

            <PricingMatrixEditor
              value={{ enabled: true, methods: sheetDraft.methods }}
              onChange={(matrix) =>
                setSheetDraft((current) => ({
                  ...current,
                  methods: matrix.methods,
                }))
              }
              currency={currency}
            />

            <CustomerContractFeesEditor
              sheet={sheetDraft}
              onChange={setSheetDraft}
              currency={currency}
            />

            {draftError ? (
              <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
                {draftError}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4">
            {editingSheetId ? (
              <Button
                type="button"
                variant="ghost"
                className="text-[#8f1f1f] hover:bg-[#fff1f1] hover:text-[#8f1f1f]"
                disabled={saving || deleting}
                onClick={openDeleteConfirm}
              >
                <Trash2 className="size-3.5" />
                Delete rate sheet
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                className="rounded-lg"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className={cn(dashboardPrimaryButtonClass, "rounded-lg")}
                disabled={saving}
                onClick={() => void saveSheetDraft()}
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Save rate sheet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CustomerRateSheetDeleteDialog
        open={Boolean(deleteTarget)}
        sheet={deleteTarget}
        deleting={deleting}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) void deleteSheet(deleteTarget.id);
        }}
      />
    </>
  );
}

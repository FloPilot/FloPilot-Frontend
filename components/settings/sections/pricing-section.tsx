"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Info, Loader2, Plus, Star, Trash2 } from "lucide-react";
import {
  AdminLockNotice,
  SettingsError,
  SettingsHeader,
  SettingsMain,
  SettingsPanel,
} from "@/components/settings/settings-kit";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { PricingMatrixEditor } from "@/components/pricing/pricing-matrix-editor";
import { CustomerContractFeesEditor } from "@/components/pricing/customer-contract-fees-editor";
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
  countShopRateSheetMethods,
  emptyShopRateSheet,
  ensureSingleShopDefault,
  matrixFromShopSheet,
  shopRateSheetSummary,
  sortShopRateSheets,
} from "@/lib/shop-pricing";
import {
  matrixFromShopPricingRateSheet,
  normalizeShopPricingRateSheetList,
  type ShopPricingRateSheet,
} from "@/lib/shop-settings";
import {
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { formatDate } from "@/lib/format";
import type { CustomerNegotiatedRateSheet } from "@/types";
import { cn } from "@/lib/utils";

export function PricingSection() {
  const { settings, isAdmin, updateSettings } = useShopSettings();
  const currency = settings.companyProfile.currency || "USD";

  const savedSheets = useMemo(
    () =>
      sortShopRateSheets(
        normalizeShopPricingRateSheetList(
          settings.pricingMatrix,
          settings.pricingRateSheets
        )
      ),
    [settings.pricingMatrix, settings.pricingRateSheets]
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [sheetDraft, setSheetDraft] = useState<ShopPricingRateSheet>(
    emptyShopRateSheet()
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShopPricingRateSheet | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const persistSheets = async (rateSheets: ShopPricingRateSheet[]) => {
    const nextSheets = ensureSingleShopDefault(rateSheets);
    const defaultSheet =
      nextSheets.find((sheet) => sheet.isDefault) ?? nextSheets[0];
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateSettings({
        pricingRateSheets: nextSheets,
        pricingMatrix: defaultSheet
          ? matrixFromShopPricingRateSheet(defaultSheet)
          : settings.pricingMatrix,
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save pricing");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const openNewSheet = () => {
    const draft = emptyShopRateSheet(
      savedSheets.length === 0 ? "Shop standard" : "New pricing sheet"
    );
    draft.isDefault = savedSheets.length === 0;
    setEditingSheetId(null);
    setSheetDraft(draft);
    setDraftError(null);
    setDialogOpen(true);
  };

  const openEditSheet = (sheet: ShopPricingRateSheet) => {
    setEditingSheetId(sheet.id);
    setSheetDraft({ ...sheet });
    setDraftError(null);
    setDialogOpen(true);
  };

  const saveSheetDraft = async () => {
    const trimmedName = sheetDraft.name.trim() || "Shop standard";
    const nextSheet: ShopPricingRateSheet = {
      ...sheetDraft,
      name: trimmedName,
      notes: sheetDraft.notes?.trim() || "",
      updatedAt: new Date().toISOString(),
    };

    if (countShopRateSheetMethods(nextSheet) === 0) {
      setDraftError("Add at least one decoration method with pricing rows.");
      return;
    }

    const withoutEdited = editingSheetId
      ? savedSheets.filter((sheet) => sheet.id !== editingSheetId)
      : savedSheets;
    const clearedDefaults = nextSheet.isDefault
      ? withoutEdited.map((sheet) => ({ ...sheet, isDefault: false }))
      : withoutEdited;
    const nextSheets = sortShopRateSheets([...clearedDefaults, nextSheet]);

    try {
      await persistSheets(nextSheets);
      setDialogOpen(false);
      setEditingSheetId(null);
      setDraftError(null);
    } catch {
      /* error already set */
    }
  };

  const deleteSheet = async (sheetId: string) => {
    if (savedSheets.length <= 1) {
      setDraftError("Keep at least one shop pricing sheet.");
      return;
    }
    setDeleting(true);
    try {
      await persistSheets(savedSheets.filter((sheet) => sheet.id !== sheetId));
      setDeleteTarget(null);
      setDialogOpen(false);
      setEditingSheetId(null);
    } catch {
      /* error already set */
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteConfirm = () => {
    const sheet = savedSheets.find((entry) => entry.id === editingSheetId);
    if (sheet) setDeleteTarget(sheet);
  };

  return (
    <SettingsMain>
      <SettingsHeader
        title="Pricing"
        description="Create one or more shop rate sheets. Staff can pick which sheet applies on each order estimate."
      >
        <div className="flex items-center gap-2">
          {saved ? (
            <span className="text-[12px] font-medium text-[#1f7a3f]">Saved</span>
          ) : null}
          <Button
            type="button"
            className={cn(dashboardPrimaryButtonClass, "h-9 rounded-lg")}
            onClick={openNewSheet}
            disabled={!isAdmin || saving}
          >
            <Plus className="size-3.5" />
            Add rate sheet
          </Button>
        </div>
      </SettingsHeader>

      {!isAdmin && <AdminLockNotice />}
      {error && <SettingsError message={error} />}

      <SettingsPanel
        title="Shop rate sheets"
        description="The default sheet syncs to legacy shop pricing and is used when an order does not pick another sheet."
      >
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-[#dbe6ff] bg-[#f4f7ff] px-4 py-3 text-[13px] text-[#3a4a6b]">
          <Info className="mt-0.5 size-4 shrink-0 text-brand-primary" />
          <p>
            Add multiple matrices when you need different shop defaults (for
            example retail vs wholesale). On the order estimate, staff can choose
            among these sheets and any customer negotiated sheets.
          </p>
        </div>

        <div className="space-y-2">
          {savedSheets.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-6 text-center">
              <p className="text-[13px] font-medium text-[#303030]">
                No shop pricing yet
              </p>
              <p className={cn("mx-auto mt-1 max-w-xs", dashboardTaskDetailClass)}>
                Add a rate sheet to price decoration methods and additional fees.
              </p>
            </div>
          ) : (
            savedSheets.map((sheet) => (
              <button
                key={sheet.id}
                type="button"
                disabled={!isAdmin}
                onClick={() => openEditSheet(sheet)}
                className="group flex w-full items-start justify-between gap-3 rounded-lg border border-[#ebebeb] bg-white px-3.5 py-3 text-left transition-colors hover:border-[#d4d4d4] hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-60"
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
                    {shopRateSheetSummary(sheet)}
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
      </SettingsPanel>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[min(94vh,900px)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="shrink-0 border-b border-[#ebebeb] bg-[#fafafa] px-5 py-4 text-left">
            <DialogTitle className={dashboardTaskTitleClass}>
              {editingSheetId ? "Edit rate sheet" : "Add rate sheet"}
            </DialogTitle>
            <DialogDescription className={dashboardTaskDetailClass}>
              Build or import a pricing matrix for this shop sheet. Mark one sheet
              as the shop default.
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
                  placeholder="Shop standard, Wholesale, Retail"
                  className="h-9 rounded-lg border-[#e3e3e3]"
                  disabled={!isAdmin}
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
                  disabled={!isAdmin}
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
                  disabled={!isAdmin}
                />
                Default shop rate sheet
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
                  disabled={!isAdmin}
                />
                Active
              </label>
            </div>

            <div
              className={cn(dashboardInsetSurfaceClass, "space-y-2 rounded-lg p-3.5")}
            >
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Blank garment markup (%)
              </Label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={sheetDraft.blankMarkupPercent ?? 0}
                onChange={(event) =>
                  setSheetDraft((current) => ({
                    ...current,
                    blankMarkupPercent: Math.max(
                      0,
                      Number(event.target.value) || 0
                    ),
                  }))
                }
                className={cn(dashboardControlClass, "h-9 max-w-[160px]")}
                disabled={!isAdmin}
              />
              <p className={dashboardTaskDetailClass}>
                Applied to blank garment cost when this sheet is selected on an
                order.
              </p>
            </div>

            <PricingMatrixEditor
              value={matrixFromShopSheet(sheetDraft)}
              onChange={(matrix) =>
                setSheetDraft((current) => ({
                  ...current,
                  methods: matrix.methods,
                  enabled: matrix.enabled,
                }))
              }
              currency={currency}
            />

            <CustomerContractFeesEditor
              sheet={
                {
                  id: sheetDraft.id,
                  name: sheetDraft.name,
                  enabled: sheetDraft.enabled,
                  methods: sheetDraft.methods,
                  contractFees: sheetDraft.contractFees ?? [],
                } satisfies CustomerNegotiatedRateSheet
              }
              onChange={(sheet) =>
                setSheetDraft((current) => ({
                  ...current,
                  contractFees: sheet.contractFees ?? [],
                }))
              }
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
                disabled={!isAdmin || saving || deleting || savedSheets.length <= 1}
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
                disabled={!isAdmin || saving}
                onClick={() => void saveSheetDraft()}
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Save rate sheet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete rate sheet?</DialogTitle>
            <DialogDescription>
              Remove &ldquo;{deleteTarget?.name}&rdquo; from shop pricing. Orders
              already using this sheet will fall back to the shop default.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => {
                if (deleteTarget) void deleteSheet(deleteTarget.id);
              }}
            >
              {deleting ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SettingsMain>
  );
}

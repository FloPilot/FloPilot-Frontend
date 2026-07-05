"use client";

import { useEffect, useMemo, useState } from "react";
import { Package, Store } from "lucide-react";
import {
  AdminLockNotice,
  SaveButton,
  SettingsError,
  SettingsHeader,
  SettingsMain,
  SettingsPanel,
} from "@/components/settings/settings-kit";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { deriveCustomerUnitPriceFromMarkup } from "@/lib/blank-pricing";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const PREVIEW_BLANK_COST = 4;

function parseMarkupInput(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(500, Math.max(0, Math.round(parsed * 100) / 100));
}

export function DefaultMarkupSection() {
  const { settings, isAdmin, updateSettings } = useShopSettings();
  const savedMarkup = settings.pricingMatrix.blankMarkupPercent ?? 0;
  const [markupInput, setMarkupInput] = useState(String(savedMarkup));
  const [lastSavedMarkup, setLastSavedMarkup] = useState(savedMarkup);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMarkupInput(String(savedMarkup));
    setLastSavedMarkup(savedMarkup);
  }, [savedMarkup]);

  const draftMarkup = parseMarkupInput(markupInput);
  const dirty = draftMarkup !== lastSavedMarkup;

  const customerPrice = useMemo(
    () => deriveCustomerUnitPriceFromMarkup(PREVIEW_BLANK_COST, draftMarkup),
    [draftMarkup]
  );

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const nextSettings = await updateSettings({
        pricingMatrix: {
          ...settings.pricingMatrix,
          blankMarkupPercent: draftMarkup,
        },
      });
      const confirmed = nextSettings.pricingMatrix.blankMarkupPercent;
      if (confirmed !== draftMarkup) {
        throw new Error(
          "Default markup did not save. Redeploy updateTenantSettings and getMe, then try again."
        );
      }
      setLastSavedMarkup(confirmed);
      setMarkupInput(String(confirmed));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save default markup"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsMain>
      <SettingsHeader
        title="Default markup"
        description="Applied to shop-ordered blanks on new orders. Override per line anytime on the order."
      >
        <SaveButton
          dirty={dirty}
          saving={saving}
          saved={saved}
          disabled={!isAdmin}
          onSave={() => void handleSave()}
        />
      </SettingsHeader>

      {!isAdmin && <AdminLockNotice />}
      {error && <SettingsError message={error} />}

      <SettingsPanel bodyClassName="p-0">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-4 border-b border-[#ebebeb] p-5 lg:border-b-0 lg:border-r">
            <div>
              <p className="text-[13px] font-semibold text-[#303030]">
                Markup percentage
              </p>
              <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                Pre-fills on blanks/garments when your shop orders the goods.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Default markup
              </Label>
              <div className="relative w-full">
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  disabled={!isAdmin}
                  value={markupInput}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => setMarkupInput(event.target.value)}
                  onBlur={() => {
                    const normalized = parseMarkupInput(markupInput);
                    setMarkupInput(String(normalized));
                  }}
                  className="h-11 w-full rounded-lg border-[#e3e3e3] pr-8 text-[15px] font-semibold tabular-nums [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-[#8a8a8a]">
                  %
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div
                className={cn(
                  dashboardInsetSurfaceClass,
                  "flex items-start gap-2.5 px-3 py-2.5"
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#eef1ff] text-brand-primary">
                  <Package className="size-4" />
                </span>
                <div>
                  <p className="text-[12px] font-semibold text-[#303030]">
                    Shop orders blanks
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-[#616161]">
                    Markup applies to customer estimate
                  </p>
                </div>
              </div>
              <div
                className={cn(
                  dashboardInsetSurfaceClass,
                  "flex items-start gap-2.5 px-3 py-2.5"
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f6f6f7] text-[#616161]">
                  <Store className="size-4" />
                </span>
                <div>
                  <p className="text-[12px] font-semibold text-[#303030]">
                    Customer supplies
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-[#616161]">
                    No blank pricing on the order
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#fafafa] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Live preview
            </p>
            <p className="mt-1 text-[12px] text-[#616161]">
              How a {formatCurrency(PREVIEW_BLANK_COST)} blank quotes today
            </p>

            <div
              className={cn(
                dashboardInsetSurfaceClass,
                "mt-4 space-y-3 px-4 py-4"
              )}
            >
              <div className="flex items-center justify-between gap-3 text-[13px]">
                <span className="text-[#616161]">Shop blank cost</span>
                <span className="font-medium tabular-nums text-[#303030]">
                  {formatCurrency(PREVIEW_BLANK_COST)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[13px]">
                <span className="text-[#616161]">Markup</span>
                <span className="font-medium tabular-nums text-[#303030]">
                  {draftMarkup}%
                </span>
              </div>
              <div className="border-t border-[#ebebeb] pt-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-semibold text-[#303030]">
                    Customer price
                  </span>
                  <span className="text-[18px] font-semibold tabular-nums text-brand-primary">
                    {formatCurrency(customerPrice)}
                  </span>
                </div>
                <p className="mt-1 text-right text-[11px] text-[#8a8a8a]">
                  per blank
                </p>
              </div>
            </div>

            <p className="mt-3 text-[12px] leading-relaxed text-[#616161]">
              Change markup or customer price on any line in the order
              blanks/garments tab.
            </p>
          </div>
        </div>
      </SettingsPanel>
    </SettingsMain>
  );
}

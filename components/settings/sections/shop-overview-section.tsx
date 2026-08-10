"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import {
  AdminLockNotice,
  SaveButton,
  SettingsError,
  SettingsHeader,
  SettingsMain,
  SettingsPanel,
  useRegisterSectionUnsavedChanges,
  useSectionDraft,
} from "@/components/settings/settings-kit";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import {
  SHOP_DECORATION_METHOD_DEFINITIONS,
  SHOP_DECORATION_METHOD_KEYS,
  type ShopDecorationMethodKey,
  type ShopDecorationMethods,
} from "@/lib/shop-settings";
import { cn } from "@/lib/utils";

export function ShopOverviewSection() {
  const { settings, isAdmin, updateSettings } = useShopSettings();
  const { draft, setDraft, dirty, discard } =
    useSectionDraft<ShopDecorationMethods>(settings.decorationMethods);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabledCount = useMemo(
    () => SHOP_DECORATION_METHOD_KEYS.filter((key) => draft[key]).length,
    [draft]
  );

  const handleSave = async () => {
    if (enabledCount === 0) {
      setError("Turn on at least one decoration method.");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateSettings({ decorationMethods: draft });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save decoration methods"
      );
    } finally {
      setSaving(false);
    }
  };

  useRegisterSectionUnsavedChanges({
    dirty,
    saving,
    enabled: isAdmin,
    label: "Unsaved shop overview",
    onSave: () => handleSave(),
    onDiscard: discard,
    id: "settings-shop-overview",
  });

  const toggle = (key: ShopDecorationMethodKey, enabled: boolean) => {
    setDraft((current) => ({ ...current, [key]: enabled }));
  };

  return (
    <SettingsMain>
      <SettingsHeader
        title="Shop setup overview"
        description="Tell us which decoration methods you offer. We’ll show the matching setup sections in the sidebar."
      >
        {isAdmin ? (
          <SaveButton
            headerBar
            dirty={dirty}
            saving={saving}
            saved={saved}
            onSave={() => void handleSave()}
          />
        ) : null}
      </SettingsHeader>

      {!isAdmin ? <AdminLockNotice /> : null}
      {error ? <SettingsError message={error} /> : null}

      <SettingsPanel
        title="Decoration methods"
        description={`${enabledCount} of ${SHOP_DECORATION_METHOD_KEYS.length} enabled. Shared tools like machines, decoration locations, and design placements always stay available.`}
      >
        <div className="grid gap-3">
          {SHOP_DECORATION_METHOD_DEFINITIONS.map((method) => {
            const enabled = draft[method.key];
            return (
              <label
                key={method.key}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors",
                  enabled
                    ? "border-brand-primary/35 bg-[#f4f7ff]"
                    : "border-[#ebebeb] bg-white hover:border-[#d4d4d4]",
                  !isAdmin && "cursor-default"
                )}
              >
                <input
                  type="checkbox"
                  className="mt-1 size-4 rounded border-[#c9c9c9]"
                  checked={enabled}
                  disabled={!isAdmin}
                  onChange={(event) =>
                    toggle(method.key, event.target.checked)
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-semibold text-[#303030]">
                      {method.label}
                    </span>
                    {enabled ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                        <Check className="size-3" />
                        Enabled
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-[#616161]">
                    {method.description}
                  </span>
                  {enabled && method.settingsHref ? (
                    <Link
                      href={method.settingsHref}
                      className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-brand-primary hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      Open {method.label} settings
                      <ArrowRight className="size-3" />
                    </Link>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
      </SettingsPanel>
    </SettingsMain>
  );
}

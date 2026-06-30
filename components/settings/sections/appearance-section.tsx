"use client";

import { useState } from "react";
import { BrandingSettingsPanel } from "@/components/settings/branding-settings-panel";
import {
  AdminLockNotice,
  SaveButton,
  SettingsError,
  SettingsHeader,
  SettingsMain,
  SettingsPanel,
  useSectionDraft,
} from "@/components/settings/settings-kit";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import type { TenantBranding } from "@/lib/tenant-branding";

export function AppearanceSection() {
  const { settings, isAdmin, updateSettings } = useShopSettings();
  const { draft, setDraft, dirty } = useSectionDraft<TenantBranding>(
    settings.branding
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateSettings({ branding: draft });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save branding");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsMain>
      <SettingsHeader
        title="Branding & logo"
        description="Your logo appears across the workspace. Your brand color is applied to customer-facing estimates and proof emails."
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

      <SettingsPanel
        title="Brand & appearance"
        description="Upload your logo for the workspace and pick the brand color used on estimates and proof emails."
      >
        <BrandingSettingsPanel
          branding={draft}
          disabled={!isAdmin}
          onChange={(branding) => setDraft(branding)}
        />
      </SettingsPanel>
    </SettingsMain>
  );
}

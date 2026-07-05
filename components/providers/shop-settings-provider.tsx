"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { normalizeStaffRole } from "@/lib/staff-roles";
import { updateTenantSettings, fetchTenantSettings } from "@/lib/api";
import {
  DEFAULT_SHOP_SETTINGS,
  isModuleEnabled,
  normalizeShopSettings,
  type ShopModuleKey,
  type ShopSettings,
} from "@/lib/shop-settings";
import type { TenantBranding } from "@/lib/tenant-branding";

type ShopSettingsContextValue = {
  settings: ShopSettings;
  isAdmin: boolean;
  isModuleEnabled: (moduleKey: ShopModuleKey) => boolean;
  updateSettings: (
    patch: Partial<ShopSettings> & {
      modules?: Partial<ShopSettings["modules"]>;
      branding?: Partial<TenantBranding>;
      onboarding?: Partial<ShopSettings["onboarding"]>;
      productionDefaults?: Partial<ShopSettings["productionDefaults"]>;
      pricingMatrix?: Partial<ShopSettings["pricingMatrix"]>;
    }
  ) => Promise<ShopSettings>;
};

const ShopSettingsContext = createContext<ShopSettingsContextValue | null>(
  null
);

export function ShopSettingsProvider({ children }: { children: ReactNode }) {
  const { profile, getIdToken, refreshProfile } = useAuth();
  const tenantId = profile?.type === "staff" ? profile.tenant.id : null;
  const [savedSettings, setSavedSettings] = useState<ShopSettings | null>(null);
  const [hydratedSettings, setHydratedSettings] = useState<ShopSettings | null>(
    null
  );

  useEffect(() => {
    setSavedSettings(null);
    setHydratedSettings(null);
  }, [tenantId]);

  useEffect(() => {
    if (profile?.type !== "staff" || !tenantId) return;

    let cancelled = false;

    void (async () => {
      try {
        const token = await getIdToken();
        if (!token || cancelled) return;
        const { settings: remote } = await fetchTenantSettings(token);
        if (!cancelled) {
          setHydratedSettings(normalizeShopSettings(remote));
        }
      } catch {
        // Fall back to profile settings from getMe.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile?.type, tenantId, getIdToken]);

  const profileSettings = useMemo(() => {
    if (profile?.type === "staff") {
      return normalizeShopSettings(profile.tenant.settings);
    }
    return DEFAULT_SHOP_SETTINGS;
  }, [profile]);

  const settings = savedSettings ?? hydratedSettings ?? profileSettings;

  const isAdmin =
    profile?.type === "staff"
      ? normalizeStaffRole(profile.user.role) === "admin"
      : false;

  const updateSettings = useCallback(
    async (
      patch: Partial<ShopSettings> & {
        modules?: Partial<ShopSettings["modules"]>;
        branding?: Partial<TenantBranding>;
        onboarding?: Partial<ShopSettings["onboarding"]>;
        productionDefaults?: Partial<ShopSettings["productionDefaults"]>;
        pricingMatrix?: Partial<ShopSettings["pricingMatrix"]>;
      }
    ) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");

      const { settings: next } = await updateTenantSettings(token, patch);
      const normalized = normalizeShopSettings(next);
      setSavedSettings(normalized);
      setHydratedSettings(normalized);

      try {
        await refreshProfile(true);
      } catch {
        // Settings were saved — keep the API response even if profile refresh fails.
      }
      return normalized;
    },
    [getIdToken, refreshProfile]
  );

  const value = useMemo(
    () => ({
      settings,
      isAdmin,
      isModuleEnabled: (moduleKey: ShopModuleKey) =>
        isModuleEnabled(settings, moduleKey),
      updateSettings,
    }),
    [settings, isAdmin, updateSettings]
  );

  return (
    <ShopSettingsContext.Provider value={value}>
      {children}
    </ShopSettingsContext.Provider>
  );
}

export function useShopSettings() {
  const ctx = useContext(ShopSettingsContext);
  if (!ctx) {
    throw new Error("useShopSettings must be used within ShopSettingsProvider");
  }
  return ctx;
}

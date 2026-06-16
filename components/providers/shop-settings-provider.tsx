"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { normalizeStaffRole } from "@/lib/staff-roles";
import { updateTenantSettings } from "@/lib/api";
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
    }
  ) => Promise<ShopSettings>;
};

const ShopSettingsContext = createContext<ShopSettingsContextValue | null>(
  null
);

export function ShopSettingsProvider({ children }: { children: ReactNode }) {
  const { profile, getIdToken, refreshProfile } = useAuth();

  const settings = useMemo(() => {
    if (profile?.type === "staff") {
      return normalizeShopSettings(profile.tenant.settings);
    }
    return DEFAULT_SHOP_SETTINGS;
  }, [profile]);

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
      }
    ) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");

      const { settings: next } = await updateTenantSettings(token, patch);
      await refreshProfile(true);
      return normalizeShopSettings(next);
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

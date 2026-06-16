"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { isStaffBrandedRoute } from "@/lib/branding-scope";
import {
  applyTenantBrandingToDocument,
  resetTenantBrandingOnDocument,
} from "@/lib/tenant-branding";
import {
  persistTenantBrandingCache,
  restoreTenantBrandingFromCache,
} from "@/lib/tenant-branding-cache";

/** Applies shop branding only inside /app and /station; resets elsewhere. */
export function TenantBrandingController() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const { settings } = useShopSettings();

  useLayoutEffect(() => {
    if (!isStaffBrandedRoute(pathname)) {
      resetTenantBrandingOnDocument();
      return;
    }

    if (profile?.type === "staff") {
      applyTenantBrandingToDocument(settings.branding);
      persistTenantBrandingCache(profile.tenant.id, settings.branding);
      return;
    }

    restoreTenantBrandingFromCache();
  }, [pathname, profile, settings.branding]);

  return null;
}

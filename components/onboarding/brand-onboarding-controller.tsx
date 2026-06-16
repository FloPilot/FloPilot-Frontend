"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandOnboardingWizard } from "@/components/onboarding/brand-onboarding-wizard";
import { useAuth } from "@/components/providers/auth-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import {
  clearShopSetupPending,
  isShopSetupPending,
} from "@/lib/onboarding";
import { needsShopSetup } from "@/lib/shop-settings";
import { normalizeStaffRole } from "@/lib/staff-roles";

export function BrandOnboardingController() {
  const pathname = usePathname();
  const { profile, loading } = useAuth();
  const { settings, isAdmin } = useShopSettings();
  const [dismissed, setDismissed] = useState(false);
  const [signupPending, setSignupPending] = useState(false);

  const inApp = pathname?.startsWith("/app") ?? false;
  const isStaff = profile?.type === "staff";
  const role = isStaff ? normalizeStaffRole(profile.user.role) : null;
  const isShopAdmin = isStaff && isAdmin && role === "admin";

  useEffect(() => {
    setDismissed(false);
    setSignupPending(isShopSetupPending());
  }, [profile?.type === "staff" ? profile.tenant.id : null]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("setup") === "1") {
      setSignupPending(true);
      params.delete("setup");
      const nextUrl = params.toString()
        ? `${window.location.pathname}?${params}`
        : window.location.pathname;
      window.history.replaceState({}, "", nextUrl);
    }
  }, [pathname]);

  const needsSetup =
    inApp &&
    isShopAdmin &&
    (needsShopSetup(settings) || signupPending) &&
    !dismissed;

  if (loading || !needsSetup) {
    return null;
  }

  return (
    <BrandOnboardingWizard
      onComplete={() => {
        clearShopSetupPending();
        setDismissed(true);
      }}
      onSkip={() => {
        clearShopSetupPending();
        setDismissed(true);
      }}
    />
  );
}

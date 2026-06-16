"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandOnboardingWizard } from "@/components/onboarding/brand-onboarding-wizard";
import { useAuth } from "@/components/providers/auth-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { normalizeStaffRole } from "@/lib/staff-roles";

export function BrandOnboardingController() {
  const pathname = usePathname();
  const { profile, loading } = useAuth();
  const { settings, isAdmin } = useShopSettings();
  const [dismissed, setDismissed] = useState(false);

  const inApp = pathname?.startsWith("/app") ?? false;
  const isStaff = profile?.type === "staff";
  const role =
    isStaff ? normalizeStaffRole(profile.user.role) : null;
  const needsOnboarding =
    inApp &&
    isStaff &&
    isAdmin &&
    role === "admin" &&
    !settings.onboarding.brandKitCompleted &&
    !dismissed;

  useEffect(() => {
    setDismissed(false);
  }, [profile?.type === "staff" ? profile.tenant.id : null]);

  if (loading || !needsOnboarding) {
    return null;
  }

  return (
    <BrandOnboardingWizard
      onComplete={() => setDismissed(true)}
      onSkip={() => setDismissed(true)}
    />
  );
}

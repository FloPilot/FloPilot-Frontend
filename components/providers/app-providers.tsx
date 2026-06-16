"use client";

import { TenantBrandingController } from "@/components/branding/tenant-branding-controller";
import { BrandOnboardingController } from "@/components/onboarding/brand-onboarding-controller";
import { ScheduleProvider } from "@/components/providers/schedule-provider";
import { NewOrderProvider } from "@/components/providers/new-order-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ShopSettingsProvider } from "@/components/providers/shop-settings-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ShopSettingsProvider>
        <TenantBrandingController />
        <BrandOnboardingController />
        <ScheduleProvider>
          <NewOrderProvider>{children}</NewOrderProvider>
        </ScheduleProvider>
      </ShopSettingsProvider>
    </AuthProvider>
  );
}

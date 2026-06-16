"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { StaffHeader } from "@/components/layout/staff-header";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { Button } from "@/components/ui/button";
import {
  SHOP_MODULE_DEFINITIONS,
  type ShopModuleKey,
} from "@/lib/shop-settings";

export function ModuleGate({
  moduleKey,
  children,
}: {
  moduleKey: ShopModuleKey;
  children: React.ReactNode;
}) {
  const { isModuleEnabled } = useShopSettings();

  if (isModuleEnabled(moduleKey)) {
    return <>{children}</>;
  }

  const definition = SHOP_MODULE_DEFINITIONS.find(
    (item) => item.key === moduleKey
  );
  const Icon = definition?.icon ?? Settings;

  return (
    <>
      <StaffHeader
        title={definition?.label ?? "Module disabled"}
        description="This area is turned off for your shop"
      />
      <main className="flex flex-1 items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md rounded-2xl border border-border/70 bg-white px-6 py-8 text-center shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-brand-muted">
            <Icon className="size-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-brand-ink">
            {definition?.label ?? "Module"} is off
          </h2>
          <p className="mt-2 text-sm text-brand-muted">
            {definition?.description ??
              "An admin can turn this back on in shop settings."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button
              className="rounded-full"
              nativeButton={false}
              render={<Link href="/app/settings" />}
            >
              Open settings
            </Button>
            <Button
              variant="outline"
              className="rounded-full bg-white"
              nativeButton={false}
              render={<Link href="/app/dashboard" />}
            >
              Back to dashboard
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}

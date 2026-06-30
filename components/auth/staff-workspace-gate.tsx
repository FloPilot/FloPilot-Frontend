"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Shield } from "lucide-react";
import { useStaffAccess } from "@/hooks/use-staff-access";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { Button } from "@/components/ui/button";
import {
  getWorkspaceAreaForPath,
  WORKSPACE_AREA_OPTIONS,
} from "@/lib/staff-access";
import { SHOP_MODULE_DEFINITIONS } from "@/lib/shop-settings";

export function StaffWorkspaceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { landingPath, canAccessWorkspace, canWrite } = useStaffAccess();
  const { isModuleEnabled } = useShopSettings();

  const area = getWorkspaceAreaForPath(pathname);

  const moduleKey = area
    ? WORKSPACE_AREA_OPTIONS.find((option) => option.key === area)?.moduleKey
    : undefined;

  const moduleBlocked =
    moduleKey && area !== "machines-settings"
      ? !isModuleEnabled(moduleKey)
      : false;

  const accessBlocked =
    area === "machines-settings"
      ? !canWrite("machines")
      : area
        ? !canAccessWorkspace(area)
        : false;

  useEffect(() => {
    if (pathname === "/app" || pathname === "/app/") {
      router.replace(landingPath);
    }
  }, [pathname, landingPath, router]);

  if (pathname === "/app" || pathname === "/app/") {
    return null;
  }

  if (!accessBlocked && !moduleBlocked) {
    return <>{children}</>;
  }

  const title =
    area === "machines-settings"
      ? "Machine settings"
      : WORKSPACE_AREA_OPTIONS.find((option) => option.key === area)?.label ??
        "This area";

  const description = moduleBlocked
    ? SHOP_MODULE_DEFINITIONS.find((item) => item.key === moduleKey)?.description
    : "Your admin can adjust which areas you can see in team settings.";

  return (
    <main className="flex flex-1 items-center justify-center p-6 sm:p-8">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-white px-6 py-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-brand-muted">
          <Shield className="size-5" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-brand-ink">
          {title} isn&apos;t available
        </h2>
        <p className="mt-2 text-sm text-brand-muted">
          {description ??
            "You don't have access to this part of the workspace."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            className="rounded-full"
            nativeButton={false}
            render={<Link href={landingPath} />}
          >
            Go to your workspace
          </Button>
        </div>
      </div>
    </main>
  );
}

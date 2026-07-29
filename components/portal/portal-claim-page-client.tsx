"use client";

import { Suspense } from "react";
import { PortalClaimForm } from "@/components/portal/portal-claim-form";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";

export function PortalClaimPageClient({ token }: { token: string }) {
  return (
    <Suspense fallback={<AppLoadingScreen fullScreen label="Loading invite…" />}>
      <PortalClaimForm token={token} />
    </Suspense>
  );
}

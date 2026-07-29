"use client";

import { CustomerPortalProvider } from "@/components/portal/customer-portal-provider";
import { PortalAppShell } from "@/components/portal/portal-app-shell";
import { PortalPreviewPathsProvider } from "@/components/portal/portal-paths";

export function PortalPreviewLayoutClient({
  token,
  children,
}: {
  token: string;
  children: React.ReactNode;
}) {
  return (
    <CustomerPortalProvider token={token}>
      <PortalPreviewPathsProvider token={token}>
        <PortalAppShell previewMode>{children}</PortalAppShell>
      </PortalPreviewPathsProvider>
    </CustomerPortalProvider>
  );
}

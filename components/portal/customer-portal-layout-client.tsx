"use client";

import { CustomerPortalProvider } from "@/components/portal/customer-portal-provider";
import { CustomerPortalShell } from "@/components/portal/customer-portal-shell";

export function CustomerPortalLayoutClient({
  token,
  children,
}: {
  token: string;
  children: React.ReactNode;
}) {
  return (
    <CustomerPortalProvider token={token}>
      <CustomerPortalShell>{children}</CustomerPortalShell>
    </CustomerPortalProvider>
  );
}

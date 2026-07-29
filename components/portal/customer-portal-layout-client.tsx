"use client";

import { CustomerPortalProvider } from "@/components/portal/customer-portal-provider";
import { PortalTokenPathsProvider } from "@/components/portal/portal-paths";

/**
 * Token-based layout provider only — claim flow does not use the old shell.
 * Nested legacy pages that still need the token APIs can opt into the shell.
 */
export function CustomerPortalLayoutClient({
  token,
  children,
}: {
  token: string;
  children: React.ReactNode;
}) {
  return (
    <CustomerPortalProvider token={token}>
      <PortalTokenPathsProvider token={token}>
        {children}
      </PortalTokenPathsProvider>
    </CustomerPortalProvider>
  );
}

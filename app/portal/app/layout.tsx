import { PortalAuthGate } from "@/components/portal/portal-auth-gate";
import { PortalAppProvider } from "@/components/portal/portal-app-provider";
import { PortalAppShell } from "@/components/portal/portal-app-shell";
import { PortalAppPathsProvider } from "@/components/portal/portal-paths";

export default function PortalAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalAuthGate>
      <PortalAppProvider>
        <PortalAppPathsProvider>
          <PortalAppShell>{children}</PortalAppShell>
        </PortalAppPathsProvider>
      </PortalAppProvider>
    </PortalAuthGate>
  );
}

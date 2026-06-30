import { StaffAppShell } from "@/components/layout/staff-app-shell";
import { StaffAuthGate } from "@/components/auth/staff-auth-gate";
import { StaffWorkspaceGate } from "@/components/auth/staff-workspace-gate";

export default function StaffAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StaffAuthGate>
      <StaffAppShell>
        <StaffWorkspaceGate>{children}</StaffWorkspaceGate>
      </StaffAppShell>
    </StaffAuthGate>
  );
}

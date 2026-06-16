import { FloPilotWatermark } from "@/components/branding/flopilot-watermark";
import { StaffSidebar } from "@/components/layout/staff-sidebar";
import { StaffAuthGate } from "@/components/auth/staff-auth-gate";
import { StaffWorkspaceGate } from "@/components/auth/staff-workspace-gate";

export default function StaffAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StaffAuthGate>
      <div className="flex h-screen min-h-screen overflow-hidden bg-brand-surface">
        <StaffSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <StaffWorkspaceGate>{children}</StaffWorkspaceGate>
          </div>
          <FloPilotWatermark />
        </div>
      </div>
    </StaffAuthGate>
  );
}

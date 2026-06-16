import { FloPilotWatermark } from "@/components/branding/flopilot-watermark";
import { StaffSidebar } from "@/components/layout/staff-sidebar";
import { StationHeader } from "@/components/station/station-header";

export default function StationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen min-h-screen overflow-hidden bg-brand-surface">
      <StaffSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <StationHeader />
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </div>
        <FloPilotWatermark />
      </div>
    </div>
  );
}

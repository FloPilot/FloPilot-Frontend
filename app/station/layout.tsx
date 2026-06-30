import { StaffAppShell } from "@/components/layout/staff-app-shell";
import { StationHeader } from "@/components/station/station-header";

export default function StationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StaffAppShell>
      <StationHeader />
      {children}
    </StaffAppShell>
  );
}

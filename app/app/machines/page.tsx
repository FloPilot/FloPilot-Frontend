"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MachinesOverview } from "@/components/machines/machines-overview";
import { ModuleGate } from "@/components/settings/module-gate";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useStaffAccess } from "@/hooks/use-staff-access";

function MachinesPageContent() {
  const router = useRouter();
  const { canWrite, filterMachines, normalizedAccess } = useStaffAccess();
  const { machines, shopDataLoading } = useSchedule();
  const visibleMachines = filterMachines(machines);

  useEffect(() => {
    if (shopDataLoading) return;
    if (visibleMachines.length === 1) {
      router.replace(`/app/machines/${visibleMachines[0]!.id}`);
    }
  }, [shopDataLoading, visibleMachines, router]);

  if (!shopDataLoading && visibleMachines.length === 1) {
    return null;
  }

  return (
    <MachinesOverview
      canManage={canWrite("machines")}
      machineFilter={
        normalizedAccess.machineIds?.length ? normalizedAccess.machineIds : null
      }
    />
  );
}

export default function MachinesPage() {
  return (
    <ModuleGate moduleKey="machines">
      <MachinesPageContent />
    </ModuleGate>
  );
}

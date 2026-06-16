"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { MachinesOverview } from "@/components/machines/machines-overview";
import { StaffHeader } from "@/components/layout/staff-header";
import { ModuleGate } from "@/components/settings/module-gate";
import { Button } from "@/components/ui/button";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useStaffAccess } from "@/hooks/use-staff-access";

function MachinesPageContent() {
  const router = useRouter();
  const { isAdmin, filterMachines, normalizedAccess } = useStaffAccess();
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
    <>
      <StaffHeader
        title="Machines"
        description="Station overview — open a machine to run events on the floor"
        action={
          isAdmin ? (
            <Button
              variant="outline"
              className="rounded-full bg-white"
              nativeButton={false}
              render={<Link href="/app/machines/settings" />}
            >
              <SlidersHorizontal className="size-4" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          ) : undefined
        }
      />
      <MachinesOverview
        machineFilter={
          normalizedAccess.machineIds?.length ? normalizedAccess.machineIds : null
        }
      />
    </>
  );
}

export default function MachinesPage() {
  return (
    <ModuleGate moduleKey="machines">
      <MachinesPageContent />
    </ModuleGate>
  );
}

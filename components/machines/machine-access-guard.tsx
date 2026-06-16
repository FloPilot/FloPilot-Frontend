"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useStaffAccess } from "@/hooks/use-staff-access";

export function MachineAccessGuard({
  machineId,
  children,
}: {
  machineId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { canAccessMachine, landingPath } = useStaffAccess();
  const { machines, shopDataLoading } = useSchedule();

  const allowed = canAccessMachine(machineId);
  const machineExists = machines.some((machine) => machine.id === machineId);

  useEffect(() => {
    if (shopDataLoading) return;
    if (!allowed || !machineExists) {
      router.replace(landingPath);
    }
  }, [allowed, machineExists, shopDataLoading, landingPath, router]);

  if (shopDataLoading || !allowed || !machineExists) {
    return null;
  }

  return <>{children}</>;
}

"use client";

import { useParams } from "next/navigation";
import { MachineStationDetail } from "@/components/machines/machine-station-detail";
import { MachineAccessGuard } from "@/components/machines/machine-access-guard";
import { ModuleGate } from "@/components/settings/module-gate";

export default function MachineStationPage() {
  const params = useParams();
  const machineId = params.machineId as string;

  return (
    <ModuleGate moduleKey="machines">
      <MachineAccessGuard machineId={machineId}>
        <MachineStationDetail machineId={machineId} />
      </MachineAccessGuard>
    </ModuleGate>
  );
}

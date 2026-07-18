"use client";

import { use } from "react";
import { MachineStationDetail } from "@/components/machines/machine-station-detail";
import { MachineAccessGuard } from "@/components/machines/machine-access-guard";
import { ModuleGate } from "@/components/settings/module-gate";
import {
  departmentHref,
} from "@/lib/departments";

export default function DepartmentProductionMachinePage({
  params,
}: {
  params: Promise<{ machineId: string }>;
}) {
  const { machineId } = use(params);

  return (
    <ModuleGate moduleKey="machines">
      <MachineAccessGuard machineId={machineId}>
        <MachineStationDetail
          machineId={machineId}
          backHref={departmentHref("production")}
          backLabel="Production"
          hideSettings
        />
      </MachineAccessGuard>
    </ModuleGate>
  );
}

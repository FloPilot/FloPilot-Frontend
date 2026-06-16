import { MachinesSettingsView } from "@/components/machines/machines-settings-view";
import { ModuleGate } from "@/components/settings/module-gate";

export default function MachinesSettingsPage() {
  return (
    <ModuleGate moduleKey="machines">
      <MachinesSettingsView />
    </ModuleGate>
  );
}

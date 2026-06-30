import { ModuleGate } from "@/components/settings/module-gate";
import { ShopMachinesSection } from "@/components/settings/sections/shop-machines-section";

export default function ShopMachinesSettingsPage() {
  return (
    <ModuleGate moduleKey="machines">
      <ShopMachinesSection />
    </ModuleGate>
  );
}

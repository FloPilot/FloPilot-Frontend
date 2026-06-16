import { ProductionView } from "@/components/production/production-view";
import { ModuleGate } from "@/components/settings/module-gate";

export default function ProductionPage() {
  return (
    <ModuleGate moduleKey="productionTasks">
      <ProductionView />
    </ModuleGate>
  );
}

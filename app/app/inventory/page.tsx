"use client";

import { InventoryView } from "@/components/inventory/inventory-view";
import { ModuleGate } from "@/components/settings/module-gate";

export default function InventoryPage() {
  return (
    <ModuleGate moduleKey="inventory">
      <InventoryView />
    </ModuleGate>
  );
}

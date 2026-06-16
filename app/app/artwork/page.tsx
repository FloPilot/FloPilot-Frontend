import { ArtworkView } from "@/components/artwork/artwork-view";
import { ModuleGate } from "@/components/settings/module-gate";

export default function ArtworkPage() {
  return (
    <ModuleGate moduleKey="artwork">
      <ArtworkView />
    </ModuleGate>
  );
}

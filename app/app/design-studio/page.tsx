import { DesignStudioLibraryView } from "@/components/design-studio/design-studio-library-view";
import { ModuleGate } from "@/components/settings/module-gate";

export default function DesignStudioPage() {
  return (
    <ModuleGate moduleKey="artwork">
      <DesignStudioLibraryView />
    </ModuleGate>
  );
}

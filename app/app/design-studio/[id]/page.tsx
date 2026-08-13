import { DesignStudioWorkspace } from "@/components/design-studio/design-studio-workspace";
import { ModuleGate } from "@/components/settings/module-gate";

export default async function DesignStudioEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ModuleGate moduleKey="artwork">
      <DesignStudioWorkspace entryId={decodeURIComponent(id)} />
    </ModuleGate>
  );
}

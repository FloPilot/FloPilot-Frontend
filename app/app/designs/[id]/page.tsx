import { DesignDetailView } from "@/components/artwork/design-detail-view";
import { ModuleGate } from "@/components/settings/module-gate";

export default async function DesignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ModuleGate moduleKey="artwork">
      <DesignDetailView designId={id} />
    </ModuleGate>
  );
}

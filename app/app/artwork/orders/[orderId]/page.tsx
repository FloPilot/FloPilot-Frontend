import { Suspense } from "react";
import { ArtworkOrderWorkspace } from "@/components/artwork/artwork-order-workspace";
import { ModuleGate } from "@/components/settings/module-gate";

export default async function ArtworkOrderWorkspacePage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return (
    <ModuleGate moduleKey="artwork">
      <Suspense fallback={null}>
        <ArtworkOrderWorkspace orderId={orderId} />
      </Suspense>
    </ModuleGate>
  );
}

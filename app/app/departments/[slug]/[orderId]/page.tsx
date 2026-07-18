import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DepartmentArtworkProofView } from "@/components/departments/department-artwork-proof-view";
import { DepartmentInksDetailView } from "@/components/departments/department-inks-detail-view";
import { DepartmentScreensDetailView } from "@/components/departments/department-screens-detail-view";
import { ModuleGate } from "@/components/settings/module-gate";
import { isDepartmentSlug } from "@/lib/departments";

export default async function DepartmentOrderDetailPage({
  params,
}: {
  params: Promise<{ slug: string; orderId: string }>;
}) {
  const { slug, orderId } = await params;

  if (!isDepartmentSlug(slug)) {
    notFound();
  }

  if (slug === "artwork") {
    return (
      <ModuleGate moduleKey="artwork">
        <DepartmentArtworkProofView orderId={orderId} />
      </ModuleGate>
    );
  }

  if (slug === "screens") {
    return (
      <ModuleGate moduleKey="productionTasks">
        <Suspense fallback={null}>
          <DepartmentScreensDetailView orderId={orderId} />
        </Suspense>
      </ModuleGate>
    );
  }

  if (slug === "inks") {
    return (
      <ModuleGate moduleKey="productionTasks">
        <Suspense fallback={null}>
          <DepartmentInksDetailView orderId={orderId} />
        </Suspense>
      </ModuleGate>
    );
  }

  notFound();
}

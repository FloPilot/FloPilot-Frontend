import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DepartmentArtworkProofView } from "@/components/departments/department-artwork-proof-view";
import { ModuleGate } from "@/components/settings/module-gate";
import { isDepartmentSlug } from "@/lib/departments";

export default async function DepartmentArtworkProofPage({
  params,
}: {
  params: Promise<{ slug: string; orderId: string }>;
}) {
  const { slug, orderId } = await params;

  if (slug !== "artwork" || !isDepartmentSlug(slug)) {
    notFound();
  }

  return (
    <ModuleGate moduleKey="artwork">
      <DepartmentArtworkProofView orderId={orderId} />
    </ModuleGate>
  );
}

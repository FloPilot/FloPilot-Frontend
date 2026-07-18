"use client";

import { notFound } from "next/navigation";
import { use } from "react";
import { ArtworkDepartmentPanel } from "@/components/departments/artwork-department-panel";
import { FinishingDepartmentPanel } from "@/components/departments/finishing-department-panel";
import { InksDepartmentPanel } from "@/components/departments/inks-department-panel";
import { ProductionDepartmentPanel } from "@/components/departments/production-department-panel";
import { ReceivingDepartmentPanel } from "@/components/departments/receiving-department-panel";
import { ScreensDepartmentPanel } from "@/components/departments/screens-department-panel";
import { ModuleGate } from "@/components/settings/module-gate";
import {
  getDepartmentDefinition,
  isDepartmentSlug,
} from "@/lib/departments";

const PANELS = {
  artwork: ArtworkDepartmentPanel,
  screens: ScreensDepartmentPanel,
  inks: InksDepartmentPanel,
  production: ProductionDepartmentPanel,
  finishing: FinishingDepartmentPanel,
  receiving: ReceivingDepartmentPanel,
} as const;

export default function DepartmentSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  if (!isDepartmentSlug(slug)) {
    notFound();
  }

  const definition = getDepartmentDefinition(slug);
  const Panel = PANELS[slug];

  if (!definition || !Panel) {
    notFound();
  }

  if (definition.moduleKey) {
    return (
      <ModuleGate moduleKey={definition.moduleKey}>
        <Panel />
      </ModuleGate>
    );
  }

  return <Panel />;
}

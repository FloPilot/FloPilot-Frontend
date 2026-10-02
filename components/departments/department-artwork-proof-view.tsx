"use client";

import { Suspense } from "react";
import { ArtworkProofWorkspaceContent } from "@/components/artwork/artwork-proof-workspace-content";
import { DepartmentsShell } from "@/components/departments/departments-shell";
import {
  departmentArtworkProofHref,
  departmentHref,
} from "@/lib/departments";

export function DepartmentArtworkProofView({ orderId }: { orderId: string }) {
  return (
    <DepartmentsShell
      activeSlug="artwork"
      title="Order artwork"
      description="Review every location on this order, assign artists, and send completed proofs back to the team."
    >
      <Suspense fallback={null}>
        <ArtworkProofWorkspaceContent
          orderId={orderId}
          embedded
          backHref={departmentHref("artwork")}
          backLabel="Art queue"
          buildProofHref={departmentArtworkProofHref}
        />
      </Suspense>
    </DepartmentsShell>
  );
}

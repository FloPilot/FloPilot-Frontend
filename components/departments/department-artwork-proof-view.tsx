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
      title="Artwork proof"
      description="Review this location, read customer notes, and approve or request changes — all without leaving Departments."
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

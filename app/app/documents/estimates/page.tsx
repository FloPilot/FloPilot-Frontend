"use client";

import { Suspense } from "react";
import { DocumentsEstimatesPanel } from "@/components/documents/documents-estimates-panel";

export default function DocumentsEstimatesPage() {
  return (
    <Suspense fallback={null}>
      <DocumentsEstimatesPanel />
    </Suspense>
  );
}

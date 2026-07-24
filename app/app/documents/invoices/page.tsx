"use client";

import { Suspense } from "react";
import { DocumentsInvoicesPanel } from "@/components/documents/documents-invoices-panel";

export default function DocumentsInvoicesPage() {
  return (
    <Suspense fallback={null}>
      <DocumentsInvoicesPanel />
    </Suspense>
  );
}

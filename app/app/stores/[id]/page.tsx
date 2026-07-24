"use client";

import { use } from "react";
import { StoreEditorView } from "@/components/stores/store-editor-view";

export default function ClientStoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <StoreEditorView storeId={id} />;
}

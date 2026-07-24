"use client";

import { use } from "react";
import { PublicStorefrontView } from "@/components/stores/public-storefront-view";

export default function PublicStorePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  return <PublicStorefrontView token={decodeURIComponent(token)} />;
}

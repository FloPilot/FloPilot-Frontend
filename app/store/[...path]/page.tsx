"use client";

import { Suspense, use } from "react";
import { PublicStorefrontView } from "@/components/stores/public-storefront-view";

function PublicStorePageInner({ token }: { token: string }) {
  return <PublicStorefrontView token={token} />;
}

/**
 * Public store routes:
 * - /store/{jwt}
 * - /store/{storeSlug}
 * - /store/{shopSlug}/{storeSlug}
 */
export default function PublicStoreCatchAllPage({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = use(params);
  const token = (path || [])
    .map((part) => decodeURIComponent(part))
    .filter(Boolean)
    .join("/");

  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-[13px] text-[#616161]">
          Loading store…
        </div>
      }
    >
      <PublicStorePageInner token={token} />
    </Suspense>
  );
}

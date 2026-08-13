"use client";

import { Suspense, use } from "react";
import { PublicStorefrontView } from "@/components/stores/public-storefront-view";

function FriendlyStorePageInner({ token }: { token: string }) {
  return <PublicStorefrontView token={token} />;
}

/**
 * Friendly public store path: /store/{shopSlug}/{storeSlug}
 * First segment is named `token` to match /store/[token] (Next.js requires
 * the same dynamic segment name at the same path depth).
 */
export default function FriendlyPublicStorePage({
  params,
}: {
  params: Promise<{ token: string; storeSlug: string }>;
}) {
  const { token: tenantSlug, storeSlug } = use(params);
  const token = `${decodeURIComponent(tenantSlug)}/${decodeURIComponent(storeSlug)}`;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-[13px] text-[#616161]">
          Loading store…
        </div>
      }
    >
      <FriendlyStorePageInner token={token} />
    </Suspense>
  );
}

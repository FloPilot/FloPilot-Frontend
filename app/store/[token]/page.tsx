"use client";

import { Suspense, use } from "react";
import { PublicStorefrontView } from "@/components/stores/public-storefront-view";

function PublicStorePageInner({ token }: { token: string }) {
  return <PublicStorefrontView token={token} />;
}

export default function PublicStorePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-[13px] text-[#616161]">
          Loading store…
        </div>
      }
    >
      <PublicStorePageInner token={decodeURIComponent(token)} />
    </Suspense>
  );
}

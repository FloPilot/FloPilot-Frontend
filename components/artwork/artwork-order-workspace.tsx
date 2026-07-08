"use client";

import { Suspense } from "react";
import { ArtworkProofWorkspaceContent } from "@/components/artwork/artwork-proof-workspace-content";
import { artworkOrderWorkspaceHref } from "@/lib/artwork-routes";

export function ArtworkOrderWorkspace({ orderId }: { orderId: string }) {
  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
      <Suspense fallback={null}>
        <ArtworkProofWorkspaceContent
          orderId={orderId}
          backHref="/app/artwork"
          backLabel="Artwork queue"
          buildProofHref={artworkOrderWorkspaceHref}
        />
      </Suspense>
    </main>
  );
}

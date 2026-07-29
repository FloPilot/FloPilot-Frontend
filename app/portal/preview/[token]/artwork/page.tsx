"use client";

import { CustomerPortalArtworkView } from "@/components/portal/customer-portal-artwork-view";

export default function PortalPreviewArtworkPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-[#303030]">
          Artwork
        </h1>
        <p className="mt-1 text-[14px] text-[#616161]">
          Designs and proofs associated with this customer.
        </p>
      </div>
      <CustomerPortalArtworkView />
    </div>
  );
}

import { Suspense } from "react";
import { PaymentIntegrationsSection } from "@/components/settings/sections/payment-integrations-section";

export default function PaymentIntegrationsPage() {
  return (
    <Suspense fallback={null}>
      <PaymentIntegrationsSection />
    </Suspense>
  );
}

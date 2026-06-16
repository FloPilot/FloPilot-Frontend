import type { Metadata } from "next";
import { CtaSection } from "@/components/marketing/cta-section";
import { FeaturesSection } from "@/components/marketing/features-section";
import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";

export const metadata: Metadata = {
  title: "Features — FloPilot.io",
  description:
    "Orders, production scheduling, machine stations, artwork proofs, inventory, team permissions, and white-label branding for print shops.",
};

export default function FeaturesPage() {
  return (
    <>
      <MarketingPageHeader
        eyebrow="Features"
        title="Everything your shop needs, nothing it doesn't"
        description="FloPilot is designed around how print and decoration shops actually work — from the front office to the production floor."
      />
      <FeaturesSection showIntro={false} />
      <CtaSection />
    </>
  );
}

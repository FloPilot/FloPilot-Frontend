import type { Metadata } from "next";
import { CtaSection } from "@/components/marketing/cta-section";
import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";
import { UseCasesSection } from "@/components/marketing/use-cases-section";

export const metadata: Metadata = {
  title: "Use Cases — FloPilot.io",
  description:
    "How shop owners, production leads, floor operators, and warehouse staff use FloPilot with tailored workspace access.",
};

export default function UseCasesPage() {
  return (
    <>
      <MarketingPageHeader
        eyebrow="Use cases"
        title="Built for every role in your shop"
        description="Owners see the big picture. Operators see their station. Everyone gets a workspace that fits how they work."
      />
      <UseCasesSection showIntro={false} />
      <CtaSection />
    </>
  );
}

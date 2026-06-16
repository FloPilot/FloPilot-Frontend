import type { Metadata } from "next";
import { CtaSection } from "@/components/marketing/cta-section";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";

export const metadata: Metadata = {
  title: "How It Works — FloPilot.io",
  description:
    "Create your shop, run orders through production, and keep customers in the loop — from quote to delivery in one platform.",
};

export default function HowItWorksPage() {
  return (
    <>
      <MarketingPageHeader
        eyebrow="How it works"
        title="Up and running in three steps"
        description="No lengthy implementation. Create your shop, invite your team, and start moving real orders through production."
      />
      <HowItWorksSection showIntro={false} />
      <CtaSection />
    </>
  );
}

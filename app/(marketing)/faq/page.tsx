import type { Metadata } from "next";
import { CtaSection } from "@/components/marketing/cta-section";
import { FaqSection } from "@/components/marketing/faq-section";
import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";

export const metadata: Metadata = {
  title: "FAQ — FloPilot.io",
  description:
    "Common questions about FloPilot — who it's for, branding, team permissions, customer portal, and early access.",
};

export default function FaqPage() {
  return (
    <>
      <MarketingPageHeader
        eyebrow="FAQ"
        title="Common questions"
        description="Everything you need to know before getting started with FloPilot."
      />
      <FaqSection showIntro={false} />
      <CtaSection />
    </>
  );
}

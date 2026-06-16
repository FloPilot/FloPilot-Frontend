import { AuthenticatedLandingRedirect } from "@/components/auth/authenticated-landing-redirect";
import { CtaSection } from "@/components/marketing/cta-section";
import { FeaturesShowcaseSection } from "@/components/marketing/features-showcase-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { IntegrationsSection } from "@/components/marketing/integrations-section";
import { OperationalSection } from "@/components/marketing/operational-section";
import { ProblemSection } from "@/components/marketing/problem-section";
import { ResultsCalloutSection } from "@/components/marketing/results-callout-section";

export default function HomePage() {
  return (
    <>
      <AuthenticatedLandingRedirect />
      <HeroSection />
      <ProblemSection />
      <OperationalSection />
      <FeaturesShowcaseSection />
      <IntegrationsSection />
      <ResultsCalloutSection />
      <CtaSection />
    </>
  );
}

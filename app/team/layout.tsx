import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FloPilot Team Portal",
  description:
    "Internal workspace for FloPilot team members — feedback triage, operations, and product tools.",
  robots: { index: false, follow: false },
};

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

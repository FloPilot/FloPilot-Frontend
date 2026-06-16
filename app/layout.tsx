import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist } from "next/font/google";
import { BrandingBootstrapScript } from "@/components/branding/branding-bootstrap-script";
import { AppProviders } from "@/components/providers/app-providers";
import { isStaffBrandedRoute } from "@/lib/branding-scope";
import { BRANDING_STYLE_ID } from "@/lib/tenant-branding";
import { getServerBrandingStyleContent } from "@/lib/tenant-branding-server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FloPilot.io — Print Shop Management Software",
  description:
    "Run your decorated apparel or print shop from quote to delivery. Orders, production scheduling, machine stations, customer portal, and team permissions in one platform.",
  keywords: [
    "print shop software",
    "screen printing management",
    "embroidery shop software",
    "production scheduling",
    "decorated apparel",
    "customer portal",
  ],
  openGraph: {
    title: "FloPilot.io — Print Shop Management",
    description:
      "Orders, production, stations, and customer collaboration for decorated apparel shops.",
    type: "website",
    siteName: "FloPilot.io",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const brandingCss = isStaffBrandedRoute(pathname)
    ? await getServerBrandingStyleContent()
    : null;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} h-full scroll-smooth`}
      suppressHydrationWarning
    >
      <head>
        <style
          id={BRANDING_STYLE_ID}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: brandingCss ?? "" }}
        />
      </head>
      <body className="min-h-full h-full flex flex-col antialiased">
        <BrandingBootstrapScript />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

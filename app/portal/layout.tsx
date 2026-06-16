import Link from "next/link";
import { FloPilotWatermark } from "@/components/branding/flopilot-watermark";
import { PlatformBrandMark } from "@/components/branding/shop-brand-mark";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-brand-surface">
      <header className="glass sticky top-0 z-30 border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/portal">
            <PlatformBrandMark
              className="scale-90 origin-left sm:scale-100"
              subtitle="Customer portal"
            />
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to site
          </Link>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <FloPilotWatermark />
    </div>
  );
}

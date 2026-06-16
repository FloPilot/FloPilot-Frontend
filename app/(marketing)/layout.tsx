import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MarketingShell>
      <MarketingNav />
      {/* Offset fixed header height (60px) */}
      <div className="flex flex-1 flex-col pt-[60px]">
        <main className="flex-1">{children}</main>
        <MarketingFooter />
      </div>
    </MarketingShell>
  );
}

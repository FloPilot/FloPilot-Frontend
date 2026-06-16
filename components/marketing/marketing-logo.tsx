import Link from "next/link";
import { cn } from "@/lib/utils";

/** ORVO-style wordmark — bold text only, no icon */
export function MarketingLogo({
  className,
}: {
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-[17px] font-bold tracking-[-0.02em] text-brand-ink",
        className
      )}
    >
      FloPilot
    </span>
  );
}

export function MarketingLogoLink({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "shrink-0 transition-opacity hover:opacity-70",
        className
      )}
    >
      <MarketingLogo />
    </Link>
  );
}

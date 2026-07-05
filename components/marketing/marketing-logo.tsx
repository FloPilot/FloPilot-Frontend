import Link from "next/link";
import { FloPilotMarkBadge } from "@/components/branding/flopilot-mark";
import { cn } from "@/lib/utils";

/** ORVO-style wordmark with FloPilot brand mark */
export function MarketingLogo({
  className,
  showMark = true,
}: {
  className?: string;
  showMark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {showMark ? (
        <FloPilotMarkBadge
          size="md"
          boxClassName="rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.05)]"
        />
      ) : null}
      <span className="text-[17px] font-bold tracking-[-0.02em] text-brand-ink">
        FloPilot
      </span>
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

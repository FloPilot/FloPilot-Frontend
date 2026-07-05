"use client";

import Image from "next/image";
import { Boxes } from "lucide-react";
import { FloPilotMarkBadge } from "@/components/branding/flopilot-mark";
import { useAuth } from "@/components/providers/auth-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { getDisplayShopName } from "@/lib/tenant-branding";
import { cn } from "@/lib/utils";

export function ShopBrandMark({
  compact = false,
  tone = "light",
  className,
}: {
  compact?: boolean;
  tone?: "light" | "dark";
  className?: string;
}) {
  const { profile } = useAuth();
  const { settings } = useShopSettings();
  const tenantName =
    profile?.type === "staff" ? profile.tenant.name : undefined;
  const displayName = getDisplayShopName(settings.shopName, tenantName);
  const { logoUrl, logoDisplay } = settings.branding;
  const useFullLogo = logoDisplay === "full" && Boolean(logoUrl);

  const onDark = tone === "dark";

  if (useFullLogo) {
    return (
      <div className={cn("flex min-w-0 items-center", className)}>
        <div
          className={cn(
            "relative w-full",
            compact ? "h-8 max-w-[140px]" : "h-9 max-w-[168px]"
          )}
        >
          <Image
            src={logoUrl}
            alt={displayName}
            fill
            unoptimized
            className="object-contain object-left"
            priority
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3 min-w-0", className)}>
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-md text-white",
          onDark ? "bg-white/10" : "bg-brand-primary",
          compact ? "size-8" : "size-9"
        )}
      >
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt=""
            fill
            unoptimized
            className="object-contain bg-white p-0.5"
          />
        ) : (
          <Boxes className={compact ? "size-4" : "size-5"} />
        )}
      </div>
      {!compact && (
        <div className="min-w-0">
          <p
            className={cn(
              "truncate text-sm font-semibold tracking-tight",
              onDark ? "text-white" : "text-brand-ink"
            )}
          >
            {displayName}
          </p>
          <p
            className={cn(
              "truncate text-xs",
              onDark ? "text-white/50" : "text-brand-muted"
            )}
          >
            Shop workspace
          </p>
        </div>
      )}
    </div>
  );
}

export function PlatformBrandMark({
  className,
  subtitle = "Print shop operations",
}: {
  className?: string;
  subtitle?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <FloPilotMarkBadge size="lg" boxClassName="rounded-xl" />
      <div>
        <p className="text-lg font-semibold tracking-tight text-brand-ink">
          FloPilot.io
        </p>
        <p className="text-xs text-brand-muted">{subtitle}</p>
      </div>
    </div>
  );
}

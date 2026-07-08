"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  ImageIcon,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Tag,
} from "lucide-react";
import { FloPilotWatermark } from "@/components/branding/flopilot-watermark";
import { useCustomerPortal } from "@/components/portal/customer-portal-provider";
import { useLockDocumentScroll } from "@/hooks/use-lock-document-scroll";
import {
  portalArtworkPath,
  portalBusinessPath,
  portalHomePath,
  portalPricingPath,
} from "@/lib/customer-portal-api";
import { cn } from "@/lib/utils";

export type PortalNavKey = "dashboard" | "pricing" | "business" | "artwork";

function PortalPageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-[#f6f6f7]">
      <div className="scroll-pane min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        {children}
      </div>
      <FloPilotWatermark />
    </div>
  );
}

const NAV_ITEMS: {
  key: PortalNavKey;
  label: string;
  icon: LucideIcon;
  href: (token: string) => string;
  match: (pathname: string, homeHref: string) => boolean;
}[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: portalHomePath,
    match: (pathname, homeHref) =>
      pathname === homeHref || pathname.includes("/orders/"),
  },
  {
    key: "pricing",
    label: "Pricing",
    icon: Tag,
    href: portalPricingPath,
    match: (pathname) => pathname.includes("/pricing"),
  },
  {
    key: "business",
    label: "Business",
    icon: Building2,
    href: portalBusinessPath,
    match: (pathname) => pathname.includes("/business"),
  },
  {
    key: "artwork",
    label: "Artwork",
    icon: ImageIcon,
    href: portalArtworkPath,
    match: (pathname) => pathname.includes("/artwork"),
  },
];

export function CustomerPortalShell({
  children,
  activeNav,
}: {
  children: React.ReactNode;
  activeNav?: PortalNavKey;
}) {
  useLockDocumentScroll();
  const pathname = usePathname();
  const { token, dashboard, loading, error, accent } = useCustomerPortal();
  const homeHref = portalHomePath(token);

  if (loading && !dashboard) {
    return (
      <PortalPageFrame>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-[#616161]">
          <Loader2 className="size-6 animate-spin" style={{ color: accent }} />
          <p className="text-[14px]">Loading your portal…</p>
        </div>
      </PortalPageFrame>
    );
  }

  if (error && !dashboard) {
    return (
      <PortalPageFrame>
        <div className="mx-auto max-w-md rounded-2xl border border-[#ebebeb] bg-white p-8 text-center shadow-sm">
          <p className="text-[18px] font-semibold text-[#303030]">
            Couldn&apos;t open your portal
          </p>
          <p className="mt-2 text-[14px] text-[#616161]">{error}</p>
        </div>
      </PortalPageFrame>
    );
  }

  if (dashboard?.expired) {
    return (
      <PortalPageFrame>
        <div className="mx-auto max-w-md rounded-2xl border border-[#ebebeb] bg-white p-8 text-center shadow-sm">
          <RefreshCw className="mx-auto size-8 text-[#616161]" />
          <h1 className="mt-4 text-[18px] font-semibold text-[#303030]">
            Your portal link has expired
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-[#616161]">
            Request a new link and you&apos;ll get another 90 days of access.
          </p>
          <a
            href={dashboard.reactivateUrl || "#"}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-lg px-6 text-[14px] font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            Renew portal access
          </a>
        </div>
      </PortalPageFrame>
    );
  }

  const shop = dashboard?.shop;
  const customer = dashboard?.customer;

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-[#f6f6f7]">
      <header className="shrink-0 border-b border-[#ebebeb] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {shop?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shop.logoUrl}
                alt={shop.name}
                className="h-9 max-w-[160px] object-contain"
              />
            ) : (
              <span className="truncate text-[17px] font-semibold text-[#303030]">
                {shop?.name}
              </span>
            )}
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-[13px] font-medium text-[#303030]">
              {customer?.company || customer?.name}
            </p>
            {customer?.company ? (
              <p className="text-[12px] text-[#8a8a8a]">{customer.name}</p>
            ) : null}
          </div>
        </div>

        <div className="mx-auto max-w-6xl overflow-x-auto px-4 pb-0 sm:px-6">
          <nav className="flex min-w-max gap-1 border-b border-transparent">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const href = item.href(token);
              const active =
                activeNav === item.key ||
                (!activeNav && item.match(pathname, homeHref));

              return (
                <Link
                  key={item.key}
                  href={href}
                  className={cn(
                    "inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors whitespace-nowrap",
                    active
                      ? "border-current text-[#303030]"
                      : "border-transparent text-[#616161] hover:text-[#303030]"
                  )}
                  style={
                    active ? { borderColor: accent, color: accent } : undefined
                  }
                >
                  <Icon className="size-3.5" strokeWidth={1.75} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <main className="scroll-pane min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </div>
        </main>

        <FloPilotWatermark />
      </div>
    </div>
  );
}

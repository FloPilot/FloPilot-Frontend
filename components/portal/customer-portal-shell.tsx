"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Loader2, Package, RefreshCw } from "lucide-react";
import { useCustomerPortal } from "@/components/portal/customer-portal-provider";
import { portalHomePath } from "@/lib/customer-portal-api";
import { cn } from "@/lib/utils";

export function CustomerPortalShell({
  children,
  activeNav = "dashboard",
}: {
  children: React.ReactNode;
  activeNav?: "dashboard" | "orders";
}) {
  const pathname = usePathname();
  const { token, dashboard, loading, error, accent } = useCustomerPortal();
  const homeHref = portalHomePath(token);
  const onOrderPage = pathname.includes("/orders/");

  if (loading && !dashboard) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-[#616161]">
        <Loader2 className="size-6 animate-spin" style={{ color: accent }} />
        <p className="text-[14px]">Loading your portal…</p>
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-[#ebebeb] bg-white p-8 text-center shadow-sm">
        <p className="text-[18px] font-semibold text-[#303030]">
          Couldn&apos;t open your portal
        </p>
        <p className="mt-2 text-[14px] text-[#616161]">{error}</p>
      </div>
    );
  }

  if (dashboard?.expired) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-[#ebebeb] bg-white p-8 text-center shadow-sm">
        <RefreshCw className="mx-auto size-8 text-[#616161]" />
        <h1 className="mt-4 text-[18px] font-semibold text-[#303030]">
          Your portal link has expired
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[#616161]">
          Request a new link and you&apos;ll get another 90 days of access to
          your orders and proofs.
        </p>
        <a
          href={dashboard.reactivateUrl || "#"}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg px-6 text-[14px] font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          Renew portal access
        </a>
      </div>
    );
  }

  const shop = dashboard?.shop;
  const customer = dashboard?.customer;

  return (
    <div className="min-h-screen bg-[#f6f6f7]">
      <header className="border-b border-[#ebebeb] bg-white">
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

        <div className="mx-auto max-w-6xl px-4 pb-0 sm:px-6">
          <nav className="flex gap-1 border-b border-transparent">
            <Link
              href={homeHref}
              className={cn(
                "inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors",
                activeNav === "dashboard" || (!onOrderPage && pathname === homeHref)
                  ? "border-current text-[#303030]"
                  : "border-transparent text-[#616161] hover:text-[#303030]"
              )}
              style={
                activeNav === "dashboard" || (!onOrderPage && pathname === homeHref)
                  ? { borderColor: accent, color: accent }
                  : undefined
              }
            >
              <LayoutDashboard className="size-3.5" strokeWidth={1.75} />
              Dashboard
            </Link>
            <span
              className={cn(
                "inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium",
                activeNav === "orders" || onOrderPage
                  ? "border-current"
                  : "border-transparent text-[#616161]"
              )}
              style={
                activeNav === "orders" || onOrderPage
                  ? { borderColor: accent, color: accent }
                  : undefined
              }
            >
              <Package className="size-3.5" strokeWidth={1.75} />
              Orders
            </span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      {shop?.email || shop?.phone ? (
        <footer className="border-t border-[#ebebeb] bg-white py-4 text-center text-[12px] text-[#8a8a8a]">
          Questions?{" "}
          {shop.email ? (
            <a
              href={`mailto:${shop.email}`}
              className="font-medium underline"
              style={{ color: accent }}
            >
              {shop.email}
            </a>
          ) : null}
          {shop.email && shop.phone ? " · " : null}
          {shop.phone ? <span>{shop.phone}</span> : null}
        </footer>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight, Menu, X } from "lucide-react";
import { MarketingLogoLink } from "@/components/marketing/marketing-logo";

export function MarketingNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-[100] border-b border-slate-200/80 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
      <div className="container-marketing flex h-[60px] items-center justify-between px-6 sm:px-8 lg:px-10">
        <MarketingLogoLink />

        {/* Desktop — ORVO layout: Docs · Login pill · Get started pill */}
        <div className="hidden items-center gap-5 sm:flex">
          <Link
            href="/features"
            className="text-[15px] text-brand-ink transition-opacity hover:opacity-60"
          >
            Docs
          </Link>
          <Link
            href="/login"
            className="inline-flex h-9 items-center rounded-full bg-slate-100 px-5 text-[15px] font-medium text-brand-ink transition-colors hover:bg-slate-200/80"
          >
            Login
          </Link>
          <Link
            href="/login?mode=signup"
            className="inline-flex h-9 items-center gap-0.5 rounded-full bg-brand-ink px-5 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Get started
            <ChevronRight className="size-4" strokeWidth={2.5} />
          </Link>
        </div>

        {/* Mobile — compact: menu + primary CTA */}
        <div className="flex items-center gap-2 sm:hidden">
          <Link
            href="/login?mode=signup"
            className="inline-flex h-9 items-center gap-0.5 rounded-full bg-brand-ink px-4 text-sm font-medium text-white"
          >
            Get started
            <ChevronRight className="size-3.5" strokeWidth={2.5} />
          </Link>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-full text-brand-ink hover:bg-slate-100"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200/80 bg-white px-6 py-4 sm:hidden">
          <nav className="flex flex-col gap-1">
            <Link
              href="/features"
              className="rounded-lg px-3 py-2.5 text-[15px] text-brand-ink"
            >
              Docs
            </Link>
            <Link
              href="/login"
              className="rounded-lg px-3 py-2.5 text-[15px] text-brand-ink"
            >
              Login
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

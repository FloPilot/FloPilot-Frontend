import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { MARKETING_NAV } from "@/lib/marketing-content";
import { PLATFORM_NAME } from "@/lib/tenant-branding";

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-[#0a0a0a] text-white">
      <div className="container-marketing px-6 py-14 sm:px-8 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.6fr_1.3fr] lg:gap-8">
          {/* Brand */}
          <div>
            <Link
              href="/"
              className="text-lg font-bold tracking-tight text-white transition-opacity hover:opacity-70"
            >
              FloPilot
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/45">
              The operating layer for decorated apparel shops. One system from
              quote to delivery — built for how print shops actually run.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
              <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
              <span className="text-xs text-white/70">All systems operational</span>
            </div>
          </div>

          {/* Resources */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/35">
              Resources
            </p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link
                  href="/features"
                  className="text-sm text-white/80 transition-colors hover:text-white"
                >
                  Docs
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-sm text-white/80 transition-colors hover:text-white"
                >
                  Login
                </Link>
              </li>
              {MARKETING_NAV.filter((item) => item.href !== "/features").map(
                (item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-white/80 transition-colors hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* CTA column */}
          <div>
            <h3 className="text-lg font-semibold leading-snug tracking-tight text-white sm:text-xl">
              Ready to run your shop from one place?
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-white/45">
              Create your workspace, explore the platform, and see how FloPilot
              connects orders, production, and your shop floor.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/login?mode=signup"
                className="inline-flex h-10 items-center gap-1 rounded-lg bg-white px-5 text-sm font-medium text-brand-ink transition-opacity hover:opacity-90"
              >
                Start for free
                <ChevronRight className="size-4" strokeWidth={2.5} />
              </Link>
              <Link
                href="/features"
                className="inline-flex h-10 items-center rounded-lg border border-white/20 px-5 text-sm font-medium text-white transition-colors hover:bg-white/5"
              >
                Explore features
              </Link>
            </div>
          </div>
        </div>

        {/* Sub-footer */}
        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center">
          <p className="text-xs text-white/35">
            © {year} {PLATFORM_NAME}. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-white/35">
            <Link href="/faq" className="transition-colors hover:text-white/60">
              Privacy
            </Link>
            <Link href="/faq" className="transition-colors hover:text-white/60">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

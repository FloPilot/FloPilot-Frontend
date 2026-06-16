"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { MarketingLogoLink } from "@/components/marketing/marketing-logo";
import { cn } from "@/lib/utils";

type AuthPageShellProps = {
  title: string;
  subtitle: string;
  eyebrow?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export function AuthPageShell({
  title,
  subtitle,
  eyebrow,
  children,
  footer,
  className,
}: AuthPageShellProps) {
  return (
    <div className="relative min-h-screen bg-white">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <header className="relative z-10 border-b border-slate-200/80 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
        <div className="container-marketing flex h-[60px] items-center justify-between px-6 sm:px-8 lg:px-10">
          <MarketingLogoLink />
          <Link
            href="/"
            className="text-sm text-brand-muted transition-colors hover:text-brand-ink"
          >
            Back to site
          </Link>
        </div>
      </header>

      <div className="relative mx-auto flex min-h-[calc(100vh-60px)] max-w-6xl flex-col px-6 py-10 sm:px-8 lg:flex-row lg:items-center lg:gap-16 lg:px-10 lg:py-16">
        <div className="mb-10 max-w-md lg:mb-0 lg:flex-1">
          {eyebrow && (
            <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-brand-muted shadow-sm">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.025em] text-brand-ink sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-brand-muted">
            {subtitle}
          </p>
          <div className="mt-8 hidden lg:block">
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
                What you get
              </p>
              <ul className="mt-4 space-y-3 text-sm text-brand-ink">
                <li className="flex items-start gap-2">
                  <ChevronRight className="mt-0.5 size-4 shrink-0 text-brand-primary" />
                  Orders, production calendar, and floor stations in one workspace
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="mt-0.5 size-4 shrink-0 text-brand-primary" />
                  Brand your sidebar with your logo and colors
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="mt-0.5 size-4 shrink-0 text-brand-primary" />
                  Invite your team and control module access
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className={cn("w-full lg:max-w-md lg:flex-1", className)}>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
            {children}
          </div>
          {footer && (
            <div className="mt-6 text-center text-sm text-brand-muted">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

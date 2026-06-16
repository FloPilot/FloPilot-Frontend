import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { ProductPreview } from "@/components/marketing/product-preview";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white">
      {/* Subtle dot grid — ORVO-style */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative container-marketing px-6 pb-0 pt-14 sm:px-8 sm:pt-20 lg:px-10 lg:pt-24">
        {/* Copy block */}
        <div className="mx-auto max-w-5xl text-center">
          <div className="marketing-fade-up inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm text-brand-muted shadow-sm">
            <Sparkles className="size-3.5 text-brand-muted" />
            Introducing FloPilot BETA
          </div>

          <h1 className="marketing-fade-up mx-auto mt-8 max-w-4xl text-[2rem] font-semibold leading-[1.12] tracking-[-0.025em] text-brand-ink sm:text-5xl sm:leading-[1.1] lg:max-w-5xl lg:text-[3.5rem]">
            One place to run orders, production, and your entire shop floor
          </h1>

          <p className="marketing-fade-up-delay mx-auto mt-6 max-w-2xl text-base leading-[1.65] text-brand-muted sm:text-lg">
            FloPilot connects quotes, production scheduling, machine stations,
            and customer approvals — so your team stops jumping between
            spreadsheets, email threads, and disconnected tools.
          </p>

          <div className="marketing-fade-up-delay mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/login?mode=signup"
              className="inline-flex h-11 items-center gap-1 rounded-lg bg-brand-ink px-6 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Start for free
              <ChevronRight className="size-4" strokeWidth={2.5} />
            </Link>
            <Link
              href="/features"
              className="inline-flex h-11 items-center rounded-lg border border-slate-200 bg-white px-6 text-[15px] font-medium text-brand-ink transition-colors hover:bg-slate-50"
            >
              Explore features
            </Link>
          </div>
        </div>

        {/* Product mockup with bottom fade */}
        <div className="marketing-fade-up-delay relative marketing-content-width mt-14 sm:mt-16 lg:mt-20">
          <ProductPreview />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white via-white/80 to-transparent sm:h-40"
            aria-hidden
          />
        </div>
      </div>
    </section>
  );
}

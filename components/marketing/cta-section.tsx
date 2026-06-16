import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function CtaSection() {
  return (
    <section className="bg-white px-6 py-16 sm:px-8 sm:py-20">
      <div className="container-marketing">
        <div className="relative overflow-hidden rounded-2xl bg-[#0a0a0a] px-6 py-16 text-center sm:px-12 sm:py-20">
          {/* Dot grid */}
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />

          <div className="relative">
            <h2 className="mx-auto max-w-xl text-2xl font-semibold leading-snug tracking-tight text-white sm:text-3xl lg:text-4xl">
              See what FloPilot can do for your shop
            </h2>

            <Link
              href="/login?mode=signup"
              className="mt-8 inline-flex h-11 items-center gap-1 rounded-lg bg-white px-6 text-[15px] font-medium text-brand-ink transition-opacity hover:opacity-90"
            >
              Get started FREE
              <ChevronRight className="size-4" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

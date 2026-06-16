import { RESULT_CALLOUT_STATS } from "@/lib/marketing-content";

export function ResultsCalloutSection() {
  return (
    <section className="relative overflow-hidden bg-[#0a0a0a] py-20 sm:py-24">
      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="container-marketing relative px-6 sm:px-8">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Real results for real print shops
        </h2>

        <div className="mt-12 grid gap-4 sm:grid-cols-3 sm:gap-5">
          {RESULT_CALLOUT_STATS.map((stat) => (
            <article
              key={stat.label}
              className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-6 py-10 text-center sm:px-8 sm:py-12"
            >
              <p className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {stat.value}
              </p>
              <p className="mx-auto mt-3 max-w-[220px] text-sm leading-relaxed text-white/50">
                {stat.label}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

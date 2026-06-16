import { FEATURES } from "@/lib/marketing-content";

export function FeaturesSection({ showIntro = true }: { showIntro?: boolean }) {
  return (
    <section className={showIntro ? "border-t border-border/40 bg-white py-20 sm:py-28" : "bg-white py-16 sm:py-20"}>
      <div className="container-marketing px-6 sm:px-8">
        {showIntro && (
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-brand-primary">Features</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-brand-ink sm:text-4xl">
              Everything your shop needs, nothing it doesn&apos;t
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-brand-muted">
              FloPilot is designed around how print and decoration shops actually
              work — from the front office to the production floor.
            </p>
          </div>
        )}

        <div className={showIntro ? "mt-14" : ""}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="group rounded-xl border border-border/60 bg-slate-50/30 p-6 transition-all hover:border-brand-primary/20 hover:bg-white hover:shadow-sm"
                >
                  <div className="flex size-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-4 font-semibold text-brand-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-brand-muted">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

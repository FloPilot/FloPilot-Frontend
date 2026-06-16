import { HOW_IT_WORKS, WORKFLOW_STEPS } from "@/lib/marketing-content";

export function HowItWorksSection({ showIntro = true }: { showIntro?: boolean }) {
  return (
    <section className={showIntro ? "border-t border-border/40 bg-white py-20 sm:py-28" : "bg-white py-16 sm:py-20"}>
      <div className="container-marketing px-6 sm:px-8">
        {showIntro && (
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-brand-primary">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-brand-ink sm:text-4xl">
              Up and running in three steps
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-brand-muted">
              No lengthy implementation. Create your shop, invite your team, and
              start moving real orders through production.
            </p>
          </div>
        )}

        <div className={showIntro ? "mt-14" : ""}>
          <div className="grid gap-5 md:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
              <article
                key={item.step}
                className="rounded-xl border border-border/60 bg-slate-50/30 p-6"
              >
                <span className="text-3xl font-bold text-brand-primary/25">
                  {item.step}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-brand-ink">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-muted">
                  {item.description}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-12 rounded-xl border border-border/60 bg-slate-50/50 p-6 sm:p-10">
            <p className="text-center text-sm font-medium text-brand-primary">
              Your workflow, connected
            </p>
            <h3 className="mt-2 text-center text-xl font-semibold text-brand-ink">
              From first quote to shipped order
            </h3>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              {WORKFLOW_STEPS.map((step, index) => (
                <div key={step.label} className="flex flex-1 items-center gap-3">
                  <div className="flex flex-1 flex-col items-center text-center">
                    <div className="flex size-9 items-center justify-center rounded-full bg-brand-primary text-sm font-semibold text-white">
                      {index + 1}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-brand-ink">
                      {step.label}
                    </p>
                    <p className="text-xs text-brand-muted">{step.detail}</p>
                  </div>
                  {index < WORKFLOW_STEPS.length - 1 && (
                    <div
                      className="hidden h-px flex-1 bg-border sm:mt-4 sm:block"
                      aria-hidden
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

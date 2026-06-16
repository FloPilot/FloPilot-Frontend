import { Check } from "lucide-react";
import { USE_CASES } from "@/lib/marketing-content";

export function UseCasesSection({ showIntro = true }: { showIntro?: boolean }) {
  return (
    <section className={showIntro ? "py-20 sm:py-28" : "bg-white py-16 sm:py-20"}>
      <div className="container-marketing px-6 sm:px-8">
        {showIntro && (
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-brand-primary">Use cases</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-brand-ink sm:text-4xl">
              Built for every role in your shop
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-brand-muted">
              Owners see the big picture. Operators see their station. Everyone
              gets a workspace that fits how they work.
            </p>
          </div>
        )}

        <div className={showIntro ? "mt-14" : ""}>
          <div className="grid gap-5 lg:grid-cols-2">
            {USE_CASES.map((useCase) => (
              <article
                key={useCase.role}
                className="rounded-xl border border-border/60 bg-slate-50/30 p-6 sm:p-8"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">
                  {useCase.role}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-brand-ink">
                  {useCase.headline}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-brand-muted">
                  {useCase.description}
                </p>
                <ul className="mt-5 space-y-2">
                  {useCase.highlights.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-brand-ink"
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                        <Check className="size-3" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HOME_EXPLORE } from "@/lib/marketing-content";

export function HomeExploreSection() {
  return (
    <section className="py-20 sm:py-24">
      <div className="container-marketing px-6 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-brand-primary">
            Learn more
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-brand-ink sm:text-4xl">
            See how FloPilot fits your shop
          </h2>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {HOME_EXPLORE.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col rounded-xl border border-border/60 bg-white p-6 transition-all hover:border-brand-primary/30 hover:shadow-md hover:shadow-brand-primary/5"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-brand-primary">
                {item.label}
              </p>
              <h3 className="mt-3 text-lg font-semibold text-brand-ink group-hover:text-brand-primary">
                {item.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-brand-muted">
                {item.description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-primary">
                Learn more
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

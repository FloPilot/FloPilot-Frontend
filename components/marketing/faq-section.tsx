"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { FAQ_ITEMS } from "@/lib/marketing-content";
import { cn } from "@/lib/utils";

export function FaqSection({ showIntro = true }: { showIntro?: boolean }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className={showIntro ? "border-t border-border/40 bg-white py-20 sm:py-28" : "bg-white py-16 sm:py-20"}>
      <div className="container-marketing px-6 sm:px-8">
        {showIntro && (
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-brand-primary">FAQ</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-brand-ink sm:text-4xl">
              Common questions
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-brand-muted">
              Everything you need to know before getting started.
            </p>
          </div>
        )}

        <div className={cn("mx-auto max-w-2xl", showIntro ? "mt-12" : "")}>
          <div className="divide-y divide-border/60 rounded-xl border border-border/60">
            {FAQ_ITEMS.map((item, index) => {
              const open = openIndex === index;
              return (
                <div key={item.question}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
                    aria-expanded={open}
                    onClick={() => setOpenIndex(open ? null : index)}
                  >
                    <span className="text-sm font-medium text-brand-ink sm:text-base">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-5 shrink-0 text-brand-muted transition-transform",
                        open && "rotate-180"
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      "grid transition-all duration-200",
                      open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-4 text-sm leading-relaxed text-brand-muted sm:px-6 sm:pb-5">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

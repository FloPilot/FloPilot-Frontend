import { INTEGRATION_PARTNERS, type IntegrationPartner } from "@/lib/marketing-content";
import { cn } from "@/lib/utils";

function IntegrationsLabel() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid grid-cols-3 gap-[3px]" aria-hidden>
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="size-[5px] rounded-full bg-brand-primary" />
        ))}
      </div>
      <span className="text-sm font-semibold text-brand-ink">Integrations</span>
    </div>
  );
}

function IntegrationCard({
  partner,
  className,
}: {
  partner: IntegrationPartner;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm",
        className
      )}
    >
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
        style={{
          backgroundColor: partner.color,
          color: partner.textColor ?? "#ffffff",
        }}
      >
        {partner.abbr}
      </div>
      <span className="text-sm font-medium text-brand-ink">{partner.name}</span>
    </div>
  );
}

function IntegrationColumn({
  partners,
  side,
}: {
  partners: readonly IntegrationPartner[];
  side: "left" | "right";
}) {
  return (
    <div className="relative flex flex-1 flex-col gap-3 py-4">
      {/* Fade masks — ORVO-style stacked scroll feel */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-gradient-to-b from-slate-50 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-slate-50 to-transparent"
        aria-hidden
      />

      <div className="flex flex-col gap-3 px-2 sm:px-4">
        {partners.map((partner, index) => (
          <IntegrationCard
            key={partner.name}
            partner={partner}
            className={cn(
              index === 0 && "opacity-40",
              index === partners.length - 1 && "opacity-50"
            )}
          />
        ))}
      </div>

      {/* Connector line toward center */}
      <div
        className={cn(
          "pointer-events-none absolute top-1/2 hidden h-px w-8 -translate-y-1/2 bg-brand-primary/25 lg:block",
          side === "left" ? "-right-4" : "-left-4"
        )}
        aria-hidden
      />
    </div>
  );
}

export function IntegrationsSection() {
  return (
    <section className="border-t border-slate-100 bg-white py-20 sm:py-28">
      <div className="container-marketing px-6 sm:px-8">
        {/* Split header */}
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <IntegrationsLabel />
            <h2 className="mt-5 text-3xl font-semibold leading-[1.15] tracking-[-0.03em] text-brand-ink sm:text-4xl">
              Connects to the tools
              <br />
              you already use
            </h2>
          </div>
          <p className="text-base leading-[1.65] text-brand-muted sm:text-lg lg:pt-9">
            FloPilot is built to sync with wholesale suppliers, accounting
            software, and the shop platforms you run today — pull inventory,
            orders, and customer data without a rip-and-replace.
          </p>
        </div>

        {/* Hub graphic */}
        <div className="relative mt-12 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:gap-0">
            <IntegrationColumn
              partners={INTEGRATION_PARTNERS.left}
              side="left"
            />

            {/* Center hub */}
            <div className="relative z-20 flex shrink-0 flex-col items-center px-4 lg:px-8">
              <div
                className="pointer-events-none absolute left-0 right-0 top-1/2 hidden h-px -translate-y-1/2 bg-gradient-to-r from-brand-primary/20 via-brand-primary/40 to-brand-primary/20 lg:block"
                aria-hidden
              />
              <div className="relative rounded-xl bg-brand-ink px-6 py-3 shadow-lg">
                <span className="text-base font-bold tracking-tight text-white">
                  FloPilot
                </span>
              </div>
            </div>

            <IntegrationColumn
              partners={INTEGRATION_PARTNERS.right}
              side="right"
            />
          </div>

          <p className="mt-6 text-sm text-brand-muted sm:mt-8">
            + More integrations coming soon
          </p>
        </div>
      </div>
    </section>
  );
}

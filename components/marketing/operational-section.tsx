import {
  Check,
  ClipboardList,
  Monitor,
  Package,
  Settings2,
  UserPlus,
} from "lucide-react";
import { OPERATIONAL_STAGES } from "@/lib/marketing-content";

function OperationalLabel() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid grid-cols-4 gap-[3px]" aria-hidden>
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i} className="size-[4px] rounded-full bg-brand-primary" />
        ))}
      </div>
      <span className="text-sm font-semibold text-brand-ink">
        Operational details
      </span>
    </div>
  );
}

const STAGE_ICONS = {
  quote: UserPlus,
  schedule: Settings2,
  produce: Monitor,
  deliver: Package,
} as const;

function QuoteOrderVisual() {
  const rows = [
    {
      name: "Alice Johnson",
      email: "alice@acme.com",
      meta: "4",
      metaIcon: "jobs",
      tag: "Quote",
      tagColor: "bg-blue-50 text-blue-700 border-blue-100",
    },
    {
      name: "David Brown",
      email: "david@acme.com",
      meta: "2",
      metaIcon: "jobs",
      tag: "Repeat",
      tagColor: "bg-violet-50 text-violet-700 border-violet-100",
    },
    {
      name: "Liam Garcia",
      email: "liam@acme.com",
      meta: "1",
      metaIcon: "jobs",
      tag: "Rush",
      tagColor: "bg-amber-50 text-amber-800 border-amber-100",
    },
  ];

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div
          key={row.email}
          className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2.5 shadow-sm"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="size-8 shrink-0 rounded-full bg-slate-200" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-brand-ink">
                {row.name}
              </p>
              <p className="truncate text-[10px] text-brand-muted">{row.email}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] text-brand-muted">
              <ClipboardList className="size-3" />
              {row.meta}
            </span>
            <span
              className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${row.tagColor}`}
            >
              {row.tag}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ScheduleVisual() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg bg-white p-3 shadow-sm">
        <p className="text-[10px] font-medium text-brand-muted">This week</p>
        <div className="mt-2 grid grid-cols-5 gap-1">
          {["M", "T", "W", "T", "F"].map((day, i) => (
            <div key={`${day}-${i}`} className="text-center">
              <p className="text-[9px] text-brand-muted">{day}</p>
              <div
                className={`mt-1 h-8 rounded ${
                  i === 1 || i === 3
                    ? "bg-brand-primary/20"
                    : i === 2
                      ? "bg-brand-primary/40"
                      : "bg-slate-100"
                }`}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2 rounded-lg bg-white p-3 shadow-sm">
        <p className="text-[10px] font-medium text-brand-muted">Machines</p>
        {[
          { name: "DTF Press 1", job: "Summit banners", on: true },
          { name: "Screen — Auto", job: "Acme 200 tees", on: true },
          { name: "Embroidery", job: "Open slot", on: false },
        ].map((m) => (
          <div
            key={m.name}
            className="flex items-center justify-between gap-2 border-b border-slate-50 pb-2 last:border-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium text-brand-ink">
                {m.name}
              </p>
              <p className="truncate text-[9px] text-brand-muted">{m.job}</p>
            </div>
            <span
              className={`size-2 shrink-0 rounded-full ${
                m.on ? "bg-emerald-500" : "bg-slate-300"
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ProduceVisual() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm">
        <div>
          <p className="text-xs font-semibold text-brand-ink">DTF Press 1</p>
          <p className="text-[10px] text-brand-muted">Station · Running</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
          Active
        </span>
      </div>
      <div className="rounded-lg bg-white p-3 shadow-sm">
        <p className="text-[10px] font-medium text-brand-ink">
          Summit Events — vinyl banners
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-2/3 rounded-full bg-brand-primary" />
        </div>
        <p className="mt-1.5 text-[9px] text-brand-muted">Run started 42m ago</p>
      </div>
      <div className="rounded-lg border border-dashed border-slate-200 bg-white/60 px-3 py-2">
        <p className="text-[10px] text-brand-muted">Up next · River City caps</p>
      </div>
    </div>
  );
}

function DeliverVisual() {
  const items = [
    "Proof approved",
    "In production",
    "Ready to ship",
    "Customer notified",
  ];

  return (
    <div className="relative">
      <div className="space-y-2 opacity-40 blur-[1px]" aria-hidden>
        <div className="h-8 rounded-lg bg-white" />
        <div className="h-8 rounded-lg bg-white" />
      </div>
      <div className="relative rounded-lg bg-white p-4 shadow-md">
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-2.5">
              <span className="flex size-4 items-center justify-center rounded-full bg-brand-ink text-white">
                <Check className="size-2.5" strokeWidth={3} />
              </span>
              <span className="text-xs text-brand-ink">{item}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-4 w-full rounded-lg bg-red-50 py-2.5 text-xs font-semibold text-red-600"
          tabIndex={-1}
        >
          Complete order
        </button>
      </div>
    </div>
  );
}

const STAGE_VISUALS = {
  quote: QuoteOrderVisual,
  schedule: ScheduleVisual,
  produce: ProduceVisual,
  deliver: DeliverVisual,
} as const;

export function OperationalSection() {
  return (
    <section className="border-t border-slate-100 bg-white py-20 sm:py-28">
      <div className="container-marketing px-6 sm:px-8">
        <div className="max-w-3xl">
          <OperationalLabel />
          <h2 className="mt-5 text-3xl font-semibold leading-[1.15] tracking-[-0.03em] text-brand-ink sm:text-4xl lg:text-[2.75rem]">
            One system. Every stage.
            <br />
            Full shop control.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-[1.65] text-brand-muted sm:text-lg">
            FloPilot organizes shop operations around what actually matters —
            the orders in your pipeline and everything connected to them. From
            the first quote to the day it ships, every job, machine, proof, and
            customer update lives in one place.
          </p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-2 lg:gap-6">
          {OPERATIONAL_STAGES.map((stage) => {
            const Icon = STAGE_ICONS[stage.icon];
            const Visual = STAGE_VISUALS[stage.icon];
            return (
              <article
                key={stage.title}
                className="rounded-2xl bg-slate-100 p-5 sm:p-6"
              >
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-brand-ink" strokeWidth={2} />
                  <h3 className="text-sm font-semibold text-brand-ink">
                    {stage.title}
                  </h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-brand-muted">
                  {stage.description}
                </p>
                <div className="mt-4 min-h-[200px]">
                  <Visual />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

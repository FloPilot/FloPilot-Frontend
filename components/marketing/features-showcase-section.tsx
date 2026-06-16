"use client";

import { useState } from "react";
import {
  Calendar,
  Check,
  ChevronRight,
  ClipboardList,
  FileImage,
  Globe,
  Monitor,
  RefreshCw,
} from "lucide-react";
import {
  FEATURE_SHOWCASE_TABS,
  type FeatureShowcaseId,
} from "@/lib/marketing-content";
import { cn } from "@/lib/utils";

const TAB_ICONS: Record<FeatureShowcaseId, typeof ClipboardList> = {
  orders: RefreshCw,
  production: Calendar,
  stations: Monitor,
  artwork: FileImage,
  portal: Globe,
};

function FeaturesLabel() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid grid-cols-4 gap-[3px]" aria-hidden>
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i} className="size-[4px] rounded-full bg-brand-primary" />
        ))}
      </div>
      <span className="text-sm font-semibold text-brand-ink">Features</span>
    </div>
  );
}

function OrdersPreview() {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <p className="text-sm font-semibold text-brand-ink">Order #1042</p>
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
          In production
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {[
          { step: "Quote sent", done: true },
          { step: "Artwork approved", done: true },
          { step: "Scheduled on press", done: true },
          { step: "Ready to ship", done: false },
        ].map((item) => (
          <div key={item.step} className="flex items-center gap-2.5">
            <span
              className={cn(
                "flex size-4 items-center justify-center rounded-full",
                item.done
                  ? "bg-brand-ink text-white"
                  : "border border-slate-200 bg-white"
              )}
            >
              {item.done && <Check className="size-2.5" strokeWidth={3} />}
            </span>
            <span
              className={cn(
                "text-xs",
                item.done ? "text-brand-ink" : "text-brand-muted"
              )}
            >
              {item.step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductionPreview() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-medium uppercase tracking-wider text-brand-muted">
          Today
        </p>
        <div className="mt-3 space-y-2">
          {[
            { time: "9:00", job: "Acme — screen 200", color: "bg-brand-primary/25" },
            { time: "11:30", job: "River City — embroidery", color: "bg-violet-200/60" },
            { time: "2:00", job: "Summit — banners", color: "bg-amber-200/60" },
          ].map((block) => (
            <div
              key={block.time}
              className={cn("rounded-lg px-3 py-2", block.color)}
            >
              <p className="text-[10px] font-medium text-brand-ink">{block.time}</p>
              <p className="text-[10px] text-brand-muted">{block.job}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-medium uppercase tracking-wider text-brand-muted">
          Departments
        </p>
        <div className="mt-3 space-y-2">
          {[
            { dept: "Screen", count: 4 },
            { dept: "Embroidery", count: 2 },
            { dept: "DTF", count: 3 },
          ].map((d) => (
            <div
              key={d.dept}
              className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
            >
              <span className="text-xs font-medium text-brand-ink">{d.dept}</span>
              <span className="text-[10px] text-brand-muted">{d.count} jobs</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StationsPreview() {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-semibold text-brand-ink">DTF Press 1</p>
        <p className="text-[10px] text-emerald-600">Running · 42 min</p>
      </div>
      <div className="p-4">
        <div className="rounded-lg bg-brand-primary/5 px-3 py-3">
          <p className="text-xs font-medium text-brand-ink">
            Summit Events — vinyl banners
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-white">
            <div className="h-full w-3/5 rounded-full bg-brand-primary" />
          </div>
        </div>
        <p className="mt-3 text-[10px] font-medium text-brand-muted">Up next</p>
        <p className="text-xs text-brand-ink">River City — embroidered caps</p>
      </div>
    </div>
  );
}

function ArtworkPreview() {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-slate-100">
          <FileImage className="size-6 text-brand-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-brand-ink">
            Acme Corp — front print
          </p>
          <p className="mt-0.5 text-[10px] text-brand-muted">v3 · Sent yesterday</p>
          <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
            Awaiting approval
          </span>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-lg bg-brand-ink py-2 text-[10px] font-medium text-white"
          tabIndex={-1}
        >
          Approve proof
        </button>
        <button
          type="button"
          className="flex-1 rounded-lg border border-slate-200 py-2 text-[10px] font-medium text-brand-ink"
          tabIndex={-1}
        >
          Request changes
        </button>
      </div>
    </div>
  );
}

function PortalPreview() {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-md bg-brand-primary" />
          <p className="text-xs font-semibold text-brand-ink">ACME Print Co.</p>
        </div>
        <p className="mt-1 text-[10px] text-brand-muted">Customer portal</p>
      </div>
      <div className="divide-y divide-slate-50 p-2">
        {[
          { order: "Order #1042", status: "In production" },
          { order: "Order #1038", status: "Proof ready" },
          { order: "Order #1031", status: "Shipped" },
        ].map((row) => (
          <div
            key={row.order}
            className="flex items-center justify-between px-2 py-2.5"
          >
            <span className="text-xs font-medium text-brand-ink">{row.order}</span>
            <span className="flex items-center gap-1 text-[10px] text-brand-muted">
              {row.status}
              <ChevronRight className="size-3" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PREVIEWS: Record<FeatureShowcaseId, () => React.JSX.Element> = {
  orders: OrdersPreview,
  production: ProductionPreview,
  stations: StationsPreview,
  artwork: ArtworkPreview,
  portal: PortalPreview,
};

export function FeaturesShowcaseSection() {
  const [active, setActive] = useState<FeatureShowcaseId>("orders");
  const activeTab = FEATURE_SHOWCASE_TABS.find((t) => t.id === active)!;
  const Preview = PREVIEWS[active];

  return (
    <section className="border-t border-slate-100 bg-white py-20 sm:py-28">
      <div className="container-marketing px-6 sm:px-8">
        {/* Split header — ORVO style */}
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <FeaturesLabel />
            <h2 className="mt-5 text-3xl font-semibold leading-[1.15] tracking-[-0.03em] text-brand-ink sm:text-4xl">
              Built for the work shops actually do
            </h2>
          </div>
          <p className="text-base leading-[1.65] text-brand-muted sm:text-lg lg:pt-9">
            From quoting a rush job to catching a missed proof before press,
            FloPilot is organized around the operational moments that matter.
            Every feature exists because print shops told us it had to.
          </p>
        </div>

        {/* Tabbed showcase */}
        <div className="mt-12 overflow-hidden rounded-2xl border border-slate-200 bg-white lg:flex lg:min-h-[440px]">
          {/* Left tabs */}
          <div className="flex flex-col border-b border-slate-200 lg:w-[300px] lg:shrink-0 lg:border-b-0 lg:border-r xl:w-[340px]">
            {FEATURE_SHOWCASE_TABS.map((tab) => {
              const Icon = TAB_ICONS[tab.id];
              const isActive = active === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActive(tab.id)}
                  className={cn(
                    "relative border-b border-slate-100 px-5 py-4 text-left transition-colors last:border-b-0 lg:px-6 lg:py-5",
                    isActive ? "bg-slate-50" : "bg-white hover:bg-slate-50/60"
                  )}
                >
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary lg:bottom-auto lg:left-auto lg:right-0 lg:top-0 lg:h-full lg:w-0.5"
                      aria-hidden
                    />
                  )}
                  <div className="flex items-start gap-3">
                    <Icon
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        isActive ? "text-brand-ink" : "text-brand-muted"
                      )}
                      strokeWidth={2}
                    />
                    <div>
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          isActive ? "text-brand-ink" : "text-brand-ink/80"
                        )}
                      >
                        {tab.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-brand-muted">
                        {tab.tagline}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right preview */}
          <div
            className="relative flex flex-1 flex-col justify-center p-6 sm:p-8 lg:p-10"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
              backgroundColor: "#f8fafc",
            }}
          >
            <div className="mx-auto w-full max-w-md">
              <p className="mb-4 text-[11px] font-medium uppercase tracking-wider text-brand-muted">
                {activeTab.title} preview
              </p>
              <Preview />
              <p className="mt-5 text-sm leading-relaxed text-brand-muted">
                {activeTab.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

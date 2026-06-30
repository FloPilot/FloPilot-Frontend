"use client";

import { Boxes, Clock, Plug, Truck } from "lucide-react";
import {
  SettingsHeader,
  SettingsMain,
  SettingsPanel,
} from "@/components/settings/settings-kit";

const SUPPLIERS = [
  {
    name: "SanMar",
    description: "Pull blanks, live inventory, and net pricing into orders.",
  },
  {
    name: "S&S Activewear",
    description: "Sync catalog products and case pricing automatically.",
  },
  {
    name: "alphabroder",
    description: "Import styles, colors, and tiered cost as you build orders.",
  },
  {
    name: "AS Colour",
    description: "Bring in premium blanks with up-to-date availability.",
  },
];

export function IntegrationsSection() {
  return (
    <SettingsMain>
      <SettingsHeader
        title="Supplier integrations"
        description="Connect your wholesale suppliers to pull blanks and vendor pricing straight into orders."
      />

      <SettingsPanel
        title="What's coming"
        description="Stop re-keying blanks and prices — connect a supplier and let the catalog stay in sync."
      >
        <div className="flex items-start gap-3 rounded-lg border border-[#dbe6ff] bg-[#f4f7ff] px-4 py-3 text-[13px] text-[#3a4a6b]">
          <Plug className="mt-0.5 size-4 shrink-0 text-brand-primary" />
          <p>
            Supplier integrations are in active development. Tell us which vendors
            you use most on the{" "}
            <a className="font-medium text-brand-primary" href="/app/settings/feedback">
              Feedback &amp; ideas
            </a>{" "}
            page to help us prioritize.
          </p>
        </div>
      </SettingsPanel>

      <div className="grid gap-4 sm:grid-cols-2">
        {SUPPLIERS.map((supplier) => (
          <div
            key={supplier.name}
            className="flex items-start justify-between gap-3 rounded-lg border border-dashed border-[#d4d4d4] bg-[#fafafa] px-4 py-4"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#8a8a8a] shadow-sm">
                <Truck className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#303030]">
                  {supplier.name}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#616161]">
                  {supplier.description}
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#ededed] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#7a7a7a]">
              <Clock className="size-3" />
              Soon
            </span>
          </div>
        ))}
      </div>

      <SettingsPanel
        title="Custom or in-house catalog"
        description="Not using a supported supplier? Manual products keep working exactly as today."
      >
        <div className="flex items-center gap-3 text-[13px] text-[#616161]">
          <Boxes className="size-4 shrink-0 text-[#8a8a8a]" />
          Keep adding products by hand from any order — no integration required.
        </div>
      </SettingsPanel>
    </SettingsMain>
  );
}

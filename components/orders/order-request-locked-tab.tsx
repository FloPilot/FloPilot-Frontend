"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  dashboardCardClass,
  dashboardElevatedShadow,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

const LOCKED_COPY: Record<
  string,
  { title: string; body: string }
> = {
  proof: {
    title: "Proofs",
    body: "Customer proof approval and portal review open after this request becomes an order.",
  },
  dtf_sheets: {
    title: "DTF sheets",
    body: "Receiving and sheet counts live on the order once you convert.",
  },
  screens: {
    title: "Screens",
    body: "Screen setup and burn status are tracked on the shop order after convert.",
  },
  inks: {
    title: "Inks",
    body: "Ink prep and Pantone checks move with the order after convert.",
  },
  files: {
    title: "Files",
    body: "Production files and uploads are managed on the order after convert.",
  },
  produced_goods: {
    title: "Produced goods",
    body: "Finished counts and inventory happen on the order after convert.",
  },
  shipping: {
    title: "Shipping / Handling",
    body: "Ship-to, packaging, and will-call are set on the order after convert.",
  },
  invoice: {
    title: "Invoice",
    body: "Invoicing and payments start on the order. Use Estimate for pricing now.",
  },
  activity: {
    title: "Activity",
    body: "Full order activity history begins after convert. Request status changes stay in Customer.",
  },
};

export function OrderRequestLockedTab({
  tabId,
  canConvert,
  converting,
  onConvert,
}: {
  tabId: string;
  canConvert: boolean;
  converting?: boolean;
  onConvert: () => void;
}) {
  const copy = LOCKED_COPY[tabId] || {
    title: "Available after convert",
    body: "This section unlocks on the shop order once you convert this request.",
  };

  return (
    <section className={dashboardCardClass}>
      <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
        <h2 className={dashboardTaskTitleClass}>{copy.title}</h2>
        <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
          Same layout as orders — unlocks when you convert.
        </p>
      </div>
      <div className="flex flex-col items-start gap-4 px-4 py-10 sm:px-5">
        <div className="max-w-lg space-y-2">
          <p className="text-[15px] font-semibold text-[#303030]">
            Convert to unlock this tab
          </p>
          <p className={dashboardTaskDetailClass}>{copy.body}</p>
        </div>
        {canConvert ? (
          <Button
            type="button"
            className={cn(
              dashboardPrimaryButtonClass,
              dashboardElevatedShadow,
              "h-10 gap-2 px-4"
            )}
            disabled={converting}
            onClick={onConvert}
          >
            <CheckCircle2 className="size-4" />
            Convert to order
            <ArrowRight className="size-3.5 opacity-80" />
          </Button>
        ) : null}
      </div>
    </section>
  );
}

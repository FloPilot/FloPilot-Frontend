"use client";

import { useMemo, useState } from "react";
import { BookMarked, ImageIcon } from "lucide-react";
import { ApplyDesignDialog } from "@/components/orders/apply-design-dialog";
import { DecorationTypePill } from "@/components/orders/decoration-type-pill";
import { ImprintDesignCard } from "@/components/orders/imprint-design-card";
import { ArtworkStatusBadge } from "@/components/orders/artwork/artwork-status-badge";
import { Button } from "@/components/ui/button";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { getOrderProductionSteps } from "@/lib/order-production";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

export function OrderDesignTab({ order }: { order: Order }) {
  const [applyOpen, setApplyOpen] = useState(false);
  const steps = useMemo(() => getOrderProductionSteps(order), [order]);
  const proofSteps = useMemo(
    () =>
      steps.filter(
        ({ job, imprint }) =>
          job.kind !== "finishing" && imprint.decoration !== "finishing"
      ),
    [steps]
  );

  const [selectedKey, setSelectedKey] = useState<string>(() => {
    const first = proofSteps[0];
    return first ? `${first.job.id}-${first.imprint.id}` : "";
  });

  const activeKey =
    proofSteps.some(
      (step) => `${step.job.id}-${step.imprint.id}` === selectedKey
    )
      ? selectedKey
      : proofSteps[0]
        ? `${proofSteps[0].job.id}-${proofSteps[0].imprint.id}`
        : "";

  if (proofSteps.length === 0) {
    return (
      <section className={cn(dashboardCardClass, "px-4 py-12 text-center sm:px-5")}>
        <ImageIcon className="mx-auto mb-3 size-8 text-[#c9c9c9]" />
        <p className={dashboardTaskDetailClass}>
          Add decoration events first — then build a mockup and proof for each
          location here.
        </p>
      </section>
    );
  }

  const activeStep = proofSteps.find(
    (step) => `${step.job.id}-${step.imprint.id}` === activeKey
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={dashboardTaskTitleClass}>Proof by location</h2>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            Upload mockups, set specs, and send proofs — one per decoration
            location on this order.
          </p>
        </div>
        <Button
          type="button"
          className={cn(dashboardControlClass, "h-8 shrink-0 text-[12px]")}
          onClick={() => setApplyOpen(true)}
        >
          <BookMarked className="size-3.5" />
          Apply from library
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav
          className={cn(
            dashboardInsetSurfaceClass,
            "h-fit space-y-1 p-2 lg:sticky lg:top-4"
          )}
        >
          <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Locations
          </p>
          {proofSteps.map(({ job, imprint }) => {
            const key = `${job.id}-${imprint.id}`;
            const selected = activeKey === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedKey(key)}
                className={cn(
                  "w-full rounded-lg px-2.5 py-2.5 text-left transition-colors",
                  selected
                    ? "bg-[#f4f7fd] ring-1 ring-[#2c6ecb]/25"
                    : "hover:bg-[#fafafa]"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={cn(
                      "text-[13px] font-semibold leading-snug",
                      selected ? "text-[#2c6ecb]" : "text-[#303030]"
                    )}
                  >
                    {imprint.label}
                  </p>
                  <ArtworkStatusBadge
                    status={imprint.artwork.status}
                    className="shrink-0 scale-90"
                  />
                </div>
                <div className="mt-1.5">
                  <DecorationTypePill decoration={imprint.decoration} />
                </div>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          {activeStep ? (
            <ImprintDesignCard
              key={`${activeStep.job.id}-${activeStep.imprint.id}`}
              order={order}
              job={activeStep.job}
              imprint={activeStep.imprint}
            />
          ) : null}
        </div>
      </div>

      <ApplyDesignDialog
        order={order}
        open={applyOpen}
        onOpenChange={setApplyOpen}
      />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { BookMarked, ImageIcon, Plus, Wand2 } from "lucide-react";
import { ApplyDesignDialog } from "@/components/orders/apply-design-dialog";
import { DecorationTypePill } from "@/components/orders/decoration-type-pill";
import { OrderProofDesignStudioDialog } from "@/components/orders/order-proof-design-studio-dialog";
import {
  ImprintDesignCard,
  type ImprintDesignCardAdapters,
} from "@/components/orders/imprint-design-card";
import { ArtworkStatusBadge } from "@/components/orders/artwork/artwork-status-badge";
import { Button } from "@/components/ui/button";
import {
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { artworkStatusDetail } from "@/lib/artwork-status";
import { getOrderProductionSteps } from "@/lib/order-production";
import { imprintDisplayName } from "@/lib/imprint-display";
import type { ArtworkFile, Order } from "@/types";
import { cn } from "@/lib/utils";

export function OrderDesignTab({
  order,
  forceArtworkStatus,
  hideApprovalActions = false,
  hideApplyFromLibrary = false,
  hideLinkFromFiles = false,
  imprintAdapters,
  subtitle,
  readOnly = false,
  onAddEvents,
}: {
  order: Order;
  /** Force every location badge to this status (order requests → pending). */
  forceArtworkStatus?: ArtworkFile["status"];
  hideApprovalActions?: boolean;
  hideApplyFromLibrary?: boolean;
  hideLinkFromFiles?: boolean;
  imprintAdapters?: ImprintDesignCardAdapters;
  subtitle?: string;
  readOnly?: boolean;
  /** Jump to Events and open the add-event modal when proofs have no locations yet. */
  onAddEvents?: () => void;
}) {
  const [applyOpen, setApplyOpen] = useState(false);
  const [designStudioOpen, setDesignStudioOpen] = useState(false);
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
      <div className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-12 text-center">
        <ImageIcon className="mx-auto mb-3 size-8 text-[#c9c9c9]" />
        <p className="text-[13px] font-medium text-[#303030]">
          No decoration events yet
        </p>
        <p className={cn("mx-auto mt-1 max-w-sm", dashboardTaskDetailClass)}>
          Add decoration events first — then build a mockup and proof for each
          location here.
        </p>
        {onAddEvents && !readOnly ? (
          <Button
            type="button"
            className={cn(dashboardPrimaryButtonClass, "mt-4 h-9")}
            onClick={onAddEvents}
          >
            <Plus className="size-3.5" />
            Add events
          </Button>
        ) : null}
      </div>
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
            {subtitle ||
              "Upload proofs, submit to artwork, and track status — one location at a time."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!readOnly ? (
            <Button
              type="button"
              variant="outline"
              className="h-8 shrink-0 rounded-lg border-brand-primary/30 bg-brand-primary/5 text-[12px] font-medium text-brand-primary hover:bg-brand-primary/10"
              onClick={() => setDesignStudioOpen(true)}
            >
              <Wand2 className="size-3.5" />
              Design studio
            </Button>
          ) : null}
          {!hideApplyFromLibrary ? (
            <Button
              type="button"
              className={cn(dashboardControlClass, "h-8 shrink-0 text-[12px]")}
              onClick={() => setApplyOpen(true)}
            >
              <BookMarked className="size-3.5" />
              Apply from library
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav
          className={cn(
            dashboardInsetSurfaceClass,
            "h-fit space-y-1 p-2 lg:sticky lg:top-4"
          )}
        >
          <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Proofs
          </p>
          {proofSteps.map(({ job, imprint }) => {
            const key = `${job.id}-${imprint.id}`;
            const selected = activeKey === key;
            const status = forceArtworkStatus ?? imprint.artwork.status;
            const detail = artworkStatusDetail({
              ...imprint.artwork,
              status,
            });

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
                    {imprintDisplayName(imprint)}
                  </p>
                  <ArtworkStatusBadge
                    status={status}
                    className="shrink-0 scale-90"
                  />
                </div>
                {detail ? (
                  <p className="mt-1 line-clamp-1 text-[11px] text-[#8a8a8a]">
                    {detail}
                  </p>
                ) : null}
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
              readOnly={readOnly}
              forceArtworkStatus={forceArtworkStatus}
              hideApprovalActions={hideApprovalActions}
              hideLinkFromFiles={hideLinkFromFiles}
              adapters={imprintAdapters}
              onOpenDesignStudio={
                readOnly ? undefined : () => setDesignStudioOpen(true)
              }
            />
          ) : null}
        </div>
      </div>

      {!hideApplyFromLibrary ? (
        <ApplyDesignDialog
          order={order}
          open={applyOpen}
          onOpenChange={setApplyOpen}
        />
      ) : null}
      {activeStep ? (
        <OrderProofDesignStudioDialog
          order={order}
          jobId={activeStep.job.id}
          imprintId={activeStep.imprint.id}
          open={designStudioOpen}
          onOpenChange={setDesignStudioOpen}
        />
      ) : null}
    </div>
  );
}

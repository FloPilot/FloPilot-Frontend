"use client";

import { useMemo, useState } from "react";
import { Palette } from "lucide-react";
import { ImprintDesignCard } from "@/components/orders/imprint-design-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getOrderProductionSteps } from "@/lib/order-production";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

export function OrderDesignTab({ order }: { order: Order }) {
  const steps = useMemo(() => getOrderProductionSteps(order), [order]);
  const designSteps = useMemo(
    () =>
      steps.filter(
        ({ job, imprint }) =>
          job.kind !== "finishing" && imprint.decoration !== "finishing"
      ),
    [steps]
  );

  const [selectedKey, setSelectedKey] = useState<string>(() => {
    const first = designSteps[0];
    return first ? `${first.job.id}-${first.imprint.id}` : "";
  });

  const activeKey =
    designSteps.some(
      (step) => `${step.job.id}-${step.imprint.id}` === selectedKey
    )
      ? selectedKey
      : designSteps[0]
        ? `${designSteps[0].job.id}-${designSteps[0].imprint.id}`
        : "";

  if (designSteps.length === 0) {
    return (
      <Card className="border-dashed border-border/70 shadow-none">
        <CardContent className="py-12 text-center">
          <Palette className="size-8 mx-auto text-muted-foreground/60 mb-3" />
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Add decoration events first, then tie artwork and Pantone
            colors to each location here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const activeStep = designSteps.find(
    (step) => `${step.job.id}-${step.imprint.id}` === activeKey
  );

  return (
    <div className="space-y-4">
      <Card className="border-border/60 shadow-sm gap-3">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="size-4" />
            Design & ink specs
          </CardTitle>
          <CardDescription>
            Tie artwork to each print location and set Pantones, mesh, and
            squeegee settings. Operators see this on the floor when they run
            the event.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav className="rounded-2xl border border-border/70 bg-white p-2 space-y-1 h-fit lg:sticky lg:top-4">
          <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Locations
          </p>
          {designSteps.map(({ job, imprint }) => {
            const key = `${job.id}-${imprint.id}`;
            const inkCount = imprint.inkColors?.filter((row) => !row.isFlash)
              .length;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedKey(key)}
                className={cn(
                  "w-full rounded-xl px-3 py-2.5 text-left transition-colors",
                  activeKey === key
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/50 text-foreground"
                )}
              >
                <p className="text-sm font-medium leading-snug">
                  {imprint.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {job.name}
                  {inkCount ? ` · ${inkCount} colors` : ""}
                </p>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          {activeStep && (
            <ImprintDesignCard
              order={order}
              job={activeStep.job}
              imprint={activeStep.imprint}
            />
          )}
        </div>
      </div>
    </div>
  );
}

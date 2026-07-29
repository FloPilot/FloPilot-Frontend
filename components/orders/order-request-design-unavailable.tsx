"use client";

import { FileImage, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import type { OrderRequestDetail } from "@/lib/order-requests";
import { cn } from "@/lib/utils";

export function OrderRequestDesignUnavailable({
  request,
  onOpenStudio,
}: {
  request: OrderRequestDetail;
  onOpenStudio?: () => void;
}) {
  const events = (request.events || []).filter((event) =>
    Boolean(event.mockup?.previewUrl?.trim())
  );

  return (
    <section className={dashboardCardClass}>
      <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
        <h2 className={dashboardTaskTitleClass}>Design</h2>
        <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
          Not available on this request
        </p>
      </div>

      <div className="space-y-5 px-4 py-8 sm:px-5">
        <div className="mx-auto flex max-w-lg flex-col items-center text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-[#ebebeb] bg-[#fafafa]">
            <FileImage className="size-5 text-[#8a8a8a]" strokeWidth={1.5} />
          </span>
          <p className="mt-4 text-[15px] font-semibold text-[#303030]">
            Proofs already uploaded
          </p>
          <p className={cn("mt-1.5", dashboardTaskDetailClass)}>
            The customer attached proof files for every location on this
            request, so the design studio isn’t needed here. Review and adjust
            those proofs on the Proofs tab — customer approval starts after
            convert.
          </p>
          {onOpenStudio ? (
            <Button
              type="button"
              variant="outline"
              className={cn(dashboardControlClass, "mt-4 h-9 gap-1.5")}
              onClick={onOpenStudio}
            >
              <Sparkles className="size-3.5" />
              Open design studio anyway
            </Button>
          ) : null}
        </div>

        {events.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="overflow-hidden rounded-xl border border-[#ebebeb]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={event.mockup!.previewUrl}
                  alt=""
                  className="aspect-square w-full bg-[#fafafa] object-contain"
                />
                <div className="border-t border-[#ebebeb] px-3 py-2.5">
                  <p className="text-[13px] font-semibold text-[#303030]">
                    {event.name || event.locationLabel || "Event"}
                  </p>
                  <p className="text-[12px] text-[#8a8a8a]">
                    {event.mockup?.name || "Uploaded proof"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

"use client";

import { PackageCheck, PackageOpen, Send, Truck } from "lucide-react";
import { OrderDateField } from "@/components/orders/order-date-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { formatDateTime } from "@/lib/format";
import {
  orderDatePresets,
  receivingDatePresets,
} from "@/lib/order-dates";
import {
  blanksReadyForSubcontract,
  resolveSubcontractDetails,
  SUBCONTRACT_STATUS_LABELS,
} from "@/lib/order-subcontract";
import type { Job, JobImprint, Order, SubcontractDetails } from "@/types";
import { cn } from "@/lib/utils";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SubcontractEventPanel({
  order,
  job,
  imprint,
  draft,
  disabled,
  onChange,
}: {
  order: Order;
  job: Job;
  imprint: JobImprint;
  draft?: SubcontractDetails | null;
  disabled?: boolean;
  onChange: (next: SubcontractDetails) => void;
}) {
  const details = resolveSubcontractDetails(order, job, imprint, draft);
  const blanksReady = blanksReadyForSubcontract(order);
  const status = details.status || "planned";
  const expected = details.expectedQty || 0;
  const sent = details.sentQty || 0;
  const returned = details.returnedQty || 0;

  const patch = (partial: Partial<SubcontractDetails>) => {
    onChange({ ...details, ...partial });
  };

  const markSent = () => {
    const qty = sent > 0 ? sent : expected;
    patch({
      sentQty: qty,
      sentAt: details.sentAt || todayIsoDate(),
      status: "at_vendor",
    });
  };

  const markReturned = () => {
    const qty = returned > 0 ? returned : expected || sent;
    patch({
      returnedQty: qty,
      returnedAt: details.returnedAt || todayIsoDate(),
      status: qty >= expected && expected > 0 ? "returned" : "partial_return",
    });
  };

  return (
    <div className="space-y-4">
      <div className={cn(dashboardInsetSurfaceClass, "px-3.5 py-3")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[13px] font-semibold text-[#303030]">
              Subcontract flow
            </p>
            <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
              Receive blanks → send to vendor → receive finished goods back.
            </p>
          </div>
          <span className="rounded-md border border-[#fed7aa] bg-[#fff7ed] px-2 py-0.5 text-[11px] font-semibold text-[#c2410c]">
            {SUBCONTRACT_STATUS_LABELS[status]}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-[12px] text-[#616161]">Vendor</Label>
          <Input
            value={details.vendorName || ""}
            disabled={disabled}
            placeholder="e.g. Apex Patch Co."
            className={cn(dashboardControlClass, "h-9")}
            onChange={(event) => patch({ vendorName: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px] text-[#616161]">Vendor PO #</Label>
          <Input
            value={details.poNumber || ""}
            disabled={disabled}
            placeholder="Optional"
            className={cn(dashboardControlClass, "h-9")}
            onChange={(event) => patch({ poNumber: event.target.value })}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-[12px] text-[#616161]">Work description</Label>
          <Input
            value={details.workDescription || ""}
            disabled={disabled}
            placeholder="e.g. Sew-on patches on left panel"
            className={cn(dashboardControlClass, "h-9")}
            onChange={(event) =>
              patch({ workDescription: event.target.value })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px] text-[#616161]">Expected pcs</Label>
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="0"
            value={details.expectedQty || ""}
            disabled={disabled}
            className={cn(dashboardControlClass, "h-9 text-right tabular-nums")}
            onChange={(event) =>
              patch({
                expectedQty: Math.max(0, Math.round(Number(event.target.value) || 0)),
              })
            }
          />
        </div>
        <OrderDateField
          label="Expected return"
          value={details.expectedReturnAt}
          disabled={disabled}
          size="md"
          labelTone="form"
          placeholder="Pick date"
          presets={orderDatePresets()}
          onChange={(next) => patch({ expectedReturnAt: next })}
        />
      </div>

      <ol className="space-y-2.5">
        <li className={cn(dashboardInsetSurfaceClass, "px-3.5 py-3")}>
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                blanksReady
                  ? "bg-[#ecfdf3] text-[#067647]"
                  : "bg-[#f6f6f7] text-[#8a8a8a]"
              )}
            >
              <PackageOpen className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-[#303030]">
                1. Blanks received
              </p>
              <p className={dashboardTaskDetailClass}>
                {blanksReady
                  ? "All blank garments are checked in — ready to ship out."
                  : "Receive blanks on the Received goods tab before sending."}
              </p>
            </div>
          </div>
        </li>

        <li className={cn(dashboardInsetSurfaceClass, "px-3.5 py-3")}>
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                sent > 0
                  ? "bg-[#fff7ed] text-[#c2410c]"
                  : "bg-[#f6f6f7] text-[#8a8a8a]"
              )}
            >
              <Send className="size-4" />
            </span>
            <div className="min-w-0 flex-1 space-y-2.5">
              <div>
                <p className="text-[13px] font-medium text-[#303030]">
                  2. Send to vendor
                </p>
                <p className={dashboardTaskDetailClass}>
                  Ship blanks out for subcontract work.
                  {details.sentAt
                    ? ` Sent ${formatDateTime(details.sentAt)}.`
                    : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-[#8a8a8a]">Sent qty</Label>
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="0"
                    value={details.sentQty || ""}
                    disabled={disabled}
                    className={cn(dashboardControlClass, "h-9 w-24 text-right tabular-nums")}
                    onChange={(event) =>
                      patch({
                        sentQty: Math.max(
                          0,
                          Math.round(Number(event.target.value) || 0)
                        ),
                      })
                    }
                  />
                </div>
                <OrderDateField
                  label="Sent date"
                  value={details.sentAt}
                  disabled={disabled}
                  size="md"
                  labelTone="form"
                  placeholder="Pick date"
                  presets={receivingDatePresets()}
                  onChange={(next) => patch({ sentAt: next })}
                />
                <Button
                  type="button"
                  disabled={disabled || (!blanksReady && sent === 0)}
                  className={cn(dashboardPrimaryButtonClass, "h-9 px-3")}
                  onClick={markSent}
                >
                  <Truck className="size-3.5" />
                  {sent > 0 ? "Update send" : "Mark sent"}
                </Button>
              </div>
            </div>
          </div>
        </li>

        <li className={cn(dashboardInsetSurfaceClass, "px-3.5 py-3")}>
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                returned > 0
                  ? "bg-[#ecfdf3] text-[#067647]"
                  : "bg-[#f6f6f7] text-[#8a8a8a]"
              )}
            >
              <PackageCheck className="size-4" />
            </span>
            <div className="min-w-0 flex-1 space-y-2.5">
              <div>
                <p className="text-[13px] font-medium text-[#303030]">
                  3. Receive finished goods
                </p>
                <p className={dashboardTaskDetailClass}>
                  Check goods back in after the vendor finishes.
                  {details.returnedAt
                    ? ` Returned ${formatDateTime(details.returnedAt)}.`
                    : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-[#8a8a8a]">
                    Returned qty
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="0"
                    value={details.returnedQty || ""}
                    disabled={disabled}
                    className={cn(dashboardControlClass, "h-9 w-24 text-right tabular-nums")}
                    onChange={(event) =>
                      patch({
                        returnedQty: Math.max(
                          0,
                          Math.round(Number(event.target.value) || 0)
                        ),
                      })
                    }
                  />
                </div>
                <OrderDateField
                  label="Return date"
                  value={details.returnedAt}
                  disabled={disabled}
                  size="md"
                  labelTone="form"
                  placeholder="Pick date"
                  presets={receivingDatePresets()}
                  onChange={(next) => patch({ returnedAt: next })}
                />
                <Button
                  type="button"
                  disabled={disabled || sent === 0}
                  className={cn(dashboardPrimaryButtonClass, "h-9 px-3")}
                  onClick={markReturned}
                >
                  <PackageCheck className="size-3.5" />
                  {returned > 0 ? "Update return" : "Mark returned"}
                </Button>
              </div>
              {expected > 0 ? (
                <p className={dashboardTaskDetailClass}>
                  Progress: {returned}/{expected} returned
                  {sent > 0 ? ` · ${sent} sent` : ""}
                </p>
              ) : null}
            </div>
          </div>
        </li>
      </ol>

      <div className="space-y-1.5">
        <Label className="text-[12px] text-[#616161]">Notes</Label>
        <Textarea
          value={details.notes || ""}
          disabled={disabled}
          rows={2}
          placeholder="Tracking #, special instructions, vendor contacts…"
          className="min-h-[64px] resize-none rounded-lg border-[#e3e3e3] text-[13px]"
          onChange={(event) => patch({ notes: event.target.value })}
        />
      </div>
    </div>
  );
}

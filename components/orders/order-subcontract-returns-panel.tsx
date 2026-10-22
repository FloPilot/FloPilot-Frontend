"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, PackageCheck } from "lucide-react";
import { useRegisterUnsavedChanges } from "@/components/layout/staff-unsaved-changes-provider";
import { OrderDateField } from "@/components/orders/order-date-field";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { receivingDatePresets } from "@/lib/order-dates";
import {
  getSubcontractReturnLines,
  mergeOrderMaterials,
} from "@/lib/order-materials";
import {
  listOrderSubcontractEvents,
  resolveSubcontractDetails,
  SUBCONTRACT_STATUS_LABELS,
} from "@/lib/order-subcontract";
import type { Order, SubcontractDetails } from "@/types";
import { cn } from "@/lib/utils";

type ReturnDraft = {
  returnedQty: number;
  returnedAt: string;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function OrderSubcontractReturnsPanel({ order }: { order: Order }) {
  const { updateImprintSpecs } = useSchedule();
  const events = useMemo(() => listOrderSubcontractEvents(order), [order]);
  const materials = useMemo(() => mergeOrderMaterials(order), [order]);
  const returnLines = useMemo(
    () => getSubcontractReturnLines(materials),
    [materials]
  );

  const baselines = useMemo(() => {
    const map = new Map<string, ReturnDraft>();
    for (const { job, imprint } of events) {
      const key = `${job.id}:${imprint.id}`;
      const details = resolveSubcontractDetails(order, job, imprint);
      const line = returnLines.find(
        (entry) => entry.jobId === job.id && entry.imprintId === imprint.id
      );
      map.set(key, {
        returnedQty: Math.max(
          0,
          line?.receivedQty ?? details.returnedQty ?? 0
        ),
        returnedAt: (
          details.returnedAt ||
          line?.receivedAt ||
          ""
        ).slice(0, 10),
      });
    }
    return map;
  }, [events, order, returnLines]);

  const [drafts, setDrafts] = useState<Record<string, ReturnDraft>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDrafts({});
    setError(null);
  }, [order.id, baselines]);

  const dirtyKeys = useMemo(() => {
    const keys: string[] = [];
    for (const [key, baseline] of baselines.entries()) {
      const draft = drafts[key];
      if (!draft) continue;
      if (
        draft.returnedQty !== baseline.returnedQty ||
        draft.returnedAt !== baseline.returnedAt
      ) {
        keys.push(key);
      }
    }
    return keys;
  }, [baselines, drafts]);

  const dirty = dirtyKeys.length > 0;

  const patchDraft = (key: string, patch: Partial<ReturnDraft>) => {
    const baseline = baselines.get(key);
    if (!baseline) return;
    setDrafts((current) => {
      const prev = current[key] ?? baseline;
      return { ...current, [key]: { ...prev, ...patch } };
    });
  };

  const discard = useCallback(() => {
    setDrafts({});
    setError(null);
  }, []);

  const save = useCallback(async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      for (const key of dirtyKeys) {
        const [jobId, imprintId] = key.split(":");
        const row = events.find(
          (entry) => entry.job.id === jobId && entry.imprint.id === imprintId
        );
        if (!row) continue;
        const baseline = baselines.get(key)!;
        const draft = drafts[key] ?? baseline;
        const details = resolveSubcontractDetails(
          order,
          row.job,
          row.imprint
        );
        const expected = Math.max(
          0,
          details.expectedQty ?? details.sentQty ?? 0
        );
        const returnedQty = Math.max(0, draft.returnedQty);
        const next: SubcontractDetails = {
          ...details,
          returnedQty,
          returnedAt: draft.returnedAt || (returnedQty > 0 ? todayIsoDate() : null),
          status:
            expected > 0 && returnedQty >= expected
              ? "returned"
              : returnedQty > 0
                ? "partial_return"
                : details.sentQty
                  ? "at_vendor"
                  : details.status,
        };
        await updateImprintSpecs(order.id, jobId, imprintId, {
          subcontract: next,
        });
      }
      setDrafts({});
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save subcontract returns."
      );
    } finally {
      setSaving(false);
    }
  }, [
    dirty,
    saving,
    dirtyKeys,
    events,
    baselines,
    drafts,
    order,
    updateImprintSpecs,
  ]);

  useRegisterUnsavedChanges(
    dirty || saving
      ? {
          dirty: true,
          saving,
          label: "Unsaved subcontract returns",
          persistAcrossTabs: false,
          onSave: () => save(),
          onDiscard: discard,
        }
      : null,
    `order-subcontract-returns-${order.id}`
  );

  if (events.length === 0) return null;

  return (
    <section className={dashboardCardClass}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ebebeb] bg-[#fafafa] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h3 className={dashboardTaskTitleClass}>Subcontract returns</h3>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            After blanks go out for vendor work, check finished goods back in
            here — e.g. hats returning with patches sewn on.
          </p>
        </div>
        {dirty ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className={cn(dashboardControlClass, "h-8 text-[12px]")}
              disabled={saving}
              onClick={discard}
            >
              Discard
            </Button>
            <Button
              type="button"
              className={cn(dashboardPrimaryButtonClass, "h-8 px-3 text-[12px]")}
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save returns"
              )}
            </Button>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="border-b border-[#f5b5b5] bg-[#fff1f1] px-4 py-2 text-[12px] font-medium text-[#b42318] sm:px-5">
          {error}
        </p>
      ) : null}

      <ul className="divide-y divide-[#ebebeb]">
        {events.map(({ job, imprint }) => {
          const key = `${job.id}:${imprint.id}`;
          const details = resolveSubcontractDetails(order, job, imprint);
          const baseline = baselines.get(key)!;
          const draft = drafts[key] ?? baseline;
          const expected = Math.max(
            0,
            details.expectedQty ?? details.sentQty ?? 0
          );
          const status = details.status || "planned";
          const sent = details.sentQty || 0;
          const fullyReturned =
            expected > 0 && draft.returnedQty >= expected;

          return (
            <li
              key={key}
              className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <PackageCheck className="size-4 shrink-0 text-[#c2410c]" />
                  <p className="truncate text-[13px] font-medium text-[#303030]">
                    {details.workDescription ||
                      imprint.customLabel ||
                      imprint.label ||
                      job.name}
                  </p>
                  <span
                    className={cn(
                      "rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      fullyReturned
                        ? "border-[#86d4a8] bg-[#e8f5ee] text-[#067647]"
                        : draft.returnedQty > 0
                          ? "border-[#f5d0a8] bg-[#fff8eb] text-[#8a6116]"
                          : "border-[#fed7aa] bg-[#fff7ed] text-[#c2410c]"
                    )}
                  >
                    {fullyReturned
                      ? "Received"
                      : SUBCONTRACT_STATUS_LABELS[status]}
                  </span>
                </div>
                <p className={cn("mt-1", dashboardTaskDetailClass)}>
                  {details.vendorName
                    ? details.vendorName
                    : "Vendor not set"}
                  {details.poNumber ? ` · PO ${details.poNumber}` : ""}
                  {sent > 0 ? ` · ${sent} sent` : " · Not sent yet"}
                  {expected > 0
                    ? ` · ${draft.returnedQty}/${expected} returned`
                    : ""}
                </p>
                <Link
                  href={`/app/orders/${order.id}?tab=events`}
                  className="mt-1.5 inline-block text-[12px] font-medium text-[#2c6ecb] hover:underline"
                >
                  Open subcontract event
                </Link>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-[#8a8a8a]">
                    Returned qty
                  </p>
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="0"
                    value={draft.returnedQty || ""}
                    disabled={saving}
                    className={cn(
                      dashboardControlClass,
                      "h-9 w-24 text-right tabular-nums"
                    )}
                    onChange={(event) =>
                      patchDraft(key, {
                        returnedQty: Math.max(
                          0,
                          Math.round(Number(event.target.value) || 0)
                        ),
                        returnedAt:
                          draft.returnedAt ||
                          (Number(event.target.value) > 0
                            ? todayIsoDate()
                            : ""),
                      })
                    }
                  />
                </div>
                <OrderDateField
                  label="Return date"
                  value={draft.returnedAt || null}
                  disabled={saving}
                  size="md"
                  labelTone="form"
                  placeholder="Pick date"
                  presets={receivingDatePresets()}
                  onChange={(next) =>
                    patchDraft(key, {
                      returnedAt: next || "",
                    })
                  }
                />
                <Button
                  type="button"
                  className={cn(
                    fullyReturned
                      ? dashboardControlClass
                      : dashboardPrimaryButtonClass,
                    "h-9 px-3"
                  )}
                  disabled={saving || expected <= 0 || fullyReturned}
                  onClick={() =>
                    patchDraft(key, {
                      returnedQty: expected || sent || draft.returnedQty,
                      returnedAt: draft.returnedAt || todayIsoDate(),
                    })
                  }
                >
                  {fullyReturned ? "All in" : "Receive all"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

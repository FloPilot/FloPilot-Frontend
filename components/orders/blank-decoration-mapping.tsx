"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Shirt } from "lucide-react";
import { useRegisterUnsavedChanges } from "@/components/layout/staff-unsaved-changes-provider";
import { DecorationTypePill } from "@/components/orders/decoration-type-pill";
import { useSchedule } from "@/components/providers/schedule-provider";
import {
  dashboardCardClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { decorationLabel } from "@/lib/format";
import {
  decorationEventsForOrder,
  jobAppliesToBlank,
  jobAppliesToSize,
  lineItemDisplayLabel,
  resolveJobBlankAssignments,
  toggleJobBlankAssignment,
  toggleJobSizeAssignment,
  toPersistedBlankMapping,
} from "@/lib/job-line-items";
import { canEditOrderBlanks } from "@/lib/order-blanks";
import type { Job, JobBlankAssignment, Order } from "@/types";
import { cn } from "@/lib/utils";

type JobMappingDraft = {
  lineItemIds?: string[];
  blankAssignments?: JobBlankAssignment[];
};

function sizesWithQty(item: Order["lineItems"][number]) {
  return (item.sizes || []).filter(
    (row) => row.size && (Number(row.quantity) || 0) >= 0
  );
}

function snapshotJobMappings(order: Order): Record<string, JobMappingDraft> {
  const next: Record<string, JobMappingDraft> = {};
  for (const { job } of decorationEventsForOrder(order)) {
    next[job.id] = {
      ...(job.lineItemIds?.length ? { lineItemIds: [...job.lineItemIds] } : {}),
      ...(job.blankAssignments?.length
        ? {
            blankAssignments: job.blankAssignments.map((entry) => ({
              lineItemId: entry.lineItemId,
              ...(entry.sizes?.length ? { sizes: [...entry.sizes] } : {}),
            })),
          }
        : {}),
    };
  }
  return next;
}

function mappingKey(draft: Record<string, JobMappingDraft>): string {
  return JSON.stringify(draft);
}

function applyDraftToJob(job: Job, draft: JobMappingDraft | undefined): Job {
  // Missing draft key → keep server job. Empty object → default (all blanks).
  if (draft === undefined) return job;
  const next: Job = { ...job };
  if (draft.lineItemIds?.length) next.lineItemIds = draft.lineItemIds;
  else delete next.lineItemIds;
  if (draft.blankAssignments?.length) {
    next.blankAssignments = draft.blankAssignments;
  } else {
    delete next.blankAssignments;
  }
  return next;
}

function draftFromResolved(
  order: Pick<Order, "lineItems">,
  resolved: ReturnType<typeof resolveJobBlankAssignments>
): JobMappingDraft {
  const persisted = toPersistedBlankMapping(order, resolved);
  return {
    ...(persisted.lineItemIds?.length
      ? { lineItemIds: persisted.lineItemIds }
      : {}),
    ...(persisted.blankAssignments?.length
      ? { blankAssignments: persisted.blankAssignments }
      : {}),
  };
}

export function BlankDecorationMapping({ order }: { order: Order }) {
  const { updateProductionJobLineItems } = useSchedule();
  const canEdit = canEditOrderBlanks(order);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseline = useMemo(() => snapshotJobMappings(order), [order]);
  const [draft, setDraft] = useState<Record<string, JobMappingDraft>>(baseline);

  const dirty = mappingKey(draft) !== mappingKey(baseline);

  useEffect(() => {
    if (!dirty) setDraft(baseline);
  }, [baseline, dirty]);

  const viewOrder = useMemo(() => {
    return {
      ...order,
      jobs: order.jobs.map((job) => applyDraftToJob(job, draft[job.id])),
    };
  }, [order, draft]);

  const events = useMemo(
    () => decorationEventsForOrder(viewOrder),
    [viewOrder]
  );
  const blanks = order.lineItems ?? [];

  const discardDraft = useCallback(() => {
    setDraft(baseline);
    setError(null);
  }, [baseline]);

  const saveDraft = useCallback(async () => {
    if (!dirty) return;
    setSaving(true);
    setError(null);
    try {
      for (const { job } of decorationEventsForOrder(order)) {
        const next = draft[job.id] ?? {};
        const prev = baseline[job.id] ?? {};
        if (mappingKey({ [job.id]: next }) === mappingKey({ [job.id]: prev })) {
          continue;
        }
        const lineItemIds =
          next.lineItemIds ?? blanks.map((item) => item.id);
        const blankAssignments = next.blankAssignments ?? [];
        await updateProductionJobLineItems(
          order.id,
          job.id,
          lineItemIds,
          blankAssignments
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update decoration mapping."
      );
      throw err;
    } finally {
      setSaving(false);
    }
  }, [
    dirty,
    draft,
    baseline,
    blanks,
    order,
    updateProductionJobLineItems,
  ]);

  useRegisterUnsavedChanges(
    canEdit && dirty
      ? {
          dirty: true,
          saving,
          label: "Unsaved decoration mapping",
          persistAcrossTabs: false,
          onSave: () => saveDraft(),
          onDiscard: discardDraft,
        }
      : null,
    `order-blank-decoration-${order.id}`
  );

  const updateJobMapping = (
    jobId: string,
    resolved: ReturnType<typeof resolveJobBlankAssignments>
  ) => {
    if (resolved.length === 0) {
      setError("Keep at least one blank or size for each decoration.");
      return;
    }
    setError(null);
    setDraft((current) => ({
      ...current,
      [jobId]: draftFromResolved(order, resolved),
    }));
  };

  const handleToggleSize = (
    jobId: string,
    lineItemId: string,
    size: string,
    enabled: boolean
  ) => {
    const job = viewOrder.jobs.find((entry) => entry.id === jobId);
    if (!job || !canEdit || saving) return;
    updateJobMapping(
      jobId,
      toggleJobSizeAssignment(viewOrder, job, lineItemId, size, enabled)
    );
  };

  const handleToggleBlank = (
    jobId: string,
    lineItemId: string,
    enabled: boolean
  ) => {
    const job = viewOrder.jobs.find((entry) => entry.id === jobId);
    if (!job || !canEdit || saving) return;
    updateJobMapping(
      jobId,
      toggleJobBlankAssignment(viewOrder, job, lineItemId, enabled)
    );
  };

  if (blanks.length === 0) return null;

  if (events.length === 0) {
    return (
      <section className={dashboardCardClass}>
        <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
          <h2 className={dashboardTaskTitleClass}>Decorations by blank</h2>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            Add decoration events on the Events tab, then map which blanks and
            sizes each design runs on here.
          </p>
        </div>
        <div className="px-4 py-8 text-center sm:px-5">
          <span className="inline-flex size-10 items-center justify-center rounded-xl border border-dashed border-[#e3e3e3] bg-[#fafafa] text-[#8a8a8a]">
            <Shirt className="size-4" />
          </span>
          <p className="mt-2.5 text-[13px] font-medium text-[#303030]">
            No decoration events yet
          </p>
          <p className={cn("mx-auto mt-1 max-w-sm", dashboardTaskDetailClass)}>
            Defaults apply every decoration to every blank and size once events
            exist — you can narrow the mapping anytime.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={dashboardCardClass}>
      <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
        <h2 className={dashboardTaskTitleClass}>Decorations by blank</h2>
        <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
          Map which designs run on each garment and size. Defaults cover the
          whole line — turn sizes off when youth and adult need different
          artwork. Changes stay local until you save.
        </p>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap gap-1.5">
          {events.map(({ job, imprintLabel, decoration }) => (
            <span
              key={job.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e3e3e3] bg-[#fafafa] px-2.5 py-1 text-[11px] font-medium text-[#616161]"
            >
              <DecorationTypePill
                decoration={decoration}
                className="px-1.5 py-0 text-[10px]"
              />
              <span className="max-w-[10rem] truncate text-[#303030]">
                {imprintLabel}
              </span>
            </span>
          ))}
        </div>

        {blanks.map((item) => {
          const sizes = sizesWithQty(item);
          return (
            <div
              key={item.id}
              className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-white shadow-[0_1px_0_rgba(26,26,26,0.03)]"
            >
              <div className="border-b border-[#ebebeb] bg-[#fafafa] px-3.5 py-3">
                <p className="text-[13px] font-semibold text-[#303030]">
                  {lineItemDisplayLabel(item)}
                </p>
                <p className="mt-0.5 text-[11px] text-[#8a8a8a]">
                  {sizes.length} size{sizes.length === 1 ? "" : "s"} · click a
                  decoration to include or exclude the whole blank
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {events.map(({ job, imprintLabel, decoration }) => {
                    const active = jobAppliesToBlank(viewOrder, job, item.id);
                    const resolved = resolveJobBlankAssignments(
                      viewOrder,
                      job
                    ).find((entry) => entry.lineItemId === item.id);
                    const partial = Boolean(resolved?.sizes);
                    return (
                      <button
                        key={`${item.id}-${job.id}-all`}
                        type="button"
                        disabled={!canEdit || saving}
                        onClick={() =>
                          handleToggleBlank(job.id, item.id, !active || partial)
                        }
                        title={
                          partial
                            ? "Some sizes only — click to apply all sizes"
                            : active
                              ? "Remove this blank from the decoration"
                              : "Add this blank to the decoration"
                        }
                        className={cn(
                          "inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-semibold transition-colors",
                          active && !partial
                            ? "border-[#2c6ecb]/40 bg-[#f4f7fd] text-[#2c6ecb]"
                            : partial
                              ? "border-[#f0d9a8] bg-[#fff8eb] text-[#8a6116]"
                              : "border-[#e3e3e3] bg-white text-[#8a8a8a] hover:border-[#c9c9c9] hover:text-[#303030]",
                          (!canEdit || saving) && "opacity-60"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-3.5 shrink-0 items-center justify-center rounded border",
                            active && !partial
                              ? "border-[#2c6ecb] bg-[#2c6ecb] text-white"
                              : partial
                                ? "border-[#d4a017] bg-[#d4a017] text-white"
                                : "border-[#cfcfcf] bg-white"
                          )}
                        >
                          {active || partial ? (
                            <Check className="size-2.5" />
                          ) : null}
                        </span>
                        <span className="min-w-0 truncate">
                          {imprintLabel}
                          <span className="font-medium text-[#8a8a8a]">
                            {" "}
                            · {decorationLabel(decoration)}
                          </span>
                          {partial ? " · partial" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-[13px]">
                  <thead>
                    <tr className="border-b border-[#ebebeb] bg-white">
                      <th className="w-16 px-3.5 py-2 text-left text-[11px] font-medium text-[#8a8a8a]">
                        Size
                      </th>
                      <th className="w-16 px-2 py-2 text-right text-[11px] font-medium text-[#8a8a8a]">
                        Qty
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-medium text-[#8a8a8a]">
                        Decorations
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sizes.map((row) => (
                      <tr
                        key={`${item.id}-${row.size}`}
                        className="border-b border-[#f0f0f0] last:border-0"
                      >
                        <td className="px-3.5 py-2.5 font-semibold text-[#303030]">
                          {row.size}
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-[#616161]">
                          {Number(row.quantity) || 0}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-1.5">
                            {events.map(({ job, imprintLabel }) => {
                              const active = jobAppliesToSize(
                                viewOrder,
                                job,
                                item.id,
                                row.size
                              );
                              return (
                                <button
                                  key={`${item.id}-${row.size}-${job.id}`}
                                  type="button"
                                  disabled={!canEdit || saving}
                                  onClick={() =>
                                    handleToggleSize(
                                      job.id,
                                      item.id,
                                      row.size,
                                      !active
                                    )
                                  }
                                  className={cn(
                                    "inline-flex max-w-[12rem] items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors",
                                    active
                                      ? "border-[#2c6ecb]/35 bg-[#f4f7fd] text-[#2c6ecb]"
                                      : "border-[#ececec] bg-[#fafafa] text-[#8a8a8a] hover:border-[#d4d4d4] hover:text-[#303030]",
                                    (!canEdit || saving) && "opacity-60"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "flex size-3 shrink-0 items-center justify-center rounded-sm border",
                                      active
                                        ? "border-[#2c6ecb] bg-[#2c6ecb] text-white"
                                        : "border-[#cfcfcf] bg-white"
                                    )}
                                  >
                                    {active ? (
                                      <Check className="size-2" />
                                    ) : null}
                                  </span>
                                  <span className="truncate">{imprintLabel}</span>
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {error ? (
          <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[12px] text-[#8f1f1f]">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

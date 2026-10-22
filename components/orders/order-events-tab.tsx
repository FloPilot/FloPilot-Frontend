"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarPlus,
  ChevronDown,
  Copy,
  ImageIcon,
  ListChecks,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useRegisterUnsavedChanges } from "@/components/layout/staff-unsaved-changes-provider";
import { ImprintDesignCard } from "@/components/orders/imprint-design-card";
import {
  OrderHeaderCombo,
  OrderHeaderField,
} from "@/components/orders/order-header-field";
import { ProductionEventSheet } from "@/components/tasks/production-event-sheet";
import { CheckpointStatusBadge } from "@/components/orders/order-checkpoint-pills";
import { DecorationTypePill } from "@/components/orders/decoration-type-pill";
import { SubcontractEventPanel } from "@/components/orders/subcontract-event-panel";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  LabeledSelectValue,
  SelectTrigger,
} from "@/components/ui/select";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardSelectContentClass,
  dashboardSelectItemClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { formatJobBlankAssignmentSummary } from "@/lib/job-line-items";
import { computeEventStatusCards } from "@/lib/event-status-checkpoints";
import { imprintDisplayName } from "@/lib/imprint-display";
import type { OrderDetailTab } from "@/lib/order-detail-tabs";
import {
  eventLabel,
  eventsAndDesignsLabel,
  eventsLabel,
} from "@/lib/terminology";
import {
  buildDuplicatedDesignJob,
  getOrderProductionSteps,
  type ProductionStep,
} from "@/lib/order-production";
import { getProofSlides } from "@/lib/proof-slides";
import { resolveProductionEvent } from "@/lib/production-event-status";
import {
  getDecorationTypeOptions,
  getPrintLocationOptionsForDecoration,
  rematchPrintLocationForDecoration,
  resolvePrintLocationLabel,
} from "@/lib/shop-settings";
import {
  orderHeaderComboTriggerClass,
  orderHeaderSelectContentClass,
} from "@/lib/order-addresses";
import {
  isSubcontractEvent,
  subcontractDetailsEqual,
} from "@/lib/order-subcontract";
import type {
  DecorationType,
  ImprintLocationKey,
  Job,
  JobImprint,
  Order,
  ScheduleBlock,
  StationJobRun,
  SubcontractDetails,
} from "@/types";
import { cn } from "@/lib/utils";

type SpecDraft = {
  decoration?: DecorationType;
  locationKey?: ImprintLocationKey;
  label?: string;
  /** Display name override — empty string clears back to location label. */
  customLabel?: string | null;
  isLegacy?: boolean;
  subcontract?: SubcontractDetails | null;
};

function eventKey(jobId: string, imprintId: string): string {
  return `${jobId}-${imprintId}`;
}

function applySpecDraft(
  imprint: JobImprint,
  draft: SpecDraft | undefined
): JobImprint {
  if (!draft) return imprint;
  return {
    ...imprint,
    ...(draft.decoration ? { decoration: draft.decoration } : {}),
    ...(draft.locationKey ? { locationKey: draft.locationKey } : {}),
    ...(draft.label ? { label: draft.label } : {}),
    ...(draft.customLabel !== undefined
      ? { customLabel: draft.customLabel?.trim() || undefined }
      : {}),
    ...(draft.isLegacy !== undefined ? { isLegacy: draft.isLegacy } : {}),
    ...(draft.subcontract !== undefined
      ? { subcontract: draft.subcontract || undefined }
      : {}),
  };
}

function draftDiffersFromImprint(
  imprint: JobImprint,
  draft: SpecDraft | undefined
): boolean {
  if (!draft) return false;
  if (draft.decoration && draft.decoration !== imprint.decoration) return true;
  if (draft.locationKey && draft.locationKey !== imprint.locationKey) {
    return true;
  }
  if (draft.label && draft.label !== imprint.label) return true;
  if (draft.customLabel !== undefined) {
    const next = draft.customLabel?.trim() || "";
    const prev = imprint.customLabel?.trim() || "";
    if (next !== prev) return true;
  }
  if (
    draft.isLegacy !== undefined &&
    Boolean(draft.isLegacy) !== Boolean(imprint.isLegacy)
  ) {
    return true;
  }
  if (
    draft.subcontract !== undefined &&
    !subcontractDetailsEqual(imprint.subcontract, draft.subcontract)
  ) {
    return true;
  }
  return false;
}

export function OrderEventsTab({
  order,
  scheduleBlocks,
  jobRuns,
  pendingJobIds,
  onRemovePendingJob,
  onAddEvent,
  onDuplicateDesign,
  onScheduleStep,
  onOpenDesign,
  onOpenFiles,
  onOpenTab,
  focusImprint,
  onFocusHandled,
}: {
  order: Order;
  scheduleBlocks: ScheduleBlock[];
  jobRuns: StationJobRun[];
  pendingJobIds?: Set<string>;
  onRemovePendingJob?: (jobId: string) => void;
  onAddEvent: () => void;
  /** Stage a duplicated design for the order Save/Discard bar. */
  onDuplicateDesign?: (job: Job) => void;
  onScheduleStep: (step: ProductionStep) => void;
  /** Jump to Proofs review for this location. */
  onOpenDesign?: (jobId: string, imprintId: string) => void;
  /** Jump to Order files for this location. */
  onOpenFiles?: (jobId: string, imprintId: string) => void;
  onOpenTab?: (tab: OrderDetailTab) => void;
  focusImprint?: { jobId: string; imprintId: string } | null;
  onFocusHandled?: () => void;
}) {
  const { settings } = useShopSettings();
  const { updateImprintSpecs, removeProductionJob } = useSchedule();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [statusOpenKey, setStatusOpenKey] = useState<string | null>(null);
  const [specDrafts, setSpecDrafts] = useState<Record<string, SpecDraft>>({});
  const [specsSaving, setSpecsSaving] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    key: string;
    jobId: string;
    pending: boolean;
    label: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<{
    jobId: string;
    imprintId: string;
  } | null>(null);

  useEffect(() => {
    setSpecDrafts({});
    setExpandedKey(null);
    setStatusOpenKey(null);
    setError(null);
  }, [order.id]);

  useEffect(() => {
    if (!focusImprint) return;
    setExpandedKey(eventKey(focusImprint.jobId, focusImprint.imprintId));
    onFocusHandled?.();
  }, [focusImprint, onFocusHandled]);

  const decorationOptions = useMemo(
    () =>
      getDecorationTypeOptions(settings.productionDefaults).filter(
        (option) => option.value !== "finishing"
      ),
    [settings.productionDefaults]
  );

  const eventRows = useMemo(() => {
    return getOrderProductionSteps(order).map(({ job, imprint }) => {
      const key = eventKey(job.id, imprint.id);
      const displayImprint = applySpecDraft(imprint, specDrafts[key]);
      const resolved = resolveProductionEvent({
        order,
        job,
        imprint: displayImprint,
        scheduleBlocks,
        jobRuns,
      });

      return {
        job,
        imprint: displayImprint,
        sourceImprint: imprint,
        resolved,
        pending: pendingJobIds?.has(job.id) ?? false,
        statusCards: computeEventStatusCards(
          order,
          job,
          displayImprint,
          resolved
        ),
        key,
      };
    });
  }, [order, scheduleBlocks, jobRuns, pendingJobIds, specDrafts]);

  const specsDirty = useMemo(
    () =>
      eventRows.some(({ sourceImprint, key }) =>
        draftDiffersFromImprint(sourceImprint, specDrafts[key])
      ),
    [eventRows, specDrafts]
  );

  const patchSpecDraft = useCallback((key: string, patch: SpecDraft) => {
    setSpecDrafts((current) => ({
      ...current,
      [key]: { ...current[key], ...patch },
    }));
  }, []);

  const discardSpecDrafts = useCallback(() => {
    setSpecDrafts({});
    setError(null);
  }, []);

  const saveSpecDrafts = useCallback(async () => {
    if (!specsDirty) return;
    setSpecsSaving(true);
    setError(null);
    try {
      for (const row of eventRows) {
        const draft = specDrafts[row.key];
        if (!draftDiffersFromImprint(row.sourceImprint, draft)) continue;
        await updateImprintSpecs(order.id, row.job.id, row.sourceImprint.id, {
          ...(draft.decoration ? { decoration: draft.decoration } : {}),
          ...(draft.locationKey
            ? { locationKey: draft.locationKey, label: draft.label }
            : {}),
          ...(draft.customLabel !== undefined
            ? { customLabel: draft.customLabel?.trim() || null }
            : {}),
          ...(draft.isLegacy !== undefined
            ? { isLegacy: draft.isLegacy }
            : {}),
          ...(draft.subcontract !== undefined
            ? { subcontract: draft.subcontract }
            : {}),
        });
      }
      setSpecDrafts({});
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save event designs."
      );
    } finally {
      setSpecsSaving(false);
    }
  }, [
    specsDirty,
    eventRows,
    specDrafts,
    updateImprintSpecs,
    order.id,
  ]);

  useRegisterUnsavedChanges(
    specsDirty || specsSaving
      ? {
          dirty: true,
          saving: specsSaving,
          label: "Unsaved event changes",
          persistAcrossTabs: false,
          onSave: () => saveSpecDrafts(),
          onDiscard: discardSpecDrafts,
        }
      : null,
    `order-event-designs-${order.id}`
  );

  const handleDuplicate = (job: Job, imprint: JobImprint) => {
    if (!onDuplicateDesign) return;
    setError(null);
    const cloned = buildDuplicatedDesignJob(job, imprint);
    onDuplicateDesign(cloned);
    setExpandedKey(eventKey(cloned.id, cloned.imprints[0]?.id ?? ""));
  };

  const clearEventLocalState = useCallback((key: string) => {
    setExpandedKey((current) => (current === key ? null : current));
    setStatusOpenKey((current) => (current === key ? null : current));
    setSpecDrafts((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  const requestDeleteEvent = (
    key: string,
    jobId: string,
    pending: boolean,
    label: string
  ) => {
    setError(null);
    setDeleteTarget({ key, jobId, pending, label });
  };

  const confirmDeleteEvent = async () => {
    if (!deleteTarget) return;
    const { key, jobId, pending } = deleteTarget;

    if (pending) {
      onRemovePendingJob?.(jobId);
      clearEventLocalState(key);
      setDeleteTarget(null);
      return;
    }

    setDeletingKey(key);
    setError(null);
    try {
      await removeProductionJob(order.id, jobId);
      clearEventLocalState(key);
      setDeleteTarget(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete this event."
      );
    } finally {
      setDeletingKey(null);
    }
  };

  const eventSingular = eventLabel;
  const selectContentClass = cn(
    dashboardSelectContentClass,
    orderHeaderSelectContentClass
  );

  if (eventRows.length === 0) {
    return (
      <section className={dashboardCardClass}>
        <div className="border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
          <h2 className={dashboardTaskTitleClass}>{eventsAndDesignsLabel}</h2>
        </div>
        <div className="p-4 sm:p-5">
          <div className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-12 text-center">
            <CalendarPlus className="mx-auto mb-3 size-8 text-[#c9c9c9]" />
            <p className="text-[13px] font-medium text-[#303030]">
              No {eventsLabel.toLowerCase()} yet
            </p>
            <Button
              type="button"
              className={cn(dashboardPrimaryButtonClass, "mt-4 h-9")}
              onClick={onAddEvent}
            >
              <Plus className="size-3.5" />
              Add {eventSingular.toLowerCase()}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className={dashboardCardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebebeb] px-4 py-3.5 sm:px-5">
          <h2 className={dashboardTaskTitleClass}>{eventsAndDesignsLabel}</h2>
          <Button
            type="button"
            className={cn(dashboardControlClass, "h-8 shrink-0 text-[12px]")}
            onClick={onAddEvent}
          >
            <Plus className="size-3.5" />
            Add event
          </Button>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          {error ? (
            <p className="rounded-md border border-[#e7b4b4] bg-[#fdf2f2] px-3 py-2 text-[12px] font-medium text-[#b42318]">
              {error}
            </p>
          ) : null}

          {eventRows.map(
            ({
              job,
              imprint,
              sourceImprint,
              statusCards,
              pending,
              key,
            }) => {
              const expanded = expandedKey === key;
              const statusOpen = statusOpenKey === key;
              const applicableStatus = statusCards.filter(
                (checkpoint) => checkpoint.status !== "not_applicable"
              );
              const locationOptions = getPrintLocationOptionsForDecoration(
                settings.productionDefaults,
                imprint.decoration,
                { includeValue: imprint.locationKey }
              );
              const busy = specsSaving || deletingKey === key;
              const slides = getProofSlides(imprint.artwork);
              const thumb =
                slides[0]?.previewUrl || imprint.artwork.previewUrl || null;
              const isFinishing =
                job.kind === "finishing" || imprint.decoration === "finishing";
              const isSubcontract = isSubcontractEvent(job, imprint);
              const hasDraft = draftDiffersFromImprint(
                sourceImprint,
                specDrafts[key]
              );

              return (
                <div
                  key={key}
                  className={cn(
                    dashboardInsetSurfaceClass,
                    "overflow-hidden rounded-xl",
                    pending && "border-[#c9d7ef] bg-[#f8faff]",
                    hasDraft && "border-[#c9d7ef]",
                    imprint.isLegacy && !hasDraft && "border-[#e3e3e3]"
                  )}
                >
                  <div className="flex items-start gap-1 px-3.5 py-3.5 transition-colors hover:bg-[#fafafa]">
                    <button
                      type="button"
                      className="mt-0.5 flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#ebebeb] bg-white p-1"
                      onClick={() =>
                        setExpandedKey((current) =>
                          current === key ? null : key
                        )
                      }
                      aria-label={
                        expanded ? "Collapse event" : "Expand event"
                      }
                      aria-expanded={expanded}
                    >
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="size-full object-contain"
                        />
                      ) : (
                        <ImageIcon className="size-4 text-[#c9c9c9]" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <Input
                          value={
                            specDrafts[key]?.customLabel !== undefined
                              ? specDrafts[key]?.customLabel?.trim() ||
                                imprint.label
                              : sourceImprint.customLabel?.trim() ||
                                imprint.label
                          }
                          disabled={busy || pending}
                          aria-label="Event name"
                          className={cn(
                            dashboardControlClass,
                            "h-8 min-w-[10rem] max-w-full flex-1 border-transparent bg-transparent px-1.5 text-[14px] font-semibold text-[#303030] shadow-none",
                            "hover:border-[#e3e3e3] hover:bg-white focus-visible:border-[#c4d7f2] focus-visible:bg-white"
                          )}
                          onChange={(event) => {
                            patchSpecDraft(key, {
                              customLabel: event.target.value,
                            });
                          }}
                          onBlur={(event) => {
                            const next = event.target.value.trim();
                            const locationLabel = imprint.label.trim();
                            const savedCustom =
                              sourceImprint.customLabel?.trim() || "";
                            // Empty or back to the location label → clear
                            // override (save as no custom label).
                            const resolved =
                              !next || next === locationLabel ? "" : next;
                            // No real change from what's already saved —
                            // drop the draft so click-away doesn't wipe the name.
                            if (resolved === savedCustom) {
                              setSpecDrafts((current) => {
                                const existing = current[key];
                                if (
                                  !existing ||
                                  existing.customLabel === undefined
                                ) {
                                  return current;
                                }
                                const { customLabel: _ignored, ...rest } =
                                  existing;
                                if (Object.keys(rest).length === 0) {
                                  const { [key]: _drop, ...remaining } =
                                    current;
                                  return remaining;
                                }
                                return { ...current, [key]: rest };
                              });
                              return;
                            }
                            patchSpecDraft(key, { customLabel: resolved });
                          }}
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              (event.target as HTMLInputElement).blur();
                            }
                          }}
                        />
                        {imprint.designCode?.trim() ? (
                          <span className="rounded-md border border-[#e3e3e3] bg-[#f6f6f7] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-[#616161]">
                            {imprint.designCode.trim()}
                          </span>
                        ) : null}
                        {imprint.isLegacy ? (
                          <span className="rounded-md border border-[#e3e3e3] bg-[#f6f6f7] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#616161]">
                            Old design
                          </span>
                        ) : null}
                        {hasDraft ? (
                          <span className="rounded-md bg-[#fff8eb] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8a6116]">
                            Unsaved
                          </span>
                        ) : null}
                        {pending ? (
                          <span className="rounded-md bg-[#e8f0fb] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2c6ecb]">
                            Pending save
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="flex w-full min-w-0 flex-col items-start gap-1 text-left"
                        onClick={() =>
                          setExpandedKey((current) =>
                            current === key ? null : key
                          )
                        }
                        aria-expanded={expanded}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <DecorationTypePill decoration={imprint.decoration} />
                          <span className="text-[12px] text-[#8a8a8a]">
                            {imprint.label}
                          </span>
                        </div>
                        {!isFinishing ? (
                          <p className="truncate text-[11px] text-[#8a8a8a]">
                            {isSubcontract && imprint.subcontract?.vendorName
                              ? `${imprint.subcontract.vendorName} · `
                              : ""}
                            {formatJobBlankAssignmentSummary(order, job)}
                          </p>
                        ) : null}
                      </button>
                    </div>

                    <div className="flex h-12 shrink-0 items-center gap-0.5 self-start">
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-lg text-[#8a8a8a] transition-colors hover:bg-white hover:text-[#303030]"
                        aria-label={expanded ? "Collapse event" : "Expand event"}
                        aria-expanded={expanded}
                        onClick={() =>
                          setExpandedKey((current) =>
                            current === key ? null : key
                          )
                        }
                      >
                        <ChevronDown
                          className={cn(
                            "size-4 transition-transform",
                            expanded && "rotate-180"
                          )}
                        />
                      </button>
                      {!pending && applicableStatus.length > 0 ? (
                        <button
                          type="button"
                          className={cn(
                            "inline-flex size-8 items-center justify-center rounded-lg text-[#8a8a8a] transition-colors",
                            "hover:bg-white hover:text-[#303030]",
                            statusOpen &&
                              "bg-white text-[#2c6ecb] ring-1 ring-[#c4d7f2]"
                          )}
                          aria-label={
                            statusOpen ? "Hide status" : "Show status"
                          }
                          aria-expanded={statusOpen}
                          onClick={() =>
                            setStatusOpenKey((current) =>
                              current === key ? null : key
                            )
                          }
                        >
                          <ListChecks className="size-4" strokeWidth={1.75} />
                        </button>
                      ) : null}
                      {(pending ? Boolean(onRemovePendingJob) : true) ? (
                        <button
                          type="button"
                          className="inline-flex size-8 items-center justify-center rounded-lg text-[#8a8a8a] transition-colors hover:bg-[#fdf2f2] hover:text-[#b42318] disabled:opacity-50"
                          aria-label={`Delete ${imprintDisplayName(imprint)}`}
                          disabled={busy}
                          onClick={() =>
                            requestDeleteEvent(
                              key,
                              job.id,
                              pending,
                              imprintDisplayName(imprint)
                            )
                          }
                        >
                          <Trash2 className="size-4" strokeWidth={1.75} />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {statusOpen && applicableStatus.length > 0 ? (
                    <div className="border-t border-[#ebebeb] bg-[#fafafa] px-3.5 py-3.5">
                      <ul className="space-y-2.5">
                        {applicableStatus.map((checkpoint) => (
                          <li
                            key={checkpoint.key}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="min-w-0 truncate text-[13px] text-[#616161]">
                              {checkpoint.label}
                            </span>
                            <CheckpointStatusBadge checkpoint={checkpoint} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {expanded ? (
                    <div className="space-y-4 border-t border-[#ebebeb] bg-white px-3.5 py-4">
                      {pending ? (
                        <p className={dashboardTaskDetailClass}>
                          Save the new event from the top bar first — then you
                          can edit design details here.
                        </p>
                      ) : isFinishing ? (
                        <p className={dashboardTaskDetailClass}>
                          Finishing events don&apos;t need decoration specs —
                          schedule them when the floor is ready.
                        </p>
                      ) : isSubcontract ? (
                        <SubcontractEventPanel
                          order={order}
                          job={job}
                          imprint={sourceImprint}
                          draft={specDrafts[key]?.subcontract}
                          disabled={busy}
                          onChange={(subcontract) =>
                            patchSpecDraft(key, { subcontract })
                          }
                        />
                      ) : (
                        <>
                          <div className="flex flex-wrap items-end gap-1.5">
                            <OrderHeaderField
                              label="Decoration"
                              className="w-[10.5rem] shrink-0"
                            >
                              <OrderHeaderCombo className="w-full min-w-0">
                                <Select
                                  value={imprint.decoration}
                                  disabled={busy}
                                  onValueChange={(value) => {
                                    if (!value) return;
                                    const matched =
                                      rematchPrintLocationForDecoration(
                                        imprint.locationKey,
                                        value,
                                        settings.productionDefaults
                                      );
                                    patchSpecDraft(key, {
                                      decoration: value as DecorationType,
                                      locationKey:
                                        matched.locationKey as ImprintLocationKey,
                                      label: matched.label,
                                    });
                                  }}
                                >
                                  <SelectTrigger
                                    className={orderHeaderComboTriggerClass}
                                  >
                                    <LabeledSelectValue
                                      value={imprint.decoration}
                                      options={decorationOptions}
                                      placeholder="Decoration"
                                    />
                                  </SelectTrigger>
                                  <SelectContent
                                    align="start"
                                    alignItemWithTrigger={false}
                                    className={selectContentClass}
                                  >
                                    {decorationOptions.map((option) => (
                                      <SelectItem
                                        key={option.value}
                                        value={option.value}
                                        className={dashboardSelectItemClass}
                                      >
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </OrderHeaderCombo>
                            </OrderHeaderField>

                            <OrderHeaderField
                              label="Location"
                              className="min-w-[11rem] flex-1 sm:max-w-[15rem]"
                            >
                              <OrderHeaderCombo className="w-full min-w-0">
                                <Select
                                  value={imprint.locationKey}
                                  disabled={busy}
                                  onValueChange={(value) => {
                                    if (!value) return;
                                    patchSpecDraft(key, {
                                      locationKey: value as ImprintLocationKey,
                                      label: resolvePrintLocationLabel(
                                        value,
                                        settings.productionDefaults
                                      ),
                                    });
                                  }}
                                >
                                  <SelectTrigger
                                    className={orderHeaderComboTriggerClass}
                                  >
                                    <LabeledSelectValue
                                      value={imprint.locationKey}
                                      options={locationOptions}
                                      placeholder="Location"
                                    />
                                  </SelectTrigger>
                                  <SelectContent
                                    align="start"
                                    alignItemWithTrigger={false}
                                    className={selectContentClass}
                                  >
                                    {locationOptions.map((option) => (
                                      <SelectItem
                                        key={option.value}
                                        value={option.value}
                                        className={dashboardSelectItemClass}
                                      >
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </OrderHeaderCombo>
                            </OrderHeaderField>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              className={cn(
                                dashboardControlClass,
                                "h-8 text-[12px]",
                                imprint.isLegacy &&
                                  "border-[#c9c9c9] bg-[#f6f6f7] text-[#616161]"
                              )}
                              disabled={busy}
                              onClick={() =>
                                patchSpecDraft(key, {
                                  isLegacy: !imprint.isLegacy,
                                })
                              }
                            >
                              {imprint.isLegacy
                                ? "Clear old design tag"
                                : "Mark as old design"}
                            </Button>
                            {onDuplicateDesign ? (
                              <Button
                                type="button"
                                className={cn(
                                  dashboardControlClass,
                                  "h-8 text-[12px]"
                                )}
                                disabled={busy}
                                onClick={() =>
                                  handleDuplicate(job, sourceImprint)
                                }
                              >
                                <Copy className="size-3.5" />
                                Duplicate design
                              </Button>
                            ) : null}
                            {onOpenDesign ? (
                              <Button
                                type="button"
                                className={cn(
                                  dashboardControlClass,
                                  "h-8 text-[12px]"
                                )}
                                onClick={() =>
                                  onOpenDesign(job.id, sourceImprint.id)
                                }
                              >
                                Review on Proofs
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              className={cn(
                                dashboardControlClass,
                                "h-8 text-[12px]"
                              )}
                              onClick={() =>
                                onScheduleStep({
                                  job,
                                  imprint: sourceImprint,
                                })
                              }
                            >
                              Schedule
                            </Button>
                            <Button
                              type="button"
                              className={cn(
                                dashboardControlClass,
                                "h-8 text-[12px]"
                              )}
                              onClick={() =>
                                setSelectedEvent({
                                  jobId: job.id,
                                  imprintId: sourceImprint.id,
                                })
                              }
                            >
                              Floor details
                            </Button>
                          </div>

                          {hasDraft ? null : (
                            <ImprintDesignCard
                              key={`${job.id}-${sourceImprint.id}`}
                              order={order}
                              job={job}
                              imprint={sourceImprint}
                              hideArtWorkflow
                              hideApprovalActions
                            />
                          )}
                        </>
                      )}

                    </div>
                  ) : null}
                </div>
              );
            }
          )}
        </div>
      </section>

      <ProductionEventSheet
        orderId={order.id}
        jobId={selectedEvent?.jobId ?? null}
        imprintId={selectedEvent?.imprintId ?? null}
        open={Boolean(selectedEvent)}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null);
        }}
        onSchedule={() => {
          const selected = eventRows.find(
            (row) =>
              row.job.id === selectedEvent?.jobId &&
              row.sourceImprint.id === selectedEvent?.imprintId
          );
          setSelectedEvent(null);
          if (selected) {
            onScheduleStep({
              job: selected.job,
              imprint: selected.sourceImprint,
            });
          }
        }}
        onOpenFiles={
          onOpenFiles
            ? (jobId, imprintId) => {
                setSelectedEvent(null);
                onOpenFiles(jobId, imprintId);
              }
            : undefined
        }
        onOpenTab={onOpenTab}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (deletingKey) return;
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent
          showCloseButton={!deletingKey}
          className="gap-0 overflow-hidden p-0 sm:max-w-md"
        >
          <DialogHeader className="border-b border-[#ebebeb] px-5 py-4">
            <DialogTitle className={dashboardTaskTitleClass}>
              Delete event
            </DialogTitle>
            <p className={dashboardTaskDetailClass}>
              {deleteTarget?.pending
                ? "Remove this unsaved event from the order?"
                : "This removes the event from the order and can’t be undone."}
            </p>
          </DialogHeader>

          <div className="px-5 py-4">
            <div
              className={cn(
                dashboardInsetSurfaceClass,
                "flex items-center gap-3 px-4 py-3"
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#fff1f1] text-[#c0392b]">
                <Trash2 className="size-4" />
              </span>
              <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#303030]">
                {deleteTarget?.label || "This event"}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-4">
            <Button
              type="button"
              variant="ghost"
              disabled={Boolean(deletingKey)}
              className="h-9 rounded-lg"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={Boolean(deletingKey)}
              className="h-9 rounded-lg bg-[#c0392b] px-4 text-[13px] font-medium text-white hover:bg-[#a93226]"
              onClick={() => void confirmDeleteEvent()}
            >
              {deletingKey ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" />
                  Delete event
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

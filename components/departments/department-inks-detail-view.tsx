"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Droplets, Layers3 } from "lucide-react";
import {
  DepartmentEmptyState,
  PrepDueDateField,
  PrepScheduleLabels,
  departmentStatusPill,
} from "@/components/departments/department-shared";
import { DepartmentsShell } from "@/components/departments/departments-shell";
import { CustomerBrandMark } from "@/components/customers/customer-brand-mark";
import { InkPrepLocationCard } from "@/components/orders/ink-prep-location-card";
import { useSchedule } from "@/components/providers/schedule-provider";
import {
  collectInkQueue,
  computePrepScheduleHint,
  type InkQueueEntry,
} from "@/lib/department-queues";
import { departmentHref, departmentInksHref } from "@/lib/departments";
import {
  inkColorsForPrep,
  inkPrepLineFromColorToggle,
  inkPrepLineMarkAll,
} from "@/lib/ink-prep";
import {
  dashboardControlClass,
  dashboardGhostButtonClass,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { formatDate } from "@/lib/format";
import { formatOrderDisplayLine } from "@/lib/order-display";
import {
  getInkPrepLines,
  mergeOrderMaterials,
} from "@/lib/order-materials";
import { getOrderProductionSteps } from "@/lib/order-production";
import { productionRunMemberLabel } from "@/lib/order-production-run";
import type { ImprintInkColor, Order } from "@/types";
import { cn } from "@/lib/utils";

type RunLocationTab = {
  key: string;
  order: Order;
  entry: InkQueueEntry;
  isCurrent: boolean;
};

export function DepartmentInksDetailView({ orderId }: { orderId: string }) {
  const searchParams = useSearchParams();
  const jobIdParam = searchParams.get("job");
  const imprintIdParam = searchParams.get("imprint");
  const {
    orders,
    scheduleBlocks,
    getCustomerById,
    updateOrderMaterials,
    updateImprintInkColors,
  } = useSchedule();
  const [saving, setSaving] = useState(false);

  const order = useMemo(
    () => orders.find((item) => item.id === orderId),
    [orderId, orders]
  );

  const allInkEntries = useMemo(
    () => collectInkQueue(orders, scheduleBlocks, { includeCompleted: true }),
    [orders, scheduleBlocks]
  );

  const queueEntries = useMemo(
    () => allInkEntries.filter((entry) => entry.order.id === orderId),
    [allInkEntries, orderId]
  );

  const selectedEntry = useMemo(() => {
    if (!order) return null;
    if (jobIdParam && imprintIdParam) {
      const matched = queueEntries.find(
        (entry) =>
          entry.line.jobId === jobIdParam &&
          entry.line.imprintId === imprintIdParam
      );
      if (matched) return matched;
    }
    return queueEntries[0] ?? null;
  }, [imprintIdParam, jobIdParam, order, queueEntries]);

  const resolved = useMemo(() => {
    if (!order) return null;

    const jobId = selectedEntry?.line.jobId ?? jobIdParam ?? undefined;
    const imprintId =
      selectedEntry?.line.imprintId ?? imprintIdParam ?? undefined;
    if (!jobId || !imprintId) return null;

    const step = getOrderProductionSteps(order).find(
      (entry) => entry.job.id === jobId && entry.imprint.id === imprintId
    );
    if (!step) return null;

    const materials = mergeOrderMaterials(order);
    const line =
      selectedEntry?.line ??
      getInkPrepLines(materials).find(
        (item) => item.jobId === jobId && item.imprintId === imprintId
      );
    if (!line) return null;

    const inkColors = inkColorsForPrep(step.imprint);
    const artworkReady = step.imprint.artwork.status === "approved";
    const colorsReady = inkColors.length > 0;
    const scheduleHint =
      selectedEntry?.scheduleHint ??
      computePrepScheduleHint(scheduleBlocks, order.id, {
        jobId,
        imprintId,
      });

    return {
      job: step.job,
      imprint: step.imprint,
      line,
      materials,
      inkColors,
      scheduleHint,
      readyForPrep: artworkReady && colorsReady,
      readinessReason: !artworkReady
        ? "Artwork must be approved before mixing ink."
        : !colorsReady
          ? "Add ink colors to this screen-print location before prep."
          : undefined,
    };
  }, [
    imprintIdParam,
    jobIdParam,
    order,
    scheduleBlocks,
    selectedEntry,
  ]);

  const runLocationTabs = useMemo((): RunLocationTab[] => {
    if (!order?.productionRun || order.productionRun.members.length < 2) {
      return [];
    }

    const memberOrderIds = new Set(
      order.productionRun.members.map((member) => member.orderId)
    );

    return allInkEntries
      .filter((entry) => memberOrderIds.has(entry.order.id))
      .map((entry) => ({
        key: `${entry.order.id}:${entry.line.jobId}:${entry.line.imprintId}`,
        order: entry.order,
        entry,
        isCurrent:
          entry.order.id === orderId &&
          entry.line.jobId === resolved?.job.id &&
          entry.line.imprintId === resolved?.imprint.id,
      }));
  }, [allInkEntries, order, orderId, resolved?.imprint.id, resolved?.job.id]);

  const customer = order ? getCustomerById(order.customerId) : undefined;
  const done = resolved?.line.status === "received";
  const siblingEntries =
    runLocationTabs.length > 0
      ? []
      : queueEntries.filter((entry) => entry.line.id !== resolved?.line.id);

  const saveInkLine = async (
    updater: (
      line: NonNullable<typeof resolved>["line"],
      imprint: NonNullable<typeof resolved>["imprint"]
    ) => NonNullable<typeof resolved>["line"]
  ) => {
    if (!order || !resolved) return;
    setSaving(true);
    try {
      const materials = mergeOrderMaterials(order);
      const lines = materials.lines.map((line) => {
        if (line.id !== resolved.line.id) return line;
        return updater(line, resolved.imprint);
      });
      await updateOrderMaterials(order.id, { ...materials, lines });
    } finally {
      setSaving(false);
    }
  };

  const persistInkColors = async (inkColors: ImprintInkColor[]) => {
    if (!order || !resolved) return;
    await updateImprintInkColors(
      order.id,
      resolved.job.id,
      resolved.imprint.id,
      inkColors
    );
  };

  if (!order || !resolved) {
    return (
      <DepartmentsShell
        activeSlug="inks"
        title="Ink prep"
        description="Open a queue item to mix Pantone colors and mark ink ready."
      >
        <DepartmentEmptyState
          icon={Droplets}
          title="Ink job not found"
          description="This location is no longer in the ink prep queue, or the order could not be loaded."
        />
        <div className="mt-4 flex justify-center">
          <Link
            href={departmentHref("inks")}
            className={cn(dashboardControlClass, "h-8 px-3 text-xs font-semibold")}
          >
            <ArrowLeft className="size-3.5" />
            Back to Inks queue
          </Link>
        </div>
      </DepartmentsShell>
    );
  }

  const activeMember = order.productionRun?.members.find(
    (member) => member.orderId === order.id
  );

  return (
    <DepartmentsShell
      activeSlug="inks"
      title="Ink prep"
      description="Review Pantone colors, adjust ink specs, and mark this location ready — without leaving Departments."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href={departmentHref("inks")}
            className={cn(
              dashboardGhostButtonClass,
              "h-8 gap-1.5 px-3 text-xs font-semibold"
            )}
          >
            <ArrowLeft className="size-3.5" />
            Inks queue
          </Link>
          {departmentStatusPill(
            done
              ? "Completed"
              : !resolved.readyForPrep
                ? "Not Ready"
                : "Ready to prep",
            done ? "success" : !resolved.readyForPrep ? "warning" : "progress"
          )}
        </div>

        {runLocationTabs.length > 1 ? (
          <div
            className="rounded-xl bg-white p-1"
            style={{ boxShadow: "inset 0 0 0 1.5px #2c6ecb" }}
          >
            <div className="rounded-[10px] bg-[#f4f7fd] px-3.5 py-3">
              <div className="flex items-start gap-2">
                <Layers3 className="mt-0.5 size-4 shrink-0 text-[#2c6ecb]" />
                <div className="min-w-0 flex-1 space-y-2.5">
                  <div>
                    <p className="text-[13px] font-semibold text-[#315f9e]">
                      Multi-job run · switch locations
                    </p>
                    <p className="text-[11px] text-[#5f7aa3]">
                      Colors can differ per job — select a location to mix and
                      mark it prepped.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {runLocationTabs.map((tab) => {
                      const member = tab.order.productionRun?.members.find(
                        (entry) => entry.orderId === tab.order.id
                      );
                      const prepped =
                        tab.entry.line.status === "received";
                      return (
                        <Link
                          key={tab.key}
                          href={departmentInksHref(
                            tab.order.id,
                            tab.entry.line.jobId,
                            tab.entry.line.imprintId
                          )}
                          className={cn(
                            "min-w-0 max-w-full rounded-lg border px-3 py-2 text-left transition-colors",
                            tab.isCurrent
                              ? "border-[#2c6ecb] bg-white shadow-sm"
                              : "border-[#c4d7f2] bg-white/70 hover:border-[#2c6ecb]/50 hover:bg-white"
                          )}
                        >
                          <p
                            className={cn(
                              "truncate text-[12px] font-semibold",
                              tab.isCurrent
                                ? "text-[#2c6ecb]"
                                : "text-[#303030]"
                            )}
                          >
                            {tab.entry.imprintLabel}
                          </p>
                          <p className="truncate text-[11px] text-[#616161]">
                            {member
                              ? productionRunMemberLabel(member)
                              : formatOrderDisplayLine(tab.order)}
                          </p>
                          <p
                            className={cn(
                              "mt-0.5 text-[10px] font-semibold",
                              prepped ? "text-[#0d5c2e]" : "text-[#8a8a8a]"
                            )}
                          >
                            {prepped
                              ? "Inks ready"
                              : `${tab.entry.progress.prepped}/${tab.entry.progress.total} colors`}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            dashboardInsetSurfaceClass,
            "flex flex-col gap-4 p-4 sm:flex-row sm:items-start"
          )}
        >
          <CustomerBrandMark
            company={customer?.company ?? order.company}
            logoUrl={customer?.logoUrl}
            accentColorKey={customer?.accentColorKey}
            customerId={order.customerId}
            fallbackKey={order.id}
            size="md"
            className="shrink-0"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className={dashboardTaskTitleClass}>
                {resolved.imprint.label}
              </p>
              <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                {formatOrderDisplayLine(order)} · {resolved.job.name}
              </p>
              {runLocationTabs.length > 1 ? (
                <p className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-[#b8cceb] bg-[#f4f7fd] px-1.5 py-0.5 text-[10px] font-semibold text-[#315f9e]">
                  <Layers3 className="size-2.5" />
                  {activeMember
                    ? productionRunMemberLabel(activeMember)
                    : `Run ${order.productionRun?.members.length ?? 0}`}
                </p>
              ) : null}
              <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                {customer?.company ?? order.company}
                {order.customerName ? ` · ${order.customerName}` : ""}
              </p>
            </div>
            <PrepScheduleLabels
              scheduleHint={resolved.scheduleHint}
              prepDueAt={resolved.line.prepDueAt}
              complete={Boolean(done)}
            />
            <p className="text-[12px] text-[#616161]">
              In hands {formatDate(order.inHandsDate)}
            </p>
            {resolved.readinessReason ? (
              <p className="rounded-lg border border-[#ebebeb] bg-[#f6f6f7] px-3 py-2 text-[12px] text-[#616161]">
                <span className="font-semibold text-[#303030]">Not Ready:</span>{" "}
                {resolved.readinessReason}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <PrepDueDateField
              value={resolved.line.prepDueAt}
              disabled={saving}
              onChange={(value) => {
                void saveInkLine((line) => ({ ...line, prepDueAt: value }));
              }}
            />
          </div>
        </div>

        {siblingEntries.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <span className="text-[12px] font-medium text-[#616161]">
              Other locations on this order:
            </span>
            {siblingEntries.map((entry) => (
              <Link
                key={entry.line.id}
                href={departmentInksHref(
                  order.id,
                  entry.line.jobId,
                  entry.line.imprintId
                )}
                className={cn(
                  dashboardControlClass,
                  "h-8 px-3 text-xs font-semibold"
                )}
              >
                {entry.imprintLabel}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="space-y-2">
          <div>
            <h3 className="text-[13px] font-semibold text-[#303030]">
              Pantone colors
              {runLocationTabs.length > 1 ? (
                <span className="ml-1.5 font-normal text-[#8a8a8a]">
                  for {resolved.imprint.label}
                </span>
              ) : null}
            </h3>
            <p className={dashboardTaskDetailClass}>
              Check off each color as it is mixed, or edit PMS, mesh, and
              squeegee here. Changes sync back to the order and proofs.
            </p>
          </div>
          <InkPrepLocationCard
            key={`${order.id}:${resolved.job.id}:${resolved.imprint.id}`}
            line={resolved.line}
            job={resolved.job}
            imprint={resolved.imprint}
            saving={saving}
            defaultExpanded
            onToggleColorPrep={(colorId, prepped) =>
              saveInkLine((line, imprint) =>
                inkPrepLineFromColorToggle(line, imprint, colorId, prepped)
              )
            }
            onMarkAllPrep={(prepped) =>
              saveInkLine((line, imprint) =>
                inkPrepLineMarkAll(line, imprint, prepped)
              )
            }
            onPersistInkColors={persistInkColors}
          />
        </div>
      </div>
    </DepartmentsShell>
  );
}

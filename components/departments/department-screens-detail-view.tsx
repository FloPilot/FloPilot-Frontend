"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  Layers,
  Layers3,
} from "lucide-react";
import {
  DepartmentEmptyState,
  DepartmentMarkDoneButton,
  PrepDueDateField,
  PrepScheduleLabels,
  ProductionFilesNotice,
  departmentStatusPill,
} from "@/components/departments/department-shared";
import { DepartmentsShell } from "@/components/departments/departments-shell";
import { CustomerBrandMark } from "@/components/customers/customer-brand-mark";
import { useSchedule } from "@/components/providers/schedule-provider";
import {
  collectScreenQueue,
  computePrepScheduleHint,
  type ScreenQueueEntry,
} from "@/lib/department-queues";
import { departmentHref, departmentScreensHref } from "@/lib/departments";
import {
  dashboardControlClass,
  dashboardGhostButtonClass,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatOrderDisplayLine } from "@/lib/order-display";
import {
  getScreenSetupLine,
  mergeOrderMaterials,
  withScreenSetupBurnStatus,
} from "@/lib/order-materials";
import { getOrderProductionSteps } from "@/lib/order-production";
import {
  productionRunMemberLabel,
  productionRunMemberOrderIds,
} from "@/lib/order-production-run";
import { getOrderScreenFiles } from "@/lib/order-receiving-checkpoints";
import type { Order, OrderFile } from "@/types";
import { cn } from "@/lib/utils";

type RunScreenTab = {
  key: string;
  entry: ScreenQueueEntry;
  isCurrent: boolean;
};

export function DepartmentScreensDetailView({ orderId }: { orderId: string }) {
  const {
    orders,
    scheduleBlocks,
    getCustomerById,
    updateOrderMaterials,
  } = useSchedule();
  const [saving, setSaving] = useState(false);
  const [previewFile, setPreviewFile] = useState<OrderFile | null>(null);

  const allScreenEntries = useMemo(
    () =>
      collectScreenQueue(orders, scheduleBlocks, { includeCompleted: true }),
    [orders, scheduleBlocks]
  );

  const order = useMemo(
    () => orders.find((item) => item.id === orderId),
    [orderId, orders]
  );
  const queueEntry = useMemo(
    () => allScreenEntries.find((item) => item.order.id === orderId),
    [allScreenEntries, orderId]
  );

  const customer = order ? getCustomerById(order.customerId) : undefined;
  const screenFiles = order ? getOrderScreenFiles(order) : [];
  const materials = order ? mergeOrderMaterials(order) : null;
  const screenLine =
    queueEntry?.screenLine ??
    (materials ? getScreenSetupLine(materials) : null);
  const done = screenLine?.status === "received";
  const waitingOnFiles = screenFiles.length === 0;
  const scheduleHint =
    queueEntry?.scheduleHint ??
    (order
      ? (() => {
          const screenPrintKeys = new Set(
            getOrderProductionSteps(order)
              .filter(
                ({ job, imprint }) =>
                  job.kind !== "finishing" &&
                  imprint.decoration === "screen_print"
              )
              .map(({ job, imprint }) => `${job.id}:${imprint.id}`)
          );
          const relevantBlocks = scheduleBlocks.filter(
            (block) =>
              block.orderId === order.id &&
              block.jobId &&
              block.imprintId &&
              screenPrintKeys.has(`${block.jobId}:${block.imprintId}`)
          );
          return computePrepScheduleHint(relevantBlocks, order.id);
        })()
      : null);
  const prepDueAt = queueEntry?.prepDueAt ?? screenLine?.prepDueAt;
  const screenPrintCount =
    queueEntry?.screenPrintCount ??
    order?.jobs.reduce(
      (sum, job) =>
        sum +
        job.imprints.filter((imprint) => imprint.decoration === "screen_print")
          .length,
      0
    ) ??
    0;

  const runScreenTabs = useMemo((): RunScreenTab[] => {
    if (!order?.productionRun || order.productionRun.members.length < 2) {
      return [];
    }
    const memberIds = new Set(
      order.productionRun.members.map((member) => member.orderId)
    );
    return allScreenEntries
      .filter((entry) => memberIds.has(entry.order.id))
      .map((entry) => ({
        key: entry.order.id,
        entry,
        isCurrent: entry.order.id === orderId,
      }));
  }, [allScreenEntries, order, orderId]);

  const setScreenBurnForRun = async (sourceOrder: Order, burned: boolean) => {
    const memberIds = productionRunMemberOrderIds(sourceOrder);
    setSaving(true);
    try {
      await Promise.all(
        memberIds.map(async (memberId) => {
          const memberOrder =
            orders.find((entry) => entry.id === memberId) ??
            (memberId === sourceOrder.id ? sourceOrder : null);
          if (!memberOrder) return;
          const nextMaterials = mergeOrderMaterials(memberOrder);
          await updateOrderMaterials(
            memberOrder.id,
            withScreenSetupBurnStatus(nextMaterials, burned)
          );
        })
      );
    } finally {
      setSaving(false);
    }
  };

  const saveScreenPrepDue = async (value: string) => {
    if (!order || !materials || !screenLine) return;
    setSaving(true);
    try {
      await updateOrderMaterials(order.id, {
        ...materials,
        lines: materials.lines.map((line) =>
          line.id === screenLine.id ? { ...line, prepDueAt: value } : line
        ),
      });
    } finally {
      setSaving(false);
    }
  };

  if (!order || !screenLine) {
    return (
      <DepartmentsShell
        activeSlug="screens"
        title="Screen burn"
        description="Open a queue item to download production files and mark screens burned."
      >
        <DepartmentEmptyState
          icon={Layers}
          title="Screen job not found"
          description="This order is no longer in the screen burn queue, or the screens are already marked ready."
        />
        <div className="mt-4 flex justify-center">
          <Link
            href={departmentHref("screens")}
            className={cn(dashboardControlClass, "h-8 px-3 text-xs font-semibold")}
          >
            <ArrowLeft className="size-3.5" />
            Back to Screens queue
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
      activeSlug="screens"
      title="Screen burn"
      description="Download the attached screen files, burn the screens, then mark this job complete — without leaving Departments."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href={departmentHref("screens")}
            className={cn(
              dashboardGhostButtonClass,
              "h-8 gap-1.5 px-3 text-xs font-semibold"
            )}
          >
            <ArrowLeft className="size-3.5" />
            Screens queue
          </Link>
          {departmentStatusPill(
            waitingOnFiles
              ? "Not Ready"
              : done
                ? "Screens burned"
                : "Ready to burn",
            waitingOnFiles ? "warning" : done ? "success" : "progress"
          )}
        </div>

        {runScreenTabs.length > 1 ? (
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
                      Multi-job run · shared screens
                    </p>
                    <p className="text-[11px] text-[#5f7aa3]">
                      These jobs print together on the same screens. Marking
                      one burned marks every job in the run.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {runScreenTabs.map((tab) => {
                      const member = tab.entry.order.productionRun?.members.find(
                        (entry) => entry.orderId === tab.entry.order.id
                      );
                      const tabDone =
                        tab.entry.screenLine.status === "received";
                      return (
                        <Link
                          key={tab.key}
                          href={departmentScreensHref(tab.entry.order.id)}
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
                            {member
                              ? productionRunMemberLabel(member)
                              : formatOrderDisplayLine(tab.entry.order)}
                          </p>
                          <p className="truncate text-[11px] text-[#616161]">
                            {tab.entry.screenPrintCount} location
                            {tab.entry.screenPrintCount === 1 ? "" : "s"}
                            {tab.entry.hasProductionFiles
                              ? ` · ${tab.entry.productionFileCount} file${
                                  tab.entry.productionFileCount === 1
                                    ? ""
                                    : "s"
                                }`
                              : " · waiting on files"}
                          </p>
                          <p
                            className={cn(
                              "mt-0.5 text-[10px] font-semibold",
                              tabDone ? "text-[#0d5c2e]" : "text-[#8a8a8a]"
                            )}
                          >
                            {tabDone ? "Screens burned" : "Pending burn"}
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
                {formatOrderDisplayLine(order)}
              </p>
              <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
                {customer?.company ?? order.company}
                {order.customerName ? ` · ${order.customerName}` : ""}
                {screenPrintCount > 0
                  ? ` · ${screenPrintCount} screen-print location${
                      screenPrintCount === 1 ? "" : "s"
                    }`
                  : ""}
              </p>
              {runScreenTabs.length > 1 ? (
                <p className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-[#b8cceb] bg-[#f4f7fd] px-1.5 py-0.5 text-[10px] font-semibold text-[#315f9e]">
                  <Layers3 className="size-2.5" />
                  {activeMember
                    ? productionRunMemberLabel(activeMember)
                    : `Run ${order.productionRun?.members.length ?? 0}`}
                </p>
              ) : null}
            </div>
            <PrepScheduleLabels
              scheduleHint={scheduleHint}
              prepDueAt={prepDueAt}
              complete={done}
            />
            <p className="text-[12px] text-[#616161]">
              In hands {formatDate(order.inHandsDate)}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <PrepDueDateField
              value={prepDueAt}
              disabled={saving}
              onChange={(value) => {
                void saveScreenPrepDue(value);
              }}
            />
            <DepartmentMarkDoneButton
              done={Boolean(done)}
              saving={saving}
              disabled={waitingOnFiles && !done}
              doneLabel="Mark screens burned"
              undoLabel="Mark not burned"
              onClick={() => {
                void setScreenBurnForRun(order, !done);
              }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <h3 className="text-[13px] font-semibold text-[#303030]">
              Screen files
            </h3>
            <p className={dashboardTaskDetailClass}>
              {runScreenTabs.length > 1
                ? "Download burn-ready films for this order. When screens are burned, every job in the run is marked ready together."
                : "Download the burn-ready films for this order, then mark the screens burned when the work is done."}
            </p>
          </div>

          <ProductionFilesNotice
            ready={!waitingOnFiles}
            fileCount={screenFiles.length}
          />

          {waitingOnFiles ? (
            <div
              className={cn(
                dashboardInsetSurfaceClass,
                "flex flex-col items-center justify-center gap-1 px-4 py-10 text-center"
              )}
            >
              <FileText className="size-5 text-[#8a8a8a]" />
              <p className="text-[13px] font-medium text-[#303030]">
                No screen files uploaded yet
              </p>
              <p className="max-w-sm text-[12px] text-[#8a8a8a]">
                Separations need to be uploaded on the order before this team
                can burn screens.
              </p>
            </div>
          ) : (
            <div
              className={cn(
                dashboardInsetSurfaceClass,
                "divide-y divide-[#ebebeb]"
              )}
            >
              {screenFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f1f5fc] text-[#2c6ecb]">
                    <FileText className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[#303030]">
                      {file.name}
                    </p>
                    <p className="text-[12px] text-[#8a8a8a]">
                      {file.uploadedBy} · {formatDateTime(file.uploadedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {file.previewUrl ? (
                      <button
                        type="button"
                        onClick={() => setPreviewFile(file)}
                        className={cn(
                          dashboardControlClass,
                          "inline-flex h-8 items-center gap-1.5 px-2.5 text-[12px] font-medium"
                        )}
                      >
                        <Eye className="size-3.5" />
                        Preview
                      </button>
                    ) : null}
                    {file.downloadUrl || file.previewUrl ? (
                      <a
                        href={file.downloadUrl || file.previewUrl}
                        download={file.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          dashboardControlClass,
                          "inline-flex h-8 items-center gap-1.5 border-[#2c6ecb] bg-[#f0f5ff] px-2.5 text-[12px] font-semibold text-[#2c6ecb]"
                        )}
                      >
                        <Download className="size-3.5" />
                        Download
                      </a>
                    ) : (
                      <span className="text-[11px] text-[#8a8a8a]">
                        Filename only
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {previewFile?.previewUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${previewFile.name}`}
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#ebebeb] px-4 py-3">
              <p className="truncate text-[13px] font-semibold text-[#303030]">
                {previewFile.name}
              </p>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className={cn(
                  dashboardGhostButtonClass,
                  "h-8 px-3 text-xs font-semibold"
                )}
              >
                Close
              </button>
            </div>
            <div className="bg-[#f6f6f7] p-4">
              {/* Preview URLs are remote storage objects; next/image domains vary by shop. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewFile.previewUrl}
                alt={previewFile.name}
                className="mx-auto max-h-[70vh] max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </DepartmentsShell>
  );
}

import {
  getGarmentReceivingLines,
  getSubcontractReturnLines,
  mergeOrderMaterials,
} from "@/lib/order-materials";
import {
  listOrderSubcontractEvents,
  resolveSubcontractDetails,
} from "@/lib/order-subcontract";
import type { MaterialReceiveStatus, Order } from "@/types";

export type ReceivingRollupStatus = "pending" | "partial" | "received" | "empty";

export type ReceivingLaneSummary = {
  key: "blanks" | "subcontract";
  label: string;
  status: ReceivingRollupStatus;
  done: number;
  total: number;
  detail: string;
};

export type ReceivingOverview = {
  status: ReceivingRollupStatus;
  title: string;
  detail: string;
  lanes: ReceivingLaneSummary[];
};

function rollupFromCounts(done: number, total: number): ReceivingRollupStatus {
  if (total <= 0) return "empty";
  if (done >= total) return "received";
  if (done > 0) return "partial";
  return "pending";
}

function rollupFromStatuses(
  statuses: MaterialReceiveStatus[]
): ReceivingRollupStatus {
  if (statuses.length === 0) return "empty";
  if (statuses.every((status) => status === "received")) return "received";
  if (statuses.some((status) => status === "received" || status === "partial")) {
    return "partial";
  }
  return "pending";
}

function mergeRollups(
  statuses: ReceivingRollupStatus[]
): ReceivingRollupStatus {
  const active = statuses.filter((status) => status !== "empty");
  if (active.length === 0) return "empty";
  if (active.every((status) => status === "received")) return "received";
  if (active.some((status) => status === "partial" || status === "received")) {
    return "partial";
  }
  return "pending";
}

export function computeReceivingOverview(order: Order): ReceivingOverview {
  const materials = mergeOrderMaterials(order);
  const garmentLines = getGarmentReceivingLines(materials);
  const blanksDone = garmentLines.filter(
    (line) => line.status === "received"
  ).length;
  const blanksStatus = rollupFromStatuses(garmentLines.map((line) => line.status));

  const subcontractEvents = listOrderSubcontractEvents(order);
  const returnLines = getSubcontractReturnLines(materials);
  let subcontractDone = 0;
  let subcontractTotal = 0;
  const subcontractStatuses: MaterialReceiveStatus[] = [];

  for (const { job, imprint } of subcontractEvents) {
    subcontractTotal += 1;
    const details = resolveSubcontractDetails(order, job, imprint);
    const line = returnLines.find(
      (entry) => entry.jobId === job.id && entry.imprintId === imprint.id
    );
    const expected = Math.max(
      0,
      line?.expectedQty ?? details.expectedQty ?? details.sentQty ?? 0
    );
    const returned = Math.max(
      0,
      line?.receivedQty ?? details.returnedQty ?? 0
    );
    const status: MaterialReceiveStatus =
      expected > 0 && returned >= expected
        ? "received"
        : returned > 0
          ? "partial"
          : "waiting";
    subcontractStatuses.push(status);
    if (status === "received") subcontractDone += 1;
  }

  const subcontractStatus = rollupFromStatuses(subcontractStatuses);

  const lanes: ReceivingLaneSummary[] = [];
  if (garmentLines.length > 0) {
    lanes.push({
      key: "blanks",
      label: "Blank garments",
      status: blanksStatus,
      done: blanksDone,
      total: garmentLines.length,
      detail: `${blanksDone}/${garmentLines.length} sizes in`,
    });
  }
  if (subcontractTotal > 0) {
    lanes.push({
      key: "subcontract",
      label: "Subcontract returns",
      status: subcontractStatus,
      done: subcontractDone,
      total: subcontractTotal,
      detail: `${subcontractDone}/${subcontractTotal} services returned`,
    });
  }

  const status = mergeRollups(lanes.map((lane) => lane.status));
  const title =
    status === "received"
      ? "All receiving complete"
      : status === "partial"
        ? "Receiving in progress"
        : status === "pending"
          ? "Waiting on goods"
          : "Nothing to receive yet";

  const detail =
    lanes.length === 0
      ? "Add blanks or a subcontract event to track inbound goods here."
      : lanes.map((lane) => lane.detail).join(" · ");

  return { status, title, detail, lanes };
}

export function receivingStatusLabel(status: ReceivingRollupStatus): string {
  switch (status) {
    case "received":
      return "Received";
    case "partial":
      return "Partial";
    case "pending":
      return "Pending";
    default:
      return "—";
  }
}

export function receivingStatusTone(status: ReceivingRollupStatus): {
  bar: string;
  badge: string;
  icon: string;
} {
  switch (status) {
    case "received":
      return {
        bar: "border-[#86d4a8] bg-[#e8f5ee]",
        badge: "border-[#86d4a8] bg-white text-[#067647]",
        icon: "text-[#067647]",
      };
    case "partial":
      return {
        bar: "border-[#f5d0a8] bg-[#fff8eb]",
        badge: "border-[#f5d0a8] bg-white text-[#8a6116]",
        icon: "text-[#8a6116]",
      };
    case "pending":
      return {
        bar: "border-[#c9d7ef] bg-[#f4f7fd]",
        badge: "border-[#c9d7ef] bg-white text-[#2c6ecb]",
        icon: "text-[#2c6ecb]",
      };
    default:
      return {
        bar: "border-[#e3e3e3] bg-[#fafafa]",
        badge: "border-[#e3e3e3] bg-white text-[#616161]",
        icon: "text-[#8a8a8a]",
      };
  }
}

/** Re-export helper used by rollup math in tests / callers */
export { rollupFromCounts };

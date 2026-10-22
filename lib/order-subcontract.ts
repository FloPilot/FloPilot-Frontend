import type {
  Job,
  JobImprint,
  Order,
  SubcontractDetails,
  SubcontractStatus,
} from "@/types";
import {
  getGarmentReceivingLines,
  mergeOrderMaterials,
} from "@/lib/order-materials";
import { jobAssignedPieceCount } from "@/lib/job-line-items";

export const SUBCONTRACT_STATUS_LABELS: Record<SubcontractStatus, string> = {
  planned: "Planned",
  awaiting_blanks: "Awaiting blanks",
  ready_to_send: "Ready to send",
  at_vendor: "At vendor",
  partial_return: "Partial return",
  returned: "Returned",
  complete: "Complete",
};

export function isSubcontractDecoration(
  decoration: string | null | undefined
): boolean {
  return String(decoration || "").trim().toLowerCase() === "subcontract";
}

export function isSubcontractJob(job: Pick<Job, "kind"> | null | undefined): boolean {
  return job?.kind === "subcontract";
}

export function isSubcontractEvent(
  job: Pick<Job, "kind"> | null | undefined,
  imprint: Pick<JobImprint, "decoration"> | null | undefined
): boolean {
  return (
    isSubcontractJob(job) || isSubcontractDecoration(imprint?.decoration)
  );
}

export function normalizeSubcontract(
  raw: unknown
): SubcontractDetails | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const input = raw as Record<string, unknown>;
  const vendorName =
    typeof input.vendorName === "string" ? input.vendorName.trim().slice(0, 120) : "";
  const poNumber =
    typeof input.poNumber === "string" ? input.poNumber.trim().slice(0, 80) : "";
  const workDescription =
    typeof input.workDescription === "string"
      ? input.workDescription.trim().slice(0, 200)
      : "";
  const notes =
    typeof input.notes === "string" ? input.notes.trim().slice(0, 2000) : "";

  const toQty = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(0, Math.round(value));
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return Math.max(0, Math.round(parsed));
    }
    return undefined;
  };

  const toDate = (value: unknown) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 40) : null;
  };

  const statusRaw =
    typeof input.status === "string" ? input.status.trim() : "";
  const status = (
    [
      "planned",
      "awaiting_blanks",
      "ready_to_send",
      "at_vendor",
      "partial_return",
      "returned",
      "complete",
    ] as const
  ).includes(statusRaw as SubcontractStatus)
    ? (statusRaw as SubcontractStatus)
    : undefined;

  const next: SubcontractDetails = {
    ...(vendorName ? { vendorName } : {}),
    ...(poNumber ? { poNumber } : {}),
    ...(workDescription ? { workDescription } : {}),
    ...(notes ? { notes } : {}),
    ...(toQty(input.expectedQty) !== undefined
      ? { expectedQty: toQty(input.expectedQty) }
      : {}),
    ...(toQty(input.sentQty) !== undefined
      ? { sentQty: toQty(input.sentQty) }
      : {}),
    ...(toQty(input.returnedQty) !== undefined
      ? { returnedQty: toQty(input.returnedQty) }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(input, "sentAt")
      ? { sentAt: toDate(input.sentAt) }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(input, "expectedReturnAt")
      ? { expectedReturnAt: toDate(input.expectedReturnAt) }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(input, "returnedAt")
      ? { returnedAt: toDate(input.returnedAt) }
      : {}),
    ...(status ? { status } : {}),
  };

  return Object.keys(next).length > 0 ? next : {};
}

export function blanksReadyForSubcontract(order: Order): boolean {
  const lines = getGarmentReceivingLines(mergeOrderMaterials(order));
  if (lines.length === 0) return false;
  return lines.every((line) => line.status === "received");
}

export function defaultSubcontractExpectedQty(
  order: Order,
  job: Job
): number {
  const assigned = jobAssignedPieceCount(order, job);
  if (assigned > 0) return assigned;
  return order.lineItems.reduce(
    (sum, item) =>
      sum +
      (item.sizes ?? []).reduce((sizeSum, size) => sizeSum + size.quantity, 0),
    0
  );
}

export function resolveSubcontractDetails(
  order: Order,
  job: Job,
  imprint: JobImprint,
  draft?: SubcontractDetails | null
): SubcontractDetails {
  const base = normalizeSubcontract(imprint.subcontract) || {};
  const overlay = draft ? normalizeSubcontract(draft) || {} : {};
  const merged: SubcontractDetails = { ...base, ...overlay };
  if (merged.expectedQty == null || merged.expectedQty <= 0) {
    merged.expectedQty = defaultSubcontractExpectedQty(order, job);
  }
  merged.status = deriveSubcontractStatus(order, merged);
  return merged;
}

export function deriveSubcontractStatus(
  order: Order,
  details: SubcontractDetails
): SubcontractStatus {
  const expected = Math.max(0, details.expectedQty || 0);
  const sent = Math.max(0, details.sentQty || 0);
  const returned = Math.max(0, details.returnedQty || 0);

  if (details.status === "complete") return "complete";
  if (expected > 0 && returned >= expected) return "returned";
  if (returned > 0) return "partial_return";
  if (sent > 0) return "at_vendor";
  if (blanksReadyForSubcontract(order)) return "ready_to_send";
  if (getGarmentReceivingLines(mergeOrderMaterials(order)).length > 0) {
    return "awaiting_blanks";
  }
  return "planned";
}

export function subcontractDetailsEqual(
  a: SubcontractDetails | null | undefined,
  b: SubcontractDetails | null | undefined
): boolean {
  const left = normalizeSubcontract(a) || {};
  const right = normalizeSubcontract(b) || {};
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    const lv = (left as Record<string, unknown>)[key] ?? "";
    const rv = (right as Record<string, unknown>)[key] ?? "";
    if (String(lv ?? "") !== String(rv ?? "")) return false;
  }
  return true;
}

export function listOrderSubcontractEvents(order: Order): Array<{
  job: Job;
  imprint: JobImprint;
}> {
  const rows: Array<{ job: Job; imprint: JobImprint }> = [];
  for (const job of order.jobs || []) {
    for (const imprint of job.imprints || []) {
      if (isSubcontractEvent(job, imprint)) {
        rows.push({ job, imprint });
      }
    }
  }
  return rows;
}

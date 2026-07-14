import type { ArtworkFile, DecorationType, Order } from "@/types";
import { buildOrderFileList } from "@/lib/order-files";
import { isArchivedOrder } from "@/lib/order-archive";

export type ArtworkQueueEntry = {
  orderId: string;
  orderNumber: string;
  orderCustomLabel?: string;
  customerId: string;
  customerName: string;
  company: string;
  inHandsDate: string;
  jobId: string;
  jobName: string;
  imprintId: string;
  imprintLabel: string;
  decoration: DecorationType;
  artwork: ArtworkFile;
  archived: boolean;
};

export type ArtworkQueueFilter = "all" | "pending" | "revision_requested" | "approved";

export type ArtworkQueueScope = "active" | "archived" | "all";

export const ARTWORK_QUEUE_FILTERS: {
  value: ArtworkQueueFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "revision_requested", label: "Revision" },
  { value: "approved", label: "Approved" },
];

function isTrackableArtwork(order: Order, jobKind: string | undefined, artworkName: string) {
  if (jobKind === "finishing" && artworkName === "n/a") return false;
  return true;
}

export function collectArtworkQueue(orders: Order[]): ArtworkQueueEntry[] {
  const entries: ArtworkQueueEntry[] = [];

  for (const order of orders) {
    const archived = isArchivedOrder(order);
    for (const job of order.jobs) {
      for (const imprint of job.imprints) {
        if (!isTrackableArtwork(order, job.kind, imprint.artwork.name)) continue;

        entries.push({
          orderId: order.id,
          orderNumber: order.number,
          orderCustomLabel: order.customLabel,
          customerId: order.customerId,
          customerName: order.customerName,
          company: order.company,
          inHandsDate: order.inHandsDate,
          jobId: job.id,
          jobName: job.name,
          imprintId: imprint.id,
          imprintLabel: imprint.label,
          decoration: imprint.decoration,
          artwork: imprint.artwork,
          archived,
        });
      }
    }
  }

  return entries.sort((a, b) => {
    if (a.archived !== b.archived) return a.archived ? 1 : -1;
    const statusRank = (status: ArtworkFile["status"]) => {
      if (status === "revision_requested") return 0;
      if (status === "pending") return 1;
      return 2;
    };
    const rankDiff =
      statusRank(a.artwork.status) - statusRank(b.artwork.status);
    if (rankDiff !== 0) return rankDiff;
    return a.orderNumber.localeCompare(b.orderNumber);
  });
}

export function filterArtworkQueueByScope(
  entries: ArtworkQueueEntry[],
  scope: ArtworkQueueScope
): ArtworkQueueEntry[] {
  if (scope === "all") return entries;
  if (scope === "archived") return entries.filter((entry) => entry.archived);
  return entries.filter((entry) => !entry.archived);
}

export function countArtworkScopes(entries: ArtworkQueueEntry[]) {
  let active = 0;
  let archived = 0;
  for (const entry of entries) {
    if (entry.archived) archived += 1;
    else active += 1;
  }
  return { active, archived, all: entries.length };
}

export function filterArtworkQueue(
  entries: ArtworkQueueEntry[],
  filter: ArtworkQueueFilter
): ArtworkQueueEntry[] {
  if (filter === "all") return entries;
  return entries.filter((entry) => entry.artwork.status === filter);
}

export function searchArtworkQueue(
  entries: ArtworkQueueEntry[],
  query: string
): ArtworkQueueEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;

  return entries.filter((entry) => {
    const haystack = [
      entry.orderNumber,
      entry.customerName,
      entry.company,
      entry.jobName,
      entry.imprintLabel,
      entry.artwork.name,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function countArtworkQueue(entries: ArtworkQueueEntry[]) {
  return {
    all: entries.length,
    pending: entries.filter((entry) => entry.artwork.status === "pending").length,
    revision_requested: entries.filter(
      (entry) => entry.artwork.status === "revision_requested"
    ).length,
    approved: entries.filter((entry) => entry.artwork.status === "approved")
      .length,
  };
}

export function artworkQueueEntryKey(entry: ArtworkQueueEntry): string {
  return `${entry.orderId}:${entry.jobId}:${entry.imprintId}`;
}

const RELATED_ORDER_FILE_KINDS = new Set([
  "mockup",
  "production_art",
  "separation",
  "embroidery_file",
  "customer_supplied",
]);

export function getArtworkEntryContext(
  orders: Order[],
  entry: ArtworkQueueEntry
) {
  const order = orders.find((item) => item.id === entry.orderId);
  const job = order?.jobs.find((item) => item.id === entry.jobId);
  const imprint = job?.imprints.find((item) => item.id === entry.imprintId);
  return { order, job, imprint };
}

export function getRelatedArtworkFiles(
  order: Order | undefined,
  entry: ArtworkQueueEntry
) {
  if (!order) return [];

  const files = buildOrderFileList(order);

  return files.filter((file) => {
    if (file.jobId === entry.jobId && file.imprintId === entry.imprintId) {
      return true;
    }
    if (file.source !== "order") return false;
    if (!RELATED_ORDER_FILE_KINDS.has(file.kind)) return false;
    if (!file.jobId && !file.imprintId) return true;
    return file.jobId === entry.jobId && file.imprintId === entry.imprintId;
  });
}

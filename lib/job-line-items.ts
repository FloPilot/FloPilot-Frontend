import type { Job, JobBlankAssignment, LineItem, Order } from "@/types";
import { formatBrandProductName } from "@/lib/format-product-name";
import { lineItemPieceCount } from "@/lib/line-items";

export function lineItemDisplayLabel(item: LineItem): string {
  const product = formatBrandProductName(item.brand, item.productName);
  return item.color?.trim() ? `${product} · ${item.color}` : product;
}

export type ResolvedBlankAssignment = {
  lineItemId: string;
  /** null = every size on the blank */
  sizes: string[] | null;
};

function sizeKeysOnItem(item: LineItem): string[] {
  return (item.sizes || [])
    .filter((row) => (Number(row.quantity) || 0) > 0 || Boolean(row.size))
    .map((row) => row.size)
    .filter(Boolean);
}

function pieceCountForSizes(item: LineItem, sizes: string[] | null): number {
  if (!sizes) return lineItemPieceCount(item);
  const allow = new Set(sizes);
  return (item.sizes || []).reduce((sum, row) => {
    if (!allow.has(row.size)) return sum;
    return sum + (Number(row.quantity) || 0);
  }, 0);
}

/** Normalize raw assignments against current order blanks. */
export function normalizeBlankAssignments(
  order: Pick<Order, "lineItems">,
  raw: JobBlankAssignment[] | null | undefined
): ResolvedBlankAssignment[] {
  const items = order.lineItems ?? [];
  const byId = new Map(items.map((item) => [item.id, item]));
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const resolved: ResolvedBlankAssignment[] = [];
  for (const entry of raw) {
    const lineItemId =
      typeof entry?.lineItemId === "string" ? entry.lineItemId.trim() : "";
    const item = byId.get(lineItemId);
    if (!item) continue;
    const available = sizeKeysOnItem(item);
    const rawSizes = Array.isArray(entry.sizes)
      ? entry.sizes
          .filter((size) => typeof size === "string" && size.trim())
          .map((size) => size.trim())
      : [];
    const sizes =
      rawSizes.length === 0
        ? null
        : [...new Set(rawSizes.filter((size) => available.includes(size)))];
    if (sizes && sizes.length === 0) continue;
    if (sizes && available.length > 0 && sizes.length >= available.length) {
      resolved.push({ lineItemId, sizes: null });
    } else {
      resolved.push({ lineItemId, sizes });
    }
  }
  return resolved;
}

/**
 * Effective blank/size mapping for a job.
 * Empty lineItemIds + empty blankAssignments = all blanks, all sizes.
 */
export function resolveJobBlankAssignments(
  order: Pick<Order, "lineItems">,
  job: Pick<Job, "lineItemIds" | "blankAssignments">
): ResolvedBlankAssignment[] {
  const items = order.lineItems ?? [];
  if (items.length === 0) return [];

  const fromAssignments = normalizeBlankAssignments(order, job.blankAssignments);
  if (fromAssignments.length > 0) return fromAssignments;

  if (job.lineItemIds?.length) {
    const idSet = new Set(job.lineItemIds);
    return items
      .filter((item) => idSet.has(item.id))
      .map((item) => ({ lineItemId: item.id, sizes: null }));
  }

  return items.map((item) => ({ lineItemId: item.id, sizes: null }));
}

export function jobAppliesToBlank(
  order: Pick<Order, "lineItems">,
  job: Pick<Job, "lineItemIds" | "blankAssignments">,
  lineItemId: string
): boolean {
  return resolveJobBlankAssignments(order, job).some(
    (entry) => entry.lineItemId === lineItemId
  );
}

export function jobAppliesToSize(
  order: Pick<Order, "lineItems">,
  job: Pick<Job, "lineItemIds" | "blankAssignments">,
  lineItemId: string,
  size: string
): boolean {
  const entry = resolveJobBlankAssignments(order, job).find(
    (row) => row.lineItemId === lineItemId
  );
  if (!entry) return false;
  if (!entry.sizes) return true;
  return entry.sizes.includes(size);
}

/** Blanks linked to a decoration event. Empty assignment means all blanks. */
export function resolveJobLineItems(order: Order, job: Job): LineItem[] {
  const all = order.lineItems ?? [];
  const assigned = new Set(
    resolveJobBlankAssignments(order, job).map((entry) => entry.lineItemId)
  );
  return all.filter((item) => assigned.has(item.id));
}

export function jobAssignedPieceCount(order: Order, job: Job): number {
  const itemsById = new Map((order.lineItems ?? []).map((item) => [item.id, item]));
  return resolveJobBlankAssignments(order, job).reduce((sum, entry) => {
    const item = itemsById.get(entry.lineItemId);
    if (!item) return sum;
    return sum + pieceCountForSizes(item, entry.sizes);
  }, 0);
}

export function jobUsesAllBlanks(order: Order, job: Job): boolean {
  const all = order.lineItems ?? [];
  if (all.length === 0) return true;
  const resolved = resolveJobBlankAssignments(order, job);
  if (resolved.length < all.length) return false;
  const byId = new Map(resolved.map((entry) => [entry.lineItemId, entry]));
  return all.every((item) => {
    const entry = byId.get(item.id);
    return Boolean(entry && entry.sizes == null);
  });
}

export function formatJobBlankAssignmentSummary(
  order: Order,
  job: Job
): string {
  const items = resolveJobLineItems(order, job);
  if (items.length === 0) return "No blanks on order";
  const pieces = jobAssignedPieceCount(order, job);
  if (jobUsesAllBlanks(order, job)) {
    return `All blanks · ${pieces} pcs`;
  }
  const resolved = resolveJobBlankAssignments(order, job);
  const partialSizes = resolved.some((entry) => entry.sizes != null);
  if (items.length === 1 && !partialSizes) {
    return `${lineItemDisplayLabel(items[0])} · ${pieces} pcs`;
  }
  if (partialSizes) {
    return `${items.length} blank${items.length === 1 ? "" : "s"} · size split · ${pieces} pcs`;
  }
  return `${items.length} blanks · ${pieces} pcs`;
}

export function formatJobBlankLabels(order: Order, job: Job): string[] {
  return resolveJobLineItems(order, job).map(lineItemDisplayLabel);
}

/** Build persisted fields from resolved assignments (clears when default-all). */
export function toPersistedBlankMapping(
  order: Pick<Order, "lineItems">,
  resolved: ResolvedBlankAssignment[]
): {
  lineItemIds: string[] | undefined;
  blankAssignments: JobBlankAssignment[] | undefined;
} {
  const items = order.lineItems ?? [];
  if (items.length === 0 || resolved.length === 0) {
    return { lineItemIds: undefined, blankAssignments: undefined };
  }

  const isDefaultAll =
    resolved.length === items.length &&
    items.every((item) => {
      const entry = resolved.find((row) => row.lineItemId === item.id);
      return Boolean(entry && entry.sizes == null);
    });

  if (isDefaultAll) {
    return { lineItemIds: undefined, blankAssignments: undefined };
  }

  const blankAssignments: JobBlankAssignment[] = resolved.map((entry) => ({
    lineItemId: entry.lineItemId,
    ...(entry.sizes && entry.sizes.length
      ? { sizes: [...entry.sizes] }
      : {}),
  }));
  const lineItemIds = blankAssignments.map((entry) => entry.lineItemId);

  const hasSizeSplit = blankAssignments.some(
    (entry) => Array.isArray(entry.sizes) && entry.sizes.length > 0
  );

  return {
    lineItemIds,
    blankAssignments: hasSizeSplit ? blankAssignments : undefined,
  };
}

export function withJobBlankMapping(
  job: Job,
  order: Pick<Order, "lineItems">,
  resolved: ResolvedBlankAssignment[]
): Job {
  const persisted = toPersistedBlankMapping(order, resolved);
  const next: Job = { ...job };
  if (persisted.lineItemIds?.length) {
    next.lineItemIds = persisted.lineItemIds;
  } else {
    delete next.lineItemIds;
  }
  if (persisted.blankAssignments?.length) {
    next.blankAssignments = persisted.blankAssignments;
  } else {
    delete next.blankAssignments;
  }
  return next;
}

/** Toggle one size for a decoration job. Returns next resolved assignments. */
export function toggleJobSizeAssignment(
  order: Pick<Order, "lineItems">,
  job: Pick<Job, "lineItemIds" | "blankAssignments">,
  lineItemId: string,
  size: string,
  enabled: boolean
): ResolvedBlankAssignment[] {
  const items = order.lineItems ?? [];
  const item = items.find((row) => row.id === lineItemId);
  if (!item) return resolveJobBlankAssignments(order, job);

  const available = sizeKeysOnItem(item);
  if (!available.includes(size)) {
    return resolveJobBlankAssignments(order, job);
  }

  const current = resolveJobBlankAssignments(order, job);
  const map = new Map(current.map((entry) => [entry.lineItemId, entry]));
  const existing = map.get(lineItemId);

  if (enabled) {
    if (!existing) {
      map.set(lineItemId, { lineItemId, sizes: [size] });
    } else if (existing.sizes == null) {
      // already all sizes
    } else {
      const nextSizes = [...new Set([...existing.sizes, size])];
      map.set(lineItemId, {
        lineItemId,
        sizes:
          nextSizes.length >= available.length ? null : nextSizes,
      });
    }
  } else if (existing) {
    if (existing.sizes == null) {
      const nextSizes = available.filter((key) => key !== size);
      if (nextSizes.length === 0) map.delete(lineItemId);
      else map.set(lineItemId, { lineItemId, sizes: nextSizes });
    } else {
      const nextSizes = existing.sizes.filter((key) => key !== size);
      if (nextSizes.length === 0) map.delete(lineItemId);
      else map.set(lineItemId, { lineItemId, sizes: nextSizes });
    }
  }

  return items
    .map((row) => map.get(row.id))
    .filter((entry): entry is ResolvedBlankAssignment => Boolean(entry));
}

/** Toggle an entire blank (all sizes) for a decoration job. */
export function toggleJobBlankAssignment(
  order: Pick<Order, "lineItems">,
  job: Pick<Job, "lineItemIds" | "blankAssignments">,
  lineItemId: string,
  enabled: boolean
): ResolvedBlankAssignment[] {
  const items = order.lineItems ?? [];
  if (!items.some((row) => row.id === lineItemId)) {
    return resolveJobBlankAssignments(order, job);
  }
  const current = resolveJobBlankAssignments(order, job);
  const map = new Map(current.map((entry) => [entry.lineItemId, entry]));
  if (enabled) {
    map.set(lineItemId, { lineItemId, sizes: null });
  } else {
    map.delete(lineItemId);
  }
  return items
    .map((row) => map.get(row.id))
    .filter((entry): entry is ResolvedBlankAssignment => Boolean(entry));
}

export function decorationEventsForOrder(order: Order): Array<{
  job: Job;
  imprintLabel: string;
  decoration: string;
}> {
  const rows: Array<{
    job: Job;
    imprintLabel: string;
    decoration: string;
  }> = [];
  for (const job of order.jobs || []) {
    if (job.kind === "finishing") continue;
    const imprints = (job.imprints || []).filter(
      (imprint) => imprint.decoration !== "finishing"
    );
    if (imprints.length === 0) continue;
    const imprintLabel =
      imprints
        .map(
          (imprint) =>
            imprint.customLabel?.trim() || imprint.label?.trim() || ""
        )
        .filter(Boolean)
        .join(" · ") ||
      job.name?.trim() ||
      "Decoration";
    rows.push({
      job,
      imprintLabel,
      decoration: imprints[0].decoration,
    });
  }
  return rows;
}

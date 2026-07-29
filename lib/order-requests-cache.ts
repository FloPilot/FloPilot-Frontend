import type { OrderRequestSummary } from "@/lib/order-requests";

export type OrderRequestsListCache = {
  requests: OrderRequestSummary[];
  counts: Record<string, number>;
  fetchedAt: number;
};

const CACHE_TTL_MS = 5 * 60_000;

let cache: OrderRequestsListCache | null = null;
let inflight: Promise<OrderRequestsListCache> | null = null;

export function getOrderRequestsListCache(
  maxAgeMs = CACHE_TTL_MS
): OrderRequestsListCache | null {
  if (!cache) return null;
  if (Date.now() - cache.fetchedAt > maxAgeMs) return null;
  return cache;
}

export function setOrderRequestsListCache(
  data: Omit<OrderRequestsListCache, "fetchedAt">
): OrderRequestsListCache {
  cache = { ...data, fetchedAt: Date.now() };
  return cache;
}

export function clearOrderRequestsListCache() {
  cache = null;
  inflight = null;
}

export function peekOrderRequestsListCache(): OrderRequestsListCache | null {
  return cache;
}

/** Deduplicate concurrent list fetches (prefetch + page mount). */
export async function loadOrderRequestsListCached(
  fetcher: () => Promise<Omit<OrderRequestsListCache, "fetchedAt">>,
  options: { force?: boolean; maxAgeMs?: number } = {}
): Promise<OrderRequestsListCache> {
  if (!options.force) {
    const hit = getOrderRequestsListCache(options.maxAgeMs);
    if (hit) return hit;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const data = await fetcher();
      return setOrderRequestsListCache(data);
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

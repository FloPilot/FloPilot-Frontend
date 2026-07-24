/** Persist public client-store carts in localStorage for one hour. */

export type StoredClientStoreCartLine = {
  key: string;
  productId: string;
  productName: string;
  size: string;
  color?: string;
  qty: number;
  unitPrice: number;
  mockupUrl?: string;
};

type StoredClientStoreCart = {
  expiresAt: number;
  items: StoredClientStoreCartLine[];
};

export const CLIENT_STORE_CART_TTL_MS = 60 * 60 * 1000; // 1 hour

function storageKey(token: string): string {
  return `flopilot.client-store.cart.${token}`;
}

function isCartLine(value: unknown): value is StoredClientStoreCartLine {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.key === "string" &&
    typeof row.productId === "string" &&
    typeof row.productName === "string" &&
    typeof row.size === "string" &&
    typeof row.qty === "number" &&
    Number.isFinite(row.qty) &&
    row.qty > 0 &&
    typeof row.unitPrice === "number" &&
    Number.isFinite(row.unitPrice)
  );
}

export function readClientStoreCart(
  token: string
): StoredClientStoreCartLine[] {
  if (typeof window === "undefined" || !token) return [];
  try {
    const raw = window.localStorage.getItem(storageKey(token));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredClientStoreCart;
    if (
      !parsed ||
      typeof parsed.expiresAt !== "number" ||
      !Array.isArray(parsed.items)
    ) {
      window.localStorage.removeItem(storageKey(token));
      return [];
    }
    if (parsed.expiresAt <= Date.now()) {
      window.localStorage.removeItem(storageKey(token));
      return [];
    }
    return parsed.items.filter(isCartLine).map((item) => ({
      ...item,
      qty: Math.max(1, Math.floor(item.qty)),
      color: typeof item.color === "string" ? item.color : undefined,
      mockupUrl: typeof item.mockupUrl === "string" ? item.mockupUrl : undefined,
    }));
  } catch {
    return [];
  }
}

export function writeClientStoreCart(
  token: string,
  items: StoredClientStoreCartLine[]
): void {
  if (typeof window === "undefined" || !token) return;
  try {
    if (!items.length) {
      window.localStorage.removeItem(storageKey(token));
      return;
    }
    const payload: StoredClientStoreCart = {
      expiresAt: Date.now() + CLIENT_STORE_CART_TTL_MS,
      items,
    };
    window.localStorage.setItem(storageKey(token), JSON.stringify(payload));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function clearClientStoreCart(token: string): void {
  if (typeof window === "undefined" || !token) return;
  try {
    window.localStorage.removeItem(storageKey(token));
  } catch {
    // Ignore.
  }
}

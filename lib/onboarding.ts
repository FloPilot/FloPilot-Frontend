const SETUP_PENDING_KEY = "flopilot-setup-pending";

export function markShopSetupPending() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SETUP_PENDING_KEY, "1");
}

export function clearShopSetupPending() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SETUP_PENDING_KEY);
}

export function isShopSetupPending() {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(SETUP_PENDING_KEY) === "1";
}

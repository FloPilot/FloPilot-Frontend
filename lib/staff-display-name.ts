const STAFF_DISPLAY_NAME_KEY = "flopilot.staffDisplayName";

export function persistStaffDisplayName(name: string | null | undefined) {
  if (typeof window === "undefined") return;
  const trimmed = name?.trim() ?? "";
  if (!trimmed || trimmed.includes("@")) {
    return;
  }
  try {
    window.sessionStorage.setItem(STAFF_DISPLAY_NAME_KEY, trimmed);
  } catch {
    /* ignore quota / private mode */
  }
}

export function readStaffDisplayName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(STAFF_DISPLAY_NAME_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function clearStaffDisplayName() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STAFF_DISPLAY_NAME_KEY);
  } catch {
    /* ignore */
  }
}

/** Prefer a real person name; never return bare emails. */
export function pickStaffDisplayName(
  ...candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim() ?? "";
    if (!trimmed) continue;
    if (trimmed.includes("@")) continue;
    return trimmed;
  }
  return "";
}

/** First name for greetings — skips emails and empty values. */
export function greetingFirstName(
  ...candidates: Array<string | null | undefined>
): string {
  const full = pickStaffDisplayName(...candidates);
  if (!full) return "";
  return full.split(/\s+/)[0] || "";
}

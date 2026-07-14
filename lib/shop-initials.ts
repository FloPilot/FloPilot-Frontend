/** Initials from the first letters of up to two words, e.g. "Test Shop" → "TS". */
export function getShopInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
  return initials || "?";
}

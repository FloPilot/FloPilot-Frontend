/** Host labels reserved for FloPilot infrastructure (not shop subdomains). */
const RESERVED_SHOP_SUBDOMAINS = new Set([
  "www",
  "team",
  "app",
  "api",
  "admin",
  "mail",
  "cdn",
  "static",
  "assets",
]);

/**
 * When a request hits `{shop}.flopilot.io` (or `{shop}.localhost`), return the
 * shop slug. Apex / www / team and other reserved hosts return null.
 */
export function getShopSubdomain(host: string): string | null {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  if (!hostname) return null;

  const flopilot = hostname.match(/^([a-z0-9-]+)\.flopilot\.io$/);
  if (flopilot?.[1] && !RESERVED_SHOP_SUBDOMAINS.has(flopilot[1])) {
    return flopilot[1];
  }

  const local = hostname.match(/^([a-z0-9-]+)\.localhost$/);
  if (local?.[1] && !RESERVED_SHOP_SUBDOMAINS.has(local[1])) {
    return local[1];
  }

  return null;
}

/** JWT share tokens always start with this base64 header prefix. */
export function looksLikeStoreShareJwt(segment: string): boolean {
  return String(segment || "")
    .trim()
    .startsWith("eyJ");
}

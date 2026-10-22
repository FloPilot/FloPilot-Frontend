/** True when the request is on the legacy team portal host (team.flopilot.io). */
export function isTeamPortalHost(host: string): boolean {
  const normalized = host.split(":")[0]?.toLowerCase() ?? "";
  return (
    normalized === "team.flopilot.io" ||
    normalized.startsWith("team.localhost") ||
    normalized === "team.local"
  );
}

export const TEAM_PORTAL_PATH_PREFIX = "/team";

/**
 * Canonical admin portal origin. Prefer ADMIN; TEAM kept for older env files.
 */
export function getAdminPortalUrl(): string {
  return (
    process.env.NEXT_PUBLIC_ADMIN_PORTAL_URL ||
    process.env.NEXT_PUBLIC_TEAM_PORTAL_URL ||
    "https://admin.flopilot.io"
  ).replace(/\/$/, "");
}

/** In-app path helper (legacy). Prefer teamPortalRedirectPath for navigation. */
export function teamPortalPath(path = ""): string {
  const suffix = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `${TEAM_PORTAL_PATH_PREFIX}${suffix || ""}`;
}

/**
 * Absolute URL on the standalone admin app.
 * Maps `/team/...` paths to admin root paths (`/tickets`, `/login`, …).
 */
export function teamPortalRedirectPath(path = "/tickets"): string {
  const base = getAdminPortalUrl();
  let suffix = path.startsWith("/") ? path : path ? `/${path}` : "";
  if (suffix === TEAM_PORTAL_PATH_PREFIX || suffix.startsWith(`${TEAM_PORTAL_PATH_PREFIX}/`)) {
    suffix = suffix.slice(TEAM_PORTAL_PATH_PREFIX.length) || "/";
  }
  return `${base}${suffix || ""}`;
}

/** Map a shop-app or legacy-host pathname onto the admin app pathname. */
export function adminPathFromTeamRequest(pathname: string): string {
  if (
    pathname === TEAM_PORTAL_PATH_PREFIX ||
    pathname.startsWith(`${TEAM_PORTAL_PATH_PREFIX}/`)
  ) {
    return pathname.slice(TEAM_PORTAL_PATH_PREFIX.length) || "/";
  }
  return pathname || "/";
}

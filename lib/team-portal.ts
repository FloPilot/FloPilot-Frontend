/** True when the request is on the team portal host (team.flopilot.io). */
export function isTeamPortalHost(host: string): boolean {
  const normalized = host.split(":")[0]?.toLowerCase() ?? "";
  return (
    normalized === "team.flopilot.io" ||
    normalized.startsWith("team.localhost") ||
    normalized === "team.local"
  );
}

export const TEAM_PORTAL_PATH_PREFIX = "/team";

export function teamPortalPath(path = ""): string {
  const suffix = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `${TEAM_PORTAL_PATH_PREFIX}${suffix || ""}`;
}

/** Prefer the team subdomain in production when configured. */
export function teamPortalRedirectPath(path = "/tickets"): string {
  const base = process.env.NEXT_PUBLIC_TEAM_PORTAL_URL?.replace(/\/$/, "");
  if (base) {
    const suffix = path.startsWith("/") ? path : `/${path}`;
    return `${base}${suffix}`;
  }
  return teamPortalPath(path);
}

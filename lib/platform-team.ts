import type { MeResponse } from "@/lib/api";

export type PlatformTeamRole = "owner" | "admin" | "member";

export type PlatformTeamMember = {
  id: string;
  email: string;
  name: string;
  role: PlatformTeamRole;
  status: "active" | "disabled";
};

/**
 * FloPilot support / service accounts that can access workspaces for help,
 * but should stay hidden from shop Settings → Users & roles.
 */
export const HIDDEN_WORKSPACE_SERVICE_ACCOUNT_EMAILS = [
  "info@necti.io",
] as const;

export function isHiddenWorkspaceServiceAccount(
  email: string | null | undefined
): boolean {
  const normalized = email?.trim().toLowerCase() ?? "";
  if (!normalized) return false;
  return HIDDEN_WORKSPACE_SERVICE_ACCOUNT_EMAILS.some(
    (entry) => entry === normalized
  );
}

export function isPlatformTeamMember(profile: MeResponse | null): boolean {
  return profile?.platformTeam?.status === "active";
}

export function canManagePlatformTeam(profile: MeResponse | null): boolean {
  const role = profile?.platformTeam?.role;
  return role === "owner" || role === "admin";
}

import type { MeResponse } from "@/lib/api";

export type PlatformTeamRole = "owner" | "admin" | "member";

export type PlatformTeamMember = {
  id: string;
  email: string;
  name: string;
  role: PlatformTeamRole;
  status: "active" | "disabled";
};

export function isPlatformTeamMember(profile: MeResponse | null): boolean {
  return profile?.platformTeam?.status === "active";
}

export function canManagePlatformTeam(profile: MeResponse | null): boolean {
  const role = profile?.platformTeam?.role;
  return role === "owner" || role === "admin";
}

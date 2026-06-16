"use client";

import { useMemo } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import {
  canAccessMachine,
  canAccessWorkspaceArea,
  filterMachinesForAccess,
  getDefaultLandingPath,
  getEffectiveAreas,
  normalizeStaffAccess,
  type StaffAccess,
  type WorkspaceAreaKey,
} from "@/lib/staff-access";
import {
  canAccessArea,
  canWriteArea,
  normalizeStaffRole,
  type PermissionArea,
  type StaffRole,
} from "@/lib/staff-roles";

export function useStaffAccess() {
  const { profile } = useAuth();
  const { settings } = useShopSettings();

  const role = useMemo<StaffRole>(() => {
    if (profile?.type !== "staff") return "viewer";
    return normalizeStaffRole(profile.user.role);
  }, [profile]);

  const access = useMemo<StaffAccess | null>(() => {
    if (profile?.type !== "staff") return null;
    return profile.user.access ?? null;
  }, [profile]);

  const areas = useMemo(
    () => getEffectiveAreas(role, access),
    [role, access]
  );

  const landingPath = useMemo(
    () => getDefaultLandingPath(role, access, settings.modules),
    [role, access, settings.modules]
  );

  return useMemo(
    () => ({
      role,
      access,
      areas,
      isAdmin: role === "admin",
      landingPath,
      canAccessWorkspace: (area: WorkspaceAreaKey) =>
        canAccessWorkspaceArea(role, access, area),
      canAccessMachine: (machineId: string) =>
        canAccessMachine(role, access, machineId),
      filterMachines: <T extends { id: string }>(machines: T[]) =>
        filterMachinesForAccess(role, access, machines),
      canAccess: (area: PermissionArea) => {
        if (role === "admin") return true;
        const workspaceMap: Partial<Record<PermissionArea, WorkspaceAreaKey>> = {
          orders: "orders",
          customers: "customers",
          production: "production",
          machines: "machines",
          inventory: "inventory",
          reports: "reports",
          calendar: "calendar",
          settings: "settings",
        };
        const workspaceArea = workspaceMap[area];
        if (workspaceArea) {
          return canAccessWorkspaceArea(role, access, workspaceArea);
        }
        return canAccessArea(role, area);
      },
      canWrite: (area: PermissionArea) => {
        if (role === "viewer") return false;
        if (role === "admin") return true;
        const workspaceMap: Partial<Record<PermissionArea, WorkspaceAreaKey>> = {
          orders: "orders",
          customers: "customers",
          production: "production",
          machines: "machines",
          inventory: "inventory",
          reports: "reports",
          calendar: "calendar",
          settings: "settings",
        };
        const workspaceArea = workspaceMap[area];
        if (workspaceArea) {
          return canAccessWorkspaceArea(role, access, workspaceArea);
        }
        return canWriteArea(role, area);
      },
      normalizedAccess: normalizeStaffAccess(access, role),
    }),
    [role, access, areas, landingPath]
  );
}

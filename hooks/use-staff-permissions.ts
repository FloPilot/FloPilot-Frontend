"use client";

import { useMemo } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useStaffAccess } from "@/hooks/use-staff-access";
import {
  normalizeStaffRole,
  type PermissionArea,
  type StaffRole,
} from "@/lib/staff-roles";

/** @deprecated Prefer useStaffAccess for workspace-aware permissions */
export function useStaffPermissions() {
  const { profile } = useAuth();
  const staffAccess = useStaffAccess();

  const role = useMemo<StaffRole>(() => {
    if (profile?.type !== "staff") return "viewer";
    return normalizeStaffRole(profile.user.role);
  }, [profile]);

  return useMemo(
    () => ({
      role,
      isAdmin: staffAccess.isAdmin,
      canAccess: staffAccess.canAccess,
      canWrite: staffAccess.canWrite,
    }),
    [role, staffAccess]
  );
}

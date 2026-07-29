"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useCustomerPortalOptional } from "@/components/portal/customer-portal-provider";
import { usePortalAppOptional } from "@/components/portal/portal-app-provider";

type PortalAccess =
  | {
      mode: "token";
      token: string;
      accent: string;
      refresh: () => Promise<void>;
      getAccessToken: () => Promise<string>;
    }
  | {
      mode: "auth";
      token: null;
      accent: string;
      refresh: () => Promise<void>;
      getAccessToken: () => Promise<string>;
    };

/**
 * Resolves either the magic-link portal session or the authenticated portal app.
 * Must be used under one of those providers.
 */
export function usePortalAccess(): PortalAccess {
  const tokenPortal = useCustomerPortalOptional();
  const appPortal = usePortalAppOptional();
  const { getIdToken } = useAuth();

  const inviteToken = tokenPortal?.token ?? null;

  const getAuthToken = useCallback(async () => {
    const token = await getIdToken();
    if (!token) throw new Error("Not signed in");
    return token;
  }, [getIdToken]);

  const getInviteToken = useCallback(async () => {
    if (!inviteToken) throw new Error("Missing portal token");
    return inviteToken;
  }, [inviteToken]);

  const access = useMemo((): PortalAccess | null => {
    if (appPortal) {
      return {
        mode: "auth",
        token: null,
        accent: appPortal.accent,
        refresh: appPortal.refresh,
        getAccessToken: getAuthToken,
      };
    }

    if (tokenPortal && inviteToken) {
      return {
        mode: "token",
        token: inviteToken,
        accent: tokenPortal.accent,
        refresh: tokenPortal.refresh,
        getAccessToken: getInviteToken,
      };
    }

    return null;
  }, [appPortal, tokenPortal, inviteToken, getAuthToken, getInviteToken]);

  if (!access) {
    throw new Error("usePortalAccess must be used within a portal provider");
  }

  return access;
}

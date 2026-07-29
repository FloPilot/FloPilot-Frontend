"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  fetchCustomerPortal,
  type CustomerPortalDashboard,
} from "@/lib/customer-portal-api";

type PortalAppContextValue = {
  dashboard: CustomerPortalDashboard | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  accent: string;
};

const PortalAppContext = createContext<PortalAppContextValue | null>(null);

export function PortalAppProvider({ children }: { children: ReactNode }) {
  const { getIdToken, profile } = useAuth();
  const [dashboard, setDashboard] = useState<CustomerPortalDashboard | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasDashboardRef = useRef(false);

  const refresh = useCallback(async () => {
    setError(null);
    if (!hasDashboardRef.current) setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      const data = await fetchCustomerPortal(token, { mode: "auth" });
      hasDashboardRef.current = true;
      setDashboard(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load your portal."
      );
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  const portalTenantId =
    profile?.type === "portal" ? profile.tenant.id : null;
  const portalCustomerId =
    profile?.type === "portal" ? profile.customer.id : null;

  useEffect(() => {
    if (!portalTenantId || !portalCustomerId) return;
    void refresh();
  }, [portalTenantId, portalCustomerId, refresh]);

  const accent = dashboard?.shop?.primaryColor || "#2c6ecb";

  const value = useMemo(
    () => ({
      dashboard,
      loading,
      error,
      refresh,
      accent,
    }),
    [dashboard, loading, error, refresh, accent]
  );

  return (
    <PortalAppContext.Provider value={value}>{children}</PortalAppContext.Provider>
  );
}

export function usePortalApp() {
  const ctx = useContext(PortalAppContext);
  if (!ctx) {
    throw new Error("usePortalApp must be used within PortalAppProvider");
  }
  return ctx;
}

export function usePortalAppOptional() {
  return useContext(PortalAppContext);
}

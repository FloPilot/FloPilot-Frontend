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
import {
  fetchCustomerPortal,
  type CustomerPortalDashboard,
} from "@/lib/customer-portal-api";

type CustomerPortalContextValue = {
  token: string;
  dashboard: CustomerPortalDashboard | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  accent: string;
};

const CustomerPortalContext = createContext<CustomerPortalContextValue | null>(
  null
);

export function CustomerPortalProvider({
  token,
  children,
}: {
  token: string;
  children: ReactNode;
}) {
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
      const data = await fetchCustomerPortal(token);
      hasDashboardRef.current = true;
      setDashboard(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load your portal."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    hasDashboardRef.current = false;
    void refresh();
  }, [refresh]);

  const accent = dashboard?.shop?.primaryColor || "#2c6ecb";

  const value = useMemo(
    () => ({
      token,
      dashboard,
      loading,
      error,
      refresh,
      accent,
    }),
    [token, dashboard, loading, error, refresh, accent]
  );

  return (
    <CustomerPortalContext.Provider value={value}>
      {children}
    </CustomerPortalContext.Provider>
  );
}

export function useCustomerPortal() {
  const ctx = useContext(CustomerPortalContext);
  if (!ctx) {
    throw new Error("useCustomerPortal must be used within CustomerPortalProvider");
  }
  return ctx;
}

export function useCustomerPortalOptional() {
  return useContext(CustomerPortalContext);
}

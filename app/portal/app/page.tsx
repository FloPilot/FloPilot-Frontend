"use client";

import { Loader2 } from "lucide-react";
import { CustomerPortalDashboardView } from "@/components/portal/customer-portal-dashboard";
import { usePortalApp } from "@/components/portal/portal-app-provider";

export default function PortalAppDashboardPage() {
  const { dashboard, loading, error, accent } = usePortalApp();

  if (loading && !dashboard) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-[#616161]">
        <Loader2 className="size-6 animate-spin" style={{ color: accent }} />
        <p className="text-[14px]">Loading your portal…</p>
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <div className="rounded-2xl border border-[#ebebeb] bg-white p-8 text-center shadow-sm">
        <p className="text-[18px] font-semibold text-[#303030]">
          Couldn&apos;t open your portal
        </p>
        <p className="mt-2 text-[14px] text-[#616161]">{error}</p>
      </div>
    );
  }

  return (
    <CustomerPortalDashboardView dashboard={dashboard} accent={accent} />
  );
}

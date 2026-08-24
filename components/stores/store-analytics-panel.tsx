"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Loader2, MousePointer2, Users } from "lucide-react";
import {
  getClientStoreAnalytics,
  type ClientStoreAnalytics,
  type ClientStoreAnalyticsRow,
} from "@/lib/api";
import { dashboardCardClass } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <div className={cn(dashboardCardClass, "p-4")}>
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-[#8a8a8a]">{label}</p>
        <Icon className="size-4 text-[#8a8a8a]" />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[#121a2e]">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: ClientStoreAnalyticsRow[];
}) {
  const max = Math.max(1, ...rows.map((row) => row.visitors));
  return (
    <div className={cn(dashboardCardClass, "p-4")}>
      <h3 className="text-[13px] font-semibold text-[#303030]">{title}</h3>
      {rows.length ? (
        <div className="mt-3 space-y-3">
          {rows.map((row) => (
            <div key={row.label}>
              <div className="flex items-center justify-between gap-3 text-[12px]">
                <span className="truncate text-[#616161]">{row.label}</span>
                <span className="shrink-0 font-medium text-[#303030]">
                  {row.visitors}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#f0f0f1]">
                <div
                  className="h-full rounded-full bg-brand-primary"
                  style={{ width: `${(row.visitors / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-[12px] text-[#8a8a8a]">
          Traffic will appear here after visitors open the store.
        </p>
      )}
    </div>
  );
}

export function StoreAnalyticsPanel({
  storeId,
  getIdToken,
}: {
  storeId: string;
  getIdToken: () => Promise<string | null>;
}) {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<ClientStoreAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const token = await getIdToken();
        if (!token) throw new Error("Not signed in.");
        const result = await getClientStoreAnalytics(token, storeId, days);
        if (active) setData(result.analytics);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Could not load store traffic."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [days, getIdToken, storeId]);

  const chart = useMemo(() => {
    const max = Math.max(1, ...(data?.daily || []).map((row) => row.pageViews));
    return (data?.daily || []).map((row) => ({
      ...row,
      height: Math.max(4, (row.pageViews / max) * 100),
    }));
  }, [data?.daily]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold text-[#121a2e]">
            Store traffic
          </h2>
          <p className="mt-1 text-[12px] text-[#8a8a8a]">
            Privacy-friendly visit metrics for this client store.
          </p>
        </div>
        <select
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
          className="h-9 appearance-none rounded-md border border-[#e3e3e3] bg-white bg-[length:12px] bg-[right_12px_center] bg-no-repeat pl-3 pr-9 text-[12px] font-medium text-[#303030]"
          style={{
            backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8a8a8a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'
            )}")`,
          }}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {loading ? (
        <div className={cn(dashboardCardClass, "flex min-h-56 items-center justify-center")}>
          <Loader2 className="size-5 animate-spin text-[#8a8a8a]" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
          {error}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Visitors" value={data.totals.visitors} icon={Users} />
            <Metric label="Page views" value={data.totals.pageViews} icon={MousePointer2} />
          </div>
          <div className={cn(dashboardCardClass, "p-4")}>
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-[#616161]" />
              <h3 className="text-[13px] font-semibold text-[#303030]">
                Page views over time
              </h3>
            </div>
            {chart.length ? (
              <div className="mt-5 flex h-44 items-end gap-2">
                {chart.map((row) => (
                  <div key={row.day} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <div className="flex h-32 w-full items-end rounded-t bg-[#f3f5ff]">
                      <div
                        className="w-full rounded-t bg-brand-primary"
                        style={{ height: `${row.height}%` }}
                        title={`${row.pageViews} views · ${row.visitors} visitors`}
                      />
                    </div>
                    <span className="text-[9px] text-[#8a8a8a]">
                      {row.day.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-[12px] text-[#8a8a8a]">
                No visits have been recorded in this period.
              </p>
            )}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Breakdown title="Referrers" rows={data.referrers} />
            <Breakdown title="Regions" rows={data.regions} />
            <Breakdown title="Devices" rows={data.devices} />
            <Breakdown title="Browsers" rows={data.browsers} />
          </div>
        </>
      ) : null}
    </div>
  );
}

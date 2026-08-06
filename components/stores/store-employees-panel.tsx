"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Loader2,
  Mail,
  Upload,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  emailClientStoreEmployees,
  importClientStoreEmployees,
  listClientStoreEmployees,
  updateClientStore,
  updateClientStoreEmployee,
} from "@/lib/api";
import {
  type ClientStore,
  type ClientStoreEmployee,
  type ClientStoreEmployeeSummary,
} from "@/lib/client-stores";
import { formatCurrency } from "@/lib/format";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardPrimaryButtonClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type Props = {
  store: ClientStore;
  onStoreUpdated: (store: ClientStore) => void;
};

const SAMPLE_CSV = `email,name,credit
alex@acme.com,Alex Rivera,50
jordan@acme.com,Jordan Lee,50
sam@acme.com,Sam Chen,50
`;

export function StoreEmployeesPanel({ store, onStoreUpdated }: Props) {
  const { getIdToken } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [employees, setEmployees] = useState<ClientStoreEmployee[]>([]);
  const [summary, setSummary] = useState<ClientStoreEmployeeSummary | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [defaultCredit, setDefaultCredit] = useState(
    String(store.settings?.defaultCreditAmount || 50)
  );
  const [creditsEnabled, setCreditsEnabled] = useState(
    store.settings?.creditsEnabled === true
  );
  const [requireAccess, setRequireAccess] = useState(
    store.settings?.requireEmployeeAccess === true
  );
  const [allowOverage, setAllowOverage] = useState(
    store.settings?.allowCreditOverage === true
  );

  useEffect(() => {
    setCreditsEnabled(store.settings?.creditsEnabled === true);
    setRequireAccess(store.settings?.requireEmployeeAccess === true);
    setAllowOverage(store.settings?.allowCreditOverage === true);
    setDefaultCredit(String(store.settings?.defaultCreditAmount || 50));
  }, [store.settings]);

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listClientStoreEmployees(token, store.id);
      setEmployees(res.employees);
      setSummary(res.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load employees");
    } finally {
      setLoading(false);
    }
  }, [getIdToken, store.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (row) =>
        row.email.toLowerCase().includes(q) ||
        (row.name || "").toLowerCase().includes(q) ||
        row.code.toLowerCase().includes(q)
    );
  }, [employees, search]);

  const saveProgramSettings = async () => {
    const token = await getIdToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const credit = Math.max(0, Number(defaultCredit) || 0);
      const res = await updateClientStore(token, store.id, {
        settings: {
          ...store.settings,
          creditsEnabled,
          requireEmployeeAccess: requireAccess,
          allowCreditOverage: allowOverage,
          defaultCreditAmount: credit,
        },
      });
      onStoreUpdated(res.store);
      setMessage("Employee credit settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setBusy(false);
    }
  };

  const onCsvSelected = async (file: File | null) => {
    if (!file) return;
    const token = await getIdToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const csvText = await file.text();
      const res = await importClientStoreEmployees(token, store.id, {
        csvText,
        defaultCreditAmount: Math.max(0, Number(defaultCredit) || 0),
      });
      setMessage(
        `Imported ${res.created} new · updated ${res.updated}${
          res.errors.length ? ` · ${res.errors.length} row error(s)` : ""
        }`
      );
      if (res.errors.length) {
        setError(
          res.errors
            .slice(0, 3)
            .map((e) => `${e.email || `line ${e.line}`}: ${e.message}`)
            .join(" · ")
        );
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV import failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const sendEmails = async (onlyUnsent: boolean) => {
    const token = await getIdToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      let totalSent = 0;
      let totalFailed = 0;
      // Backend caps at 50 per call — loop until a short batch.
      for (let i = 0; i < 60; i++) {
        const res = await emailClientStoreEmployees(token, store.id, {
          onlyUnsent,
        });
        totalSent += res.sent;
        totalFailed += res.failed;
        if (res.sent + res.failed === 0) break;
        if (res.results.length < 50) break;
      }
      setMessage(
        `Email blast finished — sent ${totalSent}${
          totalFailed ? `, failed ${totalFailed}` : ""
        }.`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send emails");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (employee: ClientStoreEmployee) => {
    const token = await getIdToken();
    if (!token) return;
    setBusy(true);
    try {
      await updateClientStoreEmployee(token, store.id, employee.id, {
        status: employee.status === "active" ? "revoked" : "active",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update employee");
    } finally {
      setBusy(false);
    }
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employee-credits-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCodes = () => {
    const header = "email,name,code,creditBalance,status\n";
    const body = employees
      .map(
        (row) =>
          `${csvEscape(row.email)},${csvEscape(row.name || "")},${csvEscape(
            row.code
          )},${row.creditBalance},${row.status}`
      )
      .join("\n");
    const blob = new Blob([header + body], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${store.slug || "store"}-employee-codes.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className={cn(dashboardCardClass, "space-y-4 p-4 sm:p-5")}>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[#f4f7ff] p-2 text-brand-primary">
            <Users className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-[#121a2e]">
              Employees & store credit
            </p>
            <p className="mt-1 text-[13px] text-[#616161]">
              Upload a CSV of employees, issue unique access codes with gift
              credit (e.g. $50 each), email the store link, and keep the store
              private to your invite list.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-2.5 rounded-lg border border-[#ebebeb] bg-[#fafafa] px-3 py-2.5">
            <input
              type="checkbox"
              checked={creditsEnabled}
              onChange={(e) => setCreditsEnabled(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="block text-[13px] font-medium text-[#303030]">
                Enable store credit checkout
              </span>
              <span className="mt-0.5 block text-[12px] text-[#8a8a8a]">
                Employees redeem balance at checkout (no card if credit covers
                the cart).
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2.5 rounded-lg border border-[#ebebeb] bg-[#fafafa] px-3 py-2.5">
            <input
              type="checkbox"
              checked={requireAccess}
              onChange={(e) => setRequireAccess(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="block text-[13px] font-medium text-[#303030]">
                Private — require employee code
              </span>
              <span className="mt-0.5 block text-[12px] text-[#8a8a8a]">
                Catalog stays locked until a valid invited employee enters their
                code.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2.5 rounded-lg border border-[#ebebeb] bg-[#fafafa] px-3 py-2.5 sm:col-span-2">
            <input
              type="checkbox"
              checked={allowOverage}
              onChange={(e) => setAllowOverage(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="block text-[13px] font-medium text-[#303030]">
                Allow paying over credit by card
              </span>
              <span className="mt-0.5 block text-[12px] text-[#8a8a8a]">
                Off by default for gift programs. When on, Stripe charges only
                the remainder after credit.
              </span>
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-[13px]">Default credit per employee ($)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={defaultCredit}
              onChange={(e) => setDefaultCredit(e.target.value)}
              className="mt-1.5 h-9 w-36 border-[#e3e3e3] text-[13px]"
            />
          </div>
          <Button
            type="button"
            className={dashboardPrimaryButtonClass}
            disabled={busy}
            onClick={() => void saveProgramSettings()}
          >
            Save program settings
          </Button>
        </div>
      </div>

      <div className={cn(dashboardCardClass, "space-y-4 p-4 sm:p-5")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[14px] font-semibold text-[#121a2e]">
              Import & distribute
            </p>
            <p className="mt-1 text-[13px] text-[#616161]">
              CSV columns: <code className="text-[12px]">email</code>, optional{" "}
              <code className="text-[12px]">name</code>, optional{" "}
              <code className="text-[12px]">credit</code>. Up to 500 rows per
              upload.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className={dashboardControlClass}
              onClick={downloadSample}
            >
              <Download className="size-3.5" />
              Sample CSV
            </Button>
            <Button
              type="button"
              className={dashboardControlClass}
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-3.5" />
              Upload CSV
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => void onCsvSelected(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className={dashboardPrimaryButtonClass}
            disabled={busy || employees.length === 0}
            onClick={() => void sendEmails(true)}
          >
            <Mail className="size-3.5" />
            Email unsent invites
          </Button>
          <Button
            type="button"
            className={dashboardControlClass}
            disabled={busy || employees.length === 0}
            onClick={() => void sendEmails(false)}
          >
            Email all active
          </Button>
          <Button
            type="button"
            className={dashboardControlClass}
            disabled={employees.length === 0}
            onClick={exportCodes}
          >
            <Download className="size-3.5" />
            Export codes
          </Button>
        </div>

        {summary ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Employees" value={String(summary.total)} />
            <Stat
              label="Credit issued"
              value={formatCurrency(summary.creditIssued)}
            />
            <Stat
              label="Remaining"
              value={formatCurrency(summary.creditRemaining)}
            />
            <Stat
              label="Redeemed"
              value={formatCurrency(summary.creditRedeemed)}
            />
          </div>
        ) : null}
      </div>

      <div className={cn(dashboardCardClass, "p-4 sm:p-5")}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[14px] font-semibold text-[#121a2e]">
            Employee list
          </p>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, name, or code"
            className="h-9 max-w-xs border-[#e3e3e3] text-[13px]"
          />
        </div>

        {error ? (
          <p className="mb-3 text-[13px] text-red-700">{error}</p>
        ) : null}
        {message ? (
          <p className="mb-3 text-[13px] text-emerald-800">{message}</p>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 py-10 text-[13px] text-[#616161]">
            <Loader2 className="size-4 animate-spin" />
            Loading employees…
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-[#8a8a8a]">
            No employees yet. Upload a CSV to issue access codes and credit.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#ebebeb] text-[11px] uppercase tracking-wide text-[#8a8a8a]">
                  <th className="py-2 pr-3 font-medium">Employee</th>
                  <th className="py-2 pr-3 font-medium">Code</th>
                  <th className="py-2 pr-3 font-medium">Credit</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium">Email</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-b border-[#f0f0f0]">
                    <td className="py-2.5 pr-3">
                      <div className="font-medium text-[#303030]">
                        {row.name || "—"}
                      </div>
                      <div className="text-[12px] text-[#8a8a8a]">
                        {row.email}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[12px] tracking-wide">
                      {row.code}
                    </td>
                    <td className="py-2.5 pr-3">
                      {formatCurrency(row.creditBalance)}
                      <span className="text-[#8a8a8a]">
                        {" "}
                        / {formatCurrency(row.initialCredit)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void revoke(row)}
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          row.status === "active"
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-[#f4f4f5] text-[#616161]"
                        )}
                      >
                        {row.status}
                      </button>
                    </td>
                    <td className="py-2.5 text-[12px] text-[#8a8a8a]">
                      {row.lastEmailAt
                        ? `Sent ${new Date(row.lastEmailAt).toLocaleDateString()}`
                        : "Not sent"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#ebebeb] bg-[#fafafa] px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[#8a8a8a]">
        {label}
      </p>
      <p className="mt-0.5 text-[15px] font-semibold text-[#121a2e]">{value}</p>
    </div>
  );
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

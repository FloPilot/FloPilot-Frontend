"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  ExternalLink,
  Loader2,
  Plus,
  Search,
  Store,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { CreateStoreDialog } from "@/components/stores/create-store-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listClientStores } from "@/lib/api";
import {
  clientStoreModeLabel,
  clientStoreStatusLabel,
  resolveClientStoreShareUrl,
  type ClientStore,
  type ClientStoreStatus,
} from "@/lib/client-stores";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardPrimaryButtonClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: { value: "all" | ClientStoreStatus; label: string }[] = [
  { value: "all", label: "All stores" },
  { value: "draft", label: "Drafts" },
  { value: "published", label: "Live" },
  { value: "closed", label: "Closed" },
];

function statusTone(status: ClientStoreStatus) {
  if (status === "published") {
    return "bg-emerald-50 text-emerald-800 border-emerald-200";
  }
  if (status === "closed") {
    return "bg-[#f4f4f5] text-[#616161] border-[#e3e3e3]";
  }
  return "bg-amber-50 text-amber-900 border-amber-200";
}

export function StoresListView() {
  const router = useRouter();
  const { getIdToken } = useAuth();
  const [stores, setStores] = useState<ClientStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | ClientStoreStatus>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingStoreId, setPendingStoreId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listClientStores(token, {
        status: status === "all" ? undefined : status,
        search: search.trim() || undefined,
      });
      setStores(res.stores);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stores");
    } finally {
      setLoading(false);
    }
  }, [getIdToken, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  // Navigate after the create dialog has fully closed — otherwise the dialog
  // teardown can cancel the App Router transition and leave an empty list.
  useEffect(() => {
    if (createOpen || !pendingStoreId) return;
    const id = pendingStoreId;
    setPendingStoreId(null);
    router.replace(`/app/stores/${id}`);
  }, [createOpen, pendingStoreId, router]);

  const counts = useMemo(() => {
    return {
      total: stores.length,
      live: stores.filter((s) => s.status === "published").length,
      draft: stores.filter((s) => s.status === "draft").length,
    };
  }, [stores]);

  const copyLink = async (store: ClientStore) => {
    const url = resolveClientStoreShareUrl(store);
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopiedId(store.id);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className={dashboardSectionTitleClass}>Client Stores</h1>
          <p className={cn(dashboardTaskDetailClass, "mt-1 max-w-xl")}>
            Build branded gear sites for your clients. They share a link with
            their team — sizes come back to you as store orders.
          </p>
        </div>
        <Button
          type="button"
          className={dashboardPrimaryButtonClass}
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" />
          New store
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Stores", value: counts.total },
          { label: "Live", value: counts.live },
          { label: "Drafts", value: counts.draft },
        ].map((item) => (
          <div
            key={item.label}
            className={cn(dashboardCardClass, "px-4 py-3")}
          >
            <p className="text-[12px] font-medium text-[#616161]">{item.label}</p>
            <p className="mt-1 text-[1.5rem] font-semibold tabular-nums text-[#303030]">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className={cn(dashboardCardClass, "p-3 sm:p-4")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8a8a]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stores or clients"
              className="h-9 border-[#e3e3e3] bg-white pl-9 text-[13px]"
            />
          </div>
          <Select
            value={status}
            onValueChange={(value) =>
              setStatus(value as "all" | ClientStoreStatus)
            }
          >
            <SelectTrigger className={cn(dashboardControlClass, "w-full sm:w-40")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
          {error}
        </div>
      ) : null}

      <div className={dashboardCardClass}>
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-[13px] text-[#616161]">
            <Loader2 className="size-4 animate-spin" />
            Loading stores…
          </div>
        ) : stores.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-[#f4f4f5]">
              <Store className="size-5 text-[#616161]" />
            </div>
            <h2 className="mt-4 text-[15px] font-semibold text-[#303030]">
              No client stores yet
            </h2>
            <p className="mt-1 max-w-sm text-[13px] text-[#616161]">
              Create a store for a church, team, or company — pick products,
              set markup, and share a link.
            </p>
            <Button
              type="button"
              className={cn(dashboardPrimaryButtonClass, "mt-5")}
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" />
              Create your first store
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Store</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.map((store) => (
                <TableRow
                  key={store.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/app/stores/${store.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#ebebeb] bg-[#fafafa]">
                        {store.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={store.logoUrl}
                            alt=""
                            className="size-full object-contain"
                          />
                        ) : (
                          <Store className="size-4 text-[#8a8a8a]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-[#303030]">
                          {store.name}
                        </p>
                        <p className="truncate text-[12px] text-[#8a8a8a]">
                          {clientStoreModeLabel(store.mode)}
                          {store.headline ? ` · ${store.headline}` : ""}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-[13px] text-[#303030]">
                    {store.company || store.customerName || "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium",
                        statusTone(store.status)
                      )}
                    >
                      {clientStoreStatusLabel(store.status)}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums text-[13px] text-[#616161]">
                    {(store.products || []).filter((p) => p.enabled).length}
                  </TableCell>
                  <TableCell className="text-[13px] text-[#616161]">
                    {formatDate(store.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div
                      className="inline-flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {store.status === "published" &&
                      (store.shareToken || store.shareUrl) ? (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-[#616161]"
                            onClick={() => void copyLink(store)}
                          >
                            <Copy className="size-3.5" />
                            {copiedId === store.id ? "Copied" : "Copy"}
                          </Button>
                          <Link
                            href={resolveClientStoreShareUrl(store)}
                            target="_blank"
                            className="inline-flex h-8 items-center px-2 text-[#616161] hover:text-[#303030]"
                          >
                            <ExternalLink className="size-3.5" />
                          </Link>
                        </>
                      ) : (
                        <span className="text-[12px] text-[#8a8a8a]">—</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <CreateStoreDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(store) => {
          if (!store?.id) {
            void load();
            setCreateOpen(false);
            return;
          }
          // Close first, then navigate once the dialog is gone.
          setPendingStoreId(store.id);
          setCreateOpen(false);
        }}
      />
    </main>
  );
}

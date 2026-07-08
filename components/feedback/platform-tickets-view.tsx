"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bug,
  CheckCircle2,
  Filter,
  Inbox,
  Loader2,
  Sparkles,
} from "lucide-react";
import { StaffHeader } from "@/components/layout/staff-header";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  LabeledSelectValue,
  SelectTrigger,
} from "@/components/ui/select";
import { listSupportTickets, updateSupportTicket } from "@/lib/api";
import {
  SUPPORT_TICKET_STATUSES,
  supportTicketCategoryLabel,
  supportTicketPriorityLabel,
  supportTicketStatusMeta,
  type SupportTicket,
  type SupportTicketStatus,
} from "@/lib/support-tickets";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">
        {label}
      </p>
      <p className={cn("mt-1 text-2xl font-semibold tracking-tight", tone)}>
        {value}
      </p>
    </div>
  );
}

export function PlatformTicketsView() {
  const { getIdToken } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SupportTicketStatus | "all">(
    "all"
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadTickets = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const { tickets: next } = await listSupportTickets(token);
      setTickets(next);
      setSelectedId((current) => current ?? next[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load tickets");
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const filteredTickets = useMemo(() => {
    if (statusFilter === "all") return tickets;
    return tickets.filter((ticket) => ticket.status === statusFilter);
  }, [tickets, statusFilter]);

  const selected = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedId) ?? null,
    [tickets, selectedId]
  );

  const [draftStatus, setDraftStatus] = useState<SupportTicketStatus>("open");
  const [draftNote, setDraftNote] = useState("");

  useEffect(() => {
    if (!selected) return;
    setDraftStatus(selected.status);
    setDraftNote(selected.adminNote || "");
  }, [selected]);

  const stats = useMemo(() => {
    const open = tickets.filter((ticket) => ticket.status === "open").length;
    const inReview = tickets.filter(
      (ticket) => ticket.status === "in_review"
    ).length;
    const planned = tickets.filter(
      (ticket) => ticket.status === "planned"
    ).length;
    const done = tickets.filter(
      (ticket) => ticket.status === "done" || ticket.status === "closed"
    ).length;
    return { open, inReview, planned, done, total: tickets.length };
  }, [tickets]);

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      const { ticket } = await updateSupportTicket(token, selected.id, {
        status: draftStatus,
        adminNote: draftNote,
      });
      setTickets((current) =>
        current.map((item) => (item.id === ticket.id ? ticket : item))
      );
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update ticket");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <StaffHeader
        title="Platform feedback"
        description="All tester submissions across shops — triage, prioritize, and track improvements"
        action={
          <Button
            variant="outline"
            className="rounded-full bg-white"
            nativeButton={false}
            render={<Link href="/app/settings/feedback" />}
          >
            User view
          </Button>
        }
      />

      <main className="flex min-h-0 flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total" value={stats.total} tone="text-brand-ink" />
          <StatCard label="Open" value={stats.open} tone="text-sky-700" />
          <StatCard
            label="In review"
            value={stats.inReview}
            tone="text-amber-800"
          />
          <StatCard label="Planned" value={stats.planned} tone="text-violet-800" />
          <StatCard label="Done" value={stats.done} tone="text-emerald-800" />
        </div>

        {error && (
          <p className="rounded-xl border border-destructive/30 bg-white px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <section className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-white/80 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <Inbox className="size-4 text-brand-primary" />
                <h2 className="text-sm font-semibold text-brand-ink">Inbox</h2>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="size-3.5 text-brand-muted" />
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    if (value) {
                      setStatusFilter(value as SupportTicketStatus | "all");
                    }
                  }}
                >
                  <SelectTrigger className="h-9 w-[140px] rounded-full text-xs">
                    <LabeledSelectValue
                      value={statusFilter}
                      options={[
                        { value: "all", label: "All statuses" },
                        ...SUPPORT_TICKET_STATUSES,
                      ]}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {SUPPORT_TICKET_STATUSES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-sm text-brand-muted">
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Loading tickets…
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="px-4 py-16 text-center text-sm text-brand-muted">
                  No tickets in this view.
                </div>
              ) : (
                <ul className="space-y-1">
                  {filteredTickets.map((ticket) => {
                    const active = ticket.id === selectedId;
                    const status = supportTicketStatusMeta(ticket.status);
                    return (
                      <li key={ticket.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(ticket.id)}
                          className={cn(
                            "w-full rounded-xl px-3 py-3 text-left transition-colors",
                            active
                              ? "bg-brand-primary/10 ring-1 ring-brand-primary/20"
                              : "hover:bg-slate-50"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-1 text-sm font-semibold text-brand-ink">
                              {ticket.title}
                            </p>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                status.color
                              )}
                            >
                              {status.label}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-brand-muted">
                            {ticket.tenantName} · {ticket.userName}
                          </p>
                          <p className="mt-1 text-[11px] text-brand-muted">
                            {supportTicketCategoryLabel(ticket.category)} ·{" "}
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <section className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-white/80 bg-white shadow-sm">
            {!selected ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-brand-muted">
                Select a ticket to review details
              </div>
            ) : (
              <>
                <div className="border-b border-border/50 px-5 py-4 sm:px-6">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                      <Bug className="size-4 text-brand-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold text-brand-ink">
                        {selected.title}
                      </h2>
                      <p className="mt-1 text-sm text-brand-muted">
                        {supportTicketCategoryLabel(selected.category)} ·{" "}
                        {supportTicketPriorityLabel(selected.priority)} priority
                      </p>
                    </div>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/50 bg-slate-50/70 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                        Shop
                      </p>
                      <p className="mt-1 text-sm font-medium text-brand-ink">
                        {selected.tenantName || "Unknown shop"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-slate-50/70 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                        Submitted by
                      </p>
                      <p className="mt-1 text-sm font-medium text-brand-ink">
                        {selected.userName}
                      </p>
                      <p className="text-xs text-brand-muted">
                        {selected.userEmail}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-border/50 bg-white px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                      Description
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-brand-ink">
                      {selected.description}
                    </p>
                  </div>

                  {selected.pageUrl && (
                    <p className="mt-3 text-xs text-brand-muted">
                      Page:{" "}
                      <a
                        href={selected.pageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-primary hover:underline"
                      >
                        {selected.pageUrl}
                      </a>
                    </p>
                  )}

                  {selected.attachmentUrl && (
                    <div className="mt-4">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                        Attachment
                      </p>
                      <div className="inline-flex rounded-xl border border-border/60 bg-slate-50 p-3">
                        <div className="relative h-40 w-64">
                          <Image
                            src={selected.attachmentUrl}
                            alt={selected.attachmentName || "Attachment"}
                            fill
                            unoptimized
                            className="rounded-lg object-contain"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={draftStatus}
                        onValueChange={(value) => {
                          if (value) {
                            setDraftStatus(value as SupportTicketStatus);
                          }
                        }}
                      >
                        <SelectTrigger className="h-11 rounded-xl">
                          <LabeledSelectValue
                            value={draftStatus}
                            options={SUPPORT_TICKET_STATUSES}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORT_TICKET_STATUSES.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label htmlFor="admin-note">Internal note</Label>
                    <textarea
                      id="admin-note"
                      value={draftNote}
                      onChange={(event) => setDraftNote(event.target.value)}
                      placeholder="Triage notes, planned release, workaround, etc."
                      className="min-h-[100px] w-full rounded-xl border border-input bg-transparent px-3 py-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      maxLength={2000}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-border/50 px-5 py-4 sm:px-6">
                  <p className="text-xs text-brand-muted">
                    Updated{" "}
                    {new Date(selected.updatedAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                  <div className="flex items-center gap-2">
                    {saved && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="size-3.5" />
                        Saved
                      </span>
                    )}
                    <Button
                      className="rounded-full"
                      disabled={saving}
                      onClick={() => void handleSave()}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-4" />
                          Update ticket
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

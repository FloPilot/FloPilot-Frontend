"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Inbox, Kanban, Loader2, Search } from "lucide-react";
import { TeamPageHeader } from "@/components/team/team-shell";
import { TeamPageContent, TeamStatCard } from "@/components/team/team-page-content";
import { TeamTicketBoard } from "@/components/team/team-ticket-board";
import { TeamTicketListRow } from "@/components/team/team-ticket-card";
import { TeamTicketDetailModal } from "@/components/team/team-ticket-detail-modal";
import { useAuth } from "@/components/providers/auth-provider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  LabeledSelectValue,
  SelectTrigger,
} from "@/components/ui/select";
import {
  listAllSupportTickets,
  listPlatformTeamMembers,
  updateSupportTicket,
} from "@/lib/api";
import {
  SUPPORT_TICKET_STATUSES,
  type SupportTicket,
  type SupportTicketStatus,
} from "@/lib/support-tickets";
import type { PlatformTeamMember } from "@/lib/platform-team";
import { cn } from "@/lib/utils";

type ViewMode = "inbox" | "board";
type AssigneeFilter = "all" | "mine" | "unassigned";

export function TeamTicketsView() {
  const { profile, getIdToken } = useAuth();
  const currentMemberId = profile?.platformTeam?.id;

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [teamMembers, setTeamMembers] = useState<PlatformTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("inbox");
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<SupportTicketStatus | "all">(
    "all"
  );
  const [search, setSearch] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null
  );

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [{ tickets: nextTickets }, { members }] = await Promise.all([
        listAllSupportTickets(token),
        listPlatformTeamMembers(token),
      ]);
      setTickets(nextTickets);
      setTeamMembers(members);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load tickets");
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredTickets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (statusFilter !== "all" && ticket.status !== statusFilter) return false;
      if (assigneeFilter === "mine") {
        if (!currentMemberId || ticket.assignedToMemberId !== currentMemberId) {
          return false;
        }
      }
      if (assigneeFilter === "unassigned" && ticket.assignedToMemberId) {
        return false;
      }
      if (!query) return true;
      return (
        ticket.title.toLowerCase().includes(query) ||
        ticket.tenantName.toLowerCase().includes(query) ||
        ticket.userName.toLowerCase().includes(query) ||
        ticket.description.toLowerCase().includes(query)
      );
    });
  }, [tickets, statusFilter, assigneeFilter, search, currentMemberId]);

  const stats = useMemo(() => {
    const mine = currentMemberId
      ? tickets.filter((t) => t.assignedToMemberId === currentMemberId).length
      : 0;
    const open = tickets.filter((t) => t.status === "open").length;
    const unassigned = tickets.filter((t) => !t.assignedToMemberId).length;
    return { total: tickets.length, mine, open, unassigned };
  }, [tickets, currentMemberId]);

  function handleTicketUpdated(updated: SupportTicket) {
    setTickets((current) =>
      current.map((item) => (item.id === updated.id ? updated : item))
    );
    setSelectedTicket(updated);
  }

  async function handleStatusChange(ticketId: string, status: SupportTicketStatus) {
    const token = await getIdToken();
    if (!token) return;
    try {
      const { ticket } = await updateSupportTicket(token, ticketId, { status });
      handleTicketUpdated(ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not move ticket");
    }
  }

  return (
    <>
      <TeamPageHeader
        title="Feedback inbox"
        description="Triage customer feedback, assign owners, and track work from open to done."
      />

      <TeamPageContent>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TeamStatCard label="Total" value={stats.total} />
          <TeamStatCard label="Open" value={stats.open} tone="text-sky-700" />
          <TeamStatCard
            label="Assigned to me"
            value={stats.mine}
            tone="text-violet-800"
          />
          <TeamStatCard
            label="Unassigned"
            value={stats.unassigned}
            tone="text-amber-800"
          />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex rounded-xl border border-slate-200/80 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode("inbox")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                viewMode === "inbox"
                  ? "bg-brand-ink text-white"
                  : "text-brand-muted hover:text-brand-ink"
              )}
            >
              <Inbox className="size-4" />
              Inbox
            </button>
            <button
              type="button"
              onClick={() => setViewMode("board")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                viewMode === "board"
                  ? "bg-brand-ink text-white"
                  : "text-brand-muted hover:text-brand-ink"
              )}
            >
              <Kanban className="size-4" />
              Board
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-muted" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tickets…"
                className="h-10 rounded-xl pl-9"
              />
            </div>
            <Select
              value={assigneeFilter}
              onValueChange={(value) => {
                if (value) setAssigneeFilter(value as AssigneeFilter);
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-xl sm:w-[150px]">
                <LabeledSelectValue
                  value={assigneeFilter}
                  options={[
                    { value: "all", label: "All assignees" },
                    { value: "mine", label: "Assigned to me" },
                    { value: "unassigned", label: "Unassigned" },
                  ]}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assignees</SelectItem>
                <SelectItem value="mine">Assigned to me</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                if (value) {
                  setStatusFilter(value as SupportTicketStatus | "all");
                }
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-xl sm:w-[150px]">
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

        {error && (
          <p className="rounded-xl border border-destructive/30 bg-white px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200/80 bg-white py-24 text-sm text-brand-muted shadow-sm">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading tickets…
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200/80 bg-white px-6 py-20 text-center shadow-sm">
            <p className="text-sm font-medium text-brand-ink">No tickets match</p>
            <p className="mt-1 text-xs text-brand-muted">
              Try adjusting filters or wait for new shop submissions.
            </p>
          </div>
        ) : viewMode === "board" ? (
          <TeamTicketBoard
            tickets={filteredTickets}
            onOpenTicket={setSelectedTicket}
            onStatusChange={handleStatusChange}
          />
        ) : (
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <ul className="divide-y divide-slate-100">
              {filteredTickets.map((ticket) => (
                <li key={ticket.id}>
                  <TeamTicketListRow
                    ticket={ticket}
                    onOpen={setSelectedTicket}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </TeamPageContent>

      <TeamTicketDetailModal
        ticket={selectedTicket}
        open={selectedTicket !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTicket(null);
        }}
        teamMembers={teamMembers}
        currentMemberId={currentMemberId}
        getToken={getIdToken}
        onUpdated={handleTicketUpdated}
      />
    </>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Inbox, Loader2, UserRound } from "lucide-react";
import { TeamPageHeader } from "@/components/team/team-shell";
import {
  TeamPageContent,
  TeamSectionCard,
  TeamStatCard,
} from "@/components/team/team-page-content";
import { TeamTicketDetailModal } from "@/components/team/team-ticket-detail-modal";
import { TeamTicketListRow } from "@/components/team/team-ticket-card";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  listAllSupportTickets,
  listPlatformTeamMembers,
} from "@/lib/api";
import type { PlatformTeamMember } from "@/lib/platform-team";
import {
  supportTicketCategoryLabel,
  type SupportTicket,
} from "@/lib/support-tickets";
import { teamPortalPath } from "@/lib/team-portal";

export function TeamDashboardView() {
  const { profile, getIdToken } = useAuth();
  const currentMemberId = profile?.platformTeam?.id;

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [teamMembers, setTeamMembers] = useState<PlatformTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null
  );

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    setLoading(true);
    try {
      const [{ tickets: nextTickets }, { members }] = await Promise.all([
        listAllSupportTickets(token),
        listPlatformTeamMembers(token),
      ]);
      setTickets(nextTickets);
      setTeamMembers(members);
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const open = tickets.filter((t) => t.status === "open").length;
    const inReview = tickets.filter((t) => t.status === "in_review").length;
    const planned = tickets.filter((t) => t.status === "planned").length;
    const mine = currentMemberId
      ? tickets.filter((t) => t.assignedToMemberId === currentMemberId).length
      : 0;
    return { open, inReview, planned, total: tickets.length, mine };
  }, [tickets, currentMemberId]);

  const myTickets = useMemo(() => {
    if (!currentMemberId) return [];
    return tickets
      .filter((t) => t.assignedToMemberId === currentMemberId)
      .slice(0, 6);
  }, [tickets, currentMemberId]);

  const recent = tickets.slice(0, 5);

  function handleTicketUpdated(updated: SupportTicket) {
    setTickets((current) =>
      current.map((item) => (item.id === updated.id ? updated : item))
    );
    setSelectedTicket(updated);
  }

  return (
    <>
      <TeamPageHeader
        title="Team dashboard"
        description="Your internal command center for customer feedback and product triage."
        action={
          <Button
            className="rounded-lg bg-brand-ink hover:bg-brand-ink/90"
            nativeButton={false}
            render={<Link href={teamPortalPath("/tickets")} />}
          >
            Open feedback inbox
            <ArrowRight className="size-4" />
          </Button>
        }
      />

      <TeamPageContent>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <TeamStatCard label="Total feedback" value={stats.total} />
          <TeamStatCard label="Open" value={stats.open} tone="text-sky-700" />
          <TeamStatCard
            label="In review"
            value={stats.inReview}
            tone="text-amber-800"
          />
          <TeamStatCard
            label="Planned"
            value={stats.planned}
            tone="text-violet-800"
          />
          <TeamStatCard
            label="Assigned to me"
            value={stats.mine}
            hint="Tickets you own"
            tone="text-brand-primary"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <TeamSectionCard
            title="Assigned to me"
            description="Tickets currently owned by you"
            action={
              <Link
                href={teamPortalPath("/tickets")}
                className="text-sm font-medium text-brand-primary hover:underline"
              >
                View inbox
              </Link>
            }
          >
            <div className="p-2 sm:p-3">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-sm text-brand-muted">
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Loading…
                </div>
              ) : myTickets.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <UserRound className="mx-auto size-5 text-brand-muted" />
                  <p className="mt-3 text-sm text-brand-muted">
                    Nothing assigned to you yet — pick up tickets from the inbox.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {myTickets.map((ticket) => (
                    <li key={ticket.id}>
                      <TeamTicketListRow
                        ticket={ticket}
                        onOpen={setSelectedTicket}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TeamSectionCard>

          <TeamSectionCard
            title="Recent submissions"
            description="Latest feedback from shops"
            action={
              <Link
                href={teamPortalPath("/tickets")}
                className="text-sm font-medium text-brand-primary hover:underline"
              >
                View all
              </Link>
            }
          >
            <div className="p-2 sm:p-3">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-sm text-brand-muted">
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Loading…
                </div>
              ) : recent.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-brand-muted">
                  No feedback yet — submissions will appear here.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {recent.map((ticket) => (
                    <li key={ticket.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedTicket(ticket)}
                        className="flex w-full items-start justify-between gap-4 rounded-xl px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-brand-ink">
                            {ticket.title}
                          </p>
                          <p className="mt-0.5 text-xs text-brand-muted">
                            {ticket.tenantName} ·{" "}
                            {supportTicketCategoryLabel(ticket.category)}
                          </p>
                        </div>
                        <Inbox className="size-4 shrink-0 text-brand-muted" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TeamSectionCard>
        </div>
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

"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Bug,
  CheckCircle2,
  Clock3,
  Loader2,
  UserRound,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateSupportTicket } from "@/lib/api";
import type { PlatformTeamMember } from "@/lib/platform-team";
import {
  SUPPORT_TICKET_STATUSES,
  supportTicketCategoryLabel,
  supportTicketPriorityLabel,
  supportTicketStatusMeta,
  type SupportTicket,
  type SupportTicketStatus,
} from "@/lib/support-tickets";
import { cn } from "@/lib/utils";

function ActivityIcon({ type }: { type: SupportTicket["activity"][number]["type"] }) {
  if (type === "assigned" || type === "unassigned") {
    return <UserRound className="size-3.5 shrink-0 text-brand-primary" />;
  }
  if (type === "status_changed") {
    return <Clock3 className="size-3.5 shrink-0 text-amber-700" />;
  }
  return <CheckCircle2 className="size-3.5 shrink-0 text-brand-muted" />;
}

function resolveAssigneeLabel(
  assigneeId: string,
  members: PlatformTeamMember[],
  currentMemberId: string | undefined,
  fallbackName?: string
): string {
  if (assigneeId === "unassigned" || !assigneeId) return "Unassigned";
  const member = members.find((item) => item.id === assigneeId);
  if (member) {
    return member.id === currentMemberId ? `${member.name} (you)` : member.name;
  }
  if (fallbackName) return fallbackName;
  return "Unassigned";
}

export function TeamTicketDetailModal({
  ticket,
  open,
  onOpenChange,
  teamMembers,
  currentMemberId,
  getToken,
  onUpdated,
}: {
  ticket: SupportTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMembers: PlatformTeamMember[];
  currentMemberId?: string;
  getToken: () => Promise<string | null>;
  onUpdated: (ticket: SupportTicket) => void;
}) {
  const [draftStatus, setDraftStatus] = useState<SupportTicketStatus>("open");
  const [draftNote, setDraftNote] = useState("");
  const [draftAssignee, setDraftAssignee] = useState<string>("unassigned");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open || !ticket) return;
    setDraftStatus(ticket.status);
    setDraftNote(ticket.adminNote || "");
    setDraftAssignee(ticket.assignedToMemberId || "unassigned");
    setError(null);
    setSaved(false);
  }, [ticket?.id, open, ticket?.status, ticket?.assignedToMemberId, ticket?.adminNote]);

  const activity = useMemo(() => {
    if (!ticket?.activity?.length) return [];
    return [...ticket.activity].reverse();
  }, [ticket]);

  const headerStatus = useMemo(
    () => supportTicketStatusMeta(draftStatus),
    [draftStatus]
  );

  const assigneeDisplay = useMemo(
    () =>
      draftAssignee === "unassigned"
        ? "Unassigned"
        : resolveAssigneeLabel(
            draftAssignee,
            teamMembers,
            currentMemberId,
            ticket?.assignedToName
          ),
    [draftAssignee, teamMembers, currentMemberId, ticket?.assignedToName]
  );

  const assigneeSelectOptions = useMemo(() => {
    const active = teamMembers.filter((member) => member.status === "active");
    if (
      draftAssignee !== "unassigned" &&
      !active.some((member) => member.id === draftAssignee)
    ) {
      return [
        {
          id: draftAssignee,
          label: assigneeDisplay,
        },
        ...active.map((member) => ({
          id: member.id,
          label:
            member.id === currentMemberId
              ? `${member.name} (you)`
              : member.name,
        })),
      ];
    }

    return active.map((member) => ({
      id: member.id,
      label:
        member.id === currentMemberId ? `${member.name} (you)` : member.name,
    }));
  }, [teamMembers, draftAssignee, assigneeDisplay, currentMemberId]);

  async function handleSave() {
    if (!ticket) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");

      const { ticket: updated } = await updateSupportTicket(token, ticket.id, {
        status: draftStatus,
        adminNote: draftNote,
        assignedToMemberId:
          draftAssignee === "unassigned" ? null : draftAssignee,
      });
      setDraftStatus(updated.status);
      setDraftNote(updated.adminNote || "");
      setDraftAssignee(updated.assignedToMemberId || "unassigned");
      onUpdated(updated);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update ticket");
    } finally {
      setSaving(false);
    }
  }

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,820px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <div className="border-b border-slate-200/80 px-5 py-5 sm:px-6">
          <DialogHeader className="gap-3 text-left">
            <div className="flex items-start gap-3 pr-6">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                <Bug className="size-4 text-brand-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg leading-snug text-brand-ink">
                  {ticket.title}
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs text-brand-muted">
                  {supportTicketCategoryLabel(ticket.category)} ·{" "}
                  {supportTicketPriorityLabel(ticket.priority)} priority ·{" "}
                  {ticket.tenantName}
                </DialogDescription>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                  headerStatus.color
                )}
              >
                {headerStatus.label}
              </span>
            </div>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                Submitted by
              </p>
              <p className="mt-1 text-sm font-medium text-brand-ink">
                {ticket.userName}
              </p>
              <p className="text-xs text-brand-muted">{ticket.userEmail}</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                Assignee
              </p>
              <p className="mt-1 text-sm font-medium text-brand-ink">
                {assigneeDisplay}
              </p>
              {draftAssignee !== "unassigned" &&
                ticket.assignedToEmail &&
                draftAssignee === ticket.assignedToMemberId && (
                <p className="text-xs text-brand-muted">
                  {ticket.assignedToEmail}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200/80 bg-white px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
              Description
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-brand-ink">
              {ticket.description}
            </p>
          </div>

          {ticket.pageUrl && (
            <p className="mt-3 text-xs text-brand-muted">
              Page:{" "}
              <a
                href={ticket.pageUrl}
                target="_blank"
                rel="noreferrer"
                className="text-brand-primary hover:underline"
              >
                {ticket.pageUrl}
              </a>
            </p>
          )}

          {ticket.attachmentUrl && (
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                Attachment
              </p>
              <div className="inline-flex rounded-xl border border-slate-200/80 bg-slate-50 p-3">
                <div className="relative h-44 w-72">
                  <Image
                    src={ticket.attachmentUrl}
                    alt={ticket.attachmentName || "Attachment"}
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
                key={`status-${ticket.id}-${draftStatus}`}
                value={draftStatus}
                onValueChange={(value) => {
                  if (value) {
                    setDraftStatus(value as SupportTicketStatus);
                  }
                }}
              >
                <SelectTrigger className="h-11 w-full rounded-xl">
                  <SelectValue placeholder="Select status" />
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
            <div className="space-y-2">
              <Label>Assign to</Label>
              <Select
                value={draftAssignee}
                onValueChange={(value) => {
                  if (value) setDraftAssignee(value);
                }}
              >
                <SelectTrigger className="h-11 w-full rounded-xl">
                  <SelectValue placeholder="Unassigned">
                    {assigneeDisplay}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {assigneeSelectOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="team-admin-note">Internal note</Label>
            <textarea
              id="team-admin-note"
              value={draftNote}
              onChange={(event) => setDraftNote(event.target.value)}
              placeholder="Triage notes, planned release, workaround, etc."
              className="min-h-[96px] w-full rounded-xl border border-input bg-transparent px-3 py-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              maxLength={2000}
            />
          </div>

          {activity.length > 0 && (
            <div className="mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                Activity
              </p>
              <ul className="mt-3 space-y-3">
                {activity.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex gap-3 rounded-xl border border-slate-200/70 bg-slate-50/50 px-3 py-2.5"
                  >
                    <ActivityIcon type={entry.type} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-brand-ink">{entry.message}</p>
                      <p className="mt-0.5 text-[11px] text-brand-muted">
                        {new Date(entry.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-xl border border-destructive/30 bg-red-50 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200/80 bg-white px-5 py-4 sm:px-6">
          <p className="text-xs text-brand-muted">
            Updated{" "}
            {new Date(ticket.updatedAt).toLocaleString(undefined, {
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
              className="rounded-lg bg-brand-ink hover:bg-brand-ink/90"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

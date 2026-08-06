"use client";

import { useState } from "react";
import { Loader2, Trash2, UserPlus, Users } from "lucide-react";
import {
  inviteCustomerPortalReviewer,
  removeCustomerPortalReviewer,
  type CustomerPortalMember,
} from "@/lib/customer-portal-api";
import { dashboardCardClass } from "@/lib/dashboard-styles";

const inputClass =
  "h-11 w-full rounded-lg border border-[#ebebeb] bg-white px-3 text-[14px] text-[#303030] outline-none transition-shadow placeholder:text-[#b5b5b5] focus:border-[#2c6ecb] focus:ring-2 focus:ring-[#2c6ecb]/15";

const labelClass = "mb-1.5 block text-[13px] font-medium text-[#616161]";

export function PortalReviewersSection({
  members,
  canManage,
  accent,
  getAccessToken,
  onMembersChange,
}: {
  members: CustomerPortalMember[];
  canManage: boolean;
  accent: string;
  getAccessToken: () => Promise<string>;
  onMembersChange: (members: CustomerPortalMember[]) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  const sorted = [...members].sort((a, b) => {
    if (a.role !== b.role) return a.role === "owner" ? -1 : 1;
    return a.email.localeCompare(b.email);
  });

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    setLastInviteUrl(null);
    try {
      const token = await getAccessToken();
      const result = await inviteCustomerPortalReviewer(token, {
        email,
        name: name || undefined,
      });
      onMembersChange(result.members);
      setName("");
      setEmail("");
      if (result.email?.sent) {
        setMessage(`Invite sent to ${result.member.email}.`);
      } else {
        setMessage(
          result.email?.error ||
            result.email?.message ||
            "Reviewer added. Share the invite link if email didn’t send."
        );
        setLastInviteUrl(result.inviteUrl || result.email?.inviteUrl || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not invite reviewer.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(memberId: string) {
    if (!canManage) return;
    setRemovingId(memberId);
    setError(null);
    setMessage(null);
    try {
      const token = await getAccessToken();
      const result = await removeCustomerPortalReviewer(token, memberId);
      onMembersChange(result.members);
      setMessage("Reviewer removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove reviewer.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section className={dashboardCardClass}>
      <div className="flex items-start gap-3 border-b border-[#ebebeb] px-4 py-3 sm:px-5">
        <div
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f6f6f7]"
          style={{ color: accent }}
        >
          <Users className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-[#303030]">
            Portal reviewers
          </h2>
          <p className="mt-0.5 text-[13px] text-[#616161]">
            People who can sign in to review proofs, estimates, and invoices for
            this business.
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {error ? (
          <p className="rounded-lg bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-lg bg-[#eef6ff] px-3 py-2 text-[13px] text-[#1f4f8f]">
            {message}
          </p>
        ) : null}
        {lastInviteUrl ? (
          <p className="break-all rounded-lg border border-[#ebebeb] bg-[#fafafa] px-3 py-2 text-[12px] text-[#616161]">
            Invite link: {lastInviteUrl}
          </p>
        ) : null}

        <div className="divide-y divide-[#ebebeb] rounded-xl border border-[#ebebeb]">
          {sorted.length === 0 ? (
            <p className="px-4 py-5 text-[13px] text-[#8a8a8a]">
              No reviewers yet.
            </p>
          ) : (
            sorted.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-[#303030]">
                    {member.name}
                  </p>
                  <p className="truncate text-[12px] text-[#8a8a8a]">
                    {member.email}
                  </p>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-[#8a8a8a]">
                    {member.role === "owner" ? "Owner" : "Reviewer"} ·{" "}
                    {member.status === "active" ? "Active" : "Invite pending"}
                  </p>
                </div>
                {canManage && member.role !== "owner" ? (
                  <button
                    type="button"
                    onClick={() => void handleRemove(member.id)}
                    disabled={removingId === member.id}
                    className="flex size-9 items-center justify-center rounded-lg text-[#8f1f1f] hover:bg-[#fff1f1] disabled:opacity-50"
                    aria-label={`Remove ${member.email}`}
                  >
                    {removingId === member.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>

        {canManage ? (
          <form onSubmit={handleInvite} className="space-y-3 rounded-xl border border-dashed border-[#d8d8d8] p-4">
            <div className="flex items-center gap-2 text-[13px] font-medium text-[#303030]">
              <UserPlus className="size-4" style={{ color: accent }} />
              Invite another reviewer
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Name</label>
                <input
                  className={inputClass}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Jordan Lee"
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  required
                  className={inputClass}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="jordan@company.com"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-[13px] font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: accent }}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Send invite
            </button>
          </form>
        ) : (
          <p className="text-[13px] text-[#8a8a8a]">
            Only the account owner can invite or remove reviewers.
          </p>
        )}
      </div>
    </section>
  );
}

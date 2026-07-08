"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { TeamPageHeader } from "@/components/team/team-shell";
import { TeamPageContent } from "@/components/team/team-page-content";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  LabeledSelectValue,
  SelectTrigger,
} from "@/components/ui/select";
import {
  createPlatformTeamMember,
  listPlatformTeamMembers,
  removePlatformTeamMember,
  updatePlatformTeamMember,
} from "@/lib/api";
import type { PlatformTeamMember, PlatformTeamRole } from "@/lib/platform-team";
import { canManagePlatformTeam } from "@/lib/platform-team";
import { cn } from "@/lib/utils";

const ROLES: { value: PlatformTeamRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
];

export function TeamMembersView() {
  const { getIdToken, profile } = useAuth();
  const canManage = canManagePlatformTeam(profile);
  const [members, setMembers] = useState<PlatformTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<PlatformTeamRole>("member");

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const { members: next } = await listPlatformTeamMembers(token);
      setMembers(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load team members");
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      await createPlatformTeamMember(token, { email, name, role });
      setEmail("");
      setName("");
      setRole("member");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add team member");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(member: PlatformTeamMember, status: "active" | "disabled") {
    setSaving(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      await updatePlatformTeamMember(token, member.id, { status });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update member");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(member: PlatformTeamMember) {
    if (!window.confirm(`Remove ${member.email} from the FloPilot team?`)) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      await removePlatformTeamMember(token, member.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove member");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <TeamPageHeader
        title="Team members"
        description="Manage who can access the FloPilot team portal. Add company emails — any domain works."
      />

      <TeamPageContent>
        {canManage && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-2">
            <UserPlus className="size-4 text-brand-primary" />
            <h2 className="text-sm font-semibold text-brand-ink">Add team member</h2>
          </div>
          <form onSubmit={(e) => void handleAdd(e)} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="member-email">Email</Label>
              <Input
                id="member-email"
                type="email"
                placeholder="name@yourdomain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-name">Name</Label>
              <Input
                id="member-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(value) => {
                  if (value) setRole(value as PlatformTeamRole);
                }}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <LabeledSelectValue value={role} options={ROLES} />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                className="h-11 w-full rounded-lg bg-brand-ink hover:bg-brand-ink/90"
                disabled={saving}
              >
                Add member
              </Button>
            </div>
          </form>
        </section>
        )}

        {error && (
          <p className="rounded-xl border border-destructive/30 bg-white px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-200/80 px-5 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-brand-ink">Active roster</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-brand-muted">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading team…
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {members.map((member) => {
                const isSelf = profile?.platformTeam?.id === member.id;
                return (
                  <li
                    key={member.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div>
                      <p className="text-sm font-semibold text-brand-ink">
                        {member.name}
                        {isSelf && (
                          <span className="ml-2 text-xs font-medium text-brand-muted">
                            (you)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-brand-muted">{member.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
                        {member.role}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                          member.status === "active"
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-slate-100 text-brand-muted"
                        )}
                      >
                        {member.status}
                      </span>
                      {!isSelf && canManage && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            disabled={saving}
                            onClick={() =>
                              void handleStatusChange(
                                member,
                                member.status === "active" ? "disabled" : "active"
                              )
                            }
                          >
                            {member.status === "active" ? "Disable" : "Enable"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg text-destructive"
                            disabled={saving}
                            onClick={() => void handleRemove(member)}
                          >
                            Remove
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </TeamPageContent>
    </>
  );
}

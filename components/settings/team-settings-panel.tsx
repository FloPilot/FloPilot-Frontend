"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Copy,
  Loader2,
  Mail,
  MoreHorizontal,
  Shield,
  SlidersHorizontal,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { StaffAccessEditor } from "@/components/settings/staff-access-editor";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  cancelTeamInvite,
  inviteTeamMember,
  listTeamMembers,
  removeTeamMember,
  updateTeamMember,
  type TeamInvite,
  type TeamMember,
} from "@/lib/api";
import { summarizeStaffAccess, type StaffAccess } from "@/lib/staff-access";
import {
  getRoleLabel,
  STAFF_ROLE_OPTIONS,
  type StaffRole,
} from "@/lib/staff-roles";
import {
  normalizeStaffTags,
  STAFF_TAG_OPTIONS,
  staffTagLabel,
} from "@/lib/staff-tags";
import { cn } from "@/lib/utils";

function RoleBadge({ role }: { role: StaffRole }) {
  const styles: Record<StaffRole, string> = {
    admin: "bg-brand-primary/10 text-brand-primary border-brand-primary/15",
    manager: "bg-violet-50 text-violet-700 border-violet-100",
    production: "bg-amber-50 text-amber-700 border-amber-100",
    viewer: "bg-slate-50 text-slate-600 border-slate-200",
  };

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 rounded-md border font-medium", styles[role])}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {getRoleLabel(role)}
    </Badge>
  );
}

export function TeamSettingsPanel({ disabled }: { disabled?: boolean }) {
  const { profile, getIdToken } = useAuth();
  const { settings } = useShopSettings();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<StaffRole>("production");
  const [inviteAccess, setInviteAccess] = useState<StaffAccess | null>(null);
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    inviteUrl: string;
    emailSent: boolean;
    message?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [editRole, setEditRole] = useState<StaffRole>("production");
  const [editAccess, setEditAccess] = useState<StaffAccess | null>(null);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [savingAccess, setSavingAccess] = useState(false);

  const loadTeam = useCallback(async () => {
    if (disabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      const data = await listTeamMembers(token);
      setMembers(data.members);
      setInvites(data.invites);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load team");
    } finally {
      setLoading(false);
    }
  }, [disabled, getIdToken]);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  const handleInvite = async () => {
    setInviting(true);
    setError(null);
    setInviteResult(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      const result = await inviteTeamMember(token, {
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        role: inviteRole,
        access: inviteAccess,
      });
      setInviteResult({
        inviteUrl: result.inviteUrl,
        emailSent: result.email.sent,
        message: result.email.message || result.email.error,
      });
      await loadTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send invitation");
    } finally {
      setInviting(false);
    }
  };

  const openEditMember = (member: TeamMember) => {
    setEditMember(member);
    setEditRole(member.role);
    setEditAccess(member.access ?? null);
    setEditTags(normalizeStaffTags(member.tags));
  };

  const handleSaveAccess = async () => {
    if (!editMember) return;
    setSavingAccess(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      await updateTeamMember(token, editMember.id, {
        role: editRole,
        access: editAccess,
        tags: editTags,
      });
      setEditMember(null);
      await loadTeam();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update access"
      );
    } finally {
      setSavingAccess(false);
    }
  };

  const handleRemove = async (userId: string) => {
    setBusyId(userId);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      await removeTeamMember(token, userId);
      await loadTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove member");
    } finally {
      setBusyId(null);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    setBusyId(inviteId);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      await cancelTeamInvite(token, inviteId);
      await loadTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel invite");
    } finally {
      setBusyId(null);
    }
  };

  const resetInviteDialog = () => {
    setInviteOpen(false);
    setInviteName("");
    setInviteEmail("");
    setInviteRole("production");
    setInviteAccess(null);
    setInviteResult(null);
    setCopied(false);
  };

  if (disabled) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-slate-50/40 px-4 py-3 text-sm text-brand-muted">
        <Shield className="mt-0.5 size-4 shrink-0" />
        <p>Only shop admins can view and manage team members.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-brand-muted">
          <Users className="size-4" />
          {members.length} member{members.length !== 1 ? "s" : ""}
          {invites.length > 0 && (
            <span>· {invites.length} pending invite{invites.length !== 1 ? "s" : ""}</span>
          )}
        </div>
        <Button size="sm" onClick={() => setInviteOpen(true)}>
          <UserPlus className="size-4" />
          Invite teammate
        </Button>
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-8 justify-center text-sm text-brand-muted">
          <Loader2 className="size-4 animate-spin" />
          Loading team…
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member) => {
            const isSelf = profile?.type === "staff" && member.id === profile.user.id;
            const accessSummary = summarizeStaffAccess(
              member.role,
              member.access,
              settings.modules
            );
            return (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-white px-4 py-3"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-sm font-semibold text-brand-primary">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-brand-ink">
                      {member.name}
                      {isSelf && (
                        <span className="ml-1.5 text-xs font-normal text-brand-muted">
                          (you)
                        </span>
                      )}
                    </p>
                    <RoleBadge role={member.role} />
                    {normalizeStaffTags(member.tags).map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="rounded-md border-[#dbe6ff] bg-[#f4f7ff] px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide text-[#2c6ecb]"
                      >
                        {staffTagLabel(tag)}
                      </Badge>
                    ))}
                  </div>
                  <p className="truncate text-xs text-brand-muted">{member.email}</p>
                  {member.role !== "admin" && (
                    <p className="mt-1 text-xs text-brand-muted">{accessSummary}</p>
                  )}
                </div>
                {!isSelf && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      disabled={busyId === member.id}
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-brand-muted outline-none hover:bg-[#f1f1f1] hover:text-brand-ink disabled:opacity-50"
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => openEditMember(member)}>
                        <SlidersHorizontal className="size-4" />
                        Manage access
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => void handleRemove(member.id)}
                      >
                        Remove from team
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}

          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center gap-3 rounded-xl border border-dashed border-border/70 bg-slate-50/50 px-4 py-3"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-200/80 text-slate-600">
                <Mail className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-brand-ink">
                    {invite.name}
                  </p>
                  <RoleBadge role={invite.role} />
                  <Badge
                    variant="outline"
                    className="bg-muted text-[10px] uppercase tracking-wide text-muted-foreground"
                  >
                    Invited
                  </Badge>
                </div>
                <p className="truncate text-xs text-brand-muted">{invite.email}</p>
                {invite.role !== "admin" && invite.access?.areasCustomized && (
                  <p className="mt-1 text-xs text-brand-muted">
                    {summarizeStaffAccess(invite.role, invite.access, settings.modules)}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-xs"
                disabled={busyId === invite.id}
                onClick={() => void handleCancelInvite(invite.id)}
              >
                Cancel
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={inviteOpen} onOpenChange={(open) => !open && resetInviteDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite a teammate</DialogTitle>
            <DialogDescription>
              Choose their role and optionally customize which tabs they can see.
            </DialogDescription>
          </DialogHeader>

          {inviteResult ? (
            <div className="space-y-4 py-2">
              <div
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm",
                  inviteResult.emailSent
                    ? "border-emerald-200 bg-emerald-50/60 text-emerald-950"
                    : "border-amber-200 bg-amber-50/60 text-amber-950"
                )}
              >
                {inviteResult.emailSent
                  ? "Invitation email sent successfully."
                  : inviteResult.message ||
                    "Email is not configured — copy the invite link below and send it to your teammate."}
              </div>
              <div className="space-y-2">
                <Label>Invite link</Label>
                <div className="flex gap-2">
                  <Input readOnly value={inviteResult.inviteUrl} className="text-xs" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={async () => {
                      await navigator.clipboard.writeText(inviteResult.inviteUrl);
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={resetInviteDialog}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="grid max-h-[min(70vh,32rem)] gap-4 overflow-y-auto py-2 pr-1">
                <div className="space-y-2">
                  <Label htmlFor="invite-name">Full name</Label>
                  <Input
                    id="invite-name"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Jordan Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Work email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="jordan@yourshop.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(value) => {
                      const nextRole = (value as StaffRole) || "production";
                      setInviteRole(nextRole);
                      setInviteAccess(null);
                    }}
                  >
                    <SelectTrigger className="h-11 w-full rounded-xl">
                      <LabeledSelectValue
                        value={inviteRole}
                        options={STAFF_ROLE_OPTIONS}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {STAFF_ROLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div>
                            <span className="font-medium">{option.label}</span>
                            <span className="block text-xs text-brand-muted">
                              {option.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <StaffAccessEditor
                  role={inviteRole}
                  value={inviteAccess}
                  onChange={setInviteAccess}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetInviteDialog}>
                  Cancel
                </Button>
                <Button
                  disabled={inviting || !inviteName.trim() || !inviteEmail.trim()}
                  onClick={() => void handleInvite()}
                >
                  {inviting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Mail className="size-4" />
                      Send invitation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editMember)}
        onOpenChange={(open) => !open && setEditMember(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage access</DialogTitle>
            <DialogDescription>
              {editMember
                ? `Control what ${editMember.name} can see in the workspace.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {editMember && (
            <div className="grid max-h-[min(70vh,32rem)] gap-4 overflow-y-auto py-2 pr-1">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={editRole}
                  onValueChange={(value) => {
                    const nextRole = (value as StaffRole) || editMember.role;
                    setEditRole(nextRole);
                    if (nextRole === "admin") {
                      setEditAccess(null);
                    }
                  }}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl">
                    <LabeledSelectValue
                      value={editRole}
                      options={STAFF_ROLE_OPTIONS}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <span className="font-medium">{option.label}</span>
                          <span className="block text-xs text-brand-muted">
                            {option.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <StaffAccessEditor
                role={editRole}
                value={editAccess}
                onChange={setEditAccess}
              />
              <div className="space-y-2">
                <Label>Tags</Label>
                <p className="text-xs text-brand-muted">
                  Tag teammates for filtering and assignment pickers. Sales rep
                  tags appear in order rep dropdowns.
                </p>
                <div className="flex flex-wrap gap-2">
                  {STAFF_TAG_OPTIONS.map((option) => {
                    const checked = editTags.includes(option.id);
                    return (
                      <label
                        key={option.id}
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                          checked
                            ? "border-[#2c6ecb]/30 bg-[#f4f7fd] text-[#2c6ecb]"
                            : "border-border/60 bg-white text-brand-ink"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setEditTags((current) =>
                              checked
                                ? current.filter((tag) => tag !== option.id)
                                : normalizeStaffTags([...current, option.id])
                            );
                          }}
                          className="size-4 rounded border-[#c9c9c9]"
                        />
                        {option.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMember(null)}>
              Cancel
            </Button>
            <Button
              disabled={savingAccess}
              onClick={() => void handleSaveAccess()}
            >
              {savingAccess ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

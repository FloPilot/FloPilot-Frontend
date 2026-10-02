"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Building2,
  Check,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useWorkspaceScope } from "@/components/providers/workspace-scope-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { listStaffMembers, type AssignableStaffMember } from "@/lib/api";
import { listSalesRepCandidates } from "@/lib/staff-tags";
import {
  describeWorkspaceScope,
  type WorkspaceSalesRepFilter,
} from "@/lib/workspace-scope";
import {
  dashboardControlClass,
  dashboardSelectContentClass,
  dashboardSelectItemClass,
} from "@/lib/dashboard-styles";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function salesRepSelectValue(filter: WorkspaceSalesRepFilter) {
  if (filter.mode === "member") return `member:${filter.memberId}`;
  return filter.mode;
}

export function WorkspaceScopeBar() {
  const { getIdToken, profile } = useAuth();
  const { customers } = useSchedule();
  const {
    scope,
    presets,
    isActive,
    panelOpen,
    setSalesRep,
    setCustomer,
    clearScope,
    savePreset,
    deletePreset,
    applyPreset,
    setPanelOpen,
  } = useWorkspaceScope();

  const [members, setMembers] = useState<AssignableStaffMember[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [presetName, setPresetName] = useState("");

  useEffect(() => {
    if (profile?.type !== "staff") return;
    let cancelled = false;
    void (async () => {
      const token = await getIdToken();
      if (!token || cancelled) return;
      try {
        const { members: roster } = await listStaffMembers(token);
        if (!cancelled) setMembers(roster);
      } catch {
        if (!cancelled) setMembers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getIdToken, profile?.type]);

  const candidates = useMemo(
    () => listSalesRepCandidates(members),
    [members]
  );

  const customerOptions = useMemo(
    () =>
      [...customers]
        .filter((customer) => customer.archived !== true)
        .sort((a, b) => a.company.localeCompare(b.company)),
    [customers]
  );

  const labels = describeWorkspaceScope(scope);

  const salesRepValue = salesRepSelectValue(scope.salesRep);
  const memberFilter =
    scope.salesRep.mode === "member" ? scope.salesRep : null;
  const selectedMemberName = memberFilter
    ? candidates.find((m) => m.id === memberFilter.memberId)?.name ||
      memberFilter.memberName ||
      "Team member"
    : null;

  const salesRepLabel = memberFilter
    ? selectedMemberName || labels.salesRepLabel
    : labels.salesRepLabel;

  const handleSalesRepChange = (value: string | null) => {
    if (!value) return;
    if (value === "all") {
      setSalesRep({ mode: "all" });
      return;
    }
    if (value === "me") {
      setSalesRep({ mode: "me" });
      return;
    }
    if (value === "unassigned") {
      setSalesRep({ mode: "unassigned" });
      return;
    }
    if (value.startsWith("member:")) {
      const memberId = value.slice("member:".length);
      const member = candidates.find((entry) => entry.id === memberId);
      setSalesRep({
        mode: "member",
        memberId,
        memberName: member?.name,
      });
    }
  };

  const handleSavePreset = () => {
    const saved = savePreset(presetName.trim() || labels.summary);
    if (saved) {
      setSaveOpen(false);
      setPresetName("");
    }
  };

  if (profile?.type !== "staff") return null;

  return (
    <>
      <div
        className={cn(
          "relative z-30 grid shrink-0 transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          panelOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
        aria-hidden={!panelOpen}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              "flex flex-wrap items-center gap-2 border-b border-[#e3e3e3] px-3 py-2 sm:px-4",
              "origin-top transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              isActive ? "bg-[#f4f7fd]" : "bg-[#fafafa]",
              panelOpen
                ? "translate-y-0 opacity-100"
                : "pointer-events-none -translate-y-3 opacity-0"
            )}
          >
            <p className="hidden min-w-0 text-[12px] font-medium text-[#616161] sm:block">
              Workspace view
            </p>

            <Select value={salesRepValue} onValueChange={handleSalesRepChange}>
              <SelectTrigger
                className={cn(
                  dashboardControlClass,
                  "h-8 w-auto min-w-[9rem] gap-2 data-[size=default]:h-8",
                  scope.salesRep.mode !== "all" &&
                    "border-[#c4d7f2] bg-white text-[#2c6ecb]"
                )}
                tabIndex={panelOpen ? 0 : -1}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {scope.salesRep.mode === "me" ? (
                    <UserRound className="size-3.5 shrink-0" strokeWidth={1.75} />
                  ) : (
                    <Users
                      className="size-3.5 shrink-0 text-[#8a8a8a]"
                      strokeWidth={1.75}
                    />
                  )}
                  <SelectValue className="truncate">{salesRepLabel}</SelectValue>
                </span>
              </SelectTrigger>
              <SelectContent
                align="start"
                className={cn(dashboardSelectContentClass, "min-w-[220px]")}
              >
                <SelectItem value="all" className={dashboardSelectItemClass}>
                  All team
                </SelectItem>
                <SelectItem value="me" className={dashboardSelectItemClass}>
                  My work
                </SelectItem>
                <SelectItem
                  value="unassigned"
                  className={dashboardSelectItemClass}
                >
                  Unassigned
                </SelectItem>
                {candidates.map((member) => (
                  <SelectItem
                    key={member.id}
                    value={`member:${member.id}`}
                    className={dashboardSelectItemClass}
                  >
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={scope.customerId ?? "all"}
              onValueChange={(value) => {
                if (!value || value === "all") {
                  setCustomer(null);
                  return;
                }
                const customer = customerOptions.find(
                  (entry) => entry.id === value
                );
                setCustomer(value, customer?.company ?? null);
              }}
            >
              <SelectTrigger
                className={cn(
                  dashboardControlClass,
                  "h-8 w-auto min-w-[10rem] max-w-[16rem] gap-2 data-[size=default]:h-8",
                  scope.customerId && "border-[#c4d7f2] bg-white text-[#2c6ecb]"
                )}
                tabIndex={panelOpen ? 0 : -1}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Building2
                    className="size-3.5 shrink-0 text-[#8a8a8a]"
                    strokeWidth={1.75}
                  />
                  <SelectValue className="truncate">
                    {labels.customerLabel}
                  </SelectValue>
                </span>
              </SelectTrigger>
              <SelectContent
                align="start"
                className={cn(
                  dashboardSelectContentClass,
                  "max-h-72 min-w-[240px]"
                )}
              >
                <SelectItem value="all" className={dashboardSelectItemClass}>
                  All customers
                </SelectItem>
                {customerOptions.map((customer) => (
                  <SelectItem
                    key={customer.id}
                    value={customer.id}
                    className={dashboardSelectItemClass}
                  >
                    {customer.company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              {scope.salesRep.mode !== "me" ? (
                <button
                  type="button"
                  onClick={() => setSalesRep({ mode: "me" })}
                  className={cn(dashboardControlClass, "h-8 px-2.5 text-[12px]")}
                  tabIndex={panelOpen ? 0 : -1}
                >
                  <UserRound className="size-3.5" strokeWidth={1.75} />
                  My work
                </button>
              ) : null}

              {presets.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(
                      dashboardControlClass,
                      "h-8 px-2.5 text-[12px]"
                    )}
                    tabIndex={panelOpen ? 0 : -1}
                  >
                    <Bookmark
                      className="size-3.5 text-[#8a8a8a]"
                      strokeWidth={1.75}
                    />
                    Saved views
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className={cn(dashboardSelectContentClass, "min-w-[220px]")}
                  >
                    {presets.map((preset) => (
                      <DropdownMenuItem
                        key={preset.id}
                        className={cn(
                          dashboardSelectItemClass,
                          "flex items-center justify-between gap-2 pr-2"
                        )}
                        onClick={() => applyPreset(preset.id)}
                      >
                        <span className="min-w-0 truncate">{preset.name}</span>
                        <button
                          type="button"
                          className="shrink-0 rounded p-1 text-[#8a8a8a] hover:bg-[#f1f1f1] hover:text-[#303030]"
                          aria-label={`Delete ${preset.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            deletePreset(preset.id);
                          }}
                        >
                          <X className="size-3" />
                        </button>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  setPresetName(
                    scope.salesRep.mode === "me" && !scope.customerId
                      ? "My work"
                      : labels.summary.replace(/^Viewing · /, "")
                  );
                  setSaveOpen(true);
                }}
                className={cn(dashboardControlClass, "h-8 px-2.5 text-[12px]")}
                disabled={!isActive}
                tabIndex={panelOpen ? 0 : -1}
                title={
                  isActive
                    ? "Save this workspace filter as a quick view"
                    : "Set a filter first to save a view"
                }
              >
                <Check className="size-3.5 text-[#8a8a8a]" strokeWidth={1.75} />
                Save view
              </button>

              {isActive ? (
                <button
                  type="button"
                  onClick={clearScope}
                  className={cn(
                    dashboardControlClass,
                    "h-8 px-2.5 text-[12px] text-[#616161]"
                  )}
                  tabIndex={panelOpen ? 0 : -1}
                >
                  <X className="size-3.5" strokeWidth={1.75} />
                  Clear
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className={cn(
                  dashboardControlClass,
                  "size-8 justify-center px-0 text-[#616161]"
                )}
                aria-label="Hide workspace filters"
                tabIndex={panelOpen ? 0 : -1}
              >
                <X className="size-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-md">
          <DialogHeader className="border-b border-[#ebebeb] px-6 py-5">
            <DialogTitle className="text-[17px] font-semibold text-[#303030]">
              Save workspace view
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-[#616161]">
              Quick-switch back to this sales rep and customer filter from any
              screen. Saved on this device for your account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor="workspace-view-name">View name</Label>
              <Input
                id="workspace-view-name"
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
                placeholder="e.g. My accounts"
                className={dashboardControlClass}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSavePreset();
                  }
                }}
              />
            </div>
            <p className="rounded-lg border border-[#ebebeb] bg-[#fafafa] px-3 py-2 text-[12px] leading-relaxed text-[#616161]">
              {labels.summary}
            </p>
          </div>
          <DialogFooter className="border-t border-[#ebebeb] px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className={dashboardControlClass}
              onClick={() => setSaveOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-9 bg-brand-primary text-white hover:bg-brand-primary/90"
              onClick={handleSavePreset}
              disabled={!presetName.trim()}
            >
              Save view
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, LayoutGrid } from "lucide-react";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { Label } from "@/components/ui/label";
import {
  buildStaffAccessPayload,
  countEnabledAreas,
  getRoleDefaultAreas,
  normalizeStaffAccess,
  WORKSPACE_AREA_OPTIONS,
  type StaffAccess,
  type WorkspaceAreaKey,
} from "@/lib/staff-access";
import { getRoleLabel, type StaffRole } from "@/lib/staff-roles";
import { cn } from "@/lib/utils";

type StaffAccessEditorProps = {
  role: StaffRole;
  value?: StaffAccess | null;
  onChange: (access: StaffAccess | null) => void;
};

export function StaffAccessEditor({
  role,
  value,
  onChange,
}: StaffAccessEditorProps) {
  const { settings } = useShopSettings();
  const { machines } = useSchedule();
  const normalized = useMemo(
    () => normalizeStaffAccess(value, role),
    [value, role]
  );

  const [customized, setCustomized] = useState(normalized.areasCustomized);
  const [areas, setAreas] = useState(normalized.areas);
  const [machineIds, setMachineIds] = useState<string[]>(
    normalized.machineIds ?? []
  );
  const [limitMachines, setLimitMachines] = useState(
    Boolean(normalized.machineIds?.length)
  );

  useEffect(() => {
    const next = normalizeStaffAccess(value, role);
    setCustomized(next.areasCustomized);
    setAreas(next.areas);
    setMachineIds(next.machineIds ?? []);
    setLimitMachines(Boolean(next.machineIds?.length));
  }, [value, role]);

  const availableOptions = useMemo(
    () =>
      WORKSPACE_AREA_OPTIONS.filter(
        (option) =>
          !option.moduleKey || settings.modules[option.moduleKey] !== false
      ),
    [settings.modules]
  );

  const emitChange = (
    nextCustomized: boolean,
    nextAreas: Record<WorkspaceAreaKey, boolean>,
    nextLimitMachines: boolean,
    nextMachineIds: string[]
  ) => {
    onChange(
      buildStaffAccessPayload(
        role,
        nextCustomized,
        nextAreas,
        nextLimitMachines ? nextMachineIds : null
      )
    );
  };

  const toggleArea = (key: WorkspaceAreaKey) => {
    const nextAreas = { ...areas, [key]: !areas[key] };
    setAreas(nextAreas);
    emitChange(customized, nextAreas, limitMachines, machineIds);
  };

  const toggleMachine = (id: string) => {
    const next = machineIds.includes(id)
      ? machineIds.filter((item) => item !== id)
      : [...machineIds, id];
    setMachineIds(next);
    emitChange(customized, areas, limitMachines, next);
  };

  if (role === "admin") {
    return (
      <div className="rounded-xl border border-border/60 bg-slate-50/50 px-4 py-3 text-sm text-brand-muted">
        Admins always have full access to every area.
      </div>
    );
  }

  const enabledCount = countEnabledAreas(areas);
  const roleDefaults = getRoleDefaultAreas(role);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-slate-50/40 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-brand-ink">Customize access</p>
          <p className="mt-0.5 text-xs text-brand-muted">
            {customized
              ? `${enabledCount} area${enabledCount === 1 ? "" : "s"} enabled`
              : `Using ${getRoleLabel(role).toLowerCase()} defaults`}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={customized}
          onClick={() => {
            const nextCustomized = !customized;
            const nextAreas = nextCustomized ? { ...areas } : { ...roleDefaults };
            setCustomized(nextCustomized);
            setAreas(nextAreas);
            emitChange(nextCustomized, nextAreas, limitMachines, machineIds);
          }}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
            customized ? "bg-brand-primary" : "bg-slate-200"
          )}
        >
          <span
            className={cn(
              "inline-block size-4 rounded-full bg-white shadow transition-transform",
              customized ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      </div>

      {customized && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-brand-muted">
            <LayoutGrid className="size-3.5" />
            Visible tabs
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {availableOptions.map((option) => {
              const enabled = areas[option.key];
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => toggleArea(option.key)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                    enabled
                      ? "border-brand-primary/30 bg-brand-primary/5"
                      : "border-border/60 bg-white hover:bg-slate-50"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                      enabled
                        ? "border-brand-primary bg-brand-primary text-white"
                        : "border-slate-300 bg-white"
                    )}
                  >
                    {enabled && <Check className="size-2.5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-brand-ink">
                      {option.label}
                    </span>
                    <span className="block text-xs text-brand-muted">
                      {option.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(customized ? areas.machines : roleDefaults.machines) &&
        settings.modules.machines !== false && (
          <div className="space-y-3 rounded-xl border border-border/60 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="text-sm">Limit to specific stations</Label>
                <p className="text-xs text-brand-muted">
                  Optional — leave off to show every machine
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={limitMachines}
                onClick={() => {
                  const nextLimit = !limitMachines;
                  const nextIds = nextLimit ? machineIds : [];
                  setLimitMachines(nextLimit);
                  setMachineIds(nextIds);
                  emitChange(customized, areas, nextLimit, nextIds);
                }}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                  limitMachines ? "bg-brand-primary" : "bg-slate-200"
                )}
              >
                <span
                  className={cn(
                    "inline-block size-4 rounded-full bg-white shadow transition-transform",
                    limitMachines ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {limitMachines && (
              <div className="flex flex-wrap gap-2">
                {machines.length === 0 ? (
                  <p className="text-xs text-brand-muted">
                    No machines set up yet — add stations in Machines settings.
                  </p>
                ) : (
                  machines.map((machine) => {
                    const selected = machineIds.includes(machine.id);
                    return (
                      <button
                        key={machine.id}
                        type="button"
                        onClick={() => toggleMachine(machine.id)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          selected
                            ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                            : "border-border/70 bg-slate-50 text-brand-muted hover:text-brand-ink"
                        )}
                      >
                        {machine.name}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
    </div>
  );
}

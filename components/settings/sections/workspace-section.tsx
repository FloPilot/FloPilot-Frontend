"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  AdminLockNotice,
  SaveButton,
  SettingsError,
  SettingsHeader,
  SettingsMain,
  SettingsPanel,
  useSectionDraft,
} from "@/components/settings/settings-kit";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CORE_WORKSPACE_FEATURES,
  countEnabledModules,
  SHOP_MODULE_DEFINITIONS,
  SHOP_TIMEZONE_OPTIONS,
  type ShopModuleKey,
  type ShopModules,
} from "@/lib/shop-settings";
import { cn } from "@/lib/utils";

const MODULE_GROUPS = [
  { id: "operations", label: "Operations" },
  { id: "workspace", label: "Workspace" },
  { id: "customer", label: "Customer experience" },
] as const;

type WorkspaceDraft = {
  modules: ShopModules;
  timezone: string;
  taxRate: number;
};

function Switch({
  checked,
  onCheckedChange,
  disabled,
  id,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30",
        checked ? "bg-brand-primary" : "bg-[#d4d4d4]",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute top-0.5 inline-block size-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

export function WorkspaceSection() {
  const { settings, isAdmin, updateSettings } = useShopSettings();
  const { draft, setDraft, dirty } = useSectionDraft<WorkspaceDraft>({
    modules: settings.modules,
    timezone: settings.timezone,
    taxRate: settings.taxRate,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabledCount = countEnabledModules(draft.modules);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateSettings({
        modules: draft.modules,
        timezone: draft.timezone,
        taxRate: draft.taxRate,
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save workspace");
    } finally {
      setSaving(false);
    }
  };

  const setModule = (key: ShopModuleKey, enabled: boolean) =>
    setDraft((current) => ({
      ...current,
      modules: { ...current.modules, [key]: enabled },
    }));

  return (
    <SettingsMain>
      <SettingsHeader
        title="Workspace"
        description="Turn modules on or off and set regional defaults for scheduling and tax."
      >
        <SaveButton
          dirty={dirty}
          saving={saving}
          saved={saved}
          disabled={!isAdmin}
          onSave={() => void handleSave()}
        />
      </SettingsHeader>

      {!isAdmin && <AdminLockNotice />}
      {error && <SettingsError message={error} />}

      <SettingsPanel
        title="Modules"
        description={`${enabledCount} optional areas enabled — turn off what your shop doesn't use.`}
      >
        <div className="space-y-6">
          {MODULE_GROUPS.map((group) => {
            const modules = SHOP_MODULE_DEFINITIONS.filter(
              (item) => item.group === group.id
            );
            if (modules.length === 0) return null;
            return (
              <div key={group.id} className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8a8a]">
                  {group.label}
                </p>
                <ul className="space-y-2">
                  {modules.map((module) => {
                    const Icon = module.icon;
                    const enabled = draft.modules[module.key];
                    return (
                      <li
                        key={module.key}
                        className="flex items-start justify-between gap-4 rounded-lg border border-[#e3e3e3] bg-white px-4 py-3.5"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-lg",
                              enabled
                                ? "bg-[#eef1ff] text-brand-primary"
                                : "bg-[#f1f1f1] text-[#8a8a8a]"
                            )}
                          >
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#303030]">
                              {module.label}
                            </p>
                            <p className="mt-0.5 text-xs leading-relaxed text-[#616161]">
                              {module.description}
                            </p>
                          </div>
                        </div>
                        <Switch
                          id={`module-${module.key}`}
                          checked={enabled}
                          disabled={!isAdmin}
                          onCheckedChange={(next) => setModule(module.key, next)}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </SettingsPanel>

      <SettingsPanel
        title="Regional defaults"
        description="Used for scheduling and default tax calculations on new orders."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={draft.timezone}
              disabled={!isAdmin}
              onValueChange={(value) =>
                setDraft((c) => ({ ...c, timezone: value ?? c.timezone }))
              }
            >
              <SelectTrigger id="timezone" className="w-full">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {SHOP_TIMEZONE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax-rate">Default tax rate</Label>
            <div className="relative">
              <Input
                id="tax-rate"
                type="number"
                min={0}
                max={100}
                step={0.01}
                disabled={!isAdmin}
                value={Number((draft.taxRate * 100).toFixed(2))}
                onChange={(e) => {
                  const pct = Number(e.target.value);
                  setDraft((c) => ({
                    ...c,
                    taxRate: Number.isFinite(pct)
                      ? Math.min(100, Math.max(0, pct)) / 100
                      : c.taxRate,
                  }));
                }}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#8a8a8a]">
                %
              </span>
            </div>
          </div>
        </div>
      </SettingsPanel>

      <SettingsPanel
        title="Always included"
        description="Core workflow — these stay on for every shop."
      >
        <ul className="grid gap-2 sm:grid-cols-2">
          {CORE_WORKSPACE_FEATURES.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-2 rounded-lg border border-[#cdeede] bg-[#f0fbf5] px-3 py-2.5 text-sm text-[#1f6b46]"
            >
              <CheckCircle2 className="size-4 shrink-0 text-[#2f9e6b]" />
              {feature}
            </li>
          ))}
        </ul>
      </SettingsPanel>
    </SettingsMain>
  );
}

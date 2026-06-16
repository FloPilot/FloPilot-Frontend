"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import { BrandingSettingsPanel } from "@/components/settings/branding-settings-panel";
import { TeamSettingsPanel } from "@/components/settings/team-settings-panel";
import { StaffHeader } from "@/components/layout/staff-header";
import { useAuth } from "@/components/providers/auth-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { Button } from "@/components/ui/button";
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
  type ShopSettings,
} from "@/lib/shop-settings";
import { cn } from "@/lib/utils";

function SettingsPanel({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-white/80 bg-white shadow-sm",
        className
      )}
    >
      <div className="border-b border-border/50 px-5 py-4 sm:px-6">
        <h2 className="text-sm font-semibold text-brand-ink">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-brand-muted">{description}</p>
        )}
      </div>
      <div className="px-5 py-4 sm:px-6">{children}</div>
    </section>
  );
}

function SettingsSwitch({
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
        checked ? "bg-brand-primary" : "bg-border",
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

const COMING_SOON = [
  {
    title: "Pricing & services",
    description: "Decoration matrices for screen print, embroidery, and DTF.",
  },
  {
    title: "Integrations",
    description: "QuickBooks, Stripe, Shippo, and vendor catalogs.",
  },
] as const;

const MODULE_GROUPS = [
  { id: "operations", label: "Operations" },
  { id: "workspace", label: "Workspace" },
  { id: "customer", label: "Customer experience" },
] as const;

export function ShopSettingsView() {
  const { profile } = useAuth();
  const { settings, isAdmin, updateSettings } = useShopSettings();

  const [draft, setDraft] = useState<ShopSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(settings),
    [draft, settings]
  );

  const enabledCount = countEnabledModules(draft.modules);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateSettings({
        shopName: draft.shopName,
        email: draft.email,
        phone: draft.phone,
        timezone: draft.timezone,
        taxRate: draft.taxRate,
        modules: draft.modules,
        branding: draft.branding,
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const setModule = (key: ShopModuleKey, enabled: boolean) => {
    setDraft((current) => ({
      ...current,
      modules: { ...current.modules, [key]: enabled },
    }));
  };

  return (
    <>
      <StaffHeader
        title="Settings"
        description="Brand your workspace, manage modules, and regional defaults"
        action={
          <div className="flex items-center gap-2">
            {saved && (
              <span className="hidden items-center gap-1.5 text-xs font-medium text-emerald-700 sm:inline-flex">
                <CheckCircle2 className="size-3.5" />
                Saved
              </span>
            )}
            <Button
              className="rounded-full"
              size="sm"
              disabled={!isDirty || saving || !isAdmin}
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
        }
      />

      <main className="flex-1 space-y-5 p-4 sm:space-y-6 sm:p-6 lg:p-8">
        {!isAdmin && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/50 px-4 py-3 text-sm text-amber-950">
            <Lock className="mt-0.5 size-4 shrink-0" />
            <p>
              Only shop admins can change settings. You can review what&apos;s
              enabled, but changes require an admin account.
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-white px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] xl:gap-6">
          <div className="space-y-5 sm:space-y-6">
            <SettingsPanel
              title="Brand & appearance"
              description="Your logo and colors — make the app feel like your shop"
            >
              <BrandingSettingsPanel
                branding={draft.branding}
                shopName={draft.shopName}
                disabled={!isAdmin}
                onChange={(branding) =>
                  setDraft((current) => ({ ...current, branding }))
                }
              />
            </SettingsPanel>

            <SettingsPanel
              title="Shop profile"
              description="Shown on quotes, invoices, and customer communications"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="shop-name">Shop name</Label>
                  <Input
                    id="shop-name"
                    value={draft.shopName}
                    disabled={!isAdmin}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        shopName: event.target.value,
                      }))
                    }
                    placeholder={profile?.type === "staff" ? profile.tenant.name : "Your shop"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shop-email">Contact email</Label>
                  <Input
                    id="shop-email"
                    type="email"
                    value={draft.email}
                    disabled={!isAdmin}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="hello@yourshop.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shop-phone">Phone</Label>
                  <Input
                    id="shop-phone"
                    value={draft.phone}
                    disabled={!isAdmin}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </SettingsPanel>

            <SettingsPanel
              title="Workspace modules"
              description={`${enabledCount} optional areas enabled — turn off what your shop doesn't use`}
            >
              <div className="space-y-6">
                {MODULE_GROUPS.map((group) => {
                  const modules = SHOP_MODULE_DEFINITIONS.filter(
                    (item) => item.group === group.id
                  );
                  if (modules.length === 0) return null;

                  return (
                    <div key={group.id} className="space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                        {group.label}
                      </p>
                      <ul className="space-y-2">
                        {modules.map((module) => {
                          const Icon = module.icon;
                          const enabled = draft.modules[module.key];

                          return (
                            <li
                              key={module.key}
                              className={cn(
                                "flex items-start justify-between gap-4 rounded-xl border px-4 py-3.5 transition-colors",
                                enabled
                                  ? "border-border/60 bg-slate-50/40"
                                  : "border-border/50 bg-white"
                              )}
                            >
                              <div className="flex min-w-0 items-start gap-3">
                                <div
                                  className={cn(
                                    "flex size-9 shrink-0 items-center justify-center rounded-xl",
                                    enabled
                                      ? "bg-brand-primary/10 text-brand-primary"
                                      : "bg-slate-100 text-brand-muted"
                                  )}
                                >
                                  <Icon className="size-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-brand-ink">
                                    {module.label}
                                  </p>
                                  <p className="mt-0.5 text-xs leading-relaxed text-brand-muted">
                                    {module.description}
                                  </p>
                                </div>
                              </div>
                              <SettingsSwitch
                                id={`module-${module.key}`}
                                checked={enabled}
                                disabled={!isAdmin}
                                onCheckedChange={(next) =>
                                  setModule(module.key, next)
                                }
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
              title="Team & permissions"
              description="Invite staff and control what each person can access"
            >
              <TeamSettingsPanel disabled={!isAdmin} />
            </SettingsPanel>
          </div>

          <div className="space-y-5 sm:space-y-6">
            <SettingsPanel
              title="Regional defaults"
              description="Used for scheduling and tax calculations"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={draft.timezone}
                    disabled={!isAdmin}
                    onValueChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        timezone: value ?? current.timezone,
                      }))
                    }
                  >
                    <SelectTrigger id="timezone" className="h-11 w-full rounded-xl">
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
                      onChange={(event) => {
                        const pct = Number(event.target.value);
                        setDraft((current) => ({
                          ...current,
                          taxRate: Number.isFinite(pct)
                            ? Math.min(100, Math.max(0, pct)) / 100
                            : current.taxRate,
                        }));
                      }}
                      className="pr-8"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-brand-muted">
                      %
                    </span>
                  </div>
                </div>
              </div>
            </SettingsPanel>

            <SettingsPanel
              title="Always included"
              description="Core workflow — these stay on for every shop"
            >
              <ul className="space-y-2">
                {CORE_WORKSPACE_FEATURES.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 rounded-xl border border-emerald-200/70 bg-emerald-50/40 px-3 py-2.5 text-sm text-emerald-950"
                  >
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-700" />
                    {feature}
                  </li>
                ))}
              </ul>
            </SettingsPanel>

            <SettingsPanel
              title="Customer portal"
              description="Portal access is controlled here and per customer"
            >
              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-slate-50/40 px-4 py-3">
                <Globe
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    draft.modules.customerPortal
                      ? "text-brand-primary"
                      : "text-brand-muted"
                  )}
                />
                <div>
                  <p className="text-sm font-medium text-brand-ink">
                    {draft.modules.customerPortal
                      ? "Portal enabled shop-wide"
                      : "Portal disabled shop-wide"}
                  </p>
                  <p className="mt-1 text-xs text-brand-muted">
                    When off, customers cannot sign in even if portal access is
                    enabled on their profile.
                  </p>
                </div>
              </div>
            </SettingsPanel>

            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Sparkles className="size-4 text-brand-muted" />
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
                  Coming soon
                </p>
              </div>
              {COMING_SOON.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-dashed border-border/70 bg-slate-50/30 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-brand-ink">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-brand-muted">
                        {item.description}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                      <Clock className="size-3" />
                      Soon
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

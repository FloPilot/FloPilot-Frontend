"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Palette,
  Sparkles,
  Store,
  Upload,
} from "lucide-react";
import { BrandingSettingsPanel } from "@/components/settings/branding-settings-panel";
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
  SHOP_TIMEZONE_OPTIONS,
  type ShopSettings,
} from "@/lib/shop-settings";
import { brandSurfaceFromPrimary } from "@/lib/tenant-branding";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "welcome", label: "Welcome" },
  { id: "profile", label: "Shop details" },
  { id: "brand", label: "Brand kit" },
  { id: "done", label: "All set" },
] as const;

type BrandOnboardingWizardProps = {
  onComplete: () => void;
  onSkip: () => void;
};

export function BrandOnboardingWizard({
  onComplete,
  onSkip,
}: BrandOnboardingWizardProps) {
  const { profile } = useAuth();
  const { settings, updateSettings } = useShopSettings();

  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<ShopSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = STEPS[stepIndex].id;
  const userEmail = profile?.type === "staff" ? profile.user.email : "";
  const adminName =
    profile?.type === "staff" ? profile.user.name?.trim() : "";

  useEffect(() => {
    setDraft((current) => ({
      ...settings,
      email: settings.email || userEmail,
      shopName: settings.shopName || current.shopName,
    }));
  }, [settings, userEmail]);

  const previewColor = draft.branding.primaryColor;
  const previewSurface = brandSurfaceFromPrimary(previewColor);

  const canGoBack = stepIndex > 0;
  const isLastStep = step === "done";
  const isWelcome = step === "welcome";

  const stepMeta = useMemo(() => {
    switch (step) {
      case "welcome":
        return {
          title: adminName
            ? `Welcome, ${adminName.split(" ")[0]}`
            : "Welcome to FloPilot",
          description: `Let's set up ${draft.shopName || "your shop"} in a few quick steps — logo, colors, and contact details so your workspace feels like home.`,
        };
      case "profile":
        return {
          title: "Shop contact details",
          description:
            "These show up on quotes, invoices, and customer communications.",
        };
      case "brand":
        return {
          title: "Brand your workspace",
          description:
            "Upload your logo and pick an accent color. You'll see a live preview of the sidebar.",
        };
      case "done":
        return {
          title: "You're ready to go",
          description:
            "Your workspace is configured. You can change any of this later in Settings.",
        };
      default:
        return { title: "", description: "" };
    }
  }, [step, adminName, draft.shopName]);

  async function finishOnboarding() {
    setSaving(true);
    setError(null);
    try {
      await updateSettings({
        shopName: draft.shopName,
        email: draft.email,
        phone: draft.phone,
        timezone: draft.timezone,
        branding: draft.branding,
        onboarding: { setupCompleted: true },
      });
      onComplete();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save your setup"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    setSaving(true);
    setError(null);
    try {
      await updateSettings({
        onboarding: { setupCompleted: true },
      });
      onSkip();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not continue");
    } finally {
      setSaving(false);
    }
  }

  function handleNext() {
    if (isLastStep) {
      void finishOnboarding();
      return;
    }
    setStepIndex((index) => Math.min(index + 1, STEPS.length - 1));
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-brand-ink/50 backdrop-blur-md"
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-setup-title"
        className="relative flex max-h-[min(92vh,880px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl"
      >
        <div
          className="relative overflow-hidden border-b border-border/40 px-6 pb-5 pt-6 sm:px-8 sm:pt-8"
          style={{
            background: `linear-gradient(165deg, ${previewSurface} 0%, #ffffff 55%)`,
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            aria-hidden
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-muted shadow-sm">
                <Sparkles className="size-3 text-brand-primary" />
                First-time setup
              </p>
              <h2
                id="shop-setup-title"
                className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-brand-ink sm:text-[1.75rem]"
              >
                {stepMeta.title}
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-brand-muted">
                {stepMeta.description}
              </p>
            </div>
            {!isWelcome && (
              <button
                type="button"
                className="shrink-0 pt-1 text-xs text-brand-muted underline-offset-2 hover:text-brand-ink hover:underline disabled:opacity-50"
                disabled={saving}
                onClick={() => void handleSkip()}
              >
                Skip for now
              </button>
            )}
          </div>

          <div className="relative mt-6 flex items-center gap-2">
            {STEPS.map((item, index) => {
              const active = index === stepIndex;
              const complete = index < stepIndex;
              return (
                <div key={item.id} className="flex flex-1 items-center gap-2">
                  <div
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-all",
                      complete
                        ? "bg-brand-primary text-white"
                        : active
                          ? "bg-brand-ink text-white shadow-sm"
                          : "bg-white/90 text-brand-muted ring-1 ring-border/80"
                    )}
                  >
                    {complete ? <CheckCircle2 className="size-3.5" /> : index + 1}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "h-px flex-1",
                        complete ? "bg-brand-primary/50" : "bg-border/70"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <p className="relative mt-2 text-xs text-brand-muted">
            Step {stepIndex + 1} of {STEPS.length} · {STEPS[stepIndex].label}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          {error && (
            <p className="mb-4 rounded-xl border border-destructive/30 bg-red-50 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {step === "welcome" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/50 bg-slate-50/80 p-5">
                <div className="flex items-center gap-4">
                  <div
                    className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-sm"
                    style={{ backgroundColor: previewColor }}
                  >
                    {(draft.shopName || "S").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-brand-ink">
                      {draft.shopName || "Your shop"}
                    </p>
                    <p className="text-sm text-brand-muted">
                      Admin workspace · {userEmail}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { icon: Store, label: "Shop profile" },
                  { icon: Palette, label: "Brand colors" },
                  { icon: Upload, label: "Logo upload" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-xl border border-border/50 bg-white px-4 py-3"
                  >
                    <item.icon className="size-4 shrink-0 text-brand-primary" />
                    <span className="text-sm font-medium text-brand-ink">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-center text-xs text-brand-muted">
                About 2 minutes · only shown to shop admins
              </p>
            </div>
          )}

          {step === "profile" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="onboarding-shop-name">Shop name</Label>
                <Input
                  id="onboarding-shop-name"
                  value={draft.shopName}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      shopName: event.target.value,
                    }))
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboarding-email">Contact email</Label>
                <Input
                  id="onboarding-email"
                  type="email"
                  value={draft.email}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboarding-phone">Phone</Label>
                <Input
                  id="onboarding-phone"
                  type="tel"
                  value={draft.phone}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="(555) 123-4567"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Timezone</Label>
                <Select
                  value={draft.timezone}
                  onValueChange={(value) => {
                    if (!value) return;
                    setDraft((current) => ({ ...current, timezone: value }));
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
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
            </div>
          )}

          {step === "brand" && (
            <BrandingSettingsPanel
              branding={draft.branding}
              shopName={draft.shopName}
              onChange={(branding) =>
                setDraft((current) => ({ ...current, branding }))
              }
            />
          )}

          {step === "done" && (
            <div className="mx-auto max-w-sm text-center">
              <div
                className="rounded-2xl border border-border/50 p-6"
                style={{
                  background: `linear-gradient(180deg, ${previewSurface} 0%, #ffffff 100%)`,
                }}
              >
                <div className="mx-auto flex max-w-xs flex-col items-center gap-3 rounded-2xl border border-border/50 bg-white px-5 py-6 shadow-sm">
                  {draft.branding.logoUrl &&
                  draft.branding.logoDisplay === "full" ? (
                    <div className="relative h-12 w-40">
                      <Image
                        src={draft.branding.logoUrl}
                        alt=""
                        fill
                        unoptimized
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div
                      className="relative flex size-16 items-center justify-center overflow-hidden rounded-2xl text-xl font-bold text-white"
                      style={{ backgroundColor: previewColor }}
                    >
                      {draft.branding.logoUrl ? (
                        <Image
                          src={draft.branding.logoUrl}
                          alt=""
                          fill
                          unoptimized
                          className="object-contain bg-white p-1"
                        />
                      ) : (
                        (draft.shopName || "S").slice(0, 1).toUpperCase()
                      )}
                    </div>
                  )}
                  <div>
                    <p className="text-base font-semibold text-brand-ink">
                      {draft.shopName || "Your shop"}
                    </p>
                    <p className="text-xs text-brand-muted">
                      {draft.email || userEmail}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/50 bg-white px-6 py-4 sm:px-8">
          {!isWelcome ? (
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              disabled={!canGoBack || saving}
              onClick={() => setStepIndex((index) => Math.max(index - 1, 0))}
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
          ) : (
            <div />
          )}

          <Button
            type="button"
            className="rounded-xl bg-brand-ink px-6 hover:bg-brand-ink/90"
            disabled={saving}
            onClick={() => void handleNext()}
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : isWelcome ? (
              <>
                Get started
                <ArrowRight className="size-4" />
              </>
            ) : isLastStep ? (
              <>
                Open dashboard
                <CheckCircle2 className="size-4" />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

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
  { id: "profile", label: "Shop profile" },
  { id: "brand", label: "Brand kit" },
  { id: "done", label: "Finish" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

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
  const userEmail =
    profile?.type === "staff" ? profile.user.email : "";

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

  const stepTitle = useMemo(() => {
    switch (step) {
      case "welcome":
        return "Your workspace is ready";
      case "profile":
        return "Shop contact details";
      case "brand":
        return "Make it yours";
      case "done":
        return "You're all set";
      default:
        return "";
    }
  }, [step]);

  const stepDescription = useMemo(() => {
    switch (step) {
      case "welcome":
        return `Welcome to FloPilot${draft.shopName ? `, ${draft.shopName}` : ""}. Let's personalize your workspace so it feels like home for your team.`;
      case "profile":
        return "These details appear on quotes, invoices, and customer communications.";
      case "brand":
        return "Pick your brand color and upload a logo. You'll see a live preview of how it looks in the sidebar.";
      case "done":
        return "Your branded workspace is ready. You can update any of this later in Settings.";
      default:
        return "";
    }
  }, [step, draft.shopName]);

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
        onboarding: { brandKitCompleted: true },
      });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your brand kit");
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    setSaving(true);
    setError(null);
    try {
      await updateSettings({
        onboarding: { brandKitCompleted: true },
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
        className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm"
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="brand-onboarding-title"
        className="relative flex max-h-[min(92vh,860px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl"
      >
        <div
          className="border-b border-border/50 px-5 py-4 sm:px-6"
          style={{
            background: `linear-gradient(180deg, ${previewSurface} 0%, #ffffff 100%)`,
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-muted">
                <Sparkles className="size-3.5" />
                Brand setup
              </p>
              <h2
                id="brand-onboarding-title"
                className="mt-1 text-xl font-semibold text-brand-ink sm:text-2xl"
              >
                {stepTitle}
              </h2>
              <p className="mt-1 max-w-xl text-sm text-brand-muted">
                {stepDescription}
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 text-xs text-brand-muted underline-offset-2 hover:text-brand-ink hover:underline disabled:opacity-50"
              disabled={saving}
              onClick={() => void handleSkip()}
            >
              Skip for now
            </button>
          </div>

          <div className="mt-5 flex items-center gap-2">
            {STEPS.map((item, index) => {
              const active = index === stepIndex;
              const complete = index < stepIndex;
              return (
                <div key={item.id} className="flex flex-1 items-center gap-2">
                  <div
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                      complete
                        ? "bg-brand-primary text-white"
                        : active
                          ? "bg-brand-ink text-white"
                          : "bg-white text-brand-muted ring-1 ring-border"
                    )}
                  >
                    {complete ? <CheckCircle2 className="size-4" /> : index + 1}
                  </div>
                  <span
                    className={cn(
                      "hidden text-xs font-medium sm:inline",
                      active ? "text-brand-ink" : "text-brand-muted"
                    )}
                  >
                    {item.label}
                  </span>
                  {index < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "hidden h-px flex-1 sm:block",
                        complete ? "bg-brand-primary/40" : "bg-border"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {error && (
            <p className="mb-4 rounded-xl border border-destructive/30 bg-red-50 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {step === "welcome" && (
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: Store,
                  title: "Shop profile",
                  text: "Add contact details for quotes and customer emails.",
                },
                {
                  icon: Palette,
                  title: "Brand colors",
                  text: "Set your accent color across buttons, links, and the workspace.",
                },
                {
                  icon: Sparkles,
                  title: "Logo & sidebar",
                  text: "Upload your logo and choose how it appears in navigation.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-border/60 bg-slate-50/80 p-4"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-white shadow-sm">
                    <item.icon className="size-5 text-brand-primary" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-brand-ink">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-brand-muted">
                    {item.text}
                  </p>
                </div>
              ))}
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
            <div className="mx-auto max-w-md text-center">
              <div
                className="mx-auto rounded-2xl border border-border/60 p-6"
                style={{
                  background: `linear-gradient(180deg, ${previewSurface} 0%, #ffffff 100%)`,
                }}
              >
                <div className="mx-auto flex max-w-xs flex-col items-center gap-3 rounded-xl border border-border/50 bg-white px-4 py-5">
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
                      className="relative flex size-14 items-center justify-center overflow-hidden rounded-2xl text-lg font-bold text-white"
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
              <p className="mt-5 text-sm text-brand-muted">
                Head to your dashboard to start managing orders and production.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/50 bg-white px-5 py-4 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            className="rounded-lg"
            disabled={!canGoBack || saving}
            onClick={() => setStepIndex((index) => Math.max(index - 1, 0))}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>

          <Button
            type="button"
            className="rounded-lg bg-brand-ink px-5 hover:bg-brand-ink/90"
            disabled={saving}
            onClick={() => void handleNext()}
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : isLastStep ? (
              <>
                Go to dashboard
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

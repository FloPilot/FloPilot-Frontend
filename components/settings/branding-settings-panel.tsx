"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TenantBranding } from "@/lib/tenant-branding";
import {
  BRAND_COLOR_PRESETS,
  brandSurfaceFromPrimary,
  isValidHexColor,
  LOGO_DISPLAY_OPTIONS,
  readImageFileAsDataUrl,
} from "@/lib/tenant-branding";
import { cn } from "@/lib/utils";

export function BrandingSettingsPanel({
  branding,
  shopName,
  disabled,
  onChange,
}: {
  branding: TenantBranding;
  shopName: string;
  disabled?: boolean;
  onChange: (branding: TenantBranding) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [readingLogo, setReadingLogo] = useState(false);

  const handleLogoPick = async (file: File | undefined) => {
    if (!file) return;
    setReadingLogo(true);
    setLogoError(null);
    const { dataUrl, error } = await readImageFileAsDataUrl(file);
    setReadingLogo(false);
    if (error) {
      setLogoError(error);
      return;
    }
    onChange({ ...branding, logoUrl: dataUrl });
  };

  const customColor = isValidHexColor(branding.primaryColor)
    ? branding.primaryColor
    : BRAND_COLOR_PRESETS[0].color;
  const previewSurface = brandSurfaceFromPrimary(customColor);

  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl border border-border/60 p-5 shadow-sm"
        style={{
          background: `linear-gradient(180deg, ${previewSurface} 0%, #ffffff 100%)`,
        }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
          Live preview
        </p>
        <div className="mt-4 space-y-3 rounded-xl border border-border/50 bg-white px-4 py-3">
          {branding.logoUrl && branding.logoDisplay === "full" ? (
            <div className="flex items-center justify-between gap-3">
              <div className="relative h-10 min-w-0 flex-1 max-w-[200px]">
                <Image
                  src={branding.logoUrl}
                  alt="Sidebar preview"
                  fill
                  unoptimized
                  className="object-contain object-left"
                />
              </div>
              <span
                className="hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white sm:inline"
                style={{ backgroundColor: customColor }}
              >
                Button
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div
                className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl text-white"
                style={{ backgroundColor: customColor }}
              >
                {branding.logoUrl ? (
                  <Image
                    src={branding.logoUrl}
                    alt=""
                    fill
                    unoptimized
                    className="object-contain bg-white p-0.5"
                  />
                ) : (
                  <span className="text-sm font-bold">
                    {(shopName || "Shop").slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-brand-ink">
                  {shopName.trim() || "Your shop name"}
                </p>
                <p className="text-xs text-brand-muted">Sidebar header</p>
              </div>
              <span
                className="ml-auto hidden rounded-full px-2.5 py-1 text-[10px] font-semibold text-white sm:inline"
                style={{ backgroundColor: customColor }}
              >
                Button
              </span>
            </div>
          )}
          <p className="text-[11px] text-brand-muted">Sidebar header preview</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Brand color</Label>
          <p className="mt-0.5 text-xs text-brand-muted">
            Updates buttons, links, accents, and the workspace background tint.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {BRAND_COLOR_PRESETS.map((preset) => {
            const active = branding.primaryColor === preset.color;
            return (
              <button
                key={preset.color}
                type="button"
                disabled={disabled}
                title={preset.name}
                onClick={() =>
                  onChange({ ...branding, primaryColor: preset.color })
                }
                className={cn(
                  "size-9 rounded-full border-2 transition-transform hover:scale-105",
                  active
                    ? "border-brand-ink ring-2 ring-brand-primary/30"
                    : "border-white shadow-sm"
                )}
                style={{ backgroundColor: preset.color }}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="custom-brand-color">Custom hex</Label>
            <div className="flex items-center gap-2">
              <input
                id="custom-brand-color"
                type="color"
                disabled={disabled}
                value={customColor}
                onChange={(event) =>
                  onChange({ ...branding, primaryColor: event.target.value })
                }
                className="h-11 w-14 cursor-pointer rounded-xl border border-border bg-white p-1"
              />
              <Input
                value={branding.primaryColor}
                disabled={disabled}
                onChange={(event) => {
                  const value = event.target.value.trim();
                  if (value.startsWith("#")) {
                    onChange({ ...branding, primaryColor: value });
                  }
                }}
                placeholder="#2762ff"
                className="h-11 w-32 rounded-xl font-mono text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Shop logo</Label>
          <p className="mt-0.5 text-xs text-brand-muted">
            Shown in the top-left sidebar. PNG or SVG with transparent background
            works best.
          </p>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          disabled={disabled}
          onChange={(event) => {
            void handleLogoPick(event.target.files?.[0]);
            event.target.value = "";
          }}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-full bg-white"
            disabled={disabled || readingLogo}
            onClick={() => fileRef.current?.click()}
          >
            {readingLogo ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
            Upload logo
          </Button>
          {branding.logoUrl && (
            <Button
              type="button"
              variant="ghost"
              className="rounded-full text-destructive hover:bg-destructive/10"
              disabled={disabled}
              onClick={() => onChange({ ...branding, logoUrl: "" })}
            >
              <Trash2 className="size-4" />
              Remove
            </Button>
          )}
        </div>

        {logoError && (
          <p className="text-xs text-destructive">{logoError}</p>
        )}

        {branding.logoUrl && (
          <>
            <div className="inline-flex rounded-xl border border-border/60 bg-white p-3">
              <div className="relative h-12 w-32">
                <Image
                  src={branding.logoUrl}
                  alt="Logo preview"
                  fill
                  unoptimized
                  className="object-contain"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <Label>Sidebar display</Label>
              <p className="text-xs text-brand-muted">
                Choose how your logo appears in the top-left navigation.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {LOGO_DISPLAY_OPTIONS.map((option) => {
                  const active = branding.logoDisplay === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        onChange({ ...branding, logoDisplay: option.value })
                      }
                      className={cn(
                        "rounded-xl border px-4 py-3 text-left transition-colors",
                        active
                          ? "border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary/20"
                          : "border-border/60 bg-white hover:bg-slate-50"
                      )}
                    >
                      <p className="text-sm font-medium text-brand-ink">
                        {option.label}
                      </p>
                      <p className="mt-0.5 text-xs text-brand-muted">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

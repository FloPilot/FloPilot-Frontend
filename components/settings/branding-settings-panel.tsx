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
  isValidHexColor,
  readImageFileAsDataUrl,
} from "@/lib/tenant-branding";
import { cn } from "@/lib/utils";

export function BrandingSettingsPanel({
  branding,
  disabled,
  onChange,
}: {
  branding: TenantBranding;
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

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div>
          <Label>Brand color</Label>
          <p className="mt-0.5 text-xs text-brand-muted">
            Applied to your customer-facing estimates and proof emails.
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

      <div className="space-y-3">
        <div>
          <Label>Shop logo</Label>
          <p className="mt-0.5 text-xs text-brand-muted">
            PNG or SVG with a transparent background works best.
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
              className="text-destructive hover:bg-destructive/10"
              disabled={disabled}
              onClick={() => onChange({ ...branding, logoUrl: "" })}
            >
              <Trash2 className="size-4" />
              Remove
            </Button>
          )}
        </div>

        {logoError && <p className="text-xs text-destructive">{logoError}</p>}

        {branding.logoUrl && (
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
        )}
      </div>
    </div>
  );
}

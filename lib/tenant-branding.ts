export type LogoDisplayMode = "badge" | "full";

export type TenantBranding = {
  primaryColor: string;
  logoUrl: string;
  /** badge = logo in a rounded icon beside shop name; full = logo only in the header */
  logoDisplay: LogoDisplayMode;
};

export const PLATFORM_NAME = "FloPilot.io";
export const PLATFORM_URL = "https://flopilot.io";
export const PLATFORM_TAGLINE = "Print shop operations";

export const DEFAULT_PRIMARY_COLOR = "#2762ff";
export const DEFAULT_BRAND_SURFACE = "#dfe8f5";

export const DEFAULT_TENANT_BRANDING: TenantBranding = {
  primaryColor: DEFAULT_PRIMARY_COLOR,
  logoUrl: "",
  logoDisplay: "badge",
};

export const LOGO_DISPLAY_OPTIONS: {
  value: LogoDisplayMode;
  label: string;
  description: string;
}[] = [
  {
    value: "badge",
    label: "Icon + name",
    description: "Logo in a rounded badge with your shop name beside it",
  },
  {
    value: "full",
    label: "Full logo",
    description: "Your logo spans the sidebar header — no extra text",
  },
];

export const BRAND_COLOR_PRESETS = [
  { name: "FloPilot Blue", color: "#2762ff" },
  { name: "Ocean", color: "#0ea5e9" },
  { name: "Teal", color: "#0d9488" },
  { name: "Emerald", color: "#059669" },
  { name: "Violet", color: "#7c3aed" },
  { name: "Rose", color: "#e11d48" },
  { name: "Amber", color: "#d97706" },
  { name: "Slate", color: "#475569" },
] as const;

const LOGO_MAX_BYTES = 400_000;

export function isValidHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function normalizeTenantBranding(
  raw?: Partial<TenantBranding> | null
): TenantBranding {
  const input = raw ?? {};
  return {
    primaryColor:
      typeof input.primaryColor === "string" &&
      isValidHexColor(input.primaryColor)
        ? input.primaryColor
        : DEFAULT_TENANT_BRANDING.primaryColor,
    logoUrl:
      typeof input.logoUrl === "string" ? input.logoUrl.trim() : "",
    logoDisplay:
      input.logoDisplay === "full" || input.logoDisplay === "badge"
        ? input.logoDisplay
        : DEFAULT_TENANT_BRANDING.logoDisplay,
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel)))
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;
}

export function darkenHex(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 - amount / 100;
  return rgbToHex(r * factor, g * factor, b * factor);
}

export function lightenHex(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = amount / 100;
  return rgbToHex(
    r + (255 - r) * factor,
    g + (255 - g) * factor,
    b + (255 - b) * factor
  );
}

export function rgbaFromHex(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Blend two hex colors; `weight` is the proportion of `hexB` (0–1). */
export function mixHex(hexA: string, hexB: string, weight: number): string {
  const w = Math.max(0, Math.min(1, weight));
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex(
    a.r * (1 - w) + b.r * w,
    a.g * (1 - w) + b.g * w,
    a.b * (1 - w) + b.b * w
  );
}

/** Light workspace tint derived from the brand color (~12% primary, rest white). */
export function brandSurfaceFromPrimary(hex: string): string {
  return mixHex(hex, "#ffffff", 0.88);
}

export const BRANDING_CSS_VAR_KEYS = [
  "--brand-primary",
  "--brand-primary-hover",
  "--brand-blue",
  "--brand-surface",
  "--brand-glow",
  "--background",
  "--gradient-soft",
  "--primary",
  "--accent",
  "--border",
  "--input",
  "--ring",
  "--selection-bg",
  "--sidebar-primary",
  "--sidebar-accent",
  "--sidebar-border",
  "--sidebar-ring",
  "--chart-1",
  "--chart-2",
  "--chart-5",
] as const;

export function getBrandingCssVars(
  branding: TenantBranding
): Record<string, string> {
  const primary = branding.primaryColor;
  const hover = darkenHex(primary, 12);
  const accent = lightenHex(primary, 8);
  const surface = brandSurfaceFromPrimary(primary);

  return {
    "--brand-primary": primary,
    "--brand-primary-hover": hover,
    "--brand-blue": accent,
    "--brand-surface": surface,
    "--brand-glow": rgbaFromHex(primary, 0.1),
    "--background": surface,
    "--gradient-soft": `linear-gradient(180deg, ${surface} 0%, #ffffff 100%)`,
    "--primary": primary,
    "--accent": rgbaFromHex(primary, 0.08),
    "--border": rgbaFromHex(primary, 0.14),
    "--input": rgbaFromHex(primary, 0.18),
    "--ring": rgbaFromHex(primary, 0.35),
    "--selection-bg": rgbaFromHex(primary, 0.22),
    "--sidebar-primary": primary,
    "--sidebar-accent": rgbaFromHex(primary, 0.08),
    "--sidebar-border": rgbaFromHex(primary, 0.12),
    "--sidebar-ring": rgbaFromHex(primary, 0.35),
    "--chart-1": primary,
    "--chart-2": accent,
    "--chart-5": surface,
  };
}

export const BRANDING_STYLE_ID = "flopilot-tenant-branding";

export function brandingVarsToCss(vars: Record<string, string>): string {
  let css = ":root{";
  for (const [key, value] of Object.entries(vars)) {
    css += `${key}:${value};`;
  }
  return `${css}}`;
}

/** Injects :root CSS vars via a <style> tag (avoids mutating <html> and hydration mismatches). */
export function applyBrandingCssVars(vars: Record<string, string>): void {
  if (typeof document === "undefined") return;

  const css = brandingVarsToCss(vars);
  let el = document.getElementById(BRANDING_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = BRANDING_STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

export function applyTenantBrandingToDocument(branding: TenantBranding): void {
  applyBrandingCssVars(getBrandingCssVars(branding));
}

export function resetTenantBrandingOnDocument(): void {
  if (typeof document === "undefined") return;

  document.getElementById(BRANDING_STYLE_ID)?.remove();

  // Clean up legacy inline styles from an older bootstrap that set html.style directly.
  const root = document.documentElement;
  for (const prop of BRANDING_CSS_VAR_KEYS) {
    root.style.removeProperty(prop);
  }
}

export async function readImageFileAsDataUrl(
  file: File
): Promise<{ dataUrl: string; error?: string }> {
  const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
  if (!allowed.includes(file.type)) {
    return {
      dataUrl: "",
      error: "Use PNG, JPG, WebP, or SVG.",
    };
  }

  if (file.size > LOGO_MAX_BYTES) {
    return {
      dataUrl: "",
      error: "Logo must be under 400 KB.",
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result.startsWith("data:image/")) {
        resolve({ dataUrl: "", error: "Could not read image file." });
        return;
      }
      resolve({ dataUrl: result });
    };
    reader.onerror = () =>
      resolve({ dataUrl: "", error: "Could not read image file." });
    reader.readAsDataURL(file);
  });
}

export function getDisplayShopName(
  settingsShopName: string,
  tenantName?: string
): string {
  return settingsShopName.trim() || tenantName?.trim() || "Your shop";
}

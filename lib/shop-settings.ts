import {
  DEFAULT_TENANT_BRANDING,
  normalizeTenantBranding,
  type TenantBranding,
} from "@/lib/tenant-branding";
import type { LucideIcon } from "lucide-react";

export type { TenantBranding };
import {
  BarChart3,
  ClipboardList,
  Factory,
  FileImage,
  Globe,
  Package,
  Wrench,
} from "lucide-react";

export type ShopModuleKey =
  | "inventory"
  | "artwork"
  | "productionTasks"
  | "reports"
  | "machines"
  | "customerPortal"
  | "quotes";

export type ShopModules = Record<ShopModuleKey, boolean>;

export type ShopOnboarding = {
  brandKitCompleted: boolean;
};

export type ShopSettings = {
  shopName: string;
  email: string;
  phone: string;
  timezone: string;
  taxRate: number;
  modules: ShopModules;
  branding: TenantBranding;
  onboarding: ShopOnboarding;
};

export const SHOP_MODULE_KEYS: ShopModuleKey[] = [
  "inventory",
  "artwork",
  "productionTasks",
  "reports",
  "machines",
  "customerPortal",
  "quotes",
];

export const DEFAULT_SHOP_MODULES: ShopModules = {
  inventory: true,
  artwork: true,
  productionTasks: true,
  reports: true,
  machines: true,
  customerPortal: true,
  quotes: true,
};

export const DEFAULT_SHOP_ONBOARDING: ShopOnboarding = {
  brandKitCompleted: false,
};

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  shopName: "",
  email: "",
  phone: "",
  timezone: "America/Los_Angeles",
  taxRate: 0.08,
  modules: { ...DEFAULT_SHOP_MODULES },
  branding: { ...DEFAULT_TENANT_BRANDING },
  onboarding: { ...DEFAULT_SHOP_ONBOARDING },
};

export type ShopModuleDefinition = {
  key: ShopModuleKey;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Primary nav route hidden when disabled */
  href?: string;
  group: "operations" | "customer" | "workspace";
};

export const SHOP_MODULE_DEFINITIONS: ShopModuleDefinition[] = [
  {
    key: "inventory",
    label: "Inventory",
    description:
      "Track blanks, consumables, and low-stock alerts on the dashboard.",
    icon: Package,
    href: "/app/inventory",
    group: "operations",
  },
  {
    key: "artwork",
    label: "Artwork & proofs",
    description:
      "Proof queue, mockups, and customer approval workflow on orders.",
    icon: FileImage,
    href: "/app/artwork",
    group: "operations",
  },
  {
    key: "productionTasks",
    label: "Production tasks",
    description:
      "Department task board for work outside calendar production events.",
    icon: Factory,
    href: "/app/production",
    group: "operations",
  },
  {
    key: "machines",
    label: "Floor stations",
    description:
      "Machine stations, barcode scanning, and live job runs on the floor.",
    icon: Wrench,
    href: "/app/machines",
    group: "operations",
  },
  {
    key: "reports",
    label: "Reports",
    description: "Sales, production, and customer analytics.",
    icon: BarChart3,
    href: "/app/reports",
    group: "workspace",
  },
  {
    key: "customerPortal",
    label: "Customer portal",
    description:
      "Let customers sign in to view orders, approve proofs, and send messages.",
    icon: Globe,
    group: "customer",
  },
  {
    key: "quotes",
    label: "Quotes & drafts",
    description:
      "Draft quotes and customer approval before converting to sales orders.",
    icon: ClipboardList,
    group: "customer",
  },
];

export const CORE_WORKSPACE_FEATURES = [
  "Dashboard overview",
  "Orders & production events",
  "Customers",
  "Production calendar",
] as const;

const TIMEZONE_OPTIONS = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Phoenix",
  "Pacific/Honolulu",
] as const;

export const SHOP_TIMEZONE_OPTIONS = TIMEZONE_OPTIONS.map((value) => ({
  value,
  label: value.replace("America/", "").replace("_", " "),
}));

export function normalizeShopOnboarding(
  raw?: Partial<ShopOnboarding> | null
): ShopOnboarding {
  const input = raw ?? {};
  return {
    brandKitCompleted: input.brandKitCompleted === true,
  };
}

export function normalizeShopSettings(raw?: Partial<ShopSettings> | null): ShopSettings {
  const input = raw ?? {};
  const hasOnboardingField =
    raw &&
    typeof raw === "object" &&
    Object.prototype.hasOwnProperty.call(raw, "onboarding");

  const modules = { ...DEFAULT_SHOP_MODULES };
  if (input.modules) {
    for (const key of SHOP_MODULE_KEYS) {
      if (typeof input.modules[key] === "boolean") {
        modules[key] = input.modules[key];
      }
    }
  }

  return {
    shopName:
      typeof input.shopName === "string"
        ? input.shopName.trim()
        : DEFAULT_SHOP_SETTINGS.shopName,
    email:
      typeof input.email === "string"
        ? input.email.trim()
        : DEFAULT_SHOP_SETTINGS.email,
    phone:
      typeof input.phone === "string"
        ? input.phone.trim()
        : DEFAULT_SHOP_SETTINGS.phone,
    timezone:
      typeof input.timezone === "string" && input.timezone.trim()
        ? input.timezone.trim()
        : DEFAULT_SHOP_SETTINGS.timezone,
    taxRate:
      typeof input.taxRate === "number" && Number.isFinite(input.taxRate)
        ? Math.min(1, Math.max(0, input.taxRate))
        : DEFAULT_SHOP_SETTINGS.taxRate,
    modules,
    branding: normalizeTenantBranding(input.branding),
    onboarding: hasOnboardingField
        ? normalizeShopOnboarding(input.onboarding)
        : { brandKitCompleted: true },
  };
}

export function isModuleEnabled(
  settings: ShopSettings | null | undefined,
  moduleKey: ShopModuleKey
): boolean {
  if (!settings) return DEFAULT_SHOP_MODULES[moduleKey];
  return settings.modules[moduleKey] !== false;
}

export function countEnabledModules(modules: ShopModules): number {
  return SHOP_MODULE_KEYS.filter((key) => modules[key]).length;
}

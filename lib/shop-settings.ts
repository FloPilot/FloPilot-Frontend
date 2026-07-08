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
  Warehouse,
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
  /** False until the shop admin finishes (or skips) the first-run setup wizard. */
  setupCompleted: boolean;
};

export type CompanyAddress = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type CompanyProfile = {
  legalName: string;
  description: string;
  website: string;
  currency: string;
  taxId: string;
  address: CompanyAddress;
};

export type PricingRow = {
  minQty: number;
  /** Per-unit price for each column, aligned to `PricingMethod.columns`. */
  prices: number[];
};

export type PricingMethod = {
  id: string;
  name: string;
  unit: string;
  notes: string;
  /** Column headers, e.g. ["1 COLOR", "2 COLOR"] or ["Price"]. */
  columns: string[];
  rows: PricingRow[];
};

export type PricingMatrix = {
  enabled: boolean;
  methods: PricingMethod[];
  /** Shop-wide setup, finishing, and other order fee presets */
  contractFees?: import("@/types").CustomerContractFee[];
  /** Default markup % applied to blank/garment shop cost on quotes and orders */
  blankMarkupPercent?: number;
};

export type SqueegeeOption = {
  value: string;
  label: string;
};

export type ScreenSizePreset = {
  id: string;
  label: string;
  widthIn: number;
  heightIn: number;
  notes: string;
};

/** DTF transfer imprint areas — priced via the pricing matrix size columns */
export type DtfImprintAreaPreset = {
  id: string;
  label: string;
  widthIn: number;
  heightIn: number;
  notes: string;
};

export type MeshPreset = {
  mesh: number;
  label: string;
  notes: string;
};

export type InkTypeOption = {
  value: string;
  label: string;
};

export type PrintLocationOption = {
  value: string;
  label: string;
};

export type DtfTransferTypeOption = {
  value: string;
  label: string;
};

export type FinishingStepPreset = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
};

export type ShopWarehouse = {
  id: string;
  name: string;
  code: string;
  description: string;
  isDefault: boolean;
};

export type ShopProductionDefaults = {
  /** Extra squeegee types beyond Soft / Medium / Hard */
  squeegeeOptions?: SqueegeeOption[];
  /** Shop screen frame sizes for scheduling and order setup */
  screenSizes?: ScreenSizePreset[];
  /** DTF imprint areas for proofs and pricing matrix size tiers */
  dtfImprintAreas?: DtfImprintAreaPreset[];
  /** Custom DTF transfer types beyond built-in cold / hot peel */
  dtfTransferTypes?: DtfTransferTypeOption[];
  /** Common mesh counts used on the floor */
  meshPresets?: MeshPreset[];
  /** Custom ink types beyond built-in defaults */
  inkTypes?: InkTypeOption[];
  /** Print locations for decoration events on orders */
  printLocations?: PrintLocationOption[];
  /** Finishing steps offered (bagging, labeling, etc.) */
  finishingSteps?: FinishingStepPreset[];
};

export type ShopSettings = {
  shopName: string;
  email: string;
  phone: string;
  timezone: string;
  taxRate: number;
  modules: ShopModules;
  branding: TenantBranding;
  companyProfile: CompanyProfile;
  pricingMatrix: PricingMatrix;
  productionDefaults: ShopProductionDefaults;
  warehouses: ShopWarehouse[];
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
  setupCompleted: false,
};

export const DEFAULT_COMPANY_ADDRESS: CompanyAddress = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  legalName: "",
  description: "",
  website: "",
  currency: "USD",
  taxId: "",
  address: { ...DEFAULT_COMPANY_ADDRESS },
};

export const DEFAULT_PRICING_MATRIX: PricingMatrix = {
  enabled: false,
  methods: [],
  blankMarkupPercent: 0,
};

export const DEFAULT_PRODUCTION_DEFAULTS: ShopProductionDefaults = {
  squeegeeOptions: [],
  screenSizes: [],
  dtfImprintAreas: [],
  dtfTransferTypes: [],
  meshPresets: [],
  inkTypes: [],
  printLocations: [],
  finishingSteps: [],
};

export const DEFAULT_WAREHOUSES: ShopWarehouse[] = [];

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  shopName: "",
  email: "",
  phone: "",
  timezone: "America/Los_Angeles",
  taxRate: 0.08,
  modules: { ...DEFAULT_SHOP_MODULES },
  branding: { ...DEFAULT_TENANT_BRANDING },
  companyProfile: {
    ...DEFAULT_COMPANY_PROFILE,
    address: { ...DEFAULT_COMPANY_ADDRESS },
  },
  pricingMatrix: { enabled: false, methods: [], blankMarkupPercent: 0 },
  productionDefaults: { ...DEFAULT_PRODUCTION_DEFAULTS },
  warehouses: [],
  onboarding: { ...DEFAULT_SHOP_ONBOARDING },
};

export const SHOP_CURRENCY_OPTIONS = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "MXN", label: "MXN — Mexican Peso" },
] as const;

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
    label: "Warehouse",
    description:
      "Stock levels, blank receiving, and purchase orders for the shop.",
    icon: Warehouse,
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
  raw?: Partial<ShopOnboarding> & { brandKitCompleted?: boolean } | null,
  shopProfile?: Pick<ShopSettings, "email" | "phone" | "branding">
): ShopOnboarding {
  const input = raw ?? {};

  if (input.setupCompleted === true) return { setupCompleted: true };
  if (input.setupCompleted === false) return { setupCompleted: false };

  // Legacy field (inverted semantics)
  if (input.brandKitCompleted === true) return { setupCompleted: true };
  if (input.brandKitCompleted === false) return { setupCompleted: false };

  if (shopProfile && isLikelyFreshShop(shopProfile)) {
    return { setupCompleted: false };
  }

  return { setupCompleted: true };
}

function isLikelyFreshShop(
  profile: Pick<ShopSettings, "email" | "phone" | "branding">
) {
  const hasContact = Boolean(profile.email?.trim() || profile.phone?.trim());
  const hasCustomLogo = Boolean(profile.branding?.logoUrl?.trim());
  return !hasContact && !hasCustomLogo;
}

export function needsShopSetup(settings: ShopSettings): boolean {
  return !settings.onboarding.setupCompleted;
}

function cleanStr(value: unknown, max = 280): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function normalizeCompanyProfile(
  raw?: Partial<CompanyProfile> | null
): CompanyProfile {
  const input = raw ?? {};
  const address = (input.address ?? {}) as Partial<CompanyAddress>;
  const currency = cleanStr(input.currency, 8).toUpperCase();
  return {
    legalName: cleanStr(input.legalName),
    description: cleanStr(input.description, 2000),
    website: cleanStr(input.website, 2048),
    currency: currency || DEFAULT_COMPANY_PROFILE.currency,
    taxId: cleanStr(input.taxId, 64),
    address: {
      line1: cleanStr(address.line1),
      line2: cleanStr(address.line2),
      city: cleanStr(address.city),
      state: cleanStr(address.state),
      postalCode: cleanStr(address.postalCode),
      country: cleanStr(address.country),
    },
  };
}

function toPrice(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function normalizePricingMatrix(
  raw?: Partial<PricingMatrix> | null
): PricingMatrix {
  const input = raw ?? {};
  const methods = Array.isArray(input.methods)
    ? input.methods.slice(0, 40).map((method, index) => {
        const m = (method ?? {}) as Partial<PricingMethod> & {
          tiers?: { minQty?: number; price?: number }[];
        };

        let columns = Array.isArray(m.columns)
          ? m.columns.slice(0, 40).map((c) => cleanStr(c, 60))
          : [];
        if (columns.length === 0) columns = ["Price"];
        const colCount = columns.length;

        const rawRows = Array.isArray(m.rows)
          ? m.rows
          : Array.isArray(m.tiers)
            ? m.tiers
            : [];

        const rows = rawRows
          .slice(0, 60)
          .map((row) => {
            const r = (row ?? {}) as {
              minQty?: number;
              prices?: unknown[];
              price?: unknown;
            };
            const minQty = Number(r.minQty);
            let prices = Array.isArray(r.prices)
              ? r.prices.map(toPrice)
              : r.price !== undefined
                ? [toPrice(r.price)]
                : [];
            prices = prices.slice(0, colCount);
            while (prices.length < colCount) prices.push(0);
            return {
              minQty:
                Number.isFinite(minQty) && minQty > 0 ? Math.floor(minQty) : 1,
              prices,
            };
          })
          .sort((a, b) => a.minQty - b.minQty);

        return {
          id: cleanStr(m.id, 64) || `method-${index}`,
          name: cleanStr(m.name, 80),
          unit: cleanStr(m.unit, 40) || "per piece",
          notes: cleanStr(m.notes, 280),
          columns,
          rows,
        };
      })
    : [];
  const contractFees = Array.isArray(
    (input as { contractFees?: unknown }).contractFees
  )
    ? (
        (input as { contractFees: import("@/types").CustomerContractFee[] })
          .contractFees ?? []
      )
        .slice(0, 12)
        .map((fee) => ({
          ...fee,
          id: cleanStr(fee.id, 64) || `fee-${Date.now()}`,
          label: cleanStr(fee.label, 120) || "Fee",
          amount: toPrice(fee.amount),
          enabled: fee.enabled !== false,
        }))
    : [];

  return {
    enabled: input.enabled === true,
    methods,
    blankMarkupPercent: normalizeMarkupPercent(
      (input as { blankMarkupPercent?: unknown }).blankMarkupPercent
    ),
    ...(contractFees.length ? { contractFees } : {}),
  };
}

function normalizeMarkupPercent(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(500, Math.max(0, Math.round(parsed * 100) / 100));
}

function slugifySqueegeeValue(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `custom-${slug}` : `custom-${Date.now()}`;
}

export function normalizeProductionDefaults(
  raw?: Partial<ShopProductionDefaults> | null
): ShopProductionDefaults {
  const input = raw ?? {};
  const presetSqueegeeValues = new Set(DEFAULT_SQUEEGEE_OPTIONS.map((o) => o.value));
  const seenSqueegees = new Set<string>();
  const squeegeeOptions = Array.isArray(input.squeegeeOptions)
    ? input.squeegeeOptions
        .map((option) => {
          const label =
            typeof option?.label === "string" ? option.label.trim() : "";
          const value =
            typeof option?.value === "string" && option.value.trim()
              ? option.value.trim()
              : label
                ? slugifySqueegeeValue(label)
                : "";
          if (
            !label ||
            !value ||
            presetSqueegeeValues.has(value) ||
            seenSqueegees.has(value)
          ) {
            return null;
          }
          seenSqueegees.add(value);
          return { value, label };
        })
        .filter((option): option is SqueegeeOption => option !== null)
        .slice(0, 24)
    : [];

  const seenScreenIds = new Set<string>();
  const screenSizes = Array.isArray(input.screenSizes)
    ? input.screenSizes
        .map((item, index) => {
          const widthIn = Number(item?.widthIn);
          const heightIn = Number(item?.heightIn);
          if (
            !Number.isFinite(widthIn) ||
            !Number.isFinite(heightIn) ||
            widthIn <= 0 ||
            heightIn <= 0
          ) {
            return null;
          }
          const label =
            typeof item?.label === "string" && item.label.trim()
              ? item.label.trim().slice(0, 80)
              : `${widthIn} × ${heightIn}`;
          const id =
            typeof item?.id === "string" && item.id.trim()
              ? item.id.trim().slice(0, 64)
              : `screen-${index}`;
          if (seenScreenIds.has(id)) return null;
          seenScreenIds.add(id);
          return {
            id,
            label,
            widthIn: Math.round(widthIn * 10) / 10,
            heightIn: Math.round(heightIn * 10) / 10,
            notes:
              typeof item?.notes === "string"
                ? item.notes.trim().slice(0, 280)
                : "",
          };
        })
        .filter((item): item is ScreenSizePreset => item !== null)
        .slice(0, 40)
    : [];

  const seenDtfAreaIds = new Set<string>();
  const dtfImprintAreas = Array.isArray(input.dtfImprintAreas)
    ? input.dtfImprintAreas
        .map((item, index) => {
          const widthIn = Number(item?.widthIn);
          const heightIn = Number(item?.heightIn);
          if (
            !Number.isFinite(widthIn) ||
            !Number.isFinite(heightIn) ||
            widthIn <= 0 ||
            heightIn <= 0
          ) {
            return null;
          }
          const label =
            typeof item?.label === "string" && item.label.trim()
              ? item.label.trim().slice(0, 80)
              : `${widthIn} × ${heightIn}`;
          const id =
            typeof item?.id === "string" && item.id.trim()
              ? item.id.trim().slice(0, 64)
              : `dtf-${index}`;
          if (seenDtfAreaIds.has(id)) return null;
          seenDtfAreaIds.add(id);
          return {
            id,
            label,
            widthIn: Math.round(widthIn * 10) / 10,
            heightIn: Math.round(heightIn * 10) / 10,
            notes:
              typeof item?.notes === "string"
                ? item.notes.trim().slice(0, 280)
                : "",
          };
        })
        .filter((item): item is DtfImprintAreaPreset => item !== null)
        .slice(0, 40)
    : [];

  const presetTransferTypeValues = new Set(
    DEFAULT_DTF_TRANSFER_TYPES.map((o) => o.value)
  );
  const seenTransferTypes = new Set<string>();
  const dtfTransferTypes = Array.isArray(input.dtfTransferTypes)
    ? input.dtfTransferTypes
        .map((option) => {
          const label =
            typeof option?.label === "string" ? option.label.trim() : "";
          const value =
            typeof option?.value === "string" && option.value.trim()
              ? option.value.trim()
              : label
                ? slugifySqueegeeValue(label)
                : "";
          if (
            !label ||
            !value ||
            presetTransferTypeValues.has(value) ||
            seenTransferTypes.has(value)
          ) {
            return null;
          }
          seenTransferTypes.add(value);
          return { value, label };
        })
        .filter((option): option is DtfTransferTypeOption => option !== null)
        .slice(0, 24)
    : [];

  const seenMesh = new Set<number>();
  const meshPresets = Array.isArray(input.meshPresets)
    ? input.meshPresets
        .map((item) => {
          const mesh = Number(item?.mesh);
          if (!Number.isFinite(mesh) || mesh < 20 || mesh > 500 || seenMesh.has(mesh)) {
            return null;
          }
          seenMesh.add(mesh);
          const label =
            typeof item?.label === "string" && item.label.trim()
              ? item.label.trim().slice(0, 80)
              : `${mesh} mesh`;
          return {
            mesh: Math.round(mesh),
            label,
            notes:
              typeof item?.notes === "string"
                ? item.notes.trim().slice(0, 280)
                : "",
          };
        })
        .filter((item): item is MeshPreset => item !== null)
        .slice(0, 40)
    : [];

  const presetInkValues = new Set(DEFAULT_INK_TYPE_OPTIONS.map((o) => o.value));
  const seenInk = new Set<string>();
  const inkTypes = Array.isArray(input.inkTypes)
    ? input.inkTypes
        .map((option) => {
          const label =
            typeof option?.label === "string" ? option.label.trim() : "";
          const value =
            typeof option?.value === "string" && option.value.trim()
              ? option.value.trim()
              : label
                ? slugifySqueegeeValue(label)
                : "";
          if (!label || !value || presetInkValues.has(value) || seenInk.has(value)) {
            return null;
          }
          seenInk.add(value);
          return { value, label: label.slice(0, 80) };
        })
        .filter((option): option is InkTypeOption => option !== null)
        .slice(0, 24)
    : [];

  const seenPrintLocations = new Set<string>();
  const seenPrintLabels = new Set<string>();
  const printLocations = Array.isArray(input.printLocations)
    ? input.printLocations
        .map((option) => {
          const label =
            typeof option?.label === "string" ? option.label.trim().slice(0, 80) : "";
          const value =
            typeof option?.value === "string" && option.value.trim()
              ? option.value.trim().slice(0, 64)
              : label
                ? slugifySqueegeeValue(label)
                : "";
          const labelKey = label.toLowerCase();
          if (
            !label ||
            !value ||
            seenPrintLocations.has(value) ||
            seenPrintLabels.has(labelKey)
          ) {
            return null;
          }
          seenPrintLocations.add(value);
          seenPrintLabels.add(labelKey);
          return { value, label };
        })
        .filter((option): option is PrintLocationOption => option !== null)
        .slice(0, 40)
    : [];

  const seenFinishing = new Set<string>();
  const finishingSteps = Array.isArray(input.finishingSteps)
    ? input.finishingSteps
        .map((item, index) => {
          const name =
            typeof item?.name === "string" ? item.name.trim().slice(0, 80) : "";
          if (!name) return null;
          const id =
            typeof item?.id === "string" && item.id.trim()
              ? item.id.trim().slice(0, 64)
              : `finishing-${index}`;
          if (seenFinishing.has(id)) return null;
          seenFinishing.add(id);
          return {
            id,
            name,
            description:
              typeof item?.description === "string"
                ? item.description.trim().slice(0, 280)
                : "",
            enabled: item?.enabled !== false,
          };
        })
        .filter((item): item is FinishingStepPreset => item !== null)
        .slice(0, 20)
    : [];

  return {
    squeegeeOptions,
    screenSizes,
    dtfImprintAreas,
    dtfTransferTypes,
    meshPresets,
    inkTypes,
    printLocations,
    finishingSteps,
  };
}

export function normalizeWarehouses(
  raw?: Partial<ShopWarehouse>[] | null
): ShopWarehouse[] {
  if (!Array.isArray(raw)) return [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const normalized = raw
    .map((item, index) => {
      const name =
        typeof item?.name === "string" ? item.name.trim().slice(0, 80) : "";
      if (!name) return null;
      const key = name.toLowerCase();
      if (seenNames.has(key)) return null;
      seenNames.add(key);
      const id =
        typeof item?.id === "string" && item.id.trim()
          ? item.id.trim().slice(0, 64)
          : `warehouse-${index}`;
      if (seenIds.has(id)) return null;
      seenIds.add(id);
      return {
        id,
        name,
        code:
          typeof item?.code === "string" ? item.code.trim().slice(0, 12) : "",
        description:
          typeof item?.description === "string"
            ? item.description.trim().slice(0, 280)
            : "",
        isDefault: item?.isDefault === true,
      };
    })
    .filter((item): item is ShopWarehouse => item !== null)
    .slice(0, 20);

  if (normalized.length > 0 && !normalized.some((w) => w.isDefault)) {
    normalized[0] = { ...normalized[0], isDefault: true };
  }
  if (normalized.filter((w) => w.isDefault).length > 1) {
    let foundDefault = false;
    return normalized.map((w) => {
      if (w.isDefault && !foundDefault) {
        foundDefault = true;
        return w;
      }
      return { ...w, isDefault: false };
    });
  }
  return normalized;
}

export const DEFAULT_SQUEEGEE_OPTIONS: SqueegeeOption[] = [
  { value: "soft", label: "Soft" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export const DEFAULT_INK_TYPE_OPTIONS: InkTypeOption[] = [
  { value: "plastisol", label: "Plastisol" },
  { value: "water-based", label: "Water-based" },
  { value: "discharge", label: "Discharge" },
  { value: "silicone", label: "Silicone" },
  { value: "other", label: "Other" },
];

export const DEFAULT_PRINT_LOCATIONS: PrintLocationOption[] = [
  { value: "front_left_chest", label: "Front left chest" },
  { value: "front_chest", label: "Front chest" },
  { value: "full_front", label: "Full front" },
  { value: "full_back", label: "Full back" },
  { value: "back", label: "Back" },
  { value: "left_sleeve", label: "Left sleeve" },
  { value: "right_sleeve", label: "Right sleeve" },
  { value: "nape", label: "Nape / yoke" },
  { value: "other", label: "Other" },
];

export const STARTER_SCREEN_SIZES: ScreenSizePreset[] = [
  {
    id: "20x24",
    label: "20 × 24",
    widthIn: 20,
    heightIn: 24,
    notes: "Small runs / youth",
  },
  {
    id: "23x31",
    label: "23 × 31",
    widthIn: 23,
    heightIn: 31,
    notes: "Standard automatic",
  },
  {
    id: "25x36",
    label: "25 × 36",
    widthIn: 25,
    heightIn: 36,
    notes: "Large format",
  },
];

export const DEFAULT_DTF_TRANSFER_TYPES: DtfTransferTypeOption[] = [
  { value: "cold-peel", label: "Cold peel" },
  { value: "hot-peel", label: "Hot peel" },
];

export const STARTER_DTF_IMPRINT_AREAS: DtfImprintAreaPreset[] = [
  {
    id: "5x5",
    label: "5 × 5",
    widthIn: 5,
    heightIn: 5,
    notes: "Small chest / tag",
  },
  {
    id: "12x18",
    label: "12 × 18",
    widthIn: 12,
    heightIn: 18,
    notes: "Large front / back",
  },
];

export const STARTER_MESH_PRESETS: MeshPreset[] = [
  { mesh: 110, label: "110 — Underbase", notes: "" },
  { mesh: 156, label: "156 — General print", notes: "" },
  { mesh: 230, label: "230 — Fine detail", notes: "" },
  { mesh: 305, label: "305 — Halftone / process", notes: "" },
];

export const STARTER_FINISHING_STEPS: FinishingStepPreset[] = [
  {
    id: "folding",
    name: "Folding",
    description: "Fold garments before bagging",
    enabled: true,
  },
  {
    id: "bagging",
    name: "Bagging",
    description: "Individual poly bags per piece or size run",
    enabled: true,
  },
  {
    id: "labeling",
    name: "Labeling",
    description: "Size stickers, UPC, or custom labels",
    enabled: true,
  },
  {
    id: "boxing",
    name: "Boxing & ship prep",
    description: "Carton pack-out for wholesale or bulk ship",
    enabled: false,
  },
];

export function getMeshPresetOptions(
  productionDefaults?: ShopProductionDefaults | null
): { value: string; label: string; mesh: number }[] {
  return (productionDefaults?.meshPresets ?? []).map((preset) => ({
    value: String(preset.mesh),
    label: preset.label || `${preset.mesh} mesh`,
    mesh: preset.mesh,
  }));
}

export function getScreenSizeOptions(
  productionDefaults?: ShopProductionDefaults | null
): { value: string; label: string }[] {
  return (productionDefaults?.screenSizes ?? []).map((size) => ({
    value: size.id,
    label: size.label || `${size.widthIn} × ${size.heightIn}`,
  }));
}

export function getDtfImprintAreaOptions(
  productionDefaults?: ShopProductionDefaults | null
): { value: string; label: string }[] {
  return (productionDefaults?.dtfImprintAreas ?? []).map((area) => ({
    value: area.id,
    label: area.label || `${area.widthIn} × ${area.heightIn}`,
  }));
}

export function getDtfTransferTypeOptions(
  productionDefaults?: ShopProductionDefaults | null
): DtfTransferTypeOption[] {
  const custom = productionDefaults?.dtfTransferTypes ?? [];
  return [...DEFAULT_DTF_TRANSFER_TYPES, ...custom];
}

export function findDtfImprintArea(
  productionDefaults: ShopProductionDefaults | null | undefined,
  areaId: string | undefined
): DtfImprintAreaPreset | undefined {
  if (!areaId) return undefined;
  return (productionDefaults?.dtfImprintAreas ?? []).find(
    (area) => area.id === areaId
  );
}

export function getSqueegeeOptions(
  productionDefaults?: ShopProductionDefaults | null
): SqueegeeOption[] {
  const custom = productionDefaults?.squeegeeOptions ?? [];
  return [...DEFAULT_SQUEEGEE_OPTIONS, ...custom];
}

export function getInkTypeOptions(
  productionDefaults?: ShopProductionDefaults | null
): InkTypeOption[] {
  const custom = productionDefaults?.inkTypes ?? [];
  return [...DEFAULT_INK_TYPE_OPTIONS, ...custom];
}

export function getPrintLocationOptions(
  productionDefaults?: ShopProductionDefaults | null
): PrintLocationOption[] {
  const configured =
    normalizeProductionDefaults(productionDefaults).printLocations ?? [];
  if (configured.length > 0) return configured;
  return DEFAULT_PRINT_LOCATIONS;
}

export function resolvePrintLocationLabel(
  key: string,
  productionDefaults?: ShopProductionDefaults | null
): string {
  const match = getPrintLocationOptions(productionDefaults).find(
    (option) => option.value === key
  );
  if (match) return match.label;
  return (
    DEFAULT_PRINT_LOCATIONS.find((option) => option.value === key)?.label ??
    key.replace(/_/g, " ").replace(/^loc-/, "")
  );
}

export function defaultPrintLocationKey(
  productionDefaults?: ShopProductionDefaults | null
): string {
  const options = getPrintLocationOptions(productionDefaults);
  return (
    options.find((option) => option.value === "front_chest")?.value ??
    options[0]?.value ??
    "front_chest"
  );
}

export function getWarehouseNames(warehouses?: ShopWarehouse[] | null): string[] {
  return (warehouses ?? []).map((w) => w.name).filter(Boolean);
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
    companyProfile: normalizeCompanyProfile(input.companyProfile),
    pricingMatrix: normalizePricingMatrix(input.pricingMatrix),
    productionDefaults: normalizeProductionDefaults(input.productionDefaults),
    warehouses: normalizeWarehouses(input.warehouses),
    onboarding: hasOnboardingField
        ? normalizeShopOnboarding(input.onboarding, {
            email: typeof input.email === "string" ? input.email : "",
            phone: typeof input.phone === "string" ? input.phone : "",
            branding: normalizeTenantBranding(input.branding),
          })
        : normalizeShopOnboarding(null, {
            email: typeof input.email === "string" ? input.email : "",
            phone: typeof input.phone === "string" ? input.phone : "",
            branding: normalizeTenantBranding(input.branding),
          }),
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

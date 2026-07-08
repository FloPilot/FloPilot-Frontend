import type { LucideIcon } from "lucide-react";
import {
  Droplets,
  Layers,
  PackageOpen,
  Palette,
  Scissors,
} from "lucide-react";
import type { ShopModuleKey } from "@/lib/shop-settings";

export const DEPARTMENTS_BASE = "/app/departments";

export const DEPARTMENT_SLUGS = [
  "artwork",
  "screens",
  "inks",
  "finishing",
  "receiving",
] as const;

export type DepartmentSlug = (typeof DEPARTMENT_SLUGS)[number];

export type DepartmentDefinition = {
  slug: DepartmentSlug;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  moduleKey?: ShopModuleKey;
  href: string;
};

export const DEPARTMENT_DEFINITIONS: DepartmentDefinition[] = [
  {
    slug: "artwork",
    label: "Artwork",
    shortLabel: "Art",
    description: "Proofs awaiting review, customer revisions, and approvals.",
    icon: Palette,
    moduleKey: "artwork",
    href: `${DEPARTMENTS_BASE}/artwork`,
  },
  {
    slug: "screens",
    label: "Screens",
    shortLabel: "Screens",
    description:
      "Screen burning and separations — aim to finish about five days before the run is scheduled.",
    icon: Layers,
    moduleKey: "productionTasks",
    href: `${DEPARTMENTS_BASE}/screens`,
  },
  {
    slug: "inks",
    label: "Inks",
    shortLabel: "Inks",
    description: "Mix and stage ink colors for each screen-print location.",
    icon: Droplets,
    moduleKey: "productionTasks",
    href: `${DEPARTMENTS_BASE}/inks`,
  },
  {
    slug: "finishing",
    label: "Finishing",
    shortLabel: "Finish",
    description: "QC, packing, and finishing steps before ship.",
    icon: Scissors,
    moduleKey: "productionTasks",
    href: `${DEPARTMENTS_BASE}/finishing`,
  },
  {
    slug: "receiving",
    label: "Receiving",
    shortLabel: "Recv",
    description: "Blank garments and inbound materials waiting to be checked in.",
    icon: PackageOpen,
    moduleKey: "inventory",
    href: `${DEPARTMENTS_BASE}/receiving`,
  },
];

export function getDepartmentDefinition(
  slug: string
): DepartmentDefinition | undefined {
  return DEPARTMENT_DEFINITIONS.find((dept) => dept.slug === slug);
}

export function isDepartmentSlug(value: string): value is DepartmentSlug {
  return DEPARTMENT_SLUGS.includes(value as DepartmentSlug);
}

export function departmentHref(slug: DepartmentSlug): string {
  return `${DEPARTMENTS_BASE}/${slug}`;
}

export function departmentArtworkProofHref(
  orderId: string,
  jobId?: string,
  imprintId?: string
): string {
  const base = `${DEPARTMENTS_BASE}/artwork/${orderId}`;
  if (!jobId || !imprintId) return base;
  const params = new URLSearchParams({ job: jobId, imprint: imprintId });
  return `${base}?${params.toString()}`;
}

export function isDepartmentArtworkProofPath(pathname: string): boolean {
  return pathname.startsWith(`${DEPARTMENTS_BASE}/artwork/`) &&
    pathname !== `${DEPARTMENTS_BASE}/artwork` &&
    !pathname.startsWith(`${DEPARTMENTS_BASE}/artwork?`);
}

export function isDepartmentsSection(pathname: string): boolean {
  return (
    pathname === DEPARTMENTS_BASE ||
    pathname.startsWith(`${DEPARTMENTS_BASE}/`)
  );
}

export function activeDepartmentSlug(pathname: string): DepartmentSlug | null {
  if (!isDepartmentsSection(pathname)) return null;
  const segment = pathname.slice(DEPARTMENTS_BASE.length + 1).split("/")[0];
  return segment && isDepartmentSlug(segment) ? segment : null;
}

/** Days before earliest scheduled run to suggest screen burn / ink prep */
export const PREP_LEAD_DAYS_BEFORE_SCHEDULE = 5;

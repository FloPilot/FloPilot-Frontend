import {
  DEPARTMENT_DEFINITIONS,
  DEPARTMENT_SLUGS,
  isDepartmentSlug,
  type DepartmentSlug,
} from "@/lib/departments";

export type StaffDepartmentOption = {
  id: DepartmentSlug;
  label: string;
};

export const STAFF_DEPARTMENT_OPTIONS: StaffDepartmentOption[] =
  DEPARTMENT_DEFINITIONS.map((dept) => ({
    id: dept.slug,
    label: dept.label,
  }));

export function normalizeStaffDepartments(
  raw: unknown
): DepartmentSlug[] {
  if (!Array.isArray(raw)) return [];
  const next: DepartmentSlug[] = [];
  for (const entry of raw) {
    const value = String(entry || "").trim();
    if (!isDepartmentSlug(value)) continue;
    if (!next.includes(value)) next.push(value);
  }
  return next.filter((slug) =>
    (DEPARTMENT_SLUGS as readonly string[]).includes(slug)
  );
}

export function staffDepartmentLabel(slug: string | null | undefined): string {
  if (!slug) return "General";
  return (
    DEPARTMENT_DEFINITIONS.find((dept) => dept.slug === slug)?.label || slug
  );
}

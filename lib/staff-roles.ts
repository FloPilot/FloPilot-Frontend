export const STAFF_ROLES = [
  "admin",
  "manager",
  "production",
  "viewer",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export type PermissionArea =
  | "settings"
  | "team"
  | "orders"
  | "customers"
  | "production"
  | "machines"
  | "inventory"
  | "reports"
  | "calendar";

export const STAFF_ROLE_OPTIONS: {
  value: StaffRole;
  label: string;
  description: string;
}[] = [
  {
    value: "admin",
    label: "Admin",
    description: "Full access including settings and team management.",
  },
  {
    value: "manager",
    label: "Manager",
    description: "Orders, customers, production, inventory, and reports.",
  },
  {
    value: "production",
    label: "Production",
    description: "Floor workflow — orders, calendar, machines, and production.",
  },
  {
    value: "viewer",
    label: "View only",
    description: "Read-only access across the workspace.",
  },
];

const PERMISSION_AREAS: Record<PermissionArea, StaffRole[]> = {
  settings: ["admin"],
  team: ["admin"],
  orders: ["admin", "manager", "production", "viewer"],
  customers: ["admin", "manager", "viewer"],
  production: ["admin", "manager", "production"],
  machines: ["admin", "manager", "production"],
  inventory: ["admin", "manager", "production", "viewer"],
  reports: ["admin", "manager", "viewer"],
  calendar: ["admin", "manager", "production"],
};

export function normalizeStaffRole(role?: string | null): StaffRole {
  const value = String(role || "viewer").toLowerCase();
  return STAFF_ROLES.includes(value as StaffRole) ? (value as StaffRole) : "viewer";
}

export function canAccessArea(role: StaffRole, area: PermissionArea): boolean {
  return PERMISSION_AREAS[area]?.includes(role) ?? false;
}

export function canWriteArea(role: StaffRole, area: PermissionArea): boolean {
  if (role === "viewer") return false;
  return canAccessArea(role, area);
}

export function getRoleLabel(role: StaffRole): string {
  return STAFF_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

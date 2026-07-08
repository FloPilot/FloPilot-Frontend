import {
  normalizeStaffRole,
  type StaffRole,
} from "@/lib/staff-roles";
import type { ShopModules } from "@/lib/shop-settings";

export const WORKSPACE_AREA_KEYS = [
  "dashboard",
  "tasks",
  "orders",
  "customers",
  "production",
  "departments",
  "artwork",
  "calendar",
  "machines",
  "inventory",
  "reports",
  "settings",
] as const;

export type WorkspaceAreaKey = (typeof WORKSPACE_AREA_KEYS)[number];

export type StaffAccess = {
  areasCustomized?: boolean;
  areas?: Partial<Record<WorkspaceAreaKey, boolean>>;
  machineIds?: string[] | null;
};

export const WORKSPACE_AREA_OPTIONS: {
  key: WorkspaceAreaKey;
  label: string;
  description: string;
  moduleKey?: keyof ShopModules;
}[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Shop overview and KPIs",
  },
  {
    key: "tasks",
    label: "Tasks",
    description: "Open work, urgent items, and completed actions",
  },
  {
    key: "orders",
    label: "Orders",
    description: "Quotes, jobs, and order details",
  },
  {
    key: "customers",
    label: "Customers",
    description: "Customer list and profiles",
  },
  {
    key: "production",
    label: "Production",
    description: "Production tasks and floor workflow",
    moduleKey: "productionTasks",
  },
  {
    key: "departments",
    label: "Departments",
    description: "Department queues — artwork, screens, inks, finishing, receiving",
  },
  {
    key: "artwork",
    label: "Artwork",
    description: "Proofs and artwork approvals",
    moduleKey: "artwork",
  },
  {
    key: "calendar",
    label: "Calendar",
    description: "Scheduling and production calendar",
  },
  {
    key: "machines",
    label: "Machines",
    description: "Stations and machine floor views",
    moduleKey: "machines",
  },
  {
    key: "inventory",
    label: "Warehouse",
    description: "Stock, receiving, and purchase orders",
    moduleKey: "inventory",
  },
  {
    key: "reports",
    label: "Reports",
    description: "Exports and shop reports",
    moduleKey: "reports",
  },
  {
    key: "settings",
    label: "Settings",
    description: "Shop settings (editing still admin-only)",
  },
];

const ROLE_DEFAULT_AREAS: Record<StaffRole, Record<WorkspaceAreaKey, boolean>> =
  {
    admin: {
      dashboard: true,
      tasks: true,
      orders: true,
      customers: true,
      production: true,
      departments: true,
      artwork: true,
      calendar: true,
      machines: true,
      inventory: true,
      reports: true,
      settings: true,
    },
    manager: {
      dashboard: true,
      tasks: true,
      orders: true,
      customers: true,
      production: true,
      departments: true,
      artwork: true,
      calendar: true,
      machines: true,
      inventory: true,
      reports: true,
      settings: true,
    },
    production: {
      dashboard: true,
      tasks: true,
      orders: true,
      customers: false,
      production: true,
      departments: true,
      artwork: true,
      calendar: true,
      machines: true,
      inventory: false,
      reports: false,
      settings: true,
    },
    viewer: {
      dashboard: true,
      tasks: true,
      orders: true,
      customers: true,
      production: true,
      departments: true,
      artwork: true,
      calendar: false,
      machines: false,
      inventory: true,
      reports: true,
      settings: true,
    },
  };

function emptyAreas(): Record<WorkspaceAreaKey, boolean> {
  return Object.fromEntries(
    WORKSPACE_AREA_KEYS.map((key) => [key, false])
  ) as Record<WorkspaceAreaKey, boolean>;
}

export function getRoleDefaultAreas(
  role: StaffRole
): Record<WorkspaceAreaKey, boolean> {
  return { ...ROLE_DEFAULT_AREAS[normalizeStaffRole(role)] };
}

export function normalizeStaffAccess(
  access: StaffAccess | null | undefined,
  role: StaffRole
): {
  areasCustomized: boolean;
  areas: Record<WorkspaceAreaKey, boolean>;
  machineIds: string[] | null;
} {
  const normalizedRole = normalizeStaffRole(role);
  const input = access ?? {};

  if (input.areasCustomized === true && input.areas) {
    const areas = emptyAreas();
    for (const key of WORKSPACE_AREA_KEYS) {
      if (typeof input.areas[key] === "boolean") {
        areas[key] = input.areas[key]!;
      }
    }
    const machineIds =
      Array.isArray(input.machineIds) && input.machineIds.length > 0
        ? input.machineIds.filter(Boolean)
        : null;
    return { areasCustomized: true, areas, machineIds };
  }

  return {
    areasCustomized: false,
    areas: getRoleDefaultAreas(normalizedRole),
    machineIds:
      Array.isArray(input.machineIds) && input.machineIds.length > 0
        ? input.machineIds.filter(Boolean)
        : null,
  };
}

export function getEffectiveAreas(
  role: StaffRole,
  access?: StaffAccess | null
): Record<WorkspaceAreaKey, boolean> {
  if (normalizeStaffRole(role) === "admin") {
    return getRoleDefaultAreas("admin");
  }
  return normalizeStaffAccess(access, role).areas;
}

export function canAccessWorkspaceArea(
  role: StaffRole,
  access: StaffAccess | null | undefined,
  area: WorkspaceAreaKey
): boolean {
  if (normalizeStaffRole(role) === "admin") return true;
  return getEffectiveAreas(role, access)[area] === true;
}

export function filterMachinesForAccess<T extends { id: string }>(
  role: StaffRole,
  access: StaffAccess | null | undefined,
  machines: T[]
): T[] {
  if (normalizeStaffRole(role) === "admin") return machines;
  const normalized = normalizeStaffAccess(access, role);
  if (!normalized.areas.machines) return [];
  if (!normalized.machineIds?.length) return machines;
  const allowed = new Set(normalized.machineIds);
  return machines.filter((machine) => allowed.has(machine.id));
}

export function canAccessMachine(
  role: StaffRole,
  access: StaffAccess | null | undefined,
  machineId: string
): boolean {
  if (normalizeStaffRole(role) === "admin") return true;
  const normalized = normalizeStaffAccess(access, role);
  if (!normalized.areas.machines) return false;
  if (!normalized.machineIds?.length) return true;
  return normalized.machineIds.includes(machineId);
}

export function getDefaultLandingPath(
  role: StaffRole,
  access: StaffAccess | null | undefined,
  modules: ShopModules
): string {
  const areaToPath: Record<WorkspaceAreaKey, string> = {
    dashboard: "/app/dashboard",
    tasks: "/app/tasks",
    orders: "/app/orders",
    customers: "/app/customers",
    production: "/app/production",
    departments: "/app/departments",
    artwork: "/app/artwork",
    calendar: "/app/calendar",
    machines: "/app/machines",
    inventory: "/app/inventory",
    reports: "/app/reports",
    settings: "/app/settings",
  };

  const areas = getEffectiveAreas(role, access);

  for (const option of WORKSPACE_AREA_OPTIONS) {
    if (!areas[option.key]) continue;
    if (option.moduleKey && modules[option.moduleKey] === false) continue;
    return areaToPath[option.key];
  }

  return "/app/dashboard";
}

export function countEnabledAreas(
  areas: Record<WorkspaceAreaKey, boolean>
): number {
  return WORKSPACE_AREA_KEYS.filter((key) => areas[key]).length;
}

export function summarizeStaffAccess(
  role: StaffRole,
  access: StaffAccess | null | undefined,
  modules: ShopModules
): string {
  const normalized = normalizeStaffAccess(access, role);
  if (!normalized.areasCustomized) {
    return `${getRoleLabel(role)} defaults`;
  }

  const enabled = WORKSPACE_AREA_OPTIONS.filter(
    (option) =>
      normalized.areas[option.key] &&
      (!option.moduleKey || modules[option.moduleKey] !== false)
  );

  if (enabled.length === 0) return "No areas enabled";
  if (enabled.length === 1) {
    const label = enabled[0]!.label;
    if (
      enabled[0]!.key === "machines" &&
      normalized.machineIds?.length === 1
    ) {
      return `${label} · 1 station`;
    }
    if (
      enabled[0]!.key === "machines" &&
      normalized.machineIds &&
      normalized.machineIds.length > 1
    ) {
      return `${label} · ${normalized.machineIds.length} stations`;
    }
    return `${label} only`;
  }

  if (
    normalized.areas.machines &&
    normalized.machineIds &&
    normalized.machineIds.length > 0
  ) {
    return `${enabled.length} areas · ${normalized.machineIds.length} station${
      normalized.machineIds.length === 1 ? "" : "s"
    }`;
  }

  return `${enabled.length} areas`;
}

function getRoleLabel(role: StaffRole): string {
  const labels: Record<StaffRole, string> = {
    admin: "Admin",
    manager: "Manager",
    production: "Production",
    viewer: "View only",
  };
  return labels[normalizeStaffRole(role)];
}

export type WorkspacePathArea = WorkspaceAreaKey | "machines-settings";

export function getWorkspaceAreaForPath(
  pathname: string
): WorkspacePathArea | null {
  if (pathname === "/app" || pathname === "/app/") return "dashboard";
  if (pathname.startsWith("/app/machines/settings")) return "machines-settings";
  if (pathname.startsWith("/app/dashboard")) return "dashboard";
  if (pathname.startsWith("/app/notifications")) return "dashboard";
  if (pathname.startsWith("/app/tasks")) return "tasks";
  if (pathname.startsWith("/app/orders")) return "orders";
  if (pathname.startsWith("/app/customers")) return "customers";
  if (pathname.startsWith("/app/production")) return "production";
  if (pathname.startsWith("/app/departments")) return "departments";
  if (pathname.startsWith("/app/artwork")) return "artwork";
  if (pathname.startsWith("/app/calendar")) return "calendar";
  if (pathname.startsWith("/app/machines")) return "machines";
  if (pathname.startsWith("/app/inventory")) return "inventory";
  if (pathname.startsWith("/app/reports")) return "reports";
  if (pathname.startsWith("/app/settings")) return "settings";
  return null;
}

export function buildStaffAccessPayload(
  role: StaffRole,
  customized: boolean,
  areas: Record<WorkspaceAreaKey, boolean>,
  machineIds: string[] | null
): StaffAccess | null {
  if (normalizeStaffRole(role) === "admin") return null;
  if (!customized) {
    if (!machineIds?.length) return null;
    return { areasCustomized: false, machineIds };
  }
  return {
    areasCustomized: true,
    areas,
    machineIds: machineIds?.length ? machineIds : null,
  };
}

import {
  BarChart3,
  Bell,
  Boxes,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Factory,
  FileImage,
  Files,
  FolderOpen,
  Layers,
  LayoutDashboard,
  Monitor,
  Package,
  SlidersHorizontal,
  Users,
  Warehouse,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ShopModuleKey, ShopModules } from "@/lib/shop-settings";
import type { StaffAccess } from "@/lib/staff-access";
import {
  canAccessWorkspaceArea,
  type WorkspaceAreaKey,
} from "@/lib/staff-access";
import type { StaffRole } from "@/lib/staff-roles";

export type NavChildItem = {
  href: string;
  label: string;
  icon?: LucideIcon;
  isActive: (pathname: string) => boolean;
  adminOnly?: boolean;
};

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive?: (pathname: string) => boolean;
  children?: NavChildItem[];
  /** When set, item is hidden if this module is disabled */
  moduleKey?: ShopModuleKey;
  /** Workspace tab this nav item maps to */
  workspaceArea?: WorkspaceAreaKey;
};

export const MACHINES_BASE = "/app/machines";
export const MACHINES_SETTINGS = "/app/machines/settings";
export const PRODUCTION_BASE = "/app/production";
export const ARTWORK_BASE = "/app/artwork";
export const DESIGNS_BASE = "/app/designs";
export const FILES_BASE = "/app/files";
export const FILES_ARTWORK = "/app/files/artwork";
export const FILES_SCREENS = "/app/files/screens";

export function isMachinesSection(pathname: string): boolean {
  return pathname === MACHINES_BASE || pathname.startsWith(`${MACHINES_BASE}/`);
}

export function isFilesSection(pathname: string): boolean {
  return pathname === FILES_BASE || pathname.startsWith(`${FILES_BASE}/`);
}

export function isArtworkSection(pathname: string): boolean {
  return (
    pathname === ARTWORK_BASE ||
    pathname.startsWith(`${ARTWORK_BASE}/`) ||
    pathname === DESIGNS_BASE ||
    pathname.startsWith(`${DESIGNS_BASE}/`)
  );
}

export function shouldExpandNavChildren(
  pathname: string,
  item: NavItem
): boolean {
  if (!item.children) return false;
  if (item.href === MACHINES_BASE) return isMachinesSection(pathname);
  if (item.href === FILES_BASE) return isFilesSection(pathname);
  return isNavItemActive(pathname, item);
}

export function isMachinesStationsRoute(pathname: string): boolean {
  return (
    pathname === MACHINES_BASE ||
    (pathname.startsWith(`${MACHINES_BASE}/`) &&
      !pathname.startsWith(MACHINES_SETTINGS))
  );
}

export const navItems: NavItem[] = [
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, workspaceArea: "dashboard" },
  {
    href: "/app/notifications",
    label: "Notifications",
    icon: Bell,
    workspaceArea: "dashboard",
  },
  { href: "/app/tasks", label: "Tasks", icon: CheckSquare, workspaceArea: "tasks" },
  { href: "/app/orders", label: "Orders", icon: ClipboardList, workspaceArea: "orders" },
  { href: "/app/customers", label: "Customers", icon: Users, workspaceArea: "customers" },
  {
    href: PRODUCTION_BASE,
    label: "Production",
    icon: Factory,
    moduleKey: "productionTasks",
    workspaceArea: "production",
  },
  {
    href: ARTWORK_BASE,
    label: "Artwork",
    icon: FileImage,
    moduleKey: "artwork",
    workspaceArea: "artwork",
    isActive: isArtworkSection,
  },
  {
    href: FILES_BASE,
    label: "Files",
    icon: FolderOpen,
    isActive: isFilesSection,
    children: [
      {
        href: FILES_BASE,
        label: "All files",
        icon: Files,
        isActive: (pathname) => pathname === FILES_BASE,
      },
      {
        href: FILES_ARTWORK,
        label: "Artwork",
        icon: FileImage,
        isActive: (pathname) =>
          pathname === FILES_ARTWORK ||
          pathname.startsWith(`${FILES_ARTWORK}/`),
      },
      {
        href: FILES_SCREENS,
        label: "Screens",
        icon: Layers,
        isActive: (pathname) =>
          pathname === FILES_SCREENS ||
          pathname.startsWith(`${FILES_SCREENS}/`),
      },
    ],
  },
  { href: "/app/calendar", label: "Calendar", icon: CalendarDays, workspaceArea: "calendar" },
  {
    href: MACHINES_BASE,
    label: "Machines",
    icon: Wrench,
    isActive: isMachinesSection,
    moduleKey: "machines",
    workspaceArea: "machines",
    children: [
      {
        href: MACHINES_BASE,
        label: "Stations",
        icon: Monitor,
        isActive: isMachinesStationsRoute,
      },
      {
        href: MACHINES_SETTINGS,
        label: "Settings",
        icon: SlidersHorizontal,
        adminOnly: true,
        isActive: (pathname) =>
          pathname === MACHINES_SETTINGS ||
          pathname.startsWith(`${MACHINES_SETTINGS}/`),
      },
    ],
  },
  { href: "/app/inventory", label: "Warehouse", icon: Warehouse, moduleKey: "inventory", workspaceArea: "inventory" },
  { href: "/app/reports", label: "Reports", icon: BarChart3, moduleKey: "reports", workspaceArea: "reports" },
];

export function getVisibleNavItems(
  modules: ShopModules,
  role: StaffRole = "admin",
  access?: StaffAccess | null
): NavItem[] {
  return navItems
    .filter((item) => {
      if (item.moduleKey && modules[item.moduleKey] === false) return false;
      if (
        item.workspaceArea &&
        !canAccessWorkspaceArea(role, access, item.workspaceArea)
      ) {
        return false;
      }
      return true;
    })
    .map((item) => {
      if (!item.children) return item;
      const children = item.children.filter(
        (child) => !child.adminOnly || role === "admin"
      );
      return children.length === item.children.length
        ? item
        : { ...item, children };
    });
}

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.isActive) return item.isActive(pathname);
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

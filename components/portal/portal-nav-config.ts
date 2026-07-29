import {
  Building2,
  ClipboardList,
  FileImage,
  FileText,
  LayoutDashboard,
  Receipt,
  ShoppingBag,
  Tag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PortalPaths } from "@/components/portal/portal-paths";

export type PortalNavItem = {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
  children?: {
    href: string;
    label: string;
    icon: LucideIcon;
    isActive: (pathname: string) => boolean;
  }[];
};

function pathMatches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function buildPortalNavItems(paths: PortalPaths): PortalNavItem[] {
  return [
    {
      key: "dashboard",
      href: paths.home(),
      label: "Dashboard",
      icon: LayoutDashboard,
      isActive: (pathname) => pathname === paths.home(),
    },
    {
      key: "orders",
      href: paths.orders(),
      label: "Orders",
      icon: ClipboardList,
      isActive: (pathname) => pathMatches(pathname, paths.orders()),
    },
    {
      key: "order-requests",
      href: paths.orderRequests(),
      label: "Order requests",
      icon: ShoppingBag,
      isActive: (pathname) => pathMatches(pathname, paths.orderRequests()),
    },
    {
      key: "documents",
      href: paths.estimates(),
      label: "Documents",
      icon: FileText,
      isActive: (pathname) =>
        pathMatches(pathname, paths.estimates()) ||
        pathMatches(pathname, paths.invoices()),
      children: [
        {
          href: paths.estimates(),
          label: "Estimates",
          icon: FileText,
          isActive: (pathname) => pathMatches(pathname, paths.estimates()),
        },
        {
          href: paths.invoices(),
          label: "Invoices",
          icon: Receipt,
          isActive: (pathname) => pathMatches(pathname, paths.invoices()),
        },
      ],
    },
    {
      key: "artwork",
      href: paths.artwork(),
      label: "Artwork",
      icon: FileImage,
      isActive: (pathname) => pathMatches(pathname, paths.artwork()),
    },
    {
      key: "pricing",
      href: paths.pricing(),
      label: "Pricing",
      icon: Tag,
      isActive: (pathname) => pathMatches(pathname, paths.pricing()),
    },
    {
      key: "business",
      href: paths.business(),
      label: "Business",
      icon: Building2,
      isActive: (pathname) => pathMatches(pathname, paths.business()),
    },
  ];
}

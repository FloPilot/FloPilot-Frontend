"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Calculator,
  DollarSign,
  Factory,
  FileText,
  MessageSquarePlus,
  Package,
  Palette,
  Percent,
  Plug,
  Printer,
  Receipt,
  ScanLine,
  Shirt,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SettingsNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: string;
};

type SettingsNavGroup = {
  label: string;
  items: SettingsNavItem[];
};

const GROUPS: SettingsNavGroup[] = [
  {
    label: "Company setup",
    items: [
      {
        href: "/app/settings",
        label: "Company information",
        icon: Building2,
        exact: true,
      },
    ],
  },
  {
    label: "Appearance",
    items: [
      { href: "/app/settings/appearance", label: "Branding & logo", icon: Palette },
    ],
  },
  {
    label: "Documents",
    items: [
      {
        href: "/app/settings/documents/estimates",
        label: "Estimates",
        icon: FileText,
      },
      {
        href: "/app/settings/documents/invoices",
        label: "Invoices",
        icon: Receipt,
      },
    ],
  },
  {
    label: "Team",
    items: [{ href: "/app/settings/team", label: "Users & roles", icon: Users }],
  },
  {
    label: "Workspace",
    items: [
      {
        href: "/app/settings/workspace",
        label: "Modules",
        icon: SlidersHorizontal,
      },
    ],
  },
  {
    label: "Shop setup",
    items: [
      {
        href: "/app/settings/shop/machines",
        label: "Machines & stations",
        icon: Factory,
      },
      {
        href: "/app/settings/shop/screen-print",
        label: "Screen print",
        icon: Printer,
      },
      {
        href: "/app/settings/shop/print-locations",
        label: "Print locations",
        icon: Shirt,
      },
      {
        href: "/app/settings/shop/dtf",
        label: "DTF",
        icon: ScanLine,
      },
      {
        href: "/app/settings/shop/warehouse",
        label: "Warehouse & finishing",
        icon: Package,
      },
    ],
  },
  {
    label: "Pricing",
    items: [
      {
        href: "/app/settings/pricing",
        label: "Pricing matrix",
        icon: DollarSign,
        exact: true,
      },
      {
        href: "/app/settings/pricing/default-markup",
        label: "Default markup",
        icon: Percent,
      },
    ],
  },
  {
    label: "Integrations",
    items: [
      {
        href: "/app/settings/integrations",
        label: "Suppliers",
        icon: Plug,
        badge: "Partial",
        exact: true,
      },
      {
        href: "/app/settings/integrations/accounting",
        label: "Accounting",
        icon: Calculator,
      },
    ],
  },
  {
    label: "Support",
    items: [
      {
        href: "/app/settings/feedback",
        label: "Feedback & ideas",
        icon: MessageSquarePlus,
      },
    ],
  },
];

const FLAT_ITEMS = GROUPS.flatMap((group) => group.items);

function isItemActive(pathname: string, item: SettingsNavItem) {
  if (item.exact) return pathname === item.href || pathname === `${item.href}/`;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function SettingsSecondaryNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile / tablet: horizontal pill scroller */}
      <div className="border-b border-[#e3e3e3] bg-white px-3 py-2 lg:hidden">
        <nav className="flex gap-1.5 overflow-x-auto">
          {FLAT_ITEMS.map((item) => {
            const active = isItemActive(pathname, item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-[#1a1a1a] text-white"
                    : "text-[#616161] hover:bg-[#f1f1f1] hover:text-[#303030]"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Desktop: vertical grouped sidebar */}
      <aside className="hidden w-[244px] shrink-0 self-start border-[#e3e3e3] lg:sticky lg:top-0 lg:block lg:border-r">
        <div className="border-b border-[#e3e3e3] px-5 pb-3 pt-5">
          <p className={cn("text-base font-bold tracking-tight text-[#303030]")}>
            Settings
          </p>
          <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
            Manage your workspace configuration
          </p>
        </div>
        <nav className="space-y-4 px-3 py-4">
          {GROUPS.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[#8a8a8a]">
                {group.label}
              </p>
              {group.items.map((item) => {
                const active = isItemActive(pathname, item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-[#eef1ff] text-brand-primary"
                        : "text-[#444] hover:bg-[#f1f1f1] hover:text-[#1a1a1a]"
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        active ? "text-brand-primary" : "text-[#8a8a8a]"
                      )}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className="rounded-full bg-[#eef1ff] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-primary">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

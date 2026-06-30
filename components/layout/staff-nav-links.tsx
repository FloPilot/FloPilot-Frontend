"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  shouldExpandNavChildren,
  isNavItemActive,
  getVisibleNavItems,
} from "@/components/layout/nav-config";
import { useStaffAccess } from "@/hooks/use-staff-access";
import { StaffNotificationsNavBadge } from "@/components/layout/staff-notifications-menu";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { staffNav } from "@/lib/staff-nav-theme";
import { cn } from "@/lib/utils";

export function StaffNavLinks({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const { settings } = useShopSettings();
  const { role, access } = useStaffAccess();
  const visibleNavItems = getVisibleNavItems(settings.modules, role, access);

  return (
    <nav className={cn("space-y-0.5", className)}>
      {visibleNavItems.map((item) => {
        const isActive = isNavItemActive(pathname, item);
        const Icon = item.icon;
        const showChildren = shouldExpandNavChildren(pathname, item);

        return (
          <div key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                isActive ? staffNav.linkActive : staffNav.link
              )}
            >
              <Icon className="size-[18px] shrink-0 opacity-90" />
              <span className="flex-1">{item.label}</span>
              {item.href === "/app/notifications" ? (
                <StaffNotificationsNavBadge />
              ) : null}
              {item.children && (
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 opacity-60 transition-transform",
                    showChildren && "rotate-180"
                  )}
                />
              )}
            </Link>

            {showChildren && item.children && (
              <div
                className={cn(
                  "mt-0.5 ml-3 space-y-0.5 border-l pl-3",
                  staffNav.childBorder
                )}
              >
                {item.children.map((child) => {
                  const ChildIcon = child.icon;
                  const childActive = child.isActive(pathname);

                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                        childActive ? staffNav.childLinkActive : staffNav.childLink
                      )}
                    >
                      {ChildIcon && (
                        <ChildIcon className="size-3.5 shrink-0 opacity-80" />
                      )}
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { shouldExpandNavChildren, isNavItemActive, getVisibleNavItems } from "@/components/layout/nav-config";
import { useStaffAccess } from "@/hooks/use-staff-access";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { cn } from "@/lib/utils";

export function StaffMobileNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { settings } = useShopSettings();
  const { role, access } = useStaffAccess();
  const visibleNavItems = getVisibleNavItems(settings.modules, role, access);

  return (
    <nav className="space-y-1 p-4">
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
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-primary text-white"
                  : "hover:bg-brand-primary/8 text-brand-ink"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>

            {showChildren && item.children && (
              <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
                {item.children.map((child) => {
                  const ChildIcon = child.icon;
                  const childActive = child.isActive(pathname);

                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        childActive
                          ? "bg-brand-primary/10 text-brand-primary"
                          : "text-brand-muted hover:bg-brand-primary/5 hover:text-brand-ink"
                      )}
                    >
                      {ChildIcon && <ChildIcon className="size-3.5" />}
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <Link
        href="/"
        onClick={onNavigate}
        className="mt-4 block px-3 text-xs text-brand-muted transition-colors hover:text-brand-ink"
      >
        ← Back to site
      </Link>
    </nav>
  );
}

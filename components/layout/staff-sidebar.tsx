"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import { ShopBrandMark } from "@/components/branding/shop-brand-mark";
import { shouldExpandNavChildren, isNavItemActive, getVisibleNavItems, navItems } from "@/components/layout/nav-config";
import { useStaffAccess } from "@/hooks/use-staff-access";
import { useAuth } from "@/components/providers/auth-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { cn } from "@/lib/utils";

export function StaffSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { settings } = useShopSettings();
  const { role, access } = useStaffAccess();
  const visibleNavItems = getVisibleNavItems(settings.modules, role, access);

  return (
    <aside className="hidden lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col border-r border-sidebar-border bg-white shadow-sm">
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <ShopBrandMark className="min-w-0 flex-1" />
      </div>

      <nav className="flex-1 min-h-0 space-y-1 overflow-y-auto p-4">
        {visibleNavItems.map((item) => {
          const isActive = isNavItemActive(pathname, item);
          const Icon = item.icon;
          const showChildren = shouldExpandNavChildren(pathname, item);

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-brand-primary text-white shadow-sm"
                    : "text-brand-ink hover:bg-brand-primary/8"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.children && (
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 opacity-70 transition-transform",
                      showChildren && "rotate-180"
                    )}
                  />
                )}
              </Link>

              {showChildren && item.children && (
                <div className="mt-1 ml-3 space-y-0.5 border-l border-border pl-3">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
                    const childActive = child.isActive(pathname);

                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "flex items-center gap-2.5 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                          childActive
                            ? "bg-brand-primary/10 text-brand-primary"
                            : "text-brand-muted hover:bg-brand-primary/5 hover:text-brand-ink"
                        )}
                      >
                        {ChildIcon && <ChildIcon className="size-3.5 shrink-0" />}
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

      <div className="mt-auto border-t border-sidebar-border p-4">
        {profile?.type === "staff" && (
          <div className="mb-4 px-1">
            <p className="truncate text-xs font-medium text-brand-ink">
              {profile.user.name}
            </p>
            <p className="truncate text-xs text-brand-muted">
              {profile.tenant.name}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={async () => {
            await signOut();
            router.push("/login");
          }}
          className="flex w-full items-center gap-2 rounded-full px-2 py-2 text-xs text-brand-muted transition-colors hover:bg-brand-primary/8 hover:text-brand-ink"
        >
          <LogOut className="size-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

export { navItems as mobileNavItems };

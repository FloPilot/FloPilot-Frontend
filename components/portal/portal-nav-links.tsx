"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { buildPortalNavItems } from "@/components/portal/portal-nav-config";
import { usePortalPaths } from "@/components/portal/portal-paths";
import { staffNav } from "@/lib/staff-nav-theme";
import { cn } from "@/lib/utils";

export function PortalNavLinks({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const paths = usePortalPaths();
  const portalNavItems = buildPortalNavItems(paths);

  return (
    <nav className={cn("space-y-0.5", className)}>
      {portalNavItems.map((item) => {
        const isActive = item.isActive(pathname);
        const Icon = item.icon;
        const showChildren = Boolean(
          item.children?.some((child) => child.isActive(pathname)) ||
            (item.children && isActive)
        );

        return (
          <div key={item.key}>
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
              {item.children ? (
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 opacity-60 transition-transform",
                    showChildren && "rotate-180"
                  )}
                />
              ) : null}
            </Link>

            {showChildren && item.children ? (
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
                        childActive
                          ? staffNav.childLinkActive
                          : staffNav.childLink
                      )}
                    >
                      <ChildIcon className="size-3.5 shrink-0 opacity-80" />
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

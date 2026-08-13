"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, ShoppingBag } from "lucide-react";
import {
  getEnabledNavChildren,
  getEnabledNavItems,
  isNavItemActive,
  navItemHasSubmenu,
  resolveNavItemAction,
  type ClientStoreNavItem,
  type ClientStoreNavigation,
  type ClientStoreTheme,
} from "@/lib/client-store-theme";
import type { PublicClientStore } from "@/lib/client-stores";
import { cn } from "@/lib/utils";

export function StoreHeader({
  store,
  theme,
  navigation,
  activePageHandle,
  activeCollectionId,
  accentHex,
  cartCount,
  onCart,
  onNavItem,
  actionSlot,
}: {
  store: PublicClientStore;
  theme: ClientStoreTheme;
  navigation: ClientStoreNavigation;
  activePageHandle: string;
  activeCollectionId: string | null;
  accentHex: string;
  cartCount?: number;
  onCart?: () => void;
  onNavItem: (item: ClientStoreNavItem) => void;
  /** Replaces the default cart button (e.g. review mode actions). */
  actionSlot?: ReactNode;
}) {
  const brand = store.company || store.customerName || store.name;
  const navItems = getEnabledNavItems(navigation);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [mobileOpenId, setMobileOpenId] = useState<string | null>(null);
  const logoUrl =
    navigation.logoMode === "none"
      ? null
      : navigation.logoMode === "custom"
        ? navigation.customLogoUrl
        : store.logoUrl;
  const showName = navigation.showStoreName !== false;
  const showLogoBlock = navigation.logoMode !== "none" || showName;

  useEffect(() => {
    if (!openMenuId) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest?.("[data-store-nav-menu]")) {
        setOpenMenuId(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenuId(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenuId]);

  const activateItem = (item: ClientStoreNavItem) => {
    onNavItem(item);
    setOpenMenuId(null);
    setMobileOpenId(null);
  };

  return (
    <header className="relative z-30 shrink-0 overflow-visible border-b border-[#e3e3e3] bg-white/95 backdrop-blur-sm">
      <div className="relative mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 overflow-visible px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {showLogoBlock ? (
            <button
              type="button"
              onClick={() =>
                activateItem({
                  id: "logo-home",
                  label: "Home",
                  type: "home",
                  enabled: true,
                })
              }
              className="flex min-w-0 items-center gap-3 text-left"
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt=""
                  className="h-9 w-auto max-w-[140px] object-contain"
                />
              ) : navigation.logoMode !== "none" ? (
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold text-white"
                  style={{ background: accentHex }}
                >
                  {brand.slice(0, 2).toUpperCase()}
                </div>
              ) : null}
              {showName ? (
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold tracking-tight text-[#303030]">
                    {store.name}
                  </p>
                  <p className="truncate text-[12px] text-[#8a8a8a]">{brand}</p>
                </div>
              ) : null}
            </button>
          ) : null}
        </div>
        <div className="relative flex items-center gap-1 overflow-visible sm:gap-2">
          {navItems.length > 0 ? (
            <nav className="relative mr-1 hidden items-center gap-0.5 overflow-visible md:flex">
              {navItems.map((item) => {
                const active = isNavItemActive(
                  item,
                  theme,
                  activePageHandle,
                  activeCollectionId
                );
                const children = getEnabledNavChildren(item);
                const hasSubmenu = children.length > 0;
                const open = openMenuId === item.id;

                if (!hasSubmenu) {
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => activateItem(item)}
                      className={cn(
                        "rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                        active
                          ? "bg-[#f6f6f7] text-[#303030]"
                          : "text-[#616161] hover:text-[#303030]"
                      )}
                    >
                      {item.label}
                    </button>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className="relative"
                    data-store-nav-menu
                    onMouseEnter={() => setOpenMenuId(item.id)}
                    onMouseLeave={() =>
                      setOpenMenuId((current) =>
                        current === item.id ? null : current
                      )
                    }
                  >
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-haspopup="menu"
                      onClick={() => {
                        const action = resolveNavItemAction(item, theme);
                        if (action.kind !== "noop" && !open) {
                          activateItem(item);
                          return;
                        }
                        setOpenMenuId(open ? null : item.id);
                      }}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                        active || open
                          ? "bg-[#f6f6f7] text-[#303030]"
                          : "text-[#616161] hover:text-[#303030]"
                      )}
                    >
                      {item.label}
                      <ChevronDown
                        className={cn(
                          "size-3.5 opacity-70 transition-transform duration-150",
                          open && "rotate-180"
                        )}
                      />
                    </button>
                    {open ? (
                      <div
                        role="menu"
                        className="absolute left-0 top-full z-50 min-w-[12rem] pt-2"
                      >
                        {/* Bridge so hover doesn’t drop between trigger and panel */}
                        <div className="absolute inset-x-0 top-0 h-2" aria-hidden />
                        <div className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-white py-1.5 shadow-[0_12px_28px_rgba(26,26,26,0.12)]">
                          {children.map((child) => {
                            const childActive = isNavItemActive(
                              child,
                              theme,
                              activePageHandle,
                              activeCollectionId
                            );
                            return (
                              <button
                                key={child.id}
                                type="button"
                                role="menuitem"
                                onClick={() => activateItem(child)}
                                className={cn(
                                  "relative flex w-full items-center px-3.5 py-2.5 text-left text-[13px] font-medium transition-colors",
                                  childActive
                                    ? "text-[#303030]"
                                    : "text-[#616161] hover:bg-[#f6f6f7] hover:text-[#303030]"
                                )}
                                style={
                                  childActive
                                    ? { background: `${accentHex}14` }
                                    : undefined
                                }
                              >
                                {childActive ? (
                                  <span
                                    className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full"
                                    style={{ background: accentHex }}
                                    aria-hidden
                                  />
                                ) : null}
                                {child.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </nav>
          ) : null}
          {actionSlot !== undefined ? (
            actionSlot
          ) : (
            <button
              type="button"
              onClick={onCart}
              className="relative inline-flex h-10 items-center gap-2 rounded-lg border border-[#e3e3e3] bg-white px-3 text-[13px] font-medium text-[#303030] transition-colors hover:bg-[#f6f6f7]"
            >
              <ShoppingBag className="size-4 text-[#616161]" />
              <span className="hidden sm:inline">Cart</span>
              {(cartCount || 0) > 0 ? (
                <span
                  className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  style={{ background: accentHex }}
                >
                  {cartCount}
                </span>
              ) : null}
            </button>
          )}
        </div>
      </div>
      {navItems.length > 0 ? (
        <div className="border-t border-[#ebebeb] px-4 py-2 md:hidden">
          <div className="flex gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const active = isNavItemActive(
                item,
                theme,
                activePageHandle,
                activeCollectionId
              );
              const hasSubmenu = navItemHasSubmenu(item);
              const open = mobileOpenId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (hasSubmenu) {
                      setMobileOpenId(open ? null : item.id);
                      return;
                    }
                    activateItem(item);
                  }}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-medium",
                    active || open
                      ? "bg-[#f6f6f7] text-[#303030]"
                      : "text-[#616161]"
                  )}
                >
                  {item.label}
                  {hasSubmenu ? (
                    <ChevronDown
                      className={cn(
                        "size-3 transition-transform",
                        open && "rotate-180"
                      )}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
          {mobileOpenId
            ? (() => {
                const parent = navItems.find((item) => item.id === mobileOpenId);
                const children = parent ? getEnabledNavChildren(parent) : [];
                if (!parent || children.length === 0) return null;
                return (
                  <div className="mt-2 overflow-hidden rounded-xl border border-[#e3e3e3] bg-white p-1.5 shadow-[0_8px_20px_rgba(26,26,26,0.08)]">
                    {resolveNavItemAction(parent, theme).kind !== "noop" ? (
                      <button
                        type="button"
                        onClick={() => activateItem(parent)}
                        className="flex w-full rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-[#303030] hover:bg-[#f6f6f7]"
                      >
                        View {parent.label}
                      </button>
                    ) : null}
                    {children.map((child) => {
                      const childActive = isNavItemActive(
                        child,
                        theme,
                        activePageHandle,
                        activeCollectionId
                      );
                      return (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => activateItem(child)}
                          className={cn(
                            "relative flex w-full rounded-lg px-2.5 py-2 text-left text-[12px] font-medium",
                            childActive
                              ? "text-[#303030]"
                              : "text-[#616161] hover:bg-[#f6f6f7] hover:text-[#303030]"
                          )}
                          style={
                            childActive
                              ? { background: `${accentHex}14` }
                              : undefined
                          }
                        >
                          {childActive ? (
                            <span
                              className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full"
                              style={{ background: accentHex }}
                              aria-hidden
                            />
                          ) : null}
                          {child.label}
                        </button>
                      );
                    })}
                  </div>
                );
              })()
            : null}
        </div>
      ) : null}
    </header>
  );
}

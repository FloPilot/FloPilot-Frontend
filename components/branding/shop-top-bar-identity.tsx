"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Check,
  Loader2,
  LogOut,
  PlusCircle,
  Settings,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listUserTenants, type UserTenantSummary } from "@/lib/api";
import { getDisplayShopName } from "@/lib/tenant-branding";
import { cn } from "@/lib/utils";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function ShopAvatar({
  name,
  logoUrl,
  size = "md",
  className,
}: {
  name: string;
  logoUrl?: string;
  size?: "sm" | "md" | "trigger";
  className?: string;
}) {
  const dimension =
    size === "sm" ? "size-7" : size === "trigger" ? "size-[26px]" : "size-8";

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-[7px] bg-white text-[#303030] shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_1px_2px_rgba(0,0,0,0.35)]",
        dimension,
        className
      )}
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt=""
          fill
          unoptimized
          className="object-contain p-0.5"
        />
      ) : (
        <Boxes
          className={
            size === "sm" ? "size-3" : size === "trigger" ? "size-3.5" : "size-3.5"
          }
          strokeWidth={1.75}
        />
      )}
    </span>
  );
}

function UserAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-[7px] bg-[#5c6ac4] text-xs font-semibold text-white",
        className
      )}
    >
      {getInitials(name) || "?"}
    </span>
  );
}

function ShopSwitcherRow({
  shop,
  active,
  switching,
  onSelect,
}: {
  shop: UserTenantSummary;
  active: boolean;
  switching: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={active || switching}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors",
        active ? "bg-[#f6f6f7]" : "hover:bg-[#f6f6f7]",
        switching && !active && "opacity-60"
      )}
    >
      <ShopAvatar name={shop.name} logoUrl={shop.logoUrl} size="sm" />
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#303030]">
        {shop.name}
      </span>
      {active ? (
        <Check className="size-4 shrink-0 text-[#303030]" strokeWidth={2} />
      ) : switching ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-[#616161]" />
      ) : null}
    </button>
  );
}

export function ShopTopBarIdentity({ className }: { className?: string }) {
  const router = useRouter();
  const { user, profile, signOut, getIdToken, switchShop, switchingShop } =
    useAuth();
  const { settings } = useShopSettings();

  const [open, setOpen] = useState(false);
  const [tenants, setTenants] = useState<UserTenantSummary[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [pendingTenantId, setPendingTenantId] = useState<string | null>(null);

  const tenantName =
    profile?.type === "staff" ? profile.tenant.name : undefined;
  const activeTenantId =
    profile?.type === "staff" ? profile.tenant.id : null;
  const displayName = getDisplayShopName(settings.shopName, tenantName);
  const { logoUrl } = settings.branding;
  const userName = profile?.type === "staff" ? profile.user.name : null;
  const userEmail =
    profile?.type === "staff" ? profile.user.email : user?.email || null;

  const currentShop = useMemo((): UserTenantSummary | null => {
    if (profile?.type !== "staff" || !activeTenantId || !tenantName) {
      return null;
    }
    return {
      tenantId: activeTenantId,
      userId: profile.user.id,
      name: displayName,
      slug: profile.tenant.slug,
      logoUrl,
      role: profile.user.role,
    };
  }, [profile, activeTenantId, tenantName, displayName, logoUrl]);

  const displayShops = useMemo(() => {
    const byId = new Map<string, UserTenantSummary>();
    if (currentShop) byId.set(currentShop.tenantId, currentShop);
    for (const shop of tenants) {
      byId.set(shop.tenantId, shop);
    }
    return Array.from(byId.values()).sort((a, b) => {
      if (a.tenantId === activeTenantId) return -1;
      if (b.tenantId === activeTenantId) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [currentShop, tenants, activeTenantId]);

  const loadTenants = useCallback(async () => {
    setTenantsLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await listUserTenants(token);
      setTenants(res.tenants);
    } catch {
      if (currentShop) {
        setTenants([currentShop]);
      }
    } finally {
      setTenantsLoading(false);
    }
  }, [getIdToken, currentShop]);

  useEffect(() => {
    if (open) {
      void loadTenants();
    }
  }, [open, loadTenants]);

  async function handleSwitchShop(tenantId: string) {
    if (tenantId === activeTenantId || switchingShop) return;

    setPendingTenantId(tenantId);
    try {
      await switchShop(tenantId);
      setOpen(false);
      router.push("/app/dashboard");
    } finally {
      setPendingTenantId(null);
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(
          "flex max-w-[min(100%,260px)] items-center gap-2 rounded-lg px-1.5 py-1 text-left outline-none transition-[background-color,box-shadow,border-color]",
          "hover:bg-[#303030] focus-visible:ring-2 focus-visible:ring-white/15",
          open &&
            "bg-[#303030] shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_2px_8px_rgba(0,0,0,0.35)]",
          className
        )}
      >
        <ShopAvatar name={displayName} logoUrl={logoUrl} size="trigger" />
        <span className="hidden min-w-0 truncate text-[13px] font-medium text-[#e3e3e3] sm:block">
          {displayName}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[min(calc(100vw-1.5rem),320px)] rounded-xl border border-[#e3e3e3] p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.12)]"
      >
        {currentShop && (
          <DropdownMenuGroup>
            <div className="px-1 py-0.5">
              {displayShops.map((shop) => (
                <ShopSwitcherRow
                  key={shop.tenantId}
                  shop={shop}
                  active={shop.tenantId === activeTenantId}
                  switching={
                    switchingShop && pendingTenantId === shop.tenantId
                  }
                  onSelect={() => void handleSwitchShop(shop.tenantId)}
                />
              ))}

              {tenantsLoading && displayShops.length <= 1 ? (
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-[#616161]">
                  <Loader2 className="size-3 animate-spin" />
                  Checking for other shops…
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push("/register-shop");
                }}
                className="mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[13px] font-medium text-[#303030] transition-colors hover:bg-[#f6f6f7]"
              >
                <span className="flex size-7 items-center justify-center rounded-full border border-[#c9cccf] text-[#616161]">
                  <PlusCircle className="size-3.5" strokeWidth={1.75} />
                </span>
                Create shop
              </button>
            </div>
            <DropdownMenuSeparator className="my-1.5 bg-[#e3e3e3]" />
          </DropdownMenuGroup>
        )}

        <DropdownMenuGroup>
          {(userName || userEmail) && (
            <div className="flex items-center gap-2.5 px-2 py-2">
              <UserAvatar name={userName || userEmail || ""} />
              <div className="min-w-0 flex-1">
                {userName && userName !== userEmail ? (
                  <>
                    <p className="truncate text-[13px] font-medium text-[#303030]">
                      {userName}
                    </p>
                    {userEmail && (
                      <p className="truncate text-xs text-[#616161]">{userEmail}</p>
                    )}
                  </>
                ) : userEmail ? (
                  <p className="truncate text-[13px] font-medium text-[#303030]">
                    {userEmail}
                  </p>
                ) : null}
              </div>
            </div>
          )}

          <DropdownMenuItem
            className="rounded-lg px-2 py-2 text-[13px] text-[#303030]"
            onClick={() => {
              setOpen(false);
              router.push("/app/settings");
            }}
          >
            <Settings className="size-4 text-[#616161]" />
            Shop settings
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-1.5 bg-[#e3e3e3]" />

          <DropdownMenuItem
            className="rounded-lg px-2 py-2 text-[13px] text-[#303030]"
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.push("/login");
            }}
          >
            <LogOut className="size-4 text-[#616161]" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

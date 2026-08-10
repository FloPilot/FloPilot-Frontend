"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
import {
  listUserTenants,
  type UserPortalSummary,
  type UserTenantSummary,
} from "@/lib/api";
import {
  persistStaffDisplayName,
  pickStaffDisplayName,
} from "@/lib/staff-display-name";
import { getShopInitials } from "@/lib/shop-initials";
import {
  DEFAULT_PRIMARY_COLOR,
  getDisplayShopName,
} from "@/lib/tenant-branding";
import { cn } from "@/lib/utils";

type WorkspaceRow =
  | (UserTenantSummary & { kind: "staff" })
  | UserPortalSummary;

function ShopAvatar({
  name,
  logoUrl,
  brandColor,
  size = "md",
  className,
}: {
  name: string;
  logoUrl?: string;
  brandColor?: string;
  size?: "sm" | "md" | "trigger";
  className?: string;
}) {
  const dimension =
    size === "sm" ? "size-7" : size === "trigger" ? "size-[26px]" : "size-8";
  const initials = getShopInitials(name);
  const background = brandColor?.trim() || DEFAULT_PRIMARY_COLOR;

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-[7px] font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_1px_2px_rgba(0,0,0,0.35)]",
        size === "sm" ? "text-[10px]" : "text-[11px]",
        dimension,
        className
      )}
      style={logoUrl ? undefined : { backgroundColor: background }}
    >
      {logoUrl ? (
        <span className="absolute inset-0 bg-white">
          <Image
            src={logoUrl}
            alt=""
            fill
            unoptimized
            className="object-contain p-0.5"
          />
        </span>
      ) : (
        <span aria-hidden>{initials}</span>
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
      {getShopInitials(name)}
    </span>
  );
}

function WorkspaceSwitcherRow({
  shop,
  active,
  switching,
  onSelect,
}: {
  shop: WorkspaceRow;
  active: boolean;
  switching: boolean;
  onSelect: () => void;
}) {
  const isPortal = shop.kind === "portal";

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
      <ShopAvatar
        name={shop.name}
        logoUrl={shop.logoUrl}
        brandColor={shop.primaryColor}
        size="sm"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-[#303030]">
          {shop.name}
        </span>
        {isPortal ? (
          <span className="mt-0.5 inline-flex rounded-md bg-[#ebf4ff] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2c6ecb]">
            Customer Portal
          </span>
        ) : null}
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
  const {
    user,
    profile,
    signOut,
    getIdToken,
    switchShop,
    switchPortalShop,
    switchingShop,
  } = useAuth();
  const { settings } = useShopSettings();

  const [open, setOpen] = useState(false);
  const [tenants, setTenants] = useState<UserTenantSummary[]>([]);
  const [portals, setPortals] = useState<UserPortalSummary[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const isStaff = profile?.type === "staff";
  const isPortal = profile?.type === "portal";
  const tenantName =
    isStaff || isPortal ? profile.tenant.name : undefined;
  const activeTenantId =
    isStaff || isPortal ? profile.tenant.id : null;
  const activeCustomerId = isPortal ? profile.customer.id : null;
  const displayName = getDisplayShopName(settings.shopName, tenantName);
  const { logoUrl, primaryColor } = settings.branding;
  const userName = isStaff
    ? profile.user.name
    : isPortal
      ? profile.customer.name
      : null;
  const userEmail = isStaff
    ? profile.user.email
    : isPortal
      ? (typeof profile.customer.email === "string"
          ? profile.customer.email
          : user?.email || null)
      : user?.email || null;

  useEffect(() => {
    const cached = pickStaffDisplayName(
      userName,
      ...tenants.map((shop) => shop.memberName),
      ...portals.map((shop) => shop.memberName)
    );
    if (cached) persistStaffDisplayName(cached);
  }, [userName, tenants, portals]);

  const currentStaffShop = useMemo((): (UserTenantSummary & {
    kind: "staff";
  }) | null => {
    if (!isStaff || !activeTenantId || !tenantName) return null;
    return {
      kind: "staff",
      tenantId: activeTenantId,
      userId: profile.user.id,
      name: displayName,
      memberName: profile.user.name,
      slug: profile.tenant.slug,
      logoUrl: logoUrl || "",
      primaryColor,
      role: profile.user.role,
    };
  }, [isStaff, profile, activeTenantId, tenantName, displayName, logoUrl, primaryColor]);

  const currentPortalShop = useMemo((): UserPortalSummary | null => {
    if (!isPortal || !activeTenantId || !activeCustomerId || !tenantName) {
      return null;
    }
    return {
      kind: "portal",
      tenantId: activeTenantId,
      customerId: activeCustomerId,
      name: displayName,
      company:
        typeof profile.customer.company === "string"
          ? profile.customer.company
          : "",
      memberName: profile.customer.name,
      slug: profile.tenant.slug,
      logoUrl: logoUrl || "",
      primaryColor,
    };
  }, [
    isPortal,
    profile,
    activeTenantId,
    activeCustomerId,
    tenantName,
    displayName,
    logoUrl,
    primaryColor,
  ]);

  const displayShops = useMemo(() => {
    const staffById = new Map<string, WorkspaceRow>();
    const portalByKey = new Map<string, WorkspaceRow>();

    if (currentStaffShop) staffById.set(currentStaffShop.tenantId, currentStaffShop);
    if (currentPortalShop) {
      portalByKey.set(
        `${currentPortalShop.tenantId}:${currentPortalShop.customerId}`,
        currentPortalShop
      );
    }

    for (const shop of tenants) {
      staffById.set(shop.tenantId, { ...shop, kind: "staff" });
    }
    for (const shop of portals) {
      portalByKey.set(`${shop.tenantId}:${shop.customerId}`, shop);
    }

    const rows = [
      ...Array.from(staffById.values()),
      ...Array.from(portalByKey.values()),
    ];

    return rows.sort((a, b) => {
      const aActive =
        a.kind === "staff"
          ? isStaff && a.tenantId === activeTenantId
          : isPortal &&
            a.tenantId === activeTenantId &&
            a.customerId === activeCustomerId;
      const bActive =
        b.kind === "staff"
          ? isStaff && b.tenantId === activeTenantId
          : isPortal &&
            b.tenantId === activeTenantId &&
            b.customerId === activeCustomerId;
      if (aActive) return -1;
      if (bActive) return 1;
      if (a.kind !== b.kind) return a.kind === "staff" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [
    currentStaffShop,
    currentPortalShop,
    tenants,
    portals,
    isStaff,
    isPortal,
    activeTenantId,
    activeCustomerId,
  ]);

  const loadTenants = useCallback(async () => {
    setTenantsLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await listUserTenants(token);
      setTenants(res.tenants);
      setPortals(res.portals || []);
    } catch {
      if (currentStaffShop) setTenants([currentStaffShop]);
      if (currentPortalShop) setPortals([currentPortalShop]);
    } finally {
      setTenantsLoading(false);
    }
  }, [getIdToken, currentStaffShop, currentPortalShop]);

  useEffect(() => {
    if (open) void loadTenants();
  }, [open, loadTenants]);

  async function handleSelect(shop: WorkspaceRow) {
    if (shop.kind === "staff") {
      if (isStaff && shop.tenantId === activeTenantId) return;
      setPendingKey(`staff:${shop.tenantId}`);
      try {
        await switchShop(shop.tenantId);
        setOpen(false);
        router.push("/app/dashboard");
      } finally {
        setPendingKey(null);
      }
      return;
    }

    if (
      isPortal &&
      shop.tenantId === activeTenantId &&
      shop.customerId === activeCustomerId
    ) {
      return;
    }
    setPendingKey(`portal:${shop.tenantId}:${shop.customerId}`);
    try {
      await switchPortalShop(shop.tenantId, shop.customerId);
      setOpen(false);
      router.push("/portal/app");
    } finally {
      setPendingKey(null);
    }
  }

  const triggerLabel = displayName || "Workspace";

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
        <ShopAvatar
          name={triggerLabel}
          logoUrl={logoUrl}
          brandColor={primaryColor}
          size="trigger"
        />
        <span className="hidden min-w-0 truncate text-[13px] font-medium text-[#e3e3e3] sm:block">
          {triggerLabel}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[min(calc(100vw-1.5rem),320px)] rounded-xl border border-[#e3e3e3] p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.12)]"
      >
        {(currentStaffShop || currentPortalShop || displayShops.length > 0) && (
          <DropdownMenuGroup>
            <div className="px-1 py-0.5">
              {displayShops.map((shop) => {
                const key =
                  shop.kind === "staff"
                    ? `staff:${shop.tenantId}`
                    : `portal:${shop.tenantId}:${shop.customerId}`;
                const active =
                  shop.kind === "staff"
                    ? isStaff && shop.tenantId === activeTenantId
                    : isPortal &&
                      shop.tenantId === activeTenantId &&
                      shop.customerId === activeCustomerId;
                return (
                  <WorkspaceSwitcherRow
                    key={key}
                    shop={shop}
                    active={active}
                    switching={switchingShop && pendingKey === key}
                    onSelect={() => void handleSelect(shop)}
                  />
                );
              })}

              {tenantsLoading && displayShops.length <= 1 ? (
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-[#616161]">
                  <Loader2 className="size-3 animate-spin" />
                  Checking for other shops…
                </div>
              ) : null}

              {isStaff || !isPortal ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    // Separate route from first-time /register-shop so existing
                    // members can always add another workspace.
                    router.push("/new-shop");
                  }}
                  className="mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[13px] font-medium text-[#303030] transition-colors hover:bg-[#f6f6f7]"
                >
                  <span className="flex size-7 items-center justify-center rounded-full border border-[#c9cccf] text-[#616161]">
                    <PlusCircle className="size-3.5" strokeWidth={1.75} />
                  </span>
                  Create shop
                </button>
              ) : null}
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
                {isPortal ? (
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2c6ecb]">
                    Customer Portal
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {isStaff ? (
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
          ) : isPortal ? (
            <DropdownMenuItem
              className="rounded-lg px-2 py-2 text-[13px] text-[#303030]"
              onClick={() => {
                setOpen(false);
                router.push("/portal/app/business");
              }}
            >
              <Settings className="size-4 text-[#616161]" />
              Business profile
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuSeparator className="my-1.5 bg-[#e3e3e3]" />

          <DropdownMenuItem
            className="rounded-lg px-2 py-2 text-[13px] text-[#303030]"
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.push(isPortal ? "/portal" : "/login");
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

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Loader2,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { FloPilotWatermark } from "@/components/branding/flopilot-watermark";
import { StoreProductDetailInteractive, StoreProductMediaThumb } from "@/components/stores/store-product-detail";
import { StoreSectionRenderer } from "@/components/stores/store-section-renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  getPublicClientStore,
  submitClientStoreOrder,
} from "@/lib/api";
import {
  clearClientStoreCart,
  readClientStoreCart,
  writeClientStoreCart,
} from "@/lib/client-store-cart";
import { ensureStoreTheme, isStorefrontNavPage, resolveCollectionProducts } from "@/lib/client-store-theme";
import type {
  PublicClientStore,
  PublicClientStoreProduct,
} from "@/lib/client-stores";
import {
  getMockupsForColor,
  getPrimaryMockupUrl,
  getProductColorNames,
} from "@/lib/client-stores";
import {
  CUSTOMER_ACCENT_OPTIONS,
  type CustomerAccent,
} from "@/lib/production-customer-colors";
import { DEFAULT_PRIMARY_COLOR } from "@/lib/tenant-branding";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type CartLine = {
  key: string;
  productId: string;
  productName: string;
  size: string;
  color?: string;
  qty: number;
  unitPrice: number;
  mockupUrl?: string;
};

function accentFor(key?: string): CustomerAccent {
  return (
    CUSTOMER_ACCENT_OPTIONS.find((opt) => opt.key === key) ||
    CUSTOMER_ACCENT_OPTIONS[0]
  );
}

function StoreHeader({
  store,
  pages,
  activePageHandle,
  accentHex,
  cartCount,
  onCart,
  onSelectPage,
}: {
  store: PublicClientStore;
  pages: { id: string; handle: string; title: string }[];
  activePageHandle: string;
  accentHex: string;
  cartCount: number;
  onCart: () => void;
  onSelectPage: (handle: string) => void;
}) {
  const brand = store.company || store.customerName || store.name;
  return (
    <header className="z-30 shrink-0 border-b border-[#e3e3e3] bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => onSelectPage("home")}
            className="flex min-w-0 items-center gap-3 text-left"
          >
            {store.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={store.logoUrl}
                alt=""
                className="h-9 w-auto max-w-[140px] object-contain"
              />
            ) : (
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold text-white"
                style={{ background: accentHex }}
              >
                {brand.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold tracking-tight text-[#303030]">
                {store.name}
              </p>
              <p className="truncate text-[12px] text-[#8a8a8a]">{brand}</p>
            </div>
          </button>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {pages.length > 1 ? (
            <nav className="mr-1 hidden items-center gap-0.5 md:flex">
              {pages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => onSelectPage(page.handle)}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                    activePageHandle === page.handle
                      ? "bg-[#f6f6f7] text-[#303030]"
                      : "text-[#616161] hover:text-[#303030]"
                  )}
                >
                  {page.title}
                </button>
              ))}
            </nav>
          ) : null}
          <button
            type="button"
            onClick={onCart}
            className="relative inline-flex h-10 items-center gap-2 rounded-lg border border-[#e3e3e3] bg-white px-3 text-[13px] font-medium text-[#303030] transition-colors hover:bg-[#f6f6f7]"
          >
            <ShoppingBag className="size-4 text-[#616161]" />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 ? (
              <span
                className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                style={{ background: accentHex }}
              >
                {cartCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>
      {pages.length > 1 ? (
        <div className="flex gap-1 overflow-x-auto border-t border-[#ebebeb] px-4 py-2 md:hidden">
          {pages.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => onSelectPage(page.handle)}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1 text-[12px] font-medium",
                activePageHandle === page.handle
                  ? "bg-[#f6f6f7] text-[#303030]"
                  : "text-[#616161]"
              )}
            >
              {page.title}
            </button>
          ))}
        </div>
      ) : null}
    </header>
  );
}

export function PublicStorefrontView({ token }: { token: string }) {
  const [store, setStore] = useState<PublicClientStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PublicClientStoreProduct | null>(
    null
  );
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(
    null
  );
  const [activePageHandle, setActivePageHandle] = useState("home");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [mockupIndex, setMockupIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartHydrated, setCartHydrated] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(
    async (pwd?: string) => {
      setLoading(true);
      setError(null);
      setPasswordError(null);
      try {
        const res = await getPublicClientStore(token, {
          password: pwd || undefined,
        });
        setStore(res.store);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not load store";
        if (/password/i.test(message)) {
          setPasswordError(message);
        } else {
          setError(message);
        }
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const stored = readClientStoreCart(token);
    setCart(stored);
    setCartHydrated(true);
  }, [token]);

  useEffect(() => {
    if (!cartHydrated) return;
    writeClientStoreCart(token, cart);
  }, [cart, cartHydrated, token]);

  useEffect(() => {
    if (!store || !cartHydrated) return;
    const productIds = new Set(store.products.map((product) => product.id));
    setCart((prev) => {
      const next = prev.filter((line) => productIds.has(line.productId));
      return next.length === prev.length ? prev : next;
    });
  }, [store, cartHydrated]);

  useEffect(() => {
    if (!selected) return;
    const firstSize = selected.sizes.find((row) => row.enabled)?.size || "";
    setSize(firstSize);
    setColor(getProductColorNames(selected)[0] || "");
    setMockupIndex(0);
    setQty(1);
  }, [selected]);

  useEffect(() => {
    setMockupIndex(0);
  }, [color]);

  const selectedMockups = useMemo(
    () => (selected ? getMockupsForColor(selected, color || undefined) : []),
    [selected, color]
  );
  const activeMockup =
    selectedMockups[mockupIndex] ||
    selectedMockups[0] ||
    selected?.mockupUrl;

  const accent = accentFor(store?.accentColorKey);
  const accentHex = accent.hex || DEFAULT_PRIMARY_COLOR;
  const cartCount = useMemo(
    () => cart.reduce((sum, line) => sum + line.qty, 0),
    [cart]
  );

  const theme = useMemo(
    () =>
      ensureStoreTheme(store?.theme, {
        name: store?.name,
        headline: store?.headline,
        description: store?.description,
        heroImageUrl: store?.heroImageUrl,
      }),
    [store]
  );

  const navPages = useMemo(
    () =>
      theme.pages
        .filter(isStorefrontNavPage)
        .map((page) => ({
          id: page.id,
          handle: page.handle,
          title: page.title,
        })),
    [theme.pages]
  );

  const productPage = useMemo(
    () =>
      theme.pages.find((page) => page.handle === "product") || null,
    [theme.pages]
  );

  const productPageSections = productPage?.sections || [];

  const productMediaSettings = useMemo(() => {
    const detail = productPageSections.find(
      (section) => section.type === "product_detail"
    );
    return detail?.settings || null;
  }, [productPageSections]);

  const activePage = useMemo(() => {
    return (
      theme.pages.find(
        (page) => page.handle === activePageHandle && page.enabled
      ) ||
      theme.pages.find((page) => page.handle === "home") ||
      theme.pages[0] ||
      null
    );
  }, [theme.pages, activePageHandle]);

  const pageSections = activePage?.sections || theme.sections;

  const activeCollection = useMemo(
    () =>
      theme.collections.find(
        (collection) => collection.id === activeCollectionId && collection.enabled
      ) || null,
    [theme.collections, activeCollectionId]
  );

  const collectionProducts = useMemo(() => {
    if (!store || !activeCollection) return [];
    return resolveCollectionProducts(activeCollection, store.products);
  }, [store, activeCollection]);
  const cartTotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.unitPrice * line.qty, 0),
    [cart]
  );

  const addToCart = () => {
    if (!selected || !size) return;
    const key = `${selected.id}:${size}:${color || ""}`;
    setCart((prev) => {
      const existing = prev.find((line) => line.key === key);
      if (existing) {
        return prev.map((line) =>
          line.key === key ? { ...line, qty: line.qty + qty } : line
        );
      }
      return [
        ...prev,
        {
          key,
          productId: selected.id,
          productName: selected.name,
          size,
          color: color || undefined,
          qty,
          unitPrice: selected.sellPrice,
          mockupUrl: activeMockup || selected.mockupUrl,
        },
      ];
    });
    setCheckoutOpen(true);
  };

  const submitOrder = async () => {
    if (!store) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitClientStoreOrder(token, {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
        password: password || undefined,
        items: cart.map((line) => ({
          productId: line.productId,
          size: line.size,
          color: line.color,
          qty: line.qty,
        })),
      });
      setSubmitted(true);
      setCart([]);
      clearClientStoreCart(token);
      setCheckoutOpen(false);
      setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit order");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center gap-2 bg-[#f6f6f7] text-[13px] text-[#616161]">
        <Loader2 className="size-4 animate-spin" />
        Loading store…
      </div>
    );
  }

  if (error && !store) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f6f6f7] px-4">
        <div className="max-w-md text-center">
          <p className="text-[18px] font-semibold text-[#303030]">
            Store unavailable
          </p>
          <p className="mt-2 text-[14px] text-[#616161]">{error}</p>
        </div>
      </div>
    );
  }

  if (!store) return null;

  if (store.passwordProtected && !store.unlocked) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f6f6f7] px-4">
        <div className="w-full max-w-sm rounded-xl border border-[#e3e3e3] bg-white p-6 shadow-sm">
          {store.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={store.logoUrl}
              alt=""
              className="mx-auto mb-4 h-10 w-auto object-contain"
            />
          ) : null}
          <h1 className="text-center text-[17px] font-semibold text-[#303030]">
            {store.name}
          </h1>
          <p className="mt-1 text-center text-[13px] text-[#616161]">
            Enter the store password to continue.
          </p>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void load(password);
            }}
            className="mt-5 h-10 rounded-lg border-[#e3e3e3]"
            placeholder="Password"
          />
          {passwordError ? (
            <p className="mt-2 text-[12px] text-red-700">{passwordError}</p>
          ) : null}
          <Button
            type="button"
            className="mt-4 h-10 w-full rounded-lg text-white hover:opacity-95"
            style={{ background: accentHex }}
            onClick={() => void load(password)}
          >
            Enter store
          </Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-white">
        <StoreHeader
          store={store}
          pages={navPages}
          activePageHandle={activePage?.handle || "home"}
          accentHex={accentHex}
          cartCount={0}
          onCart={() => undefined}
          onSelectPage={() => undefined}
        />
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-16">
          <div className="max-w-md text-center">
            <div
              className="mx-auto flex size-12 items-center justify-center rounded-full text-white"
              style={{ background: accentHex }}
            >
              <Check className="size-5" />
            </div>
            <p className="mt-5 text-[22px] font-semibold tracking-tight text-[#303030]">
              Order received
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-[#616161]">
              Thanks — the shop has your sizes and will follow up on fulfillment.
            </p>
            <Button
              type="button"
              className="mt-6 h-10 rounded-lg px-5 text-white hover:opacity-95"
              style={{ background: accentHex }}
              onClick={() => setSubmitted(false)}
            >
              Continue shopping
            </Button>
          </div>
        </div>
        <FloPilotWatermark />
      </div>
    );
  }

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-white">
      <StoreHeader
        store={store}
        pages={navPages}
        activePageHandle={activePage?.handle || "home"}
        accentHex={accentHex}
        cartCount={cartCount}
        onCart={() => setCheckoutOpen(true)}
        onSelectPage={(handle) => {
          setActivePageHandle(handle);
          setSelected(null);
          setActiveCollectionId(null);
        }}
      />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
      {!selected ? (
        activeCollection ? (
          <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10">
            <button
              type="button"
              onClick={() => setActiveCollectionId(null)}
              className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#616161] transition-colors hover:text-[#303030]"
            >
              <ArrowLeft className="size-3.5" />
              Back to store
            </button>
            <div className="mb-8">
              <h1 className="text-[1.75rem] font-semibold tracking-tight text-[#303030]">
                {activeCollection.name}
              </h1>
              {activeCollection.description ? (
                <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#616161]">
                  {activeCollection.description}
                </p>
              ) : null}
            </div>
            {collectionProducts.length === 0 ? (
              <p className="py-16 text-center text-[14px] text-[#8a8a8a]">
                No products in this collection yet.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
                {collectionProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setSelected(product)}
                    className="group text-left"
                  >
                    <div className="aspect-square overflow-hidden rounded-xl bg-white shadow-[0_4px_16px_rgba(26,26,26,0.06)] transition-[transform,box-shadow] duration-300 group-hover:-translate-y-0.5">
                      {getPrimaryMockupUrl(product) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getPrimaryMockupUrl(product)}
                          alt=""
                          className="size-full object-contain p-4 transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-[12px] text-[#8a8a8a]">
                          No image
                        </div>
                      )}
                    </div>
                    <p className="mt-3 text-[13px] font-medium leading-snug text-[#303030]">
                      {product.name}
                    </p>
                    <p className="mt-1 text-[12px] text-[#8a8a8a]">
                      {[product.brand, product.color].filter(Boolean).join(" · ") ||
                        "Apparel"}
                    </p>
                    <p className="mt-1.5 text-[13px] font-semibold tabular-nums text-[#303030]">
                      {formatCurrency(product.sellPrice)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </main>
        ) : (
          <div>
            {!store.isOpen ? (
              <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-[13px] text-amber-900 sm:px-6">
                This store is not currently accepting orders.
              </div>
            ) : null}
            {pageSections
              .filter((section) => section.enabled)
              .map((section) => (
                <StoreSectionRenderer
                  key={section.id}
                  section={section}
                  products={store.products}
                  collections={theme.collections}
                  accentHex={accentHex}
                  onSelectProduct={setSelected}
                  onSelectCollection={(collection) =>
                    setActiveCollectionId(collection.id)
                  }
                />
              ))}
          </div>
        )
      ) : (
        <div>
          <div className="mx-auto max-w-[1200px] px-4 pt-6 sm:px-6 sm:pt-8">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#616161] transition-colors hover:text-[#303030]"
            >
              <ArrowLeft className="size-3.5" />
              Back to store
            </button>
          </div>
          {productPageSections
            .filter((section) => section.enabled)
            .map((section) => (
              <StoreSectionRenderer
                key={section.id}
                section={section}
                products={store.products}
                collections={theme.collections}
                accentHex={accentHex}
                previewProduct={selected}
                productDetailSlot={
                  section.type === "product_detail" ? (
                    <StoreProductDetailInteractive
                      section={section}
                      product={selected}
                      accentHex={accentHex}
                      controls={{
                        size,
                        color,
                        qty,
                        mockupIndex,
                        onSizeChange: setSize,
                        onColorChange: setColor,
                        onQtyChange: setQty,
                        onMockupIndexChange: setMockupIndex,
                        onAddToCart: addToCart,
                        storeOpen: store.isOpen,
                        brandFallback: store.company || store.customerName,
                      }}
                    />
                  ) : undefined
                }
                onSelectProduct={setSelected}
                onSelectCollection={(collection) => {
                  setSelected(null);
                  setActiveCollectionId(collection.id);
                }}
              />
            ))}
        </div>
      )}
      </div>

      <FloPilotWatermark />

      <Sheet open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className={cn(
            "w-full gap-0 border-l border-[#e3e3e3] bg-white p-0 shadow-xl sm:max-w-lg data-[side=right]:sm:max-w-lg",
            "duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            "data-[side=right]:data-starting-style:translate-x-full",
            "data-[side=right]:data-ending-style:translate-x-full"
          )}
        >
          <SheetHeader className="flex flex-row items-center justify-between space-y-0 border-b border-[#ebebeb] px-5 py-4">
            <SheetTitle className="text-[16px] font-semibold text-[#303030]">
              Cart
            </SheetTitle>
            <button
              type="button"
              className="rounded-md p-1.5 text-[#616161] transition-colors hover:bg-[#f6f6f7]"
              onClick={() => setCheckoutOpen(false)}
            >
              <X className="size-4" />
              <span className="sr-only">Close cart</span>
            </button>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {cart.length === 0 ? (
                <p className="py-16 text-center text-[13px] text-[#8a8a8a]">
                  Your cart is empty.
                </p>
              ) : (
                cart.map((line) => (
                  <div
                    key={line.key}
                    className="flex gap-3 animate-in fade-in-0 slide-in-from-right-2 duration-300"
                  >
                    <StoreProductMediaThumb
                      imageUrl={line.mockupUrl}
                      settings={productMediaSettings}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-[#303030]">
                        {line.productName}
                      </p>
                      <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                        {line.color ? `${line.color} / ` : ""}
                        {line.size} · Qty {line.qty}
                      </p>
                      <p className="mt-1 text-[13px] font-semibold tabular-nums">
                        {formatCurrency(line.unitPrice * line.qty)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="self-start p-1 text-[#8a8a8a] transition-colors hover:text-red-700"
                      onClick={() =>
                        setCart((prev) =>
                          prev.filter((row) => row.key !== line.key)
                        )
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))
              )}

              {cart.length > 0 ? (
                <>
                  <div className="flex items-center justify-between border-t border-[#ebebeb] pt-4 text-[14px] font-semibold">
                    <span>Subtotal</span>
                    <span className="tabular-nums">
                      {formatCurrency(cartTotal)}
                    </span>
                  </div>
                  {store.settings.orderInstructions ? (
                    <p className="rounded-lg bg-[#f6f6f7] px-3 py-2.5 text-[12px] leading-relaxed text-[#616161]">
                      {store.settings.orderInstructions}
                    </p>
                  ) : null}
                  <div className="space-y-3 border-t border-[#ebebeb] pt-4">
                    <p className="text-[13px] font-semibold text-[#303030]">
                      Your details
                    </p>
                    <div>
                      <Label className="text-[12px] text-[#616161]">Name</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 h-10 rounded-lg border-[#e3e3e3]"
                      />
                    </div>
                    {store.settings.collectEmail !== false ? (
                      <div>
                        <Label className="text-[12px] text-[#616161]">
                          Email
                        </Label>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="mt-1 h-10 rounded-lg border-[#e3e3e3]"
                        />
                      </div>
                    ) : null}
                    {store.settings.collectPhone ? (
                      <div>
                        <Label className="text-[12px] text-[#616161]">
                          Phone
                        </Label>
                        <Input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="mt-1 h-10 rounded-lg border-[#e3e3e3]"
                        />
                      </div>
                    ) : null}
                    <div>
                      <Label className="text-[12px] text-[#616161]">
                        Notes (optional)
                      </Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="mt-1 min-h-[72px] rounded-lg border-[#e3e3e3]"
                      />
                    </div>
                  </div>
                  {error ? (
                    <p className="text-[13px] text-red-700">{error}</p>
                  ) : null}
                </>
              ) : null}
            </div>

            {cart.length > 0 ? (
              <div className="border-t border-[#ebebeb] px-5 py-4">
                <Button
                  type="button"
                  disabled={submitting || !store.isOpen || !name.trim()}
                  onClick={() => void submitOrder()}
                  className="h-11 w-full rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-95"
                  style={{ background: accentHex }}
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  Submit order request
                </Button>
                <p className="mt-2 text-center text-[11px] text-[#8a8a8a]">
                  No payment collected here — the shop will follow up.
                </p>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

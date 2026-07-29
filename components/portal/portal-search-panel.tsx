"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  FileImage,
  FileText,
  LayoutDashboard,
  Receipt,
  Search,
  Tag,
  Building2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCustomerPortalOptional } from "@/components/portal/customer-portal-provider";
import { usePortalAppOptional } from "@/components/portal/portal-app-provider";
import { usePortalPaths } from "@/components/portal/portal-paths";
import { usePortalSearch } from "@/components/portal/portal-search-provider";
import {
  portalStatusLabel,
  type PortalOrderSummary,
} from "@/lib/customer-portal-api";
import { formatCurrency } from "@/lib/format";
import { formatOrderDisplayLine } from "@/lib/order-display";
import { cn } from "@/lib/utils";

type PortalSearchResult = {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  href: string;
  icon: LucideIcon;
};

function matchesQuery(haystack: string, query: string) {
  return haystack.toLowerCase().includes(query.toLowerCase());
}

function SearchResultRow({
  result,
  active,
  onSelect,
  onHover,
}: {
  result: PortalSearchResult;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  const Icon = result.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
        active ? "bg-[#f1f1f1]" : "hover:bg-[#f6f6f7]"
      )}
    >
      <Icon className="size-[18px] shrink-0 text-[#616161]" strokeWidth={1.75} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-[#303030]">
          {result.title}
        </span>
        {result.subtitle ? (
          <span className="mt-0.5 block truncate text-xs text-[#616161]">
            {result.subtitle}
          </span>
        ) : null}
      </span>
      {result.badge ? (
        <span className="shrink-0 rounded-md bg-[#f1f1f1] px-2 py-0.5 text-[11px] font-medium text-[#616161]">
          {result.badge}
        </span>
      ) : null}
    </button>
  );
}

function orderToResult(
  order: PortalOrderSummary,
  href: string
): PortalSearchResult {
  return {
    id: `order-${order.id}`,
    title: formatOrderDisplayLine(order),
    subtitle: formatCurrency(order.total),
    badge: portalStatusLabel(order.status),
    href,
    icon: ClipboardList,
  };
}

export function PortalSearchPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const paths = usePortalPaths();
  const { searchAnchorRef, headerRef } = usePortalSearch();
  const tokenPortal = useCustomerPortalOptional();
  const appPortal = usePortalAppOptional();
  const orders =
    tokenPortal?.dashboard?.orders || appPortal?.dashboard?.orders || [];

  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [panelRect, setPanelRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const pages = useMemo<PortalSearchResult[]>(
    () => [
      {
        id: "page-dashboard",
        title: "Dashboard",
        subtitle: "Portal home",
        href: paths.home(),
        icon: LayoutDashboard,
      },
      {
        id: "page-orders",
        title: "Orders",
        subtitle: "All orders",
        href: paths.orders(),
        icon: ClipboardList,
      },
      {
        id: "page-order-requests",
        title: "Order requests",
        subtitle: "Purchase order requests",
        href: paths.orderRequests(),
        icon: ClipboardList,
      },
      {
        id: "page-new-order-request",
        title: "New order request",
        subtitle: "Start a purchase order",
        href: paths.newOrderRequest(),
        icon: ClipboardList,
      },
      {
        id: "page-estimates",
        title: "Estimates",
        subtitle: "Documents",
        href: paths.estimates(),
        icon: FileText,
      },
      {
        id: "page-invoices",
        title: "Invoices",
        subtitle: "Documents",
        href: paths.invoices(),
        icon: Receipt,
      },
      {
        id: "page-artwork",
        title: "Artwork",
        subtitle: "Proofs & files",
        href: paths.artwork(),
        icon: FileImage,
      },
      {
        id: "page-pricing",
        title: "Pricing",
        subtitle: "Your rates",
        href: paths.pricing(),
        icon: Tag,
      },
      {
        id: "page-business",
        title: "Business",
        subtitle: "Account details",
        href: paths.business(),
        icon: Building2,
      },
    ],
    [paths]
  );

  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return pages;

    const orderResults = orders
      .filter((order) =>
        matchesQuery(
          `${formatOrderDisplayLine(order)} ${order.number} ${order.status}`,
          trimmed
        )
      )
      .slice(0, 12)
      .map((order) =>
        orderToResult(
          order,
          paths.order(order.id, {
            view: order.invoiceSentAt ? "invoice" : undefined,
          })
        )
      );

    const pageResults = pages.filter(
      (page) =>
        matchesQuery(page.title, trimmed) ||
        matchesQuery(page.subtitle || "", trimmed)
    );

    return [...orderResults, ...pageResults];
  }, [orders, pages, paths, query]);

  const updatePanelRect = useCallback(() => {
    const anchor = searchAnchorRef.current;
    const header = headerRef.current;

    if (anchor && anchor.offsetParent !== null && anchor.offsetWidth > 0) {
      const rect = anchor.getBoundingClientRect();
      setPanelRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
      });
      return;
    }

    if (header) {
      const rect = header.getBoundingClientRect();
      setPanelRect({
        top: rect.bottom,
        left: 12,
        width: window.innerWidth - 24,
      });
    }
  }, [headerRef, searchAnchorRef]);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelRect();
  }, [open, updatePanelRect]);

  useEffect(() => {
    if (!open) return;
    const onLayoutChange = () => updatePanelRect();
    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("scroll", onLayoutChange, true);
    return () => {
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("scroll", onLayoutChange, true);
    };
  }, [open, updatePanelRect]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleSelect = useCallback(
    (result: PortalSearchResult) => {
      close();
      router.push(result.href);
    },
    [close, router]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) =>
        results.length === 0 ? 0 : Math.min(index + 1, results.length - 1)
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const selected = results[activeIndex];
      if (selected) handleSelect(selected);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  if (!mounted || !open || !panelRect) return null;

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[80] cursor-default bg-black/20"
        aria-label="Close search"
        onClick={close}
      />
      <div
        className="fixed z-[90] overflow-hidden rounded-xl border border-[#e3e3e3] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.18)]"
        style={{
          top: panelRect.top,
          left: panelRect.left,
          width: panelRect.width,
        }}
        role="dialog"
        aria-label="Search portal"
      >
        <div className="flex items-center gap-2 border-b border-[#ebebeb] px-3 py-2.5">
          <Search className="size-4 shrink-0 text-[#8a8a8a]" strokeWidth={1.75} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search orders and pages"
            aria-label="Search portal"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-[#303030] outline-none placeholder:text-[#8a8a8a]"
          />
          <button
            type="button"
            onClick={close}
            className="rounded-md p-1 text-[#8a8a8a] hover:bg-[#f1f1f1] hover:text-[#303030]"
            aria-label="Close search"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[min(420px,60vh)] overflow-y-auto py-1">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-[#616161]">
              No matches for “{query.trim()}”
            </p>
          ) : (
            results.map((result, index) => (
              <SearchResultRow
                key={result.id}
                result={result}
                active={index === activeIndex}
                onSelect={() => handleSelect(result)}
                onHover={() => setActiveIndex(index)}
              />
            ))
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

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
import { History, ListFilter, Search, UserRound, X } from "lucide-react";
import { getVisibleNavItems } from "@/components/layout/nav-config";
import { useStaffSearch } from "@/components/layout/staff-search-provider";
import { useNewOrder } from "@/components/providers/new-order-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { useStaffAccess } from "@/hooks/use-staff-access";
import {
  buildStaffSearchResults,
  CATEGORY_SECTION_LABELS,
  clearRecentSearches,
  FILTER_CHIPS,
  flattenNavPagesForSearch,
  pushRecentSearch,
  readRecentSearches,
  recentSearchResults,
  RESULT_PREVIEW_LIMIT,
  type ActiveSearchFilter,
  type StaffSearchResult,
} from "@/lib/staff-search";
import { cn } from "@/lib/utils";

type PanelRect = {
  top: number;
  left: number;
  width: number;
};

function SearchResultRow({
  result,
  active,
  onSelect,
  onHover,
  compact = false,
}: {
  result: StaffSearchResult;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
  compact?: boolean;
}) {
  const Icon = result.icon ?? UserRound;

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        "flex w-full items-center gap-3 px-4 text-left transition-colors",
        compact ? "py-2.5" : "py-3",
        active ? "bg-[#f1f1f1]" : "hover:bg-[#f6f6f7]"
      )}
    >
      <Icon className="size-[18px] shrink-0 text-[#616161]" strokeWidth={1.75} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-[#303030]">
          {result.title}
        </span>
        {result.subtitle && (
          <span className="mt-0.5 block truncate text-xs text-[#616161]">
            {result.subtitle}
          </span>
        )}
      </span>
      {result.badge && (
        <span className="shrink-0 rounded-md bg-[#f1f1f1] px-2 py-0.5 text-[11px] font-medium text-[#616161]">
          {result.badge}
        </span>
      )}
    </button>
  );
}

export function StaffSearchPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { openNewOrder } = useNewOrder();
  const { searchAnchorRef, headerRef } = useStaffSearch();
  const { settings } = useShopSettings();
  const { role, access, filterMachines } = useStaffAccess();
  const {
    activeOrders,
    customers,
    machines,
    recentOrders,
    productionTasks,
    activeScheduleBlocks,
    shopDataLoading,
  } = useSchedule();

  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [panelRect, setPanelRect] = useState<PanelRect | null>(null);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveSearchFilter | null>(
    null
  );
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showAllResults, setShowAllResults] = useState(false);

  const navPages = useMemo(
    () =>
      flattenNavPagesForSearch(
        getVisibleNavItems(settings.modules, role, access)
      ),
    [settings.modules, role, access]
  );

  const visibleMachines = useMemo(
    () => filterMachines(machines),
    [filterMachines, machines]
  );

  const searchCategory = activeFilter ?? "all";

  const allSearchResults = useMemo(
    () =>
      buildStaffSearchResults({
        query,
        category: searchCategory,
        orders: activeOrders,
        customers,
        machines: visibleMachines,
        navPages,
        recentOrders,
        productionTasks,
        scheduleBlocks: activeScheduleBlocks,
      }),
    [
      query,
      searchCategory,
      activeOrders,
      customers,
      visibleMachines,
      navPages,
      recentOrders,
      productionTasks,
      activeScheduleBlocks,
    ]
  );

  const searchResults = useMemo(() => {
    if (showAllResults) return allSearchResults;
    return allSearchResults.slice(0, RESULT_PREVIEW_LIMIT);
  }, [allSearchResults, showAllResults]);

  const hiddenResultCount = Math.max(
    0,
    allSearchResults.length - RESULT_PREVIEW_LIMIT
  );

  const recentRows = useMemo(
    () => recentSearchResults(recentSearches),
    [recentSearches]
  );

  const isBrowseMode = !query.trim() && !activeFilter;

  const flatRows = useMemo(() => {
    if (isBrowseMode) return recentRows;
    return searchResults;
  }, [isBrowseMode, recentRows, searchResults]);

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
      setRecentSearches(readRecentSearches());
      setQuery("");
      setActiveFilter(null);
      setActiveIndex(0);
      setShowAllResults(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
    setShowAllResults(false);
  }, [query, activeFilter]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const applyFilter = useCallback((filter: ActiveSearchFilter) => {
    setActiveFilter(filter);
    setShowAllResults(false);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const clearFilter = useCallback(() => {
    setActiveFilter(null);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleSelect = useCallback(
    (result: StaffSearchResult) => {
      if (result.recentQuery) {
        setQuery(result.recentQuery);
        setActiveFilter(null);
        return;
      }

      const trimmed = query.trim();
      if (trimmed) pushRecentSearch(trimmed);

      if (result.action === "new-order") {
        close();
        openNewOrder();
        return;
      }

      if (result.action === "new-customer") {
        close();
        router.push("/app/customers?add=1");
        return;
      }

      if (result.href) {
        close();
        router.push(result.href);
      }
    },
    [close, openNewOrder, query, router]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      event.key === "Backspace" &&
      query.length === 0 &&
      activeFilter &&
      (event.currentTarget.selectionStart ?? 0) === 0
    ) {
      event.preventDefault();
      clearFilter();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) =>
        flatRows.length === 0 ? 0 : Math.min(index + 1, flatRows.length - 1)
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
      const selected = flatRows[activeIndex];
      if (selected) handleSelect(selected);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      if (activeFilter) {
        clearFilter();
        return;
      }
      close();
    }
  };

  const showEmptyState =
    !isBrowseMode &&
    allSearchResults.length === 0 &&
    !shopDataLoading &&
    (query.trim().length > 0 || activeFilter !== null);

  if (!mounted || !open || !panelRect) return null;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close search"
        className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-[1px] animate-in fade-in-0 duration-150"
        onClick={close}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search workspace"
        className={cn(
          "fixed z-[70] overflow-hidden rounded-xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.22),0_0_0_1px_rgba(0,0,0,0.06)]",
          "animate-in fade-in-0 slide-in-from-top-1 duration-150"
        )}
        style={{
          top: panelRect.top,
          left: panelRect.left,
          width: panelRect.width,
        }}
      >
        <div className="border-b border-[#e3e3e3] p-3">
          <div
            className={cn(
              "flex min-h-[40px] items-center gap-2 rounded-lg border bg-white px-3 py-1.5 transition-colors",
              "border-[#8a8a8a] focus-within:border-[#303030] focus-within:ring-1 focus-within:ring-[#303030]"
            )}
          >
            <Search
              className="size-[18px] shrink-0 text-[#616161]"
              strokeWidth={1.75}
            />

            {activeFilter && (
              <span className="inline-flex max-w-[45%] shrink-0 items-center gap-1 rounded-md bg-[#f1f1f1] py-0.5 pl-2 pr-1 text-xs font-medium text-[#303030]">
                <span className="truncate">
                  {CATEGORY_SECTION_LABELS[activeFilter]}
                </span>
                <button
                  type="button"
                  onClick={clearFilter}
                  className="rounded p-0.5 text-[#616161] transition-colors hover:bg-[#e3e3e3] hover:text-[#303030]"
                  aria-label={`Remove ${CATEGORY_SECTION_LABELS[activeFilter]} filter`}
                >
                  <X className="size-3" strokeWidth={2} />
                </button>
              </span>
            )}

            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search"
              aria-label="Search workspace"
              className="min-w-[80px] flex-1 bg-transparent text-[14px] text-[#303030] outline-none placeholder:text-[#8c9196]"
            />

            <button
              type="button"
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-[#616161] transition-colors hover:bg-[#f1f1f1]"
              aria-label="Search options"
            >
              <ListFilter className="size-4" strokeWidth={1.75} />
            </button>
          </div>

          {!activeFilter && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {FILTER_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => applyFilter(chip.id)}
                  className="rounded-full border border-[#c9cccf] bg-white px-3 py-1 text-xs font-medium text-[#303030] transition-colors hover:border-[#999999] hover:bg-[#fafafa]"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="max-h-[min(52vh,480px)] overflow-y-auto pb-1">
          {shopDataLoading && (
            <div className="px-4 py-8 text-center text-sm text-[#616161]">
              Loading shop data…
            </div>
          )}

          {!shopDataLoading && isBrowseMode && recentRows.length > 0 && (
            <>
              <div className="flex items-center justify-between px-4 pb-1 pt-3">
                <p className="text-xs font-medium text-[#616161]">
                  Recent searches
                </p>
                <button
                  type="button"
                  onClick={() => {
                    clearRecentSearches();
                    setRecentSearches([]);
                  }}
                  className="text-xs font-medium text-[#2c6ecb] hover:underline"
                >
                  Clear history
                </button>
              </div>
              {recentRows.map((result, index) => (
                <SearchResultRow
                  key={result.id}
                  result={{ ...result, icon: History }}
                  active={activeIndex === index}
                  onSelect={() => handleSelect(result)}
                  onHover={() => setActiveIndex(index)}
                  compact
                />
              ))}
            </>
          )}

          {!shopDataLoading && showEmptyState && (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-[#303030]">
                No results for “{query.trim()}”
              </p>
              <p className="mt-1 text-sm text-[#616161]">
                Try a different search term
                {activeFilter
                  ? ` within ${CATEGORY_SECTION_LABELS[activeFilter].toLowerCase()}`
                  : ""}
                .
              </p>
            </div>
          )}

          {!shopDataLoading &&
            !isBrowseMode &&
            !showEmptyState &&
            searchResults.map((result, index) => (
              <SearchResultRow
                key={result.id}
                result={result}
                active={activeIndex === index}
                onSelect={() => handleSelect(result)}
                onHover={() => setActiveIndex(index)}
              />
            ))}

          {!shopDataLoading && !showAllResults && hiddenResultCount > 0 && (
            <div className="border-t border-[#ebebeb] px-4 py-2.5">
              <button
                type="button"
                onClick={() => setShowAllResults(true)}
                className="text-sm font-medium text-[#2c6ecb] hover:underline"
              >
                Show {hiddenResultCount} more
              </button>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

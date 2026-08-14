"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

const PRODUCT_PARAM = "product";
const HISTORY_KEY = "clientStoreProductId";

type ProductLike = { id: string };

type SelectOptions = {
  /**
   * auto (default): push when opening; back() when closing if we pushed.
   * replace: update URL in place (nav links / programmatic clear).
   */
  historyMode?: "auto" | "replace";
};

function productUrl(productId: string | null): string {
  const url = new URL(window.location.href);
  if (productId) url.searchParams.set(PRODUCT_PARAM, productId);
  else url.searchParams.delete(PRODUCT_PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
}

function readProductIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get(PRODUCT_PARAM);
}

/**
 * Product detail navigation for public client storefronts:
 * - Scrolls the storefront pane to the top when opening a product
 * - Restores list scroll when returning via back
 * - Uses history so the phone/browser back button returns to the catalog
 */
export function useStorefrontProductNav<T extends ProductLike>(
  products: T[],
  scrollRef: RefObject<HTMLElement | null>
) {
  const [selected, setSelectedState] = useState<T | null>(null);
  const listScrollTopRef = useRef(0);
  const hydratedRef = useRef(false);
  const productsRef = useRef(products);
  productsRef.current = products;

  const scrollPane = useCallback(
    (top: number) => {
      const pane = scrollRef.current;
      if (pane) {
        pane.scrollTop = top;
        return;
      }
      window.scrollTo({ top, left: 0 });
    },
    [scrollRef]
  );

  const findProduct = useCallback((id: string | null | undefined) => {
    if (!id) return null;
    return productsRef.current.find((row) => row.id === id) || null;
  }, []);

  const applySelection = useCallback(
    (product: T | null, { restoreListScroll = false } = {}) => {
      setSelectedState(product);
      const top = product
        ? 0
        : restoreListScroll
          ? listScrollTopRef.current
          : 0;
      // Double rAF: wait until the product/list pane has painted (esp. mobile).
      requestAnimationFrame(() => {
        scrollPane(top);
        requestAnimationFrame(() => scrollPane(top));
      });
    },
    [scrollPane]
  );

  const selectProduct = useCallback(
    (product: T | null, options?: SelectOptions) => {
      const historyMode = options?.historyMode || "auto";

      if (typeof window === "undefined") {
        setSelectedState(product);
        return;
      }

      if (product) {
        if (!selected) {
          listScrollTopRef.current =
            scrollRef.current?.scrollTop ?? window.scrollY;
        }
        applySelection(product);
        const path = productUrl(product.id);
        const state = { [HISTORY_KEY]: product.id };
        if (
          historyMode === "replace" ||
          window.history.state?.[HISTORY_KEY]
        ) {
          window.history.replaceState(state, "", path);
        } else {
          window.history.pushState(state, "", path);
        }
        return;
      }

      // Clear selection
      if (
        historyMode === "auto" &&
        readProductIdFromUrl() &&
        window.history.state?.[HISTORY_KEY]
      ) {
        window.history.back();
        return;
      }

      window.history.replaceState({}, "", productUrl(null));
      applySelection(null, {
        restoreListScroll: historyMode === "auto",
      });
    },
    [applySelection, scrollRef, selected]
  );

  // Hydrate from ?product= once products are available.
  useEffect(() => {
    if (hydratedRef.current || products.length === 0) return;
    hydratedRef.current = true;
    const id = readProductIdFromUrl();
    if (!id) return;
    const product = findProduct(id);
    if (product) applySelection(product);
  }, [products, findProduct, applySelection]);

  // Keep selection in sync when products reload (e.g. after password unlock).
  useEffect(() => {
    if (!selected) return;
    const fresh = findProduct(selected.id);
    if (!fresh) {
      applySelection(null);
      if (typeof window !== "undefined" && readProductIdFromUrl()) {
        window.history.replaceState({}, "", productUrl(null));
      }
      return;
    }
    if (fresh !== selected) setSelectedState(fresh);
  }, [products, selected, findProduct, applySelection]);

  useEffect(() => {
    const onPopState = () => {
      const id = readProductIdFromUrl();
      const product = findProduct(id);
      applySelection(product, { restoreListScroll: !product });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [findProduct, applySelection]);

  return { selected, selectProduct };
}

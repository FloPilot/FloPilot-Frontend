"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  portalAppArtworkPath,
  portalAppBusinessPath,
  portalAppEstimatesPath,
  portalAppHomePath,
  portalAppInvoicesPath,
  portalAppNewOrderRequestPath,
  portalAppOrderPath,
  portalAppOrderRequestPath,
  portalAppOrderRequestsPath,
  portalAppOrdersPath,
  portalAppPricingPath,
  portalPreviewArtworkPath,
  portalPreviewBusinessPath,
  portalPreviewEstimatesPath,
  portalPreviewHomePath,
  portalPreviewInvoicesPath,
  portalPreviewNewOrderRequestPath,
  portalPreviewOrderPath,
  portalPreviewOrderRequestPath,
  portalPreviewOrderRequestsPath,
  portalPreviewOrdersPath,
  portalPreviewPricingPath,
  portalArtworkPath,
  portalBusinessPath,
  portalHomePath,
  portalOrderPath,
  portalPricingPath,
} from "@/lib/customer-portal-api";

export type PortalPaths = {
  home: () => string;
  orders: () => string;
  order: (
    orderId: string,
    options?: { view?: string; focus?: string }
  ) => string;
  estimates: () => string;
  invoices: () => string;
  artwork: () => string;
  business: () => string;
  pricing: () => string;
  orderRequests: () => string;
  orderRequest: (requestId: string) => string;
  newOrderRequest: () => string;
};

const PortalPathsContext = createContext<PortalPaths | null>(null);

export function PortalTokenPathsProvider({
  token,
  children,
}: {
  token: string;
  children: ReactNode;
}) {
  const value = useMemo<PortalPaths>(
    () => ({
      home: () => portalHomePath(token),
      orders: () => portalHomePath(token),
      order: (orderId, options) => portalOrderPath(token, orderId, options),
      estimates: () => portalHomePath(token),
      invoices: () => portalHomePath(token),
      artwork: () => portalArtworkPath(token),
      business: () => portalBusinessPath(token),
      pricing: () => portalPricingPath(token),
      orderRequests: () => portalHomePath(token),
      orderRequest: () => portalHomePath(token),
      newOrderRequest: () => portalHomePath(token),
    }),
    [token]
  );
  return (
    <PortalPathsContext.Provider value={value}>
      {children}
    </PortalPathsContext.Provider>
  );
}

export function PortalAppPathsProvider({ children }: { children: ReactNode }) {
  const value = useMemo<PortalPaths>(
    () => ({
      home: portalAppHomePath,
      orders: portalAppOrdersPath,
      order: portalAppOrderPath,
      estimates: portalAppEstimatesPath,
      invoices: portalAppInvoicesPath,
      artwork: portalAppArtworkPath,
      business: portalAppBusinessPath,
      pricing: portalAppPricingPath,
      orderRequests: portalAppOrderRequestsPath,
      orderRequest: portalAppOrderRequestPath,
      newOrderRequest: portalAppNewOrderRequestPath,
    }),
    []
  );
  return (
    <PortalPathsContext.Provider value={value}>
      {children}
    </PortalPathsContext.Provider>
  );
}

export function PortalPreviewPathsProvider({
  token,
  children,
}: {
  token: string;
  children: ReactNode;
}) {
  const value = useMemo<PortalPaths>(
    () => ({
      home: () => portalPreviewHomePath(token),
      orders: () => portalPreviewOrdersPath(token),
      order: (orderId, options) =>
        portalPreviewOrderPath(token, orderId, options),
      estimates: () => portalPreviewEstimatesPath(token),
      invoices: () => portalPreviewInvoicesPath(token),
      artwork: () => portalPreviewArtworkPath(token),
      business: () => portalPreviewBusinessPath(token),
      pricing: () => portalPreviewPricingPath(token),
      orderRequests: () => portalPreviewOrderRequestsPath(token),
      orderRequest: (requestId) =>
        portalPreviewOrderRequestPath(token, requestId),
      newOrderRequest: () => portalPreviewNewOrderRequestPath(token),
    }),
    [token]
  );
  return (
    <PortalPathsContext.Provider value={value}>
      {children}
    </PortalPathsContext.Provider>
  );
}

export function usePortalPaths() {
  const ctx = useContext(PortalPathsContext);
  if (!ctx) {
    throw new Error("usePortalPaths must be used within a portal paths provider");
  }
  return ctx;
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import {
  listInventory,
  listPurchaseOrders,
  listTeamMembers,
} from "@/lib/api";
import type { ShopReportData } from "@/lib/reports/shop-report-data";
import { EMPTY_SHOP_REPORT_DATA } from "@/lib/reports/shop-report-data";

export function useShopReportData(): {
  data: ShopReportData;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const {
    customers,
    activeOrders,
    machines,
    scheduleBlocks,
    jobRuns,
    issueReports,
    shopDataLoading,
    shopDataError,
    getCustomerById,
  } = useSchedule();
  const { settings } = useShopSettings();
  const { getIdToken } = useAuth();

  const [teamMembers, setTeamMembers] = useState(
    EMPTY_SHOP_REPORT_DATA.teamMembers
  );
  const [inventory, setInventory] = useState(EMPTY_SHOP_REPORT_DATA.inventory);
  const [purchaseOrders, setPurchaseOrders] = useState(
    EMPTY_SHOP_REPORT_DATA.purchaseOrders
  );
  const [extraLoading, setExtraLoading] = useState(true);
  const [extraError, setExtraError] = useState<string | null>(null);

  const financials = useMemo(
    () => ({
      taxRate: settings.taxRate,
      pricingMatrix: settings.pricingMatrix,
      pricingRateSheets: settings.pricingRateSheets,
      getCustomer: getCustomerById,
    }),
    [settings.taxRate, settings.pricingMatrix, settings.pricingRateSheets, getCustomerById]
  );

  const loadExtra = useCallback(async () => {
    setExtraLoading(true);
    setExtraError(null);
    try {
      const token = await getIdToken();
      if (!token) {
        setExtraLoading(false);
        return;
      }

      const [teamRes, inventoryRes, poRes] = await Promise.all([
        listTeamMembers(token).catch(() => ({ members: [], invites: [] })),
        listInventory(token).catch(() => ({ items: [] })),
        listPurchaseOrders(token).catch(() => ({ purchaseOrders: [] })),
      ]);

      setTeamMembers(teamRes.members ?? []);
      setInventory(inventoryRes.items ?? []);
      setPurchaseOrders(poRes.purchaseOrders ?? []);
    } catch (error) {
      setExtraError(
        error instanceof Error ? error.message : "Failed to load report data"
      );
    } finally {
      setExtraLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    void loadExtra();
  }, [loadExtra]);

  const data: ShopReportData = useMemo(
    () => ({
      customers,
      orders: activeOrders,
      machines,
      scheduleBlocks,
      jobRuns,
      issueReports,
      teamMembers,
      inventory,
      purchaseOrders,
      financials,
    }),
    [
      customers,
      activeOrders,
      machines,
      scheduleBlocks,
      jobRuns,
      issueReports,
      teamMembers,
      inventory,
      purchaseOrders,
      financials,
    ]
  );

  return {
    data,
    loading: shopDataLoading || extraLoading,
    error: shopDataError ?? extraError,
    refresh: loadExtra,
  };
}

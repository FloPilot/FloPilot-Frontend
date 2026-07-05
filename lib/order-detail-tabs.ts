import { blanksColumnLabel } from "@/lib/order-receiving-checkpoints";
import {
  getDtfReceivingLines,
  getGarmentReceivingLines,
  getInkPrepLines,
  getScreenSetupLine,
  mergeOrderMaterials,
  orderHasDtfEvents,
  orderHasScreenPrintEvents,
} from "@/lib/order-materials";
import type { Order } from "@/types";

export type OrderDetailTab =
  | "events"
  | "blanks"
  | "dtf_sheets"
  | "screens"
  | "inks"
  | "proof"
  | "estimate"
  | "files"
  | "customer"
  | "shipping"
  | "activity";

export type OrderDetailTabConfig = {
  id: OrderDetailTab;
  label: string;
};

export function blanksTabLabel(order: Order): string {
  const label = blanksColumnLabel(order);
  return label === "Garments" ? "Garments" : "Blanks / Garments";
}

export function buildOrderDetailTabs(order: Order): OrderDetailTabConfig[] {
  const tabs: OrderDetailTabConfig[] = [
    { id: "events", label: "Events" },
    { id: "blanks", label: blanksTabLabel(order) },
    { id: "proof", label: "Proofs" },
    { id: "estimate", label: "Estimate" },
  ];

  if (orderHasDtfEvents(order)) {
    tabs.push({ id: "dtf_sheets", label: "DTF sheets" });
  }

  if (orderHasScreenPrintEvents(order)) {
    tabs.push({ id: "screens", label: "Screens" });
    tabs.push({ id: "inks", label: "Inks" });
  }

  tabs.push(
    { id: "files", label: "Files" },
    { id: "customer", label: "Customer" },
    { id: "shipping", label: "Shipping / Handling" },
    { id: "activity", label: "Activity" }
  );

  return tabs;
}

export function isOrderDetailTabAvailable(
  order: Order,
  tab: OrderDetailTab
): boolean {
  return buildOrderDetailTabs(order).some((entry) => entry.id === tab);
}

export function resolveOrderDetailTab(
  order: Order,
  tab: OrderDetailTab
): OrderDetailTab {
  if (isOrderDetailTabAvailable(order, tab)) return tab;
  return "events";
}

export function parseOrderDetailTab(tab: string | null): OrderDetailTab {
  if (tab === "events" || tab === "production") return "events";
  if (
    tab === "blanks" ||
    tab === "garments" ||
    tab === "apparel" ||
    tab === "order" ||
    tab === "materials"
  ) {
    return "blanks";
  }
  if (tab === "dtf" || tab === "dtf_sheets" || tab === "dtf-transfers") {
    return "dtf_sheets";
  }
  if (tab === "screens" || tab === "screen") return "screens";
  if (tab === "inks" || tab === "ink") return "inks";
  if (tab === "proof" || tab === "design") return "proof";
  if (tab === "estimate" || tab === "pricing" || tab === "quote") {
    return "estimate";
  }
  if (tab === "files") return "files";
  if (tab === "shipping" || tab === "handling") return "shipping";
  if (tab === "activity") return "activity";
  if (tab === "customer" || tab === "messages" || tab === "payments") {
    return "customer";
  }
  return "events";
}

/** First receiving tab that still has open items — for deep links from actions. */
export function defaultReceivingTab(order: Order): OrderDetailTab {
  const materials = mergeOrderMaterials(order);
  const garmentLines = getGarmentReceivingLines(materials);
  const dtfLines = getDtfReceivingLines(materials);
  const screenLine = getScreenSetupLine(materials);
  const inkLines = getInkPrepLines(materials);

  if (
    garmentLines.some((line) => line.status !== "received") ||
    (garmentLines.length > 0 && !materials.blankSource)
  ) {
    return "blanks";
  }

  if (
    orderHasDtfEvents(order) &&
    dtfLines.some((line) => line.status !== "received")
  ) {
    return "dtf_sheets";
  }

  if (
    orderHasScreenPrintEvents(order) &&
    screenLine &&
    screenLine.status !== "received"
  ) {
    return "screens";
  }

  if (
    orderHasScreenPrintEvents(order) &&
    inkLines.some((line) => line.status !== "received")
  ) {
    return "inks";
  }

  return "blanks";
}

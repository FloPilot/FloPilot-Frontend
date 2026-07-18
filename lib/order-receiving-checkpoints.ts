import type { CheckpointRollupStatus, OrderCheckpoint } from "@/lib/order-list-summary";
import { getOrderProductionSteps } from "@/lib/order-production";
import {
  getDtfReceivingLines,
  getGarmentReceivingLines,
  getInkPrepLines,
  getScreenSetupLine,
  mergeOrderMaterials,
  orderHasDtfEvents,
  orderHasScreenPrintEvents,
} from "@/lib/order-materials";
import type { BlankSource, JobImprint, MaterialReceiveStatus, Order } from "@/types";

export type ReceivingCheckpointKey =
  | "ink"
  | "screens"
  | "screen_files"
  | "blanks"
  | "dtf_transfers"
  | "blank_source";

export function getOrderScreenFiles(order: Order) {
  return (order.files ?? []).filter((file) => file.kind === "separation");
}

function materialLinesToStatus(
  lines: { status: MaterialReceiveStatus }[]
): CheckpointRollupStatus {
  if (lines.length === 0) return "not_applicable";
  if (lines.every((line) => line.status === "received")) return "done";
  if (lines.every((line) => line.status === "waiting")) return "blocked";
  return "in_progress";
}

export function garmentLinesToCheckpointStatus(
  lines: { status: MaterialReceiveStatus }[]
): CheckpointRollupStatus {
  return materialLinesToStatus(lines);
}

function imprintInkConfigured(imprint: JobImprint): boolean {
  if (imprint.decoration !== "screen_print") return false;
  const colors = (imprint.inkColors ?? []).filter((row) => !row.isFlash);
  if (colors.some((row) => row.pmsCode?.trim() || row.name?.trim())) return true;
  if (imprint.notes?.inkType) return true;
  if ((imprint.notes?.colorCount ?? 0) > 0) return true;
  return false;
}

export { imprintInkConfigured };

export function orderUsesGarmentsLabel(order: Order): boolean {
  const decorations = new Set(
    getOrderProductionSteps(order)
      .filter(({ job }) => job.kind !== "finishing")
      .map(({ imprint }) => imprint.decoration)
  );
  return decorations.size === 1 && decorations.has("embroidery");
}

export function blanksColumnLabel(order: Order): string {
  return orderUsesGarmentsLabel(order) ? "Garments" : "Blanks";
}

export function blankSourceLabel(source?: BlankSource): string {
  switch (source) {
    case "shop_orders":
      return "Shop orders";
    case "customer_supplies":
      return "Customer ships";
    default:
      return "Not set";
  }
}

export function orderHasEmbroideryEvents(order: Order): boolean {
  return getOrderProductionSteps(order).some(
    ({ imprint }) => imprint.decoration === "embroidery"
  );
}

function buildInkCheckpoint(order: Order): OrderCheckpoint {
  if (!orderHasScreenPrintEvents(order)) {
    return {
      key: "ink",
      label: "Ink",
      shortLabel: "Ink",
      status: "not_applicable",
      detail: "",
      title: "Not a screen print order",
    };
  }

  const materials = mergeOrderMaterials(order);
  const inkLines = getInkPrepLines(materials);
  if (inkLines.length === 0) {
    return {
      key: "ink",
      label: "Ink",
      shortLabel: "Ink",
      status: "pending",
      detail: "",
      title: "Confirm ink mixed and ready on the Inks tab",
    };
  }

  const materialStatus = materialLinesToStatus(inkLines);
  const status: CheckpointRollupStatus =
    materialStatus === "blocked" ? "pending" : materialStatus;
  const done = inkLines.filter((line) => line.status === "received").length;

  return {
    key: "ink",
    label: "Ink",
    shortLabel: "Ink",
    status,
    detail: `${done}/${inkLines.length}`,
    title:
      status === "done"
        ? "Ink mixed and ready for every screen print location"
        : status === "in_progress"
          ? `${inkLines.length - done} screen print location${inkLines.length - done !== 1 ? "s" : ""} still need ink prep`
          : "Mix and prep ink on the Inks tab",
  };
}

function buildScreenFilesCheckpoint(order: Order): OrderCheckpoint {
  if (!orderHasScreenPrintEvents(order)) {
    return {
      key: "screen_files",
      label: "Screen files",
      shortLabel: "Files",
      status: "not_applicable",
      detail: "",
      title: "Not a screen print order",
    };
  }

  const files = getOrderScreenFiles(order);
  const uploaded = files.length > 0;

  return {
    key: "screen_files",
    label: "Screen files",
    shortLabel: "Files",
    status: uploaded ? "done" : "pending",
    detail: uploaded
      ? `${files.length} file${files.length === 1 ? "" : "s"}`
      : "Not uploaded",
    title: uploaded
      ? `${files.length} production screen file${files.length === 1 ? "" : "s"} uploaded`
      : "Upload screen / separation files on the Screens tab",
  };
}

function buildScreensCheckpoint(order: Order): OrderCheckpoint {
  if (!orderHasScreenPrintEvents(order)) {
    return {
      key: "screens",
      label: "Screens",
      shortLabel: "Screens",
      status: "not_applicable",
      detail: "",
      title: "Not a screen print order",
    };
  }

  const materials = mergeOrderMaterials(order);
  const screenLine = getScreenSetupLine(materials);
  if (!screenLine) {
    return {
      key: "screens",
      label: "Screens",
      shortLabel: "Screens",
      status: "pending",
      detail: "",
      title: "Confirm screens burned and ready on the Screens tab",
    };
  }

  const status: CheckpointRollupStatus =
    screenLine.status === "received"
      ? "done"
      : screenLine.status === "partial"
        ? "in_progress"
        : "pending";

  return {
    key: "screens",
    label: "Screens",
    shortLabel: "Screens",
    status,
    detail: screenLine.status === "received" ? "Ready" : "Pending",
    title:
      screenLine.status === "received"
        ? "Screens burned and ready"
        : "Screens not confirmed yet",
  };
}

function buildBlanksCheckpoint(order: Order): OrderCheckpoint {
  const materials = mergeOrderMaterials(order);
  const garmentLines = getGarmentReceivingLines(materials);
  const label = blanksColumnLabel(order);

  if (garmentLines.length === 0) {
    return {
      key: "blanks",
      label,
      shortLabel: label,
      status: "not_applicable",
      detail: "",
      title: `No ${label.toLowerCase()} on this order`,
    };
  }

  const done = garmentLines.filter((line) => line.status === "received").length;
  const status = materialLinesToStatus(garmentLines);

  return {
    key: "blanks",
    label,
    shortLabel: label,
    status,
    detail: `${done}/${garmentLines.length}`,
    title:
      done === garmentLines.length
        ? `All ${label.toLowerCase()} received`
        : `${garmentLines.length - done} ${label.toLowerCase()} line${garmentLines.length - done !== 1 ? "s" : ""} still open`,
  };
}

function buildDtfTransfersCheckpoint(order: Order): OrderCheckpoint {
  if (!orderHasDtfEvents(order)) {
    return {
      key: "dtf_transfers",
      label: "DTF transfers",
      shortLabel: "DTF",
      status: "not_applicable",
      detail: "",
      title: "Not a DTF order",
    };
  }

  const materials = mergeOrderMaterials(order);
  const dtfLines = getDtfReceivingLines(materials);
  if (dtfLines.length === 0) {
    return {
      key: "dtf_transfers",
      label: "DTF transfers",
      shortLabel: "DTF",
      status: "pending",
      detail: "",
      title: "Confirm DTF sheets on the DTF sheets tab",
    };
  }

  const done = dtfLines.filter((line) => line.status === "received").length;
  const status = materialLinesToStatus(dtfLines);

  return {
    key: "dtf_transfers",
    label: "DTF transfers",
    shortLabel: "DTF",
    status,
    detail: `${done}/${dtfLines.length}`,
    title:
      done === dtfLines.length
        ? "All DTF transfer locations received"
        : `${dtfLines.length - done} DTF location${dtfLines.length - done !== 1 ? "s" : ""} still waiting`,
  };
}

function buildBlankSourceCheckpoint(order: Order): OrderCheckpoint {
  const materials = mergeOrderMaterials(order);
  const garmentLines = getGarmentReceivingLines(materials);
  const source = materials.blankSource;
  const label = "Goods source";

  if (garmentLines.length === 0) {
    return {
      key: "blank_source",
      label,
      shortLabel: "Source",
      status: "not_applicable",
      detail: "",
      title: "No blanks or garments to source",
    };
  }

  return {
    key: "blank_source",
    label,
    shortLabel: "Source",
    status: source ? "done" : "pending",
    detail: source ? blankSourceLabel(source) : "Not set",
    title: source
      ? source === "shop_orders"
        ? "Shop is ordering blank garments"
        : "Customer is shipping their own garments"
      : "Set who orders blank garments on the Blanks tab",
  };
}

export function computeReceivingCheckpoints(order: Order): OrderCheckpoint[] {
  return [
    buildInkCheckpoint(order),
    buildScreenFilesCheckpoint(order),
    buildScreensCheckpoint(order),
    buildBlanksCheckpoint(order),
    buildDtfTransfersCheckpoint(order),
    buildBlankSourceCheckpoint(order),
  ];
}

import type { CheckpointRollupStatus, OrderCheckpoint } from "@/lib/order-list-summary";
import { computeEventCheckpoints } from "@/lib/order-list-summary";
import {
  blankSourceLabel,
  blanksColumnLabel,
} from "@/lib/order-receiving-checkpoints";
import {
  getDtfReceivingLines,
  getGarmentReceivingLines,
  getInkPrepLine,
  getScreenSetupLine,
  mergeOrderMaterials,
} from "@/lib/order-materials";
import type { ResolvedProductionEvent } from "@/lib/production-event-status";
import type { DecorationType, Job, JobImprint, MaterialReceiveStatus, Order } from "@/types";

function lineStatusToRollup(
  status: MaterialReceiveStatus
): CheckpointRollupStatus {
  if (status === "received") return "done";
  if (status === "partial") return "in_progress";
  return "pending";
}

function linesToRollup(
  lines: { status: MaterialReceiveStatus }[]
): CheckpointRollupStatus {
  if (lines.length === 0) return "not_applicable";
  if (lines.every((line) => line.status === "received")) return "done";
  if (lines.some((line) => line.status === "partial" || line.status === "received")) {
    return "in_progress";
  }
  return "pending";
}

function notApplicable(
  key: OrderCheckpoint["key"],
  label: string,
  shortLabel: string
): OrderCheckpoint {
  return {
    key,
    label,
    shortLabel,
    status: "not_applicable",
    detail: "",
    title: "",
  };
}

function buildEventArtworkCheckpoint(imprint: JobImprint): OrderCheckpoint {
  const status: CheckpointRollupStatus =
    imprint.artwork.status === "approved"
      ? "done"
      : imprint.artwork.status === "revision_requested"
        ? "pending"
        : "pending";

  return {
    key: "artwork",
    label: "Proofs",
    shortLabel: "Proofs",
    status,
    detail: "",
    title:
      status === "done"
        ? "Proof approved for this location"
        : imprint.artwork.status === "revision_requested"
          ? "Customer requested changes"
          : "Proof not approved yet",
  };
}

function buildEventInkCheckpoint(
  order: Order,
  jobId: string,
  imprintId: string,
  imprint: JobImprint
): OrderCheckpoint {
  if (imprint.decoration !== "screen_print") {
    return notApplicable("ink", "Ink", "Ink");
  }

  const materials = mergeOrderMaterials(order);
  const inkLine = getInkPrepLine(materials, jobId, imprintId);
  if (!inkLine) {
    return {
      key: "ink",
      label: "Ink",
      shortLabel: "Ink",
      status: "pending",
      detail: "",
      title: "Confirm ink mixed and ready on the Inks tab",
    };
  }

  return {
    key: "ink",
    label: "Ink",
    shortLabel: "Ink",
    status: lineStatusToRollup(inkLine.status),
    detail: inkLine.status === "received" ? "Ready" : "Pending",
    title:
      inkLine.status === "received"
        ? "Ink mixed and ready for this location"
        : "Ink not prepped yet",
  };
}

function buildEventScreensCheckpoint(
  order: Order,
  decoration: DecorationType
): OrderCheckpoint {
  if (decoration !== "screen_print") {
    return notApplicable("screens", "Screens", "Screens");
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
      title: "Confirm screens on the Screens tab",
    };
  }

  return {
    key: "screens",
    label: "Screens",
    shortLabel: "Screens",
    status: lineStatusToRollup(screenLine.status),
    detail: screenLine.status === "received" ? "Ready" : "Pending",
    title:
      screenLine.status === "received"
        ? "Screens burned and ready"
        : "Screens not confirmed yet",
  };
}

function buildEventBlanksCheckpoint(order: Order): OrderCheckpoint {
  const materials = mergeOrderMaterials(order);
  const garmentLines = getGarmentReceivingLines(materials);
  const label = blanksColumnLabel(order);

  if (garmentLines.length === 0) {
    return notApplicable("blanks", label, label);
  }

  const done = garmentLines.filter((line) => line.status === "received").length;

  return {
    key: "blanks",
    label,
    shortLabel: label,
    status: linesToRollup(garmentLines),
    detail: `${done}/${garmentLines.length}`,
    title:
      done === garmentLines.length
        ? `All ${label.toLowerCase()} received`
        : `${garmentLines.length - done} ${label.toLowerCase()} line${garmentLines.length - done !== 1 ? "s" : ""} still open`,
  };
}

function buildEventDtfCheckpoint(
  order: Order,
  jobId: string,
  imprintId: string,
  decoration: DecorationType
): OrderCheckpoint {
  if (decoration !== "dtf") {
    return notApplicable("dtf_transfers", "DTF", "DTF");
  }

  const materials = mergeOrderMaterials(order);
  const line = getDtfReceivingLines(materials).find(
    (entry) => entry.jobId === jobId && entry.imprintId === imprintId
  );

  if (!line) {
    return {
      key: "dtf_transfers",
      label: "DTF",
      shortLabel: "DTF",
      status: "pending",
      detail: "",
      title: "Confirm DTF sheets on the DTF sheets tab",
    };
  }

  return {
    key: "dtf_transfers",
    label: "DTF",
    shortLabel: "DTF",
    status: lineStatusToRollup(line.status),
    detail:
      line.status === "received"
        ? "Received"
        : `${line.receivedQty}/${line.expectedQty}`,
    title:
      line.status === "received"
        ? "DTF sheets received for this location"
        : "DTF sheets still waiting",
  };
}

function buildEventBlankSourceCheckpoint(order: Order): OrderCheckpoint {
  const materials = mergeOrderMaterials(order);
  const garmentLines = getGarmentReceivingLines(materials);
  const source = materials.blankSource;

  if (garmentLines.length === 0) {
    return notApplicable("blank_source", "Goods source", "Source");
  }

  return {
    key: "blank_source",
    label: "Goods source",
    shortLabel: "Source",
    status: source ? "done" : "pending",
    detail: source ? blankSourceLabel(source) : "Not set",
    title: source
      ? source === "shop_orders"
        ? "Shop is ordering blank garments"
        : "Customer is shipping their own garments"
      : "Set who orders blanks on the Blanks tab",
  };
}

export const EVENT_STATUS_COLUMNS: {
  key: OrderCheckpoint["key"];
  label: string | ((order: Order) => string);
}[] = [
  { key: "artwork", label: "Proofs" },
  { key: "ink", label: "Ink" },
  { key: "screens", label: "Screens" },
  { key: "blanks", label: (order) => blanksColumnLabel(order) },
  { key: "dtf_transfers", label: "DTF" },
  { key: "blank_source", label: "Goods source" },
  { key: "prep", label: "Setup" },
  { key: "scheduled", label: "Scheduled" },
  { key: "floor", label: "Production" },
];

export function computeEventStatusCards(
  order: Order,
  job: Job,
  imprint: JobImprint,
  resolved: ResolvedProductionEvent
): OrderCheckpoint[] {
  const workflow = computeEventCheckpoints(imprint, resolved);
  const prep = workflow.find((checkpoint) => checkpoint.key === "prep");
  const scheduled = workflow.find((checkpoint) => checkpoint.key === "scheduled");
  const floor = workflow.find((checkpoint) => checkpoint.key === "floor");

  return [
    buildEventArtworkCheckpoint(imprint),
    buildEventInkCheckpoint(order, job.id, imprint.id, imprint),
    buildEventScreensCheckpoint(order, imprint.decoration),
    buildEventBlanksCheckpoint(order),
    buildEventDtfCheckpoint(order, job.id, imprint.id, imprint.decoration),
    buildEventBlankSourceCheckpoint(order),
    prep ?? notApplicable("prep", "Setup", "Setup"),
    scheduled ?? notApplicable("scheduled", "Scheduled", "Scheduled"),
    floor ?? notApplicable("floor", "Production", "Production"),
  ];
}

export function findEventStatusCard(
  cards: OrderCheckpoint[],
  key: OrderCheckpoint["key"]
): OrderCheckpoint | undefined {
  return cards.find((card) => card.key === key);
}

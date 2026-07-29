import { defaultTransform } from "@/lib/order-design-mockup";
import { syncArtworkPrimaryPreview } from "@/lib/proof-slides";
import type { OrderRequestDetail, OrderRequestEvent } from "@/lib/order-requests";
import type {
  ArtworkFile,
  ImprintProductionNotes,
  Job,
  JobImprint,
  LineItem,
  Order,
  OrderDesignMockup,
} from "@/types";

function emptyArtwork(name: string): ArtworkFile {
  return {
    id: `art-${name}`,
    name,
    version: 1,
    status: "pending",
    uploadedAt: new Date().toISOString(),
    uploadedBy: "Shop",
    kind: "mockup",
  };
}

function seedArtwork(event: OrderRequestEvent, title: string): ArtworkFile {
  const base =
    event.artwork && typeof event.artwork === "object"
      ? { ...event.artwork }
      : event.mockup?.previewUrl
        ? {
            ...emptyArtwork(title),
            id: event.mockup.id || `art-${event.id}`,
            name: event.mockup.name || title,
            previewUrl: event.mockup.previewUrl,
            kind: "mockup" as const,
          }
        : emptyArtwork(title);

  return syncArtworkPrimaryPreview({
    ...base,
    // Requests never carry customer approval — always pending until convert.
    status: "pending",
  });
}

function seedNotes(event: OrderRequestEvent): ImprintProductionNotes {
  return {
    ...(event.productionNotes || {}),
    dimensions: event.printSize || event.productionNotes?.dimensions || "",
    placement: event.placement || event.productionNotes?.placement || "",
    instructions: event.notes || event.productionNotes?.instructions || "",
  };
}

function seedDesignMockup(
  event: OrderRequestEvent
): OrderDesignMockup | undefined {
  if (event.designMockup?.id) {
    return event.designMockup;
  }
  const previewUrl = event.mockup?.previewUrl?.trim();
  if (!previewUrl) return undefined;
  return {
    id: event.mockup?.id || `mockup-${event.id}`,
    composedPreviewUrl: previewUrl,
    artworkUrl: previewUrl,
    transform: defaultTransform(),
    locationKey: event.locationKey as OrderDesignMockup["locationKey"],
    updatedAt: new Date().toISOString(),
  };
}

/** Build a studio/proofs-compatible Order from an order request. */
export function buildOrderFromRequest(request: OrderRequestDetail): Order {
  const lineItems: LineItem[] = (request.lineItems || []).map((item) => ({
    id: item.id,
    brand: item.brand || "",
    productName: item.productName || "",
    color: item.color || "",
    colorKey: item.colorCode || undefined,
    productKey: item.styleNumber || item.supplierSku || undefined,
    imageUrl: item.previewUrl || undefined,
    sizes: Object.entries(item.sizes || {}).map(([size, quantity]) => ({
      size,
      quantity: Number(quantity) || 0,
    })),
    unitCost: item.unitCost || 0,
    supplier:
      item.supplierProvider === "ssActivewear"
        ? "ssActivewear"
        : item.supplierProvider === "sanMar"
          ? "sanMar"
          : undefined,
    supplierSku: item.supplierSku,
    supplierPartNumber: item.supplierSku || item.styleNumber || undefined,
  }));

  const allLineIds = lineItems.map((item) => item.id);

  const jobs: Job[] = (request.events || []).map((event) => {
    const linked =
      Array.isArray(event.lineItemIds) && event.lineItemIds.length > 0
        ? event.lineItemIds.filter((id) => allLineIds.includes(id))
        : allLineIds;
    const title = event.name || event.locationLabel || "Decoration";
    const designMockup = seedDesignMockup(event);
    const imprint: JobImprint = {
      id: event.id,
      locationKey: (event.locationKey ||
        "front_chest") as JobImprint["locationKey"],
      label: event.locationLabel || title,
      customLabel: event.name || undefined,
      decoration: (event.decorationType ||
        "screen_print") as JobImprint["decoration"],
      artwork: seedArtwork(event, title),
      designMockup,
      inkColors: (event.inkColors || []).map((ink) => ({
        id: ink.id,
        name: ink.name || ink.pmsCode || "",
        pmsCode: ink.pmsCode || "",
      })),
      notes: seedNotes(event),
    };

    return {
      id: event.id,
      name: `${request.number} — ${event.locationLabel || title}`,
      kind: "decoration" as const,
      lineItemIds: linked.length > 0 ? linked : allLineIds,
      imprints: [imprint],
      tasks: [],
    };
  });

  return {
    id: request.id,
    number: request.number,
    type: "sales_order",
    status: "draft",
    customerId: request.customerId,
    customerName: request.customerName || "",
    company: request.company || "",
    subCustomerId: request.subCustomerId || undefined,
    subCustomerName: request.subCustomerName || undefined,
    inHandsDate: request.inHandsDate || new Date().toISOString().slice(0, 10),
    createdAt: request.createdAt,
    rush: Boolean(request.rush),
    customLabel: request.customLabel || "",
    subtotal: 0,
    tax: 0,
    total: 0,
    paid: 0,
    balance: 0,
    selectedRateSheetId: request.selectedRateSheetId ?? null,
    estimateAdjustments: (request.estimateAdjustments || []).map((row) => ({
      id: row.id,
      label: row.label,
      detail: row.detail,
      qty: row.qty,
      unitPrice: row.unitPrice,
      source: row.source === "auto" ? "auto" : "manual",
      category:
        row.category === "setup" ||
        row.category === "decoration" ||
        row.category === "finishing" ||
        row.category === "other"
          ? row.category
          : "other",
      contractFeeId: row.contractFeeId,
    })),
    excludedContractFeeIds: request.excludedContractFeeIds || [],
    materials: {
      lines: [],
      blankSource: request.blankSource,
    },
    productionRun: request.productionRun
      ? {
          id: request.productionRun.id,
          combinedQuantity: request.productionRun.combinedQuantity,
          updatedAt: request.productionRun.updatedAt || request.updatedAt,
          members: (request.productionRun.members || []).map((member) => ({
            orderId: member.requestId,
            orderNumber: member.requestNumber,
            customLabel: member.customLabel,
            quantity: member.quantity,
          })),
        }
      : undefined,
    lineItems,
    jobs,
    messages: [],
    files: [],
    shipments: [],
    activity: request.activity || [],
  };
}

/** Map imprint proof edits back onto a request event. */
export function applyImprintEditsToEvent(
  event: OrderRequestEvent,
  patch: {
    customLabel?: string;
    notes?: ImprintProductionNotes;
    inkColors?: JobImprint["inkColors"];
    artwork?: ArtworkFile;
  }
): OrderRequestEvent {
  const next: OrderRequestEvent = { ...event };

  if (patch.customLabel !== undefined) {
    next.name = patch.customLabel;
  }

  if (patch.notes) {
    next.productionNotes = patch.notes;
    next.printSize = patch.notes.dimensions || "";
    next.placement = patch.notes.placement || "";
    next.notes = patch.notes.instructions || "";
  }

  if (patch.inkColors) {
    next.inkColors = patch.inkColors.map((ink) => ({
      id: ink.id,
      name: ink.name || ink.pmsCode || "",
      pmsCode: ink.pmsCode || "",
    }));
  }

  if (patch.artwork) {
    const artwork = syncArtworkPrimaryPreview({
      ...patch.artwork,
      status: "pending",
    });
    next.artwork = artwork;
    const previewUrl = artwork.previewUrl?.trim();
    next.mockup = previewUrl
      ? {
          id: artwork.id || event.mockup?.id || `mockup-${event.id}`,
          name:
            artwork.mockupLabel ||
            artwork.name ||
            event.mockup?.name ||
            "Mockup",
          previewUrl,
        }
      : event.mockup;
  }

  return next;
}

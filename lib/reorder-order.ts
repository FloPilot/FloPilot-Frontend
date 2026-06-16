import { addDays, format } from "date-fns";
import type { Job, LineItem, Order } from "@/types";
import {
  createArtworkId,
  createImprintId,
  createJobId,
} from "@/lib/order-production";

function cloneLineItem(item: LineItem, suffix: string): LineItem {
  return {
    ...item,
    id: `li-${suffix}-${item.id}`,
    sizes: item.sizes.map((s) => ({ ...s })),
  };
}

function cloneJob(job: Job): Job {
  const jobId = createJobId();
  return {
    ...job,
    id: jobId,
    lineItemIds: job.lineItemIds ? [...job.lineItemIds] : undefined,
    imprints: job.imprints.map((imprint) => ({
      ...imprint,
      id: createImprintId(),
      artwork: {
        ...imprint.artwork,
        id: createArtworkId(),
        status: "pending" as const,
        version: 1,
        uploadedAt: new Date().toISOString(),
        uploadedBy: "Shop",
        history: undefined,
      },
    })),
    tasks: [],
  };
}

export function generateReorderNumber(sourceNumber: string): string {
  const base = sourceNumber.replace(/^(SO|QT|INV)-/, "");
  const stamp = format(new Date(), "yyMMdd");
  return `SO-${base}-R${stamp}`;
}

export function buildReorderFromOrder(
  source: Order,
  existingNumbers: string[]
): Order {
  let number = generateReorderNumber(source.number);
  let attempt = 0;
  while (existingNumbers.includes(number) && attempt < 20) {
    attempt += 1;
    number = `${generateReorderNumber(source.number)}-${attempt}`;
  }

  const now = new Date().toISOString();
  const inHands = format(addDays(new Date(), 21), "yyyy-MM-dd");
  const suffix = String(Date.now());

  return {
    id: `ord-${Date.now()}`,
    number,
    type: "sales_order",
    status: "quote_sent",
    customerId: source.customerId,
    customerName: source.customerName,
    company: source.company,
    createdAt: now,
    inHandsDate: inHands,
    subtotal: source.subtotal,
    tax: source.tax,
    total: source.total,
    paid: 0,
    balance: source.total,
    rush: false,
    lineItems: source.lineItems.map((item) => cloneLineItem(item, suffix)),
    jobs: source.jobs.map(cloneJob),
    shipments: [],
    messages: [],
    files: undefined,
    internalNotes: [
      {
        id: `inote-reorder-${Date.now()}`,
        author: "Shop",
        content: `Reorder created from ${source.number}. Review artwork and schedule before production.`,
        timestamp: now,
      },
    ],
    activity: [
      {
        id: `act-reorder-${Date.now()}`,
        type: "status",
        title: "Reorder started",
        detail: `Copied from ${source.number}`,
        timestamp: now,
        author: "Shop",
      },
    ],
  };
}

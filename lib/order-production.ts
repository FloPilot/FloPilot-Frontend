import { format, parseISO } from "date-fns";
import type {
  DecorationType,
  ImprintLocationKey,
  Job,
  JobImprint,
  Order,
  ScheduleBlock,
} from "@/types";
import {
  getPrintLocationOptions,
  resolvePrintLocationLabel,
  type ShopProductionDefaults,
} from "@/lib/shop-settings";

export type ProductionStep = {
  job: Job;
  imprint: JobImprint;
};

export type ProductionStepTemplate = {
  id: string;
  name: string;
  locationKey: ImprintLocationKey;
  decoration: DecorationType;
  kind: "decoration" | "finishing" | "subcontract";
  finishingStepId?: string;
  subcontractServiceId?: string;
  defaultVendorName?: string;
};

export const PRODUCTION_STEP_TEMPLATES: ProductionStepTemplate[] = [
  {
    id: "neck-label",
    name: "Neck label",
    locationKey: "nape",
    decoration: "screen_print",
    kind: "decoration",
  },
  {
    id: "front-chest",
    name: "Front center chest",
    locationKey: "front_chest",
    decoration: "screen_print",
    kind: "decoration",
  },
  {
    id: "full-back",
    name: "Full back",
    locationKey: "full_back",
    decoration: "screen_print",
    kind: "decoration",
  },
  {
    id: "side-label",
    name: "Side woven label",
    locationKey: "other",
    decoration: "embroidery",
    kind: "decoration",
  },
  {
    id: "bagging",
    name: "Bagging & labeling",
    locationKey: "other",
    decoration: "finishing",
    kind: "finishing",
  },
  {
    id: "subcontract-patches",
    name: "Subcontract — sew-on patches",
    locationKey: "other",
    decoration: "subcontract",
    kind: "subcontract",
  },
];

/** Quick picks for add-event flows — driven by shop decoration locations (+ enabled finishing steps). */
export function getProductionStepQuickPicks(
  productionDefaults?: ShopProductionDefaults | null
): ProductionStepTemplate[] {
  const decorationPicks = getPrintLocationOptions(productionDefaults).map(
    (location) => ({
      id: `print-${location.value}`,
      name: location.label,
      locationKey: location.value,
      decoration: (location.decorationType?.trim() ||
        "screen_print") as DecorationType,
      kind: "decoration" as const,
    })
  );

  const finishingPicks = (productionDefaults?.finishingSteps ?? [])
    .filter((step) => step.enabled)
    .map((step) => ({
      id: `finishing-${step.id}`,
      name: step.name,
      locationKey: "other" as const,
      decoration: "finishing" as DecorationType,
      kind: "finishing" as const,
      finishingStepId: step.id,
    }));

  const configuredSubcontract = (productionDefaults?.subcontractServices ?? [])
    .filter((service) => service.enabled !== false)
    .map((service) => ({
      id: `subcontract-${service.id}`,
      name: service.name,
      locationKey: "other" as const,
      decoration: "subcontract" as DecorationType,
      kind: "subcontract" as const,
      subcontractServiceId: service.id,
      defaultVendorName: service.defaultVendorName,
    }));

  const subcontractPicks: ProductionStepTemplate[] =
    configuredSubcontract.length > 0
      ? configuredSubcontract
      : [
          {
            id: "subcontract-generic",
            name: "Subcontract work",
            locationKey: "other",
            decoration: "subcontract",
            kind: "subcontract",
          },
        ];

  return [...decorationPicks, ...finishingPicks, ...subcontractPicks];
}

export function getOrderProductionSteps(order: Order): ProductionStep[] {
  return order.jobs.flatMap((job) =>
    job.imprints.map((imprint) => ({ job, imprint }))
  );
}

export function findScheduleBlockForStep(
  blocks: ScheduleBlock[],
  orderId: string,
  jobId: string,
  imprintId: string
): ScheduleBlock | undefined {
  return blocks.find(
    (b) =>
      b.orderId === orderId &&
      b.jobId === jobId &&
      b.imprintId === imprintId
  );
}

export function getOrderScheduleBlocks(
  blocks: ScheduleBlock[],
  orderId: string
): ScheduleBlock[] {
  return blocks.filter((b) => b.orderId === orderId);
}

export function formatScheduleBlockSummary(block: ScheduleBlock): string {
  const start = parseISO(block.startAt);
  return `${format(start, "EEE MMM d · h:mm a")}`;
}

function uniqueSuffix(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createJobId(): string {
  return `job-${uniqueSuffix()}`;
}

export function createImprintId(): string {
  return `imp-${uniqueSuffix()}`;
}

export function createArtworkId(): string {
  return `art-${uniqueSuffix()}`;
}

/**
 * Local clone of a decoration event for the Events Save/Discard bar.
 * Keeps the default location name (no “(copy)” suffix).
 */
export function buildDuplicatedDesignJob(
  sourceJob: Job,
  sourceImprint: JobImprint
): Job {
  const newJobId = createJobId();
  const newImprintId = createImprintId();
  const newArtworkId = createArtworkId();
  const displayName =
    sourceImprint.label?.trim() ||
    sourceJob.name?.trim() ||
    "Design";

  const clonedImprint: JobImprint = {
    ...JSON.parse(JSON.stringify(sourceImprint)),
    id: newImprintId,
    customLabel: undefined,
    isLegacy: false,
    libraryDesignId: undefined,
    designCode: null,
    artwork: {
      id: newArtworkId,
      name: sourceImprint.artwork?.name || "artwork-pending.ai",
      version: 1,
      status: "pending",
      uploadedAt: new Date().toISOString(),
      mockupLabel: sourceImprint.artwork?.mockupLabel,
      kind: sourceImprint.artwork?.kind,
      previewUrl: sourceImprint.artwork?.previewUrl,
      proofSlides: Array.isArray(sourceImprint.artwork?.proofSlides)
        ? sourceImprint.artwork.proofSlides.map((slide, index) => ({
            ...slide,
            id: `${newArtworkId}-slide-${index + 1}`,
          }))
        : undefined,
    },
    workflow: undefined,
  };

  return {
    id: newJobId,
    name: displayName,
    kind: sourceJob.kind === "finishing" ? "finishing" : "decoration",
    ...(sourceJob.finishingStepId
      ? { finishingStepId: sourceJob.finishingStepId }
      : {}),
    ...(Array.isArray(sourceJob.lineItemIds)
      ? { lineItemIds: [...sourceJob.lineItemIds] }
      : {}),
    ...(Array.isArray(sourceJob.blankAssignments)
      ? {
          blankAssignments: JSON.parse(
            JSON.stringify(sourceJob.blankAssignments)
          ),
        }
      : {}),
    imprints: [clonedImprint],
    tasks: [],
  };
}

export function buildJobFromTemplate(
  template: ProductionStepTemplate,
  productionDefaults?: ShopProductionDefaults | null
): Job {
  const imprintId = createImprintId();
  const isSubcontract = template.kind === "subcontract";
  const isFinishing = template.kind === "finishing";
  return {
    id: createJobId(),
    name: template.name,
    kind: template.kind,
    ...(isFinishing && template.finishingStepId
      ? { finishingStepId: template.finishingStepId }
      : {}),
    ...(isSubcontract && template.subcontractServiceId
      ? { subcontractServiceId: template.subcontractServiceId }
      : {}),
    imprints: [
      {
        id: imprintId,
        locationKey: template.locationKey,
        label:
          isFinishing || isSubcontract
            ? template.name
            : resolvePrintLocationLabel(
                template.locationKey,
                productionDefaults
              ),
        decoration: isSubcontract ? "subcontract" : template.decoration,
        artwork: {
          id: createArtworkId(),
          name:
            isFinishing || isSubcontract ? "n/a" : "artwork-pending.ai",
          version: 1,
          status: isSubcontract ? "approved" : "pending",
          uploadedAt: new Date().toISOString(),
        },
        ...(isSubcontract
          ? {
              subcontract: {
                workDescription: template.name,
                status: "planned" as const,
                ...(template.defaultVendorName
                  ? { vendorName: template.defaultVendorName }
                  : {}),
              },
            }
          : {}),
      },
    ],
    tasks: [],
  };
}

export function buildCustomProductionJob(
  input: {
    name: string;
    locationKey: ImprintLocationKey;
    decoration: DecorationType;
    kind: "decoration" | "finishing" | "subcontract";
    finishingStepId?: string;
    subcontractServiceId?: string;
    defaultVendorName?: string;
  },
  productionDefaults?: ShopProductionDefaults | null
): Job {
  return buildJobFromTemplate(
    {
      id: "custom",
      name: input.name.trim(),
      locationKey: input.locationKey,
      decoration:
        input.kind === "subcontract" ? "subcontract" : input.decoration,
      kind: input.kind,
      ...(input.kind === "finishing" && input.finishingStepId
        ? { finishingStepId: input.finishingStepId }
        : {}),
      ...(input.kind === "subcontract" && input.subcontractServiceId
        ? { subcontractServiceId: input.subcontractServiceId }
        : {}),
      ...(input.kind === "subcontract" && input.defaultVendorName
        ? { defaultVendorName: input.defaultVendorName }
        : {}),
    },
    productionDefaults
  );
}

export function countScheduledSteps(
  order: Order,
  blocks: ScheduleBlock[]
): { scheduled: number; total: number } {
  const steps = getOrderProductionSteps(order);
  const scheduled = steps.filter((step) =>
    findScheduleBlockForStep(
      blocks,
      order.id,
      step.job.id,
      step.imprint.id
    )
  ).length;
  return { scheduled, total: steps.length };
}

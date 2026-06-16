import { format, parseISO } from "date-fns";
import type {
  DecorationType,
  ImprintLocationKey,
  Job,
  JobImprint,
  Order,
  ScheduleBlock,
} from "@/types";
import { IMPRINT_LOCATION_LABELS } from "@/lib/job-imprints";

export type ProductionStep = {
  job: Job;
  imprint: JobImprint;
};

export type ProductionStepTemplate = {
  id: string;
  name: string;
  locationKey: ImprintLocationKey;
  decoration: DecorationType;
  kind: "decoration" | "finishing";
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
];

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

export function createJobId(): string {
  return `job-${Date.now()}`;
}

export function createImprintId(): string {
  return `imp-${Date.now()}`;
}

export function createArtworkId(): string {
  return `art-${Date.now()}`;
}

export function buildJobFromTemplate(
  template: ProductionStepTemplate
): Job {
  const imprintId = createImprintId();
  return {
    id: createJobId(),
    name: template.name,
    kind: template.kind,
    imprints: [
      {
        id: imprintId,
        locationKey: template.locationKey,
        label:
          template.kind === "finishing"
            ? template.name
            : IMPRINT_LOCATION_LABELS[template.locationKey],
        decoration: template.decoration,
        artwork: {
          id: createArtworkId(),
          name: template.kind === "finishing" ? "n/a" : "artwork-pending.ai",
          version: 1,
          status: "pending",
          uploadedAt: new Date().toISOString(),
        },
      },
    ],
    tasks: [],
  };
}

export function buildCustomProductionJob(input: {
  name: string;
  locationKey: ImprintLocationKey;
  decoration: DecorationType;
  kind: "decoration" | "finishing";
}): Job {
  return buildJobFromTemplate({
    id: "custom",
    name: input.name.trim(),
    locationKey: input.locationKey,
    decoration: input.decoration,
    kind: input.kind,
  });
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

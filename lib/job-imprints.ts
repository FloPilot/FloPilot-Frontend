import type {
  DecorationType,
  ImprintLocationKey,
  Job,
  JobImprint,
  Order,
  ScheduleBlock,
} from "@/types";

export const IMPRINT_LOCATION_LABELS: Record<ImprintLocationKey, string> = {
  front_left_chest: "Front left chest",
  front_chest: "Front chest",
  full_front: "Full front",
  full_back: "Full back",
  back: "Back",
  left_sleeve: "Left sleeve",
  right_sleeve: "Right sleeve",
  nape: "Nape / yoke",
  other: "Other",
};

export function imprintLocationLabel(key: ImprintLocationKey): string {
  return IMPRINT_LOCATION_LABELS[key];
}

export function getJobDecorations(job: Job): DecorationType[] {
  return [...new Set(job.imprints.map((i) => i.decoration))];
}

export function findJobImprint(
  job: Job | undefined,
  imprintId?: string
): JobImprint | undefined {
  if (!job) return undefined;
  if (imprintId) {
    return job.imprints.find((i) => i.id === imprintId);
  }
  return job.imprints[0];
}

export function findOrderImprint(
  order: Order,
  jobId: string,
  imprintId?: string
): { job: Job; imprint: JobImprint } | undefined {
  const job = order.jobs.find((j) => j.id === jobId);
  const imprint = findJobImprint(job, imprintId);
  if (!job || !imprint) return undefined;
  return { job, imprint };
}

export type MockupEntry = {
  job: Job;
  imprint: JobImprint;
};

export function collectOrderMockups(
  order: Order,
  focus?: { jobId: string; imprintId?: string }
): { pinned: MockupEntry | null; others: MockupEntry[] } {
  const entries: MockupEntry[] = order.jobs.flatMap((job) =>
    job.imprints.map((imprint) => ({ job, imprint }))
  );

  if (entries.length === 0) {
    return { pinned: null, others: [] };
  }

  if (!focus) {
    return { pinned: null, others: entries };
  }

  const pinIndex = entries.findIndex(
    (e) =>
      e.job.id === focus.jobId &&
      (focus.imprintId ? e.imprint.id === focus.imprintId : true)
  );

  if (pinIndex < 0) {
    return { pinned: null, others: entries };
  }

  const pinned = entries[pinIndex];
  const others = [
    ...entries.slice(0, pinIndex),
    ...entries.slice(pinIndex + 1),
  ];

  return { pinned, others };
}

export function scheduleFocusFromBlock(
  block: ScheduleBlock | undefined
): { jobId: string; imprintId?: string } | undefined {
  if (!block) return undefined;
  return { jobId: block.jobId, imprintId: block.imprintId };
}

export function schedulableJobKey(
  orderId: string,
  jobId: string,
  imprintId: string
): string {
  return `${orderId}::${jobId}::${imprintId}`;
}

export function parseSchedulableJobKey(key: string): {
  orderId: string;
  jobId: string;
  imprintId: string;
} | null {
  const parts = key.split("::");
  if (parts.length !== 3) return null;
  return { orderId: parts[0], jobId: parts[1], imprintId: parts[2] };
}

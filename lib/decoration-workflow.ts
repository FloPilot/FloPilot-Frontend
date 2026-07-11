import type { DecorationType } from "@/types";

export type DecorationWorkflowStepKey =
  | "artwork"
  | "materials"
  | "prep"
  | "scheduled"
  | "floor";

export type DecorationWorkflowStep = {
  key: DecorationWorkflowStepKey;
  label: string;
  shortLabel: string;
  doneTitle: string;
  pendingTitle: string;
  inProgressTitle: string;
};

const SHARED_SCHEDULED: DecorationWorkflowStep = {
  key: "scheduled",
  label: "Scheduled",
  shortLabel: "Scheduled",
  doneTitle: "On the production calendar",
  pendingTitle: "Ready for scheduling",
  inProgressTitle: "Partially scheduled",
};

const SHARED_FLOOR: DecorationWorkflowStep = {
  key: "floor",
  label: "On the floor",
  shortLabel: "Production",
  doneTitle: "Completed",
  pendingTitle: "Not started on the floor",
  inProgressTitle: "Running on the floor",
};

/** Display labels per decoration — foundation for future shop-configurable workflows */
const DECORATION_WORKFLOW: Record<DecorationType, DecorationWorkflowStep[]> = {
  screen_print: [
    {
      key: "artwork",
      label: "Art approved",
      shortLabel: "Art",
      doneTitle: "Proof approved",
      pendingTitle: "Proof not approved yet",
      inProgressTitle: "Proof in review",
    },
    {
      key: "materials",
      label: "Blanks received",
      shortLabel: "Blanks",
      doneTitle: "Blank garments in",
      pendingTitle: "Waiting on blanks",
      inProgressTitle: "Blanks partially in",
    },
    {
      key: "prep",
      label: "Screens ready",
      shortLabel: "Screens",
      doneTitle: "Screens burned & ready",
      pendingTitle: "Screens not ready",
      inProgressTitle: "Screens in progress",
    },
    SHARED_SCHEDULED,
    SHARED_FLOOR,
  ],
  dtf: [
    {
      key: "artwork",
      label: "Art approved",
      shortLabel: "Art",
      doneTitle: "Artwork approved",
      pendingTitle: "Artwork not approved",
      inProgressTitle: "Artwork in review",
    },
    {
      key: "materials",
      label: "Blanks & transfers",
      shortLabel: "Receiving",
      doneTitle: "Blanks and DTF transfers in",
      pendingTitle: "Waiting on blanks or transfers",
      inProgressTitle: "Receiving in progress",
    },
    {
      key: "prep",
      label: "Press setup",
      shortLabel: "Setup",
      doneTitle: "Heat press ready",
      pendingTitle: "Press not set up",
      inProgressTitle: "Press setup in progress",
    },
    SHARED_SCHEDULED,
    SHARED_FLOOR,
  ],
  embroidery: [
    {
      key: "artwork",
      label: "Art approved",
      shortLabel: "Art",
      doneTitle: "Digitizing files approved",
      pendingTitle: "Files not approved",
      inProgressTitle: "Files in review",
    },
    {
      key: "materials",
      label: "Garments received",
      shortLabel: "Garments",
      doneTitle: "Garments in",
      pendingTitle: "Waiting on garments",
      inProgressTitle: "Garments partially in",
    },
    {
      key: "prep",
      label: "Digitizing & setup",
      shortLabel: "Digitizing",
      doneTitle: "Program tested & machine ready",
      pendingTitle: "Digitizing or setup not finished",
      inProgressTitle: "Digitizing in progress",
    },
    SHARED_SCHEDULED,
    SHARED_FLOOR,
  ],
  vinyl: [
    {
      key: "artwork",
      label: "Art approved",
      shortLabel: "Art",
      doneTitle: "Vector art approved",
      pendingTitle: "Art not approved",
      inProgressTitle: "Art in review",
    },
    {
      key: "materials",
      label: "Materials received",
      shortLabel: "Materials",
      doneTitle: "Vinyl and blanks in",
      pendingTitle: "Waiting on vinyl or blanks",
      inProgressTitle: "Materials partially in",
    },
    {
      key: "prep",
      label: "Cut & weed",
      shortLabel: "Vinyl",
      doneTitle: "Vinyl cut and weeded",
      pendingTitle: "Cut & weed not finished",
      inProgressTitle: "Cut & weed in progress",
    },
    SHARED_SCHEDULED,
    SHARED_FLOOR,
  ],
  finishing: [
    {
      key: "materials",
      label: "Supplies received",
      shortLabel: "Supplies",
      doneTitle: "Bags, labels, and supplies in",
      pendingTitle: "Waiting on finishing supplies",
      inProgressTitle: "Supplies partially in",
    },
    {
      key: "prep",
      label: "Finishing setup",
      shortLabel: "Finishing",
      doneTitle: "Folding, bagging, and labeling ready",
      pendingTitle: "Finishing setup not done",
      inProgressTitle: "Finishing setup in progress",
    },
    SHARED_SCHEDULED,
    SHARED_FLOOR,
  ],
};

export function getDecorationWorkflowSteps(
  decoration: DecorationType
): DecorationWorkflowStep[] {
  return DECORATION_WORKFLOW[decoration] ?? DECORATION_WORKFLOW.screen_print;
}

export function getDecorationPrepSteps(
  decoration: DecorationType
): DecorationWorkflowStep[] {
  return getDecorationWorkflowSteps(decoration).filter((step) =>
    ["artwork", "materials", "prep"].includes(step.key)
  );
}

export function getDecorationWorkflowStep(
  decoration: DecorationType,
  key: DecorationWorkflowStepKey
): DecorationWorkflowStep | undefined {
  return getDecorationWorkflowSteps(decoration).find((step) => step.key === key);
}

import type { OrderEstimateFeeCategory } from "@/types";

export const FEE_CATEGORY_ORDER: OrderEstimateFeeCategory[] = [
  "decoration",
  "setup",
  "finishing",
  "other",
];

export const FEE_CATEGORY_OPTIONS: {
  value: OrderEstimateFeeCategory;
  label: string;
  description: string;
  defaultLabel: string;
}[] = [
  {
    value: "decoration",
    label: "Decoration",
    description: "Extra decoration, locations, or print charges",
    defaultLabel: "Decoration charge",
  },
  {
    value: "setup",
    label: "Setup",
    description: "Screen, digitizing, or art setup",
    defaultLabel: "Setup fee",
  },
  {
    value: "finishing",
    label: "Finishing",
    description: "Folding, bagging, tagging, or similar",
    defaultLabel: "Finishing fee",
  },
  {
    value: "other",
    label: "Other",
    description: "Miscellaneous order charge",
    defaultLabel: "Additional charge",
  },
];

export function feeCategoryLabel(category?: OrderEstimateFeeCategory): string {
  return (
    FEE_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ??
    "Other"
  );
}

export function defaultLabelForFeeCategory(
  category: OrderEstimateFeeCategory
): string {
  return (
    FEE_CATEGORY_OPTIONS.find((option) => option.value === category)
      ?.defaultLabel ?? "Additional charge"
  );
}

export function normalizeFeeCategory(
  value: unknown,
  fallback: OrderEstimateFeeCategory = "other"
): OrderEstimateFeeCategory {
  if (
    value === "setup" ||
    value === "decoration" ||
    value === "finishing" ||
    value === "other"
  ) {
    return value;
  }
  return fallback;
}

export function autoFeeCategoryFromContract(
  contractKind: string
): OrderEstimateFeeCategory {
  if (contractKind === "setup") return "setup";
  if (contractKind === "additional_location") return "decoration";
  return "other";
}

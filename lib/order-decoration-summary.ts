import type { DecorationType, Order } from "@/types";
import { decorationLabel } from "@/lib/format";
import { getOrderProductionSteps } from "@/lib/order-production";

export type OrderDecorationSummary = {
  types: DecorationType[];
  labels: string[];
  label: string;
};

export function orderHasDecorationType(
  order: Order,
  decoration: DecorationType
): boolean {
  return getOrderProductionSteps(order).some(
    ({ job, imprint }) =>
      job.kind !== "finishing" && imprint.decoration === decoration
  );
}

export function getOrderDecorationSummary(order: Order): OrderDecorationSummary {
  const types = [
    ...new Set(
      getOrderProductionSteps(order)
        .filter(
          ({ job, imprint }) =>
            job.kind !== "finishing" && imprint.decoration !== "finishing"
        )
        .map(({ imprint }) => imprint.decoration)
    ),
  ];

  const labels = types.map((type) => decorationLabel(type));

  return {
    types,
    labels,
    label:
      labels.length === 0
        ? "No decorations"
        : labels.length === 1
          ? labels[0]
          : labels.join(" · "),
  };
}

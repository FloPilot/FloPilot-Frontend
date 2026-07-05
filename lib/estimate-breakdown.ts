import type { OrderEstimateFeeCategory } from "@/types";
import type { EstimateRow, EstimateTotals } from "@/lib/order-estimate";
import { feeCategoryLabel } from "@/lib/estimate-fee-categories";

export type EstimateSection = {
  key: string;
  label: string;
  rows: EstimateRow[];
  subtotal: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function groupEstimateSections(totals: EstimateTotals): EstimateSection[] {
  const garmentRows = totals.rows.filter((row) => row.kind === "garment");
  const matrixDecorationRows = totals.rows.filter(
    (row) => row.kind === "decoration"
  );
  const feeRows = totals.rows.filter((row) => row.kind === "fee");

  const sections: EstimateSection[] = [];

  if (garmentRows.length > 0) {
    sections.push({
      key: "garments",
      label: "Garments",
      rows: garmentRows,
      subtotal: totals.garmentSubtotal,
    });
  }

  const decorationFeeRows = feeRows.filter(
    (row) => row.feeCategory === "decoration"
  );
  const decorationRows = [...matrixDecorationRows, ...decorationFeeRows];
  if (decorationRows.length > 0) {
    sections.push({
      key: "decoration",
      label: "Decoration",
      rows: decorationRows,
      subtotal: round2(
        totals.decorationSubtotal +
          decorationFeeRows.reduce((sum, row) => sum + row.lineTotal, 0)
      ),
    });
  }

  for (const category of ["setup", "finishing", "other"] as OrderEstimateFeeCategory[]) {
    const rows = feeRows.filter((row) => row.feeCategory === category);
    if (rows.length === 0) continue;
    sections.push({
      key: category,
      label: feeCategoryLabel(category),
      rows,
      subtotal: round2(rows.reduce((sum, row) => sum + row.lineTotal, 0)),
    });
  }

  return sections;
}

export type ReviewEstimateRow = {
  kind: "garment" | "decoration" | "fee";
  description: string;
  detail: string;
  qty: number;
  unitCost: number;
  lineTotal: number;
  feeCategory?: OrderEstimateFeeCategory;
};

export type ReviewEstimateSection = {
  key: string;
  label: string;
  rows: ReviewEstimateRow[];
  subtotal: number;
};

export function groupReviewEstimateSections(input: {
  rows: ReviewEstimateRow[];
  garmentSubtotal: number;
  decorationSubtotal: number;
}): ReviewEstimateSection[] {
  const garmentRows = input.rows.filter((row) => row.kind === "garment");
  const matrixDecorationRows = input.rows.filter(
    (row) => row.kind === "decoration"
  );
  const feeRows = input.rows.filter((row) => row.kind === "fee");

  const sections: ReviewEstimateSection[] = [];

  if (garmentRows.length > 0) {
    sections.push({
      key: "garments",
      label: "Garments",
      rows: garmentRows,
      subtotal: input.garmentSubtotal,
    });
  }

  const decorationFeeRows = feeRows.filter(
    (row) => row.feeCategory === "decoration"
  );
  const decorationRows = [...matrixDecorationRows, ...decorationFeeRows];
  if (decorationRows.length > 0) {
    sections.push({
      key: "decoration",
      label: "Decoration",
      rows: decorationRows,
      subtotal: round2(
        input.decorationSubtotal +
          decorationFeeRows.reduce((sum, row) => sum + row.lineTotal, 0)
      ),
    });
  }

  for (const category of ["setup", "finishing", "other"] as OrderEstimateFeeCategory[]) {
    const rows = feeRows.filter((row) => row.feeCategory === category);
    if (rows.length === 0) continue;
    sections.push({
      key: category,
      label: feeCategoryLabel(category),
      rows,
      subtotal: round2(rows.reduce((sum, row) => sum + row.lineTotal, 0)),
    });
  }

  return sections;
}

import type { PricingMethod } from "@/lib/shop-settings";

export type LocationChargeMode = "per_imprint" | "bundled";

/** Meta columns store location allowance, not dollar prices. */
export function isLocationsMetaColumn(header: string): boolean {
  const trimmed = header.trim();
  return (
    /^locations?$/i.test(trimmed) ||
    /^\d+\s*locations?$/i.test(trimmed) ||
    /^incl\.?\s*locations?$/i.test(trimmed)
  );
}

export function locationsMetaColumnIndex(method: PricingMethod): number {
  return method.columns.findIndex((column) => isLocationsMetaColumn(column));
}

/** Indexes of columns that hold unit prices (excludes Locations meta). */
export function priceColumnIndexes(method: PricingMethod): number[] {
  return method.columns
    .map((column, index) => ({ column, index }))
    .filter(({ column }) => !isLocationsMetaColumn(column))
    .map(({ index }) => index);
}

/**
 * Read included-location count from an explicit field, or from a Locations
 * column (e.g. every tier cell = 3 meaning “up to 3 locations”).
 */
export function resolveIncludedLocations(
  method: PricingMethod
): number | undefined {
  if (
    typeof method.includedLocations === "number" &&
    Number.isFinite(method.includedLocations) &&
    method.includedLocations > 0
  ) {
    return Math.floor(method.includedLocations);
  }

  const locIdx = locationsMetaColumnIndex(method);
  if (locIdx < 0) return undefined;

  let max = 0;
  for (const row of method.rows) {
    const value = Number(row.prices[locIdx]);
    if (Number.isFinite(value) && value > max) {
      max = Math.floor(value);
    }
  }
  return max > 0 ? max : undefined;
}

export function resolveLocationChargeMode(
  method: PricingMethod
): LocationChargeMode {
  if (method.locationChargeMode === "bundled") return "bundled";
  if (method.locationChargeMode === "per_imprint") return "per_imprint";
  // Legacy sheets that used a Locations column intend a bundled charge.
  return resolveIncludedLocations(method) ? "bundled" : "per_imprint";
}

/**
 * Keep bundled location settings in the grid's Locations column so they
 * persist even when the API normalizer doesn't yet round-trip the new fields.
 */
export function syncLocationBundleToMethod(
  method: PricingMethod,
  mode: LocationChargeMode,
  includedLocations = 3
): PricingMethod {
  const included = Math.max(1, Math.min(12, Math.floor(includedLocations) || 3));
  const locIdx = locationsMetaColumnIndex(method);

  if (mode === "per_imprint") {
    if (locIdx < 0) {
      return {
        ...method,
        locationChargeMode: "per_imprint",
        includedLocations: undefined,
      };
    }
    return {
      ...method,
      locationChargeMode: "per_imprint",
      includedLocations: undefined,
      columns: method.columns.filter((_, index) => index !== locIdx),
      rows: method.rows.map((row) => ({
        ...row,
        prices: row.prices.filter((_, index) => index !== locIdx),
      })),
    };
  }

  if (locIdx >= 0) {
    return {
      ...method,
      locationChargeMode: "bundled",
      includedLocations: included,
      columns: method.columns.map((column, index) =>
        index === locIdx ? "Locations" : column
      ),
      rows: method.rows.map((row) => {
        const prices = [...row.prices];
        while (prices.length < method.columns.length) prices.push(0);
        prices[locIdx] = included;
        return { ...row, prices };
      }),
    };
  }

  return {
    ...method,
    locationChargeMode: "bundled",
    includedLocations: included,
    columns: [...method.columns, "Locations"],
    rows: method.rows.map((row) => ({
      ...row,
      prices: [...row.prices, included],
    })),
  };
}

/** Ensure bundled location settings are written into the grid before save. */
export function syncLocationBundleInMethods(
  methods: PricingMethod[]
): PricingMethod[] {
  return methods.map((method) => {
    const mode = resolveLocationChargeMode(method);
    if (mode === "bundled") {
      return syncLocationBundleToMethod(
        method,
        "bundled",
        resolveIncludedLocations(method) ?? 3
      );
    }
    if (method.locationChargeMode === "per_imprint") {
      return syncLocationBundleToMethod(method, "per_imprint");
    }
    return method;
  });
}

export function formatBundledImprintLabel(labels: string[]): string {
  const cleaned = labels.map((label) => label.trim()).filter(Boolean);
  if (cleaned.length === 0) return "Locations";
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return `${cleaned[0]} + ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(", ")} + ${cleaned[cleaned.length - 1]}`;
}

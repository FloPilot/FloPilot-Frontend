import { format, parseISO } from "date-fns";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatCompactCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDate(date: string): string {
  return format(parseISO(date), "MMM d, yyyy");
}

export function formatDateTime(date: string): string {
  return format(parseISO(date), "MMM d, yyyy · h:mm a");
}

export function humanizeKey(value: string): string {
  if (!value) return "";
  return value
    .replace(/^loc[-_]/, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export const DECORATION_TYPE_OPTIONS = [
  { value: "screen_print", label: "Screen Print" },
  { value: "embroidery", label: "Embroidery" },
  { value: "dtf", label: "DTF" },
  { value: "vinyl", label: "Vinyl" },
  { value: "finishing", label: "Finishing" },
] as const;

export const EVENT_KIND_OPTIONS = [
  { value: "decoration", label: "Decoration" },
  { value: "finishing", label: "Finishing" },
] as const;

export function resolveSelectLabel(
  value: string | undefined | null,
  options?: ReadonlyArray<{ value: string; label: string }>,
  format?: (value: string) => string
): string | undefined {
  if (!value) return undefined;
  return (
    options?.find((option) => option.value === value)?.label ??
    (format ? format(value) : humanizeKey(value))
  );
}

export function decorationLabel(type: string): string {
  return (
    DECORATION_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
    humanizeKey(type)
  );
}

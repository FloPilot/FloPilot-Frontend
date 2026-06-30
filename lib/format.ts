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

export function decorationLabel(type: string): string {
  const labels: Record<string, string> = {
    screen_print: "Screen Print",
    embroidery: "Embroidery",
    dtf: "DTF",
    vinyl: "Vinyl",
    finishing: "Finishing",
  };
  return labels[type] ?? type;
}

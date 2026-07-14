import type { SavedCustomReport } from "@/lib/reports/custom-report-builder";

const STORAGE_KEY = "shop-custom-reports-v1";

export function loadSavedCustomReports(): SavedCustomReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedCustomReport[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomReport(report: SavedCustomReport): SavedCustomReport[] {
  const existing = loadSavedCustomReports();
  const index = existing.findIndex((entry) => entry.id === report.id);
  const next =
    index >= 0
      ? existing.map((entry, i) => (i === index ? report : entry))
      : [report, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function deleteCustomReport(id: string): SavedCustomReport[] {
  const next = loadSavedCustomReports().filter((entry) => entry.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

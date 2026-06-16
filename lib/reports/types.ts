export type ReportContext = "customers_list" | "customer_detail" | "reports_hub";

export interface ReportColumn {
  key: string;
  label: string;
  align?: "left" | "right";
}

export interface ReportResult {
  id: string;
  title: string;
  description: string;
  columns: ReportColumn[];
  rows: Record<string, string | number>[];
  filename: string;
}

export interface ReportDefinition<TData = unknown> {
  id: string;
  title: string;
  description: string;
  category: string;
  contexts: ReportContext[];
  run: (data: TData) => ReportResult;
}

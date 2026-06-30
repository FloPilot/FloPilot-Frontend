/** Shopify-admin-style elevation for dashboard controls and cards */
export const dashboardElevatedShadow =
  "shadow-[0_1px_0_rgba(26,26,26,0.05),0_2px_4px_rgba(26,26,26,0.08),0_4px_12px_rgba(26,26,26,0.06)]";

/** Single corner radius for all dashboard surfaces and controls */
export const dashboardRadiusClass = "rounded-lg";

/** Rectangular control — filters, chips, toolbar buttons */
export const dashboardControlClass = [
  "inline-flex h-9 min-w-0 items-center gap-2 border border-[#e3e3e3] bg-white px-3 text-[13px] font-medium text-[#303030] transition-colors hover:bg-[#fafafa]",
  dashboardRadiusClass,
  dashboardElevatedShadow,
].join(" ");

/** Primary action — New order, New customer, etc. */
export const dashboardPrimaryButtonClass = [
  "inline-flex h-9 min-w-0 items-center gap-2 border border-brand-primary bg-brand-primary px-3 text-[13px] font-medium text-white transition-colors hover:border-brand-primary/90 hover:bg-brand-primary/90",
  dashboardRadiusClass,
  dashboardElevatedShadow,
].join(" ");

/** Low-emphasis action — dismiss, cancel */
export const dashboardGhostButtonClass = [
  "inline-flex h-9 min-w-0 items-center gap-2 border border-transparent bg-transparent px-3 text-[13px] font-medium text-[#616161] transition-colors hover:bg-[#f1f1f1] hover:text-[#303030]",
  dashboardRadiusClass,
].join(" ");

/** @deprecated Use dashboardControlClass */
export const dashboardFilterPillClass = dashboardControlClass;

/** @deprecated Use dashboardControlClass */
export const dashboardChipClass = dashboardControlClass;

/** Shared card surface */
export const dashboardCardClass = [
  "overflow-hidden border border-[#e3e3e3] bg-white",
  dashboardRadiusClass,
  dashboardElevatedShadow,
].join(" ");

export const dashboardPanelHeaderClass =
  "flex items-center justify-between gap-3 border-b border-[#ebebeb] px-4 py-3 sm:px-5";

export const dashboardKpiCardClass = [
  "relative flex min-h-[128px] flex-col rounded-lg border border-[#e3e3e3] bg-white p-4 transition-[border-color,box-shadow] hover:border-[#c9cccf]",
  dashboardElevatedShadow,
  "hover:shadow-[0_1px_0_rgba(26,26,26,0.06),0_3px_6px_rgba(26,26,26,0.1),0_6px_16px_rgba(26,26,26,0.07)]",
].join(" ");

export const dashboardKpiTitleClass =
  "text-[13px] font-semibold leading-none text-[#303030]";

/** Larger section heading — Tasks, Production, etc. */
export const dashboardSectionTitleClass =
  "text-base font-bold leading-tight tracking-tight text-[#303030] sm:text-[17px]";

export const dashboardTaskTitleClass =
  "text-[15px] font-semibold leading-snug text-[#303030]";

export const dashboardTaskDetailClass =
  "text-[13px] leading-snug text-[#616161]";

export const dashboardInsetSurfaceClass = [
  "border border-[#e3e3e3] bg-white",
  dashboardRadiusClass,
  "shadow-[0_1px_0_rgba(26,26,26,0.04),0_1px_2px_rgba(26,26,26,0.05)]",
].join(" ");

export const dashboardLabelClass = "text-[13px] text-[#616161]";
export const dashboardValueClass =
  "text-[1.75rem] font-semibold tabular-nums leading-none tracking-tight text-[#303030]";

export const SHOPIFY_CHART_BLUE = "#2c6ecb";
export const SHOPIFY_CHART_FILL = "rgba(44, 110, 203, 0.14)";

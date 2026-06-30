"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { ReportDialog } from "@/components/reports/report-dialog";
import {
  getReportsForContext,
  type CustomerDetailReportData,
  type CustomersListReportData,
} from "@/lib/reports/customer-reports";
import { dashboardControlClass } from "@/lib/dashboard-styles";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReportsLauncherProps =
  | {
      context: "customers_list" | "reports_hub";
      contextLabel?: string;
      data: CustomersListReportData;
      variant?: "default" | "outline";
      size?: "default" | "sm";
      className?: string;
    }
  | {
      context: "customer_detail";
      contextLabel: string;
      data: CustomerDetailReportData;
      variant?: "default" | "outline";
      size?: "default" | "sm";
      className?: string;
    };

export function ReportsLauncher(props: ReportsLauncherProps) {
  const { variant = "outline", size = "sm", className } = props;
  const [open, setOpen] = useState(false);

  const trigger =
    variant === "outline" ? (
      <button
        type="button"
        className={cn(dashboardControlClass, "h-9", className)}
        onClick={() => setOpen(true)}
      >
        <BarChart3 className="size-3.5" />
        <span className={size === "sm" ? undefined : "hidden sm:inline"}>
          Reports
        </span>
      </button>
    ) : (
      <Button
        variant={variant}
        size={size}
        className={cn(dashboardControlClass, "h-9", className)}
        onClick={() => setOpen(true)}
      >
        <BarChart3 className="size-3.5" />
        <span className={size === "sm" ? undefined : "hidden sm:inline"}>
          Reports
        </span>
      </Button>
    );

  if (props.context === "customers_list" || props.context === "reports_hub") {
    const label =
      props.contextLabel ??
      (props.context === "reports_hub" ? "Your shop" : "Customers");

    return (
      <>
        {trigger}
        <ReportDialog
          open={open}
          onOpenChange={setOpen}
          contextLabel={label}
          reports={getReportsForContext(props.context)}
          data={props.data}
        />
      </>
    );
  }

  const detailProps = props as Extract<
    ReportsLauncherProps,
    { context: "customer_detail" }
  >;

  return (
    <>
      {trigger}
      <ReportDialog
        open={open}
        onOpenChange={setOpen}
        contextLabel={detailProps.contextLabel}
        reports={getReportsForContext("customer_detail")}
        data={detailProps.data}
      />
    </>
  );
}

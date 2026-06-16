"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { ReportDialog } from "@/components/reports/report-dialog";
import {
  getReportsForContext,
  type CustomerDetailReportData,
  type CustomersListReportData,
} from "@/lib/reports/customer-reports";
import { Button } from "@/components/ui/button";

type ReportsLauncherProps =
  | {
      context: "customers_list" | "reports_hub";
      contextLabel?: string;
      data: CustomersListReportData;
      variant?: "default" | "outline";
      size?: "default" | "sm";
    }
  | {
      context: "customer_detail";
      contextLabel: string;
      data: CustomerDetailReportData;
      variant?: "default" | "outline";
      size?: "default" | "sm";
    };

export function ReportsLauncher(props: ReportsLauncherProps) {
  const { variant = "outline", size = "default" } = props;
  const [open, setOpen] = useState(false);

  const trigger = (
    <Button
      variant={variant}
      size={size}
      className="rounded-full"
      onClick={() => setOpen(true)}
    >
      <BarChart3 className="size-4" />
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

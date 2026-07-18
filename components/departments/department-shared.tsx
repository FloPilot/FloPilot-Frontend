"use client";

import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { CalendarDays, ChevronRight, FileWarning } from "lucide-react";
import { CustomerBrandMark } from "@/components/customers/customer-brand-mark";
import { RushBadge } from "@/components/status-badges";
import { Input } from "@/components/ui/input";
import {
  dashboardControlClass,
  dashboardGhostButtonClass,
  dashboardInsetSurfaceClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { formatDate } from "@/lib/format";
import { formatOrderDisplayLine } from "@/lib/order-display";
import {
  isPrepDateDueSoon,
  isPrepDateOverdue,
  type PrepScheduleHint,
} from "@/lib/department-queues";
import { cn } from "@/lib/utils";

export function DepartmentEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description: string;
}) {
  return (
    <div className="px-4 py-14 text-center sm:px-6">
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-[#f1f1f1] text-[#616161]">
        <Icon className="size-5" strokeWidth={1.75} />
      </div>
      <p className="text-sm font-semibold text-[#303030]">{title}</p>
      <p className={cn("mx-auto mt-1 max-w-sm", dashboardTaskDetailClass)}>
        {description}
      </p>
    </div>
  );
}

export function DepartmentOrderLink({
  orderId,
  orderNumber,
  customLabel,
  className,
}: {
  orderId: string;
  orderNumber: string;
  customLabel?: string;
  className?: string;
}) {
  return (
    <Link
      href={`/app/orders/${orderId}`}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        "inline-flex items-center gap-1 text-[13px] font-semibold text-[#2c6ecb] hover:underline",
        className
      )}
    >
      {formatOrderDisplayLine({ number: orderNumber, customLabel })}
      <ChevronRight className="size-3.5 opacity-70" />
    </Link>
  );
}

export function PrepScheduleLabels({
  scheduleHint,
  prepDueAt,
  complete,
}: {
  scheduleHint: PrepScheduleHint | null;
  prepDueAt?: string;
  complete?: boolean;
}) {
  const targetDate = scheduleHint
    ? prepDueAt ?? scheduleHint.suggestedBy
    : undefined;
  const overdue = isPrepDateOverdue(targetDate, Boolean(complete));
  const dueSoon = isPrepDateDueSoon(targetDate, Boolean(complete));

  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px]">
      {scheduleHint ? (
        <span className="inline-flex items-center gap-1 text-[#616161]">
          <CalendarDays className="size-3.5" />
          Run {format(parseISO(scheduleHint.earliestScheduledAt), "MMM d")}
          {scheduleHint.suggestedBy && !prepDueAt ? (
            <span className="text-[#8a8a8a]">
              · aim to finish by {formatDate(scheduleHint.suggestedBy)}
            </span>
          ) : null}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[#8a8a8a]">
          <CalendarDays className="size-3.5" />
          Not scheduled · no prep deadline or urgency yet
        </span>
      )}
      {targetDate && !complete ? (
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 font-medium",
            overdue
              ? "bg-[#fff1f1] text-[#b42318]"
              : dueSoon
                ? "bg-[#fff8eb] text-[#8a6116]"
                : "bg-[#f6f6f7] text-[#616161]"
          )}
        >
          Target {formatDate(targetDate)}
        </span>
      ) : null}
    </div>
  );
}

export function ProductionFilesNotice({
  ready,
  fileCount = 0,
}: {
  ready: boolean;
  fileCount?: number;
}) {
  if (ready) {
    return (
      <p className="text-[12px] text-[#616161]">
        {fileCount} production file{fileCount === 1 ? "" : "s"} uploaded — ready
        to burn screens.
      </p>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-[#fde2c8] bg-[#fff8eb] px-3 py-2 text-[12px] text-[#8a6116]">
      <FileWarning className="mt-0.5 size-3.5 shrink-0" />
      <div>
        <p className="font-semibold text-[#6b4f12]">Waiting on production files</p>
        <p className="mt-0.5 leading-relaxed">
          Upload separation or TIFF files on the order before burning screens.
        </p>
      </div>
    </div>
  );
}

export function PrepDueDateField({
  value,
  disabled,
  onChange,
}: {
  value?: string;
  disabled?: boolean;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-[#616161]">
        Target date
      </span>
      <Input
        type="date"
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value ? event.target.value : undefined)
        }
        className="h-8 w-[9.5rem] text-[12px]"
      />
    </label>
  );
}

export function DepartmentQueueCard({
  customerId,
  company,
  logoUrl,
  accentColorKey,
  fallbackKey,
  rush,
  title,
  subtitle,
  meta,
  actions,
  onClick,
}: {
  customerId?: string;
  company: string;
  logoUrl?: string | null;
  accentColorKey?: string | null;
  fallbackKey: string;
  rush?: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
}) {
  const body = (
    <>
      <CustomerBrandMark
        company={company}
        logoUrl={logoUrl}
        accentColorKey={accentColorKey}
        customerId={customerId}
        fallbackKey={fallbackKey}
        size="sm"
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {title}
          {rush ? <RushBadge /> : null}
        </div>
        {subtitle ? (
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>{subtitle}</p>
        ) : null}
        {meta ? <div className="mt-2">{meta}</div> : null}
      </div>
      {actions ? (
        <div
          className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {actions}
        </div>
      ) : null}
    </>
  );

  const className = cn(
    dashboardInsetSurfaceClass,
    "flex w-full flex-col gap-3 rounded-xl border border-[#ebebeb] p-3.5 text-left sm:flex-row sm:items-start sm:gap-3.5",
    onClick && "cursor-pointer transition-[border-color,box-shadow] hover:border-[#c9cccf] hover:shadow-sm"
  );

  if (onClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
          }
        }}
        className={className}
      >
        {body}
      </div>
    );
  }

  return <article className={className}>{body}</article>;
}

export function DepartmentMarkDoneButton({
  done,
  saving,
  disabled,
  onClick,
  doneLabel = "Mark done",
  undoLabel = "Mark not done",
}: {
  done: boolean;
  saving?: boolean;
  disabled?: boolean;
  onClick: () => void;
  doneLabel?: string;
  undoLabel?: string;
}) {
  return (
    <button
      type="button"
      disabled={saving || disabled}
      onClick={onClick}
      className={cn(
        done ? dashboardGhostButtonClass : dashboardControlClass,
        "h-8 shrink-0 px-3 text-xs font-semibold",
        done && "border-[#86d4a8] bg-[#e8f5ee] text-[#0d5c2e]"
      )}
    >
      {done ? undoLabel : doneLabel}
    </button>
  );
}

export function departmentStatusPill(
  label: string,
  tone: "neutral" | "warning" | "progress" | "success"
) {
  const tones = {
    neutral: "bg-[#f6f6f7] text-[#616161]",
    warning: "bg-[#fff8eb] text-[#8a6116]",
    progress: "bg-[#f0f5ff] text-[#2c6ecb]",
    success: "bg-[#e8f5ee] text-[#0d5c2e]",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold",
        tones[tone]
      )}
    >
      {label}
    </span>
  );
}

export function DepartmentCardTitle({ children }: { children: ReactNode }) {
  return <p className={dashboardTaskTitleClass}>{children}</p>;
}

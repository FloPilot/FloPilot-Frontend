"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { DepartmentsShell } from "@/components/departments/departments-shell";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import {
  DEPARTMENT_DEFINITIONS,
  type DepartmentSlug,
} from "@/lib/departments";
import { departmentQueueCounts } from "@/lib/department-queues";
import {
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardKpiTitleClass,
  dashboardTaskDetailClass,
  dashboardValueClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export function DepartmentsOverview() {
  const { settings } = useShopSettings();
  const { orders, scheduleBlocks, productionBoardTasks } = useSchedule();

  const counts = useMemo(
    () =>
      departmentQueueCounts({
        orders,
        scheduleBlocks,
        productionBoardTasks,
      }),
    [orders, scheduleBlocks, productionBoardTasks]
  );

  const visibleDepartments = DEPARTMENT_DEFINITIONS.filter(
    (dept) =>
      !dept.moduleKey || settings.modules[dept.moduleKey] !== false
  );

  const totalOpen = visibleDepartments.reduce(
    (sum, dept) => sum + counts[dept.slug],
    0
  );

  return (
    <DepartmentsShell
      title="Department overview"
      description="Each department has its own queue — artwork proofs, screen burning, ink prep, finishing, and receiving. Open a tab to work through what's waiting."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibleDepartments.map((dept) => {
          const Icon = dept.icon;
          const count = counts[dept.slug];
          const clear = count === 0;

          return (
            <Link
              key={dept.slug}
              href={dept.href}
              className={cn(
                dashboardInsetSurfaceClass,
                "group flex flex-col gap-3 rounded-xl border p-4 transition-[border-color,box-shadow]",
                clear
                  ? "border-[#e3e3e3] hover:border-[#c9cccf]"
                  : "border-[#c4d7f2] bg-[#fafcff] hover:border-[#2c6ecb]/40 hover:shadow-sm"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl",
                    clear ? "bg-[#f1f1f1]" : "bg-[#e8f0fb]"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4.5",
                      clear ? "text-[#616161]" : "text-[#2c6ecb]"
                    )}
                    strokeWidth={1.75}
                  />
                </div>
                {clear ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f5ee] px-2 py-0.5 text-[11px] font-semibold text-[#0d5c2e]">
                    <CheckCircle2 className="size-3" />
                    Clear
                  </span>
                ) : (
                  <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded-full bg-[#2c6ecb] px-2 py-0.5 text-[12px] font-bold tabular-nums text-white">
                    {count}
                  </span>
                )}
              </div>
              <div>
                <p className={dashboardKpiTitleClass}>{dept.label}</p>
                <p className={cn("mt-1", dashboardTaskDetailClass)}>
                  {dept.description}
                </p>
              </div>
              <span
                className={cn(
                  dashboardControlClass,
                  "mt-auto h-8 w-fit gap-1.5 text-xs font-semibold group-hover:border-[#c9cccf]"
                )}
              >
                Open queue
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>

      <p className={cn("mt-4 text-center sm:text-left", dashboardTaskDetailClass)}>
        {totalOpen === 0
          ? "All department queues are clear — nice work."
          : `${totalOpen} open item${totalOpen !== 1 ? "s" : ""} across departments.`}
      </p>
    </DepartmentsShell>
  );
}

export function departmentOverviewCount(
  slug: DepartmentSlug,
  counts: ReturnType<typeof departmentQueueCounts>
): number {
  return counts[slug];
}

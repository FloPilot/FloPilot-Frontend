"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  DEPARTMENT_DEFINITIONS,
  DEPARTMENTS_BASE,
  type DepartmentSlug,
} from "@/lib/departments";
import { departmentQueueCounts } from "@/lib/department-queues";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export function DepartmentsShell({
  activeSlug,
  title,
  description,
  children,
}: {
  activeSlug?: DepartmentSlug | null;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { settings } = useShopSettings();
  const { orders, scheduleBlocks, productionBoardTasks, machines, jobRuns } =
    useSchedule();

  const counts = departmentQueueCounts({
    orders,
    scheduleBlocks,
    productionBoardTasks,
    machines,
    jobRuns,
  });

  const visibleDepartments = DEPARTMENT_DEFINITIONS.filter(
    (dept) =>
      !dept.moduleKey || settings.modules[dept.moduleKey] !== false
  );

  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
      <div>
        <h1 className={dashboardSectionTitleClass}>Departments</h1>
        <p className={cn("mt-1 max-w-3xl", dashboardTaskDetailClass)}>
          {description}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={DEPARTMENTS_BASE}
          className={cn(
            dashboardControlClass,
            "h-8 px-3 text-xs font-semibold",
            pathname === DEPARTMENTS_BASE
              ? "border-[#2c6ecb] bg-[#f0f5ff] text-[#2c6ecb]"
              : "text-[#303030]"
          )}
        >
          Overview
        </Link>
        {visibleDepartments.map((dept) => {
          const active =
            activeSlug === dept.slug ||
            pathname === dept.href ||
            pathname.startsWith(`${dept.href}/`);
          const count = counts[dept.slug];
          const Icon = dept.icon;

          return (
            <Link
              key={dept.slug}
              href={dept.href}
              className={cn(
                dashboardControlClass,
                "h-8 gap-1.5 px-3 text-xs font-semibold",
                active
                  ? "border-[#2c6ecb] bg-[#f0f5ff] text-[#2c6ecb]"
                  : "text-[#303030]"
              )}
            >
              <Icon className="size-3.5" strokeWidth={1.75} />
              {dept.shortLabel}
              {count > 0 ? (
                <span
                  className={cn(
                    "ml-0.5 inline-flex min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums",
                    active
                      ? "bg-[#2c6ecb] text-white"
                      : "bg-[#e3e3e3] text-[#303030]"
                  )}
                >
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      <section className={cn(dashboardCardClass, "overflow-hidden")}>
        <div className="border-b border-[#ebebeb] px-4 py-3 sm:px-5">
          <h2 className="text-[15px] font-semibold text-[#303030]">{title}</h2>
        </div>
        <div className="p-3 sm:p-4">{children}</div>
      </section>
    </main>
  );
}

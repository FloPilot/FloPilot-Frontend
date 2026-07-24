"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  DOCUMENT_DEFINITIONS,
  DOCUMENTS_BASE,
  type DocumentSlug,
} from "@/lib/order-documents";
import { documentQueueCounts } from "@/lib/document-queues";
import { useSchedule } from "@/components/providers/schedule-provider";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export function DocumentsShell({
  activeSlug,
  title,
  description,
  children,
  toolbar,
}: {
  activeSlug?: DocumentSlug | "overview" | null;
  title: string;
  description: string;
  children: ReactNode;
  toolbar?: ReactNode;
}) {
  const pathname = usePathname();
  const { orders } = useSchedule();

  const counts = useMemo(() => documentQueueCounts(orders), [orders]);

  return (
    <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
      <div>
        <h1 className={dashboardSectionTitleClass}>Documents</h1>
        <p className={cn("mt-1 max-w-3xl", dashboardTaskDetailClass)}>
          {description}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {DOCUMENT_DEFINITIONS.map((doc) => {
            const active =
              activeSlug === doc.slug ||
              pathname === doc.href ||
              (doc.slug !== "overview" &&
                pathname.startsWith(`${doc.href}/`));
            const Icon = doc.icon;
            const count =
              doc.slug === "overview"
                ? counts.overview
                : doc.slug === "estimates"
                  ? counts.estimates
                  : counts.invoices;

            return (
              <Link
                key={doc.slug}
                href={doc.href}
                className={cn(
                  dashboardControlClass,
                  "h-8 gap-1.5 px-3 text-xs font-semibold",
                  active
                    ? "border-[#2c6ecb] bg-[#f0f5ff] text-[#2c6ecb]"
                    : "text-[#303030]"
                )}
              >
                <Icon className="size-3.5" strokeWidth={1.75} />
                {doc.shortLabel}
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
        {toolbar}
      </div>

      <section className={cn(dashboardCardClass, "!overflow-visible")}>
        <div className="rounded-t-[inherit] border-b border-[#ebebeb] px-4 py-3 sm:px-5">
          <h2 className="text-[15px] font-semibold text-[#303030]">{title}</h2>
        </div>
        <div className="overflow-visible p-3 sm:p-4">{children}</div>
      </section>
    </main>
  );
}

export function DocumentsEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-4 py-14 text-center sm:px-6">
      <p className="text-sm font-semibold text-[#303030]">{title}</p>
      <p className={cn("mx-auto mt-1 max-w-sm", dashboardTaskDetailClass)}>
        {description}
      </p>
      <Link
        href="/app/orders"
        className={cn(
          dashboardControlClass,
          "mt-4 inline-flex h-8 px-3 text-xs font-semibold"
        )}
      >
        Browse orders
      </Link>
    </div>
  );
}

export { DOCUMENTS_BASE };

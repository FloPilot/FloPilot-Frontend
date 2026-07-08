"use client";

import { useMemo, useState } from "react";
import { Scissors } from "lucide-react";
import { ProductionListView } from "@/components/production/production-list-view";
import { ProductionEventSheet } from "@/components/tasks/production-event-sheet";
import {
  DepartmentEmptyState,
} from "@/components/departments/department-shared";
import { DepartmentsShell } from "@/components/departments/departments-shell";
import { useSchedule } from "@/components/providers/schedule-provider";
import { collectFinishingDepartmentTasks } from "@/lib/department-queues";
import {
  countTasksByStatus,
  filterProductionTasksByStatus,
  PRODUCTION_STATUS_KPI,
} from "@/lib/production-board";
import { dashboardControlClass } from "@/lib/dashboard-styles";
import type { TaskStatus } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: Array<TaskStatus | "all"> = [
  "all",
  "pending",
  "in_progress",
  "blocked",
];

export function FinishingDepartmentPanel() {
  const { productionBoardTasks } = useSchedule();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [selectedEvent, setSelectedEvent] = useState<{
    orderId: string;
    jobId: string;
    imprintId: string;
  } | null>(null);

  const departmentTasks = useMemo(
    () => collectFinishingDepartmentTasks(productionBoardTasks),
    [productionBoardTasks]
  );

  const openTasks = useMemo(
    () => departmentTasks.filter((task) => task.status !== "done"),
    [departmentTasks]
  );

  const filtered = useMemo(
    () => filterProductionTasksByStatus(departmentTasks, statusFilter),
    [departmentTasks, statusFilter]
  );

  const listTasks = useMemo(
    () => filtered.filter((task) => task.status !== "done"),
    [filtered]
  );

  const counts = useMemo(
    () => countTasksByStatus(departmentTasks),
    [departmentTasks]
  );

  return (
    <DepartmentsShell
      activeSlug="finishing"
      title="Finishing queue"
      description="QC, packing, and finishing steps — the same production events filtered to finishing work."
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={cn(
              dashboardControlClass,
              "h-8 px-3 text-xs font-semibold",
              statusFilter === status
                ? "border-[#2c6ecb] bg-[#f0f5ff] text-[#2c6ecb]"
                : "text-[#303030]"
            )}
          >
            {status === "all"
              ? `Open (${openTasks.length})`
              : `${PRODUCTION_STATUS_KPI[status].label} (${counts[status]})`}
          </button>
        ))}
      </div>

      {listTasks.length === 0 ? (
        <DepartmentEmptyState
          icon={Scissors}
          title="Finishing is caught up"
          description="Finishing and QC events show here when orders need packing or final checks."
        />
      ) : (
        <ProductionListView
          tasks={listTasks}
          onOpenEvent={setSelectedEvent}
        />
      )}

      <ProductionEventSheet
        open={selectedEvent !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null);
        }}
        orderId={selectedEvent?.orderId ?? null}
        jobId={selectedEvent?.jobId ?? null}
        imprintId={selectedEvent?.imprintId ?? null}
        onSchedule={() => {}}
      />
    </DepartmentsShell>
  );
}

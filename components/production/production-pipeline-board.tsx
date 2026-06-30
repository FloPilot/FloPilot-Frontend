"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ProductionTaskCard } from "@/components/production/production-task-card";
import { useSchedule } from "@/components/providers/schedule-provider";
import { dashboardTaskDetailClass } from "@/lib/dashboard-styles";
import {
  PRODUCTION_PIPELINE_COLUMNS,
  parseProductionColumnDropId,
  productionColumnDropId,
} from "@/lib/production-board";
import type { Task, TaskStatus } from "@/types";
import { cn } from "@/lib/utils";

function PipelineColumn({
  status,
  label,
  hint,
  headerClass,
  bodyClass,
  dotClass,
  countClass,
  tasks,
  onOpenEvent,
}: {
  status: TaskStatus;
  label: string;
  hint: string;
  headerClass: string;
  bodyClass: string;
  dotClass: string;
  countClass: string;
  tasks: Task[];
  onOpenEvent?: (event: {
    orderId: string;
    jobId: string;
    imprintId: string;
  }) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: productionColumnDropId(status),
    data: { status },
  });

  return (
    <section className="flex min-h-0 min-w-0 flex-col">
      <header className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("size-2 shrink-0 rounded-full", dotClass)} />
            <h3 className={cn("text-[13px] font-semibold truncate", headerClass)}>
              {label}
            </h3>
          </div>
          <p className={cn("mt-0.5 truncate", dashboardTaskDetailClass)}>
            {hint}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-sm border px-2 py-0.5 text-xs font-semibold tabular-nums",
            countClass
          )}
        >
          {tasks.length}
        </span>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[min(480px,calc(100vh-22rem))] flex-1 flex-col gap-2.5 rounded-lg border-2 p-2.5 transition-colors",
          bodyClass,
          isOver && "ring-2 ring-[#2c6ecb]/30"
        )}
      >
        {tasks.map((task) => (
          <ProductionTaskCard
            key={task.id}
            task={task}
            onOpen={
              task.productionEvent
                ? () =>
                    onOpenEvent?.({
                      orderId: task.orderId,
                      jobId: task.productionEvent!.jobId,
                      imprintId: task.productionEvent!.imprintId,
                    })
                : undefined
            }
          />
        ))}
        {tasks.length === 0 ? (
          <div
            className={cn(
              "flex flex-1 items-center justify-center rounded-lg border border-dashed border-[#e3e3e3] bg-white px-4 py-10 text-center",
              isOver && "border-[#c5d9f8] bg-[#f0f5ff]"
            )}
          >
            <p className={dashboardTaskDetailClass}>
              {isOver ? "Drop to move here" : "No events in this column"}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function ProductionPipelineBoard({
  tasks,
  onOpenEvent,
}: {
  tasks: Task[];
  onOpenEvent?: (event: {
    orderId: string;
    jobId: string;
    imprintId: string;
  }) => void;
}) {
  const { updateProductionTaskStatus } = useSchedule();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      pending: [],
      in_progress: [],
      blocked: [],
      done: [],
    };
    for (const task of tasks) {
      grouped[task.status].push(task);
    }
    return grouped;
  }, [tasks]);

  const activeTask = activeTaskId
    ? tasks.find((task) => task.id === activeTaskId)
    : undefined;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTaskId(null);
    const { active, over } = event;
    if (!over) return;

    const nextStatus = parseProductionColumnDropId(over.id);
    if (!nextStatus) return;

    const task = tasks.find((entry) => entry.id === active.id);
    if (!task || task.status === nextStatus) return;

    updateProductionTaskStatus(task.id, nextStatus);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTaskId(null)}
    >
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {PRODUCTION_PIPELINE_COLUMNS.map((column) => (
          <PipelineColumn
            key={column.status}
            {...column}
            tasks={tasksByStatus[column.status]}
            onOpenEvent={onOpenEvent}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
        {activeTask ? (
          <div className="w-[min(100vw-2rem,340px)]">
            <ProductionTaskCard task={activeTask} isOverlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

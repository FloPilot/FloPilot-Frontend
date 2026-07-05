import type {
  ProductionEventWorkflow,
  ScheduleBlock,
  StationJobRun,
} from "@/types";
import type { ScheduleBlockProductionStatus } from "@/lib/schedule-block-display";

export async function applyCalendarEventProductionStatus({
  block,
  status,
  getJobRun,
  updateProductionEventWorkflow,
  startJobRun,
  resumeJobRun,
  finishJobRun,
}: {
  block: ScheduleBlock;
  status: ScheduleBlockProductionStatus;
  getJobRun: (scheduleBlockId: string) => StationJobRun | undefined;
  updateProductionEventWorkflow: (
    orderId: string,
    jobId: string,
    imprintId: string,
    workflow: ProductionEventWorkflow
  ) => Promise<void>;
  startJobRun: (runId: string) => Promise<void>;
  resumeJobRun: (runId: string) => Promise<void>;
  finishJobRun: (runId: string) => Promise<void>;
}) {
  const { orderId, jobId, imprintId } = block;

  if (status === "scheduled") {
    await updateProductionEventWorkflow(orderId, jobId, imprintId, {
      status: "needs_attention",
    });
    return;
  }

  if (status === "in_progress") {
    await updateProductionEventWorkflow(orderId, jobId, imprintId, {
      status: "in_progress",
    });
    const run = getJobRun(block.id);
    if (!run) return;
    if (run.status === "upcoming") {
      await startJobRun(run.id);
    } else if (run.status === "paused") {
      await resumeJobRun(run.id);
    }
    return;
  }

  await updateProductionEventWorkflow(orderId, jobId, imprintId, {
    status: "completed",
  });
  const run = getJobRun(block.id);
  if (run && run.status !== "finished" && run.status !== "cancelled") {
    await finishJobRun(run.id);
  }
}

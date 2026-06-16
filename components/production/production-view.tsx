"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, LayoutGrid, List } from "lucide-react";
import { ProductionListView } from "@/components/production/production-list-view";
import { ProductionPipelineBoard } from "@/components/production/production-pipeline-board";
import { StaffHeader } from "@/components/layout/staff-header";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PRODUCTION_DEPARTMENTS,
  countTasksByStatus,
  filterProductionTasksByDepartment,
} from "@/lib/production-board";
import { cn } from "@/lib/utils";

export function ProductionView() {
  const { productionTasks } = useSchedule();
  const [department, setDepartment] = useState<string>("All");

  const filteredTasks = useMemo(
    () => filterProductionTasksByDepartment(productionTasks, department),
    [productionTasks, department]
  );

  const statusCounts = useMemo(
    () => countTasksByStatus(filteredTasks),
    [filteredTasks]
  );

  const activeCount =
    statusCounts.pending + statusCounts.in_progress + statusCounts.blocked;

  return (
    <>
      <StaffHeader
        title="Production pipeline"
        description="Drag tasks across the board as work moves on the floor"
        action={
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            nativeButton={false}
            render={<Link href="/app/calendar" />}
          >
            <Calendar className="size-3.5" />
            Shop calendar
          </Button>
        }
      />

      <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryTile
            label="Active work"
            value={activeCount}
            hint="Queued, in progress, or blocked"
          />
          <SummaryTile
            label="In progress"
            value={statusCounts.in_progress}
            hint="Running on the floor now"
            accent="text-brand-primary"
          />
          <SummaryTile
            label="Blocked"
            value={statusCounts.blocked}
            hint="Needs attention before continuing"
            accent="text-amber-800"
          />
          <SummaryTile
            label="Done"
            value={statusCounts.done}
            hint="Completed in this view"
            accent="text-emerald-700"
          />
        </section>

        <div className="flex flex-wrap gap-2">
          {PRODUCTION_DEPARTMENTS.map((dept) => (
            <Button
              key={dept}
              type="button"
              variant={department === dept ? "default" : "outline"}
              size="sm"
              className={cn(
                "rounded-full",
                department !== dept && "bg-white border-border/70"
              )}
              onClick={() => setDepartment(dept)}
            >
              {dept}
            </Button>
          ))}
        </div>

        <Tabs defaultValue="pipeline">
          <TabsList className="h-auto flex-wrap gap-1">
            <TabsTrigger value="pipeline" className="gap-1.5">
              <LayoutGrid className="size-3.5" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5">
              <List className="size-3.5" />
              List
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="mt-4 space-y-3">
            <p className="text-xs text-brand-muted">
              Drag a card between columns to update its status. Changes save
              immediately.
            </p>
            <div className="rounded-2xl border border-border/50 bg-brand-surface/30 p-3 sm:p-4">
              <ProductionPipelineBoard tasks={filteredTasks} />
            </div>
          </TabsContent>

          <TabsContent value="list" className="mt-5">
            <ProductionListView tasks={filteredTasks} />
          </TabsContent>
        </Tabs>

        <section className="rounded-2xl border border-brand-primary/15 bg-brand-primary/[0.04] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-medium text-brand-ink">Need to reschedule a run?</p>
            <p className="text-sm text-brand-muted mt-1 max-w-xl">
              Machine timelines and drag-and-drop scheduling live in the shop
              calendar — same board your floor stations use.
            </p>
          </div>
          <Button
            className="rounded-full shrink-0"
            nativeButton={false}
            render={<Link href="/app/calendar" />}
          >
            Open calendar
            <ArrowRight className="size-4" />
          </Button>
        </section>
      </main>
    </>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
        {label}
      </p>
      <p className={cn("mt-1 text-3xl font-semibold tabular-nums", accent)}>
        {value}
      </p>
      <p className="mt-1 text-xs text-brand-muted">{hint}</p>
    </div>
  );
}

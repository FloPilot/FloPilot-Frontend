"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Calendar, ChevronLeft, Plus } from "lucide-react";
import { MachineSettingsCard } from "@/components/machines/machine-settings-card";
import { ResourceFormDialog } from "@/components/machines/resource-form-dialog";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import {
  dashboardControlClass,
  dashboardElevatedShadow,
  dashboardKpiTitleClass,
  dashboardPrimaryButtonClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
  dashboardValueClass,
} from "@/lib/dashboard-styles";
import type { Machine } from "@/types";
import { cn } from "@/lib/utils";

type MachineFilter = "all" | "active" | "inactive";

export function MachinesSettingsView() {
  const { machines, scheduleBlocks, addMachine, updateMachine, deleteMachine } =
    useSchedule();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Machine | undefined>();
  const [filter, setFilter] = useState<MachineFilter>("all");

  // Deep link: /app/machines/settings?edit={machineId} opens that machine's
  // edit form directly (e.g. coming from a station's Settings button).
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const handledEditRef = useRef(false);

  useEffect(() => {
    if (handledEditRef.current || !editId || machines.length === 0) return;
    const target = machines.find((m) => m.id === editId);
    if (target) {
      setEditing(target);
      setDialogOpen(true);
      handledEditRef.current = true;
    }
  }, [editId, machines]);

  const counts = useMemo(
    () => ({
      all: machines.length,
      active: machines.filter((m) => m.active).length,
      inactive: machines.filter((m) => !m.active).length,
    }),
    [machines]
  );

  const filtered = useMemo(
    () =>
      machines.filter((m) => {
        if (filter === "active") return m.active;
        if (filter === "inactive") return !m.active;
        return true;
      }),
    [machines, filter]
  );

  const scheduledCount = (machineId: string) =>
    scheduleBlocks.filter((b) => b.machineId === machineId).length;

  const openCreate = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };

  const openEdit = (machine: Machine) => {
    setEditing(machine);
    setDialogOpen(true);
  };

  return (
    <>
      <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-3">
          <Link
            href="/app/machines"
            className="inline-flex w-fit items-center gap-1 text-[13px] font-medium text-[#616161] transition-colors hover:text-[#303030]"
          >
            <ChevronLeft className="size-3.5" />
            All machines
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className={dashboardSectionTitleClass}>Machine settings</h1>
              <p className={cn("mt-1 max-w-2xl", dashboardTaskDetailClass)}>
                Add presses, set operating hours, and manage calendar colors.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                className={cn(dashboardControlClass, "hidden h-9 sm:inline-flex")}
                nativeButton={false}
                render={<Link href="/app/calendar" />}
              >
                <Calendar className="size-3.5" />
                View calendar
              </Button>
              <Button
                className={cn(dashboardPrimaryButtonClass, "h-9")}
                onClick={openCreate}
              >
                <Plus className="size-3.5" />
                New machine
              </Button>
            </div>
          </div>
        </div>

        <section className="grid gap-3 sm:grid-cols-3">
          <SummaryTile
            label="All machines"
            value={counts.all}
            hint="Presses and workstations"
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <SummaryTile
            label="Active"
            value={counts.active}
            hint="Available for scheduling"
            accent="text-emerald-700"
            active={filter === "active"}
            onClick={() => setFilter("active")}
          />
          <SummaryTile
            label="Inactive"
            value={counts.inactive}
            hint="Offline or out of service"
            accent="text-[#616161]"
            active={filter === "inactive"}
            onClick={() => setFilter("inactive")}
          />
        </section>

        <p className="text-sm text-[#616161]">
          Machines here appear on{" "}
          <Link href="/app/machines" className="text-[#2c6ecb] hover:underline">
            stations
          </Link>{" "}
          and the{" "}
          <Link href="/app/calendar" className="text-[#2c6ecb] hover:underline">
            production calendar
          </Link>
          . Mark inactive when a press is down so new events aren&apos;t assigned.
        </p>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#e3e3e3] px-6 py-16 text-center">
            <p className="text-sm text-[#616161]">
              No machines match this filter.
            </p>
            {filter !== "all" && (
              <Button
                type="button"
                variant="link"
                className="mt-2"
                onClick={() => setFilter("all")}
              >
                Show all machines
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((machine) => (
              <MachineSettingsCard
                key={machine.id}
                machine={machine}
                scheduledCount={scheduledCount(machine.id)}
                onEdit={() => openEdit(machine)}
                onDelete={() => {
                  if (
                    confirm(
                      `Delete "${machine.name}"? Scheduled events on this machine will also be removed.`
                    )
                  ) {
                    deleteMachine(machine.id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </main>

      <ResourceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={editing ? "edit" : "create"}
        initial={editing}
        onSave={(values) => {
          const payload = {
            name: values.name.trim(),
            type: values.type,
            color: values.color,
            capacityPerHour: values.capacityPerHour,
            active: values.active,
            operatingHours: values.operatingHours,
            notes: values.notes.trim() || undefined,
          };
          if (editing) {
            updateMachine(editing.id, { ...editing, ...payload });
          } else {
            addMachine(payload);
          }
        }}
      />
    </>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  accent,
  active,
  onClick,
}: {
  label: string;
  value: number;
  hint: string;
  accent?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex min-h-[112px] flex-col rounded-lg border bg-white p-4 text-left transition-[border-color,box-shadow] hover:border-[#c9cccf]",
        dashboardElevatedShadow,
        active ? "border-[#2c6ecb] ring-2 ring-[#2c6ecb]/30" : "border-[#e3e3e3]"
      )}
    >
      <p className={dashboardKpiTitleClass}>{label}</p>
      <p className={cn(dashboardValueClass, "mt-2.5", accent)}>{value}</p>
      <p className="mt-1.5 text-xs leading-snug text-[#616161]">{hint}</p>
    </button>
  );
}

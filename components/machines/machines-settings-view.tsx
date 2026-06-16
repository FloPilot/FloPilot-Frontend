"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, Plus } from "lucide-react";
import { MachineSettingsCard } from "@/components/machines/machine-settings-card";
import { ResourceFormDialog } from "@/components/machines/resource-form-dialog";
import { StaffHeader } from "@/components/layout/staff-header";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import type { Machine } from "@/types";
import { cn } from "@/lib/utils";

type MachineFilter = "all" | "active" | "inactive";

export function MachinesSettingsView() {
  const { machines, scheduleBlocks, addMachine, updateMachine, deleteMachine } =
    useSchedule();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Machine | undefined>();
  const [filter, setFilter] = useState<MachineFilter>("all");

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
      <StaffHeader
        title="Machine settings"
        description="Add presses, set operating hours, and manage calendar colors"
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full bg-white hidden sm:flex"
              nativeButton={false}
              render={<Link href="/app/calendar" />}
            >
              <Calendar className="size-4" />
              View calendar
            </Button>
            <Button className="rounded-full" size="sm" onClick={openCreate}>
              <Plus className="size-4" />
              New machine
            </Button>
          </div>
        }
      />

      <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
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
            accent="text-brand-muted"
            active={filter === "inactive"}
            onClick={() => setFilter("inactive")}
          />
        </section>

        <p className="text-sm text-brand-muted">
          Machines here appear on{" "}
          <Link href="/app/machines" className="text-brand-primary hover:underline">
            stations
          </Link>{" "}
          and the{" "}
          <Link href="/app/calendar" className="text-brand-primary hover:underline">
            production calendar
          </Link>
          . Mark inactive when a press is down so new events aren&apos;t assigned.
        </p>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 px-6 py-16 text-center">
            <p className="text-sm text-brand-muted">
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
        "rounded-2xl border px-4 py-4 text-left shadow-sm transition-colors",
        active
          ? "border-brand-primary/30 bg-brand-primary/[0.05] ring-1 ring-brand-primary/15"
          : "border-border/60 bg-white hover:border-brand-primary/20"
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
        {label}
      </p>
      <p className={cn("mt-1 text-3xl font-semibold tabular-nums", accent)}>
        {value}
      </p>
      <p className="mt-1 text-xs text-brand-muted">{hint}</p>
    </button>
  );
}

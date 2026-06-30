"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { ResourceFormDialog } from "@/components/machines/resource-form-dialog";
import { useSchedule } from "@/components/providers/schedule-provider";
import {
  SettingsHeader,
  SettingsMain,
  SettingsPanel,
} from "@/components/settings/settings-kit";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStaffAccess } from "@/hooks/use-staff-access";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { formatOperatingHoursSummary } from "@/lib/machine-hours";
import { machineColorStyles, RESOURCE_TYPE_LABELS } from "@/lib/machine-styles";
import type { Machine } from "@/types";
import { cn } from "@/lib/utils";

type MachineFilter = "all" | "active" | "inactive";

function MachineStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[11px] font-medium",
        active
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-600"
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-colors",
        active
          ? "border-[#2c6ecb]/30 bg-[#f4f7fd] text-[#303030]"
          : "border-transparent text-[#616161] hover:bg-[#f6f6f7] hover:text-[#303030]"
      )}
    >
      {children}
    </button>
  );
}

export function ShopMachinesSection() {
  const { machines, scheduleBlocks, addMachine, updateMachine, deleteMachine } =
    useSchedule();
  const { canWrite } = useStaffAccess();
  const canManage = canWrite("machines");

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
      <SettingsMain>
        <SettingsHeader
          title="Machines & stations"
          description="Manage presses, dryers, and workstations used on the production calendar and floor."
        >
          {canManage && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className={dashboardControlClass}
                nativeButton={false}
                render={<Link href="/app/calendar" />}
              >
                <Calendar className="size-3.5" />
                View calendar
              </Button>
              <Button
                className={dashboardPrimaryButtonClass}
                onClick={openCreate}
              >
                <Plus className="size-3.5" />
                New machine
              </Button>
            </div>
          )}
        </SettingsHeader>

        {!canManage && (
          <p className="rounded-xl border border-border/60 bg-slate-50/40 px-4 py-3 text-sm text-brand-muted">
            You can view machines here. Contact an admin to add or edit floor
            stations.
          </p>
        )}

        <SettingsPanel
          title="Floor stations"
          description="Click a row to edit. Machines appear on the calendar and station screens."
          bodyClassName="p-0"
        >
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[#ebebeb] px-4 py-2.5 sm:px-5">
            {(
              [
                ["all", "All", counts.all],
                ["active", "Active", counts.active],
                ["inactive", "Inactive", counts.inactive],
              ] as const
            ).map(([value, label, count]) => (
              <FilterChip
                key={value}
                active={filter === value}
                onClick={() => setFilter(value)}
              >
                {label} ({count})
              </FilterChip>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="px-4 py-14 text-center sm:px-5">
              <p className="text-sm font-medium text-brand-ink">No machines yet</p>
              <p className={cn("mt-1", dashboardTaskDetailClass)}>
                Add your first press or workstation to start scheduling jobs.
              </p>
              {canManage && (
                <Button
                  className={cn(dashboardPrimaryButtonClass, "mt-4")}
                  onClick={openCreate}
                >
                  <Plus className="size-3.5" />
                  New machine
                </Button>
              )}
            </div>
          ) : (
            <div className="-mx-px overflow-x-auto">
              <Table className="min-w-[920px]">
                <TableHeader>
                  <TableRow className="border-[#ebebeb] hover:bg-transparent">
                    <TableHead className="h-9 bg-[#fafafa] pl-4 text-[12px] font-medium text-[#616161] sm:pl-5">
                      Name
                    </TableHead>
                    <TableHead className="h-9 bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                      Type
                    </TableHead>
                    <TableHead className="h-9 bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                      Color
                    </TableHead>
                    <TableHead className="h-9 bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                      Capacity
                    </TableHead>
                    <TableHead className="h-9 bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                      Hours
                    </TableHead>
                    <TableHead className="h-9 bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                      Scheduled
                    </TableHead>
                    <TableHead className="h-9 bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                      Status
                    </TableHead>
                    {canManage && (
                      <TableHead className="h-9 w-12 bg-[#fafafa] pr-4 text-[12px] font-medium text-[#616161] sm:pr-5" />
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((machine) => {
                    const colorStyle = machineColorStyles[machine.color];
                    return (
                      <TableRow
                        key={machine.id}
                        className={cn(
                          "border-[#ebebeb] transition-colors",
                          canManage && "cursor-pointer hover:bg-[#fafafa]"
                        )}
                        onClick={() => canManage && openEdit(machine)}
                      >
                        <TableCell className="pl-4 sm:pl-5">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={cn(
                                "size-2.5 shrink-0 rounded-full",
                                colorStyle.dot
                              )}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-medium text-[#303030]">
                                {machine.name}
                              </p>
                              {machine.notes && (
                                <p className="truncate text-[11px] text-[#8a8a8a]">
                                  {machine.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-[13px] text-[#303030]">
                          {RESOURCE_TYPE_LABELS[machine.type]}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize",
                              colorStyle.bg,
                              colorStyle.border,
                              colorStyle.text
                            )}
                          >
                            {machine.color}
                          </span>
                        </TableCell>
                        <TableCell className="text-[13px] text-[#303030]">
                          {machine.capacityPerHour > 0
                            ? `${machine.capacityPerHour}/hr`
                            : "—"}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-[12px] text-[#616161]">
                          {formatOperatingHoursSummary(machine)}
                        </TableCell>
                        <TableCell className="text-[13px] text-[#303030]">
                          {scheduledCount(machine.id)}
                        </TableCell>
                        <TableCell>
                          <MachineStatusBadge active={machine.active} />
                        </TableCell>
                        {canManage && (
                          <TableCell
                            className="pr-4 sm:pr-5"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger className="inline-flex size-8 items-center justify-center rounded-md text-[#616161] hover:bg-[#f1f1f1] hover:text-[#303030]">
                                <MoreHorizontal className="size-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEdit(machine)}>
                                  <Pencil className="size-3.5" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `Delete ${machine.name}? Scheduled jobs on this machine will also be removed.`
                                      )
                                    ) {
                                      void deleteMachine(machine.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="size-3.5" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </SettingsPanel>

        <section className={cn(dashboardCardClass, "px-5 py-4")}>
          <p className="text-[13px] text-[#616161]">
            Need to run jobs on the floor? Open{" "}
            <Link
              href="/app/machines"
              className="font-medium text-brand-primary hover:underline"
            >
              Stations
            </Link>{" "}
            for live run tracking, or{" "}
            <Link
              href="/app/calendar"
              className="font-medium text-brand-primary hover:underline"
            >
              Calendar
            </Link>{" "}
            to schedule work.
          </p>
        </section>
      </SettingsMain>

      {canManage && (
        <ResourceFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mode={editing ? "edit" : "create"}
          initial={editing}
          onSave={(values) => {
            if (editing) {
              void updateMachine(editing.id, values);
            } else {
              void addMachine(values);
            }
          }}
        />
      )}
    </>
  );
}

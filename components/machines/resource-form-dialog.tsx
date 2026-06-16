"use client";

import { useEffect, useState } from "react";
import type { Machine, ResourceType, MachineCalendarColor } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_OPERATING_HOURS,
  WEEKDAY_LABELS,
} from "@/lib/machine-hours";
import {
  MACHINE_COLOR_OPTIONS,
  RESOURCE_TYPE_LABELS,
} from "@/lib/machine-styles";
import type { MachineOperatingHours } from "@/types";
import { cn } from "@/lib/utils";

export type ResourceFormValues = {
  name: string;
  type: ResourceType;
  color: MachineCalendarColor;
  capacityPerHour: number;
  active: boolean;
  operatingHours: MachineOperatingHours;
  notes: string;
};

const emptyForm: ResourceFormValues = {
  name: "",
  type: "machine",
  color: "blue",
  capacityPerHour: 0,
  active: true,
  operatingHours: { ...DEFAULT_OPERATING_HOURS },
  notes: "",
};

interface ResourceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: Machine;
  onSave: (values: ResourceFormValues) => void;
}

export function ResourceFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSave,
}: ResourceFormDialogProps) {
  const [form, setForm] = useState<ResourceFormValues>(emptyForm);

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          name: initial.name,
          type: initial.type,
          color: initial.color,
          capacityPerHour: initial.capacityPerHour,
          active: initial.active,
          operatingHours: initial.operatingHours ?? {
            ...DEFAULT_OPERATING_HOURS,
          },
          notes: initial.notes ?? "",
        });
      } else {
        setForm(emptyForm);
      }
    }
  }, [open, initial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="text-sm font-bold tracking-widest uppercase text-brand-ink">
              {mode === "create" ? "New Resource" : "Edit Resource"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 px-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="resource-name">Name</Label>
              <Input
                id="resource-name"
                placeholder="e.g. M&R Sportsman"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="h-11 rounded-xl border-2 focus-visible:border-brand-primary"
                autoFocus
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      type: (v ?? "machine") as ResourceType,
                    }))
                  }
                >
                  <SelectTrigger className="h-11 w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RESOURCE_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <Select
                  value={form.color}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      color: (v ?? "blue") as MachineCalendarColor,
                    }))
                  }
                >
                  <SelectTrigger className="h-11 w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MACHINE_COLOR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-brand-muted">
                  Shown on the production calendar
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity / hr</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={0}
                  value={form.capacityPerHour}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      capacityPerHour: Number(e.target.value) || 0,
                    }))
                  }
                  className="h-11 rounded-xl"
                />
                <p className="text-xs text-brand-muted">Pieces per hour (0 if N/A)</p>
              </div>

              <div className="space-y-2">
                <Label>Active</Label>
                <Select
                  value={form.active ? "yes" : "no"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, active: v === "yes" }))
                  }
                >
                  <SelectTrigger className="h-11 w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No — unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-brand-surface/40 p-4">
              <div>
                <Label className="text-brand-ink">Hours of operation</Label>
                <p className="text-xs text-brand-muted mt-1">
                  Events can only be scheduled during these times on the calendar
                  and station view.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="open-time">Opens</Label>
                  <Input
                    id="open-time"
                    type="time"
                    value={form.operatingHours.openTime}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        operatingHours: {
                          ...f.operatingHours,
                          openTime: e.target.value,
                        },
                      }))
                    }
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="close-time">Closes</Label>
                  <Input
                    id="close-time"
                    type="time"
                    value={form.operatingHours.closeTime}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        operatingHours: {
                          ...f.operatingHours,
                          closeTime: e.target.value,
                        },
                      }))
                    }
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Days open</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_LABELS.map((day) => {
                    const selected = form.operatingHours.daysOpen.includes(
                      day.value
                    );
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() =>
                          setForm((f) => {
                            const days = selected
                              ? f.operatingHours.daysOpen.filter(
                                  (d) => d !== day.value
                                )
                              : [...f.operatingHours.daysOpen, day.value].sort(
                                  (a, b) => a - b
                                );
                            return {
                              ...f,
                              operatingHours: {
                                ...f.operatingHours,
                                daysOpen: days,
                              },
                            };
                          })
                        }
                        className={cn(
                          "size-10 rounded-full text-xs font-semibold border transition-colors",
                          selected
                            ? "bg-brand-primary text-white border-brand-primary"
                            : "bg-white text-brand-muted border-border hover:border-brand-primary/40"
                        )}
                      >
                        {day.short}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Maintenance notes, specs, location..."
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
                className="rounded-xl resize-none"
              />
            </div>
          </div>

          <div className="flex flex-row items-center justify-end gap-3 border-t border-border bg-muted/30 px-6 py-5">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-6 h-11 bg-white"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full px-8 h-11 font-semibold uppercase tracking-wide"
            >
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

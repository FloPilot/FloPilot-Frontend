import type { MachineCalendarColor } from "@/types";

export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  machine: "Machine",
  workstation: "Workstation",
  dryer: "Dryer / Cure",
  other: "Other",
};

export const MACHINE_COLOR_OPTIONS: {
  value: MachineCalendarColor;
  label: string;
}[] = [
  { value: "amber", label: "Amber" },
  { value: "blue", label: "Blue" },
  { value: "emerald", label: "Emerald" },
  { value: "violet", label: "Violet" },
  { value: "rose", label: "Rose" },
  { value: "cyan", label: "Cyan" },
  { value: "orange", label: "Orange" },
  { value: "slate", label: "Slate" },
];

export const machineColorStyles: Record<
  MachineCalendarColor,
  {
    bg: string;
    border: string;
    text: string;
    dot: string;
    /** Solid cap on machine cards (folder-style header) */
    cap: string;
  }
> = {
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-950",
    dot: "bg-amber-400",
    cap: "bg-amber-400",
  },
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-950",
    dot: "bg-blue-500",
    cap: "bg-blue-500",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-950",
    dot: "bg-emerald-500",
    cap: "bg-emerald-500",
  },
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-950",
    dot: "bg-violet-500",
    cap: "bg-violet-500",
  },
  rose: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-950",
    dot: "bg-rose-500",
    cap: "bg-rose-500",
  },
  cyan: {
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    text: "text-cyan-950",
    dot: "bg-cyan-500",
    cap: "bg-cyan-500",
  },
  orange: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-950",
    dot: "bg-orange-500",
    cap: "bg-orange-500",
  },
  slate: {
    bg: "bg-slate-100",
    border: "border-slate-200",
    text: "text-slate-950",
    dot: "bg-slate-500",
    cap: "bg-slate-500",
  },
};

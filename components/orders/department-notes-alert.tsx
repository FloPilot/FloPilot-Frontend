"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StickyNote } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { formatDateTime } from "@/lib/format";
import { isArchivedOrder } from "@/lib/order-archive";
import {
  normalizeStaffDepartments,
  staffDepartmentLabel,
} from "@/lib/staff-departments";
import type { InternalNote, Order } from "@/types";
import { cn } from "@/lib/utils";

type AlertNote = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  note: InternalNote;
};

export function DepartmentNotesAlert() {
  const { profile } = useAuth();
  const { orders, acknowledgeInternalNotes } = useSchedule();
  const [open, setOpen] = useState(false);
  const [acking, setAcking] = useState(false);

  const userId = profile?.type === "staff" ? profile.user.id : null;
  const departments = useMemo(
    () =>
      profile?.type === "staff"
        ? normalizeStaffDepartments(profile.user.departments)
        : [],
    [profile]
  );

  const pending = useMemo(() => {
    if (!userId || departments.length === 0) return [] as AlertNote[];
    const deptSet = new Set(departments);
    const items: AlertNote[] = [];
    for (const order of orders as Order[]) {
      if (isArchivedOrder(order)) continue;
      for (const note of order.internalNotes || []) {
        if (!note.targetDepartment || !deptSet.has(note.targetDepartment)) {
          continue;
        }
        const acknowledged = Array.isArray(note.acknowledgedBy)
          ? note.acknowledgedBy
          : [];
        if (acknowledged.includes(userId)) continue;
        items.push({
          orderId: order.id,
          orderNumber: order.number || order.id,
          customerName: order.customerName || "Customer",
          note,
        });
      }
    }
    items.sort((a, b) => b.note.timestamp.localeCompare(a.note.timestamp));
    return items;
  }, [orders, userId, departments]);

  useEffect(() => {
    setOpen(pending.length > 0);
  }, [pending.length]);

  const handleAcknowledge = useCallback(async () => {
    if (!userId || pending.length === 0 || acking) return;
    setAcking(true);
    try {
      await acknowledgeInternalNotes(
        pending.map((entry) => ({
          orderId: entry.orderId,
          noteId: entry.note.id,
        }))
      );
      setOpen(false);
    } catch {
      // Keep dialog open so they can retry.
    } finally {
      setAcking(false);
    }
  }, [userId, pending, acking, acknowledgeInternalNotes]);

  if (pending.length === 0) return null;

  const departmentLabel =
    departments.length === 1
      ? staffDepartmentLabel(departments[0])
      : "your departments";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Require Got it so notes aren't skipped by Esc / overlay click.
        if (next) setOpen(true);
      }}
    >
      <DialogContent
        className={cn(
          "w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-xl border border-[#ebebeb] bg-white p-0 shadow-lg sm:max-w-md"
        )}
      >
        <DialogHeader className="space-y-0 border-b border-[#ebebeb] px-5 py-4 pr-12 text-left">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#eef4ff] text-[#2c6ecb]">
              <StickyNote className="size-4" />
            </span>
            <div className="min-w-0 space-y-1 pt-0.5">
              <DialogTitle className="text-[15px] font-semibold leading-snug text-[#303030]">
                Notes for {departmentLabel}
              </DialogTitle>
              <DialogDescription
                className={cn(
                  dashboardTaskDetailClass,
                  "text-[13px] leading-snug"
                )}
              >
                {pending.length === 1
                  ? "Someone left a note for your team. Read it before you continue."
                  : `${pending.length} notes are waiting for your team.`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[min(50vh,22rem)] space-y-2.5 overflow-y-auto px-5 py-4">
          {pending.map((entry) => (
            <div
              key={`${entry.orderId}:${entry.note.id}`}
              className="rounded-lg border border-[#dbe6ff] bg-[#f7f9ff] px-3.5 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/app/orders/${entry.orderId}`}
                  className="text-[12px] font-semibold text-[#2c6ecb] hover:underline"
                  onClick={() => setOpen(false)}
                >
                  {entry.orderNumber}
                  <span className="font-normal text-[#616161]">
                    {" "}
                    · {entry.customerName}
                  </span>
                </Link>
                <p className="text-[11px] text-[#8a8a8a]">
                  {formatDateTime(entry.note.timestamp)}
                </p>
              </div>
              {entry.note.targetDepartment ? (
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#2c6ecb]">
                  {staffDepartmentLabel(entry.note.targetDepartment)}
                </p>
              ) : null}
              <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-[#303030]">
                {entry.note.content}
              </p>
              <p className="mt-1.5 text-[11px] text-[#8a8a8a]">
                — {entry.note.author}
              </p>
            </div>
          ))}
        </div>

        <div className="flex justify-end border-t border-[#ebebeb] bg-[#fafafa] px-5 py-3.5">
          <Button
            type="button"
            className={cn(dashboardPrimaryButtonClass, "h-9 px-4")}
            disabled={acking}
            onClick={() => void handleAcknowledge()}
          >
            {acking ? "Saving…" : "Got it"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

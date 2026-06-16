"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRightLeft,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import type { Machine, ScheduleBlock } from "@/types";
import { machineColorStyles } from "@/lib/machine-styles";
import { cn } from "@/lib/utils";

export function ScheduleBlockActionsMenu({
  block,
  currentMachineId,
  machines,
  onEdit,
  onViewOrder,
  onMoveToMachine,
  onRemove,
  className,
  style,
  children,
}: {
  block: ScheduleBlock;
  currentMachineId: string;
  machines: Machine[];
  onEdit: () => void;
  onViewOrder?: () => void;
  onMoveToMachine: (machineId: string) => boolean;
  onRemove: () => void;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const otherMachines = machines.filter(
    (m) => m.active && m.id !== currentMachineId
  );

  const close = useCallback(() => {
    setOpen(false);
    setSubmenuOpen(false);
    setError(null);
  }, []);

  const openAt = (x: number, y: number) => {
    setError(null);
    setSubmenuOpen(false);
    setAnchor({ x, y });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const handleMove = (machineId: string) => {
    const ok = onMoveToMachine(machineId);
    if (ok) {
      close();
    } else {
      setError("That time isn't available on the selected machine.");
    }
  };

  return (
    <>
      <div
        className={cn("min-w-0 overflow-hidden", className)}
        style={style}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openAt(e.clientX, e.clientY);
        }}
      >
        {children}
        <button
          type="button"
          aria-label="Event actions"
          className="absolute top-0.5 right-0.5 z-30 flex size-5 items-center justify-center rounded bg-white/95 text-brand-muted shadow-sm border border-border/60 opacity-80 hover:opacity-100 sm:opacity-0 sm:group-hover/block:opacity-100 hover:text-brand-ink hover:bg-white transition-opacity"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            openAt(rect.right, rect.bottom + 4);
          }}
        >
          <MoreHorizontal className="size-3.5" />
        </button>
      </div>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[100]" onClick={close} aria-hidden />
            <div
              ref={menuRef}
              className="fixed z-[101] min-w-[200px] rounded-xl border border-border bg-white p-1.5 shadow-lg"
              style={{
                left: Math.min(anchor.x, window.innerWidth - 220),
                top: Math.min(anchor.y, window.innerHeight - 280),
              }}
              role="menu"
            >
              <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">
                {block.orderNumber}
              </p>
              <p className="px-2 pb-2 text-xs text-brand-muted truncate">
                {block.imprintLabel}
              </p>

              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-left hover:bg-muted/60"
                onClick={() => {
                  close();
                  onEdit();
                }}
              >
                <Pencil className="size-4 text-brand-muted" />
                Edit schedule…
              </button>

              {onViewOrder && (
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-left hover:bg-muted/60"
                  onClick={() => {
                    close();
                    onViewOrder();
                  }}
                >
                  <FileText className="size-4 text-brand-muted" />
                  View order…
                </button>
              )}

              {otherMachines.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-left hover:bg-muted/60"
                    onMouseEnter={() => setSubmenuOpen(true)}
                    onClick={() => setSubmenuOpen((v) => !v)}
                  >
                    <ArrowRightLeft className="size-4 text-brand-muted" />
                    Move to machine
                    <span className="ml-auto text-brand-muted">›</span>
                  </button>
                  {submenuOpen && (
                    <div className="mt-1 max-h-44 overflow-y-auto rounded-lg border border-border bg-muted/20 p-1">
                      {otherMachines.map((machine) => {
                        const styles = machineColorStyles[machine.color];
                        return (
                          <button
                            key={machine.id}
                            type="button"
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-white"
                            onClick={() => handleMove(machine.id)}
                          >
                            <span
                              className={cn(
                                "size-2.5 rounded-full shrink-0",
                                styles.dot
                              )}
                            />
                            <span className="truncate">{machine.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-left text-destructive hover:bg-destructive/10"
                onClick={() => {
                  close();
                  onRemove();
                }}
              >
                <Trash2 className="size-4" />
                Remove from schedule
              </button>

              {error && (
                <p className="px-2 pt-2 text-xs text-destructive">{error}</p>
              )}

              <p className="px-2 pt-2 text-[10px] text-brand-muted border-t border-border mt-1">
                Right-click a job for quick actions
              </p>
            </div>
          </>,
          document.body
        )}
    </>
  );
}

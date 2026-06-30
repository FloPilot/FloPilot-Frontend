"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  dashboardCardClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

/** Page-level header shown at the top of each settings section. */
export function SettingsHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className={dashboardSectionTitleClass}>{title}</h1>
        {description && (
          <p className={cn(dashboardTaskDetailClass, "mt-1 max-w-2xl")}>
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

/** Card surface with an optional header row and action slot. */
export function SettingsPanel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn(dashboardCardClass, className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ebebeb] px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className={dashboardTaskTitleClass}>{title}</h2>}
            {description && (
              <p className={cn(dashboardTaskDetailClass, "mt-0.5 max-w-xl")}>
                {description}
              </p>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={cn("px-5 py-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function SettingsMain({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      {children}
    </main>
  );
}

export function AdminLockNotice() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[#f4d98b] bg-[#fdf6e3] px-4 py-3 text-[13px] text-[#7a5b16]">
      <Lock className="mt-0.5 size-4 shrink-0" />
      <p>
        Only shop admins can change these settings. You can review what&apos;s
        configured, but saving requires an admin account.
      </p>
    </div>
  );
}

export function SettingsError({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-4 py-3 text-sm text-[#8f1f1f]">
      {message}
    </p>
  );
}

export function SaveButton({
  dirty,
  saving,
  saved,
  disabled,
  onSave,
  label = "Save changes",
}: {
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  disabled?: boolean;
  onSave: () => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {saved && !dirty && (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="size-3.5" />
          Saved
        </span>
      )}
      <Button
        size="sm"
        disabled={disabled || !dirty || saving}
        onClick={onSave}
      >
        {saving ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Saving…
          </>
        ) : (
          label
        )}
      </Button>
    </div>
  );
}

/** Tracks a local draft for a slice of settings + dirty state. */
export function useSectionDraft<T>(value: T) {
  const [draft, setDraft] = useState<T>(value);
  const serialized = JSON.stringify(value);
  useEffect(() => {
    setDraft(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);
  const dirty = useMemo(
    () => JSON.stringify(draft) !== serialized,
    [draft, serialized]
  );
  return { draft, setDraft, dirty };
}

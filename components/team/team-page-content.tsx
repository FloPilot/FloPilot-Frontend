import { cn } from "@/lib/utils";

export function TeamPageContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "container-marketing flex min-h-0 flex-1 flex-col gap-6 px-6 py-8 sm:px-8 sm:py-10 lg:px-10",
        className
      )}
    >
      {children}
    </div>
  );
}

export function TeamStatCard({
  label,
  value,
  tone = "text-brand-ink",
  hint,
}: {
  label: string;
  value: number;
  tone?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">
        {label}
      </p>
      <p className={cn("mt-2 text-3xl font-semibold tracking-tight", tone)}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-brand-muted">{hint}</p>}
    </div>
  );
}

export function TeamSectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-sm font-semibold text-brand-ink">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-brand-muted">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

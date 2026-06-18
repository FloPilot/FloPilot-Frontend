import { cn } from "@/lib/utils";

export function TeamShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative min-h-screen bg-white", className)}>
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div className="relative flex min-h-screen flex-col pt-[108px] md:pt-[60px]">
        {children}
      </div>
    </div>
  );
}

export function TeamPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-200/80 bg-white/80 px-6 py-8 backdrop-blur-sm sm:px-8 lg:px-10">
      <div className="container-marketing flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-brand-ink sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-muted sm:text-base">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}

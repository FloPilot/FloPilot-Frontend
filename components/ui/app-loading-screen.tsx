import { cn } from "@/lib/utils";

export function AppLoadingScreen({
  label = "Loading your workspace…",
  className,
  fullScreen = false,
}: {
  label?: string;
  className?: string;
  /** Fill the viewport (auth gate) vs. inline panel (dashboard sections) */
  fullScreen?: boolean;
}) {
  return (
    <div
      className={cn(
        "loader-fade-up flex flex-col items-center justify-center bg-white p-8",
        fullScreen ? "min-h-screen flex-1" : "min-h-[40vh] flex-1 w-full",
        className
      )}
    >
      <div className="flex flex-col items-center gap-7">
        <div className="relative size-[4.5rem]" aria-hidden>
          <span className="absolute inset-0 rounded-full border border-zinc-200" />
          <span className="loader-orbit absolute inset-0 rounded-full border-2 border-transparent border-t-zinc-400" />
          <span className="loader-orbit-reverse absolute inset-[7px] rounded-full border-2 border-transparent border-r-zinc-300" />
          <span className="absolute inset-[17px] rounded-full bg-zinc-100" />
        </div>
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium tracking-tight text-zinc-600">
            {label}
          </p>
          <div className="flex items-center justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1 rounded-full bg-zinc-300 animate-pulse"
                style={{ animationDelay: `${i * 160}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

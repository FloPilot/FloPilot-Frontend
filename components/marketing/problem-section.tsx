import {
  Calendar,
  ClipboardList,
  FileImage,
  Mail,
  MessageSquare,
  Package,
  Table2,
} from "lucide-react";
import { PROBLEM_POINTS } from "@/lib/marketing-content";

function IssueLabel() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid grid-cols-3 gap-[3px]" aria-hidden>
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="size-[5px] rounded-full bg-brand-primary" />
        ))}
      </div>
      <span className="text-sm font-semibold text-brand-ink">The issue</span>
    </div>
  );
}

const FRAGMENTED_TILES: { icon: typeof Mail; color: string }[] = [
  { icon: Mail, color: "text-red-500" },
  { icon: Table2, color: "text-emerald-600" },
  { icon: ClipboardList, color: "text-brand-primary" },
  { icon: MessageSquare, color: "text-violet-500" },
  { icon: FileImage, color: "text-amber-500" },
  { icon: Calendar, color: "text-sky-500" },
  { icon: Package, color: "text-orange-500" },
];

function FragmentedToolsVisual() {
  const slots = Array.from({ length: 20 });
  const tilePositions = [1, 4, 6, 9, 11, 14, 17];

  return (
    <div className="grid grid-cols-5 gap-2 p-1">
      {slots.map((_, index) => {
        const tileIndex = tilePositions.indexOf(index);
        const tile = tileIndex >= 0 ? FRAGMENTED_TILES[tileIndex] : null;
        const Icon = tile?.icon;

        return (
          <div
            key={index}
            className="flex aspect-square items-center justify-center rounded-xl bg-white shadow-sm"
          >
            {Icon && <Icon className={`size-5 ${tile.color}`} strokeWidth={1.75} />}
          </div>
        );
      })}
    </div>
  );
}

const FIREFIGHTING_ITEMS = [
  { name: "Acme Corp — 200 tees", action: "Rush job" },
  { name: "River City — caps", action: "Missing art" },
  { name: "Summit Events — banners", action: "Reprint" },
];

function ReactiveFirefightingVisual() {
  return (
    <div className="space-y-2 p-1">
      {FIREFIGHTING_ITEMS.map((item) => (
        <div
          key={item.name}
          className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2.5 shadow-sm"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="size-7 shrink-0 rounded-full bg-slate-200" />
            <span className="truncate text-xs font-medium text-brand-ink">
              {item.name}
            </span>
          </div>
          <span className="shrink-0 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-600">
            {item.action}
          </span>
        </div>
      ))}
      <div className="flex items-center gap-2.5 rounded-lg bg-white/60 px-3 py-2.5 opacity-50">
        <div className="size-7 shrink-0 rounded-full bg-slate-200" />
        <div className="h-2 flex-1 rounded bg-slate-200" />
      </div>
      <div className="flex items-center gap-2.5 rounded-lg bg-white/30 px-3 py-2.5 opacity-25">
        <div className="size-7 shrink-0 rounded-full bg-slate-200" />
        <div className="h-2 w-2/3 rounded bg-slate-200" />
      </div>
    </div>
  );
}

function InvisibleWasteVisual() {
  return (
    <div className="flex h-full flex-col p-1">
      <div className="rounded-lg bg-white px-4 py-3 shadow-sm">
        <p className="text-[11px] text-brand-muted">Rework &amp; idle time</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-2xl font-semibold tracking-tight text-red-500">
            12 hrs
          </span>
          <span className="text-xs font-medium text-red-500">↑ per week</span>
        </div>
      </div>
      <div className="relative mt-3 flex-1 min-h-[100px] overflow-hidden rounded-lg bg-white px-2 pt-2 shadow-sm">
        <svg
          viewBox="0 0 200 80"
          className="h-full w-full"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id="wasteFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[20, 40, 60].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="200"
              y2={y}
              stroke="#e2e8f0"
              strokeWidth="0.5"
            />
          ))}
          <path
            d="M0,55 C30,50 40,65 70,45 S110,70 140,35 S170,55 200,25 L200,80 L0,80 Z"
            fill="url(#wasteFill)"
          />
          <path
            d="M0,55 C30,50 40,65 70,45 S110,70 140,35 S170,55 200,25"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  );
}

const VISUALS = [
  FragmentedToolsVisual,
  ReactiveFirefightingVisual,
  InvisibleWasteVisual,
] as const;

export function ProblemSection() {
  return (
    <section className="border-t border-slate-100 bg-white py-20 sm:py-28">
      <div className="container-marketing px-6 sm:px-8 lg:px-10">
        <div className="marketing-content-width">
        {/* Left-aligned header — ORVO style */}
        <div className="max-w-3xl">
          <IssueLabel />
          <h2 className="mt-5 text-3xl font-semibold leading-[1.15] tracking-[-0.03em] text-brand-ink sm:text-4xl lg:text-[2.75rem]">
            Shops run on workarounds.
            <br />
            You know it. We built for it.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-[1.65] text-brand-muted sm:text-lg">
            Your team juggles order forms, production boards, and customer emails
            before lunch. Onboarding a new hire means explaining five different
            systems. Rush jobs pile up because nobody can see what&apos;s actually
            on the floor. Missed proofs turn into expensive reprints.
          </p>
        </div>

        {/* Three visual cards */}
        <div className="mt-14 grid gap-8 md:grid-cols-3 md:gap-6 lg:gap-8">
          {PROBLEM_POINTS.map((point, index) => {
            const Visual = VISUALS[index]!;
            return (
              <article key={point.title}>
                <div className="flex min-h-[220px] items-stretch rounded-2xl bg-slate-100 p-4 sm:min-h-[240px]">
                  <div className="w-full">
                    <Visual />
                  </div>
                </div>
                <h3 className="mt-5 text-base font-semibold text-brand-ink">
                  {point.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-muted">
                  {point.description}
                </p>
              </article>
            );
          })}
        </div>
        </div>
      </div>
    </section>
  );
}

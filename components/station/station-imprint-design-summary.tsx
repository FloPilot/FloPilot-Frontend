"use client";

import Link from "next/link";
import { ExternalLink, Palette } from "lucide-react";
import { ImprintInkColorsEditor } from "@/components/orders/imprint-ink-colors-editor";
import { MockupPreview } from "@/components/orders/artwork/mockup-preview";
import { summarizeInkColors } from "@/lib/imprint-design";
import type { Job, JobImprint, Order } from "@/types";

export function StationImprintDesignSummary({
  order,
  job,
  imprint,
  orderHref,
}: {
  order: Order;
  job: Job;
  imprint: JobImprint;
  orderHref?: string;
}) {
  const inkColors = imprint.inkColors ?? [];
  const notes = imprint.notes;
  const colorSummary = summarizeInkColors(inkColors) || notes?.colors;

  return (
    <section className="mt-5 rounded-xl border border-border/80 bg-brand-surface/30 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
          <Palette className="size-4 text-brand-primary" />
          Design for this run
        </div>
        {orderHref && (
          <Link
            href={orderHref}
            className="inline-flex items-center gap-1.5 rounded-full h-8 px-3 text-xs font-medium text-brand-primary hover:bg-brand-primary/10 transition-colors"
          >
            Edit in order
            <ExternalLink className="size-3.5" />
          </Link>
        )}
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,220px)_1fr]">
        <MockupPreview entry={{ job, imprint }} compact pinned />

        <div className="space-y-4 min-w-0">
          {(notes?.dimensions ||
            notes?.placement ||
            notes?.inkType ||
            colorSummary) && (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              {notes?.dimensions && (
                <div>
                  <dt className="text-brand-muted text-xs">Print size</dt>
                  <dd className="font-medium text-brand-ink">
                    {notes.dimensions}
                  </dd>
                </div>
              )}
              {notes?.placement && (
                <div>
                  <dt className="text-brand-muted text-xs">Placement</dt>
                  <dd className="font-medium text-brand-ink">
                    {notes.placement}
                  </dd>
                </div>
              )}
              {notes?.inkType && (
                <div>
                  <dt className="text-brand-muted text-xs">Ink</dt>
                  <dd className="font-medium text-brand-ink">
                    {notes.inkType}
                  </dd>
                </div>
              )}
              {colorSummary && (
                <div>
                  <dt className="text-brand-muted text-xs">Pantones</dt>
                  <dd className="font-medium text-brand-ink">{colorSummary}</dd>
                </div>
              )}
            </dl>
          )}

          {notes?.instructions && (
            <p className="text-sm text-brand-ink/90 rounded-xl bg-white/80 border border-border/60 px-3 py-2.5">
              {notes.instructions}
            </p>
          )}

          <ImprintInkColorsEditor
            inkColors={inkColors}
            readOnly
            compact
            onChange={() => undefined}
          />
        </div>
      </div>
    </section>
  );
}

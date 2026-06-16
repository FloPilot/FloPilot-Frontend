"use client";

import { useState } from "react";
import { Shirt } from "lucide-react";
import type { ArtworkFile, ArtworkVersion } from "@/types";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type CompareItem = ArtworkVersion | ArtworkFile;

function versionLabel(item: CompareItem): string {
  return `v${item.version}`;
}

export function MockupCompare({
  current,
  history,
}: {
  current: ArtworkFile;
  history: ArtworkVersion[];
}) {
  const versions: CompareItem[] = [...history, current];
  const [leftIdx, setLeftIdx] = useState(Math.max(0, versions.length - 2));
  const [rightIdx, setRightIdx] = useState(versions.length - 1);

  if (versions.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Upload a new version to compare revisions side by side.
      </p>
    );
  }

  const left = versions[leftIdx];
  const right = versions[rightIdx];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-medium text-muted-foreground">
          Compare
        </label>
        <select
          value={leftIdx}
          onChange={(e) => setLeftIdx(Number(e.target.value))}
          className="rounded-lg border border-border bg-white px-2 py-1 text-sm"
        >
          {versions.map((v, i) => (
            <option key={`l-${v.id}`} value={i}>
              {versionLabel(v)} · {v.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">vs</span>
        <select
          value={rightIdx}
          onChange={(e) => setRightIdx(Number(e.target.value))}
          className="rounded-lg border border-border bg-white px-2 py-1 text-sm"
        >
          {versions.map((v, i) => (
            <option key={`r-${v.id}`} value={i}>
              {versionLabel(v)} · {v.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[left, right].map((item, i) => (
          <div
            key={item.id}
            className={cn(
              "rounded-xl border overflow-hidden",
              i === 1 ? "border-brand-primary/30" : "border-border"
            )}
          >
            <div className="bg-muted/30 px-3 py-2 border-b border-border text-xs font-semibold">
              {versionLabel(item)}
              {i === 1 && (
                <span className="ml-2 text-brand-primary">Current</span>
              )}
            </div>
            <div className="flex min-h-[140px] flex-col items-center justify-center p-6 bg-gradient-to-b from-muted/20 to-white">
              <Shirt className="size-10 text-muted-foreground mb-2" />
              <p className="text-sm font-medium truncate max-w-full">
                {item.name}
              </p>
              {"mockupLabel" in item && item.mockupLabel && (
                <p className="text-xs text-muted-foreground mt-1">
                  {item.mockupLabel}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground mt-2">
                {formatDateTime(item.uploadedAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

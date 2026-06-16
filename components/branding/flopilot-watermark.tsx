"use client";

import Link from "next/link";
import { PLATFORM_NAME, PLATFORM_URL } from "@/lib/tenant-branding";

export function FloPilotWatermark() {
  return (
    <footer className="shrink-0 border-t border-border/40 bg-white/70 px-4 py-2 sm:px-6">
      <p className="text-center text-[11px] text-brand-muted">
        Powered by{" "}
        <Link
          href={PLATFORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand-primary hover:underline"
        >
          {PLATFORM_NAME}
        </Link>
        <span className="hidden sm:inline">
          {" "}
          · Print shop management software
        </span>
      </p>
    </footer>
  );
}

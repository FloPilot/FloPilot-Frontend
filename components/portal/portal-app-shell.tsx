"use client";

import { FloPilotWatermark } from "@/components/branding/flopilot-watermark";
import { PortalAppSidebar } from "@/components/portal/portal-app-sidebar";
import { PortalAppTopBar } from "@/components/portal/portal-app-top-bar";
import { PortalSearchProvider } from "@/components/portal/portal-search-provider";
import { useLockDocumentScroll } from "@/hooks/use-lock-document-scroll";
import { staffNav } from "@/lib/staff-nav-theme";
import { cn } from "@/lib/utils";

export function PortalAppShell({
  children,
  previewMode = false,
}: {
  children: React.ReactNode;
  previewMode?: boolean;
}) {
  useLockDocumentScroll();

  return (
    <PortalSearchProvider>
      <div
        className={cn(
          "flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden",
          staffNav.content
        )}
      >
        <PortalAppTopBar previewMode={previewMode} />
        {previewMode ? (
          <div className="shrink-0 border-b border-[#f0d9a8] bg-[#fff8eb] px-4 py-2 text-center text-[12px] font-medium text-[#8a6116]">
            Staff preview — you&apos;re viewing the customer portal as this
            client. Approvals and edits here use the live customer session for
            testing.
          </div>
        ) : null}
        <div className="flex min-h-0 flex-1">
          <PortalAppSidebar previewMode={previewMode} />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="scroll-pane min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
              <div className="w-full px-4 py-4 sm:px-5">
                {children}
              </div>
            </div>
            <FloPilotWatermark />
          </div>
        </div>
      </div>
    </PortalSearchProvider>
  );
}

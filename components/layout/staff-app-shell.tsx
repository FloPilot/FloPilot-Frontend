"use client";

import { FloPilotWatermark } from "@/components/branding/flopilot-watermark";
import { NotificationsProvider } from "@/components/providers/notifications-provider";
import { NewOrderDialogHost } from "@/components/providers/new-order-provider";
import { StaffSearchProvider } from "@/components/layout/staff-search-provider";
import { StaffSidebar } from "@/components/layout/staff-sidebar";
import { StaffTopBar } from "@/components/layout/staff-top-bar";
import { StaffUnsavedChangesProvider } from "@/components/layout/staff-unsaved-changes-provider";
import { useLockDocumentScroll } from "@/hooks/use-lock-document-scroll";
import { staffNav } from "@/lib/staff-nav-theme";
import { cn } from "@/lib/utils";

export function StaffAppShell({ children }: { children: React.ReactNode }) {
  useLockDocumentScroll();

  return (
    <NotificationsProvider>
      <StaffSearchProvider>
        <StaffUnsavedChangesProvider>
          <div
            className={cn(
              "flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden",
              staffNav.content
            )}
          >
            <StaffTopBar />
            <div className="flex min-h-0 flex-1">
              <StaffSidebar />
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <div className="scroll-pane flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain">
                  {children}
                </div>
                <FloPilotWatermark />
              </div>
            </div>
          </div>
          <NewOrderDialogHost />
        </StaffUnsavedChangesProvider>
      </StaffSearchProvider>
    </NotificationsProvider>
  );
}

"use client";

import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHelpDocs } from "@/components/help/help-docs-provider";
import { staffNav } from "@/lib/staff-nav-theme";
import { cn } from "@/lib/utils";

export function StaffHelpDocsButton({
  className,
}: {
  className?: string;
}) {
  const { openDocs } = useHelpDocs();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Open FloPilot docs"
      title="Docs"
      className={cn(staffNav.topBarIcon, className)}
      onClick={() => openDocs()}
    >
      <BookOpen className="size-[18px]" strokeWidth={1.75} />
    </Button>
  );
}

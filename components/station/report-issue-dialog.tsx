"use client";

import { useState } from "react";
import type { MachineIssueType } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ISSUE_TYPE_LABELS } from "@/lib/station-utils";

interface ReportIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machineName: string;
  onSubmit: (data: {
    issueType: MachineIssueType;
    message: string;
    takeOffline: boolean;
  }) => void;
}

export function ReportIssueDialog({
  open,
  onOpenChange,
  machineName,
  onSubmit,
}: ReportIssueDialogProps) {
  const [issueType, setIssueType] = useState<MachineIssueType>("mechanical");
  const [message, setMessage] = useState("");
  const [takeOffline, setTakeOffline] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    onSubmit({ issueType, message: message.trim(), takeOffline });
    setMessage("");
    setTakeOffline(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 gap-0 overflow-hidden">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="px-6 pt-6 pb-2 border-b border-border">
            <DialogTitle className="text-sm font-bold tracking-widest uppercase text-brand-ink">
              Report issue
            </DialogTitle>
            <DialogDescription className="pb-4 text-brand-muted">
              {machineName} — your team will see this in the shop app and
              calendar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 py-6">
            <div className="space-y-2">
              <Label>What&apos;s wrong?</Label>
              <Select
                value={issueType}
                onValueChange={(v) =>
                  setIssueType((v ?? "other") as MachineIssueType)
                }
              >
                <SelectTrigger className="h-12 w-full rounded-xl text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ISSUE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="issue-detail">Details</Label>
              <Textarea
                id="issue-detail"
                placeholder="Describe the problem so the office knows what happened..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="rounded-xl text-base min-h-[120px] resize-none"
                required
              />
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 cursor-pointer">
              <input
                type="checkbox"
                checked={takeOffline}
                onChange={(e) => setTakeOffline(e.target.checked)}
                className="mt-1 size-5 rounded border-border accent-brand-primary"
              />
              <span className="text-sm leading-relaxed">
                <span className="font-medium text-brand-ink">
                  Take machine offline
                </span>
                <span className="block text-brand-muted mt-0.5">
                  Prevents new jobs from being scheduled until someone marks it
                  back online.
                </span>
              </span>
            </label>
          </div>

          <div className="flex flex-row items-center justify-end gap-3 border-t border-border bg-muted/30 px-6 py-5">
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-6 h-11 bg-white"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full px-8 h-11 font-semibold bg-amber-500 hover:bg-amber-600 text-brand-ink"
              disabled={!message.trim()}
            >
              Submit report
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

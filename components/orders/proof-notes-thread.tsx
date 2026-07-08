"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { RevisionNotesPanel } from "@/components/orders/revision-notes-panel";
import { Button } from "@/components/ui/button";
import {
  dashboardControlClass,
  dashboardPrimaryButtonClass,
} from "@/lib/dashboard-styles";
import type { RevisionNote } from "@/types";
import { cn } from "@/lib/utils";

export function ProofNotesThread({
  notes,
  title = "Proof notes",
  emptyLabel = "Customer and team notes tied to this proof will appear here.",
  alwaysShow = true,
  disabled = false,
  onSendReply,
  replyPlaceholder = "Reply about this proof…",
  sendLabel = "Send reply",
  className,
}: {
  notes?: RevisionNote[];
  title?: string;
  emptyLabel?: string;
  alwaysShow?: boolean;
  disabled?: boolean;
  onSendReply?: (message: string) => Promise<void> | void;
  replyPlaceholder?: string;
  sendLabel?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const handleSend = async () => {
    const message = draft.trim();
    if (!message || !onSendReply || disabled) return;

    setSending(true);
    setFeedback(null);
    try {
      await onSendReply(message);
      setDraft("");
      setFeedback({ message: "Reply sent.", type: "success" });
    } catch (err) {
      setFeedback({
        message:
          err instanceof Error
            ? err.message
            : "Could not send your reply. Please try again.",
        type: "error",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <section className={cn("space-y-3", className)}>
      <RevisionNotesPanel
        notes={notes}
        title={title}
        alwaysShow={alwaysShow}
        emptyLabel={emptyLabel}
      />

      {onSendReply && !disabled ? (
        <div className="space-y-2 rounded-lg border border-[#e3e3e3] bg-white p-3 shadow-sm">
          <label className="text-[12px] font-medium text-[#616161]">
            Add a reply
          </label>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            placeholder={replyPlaceholder}
            disabled={sending}
            className="w-full resize-none rounded-lg border border-[#e3e3e3] bg-[#fafafa] px-3 py-2.5 text-[13px] text-[#303030] outline-none focus:border-[#2c6ecb] focus:bg-white focus:ring-2 focus:ring-[#2c6ecb]/15 disabled:opacity-60"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className={cn(dashboardPrimaryButtonClass, "h-8 text-[12px]")}
              disabled={!draft.trim() || sending}
              onClick={() => void handleSend()}
            >
              {sending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              {sending ? "Sending…" : sendLabel}
            </Button>
          </div>
          {feedback ? (
            <p
              className={cn(
                "rounded-lg border px-3 py-2 text-[12px] font-medium",
                feedback.type === "error"
                  ? "border-[#e7b4b4] bg-[#fdf2f2] text-[#b42318]"
                  : "border-[#86d4a8] bg-[#e8f5ee] text-[#0d5c2e]"
              )}
            >
              {feedback.message}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

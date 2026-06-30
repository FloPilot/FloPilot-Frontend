"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { dashboardPrimaryButtonClass } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export function OrderInternalNotes({ orderId }: { orderId: string }) {
  const { getOrderById, addInternalNote } = useSchedule();
  const order = getOrderById(orderId);
  const [draft, setDraft] = useState("");

  const notes = order?.internalNotes ?? [];

  const handleAdd = () => {
    if (!draft.trim()) return;
    addInternalNote(orderId, draft);
    setDraft("");
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lock className="size-4 text-muted-foreground" />
          Internal notes
        </CardTitle>
        <CardDescription>
          Staff only — customers never see these.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Log setup details, vendor calls, or floor reminders here.
          </p>
        ) : (
          <ul className="space-y-3 max-h-48 overflow-y-auto">
            {notes.map((note) => (
              <li
                key={note.id}
                className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm"
              >
                <div className="flex justify-between gap-2 mb-1">
                  <span className="font-medium text-xs">{note.author}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatDateTime(note.timestamp)}
                  </span>
                </div>
                <p className="leading-relaxed">{note.content}</p>
              </li>
            ))}
          </ul>
        )}
        <div className="space-y-2 pt-2 border-t border-border">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add an internal note…"
            rows={2}
            className="rounded-xl resize-none text-sm"
          />
          <Button
            type="button"
            size="sm"
            className={cn(dashboardPrimaryButtonClass, "w-full sm:w-auto rounded-full")}
            disabled={!draft.trim()}
            onClick={handleAdd}
          >
            Save note
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

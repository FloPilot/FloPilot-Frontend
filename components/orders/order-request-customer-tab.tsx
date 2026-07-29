"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  addOrderRequestInternalNote,
  sendOrderRequestMessage,
} from "@/lib/api";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { OrderRequestDetail } from "@/lib/order-requests";
import { cn } from "@/lib/utils";

type CustomerSection = "messages" | "payment" | "notes";

function CustomerSubNav({
  active,
  onChange,
}: {
  active: CustomerSection;
  onChange: (section: CustomerSection) => void;
}) {
  const items: { id: CustomerSection; label: string }[] = [
    { id: "messages", label: "Messages" },
    { id: "payment", label: "Payment" },
    { id: "notes", label: "Notes" },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            dashboardControlClass,
            "h-8 px-2.5 text-[12px]",
            active === item.id &&
              "border-[#2c6ecb]/40 bg-[#f4f7fd] text-[#2c6ecb]"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function MessagesPanel({
  request,
  editable,
  onRequestChange,
}: {
  request: OrderRequestDetail;
  editable: boolean;
  onRequestChange: (next: OrderRequestDetail) => void;
}) {
  const { getIdToken } = useAuth();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messages = request.messages || [];

  const handleSend = async () => {
    if (!draft.trim() || !editable || sending) return;
    const token = await getIdToken();
    if (!token) return;
    setSending(true);
    setError(null);
    try {
      const { request: updated } = await sendOrderRequestMessage(
        token,
        request.id,
        draft.trim()
      );
      onRequestChange(updated);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {messages.length === 0 ? (
        <p className={dashboardTaskDetailClass}>
          No messages yet. Write to the customer when you need artwork approval
          or order details.
        </p>
      ) : (
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                dashboardInsetSurfaceClass,
                "px-3 py-3 text-[13px]",
                message.role === "staff" ? "ml-4 sm:ml-8" : "mr-4 sm:mr-8"
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="font-medium text-[#303030]">{message.author}</p>
                <p className="text-[11px] text-[#8a8a8a]">
                  {formatDateTime(message.timestamp)}
                </p>
              </div>
              <p className="leading-relaxed text-[#616161]">{message.content}</p>
            </div>
          ))}
        </div>
      )}

      {error ? (
        <p className="text-[12px] text-red-700">{error}</p>
      ) : null}

      {editable ? (
        <div className="flex flex-col gap-2 border-t border-[#ebebeb] pt-4 sm:flex-row sm:items-end">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write a message to the customer…"
            rows={2}
            className="min-h-[72px] flex-1 resize-none rounded-lg border-[#e3e3e3]"
            disabled={sending}
          />
          <Button
            type="button"
            className={cn(dashboardPrimaryButtonClass, "h-10 shrink-0")}
            disabled={!draft.trim() || sending}
            onClick={() => void handleSend()}
          >
            {sending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Send
          </Button>
        </div>
      ) : (
        <p className={cn("border-t border-[#ebebeb] pt-4", dashboardTaskDetailClass)}>
          Messaging is closed on this request.
        </p>
      )}
    </div>
  );
}

function PaymentPendingPanel({ request }: { request: OrderRequestDetail }) {
  const estimateTotal =
    request.currentEstimate?.totals?.total ?? request.estimateTotal ?? null;

  return (
    <div className="space-y-4">
      <div
        className={cn(
          dashboardInsetSurfaceClass,
          "flex flex-wrap items-center justify-between gap-3 px-3 py-3"
        )}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Payment status
          </p>
          <p className="mt-1 text-[14px] font-semibold text-[#303030]">Pending</p>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            Invoicing and payments unlock after you convert this request to an
            order.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-900">
          <span className="size-1.5 rounded-full bg-current" />
          Pending
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={cn(dashboardInsetSurfaceClass, "px-3 py-3")}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Estimate total
          </p>
          <p className="mt-1 text-[18px] font-semibold tabular-nums text-[#303030]">
            {estimateTotal != null ? formatCurrency(estimateTotal) : "—"}
          </p>
        </div>
        <div className={cn(dashboardInsetSurfaceClass, "px-3 py-3")}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Balance due
          </p>
          <p className="mt-1 text-[18px] font-semibold tabular-nums text-[#303030]">
            Pending
          </p>
        </div>
      </div>
    </div>
  );
}

function NotesPanel({
  request,
  editable,
  onRequestChange,
}: {
  request: OrderRequestDetail;
  editable: boolean;
  onRequestChange: (next: OrderRequestDetail) => void;
}) {
  const { getIdToken } = useAuth();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notes = request.internalNotes || [];
  const customerNotes = request.notes?.trim() || "";

  const handleAdd = async () => {
    if (!draft.trim() || !editable || saving) return;
    const token = await getIdToken();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const { request: updated } = await addOrderRequestInternalNote(
        token,
        request.id,
        draft.trim()
      );
      onRequestChange(updated);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {customerNotes ? (
        <div className={cn(dashboardInsetSurfaceClass, "px-3 py-3")}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
            Customer notes on request
          </p>
          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-[#303030]">
            {customerNotes}
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="size-3.5 text-[#8a8a8a]" />
          <p className="text-[13px] font-semibold text-[#303030]">
            Internal notes
          </p>
        </div>
        <p className={dashboardTaskDetailClass}>
          Staff only — customers never see these.
        </p>

        {notes.length === 0 ? (
          <p className={dashboardTaskDetailClass}>
            Log setup details, vendor calls, or floor reminders here.
          </p>
        ) : (
          <ul className="max-h-48 space-y-2 overflow-y-auto">
            {notes.map((note) => (
              <li
                key={note.id}
                className={cn(dashboardInsetSurfaceClass, "px-3 py-3 text-[13px]")}
              >
                <div className="mb-1 flex justify-between gap-2">
                  <span className="font-medium text-[#303030]">{note.author}</span>
                  <span className="text-[11px] text-[#8a8a8a]">
                    {formatDateTime(note.timestamp)}
                  </span>
                </div>
                <p className="leading-relaxed text-[#616161]">{note.content}</p>
              </li>
            ))}
          </ul>
        )}

        {error ? (
          <p className="text-[12px] text-red-700">{error}</p>
        ) : null}

        {editable ? (
          <div className="space-y-2 border-t border-[#ebebeb] pt-4">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Add an internal note…"
              rows={2}
              className="min-h-[72px] resize-none rounded-lg border-[#e3e3e3]"
              disabled={saving}
            />
            <Button
              type="button"
              className={cn(dashboardPrimaryButtonClass, "h-9")}
              disabled={!draft.trim() || saving}
              onClick={() => void handleAdd()}
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Add note
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function OrderRequestCustomerTab({
  request,
  editable = true,
  onRequestChange,
}: {
  request: OrderRequestDetail;
  editable?: boolean;
  onRequestChange: (next: OrderRequestDetail) => void;
}) {
  const [section, setSection] = useState<CustomerSection>("messages");

  return (
    <section className={dashboardCardClass}>
      <div className="space-y-3 border-b border-[#ebebeb] px-4 py-4 sm:px-5">
        <div>
          <h2 className={dashboardTaskTitleClass}>{request.customerName}</h2>
          <p className={cn("mt-0.5", dashboardTaskDetailClass)}>
            {request.company || "—"}
          </p>
          <Link
            href={`/app/customers/${request.customerId}`}
            className="mt-1 inline-block text-[13px] font-medium text-[#2c6ecb] hover:underline"
          >
            View customer profile
          </Link>
        </div>
        <CustomerSubNav active={section} onChange={setSection} />
      </div>

      <div className="p-4 sm:p-5">
        {section === "messages" ? (
          <MessagesPanel
            request={request}
            editable={editable}
            onRequestChange={onRequestChange}
          />
        ) : null}
        {section === "payment" ? (
          <PaymentPendingPanel request={request} />
        ) : null}
        {section === "notes" ? (
          <NotesPanel
            request={request}
            editable={editable}
            onRequestChange={onRequestChange}
          />
        ) : null}
      </div>
    </section>
  );
}

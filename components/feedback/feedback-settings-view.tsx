"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  CheckCircle2,
  ImagePlus,
  Loader2,
  MessageSquarePlus,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react";
import { SettingsHeader, SettingsMain } from "@/components/settings/settings-kit";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  LabeledSelectValue,
  SelectTrigger,
} from "@/components/ui/select";
import { createSupportTicket, listSupportTickets } from "@/lib/api";
import {
  readFeedbackAttachmentAsDataUrl,
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_PRIORITIES,
  supportTicketCategoryLabel,
  supportTicketPriorityLabel,
  supportTicketStatusMeta,
  type SupportTicket,
  type SupportTicketCategory,
  type SupportTicketPriority,
} from "@/lib/support-tickets";
import { cn } from "@/lib/utils";

function TicketStatusBadge({ status }: { status: SupportTicket["status"] }) {
  const meta = supportTicketStatusMeta(status);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-md border px-2.5 py-0.5 text-[11px] font-medium",
        meta.color
      )}
    >
      {meta.label}
    </span>
  );
}

function FeedbackTicketDetailDialog({
  ticket,
  open,
  onOpenChange,
}: {
  ticket: SupportTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!ticket) return null;

  const statusHelp: Partial<Record<SupportTicket["status"], string>> = {
    open: "We received your feedback and will review it soon.",
    in_review: "The FloPilot team is looking into this.",
    planned: "This is on our roadmap — we'll keep you posted.",
    done: "We've addressed this. Thanks for helping improve FloPilot.",
    closed: "This submission has been closed.",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-8">
            <DialogTitle className="text-base leading-snug text-brand-ink">
              {ticket.title}
            </DialogTitle>
            <TicketStatusBadge status={ticket.status} />
          </div>
          <DialogDescription className="text-xs text-brand-muted">
            {supportTicketCategoryLabel(ticket.category)} ·{" "}
            {supportTicketPriorityLabel(ticket.priority)} · Submitted{" "}
            {new Date(ticket.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {statusHelp[ticket.status] && (
            <p className="rounded-xl border border-primary/15 bg-accent/60 px-3 py-2.5 text-sm text-brand-ink">
              {statusHelp[ticket.status]}
            </p>
          )}

          {ticket.assignedToName && (
            <p className="rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2.5 text-sm text-brand-ink">
              Assigned to{" "}
              <span className="font-medium">{ticket.assignedToName}</span> on
              the FloPilot team — they&apos;re tracking this for you.
            </p>
          )}

          {(ticket.activity?.length ?? 0) > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                Updates
              </p>
              <ul className="mt-2 space-y-2">
                {[...(ticket.activity ?? [])]
                  .reverse()
                  .filter((entry) =>
                    ["assigned", "status_changed"].includes(entry.type)
                  )
                  .slice(0, 5)
                  .map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-lg border border-slate-200/70 bg-white px-3 py-2 text-xs text-brand-muted"
                    >
                      {entry.type === "assigned" && entry.assigneeName
                        ? `Assigned to ${entry.assigneeName}`
                        : entry.type === "status_changed" && entry.toStatus
                          ? `Status updated to ${supportTicketStatusMeta(entry.toStatus).label}`
                          : entry.message}
                      <span className="mt-0.5 block text-[10px]">
                        {new Date(entry.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
              Details
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-brand-ink">
              {ticket.description}
            </p>
          </div>

          {ticket.attachmentUrl && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                Screenshot
              </p>
              <div className="mt-2 inline-flex rounded-xl border border-border/60 bg-slate-50 p-3">
                <div className="relative h-48 w-full min-w-[240px] sm:w-80">
                  <Image
                    src={ticket.attachmentUrl}
                    alt={ticket.attachmentName || "Attachment"}
                    fill
                    unoptimized
                    className="rounded-lg object-contain"
                  />
                </div>
              </div>
              {ticket.attachmentName && (
                <p className="mt-1.5 text-xs text-brand-muted">
                  {ticket.attachmentName}
                </p>
              )}
            </div>
          )}

          <p className="text-[11px] text-brand-muted">
            Last updated{" "}
            {new Date(ticket.updatedAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FeedbackSettingsView() {
  const { profile, getIdToken } = useAuth();
  const pathname = usePathname();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<SupportTicketCategory>("suggestion");
  const [priority, setPriority] = useState<SupportTicketPriority>("medium");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [readingAttachment, setReadingAttachment] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadTickets = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    setLoadingTickets(true);
    try {
      const { tickets: next } = await listSupportTickets(token);
      setTickets(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load feedback");
    } finally {
      setLoadingTickets(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  async function handleAttachment(file: File | undefined) {
    if (!file) return;
    setReadingAttachment(true);
    setAttachmentError(null);
    const { dataUrl, error: readError } =
      await readFeedbackAttachmentAsDataUrl(file);
    setReadingAttachment(false);
    if (readError) {
      setAttachmentError(readError);
      return;
    }
    setAttachmentUrl(dataUrl);
    setAttachmentName(file.name);
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void handleAttachment(file);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");

      await createSupportTicket(token, {
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        pageUrl:
          typeof window !== "undefined"
            ? `${window.location.origin}${pathname}`
            : pathname,
        attachmentUrl: attachmentUrl || undefined,
        attachmentName: attachmentName || undefined,
      });

      setTitle("");
      setDescription("");
      setCategory("suggestion");
      setPriority("medium");
      setAttachmentUrl("");
      setAttachmentName("");
      setSuccess(true);
      window.setTimeout(() => setSuccess(false), 3000);
      await loadTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit feedback");
    } finally {
      setSubmitting(false);
    }
  }

  const userName =
    profile?.type === "staff" ? profile.user.name || profile.user.email : "";

  return (
    <>
      <SettingsMain>
        <SettingsHeader
          title="Feedback & ideas"
          description="Report bugs, request features, and tell us what would make your shop run smoother."
        />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] xl:gap-6">
          <section className="rounded-2xl border border-white/80 bg-white shadow-sm">
            <div className="border-b border-border/50 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="size-4 text-brand-primary" />
                <h2 className="text-sm font-semibold text-brand-ink">
                  Submit feedback
                </h2>
              </div>
              <p className="mt-1 text-xs text-brand-muted">
                We read every submission. Drag a screenshot into the box below
                or click to attach one.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 px-5 py-5 sm:px-6 sm:py-6"
            >
              {error && (
                <p className="rounded-xl border border-destructive/30 bg-red-50 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              {success && (
                <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                  <CheckCircle2 className="size-4 shrink-0" />
                  Thanks{userName ? `, ${userName.split(" ")[0]}` : ""}! Your
                  feedback was submitted.
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor="feedback-title">Title</Label>
                <Input
                  id="feedback-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Short summary of your idea or issue"
                  className="h-11 rounded-xl"
                  maxLength={200}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={category}
                    onValueChange={(value) => {
                      if (value) setCategory(value as SupportTicketCategory);
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <LabeledSelectValue
                        value={category}
                        options={SUPPORT_TICKET_CATEGORIES}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORT_TICKET_CATEGORIES.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={priority}
                    onValueChange={(value) => {
                      if (value) setPriority(value as SupportTicketPriority);
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <LabeledSelectValue
                        value={priority}
                        options={SUPPORT_TICKET_PRIORITIES}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORT_TICKET_PRIORITIES.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback-description">Details</Label>
                <textarea
                  id="feedback-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What were you trying to do? What would you like to see improved?"
                  className="min-h-[140px] w-full rounded-xl border border-input bg-transparent px-3 py-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  maxLength={5000}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Screenshot (optional)</Label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(event) => {
                    void handleAttachment(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => !readingAttachment && fileRef.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      fileRef.current?.click();
                    }
                  }}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "relative rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
                    dragActive
                      ? "border-primary bg-primary/5"
                      : "border-border/70 bg-slate-50/50 hover:border-primary/40 hover:bg-accent/40",
                    readingAttachment && "pointer-events-none opacity-70"
                  )}
                >
                  {readingAttachment ? (
                    <div className="flex flex-col items-center gap-2 text-sm text-brand-muted">
                      <Loader2 className="size-5 animate-spin text-primary" />
                      Processing image…
                    </div>
                  ) : attachmentUrl ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative h-28 w-44">
                        <Image
                          src={attachmentUrl}
                          alt="Attachment preview"
                          fill
                          unoptimized
                          className="rounded-lg object-contain"
                        />
                      </div>
                      <p className="max-w-full truncate text-xs font-medium text-brand-ink">
                        {attachmentName}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            fileRef.current?.click();
                          }}
                        >
                          <ImagePlus className="size-3.5" />
                          Replace
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={(event) => {
                            event.stopPropagation();
                            setAttachmentUrl("");
                            setAttachmentName("");
                          }}
                        >
                          <Trash2 className="size-3.5" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Upload className="size-4" />
                      </div>
                      <p className="text-sm font-medium text-brand-ink">
                        Drag an image here
                      </p>
                      <p className="text-xs text-brand-muted">
                        or click to browse · PNG, JPG, WebP, GIF · max 600 KB
                      </p>
                    </div>
                  )}
                </div>

                {attachmentError && (
                  <p className="text-xs text-destructive">{attachmentError}</p>
                )}
              </div>

              <Button
                type="submit"
                className="h-11 w-full rounded-xl sm:w-auto sm:px-8"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Submit feedback"
                )}
              </Button>
            </form>
          </section>

          <section className="rounded-2xl border border-white/80 bg-white shadow-sm">
            <div className="border-b border-border/50 px-5 py-4 sm:px-6">
              <h2 className="text-sm font-semibold text-brand-ink">
                Your submissions
              </h2>
              <p className="mt-0.5 text-xs text-brand-muted">
                Click a submission to view full details
              </p>
            </div>

            <div className="px-5 py-4 sm:px-6">
              {loadingTickets ? (
                <div className="flex items-center justify-center py-12 text-sm text-brand-muted">
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Loading…
                </div>
              ) : tickets.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 bg-slate-50/60 px-4 py-10 text-center">
                  <Paperclip className="mx-auto size-5 text-brand-muted" />
                  <p className="mt-3 text-sm font-medium text-brand-ink">
                    No feedback yet
                  </p>
                  <p className="mt-1 text-xs text-brand-muted">
                    Your submissions will appear here with status updates.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {tickets.map((ticket) => (
                    <li key={ticket.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedTicket(ticket)}
                        className="w-full rounded-xl border border-border/50 bg-slate-50/40 px-4 py-3.5 text-left transition-colors hover:border-primary/25 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-brand-ink">
                              {ticket.title}
                            </p>
                            <p className="mt-0.5 text-xs text-brand-muted">
                              {supportTicketCategoryLabel(ticket.category)} ·{" "}
                              {supportTicketPriorityLabel(ticket.priority)}
                              {ticket.attachmentUrl && (
                                <> · <span className="text-primary">Screenshot</span></>
                              )}
                            </p>
                          </div>
                          <TicketStatusBadge status={ticket.status} />
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-brand-muted">
                          {ticket.description}
                        </p>
                        <p className="mt-2 text-[11px] text-brand-muted">
                          {new Date(ticket.createdAt).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </SettingsMain>

      <FeedbackTicketDetailDialog
        ticket={selectedTicket}
        open={selectedTicket !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTicket(null);
        }}
      />
    </>
  );
}

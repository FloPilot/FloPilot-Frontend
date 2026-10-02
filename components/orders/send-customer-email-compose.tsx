"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2, Plus, Send, UserPlus } from "lucide-react";
import { useSchedule } from "@/components/providers/schedule-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  dashboardControlClass,
  dashboardGhostButtonClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import {
  createCustomerContactId,
  MAX_CUSTOMER_CONTACTS,
  sortCustomerContacts,
} from "@/lib/customer-contacts";
import type { Customer, CustomerContact } from "@/types";
import { cn } from "@/lib/utils";

const ACCOUNT_RECIPIENT_ID = "__account__";

type RecipientRole = "to" | "cc" | null;

type RecipientOption = {
  id: string;
  name: string;
  email: string | null;
  label: string;
  detail?: string;
  isAccount?: boolean;
};

type ContactDraft = {
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
};

function emptyContactDraft(): ContactDraft {
  return {
    name: "",
    email: "",
    phone: "",
    department: "",
    position: "",
  };
}

function buildRecipientOptions(customer: Customer): RecipientOption[] {
  const contacts = sortCustomerContacts(customer.contacts ?? []);
  const accountEmail =
    typeof customer.email === "string" ? customer.email.trim() : "";
  const options: RecipientOption[] = [];

  if (accountEmail) {
    options.push({
      id: ACCOUNT_RECIPIENT_ID,
      name: customer.name || customer.company,
      email: accountEmail,
      label: `${customer.name || customer.company} (account)`,
      detail: accountEmail,
      isAccount: true,
    });
  }

  for (const contact of contacts) {
    const email =
      typeof contact.email === "string" ? contact.email.trim() : "";
    options.push({
      id: contact.id,
      name: contact.name,
      email: email || null,
      label: contact.name,
      detail: [contact.position, contact.department, email || null]
        .filter(Boolean)
        .join(" · "),
    });
  }

  return options;
}

function formatEmailList(emails: string[]): string {
  return emails.join(", ");
}

export function SendCustomerEmailCompose({
  customer,
  orderId,
  variant,
  documentSelection,
  onBack,
  onSent,
  onCancel,
}: {
  customer: Customer;
  orderId: string;
  variant: "estimate" | "invoice";
  documentSelection?: {
    includeEstimate?: boolean;
    proofs?: Array<{ jobId: string; imprintId: string }>;
    techPacks?: Array<{ fileId: string }>;
    invoiceNotes?: string | null;
    estimateNotes?: string | null;
    paymentSelection?: {
      includeStripe?: boolean;
      includeQuickBooks?: boolean;
      methodIds?: string[];
    };
  };
  onBack: () => void;
  onSent: (message: string) => void;
  onCancel: () => void;
}) {
  const {
    getCustomerById,
    updateCustomer,
    previewOrderEmail,
    sendProofsAndEstimate,
    sendInvoice,
  } = useSchedule();

  const liveCustomer = getCustomerById(customer.id) ?? customer;
  const recipients = useMemo(
    () => buildRecipientOptions(liveCustomer),
    [liveCustomer]
  );
  const emailable = useMemo(
    () => recipients.filter((entry) => Boolean(entry.email)),
    [recipients]
  );

  const [roles, setRoles] = useState<Record<string, RecipientRole>>({});
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [defaultsLoaded, setDefaultsLoaded] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewStatus, setPreviewStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [addingContact, setAddingContact] = useState(false);
  const [contactDraft, setContactDraft] = useState<ContactDraft>(
    emptyContactDraft()
  );
  const [contactError, setContactError] = useState<string | null>(null);
  const [savingContact, setSavingContact] = useState(false);
  const previewRequestId = useRef(0);

  // Default: select account email as To when available
  useEffect(() => {
    setRoles((current) => {
      if (Object.keys(current).length > 0) return current;
      const account = recipients.find((entry) => entry.isAccount && entry.email);
      if (account) return { [account.id]: "to" };
      const first = emailable[0];
      if (first) return { [first.id]: "to" };
      return current;
    });
  }, [recipients, emailable]);

  const selectedTo = useMemo(() => {
    return recipients.filter(
      (entry) => roles[entry.id] === "to" && entry.email
    );
  }, [recipients, roles]);

  const selectedCc = useMemo(() => {
    return recipients.filter(
      (entry) => roles[entry.id] === "cc" && entry.email
    );
  }, [recipients, roles]);

  const toEmails = useMemo(
    () => selectedTo.map((entry) => entry.email!).filter(Boolean),
    [selectedTo]
  );
  const ccEmails = useMemo(
    () => selectedCc.map((entry) => entry.email!).filter(Boolean),
    [selectedCc]
  );

  const recipientName = selectedTo[0]?.name?.trim() || undefined;

  const setRole = (id: string, next: RecipientRole) => {
    setRoles((current) => {
      const updated = { ...current };
      if (!next) {
        delete updated[id];
      } else {
        updated[id] = next;
      }
      return updated;
    });
  };

  const toggleRole = (id: string, role: "to" | "cc") => {
    const current = roles[id] ?? null;
    setRole(id, current === role ? null : role);
  };

  const loadPreview = useCallback(
    async (opts?: { subject?: string; message?: string; recipientName?: string }) => {
      const requestId = ++previewRequestId.current;
      setPreviewStatus("loading");
      setPreviewError(null);
      try {
        const result = await previewOrderEmail(orderId, {
          variant,
          includeEstimate: documentSelection?.includeEstimate,
          proofs: documentSelection?.proofs,
          subject: opts?.subject,
          message: opts?.message,
          recipientName: opts?.recipientName,
        });
        if (requestId !== previewRequestId.current) return result;
        setPreviewHtml(result.html);
        setPreviewStatus("ready");
        return result;
      } catch (err) {
        if (requestId !== previewRequestId.current) return null;
        setPreviewStatus("error");
        setPreviewError(
          err instanceof Error ? err.message : "Could not load email preview."
        );
        return null;
      }
    },
    [previewOrderEmail, orderId, variant, documentSelection]
  );

  // Load defaults on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await loadPreview({ recipientName });
      if (cancelled || !result) return;
      setSubject(result.defaultSubject || result.subject);
      setMessage(result.defaultMessage || result.message);
      setDefaultsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
    // Only on mount / variant change — recipientName updates handled by debounced preview
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, variant]);

  // Debounced live preview when subject/message/recipientName change
  useEffect(() => {
    if (!defaultsLoaded) return;
    const timer = window.setTimeout(() => {
      void loadPreview({
        subject,
        message,
        recipientName,
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [subject, message, recipientName, defaultsLoaded, loadPreview]);

  const atContactLimit =
    (liveCustomer.contacts?.length ?? 0) >= MAX_CUSTOMER_CONTACTS;

  const handleSaveContact = async () => {
    const name = contactDraft.name.trim();
    if (!name) {
      setContactError("Name is required.");
      return;
    }
    const email = contactDraft.email.trim();
    if (!email) {
      setContactError("Email is required to send.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setContactError("Enter a valid email address.");
      return;
    }
    if (atContactLimit) {
      setContactError(`You can add up to ${MAX_CUSTOMER_CONTACTS} contacts.`);
      return;
    }

    setSavingContact(true);
    setContactError(null);
    try {
      const now = new Date().toISOString();
      const nextEntry: CustomerContact = {
        id: createCustomerContactId(),
        name,
        email,
        ...(contactDraft.phone.trim()
          ? { phone: contactDraft.phone.trim() }
          : {}),
        ...(contactDraft.department.trim()
          ? { department: contactDraft.department.trim() }
          : {}),
        ...(contactDraft.position.trim()
          ? { position: contactDraft.position.trim() }
          : {}),
        createdAt: now,
        updatedAt: now,
      };
      const nextContacts = sortCustomerContacts([
        ...(liveCustomer.contacts ?? []),
        nextEntry,
      ]);
      await updateCustomer(liveCustomer.id, { contacts: nextContacts });
      setRoles((current) => ({ ...current, [nextEntry.id]: "to" }));
      setContactDraft(emptyContactDraft());
      setAddingContact(false);
    } catch (err) {
      setContactError(
        err instanceof Error ? err.message : "Could not save contact."
      );
    } finally {
      setSavingContact(false);
    }
  };

  const canSend = toEmails.length > 0 && !sending;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setSendError(null);
    try {
      const payload = {
        to: toEmails,
        cc: ccEmails.length > 0 ? ccEmails : undefined,
        subject: subject.trim() || undefined,
        message: message.trim() || undefined,
        recipientName,
      };
      const email =
        variant === "invoice"
          ? await sendInvoice(orderId, {
              ...payload,
              invoiceNotes: documentSelection?.invoiceNotes,
              proofs: documentSelection?.proofs,
              techPacks: documentSelection?.techPacks,
              paymentSelection: documentSelection?.paymentSelection,
            })
          : await sendProofsAndEstimate(orderId, {
              ...documentSelection,
              ...payload,
            });
      const label = variant === "invoice" ? "Invoice" : "Proofs & estimate";
      onSent(`${label} emailed to ${email.to}.`);
    } catch (err) {
      setSendError(
        err instanceof Error
          ? err.message
          : "Could not send the email. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  const summaryTo = formatEmailList(toEmails) || "—";
  const summaryCc = formatEmailList(ccEmails);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* LEFT: Recipients */}
        <div className="flex min-h-0 flex-col border-b border-[#ebebeb] lg:border-b-0 lg:border-r">
          <div className="shrink-0 border-b border-[#ebebeb] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Recipients
            </p>
            <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
              Choose who receives this email and who is copied.
            </p>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
            {emailable.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-3 py-6 text-center">
                <UserPlus className="mx-auto size-6 text-[#c9c9c9]" />
                <p className="mt-2 text-[13px] font-medium text-[#303030]">
                  No email addresses on file
                </p>
                <p className={cn("mx-auto mt-1 max-w-xs", dashboardTaskDetailClass)}>
                  Add a contact with an email below, or update the account email
                  on the customer page.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    Send to
                  </p>
                  <div className="space-y-1.5">
                    {recipients.map((entry) => {
                      const hasEmail = Boolean(entry.email);
                      const isTo = roles[entry.id] === "to";
                      const isCc = roles[entry.id] === "cc";
                      return (
                        <div
                          key={entry.id}
                          className={cn(
                            "rounded-lg border px-3 py-2.5",
                            isTo || isCc
                              ? "border-[#c4d7f2] bg-[#f8faff]"
                              : "border-[#ebebeb] bg-white",
                            !hasEmail && "opacity-60"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-semibold text-[#303030]">
                                {entry.label}
                              </p>
                              <p className="mt-0.5 truncate text-[11px] text-[#8a8a8a]">
                                {hasEmail ? entry.detail : "Add email"}
                              </p>
                            </div>
                            {!hasEmail ? (
                              <span className="shrink-0 rounded-md bg-[#f4f4f4] px-2 py-0.5 text-[10px] font-medium text-[#8a8a8a]">
                                No email
                              </span>
                            ) : (
                              <div className="flex shrink-0 items-center gap-3">
                                <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[#616161]">
                                  <input
                                    type="checkbox"
                                    checked={isTo}
                                    onChange={() => toggleRole(entry.id, "to")}
                                    className="size-3.5 rounded border-[#c9c9c9] text-[#2c6ecb] focus:ring-[#2c6ecb]/30"
                                  />
                                  To
                                </label>
                                <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-[#616161]">
                                  <input
                                    type="checkbox"
                                    checked={isCc}
                                    onChange={() => toggleRole(entry.id, "cc")}
                                    className="size-3.5 rounded border-[#c9c9c9] text-[#2c6ecb] focus:ring-[#2c6ecb]/30"
                                  />
                                  CC
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <div className="border-t border-[#ebebeb] pt-3">
              {!addingContact ? (
                <Button
                  type="button"
                  className={cn(dashboardControlClass, "h-8 w-full text-[12px]")}
                  disabled={atContactLimit || savingContact}
                  onClick={() => {
                    setAddingContact(true);
                    setContactError(null);
                    setContactDraft(emptyContactDraft());
                  }}
                >
                  <Plus className="size-3.5" />
                  Add contact
                </Button>
              ) : (
                <div className="space-y-2.5 rounded-lg border border-[#ebebeb] bg-[#fafafa] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                    New contact
                  </p>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                      Name *
                    </Label>
                    <Input
                      value={contactDraft.name}
                      onChange={(event) => {
                        setContactDraft((current) => ({
                          ...current,
                          name: event.target.value,
                        }));
                        if (contactError) setContactError(null);
                      }}
                      className="h-8 rounded-lg border-[#e3e3e3] bg-white"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                      Email *
                    </Label>
                    <Input
                      type="email"
                      value={contactDraft.email}
                      onChange={(event) => {
                        setContactDraft((current) => ({
                          ...current,
                          email: event.target.value,
                        }));
                        if (contactError) setContactError(null);
                      }}
                      className="h-8 rounded-lg border-[#e3e3e3] bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                        Phone
                      </Label>
                      <Input
                        value={contactDraft.phone}
                        onChange={(event) =>
                          setContactDraft((current) => ({
                            ...current,
                            phone: event.target.value,
                          }))
                        }
                        className="h-8 rounded-lg border-[#e3e3e3] bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                        Position
                      </Label>
                      <Input
                        value={contactDraft.position}
                        onChange={(event) =>
                          setContactDraft((current) => ({
                            ...current,
                            position: event.target.value,
                          }))
                        }
                        className="h-8 rounded-lg border-[#e3e3e3] bg-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                      Department
                    </Label>
                    <Input
                      value={contactDraft.department}
                      onChange={(event) =>
                        setContactDraft((current) => ({
                          ...current,
                          department: event.target.value,
                        }))
                      }
                      className="h-8 rounded-lg border-[#e3e3e3] bg-white"
                    />
                  </div>
                  {contactError ? (
                    <p className="text-[12px] font-medium text-[#b42318]">
                      {contactError}
                    </p>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      className={cn(dashboardGhostButtonClass, "h-8 text-[12px]")}
                      disabled={savingContact}
                      onClick={() => {
                        setAddingContact(false);
                        setContactError(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      className={cn(dashboardPrimaryButtonClass, "h-8 text-[12px]")}
                      disabled={savingContact}
                      onClick={() => void handleSaveContact()}
                    >
                      {savingContact ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : null}
                      {savingContact ? "Saving…" : "Save & select"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-[#ebebeb] bg-white px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Summary
              </p>
              <p className="mt-1 text-[12px] leading-snug text-[#303030]">
                <span className="font-medium">To:</span> {summaryTo}
              </p>
              {summaryCc ? (
                <p className="mt-0.5 text-[12px] leading-snug text-[#303030]">
                  <span className="font-medium">CC:</span> {summaryCc}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* RIGHT: Email */}
        <div className="flex min-h-0 flex-col bg-[#f6f6f7]">
          <div className="shrink-0 space-y-3 border-b border-[#ebebeb] bg-white px-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Subject
              </Label>
              <Input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="h-9 rounded-lg border-[#e3e3e3]"
                placeholder="Email subject"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Message
              </Label>
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-[88px] rounded-lg border-[#e3e3e3] bg-white text-[13px]"
                placeholder="Intro message shown above the branded template"
              />
              <p className="text-[11px] text-[#8a8a8a]">
                Plain text intro — the branded template wraps this message.
              </p>
            </div>
          </div>

          <div className="relative min-h-[220px] flex-1 overflow-hidden">
            {previewStatus === "ready" && previewHtml ? (
              <iframe
                srcDoc={previewHtml}
                title="Email preview"
                className="h-full w-full border-0 bg-white"
                sandbox="allow-same-origin"
              />
            ) : previewStatus === "error" ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
                <AlertCircle className="size-6 text-[#d72c0d]" />
                <p className="text-[13px] font-medium text-[#303030]">
                  Couldn’t load email preview
                </p>
                <p className="text-[12px] text-[#8a8a8a]">{previewError}</p>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <Loader2 className="size-5 animate-spin text-[#2c6ecb]" />
                <p className="text-[12px] text-[#8a8a8a]">Loading preview…</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-3">
        <div className="min-w-0">
          <p className="truncate text-[12px] text-[#8a8a8a]">
            {toEmails.length === 0
              ? "Select at least one To recipient."
              : `Sending to ${toEmails.length} recipient${toEmails.length === 1 ? "" : "s"}${ccEmails.length ? ` · ${ccEmails.length} CC` : ""}.`}
          </p>
          {sendError ? (
            <p className="mt-1 text-[12px] font-medium text-[#b42318]">
              {sendError}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            className={cn(dashboardControlClass, "h-9")}
            onClick={onBack}
            disabled={sending}
          >
            Back
          </Button>
          <Button
            type="button"
            className={cn(dashboardGhostButtonClass, "h-9")}
            onClick={onCancel}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={cn(dashboardPrimaryButtonClass, "h-9")}
            disabled={!canSend}
            onClick={() => void handleSend()}
          >
            {sending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            {sending ? "Sending…" : "Send to customer"}
          </Button>
        </div>
      </div>
    </div>
  );
}

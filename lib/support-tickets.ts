export const SUPPORT_TICKET_CATEGORIES = [
  { value: "bug", label: "Bug", description: "Something isn't working correctly" },
  {
    value: "suggestion",
    label: "Suggestion",
    description: "An idea to improve your workflow",
  },
  {
    value: "improvement",
    label: "Improvement",
    description: "Make an existing feature better",
  },
  {
    value: "feature",
    label: "Feature request",
    description: "Something new you'd like FloPilot to build",
  },
  { value: "other", label: "Other", description: "General feedback" },
] as const;

export const SUPPORT_TICKET_PRIORITIES = [
  { value: "low", label: "Nice to have" },
  { value: "medium", label: "Important" },
  { value: "high", label: "Blocking my work" },
] as const;

export const SUPPORT_TICKET_STATUSES = [
  { value: "open", label: "Open", color: "bg-sky-100 text-sky-800" },
  { value: "in_review", label: "In review", color: "bg-amber-100 text-amber-900" },
  { value: "planned", label: "Planned", color: "bg-violet-100 text-violet-900" },
  { value: "done", label: "Done", color: "bg-emerald-100 text-emerald-900" },
  { value: "closed", label: "Closed", color: "bg-slate-100 text-slate-700" },
] as const;

export type SupportTicketCategory =
  (typeof SUPPORT_TICKET_CATEGORIES)[number]["value"];
export type SupportTicketPriority =
  (typeof SUPPORT_TICKET_PRIORITIES)[number]["value"];
export type SupportTicketStatus =
  (typeof SUPPORT_TICKET_STATUSES)[number]["value"];

export type SupportTicketActivityType =
  | "created"
  | "status_changed"
  | "assigned"
  | "unassigned"
  | "note_updated";

export type SupportTicketActivity = {
  id: string;
  type: SupportTicketActivityType;
  actorMemberId: string;
  actorName: string;
  message: string;
  fromStatus?: SupportTicketStatus;
  toStatus?: SupportTicketStatus;
  assigneeMemberId?: string;
  assigneeName?: string;
  createdAt: string;
};

export type SupportTicket = {
  id: string;
  tenantId: string;
  tenantName: string;
  userId: string;
  userEmail: string;
  userName: string;
  title: string;
  category: SupportTicketCategory;
  description: string;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  pageUrl: string;
  attachmentUrl: string;
  attachmentName: string;
  adminNote: string;
  assignedToMemberId: string;
  assignedToName: string;
  assignedToEmail: string;
  activity: SupportTicketActivity[];
  createdAt: string;
  updatedAt: string;
};

export function supportTicketCategoryLabel(category: SupportTicketCategory) {
  return (
    SUPPORT_TICKET_CATEGORIES.find((item) => item.value === category)?.label ??
    category
  );
}

export function supportTicketPriorityLabel(priority: SupportTicketPriority) {
  return (
    SUPPORT_TICKET_PRIORITIES.find((item) => item.value === priority)?.label ??
    priority
  );
}

export const SUPPORT_TICKET_BOARD_STATUSES = [
  "open",
  "in_review",
  "planned",
  "done",
] as const satisfies readonly SupportTicketStatus[];

export function supportTicketBoardStatus(
  status: SupportTicketStatus
): (typeof SUPPORT_TICKET_BOARD_STATUSES)[number] {
  if (status === "closed") return "done";
  if (
    SUPPORT_TICKET_BOARD_STATUSES.includes(
      status as (typeof SUPPORT_TICKET_BOARD_STATUSES)[number]
    )
  ) {
    return status as (typeof SUPPORT_TICKET_BOARD_STATUSES)[number];
  }
  return "open";
}

export function teamTicketColumnDropId(status: SupportTicketStatus) {
  return `team-ticket-${status}`;
}

export function parseTeamTicketColumnDropId(id: string): SupportTicketStatus | null {
  if (!id.startsWith("team-ticket-")) return null;
  const status = id.slice("team-ticket-".length) as SupportTicketStatus;
  return SUPPORT_TICKET_STATUSES.some((item) => item.value === status)
    ? status
    : null;
}

export function supportTicketStatusMeta(status: SupportTicketStatus) {
  return (
    SUPPORT_TICKET_STATUSES.find((item) => item.value === status) ?? {
      value: status,
      label: status,
      color: "bg-slate-100 text-slate-700",
    }
  );
}

const FEEDBACK_ATTACHMENT_MAX_BYTES = 600_000;
const FEEDBACK_ATTACHMENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export async function readFeedbackAttachmentAsDataUrl(
  file: File
): Promise<{ dataUrl: string; error?: string }> {
  if (
    !FEEDBACK_ATTACHMENT_TYPES.includes(
      file.type as (typeof FEEDBACK_ATTACHMENT_TYPES)[number]
    )
  ) {
    return { dataUrl: "", error: "Use PNG, JPG, WebP, or GIF." };
  }

  if (file.size > FEEDBACK_ATTACHMENT_MAX_BYTES) {
    return { dataUrl: "", error: "Image must be under 600 KB." };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result.startsWith("data:image/")) {
        resolve({ dataUrl: "", error: "Could not read image file." });
        return;
      }
      resolve({ dataUrl: result });
    };
    reader.onerror = () => {
      resolve({ dataUrl: "", error: "Could not read image file." });
    };
    reader.readAsDataURL(file);
  });
}

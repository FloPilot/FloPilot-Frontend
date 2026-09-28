import type { Customer, CustomerNote, CustomerNotePriority } from "@/types";

export const MAX_CUSTOMER_ACCOUNT_NOTES = 40;

export const CUSTOMER_NOTE_PRIORITY_OPTIONS: {
  value: CustomerNotePriority;
  label: string;
  description: string;
}[] = [
  {
    value: "normal",
    label: "Normal",
    description: "General account note",
  },
  {
    value: "high",
    label: "High priority",
    description: "Call this out for the team",
  },
  {
    value: "warning",
    label: "Customer warning",
    description: "Shown when creating orders for this account",
  },
];

export function createCustomerNoteId() {
  return `cnote-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function sortCustomerAccountNotes(
  notes: CustomerNote[]
): CustomerNote[] {
  const rank: Record<CustomerNotePriority, number> = {
    warning: 0,
    high: 1,
    normal: 2,
  };
  return [...notes].sort((a, b) => {
    const byPriority = rank[a.priority] - rank[b.priority];
    if (byPriority !== 0) return byPriority;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

/** Prefer structured accountNotes; fall back to legacy scalar notes. */
export function resolveCustomerAccountNotes(
  customer: Pick<Customer, "accountNotes" | "notes" | "customerSince">
): CustomerNote[] {
  if (customer.accountNotes && customer.accountNotes.length > 0) {
    return sortCustomerAccountNotes(customer.accountNotes);
  }

  const legacy = customer.notes?.trim();
  if (!legacy) return [];

  const stamp = customer.customerSince || new Date().toISOString();
  return [
    {
      id: "legacy-notes",
      content: legacy,
      priority: "normal",
      createdAt: stamp,
      updatedAt: stamp,
    },
  ];
}

export function getCustomerWarningNotes(
  customer: Pick<Customer, "accountNotes" | "notes" | "customerSince"> | null | undefined
): CustomerNote[] {
  if (!customer) return [];
  return resolveCustomerAccountNotes(customer).filter(
    (note) => note.priority === "warning"
  );
}

export function customerHasWarning(
  customer: Pick<Customer, "accountNotes" | "notes" | "customerSince"> | null | undefined
): boolean {
  return getCustomerWarningNotes(customer).length > 0;
}

export function customerNotePriorityLabel(priority: CustomerNotePriority) {
  return (
    CUSTOMER_NOTE_PRIORITY_OPTIONS.find((option) => option.value === priority)
      ?.label ?? "Normal"
  );
}

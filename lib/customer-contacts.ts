import type { Customer, CustomerContact } from "@/types";

export const MAX_CUSTOMER_CONTACTS = 50;

export function createCustomerContactId(): string {
  return `cct-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function sortCustomerContacts(
  contacts: CustomerContact[] = []
): CustomerContact[] {
  return [...contacts].sort((a, b) => a.name.localeCompare(b.name));
}

export function findCustomerContact(
  customer: Customer | null | undefined,
  contactId?: string | null
): CustomerContact | undefined {
  if (!customer?.contacts?.length || !contactId) return undefined;
  return customer.contacts.find((entry) => entry.id === contactId);
}

export function customerContactSummary(contact: CustomerContact): string {
  const parts = [
    contact.position,
    contact.department,
    contact.email,
    contact.phone,
  ]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);
  return parts.join(" · ") || "No contact details yet";
}

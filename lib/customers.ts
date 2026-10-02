import type { Customer, CustomerBillingAddress } from "@/types";

export type NewCustomerInput = {
  company: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  notes?: string;
  logoUrl?: string | null;
  accentColorKey?: string | null;
};

export const US_STATES: { value: string; label: string }[] = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
];

export const EMPTY_NEW_CUSTOMER: NewCustomerInput = {
  company: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  notes: "",
};

export function normalizeBillingAddress(
  value: Customer["billingAddress"]
): CustomerBillingAddress | null {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return {
      line1: trimmed,
      city: "",
      state: "",
      postalCode: "",
    };
  }
  const line1 = String(value.line1 || "").trim();
  const line2 = String(value.line2 || "").trim();
  const city = String(value.city || "").trim();
  const state = String(value.state || "").trim();
  const postalCode = String(value.postalCode || "").trim();
  if (!line1 && !line2 && !city && !state && !postalCode) return null;
  return {
    line1,
    ...(line2 ? { line2 } : {}),
    city,
    state,
    postalCode,
    ...(value.country ? { country: value.country } : {}),
  };
}

export function buildBillingAddressFromInput(
  input: Pick<
    NewCustomerInput,
    "addressLine1" | "addressLine2" | "city" | "state" | "postalCode"
  >
): CustomerBillingAddress {
  const line2 = input.addressLine2?.trim() || "";
  return {
    line1: input.addressLine1.trim(),
    ...(line2 ? { line2 } : {}),
    city: input.city.trim(),
    state: input.state.trim(),
    postalCode: input.postalCode.trim(),
    country: "US",
  };
}

/** Single-line display for lists and summaries. */
export function formatCustomerBillingAddress(
  customer: Pick<Customer, "billingAddress" | "city" | "state" | "postalCode">
): string {
  const structured = normalizeBillingAddress(customer.billingAddress);
  if (structured) {
    if (
      typeof customer.billingAddress === "string" &&
      !structured.city &&
      !structured.state
    ) {
      return structured.line1;
    }
    const street = [structured.line1, structured.line2]
      .filter(Boolean)
      .join(", ");
    const cityLine = [structured.city, structured.state, structured.postalCode]
      .filter(Boolean)
      .join(", ")
      .replace(/,\s*,/g, ",")
      .replace(/^,\s*|,\s*$/g, "");
    // Prefer "City, ST ZIP" spacing for postal
    const cityStateZip = [
      structured.city,
      [structured.state, structured.postalCode].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(", ");
    return [street, cityStateZip || cityLine].filter(Boolean).join(", ");
  }

  return [
    customer.city,
    [customer.state, customer.postalCode].filter(Boolean).join(" "),
  ]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(", ");
}

/** Form fields for edit dialogs — prefers structured billing, then legacy. */
export function billingFieldsFromCustomer(
  customer: Customer
): Pick<
  NewCustomerInput,
  "addressLine1" | "addressLine2" | "city" | "state" | "postalCode"
> {
  const structured = normalizeBillingAddress(customer.billingAddress);
  if (structured) {
    return {
      addressLine1: structured.line1,
      addressLine2: structured.line2 ?? "",
      city: structured.city || customer.city || "",
      state: structured.state || customer.state || "",
      postalCode: structured.postalCode || customer.postalCode || "",
    };
  }
  return {
    addressLine1: "",
    addressLine2: "",
    city: customer.city ?? "",
    state: customer.state ?? "",
    postalCode: customer.postalCode ?? "",
  };
}

export function createCustomerId(): string {
  return `cust-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function formatCustomerFullName(
  customer: Pick<Customer, "name" | "firstName" | "lastName">
): string {
  const first = customer.firstName?.trim();
  const last = customer.lastName?.trim();
  if (first || last) {
    return [first, last].filter(Boolean).join(" ");
  }
  return customer.name;
}

export function validateNewCustomer(input: NewCustomerInput): string | null {
  if (!input.company.trim()) return "Company name is required.";
  if (!input.firstName.trim()) return "First name is required.";
  if (!input.lastName.trim()) return "Last name is required.";
  if (!input.email.trim()) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    return "Enter a valid email address.";
  }
  if (!input.phone.trim()) return "Phone number is required.";
  if (!input.addressLine1.trim()) return "Address is required.";
  if (!input.city.trim()) return "City is required.";
  if (!input.state.trim()) return "State is required.";
  if (!input.postalCode.trim()) return "ZIP code is required.";
  return null;
}

export function buildCustomerFromInput(input: NewCustomerInput): Customer {
  const today = new Date().toISOString().slice(0, 10);
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const name = [firstName, lastName].filter(Boolean).join(" ");
  const billingAddress = buildBillingAddressFromInput(input);

  return {
    id: createCustomerId(),
    company: input.company.trim(),
    firstName,
    lastName,
    name,
    email: input.email.trim(),
    phone: input.phone.trim(),
    billingAddress,
    city: billingAddress.city,
    state: billingAddress.state,
    postalCode: billingAddress.postalCode,
    totalOrders: 0,
    lifetimeValue: 0,
    customerSince: today,
    notes: input.notes?.trim() || undefined,
    ...(input.logoUrl ? { logoUrl: input.logoUrl } : {}),
    ...(input.accentColorKey ? { accentColorKey: input.accentColorKey } : {}),
  };
}

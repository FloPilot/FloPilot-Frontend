import type { Customer } from "@/types";

export type NewCustomerInput = {
  company: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  notes?: string;
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
  city: "",
  state: "",
  notes: "",
};

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
  if (!input.city.trim()) return "City is required.";
  if (!input.state.trim()) return "State is required.";
  return null;
}

export function buildCustomerFromInput(input: NewCustomerInput): Customer {
  const today = new Date().toISOString().slice(0, 10);
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const name = [firstName, lastName].filter(Boolean).join(" ");

  return {
    id: createCustomerId(),
    company: input.company.trim(),
    firstName,
    lastName,
    name,
    email: input.email.trim(),
    phone: input.phone.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    totalOrders: 0,
    lifetimeValue: 0,
    customerSince: today,
    notes: input.notes?.trim() || undefined,
  };
}

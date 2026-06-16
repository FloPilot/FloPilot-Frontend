import {
  ClipboardList,
  Factory,
  FileImage,
  Monitor,
  Package,
  Palette,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";

export const MARKETING_NAV = [
  { label: "Features", href: "/features" },
  { label: "Use cases", href: "/use-cases" },
  { label: "How it works", href: "/how-it-works" },
  { label: "FAQ", href: "/faq" },
] as const;

export const PROBLEM_POINTS = [
  {
    title: "Fragmented tools",
    description:
      "Orders in one place. Production on a whiteboard. Artwork in email. Inventory in a spreadsheet. Nothing talks to anything.",
  },
  {
    title: "Reactive firefighting",
    description:
      "Your team spends more time chasing problems than preventing them. Every rush job is a scramble. Every missed proof is a reprint.",
  },
  {
    title: "Invisible waste",
    description:
      "Missed deadlines, idle machine time, and rework you can't see until the week's already blown. The cost is real — you just can't measure it.",
  },
] as const;

export const HOME_EXPLORE = [
  {
    label: "Features",
    href: "/features",
    title: "Built for the work shops actually do",
    description:
      "Orders, production, stations, artwork, inventory, and a branded customer portal.",
  },
  {
    label: "Use cases",
    href: "/use-cases",
    title: "Every role, the right view",
    description:
      "Owners, production leads, floor operators, and warehouse — each with tailored access.",
  },
  {
    label: "How it works",
    href: "/how-it-works",
    title: "Live in three steps",
    description:
      "Create your shop, run orders through production, and keep customers in the loop.",
  },
] as const;

export const OPERATIONAL_STAGES = [
  {
    icon: "quote" as const,
    title: "Quote & order",
    description:
      "Capture customers, line items, and job details — then kick off production from a single starting point.",
  },
  {
    icon: "schedule" as const,
    title: "Schedule",
    description:
      "Put jobs on the calendar and machines in real time. No more cross-referencing whiteboards and spreadsheets.",
  },
  {
    icon: "produce" as const,
    title: "Produce",
    description:
      "Run events on the floor with focused station views. Operators see only what's running and what's next.",
  },
  {
    icon: "deliver" as const,
    title: "Deliver",
    description:
      "Proof approvals, customer updates, and job close-out — cleanly finish every order in one place.",
  },
] as const;

export const HERO_STATS = [
  { value: "Quote → ship", label: "One connected workflow" },
  { value: "White-label", label: "Your brand, your portal" },
  { value: "Floor-ready", label: "Stations & production views" },
] as const;

export const FEATURE_SHOWCASE_TABS = [
  {
    id: "orders",
    title: "Order lifecycle",
    tagline: "Every order. Every stage. One operational view.",
    description:
      "Quotes, line items, customer history, and job status — linked together so nothing falls through the cracks between sales and production.",
  },
  {
    id: "production",
    title: "Production scheduling",
    tagline: "Calendar and floor workflow in sync.",
    description:
      "Schedule jobs across departments and machines. Your team sees what's due today, what's running, and what's waiting — without a separate whiteboard.",
  },
  {
    id: "stations",
    title: "Machine stations",
    tagline: "Operators see only what matters on the floor.",
    description:
      "Focused station views for decorators and press operators — start runs, report issues, and see what's next without the full back office.",
  },
  {
    id: "artwork",
    title: "Artwork & proofs",
    tagline: "Never start production on the wrong file.",
    description:
      "Track proofs and approvals before ink hits the garment. Production waits until artwork is signed off — saving reprints and rush fees.",
  },
  {
    id: "portal",
    title: "Customer portal",
    tagline: "Your brand. Their order status. Always current.",
    description:
      "Customers log in under your shop's name to approve proofs, check progress, and stay informed — so you spend less time on status calls.",
  },
] as const;

export type FeatureShowcaseId = (typeof FEATURE_SHOWCASE_TABS)[number]["id"];

export const RESULT_CALLOUT_STATS = [
  {
    value: "12+ hrs",
    label: "saved per week coordinating orders and production",
  },
  {
    value: "3 tools",
    label: "replaced — spreadsheets, email threads, and whiteboards",
  },
  {
    value: "Minutes",
    label: "to give floor staff a focused station-only view",
  },
] as const;

export type IntegrationPartner = {
  name: string;
  abbr: string;
  color: string;
  textColor?: string;
};

export const INTEGRATION_PARTNERS = {
  left: [
    { name: "S&S Activewear", abbr: "S&S", color: "#c8102e" },
    { name: "SanMar", abbr: "SM", color: "#003da5" },
    { name: "Alphabroder", abbr: "AB", color: "#f57c00", textColor: "#fff" },
    { name: "Augusta Sportswear", abbr: "AG", color: "#1a1a1a" },
  ],
  right: [
    { name: "QuickBooks", abbr: "QB", color: "#2ca01c" },
    { name: "Printavo", abbr: "Pv", color: "#6366f1" },
    { name: "InkSoft", abbr: "IS", color: "#0ea5e9" },
    { name: "YoPrint", abbr: "YP", color: "#8b5cf6" },
  ],
} as const satisfies { left: IntegrationPartner[]; right: IntegrationPartner[] };

export const FEATURES: {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: ClipboardList,
    title: "Orders & quoting",
    description:
      "Capture jobs, line items, and customer details in one place — from quick reorders to complex multi-decoration runs.",
  },
  {
    icon: Factory,
    title: "Production scheduling",
    description:
      "Move work through departments with tasks, calendars, and schedules your team can actually follow on the floor.",
  },
  {
    icon: Monitor,
    title: "Machine stations",
    description:
      "Give operators a focused station view — upcoming jobs, active runs, and issue reporting without the full back office.",
  },
  {
    icon: FileImage,
    title: "Artwork & proofs",
    description:
      "Track proofs and approvals so production never starts on the wrong file. Customers see progress in their portal.",
  },
  {
    icon: Users,
    title: "Customer portal",
    description:
      "Let customers check order status, approve artwork, and stay in the loop — under your shop's name and branding.",
  },
  {
    icon: Shield,
    title: "Team permissions",
    description:
      "Invite decorators, warehouse staff, and managers with tailored access — only the tabs and stations they need.",
  },
  {
    icon: Package,
    title: "Inventory",
    description:
      "Keep materials and stock visible for the people who pick, pack, and replenish — without cluttering everyone else's view.",
  },
  {
    icon: Palette,
    title: "Your brand",
    description:
      "Set your logo and colors so the staff workspace and customer portal feel like your shop — not generic software.",
  },
];

export const USE_CASES: {
  role: string;
  headline: string;
  description: string;
  highlights: string[];
}[] = [
  {
    role: "Shop owner",
    headline: "See the whole business at a glance",
    description:
      "Dashboard KPIs, open orders, and production load — so you know what's shipping this week and what's stuck.",
    highlights: ["Dashboard overview", "Reports & exports", "Shop settings & branding"],
  },
  {
    role: "Production lead",
    headline: "Keep the floor moving",
    description:
      "Schedule jobs across machines, assign tasks, and spot bottlenecks before they become missed deadlines.",
    highlights: ["Production calendar", "Department tasks", "Machine scheduling"],
  },
  {
    role: "Floor operator",
    headline: "Just their station, nothing extra",
    description:
      "A decorator opens their press. A screen printer sees their machine. No hunting through menus they don't need.",
    highlights: ["Station-focused view", "Start & complete runs", "Report issues fast"],
  },
  {
    role: "Warehouse & fulfillment",
    headline: "Inventory without the noise",
    description:
      "Stock levels and materials for the people who need them — without exposing pricing, quotes, or admin settings.",
    highlights: ["Inventory tab only", "Materials tracking", "Simple, focused UI"],
  },
];

export const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create your shop",
    description:
      "Sign up, name your shop, and invite your team. Set your logo and brand colors in minutes.",
  },
  {
    step: "02",
    title: "Run orders through production",
    description:
      "Quotes become jobs. Jobs hit the calendar and machines. Everyone works from the same live data.",
  },
  {
    step: "03",
    title: "Customers stay in the loop",
    description:
      "Share the customer portal for proofs and status. You look professional; they stay informed.",
  },
] as const;

export const WORKFLOW_STEPS = [
  { label: "Quote", detail: "Capture the job" },
  { label: "Approve", detail: "Artwork signed off" },
  { label: "Schedule", detail: "On the calendar" },
  { label: "Produce", detail: "Floor execution" },
  { label: "Deliver", detail: "Ship & complete" },
] as const;

export const FAQ_ITEMS = [
  {
    question: "Who is FloPilot built for?",
    answer:
      "Screen printers, embroiderers, DTF shops, sign shops, and decorated apparel businesses that need one system from quote to delivery — without enterprise complexity.",
  },
  {
    question: "Can I use my own branding?",
    answer:
      "Yes. Upload your logo, pick your brand color, and your staff workspace and customer portal reflect your shop — not ours.",
  },
  {
    question: "Can I limit what my team sees?",
    answer:
      "Absolutely. Give warehouse staff inventory-only access, or let a decorator see just their machine station. Admins control roles and custom tab access.",
  },
  {
    question: "Is there a customer-facing portal?",
    answer:
      "Yes. Customers can log in to view orders, approve proofs, and track progress — hosted under your shop's branding.",
  },
  {
    question: "Is FloPilot ready for production use?",
    answer:
      "We're actively building and improving FloPilot with early shops. Sign up to get started — we're onboarding teams as we expand features.",
  },
  {
    question: "How does pricing work?",
    answer:
      "We're still in development and haven't launched public pricing yet. Create your shop to explore the platform — we'll share plans before anything is billed.",
  },
] as const;

export const INDUSTRY_TAGS = [
  "Screen printing",
  "Embroidery",
  "DTF & heat transfer",
  "Sign & wide format",
  "Promotional products",
  "Contract decorators",
] as const;

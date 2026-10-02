export type HelpDocSectionId =
  | "getting-started"
  | "dashboard"
  | "orders"
  | "order-detail"
  | "documents"
  | "customers"
  | "production"
  | "designs-files"
  | "calendar-machines"
  | "stores-warehouse"
  | "reports-tasks"
  | "settings";

export type HelpDocArticle = {
  id: string;
  sectionId: HelpDocSectionId;
  title: string;
  summary: string;
  /** Free-text keywords for search (title/summary/body also searched). */
  keywords: string[];
  /** Optional screenshot under /help-docs/ */
  image?: string;
  imageAlt?: string;
  steps?: string[];
  tips?: string[];
  body: string[];
};

export type HelpDocSection = {
  id: HelpDocSectionId;
  label: string;
  description: string;
};

export const HELP_DOC_SECTIONS: HelpDocSection[] = [
  {
    id: "getting-started",
    label: "Getting started",
    description: "How FloPilot is organized and how to move around the shop.",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Your shop snapshot — due work, revenue, and what’s on the floor.",
  },
  {
    id: "orders",
    label: "Orders",
    description: "Find, filter, and create sales orders.",
  },
  {
    id: "order-detail",
    label: "Inside an order",
    description: "Events, blanks, proofs, estimate, receiving, and invoice.",
  },
  {
    id: "documents",
    label: "Documents",
    description: "Estimates and invoices across every order.",
  },
  {
    id: "customers",
    label: "Customers",
    description: "Customer profiles, contacts, and history.",
  },
  {
    id: "production",
    label: "Production & departments",
    description: "Floor boards, department queues, and production tasks.",
  },
  {
    id: "designs-files",
    label: "Designs & files",
    description: "Artwork library and shop files.",
  },
  {
    id: "calendar-machines",
    label: "Calendar & machines",
    description: "Schedule runs and manage stations.",
  },
  {
    id: "stores-warehouse",
    label: "Stores & warehouse",
    description: "Client stores and inventory.",
  },
  {
    id: "reports-tasks",
    label: "Reports, tasks & alerts",
    description: "Reporting, personal tasks, and notifications.",
  },
  {
    id: "settings",
    label: "Settings",
    description: "Shop setup, pricing, team, and integrations.",
  },
];

export const HELP_DOC_ARTICLES: HelpDocArticle[] = [
  {
    id: "welcome",
    sectionId: "getting-started",
    title: "Welcome to FloPilot",
    summary:
      "FloPilot is your print shop workspace — orders, production, design, and accounting in one place.",
    keywords: ["intro", "overview", "help", "guide", "how to"],
    image: "/help-docs/dashboard.png",
    imageAlt: "Premier Ikon dashboard overview",
    body: [
      "Use the left sidebar to move between areas of the shop. The top bar stays with you everywhere: search, workspace filters, notifications, Docs, and your shop identity.",
      "Most day-to-day work happens on Orders. Open an order to manage decorations (events), blanks, proofs, pricing, receiving, and the invoice — all in one place.",
      "When something is unfinished, the dark Save / Discard bar appears in the top bar. Save before leaving a page, or Discard to undo. Trying to leave with unsaved work triggers a blue shake so you don’t lose edits.",
    ],
    tips: [
      "Press ⌘K (Ctrl+K) anytime to search orders, customers, designs, and more.",
      "Switch shops from the shop name in the top-right if you belong to more than one workspace.",
    ],
  },
  {
    id: "workspace-filters",
    sectionId: "getting-started",
    title: "Workspace filters & My work",
    summary:
      "Narrow the whole app to a teammate, customer, or your own assignments.",
    keywords: ["filter", "my work", "team", "scope", "rep"],
    body: [
      "The filter control in the top bar opens workspace filters. Choose a teammate and/or customer to focus lists, dashboards, and queues on that slice of work.",
      "My work focuses the view on items assigned to you. Save view stores the current filter combination so you can return to it quickly.",
      "A blue dot on the filter icon means a workspace filter is active — click it to review or clear.",
    ],
    steps: [
      "Click the filter icon in the top bar (or expand the workspace strip under the header).",
      "Pick All team / a teammate and All customers / a customer.",
      "Optionally click My work, then Save view if you want to reuse the combination.",
    ],
  },
  {
    id: "global-search",
    sectionId: "getting-started",
    title: "Global search",
    summary: "Jump to an order, customer, design, or file without hunting menus.",
    keywords: ["search", "command", "⌘k", "find"],
    body: [
      "The search field in the top bar (or ⌘K / Ctrl+K) searches across the shop.",
      "Type an SO number, customer name, design title, or file name. Pick a result to open it immediately.",
      "When you have unsaved changes, the search field temporarily swaps for the Save / Discard bar so you don’t lose work.",
    ],
  },
  {
    id: "dashboard-overview",
    sectionId: "dashboard",
    title: "Reading the dashboard",
    summary:
      "Revenue, pipeline, due/overdue work, floor status, and recent orders at a glance.",
    keywords: ["home", "kpi", "metrics", "overdue", "customize"],
    image: "/help-docs/dashboard.png",
    imageAlt: "Dashboard with KPI cards and action queues",
    body: [
      "The dashboard is your morning briefing. KPI cards show revenue, order volume, pipeline value, and average order value for the selected date range.",
      "Status chips (due/overdue, to schedule) jump into the work that needs attention. Task and production sections summarize open, urgent, and in-progress items.",
      "Use Customize and the dashboard view picker to rearrange widgets for your role — sales, production, or owners can each keep a different layout.",
    ],
    steps: [
      "Open Dashboard from the sidebar.",
      "Set Last 14 days (or another range) and optionally filter by machine.",
      "Click a KPI or queue row to open the related orders or tasks.",
      "Click Customize to add, remove, or rearrange dashboard cards.",
    ],
    tips: [
      "Due · overdue and On the floor cards are the fastest path into late or running jobs.",
    ],
  },
  {
    id: "orders-list",
    sectionId: "orders",
    title: "Orders list",
    summary:
      "Find every active job — filter by stage, decoration type, and custom views.",
    keywords: ["orders", "list", "filter", "csv", "new order", "active"],
    image: "/help-docs/orders.png",
    imageAlt: "Orders list with stage filters",
    body: [
      "Orders is the shop’s main queue. Stage chips (Needs art, Ready for scheduling, On floor, Blocked) show how many jobs need each kind of attention.",
      "Use Active / Historical / Archived / All to change which orders appear. Job type chips (Screen print, DTF, Embroidery, Vinyl) narrow by decoration.",
      "Customize view changes columns. Export CSV downloads the current filtered list for spreadsheets or accounting.",
    ],
    steps: [
      "Go to Orders in the sidebar.",
      "Pick Active (day-to-day) or All if you’re hunting an older job.",
      "Click a stage chip or Add filter to refine.",
      "Open a row to work the order, or click New order to start one.",
    ],
    tips: [
      "If the list looks empty, check workspace filters (top bar) and the Active vs All toggle.",
    ],
  },
  {
    id: "create-order",
    sectionId: "orders",
    title: "Create a new order",
    summary: "Start a sales order for an existing or new customer.",
    keywords: ["new order", "create", "quote", "sales order"],
    body: [
      "Click New order on the Orders page (or from other quick-create entry points).",
      "Choose the customer, set in-hands date and basics, then save. You’ll land on the order detail to add events, blanks, and pricing.",
      "Unsaved create forms also use the Save / Discard bar — don’t navigate away until you’ve saved or discarded.",
    ],
    steps: [
      "Click New order.",
      "Select or create the customer.",
      "Set order name (optional), in-hands date, and sales rep if needed.",
      "Save, then add production events and blanks on the order.",
    ],
  },
  {
    id: "order-requests",
    sectionId: "orders",
    title: "Order requests",
    summary:
      "Inbound requests from the customer portal — review and convert into shop orders.",
    keywords: ["request", "portal", "inbound", "quote request"],
    body: [
      "Order requests collects submissions from customers (portal / client store flows).",
      "Open a request to review garments, decorations, and notes, then convert it into a full FloPilot order when you’re ready to produce.",
    ],
  },
  {
    id: "order-anatomy",
    sectionId: "order-detail",
    title: "Order detail anatomy",
    summary:
      "Header, tabs, and the action panel — everything for one job in one screen.",
    keywords: ["order detail", "tabs", "header", "status", "portal"],
    image: "/help-docs/order-detail.png",
    imageAlt: "Order detail with tabs and action panel",
    body: [
      "The order header shows the SO number, custom name, customer, in-hands date, and status. Use the action panel on the right for portal links, priority, QuickBooks push, and archive.",
      "Tabs organize the job: Events, Blanks / Garments, Proofs, Estimate, Purchase order, Received goods, Shipping, Produced goods, Invoice, Files, Notes, Customer, and Activity.",
      "Suggested actions guide the next step (add events, send estimate, schedule, etc.). Follow them when you’re unsure what to do next.",
    ],
  },
  {
    id: "events-decorations",
    sectionId: "order-detail",
    title: "Events (decorations)",
    summary: "Add every imprint — screen print, embroidery, DTF, finishing, and more.",
    keywords: ["event", "imprint", "decoration", "screen print", "location"],
    body: [
      "Events are the production steps on the order. Add one for each decoration location (front left chest, full back, neck label, finishing, etc.).",
      "Each event holds artwork/proof status, materials (inks, screens), and links into scheduling once the estimate is approved.",
      "Edits to events stay in a draft until you Save from the top bar — leaving the tab without saving shakes the bar.",
    ],
    steps: [
      "Open the order → Events.",
      "Click Add event or Add production steps.",
      "Pick decoration type and location, attach artwork when ready.",
      "Save from the top bar.",
    ],
  },
  {
    id: "blanks-garments",
    sectionId: "order-detail",
    title: "Blanks / garments",
    summary: "Add products from suppliers or a manual catalog, then set sizes and qty.",
    keywords: ["blanks", "garments", "ss", "sanmar", "sizes", "receive"],
    body: [
      "Blanks / Garments is where you add apparel and hard goods. Search live supplier catalogs (when connected) or add a manual product.",
      "Set colorways and size breakdowns. Totals feed the estimate automatically.",
      "Receiving happens later on Received goods — don’t confuse adding the line with marking inventory received.",
    ],
    steps: [
      "Open Blanks / Garments.",
      "Search a supplier style or add a manual blank.",
      "Enter sizes and quantities.",
      "Save, then check Estimate to confirm pricing.",
    ],
  },
  {
    id: "proofs-estimate",
    sectionId: "order-detail",
    title: "Proofs & estimate",
    summary: "Approve art with the customer, price the job, then unlock scheduling.",
    keywords: ["proof", "estimate", "approve", "pdf", "tax", "pricing"],
    body: [
      "Proofs track artwork approval per event. Upload mockups, send to the customer, and mark approved when they sign off (or after phone/email confirmation).",
      "Estimate shows the live pricing breakdown — garments, decoration, fees, tax, and total. Use rate sheets and contract fees from Pricing & contract fees on the estimate tab.",
      "Staff can Approve estimate when the customer confirms. Approving estimate (and proofs, when required) unlocks calendar scheduling.",
    ],
    steps: [
      "Attach or upload proofs on each event / Proofs tab.",
      "Review Estimate totals; adjust tax or fees if needed.",
      "Preview PDF or Send proofs + estimate.",
      "Click Approve estimate when the customer is good to go.",
    ],
    tips: [
      "Empty orders show $0.00 — totals always come from live lines, not a stale stored subtotal.",
    ],
  },
  {
    id: "po-receiving-produced",
    sectionId: "order-detail",
    title: "PO, receiving & produced goods",
    summary: "Buy blanks, receive them, then confirm what actually left the floor.",
    keywords: ["purchase order", "receiving", "produced", "damage", "overage"],
    body: [
      "Purchase order builds supplier POs for the blanks on the job.",
      "Received goods is where you mark what arrived — including overages or shortages. Use per-size counts.",
      "Produced goods records what you actually decorated. Notes can flow to invoice comments; produced quantities can affect invoice totals when they differ from ordered qty.",
    ],
  },
  {
    id: "invoice-quickbooks",
    sectionId: "order-detail",
    title: "Invoice & QuickBooks",
    summary: "Bill the customer and push estimates or invoices to QuickBooks Online.",
    keywords: ["invoice", "payment", "quickbooks", "accounting", "push"],
    body: [
      "The Invoice tab shows amounts due, payments, and billing based on produced quantities when applicable.",
      "Push to QuickBooks (action panel) creates or updates the estimate/invoice in your connected QuickBooks company using your Products & services mappings.",
      "Map line types and extra fees under Settings → Integrations → Accounting before your first push.",
    ],
    tips: [
      "Re-pushing updates the same QuickBooks document — it won’t create a duplicate.",
    ],
  },
  {
    id: "documents-hub",
    sectionId: "documents",
    title: "Documents hub",
    summary: "Cross-order estimates and invoices in one queue.",
    keywords: ["documents", "estimates", "invoices", "queue"],
    body: [
      "Documents → Estimates and Documents → Invoices list financial docs across orders so accounting doesn’t have to open each SO.",
      "Filter and open a row to jump into the related order’s estimate or invoice tab.",
    ],
  },
  {
    id: "customers-guide",
    sectionId: "customers",
    title: "Customers",
    summary: "Profiles, contacts, addresses, tax docs, and order history.",
    keywords: ["customer", "contact", "address", "tax", "portal"],
    image: "/help-docs/customers.png",
    imageAlt: "Customers list",
    body: [
      "Customers stores companies and people you sell to. Open a profile for contacts, bill-to/ship-to addresses, tax documents, files, and lifetime order history.",
      "From an order you can jump to the customer profile, and from the profile you can open related orders.",
      "Customer portal links (on the order) let clients review proofs and estimates without a staff login.",
    ],
    steps: [
      "Open Customers → New customer (or search an existing one).",
      "Add contacts and addresses.",
      "Attach tax documents if the account is exempt.",
      "Create orders from the profile or the Orders page.",
    ],
  },
  {
    id: "production-board",
    sectionId: "production",
    title: "Production",
    summary: "Shop-wide production tasks and status.",
    keywords: ["production", "floor", "pipeline", "tasks"],
    image: "/help-docs/production.png",
    imageAlt: "Production area",
    body: [
      "Production aggregates work that’s in progress across the shop — useful for leads who need the big picture beyond a single department.",
      "Update status from production cards or jump into the order/event for detail.",
    ],
  },
  {
    id: "departments",
    sectionId: "production",
    title: "Departments",
    summary: "Art, press, finishing, and other department queues.",
    keywords: ["department", "art", "press", "qc", "queue"],
    image: "/help-docs/departments.png",
    imageAlt: "Departments overview with art, screens, press queues",
    body: [
      "Departments breaks the floor into focused queues (art, press, QC & packing, and others enabled for your shop).",
      "Each department list shows events ready for that team. Open an item to update status, claim work, or open the full order.",
    ],
    tips: [
      "Department modules can be turned on/off in Settings → Workspace / Modules.",
    ],
  },
  {
    id: "designs-artwork",
    sectionId: "designs-files",
    title: "Designs & artwork",
    summary: "Reusable artwork library tied to orders and imprints.",
    keywords: ["design", "artwork", "library", "mockup"],
    body: [
      "Designs (Artwork) is your library of reusable art. Open a design to manage files, placements, and linked orders.",
      "Attach designs to order events so proofs and production all reference the same art asset.",
    ],
  },
  {
    id: "files",
    sectionId: "designs-files",
    title: "Files",
    summary: "Shop files — all files, artwork, and screens.",
    keywords: ["files", "screens", "upload", "assets"],
    body: [
      "Files holds shop-wide assets. Use Artwork and Screens filters when you’re looking for print-ready or screen-burn assets specifically.",
      "Order-specific files also live on the order’s Files tab.",
    ],
  },
  {
    id: "calendar",
    sectionId: "calendar-machines",
    title: "Calendar",
    summary: "Schedule approved jobs onto machines and days.",
    keywords: ["calendar", "schedule", "machine", "capacity"],
    image: "/help-docs/calendar.png",
    imageAlt: "Production calendar",
    body: [
      "Calendar is where approved work gets a time and a machine. Drag or place events onto stations based on capacity.",
      "Orders generally need an approved estimate before they appear ready to schedule.",
      "Click an event on the calendar to reschedule, reassign, or jump back to the order.",
    ],
    steps: [
      "Approve the estimate on the order.",
      "Open Calendar.",
      "Find the job in the scheduling queue.",
      "Place it on a machine and time slot.",
    ],
  },
  {
    id: "machines",
    sectionId: "calendar-machines",
    title: "Machines & stations",
    summary: "Configure presses and stations, then run work from station views.",
    keywords: ["machine", "station", "press", "capacity"],
    body: [
      "Machines → Stations shows live station boards. Machines → Settings (admin) defines presses, speeds, and which decorations they support.",
      "Station views are built for the floor — start/stop jobs without opening the full order every time.",
    ],
  },
  {
    id: "client-stores",
    sectionId: "stores-warehouse",
    title: "Client stores",
    summary: "Branded stores for employees or end buyers with credits and checkout.",
    keywords: ["store", "client store", "credits", "merch"],
    body: [
      "Client Stores let you publish a branded catalog for a customer’s team. Configure products, employees, and store credits.",
      "Orders from stores flow back into FloPilot for fulfillment.",
    ],
  },
  {
    id: "warehouse",
    sectionId: "stores-warehouse",
    title: "Warehouse",
    summary: "Inventory and warehouse views for blanks and goods you stock.",
    keywords: ["warehouse", "inventory", "stock"],
    body: [
      "Warehouse (Inventory) tracks stocked goods when the inventory module is enabled.",
      "Receiving on orders still handles job-specific blanks; warehouse is for broader stock positions.",
    ],
  },
  {
    id: "reports",
    sectionId: "reports-tasks",
    title: "Reports",
    summary: "Sales, production, and custom reports for owners and managers.",
    keywords: ["reports", "analytics", "sales", "export"],
    body: [
      "Reports turns shop data into insight — sales over time, customer performance, and custom report builders.",
      "Pick a date range, run a report, and export when you need to share outside FloPilot.",
    ],
  },
  {
    id: "tasks-notifications",
    sectionId: "reports-tasks",
    title: "Tasks & notifications",
    summary: "Personal to-dos and shop alerts in one place.",
    keywords: ["tasks", "notifications", "bell", "assigned"],
    body: [
      "Tasks lists work assigned to you. Notifications (bell in the top bar) covers approvals, messages, and other shop alerts.",
      "The red badge on the bell is unread count. Open the menu for a quick triage, or View all for the full notifications page.",
    ],
  },
  {
    id: "settings-overview",
    sectionId: "settings",
    title: "Settings overview",
    summary: "Company, branding, documents, team, shop setup, pricing, and integrations.",
    keywords: ["settings", "admin", "setup", "modules"],
    image: "/help-docs/settings.png",
    imageAlt: "Settings company information",
    body: [
      "Settings is organized by area: Company setup, Appearance, Documents, Team, Workspace, Shop setup, Pricing, Integrations, and Support.",
      "Admins configure decoration locations, rate sheets, machines, finishing steps, suppliers, QuickBooks, and payments here.",
      "Many settings pages use the same Save / Discard bar as orders — edit freely, then save once.",
    ],
  },
  {
    id: "shop-pricing",
    sectionId: "settings",
    title: "Shop setup & pricing",
    summary: "Decoration types, locations, rate sheets, markup, and finishing.",
    keywords: ["pricing matrix", "rate sheet", "markup", "finishing", "print locations"],
    body: [
      "Shop setup covers machines & stations, decoration locations, design placements, screen print / embroidery / DTF defaults, finishing services, and warehouse defaults.",
      "Pricing matrix and Default markup drive how estimates calculate garment and decoration prices. Rate sheets on an order can override shop defaults per job.",
    ],
  },
  {
    id: "integrations-accounting",
    sectionId: "settings",
    title: "Integrations — suppliers, accounting, payments",
    summary: "Connect S&S / SanMar, QuickBooks, and Stripe.",
    keywords: ["quickbooks", "stripe", "supplier", "ss activewear", "sanmar"],
    body: [
      "Suppliers connect live catalogs for blank search on orders.",
      "Accounting connects QuickBooks Online. Map Garments, Decoration, Fees, Finishing, Everything else, plus additional named fees. Create new Products/Services in QuickBooks from FloPilot when needed — then Save mappings from the top bar.",
      "Payments connects Stripe for customer checkout and pay links.",
    ],
    tips: [
      "Always Save product mappings before pushing an order to QuickBooks.",
    ],
  },
];

export function getHelpArticle(id: string): HelpDocArticle | undefined {
  return HELP_DOC_ARTICLES.find((article) => article.id === id);
}

export function getArticlesForSection(sectionId: HelpDocSectionId) {
  return HELP_DOC_ARTICLES.filter((article) => article.sectionId === sectionId);
}

export function searchHelpDocs(query: string): HelpDocArticle[] {
  const q = query.trim().toLowerCase();
  if (!q) return HELP_DOC_ARTICLES;
  const tokens = q.split(/\s+/).filter(Boolean);
  return HELP_DOC_ARTICLES.filter((article) => {
    const haystack = [
      article.title,
      article.summary,
      ...article.keywords,
      ...article.body,
      ...(article.steps || []),
      ...(article.tips || []),
      HELP_DOC_SECTIONS.find((s) => s.id === article.sectionId)?.label || "",
    ]
      .join(" ")
      .toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}

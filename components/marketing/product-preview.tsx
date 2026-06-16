import {
  CalendarDays,
  ClipboardList,
  Factory,
  LayoutDashboard,
  Monitor,
  Package,
  Search,
  Settings,
  Wrench,
} from "lucide-react";

const NAV = [
  { icon: LayoutDashboard, label: "Home" },
  { icon: ClipboardList, label: "Orders", active: true },
  { icon: Factory, label: "Production" },
  { icon: CalendarDays, label: "Calendar" },
  { icon: Wrench, label: "Machines" },
  { icon: Package, label: "Inventory" },
  { icon: Settings, label: "Settings" },
];

const ORDERS = [
  {
    customer: "Acme Corp",
    email: "orders@acme.com",
    job: "200 tees — screen print",
    status: "In production",
    dept: "Screen",
  },
  {
    customer: "River City Apparel",
    email: "buyer@rivercity.com",
    job: "Embroidered caps — 150",
    status: "Proof sent",
    dept: "Embroidery",
  },
  {
    customer: "Summit Events",
    email: "events@summit.io",
    job: "Vinyl banners — rush",
    status: "Scheduled",
    dept: "Signs",
  },
  {
    customer: "Northside Gym",
    email: "team@northside.com",
    job: "DTF transfers — 80",
    status: "Queued",
    dept: "DTF",
  },
  {
    customer: "Lakeview Schools",
    email: "athletics@lakeview.edu",
    job: "Spirit wear package",
    status: "In production",
    dept: "Screen",
  },
];

export function ProductPreview() {
  return (
    <div className="relative w-full">
      <div
        className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_20px_60px_-12px_rgba(0,0,0,0.12)]"
      >
        <div className="flex min-h-[380px] sm:min-h-[440px]">
          {/* Sidebar */}
          <aside className="hidden w-[200px] shrink-0 border-r border-slate-100 bg-white p-4 lg:block">
            <div className="mb-6 flex items-center gap-2.5 px-1">
              <div className="size-7 rounded-md bg-brand-primary" />
              <div>
                <p className="text-xs font-semibold text-brand-ink">ACME Print</p>
                <p className="text-[10px] text-brand-muted">Overview</p>
              </div>
            </div>

            <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-wider text-brand-muted">
              Workspace
            </p>
            <div className="space-y-0.5">
              {NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium ${
                      item.active
                        ? "bg-slate-100 text-brand-ink"
                        : "text-brand-muted"
                    }`}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    {item.label}
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Main content — orders table like ORVO's data view */}
          <div className="min-w-0 flex-1 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
              <div>
                <p className="text-sm font-semibold text-brand-ink">Orders</p>
                <p className="text-[11px] text-brand-muted">
                  Active jobs across departments
                </p>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <div className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-[11px] text-brand-muted">
                  <Search className="size-3" />
                  Filter
                </div>
                <div className="rounded-md bg-brand-ink px-3 py-1.5 text-[11px] font-medium text-white">
                  New order
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100 text-brand-muted">
                    <th className="px-4 py-2.5 font-medium sm:px-5">Customer</th>
                    <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                      Job
                    </th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Status</th>
                    <th className="hidden px-4 py-2.5 font-medium md:table-cell">
                      Dept
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ORDERS.map((order) => (
                    <tr
                      key={order.email}
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="px-4 py-3 sm:px-5">
                        <p className="font-medium text-brand-ink">
                          {order.customer}
                        </p>
                        <p className="mt-0.5 text-[10px] text-brand-muted">
                          {order.email}
                        </p>
                      </td>
                      <td className="hidden px-4 py-3 text-brand-muted sm:table-cell">
                        {order.job}
                      </td>
                      <td className="px-4 py-3 sm:px-5">
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-brand-ink">
                          {order.status}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-brand-muted md:table-cell">
                        {order.dept}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[10px] text-brand-muted sm:px-5">
              <span>5 of 24 orders</span>
              <span className="hidden items-center gap-1 sm:inline-flex">
                <Monitor className="size-3" />
                Floor view available
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

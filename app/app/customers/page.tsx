"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Mail, Phone, Plus, Search } from "lucide-react";
import { AddCustomerDialog } from "@/components/customers/add-customer-dialog";
import { ReportsLauncher } from "@/components/reports/reports-launcher";
import { useSchedule } from "@/components/providers/schedule-provider";
import { StaffHeader } from "@/components/layout/staff-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import {
  formatCustomerFullName,
  type NewCustomerInput,
} from "@/lib/customers";
import Link from "next/link";

export default function CustomersPage() {
  const router = useRouter();
  const { customers, orders, addCustomer, shopDataLoading, shopDataError } =
    useSchedule();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const haystack = [
        c.company,
        c.name,
        c.firstName ?? "",
        c.lastName ?? "",
        c.email,
        c.city,
        c.state,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [search, customers]);

  const handleCreateCustomer = async (input: NewCustomerInput) => {
    const customer = await addCustomer(input);
    router.push(`/app/customers/${customer.id}?new=1`);
    return customer;
  };

  return (
    <>
      <StaffHeader
        title="Customers"
        description="Manage customer accounts and order history"
        action={
          <div className="flex items-center gap-2">
            <ReportsLauncher
              context="customers_list"
              data={{ customers, orders }}
            />
            <Button
              type="button"
              className="rounded-full"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">New customer</span>
            </Button>
          </div>
        }
      />

      <AddCustomerDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreate={handleCreateCustomer}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {shopDataError && (
          <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {shopDataError}
          </p>
        )}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>All Customers</CardTitle>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customers…"
                className="pl-9 rounded-full h-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Lifetime Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-12 text-muted-foreground"
                    >
                      {shopDataLoading
                        ? "Loading customers…"
                        : customers.length === 0
                          ? "No customers yet. Add your first customer to get started."
                          : "No customers match your search."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((customer) => {
                    const href = `/app/customers/${customer.id}`;

                    return (
                      <TableRow
                        key={customer.id}
                        tabIndex={0}
                        role="link"
                        aria-label={`View ${customer.company}`}
                        className="group cursor-pointer border-border/70 transition-colors hover:bg-brand-primary/[0.06] active:bg-brand-primary/10 focus-visible:outline-none focus-visible:bg-brand-primary/[0.06] focus-visible:ring-2 focus-visible:ring-brand-primary/20 focus-visible:ring-inset"
                        onClick={() => router.push(href)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(href);
                          }
                        }}
                      >
                        <TableCell className="relative pl-3 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-transparent before:transition-colors group-hover:before:bg-brand-primary">
                          <Link
                            href={href}
                            className="font-medium text-brand-ink transition-colors group-hover:text-brand-primary"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {customer.company}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {formatCustomerFullName(customer)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p className="flex items-center gap-1.5">
                              <Mail className="size-3.5 shrink-0" />
                              {customer.email}
                            </p>
                            <p className="flex items-center gap-1.5">
                              <Phone className="size-3.5 shrink-0" />
                              {customer.phone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.city}, {customer.state}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {customer.totalOrders}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <span className="inline-flex items-center justify-end gap-1.5">
                            <span className="tabular-nums transition-colors group-hover:text-brand-primary">
                              {formatCurrency(customer.lifetimeValue)}
                            </span>
                            <ChevronRight className="size-4 text-brand-primary opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

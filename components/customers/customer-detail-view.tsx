"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  Calendar,
  ChevronRight,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Search,
} from "lucide-react";
import { CustomerOrderDialog } from "@/components/customers/customer-order-dialog";
import { CustomerBrandMarkFromRecord } from "@/components/customers/customer-brand-mark";
import { CustomerShippingLocationsSection } from "@/components/customers/customer-shipping-locations-section";
import { CustomerTaxExemptionSection } from "@/components/customers/customer-tax-exemption-section";
import { CustomerContactsSection } from "@/components/customers/customer-contacts-section";
import { CustomerSubCustomersSection } from "@/components/customers/customer-sub-customers-section";
import { CustomerSalesRepSection } from "@/components/customers/customer-sales-rep-section";
import { CustomerPaymentTermsSection } from "@/components/customers/customer-payment-terms-section";
import { CustomerNotesSection } from "@/components/customers/customer-notes-section";
import { CustomerNegotiatedPricingSection } from "@/components/customers/customer-negotiated-pricing-section";
import { CustomerFilesSection } from "@/components/customers/customer-files-section";
import { EditCustomerDialog } from "@/components/customers/edit-customer-dialog";
import { CustomerActivityLauncher } from "@/components/customers/customer-activity-launcher";
import { ReportsLauncher } from "@/components/reports/reports-launcher";
import { useRegisterUnsavedChanges } from "@/components/layout/staff-unsaved-changes-provider";
import { useSchedule } from "@/components/providers/schedule-provider";
import { useShopSettings } from "@/components/providers/shop-settings-provider";
import { NewOrderButton } from "@/components/providers/new-order-provider";
import { OrderStatusBadge, RushBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCustomerFullName, formatCustomerBillingAddress } from "@/lib/customers";
import {
  computeCustomerOrderStats,
  CUSTOMER_ORDER_SCOPE_TABS,
  filterCustomerOrders,
  filterCustomerOrdersByScope,
  ORDER_STATUS_FILTER_OPTIONS,
  sortCustomerOrders,
  type CustomerOrderScope,
  type OrderHistorySort,
} from "@/lib/customer-orders";
import {
  customerToPageDraft,
  isPendingCustomerUpload,
  serializeCustomerPageDraft,
  type CustomerPageDraft,
} from "@/lib/customer-page-draft";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardGhostButtonClass,
  dashboardInsetSurfaceClass,
  dashboardKpiCardClass,
  dashboardKpiTitleClass,
  dashboardPrimaryButtonClass,
  dashboardSectionTitleClass,
  dashboardTaskDetailClass,
  dashboardValueClass,
} from "@/lib/dashboard-styles";
import { isArchivedOrder } from "@/lib/order-archive";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatOrderDisplayLine } from "@/lib/order-display";
import { buildOrderFinancialsMap, type OrderFinancials } from "@/lib/order-financial-context";
import { isWillCallOrder } from "@/lib/order-shipping";
import type { Customer, Order, OrderStatus } from "@/types";
import { cn } from "@/lib/utils";

export function CustomerDetailView({ customerId }: { customerId: string }) {
  const {
    getCustomerById,
    getOrdersByCustomerId,
    createReorderFromOrder,
    updateCustomer,
    uploadCustomerTaxDocument,
    deleteCustomerTaxDocument,
    uploadCustomerFile,
    deleteCustomerFile,
    archiveCustomer,
    restoreCustomer,
    shopDataLoading,
  } = useSchedule();
  const customer = getCustomerById(customerId);
  const allOrders = getOrdersByCustomerId(customerId);

  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<CustomerOrderScope>("open");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [sort, setSort] = useState<OrderHistorySort>("newest");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [reorderToast, setReorderToast] = useState<string | null>(null);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [draft, setDraft] = useState<CustomerPageDraft | null>(null);
  const [draftBaseline, setDraftBaseline] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const resetDraftFromCustomer = useCallback((next: Customer) => {
    const pageDraft = customerToPageDraft(next);
    setDraft(pageDraft);
    setDraftBaseline(serializeCustomerPageDraft(pageDraft));
    setDraftError(null);
  }, []);

  useEffect(() => {
    if (!customer) {
      setDraft(null);
      setDraftBaseline("");
      return;
    }
    resetDraftFromCustomer(customer);
  }, [customer?.id, resetDraftFromCustomer]);

  const draftCustomer = useMemo(() => {
    if (!customer || !draft) return customer;
    return {
      ...customer,
      salesRepId: draft.salesRepId ?? undefined,
      taxExempt: draft.taxExempt,
      taxExemptNumber: draft.taxExemptNumber,
      contacts: draft.contacts,
      shippingLocations: draft.shippingLocations,
      subCustomers: draft.subCustomers,
      negotiatedPricing: draft.negotiatedPricing,
    } satisfies Customer;
  }, [customer, draft]);

  const pageDirty = Boolean(
    draft && draftBaseline && serializeCustomerPageDraft(draft) !== draftBaseline
  );

  const discardDraft = useCallback(() => {
    if (!customer) return;
    resetDraftFromCustomer(customer);
  }, [customer, resetDraftFromCustomer]);

  const saveDraft = useCallback(async () => {
    if (!customer || !draft) return;
    setSavingDraft(true);
    setDraftError(null);
    try {
      let latest = await updateCustomer(customer.id, {
        salesRepId: draft.salesRepId,
        paymentTermsLabel: draft.paymentTermsLabel,
        paymentTermsDays: draft.paymentTermsDays,
        taxExempt: draft.taxExempt,
        taxExemptNumber: draft.taxExemptNumber.trim(),
        contacts: draft.contacts,
        accountNotes: draft.accountNotes,
        shippingLocations: draft.shippingLocations,
        subCustomers: draft.subCustomers,
        ...(draft.negotiatedPricing
          ? { negotiatedPricing: draft.negotiatedPricing }
          : {}),
      });

      for (const documentId of draft.removedTaxDocumentIds) {
        latest = await deleteCustomerTaxDocument(customer.id, documentId);
      }
      for (const fileId of draft.removedFileIds) {
        latest = await deleteCustomerFile(customer.id, fileId);
      }

      for (const doc of draft.taxDocuments) {
        if (!isPendingCustomerUpload(doc)) continue;
        const inlineDataUrl = doc.preferInline
          ? `data:${doc.contentType};base64,${doc.contentBase64}`
          : undefined;
        latest = await uploadCustomerTaxDocument(customer.id, {
          name: doc.name,
          kind: doc.kind,
          contentType: doc.contentType,
          ...(inlineDataUrl
            ? { inlineDataUrl }
            : { contentBase64: doc.contentBase64 }),
        });
      }

      for (const file of draft.files) {
        if (!isPendingCustomerUpload(file)) continue;
        const inlineDataUrl = file.preferInline
          ? `data:${file.contentType};base64,${file.contentBase64}`
          : undefined;
        latest = await uploadCustomerFile(customer.id, {
          name: file.name,
          kind: file.kind,
          contentType: file.contentType,
          size: file.size,
          ...(inlineDataUrl
            ? { inlineDataUrl }
            : { contentBase64: file.contentBase64 }),
        });
      }

      resetDraftFromCustomer(latest);
    } catch (err) {
      setDraftError(
        err instanceof Error ? err.message : "Could not save customer changes."
      );
      throw err;
    } finally {
      setSavingDraft(false);
    }
  }, [
    customer,
    draft,
    updateCustomer,
    deleteCustomerTaxDocument,
    deleteCustomerFile,
    uploadCustomerTaxDocument,
    uploadCustomerFile,
    resetDraftFromCustomer,
  ]);

  useRegisterUnsavedChanges(
    customer && draft
      ? {
          dirty: pageDirty,
          saving: savingDraft,
          label: "Unsaved customer changes",
          onSave: saveDraft,
          onDiscard: discardDraft,
        }
      : null
  );

  const isArchived = customer?.archived === true;

  const handleArchiveToggle = async () => {
    if (!customer) return;
    const openOrderCount = allOrders.filter(
      (order) => !isArchivedOrder(order)
    ).length;
    if (!isArchived) {
      const message =
        openOrderCount > 0
          ? `Archive ${customer.company}? This will also archive ${openOrderCount} active order${openOrderCount !== 1 ? "s" : ""} tied to this customer. You can restore everything later.`
          : `Archive ${customer.company}? You can restore it later.`;
      if (!window.confirm(message)) return;
    }
    setArchiveBusy(true);
    try {
      if (isArchived) await restoreCustomer(customer.id);
      else await archiveCustomer(customer.id);
    } finally {
      setArchiveBusy(false);
    }
  };

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1") {
      setWelcomeVisible(true);
    }
  }, []);

  const scopedOrders = useMemo(
    () => filterCustomerOrdersByScope(allOrders, scope),
    [allOrders, scope]
  );

  const filteredOrders = useMemo(() => {
    const filtered = filterCustomerOrders(scopedOrders, search, statusFilter);
    return sortCustomerOrders(filtered, sort);
  }, [scopedOrders, search, statusFilter, sort]);

  const { settings } = useShopSettings();

  const orderFinancialContext = useMemo(
    () => ({
      taxRate: settings.taxRate,
      pricingMatrix: settings.pricingMatrix,
      pricingRateSheets: settings.pricingRateSheets,
      getCustomer: () => customer,
    }),
    [settings.taxRate, settings.pricingMatrix, customer]
  );

  const orderFinancials = useMemo(
    () => buildOrderFinancialsMap(allOrders, orderFinancialContext),
    [allOrders, orderFinancialContext]
  );

  const stats = useMemo(() => {
    const base = computeCustomerOrderStats(allOrders);
    const openBalance = allOrders
      .filter((order) => !isArchivedOrder(order))
      .reduce(
        (sum, order) => sum + (orderFinancials.get(order.id)?.balance ?? 0),
        0
      );
    return { ...base, openBalance };
  }, [allOrders, orderFinancials]);

  const lifetimeValue = useMemo(
    () =>
      allOrders
        .filter((order) => !isArchivedOrder(order))
        .reduce(
          (sum, order) => sum + (orderFinancials.get(order.id)?.total ?? 0),
          0
        ),
    [allOrders, orderFinancials]
  );

  const handleReorder = async (sourceOrderId: string) => {
    const created = await createReorderFromOrder(sourceOrderId);
    if (!created) return;
    setSelectedOrderId(created.id);
    setReorderToast(
      `Created ${created.number} as a new quote — review artwork and schedule when ready.`
    );
    setTimeout(() => setReorderToast(null), 6000);
  };

  if (!customer) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <p className={dashboardTaskDetailClass}>
          {shopDataLoading ? "Loading customer…" : "Customer not found."}
        </p>
        <Button
          className={cn(dashboardControlClass, "mt-4")}
          nativeButton={false}
          render={<Link href="/app/customers" />}
        >
          Back to customers
        </Button>
      </main>
    );
  }

  const scopeCounts: Record<CustomerOrderScope, number> = {
    open: stats.totalOrders,
    archived: stats.archivedCount,
    all: allOrders.length,
  };

  return (
    <>
      <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
        <header className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <nav
                aria-label="Breadcrumb"
                className="flex flex-wrap items-center gap-1.5 text-[13px]"
              >
                <Link
                  href="/app/customers"
                  className="rounded-md px-1 py-0.5 text-[#616161] transition-colors hover:bg-[#f6f6f7] hover:text-[#303030]"
                >
                  Customers
                </Link>
                <span className="text-[#c9c9c9]" aria-hidden>
                  /
                </span>
                <span className="px-1 font-medium text-[#303030]">
                  {customer.company}
                </span>
              </nav>

              <div className="flex items-start gap-3">
                <CustomerBrandMarkFromRecord customer={customer} size="lg" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className={dashboardSectionTitleClass}>
                      {customer.company}
                    </h1>
                    {isArchived ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-[#e3e3e3] bg-[#f1f1f1] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
                        <Archive className="size-3" />
                        Archived
                      </span>
                    ) : null}
                    {customer.taxExempt ? (
                      <span className="inline-flex items-center rounded-md border border-[#cfe0ff] bg-[#f4f7fd] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#2c6ecb]">
                        Tax exempt
                      </span>
                    ) : null}
                    {draft?.accountNotes.some((note) => note.priority === "warning") ? (
                      <span className="inline-flex items-center rounded-md border border-[#f5b5b5] bg-[#fff1f1] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#b42318]">
                        Warning
                      </span>
                    ) : null}
                  </div>
                  <p className={cn("mt-1", dashboardTaskDetailClass)}>
                    {formatCustomerFullName(customer)}
                    {formatCustomerBillingAddress(customer)
                      ? ` · ${formatCustomerBillingAddress(customer)}`
                      : ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ReportsLauncher
                context="customer_detail"
                contextLabel={customer.company}
                data={{
                  customer,
                  orders: allOrders,
                  financials: {
                    taxRate: settings.taxRate,
                    pricingMatrix: settings.pricingMatrix,
                    pricingRateSheets: settings.pricingRateSheets,
                    getCustomer: () => customer,
                  },
                }}
              />
              <CustomerActivityLauncher customer={customer} />
              <button
                type="button"
                className={cn(dashboardControlClass, "h-9")}
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-3.5" />
                Edit
              </button>
              <button
                type="button"
                className={cn(dashboardControlClass, "h-9")}
                onClick={handleArchiveToggle}
                disabled={archiveBusy}
              >
                {archiveBusy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : isArchived ? (
                  <ArchiveRestore className="size-3.5" />
                ) : (
                  <Archive className="size-3.5" />
                )}
                {isArchived ? "Restore" : "Archive"}
              </button>
              <NewOrderButton
                customerId={customer.id}
                label="New order"
                className={dashboardPrimaryButtonClass}
              />
            </div>
          </div>

          {isArchived ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e3e3e3] bg-[#fafafa] px-4 py-3">
              <p className="text-sm text-[#616161]">
                This customer is archived and hidden from active lists. Orders
                archived with this customer are restored when you restore it.
              </p>
              <button
                type="button"
                className={cn(dashboardControlClass, "h-8")}
                onClick={handleArchiveToggle}
                disabled={archiveBusy}
              >
                {archiveBusy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ArchiveRestore className="size-3.5" />
                )}
                Restore customer
              </button>
            </div>
          ) : null}
        </header>

        {welcomeVisible ? (
          <div
            className={cn(
              dashboardCardClass,
              "flex flex-col gap-3 border-brand-primary/20 bg-brand-primary/[0.04] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            )}
          >
            <p className="text-sm text-[#303030]">
              <span className="font-medium">{customer.company}</span> was added
              to your customer list. Start their first order when you&apos;re
              ready.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <NewOrderButton
                customerId={customer.id}
                size="sm"
                className={dashboardPrimaryButtonClass}
                onOpen={() => setWelcomeVisible(false)}
              />
              <button
                type="button"
                className={cn(dashboardGhostButtonClass, "h-8")}
                onClick={() => setWelcomeVisible(false)}
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {draftError ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {draftError}
          </div>
        ) : null}

        {reorderToast ? (
          <div className="rounded-lg border border-[#86d4a8] bg-[#e8f5ee] px-4 py-3 text-sm text-[#0d5c2e]">
            {reorderToast}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Open balance"
            value={
              stats.totalOrders === 0
                ? "—"
                : stats.openBalance > 0
                  ? formatCurrency(stats.openBalance)
                  : "All paid"
            }
            hint={
              stats.totalOrders === 0
                ? "No open orders yet"
                : stats.openBalance > 0
                  ? "Outstanding on open orders"
                  : "Nothing owed right now"
            }
            tone={
              stats.totalOrders === 0
                ? "neutral"
                : stats.openBalance > 0
                  ? "warning"
                  : "good"
            }
          />
          <MetricCard
            label="Active orders"
            value={String(stats.activeCount)}
            hint={
              stats.totalOrders === 0 && stats.archivedCount > 0
                ? `${stats.archivedCount} archived on file`
                : `${stats.totalOrders} open order${stats.totalOrders !== 1 ? "s" : ""}`
            }
          />
          <MetricCard
            label="Completed"
            value={String(stats.completedCount)}
            hint="Shipped or completed"
          />
          <MetricCard
            label="Last order"
            value={stats.lastOrderNumber ?? "—"}
            hint={
              stats.lastOrderDate
                ? formatDate(stats.lastOrderDate)
                : "No open orders yet"
            }
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
          <div className="space-y-4 lg:col-span-1">
            <section className={dashboardCardClass}>
              <div className="border-b border-[#ebebeb] px-4 py-3 sm:px-5">
                <h2 className="text-[15px] font-semibold text-[#303030]">
                  Business Information
                </h2>
              </div>
              <div className="space-y-3 p-4 text-sm sm:p-5">
                <ContactRow
                  href={`mailto:${customer.email}`}
                  icon={Mail}
                  label={customer.email}
                />
                <ContactRow
                  href={`tel:${customer.phone.replace(/\D/g, "")}`}
                  icon={Phone}
                  label={customer.phone}
                />
                {formatCustomerBillingAddress(customer) ? (
                  <ContactRow
                    icon={MapPin}
                    label={formatCustomerBillingAddress(customer)}
                    muted
                  />
                ) : null}
                {customer.customerSince ? (
                  <ContactRow
                    icon={Calendar}
                    label={`Customer since ${formatDate(customer.customerSince)}`}
                    muted
                    className="border-t border-[#ebebeb] pt-3"
                  />
                ) : null}
                <div className="grid grid-cols-2 gap-3 border-t border-[#ebebeb] pt-4">
                  <div>
                    <p className="text-xs text-[#616161]">Open orders</p>
                    <p className={cn(dashboardValueClass, "mt-1 text-2xl")}>
                      {stats.totalOrders}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#616161]">Lifetime value</p>
                    <p className="text-[10px] text-[#8a8a8a]">
                      Excludes archived orders
                    </p>
                    <p className={cn(dashboardValueClass, "mt-1 text-2xl")}>
                      {formatCurrency(lifetimeValue)}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {draft ? (
              <CustomerNotesSection
                notes={draft.accountNotes}
                companyName={customer.company}
                onChange={(accountNotes) => {
                  setDraft((current) =>
                    current ? { ...current, accountNotes } : current
                  );
                }}
              />
            ) : null}

            <CustomerSalesRepSection
              salesRepId={draft?.salesRepId}
              onChange={(salesRepId) => {
                setDraft((current) =>
                  current ? { ...current, salesRepId } : current
                );
              }}
            />

            {draft ? (
              <CustomerPaymentTermsSection
                paymentTermsLabel={draft.paymentTermsLabel}
                paymentTermsDays={draft.paymentTermsDays}
                onChange={(patch) => {
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          paymentTermsLabel: patch.paymentTermsLabel,
                          paymentTermsDays: patch.paymentTermsDays,
                        }
                      : current
                  );
                }}
              />
            ) : null}

            {draft ? (
              <CustomerTaxExemptionSection
                taxExempt={draft.taxExempt}
                taxExemptNumber={draft.taxExemptNumber}
                taxDocuments={draft.taxDocuments}
                onChange={(patch) => {
                  setDraft((current) => {
                    if (!current) return current;
                    return {
                      ...current,
                      ...(patch.taxExempt !== undefined
                        ? { taxExempt: patch.taxExempt }
                        : {}),
                      ...(patch.taxExemptNumber !== undefined
                        ? { taxExemptNumber: patch.taxExemptNumber }
                        : {}),
                      ...(patch.taxDocuments
                        ? { taxDocuments: patch.taxDocuments }
                        : {}),
                      ...(patch.removedTaxDocumentIds
                        ? {
                            removedTaxDocumentIds: [
                              ...new Set([
                                ...current.removedTaxDocumentIds,
                                ...patch.removedTaxDocumentIds,
                              ]),
                            ],
                          }
                        : {}),
                    };
                  });
                }}
              />
            ) : null}

            {draftCustomer ? (
              <CustomerContactsSection
                customer={draftCustomer}
                onSave={async (contacts) => {
                  setDraft((current) =>
                    current ? { ...current, contacts } : current
                  );
                }}
              />
            ) : null}

            {draftCustomer ? (
              <CustomerSubCustomersSection
                customer={draftCustomer}
                onSave={async (subCustomers) => {
                  setDraft((current) =>
                    current ? { ...current, subCustomers } : current
                  );
                }}
              />
            ) : null}

            {draftCustomer ? (
              <CustomerShippingLocationsSection
                customer={draftCustomer}
                onSave={async (shippingLocations) => {
                  setDraft((current) =>
                    current ? { ...current, shippingLocations } : current
                  );
                }}
              />
            ) : null}

            {draftCustomer ? (
              <CustomerNegotiatedPricingSection
                customer={draftCustomer}
                onSave={async (negotiatedPricing) => {
                  setDraft((current) =>
                    current ? { ...current, negotiatedPricing } : current
                  );
                }}
              />
            ) : null}

            {draft ? (
              <CustomerFilesSection
                files={draft.files}
                onChange={(patch) => {
                  setDraft((current) => {
                    if (!current) return current;
                    return {
                      ...current,
                      ...(patch.files ? { files: patch.files } : {}),
                      ...(patch.removedFileIds
                        ? {
                            removedFileIds: [
                              ...new Set([
                                ...current.removedFileIds,
                                ...patch.removedFileIds,
                              ]),
                            ],
                          }
                        : {}),
                    };
                  });
                }}
              />
            ) : null}
          </div>

          <section className={cn(dashboardCardClass, "lg:col-span-2")}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ebebeb] px-4 py-3 sm:px-5">
              <div>
                <h2 className="text-[15px] font-semibold text-[#303030]">
                  Order history
                </h2>
                <p className="mt-0.5 text-[13px] text-[#616161]">
                  {filteredOrders.length} result
                  {filteredOrders.length !== 1 ? "s" : ""}
                  {scope !== "open"
                    ? ` · ${CUSTOMER_ORDER_SCOPE_TABS.find((tab) => tab.value === scope)?.label}`
                    : ""}
                </p>
              </div>
            </div>

            <div className={cn(dashboardInsetSurfaceClass, "m-4 overflow-visible sm:m-5")}>
              <div className="flex flex-wrap items-center gap-2 border-b border-[#ebebeb] px-3 py-2.5">
                <div className="flex rounded-lg border border-[#e3e3e3] bg-[#f6f6f7] p-0.5">
                  {CUSTOMER_ORDER_SCOPE_TABS.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setScope(tab.value)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                        scope === tab.value
                          ? "bg-white text-[#303030] shadow-sm"
                          : "text-[#616161] hover:text-[#303030]"
                      )}
                    >
                      {tab.label}
                      <span
                        className={cn(
                          "rounded-sm px-1.5 py-0.5 text-[11px] tabular-nums",
                          scope === tab.value
                            ? "bg-[#f1f1f1] text-[#616161]"
                            : "text-[#8a8a8a]"
                        )}
                      >
                        {scopeCounts[tab.value]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ebebeb] bg-[#fafafa] px-3 py-2.5">
                <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8a8a]" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by order #, event name, status…"
                    className={cn(dashboardControlClass, "h-9 w-full pl-9")}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={statusFilter}
                    onValueChange={(value) =>
                      setStatusFilter((value ?? "all") as OrderStatus | "all")
                    }
                  >
                    <SelectTrigger
                      className={cn(dashboardControlClass, "h-9 w-[160px]")}
                    >
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUS_FILTER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={sort}
                    onValueChange={(value) =>
                      setSort((value ?? "newest") as OrderHistorySort)
                    }
                  >
                    <SelectTrigger
                      className={cn(dashboardControlClass, "h-9 w-[150px]")}
                    >
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest first</SelectItem>
                      <SelectItem value="oldest">Oldest first</SelectItem>
                      <SelectItem value="due_soon">Due date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="divide-y divide-[#ebebeb]">
                {filteredOrders.length === 0 ? (
                  <div className="px-4 py-14 text-center">
                    <p className="text-sm font-medium text-[#303030]">
                      {allOrders.length === 0
                        ? "No orders yet"
                        : scope === "open" && stats.archivedCount > 0
                          ? "No open orders"
                          : "No orders match your search"}
                    </p>
                    <p className="mt-1 text-sm text-[#616161]">
                      {allOrders.length === 0
                        ? "Create the first order for this customer when you're ready."
                        : scope === "open" && stats.archivedCount > 0
                          ? `${stats.archivedCount} archived order${stats.archivedCount !== 1 ? "s are" : " is"} on file.`
                          : "Try a different search term or filter."}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      {allOrders.length === 0 ? (
                        <NewOrderButton
                          customerId={customer.id}
                          label="New order"
                          className={dashboardPrimaryButtonClass}
                        />
                      ) : scope === "open" && stats.archivedCount > 0 ? (
                        <button
                          type="button"
                          className={dashboardControlClass}
                          onClick={() => setScope("archived")}
                        >
                          <Archive className="size-3.5" />
                          View archived
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  filteredOrders.map((order) => (
                    <OrderHistoryRow
                      key={order.id}
                      order={order}
                      financials={orderFinancials.get(order.id)}
                      onClick={() => setSelectedOrderId(order.id)}
                    />
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      <CustomerOrderDialog
        orderId={selectedOrderId}
        open={Boolean(selectedOrderId)}
        onOpenChange={(open) => {
          if (!open) setSelectedOrderId(null);
        }}
        onReorder={handleReorder}
      />

      <EditCustomerDialog
        customer={customer}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={(updates) => updateCustomer(customer.id, updates)}
      />
    </>
  );
}

function ContactRow({
  icon: Icon,
  label,
  href,
  muted = false,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  muted?: boolean;
  className?: string;
}) {
  const content = (
    <>
      <Icon className="size-4 shrink-0 text-[#8a8a8a]" />
      <span className="truncate">{label}</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={cn(
          "flex items-center gap-2.5 text-[#303030] transition-colors hover:text-brand-primary",
          className
        )}
      >
        {content}
      </a>
    );
  }

  return (
    <p
      className={cn(
        "flex items-center gap-2.5",
        muted ? "text-[#616161]" : "text-[#303030]",
        className
      )}
    >
      {content}
    </p>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "warning" | "neutral";
}) {
  const styles =
    tone === "good"
      ? {
          surface: "bg-[#e8f5ee]",
          border: "border-[#86d4a8]",
          valueColor: "text-[#0d5c2e]",
        }
      : tone === "warning"
        ? {
            surface: "bg-[#fff8eb]",
            border: "border-[#f0d9a8]",
            valueColor: "text-[#8a6116]",
          }
        : {
            surface: "bg-white",
            border: "border-[#e3e3e3]",
            valueColor: "text-[#303030]",
          };

  return (
    <div
      className={cn(
        dashboardKpiCardClass,
        "min-h-[112px] border",
        styles.surface,
        styles.border
      )}
    >
      <p className={dashboardKpiTitleClass}>{label}</p>
      <p className={cn(dashboardValueClass, "mt-2.5", styles.valueColor)}>
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-xs leading-snug text-[#616161]">{hint}</p>
      ) : null}
    </div>
  );
}

function OrderHistoryRow({
  order,
  financials,
  onClick,
}: {
  order: Order;
  financials?: OrderFinancials;
  onClick: () => void;
}) {
  const jobSummary =
    order.jobs.length > 0
      ? order.jobs.map((job) => job.name).join(", ")
      : order.type.replace("_", " ");

  const archived = isArchivedOrder(order);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-[#f6f6f7] focus-visible:bg-[#f6f6f7] focus-visible:outline-none"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-[#303030] transition-colors group-hover:text-[#2c6ecb]">
            {formatOrderDisplayLine(order)}
          </span>
          <OrderStatusBadge
            status={order.status}
            willCall={isWillCallOrder(order.shipping, order.shipments ?? [])}
          />
          {order.rush ? <RushBadge /> : null}
          {archived ? (
            <span className="inline-flex items-center gap-1 rounded-sm bg-[#f1f1f1] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#616161]">
              <Archive className="size-3" />
              Archived
            </span>
          ) : null}
        </div>
        <p className="truncate text-sm text-[#616161]">{jobSummary}</p>
        <p className="text-xs text-[#8a8a8a]">
          {order.type.replace("_", " ")} · Due {formatDate(order.inHandsDate)} ·
          Created {formatDate(order.createdAt)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-right">
        <div>
          <p className="font-semibold tabular-nums text-[#303030]">
            {formatCurrency(financials?.total ?? order.total)}
          </p>
          {(financials?.balance ?? order.balance) > 0 ? (
            <p className="text-xs font-medium text-[#8a6116]">
              {formatCurrency(financials?.balance ?? order.balance)} due
            </p>
          ) : null}
        </div>
        <ChevronRight className="size-4 text-brand-primary opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
      </div>
    </button>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Layers3,
  Link2,
  Loader2,
  PackageSearch,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { OrderHeaderField } from "@/components/orders/order-header-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  dashboardControlClass,
  dashboardPrimaryButtonClass,
} from "@/lib/dashboard-styles";
import { decorationLabel } from "@/lib/format";
import {
  createEventGangId,
  draftEventGangsFromOrder,
  eventMemberKey,
  eventOptionSubtitle,
  eventOptionTitle,
  eventsMatchForGang,
  gangCombinedQuantity,
  listOrderEvents,
  ordersLinkedByEventGangs,
  productionRunSummaryLabel,
  toEventGangMember,
  type OrderEventOption,
} from "@/lib/order-production-run";
import {
  orderHeaderActionTriggerClass,
  orderHeaderComboShellClass,
} from "@/lib/order-addresses";
import type { Order, OrderProductionRunEventGang } from "@/types";
import { cn } from "@/lib/utils";

type EventGangSaveMember = {
  orderId: string;
  jobId: string;
  imprintId: string;
};

type EventGangSaveInput = {
  id?: string;
  members: EventGangSaveMember[];
};

function orderTitle(order: Pick<Order, "number" | "customLabel">) {
  const label = order.customLabel?.trim();
  return label ? `${order.number} — ${label}` : order.number;
}

function gangTitle(gang: OrderProductionRunEventGang) {
  const seed = gang.members[0];
  if (!seed) return "Event gang";
  const location = seed.imprintLabel || "Event";
  if (!seed.decoration || seed.decoration === "finishing") {
    return location;
  }
  return `${location} · ${decorationLabel(seed.decoration)}`;
}

export function OrderProductionRunEditor({
  order,
  orders,
  onSave,
}: {
  order: Order;
  orders: Order[];
  onSave: (
    linkedOrderIds: string[],
    eventGangs?: EventGangSaveInput[]
  ) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [gangs, setGangs] = useState<OrderProductionRunEventGang[]>([]);
  const [anchorKey, setAnchorKey] = useState<string | null>(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localEvents = useMemo(() => listOrderEvents(order), [order]);
  const hasLegacyRun =
    Boolean(order.productionRun?.members && order.productionRun.members.length > 1) &&
    !(order.productionRun?.eventGangs && order.productionRun.eventGangs.length > 0);

  useEffect(() => {
    if (!open) return;
    const nextGangs = draftEventGangsFromOrder(order);
    setGangs(nextGangs);
    setQuery("");
    setError(null);
    setAnchorKey(listOrderEvents(order)[0]?.key ?? null);
    const companionIds = (order.productionRun?.members || [])
      .map((member) => member.orderId)
      .filter((id) => id !== order.id);
    setExpandedOrderIds(companionIds.slice(0, 3));
  }, [open, order]);

  const eventIndex = useMemo(() => {
    const map = new Map<string, OrderEventOption>();
    for (const event of localEvents) map.set(event.key, event);
    for (const candidate of orders) {
      if (candidate.id === order.id) continue;
      for (const event of listOrderEvents(candidate)) {
        map.set(event.key, event);
      }
    }
    return map;
  }, [localEvents, orders, order.id]);

  const claimedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const gang of gangs) {
      for (const member of gang.members) {
        keys.add(eventMemberKey(member));
      }
    }
    return keys;
  }, [gangs]);

  const anchorEvent = anchorKey ? eventIndex.get(anchorKey) ?? null : null;

  const candidates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders
      .filter(
        (candidate) =>
          candidate.id !== order.id &&
          candidate.customerId === order.customerId &&
          !candidate.archived
      )
      .filter((candidate) => {
        if (!needle) return true;
        const haystack = [
          candidate.number,
          candidate.customLabel,
          ...listOrderEvents(candidate).flatMap((event) => [
            event.imprintLabel,
            event.jobName,
            event.decoration,
            event.locationKey,
          ]),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [orders, order.id, order.customerId, query]);

  const linkedOrderCount = useMemo(() => {
    const ids = new Set(ordersLinkedByEventGangs(gangs));
    if (gangs.length) ids.add(order.id);
    return ids.size;
  }, [gangs, order.id]);

  const combinedOrderPcs = useMemo(() => {
    const ids = new Set(ordersLinkedByEventGangs(gangs));
    if (gangs.length) ids.add(order.id);
    return [...ids].reduce((total, id) => {
      const row = id === order.id ? order : orders.find((entry) => entry.id === id);
      if (!row) return total;
      return (
        total +
        (row.lineItems || []).reduce(
          (sum, item) =>
            sum +
            (item.sizes || []).reduce(
              (sizeSum, size) => sizeSum + (Number(size.quantity) || 0),
              0
            ),
          0
        )
      );
    }, 0);
  }, [gangs, order, orders]);

  const toggleExpanded = (orderId: string) => {
    setExpandedOrderIds((current) =>
      current.includes(orderId)
        ? current.filter((id) => id !== orderId)
        : [...current, orderId]
    );
  };

  const findGangForAnchor = (key: string) =>
    gangs.find((gang) =>
      gang.members.some((member) => eventMemberKey(member) === key)
    );

  const upsertGangWithRemote = (remote: OrderEventOption) => {
    if (!anchorEvent) {
      setError("Select an event on this order first, then attach matching events.");
      return;
    }
    if (remote.orderId === order.id) return;

    const anchorMember = toEventGangMember(anchorEvent);
    const remoteMember = toEventGangMember(remote);
    const existingForAnchor = findGangForAnchor(anchorEvent.key);
    const remoteClaimedElsewhere = gangs.some(
      (gang) =>
        gang.id !== existingForAnchor?.id &&
        gang.members.some((member) => eventMemberKey(member) === remote.key)
    );
    if (remoteClaimedElsewhere) {
      setError("That event is already in another gang. Remove it there first.");
      return;
    }

    setError(null);
    setGangs((current) => {
      if (existingForAnchor) {
        const already = existingForAnchor.members.some(
          (member) => eventMemberKey(member) === remote.key
        );
        const nextMembers = already
          ? existingForAnchor.members.filter(
              (member) => eventMemberKey(member) !== remote.key
            )
          : [...existingForAnchor.members, remoteMember];

        if (nextMembers.length < 2) {
          return current.filter((gang) => gang.id !== existingForAnchor.id);
        }

        return current.map((gang) =>
          gang.id === existingForAnchor.id
            ? {
                ...gang,
                members: nextMembers,
                combinedQuantity: gangCombinedQuantity(nextMembers),
              }
            : gang
        );
      }

      const members = [anchorMember, remoteMember];
      return [
        ...current,
        {
          id: createEventGangId(),
          members,
          combinedQuantity: gangCombinedQuantity(members),
        },
      ];
    });

    if (!expandedOrderIds.includes(remote.orderId)) {
      setExpandedOrderIds((current) => [...current, remote.orderId]);
    }
  };

  const removeGang = (gangId: string) => {
    setGangs((current) => current.filter((gang) => gang.id !== gangId));
  };

  const removeMember = (gangId: string, memberKey: string) => {
    setGangs((current) =>
      current
        .map((gang) => {
          if (gang.id !== gangId) return gang;
          const members = gang.members.filter(
            (member) => eventMemberKey(member) !== memberKey
          );
          return {
            ...gang,
            members,
            combinedQuantity: gangCombinedQuantity(members),
          };
        })
        .filter((gang) => gang.members.length >= 2)
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const linkedOrderIds = ordersLinkedByEventGangs(gangs).filter(
        (id) => id !== order.id
      );
      const eventGangs: EventGangSaveInput[] = gangs.map((gang) => ({
        id: gang.id,
        members: gang.members.map((member) => ({
          orderId: member.orderId,
          jobId: member.jobId,
          imprintId: member.imprintId,
        })),
      }));
      await onSave(linkedOrderIds, eventGangs);
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update this run."
      );
    } finally {
      setSaving(false);
    }
  };

  const summary = productionRunSummaryLabel(order);
  const hasRun = summary !== "None";

  return (
    <>
      <OrderHeaderField label="Ganged events">
        <div
          className={cn(
            orderHeaderComboShellClass,
            "min-w-[10.5rem]",
            hasRun &&
              "border-[#bfd8c8] focus-within:border-[#bfd8c8] focus-within:ring-[#245c3c]/15"
          )}
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              orderHeaderActionTriggerClass,
              hasRun ? "bg-[#f2f8f4] text-[#245c3c]" : "text-[#616161]"
            )}
          >
            <span className="min-w-0 truncate">{summary}</span>
            <ChevronDown className="size-4 shrink-0 opacity-50" />
          </button>
        </div>
      </OrderHeaderField>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[min(92vh,860px)] w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-5xl">
          <DialogHeader className="shrink-0 border-b border-[#ebebeb] bg-[linear-gradient(180deg,#f7fbf8_0%,#ffffff_72%)] px-6 pb-4 pt-6 pr-14">
            <DialogTitle className="flex items-center gap-3 text-lg font-semibold text-[#303030]">
              <span className="inline-flex size-10 items-center justify-center rounded-xl border border-[#d5e6db] bg-white text-[#2d6a4f] shadow-[0_1px_0_rgba(36,92,60,0.06)]">
                <Layers3 className="size-5" />
              </span>
              Gang production events
            </DialogTitle>
            <DialogDescription className="pt-1.5 text-[13px] leading-relaxed text-[#616161]">
              Attach events from other orders — left chest, back, neck labels —
              so they run together on press. Each order keeps its own estimate,
              invoice, and fulfillment.
            </DialogDescription>
            <ol className="mt-3.5 flex flex-wrap gap-2">
              {[
                { n: 1, label: "Pick event", done: Boolean(anchorEvent) },
                {
                  n: 2,
                  label: "Attach matches",
                  done: gangs.length > 0,
                },
                {
                  n: 3,
                  label: "Review & save",
                  done: gangs.length > 0,
                },
              ].map((step) => (
                <li
                  key={step.n}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold",
                    step.done
                      ? "border-[#cfe3d6] bg-[#eef7f1] text-[#245c3c]"
                      : "border-[#e3e3e3] bg-white text-[#8a8a8a]"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-4 items-center justify-center rounded-full text-[10px] font-bold",
                      step.done
                        ? "bg-[#2d6a4f] text-white"
                        : "bg-[#f1f1f1] text-[#8a8a8a]"
                    )}
                  >
                    {step.done ? <Check className="size-2.5" /> : step.n}
                  </span>
                  {step.label}
                </li>
              ))}
            </ol>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-4 px-6 py-5">
              {hasLegacyRun ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-[#d7e3f4] bg-[#f4f7fd] px-3.5 py-3 text-[12px] leading-relaxed text-[#2c6ecb]">
                  <Sparkles className="mt-0.5 size-3.5 shrink-0" />
                  <p>
                    This order is in a whole-order multi-job run. Pick events
                    below to convert it into event gangs (recommended), or clear
                    gangs and save to remove the run.
                  </p>
                </div>
              ) : null}

              <div className="grid min-h-[20rem] gap-3 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:items-stretch">
                <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#e3e3e3] bg-[#fafafa] shadow-[0_1px_0_rgba(26,26,26,0.03)]">
                  <div className="shrink-0 border-b border-[#ebebeb] bg-white/80 px-3.5 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#8a8a8a]">
                      1 · This order
                    </p>
                    <p className="mt-0.5 truncate text-[13px] font-semibold text-[#303030]">
                      {orderTitle(order)}
                    </p>
                  </div>
                  <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2.5">
                    {localEvents.length ? (
                      localEvents.map((event) => {
                        const active = anchorKey === event.key;
                        const inGang = claimedKeys.has(event.key);
                        return (
                          <button
                            key={event.key}
                            type="button"
                            onClick={() => {
                              setAnchorKey(event.key);
                              setError(null);
                            }}
                            className={cn(
                              "flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all",
                              active
                                ? "border-[#2d6a4f] bg-white shadow-[0_1px_0_rgba(36,92,60,0.08),0_4px_12px_rgba(36,92,60,0.08)]"
                                : "border-[#ececec] bg-white hover:border-[#d5e6db] hover:bg-[#f9fcfa]"
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                                active
                                  ? "border-[#2d6a4f] bg-[#2d6a4f]"
                                  : "border-[#cfcfcf] bg-white"
                              )}
                            >
                              {active ? (
                                <span className="size-1.5 rounded-full bg-white" />
                              ) : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-start justify-between gap-2">
                                <span className="truncate text-[13px] font-semibold text-[#303030]">
                                  {eventOptionTitle(event)}
                                </span>
                                <span className="shrink-0 rounded-md bg-[#f1f1f1] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[#616161]">
                                  {event.quantity.toLocaleString()}
                                </span>
                              </span>
                              <span className="mt-1 flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex rounded-md border border-[#e3e3e3] bg-[#fafafa] px-1.5 py-0.5 text-[10px] font-semibold text-[#616161]">
                                  {eventOptionSubtitle(event)}
                                </span>
                                {inGang ? (
                                  <span className="inline-flex rounded-md bg-[#eef7f1] px-1.5 py-0.5 text-[10px] font-semibold text-[#2d6a4f]">
                                    Ganged
                                  </span>
                                ) : null}
                              </span>
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="flex h-full min-h-[12rem] flex-col items-center justify-center rounded-xl border border-dashed border-[#e3e3e3] bg-white px-4 text-center">
                        <Layers3 className="size-5 text-[#c9c9c9]" />
                        <p className="mt-2 text-[13px] font-medium text-[#303030]">
                          No events yet
                        </p>
                        <p className="mt-1 text-[12px] text-[#8a8a8a]">
                          Add decoration or finishing events on the Events tab
                          first.
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#e3e3e3] bg-white shadow-[0_1px_0_rgba(26,26,26,0.03)]">
                  <div className="shrink-0 border-b border-[#ebebeb] px-3.5 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#8a8a8a]">
                          2 · Other orders
                        </p>
                        <p className="mt-0.5 truncate text-[13px] font-semibold text-[#303030]">
                          {anchorEvent
                            ? `Attach to ${eventOptionTitle(anchorEvent)}`
                            : "Select an event on the left"}
                        </p>
                      </div>
                      {anchorEvent ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#cfe3d6] bg-[#f4faf6] px-2.5 py-1 text-[11px] font-medium text-[#245c3c]">
                          <Link2 className="size-3" />
                          {eventOptionSubtitle(anchorEvent)} matches
                        </span>
                      ) : null}
                    </div>
                    <div className="relative mt-2.5">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#8a8a8a]" />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search orders or event names…"
                        className="h-9 w-full rounded-lg border border-[#e3e3e3] bg-[#fafafa] pl-9 pr-3 text-[12px] text-[#303030] outline-none placeholder:text-[#8a8a8a] focus:border-[#2d6a4f]/40 focus:bg-white focus:ring-2 focus:ring-[#2d6a4f]/12"
                      />
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {candidates.length ? (
                      candidates.map((candidate) => {
                        const events = listOrderEvents(candidate);
                        const expanded = expandedOrderIds.includes(candidate.id);
                        const inAnotherRun =
                          Boolean(candidate.productionRun?.id) &&
                          candidate.productionRun?.id !==
                            order.productionRun?.id;
                        const selectedOnOrder = events.filter((event) =>
                          claimedKeys.has(event.key)
                        ).length;
                        const matchCount = anchorEvent
                          ? events.filter((event) =>
                              eventsMatchForGang(anchorEvent, event)
                            ).length
                          : 0;

                        return (
                          <div
                            key={candidate.id}
                            className="border-b border-[#f0f0f0] last:border-b-0"
                          >
                            <button
                              type="button"
                              onClick={() => toggleExpanded(candidate.id)}
                              className={cn(
                                "flex w-full items-center gap-2 px-3.5 py-3 text-left transition-colors",
                                expanded ? "bg-[#fafafa]" : "hover:bg-[#fafafa]",
                                selectedOnOrder > 0 && "bg-[#f7fbf8]"
                              )}
                            >
                              {expanded ? (
                                <ChevronDown className="size-4 shrink-0 text-[#8a8a8a]" />
                              ) : (
                                <ChevronRight className="size-4 shrink-0 text-[#8a8a8a]" />
                              )}
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-semibold text-[#303030]">
                                  {orderTitle(candidate)}
                                </span>
                                <span className="mt-0.5 block text-[11px] text-[#8a8a8a]">
                                  {events.length} event
                                  {events.length === 1 ? "" : "s"}
                                  {matchCount
                                    ? ` · ${matchCount} match${matchCount === 1 ? "" : "es"}`
                                    : ""}
                                  {selectedOnOrder
                                    ? ` · ${selectedOnOrder} selected`
                                    : ""}
                                  {inAnotherRun
                                    ? " · Already in another run"
                                    : ""}
                                </span>
                              </span>
                              {matchCount > 0 ? (
                                <span className="shrink-0 rounded-full bg-[#eef7f1] px-2 py-0.5 text-[10px] font-bold text-[#2d6a4f]">
                                  {matchCount}
                                </span>
                              ) : null}
                            </button>

                            {expanded ? (
                              <div className="space-y-1.5 bg-[#fafafa] px-3 pb-3 pl-10">
                                {events.length ? (
                                  events.map((event) => {
                                    const selected = claimedKeys.has(event.key);
                                    const isMatch = Boolean(
                                      anchorEvent &&
                                        eventsMatchForGang(anchorEvent, event)
                                    );
                                    const disabled =
                                      inAnotherRun ||
                                      !anchorEvent ||
                                      (selected === false &&
                                        Boolean(
                                          gangs.some(
                                            (gang) =>
                                              !gang.members.some(
                                                (member) =>
                                                  eventMemberKey(member) ===
                                                  anchorEvent.key
                                              ) &&
                                              gang.members.some(
                                                (member) =>
                                                  eventMemberKey(member) ===
                                                  event.key
                                              )
                                          )
                                        ));

                                    return (
                                      <button
                                        key={event.key}
                                        type="button"
                                        disabled={disabled && !selected}
                                        onClick={() =>
                                          upsertGangWithRemote(event)
                                        }
                                        className={cn(
                                          "flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all",
                                          selected
                                            ? "border-[#2d6a4f]/45 bg-white shadow-sm"
                                            : isMatch
                                              ? "border-[#cfe3d6] bg-white hover:border-[#2d6a4f]/40 hover:shadow-sm"
                                              : "border-[#ececec] bg-white hover:border-[#d4d4d4]",
                                          disabled &&
                                            !selected &&
                                            "cursor-not-allowed opacity-45"
                                        )}
                                      >
                                        <span
                                          className={cn(
                                            "flex size-5 shrink-0 items-center justify-center rounded-md border",
                                            selected
                                              ? "border-[#2d6a4f] bg-[#2d6a4f] text-white"
                                              : "border-[#cfcfcf] bg-white"
                                          )}
                                        >
                                          {selected ? (
                                            <Check className="size-3.5" />
                                          ) : null}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                          <span className="flex items-center gap-1.5">
                                            <span className="truncate text-[13px] font-medium text-[#303030]">
                                              {eventOptionTitle(event)}
                                            </span>
                                            {isMatch && !selected ? (
                                              <span className="shrink-0 rounded-md bg-[#eef7f1] px-1.5 py-0.5 text-[10px] font-semibold text-[#2d6a4f]">
                                                Match
                                              </span>
                                            ) : null}
                                          </span>
                                          <span className="mt-0.5 block text-[11px] text-[#8a8a8a]">
                                            {eventOptionSubtitle(event)} ·{" "}
                                            {event.quantity.toLocaleString()} pcs
                                          </span>
                                        </span>
                                      </button>
                                    );
                                  })
                                ) : (
                                  <p className="rounded-lg border border-dashed border-[#e3e3e3] bg-white px-3 py-3 text-[12px] text-[#8a8a8a]">
                                    No events on this order.
                                  </p>
                                )}
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex h-full min-h-[14rem] flex-col items-center justify-center px-6 py-10 text-center">
                        <span className="inline-flex size-11 items-center justify-center rounded-2xl border border-[#e3e3e3] bg-[#fafafa] text-[#8a8a8a]">
                          <PackageSearch className="size-5" />
                        </span>
                        <p className="mt-3 text-[13px] font-semibold text-[#303030]">
                          {query.trim()
                            ? "No orders match your search"
                            : "No other orders for this customer"}
                        </p>
                        <p className="mt-1 max-w-xs text-[12px] leading-relaxed text-[#8a8a8a]">
                          {query.trim()
                            ? "Try a different order number or event name."
                            : "Ganging needs another open order for the same customer with events to attach."}
                        </p>
                        {query.trim() ? (
                          <button
                            type="button"
                            onClick={() => setQuery("")}
                            className="mt-3 text-[12px] font-semibold text-[#2c6ecb] hover:underline"
                          >
                            Clear search
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <section className="overflow-hidden rounded-xl border border-[#e3e3e3] bg-white shadow-[0_1px_0_rgba(26,26,26,0.03)]">
                <div className="flex items-center justify-between gap-3 border-b border-[#ebebeb] px-3.5 py-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#8a8a8a]">
                      3 · Active gangs
                    </p>
                    <p className="mt-0.5 text-[13px] font-semibold text-[#303030]">
                      {gangs.length
                        ? `${gangs.length} gang${gangs.length === 1 ? "" : "s"} ready`
                        : "None yet"}
                    </p>
                  </div>
                  {gangs.length ? (
                    <button
                      type="button"
                      onClick={() => setGangs([])}
                      className="rounded-md px-2 py-1 text-[12px] font-medium text-[#8a8a8a] transition-colors hover:bg-[#fff1f1] hover:text-[#b42318]"
                    >
                      Clear all
                    </button>
                  ) : null}
                </div>

                {gangs.length ? (
                  <div className="space-y-2 p-3">
                    {gangs.map((gang) => (
                      <div
                        key={gang.id}
                        className="rounded-xl border border-[#cfe3d6] bg-[linear-gradient(180deg,#f9fcfa_0%,#f4faf6_100%)] px-3.5 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-[#245c3c]">
                              {gangTitle(gang)}
                            </p>
                            <p className="mt-0.5 text-[11px] text-[#52705d]">
                              {gang.members.length} events ·{" "}
                              {gang.combinedQuantity.toLocaleString()} pcs
                              combined
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeGang(gang.id)}
                            className="rounded-md p-1.5 text-[#8a8a8a] transition-colors hover:bg-white hover:text-[#b42318]"
                            aria-label="Remove gang"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {gang.members.map((member) => {
                            const key = eventMemberKey(member);
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => removeMember(gang.id, key)}
                                className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#d5e6db] bg-white px-2.5 py-1 text-[11px] font-medium text-[#245c3c] shadow-[0_1px_0_rgba(36,92,60,0.04)] transition-colors hover:border-[#b42318]/30 hover:text-[#b42318]"
                                title="Remove from gang"
                              >
                                <span className="truncate">
                                  {member.orderNumber} · {member.imprintLabel}
                                </span>
                                <X className="size-3 shrink-0 opacity-60" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center px-4 py-9 text-center">
                    <span className="inline-flex size-9 items-center justify-center rounded-xl border border-dashed border-[#d5e6db] bg-[#f7fbf8] text-[#7a9a86]">
                      <Link2 className="size-4" />
                    </span>
                    <p className="mt-2.5 text-[13px] font-medium text-[#303030]">
                      Build your first gang
                    </p>
                    <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-[#8a8a8a]">
                      Select an event on this order, then check matching events
                      on other orders.
                    </p>
                  </div>
                )}
              </section>

              {error ? (
                <p className="rounded-xl border border-[#f5b5b5] bg-[#fff1f1] px-3.5 py-2.5 text-[12px] text-[#8f1f1f]">
                  {error}
                </p>
              ) : null}
            </div>
          </div>

          <div className="-mx-0 flex shrink-0 flex-col gap-3 border-t border-[#ebebeb] bg-[#fafafa] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 rounded-xl border border-[#cfe3d6] bg-[#f4faf6] px-3.5 py-2.5 sm:min-w-[16rem]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#52705d]">
                Combined pricing qty
              </p>
              <div className="mt-0.5 flex items-baseline justify-between gap-3">
                <p className="text-[11px] text-[#52705d]">
                  {gangs.length
                    ? `${linkedOrderCount} order${linkedOrderCount === 1 ? "" : "s"} in this run`
                    : "Save with no gangs to clear"}
                </p>
                <p className="text-base font-semibold tabular-nums text-[#245c3c]">
                  {gangs.length
                    ? `${combinedOrderPcs.toLocaleString()} pcs`
                    : "—"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={saving}
                className={cn(dashboardControlClass, "h-9")}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={cn(dashboardPrimaryButtonClass, "h-9")}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                {gangs.length ? "Save ganged events" : "Clear run"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * User-facing labels for production work on orders.
 * Internal types/API fields still use `job` / `jobs`.
 */
export const eventLabel = "Event";
export const eventsLabel = "Events";
export const eventLower = "event";
export const eventsLower = "events";

export const productionEventsLabel = "Production events";
export const eventsToScheduleLabel = "Events to schedule";

function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm;
}

export function formatEventCount(count: number): string {
  return `${count} ${plural(count, eventLower, eventsLower)}`;
}

export function formatProductionEventCount(count: number): string {
  return `${count} production ${plural(count, eventLower, eventsLower)}`;
}

export function formatEventsToSchedule(count: number): string {
  return `${count} ${plural(count, eventLower, eventsLower)} to schedule`;
}

export function formatProductionEventsToSchedule(count: number): string {
  return `${count} production ${plural(count, eventLower, eventsLower)} to schedule`;
}

export function formatMoreEvents(count: number): string {
  return `${count} more ${plural(count, eventLower, eventsLower)}`;
}

export function formatEventsLeft(count: number): string {
  return `${count} ${plural(count, eventLower, eventsLower)} left`;
}

export function formatEventXOfY(index: number, total: number): string {
  return `${eventLabel} ${index} of ${total}`;
}

export function formatProductionEventsAcrossOrders(
  eventCount: number,
  orderCount: number
): string {
  return `${formatProductionEventCount(eventCount)} across ${orderCount} order${orderCount !== 1 ? "s" : ""}`;
}

export const productionEventsWaitingMessage =
  "Production events waiting to go on the calendar";

export const allProductionEventsScheduledMessage =
  "All production events are on the calendar — nothing waiting to schedule.";

/** On-brand scheduling and production checkpoint labels */
export const READY_FOR_SCHEDULING_LABEL = "Ready for scheduling";
export const SCHEDULED_LABEL = "Scheduled";
export const COMPLETED_LABEL = "Completed";
export const PARTIALLY_SCHEDULED_LABEL = "Partially scheduled";

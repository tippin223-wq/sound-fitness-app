import type { DashboardCalendarItem } from "@/lib/dashboard-calendar";
import { plannedCalendarItems, readIndependentCalendar, type LinkedCalendarItem } from "./calendar";

/** Project canonical records without creating a second editable copy of a workout. */
export function planningDashboardCalendarItems(): DashboardCalendarItem[] {
  return [...plannedCalendarItems(), ...readIndependentCalendar<LinkedCalendarItem & { type?: string }>(false)].map(item => {
    const type = item.type?.toLowerCase() || "workout";
    const category: DashboardCalendarItem["type"] = /nutrition/.test(type) ? "nutrition" : /mobility|recovery/.test(type) ? "recovery" : /condition|cardio/.test(type) ? "cardio" : /testing|performance/.test(type) ? "performance" : /check-in/.test(type) ? "check-in" : "workout";
    return { id: item.id, date: item.date, time: item.time, title: item.title, status: item.status, type: category, readOnly: true, manageHref: "bookingId" in item && item.bookingId ? "/dashboard/sessions/booking" : "/dashboard/calendar" };
  });
}

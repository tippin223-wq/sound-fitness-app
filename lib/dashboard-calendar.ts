export type DashboardCalendarItem = {
  date?: string;
  dateISO?: string;
  dateLabel?: string;
  id?: string;
  time?: string;
  title: string;
  type:
    | "cardio"
    | "check-in"
    | "completed"
    | "nutrition"
    | "performance"
    | "recovery"
    | "training"
    | "workout";
  status?: string;
};

export type CalendarEvent = DashboardCalendarItem & {
  id: string;
  dateKey: string;
};

export const DASHBOARD_CALENDAR_ENTRIES_KEY = "soundFitnessDashboardCalendarEntries";

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const defaultEventMinutes: Record<DashboardCalendarItem["type"], number> = {
  cardio: 7 * 60,
  "check-in": 18 * 60,
  completed: 7 * 60 + 30,
  nutrition: 12 * 60,
  performance: 8 * 60,
  recovery: 19 * 60,
  training: 17 * 60 + 30,
  workout: 17 * 60 + 30,
};

export function calendarDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calendarAddDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function calendarWeekStart(date: Date) {
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = normalized.getDay();
  return calendarAddDays(normalized, day === 0 ? -6 : 1 - day);
}

export function parseCalendarDate(value?: string) {
  if (!value) return null;

  // Date-only values represent local calendar days, not UTC midnight.
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? null
    : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function formatCalendarTime(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

export function getCalendarEventMinutes(event: DashboardCalendarItem, eventIndex = 0) {
  const explicitTime = /^(\d{1,2}):(\d{2})/.exec(event.time || "");
  if (explicitTime) return Number(explicitTime[1]) * 60 + Number(explicitTime[2]);

  const dateWithTime = event.dateISO || event.date;
  if (dateWithTime?.includes("T")) {
    const parsed = new Date(dateWithTime);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.getHours() * 60 + parsed.getMinutes();
    }
  }

  return defaultEventMinutes[event.type] + eventIndex * 30;
}

/** Stable identity for older entries without an id; duplicate entries stay distinct. */
export function calendarEntryIdentity(item: DashboardCalendarItem, occurrence = 0) {
  const signature = JSON.stringify([
    item.date, item.dateISO, item.dateLabel, item.time, item.title, item.type, item.status,
  ]);
  let hash = 2166136261;
  for (let index = 0; index < signature.length; index += 1) {
    hash = Math.imul(hash ^ signature.charCodeAt(index), 16777619);
  }
  return `calendar-${(hash >>> 0).toString(36)}-${occurrence}`;
}

function buildFallbackItems(today: Date): DashboardCalendarItem[] {
  const weekStart = calendarWeekStart(today);
  const fallback: Pick<DashboardCalendarItem, "title" | "type" | "status">[] = [
    { title: "Full Body Strength", type: "completed", status: "Done" },
    { title: "Protein prep", type: "nutrition", status: "Plan" },
    { title: "Performance tune-up", type: "performance", status: "Power" },
    { title: "Mobility reset", type: "recovery", status: "Recovery" },
    { title: "Lower Body", type: "workout", status: "Planned" },
    { title: "Zone 2 walk", type: "recovery", status: "Optional" },
    { title: "Weekly check-in", type: "check-in", status: "Review" },
  ];
  return fallback.map((item, index) => ({
    ...item,
    date: calendarDateKey(calendarAddDays(weekStart, index)),
  }));
}

/** Calendar and constellation share both dated entries and recurring weekday markers. */
export function normalizeCalendarItems(
  items: DashboardCalendarItem[] | undefined,
  cursorDate: Date,
  today: Date,
  userEntries: DashboardCalendarItem[] = [],
): CalendarEvent[] {
  const source = [...(items?.length ? items : buildFallbackItems(today)), ...userEntries];
  const activeWeek = calendarWeekStart(cursorDate);
  const occurrences = new Map<string, number>();

  return source.map((item, index) => {
    const parsedDate = parseCalendarDate(item.date || item.dateISO);
    const labelIndex = item.dateLabel ? dayLabels.indexOf(item.dateLabel) : -1;
    const mappedDate = parsedDate || calendarAddDays(activeWeek, labelIndex >= 0 ? labelIndex : index % 7);
    const dateKey = calendarDateKey(mappedDate);
    const identity = calendarEntryIdentity({ ...item, date: dateKey });
    const occurrence = occurrences.get(identity) || 0;
    occurrences.set(identity, occurrence + 1);

    return { ...item, id: item.id || `${identity}-${occurrence}`, dateKey };
  });
}

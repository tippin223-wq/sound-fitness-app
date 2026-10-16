import {
  calendarAddDays,
  calendarDateKey,
  calendarWeekStart,
  calendarEventTimeLabel,
  getCalendarEventMinutes,
  type CalendarEvent,
  type DashboardCalendarItem,
} from "./dashboard-calendar";

export type TrainingConstellationLane =
  | "strength" | "cardio" | "recovery" | "performance" | "check-in";

const eventLanes: Record<DashboardCalendarItem["type"], TrainingConstellationLane | null> = {
  workout: "strength",
  training: "strength",
  completed: "strength",
  cardio: "cardio",
  recovery: "recovery",
  nutrition: null,
  performance: "performance",
  "check-in": "check-in",
};

export function getConstellationWeek(date: Date) {
  const monday = calendarWeekStart(date);
  return Array.from({ length: 7 }, (_, index) => {
    const day = calendarAddDays(monday, index);
    return {
      day: day.toLocaleDateString("en-US", { weekday: "short" }),
      date: String(day.getDate()),
      dateKey: calendarDateKey(day),
      fullDate: day.toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
      }),
    };
  });
}

export function getConstellationSessions(events: CalendarEvent[], date: Date) {
  const days = getConstellationWeek(date);
  const dayIndexes = new Map(days.map((day, index) => [day.dateKey, index]));
  const eventIndexByDate = new Map<string, number>();

  return events.flatMap((event) => {
    // Match the calendar's per-day fallback time, even when categories differ.
    const eventIndex = eventIndexByDate.get(event.dateKey) ?? 0;
    eventIndexByDate.set(event.dateKey, eventIndex + 1);
    const dayIndex = dayIndexes.get(event.dateKey);
    const lane = eventLanes[event.type];
    // Nutrition stays in the calendar; its overview lives outside this constellation.
    if (dayIndex === undefined || lane === null) return [];

    const statusText = event.status?.trim() || (event.type === "completed" ? "Done" : "Planned");
    const status = event.type === "completed" || /^(done|complete|completed)$/i.test(statusText)
      ? "complete" as const
      : /^missed$/i.test(statusText) ? "missed" as const
        : /^attention$/i.test(statusText) ? "attention" as const
          : "planned" as const;
    const minutes = getCalendarEventMinutes(event, eventIndex);

    return [{
      id: event.id,
      lane,
      dayIndex,
      dateKey: event.dateKey,
      fullDate: days[dayIndex].fullDate,
      title: event.title,
      time: calendarEventTimeLabel(event),
      minutes,
      status,
      statusText,
    }];
  }).sort((a, b) => a.dayIndex - b.dayIndex || a.minutes - b.minutes);
}

export type TrainingConstellationSession = ReturnType<typeof getConstellationSessions>[number];

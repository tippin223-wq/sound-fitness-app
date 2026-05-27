"use client";

import { useMemo, useState } from "react";
import DashboardTabIcon from "@/components/dashboard/DashboardTabIcon";

type CalendarView = "week" | "month";

export type DashboardCalendarItem = {
  date?: string;
  dateISO?: string;
  dateLabel?: string;
  title: string;
  type:
    | "check-in"
    | "completed"
    | "nutrition"
    | "performance"
    | "recovery"
    | "training"
    | "workout";
  status?: string;
};

type DashboardCalendarProps = {
  items?: DashboardCalendarItem[];
};

type CalendarEvent = DashboardCalendarItem & {
  dateKey: string;
};

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const longWeekdayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
});

const monthTitleFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

const compactDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const detailDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  weekday: "long",
});

const typeStyles: Record<DashboardCalendarItem["type"], string> = {
  "check-in": "border-violet-300/30 bg-violet-300/10 text-violet-100",
  completed: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  nutrition: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  performance: "border-orange-300/30 bg-orange-300/10 text-orange-100",
  recovery: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
  training: "border-sky-300/30 bg-sky-300/10 text-sky-100",
  workout: "border-sky-300/30 bg-sky-300/10 text-sky-100",
};

const dotStyles: Record<DashboardCalendarItem["type"], string> = {
  "check-in": "bg-violet-300 shadow-[0_0_12px_rgba(196,181,253,0.6)]",
  completed: "bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.6)]",
  nutrition: "bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.6)]",
  performance: "bg-orange-300 shadow-[0_0_12px_rgba(253,186,116,0.6)]",
  recovery: "bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.6)]",
  training: "bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.6)]",
  workout: "bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.6)]",
};

const typeLabels: Record<DashboardCalendarItem["type"], string> = {
  "check-in": "Check-in",
  completed: "Completed",
  nutrition: "Nutrition",
  performance: "Performance",
  recovery: "Recovery",
  training: "Workout",
  workout: "Workout",
};

const dailyTimelineSlots = [
  {
    helper: "Add meal",
    icon: "nutrition",
    key: "breakfast",
    kind: "meal",
    label: "Breakfast",
  },
  {
    helper: "Add workout",
    icon: "workout",
    key: "workout-1",
    kind: "workout",
    label: "Workout 1",
  },
  {
    helper: "Add meal",
    icon: "nutrition",
    key: "lunch",
    kind: "meal",
    label: "Lunch",
  },
  {
    helper: "Add workout",
    icon: "workout",
    key: "workout-2",
    kind: "workout",
    label: "Workout 2",
  },
  {
    helper: "Add meal",
    icon: "nutrition",
    key: "dinner",
    kind: "meal",
    label: "Dinner",
  },
  {
    helper: "Add workout",
    icon: "workout",
    key: "workout-3",
    kind: "workout",
    label: "Workout 3",
  },
] as const;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function addMonthsClamped(date: Date, months: number) {
  const targetMonthStart = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const targetMonthEnd = new Date(
    targetMonthStart.getFullYear(),
    targetMonthStart.getMonth() + 1,
    0,
  );
  const targetDay = Math.min(date.getDate(), targetMonthEnd.getDate());
  return new Date(targetMonthStart.getFullYear(), targetMonthStart.getMonth(), targetDay);
}

function startOfWeek(date: Date) {
  const normalized = startOfDay(date);
  const day = normalized.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(normalized, mondayOffset);
}

function endOfWeek(date: Date) {
  return addDays(startOfWeek(date), 6);
}

function getDayRailDays(today: Date) {
  const railStart = addDays(today, -7);
  const railEnd = addMonthsClamped(today, 9);
  const days: Date[] = [];

  for (let current = railStart; current <= railEnd; current = addDays(current, 1)) {
    days.push(current);
  }

  return days;
}

function getMonthDays(date: Date) {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days: Date[] = [];

  for (let current = gridStart; current <= gridEnd; current = addDays(current, 1)) {
    days.push(current);
  }

  return days;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseEventDate(value?: string) {
  if (!value) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed);
}

function isSameDate(a: Date, b: Date) {
  return toDateKey(a) === toDateKey(b);
}

function clampDate(date: Date, min: Date, max: Date) {
  if (date < min) return min;
  if (date > max) return max;
  return date;
}

function buildFallbackItems(today: Date): DashboardCalendarItem[] {
  const weekStart = startOfWeek(today);

  return [
    {
      date: toDateKey(addDays(weekStart, 0)),
      title: "Full Body Strength",
      type: "completed",
      status: "Done",
    },
    {
      date: toDateKey(addDays(weekStart, 1)),
      title: "Protein prep",
      type: "nutrition",
      status: "Plan",
    },
    {
      date: toDateKey(addDays(weekStart, 2)),
      title: "Performance tune-up",
      type: "performance",
      status: "Power",
    },
    {
      date: toDateKey(addDays(weekStart, 3)),
      title: "Mobility reset",
      type: "recovery",
      status: "Recovery",
    },
    {
      date: toDateKey(addDays(weekStart, 4)),
      title: "Lower Body",
      type: "workout",
      status: "Planned",
    },
    {
      date: toDateKey(addDays(weekStart, 5)),
      title: "Zone 2 walk",
      type: "recovery",
      status: "Optional",
    },
    {
      date: toDateKey(addDays(weekStart, 6)),
      title: "Weekly check-in",
      type: "check-in",
      status: "Review",
    },
  ];
}

function normalizeItems(
  items: DashboardCalendarItem[] | undefined,
  cursorDate: Date,
  today: Date,
): CalendarEvent[] {
  const source = items?.length ? items : buildFallbackItems(today);
  const activeWeek = startOfWeek(cursorDate);

  return source.map((item, index) => {
    const parsedDate = parseEventDate(item.date || item.dateISO);
    const labelIndex = item.dateLabel ? dayLabels.indexOf(item.dateLabel) : -1;
    const mappedDate =
      parsedDate ||
      (labelIndex >= 0 ? addDays(activeWeek, labelIndex) : addDays(activeWeek, index % 7));

    return {
      ...item,
      dateKey: toDateKey(mappedDate),
    };
  });
}

function groupEventsByDate(events: CalendarEvent[]) {
  return events.reduce<Record<string, CalendarEvent[]>>((grouped, event) => {
    grouped[event.dateKey] = [...(grouped[event.dateKey] || []), event];
    return grouped;
  }, {});
}

export default function DashboardCalendar({ items }: DashboardCalendarProps) {
  const [today] = useState<Date>(() => startOfDay(new Date()));
  const [view, setView] = useState<CalendarView>("week");
  const [cursorDate, setCursorDate] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayDropdownOpen, setSelectedDayDropdownOpen] = useState(false);
  const activeToday = today;
  const activeCursorDate = cursorDate || activeToday;
  const activeSelectedDate = selectedDate || activeToday;

  const eventsByDate = useMemo(
    () => groupEventsByDate(normalizeItems(items, activeCursorDate, activeToday)),
    [activeCursorDate, activeToday, items],
  );

  const dayRailDays = useMemo(() => getDayRailDays(activeToday), [activeToday]);
  const monthDays = useMemo(() => getMonthDays(activeCursorDate), [activeCursorDate]);
  const selectedEvents = eventsByDate[toDateKey(activeSelectedDate)] || [];
  const calendarReady = Boolean(today);
  const selectedDaySubLabel =
    calendarReady && isSameDate(activeSelectedDate, activeToday)
      ? "Today"
      : compactDateFormatter.format(activeSelectedDate);
  const selectedDayCountLabel = selectedEvents.length
    ? `${selectedEvents.length} marker${selectedEvents.length === 1 ? "" : "s"}`
    : "Open day";
  const weekInViewStart = startOfWeek(activeSelectedDate);
  const weekInViewEnd = endOfWeek(activeSelectedDate);
  const weekInViewLabel = `${compactDateFormatter.format(
    weekInViewStart,
  )} - ${compactDateFormatter.format(weekInViewEnd)}`;
  const calendarDateLabel = calendarReady
    ? view === "week"
      ? weekInViewLabel
      : monthTitleFormatter.format(activeCursorDate)
    : "Loading current dates";
  const selectedDayRailIndex = dayRailDays.findIndex((day) =>
    isSameDate(day, activeSelectedDate),
  );
  const todayDayRailIndex = dayRailDays.findIndex((day) =>
    isSameDate(day, activeToday),
  );
  const activeDayOrbitIndex =
    selectedDayRailIndex >= 0
      ? selectedDayRailIndex
      : Math.max(0, todayDayRailIndex);
  const viewingToday =
    view === "week"
      ? isSameDate(activeSelectedDate, activeToday)
      : activeCursorDate.getFullYear() === activeToday.getFullYear() &&
        activeCursorDate.getMonth() === activeToday.getMonth();
  const showBackToToday = calendarReady && !viewingToday;

  function moveRange(direction: "next" | "previous") {
    const amount = direction === "next" ? 1 : -1;
    const rawNextCursor =
      view === "week"
        ? addDays(activeCursorDate, amount * 7)
        : addMonths(activeCursorDate, amount);
    const railStart = dayRailDays[0];
    const railEnd = dayRailDays[dayRailDays.length - 1];
    const nextCursor =
      view === "week" && railStart && railEnd
        ? clampDate(rawNextCursor, railStart, railEnd)
        : rawNextCursor;

    setCursorDate(nextCursor);
    if (view === "week") {
      setSelectedDate(nextCursor);
    }
  }

  function jumpToToday({ focusWeek = false }: { focusWeek?: boolean } = {}) {
    const nextToday = startOfDay(new Date());
    setCursorDate(nextToday);
    setSelectedDate(nextToday);
    setSelectedDayDropdownOpen(false);
    if (focusWeek) {
      setView("week");
    }
  }

  function selectDay(day: Date) {
    setSelectedDate(day);
    setSelectedDayDropdownOpen(true);
    if (view === "week") {
      setCursorDate(day);
    } else {
      setCursorDate(new Date(day.getFullYear(), day.getMonth(), 1));
    }
  }

  function scrollWeekDays(direction: "next" | "previous") {
    const selectedIndex = dayRailDays.findIndex((day) =>
      isSameDate(day, activeSelectedDate),
    );
    const currentIndex =
      selectedIndex >= 0
        ? selectedIndex
        : dayRailDays.findIndex((day) => isSameDate(day, activeToday));
    if (currentIndex < 0) return;

    const nextIndex = Math.min(
      dayRailDays.length - 1,
      Math.max(0, currentIndex + (direction === "next" ? 1 : -1)),
    );
    const nextDay = dayRailDays[nextIndex];
    setSelectedDate(nextDay);
    setCursorDate(nextDay);
  }

  return (
    <section
      className={`dashboard-calendar-card relative overflow-hidden border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/15 backdrop-blur ${
        view === "month"
          ? "rounded-[26px] p-3 sm:p-4"
          : "rounded-[32px] p-4 sm:p-5"
      }`}
    >
      <div
        className={`flex flex-col min-[760px]:flex-row min-[760px]:items-start min-[760px]:justify-between ${
          view === "month" ? "gap-2" : "gap-3"
        }`}
      >
        <div className="min-w-0 min-[760px]:max-w-[560px]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-300">
            Dashboard Calendar
          </p>
          <h2
            className={`font-black tracking-tight text-white ${
              view === "month" ? "mt-1 text-xl sm:text-2xl" : "mt-2 text-2xl"
            }`}
          >
            Training, recovery, and nutrition markers
          </h2>
          <p
            className={`font-black uppercase leading-none tracking-tight text-cyan-50 [text-shadow:0_0_24px_rgba(34,211,238,0.16)] ${
              view === "month"
                ? "mt-2 text-xl sm:text-2xl"
                : "mt-3 text-4xl sm:text-5xl lg:text-6xl"
            }`}
          >
            {calendarDateLabel}
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end min-[760px]:ml-auto min-[760px]:pt-1">
          <div className="inline-flex rounded-full border border-white/10 bg-slate-950/58 p-1">
            {(["week", "month"] as const).map((option) => (
              <button
                aria-pressed={view === option}
                className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition ${
                  view === option
                    ? "bg-cyan-300 text-slate-950 shadow-[0_0_22px_rgba(34,211,238,0.24)]"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                }`}
                key={option}
                disabled={!calendarReady}
                onClick={() => setView(option)}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              aria-label={`Previous ${view}`}
              className="h-10 w-10 rounded-2xl border border-white/10 bg-slate-950/58 text-sm font-black text-slate-300 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 hover:text-cyan-100"
              disabled={!calendarReady}
              onClick={() => moveRange("previous")}
              type="button"
            >
              &lt;
            </button>
            <button
              aria-label={`Today - show ${weekInViewLabel} week in view`}
              className="min-h-10 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100 transition hover:bg-amber-300 hover:text-slate-950"
              onClick={() => jumpToToday({ focusWeek: true })}
              type="button"
            >
              <span className="block leading-none">Today</span>
              <span className="mt-1 block text-[8px] tracking-[0.12em] opacity-75">
                Week in view
              </span>
            </button>
            <button
              aria-label={`Next ${view}`}
              className="h-10 w-10 rounded-2xl border border-white/10 bg-slate-950/58 text-sm font-black text-slate-300 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 hover:text-cyan-100"
              disabled={!calendarReady}
              onClick={() => moveRange("next")}
              type="button"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      <div
        className={`dashboard-calendar-main grid ${
          view === "month" ? "mt-4 gap-3" : "mt-7 gap-6"
        }`}
      >
        <div className="min-w-0">
          {showBackToToday ? (
            <div
              className={`flex justify-center ${
                view === "month" ? "mb-2" : "mb-3"
              }`}
            >
              <button
                aria-label="Back to today"
                className="inline-flex min-h-9 items-center justify-center rounded-full border border-cyan-200/24 bg-cyan-300/12 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.16)] transition hover:border-amber-200/45 hover:bg-amber-300/16 hover:text-amber-50 active:scale-[0.98]"
                onClick={() => jumpToToday()}
                type="button"
              >
                Back to today
              </button>
            </div>
          ) : null}

          {view === "week" ? (
            <div className="relative">
              <button
                type="button"
                aria-label="Scroll days left"
                className="absolute left-0 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/24 bg-slate-950/78 text-lg font-black text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.14)] backdrop-blur transition hover:-translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95"
                disabled={!calendarReady}
                onClick={() => scrollWeekDays("previous")}
              >
                &lt;
              </button>
              <button
                type="button"
                aria-label="Scroll days right"
                className="absolute right-0 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/24 bg-slate-950/78 text-lg font-black text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.14)] backdrop-blur transition hover:translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95"
                disabled={!calendarReady}
                onClick={() => scrollWeekDays("next")}
              >
                &gt;
              </button>
              <div
                aria-label="Calendar day orbital scroller"
                className="relative h-[250px] overflow-hidden rounded-[30px] border border-cyan-100/10 bg-slate-950/30 px-12 py-4 [perspective:1300px] [scrollbar-width:none] sm:h-[264px] [&::-webkit-scrollbar]:hidden"
              >
                <div className="pointer-events-none absolute inset-y-4 left-0 z-10 w-24 bg-gradient-to-r from-slate-950/95 via-slate-950/58 to-transparent" />
                <div className="pointer-events-none absolute inset-y-4 right-0 z-10 w-24 bg-gradient-to-l from-slate-950/95 via-slate-950/58 to-transparent" />
                <div className="pointer-events-none absolute inset-x-14 top-1/2 h-px bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent" />
                <div className="absolute inset-x-12 top-1/2 h-[224px] -translate-y-1/2 [transform-style:preserve-3d]">
                  {dayRailDays.map((day, dayIndex) => {
                    const orbitDistance = dayIndex - activeDayOrbitIndex;
                    const orbitDepth = Math.abs(orbitDistance);

                    if (orbitDepth > 3) return null;

                    const dayKey = toDateKey(day);
                    const dayEvents = eventsByDate[dayKey] || [];
                    const todayActive = isSameDate(day, activeToday);
                    const selected = isSameDate(day, activeSelectedDate);
                    const orbitDirection = orbitDistance < 0 ? -1 : 1;
                    const orbitSlots = [
                      { opacity: 1, rotateY: 0, scale: 1, x: 0, y: 0, z: 120 },
                      { opacity: 0.82, rotateY: 28, scale: 0.88, x: 188, y: 12, z: -10 },
                      { opacity: 0.48, rotateY: 42, scale: 0.76, x: 326, y: 26, z: -150 },
                      { opacity: 0.24, rotateY: 54, scale: 0.64, x: 432, y: 38, z: -280 },
                    ];
                    const orbitSlot = orbitSlots[orbitDepth];
                    const orbitTransform = [
                      "translate(-50%, -50%)",
                      `translateX(${orbitDirection * orbitSlot.x}px)`,
                      `translateY(${orbitSlot.y}px)`,
                      `translateZ(${orbitSlot.z}px)`,
                      `rotateY(${orbitDirection * -orbitSlot.rotateY}deg)`,
                      `scale(${orbitSlot.scale})`,
                    ].join(" ");

                    const assignedEventIndexes = new Set<number>();
                    const getTimelineEvent = (
                      slotKind: (typeof dailyTimelineSlots)[number]["kind"],
                    ) => {
                      const matchIndex = dayEvents.findIndex((event, eventIndex) => {
                        if (assignedEventIndexes.has(eventIndex)) return false;

                        return slotKind === "meal"
                          ? event.type === "nutrition"
                          : ["completed", "performance", "training", "workout"].includes(
                              event.type,
                            );
                      });

                      if (matchIndex < 0) return null;

                      assignedEventIndexes.add(matchIndex);
                      return dayEvents[matchIndex];
                    };

                    return (
                      <div
                        aria-label={`${longWeekdayFormatter
                          .format(day)
                          .slice(0, 3)} ${day.getDate()} daily timeline`}
                        className={`absolute left-1/2 top-1/2 h-[224px] w-44 rounded-[24px] border p-3 text-left shadow-2xl transition duration-500 hover:border-cyan-300/45 hover:bg-cyan-300/10 ${
                          selected
                            ? "border-cyan-300/40 bg-cyan-300/10 shadow-[0_0_28px_rgba(34,211,238,0.12)]"
                            : todayActive
                              ? "border-amber-300/35 bg-amber-300/8"
                              : "border-white/10 bg-slate-950/55"
                        }`}
                        data-calendar-orbit-card="true"
                        key={dayKey}
                        style={{
                          filter:
                            orbitDepth > 1
                              ? `saturate(${1 - orbitDepth * 0.13}) blur(${(orbitDepth - 1) * 0.2}px)`
                              : undefined,
                          opacity: orbitSlot.opacity,
                          pointerEvents: orbitDepth > 2 ? "none" : "auto",
                          transform: orbitTransform,
                          zIndex: 50 - orbitDepth * 8,
                        }}
                      >
                        <button
                          aria-pressed={selected}
                          className="flex w-full min-w-0 items-start justify-between gap-2 rounded-2xl text-left transition hover:bg-white/[0.035] disabled:cursor-not-allowed"
                          disabled={!calendarReady}
                          onClick={() => selectDay(day)}
                          type="button"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-black uppercase tracking-[0.12em] text-white">
                              {longWeekdayFormatter.format(day).slice(0, 3)}
                            </span>
                            <span className="mt-1.5 block text-[2rem] font-black leading-none text-white">
                              {day.getDate()}
                            </span>
                          </span>
                          {todayActive ? (
                            <span className="shrink-0 rounded-full border border-amber-300/30 bg-amber-300/12 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-amber-100">
                              Today
                            </span>
                          ) : null}
                        </button>

                        <div className="mt-3 h-[136px] space-y-1.5 overflow-y-auto pr-1 [scrollbar-color:rgba(34,211,238,0.34)_rgba(15,23,42,0.54)] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/38 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/58">
                          {dailyTimelineSlots.map((slot) => {
                            const slotEvent = getTimelineEvent(slot.kind);
                            const isMeal = slot.kind === "meal";

                            return (
                              <button
                                aria-label={`${slotEvent ? "Open" : slot.helper} ${slot.label} on ${compactDateFormatter.format(day)}`}
                                className={`group flex w-full items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition hover:-translate-y-0.5 ${
                                  slotEvent
                                    ? typeStyles[slotEvent.type]
                                    : isMeal
                                      ? "border-amber-300/22 bg-amber-300/[0.055] text-amber-100/82 hover:border-amber-200/42 hover:bg-amber-300/12"
                                      : "border-sky-300/22 bg-sky-300/[0.055] text-sky-100/82 hover:border-sky-200/42 hover:bg-sky-300/12"
                                }`}
                                key={`${dayKey}-${slot.key}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  selectDay(day);
                                }}
                                type="button"
                              >
                                <span
                                  aria-hidden="true"
                                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border ${
                                    isMeal
                                      ? "border-amber-200/26 bg-amber-300/10"
                                      : "border-sky-200/26 bg-sky-300/10"
                                  }`}
                                >
                                  <DashboardTabIcon
                                    className="h-3.5 w-3.5"
                                    name={slot.icon}
                                  />
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate text-[9px] font-black uppercase tracking-[0.1em]">
                                    {slot.label}
                                  </span>
                                  <span className="mt-0.5 block truncate text-[8px] font-bold uppercase tracking-[0.09em] opacity-70">
                                    {slotEvent
                                      ? slotEvent.title
                                      : slot.helper}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[22px] border border-white/10 bg-slate-950/35 p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="min-w-[680px]">
                <div className="grid grid-cols-7 gap-1.5 pb-1.5">
                  {dayLabels.map((day) => (
                    <div
                      className="px-2 text-center text-[9px] font-black uppercase tracking-[0.16em] text-slate-500"
                      key={day}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {monthDays.map((day) => {
                    const dayKey = toDateKey(day);
                    const dayEvents = eventsByDate[dayKey] || [];
                    const todayActive = isSameDate(day, activeToday);
                    const selected = isSameDate(day, activeSelectedDate);
                    const outsideMonth = day.getMonth() !== activeCursorDate.getMonth();

                    return (
                      <button
                        aria-pressed={selected}
                        className={`min-h-[58px] rounded-xl border px-2 py-1.5 text-left transition duration-300 hover:border-cyan-300/35 hover:bg-cyan-300/8 ${
                          selected
                            ? "border-cyan-300/45 bg-cyan-300/10 shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                            : todayActive
                              ? "border-amber-300/35 bg-amber-300/8"
                              : "border-white/10 bg-slate-950/52"
                        } ${outsideMonth ? "opacity-45" : ""}`}
                        key={dayKey}
                        disabled={!calendarReady}
                        onClick={() => selectDay(day)}
                        type="button"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-black leading-none text-white">
                            {day.getDate()}
                          </span>
                          {todayActive ? (
                            <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.7)]" />
                          ) : null}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {dayEvents.slice(0, 4).map((event) => (
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${dotStyles[event.type]}`}
                              key={`${event.dateKey}-${event.title}`}
                              title={event.title}
                            />
                          ))}
                          {dayEvents.length > 4 ? (
                            <span className="text-[10px] font-black text-slate-400">
                              +{dayEvents.length - 4}
                            </span>
                          ) : null}
                        </div>
                        {dayEvents[0] ? (
                          <p className="mt-1 truncate text-[9px] font-bold leading-tight text-slate-300">
                            {dayEvents[0].title}
                          </p>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {selectedDayDropdownOpen ? (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-end justify-end bg-slate-950/8 p-4 sm:p-5">
          <div
            data-dashboard-orbiter-local-scroll="true"
            className="pointer-events-auto w-full max-w-[420px] overflow-hidden rounded-[28px] border border-cyan-100/20 bg-slate-950/88 shadow-[0_28px_90px_rgba(0,0,0,0.46),0_0_40px_rgba(34,211,238,0.14),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl"
          >
            <div className="flex min-w-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
                  Selected Day
                </p>
                <h3 className="mt-1 truncate text-lg font-black text-white">
                  {detailDateFormatter.format(activeSelectedDate)}
                </h3>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  {selectedDaySubLabel}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
                  {selectedDayCountLabel}
                </span>
                <button
                  aria-label="Close selected day popup"
                  className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-slate-950/70 text-sm font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
                  onClick={() => setSelectedDayDropdownOpen(false)}
                  type="button"
                >
                  x
                </button>
              </div>
            </div>

            <div className="max-h-[230px] space-y-2.5 overflow-y-auto p-3 [scrollbar-color:rgba(34,211,238,0.34)_rgba(15,23,42,0.54)] [scrollbar-width:thin]">
              {selectedEvents.length ? (
                selectedEvents.map((event) => (
                  <div
                    className={`rounded-2xl border px-3 py-3 ${typeStyles[event.type]}`}
                    key={`${event.dateKey}-${event.title}-detail`}
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black leading-tight">
                          {event.title}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">
                          {typeLabels[event.type]}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-current/20 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] opacity-80">
                        {event.status || "Set"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm font-semibold leading-6 text-slate-400">
                  Nothing scheduled yet. Future plan, nutrition, recovery, and
                  check-in data can land here safely.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

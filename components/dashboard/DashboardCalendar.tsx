"use client";

import { useEffect, useMemo, useState } from "react";

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
const stableInitialDate = new Date(2026, 0, 5);

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

function startOfWeek(date: Date) {
  const normalized = startOfDay(date);
  const day = normalized.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(normalized, mondayOffset);
}

function endOfWeek(date: Date) {
  return addDays(startOfWeek(date), 6);
}

function getWeekDays(date: Date) {
  const first = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(first, index));
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

function getRangeLabel(view: CalendarView, cursorDate: Date) {
  if (view === "month") return monthTitleFormatter.format(cursorDate);

  const weekStart = startOfWeek(cursorDate);
  const weekEnd = endOfWeek(cursorDate);
  return `${compactDateFormatter.format(weekStart)} - ${compactDateFormatter.format(weekEnd)}`;
}

export default function DashboardCalendar({ items }: DashboardCalendarProps) {
  const [today, setToday] = useState<Date | null>(null);
  const [view, setView] = useState<CalendarView>("week");
  const [cursorDate, setCursorDate] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const activeToday = today || stableInitialDate;
  const activeCursorDate = cursorDate || stableInitialDate;
  const activeSelectedDate = selectedDate || stableInitialDate;

  useEffect(() => {
    const currentDate = startOfDay(new Date());
    setToday(currentDate);
    setCursorDate(currentDate);
    setSelectedDate(currentDate);
  }, []);

  const eventsByDate = useMemo(
    () => groupEventsByDate(normalizeItems(items, activeCursorDate, activeToday)),
    [activeCursorDate, activeToday, items],
  );

  const weekDays = useMemo(() => getWeekDays(activeCursorDate), [activeCursorDate]);
  const monthDays = useMemo(() => getMonthDays(activeCursorDate), [activeCursorDate]);
  const selectedEvents = eventsByDate[toDateKey(activeSelectedDate)] || [];
  const calendarReady = Boolean(today && cursorDate && selectedDate);

  function moveRange(direction: "next" | "previous") {
    if (!cursorDate) return;

    const amount = direction === "next" ? 1 : -1;
    const nextCursor =
      view === "week" ? addDays(cursorDate, amount * 7) : addMonths(cursorDate, amount);

    setCursorDate(nextCursor);
  }

  function jumpToToday() {
    const nextToday = startOfDay(new Date());
    setCursorDate(nextToday);
    setSelectedDate(nextToday);
  }

  function selectDay(day: Date) {
    setSelectedDate(day);
    if (view === "month") {
      setCursorDate(new Date(day.getFullYear(), day.getMonth(), 1));
    }
  }

  return (
    <section className="dashboard-calendar-card overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/15 backdrop-blur sm:p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-300">
            Dashboard Calendar
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
            Training, recovery, and nutrition markers
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-400">
            {calendarReady ? getRangeLabel(view, activeCursorDate) : "Loading current dates"}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
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
              className="min-h-10 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100 transition hover:bg-amber-300 hover:text-slate-950"
              onClick={jumpToToday}
              type="button"
            >
              Today
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

      <div className="dashboard-calendar-main mt-6 grid gap-6">
        <div className="min-w-0">
          {view === "week" ? (
            <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-3 scroll-smooth [scrollbar-color:rgba(34,211,238,0.48)_rgba(15,23,42,0.70)] [scrollbar-width:thin] [touch-action:pan-x] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/65">
              <div className="grid min-w-[896px] grid-cols-7 gap-3">
                {weekDays.map((day) => {
                  const dayKey = toDateKey(day);
                  const dayEvents = eventsByDate[dayKey] || [];
                  const todayActive = isSameDate(day, activeToday);
                  const selected = isSameDate(day, activeSelectedDate);

                  return (
                    <button
                      aria-pressed={selected}
                      className={`min-h-[148px] min-w-0 rounded-3xl border p-3 text-left transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-cyan-300/8 ${
                        selected
                          ? "border-cyan-300/40 bg-cyan-300/10 shadow-[0_0_28px_rgba(34,211,238,0.12)]"
                          : todayActive
                            ? "border-amber-300/35 bg-amber-300/8"
                            : "border-white/10 bg-slate-950/55"
                      }`}
                      key={dayKey}
                      disabled={!calendarReady}
                      onClick={() => selectDay(day)}
                      type="button"
                    >
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="block truncate text-xs font-black uppercase tracking-[0.12em] text-white">
                            {longWeekdayFormatter.format(day).slice(0, 3)}
                          </span>
                          <span className="mt-1 block text-2xl font-black leading-none text-white">
                            {day.getDate()}
                          </span>
                        </div>
                        {todayActive ? (
                          <span className="shrink-0 rounded-full border border-amber-300/30 bg-amber-300/12 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-amber-100">
                            Today
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 space-y-1.5">
                        {dayEvents.length ? (
                          dayEvents.slice(0, 3).map((event) => (
                            <div
                              className={`rounded-xl border px-2.5 py-1.5 ${typeStyles[event.type]}`}
                              key={`${event.dateKey}-${event.title}`}
                            >
                              <div className="truncate text-[11px] font-black leading-tight">
                                {event.title}
                              </div>
                              <div className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-[0.1em] opacity-70">
                                {event.status || typeLabels[event.type]}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl border border-white/10 bg-white/[0.025] px-2.5 py-1.5 text-[11px] font-bold text-slate-500">
                            Open
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[28px] border border-white/10 bg-slate-950/35 p-3">
              <div className="min-w-[680px]">
                <div className="grid grid-cols-7 gap-2 pb-2">
                  {dayLabels.map((day) => (
                    <div
                      className="px-2 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-500"
                      key={day}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {monthDays.map((day) => {
                    const dayKey = toDateKey(day);
                    const dayEvents = eventsByDate[dayKey] || [];
                    const todayActive = isSameDate(day, activeToday);
                    const selected = isSameDate(day, activeSelectedDate);
                    const outsideMonth = day.getMonth() !== activeCursorDate.getMonth();

                    return (
                      <button
                        aria-pressed={selected}
                        className={`min-h-[102px] rounded-2xl border p-2 text-left transition duration-300 hover:border-cyan-300/35 hover:bg-cyan-300/8 ${
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
                          <span className="text-sm font-black text-white">
                            {day.getDate()}
                          </span>
                          {todayActive ? (
                            <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.7)]" />
                          ) : null}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {dayEvents.slice(0, 4).map((event) => (
                            <span
                              className={`h-2 w-2 rounded-full ${dotStyles[event.type]}`}
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
                          <p className="mt-3 truncate text-[11px] font-bold text-slate-300">
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

        <aside className="min-w-0 rounded-[28px] border border-white/10 bg-slate-950/58 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
            Selected Day
          </p>
          <h3 className="mt-2 text-xl font-black text-white">
            {detailDateFormatter.format(activeSelectedDate)}
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {calendarReady && isSameDate(activeSelectedDate, activeToday)
              ? "Today"
              : compactDateFormatter.format(activeSelectedDate)}
          </p>

          <div className="mt-4 space-y-2.5">
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
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-slate-400">
                Nothing scheduled yet. Future plan, nutrition, recovery, and
                check-in data can land here safely.
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

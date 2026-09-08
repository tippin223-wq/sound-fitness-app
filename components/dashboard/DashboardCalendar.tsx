"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  calendarAddDays as addDays,
  calendarDateKey as toDateKey,
  calendarWeekStart as startOfWeek,
  formatCalendarTime as formatTimelineTime,
  getCalendarEventMinutes as getEventTimelineMinutes,
  normalizeCalendarItems as normalizeItems,
  parseCalendarDate,
  type CalendarEvent,
  type DashboardCalendarItem,
} from "@/lib/dashboard-calendar";
import { useDashboardCalendarEntries } from "./useDashboardCalendarEntries";
import {
  Accessibility,
  Apple,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  Dumbbell,
  HeartPulse,
  House,
  Maximize2,
  Minimize2,
  MonitorPlay,
  Utensils,
  Wind,
  type LucideIcon,
} from "lucide-react";

type CalendarView = "week" | "month";
type CalendarOrbitCommand = {
  direction: "left" | "right";
  sequence: number;
};

export type { DashboardCalendarItem } from "@/lib/dashboard-calendar";

type DashboardCalendarProps = {
  collapsible?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  items?: DashboardCalendarItem[];
  initialDate?: Date;
  onDateChange?: (date: Date) => void;
  orbitCommand?: CalendarOrbitCommand | null;
};

type CalendarAddOption = {
  icon: LucideIcon;
  key: string;
  label: string;
  time: string;
  title: string;
  type: DashboardCalendarItem["type"];
};

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const timeHourOptions = Array.from({ length: 12 }, (_, index) => index + 1);
const timeMinuteOptions = Array.from({ length: 12 }, (_, index) =>
  String(index * 5).padStart(2, "0"),
);

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
  cardio: "border-orange-300/30 bg-orange-300/10 text-orange-100",
  "check-in": "border-violet-300/30 bg-violet-300/10 text-violet-100",
  completed: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  nutrition: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  performance: "border-orange-300/30 bg-orange-300/10 text-orange-100",
  recovery: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
  training: "border-sky-300/30 bg-sky-300/10 text-sky-100",
  workout: "border-sky-300/30 bg-sky-300/10 text-sky-100",
};

const dotStyles: Record<DashboardCalendarItem["type"], string> = {
  cardio: "bg-orange-300 shadow-[0_0_12px_rgba(253,186,116,0.6)]",
  "check-in": "bg-violet-300 shadow-[0_0_12px_rgba(196,181,253,0.6)]",
  completed: "bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.6)]",
  nutrition: "bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.6)]",
  performance: "bg-orange-300 shadow-[0_0_12px_rgba(253,186,116,0.6)]",
  recovery: "bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.6)]",
  training: "bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.6)]",
  workout: "bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.6)]",
};

const typeLabels: Record<DashboardCalendarItem["type"], string> = {
  cardio: "Cardio",
  "check-in": "Check-in",
  completed: "Completed",
  nutrition: "Nutrition",
  performance: "Performance",
  recovery: "Recovery",
  training: "Workout",
  workout: "Workout",
};

// Quick-add cards inherit the highlighted date and time.
const calendarAddOptions = [
  { key: "cardio", icon: HeartPulse, label: "Cardio", time: "07:00", title: "Cardio session", type: "cardio" },
  { key: "meal", icon: Utensils, label: "Meal", time: "12:00", title: "Meal", type: "nutrition" },
  { key: "strength", icon: Dumbbell, label: "Strength", time: "17:30", title: "Strength workout", type: "workout" },
  { key: "recovery", icon: Wind, label: "Recovery", time: "19:00", title: "Recovery block", type: "recovery" },
] as const satisfies readonly CalendarAddOption[];

const soundSessionAddOptions = [
  {
    key: "in-home-strength-training",
    icon: House,
    label: "In-Home Strength Training",
    time: "17:30",
    title: "In-Home Strength Training",
    type: "workout",
  },
  {
    key: "assisted-stretch",
    icon: Accessibility,
    label: "Assisted Stretch",
    time: "18:00",
    title: "Assisted Stretch",
    type: "recovery",
  },
  {
    key: "online-training",
    icon: MonitorPlay,
    label: "Online Training",
    time: "17:30",
    title: "Online Training",
    type: "training",
  },
  {
    key: "sound-session-nutrition",
    icon: Apple,
    label: "Nutrition",
    time: "12:00",
    title: "Nutrition Session",
    type: "nutrition",
  },
] as const satisfies readonly CalendarAddOption[];

const calendarAddCardClassName =
  "group flex min-h-[108px] w-[100px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border bg-gradient-to-b from-white/[0.06] to-transparent px-2 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_10px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/70 motion-reduce:transform-none";

function createCalendarEntryId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `calendar-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const weekTimelineHours = Array.from({ length: 19 }, (_, index) => index + 5);

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
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

function isSameDate(a: Date, b: Date) {
  return toDateKey(a) === toDateKey(b);
}

function clampDate(date: Date, min: Date, max: Date) {
  if (date < min) return min;
  if (date > max) return max;
  return date;
}

function groupEventsByDate(events: CalendarEvent[]) {
  return events.reduce<Record<string, CalendarEvent[]>>((grouped, event) => {
    grouped[event.dateKey] = [...(grouped[event.dateKey] || []), event];
    return grouped;
  }, {});
}

export default function DashboardCalendar({
  collapsible = false,
  onCollapsedChange,
  items,
  initialDate,
  onDateChange,
  orbitCommand,
}: DashboardCalendarProps) {
  const [today] = useState<Date>(() => startOfDay(new Date()));
  const [view, setView] = useState<CalendarView>("week");
  const [collapsed, setCollapsed] = useState(false);
  const [cursorDate, setCursorDate] = useState<Date | null>(() => initialDate ? startOfDay(initialDate) : null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => initialDate ? startOfDay(initialDate) : null);
  const [highlightedWeekHour, setHighlightedWeekHour] = useState(() =>
    Math.max(
      weekTimelineHours[0],
      Math.min(
        weekTimelineHours[weekTimelineHours.length - 1],
        new Date().getHours(),
      ),
    ),
  );
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const weekGridScrollRef = useRef<HTMLDivElement | null>(null);
  const [selectedDayDropdownOpen, setSelectedDayDropdownOpen] = useState(false);
  const [soundSessionMenuOpen, setSoundSessionMenuOpen] = useState(false);
  const [userEntries, setUserEntries] = useDashboardCalendarEntries();
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingEntryTitle, setEditingEntryTitle] = useState("");
  const [editingEntryTime, setEditingEntryTime] = useState("");
  const [editingTimePickerOpen, setEditingTimePickerOpen] = useState(false);
  const editingHourListRef = useRef<HTMLDivElement | null>(null);
  const editingMinuteListRef = useRef<HTMLDivElement | null>(null);
  const addOptionsRailRef = useRef<HTMLDivElement | null>(null);
  const [pendingDeleteEntryId, setPendingDeleteEntryId] = useState<string | null>(null);
  const consumedOrbitCommandRef = useRef<number | null>(null);
  const activeToday = today;
  const activeCursorDate = cursorDate || activeToday;
  const activeSelectedDate = selectedDate || activeToday;
  const activeCursorDateKey = toDateKey(activeCursorDate);
  const highlightedWeekTime = `${String(highlightedWeekHour).padStart(2, "0")}:00`;

  useEffect(() => {
    const date = parseCalendarDate(activeCursorDateKey);
    if (date) onDateChange?.(date);
  }, [activeCursorDateKey, onDateChange]);

  useEffect(() => {
    const updateCurrentTime = () => setCurrentTime(new Date());
    updateCurrentTime();
    const interval = window.setInterval(updateCurrentTime, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!editingTimePickerOpen) return;

    const centerSelection = () => {
      [editingHourListRef.current, editingMinuteListRef.current].forEach((list) => {
        const selected = list?.querySelector<HTMLElement>('[aria-selected="true"]');
        if (!list || !selected) return;
        const listBounds = list.getBoundingClientRect();
        const selectedBounds = selected.getBoundingClientRect();
        list.scrollTop +=
          selectedBounds.top -
          listBounds.top -
          (list.clientHeight - selected.offsetHeight) / 2;
      });
    };
    const frame = window.requestAnimationFrame(centerSelection);
    const observer = new ResizeObserver(centerSelection);
    [editingHourListRef.current, editingMinuteListRef.current].forEach((list) => {
      if (list) observer.observe(list);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [editingEntryTime, editingTimePickerOpen]);

  const eventsByDate = useMemo(
    () =>
      groupEventsByDate(
        normalizeItems(items, activeCursorDate, activeToday, userEntries),
      ),
    [activeCursorDate, activeToday, items, userEntries],
  );

  function addUserEntry(option: CalendarAddOption) {
    const entry: DashboardCalendarItem = {
      date: toDateKey(activeSelectedDate),
      id: createCalendarEntryId(),
      status: "Planned",
      time: view === "week" ? highlightedWeekTime : option.time,
      title: option.title,
      type: option.type,
    };
    setUserEntries((previous) => [...previous, entry]);
    setSoundSessionMenuOpen(false);
  }

  function scrollAddOptions(direction: -1 | 1) {
    const rail = addOptionsRailRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction * Math.max(104, rail.clientWidth * 0.8),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }

  function beginEditingEntry(entry: DashboardCalendarItem) {
    if (!entry.id) return;
    setEditingEntryId(entry.id);
    setEditingEntryTitle(entry.title);
    setEditingEntryTime(entry.time || highlightedWeekTime);
    setEditingTimePickerOpen(false);
    setPendingDeleteEntryId(null);
  }

  function saveEditedEntry() {
    if (!editingEntryId || !editingEntryTitle.trim()) return;

    setUserEntries((previous) =>
      previous.map((entry) =>
        entry.id === editingEntryId
          ? {
              ...entry,
              time: editingEntryTime || entry.time,
              title: editingEntryTitle.trim(),
            }
          : entry,
      ),
    );
    setEditingEntryId(null);
    setEditingTimePickerOpen(false);
  }

  function moveEditingTime(part: "hour" | "minute", direction: -1 | 1) {
    setEditingEntryTime((previous) => {
      const [hour, minute] = previous.split(":").map(Number);
      // Move within the chosen column, leaving the other columns unchanged.
      const nextHour = part === "hour"
        ? ((hour % 12) + direction + 12) % 12 + (hour >= 12 ? 12 : 0)
        : hour;
      const nextMinute = part === "minute"
        ? ((direction === 1
          ? Math.floor(minute / 5) * 5 + 5
          : Math.ceil(minute / 5) * 5 - 5) + 60) % 60
        : minute;
      return `${String(nextHour).padStart(2, "0")}:${String(nextMinute).padStart(2, "0")}`;
    });
  }

  function deleteUserEntry(entryId: string) {
    setUserEntries((previous) => previous.filter((entry) => entry.id !== entryId));
    setEditingEntryId(null);
    setEditingTimePickerOpen(false);
    setPendingDeleteEntryId(null);
  }

  const dayRailDays = useMemo(() => getDayRailDays(activeToday), [activeToday]);
  const monthDays = useMemo(() => getMonthDays(activeCursorDate), [activeCursorDate]);
  const selectedEvents = eventsByDate[toDateKey(activeSelectedDate)] || [];
  const selectedCellEvents =
    view === "week"
      ? selectedEvents.filter(
          (event, eventIndex) =>
            Math.max(
              weekTimelineHours[0],
              Math.min(
                weekTimelineHours[weekTimelineHours.length - 1],
                Math.floor(getEventTimelineMinutes(event, eventIndex) / 60),
              ),
            ) === highlightedWeekHour,
        )
      : selectedEvents;
  const activeEditingEntry = selectedCellEvents.find(
    (event) => event.id === editingEntryId,
  );
  const displayedCellEvents = activeEditingEntry
    ? [activeEditingEntry]
    : selectedCellEvents;
  const todayEvents = eventsByDate[toDateKey(activeToday)] || [];
  const calendarReady = Boolean(today);
  const selectedDayDateLabel =
    calendarReady && isSameDate(activeSelectedDate, activeToday)
      ? "Today"
      : compactDateFormatter.format(activeSelectedDate);
  const selectedDaySubLabel =
    view === "week"
      ? `${selectedDayDateLabel} · ${formatTimelineTime(highlightedWeekHour * 60)}`
      : selectedDayDateLabel;
  const weekInViewStart = startOfWeek(activeSelectedDate);
  const weekInViewEnd = endOfWeek(activeSelectedDate);
  const weekInViewLabel = `${compactDateFormatter.format(
    weekInViewStart,
  )} - ${compactDateFormatter.format(weekInViewEnd)}`;
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekInViewStart, index)),
    [weekInViewStart],
  );
  const currentTimeMinutes = currentTime
    ? currentTime.getHours() * 60 + currentTime.getMinutes()
    : null;
  const currentTimeDayIndex = currentTime
    ? weekDays.findIndex((day) => isSameDate(day, currentTime))
    : -1;
  const currentTimeHour =
    currentTimeMinutes === null ? null : Math.floor(currentTimeMinutes / 60);
  const currentTimeGridRow =
    currentTimeHour === null
      ? null
      : currentTimeHour - weekTimelineHours[0] + 2;
  const currentTimeIsVisible =
    currentTimeMinutes !== null &&
    currentTimeDayIndex >= 0 &&
    currentTimeHour !== null &&
    currentTimeHour >= weekTimelineHours[0] &&
    currentTimeHour <= weekTimelineHours[weekTimelineHours.length - 1];

  useEffect(() => {
    if (view !== "week") return;

    const frame = window.requestAnimationFrame(() => {
      const scroller = weekGridScrollRef.current;
      const activeCell = scroller?.querySelector<HTMLElement>(
        '[data-calendar-cell-active="true"]',
      );
      if (!scroller || !activeCell) return;

      const stickyTimeRailWidth = 56;
      const stickyDayHeaderHeight = 44;
      const visibleCenterX =
        stickyTimeRailWidth +
        (scroller.clientWidth - stickyTimeRailWidth) / 2;
      const visibleCenterY =
        stickyDayHeaderHeight +
        (scroller.clientHeight - stickyDayHeaderHeight) / 2;
      const targetLeft = Math.max(
        0,
        Math.min(
          scroller.scrollWidth - scroller.clientWidth,
          activeCell.offsetLeft + activeCell.offsetWidth / 2 - visibleCenterX,
        ),
      );
      const targetTop = Math.max(
        0,
        Math.min(
          scroller.scrollHeight - scroller.clientHeight,
          activeCell.offsetTop + activeCell.offsetHeight / 2 - visibleCenterY,
        ),
      );

      scroller.scrollTo({
        behavior: "smooth",
        left: targetLeft,
        top: targetTop,
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeSelectedDate, highlightedWeekHour, view]);

  const calendarDateLabel = calendarReady
    ? view === "week"
      ? weekInViewLabel
      : monthTitleFormatter.format(activeCursorDate)
    : "Loading current dates";
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

  function selectDay(day: Date) {
    setSelectedDate(day);
    setSelectedDayDropdownOpen(true);
    setSoundSessionMenuOpen(false);
    setEditingEntryId(null);
    setPendingDeleteEntryId(null);
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

  function moveHighlightedWeekHour(direction: "down" | "up") {
    setHighlightedWeekHour((currentHour) => {
      const hourChange = direction === "down" ? 1 : -1;
      return Math.max(
        weekTimelineHours[0],
        Math.min(
          weekTimelineHours[weekTimelineHours.length - 1],
          currentHour + hourChange,
        ),
      );
    });
    setSelectedDayDropdownOpen(false);
  }

  function moveHighlightedWeekDay(direction: "left" | "right") {
    scrollWeekDays(direction === "left" ? "previous" : "next");
    setSelectedDayDropdownOpen(false);
  }

  useEffect(() => {
    if (!orbitCommand || view !== "week" || !calendarReady) return;
    if (consumedOrbitCommandRef.current === orbitCommand.sequence) return;

    consumedOrbitCommandRef.current = orbitCommand.sequence;
    scrollWeekDays(orbitCommand.direction === "right" ? "next" : "previous");
  }, [calendarReady, orbitCommand, view]);

  return (
    <section
      className={`dashboard-calendar-card relative w-full overflow-hidden border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/15 backdrop-blur ${
        collapsed
          ? "rounded-[22px] p-3 sm:p-4"
          : view === "month"
          ? "flex h-full min-h-0 flex-col rounded-[26px] p-3 sm:p-4"
          : "flex h-full min-h-0 flex-col rounded-[32px] px-3 pb-1 pt-3"
      }`}
    >
      {collapsed ? (
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-amber-300/30 bg-amber-300/10 text-center shadow-[0_0_24px_rgba(252,211,77,0.1)]">
            <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-amber-100">
              {longWeekdayFormatter.format(activeSelectedDate).slice(0, 3)}
            </span>
            <span className="-mt-1 block text-2xl font-black leading-none text-white">
              {activeSelectedDate.getDate()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
              My Training Calendar
            </p>
            <p className="mt-1 text-lg font-black text-white">
              {isSameDate(activeSelectedDate, activeToday)
                ? "Today"
                : compactDateFormatter.format(activeSelectedDate)}
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-400">
              {selectedEvents.length
                ? selectedEvents.map((event) => event.title).join(" / ")
                : "Nothing scheduled yet"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              aria-label="Previous week"
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-slate-950/58 text-sm font-black text-slate-300 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!calendarReady}
              onClick={() => moveRange("previous")}
              title="Previous week"
              type="button"
            >
              &lt;
            </button>
            <button
              aria-label="Next week"
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-slate-950/58 text-sm font-black text-slate-300 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!calendarReady}
              onClick={() => moveRange("next")}
              title="Next week"
              type="button"
            >
              &gt;
            </button>
          </div>
          {collapsible ? (
            <button
              aria-label="Expand calendar"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-200/24 bg-cyan-300/10 text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/18"
              onClick={() => {
                setCollapsed(false);
                onCollapsedChange?.(false);
              }}
              title="Expand calendar"
              type="button"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : (
        <>
      <div className="relative shrink-0">
        <div
          className={`min-w-0 ${collapsible ? "pr-[13rem]" : "pr-[9.75rem] sm:pr-44"}`}
        >
          <p className="shrink-0 text-[11px] font-black uppercase tracking-[0.24em] text-amber-300">
            My Training Calendar
          </p>
          <div className="mt-3 flex min-w-0 items-center gap-2">
            <button
              aria-label={`Previous ${view}`}
              className="grid h-7 w-5 shrink-0 place-items-center bg-transparent p-0 text-lg font-black text-slate-300 transition hover:-translate-x-0.5 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/60"
              disabled={!calendarReady}
              onClick={() => moveRange("previous")}
              type="button"
            >
              &lt;
            </button>
            <p className="min-w-0 whitespace-nowrap text-base font-black uppercase leading-none tracking-normal text-cyan-50 [text-shadow:0_0_24px_rgba(34,211,238,0.16)] sm:text-lg">
              {calendarDateLabel}
            </p>
            <button
              aria-label={`Next ${view}`}
              className="grid h-7 w-5 shrink-0 place-items-center bg-transparent p-0 text-lg font-black text-slate-300 transition hover:translate-x-0.5 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/60"
              disabled={!calendarReady}
              onClick={() => moveRange("next")}
              type="button"
            >
              &gt;
            </button>
          </div>
        </div>

        <div className="absolute right-0 top-0 flex shrink-0 gap-2">
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

          {collapsible ? (
            <button
              aria-label="Collapse calendar to today"
              className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-slate-950/58 text-slate-300 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 hover:text-cyan-100"
              onClick={() => {
                setCollapsed(true);
                setSelectedDayDropdownOpen(false);
                onCollapsedChange?.(true);
              }}
              title="Collapse calendar"
              type="button"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div
        className={`dashboard-calendar-main grid min-h-0 ${
          view === "month" ? "mt-3 flex-1 gap-3" : "mt-4 flex-1 gap-6"
        }`}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {view === "week" ? (
            <div className="grid min-h-0 flex-1 grid-cols-[1.5rem_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_1.5rem] gap-1">
              <div
                aria-label="Calendar vertical cell controls"
                className="flex min-h-0 flex-col items-center justify-center gap-5"
              >
                <button
                  aria-label="Highlight previous calendar time"
                  className="grid h-6 w-6 place-items-center bg-transparent p-0 text-cyan-100 transition hover:-translate-y-0.5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/60 disabled:opacity-30"
                  disabled={highlightedWeekHour <= weekTimelineHours[0]}
                  onClick={() => moveHighlightedWeekHour("up")}
                  type="button"
                >
                  <ChevronUp aria-hidden="true" className="h-5 w-5" strokeWidth={2.8} />
                </button>
                <button
                  aria-label="Highlight next calendar time"
                  className="grid h-6 w-6 place-items-center bg-transparent p-0 text-cyan-100 transition hover:translate-y-0.5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/60 disabled:opacity-30"
                  disabled={
                    highlightedWeekHour >=
                    weekTimelineHours[weekTimelineHours.length - 1]
                  }
                  onClick={() => moveHighlightedWeekHour("down")}
                  type="button"
                >
                  <ChevronDown aria-hidden="true" className="h-5 w-5" strokeWidth={2.8} />
                </button>
              </div>
              <div
                aria-label="Weekly training time grid"
                className="min-h-0 overflow-auto overscroll-contain rounded-[20px] border border-white/10 bg-slate-950/35 [scrollbar-width:none] [touch-action:pan-x_pan-y] [&::-webkit-scrollbar]:hidden"
                ref={weekGridScrollRef}
              >
              <div
                className="relative grid min-w-[73rem]"
                style={{
                  gridTemplateColumns: "3.5rem repeat(7, minmax(9.75rem, 1fr))",
                  gridTemplateRows: `2.75rem repeat(${weekTimelineHours.length}, 3.25rem)`,
                }}
              >
                <div className="sticky left-0 top-0 z-40 grid place-items-center border-b border-r border-white/10 bg-slate-950/95 text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">
                  Time
                </div>
                {weekDays.map((day, dayIndex) => {
                  const todayActive = isSameDate(day, activeToday);
                  const selected = isSameDate(day, activeSelectedDate);

                  return (
                    <button
                      aria-pressed={selected}
                      className={`sticky top-0 z-30 flex items-center justify-center gap-2 border-b border-r px-2 text-center backdrop-blur-xl transition ${
                        selected
                          ? "border-cyan-200/30 bg-cyan-300/18 text-cyan-50"
                          : todayActive
                            ? "border-amber-200/24 bg-amber-300/12 text-amber-50"
                            : "border-white/10 bg-slate-950/92 text-slate-300 hover:bg-cyan-300/10"
                      }`}
                      key={`week-heading-${toDateKey(day)}`}
                      onClick={() => selectDay(day)}
                      style={{ gridColumn: dayIndex + 2, gridRow: 1 }}
                      type="button"
                    >
                      <span className="text-[9px] font-black uppercase tracking-[0.12em]">
                        {longWeekdayFormatter.format(day).slice(0, 3)}
                      </span>
                      <span className="text-sm font-black">{day.getDate()}</span>
                      {todayActive ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.8)]" />
                      ) : null}
                    </button>
                  );
                })}
                {weekTimelineHours.map((hour, hourIndex) => (
                  <div
                    className="sticky left-0 z-20 flex items-start justify-end border-b border-r border-white/10 bg-slate-950/92 px-2 pt-1.5 text-[8px] font-black uppercase tracking-[0.08em] text-slate-500"
                    key={`timeline-hour-${hour}`}
                    style={{ gridColumn: 1, gridRow: hourIndex + 2 }}
                  >
                    {formatTimelineTime(hour * 60).replace(":00", "")}
                  </div>
                ))}
                {weekDays.flatMap((day, dayIndex) =>
                  weekTimelineHours.map((hour, hourIndex) => {
                    const cellAlreadyHighlighted =
                      isSameDate(day, activeSelectedDate) &&
                      hour === highlightedWeekHour;

                    return (
                      <button
                        aria-current={cellAlreadyHighlighted ? "true" : undefined}
                        data-calendar-cell-active={
                          cellAlreadyHighlighted ? "true" : undefined
                        }
                        aria-label={`Add item on ${compactDateFormatter.format(day)} at ${formatTimelineTime(hour * 60)}`}
                        className={`border-b border-r border-white/[0.07] transition hover:bg-cyan-300/[0.06] ${
                          cellAlreadyHighlighted
                            ? "relative z-[5] bg-cyan-300/12 shadow-[inset_0_0_0_2px_rgba(103,232,249,0.72),inset_0_0_18px_rgba(34,211,238,0.14)]"
                            : isSameDate(day, activeSelectedDate)
                              ? "bg-cyan-300/[0.035]"
                            : isSameDate(day, activeToday)
                              ? "bg-amber-300/[0.025]"
                              : "bg-transparent"
                        }`}
                        key={`timeline-cell-${toDateKey(day)}-${hour}`}
                        onClick={() => {
                          if (cellAlreadyHighlighted) {
                            selectDay(day);
                            return;
                          }

                          setHighlightedWeekHour(hour);
                          setSelectedDate(day);
                          setCursorDate(day);
                          setSelectedDayDropdownOpen(false);
                          setSoundSessionMenuOpen(false);
                          setEditingEntryId(null);
                          setPendingDeleteEntryId(null);
                        }}
                        style={{ gridColumn: dayIndex + 2, gridRow: hourIndex + 2 }}
                        type="button"
                      />
                    );
                  }),
                )}
                {currentTimeIsVisible &&
                currentTimeMinutes !== null &&
                currentTimeGridRow !== null ? (
                  <div
                    aria-label={`Current time ${formatTimelineTime(currentTimeMinutes)}`}
                    className="pointer-events-none relative z-20 h-0 self-start border-t-2 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]"
                    style={{
                      gridColumn: currentTimeDayIndex + 2,
                      gridRow: currentTimeGridRow,
                      marginTop: `${Math.round(((currentTimeMinutes % 60) / 60) * 52)}px`,
                    }}
                  >
                    <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.95)]" />
                    <span className="absolute right-1 top-1 rounded bg-red-950/88 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.08em] text-red-100 shadow-[0_2px_8px_rgba(0,0,0,0.38)]">
                      {formatTimelineTime(currentTimeMinutes)}
                    </span>
                  </div>
                ) : null}
                {weekDays.flatMap((day, dayIndex) => {
                  const dayKey = toDateKey(day);
                  const dayEvents = eventsByDate[dayKey] || [];

                  return dayEvents.map((event, eventIndex) => {
                    const rawMinutes = getEventTimelineMinutes(event, eventIndex);
                    const eventMinutes = Math.max(
                      weekTimelineHours[0] * 60,
                      Math.min(
                        weekTimelineHours[weekTimelineHours.length - 1] * 60 + 59,
                        rawMinutes,
                      ),
                    );
                    const eventHour = Math.floor(eventMinutes / 60);
                    const eventRow =
                      eventHour - weekTimelineHours[0] + 2;

                    return (
                      <button
                        aria-label={`${event.title}, ${formatTimelineTime(eventMinutes)} on ${compactDateFormatter.format(day)}`}
                        className={`z-10 mx-1 self-start overflow-hidden rounded-lg border px-2 py-1 text-left shadow-[0_8px_18px_rgba(0,0,0,0.24)] transition hover:-translate-y-0.5 hover:brightness-110 ${typeStyles[event.type]}`}
                        key={`timeline-event-${dayKey}-${event.title}-${eventIndex}`}
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          setHighlightedWeekHour(eventHour);
                          selectDay(day);
                        }}
                        style={{
                          gridColumn: dayIndex + 2,
                          gridRow: eventRow,
                          marginTop: `${Math.round(((eventMinutes % 60) / 60) * 18) + 2}px`,
                        }}
                        type="button"
                      >
                        <span className="block truncate text-[7px] font-black uppercase tracking-[0.1em] opacity-75">
                          {formatTimelineTime(eventMinutes)}
                        </span>
                        <span className="mt-0.5 block truncate text-[9px] font-black">
                          {event.title}
                        </span>
                      </button>
                    );
                  });
                })}
              </div>
            </div>
              <div
                aria-label="Calendar horizontal cell controls"
                className="col-start-2 row-start-2 flex items-center justify-center gap-10"
              >
                <button
                  aria-label="Highlight previous calendar day"
                  className="grid h-6 w-8 place-items-center bg-transparent p-0 text-cyan-100 transition hover:-translate-x-0.5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/60"
                  onClick={() => moveHighlightedWeekDay("left")}
                  type="button"
                >
                  <ChevronLeft aria-hidden="true" className="h-5 w-5" strokeWidth={2.8} />
                </button>
                <span aria-atomic="true" aria-live="polite" className="sr-only">
                  {compactDateFormatter.format(activeSelectedDate)}, {formatTimelineTime(highlightedWeekHour * 60)} highlighted
                </span>
                <button
                  aria-label="Highlight next calendar day"
                  className="grid h-6 w-8 place-items-center bg-transparent p-0 text-cyan-100 transition hover:translate-x-0.5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/60"
                  onClick={() => moveHighlightedWeekDay("right")}
                  type="button"
                >
                  <ChevronRight aria-hidden="true" className="h-5 w-5" strokeWidth={2.8} />
                </button>
              </div>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-x-auto rounded-[22px] border border-white/10 bg-slate-950/35 p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex h-full min-h-0 min-w-[680px] flex-col">
                <div className="grid shrink-0 grid-cols-7 gap-1.5 pb-1.5">
                  {dayLabels.map((day) => (
                    <div
                      className="px-2 text-center text-[9px] font-black uppercase tracking-[0.16em] text-slate-500"
                      key={day}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-7 gap-1.5">
                  {monthDays.map((day) => {
                    const dayKey = toDateKey(day);
                    const dayEvents = eventsByDate[dayKey] || [];
                    const todayActive = isSameDate(day, activeToday);
                    const selected = isSameDate(day, activeSelectedDate);
                    const outsideMonth = day.getMonth() !== activeCursorDate.getMonth();

                    return (
                      <button
                        aria-pressed={selected}
                        className={`min-h-0 rounded-xl border px-2 py-1.5 text-left transition duration-300 hover:border-cyan-300/35 hover:bg-cyan-300/8 ${
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
        </>
      )}

      {!collapsed && selectedDayDropdownOpen ? (
        <div className={`pointer-events-none absolute inset-0 z-[100] flex items-center justify-center bg-slate-950/12 ${activeEditingEntry ? "p-2" : "p-3 sm:p-5"}`}>
          <div
            data-dashboard-orbiter-local-scroll="true"
            data-calendar-editor={activeEditingEntry ? "true" : undefined}
            className={`pointer-events-auto flex max-h-full w-full max-w-[420px] flex-col overflow-hidden rounded-[28px] border border-cyan-100/20 bg-slate-950/95 shadow-[0_28px_90px_rgba(0,0,0,0.46),0_0_40px_rgba(34,211,238,0.14),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl ${activeEditingEntry ? "h-full min-h-0" : ""}`}
          >
            <div className="shrink-0 border-b border-white/10 px-4 py-3">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
                    {activeEditingEntry ? "Edit Event" : "Selected Day"}
                  </p>
                  <h3 className="mt-1 text-lg font-black leading-tight text-white">
                    {detailDateFormatter.format(activeSelectedDate)}
                  </h3>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    {selectedDaySubLabel}
                  </p>
                </div>
                <button
                  aria-label="Close selected day popup"
                  className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-slate-950/70 text-sm font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
                  onClick={() => {
                    setSelectedDayDropdownOpen(false);
                    setSoundSessionMenuOpen(false);
                    setEditingEntryId(null);
                    setPendingDeleteEntryId(null);
                  }}
                  type="button"
                >
                  x
                </button>
              </div>
              {selectedEvents.length ? (
                <div
                  aria-label="Events happening this day"
                  className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {selectedEvents.map((event, eventIndex) => {
                    const eventMinutes = getEventTimelineMinutes(event, eventIndex);
                    const eventHour = Math.max(
                      weekTimelineHours[0],
                      Math.min(
                        weekTimelineHours[weekTimelineHours.length - 1],
                        Math.floor(eventMinutes / 60),
                      ),
                    );
                    const activeEventHour =
                      view === "week" && eventHour === highlightedWeekHour;

                    return (
                      <button
                        aria-label={`Show ${event.title} at ${formatTimelineTime(eventMinutes)}`}
                        aria-pressed={activeEventHour}
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] transition hover:brightness-125 ${
                          activeEventHour
                            ? `${typeStyles[event.type]} ring-1 ring-white/50`
                            : typeStyles[event.type]
                        }`}
                        key={event.id || `${event.dateKey}-${event.title}-${eventIndex}-day-pill`}
                        onClick={() => {
                          setHighlightedWeekHour(eventHour);
                          setSoundSessionMenuOpen(false);
                          setEditingEntryId(null);
                          setPendingDeleteEntryId(null);
                        }}
                        type="button"
                      >
                        {formatTimelineTime(eventMinutes)} · {event.title}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className={activeEditingEntry
              ? "min-h-0 flex-1 overflow-hidden p-3"
              : "min-h-0 max-h-[230px] space-y-2.5 overflow-y-auto p-3 [scrollbar-color:rgba(34,211,238,0.34)_rgba(15,23,42,0.54)] [scrollbar-width:thin]"
            }>
              {displayedCellEvents.length ? (
                displayedCellEvents.map((event) => {
                  const userCreated = Boolean(
                    event.id && userEntries.some((entry) => entry.id === event.id),
                  );
                  const editing = userCreated && editingEntryId === event.id;
                  const confirmingDelete =
                    userCreated && pendingDeleteEntryId === event.id;
                  const editingHour24 = Number.parseInt(
                    editingEntryTime.slice(0, 2),
                    10,
                  );
                  const safeEditingHour24 = Number.isNaN(editingHour24)
                    ? 0
                    : editingHour24;
                  const editingHour12 = safeEditingHour24 % 12 || 12;
                  const editingMinute = editingEntryTime.slice(3, 5) || "00";
                  const editingPeriod = safeEditingHour24 >= 12 ? "PM" : "AM";
                  const editingMinuteOptions = timeMinuteOptions.includes(editingMinute)
                    ? timeMinuteOptions
                    : [...timeMinuteOptions, editingMinute].sort();

                  return (
                    <div
                      className={`rounded-2xl border px-3 py-3 ${typeStyles[event.type]} ${editing ? "h-full min-h-0" : ""}`}
                      key={event.id || `${event.dateKey}-${event.title}-detail`}
                    >
                      {editing ? (
                        <div className="flex h-full min-h-0 flex-col gap-2">
                          <label className="block shrink-0">
                            <span className="sr-only">Event title</span>
                            <input
                              className="w-full rounded-lg border border-current/20 bg-slate-950/55 px-2.5 py-2 text-sm font-bold text-white outline-none focus:border-cyan-200/60"
                              onChange={(event) => setEditingEntryTitle(event.target.value)}
                              value={editingEntryTitle}
                            />
                          </label>
                          <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                            <span className="block shrink-0 text-[8px] font-black uppercase tracking-[0.16em] opacity-65">
                              Time
                            </span>
                            <button
                              aria-expanded={editingTimePickerOpen}
                              aria-label="Choose event time"
                              className="flex h-11 w-full shrink-0 items-center justify-between rounded-xl border border-current/20 bg-slate-950/65 px-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-cyan-200/45 hover:bg-cyan-300/10 focus-visible:border-cyan-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/15"
                              onClick={() => setEditingTimePickerOpen((open) => !open)}
                              type="button"
                            >
                              <span className="text-sm font-black tracking-[0.04em] text-white">
                                {formatTimelineTime(
                                  safeEditingHour24 * 60 + Number(editingMinute),
                                )}
                              </span>
                              <Clock3
                                aria-hidden="true"
                                className="h-4 w-4 shrink-0 text-cyan-200"
                                strokeWidth={2.2}
                              />
                            </button>
                            {editingTimePickerOpen ? (
                              <div className="grid min-h-0 flex-1 grid-cols-3 gap-2 rounded-2xl border border-cyan-200/20 bg-slate-950/90 p-2 shadow-[0_18px_42px_rgba(2,8,23,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]">
                                <div className="flex min-h-0 flex-col">
                                  <p className="shrink-0 pb-1.5 text-center text-[7px] font-black uppercase tracking-[0.16em] text-cyan-100/55">
                                    Hour
                                  </p>
                                  <div
                                    aria-label="Event hour"
                                    className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                                    ref={editingHourListRef}
                                    role="listbox"
                                  >
                                    {timeHourOptions.map((hour) => (
                                      <button
                                        aria-selected={hour === editingHour12}
                                        className={`h-8 w-full rounded-lg text-xs font-black transition ${
                                          hour === editingHour12
                                            ? "bg-cyan-300 text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.24)]"
                                            : "text-white/65 hover:bg-white/8 hover:text-white"
                                        }`}
                                        key={hour}
                                        onClick={() => {
                                          const nextHour24 =
                                            editingPeriod === "PM"
                                              ? (hour % 12) + 12
                                              : hour % 12;
                                          setEditingEntryTime(
                                            `${String(nextHour24).padStart(2, "0")}:${editingMinute}`,
                                          );
                                        }}
                                        role="option"
                                        type="button"
                                      >
                                        {hour}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="flex shrink-0 items-center justify-center gap-2 pt-1">
                                    <button
                                      aria-label="Previous event hour"
                                      className="grid h-8 w-8 place-items-center bg-transparent text-cyan-100 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/60"
                                      onClick={() => moveEditingTime("hour", -1)}
                                      type="button"
                                    >
                                      <ChevronUp aria-hidden="true" className="h-5 w-5" strokeWidth={2.8} />
                                    </button>
                                    <button
                                      aria-label="Next event hour"
                                      className="grid h-8 w-8 place-items-center bg-transparent text-cyan-100 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/60"
                                      onClick={() => moveEditingTime("hour", 1)}
                                      type="button"
                                    >
                                      <ChevronDown aria-hidden="true" className="h-5 w-5" strokeWidth={2.8} />
                                    </button>
                                  </div>
                                </div>
                                <div className="flex min-h-0 flex-col">
                                  <p className="shrink-0 pb-1.5 text-center text-[7px] font-black uppercase tracking-[0.16em] text-cyan-100/55">
                                    Minute
                                  </p>
                                  <div
                                    aria-label="Event minute"
                                    className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                                    ref={editingMinuteListRef}
                                    role="listbox"
                                  >
                                    {editingMinuteOptions.map((minute) => (
                                      <button
                                        aria-selected={minute === editingMinute}
                                        className={`h-8 w-full rounded-lg text-xs font-black transition ${
                                          minute === editingMinute
                                            ? "bg-cyan-300 text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.24)]"
                                            : "text-white/65 hover:bg-white/8 hover:text-white"
                                        }`}
                                        key={minute}
                                        onClick={() =>
                                          setEditingEntryTime(
                                            `${String(safeEditingHour24).padStart(2, "0")}:${minute}`,
                                          )
                                        }
                                        role="option"
                                        type="button"
                                      >
                                        {minute}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="flex shrink-0 items-center justify-center gap-2 pt-1">
                                    <button
                                      aria-label="Previous event minute"
                                      className="grid h-8 w-8 place-items-center bg-transparent text-cyan-100 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/60"
                                      onClick={() => moveEditingTime("minute", -1)}
                                      type="button"
                                    >
                                      <ChevronUp aria-hidden="true" className="h-5 w-5" strokeWidth={2.8} />
                                    </button>
                                    <button
                                      aria-label="Next event minute"
                                      className="grid h-8 w-8 place-items-center bg-transparent text-cyan-100 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/60"
                                      onClick={() => moveEditingTime("minute", 1)}
                                      type="button"
                                    >
                                      <ChevronDown aria-hidden="true" className="h-5 w-5" strokeWidth={2.8} />
                                    </button>
                                  </div>
                                </div>
                                <div>
                                  <p className="pb-1.5 text-center text-[7px] font-black uppercase tracking-[0.16em] text-cyan-100/55">
                                    Period
                                  </p>
                                  <div aria-label="Event period" className="space-y-1" role="listbox">
                                    {(["AM", "PM"] as const).map((period) => (
                                      <button
                                        aria-selected={period === editingPeriod}
                                        className={`h-8 w-full rounded-lg text-xs font-black transition ${
                                          period === editingPeriod
                                            ? "bg-cyan-300 text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.24)]"
                                            : "text-white/65 hover:bg-white/8 hover:text-white"
                                        }`}
                                        key={period}
                                        onClick={() => {
                                          const nextHour24 =
                                            period === "PM"
                                              ? (editingHour12 % 12) + 12
                                              : editingHour12 % 12;
                                          setEditingEntryTime(
                                            `${String(nextHour24).padStart(2, "0")}:${editingMinute}`,
                                          );
                                        }}
                                        role="option"
                                        type="button"
                                      >
                                        {period}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center justify-end gap-2">
                            <button
                              className="rounded-lg border border-emerald-200/30 bg-emerald-300/15 px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-100"
                              disabled={!editingEntryTitle.trim()}
                              onClick={saveEditedEntry}
                              type="button"
                            >
                              Save
                            </button>
                            <button
                              className="px-1 py-2 text-[9px] font-black uppercase tracking-[0.12em] opacity-70 hover:opacity-100"
                              onClick={() => {
                                setEditingEntryId(null);
                                setEditingTimePickerOpen(false);
                              }}
                              type="button"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black leading-tight">
                                {event.title}
                              </p>
                              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">
                                {typeLabels[event.type]}
                                {event.time
                                  ? ` · ${formatTimelineTime(getEventTimelineMinutes(event))}`
                                  : ""}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full border border-current/20 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] opacity-80">
                              {event.status || "Set"}
                            </span>
                          </div>
                          {userCreated ? (
                            <div className="mt-2 flex items-center justify-end gap-3 border-t border-current/10 pt-2">
                              {confirmingDelete ? (
                                <>
                                  <span className="mr-auto text-[9px] font-black uppercase tracking-[0.1em] opacity-75">
                                    Delete this event?
                                  </span>
                                  <button
                                    className="text-[9px] font-black uppercase tracking-[0.12em] opacity-70 hover:opacity-100"
                                    onClick={() => setPendingDeleteEntryId(null)}
                                    type="button"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    className="text-[9px] font-black uppercase tracking-[0.12em] text-rose-200 hover:text-white"
                                    onClick={() => event.id && deleteUserEntry(event.id)}
                                    type="button"
                                  >
                                    Confirm delete
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className="text-[9px] font-black uppercase tracking-[0.12em] opacity-70 hover:opacity-100"
                                    onClick={() => beginEditingEntry(event)}
                                    type="button"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="text-[9px] font-black uppercase tracking-[0.12em] text-rose-200/80 hover:text-rose-100"
                                    onClick={() => {
                                      setPendingDeleteEntryId(event.id || null);
                                      setEditingEntryId(null);
                                    }}
                                    type="button"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm font-semibold leading-6 text-slate-400">
                  {view === "week"
                    ? `Nothing is planned at ${formatTimelineTime(highlightedWeekHour * 60)}.`
                    : "Nothing is planned on this day."}
                </div>
              )}
            </div>

            {!activeEditingEntry ? (
              <div className="shrink-0 border-t border-white/10 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {soundSessionMenuOpen ? "Sound session type" : "Add to this day"}
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    {soundSessionMenuOpen ? (
                      <button
                        className="mr-2 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-200 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/70"
                        onClick={() => setSoundSessionMenuOpen(false)}
                        type="button"
                      >
                        Back
                      </button>
                    ) : null}
                    <button
                      aria-label="Scroll add options left"
                      className="grid h-7 w-7 place-items-center bg-transparent text-cyan-100 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/70"
                      onClick={() => scrollAddOptions(-1)}
                      type="button"
                    >
                      <ChevronLeft aria-hidden="true" className="h-4 w-4" strokeWidth={2.8} />
                    </button>
                    <button
                      aria-label="Scroll add options right"
                      className="grid h-7 w-7 place-items-center bg-transparent text-cyan-100 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/70"
                      onClick={() => scrollAddOptions(1)}
                      type="button"
                    >
                      <ChevronRight aria-hidden="true" className="h-4 w-4" strokeWidth={2.8} />
                    </button>
                  </div>
                </div>
                <div
                  aria-label={soundSessionMenuOpen ? "Sound session options" : "Add to this day options"}
                  className="flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain px-1 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  data-dashboard-orbiter-local-scroll="true"
                  key={soundSessionMenuOpen ? "sound-session-options" : "day-options"}
                  ref={addOptionsRailRef}
                  role="group"
                >
                  {(soundSessionMenuOpen
                    ? soundSessionAddOptions
                    : calendarAddOptions
                  ).map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        aria-label={`Add ${option.label} on ${detailDateFormatter.format(activeSelectedDate)}${
                          view === "week"
                            ? ` at ${formatTimelineTime(highlightedWeekHour * 60)}`
                            : ""
                        }`}
                        className={`${calendarAddCardClassName} ${typeStyles[option.type]}`}
                        key={option.key}
                        onClick={() => addUserEntry(option)}
                        type="button"
                      >
                        <Icon
                          aria-hidden="true"
                          className="h-8 w-8 shrink-0 drop-shadow-[0_3px_0_rgba(0,0,0,0.45)] transition group-hover:scale-110 motion-reduce:transform-none"
                          strokeWidth={1.8}
                        />
                        <span className="text-[9px] font-black uppercase leading-[1.35] tracking-[0.08em]">
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                  {!soundSessionMenuOpen ? (
                    <button
                      aria-expanded={false}
                      aria-label="Choose Sound Session type"
                      className={`${calendarAddCardClassName} border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-100`}
                      onClick={() => setSoundSessionMenuOpen(true)}
                      type="button"
                    >
                      <Image
                        alt=""
                        className="h-8 w-8 object-contain drop-shadow-[0_3px_6px_rgba(232,121,249,0.35)] transition group-hover:scale-110 motion-reduce:transform-none"
                        height={32}
                        src="/sound-crest-avatar.png"
                        width={32}
                      />
                      <span className="text-[9px] font-black uppercase leading-[1.35] tracking-[0.08em]">
                        Sound Session
                      </span>
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

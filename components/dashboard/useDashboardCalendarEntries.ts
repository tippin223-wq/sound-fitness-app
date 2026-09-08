"use client";

import { useSyncExternalStore } from "react";
import {
  DASHBOARD_CALENDAR_ENTRIES_KEY,
  calendarEntryIdentity,
  type DashboardCalendarItem,
} from "@/lib/dashboard-calendar";

type CalendarEntriesUpdate =
  | DashboardCalendarItem[]
  | ((entries: DashboardCalendarItem[]) => DashboardCalendarItem[]);

const emptyEntries: DashboardCalendarItem[] = [];
const entryTypes = new Set<DashboardCalendarItem["type"]>([
  "cardio", "check-in", "completed", "nutrition", "performance", "recovery", "training", "workout",
]);
const listeners = new Set<() => void>();
let snapshot = emptyEntries;
let cachedStorageValue: string | null | undefined;
let hasUnpersistedChanges = false;

function withStableIds(entries: DashboardCalendarItem[]) {
  const occurrences = new Map<string, number>();
  return entries.map((entry) => {
    const identity = calendarEntryIdentity(entry);
    const occurrence = occurrences.get(identity) || 0;
    occurrences.set(identity, occurrence + 1);
    return entry.id ? entry : { ...entry, id: `${identity}-${occurrence}` };
  });
}

function parseEntries(raw: string | null) {
  if (!raw) return emptyEntries;
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return emptyEntries;
  return withStableIds(parsed.filter(
    (entry): entry is DashboardCalendarItem =>
      Boolean(entry) && typeof entry === "object" &&
      typeof entry.title === "string" && typeof entry.date === "string" &&
      entryTypes.has(entry.type),
  ));
}

function getSnapshot() {
  if (typeof window === "undefined") return emptyEntries;
  if (hasUnpersistedChanges) return snapshot;
  try {
    const raw = window.localStorage.getItem(DASHBOARD_CALENDAR_ENTRIES_KEY);
    if (raw !== cachedStorageValue) {
      const entries = parseEntries(raw);
      cachedStorageValue = raw;
      snapshot = entries;
    }
  } catch {
    // An unavailable store or malformed external value must not erase live edits.
  }
  return snapshot;
}

function getServerSnapshot() {
  return emptyEntries;
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function handleStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== DASHBOARD_CALENDAR_ENTRIES_KEY) return;
  // A real cross-tab change is newer than our last write attempt.
  hasUnpersistedChanges = false;
  getSnapshot();
  notifyListeners();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", handleStorage);
  };
}

export function setDashboardCalendarEntries(update: CalendarEntriesUpdate) {
  const previous = getSnapshot();
  const next = typeof update === "function" ? update(previous) : update;
  snapshot = withStableIds(next);
  try {
    const serialized = JSON.stringify(snapshot);
    window.localStorage.setItem(DASHBOARD_CALENDAR_ENTRIES_KEY, serialized);
    cachedStorageValue = serialized;
    hasUnpersistedChanges = false;
  } catch {
    // Even if reads also failed initially, recovered storage must not replace
    // this session's newer edits with its old value on the next snapshot read.
    hasUnpersistedChanges = true;
  }
  notifyListeners();
}

/** One persisted source for the calendar editor and all calendar-derived views. */
export function useDashboardCalendarEntries() {
  const entries = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return [entries, setDashboardCalendarEntries] as const;
}

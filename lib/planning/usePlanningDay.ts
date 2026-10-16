"use client";
import { useSyncExternalStore } from "react";
import { localDate } from "./dates";

const currentDay = () => localDate();
const serverDay = () => "";
function subscribeDay(callback: () => void) {
  const timer = setInterval(callback, 30000);
  window.addEventListener("focus", callback);
  document.addEventListener("visibilitychange", callback);
  return () => { clearInterval(timer); window.removeEventListener("focus", callback); document.removeEventListener("visibilitychange", callback); };
}
/** Stable date snapshot refreshes current-day views after midnight or returning to the tab. */
export function usePlanningDay() { return useSyncExternalStore(subscribeDay, currentDay, serverDay); }

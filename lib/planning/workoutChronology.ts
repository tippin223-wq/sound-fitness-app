import { activityTimestamp, localDate } from "./dates";

/** Validate a new completion or finalization; immutable upload retries retain original timestamps. */
export function assertWorkoutChronology(entries: readonly { date: unknown }[], completedAt: string, options: { now?: number; startedAt?: unknown } = {}) {
  const now = options.now ?? Date.now();
  const ended = activityTimestamp(completedAt);
  if (!Number.isFinite(ended)) throw new Error("Workout completion time needs review. Original records and your draft are preserved.");
  if (ended > now) throw new Error("Workout completion cannot be in the future. Review the recorded time; your saved data and draft are preserved.");
  if (options.startedAt != null && options.startedAt !== "") {
    const started = activityTimestamp(options.startedAt);
    if (typeof options.startedAt !== "string" || !Number.isFinite(started) || started > ended) throw new Error("Saved workout start date needs review; it must be on or before completion.");
  }
  const dayOnly = /^\d{4}-\d{2}-\d{2}$/.test(completedAt.trim());
  for (const entry of entries) {
    const timestamp = activityTimestamp(entry.date);
    if (!Number.isFinite(timestamp)) throw new Error("Exercise activity time needs review. Original records and your draft are preserved.");
    if (timestamp > now) throw new Error("Exercise activity cannot be in the future. Review the recorded time; your saved data and draft are preserved.");
    // A date-only record identifies a local day, not an exact midnight finish.
    if (dayOnly ? localDate(new Date(timestamp)) > completedAt.trim() : timestamp > ended) throw new Error("Exercise activity is after the workout completion. Review the recorded times; your saved data and draft are preserved.");
  }
}

/** Read-only review feedback; malformed legacy values never become replacement timestamps. */
export function workoutChronologyIssue(entries: readonly { date: unknown }[], completedAt: string, options: { now?: number; startedAt?: unknown } = {}) {
  if (!Array.isArray(entries) || entries.some(entry => !entry || typeof entry !== "object" || Array.isArray(entry))) return "Recorded exercise times need review. Original records are preserved.";
  try { assertWorkoutChronology(entries, completedAt, options); return null; }
  catch (cause) { return cause instanceof Error ? cause.message : "Recorded workout times need review. Original records are preserved."; }
}

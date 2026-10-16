import { goalNumber } from "./goalNumbers";
import { activityTimestamp } from "./dates";

export function libraryRecordedCount(value: unknown) {
  const count = goalNumber(value);
  return count !== null && Number.isSafeInteger(count) && count >= 0 ? count : null;
}
export function libraryCompletedReps(entry: { sets?: unknown; reps?: unknown }) {
  const sets = libraryRecordedCount(entry.sets); const reps = libraryRecordedCount(entry.reps);
  const total = sets !== null && reps !== null ? sets * reps : null;
  return total !== null && Number.isSafeInteger(total) ? total : 0;
}
/** Read-only coverage: missing/invalid fields are never parsed as numeric prefixes. */
export function libraryCountReview(entries: readonly unknown[], now = new Date()) {
  return entries.filter(value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return true;
    const entry = value as { date?: unknown; sets?: unknown; reps?: unknown };
    const time = activityTimestamp(entry.date);
    const sets = libraryRecordedCount(entry.sets); const reps = libraryRecordedCount(entry.reps);
    return !Number.isFinite(time) || time > now.getTime() || sets === null || reps === null || !Number.isSafeInteger(sets * reps);
  }).length;
}

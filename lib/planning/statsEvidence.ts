import { activityTimestamp, localDate } from "./dates";
import { goalNumber } from "./goalNumbers";
import { unsupportedWorkoutLoadUnitEvidence, workoutLoadInPounds } from "./loadUnitEvidence";

/** Count recorded completion identities, never infer sessions from exercise activity dates. */
export function statsCompletedSessions<T extends { id: string; timestamp: number }>(logs: readonly T[], now = new Date()) {
  const ids = new Map<string, number>();
  for (const log of logs) if (typeof log.id === "string" && log.id.trim()) ids.set(log.id, (ids.get(log.id) || 0) + 1);
  return logs.filter(log => typeof log.id === "string" && Boolean(log.id.trim()) && ids.get(log.id) === 1 && statsHistoryIncludes(log.timestamp, "Lifetime", now));
}

/** Compare the latest two recorded dates for the same exercise; a first log is a baseline. */
export function statsVolumeIncreases<T extends { exerciseId: string; exerciseName: string; timestamp: number; volume: number }>(entries: readonly T[], now = new Date()) {
  const groups = new Map<string, { exerciseName: string; dates: Map<number, { volume: number; complete: boolean }> }>();
  for (const entry of entries) {
    if (!entry.exerciseId.trim() || !entry.exerciseName.trim() || !statsHistoryIncludes(entry.timestamp, "Lifetime", now)) continue;
    const key = JSON.stringify([entry.exerciseId.trim().toLowerCase(), entry.exerciseName.trim().toLowerCase()]);
    const group = groups.get(key) || { exerciseName: entry.exerciseName, dates: new Map() };
    const date = group.dates.get(entry.timestamp) || { volume: 0, complete: true };
    const valid = typeof entry.volume === "number" && Number.isFinite(entry.volume) && entry.volume > 0;
    date.complete = date.complete && valid;
    if (valid) date.volume += entry.volume;
    group.dates.set(entry.timestamp, date); groups.set(key, group);
  }
  return [...groups.values()].flatMap(group => {
    const [latest, previous] = [...group.dates.entries()].sort((a, b) => b[0] - a[0]);
    if (!latest || !previous || !latest[1].complete || !previous[1].complete || !Number.isFinite(latest[1].volume) || !Number.isFinite(previous[1].volume)) return [];
    const change = latest[1].volume - previous[1].volume;
    return change > 0 ? [{ exerciseName: group.exerciseName, change, latestAt: latest[0], previousAt: previous[0], latestVolume: latest[1].volume, previousVolume: previous[1].volume }] : [];
  }).sort((a, b) => b.change - a.change);
}

/** Saved classifications are evidence; exercise-name substrings are not. */
export function statsExerciseClassification(record: Record<string, unknown>) {
  const reported = (keys: string[]) => {
    const values: string[] = [];
    for (const key of keys) {
      const value = record[key];
      if (value == null || typeof value === "string" && !value.trim()) continue;
      if (typeof value !== "string") return "Unclassified";
      values.push(value.trim().replace(/\s+/g, " "));
    }
    if (!values.length || values.some(value => value.toLowerCase() !== values[0].toLowerCase())) return "Unclassified";
    return values[0];
  };
  const body = reported(["bodyPart", "body", "bodyRegion", "muscle", "muscles", "primaryMuscle"]);
  const known = ["Chest", "Back", "Shoulders", "Arms", "Core", "Glutes", "Quads", "Hamstrings", "Calves", "Neck / Traps", "Legs", "Unclassified"];
  return {
    bodyPart: known.find(label => label.toLowerCase() === body.toLowerCase()) ?? body,
    pattern: reported(["pattern", "movementPattern", "coreMovementPattern", "coreMovementPatternName"]),
  };
}

function statsMetric(record: Record<string, unknown>, keys: readonly string[], whole: boolean, fallback = 0): number | null {
  const values: number[] = [];
  for (const key of keys) {
    if (!Object.hasOwn(record, key) || record[key] == null || typeof record[key] === "string" && !record[key].trim()) continue;
    const value = goalNumber(record[key]);
    if (value === null || value < 0 || whole && !Number.isSafeInteger(value)) return null;
    values.push(value);
  }
  if (values.some(value => value !== values[0])) return null;
  return values[0] ?? fallback;
}

/** Missing metrics contribute no counts; malformed or conflicting reports exclude the row. */
export function statsExerciseMetrics(record: Record<string, unknown>) {
  if (unsupportedWorkoutLoadUnitEvidence(record).length) return null;
  const sets = statsMetric(record, ["sets", "setCount", "completedSets"], true);
  const reps = statsMetric(record, ["reps", "repCount", "completedReps"], true);
  const weight = statsMetric(record, ["weight", "load", "loadValue"], false);
  if (sets === null || reps === null || weight === null || !Number.isFinite(sets * reps * weight)) return null;
  return { sets, reps, weight };
}

export function statsWorkoutTotals(record: Record<string, unknown>, entries: readonly { sets: number; reps: number; volume: number }[]) {
  const totalSets = statsMetric(record, ["totalSets", "sets"], true, entries.reduce((sum, entry) => sum + entry.sets, 0));
  const totalReps = statsMetric(record, ["totalReps", "reps"], true, entries.reduce((sum, entry) => sum + entry.reps * entry.sets, 0));
  const totalVolume = statsMetric(record, ["totalVolume", "volume", "weightVolume"], false, entries.reduce((sum, entry) => sum + entry.volume, 0));
  if (totalSets === null || totalReps === null || totalVolume === null || !Number.isSafeInteger(totalSets) || !Number.isSafeInteger(totalReps) || !Number.isFinite(totalVolume)) return null;
  return { totalSets, totalReps, totalVolume };
}

/** Describes recorded distribution; these percentages are never training targets. */
export function statsSetDistribution<T extends { weeklySets: number }>(groups: readonly T[]) {
  const count = (value: number) => typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
  const total = groups.reduce((sum, group) => sum + count(group.weeklySets), 0);
  return groups.map(group => ({ ...group, sharePercent: total > 0 ? count(group.weeklySets) / total * 100 : 0 }));
}

export function statsTargetStatus(percent: number) {
  if (!Number.isFinite(percent) || percent <= 0) return "No sets";
  if (percent < 100) return "Below target";
  return percent === 100 ? "Target met" : "Above target";
}

/** Keep exercises separate and compare only explicit-unit loads; never infer legacy units. */
export function statsExerciseRecords<T extends { exerciseId: string; exerciseName: string; weight: number; reps: number; timestamp: number }>(entries: readonly T[], now = new Date()) {
  const groups = new Map<string, T[]>();
  for (const entry of entries) {
    if (!entry.exerciseId.trim() || !entry.exerciseName.trim() || !statsHistoryIncludes(entry.timestamp, "Lifetime", now)) continue;
    const key = JSON.stringify([entry.exerciseId.trim().toLowerCase(), entry.exerciseName.trim().toLowerCase()]);
    const group = groups.get(key) || []; group.push(entry); groups.set(key, group);
  }
  return [...groups.values()].map(group => ({
    exerciseId: group[0].exerciseId,
    exerciseName: group[0].exerciseName,
    load: bestPositiveStatsMetric(group, entry => workoutLoadInPounds(entry as unknown as Record<string, unknown>) ?? 0),
    reps: bestPositiveStatsMetric(group, entry => entry.reps),
  })).filter(record => record.load !== null || record.reps !== null);
}

export function statsWeekBounds(now = new Date()) {
  const start = new Date(now);
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999);
  return { start, end };
}
export function statsHistoryIncludes(timestamp: number, filter: "This week" | "Last 30 days" | "Lifetime", now = new Date()) {
  if (typeof timestamp !== "number" || !Number.isFinite(new Date(timestamp).getTime()) || timestamp > now.getTime()) return false;
  if (filter === "Lifetime") return true;
  const start = filter === "This week" ? statsWeekBounds(now).start : new Date(now);
  if (filter === "Last 30 days") { start.setDate(start.getDate() - 29); start.setHours(0, 0, 0, 0); }
  return timestamp >= start.getTime();
}
export function statsCurrentStreak(timestamps: readonly number[], now = new Date()) {
  const days = new Set(timestamps.filter(timestamp => typeof timestamp === "number" && Number.isFinite(new Date(timestamp).getTime()) && timestamp <= now.getTime()).map(timestamp => localDate(new Date(timestamp))));
  const cursor = new Date(now);
  if (!days.has(localDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDate(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}

/** Missing, impossible and future dates never become activity performed today. */
export function statsRecordedTimestamp(value: unknown, now = new Date()) {
  const timestamp = activityTimestamp(value);
  return Number.isFinite(timestamp) && timestamp <= now.getTime() ? timestamp : NaN;
}

/** Unknown/zero metrics cannot establish a best performance. Preserve first ties. */
export function bestPositiveStatsMetric<T>(items: readonly T[], score: (item: T) => number): T | null {
  let best: T | null = null;
  let bestValue = 0;
  for (const item of items) {
    const value = score(item);
    if (typeof value === "number" && Number.isFinite(value) && value > bestValue) { best = item; bestValue = value; }
  }
  return best;
}
export function mostTrainedStatsRegion(items: readonly { label: string; lifetimeSets: number }[]) {
  return bestPositiveStatsMetric(items.filter(item => item.label.toLowerCase() !== "unclassified"), item => item.lifetimeSets)?.label || "Not enough data";
}

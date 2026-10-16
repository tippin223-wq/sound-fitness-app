import type { PlanningLog } from "./logs";
import { activityTimestamp, localDate, validDateOnly } from "./dates";
import { goalNumber } from "./goalNumbers";
import { unsupportedWorkoutLoadUnitEvidence, recordedWorkoutLoadUnit, WORKOUT_LOAD_UNIT_REVIEW } from "./loadUnitEvidence";

/** Match completion persistence: only decimal positive whole counts within the database integer range. */
export function workoutSetCount(value: unknown) {
  const count = goalNumber(value);
  return count !== null && Number.isInteger(count) && count > 0 && count <= 2147483647 ? count : 0;
}

const unreported = (value: unknown) => value == null || typeof value === "string" && !value.trim();
/** Read malformed legacy exercise containers without replacing their original value. */
export const workoutEntries = (log: Pick<PlanningLog, "entries">) => Array.isArray(log.entries) ? log.entries : [];
export const workoutEntriesIssue = (log: Pick<PlanningLog, "entries">) => Array.isArray(log.entries) ? null : "Saved exercise list is malformed. Review or export the original JSON; it contributes no sets.";
export function workoutEntryIssues(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [{ field: "entry", message: "Saved exercise entry is malformed; review the original JSON. It contributes no sets." }];
  const entry = value as Record<string, unknown>;
  const unitIssues = unsupportedWorkoutLoadUnitEvidence(entry).map(evidence => ({ field: evidence.field, message: WORKOUT_LOAD_UNIT_REVIEW }));
  return [...unitIssues, ...(["sets", "reps", "weight"] as const).flatMap(field => {
    const value = entry[field];
    if (unreported(value)) return [];
    const number = goalNumber(value);
    const valid = field === "weight" ? number !== null && number >= 0 : workoutSetCount(value) > 0;
    return valid ? [] : [{ field, message: field === "sets" ? "Saved sets are invalid and excluded from set totals." : field === "reps" ? "Saved reps are invalid; review the original value." : "Saved load is invalid; review the original value." }];
  })];
}

/** Render legacy values as bounded text rather than passing objects into React. */
export function workoutRecordedValue(value: unknown) {
  if (unreported(value)) return "Not recorded";
  const text = typeof value === "string" ? value : JSON.stringify(value) ?? String(value);
  return text.length > 500 ? `${text.slice(0, 500)}… (shortened; export contains the full value)` : text;
}

export function workoutRecordedLoad(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Not recorded";
  const entry = value as Record<string, unknown>;
  const load = workoutRecordedValue(entry.weight);
  if (unreported(entry.weight)) return load;
  try { return `${load} ${recordedWorkoutLoadUnit(entry) || "(unit not recorded)"}`; }
  catch { return `${load} (unit needs review)`; }
}

/** Use a recorded session start only; never infer one from expected duration. */
export function workoutStartedAt(completedAt: string, ...candidates: (string | null | undefined)[]) {
  const ended = activityTimestamp(completedAt);
  return candidates.find(value => typeof value === "string" && value.includes("T") && Number.isFinite(activityTimestamp(value)) && activityTimestamp(value) <= ended) ?? null;
}

export function workoutHistory(logs: PlanningLog[], now = new Date()) {
  const ids = new Set<string>(); const assignments = new Set<string>();
  return logs.filter(log => {
    const timestamp = activityTimestamp(log.completedAt);
    return Number.isFinite(timestamp) && timestamp <= now.getTime();
  }).sort((a, b) => activityTimestamp(b.completedAt) - activityTimestamp(a.completedAt)).filter(log => {
    if (ids.has(log.id) || log.assignmentId && assignments.has(log.assignmentId)) return false;
    ids.add(log.id); if (log.assignmentId) assignments.add(log.assignmentId); return true;
  }).map(log => {
    const started = typeof log.startedAt === "string" && log.startedAt.includes("T") ? activityTimestamp(log.startedAt) : NaN;
    const ended = activityTimestamp(log.completedAt);
    const durationMinutes = log.completedAt.includes("T") && Number.isFinite(started) && ended >= started ? Math.round((ended - started) / 60000) : null;
    const loggedSets = workoutEntries(log).reduce((total, entry) => total + workoutSetCount(entry?.sets), 0);
    return { ...log, date: localDate(new Date(ended)), durationMinutes, loggedSets };
  });
}
export function filterWorkoutHistory(history: ReturnType<typeof workoutHistory>, search: string, from: string, to: string) {
  if (from && !validDateOnly(from) || to && !validDateOnly(to) || from && to && from > to) throw new Error("Choose a valid date range with the start on or before the end.");
  const query = search.trim().toLowerCase();
  return history.filter(log => (!from || log.date >= from) && (!to || log.date <= to) && (!query || [log.title, ...(Array.isArray(log.entries) ? log.entries.map(entry => entry?.exerciseName) : [log.entries])].map(workoutRecordedValue).join(" ").toLowerCase().includes(query)));
}
export function exportWorkoutHistory(history: ReturnType<typeof workoutHistory>) {
  return JSON.stringify({ schemaVersion: 1, source: "Sound Fitness saved workout completions", workouts: history.map(({ date, durationMinutes, loggedSets, ...log }) => ({ ...log, localDate: date, elapsedMinutes: durationMinutes, loggedSets })) }, null, 2);
}
/** Report actual exercise sets only; no muscle classification or recovery inference. */
export function workoutExerciseSetSummary(logs: PlanningLog[], from: string, to: string, now = new Date()) {
  const exercises = new Map<string, { id: string; name: string; sets: number; lastCompletedAt: string }>();
  for (const log of filterWorkoutHistory(workoutHistory(logs, now), "", from, to)) {
    workoutEntries(log).forEach((entry, index) => {
      const sets = workoutSetCount(entry?.sets);
      if (!sets) return;
      const name = typeof entry.exerciseName === "string" ? entry.exerciseName.trim() : "";
      const exerciseId = typeof entry.exerciseId === "string" ? entry.exerciseId.trim() : "";
      const id = exerciseId ? `id:${exerciseId}` : name ? `name:${name}` : `unknown:${log.id}:${index}`;
      const existing = exercises.get(id);
      if (existing) existing.sets += sets;
      else exercises.set(id, { id, name: name || "Unnamed exercise", sets, lastCompletedAt: log.completedAt });
    });
  }
  return [...exercises.values()].sort((a, b) => b.sets - a.sets || a.name.localeCompare(b.name));
}

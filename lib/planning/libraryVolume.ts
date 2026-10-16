import type { LocalExerciseStatEntry } from "@/types";
import { activityTimestamp } from "./dates";
import { libraryRecordedCount } from "./libraryCounts";
import { libraryLoadPounds } from "./libraryLoadUnits";
import { statsHistoryIncludes } from "./statsEvidence";
import { unitWorkloadSummary } from "./unitWorkload";

function volumeEntry(entry: LocalExerciseStatEntry) {
  return { timestamp: activityTimestamp(entry?.date), sets: libraryRecordedCount(entry?.sets) ?? NaN, reps: libraryRecordedCount(entry?.reps) ?? NaN, recordedLoadInPounds: entry && typeof entry === "object" && !Array.isArray(entry) ? libraryLoadPounds(entry) : null };
}
export function libraryVolumeReports(entries: readonly LocalExerciseStatEntry[], now = new Date()) {
  const values = entries.map(volumeEntry);
  return { weekly: unitWorkloadSummary(values, "This week", now), lifetime: unitWorkloadSummary(values, "Lifetime", now) };
}
export function libraryEntryVolume(entry: LocalExerciseStatEntry, now = new Date()): number | null {
  return unitWorkloadSummary([volumeEntry(entry)], "Lifetime", now).volumePounds;
}

const identity = (entry: LocalExerciseStatEntry) => JSON.stringify([entry.exerciseId, entry.exerciseName, entry.semanticVariationId || "", entry.semanticVariationName || "", entry.generatedTitle || ""]);
/** An initial log is a baseline; unknown comparable history cannot establish a record. */
export function libraryVolumeAchievement(entry: LocalExerciseStatEntry, previous: readonly LocalExerciseStatEntry[], now = new Date()) {
  const current = libraryEntryVolume(entry, now); const time = activityTimestamp(entry.date);
  if (current === null || current <= 0 || !statsHistoryIncludes(time, "This week", now) || typeof entry.exerciseId !== "string" || !entry.exerciseId.trim() || typeof entry.exerciseName !== "string" || !entry.exerciseName.trim()) return "";
  const comparable = previous.filter(value => value && typeof value === "object" && identity(value) === identity(entry) && statsHistoryIncludes(activityTimestamp(value.date), "This week", now) && activityTimestamp(value.date) < time);
  if (!comparable.length) return "";
  const volumes = comparable.map(value => libraryEntryVolume(value, now));
  if (volumes.some(value => value === null)) return "";
  return volumes.every(value => current > value!) ? "Recorded-unit volume exceeds earlier entries this week" : "";
}

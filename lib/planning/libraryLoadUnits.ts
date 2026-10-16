import type { LocalExerciseStatEntry } from "@/types";
import { goalNumber } from "./goalNumbers";
import { unsupportedWorkoutLoadUnitEvidence, KILOGRAMS_PER_POUND, workoutLoadInPounds, formatRecordedWorkoutLoad } from "./loadUnitEvidence";
import { workoutRecordedLoad } from "./history";

export const libraryLoadPounds = (entry: LocalExerciseStatEntry) => workoutLoadInPounds(entry as unknown as Record<string, unknown>);

/** Presentation preference cannot supply an absent historical source unit. */
export function libraryLoadLabel(entry: LocalExerciseStatEntry, unit: "lbs" | "kg") {
  return libraryLoadPounds(entry) === null ? workoutRecordedLoad(entry) : formatRecordedWorkoutLoad(entry as unknown as Record<string, unknown>, unit === "lbs" ? "lb" : "kg");
}

export function libraryBestLoadEntry(entries: readonly LocalExerciseStatEntry[], now = new Date()) {
  let best: LocalExerciseStatEntry | null = null; let bestLoad = 0;
  for (const entry of entries) {
    const time = new Date(entry.date).getTime(); const load = libraryLoadPounds(entry);
    if (Number.isFinite(time) && time <= now.getTime() && load !== null && load > bestLoad) { best = entry; bestLoad = load; }
  }
  return best;
}

export function libraryEstimatedOneRepMax(entry: LocalExerciseStatEntry, now = new Date()) {
  const load = libraryLoadPounds(entry); const reps = goalNumber(entry.reps);
  const time = new Date(entry.date).getTime();
  if (!Number.isFinite(time) || time > now.getTime() || load === null || load <= 0 || reps === null || !Number.isSafeInteger(reps) || reps <= 0) return 0;
  const estimate = load * (1 + reps / 30);
  return Number.isFinite(estimate) ? estimate : 0;
}

/** The existing library presents its analytics in pounds. New saves mark that basis explicitly. */
export function libraryRecordedLoad(value: unknown, displayedUnit: unknown) {
  const weight = goalNumber(value);
  if (weight === null || weight < 0 || displayedUnit !== "lbs" && displayedUnit !== "kg") return null;
  const pounds = displayedUnit === "kg" ? weight / KILOGRAMS_PER_POUND : weight;
  return Number.isFinite(pounds) ? { weight: String(pounds), weightUnit: "lb" as const } : null;
}

/** Derived display copies only: do not rewrite stored kg or infer a unit for legacy rows. */
export function libraryPoundDisplayEntries(entries: readonly LocalExerciseStatEntry[]) {
  return entries.map(entry => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
    if (entry.weightUnit !== "kg" || unsupportedWorkoutLoadUnitEvidence(entry as unknown as Record<string, unknown>).length) return entry;
    const load = libraryRecordedLoad(entry.weight, "kg");
    return load ? { ...entry, ...load } : entry;
  });
}

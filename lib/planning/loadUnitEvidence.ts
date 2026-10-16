import { goalNumber } from "./goalNumbers";

export const KILOGRAMS_PER_POUND = 0.45359237;

/** Parsed measurements must remain representable when counts and units are combined. */
export function workoutNumericReportingIssue(weight: number | null, reps: number | null, sets: number | null, unit: "lb" | "kg" | null): string | null {
  const repetitions = reps !== null && sets !== null ? reps * sets : null;
  if (repetitions !== null && !Number.isSafeInteger(repetitions)) return "The recorded counts are too large to report accurately.";
  if (weight !== null) {
    const comparableLoad = unit === "kg" ? weight / KILOGRAMS_PER_POUND : weight;
    if (!Number.isFinite(comparableLoad)) return "The recorded load is too large for unit-aware reporting.";
    if (repetitions !== null && (!Number.isFinite(repetitions * weight) || !Number.isFinite(repetitions * comparableLoad))) return "The recorded workload is too large to report accurately.";
  }
  return null;
}

export function workoutNumericTotalsIssue(entries: readonly { weight: number | null; reps: number | null; sets: number | null; unit: "lb" | "kg" | null }[]): string | null {
  let sets = 0, repetitions = 0, rawVolume = 0, comparableVolume = 0;
  for (const entry of entries) {
    const issue = workoutNumericReportingIssue(entry.weight, entry.reps, entry.sets, entry.unit);
    if (issue) return issue;
    sets += entry.sets ?? 0;
    if (entry.reps !== null && entry.sets !== null) {
      const count = entry.reps * entry.sets;
      repetitions += count;
      if (entry.weight !== null) {
        rawVolume += count * entry.weight;
        if (entry.unit) comparableVolume += count * (entry.unit === "kg" ? entry.weight / KILOGRAMS_PER_POUND : entry.weight);
      }
    }
    if (!Number.isSafeInteger(sets) || !Number.isSafeInteger(repetitions) || !Number.isFinite(rawVolume) || !Number.isFinite(comparableVolume)) return "The combined workout totals are too large to report accurately.";
  }
  return null;
}

/** Unit-bearing field names are evidence too, even when their recorded load is zero. */
export function workoutLoadUnitEvidence(record: Record<string, unknown>) {
  return [
    "weightUnit", "weight_unit", "loadUnit", "load_unit", "unit",
    "weightPounds", "weightLb", "weightLbs", "weightKg", "weightKilograms",
    "loadPounds", "loadLb", "loadLbs", "loadKg", "loadKilograms",
  ].flatMap(field => {
    const value = record[field];
    return value == null || typeof value === "string" && !value.trim() ? [] : [{ field, value }];
  });
}
/** Only the canonical field with an exact supported value can be transported safely. */
export function unsupportedWorkoutLoadUnitEvidence(record: Record<string, unknown>) {
  return workoutLoadUnitEvidence(record).filter(({ field, value }) => field !== "weightUnit" || value !== "lb" && value !== "kg");
}
export function recordedWorkoutLoadUnit(record: Record<string, unknown>): "lb" | "kg" | null {
  if (unsupportedWorkoutLoadUnitEvidence(record).length) throw new Error(WORKOUT_LOAD_UNIT_REVIEW);
  return record.weightUnit === "lb" || record.weightUnit === "kg" ? record.weightUnit : null;
}
/** Unknown, ambiguous, malformed and overflowing loads cannot establish comparisons. */
export function workoutLoadInPounds(record: Record<string, unknown>): number | null {
  if (unsupportedWorkoutLoadUnitEvidence(record).length) return null;
  const weight = goalNumber(record.weight);
  const unit = recordedWorkoutLoadUnit(record);
  if (weight === null || weight < 0 || !unit) return null;
  const pounds = unit === "kg" ? weight / KILOGRAMS_PER_POUND : weight;
  return Number.isFinite(pounds) ? pounds : null;
}
export function formatRecordedWorkoutLoad(record: Record<string, unknown>, displayUnit: "lb" | "kg") {
  const pounds = workoutLoadInPounds(record);
  if (pounds === null || displayUnit !== "lb" && displayUnit !== "kg") return WORKOUT_LOAD_UNIT_UNKNOWN;
  const value = displayUnit === "kg" ? pounds * KILOGRAMS_PER_POUND : pounds;
  const precision = value > 0 && value < 0.01 ? { maximumSignificantDigits: 3 } : { maximumFractionDigits: 2 };
  return `${value.toLocaleString("en-US", precision)} ${displayUnit}`;
}
export const WORKOUT_LOAD_UNIT_REVIEW = "Saved exercise load-unit metadata needs review. Only the canonical weightUnit field with lb or kg is supported; the original record is retained for export. Do not remove units or relabel loads to force upload.";
export const WORKOUT_LOAD_UNIT_UNKNOWN = "Load comparison unavailable";
export const WORKOUT_VOLUME_UNIT_UNKNOWN = "Unavailable: unit-aware reporting pending";

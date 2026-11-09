import { validatePlanningImport } from "./importValidation";
import { localDate, validDateOnly } from "./dates";

/** Completed/saved observations only: planned sessions and drafts never fill a day. */
export function recordedTrainingDays(values: Readonly<Record<string, unknown>>, cloudLogs: unknown = [], now = new Date()) {
  const result = new Set<string>();
  const today = localDate(now);
  const add = (value: unknown) => {
    if (typeof value !== "string") return;
    const date = validDateOnly(value) ? value : Number.isFinite(Date.parse(value)) && Date.parse(value) <= now.getTime() ? localDate(new Date(value)) : "";
    if (date && date <= today) result.add(date);
  };
  for (const key of ["soundFitnessPlanningLogs", "soundFitnessExerciseStats", "soundFitnessSupportSignalRecords", "soundFitnessMealEntries", "soundFitnessHydrationEntries", "soundFitnessWeeklyCheckIns", "soundFitnessPainLogs"]) {
    const rows = values[key];
    if (!Array.isArray(rows) || validatePlanningImport({ [key]: rows })) continue;
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const stamp = row.completedAt ?? row.savedAt ?? row.recordedAt;
      if (typeof stamp === "string" && Date.parse(stamp) > now.getTime()) continue;
      add(key === "soundFitnessPlanningLogs" ? row.completedAt : key === "soundFitnessWeeklyCheckIns" ? row.savedAt : row.date ?? stamp);
    }
  }
  if (Array.isArray(cloudLogs)) for (const row of cloudLogs) if (row && typeof row === "object" && typeof row.completedAt === "string") add(row.completedAt);
  const profile = values.soundFitnessProfile as { measurements?: { lastUpdated?: string; progressPhotos?: Array<{ dateAdded?: string }> } } | undefined;
  add(profile?.measurements?.lastUpdated);
  if (Array.isArray(profile?.measurements?.progressPhotos)) for (const photo of profile.measurements.progressPhotos) add(photo?.dateAdded);
  return result;
}

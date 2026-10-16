import { planningKeys, planningOwner, planningAccountGeneration, planningSnapshot } from "./store";
import { cloudHistorySnapshot } from "./availableLogs";
import { activityTimestamp } from "./dates";
import { planningLogHasIdentity } from "./logs";

export type WorkoutHistoryRecovery = {
  account: string | null; generation: number; version: string; present: boolean; original: unknown; issues: string[];
};

/** Inspect original storage without filtering, repairing, or adding completion evidence. */
export function captureWorkoutHistoryRecovery(): WorkoutHistoryRecovery {
  const values = planningSnapshot();
  const present = Object.hasOwn(values, planningKeys.logs);
  const original = values[planningKeys.logs];
  const issues: string[] = [];
  if (present && !Array.isArray(original)) issues.push("The saved workout history collection is malformed.");
  if (Array.isArray(original)) {
    let invalid = 0; const ids = new Set<string>(); const assignments = new Set<string>();
    let repeatedIds = false; let repeatedAssignments = false;
    for (const value of original) {
      if (!planningLogHasIdentity(value)) { invalid++; continue; }
      if (typeof value.completedAt !== "string" || ["cloudLogId", "assignmentId", "planId", "planDayId", "templateId"].some(field => {
        const candidate = (value as unknown as Record<string, unknown>)[field];
        return candidate != null && typeof candidate !== "string";
      })) invalid++;
      if (ids.has(value.id)) repeatedIds = true;
      ids.add(value.id);
      if (value.assignmentId) {
        if (assignments.has(value.assignmentId)) repeatedAssignments = true;
        assignments.add(value.assignmentId);
      }
    }
    if (invalid) issues.push(`${invalid} saved workout record${invalid === 1 ? " needs" : "s need"} review before displaying history.`);
    if (repeatedIds) issues.push("Multiple saved workouts share a session identity.");
    if (repeatedAssignments) issues.push("Multiple saved workouts share a plan assignment.");
  }
  return { account: planningOwner(), generation: planningAccountGeneration(), version: JSON.stringify({ present, original }), present, original, issues };
}

/** Recheck owner and exact source before downloading the reviewed originals. */
export function exportWorkoutHistoryRecovery(review: WorkoutHistoryRecovery, now = new Date()) {
  const current = captureWorkoutHistoryRecovery();
  if (!review.account || current.account !== review.account || current.generation !== review.generation || current.version !== review.version) throw new Error("Workout history or account changed. Review the current records before exporting.");
  return JSON.stringify({ schemaVersion: 1, source: "Sound Fitness original workout history recovery", owner: review.account,
    exportedAt: now.toISOString(), present: current.present, original: current.original, issues: current.issues }, null, 2);
}


/** Retain date-excluded originals separately from filtered/deduplicated history displays. */
export function captureWorkoutDateReview(now = new Date()) {
  const values = planningSnapshot();
  const originals = { planningPresent: Object.hasOwn(values, planningKeys.logs), planning: values[planningKeys.logs], loadedCloud: cloudHistorySnapshot().logs };
  const excluded = [originals.planning, originals.loadedCloud].flatMap(source => Array.isArray(source) ? source : []).filter(value => {
    const time = activityTimestamp(value?.completedAt);
    return !Number.isFinite(time) || time > now.getTime();
  });
  return { account: planningOwner(), generation: planningAccountGeneration(), version: JSON.stringify(originals), originals, excluded };
}
export function exportWorkoutDateReview(review: ReturnType<typeof captureWorkoutDateReview>, now = new Date()) {
  const current = captureWorkoutDateReview(now);
  if (!review.account || review.account !== current.account || review.generation !== current.generation || review.version !== current.version)
    throw new Error("Workout sources or account session changed. Review the current originals before exporting.");
  return JSON.stringify({ schemaVersion: 1, source: "Sound Fitness original workout date review", owner: current.account,
    exportedAt: now.toISOString(), originals: current.originals }, null, 2);
}

import { planningKeys, planningOwner, planningAccountGeneration, planningSnapshot, captureDevicePlanningRecovery } from "./store";
import { captureWorkoutHistoryRecovery } from "./workoutHistoryRecovery";

function supportedEntry(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entry = value as Record<string, unknown>;
  if (["exerciseId", "exerciseName"].some(key => typeof entry[key] !== "string" || !(entry[key] as string).trim())) return false;
  if (typeof entry.date !== "string" && typeof entry.date !== "number") return false;
  if (["weight", "reps", "sets"].some(key => entry[key] != null && typeof entry[key] !== "string" && typeof entry[key] !== "number")) return false;
  if (["body", "pattern", "equipment", "coreMovementPattern", "semanticVariationId", "semanticVariationName", "generatedTitle", "source"].some(key => entry[key] != null && typeof entry[key] !== "string")) return false;
  return entry.selectedModifierIds == null || Array.isArray(entry.selectedModifierIds) && entry.selectedModifierIds.every(value => typeof value === "string");
}
function supportedWorkoutEntries(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = (value as Record<string, unknown>).entries;
  return Array.isArray(entries) && entries.every(supportedEntry);
}

/** Structural checks only: unknown units and unfinished numeric values retain their reporting semantics. */
export function captureLibraryActivityRecovery() {
  const values = planningSnapshot();
  const originals = {
    exerciseStats: { present: Object.hasOwn(values, planningKeys.exerciseStats), original: values[planningKeys.exerciseStats] },
    workouts: { present: Object.hasOwn(values, planningKeys.logs), original: values[planningKeys.logs] },
    deviceCache: captureDevicePlanningRecovery(),
  };
  const issues = [...captureWorkoutHistoryRecovery().issues];
  if (originals.deviceCache.blocked) issues.push("The device planning cache needs recovery. Its original text is preserved; activity reporting is paused.");
  const stats = originals.exerciseStats;
  if (stats.present && !Array.isArray(stats.original)) issues.push("The saved exercise activity collection is malformed.");
  if (Array.isArray(stats.original)) {
    const count = stats.original.filter(value => !supportedEntry(value)).length;
    if (count) issues.push(`${count} exercise activity entries have an unsupported structure.`);
  }
  if (Array.isArray(originals.workouts.original)) {
    const count = originals.workouts.original.filter(value => !supportedWorkoutEntries(value)).length;
    if (count) issues.push(`${count} workout exercise collections have an unsupported structure.`);
  }
  return { account: planningOwner(), generation: planningAccountGeneration(), version: JSON.stringify({ account: planningOwner(), generation: planningAccountGeneration(), originals }), originals, issues };
}
/** Stable primitive snapshot includes unreadable-cache transitions even when values stay empty. */
export const libraryActivityRecoverySnapshot = () => captureLibraryActivityRecovery().version;
export type LibraryActivityRecovery = ReturnType<typeof captureLibraryActivityRecovery>;

export function exportLibraryActivityRecovery(review: LibraryActivityRecovery, now = new Date()) {
  const current = captureLibraryActivityRecovery();
  if (!review.account || current.account !== review.account || current.generation !== review.generation || current.version !== review.version) throw new Error("Activity data or account changed. Review the current originals before exporting.");
  return JSON.stringify({ schemaVersion: 1, source: "Sound Fitness original exercise activity recovery", owner: review.account, exportedAt: now.toISOString(), originals: current.originals, issues: current.issues }, null, 2);
}

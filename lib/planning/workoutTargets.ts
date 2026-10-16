/** Member-authored instructions are never evidence of completed work. */
export type WorkoutTargets = { schemaVersion: 1; sets?: string; reps?: string; restSeconds?: string; notes?: string };
export type WorkoutTargetField = "sets" | "reps" | "restSeconds" | "notes";
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const integerText = (value: unknown, min: number, max: number) => value === undefined || value === "" || typeof value === "string" && /^\d+$/.test(value) && value.length <= 4 && Number(value) >= min && Number(value) <= max;
export function validWorkoutTargets(value: unknown): value is WorkoutTargets | undefined {
  if (value === undefined) return true;
  return record(value) && value.schemaVersion === 1 && integerText(value.sets, 1, 20) && integerText(value.restSeconds, 0, 3600)
    && (value.reps === undefined || typeof value.reps === "string" && value.reps.length <= 80)
    && (value.notes === undefined || typeof value.notes === "string" && value.notes.length <= 2000);
}
export function readWorkoutTargets(exercise: unknown, fallbackSets: number | null = null) {
  const source = record(exercise) ? exercise.workoutTargets : undefined;
  if (!validWorkoutTargets(source)) return { sets: null, reps: "", restSeconds: null, notes: "", issue: "Exercise targets need review. Original instructions are preserved." };
  const sets = source?.sets ? Number(source.sets) : fallbackSets;
  return { issue: "", sets: sets !== null && Number.isInteger(sets) && sets >= 1 && sets <= 20 ? sets : null, reps: source?.reps?.trim() || "", restSeconds: source?.restSeconds !== undefined && source.restSeconds !== "" ? Number(source.restSeconds) : null, notes: source?.notes || "" };
}
/** Tolerant display does not authorize replacing damaged source instructions. */
export function workoutTargetFieldValue(exercise: unknown, field: WorkoutTargetField) {
  if (!record(exercise) || !validWorkoutTargets(exercise.workoutTargets)) return "";
  return exercise.workoutTargets?.[field] || "";
}

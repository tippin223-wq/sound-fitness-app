import { validWorkoutTargets, type WorkoutTargets } from "./workoutTargets";

type TargetColumns = { target_sets?: unknown; target_reps?: unknown; target_rest_seconds?: unknown; notes?: unknown };
/** Existing template columns store authored instructions, never completed results. */
export function workoutTargetColumns(exercise: { workoutTargets?: unknown }) {
  const targets = exercise.workoutTargets;
  if (!validWorkoutTargets(targets)) throw new Error("Exercise targets need review before cloud save. Original instructions are preserved.");
  return {
    target_sets: targets?.sets ? Number(targets.sets) : null,
    target_reps: targets?.reps || null,
    target_rest_seconds: targets?.restSeconds !== undefined && targets.restSeconds !== "" ? Number(targets.restSeconds) : null,
    notes: targets?.notes || null,
  };
}
/** Keep unsupported remote values invalid so import/launch review can reject them. */
export function workoutTargetsFromColumns(row: TargetColumns): { workoutTargets?: WorkoutTargets } {
  if ([row.target_sets, row.target_reps, row.target_rest_seconds, row.notes].every(value => value == null))
    return ["target_sets", "target_reps", "target_rest_seconds", "notes"].some(key => Object.hasOwn(row, key)) ? { workoutTargets: undefined } : {};
  const countText = (value: unknown) => typeof value === "number" ? String(value) : value;
  return { workoutTargets: {
    schemaVersion: 1,
    ...(row.target_sets != null ? { sets: countText(row.target_sets) } : {}),
    ...(row.target_reps != null ? { reps: row.target_reps } : {}),
    ...(row.target_rest_seconds != null ? { restSeconds: countText(row.target_rest_seconds) } : {}),
    ...(row.notes != null ? { notes: row.notes } : {}),
  } as WorkoutTargets };
}

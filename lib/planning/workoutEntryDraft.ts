import { goalNumber } from "./goalNumbers";
import { unsupportedWorkoutLoadUnitEvidence, workoutNumericReportingIssue, workoutNumericTotalsIssue } from "./loadUnitEvidence";

export function plannedAssignmentSetTarget(assignment: { setsPerExercise?: unknown } | null | undefined) {
  if (!assignment) return null;
  const sets = assignment.setsPerExercise ?? 3;
  return typeof sets === "number" && Number.isInteger(sets) && sets >= 1 && sets <= 20 ? sets : null;
}
export function workoutTargetLabel(sets: number | null, reps: string) {
  const count = sets !== null && Number.isInteger(sets) && sets >= 1 && sets <= 20 ? sets : null;
  const repLabel = reps.trim();
  if (count !== null && repLabel) return `${count} × ${repLabel}`;
  return `${count === null ? "Sets not set" : `${count} planned sets`} · ${repLabel || "reps not set"}`;
}

export function exerciseLogStatus(value: unknown): "empty" | "incomplete" | "invalid" | "complete" {
  if (value == null) return "empty";
  if (typeof value !== "object" || Array.isArray(value)) return "invalid";
  const log = value as Record<string, unknown>;
  if (unsupportedWorkoutLoadUnitEvidence(log).length) return "invalid";
  if (Object.hasOwn(log, "weightUnit") && log.weightUnit !== "" && log.weightUnit !== "lb" && log.weightUnit !== "kg") return "invalid";
  const fields = [log.weight, log.reps, log.sets];
  if (fields.some(field => field != null && typeof field !== "string")) return "invalid";
  if (fields.every(field => field == null || !(field as string).trim())) return "empty";
  if (fields.some(field => field == null || !(field as string).trim())) return "incomplete";
  if (log.weightUnit === "") return "incomplete";
  const [weight, reps, sets] = fields.map(goalNumber);
  const count = (number: number | null) => number !== null && Number.isInteger(number) && number > 0 && number <= 2147483647;
  return weight !== null && weight >= 0 && count(reps) && count(sets)
    && !workoutNumericReportingIssue(weight, reps, sets, log.weightUnit === "lb" || log.weightUnit === "kg" ? log.weightUnit : null) ? "complete" : "invalid";
}

export function workoutCompletionIssue(entries: Array<{ name: string; log: unknown }>) {
  for (const entry of entries) {
    const status = exerciseLogStatus(entry.log);
    if (status === "incomplete" || status === "invalid") return `${entry.name}: complete valid weight, load unit, reps, and sets, or clear the numeric fields to leave this movement unrecorded. Your draft is preserved.`;
  }
  const complete = entries.filter(entry => exerciseLogStatus(entry.log) === "complete");
  if (!complete.length) return "Log weight, reps, and sets for at least one movement before finishing.";
  const issue = workoutNumericTotalsIssue(complete.map(entry => {
    const log = entry.log as Record<string, unknown>;
    return { weight: goalNumber(log.weight), reps: goalNumber(log.reps), sets: goalNumber(log.sets), unit: log.weightUnit === "lb" || log.weightUnit === "kg" ? log.weightUnit : null };
  }));
  return issue ? `${issue} Review your measurements before finishing. Your draft is preserved.` : null;
}

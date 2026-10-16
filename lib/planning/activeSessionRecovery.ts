import type { LocalWorkoutBuilderSessionTemplate } from "@/lib/localData/workoutBuilderData";
import { validatePlanningImport } from "./importValidation";
import { activityTimestamp, validDateOnly } from "./dates";
import { unsupportedWorkoutLoadUnitEvidence } from "./loadUnitEvidence";
import { planningKeys, planningOwner, planningAccountGeneration, planningSnapshot } from "./store";

export const ACTIVE_SESSION_KEY = "soundFitnessWorkoutBuilderActiveSessionTemplate";
export const MAX_WORKOUT_SESSION_EXERCISES = 100;
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const text = (value: unknown): value is string => typeof value === "string" && Boolean(value.trim());
export function activeSessionTemplateIssue(value: unknown): string | null {
  if (!record(value) || !text(value.id) || !text(value.title) || typeof value.startedAt !== "string" || !Number.isFinite(activityTimestamp(value.startedAt))
    || !Array.isArray(value.exercises) || !value.exercises.length || value.exercises.length > MAX_WORKOUT_SESSION_EXERCISES
    || validatePlanningImport({ [planningKeys.templates]: [value] })) return "The active workout snapshot needs review before logging or resuming. Original exercises and instructions are preserved.";
  return null;
}
export function workoutSessionDraftIssue(value: unknown, count: number, template: LocalWorkoutBuilderSessionTemplate | null, context: unknown) {
  if (value == null || text(value)) return null;
  if (!record(value) || !text(value.id) || !record(value.logs) || value.completedAt != null && (typeof value.completedAt !== "string" || !Number.isFinite(activityTimestamp(value.completedAt)))) return "The active workout draft has an unsupported structure. Original entries are preserved.";
  if (record(context) && context.source === "plan" && value.id !== context.id) return "The active draft's session identity differs from its plan link. Original workout and draft records are preserved for review.";
  if (Object.entries(value.logs).some(([key, log]) => !/^\d+$/.test(key) || String(Number(key)) !== key || Number(key) < 2 || Number(key) > count + 1 || !record(log)
    || [log.sets, log.reps, log.weight].some(field => typeof field !== "string") || unsupportedWorkoutLoadUnitEvidence(log).length
    || Object.hasOwn(log, "weightUnit") && !["", "lb", "kg"].includes(log.weightUnit as string))) return "The active draft's exercise positions, numeric fields or load units need review. Original entries are preserved.";
  if (value.recovery != null && (!record(value.recovery) || !template || activeSessionTemplateIssue(value.recovery.template)
    || JSON.stringify(value.recovery.template) !== JSON.stringify(template) || JSON.stringify(value.recovery.context) !== JSON.stringify(context ?? null))) return "The draft recovery snapshot differs from the active workout. Original snapshots are preserved for review.";
  return null;
}

/** Inspect exact originals, including damaged collections, without fallback writes. */
export function captureActiveSessionRecovery() {
  const values = planningSnapshot();
  const present = Object.hasOwn(values, ACTIVE_SESSION_KEY);
  const original = values[ACTIVE_SESSION_KEY];
  const context = values[planningKeys.context];
  const issues: string[] = [];
  const issue = original == null ? null : activeSessionTemplateIssue(original);
  if (issue) issues.push(issue);
  const template = original != null && !issue ? JSON.parse(JSON.stringify(original)) as LocalWorkoutBuilderSessionTemplate : null;
  if (context != null && (!record(context) || context.source !== "plan" || !template || context.templateId !== template.id || context.startedAt !== template.startedAt
    || ![context.id, context.planId, context.planDayId, context.assignmentId].every(text) || typeof context.planDayDate !== "string" || !validDateOnly(context.planDayDate))) issues.push("The active workout's plan link needs review. Its original context is preserved.");
  const key = template ? `loggerDraft:${template.id}:${template.startedAt}` : "loggerDraft:default";
  if (!issue && Object.hasOwn(values, key)) {
    const problem = workoutSessionDraftIssue(values[key], template?.exercises.length || 8, template, context);
    if (problem) issues.push(problem);
  }
  const drafts = Object.fromEntries(Object.entries(values).filter(([name]) => name.startsWith("loggerDraft:")));
  const source = { present, original, contextPresent: Object.hasOwn(values, planningKeys.context), context, drafts };
  return { account: planningOwner(), generation: planningAccountGeneration(), version: JSON.stringify(source), ...source, template, issues };
}
export type ActiveSessionRecovery = ReturnType<typeof captureActiveSessionRecovery>;
export function assertActiveSessionReviewed() {
  const review = captureActiveSessionRecovery();
  if (review.issues.length) throw new Error(review.issues.join(" "));
}
export function exportActiveSessionRecovery(review: ActiveSessionRecovery) {
  const current = captureActiveSessionRecovery();
  if (!review.account || review.account !== current.account || review.generation !== current.generation || review.version !== current.version) throw new Error("The active session, drafts or account changed. Review the latest originals before exporting.");
  return JSON.stringify({ schemaVersion: 1, source: "Sound Fitness original active session recovery", owner: review.account, present: review.present,
    original: current.original, contextPresent: current.contextPresent, context: current.context, drafts: current.drafts, issues: current.issues }, null, 2);
}

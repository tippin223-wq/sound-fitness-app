import type { LocalExerciseStatEntry } from "@/types";
import { readExerciseStatsForSave } from "@/lib/localData/workoutData";
import { assertPlanningDeviceCurrent, captureDevicePlanningRecovery, planningAccountGeneration, planningKeys, planningOwner, planningRecordVersion, planningSnapshot, planningStatus, writePlanningValues } from "./store";
import { goalNumber } from "./goalNumbers";
import { workoutNumericReportingIssue } from "./loadUnitEvidence";

// Deliberately excluded from planningKeys: the old global browser key has no verified owner.
// Only records inside the current account's planning document are used here.
export const DASHBOARD_MANUAL_STATS_KEY = "soundFitnessManualStatsLogs";
export type DashboardManualStat = {
  id: string; loggedAt: string; dateTime: string; load: string; notes: string;
  reps: string; rpe: string; sessionLabel: string; sets: string; weightUnit?: "" | "lb" | "kg";
  references: { referenceId: string; referenceTitle: string; referenceType: string; sourceLibrary: string; metadata: { body?: string; equipment?: string; movementPattern?: string } }[];
};
const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
function validMetadata(value: unknown) {
  return object(value) && ["body", "equipment", "movementPattern"].every(key => value[key] === undefined || typeof value[key] === "string");
}
function validRecord(value: unknown): value is DashboardManualStat {
  return object(value) && typeof value.id === "string" && Boolean(value.id.trim())
    && ["loggedAt", "dateTime", "load", "notes", "reps", "rpe", "sessionLabel", "sets"].every(key => typeof value[key] === "string")
    && Number.isFinite(Date.parse(value.loggedAt as string))
    && (value.weightUnit === undefined || value.weightUnit === "" || value.weightUnit === "lb" || value.weightUnit === "kg")
    && Array.isArray(value.references) && value.references.every(ref => object(ref)
      && ["referenceId", "referenceTitle", "referenceType", "sourceLibrary"].every(key => typeof ref[key] === "string" && Boolean((ref[key] as string).trim()))
      && validMetadata(ref.metadata));
}
function readRecords<T extends DashboardManualStat>() {
  const values = planningSnapshot();
  const original = Object.hasOwn(values, DASHBOARD_MANUAL_STATS_KEY) ? values[DASHBOARD_MANUAL_STATS_KEY] : [];
  if (!Array.isArray(original) || !original.every(validRecord) || new Set(original.map(item => item.id)).size !== original.length) throw new Error("Saved manual notes need review. Original notes and your entered values are preserved; export your account planning backup before making changes.");
  return original as T[];
}
export function inspectDashboardManualStats<T extends DashboardManualStat>() {
  try {
    if (captureDevicePlanningRecovery().blocked) throw new Error("Device planning data needs recovery. Original notes and your entered values are preserved.");
    return { entries: readRecords<T>(), issue: "" };
  } catch (cause) { return { entries: [] as T[], issue: cause instanceof Error ? cause.message : "Manual notes need review." }; }
}
const sourceVersion = () => JSON.stringify([DASHBOARD_MANUAL_STATS_KEY, planningKeys.exerciseStats].map(key => [Object.hasOwn(planningSnapshot(), key), planningRecordVersion(key)]));
export const captureDashboardManualStatsEditor = () => ({ account: planningOwner(), generation: planningAccountGeneration(), version: sourceVersion() });
function assertEditorAccount(editor: ReturnType<typeof captureDashboardManualStatsEditor>) {
  if (!editor.account || editor.account !== planningOwner() || editor.generation !== planningAccountGeneration()) throw new Error("Your account changed. Copy your entered values and reload before saving manual notes.");
  if (planningStatus.startsWith("Sync conflict")) throw new Error("Resolve the account sync conflict before saving. Your entered values remain here.");
  assertPlanningDeviceCurrent();
}
/** Review is read-only. Accepting it must still match the exact account and displayed sources. */
export function reviewDashboardManualStats(editor: ReturnType<typeof captureDashboardManualStatsEditor>) {
  assertEditorAccount(editor);
  return { editor: captureDashboardManualStatsEditor(), entries: structuredClone(readRecords<DashboardManualStat>()), exerciseStats: structuredClone(readExerciseStatsForSave()) };
}
export const dashboardManualStatsReviewBelongsToCurrentAccount = (review: ReturnType<typeof reviewDashboardManualStats>) => review.editor.account === planningOwner() && review.editor.generation === planningAccountGeneration();
export function acceptDashboardManualStatsReview(review: ReturnType<typeof reviewDashboardManualStats>) {
  assertEditorAccount(review.editor);
  if (review.editor.version !== sourceVersion()) throw new Error("Saved notes or statistics changed again. Review the latest saved data before continuing. Your entered values remain here.");
  return reviewDashboardManualStats(review.editor).editor;
}
export function saveDashboardManualStat<T extends DashboardManualStat>(input: T, editor: ReturnType<typeof captureDashboardManualStatsEditor>, now = new Date()) {
  assertEditorAccount(editor);
  if (editor.version !== sourceVersion()) throw new Error("Saved notes or statistics changed. Review the latest saved data before continuing. Your entered values remain here.");
  const records = readRecords<T>();
  if (!validRecord(input)) throw new Error("Review the manual note and selected exercise before saving.");
  if (records.some(record => record.id === input.id)) throw new Error("This manual note is already saved. Reload before adding another entry.");
  const date = new Date(input.dateTime);
  const parts = input.dateTime.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!parts || !Number.isFinite(date.getTime()) || [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()].some((value, index) => value !== Number(parts[index + 1])) || date > now) throw new Error("Choose a valid date and time that is not in the future. Your entered values remain here.");
  if (![input.sets, input.reps, input.load, input.rpe, input.notes, input.sessionLabel].some(value => value.trim())) throw new Error("Enter a measurement or note before saving.");
  for (const key of ["sets", "reps"] as const) if (input[key].trim() && (!/^\d+$/.test(input[key].trim()) || !Number.isSafeInteger(Number(input[key])) || Number(input[key]) < 1 || Number(input[key]) > 2147483647)) throw new Error("Enter positive whole sets and reps within the supported reporting range (up to 2,147,483,647), or leave them blank for a note.");
  const load = input.load.trim() ? goalNumber(input.load) : null;
  const rpe = input.rpe.trim() ? goalNumber(input.rpe) : null;
  if (input.load.trim() && (load === null || load < 0)) throw new Error("Enter a nonnegative decimal load or leave it blank.");
  if (input.rpe.trim() && (rpe === null || rpe < 1 || rpe > 10)) throw new Error("Enter decimal RPE from 1 to 10 or leave it blank.");
  const reportingIssue = workoutNumericReportingIssue(load, input.reps.trim() ? Number(input.reps) : null, input.sets.trim() ? Number(input.sets) : null, input.weightUnit || null);
  if (reportingIssue) throw new Error(`${reportingIssue} Review your measurements before saving; your entered values remain here.`);
  const entry = structuredClone(input);
  const exercise = entry.references.find(ref => ref.referenceType === "exercise");
  // A note or partial measurement does not establish completed exercise sets.
  const stat: LocalExerciseStatEntry | null = exercise && entry.sets.trim() && entry.reps.trim() ? {
    body: exercise.metadata.body, equipment: exercise.metadata.equipment,
    exerciseId: exercise.referenceId, exerciseName: exercise.referenceTitle,
    pattern: exercise.metadata.movementPattern, sets: entry.sets.trim(), reps: entry.reps.trim(),
    weight: entry.load.trim(), ...(entry.load.trim() && entry.weightUnit ? { weightUnit: entry.weightUnit } : {}), date: date.toISOString(), source: "exercise-library",
  } : null;
  const entries = [entry, ...records];
  const exerciseStats = stat ? [stat, ...readExerciseStatsForSave()] : null;
  writePlanningValues({ [DASHBOARD_MANUAL_STATS_KEY]: entries, ...(exerciseStats ? { [planningKeys.exerciseStats]: exerciseStats } : {}) });
  return { entry, entries, exerciseStats };
}

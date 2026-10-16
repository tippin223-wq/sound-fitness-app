import type { LocalExerciseStatEntry } from "@/types";
import { libraryRecordedLoad } from "./libraryLoadUnits";
import { goalNumber } from "./goalNumbers";
import { exerciseLogStatus } from "./workoutEntryDraft";
import { unsupportedWorkoutLoadUnitEvidence } from "./loadUnitEvidence";
import { activityTimestamp } from "./dates";
import { planningAccountGeneration, planningKeys, planningOwner, planningRecordVersion, planningSnapshot, writePlanning } from "./store";

export function prepareLibraryStatDraft(draft: { weight: unknown; reps: unknown; sets: unknown; unit: unknown }) {
  const load = libraryRecordedLoad(draft.weight, draft.unit);
  const reps = goalNumber(draft.reps); const sets = goalNumber(draft.sets);
  const validCount = (value: number | null) => value !== null && Number.isInteger(value) && value > 0 && value <= 2147483647;
  if (!load) return { success: false as const, message: "Enter a finite load of zero or more in the displayed unit. Your entries are kept." };
  if (!validCount(reps) || !validCount(sets)) return { success: false as const, message: "Reps and sets must be positive whole numbers no greater than 2147483647. Your entries are kept." };
  return { success: true as const, values: { ...load, reps: String(reps), sets: String(sets) } };
}
export const captureLibraryStatEditor = () => ({ account: planningOwner(), generation: planningAccountGeneration(), version: planningRecordVersion(planningKeys.exerciseStats) });
export type LibraryStatEditor = ReturnType<typeof captureLibraryStatEditor>;

/** Synchronous guarded prepend; preserve malformed originals and reject duplicate stale submissions. */
export function saveLibraryStatEntry(value: LocalExerciseStatEntry, editor: LibraryStatEditor | null, now = new Date()) {
  if (!editor) throw new Error("Edit the values or reopen the logger before saving another entry.");
  if (!editor.account || editor.account !== planningOwner() || editor.generation !== planningAccountGeneration()) throw new Error("Your account changed or is still loading. Reopen the logger; your entries are kept.");
  if (editor.version !== planningRecordVersion(planningKeys.exerciseStats)) throw new Error("Activity changed while this logger was open. Reopen it to review the latest data; your entries are kept.");
  const values = planningSnapshot();
  const original = Object.hasOwn(values, planningKeys.exerciseStats) ? values[planningKeys.exerciseStats] : [];
  if (!Array.isArray(original)) throw new Error("Saved activity needs review before adding entries. The original data and your entries are kept.");
  const entry: LocalExerciseStatEntry = JSON.parse(JSON.stringify(value));
  const time = activityTimestamp(entry.date);
  if (typeof entry.exerciseId !== "string" || !entry.exerciseId.trim() || typeof entry.exerciseName !== "string" || !entry.exerciseName.trim() || entry.source !== "exercise-library" || !Number.isFinite(time) || time > now.getTime() || entry.weightUnit !== "lb" && entry.weightUnit !== "kg" || unsupportedWorkoutLoadUnitEvidence(entry as unknown as Record<string, unknown>).length || exerciseLogStatus({ weight: entry.weight, weightUnit: entry.weightUnit, reps: entry.reps, sets: entry.sets }) !== "complete") throw new Error("Review exercise, date, load unit, reps and sets before saving. Your entries are kept.");
  writePlanning(planningKeys.exerciseStats, [entry, ...original]);
  return entry;
}

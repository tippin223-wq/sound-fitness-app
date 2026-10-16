import type { LocalWorkoutBuilderSelectedExercise } from "@/lib/localData/workoutBuilderData";
import { planningKeys, planningOwner, planningAccountGeneration, planningRecordVersion, planningSnapshot, writePlanning } from "./store";
import { validatePlanningImport } from "./importValidation";

export const captureBuilderSelectionEditor = (account = planningOwner()) => ({ account, generation: planningAccountGeneration(), version: planningRecordVersion(planningKeys.selectedExercises) });
export type BuilderSelectionEditor = ReturnType<typeof captureBuilderSelectionEditor>;

/** Validate the source a Builder session opened before replacing selected records. */
export function commitBuilderSelection(exercises: LocalWorkoutBuilderSelectedExercise[], editor: BuilderSelectionEditor) {
  if (!editor.account || editor.account !== planningOwner() || editor.generation !== planningAccountGeneration()) throw new Error("Your account changed. Your open workout is preserved; reload Builder before editing exercises.");
  if (planningRecordVersion(planningKeys.selectedExercises) !== editor.version) throw new Error("Selected exercises changed elsewhere. Your open workout is preserved; reload Builder before replacing newer selections.");
  const snapshot = planningSnapshot();
  if (Object.hasOwn(snapshot, planningKeys.selectedExercises) && (!Array.isArray(snapshot[planningKeys.selectedExercises]) || validatePlanningImport({ [planningKeys.selectedExercises]: snapshot[planningKeys.selectedExercises] }))) throw new Error("Saved selected exercises need review. Export your account planning backup; the original selections and open workout are preserved.");
  if (!Array.isArray(exercises) || validatePlanningImport({ [planningKeys.selectedExercises]: exercises })) throw new Error("Review the proposed exercise records. Your previous selection is preserved.");
  writePlanning(planningKeys.selectedExercises, JSON.parse(JSON.stringify(exercises)));
  return captureBuilderSelectionEditor(editor.account);
}

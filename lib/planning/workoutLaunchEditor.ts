import { assertActiveSessionReviewed, captureActiveSessionRecovery } from "./activeSessionRecovery";
import { assertPlanningDeviceCurrent, planningKeys, planningOwner, planningAccountGeneration, planningRecordVersion } from "./store";

export function captureWorkoutLaunchEditor() {
  return { account: planningOwner(), generation: planningAccountGeneration(), activeVersion: planningRecordVersion("soundFitnessWorkoutBuilderActiveSessionTemplate"), contextVersion: planningRecordVersion(planningKeys.context) };
}
export type WorkoutLaunchEditor = ReturnType<typeof captureWorkoutLaunchEditor>;
export function assertWorkoutLaunchEditor(editor: WorkoutLaunchEditor | undefined) {
  if (!editor?.account || editor.account !== planningOwner() || editor.generation !== planningAccountGeneration()) throw new Error("Your account changed or workout controls are still loading. Reload before starting; open edits are preserved.");
  const current = captureWorkoutLaunchEditor();
  if (editor.activeVersion !== current.activeVersion || editor.contextVersion !== current.contextVersion) throw new Error("The active workout changed elsewhere. Review current workout controls before starting another session; open edits are preserved.");
  assertPlanningDeviceCurrent();
}
/** Explicit, read-only review. Account changes and damaged originals cannot be bypassed. */
export function reviewWorkoutLaunchEditor(editor: WorkoutLaunchEditor) {
  if (!editor.account || editor.account !== planningOwner() || editor.generation !== planningAccountGeneration()) throw new Error("Your account changed. Reload before reviewing workout controls; open edits are preserved.");
  assertPlanningDeviceCurrent();
  assertActiveSessionReviewed();
  return { editor: captureWorkoutLaunchEditor(), title: captureActiveSessionRecovery().template?.title || "No active template" };
}

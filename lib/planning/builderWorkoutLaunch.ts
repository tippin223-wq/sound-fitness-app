import { startSavedWorkoutBuilderSession, writeActiveWorkoutBuilderSessionTemplate, type LocalWorkoutBuilderTemplate } from "@/lib/localData/workoutBuilderData";
import { assertPlanningDeviceCurrent, planningKeys, planningOwner, planningAccountGeneration, planningRecordVersion } from "./store";

const activeKey = "soundFitnessWorkoutBuilderActiveSessionTemplate";
export function captureBuilderWorkoutLaunch(account = planningOwner()) {
  return { account, generation: planningAccountGeneration(), activeVersion: planningRecordVersion(activeKey), contextVersion: planningRecordVersion(planningKeys.context) };
}
export type BuilderWorkoutLaunchEditor = ReturnType<typeof captureBuilderWorkoutLaunch>;

/** A stale Builder must not replace a session opened or resumed elsewhere. */
export function launchBuilderWorkout(template: LocalWorkoutBuilderTemplate, editor: BuilderWorkoutLaunchEditor, saved = false) {
  if (!editor.account || editor.account !== planningOwner() || editor.generation !== planningAccountGeneration()) throw new Error("Your account changed. Reload Builder before starting; your open workout is preserved.");
  if (editor.activeVersion !== planningRecordVersion(activeKey) || editor.contextVersion !== planningRecordVersion(planningKeys.context)) throw new Error("The active workout changed elsewhere. Open the session logger to review it before starting another workout; your Builder is preserved.");
  assertPlanningDeviceCurrent();
  const session = saved ? startSavedWorkoutBuilderSession(template) : writeActiveWorkoutBuilderSessionTemplate(template);
  return { session, editor: captureBuilderWorkoutLaunch(editor.account) };
}

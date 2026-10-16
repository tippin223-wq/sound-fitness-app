import { workoutTemplateContentVersion, type LocalWorkoutBuilderTemplate } from "@/lib/localData/workoutBuilderData";
import { recordedExerciseSemanticKey } from "./mergeExerciseOccurrences";
import { hasWorkoutSemantics, workoutSemanticOverride } from "./workoutSemanticColumns";
import { workoutTemplateCloudExerciseVersion } from "./workoutTemplateConfirmation";

export const WORKOUT_TEMPLATE_REFRESH_ARCHIVE_PREFIX = "workoutTemplateRefreshArchive:";

/** Carry local-only annotations only when the persisted exercise evidence is unambiguous. */
export function mergeRefreshedWorkoutTemplate(local: LocalWorkoutBuilderTemplate, cloud: LocalWorkoutBuilderTemplate) {
  if (local.id !== cloud.id) throw new Error("Cloud workout identity changed. Saved originals are preserved.");
  const localKeys = local.exercises.map(workoutTemplateCloudExerciseVersion);
  const cloudKeys = cloud.exercises.map(workoutTemplateCloudExerciseVersion);
  const sameOrder = localKeys.length === cloudKeys.length && localKeys.every((key, index) => key === cloudKeys[index]);
  const exercises = cloud.exercises.map((exercise, index) => {
    const key = cloudKeys[index];
    const semantic = recordedExerciseSemanticKey(exercise);
    const explicit = hasWorkoutSemantics(exercise);
    const compatible = (position: number) => !explicit || !semantic || recordedExerciseSemanticKey(local.exercises[position]) === semantic;
    const matches = localKeys.flatMap((value, position) => value === key && compatible(position) ? [position] : []);
    const cloudMatches = cloudKeys.filter((value, position) => value === key && (!explicit || !semantic || recordedExerciseSemanticKey(cloud.exercises[position]) === semantic)).length;
    const position = sameOrder && compatible(index) ? index : matches.length === 1 && cloudMatches === 1 ? matches[0] : -1;
    const prior = position >= 0 ? local.exercises[position] : null;
    return prior ? { ...exercise, ...prior, ...workoutSemanticOverride(exercise), ...(Object.hasOwn(exercise, "workoutTargets") ? { workoutTargets: exercise.workoutTargets } : {}) } : exercise;
  });
  const template = JSON.parse(JSON.stringify({ ...local, ...cloud, exercises })) as LocalWorkoutBuilderTemplate;
  return { template, contentChanged: workoutTemplateContentVersion(local) !== workoutTemplateContentVersion(template) };
}

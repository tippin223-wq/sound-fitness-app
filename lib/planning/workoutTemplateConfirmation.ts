import type { LocalWorkoutBuilderSelectedExercise, LocalWorkoutBuilderTemplate } from "@/lib/localData/workoutBuilderData";

import { workoutSemanticColumns } from "./workoutSemanticColumns";
import { workoutTargetColumns } from "./workoutTemplateTargets";

const cloudExercise = (exercise: LocalWorkoutBuilderSelectedExercise) => ({
  semantic_metadata: workoutSemanticColumns(exercise).semantic_metadata || {},
  ...workoutTargetColumns(exercise),
  id: exercise.id, name: exercise.name,
  body: exercise.body || null, pattern: exercise.pattern || null, equipment: exercise.equipment || null,
});
/** Exercise identity matches local annotations; changed targets are applied separately by refresh. */
export const workoutTemplateCloudExerciseVersion = (exercise: LocalWorkoutBuilderSelectedExercise) => JSON.stringify({
  id: exercise.id, name: exercise.name, body: exercise.body || null, pattern: exercise.pattern || null, equipment: exercise.equipment || null,
});

/** Only columns persisted by the atomic workout endpoint participate in its confirmation. */
export function workoutTemplateCloudContentVersion(template: LocalWorkoutBuilderTemplate) {
  return JSON.stringify({
    id: template.id,
    title: template.title.trim() || "Untitled Workout Template",
    exercises: template.exercises.map(cloudExercise),
  });
}

export function workoutTemplateSaveConfirmed(sent: LocalWorkoutBuilderTemplate, saved: LocalWorkoutBuilderTemplate) {
  const expected = sent.cloudRevision ?? 0;
  return Number.isSafeInteger(expected) && expected >= 0 && saved.cloudRevision === expected + 1
    && workoutTemplateCloudContentVersion(sent) === workoutTemplateCloudContentVersion(saved);
}

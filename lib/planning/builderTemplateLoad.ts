import { toWorkoutBuilderSelectedExercise, workoutTemplateContentVersion, type LocalWorkoutBuilderTemplate } from "@/lib/localData/workoutBuilderData";
import { validatePlanningImport } from "./importValidation";
import { planningKeys } from "./store";
import type { ExerciseCatalogItem } from "@/types";

/** The current name-based Builder must prove it can round-trip every original record. */
export function builderTemplateLoadProblem(template: LocalWorkoutBuilderTemplate, catalog: ExerciseCatalogItem[]) {
  const issue = "This Builder cannot edit this workout's custom, repeated, or changed exercises without changing originals. Your current draft and saved workout are preserved. Use Start Workout to train the saved version.";
  if (validatePlanningImport({ [planningKeys.templates]: [template] }) || !template.exercises.length) return issue;
  const names = new Set<string>();
  const resolved: ExerciseCatalogItem[] = [];
  for (const exercise of template.exercises) {
    if (names.has(exercise.name)) return issue;
    names.add(exercise.name);
    const matches = catalog.filter(item => item.name === exercise.name);
    if (matches.length !== 1 || matches[0].id !== exercise.id || catalog.filter(item => item.id === exercise.id).length !== 1) return issue;
    resolved.push(matches[0]);
  }
  const roundTrip = { ...template, exercises: resolved.map(toWorkoutBuilderSelectedExercise) };
  return workoutTemplateContentVersion(template) === workoutTemplateContentVersion(roundTrip) ? null : issue;
}

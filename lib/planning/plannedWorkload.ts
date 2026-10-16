import { assignmentTemplateIssue, type LocalPlanAssignment } from "@/lib/localData/workoutPlanData";
import type { LocalWorkoutBuilderTemplate } from "@/lib/localData/workoutBuilderData";
import { ambiguousWorkoutTemplateIds } from "./templateRecommendations";
import { validatePlanningImport } from "./importValidation";
import { plannedAssignmentSetTarget } from "./workoutEntryDraft";
import { readWorkoutTargets } from "./workoutTargets";

/** Keep recorded workload separate from assignments whose count needs review. */
export function plannedWorkload(assignments: readonly { templateExerciseCount?: unknown; setsPerExercise?: unknown }[]) {
  let knownSets = 0;
  let unknownAssignments = 0;
  for (const assignment of assignments) {
    const count = assignment.templateExerciseCount;
    const sets = assignment.setsPerExercise ?? 3;
    if (typeof count !== "number" || !Number.isInteger(count) || count < 1 || count > 2147483647
      || typeof sets !== "number" || !Number.isInteger(sets) || sets < 1 || sets > 20
      || !Number.isSafeInteger(knownSets + count * sets)) {
      unknownAssignments++;
      continue;
    }
    knownSets += count * sets;
  }
  return { knownSets, unknownAssignments, totalSets: unknownAssignments ? null : knownSets };
}

export function plannedExerciseCount(assignments: readonly { templateExerciseCount?: unknown }[]) {
  return plannedWorkload(assignments.map(item => ({ templateExerciseCount: item.templateExerciseCount, setsPerExercise: 1 }))).totalSets;
}

export function plannedWeekSummary(days: readonly { kind?: unknown; assignments: readonly { templateExerciseCount?: unknown }[] }[]) {
  const assignments = days.flatMap(day => day.assignments);
  return {
    trainingDays: days.filter(day => day.kind === "training" || day.assignments.length > 0).length,
    plannedDays: days.filter(day => day.assignments.length > 0).length,
    assignments: assignments.length,
    exercises: plannedExerciseCount(assignments),
  };
}

/** Match the logger's exercise-specific targets, using assignment sets only for unset targets. */
export function resolvedPlannedWorkload(assignments: readonly LocalPlanAssignment[], templates: LocalWorkoutBuilderTemplate[]) {
  const ambiguous = ambiguousWorkoutTemplateIds(templates);
  let knownSets = 0;
  let unknownAssignments = 0;
  for (const assignment of assignments) {
    const template = templates.find(item => item?.id === assignment.templateId);
    const fallback = plannedAssignmentSetTarget(assignment);
    if (typeof assignment.templateId !== "string" || ambiguous.has(assignment.templateId) || assignmentTemplateIssue(assignment, template) || !template || fallback === null
      || validatePlanningImport({ soundFitnessWorkoutBuilderSavedTemplates: [template] })) {
      unknownAssignments++;
      continue;
    }
    const targets = template.exercises.map(exercise => readWorkoutTargets(exercise, fallback));
    const sets = targets.reduce((sum, target) => sum + (target.sets ?? 0), 0);
    if (targets.some(target => target.issue || target.sets === null) || !Number.isSafeInteger(knownSets + sets)) {
      unknownAssignments++;
      continue;
    }
    knownSets += sets;
  }
  return { knownSets, unknownAssignments, totalSets: unknownAssignments ? null : knownSets };
}

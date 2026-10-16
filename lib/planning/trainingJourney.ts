import { savedGoalsIssue, type GoalState } from "./goals";
import { validatePlanningImport } from "./importValidation";
import { workoutHistory } from "./history";
import { readAvailableWorkoutLogs, readWorkoutCompletionEvidence, type PlanningLog } from "./logs";
import { cloudHistorySnapshot, workoutCompletionConflicts } from "./availableLogs";
import { captureWorkoutHistoryRecovery } from "./workoutHistoryRecovery";
import { sessionReportLogs } from "./sessionReporting";
import type { LocalWeeklyPlan } from "@/lib/localData/workoutPlanData";

/** A saved-set total alone cannot establish a confirmed completion milestone. */
export function readTrainingJourneyWorkoutLogs(now = new Date()) {
  try {
    if (captureWorkoutHistoryRecovery().issues.length) return [];
    readWorkoutCompletionEvidence();
    const local = readWorkoutCompletionEvidence(false);
    const conflicts = workoutCompletionConflicts(local, cloudHistorySnapshot().logs);
    const disputed = new Set(conflicts.flatMap(conflict => [conflict.planning.id, conflict.cloud.id,
      conflict.planning.cloudLogId, conflict.cloud.cloudLogId].filter((id): id is string => typeof id === "string")));
    return sessionReportLogs(readAvailableWorkoutLogs(), now).filter(log => !disputed.has(log.id) && !(log.cloudLogId && disputed.has(log.cloudLogId)));
  } catch { return []; }
}

/** Navigation milestones use recorded data, never the number of filled draft fields. */
export function trainingJourneyState(input: { goals: Partial<GoalState>; plans: LocalWeeklyPlan[]; logs: PlanningLog[] }, now = new Date()) {
  const validPlans = Array.isArray(input.plans) && !validatePlanningImport({ soundFitnessWorkoutPlans: input.plans }) ? input.plans : [];
  const weeks = validPlans.filter(plan => plan.status !== "archived" && Array.isArray(plan.days) && plan.days.length > 0
    && !validatePlanningImport({ soundFitnessWorkoutPlans: [plan] }));
  const recorded = {
    goals: !savedGoalsIssue(input.goals, now),
    plan: weeks.length > 0,
    assignments: weeks.some(plan => plan.days.some(day => day.assignments.some(item => typeof item.templateId === "string" && Boolean(item.templateId.trim())))),
    workout: workoutHistory(input.logs, now).some(log => log.loggedSets > 0),
  };
  const milestones = [recorded.goals, recorded.plan, recorded.assignments, recorded.workout];
  const firstMissing = milestones.findIndex(done => !done);
  const complete = firstMissing === -1 ? milestones.length : firstMissing;
  const next = !recorded.goals ? "Goals" : !recorded.plan || !recorded.assignments ? "My Plan" : !recorded.workout ? "Sessions" : "Progress";
  return { recorded, completion: complete * 25, next };
}

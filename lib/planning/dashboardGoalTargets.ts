import { readEligibleGoals } from "./goals";
import { goalNumber } from "./goalNumbers";
import { activityTimestamp } from "./dates";
import { statsExerciseMetrics, statsHistoryIncludes } from "./statsEvidence";

export type DashboardGoalTargets = { sessions: number | null; sets: number | null };
export const EMPTY_DASHBOARD_GOAL_TARGETS: DashboardGoalTargets = { sessions: null, sets: null };
/** Only saved, validated Goals establish weekly targets. Profile aliases and preview defaults do not. */
export function readDashboardGoalTargets(now = new Date()): DashboardGoalTargets {
  const goals = readEligibleGoals(now);
  return goals ? { sessions: goalNumber(goals.targetWeeklySessions), sets: goalNumber(goals.targetWeeklySets) } : EMPTY_DASHBOARD_GOAL_TARGETS;
}
export function dashboardSessionGoalLabels(completed: number, target: number | null) {
  const available = target !== null && Number.isInteger(target) && target >= 1 && target <= 7;
  const progress = available ? Math.min(100, Math.max(0, completed / target * 100)) : 0;
  return { available, progress, remaining: available ? Math.max(0, target - completed) : null,
    count: available ? `${completed}/${target}` : `${completed} logged`,
    description: available ? `${completed} of ${target} saved weekly session goal completed` : `${completed} sessions completed this week. Set weekly goals on Goals.`,
    status: available ? completed >= target ? "Weekly goal complete" : "Saved weekly session goal" : "Set weekly goals" };
}
export function dashboardRecordedWeeklySets(records: readonly unknown[], now = new Date()) {
  return records.reduce<number>((sum, value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return sum;
    const record = value as Record<string, unknown>;
    if (!statsHistoryIncludes(activityTimestamp(record.date), "This week", now)) return sum;
    const sets = statsExerciseMetrics(record)?.sets ?? 0;
    return Number.isSafeInteger(sum + sets) ? sum + sets : sum;
  }, 0);
}
export const dashboardGoalTargetsSnapshot = () => JSON.stringify(readDashboardGoalTargets());
export const serverDashboardGoalTargets = () => JSON.stringify(EMPTY_DASHBOARD_GOAL_TARGETS);

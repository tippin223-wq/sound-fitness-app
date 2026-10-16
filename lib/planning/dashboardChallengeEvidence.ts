import type { DashboardPlanEvidence } from "./dashboardPlanEvidence";
import type { DashboardGoalTargets } from "./dashboardGoalTargets";
import type { DashboardSessionEvidence } from "./dashboardSessionEvidence";

export type RecordedChallenge = { label: string; progress: number | null; detail: string; reward: string };
/** Descriptive saved targets only; no challenge enrollment, payout, or clinical outcome is inferred. */
export function dashboardChallengeEvidence(category: string, goals: DashboardGoalTargets, sessions: Pick<DashboardSessionEvidence, "weekly" | "issue">, plan: DashboardPlanEvidence): RecordedChallenge[] {
  if (category !== "consistency") return [{ label: "Category challenges", progress: null, detail: "Not tracked. Challenge enrollment and completion rules are unavailable.", reward: "Rewards unavailable" }];
  const validWeekly = !sessions.issue && Number.isSafeInteger(sessions.weekly) && sessions.weekly >= 0
    && goals.sessions !== null && Number.isInteger(goals.sessions) && goals.sessions >= 1 && goals.sessions <= 7;
  const validPlan = !plan.issue && Boolean(plan.title) && Number.isSafeInteger(plan.target) && plan.target > 0
    && Number.isSafeInteger(plan.completed) && plan.completed >= 0 && plan.completed <= plan.target;
  return [
    { label: "Saved weekly session goal", progress: validWeekly ? Math.min(100, sessions.weekly / goals.sessions! * 100) : null,
      detail: sessions.issue || (validWeekly ? sessions.weekly + " of " + goals.sessions + " sessions recorded this week" : "Save a weekly session target on Goals"), reward: "Rewards unavailable" },
    { label: "Active plan assignments", progress: validPlan ? plan.completed / plan.target * 100 : null,
      detail: plan.issue || (validPlan ? plan.completed + " of " + plan.target + " assignments completed in " + plan.title : "No active plan assignments"), reward: "Rewards unavailable" },
  ];
}

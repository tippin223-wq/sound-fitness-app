import type { AchievementBadgeItem } from "@/components/dashboard/SoundAchievementBadgeRow";
import { ROUTES } from "@/lib/routes";
import { readEligibleGoals } from "./goals";
import { readDashboardPlanEvidence } from "./dashboardPlanEvidence";
import { readDashboardSessionEvidence } from "./dashboardSessionEvidence";

/** Observed actions, not awarded points, health outcomes, or predicted completion dates. */
export function achievementMilestones(input: { goals: boolean; plan: boolean; planIssue: string; workouts: number; historyIssue: string }): AchievementBadgeItem[] {
  const rows = [
    { label: "Goals saved", icon: "🎯", href: ROUTES.dashboard.goals, recorded: input.goals, issue: "", meta: "Validated training direction and weekly targets" },
    { label: "Plan activated", icon: "📅", href: ROUTES.dashboard.myPlan, recorded: input.plan, issue: input.planIssue, meta: "Current active plan" },
    { label: "First workout recorded", icon: "🏋️", href: ROUTES.dashboard.sessionHistory, recorded: Number.isSafeInteger(input.workouts) && input.workouts > 0, issue: input.historyIssue, meta: "Completed workout with recorded sets" },
  ];
  return rows.map(row => ({ category: "consistency", label: row.label, icon: row.icon, href: row.href,
    meta: row.issue || row.meta, progress: !row.issue && row.recorded ? 100 : 0,
    status: !row.issue && row.recorded ? "completed" : "default",
    statusLabel: row.issue ? "Review records" : row.recorded ? "Recorded" : "Not yet recorded",
    description: "Based on current saved records. This milestone does not award points or certify a health outcome.",
  }));
}
export function readAchievementMilestones(now = new Date()) {
  const plan = readDashboardPlanEvidence(now), sessions = readDashboardSessionEvidence(now);
  return achievementMilestones({ goals: Boolean(readEligibleGoals(now)), plan: Boolean(plan.title), planIssue: plan.issue, workouts: sessions.total, historyIssue: sessions.issue });
}
export const achievementEvidenceSnapshot = () => JSON.stringify(readAchievementMilestones());
export const serverAchievementEvidence = () => JSON.stringify(achievementMilestones({ goals: false, plan: false, planIssue: "", workouts: 0, historyIssue: "" }));

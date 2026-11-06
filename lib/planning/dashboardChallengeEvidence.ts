import type { DashboardPlanEvidence } from "./dashboardPlanEvidence";
import type { DashboardGoalTargets } from "./dashboardGoalTargets";
import type { DashboardSessionEvidence } from "./dashboardSessionEvidence";
import type { DashboardHealthEvidence } from "./dashboardHealthEvidence";

export type RecordedChallenge = { label: string; progress: number | null; detail: string; reward: string; valueLabel?: string; sourceLabel?: string; href?: string };
/** Descriptive saved targets only; no challenge enrollment, payout, or clinical outcome is inferred. */
export function dashboardChallengeEvidence(category: string, goals: DashboardGoalTargets, sessions: Pick<DashboardSessionEvidence, "weekly" | "issue">, plan: DashboardPlanEvidence,
  activity?: { health: DashboardHealthEvidence; scheduled: readonly { lane: string }[] }): RecordedChallenge[] {
  if (activity && ["strength", "cardio", "performance"].includes(category)) {
    const count = activity.scheduled.filter(event => event.lane === category).length;
    return [{ label: "Saved calendar events", valueLabel: `${count} planned`, progress: null,
      detail: "Saved events in your selected calendar week. Planned events are not completed workouts.", sourceLabel: "Training calendar", href: "/dashboard/calendar", reward: "Rewards unavailable" }];
  }
  if (activity && category === "nutrition") return activity.health.nutritionRows.map(row => ({
    label: `${row.label} logging`, valueLabel: activity.health.nutritionIssue ? "Review records" : `${row.days}/7 days`, progress: null,
    detail: activity.health.nutritionIssue || "Days with saved entries in the last seven days. Logging coverage is not target adherence.",
    sourceLabel: row.label === "Hydration" ? "Water log" : "Meal log", href: row.label === "Hydration" ? "/nutrition/hydration" : "/nutrition/meals", reward: "Rewards unavailable",
  }));
  if (activity && category === "recovery") return [{ label: "Saved weekly check-ins", progress: null,
    valueLabel: activity.health.recoveryIssue ? "Review records" : `${activity.health.recoveryRows.length} recorded`,
    detail: activity.health.recoveryIssue || "Check-ins saved in the last seven days. Your ratings stay self-reported.",
    sourceLabel: "Weekly check-in", href: "/dashboard/progress/check-in", reward: "Rewards unavailable" }];
  if (category !== "consistency") return [{ label: "Category challenges", progress: null, detail: "Not tracked. Challenge enrollment and completion rules are unavailable.", reward: "Rewards unavailable" }];
  const validWeekly = !sessions.issue && Number.isSafeInteger(sessions.weekly) && sessions.weekly >= 0
    && goals.sessions !== null && Number.isInteger(goals.sessions) && goals.sessions >= 1 && goals.sessions <= 7;
  const validPlan = !plan.issue && Boolean(plan.title) && Number.isSafeInteger(plan.target) && plan.target > 0
    && Number.isSafeInteger(plan.completed) && plan.completed >= 0 && plan.completed <= plan.target;
  const emptyPlan = !plan.issue && !plan.title && plan.target === 0 && plan.completed === 0;
  return [
    { label: "Saved weekly session goal", progress: validWeekly ? Math.min(100, sessions.weekly / goals.sessions! * 100) : null,
      valueLabel: sessions.issue || !Number.isSafeInteger(sessions.weekly) || sessions.weekly < 0 ? "Review records" : `${sessions.weekly} recorded`, sourceLabel: "Workout history", href: "/dashboard/sessions/history",
      detail: sessions.issue || (validWeekly ? sessions.weekly + " of " + goals.sessions + " sessions recorded this week" : "Save a weekly session target on Goals"), reward: "Rewards unavailable" },
    { label: "Active plan assignments", progress: validPlan ? plan.completed / plan.target * 100 : null,
      valueLabel: validPlan ? `${plan.completed}/${plan.target} done` : emptyPlan ? "0 active" : "Review records", sourceLabel: "My Plan", href: "/dashboard/my-plan",
      detail: plan.issue || (validPlan ? plan.completed + " of " + plan.target + " assignments completed in " + plan.title : "No active plan assignments"), reward: "Rewards unavailable" },
  ];
}

import { planningSnapshot } from "./store";
import { readEligibleGoals } from "./goals";
import { readStatsJourneyFoundations } from "./statsSource";
import { trainingJourneyState } from "./trainingJourney";
import { planGoalsNeedReview, inspectWorkoutPlans, planWorkoutTemplateChoices } from "@/lib/localData/workoutPlanData";
import type { PlanningLog } from "./logs";
import { sessionReportLogs } from "./sessionReporting";

/** Only current-account, reviewed planning records establish Sessions milestones. */
export function sessionJourneyEvidence(snapshot: Record<string, unknown>, templates: unknown, logs: readonly PlanningLog[], now = new Date()) {
  const current = snapshot === planningSnapshot();
  const planSource = current ? inspectWorkoutPlans() : { plans: [], issue: "" };
  const plans = planSource.plans;
  const goals = current ? readEligibleGoals(now) : null;
  const reviewed = goals ? plans.filter(plan => !planGoalsNeedReview(plan)) : [];
  const completed = current ? sessionReportLogs(logs, now) : [];
  const flow = trainingJourneyState({ goals: goals || {}, plans: reviewed, logs: completed }, now);
  const foundations = current ? readStatsJourneyFoundations(now) : { profile: 0, goals: 0 };
  const eligibleTemplates = current && Array.isArray(templates) ? planWorkoutTemplateChoices(templates) : [];
  const hasTemplates = eligibleTemplates.length > 0;
  const templateReviewCount = current && Array.isArray(templates) ? templates.length - eligibleTemplates.length : 0;
  return {
    overall: flow.completion,
    foundation: Math.round((foundations.profile + foundations.goals) / 2),
    goalsSaved: Boolean(goals),
    plan: flow.recorded.plan,
    planIssue: planSource.issue,
    assignments: flow.recorded.assignments,
    templates: Boolean(hasTemplates),
    templateReviewCount,
    library: Boolean(hasTemplates) || completed.some(log => log.entries.length > 0),
    history: completed.length > 0,
    next: flow.next,
  };
}

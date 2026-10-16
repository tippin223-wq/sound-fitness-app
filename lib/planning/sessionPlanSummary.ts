import { getActiveWorkoutPlan, planGoalsNeedReview } from "@/lib/localData/workoutPlanData";
import { planningKeys, planningSnapshot } from "./store";
import { validatePlanningImport } from "./importValidation";
import { readPlanProfileSnapshot } from "./planProfileSummary";

/** Sessions displays canonical saved planning evidence; selecting a view cannot create a plan. */
export function readSessionPlanSummary() {
  const snapshot = planningSnapshot();
  const profile = readPlanProfileSnapshot();
  const original = snapshot[planningKeys.plans];
  const selection = snapshot[planningKeys.active];
  const invalid = Object.hasOwn(snapshot, planningKeys.plans) && (original == null || Boolean(validatePlanningImport({ [planningKeys.plans]: original }))) || selection != null && typeof selection !== "string";
  const plan = invalid ? null : getActiveWorkoutPlan();
  const settings = plan?.settings && typeof plan.settings === "object" && !Array.isArray(plan.settings) ? plan.settings : null;
  const text = (value: unknown, fallback: string) => typeof value === "string" && value.trim() ? value.trim() : fallback;
  const review = Boolean(plan && planGoalsNeedReview(plan));
  const modes: Record<string, string> = { coach: "Saved coach plan", custom: "Saved custom plan", hybrid: "Saved hybrid plan" };
  return {
    title: invalid ? "Review saved plans" : plan?.title || "No active plan yet",
    type: plan ? Object.hasOwn(modes, plan.mode) ? modes[plan.mode] : "Saved plan" : "Select an active week in My Plan",
    phase: text(settings?.phase, "Phase not recorded"),
    goal: profile.activeGoal,
    split: text(settings?.split, "Plan split not recorded"),
    weeklyTarget: profile.sessionsTarget,
    primaryFocus: profile.activeGoal,
    secondaryFocus: text(settings?.secondaryFocus, "Secondary focus not recorded"),
    recovery: profile.recoveryWarnings,
    rule: text(settings?.progression, "Progression not recorded in this plan"),
    note: invalid ? "Saved planning records need review in My Plan. Originals remain saved." : review ? "Goals have changed since this plan was reviewed. Open My Plan to review the saved week against your current Goals." : text(settings?.notes, plan ? "Open My Plan to review the saved week and assignments." : "Save Goals, then create and activate a week in My Plan."),
    workouts: plan?.days.flatMap(day => day.assignments.map(assignment => `${text(day.dayOfWeek, day.date)}: ${assignment.templateTitle}`)) || [],
    needsGoalReview: review,
  };
}

import { ROUTES } from "@/lib/routes";
import { normalizeGoals, savedGoalsIssue, type GoalState } from "./goals";
import type { DashboardPlanEvidence } from "./dashboardPlanEvidence";

export function dashboardGoalSetup(value: unknown, now = new Date()) {
  if (!value || typeof value !== "object" || Array.isArray(value) || savedGoalsIssue(value as Partial<GoalState>, now))
    return { completion: 0, focus: "", label: "Save Goals" };
  return { completion: 100, focus: normalizeGoals(value as Partial<GoalState>).primaryGoal || "", label: "Goals saved" };
}
type TimelineItem = { dateLabel: string; detail: string; href: string; icon: string; metric: string; status: string; title: string; tone: "amber" | "cyan" | "sky" | "emerald" };
/** A setup action is not a scheduled appointment. Only saved plan/booking evidence supplies dates. */
export function dashboardJourneyTimeline(input: { goalsReady: boolean; plan: DashboardPlanEvidence; active: { title: string; count: number } | null; templateCount: number; completed: number }) {
  const { goalsReady, plan, active, templateCount, completed } = input;
  const progress = plan.issue || !plan.target ? 0 : Math.max(0, Math.min(100, plan.completed / plan.target * 100));
  const progressLabel = plan.issue || (plan.target ? `${Math.round(progress)}% assigned workouts completed` : "No active assignments");
  const rows: TimelineItem[] = [
    { dateLabel: goalsReady ? "Saved" : "Not scheduled", detail: "Saved goal direction and weekly targets; setup status does not measure fitness outcomes.", href: ROUTES.dashboard.goals, icon: "goals", metric: goalsReady ? "Goals saved" : "Save Goals", status: goalsReady ? "Saved" : "Setup", title: "Define the goal", tone: "amber" },
    { dateLabel: "Not scheduled", detail: templateCount ? "Reusable templates are available; they are not scheduled workouts." : "Create a reusable workout template after saving Goals.", href: ROUTES.workoutBuilder.home, icon: "builder", metric: `${templateCount} saved`, status: templateCount ? "Available" : "Setup", title: "Build a workout", tone: "cyan" },
    { dateLabel: !plan.issue && plan.next ? `${plan.next.date}${plan.next.time ? ` ${plan.next.time}` : ""}` : plan.title ? "Saved plan" : "Not scheduled", detail: plan.issue || (!plan.issue && plan.next ? `Saved ${plan.next.source === "booking" ? "website booking" : "plan assignment"}.` : "Assign workouts to dated plan days to establish a schedule."), href: !plan.issue && plan.next?.source === "booking" ? ROUTES.dashboard.sessionBooking : ROUTES.dashboard.myPlan, icon: "plan", metric: plan.target ? `${plan.completed}/${plan.target} assignments` : "Plan", status: plan.issue ? "Review" : plan.next ? "Scheduled" : plan.title ? "Saved" : "Setup", title: !plan.issue && plan.next ? plan.next.title : plan.title || "Make the plan", tone: "sky" },
    { dateLabel: active ? "In progress" : "Not scheduled", detail: active ? `${active.count} exercises in the saved active session.` : `${completed} saved workout completions. Start a workout when ready.`, href: ROUTES.dashboard.sessionWorkout, icon: "workout", metric: active ? "Resume" : `${completed} completed`, status: active ? "In progress" : "Action", title: active ? active.title : "Start a session", tone: "emerald" },
  ];
  return { progress, progressLabel, rows };
}

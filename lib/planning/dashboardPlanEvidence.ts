import { getActiveWorkoutPlan } from "@/lib/localData/workoutPlanData";
import { planningKeys, planningSnapshot, subscribePlanning } from "./store";
import { validatePlanningImport } from "./importValidation";
import { readAvailableWorkoutLogs, readWorkoutCompletionEvidence } from "./logs";
import { captureWorkoutHistoryRecovery } from "./workoutHistoryRecovery";
import { localDate, validDateOnly } from "./dates";
import { assignmentStatusFromRecords } from "./planCompletionEvidence";
import { bookedCalendarItems } from "./bookings";

export type DashboardPlanEvidence = {
  target: number; completed: number; progress: number; title: string; issue: string;
  next: { date: string; time: string; title: string; source: "plan" | "booking" } | null;
};
export const EMPTY_DASHBOARD_PLAN_EVIDENCE: DashboardPlanEvidence = { target: 0, completed: 0, progress: 0, title: "", issue: "", next: null };
export const serverDashboardPlanEvidence = () => JSON.stringify(EMPTY_DASHBOARD_PLAN_EVIDENCE);

/** Assignments are targets; only an exact linked completion can fill a target. No cadence inference. */
export function readDashboardPlanEvidence(now = new Date()): DashboardPlanEvidence {
  const snapshot = planningSnapshot();
  const plans = snapshot[planningKeys.plans] ?? [];
  const selection = snapshot[planningKeys.active];
  const invalid = Object.hasOwn(snapshot, planningKeys.plans) && snapshot[planningKeys.plans] == null
    || !Array.isArray(plans) || Boolean(validatePlanningImport({ [planningKeys.plans]: plans }))
    || selection != null && typeof selection !== "string";
  if (invalid) return { ...EMPTY_DASHBOARD_PLAN_EVIDENCE, issue: "Review saved plans" };
  const active = (plans as Array<{ id: string; status?: string }>).filter(plan => plan.status === "active");
  if (active.length > 1 || Boolean(selection) !== Boolean(active.length) || active.length === 1 && active[0].id !== selection)
    return { ...EMPTY_DASHBOARD_PLAN_EVIDENCE, issue: "Review plan activation" };
  const plan = getActiveWorkoutPlan();
  const assignments = plan?.days.flatMap(day => day.assignments.map(assignment => ({ day, assignment }))) || [];
  if (captureWorkoutHistoryRecovery().issues.length) return { ...EMPTY_DASHBOARD_PLAN_EVIDENCE, title: plan?.title || "", issue: "Review workout history" };
  const logs = readAvailableWorkoutLogs();
  const records = readWorkoutCompletionEvidence();
  const done = new Set<string>();
  for (const { day, assignment } of assignments) {
    const status = assignmentStatusFromRecords(plan!.id, day.id, assignment, records, now, { allowSameSessionMirrors: true, reportedLogs: logs });
    if (status === "Needs history review") return { ...EMPTY_DASHBOARD_PLAN_EVIDENCE, title: plan!.title, issue: "Review workout assignment history" };
    if (status === "Completed") done.add(assignment.id);
  }
  const upcoming = (date: string, time: string) => validDateOnly(date) && date >= localDate(now)
    && (!time || /^([01]\d|2[0-3]):[0-5]\d$/.test(time) && new Date(`${date}T${time}:00`).getTime() >= now.getTime());
  const candidates: NonNullable<DashboardPlanEvidence["next"]>[] = [
    ...assignments.filter(({ day, assignment }) => !done.has(assignment.id) && upcoming(day.date, assignment.time || ""))
      .map(({ day, assignment }) => ({ date: day.date, time: assignment.time || "", title: assignment.templateTitle, source: "plan" as const })),
    ...bookedCalendarItems().filter(item => item.status === "Planned" && upcoming(item.date, item.time))
      .map(item => ({ date: item.date, time: item.time, title: item.title, source: "booking" as const })),
  ];
  candidates.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const target = assignments.length, completed = done.size;
  return { target, completed, progress: target ? completed / target * 100 : 0, title: plan?.title || "", issue: "", next: candidates[0] || null };
}
export const dashboardPlanEvidenceSnapshot = () => JSON.stringify(readDashboardPlanEvidence());
export function subscribeDashboardPlanEvidence(callback: () => void) {
  const unsubscribe = subscribePlanning(callback);
  const timer = setInterval(callback, 30000);
  window.addEventListener("focus", callback);
  return () => { unsubscribe(); clearInterval(timer); window.removeEventListener("focus", callback); };
}

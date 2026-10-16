import { phaseRecords } from "./phaseRecords";
import { localDate, validDateOnly } from "./dates";
import { buildProgressSummary } from "./progress";
import { normalizeGoals, normalizeGoalId, savedGoalsIssue, type GoalState } from "./goals";
import type { PlanningLog } from "./logs";
import { goalNumber } from "./goalNumbers";
import { profileRecoveryReports } from "./recommendation";

export function phaseRecoverySignals(body: unknown) {
  const { pain, soreness, sleep } = profileRecoveryReports(body);
  return {
    readinessReported: [pain, soreness, sleep].some(value => value !== null),
    hotAreas: [pain !== null && pain > 0, soreness !== null && soreness >= 5, sleep !== null && sleep < 6.5].filter(Boolean).length,
  };
}

/** Phase volume uses the same recorded workout and saved-goal evidence as Progress. */
export function phaseWeeklyVolume(logs: PlanningLog[], goals: Partial<GoalState>, now = new Date()) {
  const summary = buildProgressSummary({ logs, goals, plans: [], checkIns: [], journal: [] }, now);
  return { weeklySets: summary.weeklySets, weeklyGoal: savedGoalsIssue(goals, now) ? 0 : Number(normalizeGoals(goals).targetWeeklySets) };
}

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const positive = (value: unknown) => {
  const number = goalNumber(value);
  return number !== null && Number.isInteger(number) && number > 0 && number <= 52 ? number : 0;
};
export function phaseRecordVersion(phasesRaw: unknown, id: string): string | undefined {
  return JSON.stringify(phaseRecords(phasesRaw).find(item => item.id === id), (_key, value: unknown) =>
    value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value);

}
export function phasePlanReference(phase: { weeklyPlanId?: string; weeklyPlanSource: string }, plans: readonly { id: string; title: string; status: string }[]) {
  if (!phase.weeklyPlanId) return { status: "reference" as const, label: phase.weeklyPlanSource || "No linked weekly plan" };
  const plan = plans.find(item => item.id === phase.weeklyPlanId);
  if (!plan) return { status: "missing" as const, label: `${phase.weeklyPlanSource || "Weekly plan"} · unavailable` };
  return { status: plan.status === "archived" ? "archived" as const : "linked" as const, label: plan.title };
}
export function validatePhasePlanLink(phase: { weeklyPlanId?: string; weeklyPlanSource: string }, plans: readonly { id: string; title: string; status: string }[]) {
  const { status } = phasePlanReference(phase, plans);
  return status === "missing" ? "The linked weekly plan was removed. Choose another plan before activating this phase."
    : status === "archived" ? "Restore the linked weekly plan or choose another plan before activating this phase." : null;
}
export function validatePhaseSchedule(phase: { name: string; durationWeeks: string; volumeTarget: string; intensityTarget: string; deloadWeek: string; testingWeek: string }) {
  if (typeof phase.name !== "string" || !phase.name.trim()) return "Enter a phase name.";
  const duration = positive(phase.durationWeeks);
  if (!duration) return "Choose a phase duration from 1 to 52 weeks.";
  const volume = goalNumber(phase.volumeTarget), intensity = goalNumber(phase.intensityTarget);
  if (volume === null || !Number.isInteger(volume) || volume < 1 || volume > 500) return "Choose a weekly set target from 1 to 500.";
  if (intensity === null || intensity < 1 || intensity > 10) return "Choose an intensity target from 1 to 10.";
  for (const value of [phase.deloadWeek, phase.testingWeek]) if (!(typeof value === "string" && !value.trim()) && (!positive(value) || positive(value) > duration)) return "Deload and testing weeks must fit within the phase duration, or be left blank.";
  return null;
}
export function reviewedPhaseGoal(value: unknown) {
  const goal = normalizeGoalId(value);
  if (!goal) throw new Error("Choose a supported primary goal before saving or activating this phase.");
  return goal;
}
export function savedPhaseContext(planRaw: unknown, phasesRaw: unknown, today = new Date()) {
  const plan = record(planRaw);
  const container = record(phasesRaw);
  const phases = Array.isArray(phasesRaw) ? phasesRaw : Array.isArray(container.phases) ? container.phases : [container];
  const active = record(phases.find(value => { const phase = record(value); return phase.status === "active" || phase.status == null && phase.active === true; }));
  const phaseWeeks = positive(active.durationWeeks ?? active.weeks ?? active.totalWeeks);
  let phaseWeek = positive(active.week ?? active.currentWeek ?? active.phaseWeek);
  const startValue = active.startedAt || active.startDate;
  if (typeof startValue === "string") {
    const start = validDateOnly(startValue) ? startValue : localDate(new Date(startValue));
    if (validDateOnly(start)) {
      const ordinal = (value: string) => { const [year, month, day] = value.split("-").map(Number); return Date.UTC(year, month - 1, day) / 86400000; };
      const elapsed = ordinal(localDate(today)) - ordinal(start);
      phaseWeek = elapsed >= 0 ? Math.floor(elapsed / 7) + 1 : 0;
    }
  }
  return {
    activePhase: typeof active.name === "string" ? active.name : typeof active.title === "string" ? active.title : "No active phase",
    activePlan: typeof plan.title === "string" ? plan.title : "No active plan yet",
    phaseWeek, phaseWeeks,
    planFocus: typeof plan.goal === "string" ? plan.goal : "Save goals and activate a plan",
    deloadWeek: /deload/i.test(String(active.type || "")) || phaseWeek > 0 && phaseWeek === positive(active.deloadWeek),
    testingWeek: /testing|\btest\b|\bpr\b/i.test(String(active.type || "")) || phaseWeek > 0 && phaseWeek === positive(active.testingWeek),
  };
}

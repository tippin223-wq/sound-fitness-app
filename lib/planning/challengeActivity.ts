import type { ChallengeMetrics } from "./challengeSets";
import type { PlanningLog } from "./logs";
import { planningSnapshot, planningKeys } from "./store";
import { readStatsWorkoutLogs } from "./statsSource";
import { readDashboardSessionEvidence, projectDashboardSessions } from "./dashboardSessionEvidence";
import { sessionReportLogs } from "./sessionReporting";
import { statsExerciseClassification, statsExerciseMetrics } from "./statsEvidence";
import { MOVEMENT_PATTERNS } from "../exercise-system/patterns/coreMovementPatterns";
import { validatePlanningImport } from "./importValidation";
import { activityTimestamp, localDate } from "./dates";

const weekKey = (date: string) => {
  const day = new Date(`${date}T12:00:00`);
  day.setDate(day.getDate() - (day.getDay() + 6) % 7);
  return localDate(day);
};
/** Projections only: no completion button, enrollment writes, payouts, or scheduled-event credit. */
export function projectChallengeActivity(logs: readonly PlanningLog[], values: Readonly<Record<string, unknown>>, now = new Date(), historyIssue = ""): ChallengeMetrics {
  const result: ChallengeMetrics = {};
  const metric = (key: string, value: number, source: string, issue = "") => {
    result[key] = { value: issue || !Number.isSafeInteger(value) || value < 0 ? null : value, source, ...(issue ? { issue } : {}) };
  };
  const sessions = projectDashboardSessions(logs, now, historyIssue);
  const completed = sessions.issue ? [] : sessionReportLogs(logs, now);
  metric("training.sessions", sessions.total, "Completed workout history", sessions.issue);
  metric("training.days", sessions.dates.length, "Different recorded workout days", sessions.issue);
  metric("training.weeks", new Set(sessions.dates.map(weekKey)).size, "Different recorded workout weeks", sessions.issue);
  const strengthGroups: readonly string[] = ["upper-push", "upper-pull", "lower-body-compound", "lower-body-isolation", "arm-isolation", "core", "cervical-isolation", "integrated"];
  for (const category of ["strength", "mobility", "performance"]) {
    let count = 0, sets = 0, reps = 0;
    const days = new Set<string>();
    for (const log of completed) {
      let matched = false;
      for (const entry of log.entries) {
        const record = entry as unknown as Record<string, unknown>;
        const classification = statsExerciseClassification(record).pattern.toLowerCase();
        const pattern = MOVEMENT_PATTERNS.find(item => item.id === classification || item.label.toLowerCase() === classification);
        if (!pattern || !(category === "strength" ? strengthGroups.includes(pattern.group) : pattern.group === (category === "performance" ? "athletic" : "mobility"))) continue;
        const recorded = statsExerciseMetrics(record);
        if (!recorded || recorded.sets <= 0) continue;
        matched = true; sets += recorded.sets; reps += recorded.sets * recorded.reps;
      }
      if (matched) { count++; days.add(localDate(new Date(log.timestamp))); }
    }
    const source = "Completed workouts with recorded movement classifications";
    metric(`${category}.sessions`, count, source, sessions.issue);
    metric(`${category}.sets`, sets, source, sessions.issue);
    metric(`${category}.reps`, reps, source, sessions.issue);
    metric(`${category}.days`, days.size, source, sessions.issue);
  }
  const rows = (key: string) => {
    const raw = values[key] ?? [];
    const issue = validatePlanningImport({ [key]: raw });
    return { issue: issue ? "Review saved records" : "", rows: !issue && Array.isArray(raw) ? raw as Record<string, unknown>[] : [] };
  };
  const available = (row: Record<string, unknown>) => typeof row.date === "string" && row.date <= localDate(now)
    && ["recordedAt", "updatedAt"].every(field => activityTimestamp(row[field] as string) <= now.getTime());
  const meals = rows(planningKeys.meals), water = rows(planningKeys.hydration);
  const mealDays = new Set(meals.rows.filter(available).map(row => row.date));
  const proteinDays = new Set(meals.rows.filter(row => available(row) && typeof row.protein === "number" && row.protein > 0).map(row => row.date));
  metric("nutrition.meals", mealDays.size, "Saved meal days", meals.issue);
  metric("nutrition.protein", proteinDays.size, "Meal days with recorded protein", meals.issue);
  metric("nutrition.water", new Set(water.rows.filter(available).map(row => row.date)).size, "Saved water-log days", water.issue);
  const checks = rows("soundFitnessWeeklyCheckIns");
  const saved = checks.rows.filter(row => typeof row.weekStart === "string" && row.weekStart <= localDate(now) && activityTimestamp(row.savedAt as string) <= now.getTime());
  metric("recovery.checks", saved.length, "Saved weekly check-ins", checks.issue);
  metric("recovery.weeks", new Set(saved.map(row => row.weekStart)).size, "Different check-in weeks", checks.issue);
  metric("recovery.notes", saved.filter(row => typeof row.notes === "string" && row.notes.trim()).length, "Weekly check-ins with notes", checks.issue);
  // Cardio, lessons, and community completion do not yet have reliable receipt sources.
  // Leaving those metrics absent keeps their future milestones visibly awaiting tracking.
  return result;
}
export function readChallengeActivity() {
  return projectChallengeActivity(readStatsWorkoutLogs(), planningSnapshot(), new Date(), readDashboardSessionEvidence().issue);
}

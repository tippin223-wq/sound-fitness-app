import { planningKeys, planningSnapshot } from "./store";
import { validatePlanningImport } from "./importValidation";
import { activityTimestamp, localDate } from "./dates";
import { nutritionWeek } from "./nutritionSummary";
import type { MealEntry } from "./meals";
import type { WaterEntry } from "./hydration";
import { checkInReadiness, WEEKLY_CHECK_INS_KEY, type WeeklyCheckIn } from "./checkIns";

/** Coverage reports days with saved records, never assumes targets were met or meals were complete. */
export function readDashboardHealthEvidence(now = new Date(), values: Readonly<Record<string, unknown>> = planningSnapshot()) {
  const collection = <T,>(key: string): { rows: T[]; issue: boolean } => {
    const raw = Object.hasOwn(values, key) ? values[key] : [];
    const issue = !Array.isArray(raw) || Boolean(validatePlanningImport({ [key]: raw }));
    return { rows: issue ? [] : raw as T[], issue };
  };
  const meals = collection<MealEntry>(planningKeys.meals), water = collection<WaterEntry>(planningKeys.hydration), checks = collection<WeeklyCheckIn>(WEEKLY_CHECK_INS_KEY);
  const available = <T extends { recordedAt: string; updatedAt: string }>(rows: T[]) => rows.filter(row => activityTimestamp(row.recordedAt) <= now.getTime() && activityTimestamp(row.updatedAt) <= now.getTime());
  const days = nutritionWeek(available(meals.rows), available(water.rows), localDate(now));
  const nutritionIssue = meals.issue || water.issue ? "Review nutrition records" : "";
  const nutritionDays = nutritionIssue ? 0 : days.filter(day => day.mealCount > 0 || day.waterCount > 0).length;
  const nutritionRows = [
    { label: "Protein", days: days.filter(day => day.nutrients.protein.reported > 0).length },
    { label: "Hydration", days: days.filter(day => day.waterCount > 0).length },
    { label: "Meals", days: days.filter(day => day.mealCount > 0).length },
  ].map(row => ({ ...row, days: nutritionIssue ? 0 : row.days, value: nutritionIssue ? 0 : row.days / 7 * 100, target: 100 }));
  const firstDay = days[0].date;
  const recordedChecks = checks.rows.filter(row => row.weekStart <= localDate(now) && activityTimestamp(row.savedAt) <= now.getTime()
    && localDate(new Date(row.savedAt)) >= firstDay).sort((a, b) => activityTimestamp(a.savedAt) - activityTimestamp(b.savedAt));
  const recoveryRows = recordedChecks.map(row => ({ label: localDate(new Date(row.savedAt)), value: (checkInReadiness(row) ?? 0) * 10 }));
  const recoveryPercent = recoveryRows.length ? recoveryRows.reduce((sum, row) => sum + row.value, 0) / recoveryRows.length : 0;
  const calorieDays = days.filter(day => day.nutrients.calories.reported > 0);
  const waterDays = days.filter(day => day.waterCount > 0);
  const latest = recordedChecks.at(-1);
  return {
    reportedCalories: nutritionIssue || !calorieDays.length ? null : calorieDays.reduce((sum, day) => sum + (day.nutrients.calories.value ?? 0), 0),
    calorieDays: nutritionIssue ? 0 : calorieDays.length,
    recordedWaterMl: nutritionIssue || !waterDays.length ? null : waterDays.reduce((sum, day) => sum + (day.waterMl ?? 0), 0),
    waterDays: nutritionIssue ? 0 : waterDays.length,
    latestCheckIn: latest ? { date: localDate(new Date(latest.savedAt)), sleep: latest.sleep, stress: latest.stress, soreness: latest.soreness } : null,
    nutritionIssue, nutritionDays, nutritionRows, nutritionPercent: nutritionDays / 7 * 100,
    nutritionLabel: nutritionIssue || (nutritionDays ? `${nutritionDays}/7 days recorded` : "No nutrition records"),
    recoveryIssue: checks.issue ? "Review saved check-ins" : "", recoveryRows, recoveryPercent,
    recoveryLabel: checks.issue ? "Review saved check-ins" : recoveryRows.length ? `${Number((recoveryPercent / 10).toFixed(1))}/10 self-report` : "No saved check-in",
  };
}
export type DashboardHealthEvidence = ReturnType<typeof readDashboardHealthEvidence>;
export const dashboardHealthEvidenceSnapshot = () => JSON.stringify(readDashboardHealthEvidence());
export const serverDashboardHealthEvidence = () => JSON.stringify(readDashboardHealthEvidence(new Date(2000, 0, 1), {}));

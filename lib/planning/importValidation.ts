import { validExerciseSemanticMetadata } from "./exerciseSemanticMetadata";
import { validWorkoutTargets } from "./workoutTargets";
import { validDateOnly, activityTimestamp, localDate } from "./dates";
import { validMealDraft, validMealEntry } from "./mealValidation";
import { validMealTemplate } from "./mealTemplateValidation";

const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const text = (value: unknown) => typeof value === "string" && Boolean(value.trim());
const optionalText = (item: Record<string, unknown>, keys: string[]) => keys.every(key => item[key] == null || typeof item[key] === "string");
const objects = (value: unknown): value is Record<string, unknown>[] => Array.isArray(value) && value.every(record);
const exercises = (value: unknown) => objects(value) && value.every(item => text(item.id) && text(item.name) && optionalText(item, ["body", "pattern", "goal", "equipment"]) && validExerciseSemanticMetadata(item) && validWorkoutTargets(item.workoutTargets));
const uniqueIds = (items: Record<string, unknown>[]) => new Set(items.map(item => item.id)).size === items.length;
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const oneOf = (value: unknown, allowed: readonly string[]) => typeof value === "string" && allowed.includes(value);
function consistentPlanCalendar(plan: Record<string, unknown>, days: Record<string, unknown>[]) {
  const start = new Date(`${plan.weekStartDate}T12:00:00`);
  const end = new Date(start); end.setDate(end.getDate() + 6);
  if (start.getDay() !== 1 || days.length > 7 || new Set(days.map(day => day.date)).size !== days.length) return false;
  if (plan.status != null && !oneOf(plan.status, ["draft", "active", "archived"])) return false;
  if (plan.mode != null && !oneOf(plan.mode, ["custom", "coach", "hybrid"])) return false;
  return days.every(day => {
    const date = String(day.date);
    if (date < String(plan.weekStartDate) || date > localDate(end)) return false;
    if (day.dayOfWeek != null && day.dayOfWeek !== dayNames[new Date(`${date}T12:00:00`).getDay()]) return false;
    if (day.kind != null && !oneOf(day.kind, ["training", "rest"])) return false;
    const assignments = day.assignments as Record<string, unknown>[];
    if (day.kind === "rest" && assignments.length) return false;
    return assignments.every(item =>
      (item.time == null || item.time === "" || typeof item.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(item.time))
      && (item.setsPerExercise == null || Number.isInteger(item.setsPerExercise) && Number(item.setsPerExercise) >= 1 && Number(item.setsPerExercise) <= 20)
      && (item.templateExerciseCount == null || Number.isSafeInteger(item.templateExerciseCount) && Number(item.templateExerciseCount) >= 0 && Number(item.templateExerciseCount) <= 2147483647));
  });
}

/** Validate imported structures before they reach typed consumers; never repair originals silently. */
export function validatePlanningImport(values: Record<string, unknown>): string | null {
  for (const [key, value] of Object.entries(values)) {
    if (value == null) continue;
    let valid = true;
    if (["soundFitnessNutritionLibrary", "soundFitnessRecoveryLibrary", "soundFitnessMobilityLibrary", "soundFitnessPerformanceLibrary"].includes(key)) valid = record(value) && ["favorites", "recent"].every(field => Array.isArray(value[field]) && value[field].every(item => typeof item === "string"));
    else if (["soundFitnessNutritionPlan", "soundFitnessRecoveryPlan", "soundFitnessMobilityPlan", "soundFitnessPerformancePlan"].includes(key)) {
      const items = Array.isArray(value) ? value : record(value) ? value.items : null;
      valid = objects(items) && uniqueIds(items) && items.every(item => text(item.id) && text(item.title));
    }
    else if (key === "soundFitnessMealDraft") valid = validMealDraft(value);
    else if (key === "soundFitnessMealTemplates") valid = objects(value) && value.length <= 100 && uniqueIds(value) && value.every(validMealTemplate);
    else if (key === "soundFitnessMealEntries") valid = objects(value) && uniqueIds(value) && value.every(validMealEntry);
    else if (key === "soundFitnessHydrationDraft") valid = record(value) && text(value.id)
      && typeof value.date === "string" && (value.date === "" || validDateOnly(value.date))
      && typeof value.amount === "string" && value.amount.length <= 50 && oneOf(value.unit, ["ml", "us-fl-oz"])
      && typeof value.notes === "string" && value.notes.length <= 1000
      && (value.baseVersion === null || typeof value.baseVersion === "string" && value.baseVersion.length <= 10000);
    else if (key === "soundFitnessHydrationEntries") valid = objects(value) && uniqueIds(value) && value.every(item => text(item.id)
      && typeof item.date === "string" && validDateOnly(item.date)
      && oneOf(item.unit, ["ml", "us-fl-oz"]) && typeof item.amount === "number" && Number.isFinite(item.amount)
      && item.amount * (item.unit === "us-fl-oz" ? 29.5735295625 : 1) >= 1 && item.amount * (item.unit === "us-fl-oz" ? 29.5735295625 : 1) <= 10000
      && typeof item.notes === "string" && item.notes.length <= 1000
      && ["recordedAt", "updatedAt"].every(field => typeof item[field] === "string" && Number.isFinite(activityTimestamp(item[field]))));
    else if (key === "soundFitnessFavorites") valid = Array.isArray(value) && value.every(item => typeof item === "string");
    else if (["soundFitnessGoals", "soundFitnessProfile", "legacyPlan"].includes(key)) valid = record(value);
    else if (key === "soundFitnessActiveWorkoutPlanId") valid = typeof value === "string";
    else if (key === "soundFitnessWorkoutBuilderSavedTemplates") {
      valid = objects(value) && uniqueIds(value) && value.every(item => text(item.id) && text(item.title) && exercises(item.exercises)
        && optionalText(item, ["createdAt", "updatedAt", "syncKey", "syncError"])
        && (item.syncPending == null || typeof item.syncPending === "boolean")
        && (item.cloudRevision == null || Number.isSafeInteger(item.cloudRevision) && Number(item.cloudRevision) >= 0));
    } else if (key === "soundFitnessWorkoutBuilderSelectedExercises") valid = exercises(value);
    else if (key === "soundFitnessWorkoutPlans") {
      valid = objects(value) && uniqueIds(value) && value.every(plan => text(plan.id) && text(plan.title) && typeof plan.weekStartDate === "string" && validDateOnly(plan.weekStartDate)
        && optionalText(plan, ["goalsVersion", "goal"])
        && (plan.settings == null || record(plan.settings) && optionalText(plan.settings, ["createdBy", "split", "weeklyTarget", "primaryFocus", "secondaryFocus", "progression", "phase", "notes"]))
        && objects(plan.days) && uniqueIds(plan.days) && plan.days.every(day => text(day.id) && typeof day.date === "string" && validDateOnly(day.date) && optionalText(day, ["title", "focus", "notes"])
          && objects(day.assignments) && uniqueIds(day.assignments) && day.assignments.every(item => text(item.id) && text(item.templateTitle)
            && optionalText(item, ["templateId", "templateContentVersion", "focus", "notes", "time"]))));
      if (valid && objects(value)) {
        const plans = value as Array<Record<string, unknown> & { days: Array<{ assignments: Record<string, unknown>[] }> }>;
        valid = plans.every(plan => consistentPlanCalendar(plan, plan.days))
          && uniqueIds(plans.flatMap(plan => plan.days))
          && uniqueIds(plans.flatMap(plan => plan.days.flatMap(day => day.assignments)));
        const occupiedWeeks = plans.filter(plan => plan.status !== "archived").map(plan => plan.weekStartDate);
        valid = valid && new Set(occupiedWeeks).size === occupiedWeeks.length;
      }
    } else if (key === "soundFitnessPlanningLogs") {
      valid = objects(value) && uniqueIds(value) && value.every(log => text(log.id) && text(log.title) && Number.isFinite(activityTimestamp(log.completedAt))
        && objects(log.entries) && log.entries.every(item => text(item.exerciseId) && text(item.exerciseName) && optionalText(item, ["date", "source"])));
    } else if (key === "soundFitnessExerciseStats") valid = objects(value) && value.every(item => text(item.exerciseId) && text(item.exerciseName) && typeof item.date === "string" && Number.isFinite(activityTimestamp(item.date)));
    else if (["soundFitnessPlanningCalendar", "soundFitnessDashboardCalendarEntries", "soundFitnessCustomExercises"].includes(key)) valid = objects(value);
    else if (key === "soundFitnessPhases") valid = objects(value) || record(value) && (value.phases == null || objects(value.phases));
    else if (key === "soundFitnessWeeklyCheckIns") valid = objects(value) && uniqueIds(value)
      && new Set(value.map(item => item.weekStart)).size === value.length
      && value.every(item => text(item.id) && typeof item.weekStart === "string" && validDateOnly(item.weekStart)
        && typeof item.savedAt === "string" && Number.isFinite(activityTimestamp(item.savedAt))
        && ["energy", "sleep", "stress", "soreness"].every(field => Number.isInteger(item[field]) && Number(item[field]) >= 1 && Number(item[field]) <= 10)
        && Array.isArray(item.habits) && item.habits.every(habit => typeof habit === "string") && typeof item.notes === "string" && item.notes.length <= 4000);
    else if (key === "soundFitnessWeeklyCheckInDrafts") valid = record(value) && Object.entries(value).every(([week, draft]) => validDateOnly(week) && record(draft) && draft.weekStart === week
      && (draft.baseVersion === null || typeof draft.baseVersion === "string" && draft.baseVersion.length <= 10000)
      && ["energy", "sleep", "stress", "soreness"].every(field => draft[field] === null || Number.isInteger(draft[field]) && Number(draft[field]) >= 1 && Number(draft[field]) <= 10)
      && Array.isArray(draft.habits) && draft.habits.every(habit => typeof habit === "string") && typeof draft.notes === "string" && draft.notes.length <= 4000);
    else if (key === "soundFitnessJournalEntries") valid = objects(value) && uniqueIds(value) && value.every(item => text(item.id) && text(item.text) && String(item.text).length <= 10000 && typeof item.createdAt === "string" && Number.isFinite(activityTimestamp(item.createdAt)));
    else if (key === "soundFitnessJournalDraft") valid = record(value) && text(value.id) && typeof value.text === "string" && value.text.length <= 10000;
    else if (key === "soundFitnessHabits") valid = objects(value) && uniqueIds(value) && value.every(item => text(item.id) && text(item.title) && String(item.title).length <= 80 && typeof item.createdOn === "string" && validDateOnly(item.createdOn) && typeof item.archived === "boolean");
    else if (key === "soundFitnessHabitDays") valid = objects(value) && new Set(value.map(item => `${item.habitId}:${item.date}`)).size === value.length && value.every(item => text(item.habitId) && typeof item.date === "string" && validDateOnly(item.date) && typeof item.done === "boolean" && typeof item.updatedAt === "string" && Number.isFinite(activityTimestamp(item.updatedAt)));
    else if (key === "soundFitnessPainDraft") valid = record(value) && text(value.id)
      && (value.level === null || Number.isInteger(value.level) && Number(value.level) >= 0 && Number(value.level) <= 10)
      && typeof value.area === "string" && value.area.length <= 80 && typeof value.notes === "string" && value.notes.length <= 4000;
    else if (key === "soundFitnessPainLogs") valid = objects(value) && uniqueIds(value) && value.every(item => text(item.id)
      && Number.isInteger(item.level) && Number(item.level) >= 0 && Number(item.level) <= 10
      && text(item.area) && String(item.area).length <= 80 && typeof item.notes === "string" && item.notes.length <= 4000
      && typeof item.recordedAt === "string" && Number.isFinite(activityTimestamp(item.recordedAt)));
    if (!valid) return `Older browser data in ${key} has an unsupported structure. Nothing was imported; the original browser data is preserved.`;
  }
  return null;
}

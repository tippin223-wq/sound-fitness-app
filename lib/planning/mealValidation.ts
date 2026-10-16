import { validDateOnly, activityTimestamp } from "./dates";

export const nutrientFields = ["calories", "protein", "carbs", "fat"] as const;
export type Nutrient = typeof nutrientFields[number];
export const mealKinds = ["", "Breakfast", "Lunch", "Dinner", "Snack", "Other"] as const;
export type MealKind = typeof mealKinds[number];
type MealFields = { id: string; date: string; time: string; title: string; kind: MealKind; notes: string };
export type MealInput = MealFields & Record<Nutrient, number | null>;
export type MealEntry = MealInput & { recordedAt: string; updatedAt: string };
export type MealDraft = MealFields & Record<Nutrient, string> & { baseVersion: string | null };
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
export const validMealTime = (value: unknown) => typeof value === "string" && (value === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(value));
function validFields(value: Record<string, unknown>, draft: boolean) {
  return typeof value.id === "string" && Boolean(value.id.trim()) && typeof value.date === "string" && (draft && value.date === "" || validDateOnly(value.date))
    && validMealTime(value.time) && typeof value.title === "string" && value.title.length <= 120 && (draft || Boolean(value.title.trim()))
    && mealKinds.includes(value.kind as MealKind) && typeof value.notes === "string" && value.notes.length <= 2000;
}
export function validMealDraft(value: unknown): value is MealDraft {
  return record(value) && validFields(value, true) && nutrientFields.every(field => typeof value[field] === "string" && value[field].length <= 50)
    && (value.baseVersion === null || typeof value.baseVersion === "string" && value.baseVersion.length <= 10000);
}
export function validMealInput(value: unknown): value is MealInput {
  return record(value) && validFields(value, false) && nutrientFields.every(field => value[field] === null || typeof value[field] === "number" && Number.isFinite(value[field]) && value[field] >= 0 && value[field] <= (field === "calories" ? 10000 : 2000));
}
export function validMealEntry(value: unknown): value is MealEntry {
  if (!record(value)) return false;
  const timestamps: Record<string, unknown> = value;
  return validMealInput(value) && ["recordedAt", "updatedAt"].every(field => typeof timestamps[field] === "string" && Number.isFinite(activityTimestamp(timestamps[field])));
}
export function validMealHistory(value: unknown): value is MealEntry[] {
  return Array.isArray(value) && value.every(validMealEntry) && new Set(value.map(meal => meal.id)).size === value.length;
}

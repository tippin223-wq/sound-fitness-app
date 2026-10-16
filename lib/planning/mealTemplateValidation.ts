import { activityTimestamp } from "./dates";
import { validMealInput, type MealInput } from "./mealValidation";

export type MealTemplate = Omit<MealInput, "date" | "time"> & { archived: boolean; createdAt: string; updatedAt: string };
export function validMealTemplate(value: unknown): value is MealTemplate {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return validMealInput({ ...item, date: "2000-01-01", time: "" }) && typeof item.archived === "boolean"
    && ["createdAt", "updatedAt"].every(key => typeof item[key] === "string" && Number.isFinite(activityTimestamp(item[key])));
}
export function validMealTemplateLibrary(value: unknown): value is MealTemplate[] {
  return Array.isArray(value) && value.length <= 100 && value.every(validMealTemplate) && new Set(value.map(item => item.id)).size === value.length;
}

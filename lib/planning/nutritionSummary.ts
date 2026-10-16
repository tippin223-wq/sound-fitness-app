import { goalNumber } from "./goalNumbers";
import { localDate, validDateOnly } from "./dates";
import { mealTotals, type MealEntry } from "./meals";
import { waterMillilitres, type WaterEntry } from "./hydration";

export function nutritionDay(meals: MealEntry[], water: WaterEntry[], date: string) {
  if (!validDateOnly(date)) throw new Error("Choose a real local date.");
  const dailyMeals = meals.filter(meal => meal.date === date);
  const dailyWater = water.filter(entry => entry.date === date);
  return { date, mealCount: dailyMeals.length, nutrients: mealTotals(dailyMeals), waterCount: dailyWater.length,
    waterMl: dailyWater.length ? dailyWater.reduce((sum, entry) => sum + waterMillilitres(entry.amount, entry.unit), 0) : null };
}
export function nutritionWeek(meals: MealEntry[], water: WaterEntry[], through: string) {
  if (!validDateOnly(through)) throw new Error("Choose a real local date.");
  const first = new Date(`${through}T12:00:00`); first.setDate(first.getDate() - 6);
  return Array.from({ length: 7 }, (_, index) => { const day = new Date(first); day.setDate(day.getDate() + index); return nutritionDay(meals, water, localDate(day)); });
}
export function nutritionTargets(goals: Record<string, unknown>) {
  const positive = (value: unknown, max: number) => {
    const number = goalNumber(value); return number !== null && number >= 1 && number <= max ? number : null;
  };
  return { proteinG: positive(goals.targetProtein, 500), waterOz: positive(goals.waterGoal, 500) };
}

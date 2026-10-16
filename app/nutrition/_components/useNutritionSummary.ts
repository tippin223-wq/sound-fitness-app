"use client";
import { useSyncExternalStore } from "react";
import { planningSnapshot, subscribePlanning } from "@/lib/planning/store";
import { inspectMealHistory } from "@/lib/planning/meals";
import { inspectWaterHistory } from "@/lib/planning/hydration";
import { nutritionDay, nutritionTargets, nutritionWeek } from "@/lib/planning/nutritionSummary";
import { readEligibleGoals } from "@/lib/planning/goals";
import { usePlanningDay } from "@/lib/planning/usePlanningDay";

export function useNutritionSummary(date?: string) {
  useSyncExternalStore(subscribePlanning, planningSnapshot, planningSnapshot);
  const today = usePlanningDay(); const selected = date || today;
  const meals = inspectMealHistory(); const water = inspectWaterHistory();
  const issues = [{ label: "Meal history", href: "/nutrition/meals/history", issue: meals.issue }, { label: "Water history", href: "/nutrition/hydration", issue: water.issue }].filter(item => item.issue);
  return { today, issues, day: selected && !issues.length ? nutritionDay(meals.meals, water.entries, selected) : null,
    week: selected && !issues.length ? nutritionWeek(meals.meals, water.entries, selected) : [], targets: nutritionTargets(readEligibleGoals() || {}) };
}

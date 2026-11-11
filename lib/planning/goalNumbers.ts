import type { GoalState } from "./goals";

/** Accept decimal numeric values, including scientific notation; never coerce booleans/arrays/hex. */
export function goalNumber(value: unknown): number | null {
  if (typeof value !== "number" && (typeof value !== "string" || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()))) return null;
  const number = Number(value); return Number.isFinite(number) ? number : null;
}
export function validateGoalTargets(goals: Partial<GoalState>): string | null {
  const fields: Array<[keyof GoalState, number, number, boolean]> = [
    ["targetWeeklySessions", 1, 7, true], ["targetWeeklySets", 1, 500, true],
    ["targetProtein", 1, 500, false], ["targetSteps", 1, 100000, true], ["stepsGoal", 1, 100000, true],
    ["targetSleep", 1, 24, false], ["waterGoal", 1, 500, false],
    ["targetCalories", 1, 20000, false], ["targetCarbs", 0, 2000, false],
    ["targetFat", 0, 1000, false], ["targetFiber", 0, 200, false],
    ["currentWeight", 1, 1500, false], ["goalWeight", 1, 1500, false],
    ["sessionMinutes", 5, 240, true], ["muscleGain", 0, 500, false], ["fatLoss", 0, 500, false],
    ["strengthGain", 0, 1500, false], ["mobilityGain", 0, 180, false], ["conditioningGain", 0, 1440, false],
    ["benchTarget", 0, 1500, false], ["squatTarget", 0, 1500, false], ["deadliftTarget", 0, 1500, false], ["pullupTarget", 0, 500, true],
  ];
  for (const [key, min, max, integer] of fields) {
    const raw = goals[key];
    if ((raw == null || typeof raw === "string" && !raw.trim()) && !["targetWeeklySessions", "targetWeeklySets"].includes(key)) continue;
    const value = goalNumber(raw);
    if (value === null || value < min || value > max || integer && !Number.isInteger(value)) return `${key.replace(/([A-Z])/g, " $1")} must be ${integer ? "a whole number " : ""}between ${min} and ${max}.`;
  }
  return null;
}

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
    ["currentWeight", 1, 1500, false], ["goalWeight", 1, 1500, false],
  ];
  for (const [key, min, max, integer] of fields) {
    const raw = goals[key];
    if ((raw == null || typeof raw === "string" && !raw.trim()) && !["targetWeeklySessions", "targetWeeklySets"].includes(key)) continue;
    const value = goalNumber(raw);
    if (value === null || value < min || value > max || integer && !Number.isInteger(value)) return `${key.replace(/([A-Z])/g, " $1")} must be ${integer ? "a whole number " : ""}between ${min} and ${max}.`;
  }
  return null;
}

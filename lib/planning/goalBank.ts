import type { GoalState } from "./goals";

export type GoalBankEntry = {
  id: string; key: string; title: string; target: string; unit: string;
  createdAt: string; updatedAt: string; completedAt?: string; reviewDate?: string; snapshot?: Omit<Partial<GoalState>, "goalBank">; legacyEntries?: GoalBankEntry[];
};

/** Update an active goal while editing; completed goals retain their original target. */
export function mergeGoalBank(entries: GoalBankEntry[], goals: Partial<GoalState>, now: string): GoalBankEntry[] {
  if (!goals.planDirections?.length) return entries.map(entry => ({...entry}));
  const targets: Array<[string, string, string, string]> = [
    ["direction", "Training direction", goals.planDirections?.join(" + ") || "", ""],
    ["goalWeight", "Body weight", goals.goalWeight || "", "lb"],
    ["targetWeeklySessions", "Weekly sessions", goals.targetWeeklySessions || "", "sessions / week"],
    ["targetWeeklySets", "Weekly sets", goals.targetWeeklySets || "", "sets / week"],
    ["stepsGoal", "Daily steps", goals.stepsGoal || goals.targetSteps || "", "steps / day"],
    ["targetSleep", "Sleep", goals.targetSleep || "", "hours / night"],
    ["waterGoal", "Water", goals.waterGoal || "", "oz / day"],
    ["targetCalories", "Calories", goals.targetCalories || "", "cal / day"],
    ["targetProtein", "Protein", goals.targetProtein || "", "g / day"],
    ["targetCarbs", "Carbs", goals.targetCarbs || "", "g / day"],
    ["targetFat", "Fat", goals.targetFat || "", "g / day"],
    ["targetFiber", "Fiber", goals.targetFiber || "", "g / day"],
    ["benchmarkGoal", "Performance benchmark", goals.benchmarkGoal || "", ""],
    ["goalMilestones", "Milestones", goals.goalMilestones || "", ""],
  ];
  const {goalBank: _bank, updatedAt: _updated, ...snapshot} = goals;
  const title = goals.goalTitle?.trim() || goals.planDirections.join(" + ");
  const target = targets.filter(([, , value]) => value.trim()).map(([, label, value, unit]) => `${label}: ${value} ${unit}`.trim()).join("\n");
  const legacy = entries.filter(entry => entry.key !== "overall-goal");
  const bank = entries.filter(entry => entry.key === "overall-goal").map(entry => ({...entry}));
  const active = bank.find(entry => !entry.completedAt);
  const reviewDate = goals.goalDeadline || "";
  if (active) {
    Object.assign(active, {title, target, reviewDate, snapshot, updatedAt: now});
    if (legacy.length) active.legacyEntries = [...(active.legacyEntries || []), ...legacy];
  } else if (!bank.some(entry => entry.title === title && entry.target === target && entry.reviewDate === reviewDate)) {
    bank.push({id: `overall-goal:${now}`, key: "overall-goal", title, target, unit: "", reviewDate, snapshot, createdAt: legacy[0]?.createdAt || now, updatedAt: now, ...(legacy.length ? {legacyEntries: legacy} : {})});
  }
  return bank;
}

export function completeBankGoal(entries: GoalBankEntry[], id: string, now: string): GoalBankEntry[] {
  return entries.map(entry => entry.id === id && !entry.completedAt ? {...entry, completedAt: now, updatedAt: now} : entry);
}

export function validGoalBank(value: unknown): value is GoalBankEntry[] {
  return Array.isArray(value) && value.every(entry => entry && typeof entry === "object" &&
    ["id", "key", "title", "target", "unit", "createdAt", "updatedAt"].every(key => typeof entry[key] === "string") &&
    (!entry.completedAt || typeof entry.completedAt === "string"));
}

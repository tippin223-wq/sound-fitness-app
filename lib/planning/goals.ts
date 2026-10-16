import { planningKeys, planningOwner, planningAccountGeneration, planningRecordVersion, readPlanning, writePlanningValues } from "./store";
import { activityTimestamp, localDate, validDateOnly } from "./dates";
import { validateGoalTargets } from "./goalNumbers";

export const goalIds = ["Build Muscle", "Lose Fat", "Maintain", "Strength", "General Health", "Mobility", "Conditioning", "Recovery", "Performance"] as const;
export type GoalId = typeof goalIds[number];
export type GoalState = {
  planDirections: GoalId[]; primaryGoal: GoalId; secondaryGoal: GoalId | "";
  constraintGoal: string; goalDeadline: string; goalMilestones: string; goalPriorityRanking: string;
  currentWeight: string; goalWeight: string; targetWeeklySessions: string; targetWeeklySets: string;
  targetProtein: string; targetSteps: string; stepsGoal: string; targetSleep: string; waterGoal: string;
  benchmarkGoal: string; goalMode: string; motivationFocus: string; planDirectionNotes: string;
  completedMilestones?: string[]; updatedAt?: string;
};
const goalTextFields = [
  "primaryGoal", "secondaryGoal", "constraintGoal", "goalDeadline", "goalMilestones", "goalPriorityRanking",
  "currentWeight", "goalWeight", "targetWeeklySessions", "targetWeeklySets", "targetProtein", "targetSteps",
  "stepsGoal", "targetSleep", "waterGoal", "benchmarkGoal", "goalMode", "motivationFocus", "planDirectionNotes", "updatedAt",
] as const satisfies readonly (keyof GoalState)[];
const goalFields = new Set<string>([...goalTextFields, "planDirections", "completedMilestones"]);
const goalAliases: Record<string, GoalId> = { Bulk: "Build Muscle", Cut: "Lose Fat", "Build Strength": "Strength", "Improve Mobility": "Mobility", "Athletic Performance": "Performance", "Return to Training": "Recovery" };
export function normalizeGoalId(value: unknown): GoalId | undefined {
  if (typeof value !== "string") return;
  const label = value.trim().toLowerCase();
  return goalIds.find(id => id.toLowerCase() === label) || Object.entries(goalAliases).find(([alias]) => alias.toLowerCase() === label)?.[1];
}
function directionError(input: Partial<GoalState>): string | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return "Review your saved plan directions on Goals.";
  if (input.planDirections !== undefined && (!Array.isArray(input.planDirections) || input.planDirections.some(value => !normalizeGoalId(value)))) return "Choose only supported plan directions on Goals.";
  if (Array.isArray(input.planDirections) && new Set(input.planDirections.map(normalizeGoalId)).size > 2) return "Choose at most two plan directions on Goals.";
  if (input.planDirections === undefined && !normalizeGoalId(input.primaryGoal) && !normalizeGoalId(input.goalMode) && normalizeGoalId(input.secondaryGoal)) return "Choose a primary plan direction on Goals before a secondary direction.";
  for (const value of [input.primaryGoal, input.secondaryGoal]) {
    if (value != null && value !== "" && !normalizeGoalId(value)) return "Review the primary and secondary plan directions on Goals.";
  }
  return null;
}
function metadataError(input: Partial<GoalState>): string | null {
  const fields = ["constraintGoal", "goalDeadline", "goalMilestones", "goalPriorityRanking", "benchmarkGoal", "motivationFocus", "planDirectionNotes"] as const;
  if (fields.some(field => input[field] != null && typeof input[field] !== "string")) return "Review your goal notes, timeline, and milestones: these values must be text.";
  if (input.completedMilestones != null && (!Array.isArray(input.completedMilestones) || input.completedMilestones.some(value => typeof value !== "string" || !value.trim()) || new Set(input.completedMilestones).size !== input.completedMilestones.length)) return "Review completed goal milestones: use distinct, nonempty text values.";
  return null;
}
export function normalizeGoals(input: Partial<GoalState>): Partial<GoalState> {
  if (!input || typeof input !== "object" || Array.isArray(input)) input = {};
  input = { ...input };
  for (const key of goalTextFields) {
    const value = input[key];
    if (value != null && typeof value !== "string") (input as Record<string, unknown>)[key] = typeof value === "number" ? String(value) : "";
  }
  if (input.completedMilestones) input.completedMilestones = Array.isArray(input.completedMilestones) ? input.completedMilestones.filter(item => typeof item === "string") : [];
  const selectedPrimary = normalizeGoalId(input.primaryGoal) || normalizeGoalId(input.goalMode);
  const directions = Array.isArray(input.planDirections)
    ? [...new Set(input.planDirections.map(normalizeGoalId).filter((id): id is GoalId => Boolean(id)))].slice(0, 2)
    : selectedPrimary ? [...new Set([selectedPrimary, normalizeGoalId(input.secondaryGoal)].filter((id): id is GoalId => Boolean(id)))] : [];
  const primaryGoal = directions[0] || normalizeGoalId(input.primaryGoal) || "General Health";
  const secondaryGoal = directions[1] || "";
  return { ...input, planDirections: directions, primaryGoal, secondaryGoal, goalMode: primaryGoal,
    stepsGoal: input.stepsGoal || input.targetSteps || "", targetSteps: input.stepsGoal || input.targetSteps || "" };
}
export function readGoals(): Partial<GoalState> {
  return normalizeGoals(readPlanning<Partial<GoalState>>(planningKeys.goals, {}));
}
export function savedGoalsIssue(input: Partial<GoalState>, now = new Date()): string | null {
  const directionsError = directionError(input) || metadataError(input);
  if (directionsError) return directionsError;
  const goals = normalizeGoals(input);
  if (typeof input.updatedAt !== "string" || !goals.updatedAt || !Number.isFinite(activityTimestamp(goals.updatedAt)) || !goals.planDirections?.length || !goals.targetWeeklySessions || !goals.targetWeeklySets) return "Save your primary goal and weekly targets on Goals before creating a plan.";
  if (activityTimestamp(goals.updatedAt) > now.getTime() + 5 * 60 * 1000) return "Review and save your Goals again: their saved time is in the future.";
  const error = validateGoalTargets(input) || validateGoalTargets(goals);
  return error ? `Review your saved Goals before creating a plan: ${error}` : null;
}
export function requireSavedGoals() {
  const input = readPlanning<Partial<GoalState>>(planningKeys.goals, {});
  const error = savedGoalsIssue(input);
  if (error) throw new Error(error);
  return normalizeGoals(input);
}
/** Read planning-ready goals without hiding invalid raw answers through normalization. */
export function readEligibleGoals(now = new Date()): Partial<GoalState> | null {
  const input = readPlanning<Partial<GoalState>>(planningKeys.goals, {});
  return savedGoalsIssue(input, now) ? null : normalizeGoals(input);
}
export function goalSetupNextStep(input: Partial<GoalState>, unsaved = false): string {
  const error = directionError(input) || metadataError(input);
  if (error) return error;
  const goals = normalizeGoals(input);
  if (!goals.planDirections?.length) return "Choose your primary plan direction first, then review your weekly targets.";
  const targetError = validateGoalTargets(input) || validateGoalTargets(goals);
  if (targetError) return `Review your goal targets: ${targetError}`;
  if (unsaved || savedGoalsIssue(input)) return "Review and save your chosen goals and weekly targets before creating a plan.";
  if (!goals.goalDeadline) return "Your goals are ready for planning. Optionally add a timeline to track your intended target date.";
  if (!goals.goalMilestones?.trim()) return "Add milestones that describe the progress you want to review.";
  return "Review My Plan against your saved goals and recorded workout progress.";
}
export function validateGoals(goals: GoalState, today = localDate()): string | null {
  const directionsError = directionError(goals) || metadataError(goals);
  if (directionsError) return directionsError;
  if (!goals.planDirections.length) return "Choose a primary plan direction before saving.";
  const error = validateGoalTargets(goals);
  if (error) return error;
  if (goals.goalDeadline && (!validDateOnly(goals.goalDeadline) || goals.goalDeadline < today)) return "Choose a valid goal deadline today or later.";
  return null;
}
export function saveGoalsRecord(goals: GoalState, projectedProfile?: Record<string, unknown>, editor?: { account: string | null; generation: number; version: string }): GoalState {
  if (editor && (planningOwner() !== editor.account || planningAccountGeneration() !== editor.generation)) throw new Error("Your account changed. Reload Goals before saving.");
  if (editor && planningRecordVersion(planningKeys.goals) !== editor.version) throw new Error("Goals changed since you opened them. Your edits are still here. Copy them before reloading saved goals.");
  const directionsError = directionError(goals) || metadataError(goals);
  if (directionsError) throw new Error(directionsError);
  const targetError = validateGoalTargets(goals);
  if (targetError) throw new Error(targetError);
  const normalized = normalizeGoals(goals) as GoalState;
  const error = validateGoals(normalized);
  if (error) throw new Error(error);
  const original = readPlanning<unknown>(planningKeys.goals, null);
  const annotations = original && typeof original === "object" && !Array.isArray(original)
    ? Object.fromEntries(Object.entries(original).filter(([key]) => !goalFields.has(key))) : {};
  const next = { ...annotations, ...normalized, updatedAt: new Date().toISOString() };
  writePlanningValues(structuredClone({ [planningKeys.goals]: next, ...(projectedProfile ? { [planningKeys.profile]: projectedProfile } : {}) }));
  return next;
}
export const goalAdvice: Record<GoalId, string> = {
  "Build Muscle": "Plan repeatable muscle-group work and review planned sets against your weekly target.",
  "Lose Fat": "Keep strength sessions consistent and use your saved steps and nutrition targets for support.",
  Maintain: "Choose a repeatable weekly schedule that fits your available time.",
  Strength: "Repeat key movement patterns and record loads and reps before choosing the next progression.",
  "General Health": "Balance strength, conditioning, and mobility across the available training days.",
  Mobility: "Schedule repeatable movement practice and track a specific range-of-motion benchmark.",
  Conditioning: "Schedule conditioning alongside strength and allow recovery between demanding sessions.",
  Recovery: "Use your readiness and pain context to review planned work before each session.",
  Performance: "Tie each session to your selected performance benchmark and protect recovery days.",
};

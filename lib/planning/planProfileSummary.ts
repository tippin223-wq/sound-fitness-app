import { readGoals, requireSavedGoals } from "./goals";
import { goalNumber } from "./goalNumbers";
import { planningKeys, readPlanning } from "./store";
import { profileHasReportedInjuryPain, profileSplitPreferences } from "./recommendation";

export type PlanProfileSnapshot = {
  activeGoal: string;
  sessionsTarget: string;
  preferredSplit: string;
  recoveryWarnings: string;
};

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const reported = (value: unknown, max: number) => {
  const number = goalNumber(value);
  return number !== null && number >= 0 && number <= max ? number : null;
};

export function readPlanProfileSnapshot(): PlanProfileSnapshot {
  const profile = record(readPlanning(planningKeys.profile, {}));
  const body = record(profile.bodyStatus);
  const pain = reported(body.painLevel, 10);
  const soreness = reported(body.sorenessLevel, 10);
  const sleep = reported(body.averageSleepHours, 24) ?? reported(body.hoursSlept, 24);
  const reports = [pain, soreness, sleep].filter(value => value !== null).length;
  const flags = pain !== null && pain > 0 || soreness !== null && soreness >= 5 || sleep !== null && sleep < 6.5
    || profileHasReportedInjuryPain(profile.injuries);
  let activeGoal = readGoals().updatedAt ? "Review saved Goals" : "Set goals first";
  let sessionsTarget = "Not available";
  try {
    const goals = requireSavedGoals();
    activeGoal = goals.primaryGoal!;
    const sessions = goalNumber(goals.targetWeeklySessions)!;
    sessionsTarget = `${sessions} session${sessions === 1 ? "" : "s"}`;
  } catch { /* Missing or invalid goals are not saved availability. */ }
  return {
    activeGoal,
    sessionsTarget,
    preferredSplit: profileSplitPreferences(profile).join(", ") || "Not reported",
    recoveryWarnings: flags ? "Review reported readiness" : !reports ? "Add readiness in Profile" : reports < 3 ? "Partial reports; no reported flags" : "No reported flags",
  };
}

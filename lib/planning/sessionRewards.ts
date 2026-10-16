import type { PlanningLog } from "./logs";
import { goalNumber } from "./goalNumbers";
import { sessionReportLogs } from "./sessionReporting";
import { statsCurrentStreak } from "./statsEvidence";

/** Profile points are recorded cache evidence, not proof of an award or redemption balance. */
export function sessionRewardSummary(profileValue: unknown, logs: readonly PlanningLog[], now = new Date()) {
  const profile = profileValue && typeof profileValue === "object" && !Array.isArray(profileValue) ? profileValue as Record<string, unknown> : {};
  const points = goalNumber(profile.soundPoints);
  return {
    soundPoints: points !== null && Number.isSafeInteger(points) && points >= 0 ? points : null,
    soundTokens: null as number | null,
    workoutXp: null as number | null,
    trainingStreak: statsCurrentStreak(sessionReportLogs(logs, now).map(log => log.timestamp), now),
  };
}
export const sessionRewardLabel = (value: number | null) => value === null ? "Unavailable" : value.toLocaleString();

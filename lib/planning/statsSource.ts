import { mergeRecordedOccurrences, recordedExerciseSemanticKey } from "./mergeExerciseOccurrences";
import { planningKeys, readPlanning } from "./store";
import { readAvailableWorkoutLogs, type PlanningLog } from "./logs";
import { captureWorkoutHistoryRecovery } from "./workoutHistoryRecovery";
import { readEligibleGoals } from "./goals";
import { goalNumber } from "./goalNumbers";
import { getActiveWorkoutPlan } from "@/lib/localData/workoutPlanData";
import { phaseRecords } from "./phaseRecords";
import { profileEquipmentPreferences, profileSplitPreferences, profileRecoveryReports, profileTrainingExperience } from "./recommendation";
import { activityTimestamp } from "./dates";
import { workoutLoadUnitEvidence } from "./loadUnitEvidence";

/** Stats never guesses ownership from browser-wide legacy storage. */
export const readStatsRecord = (key: string): unknown => readPlanning(key, null);
/** Body weights stay in the Profile's recorded unit; reject malformed or conflicting aliases. */
export function readStatsBodyWeights() {
  const raw = readPlanning<unknown>(planningKeys.profile, null);
  const profile = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const reportedWeight = (keys: string[]) => {
    const values: number[] = [];
    for (const key of keys) {
      const raw = profile[key];
      if (raw == null || typeof raw === "string" && !raw.trim()) continue;
      const value = goalNumber(raw);
      if (value === null || value <= 0 || value > 1500) return null;
      values.push(value);
    }
    return values.length && values.every(value => value === values[0]) ? values[0] : null;
  };
  return { currentWeight: reportedWeight(["currentWeight", "weight"]), goalWeight: reportedWeight(["goalWeight", "targetWeight"]) };
}
/** Completion uses saved evidence, before display labels or Goals projections. */
export function readStatsJourneyFoundations(now = new Date()) {
  const value = readPlanning<unknown>(planningKeys.profile, null);
  const profile = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const hasText = (...values: unknown[]) => values.some(value => typeof value === "string" && Boolean(value.trim()));
  const weight = readStatsBodyWeights().currentWeight;
  const sessions = goalNumber(profile.sessionsPerWeek) ?? goalNumber(profile.weeklySessions);
  const experience = profileTrainingExperience({ trainingAge: typeof profile.trainingAge === "string" ? profile.trainingAge : undefined, experienceLevel: typeof profile.experienceLevel === "string" ? profile.experienceLevel : undefined });
  const equipment = profileEquipmentPreferences(profile).length > 0;
  const fields = [hasText(profile.displayName, profile.name, profile.firstName), hasText(profile.memberType, profile.accountType), experience.level !== null && !experience.conflicting,
    weight !== null && weight > 0, sessions !== null && Number.isInteger(sessions) && sessions >= 1 && sessions <= 7, equipment];
  return { profile: Math.round(fields.filter(Boolean).length / fields.length * 100), goals: readEligibleGoals(now) ? 100 : 0 };
}
export function readStatsGoalTargets(now = new Date()) {
  const goals = readEligibleGoals(now);
  return { weeklySets: goals ? goalNumber(goals.targetWeeklySets) : null, weeklySessions: goals ? goalNumber(goals.targetWeeklySessions) : null };
}
export function readStatsPlanContext(now = new Date()) {
  const value = readPlanning<unknown>(planningKeys.profile, null);
  const profile = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const active = phaseRecords(readPlanning(planningKeys.phases, null)).filter(phase => phase.status === "active" || phase.status == null && phase.active === true);
  const phaseName = active.length === 1 ? [active[0].name, active[0].phaseName, active[0].title].find(value => typeof value === "string" && value.trim()) : null;
  return {
    currentPlan: getActiveWorkoutPlan()?.title || "No active plan yet",
    currentPhase: active.length > 1 ? "Review active phases" : typeof phaseName === "string" ? phaseName.trim() : "No active phase yet",
    planDirection: profileSplitPreferences(profile).join(", ") || "Not reported",
    primaryGoal: readEligibleGoals(now)?.primaryGoal || "Goal not set",
  };
}
export function readStatsWorkoutLogs() {
  if (captureWorkoutHistoryRecovery().issues.length) return [];
  return readAvailableWorkoutLogs();
}
export function readStatsRecoveryReports() {
  const value = readPlanning<unknown>(planningKeys.profile, null);
  const profile = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const reports = profileRecoveryReports(profile.bodyStatus);
  return { ...reports, reportedCount: Object.values(reports).filter(value => value !== null).length };
}
export type StatsRecoveryReport = ReturnType<typeof readStatsRecoveryReports>;
function statsExerciseKey(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entry = value as Record<string, unknown>;
  if (typeof entry.exerciseId !== "string" || typeof entry.exerciseName !== "string") return null;
  const numeric = (value: unknown) => value == null || typeof value === "string" && !value.trim() ? null : goalNumber(value) ?? { original: value };
  const date = activityTimestamp(entry.date);
  return JSON.stringify([entry.exerciseId.trim().toLowerCase(), entry.exerciseName.trim().toLowerCase(), Number.isFinite(date) ? date : { original: entry.date },
    numeric(entry.weight), numeric(entry.reps), numeric(entry.sets), entry.source == null || typeof entry.source === "string" && !entry.source.trim() ? "workout-session" : typeof entry.source === "string" ? entry.source.trim().toLowerCase() : { original: entry.source }, workoutLoadUnitEvidence(entry)]);
}
/** Match copied entries by occurrence; never collapse repeated rows within a workout. */
export function mergeStatsExerciseEntries(saved: readonly unknown[], logs: readonly PlanningLog[] = readStatsWorkoutLogs()): unknown[] {
  const history = logs.flatMap(log => Array.isArray(log.entries) ? log.entries : []);
  return mergeRecordedOccurrences(saved, history, statsExerciseKey, recordedExerciseSemanticKey);
}

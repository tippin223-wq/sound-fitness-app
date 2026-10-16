import type { LocalExerciseStatEntry } from "@/types";
import { planningKeys, planningSnapshot, readPlanning, writePlanningValues, writePlanning } from "./store";
import { activityTimestamp, localDate, validDateOnly } from "./dates";
import { cloudHistorySnapshot, mergeAvailableWorkoutLogs } from "./availableLogs";
import { filterWorkoutHistory, workoutHistory } from "./history";
export type PlanningLog = {
  id: string; title: string; completedAt: string; startedAt?: string | null;
  templateId?: string | null; planId?: string | null; planDayId?: string | null;
  assignmentId?: string | null; entries: LocalExerciseStatEntry[];
  cloudLogId?: string; syncedAt?: string; syncError?: string;
};
export const readPlanningLogs = () => readPlanning<PlanningLog[]>(planningKeys.logs, []);
/** Identity check only; exercise/date/content validation still runs before upload. */
export const planningLogHasIdentity = (value: unknown): value is PlanningLog => Boolean(value && typeof value === "object" && !Array.isArray(value) && typeof (value as PlanningLog).id === "string" && (value as PlanningLog).id.trim());
/** Mutation guards must not interpret unreadable completion evidence as an empty history. */
export function readWorkoutCompletionEvidence(includeCloud = true): PlanningLog[] {
  const snapshot = planningSnapshot();
  const local = Object.hasOwn(snapshot, planningKeys.logs) ? snapshot[planningKeys.logs] : [];
  const sources = includeCloud ? [local, cloudHistorySnapshot().logs] : [local];
  const records: PlanningLog[] = [];
  for (const source of sources) {
    if (!Array.isArray(source) || source.some(log => !planningLogHasIdentity(log) || ["planId", "planDayId", "assignmentId", "templateId"].some(field => {
      const value = (log as unknown as Record<string, unknown>)[field];
      return value != null && typeof value !== "string";
    }))) throw new Error("Saved workout history needs review before changing workouts or plans. Open History to inspect and export the originals; your draft and plans are preserved.");
    for (const log of source) records.push(log);
  }
  return records;
}
export const validCloudWorkoutId = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
/** Older clients recorded invalid RPC results as synced; replay those original sessions. */
export const planningLogUploadConfirmed = (log: PlanningLog) => validCloudWorkoutId(log.cloudLogId) && typeof log.syncedAt === "string" && Number.isFinite(activityTimestamp(log.syncedAt));
export const pendingWorkoutUploads = (logs: PlanningLog[]) => logs.filter(log => !planningLogUploadConfirmed(log));
/** Recovery export is independent of reporting dates, filters and derived totals. */
export const exportPendingWorkoutUploads = (logs: PlanningLog[]) => JSON.stringify({
  schemaVersion: 1, source: "Sound Fitness pending workout uploads", workouts: pendingWorkoutUploads(logs),
}, null, 2);
export const planningLogVersion = (log: PlanningLog) => JSON.stringify(log, (_key, value) => value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value);
function assertUniquePlanningAssignment(log: PlanningLog, records: unknown[]) {
  if (log.assignmentId == null || log.assignmentId === "") return;
  if (typeof log.assignmentId !== "string" || records.filter(value => value && typeof value === "object" && !Array.isArray(value) && (value as PlanningLog).assignmentId === log.assignmentId).length !== 1)
    throw new Error("Saved workout assignment needs review. Multiple or malformed assignment links cannot be uploaded or confirmed automatically.");
}
export function assertPlanningLogVersion(id: string, expectedVersion: string) {
  const logs = readPlanningLogs();
  const matches = Array.isArray(logs) ? logs.filter(log => planningLogHasIdentity(log) && log.id === id) : [];
  if (matches.length !== 1 || planningLogVersion(matches[0]) !== expectedVersion) throw new Error("Saved workout changed during upload or its identity needs review. Your current account data is preserved; review the workout before retrying.");
  assertUniquePlanningAssignment(matches[0], logs);
}
export const readAvailableWorkoutLogs = () => mergeAvailableWorkoutLogs(readPlanningLogs(), cloudHistorySnapshot().logs);
export function recordPlanningLog(log: PlanningLog) {
  const logs = readWorkoutCompletionEvidence(false);
  if (logs.some(item => item.id === log.id || Boolean(log.assignmentId && item.assignmentId === log.assignmentId))) return;
  const snapshot = planningSnapshot();
  const stats = Object.hasOwn(snapshot, planningKeys.exerciseStats) ? snapshot[planningKeys.exerciseStats] : [];
  if (!Array.isArray(stats)) throw new Error("Saved exercise statistics need review before adding a workout. Original statistics, workout history and draft are preserved.");
  // History and statistics are independent snapshots, detached from caller-owned entries.
  writePlanningValues({ [planningKeys.logs]: structuredClone([...logs, log]), [planningKeys.exerciseStats]: structuredClone([...log.entries, ...stats]) });
}
/** Distinguish a failed follow-up from absence of a durable local completion record. */
export function workoutSaveFailureMessage(sessionId: string, cause: unknown) {
  const message = cause instanceof Error ? cause.message : "The workout could not be saved in this browser. Try again before leaving the page.";
  try {
    if (sessionId && readWorkoutCompletionEvidence(false).some(log => log.id === sessionId))
      return message + " A workout record for this session is already saved in History. Open History to review the saved record and any sync issues before continuing.";
  } catch { /* Unreadable evidence cannot establish that this session was saved. */ }
  return message;
}

export function markPlanningLogSynced(id: string, cloudLogId: string, expectedVersion?: string) {
  if (!validCloudWorkoutId(cloudLogId)) throw new Error("Cloud workout save was not confirmed.");
  const logs = readPlanningLogs();
  if (expectedVersion !== undefined) assertPlanningLogVersion(id, expectedVersion);
  const matches = Array.isArray(logs) ? logs.filter(log => planningLogHasIdentity(log) && log.id === id) : [];
  if (matches.length > 1) throw new Error("Saved workout identity is duplicated. Review the original records before confirming upload.");
  if (!matches.length || planningLogUploadConfirmed(matches[0])) return;
  assertUniquePlanningAssignment(matches[0], logs);
  writePlanning(planningKeys.logs, structuredClone(logs.map(log => planningLogHasIdentity(log) && log.id === id ? { ...log, cloudLogId, syncedAt: new Date().toISOString(), syncError: undefined } : log)));
}
export function markPlanningLogSyncError(id: string, message: string, expectedVersion: string) {
  assertPlanningLogVersion(id, expectedVersion);
  const logs = readPlanningLogs();
  const current = logs.find(log => planningLogHasIdentity(log) && log.id === id)!;
  const syncError = message.trim().slice(0, 2000) || "Workout upload is unavailable. Retry when connected.";
  if (planningLogUploadConfirmed(current) || current.syncError === syncError) return;
  writePlanning(planningKeys.logs, structuredClone(logs.map(log => planningLogHasIdentity(log) && log.id === id ? { ...log, syncError } : log)));
}
export function assignmentCompleted(id: string) {
  // Reporting deduplication must not hide a recorded assignment from mutation guards.
  return readWorkoutCompletionEvidence().some(log => log.assignmentId === id);
}
/** UI completion is distinct from background replay of an immutable saved record. */
export function assertWorkoutNotCompleted(sessionId: string | null, assignmentId?: string | null) {
  if (readWorkoutCompletionEvidence().some(log => Boolean(sessionId && log.id === sessionId) || Boolean(assignmentId && log.assignmentId === assignmentId)))
    throw new Error("This workout or plan assignment is already completed. Review it in History; your draft values are preserved for review and export.");
}
export function workoutsInWeek(start: string, end: string, now = new Date()) {
  return filterWorkoutHistory(workoutHistory(readAvailableWorkoutLogs(), now), "", start, end);
}
export function setsInWeek(start: string, end: string, now = new Date()) {
  return workoutsInWeek(start, end, now).reduce((total, log) => total + log.loggedSets, 0);
}

/** A plan's reporting window follows its calendar week, never its stored day count/order. */
export function setsInPlanWeek(weekStart: string, now = new Date()) {
  if (!validDateOnly(weekStart)) throw new Error("Choose a valid plan week start date.");
  const end = new Date(`${weekStart}T12:00:00`);
  if (end.getDay() !== 1) throw new Error("A plan week must start on Monday.");
  end.setDate(end.getDate() + 6);
  return setsInWeek(weekStart, localDate(end), now);
}

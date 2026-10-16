import type { PlanningLog } from "./logs";
import { planningOwner, planningAccountGeneration, PLANNING_UPDATED } from "./store";
import { goalNumber } from "./goalNumbers";
import { activityTimestamp } from "./dates";
import { recordedExerciseSemanticKey } from "./mergeExerciseOccurrences";
import { workoutLoadUnitEvidence } from "./loadUnitEvidence";

type CloudHistory = { generation: number | null; owner: string | null; logs: PlanningLog[]; status: string };
const EMPTY: CloudHistory = { generation: null, owner: null, logs: [], status: "Cloud history has not been loaded." };
let snapshot = EMPTY;
export function clearCloudHistory() {
  snapshot = EMPTY;
  window.dispatchEvent(new Event(PLANNING_UPDATED));
}
export const serverCloudHistory = () => EMPTY;
export const cloudHistorySnapshot = () => snapshot.owner === planningOwner() && snapshot.generation === planningAccountGeneration() ? snapshot : EMPTY;
export function publishCloudHistory(account: string, logs: PlanningLog[], status: string) {
  if (planningOwner() !== account) return;
  snapshot = { generation: planningAccountGeneration(), owner: account, logs: structuredClone(logs), status };
  window.dispatchEvent(new Event(PLANNING_UPDATED));
}
/** Planning records retain their richer assignment/draft identity and pending edits. */
export function mergeAvailableWorkoutLogs(local: PlanningLog[], remote: PlanningLog[]) {
  const identities = new Set(local.flatMap(log => [log.id, ...(log.cloudLogId ? [log.cloudLogId] : [])]));
  const assignments = new Set(local.flatMap(log => log.assignmentId ? [log.assignmentId] : []));
  return [...local, ...remote.filter(log => !identities.has(log.id) && !(log.cloudLogId && identities.has(log.cloudLogId)) && !(log.assignmentId && assignments.has(log.assignmentId)))];
}

/** Keep assignment collisions inspectable without counting them as extra workouts. */
export function workoutAssignmentConflicts(local: PlanningLog[], remote: PlanningLog[]) {
  const byAssignment = new Map<string, PlanningLog[]>();
  for (const log of remote) {
    if (!log.assignmentId) continue;
    const group = byAssignment.get(log.assignmentId) || [];
    group.push(log); byAssignment.set(log.assignmentId, group);
  }
  return local.flatMap(log => {
    if (!log.assignmentId) return [];
    return (byAssignment.get(log.assignmentId) || []).filter(other =>
      other.id !== log.id && other.id !== log.cloudLogId && other.cloudLogId !== log.id
      && !(log.cloudLogId && other.cloudLogId === log.cloudLogId)
    ).map(other => ({ assignmentId: log.assignmentId!, planning: log, cloud: other }));
  });
}

const optionalRecordedText = (value: unknown) => value == null || value === "" ? null : value;

/** Compare persisted completion content, excluding sync and device-only metadata. */
function completionContent(log: PlanningLog, semantics = false) {
  const timestamp = (value: unknown) => {
    const parsed = typeof value === "string" ? activityTimestamp(value) : NaN;
    return Number.isFinite(parsed) ? parsed : value ?? null;
  };
  const number = (value: unknown) => value == null || typeof value === "string" && !value.trim() ? null : goalNumber(value) ?? value;
  return JSON.stringify({
    title: typeof log.title === "string" ? log.title.trim() || "Workout Session" : log.title, startedAt: timestamp(log.startedAt), completedAt: timestamp(log.completedAt),
    planId: optionalRecordedText(log.planId), planDayId: optionalRecordedText(log.planDayId),
    entries: Array.isArray(log.entries) ? log.entries.map(entry => !entry || typeof entry !== "object" || Array.isArray(entry) ? { invalidEntry: entry } : [entry.exerciseId, entry.exerciseName, optionalRecordedText(entry.body), optionalRecordedText(entry.pattern),
      optionalRecordedText(entry.equipment), number(entry.weight), number(entry.reps), number(entry.sets), timestamp(entry.date), workoutLoadUnitEvidence(entry as unknown as Record<string, unknown>), ...(semantics ? [recordedExerciseSemanticKey(entry)] : [])]) : { invalidEntries: log.entries },
  });
}

/** Include hidden identity matches whose links or persisted completion content disagree. */
export function workoutCompletionConflicts(local: PlanningLog[], remote: PlanningLog[]) {
  const assignmentConflicts = workoutAssignmentConflicts(local, remote).map(conflict => ({ ...conflict, kind: "assignment" as const }));
  const byIdentity = new Map<string, Set<PlanningLog>>();
  for (const log of remote) {
    for (const identity of [log.id, ...(log.cloudLogId ? [log.cloudLogId] : [])]) {
      const group = byIdentity.get(identity) || new Set<PlanningLog>();
      group.add(log); byIdentity.set(identity, group);
    }
  }
  const identityConflicts = local.flatMap(log => {
    const matches = new Set([...(byIdentity.get(log.id) || []), ...(log.cloudLogId ? byIdentity.get(log.cloudLogId) || [] : [])]);
    if (!matches.size) return [];
    const recordedSemantics = (record: PlanningLog) => Array.isArray(record.entries) && record.entries.some(entry => entry && typeof entry === "object" && Boolean(recordedExerciseSemanticKey(entry)));
    return [...matches].flatMap(other => {
      const template = optionalRecordedText(log.templateId), otherTemplate = optionalRecordedText(other.templateId);
      const templateConflict = template !== null && otherTemplate !== null && JSON.stringify(template) !== JSON.stringify(otherTemplate);
      const kind = templateConflict || JSON.stringify(optionalRecordedText(log.assignmentId)) !== JSON.stringify(optionalRecordedText(other.assignmentId)) ? "identity" as const
        : completionContent(log, recordedSemantics(log) && recordedSemantics(other)) !== completionContent(other, recordedSemantics(log) && recordedSemantics(other)) ? "content" as const : null;
      const assignmentId = typeof log.assignmentId === "string" ? log.assignmentId : typeof other.assignmentId === "string" ? other.assignmentId : "";
      return kind ? [{ kind, assignmentId, planning: log, cloud: other }] : [];
    });
  });
  return [...assignmentConflicts, ...identityConflicts];
}

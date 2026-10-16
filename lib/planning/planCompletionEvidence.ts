import { readAvailableWorkoutLogs, readWorkoutCompletionEvidence, type PlanningLog } from "./logs";
import { captureWorkoutHistoryRecovery } from "./workoutHistoryRecovery";
import { workoutCompletionConflicts } from "./availableLogs";
import { activityTimestamp } from "./dates";
import { sessionReportLogs } from "./sessionReporting";

type AssignmentIdentity = { id: string; templateId?: string | null };
export type PlanAssignmentStatus = "Completed" | "Needs history review" | "Planned";
/** Pure reporting rule; duplicate input records require review unless explicitly identified as cloud mirrors. */
export function assignmentStatusFromRecords(planId: string, dayId: string, assignment: AssignmentIdentity, records: readonly PlanningLog[], now = new Date(), options: { allowSameSessionMirrors?: boolean; reportedLogs?: readonly PlanningLog[] } = {}): PlanAssignmentStatus {
  const matches = records.filter(log => log?.assignmentId === assignment.id);
  if (!matches.length) return "Planned";
  if (matches.some(log => typeof log.id !== "string" || !log.id.trim()) || typeof planId !== "string" || !planId.trim() || typeof dayId !== "string" || !dayId.trim()
    || !options.allowSameSessionMirrors && matches.length !== 1 || new Set(matches.map(log => log.id)).size !== 1
    || matches.some(log => log.planId !== planId || log.planDayId !== dayId || assignment.templateId && log.templateId !== assignment.templateId)) return "Needs history review";
  const first = matches[0];
  if (workoutCompletionConflicts([first], records.filter(item => item !== first)).length) return "Needs history review";
  const log = (options.reportedLogs ?? records).find(item => item.id === matches[0].id && item.assignmentId === assignment.id);
  if (log && (log.planId !== planId || log.planDayId !== dayId || assignment.templateId && log.templateId !== assignment.templateId
    || workoutCompletionConflicts([first], [log]).length)) return "Needs history review";
  const time = activityTimestamp(log?.completedAt);
  if (!log || !Number.isFinite(time) || time > now.getTime() || sessionReportLogs([log], now).length !== 1) return "Needs history review";
  return "Completed";
}
/** Raw completion records still conservatively lock mutations; this only qualifies display. */
export function planAssignmentStatus(planId: string, dayId: string, assignment: AssignmentIdentity, now = new Date()): PlanAssignmentStatus {
  try {
    const records = readWorkoutCompletionEvidence();
    if (records.some(log => log.assignmentId === assignment.id) && captureWorkoutHistoryRecovery().issues.length) return "Needs history review";
    return assignmentStatusFromRecords(planId, dayId, assignment, records, now, { allowSameSessionMirrors: true, reportedLogs: readAvailableWorkoutLogs() });
  } catch { return "Needs history review"; }
}

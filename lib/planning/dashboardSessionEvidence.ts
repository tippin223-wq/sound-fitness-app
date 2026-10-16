import { readPlanningLogs, type PlanningLog } from "./logs";
import { cloudHistorySnapshot, workoutAssignmentConflicts } from "./availableLogs";
import { activityTimestamp, localDate } from "./dates";
import { statsWeekBounds, statsHistoryIncludes } from "./statsEvidence";
import { sessionReportLogs } from "./sessionReporting";
import { workoutSetCount } from "./history";
import { readStatsWorkoutLogs } from "./statsSource";
import { captureWorkoutHistoryRecovery } from "./workoutHistoryRecovery";

/** Completion identities establish sessions; exercise activity dates cannot create them. */
export function projectDashboardSessions(records: readonly PlanningLog[], now = new Date(), issue = "") {
  const assignments = new Map<string, number>();
  for (const record of records) if (record.assignmentId) assignments.set(record.assignmentId, (assignments.get(record.assignmentId) || 0) + 1);
  const completed = issue ? [] : sessionReportLogs(records, now).filter(log =>
    (!log.assignmentId || assignments.get(log.assignmentId) === 1) && log.entries.some(entry => workoutSetCount(entry.sets) > 0));
  const weekly = completed.filter(log => statsHistoryIncludes(log.timestamp, "This week", now));
  const dates = [...new Set(completed.map(log => localDate(new Date(log.timestamp))))].sort();
  const start = statsWeekBounds(now).start;
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start); date.setDate(date.getDate() + index);
    const dateKey = localDate(date), count = weekly.filter(log => localDate(new Date(log.timestamp)) === dateKey).length;
    const fullLabel = date.toLocaleDateString("en-US", { weekday: "long" });
    return { dateKey, fullLabel, label: fullLabel.slice(0, 3).toUpperCase(), count, trained: count > 0, today: dateKey === localDate(now), missed: false };
  });
  const candidates = records.filter(log => Number.isFinite(activityTimestamp(log.completedAt)) && activityTimestamp(log.completedAt) <= now.getTime()
    && Array.isArray(log.entries) && log.entries.some(entry => entry && workoutSetCount(entry.sets) > 0));
  const review = records.some(log => !Number.isFinite(activityTimestamp(log.completedAt))
    || activityTimestamp(log.completedAt) <= now.getTime() && sessionReportLogs([log], now).length !== 1)
    || candidates.length !== completed.length || [...assignments.values()].some(count => count > 1);
  const latestAt = completed.reduce<number | null>((latest, log) => latest === null ? log.timestamp : Math.max(latest, log.timestamp), null);
  return { total: completed.length, weekly: weekly.length, latestAt,
    dates, days, issue: issue || (review ? "Review saved workout history" : "") };
}
export type DashboardSessionEvidence = ReturnType<typeof projectDashboardSessions>;
export function readDashboardSessionEvidence(now = new Date()) {
  if (captureWorkoutHistoryRecovery().issues.length) return projectDashboardSessions([], now, "Review saved workout history");
  try {
    if (workoutAssignmentConflicts(readPlanningLogs(), cloudHistorySnapshot().logs).length)
      return projectDashboardSessions([], now, "Review workout assignment history");
    return projectDashboardSessions(readStatsWorkoutLogs(), now);
  }
  catch { return projectDashboardSessions([], now, "Review saved workout history"); }
}
export const dashboardSessionEvidenceSnapshot = () => JSON.stringify(readDashboardSessionEvidence());
export const serverDashboardSessionEvidence = () => JSON.stringify(projectDashboardSessions([], new Date(2000, 0, 1)));

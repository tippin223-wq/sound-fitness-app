import type { PlanningLog } from "./logs";
import { activityTimestamp } from "./dates";
import { statsCompletedSessions, statsExerciseClassification, statsExerciseMetrics, statsHistoryIncludes, statsSetDistribution } from "./statsEvidence";
import { workoutSetCount } from "./history";
import { recordedWorkoutLoadUnit, workoutLoadInPounds, workoutNumericTotalsIssue } from "./loadUnitEvidence";
import { unitWorkloadLabel, unitWorkloadSummary } from "./unitWorkload";
import { validExerciseSemanticMetadata } from "./exerciseSemanticMetadata";
import { workoutChronologyIssue } from "./workoutChronology";

/** Reporting reads completion records; flattened exercise rows cannot create sessions. */
export function sessionReportLogs(logs: readonly PlanningLog[], now = new Date()) {
  return statsCompletedSessions(logs.map(log => ({ ...log, timestamp: activityTimestamp(log.completedAt) })), now).filter(log =>
    (log.title == null || typeof log.title === "string") && Array.isArray(log.entries) && log.entries.some(entry => entry && workoutSetCount(entry.sets) > 0) && log.entries.every(entry =>
      entry && typeof entry === "object" && !Array.isArray(entry) && typeof entry.exerciseName === "string" && Boolean(entry.exerciseName.trim()) &&
      Number.isFinite(activityTimestamp(entry.date)) && activityTimestamp(entry.date) <= now.getTime() &&
      ["exerciseId", "body", "pattern", "equipment"].every(field => (entry as unknown as Record<string, unknown>)[field] == null || typeof (entry as unknown as Record<string, unknown>)[field] === "string") &&
      validExerciseSemanticMetadata(entry) && statsExerciseMetrics(entry as unknown as Record<string, unknown>) !== null)).filter(log =>
      !workoutNumericTotalsIssue(log.entries.map(entry => ({
        ...statsExerciseMetrics(entry as unknown as Record<string, unknown>)!,
        unit: recordedWorkoutLoadUnit(entry as unknown as Record<string, unknown>),
      })))).filter(log => !workoutChronologyIssue(log.entries, log.completedAt, { now: now.getTime(), startedAt: log.startedAt }));
}

export function sessionWeekMetrics(logs: readonly PlanningLog[], now = new Date()) {
  const completed = sessionReportLogs(logs, now).filter(log => statsHistoryIncludes(log.timestamp, "This week", now));
  let sets = 0; let volume = 0;
  for (const log of completed) for (const entry of log.entries) {
    const metrics = statsExerciseMetrics(entry as unknown as Record<string, unknown>)!;
    sets += metrics.sets; volume += metrics.sets * metrics.reps * metrics.weight;
  }
  return { workouts: completed.length, sets, volume: Number.isFinite(volume) ? volume : null };
}

/** Completion week defines the reporting period; only explicit load units establish volume. */
function recordedSessionWorkload(logs: readonly PlanningLog[], period: "This week" | "Lifetime", now: Date) {
  const entries = sessionReportLogs(logs, now).flatMap(log => log.entries.map(entry => ({
    timestamp: log.timestamp,
    ...statsExerciseMetrics(entry as unknown as Record<string, unknown>)!,
    recordedLoadInPounds: workoutLoadInPounds(entry as unknown as Record<string, unknown>),
  })));
  const summary = unitWorkloadSummary(entries, period, now);
  const label = summary.volumePounds === null
    ? summary.eligibleEntries ? "Volume unavailable" : "No recorded volume"
    : unitWorkloadLabel(summary, "lb") + (summary.complete ? "" : " (partial)");
  return { ...summary, label };
}

export function sessionWeekWorkload(logs: readonly PlanningLog[], now = new Date()) {
  return recordedSessionWorkload(logs, "This week", now);
}

/** A past completion retains its own workload beyond the current week. */
export function sessionWorkoutWorkload(log: PlanningLog, now = new Date()) {
  return recordedSessionWorkload([log], "Lifetime", now);
}

/** Each recorded set belongs to one saved pattern; shares describe activity, not targets. */
export function sessionWeekPatterns(logs: readonly PlanningLog[], now = new Date()) {
  const groups = new Map<string, { label: string; weeklySets: number }>();
  for (const log of sessionReportLogs(logs, now)) {
    if (!statsHistoryIncludes(log.timestamp, "This week", now)) continue;
    for (const entry of log.entries) {
      const record = entry as unknown as Record<string, unknown>;
      const sets = statsExerciseMetrics(record)!.sets;
      if (sets === 0) continue;
      const label = statsExerciseClassification(record).pattern;
      const key = label.toLowerCase();
      const group = groups.get(key) || { label, weeklySets: 0 };
      group.weeklySets += sets;
      groups.set(key, group);
    }
  }
  return statsSetDistribution([...groups.values()]).sort((a, b) => b.weeklySets - a.weeklySets || a.label.localeCompare(b.label));
}

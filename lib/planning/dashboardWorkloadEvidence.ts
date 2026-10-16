import { activityTimestamp, localDate } from "./dates";
import { statsExerciseMetrics, statsWeekBounds } from "./statsEvidence";
import { workoutLoadInPounds } from "./loadUnitEvidence";
import { unitWorkloadLabel, unitWorkloadSummary } from "./unitWorkload";

/** Recorded external load × reps × sets. No inferred units or volume targets. */
export function dashboardWorkloadEvidence(records: readonly unknown[], now = new Date()) {
  const entries = records.map(value => {
    const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
    const metrics = statsExerciseMetrics(record);
    return { timestamp: activityTimestamp(record.date), sets: metrics?.sets ?? NaN, reps: metrics?.reps ?? NaN, recordedLoadInPounds: metrics ? workoutLoadInPounds(record) : null };
  });
  const weekly = unitWorkloadSummary(entries, "This week", now);
  const lifetime = unitWorkloadSummary(entries, "Lifetime", now);
  const label = (summary: typeof weekly) => summary.volumePounds === null
    ? summary.eligibleEntries ? "Volume unavailable" : "No recorded volume"
    : unitWorkloadLabel(summary, "lb") + (summary.complete ? "" : " (partial)");
  const detail = (summary: typeof weekly) => summary.unknownEntries
    ? `${summary.unknownEntries} entries excluded: review saved loads, units or counts. No volume target set.`
    : "Recorded external load × reps × sets; no volume target set.";
  const start = statsWeekBounds(now).start;
  const rows = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => {
    const date = new Date(start); date.setDate(date.getDate() + index);
    const summary = unitWorkloadSummary(entries.filter(entry => Number.isFinite(entry.timestamp) && localDate(new Date(entry.timestamp)) === localDate(date)), "This week", now);
    return { label: `${day} ${localDate(date)}`, value: label(summary), detail: detail(summary) };
  });
  return { weekly, lifetime, weeklyLabel: label(weekly), lifetimeLabel: label(lifetime), weeklyDetail: detail(weekly), rows };
}

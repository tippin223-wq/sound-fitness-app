import { activityTimestamp, localDate } from "./dates";
import { statsExerciseClassification, statsExerciseMetrics, statsWeekBounds } from "./statsEvidence";
import { exerciseAnatomyRegionVisuals } from "../anatomy/exerciseAnatomyColors";
import { workoutLoadInPounds } from "./loadUnitEvidence";
import { unitWorkloadLabel, unitWorkloadSummary } from "./unitWorkload";

/** Recorded external load × reps × sets. No inferred units or volume targets. */
export function dashboardWorkloadEvidence(records: readonly unknown[], now = new Date()) {
  const entries = records.map(value => {
    const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
    const metrics = statsExerciseMetrics(record);
    const body = statsExerciseClassification(record).bodyPart;
    const category = ["Legs", "Glutes", "Quads", "Hamstrings", "Calves"].includes(body) ? "Legs" : body;
    const color = exerciseAnatomyRegionVisuals[category === "Legs" ? "Glutes/Hips" : category]?.selectedFill ?? "#94a3b8";
    return { timestamp: activityTimestamp(record.date), sets: metrics?.sets ?? NaN, reps: metrics?.reps ?? NaN, recordedLoadInPounds: metrics ? workoutLoadInPounds(record) : null, category, color };
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
  const recordedDates = [...new Set(entries.filter(entry => Number.isFinite(entry.timestamp) && entry.timestamp <= now.getTime()).map(entry => localDate(new Date(entry.timestamp))))];
  const bestDays = recordedDates.map(date => unitWorkloadSummary(entries.filter(entry => localDate(new Date(entry.timestamp)) === date), "Lifetime", now)).filter(summary => summary.complete && summary.volumePounds !== null);
  const bestDailyVolume = bestDays.length ? Math.max(...bestDays.map(summary => summary.volumePounds!)) : null;
  const rows = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => {
    const date = new Date(start); date.setDate(date.getDate() + index);
    const summary = unitWorkloadSummary(entries.filter(entry => Number.isFinite(entry.timestamp) && localDate(new Date(entry.timestamp)) === localDate(date)), "This week", now);
    const dayEntries = entries.filter(entry => Number.isFinite(entry.timestamp) && localDate(new Date(entry.timestamp)) === localDate(date));
    const segments = [...new Set(dayEntries.map(entry => entry.category))].flatMap(category => {
      const group = dayEntries.filter(entry => entry.category === category);
      const volume = unitWorkloadSummary(group, "This week", now).volumePounds;
      return volume !== null && volume > 0 ? [{ category, color: group[0].color, volume }] : [];
    });
    return { label: `${day} ${localDate(date)}`, value: label(summary), detail: detail(summary), segments };
  });
  const recordedWeeks = new Map<string, typeof entries>();
  for (const entry of entries) {
    if (!Number.isFinite(entry.timestamp) || entry.timestamp > now.getTime()) continue;
    const key = localDate(statsWeekBounds(new Date(entry.timestamp)).start);
    const group = recordedWeeks.get(key) ?? [];
    group.push(entry);
    recordedWeeks.set(key, group);
  }
  const validWeekVolumes = [...recordedWeeks.values()].map(group => unitWorkloadSummary(group, "Lifetime", now)).filter(summary => summary.complete && summary.volumePounds !== null).map(summary => summary.volumePounds!);
  const averageWeeklyVolume = validWeekVolumes.length ? validWeekVolumes.reduce((sum, volume) => sum + volume, 0) / validWeekVolumes.length : 0;
  const bestWeeklyVolume = Math.max(0, ...validWeekVolumes);
  const trainingDays = rows.filter(row => row.segments.length > 0).length;
  return { weekly, lifetime, averageWeeklyVolume, bestWeeklyVolume, trainingDays, recordedWeekCount: validWeekVolumes.length, bestDailyVolume, weeklyLabel: label(weekly), lifetimeLabel: label(lifetime), weeklyDetail: detail(weekly), rows };
}

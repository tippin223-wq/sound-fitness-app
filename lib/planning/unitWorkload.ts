import { statsHistoryIncludes } from "./statsEvidence";
import { formatRecordedWorkoutLoad } from "./loadUnitEvidence";

export type UnitWorkloadEntry = { timestamp: number; sets: number; reps: number; recordedLoadInPounds: number | null };

/** Totals cover complete entries with explicit units, not the whole history by assumption. */
export function unitWorkloadSummary(entries: readonly UnitWorkloadEntry[], period: "This week" | "Lifetime", now = new Date()) {
  const relevant = entries.filter(entry => statsHistoryIncludes(entry.timestamp, period, now));
  let knownEntries = 0; let unknownEntries = 0; let pounds = 0; let overflow = false;
  for (const entry of relevant) {
    if (!Number.isSafeInteger(entry.sets) || entry.sets <= 0 || !Number.isSafeInteger(entry.reps) || entry.reps <= 0 || typeof entry.recordedLoadInPounds !== "number" || !Number.isFinite(entry.recordedLoadInPounds) || entry.recordedLoadInPounds < 0) {
      unknownEntries++; continue;
    }
    const volume = entry.recordedLoadInPounds * entry.sets * entry.reps;
    if (!Number.isFinite(volume)) { unknownEntries++; overflow = true; continue; }
    knownEntries++; pounds += volume;
    if (!Number.isFinite(pounds)) overflow = true;
  }
  return { knownEntries, unknownEntries, eligibleEntries: relevant.length, overflow, complete: knownEntries > 0 && unknownEntries === 0 && !overflow, volumePounds: knownEntries > 0 && !overflow ? pounds : null };
}
export type UnitWorkloadSummary = ReturnType<typeof unitWorkloadSummary>;

export function unitWorkloadLabel(summary: UnitWorkloadSummary, unit: "lb" | "kg") {
  return summary.volumePounds === null ? "Unavailable" : formatRecordedWorkoutLoad({ weight: summary.volumePounds, weightUnit: "lb" }, unit) + "·reps";
}

import type { LocalExerciseStatEntry } from "@/types";
import { activityTimestamp } from "./dates";
import { goalNumber } from "./goalNumbers";
import { workoutLoadUnitEvidence } from "./loadUnitEvidence";
import { exerciseSemanticMetadata, validExerciseSemanticMetadata } from "./exerciseSemanticMetadata";

function contentKey(entry: LocalExerciseStatEntry) {
  const date = activityTimestamp(entry.date);
  const numeric = (value: unknown) => goalNumber(value) ?? value;
  return JSON.stringify([
    entry.exerciseId, entry.exerciseName, Number.isFinite(date) ? date : entry.date,
    numeric(entry.weight), numeric(entry.reps), numeric(entry.sets), entry.source || "workout-session",
    entry.body || null, entry.pattern || null, entry.equipment || null,
    workoutLoadUnitEvidence(entry as unknown as Record<string, unknown>),
  ]);
}
export function recordedExerciseSemanticKey(entry: unknown) {
  if (!validExerciseSemanticMetadata(entry)) return null;
  const metadata = exerciseSemanticMetadata(entry);
  return Object.keys(metadata).length ? JSON.stringify(metadata) : "";
}

/** Match copies one occurrence at a time. Never collapse repeats within either source.
 * Cloud rows without variation columns can match recorded content, but cannot supply variation identity.
 * Explicit conflicting or malformed variation evidence stays separate and inspectable.
 */
export function mergeRecordedOccurrences<T>(local: readonly T[], remote: readonly T[], keyOf: (entry: T) => string | null, semanticOf: (entry: T) => string | null) {
  type Bucket = { all: number[]; bySemantic: Map<string, number[]>; cursor: number };
  const buckets = new Map<string, Bucket>();
  local.forEach((entry, index) => {
    const semantic = semanticOf(entry);
    if (semantic === null) return;
    const key = keyOf(entry);
    if (key === null) return;
    const bucket: Bucket = buckets.get(key) || { all: [], bySemantic: new Map(), cursor: 0 };
    bucket.all.push(index);
    const same = bucket.bySemantic.get(semantic) || [];
    same.push(index); bucket.bySemantic.set(semantic, same); buckets.set(key, bucket);
  });
  const consumed = new Set<number>();
  const matched = new Set<number>();
  // Reserve exact variation matches before older cloud rows with no variation information.
  const match = (entry: T, index: number, explicit: boolean) => {
    const semantic = semanticOf(entry);
    if (semantic === null || Boolean(semantic) !== explicit) return;
    const key = keyOf(entry);
    const bucket = key === null ? undefined : buckets.get(key);
    if (!bucket) return;
    let candidate: number | undefined;
    if (explicit) candidate = bucket.bySemantic.get(semantic)?.pop();
    else {
      while (bucket.cursor < bucket.all.length && consumed.has(bucket.all[bucket.cursor])) bucket.cursor++;
      candidate = bucket.all[bucket.cursor++];
    }
    if (candidate !== undefined) { consumed.add(candidate); matched.add(index); }
  };
  remote.forEach((entry, index) => match(entry, index, true));
  remote.forEach((entry, index) => match(entry, index, false));
  return [...local, ...remote.filter((_entry, index) => !matched.has(index))];
}

export function mergeExerciseOccurrences(local: readonly LocalExerciseStatEntry[], remote: readonly LocalExerciseStatEntry[]) {
  return mergeRecordedOccurrences(local, remote, contentKey, recordedExerciseSemanticKey)
    .sort((a, b) => activityTimestamp(b.date) - activityTimestamp(a.date));
}

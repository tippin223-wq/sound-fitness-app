import { activityTimestamp, localDate } from "./dates";
import { statsExerciseMetrics, statsHistoryIncludes } from "./statsEvidence";
import { workoutLoadInPounds, formatRecordedWorkoutLoad } from "./loadUnitEvidence";
import { recordedExerciseSemanticKey } from "./mergeExerciseOccurrences";

// Explicit saved core movement IDs. Isolation movements and name substrings do not qualify.
const lower = new Set(["squat", "hinge", "lunge", "step-up", "hip-thrust-bridge"]);
const upper = new Set(["chest-press", "shoulder-press", "row", "vertical-pull"]);
type Entry = { name: string; key: string; comparable: boolean; pounds: number; reps: number; sets: number; timestamp: number; categoryId: string };
export function dashboardCompoundEvidence(records: readonly unknown[], now = new Date()) {
  const entries: Entry[] = []; let excluded = 0;
  records.forEach((value, occurrence) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) { excluded++; return; }
    const record = value as Record<string, unknown>, timestamp = activityTimestamp(record.date);
    if (!statsHistoryIncludes(timestamp, "Last 30 days", now)) return;
    const core = typeof record.coreMovementPattern === "string" && record.coreMovementPattern.trim() ? record.coreMovementPattern : record.pattern;
    const pattern = typeof core === "string" ? core.trim().toLowerCase() : "";
    if (!lower.has(pattern) && !upper.has(pattern)) { excluded++; return; }
    const metrics = statsExerciseMetrics(record), pounds = workoutLoadInPounds(record), semantic = recordedExerciseSemanticKey(record);
    if (!metrics || metrics.sets <= 0 || metrics.reps <= 0 || pounds === null || semantic === null || typeof record.exerciseName !== "string" || !record.exerciseName.trim()) { excluded++; return; }
    const id = typeof record.exerciseId === "string" ? record.exerciseId.trim() : "", equipment = typeof record.equipment === "string" ? record.equipment.trim() : "";
    const name = record.exerciseName.trim(), comparable = Boolean(id && equipment);
    entries.push({ name, comparable, key: JSON.stringify([id || `occurrence:${occurrence}`, name.toLowerCase(), equipment.toLowerCase(), pattern, semantic, metrics.reps]), pounds, reps: metrics.reps, sets: metrics.sets, timestamp, categoryId: lower.has(pattern) ? "lower-compound" : "upper-compound" });
  });
  const groups = new Map<string, Entry[]>();
  for (const entry of entries) { const group = groups.get(entry.key) || []; group.push(entry); groups.set(entry.key, group); }
  const changes = [...groups.values()].flatMap(group => {
    if (!group[0].comparable) return [];
    const days = new Map<string, Entry>();
    for (const entry of group) { const day = localDate(new Date(entry.timestamp)), best = days.get(day); if (!best || entry.pounds > best.pounds || entry.pounds === best.pounds && entry.timestamp > best.timestamp) days.set(day, entry); }
    const [latest, previous] = [...days.values()].sort((a, b) => b.timestamp - a.timestamp);
    if (!latest || !previous) return [];
    const difference = latest.pounds - previous.pounds;
    const tolerance = Number.EPSILON * Math.max(Math.abs(latest.pounds), Math.abs(previous.pounds)) * 8;
    return [{ latest, previous, delta: Math.abs(difference) <= tolerance ? 0 : difference }];
  }).sort((a, b) => b.latest.timestamp - a.latest.timestamp);
  const best = [...entries].sort((a, b) => b.pounds - a.pounds || b.timestamp - a.timestamp)[0] || null;
  const latest = [...entries].sort((a, b) => b.timestamp - a.timestamp)[0] || null;
  const change = changes[0] || null;
  const load = (pounds: number) => formatRecordedWorkoutLoad({ weight: pounds, weightUnit: "lb" }, "lb");
  const highlight = (entry: Entry | null, detail: string, rank: number, tone: string, value?: string) => {
    const group = entry ? groups.get(entry.key) || [] : [];
    const sets = group.reduce((sum, row) => sum + row.sets, 0), volume = group.reduce((sum, row) => sum + row.pounds * row.reps * row.sets, 0);
    return { categoryId: entry?.categoryId || "integrated", detail, rank, tone, label: entry?.name || "No comparable record", value: value ?? (entry ? load(entry.pounds) : "Unavailable"),
      weightLabel: entry ? load(entry.pounds) : "Load unavailable", repsLabel: entry ? String(entry.reps) : "Not recorded", dateLabel: entry ? localDate(new Date(entry.timestamp)) : "Not recorded",
      setsLabel: entry && Number.isSafeInteger(sets) ? sets.toLocaleString() : "Unavailable", volumeLabel: entry && Number.isFinite(volume) ? load(volume) + "·reps" : "Unavailable",
      windowLabel: `30 days · known-unit records${excluded ? " · some entries excluded" : ""}` };
  };
  const delta = change ? (change.delta > 0 ? "+" : change.delta < 0 ? "−" : "") + load(Math.abs(change.delta)) + ` at ${change.latest.reps} reps` : "Baseline needed";
  return { entries: entries.length, comparisons: changes.length, excluded, highlights: [highlight(best, "Best recorded load", 1, "heavy"), highlight(change?.latest || null, "Matched-rep change", 2, "improved", delta), highlight(latest, "Latest record", 3, "needs")] };
}

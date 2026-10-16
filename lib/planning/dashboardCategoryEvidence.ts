import { MOVEMENT_PATTERNS } from "../exercise-system/patterns/coreMovementPatterns";
import { activityTimestamp } from "./dates";
import { statsExerciseMetrics, statsHistoryIncludes } from "./statsEvidence";
import { validExerciseSemanticMetadata } from "./exerciseSemanticMetadata";

export const dashboardCategoryIds = ["athletic", "cervical", "core", "integrated", "arm-isolation", "lower-compound", "lower-isolation", "mobility", "upper-pull", "upper-push"] as const;
type CategoryId = typeof dashboardCategoryIds[number];
/** Describes explicit recorded movement classifications, never a prescription for missing work. */
export function dashboardCategoryEvidence(records: readonly unknown[], now = new Date()) {
  const result = Object.fromEntries(dashboardCategoryIds.map(id => [id, { label: "Not mapped", recentSets: 0, totalSets: 0, status: "No mapped records", level: null }])) as Record<CategoryId, { label: string; recentSets: number; totalSets: number; status: string; level: null }>;
  const patterns = new Map<CategoryId, Map<string, { label: string; sets: number; latest: number }>>();
  for (const value of records) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const record = value as Record<string, unknown>, timestamp = activityTimestamp(record.date);
    if (!statsHistoryIncludes(timestamp, "Last 30 days", now) || !validExerciseSemanticMetadata(record)) continue;
    const core = typeof record.coreMovementPattern === "string" && record.coreMovementPattern.trim() ? record.coreMovementPattern : record.pattern;
    if (typeof core !== "string") continue;
    const pattern = MOVEMENT_PATTERNS.find(pattern => pattern.id === core.trim().toLowerCase() || pattern.label.toLowerCase() === core.trim().toLowerCase());
    if (!pattern) continue;
    const id = ({ "lower-body-compound": "lower-compound", "lower-body-isolation": "lower-isolation", "cervical-isolation": "cervical" } as Record<string, string>)[pattern.group] || pattern.group;
    if (!dashboardCategoryIds.includes(id as CategoryId)) continue;
    const metrics = statsExerciseMetrics(record);
    if (!metrics || metrics.sets <= 0) continue;
    const category = id as CategoryId, group = patterns.get(category) || new Map();
    const prior = group.get(pattern.id) || { label: pattern.label, sets: 0, latest: timestamp };
    if (!Number.isSafeInteger(prior.sets + metrics.sets)) { result[category].status = "Review recorded counts"; continue; }
    group.set(pattern.id, { label: pattern.label, sets: prior.sets + metrics.sets, latest: Math.max(prior.latest, timestamp) }); patterns.set(category, group);
  }
  for (const [id, group] of patterns) {
    const latest = [...group.values()].sort((a, b) => b.latest - a.latest || a.label.localeCompare(b.label))[0];
    const total = [...group.values()].reduce((sum, pattern) => sum + pattern.sets, 0);
    if (result[id].status === "Review recorded counts" || !Number.isSafeInteger(total)) { result[id].status = "Review recorded counts"; continue; }
    result[id] = { label: latest.label, recentSets: latest.sets, totalSets: total, level: null, status: `${latest.sets} recorded sets · 30 days · mapped records only` };
  }
  return result;
}

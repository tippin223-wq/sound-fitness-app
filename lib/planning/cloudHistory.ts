import { loadWorkoutLogRowsFromSupabase, mapSetLogRowToLocalStatEntry, type WorkoutLogRow, type WorkoutSetLogRow } from "@/lib/data/workoutPersistence";
import type { PlanningLog } from "./logs";
import { activityTimestamp } from "./dates";
import { planningOwner, planningAccountGeneration } from "./store";
import { clearCloudHistory, cloudHistorySnapshot, publishCloudHistory } from "./availableLogs";

let sequence = 0;
let loading: { account: string; generation: number } | null = null;
export function resetCloudWorkoutHistory() { sequence++; loading = null; clearCloudHistory(); }
export function projectCloudWorkoutHistory(logs: WorkoutLogRow[], sets: WorkoutSetLogRow[], now = new Date()): PlanningLog[] {
  const groups = new Map<string, WorkoutSetLogRow[]>();
  sets.forEach(row => { const group = groups.get(row.workout_log_id) || []; group.push(row); groups.set(row.workout_log_id, group); });
  return logs.filter(row => row.status === "completed" && Number.isFinite(activityTimestamp(row.completed_at)) && activityTimestamp(row.completed_at) <= now.getTime()).map(row => ({
    id: row.session_key || `cloud-workout:${row.id}`, cloudLogId: row.id,
    title: row.title || "Untitled saved workout", completedAt: row.completed_at!, startedAt: row.started_at,
    templateId: row.template_client_key || row.workout_template_id, planId: row.plan_id, planDayId: row.plan_day_id, assignmentId: row.assignment_id,
    entries: (groups.get(row.id) || []).filter(set => set.profile_id === row.profile_id).sort((a, b) => a.order_index - b.order_index).map(mapSetLogRowToLocalStatEntry),
    syncedAt: row.updated_at || row.completed_at!,
  }));
}
export async function refreshCloudWorkoutHistory() {
  const account = planningOwner(), generation = planningAccountGeneration();
  if (!account || account === "local-preview" || loading?.account === account && loading.generation === generation) return;
  const request = ++sequence; loading = { account, generation };
  const previous = cloudHistorySnapshot().logs;
  publishCloudHistory(account, previous, "Loading cloud workout history…");
  try {
    const result = await loadWorkoutLogRowsFromSupabase();
    if (request !== sequence || planningOwner() !== account || planningAccountGeneration() !== generation) return;
    if (!result.success) throw new Error(result.error || "Cloud history unavailable");
    publishCloudHistory(account, projectCloudWorkoutHistory(result.data.logs, result.data.setLogs), "Cloud workout history updated.");
  } catch {
    if (request === sequence && planningOwner() === account && planningAccountGeneration() === generation) publishCloudHistory(account, previous, previous.length ? "Cloud history unavailable. Showing the last loaded cloud records and saved planning records." : "Cloud history unavailable. Showing saved planning records.");
  } finally { if (request === sequence) loading = null; }
}

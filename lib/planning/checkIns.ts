import { captureDevicePlanningRecovery, planningRecordVersion, planningAccountGeneration, planningOwner, planningSnapshot, planningStatus, readPlanning, writePlanning, writePlanningValues } from "./store";
import { localDate } from "./dates";
import { validatePlanningImport } from "./importValidation";

export const WEEKLY_CHECK_INS_KEY = "soundFitnessWeeklyCheckIns";
export const WEEKLY_CHECK_IN_DRAFTS_KEY = "soundFitnessWeeklyCheckInDrafts";
export const CHECK_IN_HABITS = ["Completed planned workouts", "Hit protein / nutrition targets", "Did mobility or recovery work", "Got enough steps or light movement", "Logged pain, soreness, or notes honestly"];
export type WeeklyCheckIn = {
  id: string; weekStart: string; savedAt: string;
  energy: number; sleep: number; stress: number; soreness: number;
  habits: string[]; notes: string;
};
export type WeeklyCheckInDraft = {
  energy: number | null; sleep: number | null; stress: number | null; soreness: number | null;
  habits: string[]; notes: string;
};
export type RecoverableCheckInDraft = WeeklyCheckInDraft & { weekStart: string; baseVersion: string | null };
const EMPTY_DRAFTS: Record<string, RecoverableCheckInDraft> = {};
export function requireValidWeeklyCheckInRecords() {
  const values = planningSnapshot();
  const history = Object.hasOwn(values, WEEKLY_CHECK_INS_KEY) ? values[WEEKLY_CHECK_INS_KEY] : [];
  const drafts = Object.hasOwn(values, WEEKLY_CHECK_IN_DRAFTS_KEY) ? values[WEEKLY_CHECK_IN_DRAFTS_KEY] : EMPTY_DRAFTS;
  if (!Array.isArray(history) || !drafts || typeof drafts !== "object" || Array.isArray(drafts) || validatePlanningImport({ [WEEKLY_CHECK_INS_KEY]: history, [WEEKLY_CHECK_IN_DRAFTS_KEY]: drafts })) throw new Error("Saved weekly check-in records need review before changing answers. Original check-ins and recoverable drafts are preserved.");
  return { history: history as WeeklyCheckIn[], drafts: drafts as Record<string, RecoverableCheckInDraft> };
}
export function inspectWeeklyCheckInRecords() {
  if (captureDevicePlanningRecovery().blocked) return { history: [] as WeeklyCheckIn[], drafts: EMPTY_DRAFTS, issue: "Device planning data needs recovery. Export the preserved originals before making changes. Weekly check-in summaries are paused." };
  try { return { ...requireValidWeeklyCheckInRecords(), issue: "" }; }
  catch { return { history: [] as WeeklyCheckIn[], drafts: EMPTY_DRAFTS, issue: "Saved weekly check-in records need review. Export the originals before making changes. Weekly check-in summaries are paused; original feedback and unfinished drafts are preserved." }; }
}
export const weeklyCheckInRecordsVersion = () => JSON.stringify({ historyPresent: Object.hasOwn(planningSnapshot(), WEEKLY_CHECK_INS_KEY), history: planningRecordVersion(WEEKLY_CHECK_INS_KEY), draftsPresent: Object.hasOwn(planningSnapshot(), WEEKLY_CHECK_IN_DRAFTS_KEY), drafts: planningRecordVersion(WEEKLY_CHECK_IN_DRAFTS_KEY), deviceCache: captureDevicePlanningRecovery() });
export function exportWeeklyCheckInRecords(expected: string, account: string | null, generation: number) {
  if (!account || planningOwner() !== account || planningAccountGeneration() !== generation) throw new Error("Your account changed. Reload the page before exporting check-ins.");
  if (weeklyCheckInRecordsVersion() !== expected) throw new Error("Weekly check-ins or unfinished drafts changed. Review the current originals before exporting.");
  const values = planningSnapshot();
  return JSON.stringify({ schemaVersion: 1, source: "Sound Fitness weekly check-in recovery", history: Object.hasOwn(values, WEEKLY_CHECK_INS_KEY) ? values[WEEKLY_CHECK_INS_KEY] : [], drafts: Object.hasOwn(values, WEEKLY_CHECK_IN_DRAFTS_KEY) ? values[WEEKLY_CHECK_IN_DRAFTS_KEY] : {}, deviceCache: captureDevicePlanningRecovery() }, null, 2);
}
export const readWeeklyCheckInDrafts = () => readPlanning<Record<string, RecoverableCheckInDraft>>(WEEKLY_CHECK_IN_DRAFTS_KEY, EMPTY_DRAFTS);
export const readWeeklyCheckInDraft = (week: string) => readWeeklyCheckInDrafts()[week] ?? null;
export const weeklyDraftVersion = (week: string) => JSON.stringify(readWeeklyCheckInDraft(week));
function verifyDraftEditor(week: string, expected: string, account: string | null, generation: number) {
  if (!account || planningOwner() !== account || planningAccountGeneration() !== generation) throw new Error("Your account changed. Reload the page before saving the check-in.");
  if (planningStatus.startsWith("Sync conflict")) throw new Error("Resolve the account sync conflict above. Your answers remain here; copy them before replacing this device's data.");
  requireValidWeeklyCheckInRecords();
  if (weeklyDraftVersion(week) !== expected) throw new Error("The recoverable draft changed in another tab. Your answers remain here; copy them before reloading.");
}
export function saveWeeklyCheckInDraft(draft: WeeklyCheckInDraft, week: string, expected: string, baseVersion: string | undefined, account: string | null, generation: number, now = new Date()) {
  verifyDraftEditor(week, expected, account, generation);
  if (week !== checkInWeek(now)) throw new Error("The week changed. Copy your answers before loading the current week.");
  if (checkInVersion(week) !== baseVersion) throw new Error("The saved check-in changed in another tab. Copy your answers before loading saved answers.");
  validateCheckInAnswers(draft, true);
  const saved: RecoverableCheckInDraft = { ...readWeeklyCheckInDraft(week), ...draft, habits: [...new Set(draft.habits)], weekStart: week, baseVersion: baseVersion ?? null };
  writePlanning(WEEKLY_CHECK_IN_DRAFTS_KEY, { ...readWeeklyCheckInDrafts(), [week]: saved });
  return JSON.stringify(saved);
}
export function discardWeeklyCheckInDraft(week: string, expected: string, account: string | null, generation: number) {
  verifyDraftEditor(week, expected, account, generation);
  const remaining = { ...readWeeklyCheckInDrafts() }; delete remaining[week];
  writePlanning(WEEKLY_CHECK_IN_DRAFTS_KEY, remaining);
}
function validateCheckInAnswers(draft: WeeklyCheckInDraft, partial = false) {
  for (const field of ["energy", "sleep", "stress", "soreness"] as const) {
    if (partial && draft[field] === null) continue;
    if (!Number.isInteger(draft[field]) || Number(draft[field]) < 1 || Number(draft[field]) > 10) throw new Error("Rate energy, sleep, stress, and soreness from 1 to 10 before saving.");
  }
  if (typeof draft.notes !== "string" || draft.notes.length > 4000) throw new Error("Keep notes to 4,000 characters or fewer.");
  if (!Array.isArray(draft.habits) || draft.habits.some(habit => !CHECK_IN_HABITS.includes(habit))) throw new Error("Choose habits from the check-in list.");
}
export function checkInWeek(now = new Date()) {
  const monday = new Date(now);
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return localDate(monday);
}
const EMPTY_CHECK_INS: WeeklyCheckIn[] = [];
export const readWeeklyCheckIns = () => readPlanning<WeeklyCheckIn[]>(WEEKLY_CHECK_INS_KEY, EMPTY_CHECK_INS);
export const currentWeeklyCheckIn = (week = checkInWeek()) => readWeeklyCheckIns().find(item => item.weekStart === week);
export const checkInVersion = (week: string) => {
  const item = currentWeeklyCheckIn(week);
  // JSONB may reorder object keys; that must not invalidate an unchanged draft baseline.
  return JSON.stringify(item && { id: item.id, weekStart: item.weekStart, savedAt: item.savedAt, energy: item.energy, sleep: item.sleep, stress: item.stress, soreness: item.soreness, habits: item.habits, notes: item.notes });
};
export const emptyCheckIn = (): WeeklyCheckInDraft => ({ energy: null, sleep: null, stress: null, soreness: null, habits: [], notes: "" });
export function checkInReadiness(draft: WeeklyCheckInDraft) {
  const { energy, sleep, stress, soreness } = draft;
  if ([energy, sleep, stress, soreness].some(value => value == null)) return null;
  return Math.round((energy! + sleep! + 10 - stress! + 10 - soreness!) / 4);
}
/** Weekly feedback stays separate from the website's 30-day check-in workflow. */
export function saveWeeklyCheckIn(draft: WeeklyCheckInDraft, week: string, expectedVersion: string | undefined, now = new Date(), editor?: { account: string | null; generation: number; draftVersion: string }) {
  if (editor) verifyDraftEditor(week, editor.draftVersion, editor.account, editor.generation);
  if (planningStatus.startsWith("Sync conflict")) throw new Error("Resolve the account sync conflict above before saving. Your answers remain here.");
  requireValidWeeklyCheckInRecords();
  if (week !== checkInWeek(now)) throw new Error("The week changed. Reload this week's check-in before saving.");
  if (checkInVersion(week) !== expectedVersion) throw new Error("This week's check-in changed in another tab. Reload it before saving; your answers remain here.");
  validateCheckInAnswers(draft);
  const existing = currentWeeklyCheckIn(week);
  const saved: WeeklyCheckIn = { ...existing, id: existing?.id || crypto.randomUUID(), weekStart: week, savedAt: now.toISOString(), energy: draft.energy!, sleep: draft.sleep!, stress: draft.stress!, soreness: draft.soreness!, habits: [...new Set(draft.habits)], notes: draft.notes.trim() };
  const remaining = { ...readWeeklyCheckInDrafts() }; delete remaining[week];
  writePlanningValues({ [WEEKLY_CHECK_INS_KEY]: [saved, ...readWeeklyCheckIns().filter(item => item.weekStart !== week)], ...(editor ? { [WEEKLY_CHECK_IN_DRAFTS_KEY]: remaining } : {}) });
  return saved;
}

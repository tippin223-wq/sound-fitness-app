import { captureDevicePlanningRecovery, planningRecordVersion, planningSnapshot, planningAccountGeneration, planningOwner, planningStatus, readPlanning, writePlanning, writePlanningValues } from "./store";

import { validatePlanningImport } from "./importValidation";

export const PAIN_LOGS_KEY = "soundFitnessPainLogs";
export const PAIN_DRAFT_KEY = "soundFitnessPainDraft";
export type PainDraft = { id: string; level: number | null; area: string; notes: string };
function originalPainRecords() {
  const values = planningSnapshot();
  return { logs: Object.hasOwn(values, PAIN_LOGS_KEY) ? values[PAIN_LOGS_KEY] : [], draft: Object.hasOwn(values, PAIN_DRAFT_KEY) ? values[PAIN_DRAFT_KEY] : null };
}
export function requireValidPainRecords() {
  const records = originalPainRecords();
  if (!Array.isArray(records.logs) || records.draft !== null && (!records.draft || typeof records.draft !== "object" || Array.isArray(records.draft)) || validatePlanningImport({ [PAIN_LOGS_KEY]: records.logs, [PAIN_DRAFT_KEY]: records.draft })) throw new Error("Saved pain records need review before changing reports. Original reports and draft answers are preserved.");
  return { logs: records.logs as PainLog[], draft: records.draft as PainDraft | null };
}
export function inspectPainRecords() {
  if (captureDevicePlanningRecovery().blocked) return { logs: [] as PainLog[], draft: null, issue: "Device planning data needs recovery. Export the preserved originals before making changes. Pain report history is paused." };
  try { return { ...requireValidPainRecords(), issue: "" }; }
  catch { return { logs: [] as PainLog[], draft: null, issue: "Saved pain records need review. Export the originals before making changes. Pain report history is paused; original reports and unfinished answers are preserved." }; }
}
export const painRecordsVersion = () => JSON.stringify({ logsPresent: Object.hasOwn(planningSnapshot(), PAIN_LOGS_KEY), logs: planningRecordVersion(PAIN_LOGS_KEY), draftPresent: Object.hasOwn(planningSnapshot(), PAIN_DRAFT_KEY), draft: planningRecordVersion(PAIN_DRAFT_KEY), deviceCache: captureDevicePlanningRecovery() });
export function exportPainRecords(expected: string, account: string | null, generation: number) {
  if (!account || account !== planningOwner() || generation !== planningAccountGeneration()) throw new Error("Your account changed. Reload pain tracking before exporting.");
  if (painRecordsVersion() !== expected) throw new Error("Pain reports or saved draft changed. Review the current originals before exporting.");
  return JSON.stringify({ schemaVersion: 1, source: "Sound Fitness pain report recovery", ...originalPainRecords(), deviceCache: captureDevicePlanningRecovery() }, null, 2);
}
export const readPainDraft = () => readPlanning<PainDraft | null>(PAIN_DRAFT_KEY, null);
export const painDraftVersion = () => {
  const draft = readPainDraft();
  return JSON.stringify(draft && { id: draft.id, level: draft.level, area: draft.area, notes: draft.notes });
};
function verifyDraft(expected: string, account: string | null, generation: number) {
  if (!account || account !== planningOwner() || generation !== planningAccountGeneration()) throw new Error("Your account changed. Reload pain tracking before saving.");
  if (planningStatus.startsWith("Sync conflict")) throw new Error("Resolve the account sync conflict above. Your answers remain here; copy them before replacing this device's data.");
  requireValidPainRecords();
  if (painDraftVersion() !== expected) throw new Error("The saved draft changed in another tab. Your answers remain here; copy them before reloading the draft.");
}
export function savePainDraft(draft: PainDraft, expected: string, account: string | null, generation: number) {
  verifyDraft(expected, account, generation);
  if (typeof draft.id !== "string" || !draft.id.trim()) throw new Error("Reload pain tracking before saving this draft.");
  if (draft.level !== null && (!Number.isInteger(draft.level) || draft.level < 0 || draft.level > 10)) throw new Error("Choose a pain rating from 0 to 10.");
  if (typeof draft.area !== "string" || draft.area.length > 80) throw new Error("Keep the body area to 80 characters or fewer.");
  if (typeof draft.notes !== "string" || draft.notes.length > 4000) throw new Error("Keep notes to 4,000 characters or fewer.");
  writePlanning(PAIN_DRAFT_KEY, { ...readPainDraft(), ...draft });
  return painDraftVersion();
}
export function clearPainDraft(expected: string, account: string | null, generation: number) {
  verifyDraft(expected, account, generation); writePlanning(PAIN_DRAFT_KEY, null);
}
export type PainLog = { id: string; level: number; area: string; notes: string; recordedAt: string };
const EMPTY_LOGS: PainLog[] = [];
export const readPainLogs = () => readPlanning<PainLog[]>(PAIN_LOGS_KEY, EMPTY_LOGS);
export function savePainLog(input: PainDraft, account: string | null, generation: number, now = new Date(), expectedDraft?: string) {
  if (expectedDraft !== undefined) {
    verifyDraft(expectedDraft, account, generation);
    if (readPainDraft() && readPainDraft()?.id !== input.id) throw new Error("This draft belongs to a different report. Reload before saving.");
  }
  if (!account || account !== planningOwner() || generation !== planningAccountGeneration()) throw new Error("Your account changed. Reload pain tracking before saving.");
  if (planningStatus.startsWith("Sync conflict")) throw new Error("Resolve the account sync conflict above before saving. Your report remains here.");
  requireValidPainRecords();
  if (typeof input.id !== "string" || !input.id.trim()) throw new Error("Reload pain tracking before saving this report.");
  if (!Number.isInteger(input.level) || Number(input.level) < 0 || Number(input.level) > 10) throw new Error("Choose a pain rating from 0 to 10 before saving.");
  if (typeof input.area !== "string" || !input.area.trim() || input.area.trim().length > 80) throw new Error("Enter a body area (up to 80 characters), or choose No specific area.");
  if (typeof input.notes !== "string" || input.notes.length > 4000) throw new Error("Keep notes to 4,000 characters or fewer.");
  const logs = readPainLogs();
  const existing = logs.find(log => log.id === input.id);
  const content = { level: input.level!, area: input.area.trim(), notes: input.notes.trim() };
  if (existing) {
    if (existing.level !== content.level || existing.area !== content.area || existing.notes !== content.notes) throw new Error("This report was already saved with different answers. Reload before saving again.");
    if (expectedDraft !== undefined) writePlanning(PAIN_DRAFT_KEY, null);
    return existing;
  }
  const log: PainLog = { id: input.id, ...content, recordedAt: now.toISOString() };
  writePlanningValues({ [PAIN_LOGS_KEY]: [log, ...logs], ...(expectedDraft !== undefined ? { [PAIN_DRAFT_KEY]: null } : {}) });
  return log;
}

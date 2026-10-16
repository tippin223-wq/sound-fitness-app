import { captureDevicePlanningRecovery, planningRecordVersion, planningSnapshot, planningAccountGeneration, planningOwner, planningStatus, readPlanning, writePlanning, writePlanningValues } from "./store";

import { validatePlanningImport } from "./importValidation";

export const JOURNAL_KEY = "soundFitnessJournalEntries";
export const JOURNAL_DRAFT_KEY = "soundFitnessJournalDraft";
export type JournalEntry = { id: string; text: string; createdAt: string };
export type JournalDraft = { id: string; text: string };
const EMPTY_ENTRIES: JournalEntry[] = [];
function originalJournalRecords() {
  const values = planningSnapshot();
  return { entries: Object.hasOwn(values, JOURNAL_KEY) ? values[JOURNAL_KEY] : EMPTY_ENTRIES, draft: Object.hasOwn(values, JOURNAL_DRAFT_KEY) ? values[JOURNAL_DRAFT_KEY] : null };
}
export function requireValidJournalRecords() {
  const records = originalJournalRecords();
  if (!Array.isArray(records.entries) || records.draft !== null && (!records.draft || typeof records.draft !== "object" || Array.isArray(records.draft)) || validatePlanningImport({ [JOURNAL_KEY]: records.entries, [JOURNAL_DRAFT_KEY]: records.draft })) throw new Error("Saved journal records need review before saving. Original entries and draft text are preserved.");
  return { entries: records.entries as JournalEntry[], draft: records.draft as JournalDraft | null };
}
export function inspectJournalRecords() {
  if (captureDevicePlanningRecovery().blocked) return { entries: EMPTY_ENTRIES, draft: null, issue: "Device planning data needs recovery. Export the preserved originals before making changes. Journal history is paused." };
  try { return { ...requireValidJournalRecords(), issue: "" }; }
  catch { return { entries: EMPTY_ENTRIES, draft: null, issue: "Saved journal records need review. Export the originals before making changes. Journal history is paused; original entries and unfinished text are preserved." }; }
}
export const journalRecordsVersion = () => JSON.stringify({ entriesPresent: Object.hasOwn(planningSnapshot(), JOURNAL_KEY), entries: planningRecordVersion(JOURNAL_KEY), draftPresent: Object.hasOwn(planningSnapshot(), JOURNAL_DRAFT_KEY), draft: planningRecordVersion(JOURNAL_DRAFT_KEY), deviceCache: captureDevicePlanningRecovery() });
export function exportJournalRecords(expected: string, account: string | null, generation: number) {
  if (!account || account !== planningOwner() || planningAccountGeneration() !== generation) throw new Error("Your account changed. Reload the journal before exporting.");
  if (journalRecordsVersion() !== expected) throw new Error("Journal entries or saved draft changed. Review the current originals before exporting.");
  return JSON.stringify({ schemaVersion: 1, source: "Sound Fitness journal recovery", ...originalJournalRecords(), deviceCache: captureDevicePlanningRecovery() }, null, 2);
}
export const readJournalEntries = () => readPlanning<JournalEntry[]>(JOURNAL_KEY, EMPTY_ENTRIES);
export const readJournalDraft = () => readPlanning<JournalDraft | null>(JOURNAL_DRAFT_KEY, null);
export const journalDraftVersion = () => JSON.stringify(readJournalDraft());
function verifyEditor(account: string | null, expected: string, generation: number) {
  if (!account || account !== planningOwner() || planningAccountGeneration() !== generation) throw new Error("Your account changed. Reload the journal before saving.");
  if (planningStatus.startsWith("Sync conflict")) throw new Error("Resolve the account sync conflict above before saving. Your text remains here; copy it before replacing this device's data.");
  requireValidJournalRecords();
  if (journalDraftVersion() !== expected) throw new Error("The saved draft changed in another tab. Your text remains here; copy it before reloading the saved draft.");
}
function verifyText(text: string) {
  if (typeof text !== "string" || text.length > 10000) throw new Error("Keep journal entries to 10,000 characters or fewer.");
}
export function saveJournalDraft(draft: JournalDraft, expected: string, account: string | null, generation: number) {
  verifyEditor(account, expected, generation); verifyText(draft.text);
  if (typeof draft.id !== "string" || !draft.id.trim()) throw new Error("Reload the journal before saving this draft.");
  const saved = { ...readJournalDraft(), ...draft };
  writePlanning(JOURNAL_DRAFT_KEY, saved);
  return JSON.stringify(saved);
}
/** Save history and clear only this editor's draft in one storage transaction. */
export function saveJournalEntry(draft: JournalDraft, expected: string, account: string | null, generation: number, now = new Date()) {
  verifyEditor(account, expected, generation); verifyText(draft.text);
  const text = draft.text.trim();
  if (!text || typeof draft.id !== "string" || !draft.id.trim()) throw new Error("Write an entry before saving.");
  const entries = readJournalEntries();
  const existing = entries.find(item => item.id === draft.id);
  if (existing && existing.text !== text) throw new Error("This entry was already saved with different text. Reload the journal before saving again.");
  const entry = existing || { id: draft.id, text, createdAt: now.toISOString() };
  writePlanningValues({ [JOURNAL_KEY]: existing ? entries : [entry, ...entries], [JOURNAL_DRAFT_KEY]: null });
  return entry;
}

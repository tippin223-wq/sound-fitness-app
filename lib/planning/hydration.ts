import { captureDevicePlanningRecovery, planningAccountGeneration, planningOwner, planningRecordVersion, planningSnapshot, planningStatus, readPlanning, writePlanning, writePlanningValues } from "./store";
import { localDate, validDateOnly } from "./dates";
import { validatePlanningImport } from "./importValidation";

export const HYDRATION_KEY = "soundFitnessHydrationEntries";
export const WATER_DRAFT_KEY = "soundFitnessHydrationDraft";
export type WaterUnit = "ml" | "us-fl-oz";
export type WaterDraft = { id: string; date: string; amount: string; unit: WaterUnit; notes: string; baseVersion: string | null };
export const readWaterDraft = () => readPlanning<WaterDraft | null>(WATER_DRAFT_KEY, null);
function supportedWaterDraft(value: unknown): value is WaterDraft {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && !validatePlanningImport({ [WATER_DRAFT_KEY]: value }));
}
export function inspectWaterDraft() {
  const value = planningSnapshot()[WATER_DRAFT_KEY];
  if (value == null) return { draft: null, issue: "" };
  return supportedWaterDraft(value) ? { draft: value, issue: "" } : { draft: null, issue: "Saved water draft needs review. Export water history to preserve its original values before explicitly discarding it. Saved drinks remain available." };
}
export const waterDraftVersion = () => {
  const draft = readWaterDraft();
  if (draft !== null && !supportedWaterDraft(draft)) return planningRecordVersion(WATER_DRAFT_KEY);
  return JSON.stringify(draft && { id: draft.id, date: draft.date, amount: draft.amount, unit: draft.unit, notes: draft.notes, baseVersion: draft.baseVersion });
};
export type WaterInput = { id: string; date: string; amount: number; unit: WaterUnit; notes: string };
export type WaterEntry = WaterInput & { recordedAt: string; updatedAt: string };
const EMPTY: WaterEntry[] = [];
export const readWaterEntries = () => readPlanning<WaterEntry[]>(HYDRATION_KEY, EMPTY);
const originalWaterHistory = () => Object.hasOwn(planningSnapshot(), HYDRATION_KEY) ? planningSnapshot()[HYDRATION_KEY] : EMPTY;
function supportedWaterHistory(value: unknown): value is WaterEntry[] {
  return Array.isArray(value) && !validatePlanningImport({ [HYDRATION_KEY]: value });
}
export function requireValidWaterHistory(): WaterEntry[] {
  const entries = originalWaterHistory();
  if (!supportedWaterHistory(entries)) throw new Error("Saved water history needs review before changing entries. Original water records and the current draft are preserved.");
  return entries;
}
export function inspectWaterHistory() {
  const entries = originalWaterHistory();
  if (captureDevicePlanningRecovery().blocked) return { entries: EMPTY, issue: "Device planning data needs recovery. Export the preserved originals before making changes. Water totals are paused." };
  return supportedWaterHistory(entries) ? { entries, issue: "" } : { entries: EMPTY, issue: "Saved water history needs review. Export the originals before making changes. Water totals are paused; original drinks and the saved draft are preserved." };
}
export const waterHistoryVersion = () => JSON.stringify({ present: Object.hasOwn(planningSnapshot(), HYDRATION_KEY), entries: planningRecordVersion(HYDRATION_KEY), draftPresent: Object.hasOwn(planningSnapshot(), WATER_DRAFT_KEY), draft: planningRecordVersion(WATER_DRAFT_KEY), deviceCache: captureDevicePlanningRecovery() });
export function exportWaterHistory(expected: string, account: string | null, generation: number) {
  verifyAccount(account, generation);
  if (waterHistoryVersion() !== expected) throw new Error("Water history or the saved draft changed. Review the current originals before exporting.");
  return JSON.stringify({ schemaVersion: 1, source: "Sound Fitness water history recovery", entries: originalWaterHistory(), draft: planningSnapshot()[WATER_DRAFT_KEY] ?? null, deviceCache: captureDevicePlanningRecovery() }, null, 2);
}
export const waterMillilitres = (amount: number, unit: WaterUnit) => amount * (unit === "us-fl-oz" ? 29.5735295625 : 1);
export function waterVersion(id: string) {
  const entry = readWaterEntries().find(item => item.id === id);
  return JSON.stringify(entry && { id: entry.id, date: entry.date, amount: entry.amount, unit: entry.unit, notes: entry.notes, recordedAt: entry.recordedAt, updatedAt: entry.updatedAt });
}
function verifyAccount(account: string | null, generation: number) {
  if (!account || planningOwner() !== account || planningAccountGeneration() !== generation) throw new Error("Your account changed. Reload water entries before saving.");
}
function verify(account: string | null, generation: number) {
  verifyAccount(account, generation);
  if (planningStatus.startsWith("Sync conflict")) throw new Error("Resolve the account sync conflict above before changing water entries.");
}
function verifyDraft(expected: string, account: string | null, generation: number) {
  verify(account, generation);
  if (waterDraftVersion() !== expected) throw new Error("The saved water draft changed in another tab. Copy your form before reloading the draft.");
}
export function saveWaterDraft(draft: WaterDraft, expected: string, account: string | null, generation: number) {
  verifyDraft(expected, account, generation);
  if (inspectWaterDraft().issue) throw new Error("Saved water draft needs review. Export it before explicitly discarding it; the original draft is preserved.");
  requireValidWaterHistory();
  if (!supportedWaterDraft(draft)) throw new Error("This water draft has unsupported fields. Your form remains here.");
  if (waterVersion(draft.id) !== (draft.baseVersion ?? undefined)) throw new Error("The water entry changed. Copy your correction before discarding the draft and opening the latest entry.");
  writePlanning(WATER_DRAFT_KEY, draft); return waterDraftVersion();
}
export function clearWaterDraft(expected: string, account: string | null, generation: number) {
  verifyDraft(expected, account, generation); writePlanning(WATER_DRAFT_KEY, null);
}
export function saveWaterEntry(input: WaterInput, expected: string | undefined, account: string | null, generation: number, now = new Date(), expectedDraft?: string) {
  verify(account, generation);
  const entries = requireValidWaterHistory();
  if (expectedDraft !== undefined) {
    verifyDraft(expectedDraft, account, generation);
    if (inspectWaterDraft().issue) throw new Error("Saved water draft needs review. Export it before explicitly discarding it; saved drinks are unchanged.");
    const draft = readWaterDraft();
    if (draft && (draft.id !== input.id || (draft.baseVersion ?? undefined) !== expected)) throw new Error("This draft belongs to another water entry or revision. Reload it before saving.");
  }
  if (!input.id.trim() || !validDateOnly(input.date) || input.date > localDate(now)) throw new Error("Choose a real local date through today.");
  if (!["ml", "us-fl-oz"].includes(input.unit) || !Number.isFinite(input.amount) || input.amount <= 0 || waterMillilitres(input.amount, input.unit) < 1 || waterMillilitres(input.amount, input.unit) > 10000) throw new Error("Enter a positive water amount from 1 to 10,000 ml (or its US fluid ounce equivalent) per entry.");
  if (typeof input.notes !== "string" || input.notes.length > 1000) throw new Error("Keep notes to 1,000 characters.");
  const current = entries.find(item => item.id === input.id);
  const clean = { ...input, notes: input.notes.trim() };
  // A retry of the same add must not record the same drink twice.
  if (expected === undefined && current && current.date === clean.date && current.amount === clean.amount && current.unit === clean.unit && current.notes === clean.notes) {
    if (expectedDraft !== undefined) writePlanning(WATER_DRAFT_KEY, null);
    return current;
  }
  if (waterVersion(input.id) !== expected) throw new Error("This water entry changed. Review the latest record before saving.");
  const saved: WaterEntry = { ...current, ...clean, recordedAt: current?.recordedAt || now.toISOString(), updatedAt: now.toISOString() };
  writePlanningValues({ [HYDRATION_KEY]: [...entries.filter(item => item.id !== input.id), saved], ...(expectedDraft !== undefined ? { [WATER_DRAFT_KEY]: null } : {}) }); return saved;
}
export function removeWaterEntry(id: string, expected: string | undefined, account: string | null, generation: number) {
  verify(account, generation);
  const entries = requireValidWaterHistory();
  if (waterVersion(id) !== expected) throw new Error("This water entry changed. Review the latest record before removing it.");
  writePlanning(HYDRATION_KEY, entries.filter(item => item.id !== id));
}
export function waterTotals(entries: WaterEntry[], through: string) {
  if (!validDateOnly(through)) throw new Error("Choose a real date.");
  const first = new Date(`${through}T12:00:00`); first.setDate(first.getDate() - 6);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(first); date.setDate(date.getDate() + index); const day = localDate(date);
    const reported = entries.filter(entry => entry.date === day);
    return { date: day, count: reported.length, millilitres: reported.reduce((sum, entry) => sum + waterMillilitres(entry.amount, entry.unit), 0) };
  });
}

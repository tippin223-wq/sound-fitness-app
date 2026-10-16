import { supabase } from "@/lib/supabaseClient";
import { validatePlanningImport } from "./importValidation";
import { backendSyncIssue } from "./backendSyncIssue";
const backendFailureStatus = (cause: unknown) => backendSyncIssue(cause, "planning")?.message || "Saved locally · cloud unavailable; Retry sync";

export const PLANNING_UPDATED = "soundFitnessPlanningUpdated";
export const planningKeys = {
  goals: "soundFitnessGoals", plans: "soundFitnessWorkoutPlans",
  active: "soundFitnessActiveWorkoutPlanId", context: "soundFitnessActiveWorkoutSessionContext",
  logs: "soundFitnessPlanningLogs", calendar: "soundFitnessPlanningCalendar",
  templates: "soundFitnessWorkoutBuilderSavedTemplates", profile: "soundFitnessProfile",
  selectedExercises: "soundFitnessWorkoutBuilderSelectedExercises",
  builderDraft: "soundFitnessDraftWorkout",
  exerciseStats: "soundFitnessExerciseStats", customExercises: "soundFitnessCustomExercises",
  phases: "soundFitnessPhases",
  dashboardCalendar: "soundFitnessDashboardCalendarEntries",
  nutritionLibrary: "soundFitnessNutritionLibrary", nutritionDraft: "soundFitnessNutritionPlan",
  recoveryLibrary: "soundFitnessRecoveryLibrary", recoveryDraft: "soundFitnessRecoveryPlan",
  mobilityLibrary: "soundFitnessMobilityLibrary",
  performanceLibrary: "soundFitnessPerformanceLibrary", performanceDraft: "soundFitnessPerformancePlan",
  libraryFavorites: "soundFitnessFavorites",
  hydration: "soundFitnessHydrationEntries",
  hydrationDraft: "soundFitnessHydrationDraft",
  meals: "soundFitnessMealEntries", mealDraft: "soundFitnessMealDraft",
  mealTemplates: "soundFitnessMealTemplates",
} as const;
type Cache = { values: Record<string, unknown>; revision: number; dirty: boolean };
let owner: string | null = null;
let cache: Cache = { values: {}, revision: 0, dirty: false };
let generation = 0;
let savingGeneration: number | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let cacheNeedsRecovery = false;
let dataIssue: string | null = null;
let persistedText: string | null = null;
export let planningStatus = "Loading planning data…";
export let legacyAvailable = false;
const cacheKey = () => `soundFitnessPlanning:v1:${owner}`;
const announce = () => {
  window.dispatchEvent(new Event(PLANNING_UPDATED));
  window.dispatchEvent(new Event("soundFitnessProfileUpdated"));
};
class DevicePlanningConflict extends Error {
  constructor() { super("Device planning data changed in another tab. This tab and newer device originals are preserved. Export a planning backup and reload or resolve the conflict before saving."); }
}
const deviceConflictStatus = "Sync conflict · device planning changed; export backup and reload or resolve";
const assertDeviceCurrent = () => { if (window.localStorage.getItem(cacheKey()) !== persistedText) throw new DevicePlanningConflict(); };
/** Stop mutations from a stale device source even before its storage event is delivered. */
export function assertPlanningDeviceCurrent() {
  if (!owner) throw new Error("Planning data is still loading. Try again.");
  if (cacheNeedsRecovery) throw new Error("Device planning data needs recovery. The original is preserved; review it before uploading.");
  try { assertDeviceCurrent(); }
  catch (cause) {
    if (cause instanceof DevicePlanningConflict) { planningStatus = deviceConflictStatus; clearTimeout(timer); announce(); }
    throw cause;
  }
}
const persist = () => {
  assertDeviceCurrent();
  const text = JSON.stringify(cache);
  window.localStorage.setItem(cacheKey(), text);
  persistedText = text;
};
const storedValue = (key: string) => { try { return window.localStorage.getItem(key); } catch { return null; } };
const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
function parseCache(value: unknown): Cache | null {
  if (!object(value) || !object(value.values) || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0 || typeof value.dirty !== "boolean") return null;
  if (validatePlanningImport(value.values)) return null;
  return { values: value.values, revision: Number(value.revision), dirty: value.dirty };
}
const invalidCloud = "Data needs review · cloud planning records are invalid; local data preserved. Retry sync";
export const planningOwner = () => owner;
/** Invalidates async work even when an account switches away and back. */
export const planningAccountGeneration = () => generation;
export const planningSnapshot = (): Readonly<Record<string, unknown>> => cache.values;
/** Read only the current owner's damaged cache; never enumerate or claim legacy/browser data. */
export const captureDevicePlanningRecovery = () => ({ blocked: cacheNeedsRecovery, originalText: cacheNeedsRecovery && owner ? storedValue(cacheKey()) : null });
/** Export only this account's current planning document; never enumerate browser storage. */
export function exportPlanningBackup(expectedOwner: string | null, now: Date, expectedGeneration: number | null) {
  if (!owner || !expectedOwner || expectedOwner !== owner || expectedGeneration !== generation) throw new Error("Your account changed or is still loading. Reload planning before exporting.");
  if (cacheNeedsRecovery) throw new Error("Device planning data needs recovery. Retry sync before exporting; the original stored data is preserved.");
  return JSON.stringify({
    schemaVersion: 1, source: "Sound Fitness account planning backup",
    scope: "Current account planning document on this device", owner, exportedAt: now.toISOString(),
    cloudRevision: cache.revision, pendingSync: cache.dirty, values: cache.values,
  }, null, 2);
}
export function readAccountRecord(key: string): unknown {
  if ((Object.values(planningKeys) as string[]).includes(key)) return readPlanning(key, null);
  if (typeof window === "undefined") return null;
  try { return JSON.parse(window.localStorage.getItem(key) || "null"); } catch { return null; }
}
export function readPlanning<T>(key: string, fallback: T): T {
  return (cache.values[key] as T | undefined) ?? fallback;
}
export function writePlanning(key: string, value: unknown) {
  writePlanningValues({ [key]: value });
}
/** Commit related records together so storage failure cannot leave a partial update. */
/** Stable record revision independent of JSON object field order. */
export function planningRecordVersion(key: string): string {
  return JSON.stringify(readPlanning(key, null), (_key, value: unknown) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
      : value,
  );
}
export function writePlanningValues(values: Record<string, unknown>) {
  if (!owner) throw new Error("Planning data is still loading. Try again.");
  if (cacheNeedsRecovery) throw new Error("Device planning data needs recovery. Retry sync before saving; the original is preserved.");
  const previous = cache;
  cache = { ...cache, values: { ...cache.values, ...values }, dirty: true };
  try { persist(); } catch (error) {
    cache = previous;
    if (error instanceof DevicePlanningConflict) { planningStatus = deviceConflictStatus; clearTimeout(timer); announce(); }
    throw error;
  }
  if (dataIssue) planningStatus = dataIssue;
  else if (!planningStatus.startsWith("Sync conflict")) planningStatus = owner === "local-preview" ? "Saved locally · local preview" : "Saved locally · waiting to sync";
  announce();
  clearTimeout(timer);
  timer = setTimeout(() => { void syncPlanning(); }, 300);
}
export function subscribePlanning(callback: () => void) {
  window.addEventListener(PLANNING_UPDATED, callback);
  return () => window.removeEventListener(PLANNING_UPDATED, callback);
}
export async function initializePlanning(userId: string | null) {
  const previousOwner = owner;
  const token = ++generation;
  clearTimeout(timer);
  owner = userId || "local-preview";
  cache = { values: {}, revision: 0, dirty: false };
  cacheNeedsRecovery = false;
  dataIssue = null;
  const raw = storedValue(cacheKey());
  persistedText = raw;
  try {
    if (raw) {
      const saved = parseCache(JSON.parse(raw));
      if (!saved) throw new Error("Invalid device planning cache");
      cache = saved;
    }
  } catch {
    cacheNeedsRecovery = true;
    dataIssue = "Data needs review · device planning cache is invalid; original preserved. Retry sync";
  }
  legacyAvailable = !Object.keys(cache.values).length && !storedValue(`${cacheKey()}:imported`) &&
    [...Object.values(planningKeys), "soundFitnessPlan"].some(key => Boolean(storedValue(key)));
  planningStatus = dataIssue || (userId ? "Saved locally · checking sync" : "Saved locally · local preview");
  // Publish the new account and its device cache before a potentially slow cloud read.
  if (previousOwner !== owner) announce();
  try { if (userId) {
    const { data, error } = await supabase.from("planning_documents").select("payload,revision").eq("profile_id", userId).abortSignal(AbortSignal.timeout(12000)).maybeSingle();
    if (token !== generation) return;
    const cloudCache = data ? parseCache({ values: data.payload, revision: data.revision, dirty: false }) : null;
    if (error) planningStatus = dataIssue || backendFailureStatus(error);
    else if (data && !cloudCache) { dataIssue = invalidCloud; planningStatus = dataIssue; }
    else if (cacheNeedsRecovery && !cloudCache) planningStatus = dataIssue!;
    else if (cache.dirty && (data?.revision || 0) !== cache.revision) planningStatus = "Sync conflict · reload cloud or keep local changes";
    else if (!cache.dirty) {
      // Preserve the exact invalid bytes before replacing a damaged device cache.
      if (cacheNeedsRecovery && raw) window.localStorage.setItem(`${cacheKey()}:invalid-backup:${Date.now()}`, raw);
      const previous = { cache, cacheNeedsRecovery, dataIssue };
      if (cloudCache) cache = cloudCache;
      cacheNeedsRecovery = false; dataIssue = null;
      try { persist(); }
      catch (cause) { cache = previous.cache; cacheNeedsRecovery = previous.cacheNeedsRecovery; dataIssue = previous.dataIssue; throw cause; }
      planningStatus = "Synced";
      if (Object.keys(cache.values).length) legacyAvailable = false;
    }
  } } catch (cause) { if (token === generation) planningStatus = cause instanceof DevicePlanningConflict ? deviceConflictStatus : dataIssue || backendFailureStatus(cause); }
  if (token !== generation) return;
  announce();
  if (cache.dirty && !dataIssue && !planningStatus.startsWith("Sync conflict")) void syncPlanning();
}
export async function syncPlanning() {
  if (!owner || owner === "local-preview" || savingGeneration === generation || planningStatus.startsWith("Sync conflict")) return;
  if (dataIssue) { await initializePlanning(owner); return; }
  const token = generation;
  savingGeneration = token;
  try {
    // Reload on retries before saving: the server revision prevents lost updates.
    if (!cache.dirty) { await initializePlanning(owner); return; }
    assertDeviceCurrent();
    const snapshot = cache;
    const { data, error } = await supabase.rpc("save_planning_document", {
      expected_revision: snapshot.revision, document_payload: snapshot.values,
    }).abortSignal(AbortSignal.timeout(12000));
    if (token !== generation) return;
    if (dataIssue) { planningStatus = dataIssue; return; }
    if (error) planningStatus = error.code === "40001" ? "Sync conflict · reload cloud or keep local changes" : backendFailureStatus(error);
    else if (!Number.isSafeInteger(data) || Number(data) <= snapshot.revision) { dataIssue = "Data needs review · invalid sync acknowledgement; local changes preserved. Retry sync"; planningStatus = dataIssue; }
    else {
      const previous = cache;
      cache = { ...cache, revision: Number(data), dirty: cache !== snapshot };
      try { persist(); } catch (cause) { cache = previous; throw cause; }
      planningStatus = cache.dirty ? "Saved locally · waiting to sync" : "Synced";
      if (cache.dirty) timer = setTimeout(() => { void syncPlanning(); }, 300);
    }
  } catch (cause) { if (token === generation) planningStatus = cause instanceof DevicePlanningConflict ? deviceConflictStatus : backendFailureStatus(cause); }
  finally { if (savingGeneration === token) savingGeneration = null; if (token === generation) announce(); }
}
/** Never overwrite this tab's unsaved edits when another tab writes its cache. */
export function refreshPlanningFromStorage(event: StorageEvent) {
  if (!owner || event.key !== cacheKey() || !event.newValue) return;
  const preserveInvalid = () => {
    try { window.localStorage.setItem(`${cacheKey()}:invalid-backup:${Date.now()}`, event.newValue!); }
    catch { cacheNeedsRecovery = true; }
    dataIssue = "Data needs review · invalid update from another tab; this tab preserved. Retry sync"; planningStatus = dataIssue; announce();
  };
  try {
    const incoming = parseCache(JSON.parse(event.newValue));
    if (!incoming) { preserveInvalid(); return; }
    if (cacheNeedsRecovery) return;
    if (JSON.stringify(incoming) === JSON.stringify(cache)) { persistedText = event.newValue; return; }
    if (cache.dirty) planningStatus = "Sync conflict · reload cloud or keep local changes";
    else { cache = incoming; persistedText = event.newValue; planningStatus = incoming.dirty ? "Saved locally · waiting to sync" : "Synced"; }
    announce();
  } catch { preserveInvalid(); }
}
let conflictResolutionSequence = 0;
export async function resolvePlanningConflict(keepLocal: boolean) {
  if (!owner || owner === "local-preview") return;
  const token = generation, request = ++conflictResolutionSequence;
  const source = JSON.stringify(cache), deviceSource = storedValue(cacheKey());
  try {
  const { data, error } = await supabase.from("planning_documents").select("payload,revision").eq("profile_id", owner).abortSignal(AbortSignal.timeout(12000)).maybeSingle();
  if (token !== generation || request !== conflictResolutionSequence) return;
  if (JSON.stringify(cache) !== source || storedValue(cacheKey()) !== deviceSource) { planningStatus = "Sync conflict · planning changed during review; review current records and choose again"; announce(); return; }
  if (error) { planningStatus = backendFailureStatus(error); announce(); return; }
  const cloudCache = data ? parseCache({ values: data.payload, revision: data.revision, dirty: false }) : { values: {}, revision: 0, dirty: false };
  if (!cloudCache || cacheNeedsRecovery) { dataIssue = invalidCloud; planningStatus = dataIssue; announce(); return; }
  // Preserve a recoverable copy before explicitly resolving a conflict.
  const backupKey = `${cacheKey()}:conflict-backup:${Date.now()}`;
  const deviceText = window.localStorage.getItem(cacheKey());
  window.localStorage.setItem(backupKey, JSON.stringify(cache));
  window.localStorage.setItem(backupKey + ":device", JSON.stringify({ originalText: deviceText }));
  const previous = cache;
  const previousText = persistedText;
  persistedText = deviceText;
  cache = { values: keepLocal ? cache.values : cloudCache.values, revision: cloudCache.revision, dirty: keepLocal };
  try { persist(); } catch (error) { cache = previous; persistedText = previousText; throw error; }
  dataIssue = null;
  planningStatus = keepLocal ? "Saved locally · waiting to sync" : "Synced"; announce();
  if (keepLocal) await syncPlanning();
  } catch {
    if (token === generation && request === conflictResolutionSequence) { planningStatus = "Sync conflict · unable to resolve; check connection and device storage"; announce(); }
  }
}
export function dismissLegacy() {
  window.localStorage.setItem(`${cacheKey()}:imported`, "true"); legacyAvailable = false; announce();
}
export function importLegacyPlanning() {
  try {
  if (planningStatus.startsWith("Sync conflict")) throw new Error("Resolve the account sync conflict before importing older browser data.");
  const values: Record<string, unknown> = {};
  for (const key of Object.values(planningKeys).filter(key => key !== planningKeys.context)) {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      try { values[key] = JSON.parse(raw); }
      catch { if (key === planningKeys.active) values[key] = raw; else throw new Error(`Older browser data in ${key} cannot be read. Nothing was imported; the original is preserved.`); }
    }
  }
  // Preserve legacy advanced-plan settings for a real weekly-plan import.
  const advanced = window.localStorage.getItem("soundFitnessPlan");
  if (advanced) { try { values.legacyPlan = JSON.parse(advanced); } catch { throw new Error("Older advanced-plan data cannot be read. Nothing was imported; the original is preserved."); } }
  if (!values[planningKeys.calendar]) {
    const rawCalendar = window.localStorage.getItem("soundFitnessCalendar");
    if (rawCalendar) { try { values[planningKeys.calendar] = JSON.parse(rawCalendar); } catch { throw new Error("Older calendar data cannot be read. Nothing was imported; the original is preserved."); } }
  }
  const validationError = validatePlanningImport(values);
  if (validationError) throw new Error(validationError);
  for (const [key, value] of Object.entries(values)) {
    if (value != null && cache.values[key] != null && JSON.stringify(cache.values[key]) !== JSON.stringify(value)) {
      throw new Error(`Older browser data in ${key} conflicts with your current account data. Nothing was imported; both originals are preserved.`);
    }
  }
  writePlanningValues({ ...Object.fromEntries(Object.entries(values).filter(([, value]) => value != null)), legacyImport: { importedAt: new Date().toISOString() } });
  dismissLegacy();
  } catch (cause) {
    const conflict = planningStatus.startsWith("Sync conflict") ? "Sync conflict · " : "";
    planningStatus = `${conflict}Import needs review · ${cause instanceof Error ? cause.message : "Could not save imported data. Check device storage and retry."}`;
    announce();
  }
}

import { planningAccountGeneration, planningKeys, planningOwner, planningStatus, planningSnapshot, readPlanning, writePlanning, writePlanningValues } from "./store";
import { validatePlanningImport } from "./importValidation";

export const libraryKeys = {
  nutrition: [planningKeys.nutritionLibrary, planningKeys.nutritionDraft],
  recovery: [planningKeys.recoveryLibrary, planningKeys.recoveryDraft],
  mobility: [planningKeys.mobilityLibrary, planningKeys.recoveryDraft],
  performance: [planningKeys.performanceLibrary, planningKeys.performanceDraft],
} as const;
export type LibraryId = keyof typeof libraryKeys;
type LibraryState = { favorites: string[]; recent: string[]; updatedAt?: string };
export type LibraryDraftItem = { id: string; title: string; addedAt?: string; sourceLibrary?: string };
const EMPTY_STATE: LibraryState = { favorites: [], recent: [] };
const EMPTY_PLAN: LibraryDraftItem[] = [];
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const globalFavorites = () => strings(readPlanning(planningKeys.libraryFavorites, []));
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value;
/** Inspect originals, including stored null, before deriving arrays or permitting edits. */
export function libraryReviewIssue(id: LibraryId) {
  if (!Object.hasOwn(libraryKeys, id)) return "Unknown library.";
  const snapshot = planningSnapshot(); const values: Record<string, unknown> = {};
  for (const key of [...libraryKeys[id], planningKeys.libraryFavorites]) if (Object.hasOwn(snapshot, key)) {
    if (snapshot[key] == null) return "A saved library collection is null or unreported. The original record needs review.";
    values[key] = snapshot[key];
  }
  return validatePlanningImport(values) ? "Saved favorites, recent items or draft items have an unsupported structure. Originals remain saved." : null;
}
export function readLibraryState(id: LibraryId) {
  if (libraryReviewIssue(id)) return { favorites: [], recent: [] };
  const state = readPlanning<LibraryState>(libraryKeys[id][0], EMPTY_STATE);
  return { favorites: [...new Set([...state.favorites, ...globalFavorites().filter(item => item.startsWith(`${id}:`)).map(item => item.slice(id.length + 1))])], recent: state.recent };
}
export function readLibraryDraft(id: LibraryId) {
  if (libraryReviewIssue(id)) return [];
  const value = readPlanning<LibraryDraftItem[] | { items: LibraryDraftItem[] }>(libraryKeys[id][1], EMPTY_PLAN);
  return Array.isArray(value) ? value : value.items;
}
export const libraryVersion = (id: LibraryId) => JSON.stringify(readLibraryState(id));
export const libraryDraftVersion = (id: LibraryId) => JSON.stringify(readLibraryDraft(id));
function verify(id: LibraryId, account: string | null, generation: number, expected?: string) {
  if (!account || planningOwner() !== account || generation !== planningAccountGeneration()) throw new Error("Your account changed. Reload the library before saving.");
  if (planningStatus.startsWith("Sync conflict")) throw new Error("Resolve the account sync conflict above before changing this library.");
  const issue = libraryReviewIssue(id);
  if (issue) throw new Error(`Saved library data needs review before editing. ${issue} Export the planning backup to inspect the originals; no records were changed.`);
  if (expected !== undefined && libraryVersion(id) !== expected) throw new Error("This library changed. Review the latest favorites and recent items before saving.");
}
export function toggleLibraryFavorite(id: LibraryId, itemId: string, expected: string, account: string | null, generation: number) {
  verify(id, account, generation, expected);
  if (typeof itemId !== "string" || !itemId.trim()) throw new Error("Choose a library item.");
  const state = readLibraryState(id); const exists = state.favorites.includes(itemId);
  const favorites = exists ? state.favorites.filter(item => item !== itemId) : [...state.favorites, itemId];
  const key = `${id}:${itemId}`; const global = globalFavorites().filter(item => item !== key);
  writePlanningValues({ [libraryKeys[id][0]]: { ...state, favorites, updatedAt: new Date().toISOString() }, [planningKeys.libraryFavorites]: exists ? global : [...global, key] });
}
export function addLibraryDraftItem(id: LibraryId, item: LibraryDraftItem, expected: string, expectedPlan: string, account: string | null, generation: number, now = new Date()) {
  verify(id, account, generation, expected);
  if (libraryDraftVersion(id) !== expectedPlan) throw new Error("This draft changed. Review its latest items before adding another.");
  if (!item || typeof item.id !== "string" || !item.id.trim() || typeof item.title !== "string" || !item.title.trim()) throw new Error("Choose a named library item.");
  const previous = readLibraryDraft(id).filter(entry => entry.id !== item.id);
  if (previous.length >= 30) throw new Error("This draft has 30 items. Remove an item before adding another; no existing item was discarded.");
  const state = readLibraryState(id);
  writePlanningValues({ [libraryKeys[id][1]]: [{ ...item, sourceLibrary: id, addedAt: now.toISOString() }, ...previous], [libraryKeys[id][0]]: { ...state, recent: [item.id, ...state.recent.filter(key => key !== item.id)].slice(0, 8), updatedAt: now.toISOString() } });
}
export function removeLibraryDraftItem(id: LibraryId, itemId: string, expectedPlan: string, account: string | null, generation: number) {
  verify(id, account, generation);
  if (libraryDraftVersion(id) !== expectedPlan) throw new Error("This draft changed. Review the latest items before removing one.");
  writePlanning(libraryKeys[id][1], readLibraryDraft(id).filter(item => item.id !== itemId));
}
export function legacyLibraryAvailable(id: LibraryId) {
  if (typeof window === "undefined") return false;
  if (readPlanning(`libraryLegacyImported:${id}`, false)) return false;
  try {
    if (window.localStorage.getItem(libraryKeys[id][0]) || window.localStorage.getItem(libraryKeys[id][1])) return true;
    return strings(JSON.parse(window.localStorage.getItem(planningKeys.libraryFavorites) || "[]")).some(item => item.startsWith(`${id}:`));
  } catch { return true; }
}
/** Explicitly claim old browser data; never merge it automatically on account load. */
export function importLegacyLibrary(id: LibraryId, expected: string, expectedPlan: string, account: string | null, generation: number) {
  verify(id, account, generation, expected);
  if (libraryDraftVersion(id) !== expectedPlan) throw new Error("The account draft changed. Review its latest items before importing.");
  const values: Record<string, unknown> = {};
  for (const key of [...libraryKeys[id], planningKeys.libraryFavorites]) {
    const raw = window.localStorage.getItem(key);
    if (raw) { try { values[key] = JSON.parse(raw); } catch { throw new Error("Older browser library data cannot be read. Originals were preserved."); } }
  }
  const invalid = validatePlanningImport(values); if (invalid) throw new Error(invalid);
  const legacy = values[libraryKeys[id][0]] as LibraryState | undefined;
  const oldPlan = values[libraryKeys[id][1]] as LibraryDraftItem[] | { items: LibraryDraftItem[] } | undefined;
  const imported = oldPlan ? Array.isArray(oldPlan) ? oldPlan : oldPlan.items : [];
  const currentPlan = readLibraryDraft(id);
  for (const item of imported) {
    const existing = currentPlan.find(entry => entry.id === item.id);
    if (existing && JSON.stringify(canonical(existing)) !== JSON.stringify(canonical(item))) throw new Error("An older draft item conflicts with an account item. Both originals were preserved.");
  }
  const state = readLibraryState(id);
  const favorites = strings(values[planningKeys.libraryFavorites]).filter(item => item.startsWith(`${id}:`));
  writePlanningValues({
    [libraryKeys[id][0]]: { favorites: [...new Set([...state.favorites, ...(legacy?.favorites || []), ...favorites.map(item => item.slice(id.length + 1))])], recent: [...new Set([...state.recent, ...(legacy?.recent || [])])].slice(0, 8) },
    [libraryKeys[id][1]]: [...currentPlan, ...imported.filter(item => !currentPlan.some(entry => entry.id === item.id))],
    [planningKeys.libraryFavorites]: [...new Set([...globalFavorites(), ...favorites])],
    [`libraryLegacyImported:${id}`]: true,
  });
}

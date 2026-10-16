import { captureDevicePlanningRecovery, planningAccountGeneration, planningOwner, planningRecordVersion, planningSnapshot, planningStatus, readPlanning, writePlanning, writePlanningValues } from "./store";
import { localDate } from "./dates";
import { nutrientFields, validMealDraft, validMealHistory, validMealInput, type MealDraft, type MealInput, type MealEntry } from "./mealValidation";
export { nutrientFields, mealKinds, type MealDraft, type MealInput, type MealEntry } from "./mealValidation";

export const MEALS_KEY = "soundFitnessMealEntries";
export const MEAL_DRAFT_KEY = "soundFitnessMealDraft";
const EMPTY: MealEntry[] = [];
export const readMeals = () => readPlanning<MealEntry[]>(MEALS_KEY, EMPTY);
const originalMealHistory = () => Object.hasOwn(planningSnapshot(), MEALS_KEY) ? planningSnapshot()[MEALS_KEY] : EMPTY;
/** Validate the original collection before any write can replace or collapse records. */
export function requireValidMealHistory(): MealEntry[] {
  const meals = originalMealHistory();
  if (!validMealHistory(meals)) throw new Error("Saved meal history needs review before changing meals or creating templates. Original meals and the current draft are preserved.");
  return meals;
}
export function inspectMealHistory() {
  const meals = originalMealHistory();
  if (captureDevicePlanningRecovery().blocked) return { meals: EMPTY, issue: "Device planning data needs recovery. Export the preserved originals before making changes. Meal totals are paused." };
  return validMealHistory(meals) ? { meals, issue: "" } : { meals: EMPTY, issue: "Saved meal history needs review. Export the originals before making changes. Meal totals are paused; original meals and the saved draft are preserved." };
}
export const mealHistoryVersion = () => JSON.stringify({ present: Object.hasOwn(planningSnapshot(), MEALS_KEY), meals: planningRecordVersion(MEALS_KEY), draftPresent: Object.hasOwn(planningSnapshot(), MEAL_DRAFT_KEY), draft: planningRecordVersion(MEAL_DRAFT_KEY), deviceCache: captureDevicePlanningRecovery() });
export function exportMealHistory(expected: string, account: string | null, generation: number) {
  verifyAccount(account, generation);
  if (mealHistoryVersion() !== expected) throw new Error("Meal history or the saved draft changed. Review the current originals before exporting.");
  return JSON.stringify({ schemaVersion: 1, source: "Sound Fitness meal history recovery", meals: originalMealHistory(), draft: planningSnapshot()[MEAL_DRAFT_KEY] ?? null, deviceCache: captureDevicePlanningRecovery() }, null, 2);
}
export const readMealDraft = () => readPlanning<MealDraft | null>(MEAL_DRAFT_KEY, null);
export function inspectMealDraft() {
  const value = planningSnapshot()[MEAL_DRAFT_KEY];
  if (value == null) return { draft: null, issue: "" };
  return validMealDraft(value) ? { draft: value, issue: "" } : { draft: null, issue: "Saved meal draft needs review. Export meal history to preserve its original values before discarding it. Saved meals remain available." };
}
export const emptyMealDraft = (date = localDate()): MealDraft => ({ id: "", date, time: "", title: "", kind: "", notes: "", calories: "", protein: "", carbs: "", fat: "", baseVersion: null });
const content = (meal: MealInput | MealDraft) => ({ id: meal.id, date: meal.date, time: meal.time, title: meal.title, kind: meal.kind, notes: meal.notes, calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fat: meal.fat });
export const mealDraftVersion = () => { const draft = readMealDraft(); return draft !== null && !validMealDraft(draft) ? planningRecordVersion(MEAL_DRAFT_KEY) : JSON.stringify(draft && { ...content(draft), baseVersion: draft.baseVersion }); };
export const mealVersion = (id: string) => { const meal = readMeals().find(item => item.id === id); return JSON.stringify(meal && { ...content(meal), recordedAt: meal.recordedAt, updatedAt: meal.updatedAt }); };
function verifyAccount(account: string | null, generation: number) {
  if (!account || planningOwner() !== account || planningAccountGeneration() !== generation) throw new Error("Your account changed. Reload meals before saving.");
}
function verify(account: string | null, generation: number) {
  verifyAccount(account, generation);
  if (planningStatus.startsWith("Sync conflict")) throw new Error("Resolve the account sync conflict above before changing meals.");
}
function verifyDraft(expected: string, account: string | null, generation: number) {
  verify(account, generation);
  if (mealDraftVersion() !== expected) throw new Error("The saved meal draft changed in another tab. Copy your form before reloading the draft.");
}
export function saveMealDraft(draft: MealDraft, expected: string, account: string | null, generation: number) {
  verifyDraft(expected, account, generation);
  if (inspectMealDraft().issue) throw new Error("Saved meal draft needs review. Export it before explicitly discarding it; the original draft is preserved.");
  requireValidMealHistory();
  if (!validMealDraft(draft)) throw new Error("Keep meal names to 120 characters, notes to 2,000, and use a real date/time. Your form remains here.");
  if (mealVersion(draft.id) !== (draft.baseVersion ?? undefined)) throw new Error("This meal changed. Copy your correction before discarding the draft and opening the latest meal.");
  writePlanning(MEAL_DRAFT_KEY, structuredClone(draft)); return mealDraftVersion();
}
export function clearMealDraft(expected: string, account: string | null, generation: number) { verifyDraft(expected, account, generation); writePlanning(MEAL_DRAFT_KEY, null); }
export function mealInputFromDraft(draft: MealDraft): MealInput {
  return { ...content(draft), ...Object.fromEntries(nutrientFields.map(field => [field, draft[field].trim() === "" ? null : Number(draft[field])])) } as MealInput;
}
export function saveMeal(input: MealInput, expected: string | undefined, account: string | null, generation: number, now = new Date(), expectedDraft?: string) {
  verify(account, generation);
  const meals = requireValidMealHistory();
  if (expectedDraft !== undefined) {
    verifyDraft(expectedDraft, account, generation);
    if (inspectMealDraft().issue) throw new Error("Saved meal draft needs review. Export it before explicitly discarding it; saved meals are unchanged.");
    const draft = readMealDraft();
    if (draft && (draft.id !== input.id || (draft.baseVersion ?? undefined) !== expected)) throw new Error("This draft belongs to another meal or revision. Reload it before saving.");
  }
  if (!validMealInput(input)) throw new Error("Enter a meal name and real date/time. Optional nutrition values must be finite, non-negative numbers (up to 10,000 kcal or 2,000 g per field); leave unknown values blank.");
  if (input.date > localDate(now) || input.date === localDate(now) && input.time && input.time > `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`) throw new Error("Log meals already eaten, using a local date/time through now.");
  const clean = { ...content(input), title: input.title.trim(), notes: input.notes.trim() } as MealInput;
  const current = meals.find(item => item.id === input.id);
  if (expected === undefined && current && JSON.stringify(content(current)) === JSON.stringify(clean)) {
    if (expectedDraft !== undefined) writePlanning(MEAL_DRAFT_KEY, null); return structuredClone(current);
  }
  if (mealVersion(input.id) !== expected) throw new Error("This meal changed. Review the latest meal before saving.");
  const saved: MealEntry = { ...current, ...clean, recordedAt: current?.recordedAt || now.toISOString(), updatedAt: now.toISOString() };
  writePlanningValues({ [MEALS_KEY]: structuredClone([...meals.filter(item => item.id !== input.id), saved]), ...(expectedDraft !== undefined ? { [MEAL_DRAFT_KEY]: null } : {}) }); return structuredClone(saved);
}
export function removeMeal(id: string, expected: string | undefined, account: string | null, generation: number) {
  verify(account, generation); const meals = requireValidMealHistory(); if (mealVersion(id) !== expected) throw new Error("This meal changed. Review the latest meal before removing it.");
  writePlanning(MEALS_KEY, structuredClone(meals.filter(item => item.id !== id)));
}
/** Unknown values remain null. Coverage accompanies every total; meals never imply a complete daily intake. */
export function mealTotals(meals: MealEntry[]) {
  return Object.fromEntries(nutrientFields.map(field => {
    const reported = meals.filter(meal => meal[field] !== null);
    return [field, { value: reported.length ? reported.reduce((sum, meal) => sum + meal[field]!, 0) : null, reported: reported.length, meals: meals.length }];
  })) as Record<typeof nutrientFields[number], { value: number | null; reported: number; meals: number }>;
}

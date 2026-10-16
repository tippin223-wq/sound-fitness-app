import { captureDevicePlanningRecovery, planningAccountGeneration, planningOwner, planningRecordVersion, planningSnapshot, planningStatus, readPlanning, writePlanning } from "./store";
import { localDate } from "./dates";
import { mealVersion, requireValidMealHistory, readMealDraft, mealDraftVersion, saveMealDraft, type MealDraft } from "./meals";
import { nutrientFields } from "./mealValidation";
import { validMealTemplate, validMealTemplateLibrary, type MealTemplate } from "./mealTemplateValidation";
export type { MealTemplate } from "./mealTemplateValidation";

export const MEAL_TEMPLATES_KEY = "soundFitnessMealTemplates";
const EMPTY: MealTemplate[] = [];
export const readMealTemplates = () => readPlanning<MealTemplate[]>(MEAL_TEMPLATES_KEY, EMPTY);
const originalMealTemplates = () => Object.hasOwn(planningSnapshot(), MEAL_TEMPLATES_KEY) ? planningSnapshot()[MEAL_TEMPLATES_KEY] : EMPTY;
export const mealTemplateId = (mealId: string) => `meal-template:${mealId}`;
export const mealTemplateVersion = (id: string) => JSON.stringify(readMealTemplates().find(item => item.id === id), (_key, value) => value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value);
function verifyAccount(account: string | null, generation: number) {
  if (!account || planningOwner() !== account || planningAccountGeneration() !== generation) throw new Error("Your account changed. Reload meal templates first.");
}
function verify(account: string | null, generation: number) {
  verifyAccount(account, generation);
  if (planningStatus.startsWith("Sync conflict")) throw new Error("Resolve the account sync conflict before changing meal templates.");
}
function validatedTemplates(action: string) {
  const templates = originalMealTemplates();
  if (!validMealTemplateLibrary(templates)) throw new Error(`Review the saved meal template library before ${action}. Original templates are preserved.`);
  return templates;
}
function verifyTemplate(id: string, expected: string | undefined, account: string | null, generation: number) {
  verify(account, generation);
  const templates = validatedTemplates("changing or using a template");
  if (mealTemplateVersion(id) !== expected) throw new Error("This meal template changed. Review the latest saved version first.");
  return templates;
}
/** Snapshot one reported meal; creating/updating a template never records another meal. */
export function saveMealAsTemplate(mealId: string, expectedMeal: string | undefined, expectedTemplate: string | undefined, account: string | null, generation: number, now = new Date()) {
  verify(account, generation);
  const templates = validatedTemplates("creating a template");
  const meals = requireValidMealHistory();
  if (mealVersion(mealId) !== expectedMeal) throw new Error("This saved meal changed. Review it before creating a template.");
  const meal = meals.find(item => item.id === mealId);
  if (!meal) throw new Error("This saved meal is unavailable. Reload meals first.");
  const id = mealTemplateId(mealId); const current = templates.find(item => item.id === id);
  const next: MealTemplate = { ...current, id, title: meal.title, kind: meal.kind, notes: meal.notes, calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fat: meal.fat, archived: current?.archived ?? false, createdAt: current?.createdAt || now.toISOString(), updatedAt: now.toISOString() };
  if (!validMealTemplate(next)) throw new Error("This meal has unsupported values. Review the original meal first.");
  // Stable source identity also makes a repeated create safe after a lost response.
  const sameContent = current && ["title", "kind", "notes", ...nutrientFields].every(key => current[key as keyof MealTemplate] === next[key as keyof MealTemplate]);
  if (expectedTemplate === undefined && sameContent) return structuredClone(current);
  verifyTemplate(id, expectedTemplate, account, generation);
  if (!current && templates.length >= 100) throw new Error("The meal template library holds up to 100 templates. Your saved meals and templates are preserved.");
  writePlanning(MEAL_TEMPLATES_KEY, structuredClone([...templates.filter(item => item.id !== id), next])); return structuredClone(next);
}
export function setMealTemplateArchived(id: string, archived: boolean, expected: string | undefined, account: string | null, generation: number, now = new Date()) {
  const templates = verifyTemplate(id, expected, account, generation); const current = templates.find(item => item.id === id);
  if (!current) throw new Error("This meal template is unavailable.");
  if (typeof archived !== "boolean") throw new Error("Choose whether to archive or restore this template. Saved values are preserved.");
  if (current.archived === archived) return;
  writePlanning(MEAL_TEMPLATES_KEY, structuredClone(templates.map(item => item.id === id ? { ...item, archived, updatedAt: now.toISOString() } : item)));
}
export type MealTemplateChanges = Pick<MealTemplate, "title" | "kind" | "notes" | "calories" | "protein" | "carbs" | "fat">;
export const mealTemplateLibraryVersion = () => JSON.stringify({ present: Object.hasOwn(planningSnapshot(), MEAL_TEMPLATES_KEY), library: planningRecordVersion(MEAL_TEMPLATES_KEY), deviceCache: captureDevicePlanningRecovery() });
/** Render a review state without treating malformed originals as an empty saved library. */
export function inspectMealTemplateLibrary() {
  const templates = originalMealTemplates();
  if (captureDevicePlanningRecovery().blocked) return { templates: EMPTY, issue: "Device planning data needs recovery. Export the preserved originals before making changes; saved meals and drafts have not been replaced." };
  return validMealTemplateLibrary(templates) ? { templates, issue: "" } : { templates: EMPTY, issue: "Your saved meal template library needs review. Export the originals before making changes; saved meals and drafts are preserved." };
}
/** Exports remain available during sync conflicts, but only for the reviewed account and bytes. */
export function exportMealTemplateLibrary(expected: string, account: string | null, generation: number) {
  verifyAccount(account, generation);
  if (mealTemplateLibraryVersion() !== expected) throw new Error("The meal template library changed. Review the latest library before exporting.");
  return JSON.stringify({ schemaVersion: 1, source: "Sound Fitness meal template library", templates: originalMealTemplates(), deviceCache: captureDevicePlanningRecovery() }, null, 2);
}
/** Author future reuse values without recording intake or replacing a meal draft. */
export function createMealTemplate(id: string, changes: MealTemplateChanges, expectedLibrary: string, account: string | null, generation: number, now = new Date()) {
  verify(account, generation);
  const templates = validatedTemplates("creating a template");
  const fields = ["title", "kind", "notes", ...nutrientFields] as const;
  if (!changes || typeof changes !== "object" || Array.isArray(changes) || Object.keys(changes).some(key => !fields.includes(key as typeof fields[number])) || fields.some(key => !Object.hasOwn(changes, key))) throw new Error("Templates require name, type, notes and reported nutrition fields only.");
  const next: MealTemplate = { ...changes, id, archived: false, createdAt: now.toISOString(), updatedAt: now.toISOString() };
  if (!validMealTemplate(next)) throw new Error("Review the template identity, name, meal type and nutrition values. Saved values are preserved.");
  const current = templates.find(item => item.id === id);
  // The caller retains the identity across retries; an identical create is harmless.
  if (current && !current.archived && fields.every(key => current[key] === next[key])) return structuredClone(current);
  if (current) throw new Error("This template identity is already saved with different values. Review the library first.");
  if (mealTemplateLibraryVersion() !== expectedLibrary) throw new Error("The meal template library changed. Review it before creating a template.");
  if (templates.length >= 100) throw new Error("The meal template library holds up to 100 templates. Saved values are preserved.");
  writePlanning(MEAL_TEMPLATES_KEY, structuredClone([...templates, next]));
  return structuredClone(next);
}
/** Change future reuse values only; saved meals and the current meal draft are independent. */
export function updateMealTemplate(id: string, changes: MealTemplateChanges, expected: string | undefined, account: string | null, generation: number, now = new Date()) {
  verify(account, generation);
  const templates = validatedTemplates("editing");
  verifyTemplate(id, expected, account, generation);
  const current = templates.find(item => item.id === id);
  const fields = ["title", "kind", "notes", ...nutrientFields] as const;
  if (!current || !validMealTemplate(current)) throw new Error("Review the original meal template before editing it.");
  if (!changes || typeof changes !== "object" || Array.isArray(changes) || Object.keys(changes).some(key => !fields.includes(key as typeof fields[number])) || fields.some(key => !Object.hasOwn(changes, key))) throw new Error("Template edits require name, type, notes and reported nutrition fields only.");
  const next = { ...current, ...changes, updatedAt: now.toISOString() };
  if (!validMealTemplate(next)) throw new Error("Review the template name, meal type and nutrition values. Your original template is preserved.");
  if (fields.every(key => current[key] === next[key])) return structuredClone(current);
  writePlanning(MEAL_TEMPLATES_KEY, structuredClone(templates.map(item => item.id === id ? next : item)));
  return structuredClone(next);
}
/** Prepare a new dated draft; require explicit Save meal before intake totals change. */
export function startMealDraftFromTemplate(id: string, expected: string | undefined, draftId: string, expectedDraft: string, account: string | null, generation: number, date = localDate()) {
  const templates = verifyTemplate(id, expected, account, generation); const template = templates.find(item => item.id === id);
  if (!template || template.archived) throw new Error("Restore this meal template before using it.");
  if (!draftId.trim()) throw new Error("A new meal draft identity is required.");
  const next: MealDraft = { id: draftId, date, time: "", title: template.title, kind: template.kind, notes: template.notes, calories: "", protein: "", carbs: "", fat: "", baseVersion: null };
  nutrientFields.forEach(key => { next[key] = template[key] === null ? "" : String(template[key]); });
  const current = readMealDraft();
  if (current) {
    if ((Object.keys(next) as Array<keyof MealDraft>).every(key => current[key] === next[key])) return mealDraftVersion();
    throw new Error("Finish or discard your current meal draft before using a template. It has not been replaced.");
  }
  return saveMealDraft(next, expectedDraft, account, generation);
}

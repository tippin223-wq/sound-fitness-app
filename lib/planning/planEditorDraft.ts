import type { PlanEditor } from "@/lib/localData/workoutPlanData";
import { planningKeys, planningOwner, planningAccountGeneration, planningRecordVersion, planningStatus, readPlanning, writePlanning, writePlanningValues } from "./store";

import { profileAge, type RecommendationProfile } from "./recommendation";

import { PLAN_DRAFT_ARCHIVE_PREFIX, assertPlanDraftArchive, type PlanDraftArchiveEditor } from "./planDraftArchives";
export { PLAN_DRAFT_ARCHIVE_PREFIX } from "./planDraftArchives";
export const PLAN_EDITOR_DRAFT_KEY = "soundFitnessPlanEditorDraft";
export type PlanFormDraft = {
  savedPlanId: string | null; weekStartDate: string;
  plan: { planName: string; createdBy: string; goal: string; phase: string; split: string; weeklyTarget: string; primaryFocus: string; secondaryFocus: string; progression: string; notes: string };
  trainingDays: Array<{ day: string; title: string; focus: string; notes: string }>;
  assignMatches: boolean; step: "identity" | "structure" | "focus" | "execution" | "rules";
};
type SavedDraft = { schemaVersion: 1; form: PlanFormDraft; editor: PlanEditor; templatesVersion: string };
export type PlanDraftEditor = { account: string | null; generation: number; version: string; templatesVersion: string; reviewed?: boolean };
export const planDraftPresent = () => readPlanning(PLAN_EDITOR_DRAFT_KEY, null) !== null;
export const capturePlanDraftEditor = (): PlanDraftEditor => ({ account: planningOwner(), generation: planningAccountGeneration(), version: planningRecordVersion(PLAN_EDITOR_DRAFT_KEY), templatesVersion: planningRecordVersion(planningKeys.templates), reviewed: !planDraftPresent() });
function assertEditor(editor: PlanDraftEditor) {
  if (!editor.account || planningOwner() !== editor.account || editor.generation !== planningAccountGeneration()) throw new Error("Your account changed. Reload the plan editor before using saved drafts.");
  if (planningRecordVersion(PLAN_EDITOR_DRAFT_KEY) !== editor.version) throw new Error("The saved plan draft changed elsewhere. Your open form is preserved; reload before replacing it.");
}
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
function validDraft(value: unknown): value is SavedDraft {
  if (!record(value) || value.schemaVersion !== 1 || !record(value.form) || !record(value.editor) || typeof value.templatesVersion !== "string") return false;
  const { form, editor } = value;
  return (form.savedPlanId === null || typeof form.savedPlanId === "string") && typeof form.weekStartDate === "string"
    && typeof form.assignMatches === "boolean" && typeof form.step === "string" && ["identity", "structure", "focus", "execution", "rules"].includes(form.step)
    && record(form.plan) && ["planName", "createdBy", "goal", "phase", "split", "weeklyTarget", "primaryFocus", "secondaryFocus", "progression", "notes"].every(key => typeof (form.plan as Record<string, unknown>)[key] === "string")
    && Array.isArray(form.trainingDays) && form.trainingDays.length <= 7 && form.trainingDays.every(day => record(day) && ["day", "title", "focus", "notes"].every(key => typeof day[key] === "string"))
    && typeof editor.account === "string" && ["plansVersion", "goalsVersion", "profileVersion"].every(key => typeof editor[key] === "string")
    && (editor.displayedPlan == null || record(editor.displayedPlan) && typeof editor.displayedPlan.id === "string" && typeof editor.displayedPlan.version === "string");
}
/** Preserve unfinished/invalid form values without saving or activating a weekly plan. */
export function keepPlanDraft(form: PlanFormDraft, planEditor: PlanEditor, editor: PlanDraftEditor) {
  assertEditor(editor);
  if (planningStatus.startsWith("Sync conflict")) throw new Error("Resolve the account sync conflict before replacing a saved draft. Export the open draft to preserve your choices.");
  if (planEditor.account !== editor.account || planEditor.generation !== editor.generation) throw new Error("The open plan belongs to a different account. Your form is preserved.");
  const draft = { schemaVersion: 1, form, editor: planEditor, templatesVersion: editor.templatesVersion };
  if (!validDraft(draft) || JSON.stringify(draft).length > 200000) throw new Error("This plan draft needs review or is too large to keep. Export the open draft instead.");
  const original: unknown = readPlanning(PLAN_EDITOR_DRAFT_KEY, null);
  const archives: Record<string, unknown> = {};
  if (original !== null && !editor.reviewed) archives[PLAN_DRAFT_ARCHIVE_PREFIX + crypto.randomUUID()] = {
    schemaVersion: 1, source: "Sound Fitness plan draft before replacement", archivedAt: new Date().toISOString(),
    originalDraft: JSON.parse(JSON.stringify(original)),
  };
  writePlanningValues({ [PLAN_EDITOR_DRAFT_KEY]: JSON.parse(JSON.stringify(draft)), ...archives });
  return { ...editor, version: planningRecordVersion(PLAN_EDITOR_DRAFT_KEY), reviewed: true };
}
export function restorePlanDraft(editor: PlanDraftEditor) {
  assertEditor(editor);
  const draft: unknown = readPlanning(PLAN_EDITOR_DRAFT_KEY, null);
  if (!validDraft(draft) || draft.editor.account !== editor.account) throw new Error("The saved plan draft needs review. Export it before replacing it.");
  if (draft.editor.recommendationAge !== profileAge(readPlanning<RecommendationProfile>(planningKeys.profile, {}))) throw new Error("Your age context changed since this draft was kept. Export the saved draft and review it alongside current recommendations before restoring.");
  if (draft.editor.plansVersion !== planningRecordVersion(planningKeys.plans)
    || draft.editor.goalsVersion !== planningRecordVersion(planningKeys.goals)
    || draft.editor.profileVersion !== planningRecordVersion(planningKeys.profile)
    || draft.templatesVersion !== planningRecordVersion(planningKeys.templates)) throw new Error("Planning context changed since this draft was kept. Export the saved draft and review it alongside current goals, profile, plans and workouts.");
  // Restoring is an explicit current-session review after all saved context checks.
  return JSON.parse(JSON.stringify({ ...draft, editor: { ...draft.editor, generation: planningAccountGeneration() } })) as SavedDraft;
}
export function exportSavedPlanDraft(editor: PlanDraftEditor) {
  assertEditor(editor);
  if (!planDraftPresent()) throw new Error("There is no saved plan draft to export.");
  const saved: unknown = readPlanning(PLAN_EDITOR_DRAFT_KEY, null);
  return JSON.stringify({ schemaVersion: 1, source: "Sound Fitness saved plan editor draft", draft: validDraft(saved) ? saved.form : saved }, null, 2);
}
/** Clear only the reviewed saved draft; the open form and weekly plans are independent. */
export function discardPlanDraft(editor: PlanDraftEditor) {
  assertEditor(editor);
  if (planningStatus.startsWith("Sync conflict")) throw new Error("Resolve the account sync conflict before discarding a saved draft.");
  if (!planDraftPresent()) return editor;
  writePlanning(PLAN_EDITOR_DRAFT_KEY, null);
  return { ...editor, version: planningRecordVersion(PLAN_EDITOR_DRAFT_KEY) };
}

type DraftImportPreview = { form: PlanFormDraft; openFormVersion: string; editor: PlanEditor; draftEditor: PlanDraftEditor; archiveSource?: PlanDraftArchiveEditor };
function assertImportContext(editor: PlanEditor, draftEditor: PlanDraftEditor) {
  assertEditor(draftEditor);
  if (editor.recommendationAge !== profileAge(readPlanning<RecommendationProfile>(planningKeys.profile, {}))) throw new Error("Your age context changed. Export your open form and reopen the plan editor before reviewing this import.");
  if (editor.account !== draftEditor.account || editor.generation !== draftEditor.generation || editor.plansVersion !== planningRecordVersion(planningKeys.plans)
    || editor.goalsVersion !== planningRecordVersion(planningKeys.goals) || editor.profileVersion !== planningRecordVersion(planningKeys.profile)
    || draftEditor.templatesVersion !== planningRecordVersion(planningKeys.templates)) throw new Error("Planning context changed. Export your open form and reload before importing a draft.");
}
/** Review exported choices as a new plan; never import record identities or activation. */
export function previewPlanDraftImport(json: string, openForm: PlanFormDraft, editor: PlanEditor, draftEditor: PlanDraftEditor, archiveSource?: PlanDraftArchiveEditor): DraftImportPreview {
  assertImportContext(editor, draftEditor);
  if (archiveSource) assertPlanDraftArchive(archiveSource);
  if (typeof json !== "string" || json.length > 200000) throw new Error("Choose a plan draft JSON file under 200 KB.");
  let payload: unknown;
  try { payload = JSON.parse(json); } catch { throw new Error("This file is not valid JSON. Your open form is preserved."); }
  if (!record(payload) || payload.schemaVersion !== 1 || typeof payload.source !== "string" || !["Sound Fitness plan editor draft", "Sound Fitness saved plan editor draft"].includes(payload.source)) throw new Error("Choose a supported Sound Fitness plan draft export.");
  if (Object.hasOwn(payload, "account") && payload.account !== editor.account) throw new Error("This draft export belongs to a different account.");
  if (!validDraft({ schemaVersion: 1, form: payload.draft, editor, templatesVersion: draftEditor.templatesVersion })) throw new Error("The exported draft fields need review. Your open form is preserved.");
  const form = payload.draft as PlanFormDraft;
  if (Object.keys(form).some(key => !["savedPlanId", "weekStartDate", "plan", "trainingDays", "assignMatches", "step"].includes(key))
    || Object.keys(form.plan).some(key => !["planName", "createdBy", "goal", "phase", "split", "weeklyTarget", "primaryFocus", "secondaryFocus", "progression", "notes"].includes(key))
    || form.trainingDays.some(day => Object.keys(day).some(key => !["day", "title", "focus", "notes"].includes(key)))) throw new Error("The exported draft contains unsupported fields. Your open form is preserved.");
  return JSON.parse(JSON.stringify({ form: { ...form, savedPlanId: null, assignMatches: false }, openFormVersion: JSON.stringify(openForm), editor, draftEditor, ...(archiveSource ? { archiveSource } : {}) })) as DraftImportPreview;
}
export function confirmPlanDraftImport(preview: DraftImportPreview, openForm: PlanFormDraft): PlanFormDraft {
  assertImportContext(preview.editor, preview.draftEditor);
  if (preview.archiveSource) assertPlanDraftArchive(preview.archiveSource);
  if (JSON.stringify(openForm) !== preview.openFormVersion) throw new Error("Your open form changed after this import preview. Choose the file again to review it before replacing your edits.");
  return JSON.parse(JSON.stringify(preview.form)) as PlanFormDraft;
}

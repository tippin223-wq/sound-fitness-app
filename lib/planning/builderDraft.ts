import type { ExerciseCatalogItem } from "@/types";
import { workoutTemplateContentVersion, type LocalWorkoutBuilderSelectedExercise, type LocalWorkoutBuilderTemplate } from "@/lib/localData/workoutBuilderData";
import { assertBuilderTemplateEditor, type BuilderTemplateEditor } from "./builderTemplateEditor";
import { bindLegacyBuilderDraftOccurrences } from "./builderExerciseOccurrences";
import { builderTemplateLoadProblem } from "./builderTemplateLoad";
import { planningKeys, planningOwner, planningAccountGeneration, planningRecordVersion, planningSnapshot, writePlanning, writePlanningValues } from "./store";
import { validatePlanningImport } from "./importValidation";

export type BuilderDraftSection = {
  id: "warmUp" | "main" | "accessories" | "coreConditioning" | "coolDown";
  title: string; helper: string; accent: string; border: string;
  slots: Array<{ id: string; label: string; exercise: string; exerciseRecord?: LocalWorkoutBuilderSelectedExercise | null }>;
};
export type BuilderDraftForm = { title: string; exercises: LocalWorkoutBuilderSelectedExercise[]; sections: BuilderDraftSection[]; templateEditor: BuilderTemplateEditor | null };
type SavedDraft = { schemaVersion: 1; form: BuilderDraftForm; updatedAt: string };
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const original = () => planningSnapshot()[planningKeys.builderDraft];
export const builderDraftPresent = () => Object.hasOwn(planningSnapshot(), planningKeys.builderDraft);
export const captureBuilderDraftEditor = (account = planningOwner()) => ({ account, generation: planningAccountGeneration(), version: planningRecordVersion(planningKeys.builderDraft), reviewed: !builderDraftPresent() });
export type BuilderDraftEditor = ReturnType<typeof captureBuilderDraftEditor>;
export const BUILDER_DRAFT_ARCHIVE_PREFIX = "builderDraftArchive:";
function assertEditor(editor: BuilderDraftEditor) {
  if (!editor.account || planningOwner() !== editor.account || editor.generation !== planningAccountGeneration()) throw new Error("Your account changed. Keep your open workout visible and reload before using drafts.");
  if (planningRecordVersion(planningKeys.builderDraft) !== editor.version) throw new Error("The kept draft changed elsewhere. Your open workout is preserved; reload before replacing it.");
}
function validForm(value: unknown): value is BuilderDraftForm {
  if (!record(value) || typeof value.title !== "string" || !Array.isArray(value.exercises) || value.exercises.length > 100
    || validatePlanningImport({ [planningKeys.selectedExercises]: value.exercises }) || !Array.isArray(value.sections) || value.sections.length > 5) return false;
  const sections = value.sections;
  if (sections.some(section => !record(section) || !["warmUp", "main", "accessories", "coreConditioning", "coolDown"].includes(String(section.id))
    || ["title", "helper", "accent", "border"].some(key => typeof section[key] !== "string") || !Array.isArray(section.slots) || section.slots.length > 100
    || section.slots.some(slot => !record(slot) || typeof slot.id !== "string" || !slot.id.trim() || typeof slot.label !== "string" || typeof slot.exercise !== "string"))) return false;
  if (new Set(sections.map(section => section.id)).size !== sections.length) return false;
  const slots = sections.flatMap(section => section.slots);
  if (new Set(slots.map(slot => slot.id)).size !== slots.length) return false;
  if (slots.some(slot => Object.hasOwn(slot, "exerciseRecord"))) {
    try { bindLegacyBuilderDraftOccurrences(value as unknown as BuilderDraftForm); } catch { return false; }
  }
  const editor = value.templateEditor;
  return editor === null || record(editor) && typeof editor.account === "string" && typeof editor.version === "string" && record(editor.template)
    && !validatePlanningImport({ [planningKeys.templates]: [editor.template] })
    && editor.version === workoutTemplateContentVersion(editor.template as unknown as LocalWorkoutBuilderTemplate);
}
function validSaved(value: unknown): value is SavedDraft {
  return record(value) && value.schemaVersion === 1 && typeof value.updatedAt === "string" && validForm(value.form);
}
function assertForm(form: BuilderDraftForm, editor: BuilderDraftEditor) {
  if (!validForm(form) || form.templateEditor && (form.templateEditor.account !== editor.account || form.templateEditor.generation !== editor.generation) || JSON.stringify(form).length > 200000) throw new Error("Review the open workout before keeping its draft. The previous draft is preserved.");
}
export function keepBuilderDraft(form: BuilderDraftForm, editor: BuilderDraftEditor) {
  assertEditor(editor);
  if (builderDraftPresent() && (!editor.reviewed || !validSaved(original()))) throw new Error("Restore the kept draft before replacing it. If it cannot be restored, export its originals for review. Your open workout is preserved.");
  assertForm(form, editor);
  writePlanning(planningKeys.builderDraft, { schemaVersion: 1, form: JSON.parse(JSON.stringify(form)), updatedAt: new Date().toISOString() });
  return { ...editor, version: planningRecordVersion(planningKeys.builderDraft), reviewed: true };
}
/** Explicit recovery keeps the exact old original and new form in one atomic account write. */
export function archiveAndKeepBuilderDraft(form: BuilderDraftForm, editor: BuilderDraftEditor) {
  assertEditor(editor);
  if (!builderDraftPresent()) throw new Error("There is no kept draft to archive. Use Keep draft for the open workout.");
  assertForm(form, editor);
  const now = new Date().toISOString();
  const archiveKey = BUILDER_DRAFT_ARCHIVE_PREFIX + crypto.randomUUID();
  writePlanningValues({
    [archiveKey]: { schemaVersion: 1, source: "Sound Fitness archived Builder draft", archivedAt: now, originalDraft: original() },
    [planningKeys.builderDraft]: { schemaVersion: 1, form: JSON.parse(JSON.stringify(form)), updatedAt: now },
  });
  return { ...editor, version: planningRecordVersion(planningKeys.builderDraft), reviewed: true };
}
function restorableForm(saved: unknown, catalog: ExerciseCatalogItem[], asNew = false) {
  if (!validSaved(saved)) throw new Error("The kept draft needs review. Export its original data; your open workout is preserved.");
  const rich = saved.form.sections.some(section => section.slots.some(slot => Object.hasOwn(slot, "exerciseRecord")));
  const form = rich ? bindLegacyBuilderDraftOccurrences(saved.form) : JSON.parse(JSON.stringify(saved.form)) as BuilderDraftForm;
  if (asNew) {
    if (form.templateEditor && form.templateEditor.account !== planningOwner()) throw new Error("This archived draft has a different account context. Export its original for review.");
    form.templateEditor = null;
  }
  if (!rich && form.exercises.length) {
    const issue = builderTemplateLoadProblem({ id: "draft-preview", title: form.title || "Draft", exercises: form.exercises, createdAt: "", updatedAt: "" }, catalog);
    if (issue) throw new Error(issue);
  }
  const selectedNames = new Set(form.exercises.map(exercise => exercise.name));
  if (form.sections.some(section => section.slots.some(slot => slot.exercise && !selectedNames.has(slot.exercise)))) throw new Error("Kept draft slots need review before restoring. Export the original draft; your open workout is preserved.");
  if (form.templateEditor) {
    // Explicit restore reviews durable account/content evidence before using a fresh session token.
    form.templateEditor = { ...form.templateEditor, generation: planningAccountGeneration() };
    assertBuilderTemplateEditor(form.templateEditor);
  }
  return form;
}
export function restoreBuilderDraft(editor: BuilderDraftEditor, catalog: ExerciseCatalogItem[]) {
  assertEditor(editor);
  return { form: restorableForm(original(), catalog), editor: { ...editor, reviewed: true } };
}
export function exportBuilderDraft(editor: BuilderDraftEditor) {
  assertEditor(editor);
  if (!builderDraftPresent()) throw new Error("There is no kept draft to export.");
  return JSON.stringify({ schemaVersion: 1, source: "Sound Fitness kept Builder draft", draft: original() }, null, 2);
}

export type BuilderDraftArchiveEditor = { account: string | null; generation: number; key: string; version: string };
export type BuilderDraftArchivePreview = { archive: BuilderDraftArchiveEditor; openFormVersion: string; form: BuilderDraftForm };
const archiveEnvelope = (value: unknown): value is Record<string, unknown> => record(value) && value.schemaVersion === 1
  && value.source === "Sound Fitness archived Builder draft" && Object.hasOwn(value, "originalDraft");
export function readBuilderDraftArchives() {
  return Object.entries(planningSnapshot()).filter(([key]) => key.startsWith(BUILDER_DRAFT_ARCHIVE_PREFIX)).map(([key, value]) => {
    const saved = archiveEnvelope(value) ? value.originalDraft : null;
    const archivedAt = archiveEnvelope(value) && typeof value.archivedAt === "string" && Number.isFinite(Date.parse(value.archivedAt)) ? value.archivedAt : "";
    return { editor: { account: planningOwner(), generation: planningAccountGeneration(), key, version: planningRecordVersion(key) }, title: validSaved(saved) ? saved.form.title || "Untitled draft" : "Damaged Builder draft", archivedAt, canReview: validSaved(saved) };
  }).sort((a, b) => b.archivedAt.localeCompare(a.archivedAt) || a.editor.key.localeCompare(b.editor.key));
}
function assertBuilderArchive(editor: BuilderDraftArchiveEditor) {
  if (!editor.account || editor.account !== planningOwner() || editor.generation !== planningAccountGeneration()) throw new Error("Your account changed. Reload before using archived Builder drafts.");
  if (!editor.key.startsWith(BUILDER_DRAFT_ARCHIVE_PREFIX) || !Object.hasOwn(planningSnapshot(), editor.key)) throw new Error("This Builder archive is unavailable. Your open workout is preserved.");
  if (planningRecordVersion(editor.key) !== editor.version) throw new Error("This Builder archive changed. Choose it again; your open workout is preserved.");
}
export function exportBuilderDraftArchive(editor: BuilderDraftArchiveEditor) {
  assertBuilderArchive(editor);
  return JSON.stringify({ schemaVersion: 1, source: "Sound Fitness Builder draft archive export", archive: planningSnapshot()[editor.key] }, null, 2);
}
export function previewBuilderDraftArchive(archive: BuilderDraftArchiveEditor, catalog: ExerciseCatalogItem[], openForm: BuilderDraftForm): BuilderDraftArchivePreview {
  assertBuilderArchive(archive);
  const value = planningSnapshot()[archive.key];
  if (!archiveEnvelope(value)) throw new Error("This Builder archive needs review. Export its exact original; your open workout is preserved.");
  return { archive: { ...archive }, openFormVersion: JSON.stringify(openForm), form: restorableForm(value.originalDraft, catalog, true) };
}
export function confirmBuilderDraftArchive(preview: BuilderDraftArchivePreview, catalog: ExerciseCatalogItem[], openForm: BuilderDraftForm) {
  assertBuilderArchive(preview.archive);
  if (JSON.stringify(openForm) !== preview.openFormVersion) throw new Error("Your open Builder changed after this preview. Review the archive again before replacing your edits.");
  return previewBuilderDraftArchive(preview.archive, catalog, openForm).form;
}

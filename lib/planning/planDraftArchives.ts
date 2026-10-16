import { planningOwner, planningAccountGeneration, planningRecordVersion, planningSnapshot } from "./store";

export const PLAN_DRAFT_ARCHIVE_PREFIX = "planDraftArchive:";
export type PlanDraftArchiveEditor = { account: string | null; generation: number; key: string; version: string };
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const envelope = (value: unknown): value is Record<string, unknown> => record(value) && value.schemaVersion === 1
  && value.source === "Sound Fitness plan draft before replacement" && Object.hasOwn(value, "originalDraft");

/** Read only archive records in the current account document. */
export function readPlanDraftArchives() {
  return Object.entries(planningSnapshot()).filter(([key]) => key.startsWith(PLAN_DRAFT_ARCHIVE_PREFIX)).map(([key, value]) => {
    const original = envelope(value) ? value.originalDraft : null;
    const form = record(original) && record(original.form) ? original.form : null;
    const title = form && record(form.plan) && typeof form.plan.planName === "string" ? form.plan.planName : "";
    const archivedAt = envelope(value) && typeof value.archivedAt === "string" && Number.isFinite(Date.parse(value.archivedAt)) ? value.archivedAt : "";
    return { editor: { account: planningOwner(), generation: planningAccountGeneration(), key, version: planningRecordVersion(key) }, title: title || "Untitled or damaged draft", archivedAt, canReview: Boolean(form) };
  }).sort((a, b) => b.archivedAt.localeCompare(a.archivedAt) || a.editor.key.localeCompare(b.editor.key));
}

export function assertPlanDraftArchive(editor: PlanDraftArchiveEditor) {
  if (!editor.account || editor.account !== planningOwner() || editor.generation !== planningAccountGeneration()) throw new Error("Your account changed. Reload before using archived drafts.");
  if (!editor.key.startsWith(PLAN_DRAFT_ARCHIVE_PREFIX) || !Object.hasOwn(planningSnapshot(), editor.key)) throw new Error("This archived draft is no longer available. Your open form is preserved.");
  if (planningRecordVersion(editor.key) !== editor.version) throw new Error("This archived draft changed after review. Choose it again; your open form is preserved.");
}
export function exportPlanDraftArchive(editor: PlanDraftArchiveEditor) {
  assertPlanDraftArchive(editor);
  return JSON.stringify({ schemaVersion: 1, source: "Sound Fitness archived plan draft", archive: planningSnapshot()[editor.key] }, null, 2);
}
/** Only form choices enter the normal import preview; the archive remains untouched. */
export function planDraftArchiveReviewJson(editor: PlanDraftArchiveEditor) {
  assertPlanDraftArchive(editor);
  const value = planningSnapshot()[editor.key];
  if (!envelope(value) || !record(value.originalDraft) || !record(value.originalDraft.form)) throw new Error("This archived draft needs review. Export its exact original; your open form is preserved.");
  return JSON.stringify({ schemaVersion: 1, source: "Sound Fitness saved plan editor draft", account: editor.account, draft: value.originalDraft.form });
}

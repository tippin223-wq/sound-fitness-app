import { readWorkoutBuilderTemplatesForSave, type LocalWorkoutBuilderTemplate } from "@/lib/localData/workoutBuilderData";
import { planningKeys, planningOwner, planningAccountGeneration, planningRecordVersion, planningSnapshot, writePlanningValues } from "./store";
import { validatePlanningImport } from "./importValidation";
import { WORKOUT_TEMPLATE_REFRESH_ARCHIVE_PREFIX } from "./workoutTemplateRefresh";

export type WorkoutArchiveEditor = { account: string | null; generation: number; key: string; version: string };
const RECOVERY_PREFIX = "workoutTemplateArchiveRecovery:";
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
function original(value: unknown): LocalWorkoutBuilderTemplate | null {
  if (!record(value) || value.schemaVersion !== 1 || value.source !== "Sound Fitness workout before cloud refresh"
    || !Object.hasOwn(value, "originalTemplate") || validatePlanningImport({ [planningKeys.templates]: [value.originalTemplate] })) return null;
  return value.originalTemplate as LocalWorkoutBuilderTemplate;
}
export function readWorkoutTemplateArchives() {
  return Object.entries(planningSnapshot()).filter(([key]) => key.startsWith(WORKOUT_TEMPLATE_REFRESH_ARCHIVE_PREFIX)).map(([key, value]) => {
    const template = original(value);
    const archivedAt = record(value) && typeof value.archivedAt === "string" && Number.isFinite(Date.parse(value.archivedAt)) ? value.archivedAt : "";
    return { editor: { account: planningOwner(), generation: planningAccountGeneration(), key, version: planningRecordVersion(key) }, title: template?.title || "Damaged workout archive", archivedAt, canRecover: Boolean(template) };
  }).sort((a, b) => b.archivedAt.localeCompare(a.archivedAt) || a.editor.key.localeCompare(b.editor.key));
}
function assertArchive(editor: WorkoutArchiveEditor) {
  if (!editor.account || editor.account !== planningOwner() || editor.generation !== planningAccountGeneration()) throw new Error("Your account changed. Reload before using archived workouts.");
  if (!editor.key.startsWith(WORKOUT_TEMPLATE_REFRESH_ARCHIVE_PREFIX) || !Object.hasOwn(planningSnapshot(), editor.key)) throw new Error("This workout archive is unavailable. Saved originals are preserved.");
  if (planningRecordVersion(editor.key) !== editor.version) throw new Error("This workout archive changed. Choose it again; saved originals are preserved.");
}
export function exportWorkoutTemplateArchive(editor: WorkoutArchiveEditor) {
  assertArchive(editor);
  return JSON.stringify({ schemaVersion: 1, source: "Sound Fitness archived workout", archive: planningSnapshot()[editor.key] }, null, 2);
}
/** Copy into the canonical library without changing the current workout, archive, open Builder or plan. */
export function recoverWorkoutTemplateArchive(editor: WorkoutArchiveEditor) {
  assertArchive(editor);
  const template = original(planningSnapshot()[editor.key]);
  if (!template) throw new Error("This workout archive needs review. Export its exact original before recovery.");
  const templates = readWorkoutBuilderTemplatesForSave();
  const recoveryKey = RECOVERY_PREFIX + editor.key;
  const snapshot = planningSnapshot();
  if (Object.hasOwn(snapshot, recoveryKey)) {
    const prior = snapshot[recoveryKey];
    if (!record(prior) || prior.schemaVersion !== 1 || typeof prior.archiveVersion !== "string" || typeof prior.templateId !== "string" || !prior.templateId.trim()) throw new Error("This archive's recovery record needs review. Existing workouts and archive are preserved.");
    const existing = templates.find(item => item.id === prior.templateId);
    if (prior.archiveVersion === editor.version && existing) return { template: existing, alreadyRecovered: true };
  }
  const now = new Date().toISOString();
  const copy: LocalWorkoutBuilderTemplate = {
    ...JSON.parse(JSON.stringify(template)), id: crypto.randomUUID(), title: template.title + " (Recovered copy)",
    createdAt: now, updatedAt: now, cloudRevision: 0, syncPending: true, syncKey: crypto.randomUUID(), syncError: undefined,
  };
  if (templates.some(item => item.id === copy.id)) throw new Error("A new workout identity could not be created. Retry; originals are preserved.");
  if (validatePlanningImport({ [planningKeys.templates]: [copy] })) throw new Error("This recovered workout needs review. Export its exact original; saved workouts are preserved.");
  writePlanningValues({ [planningKeys.templates]: [copy, ...templates], [recoveryKey]: { schemaVersion: 1, archiveVersion: editor.version, templateId: copy.id } });
  return { template: copy, alreadyRecovered: false };
}

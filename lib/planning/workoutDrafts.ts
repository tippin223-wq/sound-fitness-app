import type { LocalWorkoutBuilderSessionTemplate } from "../localData/workoutBuilderData";
import { planningKeys, planningOwner, planningAccountGeneration, planningRecordVersion, planningSnapshot, readPlanning, writePlanning, writePlanningValues } from "./store";
import { assignmentCompleted, readAvailableWorkoutLogs, readWorkoutCompletionEvidence } from "./logs";
import { assignmentTemplateIssue, inspectWorkoutPlans, type LocalActiveWorkoutSessionContext } from "../localData/workoutPlanData";
import { activityTimestamp } from "./dates";
import { sessionReportLogs } from "./sessionReporting";
import { assertWorkoutChronology } from "./workoutChronology";
import { validExerciseSemanticMetadata } from "./exerciseSemanticMetadata";
import { goalNumber } from "./goalNumbers";
import { recordedWorkoutLoadUnit, workoutNumericTotalsIssue } from "./loadUnitEvidence";
import { activeSessionTemplateIssue, assertActiveSessionReviewed, workoutSessionDraftIssue } from "./activeSessionRecovery";

const activeTemplateKey = "soundFitnessWorkoutBuilderActiveSessionTemplate";
export const PRESERVED_DEFAULT_DRAFT_PREFIX = "loggerDraft:preserved-default:";
export const PRESERVED_COMPLETION_DRAFT_PREFIX = "loggerDraft:preserved-completion:";
export function createPreservedDefaultDraftKey() {
  let key: string;
  do { key = PRESERVED_DEFAULT_DRAFT_PREFIX + crypto.randomUUID(); }
  while (Object.hasOwn(planningSnapshot(), key));
  return key;
}
export const workoutDraftKey = (template: LocalWorkoutBuilderSessionTemplate | null) =>
  "loggerDraft:" + (template ? `${template.id}:${template.startedAt}` : "default");
const identity = (template: LocalWorkoutBuilderSessionTemplate | null) =>
  template ? JSON.stringify([template.id, template.startedAt]) : "default";

export function captureWorkoutDraftEditor(template: LocalWorkoutBuilderSessionTemplate | null, account = planningOwner()) {
  const key = workoutDraftKey(template);
  return {
    account, generation: planningAccountGeneration(), key, identity: identity(template),
    draftVersion: planningRecordVersion(key),
    contextVersion: planningRecordVersion(planningKeys.context),
    templateVersion: planningRecordVersion(activeTemplateKey),
  };
}
export type WorkoutDraftEditor = ReturnType<typeof captureWorkoutDraftEditor>;

export function assertWorkoutDraftEditor(editor: WorkoutDraftEditor) {
  if (!editor.account || planningOwner() !== editor.account || editor.generation !== planningAccountGeneration()) throw new Error("Your account changed. Reload the workout before saving.");
  const template = readPlanning<LocalWorkoutBuilderSessionTemplate | null>(activeTemplateKey, null);
  if (identity(template) !== editor.identity || planningRecordVersion(activeTemplateKey) !== editor.templateVersion || planningRecordVersion(planningKeys.context) !== editor.contextVersion)
    throw new Error("The active workout or plan link changed. Reload the logger before saving; your stored draft is preserved.");
  if (planningRecordVersion(editor.key) !== editor.draftVersion)
    throw new Error("This workout draft changed since you opened it. Reload the logger to review the saved values before editing or finishing.");
  assertActiveSessionReviewed();
  const context = readPlanning<LocalActiveWorkoutSessionContext | null>(planningKeys.context, null);
  if (context?.source === "plan") {
    if (!template) throw new Error("The active workout or plan link changed. Reload the logger before saving; your stored draft is preserved.");
    const issue = planRecoveryIssue({ template, context }, false);
    if (issue) throw new Error(issue);
  }
}

export function writeWorkoutDraft(editor: WorkoutDraftEditor, draft: unknown): WorkoutDraftEditor {
  assertWorkoutDraftEditor(editor);
  const template = readPlanning<LocalWorkoutBuilderSessionTemplate | null>(activeTemplateKey, null);
  const original = readPlanning<unknown>(editor.key, null);
  const form = object(original) && object(draft) ? { ...original, ...draft } : draft;
  const next = template && object(form)
    ? { ...form, recovery: { ...(object(form.recovery) ? form.recovery : {}), template, context: readPlanning(planningKeys.context, null) } } : form;
  if (!object(next)) throw new Error("The proposed workout draft needs review. Original entries and active session are preserved.");
  const issue = workoutSessionDraftIssue(next, template?.exercises.length || 8, template, readPlanning(planningKeys.context, null));
  if (issue) throw new Error(issue);
  writePlanning(editor.key, JSON.parse(JSON.stringify(next)));
  return { ...editor, draftVersion: planningRecordVersion(editor.key) };
}

/** Preserve the reviewed original before replacing its active slot with a completion receipt. */
export function finalizeWorkoutDraft(editor: WorkoutDraftEditor, id: string, logs: unknown, completedAt: string) {
  assertWorkoutDraftEditor(editor);
  const original = readPlanning<unknown>(editor.key, null);
  const evidence = readWorkoutCompletionEvidence(false);
  const completions = evidence.filter(log => log.id === id);
  if (completions.length !== 1 || completions[0].completedAt !== completedAt)
    throw new Error("The saved completion needs review before finalizing this draft. Original entries are preserved.");
  if (!object(original) || original.id !== id || original.completedAt != null)
    throw new Error("This workout draft changed or was already finalized. Review the original entries before continuing.");
  const template = readPlanning<LocalWorkoutBuilderSessionTemplate | null>(activeTemplateKey, null);
  const context = readPlanning<LocalActiveWorkoutSessionContext | null>(planningKeys.context, null);
  const completion = completions[0];
  if ((completion.templateId ?? null) !== (template?.id ?? null)
    || (["planId", "planDayId", "assignmentId"] as const).some(field =>
      (completion[field] ?? null) !== (context?.[field] ?? null))
    || context && evidence.filter(log => log.assignmentId === context.assignmentId).length !== 1)
    throw new Error("The saved completion's workout or plan links differ from this draft. Review History before finalizing; original entries are preserved.");
  if (sessionReportLogs([completion]).length !== 1 || completion.entries.length > (template?.exercises.length || 8)
    || !completion.entries.every(validExerciseSemanticMetadata))
    throw new Error("The saved completion entries need review before finalizing this draft. Original entries and plan context are preserved; review History before continuing.");
  const totalsIssue = workoutNumericTotalsIssue(completion.entries.map(entry => ({
    sets: goalNumber(entry.sets), reps: goalNumber(entry.reps), weight: goalNumber(entry.weight),
    unit: recordedWorkoutLoadUnit(entry as unknown as Record<string, unknown>),
  })));
  if (totalsIssue) throw new Error(totalsIssue + " Review History before finalizing; original records and your draft are preserved.");
  assertWorkoutChronology(completion.entries, completion.completedAt, { startedAt: completion.startedAt });
  const receipt = { id, logs, completedAt };
  const issue = workoutSessionDraftIssue(receipt, template?.exercises.length || 8, template, readPlanning(planningKeys.context, null));
  if (issue) throw new Error(issue);
  let recoveryKey: string;
  do { recoveryKey = PRESERVED_COMPLETION_DRAFT_PREFIX + crypto.randomUUID(); }
  while (Object.hasOwn(planningSnapshot(), recoveryKey));
  writePlanningValues({
    [recoveryKey]: structuredClone(original),
    [editor.key]: structuredClone(receipt),
    [planningKeys.context]: null,
  });
  return recoveryKey;
}

const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const nonempty = (value: unknown): value is string => typeof value === "string" && Boolean(value.trim());
type RecoverableDraft = { id: string; logs: Record<string, { sets: string; reps: string; weight: string; weightUnit?: string }>; recovery: { template: LocalWorkoutBuilderSessionTemplate; context: LocalActiveWorkoutSessionContext | null } };
function recoveryDraft(key: string, value: unknown): RecoverableDraft | null {
  if (!object(value) || !nonempty(value.id) || !object(value.logs) || !object(value.recovery) || value.completedAt != null) return null;
  const template = value.recovery.template;
  if (activeSessionTemplateIssue(template)) return null;
  if (!object(template) || !nonempty(template.id) || !nonempty(template.title) || typeof template.startedAt !== "string" || !Number.isFinite(activityTimestamp(template.startedAt)) || !Array.isArray(template.exercises) || !template.exercises.length
    || !template.exercises.every(item => object(item) && nonempty(item.id) && nonempty(item.name) && ["body", "pattern", "goal", "equipment"].every(field => item[field] == null || typeof item[field] === "string"))) return null;
  if (key !== workoutDraftKey(template as LocalWorkoutBuilderSessionTemplate)) return null;
  const exerciseCount = template.exercises.length;
  const context = value.recovery.context;
  if (context !== null && (!object(context) || context.source !== "plan" || context.id !== value.id || context.templateId !== template.id || context.startedAt !== template.startedAt || ![context.planId, context.planDayId, context.planDayDate, context.assignmentId, context.startedAt].every(nonempty) || typeof context.startedAt !== "string" || !Number.isFinite(activityTimestamp(context.startedAt)))) return null;
  if (workoutSessionDraftIssue(value, exerciseCount, template as LocalWorkoutBuilderSessionTemplate, context)) return null;
  return value as RecoverableDraft;
}

function planRecoveryIssue({ template, context }: RecoverableDraft["recovery"], checkCompletion = true): string | null {
  if (!context) return null;
  const inspected = inspectWorkoutPlans();
  if (inspected.issue) return "Saved workout plans need review before using this draft's assignment. Open My Plan to review the original plans; your workout and entries are preserved for export.";
  const plan = inspected.plans.find(item => item.id === context.planId);
  const day = plan?.days.find(item => item.id === context.planDayId);
  const assignment = day?.assignments.find(item => item.id === context.assignmentId);
  if (!plan || plan.status === "archived" || !day || day.date !== context.planDayDate || context.templateId !== template.id || !assignment || checkCompletion && assignmentCompleted(assignment.id)
    || assignmentTemplateIssue(assignment, template)) return "This draft's plan assignment changed, was archived, or completed. The original workout and entries are preserved for review and export.";
  return null;
}

export function unfinishedWorkoutDrafts() {
  const completed = new Map(readAvailableWorkoutLogs().map(log => [log.id, log]));
  return Object.entries(planningSnapshot()).filter(([key, value]) => {
    const id = typeof value === "string" ? value : object(value) && nonempty(value.id) ? value.id : null;
    const completion = id ? completed.get(id) : null;
    const finalized = completion && (typeof value === "string" || (object(value) && value.completedAt === completion.completedAt));
    return key.startsWith("loggerDraft:") && value != null && (!finalized || (key.startsWith(PRESERVED_DEFAULT_DRAFT_PREFIX) || key.startsWith(PRESERVED_COMPLETION_DRAFT_PREFIX))) && (key !== "loggerDraft:default" || Boolean(completion));
  }).map(([key, value]) => {
    const draft = recoveryDraft(key, value);
    const completionRecorded = object(value) && typeof value.id === "string" && completed.has(value.id);
    const json = JSON.stringify(value, null, 2);
    const recoveryIssue = draft ? planRecoveryIssue(draft.recovery) : null;
    return { key, generation: planningAccountGeneration(), version: planningRecordVersion(key), title: draft?.recovery.template.title || (key.startsWith(PRESERVED_DEFAULT_DRAFT_PREFIX) ? "Preserved default workout draft" : key.startsWith(PRESERVED_COMPLETION_DRAFT_PREFIX) ? "Preserved completed workout draft" : key === "loggerDraft:default" ? "Default workout draft" : "Older workout draft"), startedAt: draft?.recovery.template.startedAt || null, completionRecorded, recoveryIssue, resumable: Boolean(draft) && !completionRecorded && !recoveryIssue, preview: json.slice(0, 12000), previewTruncated: json.length > 12000 };
  }).sort((a, b) => (b.startedAt || "").localeCompare(a.startedAt || "") || a.key.localeCompare(b.key));
}

/** Exact local recovery copy, with no repair, deletion, upload, or completion mutation. */
export function exportWorkoutDraft(key: string, version: string, account: string | null, generation: number) {
  if (!account || account !== planningOwner() || generation !== planningAccountGeneration()) throw new Error("Your account changed. Reload the logger before exporting.");
  if (!key.startsWith("loggerDraft:") || !Object.hasOwn(planningSnapshot(), key) || readPlanning(key, null) == null) throw new Error("This workout draft is no longer available.");
  if (planningRecordVersion(key) !== version) throw new Error("This draft changed. Review the updated saved values before exporting.");
  return JSON.stringify({ format: "sound-fitness-workout-draft", version: 1, key, value: readPlanning(key, null) }, null, 2);
}

/** Keep the exact conflict as a separate recovery record before opening a new default session. */
export function preserveCompletedDefaultDraft(version: string, editor: WorkoutDraftEditor) {
  assertWorkoutDraftEditor(editor);
  const key = "loggerDraft:default";
  if (planningRecordVersion(key) !== version) throw new Error("This draft changed. Review the updated saved values before starting a new workout.");
  const value = readPlanning<unknown>(key, null);
  if (!object(value) || !nonempty(value.id)) throw new Error("No completed default draft is available to preserve.");
  const completion = readAvailableWorkoutLogs().find(log => log.id === value.id);
  if (!completion || value.completedAt === completion.completedAt) throw new Error("This default draft is not an unresolved completion. Reload the logger before starting a new workout.");
  const recoveryKey = createPreservedDefaultDraftKey();
  writePlanningValues({
    [recoveryKey]: structuredClone(value),
    [key]: null,
    [activeTemplateKey]: null,
    [planningKeys.context]: null,
  });
  return recoveryKey;
}

export function resumeWorkoutDraft(key: string, version: string, account: string | null, generation: number) {
  if (!account || account !== planningOwner() || generation !== planningAccountGeneration()) throw new Error("Your account changed. Reload the logger before resuming.");
  if (planningRecordVersion(key) !== version) throw new Error("This draft changed. Review the updated draft list before resuming.");
  const draft = recoveryDraft(key, readPlanning(key, null));
  if (!draft) throw new Error("This older draft has no verified workout snapshot. Its original values are preserved for review.");
  if (readAvailableWorkoutLogs().some(log => log.id === draft.id)) throw new Error("This workout is already completed. Review it in History.");
  const { template, context } = draft.recovery;
  const recoveryIssue = planRecoveryIssue(draft.recovery);
  if (recoveryIssue) throw new Error(recoveryIssue);
  assertActiveSessionReviewed();
  writePlanningValues({ [activeTemplateKey]: JSON.parse(JSON.stringify(template)), [planningKeys.context]: JSON.parse(JSON.stringify(context)) });
  return JSON.parse(JSON.stringify(template)) as LocalWorkoutBuilderSessionTemplate;
}

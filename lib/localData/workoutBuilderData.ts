import type { ExerciseSemanticMetadata } from "@/lib/planning/exerciseSemanticMetadata";
import { readPlanning, writePlanning, writePlanningValues, planningKeys, planningSnapshot } from "@/lib/planning/store";
import type { WorkoutTargets } from "@/lib/planning/workoutTargets";
import type { ExerciseCatalogItem } from "@/types";
import { validatePlanningImport } from "@/lib/planning/importValidation";
import { ambiguousWorkoutTemplateIds } from "@/lib/planning/templateRecommendations";
import { activeSessionTemplateIssue, assertActiveSessionReviewed, MAX_WORKOUT_SESSION_EXERCISES } from "@/lib/planning/activeSessionRecovery";

export const LOCAL_WORKOUT_BUILDER_STORAGE_KEYS = {
  selectedExercises: "soundFitnessWorkoutBuilderSelectedExercises",
  savedTemplates: "soundFitnessWorkoutBuilderSavedTemplates",
  activeSessionTemplate: "soundFitnessWorkoutBuilderActiveSessionTemplate",
} as const;

export type LocalWorkoutBuilderSelectedExercise = Pick<
  ExerciseCatalogItem,
  "id" | "name" | "body" | "pattern" | "goal" | "equipment"
> & ExerciseSemanticMetadata & { workoutTargets?: WorkoutTargets };

export type LocalWorkoutBuilderTemplate = {
  cloudRevision?: number;
  syncPending?: boolean;
  syncKey?: string;
  syncError?: string;
  id: string;
  title: string;
  exercises: LocalWorkoutBuilderSelectedExercise[];
  createdAt: string;
  updatedAt: string;
};

export type LocalWorkoutBuilderSessionTemplate = LocalWorkoutBuilderTemplate & {
  startedAt: string;
};

/** Sync metadata does not change the workout a member reviewed. */
export function workoutTemplateContentVersion(template: Pick<LocalWorkoutBuilderTemplate, "id" | "title" | "exercises">) {
  return JSON.stringify({ id: template.id, title: template.title, exercises: template.exercises }, (_key, value) =>
    value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value);
}

const canUseLocalStorage = () =>
  typeof window !== "undefined" && Boolean(window.localStorage);

const readLocalArray = <T>(key: string) => {
  if (key === LOCAL_WORKOUT_BUILDER_STORAGE_KEYS.savedTemplates || key === planningKeys.selectedExercises) { const value = readPlanning<unknown>(key, []); return Array.isArray(value) ? value as T[] : []; }
  if (!canUseLocalStorage()) return [];

  const saved = window.localStorage.getItem(key);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const writeLocalArray = <T>(key: string, items: T[]) => {
  if (!canUseLocalStorage()) return;

  if (key === LOCAL_WORKOUT_BUILDER_STORAGE_KEYS.savedTemplates || key === planningKeys.selectedExercises) { writePlanning(key, items); return; }
  window.localStorage.setItem(key, JSON.stringify(items));
};

const readLocalObject = <T>(key: string) => {
  if (key === LOCAL_WORKOUT_BUILDER_STORAGE_KEYS.activeSessionTemplate) return readPlanning<T | null>(key, null);
  if (!canUseLocalStorage()) return null;

  const saved = window.localStorage.getItem(key);
  if (!saved) return null;

  try {
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === "object" ? (parsed as T) : null;
  } catch {
    return null;
  }
};

const removeLocalItem = (key: string) => {
  if (!canUseLocalStorage()) return;

  if (key === LOCAL_WORKOUT_BUILDER_STORAGE_KEYS.activeSessionTemplate) { writePlanning(key, null); return; }
  window.localStorage.removeItem(key);
};

export const hasWorkoutBuilderSelectedExercises = () => {
  if (!canUseLocalStorage()) return false;

  return readPlanning(planningKeys.selectedExercises, null) !== null;
};

export const toWorkoutBuilderSelectedExercise = (
  exercise: ExerciseCatalogItem,
): LocalWorkoutBuilderSelectedExercise => ({
  id: exercise.id,
  name: exercise.name,
  body: exercise.body,
  pattern: exercise.pattern,
  goal: exercise.goal,
  equipment: exercise.equipment,
});

export const readWorkoutBuilderSelectedExercises = () =>
  readLocalArray<LocalWorkoutBuilderSelectedExercise>(
    LOCAL_WORKOUT_BUILDER_STORAGE_KEYS.selectedExercises,
  );

export const readWorkoutBuilderSelectedExerciseNames = () =>
  readWorkoutBuilderSelectedExercises()
    .map((exercise) => exercise.name)
    .filter(Boolean);

export const writeWorkoutBuilderSelectedExercises = (
  exercises: ExerciseCatalogItem[],
) => {
  writeLocalArray(
    LOCAL_WORKOUT_BUILDER_STORAGE_KEYS.selectedExercises,
    exercises.map(toWorkoutBuilderSelectedExercise),
  );
};

const createLocalTemplateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const readWorkoutBuilderTemplates = () =>
  readLocalArray<LocalWorkoutBuilderTemplate>(
    LOCAL_WORKOUT_BUILDER_STORAGE_KEYS.savedTemplates,
  );

/** Resolve only a unique saved identity; preserve all originals when it is ambiguous. */
export function resolveUniqueSavedWorkoutTemplate(id: unknown) {
  if (typeof id !== "string" || !id.trim()) return undefined;
  const templates = readWorkoutBuilderTemplates();
  if (ambiguousWorkoutTemplateIds(templates).has(id.trim())) throw new Error("Saved workout ID is duplicated. Review the original workout library before assigning or starting; your plan and active session are preserved.");
  return templates.find(template => template?.id === id);
}

/** A tolerant display read must never turn damaged originals into an empty save target. */
export function readWorkoutBuilderTemplatesForSave(): LocalWorkoutBuilderTemplate[] {
  const snapshot = planningSnapshot();
  const original = Object.hasOwn(snapshot, planningKeys.templates) ? snapshot[planningKeys.templates] : [];
  if (!Array.isArray(original) || validatePlanningImport({ [planningKeys.templates]: original }) || ambiguousWorkoutTemplateIds(original).size) throw new Error("Saved workout library needs review before saving. Malformed or duplicate originals are preserved; keep your unsaved workout and export a planning backup.");
  return original as LocalWorkoutBuilderTemplate[];
}

export const writeWorkoutBuilderTemplates = (
  templates: LocalWorkoutBuilderTemplate[],
) => {
  writeLocalArray(LOCAL_WORKOUT_BUILDER_STORAGE_KEYS.savedTemplates, templates);
};

export const saveWorkoutBuilderTemplate = ({
  title,
  exercises,
}: {
  title: string;
  exercises: ExerciseCatalogItem[];
}) => {
  const now = new Date().toISOString();
  const normalizedTitle = title.trim() || "Untitled Workout Template";
  const savedExerciseRecords = exercises.map(toWorkoutBuilderSelectedExercise);
  const existingTemplates = readWorkoutBuilderTemplatesForSave();
  if (existingTemplates.filter(template => template.title.trim().toLowerCase() === normalizedTitle.toLowerCase()).length > 1) throw new Error("More than one saved workout has this title. Choose a different title before saving; the originals are preserved.");
  const existingTemplate = existingTemplates.find(
    (template) =>
      template.title.trim().toLowerCase() === normalizedTitle.toLowerCase(),
  );
  const savedTemplate: LocalWorkoutBuilderTemplate = {
    ...existingTemplate,
    id: existingTemplate?.id || createLocalTemplateId(),
    title: normalizedTitle,
    exercises: savedExerciseRecords,
    createdAt: existingTemplate?.createdAt || now,
    updatedAt: now,
    cloudRevision: existingTemplate?.cloudRevision ?? 0,
    syncPending: true,
    syncKey: crypto.randomUUID(),
    syncError: undefined,
  };
  const updatedTemplates = existingTemplate
    ? existingTemplates.map((template) =>
        template.id === existingTemplate.id ? savedTemplate : template,
      )
    : [savedTemplate, ...existingTemplates];

  if (validatePlanningImport({ [planningKeys.templates]: [savedTemplate] })) throw new Error("Review the workout title and exercises before saving. Your saved workouts are preserved.");

  writeWorkoutBuilderTemplates(updatedTemplates);
  return { template: savedTemplate, templates: updatedTemplates };
};

/** Prepare a detached, validated session without replacing active data. */
export const prepareWorkoutSessionTemplate = (
  template: LocalWorkoutBuilderTemplate,
) => {
  if (!template?.exercises?.length || validatePlanningImport({ [planningKeys.templates]: [template] })) throw new Error("Review the workout title and exercises before starting. Your active session is preserved.");
  assertActiveSessionReviewed();
  const snapshot = planningSnapshot();
  const active = snapshot[LOCAL_WORKOUT_BUILDER_STORAGE_KEYS.activeSessionTemplate] as LocalWorkoutBuilderSessionTemplate | null;
  const now = Date.now();
  const priorStart = typeof active?.startedAt === "string" ? Date.parse(active.startedAt) : NaN;
  if (Number.isFinite(priorStart) && priorStart > now + 1000) throw new Error("The active workout start time needs review. Its original session and drafts are preserved.");
  const startBase = Number.isFinite(priorStart) ? Math.max(now, priorStart + 1) : now;
  let startedAt = "";
  for (let offset = 0; offset < 1000; offset++) {
    const candidate = new Date(startBase + offset).toISOString();
    if (!(active?.id === template.id && active.startedAt === candidate) && !Object.hasOwn(snapshot, `loggerDraft:${template.id}:${candidate}`)) {
      startedAt = candidate;
      break;
    }
  }
  if (!startedAt) throw new Error("A distinct workout start could not be created. Your active session and drafts are preserved; try again.");
  const sessionTemplate = JSON.parse(JSON.stringify({
    ...template,
    startedAt,
  })) as LocalWorkoutBuilderSessionTemplate;
  const sessionIssue = activeSessionTemplateIssue(sessionTemplate);
  if (sessionIssue) throw new Error(`This workout cannot start in the session logger. ${sessionIssue} Keep the workout within the supported ${MAX_WORKOUT_SESSION_EXERCISES}-exercise limit; your active session and drafts are preserved.`);
  return sessionTemplate;
};

export const writeActiveWorkoutBuilderSessionTemplate = (
  template: LocalWorkoutBuilderTemplate,
) => {
  const sessionTemplate = prepareWorkoutSessionTemplate(template);

  writePlanningValues({
    [planningKeys.context]: null,
    [LOCAL_WORKOUT_BUILDER_STORAGE_KEYS.activeSessionTemplate]: sessionTemplate,
  });

  return JSON.parse(JSON.stringify(sessionTemplate)) as LocalWorkoutBuilderSessionTemplate;
};

export function startSavedWorkoutBuilderSession(template: LocalWorkoutBuilderTemplate) {
  const current = resolveUniqueSavedWorkoutTemplate(template.id);
  if (!current) throw new Error("This saved workout is no longer available. Refresh your saved workouts before starting.");
  if (workoutTemplateContentVersion(current) !== workoutTemplateContentVersion(template)) throw new Error("This saved workout changed. Review its current exercises before starting; your active session is preserved.");
  return writeActiveWorkoutBuilderSessionTemplate(current);
}

export const readActiveWorkoutBuilderSessionTemplate = () =>
  readLocalObject<LocalWorkoutBuilderSessionTemplate>(
    LOCAL_WORKOUT_BUILDER_STORAGE_KEYS.activeSessionTemplate,
  );

export const clearActiveWorkoutBuilderSessionTemplate = () => {
  removeLocalItem(LOCAL_WORKOUT_BUILDER_STORAGE_KEYS.activeSessionTemplate);
};

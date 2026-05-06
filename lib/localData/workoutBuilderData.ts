import type { ExerciseCatalogItem } from "@/types";

export const LOCAL_WORKOUT_BUILDER_STORAGE_KEYS = {
  selectedExercises: "soundFitnessWorkoutBuilderSelectedExercises",
  savedTemplates: "soundFitnessWorkoutBuilderSavedTemplates",
  activeSessionTemplate: "soundFitnessWorkoutBuilderActiveSessionTemplate",
} as const;

export type LocalWorkoutBuilderSelectedExercise = Pick<
  ExerciseCatalogItem,
  "id" | "name" | "body" | "pattern" | "goal" | "equipment"
>;

export type LocalWorkoutBuilderTemplate = {
  id: string;
  title: string;
  exercises: LocalWorkoutBuilderSelectedExercise[];
  createdAt: string;
  updatedAt: string;
};

export type LocalWorkoutBuilderSessionTemplate = LocalWorkoutBuilderTemplate & {
  startedAt: string;
};

const canUseLocalStorage = () =>
  typeof window !== "undefined" && Boolean(window.localStorage);

const readLocalArray = <T>(key: string) => {
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

  window.localStorage.setItem(key, JSON.stringify(items));
};

const readLocalObject = <T>(key: string) => {
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

const writeLocalObject = <T>(key: string, item: T) => {
  if (!canUseLocalStorage()) return;

  window.localStorage.setItem(key, JSON.stringify(item));
};

const removeLocalItem = (key: string) => {
  if (!canUseLocalStorage()) return;

  window.localStorage.removeItem(key);
};

export const hasWorkoutBuilderSelectedExercises = () => {
  if (!canUseLocalStorage()) return false;

  return window.localStorage.getItem(
    LOCAL_WORKOUT_BUILDER_STORAGE_KEYS.selectedExercises,
  ) !== null;
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
  const existingTemplates = readWorkoutBuilderTemplates();
  const existingTemplate = existingTemplates.find(
    (template) =>
      template.title.trim().toLowerCase() === normalizedTitle.toLowerCase(),
  );
  const savedTemplate: LocalWorkoutBuilderTemplate = {
    id: existingTemplate?.id || createLocalTemplateId(),
    title: normalizedTitle,
    exercises: savedExerciseRecords,
    createdAt: existingTemplate?.createdAt || now,
    updatedAt: now,
  };
  const updatedTemplates = existingTemplate
    ? existingTemplates.map((template) =>
        template.id === existingTemplate.id ? savedTemplate : template,
      )
    : [savedTemplate, ...existingTemplates];

  writeWorkoutBuilderTemplates(updatedTemplates);
  return { template: savedTemplate, templates: updatedTemplates };
};

export const writeActiveWorkoutBuilderSessionTemplate = (
  template: LocalWorkoutBuilderTemplate,
) => {
  const sessionTemplate: LocalWorkoutBuilderSessionTemplate = {
    ...template,
    startedAt: new Date().toISOString(),
  };

  writeLocalObject(
    LOCAL_WORKOUT_BUILDER_STORAGE_KEYS.activeSessionTemplate,
    sessionTemplate,
  );

  return sessionTemplate;
};

export const readActiveWorkoutBuilderSessionTemplate = () =>
  readLocalObject<LocalWorkoutBuilderSessionTemplate>(
    LOCAL_WORKOUT_BUILDER_STORAGE_KEYS.activeSessionTemplate,
  );

export const clearActiveWorkoutBuilderSessionTemplate = () => {
  removeLocalItem(LOCAL_WORKOUT_BUILDER_STORAGE_KEYS.activeSessionTemplate);
};

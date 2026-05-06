import { supabase } from "@/lib/supabaseClient";
import {
  readWorkoutBuilderTemplates,
  type LocalWorkoutBuilderSelectedExercise,
  type LocalWorkoutBuilderTemplate,
  writeWorkoutBuilderTemplates,
} from "@/lib/localData/workoutBuilderData";
import {
  readExerciseStats,
  saveWorkoutSessionExerciseStats,
} from "@/lib/localData/workoutData";
import type { LocalExerciseStatEntry } from "@/types";

export type WorkoutPersistenceSource = "supabase" | "localStorage";

export type WorkoutPersistenceResult<T> = {
  source: WorkoutPersistenceSource;
  success: boolean;
  data: T;
  error: string | null;
};

export type AuthenticatedWorkoutProfile = {
  userId: string;
  profileId: string;
  email: string | null;
};

export type SaveCompletedWorkoutLogInput = {
  title?: string;
  templateId?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  entries: LocalExerciseStatEntry[];
};

export type SavedWorkoutLogSummary = {
  workoutLogId: string | null;
  entries: LocalExerciseStatEntry[];
};

type WorkoutTemplateRow = {
  id: string;
  owner_profile_id: string;
  title: string;
  goal: string | null;
  source: string;
  status: "draft" | "active" | "archived";
  created_at: string;
  updated_at: string;
};

type WorkoutTemplateExerciseRow = {
  id: string;
  workout_template_id: string;
  exercise_id: string | null;
  exercise_name: string;
  body: string | null;
  pattern: string | null;
  equipment: string | null;
  order_index: number;
  target_sets: number | null;
  target_reps: string | null;
  target_rest_seconds: number | null;
  tempo: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type WorkoutLogRow = {
  id: string;
  profile_id: string;
  workout_template_id: string | null;
  title: string;
  status: "planned" | "in_progress" | "completed" | "cancelled";
  started_at: string | null;
  completed_at: string | null;
  source: string;
  created_at: string;
  updated_at: string;
};

type WorkoutSetLogRow = {
  id: string;
  workout_log_id: string;
  profile_id: string;
  exercise_id: string | null;
  exercise_name: string;
  body: string | null;
  pattern: string | null;
  equipment: string | null;
  weight: number | null;
  reps: number | null;
  sets: number | null;
  performed_at: string;
  source: "exercise-library" | "workout-session" | string;
  order_index: number;
  created_at: string;
  updated_at: string;
};

type WorkoutTemplateInsert = {
  id?: string;
  owner_profile_id: string;
  title: string;
  goal: string | null;
  source: string;
  status: WorkoutTemplateRow["status"];
};

type WorkoutTemplateExerciseInsert = {
  workout_template_id: string;
  exercise_id: string | null;
  exercise_name: string;
  body: string | null;
  pattern: string | null;
  equipment: string | null;
  order_index: number;
};

type WorkoutLogInsert = {
  profile_id: string;
  workout_template_id: string | null;
  title: string;
  status: WorkoutLogRow["status"];
  started_at: string | null;
  completed_at: string | null;
  source: string;
};

type WorkoutSetLogInsert = {
  workout_log_id: string;
  profile_id: string;
  exercise_id: string | null;
  exercise_name: string;
  body: string | null;
  pattern: string | null;
  equipment: string | null;
  weight: number | null;
  reps: number | null;
  sets: number | null;
  performed_at: string;
  source: string;
  order_index: number;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createResult = <T>({
  source,
  success,
  data,
  error = null,
}: WorkoutPersistenceResult<T>): WorkoutPersistenceResult<T> => ({
  source,
  success,
  data,
  error,
});

const getErrorMessage = (error: unknown) => {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : JSON.stringify(error);
  }

  return String(error);
};

const isUuid = (value: string | null | undefined) =>
  Boolean(value && UUID_PATTERN.test(value));

const parsePositiveInteger = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return null;

  const parsed = typeof value === "number" ? value : Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const parseNonNegativeNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return null;

  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const normalizeWorkoutTitle = (title?: string | null) =>
  title?.trim() || "Workout Session";

const normalizeTemplateTitle = (title: string) =>
  title.trim() || "Untitled Workout Template";

const normalizeStatEntries = (entries: LocalExerciseStatEntry[]) =>
  entries.map((entry) => ({
    ...entry,
    date: entry.date || new Date().toISOString(),
    source: entry.source || "workout-session",
  }));

export const getCurrentAuthenticatedWorkoutProfile = async (): Promise<
  WorkoutPersistenceResult<AuthenticatedWorkoutProfile | null>
> => {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return createResult({
      source: "supabase",
      success: false,
      data: null,
      error: getErrorMessage(error),
    });
  }

  if (!data.user) {
    return createResult({
      source: "supabase",
      success: false,
      data: null,
      error: "No authenticated Supabase user.",
    });
  }

  return createResult({
    source: "supabase",
    success: true,
    data: {
      userId: data.user.id,
      profileId: data.user.id,
      email: data.user.email ?? null,
    },
    error: null,
  });
};

export const mapTemplateExerciseRowToLocalExercise = (
  row: WorkoutTemplateExerciseRow,
): LocalWorkoutBuilderSelectedExercise => ({
  id: row.exercise_id || row.id,
  name: row.exercise_name,
  body: row.body || "",
  pattern: row.pattern || "",
  goal: "",
  equipment: row.equipment || "",
});

export const mapWorkoutTemplateRowsToLocalTemplate = (
  templateRow: WorkoutTemplateRow,
  exerciseRows: WorkoutTemplateExerciseRow[],
): LocalWorkoutBuilderTemplate => ({
  id: templateRow.id,
  title: templateRow.title,
  exercises: [...exerciseRows]
    .sort((first, second) => first.order_index - second.order_index)
    .map(mapTemplateExerciseRowToLocalExercise),
  createdAt: templateRow.created_at,
  updatedAt: templateRow.updated_at,
});

export const mapLocalTemplateToTemplateInsert = (
  template: LocalWorkoutBuilderTemplate,
  profileId: string,
): WorkoutTemplateInsert => ({
  ...(isUuid(template.id) ? { id: template.id } : {}),
  owner_profile_id: profileId,
  title: normalizeTemplateTitle(template.title),
  goal: null,
  source: "builder",
  status: "active",
});

export const mapLocalTemplateExerciseToInsert = (
  exercise: LocalWorkoutBuilderSelectedExercise,
  templateId: string,
  orderIndex: number,
): WorkoutTemplateExerciseInsert => ({
  workout_template_id: templateId,
  exercise_id: exercise.id || null,
  exercise_name: exercise.name,
  body: exercise.body || null,
  pattern: exercise.pattern || null,
  equipment: exercise.equipment || null,
  order_index: orderIndex,
});

export const mapSetLogRowToLocalStatEntry = (
  row: WorkoutSetLogRow,
): LocalExerciseStatEntry => ({
  exerciseId: row.exercise_id || row.id,
  exerciseName: row.exercise_name,
  body: row.body || undefined,
  pattern: row.pattern || undefined,
  equipment: row.equipment || undefined,
  weight: row.weight === null ? "" : String(row.weight),
  reps: row.reps === null ? "" : String(row.reps),
  sets: row.sets === null ? "" : String(row.sets),
  date: row.performed_at,
  source:
    row.source === "exercise-library" || row.source === "workout-session"
      ? row.source
      : "workout-session",
});

export const mapLocalStatEntryToSetLogInsert = (
  entry: LocalExerciseStatEntry,
  workoutLogId: string,
  profileId: string,
  orderIndex: number,
): WorkoutSetLogInsert => ({
  workout_log_id: workoutLogId,
  profile_id: profileId,
  exercise_id: entry.exerciseId || null,
  exercise_name: entry.exerciseName,
  body: entry.body || null,
  pattern: entry.pattern || null,
  equipment: entry.equipment || null,
  weight: parseNonNegativeNumber(entry.weight),
  reps: parsePositiveInteger(entry.reps),
  sets: parsePositiveInteger(entry.sets),
  performed_at: entry.date || new Date().toISOString(),
  source: entry.source || "workout-session",
  order_index: orderIndex,
});

export const loadWorkoutTemplatesFromLocalStorage = (): WorkoutPersistenceResult<
  LocalWorkoutBuilderTemplate[]
> =>
  createResult({
    source: "localStorage",
    success: true,
    data: readWorkoutBuilderTemplates(),
    error: null,
  });

export const saveWorkoutTemplateToLocalStorage = (
  template: LocalWorkoutBuilderTemplate,
): WorkoutPersistenceResult<LocalWorkoutBuilderTemplate> => {
  const now = new Date().toISOString();
  const normalizedTitle = normalizeTemplateTitle(template.title);
  const existingTemplates = readWorkoutBuilderTemplates();
  const existingTemplate = existingTemplates.find(
    (storedTemplate) =>
      storedTemplate.id === template.id ||
      storedTemplate.title.trim().toLowerCase() ===
        normalizedTitle.toLowerCase(),
  );
  const savedTemplate: LocalWorkoutBuilderTemplate = {
    ...template,
    title: normalizedTitle,
    createdAt: existingTemplate?.createdAt || template.createdAt || now,
    updatedAt: now,
  };
  const nextTemplates = existingTemplate
    ? existingTemplates.map((storedTemplate) =>
        storedTemplate.id === existingTemplate.id
          ? savedTemplate
          : storedTemplate,
      )
    : [savedTemplate, ...existingTemplates];

  writeWorkoutBuilderTemplates(nextTemplates);

  return createResult({
    source: "localStorage",
    success: true,
    data: savedTemplate,
    error: null,
  });
};

export const loadWorkoutLogEntriesFromLocalStorage =
  (): WorkoutPersistenceResult<LocalExerciseStatEntry[]> =>
    createResult({
      source: "localStorage",
      success: true,
      data: readExerciseStats(),
      error: null,
    });

export const saveCompletedWorkoutLogToLocalStorage = (
  input: SaveCompletedWorkoutLogInput,
): WorkoutPersistenceResult<SavedWorkoutLogSummary> => {
  const savedEntries = normalizeStatEntries(input.entries);

  saveWorkoutSessionExerciseStats(savedEntries);

  return createResult({
    source: "localStorage",
    success: true,
    data: {
      workoutLogId: null,
      entries: savedEntries,
    },
    error: null,
  });
};

export const loadWorkoutTemplatesFromSupabase = async (): Promise<
  WorkoutPersistenceResult<LocalWorkoutBuilderTemplate[]>
> => {
  const auth = await getCurrentAuthenticatedWorkoutProfile();

  if (!auth.success || !auth.data) {
    return createResult({
      source: "supabase",
      success: false,
      data: [],
      error: auth.error,
    });
  }

  const { data: templateRows, error: templateError } = await supabase
    .from("workout_templates")
    .select("*")
    .eq("owner_profile_id", auth.data.profileId)
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  if (templateError) {
    return createResult({
      source: "supabase",
      success: false,
      data: [],
      error: getErrorMessage(templateError),
    });
  }

  const templates = (templateRows || []) as WorkoutTemplateRow[];
  const templateIds = templates.map((template) => template.id);

  if (templateIds.length === 0) {
    return createResult({
      source: "supabase",
      success: true,
      data: [],
      error: null,
    });
  }

  const { data: exerciseRows, error: exerciseError } = await supabase
    .from("workout_template_exercises")
    .select("*")
    .in("workout_template_id", templateIds)
    .order("order_index", { ascending: true });

  if (exerciseError) {
    return createResult({
      source: "supabase",
      success: false,
      data: [],
      error: getErrorMessage(exerciseError),
    });
  }

  const exercises = (exerciseRows || []) as WorkoutTemplateExerciseRow[];

  return createResult({
    source: "supabase",
    success: true,
    data: templates.map((template) =>
      mapWorkoutTemplateRowsToLocalTemplate(
        template,
        exercises.filter(
          (exercise) => exercise.workout_template_id === template.id,
        ),
      ),
    ),
    error: null,
  });
};

export const saveWorkoutTemplateToSupabase = async (
  template: LocalWorkoutBuilderTemplate,
): Promise<WorkoutPersistenceResult<LocalWorkoutBuilderTemplate>> => {
  const auth = await getCurrentAuthenticatedWorkoutProfile();

  if (!auth.success || !auth.data) {
    return createResult({
      source: "supabase",
      success: false,
      data: template,
      error: auth.error,
    });
  }

  const templatePayload = mapLocalTemplateToTemplateInsert(
    template,
    auth.data.profileId,
  );
  const templateQuery = isUuid(template.id)
    ? supabase
        .from("workout_templates")
        .upsert(templatePayload)
        .select("*")
        .single()
    : supabase.from("workout_templates").insert(templatePayload).select("*").single();
  const { data: savedTemplateRow, error: templateError } = await templateQuery;

  if (templateError || !savedTemplateRow) {
    return createResult({
      source: "supabase",
      success: false,
      data: template,
      error: getErrorMessage(templateError) || "Workout template was not saved.",
    });
  }

  const savedTemplate = savedTemplateRow as WorkoutTemplateRow;
  const { data: existingExerciseRows, error: existingExerciseError } =
    await supabase
      .from("workout_template_exercises")
      .select("id")
      .eq("workout_template_id", savedTemplate.id);

  if (existingExerciseError) {
    return createResult({
      source: "supabase",
      success: false,
      data: template,
      error: getErrorMessage(existingExerciseError),
    });
  }

  const existingExerciseIds = (
    (existingExerciseRows || []) as Array<Pick<WorkoutTemplateExerciseRow, "id">>
  ).map((exercise) => exercise.id);
  const exercisePayloads = template.exercises.map((exercise, index) =>
    mapLocalTemplateExerciseToInsert(exercise, savedTemplate.id, index),
  );
  let savedExercises: WorkoutTemplateExerciseRow[] = [];

  if (exercisePayloads.length > 0) {
    const { data: exerciseRows, error: exerciseError } = await supabase
      .from("workout_template_exercises")
      .insert(exercisePayloads)
      .select("*");

    if (exerciseError) {
      return createResult({
        source: "supabase",
        success: false,
        data: template,
        error: getErrorMessage(exerciseError),
      });
    }

    savedExercises = (exerciseRows || []) as WorkoutTemplateExerciseRow[];
  }

  if (existingExerciseIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("workout_template_exercises")
      .delete()
      .in("id", existingExerciseIds);

    if (deleteError) {
      return createResult({
        source: "supabase",
        success: false,
        data: template,
        error: getErrorMessage(deleteError),
      });
    }
  }

  return createResult({
    source: "supabase",
    success: true,
    data: mapWorkoutTemplateRowsToLocalTemplate(savedTemplate, savedExercises),
    error: null,
  });
};

export const loadWorkoutLogRowsFromSupabase = async (): Promise<
  WorkoutPersistenceResult<{
    logs: WorkoutLogRow[];
    setLogs: WorkoutSetLogRow[];
  }>
> => {
  const auth = await getCurrentAuthenticatedWorkoutProfile();

  if (!auth.success || !auth.data) {
    return createResult({
      source: "supabase",
      success: false,
      data: {
        logs: [],
        setLogs: [],
      },
      error: auth.error,
    });
  }

  const { data: logRows, error: logError } = await supabase
    .from("workout_logs")
    .select("*")
    .eq("profile_id", auth.data.profileId)
    .order("completed_at", { ascending: false, nullsFirst: false });

  if (logError) {
    return createResult({
      source: "supabase",
      success: false,
      data: {
        logs: [],
        setLogs: [],
      },
      error: getErrorMessage(logError),
    });
  }

  const logs = (logRows || []) as WorkoutLogRow[];
  const logIds = logs.map((log) => log.id);

  if (logIds.length === 0) {
    return createResult({
      source: "supabase",
      success: true,
      data: {
        logs,
        setLogs: [],
      },
      error: null,
    });
  }

  const { data: setRows, error: setError } = await supabase
    .from("workout_set_logs")
    .select("*")
    .in("workout_log_id", logIds)
    .order("performed_at", { ascending: false })
    .order("order_index", { ascending: true });

  if (setError) {
    return createResult({
      source: "supabase",
      success: false,
      data: {
        logs,
        setLogs: [],
      },
      error: getErrorMessage(setError),
    });
  }

  return createResult({
    source: "supabase",
    success: true,
    data: {
      logs,
      setLogs: (setRows || []) as WorkoutSetLogRow[],
    },
    error: null,
  });
};

export const loadWorkoutLogEntriesFromSupabase = async (): Promise<
  WorkoutPersistenceResult<LocalExerciseStatEntry[]>
> => {
  const result = await loadWorkoutLogRowsFromSupabase();

  return createResult({
    source: "supabase",
    success: result.success,
    data: result.data.setLogs.map(mapSetLogRowToLocalStatEntry),
    error: result.error,
  });
};

export const saveCompletedWorkoutLogToSupabase = async (
  input: SaveCompletedWorkoutLogInput,
): Promise<WorkoutPersistenceResult<SavedWorkoutLogSummary>> => {
  const auth = await getCurrentAuthenticatedWorkoutProfile();
  const normalizedEntries = normalizeStatEntries(input.entries);

  if (!auth.success || !auth.data) {
    return createResult({
      source: "supabase",
      success: false,
      data: {
        workoutLogId: null,
        entries: normalizedEntries,
      },
      error: auth.error,
    });
  }

  if (normalizedEntries.length === 0) {
    return createResult({
      source: "supabase",
      success: false,
      data: {
        workoutLogId: null,
        entries: normalizedEntries,
      },
      error: "Workout log has no exercise entries to save.",
    });
  }

  const profileId = auth.data.profileId;
  const completedAt =
    input.completedAt || normalizedEntries[0]?.date || new Date().toISOString();
  const logPayload: WorkoutLogInsert = {
    profile_id: profileId,
    workout_template_id: isUuid(input.templateId) ? input.templateId || null : null,
    title: normalizeWorkoutTitle(input.title),
    status: "completed",
    started_at: input.startedAt || null,
    completed_at: completedAt,
    source: "workout-session",
  };
  const { data: workoutLogRow, error: logError } = await supabase
    .from("workout_logs")
    .insert(logPayload)
    .select("*")
    .single();

  if (logError || !workoutLogRow) {
    return createResult({
      source: "supabase",
      success: false,
      data: {
        workoutLogId: null,
        entries: normalizedEntries,
      },
      error: getErrorMessage(logError) || "Workout log was not saved.",
    });
  }

  const workoutLog = workoutLogRow as WorkoutLogRow;
  const setPayloads = normalizedEntries.map((entry, index) =>
    mapLocalStatEntryToSetLogInsert(
      entry,
      workoutLog.id,
      profileId,
      index,
    ),
  );
  const { data: setRows, error: setError } = await supabase
    .from("workout_set_logs")
    .insert(setPayloads)
    .select("*");

  if (setError) {
    await supabase
      .from("workout_logs")
      .delete()
      .eq("id", workoutLog.id)
      .eq("profile_id", profileId);

    return createResult({
      source: "supabase",
      success: false,
      data: {
        workoutLogId: workoutLog.id,
        entries: normalizedEntries,
      },
      error: getErrorMessage(setError),
    });
  }

  const savedEntries = ((setRows || []) as WorkoutSetLogRow[]).map(
    mapSetLogRowToLocalStatEntry,
  );

  return createResult({
    source: "supabase",
    success: true,
    data: {
      workoutLogId: workoutLog.id,
      entries: savedEntries.length > 0 ? savedEntries : normalizedEntries,
    },
    error: null,
  });
};

export const loadWorkoutTemplatesWithFallback = async (): Promise<
  WorkoutPersistenceResult<LocalWorkoutBuilderTemplate[]>
> => {
  const supabaseResult = await loadWorkoutTemplatesFromSupabase();

  if (supabaseResult.success && supabaseResult.data.length > 0) {
    return supabaseResult;
  }

  const localResult = loadWorkoutTemplatesFromLocalStorage();

  if (supabaseResult.success) {
    return localResult.data.length > 0 ? localResult : supabaseResult;
  }

  return {
    ...localResult,
    error: supabaseResult.error,
  };
};

export const saveWorkoutTemplateWithFallback = async (
  template: LocalWorkoutBuilderTemplate,
): Promise<WorkoutPersistenceResult<LocalWorkoutBuilderTemplate>> => {
  const localResult = saveWorkoutTemplateToLocalStorage(template);
  const supabaseResult = await saveWorkoutTemplateToSupabase(localResult.data);

  if (supabaseResult.success) return supabaseResult;

  return {
    ...localResult,
    error: supabaseResult.error,
  };
};

export const loadWorkoutLogEntriesWithFallback = async (): Promise<
  WorkoutPersistenceResult<LocalExerciseStatEntry[]>
> => {
  const supabaseResult = await loadWorkoutLogEntriesFromSupabase();

  if (supabaseResult.success && supabaseResult.data.length > 0) {
    return supabaseResult;
  }

  const localResult = loadWorkoutLogEntriesFromLocalStorage();

  if (supabaseResult.success) {
    return localResult.data.length > 0 ? localResult : supabaseResult;
  }

  return {
    ...localResult,
    error: supabaseResult.error,
  };
};

export const saveCompletedWorkoutLogWithFallback = async (
  input: SaveCompletedWorkoutLogInput,
): Promise<WorkoutPersistenceResult<SavedWorkoutLogSummary>> => {
  const localResult = saveCompletedWorkoutLogToLocalStorage(input);
  const supabaseResult = await saveCompletedWorkoutLogToSupabase(input);

  if (supabaseResult.success) return supabaseResult;

  return {
    ...localResult,
    error: supabaseResult.error,
  };
};

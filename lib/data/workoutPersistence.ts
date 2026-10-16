import { mergeExerciseOccurrences } from "@/lib/planning/mergeExerciseOccurrences";
import { getSupabaseUser, supabase } from "@/lib/supabaseClient";
import { readPlanningLogs, recordPlanningLog, markPlanningLogSynced, markPlanningLogSyncError, planningLogUploadConfirmed, planningLogVersion, assertPlanningLogVersion, planningLogHasIdentity } from "@/lib/planning/logs";
import { planningOwner, planningAccountGeneration, planningKeys, planningRecordVersion, planningSnapshot, writePlanningValues, assertPlanningDeviceCurrent } from "@/lib/planning/store";
import { activityTimestamp } from "@/lib/planning/dates";
import { assertWorkoutChronology } from "@/lib/planning/workoutChronology";
import { validatePlanningImport } from "@/lib/planning/importValidation";
import { backendSyncIssue } from "@/lib/planning/backendSyncIssue";
import { workoutSemanticColumns, workoutSemanticsFromRow } from "@/lib/planning/workoutSemanticColumns";
import type { ExerciseSemanticMetadata } from "@/lib/planning/exerciseSemanticMetadata";
import { workoutTargetColumns, workoutTargetsFromColumns } from "@/lib/planning/workoutTemplateTargets";
import { workoutTemplateSaveConfirmed } from "@/lib/planning/workoutTemplateConfirmation";
import { mergeRefreshedWorkoutTemplate, WORKOUT_TEMPLATE_REFRESH_ARCHIVE_PREFIX } from "@/lib/planning/workoutTemplateRefresh";
import { workoutLoadUnitEvidence, unsupportedWorkoutLoadUnitEvidence, recordedWorkoutLoadUnit, workoutNumericReportingIssue, workoutNumericTotalsIssue, WORKOUT_LOAD_UNIT_REVIEW } from "@/lib/planning/loadUnitEvidence";
import {
  readWorkoutBuilderTemplates,
  readWorkoutBuilderTemplatesForSave,
  workoutTemplateContentVersion,
  type LocalWorkoutBuilderSelectedExercise,
  type LocalWorkoutBuilderTemplate,
  writeWorkoutBuilderTemplates,
} from "@/lib/localData/workoutBuilderData";
import {
  readExerciseStats,
} from "@/lib/localData/workoutData";
import type { LocalExerciseStatEntry } from "@/types";

export type WorkoutPersistenceSource = "supabase" | "localStorage";

export type WorkoutPersistenceResult<T> = {
  source: WorkoutPersistenceSource;
  success: boolean;
  data: T;
  error: string | null;
  conflict?: boolean;
};

export type AuthenticatedWorkoutProfile = {
  userId: string;
  profileId: string;
  email: string | null;
};

export type SaveCompletedWorkoutLogInput = {
  sessionId?: string;
  planId?: string | null;
  planDayId?: string | null;
  assignmentId?: string | null;
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

export type WorkoutDataSyncSummary = {
  localItems: number;
  syncedItems: number;
  skippedItems: number;
  failedItems: number;
  errors: string[];
};

type WorkoutTemplateRow = {
  revision?: number;
  client_key?: string | null;
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
  semantic_metadata?: unknown;
};

export type WorkoutLogRow = {
  template_client_key?: string | null;
  session_key?: string | null;
  plan_id?: string | null;
  plan_day_id?: string | null;
  assignment_id?: string | null;
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

export type WorkoutSetLogRow = {
  id: string;
  workout_log_id: string;
  profile_id: string;
  exercise_id: string | null;
  exercise_name: string;
  body: string | null;
  pattern: string | null;
  equipment: string | null;
  weight: number | null;
  weight_unit?: "lb" | "kg" | null;
  reps: number | null;
  sets: number | null;
  performed_at: string;
  source: "exercise-library" | "workout-session" | string;
  order_index: number;
  created_at: string;
  updated_at: string;
  semantic_metadata?: unknown;
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
  target_sets: number | null;
  target_reps: string | null;
  target_rest_seconds: number | null;
  notes: string | null;
  semantic_metadata?: ExerciseSemanticMetadata;
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
  weight_unit?: "lb" | "kg";
  reps: number | null;
  sets: number | null;
  performed_at: string;
  source: string;
  order_index: number;
  semantic_metadata?: ExerciseSemanticMetadata;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createResult = <T>({
  source,
  success,
  data,
  error = null,
  conflict,
}: WorkoutPersistenceResult<T>): WorkoutPersistenceResult<T> => ({
  source,
  success,
  data,
  error,
  ...(conflict ? { conflict: true } : {}),
});

async function requireWorkoutSemanticsSupport() {
  const support = await supabase.rpc("planning_workout_semantics_version").abortSignal(AbortSignal.timeout(12000));
  if (support.error || support.data !== 1) throw new Error(backendSyncIssue(support.error, "workouts")?.message || "Cloud exercise variation support is unavailable. Original workout data is retained; retry after the backend is updated.");
}

const getErrorMessage = (error: unknown) => {
  if (!error) return null;
  const setup = backendSyncIssue(error, "workouts");
  if (setup) return setup.message;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : JSON.stringify(error);
  }

  return String(error);
};

const isUuid = (value: string | null | undefined) =>
  Boolean(value && UUID_PATTERN.test(value));

const parseWorkoutNumber = (value: unknown, field: string, integer: boolean) => {
  if (value == null || typeof value === "string" && !value.trim()) return null;
  const validSyntax = typeof value === "number" || typeof value === "string" && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim());
  const parsed = validSyntax ? Number(value) : NaN;
  if (!Number.isFinite(parsed) || (integer ? !Number.isInteger(parsed) || parsed <= 0 || parsed > 2147483647 : parsed < 0)) throw new Error(`${field} must be ${integer ? "a positive whole number no greater than 2147483647" : "a finite number of zero or more"}. Your saved data and draft are preserved.`);
  return parsed;
};
const workoutEntryNumbers = (entry: LocalExerciseStatEntry) => {
  // Also protect direct set mapping, which can run outside completion validation.
  const weightUnit = recordedWorkoutLoadUnit(entry as unknown as Record<string, unknown>);
  const weight = parseWorkoutNumber(entry.weight, "Weight", false);
  const reps = parseWorkoutNumber(entry.reps, "Reps", true);
  const sets = parseWorkoutNumber(entry.sets, "Sets", true);
  const reportingIssue = workoutNumericReportingIssue(weight, reps, sets, weightUnit);
  if (reportingIssue) throw new Error(`${reportingIssue} Your saved data and draft are preserved.`);
  return {
    weight,
    reps,
    sets,
    ...(weightUnit ? { weight_unit: weightUnit } : {}),
  };
};

function assertWorkoutTitle(title: unknown) {
  if (title != null && typeof title !== "string") throw new Error("Saved workout title needs review before saving or upload; it must be text or unreported.");
}

function assertWorkoutExerciseMetadata(entry: LocalExerciseStatEntry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry) || typeof entry.exerciseName !== "string" || !entry.exerciseName.trim()) throw new Error("Saved exercise name needs review before saving or upload.");
  if (unsupportedWorkoutLoadUnitEvidence(entry as unknown as Record<string, unknown>).length) throw new Error(WORKOUT_LOAD_UNIT_REVIEW);
  for (const field of ["exerciseId", "body", "pattern", "equipment"] as const) {
    if (entry[field] != null && typeof entry[field] !== "string") throw new Error(`Saved exercise ${field} needs review before saving or upload; it must be text or unreported.`);
  }
}

function assertWorkoutUploadPayload(input: SaveCompletedWorkoutLogInput, completedAt: string) {
  assertWorkoutTitle(input.title);
  if (workoutLoadUnitEvidence(input as unknown as Record<string, unknown>).length) throw new Error("Workout-level load-unit metadata needs review. Units must be recorded per exercise; the original workout is retained for export.");
  for (const field of ["sessionId", "templateId", "planId", "planDayId", "assignmentId"] as const) {
    if (input[field] != null && typeof input[field] !== "string") throw new Error(`Saved workout ${field} needs review before saving or upload; it must be text or unreported.`);
    if (typeof input[field] === "string" && input[field] !== "" && !input[field].trim()) throw new Error(`Saved workout ${field} needs review before saving or upload; a reported identity must contain nonblank text. Original records and your draft are preserved.`);
  }
  if (input.completedAt != null && typeof input.completedAt !== "string") throw new Error("Saved workout completion date needs review before upload.");
  const ended = activityTimestamp(completedAt);
  if (typeof completedAt !== "string" || !Number.isFinite(ended)) throw new Error("Saved workout completion date needs review before upload.");
  if (input.startedAt != null && input.startedAt !== "") {
    const started = activityTimestamp(input.startedAt);
    if (typeof input.startedAt !== "string" || !Number.isFinite(started) || started > ended) throw new Error("Saved workout start date needs review; it must be on or before completion.");
  }
  for (const entry of input.entries) {
    assertWorkoutExerciseMetadata(entry);
    if (typeof entry.date !== "string" || !Number.isFinite(activityTimestamp(entry.date))) throw new Error("Saved exercise date needs review before upload.");
  }
  const issue = workoutNumericTotalsIssue(input.entries.map(entry => {
    const numbers = workoutEntryNumbers(entry);
    return { ...numbers, unit: numbers.weight_unit ?? null };
  }));
  if (issue) throw new Error(`${issue} Your saved data and draft are preserved.`);
}

const normalizeWorkoutTitle = (title?: string | null) =>
  title?.trim() || "Workout Session";

const normalizeTemplateTitle = (title: string) =>
  title.trim() || "Untitled Workout Template";

const normalizeStatEntries = (entries: LocalExerciseStatEntry[], completedAt: string) =>
  entries.map((entry) => ({
    ...entry,
    date: entry.date ?? completedAt,
    source: entry.source || "workout-session",
  }));

const createEmptySyncSummary = (): WorkoutDataSyncSummary => ({
  localItems: 0,
  syncedItems: 0,
  skippedItems: 0,
  failedItems: 0,
  errors: [],
});

const normalizeSyncValue = (value: string | number | null | undefined) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const getStatEntrySyncKey = (entry: LocalExerciseStatEntry) =>
  JSON.stringify([
    [entry.exerciseId, entry.exerciseName, entry.date, entry.weight, entry.reps, entry.sets, entry.source || "workout-session"].map(normalizeSyncValue),
    workoutLoadUnitEvidence(entry as unknown as Record<string, unknown>),
  ]);

const groupStatEntriesByCompletedAt = (entries: LocalExerciseStatEntry[]) =>
  entries.reduce<Map<string, LocalExerciseStatEntry[]>>((groups, entry) => {
    const completedAt = entry.date;
    const existing = groups.get(completedAt) || [];

    groups.set(completedAt, [...existing, entry]);

    return groups;
  }, new Map<string, LocalExerciseStatEntry[]>());

export const getCurrentAuthenticatedWorkoutProfile = async (): Promise<
  WorkoutPersistenceResult<AuthenticatedWorkoutProfile | null>
> => {
  const requestedAccount = planningOwner(), requestedGeneration = planningAccountGeneration();
  const { data, error } = await getSupabaseUser().catch(cause => ({ data: { user: null }, error: cause }));
  if (planningOwner() !== requestedAccount || planningAccountGeneration() !== requestedGeneration) return createResult({ source: "supabase", success: false, data: null, error: "Account changed while verifying workout access. Retry from the current account." });

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

  const account = planningOwner();
  if (account && account !== data.user.id) return createResult({ source: "supabase", success: false, data: null, error: "Account changed. Reload before syncing workout data." });

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
  ...workoutSemanticsFromRow(row, true),
  ...workoutTargetsFromColumns(row),
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
  id: templateRow.client_key || templateRow.id,
  title: templateRow.title,
  exercises: [...exerciseRows]
    .sort((first, second) => first.order_index - second.order_index)
    .map(mapTemplateExerciseRowToLocalExercise),
  createdAt: templateRow.created_at,
  updatedAt: templateRow.updated_at,
  cloudRevision: templateRow.revision ?? 0,
  syncPending: false,
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
  ...workoutSemanticColumns(exercise),
  ...workoutTargetColumns(exercise),
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
  ...workoutSemanticsFromRow(row),
  exerciseId: row.exercise_id || row.id,
  exerciseName: row.exercise_name,
  body: row.body || undefined,
  pattern: row.pattern || undefined,
  equipment: row.equipment || undefined,
  weight: row.weight === null ? "" : String(row.weight),
  ...(row.weight_unit == null ? {} : { weightUnit: row.weight_unit }),
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
  ...workoutSemanticColumns(entry),
  workout_log_id: workoutLogId,
  profile_id: profileId,
  exercise_id: entry.exerciseId || null,
  exercise_name: entry.exerciseName,
  body: entry.body || null,
  pattern: entry.pattern || null,
  equipment: entry.equipment || null,
  ...workoutEntryNumbers(entry),
  performed_at: entry.date,
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
  const existingTemplates = readWorkoutBuilderTemplatesForSave();
  const existingTemplate = existingTemplates.find(
    (storedTemplate) =>
      storedTemplate.id === template.id,
  );
  const savedTemplate: LocalWorkoutBuilderTemplate = {
    ...existingTemplate,
    ...template,
    title: normalizedTitle,
    createdAt: existingTemplate?.createdAt || template.createdAt || now,
    updatedAt: now,
    cloudRevision: existingTemplate?.cloudRevision ?? template.cloudRevision ?? 0,
    syncPending: true,
    syncKey: crypto.randomUUID(),
    syncError: undefined,
  };
  if (validatePlanningImport({ [planningKeys.templates]: [savedTemplate] })) throw new Error("Review the workout title and exercises before saving. Your saved workouts are preserved.");
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
  const sessionId = input.sessionId || crypto.randomUUID();
  let savedEntries: LocalExerciseStatEntry[];
  const completedAt = input.completedAt ?? new Date().toISOString();
  try {
    const snapshot = planningSnapshot();
    const logs = Object.hasOwn(snapshot, planningKeys.logs) ? snapshot[planningKeys.logs] : [];
    if (!Array.isArray(logs)) throw new Error("Saved workout history needs review before adding a completion. Your original records and open draft are preserved.");
    const matches = logs.filter(log => planningLogHasIdentity(log) && (log.id === sessionId || Boolean(input.assignmentId && log.assignmentId === input.assignmentId)));
    if (matches.length > 1) throw new Error("Multiple saved workouts match this session or assignment. Review the original records before retrying; your open draft is preserved.");
    const existing = matches[0];
    if (existing) return createResult({ source: "localStorage", success: true, data: { workoutLogId: existing.id, entries: structuredClone(existing.entries) }, error: null });
    if (logs.some(log => !log || typeof log !== "object" || Array.isArray(log) || typeof log.id !== "string" || !log.id.trim())) throw new Error("Saved workout history needs review before adding a completion. Your original records and open draft are preserved.");
    if (!Array.isArray(input.entries)) throw new Error("Exercise list is malformed. Your saved data and open draft are preserved.");
    input.entries.forEach(assertWorkoutExerciseMetadata);
    savedEntries = normalizeStatEntries(input.entries, completedAt);
    if (!savedEntries.length) throw new Error("Complete at least one exercise before saving.");
    assertWorkoutUploadPayload({ ...input, entries: savedEntries }, completedAt);
    assertWorkoutChronology(savedEntries, completedAt, { startedAt: input.startedAt });
    recordPlanningLog({ id: sessionId, title: input.title || "Workout", templateId: input.templateId, completedAt, startedAt: input.startedAt, planId: input.planId, planDayId: input.planDayId, assignmentId: input.assignmentId, entries: savedEntries });
  } catch (cause) { return createResult({ source: "localStorage", success: false, data: { workoutLogId: null, entries: [] }, error: getErrorMessage(cause) }); }

  return createResult({
    source: "localStorage",
    success: true,
    data: {
      workoutLogId: sessionId,
      entries: savedEntries,
    },
    error: null,
  });
};

export const loadWorkoutTemplatesFromSupabase = async (): Promise<
  WorkoutPersistenceResult<LocalWorkoutBuilderTemplate[]>
> => {
  const account = planningOwner(), accountGeneration = planningAccountGeneration();
  const auth = await getCurrentAuthenticatedWorkoutProfile();

  if (!auth.success || !auth.data) {
    return createResult({
      source: "supabase",
      success: false,
      data: [],
      error: auth.error,
    });
  }

  if (planningOwner() !== account || planningAccountGeneration() !== accountGeneration) return createResult({ source: "supabase", success: false, data: [], error: "Account changed while loading workouts." });
  const { data: templateRows, error: templateError } = await supabase
    .from("workout_templates")
    .select("*")
    .eq("owner_profile_id", auth.data.profileId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .abortSignal(AbortSignal.timeout(12000));

  if (templateError) {
    return createResult({
      source: "supabase",
      success: false,
      data: [],
      error: getErrorMessage(templateError),
    });
  }

  const templates = (templateRows || []) as WorkoutTemplateRow[];
  if (planningOwner() !== account || planningAccountGeneration() !== accountGeneration) return createResult({ source: "supabase", success: false, data: [], error: "Account changed while loading workouts." });
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
    .order("order_index", { ascending: true })
    .abortSignal(AbortSignal.timeout(12000));

  if (exerciseError) {
    return createResult({
      source: "supabase",
      success: false,
      data: [],
      error: getErrorMessage(exerciseError),
    });
  }

  const exercises = (exerciseRows || []) as WorkoutTemplateExerciseRow[];
  if (planningOwner() !== account || planningAccountGeneration() !== accountGeneration) return createResult({ source: "supabase", success: false, data: [], error: "Account changed while loading workouts." });

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
  expectedLocal: LocalWorkoutBuilderTemplate = template,
): Promise<WorkoutPersistenceResult<LocalWorkoutBuilderTemplate>> => {
  const account = planningOwner(), accountGeneration = planningAccountGeneration();
  const assertSource = () => {
    assertPlanningDeviceCurrent();
    const current = readWorkoutBuilderTemplatesForSave().find(item => item.id === expectedLocal.id);
    if (!current || JSON.stringify(current) !== JSON.stringify(expectedLocal)) throw new Error("Saved workout changed or was removed before upload. Your current originals are preserved; retry from the current saved workout.");
    if (validatePlanningImport({ [planningKeys.templates]: [template] })) throw new Error("Review this workout before uploading. Saved originals are preserved.");
  };
  try { assertSource(); }
  catch (cause) { return createResult({ source: "supabase", success: false, data: template, error: getErrorMessage(cause) }); }
  const auth = await getCurrentAuthenticatedWorkoutProfile();

  if (!auth.success || !auth.data) {
    return createResult({
      source: "supabase",
      success: false,
      data: template,
      error: auth.error,
    });
  }

  try {
    if (planningOwner() !== account || planningAccountGeneration() !== accountGeneration) throw new Error("Account changed before saving workouts.");
    assertSource();
    if (template.exercises.some(exercise => workoutSemanticColumns(exercise).semantic_metadata)) {
      await requireWorkoutSemanticsSupport();
      if (planningOwner() !== account || planningAccountGeneration() !== accountGeneration) throw new Error("Account changed while checking workout variation support.");
      assertSource();
    }
    const { data, error } = await supabase.rpc("save_workout_template_atomic", {
      client_key: template.id,
      template_payload: { ...mapLocalTemplateToTemplateInsert(template, auth.data.profileId), expected_revision: template.cloudRevision ?? 0, mutation_key: template.syncKey || crypto.randomUUID() },
      exercise_payload: template.exercises.map((exercise, index) => mapLocalTemplateExerciseToInsert(exercise, template.id, index)),
    }).abortSignal(AbortSignal.timeout(12000));
    if (error || !data?.template || !Array.isArray(data.exercises)) return createResult({ source: "supabase", success: false, data: template, error: getErrorMessage(error) || "Workout template was not saved." });
    if (planningOwner() !== auth.data.profileId || planningAccountGeneration() !== accountGeneration) return createResult({ source: "supabase", success: false, data: template, error: "Account changed while saving. Reload your workouts." });
    const saved = mapWorkoutTemplateRowsToLocalTemplate(data.template as WorkoutTemplateRow, data.exercises as WorkoutTemplateExerciseRow[]);
    if (saved.id !== template.id || validatePlanningImport({ [planningKeys.templates]: [saved] })) throw new Error("Cloud workout identity or content was not confirmed. The current saved workout is preserved for retry.");
    if (!workoutTemplateSaveConfirmed(template, saved)) throw new Error("Cloud workout content or revision was not confirmed. The current saved workout is preserved for retry.");
    return createResult({ source: "supabase", success: true, data: { ...template, ...saved, exercises: template.exercises }, error: null });
  } catch (cause) {
    return createResult({ source: "supabase", success: false, data: template, error: getErrorMessage(cause) });
  }
};
export const loadWorkoutLogRowsFromSupabase = async (): Promise<
  WorkoutPersistenceResult<{
    logs: WorkoutLogRow[];
    setLogs: WorkoutSetLogRow[];
  }>
> => {
  const account = planningOwner(), accountGeneration = planningAccountGeneration();
  const accountIsCurrent = () => planningOwner() === account && planningAccountGeneration() === accountGeneration;
  const accountChanged = () => createResult({ source: "supabase" as const, success: false, data: { logs: [], setLogs: [] }, error: "Account changed while loading workout history." });
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

  // Page by immutable identity rather than offset, so new rows cannot shift later pages.
  // Stop only on an empty page: a server row cap smaller than our limit is still safe.
  const profileId = auth.data.profileId;
  const historyDeadline = AbortSignal.timeout(60000);
  const loadPages = async <T extends { id: string; profile_id: string }>(table: "workout_logs" | "workout_set_logs", parentIds?: string[]): Promise<T[]> => {
    const rows: T[] = [];
    let cursor: string | null = null;
    while (true) {
      if (!accountIsCurrent()) throw new Error("Account changed while loading workout history.");
      let query = supabase.from(table).select("*").eq("profile_id", profileId).order("id", { ascending: true }).limit(200);
      if (parentIds) query = query.in("workout_log_id", parentIds);
      if (cursor) query = query.gt("id", cursor);
      const { data, error } = await query.abortSignal(AbortSignal.any([historyDeadline, AbortSignal.timeout(12000)]));
      if (!accountIsCurrent()) throw new Error("Account changed while loading workout history.");
      if (error) throw error;
      const page = (data || []) as T[];
      if (!page.length) return rows;
      let last: string | null = cursor;
      for (const row of page) {
        if (!row || typeof row.id !== "string" || !row.id || row.profile_id !== profileId || last !== null && row.id <= last) throw new Error("Workout history returned invalid ownership or page order. Saved device data is preserved.");
        if (parentIds && !parentIds.includes((row as T & { workout_log_id: string }).workout_log_id)) throw new Error("Workout entries do not match the requested sessions. Saved device data is preserved.");
        last = row.id;
      }
      rows.push(...page);
      if (rows.length > 100000) throw new Error("Workout history is too large to load safely. Saved device data is preserved.");
      cursor = last;
    }
  };
  try {
    const logs = await loadPages<WorkoutLogRow>("workout_logs");
    const setLogs: WorkoutSetLogRow[] = [];
    // Keep IN filters bounded rather than placing a member's entire history in a URL.
    for (let offset = 0; offset < logs.length; offset += 100) {
      setLogs.push(...await loadPages<WorkoutSetLogRow>("workout_set_logs", logs.slice(offset, offset + 100).map(log => log.id)));
      if (setLogs.length > 100000) throw new Error("Workout history is too large to load safely. Saved device data is preserved.");
    }
    logs.sort((a, b) => (Date.parse(b.completed_at || "") || 0) - (Date.parse(a.completed_at || "") || 0));
    setLogs.sort((a, b) => (Date.parse(b.performed_at) || 0) - (Date.parse(a.performed_at) || 0) || a.order_index - b.order_index);
    return createResult({ source: "supabase", success: true, data: { logs, setLogs }, error: null });
  } catch (cause) {
    if (!accountIsCurrent()) return accountChanged();
    // Never present a partly fetched history as complete or replace saved local entries with it.
    return createResult({ source: "supabase", success: false, data: { logs: [], setLogs: [] }, error: getErrorMessage(cause) });
  }
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
  expectedPlanningVersion?: string,
  assertSourceCurrent?: () => void,
): Promise<WorkoutPersistenceResult<SavedWorkoutLogSummary>> => {
  if (!Array.isArray(input.entries)) return createResult({ source: "supabase", success: false, data: { workoutLogId: null, entries: [] }, error: "Saved exercise list is malformed. Review the original record before upload." });
  // Capture reviewed values before authentication or capability checks can yield.
  try { input = structuredClone(input); }
  catch { return createResult({ source: "supabase", success: false, data: { workoutLogId: null, entries: [] }, error: "Workout data could not be captured for upload. Original records are preserved; review the saved workout before retrying." }); }
  try { assertPlanningDeviceCurrent(); }
  catch (cause) { return createResult({ source: "supabase", success: false, data: { workoutLogId: null, entries: input.entries }, error: getErrorMessage(cause) }); }
  const account = planningOwner(), accountGeneration = planningAccountGeneration();
  const auth = await getCurrentAuthenticatedWorkoutProfile();
  // Upload recorded dates exactly; only a new local completion may stamp undated input.
  const normalizedEntries = input.entries.map(entry => ({ ...entry, source: entry?.source || "workout-session" }));

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
    input.completedAt ?? normalizedEntries[0]?.date;
  try {
    assertWorkoutUploadPayload(input, completedAt);
    if (typeof input.sessionId !== "string" || !input.sessionId.trim()) throw new Error("A stable saved session identity is required before cloud upload. Save the workout locally first so retries use the same identity; original records are preserved.");
  }
  catch (cause) { return createResult({ source: "supabase", success: false, data: { workoutLogId: null, entries: normalizedEntries }, error: getErrorMessage(cause) }); }
  const logPayload: WorkoutLogInsert = {
    profile_id: profileId,
    workout_template_id: isUuid(input.templateId) ? input.templateId || null : null,
    title: normalizeWorkoutTitle(input.title),
    status: "completed",
    started_at: input.startedAt || null,
    completed_at: completedAt,
    source: "workout-session",
  };
  if (input.templateId) {
    try {
      const support = await supabase.rpc("planning_workout_template_identity_version").abortSignal(AbortSignal.timeout(12000));
      if (support.error || support.data !== 1) throw new Error(backendSyncIssue(support.error, "workouts")?.message || "Cloud workout template identity support is unavailable. Original workout data is retained; retry after the backend is updated.");
    } catch (cause) { return createResult({ source: "supabase", success: false, data: { workoutLogId: null, entries: normalizedEntries }, error: getErrorMessage(cause) }); }
    if (planningOwner() !== account || planningAccountGeneration() !== accountGeneration) return createResult({ source: "supabase", success: false, data: { workoutLogId: null, entries: [] }, error: "Account changed while checking workout template identity support." });
  }
  let setPayloads: WorkoutSetLogInsert[];
  try { setPayloads = normalizedEntries.map((entry, index) => mapLocalStatEntryToSetLogInsert(entry, "", profileId, index)); }
  catch (cause) { return createResult({ source: "supabase", success: false, data: { workoutLogId: null, entries: [] }, error: getErrorMessage(cause) }); }
  if (planningOwner() !== account || planningAccountGeneration() !== accountGeneration) return createResult({ source: "supabase", success: false, data: { workoutLogId: null, entries: normalizedEntries }, error: "Account changed before checking workout unit support." });
  if (setPayloads.some(entry => entry.semantic_metadata)) {
    try { await requireWorkoutSemanticsSupport(); }
    catch (cause) { return createResult({ source: "supabase", success: false, data: { workoutLogId: null, entries: normalizedEntries }, error: getErrorMessage(cause) }); }
  }
  if (planningOwner() !== account || planningAccountGeneration() !== accountGeneration) return createResult({ source: "supabase", success: false, data: { workoutLogId: null, entries: [] }, error: "Account changed while checking workout variation support." });
  if (setPayloads.some(entry => entry.weight_unit)) {
    try {
      assertPlanningDeviceCurrent();
      const support = await supabase.rpc("planning_workout_load_unit_version").abortSignal(AbortSignal.timeout(12000));
      if (support.error || support.data !== 1) throw new Error(backendSyncIssue(support.error, "workouts")?.message || "Cloud load-unit support is unavailable. The original workout is retained; retry after the backend is updated.");
    } catch (cause) {
      return createResult({ source: "supabase", success: false, data: { workoutLogId: null, entries: normalizedEntries }, error: getErrorMessage(cause) });
    }
  }
  if (planningOwner() !== account || planningAccountGeneration() !== accountGeneration) return createResult({ source: "supabase", success: false, data: { workoutLogId: null, entries: normalizedEntries }, error: "Account changed before saving workout history." });
  if (expectedPlanningVersion !== undefined) {
    try { assertPlanningLogVersion(input.sessionId || "", expectedPlanningVersion); }
    catch (cause) { return createResult({ source: "supabase", success: false, data: { workoutLogId: null, entries: [] }, error: getErrorMessage(cause) }); }
  }
  try { assertPlanningDeviceCurrent(); assertSourceCurrent?.(); }
  catch (cause) { return createResult({ source: "supabase", success: false, data: { workoutLogId: null, entries: [] }, error: getErrorMessage(cause) }); }
  const { data: workoutLogId, error: saveError } = await supabase.rpc("save_completed_planning_workout", {
    session_key: input.sessionId,
    log_payload: { ...logPayload, ...(input.templateId ? { template_client_key: input.templateId } : {}), plan_id: input.planId || null, plan_day_id: input.planDayId || null, assignment_id: input.assignmentId || null },
    set_payloads: setPayloads,
  }).abortSignal(AbortSignal.timeout(12000));
  if (planningOwner() !== account || planningAccountGeneration() !== accountGeneration) return createResult({ source: "supabase", success: false, data: { workoutLogId: null, entries: [] }, error: "Account changed while saving workout history." });
  if (saveError) return createResult({ source: "supabase", success: false, data: { workoutLogId: null, entries: normalizedEntries }, error: getErrorMessage(saveError), conflict: saveError.code === "23505" });
  if (typeof workoutLogId !== "string" || !isUuid(workoutLogId)) return createResult({ source: "supabase", success: false, data: { workoutLogId: null, entries: normalizedEntries }, error: "Cloud workout save was not confirmed. Retry safely; saved device data is preserved." });

  return createResult({
    source: "supabase",
    success: true,
    data: {
      workoutLogId: String(workoutLogId),
      entries: normalizedEntries,
    },
    error: null,
  });
};

let templateRefreshSequence = 0;

export const loadWorkoutTemplatesWithFallback = async (): Promise<
  WorkoutPersistenceResult<LocalWorkoutBuilderTemplate[]>
> => {
  const account = planningOwner();
  const request = ++templateRefreshSequence, accountGeneration = planningAccountGeneration();
  try { readWorkoutBuilderTemplatesForSave(); assertPlanningDeviceCurrent(); }
  catch (cause) { return createResult({ source: "localStorage", success: false, data: [], error: getErrorMessage(cause) }); }
  const sourceVersion = planningRecordVersion(planningKeys.templates);
  const supabaseResult = await loadWorkoutTemplatesFromSupabase().catch(cause => createResult({ source: "supabase", success: false, data: [] as LocalWorkoutBuilderTemplate[], error: getErrorMessage(cause) }));
  if (planningOwner() !== account) return createResult({ source: "localStorage", success: false, data: [], error: "Account changed while loading workouts." });
  let currentTemplates: LocalWorkoutBuilderTemplate[];
  try { currentTemplates = readWorkoutBuilderTemplatesForSave(); }
  catch (cause) { return createResult({ source: "localStorage", success: false, data: [], error: getErrorMessage(cause) }); }
  if (accountGeneration !== planningAccountGeneration()) return createResult({ source: "localStorage", success: false, data: [], error: "Account session changed while loading workouts. Retry from the current account." });
  if (request !== templateRefreshSequence || sourceVersion !== planningRecordVersion(planningKeys.templates)) return createResult({ source: "localStorage", success: false, data: currentTemplates, error: "Workout library changed while loading. Current saved workouts are preserved; refresh again." });
  try { assertPlanningDeviceCurrent(); }
  catch (cause) { return createResult({ source: "localStorage", success: false, data: currentTemplates, error: getErrorMessage(cause) }); }
  if (supabaseResult.success && validatePlanningImport({ [planningKeys.templates]: supabaseResult.data })) return createResult({ source: "localStorage", success: false, data: currentTemplates, error: "Cloud workout library needs review before merging. Saved device originals are preserved." });

  if (supabaseResult.success && supabaseResult.data.length > 0) {
    const templates = new Map(currentTemplates.map(template => [template.id, template]));
    const archives: Record<string, unknown> = {};
    supabaseResult.data.forEach(template => {
      const local = templates.get(template.id);
      const newer = local && (template.cloudRevision ?? 0) > (local.cloudRevision ?? 0);
      const legacyNewer = local && !template.cloudRevision && !local.cloudRevision && local.updatedAt < template.updatedAt;
      if (!local) templates.set(template.id, template);
      else if (!local.syncPending && (newer || legacyNewer)) {
        const refresh = mergeRefreshedWorkoutTemplate(local, template);
        if (refresh.contentChanged) archives[WORKOUT_TEMPLATE_REFRESH_ARCHIVE_PREFIX + crypto.randomUUID()] = {
          schemaVersion: 1, source: "Sound Fitness workout before cloud refresh", archivedAt: new Date().toISOString(),
          originalTemplate: JSON.parse(JSON.stringify(local)), incomingRevision: template.cloudRevision ?? 0,
        };
        templates.set(template.id, refresh.template);
      }
    });
    const merged = [...templates.values()];
    if (account && JSON.stringify(merged) !== JSON.stringify(currentTemplates)) {
      try { writePlanningValues({ [planningKeys.templates]: merged, ...archives }); }
      catch (cause) { return createResult({ source: "localStorage", success: false, data: currentTemplates, error: `Cloud refresh could not be kept. Original saved workouts are preserved. ${getErrorMessage(cause)}` }); }
    }
    return { ...supabaseResult, data: merged };
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
  const account = planningOwner(), accountGeneration = planningAccountGeneration();
  const localResult = saveWorkoutTemplateToLocalStorage(template);
  let supabaseResult: WorkoutPersistenceResult<LocalWorkoutBuilderTemplate>;
  try { supabaseResult = await saveWorkoutTemplateToSupabase(localResult.data); }
  catch (cause) { return { ...localResult, error: getErrorMessage(cause) }; }

  if (planningOwner() !== account || planningAccountGeneration() !== accountGeneration) return { ...localResult, success: false, error: "Account changed while saving workouts. Current saved originals are preserved." };
  if (supabaseResult.success) {
    acknowledgeTemplateSave(account, accountGeneration, localResult.data, supabaseResult.data);
    return supabaseResult;
  }

  return {
    ...localResult,
    error: supabaseResult.error,
  };
};

function acknowledgeTemplateSave(account: string | null, accountGeneration: number, sent: LocalWorkoutBuilderTemplate, saved: LocalWorkoutBuilderTemplate) {
  if (planningOwner() !== account || planningAccountGeneration() !== accountGeneration) return;
  let current: LocalWorkoutBuilderTemplate[];
  try { current = readWorkoutBuilderTemplatesForSave(); } catch { return; }
  writeWorkoutBuilderTemplates(current.map(template => {
    if (template.id !== sent.id) return template;
    if (template.syncKey === sent.syncKey) {
      if (workoutTemplateContentVersion(template) !== workoutTemplateContentVersion(sent)) return {
        ...template, cloudRevision: Math.max(template.cloudRevision ?? 0, saved.cloudRevision ?? 0),
        syncKey: crypto.randomUUID(), syncPending: true, syncError: undefined,
      };
      return { ...template, createdAt: saved.createdAt || template.createdAt, updatedAt: saved.updatedAt || template.updatedAt, cloudRevision: saved.cloudRevision, syncPending: false, syncError: undefined };
    }
    // An edit made during this request keeps its content and uses the acknowledged base.
    return template.cloudRevision === sent.cloudRevision ? { ...template, cloudRevision: saved.cloudRevision } : template;
  }));
}

let templateReplayAccount: { account: string; generation: number } | null = null;

export type WorkoutTemplateConflict = {
  account: string;
  generation: number;
  local: LocalWorkoutBuilderTemplate;
  cloud: LocalWorkoutBuilderTemplate;
};

export async function reviewWorkoutTemplateConflict(id: string): Promise<WorkoutTemplateConflict> {
  const account = planningOwner(), generation = planningAccountGeneration();
  const local = readWorkoutBuilderTemplatesForSave().find(item => item.id === id);
  if (!account || account === "local-preview" || !local?.syncPending) throw new Error("Reload your saved workouts before reviewing this conflict.");
  const signature = JSON.stringify(local);
  const result = await loadWorkoutTemplatesFromSupabase();
  if (planningOwner() !== account || planningAccountGeneration() !== generation || JSON.stringify(readWorkoutBuilderTemplatesForSave().find(item => item.id === id)) !== signature) throw new Error("This workout changed while loading. Review it again.");
  if (!result.success) throw new Error(result.error || "Could not load the cloud workout. Retry when connected.");
  if (validatePlanningImport({ [planningKeys.templates]: result.data })) throw new Error("Cloud workout originals need review before choosing a conflict version.");
  const cloud = result.data.find(item => item.id === id);
  if (!cloud) throw new Error("The cloud workout is unavailable. Your local edit is still saved.");
  return { account, generation, local: JSON.parse(JSON.stringify(local)), cloud: JSON.parse(JSON.stringify(cloud)) };
}

/** Preserve both versions before choosing which content keeps the original identity. */
export function resolveWorkoutTemplateConflict(review: WorkoutTemplateConflict, preferred: "local" | "cloud") {
  const current = readWorkoutBuilderTemplatesForSave();
  if (!["local", "cloud"].includes(preferred) || review.local.id !== review.cloud.id || validatePlanningImport({ [planningKeys.templates]: [review.local] }) || validatePlanningImport({ [planningKeys.templates]: [review.cloud] })) throw new Error("Review both workout versions and choose Local or Cloud before resolving. Originals are preserved.");
  const local = current.find(item => item.id === review.local.id);
  if (planningOwner() !== review.account || planningAccountGeneration() !== review.generation || JSON.stringify(local) !== JSON.stringify(review.local)) throw new Error("This workout changed. Review both versions again before resolving.");
  const now = new Date().toISOString();
  const backupSource = preferred === "local" ? review.cloud : review.local;
  const backup: LocalWorkoutBuilderTemplate = { ...backupSource, id: crypto.randomUUID(), title: `${backupSource.title} (${preferred === "local" ? "cloud" : "local"} backup)`, createdAt: now, updatedAt: now, cloudRevision: 0, syncKey: crypto.randomUUID(), syncPending: true, syncError: undefined };
  const original: LocalWorkoutBuilderTemplate = preferred === "cloud" ? { ...review.cloud, syncPending: false, syncError: undefined }
    : { ...review.local, updatedAt: now, cloudRevision: review.cloud.cloudRevision ?? 0, syncKey: crypto.randomUUID(), syncPending: true, syncError: undefined };
  writeWorkoutBuilderTemplates([backup, ...current.map(item => item.id === original.id ? original : item)]);
}

/** Retry only explicitly pending edits; preserve the mutation key after lost responses. */
export async function syncPendingWorkoutTemplates() {
  const account = planningOwner(), accountGeneration = planningAccountGeneration();
  if (!account || account === "local-preview" || templateReplayAccount?.account === account && templateReplayAccount.generation === accountGeneration) return;
  const replay = { account, generation: accountGeneration };
  templateReplayAccount = replay;
  try {
    for (const template of readWorkoutBuilderTemplatesForSave().filter(item => item.syncPending)) {
      if (planningOwner() !== account || planningAccountGeneration() !== accountGeneration) return;
      if (JSON.stringify(readWorkoutBuilderTemplatesForSave().find(item => item.id === template.id)) !== JSON.stringify(template)) continue;
      const result = await saveWorkoutTemplateToSupabase(template);
      if (planningOwner() !== account || planningAccountGeneration() !== accountGeneration) return;
      if (!result.success) {
        writeWorkoutBuilderTemplates(readWorkoutBuilderTemplatesForSave().map(item => item.id === template.id && item.syncKey === template.syncKey
          ? { ...item, syncError: result.error || "Template sync is unavailable. Retry when connected." } : item));
        if (result.error?.toLowerCase().includes("sync conflict")) continue;
        return;
      }
      acknowledgeTemplateSave(account, accountGeneration, template, result.data);
    }
  } catch { /* Keep the pending edit for a later retry. */ }
  finally { if (templateReplayAccount === replay) templateReplayAccount = null; }
}

export const loadWorkoutLogEntriesWithFallback = async (): Promise<
  WorkoutPersistenceResult<LocalExerciseStatEntry[]>
> => {
  const account = planningOwner(), accountGeneration = planningAccountGeneration();
  const supabaseResult = await loadWorkoutLogEntriesFromSupabase().catch(cause => createResult({ source: "supabase", success: false, data: [] as LocalExerciseStatEntry[], error: getErrorMessage(cause) }));
  if (planningOwner() !== account || planningAccountGeneration() !== accountGeneration) return createResult({ source: "localStorage", success: false, data: [], error: "Account changed while loading workout history." });

  const localResult = loadWorkoutLogEntriesFromLocalStorage();

  if (supabaseResult.success) {
    return { ...supabaseResult, data: mergeExerciseOccurrences(localResult.data, supabaseResult.data) };
  }

  return {
    ...localResult,
    error: supabaseResult.error,
  };
};

export const saveCompletedWorkoutLogWithFallback = async (
  input: SaveCompletedWorkoutLogInput,
): Promise<WorkoutPersistenceResult<SavedWorkoutLogSummary>> => {
  const stableInput = { ...input, sessionId: input.sessionId == null || input.sessionId === "" ? crypto.randomUUID() : input.sessionId };
  const account = planningOwner(), accountGeneration = planningAccountGeneration();
  const localResult = saveCompletedWorkoutLogToLocalStorage(stableInput);
  if (!localResult.success) return localResult;
  const saved = readPlanningLogs().find(log => log?.id === localResult.data.workoutLogId);
  if (!saved) return createResult({ source: "localStorage", success: false, data: { workoutLogId: null, entries: [] }, error: "Saved workout could not be found. Your draft is preserved." });
  // Completion is immutable. Retries replay the first saved values and identity,
  // including an assignment already completed by a different logger session.
  if (planningLogUploadConfirmed(saved) && saved.cloudLogId) return createResult({ source: "supabase", success: true, data: { workoutLogId: saved.cloudLogId, entries: structuredClone(saved.entries) }, error: null });
  const savedVersion = planningLogVersion(saved);
  let supabaseResult: WorkoutPersistenceResult<SavedWorkoutLogSummary>;
  try { supabaseResult = await saveCompletedWorkoutLogToSupabase({ ...structuredClone(saved), sessionId: saved.id }, savedVersion); }
  catch (cause) { supabaseResult = createResult({ source: "supabase", success: false, data: { workoutLogId: null, entries: [] }, error: getErrorMessage(cause) }); }
  if (planningOwner() !== account || planningAccountGeneration() !== accountGeneration) return createResult({ source: "localStorage", success: false, data: { workoutLogId: null, entries: [] }, error: "Account changed while saving workout history. Your original account's saved workout is preserved." });
  try { assertPlanningLogVersion(saved.id, savedVersion); }
  catch (cause) { return createResult({ source: "localStorage", success: false, data: { workoutLogId: null, entries: [] }, error: getErrorMessage(cause) }); }
  if (supabaseResult.success) {
    try { if (supabaseResult.data.workoutLogId) markPlanningLogSynced(saved.id, supabaseResult.data.workoutLogId, savedVersion); }
    catch (cause) { return createResult({ source: "localStorage", success: false, data: { workoutLogId: null, entries: [] }, error: getErrorMessage(cause) }); }
    return supabaseResult;
  }
  try { markPlanningLogSyncError(saved.id, supabaseResult.error || "Workout upload is unavailable. Retry when connected.", savedVersion); }
  catch { /* Completion is already durable; diagnostic storage failure must not lose it. */ }
  return { ...localResult, ...(supabaseResult.conflict ? { success: false, conflict: true } : {}), error: supabaseResult.error };

};

let replayAccount: { account: string; generation: number } | null = null;
/** Replay the original session key; a lost response cannot duplicate a workout. */
export async function syncPendingPlanningWorkouts() {
  const account = planningOwner(), accountGeneration = planningAccountGeneration();
  if (!account || account === "local-preview" || replayAccount?.account === account && replayAccount.generation === accountGeneration) return;
  const replay = { account, generation: accountGeneration };
  replayAccount = replay;
  try {
    const records = readPlanningLogs();
    if (!Array.isArray(records)) return;
    const identified = records.filter(planningLogHasIdentity);
    const counts = new Map<string, number>();
    const assignmentCounts = new Map<string, number>();
    records.forEach(log => {
      if (log && typeof log === "object" && !Array.isArray(log) && typeof log.assignmentId === "string" && log.assignmentId)
        assignmentCounts.set(log.assignmentId, (assignmentCounts.get(log.assignmentId) || 0) + 1);
    });
    identified.forEach(log => counts.set(log.id, (counts.get(log.id) || 0) + 1));
    for (const log of identified.filter(log => counts.get(log.id) === 1 && (!log.assignmentId || assignmentCounts.get(log.assignmentId) === 1) && !planningLogUploadConfirmed(log))) {
      if (planningOwner() !== account || planningAccountGeneration() !== accountGeneration) return;
      const version = planningLogVersion(log);
      const currentRecords = readPlanningLogs();
      if (!Array.isArray(currentRecords)) return;
      const matches = currentRecords.filter(item => planningLogHasIdentity(item) && item.id === log.id);
      const current = matches.length === 1 ? matches[0] : null;
      if (!current || planningLogUploadConfirmed(current) || planningLogVersion(current) !== version) continue;
      try { assertPlanningLogVersion(log.id, version); }
      catch { continue; /* Keep ambiguous assignment originals unchanged for review. */ }
      try {
        if (!Array.isArray(log.entries)) throw new Error("Saved exercise list is malformed. Review the original record before retrying.");
        if (!log.entries.length) throw new Error("This saved workout has no exercise entries. Review the original record before retrying.");
        assertWorkoutUploadPayload(log, log.completedAt);
        log.entries.forEach(workoutEntryNumbers);
      } catch (cause) {
        markPlanningLogSyncError(log.id, getErrorMessage(cause) || "Saved workout values need review before upload.", version);
        continue;
      }
      const result = await saveCompletedWorkoutLogToSupabase({ ...log, sessionId: log.id }, version).catch(cause => createResult({ source: "supabase", success: false, data: { workoutLogId: null, entries: [] }, error: getErrorMessage(cause) }));
      if (planningOwner() !== account || planningAccountGeneration() !== accountGeneration) return;
      if (!result.success || !result.data.workoutLogId) {
        markPlanningLogSyncError(log.id, result.error || "Workout upload was not confirmed. Retry when connected.", version);
        if (result.conflict) continue;
        return;
      }
      markPlanningLogSynced(log.id, result.data.workoutLogId, version);
    }
  } catch { /* The saved queue remains available for the next reconnect/retry. */ }
  finally { if (replayAccount === replay) replayAccount = null; }
}

export const syncLocalWorkoutTemplatesToSupabase = async (): Promise<
  WorkoutPersistenceResult<WorkoutDataSyncSummary>
> => {
  const account = planningOwner(), accountGeneration = planningAccountGeneration();
  const summary = createEmptySyncSummary();
  let localTemplates: LocalWorkoutBuilderTemplate[];
  try { localTemplates = readWorkoutBuilderTemplatesForSave(); }
  catch (cause) { return createResult({ source: "supabase", success: false, data: summary, error: getErrorMessage(cause) }); }

  summary.localItems = localTemplates.length;

  const auth = await getCurrentAuthenticatedWorkoutProfile();

  if (!auth.success || !auth.data) {
    return createResult({
      source: "supabase",
      success: false,
      data: summary,
      error: auth.error,
    });
  }

  const supabaseTemplates = await loadWorkoutTemplatesFromSupabase().catch(cause => createResult({ source: "supabase", success: false, data: [] as LocalWorkoutBuilderTemplate[], error: getErrorMessage(cause) }));

  if (planningOwner() !== account || planningAccountGeneration() !== accountGeneration) return createResult({ source: "supabase", success: false, data: summary, error: "Account changed during template sync." });
  if (!supabaseTemplates.success) {
    return createResult({
      source: "supabase",
      success: false,
      data: summary,
      error: supabaseTemplates.error,
    });
  }
  if (validatePlanningImport({ [planningKeys.templates]: supabaseTemplates.data })) return createResult({ source: "supabase", success: false, data: summary, error: "Cloud workout originals need review before syncing." });

  const existingById = new Map(
    supabaseTemplates.data.map((template) => [template.id, template]),
  );
  const seenLocalTemplateKeys = new Set<string>();

  for (const localTemplate of localTemplates) {
    if (planningOwner() !== account || planningAccountGeneration() !== accountGeneration) return createResult({ source: "supabase", success: false, data: summary, error: "Account changed during template sync." });
    const templateKey = localTemplate.id;

    if (seenLocalTemplateKeys.has(templateKey)) {
      summary.skippedItems += 1;
      continue;
    }

    seenLocalTemplateKeys.add(templateKey);

    // Cloud discovery can outlive an edit or deletion. Never restore that snapshot.
    let currentTemplate: LocalWorkoutBuilderTemplate | undefined;
    try { currentTemplate = readWorkoutBuilderTemplatesForSave().find(item => item.id === templateKey); }
    catch (cause) { return createResult({ source: "supabase", success: false, data: summary, error: getErrorMessage(cause) }); }
    if (JSON.stringify(currentTemplate) !== JSON.stringify(localTemplate)) {
      summary.skippedItems += 1;
      continue;
    }

    const existingTemplate =
      existingById.get(localTemplate.id);
    const templateToSync = existingTemplate
      ? {
          ...localTemplate,
          id: existingTemplate.id,
          createdAt: existingTemplate.createdAt || localTemplate.createdAt,
        }
      : localTemplate;
    // Pending edits already have a durable mutation identity, including lost responses.
    const result = localTemplate.syncPending
      ? await saveWorkoutTemplateToSupabase(templateToSync, localTemplate).catch(cause => createResult({ source: "supabase", success: false, data: templateToSync, error: getErrorMessage(cause) }))
      : await saveWorkoutTemplateWithFallback(templateToSync);
    if (planningOwner() !== account || planningAccountGeneration() !== accountGeneration) return createResult({ source: "supabase", success: false, data: summary, error: "Account changed during template sync." });
    if (localTemplate.syncPending && result.success) acknowledgeTemplateSave(account, accountGeneration, localTemplate, result.data);

    if (result.success && result.source === "supabase") {
      summary.syncedItems += 1;
      existingById.set(result.data.id, result.data);
      continue;
    }

    summary.failedItems += 1;
    summary.errors.push(
      `${localTemplate.title}: ${result.error || "Could not sync template."}`,
    );
  }

  return createResult({
    source: "supabase",
    success: summary.failedItems === 0,
    data: summary,
    error: summary.errors[0] || null,
  });
};

export const syncLocalWorkoutLogsToSupabase = async (): Promise<
  WorkoutPersistenceResult<WorkoutDataSyncSummary>
> => {
  const account = planningOwner(), accountGeneration = planningAccountGeneration();
  await syncPendingPlanningWorkouts();
  const changedAccount = () => createResult({ source: "supabase" as const, success: false, data: createEmptySyncSummary(), error: "Account changed during workout history sync." });
  if (planningOwner() !== account || planningAccountGeneration() !== accountGeneration) return changedAccount();
  const statsVersion = planningRecordVersion(planningKeys.exerciseStats);
  const logsVersion = planningRecordVersion(planningKeys.logs);
  const assertSourceCurrent = () => {
    if (planningOwner() !== account || planningAccountGeneration() !== accountGeneration || planningRecordVersion(planningKeys.exerciseStats) !== statsVersion || planningRecordVersion(planningKeys.logs) !== logsVersion) {
      throw new Error("Local workout history changed during sync. Review the current records and retry; remaining captured entries were not uploaded.");
    }
  };
  const canonicalLogs = readPlanningLogs();
  if (!Array.isArray(canonicalLogs) || canonicalLogs.some(log => !planningLogHasIdentity(log) || !Array.isArray(log.entries))) {
    const summary = createEmptySyncSummary();
    summary.failedItems = 1;
    summary.errors.push("Saved workout exercise lists need review before importing legacy statistics. Original records are preserved; valid pending workouts were processed separately.");
    return createResult({ source: "supabase", success: false, data: summary, error: summary.errors[0] });
  }
  const canonicalKeys = new Set(canonicalLogs.flatMap(log => log.entries.map(getStatEntrySyncKey)));
  const localEntries = readExerciseStats().filter(entry => !canonicalKeys.has(getStatEntrySyncKey(entry)));
  const summary = createEmptySyncSummary();

  summary.localItems = localEntries.length;

  const auth = await getCurrentAuthenticatedWorkoutProfile();

  if (!auth.success || !auth.data) {
    return createResult({
      source: "supabase",
      success: false,
      data: summary,
      error: auth.error,
    });
  }

  const supabaseEntries = await loadWorkoutLogEntriesFromSupabase().catch(cause => createResult({ source: "supabase", success: false, data: [] as LocalExerciseStatEntry[], error: getErrorMessage(cause) }));
  if (planningOwner() !== account || planningAccountGeneration() !== accountGeneration) return changedAccount();

  if (!supabaseEntries.success) {
    return createResult({
      source: "supabase",
      success: false,
      data: summary,
      error: supabaseEntries.error,
    });
  }

  const existingEntryKeys = new Set(
    supabaseEntries.data.map(getStatEntrySyncKey),
  );
  const seenLocalEntryKeys = new Set<string>();
  const unsyncedEntries = localEntries.filter((entry) => {
    const entryKey = getStatEntrySyncKey(entry);

    if (existingEntryKeys.has(entryKey) || seenLocalEntryKeys.has(entryKey)) {
      summary.skippedItems += 1;
      return false;
    }

    seenLocalEntryKeys.add(entryKey);
    return true;
  });
  const datedEntries = unsyncedEntries.filter(entry => {
    if (typeof entry.date === "string" && Number.isFinite(activityTimestamp(entry.date))) return true;
    summary.failedItems += 1;
    summary.errors.push("Saved exercise date needs review before upload. The original local record is preserved.");
    return false;
  });
  const groupedEntries = groupStatEntriesByCompletedAt(datedEntries);

  for (const [completedAt, entries] of groupedEntries) {
    if (planningOwner() !== account || planningAccountGeneration() !== accountGeneration) return changedAccount();
    try { assertSourceCurrent(); }
    catch (cause) { return createResult({ source: "supabase", success: false, data: summary, error: getErrorMessage(cause) }); }
    const result = await saveCompletedWorkoutLogToSupabase({
      sessionId: `legacy-import:${completedAt}:${entries.map(getStatEntrySyncKey).sort().join(";")}`,
      title:
        entries.length === 1
          ? `Imported Local Workout - ${entries[0].exerciseName}`
          : "Imported Local Workout",
      completedAt,
      entries,
    }, undefined, assertSourceCurrent);

    if (planningOwner() !== account || planningAccountGeneration() !== accountGeneration) return changedAccount();
    if (result.success) {
      summary.syncedItems += entries.length;
      result.data.entries.forEach((entry) => {
        existingEntryKeys.add(getStatEntrySyncKey(entry));
      });
      continue;
    }

    summary.failedItems += entries.length;
    summary.errors.push(
      `${completedAt}: ${result.error || "Could not sync workout entries."}`,
    );
    try { assertSourceCurrent(); }
    catch (cause) { return createResult({ source: "supabase", success: false, data: summary, error: getErrorMessage(cause) }); }
  }

  return createResult({
    source: "supabase",
    success: summary.failedItems === 0,
    data: summary,
    error: summary.errors[0] || null,
  });
};

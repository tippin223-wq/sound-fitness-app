import { readWorkoutBuilderTemplates, resolveUniqueSavedWorkoutTemplate, workoutTemplateContentVersion, prepareWorkoutSessionTemplate, type LocalWorkoutBuilderTemplate } from "@/lib/localData/workoutBuilderData";
import { readPlanning, writePlanning, writePlanningValues, planningKeys, planningOwner, planningAccountGeneration, planningRecordVersion, planningSnapshot, captureDevicePlanningRecovery } from "@/lib/planning/store";
import { requireSavedGoals } from "@/lib/planning/goals";
import { assignmentCompleted, readWorkoutCompletionEvidence } from "@/lib/planning/logs";
import { validDateOnly } from "@/lib/planning/dates";
import { validatePlanningImport } from "@/lib/planning/importValidation";
import { normalizeGoalId } from "@/lib/planning/goals";
import { ambiguousWorkoutTemplateIds, rankWorkoutTemplates, workoutTemplateRecommendationIssue } from "@/lib/planning/templateRecommendations";
import { profileAge, profileEquipmentSelectionIssue, type RecommendationProfile } from "@/lib/planning/recommendation";
import { captureWorkoutLaunchEditor, assertWorkoutLaunchEditor, type WorkoutLaunchEditor } from "@/lib/planning/workoutLaunchEditor";
import { MAX_WORKOUT_SESSION_EXERCISES } from "@/lib/planning/activeSessionRecovery";

export const LOCAL_WORKOUT_PLAN_STORAGE_KEYS = {
  plans: "soundFitnessWorkoutPlans",
  activePlanId: "soundFitnessActiveWorkoutPlanId",
  activeWorkoutSessionContext: "soundFitnessActiveWorkoutSessionContext",
} as const;

export type LocalPlanMode = "custom" | "coach" | "hybrid";
export type LocalPlanStatus = "draft" | "active" | "archived";
export type LocalPlanDayName =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export type LocalPlanAssignmentSource =
  | "saved-template"
  | "builder-template"
  | "manual";

export type LocalPlanAssignment = {
  templateContentVersion?: string;
  setsPerExercise?: number;
  time?: string;
  id: string;
  templateId: string | null;
  templateTitle: string;
  templateExerciseCount: number;
  source: LocalPlanAssignmentSource;
  focus: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type LocalPlanDay = {
  kind?: "training" | "rest";
  title?: string;
  id: string;
  date: string;
  dayOfWeek: LocalPlanDayName;
  focus: string;
  notes: string;
  assignments: LocalPlanAssignment[];
};

export type LocalWeeklyPlan = {
  settings?: { createdBy?: string; split: string; weeklyTarget: string; primaryFocus: string; secondaryFocus: string; progression: string; phase: string; notes: string };
  goalsUpdatedAt?: string;
  goalsVersion?: string;
  id: string;
  title: string;
  weekStartDate: string;
  goal: string;
  mode: LocalPlanMode;
  status: LocalPlanStatus;
  days: LocalPlanDay[];
  createdAt: string;
  updatedAt: string;
};

export type LocalActiveWorkoutSessionContext = {
  id: string;
  source: "plan" | "template" | "default";
  planId: string | null;
  planTitle: string | null;
  planDayId: string | null;
  planDayDate: string | null;
  assignmentId: string | null;
  templateId: string | null;
  templateTitle: string | null;
  startedAt: string;
};

export type CreateLocalWeeklyPlanInput = {
  title?: string;
  weekStartDate?: string;
  goal?: string;
  mode?: LocalPlanMode;
  status?: LocalPlanStatus;
  days?: LocalPlanDay[];
};

export type UpdateLocalWeeklyPlanInput = Partial<
  Omit<LocalWeeklyPlan, "id" | "createdAt" | "updatedAt">
>;

export type AssignTemplateToPlanDayInput = {
  planId: string;
  dayId: string;
  template: Pick<LocalWorkoutBuilderTemplate, "id" | "title" | "exercises">;
  source?: LocalPlanAssignmentSource;
  focus?: string;
  notes?: string;
};

export type RemoveAssignmentFromPlanDayInput = {
  planId: string;
  dayId: string;
  assignmentId: string;
};

export type SetActiveWorkoutSessionContextInput = Partial<
  Pick<LocalActiveWorkoutSessionContext, "id" | "startedAt">
> &
  Omit<LocalActiveWorkoutSessionContext, "id" | "startedAt">;

const DAY_NAMES: LocalPlanDayName[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const canUseLocalStorage = () =>
  typeof window !== "undefined" && Boolean(window.localStorage);

const readLocalArray = <T>(key: string) => { const value = readPlanning<unknown>(key, []); return Array.isArray(value) ? value as T[] : []; };

/** Store detached snapshots so open forms and returned results cannot mutate saved plans. */
const commitPlanValues = (values: Record<string, unknown>) => writePlanningValues(structuredClone(values));

const writeLocalArray = <T>(key: string, items: T[]) => {
  if (!canUseLocalStorage()) return;

  writePlanning(key, structuredClone(items));
};

const readLocalObject = <T>(key: string) => readPlanning<T | null>(key, null);

const writeLocalObject = <T>(key: string, item: T) => {
  if (!canUseLocalStorage()) return;

  writePlanning(key, structuredClone(item));
};

const readLocalString = (key: string) => {
  if (!canUseLocalStorage()) return null;

  return readPlanning<string | null>(key, null);
};

const removeLocalItem = (key: string) => {
  if (!canUseLocalStorage()) return;

  writePlanning(key, null);
};

const createLocalId = (prefix: string) => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const toDateOnlyISO = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const parseDateOnly = (value?: string) => {
  if (value === undefined) return new Date();
  if (typeof value !== "string" || !validDateOnly(value)) throw new Error("Choose a valid calendar date.");
  return new Date(`${value}T12:00:00`);
};

const getStartOfWeekDate = (value?: string) => {
  const date = parseDateOnly(value);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + mondayOffset);

  return toDateOnlyISO(date);
};

const addDays = (value: string, days: number) => {
  const date = parseDateOnly(value);
  date.setDate(date.getDate() + days);

  return toDateOnlyISO(date);
};

const createPlanDayId = (planId: string, date: string) =>
  `${planId}-day-${date}`;

const createDefaultPlanDays = (planId: string, weekStartDate: string) =>
  DAY_NAMES.map<LocalPlanDay>((dayOfWeek, index) => {
    const date = addDays(weekStartDate, index);

    return {
      id: createPlanDayId(planId, date),
      date,
      dayOfWeek,
      focus: "",
      notes: "",
      assignments: [],
    };
  });

const normalizeTitle = (title?: string) =>
  title?.trim() || "Weekly Workout Plan";

const assertPlanSaveFields = (input: object) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Review the plan fields before saving. The original weeks are preserved.");
  const fields = input as Record<string, unknown>;
  for (const [key, allowed] of [["status", ["draft", "active", "archived"]], ["mode", ["custom", "coach", "hybrid"]]] as const) {
    if (Object.hasOwn(fields, key) && (typeof fields[key] !== "string" || !(allowed as readonly string[]).includes(fields[key]))) throw new Error(`Choose a supported plan ${key} before saving. The original weeks are preserved.`);
  }
  if (Object.hasOwn(fields, "title") && typeof fields.title !== "string") throw new Error("Plan title must be text. The original weeks are preserved.");
  if (Object.hasOwn(fields, "days") && !Array.isArray(fields.days)) throw new Error("Review the plan days before saving. The original weeks are preserved.");
};

const replacePlan = (
  plans: LocalWeeklyPlan[],
  updatedPlan: LocalWeeklyPlan,
) =>
  plans.map((plan) => (plan.id === updatedPlan.id ? updatedPlan : plan));

export const readWorkoutPlans = () =>
  readLocalArray<LocalWeeklyPlan>(LOCAL_WORKOUT_PLAN_STORAGE_KEYS.plans);

/** Validate raw saved originals before domain mutations; display reads retain legacy fallbacks. */
export function requireValidWorkoutPlans(): LocalWeeklyPlan[] {
  const values = planningSnapshot();
  const original = Object.hasOwn(values, planningKeys.plans) ? values[planningKeys.plans] : [];
  if (!Array.isArray(original) || validatePlanningImport({ [planningKeys.plans]: original })) throw new Error("Review the plan's saved dates and assignments before changing plans. The original weeks are preserved.");
  return original as LocalWeeklyPlan[];
}

export function inspectWorkoutPlans() {
  if (captureDevicePlanningRecovery().blocked) return { plans: [] as LocalWeeklyPlan[], issue: "Device planning data needs recovery. Export the preserved originals before making changes. Plan reporting and editing are paused." };
  try { return { plans: requireValidWorkoutPlans(), issue: "" }; }
  catch (cause) { return { plans: [] as LocalWeeklyPlan[], issue: cause instanceof Error ? cause.message : "Saved plan weeks need review. Original plans remain preserved." }; }
}

export const writeWorkoutPlans = (plans: LocalWeeklyPlan[]) => {
  writeLocalArray(LOCAL_WORKOUT_PLAN_STORAGE_KEYS.plans, plans);
};

const persistActivePlan = (plans: LocalWeeklyPlan[], activeId: string, now: string) => {
  requireValidWorkoutPlans();
  if (validatePlanningImport({ [planningKeys.plans]: plans })) throw new Error("Review the plan's saved dates and assignments before activating it. The original weeks are preserved.");
  requireSavedGoals();
  const activatingPlan = plans.find(plan => plan.id === activeId);
  if (!activatingPlan || planGoalsNeedReview(activatingPlan)) throw new Error("Review current saved Goals against this plan and mark them reviewed before activating it. Your active plan is preserved.");
  const next = plans.map(plan => plan.id === activeId ? { ...plan, status: "active" as const, updatedAt: now }
    : plan.status === "active" ? { ...plan, status: "draft" as const, updatedAt: now } : plan);
  if (validatePlanningImport({ [planningKeys.plans]: next })) throw new Error("Review the plan's saved dates and assignments before activating it. The original weeks are preserved.");
  commitPlanValues({ [planningKeys.plans]: next, [planningKeys.active]: activeId });
  return next;
};

export const createWorkoutPlan = (input: CreateLocalWeeklyPlanInput = {}) => {
  requireValidWorkoutPlans();
  assertPlanSaveFields(input);
  const goals = requireSavedGoals();
  const goal = normalizeGoalId(input.goal === undefined ? goals.primaryGoal : input.goal);
  if (!goal) throw new Error("Choose a supported plan direction before saving this week.");
  const now = new Date().toISOString();
  const id = createLocalId("plan");
  const weekStartDate = getStartOfWeekDate(input.weekStartDate);
  const currentWeek = getStartOfWeekDate();
  if (weekStartDate < currentWeek || weekStartDate > addDays(currentWeek, 21)) throw new Error("Create plans within the next four weeks. Previous weeks remain available in history.");
  if (readWorkoutPlans().some(plan => plan.weekStartDate === weekStartDate && plan.status !== "archived")) throw new Error("A plan already exists for this week. Edit the existing week instead.");
  const plan: LocalWeeklyPlan = {
    id,
    title: normalizeTitle(input.title),
    weekStartDate,
    goal,
    mode: input.mode || "custom",
    status: input.status || "draft",
    days: input.days || createDefaultPlanDays(id, weekStartDate),
    createdAt: now,
    updatedAt: now,
    goalsUpdatedAt: goals.updatedAt,
    goalsVersion: planningRecordVersion(planningKeys.goals),
  };
  let plans = [plan, ...readWorkoutPlans()];
  if (validatePlanningImport({ [planningKeys.plans]: plans })) throw new Error("Review the plan's saved dates and assignments before saving. The original weeks are preserved.");
  if (plan.status === "active") plans = persistActivePlan(plans, plan.id, now);
  else writeWorkoutPlans(plans);

  return { plan, plans };
};

export const updateWorkoutPlan = (
  planId: string,
  updates: UpdateLocalWeeklyPlanInput,
) => {
  const plans = requireValidWorkoutPlans();
  const existingPlan = plans.find((plan) => plan.id === planId);

  if (!existingPlan) return null;
  assertPlanSaveFields(updates);
  const goal = updates.goal === undefined ? existingPlan.goal : normalizeGoalId(updates.goal);
  if (!goal) throw new Error("Choose a supported plan direction before saving this week.");
  if (existingPlan.status === "archived" && Object.keys(updates).some(key => key !== "status")) throw new Error("Restore the archived week before editing it.");
  if (updates.weekStartDate && updates.weekStartDate !== existingPlan.weekStartDate) throw new Error("Duplicate the plan to schedule a different week.");
  if (updates.days) {
    for (const day of existingPlan.days) {
      for (const assignment of day.assignments.filter(item => assignmentCompleted(item.id))) {
        const nextDay = updates.days.find(item => item.id === day.id);
        const nextAssignment = nextDay?.assignments.find(item => item.id === assignment.id);
        if (!nextDay || nextDay.date !== day.date || nextDay.kind === "rest" || JSON.stringify(nextAssignment) !== JSON.stringify(assignment)) throw new Error("Completed workouts cannot be moved, edited, or removed.");
      }
    }
  }
  if (updates.status && updates.status !== "archived" && readWorkoutPlans().some(plan => plan.id !== planId && plan.status !== "archived" && plan.weekStartDate === existingPlan.weekStartDate)) throw new Error("Another plan already occupies this week. Archive it before restoring this one.");

  const updatedPlan: LocalWeeklyPlan = {
    ...existingPlan,
    ...updates,
    ...(updates.settings && typeof updates.settings === "object" && !Array.isArray(updates.settings)
      ? { settings: { ...existingPlan.settings, ...updates.settings } } : {}),
    id: existingPlan.id,
    title:
      updates.title !== undefined
        ? normalizeTitle(updates.title)
        : existingPlan.title,
    goal,
    createdAt: existingPlan.createdAt,
    updatedAt: new Date().toISOString(),
  };
  let updatedPlans = replacePlan(plans, updatedPlan);
  if (validatePlanningImport({ [planningKeys.plans]: updatedPlans })) throw new Error("Review the plan's saved dates and assignments before saving. The original weeks are preserved.");
  if (updates.status === "active") updatedPlans = persistActivePlan(updatedPlans, planId, updatedPlan.updatedAt);
  else commitPlanValues({ [planningKeys.plans]: updatedPlans, ...(updates.status !== undefined && getActiveWorkoutPlanId() === planId ? { [planningKeys.active]: null } : {}) });

  return { plan: updatedPlan, plans: updatedPlans };
};

export const deleteWorkoutPlan = (planId: string) => {
  const plans = requireValidWorkoutPlans();
  const deletedPlan = plans.find((plan) => plan.id === planId) || null;
  if (!deletedPlan) return { plan: null, plans };
  if (validatePlanningImport({ [planningKeys.plans]: plans })) throw new Error("Review the plan's saved dates and assignments before deleting. The original weeks are preserved.");
  const assignmentIds = new Set(deletedPlan.days.flatMap(day => day.assignments.map(assignment => assignment.id)));
  if (readWorkoutCompletionEvidence().some(log => log.planId === planId || Boolean(log.assignmentId && assignmentIds.has(log.assignmentId)))) throw new Error("Weeks with completed workouts remain in your plan history. Archive this week instead.");
  const updatedPlans = plans.filter((plan) => plan.id !== planId);

  commitPlanValues({ [planningKeys.plans]: updatedPlans, ...(getActiveWorkoutPlanId() === planId ? { [planningKeys.active]: null } : {}) });

  return { plan: deletedPlan, plans: updatedPlans };
};

export const getActiveWorkoutPlanId = () =>
  readLocalString(LOCAL_WORKOUT_PLAN_STORAGE_KEYS.activePlanId);

export const clearActiveWorkoutPlan = () => {
  const original = readPlanning<unknown>(planningKeys.plans, []);
  if (validatePlanningImport({ [planningKeys.plans]: original })) throw new Error("Review the plan's saved dates and assignments before clearing it. The original weeks are preserved.");
  const plans = requireValidWorkoutPlans();
  if (!getActiveWorkoutPlanId() && !plans.some(plan => plan.status === "active")) return;
  const now = new Date().toISOString();
  const next = plans.map(plan => plan.status === "active" ? { ...plan, status: "draft" as const, updatedAt: now } : plan);
  if (validatePlanningImport({ [planningKeys.plans]: next })) throw new Error("Review the plan's saved dates and assignments before clearing it. The original weeks are preserved.");
  commitPlanValues({ [planningKeys.plans]: next, [planningKeys.active]: null });
};

export const setActiveWorkoutPlan = (planId: string) => {
  const plans = requireValidWorkoutPlans();
  const now = new Date().toISOString();
  const activePlan = plans.find((plan) => plan.id === planId);

  if (!activePlan) return null;
  if (activePlan.status === "archived") throw new Error("Restore the archived week before activating it.");

  const updatedPlans = persistActivePlan(plans, planId, now);

  return {
    plan: updatedPlans.find((plan) => plan.id === planId) || activePlan,
    plans: updatedPlans,
  };
};

export const resolveActiveWorkoutPlan = (plans: LocalWeeklyPlan[], activePlanId: string | null) =>
  activePlanId ? plans.find(plan => plan.id === activePlanId && plan.status === "active") || null : null;

export const workoutPlanStatusLabel = (plan: LocalWeeklyPlan, activePlanId: string | null) =>
  plan.status === "archived" ? "Archived" : plan.status === "active"
    ? plan.id === activePlanId ? "Active" : "Review activation" : "Draft";

export const getActiveWorkoutPlan = () => {
  const activePlanId = getActiveWorkoutPlanId();
  return activePlanId ? resolveActiveWorkoutPlan(readWorkoutPlans(), activePlanId) : null;
};

export const assignTemplateToPlanDay = ({
  planId,
  dayId,
  template,
  source,
  focus,
  notes,
}: AssignTemplateToPlanDayInput) => {
  const plans = requireValidWorkoutPlans();
  const plan = plans.find((item) => item.id === planId);
  const day = plan?.days.find((item) => item.id === dayId);

  if (!plan || !day) return null;
  if (plan.status === "archived") throw new Error("Restore this week before assigning workouts.");
  if (validatePlanningImport({ [planningKeys.plans]: plans })) throw new Error("Review the plan's saved dates and assignments before assigning workouts. The original weeks are preserved.");
  if (source !== undefined && (typeof source !== "string" || !["saved-template", "builder-template", "manual"].includes(source))) throw new Error("Choose a supported workout assignment source.");
  if (focus !== undefined && typeof focus !== "string" || notes !== undefined && typeof notes !== "string") throw new Error("Workout focus and notes must be text.");
  if (!template.exercises.length) throw new Error("Choose a workout with at least one exercise.");
  const currentTemplate = resolveUniqueSavedWorkoutTemplate(template.id);
  if (!currentTemplate || workoutTemplateContentVersion(currentTemplate) !== workoutTemplateContentVersion(template)) throw new Error("This saved workout changed or is no longer available. Review the current workout before assigning it; your plan is preserved.");
  if (validatePlanningImport({ [planningKeys.templates]: [currentTemplate] })) throw new Error("Review this saved workout's exercises before assigning it. Your plan is preserved.");
  if (currentTemplate.exercises.length > MAX_WORKOUT_SESSION_EXERCISES) throw new Error(`Choose a workout within the supported ${MAX_WORKOUT_SESSION_EXERCISES}-exercise limit before assigning it. Your plan, original workout and active session are preserved.`);

  const now = new Date().toISOString();
  const existingAssignment = day.assignments.find(
    (assignment) => assignment.templateId === template.id,
  );
  if (existingAssignment && assignmentCompleted(existingAssignment.id)) throw new Error("This assignment is already completed. Add another workout on a different day.");
  const assignment: LocalPlanAssignment = {
    ...existingAssignment,
    id: existingAssignment?.id || createLocalId("assignment"),
    templateId: template.id,
    templateTitle: template.title,
    templateExerciseCount: template.exercises.length,
    templateContentVersion: workoutTemplateContentVersion(currentTemplate),
    source: source ?? existingAssignment?.source ?? "saved-template",
    setsPerExercise: existingAssignment?.setsPerExercise ?? 3,
    time: existingAssignment?.time ?? "09:00",
    focus: focus === undefined ? existingAssignment?.focus ?? "" : focus.trim(),
    notes: notes === undefined ? existingAssignment?.notes ?? "" : notes.trim(),
    createdAt: existingAssignment?.createdAt || now,
    updatedAt: now,
  };
  const updatedDay: LocalPlanDay = {
    ...day,
    kind: "training",
    assignments: existingAssignment
      ? day.assignments.map((item) =>
          item.id === existingAssignment.id ? assignment : item,
        )
      : [...day.assignments, assignment],
  };
  const updatedPlan: LocalWeeklyPlan = {
    ...plan,
    days: plan.days.map((item) => (item.id === dayId ? updatedDay : item)),
    updatedAt: now,
  };
  const updatedPlans = replacePlan(plans, updatedPlan);

  if (validatePlanningImport({ [planningKeys.plans]: updatedPlans })) throw new Error("Review the plan's saved dates and assignments before assigning workouts. The original weeks are preserved.");
  writeWorkoutPlans(updatedPlans);

  return { plan: updatedPlan, day: updatedDay, assignment, plans: updatedPlans };
};

export const removeAssignmentFromPlanDay = ({
  planId,
  dayId,
  assignmentId,
}: RemoveAssignmentFromPlanDayInput) => {
  const plans = requireValidWorkoutPlans();
  const plan = plans.find((item) => item.id === planId);
  const day = plan?.days.find((item) => item.id === dayId);

  if (!plan || !day) return null;
  if (plan.status === "archived") throw new Error("Restore this week before editing workouts.");
  if (assignmentCompleted(assignmentId)) throw new Error("Completed workouts remain in your plan history.");
  if (validatePlanningImport({ [planningKeys.plans]: plans })) throw new Error("Review the plan's saved dates and assignments before removing workouts. The original weeks are preserved.");

  const updatedDay: LocalPlanDay = {
    ...day,
    assignments: day.assignments.filter((item) => item.id !== assignmentId),
  };
  const updatedPlan: LocalWeeklyPlan = {
    ...plan,
    days: plan.days.map((item) => (item.id === dayId ? updatedDay : item)),
    updatedAt: new Date().toISOString(),
  };
  const updatedPlans = replacePlan(plans, updatedPlan);

  if (validatePlanningImport({ [planningKeys.plans]: updatedPlans })) throw new Error("Review the plan's saved dates and assignments before removing workouts. The original weeks are preserved.");
  writeWorkoutPlans(updatedPlans);

  return { plan: updatedPlan, day: updatedDay, plans: updatedPlans };
};

export const duplicatePlanToNextWeek = (
  planId: string,
  input: Pick<CreateLocalWeeklyPlanInput, "title" | "status"> = {},
) => {
  requireSavedGoals();
  const plans = requireValidWorkoutPlans();
  const sourcePlan = plans.find((plan) => plan.id === planId);

  if (!sourcePlan) return null;
  if (input.status !== undefined && (typeof input.status !== "string" || !["draft", "active", "archived"].includes(input.status))) throw new Error("Choose a supported plan status before duplicating it. The original weeks are preserved.");
  if (validatePlanningImport({ [planningKeys.plans]: [sourcePlan] })) throw new Error("Review this plan's saved dates and assignments before duplicating it. The original week is preserved.");

  const now = new Date().toISOString();
  const duplicatePlanId = createLocalId("plan");
  const weekStartDate = addDays(sourcePlan.weekStartDate, 7);
  const currentWeek = getStartOfWeekDate();
  if (weekStartDate < currentWeek || weekStartDate > addDays(currentWeek, 21)) throw new Error("Duplicate into a week within the current four-week planning window.");
  if (plans.some(plan => plan.weekStartDate === weekStartDate && plan.status !== "archived")) throw new Error("The next week already has a plan.");
  const days = sourcePlan.days.map<LocalPlanDay>((day) => {
    const date = addDays(day.date, 7);
    const weekdayIndex = (parseDateOnly(date).getDay() + 6) % 7;

    return {
      ...day,
      id: createPlanDayId(duplicatePlanId, date),
      date,
      dayOfWeek: DAY_NAMES[weekdayIndex],
      assignments: day.assignments.map((assignment) => ({
        ...assignment,
        id: createLocalId("assignment"),
        createdAt: now,
        updatedAt: now,
      })),
    };
  });
  const duplicatePlan: LocalWeeklyPlan = {
    ...sourcePlan,
    id: duplicatePlanId,
    title: normalizeTitle(input.title || `${sourcePlan.title} - Next Week`),
    weekStartDate,
    status: input.status === undefined ? "draft" : input.status,
    days,
    createdAt: now,
    updatedAt: now,
  };
  let updatedPlans = [duplicatePlan, ...plans];
  if (validatePlanningImport({ [planningKeys.plans]: updatedPlans })) throw new Error("Review the plan's saved dates and assignments before duplicating it. The original weeks are preserved.");
  if (duplicatePlan.status === "active") updatedPlans = persistActivePlan(updatedPlans, duplicatePlan.id, now);
  else writeWorkoutPlans(updatedPlans);

  return { plan: duplicatePlan, plans: updatedPlans };
};

export const setActiveWorkoutSessionContext = (
  context: SetActiveWorkoutSessionContextInput,
) => {
  const sessionContext: LocalActiveWorkoutSessionContext = {
    ...context,
    id: context.id || createLocalId("session-context"),
    startedAt: context.startedAt || new Date().toISOString(),
  };

  writeLocalObject(
    LOCAL_WORKOUT_PLAN_STORAGE_KEYS.activeWorkoutSessionContext,
    sessionContext,
  );

  return sessionContext;
};

/** Persist the session and its canonical assignment link as one device write. */
/** Exclude damaged, ambiguous or unresolved versions from member-facing assignment choices. */
export function planWorkoutTemplateChoices(templates: LocalWorkoutBuilderTemplate[]) {
  if (!Array.isArray(templates)) return [];
  const ambiguous = ambiguousWorkoutTemplateIds(templates);
  return templates.filter(template => !workoutTemplateRecommendationIssue(template) && !ambiguous.has(template.id));
}

export function assignmentTemplateIssue(assignment: LocalPlanAssignment, template: LocalWorkoutBuilderTemplate | undefined): string | null {
  if (!template || template.id !== assignment.templateId || !template.exercises?.length) return "Saved workout unavailable. Choose a saved workout to replace this assignment.";
  if (validatePlanningImport({ [planningKeys.templates]: [template] })) return "Saved workout exercises need review. Original workout and assignment records are preserved; review the workout library before starting.";
  if (template.exercises.length > MAX_WORKOUT_SESSION_EXERCISES) return `Saved workout exceeds the supported ${MAX_WORKOUT_SESSION_EXERCISES}-exercise limit. Review its size before starting; original workout and session data are preserved.`;
  if (assignment.templateContentVersion && assignment.templateContentVersion !== workoutTemplateContentVersion(template)) return "Saved workout changed since assignment. Review its exercises and assign it again before starting.";
  if (!assignment.templateContentVersion && (assignment.templateTitle !== template.title || assignment.templateExerciseCount !== template.exercises.length)) return "Saved workout title or exercise count changed. Review and assign it again before starting.";
  return null;
}

/** Member-facing launch checks the rendered week before replacing any active session. */
export function startDisplayedPlanWorkout(plan: LocalWeeklyPlan, dayId: string, assignmentId: string, template: LocalWorkoutBuilderTemplate, account: string | null, launchEditor: WorkoutLaunchEditor = captureWorkoutLaunchEditor()) {
  assertPlanEditor({ ...capturePlanEditor(plan), account });
  assertWorkoutLaunchEditor(launchEditor);
  return startPlanWorkout(plan.id, dayId, assignmentId, template);
}

export function startPlanWorkout(planId: string, dayId: string, assignmentId: string, template: LocalWorkoutBuilderTemplate) {
  const plan = requireValidWorkoutPlans().find(item => item.id === planId);
  const day = plan?.days.find(item => item.id === dayId);
  const assignment = day?.assignments.find(item => item.id === assignmentId);
  if (!plan || !day || !assignment) throw new Error("This workout assignment changed. Refresh My Plan before starting.");
  if (plan.status === "archived") throw new Error("Restore this week before starting its workouts.");
  if (assignmentCompleted(assignmentId)) throw new Error("This workout is already completed. Review it in History.");
  if (!template.id || assignment.templateId !== template.id || !template.exercises?.length) throw new Error("This assignment needs its current saved workout before starting.");
  const canonicalTemplate = resolveUniqueSavedWorkoutTemplate(template.id);
  if (!canonicalTemplate || !canonicalTemplate.exercises?.length || validatePlanningImport({ [planningKeys.templates]: [canonicalTemplate] })) throw new Error("This assignment needs its current saved workout before starting. Review the saved workout library.");
  if (workoutTemplateContentVersion(canonicalTemplate) !== workoutTemplateContentVersion(template)) throw new Error("This saved workout changed since My Plan loaded. Review its current exercises before starting; your active session is preserved.");
  const templateIssue = assignmentTemplateIssue(assignment, canonicalTemplate);
  if (templateIssue) throw new Error(templateIssue);
  const sessionTemplate = prepareWorkoutSessionTemplate(canonicalTemplate);
  const startedAt = sessionTemplate.startedAt;
  const context: LocalActiveWorkoutSessionContext = {
    id: createLocalId("session-context"), source: "plan", planId: plan.id, planTitle: plan.title,
    planDayId: day.id, planDayDate: day.date, assignmentId: assignment.id,
    templateId: canonicalTemplate.id, templateTitle: canonicalTemplate.title, startedAt,
  };
  commitPlanValues({
    [planningKeys.context]: context,
    soundFitnessWorkoutBuilderActiveSessionTemplate: sessionTemplate,
  });
  return JSON.parse(JSON.stringify({ context, sessionTemplate })) as { context: LocalActiveWorkoutSessionContext; sessionTemplate: typeof sessionTemplate };
}

export const getActiveWorkoutSessionContext = () =>
  readLocalObject<LocalActiveWorkoutSessionContext>(
    LOCAL_WORKOUT_PLAN_STORAGE_KEYS.activeWorkoutSessionContext,
  );

export const clearActiveWorkoutSessionContext = () => {
  removeLocalItem(
    LOCAL_WORKOUT_PLAN_STORAGE_KEYS.activeWorkoutSessionContext,
  );
};

export function updatePlanDay(planId: string, dayId: string, updates: Partial<Pick<LocalPlanDay, "kind" | "focus" | "notes">>) {
  const plans = requireValidWorkoutPlans();
  const plan = plans.find(item => item.id === planId);
  const day = plan?.days.find(item => item.id === dayId);
  if (!plan || !day) throw new Error("Plan day could not be found.");
  if (plan.status === "archived") throw new Error("Restore this week before editing it.");
  if (validatePlanningImport({ [planningKeys.plans]: plans })) throw new Error("Review the plan's saved dates and assignments before editing. The original weeks are preserved.");
  if (!updates || typeof updates !== "object" || Array.isArray(updates) || Object.keys(updates).some(key => !["kind", "focus", "notes"].includes(key))) throw new Error("Day edits may change only day type, focus, and notes.");
  if (Object.hasOwn(updates, "kind") && updates.kind !== "training" && updates.kind !== "rest") throw new Error("Choose a training or rest day.");
  if (["focus", "notes"].some(key => Object.hasOwn(updates, key) && typeof updates[key as "focus" | "notes"] !== "string")) throw new Error("Day focus and notes must be text.");
  if (updates.kind === "rest" && day.assignments.length) throw new Error("Move or remove this day's workouts before making it a rest day.");
  return updateWorkoutPlan(planId, { days: plan.days.map(item => item.id === dayId ? { ...item, ...updates } : item) });
}

export type PlanEditor = { account: string | null; generation: number; plansVersion: string; goalsVersion: string; profileVersion: string; recommendationAge?: number | null; displayedPlan?: { id: string; version: string } };
/** Preserve the open form, including invalid values, before reviewing a conflict. */
export function exportPlanConfigurationDraft(draft: unknown, editor: PlanEditor, now = new Date()) {
  if (!editor.account || planningOwner() !== editor.account || editor.generation !== planningAccountGeneration()) throw new Error("Your account changed. Reload My Plan before exporting this draft.");
  return JSON.stringify({ schemaVersion: 1, source: "Sound Fitness plan editor draft", exportedAt: now.toISOString(), account: editor.account, draft }, null, 2);
}
export function capturePlanEditor(displayedPlan?: LocalWeeklyPlan): PlanEditor {
  return { account: planningOwner(), generation: planningAccountGeneration(), plansVersion: planningRecordVersion(planningKeys.plans), goalsVersion: planningRecordVersion(planningKeys.goals), profileVersion: planningRecordVersion(planningKeys.profile), recommendationAge: profileAge(readPlanning<RecommendationProfile>(planningKeys.profile, {})),
    ...(displayedPlan ? { displayedPlan: { id: displayedPlan.id, version: JSON.stringify(displayedPlan) } } : {}) };
}
export function assertPlanEditor(editor: PlanEditor) {
  if (!editor.account || planningOwner() !== editor.account || editor.generation !== planningAccountGeneration()) throw new Error("Your account changed. Reload My Plan before editing.");
  if (planningRecordVersion(planningKeys.plans) !== editor.plansVersion) throw new Error("Plans changed since these controls loaded. Review the current plan before retrying your edit.");
  requireValidWorkoutPlans();
  if (editor.displayedPlan && JSON.stringify(readWorkoutPlans().find(plan => plan.id === editor.displayedPlan!.id)) !== editor.displayedPlan.version)
    throw new Error("The displayed plan is out of date. Refresh My Plan before editing.");
}
export function markPlanGoalsReviewed(planId: string, expectedGoalsUpdatedAt: string | undefined, editor: PlanEditor) {
  assertPlanEditor(editor);
  const goals = requireSavedGoals();
  if (goals.updatedAt !== expectedGoalsUpdatedAt || planningRecordVersion(planningKeys.goals) !== editor.goalsVersion) throw new Error("Goals changed during review. Review the current saved goals before marking this plan reviewed.");
  const result = updateWorkoutPlan(planId, { goalsUpdatedAt: goals.updatedAt, goalsVersion: editor.goalsVersion });
  if (!result) throw new Error("Plan could not be found. Refresh My Plan before reviewing goals.");
  return result;
}

/** A timestamp alone cannot prove that the reviewed goal values are unchanged. */
export function planGoalsNeedReview(plan: LocalWeeklyPlan) {
  return plan.goalsVersion !== planningRecordVersion(planningKeys.goals);
}

/** Prepare the entire configured week before one persistence boundary. */
export function saveWorkoutPlanConfiguration(input: {
  planId: string | null; title: string; goal: string; weekStartDate: string;
  settings: NonNullable<LocalWeeklyPlan["settings"]>;
  trainingDays: Array<{ day: string; title?: string; focus: string; notes: string }>;
  editor: PlanEditor; assignMatches: boolean;
  templates: LocalWorkoutBuilderTemplate[]; profile: RecommendationProfile;
}) {
  assertPlanEditor(input.editor);
  if (planningRecordVersion(planningKeys.profile) !== input.editor.profileVersion) throw new Error("Profile changed since this editor loaded. Reload the plan editor to review recommendations using your current age, equipment, and training context.");
  if (input.editor.recommendationAge !== profileAge(readPlanning<RecommendationProfile>(planningKeys.profile, {}))) throw new Error("Your age context changed since this editor loaded. Export or keep your open draft, then reopen the plan editor to review current age-based recommendations before saving.");
  const goals = requireSavedGoals();
  if (planningRecordVersion(planningKeys.goals) !== input.editor.goalsVersion) throw new Error("Goals changed since this editor loaded. Review current Goals before saving this plan.");
  if (!input.title.trim()) throw new Error("Enter a plan name.");
  const goal = normalizeGoalId(input.goal);
  if (!goal) throw new Error("Choose a supported plan goal.");
  if (!input.trainingDays.length || input.trainingDays.length > 7 || new Set(input.trainingDays.map(day => day.day)).size !== input.trainingDays.length || input.trainingDays.some(day => !DAY_NAMES.includes(day.day as LocalPlanDayName))) throw new Error("Choose a different valid weekday for each training slot.");
  if (input.trainingDays.some(day => Object.hasOwn(day, "title") && typeof day.title !== "string") || Object.hasOwn(input.settings, "createdBy") && typeof input.settings.createdBy !== "string") throw new Error("Workout day names and Created By must be text.");
  if (input.trainingDays.some(day => typeof day.focus !== "string" || typeof day.notes !== "string")) throw new Error("Workout day focus and notes must be text.");
  const weeklyTarget = input.settings.weeklyTarget;
  if (weeklyTarget != null && (typeof weeklyTarget !== "string" || !/^[1-7] workouts?$/.test(weeklyTarget) || Number(weeklyTarget.split(" ")[0]) !== input.trainingDays.length)) throw new Error("Weekly target must match the number of selected training days. Review the schedule before saving.");
  const plans = requireValidWorkoutPlans();
  const existing = input.planId ? plans.find(plan => plan.id === input.planId) : undefined;
  if (input.planId && !existing) throw new Error("This plan is no longer available. Refresh My Plan before saving.");
  if (existing?.status === "archived") throw new Error("Restore the archived week before editing it.");
  if (existing && validatePlanningImport({ [planningKeys.plans]: [existing] })) throw new Error("Review the plan's saved dates and assignments before saving. The original week is preserved.");
  const weekStartDate = getStartOfWeekDate(input.weekStartDate);
  if (existing && existing.weekStartDate !== weekStartDate) throw new Error("Duplicate the plan to schedule a different week.");
  if (!existing) {
    const currentWeek = getStartOfWeekDate();
    if (weekStartDate < currentWeek || weekStartDate > addDays(currentWeek, 21)) throw new Error("Create plans within the next four weeks. Previous weeks remain available in history.");
    if (plans.some(plan => plan.weekStartDate === weekStartDate && plan.status !== "archived")) throw new Error("A plan already exists for this week. Edit it from My Plan.");
  }
  const now = new Date().toISOString();
  const id = existing?.id || createLocalId("plan");
  const currentTemplates = input.assignMatches ? readWorkoutBuilderTemplates() : [];
  if (input.assignMatches && (ambiguousWorkoutTemplateIds(currentTemplates).size || ambiguousWorkoutTemplateIds(input.templates).size)) throw new Error("Saved workout IDs are duplicated. Review the original workout library before assigning recommendations, or save the plan without suggested workouts. Your original plan is preserved.");
  const reviewedTemplates = input.assignMatches ? input.templates.filter(template => !workoutTemplateRecommendationIssue(template)).map(template => {
    const current = currentTemplates.find(item => item.id === template.id);
    if (!current || workoutTemplateContentVersion(current) !== workoutTemplateContentVersion(template)) throw new Error("Saved workouts changed since this editor loaded. Review current workout recommendations before saving, or save without suggested workouts.");
    if (validatePlanningImport({ [planningKeys.templates]: [current] })) throw new Error("A saved workout needs review before it can be recommended. Your original plan is preserved.");
    return current;
  }) : [];
  const weekDays = createDefaultPlanDays(id, weekStartDate).map(day => {
    const saved = existing?.days.find(item => item.date === day.date);
    return saved ? { ...saved, dayOfWeek: day.dayOfWeek } : day;
  });
  let addedAssignments = 0;
  const unfilledReasons = new Map<string, string>();
  const savedProfile = readPlanning<RecommendationProfile>(planningKeys.profile, {});
  const days = weekDays.map<LocalPlanDay>(day => {
    const slot = input.trainingDays.find(item => item.day === day.dayOfWeek);
    const next: LocalPlanDay = { ...day, ...(slot && Object.hasOwn(slot, "title") ? { title: slot.title } : {}), kind: slot || day.assignments.length ? "training" : "rest", focus: slot ? slot.focus : day.focus, notes: slot ? slot.notes : day.notes };
    if (input.assignMatches && next.kind === "training" && !next.assignments.length) {
      const candidates = rankWorkoutTemplates(reviewedTemplates, savedProfile, next.focus);
      const match = candidates.find(item => item.equipmentConfirmed && item.focusSupported);
      if (!match) unfilledReasons.set(day.id, profileEquipmentSelectionIssue(savedProfile)
        || (!next.focus?.trim() ? "Choose a training focus before matching saved workouts."
          : !reviewedTemplates.length ? "No ready saved workouts are available. Review or build a saved workout."
          : !candidates.length ? "No ready saved workout matches this focus and available equipment. Review your saved workouts or build one for this day."
          : [!candidates[0].focusSupported ? candidates[0].reasons[0] : "", !candidates[0].equipmentConfirmed ? candidates[0].reasons[1] : ""].filter(Boolean).join(" ")));
      if (match) {
        addedAssignments++;
        next.assignments = [{ id: createLocalId("assignment"), templateId: match.template.id, templateTitle: match.template.title,
        templateExerciseCount: match.template.exercises.length, templateContentVersion: workoutTemplateContentVersion(match.template), source: "saved-template", setsPerExercise: 3, time: "09:00", focus: next.focus,
        notes: match.reasons.join(" "), createdAt: now, updatedAt: now }];
      }
    }
    return next;
  });
  const plan: LocalWeeklyPlan = { ...(existing || {}), id, title: input.title.trim(), goal, weekStartDate,
    mode: existing?.mode || "custom", status: existing?.status || "draft", days, settings: { ...existing?.settings, ...input.settings, ...(!Object.hasOwn(input.settings, "createdBy") && existing?.settings?.createdBy !== undefined ? { createdBy: existing.settings.createdBy } : {}) },
    goalsUpdatedAt: goals.updatedAt, goalsVersion: input.editor.goalsVersion, createdAt: existing?.createdAt || now, updatedAt: now };
  if (validatePlanningImport({ [planningKeys.plans]: [plan] })) throw new Error("Review the plan's saved dates and assignments before saving. The original week is preserved.");
  const nextPlans = existing ? replacePlan(plans, plan) : [plan, ...plans];
  let savedPlans = nextPlans;
  const activeId = getActiveWorkoutPlanId();
  if (nextPlans.some(item => item.id === activeId && item.status === "active")) writeWorkoutPlans(nextPlans);
  else savedPlans = persistActivePlan(nextPlans, id, now);
  const savedPlan = savedPlans.find(item => item.id === id)!;
  return { plan: savedPlan, plans: savedPlans, assignmentSummary: {
    addedAssignments,
    scheduledSessions: savedPlan.days.reduce((total, day) => total + day.assignments.length, 0),
    retainedDays: savedPlan.days.filter(day => day.assignments.length > 0 && !input.trainingDays.some(slot => slot.day === day.dayOfWeek)).map(day => ({ id: day.id, day: day.dayOfWeek || day.date, sessions: day.assignments.length })),
    trainingDaysWithWorkouts: savedPlan.days.filter(day => day.kind === "training" && day.assignments.length > 0).length,
    unfilledDays: savedPlan.days.filter(day => day.kind === "training" && !day.assignments.length).map(day => ({ id: day.id, day: day.dayOfWeek || day.date, focus: day.focus, reason: unfilledReasons.get(day.id) || "Suggested assignment was off. Choose a saved workout for this day in My Plan." })),
  } };
}

export function updatePlanAssignment(planId: string, dayId: string, assignmentId: string, updates: Partial<Pick<LocalPlanAssignment, "time" | "notes" | "setsPerExercise">>, targetDate?: string) {
  const plans = requireValidWorkoutPlans();
  const plan = plans.find(item => item.id === planId);
  const source = plan?.days.find(item => item.id === dayId);
  const assignment = source?.assignments.find(item => item.id === assignmentId);
  if (!plan || !source || !assignment) throw new Error("Workout assignment could not be found.");
  if (plan.status === "archived") throw new Error("Restore this week before editing workouts.");
  if (assignmentCompleted(assignmentId)) throw new Error("Completed workouts cannot be rescheduled or edited.");
  if (validatePlanningImport({ [planningKeys.plans]: plans })) throw new Error("Review the plan's saved dates and assignments before editing. The original weeks are preserved.");
  if (!updates || typeof updates !== "object" || Array.isArray(updates) || Object.keys(updates).some(key => !["time", "notes", "setsPerExercise"].includes(key))) throw new Error("Only workout time, notes, and sets can be edited. Assignment identity is preserved.");
  if (targetDate !== undefined && (typeof targetDate !== "string" || !validDateOnly(targetDate))) throw new Error("Choose a valid workout date.");
  const target = targetDate !== undefined ? plans.filter(item => item.status !== "archived").flatMap(item => item.days.map(day => ({ plan: item, day }))).find(item => item.day.date === targetDate) : { plan, day: source };
  if (!target) throw new Error("Create a plan week for the selected date first.");
  if (target.day.kind === "rest") throw new Error("Change the destination rest day to a training day first.");
  if (Object.hasOwn(updates, "setsPerExercise") && (typeof updates.setsPerExercise !== "number" || !Number.isInteger(updates.setsPerExercise) || updates.setsPerExercise < 1 || updates.setsPerExercise > 20)) throw new Error("Sets per exercise must be a whole number from 1 to 20.");
  if (Object.hasOwn(updates, "time") && (typeof updates.time !== "string" || updates.time !== "" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(updates.time))) throw new Error("Choose a valid workout time or clear it for date-only scheduling.");
  if (Object.hasOwn(updates, "notes") && typeof updates.notes !== "string") throw new Error("Workout notes must be text.");
  const next = { ...assignment, ...updates, updatedAt: new Date().toISOString() };
  const sameDay = target.plan.id === planId && target.day.id === dayId;
  const nextPlans = plans.map(item => ({ ...item, updatedAt: item.id === planId || item.id === target.plan.id ? next.updatedAt : item.updatedAt, days: item.days.map(day => {
    if (item.id === planId && day.id === dayId) return { ...day, assignments: sameDay ? day.assignments.map(a => a.id === assignmentId ? next : a) : day.assignments.filter(a => a.id !== assignmentId) };
    if (item.id === target.plan.id && day.id === target.day.id) return { ...day, assignments: [...day.assignments, next] };
    return day;
  }) }));
  if (validatePlanningImport({ [planningKeys.plans]: nextPlans })) throw new Error("Review the plan's saved dates and assignments before editing. The original weeks are preserved.");
  writeWorkoutPlans(nextPlans);
}

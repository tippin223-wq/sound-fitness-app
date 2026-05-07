import type { LocalWorkoutBuilderTemplate } from "@/lib/localData/workoutBuilderData";

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
  id: string;
  date: string;
  dayOfWeek: LocalPlanDayName;
  focus: string;
  notes: string;
  assignments: LocalPlanAssignment[];
};

export type LocalWeeklyPlan = {
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

const readLocalString = (key: string) => {
  if (!canUseLocalStorage()) return null;

  return window.localStorage.getItem(key);
};

const writeLocalString = (key: string, value: string) => {
  if (!canUseLocalStorage()) return;

  window.localStorage.setItem(key, value);
};

const removeLocalItem = (key: string) => {
  if (!canUseLocalStorage()) return;

  window.localStorage.removeItem(key);
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
  if (!value) return new Date();

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return new Date();

  return new Date(year, month - 1, day);
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

const replacePlan = (
  plans: LocalWeeklyPlan[],
  updatedPlan: LocalWeeklyPlan,
) =>
  plans.map((plan) => (plan.id === updatedPlan.id ? updatedPlan : plan));

export const readWorkoutPlans = () =>
  readLocalArray<LocalWeeklyPlan>(LOCAL_WORKOUT_PLAN_STORAGE_KEYS.plans);

export const writeWorkoutPlans = (plans: LocalWeeklyPlan[]) => {
  writeLocalArray(LOCAL_WORKOUT_PLAN_STORAGE_KEYS.plans, plans);
};

export const createWorkoutPlan = (input: CreateLocalWeeklyPlanInput = {}) => {
  const now = new Date().toISOString();
  const id = createLocalId("plan");
  const weekStartDate = getStartOfWeekDate(input.weekStartDate);
  const plan: LocalWeeklyPlan = {
    id,
    title: normalizeTitle(input.title),
    weekStartDate,
    goal: input.goal?.trim() || "",
    mode: input.mode || "custom",
    status: input.status || "draft",
    days: input.days || createDefaultPlanDays(id, weekStartDate),
    createdAt: now,
    updatedAt: now,
  };
  const plans = [plan, ...readWorkoutPlans()];

  writeWorkoutPlans(plans);

  return { plan, plans };
};

export const updateWorkoutPlan = (
  planId: string,
  updates: UpdateLocalWeeklyPlanInput,
) => {
  const plans = readWorkoutPlans();
  const existingPlan = plans.find((plan) => plan.id === planId);

  if (!existingPlan) return null;

  const updatedPlan: LocalWeeklyPlan = {
    ...existingPlan,
    ...updates,
    id: existingPlan.id,
    title:
      updates.title !== undefined
        ? normalizeTitle(updates.title)
        : existingPlan.title,
    goal: updates.goal !== undefined ? updates.goal.trim() : existingPlan.goal,
    createdAt: existingPlan.createdAt,
    updatedAt: new Date().toISOString(),
  };
  const updatedPlans = replacePlan(plans, updatedPlan);

  writeWorkoutPlans(updatedPlans);

  return { plan: updatedPlan, plans: updatedPlans };
};

export const deleteWorkoutPlan = (planId: string) => {
  const plans = readWorkoutPlans();
  const deletedPlan = plans.find((plan) => plan.id === planId) || null;
  const updatedPlans = plans.filter((plan) => plan.id !== planId);

  writeWorkoutPlans(updatedPlans);

  if (getActiveWorkoutPlanId() === planId) {
    clearActiveWorkoutPlan();
  }

  return { plan: deletedPlan, plans: updatedPlans };
};

export const getActiveWorkoutPlanId = () =>
  readLocalString(LOCAL_WORKOUT_PLAN_STORAGE_KEYS.activePlanId);

export const clearActiveWorkoutPlan = () => {
  removeLocalItem(LOCAL_WORKOUT_PLAN_STORAGE_KEYS.activePlanId);
};

export const setActiveWorkoutPlan = (planId: string) => {
  const plans = readWorkoutPlans();
  const now = new Date().toISOString();
  const activePlan = plans.find((plan) => plan.id === planId);

  if (!activePlan) return null;

  const updatedPlans = plans.map<LocalWeeklyPlan>((plan) => {
    if (plan.id === planId) {
      return { ...plan, status: "active", updatedAt: now };
    }

    if (plan.status === "active") {
      return { ...plan, status: "draft", updatedAt: now };
    }

    return plan;
  });

  writeWorkoutPlans(updatedPlans);
  writeLocalString(LOCAL_WORKOUT_PLAN_STORAGE_KEYS.activePlanId, planId);

  return {
    plan: updatedPlans.find((plan) => plan.id === planId) || activePlan,
    plans: updatedPlans,
  };
};

export const getActiveWorkoutPlan = () => {
  const activePlanId = getActiveWorkoutPlanId();

  if (!activePlanId) return null;

  return (
    readWorkoutPlans().find((plan) => plan.id === activePlanId) || null
  );
};

export const assignTemplateToPlanDay = ({
  planId,
  dayId,
  template,
  source = "saved-template",
  focus = "",
  notes = "",
}: AssignTemplateToPlanDayInput) => {
  const plans = readWorkoutPlans();
  const plan = plans.find((item) => item.id === planId);
  const day = plan?.days.find((item) => item.id === dayId);

  if (!plan || !day) return null;

  const now = new Date().toISOString();
  const existingAssignment = day.assignments.find(
    (assignment) => assignment.templateId === template.id,
  );
  const assignment: LocalPlanAssignment = {
    id: existingAssignment?.id || createLocalId("assignment"),
    templateId: template.id,
    templateTitle: template.title,
    templateExerciseCount: template.exercises.length,
    source,
    focus: focus.trim(),
    notes: notes.trim(),
    createdAt: existingAssignment?.createdAt || now,
    updatedAt: now,
  };
  const updatedDay: LocalPlanDay = {
    ...day,
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

  writeWorkoutPlans(updatedPlans);

  return { plan: updatedPlan, day: updatedDay, assignment, plans: updatedPlans };
};

export const removeAssignmentFromPlanDay = ({
  planId,
  dayId,
  assignmentId,
}: RemoveAssignmentFromPlanDayInput) => {
  const plans = readWorkoutPlans();
  const plan = plans.find((item) => item.id === planId);
  const day = plan?.days.find((item) => item.id === dayId);

  if (!plan || !day) return null;

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

  writeWorkoutPlans(updatedPlans);

  return { plan: updatedPlan, day: updatedDay, plans: updatedPlans };
};

export const duplicatePlanToNextWeek = (
  planId: string,
  input: Pick<CreateLocalWeeklyPlanInput, "title" | "status"> = {},
) => {
  const plans = readWorkoutPlans();
  const sourcePlan = plans.find((plan) => plan.id === planId);

  if (!sourcePlan) return null;

  const now = new Date().toISOString();
  const duplicatePlanId = createLocalId("plan");
  const weekStartDate = addDays(sourcePlan.weekStartDate, 7);
  const days = sourcePlan.days.map<LocalPlanDay>((day, index) => {
    const date = addDays(weekStartDate, index);

    return {
      ...day,
      id: createPlanDayId(duplicatePlanId, date),
      date,
      dayOfWeek: DAY_NAMES[index],
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
    status: input.status || "draft",
    days,
    createdAt: now,
    updatedAt: now,
  };
  const updatedPlans = [duplicatePlan, ...plans];

  writeWorkoutPlans(updatedPlans);

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

export const getActiveWorkoutSessionContext = () =>
  readLocalObject<LocalActiveWorkoutSessionContext>(
    LOCAL_WORKOUT_PLAN_STORAGE_KEYS.activeWorkoutSessionContext,
  );

export const clearActiveWorkoutSessionContext = () => {
  removeLocalItem(
    LOCAL_WORKOUT_PLAN_STORAGE_KEYS.activeWorkoutSessionContext,
  );
};

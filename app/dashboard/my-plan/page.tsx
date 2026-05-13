"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TrainingJourneyNavigator from "@/components/dashboard/TrainingJourneyNavigator";
import { loadWorkoutTemplatesWithFallback } from "@/lib/data/workoutPersistence";
import {
  writeActiveWorkoutBuilderSessionTemplate,
  type LocalWorkoutBuilderTemplate,
} from "@/lib/localData/workoutBuilderData";
import {
  createWorkoutPlan,
  duplicatePlanToNextWeek,
  getActiveWorkoutPlanId,
  readWorkoutPlans,
  setActiveWorkoutPlan,
  setActiveWorkoutSessionContext,
  type LocalPlanAssignment,
  type LocalPlanDay,
  type LocalWeeklyPlan,
} from "@/lib/localData/workoutPlanData";
import { ROUTES, workoutBuilderAddToPlan } from "@/lib/routes";

type PlanMessageTone = "success" | "warning" | "error";

type PlanMessage = {
  tone: PlanMessageTone;
  text: string;
};

type PlanProfileSnapshot = {
  activeGoal: string;
  goalMode: string;
  sessionsTarget: string;
  preferredSplit: string;
  recoveryWarnings: number;
  calendarItems: number;
};

const PLANNING_HORIZON_WEEKS = 4;

const safeJsonParse = (value: string | null): unknown => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const getString = (
  source: Record<string, unknown>,
  keys: string[],
  fallback: string,
) => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return fallback;
};

const readLocal = (key: string) =>
  typeof window === "undefined"
    ? null
    : safeJsonParse(window.localStorage.getItem(key));

const readPlanProfileSnapshot = (): PlanProfileSnapshot => {
  const profile = asRecord(readLocal("soundFitnessProfile"));
  const goals = asRecord(readLocal("soundFitnessGoals"));
  const calendar = readLocal("soundFitnessCalendar");
  const stats = readLocal("soundFitnessExerciseStats");
  const statEntries = Array.isArray(stats)
    ? stats
    : Object.values(asRecord(stats));
  const recoveryWarnings = statEntries.filter((entry) => {
    const record = asRecord(entry);
    const weeklySets = Number(record.weeklySets ?? record.sets ?? 0);
    const weeklyGoal = Number(record.weeklyGoal ?? record.goal ?? 12);
    return Number.isFinite(weeklySets) && weeklyGoal > 0 && weeklySets >= weeklyGoal;
  }).length;

  return {
    activeGoal: getString(goals, ["primaryGoal"], getString(profile, ["primaryGoal", "goalMode"], "General Health")),
    goalMode: getString(goals, ["goalMode"], getString(profile, ["goalMode"], "General Health")),
    sessionsTarget: getString(goals, ["targetWeeklySessions"], getString(profile, ["sessionsPerWeek"], "4")),
    preferredSplit: getString(profile, ["preferredSplit", "split"], "Custom weekly structure"),
    recoveryWarnings,
    calendarItems: Array.isArray(calendar) ? calendar.length : 0,
  };
};

const formatPlanDate = (value?: string) => {
  if (!value) return "Not scheduled";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const getShortDate = (value?: string) => {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
};

const getPlanModeLabel = (mode: LocalWeeklyPlan["mode"]) => {
  const labels: Record<LocalWeeklyPlan["mode"], string> = {
    coach: "Coach",
    custom: "Custom",
    hybrid: "Hybrid",
  };

  return labels[mode];
};

const getPlanStatusLabel = (plan: LocalWeeklyPlan, activePlanId: string | null) =>
  plan.id === activePlanId || plan.status === "active" ? "Active" : "Draft";

const getDayStatusLabel = (day: LocalPlanDay) => {
  if (day.assignments.length > 1) return `${day.assignments.length} workouts`;
  if (day.assignments.length === 1) return "Planned";

  return "Open";
};

const resolveAssignmentTemplate = (
  assignment: LocalPlanAssignment,
  templates: LocalWorkoutBuilderTemplate[],
) =>
  templates.find((template) => template.id === assignment.templateId) ||
  templates.find(
    (template) =>
      template.title.trim().toLowerCase() ===
      assignment.templateTitle.trim().toLowerCase(),
  ) ||
  null;

const getWeekRangeLabel = (plan: LocalWeeklyPlan) => {
  const firstDay = plan.days[0]?.date || plan.weekStartDate;
  const lastDay = plan.days[plan.days.length - 1]?.date || plan.weekStartDate;

  return `${getShortDate(firstDay)} - ${getShortDate(lastDay)}`;
};

const getDateOnlyTimestamp = (value: string) =>
  new Date(`${value}T00:00:00`).getTime();

const addDaysToDateOnly = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getPlanningHorizonEndDate = (plan: LocalWeeklyPlan) =>
  addDaysToDateOnly(plan.weekStartDate, (PLANNING_HORIZON_WEEKS - 1) * 7);

const getPlansInPlanningHorizon = (
  plans: LocalWeeklyPlan[],
  activePlan: LocalWeeklyPlan | null,
) => {
  if (!activePlan) return plans.slice(0, PLANNING_HORIZON_WEEKS);

  const horizonStart = getDateOnlyTimestamp(activePlan.weekStartDate);
  const horizonEnd = getDateOnlyTimestamp(getPlanningHorizonEndDate(activePlan));
  const plansInsideHorizon = plans
    .filter((plan) => {
      const weekStart = getDateOnlyTimestamp(plan.weekStartDate);
      return weekStart >= horizonStart && weekStart <= horizonEnd;
    })
    .sort(
      (a, b) =>
        getDateOnlyTimestamp(a.weekStartDate) -
        getDateOnlyTimestamp(b.weekStartDate),
    );

  return plansInsideHorizon.slice(0, PLANNING_HORIZON_WEEKS);
};

const canDuplicatePlanInsideHorizon = (
  plan: LocalWeeklyPlan,
  activePlan: LocalWeeklyPlan | null,
) => {
  if (!activePlan) return true;

  const nextWeekStart = addDaysToDateOnly(plan.weekStartDate, 7);
  const horizonEnd = getPlanningHorizonEndDate(activePlan);

  return (
    getDateOnlyTimestamp(nextWeekStart) <= getDateOnlyTimestamp(horizonEnd)
  );
};

const messageToneClass: Record<PlanMessageTone, string> = {
  success: "border-emerald-300/20 bg-emerald-400/10 text-emerald-200",
  warning: "border-amber-300/20 bg-amber-300/10 text-amber-100",
  error: "border-rose-300/20 bg-rose-400/10 text-rose-100",
};

const volumeTargets = [
  { muscle: "Chest", target: 14, completed: 9 },
  { muscle: "Back", target: 16, completed: 7 },
  { muscle: "Legs", target: 18, completed: 10 },
  { muscle: "Core", target: 12, completed: 6 },
  { muscle: "Glutes", target: 14, completed: 5 },
  { muscle: "Shoulders", target: 10, completed: 6 },
] as const;

const planBuilderSections = [
  {
    title: "Plan Identity",
    accent: "text-cyan-300",
    items: ["Plan name", "Plan mode", "Goal", "Week start"],
  },
  {
    title: "Weekly Structure",
    accent: "text-emerald-300",
    items: ["Training days", "Assigned templates", "Day focus", "Notes"],
  },
  {
    title: "Training Focus",
    accent: "text-amber-300",
    items: ["Primary focus", "Secondary focus", "Priority muscles", "Balance"],
  },
  {
    title: "Execution",
    accent: "text-sky-300",
    items: ["Start from day", "Session context", "Workout logger", "Stats"],
  },
  {
    title: "Guidance Rules",
    accent: "text-rose-300",
    items: ["Effort rules", "Soreness rules", "Missed sessions", "Guardrails"],
  },
  {
    title: "Recovery / Progression",
    accent: "text-fuchsia-300",
    items: ["Readiness", "Deload rules", "Add reps", "Add weight"],
  },
] as const;

const createTemplateAvailabilityLabel = (
  templates: LocalWorkoutBuilderTemplate[],
  loaded: boolean,
) => {
  if (!loaded) return "Loading saved templates";
  if (templates.length === 0) return "No saved templates available";

  return `${templates.length} saved template${
    templates.length === 1 ? "" : "s"
  } available`;
};

export default function MyPlanPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<LocalWeeklyPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [expandedPlanIds, setExpandedPlanIds] = useState<string[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<
    LocalWorkoutBuilderTemplate[]
  >([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [planMessage, setPlanMessage] = useState<PlanMessage | null>(null);
  const [planProfile, setPlanProfile] = useState<PlanProfileSnapshot>(() =>
    readPlanProfileSnapshot(),
  );

  function refreshPlans(options: { expandPlanId?: string } = {}) {
    const storedPlans = readWorkoutPlans();
    const storedActivePlanId = getActiveWorkoutPlanId();
    const activeIdIsValid = storedPlans.some(
      (plan) => plan.id === storedActivePlanId,
    );
    const fallbackActivePlan =
      storedPlans.find((plan) => plan.status === "active") || storedPlans[0];
    const nextActivePlanId = activeIdIsValid
      ? storedActivePlanId
      : fallbackActivePlan?.id || null;
    const idsToExpand = [
      options.expandPlanId,
      nextActivePlanId,
      ...expandedPlanIds.filter((id) =>
        storedPlans.some((plan) => plan.id === id),
      ),
    ].filter(Boolean) as string[];

    setPlans(storedPlans);
    setActivePlanId(nextActivePlanId);
    setExpandedPlanIds(Array.from(new Set(idsToExpand)));
  }

  useEffect(() => {
    let isActive = true;

    refreshPlans();
    setPlanProfile(readPlanProfileSnapshot());

    const loadTemplates = async () => {
      const result = await loadWorkoutTemplatesWithFallback();

      if (!isActive) return;

      setSavedTemplates(result.data);
      setTemplatesLoaded(true);
    };

    loadTemplates();

    return () => {
      isActive = false;
    };
  }, []);

  const activePlan = useMemo(
    () =>
      plans.find((plan) => plan.id === activePlanId) ||
      plans.find((plan) => plan.status === "active") ||
      plans[0] ||
      null,
    [activePlanId, plans],
  );

  const orderedPlans = useMemo(() => {
    return [...plans].sort((a, b) => {
      if (a.id === activePlan?.id) return -1;
      if (b.id === activePlan?.id) return 1;

      return (
        new Date(b.weekStartDate).getTime() -
        new Date(a.weekStartDate).getTime()
      );
    });
  }, [activePlan?.id, plans]);

  const visiblePlans = useMemo(
    () => getPlansInPlanningHorizon(orderedPlans, activePlan),
    [activePlan, orderedPlans],
  );

  const hiddenPlanCount = Math.max(orderedPlans.length - visiblePlans.length, 0);
  const canCreateAnotherWeek =
    !activePlan || visiblePlans.length < PLANNING_HORIZON_WEEKS;

  const planSummary = useMemo(() => {
    if (!activePlan) {
      return {
        trainingDays: 0,
        plannedDays: 0,
        assignments: 0,
        exercises: 0,
      };
    }

    const plannedDays = activePlan.days.filter(
      (day) => day.assignments.length > 0,
    );
    const assignments = activePlan.days.flatMap((day) => day.assignments);

    return {
      trainingDays: activePlan.days.length,
      plannedDays: plannedDays.length,
      assignments: assignments.length,
      exercises: assignments.reduce(
        (sum, assignment) => sum + assignment.templateExerciseCount,
        0,
      ),
    };
  }, [activePlan]);

  const templateAvailabilityLabel = createTemplateAvailabilityLabel(
    savedTemplates,
    templatesLoaded,
  );

  function createLocalPlan() {
    if (activePlan && !canCreateAnotherWeek) {
      setPlanMessage({
        tone: "warning",
        text: "My Plan is limited to a 4-week horizon. Duplicate or edit within the visible 4 weeks.",
      });
      return;
    }

    if (activePlan && visiblePlans.length > 0) {
      const latestVisiblePlan = [...visiblePlans].sort(
        (a, b) =>
          getDateOnlyTimestamp(b.weekStartDate) -
          getDateOnlyTimestamp(a.weekStartDate),
      )[0];

      if (latestVisiblePlan) {
        duplicatePlan(latestVisiblePlan);
        return;
      }
    }

    const result = createWorkoutPlan({
      title: "This Week's Workout Plan",
      goal: "Build consistency",
      mode: "custom",
      status: "active",
    });

    setActiveWorkoutPlan(result.plan.id);
    refreshPlans({ expandPlanId: result.plan.id });
    setPlanMessage({
      tone: "success",
      text: `${result.plan.title} created.`,
    });
  }

  function makePlanActive(planId: string) {
    const result = setActiveWorkoutPlan(planId);

    if (!result) {
      setPlanMessage({
        tone: "error",
        text: "That plan could not be found.",
      });
      return;
    }

    refreshPlans({ expandPlanId: planId });
    setPlanMessage({
      tone: "success",
      text: `${result.plan.title} is now active.`,
    });
  }

  function duplicatePlan(plan: LocalWeeklyPlan) {
    if (!canDuplicatePlanInsideHorizon(plan, activePlan)) {
      setPlanMessage({
        tone: "warning",
        text: "That duplicate would go beyond the 4-week planning horizon.",
      });
      return;
    }

    const nextWeekStart = addDaysToDateOnly(plan.weekStartDate, 7);
    const nextWeekAlreadyExists = plans.some(
      (existingPlan) => existingPlan.weekStartDate === nextWeekStart,
    );

    if (nextWeekAlreadyExists) {
      setPlanMessage({
        tone: "warning",
        text: "The next week already exists. Expand that week or duplicate the latest visible week.",
      });
      return;
    }

    const result = duplicatePlanToNextWeek(plan.id);

    if (!result) {
      setPlanMessage({
        tone: "error",
        text: "This week could not be duplicated.",
      });
      return;
    }

    refreshPlans({ expandPlanId: result.plan.id });
    setPlanMessage({
      tone: "success",
      text: `${result.plan.title} was created for the next week.`,
    });
  }

  function toggleWeek(planId: string) {
    setExpandedPlanIds((current) =>
      current.includes(planId)
        ? current.filter((id) => id !== planId)
        : [...current, planId],
    );
  }

  function startPlanAssignment(
    plan: LocalWeeklyPlan,
    day: LocalPlanDay,
    assignment: LocalPlanAssignment,
  ) {
    const template = resolveAssignmentTemplate(assignment, savedTemplates);

    if (!template || template.exercises.length === 0) {
      setPlanMessage({
        tone: "warning",
        text: `${assignment.templateTitle} is assigned, but the saved template exercises are not available yet.`,
      });
      return;
    }

    setActiveWorkoutSessionContext({
      source: "plan",
      planId: plan.id,
      planTitle: plan.title,
      planDayId: day.id,
      planDayDate: day.date,
      assignmentId: assignment.id,
      templateId: template.id,
      templateTitle: template.title,
    });
    writeActiveWorkoutBuilderSessionTemplate(template);
    router.push(
      `${ROUTES.dashboard.sessionWorkout}?template=${encodeURIComponent(
        template.id,
      )}`,
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <TrainingJourneyNavigator currentStep="my-plan" variant="full" />

        <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_18%_8%,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_90%_20%,rgba(16,185,129,0.14),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-5 shadow-2xl sm:rounded-[40px] sm:p-6 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-300">
                My Plan
              </p>
              <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">
                🗂 My Plan
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Turn workouts into a realistic weekly training structure.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
              <button
                type="button"
                onClick={createLocalPlan}
                className="min-h-[48px] rounded-2xl bg-emerald-400 px-5 py-4 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_0_28px_rgba(52,211,153,0.25)] transition hover:bg-emerald-300"
              >
                {activePlan
                  ? canCreateAnotherWeek
                    ? "Add Week"
                    : "4 Week Limit"
                  : "Create Plan"}
              </button>
              <Link
                href={ROUTES.workoutBuilder.home}
                className="min-h-[48px] rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-5 py-4 text-center text-xs font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950"
              >
                Build Template
              </Link>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {[
              ["Active Goal", planProfile.activeGoal],
              ["Weekly Target", `${planProfile.sessionsTarget} sessions`],
              ["Current Split", planProfile.preferredSplit],
              ["Assigned", `${planSummary.assignments} workouts`],
              ["Recovery Balance", planProfile.recoveryWarnings > 0 ? `${planProfile.recoveryWarnings} warnings` : "Balanced"],
              ["Next Planned", activePlan?.days.find((day) => day.assignments.length > 0)?.dayOfWeek || "Open"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-slate-950/50 p-3"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  {label}
                </p>
                <p className="mt-2 truncate text-sm font-black text-white">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {planMessage ? (
          <p
            className={`rounded-2xl border px-4 py-3 text-sm font-bold ${messageToneClass[planMessage.tone]}`}
          >
            {planMessage.text}
          </p>
        ) : null}

        {!activePlan ? (
          <section className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-center">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-300">
                  Empty Plan State
                </p>
                <h2 className="mt-3 text-3xl font-black">
                  No weekly plan yet.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Create a local week first. Then assign saved templates from
                  the workout builder to each training day.
                </p>
              </div>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={createLocalPlan}
                  className="min-h-[48px] w-full rounded-2xl bg-cyan-400 px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.25)] transition hover:bg-cyan-300"
                >
                  Create Local Week
                </button>
                <Link
                  href={ROUTES.dashboard.createMyPlan}
                  className="block min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-black uppercase tracking-[0.14em] text-white transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
                >
                  Open Advanced Builder
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="rounded-[36px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl sm:p-6">
              <div className="grid gap-6 xl:grid-cols-[1fr_360px] xl:items-start">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-300">
                    Active Plan View
                  </p>
                  <h2 className="mt-3 text-3xl font-black">
                    {activePlan.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    {getWeekRangeLabel(activePlan)} -{" "}
                    {getPlanModeLabel(activePlan.mode)} plan -{" "}
                    {getPlanStatusLabel(activePlan, activePlanId)}
                  </p>
                  <div className="mt-6 rounded-[28px] border border-cyan-300/15 bg-cyan-400/10 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
                      Goal
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-200">
                      {activePlan.goal || "Build consistency across the week."}
                    </p>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-slate-950/55 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">
                    Week Summary
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      ["Training Days", String(planSummary.trainingDays)],
                      ["Planned Days", String(planSummary.plannedDays)],
                      ["Assignments", String(planSummary.assignments)],
                      ["Exercises", String(planSummary.exercises)],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"
                      >
                        <p className="text-xs text-slate-400">{label}</p>
                        <p className="mt-1 text-2xl font-black text-white">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr_330px]">
              <div className="space-y-4">
                <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl sm:p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.26em] text-emerald-300">
                        Weekly Layout
                      </p>
                      <h2 className="mt-2 text-2xl font-black">
                        4-week timeline
                      </h2>
                    </div>
                    <p className="text-sm font-bold text-slate-400">
                      {templateAvailabilityLabel}
                    </p>
                  </div>
                  {hiddenPlanCount > 0 ? (
                    <p className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100">
                      Showing the active 4-week planning horizon.{" "}
                      {hiddenPlanCount} older or out-of-range week
                      {hiddenPlanCount === 1 ? "" : "s"} hidden.
                    </p>
                  ) : null}
                </div>

                {visiblePlans.map((plan) => {
                  const isExpanded = expandedPlanIds.includes(plan.id);
                  const isActive = plan.id === activePlan.id;
                  const planAssignments = plan.days.flatMap(
                    (day) => day.assignments,
                  );
                  const plannedDayCount = plan.days.filter(
                    (day) => day.assignments.length > 0,
                  ).length;

                  return (
                    <section
                      key={plan.id}
                      className={`overflow-hidden rounded-[34px] border shadow-2xl ${
                        isActive
                          ? "border-cyan-300/30 bg-cyan-400/10"
                          : "border-white/10 bg-white/[0.04]"
                      }`}
                    >
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() => toggleWeek(plan.id)}
                        className="flex w-full flex-col gap-4 p-5 text-left transition hover:bg-white/[0.035] sm:p-6 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">
                              {getPlanStatusLabel(plan, activePlanId)}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">
                              {getPlanModeLabel(plan.mode)}
                            </span>
                          </div>
                          <h3 className="mt-3 text-2xl font-black text-white">
                            {plan.title}
                          </h3>
                          <p className="mt-1 text-sm text-slate-400">
                            {getWeekRangeLabel(plan)} - {plannedDayCount} of{" "}
                            {plan.days.length} days planned
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-300">
                            {planAssignments.length} assignment
                            {planAssignments.length === 1 ? "" : "s"}
                          </span>
                          <span className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-300">
                            {isExpanded ? "Collapse" : "Expand"}
                          </span>
                        </div>
                      </button>

                      {isExpanded ? (
                        <div className="border-t border-white/10 p-4 sm:p-5 lg:p-6">
                          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="max-w-2xl">
                              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                                Week Focus
                              </p>
                              <p className="mt-2 text-sm leading-6 text-slate-300">
                                {plan.goal ||
                                  "Use this week to create consistency and clean execution."}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {plan.id !== activePlan.id ? (
                                <button
                                  type="button"
                                  onClick={() => makePlanActive(plan.id)}
                                  className="min-h-[44px] rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950"
                                >
                                  Set Active
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => duplicatePlan(plan)}
                                className="min-h-[44px] rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-emerald-100 transition hover:bg-emerald-300 hover:text-slate-950"
                              >
                                Duplicate Week
                              </button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {plan.days.map((day, index) => (
                              <section
                                key={day.id}
                                className="grid gap-4 rounded-[24px] border border-white/10 bg-slate-950/50 p-4 lg:grid-cols-[150px_1fr_190px] lg:items-center"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-400/10 text-sm font-black text-cyan-100">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-300">
                                      {day.dayOfWeek}
                                    </p>
                                    <p className="mt-1 text-sm font-bold text-white">
                                      {getShortDate(day.date)}
                                    </p>
                                  </div>
                                </div>

                                <div className="min-w-0 border-l border-white/10 pl-4">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                                        day.assignments.length > 0
                                          ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
                                          : "border-white/10 bg-white/[0.04] text-slate-400"
                                      }`}
                                    >
                                      {getDayStatusLabel(day)}
                                    </span>
                                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">
                                      {day.focus || "Focus open"}
                                    </span>
                                  </div>

                                  <div className="mt-3 space-y-2">
                                    {day.assignments.length > 0 ? (
                                      day.assignments.map((assignment) => {
                                        const template =
                                          resolveAssignmentTemplate(
                                            assignment,
                                            savedTemplates,
                                          );

                                        return (
                                          <div
                                            key={assignment.id}
                                            className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"
                                          >
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                              <div>
                                                <h4 className="font-black text-white">
                                                  {assignment.templateTitle}
                                                </h4>
                                                <p className="mt-1 text-sm text-slate-400">
                                                  {
                                                    assignment.templateExerciseCount
                                                  }{" "}
                                                  planned exercises
                                                </p>
                                              </div>
                                              <span className="rounded-full border border-white/10 bg-slate-950/45 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">
                                                {template
                                                  ? "Ready"
                                                  : "Needs template"}
                                              </span>
                                            </div>
                                            {assignment.focus ||
                                            assignment.notes ? (
                                              <p className="mt-2 text-sm leading-6 text-slate-300">
                                                {assignment.focus ||
                                                  "Template assignment"}
                                                {assignment.notes
                                                  ? ` - ${assignment.notes}`
                                                  : ""}
                                              </p>
                                            ) : null}
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.025] p-3 text-sm leading-6 text-slate-400">
                                        No workout assigned yet. Open the
                                        builder to attach a saved template to
                                        this day.
                                      </div>
                                    )}
                                  </div>

                                  {day.notes ? (
                                    <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm leading-6 text-slate-300">
                                      {day.notes}
                                    </p>
                                  ) : null}
                                </div>

                                <div className="flex flex-col gap-2">
                                  {day.assignments.length > 0 ? (
                                    day.assignments.map((assignment) => {
                                      const template = resolveAssignmentTemplate(
                                        assignment,
                                        savedTemplates,
                                      );

                                      return (
                                        <button
                                          key={assignment.id}
                                          type="button"
                                          onClick={() =>
                                            startPlanAssignment(
                                              plan,
                                              day,
                                              assignment,
                                            )
                                          }
                                          disabled={!template}
                                          className="min-h-[44px] rounded-2xl bg-cyan-400 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-45"
                                        >
                                          {template
                                            ? "Start Workout"
                                            : "Template Missing"}
                                        </button>
                                      );
                                    })
                                  ) : (
                                    <Link
                                      href={workoutBuilderAddToPlan(
                                        plan.id,
                                        day.id,
                                      )}
                                      className="min-h-[44px] rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950"
                                    >
                                      Assign in Builder
                                    </Link>
                                  )}
                                </div>
                              </section>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </div>

              <aside className="space-y-5">
                <section className="rounded-[30px] border border-white/10 bg-slate-950/60 p-5 shadow-2xl">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">
                    Active Plan
                  </p>
                  <h3 className="mt-3 text-xl font-black text-white">
                    {activePlan.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {getWeekRangeLabel(activePlan)}
                  </p>
                  <div className="mt-4 space-y-3">
                    {visiblePlans.map((plan) => {
                      const isSelected = plan.id === activePlan.id;

                      return (
                        <div
                          key={plan.id}
                          className={`rounded-2xl border p-4 ${
                            isSelected
                              ? "border-cyan-300/30 bg-cyan-400/10"
                              : "border-white/10 bg-white/[0.035]"
                          }`}
                        >
                          <p className="font-black text-white">{plan.title}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {getWeekRangeLabel(plan)} -{" "}
                            {getPlanStatusLabel(plan, activePlanId)}
                          </p>
                          {!isSelected && visiblePlans.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => makePlanActive(plan.id)}
                              className="mt-3 min-h-[40px] rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950"
                            >
                              Set Active
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-[30px] border border-emerald-300/20 bg-emerald-400/10 p-5 shadow-2xl">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">
                    Build / Create Plan
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-200">
                    Create reusable templates in the builder, then assign them
                    to timeline days. This keeps planning separate from workout
                    logging.
                  </p>
                  <div className="mt-4 grid gap-3">
                    <Link
                      href={ROUTES.workoutBuilder.home}
                      className="min-h-[44px] rounded-2xl bg-emerald-400 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-emerald-300"
                    >
                      Open Builder
                    </Link>
                    <Link
                      href={ROUTES.dashboard.calendar}
                      className="min-h-[44px] rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950"
                    >
                      Open Calendar
                    </Link>
                    <Link
                      href={ROUTES.dashboard.phases}
                      className="min-h-[44px] rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-amber-100 transition hover:bg-amber-300 hover:text-slate-950"
                    >
                      Open Periodized Plan
                    </Link>
                    <Link
                      href={ROUTES.dashboard.createMyPlan}
                      className="min-h-[44px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-white transition hover:border-emerald-300/40 hover:bg-emerald-400/10"
                    >
                      Advanced Builder
                    </Link>
                  </div>
                </section>
              </aside>
            </section>
          </>
        )}

        <section className="grid gap-6 lg:grid-cols-[1fr_0.82fr]">
          <section className="rounded-[32px] border border-white/10 bg-slate-950/60 p-6 shadow-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300">
              Volume Targets
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Placeholder targets remain visible until plan assignments and
              completed sessions are joined into a real weekly volume model.
            </p>

            <div className="mt-5 space-y-4">
              {volumeTargets.map((item) => {
                const percent = Math.round(
                  (item.completed / item.target) * 100,
                );

                return (
                  <div key={item.muscle}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="font-bold text-slate-200">
                        {item.muscle}
                      </span>
                      <span className="text-slate-400">
                        {item.completed}/{item.target} sets
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-300"
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-slate-950/60 p-6 shadow-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-rose-300">
              Guidance Rules
            </p>
            <div className="mt-5 space-y-3">
              {[
                "Use the session logger as the only workout completion path.",
                "If soreness is high, reduce volume or swap to recovery work.",
                "Missed days should move forward instead of stacking fatigue.",
              ].map((point) => (
                <div
                  key={point}
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-slate-300"
                >
                  {point}
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="rounded-[36px] border border-emerald-300/20 bg-[radial-gradient(circle_at_20%_0%,rgba(52,211,153,0.18),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.98))] p-6 shadow-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-300">
                Build Your Training Plan
              </p>
              <h2 className="mt-3 text-3xl font-black text-white">
                Planning systems preserved
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                The weekly timeline now drives execution. These planning
                concepts stay visible as the next layer for coaching,
                progression, and recovery logic.
              </p>
            </div>

            <Link
              href={ROUTES.dashboard.createMyPlan}
              className="w-fit rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(52,211,153,0.25)] transition hover:bg-emerald-300"
            >
              Advanced Builder
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {planBuilderSections.map((section) => (
              <div
                key={section.title}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
              >
                <h3
                  className={`text-sm font-black uppercase tracking-[0.14em] ${section.accent}`}
                >
                  {section.title}
                </h3>
                <div className="mt-3 space-y-2">
                  {section.items.map((item) => (
                    <div key={item} className="text-sm text-slate-400">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

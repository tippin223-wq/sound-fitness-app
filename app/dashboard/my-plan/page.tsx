"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import PlanRecommendationCard from "@/components/dashboard/PlanRecommendationCard";
import PlanLogicControls from "@/components/dashboard/PlanLogicControls";
import WorkoutHistoryReviewNotice from "@/components/dashboard/WorkoutHistoryReviewNotice";
import { captureWorkoutHistoryRecovery } from "@/lib/planning/workoutHistoryRecovery";
import { requireSavedGoals } from "@/lib/planning/goals";
import { planningOwner, planningSnapshot, subscribePlanning } from "@/lib/planning/store";
import { captureWorkoutLaunchEditor, reviewWorkoutLaunchEditor } from "@/lib/planning/workoutLaunchEditor";
import { planDraftPresent } from "@/lib/planning/planEditorDraft";
import { planAssignmentStatus } from "@/lib/planning/planCompletionEvidence";
import { assignmentCompleted } from "@/lib/planning/logs";
import { plannedExerciseCount, plannedWeekSummary } from "@/lib/planning/plannedWorkload";
import { readPlanProfileSnapshot, type PlanProfileSnapshot } from "@/lib/planning/planProfileSummary";
import TrainingJourneyNavigator from "@/components/dashboard/TrainingJourneyNavigator";
import { loadWorkoutTemplatesWithFallback } from "@/lib/data/workoutPersistence";
import {
  readWorkoutBuilderTemplates,
  type LocalWorkoutBuilderTemplate,
} from "@/lib/localData/workoutBuilderData";
import {
  createWorkoutPlan,
  duplicatePlanToNextWeek,
  getActiveWorkoutPlanId,
  resolveActiveWorkoutPlan,
  workoutPlanStatusLabel,
  inspectWorkoutPlans,
  setActiveWorkoutPlan,
  startDisplayedPlanWorkout,
  assignmentTemplateIssue,
  planWorkoutTemplateChoices,
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

const PLANNING_HORIZON_WEEKS = 4;

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

const getPlanStatusLabel = workoutPlanStatusLabel;

const getDayStatusLabel = (day: LocalPlanDay) => {
  if (day.kind === "rest") return "Rest";
  if (day.assignments.length > 1) return `${day.assignments.length} workouts`;
  if (day.assignments.length === 1) return "Planned";

  return "Open";
};

const resolveAssignmentTemplate = (
  assignment: LocalPlanAssignment,
  templates: LocalWorkoutBuilderTemplate[],
) =>
  planWorkoutTemplateChoices(templates).find((template) => template.id === assignment.templateId) || null;

const getWeekRangeLabel = (plan: LocalWeeklyPlan) => {
  const firstDay = plan.weekStartDate;
  const lastDay = addDaysToDateOnly(firstDay, 6);

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
  const today = new Date(); today.setDate(today.getDate() - (today.getDay()+6)%7); today.setHours(0,0,0,0);
  const horizonStart = today.getTime();
  const horizonEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate()+21).getTime();
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
  useSyncExternalStore(subscribePlanning, planningSnapshot, planningSnapshot);
  const planRecovery = inspectWorkoutPlans();
  const launchAccount = planningOwner();
  const [launchEditor, setLaunchEditor] = useState(captureWorkoutLaunchEditor);
  const [launchNeedsReview, setLaunchNeedsReview] = useState(false);
  const router = useRouter();
  const [showHistory, setShowHistory] = useState(false);
  const [plans, setPlans] = useState<LocalWeeklyPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [expandedPlanIds, setExpandedPlanIds] = useState<string[]>([]);
  const savedTemplates = readWorkoutBuilderTemplates();
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [planMessage, setPlanMessage] = useState<PlanMessage | null>(null);
  const [planProfile, setPlanProfile] = useState<PlanProfileSnapshot>(() =>
    readPlanProfileSnapshot(),
  );

  const refreshPlans = useCallback((options: { expandPlanId?: string } = {}) => {
    const inspected = inspectWorkoutPlans();
    if (inspected.issue) return;
    const storedPlans = inspected.plans;
    const storedActivePlanId = getActiveWorkoutPlanId();
    const nextActivePlanId = resolveActiveWorkoutPlan(storedPlans, storedActivePlanId)?.id || null;
    const idsToExpand = [
      options.expandPlanId,
      nextActivePlanId,
    ].filter(Boolean) as string[];

    setPlans(storedPlans);
    setActivePlanId(nextActivePlanId);
    setExpandedPlanIds(current => Array.from(new Set([...idsToExpand, ...current.filter(id => storedPlans.some(plan => plan.id === id))])));
  }, []);

  useEffect(() => {
    let isActive = true;

    refreshPlans();
    setPlanProfile(readPlanProfileSnapshot());

    const loadTemplates = async () => {
      try {
        await loadWorkoutTemplatesWithFallback();
      } catch (cause) {
        if (isActive) setPlanMessage({ tone: "error", text: cause instanceof Error ? cause.message : "Workout library could not be refreshed. Review account sync before starting." });
      } finally {
        if (isActive) setTemplatesLoaded(true);
      }
    };

    loadTemplates();
    const unsubscribe = subscribePlanning(() => { refreshPlans(); setPlanProfile(readPlanProfileSnapshot()); });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [refreshPlans]);

  const canonicalActivePlan = resolveActiveWorkoutPlan(plans, activePlanId);
  const activePlan = useMemo(
    () =>
      resolveActiveWorkoutPlan(plans, activePlanId) ||
      plans.find(plan => plan.status !== "archived") || plans[0] ||
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
    () => showHistory ? orderedPlans : getPlansInPlanningHorizon(orderedPlans.filter(plan => plan.status !== "archived"), activePlan),
    [activePlan, orderedPlans, showHistory],
  );

  const hiddenPlanCount = Math.max(orderedPlans.length - visiblePlans.length, 0);
  const canCreateAnotherWeek =
    !activePlan || getPlansInPlanningHorizon(orderedPlans.filter(plan => plan.status !== "archived"), activePlan).length < PLANNING_HORIZON_WEEKS;

  const planSummary = useMemo(() => {
    if (!activePlan) {
      return {
        trainingDays: 0,
        plannedDays: 0,
        assignments: 0,
        exercises: 0,
      };
    }

    return plannedWeekSummary(activePlan.days);
  }, [activePlan]);

  const templateAvailabilityLabel = createTemplateAvailabilityLabel(
    savedTemplates,
    templatesLoaded,
  );
  const historyRecovery = captureWorkoutHistoryRecovery();

  function createLocalPlan() {
    if (activePlan && !canCreateAnotherWeek) {
      setPlanMessage({
        tone: "warning",
        text: "My Plan is limited to a 4-week horizon. Duplicate or edit within the visible 4 weeks.",
      });
      return;
    }

    if (activePlan && visiblePlans.length > 0) {
      const latestVisiblePlan = [...getPlansInPlanningHorizon(plans.filter(item => item.status !== "archived"), activePlan)].sort(
        (a, b) =>
          getDateOnlyTimestamp(b.weekStartDate) -
          getDateOnlyTimestamp(a.weekStartDate),
      )[0];

      if (latestVisiblePlan) {
        duplicatePlan(latestVisiblePlan);
        return;
      }
    }

    let goals;
    try { goals = requireSavedGoals(); }
    catch { router.push(ROUTES.dashboard.goals); return; }
    let result;
    try { result = createWorkoutPlan({
      title: "This Week's Workout Plan",
      goal: goals.primaryGoal,
      mode: "custom",
      status: "active",
    }); } catch (cause) { setPlanMessage({ tone: "error", text: cause instanceof Error ? cause.message : "Plan could not be created." }); return; }

    refreshPlans({ expandPlanId: result.plan.id });
    setPlanMessage({
      tone: "success",
      text: `${result.plan.title} created.`,
    });
  }

  function makePlanActive(planId: string) {
    let result;
    try { result = setActiveWorkoutPlan(planId); } catch (cause) { setPlanMessage({ tone: "error", text: cause instanceof Error ? cause.message : "Plan could not be activated." }); return; }

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

    let result;
    try { result = duplicatePlanToNextWeek(plan.id); } catch (cause) { setPlanMessage({ tone: "error", text: cause instanceof Error ? cause.message : "Week could not be duplicated." }); return; }

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

    try { startDisplayedPlanWorkout(plan, day.id, assignment.id, template, launchAccount, launchEditor); }
    catch (cause) {
      setLaunchNeedsReview(true);
      setPlanMessage({ tone: "error", text: cause instanceof Error ? cause.message : "The workout could not be started. Try again." });
      return;
    }
    router.push(
      `${ROUTES.dashboard.sessionWorkout}?template=${encodeURIComponent(
        template.id,
      )}`,
    );
  }

  function reviewLaunchControls() {
    try {
      const reviewed = reviewWorkoutLaunchEditor(launchEditor);
      setLaunchEditor(reviewed.editor); setLaunchNeedsReview(false);
      setPlanMessage({ tone: "warning", text: `Current workout: ${reviewed.title}. Controls reviewed. Choose a workout when ready; existing drafts are preserved.` });
    } catch (cause) { setPlanMessage({ tone: "error", text: cause instanceof Error ? cause.message : "Workout controls could not be reviewed." }); }
  }

  if (planRecovery.issue) return <main className="mx-auto max-w-3xl space-y-4 p-6 text-slate-100">
    <h1 className="text-2xl font-bold">Review saved plan weeks</h1>
    <p role="alert" className="text-amber-200">{planRecovery.issue}</p>
    <p>Plan reporting and editing are paused. Your original plan weeks and workout assignments remain saved.</p>
    <Link href="/dashboard/calendar" className="block text-cyan-200">Review and export original plans in Calendar</Link>
  </main>;

  if (historyRecovery.issues.length) return <WorkoutHistoryReviewNotice area="Plan completion reporting and workout controls" issues={historyRecovery.issues} />;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <TrainingJourneyNavigator currentStep="my-plan" variant="full" />
        <PlanRecommendationCard />
        {planDraftPresent() && <aside aria-label="Saved plan draft" className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
          <p>You have a saved plan editor draft. Open the editor to restore, export, or discard it.</p>
          <Link href={ROUTES.dashboard.createMyPlan} className="mt-2 inline-block font-bold underline">Review saved draft</Link>
        </aside>}

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
              ["Saved Goal", planProfile.activeGoal],
              ["Weekly Target", planProfile.sessionsTarget],
              ["Preferred Split", planProfile.preferredSplit],
              ["Assigned", `${planSummary.assignments} workouts`],
              ["Reported Readiness", planProfile.recoveryWarnings],
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
            role={planMessage.tone === "error" ? "alert" : "status"}
            className={`rounded-2xl border px-4 py-3 text-sm font-bold ${messageToneClass[planMessage.tone]}`}
          >
            {planMessage.text}
          </p>
        ) : null}

        {launchNeedsReview ? <div className="flex flex-wrap gap-4 text-sm text-cyan-200">
          <Link href={ROUTES.dashboard.sessionWorkout} target="_blank" rel="noreferrer">Open current workout</Link>
          <button type="button" onClick={reviewLaunchControls} className="underline">Review current workout controls</button>
        </div> : null}
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
                  Save your goals, create a week, then assign saved workouts from
                  the workout builder to each training day.
                </p>
              </div>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={createLocalPlan}
                  className="min-h-[48px] w-full rounded-2xl bg-cyan-400 px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.25)] transition hover:bg-cyan-300"
                >
                  Create Week
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
                    Selected Week
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
                      ["Exercises", planSummary.exercises === null ? "Needs review" : String(planSummary.exercises)],
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

                <button type="button" className="mb-3 text-cyan-200" onClick={() => setShowHistory(value => !value)}>{showHistory ? "Show planning horizon" : "Show all weeks & archived history"}</button>
                {visiblePlans.map((plan) => {
                  const isExpanded = expandedPlanIds.includes(plan.id);
                  const isActive = plan.id === activePlanId && plan.status === "active";
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
                          {typeof plan.settings?.createdBy === "string" && plan.settings.createdBy && <p className="mt-1 text-xs text-slate-400">Created by {plan.settings.createdBy}</p>}
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
                          <PlanLogicControls plan={plan} templates={savedTemplates} />
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
                              {!isActive && plan.status !== "archived" ? (
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

                                  {day.title && <p className="mt-2 text-sm font-bold text-white">{day.title}</p>}
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
                                                    plannedExerciseCount([assignment]) ?? "Unknown"
                                                  }{" "}
                                                  planned exercises
                                                </p>
                                              </div>
                                              <span className="rounded-full border border-white/10 bg-slate-950/45 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">
                                                {planAssignmentStatus(plan.id, day.id, assignment) !== "Planned" ? planAssignmentStatus(plan.id, day.id, assignment) : template ? assignmentTemplateIssue(assignment, template) ? "Needs review" : "Ready" : "Needs template"}
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

                                      if (assignmentCompleted(assignment.id)) {
                                        return (
                                          <Link
                                            key={assignment.id}
                                            href={ROUTES.dashboard.sessionHistory}
                                            aria-label={`View history for ${assignment.templateTitle}`}
                                            className="min-h-[44px] rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-300 hover:text-slate-950"
                                          >
                                            {planAssignmentStatus(plan.id, day.id, assignment) === "Completed" ? "View History" : "Review History"}
                                          </Link>
                                        );
                                      }

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
                                          disabled={!template || Boolean(assignmentTemplateIssue(assignment, template))}
                                          className="min-h-[44px] rounded-2xl bg-cyan-400 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-45"
                                        >
                                          {template ? assignmentTemplateIssue(assignment, template) ? "Review Assignment" : "Start Workout" : "Template Missing"}
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
                    {canonicalActivePlan?.title || "No active plan"}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {canonicalActivePlan ? getWeekRangeLabel(canonicalActivePlan) : "Choose Set Active on a saved week when ready."}
                  </p>
                  <div className="mt-4 space-y-3">
                    {visiblePlans.map((plan) => {
                      const isSelected = plan.id === activePlanId && plan.status === "active";

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
                          {!isSelected && plan.status !== "archived" ? (
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

        <section className="rounded-[36px] border border-emerald-300/20 bg-[radial-gradient(circle_at_20%_0%,rgba(52,211,153,0.18),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.98))] p-6 shadow-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-300">
                Build Your Training Plan
              </p>
              <h2 className="mt-3 text-3xl font-black text-white">
                How your plan works
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Set your direction in Goals, choose your training days, and assign saved workouts.
                Start sessions from your week to connect completed workouts with your plan and progress.
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

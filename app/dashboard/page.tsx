"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  loadWorkoutLogEntriesWithFallback,
  loadWorkoutTemplatesWithFallback,
  syncLocalWorkoutLogsToSupabase,
  syncLocalWorkoutTemplatesToSupabase,
} from "@/lib/data/workoutPersistence";
import {
  readActiveWorkoutBuilderSessionTemplate,
  type LocalWorkoutBuilderSessionTemplate,
  type LocalWorkoutBuilderTemplate,
} from "@/lib/localData/workoutBuilderData";
import { subscribeToLocalWorkoutData } from "@/lib/localData/workoutData";
import { ROUTES } from "@/lib/routes";
import { supabase } from "@/lib/supabaseClient";
import type { LocalExerciseStatEntry } from "@/types";

type SourceResult = {
  source: "supabase" | "localStorage";
  error: string | null;
};

const WORKOUT_SYNC_LAST_SYNCED_KEY = "soundFitnessWorkoutDataLastSyncedAt";

const formatDashboardDate = (value?: string) => {
  if (!value) return "No workout logged yet";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently logged";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const formatCompactDateTime = (value?: string) => {
  if (!value) return "Not started";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const formatLastSyncedAt = (value: string | null) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const getSourceLabel = ({ source, error }: SourceResult) => {
  if (source === "supabase") return "Supabase";

  return error && !error.includes("No authenticated Supabase user")
    ? "error fallback"
    : "localStorage fallback";
};

const buildTemplateWorkoutHref = (templateId: string) =>
  `${ROUTES.dashboard.sessionWorkout}?template=${encodeURIComponent(
    templateId,
  )}`;

const groupWorkoutDates = (entries: LocalExerciseStatEntry[]) =>
  Array.from(
    new Set(
      entries
        .filter((entry) => entry.source === "workout-session")
        .map((entry) => entry.date)
        .filter(Boolean),
    ),
  );

const memberAreaCards = [
  {
    title: "Sessions",
    href: ROUTES.dashboard.sessions,
    text: "Workout command center, saved templates, history, and session tools.",
    label: "Primary",
  },
  {
    title: "Workout Builder",
    href: ROUTES.workoutBuilder.home,
    text: "Create templates, load saved workouts, and start custom sessions.",
    label: "Build",
  },
  {
    title: "My Plan",
    href: ROUTES.dashboard.myPlan,
    text: "Weekly plan outline and future program assignments.",
    label: "Plan",
  },
  {
    title: "Stats",
    href: ROUTES.dashboard.stats,
    text: "Exercise logs, recent sets, and performance trends.",
    label: "Progress",
  },
  {
    title: "Video Review",
    href: ROUTES.dashboard.videoReview,
    text: "Submit form checks and link coach feedback to training.",
    label: "Coach",
  },
  {
    title: "Recovery",
    href: ROUTES.dashboard.recovery,
    text: "Mobility, recovery recommendations, and readiness work.",
    label: "Readiness",
  },
  {
    title: "Nutrition",
    href: ROUTES.nutrition.home,
    text: "Recipes, meal prep, grocery lists, and nutrition habits.",
    label: "Fuel",
  },
  {
    title: "Profile",
    href: ROUTES.dashboard.profile,
    text: "Personal details, goals, preferences, and account settings.",
    label: "Account",
  },
] as const;

export default function UserHomeDashboardPage() {
  const [firstName, setFirstName] = useState("Member");
  const [exerciseStats, setExerciseStats] = useState<LocalExerciseStatEntry[]>(
    [],
  );
  const [savedTemplates, setSavedTemplates] = useState<
    LocalWorkoutBuilderTemplate[]
  >([]);
  const [activeSessionTemplate, setActiveSessionTemplate] =
    useState<LocalWorkoutBuilderSessionTemplate | null>(null);
  const [statsSourceLabel, setStatsSourceLabel] = useState("Loading stats");
  const [templatesSourceLabel, setTemplatesSourceLabel] =
    useState("Loading templates");
  const [canSyncWorkoutData, setCanSyncWorkoutData] = useState(false);
  const [isSyncingWorkoutData, setIsSyncingWorkoutData] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        setCanSyncWorkoutData(false);
        return;
      }

      setCanSyncWorkoutData(true);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", authData.user.id)
        .single();

      const nameSource =
        profile?.full_name ||
        authData.user.user_metadata?.full_name ||
        authData.user.user_metadata?.first_name ||
        "Member";

      setFirstName(String(nameSource).split(" ")[0] || "Member");
    }

    loadUser();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setLastSyncedAt(window.localStorage.getItem(WORKOUT_SYNC_LAST_SYNCED_KEY));
    setActiveSessionTemplate(readActiveWorkoutBuilderSessionTemplate());
  }, []);

  useEffect(() => {
    let isActive = true;

    const syncDashboardData = async () => {
      const [statsResult, templatesResult] = await Promise.all([
        loadWorkoutLogEntriesWithFallback(),
        loadWorkoutTemplatesWithFallback(),
      ]);

      if (!isActive) return;

      setExerciseStats(statsResult.data);
      setSavedTemplates(templatesResult.data);
      setStatsSourceLabel(getSourceLabel(statsResult));
      setTemplatesSourceLabel(getSourceLabel(templatesResult));
    };

    syncDashboardData();
    const unsubscribe = subscribeToLocalWorkoutData(() => {
      void syncDashboardData();
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  async function refreshHybridDashboardData() {
    const [statsResult, templatesResult] = await Promise.all([
      loadWorkoutLogEntriesWithFallback(),
      loadWorkoutTemplatesWithFallback(),
    ]);

    setExerciseStats(statsResult.data);
    setSavedTemplates(templatesResult.data);
    setStatsSourceLabel(getSourceLabel(statsResult));
    setTemplatesSourceLabel(getSourceLabel(templatesResult));

    return { statsResult, templatesResult };
  }

  async function syncLocalWorkoutData() {
    if (!canSyncWorkoutData || isSyncingWorkoutData) return;

    setIsSyncingWorkoutData(true);
    setSyncStatusMessage("Syncing local workout data...");

    try {
      const [templatesResult, logsResult] = await Promise.all([
        syncLocalWorkoutTemplatesToSupabase(),
        syncLocalWorkoutLogsToSupabase(),
      ]);

      await refreshHybridDashboardData();

      const templateSummary = templatesResult.data;
      const logSummary = logsResult.data;
      const syncedCount =
        templateSummary.syncedItems + logSummary.syncedItems;
      const skippedCount =
        templateSummary.skippedItems + logSummary.skippedItems;
      const failedCount =
        templateSummary.failedItems + logSummary.failedItems;
      const localCount =
        templateSummary.localItems + logSummary.localItems;

      if (!templatesResult.success || !logsResult.success) {
        setSyncStatusMessage(
          `Sync hit a snag, but your local data is still safe. Synced ${syncedCount}, skipped ${skippedCount} duplicate${
            skippedCount === 1 ? "" : "s"
          }, failed ${failedCount}. ${
            templatesResult.error ||
            logsResult.error ||
            "Some data could not sync."
          }`,
        );
      } else if (localCount === 0) {
        setSyncStatusMessage(
          "Nothing local to sync yet. New workout data will still save locally and sync when available.",
        );
      } else {
        setSyncStatusMessage(
          `Account backup complete: ${templateSummary.syncedItems} template${
            templateSummary.syncedItems === 1 ? "" : "s"
          } synced, ${logSummary.syncedItems} workout log ${
            logSummary.syncedItems === 1 ? "entry" : "entries"
          } synced, and ${skippedCount} duplicate${
            skippedCount === 1 ? "" : "s"
          } skipped.`,
        );
      }

      if (failedCount === 0) {
        const syncedAt = new Date().toISOString();

        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            WORKOUT_SYNC_LAST_SYNCED_KEY,
            syncedAt,
          );
        }

        setLastSyncedAt(syncedAt);
      }
    } catch {
      setSyncStatusMessage(
        "Local workout data could not sync right now. Your local fallback is still safe.",
      );
    } finally {
      setIsSyncingWorkoutData(false);
    }
  }

  const lastSyncedLabel = formatLastSyncedAt(lastSyncedAt);

  const dashboardSummary = useMemo(() => {
    const sortedStats = [...exerciseStats].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const latest = sortedStats[0];
    const totalSets = exerciseStats.reduce(
      (sum, stat) => sum + Number(stat.sets || 0),
      0,
    );
    const workoutSessionEntries = exerciseStats.filter(
      (stat) => stat.source === "workout-session",
    );
    const uniqueExercises = new Set(
      exerciseStats.map((stat) => stat.exerciseName).filter(Boolean),
    );
    const workoutDates = groupWorkoutDates(exerciseStats);
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const workoutsThisWeek = workoutDates.filter((date) => {
      const timestamp = new Date(date).getTime();
      return Number.isFinite(timestamp) && timestamp >= sevenDaysAgo;
    }).length;
    const latestTemplate = [...savedTemplates].sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime(),
    )[0];

    return {
      totalLoggedEntries: exerciseStats.length,
      workoutSessionEntries: workoutSessionEntries.length,
      completedWorkouts: workoutDates.length,
      workoutsThisWeek,
      totalSets,
      uniqueExerciseCount: uniqueExercises.size,
      latestExercise: latest?.exerciseName || "No exercise logged yet",
      mostRecentDate: formatDashboardDate(latest?.date),
      hasStats: exerciseStats.length > 0,
      latestEntries: sortedStats.slice(0, 3),
      latestTemplate,
      templateCount: savedTemplates.length,
    };
  }, [exerciseStats, savedTemplates]);

  const nextAction = activeSessionTemplate
    ? {
        eyebrow: "Resume active session",
        title: activeSessionTemplate.title,
        detail: `${activeSessionTemplate.exercises.length} exercises started ${formatCompactDateTime(
          activeSessionTemplate.startedAt,
        )}`,
        href: ROUTES.dashboard.sessionWorkout,
        cta: "Resume Workout",
      }
    : dashboardSummary.latestTemplate
      ? {
          eyebrow: "Next best action",
          title: `Start ${dashboardSummary.latestTemplate.title}`,
          detail: `${dashboardSummary.latestTemplate.exercises.length} saved exercises ready from your templates.`,
          href: buildTemplateWorkoutHref(dashboardSummary.latestTemplate.id),
          cta: "Start Template",
        }
      : {
          eyebrow: "Next best action",
          title: "Start your first logged workout",
          detail:
            "Open the session hub or workout logger to create your first saved training entry.",
          href: ROUTES.dashboard.sessions,
          cta: "Open Sessions",
        };

  const statCards = [
    {
      label: "Completed Workouts",
      value: String(dashboardSummary.completedWorkouts),
      detail: `${dashboardSummary.workoutsThisWeek} in the last 7 days`,
    },
    {
      label: "Logged Entries",
      value: String(dashboardSummary.totalLoggedEntries),
      detail: `${dashboardSummary.workoutSessionEntries} from workout sessions`,
    },
    {
      label: "Total Sets",
      value: String(dashboardSummary.totalSets),
      detail: `${dashboardSummary.uniqueExerciseCount} unique exercises`,
    },
    {
      label: "Templates",
      value: String(dashboardSummary.templateCount),
      detail: templatesSourceLabel,
    },
  ];

  const planHighlights = [
    {
      label: "Current week",
      value:
        dashboardSummary.latestTemplate?.title ||
        "Build or choose a saved template",
    },
    {
      label: "Training target",
      value:
        dashboardSummary.workoutsThisWeek > 0
          ? `${dashboardSummary.workoutsThisWeek} workout${
              dashboardSummary.workoutsThisWeek === 1 ? "" : "s"
            } logged this week`
          : "Start with one complete session",
    },
    {
      label: "Next planning step",
      value:
        dashboardSummary.templateCount > 0
          ? "Assign templates to your weekly plan"
          : "Create a reusable workout template",
    },
  ];

  return (
    <main className="min-h-screen bg-[#020713] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(14,165,233,0.18),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(16,185,129,0.13),transparent_26%),linear-gradient(180deg,#020713_0%,#07111f_48%,#020713_100%)]" />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 lg:py-8">
        <header className="mb-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/20 backdrop-blur sm:rounded-[30px] sm:p-6 lg:p-7">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
                Sound Fitness Command Center
              </div>

              <h1 className="mt-3 break-words text-3xl font-black uppercase tracking-tight sm:text-5xl">
                Welcome back, <span className="text-sky-400">{firstName}</span>
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Start training, check your progress, sync local data, and jump
                into the next part of your plan from one place.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
              <Link
                href={ROUTES.dashboard.sessions}
                className="min-h-[48px] rounded-2xl bg-sky-500 px-5 py-4 text-center text-xs font-black uppercase tracking-[0.16em] text-white shadow-[0_0_35px_rgba(14,165,233,0.35)] transition hover:bg-sky-400"
              >
                Sessions Hub
              </Link>

              <Link
                href={ROUTES.dashboard.stats}
                className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-xs font-black uppercase tracking-[0.16em] text-white transition hover:border-sky-400/50 hover:bg-sky-500/10"
              >
                View Stats
              </Link>
            </div>
          </div>
        </header>

        <section className="mb-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[28px] border border-sky-400/30 bg-white/[0.055] p-5 shadow-2xl shadow-black/25 backdrop-blur sm:rounded-[34px] sm:p-6 lg:p-8">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
              {nextAction.eyebrow}
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              {nextAction.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              {nextAction.detail}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                href={nextAction.href}
                className="min-h-[48px] rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-300 px-5 py-4 text-center text-sm font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_0_34px_rgba(14,165,233,0.3)] transition hover:scale-[1.01]"
              >
                {nextAction.cta}
              </Link>
              <Link
                href={ROUTES.dashboard.sessionWorkout}
                className="min-h-[48px] rounded-2xl border border-cyan-300/25 bg-cyan-400/10 px-5 py-4 text-center text-sm font-black uppercase tracking-[0.14em] text-cyan-300 transition hover:bg-cyan-400 hover:text-slate-950"
              >
                Start Workout
              </Link>
              <Link
                href={ROUTES.workoutBuilder.home}
                className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-black uppercase tracking-[0.14em] text-white transition hover:border-sky-400/50 hover:bg-sky-500/10"
              >
                Build Workout
              </Link>
              <Link
                href={ROUTES.dashboard.myPlan}
                className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-black uppercase tracking-[0.14em] text-white transition hover:border-emerald-300/50 hover:bg-emerald-400/10"
              >
                My Plan
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/20 backdrop-blur sm:rounded-[34px] sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">
                  Sync Status
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  Account backup
                </h2>
              </div>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200">
                {statsSourceLabel}
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              Workout logs and templates keep local fallback protection while
              authenticated accounts can sync to Supabase.
            </p>

            <button
              type="button"
              onClick={syncLocalWorkoutData}
              disabled={!canSyncWorkoutData || isSyncingWorkoutData}
              className="mt-5 min-h-[48px] w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-black uppercase tracking-[0.14em] text-white transition hover:border-sky-400/50 hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isSyncingWorkoutData
                ? "Syncing..."
                : canSyncWorkoutData
                  ? "Sync local workout data"
                  : "Sign in to sync"}
            </button>

            {syncStatusMessage ? (
              <p className="mt-4 rounded-2xl border border-sky-300/20 bg-sky-400/10 px-4 py-3 text-sm font-semibold text-sky-100">
                {syncStatusMessage}
              </p>
            ) : (
              <p className="mt-4 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm text-slate-400">
                {lastSyncedLabel
                  ? `Last synced ${lastSyncedLabel}`
                  : "No sync run from this browser yet."}
              </p>
            )}

            {syncStatusMessage && lastSyncedLabel ? (
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Last synced {lastSyncedLabel}
              </p>
            ) : null}
          </div>
        </section>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-[24px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur"
            >
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                {card.label}
              </div>
              <div className="mt-3 break-words text-2xl font-black tracking-tight text-white">
                {card.value}
              </div>
              <div className="mt-2 text-sm text-slate-400">{card.detail}</div>
            </div>
          ))}
        </section>

        <section className="mb-6 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/15 backdrop-blur sm:rounded-[32px] sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300">
                  Current Week
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  Plan snapshot
                </h2>
              </div>
              <Link
                href={ROUTES.dashboard.myPlan}
                className="min-h-[44px] rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-amber-200 transition hover:bg-amber-300 hover:text-slate-950"
              >
                Open Plan
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {planHighlights.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3"
                >
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                    {item.label}
                  </div>
                  <p className="mt-1 text-sm font-bold leading-6 text-white">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/15 backdrop-blur sm:rounded-[32px] sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">
                  Recent Workout Activity
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  {dashboardSummary.latestExercise}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {dashboardSummary.mostRecentDate}
                </p>
              </div>
              <Link
                href={ROUTES.dashboard.stats}
                className="min-h-[44px] rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-emerald-200 transition hover:bg-emerald-300 hover:text-slate-950"
              >
                Stats
              </Link>
            </div>

            {dashboardSummary.hasStats ? (
              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                {dashboardSummary.latestEntries.map((entry, index) => (
                  <div
                    key={`${entry.date}-${entry.exerciseId}-${index}`}
                    className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3"
                  >
                    <div className="text-sm font-bold leading-5 text-white">
                      {entry.exerciseName}
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      {entry.weight} x {entry.reps} x {entry.sets}
                    </p>
                    <span className="mt-3 inline-flex rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-sky-300">
                      {entry.source === "workout-session"
                        ? "Workout"
                        : "Library"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-sm leading-6 text-slate-300">
                No saved workout activity yet. Start the session hub to create
                your first local stats entry.
              </p>
            )}
          </div>
        </section>

        <section className="mb-6 grid gap-4 lg:grid-cols-3">
          <Link
            href={ROUTES.dashboard.videoReview}
            className="group rounded-[26px] border border-sky-300/20 bg-sky-400/10 p-5 shadow-xl shadow-black/15 transition hover:border-sky-300/45 hover:bg-sky-400/15"
          >
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-300">
              Video Review
            </div>
            <h3 className="mt-3 text-xl font-black tracking-tight text-white">
              Submit a lift for coach feedback
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              MVP review queue with related exercise and linked workout fields.
            </p>
            <div className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-sky-200 transition group-hover:translate-x-1">
              Open Video Review
            </div>
          </Link>

          <Link
            href={ROUTES.dashboard.recovery}
            className="group rounded-[26px] border border-emerald-300/20 bg-emerald-400/10 p-5 shadow-xl shadow-black/15 transition hover:border-emerald-300/45 hover:bg-emerald-400/15"
          >
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">
              Recovery / Readiness
            </div>
            <h3 className="mt-3 text-xl font-black tracking-tight text-white">
              Keep readiness in the loop
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Mobility, soreness, and recovery recommendations remain secondary
              until readiness data is wired.
            </p>
            <div className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-emerald-200 transition group-hover:translate-x-1">
              Open Recovery
            </div>
          </Link>

          <Link
            href={ROUTES.nutrition.home}
            className="group rounded-[26px] border border-amber-300/20 bg-amber-300/10 p-5 shadow-xl shadow-black/15 transition hover:border-amber-300/45 hover:bg-amber-300/15"
          >
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">
              Nutrition
            </div>
            <h3 className="mt-3 text-xl font-black tracking-tight text-white">
              Fuel the next phase
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Recipes, meal prep, and grocery tools are available while deeper
              nutrition logic stays future-scoped.
            </p>
            <div className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-amber-200 transition group-hover:translate-x-1">
              Open Nutrition
            </div>
          </Link>
        </section>

        <section className="mb-6 grid gap-5 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/15 backdrop-blur sm:rounded-[32px] sm:p-6">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-fuchsia-300">
              Continuation Program
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight">
              Keep the plan moving
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Use My Plan and the Sessions hub as the active continuation path.
              Older online-program routes stay hidden from the primary UX.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href={ROUTES.dashboard.myPlan}
                className="min-h-[48px] rounded-2xl border border-fuchsia-300/20 bg-fuchsia-400/10 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-fuchsia-100 transition hover:bg-fuchsia-300 hover:text-slate-950"
              >
                Review Plan
              </Link>
              <Link
                href={ROUTES.dashboard.sessions}
                className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-white transition hover:border-sky-300/40 hover:bg-sky-400/10"
              >
                Sessions Hub
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/15 backdrop-blur sm:rounded-[32px] sm:p-6">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">
              Performance / Conditioning
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight">
              Track capacity without clutter
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Stats are the live source today. Conditioning, calendars, and
              deeper performance trends can build from the same workout logs.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href={ROUTES.dashboard.stats}
                className="min-h-[48px] rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950"
              >
                View Stats
              </Link>
              <Link
                href={ROUTES.dashboard.trainingCalendar}
                className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-white transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
              >
                Calendar
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/15 backdrop-blur sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                Member Areas
              </div>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-slate-200">
                Where do I go?
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-500">
              Primary training actions are above. These areas stay available as
              the broader member experience fills in.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {memberAreaCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="group rounded-[24px] border border-white/10 bg-slate-950/35 p-4 transition duration-300 hover:border-sky-400/35 hover:bg-sky-500/10"
              >
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {card.label}
                </div>
                <h3 className="mt-2 text-base font-black uppercase tracking-tight text-white">
                  {card.title}
                </h3>
                <p className="mt-2 min-h-[66px] text-sm leading-6 text-slate-500">
                  {card.text}
                </p>
                <div className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-sky-400 transition group-hover:translate-x-1">
                  Open
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DashboardCalendar, {
  type DashboardCalendarItem,
} from "@/components/dashboard/DashboardCalendar";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
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
  if (source === "supabase") return "Account-backed";

  return error && !error.includes("No authenticated Supabase user")
    ? "Backup retry"
    : "Browser backup";
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

const toLoggedNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

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

const dashboardNavigationCards = [
  {
    title: "Workout Dashboard",
    href: ROUTES.dashboard.sessions,
    description: "Sessions, plans, builders, and training progression.",
    icon: "🏋️",
    tone: "cyan",
    status: "Primary",
  },
  {
    title: "Nutrition Dashboard",
    href: ROUTES.nutritionPortal.home,
    description: "Meals, hydration, grocery planning, and fuel tracking.",
    icon: "🥗",
    tone: "emerald",
    status: "Ready",
  },
  {
    title: "Performance Dashboard",
    href: "/performance",
    description: "Power, conditioning, capacity, and athletic development.",
    icon: "⚡",
    tone: "amber",
    status: "Ready",
  },
  {
    title: "Recovery Dashboard",
    href: "/recovery",
    description: "Readiness, mobility, soreness, and recovery support.",
    icon: "🩹",
    tone: "sky",
    status: "Ready",
  },
  // TODO: Link to /learning when the Learning Dashboard route exists.
  {
    title: "Learning Dashboard",
    href: null,
    description: "Education, skill lessons, and guided learning paths.",
    icon: "🎓",
    tone: "violet",
    status: "Coming Soon",
  },
  // TODO: Link to /soundworld when the SoundWorld Dashboard route exists.
  {
    title: "SoundWorld Dashboard",
    href: null,
    description: "Games, challenges, and future interactive training worlds.",
    icon: "🎮",
    tone: "fuchsia",
    status: "Coming Soon",
  },
] as const;

const dashboardToneStyles = {
  amber: {
    border: "hover:border-amber-300/45",
    glow: "hover:shadow-[0_0_34px_rgba(251,191,36,0.13)]",
    icon: "bg-amber-300/12 text-amber-100",
    line: "bg-amber-300/60",
  },
  cyan: {
    border: "hover:border-cyan-300/45",
    glow: "hover:shadow-[0_0_34px_rgba(34,211,238,0.15)]",
    icon: "bg-cyan-300/12 text-cyan-100",
    line: "bg-cyan-300/70",
  },
  emerald: {
    border: "hover:border-emerald-300/45",
    glow: "hover:shadow-[0_0_34px_rgba(16,185,129,0.13)]",
    icon: "bg-emerald-300/12 text-emerald-100",
    line: "bg-emerald-300/60",
  },
  fuchsia: {
    border: "hover:border-fuchsia-300/40",
    glow: "hover:shadow-[0_0_34px_rgba(217,70,239,0.12)]",
    icon: "bg-fuchsia-300/12 text-fuchsia-100",
    line: "bg-fuchsia-300/50",
  },
  sky: {
    border: "hover:border-sky-300/45",
    glow: "hover:shadow-[0_0_34px_rgba(14,165,233,0.13)]",
    icon: "bg-sky-300/12 text-sky-100",
    line: "bg-sky-300/60",
  },
  violet: {
    border: "hover:border-violet-300/40",
    glow: "hover:shadow-[0_0_34px_rgba(139,92,246,0.12)]",
    icon: "bg-violet-300/12 text-violet-100",
    line: "bg-violet-300/50",
  },
} as const;

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
      (sum, stat) => sum + toLoggedNumber(stat.sets),
      0,
    );
    const totalVolume = exerciseStats.reduce(
      (sum, stat) =>
        sum +
        toLoggedNumber(stat.weight) *
          toLoggedNumber(stat.reps) *
          toLoggedNumber(stat.sets),
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
      totalVolume,
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

  const dashboardCharts = useMemo(() => {
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const trainingVolume = labels.map((label, index) => {
      const value = exerciseStats
        .filter((entry) => {
          const date = new Date(entry.date);
          if (Number.isNaN(date.getTime())) return false;
          const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
          return dayIndex === index;
        })
        .reduce(
          (sum, entry) =>
            sum +
            toLoggedNumber(entry.weight) *
              toLoggedNumber(entry.reps) *
              toLoggedNumber(entry.sets),
          0,
        );

      return {
        label,
        value: value > 0 ? Math.round(value / 100) : 0,
        target: 18,
      };
    });

    const weeklyGoal = Math.max(12, (dashboardSummary.templateCount || 1) * 12);
    const goalProgressPercent = Math.min(
      (dashboardSummary.totalSets / weeklyGoal) * 100,
      100,
    );

    return {
      trainingVolume,
      goalProgressPercent,
      nutritionConsistency: [
        { label: "Protein", value: dashboardSummary.hasStats ? 74 : 42, target: 100 },
        { label: "Hydration", value: dashboardSummary.hasStats ? 68 : 40, target: 100 },
        { label: "Meals", value: dashboardSummary.hasStats ? 81 : 35, target: 100 },
      ],
      recoveryTrend: [
        { label: "Mon", value: 72 },
        { label: "Tue", value: dashboardSummary.workoutsThisWeek > 2 ? 64 : 78 },
        { label: "Wed", value: 76 },
        { label: "Thu", value: 70 },
        { label: "Fri", value: dashboardSummary.totalSets > 30 ? 62 : 82 },
        { label: "Sat", value: 84 },
        { label: "Sun", value: 79 },
      ],
    };
  }, [dashboardSummary, exerciseStats]);

  const dashboardCalendarItems = useMemo<DashboardCalendarItem[]>(() => {
    const templateTitle =
      dashboardSummary.latestTemplate?.title || "Build first workout";

    return [
      {
        dateLabel: "Mon",
        title:
          dashboardSummary.workoutsThisWeek > 0
            ? "Completed session"
            : "Plan first session",
        type: dashboardSummary.workoutsThisWeek > 0 ? "completed" : "training",
        status: dashboardSummary.workoutsThisWeek > 0 ? "Done" : "Start",
      },
      {
        dateLabel: "Tue",
        title: "Hydration check",
        type: "nutrition",
        status: "Fuel",
      },
      {
        dateLabel: "Wed",
        title: templateTitle,
        type: "training",
        status: "Planned",
      },
      {
        dateLabel: "Thu",
        title: "Mobility reset",
        type: "recovery",
        status: "Recovery",
      },
      {
        dateLabel: "Fri",
        title: dashboardSummary.latestExercise,
        type: dashboardSummary.hasStats ? "completed" : "training",
        status: dashboardSummary.hasStats ? "Recent" : "Suggested",
      },
      {
        dateLabel: "Sat",
        title: "Nutrition prep",
        type: "nutrition",
        status: "Plan",
      },
      {
        dateLabel: "Sun",
        title: "Reflection",
        type: "recovery",
        status: "Review",
      },
    ];
  }, [dashboardSummary]);

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
                Start training, check your progress, back up your workout data,
                and jump into the next part of your plan from one place.
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

        <section className="mb-6 rounded-[32px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/15 backdrop-blur sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-300">
                Dashboards
              </div>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">
                Choose your command center
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-400">
              Jump into the major Sound Fitness dashboards without adding
              another header menu.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dashboardNavigationCards.map((card) => {
              const tone = dashboardToneStyles[card.tone];
              const cardContent = (
                <>
                  <span
                    className={`absolute left-5 right-5 top-0 h-[2px] rounded-full ${tone.line}`}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 text-lg ${tone.icon}`}
                      aria-hidden="true"
                    >
                      {card.icon}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                        card.href
                          ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                          : "border-white/10 bg-white/[0.04] text-slate-500"
                      }`}
                    >
                      {card.status}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-black tracking-tight text-white">
                    {card.title}
                  </h3>
                  <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-400">
                    {card.description}
                  </p>
                  <div className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-cyan-200 transition group-hover:translate-x-1">
                    {card.href ? "Open Dashboard" : "Coming Soon"}
                  </div>
                </>
              );
              const className = `group relative overflow-hidden rounded-[26px] border border-white/10 bg-slate-950/42 p-5 text-left transition duration-300 ${tone.border} ${tone.glow}`;

              return card.href ? (
                <Link
                  key={card.title}
                  href={card.href}
                  className={`${className} hover:-translate-y-1 hover:bg-white/[0.06] active:scale-[0.99]`}
                >
                  {cardContent}
                </Link>
              ) : (
                <button
                  key={card.title}
                  type="button"
                  disabled
                  className={`${className} cursor-not-allowed opacity-70`}
                >
                  {cardContent}
                </button>
              );
            })}
          </div>
        </section>

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

          <div className="rounded-[28px] border border-cyan-300/20 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.14),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.84),rgba(2,6,23,0.94))] p-5 shadow-2xl shadow-black/20 backdrop-blur sm:rounded-[34px] sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">
                  Add Stats
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  Add Stats
                </h2>
              </div>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100">
                Import Center
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              Upload, connect, or manually enter your fitness data across
              workouts, nutrition, body metrics, recovery, and performance.
            </p>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {[
                ["Manual Entry", "/stats/add/manual"],
                ["Upload Photo", "/stats/add/upload"],
                ["Upload Screenshot", "/stats/add/upload"],
                ["Upload Excel / CSV", "/stats/add/upload"],
                ["Connect Wearable", "/stats/add/connect"],
                ["AI Import Review", "/stats/import-review"],
              ].map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="min-h-[44px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-xs font-black uppercase tracking-[0.12em] text-white transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
                >
                  {label}
                </Link>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {["Workout", "Nutrition", "Body", "Recovery", "Performance"].map(
                (badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400"
                  >
                    {badge}
                  </span>
                ),
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Last Import
                </div>
                <p className="mt-1 text-sm font-bold text-white">
                  {lastSyncedLabel || "No import reviewed yet"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Connected Apps
                </div>
                <p className="mt-1 text-sm font-bold text-white">
                  Coming soon
                </p>
              </div>
            </div>

            <Link
              href="/stats/add"
              className="mt-5 block min-h-[48px] w-full rounded-2xl bg-cyan-300 px-5 py-4 text-center text-sm font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.18)] transition hover:bg-cyan-200"
            >
              Open Import Center
            </Link>
          </div>
        </section>

        <section className="mb-6 grid gap-5 xl:grid-cols-[0.86fr_1.14fr]">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/15 backdrop-blur sm:p-6">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-300">
              Weekly Snapshot
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight">
              Today&apos;s command panel
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Workouts, nutrition, readiness, and performance stay visible
              without relying on a fragile chart dependency.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Workouts", `${dashboardSummary.workoutsThisWeek} this week`],
                [
                  "Weekly Volume",
                  `${Math.round(dashboardSummary.totalVolume).toLocaleString()} lb`,
                ],
                [
                  "Recovery",
                  dashboardSummary.totalSets > 30 ? "Manage heat" : "Ready to build",
                ],
                [
                  "Performance",
                  dashboardSummary.hasStats ? "Trend active" : "Start logging",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    {label}
                  </div>
                  <div className="mt-2 text-lg font-black text-white">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DashboardCalendar items={dashboardCalendarItems} />
        </section>

        <section className="mb-6">
          <DashboardCharts
            goalProgressPercent={dashboardCharts.goalProgressPercent}
            nutritionConsistency={dashboardCharts.nutritionConsistency}
            recoveryTrend={dashboardCharts.recoveryTrend}
            trainingVolume={dashboardCharts.trainingVolume}
          />
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
              Use My Plan and the Sessions hub as the active continuation path
              for weekly programming, workout launches, and progress follow-up.
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

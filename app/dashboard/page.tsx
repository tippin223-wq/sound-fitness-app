"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import {
  loadWorkoutLogEntriesWithFallback,
  syncLocalWorkoutLogsToSupabase,
  syncLocalWorkoutTemplatesToSupabase,
} from "@/lib/data/workoutPersistence";
import { subscribeToLocalWorkoutData } from "@/lib/localData/workoutData";
import { ROUTES } from "@/lib/routes";
import { supabase } from "@/lib/supabaseClient";
import type { LocalExerciseStatEntry } from "@/types";

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

const getStatsSourceLabel = ({
  source,
  error,
}: {
  source: "supabase" | "localStorage";
  error: string | null;
}) => {
  if (source === "supabase") return "Supabase";

  return error && !error.includes("No authenticated Supabase user")
    ? "error fallback"
    : "localStorage fallback";
};

const WORKOUT_SYNC_LAST_SYNCED_KEY = "soundFitnessWorkoutDataLastSyncedAt";

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

const portalCards = [
  {
    title: "Sessions",
    href: ROUTES.dashboard.sessions,
    text: "Bookings, session notes, and workout history.",
  },
  {
    title: "Workout Builder",
    href: ROUTES.workoutBuilder.home,
    text: "Exercise library, saved workouts, and builder tools.",
  },
  {
    title: "Progress",
    href: ROUTES.dashboard.progress,
    text: "Goals, check-ins, habits, pain tracking, and journals.",
  },
  {
    title: "Recovery",
    href: ROUTES.dashboard.recovery,
    text: "Mobility work, soreness notes, and recovery guidance.",
  },
  {
    title: "Nutrition",
    href: ROUTES.nutrition.home,
    text: "Recipes, grocery lists, meal prep, and habit targets.",
  },
  {
    title: "Profile",
    href: ROUTES.dashboard.profile,
    text: "Personal details, goals, preferences, and account info.",
  },
] as const;

export default function UserHomeDashboardPage() {
  const [firstName, setFirstName] = useState("Member");
  const [exerciseStats, setExerciseStats] = useState<LocalExerciseStatEntry[]>(
    [],
  );
  const [statsSourceLabel, setStatsSourceLabel] = useState("Loading stats");
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

    setLastSyncedAt(
      window.localStorage.getItem(WORKOUT_SYNC_LAST_SYNCED_KEY),
    );
  }, []);

  useEffect(() => {
    let isActive = true;
    const syncStats = async () => {
      const result = await loadWorkoutLogEntriesWithFallback();

      if (!isActive) return;

      setExerciseStats(result.data);
      setStatsSourceLabel(getStatsSourceLabel(result));
    };

    syncStats();
    const unsubscribe = subscribeToLocalWorkoutData(() => {
      void syncStats();
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  async function refreshHybridStats() {
    const result = await loadWorkoutLogEntriesWithFallback();

    setExerciseStats(result.data);
    setStatsSourceLabel(getStatsSourceLabel(result));

    return result;
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

      await refreshHybridStats();

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

  const workoutSummary = useMemo(() => {
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
    ).length;

    return {
      totalLoggedEntries: exerciseStats.length,
      workoutSessionEntries,
      totalSets,
      latestExercise: latest?.exerciseName || "No exercise logged yet",
      mostRecentDate: formatDashboardDate(latest?.date),
      hasStats: exerciseStats.length > 0,
      latestEntries: sortedStats.slice(0, 3),
    };
  }, [exerciseStats]);

  const summaryCards = [
    {
      label: "Logged Entries",
      value: String(workoutSummary.totalLoggedEntries),
      detail: "Saved set entries",
    },
    {
      label: "Most Recent",
      value: workoutSummary.mostRecentDate,
      detail: workoutSummary.hasStats ? "Latest saved activity" : "Start today",
    },
    {
      label: "Latest Exercise",
      value: workoutSummary.latestExercise,
      detail: "Most recent movement",
    },
    {
      label: "Total Sets",
      value: String(workoutSummary.totalSets),
      detail: `${workoutSummary.workoutSessionEntries} from workout sessions`,
    },
  ];

  return (
    <main className="min-h-screen bg-[#020713] text-white">
      <AppHeader />

      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(14,165,233,0.18),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(56,189,248,0.12),transparent_28%),linear-gradient(180deg,#020713_0%,#06111f_48%,#020713_100%)]" />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 lg:py-8">
        <header className="mb-8 rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/20 backdrop-blur sm:rounded-[30px] sm:p-5 lg:p-7">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
                Sound Fitness Member Portal
              </div>

              <h1 className="mt-3 break-words text-3xl font-black uppercase tracking-tight sm:text-5xl">
                Welcome back, <span className="text-sky-400">{firstName}</span>
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Start a workout, save your sets, and come back here to see your
                latest training activity.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href={ROUTES.dashboard.sessionWorkout}
                className="min-h-[48px] rounded-2xl bg-sky-500 px-6 py-4 text-center text-xs font-black uppercase tracking-[0.16em] text-white shadow-[0_0_35px_rgba(14,165,233,0.35)] transition hover:bg-sky-400"
              >
                Start or Resume Workout
              </Link>

              <Link
                href={ROUTES.dashboard.stats}
                className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 text-center text-xs font-black uppercase tracking-[0.16em] text-white transition hover:border-sky-400/50 hover:bg-sky-500/10"
              >
                View Stats
              </Link>
            </div>
          </div>
        </header>

        <section className="mb-8 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[28px] border border-sky-400/30 bg-white/[0.05] p-5 shadow-2xl shadow-black/25 backdrop-blur sm:rounded-[34px] sm:p-6 lg:p-8">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
              MVP Training Loop
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Log today's workout.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              The canonical workout flow now saves weight, reps, and sets into
              your local stats. Finish a session, then review the results on the
              stats page.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={ROUTES.dashboard.sessionWorkout}
                className="min-h-[48px] rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-300 px-5 py-4 text-center text-sm font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_0_34px_rgba(14,165,233,0.3)] transition hover:scale-[1.01]"
              >
                Open Workout Logger
              </Link>
              <Link
                href={ROUTES.dashboard.stats}
                className="min-h-[48px] rounded-2xl border border-cyan-300/25 bg-cyan-400/10 px-5 py-4 text-center text-sm font-black uppercase tracking-[0.14em] text-cyan-300 transition hover:bg-cyan-400 hover:text-slate-950"
              >
                Review Progress
              </Link>
              <button
                type="button"
                onClick={syncLocalWorkoutData}
                disabled={!canSyncWorkoutData || isSyncingWorkoutData}
                className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-black uppercase tracking-[0.14em] text-white transition hover:border-sky-400/50 hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {isSyncingWorkoutData
                  ? "Syncing..."
                  : canSyncWorkoutData
                    ? "Sync local workout data"
                    : "Sign in to sync"}
              </button>
            </div>

            {syncStatusMessage ? (
              <p className="mt-4 rounded-2xl border border-sky-300/20 bg-sky-400/10 px-4 py-3 text-sm font-semibold text-sky-100">
                {syncStatusMessage}
              </p>
            ) : null}
            {lastSyncedLabel ? (
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Last synced {lastSyncedLabel}
              </p>
            ) : null}
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/20 backdrop-blur sm:rounded-[34px] sm:p-6">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">
              Recent Activity
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight">
              {workoutSummary.latestExercise}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {workoutSummary.mostRecentDate}
            </p>
            <div className="mt-3 inline-flex rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200">
              {statsSourceLabel}
            </div>

            {workoutSummary.hasStats ? (
              <div className="mt-5 space-y-2">
                {workoutSummary.latestEntries.map((entry, index) => (
                  <div
                    key={`${entry.date}-${entry.exerciseId}-${index}`}
                    className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3"
                  >
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-bold text-white">
                        {entry.exerciseName}
                      </span>
                      <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs font-black text-sky-300">
                        {entry.source === "workout-session"
                          ? "Workout"
                          : "Library"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      {entry.weight} x {entry.reps} x {entry.sets}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-sm leading-6 text-slate-300">
                No saved workout activity yet. Start the workout logger to
                create your first local stats entry.
              </p>
            )}
          </div>
        </section>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur"
            >
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                {card.label}
              </div>
              <div className="mt-3 break-words text-xl font-black tracking-tight text-white sm:text-2xl">
                {card.value}
              </div>
              <div className="mt-2 text-sm text-slate-400">{card.detail}</div>
            </div>
          ))}
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/15 backdrop-blur">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                Secondary Tools
              </div>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-slate-200">
                Other dashboard areas
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-500">
              These sections are still available, but the MVP flow starts with
              workout logging and stats.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {portalCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="group rounded-[24px] border border-white/10 bg-slate-950/35 p-4 transition duration-300 hover:border-sky-400/35 hover:bg-sky-500/10"
              >
                <h3 className="text-base font-black uppercase tracking-tight text-white">
                  {card.title}
                </h3>
                <p className="mt-2 min-h-[44px] text-sm leading-6 text-slate-500">
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

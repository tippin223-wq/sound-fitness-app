"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import {
  readExerciseStats,
  subscribeToLocalWorkoutData,
} from "@/lib/localData/workoutData";
import type { LocalExerciseStatEntry } from "@/types";

type StatEntry = LocalExerciseStatEntry;

export default function StatsPage() {
  const [stats, setStats] = useState<StatEntry[]>([]);

  useEffect(() => {
    const syncStats = () => setStats(readExerciseStats());

    syncStats();

    return subscribeToLocalWorkoutData(syncStats);
  }, []);

  const groupedStats = useMemo(() => {
    return stats.reduce<Record<string, StatEntry[]>>((acc, stat) => {
      if (!acc[stat.exerciseId]) acc[stat.exerciseId] = [];
      acc[stat.exerciseId].push(stat);
      return acc;
    }, {});
  }, [stats]);

  const summaries = useMemo(() => {
    return Object.entries(groupedStats).map(([exerciseId, entries]) => {
      const sorted = [...entries].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      const latest = sorted[0];
      const previous = sorted[1];

      const volume = (entry: StatEntry) =>
        Number(entry.weight || 0) *
        Number(entry.reps || 0) *
        Number(entry.sets || 0);

      const latestVolume = volume(latest);
      const previousVolume = previous ? volume(previous) : 0;
      const change = previous ? latestVolume - previousVolume : 0;

      const best = [...entries].sort((a, b) => volume(b) - volume(a))[0];

      return {
        exerciseId,
        name: latest.exerciseName,
        body: latest.body || "General",
        pattern: latest.pattern || "Movement",
        equipment: latest.equipment || "Equipment",
        latest,
        best,
        latestVolume,
        previousVolume,
        change,
        sessions: entries.length,
        entries: sorted,
      };
    });
  }, [groupedStats]);

  const totalVolume = summaries.reduce(
    (sum, item) => sum + item.latestVolume,
    0,
  );

  const topExercise = [...summaries].sort(
    (a, b) => b.latestVolume - a.latestVolume,
  )[0];

  const improvedCount = summaries.filter((item) => item.change > 0).length;

  const shareText = encodeURIComponent(
    `I just checked my Sound Fitness progress: ${summaries.length} exercises tracked, ${totalVolume.toLocaleString()} recent volume, and ${improvedCount} movements trending up. 💪`,
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_52%,#020617_100%)] text-white">
      <AppHeader />

      <section className="mx-auto w-full max-w-[1240px] space-y-6 px-3 py-6 sm:px-4 sm:py-8">
        <section className="overflow-hidden rounded-[28px] border border-yellow-300/20 bg-[radial-gradient(circle_at_20%_0%,rgba(250,204,21,0.22),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(34,211,238,0.2),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-4 shadow-[0_30px_120px_rgba(0,0,0,0.7)] sm:rounded-[44px] sm:p-6 lg:p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.35em] text-yellow-300">
                Sound Fitness Stats
              </p>

              <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight sm:text-4xl lg:text-6xl">
                Proof that your work is building something.
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-300">
                This page collects stats from saved workout sessions and the
                Exercise Library so your recent work stays visible after every
                logged set.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/dashboard/workout-builder/exercise-library"
                  className="min-h-[48px] rounded-2xl bg-gradient-to-r from-yellow-300 to-yellow-500 px-5 py-3 text-center text-sm font-black text-slate-950 shadow-[0_0_34px_rgba(250,204,21,0.28)] transition hover:scale-[1.02]"
                >
                  Add More Stats →
                </Link>

                <a
                  href={`https://twitter.com/intent/tweet?text=${shareText}`}
                  target="_blank"
                  className="min-h-[48px] rounded-2xl border border-cyan-300/25 bg-cyan-400/10 px-5 py-3 text-center text-sm font-black text-cyan-300 transition hover:bg-cyan-400 hover:text-slate-950"
                >
                  Share Progress ✦
                </a>
              </div>
            </div>

            <div className="rounded-[34px] border border-white/10 bg-slate-950/55 p-5 shadow-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">
                Progress Quote
              </p>
              <p className="mt-4 text-2xl font-black leading-tight text-white">
                “The reps you track are the reps you can improve.”
              </p>
              <p className="mt-4 text-sm leading-6 text-slate-400">
                Small wins stack fast. Keep logging, keep learning, and keep
                making every rep count.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-4">
            <div className="rounded-[28px] border border-yellow-300/20 bg-yellow-400/10 p-5">
              <p className="text-xs font-bold text-slate-400">Recent Volume</p>
              <p className="mt-2 break-words text-2xl font-black text-yellow-300 sm:text-3xl">
                {totalVolume.toLocaleString()}
              </p>
            </div>

            <div className="rounded-[28px] border border-cyan-300/20 bg-cyan-400/10 p-5">
              <p className="text-xs font-bold text-slate-400">
                Tracked Exercises
              </p>
              <p className="mt-2 break-words text-2xl font-black text-cyan-300 sm:text-3xl">
                {summaries.length}
              </p>
            </div>

            <div className="rounded-[28px] border border-emerald-300/20 bg-emerald-400/10 p-5">
              <p className="text-xs font-bold text-slate-400">Trending Up</p>
              <p className="mt-2 break-words text-2xl font-black text-emerald-300 sm:text-3xl">
                {improvedCount}
              </p>
            </div>

            <div className="rounded-[28px] border border-blue-300/20 bg-blue-400/10 p-5">
              <p className="text-xs font-bold text-slate-400">Top Movement</p>
              <p className="mt-2 text-xl font-black text-blue-300">
                {topExercise?.name || "No stats yet"}
              </p>
            </div>
          </div>
        </section>

        {summaries.length > 0 ? (
          <section className="grid gap-5 lg:grid-cols-2">
            {summaries.map((item) => (
              <article
                key={item.exerciseId}
                className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.86),rgba(2,6,23,0.96))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] transition hover:border-yellow-300/30 sm:rounded-[36px] sm:p-5"
              >
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                      {item.body} • {item.pattern}
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-white">
                      {item.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {item.equipment} • {item.sessions} tracked entries
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      item.change > 0
                        ? "bg-emerald-400/15 text-emerald-300"
                        : item.change < 0
                          ? "bg-red-400/15 text-red-300"
                          : "bg-yellow-400/15 text-yellow-300"
                    }`}
                  >
                    {item.change > 0
                      ? `+${item.change.toLocaleString()}`
                      : item.change < 0
                        ? item.change.toLocaleString()
                        : "New"}
                  </span>
                </div>

                <div className="mt-5 rounded-[26px] border border-yellow-300/15 bg-yellow-400/10 p-4">
                  <p className="text-xs font-black uppercase text-yellow-300">
                    Latest Performance
                  </p>
                  <p className="mt-2 break-words text-2xl font-black text-white sm:text-3xl">
                    {item.latest.weight} × {item.latest.reps} ×{" "}
                    {item.latest.sets}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Volume: {item.latestVolume.toLocaleString()}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                    <p className="text-xs text-slate-500">Weight</p>
                    <p className="mt-1 text-lg font-black text-white">
                      {item.latest.weight}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                    <p className="text-xs text-slate-500">Reps</p>
                    <p className="mt-1 text-lg font-black text-white">
                      {item.latest.reps}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                    <p className="text-xs text-slate-500">Sets</p>
                    <p className="mt-1 text-lg font-black text-white">
                      {item.latest.sets}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-400/10 p-4">
                  <p className="text-xs font-black uppercase text-cyan-300">
                    Coach Interpretation
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {item.change > 0
                      ? "You’re trending up. Keep the movement clean and progress gradually."
                      : item.change < 0
                        ? "This entry is lower than the previous one. That can still be smart training if it was a deload, technique day, or fatigue management session."
                        : "Great first entry. Add a few more sessions so your trend becomes meaningful."}
                  </p>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Recent Log
                  </p>

                  <div className="mt-2 space-y-2">
                    {item.entries.slice(0, 5).map((stat, index) => (
                      <div
                        key={`${stat.date}-${index}`}
                        className="flex flex-col items-start gap-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="font-black text-white">
                          {stat.weight} × {stat.reps} × {stat.sets}
                        </span>
                        <span className="break-all text-xs text-slate-500">
                          {stat.date}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const text = `${item.name}: ${item.latest.weight} × ${item.latest.reps} × ${item.latest.sets}. Progress logged with Sound Fitness. 💪`;
                    navigator.clipboard.writeText(text);
                  }}
                  className="mt-4 min-h-[48px] w-full rounded-2xl border border-yellow-300/25 bg-yellow-400/10 px-4 py-3 text-sm font-black text-yellow-300 transition hover:bg-yellow-400 hover:text-slate-950"
                >
                  Copy Share Text ✦
                </button>
              </article>
            ))}
          </section>
        ) : (
          <section className="rounded-[28px] border border-white/10 bg-white/[0.05] p-6 text-center shadow-2xl sm:rounded-[36px] sm:p-10">
            <p className="text-2xl font-black text-white sm:text-3xl">
              No stats saved yet.
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
              Start from the workout logger or add stats from the Exercise
              Library. Your saved entries will appear here automatically.
            </p>

            <Link
              href="/dashboard/workout-builder/exercise-library"
              className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-yellow-300 to-yellow-500 px-5 py-3 text-sm font-black text-slate-950 sm:w-auto"
            >
              Add First Stat →
            </Link>
          </section>
        )}
      </section>
    </main>
  );
}

"use client";

import { useState } from "react";

export default function GoalsPage() {
  const [selectedGoal, setSelectedGoal] = useState("Strength");

  const goals = [
    "Strength",
    "Weight Loss",
    "Mobility",
    "Pain Reduction",
    "Muscle Gain",
    "Consistency",
  ];

  const milestones = [
    { title: "Complete assessment", status: "Done" },
    { title: "Finish 3 workouts this week", status: "In Progress" },
    { title: "Log 2 personal wins", status: "Next" },
    { title: "Review progress with coach", status: "Upcoming" },
  ];

  const statusStyles = {
    Done: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    "In Progress": "border-sky-400/20 bg-sky-500/10 text-sky-300",
    Next: "border-amber-400/20 bg-amber-500/10 text-amber-300",
    Upcoming: "border-violet-400/20 bg-violet-500/10 text-violet-300",
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-8 text-white">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
            Goal Setting
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Turn goals into a clear plan.
          </h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Pick the main outcome, break it into milestones, and keep the next
            step obvious.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">
              Primary Goal
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              What are we focusing on?
            </h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {goals.map((goal) => (
                <button
                  key={goal}
                  onClick={() => setSelectedGoal(goal)}
                  className={`rounded-2xl border p-4 text-left font-semibold transition ${
                    selectedGoal === goal
                      ? "border-sky-400 bg-sky-500/15 text-white"
                      : "border-white/10 bg-slate-950/60 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {goal}
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-[28px] border border-sky-400/20 bg-sky-500/10 p-5">
              <p className="text-sm text-slate-300">Selected goal</p>
              <p className="mt-2 text-3xl font-bold text-sky-300">
                {selectedGoal}
              </p>
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-amber-300">
              Milestones
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              Next steps that create momentum
            </h2>

            <div className="mt-5 space-y-3">
              {milestones.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[24px] border border-white/10 bg-slate-950/60 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">{item.title}</p>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        statusStyles[item.status as keyof typeof statusStyles]
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button className="mt-5 w-full rounded-2xl bg-sky-500 px-5 py-4 font-bold text-slate-950 hover:bg-sky-400">
              Add Milestone
            </button>
          </section>
        </div>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-violet-300">
            Coach Note
          </p>

          <h2 className="mt-3 text-2xl font-bold">
            A good goal needs a next action.
          </h2>

          <p className="mt-3 max-w-3xl text-slate-300">
            The goal gives direction, but the milestone gives motion. We keep
            goals simple, measurable, and connected to weekly behaviors.
          </p>
        </section>
      </section>
    </main>
  );
}

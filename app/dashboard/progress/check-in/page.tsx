"use client";

import React, { useMemo, useState } from "react";

const habits = [
  "Completed planned workouts",
  "Hit protein / nutrition targets",
  "Did mobility or recovery work",
  "Got enough steps or light movement",
  "Logged pain, soreness, or notes honestly",
];

export default function WeeklyCheckInPage() {
  const [energy, setEnergy] = useState(7);
  const [sleep, setSleep] = useState(7);
  const [stress, setStress] = useState(5);
  const [soreness, setSoreness] = useState(4);
  const [checked, setChecked] = useState<string[]>([]);

  const readiness = useMemo(() => {
    const score = Math.round(
      (energy + sleep + (10 - stress) + (10 - soreness)) / 4,
    );
    return Math.max(1, Math.min(10, score));
  }, [energy, sleep, stress, soreness]);

  function toggleHabit(habit: string) {
    setChecked((current) =>
      current.includes(habit)
        ? current.filter((item) => item !== habit)
        : [...current, habit],
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_30%),radial-gradient(circle_at_80%_10%,_rgba(249,115,22,0.14),_transparent_26%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <section className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/25 backdrop-blur lg:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
                    Weekly Check-In
                  </div>

                  <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                    Tune the plan before it breaks you.
                  </h1>

                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                    Quick weekly feedback so Joey can adjust training, recovery,
                    and intensity before fatigue turns into missed workouts.
                  </p>
                </div>

                <div className="rounded-[28px] border border-sky-400/20 bg-sky-500/10 p-5 text-center shadow-lg shadow-sky-500/10">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-sky-200">
                    Readiness
                  </div>
                  <div className="mt-2 text-5xl font-bold tracking-tight">
                    {readiness}/10
                  </div>
                  <div className="mt-2 text-xs text-slate-300">
                    Auto-estimated from ratings
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MiniStat
                label="Energy"
                value={`${energy}/10`}
                color="text-sky-300"
              />
              <MiniStat
                label="Sleep"
                value={`${sleep}/10`}
                color="text-emerald-300"
              />
              <MiniStat
                label="Stress"
                value={`${stress}/10`}
                color="text-amber-300"
              />
              <MiniStat
                label="Soreness"
                value={`${soreness}/10`}
                color="text-violet-300"
              />
            </section>

            <section className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="mb-5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">
                  Body + Recovery
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  Rate this week
                </h2>
              </div>

              <Rating label="Energy" value={energy} setValue={setEnergy} />
              <Rating label="Sleep Quality" value={sleep} setValue={setSleep} />
              <Rating
                label="Stress Level"
                value={stress}
                setValue={setStress}
              />
              <Rating
                label="Soreness / Fatigue"
                value={soreness}
                setValue={setSoreness}
              />
            </section>

            <section className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="mb-5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                  Consistency
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  What got done?
                </h2>
              </div>

              <div className="grid gap-3">
                {habits.map((habit) => (
                  <button
                    key={habit}
                    onClick={() => toggleHabit(habit)}
                    className={`flex items-center justify-between rounded-[22px] border p-4 text-left transition ${
                      checked.includes(habit)
                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                        : "border-white/10 bg-slate-950/45 text-slate-300 hover:bg-white/[0.07]"
                    }`}
                  >
                    <span className="text-sm font-medium">{habit}</span>
                    <span className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-white/5 text-sm">
                      {checked.includes(habit) ? "✓" : ""}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300">
                Coach Context
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                What should Joey know?
              </h2>

              <textarea
                placeholder="Pain, schedule changes, wins, fatigue, stress, soreness, missed workouts, or anything that should affect next week..."
                className="mt-5 min-h-[210px] w-full resize-y rounded-[26px] border border-white/10 bg-slate-950/55 p-5 text-sm leading-6 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
              />
            </section>

            <section className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-violet-300">
                Coach Notes
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Why this matters
              </h2>

              <div className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
                <p>
                  This keeps training from becoming random. Your check-in helps
                  adjust volume, intensity, exercise selection, and recovery
                  recommendations.
                </p>

                <div className="rounded-[26px] border border-sky-400/20 bg-sky-500/10 p-5">
                  <div className="font-semibold text-white">Best practice</div>
                  <p className="mt-2 text-slate-200">
                    Be honest, not impressive. A lower score helps the plan fit
                    better.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-sky-300">
                Next Step
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Submit your check-in
              </h2>

              <div className="mt-5 flex flex-col gap-3">
                <button className="rounded-[24px] bg-sky-500 px-5 py-4 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400">
                  Submit Weekly Check-In
                </button>

                <a
                  href="/dashboard/progress"
                  className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4 text-center text-sm font-medium text-slate-200 hover:bg-white/10"
                >
                  Back to Progress
                </a>

                <a
                  href="/dashboard"
                  className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4 text-center text-sm font-medium text-slate-400 hover:bg-white/10"
                >
                  Return to Dashboard
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.055] p-5 shadow-xl shadow-black/15 backdrop-blur">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className={`mt-3 text-3xl font-bold tracking-tight ${color}`}>
        {value}
      </div>
    </div>
  );
}

function Rating({
  label,
  value,
  setValue,
}: {
  label: string;
  value: number;
  setValue: (value: number) => void;
}) {
  return (
    <div className="mb-6 last:mb-0">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium text-slate-300">{label}</div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-sky-200">
          {value}/10
        </div>
      </div>

      <div className="grid grid-cols-10 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
          <button
            key={num}
            onClick={() => setValue(num)}
            className={`rounded-2xl border px-2 py-3 text-sm font-semibold transition ${
              value === num
                ? "border-transparent bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20"
                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
}

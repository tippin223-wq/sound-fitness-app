"use client";

import Link from "next/link";
import { useState } from "react";
import AppHeader from "@/components/AppHeader";

type PlanMode = "coach" | "custom" | "hybrid";

export default function SessionsPage() {
  const [selectedPackage, setSelectedPackage] = useState("12 Session Pack");
  const [planMode, setPlanMode] = useState<PlanMode>("coach");

  const hasNextSession = true;

  const nextSession = {
    title: "Lower Body Strength",
    date: "Today",
    time: "6:30 PM",
    location: "In-Home Session",
    focus: "Squat pattern, glutes, core stability",
    coachNote:
      "Keep the first 10 minutes easy. Prioritize clean reps and knee tracking.",
  };

  const plans = {
    coach: {
      title: "Strength + Mobility Phase 1",
      type: "Coach Plan",
      phase: "Foundation",
      goal: "Build strength, improve mobility, and stay consistent",
      split: "Upper / Lower",
      weeklyTarget: "4 workouts",
      restDays: "2 recovery days",
      sessionTypes: "Strength • Mobility • Assisted Stretch",
      primaryFocus: "Strength",
      secondaryFocus: "Core stability + mobility",
      weakPoints: ["Glutes undertrained", "Upper pull volume low"],
      recovery: "Ready",
      progression: "+5 lbs when all reps are completed with clean form",
      rule: "Stop 1–2 reps before failure unless coach says otherwise.",
      note: "Follow the planned sequence. Keep lower body controlled and prioritize clean reps.",
      workouts: [
        "Lower Body Strength",
        "Upper Push + Core",
        "Upper Pull + Mobility",
      ],
    },
    custom: {
      title: "My Custom Plan",
      type: "Custom Plan",
      phase: "Flexible",
      goal: "Train based on personal preference while staying balanced",
      split: "User Selected",
      weeklyTarget: "3–5 workouts",
      restDays: "As needed",
      sessionTypes: "Custom Strength • Conditioning • Mobility",
      primaryFocus: "Personal preference",
      secondaryFocus: "App-guided balance",
      weakPoints: ["Needs push/pull review", "Needs recovery check"],
      recovery: "Needs Review",
      progression: "Add reps first, then weight when form stays clean.",
      rule: "If soreness is high, reduce volume by 20% or choose mobility.",
      note: "Build freely, but use app warnings to avoid imbalance.",
      workouts: ["Choose Workout", "Build Session", "Save Template"],
    },
    hybrid: {
      title: "Hybrid Strength Plan",
      type: "Hybrid Plan",
      phase: "Build",
      goal: "Let the client choose while the system keeps training balanced",
      split: "Guided Flexible",
      weeklyTarget: "4 workouts",
      restDays: "1–2 recovery days",
      sessionTypes: "Strength • Mobility • Optional Conditioning",
      primaryFocus: "Smart autonomy",
      secondaryFocus: "Weak-point correction",
      weakPoints: ["Posterior chain priority", "Core endurance"],
      recovery: "Balanced",
      progression: "Progress when heat map and recovery both look ready.",
      rule: "Choose what you enjoy, but follow recovery and volume guardrails.",
      note: "Best option: client preference plus coach/program guardrails.",
      workouts: ["Lower Body Priority", "Upper Strength", "Mobility + Core"],
    },
  };

  const activePlan = plans[planMode];

  const volumeTargets = [
    { muscle: "Chest", target: 14, completed: 9 },
    { muscle: "Back", target: 16, completed: 7 },
    { muscle: "Legs", target: 18, completed: 10 },
    { muscle: "Core", target: 12, completed: 6 },
  ];

  const packages = [
    {
      name: "4 Session Pack",
      total: 4,
      used: 1,
      price: "$440",
      status: "Starter",
    },
    {
      name: "12 Session Pack",
      total: 12,
      used: 5,
      price: "$1,260",
      status: "Active",
    },
    {
      name: "24 Session Pack",
      total: 24,
      used: 9,
      price: "$2,400",
      status: "Best Value",
    },
  ];

  const sessionLinks = [
    { label: "Start Workout", href: "/dashboard/sessions/workout", icon: "🏋️" },
    {
      label: "Workout Builder",
      href: "/dashboard/workout-builder",
      icon: "🧱",
    },
    {
      label: "Exercise Library",
      href: "/dashboard/workout-builder/exercise-library",
      icon: "📚",
    },
    {
      label: "Stats Dashboard",
      href: "/dashboard/stats",
      icon: "📈",
    },
    { label: "Book Session", href: "/dashboard/sessions/booking", icon: "📅" },
    {
      label: "Saved Workouts",
      href: "/dashboard/sessions/saved-workouts",
      icon: "💾",
    },
    {
      label: "Session Notes",
      href: "/dashboard/sessions/session-notes",
      icon: "📝",
    },
    { label: "History", href: "/dashboard/sessions/history", icon: "📘" },
    {
      label: "Complete Workout",
      href: "/dashboard/sessions/workout-complete",
      icon: "✅",
    },
  ];

  const recentSessions = [
    {
      date: "Apr 26",
      type: "Online Coaching",
      focus: "Workout Review",
      status: "Upcoming",
    },
    {
      date: "Apr 22",
      type: "In-Home Strength",
      focus: "Lower Body + Core",
      status: "Completed",
    },
    {
      date: "Apr 18",
      type: "In-Home Strength",
      focus: "Upper Body + Mobility",
      status: "Completed",
    },
  ];

  const active =
    packages.find((pkg) => pkg.name === selectedPackage) || packages[1];
  const remaining = active.total - active.used;
  const percentUsed = Math.round((active.used / active.total) * 100);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <AppHeader />

      <section className="mx-auto w-full max-w-[1120px] space-y-6 px-4 py-8">
        <section className="overflow-hidden rounded-[40px] border border-white/10 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.18),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))] p-6 shadow-2xl lg:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-300">
            Session Command Center
          </p>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <h1 className="max-w-3xl text-4xl font-black leading-tight lg:text-5xl">
                {hasNextSession
                  ? "Your next workout is ready."
                  : "No workout planned yet."}
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                This is your workout home base. Start the next session, follow
                your plan, or build your own workout with smart guardrails.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={
                    hasNextSession
                      ? "/dashboard/sessions/workout"
                      : "/dashboard/sessions/booking"
                  }
                  className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.25)] hover:bg-cyan-300"
                >
                  {hasNextSession
                    ? "Start Next Workout →"
                    : "Build / Book Session →"}
                </Link>

                <Link
                  href="/dashboard/sessions/saved-workouts"
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-slate-200 hover:border-cyan-300/40"
                >
                  View Saved Workouts
                </Link>
              </div>
            </div>

            <div className="rounded-[30px] border border-cyan-300/20 bg-cyan-400/10 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-300">
                Next Planned Session
              </p>

              <h2 className="mt-4 text-2xl font-black">{nextSession.title}</h2>
              <p className="mt-2 text-sm text-slate-300">
                {nextSession.date} • {nextSession.time}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {nextSession.location}
              </p>

              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <p className="text-xs font-black uppercase text-slate-400">
                  Focus
                </p>
                <p className="mt-2 text-sm leading-6 text-white">
                  {nextSession.focus}
                </p>
              </div>

              <div className="mt-3 rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-4">
                <p className="text-xs font-black uppercase text-emerald-300">
                  Coach Note
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {nextSession.coachNote}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">
                My Plan
              </p>
              <h2 className="mt-3 text-3xl font-black">{activePlan.title}</h2>
              <p className="mt-2 text-sm text-slate-400">
                {activePlan.type} • {activePlan.phase}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ["coach", "Coach Plan"],
                ["custom", "Build My Own"],
                ["hybrid", "Hybrid"],
              ].map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPlanMode(mode as PlanMode)}
                  className={`rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
                    planMode === mode
                      ? "bg-emerald-400 text-slate-950"
                      : "border border-white/10 bg-slate-950/60 text-slate-300 hover:border-emerald-300/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-cyan-300/15 bg-cyan-400/10 p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
              Goal
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              {activePlan.goal}
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {[
              ["Split", activePlan.split],
              ["Weekly Target", activePlan.weeklyTarget],
              ["Primary Focus", activePlan.primaryFocus],
              ["Recovery", activePlan.recovery],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
              >
                <p className="text-xs text-slate-400">{label}</p>
                <p className="mt-2 text-lg font-black text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              ["Rest Days", activePlan.restDays],
              ["Session Types", activePlan.sessionTypes],
              ["Secondary Focus", activePlan.secondaryFocus],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
              >
                <p className="text-xs text-slate-400">{label}</p>
                <p className="mt-2 text-sm font-bold leading-5 text-slate-200">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">
                Next 3 Workouts
              </p>

              <div className="mt-4 space-y-3">
                {activePlan.workouts.map((workout, index) => (
                  <div
                    key={workout}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3"
                  >
                    <div>
                      <p className="text-xs text-slate-500">
                        Workout {index + 1}
                      </p>
                      <p className="font-bold">{workout}</p>
                    </div>
                    <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
                      Planned
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-emerald-300/15 bg-emerald-400/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                Plan Direction
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {activePlan.note}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/dashboard/sessions/workout-builder"
                  className="rounded-2xl bg-emerald-400 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-950 hover:bg-emerald-300"
                >
                  Edit Plan
                </Link>
                <Link
                  href="/dashboard/sessions/saved-workouts"
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-200 hover:border-emerald-300/40"
                >
                  Choose Template
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
            <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300">
                Volume Targets
              </p>

              <div className="mt-4 space-y-4">
                {volumeTargets.map((item) => {
                  const percent = Math.round(
                    (item.completed / item.target) * 100,
                  );

                  return (
                    <div key={item.muscle}>
                      <div className="mb-1 flex items-center justify-between text-sm">
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

            <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-rose-300">
                Guardrails
              </p>

              <div className="mt-4 space-y-3">
                {activePlan.weakPoints.map((point) => (
                  <div
                    key={point}
                    className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-sm text-slate-300"
                  >
                    ⚠️ {point}
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-sky-300/15 bg-sky-400/10 p-4">
                <p className="text-xs font-black uppercase text-sky-300">
                  Training Rule
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {activePlan.rule}
                </p>
              </div>

              <div className="mt-3 rounded-2xl border border-violet-300/15 bg-violet-400/10 p-4">
                <p className="text-xs font-black uppercase text-violet-300">
                  Progression
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {activePlan.progression}
                </p>
              </div>
            </section>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5">
            <p className="text-sm text-slate-400">Active Package</p>
            <p className="mt-2 text-2xl font-bold text-sky-300">
              {active.name}
            </p>
          </div>

          <div className="rounded-[26px] border border-emerald-400/20 bg-emerald-500/10 p-5">
            <p className="text-sm text-emerald-300">Remaining</p>
            <p className="mt-2 text-3xl font-bold">{remaining}</p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5">
            <p className="text-sm text-slate-400">Used</p>
            <p className="mt-2 text-3xl font-bold">{active.used}</p>
          </div>
        </div>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">
            Workout Actions
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sessionLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-sky-400/50 hover:bg-sky-500/10"
              >
                <div className="text-2xl">{item.icon}</div>
                <h3 className="mt-3 text-lg font-black">{item.label}</h3>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">
              Package Selection
            </p>
            <h2 className="mt-3 text-2xl font-bold">Choose active package</h2>

            <div className="mt-5 space-y-4">
              {packages.map((pkg) => {
                const remainingSessions = pkg.total - pkg.used;

                return (
                  <button
                    key={pkg.name}
                    onClick={() => setSelectedPackage(pkg.name)}
                    className={`w-full rounded-[26px] border p-5 text-left transition ${
                      selectedPackage === pkg.name
                        ? "border-sky-400 bg-sky-500/15"
                        : "border-white/10 bg-slate-950/60 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold">{pkg.name}</h3>
                        <p className="mt-2 text-sm text-slate-400">
                          {pkg.used} used • {remainingSessions} remaining
                        </p>
                      </div>

                      <p className="text-xl font-bold text-sky-300">
                        {pkg.price}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[32px] border border-sky-400/20 bg-sky-500/10 p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
              Usage Progress
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              {active.used} of {active.total} sessions used
            </h2>

            <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-950/70">
              <div
                className="h-full rounded-full bg-sky-400 transition-all"
                style={{ width: `${percentUsed}%` }}
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-950/60 p-4">
                <p className="text-sm text-slate-400">Purchased</p>
                <p className="mt-2 text-2xl font-bold">{active.total}</p>
              </div>

              <div className="rounded-2xl bg-slate-950/60 p-4">
                <p className="text-sm text-slate-400">Remaining</p>
                <p className="mt-2 text-2xl font-bold text-emerald-300">
                  {remaining}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-950/60 p-4">
                <p className="text-sm text-slate-400">Used</p>
                <p className="mt-2 text-2xl font-bold">{active.used}</p>
              </div>
            </div>

            <button className="mt-6 w-full rounded-2xl bg-sky-500 px-5 py-4 font-bold text-slate-950 hover:bg-sky-400">
              Renew / Buy More Sessions
            </button>
          </section>
        </div>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-amber-300">
            Timeline
          </p>
          <h2 className="mt-3 text-2xl font-bold">
            Recent and upcoming sessions
          </h2>

          <div className="mt-5 space-y-3">
            {recentSessions.map((session) => (
              <div
                key={`${session.date}-${session.focus}`}
                className="grid gap-3 rounded-[24px] border border-white/10 bg-slate-950/60 p-4 md:grid-cols-4 md:items-center"
              >
                <p className="text-sm text-slate-400">{session.date}</p>
                <p className="font-semibold">{session.type}</p>
                <p className="text-sm text-slate-300">{session.focus}</p>
                <span
                  className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
                    session.status === "Completed"
                      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                      : "border-sky-400/20 bg-sky-500/10 text-sky-300"
                  }`}
                >
                  {session.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

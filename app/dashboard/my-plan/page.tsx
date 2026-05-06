"use client";

import Link from "next/link";
import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import { ROUTES } from "@/lib/routes";

type PlanMode = "coach" | "custom" | "hybrid";

export default function MyPlanPage() {
  const [planMode, setPlanMode] = useState<PlanMode>("coach");

  const plans = {
    coach: {
      title: "Strength + Mobility Phase 1",
      type: "Coach Plan",
      phase: "Foundation",
      goal: "Build strength, improve mobility, and stay consistent.",
      split: "Upper / Lower",
      weeklyTarget: "4 workouts",
      restDays: "2 recovery days",
      sessionTypes: "Strength • Mobility • Assisted Stretch",
      primaryFocus: "Strength",
      secondaryFocus: "Core stability + mobility",
      recovery: "Ready",
      rule: "Stop 1–2 reps before failure unless coach says otherwise.",
      progression: "+5 lbs when all reps are completed with clean form.",
      note: "Follow the planned sequence. Keep lower body controlled and prioritize clean reps.",
      weakPoints: ["Glutes undertrained", "Upper pull volume low"],
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
      goal: "Train based on personal preference while staying balanced.",
      split: "User Selected",
      weeklyTarget: "3–5 workouts",
      restDays: "As needed",
      sessionTypes: "Custom Strength • Conditioning • Mobility",
      primaryFocus: "Personal preference",
      secondaryFocus: "App-guided balance",
      recovery: "Needs Review",
      rule: "If soreness is high, reduce volume by 20% or choose mobility.",
      progression: "Add reps first, then weight when form stays clean.",
      note: "Build freely, but use app warnings to avoid imbalance.",
      weakPoints: ["Needs push/pull review", "Needs recovery check"],
      workouts: ["Choose Workout", "Build Session", "Save Template"],
    },
    hybrid: {
      title: "Hybrid Strength Plan",
      type: "Hybrid Plan",
      phase: "Build",
      goal: "Let the client choose while the system keeps training balanced.",
      split: "Guided Flexible",
      weeklyTarget: "4 workouts",
      restDays: "1–2 recovery days",
      sessionTypes: "Strength • Mobility • Optional Conditioning",
      primaryFocus: "Smart autonomy",
      secondaryFocus: "Weak-point correction",
      recovery: "Balanced",
      rule: "Choose what you enjoy, but follow recovery and volume guardrails.",
      progression: "Progress when heat map and recovery both look ready.",
      note: "Best option: client preference plus coach/program guardrails.",
      weakPoints: ["Posterior chain priority", "Core endurance"],
      workouts: ["Lower Body Priority", "Upper Strength", "Mobility + Core"],
    },
  };

  const activePlan = plans[planMode];

  const volumeTargets = [
    { muscle: "Chest", target: 14, completed: 9 },
    { muscle: "Back", target: 16, completed: 7 },
    { muscle: "Legs", target: 18, completed: 10 },
    { muscle: "Core", target: 12, completed: 6 },
    { muscle: "Glutes", target: 14, completed: 5 },
    { muscle: "Shoulders", target: 10, completed: 6 },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <AppHeader />

      <section className="mx-auto w-full max-w-[1120px] space-y-6 px-4 py-8">
        <section className="overflow-hidden rounded-[40px] border border-white/10 bg-[radial-gradient(circle_at_18%_8%,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_90%_20%,rgba(16,185,129,0.14),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 shadow-2xl lg:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-300">
            My Plan
          </p>

          <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="max-w-3xl text-4xl font-black leading-tight lg:text-5xl">
                Your training system.
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                Follow a coach-built plan, build your own, or use a hybrid plan
                with smart guardrails.
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
                      ? "bg-emerald-400 text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.25)]"
                      : "border border-white/10 bg-slate-950/60 text-slate-300 hover:border-emerald-300/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-300">
                Active Plan
              </p>
              <h2 className="mt-3 text-3xl font-black">{activePlan.title}</h2>
              <p className="mt-2 text-sm text-slate-400">
                {activePlan.type} • {activePlan.phase}
              </p>
            </div>

            <Link
              href="/dashboard/sessions/workout"
              className="w-fit rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.25)] hover:bg-cyan-300"
            >
              Start Next Workout →
            </Link>
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
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          {/* ACTIVE PLAN VIEW */}
          <section className="rounded-[36px] border border-white/10 bg-white/[0.05] p-5 shadow-2xl">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.26em] text-cyan-300">
                  Active Plan View
                </p>
                <h2 className="mt-2 text-2xl font-black">Your current plans</h2>
              </div>

              <Link
                href={ROUTES.dashboard.myPlan}
                className="text-sm font-bold text-slate-400 hover:text-cyan-300"
              >
                View Archived →
              </Link>
            </div>

            <div className="space-y-4">
              {activePlans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-[28px] border border-white/10 bg-slate-950/60 p-5"
                >
                  {/* HEADER */}
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-xl font-black text-white">
                        {plan.name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Created by {plan.createdBy}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold text-emerald-300">
                        Active
                      </span>
                    </div>
                  </div>

                  {/* PLAN META */}
                  <div className="mt-4 grid gap-3 md:grid-cols-4 text-sm">
                    <div>
                      <p className="text-slate-500">Goal</p>
                      <p className="font-bold text-white">{plan.goal}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Target</p>
                      <p className="font-bold text-white">
                        {plan.weeklyTarget}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Split</p>
                      <p className="font-bold text-white">{plan.split}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Focus</p>
                      <p className="font-bold text-white">{plan.focus}</p>
                    </div>
                  </div>

                  {/* FULL WEEK ROW */}
                  <div className="mt-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-300">
                      Weekly Layout
                    </p>

                    <div className="mt-3 grid grid-cols-7 gap-2">
                      {plan.week.map((day) => (
                        <div
                          key={day.day}
                          className="rounded-xl border border-white/10 bg-white/[0.035] p-2"
                        >
                          <p className="text-[10px] font-black uppercase text-cyan-300">
                            {day.day}
                          </p>

                          <p className="mt-1 text-xs font-bold text-white leading-tight">
                            {day.workout}
                          </p>

                          <p className="mt-1 text-[10px] text-slate-400 leading-tight">
                            {day.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      href={ROUTES.dashboard.myPlan}
                      className="rounded-xl bg-cyan-400 px-4 py-2 text-xs font-black text-slate-950 hover:bg-cyan-300"
                    >
                      Open Plan
                    </Link>

                    <Link
                      href={ROUTES.dashboard.sessionWorkout}
                      className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-300 hover:bg-emerald-400/15"
                    >
                      Start Workout
                    </Link>

                    <button className="rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-2 text-xs font-black text-rose-300 hover:bg-rose-400/15">
                      Archive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <section className="rounded-[32px] border border-white/10 bg-slate-950/60 p-6 shadow-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300">
              Volume Targets
            </p>

            <div className="mt-5 space-y-4">
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
          <section className="rounded-[36px] border border-emerald-300/20 bg-[radial-gradient(circle_at_20%_0%,rgba(52,211,153,0.18),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.98))] p-6 shadow-2xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-300">
                  Create a Plan
                </p>

                <h2 className="mt-3 text-3xl font-black text-white">
                  Build your training plan
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Choose a goal, weekly structure, focus areas, recovery rules,
                  and progression style. You can follow a coach plan, build your
                  own, or use a hybrid plan with smart guardrails.
                </p>
              </div>

              <Link
                href="/dashboard/my-plan/create"
                className="w-fit rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_28px_rgba(52,211,153,0.25)] hover:bg-emerald-300"
              >
                Create Plan →
              </Link>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  title: "Plan Identity",
                  items: ["Plan name", "Plan type", "Goal", "Phase"],
                  icon: "🧭",
                },
                {
                  title: "Weekly Structure",
                  items: [
                    "Training split",
                    "Weekly target",
                    "Rest days",
                    "Session types",
                  ],
                  icon: "🏗️",
                },
                {
                  title: "Training Focus",
                  items: [
                    "Primary focus",
                    "Secondary focus",
                    "Weak points",
                    "Priority muscles",
                  ],
                  icon: "🎯",
                },
                {
                  title: "Execution",
                  items: [
                    "Next 3 workouts",
                    "Today’s workout",
                    "Warm-up",
                    "Main lifts",
                  ],
                  icon: "📅",
                },
                {
                  title: "Volume Targets",
                  items: [
                    "Sets per muscle",
                    "Completed sets",
                    "Target volume",
                    "Heat map sync",
                  ],
                  icon: "🔥",
                },
                {
                  title: "Guidance Rules",
                  items: [
                    "Effort rules",
                    "Soreness rules",
                    "Missed session rules",
                    "Guardrails",
                  ],
                  icon: "🧠",
                },
                {
                  title: "Recovery",
                  items: [
                    "Ready status",
                    "Fatigue level",
                    "DOMS window",
                    "Adjustment suggestion",
                  ],
                  icon: "🧘",
                },
                {
                  title: "Progression",
                  items: [
                    "Add reps",
                    "Add weight",
                    "Deload rules",
                    "Coach notes",
                  ],
                  icon: "📈",
                },
              ].map((section) => (
                <div
                  key={section.title}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                >
                  <div className="text-2xl">{section.icon}</div>

                  <h3 className="mt-3 text-sm font-black uppercase tracking-[0.14em] text-white">
                    {section.title}
                  </h3>

                  <div className="mt-3 space-y-2">
                    {section.items.map((item) => (
                      <div key={item} className="text-sm text-slate-400">
                        • {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-slate-950/60 p-6 shadow-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-rose-300">
              Guardrails
            </p>

            <div className="mt-5 space-y-3">
              {activePlan.weakPoints.map((point) => (
                <div
                  key={point}
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-sm text-slate-300"
                >
                  ⚠️ {point}
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <p className="text-xs font-black uppercase text-slate-400">
                App Logic Coming Next
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Later this can connect to your heat map, workout logs, and
                recovery score to automatically update plan recommendations.
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
const activePlans = [
  {
    id: "1",
    name: "Strength Plan",
    createdBy: "Joey",
    goal: "Build Strength",
    weeklyTarget: "4 workouts",
    split: "Flexible",
    focus: "Strength",
    week: [
      { day: "Mon", workout: "Lower", detail: "Squat • Core" },
      { day: "Tue", workout: "Rest", detail: "" },
      { day: "Wed", workout: "Upper", detail: "Push • Pull" },
      { day: "Thu", workout: "Rest", detail: "" },
      { day: "Fri", workout: "Full", detail: "Tempo • Core" },
      { day: "Sat", workout: "Mobility", detail: "" },
      { day: "Sun", workout: "Rest", detail: "" },
    ],
  },
];

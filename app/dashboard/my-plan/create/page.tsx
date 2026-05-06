"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";

type Step = "identity" | "structure" | "focus" | "execution" | "rules";

const choices = {
  goal: [
    "Build Strength",
    "Build Muscle",
    "Lose Fat",
    "Improve Mobility",
    "Athletic Performance",
    "Return to Training",
  ],
  phase: ["Foundation", "Build", "Peak", "Deload"],
  split: [
    "Full Body",
    "Upper / Lower",
    "Push / Pull / Legs",
    "Strength + Mobility",
    "Flexible",
  ],
  weeklyTarget: [
    "2 workouts",
    "3 workouts",
    "4 workouts",
    "5 workouts",
    "6 workouts",
  ],
  progression: [
    "Add Reps First",
    "Add Weight First",
    "Double Progression",
    "Coach Controlled",
  ],
};

const suggestedFocusByGoal: Record<string, string[]> = {
  "Build Strength": ["Strength", "Technique", "Power", "Core"],
  "Build Muscle": ["Hypertrophy", "Strength", "Volume", "Upper Body"],
  "Lose Fat": ["Conditioning", "Full Body", "Core", "Mobility"],
  "Improve Mobility": ["Mobility", "Recovery", "Core", "Technique"],
  "Athletic Performance": ["Power", "Strength", "Conditioning", "Technique"],
  "Return to Training": ["Technique", "Mobility", "Recovery", "Strength"],
};

const workoutFocusOptions = [
  "Strength",
  "Hypertrophy",
  "Mobility",
  "Conditioning",
  "Core",
  "Recovery",
  "Technique",
  "Power",
  "Volume",
  "Upper Body",
  "Full Body",
];

const dayNames = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function CreatePlanPage() {
  const [step, setStep] = useState<Step>("identity");
  const [saved, setSaved] = useState(false);

  const [plan, setPlan] = useState({
    planName: "Strength + Mobility Plan",
    createdBy: "Joey / Sound Fitness",
    goal: "Build Strength",
    phase: "Foundation",
    split: "Flexible",
    weeklyTarget: "4 workouts",
    primaryFocus: "Strength",
    secondaryFocus: "Core Stability",
    progression: "Double Progression",
    notes:
      "Prioritize clean reps, consistency, and recovery before adding intensity.",
  });

  const weeklyWorkoutCount = Number(plan.weeklyTarget.split(" ")[0]) || 4;

  const [trainingDays, setTrainingDays] = useState(
    dayNames.map((day, index) => ({
      day,
      title:
        index === 0
          ? "Lower Body Strength"
          : index === 1
            ? "Upper Body Strength"
            : index === 2
              ? "Mobility + Core"
              : "Full Body Strength",
      focus: index === 2 ? "Mobility" : "Strength",
      notes: "",
    })),
  );

  const suggestedPrimaryFocus =
    suggestedFocusByGoal[plan.goal] || suggestedFocusByGoal["Build Strength"];

  const visibleTrainingDays = useMemo(() => {
    return trainingDays.slice(0, weeklyWorkoutCount);
  }, [trainingDays, weeklyWorkoutCount]);

  function update(field: keyof typeof plan, value: string) {
    setSaved(false);

    setPlan((prev) => {
      if (field === "goal") {
        const nextSuggestedFocus =
          suggestedFocusByGoal[value]?.[0] || prev.primaryFocus;

        return {
          ...prev,
          goal: value,
          primaryFocus: nextSuggestedFocus,
        };
      }

      return { ...prev, [field]: value };
    });
  }

  function updateTrainingDay(
    index: number,
    field: "day" | "title" | "focus" | "notes",
    value: string,
  ) {
    setSaved(false);
    setTrainingDays((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  function ChoiceGrid({
    field,
    items,
  }: {
    field: keyof typeof plan;
    items: string[];
  }) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const active = plan[field] === item;

          return (
            <button
              key={item}
              type="button"
              onClick={() => update(field, item)}
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-emerald-300 bg-emerald-400/15 shadow-[0_0_28px_rgba(52,211,153,0.18)]"
                  : "border-white/10 bg-slate-950/60 hover:border-cyan-300/40 hover:bg-white/[0.06]"
              }`}
            >
              <p className="font-black text-white">{item}</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                {active ? "Selected" : "Tap to choose"}
              </p>
            </button>
          );
        })}
      </div>
    );
  }

  const inputClass =
    "mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <AppHeader />

      <section className="mx-auto grid w-full max-w-[1120px] gap-6 px-4 py-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-[40px] border border-white/10 bg-[radial-gradient(circle_at_18%_8%,rgba(52,211,153,0.18),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 shadow-2xl lg:p-8">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-300">
              Create Plan
            </p>

            <h1 className="mt-4 text-4xl font-black lg:text-5xl">
              Build a training week.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
              Choose the goal first, then the app suggests a smarter focus for
              the plan.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {[
                ["identity", "1. Identity"],
                ["structure", "2. Structure"],
                ["focus", "3. Focus"],
                ["execution", "4. Training Week"],
                ["rules", "5. Rules"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStep(key as Step)}
                  className={`rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-[0.13em] transition ${
                    step === key
                      ? "bg-cyan-400 text-slate-950"
                      : "border border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            {step === "identity" && (
              <div className="space-y-6">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-300">
                  Plan Identity
                </p>

                <label className="block text-sm font-bold text-slate-300">
                  Plan Name
                  <input
                    value={plan.planName}
                    onChange={(e) => update("planName", e.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className="block text-sm font-bold text-slate-300">
                  Created By
                  <input
                    value={plan.createdBy}
                    onChange={(e) => update("createdBy", e.target.value)}
                    className={inputClass}
                  />
                </label>

                <div>
                  <p className="mb-3 text-sm font-bold text-slate-300">Goal</p>
                  <ChoiceGrid field="goal" items={choices.goal} />
                </div>

                <div>
                  <p className="mb-3 text-sm font-bold text-slate-300">Phase</p>
                  <ChoiceGrid field="phase" items={choices.phase} />
                </div>
              </div>
            )}

            {step === "structure" && (
              <div className="space-y-6">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">
                  Weekly Structure
                </p>

                <div>
                  <p className="mb-3 text-sm font-bold text-slate-300">
                    Training Split
                  </p>
                  <ChoiceGrid field="split" items={choices.split} />
                </div>

                <div>
                  <p className="mb-3 text-sm font-bold text-slate-300">
                    Workouts Per Week
                  </p>
                  <ChoiceGrid
                    field="weeklyTarget"
                    items={choices.weeklyTarget}
                  />
                </div>
              </div>
            )}

            {step === "focus" && (
              <div className="space-y-6">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-300">
                  Training Focus
                </p>

                <div className="rounded-[28px] border border-cyan-300/15 bg-cyan-400/10 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                    Goal-Based Suggestions
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Because the goal is{" "}
                    <span className="font-black text-white">{plan.goal}</span>,
                    these are the best focus options to start with.
                  </p>
                </div>

                <div>
                  <p className="mb-3 text-sm font-bold text-slate-300">
                    Suggested Primary Focus
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {suggestedPrimaryFocus.map((item) => {
                      const active = plan.primaryFocus === item;

                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => update("primaryFocus", item)}
                          className={`rounded-2xl border p-4 text-left transition ${
                            active
                              ? "border-emerald-300 bg-emerald-400/15 shadow-[0_0_28px_rgba(52,211,153,0.18)]"
                              : "border-white/10 bg-slate-950/60 hover:border-cyan-300/40 hover:bg-white/[0.06]"
                          }`}
                        >
                          <p className="font-black text-white">{item}</p>
                          <p className="mt-2 text-xs leading-5 text-slate-400">
                            {active ? "Selected" : "Suggested"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="block text-sm font-bold text-slate-300">
                  Secondary Focus
                  <input
                    value={plan.secondaryFocus}
                    onChange={(e) => update("secondaryFocus", e.target.value)}
                    className={inputClass}
                    placeholder="Example: core stability, mobility, conditioning"
                  />
                </label>
              </div>
            )}

            {step === "execution" && (
              <div className="space-y-6">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-300">
                    Training Week
                  </p>
                  <h2 className="mt-3 text-2xl font-black">
                    {weeklyWorkoutCount} workouts per week
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Change the workout count in Structure. This section will
                    automatically show the right number of training days.
                  </p>
                </div>

                <div className="space-y-4">
                  {visibleTrainingDays.map((item, index) => (
                    <section
                      key={index}
                      className="rounded-[28px] border border-white/10 bg-slate-950/60 p-5"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                            Workout Day {index + 1}
                          </p>
                          <h3 className="mt-2 text-xl font-black">
                            {item.title || "Untitled Workout"}
                          </h3>
                        </div>

                        <select
                          value={item.day}
                          onChange={(e) =>
                            updateTrainingDay(index, "day", e.target.value)
                          }
                          className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-300"
                        >
                          {dayNames.map((day) => (
                            <option key={day}>{day}</option>
                          ))}
                        </select>
                      </div>

                      <label className="mt-4 block text-sm font-bold text-slate-300">
                        Workout Name
                        <input
                          value={item.title}
                          onChange={(e) =>
                            updateTrainingDay(index, "title", e.target.value)
                          }
                          placeholder="Example: Lower Body Strength"
                          className={inputClass}
                        />
                      </label>

                      <div className="mt-4">
                        <p className="mb-3 text-sm font-bold text-slate-300">
                          Workout Focus
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {workoutFocusOptions.map((focus) => (
                            <button
                              key={focus}
                              type="button"
                              onClick={() =>
                                updateTrainingDay(index, "focus", focus)
                              }
                              className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                                item.focus === focus
                                  ? "border-emerald-300 bg-emerald-400/20 text-emerald-200"
                                  : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-cyan-300/40"
                              }`}
                            >
                              {focus}
                            </button>
                          ))}
                        </div>
                      </div>

                      <label className="mt-4 block text-sm font-bold text-slate-300">
                        Day Notes
                        <textarea
                          value={item.notes}
                          onChange={(e) =>
                            updateTrainingDay(index, "notes", e.target.value)
                          }
                          rows={3}
                          placeholder="Example: Keep RPE moderate. Focus on tempo."
                          className={inputClass}
                        />
                      </label>
                    </section>
                  ))}
                </div>
              </div>
            )}

            {step === "rules" && (
              <div className="space-y-6">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-rose-300">
                  Rules + Progression
                </p>

                <div>
                  <p className="mb-3 text-sm font-bold text-slate-300">
                    Progression Style
                  </p>
                  <ChoiceGrid field="progression" items={choices.progression} />
                </div>

                <label className="block text-sm font-bold text-slate-300">
                  Notes / Guardrails
                  <textarea
                    value={plan.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    rows={5}
                    className={inputClass}
                  />
                </label>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:h-fit">
          <section className="rounded-[34px] border border-emerald-300/20 bg-emerald-400/10 p-5 shadow-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300">
              Plan Preview
            </p>

            <h2 className="mt-3 text-2xl font-black">{plan.planName}</h2>
            <p className="mt-1 text-sm text-slate-300">
              Created by {plan.createdBy}
            </p>

            <div className="mt-5 space-y-3">
              {[
                ["Goal", plan.goal],
                ["Phase", plan.phase],
                ["Split", plan.split],
                ["Target", plan.weeklyTarget],
                ["Focus", plan.primaryFocus],
                ["Progression", plan.progression],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-slate-950/55 p-3"
                >
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-sm font-bold text-white">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/55 p-4">
              <p className="text-xs font-black uppercase text-cyan-300">
                Training Week
              </p>

              <div className="mt-3 space-y-3 text-sm text-slate-300">
                {visibleTrainingDays.map((day, index) => (
                  <div key={index}>
                    <p className="font-bold text-white">
                      {day.day}: {day.title}
                    </p>
                    <p className="text-xs text-slate-500">{day.focus}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSaved(true)}
              className="mt-5 w-full rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300"
            >
              Save Plan
            </button>

            {saved && (
              <p className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-300">
                Plan saved locally ✅
              </p>
            )}

            <Link
              href="/dashboard/my-plan"
              className="mt-3 block text-center text-sm font-bold text-cyan-300 hover:text-cyan-200"
            >
              ← Back to My Plan
            </Link>
          </section>
        </aside>
      </section>
    </main>
  );
}

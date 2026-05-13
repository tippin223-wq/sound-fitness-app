"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type AssessmentAnswers = {
  goal: string;
  experience: string;
  access: string[];
  daysPerWeek: number;
  sessionLength: string;
  preferredDays: string[];
  nutritionGoal: string;
  currentHabits: string;
  proteinConsistency: number;
  hydrationConsistency: number;
  soreness: string;
  sleepHours: number;
  painAreas: string[];
  mobilityLimitations: string[];
  cardioGoal: string;
  athleticGoal: string;
  performanceInterests: string[];
};

const STORAGE_KEY = "soundFitnessOnboardingAssessment";

const defaultAnswers: AssessmentAnswers = {
  goal: "build muscle",
  experience: "returning",
  access: ["home"],
  daysPerWeek: 3,
  sessionLength: "45 minutes",
  preferredDays: ["Mon", "Wed", "Fri"],
  nutritionGoal: "support training",
  currentHabits: "some structure",
  proteinConsistency: 5,
  hydrationConsistency: 5,
  soreness: "moderate",
  sleepHours: 7,
  painAreas: [],
  mobilityLimitations: [],
  cardioGoal: "build a base",
  athleticGoal: "general performance",
  performanceInterests: ["steps"],
};

const goals = [
  "build muscle",
  "lose fat",
  "get stronger",
  "improve mobility",
  "improve conditioning",
  "recover from pain",
  "general health",
];

const experienceLevels = ["beginner", "returning", "intermediate", "advanced"];
const accessOptions = ["gym", "home", "apartment gym", "outdoors", "limited equipment"];
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const painAreas = ["neck", "shoulders", "back", "hips", "knees", "ankles"];
const mobilityAreas = ["thoracic", "hips", "ankles", "shoulders", "wrists"];
const performanceInterests = ["steps", "running", "cycling", "sport", "conditioning"];

function safeParseAnswers(raw: string | null): Partial<AssessmentAnswers> {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function OptionButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-left text-sm font-black capitalize transition ${
        active
          ? "border-cyan-300/45 bg-cyan-300/12 text-cyan-50 shadow-[0_0_28px_rgba(34,211,238,0.16)]"
          : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300/25 hover:bg-white/[0.07]"
      }`}
    >
      {children}
    </button>
  );
}

function RangeInput({
  label,
  max,
  min,
  suffix,
  value,
  onChange,
}: {
  label: string;
  max: number;
  min: number;
  suffix?: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <label className="block rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
          {label}
        </span>
        <span className="text-sm font-black text-white">
          {value}
          {suffix}
        </span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-amber-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 w-full accent-cyan-300"
      />
    </label>
  );
}

export default function OnboardingQuestionnaire() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AssessmentAnswers>(defaultAnswers);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setAnswers({
      ...defaultAnswers,
      ...safeParseAnswers(window.localStorage.getItem(STORAGE_KEY)),
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // TODO: Persist this assessment to Supabase when onboarding profile tables are finalized.
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  }, [answers]);

  const recommendation = useMemo(() => {
    if (answers.goal.includes("pain") || answers.painAreas.length > 0) {
      return "Start with recovery-aware strength, mobility prep, and lower heat thresholds.";
    }

    if (answers.goal.includes("stronger")) {
      return "Begin with compound strength sessions, longer rests, and simple PR tracking.";
    }

    if (answers.goal.includes("fat")) {
      return "Use strength preservation, daily steps, protein consistency, and recovery-aware volume.";
    }

    if (answers.goal.includes("mobility")) {
      return "Start with mobility-first sessions and short strength anchors.";
    }

    return "Build a balanced base with full-body training, nutrition consistency, and recovery signals.";
  }, [answers]);

  const steps = [
    {
      title: "Goal",
      helper: "Pick the outcome the system should optimize first.",
      content: (
        <div className="grid gap-3 sm:grid-cols-2">
          {goals.map((goal) => (
            <OptionButton
              key={goal}
              active={answers.goal === goal}
              onClick={() => setAnswers((prev) => ({ ...prev, goal }))}
            >
              {goal}
            </OptionButton>
          ))}
        </div>
      ),
    },
    {
      title: "Experience Level",
      helper: "This helps set exercise complexity and progression speed.",
      content: (
        <div className="grid gap-3 sm:grid-cols-2">
          {experienceLevels.map((experience) => (
            <OptionButton
              key={experience}
              active={answers.experience === experience}
              onClick={() => setAnswers((prev) => ({ ...prev, experience }))}
            >
              {experience}
            </OptionButton>
          ))}
        </div>
      ),
    },
    {
      title: "Training Access",
      helper: "Select every environment that is realistic for you.",
      content: (
        <div className="grid gap-3 sm:grid-cols-2">
          {accessOptions.map((access) => (
            <OptionButton
              key={access}
              active={answers.access.includes(access)}
              onClick={() =>
                setAnswers((prev) => ({
                  ...prev,
                  access: toggleValue(prev.access, access),
                }))
              }
            >
              {access}
            </OptionButton>
          ))}
        </div>
      ),
    },
    {
      title: "Schedule",
      helper: "Make the first plan fit your real week.",
      content: (
        <div className="space-y-4">
          <RangeInput
            label="Days per week"
            min={1}
            max={7}
            value={answers.daysPerWeek}
            onChange={(daysPerWeek) =>
              setAnswers((prev) => ({ ...prev, daysPerWeek }))
            }
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {["30 minutes", "45 minutes", "60 minutes", "75 minutes", "90 minutes"].map(
              (length) => (
                <OptionButton
                  key={length}
                  active={answers.sessionLength === length}
                  onClick={() =>
                    setAnswers((prev) => ({ ...prev, sessionLength: length }))
                  }
                >
                  {length}
                </OptionButton>
              ),
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {days.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() =>
                  setAnswers((prev) => ({
                    ...prev,
                    preferredDays: toggleValue(prev.preferredDays, day),
                  }))
                }
                className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] ${
                  answers.preferredDays.includes(day)
                    ? "border-amber-300/45 bg-amber-300/12 text-amber-100"
                    : "border-white/10 bg-white/[0.04] text-slate-400"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Nutrition",
      helper: "Set the first nutrition layer without turning onboarding into homework.",
      content: (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {["build muscle", "lose fat", "maintain", "performance", "general health"].map(
              (nutritionGoal) => (
                <OptionButton
                  key={nutritionGoal}
                  active={answers.nutritionGoal === nutritionGoal}
                  onClick={() =>
                    setAnswers((prev) => ({ ...prev, nutritionGoal }))
                  }
                >
                  {nutritionGoal}
                </OptionButton>
              ),
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <RangeInput
              label="Protein consistency"
              min={1}
              max={10}
              value={answers.proteinConsistency}
              onChange={(proteinConsistency) =>
                setAnswers((prev) => ({ ...prev, proteinConsistency }))
              }
            />
            <RangeInput
              label="Hydration consistency"
              min={1}
              max={10}
              value={answers.hydrationConsistency}
              onChange={(hydrationConsistency) =>
                setAnswers((prev) => ({ ...prev, hydrationConsistency }))
              }
            />
          </div>
        </div>
      ),
    },
    {
      title: "Recovery",
      helper: "Pain, soreness, sleep, and limitations change the first plan.",
      content: (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {["low", "moderate", "high"].map((soreness) => (
              <OptionButton
                key={soreness}
                active={answers.soreness === soreness}
                onClick={() => setAnswers((prev) => ({ ...prev, soreness }))}
              >
                {soreness} soreness
              </OptionButton>
            ))}
          </div>
          <RangeInput
            label="Sleep"
            min={4}
            max={10}
            suffix=" hrs"
            value={answers.sleepHours}
            onChange={(sleepHours) =>
              setAnswers((prev) => ({ ...prev, sleepHours }))
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {painAreas.map((area) => (
              <OptionButton
                key={area}
                active={answers.painAreas.includes(area)}
                onClick={() =>
                  setAnswers((prev) => ({
                    ...prev,
                    painAreas: toggleValue(prev.painAreas, area),
                  }))
                }
              >
                {area}
              </OptionButton>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {mobilityAreas.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() =>
                  setAnswers((prev) => ({
                    ...prev,
                    mobilityLimitations: toggleValue(
                      prev.mobilityLimitations,
                      area,
                    ),
                  }))
                }
                className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] ${
                  answers.mobilityLimitations.includes(area)
                    ? "border-cyan-300/45 bg-cyan-300/12 text-cyan-100"
                    : "border-white/10 bg-white/[0.04] text-slate-400"
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Performance",
      helper: "Add conditioning or sport context if it matters right now.",
      content: (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {["build a base", "lose fat", "sport prep", "run farther", "move faster"].map(
              (cardioGoal) => (
                <OptionButton
                  key={cardioGoal}
                  active={answers.cardioGoal === cardioGoal}
                  onClick={() =>
                    setAnswers((prev) => ({ ...prev, cardioGoal }))
                  }
                >
                  {cardioGoal}
                </OptionButton>
              ),
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {performanceInterests.map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() =>
                  setAnswers((prev) => ({
                    ...prev,
                    performanceInterests: toggleValue(
                      prev.performanceInterests,
                      interest,
                    ),
                  }))
                }
                className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] ${
                  answers.performanceInterests.includes(interest)
                    ? "border-emerald-300/45 bg-emerald-300/12 text-emerald-100"
                    : "border-white/10 bg-white/[0.04] text-slate-400"
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Final Summary",
      helper: "Here is the first dashboard direction based on your answers.",
      content: (
        <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-[28px] border border-cyan-300/20 bg-cyan-300/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200">
              Recommended First Journey
            </p>
            <h3 className="mt-3 text-2xl font-black text-white">
              {answers.goal}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              {recommendation}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href="/signup"
                className="rounded-2xl bg-cyan-300 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-950"
              >
                Create Account
              </Link>
              <Link
                href="/login"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-white"
              >
                Log In
              </Link>
            </div>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              Assessment Snapshot
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                ["Experience", answers.experience],
                ["Access", answers.access.join(", ") || "Not set"],
                ["Schedule", `${answers.daysPerWeek} days / ${answers.sessionLength}`],
                ["Pain areas", answers.painAreas.join(", ") || "None selected"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="text-right font-bold capitalize text-white">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      ),
    },
  ];

  const activeStep = steps[step];

  return (
    <section className="min-h-screen bg-[#020713] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(14,165,233,0.22),transparent_32%),radial-gradient(circle_at_82%_10%,rgba(251,191,36,0.14),transparent_28%),linear-gradient(180deg,#020713_0%,#07111f_52%,#020713_100%)]" />
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <aside className="rounded-[32px] border border-white/10 bg-slate-950/70 p-5 shadow-[0_0_70px_rgba(0,0,0,0.36)] backdrop-blur">
            <p className="text-[11px] font-black uppercase tracking-[0.26em] text-cyan-300">
              Start Free Assessment
            </p>
            <h1 className="mt-4 text-4xl font-black uppercase leading-none tracking-tight sm:text-5xl">
              Build your first training map.
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Answer a few focused questions so Sound Fitness can point workouts,
              nutrition, recovery, and performance tools in the right direction.
            </p>

            <div className="mt-6 space-y-2">
              {steps.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setStep(index)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                    index === step
                      ? "border-cyan-300/45 bg-cyan-300/12 text-white"
                      : "border-white/10 bg-white/[0.035] text-slate-400 hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="text-sm font-black">{item.title}</span>
                  <span className="text-xs font-black text-slate-500">
                    {index + 1}/{steps.length}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <main className="rounded-[32px] border border-white/10 bg-slate-950/70 p-5 shadow-[0_0_70px_rgba(0,0,0,0.36)] backdrop-blur sm:p-6">
            <div className="h-2 overflow-hidden rounded-full bg-slate-900">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-amber-300 transition-all duration-500"
                style={{ width: `${((step + 1) / steps.length) * 100}%` }}
              />
            </div>

            <div className="mt-6">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                Step {step + 1} of {steps.length}
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                {activeStep.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {activeStep.helper}
              </p>
            </div>

            <div className="mt-6">{activeStep.content}</div>

            <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(current - 1, 0))}
                disabled={step === 0}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() =>
                  setStep((current) => Math.min(current + 1, steps.length - 1))
                }
                className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.24)]"
              >
                {step === steps.length - 1 ? "Review Saved" : "Continue"}
              </button>
            </div>
          </main>
        </div>
      </div>
    </section>
  );
}

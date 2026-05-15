"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TrainingJourneyNavigator from "@/components/dashboard/TrainingJourneyNavigator";
import { writeSoundFitnessProfile } from "@/lib/profile-storage";
import { ROUTES } from "@/lib/routes";

type JsonObject = Record<string, unknown>;

type GoalId =
  | "Build Muscle"
  | "Lose Fat"
  | "Maintain"
  | "Strength"
  | "General Health"
  | "Mobility"
  | "Recovery"
  | "Performance";

type GoalState = {
  primaryGoal: GoalId;
  secondaryGoal: GoalId;
  constraintGoal: string;
  goalDeadline: string;
  goalMilestones: string;
  goalPriorityRanking: string;
  currentWeight: string;
  goalWeight: string;
  targetWeeklySessions: string;
  targetWeeklySets: string;
  targetProtein: string;
  targetSteps: string;
  targetSleep: string;
  benchmarkGoal: string;
  goalMode: string;
  motivationFocus: string;
  planDirectionNotes: string;
  updatedAt?: string;
};

type ProfileSnapshot = {
  displayName: string;
  primaryGoal: string;
  secondaryGoal: string;
  goalMode: string;
  goalDeadline: string;
  goalMilestones: string;
  goalPriorityRanking: string;
  currentWeight: string;
  goalWeight: string;
  motivationFocus: string;
  planDirectionNotes: string;
  sessionsPerWeek: string;
  sleepGoal: string;
  trainingAge: string;
};

const storageKeys = [
  "soundFitnessProfile",
  "soundFitnessExerciseStats",
  "soundFitnessWorkoutLogs",
  "soundFitnessFavorites",
  "soundFitnessDraftWorkout",
  "soundFitnessPlan",
  "soundFitnessPhases",
  "soundFitnessGoals",
  "soundFitnessCalendar",
] as const;

const goalOptions: GoalId[] = [
  "Build Muscle",
  "Lose Fat",
  "Maintain",
  "Strength",
  "General Health",
  "Mobility",
  "Recovery",
  "Performance",
];

const goalPriorityOptions = [
  "Strength, recovery, consistency",
  "Muscle, strength, recovery",
  "Fat loss, steps, strength",
  "Performance, conditioning, power",
  "Mobility, pain-free movement, consistency",
  "Balanced",
  "Custom",
] as const;

const goalCards: Array<{
  id: GoalId;
  purpose: string;
  planEffect: string;
  volume: string;
  intensity: string;
  libraryFocus: string;
  phaseType: string;
}> = [
  {
    id: "Build Muscle",
    purpose: "Increase muscle size through useful weekly volume and progression.",
    planEffect: "More accessory work, muscle-group balance, and repeatable hypertrophy slots.",
    volume: "Moderate to high",
    intensity: "Controlled hard sets",
    libraryFocus: "Exercise + Nutrition",
    phaseType: "Hypertrophy block",
  },
  {
    id: "Lose Fat",
    purpose: "Support body composition while preserving strength and consistency.",
    planEffect: "Strength anchors, conditioning, steps, and recovery-aware volume.",
    volume: "Moderate",
    intensity: "Sustainable",
    libraryFocus: "Nutrition + Builder",
    phaseType: "Fat Loss base",
  },
  {
    id: "Maintain",
    purpose: "Keep strength, mobility, and muscle while life stays busy.",
    planEffect: "Efficient full-body sessions with simple progression and recovery guardrails.",
    volume: "Moderate",
    intensity: "Balanced",
    libraryFocus: "Library + Calendar",
    phaseType: "Maintenance cycle",
  },
  {
    id: "Strength",
    purpose: "Drive load progression and technical confidence on key patterns.",
    planEffect: "Compound lifts, longer rest, lower-rep strength slots, and PR tracking.",
    volume: "Moderate",
    intensity: "High but managed",
    libraryFocus: "Exercise Library",
    phaseType: "Strength block",
  },
  {
    id: "General Health",
    purpose: "Build a durable baseline of strength, movement, cardio, and consistency.",
    planEffect: "Balanced total-body training with mobility and low-friction weekly targets.",
    volume: "Base building",
    intensity: "Moderate",
    libraryFocus: "All libraries",
    phaseType: "Foundation",
  },
  {
    id: "Mobility",
    purpose: "Improve range, control, and movement quality without chasing fatigue.",
    planEffect: "More mobility slots, technique work, and tissue-friendly exercise choices.",
    volume: "Frequent small doses",
    intensity: "Low to moderate",
    libraryFocus: "Mobility + Recovery",
    phaseType: "Mobility / Recovery",
  },
  {
    id: "Recovery",
    purpose: "Lower training heat while rebuilding consistency and confidence.",
    planEffect: "Pain-aware substitutions, lower fatigue, and gradual reloading.",
    volume: "Low to moderate",
    intensity: "Conservative",
    libraryFocus: "Recovery Library",
    phaseType: "Recovery block",
  },
  {
    id: "Performance",
    purpose: "Improve power, athleticism, conditioning, and readiness for sport demands.",
    planEffect: "Carries, jumps, throws, sprints, power intent, and planned recovery.",
    volume: "Moderate",
    intensity: "Quality-first",
    libraryFocus: "Performance Library",
    phaseType: "Performance block",
  },
];

const futureGoalPlans = [
  "Build Muscle Plan",
  "Lose Fat Plan",
  "Strength Plan",
  "Recovery Plan",
  "Performance Plan",
  "General Health Plan",
] as const;

const safeJsonParse = (value: string | null): unknown => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const asRecord = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

const readLocal = (key: string) =>
  typeof window === "undefined" ? null : safeJsonParse(window.localStorage.getItem(key));

const getString = (source: JsonObject, keys: string[], fallback = "") => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return fallback;
};

const normalizeGoalId = (value: string, fallback: GoalId): GoalId => {
  const normalized = value.toLowerCase();
  return (
    goalOptions.find(
      (goal) =>
        goal.toLowerCase() === normalized ||
        normalized.includes(goal.toLowerCase()),
    ) || fallback
  );
};

const readArrayLength = (key: string) => {
  const value = readLocal(key);
  return Array.isArray(value) ? value.length : 0;
};

const countWeeklySets = (rawStats: unknown) => {
  const entries = Array.isArray(rawStats)
    ? rawStats
    : Object.values(asRecord(rawStats));
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  return entries.reduce((total, raw) => {
    const entry = asRecord(raw);
    const dateValue = getString(entry, ["date", "createdAt", "loggedAt", "updatedAt"]);
    const timestamp = dateValue ? new Date(dateValue).getTime() : now;
    const isRecent = Number.isFinite(timestamp) && now - timestamp <= sevenDays;
    const sets = Number(entry.sets ?? entry.weeklySets ?? entry.completedSets ?? 0);
    return total + (isRecent && Number.isFinite(sets) ? sets : 0);
  }, 0);
};

const defaultProfile = (): ProfileSnapshot => ({
  displayName: "Member",
  primaryGoal: "General Health",
  secondaryGoal: "Strength",
  goalMode: "General Health",
  goalDeadline: "",
  goalMilestones: "",
  goalPriorityRanking: "Strength, recovery, consistency",
  currentWeight: "",
  goalWeight: "",
  motivationFocus: "",
  planDirectionNotes: "",
  sessionsPerWeek: "4",
  sleepGoal: "7.5",
  trainingAge: "Not set",
});

const buildGoalsFromProfile = (profile: ProfileSnapshot): GoalState => ({
  primaryGoal: normalizeGoalId(profile.primaryGoal, "General Health"),
  secondaryGoal: normalizeGoalId(profile.secondaryGoal, "Strength"),
  constraintGoal: "Recovery-aware training",
  goalDeadline: profile.goalDeadline,
  goalMilestones: profile.goalMilestones,
  goalPriorityRanking: profile.goalPriorityRanking || "Strength, recovery, consistency",
  currentWeight: profile.currentWeight,
  goalWeight: profile.goalWeight,
  targetWeeklySessions: profile.sessionsPerWeek || "4",
  targetWeeklySets: "48",
  targetProtein: "150",
  targetSteps: "8000",
  targetSleep: profile.sleepGoal || "7.5",
  benchmarkGoal: "Improve one key lift or movement standard this cycle.",
  goalMode: profile.goalMode || "General Health",
  motivationFocus: profile.motivationFocus,
  planDirectionNotes: profile.planDirectionNotes,
});

const getProfileSnapshot = (): ProfileSnapshot => {
  const profile = asRecord(readLocal("soundFitnessProfile"));
  const fallback = defaultProfile();

  return {
    displayName: getString(profile, ["displayName", "fullName", "name"], fallback.displayName),
    primaryGoal: getString(profile, ["primaryGoal", "goal", "goalMode"], fallback.primaryGoal),
    secondaryGoal: getString(profile, ["secondaryGoal"], fallback.secondaryGoal),
    goalMode: getString(profile, ["goalMode", "mode"], fallback.goalMode),
    goalDeadline: getString(profile, ["goalDeadline"], fallback.goalDeadline),
    goalMilestones: getString(profile, ["goalMilestones"], fallback.goalMilestones),
    goalPriorityRanking: getString(profile, ["goalPriorityRanking"], fallback.goalPriorityRanking),
    currentWeight: getString(profile, ["currentWeight", "weight"], fallback.currentWeight),
    goalWeight: getString(profile, ["goalWeight"], fallback.goalWeight),
    motivationFocus: getString(profile, ["motivationFocus", "goalMotivation"], fallback.motivationFocus),
    planDirectionNotes: getString(profile, ["planDirectionNotes"], fallback.planDirectionNotes),
    sessionsPerWeek: getString(profile, ["sessionsPerWeek", "weeklyTarget"], fallback.sessionsPerWeek),
    sleepGoal: getString(profile, ["sleepGoal"], fallback.sleepGoal),
    trainingAge: getString(profile, ["trainingAge", "trainingLevel"], fallback.trainingAge),
  };
};

const getCoachInsight = ({
  goals,
  weeklySets,
}: {
  goals: GoalState;
  weeklySets: number;
}) => {
  const weeklyTarget = Number(goals.targetWeeklySets) || 48;
  if (weeklySets === 0) return "Start the loop with one simple full-body session, then let Progress adapt the next plan.";
  if (weeklySets < weeklyTarget * 0.4) return "Your weekly volume is still low. Build the base with compounds before adding lots of isolation.";
  if (weeklySets > weeklyTarget) return "You are ahead of target. Keep the goal, but let Recovery and Calendar protect the next few sessions.";
  if (goals.primaryGoal === "Lose Fat") return "Keep strength work focused while nutrition and steps support the body-composition goal.";
  if (goals.primaryGoal === "Strength") return "Prioritize key movement patterns, repeatable loading, and enough recovery between hard sessions.";
  return "Your goal stack is ready to feed the Library, Builder, My Plan, and future phases.";
};

function Field({
  label,
  onChange,
  value,
  suffix,
}: {
  label: string;
  onChange: (value: string) => void;
  suffix?: string;
  value: string;
}) {
  return (
    <label className="block rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      <div className="mt-3 flex items-center gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-2xl font-black text-white outline-none placeholder:text-slate-600"
          placeholder="0"
        />
        {suffix ? <span className="text-xs font-bold text-slate-500">{suffix}</span> : null}
      </div>
    </label>
  );
}

function DateField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 min-h-[48px] w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-black text-white outline-none transition focus:border-cyan-300"
      />
    </label>
  );
}

function TextAreaField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="block rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-3 min-h-[112px] w-full resize-none bg-transparent text-sm font-semibold leading-6 text-white outline-none placeholder:text-slate-600"
      />
    </label>
  );
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-[48px] w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-cyan-300"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function TranslationCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-200">{value}</p>
    </div>
  );
}

export default function GoalsPage() {
  const [profile, setProfile] = useState<ProfileSnapshot>(() => defaultProfile());
  const [goals, setGoals] = useState<GoalState>(() => buildGoalsFromProfile(defaultProfile()));
  const [weeklySets, setWeeklySets] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    const profileSnapshot = getProfileSnapshot();
    const storedGoals = asRecord(readLocal("soundFitnessGoals"));
    const nextGoals = {
      ...buildGoalsFromProfile(profileSnapshot),
      ...storedGoals,
    } as GoalState;

    setProfile(profileSnapshot);
    setGoals(nextGoals);
    setWeeklySets(countWeeklySets(readLocal("soundFitnessExerciseStats")));
    setFavoriteCount(readArrayLength("soundFitnessFavorites"));
  }, []);

  const selectedGoalCard = useMemo(
    () => goalCards.find((goal) => goal.id === goals.primaryGoal) || goalCards[4],
    [goals.primaryGoal],
  );
  const weeklyTarget = Number(goals.targetWeeklySets) || 48;
  const completion = Math.min(Math.round((weeklySets / weeklyTarget) * 100), 140);
  const coachInsight = getCoachInsight({ goals, weeklySets });
  const weightDelta =
    Number(goals.goalWeight || 0) && Number(goals.currentWeight || 0)
      ? Number(goals.goalWeight) - Number(goals.currentWeight)
      : 0;
  const goalCompletionItems = [
    goals.primaryGoal,
    goals.secondaryGoal,
    goals.goalMode,
    goals.goalPriorityRanking,
    goals.goalDeadline,
    goals.goalMilestones,
    goals.motivationFocus || goals.planDirectionNotes,
    goals.targetWeeklySessions,
    goals.benchmarkGoal,
  ];
  const goalSetupCompletion = Math.round(
    (goalCompletionItems.filter((item) => String(item || "").trim()).length /
      goalCompletionItems.length) *
      100,
  );
  const milestoneCount = goals.goalMilestones
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean).length;
  const deadlineDate = goals.goalDeadline
    ? new Date(`${goals.goalDeadline}T00:00:00`)
    : null;
  const goalDeadlineLabel =
    deadlineDate && !Number.isNaN(deadlineDate.getTime())
      ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(deadlineDate)
      : goals.goalDeadline || "Timeline open";
  const recommendedNextStep = !goals.goalDeadline
    ? "Set a realistic goal timeline so the plan can pace volume and progression."
    : !goals.goalMilestones.trim()
      ? "Add 2-3 milestones that turn the goal into visible weekly behaviors."
      : coachInsight;
  const goalPrioritySelectOptions =
    goals.goalPriorityRanking &&
    !goalPriorityOptions.includes(
      goals.goalPriorityRanking as (typeof goalPriorityOptions)[number],
    )
      ? [goals.goalPriorityRanking, ...goalPriorityOptions]
      : [...goalPriorityOptions];

  const updateGoal = <K extends keyof GoalState>(key: K, value: GoalState[K]) => {
    setGoals((current) => ({ ...current, [key]: value }));
    setSavedMessage("");
  };

  const saveGoals = () => {
    const nextGoals = { ...goals, updatedAt: new Date().toISOString() };
    const storedProfile = asRecord(readLocal("soundFitnessProfile"));
    const nextProfile = {
      ...storedProfile,
      primaryGoal: goals.primaryGoal,
      secondaryGoal: goals.secondaryGoal,
      goalMode: goals.goalMode,
      goalDeadline: goals.goalDeadline,
      goalMilestones: goals.goalMilestones,
      goalPriorityRanking: goals.goalPriorityRanking,
      motivationFocus: goals.motivationFocus,
      goalMotivation: goals.motivationFocus,
      planDirectionNotes: goals.planDirectionNotes,
      currentWeight: goals.currentWeight,
      goalWeight: goals.goalWeight,
      sessionsPerWeek: goals.targetWeeklySessions,
      sleepGoal: goals.targetSleep,
    };

    window.localStorage.setItem("soundFitnessGoals", JSON.stringify(nextGoals));
    writeSoundFitnessProfile(nextProfile);
    setGoals(nextGoals);
    setProfile(getProfileSnapshot());
    setSavedMessage("Goals saved and Profile plan direction updated.");
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_88%_10%,rgba(251,191,36,0.15),transparent_32%),linear-gradient(180deg,#020617_0%,#0f172a_48%,#020617_100%)] text-white">
      <section className="mx-auto w-full max-w-[1440px] space-y-5 px-3 py-5 sm:px-5 lg:px-8">
        <TrainingJourneyNavigator currentStep="goals" variant="full" />

        <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.20),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.62)] sm:p-6 lg:p-8">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr] xl:items-stretch">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-200">
                Desired Outcomes
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                🎯 Goals
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                Choose the outcomes your training system should build toward.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
                  Primary: {goals.primaryGoal}
                </span>
                <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-100">
                  Mode: {goals.goalMode}
                </span>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-100">
                  {goals.targetWeeklySessions || 0} sessions / wk
                </span>
                <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs font-black text-sky-100">
                  Timeline: {goalDeadlineLabel}
                </span>
                <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1 text-xs font-black text-fuchsia-100">
                  Goal setup {goalSetupCompletion}%
                </span>
              </div>
            </div>
            <div className="rounded-[30px] border border-cyan-300/15 bg-slate-950/58 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">
                Recommended Next Goal Step
              </p>
              <p className="mt-3 text-xl font-black leading-tight text-white">
                {recommendedNextStep}
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <TranslationCard label="Timeline" value={goalDeadlineLabel} />
                <TranslationCard label="Goal Progress" value={`${goalSetupCompletion}% complete`} />
                <TranslationCard label="Milestones" value={milestoneCount ? `${milestoneCount} milestone${milestoneCount === 1 ? "" : "s"} noted` : "Add milestones"} />
                <TranslationCard label="Member" value={`${profile.displayName} · ${profile.trainingAge}`} />
                <TranslationCard label="Weight Target" value={weightDelta ? `${weightDelta > 0 ? "Gain" : "Lose"} ${Math.abs(weightDelta).toLocaleString()} lb` : "Add body metrics"} />
                <TranslationCard label="Weekly Momentum" value={`${weeklySets} / ${weeklyTarget} sets · ${completion}%`} />
                <TranslationCard label="Favorites" value={`${favoriteCount} saved exercise targets`} />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-white/10 bg-slate-950/58 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
                Plan Direction
              </p>
              <h2 className="mt-2 text-2xl font-black">Choose the goal the plan should optimize for.</h2>
            </div>
            <button
              type="button"
              onClick={saveGoals}
              className="min-h-[46px] rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.24)] transition hover:bg-cyan-200"
            >
              Save Goals
            </button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {goalCards.map((goal) => {
              const active = goals.primaryGoal === goal.id;
              return (
                <article
                  key={goal.id}
                  className={`flex min-h-[310px] flex-col rounded-[28px] border p-4 transition ${
                    active
                      ? "border-cyan-300/45 bg-cyan-300/12 shadow-[0_0_36px_rgba(34,211,238,0.18)]"
                      : "border-white/10 bg-white/[0.045] hover:border-cyan-300/25 hover:bg-white/[0.07]"
                  }`}
                >
                  <p className="text-lg font-black text-white">{goal.id}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{goal.purpose}</p>
                  <div className="mt-4 grid gap-2 text-xs">
                    <TranslationCard label="Plan Effect" value={goal.planEffect} />
                    <div className="grid grid-cols-2 gap-2">
                      <TranslationCard label="Volume" value={goal.volume} />
                      <TranslationCard label="Intensity" value={goal.intensity} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <TranslationCard label="Library" value={goal.libraryFocus} />
                      <TranslationCard label="Phase" value={goal.phaseType} />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateGoal("primaryGoal", goal.id)}
                    className={`mt-auto min-h-[44px] rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.12em] transition ${
                      active
                        ? "bg-cyan-300 text-slate-950"
                        : "border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300 hover:text-slate-950"
                    }`}
                  >
                    {active ? "Selected" : "Select Goal"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="rounded-[30px] border border-white/10 bg-slate-950/58 p-5 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
              Goal Stack
            </p>
            <div className="mt-5 grid gap-4">
              <SelectField label="Primary Goal" value={goals.primaryGoal} options={goalOptions} onChange={(value) => updateGoal("primaryGoal", value as GoalId)} />
              <SelectField label="Secondary Goal" value={goals.secondaryGoal} options={goalOptions} onChange={(value) => updateGoal("secondaryGoal", value as GoalId)} />
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                  Constraint Goal
                </span>
                <input
                  value={goals.constraintGoal}
                  onChange={(event) => updateGoal("constraintGoal", event.target.value)}
                  className="mt-2 min-h-[48px] w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-cyan-300"
                />
              </label>
              <SelectField label="Goal Mode" value={goals.goalMode} options={["Bulk", "Cut", "Maintain", "Strength", "General Health", "Performance", "Recovery"]} onChange={(value) => updateGoal("goalMode", value)} />
              <SelectField label="Goal Priorities" value={goals.goalPriorityRanking} options={goalPrioritySelectOptions} onChange={(value) => updateGoal("goalPriorityRanking", value)} />
            </div>
          </section>

          <section className="rounded-[30px] border border-white/10 bg-slate-950/58 p-5 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-200">
              Goal Metrics
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Current Weight" value={goals.currentWeight} suffix="lb" onChange={(value) => updateGoal("currentWeight", value)} />
              <Field label="Goal Weight" value={goals.goalWeight} suffix="lb" onChange={(value) => updateGoal("goalWeight", value)} />
              <Field label="Weekly Sessions" value={goals.targetWeeklySessions} suffix="/ wk" onChange={(value) => updateGoal("targetWeeklySessions", value)} />
              <Field label="Weekly Sets" value={goals.targetWeeklySets} suffix="sets" onChange={(value) => updateGoal("targetWeeklySets", value)} />
              <Field label="Protein Target" value={goals.targetProtein} suffix="g" onChange={(value) => updateGoal("targetProtein", value)} />
              <Field label="Steps Target" value={goals.targetSteps} suffix="/ day" onChange={(value) => updateGoal("targetSteps", value)} />
              <Field label="Sleep Target" value={goals.targetSleep} suffix="hrs" onChange={(value) => updateGoal("targetSleep", value)} />
              <label className="block rounded-[24px] border border-white/10 bg-white/[0.045] p-4 sm:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Benchmark Goal
                </span>
                <textarea
                  value={goals.benchmarkGoal}
                  onChange={(event) => updateGoal("benchmarkGoal", event.target.value)}
                  className="mt-3 min-h-[92px] w-full resize-none bg-transparent text-sm font-semibold leading-6 text-white outline-none placeholder:text-slate-600"
                />
              </label>
            </div>
          </section>
        </section>

        <section className="rounded-[30px] border border-white/10 bg-slate-950/58 p-5 shadow-2xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-200">
                Goal Timeline & Motivation
              </p>
              <h2 className="mt-2 text-2xl font-black">Milestones, focus, and progress live here.</h2>
            </div>
            <div className="min-w-[220px] rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                <span>Goal Progress</span>
                <span className="text-cyan-100">{goalSetupCompletion}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-900">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-amber-300"
                  style={{ width: `${Math.min(goalSetupCompletion, 100)}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="grid gap-4">
              <DateField label="Goal Timeline" value={goals.goalDeadline} onChange={(value) => updateGoal("goalDeadline", value)} />
              <TranslationCard label="Timeline Summary" value={`${goalDeadlineLabel} - ${milestoneCount ? `${milestoneCount} milestone${milestoneCount === 1 ? "" : "s"}` : "milestones not set"}`} />
              <TranslationCard label="Recommended Next Goal Step" value={recommendedNextStep} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <TextAreaField label="Goal Milestones" value={goals.goalMilestones} onChange={(value) => updateGoal("goalMilestones", value)} placeholder="Example: First 4-week consistency streak, strength benchmark, measurement checkpoint..." />
              <TextAreaField label="Motivation / Focus" value={goals.motivationFocus} onChange={(value) => updateGoal("motivationFocus", value)} placeholder="What should the coach and app keep you focused on?" />
              <div className="md:col-span-2">
                <TextAreaField label="Plan Direction Notes" value={goals.planDirectionNotes} onChange={(value) => updateGoal("planDirectionNotes", value)} placeholder="Extra guidance for plan generation, tradeoffs, or goal context." />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-white/10 bg-slate-950/58 p-5 shadow-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
            Goal-to-Plan Translation
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <TranslationCard label="Exercise Library Filters" value={`${selectedGoalCard.libraryFocus} · prioritize ${goals.primaryGoal.toLowerCase()} matches`} />
            <TranslationCard label="Builder Defaults" value={`${selectedGoalCard.intensity} intensity with ${selectedGoalCard.volume.toLowerCase()} volume`} />
            <TranslationCard label="My Plan Split" value={`${goals.targetWeeklySessions || 4} sessions weekly · ${goals.constraintGoal}`} />
            <TranslationCard label="Phases" value={selectedGoalCard.phaseType} />
            <TranslationCard label="Recovery Warnings" value={goals.primaryGoal === "Recovery" ? "Lower heat threshold and mobility-first substitutions." : "Warn when volume exceeds the weekly target."} />
            <TranslationCard label="Nutrition Direction" value={goals.goalMode === "Cut" || goals.primaryGoal === "Lose Fat" ? "Protein consistency, steps, and moderate deficit support." : "Fuel performance and recovery around training."} />
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
          <section className="rounded-[30px] border border-white/10 bg-slate-950/58 p-5 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-200">
              Future Goal Plan Routes
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {futureGoalPlans.map((plan) => (
                <article key={plan} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="font-black text-white">{plan}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Goal-specific plan page architecture is ready for this path.
                  </p>
                  <span className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Coming Soon
                  </span>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[30px] border border-cyan-300/20 bg-cyan-300/10 p-5 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100">
              Continue the Workflow
            </p>
            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={saveGoals}
                className="min-h-[46px] rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-cyan-200"
              >
                Save Goal System
              </button>
              <Link href={ROUTES.dashboard.exerciseLibrary} className="min-h-[46px] rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-center text-sm font-black uppercase tracking-[0.12em] text-white transition hover:border-cyan-200/40">
                Continue to Library
              </Link>
              <Link href={ROUTES.workoutBuilder.home} className="min-h-[46px] rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-center text-sm font-black uppercase tracking-[0.12em] text-white transition hover:border-cyan-200/40">
                Build Workout
              </Link>
              <Link href={ROUTES.dashboard.plan} className="min-h-[46px] rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-center text-sm font-black uppercase tracking-[0.12em] text-white transition hover:border-cyan-200/40">
                View My Plan
              </Link>
            </div>
            {savedMessage ? (
              <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-100">
                {savedMessage}
              </p>
            ) : null}
          </section>
        </section>

        <p className="text-xs text-slate-600">
          Local data read safely from {storageKeys.join(", ")}.
        </p>
      </section>
    </main>
  );
}

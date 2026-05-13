"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TrainingJourneyNavigator from "@/components/dashboard/TrainingJourneyNavigator";
import { supabase } from "@/lib/supabaseClient";
import { ROUTES } from "@/lib/routes";
import MuscleHeatMap from "@/components/anatomy/MuscleHeatMap";

const profileStorageKey = "soundFitnessProfile";

function CameraIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function ImagePlusIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M16 5h6" />
      <path d="M19 2v6" />
      <path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5" />
      <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
      <path d="m3 16 4.5-4.5a2 2 0 0 1 2.8 0L14 15" />
    </svg>
  );
}

type ProfileTab =
  | "overview"
  | "goals"
  | "body"
  | "training"
  | "recovery"
  | "nutrition"
  | "benchmarks"
  | "preferences";

type GoalMode =
  | "Build Muscle"
  | "Lose Fat"
  | "Maintain"
  | "Strength"
  | "General Health"
  | "Mobility"
  | "Recovery"
  | "Performance";

type BodyGoalMode = "Bulk" | "Cut" | "Maintain" | "General Health";

type InjuryProfile = {
  avoidExercises: string;
  clearedByProfessional: "Yes" | "No" | "Not sure";
  notes: string;
  painLevel: number;
  preferredAlternatives: string;
  region: string;
};

type Benchmark = {
  confidence: "Low" | "Medium" | "High";
  current: string;
  dateTested: string;
  goal: string;
  id: string;
  label: string;
  linkedPattern: string;
  recommendedFocus: string;
};

type NutritionDirection = {
  calorieStyle: string;
  dietPreferences: string[];
  eatingSchedule: string;
  foodRestrictions: string;
  mealPrepPreference: string;
  nutritionGoal: string;
  proteinTarget: string;
  proteinTargetMode: "Auto estimate" | "Manual";
};

type LifestyleConstraints = {
  availableTrainingTimes: string[];
  childcareConstraints: string;
  commuteTravel: string;
  preferredReminderStyle: string;
  sleepWindow: string;
  stressLevel: number;
  workSchedule: string;
};

type AppPersonalization = {
  anatomyBackground: string;
  coachingTone: string;
  defaultDashboardFocus: string;
  preferredUnitSystem: "lbs" | "kg";
  showAnatomyHeatMap: boolean;
  showRecoveryWarnings: boolean;
  showSkillTreePoints: boolean;
};

type SoundFitnessProfile = {
  age: string;
  appPersonalization: AppPersonalization;
  benchmarks: Benchmark[];
  bodyFat: string;
  bodyGoalMode: BodyGoalMode;
  coachNotes: string;
  cardioPriority: number;
  currentWeight: string;
  displayName: string;
  energyLevel: number;
  equipment: string[];
  goalMode: GoalMode;
  goalWeight: string;
  height: string;
  injuries: InjuryProfile[];
  lifestyleConstraints: LifestyleConstraints;
  memberType: string;
  nutritionDirection: NutritionDirection;
  planDirectionNotes: string;
  preferredDays: string[];
  preferredSplit: string;
  primaryGoal: string;
  recoveryPreferences: string[];
  restingHeartRate: string;
  secondaryGoal: string;
  sessionLength: string;
  sessionsPerWeek: string;
  sleepGoal: string;
  stepsGoal: string;
  trainingAge: string;
  trainingLocation: string;
  trainingStyles: string[];
  waist: string;
  workoutIntensityPreference: string;
  cardioPreference: string;
  mobilityPreference: string;
  mobilityPriority: number;
  userNotes: string;
  profileImage: string;
  recoveryPriority: number;
  timeAvailability: number;
  trainingIntensity: number;
  updatedAt: string;
  weeklyConsistencyGoal: number;
};

const tabs: Array<{ id: ProfileTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "goals", label: "Goals" },
  { id: "body", label: "Body" },
  { id: "training", label: "Training" },
  { id: "recovery", label: "Recovery" },
  { id: "nutrition", label: "Nutrition" },
  { id: "benchmarks", label: "Benchmarks" },
  { id: "preferences", label: "Preferences" },
];

const goalCards: Array<{
  description: string;
  effect: string;
  id: GoalMode;
  signal: string;
}> = [
  {
    id: "Build Muscle",
    signal: "Volume",
    description: "More weekly volume, progressive overload, and hypertrophy accessories.",
    effect: "Raises muscle volume targets and adds accessory work.",
  },
  {
    id: "Lose Fat",
    signal: "Cut",
    description: "Strength preservation, steps or cardio, and recovery-aware volume.",
    effect: "Keeps compounds in, manages fatigue, and nudges nutrition direction.",
  },
  {
    id: "Maintain",
    signal: "Stable",
    description: "Balanced training with enough work to keep current capacity.",
    effect: "Moderates weekly targets and favors consistency.",
  },
  {
    id: "Strength",
    signal: "Load",
    description: "Lower-rep compounds, PR tracking, longer rests, and skill practice.",
    effect: "Prioritizes benchmark movements and load progression.",
  },
  {
    id: "General Health",
    signal: "Base",
    description: "Balanced total-body work, mobility, conditioning, and habit consistency.",
    effect: "Builds a realistic plan around adherence.",
  },
  {
    id: "Mobility",
    signal: "Range",
    description: "Frequency, range-of-motion exposure, and control before intensity.",
    effect: "Adds mobility blocks and lowers intensity pressure.",
  },
  {
    id: "Recovery",
    signal: "Low heat",
    description: "Lower heat thresholds, mobility, pain-aware progressions, and alternatives.",
    effect: "Makes recovery warnings and substitutions more conservative.",
  },
  {
    id: "Performance",
    signal: "Athletic",
    description: "Power, quality reps, carries, jumps, throws, and conditioning.",
    effect: "Adds athletic patterns and performance benchmarks.",
  },
];

const equipmentOptions = [
  "Bodyweight",
  "Dumbbells",
  "Kettlebells",
  "Barbell",
  "Cables",
  "Machines",
  "Bands",
  "Bench",
  "Pull-Up Bar",
  "Cardio Equipment",
];

const dayOptions = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const splitOptions = [
  "Full Body",
  "Upper / Lower",
  "Push / Pull / Legs",
  "Body Part Split",
  "Strength + Mobility",
  "Performance",
  "Custom",
];

const trainingStyleOptions = [
  {
    id: "Heavy Strength",
    description: "Compound lifts, lower reps, longer rests, and benchmark focus.",
  },
  {
    id: "Muscle Building",
    description: "Higher weekly volume, accessories, and progressive overload.",
  },
  {
    id: "Athletic",
    description: "Jumps, carries, sprints, throws, rotation, and power intent.",
  },
  {
    id: "Calisthenics",
    description: "Bodyweight strength, skill progressions, and joint control.",
  },
  {
    id: "Mobility First",
    description: "Range, control, and low-friction movement frequency.",
  },
  {
    id: "Low Impact",
    description: "Machines, controlled tempo, and lower joint stress choices.",
  },
  {
    id: "Conditioning",
    description: "Density, work capacity, circuits, and cardiovascular support.",
  },
  {
    id: "Beginner Friendly",
    description: "Simple patterns, clear cues, and repeatable progressions.",
  },
];

const injuryRegions = [
  "Neck",
  "Shoulders",
  "Elbows",
  "Wrists",
  "Back",
  "Hips",
  "Knees",
  "Ankles",
  "Feet",
];

const recoveryOptions = [
  "Mobility",
  "Stretching",
  "Activation",
  "Low-load technique",
  "Walking/cardio",
  "Breathing",
];

const dietPreferenceOptions = [
  "High protein",
  "Meal prep",
  "Simple meals",
  "Vegetarian",
  "Mediterranean",
  "Low dairy",
  "Lower carb",
  "Flexible",
];

const availableTimeOptions = [
  "Early morning",
  "Lunch",
  "Afternoon",
  "Evening",
  "Late night",
  "Weekend blocks",
];

const defaultBenchmarks: Benchmark[] = [
  {
    id: "bench-press",
    label: "Bench Press Max",
    current: "",
    goal: "",
    dateTested: "",
    confidence: "Medium",
    linkedPattern: "Chest Press, Triceps Extension, Row",
    recommendedFocus: "Pressing strength with enough upper-back balance.",
  },
  {
    id: "squat",
    label: "Squat Max",
    current: "",
    goal: "",
    dateTested: "",
    confidence: "Medium",
    linkedPattern: "Squat, Knee Extension, Lunge",
    recommendedFocus: "Knee-dominant strength and bracing capacity.",
  },
  {
    id: "deadlift",
    label: "Deadlift Max",
    current: "",
    goal: "",
    dateTested: "",
    confidence: "Medium",
    linkedPattern: "Hinge, Row, Core",
    recommendedFocus: "Posterior-chain strength and trunk stiffness.",
  },
  {
    id: "overhead-press",
    label: "Overhead Press Max",
    current: "",
    goal: "",
    dateTested: "",
    confidence: "Medium",
    linkedPattern: "Shoulder Press, Rotator Cuff, Triceps Extension",
    recommendedFocus: "Shoulder strength with stability support.",
  },
  {
    id: "pull-ups",
    label: "Max Pull-Ups",
    current: "",
    goal: "",
    dateTested: "",
    confidence: "Medium",
    linkedPattern: "Vertical Pull, Row, Curl, Pullover",
    recommendedFocus: "Vertical pulling and lat strength.",
  },
  {
    id: "push-ups",
    label: "Max Push-Ups",
    current: "",
    goal: "",
    dateTested: "",
    confidence: "Medium",
    linkedPattern: "Chest Press, Core, Triceps Extension",
    recommendedFocus: "Pressing endurance and trunk position.",
  },
  {
    id: "plank",
    label: "Plank Hold",
    current: "",
    goal: "",
    dateTested: "",
    confidence: "Medium",
    linkedPattern: "Anti-Extension, Deep Core",
    recommendedFocus: "Core endurance and bracing control.",
  },
  {
    id: "mile-time",
    label: "Mile Time",
    current: "",
    goal: "",
    dateTested: "",
    confidence: "Medium",
    linkedPattern: "Conditioning, Running, Recovery",
    recommendedFocus: "Aerobic base and pacing.",
  },
  {
    id: "sissy-squat-depth",
    label: "Sissy Squat Depth",
    current: "",
    goal: "",
    dateTested: "",
    confidence: "Medium",
    linkedPattern: "Knee Extension, Quads, Mobility",
    recommendedFocus: "Quad tolerance and knee range.",
  },
  {
    id: "split-squat-depth",
    label: "Split Squat Depth",
    current: "",
    goal: "",
    dateTested: "",
    confidence: "Medium",
    linkedPattern: "Lunge, Step-Up, Hip Mobility",
    recommendedFocus: "Single-leg control and hip position.",
  },
  {
    id: "hip-mobility",
    label: "Hip Mobility Score",
    current: "",
    goal: "",
    dateTested: "",
    confidence: "Medium",
    linkedPattern: "Hip Mobility, Squat, Hinge",
    recommendedFocus: "Hip range and pelvic control.",
  },
  {
    id: "shoulder-mobility",
    label: "Shoulder Mobility Score",
    current: "",
    goal: "",
    dateTested: "",
    confidence: "Medium",
    linkedPattern: "Shoulder Mobility, Press, Pull",
    recommendedFocus: "Overhead range and scapular control.",
  },
];

const defaultProfile: SoundFitnessProfile = {
  age: "",
  appPersonalization: {
    anatomyBackground: "Seattle",
    coachingTone: "Encouraging",
    defaultDashboardFocus: "Training plan",
    preferredUnitSystem: "lbs",
    showAnatomyHeatMap: true,
    showRecoveryWarnings: true,
    showSkillTreePoints: true,
  },
  benchmarks: defaultBenchmarks,
  bodyFat: "",
  bodyGoalMode: "Maintain",
  coachNotes: "",
  cardioPriority: 5,
  currentWeight: "",
  displayName: "Member",
  energyLevel: 6,
  equipment: ["Bodyweight", "Dumbbells"],
  goalMode: "Strength",
  goalWeight: "",
  height: "",
  injuries: [],
  lifestyleConstraints: {
    availableTrainingTimes: ["Evening"],
    childcareConstraints: "",
    commuteTravel: "",
    preferredReminderStyle: "Simple reminder",
    sleepWindow: "",
    stressLevel: 4,
    workSchedule: "",
  },
  memberType: "Online Training Member",
  nutritionDirection: {
    calorieStyle: "Habit based",
    dietPreferences: ["High protein", "Simple meals"],
    eatingSchedule: "",
    foodRestrictions: "",
    mealPrepPreference: "Flexible",
    nutritionGoal: "Maintain",
    proteinTarget: "",
    proteinTargetMode: "Auto estimate",
  },
  planDirectionNotes: "",
  preferredDays: ["Mon", "Wed", "Fri", "Sat"],
  preferredSplit: "Strength + Mobility",
  primaryGoal: "Strength + Mobility Plan",
  recoveryPreferences: ["Mobility", "Walking/cardio"],
  restingHeartRate: "",
  secondaryGoal: "",
  sessionLength: "45 minutes",
  sessionsPerWeek: "4",
  sleepGoal: "7-8 hours",
  stepsGoal: "",
  trainingAge: "Intermediate",
  trainingLocation: "Gym",
  trainingStyles: ["Heavy Strength", "Mobility First"],
  waist: "",
  workoutIntensityPreference: "Moderate hard",
  cardioPreference: "Zone 2 plus short finishers",
  mobilityPreference: "Daily 8-12 minute resets",
  mobilityPriority: 6,
  userNotes: "",
  profileImage: "",
  recoveryPriority: 6,
  timeAvailability: 5,
  trainingIntensity: 6,
  updatedAt: "",
  weeklyConsistencyGoal: 80,
};

const safeNumber = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getSleepGoalHours = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? clampNumber(parsed, 4, 10) : 7.5;
};

const getTrainingIntensityLabel = (value: number) => {
  if (value <= 2) return "Easy";
  if (value <= 4) return "Moderate";
  if (value <= 7) return "Moderate hard";
  if (value <= 9) return "Hard";
  return "Autoregulated";
};

const toggleArrayValue = (items: string[], value: string) =>
  items.includes(value)
    ? items.filter((item) => item !== value)
    : [...items, value];

const mergeProfile = (saved: Partial<SoundFitnessProfile>): SoundFitnessProfile => ({
  ...defaultProfile,
  ...saved,
  appPersonalization: {
    ...defaultProfile.appPersonalization,
    ...(saved.appPersonalization || {}),
  },
  benchmarks:
    Array.isArray(saved.benchmarks) && saved.benchmarks.length
      ? defaultBenchmarks.map((benchmark) => ({
          ...benchmark,
          ...(saved.benchmarks || []).find((item) => item.id === benchmark.id),
        }))
      : defaultBenchmarks,
  equipment: Array.isArray(saved.equipment) ? saved.equipment : defaultProfile.equipment,
  injuries: Array.isArray(saved.injuries) ? saved.injuries : [],
  lifestyleConstraints: {
    ...defaultProfile.lifestyleConstraints,
    ...(saved.lifestyleConstraints || {}),
    availableTrainingTimes: Array.isArray(
      saved.lifestyleConstraints?.availableTrainingTimes,
    )
      ? saved.lifestyleConstraints.availableTrainingTimes
      : defaultProfile.lifestyleConstraints.availableTrainingTimes,
  },
  nutritionDirection: {
    ...defaultProfile.nutritionDirection,
    ...(saved.nutritionDirection || {}),
    dietPreferences: Array.isArray(saved.nutritionDirection?.dietPreferences)
      ? saved.nutritionDirection.dietPreferences
      : defaultProfile.nutritionDirection.dietPreferences,
  },
  preferredDays: Array.isArray(saved.preferredDays)
    ? saved.preferredDays
    : defaultProfile.preferredDays,
  recoveryPreferences: Array.isArray(saved.recoveryPreferences)
    ? saved.recoveryPreferences
    : defaultProfile.recoveryPreferences,
  trainingStyles: Array.isArray(saved.trainingStyles)
    ? saved.trainingStyles
    : defaultProfile.trainingStyles,
});

const formatSavedTime = (isoDate: string) => {
  if (!isoDate) return "Not saved yet";

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Not saved yet";

  return date.toLocaleString(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  });
};

function Field({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-400">
      {label}
      <input
        className="mt-2 min-h-[46px] w-full rounded-2xl border border-white/10 bg-slate-950/58 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/50 focus:bg-white/[0.07]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function TextAreaField({
  label,
  onChange,
  placeholder,
  rows = 4,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  value: string;
}) {
  return (
    <label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-400">
      {label}
      <textarea
        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/58 px-4 py-3 text-sm font-semibold leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/50 focus:bg-white/[0.07]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
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
    <label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-400">
      {label}
      <select
        className="mt-2 min-h-[46px] w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-cyan-200/50 focus:bg-slate-900"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Chip({
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
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.1em] transition ${
        active
          ? "border-cyan-200/45 bg-cyan-300/16 text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.14)]"
          : "border-white/10 bg-white/[0.045] text-slate-400 hover:border-cyan-200/28 hover:bg-cyan-300/10 hover:text-cyan-100"
      }`}
    >
      {children}
    </button>
  );
}

function AnimatedProfileSlider({
  color = "cyan",
  helper,
  label,
  max,
  min,
  onChange,
  step = 1,
  unit = "",
  value,
}: {
  color?: "cyan" | "orange" | "emerald" | "rose" | "violet";
  helper: string;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step?: number;
  unit?: string;
  value: number;
}) {
  const safeValue = clampNumber(value, min, max);
  const percent = ((safeValue - min) / Math.max(1, max - min)) * 100;
  const colorClasses = {
    cyan: "from-cyan-300 to-blue-400 shadow-cyan-300/30 text-cyan-100",
    emerald: "from-emerald-300 to-teal-400 shadow-emerald-300/30 text-emerald-100",
    orange: "from-orange-300 to-yellow-300 shadow-orange-300/30 text-orange-100",
    rose: "from-rose-300 to-red-400 shadow-rose-300/30 text-rose-100",
    violet: "from-violet-300 to-fuchsia-400 shadow-violet-300/30 text-violet-100",
  }[color];
  const valueTextClass = {
    cyan: "text-cyan-100",
    emerald: "text-emerald-100",
    orange: "text-orange-100",
    rose: "text-rose-100",
    violet: "text-violet-100",
  }[color];

  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-950/54 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            {label}
          </p>
          <p className={`mt-1 text-2xl font-black ${valueTextClass}`}>
            {safeValue}
            {unit}
          </p>
        </div>
        <span className="rounded-2xl border border-white/10 bg-white/[0.055] px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-300">
          {Math.round(percent)}%
        </span>
      </div>
      <div className="relative mt-4 h-4 rounded-full border border-white/10 bg-slate-950/80 p-1">
        <span
          className={`block h-full rounded-full bg-gradient-to-r ${colorClasses} shadow-[0_0_18px_currentColor] transition-[width] duration-300`}
          style={{ width: `${percent}%` }}
        />
        <input
          aria-label={label}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          max={max}
          min={min}
          onChange={(event) => onChange(Number(event.target.value))}
          step={step}
          type="range"
          value={safeValue}
        />
      </div>
      <p className="mt-3 text-xs font-semibold leading-5 text-slate-400">
        {helper}
      </p>
    </div>
  );
}

function Panel({
  children,
  className = "",
  eyebrow,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  eyebrow?: string;
  subtitle?: string;
  title: string;
}) {
  return (
    <section
      className={`rounded-[28px] border border-white/10 bg-white/[0.055] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl ${className}`}
    >
      <div className="mb-5">
        {eyebrow ? (
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200/80">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-2xl font-black text-white">{title}</h2>
        {subtitle ? (
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-400">
            {subtitle}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function ClientProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState<SoundFitnessProfile>(defaultProfile);
  const [savedSnapshot, setSavedSnapshot] = useState(
    JSON.stringify(defaultProfile),
  );

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      let nextProfile = defaultProfile;

      if (typeof window !== "undefined") {
        const saved = window.localStorage.getItem(profileStorageKey);
        if (saved) {
          try {
            nextProfile = mergeProfile(JSON.parse(saved));
          } catch {
            nextProfile = defaultProfile;
          }
        }
      }

      try {
        const { data } = await supabase.auth.getUser();
        const authName =
          data.user?.user_metadata?.full_name ||
          data.user?.user_metadata?.name ||
          data.user?.email?.split("@")[0] ||
          "";

        if (authName && (!nextProfile.displayName || nextProfile.displayName === "Member")) {
          nextProfile = { ...nextProfile, displayName: authName };
        }
      } catch {
        // Auth is only a name fallback; local profile data remains the source of truth.
      }

      if (!isMounted) return;

      setProfile(nextProfile);
      setSavedSnapshot(JSON.stringify(nextProfile));
      setLoading(false);
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(profile) !== savedSnapshot,
    [profile, savedSnapshot],
  );

  const goalDelta = useMemo(() => {
    const current = safeNumber(profile.currentWeight);
    const goal = safeNumber(profile.goalWeight);
    if (!current || !goal) return null;
    return Math.round((current - goal) * 10) / 10;
  }, [profile.currentWeight, profile.goalWeight]);

  const activeLimitations = profile.injuries.filter((injury) => injury.painLevel > 0);

  const planSummary = useMemo(() => {
    const injuryText = activeLimitations.length
      ? `It should respect ${activeLimitations.map((item) => item.region).join(", ")} limitations.`
      : "No active limitation has been added yet.";
    const nutritionText =
      profile.bodyGoalMode === "Cut" || profile.goalMode === "Lose Fat"
        ? "Nutrition should support a moderate deficit and protein consistency."
        : profile.bodyGoalMode === "Bulk" || profile.goalMode === "Build Muscle"
          ? "Nutrition should support sufficient protein and steady training fuel."
          : "Nutrition should support consistency and recovery.";

    return `Based on this profile, the app should prioritize ${profile.primaryGoal || profile.goalMode}, ${profile.bodyGoalMode.toLowerCase()} body direction, ${profile.sessionsPerWeek || "4"} sessions per week, ${profile.preferredSplit}, and ${profile.trainingStyles.join(", ") || "balanced training"}. ${injuryText} ${nutritionText}`;
  }, [
    activeLimitations,
    profile.bodyGoalMode,
    profile.goalMode,
    profile.preferredSplit,
    profile.primaryGoal,
    profile.sessionsPerWeek,
    profile.trainingStyles,
  ]);

  const setProfileField = <K extends keyof SoundFitnessProfile>(
    key: K,
    value: SoundFitnessProfile[K],
  ) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const handleProfileImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (result) setProfileField("profileImage", result);
    };
    reader.readAsDataURL(file);
  };

  const updateNutrition = <K extends keyof NutritionDirection>(
    key: K,
    value: NutritionDirection[K],
  ) => {
    setProfile((current) => ({
      ...current,
      nutritionDirection: {
        ...current.nutritionDirection,
        [key]: value,
      },
    }));
  };

  const updateLifestyle = <K extends keyof LifestyleConstraints>(
    key: K,
    value: LifestyleConstraints[K],
  ) => {
    setProfile((current) => ({
      ...current,
      lifestyleConstraints: {
        ...current.lifestyleConstraints,
        [key]: value,
      },
    }));
  };

  const updatePersonalization = <K extends keyof AppPersonalization>(
    key: K,
    value: AppPersonalization[K],
  ) => {
    setProfile((current) => ({
      ...current,
      appPersonalization: {
        ...current.appPersonalization,
        [key]: value,
      },
    }));
  };

  const toggleProfileArray = (
    key: "equipment" | "preferredDays" | "recoveryPreferences" | "trainingStyles",
    value: string,
  ) => {
    setProfile((current) => ({
      ...current,
      [key]: toggleArrayValue(current[key], value),
    }));
  };

  const toggleNutritionPreference = (value: string) => {
    updateNutrition(
      "dietPreferences",
      toggleArrayValue(profile.nutritionDirection.dietPreferences, value),
    );
  };

  const toggleTrainingTime = (value: string) => {
    updateLifestyle(
      "availableTrainingTimes",
      toggleArrayValue(profile.lifestyleConstraints.availableTrainingTimes, value),
    );
  };

  const toggleInjuryRegion = (region: string) => {
    setProfile((current) => {
      const exists = current.injuries.some((injury) => injury.region === region);
      return {
        ...current,
        injuries: exists
          ? current.injuries.filter((injury) => injury.region !== region)
          : [
              ...current.injuries,
              {
                avoidExercises: "",
                clearedByProfessional: "Not sure",
                notes: "",
                painLevel: 3,
                preferredAlternatives: "",
                region,
              },
            ],
      };
    });
  };

  const updateInjury = (
    region: string,
    key: keyof InjuryProfile,
    value: string | number,
  ) => {
    setProfile((current) => ({
      ...current,
      injuries: current.injuries.map((injury) =>
        injury.region === region ? { ...injury, [key]: value } : injury,
      ),
    }));
  };

  const updateBenchmark = (
    id: string,
    key: keyof Benchmark,
    value: string,
  ) => {
    setProfile((current) => ({
      ...current,
      benchmarks: current.benchmarks.map((benchmark) =>
        benchmark.id === id ? { ...benchmark, [key]: value } : benchmark,
      ),
    }));
  };

  const saveProfile = () => {
    const nextProfile = {
      ...profile,
      updatedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(profileStorageKey, JSON.stringify(nextProfile));
    setProfile(nextProfile);
    setSavedSnapshot(JSON.stringify(nextProfile));
    setMessage("Profile saved locally.");
    window.setTimeout(() => setMessage(""), 2400);
  };

  const resetChanges = () => {
    try {
      setProfile(JSON.parse(savedSnapshot));
      setMessage("Changes reset.");
      window.setTimeout(() => setMessage(""), 2000);
    } catch {
      setProfile(defaultProfile);
    }
  };

  const resetToDefaults = () => {
    const nextProfile = {
      ...defaultProfile,
      displayName: profile.displayName || defaultProfile.displayName,
    };

    setProfile(nextProfile);
    setMessage("Profile reset to defaults. Save to sync it.");
    window.setTimeout(() => setMessage(""), 2600);
  };

  const renderHero = () => (
    <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.22),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(251,146,60,0.18),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.94))] p-5 shadow-[0_34px_120px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.14)] sm:p-7">
      <div className="pointer-events-none absolute right-[-10%] top-[-30%] h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-center">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-200/80">
            Personal Command Center
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="relative h-24 w-24 shrink-0 overflow-visible rounded-full border border-cyan-100/24 bg-cyan-300/12 shadow-[0_0_40px_rgba(34,211,238,0.18)]">
              <div className="h-full w-full overflow-hidden rounded-full">
                {profile.profileImage ? (
                  <img
                    alt={`${profile.displayName || "Member"} profile`}
                    className="h-full w-full object-cover"
                    src={profile.profileImage}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_32%_24%,rgba(34,211,238,0.26),transparent_42%),rgba(8,47,73,0.62)] text-3xl font-black text-cyan-100">
                    {profile.displayName.trim().slice(0, 2).toUpperCase() || "SF"}
                  </div>
                )}
              </div>
              <label
                className="absolute -bottom-1 -right-1 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-cyan-100/35 bg-slate-950 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.22)] transition hover:bg-cyan-300 hover:text-slate-950"
                title="Add Photo"
                aria-label="Add Photo"
              >
                {profile.profileImage ? (
                  <CameraIcon className="h-4 w-4" />
                ) : (
                  <ImagePlusIcon className="h-4 w-4" />
                )}
                <input
                  accept="image/*"
                  className="sr-only"
                  onChange={handleProfileImageChange}
                  type="file"
                />
              </label>
              {profile.profileImage ? (
                <button
                  type="button"
                  onClick={() => setProfileField("profileImage", "")}
                  className="absolute -bottom-1 -left-1 flex h-10 w-10 items-center justify-center rounded-full border border-red-200/30 bg-slate-950 text-[10px] font-black uppercase tracking-[0.1em] text-red-100 shadow-[0_0_22px_rgba(248,113,113,0.16)] transition hover:bg-red-400 hover:text-slate-950"
                  title="Remove Photo"
                  aria-label="Remove Photo"
                >
                  X
                </button>
              ) : null}
            </div>
            <div className="min-w-0">
              <Field
                label="Display Name"
                onChange={(value) => setProfileField("displayName", value)}
                placeholder="Member"
                value={profile.displayName}
              />
            </div>
          </div>
          <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl">
            {profile.primaryGoal || "Goal not set"}
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-300">
            Define the training identity that powers dashboard focus, workout generation, exercise recommendations, recovery thresholds, and nutrition direction.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              `Goal: ${profile.goalMode}`,
              `Mode: ${profile.bodyGoalMode}`,
              `Training Age: ${profile.trainingAge || "Add training age"}`,
              `Weekly Target: ${profile.sessionsPerWeek || "0"} sessions`,
              profile.memberType || "Member",
            ].map((chip) => (
              <span
                key={chip}
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-slate-200"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-slate-950/48 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-200">
                Plan Readiness
              </p>
              <p className="mt-2 text-4xl font-black text-white">
                {Math.min(
                  100,
                  20 +
                    (profile.primaryGoal ? 15 : 0) +
                    (profile.currentWeight ? 10 : 0) +
                    (profile.goalWeight ? 10 : 0) +
                    (profile.equipment.length ? 15 : 0) +
                    (profile.trainingStyles.length ? 15 : 0) +
                    (profile.preferredDays.length ? 15 : 0),
                )}
                %
              </p>
            </div>
            <div className="relative grid h-24 w-24 place-items-center rounded-full border border-cyan-100/20 bg-cyan-300/10">
              <span className="absolute inset-2 rounded-full border-4 border-cyan-300/60 border-r-orange-300/70" />
              <span className="text-xs font-black uppercase tracking-[0.12em] text-cyan-100">
                Sync
              </span>
            </div>
          </div>
          <p className="mt-4 text-xs font-semibold leading-5 text-slate-400">
            The more complete this profile is, the smarter plan generation, substitutions, recovery guidance, and goal targets can become.
          </p>
        </div>
      </div>
    </section>
  );

  const renderGoalCompass = () => (
    <Panel
      eyebrow="Goal Compass"
      title="Choose the plan direction"
      subtitle="These goal modes are training logic inputs, not app settings. They should shape volume, exercise selection, nutrition guidance, and recovery thresholds."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {goalCards.map((goal) => {
          const isActive = profile.goalMode === goal.id;
          return (
            <button
              key={goal.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => {
                setProfileField("goalMode", goal.id);
                setProfileField("primaryGoal", `${goal.id} Plan`);
              }}
              className={`group min-h-[180px] rounded-[26px] border p-4 text-left transition hover:-translate-y-1 ${
                isActive
                  ? "border-cyan-200/45 bg-cyan-300/12 shadow-[0_0_34px_rgba(34,211,238,0.18)]"
                  : "border-white/10 bg-slate-950/44 hover:border-cyan-200/25 hover:bg-white/[0.065]"
              }`}
            >
              <span className="inline-flex rounded-2xl border border-white/10 bg-white/[0.055] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
                {goal.signal}
              </span>
              <p className="mt-3 text-lg font-black text-white">{goal.id}</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
                {goal.description}
              </p>
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.1em] text-orange-200/90">
                {goal.effect}
              </p>
            </button>
          );
        })}
      </div>
    </Panel>
  );

  const renderPlanArchitecturePreview = () => {
    const architectureItems: Array<{
      href?: string;
      label: string;
      status: string;
    }> = [
      // Canonical route: /dashboard/exercise-library.
      {
        href: ROUTES.dashboard.exerciseLibrary,
        label: "Exercise Library",
        status: "Exercises",
      },
      // Existing route: /dashboard/workout-builder.
      {
        href: ROUTES.workoutBuilder.home,
        label: "🛠 Builder",
        status: "Workouts",
      },
      // Future canonical route: /dashboard/plan. Current safe member plan route is /dashboard/my-plan.
      {
        href: ROUTES.dashboard.myPlan,
        label: "Plan",
        status: "Plans",
      },
      // Future route: /dashboard/phases. Exercises build workouts, workouts build plans,
      // plans build phases, and phases create periodization.
      {
        label: "Phases",
        status: "Future",
      },
      {
        // Existing route: /dashboard/progress.
        href: ROUTES.dashboard.progress,
        label: "Progress",
        status: "Adaptation",
      },
    ];

    return (
      <Panel
        eyebrow="Plan Architecture"
        title="How this profile shapes the training system"
        subtitle="Your profile settings help shape workouts, plans, and future training phases."
      >
        <div className="grid gap-3 md:grid-cols-5">
          {architectureItems.map((item, index) => {
            const card = (
              <div className="h-full rounded-[24px] border border-white/10 bg-slate-950/50 p-4 transition hover:border-cyan-200/30 hover:bg-cyan-300/10">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-cyan-100/20 bg-cyan-300/12 text-xs font-black text-cyan-100">
                  {index + 1}
                </span>
                <p className="mt-3 text-sm font-black text-white">{item.label}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                  {item.status}
                </p>
              </div>
            );

            return item.href ? (
              <Link key={item.label} href={item.href}>
                {card}
              </Link>
            ) : (
              <div key={item.label} className="opacity-70" title="Future standalone page">
                {card}
              </div>
            );
          })}
        </div>
        <p className="mt-4 rounded-2xl border border-orange-200/16 bg-orange-300/8 p-3 text-sm font-semibold leading-6 text-slate-300">
          Exercises build workouts. Workouts build plans. Plans build phases.
          Phases create periodization.
        </p>
      </Panel>
    );
  };

  const renderBodyMetrics = () => (
    <Panel
      eyebrow="Body Metrics"
      title="Current body status"
      subtitle="These numbers help the plan pick realistic targets. They are not a diagnosis and should stay easy to update."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Current Weight" onChange={(value) => setProfileField("currentWeight", value)} placeholder="184 lb" value={profile.currentWeight} />
        <Field label="Goal Weight" onChange={(value) => setProfileField("goalWeight", value)} placeholder="175 lb" value={profile.goalWeight} />
        <Field label="Height" onChange={(value) => setProfileField("height", value)} placeholder="5 ft 10 in" value={profile.height} />
        <Field label="Body Fat % Optional" onChange={(value) => setProfileField("bodyFat", value)} placeholder="Optional" value={profile.bodyFat} />
        <Field label="Waist Optional" onChange={(value) => setProfileField("waist", value)} placeholder="Optional" value={profile.waist} />
        <Field label="Resting Heart Rate" onChange={(value) => setProfileField("restingHeartRate", value)} placeholder="Optional" value={profile.restingHeartRate} />
        <Field label="Steps Goal" onChange={(value) => setProfileField("stepsGoal", value)} placeholder="8000" value={profile.stepsGoal} />
        <AnimatedProfileSlider
          color="violet"
          helper="More sleep improves recovery and keeps training heat manageable."
          label="Sleep Goal"
          max={10}
          min={4}
          onChange={(value) => setProfileField("sleepGoal", `${value} hrs`)}
          step={0.5}
          unit=" hrs"
          value={getSleepGoalHours(profile.sleepGoal)}
        />
      </div>

      <div className="mt-5 rounded-[24px] border border-orange-200/16 bg-orange-300/8 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {(["Bulk", "Cut", "Maintain", "General Health"] as BodyGoalMode[]).map((mode) => (
            <Chip
              key={mode}
              active={profile.bodyGoalMode === mode}
              onClick={() => setProfileField("bodyGoalMode", mode)}
            >
              {mode}
            </Chip>
          ))}
        </div>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
          {goalDelta === null
            ? "Add current and goal weight to unlock body-weight direction."
            : goalDelta > 0
              ? `You are aiming to lose ${Math.abs(goalDelta)} lb. Current mode: ${profile.bodyGoalMode}. Recommended: moderate deficit, protein consistency, and recoverable lifting volume.`
              : goalDelta < 0
                ? `You are aiming to gain ${Math.abs(goalDelta)} lb. Current mode: ${profile.bodyGoalMode}. Recommended: steady surplus, progressive overload, and enough sleep.`
                : `You are aiming to maintain body weight. Current mode: ${profile.bodyGoalMode}. Recommended: maintain habits and focus on performance markers.`}
        </p>
      </div>
    </Panel>
  );

  const renderPlanInputs = () => (
    <Panel
      eyebrow="Plan Builder Inputs"
      title="Tell the app what kind of plan to build"
      subtitle="These inputs should become defaults for Builder and Plan pages."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SelectField label="Sessions Per Week" onChange={(value) => setProfileField("sessionsPerWeek", value)} options={["2", "3", "4", "5", "6"]} value={profile.sessionsPerWeek} />
        <SelectField label="Session Length" onChange={(value) => setProfileField("sessionLength", value)} options={["20 minutes", "30 minutes", "45 minutes", "60 minutes", "75 minutes", "90 minutes"]} value={profile.sessionLength} />
        <SelectField label="Training Location" onChange={(value) => setProfileField("trainingLocation", value)} options={["Home", "Gym", "Apartment Gym", "Outdoors", "Travel"]} value={profile.trainingLocation} />
        <SelectField label="Preferred Split" onChange={(value) => setProfileField("preferredSplit", value)} options={splitOptions} value={profile.preferredSplit} />
        <SelectField label="Cardio Preference" onChange={(value) => setProfileField("cardioPreference", value)} options={["None", "Zone 2 plus short finishers", "Intervals", "Conditioning circuits", "Walking only"]} value={profile.cardioPreference} />
        <SelectField label="Mobility Preference" onChange={(value) => setProfileField("mobilityPreference", value)} options={["None", "Daily 8-12 minute resets", "Warm-up only", "Dedicated mobility days", "Recovery day mobility"]} value={profile.mobilityPreference} />
        <AnimatedProfileSlider
          color="orange"
          helper={`${profile.workoutIntensityPreference}. Higher intensity needs more recovery space.`}
          label="Training Intensity"
          max={10}
          min={1}
          onChange={(value) => {
            setProfileField("trainingIntensity", value);
            setProfileField("workoutIntensityPreference", getTrainingIntensityLabel(value));
          }}
          value={profile.trainingIntensity}
        />
        <Field label="Member Type" onChange={(value) => setProfileField("memberType", value)} placeholder="Online Training Member" value={profile.memberType} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Equipment
          </p>
          <div className="flex flex-wrap gap-2">
            {equipmentOptions.map((option) => (
              <Chip
                key={option}
                active={profile.equipment.includes(option)}
                onClick={() => toggleProfileArray("equipment", option)}
              >
                {option}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Preferred Days
          </p>
          <div className="flex flex-wrap gap-2">
            {dayOptions.map((option) => (
              <Chip
                key={option}
                active={profile.preferredDays.includes(option)}
                onClick={() => toggleProfileArray("preferredDays", option)}
              >
                {option}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <AnimatedProfileSlider
          color="cyan"
          helper="How much conditioning should appear in default workouts."
          label="Cardio Priority"
          max={10}
          min={0}
          onChange={(value) => setProfileField("cardioPriority", value)}
          value={profile.cardioPriority}
        />
        <AnimatedProfileSlider
          color="violet"
          helper="How strongly mobility should be baked into warmups and accessories."
          label="Mobility Priority"
          max={10}
          min={0}
          onChange={(value) => setProfileField("mobilityPriority", value)}
          value={profile.mobilityPriority}
        />
        <AnimatedProfileSlider
          color="emerald"
          helper="How much the app should protect recovery when choosing volume."
          label="Recovery Priority"
          max={10}
          min={0}
          onChange={(value) => setProfileField("recoveryPriority", value)}
          value={profile.recoveryPriority}
        />
      </div>
    </Panel>
  );

  const renderTrainingStyle = () => (
    <Panel
      eyebrow="Training Style"
      title="How this member likes to train"
      subtitle="Style choices should influence exercise defaults, plan tone, intensity, and substitutions."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {trainingStyleOptions.map((style) => (
          <button
            key={style.id}
            type="button"
            aria-pressed={profile.trainingStyles.includes(style.id)}
            onClick={() => toggleProfileArray("trainingStyles", style.id)}
            className={`rounded-[24px] border p-4 text-left transition hover:-translate-y-0.5 ${
              profile.trainingStyles.includes(style.id)
                ? "border-orange-200/40 bg-orange-300/12 text-white shadow-[0_0_28px_rgba(251,146,60,0.16)]"
                : "border-white/10 bg-white/[0.045] text-slate-300 hover:border-orange-200/25"
            }`}
          >
            <p className="text-sm font-black">{style.id}</p>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
              {style.description}
            </p>
          </button>
        ))}
      </div>
    </Panel>
  );

  const renderRecoveryProfile = () => (
    <Panel
      eyebrow="Injury / Recovery Profile"
      title="Limitations, pain signals, and recovery preferences"
      subtitle="This should shape Exercise Library recommendations, recovery warnings, and Builder substitutions."
    >
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[26px] border border-white/10 bg-slate-950/44 p-4">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Body-region limitations
          </p>
          <div className="flex flex-wrap gap-2">
            {injuryRegions.map((region) => (
              <Chip
                key={region}
                active={profile.injuries.some((injury) => injury.region === region)}
                onClick={() => toggleInjuryRegion(region)}
              >
                {region}
              </Chip>
            ))}
          </div>

          <div className="mt-5 rounded-[22px] border border-white/10 bg-white/[0.035] p-3">
            <MuscleHeatMap />
          </div>
        </div>

        <div className="grid gap-3">
          {profile.injuries.length ? (
            profile.injuries.map((injury) => (
              <div
                key={injury.region}
                className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-lg font-black text-white">{injury.region}</p>
                  <span className="rounded-2xl border border-orange-200/20 bg-orange-300/10 px-3 py-1.5 text-xs font-black text-orange-100">
                    Pain {injury.painLevel}/10
                  </span>
                </div>
                <div className="mt-4">
                  <AnimatedProfileSlider
                    color={injury.painLevel >= 7 ? "rose" : "orange"}
                    helper="Higher pain should lower loading tolerance and bias substitutions."
                    label="Pain Level"
                    max={10}
                    min={0}
                    onChange={(value) =>
                      updateInjury(injury.region, "painLevel", value)
                    }
                    value={injury.painLevel}
                  />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <TextAreaField label="Notes" onChange={(value) => updateInjury(injury.region, "notes", value)} rows={3} value={injury.notes} />
                  <TextAreaField label="Avoid Exercises" onChange={(value) => updateInjury(injury.region, "avoidExercises", value)} rows={3} value={injury.avoidExercises} />
                  <TextAreaField label="Preferred Alternatives" onChange={(value) => updateInjury(injury.region, "preferredAlternatives", value)} rows={3} value={injury.preferredAlternatives} />
                  <SelectField label="Cleared by Professional" onChange={(value) => updateInjury(injury.region, "clearedByProfessional", value)} options={["Yes", "No", "Not sure"]} value={injury.clearedByProfessional} />
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.03] p-5 text-sm font-semibold text-slate-400">
              No active limitations selected. Add one if recommendations should avoid or modify a region.
            </div>
          )}
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
          Recovery preferences
        </p>
        <div className="flex flex-wrap gap-2">
          {recoveryOptions.map((option) => (
            <Chip
              key={option}
              active={profile.recoveryPreferences.includes(option)}
              onClick={() => toggleProfileArray("recoveryPreferences", option)}
            >
              {option}
            </Chip>
          ))}
        </div>
      </div>
    </Panel>
  );

  const renderNutrition = () => (
    <Panel
      eyebrow="Nutrition Direction"
      title="Nutrition inputs for future planning"
      subtitle="This is not the full Nutrition page. It collects the direction the Nutrition page should adapt around later."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SelectField label="Nutrition Goal" onChange={(value) => updateNutrition("nutritionGoal", value)} options={["Build Muscle", "Lose Fat", "Maintain", "Performance", "General Health"]} value={profile.nutritionDirection.nutritionGoal} />
        <SelectField label="Protein Target Mode" onChange={(value) => updateNutrition("proteinTargetMode", value as NutritionDirection["proteinTargetMode"])} options={["Auto estimate", "Manual"]} value={profile.nutritionDirection.proteinTargetMode} />
        <Field label="Protein Target" onChange={(value) => updateNutrition("proteinTarget", value)} placeholder="Auto or grams/day" value={profile.nutritionDirection.proteinTarget} />
        <SelectField label="Calorie Style" onChange={(value) => updateNutrition("calorieStyle", value)} options={["Track calories", "Hand portions", "Habit based", "No tracking"]} value={profile.nutritionDirection.calorieStyle} />
        <Field label="Meal Prep Preference" onChange={(value) => updateNutrition("mealPrepPreference", value)} placeholder="Simple batch meals" value={profile.nutritionDirection.mealPrepPreference} />
        <Field label="Eating Schedule" onChange={(value) => updateNutrition("eatingSchedule", value)} placeholder="3 meals, late dinner, etc." value={profile.nutritionDirection.eatingSchedule} />
        <Field label="Food Restrictions" onChange={(value) => updateNutrition("foodRestrictions", value)} placeholder="Allergies, restrictions" value={profile.nutritionDirection.foodRestrictions} />
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
          Diet preferences
        </p>
        <div className="flex flex-wrap gap-2">
          {dietPreferenceOptions.map((option) => (
            <Chip
              key={option}
              active={profile.nutritionDirection.dietPreferences.includes(option)}
              onClick={() => toggleNutritionPreference(option)}
            >
              {option}
            </Chip>
          ))}
        </div>
      </div>
    </Panel>
  );

  const renderLifestyle = () => (
    <Panel
      eyebrow="Lifestyle Constraints"
      title="Make the plan realistic"
      subtitle="The best plan is the one the member can actually perform during a real week."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TextAreaField label="Work Schedule" onChange={(value) => updateLifestyle("workSchedule", value)} rows={3} value={profile.lifestyleConstraints.workSchedule} />
        <Field label="Sleep Window" onChange={(value) => updateLifestyle("sleepWindow", value)} placeholder="11 PM - 6:30 AM" value={profile.lifestyleConstraints.sleepWindow} />
        <Field label="Commute / Travel" onChange={(value) => updateLifestyle("commuteTravel", value)} placeholder="Travel monthly, long commute..." value={profile.lifestyleConstraints.commuteTravel} />
        <TextAreaField label="Childcare / Family Constraints" onChange={(value) => updateLifestyle("childcareConstraints", value)} rows={3} value={profile.lifestyleConstraints.childcareConstraints} />
        <SelectField label="Reminder Style" onChange={(value) => updateLifestyle("preferredReminderStyle", value)} options={["Simple reminder", "Detailed plan reminder", "Coach-style nudge", "Minimal", "No reminders"]} value={profile.lifestyleConstraints.preferredReminderStyle} />
        <AnimatedProfileSlider
          color={profile.lifestyleConstraints.stressLevel >= 7 ? "rose" : "cyan"}
          helper="Higher stress lowers recovery tolerance and should make plan recommendations more conservative."
          label="Stress Level"
          max={10}
          min={0}
          onChange={(value) => updateLifestyle("stressLevel", value)}
          value={profile.lifestyleConstraints.stressLevel}
        />
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
          Available training times
        </p>
        <div className="flex flex-wrap gap-2">
          {availableTimeOptions.map((option) => (
            <Chip
              key={option}
              active={profile.lifestyleConstraints.availableTrainingTimes.includes(option)}
              onClick={() => toggleTrainingTime(option)}
            >
              {option}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <AnimatedProfileSlider
          color="emerald"
          helper="Useful for autoregulating plan difficulty before a workout starts."
          label="Energy Level"
          max={10}
          min={1}
          onChange={(value) => setProfileField("energyLevel", value)}
          value={profile.energyLevel}
        />
        <AnimatedProfileSlider
          color="cyan"
          helper="Higher availability allows longer warmups, accessories, and mobility blocks."
          label="Time Availability"
          max={10}
          min={1}
          onChange={(value) => setProfileField("timeAvailability", value)}
          value={profile.timeAvailability}
        />
        <AnimatedProfileSlider
          color="orange"
          helper="The weekly adherence target future plans should be built around."
          label="Weekly Consistency Goal"
          max={100}
          min={40}
          onChange={(value) => setProfileField("weeklyConsistencyGoal", value)}
          step={5}
          unit="%"
          value={profile.weeklyConsistencyGoal}
        />
      </div>
    </Panel>
  );

  const renderBenchmarks = () => (
    <Panel
      eyebrow="Strength Benchmarks"
      title="Movement anchors and performance targets"
      subtitle="Benchmarks connect profile identity to movement patterns, Exercise Library recommendations, and Stats."
    >
      <div className="grid gap-3 xl:grid-cols-2">
        {profile.benchmarks.map((benchmark) => (
          <div
            key={benchmark.id}
            className="rounded-[24px] border border-white/10 bg-slate-950/44 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-black text-white">{benchmark.label}</p>
                <p className="mt-1 text-xs font-semibold text-cyan-100/70">
                  {benchmark.linkedPattern}
                </p>
              </div>
              <SelectField
                label="Confidence"
                onChange={(value) => updateBenchmark(benchmark.id, "confidence", value)}
                options={["Low", "Medium", "High"]}
                value={benchmark.confidence}
              />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Field label="Current" onChange={(value) => updateBenchmark(benchmark.id, "current", value)} value={benchmark.current} />
              <Field label="Goal" onChange={(value) => updateBenchmark(benchmark.id, "goal", value)} value={benchmark.goal} />
              <Field label="Date Tested" onChange={(value) => updateBenchmark(benchmark.id, "dateTested", value)} placeholder="YYYY-MM-DD" type="date" value={benchmark.dateTested} />
            </div>
            <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-xs font-semibold leading-5 text-slate-400">
              Recommended focus: {benchmark.recommendedFocus}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );

  const renderPersonalization = () => (
    <Panel
      eyebrow="App Personalization"
      title="Training display preferences"
      subtitle="These are profile-driven training preferences, not billing, account, privacy, or notification settings."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SelectField label="Default Dashboard Focus" onChange={(value) => updatePersonalization("defaultDashboardFocus", value)} options={["Training plan", "Recovery", "Stats", "Nutrition", "Builder"]} value={profile.appPersonalization.defaultDashboardFocus} />
        <SelectField label="Preferred Unit System" onChange={(value) => updatePersonalization("preferredUnitSystem", value as AppPersonalization["preferredUnitSystem"])} options={["lbs", "kg"]} value={profile.appPersonalization.preferredUnitSystem} />
        <SelectField label="Coaching Tone" onChange={(value) => updatePersonalization("coachingTone", value)} options={["Direct", "Encouraging", "Technical", "Simple", "Hype"]} value={profile.appPersonalization.coachingTone} />
        <SelectField label="Anatomy Background" onChange={(value) => updatePersonalization("anatomyBackground", value)} options={["Seattle", "Beach", "Dark Grid", "Studio", "Mountain"]} value={profile.appPersonalization.anatomyBackground} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[
          ["showAnatomyHeatMap", "Show anatomy heat map"],
          ["showSkillTreePoints", "Show skill-tree points"],
          ["showRecoveryWarnings", "Show recovery warnings"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={Boolean(profile.appPersonalization[key as keyof AppPersonalization])}
            onClick={() =>
              updatePersonalization(
                key as keyof AppPersonalization,
                !profile.appPersonalization[key as keyof AppPersonalization] as never,
              )
            }
            className={`rounded-[24px] border p-4 text-left text-sm font-black transition ${
              profile.appPersonalization[key as keyof AppPersonalization]
                ? "border-cyan-200/35 bg-cyan-300/12 text-cyan-100"
                : "border-white/10 bg-white/[0.045] text-slate-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </Panel>
  );

  const renderNotes = () => (
    <Panel
      eyebrow="Coach Notes / AI Notes"
      title="What the app and coach should know"
      subtitle="User notes are self-reported. Coach notes are a placeholder for future coach/admin visibility. AI notes summarize profile direction."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <TextAreaField label="User Notes" onChange={(value) => setProfileField("userNotes", value)} placeholder="Things my coach/app should know." rows={8} value={profile.userNotes} />
        <TextAreaField label="Coach Notes" onChange={(value) => setProfileField("coachNotes", value)} placeholder="Coach-visible notes later." rows={8} value={profile.coachNotes} />
        <div className="rounded-[24px] border border-cyan-200/16 bg-cyan-300/8 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100">
            AI Plan Notes
          </p>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-200">
            {planSummary}
          </p>
          <TextAreaField label="Plan Direction Notes" onChange={(value) => setProfileField("planDirectionNotes", value)} placeholder="Extra direction for plan generation." rows={5} value={profile.planDirectionNotes} />
        </div>
      </div>
    </Panel>
  );

  const renderOverview = () => (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Primary Goal", profile.primaryGoal || "Goal not set"],
          ["Goal Mode", `${profile.goalMode} / ${profile.bodyGoalMode}`],
          ["Plan Inputs", `${profile.sessionsPerWeek} x ${profile.sessionLength}`],
          ["Limits", activeLimitations.length ? `${activeLimitations.length} active` : "None added"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-[26px] border border-white/10 bg-white/[0.055] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-lg font-black text-white">{value}</p>
          </div>
        ))}
      </div>
      {renderPlanArchitecturePreview()}
      {renderGoalCompass()}
      {renderBodyMetrics()}
      {renderPlanInputs()}
      {renderNotes()}
    </div>
  );

  const renderActiveTab = () => {
    if (activeTab === "overview") return renderOverview();
    if (activeTab === "goals") return <div className="space-y-5">{renderGoalCompass()}{renderBodyMetrics()}</div>;
    if (activeTab === "body") return <div className="space-y-5">{renderBodyMetrics()}{renderRecoveryProfile()}</div>;
    if (activeTab === "training") return <div className="space-y-5">{renderPlanInputs()}{renderTrainingStyle()}{renderLifestyle()}</div>;
    if (activeTab === "recovery") return <div className="space-y-5">{renderRecoveryProfile()}{renderLifestyle()}</div>;
    if (activeTab === "nutrition") return renderNutrition();
    if (activeTab === "benchmarks") return renderBenchmarks();
    return <div className="space-y-5">{renderPersonalization()}{renderNotes()}</div>;
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_82%_10%,rgba(251,146,60,0.14),transparent_28%),linear-gradient(180deg,#020617_0%,#07111f_52%,#020617_100%)] pb-28 text-white">
      <section className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <TrainingJourneyNavigator currentStep="profile" variant="full" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-200/70">
              Member Profile
            </p>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
              Training identity, goals, and plan direction
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={ROUTES.dashboard.home}
              className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-300 transition hover:border-cyan-200/35 hover:text-white"
            >
              Dashboard
            </Link>
            <Link
              href={ROUTES.workoutBuilder.home}
              className="rounded-2xl border border-cyan-200/25 bg-cyan-300/12 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950"
            >
              🛠 Builder
            </Link>
          </div>
        </div>

        {renderHero()}

        <section className="space-y-3">
          <div className="rounded-[28px] border border-white/10 bg-slate-950/50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
              Your Training Identity
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Your profile shapes goals, libraries, workouts, plans, and future
              training phases.
            </p>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
              Exercises build workouts. Workouts build plans. Plans build
              phases. Reflection improves the next cycle.
            </p>
          </div>
        </section>

        <nav className="rounded-[28px] border border-white/10 bg-slate-950/52 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[46px] shrink-0 rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-[0.12em] transition ${
                  activeTab === tab.id
                    ? "border-cyan-200/45 bg-cyan-300/16 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.16)]"
                    : "border-white/10 bg-white/[0.035] text-slate-400 hover:border-cyan-200/25 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {loading ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.055] p-8 text-sm font-black uppercase tracking-[0.16em] text-cyan-100">
            Loading profile command center...
          </div>
        ) : (
          renderActiveTab()
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/88 px-4 py-3 shadow-[0_-22px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              {hasUnsavedChanges ? "Unsaved changes" : "Profile synced"}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Last saved: {formatSavedTime(profile.updatedAt)}
              {message ? ` - ${message}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={resetToDefaults}
              className="rounded-2xl border border-orange-200/20 bg-orange-300/10 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-orange-100 transition hover:bg-orange-300 hover:text-slate-950"
            >
              Reset Defaults
            </button>
            <button
              type="button"
              disabled={!hasUnsavedChanges}
              onClick={resetChanges}
              className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reset Changes
            </button>
            <button
              type="button"
              onClick={saveProfile}
              className="rounded-2xl border border-cyan-100/30 bg-cyan-300 px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.22)] transition hover:bg-cyan-200"
            >
              Save Profile
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

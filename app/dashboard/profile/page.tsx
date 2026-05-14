"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useProfile } from "@/components/profile/ProfileProvider";
import { supabase } from "@/lib/supabaseClient";
import { ROUTES } from "@/lib/routes";
import MuscleHeatMap from "@/components/anatomy/MuscleHeatMap";
import {
  asRecord,
  readSoundFitnessProfile,
} from "@/lib/profile-storage";
import {
  normalizeBodyModel,
  type BodyModel,
} from "@/lib/anatomy/bodyModel";

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
  | "readiness"
  | "measurements"
  | "planDirection"
  | "training"
  | "recovery"
  | "circumstances"
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
  | "Conditioning"
  | "Performance";

type BodyGoalMode = "Bulk" | "Cut" | "Maintain" | "General Health";
type SedentaryLevel = "Low" | "Moderate" | "High" | "Very High";

type StatusLevel = "None" | "Mild" | "Moderate" | "High";
type BodyStatus = {
  averageSleepHours: string;
  energyStatus: "Low" | "Normal" | "High" | "Very High";
  hoursSlept: string;
  mobilityNotes: string;
  mobilityStatus: "Restricted" | "Normal" | "Improving";
  painArea: string;
  painLevel: number;
  painNote: string;
  painStatus: StatusLevel;
  sleepQuality: "Poor" | "Okay" | "Good" | "Great";
  sorenessLevel: number;
  sorenessStatus: StatusLevel;
  stressStatus: "Low" | "Moderate" | "High" | "Very High";
  weightTrend: "Stable" | "Trending down" | "Trending up" | "Unknown";
};

type SpecialCircumstanceStatus = "active" | "improving" | "resolved" | "monitoring";
type SpecialCircumstance = {
  id: string;
  label: string;
  notes: string;
  startDate: string;
  status: SpecialCircumstanceStatus;
};

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

type MeasurementUnit = "in" | "cm";
type CustomMeasurement = {
  id: string;
  label: string;
  value: string;
};
type ProgressPhoto = {
  dateAdded: string;
  id: string;
  label: string;
  sessionOnly?: boolean;
  slotId: string;
  src: string;
};
type BodyMeasurements = {
  ankle: string;
  bodyFat: string;
  chest: string;
  custom: CustomMeasurement[];
  forearm: string;
  hips: string;
  lastUpdated: string;
  leftArm: string;
  leftCalf: string;
  leftThigh: string;
  neck: string;
  progressPhotoNote: string;
  progressPhotos: ProgressPhoto[];
  restingHeartRate: string;
  rightArm: string;
  rightCalf: string;
  rightThigh: string;
  shoulders: string;
  unit: MeasurementUnit;
  waist: string;
  wrist: string;
};

type SoundFitnessProfile = {
  age: string;
  appPersonalization: AppPersonalization;
  avatarUrl?: string;
  benchmarks: Benchmark[];
  bodyModel: BodyModel;
  bodyFat: string;
  bodyGoalMode: BodyGoalMode;
  bodyStatus: BodyStatus;
  birthday: string;
  city: string;
  coachNotes: string;
  cardioPriority: number;
  currentWeight: string;
  displayName: string;
  email?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  energyLevel: number;
  equipment: string[];
  fullName?: string;
  gender: BodyModel;
  goalMode: GoalMode;
  goalWeight: string;
  handle?: string;
  height: string;
  hoursWorkedPerWeek: string;
  injuries: InjuryProfile[];
  lifestyleConstraints: LifestyleConstraints;
  measurements: BodyMeasurements;
  memberType: string;
  nutritionDirection: NutritionDirection;
  occupation: string;
  planDirectionNotes: string;
  phone: string;
  preferredDays: string[];
  preferredSplit: string;
  primaryGoal: string;
  recoveryPreferences: string[];
  restingHeartRate: string;
  secondaryGoal: string;
  sedentaryLevel: SedentaryLevel;
  sessionLength: string;
  sessionsPerWeek: string;
  sleepGoal: string;
  specialCircumstances: SpecialCircumstance[];
  stepsGoal: string;
  waterGoal: string;
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
  username?: string;
  weeklyConsistencyGoal: number;
};

type ProfileAuthFallback = {
  avatarUrl: string;
  displayName: string;
  email: string;
};

const tabs: Array<{ id: ProfileTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "goals", label: "Goals" },
  { id: "body", label: "My Body" },
  { id: "readiness", label: "Readiness" },
  { id: "measurements", label: "Measurements" },
  { id: "planDirection", label: "Plan Direction" },
  { id: "training", label: "Training" },
  { id: "recovery", label: "Recovery" },
  { id: "circumstances", label: "Special Circumstances" },
  { id: "nutrition", label: "Nutrition" },
  { id: "benchmarks", label: "Benchmarks" },
  { id: "preferences", label: "Preferences" },
];

const goalCards: Array<{
  description: string;
  effect: string;
  icon: string;
  id: GoalMode;
  label: string;
  signal: string;
}> = [
  {
    id: "Build Muscle",
    icon: "💪",
    label: "Build Muscle",
    signal: "Volume",
    description: "More weekly volume, progressive overload, and hypertrophy accessories.",
    effect: "Raises muscle volume targets and adds accessory work.",
  },
  {
    id: "Lose Fat",
    icon: "🔥",
    label: "Lose Fat",
    signal: "Cut",
    description: "Strength preservation, steps or cardio, and recovery-aware volume.",
    effect: "Keeps compounds in, manages fatigue, and nudges nutrition direction.",
  },
  {
    id: "Maintain",
    icon: "⚖️",
    label: "Maintain",
    signal: "Stable",
    description: "Balanced training with enough work to keep current capacity.",
    effect: "Moderates weekly targets and favors consistency.",
  },
  {
    id: "Strength",
    icon: "🏋️",
    label: "Strength",
    signal: "Load",
    description: "Lower-rep compounds, PR tracking, longer rests, and skill practice.",
    effect: "Prioritizes benchmark movements and load progression.",
  },
  {
    id: "Mobility",
    icon: "🧘",
    label: "Mobility",
    signal: "Range",
    description: "Frequency, range-of-motion exposure, and control before intensity.",
    effect: "Adds mobility blocks and lowers intensity pressure.",
  },
  {
    id: "Conditioning",
    icon: "⚡",
    label: "Conditioning",
    signal: "Engine",
    description: "Cardio capacity, intervals, circuits, and repeatable work output.",
    effect: "Adds conditioning blocks and adjusts recovery spacing.",
  },
  {
    id: "Recovery",
    icon: "🩹",
    label: "Recovery / Pain-Free Movement",
    signal: "Low heat",
    description: "Lower heat thresholds, mobility, pain-aware progressions, and alternatives.",
    effect: "Makes recovery warnings and substitutions more conservative.",
  },
  {
    id: "General Health",
    icon: "🌿",
    label: "General Health",
    signal: "Base",
    description: "Balanced total-body work, mobility, conditioning, and habit consistency.",
    effect: "Builds a realistic plan around adherence.",
  },
  {
    id: "Performance",
    icon: "🚀",
    label: "Athletic Performance",
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

const statusLevels: StatusLevel[] = ["None", "Mild", "Moderate", "High"];
const energyStatusOptions: BodyStatus["energyStatus"][] = [
  "Low",
  "Normal",
  "High",
  "Very High",
];
const sleepQualityOptions: BodyStatus["sleepQuality"][] = ["Poor", "Okay", "Good", "Great"];
const stressStatusOptions: BodyStatus["stressStatus"][] = [
  "Low",
  "Moderate",
  "High",
  "Very High",
];
const mobilityStatusOptions: BodyStatus["mobilityStatus"][] = [
  "Restricted",
  "Normal",
  "Improving",
];
const weightTrendOptions: BodyStatus["weightTrend"][] = [
  "Stable",
  "Trending down",
  "Trending up",
  "Unknown",
];

const specialCircumstanceOptions = [
  {
    id: "pregnancy",
    label: "Pregnancy",
    icon: "🤰",
    visual: "from-rose-300/22 via-pink-300/10 to-transparent",
    helper: "Adjust recommendations for recovery, mobility, and training volume.",
  },
  {
    id: "postpartum",
    label: "Postpartum",
    icon: "🌙",
    visual: "from-violet-300/22 via-fuchsia-300/10 to-transparent",
    helper: "Guide return-to-training pacing and recovery tolerance.",
  },
  {
    id: "injury",
    label: "Injury",
    icon: "🩹",
    visual: "from-orange-300/24 via-amber-300/10 to-transparent",
    helper: "Prioritize safer substitutions and avoid aggravating patterns.",
  },
  {
    id: "pain-flare",
    label: "Pain flare-up",
    icon: "⚠️",
    visual: "from-red-300/20 via-orange-300/10 to-transparent",
    helper: "Lower intensity and bias toward low-load options.",
  },
  {
    id: "illness-return",
    label: "Returning from illness",
    icon: "🌡️",
    visual: "from-emerald-300/20 via-teal-300/10 to-transparent",
    helper: "Ramp volume back gradually and protect recovery.",
  },
  {
    id: "surgery-history",
    label: "Surgery / Post-Rehab",
    icon: "🧬",
    visual: "from-cyan-300/20 via-blue-300/10 to-transparent",
    helper: "Preserve notes for coach review and exercise modifications.",
  },
  {
    id: "travel",
    label: "Travel / Limited Equipment",
    icon: "🧳",
    visual: "from-sky-300/20 via-cyan-300/10 to-transparent",
    helper: "Adjust equipment assumptions and session length.",
  },
  {
    id: "high-stress-season",
    label: "High Stress Season",
    icon: "⏳",
    visual: "from-amber-300/22 via-orange-300/10 to-transparent",
    helper: "Treat recovery capacity as lower during demanding weeks.",
  },
  {
    id: "sleep-disruption",
    label: "Sleep Disruption",
    icon: "🌘",
    visual: "from-indigo-300/22 via-blue-300/10 to-transparent",
    helper: "Reduce training heat and protect recovery.",
  },
  {
    id: "manual-labor",
    label: "Manual Labor Job",
    icon: "🛠️",
    visual: "from-yellow-300/20 via-orange-300/10 to-transparent",
    helper: "Account for occupational fatigue and tissue load.",
  },
  {
    id: "sport-season",
    label: "Athlete / Sport Season",
    icon: "🏃",
    visual: "from-lime-300/20 via-emerald-300/10 to-transparent",
    helper: "Preserve freshness for practices and competitions.",
  },
  {
    id: "senior-support",
    label: "Senior / 55+ Support",
    icon: "⭐",
    visual: "from-cyan-300/20 via-slate-300/10 to-transparent",
    helper: "Favor joint-friendly loading and recovery spacing.",
  },
];

const genderOptions: Array<{ id: BodyModel; label: string; symbol: string }> = [
  { id: "male", label: "Male", symbol: "\u2642" },
  { id: "female", label: "Female", symbol: "\u2640" },
];

const occupationOptions = [
  "",
  "Desk worker",
  "Trainer/Coach",
  "Manual labor",
  "Healthcare",
  "Driver",
  "Student",
  "Other",
];

const sedentaryLevelOptions: SedentaryLevel[] = [
  "Low",
  "Moderate",
  "High",
  "Very High",
];

const measurementDefinitions: Array<{
  key: keyof Omit<BodyMeasurements, "custom" | "lastUpdated" | "progressPhotoNote" | "progressPhotos" | "unit">;
  label: string;
  max: number;
  min: number;
  step?: number;
}> = [
  { key: "neck", label: "Neck", min: 8, max: 26, step: 0.25 },
  { key: "shoulders", label: "Shoulders", min: 24, max: 72, step: 0.25 },
  { key: "chest", label: "Chest", min: 24, max: 70, step: 0.25 },
  { key: "waist", label: "Waist", min: 20, max: 70, step: 0.25 },
  { key: "hips", label: "Hips", min: 24, max: 72, step: 0.25 },
  { key: "leftArm", label: "Left Arm", min: 6, max: 30, step: 0.25 },
  { key: "rightArm", label: "Right Arm", min: 6, max: 30, step: 0.25 },
  { key: "leftThigh", label: "Left Thigh", min: 12, max: 40, step: 0.25 },
  { key: "rightThigh", label: "Right Thigh", min: 12, max: 40, step: 0.25 },
  { key: "leftCalf", label: "Left Calf", min: 8, max: 28, step: 0.25 },
  { key: "rightCalf", label: "Right Calf", min: 8, max: 28, step: 0.25 },
  { key: "forearm", label: "Forearm", min: 6, max: 20, step: 0.25 },
  { key: "wrist", label: "Wrist", min: 4, max: 12, step: 0.1 },
  { key: "ankle", label: "Ankle", min: 5, max: 16, step: 0.1 },
];

const progressPhotoSlots: Array<{ id: string; label: string; shortLabel: string }> = [
  { id: "front", label: "Full Body Front", shortLabel: "Front" },
  { id: "side", label: "Full Body Side", shortLabel: "Side" },
  { id: "back", label: "Full Body Back", shortLabel: "Back" },
  { id: "neck", label: "Neck", shortLabel: "Neck" },
  { id: "chest", label: "Chest", shortLabel: "Chest" },
  { id: "back-body", label: "Back", shortLabel: "Back" },
  { id: "shoulders", label: "Shoulders", shortLabel: "Shoulders" },
  { id: "arms", label: "Arms", shortLabel: "Arms" },
  { id: "forearm", label: "Forearm", shortLabel: "Forearm" },
  { id: "wrist", label: "Wrist", shortLabel: "Wrist" },
  { id: "waist-core", label: "Waist / Core", shortLabel: "Core" },
  { id: "hips-glutes", label: "Hips / Glutes", shortLabel: "Glutes" },
  { id: "thighs", label: "Thighs", shortLabel: "Thighs" },
  { id: "quads", label: "Quads", shortLabel: "Quads" },
  { id: "hamstrings", label: "Hamstrings", shortLabel: "Hams" },
  { id: "calves", label: "Calves", shortLabel: "Calves" },
  { id: "ankle", label: "Ankle", shortLabel: "Ankle" },
];

const fullBodyPhotoSlotIds = ["front", "side", "back"];

const measurementPhotoSlotByKey: Partial<
  Record<
    keyof Omit<
      BodyMeasurements,
      "custom" | "lastUpdated" | "progressPhotoNote" | "progressPhotos" | "unit"
    >,
    string
  >
> = {
  ankle: "ankle",
  chest: "chest",
  forearm: "forearm",
  hips: "hips-glutes",
  leftArm: "arms",
  leftCalf: "calves",
  leftThigh: "thighs",
  neck: "neck",
  rightArm: "arms",
  rightCalf: "calves",
  rightThigh: "thighs",
  shoulders: "shoulders",
  waist: "waist-core",
  wrist: "wrist",
};

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
  bodyModel: "male",
  gender: "male",
  bodyFat: "",
  bodyGoalMode: "Maintain",
  bodyStatus: {
    averageSleepHours: "",
    energyStatus: "Normal",
    hoursSlept: "",
    mobilityNotes: "",
    mobilityStatus: "Normal",
    painArea: "",
    painLevel: 0,
    painNote: "",
    painStatus: "None",
    sleepQuality: "Good",
    sorenessLevel: 0,
    sorenessStatus: "None",
    stressStatus: "Moderate",
    weightTrend: "Unknown",
  },
  birthday: "",
  city: "",
  coachNotes: "",
  cardioPriority: 5,
  currentWeight: "",
  displayName: "Member",
  emergencyContactName: "",
  emergencyContactPhone: "",
  energyLevel: 6,
  equipment: ["Bodyweight", "Dumbbells"],
  goalMode: "Strength",
  goalWeight: "",
  height: "",
  hoursWorkedPerWeek: "40",
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
  measurements: {
    ankle: "",
    bodyFat: "",
    chest: "",
    custom: [],
    forearm: "",
    hips: "",
    lastUpdated: "",
    leftArm: "",
    leftCalf: "",
    leftThigh: "",
    neck: "",
    progressPhotoNote: "",
    progressPhotos: [],
    restingHeartRate: "",
    rightArm: "",
    rightCalf: "",
    rightThigh: "",
    shoulders: "",
    unit: "in",
    waist: "",
    wrist: "",
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
  occupation: "",
  planDirectionNotes: "",
  phone: "",
  preferredDays: ["Mon", "Wed", "Fri", "Sat"],
  preferredSplit: "Strength + Mobility",
  primaryGoal: "Strength + Mobility Plan",
  recoveryPreferences: ["Mobility", "Walking/cardio"],
  restingHeartRate: "",
  secondaryGoal: "",
  sedentaryLevel: "Moderate",
  sessionLength: "45 minutes",
  sessionsPerWeek: "4",
  sleepGoal: "7-8 hours",
  specialCircumstances: [],
  stepsGoal: "",
  waterGoal: "",
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

const getNumberFromProfileValue = (value: string, fallback: number) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const calculateAgeFromBirthday = (birthday: string) => {
  if (!birthday) return "";
  const birthDate = new Date(`${birthday}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return "";

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthOffset = today.getMonth() - birthDate.getMonth();
  if (
    monthOffset < 0 ||
    (monthOffset === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 && age <= 120 ? String(age) : "";
};

type BirthdayParts = {
  day: string;
  month: string;
  year: string;
};

const birthdayMonthOptions = [
  { label: "Jan", value: "01" },
  { label: "Feb", value: "02" },
  { label: "Mar", value: "03" },
  { label: "Apr", value: "04" },
  { label: "May", value: "05" },
  { label: "Jun", value: "06" },
  { label: "Jul", value: "07" },
  { label: "Aug", value: "08" },
  { label: "Sep", value: "09" },
  { label: "Oct", value: "10" },
  { label: "Nov", value: "11" },
  { label: "Dec", value: "12" },
];

const getBirthdayParts = (birthday: string): BirthdayParts => {
  const match = birthday.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return { day: "", month: "", year: "" };
  return {
    day: match[3],
    month: match[2],
    year: match[1],
  };
};

const getDaysInBirthdayMonth = (month: string, year: string) => {
  const safeMonth = Number.parseInt(month, 10);
  const safeYear = Number.parseInt(year, 10);
  if (!Number.isFinite(safeMonth) || safeMonth < 1 || safeMonth > 12) return 31;
  if (!Number.isFinite(safeYear) || safeYear < 1900) {
    return safeMonth === 2 ? 29 : [4, 6, 9, 11].includes(safeMonth) ? 30 : 31;
  }

  return new Date(safeYear, safeMonth, 0).getDate();
};

const formatProfileNumber = (value: number, step = 1) => {
  const decimals = step < 1 ? 1 : 0;
  return value.toFixed(decimals).replace(/\.0$/, "");
};

const getHeightControlValue = (value: string, unit: "in" | "cm") => {
  const feetMatch = value.match(/(\d+(?:\.\d+)?)\s*(?:ft|feet|')/i);
  const inchesMatch = value.match(/(\d+(?:\.\d+)?)\s*(?:in|inch|")/i);
  if (feetMatch) {
    const feet = Number.parseFloat(feetMatch[1]);
    const inches = inchesMatch ? Number.parseFloat(inchesMatch[1]) : 0;
    const totalInches = feet * 12 + inches;
    return unit === "cm"
      ? String(Math.round(totalInches * 2.54))
      : String(Math.round(totalInches));
  }

  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return "";
  return String(numeric);
};

const getTrainingIntensityLabel = (value: number) => {
  if (value <= 2) return "Easy";
  if (value <= 4) return "Moderate";
  if (value <= 7) return "Moderate hard";
  if (value <= 9) return "Hard";
  return "Autoregulated";
};

const statusPenalty: Record<StatusLevel, number> = {
  None: 0,
  Mild: 7,
  Moderate: 16,
  High: 28,
};

const statusLevelToScale = (status: StatusLevel) => {
  if (status === "Mild") return 3;
  if (status === "Moderate") return 6;
  if (status === "High") return 9;
  return 0;
};

const scaleToStatusLevel = (value: number): StatusLevel => {
  if (value >= 7) return "High";
  if (value >= 4) return "Moderate";
  if (value >= 1) return "Mild";
  return "None";
};

const getScaleValue = (value: unknown, fallbackStatus: StatusLevel) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return clampNumber(value, 0, 10);
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return clampNumber(parsed, 0, 10);
  }

  return statusLevelToScale(fallbackStatus);
};

const energyStatusToScale = (status: BodyStatus["energyStatus"]) => {
  if (status === "Low") return 3;
  if (status === "High") return 8;
  if (status === "Very High") return 10;
  return 6;
};

const stressStatusToScale = (status: BodyStatus["stressStatus"]) => {
  if (status === "Low") return 2;
  if (status === "High") return 7;
  if (status === "Very High") return 9;
  return 5;
};

const getEstimatedReadinessScore = (profile: SoundFitnessProfile) => {
  const painLevel = getScaleValue(
    profile.bodyStatus.painLevel,
    profile.bodyStatus.painStatus,
  );
  const sorenessLevel = getScaleValue(
    profile.bodyStatus.sorenessLevel,
    profile.bodyStatus.sorenessStatus,
  );
  const averageSleepHours = getNumberFromProfileValue(
    profile.bodyStatus.averageSleepHours || profile.bodyStatus.hoursSlept,
    7.5,
  );
  let score = 62 + profile.energyLevel * 3;
  score -= Math.max(statusPenalty[profile.bodyStatus.sorenessStatus] || 0, sorenessLevel * 2.5);
  score -= Math.max(statusPenalty[profile.bodyStatus.painStatus] || 0, painLevel * 3);
  score -= profile.lifestyleConstraints.stressLevel * 2;
  if (averageSleepHours < 6) score -= 12;
  if (averageSleepHours >= 8) score += 5;
  if (profile.bodyStatus.energyStatus === "Low") score -= 10;
  if (profile.bodyStatus.energyStatus === "High") score += 6;
  if (profile.bodyStatus.energyStatus === "Very High") score += 8;
  if (profile.bodyStatus.sleepQuality === "Poor") score -= 14;
  if (profile.bodyStatus.sleepQuality === "Great") score += 8;
  if (profile.bodyStatus.stressStatus === "High") score -= 10;
  if (profile.bodyStatus.stressStatus === "Very High") score -= 16;
  if (profile.bodyStatus.stressStatus === "Low") score += 5;
  if (profile.bodyStatus.mobilityStatus === "Restricted") score -= 8;
  if (profile.bodyStatus.mobilityStatus === "Improving") score += 4;
  return clampNumber(Math.round(score), 5, 100);
};

const getReadinessLabel = (score: number) => {
  if (score >= 82) return "Ready";
  if (score >= 64) return "Productive";
  if (score >= 44) return "Cautious";
  return "Recovery biased";
};

type TrainingRiskAssessment = {
  factors: string[];
  label: "Low" | "Moderate" | "High" | "Very High";
  recommendation: string;
  score: number;
};

const calculateTrainingRisk = (
  profile: SoundFitnessProfile,
): TrainingRiskAssessment => {
  const factors: string[] = [];
  let score = 18;

  const sessionsPerWeek = getNumberFromProfileValue(profile.sessionsPerWeek, 4);
  const sessionLength = getNumberFromProfileValue(profile.sessionLength, 45);
  const sleepHours = getNumberFromProfileValue(
    profile.bodyStatus.averageSleepHours || profile.bodyStatus.hoursSlept,
    7.5,
  );
  const stressLevel = stressStatusToScale(profile.bodyStatus.stressStatus);
  const energyLevel = energyStatusToScale(profile.bodyStatus.energyStatus);
  const painLevel = getScaleValue(
    profile.bodyStatus.painLevel,
    profile.bodyStatus.painStatus,
  );
  const sorenessLevel = getScaleValue(
    profile.bodyStatus.sorenessLevel,
    profile.bodyStatus.sorenessStatus,
  );
  const restingHeartRate = getNumberFromProfileValue(
    profile.restingHeartRate,
    62,
  );
  const age = getNumberFromProfileValue(
    calculateAgeFromBirthday(profile.birthday) || profile.age,
    0,
  );
  const hoursWorked = getNumberFromProfileValue(
    profile.hoursWorkedPerWeek,
    40,
  );
  const specialIds = new Set(
    profile.specialCircumstances.map((circumstance) => circumstance.id),
  );

  if (sessionsPerWeek >= 5) {
    score += 12;
    factors.push("Aggressive weekly schedule");
  }
  if (sessionLength >= 75) {
    score += 8;
    factors.push("Long sessions");
  }
  if (profile.trainingAge === "Beginner") {
    score += 8;
    factors.push("Newer training base");
  }
  if (profile.goalMode === "Strength" || profile.goalMode === "Performance") {
    score += 6;
    factors.push("Higher intensity goal");
  }
  if (sleepHours < 6.5) {
    score += 14;
    factors.push("Low average sleep");
  }
  if (stressLevel >= 7) {
    score += 12;
    factors.push("High stress");
  }
  if (energyLevel <= 3) {
    score += 8;
    factors.push("Low energy");
  }
  if (painLevel >= 4) {
    score += painLevel >= 7 ? 18 : 10;
    factors.push("Pain reported");
  }
  if (sorenessLevel >= 5) {
    score += sorenessLevel >= 8 ? 14 : 8;
    factors.push("Elevated soreness");
  }
  if (activeLimitationsCount(profile) > 0) {
    score += 10;
    factors.push("Active injury limitation");
  }
  if (specialIds.has("pregnancy") || specialIds.has("postpartum")) {
    score += 14;
    factors.push("Pregnancy/postpartum context");
  }
  if (specialIds.size > 0) {
    score += Math.min(12, specialIds.size * 3);
    factors.push("Special circumstance active");
  }
  if (restingHeartRate >= 85) {
    score += 8;
    factors.push("Elevated resting heart rate");
  }
  if (profile.sedentaryLevel === "High" || profile.sedentaryLevel === "Very High") {
    score += profile.sedentaryLevel === "Very High" ? 8 : 5;
    factors.push("High sedentary load");
  }
  if (hoursWorked >= 55) {
    score += 8;
    factors.push("High work-hour demand");
  }
  if (profile.occupation === "Manual labor") {
    score += 6;
    factors.push("Physical job load");
  }
  if (profile.occupation === "Driver" || profile.occupation === "Desk worker") {
    score += 4;
    factors.push("Extended seated work context");
  }
  if (age >= 55) {
    score += 4;
    factors.push("Age-informed recovery context");
  }

  const finalScore = clampNumber(Math.round(score), 0, 100);
  if (finalScore >= 75) {
    return {
      factors: factors.length ? factors.slice(0, 5) : ["Readiness signals need review"],
      label: "Very High",
      recommendation: "Prioritize recovery and consider coach review.",
      score: finalScore,
    };
  }
  if (finalScore >= 55) {
    return {
      factors: factors.length ? factors.slice(0, 5) : ["Training load may be outpacing recovery"],
      label: "High",
      recommendation: "Consider reducing volume or intensity.",
      score: finalScore,
    };
  }
  if (finalScore >= 35) {
    return {
      factors: factors.length ? factors.slice(0, 5) : ["Moderate training demand"],
      label: "Moderate",
      recommendation: "Watch recovery and soreness trends.",
      score: finalScore,
    };
  }

  return {
    factors: factors.length ? factors.slice(0, 5) : ["No major readiness flags"],
    label: "Low",
    recommendation: "Current plan appears well matched.",
    score: finalScore,
  };
};

const getCompactRiskFactorLabel = (factor: string) => {
  const labels: Record<string, string> = {
    "Active injury limitation": "Injury",
    "Age-informed recovery context": "Age",
    "Aggressive weekly schedule": "Volume",
    "Elevated resting heart rate": "RHR",
    "Elevated soreness": "Soreness",
    "Extended seated work context": "Seated",
    "High sedentary load": "Sedentary",
    "High stress": "Stress",
    "High work-hour demand": "Hours",
    "Higher intensity goal": "Intensity",
    "Long sessions": "Long",
    "Low average sleep": "Low sleep",
    "Low energy": "Energy",
    "Moderate training demand": "Load",
    "Newer training base": "New base",
    "No major readiness flags": "Clear",
    "Pain reported": "Pain",
    "Physical job load": "Job",
    "Pregnancy/postpartum context": "Preg/post",
    "Readiness signals need review": "Review",
    "Special circumstance active": "Context",
    "Training load may be outpacing recovery": "Load",
  };

  return labels[factor] || factor;
};

const getTrainingRiskTone = (label: TrainingRiskAssessment["label"]) => {
  if (label === "Very High") {
    return {
      bar: "from-rose-400 to-red-500",
      border: "border-rose-200/35",
      glow: "shadow-[0_0_34px_rgba(251,113,133,0.16)]",
      softBg: "bg-rose-300/10",
      text: "text-rose-100",
    };
  }
  if (label === "High") {
    return {
      bar: "from-orange-300 to-rose-400",
      border: "border-orange-200/35",
      glow: "shadow-[0_0_34px_rgba(251,146,60,0.14)]",
      softBg: "bg-orange-300/10",
      text: "text-orange-100",
    };
  }
  if (label === "Moderate") {
    return {
      bar: "from-amber-300 to-orange-300",
      border: "border-amber-200/35",
      glow: "shadow-[0_0_34px_rgba(251,191,36,0.12)]",
      softBg: "bg-amber-300/10",
      text: "text-amber-100",
    };
  }

  return {
    bar: "from-emerald-300 to-cyan-300",
    border: "border-emerald-200/35",
    glow: "shadow-[0_0_34px_rgba(52,211,153,0.12)]",
    softBg: "bg-emerald-300/10",
    text: "text-emerald-100",
  };
};

function activeLimitationsCount(profile: SoundFitnessProfile) {
  return profile.injuries.filter((injury) => injury.painLevel > 0).length;
}

const toggleArrayValue = (items: string[], value: string) =>
  items.includes(value)
    ? items.filter((item) => item !== value)
    : [...items, value];

const readProfileText = (...values: unknown[]) => {
  const found = values.find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
  return typeof found === "string" ? found.trim() : "";
};

const isProfileFieldComplete = (value: unknown): boolean => {
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(isProfileFieldComplete);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("label" in record && "value" in record) {
      return isProfileFieldComplete(record.label) && isProfileFieldComplete(record.value);
    }

    return Object.values(record).some(isProfileFieldComplete);
  }
  return false;
};

const calculateSectionCompletion = (sectionFields: unknown[]) => {
  if (!sectionFields.length) return 0;

  const completed = sectionFields.filter(isProfileFieldComplete).length;
  return Math.round((completed / sectionFields.length) * 100);
};

const getCompletionTone = (percent: number) => {
  if (percent >= 80) {
    return {
      bar: "from-emerald-300 to-cyan-300",
      badge:
        "border-emerald-200/35 bg-emerald-300/16 text-emerald-100 shadow-[0_0_18px_rgba(52,211,153,0.14)]",
      glow: "shadow-[0_0_28px_rgba(52,211,153,0.15)]",
      text: "text-emerald-100",
    };
  }
  if (percent >= 50) {
    return {
      bar: "from-cyan-300 to-blue-400",
      badge:
        "border-cyan-200/35 bg-cyan-300/16 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.14)]",
      glow: "shadow-[0_0_28px_rgba(34,211,238,0.14)]",
      text: "text-cyan-100",
    };
  }
  if (percent >= 25) {
    return {
      bar: "from-amber-300 to-orange-300",
      badge:
        "border-amber-200/35 bg-amber-300/14 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.12)]",
      glow: "shadow-[0_0_28px_rgba(251,191,36,0.11)]",
      text: "text-amber-100",
    };
  }
  return {
    bar: "from-rose-300 to-orange-300",
    badge:
      "border-rose-200/30 bg-rose-300/12 text-rose-100 shadow-[0_0_18px_rgba(251,113,133,0.12)]",
    glow: "shadow-[0_0_28px_rgba(251,113,133,0.10)]",
    text: "text-rose-100",
  };
};

const getProfileTabCompletions = (
  profile: SoundFitnessProfile,
): Record<ProfileTab, number> => {
  const completeMeasurements = measurementDefinitions.map(
    (definition) => profile.measurements[definition.key],
  );
  const completeCustomMeasurements = profile.measurements.custom.filter(
    (item) => isProfileFieldComplete(item.label) && isProfileFieldComplete(item.value),
  );
  const benchmarkFields = profile.benchmarks.flatMap((benchmark) => [
    benchmark.current,
    benchmark.goal,
    benchmark.dateTested,
  ]);
  const injuryFields = profile.injuries.flatMap((injury) => [
    injury.region,
    injury.painLevel,
    injury.notes,
    injury.avoidExercises,
    injury.preferredAlternatives,
    injury.clearedByProfessional,
  ]);
  const circumstanceFields = profile.specialCircumstances.flatMap((circumstance) => [
    circumstance.label,
    circumstance.status,
    circumstance.startDate,
    circumstance.notes,
  ]);

  return {
    overview: calculateSectionCompletion([
      profile.displayName,
      profile.memberType,
      profile.primaryGoal,
      profile.goalMode,
      profile.trainingAge,
      profile.gender,
      profile.sessionsPerWeek,
      profile.sessionLength,
      profile.currentWeight,
      profile.goalWeight,
      profile.profileImage,
      profile.userNotes,
    ]),
    goals: calculateSectionCompletion([
      profile.goalMode,
      profile.primaryGoal,
      profile.secondaryGoal,
      profile.bodyGoalMode,
      profile.sessionsPerWeek,
      profile.stepsGoal,
      profile.sleepGoal,
      profile.waterGoal,
      profile.nutritionDirection.nutritionGoal,
      profile.nutritionDirection.proteinTarget,
    ]),
    body: calculateSectionCompletion([
      profile.gender,
      profile.birthday || profile.age,
      profile.occupation,
      profile.sedentaryLevel,
      profile.hoursWorkedPerWeek,
      profile.city,
      profile.currentWeight,
      profile.goalWeight,
      profile.height,
      profile.bodyFat,
      profile.waist,
      profile.stepsGoal,
      profile.waterGoal,
      profile.bodyStatus.weightTrend,
    ]),
    readiness: calculateSectionCompletion([
      profile.bodyStatus.averageSleepHours,
      profile.bodyStatus.energyStatus,
      profile.bodyStatus.stressStatus,
      profile.bodyStatus.sorenessLevel,
      profile.bodyStatus.sorenessStatus,
      profile.bodyStatus.painLevel,
      profile.bodyStatus.painStatus,
      profile.bodyStatus.sleepQuality,
      profile.restingHeartRate,
      profile.lifestyleConstraints.stressLevel,
      profile.energyLevel,
      profile.bodyStatus.painArea,
      profile.bodyStatus.painNote,
    ]),
    planDirection: calculateSectionCompletion([
      profile.goalMode,
      profile.primaryGoal,
      profile.secondaryGoal,
      profile.bodyGoalMode,
      profile.preferredSplit,
      profile.trainingStyles,
      profile.planDirectionNotes,
      profile.sessionsPerWeek,
      profile.sessionLength,
    ]),
    measurements: calculateSectionCompletion([
      profile.measurements.unit,
      ...completeMeasurements,
      completeCustomMeasurements,
      profile.measurements.progressPhotos,
      profile.measurements.progressPhotoNote,
    ]),
    training: calculateSectionCompletion([
      profile.sessionsPerWeek,
      profile.sessionLength,
      profile.trainingLocation,
      profile.equipment,
      profile.preferredDays,
      profile.preferredSplit,
      profile.trainingStyles,
      profile.cardioPreference,
      profile.mobilityPreference,
      profile.trainingIntensity,
      profile.timeAvailability,
    ]),
    recovery: calculateSectionCompletion([
      profile.recoveryPreferences,
      profile.bodyStatus.sorenessLevel,
      profile.bodyStatus.sorenessStatus,
      profile.bodyStatus.painLevel,
      profile.bodyStatus.painStatus,
      profile.bodyStatus.painArea,
      profile.bodyStatus.painNote,
      profile.bodyStatus.mobilityStatus,
      profile.bodyStatus.mobilityNotes,
      injuryFields,
      profile.recoveryPriority,
    ]),
    circumstances: calculateSectionCompletion([
      profile.specialCircumstances,
      circumstanceFields,
    ]),
    nutrition: calculateSectionCompletion([
      profile.nutritionDirection.nutritionGoal,
      profile.nutritionDirection.proteinTargetMode,
      profile.nutritionDirection.proteinTarget,
      profile.nutritionDirection.calorieStyle,
      profile.nutritionDirection.dietPreferences,
      profile.nutritionDirection.mealPrepPreference,
      profile.nutritionDirection.eatingSchedule,
      profile.nutritionDirection.foodRestrictions,
      profile.waterGoal,
    ]),
    benchmarks: calculateSectionCompletion(benchmarkFields),
    preferences: calculateSectionCompletion([
      profile.gender,
      profile.appPersonalization.defaultDashboardFocus,
      profile.appPersonalization.preferredUnitSystem,
      profile.appPersonalization.coachingTone,
      profile.appPersonalization.anatomyBackground,
      profile.appPersonalization.showAnatomyHeatMap,
      profile.appPersonalization.showSkillTreePoints,
      profile.appPersonalization.showRecoveryWarnings,
      profile.planDirectionNotes,
      profile.coachNotes,
    ]),
  };
};

const mergeProfile = (saved: Partial<SoundFitnessProfile>): SoundFitnessProfile => {
  const gender = normalizeBodyModel(saved.gender || saved.bodyModel);

  return {
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
    bodyModel: gender,
    gender,
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
    measurements: {
      ...defaultProfile.measurements,
      ...(saved.measurements || {}),
      custom: Array.isArray(saved.measurements?.custom)
        ? saved.measurements.custom
        : [],
      progressPhotos: Array.isArray(saved.measurements?.progressPhotos)
        ? saved.measurements.progressPhotos
        : [],
      unit: saved.measurements?.unit === "cm" ? "cm" : "in",
    },
    nutritionDirection: {
      ...defaultProfile.nutritionDirection,
      ...(saved.nutritionDirection || {}),
      dietPreferences: Array.isArray(saved.nutritionDirection?.dietPreferences)
        ? saved.nutritionDirection.dietPreferences
        : defaultProfile.nutritionDirection.dietPreferences,
    },
    bodyStatus: {
      ...defaultProfile.bodyStatus,
      ...(saved.bodyStatus || {}),
    },
    preferredDays: Array.isArray(saved.preferredDays)
      ? saved.preferredDays
      : defaultProfile.preferredDays,
    recoveryPreferences: Array.isArray(saved.recoveryPreferences)
      ? saved.recoveryPreferences
      : defaultProfile.recoveryPreferences,
    specialCircumstances: Array.isArray(saved.specialCircumstances)
      ? saved.specialCircumstances
      : [],
    trainingStyles: Array.isArray(saved.trainingStyles)
      ? saved.trainingStyles
      : defaultProfile.trainingStyles,
  };
};

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

function InfoField({
  helper,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  helper: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="relative z-0 block overflow-visible rounded-[24px] border border-white/10 bg-slate-950/52 p-4 transition focus-within:z-50 hover:z-50">
      <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-300">
        {label}
        <InfoBubble label={label}>{helper}</InfoBubble>
      </span>
      <input
        className="mt-3 min-h-[46px] w-full rounded-2xl border border-white/10 bg-slate-950/72 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/50 focus:bg-white/[0.07]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function InfoSelectField({
  helper,
  label,
  onChange,
  options,
  value,
}: {
  helper: string;
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="relative z-0 block overflow-visible rounded-[24px] border border-white/10 bg-slate-950/52 p-4 transition focus-within:z-50 hover:z-50">
      <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-300">
        {label}
        <InfoBubble label={label}>{helper}</InfoBubble>
      </span>
      <select
        className="mt-3 min-h-[46px] w-full rounded-2xl border border-white/10 bg-slate-950/72 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-cyan-200/50 focus:bg-slate-900"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option || "blank"} value={option}>
            {option || "Select one"}
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
    <div className="h-full rounded-[24px] border border-white/10 bg-slate-950/54 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
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

function InfoBubble({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  const tooltipId = `profile-info-${label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <span className="group/info relative z-40 inline-flex overflow-visible">
      <button
        type="button"
        aria-describedby={tooltipId}
        aria-label={`${label} info`}
        className="grid h-7 w-7 place-items-center rounded-full border border-white/12 bg-slate-950/78 text-[11px] font-black text-slate-400 shadow-[0_0_14px_rgba(15,23,42,0.42)] transition hover:border-cyan-200/40 hover:bg-cyan-300/12 hover:text-cyan-100 focus:outline-none focus-visible:border-cyan-200/60 focus-visible:bg-cyan-300/14 focus-visible:text-cyan-100 focus-visible:ring-2 focus-visible:ring-cyan-300/20"
      >
        i
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+0.65rem)] right-0 z-[120] w-64 max-w-[min(18rem,calc(100vw-2rem))] origin-bottom-right scale-95 rounded-2xl border border-cyan-100/22 bg-slate-950/96 p-3 text-left text-xs font-semibold leading-5 text-slate-200 opacity-0 shadow-[0_24px_70px_rgba(0,0,0,0.5),0_0_24px_rgba(34,211,238,0.16)] backdrop-blur-xl transition duration-150 group-hover/info:scale-100 group-hover/info:opacity-100 group-focus-within/info:scale-100 group-focus-within/info:opacity-100 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 sm:origin-bottom"
      >
        {children}
        <span className="absolute -bottom-1 right-3 h-2 w-2 rotate-45 border-b border-r border-cyan-100/22 bg-slate-950 sm:left-1/2 sm:right-auto sm:-translate-x-1/2" />
      </span>
    </span>
  );
}

function FloatingInfoBubble({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({
    left: 160,
    placement: "top" as "top" | "bottom",
    top: 120,
  });
  const tooltipId = `profile-floating-info-${label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`;

  const openTooltip = () => {
    const button = buttonRef.current;
    if (!button || typeof window === "undefined") return;

    const rect = button.getBoundingClientRect();
    const width = 288;
    const left = clampNumber(
      rect.left + rect.width / 2,
      16 + width / 2,
      window.innerWidth - 16 - width / 2,
    );
    const placement = rect.top < 150 ? "bottom" : "top";
    const top = placement === "top" ? rect.top - 12 : rect.bottom + 12;
    setPosition({ left, placement, top });
    setIsOpen(true);
  };

  return (
    <span
      className="relative inline-flex"
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-describedby={tooltipId}
        aria-expanded={isOpen}
        aria-label={`${label} info`}
        onBlur={() => setIsOpen(false)}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
            return;
          }
          openTooltip();
        }}
        onFocus={openTooltip}
        onKeyDown={(event) => {
          if (event.key === "Escape") setIsOpen(false);
        }}
        onMouseEnter={openTooltip}
        className="grid h-7 w-7 place-items-center rounded-full border border-white/12 bg-slate-950/78 text-[11px] font-black text-slate-400 shadow-[0_0_14px_rgba(15,23,42,0.42)] transition hover:border-cyan-200/40 hover:bg-cyan-300/12 hover:text-cyan-100 focus:outline-none focus-visible:border-cyan-200/60 focus-visible:bg-cyan-300/14 focus-visible:text-cyan-100 focus-visible:ring-2 focus-visible:ring-cyan-300/20"
      >
        i
      </button>
      {isOpen ? (
        <span
          id={tooltipId}
          role="tooltip"
          className={`pointer-events-none fixed z-[9999] w-72 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl border border-cyan-100/25 bg-slate-950/98 p-3 text-left text-xs font-semibold leading-5 text-slate-200 opacity-100 shadow-[0_30px_90px_rgba(0,0,0,0.62),0_0_28px_rgba(34,211,238,0.18)] backdrop-blur-xl transition ${
            position.placement === "top"
              ? "-translate-y-full"
              : "translate-y-0"
          }`}
          style={{ left: position.left, top: position.top }}
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}

function MetricControl({
  compact = false,
  color = "cyan",
  defaultValue,
  helper,
  helperMode = "inline",
  label,
  max,
  min,
  onChange,
  showManualInput = true,
  showRangeMarkers = false,
  showSteppers = true,
  step = 1,
  tooltipVariant = "default",
  unit,
  value,
}: {
  compact?: boolean;
  color?: "cyan" | "orange" | "emerald" | "rose" | "violet";
  defaultValue: number;
  helper?: string;
  helperMode?: "inline" | "tooltip";
  label: string;
  max: number;
  min: number;
  onChange: (value: string) => void;
  showManualInput?: boolean;
  showRangeMarkers?: boolean;
  showSteppers?: boolean;
  step?: number;
  tooltipVariant?: "default" | "fixed";
  unit: string;
  value: string;
}) {
  const numericValue = clampNumber(
    getNumberFromProfileValue(value, defaultValue),
    min,
    max,
  );
  const displayValue = value || formatProfileNumber(defaultValue, step);
  const percent = ((numericValue - min) / Math.max(1, max - min)) * 100;
  const activeClass = {
    cyan: "from-cyan-300 to-blue-400 text-cyan-100",
    emerald: "from-emerald-300 to-teal-400 text-emerald-100",
    orange: "from-orange-300 to-yellow-300 text-orange-100",
    rose: "from-rose-300 to-red-400 text-rose-100",
    violet: "from-violet-300 to-fuchsia-400 text-violet-100",
  }[color];
  const valueTextClass = {
    cyan: "text-cyan-100",
    emerald: "text-emerald-100",
    orange: "text-orange-100",
    rose: "text-rose-100",
    violet: "text-violet-100",
  }[color];

  const setNumericValue = (nextValue: number) => {
    onChange(formatProfileNumber(clampNumber(nextValue, min, max), step));
  };
  const TooltipComponent =
    tooltipVariant === "fixed" ? FloatingInfoBubble : InfoBubble;

  return (
    <div
      className={`relative z-0 flex h-full flex-col overflow-visible border border-white/10 bg-slate-950/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition focus-within:z-50 hover:z-50 ${
        compact ? "rounded-[22px] p-4" : "rounded-[26px] p-5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            {label}
          </p>
          <div className={`${compact ? "mt-1.5" : "mt-2"} flex items-end gap-2`}>
            <span className={`${compact ? "text-3xl" : "text-4xl"} font-black ${valueTextClass}`}>
              {formatProfileNumber(numericValue, step)}
            </span>
            <span className="pb-1 text-sm font-black uppercase tracking-[0.12em] text-slate-500">
              {unit}
            </span>
          </div>
        </div>
        {showSteppers || (helper && helperMode === "tooltip") ? (
          <div className="flex items-center gap-1">
            {helper && helperMode === "tooltip" ? (
              <TooltipComponent label={label}>{helper}</TooltipComponent>
            ) : null}
            {showSteppers ? (
              <>
                <button
                  type="button"
                  onClick={() => setNumericValue(numericValue - step)}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-lg font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
                  aria-label={`Decrease ${label}`}
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setNumericValue(numericValue + step)}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-lg font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
                  aria-label={`Increase ${label}`}
                >
                  +
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={`relative ${compact ? "mt-4" : "mt-5"} h-5 rounded-full border border-white/10 bg-slate-950/80 p-1.5`}>
        <span
          className={`block h-full rounded-full bg-gradient-to-r ${activeClass} shadow-[0_0_18px_rgba(34,211,238,0.22)] transition-[width] duration-200 ease-out`}
          style={{ width: `${percent}%` }}
        />
        <span
          className={`pointer-events-none absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.25)] transition-[left] duration-200 ease-out ${valueTextClass}`}
          style={{ left: `clamp(12px, ${percent}%, calc(100% - 12px))` }}
        >
          <span className="absolute inset-1 rounded-full bg-current" />
        </span>
        <input
          aria-label={`${label} slider`}
          className="absolute -inset-y-3 left-0 h-12 w-full cursor-pointer touch-pan-x opacity-0"
          max={max}
          min={min}
          onChange={(event) => setNumericValue(Number(event.target.value))}
          step={step}
          type="range"
          value={numericValue}
        />
      </div>

      {showRangeMarkers ? (
        <div className="mt-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
          <span>
            {formatProfileNumber(min, step)} {unit}
          </span>
          <span>
            {formatProfileNumber(max, step)} {unit}
          </span>
        </div>
      ) : null}

      {showManualInput ? (
        <label className="mt-3 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
          Manual value
          <input
            className="mt-2 min-h-[42px] w-full rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/50 focus:bg-white/[0.07]"
            onChange={(event) => onChange(event.target.value)}
            placeholder={`${defaultValue} ${unit}`}
            value={displayValue}
          />
        </label>
      ) : null}
      {helper && helperMode !== "tooltip" ? (
        <p className={`${compact ? "mt-2" : "mt-3"} text-xs font-semibold leading-5 text-slate-400`}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function StatusSelector<T extends string>({
  helper,
  helperMode = "inline",
  label,
  onChange,
  options,
  value,
}: {
  helper?: string;
  helperMode?: "inline" | "tooltip";
  label: string;
  onChange: (value: T) => void;
  options: T[];
  value: T;
}) {
  return (
    <div className="relative z-0 h-full overflow-visible rounded-[24px] border border-white/10 bg-slate-950/54 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition focus-within:z-50 hover:z-50">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
          {label}
        </p>
        {helper && helperMode === "tooltip" ? (
          <InfoBubble label={label}>{helper}</InfoBubble>
        ) : null}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const active = value === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option)}
              className={`min-h-[42px] rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.1em] transition hover:-translate-y-0.5 ${
                active
                  ? "border-cyan-200/45 bg-cyan-300/16 text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.15)]"
                  : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-cyan-200/25 hover:bg-cyan-300/10 hover:text-white"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
      {helper && helperMode !== "tooltip" ? (
        <p className="mt-3 text-xs font-semibold leading-5 text-slate-400">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function Panel({
  children,
  className = "",
  eyebrow,
  headerAction,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  eyebrow?: string;
  headerAction?: React.ReactNode;
  subtitle?: string;
  title: string;
}) {
  return (
    <section
      className={`rounded-[28px] border border-white/10 bg-white/[0.055] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl ${className}`}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
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
        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </div>
      {children}
    </section>
  );
}

function CollapsibleProfilePanel({
  children,
  completion,
  expanded,
  headerAction,
  onToggle,
  summary,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  completion: number;
  expanded: boolean;
  headerAction?: React.ReactNode;
  onToggle: () => void;
  summary: React.ReactNode;
  subtitle: string;
  title: string;
}) {
  const tone = getCompletionTone(completion);

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.055] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl sm:p-5">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
          }
        }}
        className="group flex w-full items-start justify-between gap-4 rounded-[24px] border border-white/10 bg-slate-950/42 p-4 text-left transition hover:border-cyan-200/24 hover:bg-white/[0.055]"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-2xl font-black text-white">{title}</p>
            <span
              className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${tone.badge}`}
            >
              {completion}% complete
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-400">
            {subtitle}
          </p>
          {!expanded ? <div className="mt-3">{summary}</div> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headerAction ? (
            <div
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {headerAction}
            </div>
          ) : null}
          <span
            className={`grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.045] text-lg font-black text-cyan-100 transition group-hover:border-cyan-200/35 group-hover:bg-cyan-300/10 ${
              expanded ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          >
            v
          </span>
        </div>
      </div>

      <div
        className={`transition-all duration-300 ease-out ${
          expanded
            ? "mt-5 max-h-[7200px] overflow-visible opacity-100"
            : "max-h-0 overflow-hidden opacity-0"
        }`}
      >
        {children}
      </div>
    </section>
  );
}

export default function ClientProfilePage() {
  const {
    profile: sharedProfile,
    setProfile: setSharedProfile,
    updateProfile,
  } = useProfile();
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const tabSliderRef = useRef<HTMLDivElement | null>(null);
  const tabButtonRefs = useRef<Partial<Record<ProfileTab, HTMLButtonElement | null>>>({});
  const [profileSectionOpen, setProfileSectionOpen] = useState({
    measurements: false,
    myBody: false,
  });
  const [authFallback, setAuthFallback] = useState<ProfileAuthFallback>({
    avatarUrl: "",
    displayName: "",
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState<SoundFitnessProfile>(defaultProfile);
  const [savedSnapshot, setSavedSnapshot] = useState(
    JSON.stringify(defaultProfile),
  );
  const [activePlanDirectionInfo, setActivePlanDirectionInfo] =
    useState<GoalMode | null>(null);
  const [isEditingIdentity, setIsEditingIdentity] = useState(false);
  const [identityNameDraft, setIdentityNameDraft] = useState("");
  const [identityHandleDraft, setIdentityHandleDraft] = useState("");
  const [birthdayDraft, setBirthdayDraft] = useState<BirthdayParts>(() =>
    getBirthdayParts(defaultProfile.birthday),
  );
  const [customMeasurementLabel, setCustomMeasurementLabel] = useState("");
  const [customMeasurementValue, setCustomMeasurementValue] = useState("");
  const [customMeasurementsOpen, setCustomMeasurementsOpen] = useState(false);
  const measurementSliderRef = useRef<HTMLDivElement | null>(null);
  const measurementCardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activeMeasurementIndex, setActiveMeasurementIndex] = useState(0);
  const [photoMessage, setPhotoMessage] = useState("");
  const [photoViewerIndex, setPhotoViewerIndex] = useState<number | null>(null);
  const [sessionPhotoPreviews, setSessionPhotoPreviews] = useState<
    Record<string, ProgressPhoto>
  >({});
  const specialCircumstancesSliderRef = useRef<HTMLDivElement | null>(null);
  const specialCircumstanceCardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [activeSpecialCircumstanceIndex, setActiveSpecialCircumstanceIndex] =
    useState(0);
  const [specialCircumstanceScrollState, setSpecialCircumstanceScrollState] =
    useState({ canScrollLeft: false, canScrollRight: true });

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      let nextProfile = defaultProfile;
      let nextAuthFallback: ProfileAuthFallback = {
        avatarUrl: "",
        displayName: "",
        email: "",
      };

      const shared = asRecord(sharedProfile);
      const saved = Object.keys(shared).length ? shared : readSoundFitnessProfile();
      if (Object.keys(saved).length) {
        nextProfile = mergeProfile(saved as Partial<SoundFitnessProfile>);
      }

      try {
        const { data } = await supabase.auth.getUser();
        const metadata = asRecord(data.user?.user_metadata);
        const authEmail = data.user?.email || "";
        const authName =
          readProfileText(metadata.full_name, metadata.name, authEmail.split("@")[0]) ||
          "";
        const authAvatar = readProfileText(metadata.avatar_url);

        nextAuthFallback = {
          avatarUrl: authAvatar,
          displayName: authName,
          email: authEmail,
        };

        if (authName && (!nextProfile.displayName || nextProfile.displayName === "Member")) {
          nextProfile = { ...nextProfile, displayName: authName };
        }
        if (authEmail && !nextProfile.email) {
          nextProfile = { ...nextProfile, email: authEmail };
        }
        if (authAvatar && !nextProfile.profileImage && !nextProfile.avatarUrl) {
          nextProfile = { ...nextProfile, avatarUrl: authAvatar };
        }
      } catch {
        // Auth is only a name fallback; local profile data remains the source of truth.
      }

      if (!isMounted) return;

      setAuthFallback(nextAuthFallback);
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

  useEffect(() => {
    if (isEditingIdentity) return;

    setIdentityNameDraft(profile.displayName || "");
    setIdentityHandleDraft(profile.username || profile.handle || "");
  }, [
    isEditingIdentity,
    profile.displayName,
    profile.handle,
    profile.username,
  ]);

  useEffect(() => {
    setBirthdayDraft(getBirthdayParts(profile.birthday));
  }, [profile.birthday]);

  const goalDelta = useMemo(() => {
    const current = safeNumber(profile.currentWeight);
    const goal = safeNumber(profile.goalWeight);
    if (!current || !goal) return null;
    return Math.round((current - goal) * 10) / 10;
  }, [profile.currentWeight, profile.goalWeight]);
  const identityDisplayName =
    readProfileText(profile.displayName, authFallback.displayName) || "Member";
  const identityHandle =
    readProfileText(profile.username, profile.handle) ||
    identityDisplayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 24) ||
    "member";
  const profileRecord = asRecord(profile);
  const soundPointsValue = Number(
    profileRecord.soundPoints || profileRecord.points || 0,
  );
  const soundPoints = Number.isFinite(soundPointsValue) ? soundPointsValue : 0;

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
    const specialText = profile.specialCircumstances.length
      ? `Special context to respect: ${profile.specialCircumstances.map((item) => item.label).join(", ")}.`
      : "";

    return `Based on this profile, the app should prioritize ${profile.primaryGoal || profile.goalMode}, ${profile.bodyGoalMode.toLowerCase()} body direction, ${profile.sessionsPerWeek || "4"} sessions per week, ${profile.preferredSplit}, and ${profile.trainingStyles.join(", ") || "balanced training"}. ${injuryText} ${nutritionText} ${specialText}`;
  }, [
    activeLimitations,
    profile.bodyGoalMode,
    profile.goalMode,
    profile.preferredSplit,
    profile.primaryGoal,
    profile.sessionsPerWeek,
    profile.specialCircumstances,
    profile.trainingStyles,
  ]);
  const tabCompletions = useMemo(
    () => getProfileTabCompletions(profile),
    [profile],
  );
  const planReadiness = useMemo(() => {
    const readinessSectionIds: ProfileTab[] = [
      "overview",
      "goals",
      "body",
      "measurements",
      "readiness",
      "preferences",
      "circumstances",
    ];
    const sectionRows = readinessSectionIds.map((id) => ({
      id,
      label: tabs.find((tab) => tab.id === id)?.label || id,
      percent: tabCompletions[id] || 0,
    }));
    const overall = Math.round(
      sectionRows.reduce((total, row) => total + row.percent, 0) /
        Math.max(sectionRows.length, 1),
    );
    const completed = sectionRows.filter((row) => row.percent >= 80);
    const recommended = [...sectionRows].sort((a, b) => a.percent - b.percent)[0];
    const risk = calculateTrainingRisk(profile);
    const readinessScore = getEstimatedReadinessScore(profile);
    const readinessLabel = getReadinessLabel(readinessScore);
    const criticalItems = [
      {
        complete: isProfileFieldComplete(profile.primaryGoal),
        label: "Primary Goal",
      },
      {
        complete:
          isProfileFieldComplete(profile.currentWeight) &&
          isProfileFieldComplete(profile.goalWeight),
        label: "Body Weight Goal",
      },
      {
        complete:
          isProfileFieldComplete(profile.bodyStatus.averageSleepHours) ||
          isProfileFieldComplete(profile.sleepGoal),
        label: "Sleep Goal",
      },
      {
        complete:
          isProfileFieldComplete(profile.bodyStatus.energyStatus) &&
          isProfileFieldComplete(profile.bodyStatus.stressStatus) &&
          isProfileFieldComplete(profile.bodyStatus.sorenessLevel),
        label: "Recovery Readiness",
      },
      {
        complete:
          isProfileFieldComplete(profile.nutritionDirection.nutritionGoal) &&
          isProfileFieldComplete(profile.nutritionDirection.proteinTarget),
        label: "Nutrition Preferences",
      },
      {
        complete: isProfileFieldComplete(profile.appPersonalization.coachingTone),
        label: "Coaching Tone",
      },
    ];

    return {
      completed,
      missing: criticalItems
        .filter((item) => !item.complete)
        .map((item) => item.label)
        .slice(0, 4),
      overall,
      readinessLabel,
      readinessScore,
      recommended,
      risk,
      sections: sectionRows,
    };
  }, [profile, tabCompletions]);
  const planReadinessTone = getCompletionTone(planReadiness.overall);
  const planRiskTone = getTrainingRiskTone(planReadiness.risk.label);
  const heroReadinessChips = [
    {
      className: `${planRiskTone.border} ${planRiskTone.softBg} ${planRiskTone.text}`,
      label: "Risk",
      value: `${planReadiness.risk.label} Risk`,
      wide: false,
    },
    {
      className: "border-white/10 bg-white/[0.055] text-slate-200",
      label: "Sleep",
      value:
        profile.bodyStatus.averageSleepHours ||
        profile.bodyStatus.hoursSlept ||
        profile.sleepGoal ||
        "Not set",
      wide: false,
    },
    {
      className: "border-emerald-200/20 bg-emerald-300/10 text-emerald-100",
      label: "Energy",
      value: profile.bodyStatus.energyStatus,
      wide: false,
    },
    {
      className: "border-violet-200/20 bg-violet-300/10 text-violet-100",
      label: "Stress",
      value: profile.bodyStatus.stressStatus,
      wide: false,
    },
    {
      className: "border-orange-200/22 bg-orange-300/10 text-orange-100",
      label: "Soreness",
      value:
        profile.bodyStatus.sorenessStatus !== "None"
          ? profile.bodyStatus.sorenessStatus
          : `${getScaleValue(
              profile.bodyStatus.sorenessLevel,
              profile.bodyStatus.sorenessStatus,
            )}/10`,
      wide: false,
    },
    {
      className: "border-rose-200/22 bg-rose-300/10 text-rose-100",
      label: "Pain",
      value:
        profile.bodyStatus.painStatus !== "None"
          ? profile.bodyStatus.painStatus
          : `${getScaleValue(
              profile.bodyStatus.painLevel,
              profile.bodyStatus.painStatus,
            )}/10`,
      wide: false,
    },
    {
      className: "border-cyan-200/18 bg-slate-950/58 text-slate-200",
      label: "Recommendation",
      value: planReadiness.risk.recommendation,
      wide: true,
    },
  ];
  const riskGaugeScore = clampNumber(planReadiness.risk.score, 0, 100);

  useEffect(() => {
    const slider = tabSliderRef.current;
    const activeButton = tabButtonRefs.current[activeTab];
    if (!slider || !activeButton) return;

    const timeoutId = window.setTimeout(() => {
      activeButton.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }, 80);

    return () => window.clearTimeout(timeoutId);
  }, [activeTab]);

  const scrollTabs = (direction: "left" | "right") => {
    const slider = tabSliderRef.current;
    if (!slider) return;

    window.setTimeout(() => {
      slider.scrollBy({
        behavior: "smooth",
        left: direction === "left" ? -320 : 320,
      });
    }, 40);
  };

  const setProfileField = <K extends keyof SoundFitnessProfile>(
    key: K,
    value: SoundFitnessProfile[K],
  ) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const setGender = (gender: BodyModel) => {
    setProfile((current) => ({
      ...current,
      bodyModel: gender,
      gender,
    }));
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

  const updateBodyStatus = <K extends keyof BodyStatus>(
    key: K,
    value: BodyStatus[K],
  ) => {
    setProfile((current) => ({
      ...current,
      bodyStatus: {
        ...current.bodyStatus,
        [key]: value,
      },
    }));
  };

  const updateAverageSleep = (value: string) => {
    setProfile((current) => ({
      ...current,
      bodyStatus: {
        ...current.bodyStatus,
        averageSleepHours: value,
        hoursSlept: value,
      },
    }));
  };

  const updateEnergyStatus = (value: BodyStatus["energyStatus"]) => {
    setProfile((current) => ({
      ...current,
      energyLevel: energyStatusToScale(value),
      bodyStatus: {
        ...current.bodyStatus,
        energyStatus: value,
      },
    }));
  };

  const updateStressStatus = (value: BodyStatus["stressStatus"]) => {
    setProfile((current) => ({
      ...current,
      lifestyleConstraints: {
        ...current.lifestyleConstraints,
        stressLevel: stressStatusToScale(value),
      },
      bodyStatus: {
        ...current.bodyStatus,
        stressStatus: value,
      },
    }));
  };

  const updatePainLevel = (value: number) => {
    const safeValue = clampNumber(value, 0, 10);
    setProfile((current) => ({
      ...current,
      bodyStatus: {
        ...current.bodyStatus,
        painLevel: safeValue,
        painStatus: scaleToStatusLevel(safeValue),
      },
    }));
  };

  const updateSorenessLevel = (value: number) => {
    const safeValue = clampNumber(value, 0, 10);
    setProfile((current) => ({
      ...current,
      bodyStatus: {
        ...current.bodyStatus,
        sorenessLevel: safeValue,
        sorenessStatus: scaleToStatusLevel(safeValue),
      },
    }));
  };

  const updateMeasurements = <K extends keyof BodyMeasurements>(
    key: K,
    value: BodyMeasurements[K],
  ) => {
    setProfile((current) => ({
      ...current,
      measurements: {
        ...current.measurements,
        [key]: value,
        lastUpdated: new Date().toISOString(),
      },
    }));
  };

  const updateCustomMeasurement = (
    id: string,
    key: keyof CustomMeasurement,
    value: string,
  ) => {
    setProfile((current) => ({
      ...current,
      measurements: {
        ...current.measurements,
        custom: current.measurements.custom.map((item) =>
          item.id === id ? { ...item, [key]: value } : item,
        ),
        lastUpdated: new Date().toISOString(),
      },
    }));
  };

  const updateMeasurementValue = (
    key: keyof Omit<BodyMeasurements, "custom" | "lastUpdated" | "progressPhotoNote" | "progressPhotos" | "unit">,
    value: string,
  ) => {
    setProfile((current) => ({
      ...current,
      bodyFat: key === "bodyFat" ? value : current.bodyFat,
      restingHeartRate:
        key === "restingHeartRate" ? value : current.restingHeartRate,
      waist: key === "waist" ? value : current.waist,
      measurements: {
        ...current.measurements,
        [key]: value,
        lastUpdated: new Date().toISOString(),
      },
    }));
  };

  const addCustomMeasurement = () => {
    const label = customMeasurementLabel.trim();
    if (!label) return;

    setProfile((current) => ({
      ...current,
      measurements: {
        ...current.measurements,
        custom: [
          ...current.measurements.custom,
          {
            id: `${Date.now()}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
            label,
            value: customMeasurementValue.trim(),
          },
        ],
        lastUpdated: new Date().toISOString(),
      },
    }));
    setCustomMeasurementLabel("");
    setCustomMeasurementValue("");
    setCustomMeasurementsOpen(true);
  };

  const scrollMeasurements = (direction: "left" | "right") => {
    const nextIndex = clampNumber(
      activeMeasurementIndex + (direction === "right" ? 1 : -1),
      0,
      measurementDefinitions.length,
    );
    setActiveMeasurementIndex(nextIndex);
    measurementCardRefs.current[nextIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  };

  const updateActiveMeasurementFromScroll = () => {
    const slider = measurementSliderRef.current;
    if (!slider) return;

    const sliderBounds = slider.getBoundingClientRect();
    const sliderCenter = sliderBounds.left + sliderBounds.width / 2;
    let closestIndex = activeMeasurementIndex;
    let closestDistance = Number.POSITIVE_INFINITY;

    measurementCardRefs.current.forEach((card, index) => {
      if (!card) return;
      const bounds = card.getBoundingClientRect();
      const cardCenter = bounds.left + bounds.width / 2;
      const distance = Math.abs(cardCenter - sliderCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    if (closestIndex !== activeMeasurementIndex) {
      setActiveMeasurementIndex(closestIndex);
    }
  };

  const scrollSpecialCircumstances = (direction: "left" | "right") => {
    const slider = specialCircumstancesSliderRef.current;
    if (!slider) return;

    const activeCard = specialCircumstanceCardRefs.current[activeSpecialCircumstanceIndex];
    const maxScroll = Math.max(0, slider.scrollWidth - slider.clientWidth);
    const cardStep = activeCard ? activeCard.offsetWidth + 16 : slider.clientWidth * 0.8;
    const step = clampNumber(cardStep, slider.clientWidth * 0.7, slider.clientWidth * 0.85);
    const target = clampNumber(
      slider.scrollLeft + (direction === "right" ? step : -step),
      0,
      maxScroll,
    );

    slider.scrollTo({
      behavior: "smooth",
      left: target,
    });
    window.setTimeout(() => {
      updateActiveSpecialCircumstanceFromScroll();
    }, 280);
  };

  const updateActiveSpecialCircumstanceFromScroll = () => {
    const slider = specialCircumstancesSliderRef.current;
    if (!slider) return;

    const sliderBounds = slider.getBoundingClientRect();
    const sliderCenter = sliderBounds.left + sliderBounds.width / 2;
    let closestIndex = activeSpecialCircumstanceIndex;
    let closestDistance = Number.POSITIVE_INFINITY;

    specialCircumstanceCardRefs.current.forEach((card, index) => {
      if (!card) return;
      const bounds = card.getBoundingClientRect();
      const cardCenter = bounds.left + bounds.width / 2;
      const distance = Math.abs(cardCenter - sliderCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    if (closestIndex !== activeSpecialCircumstanceIndex) {
      setActiveSpecialCircumstanceIndex(closestIndex);
    }

    const maxScroll = Math.max(0, slider.scrollWidth - slider.clientWidth);
    const nextScrollState = {
      canScrollLeft: slider.scrollLeft > 4,
      canScrollRight: slider.scrollLeft < maxScroll - 4,
    };
    setSpecialCircumstanceScrollState((current) =>
      current.canScrollLeft === nextScrollState.canScrollLeft &&
      current.canScrollRight === nextScrollState.canScrollRight
        ? current
        : nextScrollState,
    );
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      updateActiveSpecialCircumstanceFromScroll();
    }, 80);
    window.addEventListener("resize", updateActiveSpecialCircumstanceFromScroll);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", updateActiveSpecialCircumstanceFromScroll);
    };
  }, [activeTab]);

  const handleProgressPhotoUpload = (
    slot: (typeof progressPhotoSlots)[number],
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoMessage("Choose an image file for progress photos.");
      window.setTimeout(() => setPhotoMessage(""), 3000);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === "string" ? reader.result : "";
      if (!src) return;

      const photo: ProgressPhoto = {
        dateAdded: new Date().toISOString(),
        id: `${slot.id}-${Date.now()}`,
        label: slot.label,
        sessionOnly: file.size > 1_500_000,
        slotId: slot.id,
        src,
      };

      if (photo.sessionOnly) {
        setSessionPhotoPreviews((current) => ({
          ...current,
          [slot.id]: photo,
        }));
        setPhotoMessage(
          "Large photo is preview-only for this session. TODO: move photo storage to Supabase Storage.",
        );
        window.setTimeout(() => setPhotoMessage(""), 5000);
        return;
      }

      setProfile((current) => ({
        ...current,
        measurements: {
          ...current.measurements,
          lastUpdated: new Date().toISOString(),
          progressPhotos: [
            photo,
            ...current.measurements.progressPhotos.filter(
              (item) => item.slotId !== slot.id,
            ),
          ],
        },
      }));
      setSessionPhotoPreviews((current) => {
        const next = { ...current };
        delete next[slot.id];
        return next;
      });
      setPhotoMessage("Progress photo added locally.");
      window.setTimeout(() => setPhotoMessage(""), 2600);
    };
    reader.readAsDataURL(file);
  };

  const removeProgressPhoto = (slotId: string) => {
    setProfile((current) => ({
      ...current,
      measurements: {
        ...current.measurements,
        lastUpdated: new Date().toISOString(),
        progressPhotos: current.measurements.progressPhotos.filter(
          (photo) => photo.slotId !== slotId,
        ),
      },
    }));
    setSessionPhotoPreviews((current) => {
      const next = { ...current };
      delete next[slotId];
      return next;
    });
    setPhotoViewerIndex(null);
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

  const toggleSpecialCircumstance = (circumstance: {
    id: string;
    label: string;
  }) => {
    setProfile((current) => {
      const exists = current.specialCircumstances.some(
        (item) => item.id === circumstance.id,
      );

      return {
        ...current,
        specialCircumstances: exists
          ? current.specialCircumstances.filter((item) => item.id !== circumstance.id)
          : [
              ...current.specialCircumstances,
              {
                id: circumstance.id,
                label: circumstance.label,
                notes: "",
                startDate: "",
                status: "active",
              },
            ],
      };
    });
  };

  const updateSpecialCircumstance = <K extends keyof SpecialCircumstance>(
    id: string,
    key: K,
    value: SpecialCircumstance[K],
  ) => {
    setProfile((current) => ({
      ...current,
      specialCircumstances: current.specialCircumstances.map((item) =>
        item.id === id ? { ...item, [key]: value } : item,
      ),
    }));
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
    const storedProfile = readSoundFitnessProfile();
    const stored = asRecord(storedProfile);
    const displayName =
      readProfileText(
        profile.displayName,
        profile.fullName,
        `${readProfileText(stored.firstName)} ${readProfileText(stored.lastName)}`,
        stored.displayName,
        stored.fullName,
        authFallback.displayName,
      ) || "Member";
    const username = readProfileText(
      profile.username,
      profile.handle,
      stored.username,
      stored.handle,
    );
    const email = readProfileText(profile.email, stored.email, authFallback.email);
    const profileImage = readProfileText(
      profile.profileImage,
      profile.avatarUrl,
      stored.profileImage,
      stored.avatarUrl,
      stored.avatar_url,
      authFallback.avatarUrl,
    );
    const gender = normalizeBodyModel(
      profile.gender || profile.bodyModel || stored.gender || stored.bodyModel,
    );
    const updatedAt = new Date().toISOString();
    const nextProfile = {
      ...stored,
      ...profile,
      avatarUrl: profileImage,
      bodyModel: gender,
      displayName,
      email,
      fullName: displayName,
      gender,
      profileImage,
      updatedAt,
      username,
    };

    // TODO: Persist this profile to Supabase when the profile schema is ready for
    // the full training identity object. localStorage is the safe source today.
    setSharedProfile(nextProfile);
    updateProfile(nextProfile);
    setProfile(nextProfile);
    setSavedSnapshot(JSON.stringify(nextProfile));
    setMessage("Profile saved locally.");
    window.setTimeout(() => setMessage(""), 2400);
  };

  const saveIdentity = () => {
    const displayName =
      readProfileText(identityNameDraft, profile.displayName, authFallback.displayName) ||
      "Member";
    const username = readProfileText(identityHandleDraft)
      .replace(/^@+/, "")
      .replace(/\s+/g, "")
      .toLowerCase();
    const updatedAt = new Date().toISOString();
    const nextProfile = {
      ...profile,
      displayName,
      fullName: displayName,
      username,
      handle: username,
      updatedAt,
    };

    setSharedProfile(nextProfile);
    updateProfile(nextProfile);
    setProfile(nextProfile);
    setSavedSnapshot(JSON.stringify(nextProfile));
    setIsEditingIdentity(false);
    setMessage("Profile identity updated.");
    window.setTimeout(() => setMessage(""), 2200);
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

  const renderHeroStatusCommandCenter = () => (
    <aside className="rounded-[30px] border border-white/10 bg-slate-950/58 p-4 shadow-[0_22px_80px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.10)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/80">
            Readiness Context
          </p>
          <p className="mt-1 text-lg font-black text-white">
            Status Panel
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] ${planReadinessTone.badge}`}>
          {planReadiness.readinessLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="relative overflow-hidden rounded-[24px] border border-cyan-100/18 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.22),transparent_42%),rgba(15,23,42,0.72)] p-4 shadow-[0_0_34px_rgba(34,211,238,0.12),inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="pointer-events-none absolute right-4 top-3 h-16 w-16 rounded-full bg-cyan-300/12 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full border border-cyan-100/20 bg-slate-950/80 p-2 shadow-[0_0_30px_rgba(34,211,238,0.16)]">
              <div
                className="absolute inset-2 rounded-full transition-[background] duration-700 ease-out"
                style={{
                  background: `conic-gradient(rgba(34,211,238,0.9) 0deg, rgba(251,191,36,0.9) ${Math.max(
                    0,
                    planReadiness.overall * 3.6 - 28,
                  )}deg, rgba(34,211,238,0.9) ${planReadiness.overall * 3.6}deg, rgba(15,23,42,0.82) 0deg)`,
                }}
              />
              <div className="absolute inset-5 rounded-full border border-white/10 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.08),transparent_42%),rgba(2,6,23,0.96)] shadow-[inset_0_0_22px_rgba(0,0,0,0.55)]" />
              <div className="relative text-center">
                <p className={`text-2xl font-black leading-none ${planReadinessTone.text}`}>
                  {planReadiness.overall}
                  <span className="text-sm text-slate-500">%</span>
                </p>
                <p className="mt-1 text-[7px] font-black uppercase tracking-[0.12em] text-slate-500">
                  Ready
                </p>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Plan Ready
              </p>
              <p className="mt-1 text-sm font-black text-white">
                {planReadiness.completed.length}/{planReadiness.sections.length} sections complete
              </p>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
                Next:{" "}
                <span className="font-black text-cyan-100">
                  {planReadiness.recommended.label}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-cyan-100/16 bg-cyan-300/8 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/80">
                Readiness Summary
              </p>
              <p className="mt-1 text-2xl font-black text-white">
                {planReadiness.readinessScore}
              </p>
            </div>
            <span className="rounded-full border border-cyan-100/20 bg-slate-950/58 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">
              Estimated
            </span>
          </div>

          <div className={`mt-3 rounded-[20px] border ${planRiskTone.border} bg-slate-950/54 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-orange-100/80">
                  Training Risk
                </p>
                <p className={`mt-1 text-sm font-black ${planRiskTone.text}`}>
                  {planReadiness.risk.label}
                </p>
              </div>
              <p className={`text-xl font-black ${planRiskTone.text}`}>
                {planReadiness.risk.score}
                <span className="text-xs text-slate-500">%</span>
              </p>
            </div>
            <div className="relative mt-3 h-12">
              <div
                className="absolute inset-x-0 top-5 h-3 rounded-full shadow-[0_0_24px_rgba(251,146,60,0.14)]"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(34,211,238,0.92) 0%, rgba(16,185,129,0.9) 28%, rgba(250,204,21,0.92) 52%, rgba(251,146,60,0.94) 74%, rgba(244,63,94,0.96) 100%)",
                }}
              />
              <div
                className="absolute top-1 -translate-x-1/2 transition-[left] duration-500"
                style={{ left: `${riskGaugeScore}%` }}
              >
                <span className="mx-auto block h-4 w-0.5 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.7)]" />
                <span className="mt-1 block h-0 w-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-white drop-shadow-[0_0_8px_rgba(255,255,255,0.55)]" />
              </div>
              <div className="absolute inset-x-0 bottom-0 flex justify-between text-[7px] font-black uppercase tracking-[0.07em] text-slate-500">
                <span>Low</span>
                <span>Very High</span>
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {heroReadinessChips
              .filter((chip) => chip.label !== "Risk" && chip.label !== "Recommendation")
              .map((chip) => (
                <div
                  key={chip.label}
                  className={`rounded-2xl border px-3 py-2 ${chip.className}`}
                >
                  <p className="text-[9px] font-black uppercase tracking-[0.12em] opacity-70">
                    {chip.label}
                  </p>
                  <p className="mt-1 break-words text-xs font-black leading-4">
                    {chip.value}
                  </p>
                </div>
              ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-orange-200/20 bg-orange-300/10 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-100/80">
            Recommended Next Step
          </p>
          <p className="mt-2 text-xs font-semibold leading-5 text-orange-50">
            {planReadiness.risk.recommendation}
          </p>
          {planReadiness.risk.factors.length ? (
            <div className="mt-3">
              <p className="mb-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-orange-100/70">
                Factors
              </p>
              <div className="flex max-w-full flex-wrap gap-1 overflow-x-hidden">
                {planReadiness.risk.factors.map((factor) => (
                  <span
                    key={factor}
                    title={factor}
                    className={`inline-flex min-h-[19px] max-w-full items-center rounded-lg border ${planRiskTone.border} bg-slate-950/42 px-1.5 py-0.5 text-[8px] font-black leading-none ${planRiskTone.text}`}
                  >
                    {getCompactRiskFactorLabel(factor)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );

  const renderHero = () => (
    <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.22),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(251,146,60,0.18),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.94))] p-5 shadow-[0_34px_120px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.14)] sm:p-7">
      <div className="pointer-events-none absolute right-[-10%] top-[-30%] h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="relative z-10 grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-start">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-200/80">
            Personal Command Center
          </p>
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex shrink-0 flex-col items-center gap-3">
              <div className="relative h-28 w-28 overflow-hidden rounded-full border border-cyan-100/24 bg-cyan-300/12 shadow-[0_0_44px_rgba(34,211,238,0.2)]">
                {profile.profileImage ? (
                  <img
                    alt={`${identityDisplayName} profile`}
                    className="h-full w-full object-cover"
                    src={profile.profileImage}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_32%_24%,rgba(34,211,238,0.26),transparent_42%),rgba(8,47,73,0.62)] text-4xl font-black text-cyan-100">
                    {identityDisplayName.trim().slice(0, 2).toUpperCase() || "SF"}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <label
                  className="inline-flex min-h-[34px] cursor-pointer items-center gap-2 rounded-full border border-cyan-100/28 bg-cyan-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.12)] transition hover:bg-cyan-300 hover:text-slate-950"
                  title={profile.profileImage ? "Change Photo" : "Add Photo"}
                >
                  {profile.profileImage ? (
                    <CameraIcon className="h-3.5 w-3.5" />
                  ) : (
                    <ImagePlusIcon className="h-3.5 w-3.5" />
                  )}
                  {profile.profileImage ? "Change" : "Add Photo"}
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
                    className="inline-flex min-h-[34px] items-center rounded-full border border-red-200/25 bg-red-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-red-100 transition hover:bg-red-400 hover:text-slate-950"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                    Sound Fitness ID
                  </p>
                  <p className="mt-2 break-words text-4xl font-black uppercase tracking-wide text-white drop-shadow-[0_0_22px_rgba(34,211,238,0.18)] sm:text-5xl">
                    {identityDisplayName}
                  </p>
                  <p className="mt-2 text-sm font-black text-cyan-100">
                    @{identityHandle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIdentityNameDraft(identityDisplayName);
                    setIdentityHandleDraft(identityHandle);
                    setIsEditingIdentity((current) => !current);
                  }}
                  className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-200 transition hover:border-cyan-200/35 hover:bg-cyan-300/12 hover:text-cyan-100"
                >
                  {isEditingIdentity ? "Close" : "Edit Profile Name"}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-orange-200/24 bg-orange-300/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-orange-100">
                  {profile.memberType || "Member"}
                </span>
                <span className="rounded-full border border-cyan-200/24 bg-cyan-300/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-cyan-100">
                  {soundPoints} pts
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-300">
                  {profile.trainingAge || "Training age not set"}
                </span>
              </div>

              {isEditingIdentity ? (
                <div className="mt-4 rounded-[24px] border border-cyan-100/18 bg-slate-950/62 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="grid gap-3 md:grid-cols-[1fr_0.8fr]">
                    <Field
                      label="Display Name"
                      onChange={setIdentityNameDraft}
                      placeholder="Member"
                      value={identityNameDraft}
                    />
                    <Field
                      label="Handle"
                      onChange={setIdentityHandleDraft}
                      placeholder="joeybell"
                      value={identityHandleDraft}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={saveIdentity}
                      className="rounded-full border border-cyan-100/30 bg-cyan-300 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_0_22px_rgba(34,211,238,0.18)] transition hover:bg-cyan-200"
                    >
                      Save Identity
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIdentityNameDraft(identityDisplayName);
                        setIdentityHandleDraft(identityHandle);
                        setIsEditingIdentity(false);
                      }}
                      className="rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-300 transition hover:border-white/20 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
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
        <div className="min-w-0 xl:self-start">
          {renderHeroStatusCommandCenter()}
        </div>
      </div>
    </section>
  );

  const renderPlanReadiness = () => (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(251,146,60,0.12),transparent_32%),rgba(15,23,42,0.72)] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.10)] sm:p-5">
      <div className="relative z-10">
        <div
          className={`min-w-0 overflow-hidden rounded-[30px] border border-white/10 bg-slate-950/48 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] ${planReadinessTone.glow}`}
        >
          <div className="grid min-w-0 gap-4 xl:grid-cols-[178px_1fr]">
            <div className="relative overflow-hidden rounded-[28px] border border-cyan-100/18 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.2),transparent_48%),rgba(15,23,42,0.72)] p-4 text-center shadow-[0_0_38px_rgba(34,211,238,0.12),inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="pointer-events-none absolute inset-x-8 top-3 h-16 rounded-full bg-cyan-300/12 blur-2xl" />
              <div className="relative mx-auto grid h-36 w-36 place-items-center rounded-full border border-cyan-100/20 bg-slate-950/80 p-2 shadow-[0_0_34px_rgba(34,211,238,0.16)]">
                <div
                  className="absolute inset-2 rounded-full transition-[background] duration-700 ease-out"
                  style={{
                    background: `conic-gradient(rgba(34,211,238,0.9) 0deg, rgba(251,191,36,0.9) ${Math.max(
                      0,
                      planReadiness.overall * 3.6 - 28,
                    )}deg, rgba(34,211,238,0.9) ${planReadiness.overall * 3.6}deg, rgba(15,23,42,0.82) 0deg)`,
                  }}
                />
                <div className="absolute inset-5 rounded-full border border-white/10 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.08),transparent_42%),rgba(2,6,23,0.96)] shadow-[inset_0_0_26px_rgba(0,0,0,0.55)]" />
                <div className="relative text-center">
                  <p className={`text-4xl font-black leading-none ${planReadinessTone.text}`}>
                    {planReadiness.overall}
                    <span className="text-lg text-slate-500">%</span>
                  </p>
                  <p className="mt-1 text-[9px] font-black uppercase tracking-[0.13em] text-slate-500">
                    Complete
                  </p>
              <p className="mt-3 text-sm font-black text-white">
                {planReadiness.overall >= 80 ? "Profile Ready" : "Profile Building"}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                {planReadiness.completed.length}/{planReadiness.sections.length} sections
              </p>
            </div>
              </div>
            </div>

            <div className="min-w-0 rounded-[28px] border border-white/10 bg-white/[0.035] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-200">
                    Plan Readiness
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {planReadiness.overall >= 80
                      ? "Ready for smarter plans"
                      : "Complete your coaching context"}
                  </p>
                  <p className="mt-2 text-xs font-black uppercase tracking-[0.13em] text-slate-400">
                    {planReadiness.completed.length} of {planReadiness.sections.length} core sections complete
                  </p>
                </div>
                <span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] ${planReadinessTone.badge}`}>
                  {planReadiness.readinessLabel}
                </span>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {[
                  {
                    label: "Completed",
                    tone: "text-emerald-100",
                    value: `${planReadiness.completed.length}/${planReadiness.sections.length} sections`,
                  },
                  {
                    label: "Needs",
                    tone: planReadiness.missing.length
                      ? "text-orange-100"
                      : "text-cyan-100",
                    value: planReadiness.missing.length
                      ? `${planReadiness.missing.length} critical items`
                      : "Core profile ready",
                  },
                  {
                    label: "Next Section",
                    tone: "text-orange-100",
                    value: planReadiness.recommended.label,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="min-w-[156px] shrink-0 rounded-2xl border border-white/10 bg-slate-950/50 p-3"
                  >
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                      {item.label}
                    </p>
                    <p className={`mt-1 text-xs font-black leading-4 ${item.tone}`}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {planReadiness.sections.map((section) => {
                  const tone = getCompletionTone(section.percent);
                  return (
                    <div
                      key={section.id}
                      className="min-w-[132px] shrink-0 rounded-2xl border border-white/10 bg-slate-950/46 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
                          {section.label}
                        </p>
                        <span className={`text-[10px] font-black ${tone.text}`}>
                          {section.percent >= 80 ? "\u2713" : `${section.percent}%`}
                        </span>
                      </div>
                      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-950/80">
                        <span
                          className={`block h-full rounded-full bg-gradient-to-r ${tone.bar} transition-[width] duration-500`}
                          style={{ width: `${section.percent}%` }}
                        />
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-950/75 p-1">
            <span
              className={`block h-full rounded-full bg-gradient-to-r ${planReadinessTone.bar} transition-[width] duration-500`}
              style={{ width: `${planReadiness.overall}%` }}
            />
          </div>

          <div className="mt-5 grid gap-4 text-xs font-semibold leading-5 text-slate-300">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                Completed
              </p>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {planReadiness.completed.length ? (
                  planReadiness.completed.slice(0, 4).map((section) => (
                    <span
                      key={section.id}
                      className="shrink-0 whitespace-nowrap rounded-full border border-emerald-200/25 bg-emerald-300/12 px-3 py-1.5 text-[11px] font-black text-emerald-100"
                    >
                      ✓ {section.label}
                    </span>
                  ))
                ) : (
                  <span className="shrink-0 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[11px] font-black text-slate-400">
                    Complete a section to start lighting this up
                  </span>
                )}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                Missing Critical Items
              </p>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {(planReadiness.missing.length
                  ? planReadiness.missing
                  : [`Next: ${planReadiness.recommended.label}`]
                ).map((item) => (
                  <span
                    key={item}
                    className="shrink-0 whitespace-nowrap rounded-full border border-orange-200/24 bg-orange-300/10 px-3 py-1.5 text-[11px] font-black text-orange-100"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs font-semibold leading-5 text-slate-400">
            Recommended next step:{" "}
            <span className="font-black text-cyan-100">
              {planReadiness.recommended.label}
            </span>
            . This is a training readiness estimate, not medical advice.
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
      <div className="relative z-0 grid overflow-visible gap-x-4 gap-y-8 md:grid-cols-2 xl:grid-cols-4">
        {goalCards.map((goal) => {
          const isActive = profile.goalMode === goal.id;
          const isInfoActive = activePlanDirectionInfo === goal.id;
          const tooltipId = `plan-direction-${goal.id
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")}`;
          const selectGoal = () => {
            setActivePlanDirectionInfo(null);
            setProfileField("goalMode", goal.id);
            setProfileField("primaryGoal", `${goal.id} Plan`);
          };

          return (
            <div
              key={goal.id}
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              onClick={selectGoal}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  selectGoal();
                }
              }}
              className={`group/card relative z-0 flex min-h-[168px] cursor-pointer flex-col overflow-visible rounded-[28px] border p-4 text-left transition duration-200 hover:z-[80] hover:-translate-y-1 hover:scale-[1.01] focus:z-[80] focus:outline-none focus-visible:-translate-y-1 focus-visible:scale-[1.01] active:scale-[0.99] ${
                isActive
                  ? "border-cyan-200/55 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.24),transparent_42%),rgba(8,47,73,0.48)] shadow-[0_0_38px_rgba(34,211,238,0.2)]"
                  : "border-white/10 bg-slate-950/48 hover:border-cyan-200/28 hover:bg-white/[0.065] hover:shadow-[0_0_26px_rgba(34,211,238,0.1)] focus-visible:border-cyan-200/40 focus-visible:shadow-[0_0_28px_rgba(34,211,238,0.14)]"
              }`}
            >
              <span
                className={`pointer-events-none absolute inset-x-0 top-0 h-20 rounded-t-[28px] bg-gradient-to-br from-cyan-300/14 via-blue-300/8 to-transparent transition ${
                  isActive
                    ? "opacity-100"
                    : "opacity-60 group-hover/card:opacity-100"
                }`}
              />
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`relative grid h-12 w-12 place-items-center rounded-2xl border text-xl transition duration-200 group-hover/card:scale-105 group-focus-visible/card:scale-105 ${
                    isActive
                      ? "border-cyan-100/35 bg-cyan-300/18 shadow-[0_0_22px_rgba(34,211,238,0.18)]"
                      : "border-white/10 bg-white/[0.055]"
                  }`}
                >
                  {goal.icon}
                </span>
                <div className="relative flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-2xl border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] ${
                      isActive
                        ? "border-orange-100/35 bg-orange-300/16 text-orange-100"
                        : "border-white/10 bg-white/[0.055] text-cyan-100"
                    }`}
                  >
                    {goal.signal}
                  </span>
                  <span
                    className="relative z-[90] inline-flex overflow-visible"
                    onMouseEnter={() => setActivePlanDirectionInfo(goal.id)}
                    onMouseLeave={() =>
                      setActivePlanDirectionInfo((current) =>
                        current === goal.id ? null : current,
                      )
                    }
                  >
                    <button
                      type="button"
                      aria-label={`${goal.label} plan direction details`}
                      aria-describedby={isInfoActive ? tooltipId : undefined}
                      aria-expanded={isInfoActive}
                      onClick={(event) => {
                        event.stopPropagation();
                        setActivePlanDirectionInfo(goal.id);
                      }}
                      onKeyDown={(event) => {
                        event.stopPropagation();
                      }}
                      onFocus={() => setActivePlanDirectionInfo(goal.id)}
                      onBlur={() =>
                        setActivePlanDirectionInfo((current) =>
                          current === goal.id ? null : current,
                        )
                      }
                      className={`grid h-7 w-7 place-items-center rounded-full border text-[11px] font-black transition duration-200 hover:-translate-y-0.5 hover:scale-105 focus:outline-none focus-visible:-translate-y-0.5 focus-visible:scale-105 focus-visible:ring-2 focus-visible:ring-cyan-200/50 ${
                        isInfoActive
                          ? "border-cyan-100/45 bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.18)]"
                          : "border-white/10 bg-slate-950/58 text-slate-400 hover:border-cyan-100/35 hover:text-cyan-100 focus-visible:border-cyan-100/35 focus-visible:text-cyan-100"
                      }`}
                    >
                      i
                    </button>
                    <span
                      id={tooltipId}
                      role="tooltip"
                      className={`pointer-events-none absolute bottom-[calc(100%+0.65rem)] right-0 z-[160] w-72 max-w-[calc(100vw-2rem)] translate-y-2 scale-95 rounded-2xl border border-cyan-100/24 bg-slate-950/96 p-3 text-xs font-semibold leading-5 text-slate-300 opacity-0 shadow-[0_24px_70px_rgba(0,0,0,0.55),0_0_28px_rgba(34,211,238,0.16)] backdrop-blur-xl transition duration-200 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 ${
                        isInfoActive
                          ? "translate-y-0 scale-100 opacity-100"
                          : ""
                      }`}
                    >
                      <span className="absolute -bottom-1 right-3 h-2 w-2 rotate-45 border-b border-r border-cyan-100/24 bg-slate-950 sm:left-1/2 sm:right-auto sm:-translate-x-1/2" />
                      <span className="block font-black text-cyan-100">
                        {goal.description}
                      </span>
                      <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.1em] text-orange-200/90">
                        {goal.effect}
                      </span>
                    </span>
                  </span>
                </div>
              </div>
              <div className="relative mt-5">
                <p className="text-lg font-black leading-tight text-white">
                  {goal.label}
                </p>
                <p
                  className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] transition ${
                    isActive
                      ? "border-cyan-100/35 bg-cyan-300/16 text-cyan-100"
                      : "border-white/10 bg-white/[0.04] text-slate-500 group-hover/card:text-cyan-100"
                  }`}
                >
                  {isActive ? "Active" : "Tap to select"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
  /*
                  {isActive ? "✓ Active" : "Tap to select"}
  */
  const renderGenderSelector = () => (
    <div className="relative z-0 flex h-full flex-col gap-3 overflow-visible rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_14%_0%,rgba(34,211,238,0.10),transparent_34%),rgba(15,23,42,0.56)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition focus-within:z-50 hover:z-50 sm:justify-between">
      <div className="flex items-center gap-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
          Gender
        </p>
        <InfoBubble label="Gender">
          Used across app visuals, muscle maps, libraries, and recovery views.
        </InfoBubble>
      </div>
      <div className="inline-flex w-full gap-1 rounded-2xl border border-white/10 bg-slate-950/78 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        {genderOptions.map((option) => {
          const active = normalizeBodyModel(profile.gender || profile.bodyModel) === option.id;
          const accent =
            option.id === "male"
              ? {
                  active:
                    "border-cyan-100/38 bg-[radial-gradient(circle_at_25%_0%,rgba(34,211,238,0.30),transparent_44%),rgba(34,211,238,0.14)] text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.18)]",
                  idle: "text-slate-400 hover:border-cyan-200/30 hover:bg-cyan-300/10 hover:text-cyan-100",
                  symbol: "text-cyan-200",
                }
              : {
                  active:
                    "border-fuchsia-100/34 bg-[radial-gradient(circle_at_25%_0%,rgba(217,70,239,0.24),transparent_44%),rgba(168,85,247,0.14)] text-fuchsia-50 shadow-[0_0_24px_rgba(217,70,239,0.16)]",
                  idle: "text-slate-400 hover:border-fuchsia-200/28 hover:bg-fuchsia-300/10 hover:text-fuchsia-100",
                  symbol: "text-fuchsia-200",
                };
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => setGender(option.id)}
              className={`flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition duration-200 hover:-translate-y-0.5 active:scale-[0.98] sm:min-w-[112px] ${
                active
                  ? accent.active
                  : `border-transparent bg-transparent ${accent.idle}`
              }`}
            >
              <span
                className={`text-base leading-none ${
                  active ? accent.symbol : "text-slate-500"
                }`}
              >
                {option.symbol}
              </span>
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  /*
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

  const renderGenderSelector = () => (
    <div className="relative z-0 flex h-full flex-col gap-3 overflow-visible rounded-[24px] border border-white/10 bg-slate-950/52 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition focus-within:z-50 hover:z-50 sm:justify-between">
      <div className="flex items-center gap-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
          Gender
        </p>
        <InfoBubble label="Gender">
          Used across app visuals, muscle maps, libraries, and recovery views.
        </InfoBubble>
      </div>
      <div className="inline-flex w-full rounded-2xl border border-white/10 bg-slate-950/70 p-1">
        {genderOptions.map((option) => {
          const active = normalizeBodyModel(profile.gender || profile.bodyModel) === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => setGender(option.id)}
              className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition sm:min-w-[112px] ${
                active
                  ? "bg-cyan-300 text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.2)]"
                  : "text-slate-400 hover:bg-cyan-300/10 hover:text-cyan-100"
              }`}
            >
              <span className="text-base leading-none">{option.symbol}</span>
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  */

  const renderBodyMetrics = () => {
    const weightUnit =
      profile.appPersonalization.preferredUnitSystem === "kg" ? "kg" : "lb";
    const heightUnit =
      profile.appPersonalization.preferredUnitSystem === "kg" ? "cm" : "in";
    const waterUnit =
      profile.appPersonalization.preferredUnitSystem === "kg" ? "L" : "oz";
    const waterDefault = waterUnit === "L" ? 2.5 : 80;
    const calculatedAge = calculateAgeFromBirthday(profile.birthday);
    const displayedAge = calculatedAge || profile.age;
    const updateBirthday = (birthday: string) => {
      const nextAge = calculateAgeFromBirthday(birthday);
      setProfile((current) => ({
        ...current,
        age: nextAge || current.age,
        birthday,
      }));
    };
    const birthdayDayCount = getDaysInBirthdayMonth(
      birthdayDraft.month,
      birthdayDraft.year,
    );
    const birthdayDays = Array.from({ length: birthdayDayCount }, (_, index) =>
      String(index + 1).padStart(2, "0"),
    );
    const updateBirthdayPart = (key: keyof BirthdayParts, rawValue: string) => {
      const value =
        key === "year"
          ? rawValue.replace(/\D/g, "").slice(0, 4)
          : rawValue;
      const nextParts = {
        ...birthdayDraft,
        [key]: value,
      };

      const maxDay = getDaysInBirthdayMonth(nextParts.month, nextParts.year);
      if (nextParts.day && Number.parseInt(nextParts.day, 10) > maxDay) {
        nextParts.day = String(maxDay).padStart(2, "0");
      }

      setBirthdayDraft(nextParts);

      if (nextParts.year.length === 4 && nextParts.month && nextParts.day) {
        updateBirthday(`${nextParts.year}-${nextParts.month}-${nextParts.day}`);
      }
    };
    const clearBirthday = () => {
      setBirthdayDraft({ day: "", month: "", year: "" });
      setProfile((current) => ({
        ...current,
        birthday: "",
      }));
    };
    const genderSummary =
      normalizeBodyModel(profile.gender || profile.bodyModel) === "female"
        ? "♀ Female"
        : "♂ Male";
    const bodySummaryItems = [
      genderSummary,
      displayedAge ? `${displayedAge} yrs` : "Age not set",
      profile.height ? `${profile.height} ${heightUnit}` : "Height not set",
      profile.currentWeight
        ? `${profile.currentWeight} ${weightUnit}`
        : "Weight not set",
      profile.goalWeight
        ? `Goal ${profile.goalWeight} ${weightUnit}`
        : "Goal not set",
    ];
    const bodySummary = (
      <div className="flex flex-wrap gap-2">
        {bodySummaryItems.map((item) => (
          <span
            key={item}
            className="rounded-full border border-cyan-200/18 bg-cyan-300/10 px-3 py-1.5 text-[11px] font-black text-cyan-50"
          >
            {item}
          </span>
        ))}
      </div>
    );

    return (
      <CollapsibleProfilePanel
        completion={tabCompletions.body}
        expanded={profileSectionOpen.myBody}
        onToggle={() =>
          setProfileSectionOpen((current) => ({
            measurements: false,
            myBody: !current.myBody,
          }))
        }
        summary={bodySummary}
        title="My Body"
        subtitle="Physical context that helps personalize training, recovery, nutrition, and recommendations."
      >
        {/* TODO: Use these body and lifestyle inputs to tune workout recommendations, recovery prompts, nutrition targets, and equipment assumptions once shared recommendation logic is ready. */}
        <div className="relative z-0 overflow-visible rounded-[28px] border border-cyan-200/16 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.14),transparent_30%),rgba(15,23,42,0.62)] p-4 shadow-[0_0_44px_rgba(34,211,238,0.08)] md:p-5">
            <p className="mb-4 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-xs font-semibold leading-5 text-slate-400">
              Only share what you want used for coaching context.
            </p>
            <div className="mb-4 grid gap-4 lg:grid-cols-3">
              {renderGenderSelector()}
              <div className="relative z-0 overflow-visible rounded-[24px] border border-white/10 bg-slate-950/52 p-4 transition focus-within:z-50 hover:z-50">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-300">
                      Birthday
                    </p>
                    <InfoBubble label="Birthday">
                      Used to personalize recommendations and recovery estimates.
                    </InfoBubble>
                  </div>
                  {profile.birthday ? (
                    <button
                      type="button"
                      onClick={clearBirthday}
                      className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 transition hover:border-red-200/30 hover:bg-red-300/10 hover:text-red-100"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 grid grid-cols-[1.1fr_0.8fr_1fr] gap-2">
                  <label className="block">
                    <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                      Month
                    </span>
                    <select
                      aria-label="Birthday month"
                      className="min-h-[48px] w-full rounded-2xl border border-white/10 bg-slate-950/78 px-3 py-3 text-sm font-black text-white outline-none transition hover:border-cyan-200/30 hover:bg-white/[0.06] focus:border-cyan-200/55 focus:bg-white/[0.075] focus:ring-2 focus:ring-cyan-300/15"
                      onChange={(event) => updateBirthdayPart("month", event.target.value)}
                      value={birthdayDraft.month}
                    >
                      <option value="">Month</option>
                      {birthdayMonthOptions.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                      Day
                    </span>
                    <select
                      aria-label="Birthday day"
                      className="min-h-[48px] w-full rounded-2xl border border-white/10 bg-slate-950/78 px-3 py-3 text-sm font-black text-white outline-none transition hover:border-cyan-200/30 hover:bg-white/[0.06] focus:border-cyan-200/55 focus:bg-white/[0.075] focus:ring-2 focus:ring-cyan-300/15"
                      onChange={(event) => updateBirthdayPart("day", event.target.value)}
                      value={birthdayDraft.day}
                    >
                      <option value="">Day</option>
                      {birthdayDays.map((day) => (
                        <option key={day} value={day}>
                          {Number.parseInt(day, 10)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                      Year
                    </span>
                    <input
                      aria-label="Birthday year"
                      className="min-h-[48px] w-full rounded-2xl border border-white/10 bg-slate-950/78 px-3 py-3 text-sm font-black text-white outline-none transition placeholder:text-slate-600 hover:border-cyan-200/30 hover:bg-white/[0.06] focus:border-cyan-200/55 focus:bg-white/[0.075] focus:ring-2 focus:ring-cyan-300/15"
                      inputMode="numeric"
                      maxLength={4}
                      onChange={(event) => updateBirthdayPart("year", event.target.value)}
                      placeholder="Year"
                      type="text"
                      value={birthdayDraft.year}
                    />
                  </label>
                </div>

                {profile.birthday ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-2xl border border-cyan-200/14 bg-cyan-300/8 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/75">
                        Birthday
                      </p>
                      <p className="mt-1 text-sm font-black text-white">
                        {birthdayMonthOptions.find(
                          (month) => month.value === birthdayDraft.month,
                        )?.label || "Month"}{" "}
                        {Number.parseInt(birthdayDraft.day, 10) || "--"},{" "}
                        {birthdayDraft.year || "----"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-orange-200/14 bg-orange-300/8 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-100/75">
                        Age
                      </p>
                      <p className="mt-1 text-2xl font-black text-white">
                        {displayedAge || "Not set"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                        Age fallback
                      </p>
                      <input
                        className="min-h-[38px] w-24 rounded-xl border border-white/10 bg-slate-950/72 px-3 py-2 text-sm font-black text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/50 focus:bg-white/[0.07]"
                        inputMode="numeric"
                        onChange={(event) => setProfileField("age", event.target.value)}
                        placeholder="Age"
                        type="number"
                        value={profile.age}
                      />
                    </div>
                  </div>
                )}
              </div>
              <MetricControl
                compact
                color="violet"
                defaultValue={heightUnit === "cm" ? 173 : 68}
                helper="Height supports future estimates and exercise setup context."
                helperMode="tooltip"
                label="Height"
                max={heightUnit === "cm" ? 220 : 86}
                min={heightUnit === "cm" ? 120 : 48}
                onChange={(value) => setProfileField("height", value)}
                showManualInput={false}
                showRangeMarkers
                showSteppers={false}
                unit={heightUnit}
                value={getHeightControlValue(profile.height, heightUnit)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="hidden">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/75">
                  Body Weight
                </p>
                <p className="mt-2 text-4xl font-black text-white">
                  {profile.currentWeight
                    ? `${getNumberFromProfileValue(profile.currentWeight, 0)} ${weightUnit}`
                    : "Add weight"}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-400">
                  Goal: {profile.goalWeight || "not set"} · Trend:{" "}
                  {profile.bodyStatus.weightTrend}
                </p>
              </div>
              <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
                <MetricControl
                  compact
                  color="cyan"
                  defaultValue={weightUnit === "kg" ? 82 : 180}
                  helper="Current body weight for nutrition and plan context."
                  helperMode="tooltip"
                  label="Current Weight"
                  max={weightUnit === "kg" ? 220 : 480}
                  min={weightUnit === "kg" ? 35 : 80}
                  onChange={(value) => setProfileField("currentWeight", value)}
                  showManualInput={false}
                  showRangeMarkers
                  showSteppers={false}
                  step={weightUnit === "kg" ? 0.5 : 1}
                  unit={weightUnit}
                  value={profile.currentWeight}
                />
                <MetricControl
                  compact
                  color="orange"
                  defaultValue={weightUnit === "kg" ? 79 : 175}
                  helper="Goal weight keeps body-direction recommendations grounded."
                  helperMode="tooltip"
                  label="Goal Weight"
                  max={weightUnit === "kg" ? 220 : 480}
                  min={weightUnit === "kg" ? 35 : 80}
                  onChange={(value) => setProfileField("goalWeight", value)}
                  showManualInput={false}
                  showRangeMarkers
                  showSteppers={false}
                  step={weightUnit === "kg" ? 0.5 : 1}
                  unit={weightUnit}
                  value={profile.goalWeight}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <MetricControl
                compact
                color="orange"
                defaultValue={18.5}
                helper="Body-composition context."
                helperMode="tooltip"
                label="Body Fat %"
                max={50}
                min={5}
                onChange={(value) => setProfileField("bodyFat", value)}
                showManualInput={false}
                showRangeMarkers
                showSteppers={false}
                step={0.5}
                unit="%"
                value={profile.bodyFat}
              />
              <MetricControl
                compact
                color="cyan"
                defaultValue={34}
                helper="Waist tracks direction over time."
                helperMode="tooltip"
                label="Waist"
                max={70}
                min={20}
                onChange={(value) => setProfileField("waist", value)}
                showManualInput={false}
                showRangeMarkers
                showSteppers={false}
                step={0.25}
                unit="in"
                value={profile.waist}
              />
            </div>

            <div className="mt-4 grid items-stretch gap-4 md:grid-cols-3">
              <StatusSelector
                helper="Shows whether body weight is stable, trending down, trending up, or unknown."
                helperMode="tooltip"
                label="Weight Trend"
                onChange={(value) => updateBodyStatus("weightTrend", value)}
                options={weightTrendOptions}
                value={profile.bodyStatus.weightTrend}
              />
              <MetricControl
                compact
                color="emerald"
                defaultValue={8000}
                helper="Daily movement target."
                helperMode="tooltip"
                label="Steps Goal"
                max={25000}
                min={1000}
                onChange={(value) => setProfileField("stepsGoal", value)}
                showManualInput={false}
                showRangeMarkers
                showSteppers={false}
                step={500}
                unit="steps"
                value={profile.stepsGoal}
              />
              <MetricControl
                compact
                color="cyan"
                defaultValue={waterDefault}
                helper="Hydration target for recovery."
                helperMode="tooltip"
                label="Water Goal"
                max={waterUnit === "L" ? 6 : 180}
                min={waterUnit === "L" ? 0.5 : 20}
                onChange={(value) => setProfileField("waterGoal", value)}
                showManualInput={false}
                showRangeMarkers
                showSteppers={false}
                step={waterUnit === "L" ? 0.25 : 4}
                unit={waterUnit}
                value={profile.waterGoal}
              />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <InfoSelectField
                helper="Occupation helps estimate daily fatigue, time constraints, and movement exposure."
                label="Occupation"
                onChange={(value) => setProfileField("occupation", value)}
                options={occupationOptions}
                value={profile.occupation}
              />
              <StatusSelector
                helper="Sedentary level helps balance mobility, cardio, and recovery recommendations."
                helperMode="tooltip"
                label="Sedentary Level"
                onChange={(value) => setProfileField("sedentaryLevel", value)}
                options={sedentaryLevelOptions}
                value={profile.sedentaryLevel}
              />
              <MetricControl
                compact
                color="orange"
                defaultValue={40}
                helper="Work hours help estimate time pressure and non-training fatigue."
                helperMode="tooltip"
                label="Hours Worked / Week"
                max={80}
                min={0}
                onChange={(value) => setProfileField("hoursWorkedPerWeek", value)}
                showManualInput={false}
                showRangeMarkers
                step={1}
                unit="hrs"
                value={profile.hoursWorkedPerWeek}
              />
            </div>

            <div className="mt-4 rounded-[24px] border border-white/10 bg-slate-950/42 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">
                    Optional Contact Info
                  </p>
                  <InfoBubble label="Optional Contact Info">
                    Optional details for future coaching context and emergency contact workflows.
                  </InfoBubble>
                </div>
                <span className="rounded-full border border-cyan-200/18 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
                  Optional
                </span>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <InfoField
                  helper="City is optional and can help future weather, travel, and schedule-aware suggestions."
                  label="City"
                  onChange={(value) => setProfileField("city", value)}
                  placeholder="Seattle"
                  value={profile.city}
                />
                <Field
                  label="Phone"
                  onChange={(value) => setProfileField("phone", value)}
                  placeholder="Optional"
                  type="tel"
                  value={profile.phone}
                />
                <Field
                  label="Emergency Contact"
                  onChange={(value) => setProfileField("emergencyContactName", value)}
                  placeholder="Optional name"
                  value={profile.emergencyContactName}
                />
                <Field
                  label="Emergency Phone"
                  onChange={(value) => setProfileField("emergencyContactPhone", value)}
                  placeholder="Optional phone"
                  type="tel"
                  value={profile.emergencyContactPhone}
                />
              </div>
            </div>

            <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-xs font-semibold leading-5 text-slate-400">
              {goalDelta === null
                ? "Add current and goal weight to unlock body-weight direction."
                : goalDelta > 0
                  ? `Target change: lose ${Math.abs(goalDelta)} lb. Keep lifting volume recoverable.`
                  : goalDelta < 0
                    ? `Target change: gain ${Math.abs(goalDelta)} lb. Support training with fuel and sleep.`
                    : "Target change: maintain body weight while tracking performance markers."}
            </p>
          </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[0.7fr_1fr_0.9fr]">
          <StatusSelector
            label="Mobility Status"
            onChange={(value) => updateBodyStatus("mobilityStatus", value)}
            options={mobilityStatusOptions}
            value={profile.bodyStatus.mobilityStatus}
          />
          <TextAreaField
            label="Mobility Notes"
            onChange={(value) => updateBodyStatus("mobilityNotes", value)}
            placeholder="Restricted areas, improving ranges, warm-up needs..."
            rows={4}
            value={profile.bodyStatus.mobilityNotes}
          />
          <div className="rounded-[24px] border border-orange-200/16 bg-orange-300/8 p-4">
            <div className="flex flex-wrap items-center gap-2">
              {(["Bulk", "Cut", "Maintain", "General Health"] as BodyGoalMode[]).map(
                (mode) => (
                  <Chip
                    key={mode}
                    active={profile.bodyGoalMode === mode}
                    onClick={() => setProfileField("bodyGoalMode", mode)}
                  >
                    {mode}
                  </Chip>
                ),
              )}
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
              Current mode: {profile.bodyGoalMode}. This keeps body-composition
              targets aligned with plan recommendations.
            </p>
          </div>
        </div>
      </CollapsibleProfilePanel>
    );
  };

  const renderReadinessSection = () => {
    const readinessScore = getEstimatedReadinessScore(profile);
    const readinessLabel = getReadinessLabel(readinessScore);

    return (
      <Panel
        eyebrow="Readiness"
        title="Readiness"
        subtitle="Daily and weekly wellness signals that help the app estimate training readiness."
      >
        <div className="grid gap-6">
          <div className="rounded-[28px] border border-orange-200/20 bg-[radial-gradient(circle_at_50%_0%,rgba(251,146,60,0.2),transparent_42%),rgba(15,23,42,0.7)] p-5 shadow-[0_0_44px_rgba(251,146,60,0.1)] md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-100/80">
                  Readiness
                </p>
                <p className="mt-2 text-5xl font-black text-white">
                  {readinessScore}
                </p>
                <p className="mt-2 text-sm font-black uppercase tracking-[0.14em] text-orange-100">
                  {readinessLabel}
                </p>
              </div>
              <div className="relative grid h-28 w-28 place-items-center rounded-full border border-orange-100/20 bg-orange-300/10">
                <span
                  className="absolute inset-2 rounded-full border-[8px] border-cyan-300/25 border-r-orange-300 border-t-orange-200"
                  style={{ opacity: Math.max(0.35, readinessScore / 100) }}
                />
                <span className="text-xs font-black uppercase tracking-[0.12em] text-orange-50">
                  Signal
                </span>
              </div>
            </div>
            <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-xs font-semibold leading-5 text-slate-300">
              Estimated only. Sleep, soreness, pain, stress, mobility, and energy
              should eventually adjust workout loading and recovery suggestions.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <MetricControl
            color="violet"
            defaultValue={7.5}
            helper="Average sleep helps set recovery expectations for the week."
            label="Average Sleep Per Night"
            max={12}
            min={3}
            onChange={updateAverageSleep}
            showManualInput={false}
            showRangeMarkers
            showSteppers={false}
            step={0.25}
            unit="hrs"
            value={
              profile.bodyStatus.averageSleepHours ||
              profile.bodyStatus.hoursSlept ||
              String(getSleepGoalHours(profile.sleepGoal))
            }
          />
          <MetricControl
            color="emerald"
            defaultValue={62}
            helper="Resting heart rate gives future recovery checks more context."
            label="Resting Heart Rate"
            max={120}
            min={35}
            onChange={(value) => setProfileField("restingHeartRate", value)}
            showManualInput={false}
            showRangeMarkers
            showSteppers={false}
            unit="bpm"
            value={profile.restingHeartRate}
          />
          <StatusSelector
            label="Sleep Quality"
            onChange={(value) => updateBodyStatus("sleepQuality", value)}
            options={sleepQualityOptions}
            value={profile.bodyStatus.sleepQuality}
          />
          <StatusSelector
            label="Stress Level"
            onChange={updateStressStatus}
            options={stressStatusOptions}
            value={profile.bodyStatus.stressStatus}
          />
          <StatusSelector
            label="Energy Level"
            onChange={updateEnergyStatus}
            options={energyStatusOptions}
            value={profile.bodyStatus.energyStatus}
          />
          <AnimatedProfileSlider
            color={
              getScaleValue(
                profile.bodyStatus.painLevel,
                profile.bodyStatus.painStatus,
              ) >= 6
                ? "rose"
                : "orange"
            }
            helper="Higher pain should bias the plan toward substitutions and recovery."
            label="Pain / Discomfort Level"
            max={10}
            min={0}
            onChange={updatePainLevel}
            value={getScaleValue(
              profile.bodyStatus.painLevel,
              profile.bodyStatus.painStatus,
            )}
          />
          <AnimatedProfileSlider
            color={
              getScaleValue(
                profile.bodyStatus.sorenessLevel,
                profile.bodyStatus.sorenessStatus,
              ) >= 6
                ? "rose"
                : "cyan"
            }
            helper="Soreness helps decide whether to train, reduce load, or switch focus."
            label="Soreness"
            max={10}
            min={0}
            onChange={updateSorenessLevel}
            value={getScaleValue(
              profile.bodyStatus.sorenessLevel,
              profile.bodyStatus.sorenessStatus,
            )}
          />
          <Field
            label="Pain Area"
            onChange={(value) => updateBodyStatus("painArea", value)}
            placeholder="Knee, shoulder, low back..."
            value={profile.bodyStatus.painArea}
          />
          <Field
            label="Pain / Discomfort Notes"
            onChange={(value) => updateBodyStatus("painNote", value)}
            placeholder="What changes it?"
            value={profile.bodyStatus.painNote}
          />
        </div>
      </Panel>
    );
  };

  const renderMeasurements = () => {
    const visibleProgressPhotos = [
      ...Object.values(sessionPhotoPreviews),
      ...profile.measurements.progressPhotos.filter(
        (photo) => !sessionPhotoPreviews[photo.slotId],
      ),
    ];
    const viewerPhoto =
      photoViewerIndex === null ? null : visibleProgressPhotos[photoViewerIndex];
    const fullBodyPhotoSlots = progressPhotoSlots.filter((slot) =>
      fullBodyPhotoSlotIds.includes(slot.id),
    );
    const findPhotoForSlot = (slotId: string) =>
      visibleProgressPhotos.find((item) => item.slotId === slotId);
    const openPhoto = (photo: ProgressPhoto | undefined) => {
      if (!photo) return;
      const viewerIndex = visibleProgressPhotos.findIndex(
        (item) => item.id === photo.id,
      );
      if (viewerIndex >= 0) setPhotoViewerIndex(viewerIndex);
    };
    const renderFullBodyPhotos = () => (
      <div className="mb-5 rounded-[28px] border border-orange-200/16 bg-[radial-gradient(circle_at_12%_0%,rgba(251,146,60,0.16),transparent_34%),rgba(15,23,42,0.58)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-100">
              Full Body Photos
            </p>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-300">
              Front, side, and back photos stay separate. Body-part photos live
              directly on their matching measurement cards.
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              TODO: Move persisted image storage to Supabase Storage when backend photo storage is ready.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                fullBodyPhotoSlots.some((slot) => findPhotoForSlot(slot.id))
                  ? openPhoto(
                      fullBodyPhotoSlots
                        .map((slot) => findPhotoForSlot(slot.id))
                        .find(Boolean),
                    )
                  : setPhotoMessage("Add a full-body photo first.")
              }
              className="rounded-2xl border border-cyan-100/25 bg-cyan-300/12 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-300/18"
            >
              View Photos
            </button>
            <button
              type="button"
              onClick={() => setPhotoMessage("Choose a full-body slot below to add a photo.")}
              className="rounded-2xl border border-orange-100/30 bg-orange-300 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-orange-200"
            >
              Add Photo
            </button>
          </div>
        </div>

        {photoMessage ? (
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-xs font-semibold leading-5 text-slate-300">
            {photoMessage}
          </p>
        ) : null}

        <div className="mt-5 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {fullBodyPhotoSlots.map((slot) => {
            const photo = findPhotoForSlot(slot.id);

            return (
              <div
                key={slot.id}
                className="group w-[220px] shrink-0 rounded-[24px] border border-white/10 bg-slate-950/50 p-3 transition hover:border-orange-200/28 hover:bg-orange-300/8"
              >
                <button
                  type="button"
                  disabled={!photo}
                  onClick={() => openPhoto(photo)}
                  className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] text-left disabled:cursor-default"
                >
                  {photo ? (
                    <img
                      alt={`${slot.label} progress`}
                      className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                      src={photo.src}
                    />
                  ) : (
                    <span className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.12),transparent_44%),rgba(15,23,42,0.72)] text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      <ImagePlusIcon className="h-5 w-5 text-orange-100/55" />
                      Add photo
                    </span>
                  )}
                  <span className="absolute left-2 top-2 rounded-full border border-white/12 bg-slate-950/78 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-white backdrop-blur">
                    {slot.shortLabel}
                  </span>
                </button>

                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">
                      {slot.label}
                    </p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                      {photo
                        ? photo.sessionOnly
                          ? "Session preview"
                          : formatSavedTime(photo.dateAdded)
                        : "No photo yet"}
                    </p>
                  </div>
                  {photo ? (
                    <button
                      type="button"
                      onClick={() => removeProgressPhoto(slot.id)}
                      className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 transition hover:border-rose-200/35 hover:bg-rose-300/10 hover:text-rose-100"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <label className="mt-3 flex min-h-[40px] cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100">
                  {photo ? "Change" : "Upload"}
                  <input
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => handleProgressPhotoUpload(slot, event)}
                    type="file"
                  />
                </label>
              </div>
            );
          })}
        </div>

        <div className="mt-5">
          <TextAreaField
            label="Photo / Progress Notes"
            onChange={(value) => updateMeasurements("progressPhotoNote", value)}
            placeholder="Photo date, angle, lighting, or coach note..."
            rows={5}
            value={profile.measurements.progressPhotoNote}
          />
        </div>
      </div>
    );
    const measurementUnitToggle = (
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 p-1">
        <span className="px-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
          Unit
        </span>
        {(["in", "cm"] as MeasurementUnit[]).map((unit) => (
          <button
            key={unit}
            type="button"
            aria-pressed={profile.measurements.unit === unit}
            onClick={() => updateMeasurements("unit", unit)}
            className={`min-h-[32px] rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] transition ${
              profile.measurements.unit === unit
                ? "bg-cyan-300 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.18)]"
                : "text-slate-400 hover:bg-cyan-300/10 hover:text-cyan-100"
            }`}
          >
            {unit}
          </button>
        ))}
      </div>
    );
    const measurementSummaryItems = [
      `Unit: ${profile.measurements.unit}`,
      `Updated: ${formatSavedTime(profile.measurements.lastUpdated)}`,
      `Waist ${profile.measurements.waist || "--"} ${profile.measurements.unit}`,
      `Chest ${profile.measurements.chest || "--"} ${profile.measurements.unit}`,
      `Hips ${profile.measurements.hips || "--"} ${profile.measurements.unit}`,
      `Arms ${
        profile.measurements.leftArm || profile.measurements.rightArm || "--"
      } ${profile.measurements.unit}`,
    ];
    const measurementSummary = (
      <div className="flex flex-wrap gap-2">
        {measurementSummaryItems.map((item) => (
          <span
            key={item}
            className="rounded-full border border-orange-200/18 bg-orange-300/10 px-3 py-1.5 text-[11px] font-black text-orange-50"
          >
            {item}
          </span>
        ))}
      </div>
    );

    return (
      <>
        <CollapsibleProfilePanel
          completion={tabCompletions.measurements}
          expanded={profileSectionOpen.measurements}
          headerAction={measurementUnitToggle}
          onToggle={() =>
            setProfileSectionOpen((current) => ({
              myBody: false,
              measurements: !current.measurements,
            }))
          }
          summary={measurementSummary}
          title="Body Measurements"
          subtitle="Track useful body measurements for body-composition context, progress trends, and future plan adjustments."
        >
          {renderFullBodyPhotos()}

          <div className="rounded-[28px] border border-white/10 bg-slate-950/42 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100">
                  Measurement Slider
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  Swipe or use arrows to browse each circumference marker.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="Scroll measurements left"
                  onClick={() => scrollMeasurements("left")}
                  className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.045] text-lg font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label="Scroll measurements right"
                  onClick={() => scrollMeasurements("right")}
                  className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.045] text-lg font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
                >
                  →
                </button>
              </div>
            </div>

            <div
              ref={measurementSliderRef}
              onScroll={updateActiveMeasurementFromScroll}
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {measurementDefinitions.map((definition, index) => {
                const isPercent = definition.key === "bodyFat";
                const isHeartRate = definition.key === "restingHeartRate";
                const unit = isPercent
                  ? "%"
                  : isHeartRate
                    ? "bpm"
                    : profile.measurements.unit;
                const unitMultiplier =
                  profile.measurements.unit === "cm" && !isPercent && !isHeartRate
                    ? 2.54
                    : 1;
                const min = Math.round(definition.min * unitMultiplier * 10) / 10;
                const max = Math.round(definition.max * unitMultiplier * 10) / 10;
                const defaultValue = Math.round(((min + max) / 2) * 10) / 10;
                const sliderStep =
                  isPercent || isHeartRate
                    ? definition.step || 1
                    : profile.measurements.unit === "cm"
                      ? 0.64
                      : 0.25;
                const isActive = activeMeasurementIndex === index;
                const photoSlotId = measurementPhotoSlotByKey[definition.key];
                const photoSlot = photoSlotId
                  ? progressPhotoSlots.find((slot) => slot.id === photoSlotId)
                  : undefined;
                const photo = photoSlot ? findPhotoForSlot(photoSlot.id) : undefined;

                return (
                  <div
                    key={definition.key}
                    ref={(node) => {
                      measurementCardRefs.current[index] = node;
                    }}
                    onClick={() => setActiveMeasurementIndex(index)}
                    onFocus={() => setActiveMeasurementIndex(index)}
                    className={`w-[280px] shrink-0 snap-center rounded-[28px] transition duration-200 sm:w-[320px] ${
                      isActive
                        ? "scale-[1.01] shadow-[0_0_34px_rgba(34,211,238,0.16)]"
                        : "opacity-80 hover:opacity-100"
                      }`}
                  >
                    {photoSlot ? (
                      <div className="mb-3 rounded-[24px] border border-white/10 bg-slate-950/52 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                        <button
                          type="button"
                          disabled={!photo}
                          onClick={() => openPhoto(photo)}
                          className="group/photo relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] text-left disabled:cursor-default"
                        >
                          {photo ? (
                            <img
                              alt={`${photoSlot.label} progress`}
                              className="h-full w-full object-cover transition duration-300 group-hover/photo:scale-[1.03]"
                              src={photo.src}
                            />
                          ) : (
                            <span className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.14),transparent_44%),rgba(15,23,42,0.76)] text-center text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                              <ImagePlusIcon className="h-5 w-5 text-cyan-100/55" />
                              Add photo
                            </span>
                          )}
                          <span className="absolute left-2 top-2 rounded-full border border-white/12 bg-slate-950/78 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-white backdrop-blur">
                            {photoSlot.shortLabel}
                          </span>
                        </button>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                            {photo
                              ? photo.sessionOnly
                                ? "Session preview"
                                : formatSavedTime(photo.dateAdded)
                              : "No photo yet"}
                          </p>
                          {photo ? (
                            <button
                              type="button"
                              onClick={() => removeProgressPhoto(photoSlot.id)}
                              className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 transition hover:border-rose-200/35 hover:bg-rose-300/10 hover:text-rose-100"
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>

                        <label className="mt-2 flex min-h-[38px] cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100">
                          {photo ? "Change Photo" : "Upload Photo"}
                          <input
                            accept="image/*"
                            className="sr-only"
                            onChange={(event) =>
                              handleProgressPhotoUpload(photoSlot, event)
                            }
                            type="file"
                          />
                        </label>
                      </div>
                    ) : null}

                    <MetricControl
                      compact
                      color={isPercent ? "orange" : isHeartRate ? "emerald" : "cyan"}
                      defaultValue={defaultValue}
                      helper="Trend placeholder: future check-ins can compare this against previous entries."
                      helperMode="tooltip"
                      label={definition.label}
                      max={max}
                      min={min}
                      onChange={(value) => updateMeasurementValue(definition.key, value)}
                      showManualInput={false}
                      showRangeMarkers
                      showSteppers
                      step={sliderStep}
                      tooltipVariant="fixed"
                      unit={unit}
                      value={profile.measurements[definition.key]}
                    />
                  </div>
                );
              })}

              <div
                ref={(node) => {
                  measurementCardRefs.current[measurementDefinitions.length] = node;
                }}
                onClick={() => setActiveMeasurementIndex(measurementDefinitions.length)}
                onFocus={() => setActiveMeasurementIndex(measurementDefinitions.length)}
                className={`w-[320px] shrink-0 snap-center rounded-[28px] transition duration-200 sm:w-[430px] lg:w-[520px] ${
                  activeMeasurementIndex === measurementDefinitions.length
                    ? "scale-[1.01] shadow-[0_0_34px_rgba(34,211,238,0.16)]"
                    : "opacity-80 hover:opacity-100"
                }`}
              >
                <div className="min-h-full rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100">
                        Custom Measurements
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {profile.measurements.custom.length
                          ? `${profile.measurements.custom.length} saved`
                          : "Optional markers for coach-specific tracking"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomMeasurementsOpen((current) => !current)}
                      className="rounded-2xl border border-cyan-100/25 bg-cyan-300/12 px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-300/18"
                    >
                      {customMeasurementsOpen ? "Hide" : "+ Add Custom"}
                    </button>
                  </div>

                  {!customMeasurementsOpen && profile.measurements.custom.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {profile.measurements.custom.slice(0, 4).map((item) => (
                        <span
                          key={item.id}
                          className="rounded-full border border-white/10 bg-slate-950/56 px-3 py-1.5 text-xs font-bold text-slate-300"
                        >
                          {item.label}: {item.value || "--"} {profile.measurements.unit}
                        </span>
                      ))}
                      {profile.measurements.custom.length > 4 ? (
                        <span className="rounded-full border border-white/10 bg-slate-950/56 px-3 py-1.5 text-xs font-bold text-slate-500">
                          +{profile.measurements.custom.length - 4} more
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {!customMeasurementsOpen && !profile.measurements.custom.length ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-white/12 bg-slate-950/42 p-4 text-xs font-semibold leading-5 text-slate-500">
                      Add coach-specific markers after the standard circumference
                      measurements.
                    </div>
                  ) : null}

                  {customMeasurementsOpen ? (
                    <div className="mt-4 space-y-3">
                      <div className="grid gap-3 md:grid-cols-[1fr_130px_70px_auto]">
                        <Field
                          label="Name"
                          onChange={setCustomMeasurementLabel}
                          placeholder="Left bicep flexed"
                          value={customMeasurementLabel}
                        />
                        <Field
                          label="Value"
                          onChange={setCustomMeasurementValue}
                          placeholder={profile.measurements.unit}
                          value={customMeasurementValue}
                        />
                        <div className="rounded-2xl border border-white/10 bg-slate-950/56 px-3 py-3 text-center text-xs font-black uppercase tracking-[0.1em] text-slate-400">
                          <span className="block text-[10px] text-slate-500">Unit</span>
                          {profile.measurements.unit}
                        </div>
                        <button
                          type="button"
                          onClick={addCustomMeasurement}
                          className="self-end rounded-2xl border border-cyan-100/30 bg-cyan-300 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-cyan-200"
                        >
                          Add
                        </button>
                      </div>

                      {profile.measurements.custom.length ? (
                        <div className="grid gap-2">
                          {profile.measurements.custom.map((item) => (
                            <div
                              key={item.id}
                              className="grid gap-2 rounded-2xl border border-white/10 bg-slate-950/48 p-3 md:grid-cols-[1fr_120px_70px_auto]"
                            >
                              <Field
                                label="Name"
                                onChange={(value) =>
                                  updateCustomMeasurement(item.id, "label", value)
                                }
                                value={item.label}
                              />
                              <Field
                                label="Value"
                                onChange={(value) =>
                                  updateCustomMeasurement(item.id, "value", value)
                                }
                                value={item.value}
                              />
                              <div className="self-end rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-3 text-center text-xs font-black uppercase tracking-[0.1em] text-slate-400">
                                {profile.measurements.unit}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setProfile((current) => ({
                                    ...current,
                                    measurements: {
                                      ...current.measurements,
                                      custom: current.measurements.custom.filter(
                                        (custom) => custom.id !== item.id,
                                      ),
                                      lastUpdated: new Date().toISOString(),
                                    },
                                  }))
                                }
                                className="self-end rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-xs font-black uppercase tracking-[0.1em] text-slate-300 transition hover:border-rose-200/35 hover:bg-rose-300/10 hover:text-rose-100"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

        </CollapsibleProfilePanel>

        {viewerPhoto ? (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/82 p-4 backdrop-blur-xl">
            <button
              type="button"
              aria-label="Close progress photo viewer"
              className="absolute inset-0 cursor-default"
              onClick={() => setPhotoViewerIndex(null)}
            />
            <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-[32px] border border-white/12 bg-slate-950/95 shadow-[0_34px_120px_rgba(0,0,0,0.72)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
                    {viewerPhoto.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-400">
                    {viewerPhoto.sessionOnly
                      ? "Preview only this session"
                      : formatSavedTime(viewerPhoto.dateAdded)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPhotoViewerIndex(null)}
                  className="rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-200 transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>
              <div className="relative bg-black/40 p-3">
                <img
                  alt={`${viewerPhoto.label} progress large view`}
                  className="max-h-[70vh] w-full rounded-[24px] object-contain"
                  src={viewerPhoto.src}
                />
                {visibleProgressPhotos.length > 1 ? (
                  <>
                    <button
                      type="button"
                      aria-label="Previous progress photo"
                      onClick={() =>
                        setPhotoViewerIndex((current) =>
                          current === null
                            ? 0
                            : (current - 1 + visibleProgressPhotos.length) %
                              visibleProgressPhotos.length,
                        )
                      }
                      className="absolute left-5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-2xl border border-white/15 bg-slate-950/78 text-xl font-black text-white shadow-[0_0_24px_rgba(0,0,0,0.35)] backdrop-blur transition hover:bg-cyan-300/18"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      aria-label="Next progress photo"
                      onClick={() =>
                        setPhotoViewerIndex((current) =>
                          current === null
                            ? 0
                            : (current + 1) % visibleProgressPhotos.length,
                        )
                      }
                      className="absolute right-5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-2xl border border-white/15 bg-slate-950/78 text-xl font-black text-white shadow-[0_0_24px_rgba(0,0,0,0.35)] backdrop-blur transition hover:bg-cyan-300/18"
                    >
                      →
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  };

  const renderPlanInputs = () => (
    <Panel
      eyebrow="Plan Builder Inputs"
      title="Tell the app what kind of plan to build"
      subtitle="These inputs should become defaults for Builder and Plan pages."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricControl
          color="cyan"
          defaultValue={4}
          helper="Weekly frequency used by Builder, Plan, and Calendar defaults."
          label="Training Days / Week"
          max={7}
          min={1}
          onChange={(value) => setProfileField("sessionsPerWeek", value)}
          unit="days"
          value={profile.sessionsPerWeek}
        />
        <MetricControl
          color="orange"
          defaultValue={45}
          helper="Session length shapes exercise count, warmups, and accessory volume."
          label="Session Length"
          max={120}
          min={15}
          onChange={(value) => setProfileField("sessionLength", `${value} minutes`)}
          step={5}
          unit="min"
          value={profile.sessionLength}
        />
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
            <MuscleHeatMap bodyModel={profile.gender} />
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

  const renderSpecialCircumstances = () => (
    <Panel
      eyebrow="Special Circumstances"
      headerAction={
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Scroll special circumstances left"
            disabled={!specialCircumstanceScrollState.canScrollLeft}
            onClick={() => scrollSpecialCircumstances("left")}
            className={`grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.045] text-base font-black text-slate-300 transition hover:border-orange-200/35 hover:bg-orange-300/10 hover:text-orange-100 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-white/10 disabled:hover:bg-white/[0.045] disabled:hover:text-slate-300 ${
              specialCircumstanceScrollState.canScrollLeft
                ? "shadow-[0_0_18px_rgba(251,146,60,0.08)]"
                : ""
            }`}
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Scroll special circumstances right"
            disabled={!specialCircumstanceScrollState.canScrollRight}
            onClick={() => scrollSpecialCircumstances("right")}
            className={`grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.045] text-base font-black text-slate-300 transition hover:border-orange-200/35 hover:bg-orange-300/10 hover:text-orange-100 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-white/10 disabled:hover:bg-white/[0.045] disabled:hover:text-slate-300 ${
              specialCircumstanceScrollState.canScrollRight
                ? "shadow-[0_0_18px_rgba(251,146,60,0.08)]"
                : ""
            }`}
          >
            →
          </button>
        </div>
      }
      title="Special Circumstances"
      subtitle="This helps personalize training recommendations. It is not medical diagnosis or treatment."
    >
      {/* TODO: Let these flags modify future recommendation rules: pregnancy-aware plans, injury substitutions, soreness/recovery bias, sleep/stress readiness, and travel equipment defaults. */}
      <div className="max-w-full overflow-hidden rounded-[30px] pb-1">
        <div
          ref={specialCircumstancesSliderRef}
          onScroll={updateActiveSpecialCircumstanceFromScroll}
          className="flex max-w-full snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth px-1 pb-5 pt-1 [scrollbar-color:rgba(251,146,60,0.58)_rgba(15,23,42,0.78)] [scrollbar-width:thin] [touch-action:pan-x] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-orange-300/55 [&::-webkit-scrollbar-thumb]:shadow-[0_0_14px_rgba(251,146,60,0.35)] [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/70"
        >
        {specialCircumstanceOptions.map((circumstance, index) => {
          const selectedItem = profile.specialCircumstances.find(
            (item) => item.id === circumstance.id,
          );
          const selected = Boolean(selectedItem);
          const centered = activeSpecialCircumstanceIndex === index;

          return (
            <button
              key={circumstance.id}
              ref={(node) => {
                specialCircumstanceCardRefs.current[index] = node;
              }}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setActiveSpecialCircumstanceIndex(index);
                toggleSpecialCircumstance(circumstance);
              }}
              className={`group relative flex min-h-[220px] w-[min(72vw,280px)] max-w-[calc(100vw-3rem)] flex-none snap-center flex-col overflow-hidden rounded-[28px] border p-4 text-left transition duration-200 hover:-translate-y-1 sm:w-[300px] ${
                selected
                  ? "border-orange-200/45 bg-orange-300/12 text-white shadow-[0_0_34px_rgba(251,146,60,0.18)]"
                  : centered
                    ? "border-cyan-200/26 bg-cyan-300/8 text-slate-100 shadow-[0_0_26px_rgba(34,211,238,0.1)]"
                  : "border-white/10 bg-slate-950/48 text-slate-300 hover:border-orange-200/25 hover:bg-orange-300/8 hover:shadow-[0_0_26px_rgba(251,146,60,0.08)]"
              }`}
            >
              <span
                className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${circumstance.visual} opacity-90 transition group-hover:opacity-100`}
              />
              <span className="absolute -right-8 -top-8 h-28 w-28 rounded-full border border-white/10 bg-white/[0.035]" />
              <div className="relative flex items-start justify-between gap-3">
                <span
                  className={`grid h-14 w-14 place-items-center rounded-[22px] border text-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition group-hover:scale-105 ${
                    selected
                      ? "border-orange-100/40 bg-orange-300/18 shadow-[0_0_24px_rgba(251,146,60,0.18)]"
                      : "border-white/10 bg-slate-950/54"
                  }`}
                  aria-hidden="true"
                >
                  {circumstance.icon}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] ${
                    selected
                      ? "border-orange-100/40 bg-orange-300 text-slate-950"
                      : "border border-white/10 bg-white/[0.045] text-slate-500"
                  }`}
                >
                  {selected ? "✓ Active" : "Add"}
                </span>
              </div>
              <p className="relative mt-4 text-base font-black leading-tight text-white">
                {circumstance.label}
              </p>
              <p className="relative mt-2 text-xs font-semibold leading-5 text-slate-400">
                {circumstance.helper}
              </p>
              <div
                className={`relative mt-auto rounded-2xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition ${
                  selected
                    ? "border-orange-100/30 bg-orange-300/12 text-orange-100"
                    : "border-white/10 bg-white/[0.035] text-slate-500 group-hover:text-orange-100"
                }`}
              >
                {selectedItem
                  ? `${selectedItem.status} • details below`
                  : "tap to add context"}
              </div>
            </button>
          );
        })}
        </div>
      </div>

      <div className="mt-4 max-w-full overflow-hidden">
        {profile.specialCircumstances.length ? (
          <div className="flex max-w-full gap-3 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/50">
          {profile.specialCircumstances.map((circumstance) => (
            <div
              key={circumstance.id}
              className="w-[min(88vw,520px)] max-w-[calc(100vw-3rem)] flex-none rounded-[26px] border border-white/10 bg-white/[0.045] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-white">
                    {circumstance.label}
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    Selected context for future coaching modifications.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setProfile((current) => ({
                      ...current,
                      specialCircumstances: current.specialCircumstances.filter(
                        (item) => item.id !== circumstance.id,
                      ),
                    }))
                  }
                  className="rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-slate-300 transition hover:border-rose-200/35 hover:bg-rose-300/10 hover:text-rose-100"
                >
                  Remove
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <SelectField
                  label="Status"
                  onChange={(value) =>
                    updateSpecialCircumstance(
                      circumstance.id,
                      "status",
                      value as SpecialCircumstanceStatus,
                    )
                  }
                  options={["active", "improving", "resolved", "monitoring"]}
                  value={circumstance.status}
                />
                <Field
                  label="Start Date"
                  onChange={(value) =>
                    updateSpecialCircumstance(circumstance.id, "startDate", value)
                  }
                  type="date"
                  value={circumstance.startDate}
                />
                <div className="md:col-span-2">
                  <TextAreaField
                    label="Notes"
                    onChange={(value) =>
                      updateSpecialCircumstance(circumstance.id, "notes", value)
                    }
                    placeholder="Context, modifications, coach guidance, or constraints..."
                    rows={3}
                    value={circumstance.notes}
                  />
                </div>
              </div>
            </div>
          ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.03] p-5 text-sm font-semibold leading-6 text-slate-400">
            No special circumstances selected. Add one when life, health, sport,
            travel, or recovery context should modify coaching recommendations.
          </div>
        )}
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
          [
            "Gender",
            normalizeBodyModel(profile.gender || profile.bodyModel) === "female"
              ? "Female"
              : "Male",
          ],
          [
            "Body Context",
            `${activeLimitations.length} limits · ${profile.specialCircumstances.length} special`,
          ],
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
      {renderGoalCompass()}
      {renderBodyMetrics()}
      {renderMeasurements()}
      {renderSpecialCircumstances()}
      {renderPlanInputs()}
      {renderNotes()}
    </div>
  );

  const renderActiveTab = () => {
    if (activeTab === "overview") return renderOverview();
    if (activeTab === "goals") return <div className="space-y-5">{renderGoalCompass()}{renderBodyMetrics()}</div>;
    if (activeTab === "body") return <div className="space-y-5">{renderBodyMetrics()}{renderRecoveryProfile()}</div>;
    if (activeTab === "readiness") return renderReadinessSection();
    if (activeTab === "measurements") return renderMeasurements();
    if (activeTab === "planDirection") return <div className="space-y-5">{renderGoalCompass()}{renderNotes()}</div>;
    if (activeTab === "training") return <div className="space-y-5">{renderPlanInputs()}{renderTrainingStyle()}{renderLifestyle()}</div>;
    if (activeTab === "recovery") return <div className="space-y-5">{renderRecoveryProfile()}{renderSpecialCircumstances()}{renderLifestyle()}</div>;
    if (activeTab === "circumstances") return renderSpecialCircumstances();
    if (activeTab === "nutrition") return renderNutrition();
    if (activeTab === "benchmarks") return renderBenchmarks();
    return <div className="space-y-5">{renderPersonalization()}{renderNotes()}</div>;
  };

  const renderMasterJourneyMap = () => {
    const journeyRows: Array<{
      accent: string;
      description: string;
      steps: Array<{
        href: string;
        label: string;
        status: string;
      }>;
      title: string;
    }> = [
      {
        accent: "from-cyan-300 to-blue-400",
        description: "Build sessions from profile, goals, libraries, and plans.",
        title: "Training Journey",
        steps: [
          // TODO: Replace with /dashboard/sessions/journey if that route is added.
          { href: ROUTES.dashboard.sessions, label: "Session Setup", status: "Start" },
          { href: ROUTES.dashboard.exerciseLibrary, label: "Exercise Library", status: "Tools" },
          { href: ROUTES.workoutBuilder.home, label: "Builder", status: "Create" },
          { href: ROUTES.dashboard.plan, label: "Plan", status: "Organize" },
          { href: ROUTES.dashboard.stats, label: "Progress", status: "Reflect" },
        ],
      },
      {
        accent: "from-emerald-300 to-teal-400",
        description: "Turn fuel decisions into meals, menus, and weekly nutrition plans.",
        title: "Fuel Journey",
        steps: [
          { href: ROUTES.nutritionPortal.home, label: "Fuel Dashboard", status: "Today" },
          { href: ROUTES.nutritionPortal.grocery, label: "Shopping", status: "Stock" },
          { href: ROUTES.nutritionPortal.library, label: "Kitchen", status: "Library" },
          { href: ROUTES.nutritionPortal.meals, label: "Menu", status: "Meals" },
          { href: "/nutrition/meal-plan", label: "Meal Plan", status: "Week" },
        ],
      },
      {
        accent: "from-orange-300 to-amber-300",
        description: "Develop conditioning, athletic metrics, and performance trends.",
        title: "Performance Pathway",
        steps: [
          // TODO: Split these into performance subroutes when /performance/journey exists.
          { href: "/performance", label: "Baseline", status: "Check" },
          { href: "/performance", label: "Cardio", status: "Engine" },
          { href: "/performance", label: "Conditioning", status: "Capacity" },
          { href: "/performance", label: "Athletic Metrics", status: "Measure" },
          { href: ROUTES.dashboard.stats, label: "Progress", status: "Track" },
        ],
      },
      {
        accent: "from-violet-300 to-cyan-300",
        description: "Connect readiness, mobility, pain/soreness, and recovery planning.",
        title: "Recovery Roadmap",
        steps: [
          { href: ROUTES.dashboard.profile, label: "Readiness", status: "Profile" },
          { href: ROUTES.dashboard.mobilityLibrary, label: "Mobility", status: "Move" },
          { href: ROUTES.dashboard.painTracking, label: "Pain/Soreness", status: "Log" },
          { href: ROUTES.dashboard.profile, label: "Sleep/Stress", status: "Signals" },
          { href: "/recovery", label: "Recovery Plan", status: "Recover" },
        ],
      },
    ];

    const foundationItems = [
      {
        href: ROUTES.dashboard.profile,
        label: "Profile",
        status: "Foundation",
      },
      {
        href: ROUTES.dashboard.goals,
        label: "Goals",
        status: "Direction",
      },
    ];

    return (
      <Panel
        eyebrow="Master Journey"
        title="Master Training Journey"
        subtitle="Profile and goals are the foundation. Training, fuel, performance, and recovery journeys build from there."
      >
        <div className="mx-auto grid max-w-2xl gap-3 sm:grid-cols-2">
          {foundationItems.map((item, index) => (
            <Link
              key={item.label}
              href={item.href}
              className="group relative rounded-[26px] border border-cyan-200/22 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.18),transparent_44%),rgba(15,23,42,0.68)] p-4 text-center shadow-[0_0_28px_rgba(34,211,238,0.08)] transition hover:-translate-y-1 hover:border-cyan-200/42 hover:bg-cyan-300/10"
            >
              {index === 0 ? (
                <span className="pointer-events-none absolute -right-5 top-1/2 hidden h-px w-10 bg-gradient-to-r from-cyan-300/60 to-orange-300/60 sm:block" />
              ) : null}
              <span className="mx-auto grid h-10 w-10 place-items-center rounded-2xl border border-cyan-100/25 bg-cyan-300/14 text-sm font-black text-cyan-100">
                {index + 1}
              </span>
              <p className="mt-3 text-lg font-black text-white">{item.label}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                {item.status}
              </p>
              <span className="mt-3 inline-flex rounded-full border border-cyan-100/25 bg-cyan-300/12 px-3 py-1 text-xs font-black text-cyan-100">
                Start here
              </span>
            </Link>
          ))}
        </div>

        <div className="my-5 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        <div className="space-y-5">
          {journeyRows.map((row) => (
            <section
              key={row.title}
              className="rounded-[28px] border border-white/10 bg-slate-950/50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            >
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-white">{row.title}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                    {row.description}
                  </p>
                </div>
                <span
                  className={`h-2 w-24 rounded-full bg-gradient-to-r ${row.accent} shadow-[0_0_18px_rgba(34,211,238,0.14)]`}
                />
              </div>

              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {row.steps.map((step, index) => (
                  <div
                    key={`${row.title}-${step.label}`}
                    className="flex shrink-0 snap-start items-center gap-3"
                  >
                    <Link
                      href={step.href}
                      className="group min-h-[128px] w-[190px] rounded-[24px] border border-white/10 bg-white/[0.045] p-4 transition hover:-translate-y-1 hover:border-cyan-200/30 hover:bg-cyan-300/10 active:scale-[0.98]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br ${row.accent} text-xs font-black text-slate-950`}
                        >
                          {index + 1}
                        </span>
                        <span className="rounded-full border border-white/10 bg-slate-950/58 px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 group-hover:text-cyan-100">
                          {step.status}
                        </span>
                      </div>
                      <p className="mt-4 text-sm font-black leading-tight text-white">
                        {step.label}
                      </p>
                      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                        Open
                      </p>
                    </Link>
                    {index < row.steps.length - 1 ? (
                      <span className="h-px w-10 shrink-0 bg-gradient-to-r from-white/18 to-cyan-300/30" />
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Panel>
    );
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_82%_10%,rgba(251,146,60,0.14),transparent_28%),linear-gradient(180deg,#020617_0%,#07111f_52%,#020617_100%)] pb-28 text-white">
      <section className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-6 sm:px-6 lg:px-8">
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

        <nav className="rounded-[28px] border border-white/10 bg-slate-950/52 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Scroll profile sections left"
              onClick={() => scrollTabs("left")}
              className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.045] text-lg font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100 md:grid"
            >
              ←
            </button>
            <div
              ref={tabSliderRef}
              className="flex min-w-0 flex-1 snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
            {tabs.map((tab) => (
              (() => {
                const completion = tabCompletions[tab.id] || 0;
                const tone = getCompletionTone(completion);
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    ref={(node) => {
                      tabButtonRefs.current[tab.id] = node;
                    }}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className={`min-h-[58px] w-[210px] shrink-0 snap-center rounded-2xl border px-4 py-3 text-left text-xs font-black uppercase tracking-[0.12em] transition duration-200 hover:-translate-y-0.5 active:scale-[0.98] ${
                      isActive
                        ? `border-cyan-200/45 bg-cyan-300/16 text-cyan-50 ${tone.glow}`
                        : "border-white/10 bg-white/[0.035] text-slate-400 hover:border-cyan-200/25 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{tab.label}</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] leading-none ${tone.badge}`}
                      >
                        {completion}%
                      </span>
                    </span>
                    <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-950/70">
                      <span
                        className={`block h-full rounded-full bg-gradient-to-r ${tone.bar} transition-[width] duration-300`}
                        style={{ width: `${completion}%` }}
                      />
                    </span>
                  </button>
                );
              })()
            ))}
            </div>
            <button
              type="button"
              aria-label="Scroll profile sections right"
              onClick={() => scrollTabs("right")}
              className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.045] text-lg font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100 md:grid"
            >
              →
            </button>
          </div>
        </nav>

        {loading ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.055] p-8 text-sm font-black uppercase tracking-[0.16em] text-cyan-100">
            Loading profile command center...
          </div>
        ) : (
          renderActiveTab()
        )}

        {!loading ? renderMasterJourneyMap() : null}
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

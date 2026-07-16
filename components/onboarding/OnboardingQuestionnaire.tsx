"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  AppWindow,
  Armchair,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Ban,
  BatteryLow,
  Bed,
  Bell,
  BellOff,
  BicepsFlexed,
  Bike,
  Bone,
  Box,
  Brain,
  Building2,
  CalendarCheck,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Dumbbell,
  ExternalLink,
  HeartPulse,
  Home,
  Mail,
  MessageSquareText,
  Music,
  PersonStanding,
  Phone,
  Plane,
  RefreshCw,
  Repeat,
  RotateCcw,
  Salad,
  Scale,
  Settings2,
  ShieldCheck,
  Sparkles,
  Smartphone,
  SportShoe,
  StretchHorizontal,
  Target,
  Timer,
  Trophy,
  UserRound,
  Video,
  Volume2,
  VolumeX,
  Weight,
  Workflow,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  type CSSProperties,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AssessmentWebGlIcon, {
  type AssessmentIconGlyph,
  type AssessmentIconTone,
} from "@/components/AssessmentWebGlIcon";
import TrainingPurchaseComingSoonModal from "@/components/onboarding/TrainingPurchaseComingSoonModal";
import { MARKETING_SITE, ROUTES } from "@/lib/routes";
import { soundFx } from "@/lib/soundFx";

type LeadAssessmentAnswers = {
  cityZip: string;
  coachingStyle: string[];
  contactConsent: boolean;
  contactPreference: string;
  email: string;
  equipment: string[];
  experience: string;
  firstName: string;
  introSessionInterest: boolean;
  limitation: string[];
  mainGoal: string;
  movementConfidence: string[];
  phone: string;
  recoveryBaseline: string[];
  sessionLength: string;
  trainingAvailability: string;
  trainingEnvironment: string;
  trainingStyle: string;
};

type MultiSelectAnswerKey =
  | "coachingStyle"
  | "equipment"
  | "limitation"
  | "movementConfidence"
  | "recoveryBaseline";

type StoredLeadAssessmentAnswers = Partial<
  Omit<LeadAssessmentAnswers, MultiSelectAnswerKey>
> & {
  coachingStyle?: unknown;
  equipment?: unknown;
  limitation?: unknown;
  movementConfidence?: unknown;
  recoveryBaseline?: unknown;
};

type Question = {
  helper: string;
  icon: AssessmentIconGlyph;
  key: keyof LeadAssessmentAnswers;
  options: string[];
  title: string;
  tone: AssessmentIconTone;
};

type SetupItem = {
  Icon: LucideIcon;
  label: string;
  value: string;
};

type ResultProfile = {
  body: string;
  exerciseFocus: string;
  icon: AssessmentIconGlyph;
  service: string;
  servicePills: string[];
  setupItems: SetupItem[];
  setupNote: string;
  title: string;
  tone: AssessmentIconTone;
};

type OptionVisual = {
  accent: string;
  Icon: LucideIcon;
  photo?: string;
  photoPosition?: string;
};

type SelectionMotion = {
  option: string;
  phase: "flicker" | "fade" | "multi-check";
  step: number;
};

const STORAGE_KEY = "soundFitnessPreSignInStartingPlan";
const OPTION_SELECTION_FLICKER_MS = 900;
const OPTION_SELECTION_FADE_MS = 260;
const OPTION_MULTI_SELECTION_MS = 620;
const NEXT_LAUNCH_MS = 360;
const RESET_TRANSITION_MS = 340;

const defaultAnswers: LeadAssessmentAnswers = {
  cityZip: "",
  coachingStyle: [],
  contactConsent: false,
  contactPreference: "",
  email: "",
  equipment: [],
  experience: "",
  firstName: "",
  introSessionInterest: false,
  limitation: [],
  mainGoal: "",
  movementConfidence: [],
  phone: "",
  recoveryBaseline: [],
  sessionLength: "",
  trainingAvailability: "",
  trainingEnvironment: "",
  trainingStyle: "",
};

const questions: Question[] = [
  {
    key: "mainGoal",
    title: "What should your plan help you improve first?",
    helper: "Choose the win that would make the next month feel different.",
    icon: "target",
    tone: "sky",
    options: [
      "Build strength",
      "Improve mobility",
      "Lose weight",
      "Reduce pain/stiffness",
      "Improve sports performance",
      "Stay consistent",
    ],
  },
  {
    key: "trainingStyle",
    title: "What would help you stay on track first?",
    helper:
      "Choose the kind of support that would make training feel easier to repeat.",
    icon: "clipboard",
    tone: "emerald",
    options: [
      "Workout plan",
      "Mobility routines",
      "Nutrition habits",
      "Accountability",
      "Recovery support",
      "All-in-one plan",
    ],
  },
  {
    key: "trainingEnvironment",
    title: "Where will you train most often?",
    helper:
      "Your space changes which exercises, substitutions, and setup choices make sense.",
    icon: "home",
    tone: "sky",
    options: [
      "Open floor at home",
      "Small room/apartment",
      "Garage/home gym",
      "Commercial gym",
      "Outdoors/travel",
      "Mix changes weekly",
    ],
  },
  {
    key: "equipment",
    title: "What equipment can you use most weeks?",
    helper: "This keeps your plan realistic for home, gym, or travel days.",
    icon: "dumbbell",
    tone: "amber",
    options: [
      "Bodyweight only",
      "Dumbbells",
      "Bands",
      "Bench or box",
      "Cardio machine",
      "Full gym access",
    ],
  },
  {
    key: "experience",
    title: "How familiar are you with working out?",
    helper: "Your plan can start simple or move faster if you already train.",
    icon: "person",
    tone: "sky",
    options: [
      "Brand new",
      "Returning",
      "Some experience",
      "Advanced",
      "Coming back from injury",
    ],
  },
  {
    key: "movementConfidence",
    title: "Which training options are you comfortable with?",
    helper:
      "Select every exercise style or equipment setup you would feel okay using.",
    icon: "shield",
    tone: "emerald",
    options: [
      "Bodyweight exercises",
      "Dumbbells",
      "Resistance bands",
      "Kettlebells",
      "Barbells",
      "Machines/cables",
      "Cardio machines",
      "Mobility/stretching",
      "Low-impact modifications",
    ],
  },
  {
    key: "trainingAvailability",
    title: "How many days can you train most weeks?",
    helper: "Pick the rhythm you can repeat without the plan feeling annoying.",
    icon: "calendar",
    tone: "emerald",
    options: [
      "2 days/week",
      "3 days/week",
      "4 days/week",
      "5+ days/week",
      "Flexible week to week",
    ],
  },
  {
    key: "sessionLength",
    title: "How long can most sessions be?",
    helper:
      "Your plan can include a normal session and a backup version for messy days.",
    icon: "calendar",
    tone: "amber",
    options: [
      "10-15 minutes",
      "20-30 minutes",
      "30-45 minutes",
      "45-60 minutes",
      "Tiny backup sessions",
    ],
  },
  {
    key: "limitation",
    title: "What should your plan avoid or protect?",
    helper: "This steers exercise selection, intensity, and warm-up choices.",
    icon: "heart",
    tone: "rose",
    options: [
      "Pain or stiffness",
      "Knees or hips",
      "Back or neck",
      "Shoulders or wrists",
      "Low impact only",
      "No major limits",
    ],
  },
  {
    key: "recoveryBaseline",
    title: "How is recovery most weeks?",
    helper:
      "Your starting volume should respect sleep, soreness, stress, and energy.",
    icon: "heart",
    tone: "rose",
    options: [
      "Low energy",
      "Poor sleep",
      "Sore often",
      "Stress is high",
      "Pretty steady",
      "Ready to push",
    ],
  },
  {
    key: "coachingStyle",
    title: "What kind of coaching helps you follow through?",
    helper:
      "This affects reminders, dashboard nudges, and how much guidance the plan should show.",
    icon: "message",
    tone: "sky",
    options: [
      "Simple checklist",
      "Video guidance",
      "Reminders",
      "Progress tracking",
      "Coach-style notes",
      "Minimal nudges",
    ],
  },
  {
    key: "contactPreference",
    title: "Your Sound Fitness profile is ready",
    helper:
      "We built your personalized starting point based on your goals, schedule, equipment, and training preferences.",
    icon: "message",
    tone: "sky",
    options: [],
  },
];

const trustBullets = [
  { label: "Build strength", Icon: BicepsFlexed },
  { label: "Move better", Icon: StretchHorizontal },
  { label: "Boost energy", Icon: Zap },
  { label: "Stay consistent", Icon: CalendarCheck },
];

const questionProgressIcons: LucideIcon[] = [
  Target,
  ClipboardList,
  Home,
  Dumbbell,
  UserRound,
  ShieldCheck,
  CalendarCheck,
  Timer,
  HeartPulse,
  BatteryLow,
  MessageSquareText,
  Mail,
];

function buildCompletedProgressSelector(suffix = "") {
  return Array.from({ length: questions.length }, (_, index) => {
    const stepNumber = index + 1;
    return `.sound-progress-path[data-progress-step="${stepNumber}"] .sound-progress-node:nth-child(-n + ${stepNumber})${suffix}`;
  }).join(",\n");
}

const completedProgressNodeSelector = buildCompletedProgressSelector();
const completedProgressBeforeSelector =
  buildCompletedProgressSelector("::before");
const completedProgressAfterSelector =
  buildCompletedProgressSelector("::after");
const completedProgressSparkSelector = buildCompletedProgressSelector(
  " .sound-progress-spark",
);

const startingPlanSteps = [
  {
    image: "/onboarding-deep-squat-goal.png",
    imagePosition: "center 58%",
    label: "Pick your goal",
    number: "1",
  },
  {
    image: "/onboarding-home-gym-equipment.jpg",
    imagePosition: "center 54%",
    label: "Tell us your setup",
    number: "2",
  },
  {
    image: "/onboarding-workout-focus-photo.jpg",
    imagePosition: "center 43%",
    label: "See your starting focus",
    number: "3",
  },
] as const;

const defaultOptionVisual: OptionVisual = {
  accent: "34 211 238",
  Icon: Target,
};

const optionVisuals: Record<string, OptionVisual> = {
  "Build strength": {
    accent: "34 211 238",
    Icon: BicepsFlexed,
    photo: "/onboarding-workout-focus-photo.jpg",
    photoPosition: "center 42%",
  },
  "Improve mobility": {
    accent: "45 212 191",
    Icon: StretchHorizontal,
    photo: "/member-preview-happy-user.jpg",
    photoPosition: "center 44%",
  },
  "Lose weight": {
    accent: "250 204 21",
    Icon: Scale,
    photo: "/onboarding-goal-planning-photo.jpg",
    photoPosition: "center 52%",
  },
  "Reduce pain/stiffness": {
    accent: "251 113 133",
    Icon: HeartPulse,
    photo: "/member-preview-connected-support.jpg",
    photoPosition: "center 48%",
  },
  "Improve sports performance": {
    accent: "129 140 248",
    Icon: SportShoe,
    photo: "/onboarding-workout-focus-photo.jpg",
    photoPosition: "center 36%",
  },
  "Stay consistent": {
    accent: "52 211 153",
    Icon: CalendarCheck,
    photo: "/member-preview-matched-plan.jpg",
    photoPosition: "center 50%",
  },

  "Workout plan": {
    accent: "56 189 248",
    Icon: ClipboardList,
    photo: "/onboarding-goal-planning-photo.jpg",
    photoPosition: "center 48%",
  },
  "Mobility routines": {
    accent: "45 212 191",
    Icon: StretchHorizontal,
    photo: "/onboarding-deep-squat-goal.png",
    photoPosition: "center 52%",
  },
  "Nutrition habits": {
    accent: "132 204 22",
    Icon: Salad,
    photo: "/onboarding-goal-planning-photo.jpg",
    photoPosition: "center 54%",
  },
  Accountability: {
    accent: "251 191 36",
    Icon: CheckSquare,
    photo: "/member-preview-support-team.jpg",
    photoPosition: "center 44%",
  },
  "Recovery support": {
    accent: "244 114 182",
    Icon: HeartPulse,
    photo: "/member-preview-happy-user.jpg",
    photoPosition: "center 44%",
  },
  "All-in-one plan": {
    accent: "168 85 247",
    Icon: Workflow,
    photo: "/onboarding-workout-focus-photo.jpg",
    photoPosition: "center 40%",
  },

  "Open floor at home": {
    accent: "34 211 238",
    Icon: Home,
    photo: "/onboarding-location-open-floor.jpg",
    photoPosition: "center 46%",
  },
  "Small room/apartment": {
    accent: "99 102 241",
    Icon: Armchair,
    photo: "/onboarding-location-small-room.jpg",
    photoPosition: "center 50%",
  },
  "Garage/home gym": {
    accent: "251 146 60",
    Icon: Weight,
    photo: "/onboarding-location-garage-gym.jpg",
    photoPosition: "center 50%",
  },
  "Commercial gym": {
    accent: "59 130 246",
    Icon: Building2,
    photo: "/onboarding-location-commercial-gym.jpg",
    photoPosition: "center 50%",
  },
  "Outdoors/travel": {
    accent: "52 211 153",
    Icon: Plane,
    photo: "/onboarding-location-outdoors-travel.jpg",
    photoPosition: "center 45%",
  },
  "Mix changes weekly": {
    accent: "250 204 21",
    Icon: Repeat,
    photo: "/onboarding-location-mixed.jpg",
    photoPosition: "center 48%",
  },

  "Bodyweight only": {
    accent: "45 212 191",
    Icon: PersonStanding,
    photo: "/onboarding-location-open-floor.jpg",
    photoPosition: "center 48%",
  },
  Dumbbells: {
    accent: "34 211 238",
    Icon: Dumbbell,
    photo: "/onboarding-equipment-dumbbells.jpg",
    photoPosition: "44% 50%",
  },
  Bands: {
    accent: "52 211 153",
    Icon: StretchHorizontal,
    photo: "/onboarding-equipment-bands.jpg",
    photoPosition: "center 42%",
  },
  "Bench or box": {
    accent: "251 146 60",
    Icon: Box,
    photo: "/onboarding-equipment-bench.jpg",
    photoPosition: "center 52%",
  },
  "Cardio machine": {
    accent: "244 114 182",
    Icon: Bike,
    photo: "/onboarding-equipment-cardio.jpg",
    photoPosition: "center 52%",
  },
  "Full gym access": {
    accent: "129 140 248",
    Icon: Weight,
    photo: "/onboarding-location-commercial-gym.jpg",
    photoPosition: "center 50%",
  },

  "Brand new": {
    accent: "34 211 238",
    Icon: Sparkles,
    photo: "/member-preview-happy-user.jpg",
    photoPosition: "center 44%",
  },
  Returning: {
    accent: "45 212 191",
    Icon: RotateCcw,
    photo: "/member-preview-matched-plan.jpg",
    photoPosition: "center 50%",
  },
  "Some experience": {
    accent: "59 130 246",
    Icon: Activity,
    photo: "/onboarding-workout-focus-photo.jpg",
    photoPosition: "center 40%",
  },
  Advanced: {
    accent: "250 204 21",
    Icon: Trophy,
    photo: "/onboarding-workout-focus-photo.jpg",
    photoPosition: "center 36%",
  },
  "Coming back from injury": {
    accent: "251 113 133",
    Icon: ShieldCheck,
    photo: "/member-preview-connected-support.jpg",
    photoPosition: "center 48%",
  },

  "Bodyweight exercises": {
    accent: "45 212 191",
    Icon: PersonStanding,
    photo: "/onboarding-location-outdoors-travel.jpg",
    photoPosition: "center 30%",
  },
  "Resistance bands": {
    accent: "52 211 153",
    Icon: StretchHorizontal,
    photo: "/onboarding-equipment-bands.jpg",
    photoPosition: "center 42%",
  },
  Kettlebells: {
    accent: "251 146 60",
    Icon: Weight,
    photo: "/onboarding-deep-squat-goal.png",
    photoPosition: "88% 72%",
  },
  Barbells: {
    accent: "56 189 248",
    Icon: Dumbbell,
    photo: "/onboarding-location-garage-gym.jpg",
    photoPosition: "center 32%",
  },
  "Machines/cables": {
    accent: "129 140 248",
    Icon: Settings2,
    photo: "/onboarding-location-commercial-gym.jpg",
    photoPosition: "center 55%",
  },
  "Cardio machines": {
    accent: "244 114 182",
    Icon: Bike,
    photo: "/onboarding-equipment-cardio.jpg",
    photoPosition: "center 52%",
  },
  "Mobility/stretching": {
    accent: "34 211 238",
    Icon: StretchHorizontal,
    photo: "/onboarding-location-open-floor.jpg",
    photoPosition: "center 50%",
  },
  "Low-impact modifications": {
    accent: "251 146 60",
    Icon: ShieldCheck,
    photo: "/onboarding-location-mixed.jpg",
    photoPosition: "62% 58%",
  },

  "2 days/week": {
    accent: "34 211 238",
    Icon: CalendarDays,
    photo: "/member-preview-matched-plan.jpg",
    photoPosition: "center 50%",
  },
  "3 days/week": {
    accent: "45 212 191",
    Icon: CalendarCheck,
    photo: "/member-preview-matched-plan.jpg",
    photoPosition: "center 50%",
  },
  "4 days/week": {
    accent: "59 130 246",
    Icon: CalendarCheck,
    photo: "/onboarding-workout-focus-photo.jpg",
    photoPosition: "center 40%",
  },
  "5+ days/week": {
    accent: "250 204 21",
    Icon: CalendarCheck,
    photo: "/onboarding-workout-focus-photo.jpg",
    photoPosition: "center 36%",
  },
  "Flexible week to week": {
    accent: "168 85 247",
    Icon: Repeat,
    photo: "/member-preview-seattle-traffic.jpg",
    photoPosition: "center 48%",
  },

  "10-15 minutes": {
    accent: "34 211 238",
    Icon: Timer,
    photo: "/member-preview-no-commute.jpg",
    photoPosition: "center 50%",
  },
  "20-30 minutes": {
    accent: "45 212 191",
    Icon: Timer,
    photo: "/member-preview-matched-plan.jpg",
    photoPosition: "center 50%",
  },
  "30-45 minutes": {
    accent: "59 130 246",
    Icon: Timer,
    photo: "/onboarding-goal-planning-photo.jpg",
    photoPosition: "center 50%",
  },
  "45-60 minutes": {
    accent: "250 204 21",
    Icon: Timer,
    photo: "/onboarding-workout-focus-photo.jpg",
    photoPosition: "center 40%",
  },
  "Tiny backup sessions": {
    accent: "251 146 60",
    Icon: Zap,
    photo: "/member-preview-seattle-traffic.jpg",
    photoPosition: "center 48%",
  },

  "Pain or stiffness": {
    accent: "251 113 133",
    Icon: HeartPulse,
    photo: "/onboarding-limit-pain.jpg",
    photoPosition: "center 48%",
  },
  "Knees or hips": {
    accent: "251 146 60",
    Icon: Bone,
    photo: "/onboarding-limit-knees-hips.jpg",
    photoPosition: "center 48%",
  },
  "Back or neck": {
    accent: "244 114 182",
    Icon: Bone,
    photo: "/onboarding-limit-back-neck.jpg",
    photoPosition: "center 46%",
  },
  "Shoulders or wrists": {
    accent: "59 130 246",
    Icon: Activity,
    photo: "/onboarding-limit-shoulders-wrists.jpg",
    photoPosition: "center 50%",
  },
  "Low impact only": {
    accent: "45 212 191",
    Icon: ShieldCheck,
    photo: "/onboarding-limit-low-impact.jpg",
    photoPosition: "center 44%",
  },
  "No major limits": {
    accent: "52 211 153",
    Icon: BadgeCheck,
    photo: "/onboarding-workout-focus-photo.jpg",
    photoPosition: "center 40%",
  },

  "Low energy": {
    accent: "251 146 60",
    Icon: BatteryLow,
    photo: "/member-preview-no-commute.jpg",
    photoPosition: "center 50%",
  },
  "Poor sleep": {
    accent: "129 140 248",
    Icon: Bed,
    photo: "/member-preview-seattle-bg.png",
    photoPosition: "center 46%",
  },
  "Sore often": {
    accent: "251 113 133",
    Icon: HeartPulse,
    photo: "/member-preview-connected-support.jpg",
    photoPosition: "center 48%",
  },
  "Stress is high": {
    accent: "244 114 182",
    Icon: Brain,
    photo: "/member-preview-seattle-traffic.jpg",
    photoPosition: "center 48%",
  },
  "Pretty steady": {
    accent: "52 211 153",
    Icon: ShieldCheck,
    photo: "/member-preview-happy-user.jpg",
    photoPosition: "center 44%",
  },
  "Ready to push": {
    accent: "250 204 21",
    Icon: Zap,
    photo: "/onboarding-workout-focus-photo.jpg",
    photoPosition: "center 36%",
  },

  "Simple checklist": {
    accent: "34 211 238",
    Icon: CheckSquare,
    photo: "/onboarding-goal-planning-photo.jpg",
    photoPosition: "center 50%",
  },
  "Video guidance": {
    accent: "129 140 248",
    Icon: Video,
    photo: "/member-preview-support-team.jpg",
    photoPosition: "center 46%",
  },
  Reminders: {
    accent: "250 204 21",
    Icon: Bell,
    photo: "/member-preview-matched-plan.jpg",
    photoPosition: "center 50%",
  },
  "Progress tracking": {
    accent: "52 211 153",
    Icon: ChartNoAxesColumnIncreasing,
    photo: "/member-preview-matched-plan.jpg",
    photoPosition: "center 50%",
  },
  "Coach-style notes": {
    accent: "244 114 182",
    Icon: MessageSquareText,
    photo: "/member-preview-support-team.jpg",
    photoPosition: "center 46%",
  },
  "Minimal nudges": {
    accent: "148 163 184",
    Icon: BellOff,
    photo: "/member-preview-no-commute.jpg",
    photoPosition: "center 50%",
  },

  "My account": {
    accent: "34 211 238",
    Icon: AppWindow,
    photo: "/member-preview-matched-plan.jpg",
    photoPosition: "center 50%",
  },
  Email: {
    accent: "56 189 248",
    Icon: Mail,
    photo: "/member-preview-connected-support.jpg",
    photoPosition: "center 48%",
  },
  Text: {
    accent: "52 211 153",
    Icon: Smartphone,
    photo: "/member-preview-happy-user.jpg",
    photoPosition: "center 44%",
  },
  Phone: {
    accent: "251 146 60",
    Icon: Phone,
    photo: "/member-preview-support-team.jpg",
    photoPosition: "center 46%",
  },
  "Not yet": {
    accent: "148 163 184",
    Icon: Ban,
    photo: "/member-preview-seattle-bg.png",
    photoPosition: "center 46%",
  },
};

const CONFETTI_COLORS = [
  "#67e8f9",
  "#facc15",
  "#fb923c",
  "#34d399",
  "#f0fdff",
  "#38bdf8",
];

const CONFETTI_PIECES = Array.from({ length: 36 }, (_, index) => ({
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  delay: `${((index * 53) % 150) / 100}s`,
  duration: `${2.3 + ((index * 29) % 130) / 100}s`,
  rotation: `${360 + ((index * 97) % 620)}deg`,
  size: 5 + ((index * 13) % 6),
  sway: `${(((index * 41) % 96) - 48) / 12}rem`,
  x: `${(index * 37 + 5) % 100}%`,
}));

const defaultRecoVisual: OptionVisual = {
  accent: "34 211 238",
  Icon: Target,
  photo: "/onboarding-workout-focus-photo.jpg",
  photoPosition: "center 40%",
};

const recoVisuals: Record<string, OptionVisual> = {
  "Guided mobility": { accent: "45 212 191", Icon: StretchHorizontal, photo: "/onboarding-deep-squat-goal.png", photoPosition: "center 52%" },
  "Recovery blocks": { accent: "251 113 133", Icon: Bed, photo: "/member-preview-happy-user.jpg", photoPosition: "center 44%" },
  "Gentle strength": { accent: "52 211 153", Icon: ShieldCheck, photo: "/onboarding-location-open-floor.jpg", photoPosition: "center 46%" },
  "Mobility routines": { accent: "45 212 191", Icon: StretchHorizontal, photo: "/onboarding-deep-squat-goal.png", photoPosition: "center 52%" },
  Recovery: { accent: "251 113 133", Icon: HeartPulse, photo: "/member-preview-happy-user.jpg", photoPosition: "center 44%" },
  "Full-body strength": { accent: "34 211 238", Icon: BicepsFlexed, photo: "/onboarding-workout-focus-photo.jpg", photoPosition: "center 40%" },
  Workouts: { accent: "56 189 248", Icon: Dumbbell, photo: "/onboarding-equipment-dumbbells.jpg", photoPosition: "44% 50%" },
  "Nutrition habits": { accent: "132 204 22", Icon: Salad, photo: "/onboarding-goal-planning-photo.jpg", photoPosition: "center 54%" },
  Accountability: { accent: "251 191 36", Icon: CheckSquare, photo: "/member-preview-support-team.jpg", photoPosition: "center 44%" },
  "Performance strength": { accent: "129 140 248", Icon: SportShoe, photo: "/onboarding-workout-focus-photo.jpg", photoPosition: "center 36%" },
  Control: { accent: "59 130 246", Icon: Activity, photo: "/onboarding-location-garage-gym.jpg", photoPosition: "center 35%" },
  Reminders: { accent: "250 204 21", Icon: Bell, photo: "/onboarding-goal-planning-photo.jpg", photoPosition: "center 50%" },
  Streaks: { accent: "251 146 60", Icon: Zap, photo: "/onboarding-location-mixed.jpg", photoPosition: "center 55%" },
  "Weekly checkpoints": { accent: "52 211 153", Icon: CalendarCheck, photo: "/onboarding-goal-planning-photo.jpg", photoPosition: "center 50%" },
  "Guided strength": { accent: "56 189 248", Icon: Dumbbell, photo: "/onboarding-equipment-dumbbells.jpg", photoPosition: "44% 50%" },
  Mobility: { accent: "45 212 191", Icon: StretchHorizontal, photo: "/onboarding-location-open-floor.jpg", photoPosition: "center 50%" },
  "Recovery support": { accent: "251 113 133", Icon: HeartPulse, photo: "/member-preview-happy-user.jpg", photoPosition: "center 44%" },
};

// Each song's accent, so the track picker's shadowy glow is color-coded to
// whatever is playing (deep drift indigo, dreamy cyan, aurora green).
const trackColors: Record<string, string> = {
  drift: "129 140 248",
  dreamy: "34 211 238",
  aurora: "52 211 153",
};
const defaultTrackColor = "34 211 238";

// Ambient sparks that rise behind the result "Sign Up Now" CTA.
const SIGNUP_PARTICLES = [
  { left: "6%", size: 5, dur: 3.4, delay: 0, drift: 8, rise: -96 },
  { left: "16%", size: 3, dur: 4.2, delay: 1.1, drift: -6, rise: -104 },
  { left: "27%", size: 4, dur: 3.0, delay: 0.5, drift: 5, rise: -110 },
  { left: "38%", size: 6, dur: 4.6, delay: 2.0, drift: -8, rise: -92 },
  { left: "49%", size: 3, dur: 3.6, delay: 0.9, drift: 4, rise: -112 },
  { left: "59%", size: 5, dur: 4.0, delay: 1.6, drift: -5, rise: -98 },
  { left: "69%", size: 4, dur: 3.2, delay: 0.2, drift: 7, rise: -108 },
  { left: "79%", size: 3, dur: 4.4, delay: 2.4, drift: -6, rise: -94 },
  { left: "89%", size: 5, dur: 3.8, delay: 1.3, drift: 6, rise: -106 },
  { left: "95%", size: 3, dur: 3.4, delay: 0.6, drift: -4, rise: -100 },
];

/** kebab slug used to find each recommendation's own video file. */
function recoSlug(pill: string) {
  return pill
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// A short, unique line shown under each recommendation's video. Anything not
// listed here falls back to a templated caption.
const recoCaptions: Record<string, string> = {
  "Guided mobility": "How a guided mobility session flows inside your plan.",
  "Recovery blocks": "What a recovery block looks like on a training week.",
  "Gentle strength": "Low-friction strength that builds confidence first.",
  "Mobility routines": "Simple routines that open up range of motion.",
  Recovery: "The recovery habits your plan is built around.",
  "Full-body strength": "A full-body strength session, start to finish.",
  Workouts: "A repeatable workout you can run any day.",
  "Nutrition habits": "The small nutrition habits your coach reinforces.",
  Accountability: "How check-ins keep you accountable week to week.",
  "Performance strength": "Strength work tuned for power and control.",
  Control: "Movement control drills that protect every lift.",
  Reminders: "How reminders keep your streak alive.",
  Streaks: "Building momentum one streak at a time.",
  "Weekly checkpoints": "Weekly checkpoints that prove your progress.",
  "Guided strength": "A guided strength session, coached step by step.",
  Mobility: "Mobility work that makes training feel easier.",
  "Recovery support": "The recovery support layered into your plan.",
};

function safeParseAnswers(raw: string | null): StoredLeadAssessmentAnswers {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeMultiSelectAnswer(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0,
    );
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return [value];
  }

  return [];
}

function isMultiSelectAnswerKey(
  key: keyof LeadAssessmentAnswers,
): key is MultiSelectAnswerKey {
  return (
    key === "coachingStyle" ||
    key === "equipment" ||
    key === "limitation" ||
    key === "movementConfidence" ||
    key === "recoveryBaseline"
  );
}

function normalizeAnswers(
  storedAnswers: StoredLeadAssessmentAnswers,
): LeadAssessmentAnswers {
  return {
    ...defaultAnswers,
    ...storedAnswers,
    coachingStyle: normalizeMultiSelectAnswer(storedAnswers.coachingStyle),
    equipment: normalizeMultiSelectAnswer(storedAnswers.equipment),
    limitation: normalizeMultiSelectAnswer(storedAnswers.limitation),
    movementConfidence: normalizeMultiSelectAnswer(
      storedAnswers.movementConfidence,
    ),
    recoveryBaseline: normalizeMultiSelectAnswer(
      storedAnswers.recoveryBaseline,
    ),
  };
}

function formatAnswerList(items: string[], fallback: string) {
  if (items.length === 0) return fallback;
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function getResultProfile(answers: LeadAssessmentAnswers): ResultProfile {
  const goal = answers.mainGoal.toLowerCase();
  const confidence = answers.movementConfidence.join(" ").toLowerCase();
  const equipment = answers.equipment.join(" ").toLowerCase();
  const equipmentLabel = formatAnswerList(
    answers.equipment,
    "bodyweight-friendly options",
  );
  const environment =
    answers.trainingEnvironment || "your usual training space";
  const limitation = answers.limitation.join(" ").toLowerCase();
  const recovery = answers.recoveryBaseline.join(" ").toLowerCase();
  const sessionLength = answers.sessionLength || "30-45 minutes";
  const frequency = answers.trainingAvailability || "2x/week";
  const setupNote = `${frequency}, ${sessionLength}, using ${equipmentLabel} in ${environment.toLowerCase()}.`;
  const setupItems: SetupItem[] = [
    { Icon: CalendarCheck, label: "Frequency", value: frequency },
    { Icon: Timer, label: "Session", value: sessionLength },
    { Icon: Dumbbell, label: "Equipment", value: equipmentLabel },
    { Icon: Home, label: "Location", value: environment },
  ];

  let exerciseFocus =
    "Full-body strength patterns: squat, hinge, push, pull, carry, core, and mobility prep.";

  if (equipment.includes("gym")) {
    exerciseFocus =
      "Compound lifts, machine-supported accessories, cables, carries, and progressive conditioning.";
  } else if (equipment.includes("cardio")) {
    exerciseFocus =
      "Strength circuits paired with low-impact intervals and recovery-paced conditioning.";
  } else if (equipment.includes("dumbbell")) {
    exerciseFocus =
      "Dumbbell goblet squats, hinges, rows, presses, carries, split squats, and core finishers.";
  } else if (equipment.includes("bench")) {
    exerciseFocus =
      "Step-ups, elevated push-ups, split squats, hip thrusts, supported rows, and dumbbell work.";
  } else if (equipment.includes("band")) {
    exerciseFocus =
      "Band rows, presses, hinges, assisted mobility, anti-rotation core, and low-friction circuits.";
  } else if (equipment.includes("bodyweight")) {
    exerciseFocus =
      "Bodyweight strength, tempo reps, step-ups, wall presses, floor core work, and mobility flows.";
  }

  if (
    limitation.includes("pain") ||
    limitation.includes("knees") ||
    limitation.includes("back") ||
    limitation.includes("shoulders") ||
    limitation.includes("low impact") ||
    confidence.includes("modifications")
  ) {
    exerciseFocus =
      "Low-impact strength, supported ranges, mobility prep, core stability, and exercise substitutions before intensity.";
  }

  if (
    recovery.includes("low") ||
    recovery.includes("poor") ||
    recovery.includes("sore") ||
    recovery.includes("stress")
  ) {
    exerciseFocus = `${exerciseFocus} Start with moderate effort, shorter blocks, and clear recovery checkpoints.`;
  }

  if (goal.includes("pain") || limitation.includes("pain")) {
    return {
      title: "Pain-Free Movement Starter",
      icon: "heart",
      tone: "rose",
      body: "Your best first step is a low-friction strength plan supported by mobility and recovery work. The goal is to build confidence, reduce stiffness, and make movement feel safer before adding intensity.",
      exerciseFocus,
      service: `Recommended: ${frequency} guided mobility, recovery blocks, and gentle strength work.`,
      servicePills: ["Guided mobility", "Recovery blocks", "Gentle strength"],
      setupItems,
      setupNote,
    };
  }

  if (goal.includes("mobility")) {
    return {
      title: "Mobility + Recovery Reset",
      icon: "activity",
      tone: "emerald",
      body: "Your answers point toward better range of motion, smoother movement, and recovery habits that support training. A simple plan can pair mobility blocks with full-body strength so progress feels useful right away.",
      exerciseFocus,
      service: `Recommended: ${frequency} routines for mobility, recovery, and simple full-body strength.`,
      servicePills: ["Mobility routines", "Recovery", "Full-body strength"],
      setupItems,
      setupNote,
    };
  }

  if (goal.includes("weight")) {
    return {
      title: "Weight Loss Support Plan",
      icon: "target",
      tone: "amber",
      body: "Your starting plan should make consistency easier while protecting strength and recovery. The first phase can focus on repeatable workouts, simple daily targets, and coaching support around the habits that matter most.",
      exerciseFocus,
      service: `Recommended: ${frequency} workouts with nutrition habits and accountability checkpoints.`,
      servicePills: ["Workouts", "Nutrition habits", "Accountability"],
      setupItems,
      setupNote,
    };
  }

  if (goal.includes("sports")) {
    return {
      title: "Sports Performance Builder",
      icon: "bolt",
      tone: "sky",
      body: "Your answers suggest a plan that develops strength, control, and athletic capacity without skipping the foundation. The first phase should connect movement quality, power, and recovery so performance can build safely.",
      exerciseFocus,
      service: `Recommended: ${frequency} training with performance-focused strength, control, and recovery.`,
      servicePills: ["Performance strength", "Control", "Recovery"],
      setupItems,
      setupNote,
    };
  }

  if (goal.includes("consistent") || limitation.includes("motivation")) {
    return {
      title: "Consistency Kickstart",
      icon: "calendar",
      tone: "emerald",
      body: "Your best starting point is a plan that removes guesswork and keeps wins visible. Short, structured sessions and clear follow-up can help the routine become easier to repeat.",
      exerciseFocus,
      service: `Recommended: ${frequency} sessions with reminders, streaks, and weekly checkpoints.`,
      servicePills: ["Reminders", "Streaks", "Weekly checkpoints"],
      setupItems,
      setupNote,
    };
  }

  return {
    title: "Strength Foundation",
    icon: "dumbbell",
    tone: "sky",
    body: "Your answers point toward a simple strength plan supported by mobility and recovery work. This is ideal if you want to move better, build confidence, and avoid jumping into an overwhelming program.",
    exerciseFocus,
    service: `Recommended: ${frequency} guided strength with mobility and recovery support.`,
    servicePills: ["Guided strength", "Mobility", "Recovery support"],
    setupItems,
    setupNote,
  };
}

function getLoginHref(nextPath: string | null) {
  const target = nextPath || ROUTES.dashboard.home;
  return `${ROUTES.auth.login}?next=${encodeURIComponent(target)}` as const;
}

function OptionCard({
  active,
  disabled,
  label,
  motionPhase,
  multiSelect,
  onClick,
  showPhoto,
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  motionPhase: SelectionMotion["phase"] | "idle";
  multiSelect: boolean;
  onClick: () => void;
  showPhoto: boolean;
}) {
  const visual = optionVisuals[label] ?? defaultOptionVisual;
  const Icon = visual.Icon;
  const optionPhoto = showPhoto ? visual.photo : null;
  const visualActive = motionPhase !== "idle";
  const optionStyle = {
    "--option-accent": visual.accent,
  } as CSSProperties;
  // Break the label onto two rows at the first space or slash, so it reads as
  // two tidy rows (letting the type run a little larger). A slash stays on the
  // top row; whatever follows it drops to the second row.
  const softBreak = (text: string) => text.split("/").join("/\u200B");
  const labelBreak = label.match(/^(.*?)([ /])(.*)$/);
  const labelFirst = labelBreak
    ? labelBreak[1] + (labelBreak[2] === "/" ? "/" : "")
    : label;
  const labelRest = labelBreak ? labelBreak[3] : "";
  // Each word is its own inline-block that knows how many characters it has,
  // so it can cap its own size against the card width (see .sound-option-word).
  // A long word shrinks just enough to stay on one row; short words are left at
  // the label's full size.
  const renderWords = (text: string) =>
    text
      .split(" ")
      .filter(Boolean)
      .map((word, index) => (
        <Fragment key={`${word}-${index}`}>
          {index > 0 ? " " : null}
          <span
            className="sound-option-word"
            style={
              { "--word-chars": word.length } as CSSProperties
            }
          >
            {softBreak(word)}
          </span>
        </Fragment>
      ));

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      data-active={visualActive ? "true" : "false"}
      data-selected={multiSelect && active ? "true" : "false"}
      data-selection-kind={multiSelect ? "multi" : "single"}
      data-selection-motion={motionPhase}
      style={optionStyle}
      className="sound-option-card group relative grid place-items-center overflow-hidden border p-5 text-center transition duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
    >
      {optionPhoto ? (
        <span
          aria-hidden="true"
          className="sound-option-photo"
          style={{
            backgroundImage: `url(${optionPhoto})`,
            backgroundPosition: visual.photoPosition ?? "center",
          }}
        />
      ) : null}
      <span
        aria-hidden="true"
        className="sound-option-selection-spark sound-option-selection-spark--one"
      />
      <span
        aria-hidden="true"
        className="sound-option-selection-spark sound-option-selection-spark--two"
      />
      <span aria-hidden="true" className="sound-option-icon-shell">
        <Icon className="h-8 w-8" strokeWidth={2.35} />
      </span>
      <span className="sound-option-label relative z-10 mt-3 text-[13px] font-black leading-[1.08] text-white">
        {renderWords(labelFirst)}
        {labelRest ? (
          <>
            <br />
            {renderWords(labelRest)}
          </>
        ) : null}
      </span>
    </button>
  );
}

function TextField({
  autoComplete,
  describedBy,
  id,
  invalid = false,
  label,
  name,
  onChange,
  placeholder,
  required = false,
  type = "text",
  value,
}: {
  autoComplete?: string;
  describedBy?: string;
  id?: string;
  invalid?: boolean;
  label: string;
  name?: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  type?: "email" | "tel" | "text";
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-cyan-200">
            *
          </span>
        ) : null}
      </span>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        autoComplete={autoComplete}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/74 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/55 aria-[invalid]:border-amber-300/60"
      />
    </label>
  );
}

function MuteToggle({
  Icon,
  label,
  muted,
  onToggle,
}: {
  Icon: LucideIcon;
  label: string;
  muted: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={muted}
      aria-label={`${muted ? "Unmute" : "Mute"} ${label.toLowerCase()}`}
      data-tooltip={`${muted ? "Unmute" : "Mute"} ${label}`}
      style={{ color: muted ? "#64748b" : "#cffafe" }}
      className="sound-tip sound-mute-toggle relative grid h-6 w-6 shrink-0 place-items-center rounded transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
    >
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
      {muted ? (
        <span aria-hidden="true" className="sound-mute-slash" />
      ) : null}
    </button>
  );
}

export default function OnboardingQuestionnaire() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const loginHref = getLoginHref(nextPath);
  const [stage, setStage] = useState<"welcome" | "questions" | "result">(
    "welcome",
  );
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<LeadAssessmentAnswers>(defaultAnswers);
  const [statusMessage, setStatusMessage] = useState("");
  const [selectionMotion, setSelectionMotion] =
    useState<SelectionMotion | null>(null);
  const [isNextLaunching, setIsNextLaunching] = useState(false);
  const [isResetTransitioning, setIsResetTransitioning] = useState(false);
  const [welcomeNonce, setWelcomeNonce] = useState(0);
  // Matches soundFx's defaults (music off, effects on) so the toggles don't
  // flash the wrong state before they sync from storage on mount.
  const [musicMuted, setMusicMuted] = useState(true);
  const [sfxMuted, setSfxMuted] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.85);
  const [audioStarted, setAudioStarted] = useState(false);
  const [isVolumeMenuOpen, setIsVolumeMenuOpen] = useState(false);
  const [isTrackOpen, setIsTrackOpen] = useState(false);
  const [showAssessmentConfirm, setShowAssessmentConfirm] = useState(false);
  const [purchaseComingSoonPlanId, setPurchaseComingSoonPlanId] =
    useState<"online-coaching" | null>(null);
  // Whether the results email actually went out. Starts unknown so the result
  // screen doesn't promise an inbox delivery that never happened.
  const [, setResultsEmailed] = useState<boolean | null>(null);
  const submittedRef = useRef(false);
  const [trackId, setTrackId] = useState("drift");
  const [tracks, setTracks] = useState<{ id: string; name: string }[]>([]);
  const volumeControlRef = useRef<HTMLDivElement | null>(null);
  const trackVizRef = useRef<HTMLCanvasElement | null>(null);
  const trackColorRef = useRef(defaultTrackColor);
  trackColorRef.current = trackColors[trackId] ?? defaultTrackColor;
  const allMuted = masterVolume === 0 || (musicMuted && sfxMuted);
  // The trigger "lights up" once audio is actually playing (started + audible).
  const isAudioPlaying = audioStarted && !allMuted;

  // Recommendation video popup: which pill's video is open, and whether its
  // file was missing (graceful fallback).
  const [activeReco, setActiveReco] = useState<string | null>(null);
  const [spotlightReco, setSpotlightReco] = useState(0);
  const [recoVideoError, setRecoVideoError] = useState(false);
  const recoNavRef = useRef<string[]>([]);
  const recoVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const recoLabelRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  useEffect(() => {
    if (!activeReco) return;
    // Capture the narrowed value: onKey is hoisted, so TS won't carry the
    // null-check above into it.
    const openReco = activeReco;
    setRecoVideoError(false);
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveReco(null);
        return;
      }
      const list = recoNavRef.current;
      const index = list.indexOf(openReco);
      if (index < 0) return;
      if (event.key === "ArrowLeft" && index > 0) {
        setActiveReco(list[index - 1]);
      } else if (event.key === "ArrowRight" && index < list.length - 1) {
        setActiveReco(list[index + 1]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeReco]);

  const stageRef = useRef(stage);
  stageRef.current = stage;

  useEffect(() => {
    setMusicMuted(soundFx.isMusicMuted());
    setSfxMuted(soundFx.isSfxMuted());
    setMasterVolume(soundFx.getMasterVolume());
    setTracks(soundFx.getTracks());
    setTrackId(soundFx.getTrackId());

    // Fire the crest fly-in shimmer exactly once, as early as the browser
    // allows. The animation is quick, so we want the sound to land with it.
    let flyInFired = false;
    const fireFlyIn = () => {
      if (flyInFired) return;
      flyInFired = true;
      soundFx.unlock();
      setAudioStarted(true);
      if (stageRef.current === "welcome") soundFx.flyIn();
    };

    // Attempt immediately on load: if the click that navigated here still
    // carries user activation (the normal click-through flow), audio starts
    // right away and the shimmer syncs with the animation. If audio is still
    // locked (hard refresh / typed URL), fall back to the first gesture.
    void soundFx.ensureRunning().then((running) => {
      if (running) fireFlyIn();
    });
    window.addEventListener("pointerdown", fireFlyIn, { once: true });
    window.addEventListener("keydown", fireFlyIn, { once: true });

    return () => {
      window.removeEventListener("pointerdown", fireFlyIn);
      window.removeEventListener("keydown", fireFlyIn);
    };
  }, []);

  useEffect(() => {
    // The crest fly-in replays when the shell remounts (Start Over); give it
    // its shimmer. Initial page load stays silent — browsers require a user
    // gesture before any audio.
    if (welcomeNonce > 0 && stage === "welcome") soundFx.flyIn();
  }, [welcomeNonce, stage]);

  useEffect(() => {
    // Collapse the track scroller whenever the audio menu closes, so it
    // reopens showing just the "Track" header.
    if (!isVolumeMenuOpen) setIsTrackOpen(false);
  }, [isVolumeMenuOpen]);

  useEffect(() => {
    // Moving to another question/stage (e.g. scrolling forward) should dismiss
    // the audio menu instead of leaving it stuck open over the new content.
    setIsVolumeMenuOpen(false);
  }, [step, stage]);

  useEffect(() => {
    if (!showAssessmentConfirm) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setShowAssessmentConfirm(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAssessmentConfirm]);

  useEffect(() => {
    // Drive the track pill's music visualizer while it's open: draw frequency
    // bars from the live music spectrum (with a gentle idle wave when silent).
    if (!isTrackOpen) return;
    const canvas = trackVizRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const bins = new Uint8Array(256);
    const barCount = 20;
    // Give each bar its own log-spaced frequency band (bass on the left → highs
    // on the right), so bars move independently with the actual notes and drums
    // rather than all rising together with volume.
    const minBin = 1;
    const maxBin = 130;
    const logMin = Math.log(minBin);
    const logSpan = Math.log(maxBin) - logMin;
    const bandLo: number[] = [];
    const bandHi: number[] = [];
    for (let i = 0; i < barCount; i += 1) {
      const lo = Math.round(Math.exp(logMin + logSpan * (i / barCount)));
      const hi = Math.max(
        lo + 1,
        Math.round(Math.exp(logMin + logSpan * ((i + 1) / barCount))),
      );
      bandLo.push(lo);
      bandHi.push(hi);
    }
    // Per-bar smoothing state so bars ease rather than flicker.
    const levels = new Float32Array(barCount);
    const start = performance.now();
    let raf = 0;

    const render = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) {
        raf = requestAnimationFrame(render);
        return;
      }
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const live = soundFx.readMusicSpectrum(bins);
      const color = trackColorRef.current.replace(/ /g, ",");
      const t = (now - start) / 1000;
      const barW = w / barCount;

      for (let i = 0; i < barCount; i += 1) {
        // Peak energy within this bar's frequency band.
        let peak = 0;
        if (live) {
          for (let k = bandLo[i]; k < bandHi[i]; k += 1) {
            if (bins[k] > peak) peak = bins[k];
          }
        }
        // Boost higher bands to offset music's natural high-frequency rolloff.
        const boost = 1 + (i / barCount) * 1.6;
        const target = Math.min(1, (peak / 255) * boost);
        // Fast attack, slower release so bars punch on transients then ease.
        const prev = levels[i];
        levels[i] = target > prev ? target : prev * 0.82 + target * 0.18;

        const idle = 0.05 + 0.045 * Math.sin(t * 2.2 + i * 0.9);
        const v = Math.max(levels[i], idle);
        const bh = Math.max(1.5, v * h);
        const grad = ctx.createLinearGradient(0, h, 0, h - bh);
        grad.addColorStop(0, `rgba(${color},0.12)`);
        grad.addColorStop(1, `rgba(${color},${0.5 + levels[i] * 0.45})`);
        ctx.fillStyle = grad;
        ctx.fillRect(i * barW + 0.6, h - bh, barW - 1.2, bh);
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [isTrackOpen]);

  useEffect(() => {
    if (!isVolumeMenuOpen) return;

    function handlePointer(event: PointerEvent) {
      if (
        volumeControlRef.current &&
        !volumeControlRef.current.contains(event.target as Node)
      ) {
        setIsVolumeMenuOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setIsVolumeMenuOpen(false);
    }

    window.addEventListener("pointerdown", handlePointer);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("pointerdown", handlePointer);
      window.removeEventListener("keydown", handleKey);
    };
  }, [isVolumeMenuOpen]);

  function handleMasterVolumeChange(next: number) {
    setMasterVolume(next);
    soundFx.setMasterVolume(next);
  }

  function handleToggleMusicMute() {
    setMusicMuted((muted) => {
      const next = !muted;
      soundFx.setMusicMuted(next);
      return next;
    });
  }

  function handleToggleSfxMute() {
    setSfxMuted((muted) => {
      const next = !muted;
      soundFx.setSfxMuted(next);
      if (!next) soundFx.tick();
      return next;
    });
  }

  function handleSelectTrack(nextTrackId: string) {
    setTrackId(nextTrackId);
    soundFx.select();
    soundFx.setTrack(nextTrackId);
    if (musicMuted) {
      setMusicMuted(false);
      soundFx.setMusicMuted(false);
    }
  }

  function cycleTrack(delta: number) {
    if (!tracks.length) return;
    // Read the live track from soundFx (updates synchronously) so rapid
    // clicks always advance from the true current track, not lagging state.
    const activeId = soundFx.getTrackId();
    const current = tracks.findIndex((track) => track.id === activeId);
    const from = current === -1 ? 0 : current;
    const next = (from + delta + tracks.length) % tracks.length;
    handleSelectTrack(tracks[next].id);
  }

  const [isStorageReady, setIsStorageReady] = useState(false);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const clearAutoAdvanceTimer = useCallback(() => {
    if (!autoAdvanceTimerRef.current) return;

    clearTimeout(autoAdvanceTimerRef.current);
    autoAdvanceTimerRef.current = null;
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setAnswers(
        normalizeAnswers(
          safeParseAnswers(window.localStorage.getItem(STORAGE_KEY)),
        ),
      );
      setIsStorageReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isStorageReady) return;

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  }, [answers, isStorageReady]);

  useEffect(() => clearAutoAdvanceTimer, [clearAutoAdvanceTimer]);

  const activeQuestion = questions[step];
  const completedProgressStep =
    stage === "result" ? questions.length : Math.max(0, step);
  const result = useMemo(() => getResultProfile(answers), [answers]);
  recoNavRef.current = result.servicePills;

  useEffect(() => {
    // Spotlight one recommendation card at a time, rotating every 6s (no
    // visible timer) so each one gets a moment to sparkle.
    if (stage !== "result") return;
    const count = result.servicePills.length;
    if (count <= 1) return;
    setSpotlightReco(0);
    const id = window.setInterval(() => {
      setSpotlightReco((current) => (current + 1) % count);
    }, 6000);
    return () => clearInterval(id);
  }, [stage, result]);

  useEffect(() => {
    // Reaching the result is the only "submit" this questionnaire has — until
    // now the answers never left the browser, so a finished assessment reached
    // nobody. Fire once, and never block the result screen on it.
    if (stage !== "result") return;
    if (submittedRef.current) return;
    if (!answers.email.trim()) return;
    submittedRef.current = true;

    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/lead-assessment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            email: answers.email,
            fullName: answers.firstName,
            phone: answers.phone,
            resultTitle: result.title,
            resultBody: result.body,
            serviceLine: result.service,
            servicePills: result.servicePills,
            setup: result.setupItems.map((item) => ({
              label: item.label,
              value: item.value,
            })),
            answers,
          }),
        });
        const data = (await response.json()) as { emailed?: boolean };
        setResultsEmailed(Boolean(data.emailed));
      } catch {
        setResultsEmailed(false);
      }
    })();

    return () => controller.abort();
  }, [stage, answers, result]);

  useEffect(() => {
    // Only the spotlighted card's video plays; the rest hold on their poster
    // frame. Keeps three clips from decoding at once behind the same panel.
    if (stage !== "result") return;
    recoVideoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (index === spotlightReco) {
        void video.play().catch(() => {
          // Autoplay can be refused; the poster still shows.
        });
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [spotlightReco, stage, result]);

  useEffect(() => {
    // A reco card is barely wider than its icon, so a long label can't always
    // fit. Words are never split mid-word — instead, if a word is too wide to
    // sit on its own line, the whole label is dropped and the card reads as
    // just its icon.
    if (stage !== "result") return;

    const fitLabels = () => {
      recoLabelRefs.current.forEach((label) => {
        if (!label) return;
        // Measure un-hidden, then decide. Reading scrollWidth after the style
        // change forces the layout we need.
        label.dataset.fits = "true";
        const overflows = label.scrollWidth > label.clientWidth + 1;
        label.dataset.fits = overflows ? "false" : "true";
      });
    };

    fitLabels();

    // The grid's width drives the decision and doesn't depend on whether the
    // labels are showing, so observing it can't feed back into itself.
    const grid = recoLabelRefs.current[0]?.closest(".sound-reco-grid");
    const observer = new ResizeObserver(fitLabels);
    if (grid) observer.observe(grid);
    return () => observer.disconnect();
  }, [stage, result]);

  const questionTransitionPhase =
    selectionMotion?.step === step ? selectionMotion.phase : "idle";
  const isMultiSelectStep = isMultiSelectAnswerKey(activeQuestion.key);
  const isContactStep = activeQuestion.key === "contactPreference";
  const isSelectionLocked = Boolean(selectionMotion && !isMultiSelectStep);

  const setAnswer = useCallback(
    (key: keyof LeadAssessmentAnswers, value: string | boolean | string[]) => {
      setAnswers((current) => ({ ...current, [key]: value }));
      setStatusMessage("");
    },
    [],
  );

  function resetAnswerForQuestion(questionIndex: number) {
    const nextQuestion = questions[questionIndex];

    if (!nextQuestion || nextQuestion.key === "contactPreference") return;

    setAnswers((current) => ({
      ...current,
      [nextQuestion.key]: defaultAnswers[nextQuestion.key],
    }));
  }

  function advanceFromStep(expectedStep: number) {
    setStatusMessage("");

    if (expectedStep >= questions.length - 1) {
      setStage("result");
      return;
    }

    const nextStep = Math.min(expectedStep + 1, questions.length - 1);
    resetAnswerForQuestion(nextStep);

    setStep((current) => (current === expectedStep ? nextStep : current));
  }

  function handleOptionSelect(option: string) {
    if (isSelectionLocked) return;

    const motionStep = step;
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const flickerMs = reduceMotion ? 120 : OPTION_SELECTION_FLICKER_MS;
    const fadeMs = reduceMotion ? 0 : OPTION_SELECTION_FADE_MS;
    const multiSelectMs = reduceMotion ? 120 : OPTION_MULTI_SELECTION_MS;
    clearAutoAdvanceTimer();

    const answerKey = activeQuestion.key;

    if (isMultiSelectAnswerKey(answerKey)) {
      const key = answerKey;
      const wasSelected = answers[key].includes(option);

      setAnswers((current) => {
        const currentValues = current[key];
        const selected = currentValues.includes(option);

        return {
          ...current,
          [key]: selected
            ? currentValues.filter((item) => item !== option)
            : [...currentValues, option],
        };
      });
      setStatusMessage("");

      if (wasSelected) {
        soundFx.deselect();
        setSelectionMotion(null);
        return;
      }

      soundFx.select();
      setSelectionMotion({ option, phase: "multi-check", step: motionStep });

      autoAdvanceTimerRef.current = setTimeout(() => {
        autoAdvanceTimerRef.current = null;
        setSelectionMotion((current) =>
          current?.step === motionStep && current.option === option
            ? null
            : current,
        );
      }, multiSelectMs);

      return;
    }

    soundFx.select();
    setAnswer(activeQuestion.key, option);
    setSelectionMotion({ option, phase: "flicker", step: motionStep });

    autoAdvanceTimerRef.current = setTimeout(() => {
      setSelectionMotion((current) =>
        current?.step === motionStep && current.option === option
          ? { ...current, phase: "fade" }
          : current,
      );

      autoAdvanceTimerRef.current = setTimeout(() => {
        autoAdvanceTimerRef.current = null;
        setSelectionMotion(null);
        advanceFromStep(motionStep);
      }, fadeMs);
    }, flickerMs);
  }

  function handleMultiSelectNext() {
    const key = activeQuestion.key;
    if (!isMultiSelectAnswerKey(key) || answers[key].length === 0) return;
    if (isNextLaunching) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const launchMs = reduceMotion ? 100 : NEXT_LAUNCH_MS;
    const launchStep = step;

    clearAutoAdvanceTimer();
    resetSelectionMotion();
    soundFx.next();
    setIsNextLaunching(true);

    autoAdvanceTimerRef.current = setTimeout(() => {
      autoAdvanceTimerRef.current = null;
      setIsNextLaunching(false);
      advanceFromStep(launchStep);
    }, launchMs);
  }

  function handleSendResults() {
    const email = answers.email.trim();

    if (!email) {
      setStatusMessage("Add an email address so we know where to send your results.");
      window.requestAnimationFrame(() => {
        const field = document.getElementById("sound-lead-email");
        if (field instanceof HTMLInputElement) {
          field.focus();
          field.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
      return;
    }

    clearAutoAdvanceTimer();
    resetSelectionMotion();
    soundFx.cheer();
    setAnswers((current) => ({
      ...current,
      contactPreference: "Email",
      email,
      firstName: current.firstName.trim(),
      phone: current.phone.trim(),
      cityZip: current.cityZip.trim(),
    }));
    setStatusMessage("");
    setStage("result");
  }

  function resetSelectionMotion() {
    setSelectionMotion(null);
  }

  function handlePrimaryStart() {
    clearAutoAdvanceTimer();
    resetSelectionMotion();
    soundFx.next();
    setIsNextLaunching(false);
    setAnswers(defaultAnswers);
    window.localStorage.removeItem(STORAGE_KEY);
    setStage("questions");
    setStep(0);
    setStatusMessage("");
  }

  function handleBack() {
    clearAutoAdvanceTimer();
    resetSelectionMotion();
    soundFx.back();
    setIsNextLaunching(false);
    setStatusMessage("");

    if (stage === "result") {
      setStage("questions");
      setStep(questions.length - 1);
      return;
    }

    setStep((current) => {
      if (current <= 0) {
        setStage("welcome");
        return 0;
      }

      return current - 1;
    });
  }

  function handleCreateAccount() {
    soundFx.select();
    setPurchaseComingSoonPlanId("online-coaching");
  }

  function handleReset() {
    if (isResetTransitioning) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    clearAutoAdvanceTimer();
    resetSelectionMotion();
    soundFx.back();
    setIsNextLaunching(false);
    setIsResetTransitioning(true);

    autoAdvanceTimerRef.current = setTimeout(
      () => {
        autoAdvanceTimerRef.current = null;
        setAnswers(defaultAnswers);
        window.localStorage.removeItem(STORAGE_KEY);
        setStage("welcome");
        setStep(0);
        setStatusMessage("");
        setWelcomeNonce((nonce) => nonce + 1);
        setIsResetTransitioning(false);
      },
      reduceMotion ? 0 : RESET_TRANSITION_MS,
    );
  }

  return (
    <main
      className="fixed inset-0 flex flex-col overflow-hidden bg-[#020713] text-white"
      data-onboarding-stage={stage}
      data-onboarding-step={step + 1}
      data-resetting={isResetTransitioning ? "true" : "false"}
    >
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_42%,rgba(14,165,233,0.2),transparent_24%),radial-gradient(circle_at_16%_20%,rgba(14,165,233,0.18),transparent_28%),radial-gradient(circle_at_82%_82%,rgba(250,204,21,0.1),transparent_24%),linear-gradient(180deg,#020713_0%,#07111f_50%,#020713_100%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(2,7,19,0.16)_42%,rgba(2,7,19,0.78)_100%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 shadow-[inset_0_0_160px_rgba(0,0,0,0.82),inset_0_0_70px_rgba(2,7,19,0.78)]" />

      <section className="relative z-10 mx-auto flex min-h-0 w-full max-w-6xl flex-1 items-center px-4 py-4 sm:px-6 sm:py-6">
        <div
          key={welcomeNonce}
          className={`sound-onboarding-shell relative grid h-full max-h-[43rem] min-h-0 w-full overflow-hidden rounded-xl bg-slate-950/42 shadow-[0_45px_160px_rgba(0,0,0,0.68),0_0_96px_rgba(14,165,233,0.12),inset_0_0_88px_rgba(2,7,19,0.72)] backdrop-blur-xl ring-1 ring-white/[0.055] ${
            stage === "welcome" ? "grid-rows-1" : "grid-rows-1"
          }`}
        >
          <a
            href={MARKETING_SITE.freeAssessment}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => {
              // Confirm before sending anyone off to the marketing site.
              event.preventDefault();
              setShowAssessmentConfirm(true);
            }}
            className="sound-assessment-link absolute left-4 top-4 z-40 max-w-[22rem] items-center gap-2 py-1 text-left text-[10px] font-black uppercase tracking-[0.11em] text-cyan-100 drop-shadow-[0_2px_10px_rgba(2,7,19,0.95)] transition hover:text-cyan-200 sm:left-5 sm:top-5"
          >
            <ClipboardCheck
              aria-hidden="true"
              className="sound-utility-link-primary-icon h-3.5 w-3.5 shrink-0 text-cyan-200"
            />
            <span aria-hidden="true" className="sound-utility-link-hover-icon">
              <ClipboardCheck className="h-full w-full" strokeWidth={2.2} />
            </span>
            <span className="sound-utility-link-copy min-w-0 leading-4">
              <span className="sound-assessment-kicker block">
                <span className="sound-assessment-long">
                  Looking for an in-home personal trainer?
                </span>
                <span className="sound-assessment-short">In-home trainer?</span>
              </span>
              <span className="sound-assessment-action block">
                <span className="sound-assessment-long">
                  Take the full in-home assessment on the website
                </span>
                <span className="sound-assessment-short">
                  Full site assessment
                </span>
              </span>
            </span>
          </a>

          {showAssessmentConfirm ? (
            <div
              className="sound-assessment-modal fixed inset-0 z-[90] flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="sound-assessment-confirm-title"
              onClick={() => setShowAssessmentConfirm(false)}
            >
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
              <div
                className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-cyan-300/25 bg-[radial-gradient(circle_at_14%_0%,rgba(34,211,238,0.12),transparent_46%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,7,19,0.96))] p-3.5 shadow-2xl shadow-black/50 sm:p-5"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setShowAssessmentConfirm(false)}
                  aria-label="Close"
                  className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full border border-white/20 bg-slate-950/55 text-white transition hover:bg-slate-950/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70 sm:right-3 sm:top-3 sm:h-8 sm:w-8"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>

                <div className="flex items-start gap-2.5 pr-7 sm:gap-3 sm:pr-8">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cyan-300/25 bg-cyan-400/10 text-cyan-100 sm:h-10 sm:w-10">
                    <ClipboardCheck
                      aria-hidden="true"
                      className="h-4 w-4 sm:h-5 sm:w-5"
                    />
                  </span>
                  <div className="min-w-0">
                    <h3
                      id="sound-assessment-confirm-title"
                      className="text-sm font-black uppercase leading-tight tracking-tight text-white sm:text-base"
                    >
                      Go to our website?
                    </h3>
                    <p className="mt-1.5 text-xs leading-5 text-slate-300 sm:mt-2 sm:text-sm sm:leading-6">
                      Our free{" "}
                      <span
                        className="font-black text-amber-300"
                        style={{
                          textShadow: "0 0 12px rgba(250, 204, 21, 0.28)",
                        }}
                      >
                        in-home personal training
                      </span>{" "}
                      assessment is a separate form on our website. Opens in a
                      new tab — your setup here stays put.
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-400/[0.06] px-2.5 py-2 sm:mt-4 sm:gap-2.5 sm:px-3 sm:py-2.5">
                  <ExternalLink
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0 text-cyan-200 sm:h-4 sm:w-4"
                  />
                  <span className="min-w-0">
                    <span className="block text-[8px] font-black uppercase leading-none tracking-[0.16em] text-slate-400 sm:text-[9px]">
                      Takes you to
                    </span>
                    <span className="mt-0.5 block truncate text-xs font-black leading-tight text-cyan-100 sm:text-sm">
                      {MARKETING_SITE.domain}
                    </span>
                  </span>
                </div>

                <div className="mt-3 flex flex-col-reverse gap-1.5 sm:mt-5 sm:flex-row sm:justify-end sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAssessmentConfirm(false)}
                    className="inline-flex min-h-8 items-center justify-center rounded-lg border border-white/12 bg-white/[0.05] px-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-200 transition hover:border-white/25 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70 sm:min-h-10 sm:px-4 sm:text-[11px]"
                  >
                    Stay here
                  </button>
                  <a
                    href={MARKETING_SITE.freeAssessment}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowAssessmentConfirm(false)}
                    className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg bg-cyan-400 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70 sm:min-h-10 sm:gap-2 sm:px-4 sm:text-[11px]"
                  >
                    Continue
                    <ExternalLink
                      aria-hidden="true"
                      className="h-3 w-3 sm:h-3.5 sm:w-3.5"
                    />
                  </a>
                </div>
              </div>
            </div>
          ) : null}

          <Link
            href={loginHref}
            className="sound-member-login-link absolute right-4 top-4 z-20 inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-sky-100 transition hover:text-white sm:right-5 sm:top-5"
          >
            <UserRound
              aria-hidden="true"
              className="sound-utility-link-primary-icon h-3.5 w-3.5 text-cyan-200"
            />
            <span aria-hidden="true" className="sound-utility-link-hover-icon">
              <UserRound className="h-full w-full" strokeWidth={2.25} />
            </span>
            <span className="sound-utility-link-copy">
              Already have an account?
            </span>
          </Link>

          <div
            ref={volumeControlRef}
            className="sound-audio-control absolute right-4 top-[3.7rem] z-40 sm:right-5"
          >
            <button
              type="button"
              onClick={() => setIsVolumeMenuOpen((open) => !open)}
              aria-label="Sound settings"
              aria-haspopup="true"
              aria-expanded={isVolumeMenuOpen}
              data-audio-live={
                isAudioPlaying && !isVolumeMenuOpen ? "true" : undefined
              }
              style={
                isAudioPlaying && !isVolumeMenuOpen
                  ? {
                      borderColor: "rgba(103, 232, 249, 0.7)",
                      background: "rgba(34, 211, 238, 0.16)",
                      color: "#ecfeff",
                    }
                  : undefined
              }
              className={`sound-audio-trigger grid h-5 w-5 place-items-center rounded-full border backdrop-blur transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70 ${
                isVolumeMenuOpen
                  ? "border-transparent bg-transparent"
                  : "border-white/15 bg-slate-950/70 text-cyan-100 hover:border-cyan-200/45 hover:text-white"
              }`}
            >
              {isVolumeMenuOpen ? null : allMuted ? (
                <VolumeX aria-hidden="true" className="h-3 w-3" />
              ) : (
                <Volume2 aria-hidden="true" className="h-3 w-3" />
              )}
            </button>

            {isVolumeMenuOpen ? (
              <div
                role="menu"
                style={{
                  background:
                    "radial-gradient(125% 100% at 82% 14%, rgba(3,8,22,0.98) 0%, rgba(3,8,22,0.93) 55%, rgba(3,8,22,0.85) 100%)",
                  boxShadow: "0 22px 50px rgba(2,7,19,0.72)",
                }}
                className="sound-volume-menu absolute right-0 top-0 flex w-fit flex-col gap-2 rounded-xl px-2.5 pb-2.5 pt-0 backdrop-blur-md"
              >
                <div className="flex flex-col items-end gap-1.5 pb-1 pr-0">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(masterVolume * 100)}
                    onChange={(event) =>
                      handleMasterVolumeChange(Number(event.target.value) / 100)
                    }
                    aria-label="Master volume"
                    className="sound-volume-slider sound-volume-slider--vertical cursor-pointer appearance-none rounded-full"
                    style={{
                      background: `linear-gradient(to top, rgb(103 232 249) ${Math.round(
                        masterVolume * 100,
                      )}%, rgba(148,163,184,0.35) ${Math.round(
                        masterVolume * 100,
                      )}%)`,
                    }}
                  />
                  <MuteToggle
                    label="Music"
                    Icon={Music}
                    muted={musicMuted}
                    onToggle={handleToggleMusicMute}
                  />
                  <MuteToggle
                    label="Effects"
                    Icon={Sparkles}
                    muted={sfxMuted}
                    onToggle={handleToggleSfxMute}
                  />
                </div>

                <div className="h-px bg-white/10" />

                <div className="relative flex flex-col items-end">
                  <button
                    type="button"
                    onClick={() => setIsTrackOpen((open) => !open)}
                    aria-expanded={isTrackOpen}
                    aria-label="Track"
                    data-tooltip="Track"
                    className="sound-tip inline-flex items-center gap-0.5 text-slate-200 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
                  >
                    <Music aria-hidden="true" className="h-4 w-4" />
                    <ChevronDown
                      aria-hidden="true"
                      className={`h-3 w-3 transition-transform ${
                        isTrackOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isTrackOpen ? (
                    <div
                      style={{
                        background: `radial-gradient(120% 160% at 50% 38%, rgb(${
                          trackColors[trackId] ?? defaultTrackColor
                        } / 0.32) 0%, rgba(0,0,0,0) 72%), linear-gradient(180deg, rgb(9,14,30), rgb(4,9,22))`,
                        boxShadow: `0 16px 34px rgba(2,7,19,0.8), 0 0 20px rgb(${
                          trackColors[trackId] ?? defaultTrackColor
                        } / 0.4)`,
                      }}
                      className="absolute right-0 top-full z-20 mt-2 w-28 overflow-hidden rounded-full px-1 py-1"
                    >
                      <canvas
                        ref={trackVizRef}
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
                      />
                      <div className="relative z-10 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => cycleTrack(-1)}
                          aria-label="Previous track"
                          className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-cyan-100/80 transition hover:bg-cyan-300/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
                        >
                          <ChevronLeft
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                          />
                        </button>
                        <span
                          aria-live="polite"
                          className="min-w-0 flex-1 truncate text-center text-[10px] font-black uppercase tracking-[0.06em] text-cyan-100 [text-shadow:0_1px_4px_rgba(2,7,19,0.95)]"
                        >
                          {tracks.find((track) => track.id === trackId)?.name ??
                            tracks[0]?.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => cycleTrack(1)}
                          aria-label="Next track"
                          className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-cyan-100/80 transition hover:bg-cyan-300/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
                        >
                          <ChevronRight
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                          />
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <aside
            className={`relative grid min-h-0 overflow-clip bg-[radial-gradient(circle_at_50%_35%,rgba(14,165,233,0.13),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.2),rgba(2,7,19,0.08))] p-5 sm:p-6 lg:p-8 ${
              stage === "welcome"
                ? "shadow-[inset_0_-72px_110px_rgba(2,7,19,0.68),inset_0_72px_120px_rgba(14,165,233,0.08)]"
                : "hidden"
            }`}
          >
            <div className="pointer-events-none absolute -left-20 -top-28 h-60 w-60 rounded-full bg-cyan-300/12 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 right-0 h-52 w-52 rounded-full bg-amber-200/10 blur-3xl" />

            <div className="sound-welcome-stack relative grid min-h-0 content-center gap-3 sm:gap-4">
              <div className="sound-logo-stage relative mx-auto grid aspect-square h-40 w-40 place-items-center sm:h-44 sm:w-44">
                <span
                  aria-hidden="true"
                  className="sound-logo-comet absolute h-36 w-36 rounded-full bg-cyan-200/24 blur-2xl sm:h-40 sm:w-40"
                />
                {[
                  "one",
                  "two",
                  "three",
                  "four",
                  "five",
                  "six",
                  "seven",
                  "eight",
                ].map((trail) => (
                  <span
                    key={trail}
                    aria-hidden="true"
                    className={`sound-logo-trail sound-logo-trail--${trail}`}
                  />
                ))}
                {[
                  "one",
                  "two",
                  "three",
                  "four",
                  "five",
                  "six",
                  "seven",
                  "eight",
                  "nine",
                  "ten",
                  "eleven",
                  "twelve",
                  "thirteen",
                  "fourteen",
                  "fifteen",
                  "sixteen",
                ].map((sparkle) => (
                  <span
                    key={sparkle}
                    aria-hidden="true"
                    className={`sound-logo-sparkle sound-logo-sparkle--${sparkle}`}
                  />
                ))}
                <div className="sound-logo-halo absolute inset-0 aspect-square rounded-full border border-cyan-200/25 bg-cyan-300/10 shadow-[0_0_54px_rgba(34,211,238,0.22)] motion-safe:animate-pulse" />
                <div className="sound-logo-disc absolute rounded-full" />
                <div className="sound-logo-orbit absolute inset-1 aspect-square rounded-full border border-amber-200/20 motion-safe:animate-[spin_18s_linear_infinite]" />
                <Image
                  src="/sound-fitness-logo.png"
                  alt="Sound Fitness"
                  width={156}
                  height={156}
                  priority
                  className="sound-logo-mark relative h-32 w-32 object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.4)] sm:h-36 sm:w-36"
                />
              </div>

              <div>
                <h1 className="mx-auto max-w-[34rem] text-center text-[2.15rem] font-black uppercase leading-[0.9] tracking-normal text-white sm:text-5xl">
                  <span className="block">Start with a</span>
                  <span className="block text-cyan-200">plan built</span>
                  <span className="block">around your body.</span>
                </h1>
                <p className="mx-auto mt-4 max-w-md text-center text-sm leading-6 text-slate-300 sm:text-base">
                  Answer a focused setup so Sound Fitness can match your
                  exercises to your space, equipment, recovery, and weekly
                  rhythm.
                </p>
              </div>

              <div className="flex max-w-full flex-wrap justify-center gap-2">
                {trustBullets.map(({ label, Icon }) => (
                  <span
                    key={label}
                    className="sound-trust-chip relative inline-flex max-w-full items-center gap-2 overflow-hidden rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-slate-100"
                  >
                    <span
                      aria-hidden="true"
                      className="sound-trust-sparkle sound-trust-sparkle--one"
                    />
                    <span
                      aria-hidden="true"
                      className="sound-trust-sparkle sound-trust-sparkle--two"
                    />
                    <span
                      aria-hidden="true"
                      className="sound-trust-sparkle sound-trust-sparkle--three"
                    />
                    <span
                      aria-hidden="true"
                      className="sound-trust-bubble sound-trust-bubble--one"
                    />
                    <span
                      aria-hidden="true"
                      className="sound-trust-bubble sound-trust-bubble--two"
                    />
                    <span
                      aria-hidden="true"
                      className="sound-trust-bubble sound-trust-bubble--three"
                    />
                    <span
                      aria-hidden="true"
                      className="sound-trust-bubble sound-trust-bubble--four"
                    />
                    <Icon aria-hidden="true" className="relative h-3.5 w-3.5" />
                    <span className="relative">{label}</span>
                  </span>
                ))}
              </div>

              {stage === "welcome" ? (
                <>
                  <div
                    aria-label="Starting plan steps"
                    className="sound-step-orbit relative mx-auto h-28 w-full max-w-4xl overflow-hidden sm:h-32"
                  >
                    {startingPlanSteps.map(
                      ({ image, imagePosition, label, number }) => (
                        <div
                          key={number}
                          className="sound-step-card rounded-lg border border-white/12 bg-white/[0.052] shadow-[0_18px_50px_rgba(0,0,0,0.34)]"
                        >
                          <Image
                            src={image}
                            alt=""
                            fill
                            aria-hidden="true"
                            sizes="(max-width: 640px) 78vw, 25rem"
                            className="sound-step-photo object-cover"
                            style={{ objectPosition: imagePosition }}
                          />
                          <div className="sound-step-glass absolute inset-0" />
                          <div className="sound-step-content relative z-10 flex min-h-[6.35rem] flex-col items-center justify-center px-5 py-4 text-center">
                            <div className="sound-step-number relative grid h-9 w-9 place-items-center text-xs font-black">
                              {number}
                            </div>
                            <p className="sound-step-label mt-3 text-sm font-black text-white">
                              {label}
                            </p>
                          </div>
                        </div>
                      ),
                    )}
                    <div aria-hidden="true" className="sound-step-dots">
                      <span className="sound-step-dot" />
                      <span className="sound-step-dot" />
                      <span className="sound-step-dot" />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handlePrimaryStart}
                    className="sound-app-start-button group mx-auto inline-flex min-h-14 w-fit max-w-[calc(100%-2rem)] items-center justify-center rounded-lg px-6 text-xs font-black uppercase tracking-[0.14em] text-slate-950 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 sm:px-8"
                  >
                    <span aria-hidden="true" className="sound-app-start-aura" />
                    <span
                      aria-hidden="true"
                      className="sound-app-start-sheen"
                    />
                    {["one", "two", "three", "four", "five"].map((sparkle) => (
                      <span
                        key={sparkle}
                        aria-hidden="true"
                        className={`sound-app-start-diamond sound-app-start-diamond--${sparkle}`}
                      />
                    ))}
                    <span className="sound-app-start-content relative z-10 inline-flex items-center justify-center gap-2 whitespace-nowrap">
                      <Sparkles aria-hidden="true" className="h-4 w-4" />
                      <span>Build My Fitness Plan</span>
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </span>
                  </button>
                </>
              ) : null}
            </div>
          </aside>

          <section
            data-panel-stage={stage}
            data-contact-step={isContactStep ? "true" : "false"}
            data-multi-step={isMultiSelectStep ? "true" : "false"}
            className={`sound-question-panel relative min-h-0 min-w-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_85%_14%,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_12%_82%,rgba(250,204,21,0.08),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.18),rgba(2,7,19,0.1))] p-5 ${
              stage === "result"
                ? "pt-24 sm:p-7 sm:pt-28"
                : "pt-20 sm:p-8 sm:pt-24"
            } ${stage === "welcome" ? "hidden" : "flex"}`}
          >
            <div className="absolute -inset-px -z-10 rounded-lg bg-[linear-gradient(135deg,rgba(34,211,238,0.28),transparent_30%,rgba(250,204,21,0.18)_70%,transparent)] opacity-80" />

            <div
              aria-hidden="true"
              className="sound-question-logo absolute left-1/2 top-3 z-10 -translate-x-1/2 sm:top-4"
            >
              <div className="sound-question-logo-stage relative grid aspect-square h-14 w-14 place-items-center sm:h-[4.5rem] sm:w-[4.5rem]">
                {["one", "two", "three"].map((sparkle) => (
                  <span
                    key={sparkle}
                    className={`sound-question-logo-sparkle sound-question-logo-sparkle--${sparkle}`}
                  />
                ))}
                <div className="sound-question-logo-halo absolute inset-0 rounded-full border border-cyan-200/20 bg-cyan-300/10" />
                <div className="sound-question-logo-disc absolute rounded-full" />
                <div className="sound-question-logo-orbit absolute inset-1 rounded-full border border-amber-200/20" />
                <Image
                  src="/sound-fitness-logo.png"
                  alt=""
                  width={88}
                  height={88}
                  className="sound-question-logo-mark relative h-11 w-11 object-contain sm:h-14 sm:w-14"
                />
              </div>
            </div>

            <div
              aria-label="Assessment progress"
              className="sound-progress-path"
              data-progress-result={stage === "result" ? "true" : "false"}
              data-progress-step={completedProgressStep}
              role="list"
            >
              {questions.map((question, index) => {
                const Icon = questionProgressIcons[index] ?? Target;
                const answered = stage === "result" || index < step;
                const active = stage === "questions" && index === step;

                return (
                  <div
                    key={question.key}
                    className="sound-progress-node"
                    data-active={active ? "true" : "false"}
                    data-answered={answered ? "true" : "false"}
                    role="listitem"
                    title={`Step ${index + 1}: ${question.title}`}
                  >
                    <span className="sound-progress-spark sound-progress-spark--one" />
                    <span className="sound-progress-spark sound-progress-spark--two" />
                    <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                    <span className="sr-only">
                      Step {index + 1}: {question.title}
                    </span>
                  </div>
                );
              })}

              <div
                className="sound-progress-node sound-progress-node--prize"
                data-active={stage === "result" ? "true" : "false"}
                data-answered={stage === "result" ? "true" : "false"}
                role="listitem"
                title="Custom recommendation"
              >
                <span className="sound-progress-spark sound-progress-spark--one" />
                <span className="sound-progress-spark sound-progress-spark--two" />
                <Trophy aria-hidden="true" className="h-4 w-4" />
                <span className="sr-only">Custom recommendation</span>
              </div>
            </div>

            {stage === "questions" ? (
              <p className="sound-progress-steplabel text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Step {step + 1} of {questions.length}
              </p>
            ) : null}

            {stage === "questions" ? (
              <div
                key={activeQuestion.key}
                className="sound-question-page flex min-h-0 flex-1 flex-col py-3"
                data-transition-phase={questionTransitionPhase}
              >
                <button
                  type="button"
                  onClick={handleBack}
                  className="sound-question-top-back mb-4 inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.045] px-4 text-[11px] font-black uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5 hover:border-cyan-100/35 hover:text-cyan-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
                >
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                  Back
                </button>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="mt-3 text-2xl font-black uppercase leading-none text-white sm:text-3xl">
                      {activeQuestion.title}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                      {activeQuestion.helper}
                    </p>
                  </div>
                  <AssessmentWebGlIcon
                    active
                    className="hidden h-14 w-14 sm:block"
                    glyph={activeQuestion.icon}
                    tone={activeQuestion.tone}
                  />
                </div>

                {isContactStep ? (
                  <form
                    noValidate
                    className="sound-results-lead-form mt-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleSendResults();
                    }}
                  >
                    <div className="max-w-3xl">
                      <p className="text-sm font-bold leading-6 text-cyan-50 sm:text-base">
                        Where should we send your results?
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        Enter your email so we can send your copy.
                      </p>
                    </div>

                    <div className="sound-results-field-grid mt-3 grid gap-2.5 sm:grid-cols-2">
                      <TextField
                        label="First name"
                        name="given-name"
                        autoComplete="given-name"
                        value={answers.firstName}
                        onChange={(value) => setAnswer("firstName", value)}
                        placeholder="First name"
                      />
                      <TextField
                        label="Email address"
                        id="sound-lead-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        invalid={Boolean(statusMessage) && !answers.email.trim()}
                        describedBy={statusMessage ? "sound-lead-status" : undefined}
                        value={answers.email}
                        onChange={(value) => setAnswer("email", value)}
                        placeholder="you@example.com"
                      />
                      <TextField
                        label="Phone number"
                        name="tel"
                        type="tel"
                        autoComplete="tel"
                        value={answers.phone}
                        onChange={(value) => setAnswer("phone", value)}
                        placeholder="Phone (optional)"
                      />
                      <TextField
                        label="City / ZIP"
                        name="postal-code"
                        autoComplete="postal-code"
                        value={answers.cityZip}
                        onChange={(value) => setAnswer("cityZip", value)}
                        placeholder="City / ZIP (optional)"
                      />
                    </div>

                    {statusMessage ? (
                      <p
                        id="sound-lead-status"
                        role="alert"
                        className="mt-2 rounded-md border border-amber-200/20 bg-amber-200/10 px-3 py-1.5 text-xs font-bold leading-5 text-amber-100"
                      >
                        {statusMessage}
                      </p>
                    ) : null}

                    <div className="sound-results-action-row mt-2.5 grid gap-3">
                      <div className="sound-results-consent-stack grid gap-2">
                        <label className="sound-results-intro-checkbox flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={answers.introSessionInterest}
                            onChange={(event) => {
                              soundFx.bubble();
                              setAnswer(
                                "introSessionInterest",
                                event.target.checked,
                              );
                            }}
                            className="h-5 w-5 rounded border-white/20 bg-slate-950 accent-cyan-300"
                          />
                          <span>
                            I&apos;m interested in a free in-home intro session.
                          </span>
                        </label>

                        <label className="sound-results-intro-checkbox flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={answers.contactConsent}
                            onChange={(event) => {
                              soundFx.bubble();
                              setAnswer("contactConsent", event.target.checked);
                            }}
                            className="h-5 w-5 rounded border-white/20 bg-slate-950 accent-cyan-300"
                          />
                          <span>
                            I wouldn&apos;t mind occasional Sound Fitness promos
                            and updates.
                          </span>
                        </label>
                      </div>

                      <button
                        type="submit"
                        className="sound-results-send-button inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-6 text-xs font-black uppercase tracking-[0.14em] text-slate-950 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100"
                      >
                        <Mail aria-hidden="true" className="h-4 w-4" />
                        Send My Results
                        <ArrowRight aria-hidden="true" className="h-4 w-4" />
                      </button>

                      <p className="sound-results-reassure text-xs leading-4 text-slate-500">
                        You&apos;ll still see your results right after this.
                      </p>
                    </div>
                  </form>
                ) : (
                  <div
                    className="sound-option-grid mt-6 grid min-h-0 gap-3.5"
                    data-option-count={activeQuestion.options.length}
                  >
                    {activeQuestion.options.map((option) => {
                      const answerValue = answers[activeQuestion.key];
                      const active = Array.isArray(answerValue)
                        ? answerValue.includes(option)
                        : answerValue === option;
                      const isMultiSelectOption = isMultiSelectAnswerKey(
                        activeQuestion.key,
                      );
                      const showOptionPhotos =
                        activeQuestion.key === "trainingStyle" ||
                        activeQuestion.key === "trainingEnvironment" ||
                        activeQuestion.key === "equipment" ||
                        activeQuestion.key === "movementConfidence" ||
                        activeQuestion.key === "limitation";
                      const motionPhase =
                        selectionMotion?.step === step &&
                        selectionMotion.option === option
                          ? selectionMotion.phase
                          : "idle";

                      return (
                        <OptionCard
                          key={option}
                          active={active}
                          disabled={isSelectionLocked}
                          label={option}
                          motionPhase={motionPhase}
                          multiSelect={isMultiSelectOption}
                          onClick={() => handleOptionSelect(option)}
                          showPhoto={showOptionPhotos}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            {stage === "result" ? (
              <div className="flex min-h-0 flex-1 flex-col py-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="sound-question-top-back mb-3 inline-flex min-h-9 w-fit items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.045] px-4 text-[11px] font-black uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5 hover:border-cyan-100/35 hover:text-cyan-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
                >
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                  Back
                </button>
                <div className="sound-result-content min-h-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                    Your starting focus
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <h2 className="max-w-4xl text-2xl font-black uppercase leading-none text-white sm:text-3xl lg:text-4xl">
                      {result.title}
                    </h2>
                    <AssessmentWebGlIcon
                      active
                      className="h-10 w-10 shrink-0 sm:h-14 sm:w-14"
                      glyph={result.icon}
                      tone={result.tone}
                    />
                  </div>
                  <p className="mt-3 max-w-5xl text-sm leading-6 text-slate-300 sm:text-base">
                    {result.body}
                  </p>
                  <div className="mt-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/80">
                      Recommended
                    </p>
                    <div className="sound-reco-grid mt-2 grid grid-cols-3 gap-2">
                      {result.servicePills.map((pill, pillIndex) => {
                        const visual = recoVisuals[pill] ?? defaultRecoVisual;
                        const RecoIcon = visual.Icon;
                        return (
                          <button
                            key={pill}
                            type="button"
                            onClick={() => setActiveReco(pill)}
                            aria-label={`Play ${pill} video`}
                            data-spotlight={
                              pillIndex === spotlightReco ? "true" : undefined
                            }
                            className="sound-reco-card group relative overflow-hidden rounded-lg border border-white/12 p-2.5 text-center transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
                            style={{ "--option-accent": visual.accent } as CSSProperties}
                          >
                            <video
                              aria-hidden="true"
                              className="sound-reco-video"
                              // Playback is driven by the spotlight effect —
                              // only the highlighted card's video runs.
                              muted
                              loop
                              playsInline
                              preload="metadata"
                              poster={visual.photo}
                              ref={(el) => {
                                recoVideoRefs.current[pillIndex] = el;
                              }}
                            >
                              <source
                                src={`/videos/reco-${recoSlug(pill)}.mp4`}
                                type="video/mp4"
                              />
                            </video>
                            <span
                              aria-hidden="true"
                              className="sound-reco-scrim"
                            />
                            <span
                              aria-hidden="true"
                              className="sound-reco-spark sound-reco-spark--one"
                            />
                            <span
                              aria-hidden="true"
                              className="sound-reco-spark sound-reco-spark--two"
                            />
                            <span
                              aria-hidden="true"
                              className="sound-reco-spark sound-reco-spark--three"
                            />
                            <span className="sound-reco-icon relative z-10 mx-auto grid h-7 w-7 place-items-center rounded-md border border-white/25 bg-slate-950/55 text-white [box-shadow:0_2px_10px_rgba(2,7,19,0.75)]">
                              <RecoIcon aria-hidden="true" className="h-3.5 w-3.5" />
                            </span>
                            <p
                              className="sound-reco-label relative z-10 mt-1.5 text-[8.5px] font-black uppercase leading-[1.05] tracking-[0.03em] text-white [text-shadow:0_1px_5px_rgba(2,7,19,0.98)]"
                              ref={(el) => {
                                recoLabelRefs.current[pillIndex] = el;
                              }}
                            >
                              {pill}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {activeReco
                    ? (() => {
                        const rv = recoVisuals[activeReco] ?? defaultRecoVisual;
                        const RecoModalIcon = rv.Icon;
                        const caption =
                          recoCaptions[activeReco] ??
                          `A quick look at your ${activeReco.toLowerCase()} work.`;
                        const recoIndex =
                          result.servicePills.indexOf(activeReco);
                        const prevReco =
                          recoIndex > 0
                            ? result.servicePills[recoIndex - 1]
                            : null;
                        const nextReco =
                          recoIndex >= 0 &&
                          recoIndex < result.servicePills.length - 1
                            ? result.servicePills[recoIndex + 1]
                            : null;
                        return (
                          <div
                            className="sound-reco-modal fixed inset-0 z-[80] flex items-center justify-center p-4"
                            role="dialog"
                            aria-modal="true"
                            aria-label={`${activeReco} video`}
                            onClick={() => setActiveReco(null)}
                          >
                            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
                            <div
                              className="sound-reco-modal-panel relative z-10 aspect-video w-full max-w-lg overflow-hidden rounded-2xl border"
                              style={
                                { "--option-accent": rv.accent } as CSSProperties
                              }
                              onClick={(event) => event.stopPropagation()}
                            >
                              {recoVideoError ? (
                                <div
                                  className="flex h-full w-full flex-col items-center justify-center gap-2 bg-cover bg-center text-center"
                                  style={{
                                    backgroundImage: `linear-gradient(rgba(2,7,19,0.72),rgba(2,7,19,0.82)), url(${rv.photo})`,
                                  }}
                                >
                                  <Video
                                    aria-hidden="true"
                                    className="h-7 w-7 text-[rgb(var(--option-accent))]"
                                  />
                                  <p className="px-4 text-xs font-black uppercase tracking-[0.14em] text-slate-200">
                                    Video coming soon
                                  </p>
                                </div>
                              ) : (
                                <video
                                  key={activeReco}
                                  className="absolute inset-0 h-full w-full object-cover"
                                  autoPlay
                                  muted
                                  loop
                                  playsInline
                                  poster={rv.photo}
                                  onError={() => setRecoVideoError(true)}
                                >
                                  <source
                                    src={`/videos/reco-${recoSlug(activeReco)}.mp4`}
                                    type="video/mp4"
                                  />
                                </video>
                              )}

                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/88 via-slate-950/10 to-slate-950/45"
                              />

                              <span className="sound-reco-modal-icon absolute left-3 top-3 z-10 grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-white">
                                <RecoModalIcon
                                  aria-hidden="true"
                                  className="h-4 w-4"
                                />
                              </span>

                              <div className="sound-reco-modal-copy absolute inset-x-0 bottom-0 min-w-0 px-7 pb-3 sm:px-8 sm:pb-4">
                                <h3 className="sound-reco-modal-title truncate font-black uppercase tracking-tight text-white [text-shadow:0_2px_8px_rgba(2,7,19,0.95)]">
                                  {activeReco}
                                </h3>
                                <p className="sound-reco-modal-caption mt-0.5 text-slate-200 [text-shadow:0_1px_5px_rgba(2,7,19,0.95)]">
                                  {caption}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => setActiveReco(null)}
                                aria-label="Close video"
                                className="absolute right-3 top-3 z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/20 bg-slate-950/55 text-white backdrop-blur transition hover:bg-slate-950/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
                              >
                                <X aria-hidden="true" className="h-4 w-4" />
                              </button>

                              {prevReco ? (
                                <button
                                  type="button"
                                  onClick={() => setActiveReco(prevReco)}
                                  aria-label={`Previous video: ${prevReco}`}
                                  className="sound-reco-modal-arrow absolute left-0 top-1/2 z-10 grid h-14 w-6 shrink-0 -translate-y-1/2 place-items-center text-white/85 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
                                >
                                  <ChevronLeft
                                    aria-hidden="true"
                                    className="h-5 w-5"
                                  />
                                </button>
                              ) : null}

                              {nextReco ? (
                                <button
                                  type="button"
                                  onClick={() => setActiveReco(nextReco)}
                                  aria-label={`Next video: ${nextReco}`}
                                  className="sound-reco-modal-arrow absolute right-0 top-1/2 z-10 grid h-14 w-6 shrink-0 -translate-y-1/2 place-items-center text-white/85 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
                                >
                                  <ChevronRight
                                    aria-hidden="true"
                                    className="h-5 w-5"
                                  />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })()
                    : null}

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-white/12 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.08),transparent_42%),linear-gradient(180deg,rgba(15,23,42,0.55),rgba(2,7,19,0.4))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                      <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                        <CalendarDays
                          aria-hidden="true"
                          className="h-3.5 w-3.5 text-cyan-200/70"
                        />
                        Your setup lane
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {result.setupItems.map(({ Icon, label, value }) => (
                          <span
                            key={label}
                            className="sound-reco-pill inline-flex items-center gap-1.5 rounded-full border border-cyan-200/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-cyan-50"
                          >
                            <Icon
                              aria-hidden="true"
                              className="h-3 w-3 shrink-0 text-cyan-200/80"
                            />
                            <span className="sr-only">{label}: </span>
                            {value}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg border border-white/12 bg-[radial-gradient(circle_at_12%_0%,rgba(250,204,21,0.07),transparent_42%),linear-gradient(180deg,rgba(15,23,42,0.55),rgba(2,7,19,0.4))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                      <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                        <Dumbbell
                          aria-hidden="true"
                          className="h-3.5 w-3.5 text-amber-200/70"
                        />
                        Exercise starting lane
                      </p>
                      <p className="mt-2 text-sm font-bold leading-5 text-slate-200">
                        {result.exerciseFocus}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-cyan-300/25 bg-cyan-400/[0.06] p-3.5">
                    <Mail
                      aria-hidden="true"
                      className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200"
                    />
                    <p className="text-sm leading-6 text-slate-200 [overflow-wrap:anywhere]">
                      Your results have been sent to{" "}
                      {answers.email ? (
                        <span className="font-black text-cyan-100">
                          {answers.email}
                        </span>
                      ) : (
                        "your email"
                      )}
                      .
                    </p>
                  </div>
                </div>

                {statusMessage ? (
                  <p className="mt-4 rounded-lg border border-amber-200/20 bg-amber-200/10 px-4 py-3 text-sm font-bold leading-6 text-amber-100">
                    {statusMessage}
                  </p>
                ) : null}
              </div>
            ) : null}

            {stage === "result" ||
            (stage === "questions" &&
              isMultiSelectAnswerKey(activeQuestion.key)) ? (
              <div
                className={`flex shrink-0 flex-col gap-2 border-t border-white/10 ${
                  stage === "result"
                    ? "mt-3 items-center gap-1.5 pt-3"
                    : "mt-4 pt-4 sm:flex-row sm:items-center sm:justify-between"
                }`}
              >
                {stage === "result" ? (
                  <>
                    <div className="sound-signup-wrap relative inline-flex justify-center">
                      <span
                        aria-hidden="true"
                        className="sound-signup-particles"
                      >
                        {SIGNUP_PARTICLES.map((p, i) => (
                          <span
                            key={i}
                            className="sound-signup-particle"
                            style={
                              {
                                left: p.left,
                                "--s": `${p.size}px`,
                                "--d": `${p.dur}s`,
                                "--delay": `${p.delay}s`,
                                "--drift": `${p.drift}px`,
                                "--rise": `${p.rise}px`,
                              } as CSSProperties
                            }
                          />
                        ))}
                      </span>
                      <button
                        type="button"
                        onClick={handleCreateAccount}
                        className="sound-signup-button relative z-10 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-8 text-xs font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.3)] transition hover:bg-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100"
                      >
                        <BadgeCheck aria-hidden="true" className="h-4 w-4" />
                        Sign Up Now
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex min-h-7 items-center justify-center gap-1.5 rounded-md px-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 transition hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/50"
                    >
                      <RefreshCw aria-hidden="true" className="h-3 w-3" />
                      Start Over
                    </button>
                  </>
                ) : null}

                {stage === "questions" &&
                isMultiSelectAnswerKey(activeQuestion.key) ? (
                    <>
                      <p className="sound-multi-hint self-center text-center text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 sm:self-auto sm:text-left">
                        Select all that apply
                      </p>
                      <button
                        type="button"
                        onClick={handleMultiSelectNext}
                        disabled={answers[activeQuestion.key].length === 0}
                        data-launching={isNextLaunching ? "true" : "false"}
                        className="sound-next-button relative inline-flex min-h-11 w-fit min-w-[10.5rem] items-center justify-center gap-2 self-center rounded-md border border-cyan-100/40 bg-cyan-300 px-6 text-xs font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.22)] transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.06] disabled:text-slate-500 disabled:shadow-none disabled:hover:translate-y-0 sm:self-auto"
                      >
                        Next
                        <ArrowRight aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </>
                  ) : null}
              </div>
            ) : null}
          </section>

          {stage === "result" ? (
            <div
              aria-hidden="true"
              className="sound-confetti pointer-events-none absolute inset-0 z-40 overflow-hidden"
            >
              {CONFETTI_PIECES.map((piece, index) => (
                <span
                  key={index}
                  className="sound-confetti-piece"
                  style={
                    {
                      "--confetti-x": piece.x,
                      "--confetti-delay": piece.delay,
                      "--confetti-duration": piece.duration,
                      "--confetti-rotation": piece.rotation,
                      "--confetti-sway": piece.sway,
                      "--confetti-size": `${piece.size}px`,
                      "--confetti-color": piece.color,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <TrainingPurchaseComingSoonModal
        planId={purchaseComingSoonPlanId}
        onClose={() => setPurchaseComingSoonPlanId(null)}
      />

      <style>{`
        html,
        body {
          overflow: hidden;
        }

        @property --sound-shell-angle {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }

        .sound-onboarding-shell {
          border: 1px solid rgba(226, 232, 240, 0.52);
        }

        .sound-onboarding-shell::before,
        .sound-onboarding-shell::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 30;
          border-radius: inherit;
          padding: 1px;
          pointer-events: none;
          -webkit-mask:
            linear-gradient(#000 0 0) content-box,
            linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
        }

        .sound-assessment-link {
          display: inline-flex;
          isolation: isolate;
          overflow: visible;
        }

        .sound-assessment-link,
        .sound-member-login-link {
          --utility-glow-a: rgba(14, 165, 233, 0.58);
          --utility-glow-b: rgba(37, 99, 235, 0.5);
          --utility-glow-c: rgba(103, 232, 249, 0.54);
          --utility-icon-glow: rgba(186, 230, 253, 0.76);
          --utility-hover-icon-glow: rgba(125, 249, 255, 0.56);
          isolation: isolate;
          overflow: visible;
        }

        .sound-assessment-link {
          --utility-glow-a: rgba(251, 146, 60, 0.64);
          --utility-glow-b: rgba(250, 204, 21, 0.46);
          --utility-glow-c: rgba(255, 237, 213, 0.48);
          --utility-icon-glow: rgba(251, 146, 60, 0.78);
          --utility-hover-icon-glow: rgba(251, 146, 60, 0.62);
        }

        .sound-assessment-short {
          display: none;
        }

        .sound-utility-link-primary-icon,
        .sound-utility-link-copy,
        .sound-assessment-link > :not(.sound-utility-link-hover-icon),
        .sound-member-login-link > :not(.sound-utility-link-hover-icon) {
          position: relative;
          z-index: 2;
        }

        .sound-utility-link-hover-icon {
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 1;
          display: grid;
          height: clamp(2.7rem, 5.4vw, 4.85rem);
          width: min(11.5rem, calc(100% + 2.65rem));
          overflow: hidden;
          place-items: center;
          border-radius: 999px;
          color: rgba(255, 255, 255, 0.98);
          opacity: 0;
          pointer-events: none;
          transform: translate(-50%, -50%) scale(0.66) rotate(-5deg);
          filter:
            blur(0.1px)
            drop-shadow(0 0 0 rgba(255, 255, 255, 0))
            drop-shadow(0 0 0 var(--utility-hover-icon-glow));
          mix-blend-mode: screen;
          -webkit-mask-image: radial-gradient(ellipse at 50% 50%, #000 0%, rgba(0, 0, 0, 0.88) 48%, rgba(0, 0, 0, 0.38) 68%, transparent 84%);
          mask-image: radial-gradient(ellipse at 50% 50%, #000 0%, rgba(0, 0, 0, 0.88) 48%, rgba(0, 0, 0, 0.38) 68%, transparent 84%);
          transition:
            opacity 280ms ease,
            transform 340ms cubic-bezier(0.16, 1, 0.3, 1),
            filter 340ms ease;
        }

        .sound-utility-link-hover-icon svg {
          height: 175%;
          width: 175%;
          stroke-width: 1.65;
          transform: scale(1.08);
        }

        .sound-assessment-kicker {
          color: rgba(224, 242, 254, 0.94);
          text-shadow:
            0 0 14px rgba(125, 249, 255, 0.22),
            0 2px 10px rgba(2, 7, 19, 0.98);
          transition:
            color 260ms ease,
            text-shadow 260ms ease;
        }

        .sound-assessment-action {
          color: rgba(255, 255, 255, 0.98);
          text-shadow:
            0 0 16px rgba(186, 230, 253, 0.26),
            0 2px 12px rgba(2, 7, 19, 0.98);
          transition:
            color 260ms ease,
            text-shadow 260ms ease;
        }

        .sound-assessment-link::before,
        .sound-assessment-link::after,
        .sound-member-login-link::before,
        .sound-member-login-link::after {
          content: "";
          position: absolute;
          inset: -0.5rem -0.8rem;
          z-index: 0;
          border-radius: 999px;
          opacity: 0;
          pointer-events: none;
          transition:
            opacity 260ms ease,
            transform 260ms ease;
        }

        .sound-assessment-link::before,
        .sound-member-login-link::before {
          inset: -1.05rem -1.45rem;
          background:
            radial-gradient(ellipse at 18% 50%, rgba(255, 255, 255, 0.42), transparent 24%),
            radial-gradient(ellipse at 46% 52%, var(--utility-glow-a), transparent 56%),
            radial-gradient(ellipse at 78% 46%, var(--utility-glow-b), transparent 48%),
            linear-gradient(105deg, transparent 12%, var(--utility-glow-a) 34%, var(--utility-glow-b) 58%, var(--utility-glow-c) 76%, transparent 92%);
          background-size: 260% 240%;
          filter: blur(17px) saturate(1.18);
          mix-blend-mode: screen;
          transform: scaleX(0.96) scaleY(0.58);
          -webkit-mask-image: radial-gradient(ellipse at 50% 50%, #000 0%, rgba(0, 0, 0, 0.82) 34%, rgba(0, 0, 0, 0.34) 64%, transparent 88%);
          mask-image: radial-gradient(ellipse at 50% 50%, #000 0%, rgba(0, 0, 0, 0.82) 34%, rgba(0, 0, 0, 0.34) 64%, transparent 88%);
        }

        .sound-assessment-link::after,
        .sound-member-login-link::after {
          inset: -0.72rem -1.05rem;
          background:
            radial-gradient(ellipse at 26% 48%, rgba(255, 255, 255, 0.34), transparent 24%),
            radial-gradient(ellipse at 54% 50%, var(--utility-glow-c), transparent 48%),
            linear-gradient(100deg, transparent 20%, rgba(255, 255, 255, 0.28), var(--utility-glow-a) 54%, transparent 82%);
          background-size: 275% 250%;
          filter: blur(10px) saturate(1.1);
          mix-blend-mode: screen;
          transform: translateX(-0.32rem) scaleX(0.88) scaleY(0.48);
          -webkit-mask-image: radial-gradient(ellipse at 50% 50%, #000 0%, rgba(0, 0, 0, 0.72) 34%, rgba(0, 0, 0, 0.2) 62%, transparent 84%);
          mask-image: radial-gradient(ellipse at 50% 50%, #000 0%, rgba(0, 0, 0, 0.72) 34%, rgba(0, 0, 0, 0.2) 62%, transparent 84%);
        }

        .sound-assessment-link:hover::before,
        .sound-assessment-link:focus-visible::before,
        .sound-member-login-link:hover::before,
        .sound-member-login-link:focus-visible::before {
          opacity: 0.68;
          transform: scaleX(1.14) scaleY(0.92);
          animation: soundMemberLoginHighlight 3.6s ease-in-out infinite;
        }

        .sound-assessment-link:hover::after,
        .sound-assessment-link:focus-visible::after,
        .sound-member-login-link:hover::after,
        .sound-member-login-link:focus-visible::after {
          opacity: 0.52;
          transform: translateX(0) scaleX(1.08) scaleY(0.74);
          animation: soundMemberLoginHighlight 3.6s ease-in-out infinite reverse;
        }

        .sound-assessment-link:hover,
        .sound-assessment-link:focus-visible,
        .sound-member-login-link:hover,
        .sound-member-login-link:focus-visible {
          outline: none;
          text-shadow:
            0 0 12px var(--utility-icon-glow),
            0 2px 12px rgba(2, 7, 19, 0.95);
        }

        .sound-assessment-link:hover .sound-utility-link-hover-icon,
        .sound-assessment-link:focus-visible .sound-utility-link-hover-icon,
        .sound-member-login-link:hover .sound-utility-link-hover-icon,
        .sound-member-login-link:focus-visible .sound-utility-link-hover-icon {
          opacity: 0.56;
          transform: translate(-50%, -50%) scale(1.06) rotate(0deg);
          filter:
            blur(0)
            drop-shadow(0 0 14px rgba(255, 255, 255, 0.48))
            drop-shadow(0 0 30px var(--utility-hover-icon-glow));
        }

        .sound-assessment-link:hover .sound-assessment-kicker,
        .sound-assessment-link:focus-visible .sound-assessment-kicker {
          color: #fff7ed;
          text-shadow:
            0 0 16px rgba(251, 146, 60, 0.74),
            0 0 28px rgba(250, 204, 21, 0.34),
            0 2px 12px rgba(2, 7, 19, 0.98);
        }

        .sound-assessment-link:hover .sound-assessment-action,
        .sound-assessment-link:focus-visible .sound-assessment-action {
          color: #ffffff;
          text-shadow:
            0 0 18px rgba(255, 237, 213, 0.78),
            0 0 28px rgba(251, 146, 60, 0.4),
            0 2px 12px rgba(2, 7, 19, 0.98);
        }

        .sound-assessment-link:hover svg,
        .sound-assessment-link:focus-visible svg,
        .sound-member-login-link:hover svg,
        .sound-member-login-link:focus-visible svg {
          color: white;
          filter: drop-shadow(0 0 8px var(--utility-icon-glow));
        }

        .sound-question-panel[data-panel-stage="result"] {
          padding-top: 5rem;
        }

        @media (max-width: 820px) {
          main[data-onboarding-stage="welcome"] .sound-assessment-link {
            max-width: 11.25rem;
            gap: 0.42rem;
            font-size: 0.48rem;
            letter-spacing: 0.085em;
            line-height: 1.15;
          }

          main[data-onboarding-stage="welcome"] .sound-assessment-long {
            display: none;
          }

          main[data-onboarding-stage="welcome"] .sound-assessment-short {
            display: inline;
          }
        }

        @media (max-width: 700px) {
          main[data-onboarding-stage="welcome"] .sound-assessment-link {
            left: 0.95rem;
            top: 0.95rem;
            display: inline-flex;
            max-width: 8.9rem;
            gap: 0.35rem;
            font-size: 0.43rem;
            letter-spacing: 0.07em;
            line-height: 1.12;
          }
        }

        @media (min-width: 640px) {
          .sound-question-panel[data-panel-stage="result"] {
            padding-top: 5rem;
          }
        }

        @media (max-width: 1100px) {
          main[data-onboarding-stage="questions"] .sound-assessment-link,
          main[data-onboarding-stage="result"] .sound-assessment-link {
            left: 50%;
            right: auto;
            top: 5.15rem;
            display: inline-flex;
            max-width: min(31rem, calc(100% - 2rem));
            transform: translateX(-50%);
            justify-content: center;
            text-align: center;
          }

          main[data-onboarding-stage="questions"] .sound-member-login-link,
          main[data-onboarding-stage="result"] .sound-member-login-link {
            left: 50%;
            right: auto;
            top: 8.95rem;
            max-width: calc(100% - 2rem);
            transform: translateX(-50%);
            text-align: center;
            white-space: nowrap;
          }

          main[data-onboarding-stage="questions"] .sound-question-logo,
          main[data-onboarding-stage="result"] .sound-question-logo {
            top: 1rem;
            z-index: 42;
          }

          main[data-onboarding-stage="questions"] .sound-question-logo-stage,
          main[data-onboarding-stage="result"] .sound-question-logo-stage {
            height: 3.55rem;
            width: 3.55rem;
          }

          main[data-onboarding-stage="questions"] .sound-question-logo-mark,
          main[data-onboarding-stage="result"] .sound-question-logo-mark {
            height: 2.65rem;
            width: 2.65rem;
          }

          main[data-onboarding-stage="questions"] .sound-question-panel,
          main[data-onboarding-stage="result"] .sound-question-panel,
          main[data-onboarding-stage="result"] .sound-question-panel[data-panel-stage="result"] {
            padding-top: 12.2rem;
          }

          main[data-onboarding-stage="questions"] .sound-progress-path,
          main[data-onboarding-stage="result"] .sound-progress-path {
            margin-top: 0;
          }
        }

        @media (max-width: 640px) {
          main[data-onboarding-stage="questions"] .sound-assessment-link,
          main[data-onboarding-stage="result"] .sound-assessment-link {
            top: 4.95rem;
            max-width: calc(100% - 1.5rem);
            gap: 0.42rem;
            font-size: 0.48rem;
            letter-spacing: 0.075em;
            line-height: 1.15;
          }

          main[data-onboarding-stage="questions"] .sound-question-logo,
          main[data-onboarding-stage="result"] .sound-question-logo {
            top: 0.85rem;
          }

          main[data-onboarding-stage="questions"] .sound-member-login-link,
          main[data-onboarding-stage="result"] .sound-member-login-link {
            top: 8.65rem;
            font-size: 0.52rem;
            letter-spacing: 0.08em;
          }

          main[data-onboarding-stage="questions"] .sound-question-panel,
          main[data-onboarding-stage="result"] .sound-question-panel,
          main[data-onboarding-stage="result"] .sound-question-panel[data-panel-stage="result"] {
            padding-top: 11.9rem;
          }
        }

        .sound-onboarding-shell::before {
          background: conic-gradient(
            from var(--sound-shell-angle),
            rgba(125, 249, 255, 0.98) 0deg,
            rgba(255, 255, 255, 0.72) 17deg,
            rgba(56, 189, 248, 0.2) 36deg,
            transparent 62deg,
            transparent 138deg,
            rgba(250, 204, 21, 0.7) 164deg,
            rgba(255, 255, 255, 0.62) 178deg,
            transparent 214deg,
            transparent 288deg,
            rgba(34, 211, 238, 0.58) 318deg,
            rgba(125, 249, 255, 0.98) 360deg
          );
          filter: drop-shadow(0 0 12px rgba(34, 211, 238, 0.45))
            drop-shadow(0 0 22px rgba(250, 204, 21, 0.18));
          opacity: 0.92;
          animation: soundShellBorderSweep 10.5s linear infinite;
        }

        .sound-onboarding-shell::after {
          inset: 1px;
          z-index: 31;
          background:
            linear-gradient(90deg, rgba(255, 255, 255, 0.84), transparent 12% 88%, rgba(125, 249, 255, 0.76)),
            linear-gradient(180deg, rgba(125, 249, 255, 0.82), transparent 18% 82%, rgba(250, 204, 21, 0.54));
          opacity: 0.46;
          animation: soundShellBorderBreath 5.8s ease-in-out infinite;
        }

        .sound-progress-path {
          position: relative;
          display: grid;
          grid-template-columns: repeat(13, minmax(0, 1fr));
          align-items: center;
          gap: clamp(0.16rem, 0.7vw, 0.48rem);
          border-radius: 999px;
          padding: 0.38rem 0.28rem;
          background:
            radial-gradient(circle at 10% 50%, rgba(34, 211, 238, 0.1), transparent 28%),
            radial-gradient(circle at 90% 50%, rgba(250, 204, 21, 0.08), transparent 28%),
            linear-gradient(90deg, rgba(2, 7, 19, 0.42), rgba(15, 23, 42, 0.2), rgba(2, 7, 19, 0.42));
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            inset 0 0 28px rgba(2, 7, 19, 0.42);
        }

        .sound-progress-path::before {
          content: "";
          position: absolute;
          left: 1.4rem;
          right: 1.4rem;
          top: 50%;
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(
            90deg,
            rgba(15, 23, 42, 0.2),
            rgba(71, 85, 105, 0.34),
            rgba(15, 23, 42, 0.2)
          );
          transform: translateY(-50%);
        }

        .sound-progress-node {
          position: relative;
          z-index: 1;
          display: grid;
          height: clamp(1.62rem, 2.4vw, 2.18rem);
          width: clamp(1.62rem, 2.4vw, 2.18rem);
          place-items: center;
          justify-self: center;
          border-radius: 999px;
          color: rgba(148, 163, 184, 0.5);
          background:
            radial-gradient(circle at 35% 28%, rgba(255, 255, 255, 0.14), transparent 26%),
            linear-gradient(145deg, rgba(15, 23, 42, 0.94), rgba(2, 7, 19, 0.76));
          border: 1px solid rgba(148, 163, 184, 0.16);
          box-shadow:
            0 5px 16px rgba(0, 0, 0, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          filter: grayscale(0.45) brightness(0.72);
          transition:
            background 360ms ease,
            border-color 360ms ease,
            box-shadow 360ms ease,
            color 360ms ease,
            filter 360ms ease,
            transform 360ms ease;
        }

        .sound-progress-node svg {
          position: relative;
          z-index: 3;
          stroke-width: 2.55;
        }

        .sound-progress-node[data-active="true"] {
          color: #bae6fd;
          border-color: rgba(34, 211, 238, 0.48);
          filter: none;
          transform: translateY(-1px);
          box-shadow:
            0 0 0 1px rgba(34, 211, 238, 0.1),
            0 0 18px rgba(34, 211, 238, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.14);
        }

        ${completedProgressNodeSelector},
        .sound-progress-node[data-answered="true"],
        .sound-progress-node[data-active="true"] {
          color: #ecfeff;
          border-color: rgba(125, 249, 255, 0.78);
          background:
            radial-gradient(circle at 34% 24%, rgba(255, 255, 255, 0.54), transparent 24%),
            radial-gradient(circle at 62% 68%, rgba(34, 211, 238, 0.38), transparent 42%),
            linear-gradient(145deg, rgba(14, 165, 233, 0.68), rgba(8, 47, 73, 0.88));
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.12),
            0 0 22px rgba(34, 211, 238, 0.28),
            0 8px 24px rgba(14, 165, 233, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.36),
            inset 0 -12px 18px rgba(2, 7, 19, 0.2);
          filter: none;
          animation: soundProgressNodeGlow 4.4s ease-in-out infinite;
        }

        ${completedProgressBeforeSelector},
        ${completedProgressAfterSelector},
        .sound-progress-node[data-answered="true"]::before,
        .sound-progress-node[data-answered="true"]::after,
        .sound-progress-node[data-active="true"]::before,
        .sound-progress-node[data-active="true"]::after,
        .sound-progress-path[data-progress-result="true"] .sound-progress-node--prize::before,
        .sound-progress-path[data-progress-result="true"] .sound-progress-node--prize::after {
          content: "";
          position: absolute;
          border-radius: inherit;
          pointer-events: none;
        }

        ${completedProgressBeforeSelector},
        .sound-progress-node[data-answered="true"]::before,
        .sound-progress-node[data-active="true"]::before,
        .sound-progress-path[data-progress-result="true"] .sound-progress-node--prize::before {
          inset: -0.38rem;
          z-index: -1;
          background: radial-gradient(circle, rgba(34, 211, 238, 0.22), transparent 66%);
          opacity: 0.74;
          animation: soundProgressAura 3.6s ease-in-out infinite;
        }

        ${completedProgressAfterSelector},
        .sound-progress-node[data-answered="true"]::after,
        .sound-progress-node[data-active="true"]::after,
        .sound-progress-path[data-progress-result="true"] .sound-progress-node--prize::after {
          inset: -0.12rem;
          z-index: 2;
          border: 1px solid rgba(207, 250, 254, 0.72);
          border-top-color: rgba(250, 204, 21, 0.62);
          border-left-color: rgba(255, 255, 255, 0.2);
          opacity: 0.82;
          animation: soundProgressRing 5.8s linear infinite;
        }

        .sound-progress-node--prize {
          height: clamp(1.88rem, 2.9vw, 2.6rem);
          width: clamp(1.88rem, 2.9vw, 2.6rem);
          color: rgba(250, 204, 21, 0.45);
          border-color: rgba(250, 204, 21, 0.2);
          background:
            radial-gradient(circle at 35% 28%, rgba(255, 255, 255, 0.12), transparent 26%),
            linear-gradient(145deg, rgba(30, 41, 59, 0.72), rgba(2, 7, 19, 0.82));
        }

        .sound-progress-node--prize[data-answered="true"],
        .sound-progress-path[data-progress-result="true"] .sound-progress-node--prize {
          color: #fff7ad;
          border-color: rgba(254, 240, 138, 0.88);
          background:
            radial-gradient(circle at 32% 24%, rgba(255, 255, 255, 0.66), transparent 21%),
            radial-gradient(circle at 56% 62%, rgba(251, 146, 60, 0.44), transparent 44%),
            linear-gradient(145deg, rgba(250, 204, 21, 0.84), rgba(14, 165, 233, 0.62));
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.16),
            0 0 28px rgba(250, 204, 21, 0.38),
            0 0 42px rgba(34, 211, 238, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.42),
            inset 0 -14px 20px rgba(154, 52, 18, 0.14);
          animation: soundPrizeGlow 3.2s ease-in-out infinite;
        }

        .sound-progress-spark {
          position: absolute;
          z-index: 4;
          height: 0.28rem;
          width: 0.28rem;
          border-radius: 999px;
          background: #ffffff;
          box-shadow:
            0 0 8px rgba(255, 255, 255, 0.9),
            0 0 16px rgba(125, 249, 255, 0.66);
          opacity: 0;
          pointer-events: none;
        }

        .sound-progress-spark--one {
          right: 11%;
          top: 4%;
        }

        .sound-progress-spark--two {
          bottom: 7%;
          left: 15%;
          animation-delay: 1.45s;
        }

        ${completedProgressSparkSelector},
        .sound-progress-node[data-answered="true"] .sound-progress-spark,
        .sound-progress-node[data-active="true"] .sound-progress-spark,
        .sound-progress-path[data-progress-result="true"] .sound-progress-node--prize .sound-progress-spark {
          animation: soundProgressSparkle 3.8s ease-in-out infinite;
        }

        .sound-progress-node--prize[data-answered="true"] .sound-progress-spark,
        .sound-progress-path[data-progress-result="true"] .sound-progress-node--prize .sound-progress-spark {
          background: #fef08a;
          box-shadow:
            0 0 10px rgba(254, 240, 138, 0.96),
            0 0 20px rgba(251, 146, 60, 0.7);
          animation-duration: 2.65s;
        }

        .sound-question-page {
          animation: soundQuestionPageIn 260ms cubic-bezier(0.2, 0.82, 0.18, 1) both;
          transform-origin: 50% 24%;
          transition:
            opacity 260ms cubic-bezier(0.2, 0.82, 0.18, 1),
            filter 260ms cubic-bezier(0.2, 0.82, 0.18, 1),
            transform 260ms cubic-bezier(0.2, 0.82, 0.18, 1);
        }

        .sound-question-page[data-transition-phase="fade"] {
          opacity: 0;
          filter: blur(8px) brightness(0.82);
          pointer-events: none;
          transform: translateY(0.85rem) scale(0.982);
        }

        .sound-question-top-back {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          border-radius: 0.16rem;
          background:
            radial-gradient(circle at 18% 16%, rgba(103, 232, 249, 0.18), transparent 34%),
            linear-gradient(135deg, rgba(255, 255, 255, 0.065), rgba(15, 23, 42, 0.52));
          box-shadow:
            0 10px 24px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .sound-question-top-back::before {
          content: "";
          position: absolute;
          inset: -45%;
          z-index: -1;
          background: conic-gradient(
            from 120deg,
            transparent,
            rgba(34, 211, 238, 0.28),
            transparent 34%,
            rgba(250, 204, 21, 0.16),
            transparent 68%
          );
          opacity: 0;
          filter: blur(16px);
          transition: opacity 220ms ease;
        }

        .sound-question-top-back:hover::before,
        .sound-question-top-back:focus-visible::before {
          opacity: 1;
        }

        .sound-question-panel[data-contact-step="true"] .sound-question-page {
          justify-content: start;
          padding-bottom: 0;
        }

        .sound-results-lead-form {
          position: relative;
          max-width: none;
          display: block;
        }

        .sound-results-lead-form label:not(.sound-results-intro-checkbox) input {
          border-radius: 0.16rem;
          border-color: rgba(148, 163, 184, 0.22);
          background: rgba(2, 7, 19, 0.68);
          margin-top: 0.35rem;
          padding-top: 0.54rem;
          padding-bottom: 0.54rem;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.06),
            0 8px 20px rgba(0, 0, 0, 0.16);
        }

        .sound-results-lead-form label:not(.sound-results-intro-checkbox) span {
          font-size: 0.58rem;
          letter-spacing: 0.14em;
        }

        .sound-results-lead-form label:not(.sound-results-intro-checkbox) input:focus {
          border-color: rgba(103, 232, 249, 0.72);
          box-shadow:
            0 0 0 1px rgba(103, 232, 249, 0.2),
            0 0 24px rgba(34, 211, 238, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .sound-results-intro-checkbox {
          min-height: 2.34rem;
          border-radius: 0.16rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background:
            radial-gradient(circle at 12% 18%, rgba(34, 211, 238, 0.12), transparent 34%),
            rgba(15, 23, 42, 0.36);
          padding: 0.44rem 0.72rem;
          font-size: 0.76rem;
          font-weight: 800;
          line-height: 1.08rem;
          color: rgba(226, 232, 240, 0.94);
        }

        .sound-results-consent-stack {
          align-self: stretch;
        }

        .sound-results-send-button {
          position: relative;
          overflow: hidden;
          justify-self: start;
          min-height: 2.72rem;
          border: 1px solid rgba(207, 250, 254, 0.76);
          background:
            radial-gradient(circle at 14% 16%, rgba(255, 255, 255, 0.86), transparent 10%),
            linear-gradient(112deg, #67e8f9 0%, #22d3ee 34%, #38bdf8 56%, #fb923c 86%, #facc15 100%);
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.18),
            0 0 32px rgba(34, 211, 238, 0.28),
            0 14px 34px rgba(8, 47, 73, 0.32),
            inset 0 1px 0 rgba(255, 255, 255, 0.62);
        }

        .sound-results-send-button:hover {
          transform: translateY(-2px);
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.28),
            0 0 38px rgba(34, 211, 238, 0.38),
            0 18px 40px rgba(8, 47, 73, 0.36),
            inset 0 1px 0 rgba(255, 255, 255, 0.7);
        }

        @media (max-width: 640px) {
          .sound-results-action-row {
            grid-template-columns: 1fr;
          }
        }

        @media (max-height: 900px) {
          .sound-question-panel[data-contact-step="true"] {
            padding-top: 5.45rem;
            padding-bottom: 1.15rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-progress-path {
            padding-block: 0.3rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-question-top-back {
            margin-bottom: 0.7rem;
            min-height: 2.2rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-question-page > .flex.items-start:first-child p.mt-3 {
            margin-top: 0.42rem;
            line-height: 1.25rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-question-page > .flex.items-start:first-child h2 {
            margin-top: 0.5rem;
            font-size: clamp(1.65rem, 3vw, 2.35rem);
          }

          .sound-results-field-grid {
            margin-top: 0.68rem;
            gap: 0.46rem;
          }

          .sound-results-lead-form label:not(.sound-results-intro-checkbox) input {
            padding-top: 0.48rem;
            padding-bottom: 0.48rem;
          }

          .sound-results-intro-checkbox {
            min-height: 2.14rem;
            padding-block: 0.36rem;
          }

          .sound-results-send-button {
            min-height: 2.48rem;
          }
        }

        .sound-option-grid {
          align-content: start;
          grid-template-columns: repeat(2, minmax(0, 12.25rem));
          justify-content: center;
        }

        @media (min-width: 760px) {
          .sound-option-grid {
            grid-template-columns: repeat(3, minmax(0, 13.2rem));
          }
        }

        @media (min-width: 1180px) and (min-height: 840px) {
          .sound-option-grid {
            grid-template-columns: repeat(3, minmax(0, 13.9rem));
          }
        }

        .sound-option-card {
          --option-accent: 34 211 238;
          aspect-ratio: 1 / 1;
          isolation: isolate;
          min-height: 0;
          border-radius: 0.14rem;
          background:
            radial-gradient(circle at 50% 18%, rgb(var(--option-accent) / 0.2), transparent 34%),
            linear-gradient(135deg, rgb(var(--option-accent) / 0.09), rgba(255, 255, 255, 0.04) 46%, rgba(2, 7, 19, 0.26));
          border-color: rgb(var(--option-accent) / 0.22);
          box-shadow:
            0 14px 36px rgba(0, 0, 0, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .sound-option-grid[data-option-count="9"] {
          align-content: start;
          grid-template-columns: repeat(3, minmax(0, 10.25rem));
          justify-content: center;
          gap: 0.72rem;
          margin-top: 1.05rem;
        }

        .sound-option-grid[data-option-count="9"] .sound-option-card {
          aspect-ratio: 1 / 1;
          min-height: 0;
          padding: 0.72rem;
        }

        .sound-option-grid[data-option-count="9"] .sound-option-icon-shell {
          height: 2.65rem;
          width: 2.65rem;
          border-radius: 0.26rem;
        }

        .sound-option-grid[data-option-count="9"] .sound-option-icon-shell svg {
          height: 1.28rem;
          width: 1.28rem;
        }

        .sound-option-grid[data-option-count="9"] .sound-option-label {
          margin-top: 0.36rem;
          font-size: 0.72rem;
          line-height: 0.82rem;
        }

        @media (min-width: 720px) and (max-width: 1023px) {
          .sound-option-grid[data-option-count="9"] {
            grid-template-columns: repeat(3, minmax(0, 9.45rem));
          }
        }

        @media (max-width: 1100px), (max-height: 900px) {
          .sound-option-grid[data-option-count="9"] {
            gap: 0.55rem;
            margin-top: 0.9rem;
            grid-template-columns: repeat(3, minmax(0, 9rem));
          }

          .sound-option-grid[data-option-count="9"] .sound-option-card {
            aspect-ratio: 1 / 0.92;
            min-height: 0;
            padding: 0.55rem 0.62rem;
          }

          .sound-option-grid[data-option-count="9"] .sound-option-icon-shell {
            height: 2.25rem;
            width: 2.25rem;
          }

          .sound-option-grid[data-option-count="9"] .sound-option-icon-shell svg {
            height: 1.08rem;
            width: 1.08rem;
          }

          .sound-option-grid[data-option-count="9"] .sound-option-label {
            margin-top: 0.28rem;
            font-size: 0.68rem;
            line-height: 0.76rem;
          }
        }

        @media (max-width: 520px) {
          .sound-option-grid,
          .sound-option-grid[data-option-count="9"] {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .sound-option-card,
          .sound-option-grid[data-option-count="9"] .sound-option-card {
            aspect-ratio: 1 / 0.9;
            padding: 0.75rem;
          }
        }

        .sound-option-card::before,
        .sound-option-card::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
        }

        .sound-option-card::before {
          z-index: 1;
          background:
            radial-gradient(circle at 50% 32%, rgb(var(--option-accent) / 0.28), transparent 34%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 42%);
          opacity: 0;
          transition: opacity 220ms ease;
        }

        .sound-option-card::after {
          z-index: 2;
          border: 1px solid rgb(var(--option-accent) / 0.12);
          box-shadow: inset 0 0 34px rgb(var(--option-accent) / 0.08);
          opacity: 0.7;
        }

        .sound-option-photo {
          position: absolute;
          inset: 0;
          z-index: 0;
          border-radius: inherit;
          background-repeat: no-repeat;
          background-size: cover;
          filter: saturate(1.18) contrast(1.12) brightness(0.5);
          opacity: 0.4;
          pointer-events: none;
          transform: scale(1.04);
          transition:
            opacity 260ms ease,
            filter 260ms ease,
            transform 260ms ease;
        }

        .sound-option-card:disabled {
          cursor: default;
        }

        .sound-option-card:hover {
          border-color: rgb(var(--option-accent) / 0.48);
          box-shadow:
            0 18px 42px rgba(0, 0, 0, 0.28),
            0 0 26px rgb(var(--option-accent) / 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }

        .sound-option-card:hover::before,
        .sound-option-card[data-active="true"]::before {
          opacity: 1;
        }

        .sound-option-card:hover .sound-option-photo,
        .sound-option-card[data-active="true"] .sound-option-photo {
          filter: saturate(1.26) contrast(1.16) brightness(0.66);
          opacity: 0.58;
          transform: scale(1.08);
        }

        .sound-option-card[data-selected="true"] {
          z-index: 20;
          transform: translateY(-0.2rem) scale(1.06);
          border-color: rgb(var(--option-accent) / 0.98);
          background:
            radial-gradient(circle at 50% 18%, rgb(var(--option-accent) / 0.58), transparent 40%),
            radial-gradient(circle at 50% 104%, rgb(var(--option-accent) / 0.22), transparent 54%),
            linear-gradient(135deg, rgb(var(--option-accent) / 0.24), rgba(255, 255, 255, 0.09) 46%, rgba(2, 7, 19, 0.14));
          box-shadow:
            0 0 0 2px rgb(var(--option-accent) / 0.72),
            0 0 28px rgb(var(--option-accent) / 0.58),
            0 0 74px rgb(var(--option-accent) / 0.34),
            0 24px 54px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.28),
            inset 0 0 46px rgb(var(--option-accent) / 0.18);
        }

        .sound-option-card[data-selected="true"]:hover {
          transform: translateY(-0.26rem) scale(1.075);
        }

        .sound-option-card[data-selected="true"]::before {
          opacity: 1;
          background:
            radial-gradient(circle at 50% 28%, rgba(255, 255, 255, 0.26), transparent 20%),
            radial-gradient(circle at 50% 36%, rgb(var(--option-accent) / 0.62), transparent 43%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.16), transparent 48%);
        }

        .sound-option-card[data-selected="true"]::after {
          border-color: rgb(var(--option-accent) / 0.58);
          box-shadow:
            inset 0 0 52px rgb(var(--option-accent) / 0.22),
            inset 0 0 0 1px rgba(255, 255, 255, 0.12);
          opacity: 1;
        }

        .sound-option-card[data-selected="true"] .sound-option-photo {
          filter: saturate(1.48) contrast(1.22) brightness(0.82);
          opacity: 0.74;
          transform: scale(1.11);
        }

        .sound-option-card[data-selected="true"] .sound-option-icon-shell {
          color: #ffffff;
          transform: translateY(-3px) scale(1.18);
          border-color: rgb(var(--option-accent) / 0.95);
          box-shadow:
            0 0 18px rgba(255, 255, 255, 0.42),
            0 0 46px rgb(var(--option-accent) / 0.72),
            0 14px 32px rgba(0, 0, 0, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.42),
            inset 0 -18px 30px rgb(var(--option-accent) / 0.24);
        }

        .sound-option-card[data-selected="true"] .sound-option-icon-shell svg {
          filter:
            drop-shadow(0 0 9px rgba(255, 255, 255, 0.82))
            drop-shadow(0 0 18px rgb(var(--option-accent) / 0.88));
        }

        .sound-option-card[data-selected="true"] .sound-option-label {
          color: #ffffff;
          text-shadow:
            0 0 12px rgb(var(--option-accent) / 0.96),
            0 2px 16px rgba(0, 0, 0, 0.88);
        }

        .sound-option-card[data-active="true"] {
          border-color: rgb(var(--option-accent) / 0.78);
          background:
            radial-gradient(circle at 50% 16%, rgb(var(--option-accent) / 0.34), transparent 38%),
            linear-gradient(135deg, rgb(var(--option-accent) / 0.19), rgba(255, 255, 255, 0.05) 46%, rgba(2, 7, 19, 0.18));
          box-shadow:
            0 0 0 1px rgb(var(--option-accent) / 0.18),
            0 0 32px rgb(var(--option-accent) / 0.24),
            0 18px 48px rgba(0, 0, 0, 0.32),
            inset 0 1px 0 rgba(255, 255, 255, 0.16);
        }

        .sound-option-card[data-selection-motion="flicker"] {
          animation: soundOptionSelectionFlicker 900ms linear both;
        }

        .sound-option-card[data-selection-motion="flicker"] .sound-option-photo {
          animation: soundOptionPhotoFlicker 900ms linear both;
        }

        .sound-option-card[data-selection-motion="flicker"]::before {
          opacity: 1;
          animation: soundOptionSelectionCore 900ms linear both;
        }

        .sound-option-card[data-selection-motion="flicker"]::after {
          opacity: 1;
          animation: soundOptionSelectionSweep 900ms ease-in-out both;
        }

        .sound-option-card[data-selection-motion="flicker"] .sound-option-icon-shell {
          animation: soundOptionIconSelect 900ms cubic-bezier(0.2, 0.82, 0.18, 1) both;
        }

        .sound-option-card[data-selection-motion="fade"] {
          animation: soundOptionSelectionCommit 260ms cubic-bezier(0.2, 0.82, 0.18, 1) both;
        }

        .sound-option-selection-spark {
          --spark-left: 50%;
          --spark-top: 50%;
          --spark-delay: 0ms;
          position: absolute;
          left: var(--spark-left);
          top: var(--spark-top);
          z-index: 12;
          height: 0.48rem;
          width: 0.48rem;
          border-radius: 999px;
          background: radial-gradient(circle, #ffffff 0 22%, rgb(var(--option-accent)) 46%, transparent 74%);
          filter: drop-shadow(0 0 10px rgb(var(--option-accent) / 0.82));
          opacity: 0;
          pointer-events: none;
          transform: translate(-50%, -50%) scale(0.18) rotate(0deg);
        }

        .sound-option-selection-spark::before,
        .sound-option-selection-spark::after {
          content: "";
          position: absolute;
          inset: 47% -160%;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.92), transparent);
        }

        .sound-option-selection-spark::after {
          transform: rotate(90deg);
        }

        .sound-option-selection-spark--one {
          --spark-left: 19%;
          --spark-top: 21%;
          --spark-delay: 120ms;
        }

        .sound-option-selection-spark--two {
          --spark-left: 82%;
          --spark-top: 32%;
          --spark-delay: 520ms;
          height: 0.38rem;
          width: 0.38rem;
        }

        .sound-option-card[data-selection-motion="flicker"] .sound-option-selection-spark {
          animation: soundOptionSelectionSpark 900ms ease-out both;
          animation-delay: var(--spark-delay);
        }

        .sound-option-card[data-selection-motion="multi-check"] {
          animation: soundOptionMultiSelectSettle 620ms cubic-bezier(0.2, 0.78, 0.16, 1) both;
        }

        .sound-option-card[data-selection-motion="multi-check"] .sound-option-photo {
          animation: soundOptionMultiPhotoSettle 620ms cubic-bezier(0.2, 0.78, 0.16, 1) both;
        }

        .sound-option-card[data-selection-motion="multi-check"]::before {
          opacity: 1;
          animation: soundOptionMultiCoreSettle 620ms cubic-bezier(0.2, 0.78, 0.16, 1) both;
        }

        .sound-option-card[data-selection-motion="multi-check"]::after {
          opacity: 1;
          animation: soundOptionMultiEdgeSettle 620ms cubic-bezier(0.2, 0.78, 0.16, 1) both;
        }

        .sound-option-card[data-selection-motion="multi-check"] .sound-option-icon-shell {
          animation: soundOptionMultiIconSettle 620ms cubic-bezier(0.2, 0.78, 0.16, 1) both;
        }

        .sound-option-card[data-selection-motion="multi-check"] .sound-option-selection-spark {
          animation: soundOptionMultiSelectionSpark 620ms ease-out both;
          animation-delay: var(--spark-delay);
        }

        .sound-option-icon-shell {
          position: relative;
          z-index: 10;
          display: grid;
          height: 4.1rem;
          width: 4.1rem;
          place-items: center;
          border-radius: 0.28rem;
          color: rgb(var(--option-accent));
          background:
            radial-gradient(circle at 34% 24%, rgba(255, 255, 255, 0.42), transparent 24%),
            linear-gradient(145deg, rgb(var(--option-accent) / 0.24), rgba(2, 7, 19, 0.5));
          border: 1px solid rgb(var(--option-accent) / 0.4);
          box-shadow:
            0 0 24px rgb(var(--option-accent) / 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.22),
            inset 0 -18px 30px rgba(2, 7, 19, 0.2);
          transition:
            transform 220ms ease,
            box-shadow 220ms ease,
            color 220ms ease,
            border-color 220ms ease;
        }

        .sound-option-icon-shell svg {
          filter: drop-shadow(0 0 8px rgb(var(--option-accent) / 0.42));
        }

        .sound-option-label {
          text-shadow: 0 2px 14px rgba(0, 0, 0, 0.74);
        }

        /* Never split a reco label mid-word — it wraps between words only.
           If a word still can't fit the card, the fit pass marks the label and
           it drops out entirely, leaving the icon to speak for the card. */
        .sound-reco-label {
          overflow-wrap: normal;
          word-break: keep-all;
        }

        .sound-reco-label[data-fits="false"] {
          display: none;
        }

        /* Keep every word on a single row. A word caps its own size at the
           width it can actually occupy — the card's content box (100cqw, safe
           to query because the card is container-type: size) divided by its
           character count times an approximate average glyph advance for this
           weight. min(1em, …) means the cap only ever bites on a word that
           would otherwise be too wide: 1em is whatever font-size the label
           already resolved to at this breakpoint, so short words are untouched
           and only the long one shrinks. */
        .sound-option-word {
          display: inline-block;
          white-space: nowrap;
          overflow-wrap: normal;
          word-break: keep-all;
          font-size: min(
            1em,
            max(0.5em, calc(100cqw / var(--word-chars, 8) / 0.68))
          );
        }

        .sound-option-card[data-active="true"] .sound-option-icon-shell {
          color: #ffffff;
          transform: translateY(-1px) scale(1.08);
          border-color: rgb(var(--option-accent) / 0.78);
          box-shadow:
            0 0 34px rgb(var(--option-accent) / 0.38),
            0 12px 28px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.28),
            inset 0 -18px 30px rgb(var(--option-accent) / 0.16);
        }

        .sound-option-card[data-active="true"] .sound-option-icon-shell svg {
          filter: drop-shadow(0 0 12px rgb(var(--option-accent) / 0.72));
        }

        @media (max-width: 1100px) {
          main[data-onboarding-stage="questions"] .sound-question-logo {
            top: 0.65rem;
          }

          main[data-onboarding-stage="questions"] .sound-question-logo-stage {
            height: 3.1rem;
            width: 3.1rem;
          }

          main[data-onboarding-stage="questions"] .sound-question-logo-mark {
            height: 2.32rem;
            width: 2.32rem;
          }

          main[data-onboarding-stage="questions"] .sound-assessment-link {
            top: 4.15rem;
          }

          main[data-onboarding-stage="questions"] .sound-member-login-link {
            top: 7.05rem;
          }

          main[data-onboarding-stage="questions"] .sound-question-panel {
            padding-top: 9.85rem;
            padding-right: clamp(1rem, 3.2vw, 1.75rem);
            padding-bottom: 1rem;
            padding-left: clamp(1rem, 3.2vw, 1.75rem);
          }

          main[data-onboarding-stage="questions"] .sound-progress-path {
            padding-block: 0.24rem;
          }

          main[data-onboarding-stage="questions"] .sound-progress-node {
            height: clamp(1.48rem, 2.55vw, 1.85rem);
            width: clamp(1.48rem, 2.55vw, 1.85rem);
          }

          main[data-onboarding-stage="questions"] .sound-progress-icon {
            height: clamp(0.72rem, 1.25vw, 0.9rem);
            width: clamp(0.72rem, 1.25vw, 0.9rem);
          }

          main[data-onboarding-stage="questions"] .sound-question-page {
            padding-top: 0.45rem;
            padding-bottom: 0;
          }

          main[data-onboarding-stage="questions"] .sound-question-top-back {
            min-height: 2.25rem;
            margin-bottom: 0.75rem;
            padding-right: 0.9rem;
            padding-left: 0.9rem;
            font-size: 0.62rem;
          }

          main[data-onboarding-stage="questions"] .sound-question-page > .flex.items-start:first-child h2 {
            margin-top: 0.55rem;
            font-size: clamp(1.45rem, 3.45vw, 2.12rem);
            line-height: 0.96;
          }

          main[data-onboarding-stage="questions"] .sound-question-page > .flex.items-start:first-child p.mt-3 {
            margin-top: 0.5rem;
            line-height: 1.24rem;
          }

          main[data-onboarding-stage="questions"] .sound-option-grid {
            grid-template-columns: repeat(3, minmax(0, clamp(7.45rem, 16vw, 9.35rem)));
            gap: 0.58rem;
            margin-top: 0.76rem;
          }

          main[data-onboarding-stage="questions"] .sound-option-card {
            padding: 0.58rem;
          }

          main[data-onboarding-stage="questions"] .sound-option-icon-shell {
            height: 2.72rem;
            width: 2.72rem;
            border-radius: 0.24rem;
          }

          main[data-onboarding-stage="questions"] .sound-option-icon-shell svg {
            height: 1.34rem;
            width: 1.34rem;
          }

          main[data-onboarding-stage="questions"] .sound-option-label {
            margin-top: 0.42rem;
            font-size: 0.74rem;
            line-height: 0.86rem;
          }

          main[data-onboarding-stage="questions"] .sound-option-card[data-selected="true"] {
            transform: translateY(-0.14rem) scale(1.03);
          }

          main[data-onboarding-stage="questions"] .sound-option-card[data-selected="true"]:hover {
            transform: translateY(-0.18rem) scale(1.04);
          }

          main[data-onboarding-stage="questions"] .sound-option-card[data-selected="true"] .sound-option-icon-shell {
            transform: translateY(-2px) scale(1.12);
          }

          main[data-onboarding-stage="questions"] .sound-option-grid[data-option-count="9"] {
            grid-template-columns: repeat(3, minmax(0, clamp(6.45rem, 13vw, 7.55rem)));
            gap: 0.44rem;
            margin-top: 0.62rem;
          }

          main[data-onboarding-stage="questions"] .sound-option-grid[data-option-count="9"] .sound-option-card {
            aspect-ratio: 1 / 0.86;
            padding: 0.4rem 0.44rem;
          }

          main[data-onboarding-stage="questions"] .sound-option-grid[data-option-count="9"] .sound-option-icon-shell {
            height: 1.86rem;
            width: 1.86rem;
          }

          main[data-onboarding-stage="questions"] .sound-option-grid[data-option-count="9"] .sound-option-icon-shell svg {
            height: 0.9rem;
            width: 0.9rem;
          }

          main[data-onboarding-stage="questions"] .sound-option-grid[data-option-count="9"] .sound-option-label {
            margin-top: 0.18rem;
            font-size: 0.6rem;
            line-height: 0.7rem;
          }
        }

        @media (max-width: 1100px) and (max-height: 900px) {
          main[data-onboarding-stage="questions"] .sound-question-logo {
            top: 0.5rem;
          }

          main[data-onboarding-stage="questions"] .sound-assessment-link {
            top: 3.9rem;
          }

          main[data-onboarding-stage="questions"] .sound-member-login-link {
            top: 6.62rem;
          }

          main[data-onboarding-stage="questions"] .sound-question-panel {
            padding-top: 9.1rem;
          }

          main[data-onboarding-stage="questions"] .sound-option-grid {
            grid-template-columns: repeat(3, minmax(0, clamp(6.95rem, 15vw, 8.75rem)));
            gap: 0.52rem;
            margin-top: 0.66rem;
          }

          main[data-onboarding-stage="questions"] .sound-option-card {
            padding: 0.52rem;
          }

          main[data-onboarding-stage="questions"] .sound-option-icon-shell {
            height: 2.45rem;
            width: 2.45rem;
          }
        }

        @media (max-width: 760px) {
          main[data-onboarding-stage="questions"] .sound-question-panel {
            padding-top: 9.85rem;
          }

          main[data-onboarding-stage="questions"] .sound-option-grid {
            grid-template-columns: repeat(2, minmax(0, min(8.85rem, calc((100% - 0.56rem) / 2))));
            gap: 0.56rem;
          }

          main[data-onboarding-stage="questions"] .sound-option-card {
            aspect-ratio: 1 / 0.9;
            padding: 0.52rem;
          }

          main[data-onboarding-stage="questions"] .sound-option-icon-shell {
            height: 2.32rem;
            width: 2.32rem;
          }

          main[data-onboarding-stage="questions"] .sound-option-icon-shell svg {
            height: 1.14rem;
            width: 1.14rem;
          }

          main[data-onboarding-stage="questions"] .sound-option-label {
            font-size: 0.68rem;
            line-height: 0.78rem;
          }

          main[data-onboarding-stage="questions"] .sound-option-grid[data-option-count="9"] {
            grid-template-columns: repeat(3, minmax(0, clamp(4.95rem, 24vw, 6.15rem)));
          }

          main[data-onboarding-stage="questions"] .sound-option-grid[data-option-count="9"] .sound-option-card {
            aspect-ratio: 1 / 0.84;
          }
        }

        .sound-app-start-button {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          border: 1px solid rgba(207, 250, 254, 0.8);
          background:
            radial-gradient(circle at 12% 15%, rgba(255, 255, 255, 0.9), transparent 10%),
            linear-gradient(112deg, #67e8f9 0%, #22d3ee 24%, #38bdf8 46%, #0ea5e9 58%, #67e8f9 72%, #fb923c 86%, #facc15 100%);
          background-size: 280% 280%;
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.24),
            0 0 34px rgba(34, 211, 238, 0.34),
            0 16px 38px rgba(8, 47, 73, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.72),
            inset 0 -10px 22px rgba(8, 47, 73, 0.18);
          text-shadow: 0 1px 0 rgba(255, 255, 255, 0.34);
          animation: soundAppStartGradient 8.8s cubic-bezier(0.2, 0.72, 0.18, 1) infinite;
        }

        .sound-app-start-button:hover {
          transform: translateY(-2px) scale(1.01);
        }

        .sound-app-start-aura {
          position: absolute;
          inset: -0.65rem;
          z-index: -1;
          border-radius: inherit;
          background:
            radial-gradient(circle at 20% 40%, rgba(255, 255, 255, 0.46), transparent 14%),
            radial-gradient(circle at 76% 54%, rgba(103, 232, 249, 0.58), transparent 30%),
            radial-gradient(circle at 50% 50%, rgba(14, 165, 233, 0.36), transparent 70%);
          filter: blur(12px);
          opacity: 0.88;
          animation: soundAppStartAura 8.8s cubic-bezier(0.2, 0.72, 0.18, 1) infinite;
        }

        .sound-app-start-sheen {
          position: absolute;
          inset: -70%;
          z-index: 1;
          background:
            conic-gradient(from 140deg, transparent 0deg, rgba(255, 255, 255, 0.72) 24deg, transparent 56deg, transparent 180deg, rgba(255, 255, 255, 0.22) 218deg, transparent 252deg),
            linear-gradient(110deg, transparent 34%, rgba(255, 255, 255, 0.58) 48%, transparent 62%);
          mix-blend-mode: screen;
          opacity: 0.42;
          transform: translateX(-35%) rotate(9deg);
          animation: soundAppStartSheen 8.8s ease-in-out infinite;
          pointer-events: none;
        }

        .sound-app-start-content {
          animation: soundAppStartContent 8.8s ease-in-out infinite;
        }

        .sound-app-start-content svg {
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.46));
          animation: soundAppStartGlyph 8.8s ease-in-out infinite;
        }

        .sound-app-start-diamond {
          --diamond-left: 50%;
          --diamond-top: 50%;
          --diamond-size: 0.46rem;
          --diamond-delay: 0ms;
          position: absolute;
          left: var(--diamond-left);
          top: var(--diamond-top);
          z-index: 2;
          height: var(--diamond-size);
          width: var(--diamond-size);
          clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
          background:
            radial-gradient(circle at 35% 30%, #ffffff 0 15%, #cffafe 30%, #22d3ee 62%, transparent 76%),
            linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(103, 232, 249, 0.86));
          box-shadow:
            0 0 10px rgba(255, 255, 255, 0.95),
            0 0 18px rgba(34, 211, 238, 0.7);
          opacity: 0;
          transform: translate(-50%, -50%) rotate(45deg) scale(0.15);
          animation: soundAppStartDiamond 8.8s ease-in-out infinite;
          animation-delay: var(--diamond-delay);
          pointer-events: none;
        }

        .sound-app-start-diamond::before,
        .sound-app-start-diamond::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          height: 1px;
          width: 1.05rem;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.95), transparent);
          transform: translate(-50%, -50%) rotate(-45deg);
        }

        .sound-app-start-diamond::after {
          transform: translate(-50%, -50%) rotate(45deg);
        }

        .sound-app-start-diamond--one {
          --diamond-left: 9%;
          --diamond-top: 22%;
          --diamond-delay: 120ms;
        }

        .sound-app-start-diamond--two {
          --diamond-left: 88%;
          --diamond-top: 26%;
          --diamond-size: 0.38rem;
          --diamond-delay: 820ms;
        }

        .sound-app-start-diamond--three {
          --diamond-left: 78%;
          --diamond-top: 78%;
          --diamond-size: 0.52rem;
          --diamond-delay: 1540ms;
        }

        .sound-app-start-diamond--four {
          --diamond-left: 20%;
          --diamond-top: 76%;
          --diamond-size: 0.34rem;
          --diamond-delay: 2380ms;
        }

        .sound-app-start-diamond--five {
          --diamond-left: 51%;
          --diamond-top: 14%;
          --diamond-size: 0.3rem;
          --diamond-delay: 3220ms;
        }

        .sound-logo-stage {
          isolation: isolate;
          perspective: 1200px;
          transform-style: preserve-3d;
        }

        main[data-onboarding-stage="welcome"] .sound-welcome-stack {
          transform: translateY(clamp(0.15rem, 0.9vh, 1rem));
          gap: clamp(0.5rem, 1.7vh, 0.8rem);
        }

        /* Fluid vertical sizing so the welcome hero always fits inside the
           shell frame. On tall screens the shell is capped at 43rem, so the
           drivers hold a lightly-trimmed baseline (clamp max); as the viewport
           gets shorter, the vh term eases each element down proportionally. */
        main[data-onboarding-stage="welcome"] .sound-logo-stage {
          height: clamp(6rem, min(19.5vh, 30vw), 9.25rem);
          width: clamp(6rem, min(19.5vh, 30vw), 9.25rem);
        }

        main[data-onboarding-stage="welcome"] .sound-logo-mark {
          height: 74%;
          width: 74%;
        }

        main[data-onboarding-stage="welcome"] .sound-logo-comet {
          height: 82%;
          width: 82%;
        }

        /* Width-aware so a narrow viewport shrinks the headline too (avoids the
           title wrapping into extra lines and blowing past the frame). */
        main[data-onboarding-stage="welcome"] .sound-welcome-stack h1 {
          font-size: clamp(1.5rem, min(6vh, 8.4vw), 2.7rem);
        }

        main[data-onboarding-stage="welcome"] .sound-welcome-stack h1 + p,
        main[data-onboarding-stage="welcome"] .sound-welcome-stack p {
          margin-top: clamp(0.5rem, 1.6vh, 0.85rem);
          font-size: clamp(0.8rem, min(1.9vh, 3.6vw), 0.95rem);
          line-height: clamp(1.15rem, 2.5vh, 1.45rem);
        }

        main[data-onboarding-stage="welcome"] .sound-step-orbit {
          height: clamp(5rem, min(14.7vh, 24vw), 7rem);
        }

        main[data-onboarding-stage="welcome"] .sound-step-card {
          min-height: clamp(4.4rem, min(12.5vh, 20vw), 6.35rem);
        }

        /* Keep the CTA label from clipping on very narrow screens (the label is
           nowrap, so shrink the type fluidly instead of letting it overflow). */
        main[data-onboarding-stage="welcome"] .sound-app-start-button {
          font-size: clamp(0.52rem, 3.1vw, 0.75rem);
        }

        /* Very thin screens: reclaim more room for the CTA label by widening the
           button and trimming padding, tracking, and the inline icons. */
        @media (max-width: 380px) {
          main[data-onboarding-stage="welcome"] .sound-app-start-button {
            max-width: calc(100% - 0.5rem);
            padding-left: 0.85rem;
            padding-right: 0.85rem;
            letter-spacing: 0.05em;
          }

          main[data-onboarding-stage="welcome"] .sound-app-start-content {
            gap: 0.35rem;
          }

          main[data-onboarding-stage="welcome"] .sound-app-start-content svg {
            height: 0.85rem;
            width: 0.85rem;
          }
        }

        /* Narrow widths: compact the trust chips and tighten spacing so the
           stacked welcome hero still fits inside the frame. */
        @media (max-width: 640px) {
          main[data-onboarding-stage="welcome"] .sound-welcome-stack {
            gap: clamp(0.4rem, 1.6vw, 0.7rem);
          }

          main[data-onboarding-stage="welcome"] .sound-trust-chip {
            padding: 0.3rem 0.6rem;
            gap: 0.3rem;
            font-size: 8px;
          }
        }

        /* Mobile header: collapse the two utility links to icon-only badges
           (no text) sitting on a shadowy backdrop, kept in their corners so
           they never overlap. The centered logo stays where it is. */
        @media (max-width: 460px) {
          main[data-onboarding-stage="welcome"] .sound-assessment-link,
          main[data-onboarding-stage="welcome"] .sound-member-login-link {
            gap: 0;
            padding: 0;
            height: 2.5rem;
            width: 2.5rem;
            max-width: 2.5rem;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            background:
              radial-gradient(circle at 50% 30%, rgba(15, 23, 42, 0.78), rgba(2, 7, 19, 0.9));
            border: 1px solid rgba(125, 249, 255, 0.16);
            box-shadow:
              0 10px 26px rgba(2, 7, 19, 0.72),
              0 0 22px rgba(14, 165, 233, 0.14),
              inset 0 1px 0 rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(7px);
          }

          main[data-onboarding-stage="welcome"] .sound-member-login-link {
            left: auto;
            right: 1rem;
            top: 1rem;
          }

          main[data-onboarding-stage="welcome"] .sound-assessment-link .sound-utility-link-copy,
          main[data-onboarding-stage="welcome"] .sound-member-login-link .sound-utility-link-copy {
            display: none;
          }

          main[data-onboarding-stage="welcome"] .sound-assessment-link .sound-utility-link-primary-icon,
          main[data-onboarding-stage="welcome"] .sound-member-login-link .sound-utility-link-primary-icon {
            height: 1.2rem;
            width: 1.2rem;
          }

          /* The default hover flourish (a wide blurred glow + oversized ghost
             icon) is sized for the text pills and spills far outside the round
             badge. Disable it here and use a contained, intentional hover. */
          main[data-onboarding-stage="welcome"] .sound-assessment-link .sound-utility-link-hover-icon,
          main[data-onboarding-stage="welcome"] .sound-member-login-link .sound-utility-link-hover-icon,
          main[data-onboarding-stage="welcome"] .sound-assessment-link::before,
          main[data-onboarding-stage="welcome"] .sound-assessment-link::after,
          main[data-onboarding-stage="welcome"] .sound-member-login-link::before,
          main[data-onboarding-stage="welcome"] .sound-member-login-link::after {
            display: none;
          }

          main[data-onboarding-stage="welcome"] .sound-assessment-link:hover,
          main[data-onboarding-stage="welcome"] .sound-assessment-link:focus-visible,
          main[data-onboarding-stage="welcome"] .sound-member-login-link:hover,
          main[data-onboarding-stage="welcome"] .sound-member-login-link:focus-visible {
            border-color: rgba(125, 249, 255, 0.55);
            background:
              radial-gradient(circle at 50% 28%, rgba(23, 51, 84, 0.95), rgba(2, 7, 19, 0.94));
            box-shadow:
              0 12px 30px rgba(2, 7, 19, 0.8),
              0 0 20px rgba(14, 165, 233, 0.3),
              inset 0 0 15px rgba(125, 249, 255, 0.2);
          }
        }

        /* Questions / result "build your plan" pages: replace the centered
           stacked top links with the same icon-only corner badges as the
           welcome header, and reclaim the tall padding the stack needed. */
        @media (max-width: 1100px) {
          main[data-onboarding-stage="questions"] .sound-assessment-link,
          main[data-onboarding-stage="result"] .sound-assessment-link,
          main[data-onboarding-stage="questions"] .sound-member-login-link,
          main[data-onboarding-stage="result"] .sound-member-login-link {
            top: 1rem;
            transform: none;
            gap: 0;
            padding: 0;
            height: 2.5rem;
            width: 2.5rem;
            min-width: 0;
            max-width: 2.5rem;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            background:
              radial-gradient(circle at 50% 30%, rgba(15, 23, 42, 0.78), rgba(2, 7, 19, 0.9));
            border: 1px solid rgba(125, 249, 255, 0.16);
            box-shadow:
              0 10px 26px rgba(2, 7, 19, 0.72),
              0 0 22px rgba(14, 165, 233, 0.14),
              inset 0 1px 0 rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(7px);
            white-space: normal;
          }

          main[data-onboarding-stage="questions"] .sound-assessment-link,
          main[data-onboarding-stage="result"] .sound-assessment-link {
            left: 1rem;
            right: auto;
          }

          main[data-onboarding-stage="questions"] .sound-member-login-link,
          main[data-onboarding-stage="result"] .sound-member-login-link {
            left: auto;
            right: 1rem;
          }

          main[data-onboarding-stage="questions"] .sound-assessment-link .sound-utility-link-copy,
          main[data-onboarding-stage="result"] .sound-assessment-link .sound-utility-link-copy,
          main[data-onboarding-stage="questions"] .sound-member-login-link .sound-utility-link-copy,
          main[data-onboarding-stage="result"] .sound-member-login-link .sound-utility-link-copy {
            display: none;
          }

          main[data-onboarding-stage="questions"] .sound-assessment-link .sound-utility-link-primary-icon,
          main[data-onboarding-stage="result"] .sound-assessment-link .sound-utility-link-primary-icon,
          main[data-onboarding-stage="questions"] .sound-member-login-link .sound-utility-link-primary-icon,
          main[data-onboarding-stage="result"] .sound-member-login-link .sound-utility-link-primary-icon {
            height: 1.2rem;
            width: 1.2rem;
          }

          main[data-onboarding-stage="questions"] .sound-assessment-link .sound-utility-link-hover-icon,
          main[data-onboarding-stage="result"] .sound-assessment-link .sound-utility-link-hover-icon,
          main[data-onboarding-stage="questions"] .sound-member-login-link .sound-utility-link-hover-icon,
          main[data-onboarding-stage="result"] .sound-member-login-link .sound-utility-link-hover-icon,
          main[data-onboarding-stage="questions"] .sound-assessment-link::before,
          main[data-onboarding-stage="questions"] .sound-assessment-link::after,
          main[data-onboarding-stage="result"] .sound-assessment-link::before,
          main[data-onboarding-stage="result"] .sound-assessment-link::after,
          main[data-onboarding-stage="questions"] .sound-member-login-link::before,
          main[data-onboarding-stage="questions"] .sound-member-login-link::after,
          main[data-onboarding-stage="result"] .sound-member-login-link::before,
          main[data-onboarding-stage="result"] .sound-member-login-link::after {
            display: none;
          }

          main[data-onboarding-stage="questions"] .sound-assessment-link:hover,
          main[data-onboarding-stage="questions"] .sound-assessment-link:focus-visible,
          main[data-onboarding-stage="result"] .sound-assessment-link:hover,
          main[data-onboarding-stage="result"] .sound-assessment-link:focus-visible,
          main[data-onboarding-stage="questions"] .sound-member-login-link:hover,
          main[data-onboarding-stage="questions"] .sound-member-login-link:focus-visible,
          main[data-onboarding-stage="result"] .sound-member-login-link:hover,
          main[data-onboarding-stage="result"] .sound-member-login-link:focus-visible {
            border-color: rgba(125, 249, 255, 0.55);
            background:
              radial-gradient(circle at 50% 28%, rgba(23, 51, 84, 0.95), rgba(2, 7, 19, 0.94));
            box-shadow:
              0 12px 30px rgba(2, 7, 19, 0.8),
              0 0 20px rgba(14, 165, 233, 0.3),
              inset 0 0 15px rgba(125, 249, 255, 0.2);
          }

          /* With the stack gone, the panel only needs to clear the centered
             logo + corner badges, so drop the tall reserved top padding. */
          main[data-onboarding-stage="questions"] .sound-question-panel {
            padding-top: clamp(4.1rem, 8.5vh, 4.85rem);
          }

          /* The contact step is a tall form: give it the tightest top padding
             and keep it top-aligned so the Send button never clips. */
          main[data-onboarding-stage="questions"] .sound-question-panel[data-contact-step="true"] {
            padding-top: clamp(3.9rem, 8vh, 4.5rem);
            padding-bottom: 0.9rem;
          }

          main[data-onboarding-stage="result"] .sound-question-panel,
          main[data-onboarding-stage="result"] .sound-question-panel[data-panel-stage="result"] {
            padding-top: clamp(4.1rem, 8.5vh, 4.85rem);
          }

          /* With the reserved stack space gone, vertically center the question
             content in the freed area so it stays balanced instead of sitting
             top-heavy on taller screens (still fits short screens). Excludes the
             contact step, whose tall form stays top-aligned so it never clips. */
          main[data-onboarding-stage="questions"] .sound-question-panel:not([data-contact-step="true"]) .sound-question-page {
            justify-content: center;
          }
        }

        .sound-logo-stage::before,
        .sound-logo-stage::after {
          content: "";
          position: absolute;
          inset: 0.45rem;
          z-index: 2;
          border-radius: 999px;
          border: 1px solid rgba(125, 249, 255, 0.34);
          box-shadow:
            0 0 26px rgba(34, 211, 238, 0.22),
            inset 0 0 18px rgba(125, 249, 255, 0.12);
          opacity: 0;
          pointer-events: none;
          transform: scale(0.78);
          animation: soundLogoCirclePulse 12.8s cubic-bezier(0.2, 0.82, 0.18, 1) 3200ms infinite;
        }

        .sound-logo-stage::after {
          inset: 1rem;
          border-color: rgba(250, 204, 21, 0.22);
          box-shadow:
            0 0 24px rgba(250, 204, 21, 0.12),
            inset 0 0 18px rgba(34, 211, 238, 0.12);
          animation-delay: 3560ms;
        }

        .sound-logo-disc {
          inset: 0.75rem;
          aspect-ratio: 1 / 1;
          background:
            radial-gradient(circle at 50% 42%, rgba(255, 255, 255, 0.12), transparent 28%),
            radial-gradient(circle at 50% 50%, rgba(34, 211, 238, 0.18), rgba(15, 23, 42, 0.62) 58%, rgba(2, 7, 19, 0.84) 100%);
          box-shadow:
            inset 0 0 26px rgba(125, 249, 255, 0.14),
            inset 0 0 0 1px rgba(255, 255, 255, 0.08),
            0 0 44px rgba(34, 211, 238, 0.18);
        }

        /* Crest entrance. Fallback: one continuous decelerating swoop with a
           soft overshoot-settle (transform/opacity only). Browsers with
           offset-path support get the full Pixar-style flight below: a single
           tangent-continuous spiral — swoop in from the lower-left, one clean
           clockwise loop around the landing spot, settle into place — driven
           by ONE easing over the whole path so the speed never lurches. */
        .sound-logo-mark {
          animation: soundLogoFlyIn 1650ms cubic-bezier(0.16, 0.84, 0.28, 1) both;
          transform-origin: 50% 60%;
          will-change: transform, opacity;
        }

        @supports (offset-path: path("M 0 0 L 1 1")) {
          .sound-logo-stage {
            --sound-crest-path: path(
              "M -620 150 C -430 60 -280 -10 -150 -48 C -60 -74 -20 -86 0 -88 A 88 88 0 0 1 0 88 A 88 88 0 0 1 0 -88 C 36 -84 44 -38 0 0"
            );
          }

          .sound-logo-mark {
            offset-anchor: 0 0;
            offset-path: var(--sound-crest-path);
            offset-rotate: 0deg;
            animation: soundLogoLoopFlyIn 2350ms cubic-bezier(0.24, 0.6, 0.36, 1) both;
          }

          .sound-logo-stage .sound-logo-trail {
            display: block;
          }
        }

        /* Sparkle spray: each spark rides the flight path a beat behind the
           crest (so it appears to be emitted from it), scattered off the path
           line so the crest doesn't cover it, with star flares and a twinkle. */
        .sound-logo-trail {
          --trail-scatter-x: 0rem;
          --trail-scatter-y: 0rem;
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 1;
          display: none;
          height: 0.6rem;
          width: 0.6rem;
          margin: -0.3rem 0 0 -0.3rem;
          border-radius: 999px;
          background: radial-gradient(circle, #ffffff 0 26%, #a5f3fc 52%, transparent 74%);
          box-shadow:
            0 0 12px rgba(125, 249, 255, 0.8),
            0 0 26px rgba(165, 243, 252, 0.4);
          opacity: 0;
          pointer-events: none;
          offset-anchor: 0 0;
          offset-path: var(--sound-crest-path);
          offset-rotate: 0deg;
          animation:
            soundLogoTrail 2350ms cubic-bezier(0.24, 0.6, 0.36, 1) both,
            soundLogoTrailTwinkle 430ms ease-in-out infinite alternate;
          animation-delay: var(--trail-delay, 90ms), var(--trail-delay, 90ms);
        }

        .sound-logo-trail::before,
        .sound-logo-trail::after {
          content: "";
          position: absolute;
          inset: 40% -115%;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.95), rgba(165, 243, 252, 0.75), transparent);
        }

        .sound-logo-trail::after {
          transform: rotate(90deg);
        }

        .sound-logo-trail--one {
          --trail-delay: 60ms;
          --trail-peak: 1;
          --trail-scatter-x: 0.6rem;
          --trail-scatter-y: -0.55rem;
        }

        .sound-logo-trail--two {
          --trail-delay: 130ms;
          --trail-peak: 0.95;
          --trail-scatter-x: -0.75rem;
          --trail-scatter-y: 0.4rem;
          height: 0.55rem;
          width: 0.55rem;
          margin: -0.275rem 0 0 -0.275rem;
        }

        .sound-logo-trail--three {
          --trail-delay: 205ms;
          --trail-peak: 0.88;
          --trail-scatter-x: 0.95rem;
          --trail-scatter-y: 0.6rem;
          height: 0.5rem;
          width: 0.5rem;
          margin: -0.25rem 0 0 -0.25rem;
        }

        .sound-logo-trail--four {
          --trail-delay: 285ms;
          --trail-peak: 0.8;
          --trail-scatter-x: -0.55rem;
          --trail-scatter-y: -0.9rem;
          height: 0.46rem;
          width: 0.46rem;
          margin: -0.23rem 0 0 -0.23rem;
        }

        .sound-logo-trail--five {
          --trail-delay: 370ms;
          --trail-peak: 0.72;
          --trail-scatter-x: 1.2rem;
          --trail-scatter-y: -0.3rem;
          height: 0.42rem;
          width: 0.42rem;
          margin: -0.21rem 0 0 -0.21rem;
        }

        .sound-logo-trail--six {
          --trail-delay: 455ms;
          --trail-peak: 0.66;
          --trail-scatter-x: -1.05rem;
          --trail-scatter-y: -0.65rem;
          height: 0.4rem;
          width: 0.4rem;
          margin: -0.2rem 0 0 -0.2rem;
          background: radial-gradient(circle, #ffffff 0 26%, #fde68a 52%, transparent 74%);
          box-shadow:
            0 0 11px rgba(250, 204, 21, 0.7),
            0 0 22px rgba(253, 230, 138, 0.35);
        }

        .sound-logo-trail--seven {
          --trail-delay: 545ms;
          --trail-peak: 0.55;
          --trail-scatter-x: 0.45rem;
          --trail-scatter-y: 1.05rem;
          height: 0.36rem;
          width: 0.36rem;
          margin: -0.18rem 0 0 -0.18rem;
        }

        .sound-logo-trail--eight {
          --trail-delay: 640ms;
          --trail-peak: 0.5;
          --trail-scatter-x: -0.35rem;
          --trail-scatter-y: 0.85rem;
          height: 0.34rem;
          width: 0.34rem;
          margin: -0.17rem 0 0 -0.17rem;
          background: radial-gradient(circle, #ffffff 0 26%, #fde68a 52%, transparent 74%);
          box-shadow:
            0 0 10px rgba(250, 204, 21, 0.6),
            0 0 18px rgba(253, 230, 138, 0.3);
        }

        .sound-logo-halo {
          animation: soundLogoHalo 1400ms cubic-bezier(0.22, 0.9, 0.32, 1) 1250ms both;
        }

        .sound-logo-orbit {
          animation:
            soundLogoOrbitIn 1500ms cubic-bezier(0.22, 0.9, 0.32, 1) 1450ms both,
            spin 16s linear 2950ms infinite;
        }

        .sound-logo-comet {
          animation: soundLogoComet 1900ms cubic-bezier(0.3, 0.7, 0.35, 1) both;
          transform-origin: center;
          z-index: 0;
        }

        .sound-logo-sparkle {
          --spark-left: 50%;
          --spark-top: 50%;
          --spark-size: 0.42rem;
          --spark-delay: 0ms;
          --spark-entry-delay: 0ms;
          --spark-drift-x: 0rem;
          --spark-drift-y: 0rem;
          position: absolute;
          left: var(--spark-left);
          top: var(--spark-top);
          z-index: 3;
          height: var(--spark-size);
          width: var(--spark-size);
          border-radius: 999px;
          background: radial-gradient(circle, #ffffff 0 18%, #a5f3fc 42%, transparent 72%);
          filter:
            drop-shadow(0 0 8px rgba(125, 249, 255, 0.78))
            drop-shadow(0 0 16px rgba(255, 255, 255, 0.32));
          opacity: 0;
          pointer-events: none;
          transform: translate(-50%, -50%) scale(0.2);
          animation:
            soundLogoEntranceSparkle 2850ms cubic-bezier(0.18, 0.92, 0.18, 1) both,
            soundLogoSparkle 7.4s ease-in-out infinite;
          animation-delay:
            var(--spark-entry-delay),
            calc(2850ms + var(--spark-delay));
        }

        .sound-logo-sparkle::before,
        .sound-logo-sparkle::after {
          content: "";
          position: absolute;
          inset: 47% -170%;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.98), rgba(165, 243, 252, 0.86), transparent);
        }

        .sound-logo-sparkle::after {
          transform: rotate(90deg);
        }

        .sound-logo-sparkle--one {
          --spark-left: -16%;
          --spark-top: 64%;
          --spark-delay: -200ms;
          --spark-entry-delay: 120ms;
          --spark-drift-x: -1.4rem;
          --spark-drift-y: -1rem;
        }

        .sound-logo-sparkle--two {
          --spark-left: 14%;
          --spark-top: 8%;
          --spark-size: 0.36rem;
          --spark-delay: -1160ms;
          --spark-entry-delay: 420ms;
          --spark-drift-x: -0.6rem;
          --spark-drift-y: -1.35rem;
        }

        .sound-logo-sparkle--three {
          --spark-left: 91%;
          --spark-top: 8%;
          --spark-size: 0.5rem;
          --spark-delay: -2120ms;
          --spark-entry-delay: 720ms;
          --spark-drift-x: 1.05rem;
          --spark-drift-y: -1rem;
        }

        .sound-logo-sparkle--four {
          --spark-left: 111%;
          --spark-top: 61%;
          --spark-delay: -3080ms;
          --spark-entry-delay: 980ms;
          --spark-drift-x: 1.45rem;
          --spark-drift-y: 0.35rem;
        }

        .sound-logo-sparkle--five {
          --spark-left: 70%;
          --spark-top: 103%;
          --spark-size: 0.34rem;
          --spark-delay: -4040ms;
          --spark-entry-delay: 1280ms;
          --spark-drift-x: 0.55rem;
          --spark-drift-y: 1.2rem;
        }

        .sound-logo-sparkle--six {
          --spark-left: 38%;
          --spark-top: 87%;
          --spark-size: 0.44rem;
          --spark-delay: -5000ms;
          --spark-entry-delay: 1560ms;
          --spark-drift-x: -0.45rem;
          --spark-drift-y: 0.9rem;
        }

        .sound-logo-sparkle--seven {
          --spark-left: 50%;
          --spark-top: -10%;
          --spark-size: 0.32rem;
          --spark-delay: -6200ms;
          --spark-entry-delay: 360ms;
          --spark-drift-x: 0.12rem;
          --spark-drift-y: -1.25rem;
        }

        .sound-logo-sparkle--eight {
          --spark-left: 103%;
          --spark-top: 30%;
          --spark-size: 0.3rem;
          --spark-delay: -6820ms;
          --spark-entry-delay: 860ms;
          --spark-drift-x: 1.25rem;
          --spark-drift-y: -0.42rem;
        }

        .sound-logo-sparkle--nine {
          --spark-left: 12%;
          --spark-top: 34%;
          --spark-size: 0.3rem;
          --spark-delay: -5460ms;
          --spark-entry-delay: 1120ms;
          --spark-drift-x: -1rem;
          --spark-drift-y: -0.2rem;
        }

        .sound-logo-sparkle--ten {
          --spark-left: 83%;
          --spark-top: 82%;
          --spark-size: 0.28rem;
          --spark-delay: -7420ms;
          --spark-entry-delay: 1740ms;
          --spark-drift-x: 0.98rem;
          --spark-drift-y: 0.72rem;
        }

        .sound-logo-sparkle--eleven {
          --spark-left: 4%;
          --spark-top: 88%;
          --spark-size: 0.34rem;
          --spark-delay: -3180ms;
          --spark-entry-delay: 540ms;
          --spark-drift-x: -1.22rem;
          --spark-drift-y: 0.86rem;
        }

        .sound-logo-sparkle--twelve {
          --spark-left: 120%;
          --spark-top: 82%;
          --spark-size: 0.36rem;
          --spark-delay: -4180ms;
          --spark-entry-delay: 700ms;
          --spark-drift-x: 1.48rem;
          --spark-drift-y: 0.72rem;
        }

        .sound-logo-sparkle--thirteen {
          --spark-left: 73%;
          --spark-top: -18%;
          --spark-size: 0.4rem;
          --spark-delay: -1880ms;
          --spark-entry-delay: 860ms;
          --spark-drift-x: 0.74rem;
          --spark-drift-y: -1.58rem;
        }

        .sound-logo-sparkle--fourteen {
          --spark-left: 25%;
          --spark-top: -12%;
          --spark-size: 0.28rem;
          --spark-delay: -6380ms;
          --spark-entry-delay: 1040ms;
          --spark-drift-x: -0.72rem;
          --spark-drift-y: -1.44rem;
        }

        .sound-logo-sparkle--fifteen {
          --spark-left: -20%;
          --spark-top: 22%;
          --spark-size: 0.38rem;
          --spark-delay: -7040ms;
          --spark-entry-delay: 1220ms;
          --spark-drift-x: -1.56rem;
          --spark-drift-y: -0.42rem;
        }

        .sound-logo-sparkle--sixteen {
          --spark-left: 116%;
          --spark-top: 8%;
          --spark-size: 0.32rem;
          --spark-delay: -7820ms;
          --spark-entry-delay: 1440ms;
          --spark-drift-x: 1.38rem;
          --spark-drift-y: -0.9rem;
        }

        .sound-question-logo {
          pointer-events: none;
        }

        .sound-question-logo-stage {
          isolation: isolate;
          filter: drop-shadow(0 12px 28px rgba(0, 0, 0, 0.42));
        }

        .sound-question-logo-stage::before,
        .sound-question-logo-stage::after {
          content: "";
          position: absolute;
          inset: -0.1rem;
          z-index: 1;
          border-radius: 999px;
          border: 1px solid rgba(125, 249, 255, 0.28);
          box-shadow:
            0 0 24px rgba(34, 211, 238, 0.18),
            inset 0 0 16px rgba(125, 249, 255, 0.1);
          opacity: 0;
          transform: scale(0.88);
          animation: soundQuestionLogoCircle 9.4s cubic-bezier(0.2, 0.82, 0.18, 1) infinite;
        }

        .sound-question-logo-stage::after {
          inset: 0.45rem;
          border-color: rgba(250, 204, 21, 0.2);
          box-shadow:
            0 0 20px rgba(250, 204, 21, 0.12),
            inset 0 0 14px rgba(34, 211, 238, 0.1);
          animation-delay: 420ms;
        }

        .sound-question-logo-halo {
          z-index: 0;
          box-shadow:
            0 0 34px rgba(34, 211, 238, 0.18),
            inset 0 0 18px rgba(125, 249, 255, 0.12);
          animation: soundQuestionLogoGlow 6.8s ease-in-out infinite;
        }

        .sound-question-logo-disc {
          inset: 0.42rem;
          z-index: 0;
          aspect-ratio: 1 / 1;
          background:
            radial-gradient(circle at 48% 34%, rgba(255, 255, 255, 0.16), transparent 26%),
            radial-gradient(circle at 50% 50%, rgba(34, 211, 238, 0.2), rgba(15, 23, 42, 0.62) 58%, rgba(2, 7, 19, 0.82) 100%);
          box-shadow:
            inset 0 0 24px rgba(125, 249, 255, 0.13),
            inset 0 0 0 1px rgba(255, 255, 255, 0.08),
            0 0 32px rgba(34, 211, 238, 0.16);
        }

        .sound-question-logo-orbit {
          z-index: 2;
          box-shadow: inset 0 0 16px rgba(250, 204, 21, 0.08);
          animation: spin 18s linear infinite;
        }

        .sound-question-logo-mark {
          z-index: 3;
          transform-origin: center;
          animation: soundQuestionLogoShimmer 5.8s ease-in-out infinite;
          will-change: transform, filter;
        }

        .sound-question-logo-sparkle {
          --spark-left: 50%;
          --spark-top: 50%;
          --spark-size: 0.26rem;
          --spark-delay: 0ms;
          position: absolute;
          left: var(--spark-left);
          top: var(--spark-top);
          z-index: 4;
          height: var(--spark-size);
          width: var(--spark-size);
          border-radius: 999px;
          background: radial-gradient(circle, #ffffff 0 22%, #a5f3fc 45%, transparent 72%);
          filter: drop-shadow(0 0 8px rgba(125, 249, 255, 0.7));
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.2) rotate(0deg);
          animation: soundQuestionLogoSparkle 7.6s ease-in-out infinite;
          animation-delay: var(--spark-delay);
        }

        .sound-question-logo-sparkle::before,
        .sound-question-logo-sparkle::after {
          content: "";
          position: absolute;
          inset: 48% -120%;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.9), transparent);
        }

        .sound-question-logo-sparkle::after {
          transform: rotate(90deg);
        }

        .sound-question-logo-sparkle--one {
          --spark-left: 18%;
          --spark-top: 24%;
          --spark-delay: 900ms;
        }

        .sound-question-logo-sparkle--two {
          --spark-left: 84%;
          --spark-top: 38%;
          --spark-size: 0.22rem;
          --spark-delay: 2800ms;
        }

        .sound-question-logo-sparkle--three {
          --spark-left: 44%;
          --spark-top: 86%;
          --spark-size: 0.2rem;
          --spark-delay: 5200ms;
        }

        .sound-trust-chip {
          --chip-accent: 34 211 238;
          --chip-cycle: 16.8s;
          --chip-delay: 0ms;
          isolation: isolate;
          background:
            radial-gradient(circle at 18% 12%, rgb(var(--chip-accent) / 0.2), transparent 34%),
            linear-gradient(135deg, rgb(var(--chip-accent) / 0.12), rgba(255, 255, 255, 0.035));
          border-color: rgb(var(--chip-accent) / 0.3);
          box-shadow:
            0 0 0 1px rgb(var(--chip-accent) / 0.05),
            0 9px 24px rgba(0, 0, 0, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          transform-origin: center;
          animation: soundTrustPulse var(--chip-cycle) cubic-bezier(0.2, 0.82, 0.22, 1) infinite;
          animation-delay: var(--chip-delay);
          will-change: transform, filter, box-shadow;
        }

        .sound-trust-chip::before,
        .sound-trust-chip::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          opacity: 0;
          pointer-events: none;
          animation: soundTrustAura var(--chip-cycle) cubic-bezier(0.2, 0.82, 0.22, 1) infinite;
          animation-delay: var(--chip-delay);
        }

        .sound-trust-chip::before {
          z-index: 0;
          background:
            radial-gradient(circle at 18% 34%, rgba(255, 255, 255, 0.46), transparent 22%),
            radial-gradient(circle at 78% 52%, rgb(var(--chip-accent) / 0.52), transparent 42%),
            linear-gradient(110deg, rgb(var(--chip-accent) / 0.34), rgba(34, 211, 238, 0.12), rgb(var(--chip-accent) / 0.24));
          filter: blur(0.5px);
          transform: scale(0.88);
        }

        .sound-trust-chip::after {
          inset: -18% -24%;
          z-index: 1;
          background: linear-gradient(110deg, transparent 25%, rgba(255, 255, 255, 0.48) 46%, rgb(var(--chip-accent) / 0.36) 55%, transparent 72%);
          mix-blend-mode: screen;
          transform: translateX(-55%) rotate(8deg);
          animation-name: soundTrustSheen;
        }

        .sound-trust-chip:nth-child(2) {
          --chip-accent: 45 212 191;
          --chip-delay: 4.2s;
        }

        .sound-trust-chip:nth-child(3) {
          --chip-accent: 250 204 21;
          --chip-delay: 8.4s;
        }

        .sound-trust-chip:nth-child(4) {
          --chip-accent: 52 211 153;
          --chip-delay: 12.6s;
        }

        .sound-trust-chip svg {
          position: relative;
          z-index: 2;
          color: rgb(var(--chip-accent));
          filter: drop-shadow(0 0 8px rgb(var(--chip-accent) / 0.42));
        }

        .sound-trust-chip > span:not(.sound-trust-sparkle):not(.sound-trust-bubble) {
          position: relative;
          z-index: 2;
        }

        .sound-trust-sparkle {
          --spark-x: 0.34rem;
          --spark-y: -0.3rem;
          --spark-delay: 0ms;
          position: absolute;
          left: 54%;
          top: 50%;
          z-index: 3;
          height: 0.24rem;
          width: 0.24rem;
          border-radius: 999px;
          background: radial-gradient(circle, #ffffff 0 18%, rgb(var(--chip-accent)) 48%, transparent 76%);
          box-shadow:
            0 0 7px rgb(var(--chip-accent) / 0.58),
            0 0 12px rgb(var(--chip-accent) / 0.22);
          opacity: 0;
          pointer-events: none;
          transform: translate3d(0, 0, 0) scale(0.3);
          animation: soundTrustSparkle var(--chip-cycle) ease-in-out infinite;
          animation-delay: calc(var(--chip-delay) + var(--spark-delay));
        }

        .sound-trust-sparkle--one {
          --spark-x: -0.32rem;
          --spark-y: -0.28rem;
          --spark-delay: 0ms;
          left: 24%;
          top: 24%;
        }

        .sound-trust-sparkle--two {
          --spark-x: 0.36rem;
          --spark-y: -0.24rem;
          --spark-delay: 120ms;
          left: 78%;
          top: 31%;
        }

        .sound-trust-sparkle--three {
          --spark-x: 0.16rem;
          --spark-y: 0.26rem;
          --spark-delay: 240ms;
          left: 48%;
          top: 72%;
        }

        .sound-trust-bubble {
          --bubble-size: 0.3rem;
          --bubble-x: 0rem;
          --bubble-y: 0rem;
          --bubble-delay: 0ms;
          --burst-delay: 0ms;
          --burst-x: 0.9rem;
          --burst-y: -0.5rem;
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: 1;
          height: var(--bubble-size);
          width: var(--bubble-size);
          border-radius: 999px;
          background:
            radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.95) 0 14%, rgba(255, 255, 255, 0.42) 24%, transparent 42%),
            radial-gradient(circle at 50% 58%, rgb(var(--chip-accent) / 0.64), rgb(var(--chip-accent) / 0.18) 54%, transparent 76%);
          box-shadow:
            0 0 8px rgb(var(--chip-accent) / 0.36),
            inset 0 0 5px rgba(255, 255, 255, 0.18);
          filter: blur(0.1px) saturate(1.12);
          mix-blend-mode: screen;
          opacity: 0.32;
          pointer-events: none;
          translate: var(--bubble-x) var(--bubble-y);
          transform: scale(0.72);
          animation:
            soundTrustBubbleRest 4.8s ease-in-out infinite,
            soundTrustBubbleBurst var(--chip-cycle) cubic-bezier(0.2, 0.82, 0.2, 1) infinite;
          animation-delay: var(--bubble-delay), calc(var(--chip-delay) + var(--burst-delay));
          will-change: translate, transform, opacity, filter;
        }

        .sound-trust-bubble--one {
          --bubble-size: 0.28rem;
          --bubble-x: -2.05rem;
          --bubble-y: -0.25rem;
          --bubble-delay: -700ms;
          --burst-delay: 0ms;
          --burst-x: -1.25rem;
          --burst-y: -0.78rem;
        }

        .sound-trust-bubble--two {
          --bubble-size: 0.22rem;
          --bubble-x: -0.45rem;
          --bubble-y: 0.42rem;
          --bubble-delay: -2100ms;
          --burst-delay: 90ms;
          --burst-x: -0.2rem;
          --burst-y: 1.04rem;
        }

        .sound-trust-bubble--three {
          --bubble-size: 0.34rem;
          --bubble-x: 1.28rem;
          --bubble-y: -0.32rem;
          --bubble-delay: -1400ms;
          --burst-delay: 160ms;
          --burst-x: 1.08rem;
          --burst-y: -0.92rem;
        }

        .sound-trust-bubble--four {
          --bubble-size: 0.2rem;
          --bubble-x: 2.2rem;
          --bubble-y: 0.36rem;
          --bubble-delay: -3100ms;
          --burst-delay: 230ms;
          --burst-x: 1.42rem;
          --burst-y: 0.66rem;
        }

        .sound-step-orbit {
          --step-cycle: 18s;
          perspective: 1100px;
          transform-style: preserve-3d;
          mask-image: linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%);
        }

        .sound-step-card {
          --step-accent: 34 211 238;
          --step-warm: 250 204 21;
          --step-delay: 0s;
          position: absolute;
          left: 50%;
          top: 50%;
          min-height: 6.35rem;
          width: min(25rem, 78vw);
          overflow: hidden;
          backface-visibility: hidden;
          border-color: rgba(125, 249, 255, 0.18);
          background:
            radial-gradient(circle at 50% -12%, rgb(var(--step-accent) / 0.2), transparent 48%),
            radial-gradient(circle at 85% 88%, rgb(var(--step-warm) / 0.14), transparent 42%),
            linear-gradient(135deg, rgba(15, 23, 42, 0.72), rgba(2, 7, 19, 0.9));
          isolation: isolate;
          pointer-events: none;
          box-shadow:
            0 18px 50px rgba(0, 0, 0, 0.34),
            0 0 42px rgba(34, 211, 238, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
          transform-style: preserve-3d;
          animation:
            soundStepCardFrameHold var(--step-cycle) cubic-bezier(0.22, 0.76, 0.18, 1) infinite,
            soundStepBackdropFlux var(--step-cycle) ease-in-out infinite;
          animation-delay: var(--step-delay), var(--step-delay);
          transform: translate3d(-50%, -50%, 0) scale(0.985);
          will-change: transform, box-shadow;
        }

        .sound-step-photo {
          z-index: 0;
          opacity: 0.08;
          filter: saturate(1.28) contrast(1.14) brightness(0.84) hue-rotate(-8deg);
          transform: scale(1.06);
          animation:
            soundStepFillFade var(--step-cycle) cubic-bezier(0.22, 0.76, 0.18, 1) infinite,
            soundStepPhotoDrift var(--step-cycle) ease-in-out infinite;
          animation-delay: var(--step-delay), var(--step-delay);
          will-change: opacity, transform, filter;
        }

        .sound-step-content {
          position: relative;
          z-index: 8;
          transform-style: preserve-3d;
        }

        .sound-step-content::before {
          content: "";
          position: absolute;
          left: 50%;
          top: 51%;
          z-index: -1;
          height: 6.8rem;
          width: min(25rem, 92%);
          border-radius: 999px;
          background:
            radial-gradient(ellipse at 30% 44%, rgb(var(--step-accent) / 0.74), transparent 50%),
            radial-gradient(ellipse at 72% 54%, rgb(var(--step-warm) / 0.56), transparent 48%),
            radial-gradient(ellipse at 50% 86%, rgba(251, 146, 60, 0.36), transparent 50%),
            conic-gradient(from 210deg, transparent 0deg, rgba(251, 146, 60, 0.5) 62deg, rgb(var(--step-accent) / 0.48) 128deg, rgba(125, 249, 255, 0.18) 188deg, transparent 252deg);
          filter: blur(16px) saturate(1.42);
          mix-blend-mode: screen;
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.72);
          animation: soundStepCenterIgnition var(--step-cycle) ease-in-out infinite;
          animation-delay: var(--step-delay);
          pointer-events: none;
          will-change: opacity, transform, filter;
        }

        .sound-step-content::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 40%;
          z-index: 0;
          height: 4.25rem;
          width: 4.25rem;
          border-radius: 999px;
          background:
            radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.24) 0 8%, transparent 18%),
            conic-gradient(from 0deg, transparent 0deg, rgb(var(--step-accent) / 0.18) 34deg, rgba(125, 249, 255, 0.95) 84deg, rgba(251, 146, 60, 0.8) 132deg, transparent 188deg, rgb(var(--step-accent) / 0.5) 252deg, transparent 318deg);
          box-shadow:
            0 0 20px rgb(var(--step-accent) / 0.58),
            0 0 38px rgba(251, 146, 60, 0.28),
            inset 0 0 12px rgba(255, 255, 255, 0.12);
          filter: blur(1.7px) saturate(1.28);
          opacity: 0;
          pointer-events: none;
          transform: translate(-50%, -50%) rotate(0deg) scale(0.72);
          animation: soundStepCenterRing var(--step-cycle) linear infinite;
          animation-delay: var(--step-delay);
          will-change: opacity, transform, filter;
        }

        .sound-step-glass {
          z-index: 1;
          /* Cover the card's border box, not the padding box. The photo is
             clipped by the card's overflow at the padding edge, so matching
             that clip exactly (rather than insetting by the 1px border while
             inheriting the full 8px radius) keeps the glass from leaving
             uncovered slivers of raw photo at the rounded corners. */
          inset: -1px;
          border-radius: inherit;
          overflow: hidden;
          opacity: 0.12;
          background:
            radial-gradient(circle at 18% 18%, rgb(var(--step-accent) / 0.28), transparent 26%),
            radial-gradient(circle at 84% 76%, rgb(var(--step-warm) / 0.16), transparent 31%),
            linear-gradient(110deg, rgba(2, 7, 19, 0.16), rgba(8, 47, 73, 0.24) 48%, rgba(2, 7, 19, 0.58)),
            repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.025) 0 1px, transparent 1px 7px);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.2),
            inset 0 -34px 58px rgba(2, 7, 19, 0.56);
          backdrop-filter: saturate(1.18) contrast(1.05);
          animation: soundStepFillFade var(--step-cycle) cubic-bezier(0.22, 0.76, 0.18, 1) infinite;
          animation-delay: var(--step-delay);
          will-change: opacity;
        }

        .sound-step-glass::before,
        .sound-step-glass::after {
          content: "";
          position: absolute;
          pointer-events: none;
        }

        .sound-step-glass::before {
          inset: -46%;
          background:
            conic-gradient(
              from 90deg,
              transparent,
              rgb(var(--step-accent) / 0.2),
              transparent 31%,
              rgb(var(--step-warm) / 0.14),
              transparent 62%,
              rgb(var(--step-accent) / 0.14),
              transparent
            ),
            radial-gradient(circle at 50% 50%, rgb(var(--step-accent) / 0.18), transparent 45%);
          mix-blend-mode: screen;
          opacity: 0;
          transform: rotate(0deg) scale(0.92);
          animation: soundStepPortalWash var(--step-cycle) ease-in-out infinite;
          animation-delay: var(--step-delay);
          will-change: transform, opacity;
        }

        .sound-step-glass::after {
          inset: -12% -28%;
          background: linear-gradient(
            105deg,
            transparent 18%,
            rgba(255, 255, 255, 0.18) 38%,
            rgb(var(--step-accent) / 0.26) 50%,
            transparent 66%
          );
          opacity: 0;
          transform: translateX(-46%) rotate(7deg);
          filter: blur(2px);
          animation: soundStepEdgeSweep var(--step-cycle) ease-in-out infinite;
          animation-delay: var(--step-delay);
          will-change: transform, opacity;
        }

        .sound-step-card::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 2;
          border-radius: inherit;
          background:
            linear-gradient(90deg, rgb(var(--step-accent) / 0.24), transparent 22%, transparent 78%, rgb(var(--step-accent) / 0.18)),
            radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.22), transparent 34%),
            radial-gradient(circle at 50% 115%, rgb(var(--step-warm) / 0.16), transparent 42%);
          mix-blend-mode: screen;
          opacity: 0.48;
          pointer-events: none;
          animation: soundStepSurfaceGlow var(--step-cycle) ease-in-out infinite;
          animation-delay: var(--step-delay);
        }

        .sound-step-number {
          z-index: 1;
          border-radius: 999px;
          color: rgba(236, 254, 255, 0.96);
          text-shadow:
            0 0 12px rgba(125, 249, 255, 0.86),
            0 0 26px rgba(251, 146, 60, 0.52),
            0 2px 12px rgba(0, 0, 0, 0.88);
          transform-style: preserve-3d;
          animation: soundStepNumberShift var(--step-cycle) cubic-bezier(0.2, 0.82, 0.16, 1) infinite;
          animation-delay: var(--step-delay);
          will-change: transform, opacity, filter;
        }

        .sound-step-number::before {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          height: 3.1rem;
          width: 3.1rem;
          border-radius: 999px;
          background:
            radial-gradient(circle at 50% 50%, rgba(2, 6, 23, 0.96) 0 24%, rgba(8, 47, 73, 0.74) 42%, rgb(var(--step-accent) / 0.26) 60%, transparent 76%),
            radial-gradient(circle, rgba(251, 146, 60, 0.24), transparent 70%);
          filter: blur(8px);
          transform: translate(-50%, -50%);
          z-index: -1;
        }

        .sound-step-number::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          z-index: -1;
          height: 2.15rem;
          width: 2.15rem;
          border-radius: 999px;
          background:
            radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.92) 0 5%, transparent 8%),
            conic-gradient(from 28deg, transparent 0deg, rgba(255, 255, 255, 0.74) 26deg, rgb(var(--step-accent) / 0.82) 52deg, transparent 88deg, rgba(251, 146, 60, 0.7) 138deg, transparent 182deg, rgba(255, 255, 255, 0.54) 232deg, transparent 292deg);
          box-shadow:
            0 0 10px rgba(255, 255, 255, 0.24),
            0 0 18px rgb(var(--step-accent) / 0.34),
            0 0 20px rgb(var(--step-warm) / 0.18);
          filter: blur(0.35px) saturate(1.2);
          opacity: 0;
          pointer-events: none;
          transform: translate(-50%, -50%) rotate(-18deg) scale(0.45);
          animation: soundStepNumberExitPop var(--step-cycle) ease-out infinite;
          animation-delay: var(--step-delay);
          will-change: opacity, transform, filter;
        }

        .sound-step-label {
          position: relative;
          display: block;
          z-index: 1;
          text-shadow:
            0 2px 12px rgba(0, 0, 0, 0.78),
            0 0 16px rgb(var(--step-accent) / 0.38),
            0 0 22px rgba(251, 146, 60, 0.24);
          animation: soundStepLabelShift var(--step-cycle) cubic-bezier(0.22, 0.82, 0.18, 1) infinite;
          animation-delay: var(--step-delay);
          will-change: transform, opacity, filter;
        }

        .sound-step-card::after {
          content: "";
          position: absolute;
          inset: -35%;
          z-index: 3;
          background:
            linear-gradient(
              115deg,
              transparent 34%,
              rgba(255, 255, 255, 0.2) 43%,
              rgb(var(--step-accent) / 0.28) 49%,
              transparent 62%
            ),
            radial-gradient(circle at 52% 50%, rgb(var(--step-warm) / 0.1), transparent 28%);
          opacity: 0;
          transform: translateX(-70%) rotate(8deg);
          animation: soundStepShine var(--step-cycle) ease-in-out infinite;
          animation-delay: var(--step-delay);
          pointer-events: none;
        }

        .sound-step-card:nth-child(2) {
          --step-accent: 251 113 133;
          --step-warm: 45 212 191;
          --step-delay: -12s;
        }

        .sound-step-card:nth-child(3) {
          --step-accent: 52 211 153;
          --step-warm: 250 204 21;
          --step-delay: -6s;
        }

        /* Carousel heartbeat: three dots synced to the card cycle, each
           glowing in its card's accent while that card holds the stage. */
        .sound-step-dots {
          position: absolute;
          bottom: 0.4rem;
          left: 50%;
          z-index: 6;
          display: flex;
          gap: 0.44rem;
          transform: translateX(-50%);
          pointer-events: none;
        }

        .sound-step-dot {
          --step-accent: 34 211 238;
          height: 0.3rem;
          width: 0.3rem;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.32);
          animation: soundStepDot var(--step-cycle, 18s) ease-in-out infinite;
        }

        .sound-step-dot:nth-child(2) {
          --step-accent: 251 113 133;
          animation-delay: -12s;
        }

        .sound-step-dot:nth-child(3) {
          --step-accent: 52 211 153;
          animation-delay: -6s;
        }

        @keyframes soundStepDot {
          0%,
          40%,
          100% {
            background: rgba(148, 163, 184, 0.32);
            box-shadow: none;
            transform: scale(1);
          }
          3.5%,
          29.5% {
            background: rgb(var(--step-accent) / 0.95);
            box-shadow: 0 0 8px rgb(var(--step-accent) / 0.65);
            transform: scale(1.3);
          }
          34% {
            background: rgba(148, 163, 184, 0.32);
            box-shadow: none;
            transform: scale(1);
          }
        }

        /* Wake the motion box as the crest lands so the intro reads as one
           choreographed sequence instead of everything firing at once. */
        main[data-onboarding-stage="welcome"] .sound-step-orbit {
          animation: soundStepOrbitWake 900ms cubic-bezier(0.22, 0.9, 0.32, 1) 2050ms both;
        }

        @keyframes soundStepOrbitWake {
          0% {
            opacity: 0;
            transform: translateY(0.55rem) scale(0.985);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes soundMemberLoginHighlight {
          0%,
          100% {
            background-position: 0% 52%;
            filter: brightness(1.04) saturate(1.08);
          }
          42% {
            background-position: 100% 46%;
            filter: brightness(1.16) saturate(1.2);
          }
          68% {
            background-position: 58% 100%;
            filter: brightness(1.1) saturate(1.14);
          }
        }

        @keyframes soundAppStartGradient {
          0%,
          34%,
          100% {
            background-position: 0% 46%;
            border-color: rgba(207, 250, 254, 0.82);
            box-shadow:
              0 0 0 1px rgba(255, 255, 255, 0.24),
              0 0 34px rgba(34, 211, 238, 0.34),
              0 16px 38px rgba(8, 47, 73, 0.34),
              inset 0 1px 0 rgba(255, 255, 255, 0.72),
              inset 0 -10px 22px rgba(8, 47, 73, 0.18);
            filter: saturate(1.04) brightness(1);
          }
          48% {
            background-position: 56% 50%;
            border-color: rgba(255, 255, 255, 0.92);
            box-shadow:
              0 0 0 1px rgba(255, 255, 255, 0.3),
              0 0 46px rgba(125, 249, 255, 0.42),
              0 18px 44px rgba(14, 165, 233, 0.28),
              inset 0 1px 0 rgba(255, 255, 255, 0.76),
              inset 0 -10px 22px rgba(8, 47, 73, 0.14);
            filter: saturate(1.12) brightness(1.06);
          }
          58%,
          78% {
            background-position: 100% 54%;
            border-color: rgba(254, 240, 138, 0.86);
            box-shadow:
              0 0 0 1px rgba(255, 255, 255, 0.22),
              0 0 38px rgba(251, 146, 60, 0.42),
              0 18px 44px rgba(154, 52, 18, 0.28),
              inset 0 1px 0 rgba(255, 255, 255, 0.7),
              inset 0 -10px 22px rgba(154, 52, 18, 0.18);
            filter: saturate(1.16) brightness(1.02);
          }
          88% {
            background-position: 44% 48%;
            border-color: rgba(255, 255, 255, 0.88);
            box-shadow:
              0 0 0 1px rgba(255, 255, 255, 0.25),
              0 0 42px rgba(103, 232, 249, 0.4),
              0 16px 38px rgba(8, 47, 73, 0.34),
              inset 0 1px 0 rgba(255, 255, 255, 0.72),
              inset 0 -10px 22px rgba(8, 47, 73, 0.16);
          }
        }

        @keyframes soundShellBorderSweep {
          0% {
            --sound-shell-angle: 0deg;
          }
          100% {
            --sound-shell-angle: 360deg;
          }
        }

        @keyframes soundShellBorderBreath {
          0%,
          100% {
            opacity: 0.34;
            filter: brightness(0.92);
          }
          44% {
            opacity: 0.64;
            filter: brightness(1.2);
          }
          72% {
            opacity: 0.42;
            filter: brightness(1.06);
          }
        }

        @keyframes soundAppStartAura {
          0%,
          34%,
          100% {
            opacity: 0.9;
            transform: scale(1);
            background:
              radial-gradient(circle at 20% 40%, rgba(255, 255, 255, 0.46), transparent 14%),
              radial-gradient(circle at 76% 54%, rgba(103, 232, 249, 0.58), transparent 30%),
              radial-gradient(circle at 50% 50%, rgba(14, 165, 233, 0.36), transparent 70%);
          }
          48% {
            opacity: 1;
            transform: scale(1.08);
            background:
              radial-gradient(circle at 26% 44%, rgba(255, 255, 255, 0.58), transparent 16%),
              radial-gradient(circle at 72% 42%, rgba(125, 249, 255, 0.68), transparent 33%),
              radial-gradient(circle at 50% 50%, rgba(34, 211, 238, 0.44), transparent 74%);
          }
          58%,
          78% {
            opacity: 0.98;
            transform: scale(1.04);
            background:
              radial-gradient(circle at 21% 40%, rgba(255, 255, 255, 0.42), transparent 14%),
              radial-gradient(circle at 76% 54%, rgba(251, 146, 60, 0.62), transparent 30%),
              radial-gradient(circle at 50% 50%, rgba(250, 204, 21, 0.4), transparent 72%);
          }
        }

        @keyframes soundAppStartSheen {
          0%,
          18% {
            opacity: 0.32;
            transform: translateX(-42%) rotate(9deg);
            filter: hue-rotate(0deg) brightness(1);
          }
          34% {
            opacity: 0.72;
            transform: translateX(2%) rotate(9deg);
            filter: hue-rotate(0deg) brightness(1.12);
          }
          48% {
            opacity: 0.38;
            transform: translateX(38%) rotate(9deg);
          }
          58% {
            opacity: 0.2;
            transform: translateX(-36%) rotate(-10deg);
            filter: hue-rotate(146deg) brightness(1.08);
          }
          72% {
            opacity: 0.68;
            transform: translateX(14%) rotate(-10deg);
            filter: hue-rotate(146deg) brightness(1.22);
          }
          88%,
          100% {
            opacity: 0.24;
            transform: translateX(46%) rotate(-10deg);
            filter: hue-rotate(0deg) brightness(1);
          }
        }

        @keyframes soundAppStartContent {
          0%,
          50%,
          100% {
            transform: translateY(0);
            filter: brightness(1);
          }
          14%,
          66% {
            transform: translateY(-1px);
            filter: brightness(1.08);
          }
        }

        @keyframes soundAppStartGlyph {
          0%,
          40%,
          100% {
            color: #042f3a;
            transform: rotate(0deg) scale(1);
            filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.42));
          }
          50% {
            transform: rotate(18deg) scale(1.12);
            filter: drop-shadow(0 0 12px rgba(125, 249, 255, 0.78));
          }
          64%,
          80% {
            color: #241006;
            transform: rotate(-12deg) scale(1.08);
            filter: drop-shadow(0 0 12px rgba(254, 240, 138, 0.74));
          }
        }

        @keyframes soundAppStartDiamond {
          0%,
          9%,
          32%,
          100% {
            opacity: 0;
            background:
              radial-gradient(circle at 35% 30%, #ffffff 0 15%, #cffafe 30%, #22d3ee 62%, transparent 76%),
              linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(103, 232, 249, 0.86));
            box-shadow:
              0 0 10px rgba(255, 255, 255, 0.95),
              0 0 18px rgba(34, 211, 238, 0.7);
            transform: translate(-50%, -50%) rotate(45deg) scale(0.18);
          }
          14% {
            opacity: 1;
            transform: translate(-50%, -50%) rotate(45deg) scale(1.16);
          }
          23% {
            opacity: 0.22;
            transform: translate(-50%, -50%) rotate(110deg) scale(0.4);
          }
          54% {
            opacity: 0;
            background:
              radial-gradient(circle at 35% 30%, #ffffff 0 15%, #fef3c7 30%, #fb923c 62%, transparent 76%),
              linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(251, 146, 60, 0.88));
            box-shadow:
              0 0 10px rgba(255, 255, 255, 0.88),
              0 0 18px rgba(251, 146, 60, 0.72);
            transform: translate(-50%, -50%) rotate(45deg) scale(0.16);
          }
          64% {
            opacity: 1;
            background:
              radial-gradient(circle at 35% 30%, #ffffff 0 15%, #fef3c7 30%, #fb923c 62%, transparent 76%),
              linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(251, 146, 60, 0.88));
            box-shadow:
              0 0 11px rgba(255, 255, 255, 0.9),
              0 0 22px rgba(251, 146, 60, 0.76);
            transform: translate(-50%, -50%) rotate(-25deg) scale(1);
          }
          75% {
            opacity: 0.16;
            transform: translate(-50%, -50%) rotate(-105deg) scale(0.34);
          }
        }

        @keyframes soundLogoFlyIn {
          0% {
            opacity: 0;
            filter: blur(8px) brightness(1.5) saturate(1.25);
            transform: translate3d(-24vw, 9vh, 0) scale(0.34) rotate(-8deg);
          }
          30% {
            opacity: 1;
            filter: blur(2.5px) brightness(1.3) saturate(1.16);
          }
          62% {
            filter: blur(0) brightness(1.16) saturate(1.08);
            transform: translate3d(0.9rem, -0.55rem, 0) scale(1.055) rotate(1.6deg);
          }
          82% {
            filter: brightness(1.07) saturate(1.03);
            transform: translate3d(-0.28rem, 0.14rem, 0) scale(0.986) rotate(-0.5deg);
          }
          100% {
            opacity: 1;
            filter: brightness(1) saturate(1);
            transform: translate3d(0, 0, 0) scale(1) rotate(0deg);
          }
        }

        /* Loop flight: offset-distance only at 0%/100% so the motion runs on
           one unbroken easing; the intermediate frames stage opacity, blur,
           and scale without touching the path position. */
        @keyframes soundLogoLoopFlyIn {
          0% {
            offset-distance: 0%;
            opacity: 0;
            filter: blur(7px) brightness(1.45) saturate(1.24);
            transform: scale(0.3);
          }
          10% {
            opacity: 1;
          }
          26% {
            filter: blur(0) brightness(1.22) saturate(1.12);
            transform: scale(0.8);
          }
          56% {
            transform: scale(0.92);
          }
          88% {
            filter: brightness(1.06) saturate(1.03);
            transform: scale(1.045);
          }
          100% {
            offset-distance: 100%;
            opacity: 1;
            filter: brightness(1) saturate(1);
            transform: scale(1);
          }
        }

        @keyframes soundLogoTrail {
          0% {
            offset-distance: 0%;
            opacity: 0;
          }
          8% {
            opacity: var(--trail-peak, 0.8);
          }
          60% {
            opacity: calc(var(--trail-peak, 0.8) * 0.6);
          }
          92% {
            opacity: 0;
          }
          100% {
            offset-distance: 100%;
            opacity: 0;
          }
        }

        @keyframes soundLogoTrailTwinkle {
          0% {
            transform: translate(var(--trail-scatter-x), var(--trail-scatter-y)) rotate(0deg) scale(0.72);
          }
          100% {
            transform: translate(var(--trail-scatter-x), var(--trail-scatter-y)) rotate(32deg) scale(1.22);
          }
        }

        @keyframes soundLogoHalo {
          0% {
            opacity: 0;
            transform: scale(0.55);
          }
          70% {
            opacity: 1;
            transform: scale(1.07);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes soundLogoOrbitIn {
          0% {
            opacity: 0;
            transform: scale(0.72) rotate(-90deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }

        @keyframes soundLogoComet {
          0% {
            opacity: 0;
            transform: translate3d(-16vw, -8vh, 0) scale(0.55);
          }
          35% {
            opacity: 0.55;
            transform: translate3d(-6vw, -3vh, 0) scale(0.85);
          }
          75% {
            opacity: 0.3;
            transform: translate3d(0.5rem, -0.25rem, 0) scale(1.08);
          }
          100% {
            opacity: 0;
            transform: translate3d(0, 0, 0) scale(1.15);
          }
        }

        @keyframes soundLogoCirclePulse {
          0%,
          7%,
          34%,
          100% {
            opacity: 0;
            transform: scale(0.78);
            filter: brightness(0.94);
          }
          11% {
            opacity: 0.52;
            transform: scale(0.94);
            filter: brightness(1.12);
          }
          18% {
            opacity: 0.22;
            transform: scale(1.16);
            filter: brightness(1.04);
          }
          26% {
            opacity: 0;
            transform: scale(1.28);
            filter: brightness(0.96);
          }
        }

        @keyframes soundLogoEntranceSparkle {
          0%,
          6% {
            opacity: 0;
            transform: translate(
                calc(-50% - 11rem),
                calc(-50% + 2rem)
              )
              scale(0.14)
              rotate(0deg);
          }
          18% {
            opacity: 1;
            transform: translate(
                calc(-50% - 5.6rem),
                calc(-50% - 5.6rem)
              )
              scale(1.8)
              rotate(42deg);
          }
          32% {
            opacity: 0.96;
            transform: translate(
                calc(-50% + 1.5rem),
                calc(-50% - 6.4rem)
              )
              scale(1.42)
              rotate(126deg);
          }
          48% {
            opacity: 1;
            transform: translate(
                calc(-50% + 5.6rem),
                calc(-50% - 1.1rem)
              )
              scale(2.08)
              rotate(214deg);
          }
          68% {
            opacity: 0.9;
            transform: translate(
                calc(-50% + var(--spark-drift-x) * 1.65),
                calc(-50% + var(--spark-drift-y) * 1.65)
              )
              scale(1.34)
              rotate(306deg);
          }
          82% {
            opacity: 0.54;
            transform: translate(
                calc(-50% + var(--spark-drift-x) * 0.68),
                calc(-50% + var(--spark-drift-y) * 0.68)
              )
              scale(0.88)
              rotate(404deg);
          }
          92% {
            opacity: 0.3;
            transform: translate(
                calc(-50% + var(--spark-drift-x) * 0.28),
                calc(-50% + var(--spark-drift-y) * 0.28)
              )
              scale(0.58)
              rotate(458deg);
          }
          100% {
            opacity: 0.18;
            transform: translate(-50%, -50%) scale(0.42) rotate(360deg);
          }
        }

        @keyframes soundLogoSparkle {
          0%,
          100% {
            opacity: 0.16;
            transform: translate(-50%, -50%) scale(0.42) rotate(0deg);
          }
          6%,
          58% {
            opacity: 0.22;
            transform: translate(
                calc(-50% + var(--spark-drift-x) * 0.08),
                calc(-50% + var(--spark-drift-y) * 0.08)
              )
              scale(0.54)
              rotate(18deg);
          }
          13% {
            opacity: 0.58;
            transform: translate(
                calc(-50% + var(--spark-drift-x) * 0.28),
                calc(-50% + var(--spark-drift-y) * 0.28)
              )
              scale(1)
              rotate(38deg);
          }
          24% {
            opacity: 0.34;
            transform: translate(
                calc(-50% + var(--spark-drift-x)),
                calc(-50% + var(--spark-drift-y))
              )
              scale(0.68)
              rotate(150deg);
          }
          42% {
            opacity: 0.18;
            transform: translate(
                calc(-50% + var(--spark-drift-x) * 0.54),
                calc(-50% + var(--spark-drift-y) * 0.54)
              )
              scale(0.5)
              rotate(260deg);
          }
        }

        @keyframes soundQuestionLogoShimmer {
          0%,
          100% {
            filter: brightness(1) saturate(1)
              drop-shadow(0 10px 18px rgba(0, 0, 0, 0.38));
            transform: scale(1);
          }
          42% {
            filter: brightness(1.12) saturate(1.12)
              drop-shadow(0 0 20px rgba(125, 249, 255, 0.32))
              drop-shadow(0 12px 18px rgba(0, 0, 0, 0.34));
            transform: scale(1.035);
          }
          68% {
            filter: brightness(1.06) saturate(1.08)
              drop-shadow(0 0 16px rgba(250, 204, 21, 0.16))
              drop-shadow(0 12px 18px rgba(0, 0, 0, 0.36));
            transform: scale(0.985);
          }
        }

        @keyframes soundQuestionLogoGlow {
          0%,
          100% {
            opacity: 0.68;
            transform: scale(1);
            filter: brightness(0.98);
          }
          48% {
            opacity: 1;
            transform: scale(1.045);
            filter: brightness(1.14);
          }
        }

        @keyframes soundQuestionLogoCircle {
          0%,
          8%,
          38%,
          100% {
            opacity: 0;
            transform: scale(0.88);
            filter: brightness(0.94);
          }
          12% {
            opacity: 0.48;
            transform: scale(0.98);
            filter: brightness(1.14);
          }
          22% {
            opacity: 0.18;
            transform: scale(1.22);
            filter: brightness(1.04);
          }
          32% {
            opacity: 0;
            transform: scale(1.36);
            filter: brightness(0.96);
          }
        }

        @keyframes soundQuestionLogoSparkle {
          0%,
          10%,
          38%,
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.18) rotate(0deg);
          }
          15% {
            opacity: 0.72;
            transform: translate(-50%, -50%) scale(1) rotate(34deg);
          }
          25% {
            opacity: 0.24;
            transform: translate(-50%, -50%) scale(0.5) rotate(140deg);
          }
        }

        @keyframes soundTrustPulse {
          0%,
          3%,
          24%,
          100% {
            filter: brightness(1) saturate(1);
            transform: translateY(0) scale(1);
          }
          7% {
            filter: brightness(1.14) saturate(1.18);
            transform: translateY(-2px) scale(1.075);
            box-shadow:
              0 0 0 1px rgb(var(--chip-accent) / 0.4),
              0 16px 32px rgb(var(--chip-accent) / 0.18),
              0 0 32px rgb(var(--chip-accent) / 0.28),
              0 0 46px rgb(var(--chip-accent) / 0.16),
              inset 0 1px 0 rgba(255, 255, 255, 0.24);
          }
          12%,
          18% {
            filter: brightness(1.24) saturate(1.26);
            transform: translateY(-3px) scale(1.14);
            box-shadow:
              0 0 0 1px rgb(var(--chip-accent) / 0.52),
              0 20px 42px rgb(var(--chip-accent) / 0.24),
              0 0 48px rgb(var(--chip-accent) / 0.34),
              0 0 74px rgb(var(--chip-accent) / 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.32),
              inset 0 -12px 22px rgb(var(--chip-accent) / 0.16);
          }
          22% {
            filter: brightness(1.08) saturate(1.1);
            transform: translateY(-1px) scale(1.045);
          }
        }

        @keyframes soundTrustAura {
          0%,
          4%,
          24%,
          100% {
            opacity: 0;
            transform: scale(0.88);
          }
          8% {
            opacity: 0.48;
            transform: scale(1.02);
          }
          13%,
          18% {
            opacity: 0.76;
            transform: scale(1.18);
          }
          22% {
            opacity: 0.22;
            transform: scale(1.03);
          }
        }

        @keyframes soundTrustSheen {
          0%,
          7%,
          24%,
          100% {
            opacity: 0;
            transform: translateX(-58%) rotate(8deg);
          }
          12% {
            opacity: 0.46;
          }
          20% {
            opacity: 0.18;
            transform: translateX(58%) rotate(8deg);
          }
        }

        @keyframes soundTrustSparkle {
          0%,
          7%,
          24%,
          100% {
            opacity: 0;
            transform: translate3d(0, 0, 0) scale(0.38);
          }
          10% {
            opacity: 0.34;
            transform: translate3d(
                calc(var(--spark-x) * 0.18),
                calc(var(--spark-y) * 0.18),
                0
              )
              scale(0.72);
          }
          15% {
            opacity: 0.88;
            transform: translate3d(
                calc(var(--spark-x) * 0.52),
                calc(var(--spark-y) * 0.52),
                0
              )
              scale(1.25)
              rotate(42deg);
          }
          19% {
            opacity: 0.44;
            transform: translate3d(
                calc(var(--spark-x) * 1.05),
                calc(var(--spark-y) * 1.05),
                0
              )
              scale(0.7)
              rotate(120deg);
          }
          22% {
            opacity: 0;
            transform: translate3d(
                calc(var(--spark-x) * 1.24),
                calc(var(--spark-y) * 1.24),
                0
              )
              scale(0.32)
              rotate(180deg);
          }
        }

        @keyframes soundTrustBubbleRest {
          0%,
          100% {
            opacity: 0.2;
            filter: blur(0.1px) saturate(1.04);
            translate: var(--bubble-x) var(--bubble-y);
          }
          32% {
            opacity: 0.5;
            filter: blur(0) saturate(1.18);
            translate: calc(var(--bubble-x) + 0.14rem) calc(var(--bubble-y) - 0.22rem);
          }
          66% {
            opacity: 0.34;
            filter: blur(0.1px) saturate(1.12);
            translate: calc(var(--bubble-x) - 0.12rem) calc(var(--bubble-y) + 0.12rem);
          }
        }

        @keyframes soundTrustBubbleBurst {
          0%,
          6%,
          24%,
          100% {
            box-shadow:
              0 0 8px rgb(var(--chip-accent) / 0.32),
              inset 0 0 5px rgba(255, 255, 255, 0.18);
            transform: scale(0.72);
          }
          10% {
            box-shadow:
              0 0 14px rgb(var(--chip-accent) / 0.5),
              0 0 20px rgb(var(--chip-accent) / 0.22),
              inset 0 0 7px rgba(255, 255, 255, 0.28);
            transform: translate3d(calc(var(--burst-x) * 0.24), calc(var(--burst-y) * 0.24), 0) scale(1.08);
          }
          15%,
          18% {
            box-shadow:
              0 0 20px rgb(var(--chip-accent) / 0.66),
              0 0 34px rgb(var(--chip-accent) / 0.32),
              inset 0 0 9px rgba(255, 255, 255, 0.36);
            transform: translate3d(var(--burst-x), var(--burst-y), 0) scale(1.68);
          }
          22% {
            box-shadow:
              0 0 8px rgb(var(--chip-accent) / 0.24),
              inset 0 0 5px rgba(255, 255, 255, 0.16);
            transform: translate3d(calc(var(--burst-x) * 1.18), calc(var(--burst-y) * 1.18), 0) scale(0.58);
          }
        }

        @keyframes soundStepBackdropFlux {
          0%,
          22%,
          100% {
            border-color: rgb(var(--step-accent) / 0.34);
            box-shadow:
              0 22px 58px rgba(0, 0, 0, 0.38),
              0 0 44px rgb(var(--step-accent) / 0.22),
              0 0 66px rgb(var(--step-warm) / 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.16);
          }
          30%,
          78% {
            border-color: rgba(125, 249, 255, 0.1);
            box-shadow:
              0 13px 34px rgba(0, 0, 0, 0.34),
              0 0 18px rgb(var(--step-accent) / 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.08);
          }
          90% {
            border-color: rgb(var(--step-accent) / 0.2);
            box-shadow:
              0 17px 44px rgba(0, 0, 0, 0.36),
              0 0 28px rgb(var(--step-accent) / 0.14),
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
          }
        }

        @keyframes soundStepPhotoDrift {
          0%,
          22%,
          100% {
            filter: saturate(1.34) contrast(1.18) brightness(0.88) hue-rotate(-6deg);
            transform: scale(1.08) translate3d(0, 0, 0);
          }
          30%,
          78% {
            filter: saturate(1.02) contrast(1.08) brightness(0.62) hue-rotate(-10deg);
            transform: scale(1.14) translate3d(-1.4%, 0, 0);
          }
          90% {
            filter: saturate(1.18) contrast(1.12) brightness(0.72) hue-rotate(-8deg);
            transform: scale(1.11) translate3d(1%, 0, 0);
          }
        }

        @keyframes soundStepPortalWash {
          0%,
          20%,
          100% {
            opacity: 0.24;
            transform: rotate(0deg) scale(0.92);
          }
          27% {
            opacity: 0.07;
            transform: rotate(68deg) scale(1.05);
          }
          36%,
          74% {
            opacity: 0;
            transform: rotate(128deg) scale(1.14);
          }
          88% {
            opacity: 0.14;
            transform: rotate(248deg) scale(1.02);
          }
        }

        @keyframes soundStepEdgeSweep {
          0%,
          13% {
            opacity: 0;
            transform: translateX(-48%) rotate(7deg);
          }
          18% {
            opacity: 0.42;
          }
          27%,
          100% {
            opacity: 0;
            transform: translateX(54%) rotate(7deg);
          }
        }

        @keyframes soundStepSurfaceGlow {
          0%,
          22%,
          100% {
            opacity: 0.58;
            filter: brightness(1.08);
          }
          30%,
          78% {
            opacity: 0.18;
            filter: brightness(0.82);
          }
          90% {
            opacity: 0.36;
            filter: brightness(0.96);
          }
        }

        @keyframes soundStepNumberHalo {
          0% {
            opacity: 0.78;
            transform: rotate(0deg) scale(0.96);
            filter: blur(2.4px) brightness(1);
          }
          35% {
            opacity: 1;
            transform: rotate(150deg) scale(1.18);
            filter: blur(2px) brightness(1.28);
          }
          70% {
            opacity: 0.92;
            transform: rotate(270deg) scale(1.06);
            filter: blur(2.4px) brightness(1.14);
          }
          100% {
            opacity: 0.78;
            transform: rotate(360deg) scale(0.96);
            filter: blur(2.4px) brightness(1);
          }
        }

        @keyframes soundStepCardFrameHold {
          0% {
            z-index: 3;
            transform: translate3d(-50%, -50%, 0) scale(0.985);
          }
          2.5% {
            z-index: 3;
            transform: translate3d(-50%, -50%, 0) scale(1) rotateX(0deg) rotateY(0deg);
          }
          12% {
            z-index: 3;
            transform: translate3d(-50%, calc(-50% - 0.14rem), 0) scale(1.004) rotateX(1.1deg) rotateY(-1deg);
          }
          21% {
            z-index: 3;
            transform: translate3d(-50%, calc(-50% + 0.1rem), 0) scale(0.998) rotateX(-0.9deg) rotateY(0.9deg);
          }
          30.5% {
            z-index: 3;
            transform: translate3d(-50%, -50%, 0) scale(1) rotateX(0deg) rotateY(0deg);
          }
          34% {
            z-index: 1;
            transform: translate3d(-50%, -50%, 0) scale(0.985);
          }
          100% {
            z-index: 0;
            transform: translate3d(-50%, -50%, 0) scale(0.985);
          }
        }

        @keyframes soundStepFillFade {
          0%,
          100% {
            opacity: 0.08;
          }
          6% {
            opacity: 0.84;
          }
          10%,
          29% {
            opacity: 1;
          }
          34% {
            opacity: 0.16;
          }
          40% {
            opacity: 0.08;
          }
        }

        @keyframes soundStepCenterIgnition {
          0%,
          100% {
            opacity: 0.08;
            filter: blur(24px) saturate(1.04) brightness(0.82);
            transform: translate(calc(-50% - 1.25rem), calc(-50% + 0.38rem)) scale(0.72);
          }
          6% {
            opacity: 0.16;
            filter: blur(22px) saturate(1.12) brightness(0.9);
            transform: translate(calc(-50% - 0.46rem), calc(-50% + 0.12rem)) scale(0.84);
          }
          8% {
            opacity: 0.9;
            filter: blur(14px) saturate(1.36) brightness(1.12);
            transform: translate(-50%, -50%) scale(1.02);
          }
          10%,
          31% {
            opacity: 1;
            filter: blur(12px) saturate(1.55) brightness(1.28);
            transform: translate(-50%, -50%) scale(1.14);
          }
          34% {
            opacity: 0.56;
            filter: blur(17px) saturate(1.24) brightness(1);
            transform: translate(calc(-50% + 0.62rem), calc(-50% - 0.2rem)) scale(1.02);
          }
          38% {
            opacity: 0.34;
            filter: blur(21px) saturate(1.12) brightness(0.9);
            transform: translate(calc(-50% + 1.08rem), calc(-50% - 0.34rem)) scale(1.16);
          }
          50% {
            opacity: 0.2;
            filter: blur(26px) saturate(1.08) brightness(0.84);
            transform: translate(calc(-50% + 1.72rem), calc(-50% - 0.58rem)) scale(1.36);
          }
          66% {
            opacity: 0.13;
            filter: blur(30px) saturate(1.02) brightness(0.78);
            transform: translate(calc(-50% + 2.22rem), calc(-50% - 0.82rem)) scale(1.54);
          }
          84% {
            opacity: 0.09;
            filter: blur(34px) saturate(0.96) brightness(0.72);
            transform: translate(calc(-50% + 2.68rem), calc(-50% - 1rem)) scale(1.72);
          }
        }

        @keyframes soundStepCenterRing {
          0% {
            opacity: 0;
            filter: blur(2px) saturate(1) brightness(0.9);
            transform: translate(-50%, -50%) rotate(0deg) scale(0.72);
          }
          6% {
            opacity: 0.14;
            filter: blur(2px) saturate(1.06) brightness(0.95);
            transform: translate(-50%, -50%) rotate(26deg) scale(0.82);
          }
          8% {
            opacity: 0.82;
            filter: blur(1.8px) saturate(1.28) brightness(1.2);
            transform: translate(-50%, -50%) rotate(38deg) scale(0.96);
          }
          12% {
            opacity: 1;
            filter: blur(1.45px) saturate(1.4) brightness(1.34);
            transform: translate(-50%, -50%) rotate(236deg) scale(1.12);
          }
          18% {
            opacity: 1;
            filter: blur(1.35px) saturate(1.44) brightness(1.38);
            transform: translate(-50%, -50%) rotate(456deg) scale(1.16);
          }
          24% {
            opacity: 0.98;
            filter: blur(1.48px) saturate(1.38) brightness(1.32);
            transform: translate(-50%, -50%) rotate(684deg) scale(1.1);
          }
          29% {
            opacity: 0.92;
            filter: blur(1.72px) saturate(1.3) brightness(1.2);
            transform: translate(-50%, -50%) rotate(900deg) scale(1.14);
          }
          33% {
            opacity: 0.42;
            filter: blur(2.6px) saturate(1.18) brightness(1.04);
            transform: translate(-50%, -50%) rotate(1080deg) scale(0.98);
          }
          45% {
            opacity: 0.24;
            filter: blur(4px) saturate(1.08) brightness(0.94);
            transform: translate(calc(-50% + 0.5rem), calc(-50% - 0.18rem)) rotate(1240deg) scale(1.2);
          }
          62% {
            opacity: 0.13;
            filter: blur(6px) saturate(1) brightness(0.84);
            transform: translate(calc(-50% + 0.9rem), calc(-50% - 0.36rem)) rotate(1420deg) scale(1.38);
          }
          82% {
            opacity: 0.07;
            filter: blur(8px) saturate(0.94) brightness(0.76);
            transform: translate(calc(-50% + 1.2rem), calc(-50% - 0.52rem)) rotate(1620deg) scale(1.56);
          }
          100% {
            opacity: 0;
            filter: blur(10px) saturate(0.9) brightness(0.7);
            transform: translate(calc(-50% + 1.44rem), calc(-50% - 0.68rem)) rotate(1800deg) scale(1.72);
          }
        }

        @keyframes soundStepNumberShift {
          0%,
          100% {
            opacity: 0.08;
            filter: blur(3.5px) brightness(0.68);
            transform: translate3d(-5.1rem, -0.42rem, -42px) scale(0.72);
          }
          5% {
            opacity: 0.72;
            filter: blur(1.1px) brightness(0.98);
            transform: translate3d(-1.55rem, -0.18rem, -12px) scale(0.92);
          }
          8%,
          31% {
            opacity: 1;
            filter: blur(0) brightness(1.22);
            transform: translate3d(0, 0, 62px) scale(1.14);
          }
          35% {
            opacity: 0.62;
            filter: blur(1.2px) brightness(0.92);
            transform: translate3d(1.25rem, -0.22rem, -12px) scale(0.92);
          }
          40% {
            opacity: 0.08;
            filter: blur(3.5px) brightness(0.66);
            transform: translate3d(4.6rem, -0.48rem, -42px) scale(0.72);
          }
        }

        @keyframes soundStepNumberExitPop {
          0%,
          32.5%,
          100% {
            opacity: 0;
            filter: blur(0.8px) saturate(1) brightness(0.82);
            transform: translate(-50%, -50%) rotate(-18deg) scale(0.45);
          }
          34.8% {
            opacity: 0.2;
            filter: blur(0.55px) saturate(1.14) brightness(1.08);
            transform: translate(-50%, -50%) rotate(8deg) scale(0.62);
          }
          36.5% {
            opacity: 0.86;
            filter: blur(0.2px) saturate(1.28) brightness(1.34);
            transform: translate(-50%, -50%) rotate(58deg) scale(0.98);
          }
          39% {
            opacity: 0;
            filter: blur(1px) saturate(1.04) brightness(0.96);
            transform: translate(-50%, -50%) rotate(116deg) scale(1.38);
          }
        }

        @keyframes soundStepLabelShift {
          0%,
          100% {
            opacity: 0.1;
            filter: blur(3.2px) brightness(0.7);
            transform: translate3d(-4.3rem, 0.72rem, -46px) scale(0.82);
          }
          6% {
            opacity: 0.58;
            filter: blur(1.1px) brightness(0.94);
            transform: translate3d(-1.5rem, 0.34rem, -14px) scale(0.92);
          }
          10%,
          33% {
            opacity: 1;
            filter: blur(0) brightness(1.18);
            transform: translate3d(0, 0, 44px) scale(1.02);
          }
          36% {
            opacity: 0.58;
            filter: blur(1.1px) brightness(0.9);
            transform: translate3d(1.45rem, 0.36rem, -14px) scale(0.92);
          }
          41% {
            opacity: 0.1;
            filter: blur(3.2px) brightness(0.68);
            transform: translate3d(4.2rem, 0.72rem, -46px) scale(0.82);
          }
        }

        @keyframes soundStepShine {
          0%,
          21% {
            opacity: 0;
            transform: translateX(-72%) rotate(8deg);
          }
          24% {
            opacity: 0.42;
          }
          34%,
          100% {
            opacity: 0;
            transform: translateX(72%) rotate(8deg);
          }
        }

        @keyframes soundQuestionPageIn {
          0% {
            opacity: 0;
            filter: blur(7px) brightness(0.86);
            transform: translateY(0.65rem) scale(0.986);
          }
          100% {
            opacity: 1;
            filter: blur(0) brightness(1);
            transform: translateY(0) scale(1);
          }
        }

        @keyframes soundOptionSelectionFlicker {
          0% {
            border-color: rgb(var(--option-accent) / 0.54);
            filter: brightness(1.02) saturate(1.06);
            transform: translateY(0) scale(1);
            box-shadow:
              0 0 0 1px rgb(var(--option-accent) / 0.12),
              0 0 20px rgb(var(--option-accent) / 0.2),
              0 14px 42px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.12);
          }
          32% {
            border-color: rgba(255, 255, 255, 0.84);
            filter: brightness(1.42) saturate(1.28);
            transform: translateY(-3px) scale(1.035);
            box-shadow:
              0 0 0 1px rgba(255, 255, 255, 0.36),
              0 0 26px rgb(var(--option-accent) / 0.54),
              0 0 62px rgb(var(--option-accent) / 0.34),
              0 18px 54px rgba(0, 0, 0, 0.36),
              inset 0 1px 0 rgba(255, 255, 255, 0.28);
          }
          62% {
            border-color: rgb(var(--option-accent) / 0.72);
            filter: brightness(1.18) saturate(1.16);
            transform: translateY(-1px) scale(1.012);
            box-shadow:
              0 0 0 1px rgb(var(--option-accent) / 0.18),
              0 0 30px rgb(var(--option-accent) / 0.3),
              0 16px 46px rgba(0, 0, 0, 0.32),
              inset 0 1px 0 rgba(255, 255, 255, 0.18);
          }
          82% {
            border-color: rgba(255, 255, 255, 0.66);
            filter: brightness(1.28) saturate(1.18);
            transform: translateY(-2px) scale(1.022);
            box-shadow:
              0 0 0 1px rgba(255, 255, 255, 0.24),
              0 0 34px rgb(var(--option-accent) / 0.36),
              0 0 50px rgb(var(--option-accent) / 0.22),
              0 18px 50px rgba(0, 0, 0, 0.34),
              inset 0 1px 0 rgba(255, 255, 255, 0.22);
          }
          100% {
            border-color: rgb(var(--option-accent) / 0.82);
            filter: brightness(1.16) saturate(1.14);
            transform: translateY(-1px) scale(1.018);
            box-shadow:
              0 0 0 1px rgb(var(--option-accent) / 0.2),
              0 0 34px rgb(var(--option-accent) / 0.32),
              0 16px 46px rgba(0, 0, 0, 0.34),
              inset 0 1px 0 rgba(255, 255, 255, 0.18);
          }
        }

        @keyframes soundOptionPhotoFlicker {
          0% {
            filter: saturate(1.18) contrast(1.12) brightness(0.58);
            opacity: 0.48;
            transform: scale(1.055);
          }
          32% {
            filter: saturate(1.34) contrast(1.2) brightness(0.82);
            opacity: 0.74;
            transform: scale(1.105);
          }
          62% {
            filter: saturate(1.24) contrast(1.14) brightness(0.7);
            opacity: 0.62;
            transform: scale(1.075);
          }
          82% {
            filter: saturate(1.3) contrast(1.18) brightness(0.76);
            opacity: 0.68;
            transform: scale(1.095);
          }
          100% {
            filter: saturate(1.26) contrast(1.16) brightness(0.7);
            opacity: 0.64;
            transform: scale(1.08);
          }
        }

        @keyframes soundOptionSelectionCore {
          0% {
            opacity: 0.28;
            transform: scale(1);
          }
          34% {
            opacity: 1;
            transform: scale(1.045);
          }
          64% {
            opacity: 0.58;
            transform: scale(0.995);
          }
          100% {
            opacity: 0.76;
            transform: scale(1.018);
          }
        }

        @keyframes soundOptionSelectionSweep {
          0% {
            opacity: 0;
            box-shadow:
              inset 0 0 34px rgb(var(--option-accent) / 0.08),
              inset -16rem 0 5rem rgb(var(--option-accent) / 0);
          }
          34% {
            opacity: 1;
            box-shadow:
              inset 0 0 42px rgb(var(--option-accent) / 0.24),
              inset 0 0 0 1px rgba(255, 255, 255, 0.24),
              inset 16rem 0 5rem rgb(var(--option-accent) / 0.18);
          }
          66% {
            opacity: 0.52;
            box-shadow:
              inset 0 0 34px rgb(var(--option-accent) / 0.14),
              inset -10rem 0 4rem rgba(255, 255, 255, 0.12);
          }
          100% {
            opacity: 0.92;
            box-shadow:
              inset 0 0 42px rgb(var(--option-accent) / 0.22),
              inset 0 0 0 1px rgb(var(--option-accent) / 0.2);
          }
        }

        @keyframes soundOptionSelectionCommit {
          0% {
            filter: brightness(1.2) saturate(1.18);
            transform: translateY(-2px) scale(1.025);
          }
          100% {
            filter: brightness(1.46) saturate(1.28);
            transform: translateY(-3px) scale(1.04);
          }
        }

        @keyframes soundOptionIconSelect {
          0% {
            transform: translateY(0) scale(1.03);
            filter: brightness(1.02);
          }
          34% {
            transform: translateY(-3px) scale(1.15);
            filter: brightness(1.22);
          }
          66% {
            transform: translateY(-1px) scale(1.06);
            filter: brightness(1.08);
          }
          100% {
            transform: translateY(-1px) scale(1.1);
            filter: brightness(1.14);
          }
        }

        @keyframes soundOptionSelectionSpark {
          0%,
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.18) rotate(0deg);
          }
          24% {
            opacity: 0.95;
            transform: translate(-50%, -50%) scale(1.35) rotate(42deg);
          }
          46% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.42) rotate(96deg);
          }
          78% {
            opacity: 0.68;
            transform: translate(-50%, -50%) scale(1.04) rotate(136deg);
          }
          92% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.28) rotate(196deg);
          }
        }

        @keyframes soundOptionMultiSelectSettle {
          0% {
            border-color: rgb(var(--option-accent) / 0.4);
            filter: brightness(1) saturate(1.04);
            transform: translateY(0) scale(1);
            box-shadow:
              0 0 0 1px rgb(var(--option-accent) / 0.08),
              0 12px 32px rgba(0, 0, 0, 0.26),
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
          }
          46% {
            border-color: rgba(207, 250, 254, 0.82);
            filter: brightness(1.26) saturate(1.16);
            transform: translateY(-1px) scale(1.018);
            box-shadow:
              0 0 0 1px rgba(207, 250, 254, 0.24),
              0 0 28px rgb(var(--option-accent) / 0.32),
              0 16px 40px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.22);
          }
          100% {
            border-color: rgb(var(--option-accent) / 0.68);
            filter: brightness(1.1) saturate(1.1);
            transform: translateY(0) scale(1.006);
            box-shadow:
              0 0 0 1px rgb(var(--option-accent) / 0.16),
              0 0 30px rgb(var(--option-accent) / 0.2),
              0 18px 42px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.14);
          }
        }

        @keyframes soundOptionMultiPhotoSettle {
          0% {
            filter: saturate(1.12) contrast(1.1) brightness(0.54);
            opacity: 0.46;
            transform: scale(1.045);
          }
          46% {
            filter: saturate(1.28) contrast(1.16) brightness(0.74);
            opacity: 0.66;
            transform: scale(1.085);
          }
          100% {
            filter: saturate(1.24) contrast(1.14) brightness(0.66);
            opacity: 0.6;
            transform: scale(1.065);
          }
        }

        @keyframes soundOptionMultiCoreSettle {
          0% {
            opacity: 0.22;
            transform: scale(0.98);
          }
          48% {
            opacity: 0.9;
            transform: scale(1.035);
          }
          100% {
            opacity: 0.7;
            transform: scale(1);
          }
        }

        @keyframes soundOptionMultiEdgeSettle {
          0% {
            box-shadow:
              inset 0 0 24px rgb(var(--option-accent) / 0.08),
              inset 0 0 0 1px rgb(var(--option-accent) / 0.08);
          }
          48% {
            box-shadow:
              inset 0 0 46px rgb(var(--option-accent) / 0.24),
              inset 0 0 0 1px rgba(207, 250, 254, 0.22),
              inset 0 -3rem 6rem rgb(var(--option-accent) / 0.14);
          }
          100% {
            box-shadow:
              inset 0 0 38px rgb(var(--option-accent) / 0.16),
              inset 0 0 0 1px rgb(var(--option-accent) / 0.18);
          }
        }

        @keyframes soundOptionMultiIconSettle {
          0% {
            transform: translateY(0) scale(1);
            filter: brightness(1);
          }
          46% {
            transform: translateY(-2px) scale(1.12);
            filter: brightness(1.18);
          }
          100% {
            transform: translateY(-1px) scale(1.05);
            filter: brightness(1.08);
          }
        }

        @keyframes soundOptionMultiSelectionSpark {
          0%,
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.14) rotate(0deg);
          }
          34% {
            opacity: 0.82;
            transform: translate(-50%, -50%) scale(1.08) rotate(36deg);
          }
          58% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.32) rotate(96deg);
          }
        }

        @keyframes soundProgressNodeGlow {
          0%,
          100% {
            transform: translateY(0) scale(1);
            filter: brightness(1);
          }
          48% {
            transform: translateY(-1px) scale(1.06);
            filter: brightness(1.12);
          }
        }

        @keyframes soundProgressAura {
          0%,
          100% {
            opacity: 0.52;
            transform: scale(0.86);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.12);
          }
        }

        @keyframes soundProgressRing {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes soundProgressSparkle {
          0%,
          18%,
          100% {
            opacity: 0;
            transform: scale(0.2) rotate(0deg);
          }
          25% {
            opacity: 1;
            transform: scale(1.25) rotate(45deg);
          }
          38% {
            opacity: 0;
            transform: scale(0.36) rotate(92deg);
          }
        }

        @keyframes soundPrizeGlow {
          0%,
          100% {
            transform: translateY(0) scale(1);
            filter: brightness(1) saturate(1.04);
          }
          42% {
            transform: translateY(-1px) scale(1.08);
            filter: brightness(1.16) saturate(1.14);
          }
          68% {
            transform: translateY(0) scale(1.02);
            filter: brightness(1.08) saturate(1.08);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sound-question-page,
          .sound-option-card,
          .sound-option-photo,
          .sound-option-icon-shell,
          .sound-option-selection-spark,
          .sound-option-card::before,
          .sound-option-card::after,
          .sound-assessment-link::before,
          .sound-assessment-link::after,
          .sound-member-login-link::before,
          .sound-member-login-link::after,
          .sound-utility-link-hover-icon,
          .sound-app-start-button,
          .sound-app-start-aura,
          .sound-app-start-sheen,
          .sound-app-start-content,
          .sound-app-start-content svg,
          .sound-app-start-diamond,
          .sound-onboarding-shell::before,
          .sound-onboarding-shell::after,
          .sound-logo-stage::before,
          .sound-logo-stage::after,
          .sound-logo-mark,
          .sound-logo-halo,
          .sound-logo-orbit,
          .sound-logo-comet,
          .sound-logo-sparkle,
          .sound-question-logo-stage::before,
          .sound-question-logo-stage::after,
          .sound-question-logo-halo,
          .sound-question-logo-orbit,
          .sound-question-logo-mark,
          .sound-question-logo-sparkle,
          .sound-progress-node,
          .sound-progress-node::before,
          .sound-progress-node::after,
          .sound-progress-spark,
          .sound-trust-chip,
          .sound-trust-chip::before,
          .sound-trust-chip::after,
          .sound-trust-bubble,
          .sound-trust-sparkle,
          .sound-step-content,
          .sound-step-content::before,
          .sound-step-content::after,
          .sound-step-label,
          .sound-step-number,
          .sound-step-number::after,
          .sound-step-card,
          .sound-step-card::before,
          .sound-step-card::after,
          .sound-step-photo,
          .sound-step-glass,
          .sound-step-glass::before,
          .sound-step-glass::after {
            animation: none;
          }

          .sound-question-page,
          .sound-question-page[data-transition-phase="fade"] {
            opacity: 1;
            filter: none;
            transform: none;
            transition: none;
          }

          .sound-app-start-button {
            background: linear-gradient(112deg, #67e8f9, #22d3ee 56%, #fb923c);
          }

          .sound-onboarding-shell::before,
          .sound-onboarding-shell::after {
            opacity: 0.34;
          }

          .sound-app-start-sheen,
          .sound-app-start-diamond {
            display: none;
          }

          .sound-trust-chip {
            transform: none;
          }

          .sound-logo-mark {
            offset-path: none;
          }

          .sound-logo-stage .sound-logo-trail {
            display: none;
          }

          .sound-trust-sparkle {
            display: none;
          }

          .sound-trust-bubble {
            display: none;
          }

          .sound-logo-sparkle {
            display: none;
          }

          .sound-question-logo-sparkle {
            display: none;
          }

          .sound-progress-spark {
            display: none;
          }

          .sound-step-orbit {
            display: grid;
            height: auto;
            gap: 0.75rem;
            mask-image: none;
            overflow: visible;
            animation: none;
            opacity: 1;
            transform: none;
          }

          .sound-step-dots {
            display: none;
          }

          .sound-step-card {
            position: relative;
            left: auto;
            top: auto;
            width: auto;
            min-height: 0;
            opacity: 1;
            filter: none;
            transform: none;
          }

          .sound-step-photo,
          .sound-step-glass,
          .sound-step-content,
          .sound-step-label,
          .sound-step-number {
            opacity: 1;
            filter: none;
            transform: none;
          }
        }

        /* ============================================================
           Option-card grid: explicit row heights.
           The cards previously relied on aspect-ratio + min-height:0,
           which lets grid auto-rows collapse to the content height while
           the card itself paints at full aspect height — on wide screens
           the rows overlap each other. Fix: give every grid variant an
           explicit, viewport-aware row height and make cards fill their
           track exactly. Rows scale with vh (short screens) and vw
           (narrow screens) so the grid fits the shell at any resolution.
           ============================================================ */
        .sound-option-grid {
          --option-row: clamp(6.4rem, min(19vh, 42vw), 10rem);
          grid-auto-rows: var(--option-row);
        }

        @media (min-width: 760px) {
          .sound-option-grid {
            --option-row: clamp(6.4rem, min(19vh, 24vw), 9.5rem);
          }
        }

        .sound-option-grid[data-option-count="9"] {
          --option-row: clamp(4.6rem, min(11vh, 24vw), 6.2rem);
        }

        /* Desktop (>1100): tighten the grid's top margin so the tallest
           steps (multi-select with Next, 9-option) clear the frame. */
        @media (min-width: 1101px) {
          .sound-option-grid {
            margin-top: 1rem;
          }

          .sound-option-grid[data-option-count="9"] {
            margin-top: 0.7rem;
          }
        }

        @media (max-width: 520px) {
          .sound-option-grid,
          .sound-option-grid[data-option-count="9"] {
            --option-row: clamp(5.4rem, min(15vh, 40vw), 9.5rem);
          }
        }

        /* Match the ≤1100px questions-stage column clamps so tracks stay
           square-ish where the columns are narrower. */
        @media (max-width: 1100px) {
          main[data-onboarding-stage="questions"] .sound-option-grid {
            --option-row: min(clamp(7.45rem, 16vw, 9.35rem), 18.2vh);
          }

          main[data-onboarding-stage="questions"] .sound-option-grid[data-option-count="9"] {
            --option-row: min(clamp(6.45rem, 13vw, 7.55rem), 12vh);
          }
        }

        /* ≤760px the six-option grids drop to 2 columns (3 rows), so rows
           must shrink further to keep three rows inside the frame. Floors sit
           low — cards prefer getting skinnier over the page scrolling. */
        @media (max-width: 760px) {
          main[data-onboarding-stage="questions"] .sound-option-grid {
            --option-row: clamp(4.4rem, min(13.5vh, 44vw), 8.85rem);
          }
        }

        @media (max-width: 520px) {
          main[data-onboarding-stage="questions"] .sound-option-grid {
            --option-row: clamp(4.1rem, min(12.8vh, 40vw), 9.5rem);
          }

          main[data-onboarding-stage="questions"] .sound-option-grid[data-option-count="9"] {
            --option-row: clamp(3.9rem, min(11vh, 30vw), 6.2rem);
          }
        }

        /* Cards fill their track exactly. aspect-ratio must be fully
           neutralized (selector outranks every variant that sets it):
           with a definite row height, aspect-ratio would otherwise derive
           the card WIDTH from the row and overflow the column. Padding and
           label spacing scale with the row so two-line labels still fit. */
        main[data-onboarding-stage] .sound-option-grid[data-option-count] .sound-option-card {
          aspect-ratio: auto;
          height: 100%;
          min-height: 0;
          padding: min(1.25rem, calc(var(--option-row) * 0.11));
        }

        .sound-option-grid .sound-option-label {
          margin-top: min(0.75rem, calc(var(--option-row) * 0.07));
        }

        /* Icon shells scale with the row so the label always keeps room,
           even for two-line labels on short screens. Selector strength ties
           the fixed-size breakpoint rules and wins by order. */
        main[data-onboarding-stage] .sound-option-grid[data-option-count] .sound-option-icon-shell {
          height: max(2.1rem, min(5.0625rem, calc(var(--option-row) - 5.4rem)));
          width: max(2.1rem, min(5.0625rem, calc(var(--option-row) - 5.4rem)));
        }

        main[data-onboarding-stage] .sound-option-grid[data-option-count="9"] .sound-option-icon-shell {
          height: max(1.45rem, min(2.65rem, calc(var(--option-row) - 3.65rem)));
          width: max(1.45rem, min(2.65rem, calc(var(--option-row) - 3.65rem)));
        }

        /* Wide-but-short screens: give the desktop layout the same trimmed
           top padding and slightly shorter rows so every step clears the
           frame (the ≤1100px rules already handle narrower screens). */
        @media (min-width: 1101px) and (max-height: 780px) {
          main[data-onboarding-stage="questions"] .sound-question-panel:not([data-contact-step="true"]) {
            padding-top: clamp(4.1rem, 8.5vh, 4.85rem);
          }

          main[data-onboarding-stage="questions"] .sound-question-panel[data-contact-step="true"] {
            padding-top: clamp(3.9rem, 8vh, 4.5rem);
            padding-bottom: 0.9rem;
          }

          main[data-onboarding-stage="questions"] .sound-question-panel:not([data-contact-step="true"]) .sound-question-page {
            justify-content: center;
          }

          .sound-option-grid {
            --option-row: clamp(6.4rem, 17.5vh, 9.5rem);
          }

          .sound-option-grid[data-option-count="9"] {
            --option-row: clamp(5.1rem, 11vh, 6.2rem);
          }
        }

        /* Very short screens: compress the contact-step form so the Send
           button clears the frame. */
        @media (max-height: 620px) {
          main[data-onboarding-stage="questions"] .sound-question-panel[data-contact-step="true"] {
            padding-top: 3.25rem;
            padding-bottom: 0.4rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-question-top-back {
            margin-bottom: 0.4rem;
            min-height: 1.7rem;
          }

          .sound-results-lead-form {
            margin-top: 0.4rem;
          }

          .sound-results-lead-form > .max-w-3xl p {
            font-size: 0.8rem;
            line-height: 1.05rem;
          }

          .sound-results-lead-form > .max-w-3xl p + p {
            margin-top: 0.15rem;
            font-size: 0.74rem;
            line-height: 1rem;
          }

          .sound-results-action-row {
            margin-top: 0.3rem;
            gap: 0.4rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-question-page > .flex.items-start h2 {
            margin-top: 0.3rem;
            font-size: clamp(1.3rem, 2.6vw, 1.7rem);
          }

          .sound-question-panel[data-contact-step="true"] .sound-question-page > .flex.items-start p.mt-3 {
            margin-top: 0.28rem;
            font-size: 0.78rem;
            line-height: 1.05rem;
          }

          .sound-results-field-grid {
            margin-top: 0.35rem;
            gap: 0.3rem;
          }

          .sound-results-lead-form label:not(.sound-results-intro-checkbox) input {
            margin-top: 0.2rem;
            padding-top: 0.32rem;
            padding-bottom: 0.32rem;
          }

          .sound-results-intro-checkbox {
            min-height: 1.7rem;
            padding-block: 0.18rem;
            font-size: 0.68rem;
            line-height: 0.95rem;
          }

          .sound-results-send-button {
            min-height: 2.1rem;
          }
        }

        /* Short screens: the send button now stacks below the checkboxes,
           so pair the checkboxes side-by-side to win the row back. */
        @media (max-height: 680px) and (min-width: 640px) {
          .sound-results-consent-stack {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .sound-results-action-row {
            margin-top: 0.45rem;
            gap: 0.5rem;
          }
        }

        /* Tablet & desktop (≥640px): the stacked button adds a row, so pair
           the checkboxes side-by-side and trim the contact panel's reserved
           padding to keep the form inside the frame. */
        @media (min-width: 640px) {
          main[data-onboarding-stage="questions"] .sound-question-panel[data-contact-step="true"] {
            padding-top: 4.05rem;
          }

          .sound-results-consent-stack {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .sound-results-field-grid {
            gap: 0.42rem;
          }

          .sound-results-action-row {
            margin-top: 0.4rem;
            gap: 0.35rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-question-page > .flex.items-start p.mt-3 {
            margin-top: 0.4rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-lead-form {
            margin-top: 0.45rem;
          }
        }

        /* Narrow screens: the contact form was overflowing once the field
           grid collapsed to one column at Tailwind's sm breakpoint. Keep two
           columns down to 480px and compress the form chrome. */
        @media (min-width: 431px) and (max-width: 639px) {
          .sound-results-field-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        /* Safety valve: when the contact form physically cannot fit (tiny
           phones), let the form area scroll instead of clipping the Send
           button. No scrollbar appears when everything fits. */
        .sound-question-panel[data-contact-step="true"] .sound-question-page {
          overflow-y: auto;
          overscroll-behavior: contain;
          min-height: 0;
        }

        /* Super-thin displays (≤430px): the 13 progress balls physically run
           out of row — collapse to a compact pill: the current indicator
           highlighted, a right arrow, and a preview of the next step. */
        @media (max-width: 430px) {
          main[data-onboarding-stage="questions"] .sound-progress-path,
          main[data-onboarding-stage="result"] .sound-progress-path {
            display: flex;
            width: fit-content;
            margin-inline: auto;
            align-items: center;
            gap: 0.55rem;
            padding: 0.32rem 0.85rem;
          }

          main[data-onboarding-stage="questions"] .sound-progress-path::before,
          main[data-onboarding-stage="result"] .sound-progress-path::before {
            display: none;
          }

          main[data-onboarding-stage="questions"] .sound-progress-node,
          main[data-onboarding-stage="result"] .sound-progress-node {
            display: none;
            height: 2.05rem;
            width: 2.05rem;
          }

          main[data-onboarding-stage="questions"] .sound-progress-node[data-active="true"],
          main[data-onboarding-stage="result"] .sound-progress-node[data-active="true"],
          main[data-onboarding-stage="questions"] .sound-progress-node[data-active="true"] + .sound-progress-node,
          main[data-onboarding-stage="result"] .sound-progress-node[data-active="true"] + .sound-progress-node {
            display: grid;
          }

          main[data-onboarding-stage="questions"] .sound-progress-node[data-active="true"],
          main[data-onboarding-stage="result"] .sound-progress-node[data-active="true"] {
            order: 1;
          }

          main[data-onboarding-stage="questions"] .sound-progress-node[data-active="true"] + .sound-progress-node,
          main[data-onboarding-stage="result"] .sound-progress-node[data-active="true"] + .sound-progress-node {
            order: 3;
          }

          /* The arrow between current and next (flex-item pseudo, order 2). */
          main[data-onboarding-stage="questions"] .sound-progress-path::after {
            content: "";
            order: 2;
            height: 0.95rem;
            width: 0.95rem;
            background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2367e8f9" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>');
            background-position: center;
            background-repeat: no-repeat;
            background-size: contain;
            opacity: 0.85;
          }

          /* On the result stage the trophy is the final stop — no arrow. */
          main[data-onboarding-stage="result"] .sound-progress-path::after {
            display: none;
          }

          /* The compact pill returns ~40px to the flow, so reclaim it from
             the panel padding and shrink the centered logo to match. */
          main[data-onboarding-stage="questions"] .sound-question-panel:not([data-contact-step="true"]) {
            padding-top: 3.35rem;
          }

          main[data-onboarding-stage="questions"] .sound-question-panel[data-contact-step="true"] {
            padding-top: 3.2rem;
          }

          main[data-onboarding-stage="questions"] .sound-question-logo {
            top: 0.4rem;
          }

          main[data-onboarding-stage="questions"] .sound-question-logo-stage {
            height: 2.55rem;
            width: 2.55rem;
          }

          main[data-onboarding-stage="questions"] .sound-question-logo-mark {
            height: 1.9rem;
            width: 1.9rem;
          }

          main[data-onboarding-stage="questions"] .sound-question-page > .flex.items-start h2 {
            margin-top: 0.4rem;
            font-size: clamp(1.05rem, 5.6vw, 1.35rem);
            line-height: 1.08;
          }

          main[data-onboarding-stage="questions"] .sound-question-page > .flex.items-start p.mt-3 {
            margin-top: 0.35rem;
            font-size: 0.78rem;
            line-height: 1.1rem;
          }
        }

        /* Tiny phones (≤380px): headings wrap to 3–4 lines, so compress the
           question header and let the page scroll if a step still cannot
           physically fit. Scroll only appears when needed. */
        @media (max-width: 380px) {
          main[data-onboarding-stage="questions"] .sound-question-page {
            overflow-y: auto;
            overscroll-behavior: contain;
            min-height: 0;
          }

          main[data-onboarding-stage="questions"] .sound-question-top-back {
            margin-bottom: 0.4rem;
            min-height: 1.9rem;
          }

          main[data-onboarding-stage="questions"] .sound-question-page > .flex.items-start h2 {
            margin-top: 0.35rem;
            font-size: 1.2rem;
            line-height: 1.05;
          }

          main[data-onboarding-stage="questions"] .sound-question-page > .flex.items-start p.mt-3 {
            margin-top: 0.3rem;
            font-size: 0.72rem;
            line-height: 1rem;
          }

          main[data-onboarding-stage="questions"] .sound-progress-path {
            padding-block: 0.15rem;
          }
        }

        @media (max-width: 700px) {
          main[data-onboarding-stage="questions"] .sound-question-panel[data-contact-step="true"] {
            padding-top: 3.45rem;
            padding-bottom: 0.45rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-question-top-back {
            margin-bottom: 0.45rem;
            min-height: 1.9rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-question-page > .flex.items-start h2 {
            margin-top: 0.3rem;
            font-size: clamp(1.25rem, 4.6vw, 1.7rem);
          }

          .sound-question-panel[data-contact-step="true"] .sound-question-page > .flex.items-start p.mt-3 {
            margin-top: 0.28rem;
            font-size: 0.78rem;
            line-height: 1.05rem;
          }

          .sound-results-field-grid {
            margin-top: 0.35rem;
            gap: 0.3rem;
          }

          .sound-results-lead-form label:not(.sound-results-intro-checkbox) input {
            margin-top: 0.2rem;
            padding-top: 0.34rem;
            padding-bottom: 0.34rem;
          }

          .sound-results-intro-checkbox {
            min-height: 1.85rem;
            padding-block: 0.22rem;
            font-size: 0.68rem;
            line-height: 0.95rem;
          }

          .sound-results-send-button {
            min-height: 2.2rem;
          }
        }

        /* Short viewports (≤660px tall): compress header chrome, shrink rows
           further, trim the multi-select footer bar, and allow (invisible)
           scroll as the last resort. Height-scoped only, so width-based
           layouts are untouched. */
        @media (max-height: 660px) {
          main[data-onboarding-stage="questions"] .sound-question-panel .border-t {
            margin-top: 0.5rem;
            padding-top: 0.5rem;
          }

          main[data-onboarding-stage="questions"] .sound-next-button {
            min-height: 2.25rem;
          }

          main[data-onboarding-stage="questions"] .sound-question-panel:not([data-contact-step="true"]) {
            padding-top: 3.4rem;
          }

          main[data-onboarding-stage="questions"] .sound-question-top-back {
            margin-bottom: 0.4rem;
            min-height: 1.9rem;
          }

          main[data-onboarding-stage="questions"] .sound-question-page > .flex.items-start h2 {
            margin-top: 0.3rem;
            font-size: clamp(1.15rem, 3vw, 1.45rem);
            line-height: 1.02;
          }

          main[data-onboarding-stage="questions"] .sound-question-page > .flex.items-start p.mt-3 {
            margin-top: 0.25rem;
            font-size: 0.72rem;
            line-height: 1rem;
          }

          main[data-onboarding-stage="questions"] .sound-progress-path {
            padding-block: 0.1rem;
          }

          main[data-onboarding-stage="questions"] .sound-option-grid {
            --option-row: min(16vh, 9.35rem);
            margin-top: 0.5rem;
          }

          main[data-onboarding-stage="questions"] .sound-option-grid[data-option-count="9"] {
            --option-row: max(4.2rem, min(11vh, 7.55rem));
            margin-top: 0.4rem;
          }

          main[data-onboarding-stage="questions"] .sound-question-page {
            overflow-y: auto;
            overscroll-behavior: contain;
            min-height: 0;
          }
        }

        /* Next button launch effect: quick press + bright flash, a shockwave
           ring, and the arrow shooting ahead — plays during the short launch
           window before the step advances. */
        .sound-next-button::after {
          content: "";
          position: absolute;
          inset: -3px;
          border-radius: inherit;
          border: 2px solid rgba(125, 249, 255, 0.9);
          box-shadow:
            0 0 18px rgba(34, 211, 238, 0.55),
            inset 0 0 12px rgba(125, 249, 255, 0.35);
          opacity: 0;
          pointer-events: none;
        }

        .sound-next-button[data-launching="true"] {
          animation: soundNextPress 360ms cubic-bezier(0.3, 0.7, 0.3, 1) both;
        }

        .sound-next-button[data-launching="true"]::after {
          animation: soundNextRing 360ms ease-out both;
        }

        .sound-next-button[data-launching="true"] svg {
          animation: soundNextArrow 360ms cubic-bezier(0.3, 0.7, 0.25, 1) both;
        }

        @keyframes soundNextPress {
          0% {
            transform: scale(1);
            filter: brightness(1);
          }
          28% {
            transform: scale(0.95);
            filter: brightness(1.3) saturate(1.2);
          }
          100% {
            transform: scale(1.05);
            filter: brightness(1.5) saturate(1.25);
          }
        }

        @keyframes soundNextRing {
          0% {
            opacity: 0;
            transform: scale(0.9);
          }
          30% {
            opacity: 0.95;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(1.5, 2.1);
          }
        }

        @keyframes soundNextArrow {
          0% {
            transform: translateX(0);
            opacity: 1;
          }
          55% {
            transform: translateX(0.2rem);
            opacity: 1;
          }
          100% {
            transform: translateX(0.65rem);
            opacity: 0.65;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sound-next-button[data-launching="true"],
          .sound-next-button[data-launching="true"]::after,
          .sound-next-button[data-launching="true"] svg {
            animation: none;
          }
        }

        /* Desktop: the centered logo badge ran down to ~88px while the
           indicator row can start as high as ~62px (contact step), so the
           logo was covering the indicators. Shrink and raise it — narrow
           screens already run it at this scale. */
        @media (min-width: 1101px) {
          main[data-onboarding-stage="questions"] .sound-question-logo,
          main[data-onboarding-stage="result"] .sound-question-logo {
            top: 0.55rem;
          }

          main[data-onboarding-stage="questions"] .sound-question-logo-stage,
          main[data-onboarding-stage="result"] .sound-question-logo-stage {
            height: 3.4rem;
            width: 3.4rem;
          }

          main[data-onboarding-stage="questions"] .sound-question-logo-mark,
          main[data-onboarding-stage="result"] .sound-question-logo-mark {
            height: 2.55rem;
            width: 2.55rem;
          }
        }

        /* Very short screens: same problem in miniature — the compressed
           panel padding starts the content above the logo's bottom edge. */
        @media (max-height: 620px) {
          main[data-onboarding-stage="questions"] .sound-question-logo {
            top: 0.4rem;
          }

          main[data-onboarding-stage="questions"] .sound-question-logo-stage {
            height: 2.55rem;
            width: 2.55rem;
          }

          main[data-onboarding-stage="questions"] .sound-question-logo-mark {
            height: 1.9rem;
            width: 1.9rem;
          }
        }

        /* Desktop: keep the assessment link from colliding with the progress
           row. Between 1101–1599px the long copy wraps to three lines and
           runs into the indicators, so show the short variant; at ≥1600px
           widen the box so the long copy fits in two lines. */
        @media (min-width: 1101px) and (max-width: 1599px) {
          main[data-onboarding-stage="questions"] .sound-assessment-long,
          main[data-onboarding-stage="result"] .sound-assessment-long {
            display: none;
          }

          main[data-onboarding-stage="questions"] .sound-assessment-short,
          main[data-onboarding-stage="result"] .sound-assessment-short {
            display: inline;
          }

          main[data-onboarding-stage="questions"] .sound-assessment-link,
          main[data-onboarding-stage="result"] .sound-assessment-link {
            max-width: 14rem;
          }
        }

        @media (min-width: 1600px) {
          main[data-onboarding-stage="questions"] .sound-assessment-link,
          main[data-onboarding-stage="result"] .sound-assessment-link {
            max-width: 30rem;
          }
        }

        /* Roomy screens: let the progress indicators grow into the space and
           open up the gaps. The panel's top padding gives back the height so
           the steps below keep their verified fit. */
        @media (min-width: 1200px) and (min-height: 800px) {
          main[data-onboarding-stage="questions"] .sound-progress-node,
          main[data-onboarding-stage="result"] .sound-progress-node {
            height: clamp(2.18rem, 2.4vw, 2.6rem);
            width: clamp(2.18rem, 2.4vw, 2.6rem);
          }

          main[data-onboarding-stage="questions"] .sound-progress-node svg,
          main[data-onboarding-stage="result"] .sound-progress-node svg {
            height: 1.1rem;
            width: 1.1rem;
          }

          main[data-onboarding-stage="questions"] .sound-progress-path,
          main[data-onboarding-stage="result"] .sound-progress-path {
            gap: clamp(0.3rem, 0.8vw, 0.85rem);
          }

          main[data-onboarding-stage="questions"] .sound-question-panel:not([data-contact-step="true"]) {
            padding-top: 5.5rem;
          }
        }

        /* Tight rows: let the card icon give up more of its floor so the
           label always keeps its lines. Icons stay full-size when roomy —
           the row-linked calc only bites as rows compress. */
        @media (max-width: 1100px) {
          main[data-onboarding-stage] .sound-option-grid[data-option-count] .sound-option-icon-shell {
            height: max(1.85rem, min(5.0625rem, calc(var(--option-row) - 5.4rem)));
            width: max(1.85rem, min(5.0625rem, calc(var(--option-row) - 5.4rem)));
          }
        }

        /* Skinny-card support (≤760px): the label's size and spacing follow
           the row too, so as cards get skinnier the text scales instead of
           clipping. Caps match the normal mobile sizes — nothing changes
           until rows actually compress. */
        @media (max-width: 760px) {
          main[data-onboarding-stage] .sound-option-grid[data-option-count] .sound-option-label {
            margin-top: min(0.45rem, calc(var(--option-row) * 0.055));
            font-size: max(0.56rem, min(0.74rem, calc(var(--option-row) * 0.16)));
            line-height: 1.18;
          }

          main[data-onboarding-stage] .sound-option-grid[data-option-count] .sound-option-icon-shell {
            height: max(1.15rem, min(5.0625rem, calc(var(--option-row) * 0.3)));
            width: max(1.15rem, min(5.0625rem, calc(var(--option-row) * 0.3)));
          }

          main[data-onboarding-stage] .sound-option-grid[data-option-count="9"] .sound-option-icon-shell {
            height: max(1.15rem, min(2.65rem, calc(var(--option-row) - 3.8rem)));
            width: max(1.15rem, min(2.65rem, calc(var(--option-row) - 3.8rem)));
          }
        }

        /* Breathing room: wider gaps between option cards at every size,
           tuned against each breakpoint's measured slack so no step loses
           its fit. Tracks are minmax(0, …), so columns absorb the extra
           width without overflowing. */
        .sound-option-grid {
          gap: 1.1rem;
        }

        .sound-option-grid[data-option-count="9"] {
          gap: 0.85rem;
        }

        @media (max-width: 1100px) {
          main[data-onboarding-stage="questions"] .sound-option-grid {
            gap: 0.8rem;
          }

          main[data-onboarding-stage="questions"] .sound-option-grid[data-option-count="9"] {
            gap: 0.6rem;
          }
        }

        /* Indicators float free: the pill container's background, inner
           shadows (including the 1px white top-edge highlight), and border
           are removed at every size — only the balls and their rail remain. */
        .sound-progress-path {
          border-radius: 0;
          background: none;
          box-shadow: none;
          padding-inline: 0.1rem;
        }

        /* Multi-select steps carry a footer bar (divider + hint + Next), so
           their card rows reserve that height — the grid must always end
           above the divider line, never on or under it. */
        @media (max-width: 1100px) {
          main[data-onboarding-stage="questions"] .sound-question-panel[data-multi-step="true"] .sound-option-grid {
            --option-row: min(clamp(7.45rem, 16vw, 9.35rem), calc(18.2vh - 2.1rem));
          }

          main[data-onboarding-stage="questions"] .sound-question-panel[data-multi-step="true"] .sound-option-grid[data-option-count="9"] {
            --option-row: min(clamp(6.45rem, 13vw, 7.55rem), calc(12vh - 1.05rem));
          }
        }

        @media (max-width: 760px) {
          main[data-onboarding-stage="questions"] .sound-question-panel[data-multi-step="true"] .sound-option-grid {
            --option-row: clamp(4rem, min(calc(13.5vh - 1.6rem), 44vw), 8.85rem);
          }
        }

        @media (max-width: 520px) {
          main[data-onboarding-stage="questions"] .sound-question-panel[data-multi-step="true"] .sound-option-grid {
            --option-row: clamp(3.9rem, min(calc(12.8vh - 1.6rem), 40vw), 9.5rem);
          }

          main[data-onboarding-stage="questions"] .sound-question-panel[data-multi-step="true"] .sound-option-grid[data-option-count="9"] {
            --option-row: clamp(3.6rem, min(calc(11vh - 1.05rem), 30vw), 6.2rem);
          }
        }

        /* Immersion: content may clip at the page edge (never paints over the
           footer divider), and scroll containers never show a scrollbar. */
        .sound-question-page {
          overflow: hidden;
          scrollbar-width: none;
        }

        .sound-question-page::-webkit-scrollbar {
          display: none;
        }

        /* ============================================================
           Fit-guaranteed option grid.
           The grid takes the space left after the (variable-height)
           header and footer. Tracks prefer their designed size
           (--option-row, enforced via max-height) but compress equally
           when space is short — cards shrink instead of being hidden.
           Card innards size from the card's ACTUAL height via container
           queries, so nothing inside clips as rows compress.
           ============================================================ */
        main[data-onboarding-stage="questions"] .sound-option-grid {
          --option-gap: 1.1rem;
          --option-rows-n: 2;
          flex: 1 1 auto;
          min-height: 0;
          gap: var(--option-gap);
          grid-auto-rows: minmax(2.9rem, 1fr);
          align-content: center;
          max-height: calc(
            var(--option-rows-n) * var(--option-row) +
            (var(--option-rows-n) - 1) * var(--option-gap)
          );
        }

        main[data-onboarding-stage="questions"] .sound-option-grid[data-option-count="9"] {
          --option-gap: 0.85rem;
          --option-rows-n: 3;
        }

        @media (max-width: 1100px) {
          main[data-onboarding-stage="questions"] .sound-option-grid {
            --option-gap: 0.8rem;
          }

          main[data-onboarding-stage="questions"] .sound-option-grid[data-option-count="9"] {
            --option-gap: 0.6rem;
          }
        }

        /* 2-column layouts stack 5/6 options into three rows. */
        @media (max-width: 760px) {
          main[data-onboarding-stage="questions"] .sound-option-grid[data-option-count="5"],
          main[data-onboarding-stage="questions"] .sound-option-grid[data-option-count="6"] {
            --option-rows-n: 3;
          }
        }

        /* Card innards follow the card's real rendered height (cqh). The
           icon+label row group is centered as a block so the space above the
           icon always equals the space below the label. The single column is
           clamped to the card's width — a long word can no longer widen the
           track and drag the content off-center. (Card padding can't use cqh
           on itself — a container doesn't self-query — so it keys off the
           row variable.) */
        main[data-onboarding-stage] .sound-option-grid[data-option-count] .sound-option-card {
          container-type: size;
          aspect-ratio: auto;
          height: 100%;
          min-height: 0;
          grid-template-columns: minmax(0, 1fr);
          padding: clamp(0.4rem, calc(var(--option-row) * 0.11), 1.25rem);
          align-content: center;
        }

        main[data-onboarding-stage] .sound-option-grid[data-option-count] .sound-option-label {
          margin-top: min(0.6rem, 6cqh);
          max-width: 100%;
          overflow-wrap: anywhere;
        }

        main[data-onboarding-stage] .sound-option-grid[data-option-count] .sound-option-icon-shell {
          height: max(1.5rem, min(5.0625rem, calc(100cqh - 5.4rem)));
          width: max(1.5rem, min(5.0625rem, calc(100cqh - 5.4rem)));
        }

        main[data-onboarding-stage] .sound-option-grid[data-option-count="9"] .sound-option-icon-shell {
          height: max(1.15rem, min(2.65rem, calc(100cqh - 3.8rem)));
          width: max(1.15rem, min(2.65rem, calc(100cqh - 3.8rem)));
        }

        @media (max-width: 760px) {
          main[data-onboarding-stage] .sound-option-grid[data-option-count] .sound-option-icon-shell {
            height: max(1.15rem, min(5.0625rem, 30cqh));
            width: max(1.15rem, min(5.0625rem, 30cqh));
          }

          main[data-onboarding-stage] .sound-option-grid[data-option-count] .sound-option-label {
            margin-top: min(0.45rem, 5cqh);
            font-size: max(0.56rem, min(0.74rem, 16cqh));
            line-height: 1.18;
          }
        }

        /* Mobile: cards run slightly narrower than the space allows, leaving
           air on every side so the selected-card highlight (lift + scale +
           glow) grows into the gap instead of colliding with its neighbors
           or the frame. Growth itself is also softened at this size. */
        @media (max-width: 760px) {
          main[data-onboarding-stage="questions"] .sound-option-grid {
            grid-template-columns: repeat(2, minmax(0, min(8.35rem, calc((100% - var(--option-gap, 0.8rem)) / 2 - 0.3rem))));
          }

          main[data-onboarding-stage="questions"] .sound-option-grid[data-option-count="9"] {
            grid-template-columns: repeat(3, minmax(0, min(7.1rem, calc((100% - 2 * var(--option-gap, 0.6rem)) / 3 - 0.25rem))));
          }

          main[data-onboarding-stage="questions"] .sound-option-card[data-selected="true"] {
            transform: translateY(-1px) scale(1.015);
          }

          main[data-onboarding-stage="questions"] .sound-option-card[data-selected="true"]:hover {
            transform: translateY(-2px) scale(1.02);
          }
        }

        /* Smallest screens (≤430px): compress the contact step so the whole
           form fits cleanly. The step helper is hidden (the lede already
           explains the ask), and every block tightens proportionally. */
        @media (max-width: 430px) {
          main[data-onboarding-stage="questions"] .sound-question-page > .flex.items-start h2 {
            font-size: clamp(1rem, 5vw, 1.25rem);
          }

          main[data-onboarding-stage="questions"] .sound-question-panel[data-contact-step="true"] .sound-question-page > .flex.items-start h2 {
            margin-top: 0.25rem;
            font-size: clamp(0.9rem, 4.6vw, 1.1rem);
            line-height: 1.05;
          }

          .sound-question-panel[data-contact-step="true"] .sound-question-page > .flex.items-start p.mt-3 {
            display: none;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-lead-form {
            margin-top: 0.35rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-lead-form > .max-w-3xl p {
            font-size: 0.78rem;
            line-height: 1.05rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-lead-form > .max-w-3xl p + p {
            margin-top: 0.1rem;
            font-size: 0.7rem;
            line-height: 0.95rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-field-grid {
            margin-top: 0.3rem;
            gap: 0.28rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-lead-form label:not(.sound-results-intro-checkbox) span {
            font-size: 0.52rem;
            letter-spacing: 0.1em;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-lead-form label:not(.sound-results-intro-checkbox) input {
            margin-top: 0.12rem;
            padding: 0.3rem 0.6rem;
            font-size: 0.8rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-intro-checkbox {
            min-height: 1.6rem;
            padding-block: 0.12rem;
            font-size: 0.62rem;
            line-height: 0.85rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-intro-checkbox input {
            height: 0.95rem;
            width: 0.95rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-action-row {
            margin-top: 0.3rem;
            gap: 0.3rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-send-button {
            min-height: 1.95rem;
            padding-inline: 0.9rem;
            font-size: 0.62rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-reassure {
            font-size: 0.56rem;
            line-height: 0.75rem;
          }
        }

        /* Mid widths (431–639px): the last uncompressed band. Same treatment
           as mobile — helper hidden, checkboxes paired, and the send button
           shrinks so the form always ends inside the frame. */
        @media (min-width: 431px) and (max-width: 639px) {
          .sound-question-panel[data-contact-step="true"] .sound-question-page > .flex.items-start p.mt-3 {
            display: none;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-lead-form {
            margin-top: 0.4rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-lead-form > .max-w-3xl p {
            font-size: 0.8rem;
            line-height: 1.1rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-lead-form > .max-w-3xl p + p {
            margin-top: 0.12rem;
            font-size: 0.72rem;
            line-height: 1rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-field-grid {
            margin-top: 0.35rem;
            gap: 0.35rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-lead-form label:not(.sound-results-intro-checkbox) input {
            margin-top: 0.15rem;
            padding: 0.3rem 0.6rem;
            font-size: 0.82rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-consent-stack {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.35rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-intro-checkbox {
            min-height: 1.7rem;
            padding-block: 0.15rem;
            font-size: 0.6rem;
            line-height: 0.82rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-action-row {
            margin-top: 0.35rem;
            gap: 0.35rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-send-button {
            min-height: 2rem;
            padding-inline: 1rem;
            font-size: 0.6rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-reassure {
            font-size: 0.6rem;
            line-height: 0.8rem;
          }
        }

        /* The pane's skinniest (≤330px): titles and form text step down one
           more notch so even this extreme width renders scroll-free. */
        @media (max-width: 330px) {
          main[data-onboarding-stage="questions"] .sound-question-page > .flex.items-start h2 {
            font-size: clamp(0.85rem, 5.4vw, 1.05rem);
            line-height: 1.05;
          }

          main[data-onboarding-stage="questions"] .sound-question-panel[data-contact-step="true"] .sound-question-page > .flex.items-start h2 {
            font-size: clamp(0.78rem, 5vw, 0.95rem);
          }

          main[data-onboarding-stage="questions"] .sound-question-panel:not([data-contact-step="true"]) {
            padding-top: 3.1rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-lead-form > .max-w-3xl p {
            font-size: 0.68rem;
            line-height: 0.92rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-lead-form > .max-w-3xl p + p {
            font-size: 0.62rem;
            line-height: 0.85rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-lead-form label:not(.sound-results-intro-checkbox) span {
            font-size: 0.48rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-lead-form label:not(.sound-results-intro-checkbox) input {
            padding: 0.26rem 0.5rem;
            font-size: 0.75rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-intro-checkbox {
            min-height: 1.45rem;
            font-size: 0.56rem;
            line-height: 0.78rem;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-send-button {
            min-height: 1.8rem;
            font-size: 0.58rem;
          }

          .sound-progress-steplabel {
            font-size: 0.5rem;
          }
        }

        /* Narrow cards: the label sizes itself from the card's REAL width and
           height (container units), so the longest word always fits on its
           own line — words wrap per line, text never breaks mid-word, never
           clips, and the card never has to grow. Outranks the per-count
           fixed-size label rules. */
        @media (max-width: 760px) {
          main[data-onboarding-stage] .sound-question-panel .sound-option-grid[data-option-count] .sound-option-label {
            margin-top: min(0.4rem, 4cqh);
            font-size: clamp(0.46rem, min(16cqh, 10.5cqw), 0.74rem);
            line-height: 1.16;
            max-width: 100%;
            overflow-wrap: anywhere;
          }
        }

        /* Contact inputs, upgraded: glassy depth, soft corners, and a cyan
           focus glow that matches the rest of the app. */
        .sound-results-lead-form label:not(.sound-results-intro-checkbox) input {
          border-radius: 0.55rem;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background:
            radial-gradient(120% 90% at 50% 0%, rgba(34, 211, 238, 0.06), transparent 46%),
            linear-gradient(180deg, rgba(15, 23, 42, 0.88), rgba(2, 7, 19, 0.92));
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.06),
            inset 0 0 18px rgba(2, 7, 19, 0.35),
            0 6px 16px rgba(0, 0, 0, 0.22);
          transition:
            border-color 200ms ease,
            box-shadow 200ms ease;
        }

        .sound-results-lead-form label:not(.sound-results-intro-checkbox) input::placeholder {
          color: rgba(148, 163, 184, 0.6);
          font-weight: 700;
        }

        .sound-results-lead-form label:not(.sound-results-intro-checkbox) input:hover:not(:focus) {
          border-color: rgba(148, 163, 184, 0.38);
        }

        .sound-results-lead-form label:not(.sound-results-intro-checkbox) input:focus {
          border-color: rgba(103, 232, 249, 0.7);
          box-shadow:
            0 0 0 1px rgba(103, 232, 249, 0.26),
            0 0 24px rgba(34, 211, 238, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.09);
        }

        /* Tight heights/widths: the labels move INSIDE the boxes — the
           placeholder carries the label, the visible label above collapses
           (kept for screen readers), and the row shrinks accordingly. */
        @media (max-width: 430px) {
          .sound-question-panel[data-contact-step="true"] .sound-results-lead-form label:not(.sound-results-intro-checkbox) > span {
            position: absolute;
            width: 1px;
            height: 1px;
            margin: -1px;
            padding: 0;
            overflow: hidden;
            clip: rect(0 0 0 0);
            white-space: nowrap;
            border: 0;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-lead-form label:not(.sound-results-intro-checkbox) {
            position: relative;
          }

          .sound-question-panel[data-contact-step="true"] .sound-results-lead-form label:not(.sound-results-intro-checkbox) input {
            margin-top: 0;
          }
        }

        /* Consent checkboxes, upgraded: custom glass boxes with a springy
           check pop, glow, and a row that lights up when selected. */
        .sound-results-intro-checkbox input {
          appearance: none;
          -webkit-appearance: none;
          height: 1.15rem;
          width: 1.15rem;
          flex-shrink: 0;
          border-radius: 0.32rem;
          border: 1px solid rgba(148, 163, 184, 0.42);
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(2, 7, 19, 0.95));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07);
          cursor: pointer;
          position: relative;
          transition:
            border-color 180ms ease,
            background 180ms ease,
            box-shadow 180ms ease;
        }

        .sound-results-intro-checkbox input:hover {
          border-color: rgba(103, 232, 249, 0.55);
          box-shadow:
            0 0 10px rgba(34, 211, 238, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .sound-results-intro-checkbox input:checked {
          border-color: rgba(207, 250, 254, 0.85);
          background: linear-gradient(135deg, #67e8f9, #22d3ee 58%, #38bdf8);
          box-shadow:
            0 0 16px rgba(34, 211, 238, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.4);
          animation: soundCheckPop 280ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .sound-results-intro-checkbox input:checked::after {
          content: "";
          position: absolute;
          inset: 0;
          background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23082f49" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>') center / 68% no-repeat;
        }

        @keyframes soundCheckPop {
          0% {
            transform: scale(0.6);
          }
          55% {
            transform: scale(1.22);
          }
          100% {
            transform: scale(1);
          }
        }

        .sound-results-intro-checkbox {
          cursor: pointer;
          transition:
            border-color 200ms ease,
            background 200ms ease,
            box-shadow 200ms ease;
        }

        .sound-results-intro-checkbox:hover {
          border-color: rgba(125, 249, 255, 0.3);
        }

        .sound-results-intro-checkbox:has(input:checked) {
          border-color: rgba(103, 232, 249, 0.42);
          background:
            radial-gradient(circle at 8% 30%, rgba(34, 211, 238, 0.16), transparent 40%),
            rgba(15, 23, 42, 0.48);
          box-shadow: 0 0 18px rgba(34, 211, 238, 0.1);
        }

        /* Send button effects: idle glow breathing, a sheen sweep on hover,
           and a tactile press. */
        .sound-results-send-button::before {
          content: "";
          position: absolute;
          inset: -30% -60%;
          background: linear-gradient(115deg, transparent 42%, rgba(255, 255, 255, 0.55) 50%, transparent 58%);
          transform: translateX(-130%);
          pointer-events: none;
        }

        .sound-results-send-button:hover::before {
          animation: soundSendSheen 850ms ease forwards;
        }

        .sound-results-send-button:not(:hover) {
          animation: soundSendPulse 3.4s ease-in-out infinite;
        }

        .sound-results-send-button:active {
          transform: translateY(0) scale(0.965);
        }

        @keyframes soundSendSheen {
          to {
            transform: translateX(130%);
          }
        }

        @keyframes soundSendPulse {
          0%,
          100% {
            box-shadow:
              0 0 0 1px rgba(255, 255, 255, 0.18),
              0 0 32px rgba(34, 211, 238, 0.28),
              0 14px 34px rgba(8, 47, 73, 0.32),
              inset 0 1px 0 rgba(255, 255, 255, 0.62);
          }
          50% {
            box-shadow:
              0 0 0 1px rgba(255, 255, 255, 0.26),
              0 0 44px rgba(34, 211, 238, 0.46),
              0 14px 38px rgba(8, 47, 73, 0.36),
              inset 0 1px 0 rgba(255, 255, 255, 0.7);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sound-results-send-button:not(:hover),
          .sound-results-send-button:hover::before,
          .sound-results-intro-checkbox input:checked {
            animation: none;
          }
        }

        /* Recommendation pills: glassy chips for the plan's themes (the
           cadence lives in the setup-lane Frequency card, not here). */
        .sound-reco-pill {
          background:
            radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.08), transparent 40%),
            rgba(34, 211, 238, 0.09);
          box-shadow:
            0 0 14px rgba(34, 211, 238, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        /* Recommendation photo cards: real photo backdrop, dimmed under a
           dark wash with the theme's accent glow, icon badge on top. */
        .sound-reco-card {
          --option-accent: 34 211 238;
          isolation: isolate;
          background:
            radial-gradient(circle at 50% 0%, rgb(var(--option-accent) / 0.16), transparent 55%),
            linear-gradient(180deg, rgba(15, 23, 42, 0.7), rgba(2, 7, 19, 0.85));
          border-color: rgb(var(--option-accent) / 0.28);
          box-shadow:
            0 8px 20px rgba(0, 0, 0, 0.28),
            0 0 18px rgb(var(--option-accent) / 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        /* The recommendation video fills the whole card as its background. */
        .sound-reco-video {
          position: absolute;
          inset: -2px;
          z-index: 0;
          width: calc(100% + 4px);
          height: calc(100% + 4px);
          object-fit: cover;
          opacity: 0.72;
          filter: saturate(1.15) contrast(1.05) brightness(0.72);
        }

        /* Shadowy scrim over the video so the icon + label stay readable. */
        .sound-reco-scrim {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background:
            radial-gradient(
              circle at 50% 28%,
              rgba(2, 7, 19, 0.08),
              transparent 55%
            ),
            linear-gradient(180deg, rgba(2, 7, 19, 0.34), rgba(2, 7, 19, 0.82));
        }

        .sound-reco-icon {
          box-shadow:
            0 0 12px rgb(var(--option-accent) / 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
          border-color: rgb(var(--option-accent) / 0.45);
        }

        /* One reco card is "spotlit" at a time (rotates every 6s): it lifts,
           glows in its accent, and sparkles. */
        .sound-reco-card[data-spotlight="true"] {
          border-color: rgb(var(--option-accent) / 0.75);
          transform: translateY(-3px);
          animation: soundRecoGlow 2.4s ease-in-out infinite;
        }

        /* Glassy diagonal shine that sweeps across as the card takes over. */
        .sound-reco-card::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 6;
          pointer-events: none;
          opacity: 0;
          background: linear-gradient(
            115deg,
            transparent 34%,
            rgba(255, 255, 255, 0.3) 48%,
            rgba(255, 255, 255, 0.06) 55%,
            transparent 68%
          );
          transform: translateX(-130%);
        }

        .sound-reco-card[data-spotlight="true"]::before {
          animation: soundRecoShine 6s ease-in-out;
        }

        .sound-reco-card[data-spotlight="true"] .sound-reco-video {
          opacity: 0.92;
          filter: saturate(1.2) contrast(1.06) brightness(0.85);
          animation: soundRecoZoom 6.4s ease-out both;
        }

        .sound-reco-card[data-spotlight="true"] .sound-reco-icon {
          transform: scale(1.12);
          border-color: rgb(var(--option-accent) / 0.9);
          box-shadow:
            0 0 22px rgb(var(--option-accent) / 0.65),
            inset 0 1px 0 rgba(255, 255, 255, 0.28);
        }

        @keyframes soundRecoGlow {
          0%,
          100% {
            box-shadow:
              0 10px 24px rgba(0, 0, 0, 0.32),
              0 0 14px rgb(var(--option-accent) / 0.32),
              inset 0 1px 0 rgba(255, 255, 255, 0.14);
          }
          50% {
            box-shadow:
              0 16px 34px rgba(0, 0, 0, 0.38),
              0 0 34px rgb(var(--option-accent) / 0.6),
              inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }
        }

        @keyframes soundRecoShine {
          0% {
            transform: translateX(-130%);
            opacity: 0;
          }
          9% {
            opacity: 1;
          }
          30% {
            transform: translateX(130%);
            opacity: 0;
          }
          100% {
            transform: translateX(130%);
            opacity: 0;
          }
        }

        @keyframes soundRecoZoom {
          0% {
            transform: scale(1);
          }
          100% {
            transform: scale(1.13);
          }
        }

        /* Twinkling four-point sparkle stars. */
        .sound-reco-spark {
          position: absolute;
          z-index: 7;
          width: 12px;
          height: 12px;
          opacity: 0;
          pointer-events: none;
          background:
            radial-gradient(circle, #ffffff 0 9%, transparent 42%),
            linear-gradient(
              0deg,
              transparent 45%,
              rgb(var(--option-accent)) 50%,
              transparent 55%
            ),
            linear-gradient(
              90deg,
              transparent 45%,
              rgb(var(--option-accent)) 50%,
              transparent 55%
            );
          filter: drop-shadow(0 0 5px rgb(var(--option-accent) / 0.9));
        }

        .sound-reco-card[data-spotlight="true"] .sound-reco-spark {
          animation: soundRecoSparkle 1.8s ease-in-out infinite;
        }

        .sound-reco-spark--one {
          top: 14%;
          left: 16%;
          animation-delay: 0.1s;
        }
        .sound-reco-spark--two {
          top: 22%;
          right: 14%;
          width: 9px;
          height: 9px;
          animation-delay: 0.7s;
        }
        .sound-reco-spark--three {
          bottom: 20%;
          left: 40%;
          width: 8px;
          height: 8px;
          animation-delay: 1.3s;
        }

        @keyframes soundRecoSparkle {
          0%,
          100% {
            opacity: 0;
            transform: scale(0.3) rotate(0deg);
          }
          45% {
            opacity: 1;
            transform: scale(1) rotate(90deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sound-reco-card[data-spotlight="true"] {
            animation: none;
          }
          .sound-reco-card[data-spotlight="true"]::before,
          .sound-reco-card[data-spotlight="true"] .sound-reco-video,
          .sound-reco-card[data-spotlight="true"] .sound-reco-spark {
            animation: none;
          }
          .sound-reco-card[data-spotlight="true"] .sound-reco-spark {
            opacity: 0;
          }
        }

        /* Color-coded recommendation video popup — each card's accent tints the
           whole panel so every video reads as its own themed space. */
        .sound-reco-modal-panel {
          background:
            radial-gradient(
              120% 90% at 50% 0%,
              rgb(var(--option-accent) / 0.22),
              transparent 60%
            ),
            linear-gradient(180deg, rgba(9, 14, 28, 0.98), rgba(2, 7, 19, 0.98));
          border-color: rgb(var(--option-accent) / 0.55);
          box-shadow:
            0 30px 70px rgba(2, 7, 19, 0.7),
            0 0 40px rgb(var(--option-accent) / 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .sound-reco-modal-icon {
          background: rgb(var(--option-accent) / 0.16);
          border-color: rgb(var(--option-accent) / 0.55);
          box-shadow: 0 0 16px rgb(var(--option-accent) / 0.35);
          color: rgb(var(--option-accent));
        }

        /* The panel can get very short (it's aspect-video, so its height falls
           out of whatever width the result panel gives it). Size the copy from
           the panel's own width so it shrinks with it instead of running up
           into the icon, and cap the caption so a long one can't grow the
           block either. */
        .sound-reco-modal-copy {
          container-type: inline-size;
        }

        .sound-reco-modal-title {
          font-size: clamp(0.7rem, 6.6cqw, 1.25rem);
          line-height: 1.1;
        }

        .sound-reco-modal-caption {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
          font-size: clamp(0.56rem, 3.9cqw, 0.75rem);
          line-height: 1.35;
        }

        /* The prev/next arrows sit bare on the footage (no pill behind them) so
           they take up as little of a small panel as possible — a drop shadow
           is what keeps the glyph readable over a bright frame. */
        .sound-reco-modal-arrow {
          filter:
            drop-shadow(0 1px 3px rgba(2, 7, 19, 0.95))
            drop-shadow(0 0 8px rgba(2, 7, 19, 0.7));
        }

        .sound-reco-modal-media {
          border-color: rgb(var(--option-accent) / 0.4);
          background: rgba(2, 7, 19, 0.6);
          box-shadow: inset 0 0 24px rgb(var(--option-accent) / 0.12);
        }

        .sound-reco-modal {
          animation: soundRecoModalIn 0.18s ease-out;
        }

        @keyframes soundRecoModalIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        /* Result content: scrollable with a VISIBLE, styled scrollbar — the
           results reward scrolling, so the bar advertises it. Neon thumb
           with hover/press glow; track reads as inset glass. */
        .sound-result-content {
          overflow-y: auto;
          overflow-x: hidden;
          overscroll-behavior: contain;
          scrollbar-gutter: stable;
          padding-right: 0.1rem;
        }

        .sound-result-content::-webkit-scrollbar {
          width: 0.28rem;
        }

        .sound-result-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .sound-result-content::-webkit-scrollbar-thumb {
          border-radius: 999px;
          border: 1px solid rgba(207, 250, 254, 0.35);
          background: linear-gradient(180deg, #67e8f9, #22d3ee 45%, #0ea5e9);
          box-shadow:
            0 0 10px rgba(34, 211, 238, 0.55),
            inset 0 1px 0 rgba(255, 255, 255, 0.35);
        }

        .sound-result-content::-webkit-scrollbar-thumb:hover {
          border-color: rgba(240, 253, 255, 0.55);
          background: linear-gradient(180deg, #a5f3fc, #38bdf8 50%, #0284c7);
          box-shadow:
            0 0 16px rgba(34, 211, 238, 0.85),
            inset 0 1px 0 rgba(255, 255, 255, 0.5);
        }

        .sound-result-content::-webkit-scrollbar-thumb:active {
          background: linear-gradient(180deg, #ffffff, #67e8f9 40%, #0ea5e9);
          box-shadow:
            0 0 20px rgba(125, 249, 255, 0.95),
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
        }

        /* Firefox fallback — scoped so it doesn't disable Chromium's
           custom scrollbar pseudo styling. */
        @supports not selector(::-webkit-scrollbar) {
          .sound-result-content {
            scrollbar-width: thin;
            scrollbar-color: rgba(34, 211, 238, 0.6) rgba(15, 23, 42, 0.4);
          }
        }

        /* Final step (12 of 12): the counter shimmers gold-cyan and the
           waiting trophy beckons — the finish line announces itself. */
        main[data-onboarding-stage="questions"][data-onboarding-step="12"] .sound-progress-steplabel {
          color: transparent;
          -webkit-text-fill-color: transparent;
          background: linear-gradient(100deg, #67e8f9 8%, #f0fdff 28%, #facc15 52%, #fb923c 72%, #67e8f9 92%);
          background-size: 220% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          animation: soundFinalLabelShimmer 2.8s linear infinite;
        }

        @keyframes soundFinalLabelShimmer {
          to {
            background-position: -220% 0;
          }
        }

        main[data-onboarding-stage="questions"][data-onboarding-step="12"] .sound-progress-node--prize {
          color: #fde68a;
          border-color: rgba(250, 204, 21, 0.55);
          filter: none;
          animation: soundFinalTrophyBeckon 1.9s ease-in-out infinite;
        }

        @keyframes soundFinalTrophyBeckon {
          0%,
          100% {
            transform: translateY(0) scale(1);
            box-shadow: 0 0 10px rgba(250, 204, 21, 0.22);
          }
          50% {
            transform: translateY(-2.5px) scale(1.12);
            box-shadow:
              0 0 22px rgba(250, 204, 21, 0.55),
              0 0 40px rgba(250, 204, 21, 0.2);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          main[data-onboarding-stage="questions"][data-onboarding-step="12"] .sound-progress-steplabel,
          main[data-onboarding-stage="questions"][data-onboarding-step="12"] .sound-progress-node--prize {
            animation: none;
          }
        }

        /* Start Over: the shell dissolves out, then remounts fresh — which
           also replays the crest fly-in, so a reset restarts the show. */
        main[data-resetting="true"] .sound-onboarding-shell {
          animation: soundShellDissolve 340ms cubic-bezier(0.4, 0, 0.7, 1) both;
          pointer-events: none;
        }

        @keyframes soundShellDissolve {
          to {
            opacity: 0;
            transform: scale(0.982);
            filter: blur(7px);
          }
        }

        .sound-onboarding-shell {
          animation: soundShellArrive 460ms cubic-bezier(0.22, 0.9, 0.32, 1) both;
        }

        @keyframes soundShellArrive {
          from {
            opacity: 0;
            transform: scale(1.012);
            filter: blur(5px);
          }
          to {
            opacity: 1;
            transform: scale(1);
            filter: blur(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          main[data-resetting="true"] .sound-onboarding-shell,
          .sound-onboarding-shell {
            animation: none;
          }
        }

        /* Give the indicator row clear air below the logo and corner menu —
           the fit-guaranteed grid below absorbs the shift, so nothing else
           has to move. */
        @media (max-width: 1100px) {
          main[data-onboarding-stage="questions"] .sound-progress-path,
          main[data-onboarding-stage="result"] .sound-progress-path {
            margin-top: clamp(0.6rem, 2.2vh, 1.25rem);
          }
        }

        /* Result celebration: confetti rains inside the frame on arrival. */
        .sound-confetti-piece {
          position: absolute;
          top: -3%;
          left: var(--confetti-x);
          width: var(--confetti-size);
          height: calc(var(--confetti-size) * 1.8);
          border-radius: 2px;
          background: var(--confetti-color);
          opacity: 0;
          animation: soundConfettiFall var(--confetti-duration, 2.8s) cubic-bezier(0.3, 0.35, 0.6, 1) var(--confetti-delay, 0s) both;
          will-change: transform, opacity;
        }

        @keyframes soundConfettiFall {
          0% {
            opacity: 0;
            transform: translate3d(0, -4vh, 0) rotateZ(0deg) rotateX(0deg);
          }
          7% {
            opacity: 1;
          }
          78% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate3d(var(--confetti-sway, 0rem), 76vh, 0) rotateZ(var(--confetti-rotation, 540deg)) rotateX(760deg);
          }
        }

        /* Hero signup: a periodic squash-and-stretch bounce with a glow
           swell — unmistakably the main action on the result page. */
        .sound-signup-button:not(:hover) {
          animation: soundSignupBounce 2.5s ease-in-out infinite;
        }

        .sound-signup-button:active {
          transform: scale(0.96);
        }

        /* Sparks that drift up behind the Sign Up CTA. */
        .sound-signup-wrap {
          overflow: visible;
        }

        .sound-signup-particles {
          position: absolute;
          left: 50%;
          bottom: -12%;
          width: 152%;
          height: 210%;
          transform: translateX(-50%);
          pointer-events: none;
          overflow: hidden;
          z-index: 0;
        }

        .sound-signup-particle {
          position: absolute;
          bottom: 0;
          width: var(--s);
          height: var(--s);
          border-radius: 999px;
          background: radial-gradient(
            circle,
            #ecfeff 0 28%,
            rgba(34, 211, 238, 0.92) 52%,
            transparent 74%
          );
          filter: drop-shadow(0 0 5px rgba(34, 211, 238, 0.85));
          opacity: 0;
          animation: soundSignupRise var(--d) ease-in-out var(--delay) infinite;
        }

        @keyframes soundSignupRise {
          0% {
            transform: translate(0, 0) scale(0.5);
            opacity: 0;
          }
          18% {
            opacity: 1;
          }
          75% {
            opacity: 0.85;
          }
          100% {
            transform: translate(var(--drift), var(--rise)) scale(1.05);
            opacity: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sound-signup-particle {
            animation: none;
            opacity: 0;
          }
        }

        @keyframes soundSignupBounce {
          0%,
          52%,
          100% {
            transform: translateY(0) scale(1, 1);
            box-shadow: 0 0 30px rgba(34, 211, 238, 0.3);
          }
          58% {
            transform: translateY(1.5px) scale(1.05, 0.94);
            box-shadow: 0 0 30px rgba(34, 211, 238, 0.32);
          }
          66% {
            transform: translateY(-5px) scale(0.97, 1.06);
            box-shadow: 0 0 44px rgba(34, 211, 238, 0.55);
          }
          74% {
            transform: translateY(0.5px) scale(1.06, 0.95);
            box-shadow: 0 0 36px rgba(34, 211, 238, 0.4);
          }
          82% {
            transform: translateY(-1.5px) scale(0.99, 1.02);
            box-shadow: 0 0 32px rgba(34, 211, 238, 0.34);
          }
          90% {
            transform: translateY(0) scale(1, 1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sound-confetti {
            display: none;
          }

          .sound-signup-button:not(:hover) {
            animation: none;
          }
        }

        /* Mute toggle sits under the account button by default (welcome at any
           width, and question/result on wide screens where the account text
           pill is short and the progress row sits low). On ≤1100px the
           question/result account collapses to a badge with the progress row
           right beneath it, so there the toggle moves just LEFT of that badge. */
        @media (max-width: 1100px) {
          main[data-onboarding-stage="questions"] .sound-audio-control,
          main[data-onboarding-stage="result"] .sound-audio-control {
            top: 1rem;
            right: 4rem;
          }
        }

        .sound-volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 0.7rem;
          width: 0.7rem;
          border-radius: 999px;
          background: #ecfeff;
          border: 1px solid rgba(103, 232, 249, 0.9);
          box-shadow: 0 0 8px rgba(34, 211, 238, 0.6);
          cursor: pointer;
        }

        .sound-volume-slider::-moz-range-thumb {
          height: 0.7rem;
          width: 0.7rem;
          border-radius: 999px;
          background: #ecfeff;
          border: 1px solid rgba(103, 232, 249, 0.9);
          box-shadow: 0 0 8px rgba(34, 211, 238, 0.6);
          cursor: pointer;
        }

        .sound-volume-slider:focus-visible {
          outline: none;
        }

        /* Vertical orientation for the master volume bar (loud at the top). */
        .sound-volume-slider--vertical {
          writing-mode: vertical-lr;
          direction: rtl;
          width: 0.4rem;
          height: 3.75rem;
        }

        /* While audio plays the trigger "breathes" — a smooth swell with a
           soft cyan halo, calmer than a blinking wave. */
        @keyframes soundAudioBreathe {
          0%,
          100% {
            box-shadow: 0 0 5px rgba(34, 211, 238, 0.35);
            transform: scale(1);
          }
          50% {
            box-shadow:
              0 0 15px rgba(34, 211, 238, 0.75),
              0 0 28px rgba(34, 211, 238, 0.28);
            transform: scale(1.1);
          }
        }

        .sound-audio-trigger[data-audio-live="true"] {
          animation: soundAudioBreathe 2.6s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .sound-audio-trigger[data-audio-live="true"] {
            animation: none;
            box-shadow: 0 0 12px rgba(34, 211, 238, 0.7);
          }
        }

        /* Themed tooltips for the icon-only audio controls (replaces the raw
           browser title tooltip). Sits to the left of the control. */
        .sound-tip {
          position: relative;
        }

        .sound-tip::after {
          content: attr(data-tooltip);
          position: absolute;
          right: calc(100% + 0.5rem);
          top: 50%;
          transform: translateY(-50%) translateX(4px);
          white-space: nowrap;
          padding: 0.24rem 0.5rem;
          border-radius: 0.45rem;
          background: rgba(3, 8, 22, 0.97);
          border: 1px solid rgba(103, 232, 249, 0.28);
          color: #ecfeff;
          font-size: 8.5px;
          font-weight: 800;
          letter-spacing: 0.1em;
          line-height: 1;
          text-transform: uppercase;
          box-shadow: 0 10px 24px rgba(2, 7, 19, 0.6);
          opacity: 0;
          pointer-events: none;
          transition:
            opacity 0.14s ease,
            transform 0.14s ease;
          z-index: 50;
        }

        .sound-tip:hover::after,
        .sound-tip:focus-visible::after {
          opacity: 1;
          transform: translateY(-50%) translateX(0);
        }

        .sound-mute-toggle:hover {
          filter: brightness(1.35);
        }

        /* Diagonal "muted" slash drawn over a mute-toggle icon when it is off. */
        .sound-mute-slash {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 132%;
          height: 2px;
          transform: translate(-50%, -50%) rotate(45deg);
          border-radius: 999px;
          background: currentColor;
          box-shadow: 0 0 0 1.5px rgba(2, 7, 19, 0.92);
          pointer-events: none;
        }

        /* Step counter lives with the indicators, centered just beneath. */
        .sound-progress-steplabel {
          margin-top: 0.28rem;
          flex-shrink: 0;
        }

        @media (max-width: 430px) {
          .sound-progress-steplabel {
            margin-top: 0.18rem;
          }
        }

        /* The "you are here" nudge: a periodic squash-and-stretch hop with a
           glow bloom on the active indicator, encouraging the user onward. */
        .sound-progress-node[data-active="true"] {
          animation: soundProgressNudge 2.6s ease-in-out infinite;
        }

        @keyframes soundProgressNudge {
          0%,
          42% {
            transform: translateY(-1px) scale(1, 1);
            filter: brightness(1);
          }
          48% {
            transform: translateY(1.5px) scale(1.14, 0.84);
            filter: brightness(1.05);
          }
          56% {
            transform: translateY(-8px) scale(0.9, 1.14);
            filter: brightness(1.42);
          }
          63% {
            transform: translateY(1.5px) scale(1.16, 0.82);
            filter: brightness(1.18);
          }
          70% {
            transform: translateY(-3.5px) scale(0.96, 1.06);
            filter: brightness(1.26);
          }
          77% {
            transform: translateY(0.5px) scale(1.06, 0.95);
            filter: brightness(1.08);
          }
          84%,
          100% {
            transform: translateY(-1px) scale(1, 1);
            filter: brightness(1);
          }
        }
      `}</style>
    </main>
  );
}

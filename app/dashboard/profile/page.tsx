"use client";

import {
  type CSSProperties,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  SoundLogoAchievementBadge,
  type AchievementBadgeItem,
} from "@/components/dashboard/SoundAchievementBadgeRow";
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

type SelectorIconName =
  | "activity"
  | "arrow-up"
  | "baby"
  | "bandage"
  | "bike"
  | "briefcase"
  | "brain"
  | "building"
  | "calendar-clock"
  | "car"
  | "clipboard-list"
  | "clock"
  | "circle"
  | "circle-dot"
  | "compass"
  | "contact"
  | "dumbbell"
  | "footprints"
  | "graduation-cap"
  | "hammer"
  | "heart-handshake"
  | "heart-pulse"
  | "home"
  | "kettlebell"
  | "more-horizontal"
  | "moon"
  | "panel-top"
  | "plane"
  | "runner"
  | "ruler"
  | "scale"
  | "settings"
  | "shield"
  | "shuffle"
  | "sparkles"
  | "square"
  | "stretch"
  | "trophy"
  | "trees"
  | "utensils"
  | "user"
  | "users"
  | "wallet"
  | "waves";

function SelectorIcon({
  className = "h-5 w-5",
  name,
}: {
  className?: string;
  name: SelectorIconName;
}) {
  const iconProps = {
    "aria-hidden": true,
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: "2",
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "activity":
      return <svg {...iconProps}><path d="M22 12h-4l-3 8-6-16-3 8H2" /></svg>;
    case "arrow-up":
      return <svg {...iconProps}><path d="m12 19-7-7" /><path d="m12 19 7-7" /><path d="M12 19V5" /></svg>;
    case "baby":
      return <svg {...iconProps}><path d="M9 12h.01" /><path d="M15 12h.01" /><path d="M10 16c.5.4 1.2.6 2 .6s1.5-.2 2-.6" /><path d="M19 10a7 7 0 1 1-14 0" /><path d="M12 3c1.4 0 2.5 1 2.5 2.3 0 1.2-1 2.2-2.2 2.2H12" /></svg>;
    case "bandage":
      return <svg {...iconProps}><path d="m10 21 11-11a3 3 0 0 0-4-4L6 17a3 3 0 1 0 4 4Z" /><path d="m14 7 3 3" /><path d="m7 14 3 3" /><path d="M14.5 12.5h.01" /><path d="M11.5 15.5h.01" /></svg>;
    case "bike":
      return <svg {...iconProps}><circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" /><path d="M6 17h4l3-7h3" /><path d="m10 17 4-4 4 4" /><path d="M9 7h3" /></svg>;
    case "briefcase":
      return <svg {...iconProps}><path d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1" /><rect height="14" rx="2" width="18" x="3" y="6" /><path d="M3 12h18" /></svg>;
    case "brain":
      return <svg {...iconProps}><path d="M8 6a3 3 0 0 1 6-1 3 3 0 0 1 4 4 3 3 0 0 1 0 6 3 3 0 0 1-4 4 3 3 0 0 1-6-1 3 3 0 0 1-3-5 3 3 0 0 1 3-7Z" /><path d="M12 5v14" /><path d="M8 10h4" /><path d="M12 14h4" /></svg>;
    case "building":
      return <svg {...iconProps}><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" /><path d="M4 22h16" /><path d="M9 6h.01" /><path d="M15 6h.01" /><path d="M9 10h.01" /><path d="M15 10h.01" /><path d="M9 14h.01" /><path d="M15 14h.01" /></svg>;
    case "calendar-clock":
      return <svg {...iconProps}><path d="M8 2v4" /><path d="M16 2v4" /><rect height="18" rx="2" width="18" x="3" y="4" /><path d="M3 10h18" /><circle cx="12" cy="15" r="3" /><path d="M12 13.5V15l1 1" /></svg>;
    case "car":
      return <svg {...iconProps}><path d="M5 17h14" /><path d="M6 17v2" /><path d="M18 17v2" /><path d="M4 13 6 7a2 2 0 0 1 2-1h8a2 2 0 0 1 2 1l2 6" /><path d="M4 13h16v4H4z" /><path d="M7 13v.01" /><path d="M17 13v.01" /></svg>;
    case "clipboard-list":
      return <svg {...iconProps}><rect height="16" rx="2" width="14" x="5" y="5" /><path d="M9 5a3 3 0 0 1 6 0" /><path d="M9 11h.01" /><path d="M12 11h4" /><path d="M9 15h.01" /><path d="M12 15h4" /></svg>;
    case "clock":
      return <svg {...iconProps}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case "circle":
      return <svg {...iconProps}><circle cx="12" cy="12" r="8" /></svg>;
    case "circle-dot":
      return <svg {...iconProps}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /></svg>;
    case "compass":
      return <svg {...iconProps}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></svg>;
    case "contact":
      return <svg {...iconProps}><rect height="16" rx="2" width="14" x="5" y="4" /><circle cx="12" cy="10" r="2.5" /><path d="M8.5 18a3.5 3.5 0 0 1 7 0" /><path d="M3 8h2" /><path d="M3 16h2" /></svg>;
    case "dumbbell":
      return <svg {...iconProps}><path d="M6 7v10" /><path d="M18 7v10" /><path d="M3 9v6" /><path d="M21 9v6" /><path d="M6 12h12" /></svg>;
    case "footprints":
      return <svg {...iconProps}><path d="M8.5 11.5C7 11.5 6 10 6 8.5S7 5 8.5 5 11 6.5 11 8s-1 3.5-2.5 3.5Z" /><path d="M6 14c-1.2.8-2 2-2 3.5C4 19 5 20 6.5 20S9 19 9 17.5C9 16 7.6 14.8 6 14Z" /><path d="M16 10c-1.5 0-2.5-1.5-2.5-3S14.5 3.5 16 3.5 18.5 5 18.5 6.5 17.5 10 16 10Z" /><path d="M17.5 12.5c-1.6 0-3 1.2-3 3 0 1.5 1 2.5 2.5 2.5s2.5-1 2.5-2.5c0-1.4-.8-2.4-2-3Z" /></svg>;
    case "graduation-cap":
      return <svg {...iconProps}><path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c3 2 9 2 12 0v-5" /><path d="M22 10v6" /></svg>;
    case "hammer":
      return <svg {...iconProps}><path d="m15 12-8.5 8.5a2 2 0 0 1-3-3L12 9" /><path d="m17 7 3 3" /><path d="m13 3 8 8" /><path d="M11 5 9 7l3 3 2-2" /></svg>;
    case "heart-handshake":
      return <svg {...iconProps}><path d="M19 14c1.5-1.5 2-4 .4-5.6a4 4 0 0 0-5.7 0L12 10l-1.7-1.6a4 4 0 0 0-5.7 0C3 10 3.5 12.5 5 14l7 7 7-7Z" /><path d="m8 14 2 2 4-4 2 2" /></svg>;
    case "heart-pulse":
      return <svg {...iconProps}><path d="M19 14c1.5-1.5 2-4 .4-5.6a4 4 0 0 0-5.7 0L12 10l-1.7-1.6a4 4 0 0 0-5.7 0C3 10 3.5 12.5 5 14l7 7 3-3" /><path d="M3 13h4l2-4 4 8 2-4h6" /></svg>;
    case "home":
      return <svg {...iconProps}><path d="m3 11 9-8 9 8" /><path d="M5 10v11h14V10" /><path d="M9 21v-6h6v6" /></svg>;
    case "kettlebell":
      return <svg {...iconProps}><path d="M8 10V8a4 4 0 0 1 8 0v2" /><path d="M7 10h10l2 9a2 2 0 0 1-2 3H7a2 2 0 0 1-2-3l2-9Z" /><path d="M10 8h4" /></svg>;
    case "more-horizontal":
      return <svg {...iconProps}><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></svg>;
    case "moon":
      return <svg {...iconProps}><path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5Z" /></svg>;
    case "panel-top":
      return <svg {...iconProps}><rect height="14" rx="2" width="18" x="3" y="5" /><path d="M3 10h18" /></svg>;
    case "plane":
      return <svg {...iconProps}><path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4 20-7Z" /></svg>;
    case "runner":
      return <svg {...iconProps}><circle cx="13" cy="4" r="2" /><path d="m7 21 3-6" /><path d="m17 21-4-6-4-2 2-5 4 2 3 4" /><path d="M5 10h4" /></svg>;
    case "ruler":
      return <svg {...iconProps}><path d="m4 15 11-11 5 5L9 20l-5-5Z" /><path d="m8 11 2 2" /><path d="m11 8 2 2" /><path d="m14 5 2 2" /></svg>;
    case "scale":
      return <svg {...iconProps}><path d="M7 20h10" /><path d="M12 4v16" /><path d="M5 7h14" /><path d="m6 7-3 6h6L6 7Z" /><path d="m18 7-3 6h6l-3-6Z" /></svg>;
    case "settings":
      return <svg {...iconProps}><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7.1 4l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.9 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.7 1Z" /></svg>;
    case "shield":
      return <svg {...iconProps}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="M9 12l2 2 4-5" /></svg>;
    case "shuffle":
      return <svg {...iconProps}><path d="M16 3h5v5" /><path d="M4 20 21 3" /><path d="M21 16v5h-5" /><path d="m15 15 6 6" /><path d="m4 4 5 5" /></svg>;
    case "sparkles":
      return <svg {...iconProps}><path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></svg>;
    case "square":
      return <svg {...iconProps}><rect height="14" rx="2" width="14" x="5" y="5" /></svg>;
    case "stretch":
      return <svg {...iconProps}><path d="M4 12h16" /><path d="m7 8-3 4 3 4" /><path d="m17 8 3 4-3 4" /></svg>;
    case "trophy":
      return <svg {...iconProps}><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M5 5H3v3a4 4 0 0 0 4 4" /><path d="M19 5h2v3a4 4 0 0 1-4 4" /></svg>;
    case "trees":
      return <svg {...iconProps}><path d="M6 18h12" /><path d="M6 18V9l-3 5h6L6 9Z" /><path d="M16 18V6l-4 7h8l-4-7Z" /></svg>;
    case "utensils":
      return <svg {...iconProps}><path d="M4 3v8" /><path d="M7 3v8" /><path d="M4 7h3" /><path d="M5.5 11v10" /><path d="M16 3c2 1.7 3 3.6 3 6s-1 4.3-3 6V3Z" /><path d="M16 15v6" /></svg>;
    case "user":
      return <svg {...iconProps}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
    case "users":
      return <svg {...iconProps}><path d="M16 21a6 6 0 0 0-12 0" /><circle cx="10" cy="8" r="4" /><path d="M22 21a5 5 0 0 0-4-4.9" /><path d="M16 3.1a4 4 0 0 1 0 7.8" /></svg>;
    case "wallet":
      return <svg {...iconProps}><path d="M19 7V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-5a2 2 0 0 1 0-4h5Z" /><path d="M16 11h.01" /></svg>;
    case "waves":
      return <svg {...iconProps}><path d="M3 8c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" /><path d="M3 14c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" /><path d="M3 20c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" /></svg>;
    default:
      return <svg {...iconProps}><circle cx="12" cy="12" r="8" /></svg>;
  }
}

type ProfileTab =
  | "overview"
  | "goals"
  | "readiness"
  | "training"
  | "recovery"
  | "nutrition"
  | "coachApp";

type ProfileCompletionSection =
  | ProfileTab
  | "benchmarks"
  | "body"
  | "circumstances"
  | "goals"
  | "measurements"
  | "planDirection"
  | "preferences";

type ProfileAccordionSection =
  | "appCoachNotes"
  | "benchmarks"
  | "measurements"
  | "myBody"
  | "planBuilder"
  | "planDirection"
  | "previousExperience"
  | "readiness"
  | "specialCircumstances";

type ProfileAccordionState = Record<ProfileAccordionSection, boolean>;

type ProfileOrbiterCard = {
  accordion?: ProfileAccordionSection;
  completion: number;
  expandsToFullCard?: boolean;
  helper: string;
  icon: SelectorIconName;
  label: string;
  references: string[];
  stat: string;
  tab: ProfileTab;
  targetId: string;
  tone: string;
};

type ProfileHubOrbitItem = {
  action?: "logout";
  achievements?: AchievementBadgeItem[];
  buttonLabel?: string;
  helper: string;
  href?: string;
  icon: SelectorIconName;
  label: string;
  onSelect?: () => void;
  references: string[];
  stat: string;
  tone: string;
};

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
  weightTrend: "Gaining" | "Maintaining" | "Losing" | "Fluctuating" | "Not Sure";
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
type MetricColor =
  | "amber"
  | "blue"
  | "cyan"
  | "emerald"
  | "green"
  | "magenta"
  | "orange"
  | "purple"
  | "rose"
  | "steel"
  | "teal"
  | "violet";
type ExerciseConfidence = {
  cardioEquipment: string;
  complexMovements: string;
  freeWeights: string;
  machines: string;
  mobilityWork: string;
};
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

type BodyMetricHistoryPoint = {
  basalMetabolicRate?: string;
  bodyFat: string;
  leanMass?: string;
  metabolicAge?: string;
  muscleMass: string;
  notes?: string;
  provider?: string;
  rawFileName?: string;
  savedAt: string;
  source: string;
  sourceSystem?: string;
  visceralFat?: string;
  waist: string;
  weight: string;
  weightTrend: string;
};

type BodyScanDataField =
  | "savedAt"
  | "provider"
  | "weight"
  | "bodyFat"
  | "waist"
  | "muscleMass"
  | "leanMass"
  | "visceralFat"
  | "metabolicAge"
  | "basalMetabolicRate"
  | "notes";

type BodyScanColumnMapping = Partial<Record<BodyScanDataField, string>>;

type NormalizedBodyScanRecord = BodyMetricHistoryPoint & {
  id: string;
  importedAt: string;
  mappedColumns?: BodyScanColumnMapping;
  provider: string;
};

type BodyScanManualDraft = {
  basalMetabolicRate: string;
  bodyFat: string;
  leanMass: string;
  metabolicAge: string;
  muscleMass: string;
  notes: string;
  provider: string;
  scanDate: string;
  visceralFat: string;
  waist: string;
  weight: string;
};

type BodyScanCsvPreview = {
  fileName: string;
  importedCount: number;
  mappedColumns: BodyScanColumnMapping;
  unmappedHeaders: string[];
};

type SoundFitnessProfile = {
  adaptivePlanningFactors: string[];
  adaptivePlanningNotes: Record<string, string>;
  age: string;
  appPersonalization: AppPersonalization;
  avatarUrl?: string;
  benchmarks: Benchmark[];
  bodyModel: BodyModel;
  bodyFat: string;
  bodyMetricHistory: BodyMetricHistoryPoint[];
  bodyScanImports: NormalizedBodyScanRecord[];
  bodyScanSource: string;
  bodyGoalMode: BodyGoalMode;
  bodyStatus: BodyStatus;
  birthday: string;
  city: string;
  state: string;
  coachNotes: string;
  cardioPriority: number;
  calorieGoalKnown: string;
  currentProgram: string;
  currentWeight: string;
  displayName: string;
  email?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  energyLevel: number;
  availableEquipment: string[];
  equipment: string[];
  consistencyHistory: string;
  exerciseConfidence: ExerciseConfidence;
  exerciseVarietyPreference: string;
  exercisesToAvoid: string;
  experienceLevel: string;
  familiarityAreas: string[];
  fullName?: string;
  gender: BodyModel;
  goalDeadline: string;
  goalMode: GoalMode;
  planDirections: GoalMode[];
  goalPriorityRanking: string;
  goalWeight: string;
  handle?: string;
  height: string;
  hoursWorkedPerWeek: string;
  injuries: InjuryProfile[];
  lifestyleConstraints: LifestyleConstraints;
  measurements: BodyMeasurements;
  memberType: string;
  muscleMass: string;
  nutritionDirection: NutritionDirection;
  occupation: string;
  planDirectionNotes: string;
  planFlexibilityPreference: string;
  phone: string;
  preferredDays: string[];
  preferredSplit: string;
  preferredSplits: string[];
  previousCoaching: string[];
  primaryGoal: string;
  priorityExercises: string;
  proteinConsistency: string;
  recoveryPreferences: string[];
  recentConsistency: string;
  restingHeartRate: string;
  roboCoachGuidanceLevel: string;
  scheduleConsistency: string;
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
  trainingLocations: string[];
  trainingStyles: string[];
  travelTrainingNotes: string;
  bestTimeOfDay: string;
  videoReviewInterest: string;
  waist: string;
  workoutIntensityPreference: string;
  cardioPreference: string;
  cardioPreferences: string[];
  mobilityPreference: string;
  mobilityPreferences: string[];
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
  memberSinceAt: string;
};

const profileOverviewSectionShellClass =
  "relative z-0 overflow-visible rounded-[32px] border border-cyan-200/16 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.14),transparent_30%),radial-gradient(circle_at_88%_0%,rgba(217,70,239,0.10),transparent_32%),rgba(15,23,42,0.62)] shadow-[0_24px_80px_rgba(0,0,0,0.36),0_0_44px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl";
const profileOverviewSectionGlowClass =
  "pointer-events-none absolute inset-x-8 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-cyan-200/60 to-fuchsia-200/45";
const profileOverviewSubsectionClass =
  "relative z-0 overflow-visible rounded-[28px] border border-cyan-200/14 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.12),transparent_32%),radial-gradient(circle_at_88%_0%,rgba(217,70,239,0.08),transparent_30%),rgba(15,23,42,0.54)] p-4 shadow-[0_0_32px_rgba(34,211,238,0.06),inset_0_1px_0_rgba(255,255,255,0.08)]";
const profileOverviewMetricCardClass =
  "relative overflow-hidden rounded-[26px] border border-cyan-200/14 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.12),transparent_38%),rgba(15,23,42,0.58)] p-4 shadow-[0_18px_56px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08)]";

const tabs: Array<{ id: ProfileTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "goals", label: "Goals" },
  { id: "readiness", label: "Training Readiness" },
  { id: "recovery", label: "Pain / Recovery Profile" },
  { id: "nutrition", label: "Nutrition" },
  { id: "coachApp", label: "Coach + App" },
];
const profileDetailTabs = tabs.filter((tab) => tab.id !== "goals");
const profileOrbiterCardStartRow = 1;
const DEFAULT_PROFILE_HUB_INDEX = 1;
const DEFAULT_PROFILE_HUB_ACCOUNT_INDEX = 0;
const DEFAULT_PROFILE_HUB_LAYER = 1;
const PROFILE_HUB_HORIZONTAL_DRAG_THRESHOLD = 56;
const PROFILE_HUB_HORIZONTAL_WHEEL_THRESHOLD = 42;
const PROFILE_ORBITER_VERTICAL_WHEEL_DELAY_MS = 760;
const getProfileOrbiterRowForTab = (tabId: ProfileTab) => {
  const cardRowIndex = tabs.findIndex((tab) => tab.id === tabId);
  return profileOrbiterCardStartRow + Math.max(0, cardRowIndex);
};

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

const selectablePlanDirectionIds = goalCards
  .filter((goal) => goal.id !== "Maintain")
  .map((goal) => goal.id);

const isSelectablePlanDirection = (value: unknown): value is GoalMode =>
  typeof value === "string" &&
  selectablePlanDirectionIds.includes(value as GoalMode);

const goalVisualStyles: Record<
  GoalMode,
  {
    hoverCard: string;
    icon: string;
    iconActive: string;
    iconIdle: string;
    selectedCard: string;
    signalActive: string;
    signalIdle: string;
    statusActive: string;
    statusIdle: string;
    wash: string;
  }
> = {
  "Build Muscle": {
    hoverCard:
      "hover:border-orange-200/48 hover:bg-orange-300/10 hover:shadow-[0_0_30px_rgba(251,146,60,0.18)] focus-visible:border-orange-200/50 focus-visible:shadow-[0_0_30px_rgba(251,146,60,0.18)]",
    icon: "\u{1F4AA}",
    iconActive:
      "border-orange-100/45 bg-orange-300/18 text-orange-50 shadow-[0_0_26px_rgba(251,146,60,0.26)]",
    iconIdle: "border-orange-200/18 bg-orange-300/8 text-orange-100",
    selectedCard:
      "border-orange-200/70 bg-[radial-gradient(circle_at_18%_0%,rgba(248,113,113,0.28),transparent_38%),radial-gradient(circle_at_88%_10%,rgba(251,146,60,0.22),transparent_34%),rgba(15,23,42,0.62)] shadow-[0_0_40px_rgba(251,146,60,0.24)]",
    signalActive: "border-orange-100/40 bg-orange-300/18 text-orange-50",
    signalIdle: "border-orange-200/18 bg-orange-300/8 text-orange-100",
    statusActive: "border-orange-100/40 bg-orange-300/18 text-orange-50",
    statusIdle: "border-white/10 bg-white/[0.04] text-orange-100/72 group-hover/card:text-orange-50",
    wash: "from-red-500/34 via-orange-300/20 to-transparent",
  },
  "Lose Fat": {
    hoverCard:
      "hover:border-yellow-200/48 hover:bg-yellow-300/10 hover:shadow-[0_0_30px_rgba(250,204,21,0.18)] focus-visible:border-yellow-200/50 focus-visible:shadow-[0_0_30px_rgba(250,204,21,0.18)]",
    icon: "\u{1F525}",
    iconActive:
      "border-yellow-100/45 bg-yellow-300/18 text-yellow-50 shadow-[0_0_26px_rgba(250,204,21,0.24)]",
    iconIdle: "border-yellow-200/18 bg-yellow-300/8 text-yellow-100",
    selectedCard:
      "border-yellow-200/70 bg-[radial-gradient(circle_at_18%_0%,rgba(250,204,21,0.28),transparent_38%),radial-gradient(circle_at_88%_10%,rgba(251,191,36,0.20),transparent_34%),rgba(15,23,42,0.62)] shadow-[0_0_40px_rgba(250,204,21,0.22)]",
    signalActive: "border-yellow-100/42 bg-yellow-300/18 text-yellow-50",
    signalIdle: "border-yellow-200/18 bg-yellow-300/8 text-yellow-100",
    statusActive: "border-yellow-100/42 bg-yellow-300/18 text-yellow-50",
    statusIdle: "border-white/10 bg-white/[0.04] text-yellow-100/72 group-hover/card:text-yellow-50",
    wash: "from-yellow-300/34 via-amber-300/20 to-transparent",
  },
  Maintain: {
    hoverCard:
      "hover:border-slate-200/34 hover:bg-white/[0.07] hover:shadow-[0_0_24px_rgba(148,163,184,0.14)] focus-visible:border-slate-200/40",
    icon: "\u2696",
    iconActive:
      "border-slate-100/34 bg-slate-300/12 text-slate-50 shadow-[0_0_22px_rgba(148,163,184,0.18)]",
    iconIdle: "border-white/12 bg-white/[0.055] text-slate-100",
    selectedCard:
      "border-slate-200/50 bg-[radial-gradient(circle_at_18%_0%,rgba(148,163,184,0.18),transparent_38%),rgba(15,23,42,0.62)] shadow-[0_0_30px_rgba(148,163,184,0.16)]",
    signalActive: "border-slate-100/30 bg-slate-300/12 text-slate-50",
    signalIdle: "border-white/10 bg-white/[0.055] text-slate-300",
    statusActive: "border-slate-100/30 bg-slate-300/12 text-slate-50",
    statusIdle: "border-white/10 bg-white/[0.04] text-slate-500 group-hover/card:text-slate-200",
    wash: "from-slate-300/18 via-slate-400/10 to-transparent",
  },
  Strength: {
    hoverCard:
      "hover:border-blue-200/48 hover:bg-blue-300/10 hover:shadow-[0_0_30px_rgba(96,165,250,0.18)] focus-visible:border-blue-200/50 focus-visible:shadow-[0_0_30px_rgba(96,165,250,0.18)]",
    icon: "\u{1F3CB}\uFE0F",
    iconActive:
      "border-blue-100/45 bg-blue-300/18 text-blue-50 shadow-[0_0_26px_rgba(96,165,250,0.26)]",
    iconIdle: "border-blue-200/18 bg-blue-300/8 text-blue-100",
    selectedCard:
      "border-blue-200/70 bg-[radial-gradient(circle_at_18%_0%,rgba(59,130,246,0.28),transparent_38%),radial-gradient(circle_at_88%_10%,rgba(125,211,252,0.18),transparent_34%),rgba(15,23,42,0.62)] shadow-[0_0_40px_rgba(96,165,250,0.24)]",
    signalActive: "border-blue-100/42 bg-blue-300/18 text-blue-50",
    signalIdle: "border-blue-200/18 bg-blue-300/8 text-blue-100",
    statusActive: "border-blue-100/42 bg-blue-300/18 text-blue-50",
    statusIdle: "border-white/10 bg-white/[0.04] text-blue-100/72 group-hover/card:text-blue-50",
    wash: "from-blue-400/34 via-cyan-300/18 to-transparent",
  },
  Mobility: {
    hoverCard:
      "hover:border-teal-200/48 hover:bg-teal-300/10 hover:shadow-[0_0_30px_rgba(45,212,191,0.18)] focus-visible:border-teal-200/50 focus-visible:shadow-[0_0_30px_rgba(45,212,191,0.18)]",
    icon: "\u{1F9D8}",
    iconActive:
      "border-teal-100/45 bg-teal-300/18 text-teal-50 shadow-[0_0_26px_rgba(45,212,191,0.25)]",
    iconIdle: "border-teal-200/18 bg-teal-300/8 text-teal-100",
    selectedCard:
      "border-teal-200/70 bg-[radial-gradient(circle_at_18%_0%,rgba(45,212,191,0.25),transparent_38%),radial-gradient(circle_at_88%_10%,rgba(74,222,128,0.18),transparent_34%),rgba(15,23,42,0.62)] shadow-[0_0_40px_rgba(45,212,191,0.22)]",
    signalActive: "border-teal-100/42 bg-teal-300/18 text-teal-50",
    signalIdle: "border-teal-200/18 bg-teal-300/8 text-teal-100",
    statusActive: "border-teal-100/42 bg-teal-300/18 text-teal-50",
    statusIdle: "border-white/10 bg-white/[0.04] text-teal-100/72 group-hover/card:text-teal-50",
    wash: "from-emerald-300/30 via-teal-300/20 to-transparent",
  },
  Conditioning: {
    hoverCard:
      "hover:border-sky-200/48 hover:bg-sky-300/10 hover:shadow-[0_0_30px_rgba(56,189,248,0.18)] focus-visible:border-sky-200/50 focus-visible:shadow-[0_0_30px_rgba(56,189,248,0.18)]",
    icon: "\u26A1",
    iconActive:
      "border-sky-100/45 bg-sky-300/18 text-sky-50 shadow-[0_0_26px_rgba(56,189,248,0.26)]",
    iconIdle: "border-sky-200/18 bg-sky-300/8 text-sky-100",
    selectedCard:
      "border-sky-200/70 bg-[radial-gradient(circle_at_18%_0%,rgba(56,189,248,0.28),transparent_38%),radial-gradient(circle_at_88%_10%,rgba(34,211,238,0.18),transparent_34%),rgba(15,23,42,0.62)] shadow-[0_0_40px_rgba(56,189,248,0.22)]",
    signalActive: "border-sky-100/42 bg-sky-300/18 text-sky-50",
    signalIdle: "border-sky-200/18 bg-sky-300/8 text-sky-100",
    statusActive: "border-sky-100/42 bg-sky-300/18 text-sky-50",
    statusIdle: "border-white/10 bg-white/[0.04] text-sky-100/72 group-hover/card:text-sky-50",
    wash: "from-cyan-300/34 via-sky-300/20 to-transparent",
  },
  Recovery: {
    hoverCard:
      "hover:border-violet-200/48 hover:bg-violet-300/10 hover:shadow-[0_0_30px_rgba(167,139,250,0.18)] focus-visible:border-violet-200/50 focus-visible:shadow-[0_0_30px_rgba(167,139,250,0.18)]",
    icon: "\u272A",
    iconActive:
      "border-violet-100/45 bg-violet-300/18 text-violet-50 shadow-[0_0_26px_rgba(167,139,250,0.25)]",
    iconIdle: "border-violet-200/18 bg-violet-300/8 text-violet-100",
    selectedCard:
      "border-violet-200/70 bg-[radial-gradient(circle_at_18%_0%,rgba(167,139,250,0.28),transparent_38%),radial-gradient(circle_at_88%_10%,rgba(217,70,239,0.16),transparent_34%),rgba(15,23,42,0.62)] shadow-[0_0_40px_rgba(167,139,250,0.22)]",
    signalActive: "border-violet-100/42 bg-violet-300/18 text-violet-50",
    signalIdle: "border-violet-200/18 bg-violet-300/8 text-violet-100",
    statusActive: "border-violet-100/42 bg-violet-300/18 text-violet-50",
    statusIdle: "border-white/10 bg-white/[0.04] text-violet-100/72 group-hover/card:text-violet-50",
    wash: "from-violet-300/32 via-purple-300/18 to-transparent",
  },
  "General Health": {
    hoverCard:
      "hover:border-emerald-200/48 hover:bg-emerald-300/10 hover:shadow-[0_0_30px_rgba(52,211,153,0.18)] focus-visible:border-emerald-200/50 focus-visible:shadow-[0_0_30px_rgba(52,211,153,0.18)]",
    icon: "\u{1F33F}",
    iconActive:
      "border-emerald-100/45 bg-emerald-300/18 text-emerald-50 shadow-[0_0_26px_rgba(52,211,153,0.24)]",
    iconIdle: "border-emerald-200/18 bg-emerald-300/8 text-emerald-100",
    selectedCard:
      "border-emerald-200/70 bg-[radial-gradient(circle_at_18%_0%,rgba(52,211,153,0.26),transparent_38%),radial-gradient(circle_at_88%_10%,rgba(96,165,250,0.16),transparent_34%),rgba(15,23,42,0.62)] shadow-[0_0_40px_rgba(52,211,153,0.22)]",
    signalActive: "border-emerald-100/42 bg-emerald-300/18 text-emerald-50",
    signalIdle: "border-emerald-200/18 bg-emerald-300/8 text-emerald-100",
    statusActive: "border-emerald-100/42 bg-emerald-300/18 text-emerald-50",
    statusIdle: "border-white/10 bg-white/[0.04] text-emerald-100/72 group-hover/card:text-emerald-50",
    wash: "from-emerald-300/32 via-blue-300/16 to-transparent",
  },
  Performance: {
    hoverCard:
      "hover:border-fuchsia-200/48 hover:bg-fuchsia-300/10 hover:shadow-[0_0_30px_rgba(217,70,239,0.18)] focus-visible:border-fuchsia-200/50 focus-visible:shadow-[0_0_30px_rgba(217,70,239,0.18)]",
    icon: "\u{1F680}",
    iconActive:
      "border-fuchsia-100/45 bg-fuchsia-300/18 text-fuchsia-50 shadow-[0_0_26px_rgba(217,70,239,0.24)]",
    iconIdle: "border-fuchsia-200/18 bg-fuchsia-300/8 text-fuchsia-100",
    selectedCard:
      "border-fuchsia-200/70 bg-[radial-gradient(circle_at_18%_0%,rgba(217,70,239,0.26),transparent_38%),radial-gradient(circle_at_88%_10%,rgba(251,146,60,0.20),transparent_34%),rgba(15,23,42,0.62)] shadow-[0_0_40px_rgba(217,70,239,0.22)]",
    signalActive: "border-fuchsia-100/42 bg-fuchsia-300/18 text-fuchsia-50",
    signalIdle: "border-fuchsia-200/18 bg-fuchsia-300/8 text-fuchsia-100",
    statusActive: "border-fuchsia-100/42 bg-fuchsia-300/18 text-fuchsia-50",
    statusIdle: "border-white/10 bg-white/[0.04] text-fuchsia-100/72 group-hover/card:text-fuchsia-50",
    wash: "from-fuchsia-400/32 via-orange-300/18 to-transparent",
  },
};

const planDirectionInsights: Record<GoalMode, string> = {
  "Build Muscle": "Prioritize progressive overload, useful volume, and recovery support.",
  "Lose Fat": "Keep strength anchors while using steps, conditioning, and nutrition consistency.",
  Maintain: "Keep capacity, muscle, and mobility steady with repeatable sessions.",
  Strength: "Prioritize compound skill, heavier loading, longer rest, and repeatable benchmarks.",
  Mobility: "Add movement quality, joint prep, and range work around the main sessions.",
  Conditioning: "Build aerobic capacity, intervals, and repeatable output without burying recovery.",
  Recovery: "Lower training heat, protect pain-sensitive areas, and progress conservatively.",
  "General Health": "Build a balanced base of strength, mobility, conditioning, and consistency.",
  Performance: "Bias power, athletic patterns, conditioning quality, and performance testing.",
};

const getPlanDirectionLabel = (direction: GoalMode) =>
  goalCards.find((goal) => goal.id === direction)?.label || direction;

const getPlanDirectionComboInsight = (directions: GoalMode[]) => {
  if (!directions.length) {
    return "Choose up to 2 plan directions to unlock personalized programming insights.";
  }

  const primary = getPlanDirectionLabel(directions[0]).toLowerCase();
  const secondary = directions[1]
    ? getPlanDirectionLabel(directions[1]).toLowerCase()
    : "";

  if (!secondary) {
    return `Your plan should bias ${primary} as the main programming filter.`;
  }

  return `Your plan should bias ${primary} while using ${secondary} to shape accessories, warmups, recovery, and conditioning choices.`;
};

const planDirectionScrollbarThemes: Record<
  GoalMode,
  { from: string; glow: string; to: string; via: string }
> = {
  "Build Muscle": {
    from: "rgba(248,113,113,0.92)",
    glow: "rgba(251,146,60,0.42)",
    to: "rgba(251,146,60,0.86)",
    via: "rgba(251,191,36,0.88)",
  },
  "Lose Fat": {
    from: "rgba(250,204,21,0.94)",
    glow: "rgba(250,204,21,0.40)",
    to: "rgba(251,146,60,0.84)",
    via: "rgba(251,191,36,0.90)",
  },
  Maintain: {
    from: "rgba(148,163,184,0.72)",
    glow: "rgba(148,163,184,0.28)",
    to: "rgba(203,213,225,0.62)",
    via: "rgba(226,232,240,0.72)",
  },
  Strength: {
    from: "rgba(96,165,250,0.92)",
    glow: "rgba(96,165,250,0.42)",
    to: "rgba(34,211,238,0.80)",
    via: "rgba(125,211,252,0.88)",
  },
  "General Health": {
    from: "rgba(45,212,191,0.90)",
    glow: "rgba(45,212,191,0.38)",
    to: "rgba(134,239,172,0.76)",
    via: "rgba(34,211,238,0.84)",
  },
  Mobility: {
    from: "rgba(45,212,191,0.92)",
    glow: "rgba(45,212,191,0.42)",
    to: "rgba(74,222,128,0.78)",
    via: "rgba(94,234,212,0.88)",
  },
  Recovery: {
    from: "rgba(167,139,250,0.92)",
    glow: "rgba(167,139,250,0.40)",
    to: "rgba(217,70,239,0.76)",
    via: "rgba(196,181,253,0.86)",
  },
  Conditioning: {
    from: "rgba(52,211,153,0.90)",
    glow: "rgba(52,211,153,0.38)",
    to: "rgba(34,211,238,0.84)",
    via: "rgba(125,211,252,0.86)",
  },
  Performance: {
    from: "rgba(217,70,239,0.90)",
    glow: "rgba(217,70,239,0.40)",
    to: "rgba(251,146,60,0.78)",
    via: "rgba(244,114,182,0.86)",
  },
};

const getPlanDirectionScrollbarTheme = (directions: GoalMode[]) => {
  const primary = directions[0]
    ? planDirectionScrollbarThemes[directions[0]]
    : planDirectionScrollbarThemes.Strength;
  const secondary = directions[1]
    ? planDirectionScrollbarThemes[directions[1]]
    : planDirectionScrollbarThemes.Performance;

  return {
    from: primary.from,
    glow: directions[1] ? secondary.glow : primary.glow,
    to: secondary.to,
    via: directions[1] ? secondary.via : primary.via,
  };
};

const dayOptions = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const usStateOptions = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
  "District of Columbia",
];

type PreferenceCardOption = {
  accent: string;
  helper: string;
  id: string;
  title: string;
  visual: string;
};

type CompactOptionTone =
  | "amber"
  | "bodyweight"
  | "cyan"
  | "cyanSteel"
  | "electric"
  | "green"
  | "indigoSteel"
  | "lime"
  | "orange"
  | "purple"
  | "redOrange"
  | "rose"
  | "steel"
  | "tealViolet"
  | "violetBlue"
  | "warm";

type CompactOptionCard = {
  accent: string;
  icon: string;
  id: string;
  tone: CompactOptionTone;
  title: string;
};

const compactTrainingLocationOptions: CompactOptionCard[] = [
  {
    id: "gym",
    title: "Gym",
    tone: "steel",
    icon: "🏋",
    accent: "from-cyan-300/28 via-blue-500/14 to-slate-950",
  },
  {
    id: "home",
    title: "Home",
    tone: "warm",
    icon: "⌂",
    accent: "from-emerald-300/25 via-teal-500/12 to-slate-950",
  },
  {
    id: "apartment-gym",
    title: "Apt Gym",
    tone: "cyan",
    icon: "▦",
    accent: "from-sky-300/24 via-cyan-500/12 to-slate-950",
  },
  {
    id: "outdoors",
    title: "Outdoors",
    tone: "green",
    icon: "☀",
    accent: "from-lime-300/24 via-emerald-500/12 to-slate-950",
  },
  {
    id: "travel-hotel",
    title: "Travel",
    tone: "violetBlue",
    icon: "✈",
    accent: "from-orange-300/26 via-amber-500/12 to-slate-950",
  },
  {
    id: "limited-space",
    title: "Small Space",
    tone: "amber",
    icon: "□",
    accent: "from-violet-300/24 via-fuchsia-500/12 to-slate-950",
  },
];

const compactEquipmentOptions: CompactOptionCard[] = [
  {
    id: "bodyweight",
    title: "Bodyweight",
    tone: "bodyweight",
    icon: "◎",
    accent: "from-cyan-300/24 via-blue-500/12 to-slate-950",
  },
  {
    id: "dumbbells",
    title: "Dumbbells",
    tone: "cyanSteel",
    icon: "DB",
    accent: "from-emerald-300/24 via-teal-500/12 to-slate-950",
  },
  {
    id: "kettlebells",
    title: "Kettlebells",
    tone: "orange",
    icon: "KB",
    accent: "from-orange-300/24 via-amber-500/12 to-slate-950",
  },
  {
    id: "barbell",
    title: "Barbell",
    tone: "electric",
    icon: "BB",
    accent: "from-slate-200/18 via-cyan-500/10 to-slate-950",
  },
  {
    id: "machines",
    title: "Machines",
    tone: "indigoSteel",
    icon: "⚙",
    accent: "from-blue-300/24 via-indigo-500/12 to-slate-950",
  },
  {
    id: "cable",
    title: "Cable",
    tone: "cyan",
    icon: "⌁",
    accent: "from-sky-300/24 via-cyan-500/12 to-slate-950",
  },
  {
    id: "bands",
    title: "Bands",
    tone: "purple",
    icon: "≈",
    accent: "from-violet-300/24 via-fuchsia-500/12 to-slate-950",
  },
  {
    id: "bench",
    title: "Bench",
    tone: "warm",
    icon: "▭",
    accent: "from-amber-300/22 via-orange-500/10 to-slate-950",
  },
  {
    id: "pull-up-bar",
    title: "Pull-Up",
    tone: "lime",
    icon: "↟",
    accent: "from-lime-300/22 via-emerald-500/12 to-slate-950",
  },
  {
    id: "cardio-equipment",
    title: "Cardio",
    tone: "redOrange",
    icon: "♡",
    accent: "from-rose-300/22 via-orange-500/12 to-slate-950",
  },
  {
    id: "medicine-ball",
    title: "Med Ball",
    tone: "rose",
    icon: "●",
    accent: "from-pink-300/22 via-rose-500/10 to-slate-950",
  },
  {
    id: "suspension-trainer",
    title: "Suspension",
    tone: "tealViolet",
    icon: "⟂",
    accent: "from-teal-300/22 via-cyan-500/10 to-slate-950",
  },
];

const experienceLevelOptions: CompactOptionCard[] = [
  {
    id: "experience-beginner",
    title: "Beginner",
    tone: "cyan",
    icon: "NEW",
    accent: "from-cyan-300/30 via-sky-500/16 to-slate-950",
  },
  {
    id: "experience-returning",
    title: "Returning",
    tone: "warm",
    icon: "BACK",
    accent: "from-amber-300/28 via-orange-500/14 to-slate-950",
  },
  {
    id: "experience-intermediate",
    title: "Intermediate",
    tone: "electric",
    icon: "INT",
    accent: "from-blue-300/30 via-cyan-500/15 to-slate-950",
  },
  {
    id: "experience-advanced",
    title: "Advanced",
    tone: "purple",
    icon: "ADV",
    accent: "from-violet-300/30 via-fuchsia-500/15 to-slate-950",
  },
  {
    id: "experience-competitive",
    title: "Competitive Athlete",
    tone: "redOrange",
    icon: "PRO",
    accent: "from-red-300/30 via-orange-500/18 to-slate-950",
  },
];

const consistencyHistoryOptions: CompactOptionCard[] = [
  {
    id: "consistency-brand-new",
    title: "Brand New",
    tone: "cyan",
    icon: "0",
    accent: "from-cyan-300/26 via-blue-500/12 to-slate-950",
  },
  {
    id: "consistency-on-off",
    title: "On/Off Training",
    tone: "amber",
    icon: "ON",
    accent: "from-amber-300/28 via-stone-400/13 to-slate-950",
  },
  {
    id: "consistency-some",
    title: "Some Consistency",
    tone: "green",
    icon: "SOME",
    accent: "from-emerald-300/27 via-teal-500/13 to-slate-950",
  },
  {
    id: "consistency-one-year",
    title: "Consistent for 1+ Years",
    tone: "lime",
    icon: "1Y+",
    accent: "from-lime-300/26 via-emerald-500/13 to-slate-950",
  },
  {
    id: "consistency-long-term",
    title: "Long-Term Lifter",
    tone: "steel",
    icon: "LONG",
    accent: "from-slate-200/24 via-blue-400/15 to-slate-950",
  },
];

const familiarityAreaOptions: CompactOptionCard[] = [
  {
    id: "familiar-strength",
    title: "Strength Training",
    tone: "electric",
    icon: "STR",
    accent: "from-blue-300/30 via-cyan-500/14 to-slate-950",
  },
  {
    id: "familiar-hypertrophy",
    title: "Hypertrophy",
    tone: "redOrange",
    icon: "MUS",
    accent: "from-red-300/28 via-orange-500/15 to-slate-950",
  },
  {
    id: "familiar-olympic",
    title: "Olympic Lifting",
    tone: "cyanSteel",
    icon: "OLY",
    accent: "from-cyan-200/28 via-slate-300/13 to-slate-950",
  },
  {
    id: "familiar-powerlifting",
    title: "Powerlifting",
    tone: "steel",
    icon: "PL",
    accent: "from-slate-200/26 via-blue-500/14 to-slate-950",
  },
  {
    id: "familiar-calisthenics",
    title: "Calisthenics",
    tone: "bodyweight",
    icon: "BW",
    accent: "from-emerald-200/28 via-cyan-500/13 to-slate-950",
  },
  {
    id: "familiar-sports",
    title: "Sports Performance",
    tone: "orange",
    icon: "ATH",
    accent: "from-orange-300/28 via-amber-500/14 to-slate-950",
  },
  {
    id: "familiar-running",
    title: "Running",
    tone: "lime",
    icon: "RUN",
    accent: "from-lime-300/25 via-emerald-500/13 to-slate-950",
  },
  {
    id: "familiar-mobility",
    title: "Mobility/Yoga",
    tone: "green",
    icon: "MOB",
    accent: "from-teal-300/27 via-emerald-500/13 to-slate-950",
  },
  {
    id: "familiar-hiit",
    title: "CrossFit/HIIT",
    tone: "rose",
    icon: "HIIT",
    accent: "from-rose-300/28 via-orange-500/14 to-slate-950",
  },
  {
    id: "familiar-rehab",
    title: "Rehab/Correctives",
    tone: "tealViolet",
    icon: "FIX",
    accent: "from-teal-300/26 via-violet-500/13 to-slate-950",
  },
];

const previousCoachingOptions: CompactOptionCard[] = [
  {
    id: "coaching-self",
    title: "Self-Taught",
    tone: "warm",
    icon: "SELF",
    accent: "from-amber-300/27 via-orange-500/13 to-slate-950",
  },
  {
    id: "coaching-online",
    title: "Online Programs",
    tone: "cyan",
    icon: "APP",
    accent: "from-cyan-300/27 via-blue-500/13 to-slate-950",
  },
  {
    id: "coaching-trainer",
    title: "Personal Trainer",
    tone: "electric",
    icon: "PT",
    accent: "from-blue-300/29 via-cyan-500/14 to-slate-950",
  },
  {
    id: "coaching-sports",
    title: "Sports Coach",
    tone: "orange",
    icon: "COACH",
    accent: "from-orange-300/29 via-red-500/14 to-slate-950",
  },
  {
    id: "coaching-pt",
    title: "Physical Therapy",
    tone: "green",
    icon: "PTx",
    accent: "from-emerald-300/27 via-teal-500/13 to-slate-950",
  },
  {
    id: "coaching-group",
    title: "Group Fitness",
    tone: "purple",
    icon: "TEAM",
    accent: "from-purple-300/28 via-fuchsia-500/14 to-slate-950",
  },
];

type AdaptivePlanningFactorOption = CompactOptionCard & {
  effect: string;
  helper: string;
  placeholder: string;
};

const adaptivePlanningFactorOptions: AdaptivePlanningFactorOption[] = [
  {
    id: "parenting-kids",
    title: "Parenting / Kids",
    tone: "warm",
    icon: "KIDS",
    accent: "from-amber-200/28 via-orange-300/14 to-slate-950",
    helper: "Care windows, pickups, and kid routines that can shift training windows.",
    placeholder: "Example: school pickup at 3 PM, toddler nap window...",
    effect: "Can suggest shorter backups and flexible session timing.",
  },
  {
    id: "pregnancy",
    title: "Pregnancy",
    tone: "rose",
    icon: "PREG",
    accent: "from-pink-300/30 via-rose-500/14 to-slate-950",
    helper: "Coaching context for modifying intensity, recovery, and exercise selection.",
    placeholder: "Example: trimester, provider guidance, movements to avoid...",
    effect: "Can flag coach review and more conservative training defaults.",
  },
  {
    id: "postpartum",
    title: "Postpartum",
    tone: "purple",
    icon: "POST",
    accent: "from-purple-300/30 via-fuchsia-500/16 to-slate-950",
    helper: "Return-to-training context after birth, sleep disruption, and recovery demands.",
    placeholder: "Example: 10 weeks postpartum, pelvic floor plan, sleep broken...",
    effect: "Can bias toward progressive return and recovery spacing.",
  },
  {
    id: "shift-work",
    title: "Shift Work",
    tone: "violetBlue",
    icon: "SHIFT",
    accent: "from-violet-300/30 via-blue-500/16 to-slate-950",
    helper: "Rotating or night shifts that change energy and training windows.",
    placeholder: "Example: night shift 3 days/week...",
    effect: "Can adjust reminders, session timing, and intensity expectations.",
  },
  {
    id: "long-commute",
    title: "Long Commute",
    tone: "steel",
    icon: "COMM",
    accent: "from-slate-300/30 via-blue-400/18 to-slate-950",
    helper: "Commute load that reduces available training time.",
    placeholder: "Example: 75 minutes each way on weekdays...",
    effect: "Can prefer shorter sessions or fewer accessory blocks.",
  },
  {
    id: "travel",
    title: "Travel",
    tone: "violetBlue",
    icon: "TRVL",
    accent: "from-violet-300/30 via-blue-500/16 to-slate-950",
    helper: "Recurring travel that changes equipment, schedule, and training location.",
    placeholder: "Example: travel twice/month, hotel gym only...",
    effect: "Can swap in travel workouts and simplified planning.",
  },
  {
    id: "manual-labor-job",
    title: "Manual Labor Job",
    tone: "orange",
    icon: "LABR",
    accent: "from-orange-300/30 via-black/24 to-slate-950",
    helper: "Physically demanding work that adds fatigue outside training.",
    placeholder: "Example: warehouse shifts, lifting all day...",
    effect: "Can reduce extra volume and keep sessions repeatable.",
  },
  {
    id: "school-college",
    title: "School / College",
    tone: "cyan",
    icon: "SCHL",
    accent: "from-cyan-200/30 via-sky-400/16 to-slate-950",
    helper: "Class, study, and exam seasons that affect consistency.",
    placeholder: "Example: exams every Friday, labs until 8 PM...",
    effect: "Can simplify programming during heavy academic weeks.",
  },
  {
    id: "sports-season",
    title: "Sports Season",
    tone: "redOrange",
    icon: "GAME",
    accent: "from-red-300/30 via-orange-500/16 to-slate-950",
    helper: "Practice, games, tournaments, and sport fatigue that shape gym work.",
    placeholder: "Example: soccer games Sat/Sun, practice Tue/Thu...",
    effect: "Can reduce volume near practices and competitions.",
  },
  {
    id: "caregiving",
    title: "Caregiving",
    tone: "green",
    icon: "CARE",
    accent: "from-emerald-200/30 via-teal-400/16 to-slate-950",
    helper: "Care responsibilities that can interrupt blocks of training time.",
    placeholder: "Example: caring for parent after work...",
    effect: "Can prioritize flexible sessions and lower planning friction.",
  },
  {
    id: "high-stress-work",
    title: "High Stress Work",
    tone: "redOrange",
    icon: "WORK",
    accent: "from-red-300/30 via-orange-500/16 to-slate-950",
    helper: "Work stress periods that affect readiness and recovery capacity.",
    placeholder: "Example: quarter-end deadlines, high-stress calls...",
    effect: "Can shift toward maintenance or lower intensity blocks.",
  },
  {
    id: "unpredictable-schedule",
    title: "Unpredictable Schedule",
    tone: "amber",
    icon: "VAR",
    accent: "from-amber-300/28 via-stone-300/14 to-slate-950",
    helper: "Weeks that change quickly and need backup training options.",
    placeholder: "Example: schedule changes daily, on-call work...",
    effect: "Can create A/B/C session options and flexible day swapping.",
  },
  {
    id: "multiple-jobs",
    title: "Multiple Jobs",
    tone: "indigoSteel",
    icon: "2JOB",
    accent: "from-slate-200/24 via-indigo-400/15 to-slate-950",
    helper: "Multiple work commitments that can fragment availability.",
    placeholder: "Example: day job plus weekend shifts...",
    effect: "Can reduce weekly volume and emphasize repeatable minimums.",
  },
  {
    id: "injury-flare-ups",
    title: "Injury Flare-Ups",
    tone: "rose",
    icon: "FLR",
    accent: "from-pink-300/30 via-rose-500/14 to-slate-950",
    helper: "Self-reported flare-ups that may require exercise substitutions.",
    placeholder: "Example: knee flare-up after running...",
    effect: "Can prompt substitutions and coach review. Not medical advice.",
  },
  {
    id: "sleep-disruption",
    title: "Sleep Disruption",
    tone: "purple",
    icon: "SLEEP",
    accent: "from-purple-300/30 via-fuchsia-500/16 to-slate-950",
    helper: "Sleep interruptions that affect training readiness.",
    placeholder: "Example: newborn sleep, insomnia, early wakeups...",
    effect: "Can increase recovery spacing and lower intensity recommendations.",
  },
  {
    id: "financial-constraints",
    title: "Financial Constraints",
    tone: "lime",
    icon: "COST",
    accent: "from-lime-200/28 via-emerald-500/14 to-slate-950",
    helper: "Budget constraints that affect gym access, food choices, or equipment.",
    placeholder: "Example: no gym membership, budget grocery plan...",
    effect: "Can favor low-cost equipment and simple nutrition planning.",
  },
  {
    id: "limited-equipment",
    title: "Limited Equipment",
    tone: "cyanSteel",
    icon: "EQ",
    accent: "from-cyan-200/30 via-slate-400/14 to-slate-950",
    helper: "Limited tools available for training blocks.",
    placeholder: "Example: bands and dumbbells only...",
    effect: "Can substitute home workouts and low-equipment progressions.",
  },
  {
    id: "religious-cultural-scheduling",
    title: "Religious / Cultural Scheduling",
    tone: "tealViolet",
    icon: "TIME",
    accent: "from-teal-200/28 via-violet-500/14 to-slate-950",
    helper: "Observances, fasting windows, or scheduling patterns to respect.",
    placeholder: "Example: fasting period, no training on certain days...",
    effect: "Can adapt timing, intensity, and weekly layout respectfully.",
  },
  {
    id: "other",
    title: "Other",
    tone: "steel",
    icon: "MORE",
    accent: "from-slate-300/30 via-blue-400/18 to-slate-950",
    helper: "Anything else that should help the plan fit real life.",
    placeholder: "Example: anything the app should plan around...",
    effect: "Can add coach-visible context for future adaptive planning.",
  },
];

const adaptivePlanningFactorCardLabels: Record<string, string> = {
  caregiving: "Caregiving",
  "financial-constraints": "Budget",
  "high-stress-work": "High Stress",
  "injury-flare-ups": "Flare-Ups",
  "limited-equipment": "Limited Eq",
  "long-commute": "Commute",
  "manual-labor-job": "Labor Job",
  "multiple-jobs": "Multi-Job",
  "parenting-kids": "Kids",
  "religious-cultural-scheduling": "Cultural Time",
  "school-college": "School",
  "sleep-disruption": "Sleep",
  "sports-season": "Sports Season",
  "unpredictable-schedule": "Variable",
};

const compactOptionIcons: Record<string, string> = {
  "apartment-gym": "APT",
  bands: "\u2248",
  barbell: "BB",
  bench: "\u25AD",
  bodyweight: "BW",
  cable: "\u223F",
  "cardio-equipment": "\u2661",
  dumbbells: "DB",
  gym: "GYM",
  home: "\u2302",
  kettlebells: "KB",
  "limited-space": "\u25A1",
  machines: "\u2699",
  "medicine-ball": "MB",
  outdoors: "\u2600",
  "pull-up-bar": "PU",
  "suspension-trainer": "TRX",
  "travel-hotel": "\u2708",
};

const boldCompactOptionVisuals: Record<
  string,
  { accent: string; icon: string; shortLabel?: string }
> = {
  "apartment-gym": {
    accent: "from-cyan-300/34 via-sky-500/18 to-slate-950",
    icon: "APT",
    shortLabel: "Apt Gym",
  },
  bands: {
    accent: "from-purple-300/34 via-fuchsia-500/16 to-slate-950",
    icon: "BAND",
  },
  barbell: {
    accent: "from-blue-300/34 via-cyan-500/17 to-slate-950",
    icon: "BB",
  },
  bench: {
    accent: "from-amber-300/28 via-orange-500/14 to-slate-950",
    icon: "BNCH",
  },
  bodyweight: {
    accent: "from-emerald-300/30 via-cyan-500/15 to-slate-950",
    icon: "BW",
  },
  cable: {
    accent: "from-cyan-300/32 via-blue-500/15 to-slate-950",
    icon: "CBL",
  },
  "cardio-equipment": {
    accent: "from-red-300/34 via-orange-500/18 to-slate-950",
    icon: "CARD",
    shortLabel: "Cardio",
  },
  dumbbells: {
    accent: "from-cyan-200/36 via-slate-300/18 to-slate-950",
    icon: "DB",
  },
  gym: {
    accent: "from-sky-300/34 via-blue-500/18 to-slate-950",
    icon: "GYM",
  },
  home: {
    accent: "from-amber-300/34 via-orange-500/16 to-slate-950",
    icon: "HOME",
  },
  kettlebells: {
    accent: "from-orange-300/34 via-amber-500/16 to-slate-950",
    icon: "KB",
  },
  "limited-space": {
    accent: "from-yellow-300/32 via-stone-400/15 to-slate-950",
    icon: "SM",
    shortLabel: "Small Space",
  },
  machines: {
    accent: "from-blue-300/30 via-indigo-500/16 to-slate-950",
    icon: "MCH",
  },
  "medicine-ball": {
    accent: "from-pink-300/28 via-rose-500/14 to-slate-950",
    icon: "MED",
    shortLabel: "Med Ball",
  },
  outdoors: {
    accent: "from-emerald-300/34 via-teal-500/17 to-slate-950",
    icon: "OUT",
  },
  "pull-up-bar": {
    accent: "from-lime-300/30 via-emerald-500/15 to-slate-950",
    icon: "PULL",
    shortLabel: "Pull-Up",
  },
  "suspension-trainer": {
    accent: "from-teal-300/34 via-cyan-500/16 to-slate-950",
    icon: "TRX",
    shortLabel: "Suspension",
  },
  "travel-hotel": {
    accent: "from-violet-300/34 via-blue-500/18 to-slate-950",
    icon: "TRVL",
    shortLabel: "Travel",
  },
};

const selectorCardShortLabels: Record<string, string> = {
  ...adaptivePlanningFactorCardLabels,
  "assisted-stretch": "Assisted",
  "athletic-performance": "Athletic",
  "body-part": "Body Split",
  "coaching-group": "Group",
  "coaching-online": "Online",
  "coaching-pt": "PT",
  "coaching-self": "Self",
  "coaching-sports": "Coach",
  "coaching-trainer": "Trainer",
  "consistency-brand-new": "Brand New",
  "consistency-long-term": "Long-Term",
  "consistency-on-off": "On/Off",
  "consistency-one-year": "1+ Years",
  "consistency-some": "Some",
  correctives: "Corrective",
  "experience-advanced": "Advanced",
  "experience-beginner": "Beginner",
  "experience-competitive": "Athlete",
  "experience-intermediate": "Mid-Level",
  "experience-returning": "Returning",
  "familiar-calisthenics": "Calisthenics",
  "familiar-hiit": "HIIT",
  "familiar-hypertrophy": "Hypertrophy",
  "familiar-mobility": "Mobility",
  "familiar-olympic": "Olympic",
  "familiar-powerlifting": "Powerlift",
  "familiar-rehab": "Corrective",
  "familiar-running": "Running",
  "familiar-sports": "Sports",
  "familiar-strength": "Strength",
  "full-body": "Full Body",
  hiking: "Hiking",
  "low-impact": "Low Impact",
  "mobility-drills": "Mobility",
  "pain-free-movement": "Pain-Free",
  "push-pull-legs": "PPL",
  "recovery-sessions": "Recovery",
  "strength-mobility": "Strength+Mobility",
  stretching: "Stretch",
  "upper-lower": "Upper/Lower",
  "warm-up-mobility": "Warm-Up",
  "yoga-flow": "Yoga",
};

const preferenceCardTones: Record<string, CompactOptionTone> = {
  "assisted-stretch": "rose",
  "athletic-performance": "orange",
  "body-part": "rose",
  correctives: "amber",
  cycling: "electric",
  custom: "steel",
  "full-body": "cyan",
  hiking: "lime",
  hiit: "redOrange",
  "low-impact": "tealViolet",
  "mobility-drills": "green",
  "pain-free-movement": "tealViolet",
  "push-pull-legs": "redOrange",
  recovery: "violetBlue",
  "recovery-sessions": "cyan",
  rowing: "tealViolet",
  running: "orange",
  sports: "purple",
  stretching: "cyan",
  "strength-mobility": "green",
  "upper-lower": "electric",
  walking: "bodyweight",
  "warm-up-mobility": "warm",
  "yoga-flow": "violetBlue",
};

const selectorCardIconNames: Record<string, SelectorIconName> = {
  "apartment-gym": "building",
  "assisted-stretch": "heart-handshake",
  "athletic-performance": "trophy",
  bands: "stretch",
  barbell: "activity",
  bench: "panel-top",
  bodyweight: "user",
  "body-part": "circle-dot",
  cable: "waves",
  "cardio-equipment": "heart-pulse",
  caregiving: "heart-handshake",
  "coaching-group": "users",
  "coaching-online": "activity",
  "coaching-pt": "bandage",
  "coaching-self": "user",
  "coaching-sports": "trophy",
  "coaching-trainer": "users",
  "consistency-brand-new": "sparkles",
  "consistency-long-term": "trophy",
  "consistency-on-off": "shuffle",
  "consistency-one-year": "calendar-clock",
  "consistency-some": "activity",
  correctives: "bandage",
  cycling: "bike",
  custom: "settings",
  dumbbells: "dumbbell",
  "experience-advanced": "activity",
  "experience-beginner": "sparkles",
  "experience-competitive": "trophy",
  "experience-intermediate": "activity",
  "experience-returning": "shuffle",
  "familiar-calisthenics": "user",
  "familiar-hiit": "heart-pulse",
  "familiar-hypertrophy": "activity",
  "familiar-mobility": "stretch",
  "familiar-olympic": "activity",
  "familiar-powerlifting": "dumbbell",
  "familiar-rehab": "bandage",
  "familiar-running": "runner",
  "familiar-sports": "trophy",
  "familiar-strength": "dumbbell",
  "financial-constraints": "wallet",
  "full-body": "user",
  gym: "dumbbell",
  hiit: "heart-pulse",
  "high-stress-season": "brain",
  hiking: "trees",
  home: "home",
  "high-stress-work": "brain",
  "illness-return": "heart-pulse",
  injury: "bandage",
  "injury-flare-ups": "bandage",
  kettlebells: "kettlebell",
  "limited-equipment": "dumbbell",
  "limited-space": "square",
  "low-impact": "heart-handshake",
  "long-commute": "car",
  machines: "settings",
  "manual-labor": "hammer",
  "manual-labor-job": "hammer",
  "medicine-ball": "circle",
  "mobility-drills": "activity",
  "multiple-jobs": "briefcase",
  other: "more-horizontal",
  outdoors: "trees",
  "pain-flare": "bandage",
  "pain-free-movement": "heart-pulse",
  "parenting-kids": "baby",
  postpartum: "baby",
  pregnancy: "heart-pulse",
  "pull-up-bar": "arrow-up",
  "push-pull-legs": "shuffle",
  "recovery-sessions": "moon",
  "religious-cultural-scheduling": "calendar-clock",
  rowing: "waves",
  running: "runner",
  "school-college": "graduation-cap",
  "senior-support": "heart-handshake",
  "shift-work": "clock",
  "sleep-disruption": "moon",
  "sport-season": "trophy",
  sports: "trophy",
  "sports-season": "trophy",
  "surgery-history": "bandage",
  stretching: "stretch",
  "strength-mobility": "dumbbell",
  "suspension-trainer": "waves",
  travel: "plane",
  "travel-hotel": "plane",
  "unpredictable-schedule": "shuffle",
  "upper-lower": "square",
  walking: "footprints",
  "warm-up-mobility": "clock",
  "yoga-flow": "stretch",
};

type CompactOptionVisualStyle = {
  activeCard: string;
  check: string;
  iconActive: string;
  iconIdle: string;
  idleCard: string;
  line: string;
  surface: string;
};

const compactOptionVisualStyles: Record<CompactOptionTone, CompactOptionVisualStyle> = {
  amber: {
    activeCard:
      "border-amber-100/75 bg-amber-300/15 text-white shadow-[0_0_0_1px_rgba(253,230,138,0.28),0_0_32px_rgba(245,158,11,0.26),inset_0_1px_0_rgba(255,255,255,0.2)]",
    check:
      "border-amber-50/80 bg-amber-100 text-slate-950 shadow-[0_0_16px_rgba(251,191,36,0.56)]",
    iconActive:
      "border-amber-100/58 bg-amber-300/20 text-amber-50 shadow-[0_0_24px_rgba(251,191,36,0.32)]",
    iconIdle:
      "border-amber-200/20 bg-amber-300/8 text-amber-100 group-hover:border-amber-100/38 group-hover:bg-amber-300/14 group-hover:text-white",
    idleCard:
      "border-amber-200/12 bg-slate-950/62 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-amber-200/42 hover:bg-amber-300/10 hover:shadow-[0_0_24px_rgba(245,158,11,0.16)]",
    line: "from-transparent via-amber-300/75 to-transparent",
    surface: "from-amber-300/32 via-stone-300/16 to-slate-950",
  },
  bodyweight: {
    activeCard:
      "border-emerald-100/75 bg-emerald-300/15 text-white shadow-[0_0_0_1px_rgba(167,243,208,0.28),0_0_32px_rgba(45,212,191,0.25),inset_0_1px_0_rgba(255,255,255,0.2)]",
    check:
      "border-emerald-50/80 bg-emerald-100 text-slate-950 shadow-[0_0_16px_rgba(52,211,153,0.55)]",
    iconActive:
      "border-emerald-100/58 bg-emerald-300/20 text-emerald-50 shadow-[0_0_24px_rgba(52,211,153,0.3)]",
    iconIdle:
      "border-emerald-200/20 bg-emerald-300/8 text-emerald-100 group-hover:border-emerald-100/38 group-hover:bg-emerald-300/14 group-hover:text-white",
    idleCard:
      "border-emerald-200/12 bg-slate-950/62 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-emerald-200/42 hover:bg-emerald-300/10 hover:shadow-[0_0_24px_rgba(52,211,153,0.16)]",
    line: "from-transparent via-emerald-300/75 to-transparent",
    surface: "from-emerald-200/30 via-cyan-400/16 to-slate-950",
  },
  cyan: {
    activeCard:
      "border-cyan-100/75 bg-cyan-300/16 text-white shadow-[0_0_0_1px_rgba(103,232,249,0.3),0_0_34px_rgba(34,211,238,0.27),inset_0_1px_0_rgba(255,255,255,0.2)]",
    check:
      "border-cyan-50/80 bg-cyan-100 text-slate-950 shadow-[0_0_16px_rgba(103,232,249,0.58)]",
    iconActive:
      "border-cyan-100/58 bg-cyan-300/20 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.34)]",
    iconIdle:
      "border-cyan-200/20 bg-cyan-300/8 text-cyan-100 group-hover:border-cyan-100/38 group-hover:bg-cyan-300/14 group-hover:text-white",
    idleCard:
      "border-cyan-200/12 bg-slate-950/62 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-cyan-200/42 hover:bg-cyan-300/10 hover:shadow-[0_0_24px_rgba(34,211,238,0.17)]",
    line: "from-transparent via-cyan-300/80 to-transparent",
    surface: "from-cyan-200/32 via-sky-400/16 to-slate-950",
  },
  cyanSteel: {
    activeCard:
      "border-cyan-100/75 bg-cyan-300/14 text-white shadow-[0_0_0_1px_rgba(125,211,252,0.28),0_0_32px_rgba(14,165,233,0.23),inset_0_1px_0_rgba(255,255,255,0.2)]",
    check:
      "border-cyan-50/80 bg-cyan-100 text-slate-950 shadow-[0_0_16px_rgba(125,211,252,0.54)]",
    iconActive:
      "border-cyan-100/58 bg-cyan-300/18 text-cyan-50 shadow-[0_0_24px_rgba(125,211,252,0.3)]",
    iconIdle:
      "border-cyan-200/20 bg-cyan-300/8 text-cyan-100 group-hover:border-cyan-100/38 group-hover:bg-cyan-300/14 group-hover:text-white",
    idleCard:
      "border-cyan-200/12 bg-slate-950/62 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-cyan-200/42 hover:bg-cyan-300/9 hover:shadow-[0_0_24px_rgba(125,211,252,0.15)]",
    line: "from-transparent via-cyan-200/78 to-transparent",
    surface: "from-cyan-200/32 via-slate-300/14 to-slate-950",
  },
  electric: {
    activeCard:
      "border-blue-100/75 bg-blue-300/16 text-white shadow-[0_0_0_1px_rgba(191,219,254,0.28),0_0_34px_rgba(59,130,246,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]",
    check:
      "border-blue-50/80 bg-blue-100 text-slate-950 shadow-[0_0_16px_rgba(96,165,250,0.58)]",
    iconActive:
      "border-blue-100/58 bg-blue-300/20 text-blue-50 shadow-[0_0_24px_rgba(59,130,246,0.34)]",
    iconIdle:
      "border-blue-200/20 bg-blue-300/8 text-blue-100 group-hover:border-blue-100/38 group-hover:bg-blue-300/14 group-hover:text-white",
    idleCard:
      "border-blue-200/12 bg-slate-950/62 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-blue-200/42 hover:bg-blue-300/10 hover:shadow-[0_0_24px_rgba(59,130,246,0.18)]",
    line: "from-transparent via-blue-300/80 to-transparent",
    surface: "from-blue-200/34 via-cyan-500/18 to-slate-950",
  },
  green: {
    activeCard:
      "border-emerald-100/75 bg-emerald-300/16 text-white shadow-[0_0_0_1px_rgba(167,243,208,0.28),0_0_34px_rgba(20,184,166,0.26),inset_0_1px_0_rgba(255,255,255,0.2)]",
    check:
      "border-emerald-50/80 bg-emerald-100 text-slate-950 shadow-[0_0_16px_rgba(20,184,166,0.55)]",
    iconActive:
      "border-emerald-100/58 bg-emerald-300/20 text-emerald-50 shadow-[0_0_24px_rgba(20,184,166,0.3)]",
    iconIdle:
      "border-emerald-200/20 bg-emerald-300/8 text-emerald-100 group-hover:border-emerald-100/38 group-hover:bg-emerald-300/14 group-hover:text-white",
    idleCard:
      "border-emerald-200/12 bg-slate-950/62 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-emerald-200/42 hover:bg-emerald-300/10 hover:shadow-[0_0_24px_rgba(20,184,166,0.17)]",
    line: "from-transparent via-emerald-300/78 to-transparent",
    surface: "from-emerald-200/32 via-teal-400/17 to-slate-950",
  },
  indigoSteel: {
    activeCard:
      "border-indigo-100/75 bg-indigo-300/15 text-white shadow-[0_0_0_1px_rgba(199,210,254,0.28),0_0_32px_rgba(99,102,241,0.24),inset_0_1px_0_rgba(255,255,255,0.2)]",
    check:
      "border-indigo-50/80 bg-indigo-100 text-slate-950 shadow-[0_0_16px_rgba(129,140,248,0.55)]",
    iconActive:
      "border-indigo-100/58 bg-indigo-300/20 text-indigo-50 shadow-[0_0_24px_rgba(99,102,241,0.3)]",
    iconIdle:
      "border-indigo-200/20 bg-indigo-300/8 text-indigo-100 group-hover:border-indigo-100/38 group-hover:bg-indigo-300/14 group-hover:text-white",
    idleCard:
      "border-indigo-200/12 bg-slate-950/62 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-indigo-200/42 hover:bg-indigo-300/10 hover:shadow-[0_0_24px_rgba(99,102,241,0.15)]",
    line: "from-transparent via-indigo-300/75 to-transparent",
    surface: "from-slate-200/28 via-indigo-400/17 to-slate-950",
  },
  lime: {
    activeCard:
      "border-lime-100/75 bg-lime-300/15 text-white shadow-[0_0_0_1px_rgba(217,249,157,0.28),0_0_30px_rgba(132,204,22,0.24),inset_0_1px_0_rgba(255,255,255,0.2)]",
    check:
      "border-lime-50/80 bg-lime-100 text-slate-950 shadow-[0_0_16px_rgba(163,230,53,0.52)]",
    iconActive:
      "border-lime-100/58 bg-lime-300/20 text-lime-50 shadow-[0_0_24px_rgba(132,204,22,0.28)]",
    iconIdle:
      "border-lime-200/20 bg-lime-300/8 text-lime-100 group-hover:border-lime-100/38 group-hover:bg-lime-300/14 group-hover:text-white",
    idleCard:
      "border-lime-200/12 bg-slate-950/62 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-lime-200/42 hover:bg-lime-300/10 hover:shadow-[0_0_24px_rgba(132,204,22,0.14)]",
    line: "from-transparent via-lime-300/72 to-transparent",
    surface: "from-lime-200/30 via-emerald-500/15 to-slate-950",
  },
  orange: {
    activeCard:
      "border-orange-100/75 bg-orange-300/16 text-white shadow-[0_0_0_1px_rgba(254,215,170,0.28),0_0_32px_rgba(249,115,22,0.28),inset_0_1px_0_rgba(255,255,255,0.2)]",
    check:
      "border-orange-50/80 bg-orange-100 text-slate-950 shadow-[0_0_16px_rgba(251,146,60,0.58)]",
    iconActive:
      "border-orange-100/58 bg-orange-300/20 text-orange-50 shadow-[0_0_24px_rgba(249,115,22,0.34)]",
    iconIdle:
      "border-orange-200/20 bg-orange-300/8 text-orange-100 group-hover:border-orange-100/38 group-hover:bg-orange-300/14 group-hover:text-white",
    idleCard:
      "border-orange-200/12 bg-slate-950/62 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-orange-200/42 hover:bg-orange-300/10 hover:shadow-[0_0_24px_rgba(249,115,22,0.17)]",
    line: "from-transparent via-orange-300/78 to-transparent",
    surface: "from-orange-300/34 via-black/24 to-slate-950",
  },
  purple: {
    activeCard:
      "border-purple-100/75 bg-purple-300/16 text-white shadow-[0_0_0_1px_rgba(233,213,255,0.28),0_0_32px_rgba(168,85,247,0.28),inset_0_1px_0_rgba(255,255,255,0.2)]",
    check:
      "border-purple-50/80 bg-purple-100 text-slate-950 shadow-[0_0_16px_rgba(192,132,252,0.56)]",
    iconActive:
      "border-purple-100/58 bg-purple-300/20 text-purple-50 shadow-[0_0_24px_rgba(168,85,247,0.32)]",
    iconIdle:
      "border-purple-200/20 bg-purple-300/8 text-purple-100 group-hover:border-purple-100/38 group-hover:bg-purple-300/14 group-hover:text-white",
    idleCard:
      "border-purple-200/12 bg-slate-950/62 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-purple-200/42 hover:bg-purple-300/10 hover:shadow-[0_0_24px_rgba(168,85,247,0.17)]",
    line: "from-transparent via-purple-300/78 to-transparent",
    surface: "from-purple-300/32 via-fuchsia-500/17 to-slate-950",
  },
  redOrange: {
    activeCard:
      "border-red-100/75 bg-red-300/16 text-white shadow-[0_0_0_1px_rgba(254,202,202,0.28),0_0_34px_rgba(248,113,113,0.28),inset_0_1px_0_rgba(255,255,255,0.2)]",
    check:
      "border-red-50/80 bg-red-100 text-slate-950 shadow-[0_0_16px_rgba(248,113,113,0.58)]",
    iconActive:
      "border-red-100/58 bg-red-300/20 text-red-50 shadow-[0_0_24px_rgba(248,113,113,0.34)]",
    iconIdle:
      "border-red-200/20 bg-red-300/8 text-red-100 group-hover:border-red-100/38 group-hover:bg-red-300/14 group-hover:text-white",
    idleCard:
      "border-red-200/12 bg-slate-950/62 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-red-200/42 hover:bg-red-300/10 hover:shadow-[0_0_24px_rgba(248,113,113,0.17)]",
    line: "from-transparent via-red-300/78 to-transparent",
    surface: "from-red-300/34 via-orange-500/18 to-slate-950",
  },
  rose: {
    activeCard:
      "border-rose-100/75 bg-rose-300/16 text-white shadow-[0_0_0_1px_rgba(255,228,230,0.28),0_0_32px_rgba(244,63,94,0.27),inset_0_1px_0_rgba(255,255,255,0.2)]",
    check:
      "border-rose-50/80 bg-rose-100 text-slate-950 shadow-[0_0_16px_rgba(251,113,133,0.56)]",
    iconActive:
      "border-rose-100/58 bg-rose-300/20 text-rose-50 shadow-[0_0_24px_rgba(244,63,94,0.32)]",
    iconIdle:
      "border-rose-200/20 bg-rose-300/8 text-rose-100 group-hover:border-rose-100/38 group-hover:bg-rose-300/14 group-hover:text-white",
    idleCard:
      "border-rose-200/12 bg-slate-950/62 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-rose-200/42 hover:bg-rose-300/10 hover:shadow-[0_0_24px_rgba(244,63,94,0.16)]",
    line: "from-transparent via-rose-300/78 to-transparent",
    surface: "from-pink-300/32 via-rose-500/16 to-slate-950",
  },
  steel: {
    activeCard:
      "border-blue-100/75 bg-blue-300/15 text-white shadow-[0_0_0_1px_rgba(191,219,254,0.28),0_0_34px_rgba(59,130,246,0.27),inset_0_1px_0_rgba(255,255,255,0.2)]",
    check:
      "border-blue-50/80 bg-blue-100 text-slate-950 shadow-[0_0_16px_rgba(96,165,250,0.56)]",
    iconActive:
      "border-blue-100/58 bg-blue-300/20 text-blue-50 shadow-[0_0_24px_rgba(96,165,250,0.32)]",
    iconIdle:
      "border-blue-200/20 bg-blue-300/8 text-blue-100 group-hover:border-blue-100/38 group-hover:bg-blue-300/14 group-hover:text-white",
    idleCard:
      "border-blue-200/12 bg-slate-950/62 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-blue-200/42 hover:bg-blue-300/10 hover:shadow-[0_0_24px_rgba(59,130,246,0.16)]",
    line: "from-transparent via-blue-300/78 to-transparent",
    surface: "from-slate-300/34 via-blue-400/18 to-slate-950",
  },
  tealViolet: {
    activeCard:
      "border-teal-100/75 bg-teal-300/15 text-white shadow-[0_0_0_1px_rgba(153,246,228,0.28),0_0_32px_rgba(45,212,191,0.24),inset_0_1px_0_rgba(255,255,255,0.2)]",
    check:
      "border-teal-50/80 bg-teal-100 text-slate-950 shadow-[0_0_16px_rgba(45,212,191,0.54)]",
    iconActive:
      "border-teal-100/58 bg-teal-300/20 text-teal-50 shadow-[0_0_24px_rgba(45,212,191,0.3)]",
    iconIdle:
      "border-teal-200/20 bg-teal-300/8 text-teal-100 group-hover:border-teal-100/38 group-hover:bg-teal-300/14 group-hover:text-white",
    idleCard:
      "border-teal-200/12 bg-slate-950/62 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-teal-200/42 hover:bg-teal-300/10 hover:shadow-[0_0_24px_rgba(45,212,191,0.15)]",
    line: "from-transparent via-teal-300/76 to-transparent",
    surface: "from-teal-200/30 via-violet-500/16 to-slate-950",
  },
  violetBlue: {
    activeCard:
      "border-violet-100/75 bg-violet-300/16 text-white shadow-[0_0_0_1px_rgba(221,214,254,0.28),0_0_32px_rgba(139,92,246,0.28),inset_0_1px_0_rgba(255,255,255,0.2)]",
    check:
      "border-violet-50/80 bg-violet-100 text-slate-950 shadow-[0_0_16px_rgba(167,139,250,0.56)]",
    iconActive:
      "border-violet-100/58 bg-violet-300/20 text-violet-50 shadow-[0_0_24px_rgba(139,92,246,0.32)]",
    iconIdle:
      "border-violet-200/20 bg-violet-300/8 text-violet-100 group-hover:border-violet-100/38 group-hover:bg-violet-300/14 group-hover:text-white",
    idleCard:
      "border-violet-200/12 bg-slate-950/62 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-violet-200/42 hover:bg-violet-300/10 hover:shadow-[0_0_24px_rgba(139,92,246,0.17)]",
    line: "from-transparent via-violet-300/78 to-transparent",
    surface: "from-violet-300/32 via-blue-500/17 to-slate-950",
  },
  warm: {
    activeCard:
      "border-orange-100/75 bg-orange-300/14 text-white shadow-[0_0_0_1px_rgba(254,215,170,0.28),0_0_30px_rgba(251,146,60,0.22),inset_0_1px_0_rgba(255,255,255,0.2)]",
    check:
      "border-orange-50/80 bg-orange-100 text-slate-950 shadow-[0_0_16px_rgba(251,146,60,0.52)]",
    iconActive:
      "border-orange-100/58 bg-orange-300/18 text-orange-50 shadow-[0_0_24px_rgba(251,146,60,0.28)]",
    iconIdle:
      "border-orange-200/20 bg-orange-300/8 text-orange-100 group-hover:border-orange-100/38 group-hover:bg-orange-300/14 group-hover:text-white",
    idleCard:
      "border-orange-200/12 bg-slate-950/62 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-orange-200/42 hover:bg-orange-300/10 hover:shadow-[0_0_24px_rgba(251,146,60,0.14)]",
    line: "from-transparent via-orange-300/72 to-transparent",
    surface: "from-amber-200/30 via-orange-300/15 to-slate-950",
  },
};

const preferredSplitOptions: PreferenceCardOption[] = [
  {
    id: "full-body",
    title: "Full Body",
    helper: "Balanced sessions that touch the whole body each training day.",
    visual: "ALL",
    accent: "from-cyan-300/26 via-blue-500/12 to-slate-950",
  },
  {
    id: "upper-lower",
    title: "Upper / Lower",
    helper: "Alternates upper-body and lower-body emphasis across the week.",
    visual: "U/L",
    accent: "from-blue-300/24 via-indigo-500/12 to-slate-950",
  },
  {
    id: "push-pull-legs",
    title: "Push / Pull / Legs",
    helper: "Classic push, pull, and leg organization for higher frequency.",
    visual: "PPL",
    accent: "from-orange-300/24 via-red-500/12 to-slate-950",
  },
  {
    id: "body-part",
    title: "Body Part Split",
    helper: "Dedicated focus days for specific muscle groups and accessories.",
    visual: "SPLT",
    accent: "from-pink-300/22 via-rose-500/12 to-slate-950",
  },
  {
    id: "strength-mobility",
    title: "Strength + Mobility",
    helper: "Strength work paired with movement quality and joint preparation.",
    visual: "S+M",
    accent: "from-emerald-300/24 via-cyan-500/12 to-slate-950",
  },
  {
    id: "athletic-performance",
    title: "Athletic Performance",
    helper: "Power, conditioning, speed, carries, and sport-ready training.",
    visual: "ATH",
    accent: "from-amber-300/26 via-orange-500/12 to-slate-950",
  },
  {
    id: "custom",
    title: "Custom",
    helper: "Flexible organization that can adapt to your exact schedule.",
    visual: "CUS",
    accent: "from-slate-200/18 via-cyan-500/10 to-slate-950",
  },
];

const cardioPreferenceOptions: PreferenceCardOption[] = [
  {
    id: "walking",
    title: "Walking",
    helper: "Low-friction aerobic work, steps, and repeatable movement.",
    visual: "WALK",
    accent: "from-emerald-300/24 via-lime-500/12 to-slate-950",
  },
  {
    id: "running",
    title: "Running",
    helper: "Runs, intervals, tempo work, and aerobic conditioning.",
    visual: "RUN",
    accent: "from-orange-300/24 via-amber-500/12 to-slate-950",
  },
  {
    id: "cycling",
    title: "Cycling",
    helper: "Bike sessions for conditioning, endurance, or low-impact rides.",
    visual: "BIKE",
    accent: "from-cyan-300/24 via-blue-500/12 to-slate-950",
  },
  {
    id: "rowing",
    title: "Rowing",
    helper: "Full-body conditioning with repeatable output and low impact.",
    visual: "ROW",
    accent: "from-sky-300/24 via-teal-500/12 to-slate-950",
  },
  {
    id: "hiit",
    title: "HIIT",
    helper: "Short, higher-intensity intervals with careful session spacing.",
    visual: "HIIT",
    accent: "from-rose-300/24 via-orange-500/12 to-slate-950",
  },
  {
    id: "sports",
    title: "Sports",
    helper: "Cardio through sport, games, and athletic movement sessions.",
    visual: "PLAY",
    accent: "from-violet-300/24 via-fuchsia-500/12 to-slate-950",
  },
  {
    id: "hiking",
    title: "Hiking",
    helper: "Longer outdoor efforts, elevation, and steady aerobic work.",
    visual: "HIKE",
    accent: "from-lime-300/24 via-emerald-500/12 to-slate-950",
  },
  {
    id: "low-impact",
    title: "Low Impact",
    helper: "Joint-friendly conditioning using easier impact options.",
    visual: "LOW",
    accent: "from-teal-300/24 via-cyan-500/12 to-slate-950",
  },
];

const mobilityPreferenceOptions: PreferenceCardOption[] = [
  {
    id: "stretching",
    title: "Stretching",
    helper: "Simple flexibility work and cooldown-friendly positions.",
    visual: "STR",
    accent: "from-cyan-300/24 via-blue-500/12 to-slate-950",
  },
  {
    id: "yoga-flow",
    title: "Yoga Flow",
    helper: "Flow-based sessions for breathing, range, and control.",
    visual: "FLOW",
    accent: "from-violet-300/24 via-purple-500/12 to-slate-950",
  },
  {
    id: "assisted-stretch",
    title: "Assisted Stretch",
    helper: "Partner, strap, or guided stretching support when available.",
    visual: "AST",
    accent: "from-pink-300/22 via-fuchsia-500/12 to-slate-950",
  },
  {
    id: "mobility-drills",
    title: "Mobility Drills",
    helper: "Active range, joint prep, and repeatable movement drills.",
    visual: "MOB",
    accent: "from-emerald-300/24 via-teal-500/12 to-slate-950",
  },
  {
    id: "correctives",
    title: "Correctives",
    helper: "Targeted exercises for movement quality and control.",
    visual: "FIX",
    accent: "from-amber-300/24 via-orange-500/12 to-slate-950",
  },
  {
    id: "recovery-sessions",
    title: "Recovery Sessions",
    helper: "Light sessions that restore movement without adding heavy load.",
    visual: "REC",
    accent: "from-blue-300/24 via-cyan-500/12 to-slate-950",
  },
  {
    id: "warm-up-mobility",
    title: "Warm-Up Mobility",
    helper: "Pre-session prep that matches the lifts or movements ahead.",
    visual: "WARM",
    accent: "from-orange-300/24 via-yellow-500/12 to-slate-950",
  },
  {
    id: "pain-free-movement",
    title: "Pain-Free Movement",
    helper: "Movement options focused on comfort, confidence, and control.",
    visual: "EASE",
    accent: "from-rose-300/20 via-cyan-500/10 to-slate-950",
  },
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
const weightTrendOptions: Array<{
  accent: string;
  active: string;
  helper: string;
  icon: string;
  iconActive: string;
  iconIdle: string;
  value: BodyStatus["weightTrend"];
}> = [
  {
    accent: "from-emerald-300/70 to-cyan-300/40",
    active:
      "border-emerald-200/50 bg-emerald-300/14 text-emerald-50 shadow-[0_0_24px_rgba(52,211,153,0.16)]",
    helper: "Scale is moving up.",
    icon: "\u2191",
    iconActive: "border-emerald-100/42 bg-emerald-300/18 text-emerald-50",
    iconIdle: "border-emerald-200/16 bg-emerald-300/8 text-emerald-100/72",
    value: "Gaining",
  },
  {
    accent: "from-cyan-300/70 to-blue-300/40",
    active:
      "border-cyan-200/50 bg-cyan-300/14 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.16)]",
    helper: "Scale is mostly steady.",
    icon: "\u2022",
    iconActive: "border-cyan-100/42 bg-cyan-300/18 text-cyan-50",
    iconIdle: "border-cyan-200/16 bg-cyan-300/8 text-cyan-100/72",
    value: "Maintaining",
  },
  {
    accent: "from-orange-300/70 to-rose-300/40",
    active:
      "border-orange-200/50 bg-orange-300/14 text-orange-50 shadow-[0_0_24px_rgba(251,146,60,0.16)]",
    helper: "Scale is moving down.",
    icon: "\u2193",
    iconActive: "border-orange-100/42 bg-orange-300/18 text-orange-50",
    iconIdle: "border-orange-200/16 bg-orange-300/8 text-orange-100/72",
    value: "Losing",
  },
  {
    accent: "from-fuchsia-300/70 to-violet-300/40",
    active:
      "border-fuchsia-200/50 bg-fuchsia-300/14 text-fuchsia-50 shadow-[0_0_24px_rgba(217,70,239,0.16)]",
    helper: "Scale moves up and down.",
    icon: "\u2195",
    iconActive: "border-fuchsia-100/42 bg-fuchsia-300/18 text-fuchsia-50",
    iconIdle: "border-fuchsia-200/16 bg-fuchsia-300/8 text-fuchsia-100/72",
    value: "Fluctuating",
  },
  {
    accent: "from-slate-300/70 to-cyan-300/30",
    active:
      "border-slate-200/42 bg-white/[0.08] text-slate-50 shadow-[0_0_22px_rgba(148,163,184,0.14)]",
    helper: "Not enough recent trend data.",
    icon: "?",
    iconActive: "border-slate-100/32 bg-slate-300/12 text-slate-50",
    iconIdle: "border-white/12 bg-white/[0.05] text-slate-300",
    value: "Not Sure",
  },
];

const normalizeWeightTrend = (value: unknown): BodyStatus["weightTrend"] => {
  if (value === "Gaining" || value === "Trending up") return "Gaining";
  if (value === "Maintaining" || value === "Stable") return "Maintaining";
  if (value === "Losing" || value === "Trending down") return "Losing";
  if (value === "Fluctuating") return "Fluctuating";
  return "Not Sure";
};

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

type OccupationOption = {
  accent: string;
  description: string;
  icon: SelectorIconName;
  label: string;
  value: string;
};

const occupationOptions: OccupationOption[] = [
  {
    accent: "cyan",
    description: "Mostly seated work.",
    icon: "briefcase",
    label: "Desk Worker",
    value: "Desk Worker",
  },
  {
    accent: "emerald",
    description: "Active coaching hours.",
    icon: "dumbbell",
    label: "Trainer / Coach",
    value: "Trainer / Coach",
  },
  {
    accent: "orange",
    description: "Lifting or long shifts.",
    icon: "hammer",
    label: "Manual Labor",
    value: "Manual Labor",
  },
  {
    accent: "rose",
    description: "Long standing shifts.",
    icon: "heart-pulse",
    label: "Healthcare",
    value: "Healthcare",
  },
  {
    accent: "blue",
    description: "Routes and seated time.",
    icon: "car",
    label: "Driver",
    value: "Driver",
  },
  {
    accent: "violet",
    description: "Classes and study blocks.",
    icon: "graduation-cap",
    label: "Student",
    value: "Student",
  },
  {
    accent: "amber",
    description: "Classroom energy.",
    icon: "graduation-cap",
    label: "Teacher",
    value: "Teacher",
  },
  {
    accent: "purple",
    description: "Variable shifts.",
    icon: "users",
    label: "Service Industry",
    value: "Service Industry",
  },
  {
    accent: "steel",
    description: "Office or hybrid work.",
    icon: "settings",
    label: "Tech / Office",
    value: "Tech / Office",
  },
  {
    accent: "red",
    description: "High-alert shifts.",
    icon: "heart-pulse",
    label: "First Responder",
    value: "First Responder",
  },
  {
    accent: "slate",
    description: "Field readiness demands.",
    icon: "shield",
    label: "Military / Tactical",
    value: "Military / Tactical",
  },
  {
    accent: "lime",
    description: "Practices and events.",
    icon: "trophy",
    label: "Athlete",
    value: "Athlete",
  },
  {
    accent: "teal",
    description: "Care windows and home flow.",
    icon: "home",
    label: "Stay-at-Home Parent",
    value: "Stay-at-Home Parent",
  },
  {
    accent: "indigo",
    description: "Flexible schedule.",
    icon: "clock",
    label: "Retired",
    value: "Retired",
  },
  {
    accent: "zinc",
    description: "Custom work context.",
    icon: "more-horizontal",
    label: "Other",
    value: "Other",
  },
];

const normalizeOccupationValue = (occupation: string) => {
  const normalized = occupation.trim().toLowerCase();
  const legacyMap: Record<string, string> = {
    "desk worker": "Desk Worker",
    "manual labor": "Manual Labor",
    "trainer/coach": "Trainer / Coach",
    "trainer / coach": "Trainer / Coach",
  };
  const mapped = legacyMap[normalized];
  if (mapped) return mapped;
  return occupationOptions.find((option) => option.value.toLowerCase() === normalized)
    ?.value || occupation;
};

const sedentaryLevelOptions: SedentaryLevel[] = [
  "Low",
  "Moderate",
  "High",
  "Very High",
];

const measurementDefinitions: Array<{
  color: MetricColor;
  key: keyof Omit<BodyMeasurements, "custom" | "lastUpdated" | "progressPhotoNote" | "progressPhotos" | "unit">;
  label: string;
  max: number;
  min: number;
  step?: number;
}> = [
  { key: "neck", label: "Neck", min: 8, max: 26, step: 0.25, color: "steel" },
  { key: "shoulders", label: "Shoulders", min: 24, max: 72, step: 0.25, color: "purple" },
  { key: "chest", label: "Chest", min: 24, max: 70, step: 0.25, color: "orange" },
  { key: "waist", label: "Waist", min: 20, max: 70, step: 0.25, color: "teal" },
  { key: "hips", label: "Hips", min: 24, max: 72, step: 0.25, color: "magenta" },
  { key: "leftArm", label: "Left Arm", min: 6, max: 30, step: 0.25, color: "blue" },
  { key: "rightArm", label: "Right Arm", min: 6, max: 30, step: 0.25, color: "blue" },
  { key: "leftThigh", label: "Left Thigh", min: 12, max: 40, step: 0.25, color: "green" },
  { key: "rightThigh", label: "Right Thigh", min: 12, max: 40, step: 0.25, color: "green" },
  { key: "leftCalf", label: "Left Calf", min: 8, max: 28, step: 0.25, color: "cyan" },
  { key: "rightCalf", label: "Right Calf", min: 8, max: 28, step: 0.25, color: "cyan" },
  { key: "forearm", label: "Forearm", min: 6, max: 20, step: 0.25, color: "blue" },
  { key: "wrist", label: "Wrist", min: 4, max: 12, step: 0.1, color: "steel" },
  { key: "ankle", label: "Ankle", min: 5, max: 16, step: 0.1, color: "cyan" },
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

const metricAccentStyles: Record<
  MetricColor,
  {
    active: string;
    fillShadow: string;
    shell: string;
    stepper: string;
    thumbShadow: string;
    value: string;
  }
> = {
  amber: {
    active: "from-amber-300 to-orange-300 text-amber-100",
    fillShadow: "shadow-[0_0_20px_rgba(251,191,36,0.26)]",
    shell:
      "border-amber-200/18 bg-[radial-gradient(circle_at_12%_0%,rgba(251,191,36,0.12),transparent_34%),rgba(15,23,42,0.58)] hover:border-amber-200/30 hover:shadow-[0_0_26px_rgba(251,191,36,0.08)]",
    stepper: "hover:border-amber-200/35 hover:bg-amber-300/10 hover:text-amber-100",
    thumbShadow: "shadow-[0_0_20px_rgba(251,191,36,0.3)]",
    value: "text-amber-100",
  },
  blue: {
    active: "from-blue-300 to-cyan-300 text-blue-100",
    fillShadow: "shadow-[0_0_20px_rgba(96,165,250,0.28)]",
    shell:
      "border-blue-200/18 bg-[radial-gradient(circle_at_12%_0%,rgba(96,165,250,0.13),transparent_34%),rgba(15,23,42,0.58)] hover:border-blue-200/32 hover:shadow-[0_0_26px_rgba(96,165,250,0.09)]",
    stepper: "hover:border-blue-200/35 hover:bg-blue-300/10 hover:text-blue-100",
    thumbShadow: "shadow-[0_0_20px_rgba(96,165,250,0.3)]",
    value: "text-blue-100",
  },
  cyan: {
    active: "from-cyan-300 to-blue-400 text-cyan-100",
    fillShadow: "shadow-[0_0_20px_rgba(34,211,238,0.28)]",
    shell:
      "border-cyan-200/18 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.13),transparent_34%),rgba(15,23,42,0.58)] hover:border-cyan-200/32 hover:shadow-[0_0_26px_rgba(34,211,238,0.09)]",
    stepper: "hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100",
    thumbShadow: "shadow-[0_0_20px_rgba(34,211,238,0.3)]",
    value: "text-cyan-100",
  },
  emerald: {
    active: "from-emerald-300 to-teal-400 text-emerald-100",
    fillShadow: "shadow-[0_0_20px_rgba(52,211,153,0.28)]",
    shell:
      "border-emerald-200/18 bg-[radial-gradient(circle_at_12%_0%,rgba(52,211,153,0.13),transparent_34%),rgba(15,23,42,0.58)] hover:border-emerald-200/32 hover:shadow-[0_0_26px_rgba(52,211,153,0.09)]",
    stepper: "hover:border-emerald-200/35 hover:bg-emerald-300/10 hover:text-emerald-100",
    thumbShadow: "shadow-[0_0_20px_rgba(52,211,153,0.3)]",
    value: "text-emerald-100",
  },
  green: {
    active: "from-lime-300 to-emerald-400 text-lime-100",
    fillShadow: "shadow-[0_0_20px_rgba(132,204,22,0.25)]",
    shell:
      "border-lime-200/18 bg-[radial-gradient(circle_at_12%_0%,rgba(132,204,22,0.12),transparent_34%),rgba(15,23,42,0.58)] hover:border-lime-200/30 hover:shadow-[0_0_26px_rgba(132,204,22,0.08)]",
    stepper: "hover:border-lime-200/35 hover:bg-lime-300/10 hover:text-lime-100",
    thumbShadow: "shadow-[0_0_20px_rgba(132,204,22,0.28)]",
    value: "text-lime-100",
  },
  magenta: {
    active: "from-fuchsia-300 to-pink-400 text-fuchsia-100",
    fillShadow: "shadow-[0_0_20px_rgba(217,70,239,0.28)]",
    shell:
      "border-fuchsia-200/18 bg-[radial-gradient(circle_at_12%_0%,rgba(217,70,239,0.12),transparent_34%),rgba(15,23,42,0.58)] hover:border-fuchsia-200/30 hover:shadow-[0_0_26px_rgba(217,70,239,0.09)]",
    stepper: "hover:border-fuchsia-200/35 hover:bg-fuchsia-300/10 hover:text-fuchsia-100",
    thumbShadow: "shadow-[0_0_20px_rgba(217,70,239,0.3)]",
    value: "text-fuchsia-100",
  },
  orange: {
    active: "from-orange-300 to-red-400 text-orange-100",
    fillShadow: "shadow-[0_0_20px_rgba(251,146,60,0.28)]",
    shell:
      "border-orange-200/18 bg-[radial-gradient(circle_at_12%_0%,rgba(251,146,60,0.13),transparent_34%),rgba(15,23,42,0.58)] hover:border-orange-200/32 hover:shadow-[0_0_26px_rgba(251,146,60,0.09)]",
    stepper: "hover:border-orange-200/35 hover:bg-orange-300/10 hover:text-orange-100",
    thumbShadow: "shadow-[0_0_20px_rgba(251,146,60,0.3)]",
    value: "text-orange-100",
  },
  purple: {
    active: "from-purple-300 to-violet-400 text-purple-100",
    fillShadow: "shadow-[0_0_20px_rgba(168,85,247,0.28)]",
    shell:
      "border-purple-200/18 bg-[radial-gradient(circle_at_12%_0%,rgba(168,85,247,0.13),transparent_34%),rgba(15,23,42,0.58)] hover:border-purple-200/32 hover:shadow-[0_0_26px_rgba(168,85,247,0.09)]",
    stepper: "hover:border-purple-200/35 hover:bg-purple-300/10 hover:text-purple-100",
    thumbShadow: "shadow-[0_0_20px_rgba(168,85,247,0.3)]",
    value: "text-purple-100",
  },
  rose: {
    active: "from-rose-300 to-red-400 text-rose-100",
    fillShadow: "shadow-[0_0_20px_rgba(244,63,94,0.28)]",
    shell:
      "border-rose-200/18 bg-[radial-gradient(circle_at_12%_0%,rgba(244,63,94,0.12),transparent_34%),rgba(15,23,42,0.58)] hover:border-rose-200/30 hover:shadow-[0_0_26px_rgba(244,63,94,0.08)]",
    stepper: "hover:border-rose-200/35 hover:bg-rose-300/10 hover:text-rose-100",
    thumbShadow: "shadow-[0_0_20px_rgba(244,63,94,0.3)]",
    value: "text-rose-100",
  },
  steel: {
    active: "from-slate-200 to-blue-300 text-slate-100",
    fillShadow: "shadow-[0_0_20px_rgba(147,197,253,0.22)]",
    shell:
      "border-blue-200/16 bg-[radial-gradient(circle_at_12%_0%,rgba(147,197,253,0.12),transparent_34%),rgba(15,23,42,0.58)] hover:border-blue-200/28 hover:shadow-[0_0_24px_rgba(147,197,253,0.08)]",
    stepper: "hover:border-blue-200/35 hover:bg-blue-300/10 hover:text-blue-100",
    thumbShadow: "shadow-[0_0_20px_rgba(147,197,253,0.26)]",
    value: "text-blue-100",
  },
  teal: {
    active: "from-teal-300 to-cyan-400 text-teal-100",
    fillShadow: "shadow-[0_0_20px_rgba(45,212,191,0.28)]",
    shell:
      "border-teal-200/18 bg-[radial-gradient(circle_at_12%_0%,rgba(45,212,191,0.13),transparent_34%),rgba(15,23,42,0.58)] hover:border-teal-200/32 hover:shadow-[0_0_26px_rgba(45,212,191,0.09)]",
    stepper: "hover:border-teal-200/35 hover:bg-teal-300/10 hover:text-teal-100",
    thumbShadow: "shadow-[0_0_20px_rgba(45,212,191,0.3)]",
    value: "text-teal-100",
  },
  violet: {
    active: "from-violet-300 to-fuchsia-400 text-violet-100",
    fillShadow: "shadow-[0_0_20px_rgba(167,139,250,0.28)]",
    shell:
      "border-violet-200/18 bg-[radial-gradient(circle_at_12%_0%,rgba(167,139,250,0.13),transparent_34%),rgba(15,23,42,0.58)] hover:border-violet-200/32 hover:shadow-[0_0_26px_rgba(167,139,250,0.09)]",
    stepper: "hover:border-violet-200/35 hover:bg-violet-300/10 hover:text-violet-100",
    thumbShadow: "shadow-[0_0_20px_rgba(167,139,250,0.3)]",
    value: "text-violet-100",
  },
};

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
  adaptivePlanningFactors: [],
  adaptivePlanningNotes: {},
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
  bodyMetricHistory: [],
  bodyScanImports: [],
  bodyScanSource: "Manual Entry",
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
    weightTrend: "Not Sure",
  },
  birthday: "",
  city: "",
  state: "",
  coachNotes: "",
  cardioPriority: 5,
  calorieGoalKnown: "",
  currentProgram: "",
  currentWeight: "",
  displayName: "Member",
  emergencyContactName: "",
  emergencyContactPhone: "",
  energyLevel: 6,
  availableEquipment: ["Bodyweight", "Dumbbells"],
  equipment: ["Bodyweight", "Dumbbells"],
  consistencyHistory: "On/Off Training",
  exerciseConfidence: {
    cardioEquipment: "5",
    complexMovements: "4",
    freeWeights: "5",
    machines: "5",
    mobilityWork: "5",
  },
  exerciseVarietyPreference: "Moderate variety",
  exercisesToAvoid: "",
  experienceLevel: "Returning",
  familiarityAreas: ["Strength Training"],
  goalDeadline: "",
  goalMode: "Strength",
  planDirections: [],
  goalPriorityRanking: "Strength, recovery, consistency",
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
  muscleMass: "",
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
  planFlexibilityPreference: "Flexible plan",
  phone: "",
  preferredDays: ["Mon", "Wed", "Fri", "Sat"],
  preferredSplit: "Strength + Mobility",
  preferredSplits: ["Strength + Mobility"],
  previousCoaching: ["Self-Taught"],
  primaryGoal: "Strength + Mobility Plan",
  priorityExercises: "",
  proteinConsistency: "Moderate",
  recoveryPreferences: ["Mobility", "Walking/cardio"],
  recentConsistency: "Returning",
  restingHeartRate: "",
  roboCoachGuidanceLevel: "Balanced guidance",
  scheduleConsistency: "Mostly consistent",
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
  trainingLocations: ["Gym"],
  trainingStyles: ["Heavy Strength", "Mobility First"],
  travelTrainingNotes: "",
  bestTimeOfDay: "Evening",
  videoReviewInterest: "Maybe later",
  waist: "",
  workoutIntensityPreference: "Moderate hard",
  cardioPreference: "Zone 2 plus short finishers",
  cardioPreferences: ["Walking"],
  mobilityPreference: "Daily 8-12 minute resets",
  mobilityPreferences: ["Mobility Drills"],
  mobilityPriority: 6,
  userNotes: "",
  profileImage: "",
  recoveryPriority: 6,
  timeAvailability: 5,
  trainingIntensity: 6,
  updatedAt: "",
  weeklyConsistencyGoal: 80,
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizePlanDirections = (
  directions: unknown,
  fallbackGoalMode: unknown,
): GoalMode[] => {
  if (Array.isArray(directions)) {
    return Array.from(
      new Set(directions.filter(isSelectablePlanDirection)),
    ).slice(0, 2);
  }

  if (isSelectablePlanDirection(fallbackGoalMode)) return [fallbackGoalMode];

  return [];
};

const getSleepGoalHours = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? clampNumber(parsed, 4, 10) : 7.5;
};

const getNumberFromProfileValue = (value: string, fallback: number) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const bodyScanImportProviders = [
  "Manual Entry",
  "CSV Import",
  "InBody",
  "Fit3D",
  "DEXA",
  "BodPod",
  "Styku",
  "Evolt 360",
  "Tanita",
  "Withings",
  "Renpho",
  "Garmin Index",
  "Omron",
  "Hologic/Lunar DEXA",
  "Other",
];

const bodyScanDataFields = [
  "savedAt",
  "provider",
  "weight",
  "bodyFat",
  "waist",
  "muscleMass",
  "leanMass",
  "visceralFat",
  "metabolicAge",
  "basalMetabolicRate",
  "notes",
] as const satisfies readonly BodyScanDataField[];

const bodyScanMetricDataFields = [
  "weight",
  "bodyFat",
  "waist",
  "muscleMass",
  "leanMass",
  "visceralFat",
  "metabolicAge",
  "basalMetabolicRate",
] as const satisfies readonly BodyScanDataField[];

const bodyScanFieldLabels: Record<BodyScanDataField, string> = {
  basalMetabolicRate: "BMR / RMR",
  bodyFat: "Body Fat %",
  leanMass: "Lean Mass",
  metabolicAge: "Metabolic Age",
  muscleMass: "Muscle Mass",
  notes: "Notes",
  provider: "Provider",
  savedAt: "Scan Date",
  visceralFat: "Visceral Fat",
  waist: "Waist",
  weight: "Weight",
};

const bodyScanColumnAliases: Record<BodyScanDataField, string[]> = {
  basalMetabolicRate: [
    "bmr",
    "basal metabolic rate",
    "rmr",
    "resting metabolic rate",
  ],
  bodyFat: [
    "body fat",
    "body fat percent",
    "body fat %",
    "bodyfat",
    "fat percentage",
    "pbf",
    "percent body fat",
  ],
  leanMass: ["lean body mass", "lean mass", "fat free mass", "ffm"],
  metabolicAge: ["metabolic age", "body age"],
  muscleMass: [
    "muscle mass",
    "skeletal muscle mass",
    "smm",
    "dry lean mass",
  ],
  notes: ["note", "notes", "comment", "comments"],
  provider: ["provider", "scanner", "device", "source", "scan type"],
  savedAt: [
    "date",
    "datetime",
    "measurement date",
    "scan date",
    "scan time",
    "saved at",
    "test date",
  ],
  visceralFat: [
    "visceral adipose area",
    "visceral fat",
    "visceral fat area",
    "visceral fat level",
    "vfa",
  ],
  waist: ["abdomen", "waist", "waist circumference"],
  weight: ["body weight", "total body weight", "weight", "wt"],
};

const getBlankBodyScanManualDraft = (): BodyScanManualDraft => ({
  basalMetabolicRate: "",
  bodyFat: "",
  leanMass: "",
  metabolicAge: "",
  muscleMass: "",
  notes: "",
  provider: "Manual Entry",
  scanDate: new Date().toISOString().slice(0, 10),
  visceralFat: "",
  waist: "",
  weight: "",
});

const readBodyScanValue = (...values: unknown[]) => {
  const found = values.find(
    (value) =>
      (typeof value === "string" && value.trim().length > 0) ||
      (typeof value === "number" && Number.isFinite(value)),
  );
  return typeof found === "number" ? String(found) : typeof found === "string" ? found.trim() : "";
};

const normalizeBodyScanDate = (...values: unknown[]) => {
  const value = readBodyScanValue(...values);
  if (!value) return new Date().toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00`;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const normalizeBodyScanHeader = (value: string) =>
  value
    .toLowerCase()
    .replace(/%/g, " percent ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const isBodyScanDataField = (value: string): value is BodyScanDataField =>
  bodyScanDataFields.includes(value as BodyScanDataField);

const normalizeBodyScanColumnMapping = (
  value: unknown,
): BodyScanColumnMapping => {
  const record = asRecord(value);

  return Object.entries(record).reduce<BodyScanColumnMapping>(
    (mapping, [field, column]) => {
      if (isBodyScanDataField(field) && typeof column === "string" && column) {
        mapping[field] = column;
      }

      return mapping;
    },
    {},
  );
};

const normalizeBodyMetricHistory = (
  history: unknown,
): BodyMetricHistoryPoint[] => {
  if (!Array.isArray(history)) return [];

  return history
    .map<BodyMetricHistoryPoint | null>((item) => {
      const record = asRecord(item);
      const savedAt =
        typeof record.savedAt === "string" && record.savedAt
          ? record.savedAt
          : typeof record.date === "string"
            ? record.date
            : "";
      if (!savedAt) return null;

      return {
        basalMetabolicRate: readBodyScanValue(record.basalMetabolicRate),
        bodyFat: readBodyScanValue(record.bodyFat),
        leanMass: readBodyScanValue(record.leanMass),
        metabolicAge: readBodyScanValue(record.metabolicAge),
        muscleMass: readBodyScanValue(record.muscleMass),
        notes: readBodyScanValue(record.notes),
        provider: readBodyScanValue(record.provider, record.source),
        rawFileName: readBodyScanValue(record.rawFileName),
        savedAt,
        source: readBodyScanValue(record.source, record.provider) || "Manual Entry",
        sourceSystem: readBodyScanValue(record.sourceSystem),
        visceralFat: readBodyScanValue(record.visceralFat),
        waist: readBodyScanValue(record.waist),
        weight: readBodyScanValue(record.weight),
        weightTrend: readBodyScanValue(record.weightTrend) || "Not Sure",
      };
    })
    .filter((item): item is BodyMetricHistoryPoint => item !== null)
    .slice(-36);
};

const createBodyMetricHistoryPoint = (
  profile: SoundFitnessProfile,
  savedAt: string,
) => {
  const hasBodyMetric = [
    profile.currentWeight,
    profile.bodyFat,
    profile.waist,
    profile.muscleMass,
  ].some((value) => typeof value === "string" && value.trim().length > 0);

  if (!hasBodyMetric) return null;

  return {
    bodyFat: profile.bodyFat || "",
    muscleMass: profile.muscleMass || "",
    savedAt,
    source: profile.bodyScanSource || "Manual Entry",
    waist: profile.waist || "",
    weight: profile.currentWeight || "",
    weightTrend: profile.bodyStatus.weightTrend || "Not Sure",
  };
};

const createNormalizedBodyScanRecord = ({
  importedAt = new Date().toISOString(),
  mappedColumns,
  provider,
  rawFileName,
  scanDate,
  values,
}: {
  importedAt?: string;
  mappedColumns?: BodyScanColumnMapping;
  provider: string;
  rawFileName?: string;
  scanDate?: string;
  values: Partial<BodyScanManualDraft> &
    Partial<Record<BodyScanDataField, string>> & { weightTrend?: string };
}): NormalizedBodyScanRecord => {
  const providerName =
    readBodyScanValue(values.provider, provider) || "Manual Entry";
  const savedAt = normalizeBodyScanDate(values.savedAt, scanDate, values.scanDate);
  const weightTrend = readBodyScanValue(values.weightTrend) || "Not Sure";

  return {
    basalMetabolicRate: readBodyScanValue(values.basalMetabolicRate),
    bodyFat: readBodyScanValue(values.bodyFat),
    id: `body-scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    importedAt,
    leanMass: readBodyScanValue(values.leanMass),
    mappedColumns,
    metabolicAge: readBodyScanValue(values.metabolicAge),
    muscleMass: readBodyScanValue(values.muscleMass),
    notes: readBodyScanValue(values.notes),
    provider: providerName,
    rawFileName,
    savedAt,
    source: providerName,
    sourceSystem: providerName,
    visceralFat: readBodyScanValue(values.visceralFat),
    waist: readBodyScanValue(values.waist),
    weight: readBodyScanValue(values.weight),
    weightTrend,
  };
};

const bodyScanRecordHasMetricData = (
  record: Pick<
    NormalizedBodyScanRecord,
    | "basalMetabolicRate"
    | "bodyFat"
    | "leanMass"
    | "metabolicAge"
    | "muscleMass"
    | "visceralFat"
    | "waist"
    | "weight"
  >,
) =>
  bodyScanMetricDataFields.some((field) =>
    readBodyScanValue(record[field as keyof typeof record]),
  );

const normalizeBodyScanImports = (
  imports: unknown,
): NormalizedBodyScanRecord[] => {
  if (!Array.isArray(imports)) return [];

  return imports
    .map<NormalizedBodyScanRecord | null>((item, index) => {
      const record = asRecord(item);
      const savedAt = normalizeBodyScanDate(record.savedAt, record.date);
      const provider = readBodyScanValue(record.provider, record.source) || "Manual Entry";
      const normalized: NormalizedBodyScanRecord = {
        basalMetabolicRate: readBodyScanValue(record.basalMetabolicRate),
        bodyFat: readBodyScanValue(record.bodyFat),
        id:
          readBodyScanValue(record.id) ||
          `legacy-body-scan-${index}-${savedAt.replace(/[^a-z0-9]/gi, "")}`,
        importedAt: normalizeBodyScanDate(record.importedAt, savedAt),
        leanMass: readBodyScanValue(record.leanMass),
        mappedColumns: normalizeBodyScanColumnMapping(record.mappedColumns),
        metabolicAge: readBodyScanValue(record.metabolicAge),
        muscleMass: readBodyScanValue(record.muscleMass),
        notes: readBodyScanValue(record.notes),
        provider,
        rawFileName: readBodyScanValue(record.rawFileName),
        savedAt,
        source: provider,
        sourceSystem: readBodyScanValue(record.sourceSystem, provider),
        visceralFat: readBodyScanValue(record.visceralFat),
        waist: readBodyScanValue(record.waist),
        weight: readBodyScanValue(record.weight),
        weightTrend: readBodyScanValue(record.weightTrend) || "Not Sure",
      };

      return bodyScanRecordHasMetricData(normalized) ? normalized : null;
    })
    .filter((item): item is NormalizedBodyScanRecord => item !== null)
    .slice(-50);
};

const parseBodyScanCsvRows = (text: string) => {
  const parsedRows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      currentCell += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") index += 1;
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        parsedRows.push(currentRow);
      }
      currentCell = "";
      currentRow = [];
      continue;
    }

    currentCell += character;
  }

  currentRow.push(currentCell.trim());
  if (currentRow.some((cell) => cell.length > 0)) {
    parsedRows.push(currentRow);
  }

  const headers =
    parsedRows[0]?.map((header, index) => header || `Column ${index + 1}`) || [];
  const rows = parsedRows.slice(1).map((row) =>
    headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = row[index] || "";
      return record;
    }, {}),
  );

  return { headers, rows };
};

const inferBodyScanColumnMapping = (
  headers: string[],
): BodyScanColumnMapping => {
  const normalizedHeaders = headers.map((header) => {
    const normalized = normalizeBodyScanHeader(header);
    return {
      compact: normalized.replace(/\s+/g, ""),
      normalized,
      raw: header,
    };
  });
  const usedHeaders = new Set<string>();

  return bodyScanDataFields.reduce<BodyScanColumnMapping>((mapping, field) => {
    const aliases = bodyScanColumnAliases[field].map((alias) => {
      const normalized = normalizeBodyScanHeader(alias);
      return {
        compact: normalized.replace(/\s+/g, ""),
        normalized,
      };
    });
    const match = normalizedHeaders.find((header) => {
      if (usedHeaders.has(header.raw)) return false;

      return aliases.some(
        (alias) =>
          header.normalized === alias.normalized ||
          header.compact === alias.compact ||
          (alias.normalized.length > 3 &&
            header.normalized.includes(alias.normalized)),
      );
    });

    if (match) {
      mapping[field] = match.raw;
      usedHeaders.add(match.raw);
    }

    return mapping;
  }, {});
};

const readMappedBodyScanField = (
  row: Record<string, string>,
  mapping: BodyScanColumnMapping,
  field: BodyScanDataField,
) => {
  const column = mapping[field];
  return column ? readBodyScanValue(row[column]) : "";
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

type BirthdaySelectOption = {
  label: string;
  value: string;
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
    calculateAgeFromBirthday(profile.birthday),
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
  const occupation = normalizeOccupationValue(profile.occupation);
  if (occupation === "Manual Labor") {
    score += 6;
    factors.push("Physical job load");
  }
  if (
    occupation === "Driver" ||
    occupation === "Desk Worker" ||
    occupation === "Tech / Office"
  ) {
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
      bar: "from-red-500 via-rose-600 to-red-900",
      border: "border-red-200/42",
      glow: "shadow-[0_0_38px_rgba(248,113,113,0.22)]",
      softBg: "bg-red-400/12",
      text: "text-red-100",
    };
  }
  if (label === "High") {
    return {
      bar: "from-orange-300 via-red-400 to-rose-500",
      border: "border-orange-200/42",
      glow: "shadow-[0_0_36px_rgba(251,146,60,0.2)]",
      softBg: "bg-orange-300/12",
      text: "text-orange-100",
    };
  }
  if (label === "Moderate") {
    return {
      bar: "from-yellow-300 via-amber-300 to-orange-400",
      border: "border-amber-200/42",
      glow: "shadow-[0_0_34px_rgba(251,191,36,0.18)]",
      softBg: "bg-amber-300/12",
      text: "text-amber-100",
    };
  }

  return {
    bar: "from-blue-300 via-emerald-300 to-teal-300",
    border: "border-emerald-200/42",
    glow: "shadow-[0_0_34px_rgba(52,211,153,0.18)]",
    softBg: "bg-emerald-300/12",
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

const normalizeNotesRecord = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
    (notes, [key, note]) => {
      if (typeof note === "string") {
        notes[key] = note;
      }

      return notes;
    },
    {},
  );
};

const legacyPreferenceLabels: Record<string, string> = {
  "Apartment Gym": "Apt Gym",
  "Travel / Hotel": "Travel",
  "Limited Equipment": "Small Space",
  "Limited Space": "Small Space",
  "Performance": "Athletic Performance",
  "Zone 2 plus short finishers": "Walking",
  "Intervals": "HIIT",
  "Conditioning circuits": "HIIT",
  "Walking only": "Walking",
  "Daily 8-12 minute resets": "Mobility Drills",
  "Warm-up only": "Warm-Up Mobility",
  "Dedicated mobility days": "Mobility Drills",
  "Recovery day mobility": "Recovery Sessions",
};

const legacyEquipmentLabels: Record<string, string> = {
  "Cardio Equipment": "Cardio",
  Cables: "Cable",
  "Medicine Ball": "Med Ball",
  "Pull-Up Bar": "Pull-Up",
  "Suspension Trainer": "Suspension",
};

const cleanStringArray = (values: unknown[]) =>
  values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

const normalizePreferenceLabel = (value: string) => {
  if (value === "None") return "";
  return legacyPreferenceLabels[value] || value;
};

const normalizePreferenceSelection = (
  arrayValue: unknown,
  legacyValue: unknown,
  fallback: string[],
) => {
  const hasArrayValue = Array.isArray(arrayValue);
  const arrayValues = hasArrayValue ? cleanStringArray(arrayValue) : [];
  const legacyValues = cleanStringArray([legacyValue]);
  const source = hasArrayValue ? arrayValues : legacyValues;

  if (!source.length) return hasArrayValue ? [] : fallback;

  return Array.from(
    new Set(
      source
        .map(normalizePreferenceLabel)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
};

const firstPreferenceValue = (values: string[], fallback: string) =>
  values[0] || fallback;

const normalizeEquipmentSelection = (
  arrayValue: unknown,
  fallback: string[],
) => {
  const hasArrayValue = Array.isArray(arrayValue);
  const source = hasArrayValue ? cleanStringArray(arrayValue) : [];

  if (!source.length) return hasArrayValue ? [] : fallback;

  return Array.from(
    new Set(source.map((value) => legacyEquipmentLabels[value] || value)),
  );
};

const normalizeExerciseConfidence = (value: unknown): ExerciseConfidence => {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Partial<Record<keyof ExerciseConfidence, unknown>>)
      : {};

  return {
    cardioEquipment: readProfileText(
      source.cardioEquipment,
      defaultProfile.exerciseConfidence.cardioEquipment,
    ),
    complexMovements: readProfileText(
      source.complexMovements,
      defaultProfile.exerciseConfidence.complexMovements,
    ),
    freeWeights: readProfileText(
      source.freeWeights,
      defaultProfile.exerciseConfidence.freeWeights,
    ),
    machines: readProfileText(
      source.machines,
      defaultProfile.exerciseConfidence.machines,
    ),
    mobilityWork: readProfileText(
      source.mobilityWork,
      defaultProfile.exerciseConfidence.mobilityWork,
    ),
  };
};

const getCompactOptionIcon = (option: CompactOptionCard) =>
  compactOptionIcons[option.id] || option.icon;

const getSelectorCardIcon = (id: string, fallback?: React.ReactNode) => {
  const iconName = selectorCardIconNames[id];
  if (iconName) return <SelectorIcon name={iconName} />;
  return fallback || <SelectorIcon name="circle-dot" />;
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

const getCompletionIndicatorTone = (percent: number) => {
  if (percent >= 80) {
    return {
      activeButton:
        "border-emerald-200/38 bg-emerald-300/12 text-emerald-50 shadow-[0_0_10px_rgba(52,211,153,0.14)]",
      activeDot:
        "bg-emerald-300 shadow-[0_0_6px_rgba(52,211,153,0.70)] ring-1 ring-emerald-100/45",
      inactiveDot:
        "bg-emerald-300/55 shadow-[0_0_3px_rgba(52,211,153,0.22)] hover:bg-emerald-200/90 hover:shadow-[0_0_6px_rgba(110,231,183,0.42)]",
    };
  }

  if (percent >= 50) {
    return {
      activeButton:
        "border-cyan-200/36 bg-cyan-300/12 text-cyan-50 shadow-[0_0_10px_rgba(34,211,238,0.14)]",
      activeDot:
        "bg-cyan-200 shadow-[0_0_6px_rgba(103,232,249,0.68)] ring-1 ring-cyan-100/45",
      inactiveDot:
        "bg-cyan-300/55 shadow-[0_0_3px_rgba(34,211,238,0.22)] hover:bg-cyan-200/90 hover:shadow-[0_0_6px_rgba(103,232,249,0.42)]",
    };
  }

  if (percent >= 25) {
    return {
      activeButton:
        "border-amber-200/36 bg-amber-300/12 text-amber-50 shadow-[0_0_10px_rgba(251,191,36,0.13)]",
      activeDot:
        "bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.66)] ring-1 ring-amber-100/45",
      inactiveDot:
        "bg-amber-300/58 shadow-[0_0_3px_rgba(251,191,36,0.22)] hover:bg-amber-200/90 hover:shadow-[0_0_6px_rgba(253,230,138,0.42)]",
    };
  }

  return {
    activeButton:
      "border-rose-200/36 bg-rose-300/12 text-rose-50 shadow-[0_0_10px_rgba(251,113,133,0.13)]",
    activeDot:
      "bg-rose-300 shadow-[0_0_6px_rgba(251,113,133,0.68)] ring-1 ring-rose-100/45",
    inactiveDot:
      "bg-rose-300/60 shadow-[0_0_3px_rgba(251,113,133,0.23)] hover:bg-rose-200/90 hover:shadow-[0_0_6px_rgba(254,205,211,0.42)]",
  };
};

type ProfilePulseIndicatorStyle = CSSProperties & {
  "--profile-indicator-glow": string;
  "--profile-indicator-glow-dim": string;
  "--profile-indicator-glow-soft": string;
};

type ProfilePulseIndicatorTone = {
  dotActive: string;
  dotInactive: string;
  motion: "pulse" | "water";
  outerActive: string;
  outerInactive: string;
  style: ProfilePulseIndicatorStyle;
};

const getProfilePulseIndicatorTone = (
  percent: number,
): ProfilePulseIndicatorTone => {
  if (percent >= 80) {
    return {
      dotActive:
        "bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.72)]",
      dotInactive:
        "bg-emerald-300/80 shadow-[0_0_10px_rgba(52,211,153,0.46)]",
      motion: "water",
      outerActive: "border-emerald-100/42 ring-1 ring-emerald-200/38",
      outerInactive: "border-emerald-300/22 ring-1 ring-emerald-300/18",
      style: {
        "--profile-indicator-glow": "rgba(52,211,153,0.92)",
        "--profile-indicator-glow-dim": "rgba(52,211,153,0.46)",
        "--profile-indicator-glow-soft": "rgba(16,185,129,0.34)",
      } as ProfilePulseIndicatorStyle,
    };
  }

  if (percent >= 50) {
    return {
      dotActive: "bg-cyan-200 shadow-[0_0_12px_rgba(103,232,249,0.72)]",
      dotInactive:
        "bg-cyan-300/80 shadow-[0_0_10px_rgba(34,211,238,0.46)]",
      motion: "pulse",
      outerActive: "border-cyan-100/42 ring-1 ring-cyan-200/38",
      outerInactive: "border-cyan-300/22 ring-1 ring-cyan-300/18",
      style: {
        "--profile-indicator-glow": "rgba(103,232,249,0.92)",
        "--profile-indicator-glow-dim": "rgba(34,211,238,0.46)",
        "--profile-indicator-glow-soft": "rgba(34,211,238,0.34)",
      } as ProfilePulseIndicatorStyle,
    };
  }

  if (percent >= 25) {
    return {
      dotActive:
        "bg-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.72)]",
      dotInactive:
        "bg-amber-300/80 shadow-[0_0_10px_rgba(251,191,36,0.46)]",
      motion: "pulse",
      outerActive: "border-amber-100/42 ring-1 ring-amber-200/38",
      outerInactive: "border-amber-300/22 ring-1 ring-amber-300/18",
      style: {
        "--profile-indicator-glow": "rgba(251,191,36,0.92)",
        "--profile-indicator-glow-dim": "rgba(251,191,36,0.46)",
        "--profile-indicator-glow-soft": "rgba(245,158,11,0.34)",
      } as ProfilePulseIndicatorStyle,
    };
  }

  return {
    dotActive: "bg-rose-300 shadow-[0_0_12px_rgba(251,113,133,0.72)]",
    dotInactive:
      "bg-rose-300/80 shadow-[0_0_10px_rgba(251,113,133,0.46)]",
    motion: "pulse",
    outerActive: "border-rose-100/42 ring-1 ring-rose-200/38",
    outerInactive: "border-rose-300/22 ring-1 ring-rose-300/18",
    style: {
      "--profile-indicator-glow": "rgba(251,113,133,0.92)",
      "--profile-indicator-glow-dim": "rgba(251,113,133,0.46)",
      "--profile-indicator-glow-soft": "rgba(244,63,94,0.34)",
    } as ProfilePulseIndicatorStyle,
  };
};

const getProfileTabCompletions = (
  profile: SoundFitnessProfile,
): Record<ProfileCompletionSection, number> => {
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
      profile.muscleMass,
      profile.profileImage,
      profile.userNotes,
    ]),
    goals: calculateSectionCompletion([
      profile.planDirections,
      profile.goalMode,
      profile.primaryGoal,
      profile.secondaryGoal,
      profile.bodyGoalMode,
      profile.goalWeight,
      profile.sessionsPerWeek,
      profile.stepsGoal,
      profile.sleepGoal,
      profile.waterGoal,
      profile.nutritionDirection.nutritionGoal,
      profile.nutritionDirection.proteinTarget,
    ]),
    body: calculateSectionCompletion([
      profile.occupation,
      profile.sedentaryLevel,
      profile.hoursWorkedPerWeek,
      profile.city,
      profile.currentWeight,
      profile.muscleMass,
      profile.bodyFat,
      profile.waist,
      profile.bodyScanImports,
      profile.bodyScanSource,
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
      profile.adaptivePlanningFactors,
      profile.adaptivePlanningNotes,
      profile.lifestyleConstraints.availableTrainingTimes,
      profile.lifestyleConstraints.childcareConstraints,
      profile.lifestyleConstraints.commuteTravel,
      profile.lifestyleConstraints.preferredReminderStyle,
      profile.lifestyleConstraints.sleepWindow,
      profile.lifestyleConstraints.workSchedule,
      profile.timeAvailability,
    ]),
    planDirection: calculateSectionCompletion([
      profile.planDirections,
      profile.goalMode,
      profile.primaryGoal,
      profile.secondaryGoal,
      profile.bodyGoalMode,
      profile.goalDeadline,
      profile.goalPriorityRanking,
      profile.preferredSplits,
      profile.trainingStyles,
      profile.planDirectionNotes,
      profile.experienceLevel,
      profile.consistencyHistory,
      profile.familiarityAreas,
      profile.exerciseConfidence,
      profile.previousCoaching,
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
      profile.trainingLocations,
      profile.availableEquipment,
      profile.preferredDays,
      profile.preferredSplits,
      profile.trainingStyles,
      profile.cardioPreferences,
      profile.mobilityPreferences,
      profile.bestTimeOfDay,
      profile.scheduleConsistency,
      profile.exerciseVarietyPreference,
      profile.planFlexibilityPreference,
      profile.videoReviewInterest,
      profile.roboCoachGuidanceLevel,
      profile.trainingIntensity,
    ]),
    recovery: calculateSectionCompletion([
      profile.recoveryPreferences,
      profile.bodyStatus.averageSleepHours,
      profile.bodyStatus.energyStatus,
      profile.bodyStatus.stressStatus,
      profile.bodyStatus.sorenessLevel,
      profile.bodyStatus.sorenessStatus,
      profile.bodyStatus.painLevel,
      profile.bodyStatus.painStatus,
      profile.bodyStatus.sleepQuality,
      profile.restingHeartRate,
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
      profile.proteinConsistency,
      profile.calorieGoalKnown,
      profile.nutritionDirection.mealPrepPreference,
      profile.nutritionDirection.eatingSchedule,
      profile.nutritionDirection.foodRestrictions,
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
    coachApp: calculateSectionCompletion([
      profile.appPersonalization.defaultDashboardFocus,
      profile.appPersonalization.preferredUnitSystem,
      profile.appPersonalization.coachingTone,
      profile.appPersonalization.anatomyBackground,
      profile.appPersonalization.showAnatomyHeatMap,
      profile.appPersonalization.showSkillTreePoints,
      profile.appPersonalization.showRecoveryWarnings,
      profile.planFlexibilityPreference,
      profile.roboCoachGuidanceLevel,
      profile.userNotes,
      profile.coachNotes,
    ]),
  };
};

const mergeProfile = (saved: Partial<SoundFitnessProfile>): SoundFitnessProfile => {
  const gender = normalizeBodyModel(saved.gender || saved.bodyModel);
  const trainingLocations = normalizePreferenceSelection(
    saved.trainingLocations,
    saved.trainingLocation,
    defaultProfile.trainingLocations,
  );
  const preferredSplits = normalizePreferenceSelection(
    saved.preferredSplits,
    saved.preferredSplit,
    defaultProfile.preferredSplits,
  );
  const cardioPreferences = normalizePreferenceSelection(
    saved.cardioPreferences,
    saved.cardioPreference,
    defaultProfile.cardioPreferences,
  );
  const mobilityPreferences = normalizePreferenceSelection(
    saved.mobilityPreferences,
    saved.mobilityPreference,
    defaultProfile.mobilityPreferences,
  );
  const availableEquipment = normalizeEquipmentSelection(
    Array.isArray(saved.availableEquipment) ? saved.availableEquipment : saved.equipment,
    defaultProfile.availableEquipment,
  );
  const familiarityAreas = Array.isArray(saved.familiarityAreas)
    ? cleanStringArray(saved.familiarityAreas)
    : defaultProfile.familiarityAreas;
  const previousCoaching = Array.isArray(saved.previousCoaching)
    ? cleanStringArray(saved.previousCoaching)
    : defaultProfile.previousCoaching;
  const adaptivePlanningFactors = Array.isArray(saved.adaptivePlanningFactors)
    ? saved.adaptivePlanningFactors.filter(
        (factor): factor is string => typeof factor === "string" && factor.length > 0,
      )
    : defaultProfile.adaptivePlanningFactors;
  const adaptivePlanningNotes = normalizeNotesRecord(saved.adaptivePlanningNotes);
  const planDirections = normalizePlanDirections(
    saved.planDirections,
    saved.goalMode,
  );

  return {
    ...defaultProfile,
    ...saved,
    adaptivePlanningFactors,
    adaptivePlanningNotes,
    age: calculateAgeFromBirthday(saved.birthday || "") || "",
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
    bodyMetricHistory: normalizeBodyMetricHistory(saved.bodyMetricHistory),
    bodyScanImports: normalizeBodyScanImports(saved.bodyScanImports),
    gender,
    availableEquipment,
    equipment: availableEquipment,
    exerciseConfidence: normalizeExerciseConfidence(saved.exerciseConfidence),
    familiarityAreas,
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
      weightTrend: normalizeWeightTrend(saved.bodyStatus?.weightTrend),
    },
    state: typeof saved.state === "string" ? saved.state : defaultProfile.state,
    preferredDays: Array.isArray(saved.preferredDays)
      ? saved.preferredDays
      : defaultProfile.preferredDays,
    preferredSplit: firstPreferenceValue(
      preferredSplits,
      saved.preferredSplit || defaultProfile.preferredSplit,
    ),
    preferredSplits,
    previousCoaching,
    recoveryPreferences: Array.isArray(saved.recoveryPreferences)
      ? saved.recoveryPreferences
      : defaultProfile.recoveryPreferences,
    specialCircumstances: Array.isArray(saved.specialCircumstances)
      ? saved.specialCircumstances
      : [],
    cardioPreference: firstPreferenceValue(
      cardioPreferences,
      saved.cardioPreference || defaultProfile.cardioPreference,
    ),
    cardioPreferences,
    mobilityPreference: firstPreferenceValue(
      mobilityPreferences,
      saved.mobilityPreference || defaultProfile.mobilityPreference,
    ),
    mobilityPreferences,
    goalMode: planDirections[0] || defaultProfile.goalMode,
    planDirections,
    trainingLocation: firstPreferenceValue(
      trainingLocations,
      saved.trainingLocation || defaultProfile.trainingLocation,
    ),
    trainingLocations,
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

const formatMemberSince = (value: string) => {
  if (!value) return "Pending";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
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
  inline = false,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  helper: string;
  inline?: boolean;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label
      className={
        inline
          ? "relative z-0 block overflow-visible transition focus-within:z-50 hover:z-50"
          : "relative z-0 block overflow-visible rounded-[24px] border border-white/10 bg-slate-950/52 p-4 transition focus-within:z-50 hover:z-50"
      }
    >
      <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-300">
        {label}
        <InfoBubble label={label}>{helper}</InfoBubble>
      </span>
      <input
        className={`w-full rounded-2xl border border-white/10 bg-slate-950/72 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/50 focus:bg-white/[0.07] ${
          inline ? "mt-2 min-h-[42px] px-3 py-2.5" : "mt-3 min-h-[46px] px-4 py-3"
        }`}
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
  placeholder = "Select one",
  value,
}: {
  helper: string;
  label: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
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
            {option || placeholder}
          </option>
        ))}
      </select>
    </label>
  );
}

function InfoSearchableSelectField({
  helper,
  inline = false,
  label,
  onChange,
  options,
  placeholder,
  value,
}: {
  helper: string;
  inline?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedLabel = options.find((option) => option === value) || value;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter((option) => option.toLowerCase().includes(normalizedQuery))
    : options;

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePress = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsidePress);
    document.addEventListener("touchstart", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsidePress);
      document.removeEventListener("touchstart", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={
        inline
          ? "relative z-0 block overflow-visible transition focus-within:z-[140] hover:z-[140]"
          : "relative z-0 block overflow-visible rounded-[24px] border border-white/10 bg-slate-950/52 p-4 transition focus-within:z-[140] hover:z-[140]"
      }
    >
      <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-300">
        {label}
        <InfoBubble label={label}>{helper}</InfoBubble>
      </span>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          setOpen((current) => !current);
          setQuery("");
        }}
        className={`flex w-full items-center justify-between gap-3 rounded-2xl border text-left text-sm font-bold outline-none transition ${
          inline ? "mt-2 min-h-[42px] px-3 py-2.5" : "mt-3 min-h-[46px] px-4 py-3"
        } ${
          open
            ? "border-cyan-200/50 bg-white/[0.075] text-white ring-2 ring-cyan-300/15"
            : "border-white/10 bg-slate-950/72 text-white hover:border-cyan-200/32 hover:bg-white/[0.06]"
        }`}
      >
        <span className={selectedLabel ? "truncate text-white" : "truncate text-slate-600"}>
          {selectedLabel || placeholder}
        </span>
        <span
          aria-hidden="true"
          className={`text-xs text-cyan-100 transition ${open ? "rotate-180" : ""}`}
        >
          v
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={label}
          className={`absolute top-[calc(100%+0.45rem)] z-[180] rounded-2xl border border-cyan-200/28 bg-slate-950/96 p-2 shadow-[0_22px_55px_rgba(0,0,0,0.55),0_0_28px_rgba(34,211,238,0.14)] backdrop-blur-xl ${
            inline ? "left-0 right-0" : "left-4 right-4"
          }`}
        >
          <input
            autoFocus
            className="min-h-[42px] w-full rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/45"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search states"
            type="search"
            value={query}
          />
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => {
              onChange("");
              setOpen(false);
              setQuery("");
            }}
            className={`mt-2 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-black transition ${
              !value
                ? "bg-cyan-300/18 text-cyan-50 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.18)]"
                : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-300"
            }`}
          >
            <span>{placeholder}</span>
            {!value ? (
              <span className="text-[10px] uppercase tracking-[0.12em] text-cyan-100">
                Active
              </span>
            ) : null}
          </button>
          <div className="mt-1 max-h-56 overflow-y-auto pr-1 [scrollbar-color:rgba(34,211,238,0.45)_rgba(15,23,42,0.88)] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/45 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-900">
            {filteredOptions.length ? (
              filteredOptions.map((option) => {
                const active = option === value;

                return (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(option);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-black transition ${
                      active
                        ? "bg-cyan-300/18 text-cyan-50 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.18)]"
                        : "text-slate-200 hover:bg-white/[0.07] hover:text-white"
                    }`}
                  >
                    <span>{option}</span>
                    {active ? (
                      <span className="text-[10px] uppercase tracking-[0.12em] text-cyan-100">
                        Active
                      </span>
                    ) : null}
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-3 text-sm font-semibold text-slate-500">
                No states match.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PremiumBirthdaySelect({
  ariaLabel,
  label,
  onChange,
  options,
  placeholder,
  value,
}: {
  ariaLabel: string;
  label: string;
  onChange: (value: string) => void;
  options: BirthdaySelectOption[];
  placeholder: string;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value);
  const menuOptions = [{ label: placeholder, value: "" }, ...options];

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePress = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsidePress);
    document.addEventListener("touchstart", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsidePress);
      document.removeEventListener("touchstart", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative z-[90] block min-w-0">
      <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
        className={`flex min-h-[46px] w-full items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 text-left text-sm font-black outline-none transition ${
          open
            ? "border-cyan-200/55 bg-white/[0.075] text-white ring-2 ring-cyan-300/15"
            : "border-blue-200/14 bg-slate-950/78 text-white hover:border-blue-200/32 hover:bg-white/[0.06]"
        }`}
      >
        <span className={selected ? "truncate text-white" : "truncate text-slate-500"}>
          {selected?.label || placeholder}
        </span>
        <span
          aria-hidden="true"
          className={`text-xs text-cyan-100 transition ${open ? "rotate-180" : ""}`}
        >
          v
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-[160] max-h-60 overflow-y-auto rounded-2xl border border-cyan-200/28 bg-slate-950/96 p-1.5 shadow-[0_22px_55px_rgba(0,0,0,0.55),0_0_28px_rgba(34,211,238,0.14)] backdrop-blur-xl [scrollbar-color:rgba(34,211,238,0.45)_rgba(15,23,42,0.88)] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/45 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-900"
        >
          {menuOptions.map((option) => {
            const active = option.value === value;

            return (
              <button
                key={`${label}-${option.value || "empty"}`}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-black transition ${
                  active
                    ? "bg-cyan-300/18 text-cyan-50 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.18)]"
                    : option.value
                      ? "text-slate-200 hover:bg-white/[0.07] hover:text-white"
                      : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-300"
                }`}
              >
                <span>{option.label}</span>
                {active ? (
                  <span className="text-[10px] text-cyan-100" aria-hidden="true">
                    ✓
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function OccupationSelector({
  helper,
  onChange,
  value,
}: {
  helper: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const selectedValue = normalizeOccupationValue(value);
  const optionRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const accentStyles: Record<
    string,
    { active: string; glow: string; icon: string; idle: string; line: string }
  > = {
    amber: {
      active: "border-amber-200/55 bg-amber-300/14 text-amber-50",
      glow: "shadow-[0_0_26px_rgba(251,191,36,0.16)]",
      icon: "border-amber-200/25 bg-amber-300/12 text-amber-100",
      idle: "hover:border-amber-200/34 hover:bg-amber-300/8 hover:text-amber-50",
      line: "from-amber-300/85 to-orange-300/50",
    },
    blue: {
      active: "border-blue-200/55 bg-blue-300/14 text-blue-50",
      glow: "shadow-[0_0_26px_rgba(96,165,250,0.16)]",
      icon: "border-blue-200/25 bg-blue-300/12 text-blue-100",
      idle: "hover:border-blue-200/34 hover:bg-blue-300/8 hover:text-blue-50",
      line: "from-blue-300/85 to-cyan-300/50",
    },
    cyan: {
      active: "border-cyan-200/55 bg-cyan-300/14 text-cyan-50",
      glow: "shadow-[0_0_26px_rgba(34,211,238,0.16)]",
      icon: "border-cyan-200/25 bg-cyan-300/12 text-cyan-100",
      idle: "hover:border-cyan-200/34 hover:bg-cyan-300/8 hover:text-cyan-50",
      line: "from-cyan-300/85 to-blue-300/50",
    },
    emerald: {
      active: "border-emerald-200/55 bg-emerald-300/14 text-emerald-50",
      glow: "shadow-[0_0_26px_rgba(52,211,153,0.16)]",
      icon: "border-emerald-200/25 bg-emerald-300/12 text-emerald-100",
      idle: "hover:border-emerald-200/34 hover:bg-emerald-300/8 hover:text-emerald-50",
      line: "from-emerald-300/85 to-cyan-300/50",
    },
    indigo: {
      active: "border-indigo-200/55 bg-indigo-300/14 text-indigo-50",
      glow: "shadow-[0_0_26px_rgba(129,140,248,0.16)]",
      icon: "border-indigo-200/25 bg-indigo-300/12 text-indigo-100",
      idle: "hover:border-indigo-200/34 hover:bg-indigo-300/8 hover:text-indigo-50",
      line: "from-indigo-300/85 to-blue-300/50",
    },
    lime: {
      active: "border-lime-200/55 bg-lime-300/14 text-lime-50",
      glow: "shadow-[0_0_26px_rgba(132,204,22,0.16)]",
      icon: "border-lime-200/25 bg-lime-300/12 text-lime-100",
      idle: "hover:border-lime-200/34 hover:bg-lime-300/8 hover:text-lime-50",
      line: "from-lime-300/85 to-emerald-300/50",
    },
    orange: {
      active: "border-orange-200/55 bg-orange-300/14 text-orange-50",
      glow: "shadow-[0_0_26px_rgba(251,146,60,0.16)]",
      icon: "border-orange-200/25 bg-orange-300/12 text-orange-100",
      idle: "hover:border-orange-200/34 hover:bg-orange-300/8 hover:text-orange-50",
      line: "from-orange-300/85 to-amber-300/50",
    },
    purple: {
      active: "border-purple-200/55 bg-purple-300/14 text-purple-50",
      glow: "shadow-[0_0_26px_rgba(168,85,247,0.16)]",
      icon: "border-purple-200/25 bg-purple-300/12 text-purple-100",
      idle: "hover:border-purple-200/34 hover:bg-purple-300/8 hover:text-purple-50",
      line: "from-purple-300/85 to-fuchsia-300/50",
    },
    red: {
      active: "border-red-200/55 bg-red-300/14 text-red-50",
      glow: "shadow-[0_0_26px_rgba(248,113,113,0.16)]",
      icon: "border-red-200/25 bg-red-300/12 text-red-100",
      idle: "hover:border-red-200/34 hover:bg-red-300/8 hover:text-red-50",
      line: "from-red-300/85 to-orange-300/50",
    },
    rose: {
      active: "border-rose-200/55 bg-rose-300/14 text-rose-50",
      glow: "shadow-[0_0_26px_rgba(251,113,133,0.16)]",
      icon: "border-rose-200/25 bg-rose-300/12 text-rose-100",
      idle: "hover:border-rose-200/34 hover:bg-rose-300/8 hover:text-rose-50",
      line: "from-rose-300/85 to-pink-300/50",
    },
    slate: {
      active: "border-slate-200/45 bg-slate-200/12 text-slate-50",
      glow: "shadow-[0_0_26px_rgba(148,163,184,0.14)]",
      icon: "border-slate-200/22 bg-slate-200/10 text-slate-100",
      idle: "hover:border-slate-200/30 hover:bg-slate-200/8 hover:text-slate-50",
      line: "from-slate-200/80 to-blue-300/45",
    },
    steel: {
      active: "border-sky-200/50 bg-sky-300/12 text-sky-50",
      glow: "shadow-[0_0_26px_rgba(125,211,252,0.14)]",
      icon: "border-sky-200/22 bg-sky-300/10 text-sky-100",
      idle: "hover:border-sky-200/30 hover:bg-sky-300/8 hover:text-sky-50",
      line: "from-sky-300/80 to-slate-200/45",
    },
    teal: {
      active: "border-teal-200/55 bg-teal-300/14 text-teal-50",
      glow: "shadow-[0_0_26px_rgba(45,212,191,0.16)]",
      icon: "border-teal-200/25 bg-teal-300/12 text-teal-100",
      idle: "hover:border-teal-200/34 hover:bg-teal-300/8 hover:text-teal-50",
      line: "from-teal-300/85 to-cyan-300/50",
    },
    violet: {
      active: "border-violet-200/55 bg-violet-300/14 text-violet-50",
      glow: "shadow-[0_0_26px_rgba(139,92,246,0.16)]",
      icon: "border-violet-200/25 bg-violet-300/12 text-violet-100",
      idle: "hover:border-violet-200/34 hover:bg-violet-300/8 hover:text-violet-50",
      line: "from-violet-300/85 to-purple-300/50",
    },
    zinc: {
      active: "border-zinc-200/42 bg-zinc-200/10 text-zinc-50",
      glow: "shadow-[0_0_26px_rgba(212,212,216,0.12)]",
      icon: "border-zinc-200/20 bg-zinc-200/8 text-zinc-100",
      idle: "hover:border-zinc-200/28 hover:bg-zinc-200/7 hover:text-zinc-50",
      line: "from-zinc-200/75 to-slate-300/45",
    },
  };

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedOption =
    occupationOptions.find((option) => option.value === selectedValue) ||
    occupationOptions[0];
  const selectedStyle = accentStyles[selectedOption.accent] || accentStyles.cyan;

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePress = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsidePress);
    document.addEventListener("touchstart", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsidePress);
      document.removeEventListener("touchstart", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const timeoutId = window.setTimeout(() => {
      optionRefs.current[selectedValue]?.scrollIntoView({
        block: "nearest",
      });
    }, 40);

    return () => window.clearTimeout(timeoutId);
  }, [open, selectedValue]);

  return (
    <div
      ref={rootRef}
      className="relative z-0 overflow-visible rounded-[22px] border border-white/10 bg-slate-950/52 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition focus-within:z-[120] hover:z-[120]"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-300">
            Occupation
          </p>
          <InfoBubble label="Occupation">{helper}</InfoBubble>
        </div>
        <span className="rounded-full border border-cyan-200/18 bg-cyan-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100">
          Dropdown
        </span>
      </div>

      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className={`group relative flex min-h-[66px] w-full items-center gap-3 overflow-hidden rounded-[18px] border px-3 py-2 text-left transition duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/28 active:translate-y-0 ${
          `${selectedStyle.active} ${selectedStyle.glow}`
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute inset-x-4 top-0 h-px bg-gradient-to-r ${selectedStyle.line} opacity-80`}
        />
        <span
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border transition duration-200 ${selectedStyle.icon} ring-2 ring-white/10 shadow-[0_0_20px_rgba(255,255,255,0.08)]`}
        >
          <SelectorIcon
            name={selectedOption.icon}
            className="h-7 w-7 drop-shadow-[0_0_9px_currentColor]"
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black leading-tight text-white">
            {selectedOption.label}
          </span>
          <span className="mt-0.5 block truncate text-[11px] font-semibold leading-4 text-slate-300">
            {selectedOption.description}
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-slate-950/48 text-sm font-black text-cyan-100 transition ${
            open ? "rotate-180" : ""
          }`}
        >
          v
        </span>
      </button>

      {open ? (
      <div
        role="listbox"
        aria-label="Occupation"
        className="absolute left-3 right-3 top-[calc(100%+0.45rem)] z-[180] max-h-[268px] space-y-1.5 overflow-y-auto rounded-[20px] border border-cyan-200/24 bg-slate-950/96 p-2 shadow-[0_22px_55px_rgba(0,0,0,0.55),0_0_28px_rgba(34,211,238,0.14)] backdrop-blur-xl [scrollbar-color:rgba(34,211,238,0.42)_rgba(15,23,42,0.72)] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/42 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/65"
      >
        {occupationOptions.map((option) => {
          const active = selectedValue === option.value;
          const style = accentStyles[option.accent] || accentStyles.cyan;

          return (
            <button
              key={option.value}
              ref={(node) => {
                optionRefs.current[option.value] = node;
              }}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-[18px] border px-2.5 py-2 text-left transition duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/28 active:translate-y-0 ${
                active
                  ? `${style.active} ${style.glow}`
                  : `border-white/10 bg-white/[0.035] text-slate-300 ${style.idle}`
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute inset-x-4 top-0 h-px bg-gradient-to-r ${style.line} transition ${
                  active ? "opacity-95" : "opacity-35 group-hover:opacity-75"
                }`}
              />
              <span
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border transition duration-200 ${
                  active
                    ? `${style.icon} scale-[1.03] ring-2 ring-white/10 shadow-[0_0_22px_rgba(255,255,255,0.10)]`
                    : `${style.icon} group-hover:scale-[1.03] group-hover:shadow-[0_0_18px_rgba(255,255,255,0.08)]`
                }`}
              >
                <SelectorIcon
                  name={option.icon}
                  className={`h-7 w-7 transition duration-200 ${
                    active
                      ? "drop-shadow-[0_0_10px_currentColor]"
                      : "opacity-90 group-hover:opacity-100 group-hover:drop-shadow-[0_0_8px_currentColor]"
                  }`}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black leading-tight text-white">
                  {option.label}
                </span>
                <span className="mt-0.5 block truncate text-[11px] font-semibold leading-4 text-slate-400 group-hover:text-slate-300">
                  {option.description}
                </span>
              </span>
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-black transition ${
                  active
                    ? "border-cyan-100/70 bg-cyan-100 text-slate-950"
                    : "border-white/10 bg-slate-950/60 text-transparent group-hover:text-slate-500"
                }`}
                aria-hidden="true"
              >
                ✓
              </span>
            </button>
          );
        })}
      </div>
      ) : null}
    </div>
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

function CompactSelectableCard({
  accent,
  ariaLabel,
  className = "",
  disabled = false,
  icon,
  label,
  onClick,
  selected,
  title,
  tone = "cyan",
}: {
  accent: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  selected: boolean;
  title?: string;
  tone?: CompactOptionTone;
}) {
  const toneStyle = compactOptionVisualStyles[tone];

  return (
    <button
      type="button"
      aria-label={ariaLabel || `Toggle ${label}`}
      aria-pressed={selected}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`group relative isolate aspect-square min-h-[86px] overflow-hidden rounded-[16px] border p-1.5 text-center transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${
        selected ? toneStyle.activeCard : toneStyle.idleCard
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-0 bg-gradient-to-br ${accent || toneStyle.surface} transition-opacity duration-200 ${
          selected ? "opacity-95" : "opacity-40 group-hover:opacity-68"
        }`}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),transparent_30%),linear-gradient(180deg,rgba(2,6,23,0.12),rgba(2,6,23,0.84))]"
      />
      <span
        aria-hidden="true"
        className={`absolute inset-x-3 top-1.5 h-px rounded-full bg-gradient-to-r ${toneStyle.line} transition-opacity duration-200 ${
          selected ? "opacity-100" : "opacity-45"
        }`}
      />
      <span
        className={`absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full border text-[10px] font-black transition ${
          selected
            ? toneStyle.check
            : "border-white/10 bg-slate-950/70 text-transparent"
        }`}
      >
        {selected ? "\u2713" : ""}
      </span>
      <span className="relative flex h-full flex-col items-center justify-center gap-1.5">
        <span
          className={`grid min-h-10 min-w-10 max-w-full place-items-center rounded-[14px] border px-1.5 text-[13px] font-black uppercase leading-none tracking-[0.04em] transition duration-200 ${
            selected ? toneStyle.iconActive : toneStyle.iconIdle
          }`}
        >
          {icon}
        </span>
        <span className="max-w-full text-[11px] font-black uppercase leading-[1.05] tracking-[0.035em] text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.55)]">
          {label}
        </span>
      </span>
    </button>
  );
}

function PreferenceCardGrid({
  helper,
  onToggle,
  options,
  selected,
  title,
}: {
  helper: string;
  onToggle: (value: string) => void;
  options: PreferenceCardOption[];
  selected: string[];
  title: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-950/44 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">
            {title}
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            {helper}
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
          Multi
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
        {options.map((option) => {
          const active = selected.includes(option.title);

          return (
            <CompactSelectableCard
              key={option.id}
              aria-label={`Toggle ${option.title}`}
              accent={option.accent}
              icon={getSelectorCardIcon(option.id, option.visual)}
              label={selectorCardShortLabels[option.id] || option.title}
              onClick={() => onToggle(option.title)}
              selected={active}
              tone={preferenceCardTones[option.id] || "cyan"}
              title={option.helper}
            />
          );
        })}
      </div>
    </div>
  );
}

function CompactMultiSelectGrid({
  onToggle,
  options,
  selected,
  title,
  variant = "default",
}: {
  onToggle: (value: string) => void;
  options: CompactOptionCard[];
  selected: string[];
  title: string;
  variant?: "bold" | "default";
}) {
  const selectedValues = Array.isArray(selected) ? selected : [];
  const isBold = variant === "bold";

  return (
    <div
      className={`rounded-[22px] border border-white/10 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_18px_50px_rgba(0,0,0,0.18)] ${
        isBold
          ? "bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(2,6,23,0.48))]"
          : "bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.1),transparent_34%),radial-gradient(circle_at_92%_0%,rgba(168,85,247,0.08),transparent_32%),rgba(15,23,42,0.38)]"
      }`}
    >
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-200">
          {title}
        </p>
        <span className="rounded-full border border-white/10 bg-slate-950/70 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-slate-400">
          {selectedValues.length ? `${selectedValues.length} selected` : "Multi-select"}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
        {options.map((option) => {
          const active = selectedValues.includes(option.title);
          const displayTitle = selectorCardShortLabels[option.id] || option.title;
          const boldVisual = boldCompactOptionVisuals[option.id];
          const surface = boldVisual?.accent || option.accent;
          const visibleIcon = getSelectorCardIcon(
            option.id,
            isBold ? boldVisual?.icon || option.icon : getCompactOptionIcon(option),
          );
          const visibleTitle = isBold
            ? boldVisual?.shortLabel || displayTitle
            : displayTitle;

          return (
            <CompactSelectableCard
              key={option.id}
              aria-label={`Toggle ${option.title}`}
              accent={surface}
              icon={visibleIcon}
              label={visibleTitle}
              onClick={() => onToggle(option.title)}
              selected={active}
              title={option.title}
              tone={option.tone}
            />
          );
        })}
      </div>
    </div>
  );
}

function CompactSingleSelectRow({
  helper,
  onSelect,
  options,
  selected,
  title,
}: {
  helper?: string;
  onSelect: (value: string) => void;
  options: CompactOptionCard[];
  selected: string;
  title: string;
}) {
  return (
    <div className="relative overflow-visible rounded-[22px] border border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.09),transparent_34%),radial-gradient(circle_at_92%_0%,rgba(249,115,22,0.07),transparent_32%),rgba(15,23,42,0.38)] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_18px_50px_rgba(0,0,0,0.18)]">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-200">
            {title}
          </p>
          {helper ? <InfoBubble label={title}>{helper}</InfoBubble> : null}
        </div>
        <span className="rounded-full border border-white/10 bg-slate-950/70 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-slate-400">
          Single-select
        </span>
      </div>
      <div className="flex max-w-full snap-x snap-mandatory gap-2 overflow-x-auto pb-2 pr-3 scroll-smooth [scrollbar-color:rgba(34,211,238,0.45)_rgba(15,23,42,0.62)] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/45 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/70">
        {options.map((option) => {
          const active = selected === option.title;
          const visibleTitle = selectorCardShortLabels[option.id] || option.title;

          return (
            <CompactSelectableCard
              key={option.id}
              accent={option.accent}
              className="w-[104px] shrink-0 snap-center sm:w-[112px]"
              icon={getSelectorCardIcon(option.id, getCompactOptionIcon(option))}
              label={visibleTitle}
              onClick={() => onSelect(option.title)}
              selected={active}
              title={option.title}
              tone={option.tone}
            />
          );
        })}
      </div>
    </div>
  );
}

function AdaptivePlanningFactorsGrid({
  notes,
  onNoteChange,
  onToggle,
  options,
  selected,
}: {
  notes: Record<string, string>;
  onNoteChange: (factor: string, note: string) => void;
  onToggle: (value: string) => void;
  options: AdaptivePlanningFactorOption[];
  selected: string[];
}) {
  const selectedValues = Array.isArray(selected) ? selected : [];
  const safeNotes = normalizeNotesRecord(notes);
  const selectedOptions = options.filter((option) =>
    selectedValues.includes(option.title),
  );

  return (
    <div className="overflow-visible rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.1),transparent_34%),radial-gradient(circle_at_88%_4%,rgba(251,146,60,0.08),transparent_32%),rgba(15,23,42,0.42)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.09)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-white">Adaptive Planning Factors</p>
          <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-slate-400">
            Real-world responsibilities and lifestyle factors that may interrupt or modify training.
          </p>
          <p className="mt-2 text-xs font-bold text-cyan-100/75">
            These factors help the app adapt your plan to real life.
          </p>
        </div>
        <span className="rounded-full border border-cyan-200/22 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
          {selectedValues.length ? `${selectedValues.length} active` : "Optional"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
        {options.map((option) => {
          const active = selectedValues.includes(option.title);

          return (
            <CompactSelectableCard
              key={option.id}
              aria-label={`Toggle ${option.title}`}
              accent={option.accent}
              icon={getSelectorCardIcon(option.id, option.icon)}
              label={selectorCardShortLabels[option.id] || option.title}
              onClick={() => onToggle(option.title)}
              selected={active}
              title={option.helper}
              tone={option.tone}
            />
          );
        })}
      </div>

      {selectedOptions.length ? (
        <div className="mt-4 rounded-[22px] border border-white/10 bg-slate-950/54 p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">
              Selected Factor Details
            </p>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">
              Notes optional
            </span>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {selectedOptions.map((option) => (
              <label
                key={`note-${option.id}`}
                className="block rounded-[18px] border border-white/10 bg-white/[0.035] p-3"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-white">
                    {option.title}
                  </span>
                  <span className="text-[10px] font-bold text-cyan-100/70">
                    {option.effect}
                  </span>
                </span>
                <textarea
                  className="mt-2 min-h-[72px] w-full resize-none rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm font-semibold leading-5 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/45 focus:bg-white/[0.06]"
                  onChange={(event) => onNoteChange(option.title, event.target.value)}
                  placeholder={option.placeholder}
                  value={safeNotes[option.title] || ""}
                />
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {/* TODO: Wire adaptive rules after backend review: shorter sessions, maintenance mode, home substitutions, schedule backups, and simplified travel blocks. */}
      <div className="mt-3 rounded-[18px] border border-emerald-200/14 bg-emerald-300/8 px-3 py-2 text-xs font-semibold leading-5 text-emerald-100/76">
        Future planning effects: session length adjustments, maintenance weeks, home substitutions,
        backup timing, and simplified programming during travel.
      </div>
    </div>
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
  dense = false,
  helper,
  helperMode = "inline",
  label,
  max,
  min,
  onChange,
  showArrowControls = false,
  showManualInput = true,
  showRangeMarkers = false,
  showSteppers = true,
  step = 1,
  tooltipVariant = "default",
  unit,
  value,
}: {
  compact?: boolean;
  color?: MetricColor;
  defaultValue: number;
  dense?: boolean;
  helper?: string;
  helperMode?: "inline" | "tooltip";
  label: string;
  max: number;
  min: number;
  onChange: (value: string) => void;
  showArrowControls?: boolean;
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
  const accent = metricAccentStyles[color];
  const activeClass = accent.active;
  const valueTextClass = accent.value;

  const setNumericValue = (nextValue: number) => {
    onChange(formatProfileNumber(clampNumber(nextValue, min, max), step));
  };
  const TooltipComponent =
    tooltipVariant === "fixed" ? FloatingInfoBubble : InfoBubble;
  const arrowButtonClass = `grid ${dense ? "h-8 w-8 rounded-lg text-xs" : "h-9 w-9 rounded-xl text-sm"} shrink-0 place-items-center border border-white/10 bg-white/[0.045] font-black text-slate-300 transition ${accent.stepper} disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white/[0.045]`;
  const stepperButtonClass = `grid ${dense ? "h-8 w-8 rounded-lg text-base" : "h-9 w-9 rounded-xl text-lg"} place-items-center border border-white/10 bg-white/[0.045] font-black text-slate-300 transition ${accent.stepper}`;

  return (
    <div
      className={`relative z-0 flex h-full flex-col overflow-visible border shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition focus-within:z-50 hover:z-50 ${accent.shell} ${
        compact ? (dense ? "rounded-[20px] p-3" : "rounded-[22px] p-4") : "rounded-[26px] p-5"
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute ${dense ? "inset-x-4" : "inset-x-5"} top-0 h-px rounded-full bg-gradient-to-r ${activeClass} opacity-70`}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`${dense ? "text-[11px]" : "text-xs"} font-black uppercase tracking-[0.14em] text-slate-400`}>
            {label}
          </p>
          <div className={`${dense ? "mt-1" : compact ? "mt-1.5" : "mt-2"} flex items-end gap-2`}>
            <span className={`${dense ? "text-2xl" : compact ? "text-3xl" : "text-4xl"} font-black ${valueTextClass}`}>
              {formatProfileNumber(numericValue, step)}
            </span>
            <span className={`${dense ? "pb-0.5 text-xs" : "pb-1 text-sm"} font-black uppercase tracking-[0.12em] text-slate-500`}>
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
                  className={stepperButtonClass}
                  aria-label={`Decrease ${label}`}
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setNumericValue(numericValue + step)}
                  className={stepperButtonClass}
                  aria-label={`Increase ${label}`}
                >
                  +
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <div
        className={`${dense ? "mt-3" : compact ? "mt-4" : "mt-5"} ${
          showArrowControls
            ? dense
              ? "grid grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-1.5"
              : "grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-2"
            : ""
        }`}
      >
        {showArrowControls ? (
          <button
            type="button"
            aria-label={`Decrease ${label}`}
            className={arrowButtonClass}
            disabled={numericValue <= min}
            onClick={() => setNumericValue(numericValue - step)}
          >
            &lt;
          </button>
        ) : null}
        <div className={`relative min-w-0 rounded-full border border-white/10 bg-slate-950/80 ${dense ? "h-4 p-1" : "h-5 p-1.5"}`}>
          <span
            className={`block h-full rounded-full bg-gradient-to-r ${activeClass} ${accent.fillShadow} transition-[width] duration-200 ease-out`}
            style={{ width: `${percent}%` }}
          />
          <span
            className={`pointer-events-none absolute top-1/2 ${dense ? "h-5 w-5" : "h-6 w-6"} -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-slate-950 ${accent.thumbShadow} transition-[left] duration-200 ease-out ${valueTextClass}`}
            style={{ left: `clamp(12px, ${percent}%, calc(100% - 12px))` }}
          >
            <span className="absolute inset-1 rounded-full bg-current" />
          </span>
          <input
            aria-label={`${label} slider`}
            className={`absolute left-0 w-full cursor-pointer touch-pan-x opacity-0 ${dense ? "-inset-y-2 h-10" : "-inset-y-3 h-12"}`}
            max={max}
            min={min}
            onChange={(event) => setNumericValue(Number(event.target.value))}
            step={step}
            type="range"
            value={numericValue}
          />
        </div>
        {showArrowControls ? (
          <button
            type="button"
            aria-label={`Increase ${label}`}
            className={arrowButtonClass}
            disabled={numericValue >= max}
            onClick={() => setNumericValue(numericValue + step)}
          >
            &gt;
          </button>
        ) : null}
      </div>

      {showRangeMarkers ? (
        <div className={`${dense ? "mt-1.5 text-[9px]" : "mt-2 text-[10px]"} flex items-center justify-between font-black uppercase tracking-[0.1em] text-slate-500`}>
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

function WeightTrendVerticalSelector({
  onChange,
  value,
}: {
  onChange: (value: BodyStatus["weightTrend"]) => void;
  value: BodyStatus["weightTrend"];
}) {
  const selectedValue = normalizeWeightTrend(value);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedOption =
    weightTrendOptions.find((option) => option.value === selectedValue) ||
    weightTrendOptions[0];

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePress = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsidePress);
    document.addEventListener("touchstart", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsidePress);
      document.removeEventListener("touchstart", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative z-0 overflow-visible rounded-[18px] border border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.09),transparent_34%),rgba(15,23,42,0.54)] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition focus-within:z-[120] hover:z-[120]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-300">
            Weight Trend
          </p>
        </div>
        <InfoBubble label="Weight Trend">
          Select the broad direction your body weight has been moving recently.
        </InfoBubble>
      </div>

      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className={`mt-2 flex min-h-[44px] w-full items-center gap-2 rounded-2xl border px-2.5 py-1.5 text-left transition duration-200 hover:-translate-y-0.5 active:scale-[0.98] ${selectedOption.active}`}
      >
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl border text-base font-black leading-none transition ${selectedOption.iconActive}`}
        >
          {selectedOption.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-black uppercase tracking-[0.1em] text-white">
            {selectedOption.value}
          </span>
          <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-300">
            {selectedOption.helper}
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-xl border border-white/10 bg-slate-950/48 text-[11px] font-black text-cyan-100 transition ${
            open ? "rotate-180" : ""
          }`}
        >
          v
        </span>
      </button>

      {open ? (
      <div
        role="listbox"
        aria-label="Weight Trend"
        className="absolute left-3 right-3 top-[calc(100%+0.45rem)] z-[180] rounded-[20px] border border-cyan-200/24 bg-slate-950/96 p-2 shadow-[0_22px_55px_rgba(0,0,0,0.55),0_0_28px_rgba(34,211,238,0.14)] backdrop-blur-xl"
      >
        <div className="relative grid gap-1.5">
          {weightTrendOptions.map((option) => {
            const active = selectedValue === option.value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                aria-pressed={active}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`group flex min-h-[34px] items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition duration-200 hover:-translate-y-0.5 active:scale-[0.98] ${
                  active
                    ? option.active
                    : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-cyan-200/25 hover:bg-cyan-300/10 hover:text-white"
                }`}
              >
                <span
                  className={`relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-base font-black leading-none transition ${
                    active ? option.iconActive : option.iconIdle
                  }`}
                >
                  {option.icon}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="block truncate text-[11px] font-black uppercase tracking-[0.08em]">
                    {option.value}
                  </span>
                </span>
                {active ? (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current shadow-[0_0_12px_currentColor]" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
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
      className={`${profileOverviewSectionShellClass} p-5 ${className}`}
    >
      <span aria-hidden="true" className={profileOverviewSectionGlowClass} />
      <div className="relative z-10">
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
      </div>
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
    <section className={`${profileOverviewSectionShellClass} p-4 sm:p-5`}>
      <span aria-hidden="true" className={profileOverviewSectionGlowClass} />
      <div className="relative z-10">
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
          className="group flex w-full items-start justify-between gap-4 rounded-[24px] border border-cyan-200/14 bg-slate-950/46 p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-cyan-200/28 hover:bg-white/[0.055] hover:shadow-[0_0_26px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.08)]"
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
              className={`grid h-10 w-10 place-items-center rounded-2xl border border-cyan-200/16 bg-cyan-300/8 text-lg font-black text-cyan-100 transition group-hover:border-cyan-200/35 group-hover:bg-cyan-300/12 ${
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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const tabSliderRef = useRef<HTMLDivElement | null>(null);
  const tabButtonRefs = useRef<Partial<Record<ProfileTab, HTMLButtonElement | null>>>({});
  const [profileSectionOpen, setProfileSectionOpen] = useState<ProfileAccordionState>({
    appCoachNotes: false,
    benchmarks: false,
    measurements: false,
    myBody: false,
    planBuilder: false,
    planDirection: false,
    previousExperience: false,
    readiness: false,
    specialCircumstances: false,
  });
  const [activeProfileOrbiterIndices, setActiveProfileOrbiterIndices] =
    useState<Record<string, number>>({});
  const [activeProfileOrbiterRow, setActiveProfileOrbiterRow] = useState(0);
  const [activeProfileDashboardIndex, setActiveProfileDashboardIndex] =
    useState(0);
  const [profileDashboardSlideDirection, setProfileDashboardSlideDirection] =
    useState<"left" | "right">("right");
  const [openProfileOrbiterDetails, setOpenProfileOrbiterDetails] =
    useState<string | null>(null);
  const [expandedProfileOrbiterCard, setExpandedProfileOrbiterCard] =
    useState<string | null>(null);
  const [profileOrbiterRailExpanded, setProfileOrbiterRailExpanded] =
    useState(false);
  const [activeProfileHubIndex, setActiveProfileHubIndex] = useState(
    DEFAULT_PROFILE_HUB_INDEX,
  );
  const [activeProfileHubAccountIndex, setActiveProfileHubAccountIndex] =
    useState(DEFAULT_PROFILE_HUB_ACCOUNT_INDEX);
  const [activeProfileHubLayer, setActiveProfileHubLayer] = useState(
    DEFAULT_PROFILE_HUB_LAYER,
  );
  const activeProfileHubLayerRef = useRef(DEFAULT_PROFILE_HUB_LAYER);
  const [profileHubLayerCardHeights, setProfileHubLayerCardHeights] = useState<
    number[]
  >([]);
  const [profileHubRowTitleHeights, setProfileHubRowTitleHeights] = useState<
    number[]
  >([]);
  const [profileHubLayerMotionOffset, setProfileHubLayerMotionOffset] =
    useState(0);
  const [profileHubHorizontalMotionOffset, setProfileHubHorizontalMotionOffset] =
    useState(0);
  const [profileHubOpen, setProfileHubOpen] = useState(false);
  const [profileHubMounted, setProfileHubMounted] = useState(false);
  const [openProfileHubDetailKey, setOpenProfileHubDetailKey] = useState<
    string | null
  >(null);
  const [activeBodyMetricOrbiterIndex, setActiveBodyMetricOrbiterIndex] =
    useState(0);
  const profileHubOverlayRef = useRef<HTMLDivElement | null>(null);
  const profileHubLayerCardRefs = useRef<(HTMLElement | null)[]>([]);
  const profileHubRowTitleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const profileHubLayerPointerStartRef = useRef<{
    x: number;
    y: number;
  } | null>(null);
  const profileHubLayerPointerMovedRef = useRef(false);
  const profileHubMainOrbitPointerStartRef = useRef<number | null>(null);
  const profileHubMainOrbitPointerMovedRef = useRef(false);
  const profileHubAccountOrbitPointerStartRef = useRef<number | null>(null);
  const profileHubAccountOrbitPointerMovedRef = useRef(false);
  const profileHubLayerWheelDeltaRef = useRef(0);
  const profileHubLayerWheelLockRef = useRef(0);
  const profileHubLayerWheelResetRef = useRef<number | null>(null);
  const profileHubHorizontalWheelDeltaRef = useRef(0);
  const profileHubHorizontalWheelLockRef = useRef(0);
  const profileHubHorizontalWheelResetRef = useRef<number | null>(null);
  const profileHubFadeFrameRef = useRef<number | null>(null);
  const profileOrbiterPointerStartRef = useRef<{
    x: number;
    y: number;
  } | null>(null);
  const profileOrbiterPointerMovedRef = useRef(false);
  const profileOrbiterWheelLockRef = useRef(false);
  const profileOrbiterScrollSyncLockRef = useRef(false);
  const profileOrbiterScrollSyncTimerRef = useRef<number | null>(null);
  const profileOrbiterRailCollapseTimerRef = useRef<number | null>(null);
  const profileOrbiterRef = useRef<HTMLElement | null>(null);
  const profileOrbiterViewportRef = useRef<HTMLDivElement | null>(null);
  const profileHeroRowRef = useRef<HTMLElement | null>(null);
  const shouldLetProfileOrbiterTargetScroll = (
    target: EventTarget | null,
    deltaY: number,
  ) => {
    if (!(target instanceof HTMLElement)) return false;

    const scrollArea = target.closest<HTMLElement>(
      "[data-profile-orbiter-scroll-area='true']",
    );
    if (!scrollArea) return false;

    const overflow = scrollArea.scrollHeight - scrollArea.clientHeight;
    if (overflow <= 2) return false;

    if (deltaY < 0) return scrollArea.scrollTop > 2;
    if (deltaY > 0) return scrollArea.scrollTop < overflow - 2;
    return false;
  };
  const resetProfileHubDefaults = useCallback(() => {
    setActiveProfileHubIndex(DEFAULT_PROFILE_HUB_INDEX);
    setActiveProfileHubAccountIndex(DEFAULT_PROFILE_HUB_ACCOUNT_INDEX);
    setActiveProfileHubLayer(DEFAULT_PROFILE_HUB_LAYER);
    activeProfileHubLayerRef.current = DEFAULT_PROFILE_HUB_LAYER;
    setOpenProfileHubDetailKey(null);
    setProfileHubLayerMotionOffset(0);
    setProfileHubHorizontalMotionOffset(0);
  }, []);
  const openProfileHub = useCallback(() => {
    resetProfileHubDefaults();
    setProfileHubMounted(true);

    if (profileHubFadeFrameRef.current !== null) {
      cancelAnimationFrame(profileHubFadeFrameRef.current);
    }

    profileHubFadeFrameRef.current = requestAnimationFrame(() => {
      profileHubFadeFrameRef.current = null;
      setProfileHubOpen(true);
    });
  }, [resetProfileHubDefaults]);
  const closeProfileHub = useCallback(() => {
    if (profileHubFadeFrameRef.current !== null) {
      cancelAnimationFrame(profileHubFadeFrameRef.current);
      profileHubFadeFrameRef.current = null;
    }

    setProfileHubOpen(false);
  }, []);
  const toggleProfileHub = useCallback(() => {
    if (profileHubOpen) {
      closeProfileHub();
      return;
    }

    openProfileHub();
  }, [closeProfileHub, openProfileHub, profileHubOpen]);
  const signOutFromProfileHub = useCallback(async () => {
    closeProfileHub();
    await supabase.auth.signOut();
    router.push(ROUTES.auth.login);
    router.refresh();
  }, [closeProfileHub, router]);
  const expandProfileOrbiterRail = useCallback(() => {
    if (profileOrbiterRailCollapseTimerRef.current) {
      window.clearTimeout(profileOrbiterRailCollapseTimerRef.current);
      profileOrbiterRailCollapseTimerRef.current = null;
    }

    setProfileOrbiterRailExpanded(true);
  }, []);
  const collapseProfileOrbiterRail = useCallback(() => {
    if (profileOrbiterRailCollapseTimerRef.current) {
      window.clearTimeout(profileOrbiterRailCollapseTimerRef.current);
    }

    profileOrbiterRailCollapseTimerRef.current = window.setTimeout(() => {
      setProfileOrbiterRailExpanded(false);
      profileOrbiterRailCollapseTimerRef.current = null;
    }, 240);
  }, []);
  useEffect(() => {
    activeProfileHubLayerRef.current = activeProfileHubLayer;
  }, [activeProfileHubLayer]);
  useEffect(() => {
    if (profileHubOpen) {
      setProfileHubMounted(true);
      return;
    }

    if (!profileHubMounted) return;

    const unmountTimer = window.setTimeout(() => {
      setProfileHubMounted(false);
    }, 420);

    return () => {
      window.clearTimeout(unmountTimer);
    };
  }, [profileHubMounted, profileHubOpen]);
  useEffect(() => {
    if (!profileHubOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedProfileOverlay =
        profileHubOverlayRef.current?.contains(target) ?? false;

      if (!clickedProfileOverlay) {
        closeProfileHub();
      }
    };
    const handleProfileHubKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target instanceof HTMLElement &&
        ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName);

      if (event.key === "Escape") {
        event.preventDefault();
        closeProfileHub();
        return;
      }

      if (isTypingTarget) return;

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveProfileHubLayer((currentLayer) => {
          const nextLayer = Math.max(0, currentLayer - 1);
          activeProfileHubLayerRef.current = nextLayer;
          return nextLayer;
        });
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveProfileHubLayer((currentLayer) => {
          const nextLayer = Math.min(2, currentLayer + 1);
          activeProfileHubLayerRef.current = nextLayer;
          return nextLayer;
        });
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleProfileHubKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleProfileHubKeyDown);
    };
  }, [closeProfileHub, profileHubOpen]);
  useEffect(() => {
    if (!profileHubOpen) return;

    let animationFrame = 0;
    const arraysMatch = (left: number[], right: number[]) =>
      left.length === right.length &&
      left.every((value, index) => value === right[index]);
    const updateMeasurements = () => {
      const nextCardHeights = Array.from(
        { length: 3 },
        (_, layer) => profileHubLayerCardRefs.current[layer]?.offsetHeight || 0,
      );
      const nextTitleHeights = Array.from(
        { length: 3 },
        (_, layer) => profileHubRowTitleRefs.current[layer]?.offsetHeight || 0,
      );

      setProfileHubLayerCardHeights((current) =>
        arraysMatch(current, nextCardHeights) ? current : nextCardHeights,
      );
      setProfileHubRowTitleHeights((current) =>
        arraysMatch(current, nextTitleHeights) ? current : nextTitleHeights,
      );
      animationFrame = window.requestAnimationFrame(updateMeasurements);
    };

    animationFrame = window.requestAnimationFrame(updateMeasurements);

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [profileHubOpen]);
  const scrollProfileOrbiterIntoView = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      window.requestAnimationFrame(() => {
        const orbiter = profileOrbiterRef.current;
        if (!orbiter) return;

        const rect = orbiter.getBoundingClientRect();
        const topComfort = 104;
        const bottomComfort = 112;
        const lowerEdge = window.innerHeight - bottomComfort;
        if (rect.top >= topComfort && rect.bottom <= lowerEdge) return;

        const top =
          rect.top < topComfort
            ? rect.top + window.scrollY - topComfort
            : rect.bottom + window.scrollY - lowerEdge;

        window.scrollTo({
          behavior,
          top: Math.max(0, top),
        });
      });
    },
    [],
  );
  const scrollProfileOrbiterViewportToRow = useCallback(
    (row: number, behavior: ScrollBehavior = "smooth") => {
      profileOrbiterScrollSyncLockRef.current = true;
      if (profileOrbiterScrollSyncTimerRef.current) {
        window.clearTimeout(profileOrbiterScrollSyncTimerRef.current);
      }
      profileOrbiterScrollSyncTimerRef.current = window.setTimeout(() => {
        profileOrbiterScrollSyncLockRef.current = false;
        profileOrbiterScrollSyncTimerRef.current = null;
      }, behavior === "smooth" ? 680 : 140);

      window.requestAnimationFrame(() => {
        const viewport = profileOrbiterViewportRef.current;
        const target =
          row === 0
            ? profileHeroRowRef.current
            : document.getElementById(`profile-orbiter-row-${row}`);
        if (!viewport || !target) return;

        const rowTop = target.offsetTop;
        const rowHeight = target.offsetHeight;
        const centeredOffset = Math.max(
          0,
          (viewport.clientHeight - rowHeight) / 2,
        );
        const maxScroll = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
        const targetTop = row === 0 ? 0 : rowTop - centeredOffset;

        viewport.scrollTo({
          behavior,
          top: Math.max(0, Math.min(maxScroll, targetTop)),
        });
      });
    },
    [],
  );
  const scrollProfileHeroRowIntoView = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      window.requestAnimationFrame(() => {
        profileOrbiterViewportRef.current?.scrollTo({
          behavior,
          top: 0,
        });
        const orbiter = profileOrbiterRef.current;
        if (orbiter) {
          const top = orbiter.getBoundingClientRect().top + window.scrollY - 96;
          window.scrollTo({
            behavior,
            top: Math.max(0, top),
          });
        } else {
          scrollProfileOrbiterIntoView(behavior);
        }
        profileHeroRowRef.current?.scrollTo({ top: 0, behavior });
      });
    },
    [scrollProfileOrbiterIntoView],
  );
  const jumpProfileOrbiterToHero = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      profileOrbiterPointerStartRef.current = null;
      profileOrbiterWheelLockRef.current = false;
      setActiveProfileOrbiterRow(0);
      setOpenProfileOrbiterDetails(null);
      setExpandedProfileOrbiterCard(null);
      scrollProfileHeroRowIntoView(behavior);
      window.setTimeout(() => scrollProfileHeroRowIntoView("auto"), 90);
    },
    [scrollProfileHeroRowIntoView],
  );
  const [heroReadinessDetailsOpen, setHeroReadinessDetailsOpen] = useState(false);
  const [masterJourneyExpanded, setMasterJourneyExpanded] = useState(false);
  const [openMasterJourney, setOpenMasterJourney] = useState<string | null>(null);
  const [authFallback, setAuthFallback] = useState<ProfileAuthFallback>({
    avatarUrl: "",
    displayName: "",
    email: "",
    memberSinceAt: "",
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [planDirectionMessage, setPlanDirectionMessage] = useState("");
  const [profile, setProfile] = useState<SoundFitnessProfile>(defaultProfile);
  const [savedSnapshot, setSavedSnapshot] = useState(
    JSON.stringify(defaultProfile),
  );
  const [isEditingIdentity, setIsEditingIdentity] = useState(false);
  const [identityNameDraft, setIdentityNameDraft] = useState("");
  const [identityHandleDraft, setIdentityHandleDraft] = useState("");
  const [birthdayDraft, setBirthdayDraft] = useState<BirthdayParts>(() =>
    getBirthdayParts(defaultProfile.birthday),
  );
  const [bodyScanManualDraft, setBodyScanManualDraft] =
    useState<BodyScanManualDraft>(() => getBlankBodyScanManualDraft());
  const [bodyScanCsvPreview, setBodyScanCsvPreview] =
    useState<BodyScanCsvPreview | null>(null);
  const [bodyScanImportMessage, setBodyScanImportMessage] = useState("");
  const [bodyScanArtifactMessage, setBodyScanArtifactMessage] = useState("");
  const [customMeasurementLabel, setCustomMeasurementLabel] = useState("");
  const [customMeasurementValue, setCustomMeasurementValue] = useState("");
  const [customMeasurementsOpen, setCustomMeasurementsOpen] = useState(false);
  const measurementSliderRef = useRef<HTMLDivElement | null>(null);
  const measurementCardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const goalCompassSliderRef = useRef<HTMLDivElement | null>(null);
  const goalCompassCardRefs = useRef<Partial<Record<GoalMode, HTMLDivElement | null>>>({});
  const goalCompassScrollTimerRef = useRef<number | null>(null);
  const [goalCompassScrolling, setGoalCompassScrolling] = useState(false);
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

  const toggleProfileSection = (section: ProfileAccordionSection) => {
    setProfileSectionOpen((current) => {
      const next: ProfileAccordionState = {
        appCoachNotes: false,
        benchmarks: false,
        measurements: false,
        myBody: false,
        planBuilder: false,
        planDirection: false,
        previousExperience: false,
        readiness: false,
        specialCircumstances: false,
      };

      next[section] = !current[section];
      return next;
    });
  };
  const [specialCircumstanceScrollState, setSpecialCircumstanceScrollState] =
    useState({ canScrollLeft: false, canScrollRight: true });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("soundFitnessDashboardProfileVisited", "true");
    }

    let isMounted = true;

    async function loadProfile() {
      let nextProfile = defaultProfile;
      let nextAuthFallback: ProfileAuthFallback = {
        avatarUrl: "",
        displayName: "",
        email: "",
        memberSinceAt: "",
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
        const authCreatedAt = data.user?.created_at || "";
        const authName =
          readProfileText(metadata.full_name, metadata.name, authEmail.split("@")[0]) ||
          "";
        const authAvatar = readProfileText(metadata.avatar_url);

        nextAuthFallback = {
          avatarUrl: authAvatar,
          displayName: authName,
          email: authEmail,
          memberSinceAt: authCreatedAt,
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
  const memberSinceLabel = formatMemberSince(
    readProfileText(
      profileRecord.memberSince,
      profileRecord.memberSinceAt,
      profileRecord.joinedAt,
      profileRecord.signupTimestamp,
      profileRecord.createdAt,
      profileRecord.created_at,
      authFallback.memberSinceAt,
    ),
  );
  const soundPointsValue = Number(
    profileRecord.soundPoints || profileRecord.points || 0,
  );
  const soundPoints = Number.isFinite(soundPointsValue) ? soundPointsValue : 0;
  const soundTokensValue = Number(
    profileRecord.soundTokens ??
      profileRecord.tokens ??
      profileRecord.soundTokenCount ??
      profileRecord.tokenCount ??
      profileRecord.sound_token_count ??
      0,
  );
  const soundTokens = Number.isFinite(soundTokensValue) ? soundTokensValue : 0;

  const activeLimitations = profile.injuries.filter((injury) => injury.painLevel > 0);

  const planSummary = useMemo(() => {
    const planDirections = normalizePlanDirections(
      profile.planDirections,
      profile.goalMode,
    );
    const primaryDirection = planDirections[0] || profile.goalMode;
    const secondaryDirection = planDirections[1];
    const directionSummary = secondaryDirection
      ? `${primaryDirection} primary with ${secondaryDirection} secondary`
      : primaryDirection;
    const injuryText = activeLimitations.length
      ? `It should respect ${activeLimitations.map((item) => item.region).join(", ")} limitations.`
      : "No active limitation has been added yet.";
    const nutritionText =
      profile.bodyGoalMode === "Cut" || planDirections.includes("Lose Fat")
        ? "Nutrition should support a moderate deficit and protein consistency."
        : profile.bodyGoalMode === "Bulk" || planDirections.includes("Build Muscle")
          ? "Nutrition should support sufficient protein and steady training fuel."
          : "Nutrition should support consistency and recovery.";
    const specialText = profile.specialCircumstances.length
      ? `Special context to respect: ${profile.specialCircumstances.map((item) => item.label).join(", ")}.`
      : "";
    const splitSummary = profile.preferredSplits.length
      ? profile.preferredSplits.join(", ")
      : profile.preferredSplit;

    return `Based on this profile, the app should prioritize ${directionSummary}, ${profile.bodyGoalMode.toLowerCase()} body direction, ${profile.sessionsPerWeek || "4"} sessions per week, ${splitSummary}, and ${profile.trainingStyles.join(", ") || "balanced training"}. ${injuryText} ${nutritionText} ${specialText}`;
  }, [
    activeLimitations,
    profile.bodyGoalMode,
    profile.goalMode,
    profile.planDirections,
    profile.preferredSplit,
    profile.preferredSplits,
    profile.sessionsPerWeek,
    profile.specialCircumstances,
    profile.trainingStyles,
  ]);
  const tabCompletions = useMemo(
    () => getProfileTabCompletions(profile),
    [profile],
  );
  const profileHeaderDashboardLinks = useMemo(
    () =>
      [
        {
          href: ROUTES.dashboard.profile,
          icon: "user" as SelectorIconName,
          label: "Profile",
          meta: "Identity",
          points: soundPoints,
          tone:
            "border-cyan-100/50 bg-cyan-300 text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.24)]",
        },
        {
          href: ROUTES.dashboard.goals,
          icon: "compass" as SelectorIconName,
          label: "Goals",
          meta: "Direction",
          points: Math.round(soundPoints * 0.68),
          tone:
            "border-amber-200/34 bg-amber-300/12 text-amber-100 hover:border-amber-100/45 hover:bg-amber-300/18",
        },
        {
          href: ROUTES.dashboard.sessions,
          icon: "dumbbell" as SelectorIconName,
          label: "Workout",
          meta: "Sessions",
          points: Math.round(soundPoints * 0.82),
          tone:
            "border-sky-200/28 bg-sky-300/10 text-sky-100 hover:border-sky-100/45 hover:bg-sky-300/16",
        },
        {
          href: ROUTES.nutritionPortal.home,
          icon: "utensils" as SelectorIconName,
          label: "Nutrition",
          meta: "Fuel",
          points: Math.round(soundPoints * 0.38),
          tone:
            "border-emerald-200/28 bg-emerald-300/10 text-emerald-100 hover:border-emerald-100/45 hover:bg-emerald-300/16",
        },
        {
          href: ROUTES.dashboard.recovery,
          icon: "heart-pulse" as SelectorIconName,
          label: "Recovery",
          meta: "Readiness",
          points: Math.round(soundPoints * 0.24),
          tone:
            "border-violet-200/28 bg-violet-300/10 text-violet-100 hover:border-violet-100/45 hover:bg-violet-300/16",
        },
        {
          href: ROUTES.performance.home,
          icon: "activity" as SelectorIconName,
          label: "Performance",
          meta: "Athletic",
          points: Math.round(soundPoints * 0.46),
          tone:
            "border-amber-200/30 bg-amber-300/10 text-amber-100 hover:border-amber-100/45 hover:bg-amber-300/16",
        },
        {
          href: ROUTES.learning.home,
          icon: "brain" as SelectorIconName,
          label: "Education",
          meta: "Learning",
          points: Math.round(soundPoints * 0.12),
          tone:
            "border-blue-200/28 bg-blue-300/10 text-blue-100 hover:border-blue-100/45 hover:bg-blue-300/16",
        },
        {
          href: ROUTES.soundworld.home,
          icon: "sparkles" as SelectorIconName,
          label: "Sound World",
          meta: "Community",
          points: Math.round(soundPoints * 0.08),
          tone:
            "border-pink-200/28 bg-pink-300/10 text-pink-100 hover:border-pink-100/45 hover:bg-pink-300/16",
        },
      ] as const,
    [soundPoints],
  );
  const activeProfileDashboardLink =
    profileHeaderDashboardLinks[
      activeProfileDashboardIndex % profileHeaderDashboardLinks.length
    ] || profileHeaderDashboardLinks[0];
  const profileGoalsDashboardLink =
    profileHeaderDashboardLinks.find(
      (dashboardLink) => dashboardLink.href === ROUTES.dashboard.goals,
    ) || profileHeaderDashboardLinks[1];
  const rotateProfileDashboardRail = (direction: "left" | "right") => {
    setProfileDashboardSlideDirection(direction);
    setActiveProfileDashboardIndex((currentIndex) =>
      direction === "left"
        ? (currentIndex - 1 + profileHeaderDashboardLinks.length) %
          profileHeaderDashboardLinks.length
        : (currentIndex + 1) % profileHeaderDashboardLinks.length,
    );
  };
  const planReadiness = useMemo(() => {
    const readinessSectionIds: ProfileCompletionSection[] = [
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
      label:
        id === "circumstances"
          ? "Special Circumstances"
          : id === "goals"
            ? "Goals"
          : id === "measurements"
            ? "Body Measurements"
          : id === "preferences"
            ? "Coach / App Preferences"
          : id === "planDirection"
            ? "Plan Direction"
          : tabs.find((tab) => tab.id === id)?.label || id,
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
      className: `${planRiskTone.border} ${planRiskTone.softBg} ${planRiskTone.text} ${planRiskTone.glow}`,
      label: "Risk",
      value: `${planReadiness.risk.label} Risk`,
      wide: false,
    },
    {
      className: "border-blue-300/24 bg-blue-400/10 text-blue-100 shadow-[0_0_18px_rgba(59,130,246,0.1)]",
      label: "Sleep",
      value:
        profile.bodyStatus.averageSleepHours ||
        profile.bodyStatus.hoursSlept ||
        profile.sleepGoal ||
        "Not set",
      wide: false,
    },
    {
      className: "border-yellow-200/24 bg-yellow-300/10 text-yellow-100 shadow-[0_0_18px_rgba(250,204,21,0.1)]",
      label: "Energy",
      value: profile.bodyStatus.energyStatus,
      wide: false,
    },
    {
      className: "border-amber-200/24 bg-orange-300/10 text-orange-100 shadow-[0_0_18px_rgba(251,146,60,0.1)]",
      label: "Stress",
      value: profile.bodyStatus.stressStatus,
      wide: false,
    },
    {
      className: "border-fuchsia-200/24 bg-fuchsia-300/10 text-fuchsia-100 shadow-[0_0_18px_rgba(217,70,239,0.1)]",
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
      className: "border-red-200/24 bg-red-300/10 text-red-100 shadow-[0_0_18px_rgba(248,113,113,0.1)]",
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
      className: "border-teal-200/24 bg-teal-300/10 text-teal-100 shadow-[0_0_18px_rgba(45,212,191,0.1)]",
      label: "Recovery",
      value: planReadiness.readinessLabel,
      wide: false,
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

  const openProfileOrbiterSection = useCallback(({
    accordion,
    tab,
    targetId,
  }: {
    accordion?: ProfileAccordionSection;
    tab: ProfileTab;
    targetId: string;
  }) => {
    setActiveTab(tab);
    setActiveProfileOrbiterRow(getProfileOrbiterRowForTab(tab));
    if (accordion) {
      setProfileSectionOpen(() => {
        const next: ProfileAccordionState = {
          appCoachNotes: false,
          benchmarks: false,
          measurements: false,
          myBody: false,
          planBuilder: false,
          planDirection: false,
          previousExperience: false,
          readiness: false,
          specialCircumstances: false,
        };

        next[accordion] = true;
        return next;
      });
    }

    window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
  }, []);

  useEffect(() => {
    if (loading) return;

    const openProfileHashTarget = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash === "my-body") {
        openProfileOrbiterSection({
          accordion: "myBody",
          tab: "overview",
          targetId: "my-body",
        });
        return;
      }

      if (hash === "measurements") {
        openProfileOrbiterSection({
          accordion: "measurements",
          tab: "overview",
          targetId: "measurements",
        });
      }
    };

    openProfileHashTarget();
    window.addEventListener("hashchange", openProfileHashTarget);
    return () => window.removeEventListener("hashchange", openProfileHashTarget);
  }, [loading, openProfileOrbiterSection]);

  useEffect(() => {
    if (activeProfileOrbiterRow !== 0) return;

    scrollProfileHeroRowIntoView();
  }, [activeProfileOrbiterRow, scrollProfileHeroRowIntoView]);

  useEffect(() => {
    if (loading) return;

    jumpProfileOrbiterToHero("auto");
  }, [jumpProfileOrbiterToHero, loading]);

  useEffect(() => {
    return () => {
      if (goalCompassScrollTimerRef.current) {
        window.clearTimeout(goalCompassScrollTimerRef.current);
      }
      if (profileOrbiterScrollSyncTimerRef.current) {
        window.clearTimeout(profileOrbiterScrollSyncTimerRef.current);
      }
      if (profileOrbiterRailCollapseTimerRef.current) {
        window.clearTimeout(profileOrbiterRailCollapseTimerRef.current);
      }
      if (profileHubFadeFrameRef.current !== null) {
        window.cancelAnimationFrame(profileHubFadeFrameRef.current);
      }
      if (profileHubLayerWheelResetRef.current) {
        window.clearTimeout(profileHubLayerWheelResetRef.current);
      }
      if (profileHubHorizontalWheelResetRef.current) {
        window.clearTimeout(profileHubHorizontalWheelResetRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const primaryPlanDirection = normalizePlanDirections(
      profile.planDirections,
      profile.goalMode,
    )[0];
    const activeCard = primaryPlanDirection
      ? goalCompassCardRefs.current[primaryPlanDirection]
      : null;
    if (!goalCompassSliderRef.current || !activeCard) return;

    const timeoutId = window.setTimeout(() => {
      activeCard.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }, 80);

    return () => window.clearTimeout(timeoutId);
  }, [activeTab, profile.goalMode, profile.planDirections]);

  const markGoalCompassScrolling = () => {
    setGoalCompassScrolling(true);
    if (goalCompassScrollTimerRef.current) {
      window.clearTimeout(goalCompassScrollTimerRef.current);
    }
    goalCompassScrollTimerRef.current = window.setTimeout(() => {
      setGoalCompassScrolling(false);
    }, 420);
  };

  const scrollGoalCompass = (direction: "left" | "right") => {
    const slider = goalCompassSliderRef.current;
    if (!slider) return;

    const scrollAmount = Math.max(260, slider.clientWidth * 0.78);
    markGoalCompassScrolling();
    window.setTimeout(() => {
      slider.scrollBy({
        behavior: "smooth",
        left: direction === "left" ? -scrollAmount : scrollAmount,
      });
    }, 40);
  };

  const togglePlanDirection = (direction: GoalMode) => {
    setProfile((current) => {
      const currentDirections = normalizePlanDirections(
        current.planDirections,
        current.goalMode,
      );
      const alreadySelected = currentDirections.includes(direction);
      const nextDirections = alreadySelected
        ? currentDirections.filter((item) => item !== direction)
        : currentDirections.length >= 2
          ? currentDirections
          : [...currentDirections, direction];

      if (!alreadySelected && currentDirections.length >= 2) {
        setPlanDirectionMessage("Choose up to 2 priorities.");
        return current;
      }

      setPlanDirectionMessage(
        nextDirections.length
          ? "Primary drives programming. Secondary modifies accessories, recovery, and cardio."
          : "Choose up to 2 priorities.",
      );

      return {
        ...current,
        goalMode: nextDirections[0] || current.goalMode,
        planDirections: nextDirections,
        primaryGoal: nextDirections.length
          ? `${nextDirections.join(" + ")} Plan`
          : current.primaryGoal,
        secondaryGoal: nextDirections[1] || current.secondaryGoal,
      };
    });
  };

  const setProfileField = <K extends keyof SoundFitnessProfile>(
    key: K,
    value: SoundFitnessProfile[K],
  ) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const flashBodyScanImportMessage = (value: string) => {
    setBodyScanImportMessage(value);
    window.setTimeout(() => setBodyScanImportMessage(""), 3600);
  };

  const updateBodyScanManualDraft = <K extends keyof BodyScanManualDraft>(
    key: K,
    value: BodyScanManualDraft[K],
  ) => {
    setBodyScanManualDraft((current) => ({ ...current, [key]: value }));
  };

  const appendBodyScanRecords = (records: NormalizedBodyScanRecord[]) => {
    const importableRecords = records.filter(bodyScanRecordHasMetricData);
    if (!importableRecords.length) return;

    setProfile((current) => {
      const currentImports = normalizeBodyScanImports(current.bodyScanImports);
      const currentHistory = normalizeBodyMetricHistory(current.bodyMetricHistory);
      const latestRecord = importableRecords[importableRecords.length - 1];
      const updatedMeasurements = {
        ...current.measurements,
        bodyFat: latestRecord.bodyFat || current.measurements.bodyFat,
        lastUpdated: latestRecord.savedAt || new Date().toISOString(),
        waist: latestRecord.waist || current.measurements.waist,
      };

      return {
        ...current,
        bodyFat: latestRecord.bodyFat || current.bodyFat,
        bodyMetricHistory: [...currentHistory, ...importableRecords].slice(-36),
        bodyScanImports: [...currentImports, ...importableRecords].slice(-50),
        bodyScanSource: latestRecord.provider || current.bodyScanSource,
        currentWeight: latestRecord.weight || current.currentWeight,
        measurements: updatedMeasurements,
        muscleMass: latestRecord.muscleMass || current.muscleMass,
        waist: latestRecord.waist || current.waist,
      };
    });
  };

  const handleManualBodyScanImport = () => {
    const record = createNormalizedBodyScanRecord({
      provider: bodyScanManualDraft.provider || "Manual Entry",
      scanDate: bodyScanManualDraft.scanDate,
      values: {
        ...bodyScanManualDraft,
        weightTrend: profile.bodyStatus.weightTrend,
      },
    });

    if (!bodyScanRecordHasMetricData(record)) {
      flashBodyScanImportMessage("Add at least one body scan value to import.");
      return;
    }

    appendBodyScanRecords([record]);
    setBodyScanManualDraft(getBlankBodyScanManualDraft());
    flashBodyScanImportMessage("Manual body scan imported into profile metrics.");
  };

  const handleBodyScanCsvUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const parsed = parseBodyScanCsvRows(text);
      const mapping = inferBodyScanColumnMapping(parsed.headers);
      const mappedHeaders = new Set(Object.values(mapping).filter(Boolean));
      const unmappedHeaders = parsed.headers.filter((header) => !mappedHeaders.has(header));
      const importedAt = new Date().toISOString();
      const records = parsed.rows
        .map((row) =>
          createNormalizedBodyScanRecord({
            importedAt,
            mappedColumns: mapping,
            provider: readMappedBodyScanField(row, mapping, "provider") || "CSV Import",
            rawFileName: file.name,
            scanDate: readMappedBodyScanField(row, mapping, "savedAt"),
            values: {
              basalMetabolicRate: readMappedBodyScanField(
                row,
                mapping,
                "basalMetabolicRate",
              ),
              bodyFat: readMappedBodyScanField(row, mapping, "bodyFat"),
              leanMass: readMappedBodyScanField(row, mapping, "leanMass"),
              metabolicAge: readMappedBodyScanField(row, mapping, "metabolicAge"),
              muscleMass: readMappedBodyScanField(row, mapping, "muscleMass"),
              notes: readMappedBodyScanField(row, mapping, "notes"),
              provider: readMappedBodyScanField(row, mapping, "provider"),
              savedAt: readMappedBodyScanField(row, mapping, "savedAt"),
              visceralFat: readMappedBodyScanField(row, mapping, "visceralFat"),
              waist: readMappedBodyScanField(row, mapping, "waist"),
              weight: readMappedBodyScanField(row, mapping, "weight"),
              weightTrend: profile.bodyStatus.weightTrend,
            },
          }),
        )
        .filter(bodyScanRecordHasMetricData);

      setBodyScanCsvPreview({
        fileName: file.name,
        importedCount: records.length,
        mappedColumns: mapping,
        unmappedHeaders,
      });

      if (!records.length) {
        flashBodyScanImportMessage("CSV uploaded, but no mapped body scan values were found.");
        return;
      }

      appendBodyScanRecords(records);
      flashBodyScanImportMessage(
        `Imported ${records.length} body scan ${records.length === 1 ? "row" : "rows"} from CSV.`,
      );
    };
    reader.readAsText(file);
  };

  const handleBodyScanArtifactUpload = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const accepted =
      file.type.startsWith("image/") ||
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!accepted) {
      setBodyScanArtifactMessage("Choose a body scan photo or PDF.");
      window.setTimeout(() => setBodyScanArtifactMessage(""), 3600);
      return;
    }

    setBodyScanArtifactMessage(
      `${file.name} is staged for future OCR/manual review. Use manual or CSV import for profile values today.`,
    );
    window.setTimeout(() => setBodyScanArtifactMessage(""), 5200);
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
    key:
      | "equipment"
      | "familiarityAreas"
      | "preferredDays"
      | "previousCoaching"
      | "recoveryPreferences"
      | "trainingStyles",
    value: string,
  ) => {
    setProfile((current) => ({
      ...current,
      [key]: toggleArrayValue(current[key], value),
    }));
  };

  const togglePreferenceSelection = (
    arrayKey:
      | "trainingLocations"
      | "preferredSplits"
      | "cardioPreferences"
      | "mobilityPreferences",
    legacyKey:
      | "trainingLocation"
      | "preferredSplit"
      | "cardioPreference"
      | "mobilityPreference",
    value: string,
  ) => {
    setProfile((current) => {
      const nextSelection = toggleArrayValue(current[arrayKey], value);

      return {
        ...current,
        [arrayKey]: nextSelection,
        [legacyKey]: firstPreferenceValue(nextSelection, ""),
      };
    });
  };

  const toggleEquipmentSelection = (value: string) => {
    setProfile((current) => {
      const currentEquipment = normalizeEquipmentSelection(
        current.availableEquipment,
        current.equipment,
      );
      const nextEquipment = toggleArrayValue(currentEquipment, value);

      return {
        ...current,
        availableEquipment: nextEquipment,
        equipment: nextEquipment,
      };
    });
  };

  const updateExerciseConfidence = (
    key: keyof ExerciseConfidence,
    value: string,
  ) => {
    setProfile((current) => ({
      ...current,
      exerciseConfidence: {
        ...normalizeExerciseConfidence(current.exerciseConfidence),
        [key]: value,
      },
    }));
  };

  const toggleAdaptivePlanningFactor = (value: string) => {
    setProfile((current) => ({
      ...current,
      adaptivePlanningFactors: toggleArrayValue(
        current.adaptivePlanningFactors || [],
        value,
      ),
      adaptivePlanningNotes: normalizeNotesRecord(current.adaptivePlanningNotes),
    }));
  };

  const updateAdaptivePlanningNote = (factor: string, note: string) => {
    setProfile((current) => ({
      ...current,
      adaptivePlanningNotes: {
        ...normalizeNotesRecord(current.adaptivePlanningNotes),
        [factor]: note,
      },
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
    const trainingLocations = normalizePreferenceSelection(
      profile.trainingLocations,
      profile.trainingLocation,
      defaultProfile.trainingLocations,
    );
    const preferredSplits = normalizePreferenceSelection(
      profile.preferredSplits,
      profile.preferredSplit,
      defaultProfile.preferredSplits,
    );
    const cardioPreferences = normalizePreferenceSelection(
      profile.cardioPreferences,
      profile.cardioPreference,
      defaultProfile.cardioPreferences,
    );
    const mobilityPreferences = normalizePreferenceSelection(
      profile.mobilityPreferences,
      profile.mobilityPreference,
      defaultProfile.mobilityPreferences,
    );
    const availableEquipment = normalizeEquipmentSelection(
      profile.availableEquipment,
      profile.equipment,
    );
    const adaptivePlanningFactors = Array.isArray(profile.adaptivePlanningFactors)
      ? profile.adaptivePlanningFactors
      : [];
    const adaptivePlanningNotes = normalizeNotesRecord(profile.adaptivePlanningNotes);
    const planDirections = normalizePlanDirections(
      profile.planDirections,
      profile.goalMode,
    );
    const familiarityAreas = Array.isArray(profile.familiarityAreas)
      ? cleanStringArray(profile.familiarityAreas)
      : [];
    const previousCoaching = Array.isArray(profile.previousCoaching)
      ? cleanStringArray(profile.previousCoaching)
      : [];
    const exerciseConfidence = normalizeExerciseConfidence(profile.exerciseConfidence);
    const age = calculateAgeFromBirthday(profile.birthday) || "";
    const updatedAt = new Date().toISOString();
    const bodyMetricHistory = normalizeBodyMetricHistory(
      profile.bodyMetricHistory,
    );
    const bodyScanImports = normalizeBodyScanImports(profile.bodyScanImports);
    const bodyMetricSnapshot = createBodyMetricHistoryPoint(profile, updatedAt);
    const nextBodyMetricHistory = bodyMetricSnapshot
      ? [...bodyMetricHistory, bodyMetricSnapshot].slice(-36)
      : bodyMetricHistory;
    const nextProfile = {
      ...stored,
      ...profile,
      adaptivePlanningFactors,
      adaptivePlanningNotes,
      age,
      availableEquipment,
      avatarUrl: profileImage,
      bodyMetricHistory: nextBodyMetricHistory,
      bodyScanImports,
      bodyModel: gender,
      cardioPreference: firstPreferenceValue(
        cardioPreferences,
        defaultProfile.cardioPreference,
      ),
      cardioPreferences,
      displayName,
      email,
      equipment: availableEquipment,
      exerciseConfidence,
      familiarityAreas,
      fullName: displayName,
      gender,
      mobilityPreference: firstPreferenceValue(
        mobilityPreferences,
        defaultProfile.mobilityPreference,
      ),
      mobilityPreferences,
      goalMode: planDirections[0] || defaultProfile.goalMode,
      planDirections,
      primaryGoal: planDirections.length
        ? `${planDirections.join(" + ")} Plan`
        : profile.primaryGoal,
      secondaryGoal: planDirections[1] || profile.secondaryGoal,
      preferredSplit: firstPreferenceValue(preferredSplits, defaultProfile.preferredSplit),
      preferredSplits,
      previousCoaching,
      profileImage,
      trainingLocation: firstPreferenceValue(
        trainingLocations,
        defaultProfile.trainingLocation,
      ),
      trainingLocations,
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
      setProfile(mergeProfile(JSON.parse(savedSnapshot) as Partial<SoundFitnessProfile>));
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

  const renderHeroStatusCommandCenter = () => {
    const detailReadinessChips = heroReadinessChips.filter(
      (chip) => chip.label !== "Recommendation",
    );
    const compactReadinessChips = detailReadinessChips.filter(
      (chip) => chip.label !== "Risk",
    );
    const compactFactors = planReadiness.risk.factors.slice(0, 4);
    const recommendedNext = planReadiness.missing.includes("Recovery Readiness")
      ? "Complete readiness check-in"
      : planReadiness.recommended.label;
    const painScore = getScaleValue(
      profile.bodyStatus.painLevel,
      profile.bodyStatus.painStatus,
    );
    const sorenessScore = getScaleValue(
      profile.bodyStatus.sorenessLevel,
      profile.bodyStatus.sorenessStatus,
    );
    const mobileSummaryPills = [
      {
        className: `border-cyan-200/24 bg-cyan-300/10 text-cyan-50 ${planReadinessTone.glow}`,
        label: "Plan",
        value: `${planReadiness.overall}% Ready`,
      },
      {
        className: `${planRiskTone.border} ${planRiskTone.softBg} ${planRiskTone.text} ${planRiskTone.glow}`,
        label: "Risk",
        value: `${planReadiness.risk.label} Risk`,
      },
      {
        className: "border-blue-300/24 bg-blue-400/10 text-blue-100",
        label: "Sleep",
        value:
          profile.bodyStatus.averageSleepHours ||
          profile.bodyStatus.hoursSlept ||
          profile.sleepGoal ||
          "Not set",
      },
      {
        className: "border-yellow-200/24 bg-yellow-300/10 text-yellow-100",
        label: "Energy",
        value: profile.bodyStatus.energyStatus,
      },
      {
        className: "border-red-200/24 bg-red-300/10 text-red-100",
        label: "Pain/Soreness",
        value: `${painScore}/10 / ${sorenessScore}/10`,
      },
    ];

    return (
      <aside className="relative overflow-visible p-0">
        <div className="flex items-center justify-between gap-3 xl:hidden">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/75">
              Readiness
            </p>
            <p className="mt-0.5 truncate text-xs font-black text-white">
              {planReadiness.readinessLabel}
            </p>
          </div>
          <button
            type="button"
            aria-expanded={heroReadinessDetailsOpen}
            onClick={() => setHeroReadinessDetailsOpen((current) => !current)}
            className="shrink-0 rounded-full border border-cyan-200/24 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100 transition hover:bg-cyan-300/16"
          >
            {heroReadinessDetailsOpen ? "Hide details" : "View readiness details"}
          </button>
        </div>

        <div className="-mx-2 mt-2 flex max-w-[calc(100%+1rem)] gap-1.5 overflow-x-auto overscroll-x-contain px-2 pb-2 xl:hidden [scrollbar-color:rgba(34,211,238,0.42)_rgba(15,23,42,0.70)] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/42 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/60">
          {mobileSummaryPills.map((pill) => (
            <span
              key={pill.label}
              className={`inline-flex min-h-[28px] max-w-[220px] flex-none items-center rounded-full border px-2 py-1 text-[9px] font-black leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${pill.className}`}
            >
              <span className="shrink-0 text-slate-300/75">{pill.label}</span>
              <span className="ml-1 truncate text-white">{pill.value}</span>
            </span>
          ))}
        </div>

        <div
          className={`grid xl:hidden transition-all duration-300 ease-out ${
            heroReadinessDetailsOpen
              ? "mt-2 grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="relative min-w-0 px-1 py-1">
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/75">
                  Plan Ready
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <p className={`shrink-0 text-lg font-black leading-none ${planReadinessTone.text}`}>
                    {planReadiness.overall}%
                  </p>
                  <p className="min-w-0 text-[10px] font-black leading-4 text-slate-300">
                    {planReadiness.overall >= 80 ? "Ready to plan" : "Building context"}
                  </p>
                </div>
              </div>

              <div className="relative min-w-0 px-1 py-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.12em] text-orange-100/75">
                    Risk
                  </p>
                  <p className={`text-sm font-black ${planRiskTone.text}`}>
                    {planReadiness.risk.label}
                    <span className="ml-1 text-[10px] text-slate-500">
                      {planReadiness.risk.score}%
                    </span>
                  </p>
                </div>
                <div className={`relative mt-2 h-2 rounded-full bg-[linear-gradient(90deg,#60a5fa_0%,#34d399_26%,#facc15_52%,#fb923c_74%,#dc2626_100%)] ${planRiskTone.glow}`}>
                  <span
                    className="absolute top-1/2 h-3 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.75)] transition-[left] duration-500"
                    style={{ left: `${riskGaugeScore}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="-mx-2 mt-2 flex max-w-[calc(100%+1rem)] gap-1.5 overflow-x-auto overscroll-x-contain px-2 pb-2 [scrollbar-color:rgba(34,211,238,0.42)_rgba(15,23,42,0.70)] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/42 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/60">
              {detailReadinessChips.map((chip) => (
                <span
                  key={chip.label}
                  className={`inline-flex min-h-[26px] max-w-[220px] flex-none items-center rounded-full border px-2 py-1 text-[9px] font-black leading-none ${chip.className}`}
                >
                  <span className="shrink-0 text-slate-300/75">{chip.label}</span>
                  <span className="ml-1 truncate text-white">{chip.value}</span>
                </span>
              ))}
            </div>

            <div className="mt-2 rounded-2xl border border-emerald-200/20 bg-emerald-300/8 px-3 py-2 text-xs font-semibold leading-5 text-emerald-50/85">
              <span className="font-black text-emerald-100">Recommendation:</span>{" "}
              {planReadiness.risk.recommendation}
              <span className="mt-0.5 block text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100/70">
                Next: {recommendedNext}
              </span>
            </div>

            {compactFactors.length ? (
              <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {compactFactors.map((factor) => (
                  <span
                    key={factor}
                    title={factor}
                    className={`inline-flex min-h-[22px] shrink-0 items-center rounded-full border ${planRiskTone.border} bg-slate-950/42 px-2 py-0.5 text-[8px] font-black leading-none ${planRiskTone.text}`}
                  >
                    {getCompactRiskFactorLabel(factor)}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="hidden xl:flex xl:items-center xl:justify-between xl:gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/80">
              Readiness Context
            </p>
            <p className="mt-1 text-sm font-black text-white">
              Compact status
            </p>
          </div>
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.11em] ${planReadinessTone.badge}`}>
            {planReadiness.readinessLabel}
          </span>
        </div>

        <div className="mt-3 hidden gap-2 xl:grid xl:grid-cols-2">
          <div className="relative min-w-0 px-1 py-1">
            <div className="flex items-center gap-3">
              <div
                className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full border border-cyan-100/20 bg-slate-950/78 shadow-[0_0_24px_rgba(34,211,238,0.18)]"
                style={{
                  background: `conic-gradient(rgba(34,211,238,0.95) 0deg, rgba(52,211,153,0.95) ${planReadiness.overall * 3.6}deg, rgba(15,23,42,0.9) 0deg)`,
                }}
              >
                <span className="absolute inset-1.5 rounded-full bg-slate-950" />
                <span className={`relative text-sm font-black ${planReadinessTone.text}`}>
                  {planReadiness.overall}%
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/75">
                  Plan Ready
                </p>
                <p className="mt-1 text-sm font-black leading-5 text-white">
                  {planReadiness.overall >= 80 ? "Profile ready" : "Building context"}
                </p>
                <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                  {planReadiness.completed.length}/{planReadiness.sections.length} complete
                </p>
              </div>
            </div>
          </div>

          <div className="relative min-w-0 px-1 py-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-orange-100/75">
                Risk
              </p>
              <p className={`text-sm font-black ${planRiskTone.text}`}>
                {planReadiness.risk.label}
                <span className="ml-1 text-[10px] text-slate-500">
                  {planReadiness.risk.score}%
                </span>
              </p>
            </div>
            <div className={`relative mt-2 h-3 rounded-full bg-[linear-gradient(90deg,#60a5fa_0%,#34d399_26%,#facc15_52%,#fb923c_74%,#dc2626_100%)] ${planRiskTone.glow}`}>
              <span
                className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)] transition-[left] duration-500"
                style={{ left: `${riskGaugeScore}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 hidden max-w-full flex-wrap gap-1.5 overflow-hidden xl:flex">
          {compactReadinessChips.map((chip) => (
            <div
              key={chip.label}
              className={`inline-flex min-h-[28px] w-fit max-w-[190px] flex-none items-center rounded-full border px-2.5 py-1 text-[9px] font-black leading-none ${chip.className}`}
            >
              <span className="shrink-0 text-slate-300/80">{chip.label}</span>
              <span className="ml-1 truncate text-white">{chip.value}</span>
            </div>
          ))}
        </div>

        <div className="relative mt-3 hidden overflow-hidden rounded-2xl border border-emerald-200/28 bg-[radial-gradient(circle_at_14%_0%,rgba(52,211,153,0.16),transparent_40%),rgba(15,23,42,0.62)] px-3 py-2.5 shadow-[0_0_24px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.08)] xl:block">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-emerald-300/70 via-cyan-300/60 to-transparent"
          />
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-100/80">
            Recommendation
          </p>
          <p className="mt-1 text-xs font-black leading-5 text-cyan-50">
            {planReadiness.risk.recommendation}
          </p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100/65">
            Next: {recommendedNext}
          </p>
        </div>

        {compactFactors.length ? (
          <div className="mt-2 hidden max-w-full flex-wrap gap-1.5 xl:flex">
            {compactFactors.map((factor) => (
              <span
                key={factor}
                title={factor}
                className={`inline-flex min-h-[20px] items-center rounded-full border ${planRiskTone.border} bg-slate-950/42 px-2 py-0.5 text-[8px] font-black leading-none ${planRiskTone.text}`}
              >
                {getCompactRiskFactorLabel(factor)}
              </span>
            ))}
            {planReadiness.risk.factors.length > compactFactors.length ? (
              <span className="inline-flex min-h-[20px] items-center rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[8px] font-black leading-none text-slate-400">
                +{planReadiness.risk.factors.length - compactFactors.length} more
              </span>
            ) : null}
          </div>
        ) : null}
      </aside>
    );
  };

  const renderHero = () => (
    <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.22),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(251,146,60,0.18),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.94))] p-4 shadow-[0_34px_120px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.14)] sm:p-5">
      <div className="pointer-events-none absolute right-[-10%] top-[-30%] h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="relative z-10 grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-center">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-200/80">
            Personal Command Center
          </p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex shrink-0 flex-col items-center gap-2.5">
              <div className="relative h-24 w-24 overflow-hidden rounded-full border border-cyan-100/24 bg-cyan-300/12 shadow-[0_0_44px_rgba(34,211,238,0.2)]">
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
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200/16 bg-slate-950/44 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                  <span aria-hidden="true" className="text-cyan-100/80">
                    ◷
                  </span>
                  <span>Member Since</span>
                  <span className="text-cyan-100">{memberSinceLabel}</span>
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
          <h1 className="mt-4 max-w-4xl text-3xl font-black tracking-tight text-white sm:text-4xl">
            {profile.primaryGoal || "Goal not set"}
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-300">
            Define the training identity that powers dashboard focus, workout generation, exercise recommendations, recovery thresholds, and nutrition direction.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
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
        <div className="min-w-0 xl:self-center">
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

  const renderGoalCompass = () => {
    const selectedDirections = normalizePlanDirections(
      profile.planDirections,
      profile.goalMode,
    );
    const primaryDirection = selectedDirections[0];
    const secondaryDirection = selectedDirections[1];
    const scrollbarTheme = getPlanDirectionScrollbarTheme(selectedDirections);
    const scrollbarStyle = {
      "--plan-scroll-from": scrollbarTheme.from,
      "--plan-scroll-glow": scrollbarTheme.glow,
      "--plan-scroll-to": scrollbarTheme.to,
      "--plan-scroll-via": scrollbarTheme.via,
    } as CSSProperties;
    const renderSummaryChip = (
      direction: GoalMode,
      priority: "Primary" | "Secondary",
    ) => {
      const goalStyle = goalVisualStyles[direction];

      return (
        <span
          key={priority}
          className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] ${
            priority === "Primary"
              ? goalStyle.signalActive
              : goalStyle.signalIdle
          }`}
        >
          {priority}: {getPlanDirectionLabel(direction)}
        </span>
      );
    };
    const renderInsightCard = (
      direction: GoalMode,
      priority: "Primary" | "Secondary",
    ) => {
      const goalStyle = goalVisualStyles[direction];

      return (
        <div
          key={priority}
          className="relative overflow-hidden rounded-[22px] border border-white/10 bg-slate-950/48 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r ${goalStyle.wash} opacity-80`}
          />
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${
                priority === "Primary"
                  ? goalStyle.signalActive
                  : goalStyle.signalIdle
              }`}
            >
              {priority}
            </span>
            <p className="text-sm font-black text-white">
              {getPlanDirectionLabel(direction)}
            </p>
          </div>
          <p className="mt-3 text-xs font-semibold leading-5 text-slate-300">
            {planDirectionInsights[direction]}
          </p>
        </div>
      );
    };

    return (
    <CollapsibleProfilePanel
      completion={tabCompletions.planDirection}
      expanded={profileSectionOpen.planDirection}
      onToggle={() => toggleProfileSection("planDirection")}
      summary={
        <div className="flex flex-wrap gap-2">
          {primaryDirection ? renderSummaryChip(primaryDirection, "Primary") : null}
          {secondaryDirection ? renderSummaryChip(secondaryDirection, "Secondary") : null}
          {!selectedDirections.length ? (
            <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
              No direction selected
            </span>
          ) : null}
        </div>
      }
      title="Plan Direction"
      subtitle="Choose the direction you want your training to prioritize."
    >
      {/* TODO: Primary plan direction should drive main programming. */}
      {/* TODO: Secondary plan direction should modify accessories, recovery, and cardio once robo-coach rules are ready. */}
      <p className="mb-3 rounded-2xl border border-cyan-200/16 bg-cyan-300/8 px-4 py-3 text-xs font-semibold leading-5 text-cyan-50">
        {planDirectionMessage ||
          "Choose up to 2 priorities. The first selected card is Primary; the second is Secondary."}
      </p>

      <div className="mb-4 rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100/80">
            Selected Direction Insights
          </p>
          <span className="rounded-full border border-white/10 bg-slate-950/48 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
            {selectedDirections.length}/2 selected
          </span>
        </div>
        {selectedDirections.length ? (
          <>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {primaryDirection ? renderInsightCard(primaryDirection, "Primary") : null}
              {secondaryDirection ? renderInsightCard(secondaryDirection, "Secondary") : null}
            </div>
            <div className="mt-3 rounded-2xl border border-emerald-200/14 bg-emerald-300/8 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/80">
                Combo Insight
              </p>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-200">
                {getPlanDirectionComboInsight(selectedDirections)}
              </p>
            </div>
          </>
        ) : (
          <p className="mt-3 rounded-2xl border border-dashed border-white/12 bg-slate-950/36 p-3 text-xs font-semibold leading-5 text-slate-400">
            Choose up to 2 plan directions to unlock personalized programming insights.
          </p>
        )}
      </div>

      <div className="mb-3 flex items-center justify-end gap-2">
        <button
          type="button"
          aria-label="Scroll Plan Direction left"
          onClick={() => scrollGoalCompass("left")}
          className="grid h-10 w-10 place-items-center rounded-2xl border border-cyan-200/18 bg-cyan-300/8 text-lg font-black text-cyan-100 transition hover:border-cyan-200/45 hover:bg-cyan-300/16 hover:shadow-[0_0_22px_rgba(34,211,238,0.14)]"
        >
          &lt;
        </button>
        <button
          type="button"
          aria-label="Scroll Plan Direction right"
          onClick={() => scrollGoalCompass("right")}
          className="grid h-10 w-10 place-items-center rounded-2xl border border-fuchsia-200/18 bg-fuchsia-300/8 text-lg font-black text-fuchsia-100 transition hover:border-fuchsia-200/45 hover:bg-fuchsia-300/16 hover:shadow-[0_0_22px_rgba(217,70,239,0.14)]"
        >
          &gt;
        </button>
      </div>

      <div
        ref={goalCompassSliderRef}
        onScroll={markGoalCompassScrolling}
        style={scrollbarStyle}
        className={`flex max-w-full snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-visible overscroll-x-contain scroll-smooth pb-5 pr-4 [scrollbar-color:var(--plan-scroll-via)_rgba(15,23,42,0.74)] [scrollbar-width:auto] [touch-action:pan-x] [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar]:transition-all [&::-webkit-scrollbar]:duration-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-[3px] [&::-webkit-scrollbar-thumb]:border-slate-950/80 [&::-webkit-scrollbar-thumb]:bg-[linear-gradient(90deg,var(--plan-scroll-from),var(--plan-scroll-via),var(--plan-scroll-to))] [&::-webkit-scrollbar-thumb]:shadow-[0_0_18px_var(--plan-scroll-glow)] [&::-webkit-scrollbar-thumb]:transition-all [&::-webkit-scrollbar-thumb]:duration-300 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:border [&::-webkit-scrollbar-track]:border-white/10 [&::-webkit-scrollbar-track]:bg-slate-950/72 [&::-webkit-scrollbar-track]:shadow-[inset_0_1px_8px_rgba(255,255,255,0.09),inset_0_-1px_8px_rgba(0,0,0,0.24)] hover:[&::-webkit-scrollbar]:h-4 hover:[&::-webkit-scrollbar-thumb]:shadow-[0_0_30px_var(--plan-scroll-glow)] ${
          goalCompassScrolling
            ? "[&::-webkit-scrollbar]:h-4 [&::-webkit-scrollbar-thumb]:shadow-[0_0_34px_var(--plan-scroll-glow)] [&::-webkit-scrollbar-thumb]:animate-pulse"
            : ""
        }`}
      >
          {goalCards
            .filter((goal) => goal.id !== "Maintain")
            .map((goal) => {
            const selectedIndex = selectedDirections.indexOf(goal.id);
            const isActive = selectedIndex >= 0;
            const isPrimary = selectedIndex === 0;
            const isSecondary = selectedIndex === 1;
            const displayLabel = goal.id === "Recovery" ? "Recovery" : goal.label;
            const goalStyle = goalVisualStyles[goal.id];
            const selectGoal = () => {
              togglePlanDirection(goal.id);
            };

            return (
              <div
                key={goal.id}
                ref={(node) => {
                  goalCompassCardRefs.current[goal.id] = node;
                }}
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
                className={`group/card relative z-0 flex min-h-[144px] w-[220px] shrink-0 snap-center cursor-pointer flex-col overflow-hidden rounded-[24px] border p-3.5 text-left transition duration-300 hover:z-[80] hover:-translate-y-1 focus:z-[80] focus:outline-none focus-visible:-translate-y-1 active:scale-[0.99] sm:w-[238px] ${
                  isPrimary
                    ? `${goalStyle.selectedCard} ring-2 ring-white/18 shadow-[0_0_52px_rgba(34,211,238,0.20)]`
                    : isSecondary
                      ? `${goalStyle.selectedCard} ring-1 ring-white/10 opacity-95`
                    : `border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.055),transparent_34%),rgba(15,23,42,0.58)] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] ${goalStyle.hoverCard}`
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r ${goalStyle.wash} opacity-90`}
                />
                <span
                  className={`pointer-events-none absolute inset-x-0 top-0 h-20 rounded-t-[24px] bg-gradient-to-br ${goalStyle.wash} transition ${
                    isActive
                      ? "opacity-100"
                      : "opacity-64 group-hover/card:opacity-100"
                  }`}
                />
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${goalStyle.wash} opacity-36 blur-2xl transition group-hover/card:opacity-70`}
                />
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`relative grid h-12 w-12 place-items-center rounded-2xl border text-xl transition duration-200 group-hover/card:scale-105 group-focus-visible/card:scale-105 ${
                      isActive
                        ? goalStyle.iconActive
                        : goalStyle.iconIdle
                    }`}
                  >
                    {goalStyle.icon}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${goalStyle.wash} opacity-0 blur-xl transition group-hover/card:opacity-45`}
                    />
                  </span>
                  <div className="relative z-[90] flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-xl border px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] ${
                        isActive
                          ? goalStyle.signalActive
                          : goalStyle.signalIdle
                      }`}
                    >
                      {goal.signal}
                    </span>
                    <span
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <FloatingInfoBubble label={`${displayLabel} plan direction`}>
                        <span className="block font-black text-cyan-100">
                          {goal.description}
                        </span>
                        <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.1em] text-orange-200/90">
                          {goal.effect}
                        </span>
                      </FloatingInfoBubble>
                    </span>
                  </div>
                </div>
                <div className="relative mt-auto pt-5">
                  <p className="text-base font-black leading-tight text-white">
                    {displayLabel}
                  </p>
                  <p
                    className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.11em] transition ${
                      isActive
                        ? goalStyle.statusActive
                        : goalStyle.statusIdle
                    }`}
                  >
                    {isPrimary ? "Primary" : isSecondary ? "Secondary" : "Select"}
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-x-4 bottom-0 h-px bg-gradient-to-r ${goalStyle.wash} opacity-70 transition group-hover/card:opacity-100`}
                />
              </div>
            );
          })}
      </div>
    </CollapsibleProfilePanel>
    );
  };
  /*
                  {isActive ? "✓ Active" : "Tap to select"}
  */
  const renderPreviousExperience = () => {
    const exerciseConfidence = normalizeExerciseConfidence(profile.exerciseConfidence);
    const experienceCompletion = calculateSectionCompletion([
      profile.experienceLevel,
      profile.consistencyHistory,
      profile.familiarityAreas,
      exerciseConfidence,
      profile.previousCoaching,
    ]);
    const confidenceItems: Array<{
      color: MetricColor;
      helper: string;
      key: keyof ExerciseConfidence;
      label: string;
    }> = [
      {
        color: "blue",
        helper: "How comfortable you feel loading, bracing, and progressing dumbbells or barbells.",
        key: "freeWeights",
        label: "Free Weights",
      },
      {
        color: "steel",
        helper: "How comfortable you feel setting up machines and adjusting range, seat, and load.",
        key: "machines",
        label: "Machines",
      },
      {
        color: "cyan",
        helper: "How comfortable you feel using treadmills, bikes, rowers, and similar cardio tools.",
        key: "cardioEquipment",
        label: "Cardio Equipment",
      },
      {
        color: "teal",
        helper: "How confident you feel with mobility drills, warmups, cooldowns, and recovery movement.",
        key: "mobilityWork",
        label: "Mobility Work",
      },
      {
        color: "purple",
        helper: "How ready you feel for technical lifts, explosive work, or higher-skill movement patterns.",
        key: "complexMovements",
        label: "Complex Movements",
      },
    ];
    const familiaritySummary = profile.familiarityAreas.length
      ? `${profile.familiarityAreas.slice(0, 2).join(" + ")}${
          profile.familiarityAreas.length > 2
            ? ` +${profile.familiarityAreas.length - 2}`
            : ""
        }`
      : "Familiarity not set";
    const coachingSummary = profile.previousCoaching.length
      ? `${profile.previousCoaching.slice(0, 1).join("")}${
          profile.previousCoaching.length > 1
            ? ` +${profile.previousCoaching.length - 1}`
            : ""
        }`
      : "Coaching not set";
    const previousExperienceSummaryItems = [
      profile.experienceLevel || "Experience not set",
      profile.consistencyHistory || "Consistency not set",
      familiaritySummary,
      coachingSummary,
    ];
    const previousExperienceSummary = (
      <div className="flex flex-wrap gap-2">
        {previousExperienceSummaryItems.map((item) => (
          <span
            key={item}
            className="rounded-full border border-fuchsia-200/18 bg-fuchsia-300/10 px-3 py-1.5 text-[11px] font-black text-fuchsia-50"
          >
            {item}
          </span>
        ))}
      </div>
    );

    return (
      <CollapsibleProfilePanel
        completion={experienceCompletion}
        expanded={profileSectionOpen.previousExperience}
        onToggle={() => toggleProfileSection("previousExperience")}
        summary={previousExperienceSummary}
        title="Previous Experience"
        subtitle="Your training background helps shape exercise selection, progression speed, volume, and coaching style."
      >
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <CompactSingleSelectRow
              helper="Sets the starting complexity and how quickly the plan should progress."
              onSelect={(value) => setProfileField("experienceLevel", value)}
              options={experienceLevelOptions}
              selected={profile.experienceLevel}
              title="Overall Experience Level"
            />
            <CompactSingleSelectRow
              helper="Consistency history helps the coach choose realistic ramp rates and recovery assumptions."
              onSelect={(value) => setProfileField("consistencyHistory", value)}
              options={consistencyHistoryOptions}
              selected={profile.consistencyHistory}
              title="Consistency History"
            />
          </div>

          <CompactMultiSelectGrid
            onToggle={(value) => toggleProfileArray("familiarityAreas", value)}
            options={familiarityAreaOptions}
            selected={profile.familiarityAreas}
            title="Familiarity Areas"
          />

          <div className="rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_12%_0%,rgba(59,130,246,0.12),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(168,85,247,0.10),transparent_30%),rgba(15,23,42,0.42)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-200">
                  Exercise Confidence
                </p>
                <InfoBubble label="Exercise Confidence">
                  Rate confidence from 0 to 10. This should guide coaching detail,
                  substitutions, and technical progression later.
                </InfoBubble>
              </div>
              <span className="rounded-full border border-white/10 bg-slate-950/70 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">
                0-10 sliders
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {confidenceItems.map((item) => (
                <MetricControl
                  key={item.key}
                  compact
                  color={item.color}
                  defaultValue={Number(defaultProfile.exerciseConfidence[item.key]) || 5}
                  helper={item.helper}
                  helperMode="tooltip"
                  label={item.label}
                  max={10}
                  min={0}
                  onChange={(value) => updateExerciseConfidence(item.key, value)}
                  showManualInput={false}
                  showRangeMarkers
                  step={1}
                  unit="/10"
                  value={exerciseConfidence[item.key]}
                />
              ))}
            </div>
          </div>

          <CompactMultiSelectGrid
            onToggle={(value) => toggleProfileArray("previousCoaching", value)}
            options={previousCoachingOptions}
            selected={profile.previousCoaching}
            title="Previous Coaching"
          />

          {/* TODO: Feed previous experience into future robo-coach logic: advanced users can unlock more complex programming, beginners get simpler substitutions, consistency affects recovery assumptions, and experience modifies progression speed. */}
          <div className="rounded-[20px] border border-emerald-200/16 bg-emerald-300/8 px-4 py-3 text-xs font-semibold leading-5 text-emerald-100/78">
            Coach note: this is context for future programming logic. It does not auto-change the plan yet.
          </div>
        </div>
      </CollapsibleProfilePanel>
    );
  };

  const renderGenderSelector = () => (
    <div className="relative z-0 flex self-start overflow-visible rounded-[22px] border border-white/10 bg-[radial-gradient(circle_at_14%_0%,rgba(34,211,238,0.10),transparent_34%),rgba(15,23,42,0.56)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition focus-within:z-50 hover:z-50">
      <div className="flex w-full flex-col gap-2">
        <div className="flex items-center gap-2">
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
                    "border-cyan-100/55 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.38),transparent_48%),rgba(34,211,238,0.16)] shadow-[0_0_34px_rgba(34,211,238,0.26),inset_0_1px_0_rgba(255,255,255,0.12)]",
                  iconActive:
                    "border-cyan-100/45 bg-cyan-300/18 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.34)]",
                  iconIdle:
                    "border-cyan-200/16 bg-cyan-300/8 text-cyan-200/78 group-hover:border-cyan-200/38 group-hover:text-cyan-100 group-hover:shadow-[0_0_18px_rgba(34,211,238,0.18)]",
                  idle: "border-transparent bg-transparent hover:border-cyan-200/34 hover:bg-cyan-300/10",
                  labelActive: "text-cyan-50",
                  labelIdle: "text-slate-400 group-hover:text-cyan-100",
                }
              : {
                  active:
                    "border-fuchsia-100/52 bg-[radial-gradient(circle_at_50%_0%,rgba(217,70,239,0.34),transparent_48%),rgba(168,85,247,0.16)] shadow-[0_0_34px_rgba(217,70,239,0.24),inset_0_1px_0_rgba(255,255,255,0.12)]",
                  iconActive:
                    "border-fuchsia-100/45 bg-fuchsia-300/18 text-fuchsia-50 shadow-[0_0_24px_rgba(217,70,239,0.30)]",
                  iconIdle:
                    "border-fuchsia-200/16 bg-fuchsia-300/8 text-fuchsia-200/78 group-hover:border-fuchsia-200/36 group-hover:text-fuchsia-100 group-hover:shadow-[0_0_18px_rgba(217,70,239,0.16)]",
                  idle: "border-transparent bg-transparent hover:border-fuchsia-200/32 hover:bg-fuchsia-300/10",
                  labelActive: "text-fuchsia-50",
                  labelIdle: "text-slate-400 group-hover:text-fuchsia-100",
                };
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => setGender(option.id)}
              className={`group flex min-h-[70px] flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition duration-200 hover:-translate-y-0.5 active:scale-[0.98] sm:min-w-[104px] ${
                active
                  ? accent.active
                  : `border-transparent bg-transparent ${accent.idle}`
              }`}
            >
              <span
                className={`grid h-11 w-11 place-items-center rounded-2xl border text-[2rem] font-black leading-none transition duration-200 sm:h-12 sm:w-12 sm:text-[2.15rem] ${
                  active ? accent.iconActive : accent.iconIdle
                }`}
              >
                {option.symbol}
              </span>
              <span className={active ? accent.labelActive : accent.labelIdle}>
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );

  /*
      {
        href: ROUTES.dashboard.goals,
        label: "Goals",
        status: "Planning",
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

  const renderOccupationActivityControls = () => (
    <div
      id="occupation-activity"
      className="grid items-start gap-3 lg:grid-cols-3"
      data-profile-section="occupation-activity"
    >
      <OccupationSelector
        helper="Occupation helps estimate daily fatigue, time constraints, and movement exposure."
        onChange={(value) => setProfileField("occupation", value)}
        value={profile.occupation}
      />
      <StatusSelector
        helper="Daily activity level helps balance mobility, cardio, and recovery recommendations."
        helperMode="tooltip"
        label="Daily Activity Level"
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
        showArrowControls
        showManualInput={false}
        showRangeMarkers
        step={1}
        unit="hrs"
        value={profile.hoursWorkedPerWeek}
      />
    </div>
  );

  const renderContactInfoControls = () => (
    <div
      id="contact-info"
      className="rounded-[24px] border border-white/10 bg-slate-950/42 p-4"
      data-profile-section="contact-info"
    >
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
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="relative z-0 overflow-visible rounded-[22px] border border-cyan-200/14 bg-slate-950/48 p-3 transition focus-within:z-[140] hover:z-[140] md:col-span-2 xl:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-300">
              Location
            </span>
            <InfoBubble label="Location">
              State and city stay optional and only provide broad schedule,
              weather, and travel-aware coaching context.
            </InfoBubble>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <InfoSearchableSelectField
              inline
              helper="State is optional and only used for broad weather, travel, and schedule-aware coaching context."
              label="State"
              onChange={(value) => setProfileField("state", value)}
              options={usStateOptions}
              placeholder="Select state"
              value={profile.state}
            />
            <InfoField
              inline
              helper={
                profile.state
                  ? `City stays optional and is scoped to ${profile.state} for broad planning context.`
                  : "City stays optional. Choose a state first if you want the app to keep location context broad."
              }
              label="City"
              onChange={(value) => setProfileField("city", value)}
              placeholder={profile.state ? "City name" : "Select state first"}
              value={profile.city}
            />
          </div>
        </div>
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
  );

  const renderVitalStatisticsControls = () => {
    const heightUnit =
      profile.appPersonalization.preferredUnitSystem === "kg" ? "cm" : "in";
    const calculatedAge = calculateAgeFromBirthday(profile.birthday);
    const currentYear = new Date().getFullYear();
    const birthdayYears = Array.from({ length: 121 }, (_, index) =>
      String(currentYear - index),
    );
    const birthdayDayCount = getDaysInBirthdayMonth(
      birthdayDraft.month,
      birthdayDraft.year,
    );
    const birthdayDays = Array.from({ length: birthdayDayCount }, (_, index) =>
      String(index + 1).padStart(2, "0"),
    );
    const birthdayDayOptions = birthdayDays.map((day) => ({
      label: String(Number.parseInt(day, 10)),
      value: day,
    }));
    const birthdayYearOptions = birthdayYears.map((year) => ({
      label: year,
      value: year,
    }));
    const updateBirthday = (birthday: string) => {
      const nextAge = calculateAgeFromBirthday(birthday);
      setProfile((current) => ({
        ...current,
        age: nextAge,
        birthday,
      }));
    };
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
      } else {
        setProfile((current) => ({
          ...current,
          age: "",
          birthday: "",
        }));
      }
    };
    const clearBirthday = () => {
      setBirthdayDraft({ day: "", month: "", year: "" });
      setProfile((current) => ({
        ...current,
        age: "",
        birthday: "",
      }));
    };

    return (
      <div
        id="vital-statistics"
        className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(220px,0.72fr)]"
        data-profile-section="vital-statistics"
      >
        {renderGenderSelector()}
        <div className="relative z-0 overflow-visible rounded-[24px] border border-blue-200/16 bg-[radial-gradient(circle_at_16%_0%,rgba(96,165,250,0.13),transparent_36%),rgba(15,23,42,0.58)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition focus-within:z-50 hover:z-50 hover:border-blue-200/26 hover:shadow-[0_0_28px_rgba(96,165,250,0.08),inset_0_1px_0_rgba(255,255,255,0.08)]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-5 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-blue-300/70 to-cyan-300/50"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-100">
                Birthday / Age
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

          <div className="mt-3 grid grid-cols-[1.05fr_0.8fr_1fr] gap-2">
            <PremiumBirthdaySelect
              ariaLabel="Birthday month"
              label="Month"
              onChange={(value) => updateBirthdayPart("month", value)}
              options={birthdayMonthOptions}
              placeholder="Month"
              value={birthdayDraft.month}
            />
            <PremiumBirthdaySelect
              ariaLabel="Birthday day"
              label="Day"
              onChange={(value) => updateBirthdayPart("day", value)}
              options={birthdayDayOptions}
              placeholder="Day"
              value={birthdayDraft.day}
            />
            <PremiumBirthdaySelect
              ariaLabel="Birthday year"
              label="Year"
              onChange={(value) => updateBirthdayPart("year", value)}
              options={birthdayYearOptions}
              placeholder="Year"
              value={birthdayDraft.year}
            />
          </div>

          <div className="mt-3 rounded-2xl border border-blue-200/14 bg-blue-300/8 p-3">
            {profile.birthday && calculatedAge ? (
              <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-100/75">
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
                <div className="rounded-2xl border border-cyan-200/18 bg-cyan-300/10 px-4 py-2 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/75">
                    Age
                  </p>
                  <p className="text-2xl font-black text-white">{calculatedAge}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Add birthday to calculate age.
              </p>
            )}
          </div>
        </div>
        <MetricControl
          compact
          color="steel"
          defaultValue={heightUnit === "cm" ? 173 : 68}
          helper="Height supports estimates and exercise setup context."
          helperMode="tooltip"
          label="Height"
          max={heightUnit === "cm" ? 220 : 86}
          min={heightUnit === "cm" ? 120 : 48}
          onChange={(value) => setProfileField("height", value)}
          showArrowControls
          showManualInput={false}
          showRangeMarkers
          showSteppers={false}
          unit={heightUnit}
          value={getHeightControlValue(profile.height, heightUnit)}
        />
      </div>
    );
  };

  const renderBodyMetrics = (options: { embedded?: boolean } = {}) => {
    const weightUnit =
      profile.appPersonalization.preferredUnitSystem === "kg" ? "kg" : "lb";
    const bodySummaryItems = [
      profile.currentWeight
        ? `${profile.currentWeight} ${weightUnit}`
        : "Weight not set",
      profile.waist ? `${profile.waist} in waist` : "Waist not set",
      profile.muscleMass
        ? `${profile.muscleMass} ${weightUnit} muscle`
        : "Muscle mass not set",
      profile.bodyFat ? `${profile.bodyFat}% body fat` : "Body fat not set",
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
    const bodyMetricOrbiterItems = [
      {
        color: "cyan" as const,
        defaultValue: weightUnit === "kg" ? 82 : 180,
        helper: "Current body weight for nutrition and plan context.",
        id: "currentWeight",
        label: "Current Weight",
        max: weightUnit === "kg" ? 220 : 480,
        min: weightUnit === "kg" ? 35 : 80,
        onChange: (value: string) => setProfileField("currentWeight", value),
        step: weightUnit === "kg" ? 0.5 : 1,
        tone: "border-cyan-200/20 bg-cyan-300/10 text-cyan-50",
        unit: weightUnit,
        value: profile.currentWeight,
      },
      {
        color: "amber" as const,
        defaultValue: 18.5,
        helper: "Body-composition context.",
        id: "bodyFat",
        label: "Body Fat %",
        max: 50,
        min: 5,
        onChange: (value: string) => setProfileField("bodyFat", value),
        step: 0.5,
        tone: "border-amber-200/20 bg-amber-300/10 text-amber-50",
        unit: "%",
        value: profile.bodyFat,
      },
      {
        color: "teal" as const,
        defaultValue: 34,
        helper: "Waist tracks direction over time.",
        id: "waist",
        label: "Waist",
        max: 70,
        min: 20,
        onChange: (value: string) => setProfileField("waist", value),
        step: 0.25,
        tone: "border-teal-200/20 bg-teal-300/10 text-teal-50",
        unit: "in",
        value: profile.waist,
      },
      {
        color: "violet" as const,
        defaultValue: weightUnit === "kg" ? 66 : 145,
        helper: "Lean muscle mass from manual entry or future body scan imports.",
        id: "muscleMass",
        label: "Muscle Mass",
        max: weightUnit === "kg" ? 140 : 310,
        min: weightUnit === "kg" ? 20 : 45,
        onChange: (value: string) => setProfileField("muscleMass", value),
        step: weightUnit === "kg" ? 0.5 : 1,
        tone: "border-violet-200/20 bg-violet-300/10 text-violet-50",
        unit: weightUnit,
        value: profile.muscleMass,
      },
    ];
    const bodyMetricOrbiterCount = bodyMetricOrbiterItems.length;
    const safeBodyMetricOrbiterIndex =
      ((activeBodyMetricOrbiterIndex % bodyMetricOrbiterCount) +
        bodyMetricOrbiterCount) %
      bodyMetricOrbiterCount;
    const activeBodyMetricItem =
      bodyMetricOrbiterItems[safeBodyMetricOrbiterIndex];
    const moveBodyMetricOrbiter = (direction: -1 | 1) => {
      setActiveBodyMetricOrbiterIndex(
        (current) =>
          ((current + direction) % bodyMetricOrbiterCount +
            bodyMetricOrbiterCount) %
          bodyMetricOrbiterCount,
      );
    };
    const shouldIgnoreBodyMetricOrbiterKeyTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      Boolean(
        target.closest(
          "button,a,input,select,textarea,label,[contenteditable='true']",
        ),
      );
    const handleBodyMetricOrbiterKeyDown = (
      event: ReactKeyboardEvent<HTMLElement>,
    ) => {
      if (shouldIgnoreBodyMetricOrbiterKeyTarget(event.target)) return;

      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        moveBodyMetricOrbiter(-1);
      }

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        moveBodyMetricOrbiter(1);
      }
    };
    const renderBodyMetricPreview = (index: number, side: "previous" | "next") => {
      const item = bodyMetricOrbiterItems[index];
      const valueLabel = `${formatProfileNumber(
        getNumberFromProfileValue(item.value, item.defaultValue),
        item.step,
      )} ${item.unit}`;

      return (
        <button
          type="button"
          aria-label={`Show ${item.label}`}
          onClick={() => setActiveBodyMetricOrbiterIndex(index)}
          className={`hidden min-h-[92px] rounded-[20px] border px-3 py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-0.5 hover:border-white/24 lg:block ${item.tone}`}
        >
          <p className="text-[9px] font-black uppercase tracking-[0.16em] opacity-65">
            {side}
          </p>
          <p className="mt-2 text-[11px] font-black uppercase tracking-[0.12em] text-white">
            {item.label}
          </p>
          <p className="mt-1.5 text-lg font-black text-white">{valueLabel}</p>
        </button>
      );
    };
    const renderBodyMetricOrbiter = () => {
      const previousIndex =
        (safeBodyMetricOrbiterIndex - 1 + bodyMetricOrbiterCount) %
        bodyMetricOrbiterCount;
      const nextIndex =
        (safeBodyMetricOrbiterIndex + 1) % bodyMetricOrbiterCount;

      return (
        <section
          aria-label="Body metric orbiter"
          className="rounded-[24px] border border-cyan-200/14 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.12),transparent_34%),rgba(15,23,42,0.46)] p-3 shadow-[0_0_32px_rgba(34,211,238,0.06),inset_0_1px_0_rgba(255,255,255,0.08)] outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/35"
          onKeyDown={handleBodyMetricOrbiterKeyDown}
          role="group"
          tabIndex={0}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
                Body Metric Orbiter
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                Weight, waist, muscle mass, and body fat.{" "}
                <span className="text-cyan-100/70">
                  Only share what you want used for coaching context.
                </span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                aria-label="Show previous body metric"
                onClick={() => moveBodyMetricOrbiter(-1)}
                className="grid h-9 w-9 place-items-center rounded-2xl border border-cyan-200/16 bg-slate-950/54 text-sm font-black text-cyan-100 transition hover:border-cyan-200/38 hover:bg-cyan-300/10"
              >
                &lt;
              </button>
              <button
                type="button"
                aria-label="Show next body metric"
                onClick={() => moveBodyMetricOrbiter(1)}
                className="grid h-9 w-9 place-items-center rounded-2xl border border-orange-200/16 bg-slate-950/54 text-sm font-black text-orange-100 transition hover:border-orange-200/38 hover:bg-orange-300/10"
              >
                &gt;
              </button>
            </div>
          </div>

          <div className="mt-2.5 grid items-center gap-3 lg:grid-cols-[minmax(112px,0.3fr)_minmax(0,1fr)_minmax(112px,0.3fr)]">
            {renderBodyMetricPreview(previousIndex, "previous")}
            <MetricControl
              compact
              dense
              color={activeBodyMetricItem.color}
              defaultValue={activeBodyMetricItem.defaultValue}
              helper={activeBodyMetricItem.helper}
              helperMode="tooltip"
              label={activeBodyMetricItem.label}
              max={activeBodyMetricItem.max}
              min={activeBodyMetricItem.min}
              onChange={activeBodyMetricItem.onChange}
              showArrowControls
              showManualInput={false}
              showRangeMarkers
              showSteppers={false}
              step={activeBodyMetricItem.step}
              unit={activeBodyMetricItem.unit}
              value={activeBodyMetricItem.value}
            />
            {renderBodyMetricPreview(nextIndex, "next")}
          </div>

          <div className="mt-2 flex justify-center gap-2">
            {bodyMetricOrbiterItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Show ${item.label}`}
                aria-pressed={index === safeBodyMetricOrbiterIndex}
                onClick={() => setActiveBodyMetricOrbiterIndex(index)}
                className={`h-2 rounded-full transition ${
                  index === safeBodyMetricOrbiterIndex
                    ? "w-8 bg-cyan-200 shadow-[0_0_14px_rgba(103,232,249,0.58)]"
                    : "w-2 bg-slate-500/55 hover:bg-orange-200/75"
                }`}
              />
            ))}
          </div>
        </section>
      );
    };
    const renderBodyMetricTrendChart = () => {
      const savedPoints = normalizeBodyMetricHistory(profile.bodyMetricHistory);
      const chartPoints = savedPoints.slice(-8);
      const series = [
        {
          color: "#67e8f9",
          getValue: (point: BodyMetricHistoryPoint) => point.weight,
          label: "Weight",
          unit: weightUnit,
        },
        {
          color: "#facc15",
          getValue: (point: BodyMetricHistoryPoint) => point.bodyFat,
          label: "Body Fat",
          unit: "%",
        },
        {
          color: "#5eead4",
          getValue: (point: BodyMetricHistoryPoint) => point.waist,
          label: "Waist",
          unit: "in",
        },
        {
          color: "#c4b5fd",
          getValue: (point: BodyMetricHistoryPoint) => point.muscleMass,
          label: "Muscle",
          unit: weightUnit,
        },
      ];
      const width = 420;
      const height = 164;
      const paddingX = 24;
      const paddingY = 20;
      const plotWidth = width - paddingX * 2;
      const plotHeight = height - paddingY * 2;
      const xForIndex = (index: number) =>
        paddingX +
        (chartPoints.length <= 1
          ? plotWidth
          : (index / (chartPoints.length - 1)) * plotWidth);
      const formatPointDate = (savedAt: string) => {
        const date = new Date(savedAt);
        if (Number.isNaN(date.getTime())) return "Saved";
        return date.toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
        });
      };

      const drawableSeries = series
        .map((item) => {
          const values = chartPoints.map((point) => {
            const parsed = Number.parseFloat(item.getValue(point));
            return Number.isFinite(parsed) ? parsed : null;
          });
          const numericValues = values.filter(
            (value): value is number => typeof value === "number",
          );
          if (!numericValues.length) return { ...item, points: "", values };

          const min = Math.min(...numericValues);
          const max = Math.max(...numericValues);
          const range = max - min || 1;
          const points = values
            .map((value, index) => {
              if (value === null) return "";
              const y =
                paddingY + plotHeight - ((value - min) / range) * plotHeight;
              return `${xForIndex(index)},${y}`;
            })
            .filter(Boolean)
            .join(" ");

          return { ...item, points, values };
        })
        .filter((item) => item.points);
      const latestPoint = chartPoints[chartPoints.length - 1];

      return (
        <section className="min-h-full rounded-[18px] border border-cyan-200/14 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.10),transparent_34%),rgba(15,23,42,0.48)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
                Body Trend Graph
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                Saves add a new plot point.
              </p>
            </div>
            <span className="rounded-full border border-cyan-200/18 bg-cyan-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100">
              {chartPoints.length} saved
            </span>
          </div>

          <div className="mt-2 rounded-2xl border border-white/10 bg-slate-950/46 p-2">
            {chartPoints.length ? (
              <svg
                aria-label="Body metric trend chart"
                className="h-[150px] w-full overflow-visible"
                role="img"
                viewBox={`0 0 ${width} ${height}`}
              >
                {[0, 1, 2, 3].map((line) => (
                  <line
                    key={line}
                    stroke="rgba(148,163,184,0.16)"
                    strokeWidth="1"
                    x1={paddingX}
                    x2={width - paddingX}
                    y1={paddingY + (plotHeight / 3) * line}
                    y2={paddingY + (plotHeight / 3) * line}
                  />
                ))}
                {drawableSeries.map((item) => (
                  <g key={item.label}>
                    <polyline
                      fill="none"
                      points={item.points}
                      stroke={item.color}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                    />
                    {item.values.map((value, index) => {
                      if (value === null) return null;
                      const coordinates = item.points.split(" ")[index];
                      if (!coordinates) return null;
                      const [cx, cy] = coordinates.split(",");
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          fill="#020617"
                          key={`${item.label}-${index}`}
                          r="3.5"
                          stroke={item.color}
                          strokeWidth="2"
                        />
                      );
                    })}
                  </g>
                ))}
              </svg>
            ) : (
              <div className="grid min-h-[150px] place-items-center rounded-xl border border-dashed border-white/10 text-center">
                <p className="px-6 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Save body metrics to start the graph.
                </p>
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {series.map((item) => {
              const latestValue = latestPoint ? item.getValue(latestPoint) : "";
              return (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/42 px-2 py-1 text-[9px] font-black text-slate-200"
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label}
                  {latestValue ? ` ${latestValue}${item.unit === "%" ? "%" : ` ${item.unit}`}` : ""}
                </span>
              );
            })}
            {latestPoint ? (
              <span className="rounded-full border border-cyan-200/12 bg-cyan-300/8 px-2 py-1 text-[9px] font-black text-cyan-100">
                {formatPointDate(latestPoint.savedAt)}
              </span>
            ) : null}
          </div>
        </section>
      );
    };
    const renderBodyScanImportPanel = () => {
      const bodyScanHistoryRows = normalizeBodyScanImports(
        profile.bodyScanImports,
      )
        .slice(-8)
        .reverse();
      const manualBodyScanHasValues = bodyScanMetricDataFields.some((field) =>
        readBodyScanValue(bodyScanManualDraft[field as keyof BodyScanManualDraft]),
      );
      const mappedColumnEntries = bodyScanCsvPreview
        ? Object.entries(bodyScanCsvPreview.mappedColumns).filter(
            ([, column]) => Boolean(column),
          )
        : [];
      const providerChips = bodyScanImportProviders.filter(
        (provider) => provider !== "Manual Entry" && provider !== "CSV Import",
      );

      return (
        <section className="mt-3 rounded-[24px] border border-cyan-100/16 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.14),transparent_34%),radial-gradient(circle_at_86%_8%,rgba(167,139,250,0.13),transparent_36%),rgba(15,23,42,0.56)] p-3 shadow-[0_0_38px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.10)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100">
                  Body Scan Import
                </p>
                <InfoBubble label="Body Scan Import">
                  Imports normalize scan data into weight, body fat, waist, muscle
                  mass, lean mass, visceral fat, metabolic age, and BMR fields.
                </InfoBubble>
              </div>
              <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-400">
                Manual, CSV, and staged photo/PDF scan intake.
              </p>
            </div>
            <span className="rounded-full border border-cyan-200/18 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
              {bodyScanHistoryRows.length} scans
            </span>
          </div>

          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {providerChips.map((provider) => (
              <span
                key={provider}
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-slate-300"
              >
                {provider}
              </span>
            ))}
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.08fr)_minmax(260px,0.92fr)]">
            <div className="rounded-[20px] border border-white/10 bg-slate-950/38 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white">
                  Manual Entry
                </p>
                <button
                  type="button"
                  disabled={!manualBodyScanHasValues}
                  onClick={handleManualBodyScanImport}
                  className="rounded-2xl border border-cyan-100/24 bg-cyan-300/14 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-50 transition hover:border-cyan-100/42 hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:border-white/8 disabled:bg-white/[0.035] disabled:text-slate-600"
                >
                  Import Manual Scan
                </button>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <SelectField
                  label="Provider"
                  onChange={(value) => updateBodyScanManualDraft("provider", value)}
                  options={bodyScanImportProviders}
                  value={bodyScanManualDraft.provider}
                />
                <Field
                  label="Scan Date"
                  onChange={(value) => updateBodyScanManualDraft("scanDate", value)}
                  type="date"
                  value={bodyScanManualDraft.scanDate}
                />
                <Field
                  label={`Weight (${weightUnit})`}
                  onChange={(value) => updateBodyScanManualDraft("weight", value)}
                  placeholder="180"
                  value={bodyScanManualDraft.weight}
                />
                <Field
                  label="Body Fat %"
                  onChange={(value) => updateBodyScanManualDraft("bodyFat", value)}
                  placeholder="18.5"
                  value={bodyScanManualDraft.bodyFat}
                />
                <Field
                  label="Waist"
                  onChange={(value) => updateBodyScanManualDraft("waist", value)}
                  placeholder="34"
                  value={bodyScanManualDraft.waist}
                />
                <Field
                  label="Muscle Mass"
                  onChange={(value) => updateBodyScanManualDraft("muscleMass", value)}
                  placeholder="145"
                  value={bodyScanManualDraft.muscleMass}
                />
                <Field
                  label="Lean Mass"
                  onChange={(value) => updateBodyScanManualDraft("leanMass", value)}
                  placeholder="150"
                  value={bodyScanManualDraft.leanMass}
                />
                <Field
                  label="Visceral Fat"
                  onChange={(value) => updateBodyScanManualDraft("visceralFat", value)}
                  placeholder="8"
                  value={bodyScanManualDraft.visceralFat}
                />
                <Field
                  label="Metabolic Age"
                  onChange={(value) => updateBodyScanManualDraft("metabolicAge", value)}
                  placeholder="31"
                  value={bodyScanManualDraft.metabolicAge}
                />
                <Field
                  label="BMR / RMR"
                  onChange={(value) =>
                    updateBodyScanManualDraft("basalMetabolicRate", value)
                  }
                  placeholder="1850"
                  value={bodyScanManualDraft.basalMetabolicRate}
                />
                <div className="sm:col-span-2">
                  <TextAreaField
                    label="Notes"
                    onChange={(value) => updateBodyScanManualDraft("notes", value)}
                    placeholder="Scan notes"
                    rows={3}
                    value={bodyScanManualDraft.notes}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-[20px] border border-cyan-200/12 bg-cyan-300/[0.055] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-cyan-50">
                    CSV Auto Map
                  </p>
                  <label className="cursor-pointer rounded-2xl border border-cyan-100/24 bg-slate-950/48 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:border-cyan-100/42 hover:bg-cyan-300/12">
                    Upload CSV
                    <input
                      accept=".csv,text/csv"
                      className="sr-only"
                      onChange={handleBodyScanCsvUpload}
                      type="file"
                    />
                  </label>
                </div>
                <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/42 p-3">
                  {bodyScanCsvPreview ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white">
                          {bodyScanCsvPreview.fileName}
                        </p>
                        <span className="rounded-full border border-emerald-200/18 bg-emerald-300/10 px-2.5 py-1 text-[9px] font-black text-emerald-100">
                          {bodyScanCsvPreview.importedCount} imported
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {mappedColumnEntries.length ? (
                          mappedColumnEntries.map(([field, column]) => (
                            <span
                              key={field}
                              className="rounded-full border border-cyan-200/12 bg-cyan-300/10 px-2 py-1 text-[9px] font-black text-cyan-100"
                            >
                              {bodyScanFieldLabels[field as BodyScanDataField] ||
                                field}{" "}
                              = {column}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500">
                            No matching columns yet.
                          </span>
                        )}
                      </div>
                      {bodyScanCsvPreview.unmappedHeaders.length ? (
                        <p className="mt-2 line-clamp-2 text-[10px] font-semibold leading-4 text-slate-500">
                          Unmapped:{" "}
                          {bodyScanCsvPreview.unmappedHeaders.slice(0, 6).join(", ")}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-[11px] font-semibold leading-5 text-slate-400">
                      Recognizes common scan columns from InBody, Fit3D, DEXA,
                      BodPod, Styku, Evolt, Tanita, Withings, Renpho, Garmin, and
                      similar exports.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-[20px] border border-violet-200/12 bg-violet-300/[0.055] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-violet-50">
                    Photo / PDF
                  </p>
                  <label className="cursor-pointer rounded-2xl border border-violet-100/24 bg-slate-950/48 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-violet-100 transition hover:border-violet-100/42 hover:bg-violet-300/12">
                    Stage File
                    <input
                      accept="image/*,.pdf,application/pdf"
                      className="sr-only"
                      onChange={handleBodyScanArtifactUpload}
                      type="file"
                    />
                  </label>
                </div>
                <p className="mt-3 rounded-2xl border border-white/10 bg-slate-950/42 p-3 text-[11px] font-semibold leading-5 text-slate-400">
                  {bodyScanArtifactMessage ||
                    "Photo and PDF scans are kept as an intake placeholder until OCR/review is connected."}
                </p>
              </div>
            </div>
          </div>

          {bodyScanImportMessage ? (
            <p className="mt-3 rounded-2xl border border-cyan-100/18 bg-cyan-300/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-cyan-50">
              {bodyScanImportMessage}
            </p>
          ) : null}

          <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(240px,0.56fr)]">
            <div className="rounded-[20px] border border-white/10 bg-slate-950/38 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white">
                  Scan History
                </p>
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                  Latest 8
                </span>
              </div>
              {bodyScanHistoryRows.length ? (
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full text-left text-[10px] font-bold text-slate-300">
                    <thead className="text-[9px] uppercase tracking-[0.12em] text-slate-500">
                      <tr>
                        <th className="py-2 pr-3">Date</th>
                        <th className="py-2 pr-3">Provider</th>
                        <th className="py-2 pr-3">Weight</th>
                        <th className="py-2 pr-3">Fat</th>
                        <th className="py-2 pr-3">Waist</th>
                        <th className="py-2 pr-3">Muscle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {bodyScanHistoryRows.map((scan) => (
                        <tr key={scan.id}>
                          <td className="py-2 pr-3 text-slate-400">
                            {formatSavedTime(scan.savedAt)}
                          </td>
                          <td className="py-2 pr-3 text-white">{scan.provider}</td>
                          <td className="py-2 pr-3">{scan.weight || "-"}</td>
                          <td className="py-2 pr-3">{scan.bodyFat || "-"}</td>
                          <td className="py-2 pr-3">{scan.waist || "-"}</td>
                          <td className="py-2 pr-3">{scan.muscleMass || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.025] px-3 py-4 text-center text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                  No body scan imports yet.
                </p>
              )}
            </div>

            <div className="rounded-[20px] border border-white/10 bg-slate-950/38 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white">
                Normalized Model
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {bodyScanDataFields.map((field) => (
                  <span
                    key={field}
                    className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-1 text-[9px] font-black text-slate-300"
                  >
                    {bodyScanFieldLabels[field]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      );
    };

    const bodyMetricsContent = (
      <>
        {/* TODO: Use these body and lifestyle inputs to tune workout recommendations, recovery prompts, nutrition targets, and equipment assumptions once shared recommendation logic is ready. */}
        <div className="relative z-0 overflow-visible rounded-[24px] border border-cyan-200/16 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.14),transparent_30%),rgba(15,23,42,0.62)] p-3 shadow-[0_0_44px_rgba(34,211,238,0.08)] md:p-3">
            <div className="grid gap-3 md:grid-cols-2">
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
                  Trend: {profile.bodyStatus.weightTrend}
                </p>
              </div>
              <div className="md:col-span-2">{renderBodyMetricOrbiter()}</div>
            </div>

            <div className="mt-3 grid items-stretch gap-3 xl:grid-cols-[minmax(230px,0.78fr)_minmax(0,1.22fr)]">
              <WeightTrendVerticalSelector
                onChange={(value) => updateBodyStatus("weightTrend", value)}
                value={profile.bodyStatus.weightTrend}
              />
              {renderBodyMetricTrendChart()}
            </div>

            {renderBodyScanImportPanel()}

          </div>

      </>
    );

    if (options.embedded) return bodyMetricsContent;

    return (
      <CollapsibleProfilePanel
        completion={tabCompletions.body}
        expanded={profileSectionOpen.myBody}
        onToggle={() => toggleProfileSection("myBody")}
        summary={bodySummary}
        title="My Body"
        subtitle="Variable body metrics that can change with training, nutrition, and body scans."
      >
        {bodyMetricsContent}
      </CollapsibleProfilePanel>
    );
  };

  const renderReadinessSection = () => {
    const readinessScore = getEstimatedReadinessScore(profile);
    const readinessLabel = getReadinessLabel(readinessScore);
    const sorenessSnapshot =
      profile.bodyStatus.sorenessStatus !== "None"
        ? profile.bodyStatus.sorenessStatus
        : `${getScaleValue(
            profile.bodyStatus.sorenessLevel,
            profile.bodyStatus.sorenessStatus,
          )}/10 soreness`;
    const painSnapshot =
      profile.bodyStatus.painStatus !== "None"
        ? profile.bodyStatus.painStatus
        : `${getScaleValue(
            profile.bodyStatus.painLevel,
            profile.bodyStatus.painStatus,
          )}/10 pain`;
    const readinessSummary = (
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Readiness Score",
            value: `${readinessScore}/100`,
            tone: "border-cyan-200/20 bg-cyan-300/10 text-cyan-50",
          },
          {
            label: "Recovery Status",
            value: readinessLabel,
            tone: "border-emerald-200/20 bg-emerald-300/10 text-emerald-50",
          },
          {
            label: "Fatigue / Stress",
            value: `${profile.bodyStatus.energyStatus} energy / ${profile.bodyStatus.stressStatus} stress`,
            tone: "border-orange-200/20 bg-orange-300/10 text-orange-50",
          },
          {
            label: "Pain / Soreness",
            value: `${painSnapshot} / ${sorenessSnapshot}`,
            tone: "border-rose-200/20 bg-rose-300/10 text-rose-50",
          },
        ].map((item) => (
          <div
            key={item.label}
            className={`min-w-0 rounded-2xl border px-3 py-2 ${item.tone}`}
          >
            <p className="text-[9px] font-black uppercase tracking-[0.12em] opacity-70">
              {item.label}
            </p>
            <p className="mt-1 truncate text-sm font-black">{item.value}</p>
          </div>
        ))}
        <div className="rounded-2xl border border-cyan-200/16 bg-white/[0.045] px-3 py-2 md:col-span-2 xl:col-span-4">
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/70">
            Next Training Recommendation
          </p>
          <p className="mt-1 text-sm font-semibold leading-5 text-slate-200">
            {planReadiness.risk.recommendation}
          </p>
        </div>
      </div>
    );

    return (
      <CollapsibleProfilePanel
        completion={tabCompletions.readiness}
        expanded={profileSectionOpen.readiness}
        onToggle={() => toggleProfileSection("readiness")}
        summary={readinessSummary}
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
          <AdaptivePlanningFactorsGrid
            notes={profile.adaptivePlanningNotes}
            onNoteChange={updateAdaptivePlanningNote}
            onToggle={toggleAdaptivePlanningFactor}
            options={adaptivePlanningFactorOptions}
            selected={profile.adaptivePlanningFactors}
          />
        </div>

      </CollapsibleProfilePanel>
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
            const slotColor: MetricColor =
              slot.id === "front" ? "cyan" : slot.id === "side" ? "purple" : "orange";
            const slotAccent = metricAccentStyles[slotColor];

            return (
              <div
                key={slot.id}
                className={`group relative w-[220px] shrink-0 overflow-hidden rounded-[24px] border p-3 transition ${slotAccent.shell}`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-x-5 top-0 h-px rounded-full bg-gradient-to-r ${slotAccent.active} opacity-70`}
                />
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
                      <ImagePlusIcon className={`h-5 w-5 ${slotAccent.value}`} />
                      Add photo
                    </span>
                  )}
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${slotAccent.active} opacity-0 transition duration-300 group-hover:opacity-15`}
                  />
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

                <label className={`mt-3 flex min-h-[40px] cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-slate-300 transition ${slotAccent.stepper}`}>
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
          onToggle={() => toggleProfileSection("measurements")}
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
                const measurementAccent = metricAccentStyles[definition.color];

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
                        ? `scale-[1.01] ${measurementAccent.thumbShadow}`
                        : "opacity-80 hover:opacity-100"
                      }`}
                  >
                    {photoSlot ? (
                      <div className={`relative mb-3 overflow-hidden rounded-[24px] border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${measurementAccent.shell}`}>
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none absolute inset-x-5 top-0 h-px rounded-full bg-gradient-to-r ${measurementAccent.active} opacity-70`}
                        />
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
                              <ImagePlusIcon className={`h-5 w-5 ${measurementAccent.value}`} />
                              Add photo
                            </span>
                          )}
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${measurementAccent.active} opacity-0 transition duration-300 group-hover/photo:opacity-15`}
                          />
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

                        <label className={`mt-2 flex min-h-[38px] cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-slate-300 transition ${measurementAccent.stepper}`}>
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
                      color={isPercent ? "orange" : isHeartRate ? "emerald" : definition.color}
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

  const renderPlanInputs = () => {
    const planBuilderCompletion = calculateSectionCompletion([
      profile.sessionsPerWeek,
      profile.preferredDays,
      profile.sessionLength,
      profile.bestTimeOfDay,
      profile.scheduleConsistency,
      profile.trainingLocations,
      profile.availableEquipment,
      profile.travelTrainingNotes,
    ]);
    const groupClass = profileOverviewSubsectionClass;
    const groupHeadingClass =
      "text-xs font-black uppercase tracking-[0.16em] text-cyan-100/80";
    const summarizeCompactList = (
      values: string[],
      fallback: string,
      countLabel: string,
    ) => {
      if (!values.length) return fallback;
      if (values.length <= 2) return values.join(" + ");
      return `${values.length} ${countLabel}`;
    };
    const planBuilderSummaryItems = [
      profile.sessionsPerWeek
        ? `${profile.sessionsPerWeek} days/week`
        : "Schedule not set",
      summarizeCompactList(profile.trainingLocations, "Locations not set", "locations"),
      summarizeCompactList(profile.availableEquipment, "Equipment not set", "tools"),
    ];
    const planBuilderSummary = (
      <div className="flex flex-wrap gap-2">
        {planBuilderSummaryItems.map((item) => (
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
        completion={planBuilderCompletion}
        expanded={profileSectionOpen.planBuilder}
        onToggle={() => toggleProfileSection("planBuilder")}
        summary={planBuilderSummary}
        title="Training Setup"
        subtitle="Schedule and environment details for smarter training plans."
      >
        <div className="space-y-5">
          <Link
            href={ROUTES.dashboard.goals}
            className="flex flex-col gap-3 rounded-[24px] border border-amber-200/18 bg-amber-300/8 p-4 transition hover:border-amber-200/38 hover:bg-amber-300/12 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-100">
                Goal editing moved
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-300">
                Primary goal, timeline, priority, and motivation now live on the dedicated Goals page.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-amber-200/24 bg-amber-300/12 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-amber-100">
              Open Goals Page
            </span>
          </Link>

          <section className={groupClass}>
            <div className="mb-4">
              <div>
                <p className={groupHeadingClass}>Training Schedule</p>
                <p className="mt-1 text-sm font-semibold text-slate-400">
                  When and how you realistically train.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricControl
                compact
                color="cyan"
                defaultValue={4}
                helper="Weekly frequency used by Builder, Plan, and Calendar defaults."
                helperMode="tooltip"
                label="Days Available"
                max={7}
                min={1}
                onChange={(value) => setProfileField("sessionsPerWeek", value)}
                showManualInput={false}
                unit="days"
                value={profile.sessionsPerWeek}
              />
              <MetricControl
                compact
                color="orange"
                defaultValue={45}
                helper="Session length shapes exercise count, warmups, and accessory volume."
                helperMode="tooltip"
                label="Session Length"
                max={120}
                min={15}
                onChange={(value) => setProfileField("sessionLength", `${value} minutes`)}
                showManualInput={false}
                step={5}
                unit="min"
                value={profile.sessionLength}
              />
              <InfoSelectField
                helper="Best time of day improves reminder timing and realistic session design."
                label="Best Time of Day"
                onChange={(value) => setProfileField("bestTimeOfDay", value)}
                options={[...availableTimeOptions, "Varies"]}
                value={profile.bestTimeOfDay}
              />
              <InfoSelectField
                helper="Consistency helps decide whether the plan should be fixed, flexible, or auto-adjusting."
                label="Schedule Consistency"
                onChange={(value) => setProfileField("scheduleConsistency", value)}
                options={[
                  "Very consistent",
                  "Mostly consistent",
                  "Changes week to week",
                  "Unpredictable",
                ]}
                value={profile.scheduleConsistency}
              />
            </div>
            <div className="mt-4">
              <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Preferred Training Days
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
          </section>

          <section className={groupClass}>
            <div className="mb-4">
              <p className={groupHeadingClass}>Training Environment</p>
              <p className="mt-1 text-sm font-semibold text-slate-400">
                Where and with what you train.
              </p>
            </div>
            <div className="grid gap-3">
              <CompactMultiSelectGrid
                onToggle={(value) =>
                  togglePreferenceSelection("trainingLocations", "trainingLocation", value)
                }
                options={compactTrainingLocationOptions}
                selected={profile.trainingLocations}
                title="Training Locations"
                variant="bold"
              />
              <CompactMultiSelectGrid
                onToggle={toggleEquipmentSelection}
                options={compactEquipmentOptions}
                selected={profile.availableEquipment}
                title="Available Equipment"
                variant="bold"
              />
            </div>
            <div className="mt-3">
              <TextAreaField
                label="Travel / Home / Gym Notes"
                onChange={(value) => setProfileField("travelTrainingNotes", value)}
                placeholder="Busy gym, hotel weeks, limited space, outdoor access..."
                rows={3}
                value={profile.travelTrainingNotes}
              />
            </div>
          </section>

        </div>
      </CollapsibleProfilePanel>
    );
  };

  const renderTrainingStyle = () => {
    const trainingStyleVisuals: Record<
      string,
      { accent: string; icon: SelectorIconName; label: string; tone: CompactOptionTone }
    > = {
      Athletic: {
        accent: "from-orange-300/34 via-red-500/16 to-slate-950",
        icon: "trophy",
        label: "Athletic",
        tone: "orange",
      },
      "Beginner Friendly": {
        accent: "from-cyan-300/32 via-blue-500/15 to-slate-950",
        icon: "sparkles",
        label: "Beginner",
        tone: "cyan",
      },
      Calisthenics: {
        accent: "from-emerald-300/32 via-cyan-500/15 to-slate-950",
        icon: "user",
        label: "Bodyweight",
        tone: "bodyweight",
      },
      Conditioning: {
        accent: "from-red-300/32 via-orange-500/16 to-slate-950",
        icon: "heart-pulse",
        label: "Condition",
        tone: "redOrange",
      },
      "Heavy Strength": {
        accent: "from-blue-300/34 via-cyan-500/16 to-slate-950",
        icon: "dumbbell",
        label: "Strength",
        tone: "electric",
      },
      "Low Impact": {
        accent: "from-teal-300/30 via-cyan-500/14 to-slate-950",
        icon: "heart-handshake",
        label: "Low Impact",
        tone: "tealViolet",
      },
      "Mobility First": {
        accent: "from-emerald-300/32 via-teal-500/15 to-slate-950",
        icon: "stretch",
        label: "Mobility",
        tone: "green",
      },
      "Muscle Building": {
        accent: "from-red-300/32 via-orange-500/16 to-slate-950",
        icon: "activity",
        label: "Muscle",
        tone: "redOrange",
      },
    };

    return (
      <Panel
        eyebrow="Training Style"
        title="How this member likes to train"
        subtitle="Style choices should influence exercise defaults, plan tone, intensity, and substitutions."
      >
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
          {trainingStyleOptions.map((style) => {
            const active = profile.trainingStyles.includes(style.id);
            const visual = trainingStyleVisuals[style.id] || {
              accent: "from-cyan-300/28 via-blue-500/14 to-slate-950",
              icon: "activity" as SelectorIconName,
              label: style.id,
              tone: "cyan" as CompactOptionTone,
            };

            return (
              <CompactSelectableCard
                key={style.id}
                accent={visual.accent}
                icon={<SelectorIcon name={visual.icon} />}
                label={visual.label}
                onClick={() => toggleProfileArray("trainingStyles", style.id)}
                selected={active}
                title={style.description}
                tone={visual.tone}
              />
            );
          })}
        </div>
      </Panel>
    );
  };

  const renderRecoveryProfile = () => {
    const painScaleValue = getScaleValue(
      profile.bodyStatus.painLevel,
      profile.bodyStatus.painStatus,
    );
    const sorenessScaleValue = getScaleValue(
      profile.bodyStatus.sorenessLevel,
      profile.bodyStatus.sorenessStatus,
    );

    return (
    <Panel
      eyebrow="Injury / Recovery Profile"
      title="Limitations, pain signals, and recovery preferences"
      subtitle="This should shape Exercise Library recommendations, recovery warnings, and Builder substitutions."
    >
      <section className={profileOverviewSubsectionClass}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100/80">
              Recovery Context
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-400">
              Readiness inputs, pain signals, and recovery notes.
            </p>
          </div>
          <span className="rounded-full border border-orange-200/20 bg-orange-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-orange-100">
            {planReadiness.readinessLabel}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricControl
            compact
            color="violet"
            defaultValue={7.5}
            helper="Average sleep helps set recovery expectations for the week."
            helperMode="tooltip"
            label="Sleep Average"
            max={12}
            min={3}
            onChange={updateAverageSleep}
            showManualInput={false}
            showRangeMarkers
            step={0.25}
            unit="hrs"
            value={
              profile.bodyStatus.averageSleepHours ||
              profile.bodyStatus.hoursSlept ||
              String(getSleepGoalHours(profile.sleepGoal))
            }
          />
          <StatusSelector
            helper="Sleep quality helps interpret the recovery signal."
            helperMode="tooltip"
            label="Sleep Quality"
            onChange={(value) => updateBodyStatus("sleepQuality", value)}
            options={sleepQualityOptions}
            value={profile.bodyStatus.sleepQuality}
          />
          <StatusSelector
            helper="Stress changes readiness and recovery recommendations."
            helperMode="tooltip"
            label="Stress Level"
            onChange={updateStressStatus}
            options={stressStatusOptions}
            value={profile.bodyStatus.stressStatus}
          />
          <StatusSelector
            helper="Energy helps tune daily intensity expectations."
            helperMode="tooltip"
            label="Energy Level"
            onChange={updateEnergyStatus}
            options={energyStatusOptions}
            value={profile.bodyStatus.energyStatus}
          />
          <MetricControl
            compact
            color="emerald"
            defaultValue={62}
            helper="Resting heart rate gives future recovery checks more context."
            helperMode="tooltip"
            label="Resting Heart Rate"
            max={120}
            min={35}
            onChange={(value) => setProfileField("restingHeartRate", value)}
            showManualInput={false}
            showRangeMarkers
            unit="bpm"
            value={profile.restingHeartRate}
          />
          <StatusSelector
            helper="Mobility status helps flag range restrictions or improving tolerance."
            helperMode="tooltip"
            label="Mobility Status"
            onChange={(value) => updateBodyStatus("mobilityStatus", value)}
            options={mobilityStatusOptions}
            value={profile.bodyStatus.mobilityStatus}
          />
          <AnimatedProfileSlider
            color={sorenessScaleValue >= 6 ? "rose" : "cyan"}
            helper="Soreness helps decide whether to train, reduce load, or switch focus."
            label="Soreness"
            max={10}
            min={0}
            onChange={updateSorenessLevel}
            value={sorenessScaleValue}
          />
          <AnimatedProfileSlider
            color={painScaleValue >= 6 ? "rose" : "orange"}
            helper="Higher pain should bias the plan toward substitutions and recovery."
            label="Pain / Discomfort"
            max={10}
            min={0}
            onChange={updatePainLevel}
            value={painScaleValue}
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

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Field
            label="Pain Area"
            onChange={(value) => updateBodyStatus("painArea", value)}
            placeholder="Knee, shoulder, low back..."
            value={profile.bodyStatus.painArea}
          />
          <TextAreaField
            label="Pain / Discomfort Notes"
            onChange={(value) => updateBodyStatus("painNote", value)}
            placeholder="What changes it?"
            rows={4}
            value={profile.bodyStatus.painNote}
          />
          <TextAreaField
            label="Mobility Notes"
            onChange={(value) => updateBodyStatus("mobilityNotes", value)}
            placeholder="Restricted areas, improving ranges, warm-up needs..."
            rows={4}
            value={profile.bodyStatus.mobilityNotes}
          />
        </div>

        <div className="mt-4 rounded-[22px] border border-orange-200/18 bg-orange-300/8 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-100/80">
            Recovery Recommendation
          </p>
          <p className="mt-2 text-sm font-black leading-6 text-white">
            Readiness {planReadiness.readinessScore} / Risk {planReadiness.risk.score}%
          </p>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-300">
            {planReadiness.risk.recommendation}
          </p>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
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
  };

  const renderSpecialCircumstances = () => {
    const selectedCircumstances = profile.specialCircumstances;
    const visibleSummaryCircumstances = selectedCircumstances.slice(0, 4);
    const specialCircumstancesSummary = (
      <div className="flex flex-wrap gap-2">
        {visibleSummaryCircumstances.length ? (
          <>
            {visibleSummaryCircumstances.map((circumstance) => (
              <span
                key={circumstance.id}
                className="rounded-full border border-orange-200/22 bg-orange-300/10 px-3 py-1.5 text-[11px] font-black text-orange-100"
              >
                {circumstance.label}
              </span>
            ))}
            {selectedCircumstances.length > visibleSummaryCircumstances.length ? (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-black text-slate-300">
                +{selectedCircumstances.length - visibleSummaryCircumstances.length} more
              </span>
            ) : null}
          </>
        ) : (
          <span className="rounded-full border border-slate-200/14 bg-white/[0.04] px-3 py-1.5 text-[11px] font-black text-slate-300">
            None Apply
          </span>
        )}
      </div>
    );
    const specialCircumstancesScrollControls = (
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
    );

    return (
    <CollapsibleProfilePanel
      completion={tabCompletions.circumstances}
      expanded={profileSectionOpen.specialCircumstances}
      headerAction={
        profileSectionOpen.specialCircumstances
          ? specialCircumstancesScrollControls
          : null
      }
      onToggle={() => toggleProfileSection("specialCircumstances")}
      summary={specialCircumstancesSummary}
      title={`Special Circumstances - ${selectedCircumstances.length} Selected`}
      subtitle="This helps personalize training recommendations. It is not medical diagnosis or treatment."
    >
      {/* TODO: Let these flags modify future recommendation rules: pregnancy-aware plans, injury substitutions, soreness/recovery bias, sleep/stress readiness, and travel equipment defaults. */}
      <div className="max-w-full overflow-hidden rounded-[30px] pb-1">
        <div
          ref={specialCircumstancesSliderRef}
          onScroll={updateActiveSpecialCircumstanceFromScroll}
          className="flex max-w-full snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth px-1 pb-5 pt-1 [scrollbar-color:rgba(251,146,60,0.58)_rgba(15,23,42,0.78)] [scrollbar-width:thin] [touch-action:pan-x] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-orange-300/55 [&::-webkit-scrollbar-thumb]:shadow-[0_0_14px_rgba(251,146,60,0.35)] [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/70"
        >
        <button
          ref={(node) => {
            specialCircumstanceCardRefs.current[0] = node;
          }}
          type="button"
          aria-pressed={selectedCircumstances.length === 0}
          onClick={() => {
            setActiveSpecialCircumstanceIndex(0);
            setProfile((current) => ({
              ...current,
              specialCircumstances: [],
            }));
          }}
          className={`group relative flex min-h-[220px] w-[min(68vw,250px)] max-w-[calc(100vw-3rem)] flex-none snap-center flex-col overflow-hidden rounded-[28px] border p-4 text-left transition duration-200 hover:-translate-y-1 sm:w-[260px] ${
            selectedCircumstances.length === 0
              ? "border-slate-100/32 bg-white/[0.075] text-white shadow-[0_0_24px_rgba(148,163,184,0.12)]"
              : activeSpecialCircumstanceIndex === 0
                ? "border-slate-200/22 bg-white/[0.055] text-slate-100"
                : "border-white/10 bg-slate-950/44 text-slate-300 hover:border-slate-200/24 hover:bg-white/[0.055]"
          }`}
        >
          <span className="absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-slate-200/18 via-slate-400/8 to-transparent opacity-80 transition group-hover:opacity-100" />
          <span className="absolute -right-8 -top-8 h-24 w-24 rounded-full border border-white/10 bg-white/[0.025]" />
          <div className="relative flex items-start justify-between gap-3">
            <span
              className={`grid h-12 w-12 place-items-center rounded-[20px] border text-[10px] font-black uppercase tracking-[0.12em] shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] transition group-hover:scale-105 ${
                selectedCircumstances.length === 0
                  ? "border-slate-100/32 bg-white/[0.10] text-slate-50 shadow-[0_0_18px_rgba(148,163,184,0.12)]"
                  : "border-white/10 bg-slate-950/54 text-slate-400"
              }`}
              aria-hidden="true"
            >
              NONE
            </span>
            <span
              className={`rounded-full border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] ${
                selectedCircumstances.length === 0
                  ? "border-slate-100/30 bg-white/[0.12] text-slate-100"
                  : "border-white/10 bg-white/[0.045] text-slate-500"
              }`}
            >
              {selectedCircumstances.length === 0 ? "Active" : "Select"}
            </span>
          </div>
          <p className="relative mt-4 text-base font-black leading-tight text-white">
            None Apply
          </p>
          <p className="relative mt-2 text-xs font-semibold leading-5 text-slate-400">
            No listed special circumstances currently apply.
          </p>
          <div
            className={`relative mt-auto rounded-2xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition ${
              selectedCircumstances.length === 0
                ? "border-slate-100/24 bg-white/[0.08] text-slate-100"
                : "border-white/10 bg-white/[0.035] text-slate-500 group-hover:text-slate-200"
            }`}
          >
            Clears selected context
          </div>
        </button>
        {specialCircumstanceOptions.map((circumstance, index) => {
          const cardIndex = index + 1;
          const selectedItem = profile.specialCircumstances.find(
            (item) => item.id === circumstance.id,
          );
          const selected = Boolean(selectedItem);
          const centered = activeSpecialCircumstanceIndex === cardIndex;

          return (
            <button
              key={circumstance.id}
              ref={(node) => {
                specialCircumstanceCardRefs.current[cardIndex] = node;
              }}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setActiveSpecialCircumstanceIndex(cardIndex);
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
            None Apply is selected. Add a circumstance above if life, health,
            sport, travel, or recovery context should modify coaching recommendations.
          </div>
        )}
      </div>
    </CollapsibleProfilePanel>
    );
  };

  const renderNutrition = () => {
    return (
      <Panel
        eyebrow="Nutrition Direction"
        title="Nutrition inputs for future planning"
        subtitle="This is not the full Nutrition page. It collects the direction the Nutrition page should adapt around later."
      >
        <div className="space-y-5">
          <section className={profileOverviewSubsectionClass}>
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100/80">
                Nutrition Context
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-400">
                Fuel constraints, hydration, meal rhythm, and dietary limits.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <InfoSelectField
                helper="Protein consistency helps estimate training support and meal planning needs."
                label="Protein Consistency"
                onChange={(value) => setProfileField("proteinConsistency", value)}
                options={["Low", "Moderate", "High", "Very High"]}
                value={profile.proteinConsistency}
              />
              <Field
                label="Calorie Goal if Known"
                onChange={(value) => setProfileField("calorieGoalKnown", value)}
                placeholder="Example: 2400/day"
                value={profile.calorieGoalKnown}
              />
              <InfoSelectField
                helper="Meal prep style helps match plan complexity to real life."
                label="Meal Prep Preference"
                onChange={(value) => updateNutrition("mealPrepPreference", value)}
                options={["Flexible", "Meal prep", "Cook daily", "Grab-and-go", "Minimal cooking"]}
                value={profile.nutritionDirection.mealPrepPreference}
              />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Field
                label="Eating Schedule"
                onChange={(value) => updateNutrition("eatingSchedule", value)}
                placeholder="3 meals, late dinner, fasting window..."
                value={profile.nutritionDirection.eatingSchedule}
              />
              <TextAreaField
                label="Dietary Constraints"
                onChange={(value) => updateNutrition("foodRestrictions", value)}
                placeholder="Allergies, dislikes, budget constraints, eating schedule, cultural preferences..."
                rows={4}
                value={profile.nutritionDirection.foodRestrictions}
              />
            </div>
          </section>

          <section className={profileOverviewSubsectionClass}>
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100/80">
                Nutrition Habits
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-400">
                Goal direction, tracking style, and repeatable food preferences.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SelectField
                label="Nutrition Goal"
                onChange={(value) => updateNutrition("nutritionGoal", value)}
                options={["Build Muscle", "Lose Fat", "Maintain", "Performance", "General Health"]}
                value={profile.nutritionDirection.nutritionGoal}
              />
              <SelectField
                label="Protein Target Mode"
                onChange={(value) =>
                  updateNutrition("proteinTargetMode", value as NutritionDirection["proteinTargetMode"])
                }
                options={["Auto estimate", "Manual"]}
                value={profile.nutritionDirection.proteinTargetMode}
              />
              <Field
                label="Protein Target"
                onChange={(value) => updateNutrition("proteinTarget", value)}
                placeholder="Auto or grams/day"
                value={profile.nutritionDirection.proteinTarget}
              />
              <SelectField
                label="Fueling Preference"
                onChange={(value) => updateNutrition("calorieStyle", value)}
                options={["Track calories", "Hand portions", "Habit based", "No tracking"]}
                value={profile.nutritionDirection.calorieStyle}
              />
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
          </section>
        </div>
      </Panel>
    );
  };

  const renderLifestyle = () => (
    <Panel
      eyebrow="Lifestyle Constraints"
      title="Real-world recovery and readiness constraints"
      subtitle="Lifestyle context helps explain fatigue, availability, sleep rhythm, and plan friction."
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

      <div className="mt-5 max-w-xl">
        <AnimatedProfileSlider
          color="cyan"
          helper="Higher availability allows longer warmups, accessories, and mobility blocks."
          label="Time Availability"
          max={10}
          min={1}
          onChange={(value) => setProfileField("timeAvailability", value)}
          value={profile.timeAvailability}
        />
      </div>
    </Panel>
  );

  const renderBenchmarks = () => {
    const trackedBenchmarks = profile.benchmarks.filter((benchmark) =>
      [benchmark.current, benchmark.goal, benchmark.dateTested].some(
        isProfileFieldComplete,
      ),
    );
    const getBenchmarkTime = (benchmark: Benchmark) => {
      if (!benchmark.dateTested) return 0;
      const date = new Date(`${benchmark.dateTested}T00:00:00`);
      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    };
    const latestBenchmark =
      [...trackedBenchmarks].sort((a, b) => getBenchmarkTime(b) - getBenchmarkTime(a))[0] ||
      trackedBenchmarks[0] ||
      null;
    const formatBenchmarkDate = (value: string) => {
      if (!value) return "No date yet";
      const date = new Date(`${value}T00:00:00`);
      if (Number.isNaN(date.getTime())) return "No date yet";
      return date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    };
    const strengthBenchmarkIds = new Set([
      "bench-press",
      "squat",
      "deadlift",
      "overhead-press",
      "pull-ups",
      "push-ups",
    ]);
    const strengthTracked = trackedBenchmarks.filter((benchmark) =>
      strengthBenchmarkIds.has(benchmark.id),
    ).length;
    const mobilityPerformanceTracked = trackedBenchmarks.filter((benchmark) =>
      /mobility|conditioning|running|mile|performance/i.test(
        `${benchmark.label} ${benchmark.linkedPattern}`,
      ),
    ).length;
    const benchmarkSummary = (
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Latest Benchmark",
            value: latestBenchmark
              ? `${latestBenchmark.label}${latestBenchmark.current ? ` • ${latestBenchmark.current}` : ""}`
              : "No benchmark entered",
            tone: "border-cyan-200/20 bg-cyan-300/10 text-cyan-50",
          },
          {
            label: "Strength Trend",
            value: strengthTracked
              ? `${strengthTracked}/${strengthBenchmarkIds.size} anchors logged`
              : "Baseline building",
            tone: "border-orange-200/20 bg-orange-300/10 text-orange-50",
          },
          {
            label: "Mobility / Performance",
            value: mobilityPerformanceTracked
              ? `${mobilityPerformanceTracked} anchors active`
              : "No trend yet",
            tone: "border-violet-200/20 bg-violet-300/10 text-violet-50",
          },
          {
            label: "Last Updated",
            value: latestBenchmark
              ? formatBenchmarkDate(latestBenchmark.dateTested)
              : "No date yet",
            tone: "border-emerald-200/20 bg-emerald-300/10 text-emerald-50",
          },
        ].map((item) => (
          <div
            key={item.label}
            className={`min-w-0 rounded-2xl border px-3 py-2 ${item.tone}`}
          >
            <p className="text-[9px] font-black uppercase tracking-[0.12em] opacity-70">
              {item.label}
            </p>
            <p className="mt-1 truncate text-sm font-black">{item.value}</p>
          </div>
        ))}
      </div>
    );

    return (
      <CollapsibleProfilePanel
        completion={tabCompletions.benchmarks}
        expanded={profileSectionOpen.benchmarks}
        onToggle={() => toggleProfileSection("benchmarks")}
        summary={benchmarkSummary}
        title="Benchmarks"
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
      </CollapsibleProfilePanel>
    );
  };

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

  const renderNotes = ({
    includeCoachingPreferences = false,
  }: {
    includeCoachingPreferences?: boolean;
  } = {}) => {
    const summarizeList = (values: string[], fallback: string) => {
      if (!values.length) return fallback;
      if (values.length <= 2) return values.join(" + ");
      return `${values.slice(0, 2).join(" + ")} +${values.length - 2}`;
    };
    const notesCompletionFields = [
      profile.sessionsPerWeek,
      profile.trainingLocations,
      profile.availableEquipment,
      profile.userNotes,
      profile.coachNotes,
    ];
    const coachingCompletionFields = [
      profile.trainingIntensity,
      profile.appPersonalization.coachingTone,
      profile.exerciseVarietyPreference,
      profile.planFlexibilityPreference,
      profile.videoReviewInterest,
      profile.roboCoachGuidanceLevel,
      profile.cardioPriority,
      profile.mobilityPriority,
      profile.preferredSplits,
      profile.cardioPreferences,
      profile.mobilityPreferences,
    ];
    const notesCompletion = calculateSectionCompletion(
      includeCoachingPreferences
        ? [...notesCompletionFields, ...coachingCompletionFields]
        : notesCompletionFields,
    );
    const notesSummaryItems = [
      profile.sessionsPerWeek
        ? `${profile.sessionsPerWeek} days/week`
        : "Schedule not set",
      summarizeList(profile.trainingLocations, "Locations not set"),
      summarizeList(profile.availableEquipment, "Equipment not set"),
      ...(includeCoachingPreferences
        ? [
            profile.appPersonalization.coachingTone || "Tone not set",
            profile.planFlexibilityPreference || "Flexibility not set",
          ]
        : []),
    ];
    const notesSummary = (
      <div className="flex flex-wrap gap-2">
        {notesSummaryItems.map((item) => (
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
        completion={notesCompletion}
        expanded={profileSectionOpen.appCoachNotes}
        onToggle={() => toggleProfileSection("appCoachNotes")}
        summary={notesSummary}
        title="What the Coach and App Should Know"
        subtitle="User notes are self-reported. Coach notes are a placeholder for future coach/admin visibility. AI notes summarize profile direction."
      >
        <div className="space-y-4">
          {includeCoachingPreferences ? (
          <section className={profileOverviewSubsectionClass}>
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100/80">Coaching Preferences</p>
              <p className="mt-1 text-sm font-semibold text-slate-400">
                How strict, varied, intense, and hands-on the plan should feel.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <AnimatedProfileSlider
                color="orange"
                helper={`${profile.workoutIntensityPreference}. Higher intensity changes session structure and progression pace.`}
                label="Intensity Preference"
                max={10}
                min={1}
                onChange={(value) => {
                  setProfileField("trainingIntensity", value);
                  setProfileField("workoutIntensityPreference", getTrainingIntensityLabel(value));
                }}
                value={profile.trainingIntensity}
              />
              <InfoSelectField
                helper="Tone changes how plan instructions and robo-coach nudges are written."
                label="Coaching Tone"
                onChange={(value) => updatePersonalization("coachingTone", value)}
                options={["Direct", "Encouraging", "Technical", "Simple", "Hype"]}
                value={profile.appPersonalization.coachingTone}
              />
              <InfoSelectField
                helper="Variety affects exercise rotation versus repeatable practice blocks."
                label="Exercise Variety"
                onChange={(value) => setProfileField("exerciseVarietyPreference", value)}
                options={[
                  "Low variety",
                  "Moderate variety",
                  "High variety",
                  "Keep main lifts stable",
                ]}
                value={profile.exerciseVarietyPreference}
              />
              <InfoSelectField
                helper="Flexible plans adapt around missed days. Strict plans preserve the original structure."
                label="Strict vs Flexible"
                onChange={(value) => setProfileField("planFlexibilityPreference", value)}
                options={[
                  "Strict plan",
                  "Flexible plan",
                  "Auto-adjust missed days",
                  "Coach decides",
                ]}
                value={profile.planFlexibilityPreference}
              />
              <InfoSelectField
                helper="Flags whether future plan flows should prompt video review."
                label="Video Review Interest"
                onChange={(value) => setProfileField("videoReviewInterest", value)}
                options={["Yes", "Maybe later", "No", "Coach requested only"]}
                value={profile.videoReviewInterest}
              />
              <InfoSelectField
                helper="Sets how often the robo-coach should suggest adjustments."
                label="Robo-Coach Guidance"
                onChange={(value) => setProfileField("roboCoachGuidanceLevel", value)}
                options={[
                  "Light guidance",
                  "Balanced guidance",
                  "Detailed guidance",
                  "High accountability",
                ]}
                value={profile.roboCoachGuidanceLevel}
              />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
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
            </div>
            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              <PreferenceCardGrid
                helper="Select every split style you want plans to consider."
                onToggle={(value) =>
                  togglePreferenceSelection("preferredSplits", "preferredSplit", value)
                }
                options={preferredSplitOptions}
                selected={profile.preferredSplits}
                title="Preferred Split"
              />
              <PreferenceCardGrid
                helper="Pick the cardio modes you enjoy or can repeat consistently."
                onToggle={(value) =>
                  togglePreferenceSelection("cardioPreferences", "cardioPreference", value)
                }
                options={cardioPreferenceOptions}
                selected={profile.cardioPreferences}
                title="Cardio Preference"
              />
              <PreferenceCardGrid
                helper="Choose mobility formats that fit your body and schedule."
                onToggle={(value) =>
                  togglePreferenceSelection("mobilityPreferences", "mobilityPreference", value)
                }
                options={mobilityPreferenceOptions}
                selected={profile.mobilityPreferences}
                title="Mobility Preference"
              />
            </div>
          </section>
          ) : null}

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
              <Link
                href={ROUTES.dashboard.goals}
                className="mt-4 inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:border-cyan-200/40 hover:bg-cyan-300/16"
              >
                Edit Plan Direction
              </Link>
            </div>
          </div>
        </div>
      </CollapsibleProfilePanel>
    );
  };

  const rotateProfileHubLayer = (direction: "up" | "down") => {
    setActiveProfileHubLayer((currentLayer) => {
      const nextLayer =
        direction === "up"
          ? Math.max(0, currentLayer - 1)
          : Math.min(2, currentLayer + 1);

      activeProfileHubLayerRef.current = nextLayer;
      return nextLayer;
    });
  };
  const profileHubLayerMenuItems = [
    { label: "Profile", layer: 0 },
    { label: "My Hub", layer: 1 },
    { label: "Account", layer: 2 },
  ];
  const selectProfileHubLayer = (layer: number) => {
    const nextLayer = Math.max(0, Math.min(2, layer));
    activeProfileHubLayerRef.current = nextLayer;
    setProfileHubLayerMotionOffset(0);
    setActiveProfileHubLayer(nextLayer);
  };
  const handleProfileHubLayerWheel = (
    event: ReactWheelEvent<HTMLDivElement>,
  ) => {
    if (Math.abs(event.deltaY) < 2) return;

    event.preventDefault();
    event.stopPropagation();

    const now = Date.now();
    if (now < profileHubLayerWheelLockRef.current) return;

    profileHubLayerWheelDeltaRef.current += event.deltaY;
    setProfileHubLayerMotionOffset(
      Math.max(-52, Math.min(52, profileHubLayerWheelDeltaRef.current * -0.42)),
    );

    if (profileHubLayerWheelResetRef.current) {
      window.clearTimeout(profileHubLayerWheelResetRef.current);
    }

    profileHubLayerWheelResetRef.current = window.setTimeout(() => {
      profileHubLayerWheelDeltaRef.current = 0;
      setProfileHubLayerMotionOffset(0);
      profileHubLayerWheelResetRef.current = null;
    }, 140);

    if (Math.abs(profileHubLayerWheelDeltaRef.current) < 78) return;

    const direction =
      profileHubLayerWheelDeltaRef.current > 0 ? "down" : "up";
    const atLayerEdge =
      (direction === "up" && activeProfileHubLayer <= 0) ||
      (direction === "down" && activeProfileHubLayer >= 2);

    profileHubLayerWheelDeltaRef.current = 0;
    profileHubLayerWheelLockRef.current = now + 460;
    setProfileHubLayerMotionOffset(0);

    if (!atLayerEdge) {
      rotateProfileHubLayer(direction);
    }
  };
  const handleProfileHubHorizontalWheel = (
    event: ReactWheelEvent<HTMLDivElement>,
    rotate: (direction: "left" | "right") => void,
  ) => {
    const horizontalIntent =
      Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey;

    if (!horizontalIntent) return;

    const primaryDelta =
      event.shiftKey && Math.abs(event.deltaY) >= Math.abs(event.deltaX)
        ? event.deltaY
        : event.deltaX;

    if (Math.abs(primaryDelta) < 2) return;

    event.preventDefault();
    event.stopPropagation();

    const now = Date.now();
    profileHubHorizontalWheelDeltaRef.current += primaryDelta;
    setProfileHubHorizontalMotionOffset(
      Math.max(
        -48,
        Math.min(-profileHubHorizontalWheelDeltaRef.current * 0.34, 48),
      ),
    );

    if (profileHubHorizontalWheelResetRef.current) {
      window.clearTimeout(profileHubHorizontalWheelResetRef.current);
    }

    profileHubHorizontalWheelResetRef.current = window.setTimeout(() => {
      profileHubHorizontalWheelDeltaRef.current = 0;
      setProfileHubHorizontalMotionOffset(0);
      profileHubHorizontalWheelResetRef.current = null;
    }, 130);

    if (now < profileHubHorizontalWheelLockRef.current) return;
    if (
      Math.abs(profileHubHorizontalWheelDeltaRef.current) <
      PROFILE_HUB_HORIZONTAL_WHEEL_THRESHOLD
    ) {
      return;
    }

    const direction =
      profileHubHorizontalWheelDeltaRef.current > 0 ? "right" : "left";
    profileHubHorizontalWheelDeltaRef.current = 0;
    profileHubHorizontalWheelLockRef.current = now + 360;
    setProfileHubHorizontalMotionOffset(0);
    rotate(direction);
  };
  const startProfileHubHorizontalDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    pointerStartRef: { current: number | null },
    pointerMovedRef: { current: boolean },
    stopPropagation = true,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    pointerStartRef.current = event.clientX;
    pointerMovedRef.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (stopPropagation) event.stopPropagation();
  };
  const moveProfileHubHorizontalDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    pointerStartRef: { current: number | null },
    pointerMovedRef: { current: boolean },
    rotate: (direction: "left" | "right") => void,
  ) => {
    const start = pointerStartRef.current;
    if (start === null) return;

    const deltaX = event.clientX - start;
    setProfileHubHorizontalMotionOffset(Math.max(-48, Math.min(48, deltaX * 0.32)));
    if (Math.abs(deltaX) < PROFILE_HUB_HORIZONTAL_DRAG_THRESHOLD) return;

    event.preventDefault();
    event.stopPropagation();
    pointerMovedRef.current = true;
    rotate(deltaX > 0 ? "left" : "right");
    setProfileHubHorizontalMotionOffset(0);
    pointerStartRef.current = event.clientX;
  };
  const finishProfileHubHorizontalDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    pointerStartRef: { current: number | null },
    pointerMovedRef: { current: boolean },
  ) => {
    pointerStartRef.current = null;
    setProfileHubHorizontalMotionOffset(0);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }

    if (pointerMovedRef.current) {
      window.setTimeout(() => {
        pointerMovedRef.current = false;
      }, 0);
    }
  };
  const handleProfileHubLayerPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const target = event.target as Element | null;
    const startedInsideHorizontalOrbit = Boolean(
      target?.closest("[data-profile-hub-horizontal-orbit]"),
    );
    const startedInLeftVerticalZone =
      typeof window !== "undefined" &&
      event.clientX <= Math.min(220, window.innerWidth * 0.22);

    profileHubLayerPointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    profileHubLayerPointerMovedRef.current = false;
    if (!startedInsideHorizontalOrbit || startedInLeftVerticalZone) {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
  };
  const handleProfileHubLayerPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const start = profileHubLayerPointerStartRef.current;
    if (!start) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const target = event.target as Element | null;
    const movingInsideHorizontalOrbit = Boolean(
      target?.closest("[data-profile-hub-horizontal-orbit]"),
    );
    const movingInLeftVerticalZone =
      typeof window !== "undefined" &&
      event.clientX <= Math.min(220, window.innerWidth * 0.22);
    const horizontalIntent = Math.abs(deltaX) > Math.abs(deltaY) * 1.1;

    if (
      movingInsideHorizontalOrbit &&
      !movingInLeftVerticalZone &&
      horizontalIntent
    ) {
      return;
    }

    if (movingInsideHorizontalOrbit) {
      setProfileHubHorizontalMotionOffset(0);
    }

    setProfileHubLayerMotionOffset(Math.max(-52, Math.min(52, deltaY * 0.34)));
    if (Math.abs(deltaY) < 72 || Math.abs(deltaY) < Math.abs(deltaX) * 1.1) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    profileHubLayerPointerMovedRef.current = true;
    profileHubMainOrbitPointerStartRef.current = null;
    profileHubAccountOrbitPointerStartRef.current = null;
    rotateProfileHubLayer(deltaY > 0 ? "up" : "down");
    setProfileHubLayerMotionOffset(0);
    profileHubLayerPointerStartRef.current = null;
  };
  const handleProfileHubLayerPointerEnd = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    profileHubLayerPointerStartRef.current = null;
    setProfileHubLayerMotionOffset(0);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  };

  const renderProfileHeroSummaryCards = () => (
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
          `${activeLimitations.length} limits - ${profile.specialCircumstances.length} special`,
        ],
      ].map(([label, value]) => (
        <div key={label} className={profileOverviewMetricCardClass}>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/55 to-fuchsia-200/35"
          />
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-lg font-black text-white">{value}</p>
        </div>
      ))}
    </div>
  );

  const renderProfileSectionOrbiters = () => {
    const weightUnit =
      profile.appPersonalization.preferredUnitSystem === "kg" ? "kg" : "lb";
    const heightUnit =
      profile.appPersonalization.preferredUnitSystem === "kg" ? "cm" : "in";
    const calculatedAge = calculateAgeFromBirthday(profile.birthday);
    const bodyModelLabel =
      normalizeBodyModel(profile.gender || profile.bodyModel) === "female"
        ? "Female"
        : "Male";
    const completeMeasurementCount = measurementDefinitions.filter((definition) =>
      isProfileFieldComplete(profile.measurements[definition.key]),
    ).length;
    const previousExperienceCompletion = calculateSectionCompletion([
      profile.experienceLevel,
      profile.consistencyHistory,
      profile.familiarityAreas,
      profile.exerciseConfidence,
      profile.previousCoaching,
    ]);
    const planBuilderCompletion = calculateSectionCompletion([
      profile.sessionsPerWeek,
      profile.preferredDays,
      profile.sessionLength,
      profile.bestTimeOfDay,
      profile.scheduleConsistency,
      profile.trainingLocations,
      profile.availableEquipment,
      profile.travelTrainingNotes,
    ]);
    const bodyCardCompletion = calculateSectionCompletion([
      profile.currentWeight,
      profile.waist,
      profile.muscleMass,
      profile.bodyFat,
      profile.bodyStatus.weightTrend,
      profile.bodyScanImports,
      profile.bodyScanSource,
    ]);
    const vitalStatsCompletion = calculateSectionCompletion([
      profile.gender,
      profile.birthday,
      profile.height,
    ]);
    const occupationActivityCompletion = calculateSectionCompletion([
      profile.occupation,
      profile.sedentaryLevel,
      profile.hoursWorkedPerWeek,
    ]);
    const contactInfoCompletion = calculateSectionCompletion([
      profile.state,
      profile.city,
      profile.phone,
      profile.emergencyContactName,
      profile.emergencyContactPhone,
    ]);
    const contactLocation =
      profile.city && profile.state
        ? `${profile.city}, ${profile.state}`
        : profile.state || profile.city || "Location optional";
    const goalStageCompletion = tabCompletions.goals;
    const goalStageLabel = profile.goalDeadline
      ? "Timeline set"
      : profile.goalWeight
        ? "Target set"
        : profile.primaryGoal
          ? "Direction set"
          : "Stage open";
    const profileOrbitCards: ProfileOrbiterCard[] = [
      {
        accordion: "planDirection",
        completion: tabCompletions.planDirection,
        helper: "Primary and secondary priorities for training direction.",
        icon: "compass",
        label: "Goal Direction",
        references: [
          profile.planDirections[0] || profile.goalMode,
          profile.planDirections[1] || profile.bodyGoalMode,
          profile.primaryGoal || "Goal not set",
        ],
        stat: `${tabCompletions.planDirection}% ready`,
        tab: "goals",
        targetId: "plan-direction",
        tone: "border-emerald-200/24 bg-emerald-300/10 text-emerald-100",
      },
      {
        completion: goalStageCompletion,
        helper: "Timeline, priority, body target, and consistency stage from the Goals workspace.",
        icon: "trophy",
        label: "Goal Stage",
        references: [
          profile.primaryGoal || "Primary goal open",
          profile.goalDeadline || "Timeline open",
          profile.goalWeight
            ? `Goal weight ${profile.goalWeight}`
            : `${profile.weeklyConsistencyGoal}% consistency target`,
        ],
        stat: goalStageLabel,
        tab: "goals",
        targetId: "goal-stage",
        tone: "border-amber-200/26 bg-amber-300/10 text-amber-100",
      },
      {
        completion: vitalStatsCompletion,
        expandsToFullCard: true,
        helper: "Stable body model, age, birthday, and height context.",
        icon: "user",
        label: "Vital Statistics",
        references: [
          bodyModelLabel,
          calculatedAge ? `${calculatedAge} yrs` : "Birthday not set",
          profile.height ? `${profile.height} ${heightUnit}` : "Height not set",
        ],
        stat: calculatedAge ? `${calculatedAge} yrs` : bodyModelLabel,
        tab: "overview",
        targetId: "vital-statistics",
        tone: "border-blue-200/24 bg-blue-300/10 text-blue-100",
      },
      {
        accordion: "myBody",
        completion: bodyCardCompletion,
        expandsToFullCard: true,
        helper: "Variable body metrics: weight, waist, muscle mass, and body fat.",
        icon: "scale",
        label: "My Body",
        references: [
          profile.currentWeight
            ? `${profile.currentWeight} ${weightUnit}`
            : "Weight not set",
          profile.waist ? `${profile.waist} in waist` : "Waist not set",
          profile.muscleMass
            ? `${profile.muscleMass} ${weightUnit} muscle`
            : "Muscle mass not set",
        ],
        stat: profile.currentWeight
          ? `${profile.currentWeight} ${weightUnit}`
          : "Weight not set",
        tab: "overview",
        targetId: "my-body",
        tone: "border-sky-200/24 bg-sky-300/10 text-sky-100",
      },
      {
        accordion: "measurements",
        completion: tabCompletions.measurements,
        helper: "Waist, chest, hips, limbs, photos, and progress notes.",
        icon: "ruler",
        label: "Body Measurements",
        references: [
          `Unit: ${profile.measurements.unit}`,
          `Updated: ${formatSavedTime(profile.measurements.lastUpdated)}`,
          `${completeMeasurementCount}/${measurementDefinitions.length} saved`,
        ],
        stat: profile.measurements.waist
          ? `Waist ${profile.measurements.waist} ${profile.measurements.unit}`
          : "Measurements open",
        tab: "overview",
        targetId: "measurements",
        tone: "border-orange-200/24 bg-orange-300/10 text-orange-100",
      },
      {
        accordion: "previousExperience",
        completion: previousExperienceCompletion,
        helper: "Training background, consistency, movement confidence, and coaching history.",
        icon: "graduation-cap",
        label: "Previous Experience",
        references: [
          profile.experienceLevel || "Experience not set",
          profile.consistencyHistory || "Consistency not set",
          profile.familiarityAreas[0] || "Familiarity not set",
        ],
        stat: profile.previousCoaching.length
          ? `${profile.previousCoaching.length} coaching notes`
          : "Background",
        tab: "readiness",
        targetId: "previous-experience",
        tone: "border-fuchsia-200/24 bg-fuchsia-300/10 text-fuchsia-100",
      },
      {
        accordion: "specialCircumstances",
        completion: tabCompletions.circumstances,
        helper: "Life, travel, recovery, health, or schedule context that should shape recommendations.",
        icon: "sparkles",
        label: "Special Circumstances",
        references: [
          `${profile.specialCircumstances.length} selected`,
          activeLimitations[0]?.region || "No active limits",
          `${profile.recoveryPriority}/10 recovery priority`,
        ],
        stat: profile.specialCircumstances.length ? "Context active" : "None selected",
        tab: "readiness",
        targetId: "special-circumstances",
        tone: "border-amber-200/24 bg-amber-300/10 text-amber-100",
      },
      {
        accordion: "planBuilder",
        completion: planBuilderCompletion,
        helper: "Schedule, location, equipment, and weekly training setup.",
        icon: "calendar-clock",
        label: "Training Setup",
        references: [
          profile.sessionsPerWeek ? `${profile.sessionsPerWeek} days/week` : "Schedule not set",
          profile.trainingLocations[0] || "Location not set",
          profile.availableEquipment[0] || "Equipment not set",
        ],
        stat: profile.sessionLength || "Session length",
        tab: "readiness",
        targetId: "training-setup",
        tone: "border-cyan-200/24 bg-cyan-300/10 text-cyan-100",
      },
      {
        completion: tabCompletions.training,
        helper: "Training styles, preferred split, cardio, and mobility preferences.",
        icon: "dumbbell",
        label: "Training Style",
        references: [
          profile.trainingStyles[0] || "Style not set",
          profile.preferredSplits[0] || profile.preferredSplit,
          profile.cardioPreferences[0] || "Cardio preference",
        ],
        stat: `${profile.cardioPriority}/10 cardio`,
        tab: "readiness",
        targetId: "training-style",
        tone: "border-blue-200/24 bg-blue-300/10 text-blue-100",
      },
      {
        accordion: "readiness",
        completion: tabCompletions.readiness,
        helper: "Sleep, stress, soreness, pain, energy, and recovery signal inputs.",
        icon: "activity",
        label: "Readiness",
        references: [
          planReadiness.readinessLabel,
          profile.bodyStatus.energyStatus,
          profile.bodyStatus.stressStatus,
        ],
        stat: `${planReadiness.readinessScore}/100`,
        tab: "overview",
        targetId: "readiness-section",
        tone: "border-orange-200/24 bg-orange-300/10 text-orange-100",
      },
      {
        accordion: "benchmarks",
        completion: tabCompletions.benchmarks,
        helper: "Strength, mobility, and performance baselines for progress tracking.",
        icon: "trophy",
        label: "Benchmarks",
        references: [
          `${profile.benchmarks.length} benchmark slots`,
          "Strength anchors",
          "Performance trends",
        ],
        stat: `${tabCompletions.benchmarks}% logged`,
        tab: "overview",
        targetId: "benchmarks",
        tone: "border-violet-200/24 bg-violet-300/10 text-violet-100",
      },
      {
        accordion: "appCoachNotes",
        completion: tabCompletions.preferences,
        helper: "Coach notes, app preferences, AI notes, and guidance style.",
        icon: "clipboard-list",
        label: "Coach + App Notes",
        references: [
          profile.appPersonalization.coachingTone || "Tone not set",
          profile.planFlexibilityPreference || "Flexibility not set",
          profile.userNotes ? "User notes saved" : "Notes open",
        ],
        stat: "Coach context",
        tab: "coachApp",
        targetId: "coach-app-notes",
        tone: "border-teal-200/24 bg-teal-300/10 text-teal-100",
      },
      {
        completion: tabCompletions.preferences,
        helper: "Dashboard focus, units, anatomy display, and recovery warning preferences.",
        icon: "settings",
        label: "App Preferences",
        references: [
          profile.appPersonalization.defaultDashboardFocus,
          profile.appPersonalization.preferredUnitSystem,
          profile.appPersonalization.anatomyBackground,
        ],
        stat: "Preferences",
        tab: "coachApp",
        targetId: "app-preferences",
        tone: "border-slate-200/18 bg-slate-300/10 text-slate-100",
      },
      {
        completion: tabCompletions.readiness,
        helper: "Work schedule, sleep window, travel, childcare, and reminder context.",
        icon: "clock",
        label: "Lifestyle",
        references: [
          profile.lifestyleConstraints.workSchedule || "Work schedule",
          profile.lifestyleConstraints.sleepWindow || "Sleep window",
          profile.lifestyleConstraints.availableTrainingTimes[0] || "Training time",
        ],
        stat: `${profile.lifestyleConstraints.stressLevel}/10 stress`,
        tab: "overview",
        targetId: "lifestyle",
        tone: "border-rose-200/24 bg-rose-300/10 text-rose-100",
      },
      {
        completion: occupationActivityCompletion,
        expandsToFullCard: true,
        helper: "Occupation, daily activity level, and weekly work load.",
        icon: "briefcase",
        label: "Occupation + Daily Activity",
        references: [
          normalizeOccupationValue(profile.occupation) || "Occupation not set",
          profile.sedentaryLevel || "Daily activity not set",
          profile.hoursWorkedPerWeek
            ? `${profile.hoursWorkedPerWeek} hrs/week`
            : "Work hours not set",
        ],
        stat: profile.occupation
          ? normalizeOccupationValue(profile.occupation)
          : "Work context",
        tab: "overview",
        targetId: "occupation-activity",
        tone: "border-emerald-200/24 bg-emerald-300/10 text-emerald-100",
      },
      {
        completion: contactInfoCompletion,
        expandsToFullCard: true,
        helper: "Optional location, phone, and emergency contact details.",
        icon: "contact",
        label: "Contact Info",
        references: [
          contactLocation,
          profile.phone ? "Phone saved" : "Phone optional",
          profile.emergencyContactName
            ? "Emergency contact saved"
            : "Emergency contact optional",
        ],
        stat:
          profile.phone || profile.emergencyContactName || profile.state
            ? "Contact saved"
            : "Optional",
        tab: "overview",
        targetId: "contact-info",
        tone: "border-cyan-200/24 bg-cyan-300/10 text-cyan-100",
      },
      {
        completion: tabCompletions.recovery,
        helper: "Limitations, pain signals, recovery preferences, and mobility notes.",
        icon: "heart-pulse",
        label: "Recovery Profile",
        references: [
          planReadiness.readinessLabel,
          `${profile.injuries.length} injury notes`,
          `${profile.recoveryPriority}/10 recovery priority`,
        ],
        stat: `${tabCompletions.recovery}% ready`,
        tab: "recovery",
        targetId: "recovery-profile",
        tone: "border-violet-200/24 bg-violet-300/10 text-violet-100",
      },
      {
        completion: tabCompletions.nutrition,
        helper: "Protein, calories, dietary constraints, meal rhythm, and nutrition direction.",
        icon: "utensils",
        label: "Nutrition Direction",
        references: [
          profile.nutritionDirection.nutritionGoal,
          profile.nutritionDirection.proteinTarget || "Protein target",
          profile.nutritionDirection.mealPrepPreference || "Meal prep",
        ],
        stat: `${tabCompletions.nutrition}% set`,
        tab: "nutrition",
        targetId: "nutrition-direction",
        tone: "border-emerald-200/24 bg-emerald-300/10 text-emerald-100",
      },
    ];
    const profileCardRows = tabs
      .map((tab, index) => {
        const cards = profileOrbitCards.filter((card) => card.tab === tab.id);
        const completion = Math.round(
          cards.reduce((total, card) => total + card.completion, 0) /
            Math.max(cards.length, 1),
        );

        return {
          cards,
          completion,
          eyebrow: `Row ${profileOrbiterCardStartRow + index}`,
          helper: `${tab.label} cards sorted into their own orbit row.`,
          rowIndex: profileOrbiterCardStartRow + index,
          tab,
          title: tab.label,
        };
      })
      .filter((row) => row.cards.length > 0);
    const profileOrbiterRows = [
      {
        completion: tabCompletions.overview,
        eyebrow: "Row 0",
        helper: "Identity, plan context, and summary signals.",
        title: "Profile Hero",
      },
      ...profileCardRows.map((row) => ({
        completion: row.completion,
        eyebrow: row.eyebrow,
        helper: row.helper,
        title: row.title,
      })),
    ];
    const rawActiveProfileOrbiterRow =
      typeof activeProfileOrbiterRow === "number"
        ? activeProfileOrbiterRow
        : Number(activeProfileOrbiterRow);
    const safeActiveProfileOrbiterRow = Number.isFinite(
      rawActiveProfileOrbiterRow,
    )
      ? Math.trunc(rawActiveProfileOrbiterRow)
      : 0;
    const clampedActiveProfileOrbiterRow = Math.max(
      0,
      Math.min(profileOrbiterRows.length - 1, safeActiveProfileOrbiterRow),
    );
    const getProfileSectionOrbitIndex = (tabId: ProfileTab, length: number) => {
      if (length <= 0) return 0;

      const storedIndex = activeProfileOrbiterIndices[`sections-${tabId}`];
      const defaultIndex =
        tabId === "readiness"
          ? Math.max(
              0,
              profileCardRows
                .find((row) => row.tab.id === "readiness")
                ?.cards.findIndex((card) => card.targetId === "training-setup") ??
                0,
            )
          : 0;
      const rawIndex =
        storedIndex === undefined
          ? defaultIndex
          : typeof storedIndex === "number"
            ? storedIndex
            : Number(storedIndex);
      const safeIndex = Number.isFinite(rawIndex) ? Math.trunc(rawIndex) : 0;

      return ((safeIndex % length) + length) % length;
    };
    const activeProfileCardRow =
      profileCardRows.find(
        (row) => row.rowIndex === clampedActiveProfileOrbiterRow,
      ) || null;
    const activeProfileCardRowIndex = activeProfileCardRow
      ? getProfileSectionOrbitIndex(
          activeProfileCardRow.tab.id,
          activeProfileCardRow.cards.length,
        )
      : 0;
    const setProfileSectionOrbitIndex = (tabId: ProfileTab, index: number) => {
      const cardRowIndex = tabs.findIndex((tab) => tab.id === tabId);
      const rowIndex = profileOrbiterCardStartRow + Math.max(0, cardRowIndex);
      setActiveProfileOrbiterIndices((current) => ({
        ...current,
        [`sections-${tabId}`]: index,
      }));
      setActiveProfileOrbiterRow(rowIndex);
      setOpenProfileOrbiterDetails(null);
      setExpandedProfileOrbiterCard(null);
      scrollProfileOrbiterViewportToRow(rowIndex);
    };
    const moveProfileSectionOrbit = (
      tabId: ProfileTab,
      length: number,
      direction: -1 | 1,
    ) => {
      if (length <= 1) return;

      const currentIndex = getProfileSectionOrbitIndex(tabId, length);
      setProfileSectionOrbitIndex(
        tabId,
        (currentIndex + direction + length) % length,
      );
    };
    const openProfileOrbiterFullCard = (tabId: ProfileTab, index: number) => {
      const cardRowIndex = tabs.findIndex((tab) => tab.id === tabId);
      const rowIndex = profileOrbiterCardStartRow + Math.max(0, cardRowIndex);
      setActiveProfileOrbiterIndices((current) => ({
        ...current,
        [`sections-${tabId}`]: index,
      }));
      setActiveProfileOrbiterRow(rowIndex);
      setOpenProfileOrbiterDetails(null);
      setExpandedProfileOrbiterCard(`${tabId}-${index}`);
      scrollProfileOrbiterIntoView();
      scrollProfileOrbiterViewportToRow(rowIndex);
    };
    const renderExpandedProfileOrbiterCard = (card: ProfileOrbiterCard) => {
      const tone = getCompletionTone(card.completion);
      const pulseTone = getProfilePulseIndicatorTone(card.completion);
      const isOccupationActivityCard = card.targetId === "occupation-activity";
      const isContactInfoCard = card.targetId === "contact-info";
      const isVitalStatisticsCard = card.targetId === "vital-statistics";

      if (
        card.accordion !== "myBody" &&
        !isOccupationActivityCard &&
        !isContactInfoCard &&
        !isVitalStatisticsCard
      ) {
        return null;
      }

      const title = isOccupationActivityCard
        ? "Occupation + Daily Activity"
        : isContactInfoCard
          ? "Contact Info"
          : isVitalStatisticsCard
            ? "Vital Statistics"
            : "My Body";
      const description = isOccupationActivityCard
        ? "Work context and daily activity inputs that help estimate fatigue, recovery pressure, and movement exposure."
        : isContactInfoCard
          ? "Optional location, phone, and emergency contact details kept separate from body metrics."
          : isVitalStatisticsCard
            ? "Stable body model inputs for age, gender, and height."
            : "Variable body metrics for weight, waist, muscle mass, and body-fat direction.";
      const content = isOccupationActivityCard
        ? renderOccupationActivityControls()
        : isContactInfoCard
          ? renderContactInfoControls()
          : isVitalStatisticsCard
            ? renderVitalStatisticsControls()
            : renderBodyMetrics({ embedded: true });

      return (
        <div
          data-profile-orbiter-scroll-area="true"
          className="max-h-[min(60vh,560px)] overflow-y-auto rounded-[30px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <section className={`${profileOverviewSectionShellClass} p-3 sm:p-3`}>
            <span aria-hidden="true" className={profileOverviewSectionGlowClass} />
            <div className="relative z-10">
              <div className="relative overflow-hidden rounded-[22px] border border-cyan-200/14 bg-slate-950/48 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                {renderProfileCardLiquidGlass(card.completion, true)}
                <div className="relative z-10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/75">
                        Full Profile Dropdown
                      </p>
                      <h3 className="mt-0.5 text-2xl font-black text-white">
                        {title}
                      </h3>
                    </div>
                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] ${tone.badge}`}>
                      <span
                        aria-hidden="true"
                        data-active="true"
                        data-profile-indicator-motion={pulseTone.motion}
                        style={pulseTone.style}
                        className={`profile-row-card-indicator inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border bg-black/25 ${pulseTone.outerActive}`}
                      >
                        <span
                          aria-hidden="true"
                          data-profile-pulse-dot="true"
                          className={`h-2 w-2 rounded-full ${pulseTone.dotActive}`}
                        />
                      </span>
                      {card.completion}% complete
                    </span>
                  </div>
                  <p className="mt-1 max-w-3xl text-sm font-semibold leading-5 text-slate-300">
                    {description}
                  </p>
                </div>
              </div>
              <div className="mt-3">{content}</div>
            </div>
          </section>
        </div>
      );
    };
    const activeProfileOrbiterMeta =
      profileOrbiterRows[clampedActiveProfileOrbiterRow] || profileOrbiterRows[0];
    const profileOrbiterLocked = Boolean(expandedProfileOrbiterCard);
    const setProfileOrbiterRow = (row: number) => {
      if (profileOrbiterLocked) return;
      const nextRow = Math.max(0, Math.min(profileOrbiterRows.length - 1, row));
      if (nextRow === 0) {
        jumpProfileOrbiterToHero();
        return;
      }

      setActiveProfileOrbiterRow(nextRow);
      setOpenProfileOrbiterDetails(null);
      setExpandedProfileOrbiterCard(null);
      scrollProfileOrbiterIntoView();
      scrollProfileOrbiterViewportToRow(nextRow);
    };
    const scrollProfileOrbiterToHero = () => {
      if (profileOrbiterLocked) return;
      jumpProfileOrbiterToHero();
    };
    const scrollProfileOrbiterRow = (direction: -1 | 1) => {
      if (profileOrbiterLocked) return;
      const maxRow = profileOrbiterRows.length - 1;
      const nextRow = Math.max(
        0,
        Math.min(maxRow, clampedActiveProfileOrbiterRow + direction),
      );
      if (nextRow === 0) {
        jumpProfileOrbiterToHero();
        return;
      }

      setActiveProfileOrbiterRow(nextRow);
      setOpenProfileOrbiterDetails(null);
      setExpandedProfileOrbiterCard(null);
      scrollProfileOrbiterIntoView();
      scrollProfileOrbiterViewportToRow(nextRow);
    };
    const renderCollapseProfileDropdownButton = () => (
      <button
        type="button"
        aria-label="Collapse full profile dropdown"
        onClick={() => setExpandedProfileOrbiterCard(null)}
        className="absolute right-0 top-[-3.25rem] z-30 grid h-11 w-11 place-items-center rounded-2xl border border-cyan-100/24 bg-slate-950/76 text-lg font-black leading-none text-cyan-50 shadow-[0_18px_48px_rgba(0,0,0,0.38),0_0_20px_rgba(103,232,249,0.10)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-cyan-100/44 hover:bg-cyan-300/14 sm:-right-14 sm:top-4"
      >
        ^
      </button>
    );
    const renderProfileCardLiquidGlass = (
      completion: number,
      isActive = false,
    ) => {
      const tone = getCompletionTone(completion);
      const pulseTone = getProfilePulseIndicatorTone(completion);
      const progress = Math.max(10, Math.min(100, completion));
      const liquidStyle = {
        ...pulseTone.style,
        "--profile-card-liquid-level": `${progress}%`,
      } as ProfilePulseIndicatorStyle & {
        "--profile-card-liquid-level": string;
      };

      return (
        <span
          aria-hidden="true"
          className="profile-card-liquid-glass absolute inset-0 overflow-hidden rounded-[inherit]"
          data-profile-liquid-active={isActive ? "true" : "false"}
          data-profile-liquid-motion={pulseTone.motion}
          style={liquidStyle}
        >
          <span
            className={`profile-card-liquid-reservoir absolute bg-gradient-to-br ${tone.bar}`}
          />
          <span
            aria-hidden="true"
            className="profile-card-liquid-caustics absolute inset-0"
          />
        </span>
      );
    };
    const shouldIgnoreProfileOrbiterKeyTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      Boolean(
        target.closest(
          "button,a,input,select,textarea,label,[contenteditable='true'],[data-profile-orbiter-scroll-area='true']",
        ),
      );
    const handleProfileOrbiterKeyDown = (
      event: ReactKeyboardEvent<HTMLDivElement>,
    ) => {
      if (profileOrbiterLocked) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (shouldIgnoreProfileOrbiterKeyTarget(event.target)) return;

      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        const direction = event.key === "ArrowUp" ? -1 : 1;
        const nextRow = Math.max(
          0,
          Math.min(
            profileOrbiterRows.length - 1,
            clampedActiveProfileOrbiterRow + direction,
          ),
        );

        if (nextRow === clampedActiveProfileOrbiterRow) return;

        event.preventDefault();
        event.stopPropagation();
        scrollProfileOrbiterRow(direction);
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        if (!activeProfileCardRow || activeProfileCardRow.cards.length <= 1) return;

        event.preventDefault();
        event.stopPropagation();
        moveProfileSectionOrbit(
          activeProfileCardRow.tab.id,
          activeProfileCardRow.cards.length,
          event.key === "ArrowLeft" ? -1 : 1,
        );
      }
    };
    const startProfileOrbiterDrag = (
      event: ReactPointerEvent<HTMLDivElement>,
    ) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (profileOrbiterLocked) {
        profileOrbiterPointerStartRef.current = null;
        profileOrbiterPointerMovedRef.current = false;
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest(
          "button,a,input,select,textarea,label,[data-profile-orbiter-scroll-area='true']",
        )
      ) {
        profileOrbiterPointerStartRef.current = null;
        profileOrbiterPointerMovedRef.current = false;
        return;
      }

      event.currentTarget.setPointerCapture?.(event.pointerId);
      event.currentTarget.focus({ preventScroll: true });
      profileOrbiterPointerStartRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
      profileOrbiterPointerMovedRef.current = false;
    };
    const moveProfileOrbiterDrag = (
      event: ReactPointerEvent<HTMLDivElement>,
    ) => {
      const start = profileOrbiterPointerStartRef.current;
      if (!start) return;

      const deltaX = event.clientX - start.x;
      const deltaY = event.clientY - start.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      if (Math.max(absX, absY) < 42) return;

      if (activeProfileCardRow && absX > absY * 1.15) {
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        profileOrbiterPointerMovedRef.current = true;
        setProfileSectionOrbitIndex(
          activeProfileCardRow.tab.id,
          deltaX > 0
            ? (activeProfileCardRowIndex - 1 + activeProfileCardRow.cards.length) %
                activeProfileCardRow.cards.length
            : (activeProfileCardRowIndex + 1) % activeProfileCardRow.cards.length,
        );
        profileOrbiterPointerStartRef.current = null;
        return;
      }

      if (absY > absX * 1.15) {
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        profileOrbiterPointerMovedRef.current = true;
        scrollProfileOrbiterRow(deltaY > 0 ? -1 : 1);
        profileOrbiterPointerStartRef.current = null;
      }
    };
    const finishProfileOrbiterDrag = (
      event: ReactPointerEvent<HTMLDivElement>,
    ) => {
      profileOrbiterPointerStartRef.current = null;
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      }

      if (profileOrbiterPointerMovedRef.current) {
        window.setTimeout(() => {
          profileOrbiterPointerMovedRef.current = false;
        }, 0);
      }
    };
    const getProfileOrbiterRowStyle = (row: number): CSSProperties => {
      const isActive = row === clampedActiveProfileOrbiterRow;

      return {
        filter: "none",
        opacity: 1,
        pointerEvents: "auto",
        scrollSnapAlign: "center",
        scrollSnapStop: "always",
        transform: "none",
        visibility: "visible",
        zIndex: isActive ? 40 : 20,
      };
    };
    const syncProfileOrbiterRowFromScroll = () => {
      if (profileOrbiterLocked) return;
      if (profileOrbiterScrollSyncLockRef.current) return;
      const viewport = profileOrbiterViewportRef.current;
      if (!viewport) return;

      const rows = Array.from(
        viewport.querySelectorAll<HTMLElement>("[data-profile-orbiter-row]"),
      );
      if (!rows.length) return;

      const viewportCenter = viewport.scrollTop + viewport.clientHeight / 2;
      let closestRow = clampedActiveProfileOrbiterRow;
      let closestDistance = Number.POSITIVE_INFINITY;

      rows.forEach((row) => {
        const rowIndex = Number(row.dataset.profileOrbiterRow);
        if (!Number.isFinite(rowIndex)) return;

        const rowCenter = row.offsetTop + row.offsetHeight / 2;
        const distance = Math.abs(rowCenter - viewportCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestRow = rowIndex;
        }
      });

      if (closestRow !== clampedActiveProfileOrbiterRow) {
        setActiveProfileOrbiterRow(closestRow);
      }
    };
    const profileHubCompletion = Math.round(
      (tabCompletions.overview +
        tabCompletions.readiness +
        tabCompletions.recovery +
        tabCompletions.nutrition +
        tabCompletions.coachApp) /
        5,
    );
    const getProfileHubCardIndex = (tabId: ProfileTab, targetId: string) => {
      const row = profileCardRows.find((cardRow) => cardRow.tab.id === tabId);
      if (!row) return 0;

      return Math.max(
        0,
        row.cards.findIndex((card) => card.targetId === targetId),
      );
    };
    const openProfileHubCard = (
      tabId: ProfileTab,
      targetId: string,
      expand = false,
    ) => {
      closeProfileHub();
      const cardIndex = getProfileHubCardIndex(tabId, targetId);

      if (expand) {
        openProfileOrbiterFullCard(tabId, cardIndex);
        return;
      }

      setProfileSectionOrbitIndex(tabId, cardIndex);
      scrollProfileOrbiterIntoView();
    };
    const profileHubMainItems: ProfileHubOrbitItem[] = [
      {
        buttonLabel: "Open Profile",
        helper: "Identity, avatar, membership, and profile completion.",
        icon: "user",
        label: "Profile Basics",
        onSelect: () => {
          closeProfileHub();
          jumpProfileOrbiterToHero();
        },
        references: [
          profile.memberType || "Member",
          `Member since ${memberSinceLabel}`,
          `${profileHubCompletion}% complete`,
        ],
        stat: `@${identityHandle}`,
        tone: "border-cyan-200/24 bg-cyan-300/10 text-cyan-100",
      },
      {
        buttonLabel: "Open Body",
        helper: "Weight, waist, muscle mass, and body-fat direction.",
        icon: "scale",
        label: "My Body",
        onSelect: () => openProfileHubCard("overview", "my-body", true),
        references: [
          profile.currentWeight ? `${profile.currentWeight} ${weightUnit}` : "Weight open",
          profile.waist ? `${profile.waist} in waist` : "Waist open",
          profile.bodyFat ? `${profile.bodyFat}% body fat` : "Body fat open",
        ],
        stat: `${bodyCardCompletion}% ready`,
        tone: "border-sky-200/24 bg-sky-300/10 text-sky-100",
      },
      {
        buttonLabel: "Open Measurements",
        helper: "Waist, chest, hips, limbs, photos, and progress notes.",
        icon: "ruler",
        label: "Measurements",
        onSelect: () => openProfileHubCard("overview", "measurements"),
        references: [
          `${completeMeasurementCount}/${measurementDefinitions.length} saved`,
          `Unit: ${profile.measurements.unit}`,
          `Updated: ${formatSavedTime(profile.measurements.lastUpdated)}`,
        ],
        stat: `${tabCompletions.measurements}% logged`,
        tone: "border-orange-200/24 bg-orange-300/10 text-orange-100",
      },
      {
        buttonLabel: "Open Readiness",
        helper: "Sleep, stress, soreness, pain, energy, and recovery signals.",
        icon: "activity",
        label: "Readiness",
        onSelect: () => openProfileHubCard("overview", "readiness-section"),
        references: [
          planReadiness.readinessLabel,
          profile.bodyStatus.energyStatus,
          profile.bodyStatus.stressStatus,
        ],
        stat: `${planReadiness.readinessScore}/100`,
        tone: "border-amber-200/24 bg-amber-300/10 text-amber-100",
      },
      {
        buttonLabel: "Open Goals",
        helper: "Primary priorities and direction for training recommendations.",
        icon: "compass",
        label: "Goal Direction",
        onSelect: () => openProfileHubCard("goals", "plan-direction"),
        references: [
          profile.planDirections[0] || profile.goalMode,
          profile.primaryGoal || "Goal open",
          planReadiness.risk.label,
        ],
        stat: `${tabCompletions.planDirection}% ready`,
        tone: "border-emerald-200/24 bg-emerald-300/10 text-emerald-100",
      },
      {
        buttonLabel: "Open Coach Notes",
        helper: "Coach notes, app preferences, AI notes, and guidance style.",
        icon: "clipboard-list",
        label: "Coach + App",
        onSelect: () => openProfileHubCard("coachApp", "coach-app-notes"),
        references: [
          profile.appPersonalization.coachingTone || "Tone open",
          profile.planFlexibilityPreference || "Flexibility open",
          profile.userNotes ? "User notes saved" : "Notes open",
        ],
        stat: "Coach context",
        tone: "border-teal-200/24 bg-teal-300/10 text-teal-100",
      },
    ];
    const profileHubAchievements: AchievementBadgeItem[] = [
      {
        category: "goal",
        href: ROUTES.dashboard.achievements,
        icon: "ID",
        label: "Profile Built",
        meta: `${profileHubCompletion}% profile ready`,
        progress: profileHubCompletion,
        rarity: profileHubCompletion >= 90 ? "gold" : "cyan",
        status: profileHubCompletion >= 90 ? "completed" : "active",
        statusLabel: profileHubCompletion >= 90 ? "Earned" : "In progress",
      },
      {
        category: "performance",
        href: ROUTES.dashboard.achievements,
        icon: "SP",
        label: "Sound Points",
        meta: `${soundPoints.toLocaleString()} points`,
        progress: Math.min(100, Math.max(28, Math.round(soundPoints / 24))),
        rarity: soundPoints >= 1800 ? "gold" : "cyan",
        status: soundPoints >= 1800 ? "completed" : "active",
        statusLabel: soundPoints >= 1800 ? "Earned" : "In progress",
      },
      {
        category: "volume",
        href: ROUTES.dashboard.achievements,
        icon: "ST",
        label: "Token Vault",
        meta: `${soundTokens.toLocaleString()} tokens`,
        progress: Math.min(100, Math.max(24, Math.round(soundTokens * 1.8))),
        rarity: soundTokens >= 60 ? "gold" : "silver",
        status: soundTokens >= 60 ? "completed" : "active",
        statusLabel: soundTokens >= 60 ? "Earned" : "In progress",
      },
      {
        category: "recovery",
        href: ROUTES.dashboard.achievements,
        icon: "RD",
        label: "Coach Ready",
        meta: planReadiness.readinessLabel,
        progress: planReadiness.readinessScore,
        rarity: planReadiness.readinessScore >= 85 ? "gold" : "bronze",
        status: planReadiness.readinessScore >= 85 ? "completed" : "active",
        statusLabel:
          planReadiness.readinessScore >= 85 ? "Earned" : "In progress",
      },
    ];
    const profileHubAccountItems: ProfileHubOrbitItem[] = [
      {
        helper: "App preferences and account controls.",
        href: ROUTES.dashboard.settings,
        icon: "settings",
        label: "Settings",
        references: [
          "Notifications",
          "Display controls",
          "Account security",
        ],
        stat: "Preferences",
        tone: "border-violet-200/24 bg-violet-300/10 text-violet-100",
      },
      {
        helper: "Payments and invoice history.",
        href: ROUTES.dashboard.payments,
        icon: "wallet",
        label: "Billing",
        references: [
          profile.memberType || "Member",
          "Payment methods",
          "Invoice history",
        ],
        stat: "Account plan",
        tone: "border-amber-200/24 bg-amber-300/10 text-amber-100",
      },
      {
        helper: "Support, FAQs, and app guidance.",
        href: ROUTES.dashboard.help,
        icon: "contact",
        label: "Help",
        references: [
          "Support center",
          "FAQs",
          "App guidance",
        ],
        stat: "Support",
        tone: "border-emerald-200/24 bg-emerald-300/10 text-emerald-100",
      },
      {
        achievements: profileHubAchievements,
        buttonLabel: "Open Rewards",
        helper: "Milestones, badges, and Sound rewards.",
        href: ROUTES.dashboard.achievements,
        icon: "trophy",
        label: "Achievements",
        references: [
          `${soundPoints.toLocaleString()} points`,
          `${soundTokens.toLocaleString()} tokens`,
          `${profileHubCompletion}% profile`,
        ],
        stat: "Rewards",
        tone: "border-orange-200/24 bg-orange-300/10 text-orange-100",
      },
    ];
    const rotateProfileHubOrbit = (direction: "left" | "right") => {
      setActiveProfileHubIndex((currentIndex) =>
        direction === "left"
          ? (currentIndex - 1 + profileHubMainItems.length) %
            profileHubMainItems.length
          : (currentIndex + 1) % profileHubMainItems.length,
      );
    };
    const rotateProfileHubAccountOrbit = (direction: "left" | "right") => {
      setActiveProfileHubAccountIndex((currentIndex) =>
        direction === "left"
          ? (currentIndex - 1 + profileHubAccountItems.length) %
            profileHubAccountItems.length
          : (currentIndex + 1) % profileHubAccountItems.length,
      );
    };
    const getProfileHubOrbitDistance = (
      index: number,
      activeIndex: number,
      length: number,
    ) => {
      const rawDistance = index - activeIndex;

      if (rawDistance > length / 2) return rawDistance - length;
      if (rawDistance < -length / 2) return rawDistance + length;
      return rawDistance;
    };
    const activateProfileHubItem = (item: ProfileHubOrbitItem) => {
      if (item.action === "logout") {
        void signOutFromProfileHub();
        return;
      }

      if (item.onSelect) {
        item.onSelect();
        return;
      }

      if (item.href) {
        closeProfileHub();
        router.push(item.href);
      }
    };
    const profileHubLayerMotionStyle = {
      "--profile-hub-layer-offset": `${profileHubLayerMotionOffset}px`,
    } as CSSProperties;
    const getProfileHubRowTitleStyle = (
      layer: number,
      centerPercent: number,
      fallbackCardHeight: number,
    ) => {
      const cardHeight = profileHubLayerCardHeights[layer] || fallbackCardHeight;
      const titleHeight = profileHubRowTitleHeights[layer] || 44;
      const offset = Math.max(
        116,
        Math.min(330, cardHeight / 2 + titleHeight + 18),
      );

      return {
        top: `calc(${centerPercent}% - ${offset}px)`,
      } as CSSProperties;
    };
    const renderProfileHubRowTitle = (
      layer: number,
      label: string,
      helper: string,
      tone: string,
      centerPercent: number,
      fallbackCardHeight: number,
      indicator?: {
        activeClassName: string;
        activeIndex: number;
        count: number;
        inactiveClassName: string;
      },
    ) => (
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute left-1/2 z-40 w-[min(86vw,430px)] -translate-x-1/2 rounded-2xl border px-3 py-2 text-center shadow-[0_16px_44px_rgba(0,0,0,0.28)] backdrop-blur ${tone}`}
        ref={(node) => {
          profileHubRowTitleRefs.current[layer] = node;
        }}
        style={getProfileHubRowTitleStyle(
          layer,
          centerPercent,
          fallbackCardHeight,
        )}
      >
        <div className="text-[9px] font-black uppercase tracking-[0.16em]">
          {label}
        </div>
        {indicator ? (
          <div className="mt-1 flex items-center justify-center gap-1.5">
            {Array.from({ length: indicator.count }).map((_, index) => (
              <span
                aria-hidden="true"
                className={`h-1.5 rounded-full transition ${
                  index === indicator.activeIndex
                    ? `w-5 ${indicator.activeClassName}`
                    : `w-1.5 ${indicator.inactiveClassName}`
                }`}
                key={`${label}-row-title-indicator-${index}`}
              />
            ))}
          </div>
        ) : null}
        <div className="mt-1 text-[10px] font-bold leading-4 text-slate-300">
          {helper}
        </div>
      </div>
    );
    const renderProfileHubOrbitCard = ({
      activeIndex,
      centerPercent,
      focusTone,
      index,
      item,
      itemCount,
      layer,
      orbitXSlots,
      pointerMovedRef,
      setActiveIndex,
    }: {
      activeIndex: number;
      centerPercent: number;
      focusTone: "amber" | "cyan";
      index: number;
      item: ProfileHubOrbitItem;
      itemCount: number;
      layer: number;
      orbitXSlots: number[];
      pointerMovedRef: { current: boolean };
      setActiveIndex: (index: number) => void;
    }) => {
      const distance = getProfileHubOrbitDistance(index, activeIndex, itemCount);
      const absDistance = Math.abs(distance);
      const clampedDistance = Math.max(
        -1 * (orbitXSlots.length - 1),
        Math.min(orbitXSlots.length - 1, distance),
      );
      const isActive = distance === 0;
      const x =
        Math.sign(clampedDistance) *
        orbitXSlots[Math.min(absDistance, orbitXSlots.length - 1)];
      const horizontalMotionOffset =
        activeProfileHubLayer === layer ? profileHubHorizontalMotionOffset : 0;
      const isPreviewingHorizontalMotion = horizontalMotionOffset !== 0;
      const y = absDistance * 18 + (absDistance > 1 ? 8 : 0);
      const scale = isActive ? 1.04 : absDistance === 1 ? 0.82 : 0.64;
      const opacity = isActive ? 1 : absDistance === 1 ? 0.76 : 0.38;
      const depth = isActive ? 64 : 28 - absDistance * 11;
      const rotateY = clampedDistance * -18;
      const zIndex = 40 - absDistance;
      const detailsKey = `${layer}-${item.label}`;
      const detailsOpen = openProfileHubDetailKey === detailsKey;
      const detailsId = `profile-hub-details-${layer}-${item.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}`;
      const isAchievementCard = Boolean(item.achievements?.length);
      const primaryAchievement = item.achievements?.[0];
      const achievementPreviewItems =
        item.achievements?.slice(0, isActive ? 3 : 2) || [];
      const visibleReferences = item.references.slice(0, isActive ? 3 : 2);
      const activeWidth = isAchievementCard ? 356 : layer === 1 ? 324 : 316;
      const inactiveWidth = isAchievementCard ? 206 : layer === 1 ? 190 : 186;
      const cardTone = isAchievementCard
        ? "border-amber-200/32 bg-[radial-gradient(circle_at_18%_0%,rgba(250,204,21,0.16),transparent_38%),radial-gradient(circle_at_92%_14%,rgba(34,211,238,0.12),transparent_34%),rgba(15,23,42,0.72)] text-amber-50"
        : item.tone;

      return (
        <div
          aria-current={isActive ? "page" : undefined}
          className={`absolute left-1/2 cursor-pointer rounded-[28px] border text-left shadow-[0_18px_44px_rgba(0,0,0,0.38)] outline-none backdrop-blur transition-[transform,opacity,filter,border-color,background-color,box-shadow,width,padding] will-change-[transform,opacity,filter,width] hover:border-white/25 focus-visible:ring-2 ${
            focusTone === "cyan"
              ? "focus-visible:ring-cyan-100/50"
              : "focus-visible:ring-amber-100/50"
          } ${
            isPreviewingHorizontalMotion
              ? "duration-100 ease-out"
              : "duration-[520ms] ease-[cubic-bezier(0.2,0.85,0.25,1)]"
          } ${
            isActive
              ? `p-5 ${
                  focusTone === "cyan"
                    ? "ring-2 ring-cyan-100/30"
                    : "ring-2 ring-amber-100/30"
                }`
              : "p-4"
          } ${cardTone}`}
          key={item.label}
          onClick={() => {
            if (
              pointerMovedRef.current ||
              profileHubLayerPointerMovedRef.current
            ) {
              pointerMovedRef.current = false;
              profileHubLayerPointerMovedRef.current = false;
              return;
            }

            if (!isActive) {
              setActiveIndex(index);
              return;
            }

            activateProfileHubItem(item);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;

            event.preventDefault();

            if (!isActive) {
              setActiveIndex(index);
              return;
            }

            activateProfileHubItem(item);
          }}
          ref={(node) => {
            if (isActive) {
              profileHubLayerCardRefs.current[layer] = node;
            }
          }}
          role="menuitem"
          style={{
            filter: absDistance > 2 ? "blur(1.5px)" : "none",
            opacity,
            top: `${centerPercent}%`,
            transform: `translate(-50%, -50%) translateX(${x + horizontalMotionOffset}px) translateY(${y}px) rotateY(${rotateY}deg) translateZ(${depth}px) scale(${scale})`,
            width: isActive
              ? `min(84vw, ${activeWidth}px)`
              : `${inactiveWidth}px`,
            zIndex,
          }}
          tabIndex={0}
        >
          <div className="flex items-start gap-3">
            {primaryAchievement ? (
              <div
                aria-hidden="true"
                className={`group/badge -ml-1 -mt-2 shrink-0 transition ${
                  isActive ? "scale-90" : "scale-75"
                }`}
              >
                <SoundLogoAchievementBadge compact item={primaryAchievement} />
              </div>
            ) : (
              <div
                aria-hidden="true"
                className={`grid shrink-0 place-items-center rounded-2xl border border-white/12 bg-slate-950/42 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${
                  isActive ? "h-12 w-12" : "h-10 w-10"
                }`}
              >
                <SelectorIcon
                  name={item.icon}
                  className={isActive ? "h-6 w-6" : "h-5 w-5"}
                />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white">
                {item.label}
              </div>
              <div className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.12em] text-current/80">
                {item.stat}
              </div>
            </div>
          </div>
          <div
            className={`mt-3 font-semibold text-slate-300 ${
              isActive
                ? "line-clamp-3 text-xs leading-5"
                : "line-clamp-2 text-[10px] leading-4"
            }`}
          >
            {item.helper}
          </div>
          {isAchievementCard ? (
            <div
              className={`mt-3 overflow-hidden rounded-2xl border border-amber-200/18 bg-amber-300/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${
                isActive ? "p-3" : "px-2 py-2"
              }`}
            >
              {isActive ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-100/75">
                    Profile Rewards
                  </span>
                  <span className="rounded-full border border-amber-100/28 bg-amber-300/12 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-amber-50">
                    {soundPoints.toLocaleString()} pts
                  </span>
                </div>
              ) : null}
              <div
                className={`flex items-start ${
                  isActive ? "mt-3 justify-center gap-3" : "justify-center gap-1.5"
                }`}
              >
                {achievementPreviewItems.map((achievement) => (
                  <div
                    className="group/badge flex min-w-0 flex-col items-center text-center"
                    key={achievement.label}
                  >
                    <SoundLogoAchievementBadge compact item={achievement} />
                    {isActive ? (
                      <span className="mt-1 max-w-[76px] truncate text-[8px] font-black uppercase tracking-[0.08em] text-white/75">
                        {achievement.label}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-3">
            <button
              aria-controls={detailsId}
              aria-expanded={detailsOpen}
              className={`font-black uppercase tracking-[0.12em] text-slate-100 transition ${
                detailsOpen
                  ? `ml-auto flex h-7 w-7 items-center justify-center border-0 bg-transparent p-0 ${
                      focusTone === "cyan"
                        ? "text-cyan-100 hover:text-white"
                        : "text-amber-100 hover:text-white"
                    }`
                  : `flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-950/34 hover:bg-slate-950/52 ${
                      focusTone === "cyan"
                        ? "hover:border-cyan-100/34"
                        : "hover:border-amber-100/34"
                    } ${isActive ? "px-3 py-2 text-[9px]" : "px-2.5 py-1.5 text-[8px]"}`
              }`}
              onClick={(event) => {
                event.stopPropagation();
                setOpenProfileHubDetailKey((openKey) =>
                  openKey === detailsKey ? null : detailsKey,
                );
              }}
              onKeyDown={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              type="button"
            >
              <span className={detailsOpen ? "sr-only" : ""}>Details</span>
              <span
                aria-hidden="true"
                className={`text-[10px] transition ${detailsOpen ? "rotate-180" : ""}`}
              >
                v
              </span>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ${
                detailsOpen ? "mt-2 max-h-44 opacity-100" : "max-h-0 opacity-0"
              }`}
              id={detailsId}
            >
              <div className="grid gap-2">
                {visibleReferences.map((reference) => (
                  <span
                    className={`border-0 bg-transparent font-black text-slate-100 ${
                      isActive
                        ? "px-1 py-1 text-[10px]"
                        : "truncate px-1 py-0.5 text-[8px]"
                    }`}
                    key={reference}
                  >
                    {reference}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {isActive ? (
            <button
              className={`mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/36 px-3 py-2 text-center text-[9px] font-black uppercase tracking-[0.14em] text-white transition ${
                focusTone === "cyan"
                  ? "hover:border-cyan-100/34 hover:bg-cyan-300/10"
                  : "hover:border-amber-100/34 hover:bg-amber-300/10"
              }`}
              onClick={(event) => {
                event.stopPropagation();
                activateProfileHubItem(item);
              }}
              onPointerDown={(event) => event.stopPropagation()}
              type="button"
            >
              {item.buttonLabel || (layer === 2 ? "Open Account" : "Open Hub")}
            </button>
          ) : null}
        </div>
      );
    };
    const renderProfileHubOverlay = () => {
      const profileAvatar =
        profile.profileImage ||
        profile.avatarUrl ||
        authFallback.avatarUrl ||
        "/sound-fitness-logo.png";

      return profileHubMounted && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                aria-label="Close profile hub overlay"
                className={`fixed inset-x-0 bottom-0 top-[84px] z-[80] cursor-default bg-black/85 backdrop-blur-[10px] transition-opacity duration-[420ms] ease-[cubic-bezier(0.2,0.85,0.25,1)] before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.16),transparent_28%),radial-gradient(circle_at_78%_26%,rgba(250,204,21,0.10),transparent_24%)] ${
                  profileHubOpen
                    ? "pointer-events-auto opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
                onClick={closeProfileHub}
                type="button"
              />
              <div
                aria-hidden={!profileHubOpen}
                className={`pointer-events-none fixed inset-x-0 bottom-0 top-[84px] z-[90] w-screen overflow-hidden bg-transparent px-0 pb-0 pt-0 transition-[opacity,transform,filter] duration-[420ms] ease-[cubic-bezier(0.2,0.85,0.25,1)] [perspective:1500px] [transform-style:preserve-3d] ${
                  profileHubOpen
                    ? "scale-100 opacity-100 blur-0"
                    : "scale-[0.985] opacity-0 blur-sm"
                }`}
                id="profile-hub-orbital-overlay"
                ref={profileHubOverlayRef}
                role="menu"
              >
                <button
                  aria-label="Close profile hub"
                  className={`absolute right-4 top-4 z-40 grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-slate-950/70 text-sm font-black text-slate-200 shadow-[0_0_24px_rgba(0,0,0,0.24)] transition hover:border-red-200/35 hover:bg-red-500/12 hover:text-red-100 ${
                    profileHubOpen ? "pointer-events-auto" : "pointer-events-none"
                  }`}
                  onClick={closeProfileHub}
                  type="button"
                >
                  X
                </button>
                <div
                  className={`relative mt-0 h-[calc(100dvh-84px)] w-screen cursor-grab select-none overflow-hidden rounded-none border-0 bg-transparent p-0 shadow-none [perspective:1500px] [touch-action:none] [transform-style:preserve-3d] active:cursor-grabbing ${
                    profileHubOpen ? "pointer-events-auto" : "pointer-events-none"
                  }`}
                  onPointerCancel={handleProfileHubLayerPointerEnd}
                  onPointerDown={handleProfileHubLayerPointerDown}
                  onPointerMove={handleProfileHubLayerPointerMove}
                  onPointerUp={handleProfileHubLayerPointerEnd}
                  onWheel={handleProfileHubLayerWheel}
                  style={profileHubLayerMotionStyle}
                >
                  <div className="absolute right-3 top-1/2 z-50 flex -translate-y-1/2 flex-col items-center gap-2">
                    <button
                      aria-label="Move profile hub layer up"
                      className={`grid h-10 w-10 place-items-center rounded-full border text-lg font-black shadow-[0_0_24px_rgba(0,0,0,0.28)] transition active:scale-95 ${
                        activeProfileHubLayer > 0
                          ? "border-cyan-100/45 bg-cyan-300/18 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.22)]"
                          : "border-white/12 bg-slate-950/72 text-slate-500 opacity-60"
                      }`}
                      onClick={() => rotateProfileHubLayer("up")}
                      onPointerDown={(event) => event.stopPropagation()}
                      type="button"
                    >
                      ^
                    </button>
                    <div
                      aria-label="Profile hub row menu"
                      className="flex w-[92px] flex-col gap-1 rounded-[22px] border border-white/10 bg-slate-950/48 p-1.5 shadow-[0_0_24px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:w-[104px]"
                    >
                      {profileHubLayerMenuItems.map((item) => {
                        const isActive = item.layer === activeProfileHubLayer;
                        const activeTone =
                          item.layer === 2
                            ? "border-amber-100/45 bg-amber-300/18 text-amber-50 shadow-[0_0_18px_rgba(250,204,21,0.18)]"
                            : "border-cyan-100/45 bg-cyan-300/18 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.20)]";

                        return (
                          <button
                            aria-current={isActive ? "step" : undefined}
                            aria-label={`Show ${item.label}`}
                            className={`rounded-2xl border px-2 py-1.5 text-center text-[8px] font-black uppercase leading-tight tracking-[0.1em] transition hover:-translate-y-0.5 active:scale-95 ${
                              isActive
                                ? activeTone
                                : "border-white/8 bg-white/[0.035] text-slate-400 hover:border-cyan-100/28 hover:bg-cyan-300/8 hover:text-cyan-100"
                            }`}
                            key={`profile-hub-layer-menu-${item.layer}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              selectProfileHubLayer(item.layer);
                            }}
                            onPointerDown={(event) => event.stopPropagation()}
                            type="button"
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      aria-label="Move profile hub layer down"
                      className={`grid h-10 w-10 place-items-center rounded-full border text-lg font-black shadow-[0_0_24px_rgba(0,0,0,0.28)] transition active:scale-95 ${
                        activeProfileHubLayer < 2
                          ? "border-amber-100/45 bg-amber-300/18 text-amber-50 shadow-[0_0_24px_rgba(250,204,21,0.20)]"
                          : "border-white/12 bg-slate-950/72 text-slate-500 opacity-60"
                      }`}
                      onClick={() => rotateProfileHubLayer("down")}
                      onPointerDown={(event) => event.stopPropagation()}
                      type="button"
                    >
                      v
                    </button>
                  </div>
                  <div
                    className={`absolute inset-0 h-full overflow-hidden rounded-none border-0 bg-transparent p-4 shadow-none transition-[transform,opacity,filter] duration-[560ms] ease-[cubic-bezier(0.2,0.85,0.25,1)] [transform-style:preserve-3d] ${
                      activeProfileHubLayer === 0
                        ? "z-30 translate-y-[var(--profile-hub-layer-offset)] scale-100 opacity-100 blur-0"
                        : activeProfileHubLayer === 1
                          ? "pointer-events-none z-20 translate-y-[calc(-10%+var(--profile-hub-layer-offset))] scale-[0.94] opacity-75 blur-0"
                          : "pointer-events-none z-0 translate-y-[calc(-64%+var(--profile-hub-layer-offset))] scale-[0.84] opacity-0 blur-sm"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 top-[35%] h-[210px] w-[min(86vw,1040px)] -translate-x-1/2 -translate-y-1/2 rounded-[42px] bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.13),rgba(15,23,42,0.16)_44%,transparent_72%)] blur-xl"
                    />
                    <div className="absolute inset-x-0 top-[34%] z-20 flex -translate-y-1/2 justify-center px-6 [transform:translateY(-50%)_translateZ(58px)]">
                      <button
                        className="grid w-[min(90vw,1040px)] gap-5 rounded-[32px] border border-cyan-100/22 bg-slate-950/76 p-6 text-left shadow-[0_28px_74px_rgba(0,0,0,0.44),0_0_34px_rgba(34,211,238,0.12)] transition hover:scale-[1.01] hover:border-cyan-100/40 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                        onClick={() => {
                          if (profileHubLayerPointerMovedRef.current) {
                            profileHubLayerPointerMovedRef.current = false;
                            return;
                          }

                          closeProfileHub();
                          jumpProfileOrbiterToHero();
                        }}
                        ref={(node) => {
                          profileHubLayerCardRefs.current[0] = node;
                        }}
                        role="menuitem"
                        type="button"
                      >
                        <div className="flex min-w-0 items-center gap-5">
                          <img
                            alt={`${identityDisplayName} profile`}
                            className="h-16 w-16 rounded-full border border-cyan-100/30 bg-slate-950 object-cover p-1 shadow-[0_0_28px_rgba(34,211,238,0.18)]"
                            src={profileAvatar}
                          />
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100">
                              Profile Reward Hub
                            </p>
                            <p className="mt-1 truncate text-xl font-black text-white">
                              {identityDisplayName}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-slate-400">
                              Profile, rewards, coach context, and account controls.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {[
                                `Member since ${memberSinceLabel}`,
                                `${profileHubCompletion}% profile`,
                                planReadiness.readinessLabel,
                                profile.appPersonalization.defaultDashboardFocus,
                              ].map((reference) => (
                                <span
                                  className="rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-200"
                                  key={reference}
                                >
                                  {reference}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="grid w-full shrink-0 gap-2 sm:grid-cols-2 md:w-[264px]">
                          <div className="rounded-2xl border border-amber-200/22 bg-amber-300/10 px-4 py-3">
                            <div className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-100/70">
                              Sound Points
                            </div>
                            <div className="text-xl font-black text-white">
                              {soundPoints.toLocaleString()}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-cyan-200/18 bg-cyan-300/10 px-4 py-3">
                            <div className="text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100/70">
                              Sound Tokens
                            </div>
                            <div className="flex items-center gap-2 text-xl font-black text-white">
                              <img
                                alt=""
                                aria-hidden="true"
                                className="h-5 w-5 rounded-full object-contain"
                                src="/sound-fitness-logo.png"
                              />
                              {soundTokens.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                  <div
                    className={`absolute inset-0 h-full cursor-grab select-none overflow-hidden rounded-none border-0 bg-transparent p-4 shadow-none transition-[transform,opacity,filter] duration-[560ms] ease-[cubic-bezier(0.2,0.85,0.25,1)] [touch-action:none] [transform-style:preserve-3d] active:cursor-grabbing ${
                      activeProfileHubLayer === 1
                        ? "z-30 translate-y-[var(--profile-hub-layer-offset)] scale-100 opacity-100 blur-0"
                        : activeProfileHubLayer < 1
                          ? "pointer-events-none z-10 translate-y-[calc(42%+var(--profile-hub-layer-offset))] scale-[0.9] opacity-40 blur-[1px]"
                          : "pointer-events-none z-10 translate-y-[calc(-54%+var(--profile-hub-layer-offset))] scale-[0.9] opacity-40 blur-[1px]"
                    }`}
                    data-profile-hub-horizontal-orbit="true"
                    onPointerCancel={(event) =>
                      finishProfileHubHorizontalDrag(
                        event,
                        profileHubMainOrbitPointerStartRef,
                        profileHubMainOrbitPointerMovedRef,
                      )
                    }
                    onPointerDown={(event) =>
                      startProfileHubHorizontalDrag(
                        event,
                        profileHubMainOrbitPointerStartRef,
                        profileHubMainOrbitPointerMovedRef,
                        false,
                      )
                    }
                    onPointerMove={(event) =>
                      moveProfileHubHorizontalDrag(
                        event,
                        profileHubMainOrbitPointerStartRef,
                        profileHubMainOrbitPointerMovedRef,
                        rotateProfileHubOrbit,
                      )
                    }
                    onPointerUp={(event) =>
                      finishProfileHubHorizontalDrag(
                        event,
                        profileHubMainOrbitPointerStartRef,
                        profileHubMainOrbitPointerMovedRef,
                      )
                    }
                    onWheel={(event) =>
                      handleProfileHubHorizontalWheel(event, rotateProfileHubOrbit)
                    }
                  >
                    {renderProfileHubRowTitle(
                      1,
                      "My Hub Row",
                      "Profile stats, body context, readiness, plan, and coach notes.",
                      "border-cyan-200/24 bg-cyan-300/10 text-cyan-100",
                      55,
                      324,
                      {
                        activeClassName:
                          "bg-cyan-200 shadow-[0_0_14px_rgba(103,232,249,0.58)]",
                        activeIndex: activeProfileHubIndex,
                        count: profileHubMainItems.length,
                        inactiveClassName:
                          "bg-cyan-300/35 shadow-[0_0_5px_rgba(34,211,238,0.18)]",
                      },
                    )}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 top-[55%] h-[230px] w-[min(88vw,1120px)] -translate-x-1/2 -translate-y-1/2 rounded-[46px] bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.11),rgba(99,102,241,0.08)_42%,transparent_74%)] blur-xl"
                    />
                    {profileHubMainItems.map((item, index) =>
                      renderProfileHubOrbitCard({
                        activeIndex: activeProfileHubIndex,
                        centerPercent: 55,
                        focusTone: "cyan",
                        index,
                        item,
                        itemCount: profileHubMainItems.length,
                        layer: 1,
                        orbitXSlots: [0, 252, 400, 520],
                        pointerMovedRef: profileHubMainOrbitPointerMovedRef,
                        setActiveIndex: setActiveProfileHubIndex,
                      }),
                    )}
                    {activeProfileHubLayer === 1 ? (
                      <div
                        className="pointer-events-auto absolute left-1/2 z-30 flex -translate-x-1/2 items-center gap-2"
                        style={{ top: "calc(55% + 180px)" }}
                      >
                        {profileHubMainItems.map((item, index) => (
                          <button
                            aria-label={`Show ${item.label}`}
                            className={`h-2 rounded-full transition ${
                              index === activeProfileHubIndex
                                ? "w-8 bg-cyan-200 shadow-[0_0_14px_rgba(103,232,249,0.58)]"
                                : "w-2 bg-slate-500/55 hover:bg-amber-200/75"
                            }`}
                            key={item.label}
                            onClick={() => setActiveProfileHubIndex(index)}
                            type="button"
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div
                    className={`absolute inset-0 h-full cursor-grab select-none overflow-hidden rounded-none border-0 bg-transparent p-4 shadow-none transition-[transform,opacity,filter] duration-[560ms] ease-[cubic-bezier(0.2,0.85,0.25,1)] [touch-action:none] [transform-style:preserve-3d] active:cursor-grabbing ${
                      activeProfileHubLayer === 2
                        ? "z-30 translate-y-[var(--profile-hub-layer-offset)] scale-100 opacity-100 blur-0"
                        : activeProfileHubLayer === 1
                          ? "pointer-events-none z-10 translate-y-[calc(56%+var(--profile-hub-layer-offset))] scale-[0.9] opacity-40 blur-[1px]"
                          : "pointer-events-none z-0 translate-y-[calc(64%+var(--profile-hub-layer-offset))] scale-[0.84] opacity-0 blur-sm"
                    }`}
                    data-profile-hub-horizontal-orbit="true"
                    onPointerCancel={(event) =>
                      finishProfileHubHorizontalDrag(
                        event,
                        profileHubAccountOrbitPointerStartRef,
                        profileHubAccountOrbitPointerMovedRef,
                      )
                    }
                    onPointerDown={(event) =>
                      startProfileHubHorizontalDrag(
                        event,
                        profileHubAccountOrbitPointerStartRef,
                        profileHubAccountOrbitPointerMovedRef,
                        false,
                      )
                    }
                    onPointerMove={(event) =>
                      moveProfileHubHorizontalDrag(
                        event,
                        profileHubAccountOrbitPointerStartRef,
                        profileHubAccountOrbitPointerMovedRef,
                        rotateProfileHubAccountOrbit,
                      )
                    }
                    onPointerUp={(event) =>
                      finishProfileHubHorizontalDrag(
                        event,
                        profileHubAccountOrbitPointerStartRef,
                        profileHubAccountOrbitPointerMovedRef,
                      )
                    }
                    onWheel={(event) =>
                      handleProfileHubHorizontalWheel(
                        event,
                        rotateProfileHubAccountOrbit,
                      )
                    }
                  >
                    {renderProfileHubRowTitle(
                      2,
                      "Account Row",
                      "Settings, billing, help, achievements, and logout.",
                      "border-amber-200/24 bg-amber-300/10 text-amber-100",
                      54,
                      316,
                      {
                        activeClassName:
                          "bg-amber-200 shadow-[0_0_14px_rgba(253,230,138,0.58)]",
                        activeIndex: activeProfileHubAccountIndex,
                        count: profileHubAccountItems.length,
                        inactiveClassName:
                          "bg-amber-300/35 shadow-[0_0_5px_rgba(251,191,36,0.18)]",
                      },
                    )}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 top-[54%] h-[204px] w-[min(84vw,1000px)] -translate-x-1/2 -translate-y-1/2 rounded-[42px] bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.10),rgba(34,211,238,0.07)_44%,transparent_74%)] blur-xl"
                    />
                    {profileHubAccountItems.map((item, index) =>
                      renderProfileHubOrbitCard({
                        activeIndex: activeProfileHubAccountIndex,
                        centerPercent: 54,
                        focusTone: "amber",
                        index,
                        item,
                        itemCount: profileHubAccountItems.length,
                        layer: 2,
                        orbitXSlots: [0, 250, 390],
                        pointerMovedRef: profileHubAccountOrbitPointerMovedRef,
                        setActiveIndex: setActiveProfileHubAccountIndex,
                      }),
                    )}
                    {activeProfileHubLayer === 2 ? (
                      <>
                        <div
                          className="pointer-events-auto absolute left-1/2 z-30 flex w-[min(84vw,316px)] -translate-x-1/2"
                          style={{ top: "calc(54% + 192px)" }}
                        >
                          <button
                            className="flex min-h-[50px] w-full items-center justify-center gap-3 rounded-2xl border border-red-300/24 bg-red-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-red-100 shadow-[0_18px_44px_rgba(0,0,0,0.26)] backdrop-blur transition hover:-translate-y-0.5 hover:border-red-200/45 hover:bg-red-500/16 active:scale-[0.98]"
                            onClick={signOutFromProfileHub}
                            onPointerDown={(event) => event.stopPropagation()}
                            type="button"
                          >
                            <svg
                              aria-hidden="true"
                              className="h-4 w-4 shrink-0"
                              fill="none"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2.2"
                              viewBox="0 0 24 24"
                            >
                              <path d="M10 17l5-5-5-5" />
                              <path d="M15 12H3" />
                              <path d="M21 5v14a2 2 0 0 1-2 2h-7" />
                              <path d="M12 3h7a2 2 0 0 1 2 2" />
                            </svg>
                            Log Out
                          </button>
                        </div>
                        <div
                          className="pointer-events-auto absolute left-1/2 z-30 flex -translate-x-1/2 items-center"
                          style={{ top: "calc(54% + 258px)" }}
                        >
                          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/34 px-3 py-2">
                            {profileHubAccountItems.map((item, index) => (
                              <button
                                aria-label={`Show ${item.label}`}
                                className={`h-2 rounded-full transition ${
                                  index === activeProfileHubAccountIndex
                                    ? "w-8 bg-amber-200 shadow-[0_0_14px_rgba(253,230,138,0.58)]"
                                    : "w-2 bg-slate-500/55 hover:bg-cyan-200/75"
                                }`}
                                key={item.label}
                                onClick={() =>
                                  setActiveProfileHubAccountIndex(index)
                                }
                                type="button"
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </>,
            document.body,
          )
        : null;
    };
    const renderProfileOrbiterTopMenu = () => {
      const profileAvatar =
        profile.profileImage ||
        profile.avatarUrl ||
        authFallback.avatarUrl ||
        "/sound-fitness-logo.png";

      return (
        <>
        <div className="relative left-1/2 z-[100] mb-0 w-screen -translate-x-1/2 overflow-hidden border-b border-cyan-100/18 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(251,191,36,0.10),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.78),rgba(2,6,23,0.64))] shadow-[0_20px_70px_rgba(0,0,0,0.34),0_0_34px_rgba(34,211,238,0.10),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-cyan-100/55 to-transparent"
          />
          <div className="relative mx-auto flex min-h-[84px] w-full max-w-[1840px] items-center gap-4 px-3 py-3 sm:px-4 sm:py-4 md:px-6 xl:px-8 2xl:px-10">
            <Link
              aria-label="Open Sound Fitness dashboard"
              className="flex min-h-[58px] min-w-0 shrink-0 items-center gap-3 rounded-[24px] border border-transparent bg-transparent px-2.5 py-2 transition hover:border-cyan-100/24 hover:bg-cyan-300/8"
              href={ROUTES.dashboard.home}
            >
              <img
                alt="Sound Fitness"
                className="h-10 w-10 shrink-0 rounded-full object-contain"
                src="/sound-fitness-logo.png"
              />
              <span className="hidden min-w-0 leading-[0.9] sm:block">
                <span className="block text-sm font-black uppercase tracking-[0.12em] text-white">
                  Sound
                </span>
                <span className="block text-[9px] font-black uppercase tracking-[0.34em] text-cyan-300">
                  Fitness
                </span>
              </span>
              <span className="hidden rounded-full border border-cyan-200/28 bg-cyan-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-cyan-100 lg:inline-flex">
                {profile.memberType || "Member"}
              </span>
            </Link>

            <div className="min-w-0 flex-1" />

            <div
              aria-label="Dashboard selector"
              className="flex w-fit max-w-[calc(100vw-7.5rem)] shrink-0 select-none items-center gap-1.5 bg-transparent p-0 shadow-none md:max-w-[min(56vw,520px)] lg:max-w-none"
            >
              <button
                aria-label="Previous dashboard"
                className="grid h-11 w-9 shrink-0 place-items-center rounded-2xl border border-transparent bg-transparent text-xs font-black text-cyan-100/80 transition hover:-translate-x-0.5 hover:border-amber-200/28 hover:bg-amber-300/8 hover:text-amber-100 active:scale-95"
                onClick={() => rotateProfileDashboardRail("left")}
                type="button"
              >
                &lt;
              </button>
              <Link
                aria-current={
                  activeProfileDashboardLink.href === ROUTES.dashboard.profile
                    ? "page"
                    : undefined
                }
                className={`flex min-h-[58px] w-auto min-w-max shrink-0 items-center gap-3 rounded-[22px] border border-transparent bg-transparent px-2.5 py-2 text-left text-cyan-50 shadow-none transition hover:-translate-y-0.5 hover:bg-white/[0.04] ${
                  profileDashboardSlideDirection === "right"
                    ? "animate-[sessions-dashboard-chip-slide-from-right_220ms_ease-out]"
                    : "animate-[sessions-dashboard-chip-slide-from-left_220ms_ease-out]"
                }`}
                draggable={false}
                href={activeProfileDashboardLink.href}
                key={`${activeProfileDashboardLink.label}-${profileDashboardSlideDirection}`}
                onDragStart={(event) => event.preventDefault()}
              >
                <span
                  aria-hidden="true"
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_16px_rgba(255,255,255,0.06)] ${activeProfileDashboardLink.tone}`}
                >
                  <SelectorIcon
                    name={activeProfileDashboardLink.icon}
                    className="h-5 w-5"
                  />
                </span>
                <span className="shrink-0 whitespace-nowrap">
                  <span className="block text-[8px] font-black uppercase tracking-[0.14em] opacity-70">
                    {activeProfileDashboardLink.meta}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-black uppercase tracking-[0.12em] sm:text-[11px]">
                    {activeProfileDashboardLink.label}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-2xl border px-3 py-2 text-right ${activeProfileDashboardLink.tone}`}
                >
                  <span className="block text-[8px] font-black uppercase tracking-[0.1em] opacity-75">
                    pts
                  </span>
                  <span className="block text-sm font-black leading-none [text-shadow:0_1px_12px_rgba(0,0,0,0.34)]">
                    {activeProfileDashboardLink.points.toLocaleString()}
                  </span>
                </span>
              </Link>
              {activeProfileDashboardLink.href !== ROUTES.dashboard.goals ? (
                <Link
                  aria-label="Open Goals dashboard"
                  className={`group flex min-h-[58px] w-auto min-w-max shrink-0 items-center gap-2 rounded-[22px] border px-2.5 py-2 text-left shadow-[0_0_20px_rgba(251,191,36,0.08)] transition hover:-translate-y-0.5 ${profileGoalsDashboardLink.tone}`}
                  draggable={false}
                  href={profileGoalsDashboardLink.href}
                  onDragStart={(event) => event.preventDefault()}
                >
                  <span
                    aria-hidden="true"
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_16px_rgba(251,191,36,0.10)] ${profileGoalsDashboardLink.tone}`}
                  >
                    <SelectorIcon
                      name={profileGoalsDashboardLink.icon}
                      className="h-5 w-5"
                    />
                  </span>
                  <span className="hidden shrink-0 whitespace-nowrap sm:block">
                    <span className="block text-[8px] font-black uppercase tracking-[0.14em] opacity-70">
                      {profileGoalsDashboardLink.meta}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-black uppercase tracking-[0.12em] sm:text-[11px]">
                      {profileGoalsDashboardLink.label}
                    </span>
                  </span>
                </Link>
              ) : null}
              <button
                aria-label="Next dashboard"
                className="grid h-11 w-9 shrink-0 place-items-center rounded-2xl border border-transparent bg-transparent text-xs font-black text-cyan-100/80 transition hover:translate-x-0.5 hover:border-amber-200/28 hover:bg-amber-300/8 hover:text-amber-100 active:scale-95"
                onClick={() => rotateProfileDashboardRail("right")}
                type="button"
              >
                &gt;
              </button>
            </div>

            <button
              aria-controls="profile-hub-orbital-overlay"
              aria-expanded={profileHubOpen}
              aria-haspopup="menu"
              aria-label="Open profile hub"
              className="hidden min-h-[58px] shrink-0 items-center gap-3 rounded-[22px] border border-transparent bg-transparent px-2 py-2 text-left text-slate-200 shadow-none transition hover:-translate-y-0.5 hover:bg-white/[0.04] md:flex"
              onClick={toggleProfileHub}
              type="button"
            >
              <img
                alt={`${identityDisplayName} profile`}
                className="h-10 w-10 rounded-full border border-cyan-200/28 bg-slate-950 object-cover p-0.5 shadow-[0_0_18px_rgba(34,211,238,0.14)]"
                src={profileAvatar}
              />
              <span className="hidden min-w-0 leading-none lg:block">
                <span className="block max-w-[110px] truncate text-[10px] font-black uppercase tracking-[0.12em] text-white">
                  {identityDisplayName}
                </span>
                <span className="mt-1 block text-[8px] font-black uppercase tracking-[0.14em] text-cyan-200/70">
                  Profile Hub
                </span>
              </span>
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="sr-only">Points</span>
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5 text-amber-200 drop-shadow-[0_0_12px_rgba(250,204,21,0.28)]"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M13.5 2 4.8 13.2h6.1L9.7 22 19.2 9.6h-6.4L13.5 2Z" />
                  </svg>
                  <span className="text-sm font-black leading-none text-white">
                    {soundPoints.toLocaleString()}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="sr-only">Tokens</span>
                  <img
                    alt=""
                    aria-hidden="true"
                    className="h-5 w-5 rounded-full border border-cyan-200/24 bg-slate-950 object-contain p-0.5 shadow-[0_0_12px_rgba(34,211,238,0.20)]"
                    src="/sound-fitness-logo.png"
                  />
                  <span className="text-sm font-black leading-none text-white">
                    {soundTokens.toLocaleString()}
                  </span>
                </span>
              </span>
            </button>
          </div>
        </div>
        {renderProfileHubOverlay()}
        </>
      );
    };
    const renderProfileRowHeader = (
      meta: { eyebrow: string; helper?: string; title: string },
      className = "",
      expanded = true,
      lifted = false,
      indicator?: {
        activeIndex: number;
        cards: ProfileOrbiterCard[];
        tabId: ProfileTab;
      },
    ) => {
      const showCardIndicator =
        expanded && Boolean(indicator) && (indicator?.cards.length || 0) > 0;
      const selectIndicatorCard = (index: number) => {
        if (!indicator) return;

        setProfileSectionOrbitIndex(indicator.tabId, index);
        setOpenProfileOrbiterDetails(null);

        if (expandedProfileOrbiterCard?.startsWith(`${indicator.tabId}-`)) {
          const nextCard = indicator.cards[index];
          setExpandedProfileOrbiterCard(
            nextCard?.expandsToFullCard ? `${indicator.tabId}-${index}` : null,
          );
        }
      };

      return (
        <div
          aria-expanded={expanded}
          className={`relative isolate z-[80] mx-auto grid overflow-hidden rounded-[22px] border bg-[radial-gradient(circle_at_50%_-20%,rgba(125,211,252,0.22),transparent_48%),linear-gradient(180deg,rgba(15,23,42,0.58),rgba(2,6,23,0.46))] text-center shadow-[0_20px_60px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-2xl transition-[width,max-width,padding,border-color,background-color,box-shadow,transform,opacity] duration-500 ease-[cubic-bezier(0.2,0.85,0.25,1)] ${
            expanded
              ? `w-[min(92vw,980px)] gap-2 border-cyan-100/24 px-4 ${showCardIndicator ? "pb-6 pt-3" : "py-3"} sm:grid-cols-[minmax(0,1fr)_minmax(0,24rem)_minmax(0,1fr)] sm:items-center sm:gap-4`
              : "w-[min(76vw,280px)] border-white/12 px-4 py-2.5 opacity-80"
          } ${lifted ? "-translate-y-3" : ""} ${className}`}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),transparent_38%),radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.12),transparent_42%),radial-gradient(circle_at_86%_18%,rgba(251,191,36,0.10),transparent_38%)]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-4 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-white/55 to-transparent"
          />
          {expanded ? (
            <div className="relative z-10 hidden min-w-0 justify-self-start text-left lg:block">
              <p
                className={`text-[10px] font-black uppercase tracking-[0.14em] ${
                  hasUnsavedChanges ? "text-orange-100" : "text-cyan-100"
                }`}
              >
                {hasUnsavedChanges ? "Unsaved changes" : "Profile synced"}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-500">
                Last saved: {formatSavedTime(profile.updatedAt)}
                {message ? ` - ${message}` : ""}
              </p>
            </div>
          ) : null}
          <div
            className={`relative z-10 min-w-0 justify-self-center text-center ${
              expanded ? "sm:col-start-2" : ""
            }`}
          >
            <p
              className={`whitespace-normal break-words font-black uppercase tracking-[0.14em] text-white transition-[font-size,line-height] duration-500 ${
                expanded ? "text-sm leading-5" : "text-center text-xs leading-4"
              }`}
            >
              {meta.title}
            </p>
          </div>
          {expanded ? (
            <div className="relative z-10 flex min-w-0 justify-center sm:col-start-3 sm:justify-self-end">
              <button
                type="button"
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  saveProfile();
                }}
                className="rounded-2xl border border-cyan-100/30 bg-cyan-300 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.22)] transition hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/50"
              >
                Save Profile
              </button>
            </div>
          ) : null}
          {showCardIndicator && indicator ? (
            <div className="absolute inset-x-0 bottom-1.5 z-10 flex justify-center">
              <div className="flex items-center gap-2">
                {indicator.cards.map((card, index) => {
                  const isActiveIndicator = indicator.activeIndex === index;
                  const pulseTone = getProfilePulseIndicatorTone(card.completion);

                  return (
                    <button
                      key={card.label}
                      type="button"
                      aria-label={`Show ${card.label}, ${card.completion}% complete`}
                      aria-pressed={isActiveIndicator}
                      data-profile-indicator-motion={pulseTone.motion}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        selectIndicatorCard(index);
                      }}
                      className={`profile-row-card-indicator inline-flex shrink-0 items-center justify-center rounded-full border bg-black/25 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-100/55 ${
                        isActiveIndicator
                          ? `h-3.5 w-3.5 ${pulseTone.outerActive}`
                          : `h-3 w-3 ${pulseTone.outerInactive}`
                      }`}
                      style={pulseTone.style}
                    >
                      <span
                        aria-hidden="true"
                        data-profile-pulse-dot="true"
                        className={`rounded-full ${
                          isActiveIndicator ? pulseTone.dotActive : pulseTone.dotInactive
                        } ${
                          isActiveIndicator ? "h-2 w-2" : "h-1.5 w-1.5"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      );
    };

    return (
      <section
        id="profile-orbiter"
        ref={profileOrbiterRef}
        aria-label="Profile orbiter"
        className="relative left-1/2 w-screen -translate-x-1/2 pt-0 scroll-mt-28"
      >
        {renderProfileOrbiterTopMenu()}
        {clampedActiveProfileOrbiterRow === 0 || activeProfileCardRow ? null : (
          renderProfileRowHeader(
            activeProfileOrbiterMeta,
            "absolute inset-x-0 top-2 mx-auto",
          )
        )}
        <div
          className="absolute right-0 top-1/2 z-[90] flex w-40 -translate-y-1/2 justify-end px-1 py-6 sm:right-1 sm:w-44"
          onBlurCapture={(event) => {
            const nextTarget = event.relatedTarget;
            if (
              nextTarget instanceof Node &&
              event.currentTarget.contains(nextTarget)
            ) {
              return;
            }

            collapseProfileOrbiterRail();
          }}
          onFocusCapture={expandProfileOrbiterRail}
          onPointerEnter={expandProfileOrbiterRail}
          onPointerLeave={collapseProfileOrbiterRail}
        >
          <div
            className={`flex flex-col items-center gap-1.5 rounded-2xl border p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl transition-[width,opacity,background-color,border-color,box-shadow] duration-300 ease-out ${
              profileOrbiterRailExpanded
                ? "w-full border-cyan-200/18 bg-slate-950/62 opacity-100 shadow-[0_18px_60px_rgba(0,0,0,0.42)]"
                : "w-12 border-white/8 bg-slate-950/35 opacity-70"
            }`}
          >
            <button
              type="button"
              aria-label="Scroll profile orbiter to hero"
              disabled={profileOrbiterLocked}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (profileOrbiterLocked) return;
                jumpProfileOrbiterToHero("auto");
              }}
              onClick={scrollProfileOrbiterToHero}
              className="grid h-8 w-8 place-items-center rounded-xl border border-cyan-200/18 bg-cyan-300/10 text-sm font-black text-cyan-100 transition hover:border-cyan-200/45 hover:bg-cyan-300/16 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-cyan-200/18 disabled:hover:bg-cyan-300/10"
            >
              ^
            </button>
            <div className="flex w-full flex-col gap-1">
              {profileOrbiterRows.map((row, index) => {
                const isActiveRow = clampedActiveProfileOrbiterRow === index;
                const rowTone = getCompletionIndicatorTone(row.completion);
                const pulseTone = getProfilePulseIndicatorTone(row.completion);

                return (
                  <button
                    key={row.title}
                    type="button"
                    aria-label={`Show profile orbiter row ${index}: ${row.title}, ${row.completion}% complete`}
                    aria-pressed={isActiveRow}
                    disabled={profileOrbiterLocked}
                    onClick={() => setProfileOrbiterRow(index)}
                    className={`flex min-h-7 w-full items-center gap-2 overflow-hidden rounded-xl border px-1.5 py-1 text-[8px] font-black uppercase leading-[0.65rem] tracking-[0.05em] transition ${
                      profileOrbiterRailExpanded
                        ? "justify-start"
                        : "justify-center"
                    } ${
                      isActiveRow
                        ? rowTone.activeButton
                        : "border-white/8 bg-white/[0.025] text-slate-400 hover:border-orange-200/28 hover:bg-orange-300/10 hover:text-orange-100"
                    } disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-white/10 disabled:hover:bg-white/[0.035] disabled:hover:text-slate-400`}
                  >
                    <span
                      aria-hidden="true"
                      data-active={isActiveRow ? "true" : "false"}
                      data-profile-indicator-motion={pulseTone.motion}
                      className={`profile-row-card-indicator inline-flex shrink-0 items-center justify-center rounded-full border bg-black/25 transition ${
                        isActiveRow
                          ? `h-3.5 w-3.5 ${pulseTone.outerActive}`
                          : `h-3 w-3 ${pulseTone.outerInactive}`
                      }`}
                      style={pulseTone.style}
                    >
                      <span
                        aria-hidden="true"
                        data-profile-pulse-dot="true"
                        className={`rounded-full ${
                          isActiveRow ? pulseTone.dotActive : pulseTone.dotInactive
                        } ${
                          isActiveRow ? "h-2 w-2" : "h-1.5 w-1.5"
                        }`}
                      />
                    </span>
                    <span
                      className={`overflow-hidden whitespace-normal text-left transition-[max-width,opacity] duration-300 ${
                        profileOrbiterRailExpanded
                          ? "max-w-[6.8rem] opacity-100"
                          : "max-w-0 opacity-0"
                      }`}
                    >
                      {row.title}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              aria-label="Scroll profile orbiter down"
              disabled={
                profileOrbiterLocked ||
                clampedActiveProfileOrbiterRow === profileOrbiterRows.length - 1
              }
              onClick={() => scrollProfileOrbiterRow(1)}
              className="grid h-8 w-8 place-items-center rounded-xl border border-orange-200/18 bg-orange-300/10 text-sm font-black text-orange-100 transition hover:border-orange-200/45 hover:bg-orange-300/16 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-orange-200/18 disabled:hover:bg-orange-300/10"
            >
              v
            </button>
          </div>
        </div>

        <div
          ref={profileOrbiterViewportRef}
          aria-label="Profile orbiter rows and cards"
          className={`relative h-[calc(100dvh-84px)] min-h-[640px] max-h-none cursor-grab select-none overscroll-y-auto scroll-smooth snap-y snap-mandatory [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden ${
            profileOrbiterLocked ? "overflow-y-hidden" : "overflow-y-auto"
          }`}
          style={{
            height: "calc(100dvh - 84px)",
            minHeight: 640,
          }}
          onClickCapture={(event) => {
            if (!profileOrbiterPointerMovedRef.current) return;

            event.preventDefault();
            event.stopPropagation();
            profileOrbiterPointerMovedRef.current = false;
          }}
          onKeyDown={handleProfileOrbiterKeyDown}
          onPointerCancel={finishProfileOrbiterDrag}
          onPointerDown={startProfileOrbiterDrag}
          onPointerMove={moveProfileOrbiterDrag}
          onPointerUp={finishProfileOrbiterDrag}
          onScroll={syncProfileOrbiterRowFromScroll}
          onWheel={(event) => {
            if (
              shouldLetProfileOrbiterTargetScroll(
                event.target,
                event.deltaY,
              )
            ) {
              return;
            }

            if (profileOrbiterLocked) {
              event.preventDefault();
              event.stopPropagation();
              return;
            }

            const wheelDirection =
              event.deltaY > 12 ? 1 : event.deltaY < -12 ? -1 : 0;
            const nextRow =
              wheelDirection === 0
                ? clampedActiveProfileOrbiterRow
                : Math.max(
                    0,
                    Math.min(
                      profileOrbiterRows.length - 1,
                      clampedActiveProfileOrbiterRow + wheelDirection,
                    ),
                  );

            if (
              wheelDirection !== 0 &&
              nextRow !== clampedActiveProfileOrbiterRow
            ) {
              event.preventDefault();
              event.stopPropagation();

              if (profileOrbiterWheelLockRef.current) return;

              profileOrbiterWheelLockRef.current = true;
              scrollProfileOrbiterRow(wheelDirection);
              window.setTimeout(() => {
                profileOrbiterWheelLockRef.current = false;
              }, PROFILE_ORBITER_VERTICAL_WHEEL_DELAY_MS);
              return;
            }

            profileOrbiterWheelLockRef.current = false;
          }}
          role="region"
          tabIndex={0}
        >
          <div className="relative flex min-h-full flex-col gap-6 py-[clamp(32px,6dvh,72px)]">
          <section
            id="profile-orbiter-row-0"
            ref={profileHeroRowRef}
            data-profile-orbiter-row="0"
            className="relative flex min-h-[clamp(440px,54dvh,520px)] snap-center flex-col justify-center py-3"
            style={getProfileOrbiterRowStyle(0)}
          >
            <div className="mx-auto flex h-full w-full max-w-[1180px] flex-col justify-center gap-3">
              {renderHero()}
              {renderProfileHeroSummaryCards()}
            </div>
          </section>

          {profileCardRows.map((cardRow) => {
            const storedActiveCardIndex = getProfileSectionOrbitIndex(
              cardRow.tab.id,
              cardRow.cards.length,
            );
            const expandedCardIndex = cardRow.cards.findIndex(
              (_card, index) =>
                expandedProfileOrbiterCard === `${cardRow.tab.id}-${index}`,
            );
            const activeCardIndex =
              expandedCardIndex >= 0 ? expandedCardIndex : storedActiveCardIndex;
            const activeCard = cardRow.cards[activeCardIndex] || cardRow.cards[0];
            const activeCardKey = activeCard
              ? `${cardRow.tab.id}-${activeCardIndex}`
              : null;
            const hasExpandedActiveCard = Boolean(
              activeCard?.expandsToFullCard &&
                expandedProfileOrbiterCard === activeCardKey,
            );
            const expandedActiveContent =
              hasExpandedActiveCard && activeCard
                ? renderExpandedProfileOrbiterCard(activeCard)
                : null;
            const activeCardDetailsOpen = Boolean(
              activeCardKey && openProfileOrbiterDetails === activeCardKey,
            );

            if (expandedActiveContent) {
              return (
                <section
                  key={cardRow.tab.id}
                  id={`profile-orbiter-row-${cardRow.rowIndex}`}
                  data-profile-orbiter-row={cardRow.rowIndex}
                  className="relative flex min-h-[clamp(500px,64dvh,560px)] snap-center flex-col items-center justify-center overflow-visible py-4"
                  style={getProfileOrbiterRowStyle(cardRow.rowIndex)}
                >
                  <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-3">
                    {renderProfileRowHeader(cardRow, "", true, true, {
                      activeIndex: activeCardIndex,
                      cards: cardRow.cards,
                      tabId: cardRow.tab.id,
                    })}
                    <article
                      aria-current="page"
                      aria-label={`Expanded ${activeCard?.label || cardRow.title}`}
                      className={`relative w-[min(88vw,980px)] rounded-[28px] border p-0 text-left shadow-[0_22px_58px_rgba(0,0,0,0.36)] outline-none backdrop-blur ring-2 ring-cyan-100/26 ${activeCard?.tone || ""} ${getCompletionTone(activeCard?.completion || 0).glow}`}
                    >
                      {renderCollapseProfileDropdownButton()}
                      {expandedActiveContent}
                    </article>
                  </div>
                </section>
              );
            }

            return (
              <section
                key={cardRow.tab.id}
                id={`profile-orbiter-row-${cardRow.rowIndex}`}
                data-profile-orbiter-row={cardRow.rowIndex}
                className={`relative flex min-h-[clamp(430px,52dvh,500px)] snap-center flex-col items-center overflow-visible py-2 ${
                  hasExpandedActiveCard ? "justify-start pt-14" : "justify-center"
                }`}
                style={getProfileOrbiterRowStyle(cardRow.rowIndex)}
              >
                <div
                  className={`relative w-full overflow-hidden [perspective:900px] ${
                    hasExpandedActiveCard
                      ? "h-[calc(100%-3.25rem)] min-h-[0]"
                      : "h-[min(460px,calc(100%-2.5rem))] min-h-[390px]"
                  }`}
                >
                  {renderProfileRowHeader(
                    cardRow,
                    `absolute inset-x-0 mx-auto ${
                      activeCardDetailsOpen ? "top-1" : "top-4"
                    }`,
                    cardRow.rowIndex === clampedActiveProfileOrbiterRow,
                    activeCardDetailsOpen,
                    {
                      activeIndex: activeCardIndex,
                      cards: cardRow.cards,
                      tabId: cardRow.tab.id,
                    },
                  )}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 top-1/2 h-[220px] w-[min(88vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-[46px] bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.11),rgba(251,146,60,0.08)_48%,transparent_76%)] blur-xl"
                  />
                  {cardRow.cards.length > 1 && !expandedProfileOrbiterCard ? (
                    <>
                      <button
                        type="button"
                        aria-label={`Show previous ${cardRow.title}`}
                        onClick={() =>
                          moveProfileSectionOrbit(
                            cardRow.tab.id,
                            cardRow.cards.length,
                            -1,
                          )
                        }
                        className="absolute left-3 top-1/2 z-[70] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-2xl border border-cyan-200/18 bg-slate-950/72 text-lg font-black text-cyan-100 shadow-[0_18px_52px_rgba(0,0,0,0.38)] backdrop-blur-xl transition hover:border-cyan-200/42 hover:bg-cyan-300/12 sm:left-6"
                      >
                        &lt;
                      </button>
                      <button
                        type="button"
                        aria-label={`Show next ${cardRow.title}`}
                        onClick={() =>
                          moveProfileSectionOrbit(
                            cardRow.tab.id,
                            cardRow.cards.length,
                            1,
                          )
                        }
                        className="absolute right-3 top-1/2 z-[70] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-2xl border border-orange-200/18 bg-slate-950/72 text-lg font-black text-orange-100 shadow-[0_18px_52px_rgba(0,0,0,0.38)] backdrop-blur-xl transition hover:border-orange-200/42 hover:bg-orange-300/12 sm:right-6"
                      >
                        &gt;
                      </button>
                    </>
                  ) : null}
                  {cardRow.cards.map((card, index) => {
                    let distance = index - activeCardIndex;
                    if (distance > cardRow.cards.length / 2) {
                      distance -= cardRow.cards.length;
                    }
                    if (distance < -cardRow.cards.length / 2) {
                      distance += cardRow.cards.length;
                    }
                    const absDistance = Math.abs(distance);
                    if (absDistance > 3) return null;

                    const clampedDistance = Math.max(-3, Math.min(3, distance));
                    const orbitXSlots = [0, 250, 390, 510];
                    const isActive = distance === 0;
                    const cardKey = `${cardRow.tab.id}-${index}`;
                    const isExpandedCard = Boolean(
                      isActive &&
                        card.expandsToFullCard &&
                        expandedProfileOrbiterCard === cardKey,
                    );
                    const expandedContent = isExpandedCard
                      ? renderExpandedProfileOrbiterCard(card)
                      : null;
                    if (hasExpandedActiveCard && !isActive) return null;

                    const x =
                      Math.sign(clampedDistance) *
                      orbitXSlots[Math.min(absDistance, orbitXSlots.length - 1)];
                    const y = expandedContent
                      ? 0
                      : absDistance * 18 + (absDistance > 1 ? 8 : 0);
                    const scale = isActive
                      ? 1
                      : absDistance === 1
                        ? 0.78
                        : absDistance === 2
                          ? 0.64
                          : 0.52;
                    const opacity = isActive
                      ? 1
                      : absDistance === 1
                        ? 0.82
                        : absDistance === 2
                          ? 0.56
                          : 0.36;
                    const tone = getCompletionTone(card.completion);
                    const pulseTone = getProfilePulseIndicatorTone(card.completion);
                    const detailsKey = cardKey;
                    const detailsOpen = openProfileOrbiterDetails === detailsKey;

                    return (
                      <article
                        aria-current={isActive ? "page" : undefined}
                        aria-label={`${isActive ? "Active" : "Show"} ${card.label}`}
                        key={card.label}
                        onClick={(event) => {
                          const openFullCard = () =>
                            openProfileOrbiterFullCard(cardRow.tab.id, index);

                          if (isActive) {
                            const target = event.target;
                            if (
                              !card.expandsToFullCard ||
                              (target instanceof HTMLElement &&
                                target.closest("button,a,input,select,textarea,label"))
                            ) {
                              return;
                            }

                            openFullCard();
                            return;
                          }

                          if (card.expandsToFullCard) {
                            openFullCard();
                            return;
                          }

                          setProfileSectionOrbitIndex(cardRow.tab.id, index);
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") {
                            return;
                          }

                          event.preventDefault();
                          const openFullCard = () =>
                            openProfileOrbiterFullCard(cardRow.tab.id, index);

                          if (isActive) {
                            if (!card.expandsToFullCard) return;

                            openFullCard();
                            return;
                          }

                          if (card.expandsToFullCard) {
                            openFullCard();
                            return;
                          }

                          setProfileSectionOrbitIndex(cardRow.tab.id, index);
                        }}
                        role={isActive && !card.expandsToFullCard ? undefined : "button"}
                        tabIndex={isActive && !card.expandsToFullCard ? -1 : 0}
                        className={`absolute left-1/2 rounded-[28px] border text-left shadow-[0_22px_58px_rgba(0,0,0,0.36)] outline-none backdrop-blur transition-[transform,opacity,border-color,background-color,box-shadow,width] duration-[520ms] ease-[cubic-bezier(0.2,0.85,0.25,1)] hover:border-white/28 focus-visible:ring-2 focus-visible:ring-cyan-100/50 ${
                          expandedContent
                            ? `top-0 w-[min(88vw,980px)] p-0 ring-2 ring-cyan-100/26 ${tone.glow}`
                            : isActive
                              ? `top-1/2 w-[min(82vw,380px)] overflow-hidden p-5 ring-2 ring-cyan-100/26 ${tone.glow}`
                              : "top-1/2 w-[220px] cursor-pointer overflow-hidden p-5"
                        } ${card.tone}`}
                        style={{
                          filter: "none",
                          opacity,
                          transform: expandedContent
                            ? `translateX(-50%) translateX(${x}px) translateY(${y}px) rotateY(${clampedDistance * -18}deg) scale(${scale})`
                            : `translate(-50%, -50%) translateX(${x}px) translateY(${y}px) rotateY(${clampedDistance * -18}deg) scale(${scale})`,
                          zIndex: 30 - absDistance,
                        }}
                      >
                        {!expandedContent
                          ? renderProfileCardLiquidGlass(card.completion, isActive)
                          : null}
                        {expandedContent ? (
                          <div className="relative">
                            {renderCollapseProfileDropdownButton()}
                            {expandedContent}
                          </div>
                        ) : (
                          <div className="relative z-10">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-start gap-3">
                                <span
                                  aria-hidden="true"
                                  className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/12 bg-slate-950/42 text-current shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                                >
                                  <SelectorIcon
                                    name={card.icon}
                                    className={isActive ? "h-6 w-6" : "h-5 w-5"}
                                  />
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-black uppercase tracking-[0.12em] text-white">
                                    {card.label}
                                  </p>
                                  <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.12em] text-current/80">
                                    {card.stat}
                                  </p>
                                </div>
                              </div>
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${tone.badge}`}>
                                <span
                                  aria-hidden="true"
                                  data-active={isActive ? "true" : "false"}
                                  data-profile-indicator-motion={pulseTone.motion}
                                  className={`profile-row-card-indicator inline-flex shrink-0 items-center justify-center rounded-full border bg-black/25 ${
                                    isActive
                                      ? `h-3.5 w-3.5 ${pulseTone.outerActive}`
                                      : `h-3 w-3 ${pulseTone.outerInactive}`
                                  }`}
                                  style={pulseTone.style}
                                >
                                  <span
                                    aria-hidden="true"
                                    data-profile-pulse-dot="true"
                                    className={`rounded-full ${
                                      isActive ? pulseTone.dotActive : pulseTone.dotInactive
                                    } ${
                                      isActive ? "h-2 w-2" : "h-1.5 w-1.5"
                                    }`}
                                  />
                                </span>
                                {card.completion}%
                              </span>
                            </div>
                            <p
                              className={`mt-4 font-semibold text-slate-300 ${
                                isActive
                                  ? "line-clamp-3 text-sm leading-6"
                                  : "line-clamp-2 text-xs leading-5"
                              }`}
                            >
                              {card.helper}
                            </p>
                            {isActive ? (
                              card.expandsToFullCard ? (
                                <button
                                  type="button"
                                  aria-expanded={expandedProfileOrbiterCard === cardKey}
                                  onPointerDown={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    openProfileOrbiterFullCard(cardRow.tab.id, index);
                                  }}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openProfileOrbiterFullCard(cardRow.tab.id, index);
                                  }}
                                  className="mt-4 block w-full rounded-2xl border border-cyan-200/22 bg-cyan-300/12 px-3 py-3 text-center text-[9px] font-black uppercase tracking-[0.14em] text-cyan-50 transition hover:border-cyan-200/42 hover:bg-cyan-300/18"
                                >
                                  Open Full Drop Down
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    aria-expanded={detailsOpen}
                                    onClick={() =>
                                      setOpenProfileOrbiterDetails((current) =>
                                        current === detailsKey ? null : detailsKey,
                                      )
                                    }
                                    className="mt-4 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-950/54 px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-cyan-200/30 hover:bg-cyan-300/10"
                                  >
                                    <span>Details</span>
                                    <span
                                      aria-hidden="true"
                                      className={`text-sm leading-none text-cyan-100 transition-transform duration-300 ${
                                        detailsOpen ? "rotate-180" : ""
                                      }`}
                                    >
                                      v
                                    </span>
                                  </button>
                                  <div
                                    className={`grid transition-all duration-300 ease-out ${
                                      detailsOpen
                                        ? "mt-3 grid-rows-[1fr] opacity-100"
                                        : "grid-rows-[0fr] opacity-0"
                                    }`}
                                  >
                                    <div className="overflow-hidden">
                                      <div className="grid gap-2 rounded-2xl border border-white/10 bg-slate-950/34 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                                        {card.references.map((reference) => (
                                          <span
                                            key={reference}
                                            className="truncate rounded-xl border border-white/10 bg-slate-950/42 px-3 py-2 text-[10px] font-black text-slate-100"
                                          >
                                            {reference}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )
                            ) : null}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>

              </section>
            );
          })}
          </div>
        </div>
      </section>
    );
  };

  const renderOverview = () => (
    <div className="space-y-5">
      <div className="hidden gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            className={profileOverviewMetricCardClass}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/55 to-fuchsia-200/35"
            />
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-lg font-black text-white">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 rounded-[28px] border border-cyan-200/16 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.14),transparent_32%),rgba(15,23,42,0.58)] p-4 shadow-[0_0_36px_rgba(34,211,238,0.08)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
            Goals live on the Goals page
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-400">
            Edit plan direction, goal weight, steps, and water targets from the dedicated goal workspace.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            href="/goals"
            className="inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-cyan-200/26 bg-cyan-300/12 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-cyan-50 transition hover:-translate-y-0.5 hover:border-cyan-100/50 hover:bg-cyan-300/20"
          >
            Goals
          </Link>
          <Link
            href="/stats"
            className="inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-emerald-200/24 bg-emerald-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-100/45 hover:bg-emerald-300/18"
          >
            Stats
          </Link>
        </div>
      </div>
      <div id="plan-direction" data-profile-section="plan-direction">
        {renderGoalCompass()}
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div id="my-body" className="min-w-0" data-profile-section="my-body">
          {renderBodyMetrics()}
        </div>
        <div
          id="measurements"
          className="min-w-0"
          data-profile-section="body-measurements"
        >
          {renderMeasurements()}
        </div>
      </div>
      <div id="readiness-section" data-profile-section="readiness-section">
        {renderReadinessSection()}
      </div>
      <div id="benchmarks" data-profile-section="benchmarks">
        {renderBenchmarks()}
      </div>
      <div id="lifestyle" data-profile-section="lifestyle">
        {renderLifestyle()}
      </div>
    </div>
  );

  const renderProfileTabContent = (tabId: ProfileTab) => {
    if (tabId === "overview") return renderOverview();
    if (tabId === "readiness") {
      return (
        <div className="space-y-5">
          <div id="training-setup" data-profile-section="training-setup">
            {renderPlanInputs()}
          </div>
          <div id="training-style" data-profile-section="training-style">
            {renderTrainingStyle()}
          </div>
          <div id="previous-experience" data-profile-section="previous-experience">
            {renderPreviousExperience()}
          </div>
          <div id="special-circumstances" data-profile-section="special-circumstances">
            {renderSpecialCircumstances()}
          </div>
        </div>
      );
    }
    if (tabId === "coachApp") {
      return (
        <div className="space-y-5">
          <div id="coach-app-notes" data-profile-section="coach-app-notes">
            {renderNotes({ includeCoachingPreferences: true })}
          </div>
          <div id="app-preferences" data-profile-section="app-preferences">
            {renderPersonalization()}
          </div>
        </div>
      );
    }
    if (tabId === "recovery") {
      return (
        <div id="recovery-profile" data-profile-section="recovery-profile">
          {renderRecoveryProfile()}
        </div>
      );
    }
    if (tabId === "nutrition") {
      return (
        <div id="nutrition-direction" data-profile-section="nutrition-direction">
          {renderNutrition()}
        </div>
      );
    }
    return renderOverview();
  };

  const renderActiveTab = () => renderProfileTabContent(activeTab);

  const renderProfileDetailsStack = () => (
    <section className="space-y-6 pt-5" aria-label="Profile detail sections">
      {profileDetailTabs.map((tab) => {
        const completion = tabCompletions[tab.id] || 0;
        const tone = getCompletionTone(completion);

        return (
          <section
            key={tab.id}
            className="space-y-5"
            id={`profile-details-${tab.id}`}
          >
            <div className="relative overflow-hidden rounded-[28px] border border-cyan-200/16 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.14),transparent_34%),rgba(15,23,42,0.62)] p-4 shadow-[0_18px_56px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08)]">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-cyan-200/60 to-orange-200/45"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200/70">
                    Profile Details
                  </p>
                  <h2 className="mt-1 text-xl font-black text-white">
                    {tab.label}
                  </h2>
                </div>
                <span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] ${tone.badge}`}>
                  {completion}% Complete
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-950/70">
                <span
                  className={`block h-full rounded-full bg-gradient-to-r ${tone.bar} transition-[width] duration-300`}
                  style={{ width: `${completion}%` }}
                />
              </div>
            </div>
            {renderProfileTabContent(tab.id)}
          </section>
        );
      })}
      {renderMasterJourneyMap()}
    </section>
  );

  const renderMasterJourneyMap = () => {
    const journeyRows: Array<{
      accent: string;
      completion: number;
      description: string;
      id: string;
      steps: Array<{
        href: string;
        label: string;
        status: string;
      }>;
      title: string;
    }> = [
      {
        accent: "from-cyan-300 to-blue-400",
        completion: Math.round(
          (tabCompletions.overview +
            tabCompletions.goals +
            tabCompletions.training) /
            3,
        ),
        description: "Build sessions from profile, goals, libraries, and plans.",
        id: "training",
        title: "Training Journey",
        steps: [
          { href: ROUTES.dashboard.profile, label: "Profile", status: "Foundation" },
          { href: ROUTES.dashboard.goals, label: "Goals", status: "Direction" },
          { href: ROUTES.dashboard.sessions, label: "Sessions", status: "Start" },
          { href: ROUTES.dashboard.exerciseLibrary, label: "Exercise Library", status: "Tools" },
          { href: ROUTES.dashboard.goals, label: "Goal Planning", status: "Goals" },
          { href: ROUTES.dashboard.plan, label: "My Plan", status: "Organize" },
          { href: ROUTES.dashboard.phases, label: "Periodized Plan", status: "Phase" },
          { href: ROUTES.dashboard.calendar, label: "Calendar", status: "Schedule" },
          { href: ROUTES.dashboard.stats, label: "Progress", status: "Reflect" },
        ],
      },
      {
        accent: "from-emerald-300 to-teal-400",
        completion: Math.round(
          (tabCompletions.overview +
            tabCompletions.goals +
            tabCompletions.nutrition +
            tabCompletions.measurements) /
            4,
        ),
        description: "Turn fuel decisions into meals, menus, and weekly nutrition plans.",
        id: "fuel",
        title: "Fuel Journey",
        steps: [
          { href: ROUTES.dashboard.profile, label: "Profile", status: "Foundation" },
          { href: "/nutrition/goals", label: "Goals", status: "Fuel goal" },
          { href: ROUTES.nutritionPortal.home, label: "Fuel Dashboard", status: "Today" },
          { href: ROUTES.nutritionPortal.grocery, label: "Shopping / My Fridge", status: "Stock" },
          { href: ROUTES.nutritionPortal.library, label: "Kitchen", status: "Library" },
          { href: ROUTES.nutritionPortal.meals, label: "My Menu", status: "Meals" },
          { href: "/nutrition/meal-plan", label: "My Plan", status: "Week" },
          { href: "/nutrition/progress", label: "Progress", status: "Track" },
        ],
      },
      {
        accent: "from-orange-300 to-amber-300",
        completion: Math.round(
          (tabCompletions.benchmarks +
            tabCompletions.training +
            tabCompletions.readiness) /
            3,
        ),
        description: "Develop conditioning, athletic metrics, and performance trends.",
        id: "performance",
        title: "Performance Pathway",
        steps: [
          // TODO: Split these into performance subroutes when /performance/journey exists.
          { href: "/performance", label: "Baseline", status: "Check" },
          { href: "/performance", label: "Cardio", status: "Engine" },
          { href: "/performance", label: "Conditioning", status: "Capacity" },
          { href: "/performance", label: "Metrics", status: "Measure" },
          { href: "/performance", label: "Athletic Tests", status: "Test" },
          { href: ROUTES.dashboard.stats, label: "Progress", status: "Track" },
        ],
      },
      {
        accent: "from-violet-300 to-cyan-300",
        completion: Math.round(
          (tabCompletions.readiness +
            tabCompletions.recovery +
            tabCompletions.circumstances) /
            3,
        ),
        description: "Connect readiness, mobility, pain/soreness, and recovery planning.",
        id: "recovery",
        title: "Recovery Roadmap",
        steps: [
          { href: ROUTES.dashboard.profile, label: "Readiness", status: "Profile" },
          { href: ROUTES.dashboard.mobilityLibrary, label: "Mobility", status: "Move" },
          { href: ROUTES.dashboard.painTracking, label: "Pain/Soreness", status: "Log" },
          { href: ROUTES.dashboard.profile, label: "Sleep/Stress", status: "Signals" },
          { href: "/recovery", label: "Recovery Plan", status: "Recover" },
          { href: ROUTES.dashboard.stats, label: "Progress", status: "Track" },
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

    const getJourneySummary = (row: (typeof journeyRows)[number]) => {
      const completedCount = Math.min(
        row.steps.length,
        Math.floor((row.completion / 100) * row.steps.length),
      );
      const currentIndex = Math.min(completedCount, row.steps.length - 1);
      const currentStep = row.steps[currentIndex]?.label || row.steps[0]?.label || "Profile";
      const nextAction =
        row.steps[Math.min(currentIndex + 1, row.steps.length - 1)]?.label ||
        currentStep;

      return { completedCount, currentIndex, currentStep, nextAction };
    };

    const overallJourneyCompletion = Math.round(
      journeyRows.reduce((total, row) => total + row.completion, 0) /
        Math.max(journeyRows.length, 1),
    );
    const currentJourney =
      journeyRows.find((row) => row.id === openMasterJourney) ||
      journeyRows.find((row) => row.completion < 100) ||
      journeyRows[0];
    const currentJourneySummary = getJourneySummary(currentJourney);

    return (
      <section className={`${profileOverviewSectionShellClass} overflow-hidden`}>
        <span aria-hidden="true" className={profileOverviewSectionGlowClass} />
        <button
          type="button"
          aria-expanded={masterJourneyExpanded}
          onClick={() => setMasterJourneyExpanded((current) => !current)}
          className="group w-full p-5 text-left transition hover:bg-white/[0.035] sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/70">
                Master Journey
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-black text-white">
                  Master Training Journey
                </h2>
                <span className="rounded-full border border-cyan-200/28 bg-cyan-300/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
                  {overallJourneyCompletion}% complete
                </span>
              </div>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-400">
                Profile and goals are the foundation. Training, fuel, performance, and recovery journeys build from there.
              </p>
              <div className="mt-3 flex max-w-full flex-wrap gap-2">
                <span className="rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100">
                  {overallJourneyCompletion}% Complete
                </span>
                <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100">
                  Current: {currentJourney.title}
                </span>
                <span className="rounded-full border border-orange-200/18 bg-orange-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-orange-100">
                  Next: {currentJourneySummary.nextAction}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <span className="hidden h-2 w-24 rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-orange-300 shadow-[0_0_20px_rgba(34,211,238,0.16)] sm:block">
                <span
                  className="block h-full rounded-full bg-white/35 transition-[width] duration-500"
                  style={{ width: `${overallJourneyCompletion}%` }}
                />
              </span>
              <span
                className={`grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.045] text-lg font-black text-slate-300 transition group-hover:border-cyan-200/35 group-hover:text-cyan-100 ${
                  masterJourneyExpanded ? "rotate-90" : ""
                }`}
              >
                &gt;
              </span>
            </div>
          </div>
        </button>

        <div
          className={`grid transition-all duration-300 ease-out ${
            masterJourneyExpanded
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="border-t border-white/10 p-5 sm:p-6">
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
                {journeyRows.map((row) => {
                  const isOpen = openMasterJourney === row.id;
                  const { completedCount, currentIndex, currentStep, nextAction } =
                    getJourneySummary(row);

                  return (
                    <section
                      key={row.id}
                      className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    >
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() =>
                          setOpenMasterJourney((current) =>
                            current === row.id ? null : row.id,
                          )
                        }
                        className="group w-full p-4 text-left transition hover:bg-white/[0.035]"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                              <p className="text-lg font-black text-white">{row.title}</p>
                              <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-300">
                                {row.completion}% complete
                              </span>
                            </div>
                            <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                              {row.description}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100">
                                Current: {currentStep}
                              </span>
                              <span className="rounded-full border border-orange-200/18 bg-orange-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-orange-100">
                                Next: {nextAction}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`hidden h-2 w-24 rounded-full bg-gradient-to-r ${row.accent} shadow-[0_0_18px_rgba(34,211,238,0.14)] sm:block`}
                            />
                            <span
                              className={`grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.045] text-lg font-black text-slate-300 transition group-hover:border-cyan-200/35 group-hover:text-cyan-100 ${
                                isOpen ? "rotate-90" : ""
                              }`}
                            >
                              &gt;
                            </span>
                          </div>
                        </div>
                      </button>

                <div
                  className={`grid transition-all duration-300 ease-out ${
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="border-t border-white/10 p-4 pt-5">
                      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {row.steps.map((step, index) => {
                          const stepState =
                            index < completedCount
                              ? "Completed"
                              : index === currentIndex
                                ? "Active"
                                : "Next";
                          const isActive = stepState === "Active";
                          const isComplete = stepState === "Completed";

                          return (
                            <div
                              key={`${row.title}-${step.label}`}
                              className="flex shrink-0 snap-start items-center gap-3"
                            >
                              <Link
                                href={step.href}
                                className={`group min-h-[128px] w-[190px] rounded-[24px] border p-4 transition hover:-translate-y-1 active:scale-[0.98] ${
                                  isActive
                                    ? "border-cyan-200/45 bg-cyan-300/14 shadow-[0_0_28px_rgba(34,211,238,0.16)]"
                                    : isComplete
                                      ? "border-emerald-200/35 bg-emerald-300/10 shadow-[0_0_22px_rgba(52,211,153,0.12)]"
                                      : "border-white/10 bg-white/[0.045] hover:border-cyan-200/30 hover:bg-cyan-300/10"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <span
                                    className={`grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br ${row.accent} text-xs font-black text-slate-950`}
                                  >
                                    {index + 1}
                                  </span>
                                  <span className="rounded-full border border-white/10 bg-slate-950/58 px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 group-hover:text-cyan-100">
                                    {stepState}
                                  </span>
                                </div>
                                <p className="mt-4 text-sm font-black leading-tight text-white">
                                  {step.label}
                                </p>
                                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                                  {step.status}
                                </p>
                              </Link>
                              {index < row.steps.length - 1 ? (
                                <span className="h-px w-10 shrink-0 bg-gradient-to-r from-white/18 to-cyan-300/30" />
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                    </section>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_82%_10%,rgba(251,146,60,0.14),transparent_28%),linear-gradient(180deg,#020617_0%,#07111f_52%,#020617_100%)] pb-10 text-white">
      <section className="mx-auto w-full max-w-[1440px] px-4 pb-6 pt-0 sm:px-6 lg:px-8">
        <nav className="hidden rounded-[28px] border border-white/10 bg-slate-950/52 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
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
              {tabs.map((tab) => {
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
              })}
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
          <>
            {renderProfileSectionOrbiters()}
            {renderProfileDetailsStack()}
          </>
        )}
      </section>

    </main>
  );
}

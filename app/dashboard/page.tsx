"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent as ReactChangeEvent,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import DashboardCalendar, {
  type DashboardCalendarItem,
} from "@/components/dashboard/DashboardCalendar";
import DashboardTabIcon from "@/components/dashboard/DashboardTabIcon";
import {
  SoundLogoAchievementBadge,
  type AchievementBadgeItem,
} from "@/components/dashboard/SoundAchievementBadgeRow";
import {
  loadWorkoutLogEntriesWithFallback,
  loadWorkoutTemplatesWithFallback,
  syncLocalWorkoutLogsToSupabase,
  syncLocalWorkoutTemplatesToSupabase,
} from "@/lib/data/workoutPersistence";
import {
  readActiveWorkoutBuilderSessionTemplate,
  type LocalWorkoutBuilderSessionTemplate,
  type LocalWorkoutBuilderTemplate,
  writeActiveWorkoutBuilderSessionTemplate,
} from "@/lib/localData/workoutBuilderData";
import {
  prependExerciseStats,
  subscribeToLocalWorkoutData,
} from "@/lib/localData/workoutData";
import {
  SOUND_FITNESS_PROFILE_STORAGE_KEY,
  SOUND_FITNESS_PROFILE_UPDATED_EVENT,
  asRecord,
  safeJsonParse,
} from "@/lib/profile-storage";
import { ROUTES } from "@/lib/routes";
import { supabase } from "@/lib/supabaseClient";
import {
  exerciseLibrary,
  type Exercise,
} from "@/lib/training/exerciseLibrary";
import type { LocalExerciseStatEntry } from "@/types";

type UploadOptionId = "photo" | "screenshot" | "file";

type LibraryReferenceType =
  | "education"
  | "exercise"
  | "mobility"
  | "nutrition"
  | "performance-test"
  | "recovery";

type ManualLibraryReference = {
  metadata: {
    body?: string;
    equipment?: string;
    goal?: string;
    image?: string;
    level?: string;
    movementPattern?: string;
    muscles?: string;
    tags?: string[];
  };
  referenceId: string;
  referenceTitle: string;
  referenceType: LibraryReferenceType;
  sourceLibrary: string;
};

type ManualStatsDraft = {
  dateTime: string;
  load: string;
  notes: string;
  reps: string;
  rpe: string;
  sessionLabel: string;
  sets: string;
};

type ManualStatsLogEntry = ManualStatsDraft & {
  id: string;
  loggedAt: string;
  references: ManualLibraryReference[];
};

type DashboardMusicStationId =
  | "orbit"
  | "rock"
  | "hipHop"
  | "loFi"
  | "house"
  | "cinematic";

type DashboardMusicAutoplayMode = "off" | "on";

type DashboardMusicChord = {
  bass: number;
  color: number[];
  notes: number[];
};

type DashboardMusicStation = {
  accentType: OscillatorType;
  arpOffsets: number[];
  bassFilter: number;
  bassType: OscillatorType;
  bassVolume: number;
  hatOffsets: number[];
  helper: string;
  id: DashboardMusicStationId;
  kickVolume: number;
  label: string;
  leadPattern: number[];
  leadType: OscillatorType;
  leadVolume: number;
  musicTags: string[];
  noiseFilter: number;
  noiseOffset: number;
  noiseVolume: number;
  padFilter: number;
  padType: OscillatorType;
  padVolume: number;
  pulseOffsets: number[];
  shortLabel: string;
  snareOffsets: number[];
  tempoLabel: string;
  textureVolume: number;
  progression: DashboardMusicChord[];
};

const DASHBOARD_MUSIC_DEFAULT_STATIONS: DashboardMusicStationId[] = ["orbit"];
const DASHBOARD_MUSIC_DEFAULT_VOLUME = 0.72;
const DASHBOARD_MUSIC_SETTINGS_STORAGE_KEY =
  "soundFitnessDashboardMusicSettings";
const DASHBOARD_MUSIC_AUTOPLAY_OPTIONS: {
  id: DashboardMusicAutoplayMode;
  label: string;
}[] = [
  { id: "off", label: "Off" },
  { id: "on", label: "On" },
];
const WORKOUT_SYNC_LAST_SYNCED_KEY = "soundFitnessWorkoutDataLastSyncedAt";
const MANUAL_STATS_LOG_STORAGE_KEY = "soundFitnessManualStatsLogs";
const DASHBOARD_GOALS_STORAGE_KEY = "soundFitnessGoals";
const DASHBOARD_PROFILE_VISITED_KEY = "soundFitnessDashboardProfileVisited";
const DASHBOARD_GOALS_VISITED_KEY = "soundFitnessDashboardGoalsVisited";
const EXERCISE_LIBRARY_FAVORITES_STORAGE_KEY =
  "sound-fitness:exercise-library:favorites";
const GLOBAL_DASHBOARD_FAVORITES_STORAGE_KEY = "soundFitnessFavorites";
const DASHBOARD_CONSISTENCY_MONTHS_BACK = 12;
const DASHBOARD_CONSISTENCY_MONTHS_AHEAD = 9;
const DASHBOARD_CONSISTENCY_ACTIVE_MONTH_INDEX =
  DASHBOARD_CONSISTENCY_MONTHS_BACK;
const DASHBOARD_CONSISTENCY_MONTH_WINDOW =
  DASHBOARD_CONSISTENCY_MONTHS_BACK + DASHBOARD_CONSISTENCY_MONTHS_AHEAD + 1;
const DASHBOARD_MUSIC_PHRASE_SECONDS = 4.8;
const DASHBOARD_MUSIC_TRANSITION_SECONDS = 0.62;
const DASHBOARD_MUSIC_MASTER_GAIN_MAX = 0.34;
const DASHBOARD_ANALOG_DRAG_THRESHOLD = 14;
const DASHBOARD_ANALOG_HOLD_DELAY_MS = 120;
const DASHBOARD_ANALOG_REPEAT_MS = 150;
const DASHBOARD_ORBITER_ROW_CLICK_LOCK_MS = 170;
const DASHBOARD_ORBITER_ROW_SCROLL_LOCK_MS = 145;
const DASHBOARD_PROFILE_ICON_FALLBACK = "/sound-fitness-logo.png";
const DASHBOARD_WEEKLY_SESSION_GOAL = 7;
const DASHBOARD_PLAN_SESSION_TARGET = 10;
const DASHBOARD_HEADER_METER_COUNT = 2;
const DASHBOARD_HEADER_METER_PANEL_SECTION_COUNT = 3;
const DASHBOARD_HEADER_MENU_BLOCK_COUNT = 5;
const DASHBOARD_HEADER_PROGRESS_BLOCK_INDEX = 2;
const DASHBOARD_HEADER_IDLE_TIMEOUT_MS = 20000;
const DASHBOARD_HEADER_METER_AUTOSCROLL_MS = 6200;
const DASHBOARD_HEADER_METER_RAIL_PULSE_MS = 1400;
const DASHBOARD_HEADER_ACHIEVEMENT_ROTATE_MS = 4600;
const DASHBOARD_HEADER_TIMEOUT_PORTAL_VISIBLE_MS = 15000;
const DASHBOARD_HEADER_TIMEOUT_PORTAL_BREAK_MS = 30000;
const DASHBOARD_HEADER_TIMEOUT_PORTAL_INTERVAL_MS =
  DASHBOARD_HEADER_TIMEOUT_PORTAL_VISIBLE_MS +
  DASHBOARD_HEADER_TIMEOUT_PORTAL_BREAK_MS;
const dashboardHeaderCategoryLevels = [
  {
    color: "rgba(110, 231, 183, 0.96)",
    id: "lower-compound",
    label: "Lower Body Compound",
    left: 8,
    level: 74,
    shortLabel: "Lower Comp",
    top: 58,
  },
  {
    color: "rgba(190, 242, 100, 0.92)",
    id: "lower-isolation",
    label: "Lower Body Isolation",
    left: 18,
    level: 58,
    shortLabel: "Lower Iso",
    top: 49,
  },
  {
    color: "rgba(153, 246, 228, 0.94)",
    id: "core",
    label: "Core",
    left: 28,
    level: 66,
    shortLabel: "Core",
    top: 60,
  },
  {
    color: "rgba(186, 230, 253, 0.96)",
    id: "upper-push",
    label: "Upper Push",
    left: 39,
    level: 62,
    shortLabel: "Push",
    top: 50,
  },
  {
    color: "rgba(199, 210, 254, 0.96)",
    id: "upper-pull",
    label: "Upper Pull",
    left: 50,
    level: 55,
    shortLabel: "Pull",
    top: 58,
  },
  {
    color: "rgba(216, 180, 254, 0.96)",
    id: "arm-isolation",
    label: "Arm Isolation",
    left: 61,
    level: 49,
    shortLabel: "Arms",
    top: 50,
  },
  {
    color: "rgba(253, 186, 116, 0.96)",
    id: "athletic",
    label: "Athletic",
    left: 71,
    level: 71,
    shortLabel: "Athletic",
    top: 55,
  },
  {
    color: "rgba(251, 207, 232, 0.94)",
    id: "integrated",
    label: "Integrated",
    left: 80,
    level: 44,
    shortLabel: "Integrated",
    top: 49,
  },
  {
    color: "rgba(207, 250, 254, 0.96)",
    id: "mobility",
    label: "Mobility",
    left: 89,
    level: 61,
    shortLabel: "Mobility",
    top: 58,
  },
  {
    color: "rgba(226, 232, 240, 0.9)",
    id: "cervical",
    label: "Cervical Isolation",
    left: 96,
    level: 38,
    shortLabel: "Neck",
    top: 49,
  },
] as const;

const dashboardHeaderCategoryFloorSlots = [
  { delay: 0, left: 53, top: 55 },
  { delay: 0, left: 62, top: 49 },
  { delay: 6.4, left: 53, top: 50 },
  { delay: 6.4, left: 62, top: 53 },
  { delay: 12.8, left: 53, top: 56 },
  { delay: 12.8, left: 62, top: 51 },
  { delay: 19.2, left: 53, top: 52 },
  { delay: 19.2, left: 62, top: 55 },
  { delay: 25.6, left: 53, top: 49 },
  { delay: 25.6, left: 62, top: 54 },
] as const;

const dashboardHeaderIdleEquipmentStations = [
  {
    categoryId: "lower-compound",
    color: "rgba(110, 231, 183, 0.96)",
    delay: 0,
    equipmentId: "rack",
    id: "lower-compound",
    label: "Squat Rack",
    left: 14,
    level: 7,
    progress: 74,
  },
  {
    categoryId: "lower-isolation",
    color: "rgba(190, 242, 100, 0.92)",
    delay: 6,
    equipmentId: "leg-machine",
    id: "lower-isolation",
    label: "Leg Machine",
    left: 30,
    level: 6,
    progress: 58,
  },
  {
    categoryId: "core",
    color: "rgba(153, 246, 228, 0.94)",
    delay: 12,
    equipmentId: "mat",
    id: "core",
    label: "Core Mat",
    left: 46,
    level: 7,
    progress: 66,
  },
  {
    categoryId: "upper-push",
    color: "rgba(186, 230, 253, 0.96)",
    delay: 18,
    equipmentId: "bench",
    id: "upper-push",
    label: "Bench",
    left: 62,
    level: 6,
    progress: 62,
  },
  {
    categoryId: "upper-pull",
    color: "rgba(199, 210, 254, 0.96)",
    delay: 24,
    equipmentId: "pull",
    id: "upper-pull",
    label: "Pull Tower",
    left: 76,
    level: 6,
    progress: 55,
  },
  {
    categoryId: "arm-isolation",
    color: "rgba(216, 180, 254, 0.96)",
    delay: 30,
    equipmentId: "bells",
    id: "arm-isolation",
    label: "Dumbbells",
    left: 88,
    level: 5,
    progress: 49,
  },
  {
    categoryId: "athletic",
    color: "rgba(253, 186, 116, 0.96)",
    delay: 42,
    equipmentId: "cones",
    id: "athletic",
    label: "Agility",
    left: 114,
    level: 7,
    progress: 71,
  },
  {
    categoryId: "integrated",
    color: "rgba(251, 207, 232, 0.94)",
    delay: 48,
    equipmentId: "platform",
    id: "integrated",
    label: "Clean Pad",
    left: 130,
    level: 4,
    progress: 44,
  },
  {
    categoryId: "mobility",
    color: "rgba(207, 250, 254, 0.96)",
    delay: 54,
    equipmentId: "mobility",
    id: "mobility",
    label: "Mobility Rail",
    left: 146,
    level: 6,
    progress: 61,
  },
  {
    categoryId: "cervical",
    color: "rgba(226, 232, 240, 0.9)",
    delay: 60,
    equipmentId: "neck",
    id: "cervical",
    label: "Neck Station",
    left: 162,
    level: 4,
    progress: 38,
  },
] as const;

type DashboardHeaderIdleEquipmentId =
  (typeof dashboardHeaderIdleEquipmentStations)[number]["equipmentId"];

const renderDashboardHeaderIdleEquipmentIcon = (
  equipmentId: DashboardHeaderIdleEquipmentId,
) => {
  switch (equipmentId) {
    case "rack":
      return (
        <svg
          aria-hidden="true"
          className="dashboard-header-idle-station__equipment-icon"
          focusable="false"
          viewBox="0 0 96 64"
        >
          <ellipse className="dashboard-header-equipment-shadow" cx="48" cy="58" rx="38" ry="5" />
          <path className="dashboard-header-equipment-metal" d="M20 58V14M76 58V14M22 15H74" />
          <path className="dashboard-header-equipment-metal" d="M16 14H80" />
          <path className="dashboard-header-equipment-rubber" d="M9 10H17V22H9Z" />
          <path className="dashboard-header-equipment-rubber" d="M79 10H87V22H79Z" />
          <path className="dashboard-header-equipment-pad" d="M30 47H66V58H30Z" />
          <path className="dashboard-header-equipment-detail" d="M29 27H39M57 27H67M29 39H39M57 39H67" />
          <path className="dashboard-header-equipment-highlight" d="M24 17V54M72 17V54M35 49H61" />
        </svg>
      );
    case "leg-machine":
      return (
        <svg
          aria-hidden="true"
          className="dashboard-header-idle-station__equipment-icon"
          focusable="false"
          viewBox="0 0 96 64"
        >
          <ellipse className="dashboard-header-equipment-shadow" cx="48" cy="58" rx="35" ry="5" />
          <path className="dashboard-header-equipment-frame" d="M18 58H77M34 50L45 23M53 57L46 39" />
          <path className="dashboard-header-equipment-pad" d="M21 39H49L42 52H17Z" />
          <path className="dashboard-header-equipment-pad" d="M31 17L52 20L45 39H24Z" />
          <path className="dashboard-header-equipment-metal" d="M48 39L70 34M70 25V52" />
          <circle className="dashboard-header-equipment-rubber" cx="76" cy="28" r="7" />
          <circle className="dashboard-header-equipment-rubber" cx="76" cy="48" r="7" />
          <path className="dashboard-header-equipment-highlight" d="M27 42H42M34 21L47 23" />
          <path className="dashboard-header-equipment-detail" d="M70 35H82M70 49H82" />
        </svg>
      );
    case "mat":
      return (
        <svg
          aria-hidden="true"
          className="dashboard-header-idle-station__equipment-icon"
          focusable="false"
          viewBox="0 0 96 64"
        >
          <ellipse className="dashboard-header-equipment-shadow" cx="48" cy="58" rx="38" ry="5" />
          <path className="dashboard-header-equipment-pad" d="M16 47C24 39 70 36 80 43C84 46 78 55 69 57C50 61 21 59 15 53C13 50 14 48 16 47Z" />
          <path className="dashboard-header-equipment-highlight" d="M29 45C40 48 57 48 69 43" />
          <circle className="dashboard-header-equipment-rubber" cx="38" cy="27" r="6" />
          <path className="dashboard-header-equipment-metal" d="M42 31C51 35 58 39 67 43M36 32L28 40" />
          <path className="dashboard-header-equipment-detail" d="M56 38L71 31M57 39L77 48" />
        </svg>
      );
    case "bench":
      return (
        <svg
          aria-hidden="true"
          className="dashboard-header-idle-station__equipment-icon"
          focusable="false"
          viewBox="0 0 96 64"
        >
          <ellipse className="dashboard-header-equipment-shadow" cx="48" cy="58" rx="37" ry="5" />
          <path className="dashboard-header-equipment-metal" d="M20 18H76" />
          <path className="dashboard-header-equipment-rubber" d="M10 12H18V24H10Z" />
          <path className="dashboard-header-equipment-rubber" d="M78 12H86V24H78Z" />
          <path className="dashboard-header-equipment-pad" d="M27 39L67 32L72 40L31 48Z" />
          <path className="dashboard-header-equipment-frame" d="M34 46L27 58M64 39L71 58M47 18V33" />
          <path className="dashboard-header-equipment-highlight" d="M34 39L64 34" />
          <path className="dashboard-header-equipment-detail" d="M18 58H78" />
        </svg>
      );
    case "pull":
      return (
        <svg
          aria-hidden="true"
          className="dashboard-header-idle-station__equipment-icon"
          focusable="false"
          viewBox="0 0 96 64"
        >
          <ellipse className="dashboard-header-equipment-shadow" cx="48" cy="58" rx="37" ry="5" />
          <path className="dashboard-header-equipment-metal" d="M22 58V13M74 58V13M18 14H78" />
          <path className="dashboard-header-equipment-detail" d="M31 25H65M31 34H65M41 25V55M55 25V55" />
          <path className="dashboard-header-equipment-cable" d="M34 15C34 29 62 29 62 15M48 29V49" />
          <path className="dashboard-header-equipment-pad" d="M41 48H55V58H41Z" />
          <path className="dashboard-header-equipment-rubber" d="M29 11H37V17H29Z" />
          <path className="dashboard-header-equipment-rubber" d="M59 11H67V17H59Z" />
          <path className="dashboard-header-equipment-highlight" d="M26 17V54M70 17V54" />
        </svg>
      );
    case "bells":
      return (
        <svg
          aria-hidden="true"
          className="dashboard-header-idle-station__equipment-icon"
          focusable="false"
          viewBox="0 0 96 64"
        >
          <ellipse className="dashboard-header-equipment-shadow" cx="48" cy="58" rx="36" ry="5" />
          <path className="dashboard-header-equipment-metal" d="M21 31L48 24L75 31M31 45L48 39L65 45" />
          <path className="dashboard-header-equipment-rubber" d="M13 23H25V40H13Z" />
          <path className="dashboard-header-equipment-rubber" d="M25 22H33V39H25Z" />
          <path className="dashboard-header-equipment-rubber" d="M63 22H71V39H63Z" />
          <path className="dashboard-header-equipment-rubber" d="M71 23H83V40H71Z" />
          <path className="dashboard-header-equipment-rubber" d="M24 41H35V56H24Z" />
          <path className="dashboard-header-equipment-rubber" d="M61 41H72V56H61Z" />
          <path className="dashboard-header-equipment-highlight" d="M18 27V36M76 27V36M29 44V53M66 44V53" />
        </svg>
      );
    case "cones":
      return (
        <svg
          aria-hidden="true"
          className="dashboard-header-idle-station__equipment-icon"
          focusable="false"
          viewBox="0 0 96 64"
        >
          <ellipse className="dashboard-header-equipment-shadow" cx="48" cy="58" rx="36" ry="5" />
          <path className="dashboard-header-equipment-pad" d="M20 53L31 26L43 53Z" />
          <path className="dashboard-header-equipment-pad" d="M55 53L66 23L79 53Z" />
          <path className="dashboard-header-equipment-highlight" d="M26 43H38M60 43H74" />
          <path className="dashboard-header-equipment-rubber" d="M18 53H45V58H18Z" />
          <path className="dashboard-header-equipment-rubber" d="M53 53H82V58H53Z" />
          <path className="dashboard-header-equipment-detail" d="M35 30L55 24" />
        </svg>
      );
    case "platform":
      return (
        <svg
          aria-hidden="true"
          className="dashboard-header-idle-station__equipment-icon"
          focusable="false"
          viewBox="0 0 96 64"
        >
          <ellipse className="dashboard-header-equipment-shadow" cx="49" cy="58" rx="38" ry="5" />
          <path className="dashboard-header-equipment-pad" d="M16 47L78 39L85 55L24 61Z" />
          <path className="dashboard-header-equipment-metal" d="M22 35H74" />
          <path className="dashboard-header-equipment-rubber" d="M10 29H18V42H10Z" />
          <path className="dashboard-header-equipment-rubber" d="M78 29H86V42H78Z" />
          <path className="dashboard-header-equipment-frame" d="M32 47L37 57M63 42L69 53" />
          <path className="dashboard-header-equipment-rubber" d="M44 22L56 32L48 42L36 32Z" />
          <path className="dashboard-header-equipment-highlight" d="M26 49L73 43" />
        </svg>
      );
    case "mobility":
      return (
        <svg
          aria-hidden="true"
          className="dashboard-header-idle-station__equipment-icon"
          focusable="false"
          viewBox="0 0 96 64"
        >
          <ellipse className="dashboard-header-equipment-shadow" cx="48" cy="58" rx="36" ry="5" />
          <path className="dashboard-header-equipment-metal" d="M22 49H76M34 21H64" />
          <path className="dashboard-header-equipment-frame" d="M39 21V49M58 21V49" />
          <path className="dashboard-header-equipment-cable" d="M29 49C33 36 48 31 60 26M62 22C72 27 75 36 72 49" />
          <path className="dashboard-header-equipment-pad" d="M28 33C34 27 43 26 49 32C42 38 34 40 28 33Z" />
          <path className="dashboard-header-equipment-highlight" d="M31 33C36 31 41 31 46 33" />
        </svg>
      );
    case "neck":
      return (
        <svg
          aria-hidden="true"
          className="dashboard-header-idle-station__equipment-icon"
          focusable="false"
          viewBox="0 0 96 64"
        >
          <ellipse className="dashboard-header-equipment-shadow" cx="48" cy="58" rx="35" ry="5" />
          <path className="dashboard-header-equipment-pad" d="M35 23C35 14 61 14 61 23V38H35Z" />
          <circle className="dashboard-header-equipment-rubber" cx="48" cy="28" r="8" />
          <path className="dashboard-header-equipment-metal" d="M40 43H56M48 38V58" />
          <path className="dashboard-header-equipment-detail" d="M31 51H65" />
          <path className="dashboard-header-equipment-cable" d="M30 43C25 36 25 27 30 20M66 43C71 36 71 27 66 20" />
          <path className="dashboard-header-equipment-highlight" d="M39 24C42 20 54 20 57 24" />
        </svg>
      );
  }
};

const DASHBOARD_COMPOUND_LIFT_PATTERNS = [
  "squat",
  "deadlift",
  "bench",
  "press",
  "row",
  "pull-up",
  "pull up",
  "chin-up",
  "chin up",
  "clean",
  "snatch",
  "lunge",
  "thruster",
  "dip",
];

const dashboardMusicStations: DashboardMusicStation[] = [
  {
    accentType: "triangle",
    arpOffsets: [0.48, 1.28, 2.12, 3.08, 3.84],
    bassFilter: 640,
    bassType: "sine",
    bassVolume: 0.085,
    hatOffsets: [0.6, 1.8, 3, 4.2],
    helper: "Late-2000s chillwave and ambient synth-pop focus.",
    id: "orbit",
    kickVolume: 0.105,
    label: "Orbit FM",
    leadPattern: [0, 2, 1, 2, 0],
    leadType: "triangle",
    leadVolume: 0.018,
    musicTags: ["Chillwave", "Ambient Pop", "2010s", "Focus"],
    noiseFilter: 2800,
    noiseOffset: 3.05,
    noiseVolume: 0.024,
    padFilter: 1150,
    padType: "triangle",
    padVolume: 0.036,
    pulseOffsets: [0, 2.4],
    shortLabel: "Orbit",
    snareOffsets: [2.4],
    tempoLabel: "Focus",
    textureVolume: 0.012,
    progression: [
      {
        bass: 87.31,
        color: [392, 523.25, 659.25],
        notes: [174.61, 220, 261.63, 329.63],
      },
      {
        bass: 98,
        color: [440, 587.33, 739.99],
        notes: [196, 246.94, 293.66, 392],
      },
      {
        bass: 73.42,
        color: [329.63, 493.88, 659.25],
        notes: [146.83, 196, 246.94, 329.63],
      },
      {
        bass: 110,
        color: [493.88, 659.25, 880],
        notes: [220, 277.18, 329.63, 440],
      },
    ],
  },
  {
    accentType: "square",
    arpOffsets: [0.36, 0.72, 1.56, 2.76, 3.12, 3.84],
    bassFilter: 920,
    bassType: "sawtooth",
    bassVolume: 0.07,
    hatOffsets: [0.3, 0.9, 1.5, 2.1, 2.7, 3.3, 3.9, 4.5],
    helper: "2000s alt-rock with stadium-workout energy.",
    id: "rock",
    kickVolume: 0.13,
    label: "Rock",
    leadPattern: [0, 1, 2, 1, 2, 0],
    leadType: "sawtooth",
    leadVolume: 0.026,
    musicTags: ["Alt-Rock", "Arena", "2000s", "Drive"],
    noiseFilter: 4200,
    noiseOffset: 2.28,
    noiseVolume: 0.04,
    padFilter: 1780,
    padType: "sawtooth",
    padVolume: 0.026,
    pulseOffsets: [0, 1.2, 2.4, 3.6],
    shortLabel: "Rock",
    snareOffsets: [1.2, 3.6],
    tempoLabel: "Drive",
    textureVolume: 0.006,
    progression: [
      {
        bass: 82.41,
        color: [329.63, 392, 659.25],
        notes: [164.81, 246.94, 329.63, 493.88],
      },
      {
        bass: 110,
        color: [440, 554.37, 880],
        notes: [220, 329.63, 440, 659.25],
      },
      {
        bass: 98,
        color: [392, 493.88, 783.99],
        notes: [196, 293.66, 392, 587.33],
      },
      {
        bass: 123.47,
        color: [493.88, 622.25, 987.77],
        notes: [246.94, 369.99, 493.88, 739.99],
      },
    ],
  },
  {
    accentType: "square",
    arpOffsets: [0.72, 1.68, 2.88, 3.6],
    bassFilter: 540,
    bassType: "sine",
    bassVolume: 0.12,
    hatOffsets: [0.36, 0.72, 1.08, 1.92, 2.28, 2.88, 3.42, 4.08, 4.44],
    helper: "2010s trap and boom-bap for strength blocks.",
    id: "hipHop",
    kickVolume: 0.145,
    label: "Hip-Hop",
    leadPattern: [0, 0, 2, 1],
    leadType: "square",
    leadVolume: 0.022,
    musicTags: ["Hip-Hop", "Trap", "2010s", "Bounce"],
    noiseFilter: 2200,
    noiseOffset: 1.18,
    noiseVolume: 0.034,
    padFilter: 980,
    padType: "triangle",
    padVolume: 0.024,
    pulseOffsets: [0, 1.2, 2.4],
    shortLabel: "Hip-Hop",
    snareOffsets: [1.2, 3.6],
    tempoLabel: "Bounce",
    textureVolume: 0.008,
    progression: [
      {
        bass: 65.41,
        color: [261.63, 311.13, 392],
        notes: [130.81, 155.56, 196, 261.63],
      },
      {
        bass: 73.42,
        color: [293.66, 349.23, 440],
        notes: [146.83, 174.61, 220, 293.66],
      },
      {
        bass: 87.31,
        color: [349.23, 415.3, 523.25],
        notes: [174.61, 207.65, 261.63, 349.23],
      },
      {
        bass: 98,
        color: [392, 466.16, 587.33],
        notes: [196, 233.08, 293.66, 392],
      },
    ],
  },
  {
    accentType: "triangle",
    arpOffsets: [0.62, 1.38, 2.26, 3.14, 4.02],
    bassFilter: 520,
    bassType: "sine",
    bassVolume: 0.076,
    hatOffsets: [0.6, 1.2, 2.16, 3, 4.08],
    helper: "2020s lo-fi jazzhop with late-night calm.",
    id: "loFi",
    kickVolume: 0.094,
    label: "Lo-Fi",
    leadPattern: [2, 1, 0, 1, 2],
    leadType: "triangle",
    leadVolume: 0.019,
    musicTags: ["Lo-Fi", "Jazzhop", "2020s", "Chill"],
    noiseFilter: 1850,
    noiseOffset: 2.96,
    noiseVolume: 0.03,
    padFilter: 860,
    padType: "triangle",
    padVolume: 0.041,
    pulseOffsets: [0, 1.8, 2.4, 3.72],
    shortLabel: "Lo-Fi",
    snareOffsets: [1.2, 3.6],
    tempoLabel: "Chill",
    textureVolume: 0.016,
    progression: [
      {
        bass: 73.42,
        color: [293.66, 349.23, 440],
        notes: [146.83, 174.61, 220, 293.66],
      },
      {
        bass: 58.27,
        color: [233.08, 293.66, 349.23],
        notes: [116.54, 146.83, 174.61, 233.08],
      },
      {
        bass: 87.31,
        color: [349.23, 440, 523.25],
        notes: [174.61, 220, 261.63, 349.23],
      },
      {
        bass: 65.41,
        color: [261.63, 329.63, 392],
        notes: [130.81, 164.81, 196, 261.63],
      },
    ],
  },
  {
    accentType: "square",
    arpOffsets: [0.3, 0.9, 1.5, 2.1, 2.7, 3.3, 3.9, 4.5],
    bassFilter: 720,
    bassType: "sawtooth",
    bassVolume: 0.074,
    hatOffsets: [0.6, 1.8, 3, 4.2],
    helper: "90s/2000s house with club-cardio momentum.",
    id: "house",
    kickVolume: 0.136,
    label: "House",
    leadPattern: [0, 1, 2, 1, 0, 2, 1, 2],
    leadType: "square",
    leadVolume: 0.02,
    musicTags: ["House", "Club", "2000s", "Cardio"],
    noiseFilter: 5200,
    noiseOffset: 3.36,
    noiseVolume: 0.028,
    padFilter: 1380,
    padType: "sawtooth",
    padVolume: 0.026,
    pulseOffsets: [0, 1.2, 2.4, 3.6],
    shortLabel: "House",
    snareOffsets: [1.2, 3.6],
    tempoLabel: "Club",
    textureVolume: 0.007,
    progression: [
      {
        bass: 82.41,
        color: [329.63, 493.88, 659.25],
        notes: [164.81, 246.94, 329.63, 493.88],
      },
      {
        bass: 98,
        color: [392, 587.33, 783.99],
        notes: [196, 293.66, 392, 587.33],
      },
      {
        bass: 73.42,
        color: [293.66, 440, 587.33],
        notes: [146.83, 220, 293.66, 440],
      },
      {
        bass: 110,
        color: [440, 659.25, 880],
        notes: [220, 329.63, 440, 659.25],
      },
    ],
  },
  {
    accentType: "sine",
    arpOffsets: [0.8, 1.9, 3.1, 4.05],
    bassFilter: 480,
    bassType: "sine",
    bassVolume: 0.09,
    hatOffsets: [1.2, 2.4, 3.6],
    helper: "Modern trailer-score lift with epic drama.",
    id: "cinematic",
    kickVolume: 0.122,
    label: "Cinematic",
    leadPattern: [2, 1, 2, 0],
    leadType: "sine",
    leadVolume: 0.024,
    musicTags: ["Cinematic", "Trailer", "Modern", "Epic"],
    noiseFilter: 3100,
    noiseOffset: 3.42,
    noiseVolume: 0.036,
    padFilter: 980,
    padType: "triangle",
    padVolume: 0.048,
    pulseOffsets: [0, 2.4],
    shortLabel: "Score",
    snareOffsets: [3.6],
    tempoLabel: "Epic",
    textureVolume: 0.018,
    progression: [
      {
        bass: 55,
        color: [220, 329.63, 440],
        notes: [110, 164.81, 220, 329.63],
      },
      {
        bass: 65.41,
        color: [261.63, 392, 523.25],
        notes: [130.81, 196, 261.63, 392],
      },
      {
        bass: 82.41,
        color: [329.63, 493.88, 659.25],
        notes: [164.81, 246.94, 329.63, 493.88],
      },
      {
        bass: 73.42,
        color: [293.66, 440, 587.33],
        notes: [146.83, 220, 293.66, 440],
      },
    ],
  },
];

const dashboardMusicStationById = Object.fromEntries(
  dashboardMusicStations.map((station) => [station.id, station]),
) as Record<DashboardMusicStationId, DashboardMusicStation>;

const dashboardMusicStationIconNames: Record<DashboardMusicStationId, string> = {
  cinematic: "Achievements",
  hipHop: "Music",
  house: "Cardio",
  loFi: "Recovery",
  orbit: "Sound World",
  rock: "Performance",
};

const dashboardFavoriteLibrarySources = [
  {
    helper: "Meal, grocery, and fuel favorites.",
    href: ROUTES.nutrition.home,
    id: "nutrition",
    label: "Nutrition",
    storageKey: "soundFitnessNutritionLibrary",
  },
  {
    helper: "Cooldown and readiness favorites.",
    href: ROUTES.dashboard.recovery,
    id: "recovery",
    label: "Recovery",
    storageKey: "soundFitnessRecoveryLibrary",
  },
  {
    helper: "Mobility prep favorites.",
    href: ROUTES.dashboard.mobility,
    id: "mobility",
    label: "Mobility",
    storageKey: "soundFitnessMobilityLibrary",
  },
  {
    helper: "Power and conditioning favorites.",
    href: ROUTES.performance.home,
    id: "performance",
    label: "Performance",
    storageKey: "soundFitnessPerformanceLibrary",
  },
] as const;

const manualStatsFavoriteDashboardSources = [
  {
    helper: "Exercise Library favorites attach directly to manual stats.",
    href: ROUTES.workoutBuilder.exerciseLibrary,
    id: "workout",
    label: "Workout / Sessions",
    meta: "Exercise Library",
  },
  ...dashboardFavoriteLibrarySources.map((source) => ({
    helper: source.helper,
    href: source.href,
    id: source.id,
    label: source.label,
    meta: "Favorites",
  })),
] as const;

const dashboardUploadOptions: Array<{
  cta: string;
  description: string;
  href: string;
  id: UploadOptionId;
  label: string;
  meta: string;
}> = [
  {
    cta: "Upload Workout Screenshot",
    description: "Import a workout screenshot for later AI review and cleanup.",
    href: "/stats/add/upload?type=screenshot",
    id: "screenshot",
    label: "Screenshot",
    meta: "Screenshot",
  },
  {
    cta: "Upload Spreadsheet",
    description: "Bring in Excel or CSV files from trackers, exports, or templates.",
    href: "/stats/add/upload?type=file",
    id: "file",
    label: "Excel / CSV",
    meta: "Spreadsheet",
  },
  {
    cta: "Upload Progress or Meal Photo",
    description: "Send a progress, meal, or body-context photo into the import flow.",
    href: "/stats/add/upload?type=photo",
    id: "photo",
    label: "Photo",
    meta: "Photo",
  },
];

const getManualDateTimeInputValue = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const getManualLogIsoDate = (value: string) => {
  if (!value) return new Date().toISOString();

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();

  return date.toISOString();
};

const getDashboardLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDashboardDays = (date: Date, days: number) => {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
};

const getDashboardWeekResetDate = (date: Date) => {
  const resetDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const daysUntilSunday = (7 - resetDate.getDay()) % 7;
  resetDate.setDate(resetDate.getDate() + daysUntilSunday);
  resetDate.setHours(23, 59, 0, 0);
  return resetDate;
};

const getDashboardEntryDateKey = (value?: string | null) => {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return getDashboardLocalDateKey(parsed);
};

const getDashboardEntryStreak = (dateKeys: Set<string>, endDate: Date) => {
  let streak = 0;
  let cursor = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
  );

  while (dateKeys.has(getDashboardLocalDateKey(cursor))) {
    streak += 1;
    cursor = addDashboardDays(cursor, -1);
  }

  return streak;
};

const readManualStatsLogEntries = (): ManualStatsLogEntry[] => {
  if (typeof window === "undefined") return [];

  const saved = window.localStorage.getItem(MANUAL_STATS_LOG_STORAGE_KEY);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as ManualStatsLogEntry[]) : [];
  } catch {
    return [];
  }
};

const writeManualStatsLogEntries = (entries: ManualStatsLogEntry[]) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    MANUAL_STATS_LOG_STORAGE_KEY,
    JSON.stringify(entries),
  );
};

const readStringArrayFromStorage = (key: string) => {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
};

const normalizeDashboardMusicStationIds = (value: unknown) => {
  const requestedIds = Array.isArray(value)
    ? value.filter((id): id is string => typeof id === "string")
    : [];
  const normalizedIds = dashboardMusicStations
    .map((station) => station.id)
    .filter((id) => requestedIds.includes(id));

  return normalizedIds.length
    ? normalizedIds
    : [...DASHBOARD_MUSIC_DEFAULT_STATIONS];
};

const getDashboardMusicAutoplayMode = (
  value: unknown,
): DashboardMusicAutoplayMode =>
  value === "on" ? value : "off";

const readDashboardMusicSettings = () => {
  if (typeof window === "undefined") {
    return {
      autoplayMode: "off" as DashboardMusicAutoplayMode,
      muted: false,
      stationIds: [...DASHBOARD_MUSIC_DEFAULT_STATIONS],
      volume: DASHBOARD_MUSIC_DEFAULT_VOLUME,
    };
  }

  try {
    const parsed = asRecord(
      JSON.parse(
        window.localStorage.getItem(DASHBOARD_MUSIC_SETTINGS_STORAGE_KEY) ||
          "{}",
      ),
    );
    const volume = Number(parsed.volume);

    return {
      autoplayMode: getDashboardMusicAutoplayMode(parsed.autoplayMode),
      muted: parsed.muted === true,
      stationIds: normalizeDashboardMusicStationIds(parsed.stationIds),
      volume: Number.isFinite(volume)
        ? Math.min(1, Math.max(0, volume))
        : DASHBOARD_MUSIC_DEFAULT_VOLUME,
    };
  } catch {
    return {
      autoplayMode: "off" as DashboardMusicAutoplayMode,
      muted: false,
      stationIds: [...DASHBOARD_MUSIC_DEFAULT_STATIONS],
      volume: DASHBOARD_MUSIC_DEFAULT_VOLUME,
    };
  }
};

const writeDashboardMusicSettings = ({
  autoplayMode,
  muted,
  stationIds,
  volume,
}: {
  autoplayMode: DashboardMusicAutoplayMode;
  muted: boolean;
  stationIds: DashboardMusicStationId[];
  volume: number;
}) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    DASHBOARD_MUSIC_SETTINGS_STORAGE_KEY,
    JSON.stringify({
      autoplayMode,
      muted,
      stationIds,
      volume: Math.min(1, Math.max(0, volume)),
    }),
  );
};

const readDashboardLibraryFavoriteIds = (
  source: (typeof dashboardFavoriteLibrarySources)[number],
) => {
  if (typeof window === "undefined") return [];

  let namespacedFavorites: string[] = [];

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(source.storageKey) || "{}",
    );
    const favorites = asRecord(parsed).favorites;
    namespacedFavorites = Array.isArray(favorites)
      ? favorites.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    namespacedFavorites = [];
  }

  const globalFavorites = readStringArrayFromStorage(
    GLOBAL_DASHBOARD_FAVORITES_STORAGE_KEY,
  )
    .filter((value) => value.startsWith(`${source.id}:`))
    .map((value) => value.replace(`${source.id}:`, ""));

  return Array.from(new Set([...namespacedFavorites, ...globalFavorites]));
};

const formatFavoriteIdLabel = (value: string) =>
  value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const buildExerciseReference = (exercise: Exercise): ManualLibraryReference => ({
  metadata: {
    body: exercise.body,
    equipment: exercise.equipment,
    goal: exercise.goal,
    image: exercise.image,
    level: exercise.level,
    movementPattern: exercise.pattern,
    muscles: exercise.muscles,
    tags: [
      exercise.body,
      exercise.pattern,
      exercise.equipment,
      exercise.goal,
      exercise.level,
    ].filter(Boolean),
  },
  referenceId: exercise.id,
  referenceTitle: exercise.name,
  referenceType: "exercise",
  sourceLibrary: "Exercise Library",
});

type ManualExerciseLibraryCategory = {
  exercises: Exercise[];
  helper: string;
  id: string;
  label: string;
};

type ManualExerciseCategoryIconName =
  | "core"
  | "library"
  | "lower"
  | "mobility"
  | "power"
  | "saved"
  | "today"
  | "upper"
  | "user";

const manualExerciseMovementCategoryLabels = [
  "Lower Body Compound",
  "Lower Body Isolation",
  "Core",
  "Upper Push",
  "Upper Pull",
  "Arm Isolation",
  "Athletic",
  "Integrated",
  "Mobility",
  "Cervical Isolation",
] as const;

type ManualExerciseMovementCategory =
  (typeof manualExerciseMovementCategoryLabels)[number];

const manualExerciseLibraryBaseCategories = [
  {
    id: "my-plan",
    label: "My Plan",
    fallbackExerciseIds: [
      "goblet-squat",
      "db-bench-press",
      "one-arm-db-row",
      "dead-bug",
      "farmer-carry",
      "hip-mobility-flow",
    ],
  },
  {
    id: "favorites",
    label: "Favorites",
    fallbackExerciseIds: [
      "goblet-squat",
      "push-up",
      "bent-over-row",
      "pallof-press",
      "kettlebell-swing",
      "worlds-greatest-stretch",
    ],
  },
  ...manualExerciseMovementCategoryLabels.map((label) => ({
    id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    label,
    fallbackExerciseIds: [],
  })),
] as const;

const manualExerciseCategoryThemeByLabel: Record<
  string,
  {
    accent: string;
    accentSoft: string;
    accentStrong: string;
    glow: string;
    icon: ManualExerciseCategoryIconName;
  }
> = {
  "My Plan": {
    accent: "rgb(34, 211, 238)",
    accentSoft: "rgba(34, 211, 238, 0.18)",
    accentStrong: "rgb(103, 232, 249)",
    glow: "rgba(34, 211, 238, 0.22)",
    icon: "today",
  },
  Favorites: {
    accent: "rgb(250, 204, 21)",
    accentSoft: "rgba(250, 204, 21, 0.18)",
    accentStrong: "rgb(254, 240, 138)",
    glow: "rgba(250, 204, 21, 0.20)",
    icon: "saved",
  },
  "Lower Body Compound": {
    accent: "rgb(16, 185, 129)",
    accentSoft: "rgba(16, 185, 129, 0.18)",
    accentStrong: "rgb(110, 231, 183)",
    glow: "rgba(16, 185, 129, 0.22)",
    icon: "lower",
  },
  "Lower Body Isolation": {
    accent: "rgb(132, 204, 22)",
    accentSoft: "rgba(132, 204, 22, 0.18)",
    accentStrong: "rgb(190, 242, 100)",
    glow: "rgba(132, 204, 22, 0.20)",
    icon: "lower",
  },
  Core: {
    accent: "rgb(45, 212, 191)",
    accentSoft: "rgba(45, 212, 191, 0.18)",
    accentStrong: "rgb(153, 246, 228)",
    glow: "rgba(45, 212, 191, 0.20)",
    icon: "core",
  },
  "Upper Push": {
    accent: "rgb(56, 189, 248)",
    accentSoft: "rgba(56, 189, 248, 0.18)",
    accentStrong: "rgb(186, 230, 253)",
    glow: "rgba(56, 189, 248, 0.22)",
    icon: "upper",
  },
  "Upper Pull": {
    accent: "rgb(129, 140, 248)",
    accentSoft: "rgba(129, 140, 248, 0.18)",
    accentStrong: "rgb(199, 210, 254)",
    glow: "rgba(129, 140, 248, 0.22)",
    icon: "upper",
  },
  "Arm Isolation": {
    accent: "rgb(168, 85, 247)",
    accentSoft: "rgba(168, 85, 247, 0.18)",
    accentStrong: "rgb(216, 180, 254)",
    glow: "rgba(168, 85, 247, 0.22)",
    icon: "upper",
  },
  Athletic: {
    accent: "rgb(251, 146, 60)",
    accentSoft: "rgba(251, 146, 60, 0.18)",
    accentStrong: "rgb(253, 186, 116)",
    glow: "rgba(251, 146, 60, 0.20)",
    icon: "power",
  },
  Integrated: {
    accent: "rgb(244, 114, 182)",
    accentSoft: "rgba(244, 114, 182, 0.18)",
    accentStrong: "rgb(251, 207, 232)",
    glow: "rgba(244, 114, 182, 0.20)",
    icon: "power",
  },
  Mobility: {
    accent: "rgb(103, 232, 249)",
    accentSoft: "rgba(103, 232, 249, 0.16)",
    accentStrong: "rgb(207, 250, 254)",
    glow: "rgba(103, 232, 249, 0.18)",
    icon: "mobility",
  },
  "Cervical Isolation": {
    accent: "rgb(148, 163, 184)",
    accentSoft: "rgba(148, 163, 184, 0.16)",
    accentStrong: "rgb(226, 232, 240)",
    glow: "rgba(148, 163, 184, 0.18)",
    icon: "mobility",
  },
};

function ManualExerciseCategoryIcon({
  className = "h-4 w-4",
  name,
}: {
  className?: string;
  name: ManualExerciseCategoryIconName;
}) {
  const iconProps = {
    "aria-hidden": true,
    className,
    fill: "none",
    focusable: false,
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "lower":
      return (
        <svg {...iconProps}>
          <path d="M9 3v6l-2.5 5.5 4 1.5 2-5 3.5 3-1 7h4l1-9-5.5-5V3" />
          <path d="M7 21h5" />
        </svg>
      );
    case "upper":
      return (
        <svg {...iconProps}>
          <path d="M6 7v10" />
          <path d="M18 7v10" />
          <path d="M3 9v6" />
          <path d="M21 9v6" />
          <path d="M6 12h12" />
        </svg>
      );
    case "core":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="7" />
          <path d="M12 5v14" />
          <path d="M5 12h14" />
          <path d="M8.5 8.5h.01" />
          <path d="M15.5 15.5h.01" />
        </svg>
      );
    case "power":
      return (
        <svg {...iconProps}>
          <path d="M13 2 4 14h7l-1 8 10-13h-7l1-7Z" />
        </svg>
      );
    case "mobility":
      return (
        <svg {...iconProps}>
          <path d="M22 12h-4l-3 8-6-16-3 8H2" />
        </svg>
      );
    case "saved":
      return (
        <svg {...iconProps} fill="currentColor">
          <path d="m12 2 3.09 6.26 6.91 1-5 4.87 1.18 6.87L12 17.77 5.82 21 7 14.13l-5-4.87 6.91-1L12 2Z" />
        </svg>
      );
    case "today":
      return (
        <svg {...iconProps}>
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect x="3" y="4" width="18" height="18" rx="3" />
          <path d="M3 10h18" />
          <path d="m8.5 15 2.2 2.2L16 12" />
        </svg>
      );
    case "user":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );
    default:
      return (
        <svg {...iconProps}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
          <path d="M9 6h7" />
          <path d="M9 10h5" />
          <path d="M9 14h6" />
        </svg>
      );
  }
}

const manualExercisePatternCategoryByToken: Record<
  string,
  ManualExerciseMovementCategory
> = {
  "anti-extension": "Core",
  "anti-lateral-flexion": "Core",
  "anti-rotation": "Core",
  carry: "Athletic",
  conditioning: "Athletic",
  core: "Core",
  crawl: "Athletic",
  flexion: "Core",
  gait: "Athletic",
  hinge: "Lower Body Compound",
  "hip-thrust-bridge": "Lower Body Compound",
  "horizontal-pull": "Upper Pull",
  "horizontal-push": "Upper Push",
  jump: "Athletic",
  lunge: "Lower Body Compound",
  mobility: "Mobility",
  power: "Athletic",
  "power-push": "Athletic",
  pull: "Upper Pull",
  rotation: "Core",
  squat: "Lower Body Compound",
  "squat-to-press": "Integrated",
  sprint: "Athletic",
  "step-up": "Lower Body Compound",
  throw: "Athletic",
  "vertical-pull": "Upper Pull",
  "vertical-push": "Upper Push",
};

const normalizeManualExerciseToken = (value?: string) =>
  (value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getManualExerciseMovementCategory = (
  exercise: Exercise,
): ManualExerciseMovementCategory => {
  const patternToken = normalizeManualExerciseToken(exercise.pattern);
  const nameToken = normalizeManualExerciseToken(exercise.name);
  const bodyToken = normalizeManualExerciseToken(exercise.body);
  const combinedToken = `${nameToken}-${patternToken}-${bodyToken}`;

  if (combinedToken.includes("neck") || combinedToken.includes("cervical")) {
    return "Cervical Isolation";
  }
  if (combinedToken.includes("mobility") || combinedToken.includes("stretch")) {
    return "Mobility";
  }
  if (
    combinedToken.includes("thruster") ||
    combinedToken.includes("turkish") ||
    combinedToken.includes("bear-crawl") ||
    patternToken === "squat-to-press"
  ) {
    return "Integrated";
  }
  if (
    combinedToken.includes("calf") ||
    combinedToken.includes("tibialis") ||
    combinedToken.includes("leg-extension") ||
    combinedToken.includes("leg-curl") ||
    combinedToken.includes("hip-abduction") ||
    combinedToken.includes("hip-adduction") ||
    combinedToken.includes("kickback") ||
    combinedToken.includes("frog-pump")
  ) {
    return "Lower Body Isolation";
  }
  if (
    combinedToken.includes("curl") ||
    combinedToken.includes("triceps") ||
    combinedToken.includes("wrist") ||
    combinedToken.includes("face-pull") ||
    combinedToken.includes("external-rotation") ||
    combinedToken.includes("internal-rotation")
  ) {
    return "Arm Isolation";
  }
  if (manualExercisePatternCategoryByToken[patternToken]) {
    return manualExercisePatternCategoryByToken[patternToken];
  }
  if (bodyToken.includes("chest") || bodyToken.includes("shoulder")) {
    return "Upper Push";
  }
  if (bodyToken.includes("back")) return "Upper Pull";
  if (
    bodyToken.includes("leg") ||
    bodyToken.includes("glute") ||
    bodyToken.includes("hamstring") ||
    bodyToken.includes("posterior-chain")
  ) {
    return "Lower Body Compound";
  }
  if (bodyToken.includes("core")) return "Core";

  return "Athletic";
};

const getManualExerciseFallbacks = (exerciseIds: readonly string[]) =>
  exerciseIds
    .map((exerciseId) =>
      exerciseLibrary.find((exercise) => exercise.id === exerciseId),
    )
    .filter((exercise): exercise is Exercise => Boolean(exercise));

const createManualExerciseLibraryCategories = ({
  favoriteExercises,
  myPlanExercises,
}: {
  favoriteExercises: Exercise[];
  myPlanExercises: Exercise[];
}) => {
  const grouped = exerciseLibrary.reduce((categories, exercise) => {
    const label = getManualExerciseMovementCategory(exercise);
    const current = categories.get(label) || [];
    current.push(exercise);
    categories.set(label, current);

    return categories;
  }, new Map<ManualExerciseMovementCategory, Exercise[]>());

  return manualExerciseLibraryBaseCategories.map((category) => {
    const fallbackExercises = getManualExerciseFallbacks(
      category.fallbackExerciseIds,
    );
    const exercises =
      category.id === "my-plan"
        ? myPlanExercises.length
          ? myPlanExercises
          : fallbackExercises
        : category.id === "favorites"
          ? favoriteExercises.length
            ? favoriteExercises
            : fallbackExercises
          : grouped.get(category.label as ManualExerciseMovementCategory) || [];

    return {
      exercises,
      helper:
        category.id === "my-plan"
          ? myPlanExercises.length
            ? `${myPlanExercises.length.toLocaleString()} planned`
            : "Plan preview"
          : category.id === "favorites"
            ? favoriteExercises.length
              ? `${favoriteExercises.length.toLocaleString()} saved`
              : "Favorite preview"
            : `${exercises.length.toLocaleString()} cards`,
      id: category.id,
      label: category.label,
    };
  });
};

function ManualExerciseLibraryPreview({
  activeCategoryId,
  categories,
  manualStatsDraft,
  onCategorySelect,
  onCategoryShift,
  onExerciseSelect,
  onManualStatsDraftChange,
  onSaveManualStats,
  selectedExerciseCue,
  selectedExerciseIds,
}: {
  activeCategoryId: string;
  categories: ManualExerciseLibraryCategory[];
  manualStatsDraft: ManualStatsDraft;
  onCategorySelect: (categoryId: string) => void;
  onCategoryShift: (direction: "left" | "right") => void;
  onExerciseSelect: (exercise: Exercise) => void;
  onManualStatsDraftChange: (
    field: keyof ManualStatsDraft,
    value: string,
  ) => void;
  onSaveManualStats: () => void;
  selectedExerciseCue?: string;
  selectedExerciseIds: Set<string>;
}) {
  const activeCategory =
    categories.find(
      (category) => category.id === activeCategoryId,
    ) || categories[0];
  const visibleExercises = activeCategory?.exercises || [];
  const exerciseCardScrollerRef = useRef<HTMLDivElement | null>(null);
  const [exerciseCardsCanScrollDown, setExerciseCardsCanScrollDown] =
    useState(false);
  const quickManualSliderFields: Array<{
    defaultValue: number;
    field: keyof Pick<ManualStatsDraft, "load" | "reps" | "rpe" | "sets">;
    label: string;
    max: number;
    min: number;
    step: number;
    valueLabel: (value: number) => string;
  }> = [
    {
      defaultValue: 3,
      field: "sets",
      label: "Sets",
      max: 10,
      min: 1,
      step: 1,
      valueLabel: (value) => `${value}`,
    },
    {
      defaultValue: 10,
      field: "reps",
      label: "Reps",
      max: 40,
      min: 1,
      step: 1,
      valueLabel: (value) => `${value}`,
    },
    {
      defaultValue: 185,
      field: "load",
      label: "Load",
      max: 450,
      min: 0,
      step: 5,
      valueLabel: (value) => (value >= 450 ? "450+ lb" : `${value} lb`),
    },
    {
      defaultValue: 8,
      field: "rpe",
      label: "RPE",
      max: 10,
      min: 1,
      step: 1,
      valueLabel: (value) => `${value}/10`,
    },
  ];
  const getQuickManualSliderValue = (
    field: (typeof quickManualSliderFields)[number],
  ) => {
    const rawValue = manualStatsDraft[field.field];
    const numericValue = Number.parseFloat(
      String(rawValue).replace(/[^\d.]/g, ""),
    );
    const fallbackValue = Number.isFinite(numericValue)
      ? numericValue
      : field.defaultValue;

    return Math.min(field.max, Math.max(field.min, fallbackValue));
  };
  const activeCategoryIndex = Math.max(
    0,
    categories.findIndex((category) => category.id === activeCategory?.id),
  );
  const maxExerciseCount = Math.max(
    1,
    ...categories.map((category) => category.exercises.length),
  );
  const getCategoryOrbitOffset = (categoryIndex: number) => {
    const totalCategories = Math.max(1, categories.length);
    let offset = categoryIndex - activeCategoryIndex;

    if (totalCategories > 1) {
      const halfCategoryCount = totalCategories / 2;

      if (offset > halfCategoryCount) offset -= totalCategories;
      if (offset < -halfCategoryCount) offset += totalCategories;
    }

    return offset;
  };
  const updateExerciseCardsScrollCue = (
    scroller = exerciseCardScrollerRef.current,
  ) => {
    if (!scroller) return;

    const hasMoreBelow =
      scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 4;

    setExerciseCardsCanScrollDown((current) =>
      current === hasMoreBelow ? current : hasMoreBelow,
    );
  };
  const scrollExerciseCardsDown = () => {
    const scroller = exerciseCardScrollerRef.current;

    if (!scroller) return;

    scroller.scrollBy({
      behavior: "smooth",
      top: Math.max(132, scroller.clientHeight * 0.72),
    });
  };

  useEffect(() => {
    const scroller = exerciseCardScrollerRef.current;

    if (!scroller) return;

    const updateScrollCue = () => updateExerciseCardsScrollCue(scroller);
    const animationFrame = window.requestAnimationFrame(() => {
      scroller.scrollTop = 0;
      updateScrollCue();
    });
    let resizeObserver: ResizeObserver | null = null;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateScrollCue);
      resizeObserver.observe(scroller);
    }

    window.addEventListener("resize", updateScrollCue);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", updateScrollCue);
      resizeObserver?.disconnect();
    };
  }, [activeCategory?.id, selectedExerciseCue, visibleExercises.length]);

  return (
    <div className="w-full">
      <div className="relative mx-auto flex max-w-[56rem] items-center justify-center gap-2 text-center">
        <button
          type="button"
          aria-label="Previous exercise category"
          onClick={() => onCategoryShift("left")}
          className="grid h-9 w-8 shrink-0 place-items-center rounded-xl border border-transparent bg-transparent text-xs font-black text-cyan-100/80 transition hover:-translate-x-0.5 hover:border-amber-200/28 hover:bg-amber-300/8 hover:text-amber-100 active:scale-95"
        >
          &lt;
        </button>
        <div
          aria-label="Manual stats exercise category orbital"
          className="exercise-library-row-title-icon-line exercise-library-row-title-icon-line--orbit relative min-w-0 flex-1 overflow-visible px-1 py-1"
          style={{ height: "4.8rem", minHeight: "4.8rem" }}
        >
          {categories.map((category, categoryIndex) => {
            const active = category.id === activeCategory?.id;
            const orbitOffset = getCategoryOrbitOffset(categoryIndex);
            const orbitVisible = Math.abs(orbitOffset) <= 4;
            const categoryTheme =
              manualExerciseCategoryThemeByLabel[category.label] ||
              manualExerciseCategoryThemeByLabel.Mobility;
            const goalFillPercent = Math.round(
              (category.exercises.length / maxExerciseCount) * 100,
            );
            const categoryStyle = {
              "--exercise-category-goal-progress": `${goalFillPercent}%`,
              "--exercise-theme-accent": categoryTheme.accent,
              "--exercise-theme-accent-soft": categoryTheme.accentSoft,
              "--exercise-theme-accent-strong": categoryTheme.accentStrong,
              "--exercise-theme-glow": categoryTheme.glow,
            } as CSSProperties;

            return (
              <span
                key={category.id}
                aria-hidden={orbitVisible ? undefined : true}
                className="exercise-library-horizontal-card-scroller-slot relative flex shrink-0 overflow-visible"
                data-dashboard-tooltip={`${category.label}. ${category.helper}`}
                data-orbit-offset={orbitVisible ? String(orbitOffset) : undefined}
                data-orbit-visible={orbitVisible ? "true" : undefined}
              >
                <button
                  type="button"
                  aria-pressed={active}
                  data-section-key={category.id}
                  onClick={() => onCategorySelect(category.id)}
                  style={categoryStyle}
                  tabIndex={orbitVisible ? 0 : -1}
                  className={`exercise-library-page-section-tab ${
                    active
                      ? "exercise-library-page-section-tab--active"
                      : "exercise-library-page-section-tab--inactive"
                  } group/tile flex h-11 shrink-0 items-center gap-2 border py-2 text-left transition duration-200 sm:h-12 ${
                    active
                      ? "w-[10rem] scale-[1.01] justify-start border-cyan-300/40 bg-cyan-300/10 px-3 text-white shadow-[0_0_28px_rgba(34,211,238,0.18)] sm:w-[11.25rem] sm:px-3.5"
                      : "w-11 justify-center border-white/10 bg-white/[0.04] px-2 text-slate-100 opacity-[0.88] hover:-translate-y-0.5 hover:border-cyan-200/24 hover:bg-cyan-300/10 hover:opacity-100 sm:w-12"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="exercise-library-page-section-tab__goal-fill"
                  />
                  <span
                    aria-hidden="true"
                    className="exercise-library-page-section-tab__icon"
                  >
                    <ManualExerciseCategoryIcon
                      className="h-4 w-4"
                      name={categoryTheme.icon}
                    />
                    <span className="exercise-library-page-section-tab__status grid place-items-center">
                      <span className="block rounded-full bg-current shadow-[0_0_10px_currentColor]" />
                    </span>
                  </span>
                  {active ? (
                    <span className="exercise-library-page-section-tab__content relative z-10 min-w-0">
                      <span className="block truncate text-[10px] font-black uppercase leading-4 tracking-[0.14em] sm:text-[11px]">
                        {category.label}
                      </span>
                      <span className="mt-0.5 block truncate text-[8px] font-black uppercase tracking-[0.08em] opacity-78">
                        {category.helper}
                      </span>
                    </span>
                  ) : null}
                </button>
              </span>
            );
          })}
        </div>
        <button
          type="button"
          aria-label="Next exercise category"
          onClick={() => onCategoryShift("right")}
          className="grid h-9 w-8 shrink-0 place-items-center rounded-xl border border-transparent bg-transparent text-xs font-black text-cyan-100/80 transition hover:translate-x-0.5 hover:border-amber-200/28 hover:bg-amber-300/8 hover:text-amber-100 active:scale-95"
        >
          &gt;
        </button>
      </div>

      <div className="mt-3 rounded-[24px] border border-cyan-200/14 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.10),transparent_42%),rgba(2,6,23,0.38)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-3">
        <div className="grid items-stretch gap-2 min-[760px]:h-[24rem] min-[760px]:grid-cols-[minmax(0,1fr)_12rem] min-[1020px]:h-[25rem] min-[1020px]:grid-cols-[minmax(0,1fr)_13rem]">
          <div className="relative flex min-h-[21rem] min-w-0 flex-col overflow-hidden rounded-[20px] border border-cyan-200/10 bg-slate-950/24 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] min-[760px]:h-full min-[760px]:min-h-0">
            {selectedExerciseCue ? (
              <p className="mb-1.5 line-clamp-1 text-center text-[10px] font-semibold text-cyan-100/70">
                Cue: {selectedExerciseCue}
              </p>
            ) : null}
            <div
              data-dashboard-orbiter-local-scroll="true"
              ref={exerciseCardScrollerRef}
              onScroll={() => updateExerciseCardsScrollCue()}
              className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 scroll-smooth [scrollbar-color:rgba(34,211,238,0.36)_rgba(15,23,42,0.56)] [scrollbar-width:thin] [touch-action:pan-y] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/38 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/58"
            >
              <div className="grid gap-1.5 pb-8 sm:grid-cols-3">
                {visibleExercises.map((exercise) => {
                  const selected = selectedExerciseIds.has(exercise.id);

                  return (
                    <button
                      key={`${activeCategory?.id}-${exercise.id}`}
                      type="button"
                      aria-label={`Attach ${exercise.name}`}
                      onClick={() => onExerciseSelect(exercise)}
                      className={`group relative isolate min-h-[96px] overflow-hidden rounded-[16px] border p-2 text-left transition hover:-translate-y-0.5 active:scale-[0.98] ${
                        selected
                          ? "border-emerald-200/50 bg-emerald-300/12 text-emerald-50 shadow-[0_0_26px_rgba(16,185,129,0.16)]"
                          : "border-white/10 bg-white/[0.045] text-slate-200 hover:border-cyan-200/34 hover:bg-cyan-300/8 hover:text-white"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 -z-10 bg-cover bg-center opacity-48 transition duration-300 group-hover:scale-105 group-hover:opacity-60"
                        style={{
                          backgroundImage: `linear-gradient(180deg, rgba(2,6,23,0.08), rgba(2,6,23,0.88)), url(${exercise.image})`,
                        }}
                      />
                      <span className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.16),transparent_40%),linear-gradient(180deg,transparent,rgba(2,6,23,0.78))]" />

                      <span className="relative flex min-h-[80px] flex-col justify-between">
                        <span className="flex items-start justify-between gap-1.5">
                          <span className="rounded-full border border-cyan-100/24 bg-slate-950/58 px-1.5 py-0.5 text-[6.5px] font-black uppercase tracking-[0.07em] text-cyan-100 backdrop-blur">
                            {exercise.body}
                          </span>
                          <span
                            className={`rounded-full border px-1.5 py-0.5 text-[6.5px] font-black uppercase tracking-[0.07em] backdrop-blur ${
                              selected
                                ? "border-emerald-100/44 bg-emerald-300/18 text-emerald-100"
                                : "border-white/14 bg-slate-950/54 text-slate-200"
                            }`}
                          >
                            {selected ? "Attached" : "Add"}
                          </span>
                        </span>

                        <span className="mt-auto block">
                          <span className="block truncate text-[6.5px] font-black uppercase tracking-[0.09em] text-cyan-100/80">
                            {exercise.pattern} / {exercise.equipment}
                          </span>
                          <span className="mt-0.5 block truncate text-[12px] font-black leading-4 text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.55)]">
                            {exercise.name}
                          </span>
                          <span className="mt-0.5 line-clamp-1 text-[8px] font-semibold leading-3 text-slate-200/88">
                            {exercise.muscles}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {exerciseCardsCanScrollDown ? (
              <>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-2 bottom-2 h-14 rounded-b-[18px] bg-gradient-to-t from-slate-950/92 via-slate-950/52 to-transparent"
                />
                <button
                  type="button"
                  aria-label="Scroll exercise cards down"
                  onClick={scrollExerciseCardsDown}
                  className="absolute bottom-3 left-1/2 z-10 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full border border-cyan-100/28 bg-slate-950/82 text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.22)] backdrop-blur transition hover:-translate-y-0.5 hover:border-cyan-100/50 hover:bg-cyan-300/14 active:scale-95"
                >
                  <span
                    aria-hidden="true"
                    className="mb-1 h-2.5 w-2.5 rotate-45 border-b-2 border-r-2 border-current"
                  />
                </button>
              </>
            ) : null}
          </div>

          <div className="grid gap-1.5 min-[760px]:h-full min-[760px]:content-start">
            {quickManualSliderFields.map((field) => {
              const sliderValue = getQuickManualSliderValue(field);
              const sliderFillPercent =
                ((sliderValue - field.min) / (field.max - field.min)) * 100;
              const sliderTrackStyle = {
                background: `linear-gradient(90deg, rgba(34,211,238,0.95) 0%, rgba(103,232,249,0.95) ${sliderFillPercent}%, rgba(148,163,184,0.28) ${sliderFillPercent}%, rgba(148,163,184,0.28) 100%)`,
                boxShadow: "0 0 18px rgba(34,211,238,0.14)",
              } as CSSProperties;

              return (
                <label
                  key={`quick-${field.field}`}
                  className="min-w-0 rounded-[16px] border border-white/10 bg-slate-950/48 px-2.5 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-cyan-200/28 hover:bg-cyan-300/8"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">
                      {field.label}
                    </span>
                    <span className="text-[14px] font-black uppercase tracking-[0.05em] text-cyan-50">
                      {field.valueLabel(sliderValue)}
                    </span>
                  </span>
                  <input
                    aria-label={`${field.label} slider`}
                    type="range"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={sliderValue}
                    onChange={(event) =>
                      onManualStatsDraftChange(field.field, event.target.value)
                    }
                    style={sliderTrackStyle}
                    className="mt-2 h-2 w-full cursor-ew-resize appearance-none rounded-full outline-none transition [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-cyan-50 [&::-moz-range-thumb]:bg-cyan-300 [&::-moz-range-thumb]:shadow-[0_0_16px_rgba(34,211,238,0.55)] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-cyan-50 [&::-webkit-slider-thumb]:bg-cyan-300 [&::-webkit-slider-thumb]:shadow-[0_0_16px_rgba(34,211,238,0.55)]"
                  />
                </label>
              );
            })}

            <button
              type="button"
              onClick={onSaveManualStats}
              className="mt-0.5 inline-flex min-h-[38px] w-full items-center justify-center rounded-[16px] bg-gradient-to-r from-amber-300 to-cyan-300 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.16)] transition hover:-translate-y-0.5 hover:shadow-[0_0_34px_rgba(250,204,21,0.18)] active:scale-[0.99]"
            >
              Save Stat
            </button>
          </div>
        </div>

        <div className="mt-3 flex justify-center">
          <Link
            href={ROUTES.workoutBuilder.exerciseLibrary}
            className="inline-flex min-h-[34px] items-center justify-center rounded-full border border-cyan-200/24 bg-cyan-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-100/48 hover:bg-cyan-300/18 hover:text-cyan-50"
          >
            Open full Exercise Library
          </Link>
        </div>
      </div>
    </div>
  );
}

const formatDashboardDate = (value?: string) => {
  if (!value) return "No workout logged yet";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently logged";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const formatCompactDateTime = (value?: string) => {
  if (!value) return "Not started";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const formatStreakDeadline = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    weekday: "short",
  }).format(date);

const formatHeaderMeterDeadline = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    weekday: "short",
  }).format(date);

const formatHeaderMeterFullDateTime = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    weekday: "long",
  }).format(date);

const formatAchievementEstimateDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(date);

const formatAchievementEstimateFullDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    weekday: "long",
  }).format(date);

const formatManualLoadDisplay = (value?: string) => {
  const trimmedValue = value?.trim();

  if (!trimmedValue) return "0 lb";
  if (/\b(lb|lbs|kg)\b/i.test(trimmedValue)) return trimmedValue;

  return `${trimmedValue} lb`;
};

const formatManualRpeDisplay = (value?: string) => {
  const trimmedValue = value?.trim();

  if (!trimmedValue) return "0/10";
  if (trimmedValue.includes("/")) return trimmedValue;

  return `${trimmedValue}/10`;
};

const buildTemplateWorkoutHref = (templateId: string) =>
  `${ROUTES.dashboard.sessionWorkout}?template=${encodeURIComponent(
    templateId,
  )}`;

const getWorkoutTemplateIcon = (template: LocalWorkoutBuilderTemplate) => {
  const signature = template.exercises
    .map((exercise) =>
      [exercise.body, exercise.pattern, exercise.goal, exercise.equipment]
        .join(" ")
        .toLowerCase(),
    )
    .join(" ");

  if (signature.includes("leg") || signature.includes("lower")) return "🦵";
  if (signature.includes("push") || signature.includes("chest")) return "💪";
  if (signature.includes("pull") || signature.includes("back")) return "🔗";
  if (signature.includes("cardio") || signature.includes("conditioning")) return "⚡";
  if (signature.includes("mobility") || signature.includes("recovery")) return "🧘";

  return "🏋️";
};

const getWorkoutTemplateTag = (template: LocalWorkoutBuilderTemplate) =>
  template.exercises[0]?.body ||
  template.exercises[0]?.pattern ||
  template.exercises[0]?.goal ||
  "Custom";

const groupWorkoutDates = (entries: LocalExerciseStatEntry[]) =>
  Array.from(
    new Set(
      entries
        .filter((entry) => entry.source === "workout-session")
        .map((entry) => entry.date)
        .filter(Boolean),
    ),
  );

const toLoggedNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const clampDashboardPercent = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

const isDashboardValueComplete = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(isDashboardValueComplete);
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "boolean") return value;
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(
      isDashboardValueComplete,
    );
  }

  return false;
};

const getDashboardCompletionFromValues = (values: unknown[]) => {
  if (!values.length) return 0;

  return clampDashboardPercent(
    (values.filter(isDashboardValueComplete).length / values.length) * 100,
  );
};

const readDashboardText = (...values: unknown[]) => {
  const found = values.find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );

  return typeof found === "string" ? found.trim() : "";
};

const readDashboardNumber = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "string") continue;

    const parsed = Number(value.replace(/,/g, "").trim());
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return 0;
};

const formatDashboardCompactCalories = (value: number) => {
  if (value >= 10000) return `${(value / 1000).toFixed(1)}k`;
  return Math.round(value).toLocaleString();
};

const readDashboardLocalRecord = (key: string) => {
  if (typeof window === "undefined") return {};

  try {
    return asRecord(safeJsonParse(window.localStorage.getItem(key)));
  } catch {
    return {};
  }
};

const getDashboardProfileCompletion = (
  profile: Record<string, unknown>,
) => {
  const measurements = asRecord(profile.measurements);

  return getDashboardCompletionFromValues([
    profile.displayName,
    profile.birthday,
    profile.height,
    profile.currentWeight,
    measurements.weight,
    profile.waist || measurements.waist,
    profile.primaryGoal,
    profile.secondaryGoal,
    profile.goalMode,
    profile.sessionsPerWeek,
    profile.trainingAge,
    profile.sleepGoal,
    profile.occupation,
    profile.phone,
    profile.email,
  ]);
};

const getDashboardGoalsCompletion = (goals: Record<string, unknown>) =>
  getDashboardCompletionFromValues([
    goals.planDirections,
    goals.primaryGoal,
    goals.secondaryGoal,
    goals.goalMode,
    goals.goalDeadline,
    goals.goalMilestones,
    goals.goalPriorityRanking,
    goals.goalWeight || goals.currentWeight,
    goals.targetWeeklySessions,
    goals.targetWeeklySets,
    goals.targetProtein,
    goals.targetSteps || goals.stepsGoal,
    goals.targetSleep,
    goals.waterGoal,
    goals.benchmarkGoal,
    goals.motivationFocus,
    goals.planDirectionNotes,
  ]);

const getDashboardGoalFocus = (
  profile: Record<string, unknown>,
  goals: Record<string, unknown>,
) =>
  readDashboardText(
    Array.isArray(goals.planDirections) ? goals.planDirections[0] : "",
    goals.primaryGoal,
    goals.goalMode,
    profile.primaryGoal,
    profile.goalMode,
  );

const readDashboardFoundationProgress = (): DashboardFoundationProgress => {
  if (typeof window === "undefined") {
    return {
      goalFocus: "",
      goalsCompletion: 0,
      goalsVisited: false,
      profileCompletion: 0,
      profileVisited: false,
    };
  }

  const profile = readDashboardLocalRecord(SOUND_FITNESS_PROFILE_STORAGE_KEY);
  const goals = readDashboardLocalRecord(DASHBOARD_GOALS_STORAGE_KEY);

  return {
    goalFocus: getDashboardGoalFocus(profile, goals),
    goalsCompletion: getDashboardGoalsCompletion(goals),
    goalsVisited:
      window.localStorage.getItem(DASHBOARD_GOALS_VISITED_KEY) === "true",
    profileCompletion: getDashboardProfileCompletion(profile),
    profileVisited:
      window.localStorage.getItem(DASHBOARD_PROFILE_VISITED_KEY) === "true",
  };
};

const readDashboardProfileIconUrl = (fallback = DASHBOARD_PROFILE_ICON_FALLBACK) => {
  if (typeof window === "undefined") return fallback;

  const profile = readDashboardLocalRecord(SOUND_FITNESS_PROFILE_STORAGE_KEY);
  return (
    readDashboardText(
      profile.profileImage,
      profile.avatarUrl,
      profile.avatar_url,
      fallback,
    ) || DASHBOARD_PROFILE_ICON_FALLBACK
  );
};

const getDashboardPulseIndicatorTone = (
  percent: number,
): DashboardPulseIndicatorTone => {
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
      } as DashboardPulseIndicatorStyle,
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
      } as DashboardPulseIndicatorStyle,
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
      } as DashboardPulseIndicatorStyle,
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
    } as DashboardPulseIndicatorStyle,
  };
};

type DashboardJourneyStepState = "active" | "complete" | "default" | "locked";

type DashboardJourneyStep = {
  completion?: number;
  href: string;
  icon: string;
  label: string;
  state: DashboardJourneyStepState;
};

type DashboardCardTone =
  | "amber"
  | "cyan"
  | "emerald"
  | "fuchsia"
  | "sky"
  | "violet";

type DashboardHeaderLink = {
  completion: number;
  href: string;
  icon: string;
  label: string;
  meta: string;
  points: number;
  tone: string;
  toneKey: DashboardCardTone;
};

type DashboardHeaderNewsHeadline = {
  category: string;
  label: string;
  tone?: "advice" | "alert" | "default" | "quote" | "trivia";
};

type DashboardNavigationCard = {
  description: string;
  href: string;
  icon: string;
  journeySteps?: DashboardJourneyStep[];
  status: string;
  title: string;
  tone: DashboardCardTone;
};

type DashboardWeeklyRecapCard = {
  description: string;
  metric: string;
  rows: Array<{
    detail: string;
    label: string;
    value: string;
  }>;
  title: string;
  tone: DashboardCardTone;
};

type DashboardMySoundCard = {
  description: string;
  href: string;
  icon: string;
  metric: string;
  rows: Array<{
    detail: string;
    label: string;
    value: string;
  }>;
  title: string;
  tone: DashboardCardTone;
};

type MasterJourneyNode = {
  href: string;
  icon: string;
  label: string;
  metric: string;
  state: DashboardJourneyStepState;
};

type DashboardMasterPlanTimelineItem = {
  dateLabel: string;
  detail: string;
  href: string;
  icon: string;
  metric: string;
  status: string;
  title: string;
  tone: DashboardCardTone;
};

type DashboardFoundationProgress = {
  goalFocus: string;
  goalsCompletion: number;
  goalsVisited: boolean;
  profileCompletion: number;
  profileVisited: boolean;
};

type DashboardPulseIndicatorStyle = CSSProperties & {
  "--profile-indicator-glow": string;
  "--profile-indicator-glow-dim": string;
  "--profile-indicator-glow-soft": string;
};

type DashboardPulseIndicatorTone = {
  dotActive: string;
  dotInactive: string;
  motion: "pulse" | "water";
  outerActive: string;
  outerInactive: string;
  style: DashboardPulseIndicatorStyle;
};

type DashboardOrbitDirection = "left" | "right";

type DashboardPointerStartRef = {
  current: number | null;
};

type DashboardPointerMovedRef = {
  current: boolean;
};

type DashboardVerticalPointerStart = {
  x: number;
  y: number;
};

type DashboardScrollButtonDirection = "down" | "left" | "right" | "up";
type DashboardHorizontalScrollDirection = Extract<
  DashboardScrollButtonDirection,
  "left" | "right"
>;

type DashboardHeaderVortexMode = "clockwise" | "counter";

type DashboardHeaderVortexPhase = "active" | "idle" | "settling";

type DashboardProfileHubOrbitItem = {
  helper: string;
  href: string;
  icon: string;
  label: string;
  references: string[];
  stat: string;
  tone: string;
};

const DASHBOARD_HERO_ACHIEVEMENT_VISIBLE_DISTANCE = 3;

const dashboardHeroAchievementOrbitSlots = [
  { blur: 0, opacity: 1, rotateY: 0, scale: 1, x: 0, y: 0, zIndex: 42 },
  {
    blur: 0.2,
    opacity: 0.76,
    rotateY: -14,
    scale: 0.82,
    x: 158,
    y: 8,
    zIndex: 30,
  },
  {
    blur: 1.1,
    opacity: 0.34,
    rotateY: -28,
    scale: 0.62,
    x: 248,
    y: 18,
    zIndex: 16,
  },
  {
    blur: 2.1,
    opacity: 0.12,
    rotateY: -42,
    scale: 0.46,
    x: 328,
    y: 30,
    zIndex: 8,
  },
];

const dashboardNavigationCards: DashboardNavigationCard[] = [
  {
    title: "Workout / Sessions",
    href: ROUTES.dashboard.sessions,
    description: "Sessions, plans, builders, and training progression.",
    icon: "🏋️",
    tone: "cyan",
    status: "Primary",
    journeySteps: [
      {
        icon: "Dash",
        label: "Dashboard",
        href: ROUTES.dashboard.sessions,
        state: "complete",
      },
      {
        icon: "Plan",
        label: "My Plan",
        href: ROUTES.dashboard.myPlan,
        state: "default",
      },
      {
        icon: "Build",
        label: "Workout Builder",
        href: ROUTES.workoutBuilder.home,
        state: "active",
      },
      {
        icon: "Lib",
        label: "Exercise Library",
        href: ROUTES.workoutBuilder.exerciseLibrary,
        state: "default",
      },
    ],
  },
  {
    title: "Nutrition / Fuel",
    href: ROUTES.nutritionPortal.home,
    description: "Meals, hydration, grocery planning, and fuel tracking.",
    icon: "🍽️",
    tone: "emerald",
    status: "Fuel",
    journeySteps: [
      { icon: "🧭", label: "Overview", href: ROUTES.nutritionPortal.home, state: "complete" },
      { icon: "💧", label: "Hydrate", href: ROUTES.nutritionPortal.hydration, state: "active" },
      { icon: "🍽️", label: "Meals", href: ROUTES.nutritionPortal.meals, state: "default" },
      { icon: "🛒", label: "Grocery", href: ROUTES.nutritionPortal.grocery, state: "default" },
      { icon: "🔥", label: "Calories", href: "/nutrition/calories", state: "default" },
      { icon: "📈", label: "Trends", href: "/nutrition/progress", state: "default" },
      { icon: "🧠", label: "Insights", href: "/nutrition/insights", state: "locked" },
    ],
  },
  {
    title: "Recovery",
    href: ROUTES.dashboard.recovery,
    description: "Readiness, mobility, soreness, and recovery support.",
    icon: "💧",
    tone: "sky",
    status: "Recovery",
  },
  {
    title: "Performance",
    href: ROUTES.performance.home,
    description: "Power, conditioning, capacity, and athletic development.",
    icon: "⚡",
    tone: "amber",
    status: "Athletic",
    journeySteps: [
      { icon: "🧭", label: "Overview", href: ROUTES.performance.home, state: "complete" },
      { icon: "⚡", label: "Power", href: ROUTES.dashboard.performance, state: "active" },
      { icon: "🫀", label: "Cardio", href: "/performance#cardio", state: "default" },
      { icon: "🏃", label: "Run", href: "/performance#running", state: "default" },
      { icon: "🧪", label: "Tests", href: "/performance#tests", state: "default" },
      { icon: "📈", label: "Metrics", href: ROUTES.dashboard.stats, state: "default" },
      { icon: "🧠", label: "Insights", href: ROUTES.dashboard.insights, state: "locked" },
    ],
  },
  {
    title: "Education",
    href: ROUTES.learning.home,
    description: "Technique lessons, coaching concepts, and app guidance.",
    icon: "ED",
    tone: "sky",
    status: "Learning",
    journeySteps: [
      { icon: "ED", label: "Lessons", href: ROUTES.learning.home, state: "active" },
      { icon: "Form", label: "Technique", href: ROUTES.learning.home, state: "default" },
      { icon: "Logic", label: "Training Logic", href: ROUTES.learning.home, state: "default" },
      { icon: "App", label: "App Guide", href: ROUTES.learning.home, state: "default" },
    ],
  },
  {
    title: "Sound World",
    href: ROUTES.soundworld.home,
    description: "Community, rewards, social loops, and Sound Fitness world-building.",
    icon: "SW",
    tone: "fuchsia",
    status: "Community",
    journeySteps: [
      { icon: "SW", label: "World Hub", href: ROUTES.soundworld.home, state: "active" },
      { icon: "Feed", label: "Social", href: ROUTES.dashboard.social, state: "default" },
      { icon: "Post", label: "Post", href: ROUTES.dashboard.socialPost, state: "default" },
      { icon: "Trophy", label: "Achievements", href: ROUTES.dashboard.achievements, state: "default" },
    ],
  },
  {
    title: "Stats",
    href: ROUTES.dashboard.stats,
    description: "Charts, trends, recent activity, and body metrics.",
    icon: "📈",
    tone: "sky",
    status: "Metrics",
  },
  {
    title: "Progress",
    href: ROUTES.dashboard.progress,
    description: "Check-ins, habits, goals, journal notes, and pain tracking.",
    icon: "Progress",
    tone: "emerald",
    status: "Track",
  },
  {
    title: "Goals",
    href: ROUTES.dashboard.goals,
    description: "Plan direction, daily targets, milestones, and motivation.",
    icon: "🎯",
    tone: "violet",
    status: "Planning",
  },
  {
    title: "Calendar",
    href: ROUTES.dashboard.calendar,
    description: "Training calendar, scheduled sessions, and weekly commitments.",
    icon: "Cal",
    tone: "sky",
    status: "Schedule",
  },
  {
    title: "Appointments",
    href: ROUTES.dashboard.sessionBooking,
    description: "Booking requests, coach availability, and upcoming sessions.",
    icon: "Appt",
    tone: "cyan",
    status: "Booking",
  },
  {
    title: "Insights",
    href: ROUTES.dashboard.insights,
    description: "AI coaching context, trends, and progression signals.",
    icon: "🧠",
    tone: "cyan",
    status: "AI",
  },
  {
    title: "Achievements",
    href: ROUTES.dashboard.achievements,
    description: "Badges, streaks, rewards, and locked progression tiers.",
    icon: "🏆",
    tone: "amber",
    status: "Rewards",
  },
  {
    title: "Messages",
    href: ROUTES.dashboard.coachMessaging,
    description: "Coach communication, check-ins, and support threads.",
    icon: "💬",
    tone: "fuchsia",
    status: "Coach",
  },
  {
    title: "Packages",
    href: ROUTES.dashboard.payments,
    description: "Session packages, remaining visits, payment status, and renewals.",
    icon: "Pkg",
    tone: "violet",
    status: "Account",
  },
] as const;

const dashboardSystemCardOrder = [
  "Goals",
  "Insights",
  "Stats",
  "Progress",
  "Calendar",
  "Appointments",
  "Messages",
  "Packages",
  "Achievements",
];

const dashboardSystemCardTitles = new Set(dashboardSystemCardOrder);

const dashboardCommandCenterCards = dashboardNavigationCards.filter(
  (card) => !dashboardSystemCardTitles.has(card.title),
);

const dashboardSystemCards = dashboardNavigationCards
  .filter((card) => dashboardSystemCardTitles.has(card.title))
  .sort(
    (left, right) =>
      dashboardSystemCardOrder.indexOf(left.title) -
      dashboardSystemCardOrder.indexOf(right.title),
  );

const dashboardToneStyles = {
  amber: {
    border: "hover:border-amber-300/45",
    glow: "hover:shadow-[0_0_34px_rgba(251,191,36,0.13)]",
    icon: "bg-amber-300/12 text-amber-100",
    line: "bg-amber-300/60",
  },
  cyan: {
    border: "hover:border-cyan-300/45",
    glow: "hover:shadow-[0_0_34px_rgba(34,211,238,0.15)]",
    icon: "bg-cyan-300/12 text-cyan-100",
    line: "bg-cyan-300/70",
  },
  emerald: {
    border: "hover:border-emerald-300/45",
    glow: "hover:shadow-[0_0_34px_rgba(16,185,129,0.13)]",
    icon: "bg-emerald-300/12 text-emerald-100",
    line: "bg-emerald-300/60",
  },
  fuchsia: {
    border: "hover:border-fuchsia-300/40",
    glow: "hover:shadow-[0_0_34px_rgba(217,70,239,0.12)]",
    icon: "bg-fuchsia-300/12 text-fuchsia-100",
    line: "bg-fuchsia-300/50",
  },
  sky: {
    border: "hover:border-sky-300/45",
    glow: "hover:shadow-[0_0_34px_rgba(14,165,233,0.13)]",
    icon: "bg-sky-300/12 text-sky-100",
    line: "bg-sky-300/60",
  },
  violet: {
    border: "hover:border-violet-300/40",
    glow: "hover:shadow-[0_0_34px_rgba(139,92,246,0.12)]",
    icon: "bg-violet-300/12 text-violet-100",
    line: "bg-violet-300/50",
  },
} as const;

const dashboardIconToneStyles: Record<
  DashboardCardTone,
  { active: string; idle: string }
> = {
  amber: {
    active:
      "border-amber-100/45 bg-amber-300/18 text-amber-100 shadow-[0_0_24px_rgba(250,204,21,0.22)]",
    idle: "border-amber-200/24 bg-amber-300/10 text-amber-100/80 shadow-[0_0_14px_rgba(250,204,21,0.12)]",
  },
  cyan: {
    active:
      "border-cyan-100/45 bg-cyan-300/18 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.22)]",
    idle: "border-cyan-200/24 bg-cyan-300/10 text-cyan-100/80 shadow-[0_0_14px_rgba(34,211,238,0.12)]",
  },
  emerald: {
    active:
      "border-emerald-100/42 bg-emerald-300/16 text-emerald-100 shadow-[0_0_24px_rgba(16,185,129,0.20)]",
    idle: "border-emerald-200/24 bg-emerald-300/10 text-emerald-100/80 shadow-[0_0_14px_rgba(16,185,129,0.12)]",
  },
  fuchsia: {
    active:
      "border-fuchsia-100/40 bg-fuchsia-300/16 text-fuchsia-100 shadow-[0_0_24px_rgba(217,70,239,0.18)]",
    idle: "border-fuchsia-200/22 bg-fuchsia-300/10 text-fuchsia-100/78 shadow-[0_0_14px_rgba(217,70,239,0.10)]",
  },
  sky: {
    active:
      "border-sky-100/44 bg-sky-300/16 text-sky-100 shadow-[0_0_24px_rgba(14,165,233,0.20)]",
    idle: "border-sky-200/24 bg-sky-300/10 text-sky-100/80 shadow-[0_0_14px_rgba(14,165,233,0.12)]",
  },
  violet: {
    active:
      "border-violet-100/42 bg-violet-300/16 text-violet-100 shadow-[0_0_24px_rgba(139,92,246,0.20)]",
    idle: "border-violet-200/24 bg-violet-300/10 text-violet-100/80 shadow-[0_0_14px_rgba(139,92,246,0.12)]",
  },
};

const dashboardJourneyTabIconOnlyStyles: Record<
  DashboardCardTone,
  { active: string; idle: string }
> = {
  amber: {
    active: "text-amber-100 drop-shadow-[0_0_10px_rgba(250,204,21,0.46)]",
    idle: "text-amber-100/72 drop-shadow-[0_0_7px_rgba(250,204,21,0.26)]",
  },
  cyan: {
    active: "text-cyan-50 drop-shadow-[0_0_10px_rgba(34,211,238,0.52)]",
    idle: "text-cyan-100/72 drop-shadow-[0_0_7px_rgba(34,211,238,0.30)]",
  },
  emerald: {
    active: "text-emerald-100 drop-shadow-[0_0_10px_rgba(16,185,129,0.44)]",
    idle: "text-emerald-100/72 drop-shadow-[0_0_7px_rgba(16,185,129,0.24)]",
  },
  fuchsia: {
    active: "text-fuchsia-100 drop-shadow-[0_0_10px_rgba(217,70,239,0.42)]",
    idle: "text-fuchsia-100/70 drop-shadow-[0_0_7px_rgba(217,70,239,0.22)]",
  },
  sky: {
    active: "text-sky-100 drop-shadow-[0_0_10px_rgba(14,165,233,0.46)]",
    idle: "text-sky-100/72 drop-shadow-[0_0_7px_rgba(14,165,233,0.26)]",
  },
  violet: {
    active: "text-violet-100 drop-shadow-[0_0_10px_rgba(139,92,246,0.44)]",
    idle: "text-violet-100/72 drop-shadow-[0_0_7px_rgba(139,92,246,0.24)]",
  },
};

type DashboardHeaderToneStyle = {
  aura: string;
  dot: string;
  glow: string;
  iconEffectStyle: CSSProperties;
  journeyText: string;
  labelText: string;
  metaText: string;
  pointsGlow: string;
  pointsIcon: string;
  pointsLine: string;
  pointsText: string;
  shell: string;
};

const dashboardHeaderToneStyles: Record<
  DashboardCardTone,
  DashboardHeaderToneStyle
> = {
  amber: {
    aura:
      "bg-[radial-gradient(circle_at_20%_24%,rgba(251,191,36,0.24),transparent_42%),radial-gradient(circle_at_82%_68%,rgba(245,158,11,0.14),transparent_46%),linear-gradient(135deg,rgba(251,191,36,0.13),rgba(2,6,23,0.06))]",
    dot: "bg-amber-200 shadow-[0_0_12px_rgba(250,204,21,0.86)]",
    glow: "bg-amber-300/14",
    iconEffectStyle: {
      "--dashboard-header-journey-circle": "rgba(250,204,21,0.42)",
      "--dashboard-header-journey-circle-ring": "rgba(253,224,71,0.42)",
      "--dashboard-header-journey-circle-soft": "rgba(245,158,11,0.22)",
      "--dashboard-header-journey-halo": "rgba(250,204,21,0.54)",
      "--dashboard-header-journey-halo-soft": "rgba(245,158,11,0.22)",
      "--dashboard-header-journey-motion": "rgba(250,204,21,0.86)",
      "--dashboard-header-journey-motion-alt": "rgba(251,146,60,0.64)",
      "--dashboard-header-journey-shadow": "rgba(250,204,21,0.34)",
    } as CSSProperties,
    journeyText: "text-amber-100/82",
    labelText: "text-amber-50 drop-shadow-[0_0_12px_rgba(250,204,21,0.32)]",
    metaText: "text-amber-100/72",
    pointsGlow:
      "bg-[radial-gradient(circle,rgba(250,204,21,0.42),rgba(251,191,36,0.17)_46%,transparent_72%)]",
    pointsIcon:
      "text-amber-200 drop-shadow-[0_0_14px_rgba(250,204,21,0.64)]",
    pointsLine:
      "bg-gradient-to-r from-transparent via-amber-200/78 to-orange-200/52 shadow-[0_0_14px_rgba(250,204,21,0.48)]",
    pointsText: "text-amber-50 hover:bg-amber-300/10",
    shell:
      "border-amber-200/28 bg-amber-300/8 shadow-[0_0_30px_rgba(250,204,21,0.13),inset_0_1px_0_rgba(255,255,255,0.10)]",
  },
  cyan: {
    aura:
      "bg-[radial-gradient(circle_at_20%_24%,rgba(34,211,238,0.24),transparent_42%),radial-gradient(circle_at_82%_68%,rgba(14,165,233,0.14),transparent_46%),linear-gradient(135deg,rgba(34,211,238,0.12),rgba(2,6,23,0.06))]",
    dot: "bg-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.82)]",
    glow: "bg-cyan-300/14",
    iconEffectStyle: {
      "--dashboard-header-journey-circle": "rgba(34,211,238,0.42)",
      "--dashboard-header-journey-circle-ring": "rgba(125,211,252,0.42)",
      "--dashboard-header-journey-circle-soft": "rgba(14,165,233,0.22)",
      "--dashboard-header-journey-halo": "rgba(34,211,238,0.54)",
      "--dashboard-header-journey-halo-soft": "rgba(14,165,233,0.22)",
      "--dashboard-header-journey-motion": "rgba(34,211,238,0.86)",
      "--dashboard-header-journey-motion-alt": "rgba(125,211,252,0.58)",
      "--dashboard-header-journey-shadow": "rgba(34,211,238,0.34)",
    } as CSSProperties,
    journeyText: "text-cyan-100/82",
    labelText: "text-cyan-50 drop-shadow-[0_0_12px_rgba(34,211,238,0.34)]",
    metaText: "text-cyan-100/72",
    pointsGlow:
      "bg-[radial-gradient(circle,rgba(34,211,238,0.42),rgba(14,165,233,0.16)_46%,transparent_72%)]",
    pointsIcon:
      "text-cyan-100 drop-shadow-[0_0_14px_rgba(34,211,238,0.64)]",
    pointsLine:
      "bg-gradient-to-r from-transparent via-cyan-200/78 to-sky-200/52 shadow-[0_0_14px_rgba(34,211,238,0.48)]",
    pointsText: "text-cyan-50 hover:bg-cyan-300/10",
    shell:
      "border-cyan-200/28 bg-cyan-300/8 shadow-[0_0_30px_rgba(34,211,238,0.13),inset_0_1px_0_rgba(255,255,255,0.10)]",
  },
  emerald: {
    aura:
      "bg-[radial-gradient(circle_at_20%_24%,rgba(52,211,153,0.23),transparent_42%),radial-gradient(circle_at_82%_68%,rgba(16,185,129,0.14),transparent_46%),linear-gradient(135deg,rgba(52,211,153,0.12),rgba(2,6,23,0.06))]",
    dot: "bg-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.82)]",
    glow: "bg-emerald-300/14",
    iconEffectStyle: {
      "--dashboard-header-journey-circle": "rgba(52,211,153,0.40)",
      "--dashboard-header-journey-circle-ring": "rgba(110,231,183,0.40)",
      "--dashboard-header-journey-circle-soft": "rgba(16,185,129,0.22)",
      "--dashboard-header-journey-halo": "rgba(52,211,153,0.52)",
      "--dashboard-header-journey-halo-soft": "rgba(16,185,129,0.22)",
      "--dashboard-header-journey-motion": "rgba(52,211,153,0.84)",
      "--dashboard-header-journey-motion-alt": "rgba(45,212,191,0.56)",
      "--dashboard-header-journey-shadow": "rgba(52,211,153,0.32)",
    } as CSSProperties,
    journeyText: "text-emerald-100/82",
    labelText:
      "text-emerald-50 drop-shadow-[0_0_12px_rgba(52,211,153,0.34)]",
    metaText: "text-emerald-100/72",
    pointsGlow:
      "bg-[radial-gradient(circle,rgba(52,211,153,0.40),rgba(16,185,129,0.16)_46%,transparent_72%)]",
    pointsIcon:
      "text-emerald-100 drop-shadow-[0_0_14px_rgba(52,211,153,0.62)]",
    pointsLine:
      "bg-gradient-to-r from-transparent via-emerald-200/76 to-teal-200/50 shadow-[0_0_14px_rgba(52,211,153,0.46)]",
    pointsText: "text-emerald-50 hover:bg-emerald-300/10",
    shell:
      "border-emerald-200/26 bg-emerald-300/8 shadow-[0_0_30px_rgba(52,211,153,0.12),inset_0_1px_0_rgba(255,255,255,0.10)]",
  },
  fuchsia: {
    aura:
      "bg-[radial-gradient(circle_at_20%_24%,rgba(217,70,239,0.24),transparent_42%),radial-gradient(circle_at_82%_68%,rgba(244,114,182,0.14),transparent_46%),linear-gradient(135deg,rgba(217,70,239,0.12),rgba(2,6,23,0.06))]",
    dot: "bg-fuchsia-200 shadow-[0_0_12px_rgba(217,70,239,0.82)]",
    glow: "bg-fuchsia-300/14",
    iconEffectStyle: {
      "--dashboard-header-journey-circle": "rgba(217,70,239,0.42)",
      "--dashboard-header-journey-circle-ring": "rgba(244,114,182,0.42)",
      "--dashboard-header-journey-circle-soft": "rgba(190,24,93,0.24)",
      "--dashboard-header-journey-halo": "rgba(217,70,239,0.54)",
      "--dashboard-header-journey-halo-soft": "rgba(244,114,182,0.22)",
      "--dashboard-header-journey-motion": "rgba(217,70,239,0.86)",
      "--dashboard-header-journey-motion-alt": "rgba(244,114,182,0.60)",
      "--dashboard-header-journey-shadow": "rgba(217,70,239,0.34)",
    } as CSSProperties,
    journeyText: "text-fuchsia-100/82",
    labelText:
      "text-fuchsia-50 drop-shadow-[0_0_12px_rgba(217,70,239,0.34)]",
    metaText: "text-fuchsia-100/72",
    pointsGlow:
      "bg-[radial-gradient(circle,rgba(217,70,239,0.42),rgba(244,114,182,0.16)_46%,transparent_72%)]",
    pointsIcon:
      "text-fuchsia-100 drop-shadow-[0_0_14px_rgba(217,70,239,0.64)]",
    pointsLine:
      "bg-gradient-to-r from-transparent via-fuchsia-200/78 to-pink-200/52 shadow-[0_0_14px_rgba(217,70,239,0.48)]",
    pointsText: "text-fuchsia-50 hover:bg-fuchsia-300/10",
    shell:
      "border-fuchsia-200/26 bg-fuchsia-300/8 shadow-[0_0_30px_rgba(217,70,239,0.13),inset_0_1px_0_rgba(255,255,255,0.10)]",
  },
  sky: {
    aura:
      "bg-[radial-gradient(circle_at_20%_24%,rgba(56,189,248,0.23),transparent_42%),radial-gradient(circle_at_82%_68%,rgba(125,211,252,0.13),transparent_46%),linear-gradient(135deg,rgba(56,189,248,0.12),rgba(2,6,23,0.06))]",
    dot: "bg-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.82)]",
    glow: "bg-sky-300/14",
    iconEffectStyle: {
      "--dashboard-header-journey-circle": "rgba(56,189,248,0.40)",
      "--dashboard-header-journey-circle-ring": "rgba(125,211,252,0.40)",
      "--dashboard-header-journey-circle-soft": "rgba(14,165,233,0.22)",
      "--dashboard-header-journey-halo": "rgba(56,189,248,0.52)",
      "--dashboard-header-journey-halo-soft": "rgba(125,211,252,0.20)",
      "--dashboard-header-journey-motion": "rgba(56,189,248,0.84)",
      "--dashboard-header-journey-motion-alt": "rgba(34,211,238,0.56)",
      "--dashboard-header-journey-shadow": "rgba(56,189,248,0.32)",
    } as CSSProperties,
    journeyText: "text-sky-100/82",
    labelText: "text-sky-50 drop-shadow-[0_0_12px_rgba(56,189,248,0.34)]",
    metaText: "text-sky-100/72",
    pointsGlow:
      "bg-[radial-gradient(circle,rgba(56,189,248,0.40),rgba(14,165,233,0.16)_46%,transparent_72%)]",
    pointsIcon:
      "text-sky-100 drop-shadow-[0_0_14px_rgba(56,189,248,0.62)]",
    pointsLine:
      "bg-gradient-to-r from-transparent via-sky-200/78 to-cyan-200/52 shadow-[0_0_14px_rgba(56,189,248,0.48)]",
    pointsText: "text-sky-50 hover:bg-sky-300/10",
    shell:
      "border-sky-200/26 bg-sky-300/8 shadow-[0_0_30px_rgba(56,189,248,0.13),inset_0_1px_0_rgba(255,255,255,0.10)]",
  },
  violet: {
    aura:
      "bg-[radial-gradient(circle_at_20%_24%,rgba(167,139,250,0.24),transparent_42%),radial-gradient(circle_at_82%_68%,rgba(139,92,246,0.14),transparent_46%),linear-gradient(135deg,rgba(167,139,250,0.12),rgba(2,6,23,0.06))]",
    dot: "bg-violet-200 shadow-[0_0_12px_rgba(167,139,250,0.82)]",
    glow: "bg-violet-300/14",
    iconEffectStyle: {
      "--dashboard-header-journey-circle": "rgba(167,139,250,0.40)",
      "--dashboard-header-journey-circle-ring": "rgba(196,181,253,0.40)",
      "--dashboard-header-journey-circle-soft": "rgba(139,92,246,0.22)",
      "--dashboard-header-journey-halo": "rgba(167,139,250,0.52)",
      "--dashboard-header-journey-halo-soft": "rgba(139,92,246,0.22)",
      "--dashboard-header-journey-motion": "rgba(167,139,250,0.84)",
      "--dashboard-header-journey-motion-alt": "rgba(217,70,239,0.54)",
      "--dashboard-header-journey-shadow": "rgba(167,139,250,0.32)",
    } as CSSProperties,
    journeyText: "text-violet-100/82",
    labelText:
      "text-violet-50 drop-shadow-[0_0_12px_rgba(167,139,250,0.34)]",
    metaText: "text-violet-100/72",
    pointsGlow:
      "bg-[radial-gradient(circle,rgba(167,139,250,0.40),rgba(139,92,246,0.16)_46%,transparent_72%)]",
    pointsIcon:
      "text-violet-100 drop-shadow-[0_0_14px_rgba(167,139,250,0.62)]",
    pointsLine:
      "bg-gradient-to-r from-transparent via-violet-200/76 to-fuchsia-200/50 shadow-[0_0_14px_rgba(167,139,250,0.46)]",
    pointsText: "text-violet-50 hover:bg-violet-300/10",
    shell:
      "border-violet-200/26 bg-violet-300/8 shadow-[0_0_30px_rgba(167,139,250,0.12),inset_0_1px_0_rgba(255,255,255,0.10)]",
  },
};

type DashboardEffectToneStyle = CSSProperties & {
  "--dashboard-effect-accent": string;
  "--dashboard-effect-accent-soft": string;
  "--dashboard-effect-primary": string;
  "--dashboard-effect-primary-soft": string;
  "--dashboard-effect-shadow": string;
};

const dashboardEffectToneStyles: Record<
  DashboardCardTone,
  DashboardEffectToneStyle
> = {
  amber: {
    "--dashboard-effect-accent": "rgba(251, 191, 36, 0.22)",
    "--dashboard-effect-accent-soft": "rgba(253, 224, 71, 0.13)",
    "--dashboard-effect-primary": "rgba(251, 191, 36, 0.30)",
    "--dashboard-effect-primary-soft": "rgba(251, 191, 36, 0.16)",
    "--dashboard-effect-shadow": "rgba(251, 191, 36, 0.24)",
  },
  cyan: {
    "--dashboard-effect-accent": "rgba(125, 211, 252, 0.22)",
    "--dashboard-effect-accent-soft": "rgba(14, 165, 233, 0.14)",
    "--dashboard-effect-primary": "rgba(34, 211, 238, 0.31)",
    "--dashboard-effect-primary-soft": "rgba(34, 211, 238, 0.17)",
    "--dashboard-effect-shadow": "rgba(34, 211, 238, 0.24)",
  },
  emerald: {
    "--dashboard-effect-accent": "rgba(52, 211, 153, 0.22)",
    "--dashboard-effect-accent-soft": "rgba(16, 185, 129, 0.13)",
    "--dashboard-effect-primary": "rgba(16, 185, 129, 0.30)",
    "--dashboard-effect-primary-soft": "rgba(16, 185, 129, 0.16)",
    "--dashboard-effect-shadow": "rgba(16, 185, 129, 0.23)",
  },
  fuchsia: {
    "--dashboard-effect-accent": "rgba(244, 114, 182, 0.20)",
    "--dashboard-effect-accent-soft": "rgba(217, 70, 239, 0.12)",
    "--dashboard-effect-primary": "rgba(217, 70, 239, 0.28)",
    "--dashboard-effect-primary-soft": "rgba(217, 70, 239, 0.15)",
    "--dashboard-effect-shadow": "rgba(217, 70, 239, 0.21)",
  },
  sky: {
    "--dashboard-effect-accent": "rgba(56, 189, 248, 0.22)",
    "--dashboard-effect-accent-soft": "rgba(14, 165, 233, 0.13)",
    "--dashboard-effect-primary": "rgba(14, 165, 233, 0.30)",
    "--dashboard-effect-primary-soft": "rgba(14, 165, 233, 0.16)",
    "--dashboard-effect-shadow": "rgba(14, 165, 233, 0.22)",
  },
  violet: {
    "--dashboard-effect-accent": "rgba(192, 132, 252, 0.20)",
    "--dashboard-effect-accent-soft": "rgba(139, 92, 246, 0.12)",
    "--dashboard-effect-primary": "rgba(139, 92, 246, 0.28)",
    "--dashboard-effect-primary-soft": "rgba(139, 92, 246, 0.15)",
    "--dashboard-effect-shadow": "rgba(139, 92, 246, 0.21)",
  },
};

type DashboardHeaderScrollButtonPreviewToneStyle = CSSProperties & {
  "--dashboard-header-scroll-preview-accent": string;
  "--dashboard-header-scroll-preview-core": string;
  "--dashboard-header-scroll-preview-core-soft": string;
  "--dashboard-header-scroll-preview-ring": string;
  "--dashboard-header-scroll-preview-shadow": string;
};

const dashboardHeaderScrollButtonPreviewToneStyles: Record<
  DashboardCardTone,
  DashboardHeaderScrollButtonPreviewToneStyle
> = {
  amber: {
    "--dashboard-header-scroll-preview-accent": "rgba(251, 146, 60, 0.76)",
    "--dashboard-header-scroll-preview-core": "rgba(250, 204, 21, 0.94)",
    "--dashboard-header-scroll-preview-core-soft": "rgba(251, 191, 36, 0.34)",
    "--dashboard-header-scroll-preview-ring": "rgba(253, 224, 71, 0.56)",
    "--dashboard-header-scroll-preview-shadow": "rgba(250, 204, 21, 0.64)",
  },
  cyan: {
    "--dashboard-header-scroll-preview-accent": "rgba(125, 211, 252, 0.76)",
    "--dashboard-header-scroll-preview-core": "rgba(34, 211, 238, 0.94)",
    "--dashboard-header-scroll-preview-core-soft": "rgba(14, 165, 233, 0.34)",
    "--dashboard-header-scroll-preview-ring": "rgba(165, 243, 252, 0.56)",
    "--dashboard-header-scroll-preview-shadow": "rgba(34, 211, 238, 0.64)",
  },
  emerald: {
    "--dashboard-header-scroll-preview-accent": "rgba(45, 212, 191, 0.72)",
    "--dashboard-header-scroll-preview-core": "rgba(52, 211, 153, 0.92)",
    "--dashboard-header-scroll-preview-core-soft": "rgba(16, 185, 129, 0.34)",
    "--dashboard-header-scroll-preview-ring": "rgba(167, 243, 208, 0.54)",
    "--dashboard-header-scroll-preview-shadow": "rgba(52, 211, 153, 0.60)",
  },
  fuchsia: {
    "--dashboard-header-scroll-preview-accent": "rgba(244, 114, 182, 0.74)",
    "--dashboard-header-scroll-preview-core": "rgba(217, 70, 239, 0.92)",
    "--dashboard-header-scroll-preview-core-soft": "rgba(190, 24, 93, 0.34)",
    "--dashboard-header-scroll-preview-ring": "rgba(245, 208, 254, 0.54)",
    "--dashboard-header-scroll-preview-shadow": "rgba(217, 70, 239, 0.60)",
  },
  sky: {
    "--dashboard-header-scroll-preview-accent": "rgba(34, 211, 238, 0.72)",
    "--dashboard-header-scroll-preview-core": "rgba(56, 189, 248, 0.92)",
    "--dashboard-header-scroll-preview-core-soft": "rgba(14, 165, 233, 0.34)",
    "--dashboard-header-scroll-preview-ring": "rgba(186, 230, 253, 0.54)",
    "--dashboard-header-scroll-preview-shadow": "rgba(56, 189, 248, 0.60)",
  },
  violet: {
    "--dashboard-header-scroll-preview-accent": "rgba(217, 70, 239, 0.68)",
    "--dashboard-header-scroll-preview-core": "rgba(167, 139, 250, 0.92)",
    "--dashboard-header-scroll-preview-core-soft": "rgba(139, 92, 246, 0.34)",
    "--dashboard-header-scroll-preview-ring": "rgba(221, 214, 254, 0.54)",
    "--dashboard-header-scroll-preview-shadow": "rgba(167, 139, 250, 0.60)",
  },
};

const dashboardJourneyStepStyles: Record<DashboardJourneyStepState, string> = {
  active:
    "border-cyan-200/65 bg-cyan-300/14 text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.26)] ring-1 ring-cyan-200/20",
  complete:
    "border-emerald-300/30 bg-emerald-300/10 text-emerald-100 shadow-[0_0_14px_rgba(16,185,129,0.12)]",
  default:
    "border-white/10 bg-slate-950/58 text-slate-300 hover:border-cyan-200/30 hover:bg-cyan-300/8 hover:text-white",
  locked:
    "border-white/10 bg-white/[0.025] text-slate-500 opacity-60 hover:border-white/15 hover:opacity-80",
};

export default function UserHomeDashboardPage() {
  const router = useRouter();
  const [dashboardToday] = useState<Date>(() => new Date());
  const [firstName, setFirstName] = useState("Member");
  const [exerciseStats, setExerciseStats] = useState<LocalExerciseStatEntry[]>(
    [],
  );
  const [savedTemplates, setSavedTemplates] = useState<
    LocalWorkoutBuilderTemplate[]
  >([]);
  const [activeSessionTemplate, setActiveSessionTemplate] =
    useState<LocalWorkoutBuilderSessionTemplate | null>(null);
  const [canSyncWorkoutData, setCanSyncWorkoutData] = useState(false);
  const [isSyncingWorkoutData, setIsSyncingWorkoutData] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [activeUploadType, setActiveUploadType] =
    useState<UploadOptionId>("screenshot");
  const [favoriteExerciseIds, setFavoriteExerciseIds] = useState<string[]>([]);
  const [dashboardLibraryFavoriteIds, setDashboardLibraryFavoriteIds] =
    useState<Record<string, string[]>>({});
  const [
    activeManualFavoriteDashboardIndex,
    setActiveManualFavoriteDashboardIndex,
  ] = useState(0);
  const [
    activeManualExerciseCategoryId,
    setActiveManualExerciseCategoryId,
  ] = useState<string>(manualExerciseLibraryBaseCategories[0]?.id || "my-plan");
  const [exerciseSelectorOpen, setExerciseSelectorOpen] = useState(false);
  const [exerciseReferenceSearch, setExerciseReferenceSearch] = useState("");
  const [manualReferences, setManualReferences] = useState<
    ManualLibraryReference[]
  >([]);
  const [manualStatsDraft, setManualStatsDraft] = useState<ManualStatsDraft>({
    dateTime: getManualDateTimeInputValue(),
    load: "185",
    notes: "",
    reps: "10",
    rpe: "8",
    sessionLabel: "",
    sets: "3",
  });
  const [manualStatsLogs, setManualStatsLogs] = useState<ManualStatsLogEntry[]>(
    [],
  );
  const [manualStatsAdderCollapsed, setManualStatsAdderCollapsed] =
    useState(true);
  const [activeDashboardOrbiterRow, setActiveDashboardOrbiterRow] =
    useState(0);
  const [activeDashboardHeaderIndex, setActiveDashboardHeaderIndex] =
    useState(0);
  const [dashboardFoundationProgress, setDashboardFoundationProgress] =
    useState<DashboardFoundationProgress>({
      goalFocus: "",
      goalsCompletion: 0,
      goalsVisited: false,
      profileCompletion: 0,
      profileVisited: false,
    });
  const [dashboardHeaderSlideDirection, setDashboardHeaderSlideDirection] =
    useState<"left" | "right">("right");
  const [
    dashboardHeaderScrollButtonDragging,
    setDashboardHeaderScrollButtonDragging,
  ] = useState(false);
  const [
    dashboardHeaderScrollButtonRoll,
    setDashboardHeaderScrollButtonRoll,
  ] = useState(0);
  const [
    dashboardHeaderScrollButtonActiveDirection,
    setDashboardHeaderScrollButtonActiveDirection,
  ] = useState<DashboardScrollButtonDirection | null>(null);
  const [
    dashboardHeaderMenuOrbitDragging,
    setDashboardHeaderMenuOrbitDragging,
  ] = useState(false);
  const [dashboardHeaderMenuOrbitRoll, setDashboardHeaderMenuOrbitRoll] =
    useState(0);
  const [
    dashboardHeaderMenuOrbitActiveDirection,
    setDashboardHeaderMenuOrbitActiveDirection,
  ] = useState<DashboardHorizontalScrollDirection | null>(null);
  const [dashboardHeaderMenuActiveIndex, setDashboardHeaderMenuActiveIndex] =
    useState(0);
  const [dashboardHeaderVortexPulseMode, setDashboardHeaderVortexPulseMode] =
    useState<DashboardHeaderVortexMode | null>(null);
  const [dashboardHeaderVortexSettling, setDashboardHeaderVortexSettling] =
    useState(false);
  const [dashboardHeaderTimedOut, setDashboardHeaderTimedOut] =
    useState(false);
  const [
    dashboardHeaderTimeoutPortalOpen,
    setDashboardHeaderTimeoutPortalOpen,
  ] = useState(false);
  const [
    dashboardHeaderTimeoutMeterIndex,
    setDashboardHeaderTimeoutMeterIndex,
  ] = useState(0);
  const [
    dashboardHeaderTimeoutPortalPosition,
    setDashboardHeaderTimeoutPortalPosition,
  ] = useState({ x: 50, y: 54 });
  const [
    dashboardHeaderMeterActiveIndex,
    setDashboardHeaderMeterActiveIndex,
  ] = useState(0);
  const [
    dashboardHeaderMeterPanelActiveIndex,
    setDashboardHeaderMeterPanelActiveIndex,
  ] = useState(0);
  const [dashboardHeaderPrActiveIndex, setDashboardHeaderPrActiveIndex] =
    useState(0);
  const [dashboardHeaderMeterRailActive, setDashboardHeaderMeterRailActive] =
    useState(false);
  const [dashboardHeaderMeterMenuOpen, setDashboardHeaderMeterMenuOpen] =
    useState(false);
  const [
    dashboardHeaderCategoryLevelActiveIndex,
    setDashboardHeaderCategoryLevelActiveIndex,
  ] = useState(0);
  const [
    dashboardHeaderAchievementActiveIndex,
    setDashboardHeaderAchievementActiveIndex,
  ] = useState(0);
  const [
    dashboardHeaderAchievementRevealActive,
    setDashboardHeaderAchievementRevealActive,
  ] = useState(false);
  const dashboardHeaderAchievementRevealTimeoutRef = useRef<number | null>(
    null,
  );
  const [dashboardHeaderAnalogOffset, setDashboardHeaderAnalogOffset] =
    useState<DashboardVerticalPointerStart>({ x: 0, y: 0 });
  const [dashboardHeaderMenuOrbitOffset, setDashboardHeaderMenuOrbitOffset] =
    useState<DashboardVerticalPointerStart>({ x: 0, y: 0 });
  const [dashboardPageAnalogDragging, setDashboardPageAnalogDragging] =
    useState(false);
  const [dashboardPageAnalogRoll, setDashboardPageAnalogRoll] = useState(0);
  const [
    dashboardPageAnalogActiveDirection,
    setDashboardPageAnalogActiveDirection,
  ] = useState<DashboardScrollButtonDirection | null>(null);
  const [dashboardPageAnalogOffset, setDashboardPageAnalogOffset] =
    useState<DashboardVerticalPointerStart>({ x: 0, y: 0 });
  const [activeCommandCenterIndex, setActiveCommandCenterIndex] = useState(0);
  const [activeDailyToolIndex, setActiveDailyToolIndex] = useState(0);
  const [activeWeeklyRecapIndex, setActiveWeeklyRecapIndex] = useState(0);
  const [activeMySoundIndex, setActiveMySoundIndex] = useState(0);
  const [activeSystemCenterIndex, setActiveSystemCenterIndex] = useState(0);
  const [
    activeDashboardFloatingMetricIndex,
    setActiveDashboardFloatingMetricIndex,
  ] = useState(0);
  const [
    activeDashboardJourneyStepIndexes,
    setActiveDashboardJourneyStepIndexes,
  ] = useState<Record<string, number>>({});
  const [activeHeroAchievementIndex, setActiveHeroAchievementIndex] =
    useState(0);
  const [heroAchievementSlideDirection, setHeroAchievementSlideDirection] =
    useState<"left" | "right">("right");
  const [dashboardProfileHubOpen, setDashboardProfileHubOpen] =
    useState(false);
  const [dashboardProfileActionsOpen, setDashboardProfileActionsOpen] =
    useState(false);
  const [dashboardPointsDropdownOpen, setDashboardPointsDropdownOpen] =
    useState(false);
  const [dashboardMusicDropdownOpen, setDashboardMusicDropdownOpen] =
    useState(false);
  const [dashboardMusicEnabled, setDashboardMusicEnabled] = useState(false);
  const [dashboardMusicStationIds, setDashboardMusicStationIds] = useState<
    DashboardMusicStationId[]
  >(DASHBOARD_MUSIC_DEFAULT_STATIONS);
  const [dashboardMusicVolume, setDashboardMusicVolume] = useState(
    DASHBOARD_MUSIC_DEFAULT_VOLUME,
  );
  const [dashboardMusicMuted, setDashboardMusicMuted] = useState(false);
  const [dashboardMusicAutoplayMode, setDashboardMusicAutoplayMode] =
    useState<DashboardMusicAutoplayMode>("off");
  const [dashboardMusicSettingsLoaded, setDashboardMusicSettingsLoaded] =
    useState(false);
  const [
    activeDashboardMusicStationIndex,
    setActiveDashboardMusicStationIndex,
  ] = useState(0);
  const [dashboardTooltip, setDashboardTooltip] = useState<{
    placement: "above" | "below";
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const [dashboardProfileIconUrl, setDashboardProfileIconUrl] = useState(
    DASHBOARD_PROFILE_ICON_FALLBACK,
  );
  const [activeDashboardProfileHubLayer, setActiveDashboardProfileHubLayer] =
    useState(0);
  const [
    activeDashboardProfileHubMainIndex,
    setActiveDashboardProfileHubMainIndex,
  ] = useState(0);
  const [
    activeDashboardProfileHubAccountIndex,
    setActiveDashboardProfileHubAccountIndex,
  ] = useState(0);
  const [
    activeDashboardConsistencyMonthIndex,
    setActiveDashboardConsistencyMonthIndex,
  ] = useState(DASHBOARD_CONSISTENCY_ACTIVE_MONTH_INDEX);
  const dashboardStatusDetailsRef = useRef<HTMLDetailsElement | null>(null);
  const favoriteWorkoutStripRef = useRef<HTMLDivElement | null>(null);
  const dashboardHeaderNewsHeadlineRef = useRef<HTMLSpanElement | null>(null);
  const dashboardHeaderNewsKickerRef = useRef<HTMLSpanElement | null>(null);
  const dashboardHeaderNewsHeadlineIndexRef = useRef(0);
  const dashboardHeaderNewsHeadlinesRef = useRef<
    DashboardHeaderNewsHeadline[]
  >([]);
  const dashboardPointsDropdownRef = useRef<HTMLDivElement | null>(null);
  const dashboardMusicDropdownRef = useRef<HTMLDivElement | null>(null);
  const dashboardHeaderMeterMenuRef = useRef<HTMLDivElement | null>(null);
  const dashboardOrbiterPointerStartRef =
    useRef<DashboardVerticalPointerStart | null>(null);
  const dashboardOrbiterPointerMovedRef = useRef(false);
  const dashboardOrbiterRowChangeLockRef = useRef(0);
  const commandCenterPointerStartRef = useRef<number | null>(null);
  const commandCenterPointerMovedRef = useRef(false);
  const dashboardHeaderScrollButtonPointerStartRef =
    useRef<DashboardVerticalPointerStart | null>(null);
  const dashboardHeaderScrollButtonPointerMovedRef = useRef(false);
  const dashboardHeaderScrollButtonHoldDirectionRef =
    useRef<DashboardScrollButtonDirection | null>(null);
  const dashboardHeaderScrollButtonHoldTimeoutRef = useRef<number | null>(
    null,
  );
  const dashboardHeaderScrollButtonHoldIntervalRef = useRef<number | null>(
    null,
  );
  const dashboardHeaderMenuOrbitPointerStartRef =
    useRef<DashboardVerticalPointerStart | null>(null);
  const dashboardHeaderMenuOrbitPointerMovedRef = useRef(false);
  const dashboardHeaderMenuOrbitHoldDirectionRef =
    useRef<DashboardHorizontalScrollDirection | null>(null);
  const dashboardHeaderMenuOrbitHoldTimeoutRef = useRef<number | null>(null);
  const dashboardHeaderMenuOrbitHoldIntervalRef = useRef<number | null>(null);
  const dashboardHeaderIdleTimeoutRef = useRef<number | null>(null);
  const dashboardHeaderTimeoutPortalIntervalRef = useRef<number | null>(null);
  const dashboardHeaderTimeoutPortalCloseTimeoutRef = useRef<number | null>(
    null,
  );
  const dashboardHeaderVortexPulseTimeoutRef = useRef<number | null>(null);
  const dashboardHeaderVortexSettleTimeoutRef = useRef<number | null>(null);
  const dashboardHeaderPrPointerStartRef = useRef<number | null>(null);
  const dashboardHeaderPrPointerMovedRef = useRef(false);
  const dashboardHeaderPrWheelLockRef = useRef(0);
  const dashboardHeaderMeterPanelPointerStartRef = useRef<number | null>(null);
  const dashboardHeaderMeterPanelPointerMovedRef = useRef(false);
  const dashboardHeaderMeterPanelWheelLockRef = useRef(0);
  const dashboardHeaderCategoryLevelPointerStartRef = useRef<number | null>(
    null,
  );
  const dashboardHeaderCategoryLevelPointerMovedRef = useRef(false);
  const dashboardHeaderCategoryLevelWheelLockRef = useRef(0);
  const dashboardPageAnalogPointerStartRef =
    useRef<DashboardVerticalPointerStart | null>(null);
  const dashboardPageAnalogPointerMovedRef = useRef(false);
  const dashboardPageAnalogHoldDirectionRef =
    useRef<DashboardScrollButtonDirection | null>(null);
  const dashboardPageAnalogHoldTimeoutRef = useRef<number | null>(null);
  const dashboardPageAnalogHoldIntervalRef = useRef<number | null>(null);
  const weeklyRecapPointerStartRef = useRef<number | null>(null);
  const weeklyRecapPointerMovedRef = useRef(false);
  const mySoundPointerStartRef = useRef<number | null>(null);
  const mySoundPointerMovedRef = useRef(false);
  const dashboardMusicStationPointerStartRef = useRef<number | null>(null);
  const dashboardMusicStationPointerMovedRef = useRef(false);
  const systemCenterPointerStartRef = useRef<number | null>(null);
  const systemCenterPointerMovedRef = useRef(false);
  const dashboardCardWheelLockRef = useRef(0);
  const heroAchievementPointerStartRef = useRef<number | null>(null);
  const heroAchievementPointerMovedRef = useRef(false);
  const heroAchievementWheelLockRef = useRef(0);
  const dashboardMusicAudioContextRef = useRef<AudioContext | null>(null);
  const dashboardMusicAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const dashboardMusicGainRef = useRef<GainNode | null>(null);
  const dashboardMusicIntervalRef = useRef<number | null>(null);
  const dashboardMusicObjectUrlRef = useRef<string | null>(null);
  const dashboardMusicStationIdsRef = useRef<DashboardMusicStationId[]>(
    DASHBOARD_MUSIC_DEFAULT_STATIONS,
  );
  const dashboardMusicStepRef = useRef(0);
  const dashboardMusicVolumeRef = useRef(DASHBOARD_MUSIC_DEFAULT_VOLUME);
  const dashboardMusicMutedRef = useRef(false);
  const dashboardMusicAutoplayModeRef =
    useRef<DashboardMusicAutoplayMode>("off");
  const dashboardTooltipTimerRef = useRef<number | null>(null);

  const clearDashboardTooltipTimer = () => {
    if (dashboardTooltipTimerRef.current !== null) {
      window.clearTimeout(dashboardTooltipTimerRef.current);
      dashboardTooltipTimerRef.current = null;
    }
  };

  const hideDashboardTooltip = () => {
    clearDashboardTooltipTimer();
    setDashboardTooltip(null);
  };

  const getDashboardMusicMasterGainLevel = () =>
    dashboardMusicMutedRef.current
      ? 0.0001
      : Math.max(
          0.0001,
          dashboardMusicVolumeRef.current * DASHBOARD_MUSIC_MASTER_GAIN_MAX,
        );

  const applyDashboardMusicVolume = () => {
    const context = dashboardMusicAudioContextRef.current;
    const masterGain = dashboardMusicGainRef.current;

    if (context && masterGain && context.state !== "closed") {
      const now = context.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setTargetAtTime(
        getDashboardMusicMasterGainLevel(),
        now,
        0.08,
      );
    }

    if (dashboardMusicAudioElementRef.current) {
      dashboardMusicAudioElementRef.current.volume =
        dashboardMusicMutedRef.current
          ? 0
          : Math.min(1, Math.max(0, dashboardMusicVolumeRef.current));
    }
  };

  const getDashboardMusicSelectedStations = () => {
    const selectedStations = dashboardMusicStations.filter((station) =>
      dashboardMusicStationIdsRef.current.includes(station.id),
    );

    return selectedStations.length
      ? selectedStations
      : [dashboardMusicStationById.orbit];
  };

  const getDashboardTooltipTarget = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return null;

    return target.closest("[data-dashboard-tooltip]") as HTMLElement | null;
  };

  const showDashboardTooltipForTarget = (target: HTMLElement) => {
    const text = target.getAttribute("data-dashboard-tooltip");

    if (!text) return;

    clearDashboardTooltipTimer();
    dashboardTooltipTimerRef.current = window.setTimeout(() => {
      const rect = target.getBoundingClientRect();
      const placement =
        rect.bottom + 54 < window.innerHeight ? "below" : "above";
      const x = Math.min(
        window.innerWidth - 18,
        Math.max(18, rect.left + rect.width / 2),
      );
      const y =
        placement === "below"
          ? Math.min(window.innerHeight - 12, rect.bottom + 10)
          : Math.max(12, rect.top - 10);

      setDashboardTooltip({
        placement,
        text,
        x,
        y,
      });
      dashboardTooltipTimerRef.current = null;
    }, 240);
  };

  const closeDashboardStatusDropdown = () => {
    if (dashboardStatusDetailsRef.current) {
      dashboardStatusDetailsRef.current.open = false;
    }
  };
  const scheduleDashboardMusicTone = ({
    attack = 0.16,
    context,
    detune = 0,
    duration,
    filterType = "lowpass",
    filterFrequency = 1400,
    frequency,
    frequencyEnd,
    masterGain,
    pan = 0,
    q = 0.7,
    release = 0.42,
    startTime,
    sustain = 0.62,
    type = "sine",
    volume,
  }: {
    attack?: number;
    context: AudioContext;
    detune?: number;
    duration: number;
    filterType?: BiquadFilterType;
    filterFrequency?: number;
    frequency: number;
    frequencyEnd?: number;
    masterGain: GainNode;
    pan?: number;
    q?: number;
    release?: number;
    startTime: number;
    sustain?: number;
    type?: OscillatorType;
    volume: number;
  }) => {
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const noteGain = context.createGain();
    const panner =
      typeof context.createStereoPanner === "function"
        ? context.createStereoPanner()
        : null;

    oscillator.frequency.setValueAtTime(frequency, startTime);
    if (frequencyEnd && frequencyEnd > 0 && frequencyEnd !== frequency) {
      oscillator.frequency.exponentialRampToValueAtTime(
        frequencyEnd,
        startTime + Math.max(0.05, duration * 0.42),
      );
    }
    oscillator.type = type;
    oscillator.detune.setValueAtTime(detune, startTime);
    filter.frequency.setValueAtTime(filterFrequency, startTime);
    filter.Q.setValueAtTime(q, startTime);
    filter.type = filterType;
    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.exponentialRampToValueAtTime(volume, startTime + attack);
    noteGain.gain.setTargetAtTime(
      Math.max(0.0001, volume * sustain),
      startTime + attack,
      Math.max(0.08, duration * 0.2),
    );
    noteGain.gain.exponentialRampToValueAtTime(
      0.0001,
      startTime + Math.max(attack + release, duration),
    );
    if (panner) panner.pan.setValueAtTime(pan, startTime);

    oscillator.connect(filter);
    filter.connect(noteGain);
    if (panner) {
      noteGain.connect(panner);
      panner.connect(masterGain);
    } else {
      noteGain.connect(masterGain);
    }
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.08);
    oscillator.onended = () => {
      oscillator.disconnect();
      filter.disconnect();
      noteGain.disconnect();
      panner?.disconnect();
    };
  };
  const scheduleDashboardMusicNoise = ({
    attack = 0.04,
    context,
    duration,
    filterType = "bandpass",
    filterFrequency,
    masterGain,
    pan = 0,
    q = 1.4,
    startTime,
    volume,
  }: {
    attack?: number;
    context: AudioContext;
    duration: number;
    filterType?: BiquadFilterType;
    filterFrequency: number;
    masterGain: GainNode;
    pan?: number;
    q?: number;
    startTime: number;
    volume: number;
  }) => {
    const sampleRate = context.sampleRate;
    const sampleCount = Math.floor(sampleRate * duration);
    const buffer = context.createBuffer(1, sampleCount, sampleRate);
    const channel = buffer.getChannelData(0);

    for (let index = 0; index < sampleCount; index += 1) {
      channel[index] = (Math.random() * 2 - 1) * (1 - index / sampleCount);
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const noteGain = context.createGain();
    const panner =
      typeof context.createStereoPanner === "function"
        ? context.createStereoPanner()
        : null;

    source.buffer = buffer;
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFrequency, startTime);
    filter.Q.setValueAtTime(q, startTime);
    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.exponentialRampToValueAtTime(volume, startTime + attack);
    noteGain.gain.exponentialRampToValueAtTime(
      0.0001,
      startTime + duration,
    );
    if (panner) panner.pan.setValueAtTime(pan, startTime);

    source.connect(filter);
    filter.connect(noteGain);
    if (panner) {
      noteGain.connect(panner);
      panner.connect(masterGain);
    } else {
      noteGain.connect(masterGain);
    }
    source.start(startTime);
    source.stop(startTime + duration + 0.04);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      noteGain.disconnect();
      panner?.disconnect();
    };
  };
  const scheduleDashboardMusicStartCue = () => {
    const context = dashboardMusicAudioContextRef.current;
    const masterGain = dashboardMusicGainRef.current;
    if (!context || !masterGain || context.state === "closed") return;

    const startTime = context.currentTime + 0.06;

    [392, 587.33, 880].forEach((frequency, noteIndex) => {
      scheduleDashboardMusicTone({
        attack: 0.018,
        context,
        duration: 0.46 + noteIndex * 0.08,
        filterFrequency: 3600 + noteIndex * 380,
        frequency,
        masterGain,
        pan: -0.32 + noteIndex * 0.32,
        q: 0.82,
        release: 0.18,
        startTime: startTime + noteIndex * 0.07,
        sustain: 0.5,
        type: "triangle",
        volume: 0.12,
      });
    });

    scheduleDashboardMusicTone({
      attack: 0.012,
      context,
      duration: 0.34,
      filterFrequency: 760,
      frequency: 98,
      masterGain,
      q: 0.6,
      release: 0.1,
      startTime,
      sustain: 0.42,
      type: "sine",
      volume: 0.16,
    });

    scheduleDashboardMusicNoise({
      context,
      duration: 0.3,
      filterFrequency: 3200,
      masterGain,
      startTime: startTime + 0.18,
      volume: 0.032,
    });
  };
  const scheduleDashboardMusicPhrase = () => {
    const context = dashboardMusicAudioContextRef.current;
    const masterGain = dashboardMusicGainRef.current;
    if (!context || !masterGain || context.state === "closed") return;

    const selectedStations = getDashboardMusicSelectedStations();
    const step = dashboardMusicStepRef.current;
    const stationIndex = step % selectedStations.length;
    const progressionStep = Math.floor(step / selectedStations.length);
    const station = selectedStations[stationIndex];
    const nextStation =
      selectedStations[(stationIndex + 1) % selectedStations.length];
    const progression = station.progression;
    const chord = progression[progressionStep % progression.length];
    const nextProgression = nextStation.progression;
    const nextChord =
      nextProgression[
        Math.floor((step + 1) / selectedStations.length) %
          nextProgression.length
      ];
    const startTime = context.currentTime + 0.08;
    const volumeScale = 0.92;
    const leadOffsets = station.arpOffsets.length
      ? station.arpOffsets
      : [0.48, 1.2, 2.16, 3.08];

    scheduleDashboardMusicTone({
      context,
      duration: DASHBOARD_MUSIC_PHRASE_SECONDS - 0.18,
      filterFrequency: station.bassFilter,
      frequency: chord.bass,
      masterGain,
      startTime,
      type: station.bassType,
      volume: station.bassVolume * volumeScale,
    });

    if (station.textureVolume > 0) {
      scheduleDashboardMusicNoise({
        attack: 0.18,
        context,
        duration: DASHBOARD_MUSIC_PHRASE_SECONDS - 0.34,
        filterFrequency: Math.max(1600, station.noiseFilter),
        filterType: "highpass",
        masterGain,
        pan: stationIndex % 2 === 0 ? -0.24 : 0.24,
        q: 0.48,
        startTime: startTime + 0.12,
        volume: station.textureVolume * volumeScale,
      });
    }

    chord.notes.forEach((frequency, noteIndex) => {
      scheduleDashboardMusicTone({
        attack: 0.72,
        context,
        duration: DASHBOARD_MUSIC_PHRASE_SECONDS - 0.24,
        filterFrequency: station.padFilter + noteIndex * 120,
        frequency: frequency * (noteIndex === 3 ? 1.005 : 1),
        masterGain,
        pan: -0.42 + noteIndex * 0.28,
        q: 0.52,
        release: 0.86,
        startTime: startTime + noteIndex * 0.055,
        sustain: 0.72,
        type: noteIndex % 2 === 0 ? station.padType : "sine",
        volume: station.padVolume * volumeScale,
      });
    });

    leadOffsets.forEach((beatOffset, noteIndex) => {
      const leadDegree =
        station.leadPattern[noteIndex % station.leadPattern.length];
      const frequency =
        chord.color[leadDegree % chord.color.length] *
        (noteIndex % 4 === 3 ? 2 : 1);

      scheduleDashboardMusicTone({
        attack: 0.024,
        context,
        detune: noteIndex % 2 === 0 ? -5 : 4,
        duration: 0.44 + (noteIndex % 2) * 0.16,
        filterFrequency: station.padFilter + 1800 + noteIndex * 220,
        frequency,
        masterGain,
        pan: noteIndex % 2 === 0 ? 0.48 : -0.46,
        q: 1.08,
        release: 0.2,
        startTime: startTime + beatOffset,
        sustain: 0.38,
        type: noteIndex % 3 === 2 ? station.leadType : station.accentType,
        volume: station.leadVolume * volumeScale,
      });
    });

    station.pulseOffsets.forEach((beatOffset, beatIndex) => {
      const kickStartFrequency = Math.max(72, chord.bass * 1.08);
      const kickEndFrequency = Math.max(34, chord.bass * 0.42);

      scheduleDashboardMusicTone({
        attack: 0.006,
        context,
        duration: 0.34 + (beatIndex % 2) * 0.04,
        filterFrequency: 440,
        frequency: kickStartFrequency,
        frequencyEnd: kickEndFrequency,
        masterGain,
        q: 0.55,
        release: 0.08,
        startTime: startTime + beatOffset,
        sustain: 0.24,
        type: "sine",
        volume: station.kickVolume * volumeScale,
      });
    });

    station.snareOffsets.forEach((beatOffset, snareIndex) => {
      scheduleDashboardMusicNoise({
        attack: 0.012,
        context,
        duration: 0.22,
        filterFrequency: station.noiseFilter + 820,
        filterType: "bandpass",
        masterGain,
        pan: snareIndex % 2 === 0 ? 0.16 : -0.12,
        q: 0.92,
        startTime: startTime + beatOffset,
        volume: station.noiseVolume * 1.55 * volumeScale,
      });
      scheduleDashboardMusicTone({
        attack: 0.01,
        context,
        duration: 0.16,
        filterFrequency: 920,
        frequency: chord.bass * 1.5,
        masterGain,
        q: 0.7,
        release: 0.08,
        startTime: startTime + beatOffset,
        sustain: 0.2,
        type: "triangle",
        volume: station.noiseVolume * 0.46 * volumeScale,
      });
    });

    station.hatOffsets.forEach((beatOffset, hatIndex) => {
      scheduleDashboardMusicNoise({
        attack: 0.006,
        context,
        duration: 0.07 + (hatIndex % 3) * 0.015,
        filterFrequency: 6400 + (hatIndex % 4) * 520,
        filterType: "highpass",
        masterGain,
        pan: hatIndex % 2 === 0 ? -0.42 : 0.38,
        q: 0.62,
        startTime: startTime + beatOffset,
        volume: station.noiseVolume * 0.5 * volumeScale,
      });
    });

    scheduleDashboardMusicNoise({
      attack: 0.045,
      context,
      duration: 1.3,
      filterFrequency: station.noiseFilter,
      masterGain,
      pan: step % 2 === 0 ? -0.36 : 0.36,
      q: 1.18,
      startTime: startTime + station.noiseOffset,
      volume: station.noiseVolume * volumeScale,
    });

    if (selectedStations.length > 1) {
      const transitionStartTime =
        startTime +
        DASHBOARD_MUSIC_PHRASE_SECONDS -
        DASHBOARD_MUSIC_TRANSITION_SECONDS;

      scheduleDashboardMusicNoise({
        attack: 0.08,
        context,
        duration: DASHBOARD_MUSIC_TRANSITION_SECONDS - 0.08,
        filterFrequency: Math.max(
          2400,
          station.noiseFilter,
          nextStation.noiseFilter,
        ),
        filterType: "highpass",
        masterGain,
        pan: stationIndex % 2 === 0 ? 0.2 : -0.2,
        q: 0.78,
        startTime: transitionStartTime,
        volume:
          Math.max(0.014, station.noiseVolume + nextStation.textureVolume) *
          0.38 *
          volumeScale,
      });

      scheduleDashboardMusicTone({
        attack: 0.036,
        context,
        duration: DASHBOARD_MUSIC_TRANSITION_SECONDS - 0.14,
        filterFrequency: Math.max(station.padFilter, nextStation.padFilter) + 760,
        frequency: Math.max(72, chord.bass * 1.5),
        frequencyEnd: Math.max(72, nextChord.bass * 1.5),
        masterGain,
        pan: stationIndex % 2 === 0 ? -0.18 : 0.18,
        q: 0.86,
        release: 0.14,
        startTime: transitionStartTime + 0.1,
        sustain: 0.34,
        type: nextStation.accentType,
        volume:
          Math.max(0.018, station.leadVolume + nextStation.leadVolume) *
          0.7 *
          volumeScale,
      });
    }

    dashboardMusicStepRef.current = step + 1;
  };
  const createDashboardMusicFallbackUrl = () => {
    const sampleRate = 22050;
    const selectedStations = getDashboardMusicSelectedStations();
    const sequencePhraseCount = Math.max(4, selectedStations.length * 2);
    const phraseLength = DASHBOARD_MUSIC_PHRASE_SECONDS * sequencePhraseCount;
    const totalSamples = Math.floor(sampleRate * phraseLength);
    const bytesPerSample = 2;
    const buffer = new ArrayBuffer(44 + totalSamples * bytesPerSample);
    const view = new DataView(buffer);
    const mixScale = 0.92;
    const sequenceStartStep = dashboardMusicStepRef.current;
    const writeString = (offset: number, value: string) => {
      for (let index = 0; index < value.length; index += 1) {
        view.setUint8(offset + index, value.charCodeAt(index));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + totalSamples * bytesPerSample, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * bytesPerSample, true);
    view.setUint16(32, bytesPerSample, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, totalSamples * bytesPerSample, true);

    for (let sampleIndex = 0; sampleIndex < totalSamples; sampleIndex += 1) {
      const time = sampleIndex / sampleRate;
      const phraseIndex =
        Math.floor(time / DASHBOARD_MUSIC_PHRASE_SECONDS) + sequenceStartStep;
      const activeStationIndex = phraseIndex % selectedStations.length;
      const barTime = time % DASHBOARD_MUSIC_PHRASE_SECONDS;
      const blendedValue = selectedStations.reduce(
        (stationSum, station, stationIndex) => {
          if (stationIndex !== activeStationIndex) return stationSum;

          const layerTime = barTime;
          const progression = station.progression;
          const chord =
            progression[
              Math.floor(phraseIndex / selectedStations.length) %
                progression.length
            ];
          const fadeIn = Math.min(1, barTime / 0.72);
          const fadeOut = Math.min(
            1,
            (DASHBOARD_MUSIC_PHRASE_SECONDS - barTime) / 0.88,
          );
          const envelope = fadeIn * fadeOut;
          const leadOffsets = station.arpOffsets.length
            ? station.arpOffsets
            : [0.48, 1.2, 2.16, 3.08];
          const shapeEnvelope = (offset: number, length: number) => {
            const localTime = barTime - offset;

            return localTime >= 0 && localTime < length
              ? Math.sin((localTime / length) * Math.PI)
              : 0;
          };
          const pad =
            chord.notes.reduce((sum, frequency, noteIndex) => {
              const detune = noteIndex === 3 ? 1.005 : 1;

              return (
                sum +
                Math.sin(2 * Math.PI * frequency * detune * layerTime) *
                  station.padVolume *
                  envelope +
                Math.sin(2 * Math.PI * frequency * 1.5 * layerTime) *
                  station.padVolume *
                  0.18 *
                  envelope +
                Math.sin(2 * Math.PI * frequency * 0.5 * layerTime) *
                  station.padVolume *
                  0.5 *
                  envelope
              );
            }, 0) / chord.notes.length;
          const shimmer =
            leadOffsets.reduce((sum, arpOffset, noteIndex) => {
              const leadDegree = station.leadPattern[
                noteIndex % station.leadPattern.length
              ];
              const frequency =
                chord.color[leadDegree % chord.color.length] *
                (noteIndex % 4 === 3 ? 2 : 1);
              const arpEnvelope = shapeEnvelope(arpOffset, 0.62);

              return (
                sum +
                Math.sin(2 * Math.PI * frequency * layerTime) *
                  station.leadVolume *
                  0.92 *
                  arpEnvelope
              );
            }, 0) / leadOffsets.length;
          const lead =
            station.leadPattern.reduce((sum, leadDegree, noteIndex) => {
              const leadOffset = leadOffsets[noteIndex % leadOffsets.length];
              const leadEnvelope = shapeEnvelope(leadOffset, 0.42);
              const frequency =
                chord.color[leadDegree % chord.color.length] *
                (noteIndex % 4 === 2 ? 2 : 1);
              const phase = 2 * Math.PI * frequency * layerTime;
              const sawPhase = (layerTime * frequency) % 1;
              const waveform =
                station.leadType === "square"
                  ? Math.sign(Math.sin(phase)) * 0.72 +
                    Math.sin(phase) * 0.28
                  : station.leadType === "sawtooth"
                    ? (sawPhase * 2 - 1) * 0.58 + Math.sin(phase) * 0.42
                    : Math.sin(phase) +
                      Math.sin(phase * 2) * 0.22 +
                      Math.sin(phase * 0.5) * 0.12;

              return sum + waveform * station.leadVolume * leadEnvelope;
            }, 0) / station.leadPattern.length;
          const bass =
            Math.sin(2 * Math.PI * chord.bass * layerTime) *
            station.bassVolume *
            envelope;
          const pulseEnvelope = station.pulseOffsets.reduce(
            (sum, beatOffset) => {
              const beatTime = Math.max(0, barTime - beatOffset);

              return (
                sum +
                (barTime >= beatOffset && barTime < beatOffset + 0.42
                  ? Math.sin((beatTime / 0.42) * Math.PI)
                  : 0)
              );
            },
            0,
          );
          const pulse =
            Math.sin(2 * Math.PI * (chord.bass / 2) * layerTime) *
            station.kickVolume *
            0.72 *
            pulseEnvelope;
          const snare =
            station.snareOffsets.reduce((sum, beatOffset) => {
              const snareEnvelope = shapeEnvelope(beatOffset, 0.22);

              return (
                sum +
                (Math.sin(2 * Math.PI * 190 * layerTime) * 0.38 +
                  Math.sin(2 * Math.PI * 2300 * layerTime) * 0.62) *
                  station.noiseVolume *
                  1.05 *
                  snareEnvelope
              );
            }, 0) / Math.max(1, station.snareOffsets.length);
          const hat =
            station.hatOffsets.reduce((sum, beatOffset, hatIndex) => {
              const hatEnvelope = shapeEnvelope(beatOffset, 0.08);

              return (
                sum +
                Math.sin(
                  2 *
                    Math.PI *
                    (6400 + hatIndex * 360 + stationIndex * 110) *
                    layerTime,
                ) *
                  station.noiseVolume *
                  0.32 *
                  hatEnvelope
              );
            }, 0) / Math.max(1, station.hatOffsets.length);
          const texture =
            Math.sin(2 * Math.PI * (5200 + stationIndex * 190) * layerTime) *
            Math.sin(2 * Math.PI * (6.5 + stationIndex * 0.7) * layerTime) *
            station.textureVolume *
            0.18 *
            envelope;
          const air =
            Math.sin(2 * Math.PI * 3136 * layerTime) *
            Math.sin(2 * Math.PI * 0.11 * layerTime) *
            shapeEnvelope(station.noiseOffset, 1.3) *
            station.noiseVolume *
            0.24;
          const nextStation =
            selectedStations[(stationIndex + 1) % selectedStations.length];
          const nextProgression = nextStation.progression;
          const nextChord =
            nextProgression[
              Math.floor((phraseIndex + 1) / selectedStations.length) %
                nextProgression.length
            ];
          const transitionEnvelope =
            selectedStations.length > 1
              ? shapeEnvelope(
                  DASHBOARD_MUSIC_PHRASE_SECONDS -
                    DASHBOARD_MUSIC_TRANSITION_SECONDS,
                  DASHBOARD_MUSIC_TRANSITION_SECONDS,
                )
              : 0;
          const transition =
            (Math.sin(
              2 *
                Math.PI *
                Math.max(chord.bass, nextChord.bass) *
                1.5 *
                layerTime,
            ) *
              Math.max(station.leadVolume, nextStation.leadVolume) *
              0.68 +
              Math.sin(
                2 * Math.PI * (2600 + stationIndex * 180) * layerTime,
              ) *
                Math.max(station.noiseVolume, nextStation.noiseVolume) *
                0.18) *
            transitionEnvelope;

          return (
            stationSum +
            (bass +
              pulse +
              snare +
              hat +
              pad +
              shimmer +
              lead +
              texture +
              air +
              transition) *
              mixScale
          );
        },
        0,
      );
      const value = Math.max(
        -0.92,
        Math.min(0.92, blendedValue * 1.55),
      );

      view.setInt16(44 + sampleIndex * bytesPerSample, value * 32767, true);
    }

    return window.URL.createObjectURL(
      new Blob([buffer], { type: "audio/wav" }),
    );
  };
  const startDashboardMusicFallback = async () => {
    if (typeof Audio === "undefined") return false;

    const url = createDashboardMusicFallbackUrl();
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = dashboardMusicMutedRef.current
      ? 0
      : Math.min(1, Math.max(0, dashboardMusicVolumeRef.current));
    dashboardMusicAudioElementRef.current = audio;
    dashboardMusicObjectUrlRef.current = url;

    try {
      await audio.play();
      return true;
    } catch {
      audio.pause();
      window.URL.revokeObjectURL(url);
      dashboardMusicAudioElementRef.current = null;
      dashboardMusicObjectUrlRef.current = null;
      return false;
    }
  };
  const stopDashboardMusic = () => {
    if (dashboardMusicIntervalRef.current !== null) {
      window.clearInterval(dashboardMusicIntervalRef.current);
      dashboardMusicIntervalRef.current = null;
    }

    if (dashboardMusicAudioElementRef.current) {
      dashboardMusicAudioElementRef.current.pause();
      dashboardMusicAudioElementRef.current.currentTime = 0;
      dashboardMusicAudioElementRef.current = null;
    }

    if (dashboardMusicObjectUrlRef.current) {
      window.URL.revokeObjectURL(dashboardMusicObjectUrlRef.current);
      dashboardMusicObjectUrlRef.current = null;
    }

    const context = dashboardMusicAudioContextRef.current;
    const masterGain = dashboardMusicGainRef.current;

    if (context && masterGain && context.state !== "closed") {
      const now = context.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setTargetAtTime(0.0001, now, 0.08);

      window.setTimeout(() => {
        if (
          dashboardMusicAudioContextRef.current === context &&
          context.state !== "closed"
        ) {
          void context.close().catch(() => undefined);
          dashboardMusicAudioContextRef.current = null;
          dashboardMusicGainRef.current = null;
        }
      }, 420);
    }
  };
  const startDashboardMusic = async (
    options: { resetStep?: boolean } = {},
  ) => {
    if (typeof window === "undefined") return false;

    if (options.resetStep ?? true) {
      dashboardMusicStepRef.current = 0;
    }

    const AudioContextConstructor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextConstructor) return startDashboardMusicFallback();

    const context = new AudioContextConstructor();
    const masterGain = context.createGain();
    const toneFilter = context.createBiquadFilter();
    const compressor = context.createDynamicsCompressor();
    const delay = context.createDelay(2);
    const delayFeedback = context.createGain();
    const delayReturn = context.createGain();

    toneFilter.type = "lowpass";
    toneFilter.frequency.setValueAtTime(3600, context.currentTime);
    toneFilter.Q.setValueAtTime(0.42, context.currentTime);
    compressor.threshold.setValueAtTime(-24, context.currentTime);
    compressor.knee.setValueAtTime(20, context.currentTime);
    compressor.ratio.setValueAtTime(3, context.currentTime);
    compressor.attack.setValueAtTime(0.018, context.currentTime);
    compressor.release.setValueAtTime(0.26, context.currentTime);
    delay.delayTime.setValueAtTime(0.38, context.currentTime);
    delayFeedback.gain.setValueAtTime(0.2, context.currentTime);
    delayReturn.gain.setValueAtTime(0.18, context.currentTime);
    masterGain.gain.setValueAtTime(0.0001, context.currentTime);
    masterGain.connect(toneFilter);
    masterGain.connect(delay);
    delay.connect(delayFeedback);
    delayFeedback.connect(delay);
    delay.connect(delayReturn);
    delayReturn.connect(toneFilter);
    toneFilter.connect(compressor);
    compressor.connect(context.destination);
    dashboardMusicAudioContextRef.current = context;
    dashboardMusicGainRef.current = masterGain;

    await context.resume();
    if (context.state !== "running") {
      await context.resume();
    }

    if (context.state !== "running") {
      await context.close().catch(() => undefined);
      dashboardMusicAudioContextRef.current = null;
      dashboardMusicGainRef.current = null;
      return startDashboardMusicFallback();
    }

    const now = context.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.exponentialRampToValueAtTime(
      getDashboardMusicMasterGainLevel() * 0.84,
      now + 0.16,
    );
    masterGain.gain.exponentialRampToValueAtTime(
      getDashboardMusicMasterGainLevel(),
      now + 0.75,
    );
    scheduleDashboardMusicStartCue();
    scheduleDashboardMusicPhrase();
    dashboardMusicIntervalRef.current = window.setInterval(
      scheduleDashboardMusicPhrase,
      DASHBOARD_MUSIC_PHRASE_SECONDS * 1000,
    );

    return true;
  };
  const restartDashboardMusicSequence = () => {
    if (!dashboardMusicEnabled) return;

    stopDashboardMusic();
    setDashboardMusicEnabled(false);
    window.setTimeout(() => {
      void startDashboardMusic({ resetStep: false }).then((started) => {
        setDashboardMusicEnabled(started);
      });
    }, 460);
  };
  const toggleDashboardMusic = async () => {
    if (dashboardMusicEnabled) {
      stopDashboardMusic();
      setDashboardMusicEnabled(false);
      return;
    }

    const started = await startDashboardMusic();
    setDashboardMusicEnabled(started);
  };
  const handleDashboardMusicMuteToggle = () => {
    const nextMuted = !dashboardMusicMutedRef.current;

    dashboardMusicMutedRef.current = nextMuted;
    setDashboardMusicMuted(nextMuted);
    applyDashboardMusicVolume();
  };
  const handleDashboardMusicSkip = () => {
    dashboardMusicStepRef.current += 1;

    if (dashboardMusicEnabled) {
      restartDashboardMusicSequence();
    }
  };
  const handleDashboardMusicAutoplayModeChange = (
    mode: DashboardMusicAutoplayMode,
  ) => {
    dashboardMusicAutoplayModeRef.current = mode;
    setDashboardMusicAutoplayMode(mode);

    if (mode === "on" && dashboardMusicMutedRef.current) {
      dashboardMusicMutedRef.current = false;
      setDashboardMusicMuted(false);
      applyDashboardMusicVolume();
    }

    if (mode !== "off" && !dashboardMusicEnabled) {
      void startDashboardMusic().then((started) => {
        setDashboardMusicEnabled(started);
      });
    }
  };
  const toggleDashboardMusicDropdown = () => {
    hideDashboardTooltip();
    setDashboardProfileHubOpen(false);
    setDashboardPointsDropdownOpen(false);
    setDashboardHeaderMeterMenuOpen(false);
    setDashboardMusicDropdownOpen((open) => !open);
  };
  const handleDashboardMusicVolumeChange = (
    event: ReactChangeEvent<HTMLInputElement>,
  ) => {
    const nextVolume = Math.min(
      1,
      Math.max(0, Number(event.currentTarget.value) / 100),
    );

    dashboardMusicVolumeRef.current = nextVolume;
    if (dashboardMusicMutedRef.current && nextVolume > 0) {
      dashboardMusicMutedRef.current = false;
      setDashboardMusicMuted(false);
    }
    setDashboardMusicVolume(nextVolume);
    applyDashboardMusicVolume();
  };
  const handleDashboardMusicStationToggle = (
    stationId: DashboardMusicStationId,
  ) => {
    const stationIndex = dashboardMusicStations.findIndex(
      (station) => station.id === stationId,
    );
    const currentStationIds = dashboardMusicStationIdsRef.current;
    const nextStationIds = currentStationIds.includes(stationId)
      ? currentStationIds.filter((id) => id !== stationId)
      : [...currentStationIds, stationId];
    const normalizedStationIds = dashboardMusicStations
      .map((station) => station.id)
      .filter((id) => nextStationIds.includes(id));
    const safeStationIds = normalizedStationIds.length
      ? normalizedStationIds
      : currentStationIds;

    dashboardMusicStationIdsRef.current = safeStationIds;
    dashboardMusicStepRef.current = 0;
    if (stationIndex >= 0) {
      setActiveDashboardMusicStationIndex(stationIndex);
    }
    setDashboardMusicStationIds(safeStationIds);

    if (dashboardMusicEnabled) {
      restartDashboardMusicSequence();
    }
  };
  const selectedExerciseReference = manualReferences.find(
    (reference) => reference.referenceType === "exercise",
  );
  const selectedExercise = selectedExerciseReference
    ? exerciseLibrary.find(
        (exercise) => exercise.id === selectedExerciseReference.referenceId,
      ) || null
    : null;
  const favoriteWorkoutTemplates = useMemo(() => {
    const seenTemplateIds = new Set<string>();
    const templates: LocalWorkoutBuilderTemplate[] = [];

    if (activeSessionTemplate?.exercises?.length) {
      seenTemplateIds.add(activeSessionTemplate.id);
      templates.push(activeSessionTemplate);
    }

    savedTemplates.forEach((template) => {
      if (!template.exercises.length || seenTemplateIds.has(template.id)) {
        return;
      }

      seenTemplateIds.add(template.id);
      templates.push(template);
    });

    return templates.slice(0, 8);
  }, [activeSessionTemplate, savedTemplates]);
  const favoriteExerciseCards = useMemo(() => {
    const favorites = favoriteExerciseIds
      .map((favoriteId) =>
        exerciseLibrary.find((exercise) => exercise.id === favoriteId),
      )
      .filter((exercise): exercise is Exercise => Boolean(exercise));

    return favorites.slice(0, 12);
  }, [favoriteExerciseIds]);
  const manualPlanExerciseCards = useMemo(() => {
    const planExercises = favoriteWorkoutTemplates[0]?.exercises || [];
    const resolvedExercises = planExercises
      .map((plannedExercise) =>
        exerciseLibrary.find(
          (exercise) =>
            exercise.id === plannedExercise.id ||
            exercise.name.toLowerCase() === plannedExercise.name.toLowerCase(),
        ),
      )
      .filter((exercise): exercise is Exercise => Boolean(exercise));

    return resolvedExercises.slice(0, 12);
  }, [favoriteWorkoutTemplates]);
  const activeManualFavoriteDashboard =
    manualStatsFavoriteDashboardSources[
      activeManualFavoriteDashboardIndex %
        manualStatsFavoriteDashboardSources.length
    ] || manualStatsFavoriteDashboardSources[0];
  const activeDashboardLibraryFavoriteIds =
    activeManualFavoriteDashboard.id === "workout"
      ? []
      : dashboardLibraryFavoriteIds[activeManualFavoriteDashboard.id] || [];
  const activeManualFavoriteCount =
    activeManualFavoriteDashboard.id === "workout"
      ? favoriteExerciseCards.length
      : activeDashboardLibraryFavoriteIds.length;
  const manualExerciseLibraryCategories = useMemo(
    () =>
      createManualExerciseLibraryCategories({
        favoriteExercises: favoriteExerciseCards,
        myPlanExercises: manualPlanExerciseCards,
      }),
    [favoriteExerciseCards, manualPlanExerciseCards],
  );
  const activeManualExerciseCategory =
    manualExerciseLibraryCategories.find(
      (category) => category.id === activeManualExerciseCategoryId,
    ) || manualExerciseLibraryCategories[0];
  const activeManualFavoriteCountLabel =
    activeManualFavoriteDashboard.id === "workout"
      ? activeManualExerciseCategory?.helper || "Library"
      : `${activeManualFavoriteCount} saved`;
  const selectedManualExerciseReferenceIds = useMemo(
    () =>
      new Set(
        manualReferences
          .filter((reference) => reference.referenceType === "exercise")
          .map((reference) => reference.referenceId),
      ),
    [manualReferences],
  );
  const activeCommandCenter =
    dashboardCommandCenterCards[activeCommandCenterIndex] ||
    dashboardCommandCenterCards[0];
  const activeSystemCenter =
    dashboardSystemCards[activeSystemCenterIndex] || dashboardSystemCards[0];
  const dashboardOrbiterRows = [
    {
      completion: 100,
      helper: "Hero, rewards, and progression wallet.",
      icon: "dashboard",
      logo: "sound",
      title: "Weekly Snapshot",
    },
    {
      completion: manualStatsLogs.length ? 100 : 58,
      helper:
        "Manual stats, video review form checks, import tools, library attach, and recent saves.",
      icon: "stats",
      title: "Daily Tools",
    },
    {
      completion: exerciseStats.length ? 82 : 36,
      helper:
        "Last 7 days of training volume, nutrition consistency, and recovery readiness.",
      icon: "performance",
      title: "Weekly Recap",
    },
    {
      completion: Math.round(
        ((activeCommandCenterIndex + 1) / dashboardCommandCenterCards.length) *
          100,
      ),
      helper: "Core command centers.",
      icon: "dashboard",
      title: "Dashboards",
    },
    {
      completion: 72,
      helper: "Training calendar, scheduled sessions, and weekly commitments.",
      icon: "calendar",
      title: "Calendar",
    },
    {
      completion:
        exerciseStats.length || savedTemplates.length || manualStatsLogs.length
          ? 76
          : 34,
      helper:
        "Personalized insight cards that connect dashboard signals to relevant content.",
      icon: "soundworld",
      logo: "sound",
      title: "My Sound",
    },
    {
      completion: Math.round(
        ((activeSystemCenterIndex + 1) / dashboardSystemCards.length) * 100,
      ),
      helper:
        "Goals, insights, stats, progress, appointments, messages, packages, and achievements.",
      icon: "app",
      title: "System Row",
    },
    {
      completion: activeSessionTemplate
        ? 76
        : favoriteWorkoutTemplates.length
          ? 64
          : exerciseStats.length
            ? 54
            : 28,
      helper:
        "A dynamic plan snapshot laid out as a horizontal Master Training Journey timeline.",
      icon: "plan",
      title: "Master Training Journey",
    },
  ];
  const getDashboardRowUrgencyTone = (completion: number) =>
    completion >= 85
      ? {
          dot: "bg-emerald-200 shadow-[0_0_14px_rgba(110,231,183,0.56)]",
          icon: "+",
          label: "Low urgency",
          ring: "border-emerald-200/35 bg-emerald-300/10",
          text: "text-emerald-100",
        }
      : completion >= 50
        ? {
            dot: "bg-cyan-200 shadow-[0_0_14px_rgba(103,232,249,0.56)]",
            icon: ">",
            label: "Active",
            ring: "border-cyan-200/35 bg-cyan-300/10",
            text: "text-cyan-100",
          }
        : {
            dot: "bg-amber-200 shadow-[0_0_14px_rgba(250,204,21,0.56)]",
            icon: "!",
            label: "Needs attention",
            ring: "border-amber-200/35 bg-amber-300/10",
            text: "text-amber-100",
          };
  const clampedDashboardOrbiterRow = Math.max(
    0,
    Math.min(dashboardOrbiterRows.length - 1, activeDashboardOrbiterRow),
  );
  const dashboardPageOrbitProgress =
    dashboardOrbiterRows.length > 1
      ? clampedDashboardOrbiterRow / (dashboardOrbiterRows.length - 1)
      : 0;
  const setDashboardOrbiterRow = (row: number) => {
    const nextRow = Math.max(
      0,
      Math.min(dashboardOrbiterRows.length - 1, row),
    );
    if (nextRow === clampedDashboardOrbiterRow) return;

    const now = Date.now();
    if (
      now - dashboardOrbiterRowChangeLockRef.current <
      DASHBOARD_ORBITER_ROW_CLICK_LOCK_MS
    ) {
      return;
    }

    dashboardOrbiterRowChangeLockRef.current = now;
    setActiveDashboardOrbiterRow(nextRow);
  };
  const moveDashboardOrbiterRow = (direction: -1 | 1) => {
    const now = Date.now();
    if (
      now - dashboardOrbiterRowChangeLockRef.current <
      DASHBOARD_ORBITER_ROW_SCROLL_LOCK_MS
    ) {
      return;
    }

    dashboardOrbiterRowChangeLockRef.current = now;
    setActiveDashboardOrbiterRow((currentRow) =>
      Math.max(
        0,
        Math.min(dashboardOrbiterRows.length - 1, currentRow + direction),
      ),
    );
  };
  const handleDashboardOrbiterWheel = (
    event: ReactWheelEvent<HTMLElement>,
  ) => {
    const target = event.target;

    if (
      target instanceof HTMLElement &&
      target.closest("[data-dashboard-orbiter-local-scroll='true']")
    ) {
      return;
    }

    if (Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.2) return;

    const direction = event.deltaY > 18 ? 1 : event.deltaY < -18 ? -1 : 0;
    if (direction === 0) return;

    const nextRow = Math.max(
      0,
      Math.min(
        dashboardOrbiterRows.length - 1,
        clampedDashboardOrbiterRow + direction,
      ),
    );
    if (nextRow === clampedDashboardOrbiterRow) return;

    event.preventDefault();
    event.stopPropagation();
    setDashboardOrbiterRow(nextRow);
  };
  const handleDashboardOrbiterKeyDown = (
    event: ReactKeyboardEvent<HTMLElement>,
  ) => {
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      target.closest(
        "input,select,textarea,[contenteditable='true'],[data-dashboard-orbiter-local-scroll='true']",
      )
    ) {
      return;
    }

    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;

    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextRow = Math.max(
      0,
      Math.min(
        dashboardOrbiterRows.length - 1,
        clampedDashboardOrbiterRow + direction,
      ),
    );
    if (nextRow === clampedDashboardOrbiterRow) return;

    event.preventDefault();
    event.stopPropagation();
    setDashboardOrbiterRow(nextRow);
  };
  const handleDashboardOrbiterPointerDown = (
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const target = event.target;
    if (
      target instanceof HTMLElement &&
      target.closest(
        "input,select,textarea,[contenteditable='true'],[data-dashboard-orbiter-local-scroll='true']",
      )
    ) {
      return;
    }

    dashboardOrbiterPointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    dashboardOrbiterPointerMovedRef.current = false;
    event.currentTarget.focus({ preventScroll: true });
  };
  const handleDashboardOrbiterPointerMove = (
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    const start = dashboardOrbiterPointerStartRef.current;
    if (!start) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const verticalIntent = Math.abs(deltaY) > Math.abs(deltaX) * 1.15;

    if (!verticalIntent || Math.abs(deltaY) < 70) return;

    const direction = deltaY > 0 ? -1 : 1;
    const nextRow = Math.max(
      0,
      Math.min(
        dashboardOrbiterRows.length - 1,
        clampedDashboardOrbiterRow + direction,
      ),
    );

    dashboardOrbiterPointerMovedRef.current = true;
    dashboardOrbiterPointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };

    event.preventDefault();
    event.stopPropagation();

    if (nextRow !== clampedDashboardOrbiterRow) {
      setDashboardOrbiterRow(nextRow);
    }
  };
  const handleDashboardOrbiterPointerEnd = (
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    dashboardOrbiterPointerStartRef.current = null;

    if (dashboardOrbiterPointerMovedRef.current) {
      event.preventDefault();
      window.setTimeout(() => {
        dashboardOrbiterPointerMovedRef.current = false;
      }, 0);
    }
  };
  const getDashboardOrbitDistance = (
    index: number,
    activeIndex: number,
    totalCards: number,
  ) => {
    const rawDistance = index - activeIndex;

    if (rawDistance > totalCards / 2) {
      return rawDistance - totalCards;
    }

    if (rawDistance < -totalCards / 2) {
      return rawDistance + totalCards;
    }

    return rawDistance;
  };
  const getCommandCenterOrbitDistance = (index: number) =>
    getDashboardOrbitDistance(
      index,
      activeCommandCenterIndex,
      dashboardCommandCenterCards.length,
    );
  const getSystemCenterOrbitDistance = (index: number) =>
    getDashboardOrbitDistance(
      index,
      activeSystemCenterIndex,
      dashboardSystemCards.length,
    );
  const rotateCommandCenter = (direction: DashboardOrbitDirection) => {
    setActiveCommandCenterIndex((currentIndex) => {
      const nextIndex =
        direction === "left" ? currentIndex - 1 : currentIndex + 1;

      return (
        (nextIndex + dashboardCommandCenterCards.length) %
        dashboardCommandCenterCards.length
      );
    });
  };
  const rotateSystemCenter = (direction: DashboardOrbitDirection) => {
    setActiveSystemCenterIndex((currentIndex) => {
      const nextIndex =
        direction === "left" ? currentIndex - 1 : currentIndex + 1;

      return (
        (nextIndex + dashboardSystemCards.length) % dashboardSystemCards.length
      );
    });
  };
  const dashboardDailyToolCount = 3;
  const rotateDailyToolOrbit = (direction: DashboardOrbitDirection) => {
    setActiveDailyToolIndex((currentIndex) =>
      direction === "left"
        ? (currentIndex - 1 + dashboardDailyToolCount) %
          dashboardDailyToolCount
        : (currentIndex + 1) % dashboardDailyToolCount,
    );
  };
  const rotateDashboardMusicStationOrbit = (
    direction: DashboardOrbitDirection,
  ) => {
    setActiveDashboardMusicStationIndex((currentIndex) =>
      direction === "left"
        ? (currentIndex - 1 + dashboardMusicStations.length) %
          dashboardMusicStations.length
        : (currentIndex + 1) % dashboardMusicStations.length,
    );
  };
  const handleDashboardOrbitPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    pointerStartRef: DashboardPointerStartRef,
    pointerMovedRef: DashboardPointerMovedRef,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    pointerStartRef.current = event.clientX;
    pointerMovedRef.current = false;
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const handleDashboardOrbitPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
    pointerStartRef: DashboardPointerStartRef,
    pointerMovedRef: DashboardPointerMovedRef,
    rotateOrbit: (direction: DashboardOrbitDirection) => void,
    threshold = 72,
  ) => {
    const startX = pointerStartRef.current;
    if (startX === null) return;

    const deltaX = event.clientX - startX;
    if (Math.abs(deltaX) < threshold) return;

    event.preventDefault();
    event.stopPropagation();
    pointerMovedRef.current = true;
    rotateOrbit(deltaX > 0 ? "left" : "right");
    pointerStartRef.current = event.clientX;
  };
  const handleDashboardOrbitPointerUp = (
    event: ReactPointerEvent<HTMLDivElement>,
    pointerStartRef: DashboardPointerStartRef,
    pointerMovedRef: DashboardPointerMovedRef,
    rotateOrbit: (direction: DashboardOrbitDirection) => void,
    setActiveIndex?: (index: number) => void,
  ) => {
    const startX = pointerStartRef.current;
    pointerStartRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }

    if (startX === null) {
      return;
    }

    if (pointerMovedRef.current) {
      return;
    }

    const deltaX = event.clientX - startX;

    if (Math.abs(deltaX) < 44) {
      const elementAtPoint = event.currentTarget.ownerDocument.elementFromPoint(
        event.clientX,
        event.clientY,
      );
      const cardElement =
        elementAtPoint instanceof HTMLElement
          ? elementAtPoint.closest("[data-dashboard-orbit-card-index]")
          : null;
      const cardIndexValue =
        cardElement instanceof HTMLElement
          ? cardElement.dataset.dashboardOrbitCardIndex
          : undefined;
      const cardIndex =
        typeof cardIndexValue === "string" ? Number(cardIndexValue) : NaN;

      if (setActiveIndex && Number.isInteger(cardIndex)) {
        setActiveIndex(cardIndex);
      }

      return;
    }

    pointerMovedRef.current = true;
    rotateOrbit(deltaX > 0 ? "left" : "right");
  };
  const handleDashboardOrbitKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
    rotateOrbit: (direction: DashboardOrbitDirection) => void,
  ) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      rotateOrbit("left");
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      rotateOrbit("right");
    }
  };
  const handleDashboardOrbitWheel = (
    event: ReactWheelEvent<HTMLDivElement>,
    rotateOrbit: (direction: DashboardOrbitDirection) => void,
  ) => {
    const horizontalDelta =
      Math.abs(event.deltaX) >= Math.abs(event.deltaY)
        ? event.deltaX
        : event.shiftKey
          ? event.deltaY
          : 0;

    if (Math.abs(horizontalDelta) < 18) return;

    event.preventDefault();
    event.stopPropagation();

    const now = Date.now();
    if (now - dashboardCardWheelLockRef.current < 240) return;

    dashboardCardWheelLockRef.current = now;
    rotateOrbit(horizontalDelta > 0 ? "right" : "left");
  };
  const filteredExerciseReferences = useMemo(() => {
    const searchValue = exerciseReferenceSearch.trim().toLowerCase();
    const matches = searchValue
      ? exerciseLibrary.filter((exercise) =>
          [
            exercise.name,
            exercise.body,
            exercise.muscles,
            exercise.pattern,
            exercise.goal,
            exercise.equipment,
            exercise.level,
          ]
            .join(" ")
            .toLowerCase()
            .includes(searchValue),
        )
      : exerciseLibrary;

    return matches.slice(0, 18);
  }, [exerciseReferenceSearch]);

  const updateManualStatsDraft = (
    field: keyof ManualStatsDraft,
    value: string,
  ) => {
    setManualStatsDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const selectExerciseReference = (exercise: Exercise) => {
    const nextReference = buildExerciseReference(exercise);
    setManualReferences((current) => [
      nextReference,
      ...current.filter(
        (reference) => reference.referenceType !== nextReference.referenceType,
      ),
    ]);
    setExerciseSelectorOpen(false);
    setExerciseReferenceSearch("");
  };

  const saveManualStatsLog = () => {
    const hasManualValue = [
      manualStatsDraft.sets,
      manualStatsDraft.reps,
      manualStatsDraft.load,
      manualStatsDraft.rpe,
      manualStatsDraft.notes,
      manualStatsDraft.sessionLabel,
    ].some((value) => value.trim());

    if (!hasManualValue && manualReferences.length === 0) {
      return;
    }

    const loggedAt = new Date().toISOString();
    const entry: ManualStatsLogEntry = {
      ...manualStatsDraft,
      id: `manual-log-${Date.now()}`,
      loggedAt,
      references: manualReferences,
    };
    const updatedManualLogs = [entry, ...manualStatsLogs].slice(0, 24);
    setManualStatsLogs(updatedManualLogs);
    writeManualStatsLogEntries(updatedManualLogs);

    if (selectedExerciseReference) {
      const statDate = getManualLogIsoDate(manualStatsDraft.dateTime);
      const newExerciseStat: LocalExerciseStatEntry = {
        body: selectedExerciseReference.metadata.body,
        equipment: selectedExerciseReference.metadata.equipment,
        exerciseId: selectedExerciseReference.referenceId,
        exerciseName: selectedExerciseReference.referenceTitle,
        pattern: selectedExerciseReference.metadata.movementPattern,
        reps: manualStatsDraft.reps.trim() || "0",
        sets: manualStatsDraft.sets.trim() || "1",
        weight: manualStatsDraft.load.trim() || "0",
        date: statDate,
        source: "exercise-library",
      };
      const updatedExerciseStats = prependExerciseStats(newExerciseStat);
      setExerciseStats(updatedExerciseStats);
    }

    setManualStatsDraft({
      dateTime: getManualDateTimeInputValue(),
      load: "",
      notes: "",
      reps: "",
      rpe: "",
      sessionLabel: "",
      sets: "",
    });
  };

  const handleUploadOptionSelect = (optionId: UploadOptionId) => {
    setActiveUploadType(optionId);
  };

  const rotateManualFavoriteDashboard = (direction: "left" | "right") => {
    setActiveManualFavoriteDashboardIndex((currentIndex) => {
      const nextIndex =
        direction === "left" ? currentIndex - 1 : currentIndex + 1;

      return (
        (nextIndex + manualStatsFavoriteDashboardSources.length) %
        manualStatsFavoriteDashboardSources.length
      );
    });
  };
  const rotateManualExerciseCategory = (direction: "left" | "right") => {
    setActiveManualExerciseCategoryId((currentCategoryId) => {
      const currentIndex = Math.max(
        0,
        manualExerciseLibraryCategories.findIndex(
          (category) => category.id === currentCategoryId,
        ),
      );
      const nextIndex =
        direction === "left" ? currentIndex - 1 : currentIndex + 1;
      const nextCategory =
        manualExerciseLibraryCategories[
          (nextIndex + manualExerciseLibraryCategories.length) %
            manualExerciseLibraryCategories.length
        ];

      return nextCategory?.id || currentCategoryId;
    });
  };
  const scrollFavoriteWorkouts = (direction: "left" | "right") => {
    const selector = favoriteWorkoutStripRef.current;
    if (!selector) return;

    selector.scrollBy({
      behavior: "smooth",
      left: direction === "left" ? -300 : 300,
    });
  };
  const markDashboardDestinationVisited = (href: string) => {
    if (typeof window === "undefined") return;

    if (href === ROUTES.dashboard.profile) {
      window.localStorage.setItem(DASHBOARD_PROFILE_VISITED_KEY, "true");
    }

    if (href === ROUTES.dashboard.goals) {
      window.localStorage.setItem(DASHBOARD_GOALS_VISITED_KEY, "true");
    }

    setDashboardFoundationProgress(readDashboardFoundationProgress());
  };
  const openDashboardAchievementsFromHeader = (
    event: ReactMouseEvent<HTMLAnchorElement>,
  ) => {
    markDashboardDestinationVisited(ROUTES.dashboard.achievements);

    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();

    if (dashboardHeaderAchievementRevealActive) return;

    setDashboardHeaderAchievementRevealActive(true);

    if (dashboardHeaderAchievementRevealTimeoutRef.current !== null) {
      window.clearTimeout(dashboardHeaderAchievementRevealTimeoutRef.current);
    }

    dashboardHeaderAchievementRevealTimeoutRef.current = window.setTimeout(
      () => {
        router.push(ROUTES.dashboard.achievements);
      },
      620,
    );
  };
  const launchFavoriteWorkout = (template: LocalWorkoutBuilderTemplate) => {
    if (!template.exercises.length) return;

    const sessionTemplate = writeActiveWorkoutBuilderSessionTemplate(template);
    setActiveSessionTemplate(sessionTemplate);
  };

  useEffect(
    () => () => {
      if (dashboardHeaderAchievementRevealTimeoutRef.current !== null) {
        window.clearTimeout(dashboardHeaderAchievementRevealTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    setManualStatsLogs(readManualStatsLogEntries());
  }, []);

  useEffect(() => {
    if (!dashboardHeaderMeterMenuOpen) {
      setDashboardHeaderMeterRailActive(false);
      return;
    }

    let railTimeoutId: number | null = null;
    const rotateDashboardHeaderMeters = () => {
      setDashboardHeaderMeterRailActive(true);
      setDashboardHeaderMeterActiveIndex(
        (currentIndex) => (currentIndex + 1) % DASHBOARD_HEADER_METER_COUNT,
      );

      if (railTimeoutId !== null) {
        window.clearTimeout(railTimeoutId);
      }

      railTimeoutId = window.setTimeout(() => {
        setDashboardHeaderMeterRailActive(false);
      }, DASHBOARD_HEADER_METER_RAIL_PULSE_MS);
    };

    const intervalId = window.setInterval(
      rotateDashboardHeaderMeters,
      DASHBOARD_HEADER_METER_AUTOSCROLL_MS,
    );

    return () => {
      window.clearInterval(intervalId);
      if (railTimeoutId !== null) {
        window.clearTimeout(railTimeoutId);
      }
    };
  }, [dashboardHeaderMeterMenuOpen]);

  useEffect(() => {
    const savedSettings = readDashboardMusicSettings();
    const savedMuted = savedSettings.muted;
    let cancelled = false;
    let autoplayTimeout: number | null = null;

    dashboardMusicStationIdsRef.current = savedSettings.stationIds;
    dashboardMusicVolumeRef.current = savedSettings.volume;
    dashboardMusicMutedRef.current = savedMuted;
    dashboardMusicAutoplayModeRef.current = savedSettings.autoplayMode;
    setDashboardMusicStationIds(savedSettings.stationIds);
    setDashboardMusicVolume(savedSettings.volume);
    setDashboardMusicMuted(savedMuted);
    setDashboardMusicAutoplayMode(savedSettings.autoplayMode);
    setActiveDashboardMusicStationIndex(
      Math.max(
        0,
        dashboardMusicStations.findIndex(
          (station) => station.id === savedSettings.stationIds[0],
        ),
      ),
    );
    setDashboardMusicSettingsLoaded(true);

    if (savedSettings.autoplayMode !== "off") {
      autoplayTimeout = window.setTimeout(() => {
        void startDashboardMusic().then((started) => {
          if (!cancelled) setDashboardMusicEnabled(started);
        });
      }, 360);
    }

    return () => {
      cancelled = true;
      if (autoplayTimeout !== null) {
        window.clearTimeout(autoplayTimeout);
      }
    };
  }, []);

  useEffect(() => {
    if (!dashboardMusicSettingsLoaded) return;

    writeDashboardMusicSettings({
      autoplayMode: dashboardMusicAutoplayMode,
      muted: dashboardMusicMuted,
      stationIds: dashboardMusicStationIds,
      volume: dashboardMusicVolume,
    });
  }, [
    dashboardMusicAutoplayMode,
    dashboardMusicMuted,
    dashboardMusicSettingsLoaded,
    dashboardMusicStationIds,
    dashboardMusicVolume,
  ]);

  useEffect(() => {
    return () => {
      if (dashboardHeaderScrollButtonHoldTimeoutRef.current !== null) {
        window.clearTimeout(dashboardHeaderScrollButtonHoldTimeoutRef.current);
      }

      if (dashboardHeaderScrollButtonHoldIntervalRef.current !== null) {
        window.clearInterval(
          dashboardHeaderScrollButtonHoldIntervalRef.current,
        );
      }

      if (dashboardHeaderMenuOrbitHoldTimeoutRef.current !== null) {
        window.clearTimeout(dashboardHeaderMenuOrbitHoldTimeoutRef.current);
      }

      if (dashboardHeaderMenuOrbitHoldIntervalRef.current !== null) {
        window.clearInterval(dashboardHeaderMenuOrbitHoldIntervalRef.current);
      }

      if (dashboardHeaderIdleTimeoutRef.current !== null) {
        window.clearTimeout(dashboardHeaderIdleTimeoutRef.current);
      }

      if (dashboardHeaderTimeoutPortalIntervalRef.current !== null) {
        window.clearTimeout(dashboardHeaderTimeoutPortalIntervalRef.current);
      }

      if (dashboardHeaderTimeoutPortalCloseTimeoutRef.current !== null) {
        window.clearTimeout(
          dashboardHeaderTimeoutPortalCloseTimeoutRef.current,
        );
      }

      if (dashboardHeaderVortexPulseTimeoutRef.current !== null) {
        window.clearTimeout(dashboardHeaderVortexPulseTimeoutRef.current);
      }

      if (dashboardHeaderVortexSettleTimeoutRef.current !== null) {
        window.clearTimeout(dashboardHeaderVortexSettleTimeoutRef.current);
      }

      if (dashboardPageAnalogHoldTimeoutRef.current !== null) {
        window.clearTimeout(dashboardPageAnalogHoldTimeoutRef.current);
      }

      if (dashboardPageAnalogHoldIntervalRef.current !== null) {
        window.clearInterval(dashboardPageAnalogHoldIntervalRef.current);
      }

      if (dashboardTooltipTimerRef.current !== null) {
        window.clearTimeout(dashboardTooltipTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const { body, documentElement } = document;
    const previousBodyHeight = body.style.height;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;
    const previousDocumentHeight = documentElement.style.height;
    const previousDocumentOverflow = documentElement.style.overflow;
    const previousDocumentOverscrollBehavior =
      documentElement.style.overscrollBehavior;

    documentElement.style.height = "100%";
    documentElement.style.overflow = "hidden";
    documentElement.style.overscrollBehavior = "none";
    body.style.height = "100%";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    return () => {
      documentElement.style.height = previousDocumentHeight;
      documentElement.style.overflow = previousDocumentOverflow;
      documentElement.style.overscrollBehavior =
        previousDocumentOverscrollBehavior;
      body.style.height = previousBodyHeight;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
    };
  }, []);

  useEffect(() => {
    if (!dashboardProfileHubOpen) return;

    setDashboardProfileActionsOpen(false);
    setDashboardPointsDropdownOpen(false);
    setDashboardHeaderMeterMenuOpen(false);
    setDashboardMusicDropdownOpen(false);

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDashboardProfileHubOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [dashboardProfileHubOpen]);

  useEffect(() => {
    if (!dashboardHeaderMeterMenuOpen) return;

    setDashboardPointsDropdownOpen(false);
    setDashboardMusicDropdownOpen(false);

    const closeOnOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        !target.closest(
          ".dashboard-header-meter-menu-shell, .dashboard-header-meter-panel",
        )
      ) {
        setDashboardHeaderMeterMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDashboardHeaderMeterMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("touchstart", closeOnOutside);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("touchstart", closeOnOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [dashboardHeaderMeterMenuOpen]);

  useEffect(() => {
    if (!dashboardProfileActionsOpen) return;

    const closeOnOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (
        !(target instanceof Element) ||
        !target.closest(
          ".dashboard-profile-action-gear, .dashboard-profile-quick-action, .dashboard-music-dropdown",
        )
      ) {
        setDashboardProfileActionsOpen(false);
        setDashboardMusicDropdownOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDashboardProfileActionsOpen(false);
        setDashboardMusicDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("touchstart", closeOnOutside);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("touchstart", closeOnOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [dashboardProfileActionsOpen]);

  useEffect(() => {
    if (!dashboardPointsDropdownOpen) return;

    const closeOnOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !dashboardPointsDropdownRef.current?.contains(target)
      ) {
        setDashboardPointsDropdownOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDashboardPointsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("touchstart", closeOnOutside);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("touchstart", closeOnOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [dashboardPointsDropdownOpen]);

  useEffect(() => {
    if (!dashboardMusicDropdownOpen) return;

    const closeOnOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !dashboardMusicDropdownRef.current?.contains(target)
      ) {
        setDashboardMusicDropdownOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDashboardMusicDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("touchstart", closeOnOutside);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("touchstart", closeOnOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [dashboardMusicDropdownOpen]);

  useEffect(() => {
    const loadDashboardFavorites = () => {
      setFavoriteExerciseIds(
        readStringArrayFromStorage(EXERCISE_LIBRARY_FAVORITES_STORAGE_KEY),
      );
      setDashboardLibraryFavoriteIds(
        Object.fromEntries(
          dashboardFavoriteLibrarySources.map((source) => [
            source.id,
            readDashboardLibraryFavoriteIds(source),
          ]),
        ),
      );
    };

    loadDashboardFavorites();

    const handleStorage = (event: StorageEvent) => {
      const favoriteStorageKeys = new Set([
        EXERCISE_LIBRARY_FAVORITES_STORAGE_KEY,
        GLOBAL_DASHBOARD_FAVORITES_STORAGE_KEY,
        ...dashboardFavoriteLibrarySources.map((source) => source.storageKey),
      ]);

      if (event.key && !favoriteStorageKeys.has(event.key)) return;

      loadDashboardFavorites();
    };

    window.addEventListener("focus", loadDashboardFavorites);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("focus", loadDashboardFavorites);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!exerciseSelectorOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExerciseSelectorOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [exerciseSelectorOpen]);

  useEffect(() => {
    async function loadUser() {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        setCanSyncWorkoutData(false);
        setDashboardProfileIconUrl(readDashboardProfileIconUrl());
        return;
      }

      setCanSyncWorkoutData(true);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", authData.user.id)
        .single();

      const nameSource =
        profile?.full_name ||
        authData.user.user_metadata?.full_name ||
        authData.user.user_metadata?.first_name ||
        "Member";
      const authProfileIcon = readDashboardText(
        authData.user.user_metadata?.avatar_url,
        authData.user.user_metadata?.picture,
      );

      setFirstName(String(nameSource).split(" ")[0] || "Member");
      setDashboardProfileIconUrl(readDashboardProfileIconUrl(authProfileIcon));
    }

    loadUser();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setLastSyncedAt(window.localStorage.getItem(WORKOUT_SYNC_LAST_SYNCED_KEY));
    setActiveSessionTemplate(readActiveWorkoutBuilderSessionTemplate());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const refreshFoundationProgress = () => {
      setDashboardFoundationProgress(readDashboardFoundationProgress());
      setDashboardProfileIconUrl(readDashboardProfileIconUrl());
    };

    refreshFoundationProgress();
    window.addEventListener("storage", refreshFoundationProgress);
    window.addEventListener("focus", refreshFoundationProgress);
    window.addEventListener(
      SOUND_FITNESS_PROFILE_UPDATED_EVENT,
      refreshFoundationProgress,
    );

    return () => {
      window.removeEventListener("storage", refreshFoundationProgress);
      window.removeEventListener("focus", refreshFoundationProgress);
      window.removeEventListener(
        SOUND_FITNESS_PROFILE_UPDATED_EVENT,
        refreshFoundationProgress,
      );
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const closeOnExternalScroll = (event: Event) => {
      const details = dashboardStatusDetailsRef.current;
      if (!details?.open) return;

      const target = event.target;
      if (target instanceof Node && details.contains(target)) return;

      details.open = false;
    };

    window.addEventListener("scroll", closeOnExternalScroll, true);
    window.addEventListener("wheel", closeOnExternalScroll, {
      capture: true,
      passive: true,
    });
    window.addEventListener("touchmove", closeOnExternalScroll, {
      capture: true,
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", closeOnExternalScroll, true);
      window.removeEventListener("wheel", closeOnExternalScroll, true);
      window.removeEventListener("touchmove", closeOnExternalScroll, true);
    };
  }, []);

  useEffect(
    () => () => {
      stopDashboardMusic();
    },
    [],
  );

  useEffect(() => {
    let isActive = true;

    const syncDashboardData = async () => {
      const [statsResult, templatesResult] = await Promise.all([
        loadWorkoutLogEntriesWithFallback(),
        loadWorkoutTemplatesWithFallback(),
      ]);

      if (!isActive) return;

      setExerciseStats(statsResult.data);
      setSavedTemplates(templatesResult.data);
    };

    syncDashboardData();
    const unsubscribe = subscribeToLocalWorkoutData(() => {
      void syncDashboardData();
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  async function refreshHybridDashboardData() {
    const [statsResult, templatesResult] = await Promise.all([
      loadWorkoutLogEntriesWithFallback(),
      loadWorkoutTemplatesWithFallback(),
    ]);

    setExerciseStats(statsResult.data);
    setSavedTemplates(templatesResult.data);
    return { statsResult, templatesResult };
  }

  async function syncLocalWorkoutData() {
    if (!canSyncWorkoutData || isSyncingWorkoutData) return;

    setIsSyncingWorkoutData(true);
    setSyncStatusMessage("Syncing local workout data...");

    try {
      const [templatesResult, logsResult] = await Promise.all([
        syncLocalWorkoutTemplatesToSupabase(),
        syncLocalWorkoutLogsToSupabase(),
      ]);

      await refreshHybridDashboardData();

      const templateSummary = templatesResult.data;
      const logSummary = logsResult.data;
      const syncedCount =
        templateSummary.syncedItems + logSummary.syncedItems;
      const skippedCount =
        templateSummary.skippedItems + logSummary.skippedItems;
      const failedCount =
        templateSummary.failedItems + logSummary.failedItems;
      const localCount =
        templateSummary.localItems + logSummary.localItems;

      if (!templatesResult.success || !logsResult.success) {
        setSyncStatusMessage(
          `Sync hit a snag, but your local data is still safe. Synced ${syncedCount}, skipped ${skippedCount} duplicate${
            skippedCount === 1 ? "" : "s"
          }, failed ${failedCount}. ${
            templatesResult.error ||
            logsResult.error ||
            "Some data could not sync."
          }`,
        );
      } else if (localCount === 0) {
        setSyncStatusMessage(
          "Nothing local to sync yet. New workout data will still save locally and sync when available.",
        );
      } else {
        setSyncStatusMessage(
          `Account backup complete: ${templateSummary.syncedItems} template${
            templateSummary.syncedItems === 1 ? "" : "s"
          } synced, ${logSummary.syncedItems} workout log ${
            logSummary.syncedItems === 1 ? "entry" : "entries"
          } synced, and ${skippedCount} duplicate${
            skippedCount === 1 ? "" : "s"
          } skipped.`,
        );
      }

      if (failedCount === 0) {
        const syncedAt = new Date().toISOString();

        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            WORKOUT_SYNC_LAST_SYNCED_KEY,
            syncedAt,
          );
        }

        setLastSyncedAt(syncedAt);
      }
    } catch {
      setSyncStatusMessage(
        "Local workout data could not sync right now. Your local fallback is still safe.",
      );
    } finally {
      setIsSyncingWorkoutData(false);
    }
  }

  const dashboardSummary = useMemo(() => {
    const sortedStats = [...exerciseStats].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const latest = sortedStats[0];
    const totalSets = exerciseStats.reduce(
      (sum, stat) => sum + toLoggedNumber(stat.sets),
      0,
    );
    const totalVolume = exerciseStats.reduce(
      (sum, stat) =>
        sum +
        toLoggedNumber(stat.weight) *
          toLoggedNumber(stat.reps) *
          toLoggedNumber(stat.sets),
      0,
    );
    const workoutSessionEntries = exerciseStats.filter(
      (stat) => stat.source === "workout-session",
    );
    const latestWorkoutSessionTimestamp =
      workoutSessionEntries.reduce<number | null>((latestTimestamp, entry) => {
        const timestamp = new Date(entry.date).getTime();
        if (!Number.isFinite(timestamp)) return latestTimestamp;
        return latestTimestamp === null
          ? timestamp
          : Math.max(latestTimestamp, timestamp);
      }, null);
    const uniqueExercises = new Set(
      exerciseStats.map((stat) => stat.exerciseName).filter(Boolean),
    );
    const todayDateKey = getDashboardLocalDateKey(dashboardToday);
    const todayExerciseStats = [...exerciseStats]
      .filter((stat) => getDashboardEntryDateKey(stat.date) === todayDateKey)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const bestExerciseStats = new Map<
      string,
      { score: number; timestamp: number }
    >();
    const compoundLiftStats = new Map<
      string,
      {
        entries: {
          estimatedMax: number;
          score: number;
          sets: number;
          timestamp: number;
          volume: number;
          weight: number;
        }[];
        name: string;
      }
    >();

    exerciseStats.forEach((stat) => {
      const exerciseName = stat.exerciseName?.trim();
      const timestamp = new Date(stat.date).getTime();
      if (!exerciseName || !Number.isFinite(timestamp)) return;

      const weight = toLoggedNumber(stat.weight);
      const reps = toLoggedNumber(stat.reps);
      const sets = Math.max(1, toLoggedNumber(stat.sets));
      const score = Math.max(weight * reps * sets, weight, reps * sets);
      if (score <= 0) return;

      const currentBest = bestExerciseStats.get(exerciseName);
      if (!currentBest || score > currentBest.score) {
        bestExerciseStats.set(exerciseName, { score, timestamp });
      }

      const compoundSignature = [
        exerciseName,
        stat.pattern,
        stat.coreMovementPattern,
        stat.semanticVariationName,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      const isCompoundLift = DASHBOARD_COMPOUND_LIFT_PATTERNS.some((pattern) =>
        compoundSignature.includes(pattern),
      );

      if (!isCompoundLift) return;

      const estimatedMax =
        weight > 0 ? weight * (1 + Math.min(Math.max(reps, 1), 30) / 30) : score;
      const compoundLiftKey = exerciseName.toLowerCase();
      const compoundLift = compoundLiftStats.get(compoundLiftKey) || {
        entries: [],
        name: exerciseName,
      };

      compoundLift.entries.push({
        estimatedMax,
        score,
        sets,
        timestamp,
        volume: score,
        weight,
      });
      compoundLiftStats.set(compoundLiftKey, compoundLift);
    });

    const recentPrCount = Array.from(bestExerciseStats.values()).filter(
      (bestStat) => bestStat.timestamp >= thirtyDaysAgo,
    ).length;
    const prTarget = Math.max(3, Math.min(8, Math.ceil(uniqueExercises.size / 2)));
    const prProgress = clampDashboardPercent((recentPrCount / prTarget) * 100);
    const compoundLiftSummaries: {
      bestScore: number;
      bestWeight: number;
      bestThirtyDayTimestamp: number | null;
      bestThirtyDayWeight: number;
      improvementPercent: number;
      improvementScore: number;
      latestEstimatedMax: number;
      name: string;
      thirtyDaySets: number;
      thirtyDayVolume: number;
    }[] = [];

    compoundLiftStats.forEach((compoundLift) => {
      const sortedEntries = [...compoundLift.entries].sort(
        (a, b) => a.timestamp - b.timestamp,
      );
      const firstEntry = sortedEntries[0];
      if (!firstEntry) return;

      const latestEntry = sortedEntries[sortedEntries.length - 1] || firstEntry;
      const bestEntry = sortedEntries.reduce(
        (best, entry) =>
          entry.estimatedMax > best.estimatedMax ||
          (entry.estimatedMax === best.estimatedMax && entry.weight > best.weight)
            ? entry
            : best,
        firstEntry,
      );
      const bestThirtyDayEntry = sortedEntries
        .filter((entry) => entry.timestamp >= thirtyDaysAgo)
        .reduce<(typeof sortedEntries)[number] | null>(
          (best, entry) =>
            !best ||
            entry.estimatedMax > best.estimatedMax ||
            (entry.estimatedMax === best.estimatedMax && entry.weight > best.weight)
              ? entry
              : best,
          null,
        );
      const thirtyDayEntries = sortedEntries.filter(
        (entry) => entry.timestamp >= thirtyDaysAgo,
      );
      const thirtyDaySets = thirtyDayEntries.reduce(
        (sum, entry) => sum + entry.sets,
        0,
      );
      const thirtyDayVolume = thirtyDayEntries.reduce(
        (sum, entry) => sum + entry.volume,
        0,
      );
      const improvementScore = latestEntry.estimatedMax - firstEntry.estimatedMax;
      const improvementPercent =
        firstEntry.estimatedMax > 0
          ? (improvementScore / firstEntry.estimatedMax) * 100
          : latestEntry.estimatedMax > 0
            ? 100
            : 0;

      compoundLiftSummaries.push({
        bestScore: bestEntry.score,
        bestWeight: bestEntry.weight,
        bestThirtyDayTimestamp: bestThirtyDayEntry?.timestamp ?? null,
        bestThirtyDayWeight: bestThirtyDayEntry?.weight ?? 0,
        improvementPercent,
        improvementScore,
        latestEstimatedMax: latestEntry.estimatedMax,
        name: compoundLift.name,
        thirtyDaySets,
        thirtyDayVolume,
      });
    });

    const totalCompoundThirtyDayVolume = compoundLiftSummaries.reduce(
      (sum, summary) => sum + summary.thirtyDayVolume,
      0,
    );

    const selectedCompoundLiftNames = new Set<string>();
    const pickCompoundLift = (
      summaries: typeof compoundLiftSummaries,
    ) => {
      const selected =
        summaries.find((summary) => !selectedCompoundLiftNames.has(summary.name)) ||
        null;
      if (selected) selectedCompoundLiftNames.add(selected.name);
      return selected;
    };
    const heaviestCompoundLift = pickCompoundLift(
      [...compoundLiftSummaries].sort(
        (a, b) => b.bestWeight - a.bestWeight || b.bestScore - a.bestScore,
      ),
    );
    const mostImprovedCompoundLift = pickCompoundLift(
      [...compoundLiftSummaries].sort(
        (a, b) =>
          b.improvementPercent - a.improvementPercent ||
          b.improvementScore - a.improvementScore,
      ),
    );
    const needsImprovementCompoundLift = pickCompoundLift(
      [...compoundLiftSummaries].sort(
        (a, b) =>
          a.thirtyDayVolume - b.thirtyDayVolume ||
          a.thirtyDaySets - b.thirtyDaySets ||
          a.improvementPercent - b.improvementPercent,
      ),
    );
    const formatCompoundLiftLoad = (
      summary: (typeof compoundLiftSummaries)[number] | null,
    ) => {
      if (!summary) return "--";
      const load = summary.bestWeight > 0 ? summary.bestWeight : summary.bestScore;
      return load > 0 ? `${Math.round(load).toLocaleString()} lb` : "--";
    };
    const formatCompoundLiftChange = (
      summary: (typeof compoundLiftSummaries)[number] | null,
    ) => {
      if (!summary) return "--";
      const roundedChange = Math.round(summary.improvementPercent);
      return `${roundedChange >= 0 ? "+" : ""}${roundedChange}%`;
    };
    const formatCompoundLiftThirtyDayWeight = (
      summary: (typeof compoundLiftSummaries)[number] | null,
    ) =>
      summary && summary.bestThirtyDayWeight > 0
        ? `${Math.round(summary.bestThirtyDayWeight).toLocaleString()} lb`
        : "-- lb";
    const formatCompoundLiftThirtyDayDate = (
      summary: (typeof compoundLiftSummaries)[number] | null,
    ) =>
      summary?.bestThirtyDayTimestamp
        ? new Intl.DateTimeFormat("en-US", {
            day: "numeric",
            month: "short",
          }).format(new Date(summary.bestThirtyDayTimestamp))
        : "-- date";
    const formatCompoundLiftRelativeVolume = (
      summary: (typeof compoundLiftSummaries)[number] | null,
    ) =>
      summary && totalCompoundThirtyDayVolume > 0
        ? `${Math.round(
            (summary.thirtyDayVolume / totalCompoundThirtyDayVolume) * 100,
          )}%`
        : "--%";
    const formatCompoundLiftSets = (
      summary: (typeof compoundLiftSummaries)[number] | null,
    ) =>
      summary ? Math.round(summary.thirtyDaySets).toLocaleString() : "0";
    const compoundLiftHighlights = [
      {
        dateLabel: formatCompoundLiftThirtyDayDate(heaviestCompoundLift),
        detail: "Heaviest Lift",
        label: heaviestCompoundLift?.name || "Log heavy lift",
        rank: 1,
        setsLabel: formatCompoundLiftSets(heaviestCompoundLift),
        tone: "heavy",
        value: formatCompoundLiftLoad(heaviestCompoundLift),
        volumeLabel: formatCompoundLiftRelativeVolume(heaviestCompoundLift),
        weightLabel: formatCompoundLiftThirtyDayWeight(heaviestCompoundLift),
        windowLabel: "30 day best",
      },
      {
        dateLabel: formatCompoundLiftThirtyDayDate(mostImprovedCompoundLift),
        detail: "Most Improved",
        label: mostImprovedCompoundLift?.name || "Build trend",
        rank: 2,
        setsLabel: formatCompoundLiftSets(mostImprovedCompoundLift),
        tone: "improved",
        value: formatCompoundLiftChange(mostImprovedCompoundLift),
        volumeLabel: formatCompoundLiftRelativeVolume(mostImprovedCompoundLift),
        weightLabel: formatCompoundLiftThirtyDayWeight(mostImprovedCompoundLift),
        windowLabel: "30 day best",
      },
      {
        dateLabel: formatCompoundLiftThirtyDayDate(needsImprovementCompoundLift),
        detail: "Needs Work",
        label: needsImprovementCompoundLift?.name || "Add compound",
        rank: 3,
        setsLabel: formatCompoundLiftSets(needsImprovementCompoundLift),
        tone: "needs",
        value: formatCompoundLiftChange(needsImprovementCompoundLift),
        volumeLabel: formatCompoundLiftRelativeVolume(
          needsImprovementCompoundLift,
        ),
        weightLabel: formatCompoundLiftThirtyDayWeight(
          needsImprovementCompoundLift,
        ),
        windowLabel: "30 day best",
      },
    ];
    const workoutDates = groupWorkoutDates(exerciseStats);
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weeklyExerciseStats = exerciseStats.filter((stat) => {
      const timestamp = new Date(stat.date).getTime();
      return Number.isFinite(timestamp) && timestamp >= sevenDaysAgo;
    });
    const workoutsThisWeek = workoutDates.filter((date) => {
      const timestamp = new Date(date).getTime();
      return Number.isFinite(timestamp) && timestamp >= sevenDaysAgo;
    }).length;
    const planSessionsAttended = Math.min(
      DASHBOARD_PLAN_SESSION_TARGET,
      workoutDates.length,
    );
    const planSessionProgress = clampDashboardPercent(
      (planSessionsAttended / DASHBOARD_PLAN_SESSION_TARGET) * 100,
    );
    const weeklySessionGoal = DASHBOARD_WEEKLY_SESSION_GOAL;
    const weeklySessionProgress = clampDashboardPercent(
      (workoutsThisWeek / weeklySessionGoal) * 100,
    );
    const weeklySetGoal = Math.max(12, weeklySessionGoal * 4);
    const weeklySets = weeklyExerciseStats.reduce(
      (sum, stat) => sum + toLoggedNumber(stat.sets),
      0,
    );
    const weeklySetProgress = clampDashboardPercent(
      (weeklySets / weeklySetGoal) * 100,
    );
    const weeklyVolume = weeklyExerciseStats.reduce(
      (sum, stat) =>
        sum +
        toLoggedNumber(stat.weight) *
          toLoggedNumber(stat.reps) *
          toLoggedNumber(stat.sets),
      0,
    );
    const dashboardProfile = readDashboardLocalRecord(
      SOUND_FITNESS_PROFILE_STORAGE_KEY,
    );
    const dashboardGoals = readDashboardLocalRecord(DASHBOARD_GOALS_STORAGE_KEY);
    const dashboardMeasurements = asRecord(dashboardProfile.measurements);
    const dashboardNutritionDirection = asRecord(
      dashboardProfile.nutritionDirection,
    );
    const dashboardBodyStatus = asRecord(dashboardProfile.bodyStatus);
    const currentBodyWeight = readDashboardNumber(
      dashboardProfile.currentWeight,
      dashboardMeasurements.weight,
      dashboardGoals.currentWeight,
    );
    const dailyCalorieGoal = readDashboardNumber(
      dashboardProfile.calorieGoalKnown,
      dashboardGoals.targetCalories,
      dashboardGoals.calorieGoal,
      dashboardGoals.dailyCalories,
      dashboardNutritionDirection.calorieTarget,
    );
    const estimatedDailyCalories =
      dailyCalorieGoal || Math.round((currentBodyWeight || 180) * 14);
    const weeklyCalories = estimatedDailyCalories * 7;
    const weeklyCaloriesGoal = weeklyCalories;
    const weeklyCaloriesProgress = dailyCalorieGoal
      ? 100
      : exerciseStats.length
        ? 72
        : 42;
    const bodyMetricSources = [
      ...(Array.isArray(dashboardProfile.bodyMetricHistory)
        ? dashboardProfile.bodyMetricHistory
        : []),
      ...(Array.isArray(dashboardProfile.bodyScanImports)
        ? dashboardProfile.bodyScanImports
        : []),
    ];
    const bodyWeightHistory = bodyMetricSources
      .map((item) => {
        const record = asRecord(item);
        const savedAt = readDashboardText(
          record.savedAt,
          record.date,
          record.scanDate,
          record.importedAt,
        );
        const timestamp = savedAt ? new Date(savedAt).getTime() : NaN;
        const weight = readDashboardNumber(record.weight);

        return Number.isFinite(timestamp) && weight > 0
          ? { timestamp, weight }
          : null;
      })
      .filter((item): item is { timestamp: number; weight: number } =>
        Boolean(item),
      );

    if (currentBodyWeight > 0) {
      bodyWeightHistory.push({
        timestamp: Date.now(),
        weight: currentBodyWeight,
      });
    }

    bodyWeightHistory.sort((a, b) => a.timestamp - b.timestamp);

    const latestBodyWeight = bodyWeightHistory[bodyWeightHistory.length - 1];
    const previousBodyWeight =
      bodyWeightHistory.length > 1
        ? bodyWeightHistory[bodyWeightHistory.length - 2]
        : null;
    const weightChange =
      latestBodyWeight && previousBodyWeight
        ? latestBodyWeight.weight - previousBodyWeight.weight
        : 0;
    const weightChangeTone =
      weightChange > 0.05 ? "up" : weightChange < -0.05 ? "down" : "flat";
    const weightTrendText = readDashboardText(dashboardBodyStatus.weightTrend);
    const weightChangeTrendLabel =
      weightTrendText && weightTrendText !== "Not Sure"
        ? weightTrendText
        : previousBodyWeight
          ? "Latest check-in"
          : "Add weigh-in";
    const weightChangeProgress = Math.max(
      6,
      clampDashboardPercent((Math.min(Math.abs(weightChange), 5) / 5) * 100),
    );
    const dailySetGoal = Math.max(
      12,
      Math.ceil(weeklySetGoal / Math.max(1, weeklySessionGoal)),
    );
    const getDailySetGroup = (stat: LocalExerciseStatEntry) => {
      const signature = [
        stat.exerciseName,
        stat.body,
        stat.pattern,
        stat.coreMovementPattern,
        stat.semanticVariationName,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      const isCompound = DASHBOARD_COMPOUND_LIFT_PATTERNS.some((pattern) =>
        signature.includes(pattern),
      );
      const isLowerBody = [
        "squat",
        "deadlift",
        "lunge",
        "leg",
        "hip",
        "glute",
        "hamstring",
        "quad",
        "calf",
      ].some((term) => signature.includes(term));
      const isUpperBody = [
        "bench",
        "press",
        "row",
        "pull",
        "chin",
        "dip",
        "shoulder",
        "chest",
        "back",
      ].some((term) => signature.includes(term));

      if (isCompound && isLowerBody) return "lower-compound";
      if (isCompound && isUpperBody) return "upper-compound";
      if (isCompound) return "compound";
      return "accessory";
    };
    const dailySetGroupLabels: Record<string, string> = {
      accessory: "Accessory",
      compound: "Compound",
      "lower-compound": "Lower compound",
      "upper-compound": "Upper compound",
    };
    const dailySetEntries = todayExerciseStats.flatMap((stat) => {
      const setCount = Math.max(0, Math.round(toLoggedNumber(stat.sets)));
      const group = getDailySetGroup(stat);

      return Array.from({ length: setCount }, (_, setIndex) => ({
        group,
        id: `${stat.exerciseId || stat.exerciseName}-${stat.date}-${setIndex}`,
      }));
    });
    const dailySetFocusGroup = dailySetEntries[0]?.group || "lower-compound";
    const dailySetGroupCounts = dailySetEntries.reduce<Record<string, number>>(
      (counts, setEntry) => ({
        ...counts,
        [setEntry.group]: (counts[setEntry.group] || 0) + 1,
      }),
      {},
    );
    const dailySetGroupSummary = Object.entries(dailySetGroupCounts)
      .filter(([, count]) => count > 0)
      .map(
        ([group, count]) =>
          `${count} ${dailySetGroupLabels[group] || "Other"}`,
      )
      .join(", ");
    const dailySetTallyMarks = Array.from(
      { length: dailySetGoal },
      (_, markIndex) => {
        const setEntry = dailySetEntries[markIndex];

        return {
          filled: Boolean(setEntry),
          group: setEntry?.group || dailySetFocusGroup,
          id: setEntry?.id || `empty-${markIndex}`,
        };
      },
    );
    const dailySets = dailySetEntries.length;
    const latestTemplate = [...savedTemplates].sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime(),
    )[0];

    return {
      totalLoggedEntries: exerciseStats.length,
      workoutSessionEntries: workoutSessionEntries.length,
      completedWorkouts: workoutDates.length,
      compoundLiftHighlights,
      planSessionsAttended,
      planSessionProgress,
      planSessionTarget: DASHBOARD_PLAN_SESSION_TARGET,
      prProgress,
      prTarget,
      recentPrCount,
      workoutsThisWeek,
      weeklySessionGoal,
      weeklySessionProgress,
      weeklyCalories,
      weeklyCaloriesDisplay: formatDashboardCompactCalories(weeklyCalories),
      weeklyCaloriesGoal,
      weeklyCaloriesProgress,
      dailySetGoal,
      dailySetGroupSummary:
        dailySetGroupSummary ||
        `${dailySetGroupLabels[dailySetFocusGroup]} day, no sets logged yet`,
      dailySets,
      dailySetTallyMarks,
      weightChange,
      weightChangeLabel: `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(
        1,
      )}`,
      weightChangeProgress,
      weightChangeTone,
      weightChangeTrendLabel,
      weeklySetGoal,
      weeklySetProgress,
      totalSets,
      totalVolume,
      weeklySets,
      weeklyVolume,
      uniqueExerciseCount: uniqueExercises.size,
      latestExercise: latest?.exerciseName || "No exercise logged yet",
      mostRecentDate: formatDashboardDate(latest?.date),
      hasStats: exerciseStats.length > 0,
      latestEntries: sortedStats.slice(0, 3),
      latestWorkoutSessionTimestamp,
      latestTemplate,
      templateCount: savedTemplates.length,
    };
  }, [dashboardToday, exerciseStats, savedTemplates]);

  const nextAction = activeSessionTemplate
    ? {
        eyebrow: "Resume active session",
        title: activeSessionTemplate.title,
        detail: `${activeSessionTemplate.exercises.length} exercises started ${formatCompactDateTime(
          activeSessionTemplate.startedAt,
        )}`,
        href: ROUTES.dashboard.sessionWorkout,
        cta: "Resume Workout",
      }
    : dashboardSummary.latestTemplate
      ? {
          eyebrow: "Next best action",
          title: `Start ${dashboardSummary.latestTemplate.title}`,
          detail: `${dashboardSummary.latestTemplate.exercises.length} saved exercises ready from your templates.`,
          href: buildTemplateWorkoutHref(dashboardSummary.latestTemplate.id),
          cta: "Start Template",
        }
      : {
          eyebrow: "Next best action",
          title: "Start your first logged workout",
          detail:
            "Open the session hub or workout logger to create your first saved training entry.",
          href: ROUTES.dashboard.sessions,
          cta: "Open Sessions",
        };
  const dashboardWeeklySessionResetDate =
    getDashboardWeekResetDate(dashboardToday);
  const dashboardWeeklySessionResetLabel = formatHeaderMeterDeadline(
    dashboardWeeklySessionResetDate,
  );
  const dashboardWeeklySessionResetFullLabel = formatHeaderMeterFullDateTime(
    dashboardWeeklySessionResetDate,
  );
  const dashboardPlanSessionsAttended = dashboardSummary.planSessionsAttended;
  const dashboardPlanSessionsRemaining = Math.max(
    0,
    dashboardSummary.planSessionTarget - dashboardPlanSessionsAttended,
  );
  const dashboardPlanSessionCadenceMs =
    (7 / Math.max(1, dashboardSummary.weeklySessionGoal)) *
    24 *
    60 *
    60 *
    1000;
  const dashboardNextPlannedSessionDate =
    dashboardSummary.latestWorkoutSessionTimestamp === null
      ? dashboardToday
      : new Date(
          dashboardSummary.latestWorkoutSessionTimestamp +
            dashboardPlanSessionCadenceMs,
        );

  while (
    !activeSessionTemplate &&
    dashboardNextPlannedSessionDate.getTime() < dashboardToday.getTime()
  ) {
    dashboardNextPlannedSessionDate.setTime(
      dashboardNextPlannedSessionDate.getTime() + dashboardPlanSessionCadenceMs,
    );
  }

  const dashboardNextPlannedSessionLabel = activeSessionTemplate
    ? "Now"
    : formatHeaderMeterDeadline(dashboardNextPlannedSessionDate);
  const dashboardNextPlannedSessionFullLabel = activeSessionTemplate
    ? "a planned session is live now"
    : formatHeaderMeterFullDateTime(dashboardNextPlannedSessionDate);
  const dashboardPlanAttendanceCaption =
    dashboardPlanSessionsRemaining <= 0
      ? "Plan complete"
      : `Next ${dashboardNextPlannedSessionLabel}`;
  const dashboardPlanAttendanceDescription = `${dashboardPlanSessionsAttended} of ${dashboardSummary.planSessionTarget} plan sessions attended. Next planned session ${dashboardNextPlannedSessionFullLabel}`;

  const planHighlights = [
    {
      label: "Current week",
      value:
        dashboardSummary.latestTemplate?.title ||
        "Build or choose a saved template",
    },
    {
      label: "Training target",
      value:
        dashboardSummary.workoutsThisWeek > 0
          ? `${dashboardSummary.workoutsThisWeek} workout${
              dashboardSummary.workoutsThisWeek === 1 ? "" : "s"
            } logged this week`
          : "Start with one complete session",
    },
    {
      label: "Next planning step",
      value:
        dashboardSummary.templateCount > 0
          ? "Assign templates to your weekly plan"
          : "Create a reusable workout template",
    },
  ];

  const dashboardCharts = useMemo(() => {
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const chartSevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const trainingVolume = labels.map((label, index) => {
      const value = exerciseStats
        .filter((entry) => {
          const date = new Date(entry.date);
          const timestamp = date.getTime();
          if (Number.isNaN(timestamp) || timestamp < chartSevenDaysAgo) {
            return false;
          }
          const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
          return dayIndex === index;
        })
        .reduce(
          (sum, entry) =>
            sum +
            toLoggedNumber(entry.weight) *
              toLoggedNumber(entry.reps) *
              toLoggedNumber(entry.sets),
          0,
        );

      return {
        label,
        value: value > 0 ? Math.round(value / 100) : 0,
        target: 18,
      };
    });

    const weeklyGoal = Math.max(12, (dashboardSummary.templateCount || 1) * 12);
    const goalProgressPercent = Math.min(
      (dashboardSummary.totalSets / weeklyGoal) * 100,
      100,
    );

    return {
      trainingVolume,
      goalProgressPercent,
      nutritionConsistency: [
        { label: "Protein", value: dashboardSummary.hasStats ? 74 : 42, target: 100 },
        { label: "Hydration", value: dashboardSummary.hasStats ? 68 : 40, target: 100 },
        { label: "Meals", value: dashboardSummary.hasStats ? 81 : 35, target: 100 },
      ],
      recoveryTrend: [
        { label: "Mon", value: 72 },
        { label: "Tue", value: dashboardSummary.workoutsThisWeek > 2 ? 64 : 78 },
        { label: "Wed", value: 76 },
        { label: "Thu", value: 70 },
        { label: "Fri", value: dashboardSummary.totalSets > 30 ? 62 : 82 },
        { label: "Sat", value: 84 },
        { label: "Sun", value: 79 },
      ],
    };
  }, [dashboardSummary, exerciseStats]);

  const dashboardTabCompletions = useMemo(() => {
    const nutritionAverage =
      dashboardCharts.nutritionConsistency.reduce(
        (sum, item) => sum + item.value,
        0,
      ) / dashboardCharts.nutritionConsistency.length;
    const recoveryAverage =
      dashboardCharts.recoveryTrend.reduce((sum, item) => sum + item.value, 0) /
      dashboardCharts.recoveryTrend.length;
    const workoutCompletion = clampDashboardPercent(
      Math.max(
        activeSessionTemplate ? 68 : 0,
        dashboardSummary.workoutsThisWeek * 20,
        dashboardSummary.templateCount * 16,
        dashboardSummary.completedWorkouts * 9,
      ),
    );
    const performanceCompletion = clampDashboardPercent(
      dashboardSummary.hasStats
        ? Math.min(
            92,
            34 +
              dashboardSummary.uniqueExerciseCount * 6 +
              dashboardSummary.workoutsThisWeek * 7,
          )
        : 12,
    );
    const statsCompletion = clampDashboardPercent(
      Math.max(
        dashboardSummary.totalLoggedEntries * 7,
        dashboardSummary.hasStats ? 46 : 10,
      ),
    );

    return {
      dashboard: 100,
      education: 18,
      goals: dashboardFoundationProgress.goalsCompletion,
      nutrition: nutritionAverage,
      performance: performanceCompletion,
      profile: dashboardFoundationProgress.profileCompletion,
      recovery: recoveryAverage,
      soundWorld: 8,
      stats: statsCompletion,
      workout: workoutCompletion,
    };
  }, [
    activeSessionTemplate,
    dashboardCharts,
    dashboardFoundationProgress.goalsCompletion,
    dashboardFoundationProgress.profileCompletion,
    dashboardSummary,
  ]);
  const getDashboardJourneyStepCompletion = (step: DashboardJourneyStep) => {
    if (typeof step.completion === "number") {
      return clampDashboardPercent(step.completion);
    }

    if (step.href === ROUTES.dashboard.sessions) {
      return dashboardTabCompletions.workout;
    }

    if (step.href === ROUTES.dashboard.myPlan) {
      return clampDashboardPercent(
        Math.max(28, dashboardSummary.templateCount * 18),
      );
    }

    if (step.href === ROUTES.workoutBuilder.home) {
      return clampDashboardPercent(
        Math.max(36, dashboardSummary.templateCount * 20),
      );
    }

    if (step.href === ROUTES.workoutBuilder.exerciseLibrary) {
      return clampDashboardPercent(
        Math.max(30, favoriteExerciseCards.length * 16),
      );
    }

    if (step.state === "complete") return 100;
    if (step.state === "active") return 62;
    if (step.state === "default") return 28;

    return 0;
  };
  const getDashboardNavigationCardCompletion = (
    card: DashboardNavigationCard,
  ) => {
    if (card.title === "Workout / Sessions") return dashboardTabCompletions.workout;
    if (card.title === "Nutrition / Fuel") return dashboardTabCompletions.nutrition;
    if (card.title === "Recovery") return dashboardTabCompletions.recovery;
    if (card.title === "Goals") return dashboardTabCompletions.goals;
    if (card.title === "Performance") return dashboardTabCompletions.performance;
    if (card.title === "Education") return dashboardTabCompletions.education;
    if (card.title === "Sound World") return dashboardTabCompletions.soundWorld;
    if (card.title === "Stats") return dashboardTabCompletions.stats;
    if (card.title === "Achievements") return 72;
    if (card.title === "Insights") return dashboardSummary.hasStats ? 48 : 12;
    if (card.title === "Calendar") {
      return clampDashboardPercent(dashboardSummary.workoutsThisWeek * 20);
    }
    if (card.title === "Appointments") return 25;
    if (card.title === "Messages") return 35;
    if (card.title === "Packages") return 42;

    return 20;
  };

  const dashboardCalendarItems = useMemo<DashboardCalendarItem[]>(() => {
    const templateTitle =
      dashboardSummary.latestTemplate?.title || "Build first workout";

    return [
      {
        dateLabel: "Mon",
        title:
          dashboardSummary.workoutsThisWeek > 0
            ? "Completed session"
            : "Plan first session",
        type: dashboardSummary.workoutsThisWeek > 0 ? "completed" : "training",
        status: dashboardSummary.workoutsThisWeek > 0 ? "Done" : "Start",
      },
      {
        dateLabel: "Tue",
        title: "Hydration check",
        type: "nutrition",
        status: "Fuel",
      },
      {
        dateLabel: "Wed",
        title: templateTitle,
        type: "training",
        status: "Planned",
      },
      {
        dateLabel: "Thu",
        title: "Mobility reset",
        type: "recovery",
        status: "Recovery",
      },
      {
        dateLabel: "Fri",
        title: dashboardSummary.latestExercise,
        type: dashboardSummary.hasStats ? "completed" : "training",
        status: dashboardSummary.hasStats ? "Recent" : "Suggested",
      },
      {
        dateLabel: "Sat",
        title: "Nutrition prep",
        type: "nutrition",
        status: "Plan",
      },
      {
        dateLabel: "Sun",
        title: "Reflection",
        type: "recovery",
        status: "Review",
      },
    ];
  }, [dashboardSummary]);

  const masterJourneyCurrentFocus = activeSessionTemplate
    ? "Session Execution"
    : dashboardSummary.workoutsThisWeek > 0
      ? "Progress Tracking"
      : dashboardSummary.templateCount > 0
        ? "Program Planning"
        : "Workout Builder";
  const masterJourneyNodes: MasterJourneyNode[] = [
    {
      href: ROUTES.dashboard.profile,
      icon: "🧭",
      label: "Foundation",
      metric: "100% base",
      state: "complete",
    },
    {
      href: ROUTES.dashboard.goals,
      icon: "🎯",
      label: "Goals",
      metric: "Direction XP",
      state: "complete",
    },
    {
      href: ROUTES.workoutBuilder.home,
      icon: "🏋️",
      label: "Workout Builder",
      metric: `${dashboardSummary.templateCount} saved`,
      state:
        masterJourneyCurrentFocus === "Workout Builder"
          ? "active"
          : dashboardSummary.templateCount > 0
            ? "complete"
            : "default",
    },
    {
      href: ROUTES.dashboard.myPlan,
      icon: "📅",
      label: "Program Planning",
      metric: "Weekly map",
      state: masterJourneyCurrentFocus === "Program Planning" ? "active" : "default",
    },
    {
      href: ROUTES.dashboard.sessions,
      icon: "✅",
      label: "Session Execution",
      metric: `${dashboardSummary.workoutsThisWeek} this wk`,
      state:
        masterJourneyCurrentFocus === "Session Execution"
          ? "active"
          : dashboardSummary.workoutsThisWeek > 0
            ? "complete"
            : "default",
    },
    {
      href: ROUTES.dashboard.recovery,
      icon: "💧",
      label: "Recovery",
      metric: "72% ready",
      state: "default",
    },
    {
      href: ROUTES.nutritionPortal.home,
      icon: "🍽️",
      label: "Nutrition",
      metric: "Fuel XP",
      state: "default",
    },
    {
      href: ROUTES.dashboard.stats,
      icon: "📈",
      label: "Progress Tracking",
      metric: `${dashboardSummary.totalLoggedEntries} logs`,
      state:
        masterJourneyCurrentFocus === "Progress Tracking"
          ? "active"
          : dashboardSummary.hasStats
            ? "complete"
            : "default",
    },
    {
      href: ROUTES.dashboard.performance,
      icon: "⚡",
      label: "Performance",
      metric: "Power XP",
      state: "default",
    },
    {
      href: ROUTES.dashboard.insights,
      icon: "🧠",
      label: "Insights",
      metric: "Unlocking",
      state: "locked",
    },
    {
      href: ROUTES.dashboard.achievements,
      icon: "🏆",
      label: "Achievement System",
      metric: "0 pts",
      state: "locked",
    },
    {
      href: ROUTES.soundworld.home,
      icon: "🌎",
      label: "Sound World",
      metric: "Community",
      state: "locked",
    },
  ];
  const masterJourneyProgress = Math.round(
    ((masterJourneyNodes.filter((node) => node.state === "complete").length +
      masterJourneyNodes.filter((node) => node.state === "active").length * 0.5) /
      masterJourneyNodes.length) *
      100,
  );
  const masterJourneyTimelineDateFormatter = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });
  const formatMasterJourneyTimelineDate = (dayOffset: number) =>
    masterJourneyTimelineDateFormatter.format(
      addDashboardDays(dashboardToday, dayOffset),
    );
  const dashboardMasterPlanTimeline: DashboardMasterPlanTimelineItem[] = ((): DashboardMasterPlanTimelineItem[] => {
    const trainingItems: DashboardMasterPlanTimelineItem[] = favoriteWorkoutTemplates
      .slice(0, 4)
      .map((template, index): DashboardMasterPlanTimelineItem => ({
        dateLabel: formatMasterJourneyTimelineDate(index * 2 + 2),
        detail: `${template.exercises.length} exercises / ${getWorkoutTemplateTag(
          template,
        )}`,
        href:
          activeSessionTemplate?.id === template.id
            ? ROUTES.dashboard.sessionWorkout
            : buildTemplateWorkoutHref(template.id),
        icon: "workout",
        metric: index === 0 ? "Primary" : "Queued",
        status: activeSessionTemplate?.id === template.id ? "Live" : "Planned",
        title: template.title,
        tone: (index === 0 ? "cyan" : "sky") as DashboardCardTone,
      }));

    if (activeSessionTemplate) {
      return [
        {
          dateLabel: "Now",
          detail: `${activeSessionTemplate.exercises.length} exercises in progress`,
          href: ROUTES.dashboard.sessionWorkout,
          icon: "workout",
          metric: "Live",
          status: "In progress",
          title: activeSessionTemplate.title,
          tone: "emerald" as DashboardCardTone,
        },
        ...trainingItems.filter((item) => item.title !== activeSessionTemplate.title),
        {
          dateLabel: formatMasterJourneyTimelineDate(6),
          detail:
            dashboardSummary.hasStats
              ? dashboardSummary.latestExercise
              : "Log the session output",
          href: ROUTES.dashboard.stats,
          icon: "stats",
          metric: `${dashboardSummary.totalLoggedEntries} logs`,
          status: "Checkpoint",
          title: "Progress check",
          tone: "amber" as DashboardCardTone,
        },
        {
          dateLabel: formatMasterJourneyTimelineDate(7),
          detail:
            dashboardSummary.totalSets > 30
              ? "Deload, mobility, and soreness notes"
              : "Mobility reset and readiness notes",
          href: ROUTES.dashboard.recovery,
          icon: "recovery",
          metric: "Recovery",
          status: "Support",
          title: "Readiness reset",
          tone: "violet" as DashboardCardTone,
        },
      ].slice(0, 7);
    }

    if (trainingItems.length) {
      return [
        {
          dateLabel: "Today",
          detail: nextAction.detail,
          href: nextAction.href,
          icon: "plan",
          metric: nextAction.cta,
          status: "Next",
          title: nextAction.title,
          tone: "cyan" as DashboardCardTone,
        },
        ...trainingItems,
        {
          dateLabel: formatMasterJourneyTimelineDate(7),
          detail: "Review volume, recovery, and fuel signals",
          href: ROUTES.dashboard.myPlan,
          icon: "calendar",
          metric: `${dashboardSummary.templateCount} templates`,
          status: "Review",
          title: "Weekly plan review",
          tone: "amber" as DashboardCardTone,
        },
      ].slice(0, 7);
    }

    return [
      {
        dateLabel: "Today",
        detail: "Choose focus, timeline, and coaching context",
        href: ROUTES.dashboard.goals,
        icon: "goals",
        metric: `${dashboardFoundationProgress.goalsCompletion}% goals`,
        status: "Set direction",
        title: "Define the goal",
        tone: "amber" as DashboardCardTone,
      },
      {
        dateLabel: formatMasterJourneyTimelineDate(1),
        detail: "Create the first reusable training template",
        href: ROUTES.workoutBuilder.home,
        icon: "builder",
        metric: "Builder",
        status: "Build",
        title: "Build first workout",
        tone: "cyan" as DashboardCardTone,
      },
      {
        dateLabel: formatMasterJourneyTimelineDate(2),
        detail: "Place the first workout into the weekly map",
        href: ROUTES.dashboard.myPlan,
        icon: "plan",
        metric: "Plan",
        status: "Schedule",
        title: "Make the plan",
        tone: "sky" as DashboardCardTone,
      },
      {
        dateLabel: formatMasterJourneyTimelineDate(3),
        detail: "Run the first session and save training data",
        href: ROUTES.dashboard.sessions,
        icon: "workout",
        metric: "Session",
        status: "Train",
        title: "Start session",
        tone: "emerald" as DashboardCardTone,
      },
      {
        dateLabel: formatMasterJourneyTimelineDate(4),
        detail: "Submit a clip for technique feedback",
        href: ROUTES.dashboard.videoReview,
        icon: "form",
        metric: "Form check",
        status: "Coach",
        title: "Video review",
        tone: "violet" as DashboardCardTone,
      },
    ];
  })();
  const soundPoints =
    1200 +
    dashboardSummary.completedWorkouts * 130 +
    dashboardSummary.totalLoggedEntries * 28 +
    dashboardSummary.totalSets * 5 +
    dashboardSummary.templateCount * 90;
  const soundFitnessLevelSize = 500;
  const soundFitnessLevel = Math.max(
    1,
    Math.floor(soundPoints / soundFitnessLevelSize) + 1,
  );
  const soundFitnessLevelProgress = clampDashboardPercent(
    ((soundPoints % soundFitnessLevelSize) / soundFitnessLevelSize) * 100,
  );
  const soundTokens =
    80 +
    dashboardSummary.completedWorkouts * 4 +
    dashboardSummary.templateCount * 6 +
    (dashboardSummary.hasStats ? 12 : 0);
  const soundEmeralds = Math.max(0, Math.floor(soundTokens / 25));
  const soundPointsIntoLevel = soundPoints % soundFitnessLevelSize;
  const soundPointsToNextLevel =
    soundFitnessLevelSize - soundPointsIntoLevel || soundFitnessLevelSize;
  const activeDashboardMusicStations = dashboardMusicStations.filter((station) =>
    dashboardMusicStationIds.includes(station.id),
  );
  const safeActiveDashboardMusicStations = activeDashboardMusicStations.length
    ? activeDashboardMusicStations
    : [dashboardMusicStationById.orbit];
  const activeDashboardMusicBlendLabel =
    safeActiveDashboardMusicStations.length === 1
      ? safeActiveDashboardMusicStations[0].label
      : `${safeActiveDashboardMusicStations.length}-Station DJ Sequence`;
  const activeDashboardMusicBlendShortLabel =
    safeActiveDashboardMusicStations.length === 1
      ? safeActiveDashboardMusicStations[0].shortLabel
      : "Seq";
  const activeDashboardMusicBlendHelper =
    safeActiveDashboardMusicStations.length === 1
      ? safeActiveDashboardMusicStations[0].helper
      : `${safeActiveDashboardMusicStations
          .map((station) => station.label)
          .join(", then ")} queued with smooth transition cues.`;
  const activeDashboardMusicBlendTempo =
    safeActiveDashboardMusicStations.length === 1
      ? safeActiveDashboardMusicStations[0].tempoLabel
      : "Sequence";
  const dashboardMusicVolumePercent = Math.round(dashboardMusicVolume * 100);
  const dashboardMusicVolumeLabel = dashboardMusicMuted
    ? "Muted"
    : `${dashboardMusicVolumePercent}%`;
  const activeDashboardMusicAutoplayOption =
    DASHBOARD_MUSIC_AUTOPLAY_OPTIONS.find(
      (option) => option.id === dashboardMusicAutoplayMode,
    ) || DASHBOARD_MUSIC_AUTOPLAY_OPTIONS[0];
  const safeDashboardMusicStationOrbitIndex =
    activeDashboardMusicStationIndex % dashboardMusicStations.length;
  const activeDashboardMusicMoodStation =
    dashboardMusicStations[safeDashboardMusicStationOrbitIndex] ||
    safeActiveDashboardMusicStations[0];
  const momentumEntryDateKeys = new Set<string>();
  const momentumInputTimestamps: number[] = [];
  exerciseStats.forEach((entry) => {
    const entryDateKey = getDashboardEntryDateKey(entry.date);
    if (entryDateKey) momentumEntryDateKeys.add(entryDateKey);
    const timestamp = new Date(entry.date).getTime();
    if (Number.isFinite(timestamp)) momentumInputTimestamps.push(timestamp);
  });
  manualStatsLogs.forEach((entry) => {
    const entryDateKey = getDashboardEntryDateKey(
      entry.loggedAt || entry.dateTime,
    );
    if (entryDateKey) momentumEntryDateKeys.add(entryDateKey);
    const timestamp = new Date(entry.loggedAt || entry.dateTime).getTime();
    if (Number.isFinite(timestamp)) momentumInputTimestamps.push(timestamp);
  });
  const dashboardTrainingDateKeys = new Set(
    groupWorkoutDates(exerciseStats)
      .map((date) => getDashboardEntryDateKey(date))
      .filter(Boolean),
  );
  const dashboardHasPlan =
    Boolean(activeSessionTemplate) || dashboardSummary.templateCount > 0;
  const dashboardStatDateKeys = Array.from(momentumEntryDateKeys).sort();
  const dashboardLatestStatDateKey =
    dashboardStatDateKeys[dashboardStatDateKeys.length - 1] || "";
  const dashboardDaysSinceLastStat = dashboardLatestStatDateKey
    ? Math.floor(
        (new Date(
          dashboardToday.getFullYear(),
          dashboardToday.getMonth(),
          dashboardToday.getDate(),
        ).getTime() -
          new Date(`${dashboardLatestStatDateKey}T00:00:00`).getTime()) /
          (24 * 60 * 60 * 1000),
      )
    : null;
  const dashboardHasSixMonthBiweeklyStats =
    dashboardStatDateKeys.length > 0 &&
    dashboardDaysSinceLastStat !== null &&
    dashboardDaysSinceLastStat < 14 &&
    Array.from({ length: 13 }).every((_, windowIndex) => {
      const windowEnd = addDashboardDays(dashboardToday, -windowIndex * 14);
      const windowStart = addDashboardDays(windowEnd, -13);
      const windowStartKey = getDashboardLocalDateKey(windowStart);
      const windowEndKey = getDashboardLocalDateKey(windowEnd);

      return dashboardStatDateKeys.some(
        (dateKey) => dateKey >= windowStartKey && dateKey <= windowEndKey,
      );
    });
  const momentumTodayKey = getDashboardLocalDateKey(dashboardToday);
  const momentumHasEntryToday = momentumEntryDateKeys.has(momentumTodayKey);
  const momentumStreakTarget = 7;
  const momentumEntryStreak = momentumHasEntryToday
    ? getDashboardEntryStreak(momentumEntryDateKeys, dashboardToday)
    : 0;
  const momentumPreviousStreak = momentumHasEntryToday
    ? momentumEntryStreak
    : getDashboardEntryStreak(
        momentumEntryDateKeys,
        addDashboardDays(dashboardToday, -1),
      );
  const momentumMeterScore = clampDashboardPercent(
    (momentumEntryStreak / momentumStreakTarget) * 100,
  );
  const momentumHeatIntensity = momentumMeterScore / 100;
  const momentumStreakBackdropStyle: CSSProperties = {
    background: `radial-gradient(ellipse at 50% 72%, rgba(250,204,21,${
      0.12 + momentumHeatIntensity * 0.38
    }), transparent 42%), radial-gradient(ellipse at 22% 84%, rgba(249,115,22,${
      0.06 + momentumHeatIntensity * 0.34
    }), transparent 34%), radial-gradient(ellipse at 76% 82%, rgba(239,68,68,${
      momentumHeatIntensity * 0.28
    }), transparent 36%), radial-gradient(ellipse at 50% 18%, rgba(34,211,238,${
      0.22 - momentumHeatIntensity * 0.08
    }), transparent 58%)`,
    filter: `saturate(${1 + momentumHeatIntensity * 1.25})`,
    opacity: 0.82,
  };
  const momentumStreakFlameStyle: CSSProperties = {
    background:
      "conic-gradient(from 205deg at 50% 88%, transparent 0deg, rgba(250,204,21,0.28) 34deg, rgba(249,115,22,0.78) 78deg, rgba(239,68,68,0.52) 118deg, rgba(34,211,238,0.10) 162deg, transparent 218deg, rgba(250,204,21,0.26) 306deg, transparent 360deg)",
    filter: `blur(${10 - momentumHeatIntensity * 3}px) saturate(${
      1 + momentumHeatIntensity * 1.6
    })`,
    opacity: 0.12 + momentumHeatIntensity * 0.72,
    transform: `translate(-50%, ${12 - momentumHeatIntensity * 18}px) scale(${
      0.78 + momentumHeatIntensity * 0.36
    })`,
  };
  const momentumStreakEmberStyle: CSSProperties = {
    background:
      "radial-gradient(circle at 12% 72%, rgba(250,204,21,0.80) 0 2px, transparent 3px), radial-gradient(circle at 34% 42%, rgba(249,115,22,0.70) 0 1.5px, transparent 3px), radial-gradient(circle at 58% 78%, rgba(254,240,138,0.78) 0 2px, transparent 3px), radial-gradient(circle at 82% 36%, rgba(248,113,113,0.68) 0 1.5px, transparent 3px)",
    backgroundSize: "58px 42px",
    filter: `drop-shadow(0 0 ${6 + momentumHeatIntensity * 10}px rgba(250,204,21,0.48))`,
    opacity: 0.16 + momentumHeatIntensity * 0.62,
    transform: `translateY(${-momentumHeatIntensity * 10}px)`,
  };
  const momentumNeedleAngle = -90 + momentumMeterScore * 1.8;
  const momentumNeedleRadians = (momentumNeedleAngle * Math.PI) / 180;
  const momentumMeterNeedleTipX = 110 + Math.sin(momentumNeedleRadians) * 84;
  const momentumMeterNeedleTipY = 112 - Math.cos(momentumNeedleRadians) * 84;
  const momentumStreakDaysRemaining = Math.max(
    0,
    momentumStreakTarget - momentumEntryStreak,
  );
  const momentumLatestInputTimestamp = momentumInputTimestamps.length
    ? Math.max(...momentumInputTimestamps)
    : null;
  const momentumContinueDeadline =
    momentumLatestInputTimestamp === null
      ? null
      : new Date(momentumLatestInputTimestamp + 36 * 60 * 60 * 1000);
  const momentumContinueDeadlineLabel = momentumContinueDeadline
    ? formatStreakDeadline(momentumContinueDeadline)
    : "";
  const momentumGoalLabel =
    momentumStreakDaysRemaining > 0
      ? `${momentumStreakDaysRemaining} to ${momentumStreakTarget}`
      : "Goal live";
  const momentumSignalLabel = momentumContinueDeadline
    ? `Log by ${momentumContinueDeadlineLabel}`
    : "Log today";
  const momentumSignalTitle = momentumContinueDeadline
    ? `Log by ${formatCompactDateTime(
        momentumContinueDeadline.toISOString(),
      )} to continue streak`
    : "Log today to start your streak";
  const momentumMeterCaption = momentumHasEntryToday
    ? `${momentumEntryStreak} day streak`
    : "No entry today";
  const momentumPrompt = momentumHasEntryToday
    ? "Daily signal logged. Keep the chain alive tomorrow."
    : momentumPreviousStreak > 0
      ? `${momentumPreviousStreak} day streak waiting. Enter anything today.`
      : "Enter one stat, note, workout, or check-in today.";
  const dashboardCalendarToday = new Date(
    dashboardToday.getFullYear(),
    dashboardToday.getMonth(),
    dashboardToday.getDate(),
  );
  const dashboardTodayDropdownLabel = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    weekday: "long",
    year: "numeric",
  }).format(dashboardToday);
  const dashboardConsistencyPlannedWeekdays = new Set([1, 3, 5]);
  const dashboardConsistencyRecoveryWeekdays = new Set([0, 4]);
  const dashboardConsistencyCalendarMonths = Array.from(
    { length: DASHBOARD_CONSISTENCY_MONTH_WINDOW },
    (_, monthIndex) => {
      const monthDate = new Date(
        dashboardToday.getFullYear(),
        dashboardToday.getMonth() -
          DASHBOARD_CONSISTENCY_MONTHS_BACK +
          monthIndex,
        1,
      );
      const daysInMonth = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0,
      ).getDate();
      const leadingBlankCount = monthDate.getDay();
      const days = Array.from({ length: daysInMonth }, (_, dayIndex) => {
        const dayDate = new Date(
          monthDate.getFullYear(),
          monthDate.getMonth(),
          dayIndex + 1,
        );
        const dateKey = getDashboardLocalDateKey(dayDate);
        const isToday = dateKey === momentumTodayKey;
        const isFuture = dayDate.getTime() > dashboardCalendarToday.getTime();
        const hasTraining = dashboardTrainingDateKeys.has(dateKey);
        const hasSignal = momentumEntryDateKeys.has(dateKey);
        const isRecoveryDay = dashboardConsistencyRecoveryWeekdays.has(
          dayDate.getDay(),
        );
        const isPlannedTrainingDay = dashboardConsistencyPlannedWeekdays.has(
          dayDate.getDay(),
        );
        const status = isFuture
          ? isRecoveryDay
            ? "recovery"
            : isPlannedTrainingDay
              ? "planned"
              : "future"
          : hasTraining
            ? "trained"
            : isRecoveryDay
              ? "recovery"
              : isPlannedTrainingDay
                ? "planned"
                : hasSignal
                  ? "logged"
                  : "empty";
        const label = new Intl.DateTimeFormat("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(dayDate);

        return {
          dateKey,
          day: dayIndex + 1,
          hasSignal,
          isToday,
          label,
          status,
        };
      });

      return {
        days,
        label: new Intl.DateTimeFormat("en-US", {
          month: "short",
          year: "numeric",
        }).format(monthDate),
        leadingBlankCount,
      };
    },
  );
  const dashboardConsistencyCalendarWeekdays = ["S", "M", "T", "W", "T", "F", "S"];
  const dashboardConsistencyCalendarTrainingDays =
    dashboardConsistencyCalendarMonths.reduce(
      (total, month) =>
        total +
        month.days.filter((day) => day.status === "trained").length,
      0,
    );
  const dashboardConsistencyCalendarPlannedDays =
    dashboardConsistencyCalendarMonths.reduce(
      (total, month) =>
        total + month.days.filter((day) => day.status === "planned").length,
      0,
    );
  const dashboardConsistencyCalendarMonthCount =
    dashboardConsistencyCalendarMonths.length;
  const getDashboardConsistencyMonthOrbitDistance = (index: number) => {
    let distance = index - activeDashboardConsistencyMonthIndex;
    if (distance > dashboardConsistencyCalendarMonthCount / 2) {
      distance -= dashboardConsistencyCalendarMonthCount;
    }
    if (distance < -dashboardConsistencyCalendarMonthCount / 2) {
      distance += dashboardConsistencyCalendarMonthCount;
    }
    return distance;
  };
  const rotateDashboardConsistencyMonth = (direction: -1 | 1) => {
    setActiveDashboardConsistencyMonthIndex((currentIndex) =>
      (currentIndex + direction + dashboardConsistencyCalendarMonthCount) %
      dashboardConsistencyCalendarMonthCount,
    );
  };
  const dashboardConsistencyStage =
    dashboardStatDateKeys.length === 0
      ? dashboardHasPlan
        ? "Contemplation"
        : "Pre-Contemplation"
      : dashboardHasSixMonthBiweeklyStats
        ? "Maintenance"
        : dashboardDaysSinceLastStat !== null && dashboardDaysSinceLastStat >= 28
          ? "Contemplation"
          : "Active";
  const dashboardStatusUrgency =
    dashboardConsistencyStage === "Maintenance"
      ? "Maintain rhythm"
      : dashboardConsistencyStage === "Active"
        ? "Log by 2 weeks"
        : dashboardConsistencyStage === "Contemplation"
          ? "Plan then log"
          : "Make a plan";
  const dashboardStatusPillTone =
    dashboardConsistencyStage === "Maintenance"
      ? "border-emerald-200/28 bg-emerald-300/10 text-emerald-100"
      : dashboardConsistencyStage === "Active"
        ? "border-cyan-200/30 bg-cyan-300/10 text-cyan-100"
        : dashboardConsistencyStage === "Contemplation"
          ? "border-amber-200/30 bg-amber-300/10 text-amber-100"
          : "border-slate-200/18 bg-slate-100/8 text-slate-200";
  const dashboardStatusDropdownTitle = `${dashboardConsistencyStage} / ${dashboardStatusUrgency} / ${masterJourneyCurrentFocus}`;
  const dashboardProfileHubCompletion = Math.max(
    dashboardFoundationProgress.profileCompletion,
    Math.round(
      (dashboardFoundationProgress.profileCompletion +
        dashboardFoundationProgress.goalsCompletion) /
        2,
    ),
  );
  const dashboardActiveProfileGoalFocus =
    dashboardFoundationProgress.goalFocus || "Choose training focus";
  const dashboardActiveProfilePlanDetail = activeSessionTemplate
    ? `${activeSessionTemplate.exercises.length} exercises in progress`
    : dashboardSummary.latestTemplate
      ? dashboardSummary.latestTemplate.title
        : dashboardSummary.templateCount > 0
          ? `${dashboardSummary.templateCount} templates ready`
          : "Build first workout";
  const dashboardStatusDropdownItems = [
    {
      detail: dashboardStatusUrgency,
      label: "Stage",
      value: dashboardConsistencyStage,
    },
    {
      detail: dashboardActiveProfilePlanDetail,
      label: "Focus",
      value: masterJourneyCurrentFocus,
    },
    {
      detail: momentumMeterCaption,
      label: "Signal",
      value: momentumSignalLabel,
    },
  ];
  const dashboardActiveProfileNextStep =
    dashboardFoundationProgress.profileCompletion < 70
      ? "Profile context"
      : dashboardFoundationProgress.goalsCompletion < 70
        ? "Goal direction"
        : nextAction.cta;
  const dashboardActiveProfileNextHref =
    dashboardFoundationProgress.profileCompletion < 70
      ? ROUTES.dashboard.profile
      : dashboardFoundationProgress.goalsCompletion < 70
        ? ROUTES.dashboard.goals
        : nextAction.href;
  const dashboardProfileHubMainItems: DashboardProfileHubOrbitItem[] = [
    {
      helper: "Identity, member status, profile completion, and dashboard defaults.",
      href: ROUTES.dashboard.profile,
      icon: "profile",
      label: "Profile Basics",
      references: [
        `${dashboardFoundationProgress.profileCompletion}% profile`,
        dashboardFoundationProgress.profileVisited ? "Visited" : "Needs review",
        "Member hub",
      ],
      stat: `${firstName} / Member`,
      tone: "border-cyan-200/24 bg-cyan-300/10 text-cyan-100",
    },
    {
      helper: "Body metrics, weight direction, measurements, and visual progress.",
      href: `${ROUTES.dashboard.profile}#my-body`,
      icon: "performance",
      label: "My Body",
      references: [
        dashboardSummary.hasStats ? "Stats active" : "Stats open",
        `${dashboardSummary.totalLoggedEntries} logs`,
        "Body metrics",
      ],
      stat: dashboardSummary.hasStats ? "Trend active" : "Add metrics",
      tone: "border-sky-200/24 bg-sky-300/10 text-sky-100",
    },
    {
      helper: "Sleep, stress, soreness, pain, energy, and readiness context.",
      href: `${ROUTES.dashboard.profile}#readiness-section`,
      icon: "recovery",
      label: "Readiness",
      references: [
        dashboardSummary.totalSets > 30 ? "Manage heat" : "Ready to build",
        `${dashboardSummary.totalSets} sets`,
        "Recovery signals",
      ],
      stat: "Recovery context",
      tone: "border-amber-200/24 bg-amber-300/10 text-amber-100",
    },
    {
      helper: "Primary goals, training direction, weekly targets, and motivation.",
      href: `${ROUTES.dashboard.profile}#plan-direction`,
      icon: "goals",
      label: "Goal Direction",
      references: [
        dashboardFoundationProgress.goalFocus || "Goal focus open",
        `${dashboardFoundationProgress.goalsCompletion}% goals`,
        dashboardFoundationProgress.goalsVisited ? "Synced" : "Needs setup",
      ],
      stat: `${dashboardFoundationProgress.goalsCompletion}% ready`,
      tone: "border-emerald-200/24 bg-emerald-300/10 text-emerald-100",
    },
    {
      helper: "Coach notes, app preferences, AI guidance, and communication style.",
      href: `${ROUTES.dashboard.profile}#coach-app-notes`,
      icon: "education",
      label: "Coach + App",
      references: ["Coach context", "App defaults", "Guidance notes"],
      stat: "Personalization",
      tone: "border-teal-200/24 bg-teal-300/10 text-teal-100",
    },
  ];
  const dashboardProfileHubAccountItems: DashboardProfileHubOrbitItem[] = [
    {
      helper: "Notifications, display controls, security, and app preferences.",
      href: ROUTES.dashboard.settings,
      icon: "dashboard",
      label: "Settings",
      references: ["Preferences", "Security", "Notifications"],
      stat: "Account controls",
      tone: "border-violet-200/24 bg-violet-300/10 text-violet-100",
    },
    {
      helper: "Session packages, payments, invoices, and renewal context.",
      href: ROUTES.dashboard.payments,
      icon: "performance",
      label: "Billing",
      references: ["Packages", "Invoices", "Payments"],
      stat: "Plan status",
      tone: "border-amber-200/24 bg-amber-300/10 text-amber-100",
    },
    {
      helper: "Support, FAQs, app guidance, and troubleshooting paths.",
      href: ROUTES.dashboard.help,
      icon: "education",
      label: "Help",
      references: ["Support center", "FAQs", "Guidance"],
      stat: "Support",
      tone: "border-emerald-200/24 bg-emerald-300/10 text-emerald-100",
    },
    {
      helper: "Milestones, badges, Sound Points, tokens, and emerald rewards.",
      href: ROUTES.dashboard.achievements,
      icon: "goals",
      label: "Achievements",
      references: [
        `${soundPoints.toLocaleString()} points`,
        `${soundEmeralds.toLocaleString()} emeralds`,
        `${soundTokens.toLocaleString()} tokens`,
      ],
      stat: "Rewards",
      tone: "border-orange-200/24 bg-orange-300/10 text-orange-100",
    },
  ];
  const dashboardProfileHubLayerMenuItems = [
    { label: "Profile", layer: 0 },
    { label: "My Hub", layer: 1 },
    { label: "Account", layer: 2 },
  ];
  const openDashboardProfileHub = () => {
    setDashboardPointsDropdownOpen(false);
    setDashboardMusicDropdownOpen(false);
    setDashboardHeaderMeterMenuOpen(false);
    setActiveDashboardProfileHubLayer(0);
    setActiveDashboardProfileHubMainIndex(0);
    setActiveDashboardProfileHubAccountIndex(0);
    setDashboardProfileHubOpen(true);
  };
  const closeDashboardProfileHub = () => {
    setDashboardProfileHubOpen(false);
  };
  const toggleDashboardPointsDropdown = () => {
    setDashboardProfileHubOpen(false);
    setDashboardMusicDropdownOpen(false);
    setDashboardHeaderMeterMenuOpen(false);
    setDashboardPointsDropdownOpen((open) => !open);
  };
  const selectDashboardProfileHubLayer = (layer: number) => {
    setActiveDashboardProfileHubLayer(Math.max(0, Math.min(2, layer)));
  };
  const rotateDashboardProfileHubLayer = (direction: "up" | "down") => {
    setActiveDashboardProfileHubLayer((currentLayer) =>
      Math.max(
        0,
        Math.min(2, currentLayer + (direction === "down" ? 1 : -1)),
      ),
    );
  };
  const rotateDashboardProfileHubOrbit = (direction: DashboardOrbitDirection) => {
    setActiveDashboardProfileHubMainIndex((currentIndex) =>
      direction === "left"
        ? (currentIndex - 1 + dashboardProfileHubMainItems.length) %
          dashboardProfileHubMainItems.length
        : (currentIndex + 1) % dashboardProfileHubMainItems.length,
    );
  };
  const rotateDashboardProfileHubAccountOrbit = (
    direction: DashboardOrbitDirection,
  ) => {
    setActiveDashboardProfileHubAccountIndex((currentIndex) =>
      direction === "left"
        ? (currentIndex - 1 + dashboardProfileHubAccountItems.length) %
          dashboardProfileHubAccountItems.length
        : (currentIndex + 1) % dashboardProfileHubAccountItems.length,
    );
  };
  const getDashboardProfileHubOrbitDistance = (
    index: number,
    activeIndex: number,
    itemCount: number,
  ) => {
    const rawDistance = index - activeIndex;

    if (rawDistance > itemCount / 2) return rawDistance - itemCount;
    if (rawDistance < -itemCount / 2) return rawDistance + itemCount;

    return rawDistance;
  };
  const dashboardFloatingSnapshotActiveCard =
    clampedDashboardOrbiterRow === 3
      ? activeCommandCenter
      : clampedDashboardOrbiterRow === 6
        ? activeSystemCenter
        : null;
  const dashboardFloatingSnapshotRowCards =
    clampedDashboardOrbiterRow === 3
      ? dashboardCommandCenterCards
      : clampedDashboardOrbiterRow === 6
        ? dashboardSystemCards
        : [];
  const dashboardFloatingSnapshotActiveCardIndex =
    clampedDashboardOrbiterRow === 3
      ? activeCommandCenterIndex
      : clampedDashboardOrbiterRow === 6
        ? activeSystemCenterIndex
        : -1;
  const dashboardFloatingSnapshotCompletion =
    dashboardFloatingSnapshotActiveCard
      ? getDashboardNavigationCardCompletion(dashboardFloatingSnapshotActiveCard)
      : 0;
  const dashboardFloatingSnapshotJourneySteps =
    dashboardFloatingSnapshotActiveCard?.journeySteps || [];
  const dashboardFloatingSnapshotActiveJourneyStepIndex =
    dashboardFloatingSnapshotActiveCard &&
    dashboardFloatingSnapshotJourneySteps.length
      ? (() => {
          const savedIndex =
            activeDashboardJourneyStepIndexes[
              dashboardFloatingSnapshotActiveCard.title
            ];

          if (
            typeof savedIndex === "number" &&
            savedIndex >= 0 &&
            savedIndex < dashboardFloatingSnapshotJourneySteps.length
          ) {
            return savedIndex;
          }

          const activeIndex = dashboardFloatingSnapshotJourneySteps.findIndex(
            (step) => step.state === "active",
          );
          if (activeIndex >= 0) return activeIndex;

          const defaultIndex = dashboardFloatingSnapshotJourneySteps.findIndex(
            (step) => step.state === "default",
          );
          if (defaultIndex >= 0) return defaultIndex;

          const completeIndex = dashboardFloatingSnapshotJourneySteps.findIndex(
            (step) => step.state === "complete",
          );

          return completeIndex >= 0 ? completeIndex : 0;
        })()
      : -1;
  const dashboardFloatingSnapshotActiveJourneyStep =
    dashboardFloatingSnapshotActiveJourneyStepIndex >= 0
      ? dashboardFloatingSnapshotJourneySteps[
          dashboardFloatingSnapshotActiveJourneyStepIndex
        ]
      : null;
  const dashboardWeeklyCaloriesTarget = 14700;
  const dashboardHydrationConsistency =
    dashboardCharts.nutritionConsistency.find(
      (item) => item.label === "Hydration",
    )?.value || 0;
  const dashboardMealConsistency =
    dashboardCharts.nutritionConsistency.find((item) => item.label === "Meals")
      ?.value || 0;
  const dashboardProteinConsistency =
    dashboardCharts.nutritionConsistency.find(
      (item) => item.label === "Protein",
    )?.value || 0;
  const dashboardRecoveryAverage = Math.round(
    dashboardCharts.recoveryTrend.reduce((sum, item) => sum + item.value, 0) /
      dashboardCharts.recoveryTrend.length,
  );
  const dashboardNutritionAverage = Math.round(
    dashboardCharts.nutritionConsistency.reduce(
      (sum, item) => sum + item.value,
      0,
    ) / dashboardCharts.nutritionConsistency.length,
  );
  const dashboardWeeklyRecapCards: DashboardWeeklyRecapCard[] = [
    {
      description: "Training volume by day from the last 7 days.",
      metric: `${Math.round(dashboardSummary.weeklyVolume).toLocaleString()} lb`,
      rows: dashboardCharts.trainingVolume.map((item) => ({
        detail:
          item.value >= item.target
            ? "At target"
            : `${(item.target * 100).toLocaleString()} lb goal`,
        label: item.label,
        value: `${(item.value * 100).toLocaleString()} lb`,
      })),
      title: "Weekly Training Volume",
      tone: "cyan",
    },
    {
      description: "Fuel habits summarized for the current weekly rhythm.",
      metric: `${dashboardNutritionAverage}%`,
      rows: dashboardCharts.nutritionConsistency.map((item) => ({
        detail: `${item.target}% target`,
        label: item.label,
        value: `${Math.round(item.value)}%`,
      })),
      title: "Nutrition Consistency",
      tone: "emerald",
    },
    {
      description: "Readiness trend across the last 7-day recovery window.",
      metric: `${dashboardRecoveryAverage}%`,
      rows: dashboardCharts.recoveryTrend.map((item) => ({
        detail:
          item.value >= 80
            ? "Ready"
            : item.value >= 70
              ? "Steady"
              : "Watch load",
        label: item.label,
        value: `${Math.round(item.value)}%`,
      })),
      title: "Recovery Readiness",
      tone: "amber",
    },
    {
      description: dashboardSummary.hasStats
        ? dashboardSummary.mostRecentDate
        : "No saved workout activity yet.",
      metric: dashboardSummary.hasStats
        ? `${dashboardSummary.totalLoggedEntries} logs`
        : "0 logs",
      rows: dashboardSummary.hasStats
        ? dashboardSummary.latestEntries.slice(0, 5).map((entry) => ({
            detail: `${
              entry.source === "workout-session" ? "Workout" : "Library"
            } / ${entry.sets} sets`,
            label: entry.exerciseName,
            value: `${entry.weight} x ${entry.reps}`,
          }))
        : [
            {
              detail: dashboardSummary.mostRecentDate,
              label: "Status",
              value: dashboardSummary.latestExercise,
            },
            {
              detail: "Create your first local stats entry",
              label: "Next",
              value: "Start session hub",
            },
            {
              detail: "Open stats dashboard",
              label: "Route",
              value: "Stats",
            },
          ],
      title: "Recent Workout Activity",
      tone: "sky",
    },
  ];
  const getWeeklyRecapOrbitDistance = (index: number) =>
    getDashboardOrbitDistance(
      index,
      activeWeeklyRecapIndex,
      dashboardWeeklyRecapCards.length,
    );
  const rotateWeeklyRecap = (direction: DashboardOrbitDirection) => {
    setActiveWeeklyRecapIndex((currentIndex) => {
      const nextIndex =
        direction === "left" ? currentIndex - 1 : currentIndex + 1;

      return (
        (nextIndex + dashboardWeeklyRecapCards.length) %
        dashboardWeeklyRecapCards.length
      );
    });
  };
  const getWeeklyRecapBarValue = (value: string) => {
    const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);

    return match ? Number(match[0]) : 0;
  };
  const getWeeklyRecapBarPercent = (
    card: DashboardWeeklyRecapCard,
    row: DashboardWeeklyRecapCard["rows"][number],
  ) => {
    const value = getWeeklyRecapBarValue(row.value);
    const target = getWeeklyRecapBarValue(row.detail);

    if (row.value.includes("%")) {
      return Math.max(4, Math.min(100, value));
    }

    if (card.title === "Weekly Training Volume") {
      return Math.max(4, Math.min(100, target > 0 ? (value / target) * 100 : 0));
    }

    return Math.max(4, Math.min(100, value > 0 ? value : 0));
  };
  const dashboardNutritionFavorites =
    dashboardLibraryFavoriteIds.nutrition?.length || 0;
  const dashboardMySoundCards: DashboardMySoundCard[] = [
    {
      description:
        "Sessions, templates, and weekly volume are shaping the next training prompt.",
      href: ROUTES.dashboard.sessions,
      icon: "workout",
      metric: `${dashboardSummary.workoutsThisWeek} wk`,
      rows: [
        {
          detail: `${dashboardSummary.weeklySets} sets / ${Math.round(
            dashboardSummary.weeklyVolume,
          ).toLocaleString()} lb`,
          label: "Signal",
          value:
            dashboardSummary.workoutsThisWeek > 0
              ? "Training active"
              : "No sessions",
        },
        {
          detail:
            dashboardSummary.latestTemplate?.title ||
            "Create a reusable workout",
          label: "Relevant",
          value:
            dashboardSummary.templateCount > 0
              ? "Template ready"
              : "Builder path",
        },
        {
          detail: activeSessionTemplate ? "Resume current session" : "Open Sessions",
          label: "Next",
          value: activeSessionTemplate ? "Resume" : nextAction.cta,
        },
      ],
      title: "Training Signal",
      tone: "cyan",
    },
    {
      description:
        "Fuel content is weighted toward the habits with the biggest gap this week.",
      href: ROUTES.nutrition.home,
      icon: "nutrition",
      metric: `${dashboardNutritionAverage}%`,
      rows: [
        {
          detail: `${Math.round(dashboardProteinConsistency)}% protein`,
          label: "Protein",
          value:
            dashboardProteinConsistency >= 70 ? "Holding" : "Needs plan",
        },
        {
          detail: `${Math.round(dashboardHydrationConsistency)}% hydration`,
          label: "Hydration",
          value:
            dashboardHydrationConsistency >= 70 ? "Steady" : "Nudge",
        },
        {
          detail: `${dashboardNutritionFavorites} saved fuel items`,
          label: "Relevant",
          value: dashboardMealConsistency >= 70 ? "Meal rhythm" : "Grocery",
        },
      ],
      title: "Fuel Signal",
      tone: "emerald",
    },
    {
      description:
        "Recovery suggestions respond to recent training heat and readiness.",
      href: ROUTES.dashboard.recovery,
      icon: "recovery",
      metric: `${dashboardRecoveryAverage}%`,
      rows: [
        {
          detail:
            dashboardSummary.weeklySets > 30
              ? `${dashboardSummary.weeklySets} sets`
              : "Load manageable",
          label: "Heat",
          value: dashboardSummary.weeklySets > 30 ? "Reduce" : "Build",
        },
        {
          detail: `${dashboardRecoveryAverage}% average`,
          label: "Readiness",
          value: dashboardRecoveryAverage >= 78 ? "Ready" : "Monitor",
        },
        {
          detail: "Mobility and soreness context",
          label: "Relevant",
          value:
            dashboardSummary.weeklySets > 30 ? "Recovery plan" : "Mobility",
        },
      ],
      title: "Recovery Signal",
      tone: "amber",
    },
    {
      description:
        "Performance content follows volume, exercise variety, and logged stats.",
      href: ROUTES.dashboard.performance,
      icon: "performance",
      metric: `${dashboardSummary.uniqueExerciseCount} moves`,
      rows: [
        {
          detail: `${dashboardSummary.uniqueExerciseCount} unique exercises`,
          label: "Variety",
          value:
            dashboardSummary.uniqueExerciseCount >= 4 ? "Broad" : "Narrow",
        },
        {
          detail: `${dashboardSummary.totalLoggedEntries} total logs`,
          label: "Stats",
          value: dashboardSummary.hasStats ? "Trendable" : "Start",
        },
        {
          detail: dashboardSummary.latestExercise,
          label: "Relevant",
          value: "Performance",
        },
      ],
      title: "Performance Signal",
      tone: "sky",
    },
    {
      description:
        "Goal and profile context decide how specific the plan recommendations can get.",
      href: ROUTES.dashboard.goals,
      icon: "goals",
      metric: `${dashboardFoundationProgress.goalsCompletion}%`,
      rows: [
        {
          detail:
            dashboardFoundationProgress.goalFocus || "Choose training focus",
          label: "Goal",
          value:
            dashboardFoundationProgress.goalsCompletion >= 70
              ? "Clear"
              : "Open",
        },
        {
          detail: `${dashboardFoundationProgress.profileCompletion}% profile`,
          label: "Context",
          value:
            dashboardFoundationProgress.profileCompletion >= 70
              ? "Useful"
              : "Thin",
        },
        {
          detail: dashboardFoundationProgress.goalsVisited
            ? "Refine priorities"
            : "Set direction",
          label: "Relevant",
          value: "Goal setup",
        },
      ],
      title: "Goal Signal",
      tone: "violet",
    },
    {
      description:
        "Rewards and community prompts are tuned from points, streaks, and unlocked milestones.",
      href: ROUTES.dashboard.achievements,
      icon: "achievements",
      metric: soundPoints.toLocaleString(),
      rows: [
        {
          detail: `${soundEmeralds.toLocaleString()} Emeralds | ${soundTokens.toLocaleString()} Sound Tokens`,
          label: "Wallet",
          value: `${soundPoints.toLocaleString()} pts`,
        },
        {
          detail: `${momentumEntryStreak}/${momentumStreakTarget} day goal`,
          label: "Streak",
          value: momentumHasEntryToday ? "Live" : "Log today",
        },
        {
          detail: "Milestones and Sound World prompts",
          label: "Relevant",
          value: "Rewards",
        },
      ],
      title: "Reward Signal",
      tone: "fuchsia",
    },
  ];
  const getMySoundOrbitDistance = (index: number) =>
    getDashboardOrbitDistance(
      index,
      activeMySoundIndex,
      dashboardMySoundCards.length,
    );
  const rotateMySound = (direction: DashboardOrbitDirection) => {
    setActiveMySoundIndex((currentIndex) => {
      const nextIndex =
        direction === "left" ? currentIndex - 1 : currentIndex + 1;

      return (
        (nextIndex + dashboardMySoundCards.length) %
        dashboardMySoundCards.length
      );
    });
  };
  const getDashboardFloatingSnapshotMetrics = (
    card: DashboardNavigationCard,
    activeStep: DashboardJourneyStep | null,
  ) => {
    const stepLabel = activeStep?.label || "Open hub";
    const progressMetric = {
      label: "Progress",
      value: `${dashboardFloatingSnapshotCompletion}%`,
    };

    if (card.title === "Workout / Sessions") {
      const stepMetric =
        stepLabel === "My Plan"
          ? {
              label: "Weekly Plan",
              value: dashboardSummary.latestTemplate?.title || "Build week",
            }
          : stepLabel === "Workout Builder"
            ? {
                label: "Templates",
                value: `${dashboardSummary.templateCount} saved`,
              }
            : stepLabel === "Exercise Library"
              ? {
                  label: "Exercise Lib",
                  value: `${favoriteExerciseCards.length} saved`,
                }
              : {
                  label: "Inner Focus",
                  value: stepLabel,
                };

      return [
        {
          label: "Weekly Volume",
          value: `${Math.round(dashboardSummary.weeklyVolume).toLocaleString()} lb`,
        },
        {
          label: "Workouts",
          value: `${dashboardSummary.workoutsThisWeek} this week`,
        },
        {
          label: "Weekly Sets",
          value: `${dashboardSummary.weeklySets} sets`,
        },
        stepMetric,
      ];
    }

    if (card.title === "Nutrition / Fuel") {
      const stepMetric =
        stepLabel === "Hydrate"
          ? {
              label: "Hydration",
              value: `${Math.round(dashboardHydrationConsistency)}%`,
            }
          : stepLabel === "Meals"
            ? {
                label: "Meal Rhythm",
                value: `${Math.round(dashboardMealConsistency)}%`,
              }
            : stepLabel === "Grocery"
              ? {
                  label: "Grocery",
                  value: `${dashboardNutritionFavorites} saved`,
                }
              : stepLabel === "Calories"
                ? {
                    label: "Calories",
                    value: `${dashboardWeeklyCaloriesTarget.toLocaleString()} target`,
                  }
                : {
                    label: "Inner Focus",
                    value: stepLabel,
                  };

      return [
        {
          label: "Weekly Calories",
          value: `${dashboardWeeklyCaloriesTarget.toLocaleString()} target`,
        },
        {
          label: "Meal Rhythm",
          value: `${Math.round(dashboardMealConsistency)}%`,
        },
        {
          label: "Protein",
          value: `${Math.round(dashboardProteinConsistency)}%`,
        },
        {
          label: "Saved Fuel",
          value: `${dashboardNutritionFavorites} saved`,
        },
        stepMetric,
      ].filter(
        (metric, metricIndex, metrics) =>
          metrics.findIndex((item) => item.label === metric.label) ===
          metricIndex,
      );
    }

    if (card.title === "Recovery") {
      return [
        {
          label: "Readiness",
          value: `${dashboardRecoveryAverage}%`,
        },
        {
          label: "Training Heat",
          value:
            dashboardSummary.weeklySets > 30
              ? "Manage heat"
              : `${dashboardSummary.weeklySets} sets`,
        },
        {
          label: "Hydration",
          value: `${Math.round(dashboardHydrationConsistency)}%`,
        },
        progressMetric,
      ];
    }

    if (card.title === "Performance") {
      return [
        {
          label: "Weekly Volume",
          value: `${Math.round(dashboardSummary.weeklyVolume).toLocaleString()} lb`,
        },
        {
          label: "Exercises",
          value: `${dashboardSummary.uniqueExerciseCount} unique`,
        },
        {
          label: "Workouts",
          value: `${dashboardSummary.workoutsThisWeek} this week`,
        },
        {
          label: "Inner Focus",
          value: stepLabel,
        },
      ];
    }

    if (card.title === "Stats") {
      return [
        {
          label: "Logged Entries",
          value: `${dashboardSummary.totalLoggedEntries} logs`,
        },
        {
          label: "Weekly Volume",
          value: `${Math.round(dashboardSummary.weeklyVolume).toLocaleString()} lb`,
        },
        {
          label: "Latest",
          value: dashboardSummary.latestExercise,
        },
        progressMetric,
      ];
    }

    if (card.title === "Goals") {
      return [
        {
          label: "Goal Setup",
          value: `${dashboardFoundationProgress.goalsCompletion}%`,
        },
        {
          label: "Focus",
          value: dashboardFoundationProgress.goalFocus || "Choose focus",
        },
        {
          label: "Profile",
          value: `${dashboardFoundationProgress.profileCompletion}%`,
        },
        progressMetric,
      ];
    }

    if (card.title === "Calendar") {
      return [
        {
          label: "Week",
          value: `${dashboardSummary.workoutsThisWeek} workouts`,
        },
        {
          label: "Templates",
          value: `${dashboardSummary.templateCount} saved`,
        },
        {
          label: "Next Plan",
          value: dashboardSummary.latestTemplate?.title || "Build week",
        },
        progressMetric,
      ];
    }

    if (card.title === "Achievements") {
      return [
        {
          label: "Sound Points",
          value: soundPoints.toLocaleString(),
        },
        {
          label: "Tokens",
          value: soundTokens.toLocaleString(),
        },
        {
          label: "Emeralds",
          value: soundEmeralds.toLocaleString(),
        },
        progressMetric,
      ];
    }

    if (card.title === "Education") {
      return [
        {
          label: "Lessons",
          value: "Technique",
        },
        {
          label: "Training Logic",
          value: `${dashboardSummary.templateCount} templates`,
        },
        {
          label: "Inner Focus",
          value: stepLabel,
        },
        progressMetric,
      ];
    }

    if (card.title === "Sound World") {
      return [
        {
          label: "Sound Points",
          value: soundPoints.toLocaleString(),
        },
        {
          label: "Tokens",
          value: soundTokens.toLocaleString(),
        },
        {
          label: "Emeralds",
          value: soundEmeralds.toLocaleString(),
        },
        progressMetric,
      ];
    }

    return [
      progressMetric,
      {
        label: "Focus",
        value: card.status,
      },
      {
        label: "Active View",
        value: stepLabel,
      },
      {
        label: "Path",
        value: dashboardFloatingSnapshotJourneySteps.length
          ? `${dashboardFloatingSnapshotJourneySteps.length} steps`
          : "Direct hub",
      },
    ];
  };
  const dashboardFloatingSnapshotMetrics = dashboardFloatingSnapshotActiveCard
    ? getDashboardFloatingSnapshotMetrics(
        dashboardFloatingSnapshotActiveCard,
        dashboardFloatingSnapshotActiveJourneyStep,
      )
    : clampedDashboardOrbiterRow === 4
      ? [
          {
            label: "Week",
            value: `${dashboardSummary.workoutsThisWeek} workouts`,
          },
          {
            label: "Templates",
            value: `${dashboardSummary.templateCount} saved`,
          },
          {
            label: "Next Plan",
            value: dashboardSummary.latestTemplate?.title || "Build week",
          },
          {
            label: "Focus",
            value: "Calendar",
          },
        ]
    : [
        {
          label: "Workouts",
          value: `${dashboardSummary.workoutsThisWeek} this week`,
        },
        {
          label: "Weekly Volume",
          value: `${Math.round(dashboardSummary.weeklyVolume).toLocaleString()} lb`,
        },
        {
          label: "Recovery",
          value:
            dashboardSummary.totalSets > 30 ? "Manage heat" : "Ready to build",
        },
        {
          label: "Performance",
          value: dashboardSummary.hasStats ? "Trend active" : "Start logging",
        },
      ];
  const dashboardFloatingSnapshotRow =
    dashboardOrbiterRows[clampedDashboardOrbiterRow];
  const dashboardFloatingSnapshotTitle =
    dashboardFloatingSnapshotActiveCard?.title ||
    dashboardFloatingSnapshotRow?.title ||
    "Weekly Snapshot";
  const dashboardFloatingSnapshotRowTone = getDashboardRowUrgencyTone(
    dashboardFloatingSnapshotRow?.completion || 0,
  );
  const getDashboardFloatingMetricCompletion = (metric: {
    label: string;
    value: string;
  }) => {
    const label = metric.label.toLowerCase();
    const value = metric.value.toLowerCase();
    const numericMatch = value.match(/-?\d+(?:\.\d+)?/);
    const numericValue = numericMatch ? Number(numericMatch[0]) : null;

    if (value.includes("%") && numericValue !== null) {
      return Math.max(0, Math.min(100, Math.round(numericValue)));
    }

    if (value.includes("ready")) return 90;
    if (value.includes("active")) return 68;
    if (value.includes("manage") || value.includes("watch")) return 28;
    if (
      value.includes("choose") ||
      value.includes("start") ||
      value.includes("build") ||
      value.includes("submit")
    ) {
      return 34;
    }

    if (
      numericValue === 0 &&
      (label.includes("weekly") ||
        label.includes("workout") ||
        label.includes("set") ||
        label.includes("template") ||
        label.includes("exercise") ||
        label.includes("logged") ||
        label.includes("saved"))
    ) {
      return 18;
    }

    if (numericValue !== null && numericValue > 0) return 72;

    return 56;
  };
  const dashboardFloatingSnapshotEyebrow = dashboardFloatingSnapshotActiveCard
    ? dashboardFloatingSnapshotRow?.title || "Dashboard Row"
    : dashboardFloatingSnapshotRow?.title || "Weekly Snapshot";
  const dashboardFloatingSnapshotDescription =
    dashboardFloatingSnapshotActiveCard?.description ||
    dashboardFloatingSnapshotRow?.helper ||
    "Workouts, nutrition, readiness, and performance stay visible as the orbiter moves.";
  const activeDashboardFloatingMetric =
    dashboardFloatingSnapshotMetrics[
      activeDashboardFloatingMetricIndex %
        Math.max(1, dashboardFloatingSnapshotMetrics.length)
    ] || dashboardFloatingSnapshotMetrics[0];

  useEffect(() => {
    setActiveDashboardFloatingMetricIndex(0);
  }, [clampedDashboardOrbiterRow, dashboardFloatingSnapshotTitle]);

  const dashboardHeaderLinks: DashboardHeaderLink[] = [
    {
      completion: dashboardTabCompletions.workout,
      href: ROUTES.dashboard.sessions,
      icon: "workout",
      label: "Sessions",
      meta: "Training",
      points: Math.round(soundPoints * 0.82),
      tone:
        "border-sky-200/28 bg-sky-300/10 text-sky-100 hover:border-sky-100/45 hover:bg-sky-300/16",
      toneKey: "cyan",
    },
    {
      completion: dashboardTabCompletions.profile,
      href: ROUTES.dashboard.profile,
      icon: "profile",
      label: "Profile",
      meta: "Identity",
      points: Math.round(soundPoints * 0.94),
      tone:
        "border-cyan-200/30 bg-cyan-300/10 text-cyan-100 hover:border-cyan-100/45 hover:bg-cyan-300/16",
      toneKey: "cyan",
    },
    {
      completion: dashboardTabCompletions.goals,
      href: ROUTES.dashboard.goals,
      icon: "goals",
      label: "Goals",
      meta: "Direction",
      points: Math.round(soundPoints * 0.68),
      tone:
        "border-amber-200/34 bg-amber-300/12 text-amber-100 hover:border-amber-100/45 hover:bg-amber-300/18",
      toneKey: "amber",
    },
    {
      completion: dashboardTabCompletions.nutrition,
      href: ROUTES.nutritionPortal.home,
      icon: "nutrition",
      label: "Nutrition",
      meta: "Fuel",
      points: Math.round(soundPoints * 0.38),
      tone:
        "border-emerald-200/28 bg-emerald-300/10 text-emerald-100 hover:border-emerald-100/45 hover:bg-emerald-300/16",
      toneKey: "emerald",
    },
    {
      completion: dashboardTabCompletions.recovery,
      href: ROUTES.dashboard.recovery,
      icon: "recovery",
      label: "Recovery",
      meta: "Readiness",
      points: Math.round(soundPoints * 0.24),
      tone:
        "border-violet-200/28 bg-violet-300/10 text-violet-100 hover:border-violet-100/45 hover:bg-violet-300/16",
      toneKey: "sky",
    },
    {
      completion: dashboardTabCompletions.performance,
      href: ROUTES.performance.home,
      icon: "performance",
      label: "Performance",
      meta: "Athletic",
      points: Math.round(soundPoints * 0.46),
      tone:
        "border-amber-200/30 bg-amber-300/10 text-amber-100 hover:border-amber-100/45 hover:bg-amber-300/16",
      toneKey: "amber",
    },
    {
      completion: dashboardTabCompletions.education,
      href: ROUTES.learning.home,
      icon: "education",
      label: "Education",
      meta: "Learning",
      points: Math.round(soundPoints * 0.12),
      tone:
        "border-blue-200/28 bg-blue-300/10 text-blue-100 hover:border-blue-100/45 hover:bg-blue-300/16",
      toneKey: "violet",
    },
    {
      completion: dashboardTabCompletions.soundWorld,
      href: ROUTES.soundworld.home,
      icon: "soundworld",
      label: "Sound World",
      meta: "Community",
      points: Math.round(soundPoints * 0.08),
      tone:
        "border-pink-200/28 bg-pink-300/10 text-pink-100 hover:border-pink-100/45 hover:bg-pink-300/16",
      toneKey: "fuchsia",
    },
  ];
  const activeDashboardHeaderNormalizedIndex =
    ((activeDashboardHeaderIndex % dashboardHeaderLinks.length) +
      dashboardHeaderLinks.length) %
    dashboardHeaderLinks.length;
  const activeDashboardHeaderLink =
    dashboardHeaderLinks[activeDashboardHeaderNormalizedIndex] ||
    dashboardHeaderLinks[0];
  const activeDashboardHeaderTone =
    dashboardHeaderToneStyles[activeDashboardHeaderLink.toneKey];
  const getDashboardHeaderVortexModeForDirection = (
    direction: DashboardScrollButtonDirection,
  ): DashboardHeaderVortexMode =>
    direction === "up" || direction === "right" ? "clockwise" : "counter";
  const dashboardHeaderActiveVortexMode =
    dashboardHeaderMenuOrbitActiveDirection
      ? getDashboardHeaderVortexModeForDirection(
          dashboardHeaderMenuOrbitActiveDirection,
        )
      : dashboardHeaderScrollButtonActiveDirection
      ? getDashboardHeaderVortexModeForDirection(
          dashboardHeaderScrollButtonActiveDirection,
        )
      : null;
  const dashboardHeaderVortexMode =
    dashboardHeaderActiveVortexMode || dashboardHeaderVortexPulseMode;
  const dashboardHeaderVortexPhase: DashboardHeaderVortexPhase =
    dashboardHeaderActiveVortexMode
      ? "active"
      : dashboardHeaderVortexPulseMode
        ? dashboardHeaderVortexSettling
          ? "settling"
          : "active"
        : "idle";
  const dashboardHeaderHasLiveHighlight = Boolean(
    dashboardHeaderActiveVortexMode ||
      dashboardHeaderVortexPulseMode ||
      dashboardHeaderScrollButtonActiveDirection ||
      dashboardHeaderMenuOrbitActiveDirection ||
      dashboardHeaderScrollButtonDragging ||
      dashboardHeaderMenuOrbitDragging ||
      dashboardHeaderMeterRailActive ||
      dashboardHeaderMeterMenuOpen ||
      dashboardProfileActionsOpen ||
      dashboardPointsDropdownOpen ||
      dashboardMusicDropdownOpen,
  );
  const clearDashboardHeaderIdleTimeout = () => {
    if (dashboardHeaderIdleTimeoutRef.current !== null) {
      window.clearTimeout(dashboardHeaderIdleTimeoutRef.current);
      dashboardHeaderIdleTimeoutRef.current = null;
    }
  };
  const startDashboardHeaderIdleTimeout = () => {
    if (typeof window === "undefined") return;

    clearDashboardHeaderIdleTimeout();
    dashboardHeaderIdleTimeoutRef.current = window.setTimeout(() => {
      dashboardHeaderIdleTimeoutRef.current = null;
      setDashboardHeaderTimedOut(true);
    }, DASHBOARD_HEADER_IDLE_TIMEOUT_MS);
  };
  const wakeDashboardHeaderMenu = () => {
    setDashboardHeaderTimedOut(false);

    if (!dashboardHeaderHasLiveHighlight) {
      startDashboardHeaderIdleTimeout();
    }
  };
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (dashboardHeaderHasLiveHighlight) {
      clearDashboardHeaderIdleTimeout();
      setDashboardHeaderTimedOut(false);
      return;
    }

    startDashboardHeaderIdleTimeout();

    return () => {
      clearDashboardHeaderIdleTimeout();
    };
  }, [
    activeDashboardHeaderNormalizedIndex,
    dashboardHeaderHasLiveHighlight,
    dashboardHeaderMenuActiveIndex,
  ]);
  const activeDashboardHeaderUrgencyTone = getDashboardRowUrgencyTone(
    activeDashboardHeaderLink.completion,
  );
  const nextDashboardHeaderLink =
    dashboardHeaderLinks[
      (activeDashboardHeaderNormalizedIndex + 1) % dashboardHeaderLinks.length
    ] || dashboardHeaderLinks[0];
  const previousDashboardHeaderLink =
    dashboardHeaderLinks[
      (activeDashboardHeaderNormalizedIndex - 1 + dashboardHeaderLinks.length) %
        dashboardHeaderLinks.length
    ] || dashboardHeaderLinks[0];
  const dashboardHeaderScrollButtonPreviewLink =
    dashboardHeaderScrollButtonActiveDirection === "left"
      ? previousDashboardHeaderLink
      : dashboardHeaderScrollButtonActiveDirection === "right"
        ? nextDashboardHeaderLink
        : activeDashboardHeaderLink;
  const dashboardHeaderMenuOrbitPreviewLink =
    dashboardHeaderMenuOrbitActiveDirection === "left"
      ? previousDashboardHeaderLink
      : nextDashboardHeaderLink;
  const dashboardHeaderScrollButtonPreviewTone =
    dashboardHeaderScrollButtonPreviewToneStyles[
      dashboardHeaderScrollButtonPreviewLink.toneKey
    ];
  const dashboardHeaderMenuOrbitPreviewTone =
    dashboardHeaderScrollButtonPreviewToneStyles[
      dashboardHeaderMenuOrbitPreviewLink.toneKey
    ];
  const dashboardHeaderActiveScrollButtonTone =
    dashboardHeaderScrollButtonPreviewToneStyles[
      activeDashboardHeaderLink.toneKey
    ];
  const rotateDashboardHeaderRail = (direction: "left" | "right") => {
    setDashboardHeaderSlideDirection(direction);
    setActiveDashboardHeaderIndex((currentIndex) =>
      direction === "left"
        ? (currentIndex - 1 + dashboardHeaderLinks.length) %
          dashboardHeaderLinks.length
        : (currentIndex + 1) % dashboardHeaderLinks.length,
    );
  };
  const rotateDashboardHeaderMenu = (direction: "left" | "right") => {
    setDashboardHeaderSlideDirection(direction);
    setDashboardHeaderMenuActiveIndex((currentIndex) =>
      direction === "left"
        ? (currentIndex - 1 + DASHBOARD_HEADER_MENU_BLOCK_COUNT) %
          DASHBOARD_HEADER_MENU_BLOCK_COUNT
        : (currentIndex + 1) % DASHBOARD_HEADER_MENU_BLOCK_COUNT,
    );
  };
  const getDashboardHeaderMenuBlockSlot = (blockIndex: number) => {
    const relativeIndex =
      (blockIndex - dashboardHeaderMenuActiveIndex +
        DASHBOARD_HEADER_MENU_BLOCK_COUNT) %
      DASHBOARD_HEADER_MENU_BLOCK_COUNT;

    if (relativeIndex === 0) return "center";
    if (relativeIndex === 1) return "right";
    if (relativeIndex === DASHBOARD_HEADER_MENU_BLOCK_COUNT - 1) return "left";
    return "back";
  };
  const getDashboardAnalogOffset = (
    deltaX: number,
    deltaY: number,
    radius = 10,
  ): DashboardVerticalPointerStart => {
    const distance = Math.hypot(deltaX, deltaY);
    if (distance <= radius) return { x: deltaX, y: deltaY };

    const ratio = radius / distance;
    return {
      x: deltaX * ratio,
      y: deltaY * ratio,
    };
  };
  const rotateDashboardHeaderJourneyTabs = (
    direction: Extract<DashboardScrollButtonDirection, "down" | "up">,
  ) => {
    const { activeJourneyStepIndex, card, journeySteps } =
      getDashboardHeaderJourneyState();
    if (!card || journeySteps.length < 2) return false;
    const canMoveJourney =
      direction === "up"
        ? activeJourneyStepIndex > 0
        : activeJourneyStepIndex < journeySteps.length - 1;
    if (!canMoveJourney) return false;

    rotateDashboardJourneyStepOrbit(
      card,
      direction === "up" ? "left" : "right",
    );
    return true;
  };
  useEffect(() => {
    const { card, journeySteps } = getDashboardHeaderJourneyState();
    if (!card || journeySteps.length < 2) return;

    setActiveDashboardJourneyStepIndexes((currentIndexes) => {
      if (currentIndexes[card.title] === 0) return currentIndexes;

      return {
        ...currentIndexes,
        [card.title]: 0,
      };
    });
  }, [activeDashboardHeaderNormalizedIndex]);
  const pulseDashboardHeaderVortex = (
    direction: DashboardScrollButtonDirection,
  ) => {
    const nextMode = getDashboardHeaderVortexModeForDirection(direction);

    if (dashboardHeaderVortexPulseTimeoutRef.current !== null) {
      window.clearTimeout(dashboardHeaderVortexPulseTimeoutRef.current);
      dashboardHeaderVortexPulseTimeoutRef.current = null;
    }

    if (dashboardHeaderVortexSettleTimeoutRef.current !== null) {
      window.clearTimeout(dashboardHeaderVortexSettleTimeoutRef.current);
      dashboardHeaderVortexSettleTimeoutRef.current = null;
    }

    setDashboardHeaderVortexSettling(false);
    setDashboardHeaderVortexPulseMode(nextMode);
    dashboardHeaderVortexPulseTimeoutRef.current = window.setTimeout(() => {
      dashboardHeaderVortexPulseTimeoutRef.current = null;
      setDashboardHeaderVortexSettling(true);
      dashboardHeaderVortexSettleTimeoutRef.current = window.setTimeout(() => {
        setDashboardHeaderVortexPulseMode(null);
        setDashboardHeaderVortexSettling(false);
        dashboardHeaderVortexSettleTimeoutRef.current = null;
      }, 760);
    }, 680);
  };
  const settleDashboardHeaderVortex = (
    direction: DashboardScrollButtonDirection,
  ) => {
    const nextMode = getDashboardHeaderVortexModeForDirection(direction);

    if (dashboardHeaderVortexPulseTimeoutRef.current !== null) {
      window.clearTimeout(dashboardHeaderVortexPulseTimeoutRef.current);
      dashboardHeaderVortexPulseTimeoutRef.current = null;
    }

    if (dashboardHeaderVortexSettleTimeoutRef.current !== null) {
      window.clearTimeout(dashboardHeaderVortexSettleTimeoutRef.current);
      dashboardHeaderVortexSettleTimeoutRef.current = null;
    }

    setDashboardHeaderVortexPulseMode(nextMode);
    setDashboardHeaderVortexSettling(true);
    dashboardHeaderVortexSettleTimeoutRef.current = window.setTimeout(() => {
      setDashboardHeaderVortexPulseMode(null);
      setDashboardHeaderVortexSettling(false);
      dashboardHeaderVortexSettleTimeoutRef.current = null;
    }, 820);
  };
  const runDashboardHeaderScrollButtonDirection = (
    direction: DashboardScrollButtonDirection,
  ) => {
    wakeDashboardHeaderMenu();

    const didMove =
      direction === "left" || direction === "right"
        ? (rotateDashboardHeaderRail(direction), true)
        : rotateDashboardHeaderJourneyTabs(direction);

    if (!didMove) return false;

    pulseDashboardHeaderVortex(direction);

    setDashboardHeaderScrollButtonRoll((currentRoll) => {
      const directionalRoll =
        direction === "right"
          ? 120
          : direction === "left"
            ? -120
            : direction === "down"
              ? 110
              : -110;

      return currentRoll + directionalRoll;
    });

    return true;
  };
  const stopDashboardHeaderScrollButtonHold = () => {
    const releasedDirection = dashboardHeaderScrollButtonHoldDirectionRef.current;

    if (dashboardHeaderScrollButtonHoldTimeoutRef.current !== null) {
      window.clearTimeout(dashboardHeaderScrollButtonHoldTimeoutRef.current);
      dashboardHeaderScrollButtonHoldTimeoutRef.current = null;
    }

    if (dashboardHeaderScrollButtonHoldIntervalRef.current !== null) {
      window.clearInterval(dashboardHeaderScrollButtonHoldIntervalRef.current);
      dashboardHeaderScrollButtonHoldIntervalRef.current = null;
    }

    dashboardHeaderScrollButtonHoldDirectionRef.current = null;
    setDashboardHeaderScrollButtonActiveDirection(null);
    if (releasedDirection) {
      settleDashboardHeaderVortex(releasedDirection);
    }
  };
  const resetDashboardHeaderScrollButtonDrag = () => {
    dashboardHeaderScrollButtonPointerStartRef.current = null;
    setDashboardHeaderScrollButtonDragging(false);
    setDashboardHeaderAnalogOffset({ x: 0, y: 0 });
    stopDashboardHeaderScrollButtonHold();
  };
  const startDashboardHeaderScrollButtonHold = (
    direction: DashboardScrollButtonDirection,
  ) => {
    if (dashboardHeaderScrollButtonHoldDirectionRef.current === direction) {
      return;
    }

    stopDashboardHeaderScrollButtonHold();
    const didMove = runDashboardHeaderScrollButtonDirection(direction);
    if (!didMove) return;

    dashboardHeaderScrollButtonHoldDirectionRef.current = direction;
    setDashboardHeaderScrollButtonActiveDirection(direction);

    dashboardHeaderScrollButtonHoldTimeoutRef.current = window.setTimeout(() => {
      dashboardHeaderScrollButtonHoldIntervalRef.current = window.setInterval(
        () => {
          if (!runDashboardHeaderScrollButtonDirection(direction)) {
            stopDashboardHeaderScrollButtonHold();
          }
        },
        DASHBOARD_ANALOG_REPEAT_MS,
      );
    }, DASHBOARD_ANALOG_HOLD_DELAY_MS);
  };
  const handleDashboardHeaderScrollButtonPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    dashboardHeaderScrollButtonPointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    dashboardHeaderScrollButtonPointerMovedRef.current = false;
    setDashboardHeaderScrollButtonDragging(true);
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const handleDashboardHeaderScrollButtonPointerMove = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    const start = dashboardHeaderScrollButtonPointerStartRef.current;
    if (!start) return;

    event.stopPropagation();

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    if (Math.max(absDeltaX, absDeltaY) < 4) return;

    setDashboardHeaderAnalogOffset(
      getDashboardAnalogOffset(deltaX, deltaY, 10),
    );
    setDashboardHeaderScrollButtonRoll(
      (currentRoll) => currentRoll + deltaX * 1.1 + deltaY * 0.85,
    );

    if (Math.max(absDeltaX, absDeltaY) < DASHBOARD_ANALOG_DRAG_THRESHOLD) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    dashboardHeaderScrollButtonPointerMovedRef.current = true;

    const nextDirection: DashboardScrollButtonDirection =
      absDeltaX >= absDeltaY
        ? deltaX > 0
          ? "right"
          : "left"
        : deltaY > 0
          ? "down"
          : "up";

    startDashboardHeaderScrollButtonHold(nextDirection);
  };
  const handleDashboardHeaderScrollButtonPointerEnd = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    resetDashboardHeaderScrollButtonDrag();
    event.stopPropagation();

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }

    if (dashboardHeaderScrollButtonPointerMovedRef.current) {
      event.preventDefault();
      window.setTimeout(() => {
        dashboardHeaderScrollButtonPointerMovedRef.current = false;
      }, 0);
    }
  };
  const handleDashboardHeaderScrollButtonWheel = (
    event: ReactWheelEvent<HTMLButtonElement>,
  ) => {
    const absDeltaX = Math.abs(event.deltaX);
    const absDeltaY = Math.abs(event.deltaY);

    if (Math.max(absDeltaX, absDeltaY) < 8) return;

    event.preventDefault();
    event.stopPropagation();

    const nextDirection: DashboardScrollButtonDirection =
      absDeltaX > absDeltaY
        ? event.deltaX > 0
          ? "right"
          : "left"
        : event.deltaY > 0
          ? "down"
          : "up";

    if (runDashboardHeaderScrollButtonDirection(nextDirection)) {
      setDashboardHeaderScrollButtonActiveDirection(nextDirection);
      window.setTimeout(() => {
        if (!dashboardHeaderScrollButtonDragging) {
          setDashboardHeaderScrollButtonActiveDirection(null);
        }
      }, 220);
    }
  };
  const runDashboardHeaderMenuOrbitDirection = (
    direction: DashboardHorizontalScrollDirection,
  ) => {
    wakeDashboardHeaderMenu();

    rotateDashboardHeaderMenu(direction);
    pulseDashboardHeaderVortex(direction);

    setDashboardHeaderMenuOrbitRoll((currentRoll) =>
      currentRoll + (direction === "right" ? 120 : -120),
    );

    return true;
  };
  const stopDashboardHeaderMenuOrbitHold = () => {
    const releasedDirection = dashboardHeaderMenuOrbitHoldDirectionRef.current;

    if (dashboardHeaderMenuOrbitHoldTimeoutRef.current !== null) {
      window.clearTimeout(dashboardHeaderMenuOrbitHoldTimeoutRef.current);
      dashboardHeaderMenuOrbitHoldTimeoutRef.current = null;
    }

    if (dashboardHeaderMenuOrbitHoldIntervalRef.current !== null) {
      window.clearInterval(dashboardHeaderMenuOrbitHoldIntervalRef.current);
      dashboardHeaderMenuOrbitHoldIntervalRef.current = null;
    }

    dashboardHeaderMenuOrbitHoldDirectionRef.current = null;
    setDashboardHeaderMenuOrbitActiveDirection(null);
    if (releasedDirection) {
      settleDashboardHeaderVortex(releasedDirection);
    }
  };
  const resetDashboardHeaderMenuOrbitDrag = () => {
    dashboardHeaderMenuOrbitPointerStartRef.current = null;
    setDashboardHeaderMenuOrbitDragging(false);
    setDashboardHeaderMenuOrbitOffset({ x: 0, y: 0 });
    stopDashboardHeaderMenuOrbitHold();
  };
  const startDashboardHeaderMenuOrbitHold = (
    direction: DashboardHorizontalScrollDirection,
  ) => {
    if (dashboardHeaderMenuOrbitHoldDirectionRef.current === direction) {
      return;
    }

    stopDashboardHeaderMenuOrbitHold();
    runDashboardHeaderMenuOrbitDirection(direction);

    dashboardHeaderMenuOrbitHoldDirectionRef.current = direction;
    setDashboardHeaderMenuOrbitActiveDirection(direction);

    dashboardHeaderMenuOrbitHoldTimeoutRef.current = window.setTimeout(() => {
      dashboardHeaderMenuOrbitHoldIntervalRef.current = window.setInterval(
        () => runDashboardHeaderMenuOrbitDirection(direction),
        DASHBOARD_ANALOG_REPEAT_MS,
      );
    }, DASHBOARD_ANALOG_HOLD_DELAY_MS);
  };
  const handleDashboardHeaderMenuOrbitPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    dashboardHeaderMenuOrbitPointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    dashboardHeaderMenuOrbitPointerMovedRef.current = false;
    setDashboardHeaderMenuOrbitDragging(true);
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const handleDashboardHeaderMenuOrbitPointerMove = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    const start = dashboardHeaderMenuOrbitPointerStartRef.current;
    if (!start) return;

    event.stopPropagation();

    const deltaX = event.clientX - start.x;
    const absDeltaX = Math.abs(deltaX);
    if (absDeltaX < 4) return;

    setDashboardHeaderMenuOrbitOffset(getDashboardAnalogOffset(deltaX, 0, 10));
    setDashboardHeaderMenuOrbitRoll(
      (currentRoll) => currentRoll + deltaX * 1.1,
    );

    if (absDeltaX < DASHBOARD_ANALOG_DRAG_THRESHOLD) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    dashboardHeaderMenuOrbitPointerMovedRef.current = true;

    const nextDirection: DashboardHorizontalScrollDirection =
      deltaX > 0 ? "right" : "left";

    startDashboardHeaderMenuOrbitHold(nextDirection);
  };
  const handleDashboardHeaderMenuOrbitPointerEnd = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    resetDashboardHeaderMenuOrbitDrag();
    event.stopPropagation();

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }

    if (dashboardHeaderMenuOrbitPointerMovedRef.current) {
      event.preventDefault();
      window.setTimeout(() => {
        dashboardHeaderMenuOrbitPointerMovedRef.current = false;
      }, 0);
    }
  };
  const handleDashboardHeaderMenuOrbitWheel = (
    event: ReactWheelEvent<HTMLButtonElement>,
  ) => {
    const absDeltaX = Math.abs(event.deltaX);
    if (absDeltaX < 8) return;

    event.preventDefault();
    event.stopPropagation();

    const nextDirection: DashboardHorizontalScrollDirection =
      event.deltaX > 0 ? "right" : "left";

    runDashboardHeaderMenuOrbitDirection(nextDirection);
    setDashboardHeaderMenuOrbitActiveDirection(nextDirection);
    window.setTimeout(() => {
      if (!dashboardHeaderMenuOrbitDragging) {
        setDashboardHeaderMenuOrbitActiveDirection(null);
      }
    }, 220);
  };
  const rotateActiveDashboardOrbiterRow = (
    direction: DashboardOrbitDirection,
  ) => {
    if (clampedDashboardOrbiterRow === 0) {
      setHeroAchievementSlideDirection(direction);
      setActiveHeroAchievementIndex((currentIndex) => {
        const nextIndex =
          direction === "left" ? currentIndex - 1 : currentIndex + 1;

        return (nextIndex + heroAchievements.length) % heroAchievements.length;
      });
      return true;
    }

    if (clampedDashboardOrbiterRow === 1) {
      rotateDailyToolOrbit(direction);
      return true;
    }

    if (clampedDashboardOrbiterRow === 2) {
      rotateWeeklyRecap(direction);
      return true;
    }

    if (clampedDashboardOrbiterRow === 3) {
      rotateCommandCenter(direction);
      return true;
    }

    if (clampedDashboardOrbiterRow === 4) {
      rotateDashboardConsistencyMonth(direction === "left" ? -1 : 1);
      return true;
    }

    if (clampedDashboardOrbiterRow === 5) {
      rotateMySound(direction);
      return true;
    }

    if (clampedDashboardOrbiterRow === 6) {
      rotateSystemCenter(direction);
      return true;
    }

    return false;
  };
  const runDashboardPageAnalogDirection = (
    direction: DashboardScrollButtonDirection,
  ) => {
    const didMove =
      direction === "left" || direction === "right"
        ? rotateActiveDashboardOrbiterRow(direction)
        : direction === "up"
          ? clampedDashboardOrbiterRow > 0
          : clampedDashboardOrbiterRow < dashboardOrbiterRows.length - 1;
    if (!didMove) return false;

    setDashboardPageAnalogRoll(
      (currentRoll) =>
        currentRoll +
        (direction === "right"
          ? 120
          : direction === "left"
            ? -120
            : direction === "down"
              ? 110
              : -110),
    );

    if (direction === "left" || direction === "right") {
      return true;
    }

    moveDashboardOrbiterRow(direction === "up" ? -1 : 1);
    return true;
  };
  const stopDashboardPageAnalogHold = () => {
    if (dashboardPageAnalogHoldTimeoutRef.current !== null) {
      window.clearTimeout(dashboardPageAnalogHoldTimeoutRef.current);
      dashboardPageAnalogHoldTimeoutRef.current = null;
    }

    if (dashboardPageAnalogHoldIntervalRef.current !== null) {
      window.clearInterval(dashboardPageAnalogHoldIntervalRef.current);
      dashboardPageAnalogHoldIntervalRef.current = null;
    }

    dashboardPageAnalogHoldDirectionRef.current = null;
    setDashboardPageAnalogActiveDirection(null);
  };
  const resetDashboardPageAnalogDrag = () => {
    dashboardPageAnalogPointerStartRef.current = null;
    setDashboardPageAnalogDragging(false);
    setDashboardPageAnalogOffset({ x: 0, y: 0 });
    stopDashboardPageAnalogHold();
  };
  const startDashboardPageAnalogHold = (
    direction: DashboardScrollButtonDirection,
  ) => {
    if (dashboardPageAnalogHoldDirectionRef.current === direction) {
      return;
    }

    stopDashboardPageAnalogHold();
    const didMove = runDashboardPageAnalogDirection(direction);
    if (!didMove) return;

    dashboardPageAnalogHoldDirectionRef.current = direction;
    setDashboardPageAnalogActiveDirection(direction);

    dashboardPageAnalogHoldTimeoutRef.current = window.setTimeout(() => {
      dashboardPageAnalogHoldIntervalRef.current = window.setInterval(
        () => {
          if (!runDashboardPageAnalogDirection(direction)) {
            stopDashboardPageAnalogHold();
          }
        },
        DASHBOARD_ANALOG_REPEAT_MS,
      );
    }, DASHBOARD_ANALOG_HOLD_DELAY_MS);
  };
  const handleDashboardPageAnalogPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    dashboardPageAnalogPointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    dashboardPageAnalogPointerMovedRef.current = false;
    setDashboardPageAnalogDragging(true);
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const handleDashboardPageAnalogPointerMove = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    const start = dashboardPageAnalogPointerStartRef.current;
    if (!start) return;

    event.stopPropagation();

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    if (Math.max(absDeltaX, absDeltaY) < 4) return;

    setDashboardPageAnalogOffset(getDashboardAnalogOffset(deltaX, deltaY, 11));
    setDashboardPageAnalogRoll(
      (currentRoll) => currentRoll + deltaY * 1.2 - deltaX * 0.35,
    );

    if (Math.max(absDeltaX, absDeltaY) < DASHBOARD_ANALOG_DRAG_THRESHOLD) {
      return;
    }

    event.preventDefault();
    dashboardPageAnalogPointerMovedRef.current = true;

    const nextDirection: DashboardScrollButtonDirection =
      absDeltaX >= absDeltaY
        ? deltaX > 0
          ? "right"
          : "left"
        : deltaY > 0
          ? "down"
          : "up";

    startDashboardPageAnalogHold(nextDirection);
  };
  const handleDashboardPageAnalogPointerEnd = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    resetDashboardPageAnalogDrag();
    event.stopPropagation();

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }

    if (dashboardPageAnalogPointerMovedRef.current) {
      event.preventDefault();
      window.setTimeout(() => {
        dashboardPageAnalogPointerMovedRef.current = false;
      }, 0);
    }
  };
  const handleDashboardPageAnalogWheel = (
    event: ReactWheelEvent<HTMLButtonElement>,
  ) => {
    const absDeltaX = Math.abs(event.deltaX);
    const absDeltaY = Math.abs(event.deltaY);

    if (Math.max(absDeltaX, absDeltaY) < 8) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const nextDirection: DashboardScrollButtonDirection =
      absDeltaX > absDeltaY
        ? event.deltaX > 0
          ? "right"
          : "left"
        : event.deltaY > 0
          ? "down"
          : "up";

    if (runDashboardPageAnalogDirection(nextDirection)) {
      setDashboardPageAnalogActiveDirection(nextDirection);
      window.setTimeout(() => {
        if (!dashboardPageAnalogDragging) {
          setDashboardPageAnalogActiveDirection(null);
        }
      }, 220);
    }
  };
  useEffect(() => {
    if (
      !dashboardHeaderScrollButtonDragging &&
      !dashboardHeaderMenuOrbitDragging &&
      !dashboardPageAnalogDragging
    ) {
      return;
    }

    const releaseActiveJoystickDrag = () => {
      resetDashboardHeaderScrollButtonDrag();
      resetDashboardHeaderMenuOrbitDrag();
      resetDashboardPageAnalogDrag();
    };

    window.addEventListener("pointerup", releaseActiveJoystickDrag);
    window.addEventListener("pointercancel", releaseActiveJoystickDrag);
    window.addEventListener("blur", releaseActiveJoystickDrag);

    return () => {
      window.removeEventListener("pointerup", releaseActiveJoystickDrag);
      window.removeEventListener("pointercancel", releaseActiveJoystickDrag);
      window.removeEventListener("blur", releaseActiveJoystickDrag);
    };
  }, [
    dashboardHeaderMenuOrbitDragging,
    dashboardHeaderScrollButtonDragging,
    dashboardPageAnalogDragging,
  ]);
  const heroAchievements = [
    {
      category: "volume",
      href: ROUTES.dashboard.achievements,
      icon: "🏋️",
      label: "Volume Milestone",
      meta: "Training volume milestone",
      progress: 100,
      rarity: "gold",
      status: "completed",
      statusLabel: "Earned",
    },
    {
      category: "streak",
      href: ROUTES.dashboard.achievements,
      icon: "🔥",
      label: "5 Day Streak",
      meta: "Consistency streak",
      progress: 100,
      rarity: "gold",
      status: "completed",
      statusLabel: "Earned",
    },
    {
      category: "goal",
      href: ROUTES.dashboard.achievements,
      icon: "🎯",
      label: "Goal Locked",
      meta: "Plan direction set",
      progress: 100,
      rarity: "gold",
      status: "completed",
      statusLabel: "Earned",
    },
    {
      category: "volume",
      href: ROUTES.dashboard.achievements,
      icon: "💪",
      label: "Strength Builder",
      meta: "Progressive overload",
      progress: 72,
      rarity: "cyan",
      status: "active",
      statusLabel: "In progress",
    },
    {
      category: "performance",
      href: ROUTES.dashboard.achievements,
      icon: "🧠",
      label: "Consistency King",
      meta: "AI consistency trend",
      progress: 45,
      rarity: "cyan",
      status: "active",
      statusLabel: "In progress",
    },
    {
      category: "recovery",
      href: ROUTES.dashboard.achievements,
      icon: "😴",
      label: "Sleep Optimized",
      meta: "Recovery rhythm",
      progress: 28,
      rarity: "bronze",
      status: "active",
      statusLabel: "In progress",
    },
    {
      category: "performance",
      href: ROUTES.dashboard.achievements,
      icon: "🏆",
      label: "Elite Performer",
      meta: "Future prestige tier",
      progress: 0,
      rarity: "elite",
      status: "locked",
      statusLabel: "Locked",
    },
    {
      category: "performance",
      href: ROUTES.dashboard.achievements,
      icon: "⚡",
      label: "Power Surge",
      meta: "Explosive performance",
      progress: 0,
      rarity: "silver",
      status: "locked",
      statusLabel: "Locked",
    },
    {
      actionLabel: "Open",
      category: "performance",
      description: "See all badges, progress, and locked rewards.",
      href: ROUTES.dashboard.achievements,
      icon: "\u{1F3C6}",
      label: "View Achievements",
      progress: 100,
      rarity: "gold",
      status: "active",
      variant: "cta",
    },
  ] satisfies AchievementBadgeItem[];
  const heroAchievementCount = heroAchievements.length;
  const headerAchievementItems = heroAchievements.filter(
    (achievement) => achievement.variant !== "cta",
  );
  const headerAchievementTotal = Math.max(1, headerAchievementItems.length);
  const getHeaderAchievementProgress = (achievement: AchievementBadgeItem) => {
    const fallbackProgress =
      achievement.status === "completed"
        ? 100
        : achievement.status === "locked"
          ? 0
          : 48;

    return clampDashboardPercent(achievement.progress ?? fallbackProgress);
  };
  const getHeaderAchievementEstimate = (achievement: AchievementBadgeItem) => {
    const progress = getHeaderAchievementProgress(achievement);

    if (progress >= 100 || achievement.status === "completed") {
      return {
        fullLabel: `${achievement.label} is already earned`,
        label: "Earned",
      };
    }

    const plannedSessionsPerWeek = Math.max(
      1,
      dashboardSummary.weeklySessionGoal || DASHBOARD_WEEKLY_SESSION_GOAL,
    );
    const progressPerPlannedSession = 100 / plannedSessionsPerWeek;
    const sessionsRemaining = Math.max(
      1,
      Math.ceil((100 - progress) / progressPerPlannedSession),
    );
    const daysPerPlannedSession = 7 / plannedSessionsPerWeek;
    const daysRemaining = Math.max(
      1,
      Math.ceil(sessionsRemaining * daysPerPlannedSession),
    );
    const estimateDate = addDashboardDays(dashboardToday, daysRemaining);
    const estimateDateLabel = formatAchievementEstimateDate(estimateDate);
    const estimateFullDateLabel =
      formatAchievementEstimateFullDate(estimateDate);

    return {
      fullLabel: `${achievement.label} estimated completion ${estimateFullDateLabel} if the current plan pace is followed`,
      label: `Est. ${estimateDateLabel}`,
    };
  };
  const headerAchievementsEarned = headerAchievementItems.filter(
    (achievement) =>
      achievement.status === "completed" || (achievement.progress ?? 0) >= 100,
  ).length;
  const headerAchievementProgress = clampDashboardPercent(
    headerAchievementItems.reduce(
      (sum, achievement) => sum + getHeaderAchievementProgress(achievement),
      0,
    ) / headerAchievementTotal,
  );
  const normalizedHeaderAchievementIndex =
    headerAchievementItems.length > 0
      ? dashboardHeaderAchievementActiveIndex % headerAchievementItems.length
      : 0;
  const activeHeaderAchievement =
    headerAchievementItems[normalizedHeaderAchievementIndex] ??
    headerAchievementItems[0];
  const activeHeaderAchievementProgress = activeHeaderAchievement
    ? getHeaderAchievementProgress(activeHeaderAchievement)
    : 0;
  const activeHeaderAchievementEstimate = activeHeaderAchievement
    ? getHeaderAchievementEstimate(activeHeaderAchievement)
    : { fullLabel: "Achievement estimate unavailable", label: "Est. TBD" };
  const headerAchievementNext =
    headerAchievementItems.find(
      (achievement) =>
        achievement.status === "active" && (achievement.progress ?? 0) < 100,
    ) || headerAchievementItems.find((achievement) => achievement.status === "locked");
  const dashboardHeaderTimeoutPortalMeters = useMemo(() => {
    const prHighlights = dashboardSummary.compoundLiftHighlights;
    const activePrHighlight =
      prHighlights.length > 0
        ? prHighlights[
            dashboardHeaderPrActiveIndex % prHighlights.length
          ]
        : null;

    return [
      {
        id: "sessions",
        meta: `Reset ${dashboardWeeklySessionResetLabel}`,
        progress: dashboardSummary.weeklySessionProgress,
        title: "Sessions / Week",
        tone: "emerald",
        value: `${dashboardSummary.workoutsThisWeek}/${dashboardSummary.weeklySessionGoal}`,
      },
      {
        id: "plan",
        meta: dashboardPlanAttendanceCaption,
        progress: dashboardSummary.planSessionProgress,
        title: "Plan Sessions",
        tone: "amber",
        value: `${dashboardPlanSessionsAttended}/${dashboardSummary.planSessionTarget}`,
      },
      {
        id: "sets",
        meta: dashboardSummary.dailySetGroupSummary,
        progress: clampDashboardPercent(
          (dashboardSummary.dailySets /
            Math.max(1, dashboardSummary.dailySetGoal)) *
            100,
        ),
        title: "Daily Sets",
        tone: "emerald",
        value: `${dashboardSummary.dailySets}/${dashboardSummary.dailySetGoal}`,
      },
      {
        id: "pr",
        meta: activePrHighlight
          ? `${activePrHighlight.detail} / ${activePrHighlight.windowLabel}`
          : "30 day best pending",
        progress: dashboardSummary.prProgress,
        title: "Compound PR",
        tone: "cyan",
        value: activePrHighlight?.value ?? "0 lb",
      },
      {
        id: "achievements",
        meta: activeHeaderAchievement
          ? `${activeHeaderAchievement.label} / ${activeHeaderAchievementEstimate.label}`
          : "Achievement estimate pending",
        progress: headerAchievementProgress,
        title: "Achievements",
        tone: "gold",
        value: `${headerAchievementsEarned}/${headerAchievementTotal}`,
      },
      {
        id: "calories",
        meta: "Total week",
        progress: dashboardSummary.weeklyCaloriesProgress,
        title: "Weekly Calories",
        tone: "violet",
        value: dashboardSummary.weeklyCaloriesDisplay,
      },
      {
        id: "weight",
        meta: dashboardSummary.weightChangeTrendLabel,
        progress: dashboardSummary.weightChangeProgress,
        title: "Weight +/-",
        tone: dashboardSummary.weightChangeTone === "flat" ? "cyan" : "violet",
        value: dashboardSummary.weightChangeLabel,
      },
    ];
  }, [
    activeHeaderAchievement,
    activeHeaderAchievementEstimate.label,
    dashboardHeaderPrActiveIndex,
    dashboardPlanAttendanceCaption,
    dashboardPlanSessionsAttended,
    dashboardSummary,
    dashboardWeeklySessionResetLabel,
    headerAchievementProgress,
    headerAchievementTotal,
    headerAchievementsEarned,
  ]);
  const normalizedDashboardHeaderTimeoutMeterIndex =
    dashboardHeaderTimeoutPortalMeters.length > 0
      ? ((dashboardHeaderTimeoutMeterIndex %
          dashboardHeaderTimeoutPortalMeters.length) +
          dashboardHeaderTimeoutPortalMeters.length) %
        dashboardHeaderTimeoutPortalMeters.length
      : 0;
  const dashboardHeaderTimeoutPortalMeter =
    dashboardHeaderTimeoutPortalMeters[
      normalizedDashboardHeaderTimeoutMeterIndex
    ] ?? dashboardHeaderTimeoutPortalMeters[0];

  useEffect(() => {
    if (typeof window === "undefined") return;

    const clearPortalTimers = () => {
      if (dashboardHeaderTimeoutPortalIntervalRef.current !== null) {
        window.clearTimeout(dashboardHeaderTimeoutPortalIntervalRef.current);
        dashboardHeaderTimeoutPortalIntervalRef.current = null;
      }

      if (dashboardHeaderTimeoutPortalCloseTimeoutRef.current !== null) {
        window.clearTimeout(
          dashboardHeaderTimeoutPortalCloseTimeoutRef.current,
        );
        dashboardHeaderTimeoutPortalCloseTimeoutRef.current = null;
      }
    };

    clearPortalTimers();

    if (
      !dashboardHeaderTimedOut ||
      dashboardHeaderTimeoutPortalMeters.length === 0
    ) {
      setDashboardHeaderTimeoutPortalOpen(false);
      return;
    }

    const openPortal = (advanceMeter: boolean) => {
      setDashboardHeaderTimeoutPortalPosition({
        x: 36 + Math.random() * 28,
        y: 36 + Math.random() * 8,
      });

      if (advanceMeter) {
        setDashboardHeaderTimeoutMeterIndex(
          (currentIndex) =>
            (currentIndex + 1) % dashboardHeaderTimeoutPortalMeters.length,
        );
      } else {
        setDashboardHeaderTimeoutMeterIndex(
          (currentIndex) =>
            currentIndex % dashboardHeaderTimeoutPortalMeters.length,
        );
      }

      setDashboardHeaderTimeoutPortalOpen(true);

      if (dashboardHeaderTimeoutPortalCloseTimeoutRef.current !== null) {
        window.clearTimeout(
          dashboardHeaderTimeoutPortalCloseTimeoutRef.current,
        );
      }

      dashboardHeaderTimeoutPortalCloseTimeoutRef.current = window.setTimeout(
        () => {
          dashboardHeaderTimeoutPortalCloseTimeoutRef.current = null;
          setDashboardHeaderTimeoutPortalOpen(false);
        },
        DASHBOARD_HEADER_TIMEOUT_PORTAL_VISIBLE_MS,
      );
    };

    const scheduleNextPortal = (delayMs: number, advanceMeter: boolean) => {
      if (dashboardHeaderTimeoutPortalIntervalRef.current !== null) {
        window.clearTimeout(dashboardHeaderTimeoutPortalIntervalRef.current);
      }

      dashboardHeaderTimeoutPortalIntervalRef.current = window.setTimeout(
        () => {
          dashboardHeaderTimeoutPortalIntervalRef.current = null;
          openPortal(advanceMeter);
          scheduleNextPortal(DASHBOARD_HEADER_TIMEOUT_PORTAL_INTERVAL_MS, true);
        },
        delayMs,
      );
    };

    scheduleNextPortal(DASHBOARD_HEADER_TIMEOUT_PORTAL_BREAK_MS, false);

    return clearPortalTimers;
  }, [dashboardHeaderTimedOut, dashboardHeaderTimeoutPortalMeters.length]);

  useEffect(() => {
    if (headerAchievementItems.length < 2) return;

    const intervalId = window.setInterval(() => {
      setDashboardHeaderAchievementActiveIndex(
        (currentIndex) => (currentIndex + 1) % headerAchievementItems.length,
      );
    }, DASHBOARD_HEADER_ACHIEVEMENT_ROTATE_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [headerAchievementItems.length]);
  const getDashboardHeaderMeterSlot = (meterIndex: number) => {
    const relativeIndex =
      (meterIndex - dashboardHeaderMeterActiveIndex + DASHBOARD_HEADER_METER_COUNT) %
      DASHBOARD_HEADER_METER_COUNT;

    if (relativeIndex === 0) return "center";
    if (relativeIndex === 1) return "right";
    if (relativeIndex === DASHBOARD_HEADER_METER_COUNT - 1) return "left";
    return "back";
  };
  const normalizedDashboardHeaderMeterPanelActiveIndex =
    ((dashboardHeaderMeterPanelActiveIndex %
      DASHBOARD_HEADER_METER_PANEL_SECTION_COUNT) +
      DASHBOARD_HEADER_METER_PANEL_SECTION_COUNT) %
    DASHBOARD_HEADER_METER_PANEL_SECTION_COUNT;
  const getDashboardHeaderMeterPanelSectionSlot = (sectionIndex: number) => {
    const relativeIndex =
      (sectionIndex -
        normalizedDashboardHeaderMeterPanelActiveIndex +
        DASHBOARD_HEADER_METER_PANEL_SECTION_COUNT) %
      DASHBOARD_HEADER_METER_PANEL_SECTION_COUNT;

    if (relativeIndex === 0) return "center";
    if (relativeIndex === 1) return "right";
    if (relativeIndex === DASHBOARD_HEADER_METER_PANEL_SECTION_COUNT - 1) {
      return "left";
    }
    return "back";
  };
  const rotateDashboardHeaderMeterPanelSections = (
    direction: DashboardOrbitDirection,
  ) => {
    setDashboardHeaderMeterPanelActiveIndex((currentIndex) =>
      direction === "left"
        ? (currentIndex - 1 + DASHBOARD_HEADER_METER_PANEL_SECTION_COUNT) %
          DASHBOARD_HEADER_METER_PANEL_SECTION_COUNT
        : (currentIndex + 1) % DASHBOARD_HEADER_METER_PANEL_SECTION_COUNT,
    );
  };
  const dashboardHeaderPrCardCount =
    dashboardSummary.compoundLiftHighlights.length;
  const normalizedDashboardHeaderPrActiveIndex =
    dashboardHeaderPrCardCount > 0
      ? ((dashboardHeaderPrActiveIndex % dashboardHeaderPrCardCount) +
          dashboardHeaderPrCardCount) %
        dashboardHeaderPrCardCount
      : 0;
  const getDashboardHeaderPrCardSlot = (cardIndex: number) => {
    if (dashboardHeaderPrCardCount < 2) return "center";

    const relativeIndex =
      (cardIndex -
        normalizedDashboardHeaderPrActiveIndex +
        dashboardHeaderPrCardCount) %
      dashboardHeaderPrCardCount;

    if (relativeIndex === 0) return "center";
    if (relativeIndex === 1) return "right";
    if (relativeIndex === dashboardHeaderPrCardCount - 1) return "left";
    return "back";
  };
  const rotateDashboardHeaderPrCards = (direction: DashboardOrbitDirection) => {
    if (dashboardHeaderPrCardCount < 2) return;

    setDashboardHeaderPrActiveIndex((currentIndex) =>
      direction === "left"
        ? (currentIndex - 1 + dashboardHeaderPrCardCount) %
          dashboardHeaderPrCardCount
        : (currentIndex + 1) % dashboardHeaderPrCardCount,
    );
  };
  const dashboardHeaderCategoryLevelCount = dashboardHeaderCategoryLevels.length;
  const normalizedDashboardHeaderCategoryLevelActiveIndex =
    dashboardHeaderCategoryLevelCount > 0
      ? ((dashboardHeaderCategoryLevelActiveIndex %
          dashboardHeaderCategoryLevelCount) +
          dashboardHeaderCategoryLevelCount) %
        dashboardHeaderCategoryLevelCount
      : 0;
  const getDashboardHeaderCategoryLevelSlot = (categoryIndex: number) => {
    if (dashboardHeaderCategoryLevelCount < 2) return "center";

    const relativeIndex =
      (categoryIndex -
        normalizedDashboardHeaderCategoryLevelActiveIndex +
        dashboardHeaderCategoryLevelCount) %
      dashboardHeaderCategoryLevelCount;

    if (relativeIndex === 0) return "center";
    if (relativeIndex === 1) return "right";
    if (relativeIndex === 2) return "far-right";
    if (relativeIndex === dashboardHeaderCategoryLevelCount - 1) return "left";
    if (relativeIndex === dashboardHeaderCategoryLevelCount - 2) {
      return "far-left";
    }
    return "back";
  };
  const rotateDashboardHeaderCategoryLevels = (
    direction: DashboardOrbitDirection,
  ) => {
    if (dashboardHeaderCategoryLevelCount < 2) return;

    setDashboardHeaderCategoryLevelActiveIndex((currentIndex) =>
      direction === "left"
        ? (currentIndex - 1 + dashboardHeaderCategoryLevelCount) %
          dashboardHeaderCategoryLevelCount
        : (currentIndex + 1) % dashboardHeaderCategoryLevelCount,
    );
  };
  const handleDashboardHeaderPrWheel = (
    event: ReactWheelEvent<HTMLDivElement>,
  ) => {
    const primaryDelta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;

    if (Math.abs(primaryDelta) < 14) return;

    event.preventDefault();
    event.stopPropagation();

    const now = Date.now();
    if (now - dashboardHeaderPrWheelLockRef.current < 260) return;

    dashboardHeaderPrWheelLockRef.current = now;
    rotateDashboardHeaderPrCards(primaryDelta > 0 ? "right" : "left");
  };
  const handleDashboardHeaderMeterPanelWheel = (
    event: ReactWheelEvent<HTMLDivElement>,
  ) => {
    const primaryDelta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;

    if (Math.abs(primaryDelta) < 14) return;

    event.preventDefault();
    event.stopPropagation();

    const now = Date.now();
    if (now - dashboardHeaderMeterPanelWheelLockRef.current < 260) return;

    dashboardHeaderMeterPanelWheelLockRef.current = now;
    rotateDashboardHeaderMeterPanelSections(
      primaryDelta > 0 ? "right" : "left",
    );
  };
  const handleDashboardHeaderCategoryLevelWheel = (
    event: ReactWheelEvent<HTMLDivElement>,
  ) => {
    const primaryDelta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;

    if (Math.abs(primaryDelta) < 14) return;

    event.preventDefault();
    event.stopPropagation();

    const now = Date.now();
    if (now - dashboardHeaderCategoryLevelWheelLockRef.current < 260) return;

    dashboardHeaderCategoryLevelWheelLockRef.current = now;
    rotateDashboardHeaderCategoryLevels(primaryDelta > 0 ? "right" : "left");
  };
  const rotateHeroAchievement = (direction: DashboardOrbitDirection) => {
    if (heroAchievementCount < 2) return;

    setHeroAchievementSlideDirection(direction);
    setActiveHeroAchievementIndex((currentIndex) =>
      direction === "left"
        ? (currentIndex - 1 + heroAchievementCount) % heroAchievementCount
        : (currentIndex + 1) % heroAchievementCount,
    );
  };
  const getHeroAchievementOrbitDistance = (index: number) => {
    if (heroAchievementCount <= 1) return 0;

    const rawDistance = index - activeHeroAchievementIndex;

    if (rawDistance > heroAchievementCount / 2) {
      return rawDistance - heroAchievementCount;
    }

    if (rawDistance < -heroAchievementCount / 2) {
      return rawDistance + heroAchievementCount;
    }

    return rawDistance;
  };
  const finishHeroAchievementPointer = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    heroAchievementPointerStartRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }

    if (!heroAchievementPointerMovedRef.current) return;

    event.preventDefault();
    window.setTimeout(() => {
      heroAchievementPointerMovedRef.current = false;
    }, 0);
  };
  const handleHeroAchievementWheel = (
    event: ReactWheelEvent<HTMLDivElement>,
  ) => {
    const horizontalIntent =
      Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey;
    const primaryDelta = horizontalIntent
      ? event.shiftKey && Math.abs(event.deltaY) >= Math.abs(event.deltaX)
        ? event.deltaY
        : event.deltaX
      : event.deltaY;

    if (Math.abs(primaryDelta) < 18) return;

    event.preventDefault();
    event.stopPropagation();

    const now = Date.now();
    if (now - heroAchievementWheelLockRef.current < 280) return;

    heroAchievementWheelLockRef.current = now;
    rotateHeroAchievement(primaryDelta > 0 ? "right" : "left");
  };

  const renderDashboardCompletionDot = (
    completion: number,
    isActive = false,
    positionClass = "-bottom-1 -right-1",
  ) => {
    const pulseTone = getDashboardPulseIndicatorTone(completion);

    return (
      <span
        aria-hidden="true"
        className={`profile-row-card-indicator absolute ${positionClass} inline-flex h-4 w-4 items-center justify-center rounded-full border bg-slate-950/78 backdrop-blur ${isActive ? pulseTone.outerActive : pulseTone.outerInactive}`}
        data-active={isActive ? "true" : undefined}
        data-profile-indicator-motion={pulseTone.motion}
        style={pulseTone.style}
      >
        <span
          className={`h-2 w-2 rounded-full ${isActive ? pulseTone.dotActive : pulseTone.dotInactive}`}
          data-profile-pulse-dot="true"
        />
      </span>
    );
  };

  const getDefaultDashboardJourneyStepIndex = (
    steps: DashboardJourneyStep[],
  ) => {
    const activeIndex = steps.findIndex((step) => step.state === "active");
    if (activeIndex >= 0) return activeIndex;

    const defaultIndex = steps.findIndex((step) => step.state === "default");
    if (defaultIndex >= 0) return defaultIndex;

    const completeIndex = steps.findIndex((step) => step.state === "complete");
    return completeIndex >= 0 ? completeIndex : 0;
  };

  const getActiveDashboardJourneyStepIndex = (
    card: DashboardNavigationCard,
  ) => {
    const steps = card.journeySteps || [];
    if (!steps.length) return 0;

    const savedIndex = activeDashboardJourneyStepIndexes[card.title];
    if (
      typeof savedIndex === "number" &&
      savedIndex >= 0 &&
      savedIndex < steps.length
    ) {
      return savedIndex;
    }

    return getDefaultDashboardJourneyStepIndex(steps);
  };

  const getDashboardJourneyStepOrbitDistance = (
    index: number,
    activeIndex: number,
    itemCount: number,
  ) => {
    if (itemCount <= 1) return 0;

    const rawDistance = index - activeIndex;

    if (rawDistance > itemCount / 2) return rawDistance - itemCount;
    if (rawDistance < -itemCount / 2) return rawDistance + itemCount;

    return rawDistance;
  };

  const rotateDashboardJourneyStepOrbit = (
    card: DashboardNavigationCard,
    direction: DashboardOrbitDirection,
  ) => {
    const steps = card.journeySteps || [];
    if (steps.length < 2) return;

    setActiveDashboardJourneyStepIndexes((currentIndexes) => {
      const savedIndex = currentIndexes[card.title];
      const currentIndex =
        typeof savedIndex === "number" &&
        savedIndex >= 0 &&
        savedIndex < steps.length
          ? savedIndex
          : getDefaultDashboardJourneyStepIndex(steps);
      const nextIndex =
        direction === "left"
          ? (currentIndex - 1 + steps.length) % steps.length
          : (currentIndex + 1) % steps.length;

      return {
        ...currentIndexes,
        [card.title]: nextIndex,
      };
    });
  };

  const getDashboardJourneyStepTone = (
    step: DashboardJourneyStep,
    stepIndex = 0,
  ): DashboardCardTone => {
    const key = `${step.icon} ${step.label}`.toLowerCase();

    if (key.includes("dashboard") || key.includes("overview")) {
      return "sky";
    }
    if (key.includes("goal") || key.includes("plan")) {
      return "emerald";
    }
    if (
      key.includes("builder") ||
      key.includes("workout") ||
      key.includes("session")
    ) {
      return "amber";
    }
    if (key.includes("exercise") || key.includes("library")) {
      return "violet";
    }
    if (key.includes("hydrate") || key.includes("hydration")) {
      return "cyan";
    }
    if (key.includes("meal") || key.includes("nutrition")) {
      return "emerald";
    }
    if (key.includes("grocery") || key.includes("calories")) {
      return "amber";
    }
    if (key.includes("recovery")) {
      return "cyan";
    }
    if (
      key.includes("performance") ||
      key.includes("power") ||
      key.includes("run") ||
      key.includes("cardio")
    ) {
      return "amber";
    }
    if (key.includes("stat") || key.includes("metric") || key.includes("trend")) {
      return "violet";
    }
    if (
      key.includes("sound") ||
      key.includes("world") ||
      key.includes("feed") ||
      key.includes("post") ||
      key.includes("social") ||
      key.includes("trophy") ||
      key.includes("achievement")
    ) {
      return "fuchsia";
    }
    if (
      key.includes("education") ||
      key.includes("lesson") ||
      key.includes("logic") ||
      key.includes("form") ||
      key.includes("app")
    ) {
      return "sky";
    }

    return (["cyan", "emerald", "amber", "violet", "fuchsia", "sky"] as const)[
      stepIndex % 6
    ];
  };

  const getDashboardJourneyStepIconTone = (
    step: DashboardJourneyStep,
    isActive: boolean,
    stepIndex = 0,
  ) => {
    const strength = isActive ? "active" : "idle";

    return dashboardIconToneStyles[getDashboardJourneyStepTone(step, stepIndex)][
      strength
    ];
  };

  const getDashboardHeaderJourneyCard = () => {
    if (activeDashboardHeaderLink.href === ROUTES.dashboard.sessions) {
      return dashboardNavigationCards.find(
        (card) => card.title === "Workout / Sessions",
      );
    }

    return dashboardNavigationCards.find(
      (card) =>
        card.href === activeDashboardHeaderLink.href ||
        card.title === activeDashboardHeaderLink.label,
    );
  };

  const getDashboardHeaderJourneyState = () => {
    const card = getDashboardHeaderJourneyCard();
    const journeySteps = card?.journeySteps?.length
      ? card.journeySteps
      : [
          {
            completion: activeDashboardHeaderLink.completion,
            href: activeDashboardHeaderLink.href,
            icon: activeDashboardHeaderLink.icon,
            label: activeDashboardHeaderLink.label,
            state: "active" as const,
          },
        ];
    const activeJourneyStepIndex = card
      ? getActiveDashboardJourneyStepIndex(card)
      : 0;

    return {
      activeJourneyStep:
        journeySteps[activeJourneyStepIndex] || journeySteps[0],
      activeJourneyStepIndex,
      card,
      journeySteps,
    };
  };

  const getDashboardHeaderActiveJourneyStepLabel = () =>
    getDashboardHeaderJourneyState().activeJourneyStep?.label ||
    activeDashboardHeaderLink.label;

  const dashboardHeaderActiveJourneyStepLabel =
    getDashboardHeaderActiveJourneyStepLabel();
  const dashboardHeaderNewsHeadlines = useMemo<DashboardHeaderNewsHeadline[]>(
    () => {
      const activeHref = activeDashboardHeaderLink.href;
      const planSessionsRemaining = Math.max(
        0,
        dashboardSummary.planSessionTarget - dashboardPlanSessionsAttended,
      );
      const weeklyVolumeLabel = Math.round(
        dashboardSummary.weeklyVolume,
      ).toLocaleString();
      const latestLiftLabel = dashboardSummary.hasStats
        ? dashboardSummary.latestExercise
        : "your first logged lift";
      const stageAdvice =
        activeHref === ROUTES.dashboard.sessions
          ? "Start the planned session, then leave one honest note before you exit."
          : activeHref === ROUTES.dashboard.profile
            ? "Cleaner profile inputs make every plan adjustment feel smarter."
            : activeHref === ROUTES.dashboard.goals
              ? "Pick one outcome and one repeatable behavior for this week."
              : activeHref === ROUTES.nutritionPortal.home
                ? "Anchor protein and hydration before chasing perfect numbers."
                : activeHref === ROUTES.dashboard.recovery
                  ? "Protect sleep and warmups so tomorrow has something to build on."
                  : activeHref === ROUTES.performance.home
                    ? "Compare patterns, not moods; the trend is the signal."
                    : "Make the next action small enough to start today.";
      const progressAdvice =
        activeDashboardHeaderLink.completion < 35
          ? "Early-stage win: remove friction and count the smallest clean start."
          : activeDashboardHeaderLink.completion < 70
            ? "Middle-stage win: repeat the plan before adding complexity."
            : "Late-stage win: polish consistency and protect recovery.";
      const makeChyronHeadline = (
        category: string,
        label: string,
        tone?: DashboardHeaderNewsHeadline["tone"],
      ): DashboardHeaderNewsHeadline => ({
        category,
        label,
        tone,
      });

      return [
        makeChyronHeadline(
          "ADVICE",
          `${activeDashboardHeaderLink.label} / ${dashboardHeaderActiveJourneyStepLabel}`,
          "advice",
        ),
        makeChyronHeadline(
          "ALERT",
          activeDashboardHeaderUrgencyTone.label,
          "alert",
        ),
        makeChyronHeadline("ADVICE", stageAdvice, "advice"),
        makeChyronHeadline("ADVICE", progressAdvice, "advice"),
        makeChyronHeadline(
          "STATUS",
          `${dashboardPlanSessionsAttended}/${dashboardSummary.planSessionTarget} plan sessions logged; ${planSessionsRemaining} to go`,
        ),
        makeChyronHeadline(
          "STATUS",
          `${dashboardSummary.workoutsThisWeek} sessions this week / ${soundPoints.toLocaleString()} sound points`,
        ),
        makeChyronHeadline(
          "SIGNAL",
          `${dashboardSummary.dailySets}/${dashboardSummary.dailySetGoal} daily sets and ${weeklyVolumeLabel} lb weekly volume`,
        ),
        makeChyronHeadline(
          "SIGNAL",
          `${dashboardSummary.weeklyCaloriesDisplay} weekly calories / weight ${dashboardSummary.weightChangeLabel} (${dashboardSummary.weightChangeTrendLabel})`,
          "advice",
        ),
        makeChyronHeadline(
          "ADVICE",
          `${dashboardHeaderActiveJourneyStepLabel}; make it obvious enough to do tired.`,
          "advice",
        ),
        makeChyronHeadline(
          "ADVICE",
          `${latestLiftLabel}; add load, reps, control, range, or cleaner rest.`,
          "advice",
        ),
        makeChyronHeadline(
          "QUOTE",
          `Ronnie Coleman: "Ain't nothing to it but to do it."`,
          "quote",
        ),
        makeChyronHeadline(
          "QUOTE",
          `Muhammad Ali: "Don't count the days, make the days count."`,
          "quote",
        ),
        makeChyronHeadline(
          "QUOTE",
          `Arnold Schwarzenegger: "The last three or four reps" are where growth gets earned.`,
          "quote",
        ),
        makeChyronHeadline(
          "TRIVIA",
          "progressive overload can be load, reps, sets, control, range, or rest.",
          "trivia",
        ),
        makeChyronHeadline(
          "TRIVIA",
          "creatine helps recycle ATP for repeated high-output efforts.",
          "trivia",
        ),
        makeChyronHeadline(
          "TRIVIA",
          "soreness is not the scoreboard; performance and recovery trends matter more.",
          "trivia",
        ),
      ];
    },
    [
      activeDashboardHeaderLink.completion,
      activeDashboardHeaderLink.href,
      activeDashboardHeaderLink.label,
      activeDashboardHeaderUrgencyTone.label,
      dashboardHeaderActiveJourneyStepLabel,
      dashboardPlanSessionsAttended,
      dashboardSummary.dailySetGoal,
      dashboardSummary.dailySets,
      dashboardSummary.hasStats,
      dashboardSummary.latestExercise,
      dashboardSummary.workoutsThisWeek,
      dashboardSummary.planSessionTarget,
      dashboardSummary.weeklyCaloriesDisplay,
      dashboardSummary.weeklyVolume,
      dashboardSummary.weightChangeLabel,
      dashboardSummary.weightChangeTrendLabel,
      soundPoints,
    ],
  );

  useEffect(() => {
    dashboardHeaderNewsHeadlinesRef.current = dashboardHeaderNewsHeadlines;
    dashboardHeaderNewsHeadlineIndexRef.current =
      dashboardHeaderNewsHeadlineIndexRef.current %
      Math.max(1, dashboardHeaderNewsHeadlines.length);

    const headline =
      dashboardHeaderNewsHeadlines[
        dashboardHeaderNewsHeadlineIndexRef.current
      ] || dashboardHeaderNewsHeadlines[0];
    const headlineElement = dashboardHeaderNewsHeadlineRef.current;
    const kickerElement = dashboardHeaderNewsKickerRef.current;

    if (headlineElement && headline) {
      headlineElement.textContent = headline.label;
      headlineElement.dataset.newsTone = headline.tone || "default";
    }

    if (kickerElement && headline) {
      kickerElement.textContent = headline.category;
      kickerElement.dataset.newsTone = headline.tone || "default";
    }
  }, [dashboardHeaderNewsHeadlines]);

  useEffect(() => {
    let entryTimeout: number | null = null;

    const clearEntryTimeout = () => {
      if (entryTimeout !== null) {
        window.clearTimeout(entryTimeout);
        entryTimeout = null;
      }
    };

    const showNextHeadline = () => {
      const headlineElement = dashboardHeaderNewsHeadlineRef.current;
      const kickerElement = dashboardHeaderNewsKickerRef.current;
      const headlines = dashboardHeaderNewsHeadlinesRef.current;
      if (!headlineElement || headlines.length < 2) return;

      dashboardHeaderNewsHeadlineIndexRef.current =
        (dashboardHeaderNewsHeadlineIndexRef.current + 1) % headlines.length;
      const nextHeadline =
        headlines[dashboardHeaderNewsHeadlineIndexRef.current] || headlines[0];

      headlineElement.classList.remove(
        "dashboard-header-news-chyron__item--entering",
      );
      void headlineElement.offsetHeight;
      headlineElement.textContent = nextHeadline.label;
      headlineElement.dataset.newsTone = nextHeadline.tone || "default";
      if (kickerElement) {
        kickerElement.textContent = nextHeadline.category;
        kickerElement.dataset.newsTone = nextHeadline.tone || "default";
      }
      headlineElement.classList.add(
        "dashboard-header-news-chyron__item--entering",
      );
      clearEntryTimeout();
      entryTimeout = window.setTimeout(() => {
        headlineElement.classList.remove(
          "dashboard-header-news-chyron__item--entering",
        );
        entryTimeout = null;
      }, 260);
    };

    const headlineInterval = window.setInterval(showNextHeadline, 3800);

    return () => {
      window.clearInterval(headlineInterval);
      clearEntryTimeout();
    };
  }, []);

  const isDashboardProfileRailStep = (step: DashboardJourneyStep) =>
    step.icon.toLowerCase() === "profile" ||
    step.label.toLowerCase() === "profile";

  const renderDashboardHeaderJourneyStepIcon = (
    step: DashboardJourneyStep,
    className: string,
  ) => {
    if (isDashboardProfileRailStep(step)) {
      return (
        <span
          aria-hidden="true"
          className={`dashboard-header-profile-rail-logo relative z-10 grid place-items-center overflow-hidden rounded-full ${className}`}
        >
          <img
            alt=""
            className="h-full w-full rounded-full object-contain p-[1px]"
            draggable={false}
            onError={(event) => {
              event.currentTarget.src = DASHBOARD_PROFILE_ICON_FALLBACK;
            }}
            src={dashboardProfileIconUrl || DASHBOARD_PROFILE_ICON_FALLBACK}
          />
        </span>
      );
    }

    return (
      <DashboardTabIcon
        className={className}
        label={step.label}
        name={step.icon}
      />
    );
  };

  const renderDashboardHeaderPageOrbitRail = () => {
    const headerRailSlots: Record<
      number,
      { opacity: number; rotate: number; scale: number; x: number; y: number; zIndex: number }
    > = {
      [-2]: { opacity: 0.44, rotate: -20, scale: 0.64, x: 36, y: 16, zIndex: 10 },
      [-1]: { opacity: 0.76, rotate: -10, scale: 0.78, x: 60, y: 11, zIndex: 16 },
      1: { opacity: 0.76, rotate: 10, scale: 0.78, x: 60, y: 69, zIndex: 16 },
      2: { opacity: 0.44, rotate: 20, scale: 0.64, x: 36, y: 66, zIndex: 10 },
    };
    const { activeJourneyStepIndex, card, journeySteps } =
      getDashboardHeaderJourneyState();
    const railSteps = journeySteps
      .map((step, stepIndex) => {
        const distance = stepIndex - activeJourneyStepIndex;

        return { distance, step, stepIndex };
      })
      .filter(({ distance }) => distance !== 0 && Math.abs(distance) <= 2);

    if (!card || !railSteps.length) return null;

    const hasRailPagesAbove = railSteps.some(({ distance }) => distance < 0);
    const hasRailPagesBelow = railSteps.some(({ distance }) => distance > 0);
    const upperRailParticlePath = "M20 24 C42 7 66 5 84 15 C91 20 92 30 88 39";
    const lowerRailParticlePath = "M20 56 C42 76 66 79 84 63 C91 58 92 48 88 39";
    const upperRailCounterParticlePath =
      "M88 39 C92 30 91 20 84 15 C66 5 42 7 20 24";
    const lowerRailCounterParticlePath =
      "M88 39 C92 48 91 58 84 63 C66 79 42 76 20 56";
    const isDashboardHeaderVortexCounter =
      dashboardHeaderVortexMode === "counter";
    const upperRailMotionPath = isDashboardHeaderVortexCounter
      ? upperRailCounterParticlePath
      : upperRailParticlePath;
    const lowerRailMotionPath = isDashboardHeaderVortexCounter
      ? lowerRailCounterParticlePath
      : lowerRailParticlePath;
    const railDashOffsetValues = isDashboardHeaderVortexCounter
      ? "0;106"
      : "106;0";
    const isDashboardHeaderVortexAnimating = Boolean(dashboardHeaderVortexMode);
    const railParticleBursts = [
      {
        delay: "0s",
        dur: "2.45s",
        fill: "var(--dashboard-header-journey-motion-alt, rgba(254,240,138,0.96))",
        rValues: "0.16;0.34;0.58;0.16",
      },
      {
        delay: "0.22s",
        dur: "2.9s",
        fill: "var(--dashboard-header-journey-circle, rgba(103,232,249,0.92))",
        rValues: "0.14;0.3;0.5;0.14",
      },
      {
        delay: "0.44s",
        dur: "2.65s",
        fill: "rgba(255,255,255,0.92)",
        rValues: "0.1;0.24;0.4;0.1",
      },
      {
        delay: "0.72s",
        dur: "3.2s",
        fill: "var(--dashboard-header-journey-motion, rgba(34,211,238,0.92))",
        rValues: "0.12;0.28;0.46;0.12",
      },
      {
        delay: "1.04s",
        dur: "2.75s",
        fill: "var(--dashboard-header-journey-halo, rgba(34,211,238,0.72))",
        rValues: "0.11;0.25;0.42;0.11",
      },
      {
        delay: "1.32s",
        dur: "3.45s",
        fill: "var(--dashboard-header-journey-motion-alt, rgba(254,240,138,0.82))",
        rValues: "0.1;0.22;0.38;0.1",
      },
      {
        delay: "1.72s",
        dur: "2.55s",
        fill: "var(--dashboard-header-journey-circle, rgba(103,232,249,0.78))",
        rValues: "0.09;0.2;0.34;0.09",
      },
      {
        delay: "2.08s",
        dur: "3.75s",
        fill: "rgba(255,255,255,0.78)",
        rValues: "0.08;0.17;0.3;0.08",
      },
      {
        delay: "0.1s",
        dur: "2.2s",
        fill: "var(--dashboard-header-journey-motion, rgba(125,211,252,0.86))",
        rValues: "0.08;0.18;0.36;0.08",
      },
      {
        delay: "0.36s",
        dur: "2.38s",
        fill: "var(--dashboard-header-journey-motion-alt, rgba(254,240,138,0.78))",
        rValues: "0.07;0.19;0.34;0.07",
      },
      {
        delay: "0.84s",
        dur: "2.18s",
        fill: "var(--dashboard-header-journey-circle, rgba(103,232,249,0.72))",
        rValues: "0.06;0.17;0.32;0.06",
      },
      {
        delay: "1.18s",
        dur: "2.32s",
        fill: "rgba(236,254,255,0.72)",
        rValues: "0.06;0.15;0.28;0.06",
      },
      {
        delay: "1.58s",
        dur: "2.48s",
        fill: "var(--dashboard-header-journey-halo, rgba(14,165,233,0.70))",
        rValues: "0.07;0.18;0.31;0.07",
      },
      {
        delay: "1.92s",
        dur: "2.26s",
        fill: "var(--dashboard-header-journey-motion-alt, rgba(250,204,21,0.68))",
        rValues: "0.06;0.14;0.26;0.06",
      },
    ];
    const renderRailParticles = (
      path: string,
      side: "above" | "below",
    ) => {
      const visibleRailParticleBursts = isDashboardHeaderVortexAnimating
        ? railParticleBursts
        : railParticleBursts.slice(0, 3).map((particle, particleIndex) => ({
            ...particle,
            delay: `${particleIndex * 1.85}s`,
            dur: "9.4s",
            rValues: "0.05;0.1;0.18;0.05",
          }));

      return (
        <g
          aria-hidden="true"
          className={`dashboard-header-page-orbit-rail__particles dashboard-header-page-orbit-rail__particles--${dashboardHeaderVortexPhase}`}
          filter="url(#dashboard-header-page-orbit-rail-glow)"
        >
          {visibleRailParticleBursts.map((particle, particleIndex) => (
            <circle
              fill={particle.fill}
              key={`${side}-${particleIndex}-rail-particle`}
              opacity="0"
              r="0.16"
            >
              <animateMotion
                begin={particle.delay}
                dur={particle.dur}
                path={path}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                begin={particle.delay}
                dur={particle.dur}
                repeatCount="indefinite"
                values={
                  isDashboardHeaderVortexAnimating
                    ? "0;0.18;0.48;0.18;0"
                    : "0;0.05;0.14;0.05;0"
                }
              />
              <animate
                attributeName="r"
                begin={particle.delay}
                dur={particle.dur}
                repeatCount="indefinite"
                values={particle.rValues}
              />
            </circle>
          ))}
        </g>
      );
    };
    const renderRailSparkField = (side: "above" | "below") => {
      if (!isDashboardHeaderVortexAnimating) return null;

      const yOffset = side === "above" ? -1 : 1;
      const sparkField = [
        { delay: "0s", r: 0.2, x: 26, y: 32 + yOffset * 8 },
        { delay: "0.18s", r: 0.17, x: 34, y: 31 + yOffset * 13 },
        { delay: "0.34s", r: 0.15, x: 44, y: 29 + yOffset * 16 },
        { delay: "0.5s", r: 0.21, x: 54, y: 28 + yOffset * 18 },
        { delay: "0.66s", r: 0.16, x: 64, y: 30 + yOffset * 15 },
        { delay: "0.82s", r: 0.18, x: 74, y: 33 + yOffset * 10 },
        { delay: "1.04s", r: 0.14, x: 82, y: 36 + yOffset * 5 },
        { delay: "1.26s", r: 0.15, x: 48, y: 40 + yOffset * 17 },
        { delay: "1.48s", r: 0.13, x: 60, y: 40 + yOffset * 14 },
        { delay: "1.66s", r: 0.12, x: 30, y: 36 + yOffset * 11 },
        { delay: "1.84s", r: 0.1, x: 39, y: 34 + yOffset * 16 },
        { delay: "2.02s", r: 0.12, x: 70, y: 34 + yOffset * 13 },
        { delay: "2.18s", r: 0.09, x: 78, y: 38 + yOffset * 8 },
        { delay: "2.36s", r: 0.11, x: 52, y: 34 + yOffset * 19 },
        { delay: "2.54s", r: 0.09, x: 88, y: 39 + yOffset * 4 },
      ];

      return (
        <g
          aria-hidden="true"
          className="dashboard-header-page-orbit-rail__spark-field"
        >
          {sparkField.map((spark, sparkIndex) => (
            <circle
              cx={spark.x}
              cy={spark.y}
              fill={
                sparkIndex % 2 === 0
                  ? "var(--dashboard-header-journey-motion-alt, rgba(254,240,138,0.9))"
                  : "var(--dashboard-header-journey-circle, rgba(103,232,249,0.86))"
              }
              key={`${side}-${sparkIndex}-rail-spark`}
              opacity="0.24"
              r={spark.r}
            >
              <animate
                attributeName="opacity"
                begin={spark.delay}
                dur="2.35s"
                repeatCount="indefinite"
                values="0.02;0.34;0.1;0.24;0.02"
              />
              <animate
                attributeName="r"
                begin={spark.delay}
                dur="2.35s"
                repeatCount="indefinite"
                values={`${Math.max(0.06, spark.r - 0.06)};${spark.r + 0.1};${spark.r};${Math.max(0.06, spark.r - 0.06)}`}
              />
            </circle>
          ))}
        </g>
      );
    };

    return (
      <div
        aria-label={`${activeDashboardHeaderLink.label} journey page orbital rail`}
        className={`dashboard-header-page-orbit-rail dashboard-header-page-orbit-rail--${dashboardHeaderVortexPhase} pointer-events-none absolute -left-[0.98rem] -top-[1.15rem] h-[5.25rem] w-[6.1rem] overflow-visible [transform-style:preserve-3d] ${
          dashboardHeaderVortexMode
            ? `dashboard-header-page-orbit-rail--${dashboardHeaderVortexMode}`
            : ""
        }`}
        key={`${activeDashboardHeaderLink.label}-${activeJourneyStepIndex}-header-page-orbit-rail`}
        role="group"
        style={activeDashboardHeaderTone.iconEffectStyle}
      >
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-visible drop-shadow-[0_0_4px_rgba(34,211,238,0.24)]"
          focusable="false"
          viewBox="0 0 98 84"
        >
          <defs>
            <linearGradient
              id="dashboard-header-page-orbit-rail-gradient"
              x1="10"
              x2="86"
              y1="10"
              y2="74"
            >
              <stop
                offset="0%"
                stopColor="var(--dashboard-header-journey-halo-soft, rgba(34,211,238,0.16))"
              />
              <stop
                offset="24%"
                stopColor="var(--dashboard-header-journey-circle, rgba(34,211,238,0.88))"
              />
              <stop
                offset="52%"
                stopColor="var(--dashboard-header-journey-motion, rgba(34,211,238,0.74))"
              />
              <stop
                offset="76%"
                stopColor="var(--dashboard-header-journey-motion-alt, rgba(125,211,252,0.86))"
              />
              <stop
                offset="100%"
                stopColor="var(--dashboard-header-journey-circle-soft, rgba(34,211,238,0.58))"
              />
            </linearGradient>
            <filter
              colorInterpolationFilters="sRGB"
              height="160%"
              id="dashboard-header-page-orbit-rail-glow"
              width="160%"
              x="-30%"
              y="-30%"
            >
              <feGaussianBlur stdDeviation="0.75" />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0.1 0 0 0 0 0.85 0 0 0 0 1 0 0 0 0.36 0"
              />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {hasRailPagesAbove ? (
            <>
              <path
                d="M84 15 C66 5 42 7 20 24"
                fill="none"
                filter="url(#dashboard-header-page-orbit-rail-glow)"
                stroke="url(#dashboard-header-page-orbit-rail-gradient)"
                strokeLinecap="round"
                strokeWidth="2.4"
                opacity="0.58"
              >
                {isDashboardHeaderVortexAnimating ? (
                  <>
                    <animate
                      attributeName="opacity"
                      dur="3.4s"
                      repeatCount="indefinite"
                      values="0.42;0.74;0.58;0.66;0.42"
                    />
                    <animate
                      attributeName="stroke-width"
                      dur="3.4s"
                      repeatCount="indefinite"
                      values="2;3.1;2.45;2.8;2"
                    />
                  </>
                ) : null}
              </path>
              {isDashboardHeaderVortexAnimating ? (
                <>
                  <path
                    d="M20 24 C42 7 66 5 84 15 C91 20 92 30 88 39"
                    fill="none"
                    filter="url(#dashboard-header-page-orbit-rail-glow)"
                    opacity="0"
                    stroke="var(--dashboard-header-journey-motion, rgba(236,254,255,0.92))"
                    strokeDasharray="1 112"
                    strokeLinecap="round"
                    strokeWidth="2.4"
                  >
                    <animate
                      attributeName="stroke-dasharray"
                      dur="2.1s"
                      repeatCount="indefinite"
                      values="1 112;10 102;18 94;1 112"
                    />
                    <animate
                      attributeName="stroke-dashoffset"
                      dur="2.1s"
                      repeatCount="indefinite"
                      values={railDashOffsetValues}
                    />
                    <animate
                      attributeName="opacity"
                      dur="2.1s"
                      repeatCount="indefinite"
                      values="0;0.2;0.38;0"
                    />
                  </path>
                  <path
                    d="M20 24 C42 7 66 5 84 15 C91 20 92 30 88 39"
                    fill="none"
                    opacity="0"
                    stroke="var(--dashboard-header-journey-circle, rgba(34,211,238,0.56))"
                    strokeDasharray="1 116"
                    strokeLinecap="round"
                    strokeWidth="1.5"
                  >
                    <animate
                      attributeName="stroke-dasharray"
                      begin="0.55s"
                      dur="2.6s"
                      repeatCount="indefinite"
                      values="1 116;8 108;15 101;1 116"
                    />
                    <animate
                      attributeName="stroke-dashoffset"
                      begin="0.55s"
                      dur="2.6s"
                      repeatCount="indefinite"
                      values={
                        isDashboardHeaderVortexCounter ? "0;108" : "108;0"
                      }
                    />
                    <animate
                      attributeName="opacity"
                      begin="0.55s"
                      dur="2.6s"
                      repeatCount="indefinite"
                      values="0;0.14;0.28;0"
                    />
                  </path>
                  <path
                    d="M84 15 C66 5 42 7 20 24"
                    fill="none"
                    opacity="0"
                    stroke="var(--dashboard-header-journey-motion-alt, rgba(255,255,255,0.82))"
                    strokeDasharray="12 84"
                    strokeLinecap="round"
                    strokeWidth="1.1"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      dur="2.8s"
                      repeatCount="indefinite"
                      values="96;0"
                    />
                    <animate
                      attributeName="opacity"
                      dur="2.8s"
                      repeatCount="indefinite"
                      values="0;0.42;0"
                    />
                  </path>
                  <circle
                    fill="var(--dashboard-header-journey-motion-alt, rgba(254,240,138,0.96))"
                    r="0.24"
                  >
                    <animateMotion
                      dur="3.2s"
                      path={upperRailMotionPath}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      dur="3.2s"
                      repeatCount="indefinite"
                      values="0;0.18;0.42;0"
                    />
                    <animate
                      attributeName="r"
                      dur="3.2s"
                      repeatCount="indefinite"
                      values="0.18;0.34;0.5;0.18"
                    />
                  </circle>
                  {renderRailParticles(upperRailMotionPath, "above")}
                  {renderRailSparkField("above")}
                </>
              ) : null}
              {!isDashboardHeaderVortexAnimating
                ? renderRailParticles(upperRailMotionPath, "above")
                : null}
            </>
          ) : null}
          {hasRailPagesBelow ? (
            <>
              <path
                d="M84 63 C66 79 42 76 20 56"
                fill="none"
                filter="url(#dashboard-header-page-orbit-rail-glow)"
                stroke="url(#dashboard-header-page-orbit-rail-gradient)"
                strokeLinecap="round"
                strokeWidth="2.4"
                opacity="0.58"
              >
                {isDashboardHeaderVortexAnimating ? (
                  <>
                    <animate
                      attributeName="opacity"
                      dur="3.6s"
                      repeatCount="indefinite"
                      values="0.42;0.74;0.58;0.66;0.42"
                    />
                    <animate
                      attributeName="stroke-width"
                      dur="3.6s"
                      repeatCount="indefinite"
                      values="2;3.1;2.45;2.8;2"
                    />
                  </>
                ) : null}
              </path>
              {isDashboardHeaderVortexAnimating ? (
                <>
                  <path
                    d="M20 56 C42 76 66 79 84 63 C91 58 92 48 88 39"
                    fill="none"
                    filter="url(#dashboard-header-page-orbit-rail-glow)"
                    opacity="0"
                    stroke="var(--dashboard-header-journey-motion, rgba(236,254,255,0.92))"
                    strokeDasharray="1 112"
                    strokeLinecap="round"
                    strokeWidth="2.4"
                  >
                    <animate
                      attributeName="stroke-dasharray"
                      dur="2.2s"
                      repeatCount="indefinite"
                      values="1 112;10 102;18 94;1 112"
                    />
                    <animate
                      attributeName="stroke-dashoffset"
                      dur="2.2s"
                      repeatCount="indefinite"
                      values={railDashOffsetValues}
                    />
                    <animate
                      attributeName="opacity"
                      dur="2.2s"
                      repeatCount="indefinite"
                      values="0;0.2;0.38;0"
                    />
                  </path>
                  <path
                    d="M20 56 C42 76 66 79 84 63 C91 58 92 48 88 39"
                    fill="none"
                    opacity="0"
                    stroke="var(--dashboard-header-journey-circle, rgba(34,211,238,0.56))"
                    strokeDasharray="1 116"
                    strokeLinecap="round"
                    strokeWidth="1.5"
                  >
                    <animate
                      attributeName="stroke-dasharray"
                      begin="0.6s"
                      dur="2.7s"
                      repeatCount="indefinite"
                      values="1 116;8 108;15 101;1 116"
                    />
                    <animate
                      attributeName="stroke-dashoffset"
                      begin="0.6s"
                      dur="2.7s"
                      repeatCount="indefinite"
                      values={
                        isDashboardHeaderVortexCounter ? "0;108" : "108;0"
                      }
                    />
                    <animate
                      attributeName="opacity"
                      begin="0.6s"
                      dur="2.7s"
                      repeatCount="indefinite"
                      values="0;0.14;0.28;0"
                    />
                  </path>
                  <path
                    d="M84 63 C66 79 42 76 20 56"
                    fill="none"
                    opacity="0"
                    stroke="var(--dashboard-header-journey-motion-alt, rgba(255,255,255,0.82))"
                    strokeDasharray="12 84"
                    strokeLinecap="round"
                    strokeWidth="1.1"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      dur="3s"
                      repeatCount="indefinite"
                      values="96;0"
                    />
                    <animate
                      attributeName="opacity"
                      dur="3s"
                      repeatCount="indefinite"
                      values="0;0.42;0"
                    />
                  </path>
                  <circle
                    fill="var(--dashboard-header-journey-motion, rgba(103,232,249,0.96))"
                    r="0.24"
                  >
                    <animateMotion
                      dur="3.4s"
                      path={lowerRailMotionPath}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      dur="3.4s"
                      repeatCount="indefinite"
                      values="0;0.18;0.42;0"
                    />
                    <animate
                      attributeName="r"
                      dur="3.4s"
                      repeatCount="indefinite"
                      values="0.18;0.34;0.5;0.18"
                    />
                  </circle>
                  {renderRailParticles(lowerRailMotionPath, "below")}
                  {renderRailSparkField("below")}
                </>
              ) : null}
              {!isDashboardHeaderVortexAnimating
                ? renderRailParticles(lowerRailMotionPath, "below")
                : null}
            </>
          ) : null}
          {hasRailPagesAbove || hasRailPagesBelow ? (
            <g aria-hidden="true">
              <circle
                cx="88"
                cy="39"
                fill="none"
                opacity="0.38"
                r="2.6"
                stroke="var(--dashboard-header-journey-circle-ring, rgba(207,250,254,0.48))"
                strokeWidth="1"
              >
                {isDashboardHeaderVortexAnimating ? (
                  <>
                    <animate
                      attributeName="r"
                      dur="2.2s"
                      repeatCount="indefinite"
                      values="2.2;4.2;2.2"
                    />
                    <animate
                      attributeName="opacity"
                      dur="2.2s"
                      repeatCount="indefinite"
                      values="0.16;0.48;0.16"
                    />
                  </>
                ) : null}
              </circle>
              <circle
                cx="88"
                cy="39"
                fill="var(--dashboard-header-journey-circle, rgba(34,211,238,0.74))"
                opacity="0.58"
                r="1.1"
              >
                {isDashboardHeaderVortexAnimating ? (
                  <>
                    <animate
                      attributeName="r"
                      dur="1.7s"
                      repeatCount="indefinite"
                      values="0.8;1.7;0.8"
                    />
                    <animate
                      attributeName="opacity"
                      dur="1.7s"
                      repeatCount="indefinite"
                      values="0.32;0.68;0.32"
                    />
                  </>
                ) : null}
              </circle>
            </g>
          ) : null}
        </svg>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-[0.85rem] top-1/2 h-[4.25rem] w-[4.85rem] -translate-y-1/2 rounded-full opacity-[0.46] blur-md"
          style={{
            background:
              "radial-gradient(ellipse at 78% 50%, var(--dashboard-header-journey-circle-soft, rgba(34,211,238,0.14)), transparent 46%), radial-gradient(ellipse at 24% 24%, var(--dashboard-header-journey-motion-alt, rgba(250,204,21,0.10)), transparent 36%), radial-gradient(ellipse at 24% 76%, var(--dashboard-header-journey-halo-soft, rgba(244,114,182,0.08)), transparent 36%)",
          }}
        />
        {railSteps.map(({ distance, step, stepIndex }) => {
          const clampedDistance = Math.max(-2, Math.min(2, distance));
          const slot = headerRailSlots[clampedDistance];
          const stepCompletion = getDashboardJourneyStepCompletion(step);
          const stepUrgencyTone = getDashboardRowUrgencyTone(stepCompletion);
          const pageTone =
            dashboardJourneyTabIconOnlyStyles[
              getDashboardJourneyStepTone(step, stepIndex)
            ].idle;

          if (!slot) return null;

          return (
            <Link
              aria-label={`${step.label} journey rail page, ${stepUrgencyTone.label}`}
              className="dashboard-header-page-orbit-node pointer-events-auto absolute isolate grid h-6 w-6 place-items-center overflow-visible rounded-full border border-white/12 bg-slate-950/58 shadow-[0_0_14px_rgba(34,211,238,0.10),inset_0_1px_0_rgba(255,255,255,0.08)] transition-[border-color,box-shadow,filter,transform] duration-200 hover:border-cyan-100/48 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/55 active:scale-95"
              draggable={false}
              href={step.href}
              key={`${activeDashboardHeaderLink.label}-${step.label}-dashboard-header-page-rail`}
              onClick={() => {
                setActiveDashboardJourneyStepIndexes((currentIndexes) => ({
                  ...currentIndexes,
                  [card.title]: stepIndex,
                }));
                markDashboardDestinationVisited(step.href);
              }}
              onDragStart={(event) => event.preventDefault()}
              data-dashboard-tooltip={step.label}
              style={{
                left: `${slot.x}px`,
                opacity: slot.opacity,
                top: `${slot.y}px`,
                transform: `translate(-50%, -50%) rotate(${slot.rotate}deg) scale(calc(${slot.scale} * var(--dashboard-header-page-orbit-node-hover-scale, 1)))`,
                zIndex: slot.zIndex,
              }}
            >
              <span
                aria-hidden="true"
                className="dashboard-header-page-orbit-node__field absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_48%,rgba(34,211,238,0.10),rgba(2,6,23,0.72)_72%)]"
              />
              {renderDashboardHeaderJourneyStepIcon(
                step,
                `dashboard-header-page-orbit-node__icon relative z-10 h-3 w-3 ${pageTone}`,
              )}
            </Link>
          );
        })}
      </div>
    );
  };

  const renderDashboardHeaderJourneyTabs = (
    placement: "header" | "points" = "header",
  ) => {
    const { activeJourneyStepIndex, card, journeySteps } =
      getDashboardHeaderJourneyState();
    const canRotateJourney = Boolean(card && journeySteps.length > 1);
    const isPointsDock = placement === "points";
    const pointsDockEffectStyle = isPointsDock
      ? activeDashboardHeaderTone.iconEffectStyle
      : undefined;

    return (
      <div
        aria-label={`${activeDashboardHeaderLink.label} journey tabs`}
        className={
          isPointsDock
            ? "relative h-8 w-[3.25rem] shrink-0 overflow-visible [perspective:390px]"
            : "relative h-[62px] w-[62px] shrink-0 overflow-visible py-3 [perspective:390px]"
        }
      >
        {canRotateJourney && !isPointsDock ? (
          <div
            aria-label={`${activeDashboardHeaderLink.label} journey scroll controls`}
            className="absolute right-0 top-1/2 z-40 flex h-9 w-5 -translate-y-1/2 flex-col overflow-hidden rounded-full border border-cyan-200/18 bg-slate-950/58 text-[8px] font-black leading-none text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            role="group"
          >
            <button
              aria-label={`Previous ${activeDashboardHeaderLink.label} journey tab`}
              className="grid min-h-0 flex-1 place-items-center border-b border-white/10 transition hover:border-amber-200/42 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95"
              data-dashboard-tooltip={`Previous ${activeDashboardHeaderLink.label} journey tab`}
              onClick={() => card && rotateDashboardJourneyStepOrbit(card, "left")}
              type="button"
            >
              ^
            </button>
            <button
              aria-label={`Next ${activeDashboardHeaderLink.label} journey tab`}
              className="grid min-h-0 flex-1 place-items-center transition hover:border-amber-200/42 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95"
              data-dashboard-tooltip={`Next ${activeDashboardHeaderLink.label} journey tab`}
              onClick={() => card && rotateDashboardJourneyStepOrbit(card, "right")}
              type="button"
            >
              v
            </button>
          </div>
        ) : !isPointsDock ? (
          <span aria-hidden="true" className="absolute right-0 top-1/2 h-9 w-5 -translate-y-1/2" />
        ) : null}
        <div
          className={
            isPointsDock
              ? "absolute -top-1 left-1/2 h-9 w-9 -translate-x-1/2 overflow-visible rounded-full [transform-style:preserve-3d]"
              : "absolute inset-y-4 left-5 w-9 -translate-x-1/2 [transform-style:preserve-3d]"
          }
        >
          {journeySteps.map((step, stepIndex) => {
            const journeyDistance = getDashboardJourneyStepOrbitDistance(
              stepIndex,
              activeJourneyStepIndex,
              journeySteps.length,
            );
            const isActiveJourneyStep = journeyDistance === 0;
            if (isPointsDock && !isActiveJourneyStep) return null;

            const stepCompletion = getDashboardJourneyStepCompletion(step);
            const stepUrgencyTone = getDashboardRowUrgencyTone(stepCompletion);
            const journeyTone = isPointsDock
              ? activeDashboardHeaderLink.toneKey
              : getDashboardJourneyStepTone(step, stepIndex);
            const stepIconTone =
              dashboardJourneyTabIconOnlyStyles[journeyTone][
                isActiveJourneyStep ? "active" : "idle"
              ];
            const journeyAbsDistance = Math.abs(journeyDistance);
            const journeyDirection = Math.sign(journeyDistance);
            const journeySlots = [
              {
                blur: 0,
                opacity: 1,
                rotateX: 0,
                scale: isPointsDock ? 1.12 : 1.22,
                y: 0,
                zIndex: 32,
              },
              {
                blur: 0.15,
                opacity: isPointsDock ? 0.64 : 0.9,
                rotateX: -34,
                scale: isPointsDock ? 0.78 : 0.96,
                y: isPointsDock ? 16 : 20,
                zIndex: 22,
              },
              {
                blur: 0.35,
                opacity: 0,
                rotateX: -54,
                scale: 0.76,
                y: isPointsDock ? 27 : 32,
                zIndex: 12,
              },
            ];
            const journeySlot =
              journeySlots[
                Math.min(journeyAbsDistance, journeySlots.length - 1)
              ];
            const activeJourneyOrbStyle: CSSProperties | undefined =
              isActiveJourneyStep
                ? {
                    background:
                      "radial-gradient(circle at 50% 48%, rgba(255,255,255,0.30), transparent 17%), radial-gradient(circle at 50% 44%, var(--dashboard-header-journey-circle, rgba(34,211,238,0.34)), var(--dashboard-header-journey-circle-soft, rgba(34,211,238,0.18)) 48%, rgba(2,6,23,0.44) 74%)",
                    boxShadow:
                      "0 0 16px var(--dashboard-header-journey-shadow, rgba(34,211,238,0.30)), inset 0 0 0 1px var(--dashboard-header-journey-circle-ring, rgba(207,250,254,0.20))",
                    overflow: "hidden",
                    transformStyle: "preserve-3d",
                  }
                : undefined;

            return (
              <Link
                aria-current={isActiveJourneyStep ? "step" : undefined}
                aria-label={`${step.label} journey tab, ${stepUrgencyTone.label}`}
                className={`dashboard-header-journey-tab absolute left-1/2 top-1/2 isolate grid h-7 w-7 place-items-center overflow-visible rounded-full bg-transparent text-cyan-100 transition-[filter,opacity,transform,color] duration-300 hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/55 active:scale-95 ${
                  isActiveJourneyStep
                    ? "dashboard-header-journey-tab--active"
                    : ""
                }`}
                data-dashboard-tooltip={step.label}
                href={step.href}
                key={`${activeDashboardHeaderLink.label}-${step.label}-header-journey`}
                onClick={() => {
                  if (card) {
                    setActiveDashboardJourneyStepIndexes((currentIndexes) => ({
                      ...currentIndexes,
                      [card.title]: stepIndex,
                    }));
                  }
                  markDashboardDestinationVisited(step.href);
                }}
                style={{
                  ...(isActiveJourneyStep && pointsDockEffectStyle
                    ? pointsDockEffectStyle
                    : {}),
                  ...(activeJourneyOrbStyle ?? {}),
                  filter: `blur(${journeySlot.blur}px)`,
                  opacity: journeySlot.opacity,
                  pointerEvents: journeyAbsDistance > 1 ? "none" : "auto",
                  transform: `translate(-50%, -50%) translateY(${
                    (isPointsDock ? -journeyDirection : journeyDirection) *
                    journeySlot.y
                  }px) scale(${
                    journeySlot.scale
                  }) rotateX(${journeyDirection * journeySlot.rotateX}deg)`,
                  zIndex: journeySlot.zIndex,
                }}
              >
                {isActiveJourneyStep ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="dashboard-header-journey-tab__halo"
                      style={{
                        filter: "blur(4px)",
                        inset: "-0.12rem",
                        zIndex: 0,
                      }}
                    />
                    <span
                      aria-hidden="true"
                      className="dashboard-header-journey-tab__motion"
                      style={{
                        inset: "-0.06rem",
                        opacity: 0.92,
                        zIndex: 0,
                      }}
                    />
                    <span
                      aria-hidden="true"
                      className="dashboard-header-journey-tab__core"
                      style={{
                        inset: "0.16rem",
                        zIndex: 1,
                      }}
                    />
                  </>
                ) : null}
                <span className="sr-only">{step.label}</span>
                <span
                  className={
                    isActiveJourneyStep
                      ? "dashboard-header-journey-tab__float relative z-10 grid h-full w-full place-items-center rounded-full"
                      : "relative z-10 grid place-items-center"
                  }
                >
                  {renderDashboardHeaderJourneyStepIcon(
                    step,
                    isActiveJourneyStep
                      ? `h-4 w-4 ${stepIconTone}`
                      : `h-3.5 w-3.5 ${stepIconTone}`,
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDashboardHeaderScrollControls = () => {
    const { activeJourneyStepIndex, journeySteps } =
      getDashboardHeaderJourneyState();
    const canHeaderJoystickScrollUp =
      journeySteps.length > 1 && activeJourneyStepIndex > 0;
    const canHeaderJoystickScrollDown =
      journeySteps.length > 1 &&
      activeJourneyStepIndex < journeySteps.length - 1;
    const scrollButtonTiltX =
      dashboardHeaderScrollButtonActiveDirection === "up"
        ? "-22deg"
        : dashboardHeaderScrollButtonActiveDirection === "down"
          ? "22deg"
          : "10deg";
    const scrollButtonTiltY =
      dashboardHeaderScrollButtonActiveDirection === "left"
        ? "-22deg"
        : dashboardHeaderScrollButtonActiveDirection === "right"
          ? "22deg"
          : "0deg";

    return (
      <button
        aria-label="Scroll dashboard selector"
        className={`dashboard-header-selector-joystick dashboard-header-scroll-button relative z-30 -mr-5 grid h-[3.35rem] w-[3.35rem] shrink-0 translate-x-5 -translate-y-1.5 place-items-center overflow-hidden rounded-[24px] border border-cyan-100/16 bg-slate-950/26 text-cyan-50 shadow-[0_14px_30px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.09)] outline-none transition hover:-translate-y-2 hover:border-amber-100/34 hover:bg-cyan-300/8 active:scale-95 focus-visible:ring-2 focus-visible:ring-cyan-100/45 [perspective:420px] [touch-action:none] ${
          dashboardHeaderScrollButtonDragging
            ? "dashboard-header-scroll-button--dragging cursor-grabbing border-amber-100/44 bg-amber-300/10"
            : "cursor-pointer"
        } ${
          dashboardHeaderScrollButtonActiveDirection
            ? `dashboard-header-scroll-button--${dashboardHeaderScrollButtonActiveDirection}`
            : ""
        }`}
        data-dashboard-header-scroll-button="true"
        onClick={(event) => {
          if (dashboardHeaderScrollButtonPointerMovedRef.current) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }

          runDashboardHeaderScrollButtonDirection("right");
        }}
        onBlur={resetDashboardHeaderScrollButtonDrag}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp") {
            event.preventDefault();
            runDashboardHeaderScrollButtonDirection("up");
          }

          if (event.key === "ArrowLeft") {
            event.preventDefault();
            runDashboardHeaderScrollButtonDirection("left");
          }

          if (event.key === "ArrowRight") {
            event.preventDefault();
            runDashboardHeaderScrollButtonDirection("right");
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            runDashboardHeaderScrollButtonDirection("down");
          }
        }}
        onLostPointerCapture={handleDashboardHeaderScrollButtonPointerEnd}
        onPointerCancel={handleDashboardHeaderScrollButtonPointerEnd}
        onPointerDown={handleDashboardHeaderScrollButtonPointerDown}
        onPointerLeave={(event) => {
          if (dashboardHeaderScrollButtonDragging && event.buttons === 0) {
            handleDashboardHeaderScrollButtonPointerEnd(event);
          }
        }}
        onPointerMove={handleDashboardHeaderScrollButtonPointerMove}
        onPointerUp={handleDashboardHeaderScrollButtonPointerEnd}
        onWheel={handleDashboardHeaderScrollButtonWheel}
        data-dashboard-tooltip="Scroll dashboard selector"
        style={
          {
            ...activeDashboardHeaderTone.iconEffectStyle,
            ...dashboardHeaderScrollButtonPreviewTone,
            "--dashboard-header-scroll-button-roll": `${dashboardHeaderScrollButtonRoll}deg`,
            "--dashboard-header-scroll-button-tilt-x": scrollButtonTiltX,
            "--dashboard-header-scroll-button-tilt-y": scrollButtonTiltY,
            "--dashboard-analog-offset-x": `${dashboardHeaderAnalogOffset.x}px`,
            "--dashboard-analog-offset-y": `${dashboardHeaderAnalogOffset.y}px`,
          } as CSSProperties
        }
        type="button"
      >
        <span
          aria-hidden="true"
          className="dashboard-header-scroll-button__field"
        />
        {canHeaderJoystickScrollUp ? (
          <span
            aria-hidden="true"
            className="dashboard-header-scroll-button__arrow dashboard-header-scroll-button__arrow--up"
          >
            ^
          </span>
        ) : null}
        <span
          aria-hidden="true"
          className="dashboard-header-scroll-button__arrow dashboard-header-scroll-button__arrow--left"
        >
          &lt;
        </span>
        <span
          aria-hidden="true"
          className="dashboard-header-scroll-button__ball"
          style={{
            background:
              "radial-gradient(circle at 34% 26%, rgba(255,255,255,0.78), transparent 18%), radial-gradient(circle at 42% 38%, rgba(255,255,255,0.24), transparent 28%), radial-gradient(circle at 50% 52%, var(--dashboard-header-scroll-preview-core, rgba(34,211,238,0.90)), transparent 24%), radial-gradient(circle at 50% 52%, var(--dashboard-header-scroll-preview-core-soft, rgba(14,165,233,0.34)), transparent 50%), radial-gradient(circle at 62% 72%, var(--dashboard-header-scroll-preview-accent, rgba(34,211,238,0.44)), transparent 34%), conic-gradient(from 20deg, rgba(8,47,73,0.98), var(--dashboard-header-scroll-preview-accent, rgba(34,211,238,0.62)), var(--dashboard-header-scroll-preview-core, rgba(250,204,21,0.62)), rgba(15,23,42,0.96), rgba(8,47,73,0.98))",
            borderColor:
              "var(--dashboard-header-scroll-preview-ring, rgba(207,250,254,0.28))",
            boxShadow:
              "0 0 18px var(--dashboard-header-scroll-preview-shadow, rgba(34,211,238,0.22)), 0 8px 18px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -10px 16px rgba(2,6,23,0.48)",
          }}
        >
          <span className="dashboard-header-scroll-button__grid" />
          <span className="dashboard-header-scroll-button__latitudes" />
          <span
            className="dashboard-header-scroll-button__core"
            style={{
              background:
                "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.88) 0 0.12rem, transparent 0.14rem), radial-gradient(circle, var(--dashboard-header-scroll-preview-core, rgba(34,211,238,0.92)), transparent 62%), conic-gradient(from 180deg, var(--dashboard-header-scroll-preview-core, rgba(250,204,21,0.88)), var(--dashboard-header-scroll-preview-accent, rgba(34,211,238,0.82)), var(--dashboard-header-scroll-preview-core-soft, rgba(99,102,241,0.56)), var(--dashboard-header-scroll-preview-core, rgba(250,204,21,0.88)))",
              borderColor:
                "var(--dashboard-header-scroll-preview-ring, rgba(255,255,255,0.36))",
              boxShadow:
                "0 0 12px var(--dashboard-header-scroll-preview-shadow, rgba(250,204,21,0.46)), 0 0 18px var(--dashboard-header-scroll-preview-core, rgba(34,211,238,0.32)), inset 0 1px 0 rgba(255,255,255,0.44)",
            }}
          />
          <span
            className="dashboard-header-scroll-button__spark"
            style={{
              background:
                "var(--dashboard-header-scroll-preview-core, rgba(250,204,21,0.92))",
              boxShadow:
                "0 0 10px var(--dashboard-header-scroll-preview-shadow, rgba(250,204,21,0.85)), 0 0 18px var(--dashboard-header-scroll-preview-accent, rgba(34,211,238,0.36))",
            }}
          />
        </span>
        <span
          aria-hidden="true"
          className="dashboard-header-scroll-button__arrow dashboard-header-scroll-button__arrow--right"
        >
          &gt;
        </span>
        {canHeaderJoystickScrollDown ? (
          <span
            aria-hidden="true"
            className="dashboard-header-scroll-button__arrow dashboard-header-scroll-button__arrow--down"
          >
            v
          </span>
        ) : null}
      </button>
    );
  };

  const renderDashboardHeaderMenuOrbitControl = () => {
    const menuOrbitTiltX = "7deg";
    const menuOrbitTiltY =
      dashboardHeaderMenuOrbitActiveDirection === "left"
        ? "-22deg"
        : dashboardHeaderMenuOrbitActiveDirection === "right"
          ? "22deg"
          : "0deg";

    return (
      <button
        aria-label="Spin main header menu horizontally"
        className={`dashboard-header-menu-orbit-control dashboard-header-scroll-button dashboard-header-scroll-button--horizontal grid place-items-center overflow-hidden border border-cyan-100/16 bg-slate-950/26 text-cyan-50 shadow-[0_14px_30px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.09)] outline-none transition hover:border-amber-100/34 hover:bg-cyan-300/8 active:scale-95 focus-visible:ring-2 focus-visible:ring-cyan-100/45 [perspective:420px] [touch-action:none] ${
          dashboardHeaderMenuOrbitDragging
            ? "dashboard-header-scroll-button--dragging cursor-grabbing border-amber-100/44 bg-amber-300/10"
            : "cursor-pointer"
        } ${
          dashboardHeaderMenuOrbitActiveDirection
            ? `dashboard-header-scroll-button--${dashboardHeaderMenuOrbitActiveDirection}`
            : ""
        }`}
        data-dashboard-header-menu-orbit-control="true"
        onClick={(event) => {
          if (dashboardHeaderMenuOrbitPointerMovedRef.current) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }

          runDashboardHeaderMenuOrbitDirection("right");
        }}
        onBlur={resetDashboardHeaderMenuOrbitDrag}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            runDashboardHeaderMenuOrbitDirection("left");
          }

          if (event.key === "ArrowRight") {
            event.preventDefault();
            runDashboardHeaderMenuOrbitDirection("right");
          }
        }}
        onLostPointerCapture={handleDashboardHeaderMenuOrbitPointerEnd}
        onPointerCancel={handleDashboardHeaderMenuOrbitPointerEnd}
        onPointerDown={handleDashboardHeaderMenuOrbitPointerDown}
        onPointerLeave={(event) => {
          if (dashboardHeaderMenuOrbitDragging && event.buttons === 0) {
            handleDashboardHeaderMenuOrbitPointerEnd(event);
          }
        }}
        onPointerMove={handleDashboardHeaderMenuOrbitPointerMove}
        onPointerUp={handleDashboardHeaderMenuOrbitPointerEnd}
        onWheel={handleDashboardHeaderMenuOrbitWheel}
        data-dashboard-tooltip="Spin main header menu"
        style={
          {
            ...activeDashboardHeaderTone.iconEffectStyle,
            ...dashboardHeaderMenuOrbitPreviewTone,
            "--dashboard-header-scroll-button-roll": `${dashboardHeaderMenuOrbitRoll}deg`,
            "--dashboard-header-scroll-button-tilt-x": menuOrbitTiltX,
            "--dashboard-header-scroll-button-tilt-y": menuOrbitTiltY,
            "--dashboard-analog-offset-x": `${dashboardHeaderMenuOrbitOffset.x}px`,
            "--dashboard-analog-offset-y": `${dashboardHeaderMenuOrbitOffset.y}px`,
          } as CSSProperties
        }
        type="button"
      >
        <span
          aria-hidden="true"
          className="dashboard-header-scroll-button__field"
        />
        <span
          aria-hidden="true"
          className="dashboard-header-scroll-button__arrow dashboard-header-scroll-button__arrow--left"
        >
          &lt;
        </span>
        <span
          aria-hidden="true"
          className="dashboard-header-scroll-button__ball"
        >
          <span className="dashboard-header-scroll-button__grid" />
          <span className="dashboard-header-scroll-button__latitudes" />
          <span className="dashboard-header-scroll-button__core" />
          <span className="dashboard-header-scroll-button__spark" />
        </span>
        <span
          aria-hidden="true"
          className="dashboard-header-scroll-button__arrow dashboard-header-scroll-button__arrow--right"
        >
          &gt;
        </span>
      </button>
    );
  };

  const renderDashboardPageAnalog = () => {
    const canPageJoystickScrollUp = clampedDashboardOrbiterRow > 0;
    const canPageJoystickScrollDown =
      clampedDashboardOrbiterRow < dashboardOrbiterRows.length - 1;
    const pageAnalogTiltX =
      dashboardPageAnalogActiveDirection === "up"
        ? "-22deg"
        : dashboardPageAnalogActiveDirection === "down"
          ? "22deg"
          : "10deg";
    const pageAnalogTiltY =
      dashboardPageAnalogActiveDirection === "left"
        ? "-22deg"
        : dashboardPageAnalogActiveDirection === "right"
          ? "22deg"
          : "0deg";

    return (
      <button
        aria-label="Scroll dashboard page rows"
        className={`dashboard-header-scroll-button dashboard-header-scroll-button--page pointer-events-auto relative z-10 grid h-[3.35rem] w-[3.35rem] shrink-0 place-items-center overflow-hidden rounded-[24px] border border-cyan-100/16 bg-slate-950/26 text-cyan-50 shadow-[0_14px_30px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.09)] outline-none transition hover:-translate-y-0.5 hover:border-amber-100/34 hover:bg-cyan-300/8 active:scale-95 focus-visible:ring-2 focus-visible:ring-cyan-100/45 [perspective:420px] [touch-action:none] ${
          dashboardPageAnalogDragging
            ? "dashboard-header-scroll-button--dragging cursor-grabbing border-amber-100/44 bg-amber-300/10"
            : "cursor-pointer"
        } ${
          dashboardPageAnalogActiveDirection
            ? `dashboard-header-scroll-button--${dashboardPageAnalogActiveDirection}`
            : ""
        }`}
        data-dashboard-page-analog="true"
        onClick={(event) => {
          if (dashboardPageAnalogPointerMovedRef.current) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }

          runDashboardPageAnalogDirection("right");
        }}
        onBlur={resetDashboardPageAnalogDrag}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp") {
            event.preventDefault();
            runDashboardPageAnalogDirection("up");
          }

          if (event.key === "ArrowLeft") {
            event.preventDefault();
            runDashboardPageAnalogDirection("left");
          }

          if (event.key === "ArrowRight") {
            event.preventDefault();
            runDashboardPageAnalogDirection("right");
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            runDashboardPageAnalogDirection("down");
          }
        }}
        onLostPointerCapture={handleDashboardPageAnalogPointerEnd}
        onPointerCancel={handleDashboardPageAnalogPointerEnd}
        onPointerDown={handleDashboardPageAnalogPointerDown}
        onPointerLeave={(event) => {
          if (dashboardPageAnalogDragging && event.buttons === 0) {
            handleDashboardPageAnalogPointerEnd(event);
          }
        }}
        onPointerMove={handleDashboardPageAnalogPointerMove}
        onPointerUp={handleDashboardPageAnalogPointerEnd}
        onWheel={handleDashboardPageAnalogWheel}
        data-dashboard-tooltip="Scroll dashboard page rows"
        style={
          {
            ...activeDashboardHeaderTone.iconEffectStyle,
            ...dashboardHeaderActiveScrollButtonTone,
            "--dashboard-header-scroll-button-roll": `${dashboardPageAnalogRoll}deg`,
            "--dashboard-header-scroll-button-tilt-x": pageAnalogTiltX,
            "--dashboard-header-scroll-button-tilt-y": pageAnalogTiltY,
            "--dashboard-analog-offset-x": `${dashboardPageAnalogOffset.x}px`,
            "--dashboard-analog-offset-y": `${dashboardPageAnalogOffset.y}px`,
          } as CSSProperties
        }
        type="button"
      >
        <span
          aria-hidden="true"
          className="dashboard-header-scroll-button__field"
        />
        {canPageJoystickScrollUp ? (
          <span
            aria-hidden="true"
            className="dashboard-header-scroll-button__arrow dashboard-header-scroll-button__arrow--up"
          >
            ^
          </span>
        ) : null}
        <span
          aria-hidden="true"
          className="dashboard-header-scroll-button__arrow dashboard-header-scroll-button__arrow--left"
        >
          &lt;
        </span>
        <span
          aria-hidden="true"
          className="dashboard-header-scroll-button__ball"
        >
          <span className="dashboard-header-scroll-button__grid" />
          <span className="dashboard-header-scroll-button__latitudes" />
          <span className="dashboard-header-scroll-button__core" />
          <span className="dashboard-header-scroll-button__spark" />
        </span>
        <span
          aria-hidden="true"
          className="dashboard-header-scroll-button__arrow dashboard-header-scroll-button__arrow--right"
        >
          &gt;
        </span>
        {canPageJoystickScrollDown ? (
          <span
            aria-hidden="true"
            className="dashboard-header-scroll-button__arrow dashboard-header-scroll-button__arrow--down"
          >
            v
          </span>
        ) : null}
      </button>
    );
  };

  const renderDashboardJourneyStepOrbitPanel = (
    card?: DashboardNavigationCard,
  ) => {
    if (!card) return null;

    const steps = card.journeySteps || [];
    if (!steps.length) return null;

    const activeJourneyStepIndex = getActiveDashboardJourneyStepIndex(card);
    const dashboardJourneyPanelTitle = `${card.title.split(" / ")[0]} Journey`;

    return (
      <div
        className="pointer-events-auto mt-2 pt-0 [perspective:900px]"
        onClick={(event) => event.stopPropagation()}
        onPointerCancel={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onPointerMove={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onWheel={(event) => {
          const primaryDelta =
            Math.abs(event.deltaX) > Math.abs(event.deltaY)
              ? event.deltaX
              : event.deltaY;
          if (Math.abs(primaryDelta) < 8) return;

          event.preventDefault();
          event.stopPropagation();
          rotateDashboardJourneyStepOrbit(
            card,
            primaryDelta > 0 ? "right" : "left",
          );
        }}
      >
        <div className="relative mb-0.5 flex min-h-5 items-center justify-center">
          {steps.length > 1 ? (
            <button
              aria-label={`Previous ${card.title} journey step`}
              className="absolute left-0 top-1/2 z-40 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/18 bg-slate-950/72 text-[8px] font-black text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.10)] backdrop-blur transition hover:-translate-x-0.5 hover:border-amber-200/42 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                rotateDashboardJourneyStepOrbit(card, "left");
              }}
              type="button"
            >
              &lt;
            </button>
          ) : null}
          <div className="px-8 text-center text-[8px] font-black uppercase tracking-[0.16em] text-cyan-200/70">
            {dashboardJourneyPanelTitle}
          </div>
          {steps.length > 1 ? (
            <button
              aria-label={`Next ${card.title} journey step`}
              className="absolute right-0 top-1/2 z-40 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/18 bg-slate-950/72 text-[8px] font-black text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.10)] backdrop-blur transition hover:translate-x-0.5 hover:border-amber-200/42 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                rotateDashboardJourneyStepOrbit(card, "right");
              }}
              type="button"
            >
              &gt;
            </button>
          ) : null}
        </div>

        <div
          aria-label={`${dashboardJourneyPanelTitle} journey selectors`}
          className="relative mb-0.5 h-8 max-w-full overflow-visible px-1 [perspective:680px]"
        >
          {steps.map((step, stepIndex) => {
            const journeyDistance = getDashboardJourneyStepOrbitDistance(
              stepIndex,
              activeJourneyStepIndex,
              steps.length,
            );
            if (Math.abs(journeyDistance) > 3) {
              return null;
            }

            const clampedDistance = Math.max(
              -3,
              Math.min(3, journeyDistance),
            );
            const journeyAbsDistance = Math.abs(clampedDistance);
            const journeyDirection = Math.sign(clampedDistance);
            const isActiveJourneyStep = journeyDistance === 0;
            const stepIconTone = getDashboardJourneyStepIconTone(
              step,
              isActiveJourneyStep,
              stepIndex,
            );
            const xSlots = [0, 26, 50, 74];
            const x = journeyDirection * xSlots[journeyAbsDistance];
            const scale =
              journeyAbsDistance === 0
                ? 1.08
                : journeyAbsDistance === 1
                  ? 0.94
                  : journeyAbsDistance === 2
                    ? 0.82
                    : 0.72;
            const opacity =
              journeyAbsDistance === 0
                ? 1
                : journeyAbsDistance === 1
                  ? 0.92
                  : journeyAbsDistance === 2
                    ? 0.78
                    : 0.58;
            const rotateY = journeyDirection * -14;

            return (
              <button
                aria-label={`Show ${step.label} journey card`}
                aria-pressed={isActiveJourneyStep}
                className={`absolute left-1/2 top-1/2 isolate flex h-6 w-6 items-center justify-center overflow-visible rounded-full border text-left shadow-[0_12px_28px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl transition-[border-color,background-color,box-shadow,filter] duration-300 hover:-translate-y-0.5 hover:saturate-150 active:scale-95 ${
                  isActiveJourneyStep
                    ? `${stepIconTone} ring-2 ring-white/16 shadow-[0_0_20px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.18)]`
                    : `${stepIconTone} hover:brightness-125`
                }`}
                key={`${card.title}-${step.label}-journey-indicator`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setActiveDashboardJourneyStepIndexes((currentIndexes) => ({
                    ...currentIndexes,
                    [card.title]: stepIndex,
                  }));
                }}
                style={{
                  opacity,
                  transform: `translate(-50%, -50%) translateX(${x}px) translateZ(${
                    isActiveJourneyStep ? 38 : 18 - journeyAbsDistance * 5
                  }px) rotateY(${rotateY}deg) scale(${scale})`,
                  transition:
                    "transform 520ms cubic-bezier(0.2,0.82,0.2,1), opacity 260ms ease, border-color 220ms ease, background-color 220ms ease, box-shadow 220ms ease",
                  zIndex: 30 - journeyAbsDistance,
                }}
                data-dashboard-tooltip={step.label}
                type="button"
              >
                <span className="sr-only">{step.label}</span>
                <DashboardTabIcon
                  className={`shrink-0 ${
                    isActiveJourneyStep ? "h-3.5 w-3.5" : "h-3 w-3"
                  }`}
                  label={step.label}
                  name={step.icon}
                />
              </button>
            );
          })}
        </div>

        <div className="relative h-[66px] overflow-visible [transform-style:preserve-3d]">
          {steps.map((step, stepIndex) => {
            const journeyDistance = getDashboardJourneyStepOrbitDistance(
              stepIndex,
              activeJourneyStepIndex,
              steps.length,
            );
            const journeyAbsDistance = Math.abs(journeyDistance);
            const journeyDirection = Math.sign(journeyDistance);
            const journeySlots = [
              {
                blur: 0,
                opacity: 1,
                rotateY: 0,
                scale: 1,
                width: 144,
                x: 0,
                y: 0,
                zIndex: 34,
              },
              {
                blur: 0.2,
                opacity: 0.74,
                rotateY: -18,
                scale: 0.78,
                width: 82,
                x: 92,
                y: 5,
                zIndex: 24,
              },
              {
                blur: 0.9,
                opacity: 0.34,
                rotateY: -34,
                scale: 0.58,
                width: 62,
                x: 122,
                y: 10,
                zIndex: 14,
              },
              {
                blur: 1.8,
                opacity: 0.14,
                rotateY: -48,
                scale: 0.5,
                width: 54,
                x: 142,
                y: 15,
                zIndex: 6,
              },
            ];
            const journeySlot =
              journeySlots[
                Math.min(journeyAbsDistance, journeySlots.length - 1)
              ];
            const isActiveJourneyStep = journeyDistance === 0;
            const stepCardTone = getDashboardJourneyStepTone(step, stepIndex);

            return (
              <Link
                aria-current={isActiveJourneyStep ? "step" : undefined}
                className={`dashboard-journey-orbit-card absolute left-1/2 top-1/2 isolate flex h-[58px] flex-col items-center justify-center gap-0.5 overflow-visible rounded-xl border px-1.5 text-center transition-[transform,opacity,filter,border-color,background-color,box-shadow] duration-[420ms] hover:-translate-y-0.5 active:scale-[0.98] ${
                  isActiveJourneyStep ? "dashboard-journey-active-card" : ""
                } ${dashboardJourneyStepStyles[step.state]}`}
                href={step.href}
                key={`${card.title}-${step.label}`}
                onClick={(event) => event.stopPropagation()}
                style={{
                  ...dashboardEffectToneStyles[stepCardTone],
                  filter: `blur(${journeySlot.blur}px)`,
                  opacity: journeySlot.opacity,
                  pointerEvents: journeyAbsDistance > 2 ? "none" : "auto",
                  transform: `translate(-50%, -50%) translateX(${
                    journeyDirection * journeySlot.x
                  }px) translateY(${journeySlot.y}px) scale(${
                    journeySlot.scale
                  }) rotateY(${journeyDirection * journeySlot.rotateY}deg)`,
                  width: `${journeySlot.width}px`,
                  zIndex: journeySlot.zIndex,
                }}
                data-dashboard-tooltip={`${card.title}: ${step.label}`}
              >
                <span
                  aria-hidden="true"
                  className={`dashboard-journey-orbit-card__effect ${
                    isActiveJourneyStep
                      ? "dashboard-journey-active-card__effect"
                      : ""
                  }`}
                />
                <span
                  className={`relative z-10 grid shrink-0 place-items-center rounded-full border ${
                    isActiveJourneyStep ? "h-7 w-7" : "h-6 w-6"
                  } ${getDashboardJourneyStepIconTone(
                    step,
                    isActiveJourneyStep,
                    stepIndex,
                  )}`}
                  aria-hidden="true"
                >
                  <DashboardTabIcon
                    className={
                      isActiveJourneyStep
                        ? "h-3.5 w-3.5 drop-shadow-[0_0_10px_rgba(255,255,255,0.28)]"
                        : "h-3 w-3 drop-shadow-[0_0_8px_rgba(255,255,255,0.22)]"
                    }
                    label={step.label}
                    name={step.icon}
                  />
                </span>
                <span
                  className={`relative z-10 max-w-full px-1 font-black uppercase leading-[1.05] tracking-[0.08em] drop-shadow-[0_1px_8px_rgba(2,6,23,0.7)] ${
                    isActiveJourneyStep
                      ? "whitespace-normal text-[8px] text-white"
                      : "truncate whitespace-nowrap text-[7px] text-slate-100/90"
                  }`}
                >
                  {step.label}
                </span>
                {renderDashboardCompletionDot(
                  getDashboardJourneyStepCompletion(step),
                  isActiveJourneyStep || step.state === "complete",
                  "-bottom-1 -right-1 z-30",
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDashboardOrbitCardRow = ({
    cards,
    description,
    getDistance,
    kicker,
    pointerMovedRef,
    pointerStartRef,
    rotateOrbit,
    rowIndex,
    setActiveIndex,
    title,
  }: {
    cards: DashboardNavigationCard[];
    description: string;
    getDistance: (index: number) => number;
    kicker: string;
    pointerMovedRef: DashboardPointerMovedRef;
    pointerStartRef: DashboardPointerStartRef;
    rotateOrbit: (direction: DashboardOrbitDirection) => void;
    rowIndex: number;
    setActiveIndex: (index: number) => void;
    title: string;
  }) => (
    <div
      data-dashboard-orbiter-row={rowIndex}
      className={`relative min-h-0 w-full overflow-hidden pl-36 pr-10 pt-20 transition-opacity duration-300 sm:pl-40 sm:pr-12 sm:pt-24 lg:pl-44 lg:pt-28 ${
        clampedDashboardOrbiterRow === rowIndex
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-40"
      }`}
    >
      <button
        aria-label={`Previous ${title}`}
        className="absolute left-[5.75rem] top-[44%] z-40 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-200/24 bg-slate-950/60 text-2xl font-black text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.16)] backdrop-blur transition hover:-translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 hover:shadow-[0_0_38px_rgba(250,204,21,0.18)] active:scale-95 sm:left-[6.25rem] sm:h-14 sm:w-14 sm:text-3xl lg:left-[6.75rem] xl:left-[7.25rem]"
        onClick={() => rotateOrbit("left")}
        type="button"
      >
        &lt;
      </button>
      <button
        aria-label={`Next ${title}`}
        className="absolute right-2 top-[44%] z-40 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-200/24 bg-slate-950/60 text-2xl font-black text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.16)] backdrop-blur transition hover:translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 hover:shadow-[0_0_38px_rgba(250,204,21,0.18)] active:scale-95 sm:right-4 sm:h-14 sm:w-14 sm:text-3xl lg:right-6 xl:right-8"
        onClick={() => rotateOrbit("right")}
        type="button"
      >
        &gt;
      </button>

      <div className="sr-only">
        {kicker}. {title}. {description}
      </div>

      <div
        aria-label={`${title} orbit selector`}
        className="relative z-10 mx-auto h-[410px] w-full max-w-[1120px] cursor-grab select-none overflow-hidden outline-none [perspective:1500px] [touch-action:pan-y] active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-cyan-200/45 sm:h-[460px]"
        onClickCapture={(event) => {
          if (pointerMovedRef.current) {
            event.preventDefault();
            event.stopPropagation();
            pointerMovedRef.current = false;
          }
        }}
        onKeyDown={(event) => handleDashboardOrbitKeyDown(event, rotateOrbit)}
        onPointerCancel={(event) => {
          pointerStartRef.current = null;
          if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
            event.currentTarget.releasePointerCapture?.(event.pointerId);
          }
        }}
        onPointerDown={(event) =>
          handleDashboardOrbitPointerDown(
            event,
            pointerStartRef,
            pointerMovedRef,
          )
        }
        onPointerMove={(event) =>
          handleDashboardOrbitPointerMove(
            event,
            pointerStartRef,
            pointerMovedRef,
            rotateOrbit,
          )
        }
        onPointerUp={(event) =>
          handleDashboardOrbitPointerUp(
            event,
            pointerStartRef,
            pointerMovedRef,
            rotateOrbit,
            setActiveIndex,
          )
        }
        onWheel={(event) => handleDashboardOrbitWheel(event, rotateOrbit)}
        onWheelCapture={(event) => handleDashboardOrbitWheel(event, rotateOrbit)}
        tabIndex={0}
      >
        {cards.map((card, index) => {
          const distance = getDistance(index);
          const absDistance = Math.abs(distance);
          const direction = Math.sign(distance);
          const orbitSlots = [
            { blur: 0, opacity: 1, rotateY: 0, scale: 1, x: 0, y: -8, zIndex: 42 },
            { blur: 0, opacity: 0.74, rotateY: -16, scale: 0.8, x: 214, y: 18, zIndex: 32 },
            { blur: 0.7, opacity: 0.48, rotateY: -28, scale: 0.63, x: 294, y: 58, zIndex: 20 },
            { blur: 1.35, opacity: 0.3, rotateY: -38, scale: 0.5, x: 198, y: 96, zIndex: 12 },
            { blur: 2.1, opacity: 0.18, rotateY: -48, scale: 0.42, x: 72, y: 126, zIndex: 8 },
          ];
          const slot = orbitSlots[Math.min(absDistance, orbitSlots.length - 1)];
          const tone = dashboardToneStyles[card.tone];
          const isActive = distance === 0;

          return (
            <article
              aria-label={
                isActive ? `${card.title} selected` : `Select ${card.title}`
              }
              aria-pressed={isActive}
              data-dashboard-orbit-card-index={index}
              className={`dashboard-orbit-card group absolute left-1/2 top-1/2 w-[270px] overflow-hidden rounded-[30px] border p-5 text-left shadow-2xl transition-[border-color,background-color,box-shadow] duration-300 sm:w-[340px] ${
                isActive
                  ? "dashboard-orbit-card--active border-cyan-200/45 bg-slate-950/86 shadow-cyan-950/35"
                  : "border-white/10 bg-slate-950/64 shadow-black/30 hover:border-cyan-200/28 hover:bg-slate-950/78"
              }`}
              key={card.title}
              onClick={() => {
                if (pointerMovedRef.current) {
                  pointerMovedRef.current = false;
                  return;
                }

                setActiveIndex(index);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActiveIndex(index);
                }
              }}
              role="button"
              style={{
                ...dashboardEffectToneStyles[card.tone],
                filter: `blur(${slot.blur}px)`,
                opacity: slot.opacity,
                transform: `translate(-50%, -50%) translateX(${
                  direction * slot.x
                }px) translateY(${slot.y}px) scale(${slot.scale}) rotateY(${
                  direction * slot.rotateY
                }deg)`,
                transition:
                  "transform 560ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 360ms ease, filter 360ms ease",
                zIndex: slot.zIndex,
              }}
              tabIndex={0}
            >
              {isActive ? (
                <span
                  aria-hidden="true"
                  className="dashboard-orbit-card__effect"
                />
              ) : null}
              <span
                className={`absolute left-6 right-6 top-0 z-10 h-[2px] rounded-full ${tone.line}`}
              />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <span
                  className={`relative flex shrink-0 items-center justify-center rounded-[24px] border ${
                    isActive ? "h-16 w-16" : "h-14 w-14"
                  } ${dashboardIconToneStyles[card.tone][
                    isActive ? "active" : "idle"
                  ]}`}
                  aria-hidden="true"
                >
                  <DashboardTabIcon
                    className={
                      isActive
                        ? "h-8 w-8 drop-shadow-[0_0_12px_rgba(255,255,255,0.26)]"
                        : "h-7 w-7 drop-shadow-[0_0_9px_rgba(255,255,255,0.18)]"
                    }
                    label={card.title}
                    name={card.icon}
                  />
                  {renderDashboardCompletionDot(
                    getDashboardNavigationCardCompletion(card),
                    isActive,
                  )}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                    isActive
                      ? "border-cyan-200/45 bg-cyan-300/12 text-cyan-50"
                      : "border-white/10 bg-white/[0.04] text-slate-400"
                  }`}
                >
                  {card.status}
                </span>
              </div>
              <h3 className="relative z-10 mt-4 text-xl font-black tracking-tight text-white">
                {card.title}
              </h3>
              <p className="relative z-10 mt-2 text-sm leading-6 text-slate-400">
                {card.description}
              </p>
              {isActive ? (
                <div className="relative z-10">
                  {renderDashboardJourneyStepOrbitPanel(card)}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );

  const renderDashboardFloatingSnapshotHeader = () => {
    if (
      clampedDashboardOrbiterRow <= 2 ||
      clampedDashboardOrbiterRow === 4 ||
      clampedDashboardOrbiterRow === 5
    ) {
      return null;
    }

    return (
    <div className="pointer-events-none absolute inset-x-0 top-[118px] z-[70] px-3 sm:top-[122px] sm:px-5 lg:top-[126px] lg:px-8">
      <section className="pointer-events-auto relative mx-auto max-w-[1280px] overflow-visible px-1 py-2 sm:px-2 sm:py-3">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-8 top-0 h-28 w-[min(46rem,72vw)] rounded-full bg-[radial-gradient(ellipse_at_18%_42%,rgba(34,211,238,0.30),rgba(14,165,233,0.14)_34%,transparent_72%)] blur-2xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-2 h-px w-[min(34rem,70vw)] bg-gradient-to-r from-cyan-200/75 via-amber-200/28 to-transparent shadow-[0_0_18px_rgba(34,211,238,0.38)]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-10 h-16 w-[min(32rem,68vw)] bg-[linear-gradient(90deg,rgba(34,211,238,0.10),rgba(15,23,42,0.03),transparent)] blur-xl"
        />
        <div className="relative z-10 flex flex-col gap-2 min-[760px]:flex-row min-[760px]:items-center min-[760px]:justify-between">
          <div className="min-w-0 min-[760px]:max-w-[390px] min-[1040px]:max-w-[540px]">
            <div className="min-w-0">
              {clampedDashboardOrbiterRow === 0 ? null : (
                <div
                  className={`flex max-w-full items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] ${dashboardFloatingSnapshotRowTone.text}`}
                >
                  <span
                    aria-hidden="true"
                    className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${dashboardFloatingSnapshotRowTone.ring}`}
                  >
                    <span
                      className={`grid h-3 w-3 place-items-center rounded-full text-[7px] font-black leading-none text-slate-950 ${dashboardFloatingSnapshotRowTone.dot}`}
                    >
                      {dashboardFloatingSnapshotRowTone.icon}
                    </span>
                  </span>
                  <span className="min-w-0 truncate">
                    {dashboardFloatingSnapshotEyebrow}
                  </span>
                </div>
              )}
              {clampedDashboardOrbiterRow === 0 ? null : (
                <h2 className="mt-0.5 truncate text-lg font-black uppercase tracking-[0.08em] text-white sm:text-xl">
                  {dashboardFloatingSnapshotTitle}
                </h2>
              )}
              <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold leading-4 text-slate-400">
                {dashboardFloatingSnapshotDescription}
              </p>
              {dashboardFloatingSnapshotRowCards.length ? (
                <div
                  aria-label={`${dashboardFloatingSnapshotEyebrow} card orbit`}
                  className="relative mt-1 h-9 w-[300px] max-w-full overflow-visible [perspective:760px] sm:w-[340px]"
                >
                  {dashboardFloatingSnapshotRowCards.map((card, cardIndex) => {
                    const activeCardIndex =
                      dashboardFloatingSnapshotActiveCardIndex >= 0
                        ? dashboardFloatingSnapshotActiveCardIndex
                        : 0;
                    const distance = getDashboardOrbitDistance(
                      cardIndex,
                      activeCardIndex,
                      dashboardFloatingSnapshotRowCards.length,
                    );
                    const clampedDistance = Math.max(-3, Math.min(3, distance));
                    const absDistance = Math.abs(clampedDistance);
                    const direction = Math.sign(clampedDistance);
                    const isActiveCard =
                      cardIndex === activeCardIndex;
                    const cardTone = getDashboardRowUrgencyTone(
                      getDashboardNavigationCardCompletion(card),
                    );
                    const xSlots = [0, 38, 76, 114];
                    const x = direction * xSlots[absDistance];
                    const scale =
                      absDistance === 0
                        ? 1
                        : absDistance === 1
                          ? 0.86
                          : absDistance === 2
                            ? 0.72
                            : 0.58;
                    const opacity =
                      absDistance === 0
                        ? 1
                        : absDistance === 1
                          ? 0.86
                          : absDistance === 2
                            ? 0.62
                            : 0.42;
                    const rotateY = direction * -18;

                    return (
                      <button
                        aria-label={`Show ${card.title} card, ${cardTone.label}`}
                        aria-pressed={isActiveCard}
                        className={`absolute left-1/2 top-1/2 flex h-8 items-center justify-center overflow-hidden rounded-full border text-left shadow-[0_14px_34px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl transition-[width,border-color,background-color,box-shadow] duration-300 hover:-translate-y-0.5 active:scale-95 ${
                          isActiveCard
                            ? `${dashboardIconToneStyles[card.tone].active} w-8 px-0 text-white`
                            : `${dashboardIconToneStyles[card.tone].idle} w-8 px-0 hover:brightness-125`
                        }`}
                        key={`${dashboardFloatingSnapshotEyebrow}-${card.title}`}
                        onClick={() => {
                          if (clampedDashboardOrbiterRow === 3) {
                            setActiveCommandCenterIndex(cardIndex);
                            return;
                          }

                          if (clampedDashboardOrbiterRow === 6) {
                            setActiveSystemCenterIndex(cardIndex);
                          }
                        }}
                        style={{
                          opacity,
                          transform: `translate(-50%, -50%) translateX(${x}px) translateZ(${
                            isActiveCard ? 42 : 16 - absDistance * 6
                          }px) rotateY(${rotateY}deg) scale(${scale})`,
                          transition:
                            "transform 520ms cubic-bezier(0.2,0.82,0.2,1), opacity 260ms ease, width 300ms ease, border-color 220ms ease, background-color 220ms ease, box-shadow 220ms ease",
                          zIndex: 30 - absDistance,
                        }}
                        data-dashboard-tooltip={`${card.title} - ${cardTone.label}`}
                        type="button"
                      >
                        <span className="sr-only">{card.title}</span>
                        <DashboardTabIcon
                          className={`shrink-0 ${
                            isActiveCard ? "h-3.5 w-3.5" : "h-3 w-3"
                          }`}
                          label={card.title}
                          name={card.icon}
                        />
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>

          <div className="dashboard-constellation-orbit relative min-h-[108px] min-w-0 flex-1 overflow-visible [perspective:780px] min-[760px]:max-w-[250px] min-[1040px]:max-w-[280px]">
            <span
              aria-hidden="true"
              className="dashboard-constellation-orbit__field"
            />
            <div
              aria-live="polite"
              className="sr-only"
            >
              {activeDashboardFloatingMetric
                ? `${activeDashboardFloatingMetric.label}: ${activeDashboardFloatingMetric.value}`
                : "Dashboard metric orbit"}
            </div>
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[94px] w-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-cyan-200/24 to-transparent shadow-[0_0_18px_rgba(34,211,238,0.20)]" />
            <div
              aria-label={`${dashboardFloatingSnapshotTitle} metric orbit`}
              className="absolute inset-0 [transform-style:preserve-3d]"
            >
              {dashboardFloatingSnapshotMetrics.map((metric, metricIndex) => {
                const activeMetricIndex =
                  activeDashboardFloatingMetricIndex %
                  Math.max(1, dashboardFloatingSnapshotMetrics.length);
                const distance = getDashboardOrbitDistance(
                  metricIndex,
                  activeMetricIndex,
                  dashboardFloatingSnapshotMetrics.length,
                );
                const clampedDistance = Math.max(-2, Math.min(2, distance));
                const absDistance = Math.abs(clampedDistance);
                const isActive = distance === 0;
                const direction = Math.sign(clampedDistance);
                const metricTone = [
                  "cyan",
                  "amber",
                  "emerald",
                  "violet",
                ][metricIndex % 4] as DashboardCardTone;
                const metricUrgencyTone = getDashboardRowUrgencyTone(
                  getDashboardFloatingMetricCompletion(metric),
                );
                const ySlots = [0, 35, 66];
                const y = direction * ySlots[absDistance];
                const x = isActive ? 0 : absDistance * 7;
                const scale = isActive ? 1 : absDistance === 1 ? 0.84 : 0.68;
                const opacity = isActive ? 1 : absDistance === 1 ? 0.72 : 0.34;
                const rotateX = direction * -18;

                return (
                  <button
                    aria-label={`Show ${metric.label} metric, ${metric.value}, ${metricUrgencyTone.label}`}
                    aria-pressed={isActive}
                    className={`dashboard-constellation-metric group absolute left-1/2 top-1/2 isolate flex h-10 items-center justify-between gap-3 overflow-visible rounded-2xl border px-3 text-left shadow-[0_16px_42px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl transition-[width,border-color,background-color,box-shadow,filter] duration-300 ${
                      isActive
                        ? `dashboard-constellation-metric--active ${dashboardIconToneStyles[metricTone].active} w-[208px]`
                        : `${dashboardIconToneStyles[metricTone].idle} w-[174px] hover:brightness-125`
                    }`}
                    key={`${dashboardFloatingSnapshotTitle}-${metric.label}`}
                    onClick={() =>
                      setActiveDashboardFloatingMetricIndex(metricIndex)
                    }
                    style={{
                      opacity,
                      transform: `translate(-50%, -50%) translateX(${x}px) translateY(${y}px) translateZ(${
                        isActive ? 62 : 18 - absDistance * 8
                      }px) rotateX(${rotateX}deg) scale(${scale})`,
                      transition:
                        "transform 560ms cubic-bezier(0.2, 0.82, 0.2, 1), opacity 320ms ease, width 260ms ease, border-color 220ms ease, background-color 220ms ease, box-shadow 220ms ease",
                      zIndex: 30 - absDistance,
                    }}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className="dashboard-constellation-metric__zoom"
                    />
                    <span
                      aria-hidden="true"
                      className="dashboard-constellation-metric__lines"
                    />
                    <span
                      aria-hidden="true"
                      className="dashboard-constellation-metric__stars"
                    />
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-5 top-0 z-10 h-px rounded-full ${dashboardToneStyles[metricTone].line}`}
                    />
                    <span className="relative z-10 min-w-0">
                      <span className="block truncate text-[7px] font-black uppercase tracking-[0.14em] text-slate-300/80">
                        {metric.label}
                      </span>
                      <span className="block truncate text-sm font-black tracking-tight text-white">
                        {metric.value}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={`relative z-10 grid h-4 w-4 shrink-0 place-items-center rounded-full border bg-slate-950/72 text-[7px] font-black leading-none text-slate-950 ring-1 ring-white/10 ${
                        isActive
                          ? `${metricUrgencyTone.ring} ${metricUrgencyTone.text}`
                          : "border-white/10 text-slate-500"
                      }`}
                    >
                      <span
                        className={`grid h-3 w-3 place-items-center rounded-full text-slate-950 ${
                          isActive
                            ? metricUrgencyTone.dot
                            : `${metricUrgencyTone.dot} opacity-45 grayscale`
                        }`}
                      >
                        {isActive ? metricUrgencyTone.icon : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
    );
  };

  const renderDashboardProfileHubOrbitCard = ({
    activeIndex,
    index,
    item,
    itemCount,
    setActiveIndex,
  }: {
    activeIndex: number;
    index: number;
    item: DashboardProfileHubOrbitItem;
    itemCount: number;
    setActiveIndex: (index: number) => void;
  }) => {
    const distance = getDashboardProfileHubOrbitDistance(
      index,
      activeIndex,
      itemCount,
    );
    const absDistance = Math.abs(distance);
    const clampedDistance = Math.max(-3, Math.min(3, distance));
    const xSlots = [0, 252, 398, 516];
    const x =
      Math.sign(clampedDistance) *
      xSlots[Math.min(absDistance, xSlots.length - 1)];
    const y = absDistance * 18 + (absDistance > 1 ? 8 : 0);
    const isActive = distance === 0;
    const scale = isActive ? 1.04 : absDistance === 1 ? 0.82 : 0.64;
    const opacity = isActive ? 1 : absDistance === 1 ? 0.76 : 0.34;
    const rotateY = clampedDistance * -18;

    return (
      <article
        aria-current={isActive ? "page" : undefined}
        className={`absolute left-1/2 top-1/2 rounded-[28px] border text-left shadow-[0_18px_44px_rgba(0,0,0,0.38)] outline-none backdrop-blur transition-[transform,opacity,filter,border-color,background-color,box-shadow,width,padding] duration-[520ms] ease-[cubic-bezier(0.2,0.85,0.25,1)] ${
          isActive
            ? "p-5 ring-2 ring-cyan-100/24"
            : "cursor-pointer p-4 hover:border-white/25"
        } ${item.tone}`}
        key={item.label}
        onClick={() => {
          if (!isActive) setActiveIndex(index);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;

          event.preventDefault();
          if (!isActive) setActiveIndex(index);
        }}
        role="button"
        style={{
          filter: absDistance > 2 ? "blur(1.4px)" : "none",
          opacity,
          transform: `translate(-50%, -50%) translateX(${x}px) translateY(${y}px) rotateY(${rotateY}deg) scale(${scale})`,
          width: isActive ? "min(84vw, 336px)" : "190px",
          zIndex: 40 - absDistance,
        }}
        tabIndex={0}
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={`grid shrink-0 place-items-center rounded-2xl border border-white/12 bg-slate-950/42 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${
              isActive ? "h-12 w-12" : "h-10 w-10"
            }`}
          >
            <DashboardTabIcon
              className={isActive ? "h-6 w-6" : "h-5 w-5"}
              name={item.icon}
            />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-white">
              {item.label}
            </div>
            <div className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.12em] text-current/80">
              {item.stat}
            </div>
          </div>
        </div>

        <p
          className={`mt-3 font-semibold text-slate-300 ${
            isActive
              ? "line-clamp-3 text-xs leading-5"
              : "line-clamp-2 text-[10px] leading-4"
          }`}
        >
          {item.helper}
        </p>

        {isActive ? (
          <>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.references.map((reference) => (
                <span
                  className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-slate-200"
                  key={`${item.label}-${reference}`}
                >
                  {reference}
                </span>
              ))}
            </div>
            <Link
              className="mt-4 inline-flex min-h-[42px] w-full items-center justify-center rounded-2xl border border-cyan-200/32 bg-cyan-300/14 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.12)] transition hover:-translate-y-0.5 hover:border-cyan-100/48 hover:bg-cyan-300/20"
              href={item.href}
              onClick={closeDashboardProfileHub}
            >
              Open {item.label}
            </Link>
          </>
        ) : null}
      </article>
    );
  };

  const renderDashboardProfileHubRowIndicators = ({
    activeIndex,
    items,
    setActiveIndex,
    tone,
  }: {
    activeIndex: number;
    items: DashboardProfileHubOrbitItem[];
    setActiveIndex: (index: number) => void;
    tone: "amber" | "cyan";
  }) => (
    <div className="pointer-events-auto mt-2 flex justify-center gap-1.5">
      {items.map((item, index) => {
        const isActive = index === activeIndex;
        const activeClasses =
          tone === "cyan"
            ? "border-cyan-100/55 bg-cyan-300/18 text-cyan-50 shadow-[0_0_16px_rgba(34,211,238,0.22)]"
            : "border-amber-100/55 bg-amber-300/18 text-amber-50 shadow-[0_0_16px_rgba(250,204,21,0.18)]";
        const idleClasses =
          tone === "cyan"
            ? "border-cyan-100/14 bg-cyan-300/[0.06] text-cyan-100/55 hover:border-cyan-100/35 hover:bg-cyan-300/12 hover:text-cyan-50"
            : "border-amber-100/14 bg-amber-300/[0.06] text-amber-100/55 hover:border-amber-100/35 hover:bg-amber-300/12 hover:text-amber-50";

        return (
          <button
            aria-label={`Show ${item.label} profile hub card`}
            aria-pressed={isActive}
            className={`grid h-7 w-7 place-items-center rounded-full border transition active:scale-95 ${
              isActive ? activeClasses : idleClasses
            }`}
            key={item.label}
            data-dashboard-tooltip={item.label}
            onClick={(event) => {
              event.stopPropagation();
              setActiveIndex(index);
            }}
            type="button"
          >
            <span className="sr-only">{item.label}</span>
            <DashboardTabIcon
              className="h-3.5 w-3.5"
              label={item.label}
              name={item.icon}
            />
          </button>
        );
      })}
    </div>
  );

  const renderDashboardProfileHubOverlay = () => {
    if (!dashboardProfileHubOpen) return null;

    const layerStyle = (layer: number) => {
      const offset = layer - activeDashboardProfileHubLayer;
      const absOffset = Math.abs(offset);

      return {
        filter: absOffset > 1 ? "blur(5px)" : absOffset ? "blur(1px)" : "none",
        opacity: absOffset === 0 ? 1 : absOffset === 1 ? 0.42 : 0,
        pointerEvents: absOffset === 0 ? "auto" : "none",
        transform: `translateY(${offset * 54}%) scale(${
          absOffset === 0 ? 1 : absOffset === 1 ? 0.9 : 0.82
        })`,
        zIndex: 30 - absOffset,
      } as CSSProperties;
    };

    return (
      <div
        aria-modal="true"
        className="fixed inset-0 z-[240] overflow-hidden"
        id="dashboard-profile-hub-orbital-overlay"
        role="dialog"
      >
        <button
          aria-label="Close profile hub overlay"
          className="absolute inset-0 bg-slate-950/82 backdrop-blur-xl"
          onClick={closeDashboardProfileHub}
          type="button"
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.20),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(250,204,21,0.13),transparent_30%),linear-gradient(180deg,rgba(2,6,23,0.34),rgba(2,6,23,0.92))]" />

        <button
          aria-label="Close profile hub"
          className="absolute right-5 top-5 z-50 grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-slate-950/72 text-xs font-black text-slate-300 shadow-[0_18px_44px_rgba(0,0,0,0.34)] backdrop-blur transition hover:border-cyan-200/40 hover:bg-cyan-300/10 hover:text-cyan-100"
          onClick={closeDashboardProfileHub}
          type="button"
        >
          X
        </button>

        <div className="absolute left-5 top-1/2 z-50 flex -translate-y-1/2 flex-col gap-2 rounded-[26px] border border-white/10 bg-slate-950/54 p-2 shadow-[0_18px_54px_rgba(0,0,0,0.38)] backdrop-blur-xl">
          <button
            aria-label="Move profile hub layer up"
            className="grid h-9 w-10 place-items-center rounded-2xl border border-cyan-200/18 bg-cyan-300/10 text-xs font-black text-cyan-100 transition hover:border-cyan-200/42 hover:bg-cyan-300/16 disabled:cursor-not-allowed disabled:opacity-35"
            disabled={activeDashboardProfileHubLayer === 0}
            onClick={() => rotateDashboardProfileHubLayer("up")}
            type="button"
          >
            ^
          </button>
          {dashboardProfileHubLayerMenuItems.map((item) => {
            const isActive = item.layer === activeDashboardProfileHubLayer;

            return (
              <button
                aria-label={`Show ${item.label} layer`}
                aria-pressed={isActive}
                className={`grid h-12 w-10 place-items-center rounded-2xl border text-[8px] font-black uppercase tracking-[0.09em] transition ${
                  isActive
                    ? "border-cyan-100/44 bg-cyan-300/16 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.18)]"
                    : "border-white/10 bg-white/[0.04] text-slate-500 hover:border-amber-200/28 hover:bg-amber-300/10 hover:text-amber-100"
                }`}
                key={item.label}
                onClick={() => selectDashboardProfileHubLayer(item.layer)}
                type="button"
              >
                {item.label.split(" ")[0]}
              </button>
            );
          })}
          <button
            aria-label="Move profile hub layer down"
            className="grid h-9 w-10 place-items-center rounded-2xl border border-amber-200/18 bg-amber-300/10 text-xs font-black text-amber-100 transition hover:border-amber-200/42 hover:bg-amber-300/16 disabled:cursor-not-allowed disabled:opacity-35"
            disabled={activeDashboardProfileHubLayer === 2}
            onClick={() => rotateDashboardProfileHubLayer("down")}
            type="button"
          >
            v
          </button>
        </div>

        <div className="absolute inset-0 [perspective:1500px] [transform-style:preserve-3d]">
          <section
            className="absolute inset-0 transition-[transform,opacity,filter] duration-[560ms] ease-[cubic-bezier(0.2,0.85,0.25,1)]"
            style={layerStyle(0)}
          >
            <div className="absolute inset-x-0 top-[32%] z-20 flex -translate-y-1/2 justify-center px-4 [transform:translateY(-50%)_translateZ(58px)] sm:px-6">
              <div className="grid w-[min(90vw,900px)] gap-4 rounded-[28px] border border-cyan-100/22 bg-slate-950/76 p-4 text-left shadow-[0_24px_64px_rgba(0,0,0,0.42),0_0_30px_rgba(34,211,238,0.12)] sm:p-5 md:grid-cols-[minmax(0,1fr)_minmax(220px,260px)] md:items-stretch">
                <div className="flex min-w-0 items-center gap-4">
                  <Image
                    alt={`${firstName} profile`}
                    className="h-14 w-14 rounded-full border border-cyan-100/30 bg-slate-950 object-contain p-1 shadow-[0_0_24px_rgba(34,211,238,0.18)] sm:h-16 sm:w-16"
                    height={56}
                    src="/sound-fitness-logo.png"
                    width={56}
                  />
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-100 sm:text-[10px]">
                      Profile Reward Hub
                    </p>
                    <p className="mt-1 truncate text-lg font-black text-white sm:text-xl">
                      {firstName}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs font-semibold leading-5 text-slate-400 sm:text-sm">
                      Profile, rewards, coach context, and account controls.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[
                        `${dashboardProfileHubCompletion}% profile`,
                        dashboardFoundationProgress.goalFocus || "Goals open",
                        dashboardSummary.hasStats ? "Stats active" : "Stats open",
                      ].map((reference) => (
                        <span
                          className="rounded-2xl border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-slate-200"
                          key={reference}
                        >
                          {reference}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid w-full shrink-0 gap-2 sm:grid-cols-3 md:w-auto md:grid-cols-1">
                  <div className="rounded-2xl border border-emerald-200/22 bg-emerald-300/10 px-3 py-2.5">
                    <div className="text-[8px] font-black uppercase tracking-[0.14em] text-emerald-100/70">
                      Emeralds
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-lg font-black text-white sm:text-xl">
                      <span
                        aria-hidden="true"
                        className="dashboard-emerald-gem h-7 w-7"
                      />
                      {soundEmeralds.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-amber-200/22 bg-amber-300/10 px-3 py-2.5">
                    <div className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-100/70">
                      Sound Points
                    </div>
                    <div className="text-lg font-black text-white sm:text-xl">
                      {soundPoints.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-cyan-200/18 bg-cyan-300/10 px-3 py-2.5">
                    <div className="text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100/70">
                      Sound Tokens
                    </div>
                    <div className="flex items-center gap-2 text-lg font-black text-white sm:text-xl">
                      <Image
                        alt=""
                        aria-hidden="true"
                        className="h-8 w-8 rounded-full object-contain drop-shadow-[0_0_14px_rgba(34,211,238,0.28)]"
                        height={32}
                        src="/sound-token.png"
                        width={32}
                      />
                      {soundTokens.toLocaleString()}
                    </div>
                  </div>
                </div>
                <Link
                  className="inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-cyan-200/32 bg-cyan-300/14 px-4 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-50 transition hover:-translate-y-0.5 hover:bg-cyan-300/20 md:col-span-2"
                  href={ROUTES.dashboard.profile}
                  onClick={closeDashboardProfileHub}
                >
                  Open Full Profile
                </Link>
              </div>
            </div>
          </section>

          <section
            className="absolute inset-0 transition-[transform,opacity,filter] duration-[560ms] ease-[cubic-bezier(0.2,0.85,0.25,1)]"
            style={layerStyle(1)}
          >
            <div className="pointer-events-none absolute left-1/2 top-[26%] z-40 w-[min(88vw,460px)] -translate-x-1/2 rounded-2xl border border-cyan-200/24 bg-cyan-300/10 px-3 py-2 text-center text-cyan-100 shadow-[0_16px_44px_rgba(0,0,0,0.28)] backdrop-blur">
              <div className="text-[9px] font-black uppercase tracking-[0.16em]">
                My Hub Row
              </div>
              <div className="mt-1 text-[10px] font-bold leading-4 text-slate-300">
                Profile stats, body context, readiness, plan, and coach notes.
              </div>
              {renderDashboardProfileHubRowIndicators({
                activeIndex: activeDashboardProfileHubMainIndex,
                items: dashboardProfileHubMainItems,
                setActiveIndex: setActiveDashboardProfileHubMainIndex,
                tone: "cyan",
              })}
            </div>
            <button
              aria-label="Previous profile hub card"
              className="absolute left-[8%] top-1/2 z-40 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/24 bg-slate-950/72 text-lg font-black text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.14)] backdrop-blur transition hover:-translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100"
              onClick={() => rotateDashboardProfileHubOrbit("left")}
              type="button"
            >
              &lt;
            </button>
            <button
              aria-label="Next profile hub card"
              className="absolute right-[8%] top-1/2 z-40 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/24 bg-slate-950/72 text-lg font-black text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.14)] backdrop-blur transition hover:translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100"
              onClick={() => rotateDashboardProfileHubOrbit("right")}
              type="button"
            >
              &gt;
            </button>
            <div className="absolute inset-x-0 top-[56%] h-[360px] -translate-y-1/2 [transform-style:preserve-3d]">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 h-[230px] w-[min(88vw,1120px)] -translate-x-1/2 -translate-y-1/2 rounded-[46px] bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.11),rgba(99,102,241,0.08)_42%,transparent_74%)] blur-xl"
              />
              {dashboardProfileHubMainItems.map((item, index) =>
                renderDashboardProfileHubOrbitCard({
                  activeIndex: activeDashboardProfileHubMainIndex,
                  index,
                  item,
                  itemCount: dashboardProfileHubMainItems.length,
                  setActiveIndex: setActiveDashboardProfileHubMainIndex,
                }),
              )}
            </div>
          </section>

          <section
            className="absolute inset-0 transition-[transform,opacity,filter] duration-[560ms] ease-[cubic-bezier(0.2,0.85,0.25,1)]"
            style={layerStyle(2)}
          >
            <div className="pointer-events-none absolute left-1/2 top-[26%] z-40 w-[min(88vw,430px)] -translate-x-1/2 rounded-2xl border border-amber-200/24 bg-amber-300/10 px-3 py-2 text-center text-amber-100 shadow-[0_16px_44px_rgba(0,0,0,0.28)] backdrop-blur">
              <div className="text-[9px] font-black uppercase tracking-[0.16em]">
                Account Row
              </div>
              <div className="mt-1 text-[10px] font-bold leading-4 text-slate-300">
                Settings, billing, help, and achievements.
              </div>
              {renderDashboardProfileHubRowIndicators({
                activeIndex: activeDashboardProfileHubAccountIndex,
                items: dashboardProfileHubAccountItems,
                setActiveIndex: setActiveDashboardProfileHubAccountIndex,
                tone: "amber",
              })}
            </div>
            <button
              aria-label="Previous account card"
              className="absolute left-[8%] top-1/2 z-40 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-amber-200/24 bg-slate-950/72 text-lg font-black text-amber-100 shadow-[0_0_22px_rgba(250,204,21,0.12)] backdrop-blur transition hover:-translate-x-0.5 hover:border-cyan-200/45 hover:bg-cyan-300/10 hover:text-cyan-100"
              onClick={() => rotateDashboardProfileHubAccountOrbit("left")}
              type="button"
            >
              &lt;
            </button>
            <button
              aria-label="Next account card"
              className="absolute right-[8%] top-1/2 z-40 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-amber-200/24 bg-slate-950/72 text-lg font-black text-amber-100 shadow-[0_0_22px_rgba(250,204,21,0.12)] backdrop-blur transition hover:translate-x-0.5 hover:border-cyan-200/45 hover:bg-cyan-300/10 hover:text-cyan-100"
              onClick={() => rotateDashboardProfileHubAccountOrbit("right")}
              type="button"
            >
              &gt;
            </button>
            <div className="absolute inset-x-0 top-[56%] h-[360px] -translate-y-1/2 [transform-style:preserve-3d]">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 h-[204px] w-[min(84vw,1000px)] -translate-x-1/2 -translate-y-1/2 rounded-[42px] bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.10),rgba(34,211,238,0.07)_44%,transparent_74%)] blur-xl"
              />
              {dashboardProfileHubAccountItems.map((item, index) =>
                renderDashboardProfileHubOrbitCard({
                  activeIndex: activeDashboardProfileHubAccountIndex,
                  index,
                  item,
                  itemCount: dashboardProfileHubAccountItems.length,
                  setActiveIndex: setActiveDashboardProfileHubAccountIndex,
                }),
              )}
            </div>
          </section>
        </div>
      </div>
    );
  };

  const renderDashboardHeaderCategoryActorFigure = () => (
    <svg
      aria-hidden="true"
      className="dashboard-header-category-actor__figure"
      focusable="false"
      viewBox="0 0 64 64"
    >
      <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--squat-up">
        <line x1="14" x2="50" y1="16" y2="16" />
        <circle cx="32" cy="10.5" r="4.3" />
        <line x1="32" x2="32" y1="15" y2="31" />
        <line x1="32" x2="18" y1="20" y2="16" />
        <line x1="32" x2="46" y1="20" y2="16" />
        <polyline points="32 31 25 40 23 52" />
        <polyline points="32 31 39 40 41 52" />
        <line x1="20" x2="28" y1="52" y2="52" />
        <line x1="36" x2="44" y1="52" y2="52" />
      </g>
      <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--squat-down">
        <line x1="12" x2="52" y1="21" y2="21" />
        <circle cx="32" cy="15.5" r="4.3" />
        <line x1="32" x2="32" y1="20" y2="36" />
        <line x1="32" x2="17" y1="24" y2="21" />
        <line x1="32" x2="47" y1="24" y2="21" />
        <polyline points="32 36 22 43 17 52" />
        <polyline points="32 36 42 43 47 52" />
        <line x1="14" x2="24" y1="52" y2="52" />
        <line x1="40" x2="50" y1="52" y2="52" />
      </g>
      <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--jack-closed">
        <circle cx="32" cy="10.5" r="4.3" />
        <line x1="32" x2="32" y1="15" y2="32" />
        <line x1="32" x2="24" y1="21" y2="39" />
        <line x1="32" x2="40" y1="21" y2="39" />
        <line x1="32" x2="28" y1="32" y2="52" />
        <line x1="32" x2="36" y1="32" y2="52" />
      </g>
      <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--jack-open">
        <circle cx="32" cy="8.5" r="4.3" />
        <line x1="32" x2="32" y1="13" y2="31" />
        <line x1="32" x2="17" y1="20" y2="7" />
        <line x1="32" x2="47" y1="20" y2="7" />
        <line x1="32" x2="19" y1="31" y2="52" />
        <line x1="32" x2="45" y1="31" y2="52" />
      </g>
      <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--leg-extension-bent">
        <line x1="16" x2="49" y1="36" y2="36" />
        <circle cx="30" cy="13" r="4.3" />
        <line x1="30" x2="25" y1="17.5" y2="32" />
        <line x1="27" x2="18" y1="24" y2="36" />
        <line x1="27" x2="42" y1="33" y2="38" />
        <polyline points="42 38 44 47 50 52" />
        <line x1="18" x2="22" y1="36" y2="52" />
        <line x1="45" x2="49" y1="36" y2="52" />
      </g>
      <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--leg-extension-straight">
        <line x1="16" x2="49" y1="36" y2="36" />
        <circle cx="30" cy="13" r="4.3" />
        <line x1="30" x2="25" y1="17.5" y2="32" />
        <line x1="27" x2="18" y1="24" y2="36" />
        <line x1="27" x2="42" y1="33" y2="38" />
        <line x1="42" x2="56" y1="38" y2="37" />
        <line x1="18" x2="22" y1="36" y2="52" />
        <line x1="45" x2="49" y1="36" y2="52" />
      </g>
      <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--situp-down">
        <circle cx="18" cy="38" r="4.3" />
        <line x1="22" x2="42" y1="39" y2="42" />
        <polyline points="17 35 12 31 15 28" />
        <polyline points="19 36 15 31 18 28" />
        <polyline points="42 42 48 34 55 34" />
        <polyline points="42 42 51 48 57 48" />
      </g>
      <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--situp-up">
        <circle cx="28" cy="22" r="4.3" />
        <line x1="30" x2="42" y1="26" y2="41" />
        <polyline points="27 20 21 16 23 12" />
        <polyline points="29 20 25 15 28 12" />
        <polyline points="42 41 48 34 55 34" />
        <polyline points="42 41 51 48 57 48" />
      </g>
      <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--press-rack">
        <line x1="17" x2="47" y1="22" y2="22" />
        <circle cx="32" cy="12" r="4.3" />
        <line x1="32" x2="32" y1="16.5" y2="33" />
        <polyline points="32 23 23 28 17 22" />
        <polyline points="32 23 41 28 47 22" />
        <line x1="32" x2="25" y1="33" y2="52" />
        <line x1="32" x2="39" y1="33" y2="52" />
      </g>
      <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--press-overhead">
        <line x1="16" x2="48" y1="7" y2="7" />
        <circle cx="32" cy="17" r="4.3" />
        <line x1="32" x2="32" y1="21.5" y2="36" />
        <line x1="32" x2="22" y1="24" y2="7" />
        <line x1="32" x2="42" y1="24" y2="7" />
        <line x1="32" x2="25" y1="36" y2="52" />
        <line x1="32" x2="39" y1="36" y2="52" />
      </g>
      <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--pull-reach">
        <line x1="12" x2="52" y1="15" y2="15" />
        <circle cx="32" cy="24" r="4.3" />
        <line x1="32" x2="32" y1="28.5" y2="42" />
        <line x1="32" x2="22" y1="31" y2="16" />
        <line x1="32" x2="42" y1="31" y2="16" />
        <line x1="32" x2="25" y1="42" y2="54" />
        <line x1="32" x2="39" y1="42" y2="54" />
      </g>
      <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--pull-row">
        <line x1="12" x2="52" y1="15" y2="15" />
        <circle cx="32" cy="19" r="4.3" />
        <line x1="32" x2="32" y1="23.5" y2="39" />
        <line x1="32" x2="22" y1="27" y2="22" />
        <line x1="32" x2="42" y1="27" y2="22" />
        <line x1="32" x2="24" y1="39" y2="53" />
        <line x1="32" x2="40" y1="39" y2="53" />
      </g>
      <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--curl-low">
        <circle cx="32" cy="10.5" r="4.3" />
        <line x1="32" x2="32" y1="15" y2="32" />
        <line x1="32" x2="20" y1="21" y2="38" />
        <line x1="32" x2="44" y1="21" y2="38" />
        <line x1="32" x2="25" y1="32" y2="52" />
        <line x1="32" x2="39" y1="32" y2="52" />
        <line x1="18" x2="24" y1="39" y2="39" />
        <line x1="40" x2="46" y1="39" y2="39" />
      </g>
      <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--curl-high">
        <circle cx="32" cy="10.5" r="4.3" />
        <line x1="32" x2="32" y1="15" y2="32" />
        <polyline points="32 21 22 29 22 20" />
        <polyline points="32 21 42 29 42 20" />
        <line x1="32" x2="25" y1="32" y2="52" />
        <line x1="32" x2="39" y1="32" y2="52" />
        <line x1="19" x2="25" y1="20" y2="20" />
        <line x1="39" x2="45" y1="20" y2="20" />
      </g>
      <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--clean-pull">
        <line x1="17" x2="47" y1="42" y2="42" />
        <circle cx="29" cy="14" r="4.3" />
        <line x1="30" x2="35" y1="18.5" y2="34" />
        <line x1="33" x2="24" y1="25" y2="42" />
        <line x1="35" x2="44" y1="25" y2="42" />
        <polyline points="35 34 25 43 23 54" />
        <polyline points="35 34 43 43 45 54" />
      </g>
      <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--clean-rack">
        <line x1="17" x2="47" y1="23" y2="23" />
        <circle cx="32" cy="12" r="4.3" />
        <line x1="32" x2="32" y1="16.5" y2="34" />
        <polyline points="20 23 30 26 24 31" />
        <polyline points="44 23 34 26 40 31" />
        <line x1="32" x2="25" y1="34" y2="52" />
        <line x1="32" x2="39" y1="34" y2="52" />
      </g>
      <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--mobility-left">
        <circle cx="32" cy="11" r="4.3" />
        <line x1="32" x2="29" y1="15.5" y2="33" />
        <line x1="31" x2="18" y1="21" y2="12" />
        <line x1="31" x2="44" y1="21" y2="30" />
        <line x1="29" x2="20" y1="33" y2="52" />
        <line x1="29" x2="41" y1="33" y2="52" />
      </g>
      <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--mobility-right">
        <circle cx="32" cy="11" r="4.3" />
        <line x1="32" x2="35" y1="15.5" y2="33" />
        <line x1="33" x2="46" y1="21" y2="12" />
        <line x1="33" x2="20" y1="21" y2="30" />
        <line x1="35" x2="23" y1="33" y2="52" />
        <line x1="35" x2="44" y1="33" y2="52" />
      </g>
      <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--neck-center">
        <circle cx="32" cy="11" r="4.3" />
        <line x1="32" x2="32" y1="15.5" y2="34" />
        <line x1="32" x2="23" y1="22" y2="32" />
        <line x1="32" x2="41" y1="22" y2="32" />
        <line x1="32" x2="26" y1="34" y2="52" />
        <line x1="32" x2="38" y1="34" y2="52" />
        <path d="M25 8 C28 4 36 4 39 8" />
      </g>
      <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--neck-tilt">
        <circle cx="36" cy="12" r="4.3" />
        <line x1="33" x2="32" y1="16" y2="34" />
        <line x1="32" x2="23" y1="22" y2="32" />
        <line x1="32" x2="41" y1="22" y2="32" />
        <line x1="32" x2="26" y1="34" y2="52" />
        <line x1="32" x2="38" y1="34" y2="52" />
        <path d="M29 8 C32 5 39 6 42 11" />
      </g>
    </svg>
  );

  const renderDashboardHeaderTimeoutPortalMeter = () => {
    if (!dashboardHeaderTimeoutPortalMeter) return null;

    const portalActualClass = "dashboard-header-timeout-meter-portal__actual";

    if (dashboardHeaderTimeoutPortalMeter.id === "sessions") {
      return (
        <div
          aria-hidden="true"
          className={`${portalActualClass} dashboard-header-week-sessions dashboard-header-meter-scroller__meter dashboard-header-meter-scroller__meter--center text-emerald-50`}
          role="meter"
          style={
            {
              "--dashboard-week-session-bar": `${dashboardSummary.weeklySessionProgress}%`,
            } as CSSProperties
          }
        >
          <span aria-hidden="true" className="dashboard-header-week-sessions__graph">
            <span
              className={`dashboard-header-week-sessions__bar ${
                dashboardSummary.workoutsThisWeek > 0
                  ? "dashboard-header-week-sessions__bar--active"
                  : ""
              }`}
            >
              <span className="dashboard-header-week-sessions__fill" />
              <span aria-hidden="true" className="dashboard-header-week-sessions__goal-lines">
                {Array.from(
                  { length: dashboardSummary.weeklySessionGoal },
                  (_, goalIndex) => (
                    <span
                      className={`dashboard-header-week-sessions__goal-section ${
                        goalIndex < dashboardSummary.workoutsThisWeek
                          ? "dashboard-header-week-sessions__goal-section--filled"
                          : ""
                      }`}
                      data-session-level={goalIndex + 1}
                      key={`portal-weekly-session-goal-section-${goalIndex + 1}`}
                      style={
                        {
                          "--dashboard-week-session-section-bottom": `${
                            (goalIndex / dashboardSummary.weeklySessionGoal) * 100
                          }%`,
                          "--dashboard-week-session-section-height": `${
                            100 / dashboardSummary.weeklySessionGoal
                          }%`,
                        } as CSSProperties
                      }
                    />
                  ),
                )}
              </span>
            </span>
            <span aria-hidden="true" className="dashboard-header-week-sessions__opening-sheen" />
          </span>
          <span className="dashboard-header-week-sessions__label">
            Sessions / Week
          </span>
          <span className="dashboard-header-meter-deadline dashboard-header-meter-deadline--week">
            Reset {dashboardWeeklySessionResetLabel}
          </span>
        </div>
      );
    }

    if (dashboardHeaderTimeoutPortalMeter.id === "plan") {
      return (
        <div
          aria-hidden="true"
          className={`${portalActualClass} dashboard-header-plan-attendance dashboard-header-streak-fire dashboard-header-meter-scroller__meter dashboard-header-meter-scroller__meter--center text-amber-50`}
          role="meter"
          style={
            {
              "--dashboard-header-plan-attendance-progress": `${dashboardSummary.planSessionProgress}%`,
            } as CSSProperties
          }
        >
          <span aria-hidden="true" className="dashboard-header-streak-fire__flame" />
          <span aria-hidden="true" className="dashboard-header-streak-fire__embers" />
          <span aria-hidden="true" className="dashboard-header-streak-fire__gauge">
            <svg
              aria-hidden="true"
              className="dashboard-header-streak-fire__gauge-svg"
              viewBox="0 0 96 96"
            >
              <circle
                cx="48"
                cy="48"
                fill="rgba(2,6,23,0.42)"
                r="41"
                stroke="rgba(224,242,254,0.08)"
                strokeWidth="1"
              />
              <circle
                cx="48"
                cy="48"
                fill="none"
                pathLength={100}
                r="35.5"
                stroke="rgba(15,23,42,0.78)"
                strokeWidth="10"
              />
              <circle
                className="dashboard-header-plan-attendance__progress-ring"
                cx="48"
                cy="48"
                fill="none"
                pathLength={100}
                r="35.5"
                stroke="url(#dashboardHeaderPortalPlanAttendanceGradient)"
                strokeDasharray="100"
                strokeDashoffset={100 - dashboardSummary.planSessionProgress}
                strokeLinecap="round"
                strokeWidth="10"
                transform="rotate(-90 48 48)"
              />
              {Array.from({
                length: dashboardSummary.planSessionTarget,
              }).map((_, tickIndex) => {
                const tickAngle =
                  tickIndex * (360 / dashboardSummary.planSessionTarget);
                const isFilledTick = tickIndex < dashboardPlanSessionsAttended;

                return (
                  <line
                    key={`dashboard-header-portal-plan-attendance-tick-${tickIndex}`}
                    stroke={
                      isFilledTick
                        ? "rgba(254,240,138,0.92)"
                        : "rgba(148,163,184,0.36)"
                    }
                    strokeLinecap="round"
                    strokeWidth={isFilledTick ? 2.1 : 1.25}
                    transform={`rotate(${tickAngle} 48 48)`}
                    x1="48"
                    x2="48"
                    y1="7"
                    y2={isFilledTick ? "18" : "15"}
                  />
                );
              })}
              <circle
                cx="48"
                cy="48"
                fill="rgba(2,6,23,0.86)"
                r="25.5"
                stroke="rgba(125,211,252,0.26)"
                strokeWidth="1.4"
              />
              <circle
                cx="48"
                cy="48"
                fill="none"
                r="30"
                stroke="rgba(255,255,255,0.12)"
                strokeDasharray="1.6 5.2"
                strokeLinecap="round"
                strokeWidth="1"
              />
              <circle
                className="dashboard-header-plan-attendance__spark"
                cx="48"
                cy="12.5"
                fill="rgb(250,204,21)"
                opacity={dashboardPlanSessionsAttended > 0 ? 1 : 0}
                r="3.2"
                stroke="rgba(254,249,195,0.9)"
                strokeWidth="1"
                transform={`rotate(${dashboardSummary.planSessionProgress * 3.6} 48 48)`}
              />
              <defs>
                <linearGradient
                  id="dashboardHeaderPortalPlanAttendanceGradient"
                  x1="14"
                  x2="82"
                  y1="82"
                  y2="14"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="rgb(34,211,238)" />
                  <stop offset="42%" stopColor="rgb(52,211,153)" />
                  <stop offset="72%" stopColor="rgb(250,204,21)" />
                  <stop offset="100%" stopColor="rgb(250,204,21)" />
                </linearGradient>
              </defs>
            </svg>
          </span>
          <span className="dashboard-header-streak-fire__content">
            <span className="dashboard-header-streak-fire__value">
              {`${dashboardPlanSessionsAttended}/${dashboardSummary.planSessionTarget}`}
            </span>
            <span className="dashboard-header-streak-fire__label">
              Plan Sessions
            </span>
          </span>
          <span className="dashboard-header-meter-deadline dashboard-header-meter-deadline--streak">
            {dashboardPlanAttendanceCaption}
          </span>
        </div>
      );
    }

    if (dashboardHeaderTimeoutPortalMeter.id === "sets") {
      return (
        <div
          aria-hidden="true"
          className={`${portalActualClass} dashboard-header-sets-meter dashboard-header-sets-meter--standalone text-emerald-50`}
          role="meter"
        >
          <span className="dashboard-header-sets-meter__tower">
            <span className="dashboard-header-sets-meter__tallies">
              {dashboardSummary.dailySetTallyMarks.map((mark, markIndex) => (
                <span
                  aria-hidden="true"
                  className={`dashboard-header-sets-meter__tally dashboard-header-sets-meter__tally--${mark.group} ${
                    mark.filled
                      ? "dashboard-header-sets-meter__tally--filled"
                      : "dashboard-header-sets-meter__tally--empty"
                  }`}
                  key={`dashboard-header-portal-daily-set-tally-${mark.id}-${markIndex}`}
                />
              ))}
            </span>
          </span>
          <span className="dashboard-header-sets-meter__value">
            {dashboardSummary.dailySets}
          </span>
          <span className="dashboard-header-sets-meter__label">Daily Sets</span>
          <span className="dashboard-header-meter-deadline dashboard-header-meter-deadline--sets">
            Goal {dashboardSummary.dailySetGoal}
          </span>
        </div>
      );
    }

    if (dashboardHeaderTimeoutPortalMeter.id === "pr") {
      return (
        <div
          aria-hidden="true"
          className={`${portalActualClass} dashboard-header-compound-pr-meter text-cyan-50`}
          role="group"
          style={
            {
              "--dashboard-header-pr-progress": `${dashboardSummary.prProgress}%`,
            } as CSSProperties
          }
        >
          <span className="dashboard-header-compound-pr-meter__header">
            <span aria-hidden="true" className="dashboard-header-compound-pr-meter__badge">
              PR
            </span>
            <span className="dashboard-header-compound-pr-meter__heading-copy">
              <span className="dashboard-header-compound-pr-meter__eyebrow">
                30 Day Best
              </span>
              <span className="dashboard-header-compound-pr-meter__heading">
                Compound Lifts
              </span>
            </span>
          </span>
          <span className="dashboard-header-compound-pr-meter__orbiter">
            <span className="dashboard-header-compound-pr-meter__list">
              {dashboardSummary.compoundLiftHighlights.map((highlight, index) => {
                const prCardSlot = getDashboardHeaderPrCardSlot(index);

                return (
                  <span
                    className={`dashboard-header-compound-pr-meter__item dashboard-header-compound-pr-meter__item--${highlight.tone} dashboard-header-compound-pr-meter__item--slot-${prCardSlot}`}
                    key={`dashboard-header-portal-compound-pr-${highlight.tone}`}
                  >
                    <span className="dashboard-header-compound-pr-meter__rank">
                      {highlight.rank}
                    </span>
                    <span className="dashboard-header-compound-pr-meter__copy">
                      <span className="dashboard-header-compound-pr-meter__title">
                        {highlight.label}
                      </span>
                      <span className="dashboard-header-compound-pr-meter__detail">
                        {highlight.detail}
                      </span>
                      <span className="dashboard-header-compound-pr-meter__stats">
                        <span className="dashboard-header-compound-pr-meter__stat">
                          <span className="dashboard-header-compound-pr-meter__stat-label">
                            Volume %
                          </span>
                          <span className="dashboard-header-compound-pr-meter__stat-value">
                            {highlight.volumeLabel}
                          </span>
                        </span>
                        <span className="dashboard-header-compound-pr-meter__stat">
                          <span className="dashboard-header-compound-pr-meter__stat-label">
                            Sets
                          </span>
                          <span className="dashboard-header-compound-pr-meter__stat-value">
                            {highlight.setsLabel}
                          </span>
                        </span>
                      </span>
                    </span>
                    <span className="dashboard-header-compound-pr-meter__value">
                      {highlight.value}
                    </span>
                  </span>
                );
              })}
            </span>
          </span>
        </div>
      );
    }

    if (dashboardHeaderTimeoutPortalMeter.id === "achievements") {
      return (
        <span
          aria-hidden="true"
          className={`${portalActualClass} dashboard-header-achievement-cloud-trigger dashboard-header-achievement-meter dashboard-header-achievement-meter--standalone dashboard-header-achievement-cloud-trigger--revealing text-amber-50`}
          style={
            {
              "--dashboard-header-achievement-active-duration": `${DASHBOARD_HEADER_ACHIEVEMENT_ROTATE_MS}ms`,
            } as CSSProperties
          }
        >
          <span aria-hidden="true" className="dashboard-header-achievement-cloud-trigger__light" />
          <span aria-hidden="true" className="dashboard-header-achievement-cloud-trigger__menu-flash" />
          <span aria-hidden="true" className="dashboard-header-achievement-cloud-trigger__clouds">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span
            aria-hidden="true"
            className="dashboard-header-achievement-meter__progress-shell"
            style={
              {
                "--dashboard-header-achievement-progress": `${headerAchievementProgress}%`,
              } as CSSProperties
            }
          >
            <span aria-hidden="true" className="dashboard-header-achievement-meter__track" />
            <span aria-hidden="true" className="dashboard-header-achievement-meter__progress-list">
              {activeHeaderAchievement ? (
                <span
                  aria-hidden="true"
                  className="dashboard-header-achievement-meter__progress-item"
                  key={`dashboard-header-portal-achievement-${activeHeaderAchievement.label}`}
                  style={
                    {
                      "--dashboard-header-achievement-item-progress": `${activeHeaderAchievementProgress}%`,
                    } as CSSProperties
                  }
                >
                  <span className="dashboard-header-achievement-meter__progress-icon">
                    {activeHeaderAchievement.icon}
                  </span>
                  <span className="dashboard-header-achievement-meter__progress-copy">
                    <span className="dashboard-header-achievement-meter__progress-title">
                      {activeHeaderAchievement.label}
                    </span>
                    <span className="dashboard-header-achievement-meter__progress-meta">
                      <span>
                        {Math.round(activeHeaderAchievementProgress)}%{" "}
                        {activeHeaderAchievement.statusLabel}
                      </span>
                      <span>{activeHeaderAchievementEstimate.label}</span>
                    </span>
                    <span className="dashboard-header-achievement-meter__progress-bar">
                      <span />
                    </span>
                  </span>
                </span>
              ) : null}
            </span>
          </span>
        </span>
      );
    }

    return (
      <div
        aria-hidden="true"
        className={`${portalActualClass} dashboard-header-fuel-meter dashboard-header-fuel-meter--${
          dashboardHeaderTimeoutPortalMeter.id === "weight"
            ? `weight dashboard-header-fuel-meter--${dashboardSummary.weightChangeTone}`
            : "calories"
        }`}
        role="meter"
        style={
          {
            "--dashboard-header-fuel-progress": `${
              dashboardHeaderTimeoutPortalMeter.id === "weight"
                ? dashboardSummary.weightChangeProgress
                : dashboardSummary.weeklyCaloriesProgress
            }%`,
          } as CSSProperties
        }
      >
        <span aria-hidden="true" className="dashboard-header-fuel-meter__ring">
          <span className="dashboard-header-fuel-meter__value">
            {dashboardHeaderTimeoutPortalMeter.id === "weight"
              ? dashboardSummary.weightChangeLabel
              : dashboardSummary.weeklyCaloriesDisplay}
          </span>
        </span>
        <span className="dashboard-header-fuel-meter__label">
          {dashboardHeaderTimeoutPortalMeter.id === "weight"
            ? "Weight +/-"
            : "Weekly Calories"}
        </span>
        <span className="dashboard-header-fuel-meter__meta">
          {dashboardHeaderTimeoutPortalMeter.id === "weight"
            ? dashboardSummary.weightChangeTrendLabel
            : "Total Week"}
        </span>
      </div>
    );
  };

  const renderDashboardOrbiterTopMenu = () => (
    <div
      className={`dashboard-header-vortex-shell dashboard-header-vortex-shell--${dashboardHeaderVortexPhase} ${
        dashboardHeaderTimedOut
          ? "dashboard-header-vortex-shell--timed-out"
          : ""
      } sticky top-0 z-[120] mb-0 w-full shrink-0 overflow-visible border-b border-cyan-100/18 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(251,191,36,0.10),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.86),rgba(2,6,23,0.78))] shadow-[0_20px_70px_rgba(0,0,0,0.34),0_0_34px_rgba(34,211,238,0.10),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl`}
      data-dashboard-header-timeout={dashboardHeaderTimedOut ? "true" : "false"}
      onFocusCapture={wakeDashboardHeaderMenu}
      onMouseEnter={wakeDashboardHeaderMenu}
      onPointerDown={wakeDashboardHeaderMenu}
      onPointerMove={wakeDashboardHeaderMenu}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-cyan-100/55 to-transparent"
      />
      <div aria-hidden="true" className="dashboard-header-ambient-field">
        <span className="dashboard-header-ambient-field__grid-wall" />
        <span className="dashboard-header-ambient-field__grid" />
        <span className="dashboard-header-ambient-field__aura dashboard-header-ambient-field__aura--cyan" />
        <span className="dashboard-header-ambient-field__aura dashboard-header-ambient-field__aura--gold" />
        <span className="dashboard-header-ambient-field__beam" />
        <span className="dashboard-header-ambient-field__rail" />
        <span className="dashboard-header-ambient-scene dashboard-header-ambient-scene--mountains" />
        <span className="dashboard-header-ambient-scene dashboard-header-ambient-scene--forest" />
        <span className="dashboard-header-ambient-scene dashboard-header-ambient-scene--city">
          <span className="dashboard-header-ambient-city__buildings" />
          <span className="dashboard-header-ambient-city__space-needle" />
          <span className="dashboard-header-ambient-city__dome" />
          <span className="dashboard-header-ambient-city__ferris-wheel" />
        </span>
        <span className="dashboard-header-ambient-field__meteor dashboard-header-ambient-field__meteor--one" />
        <span className="dashboard-header-ambient-field__meteor dashboard-header-ambient-field__meteor--two" />
        <span className="dashboard-header-ambient-field__meteor dashboard-header-ambient-field__meteor--three" />
        <span className="dashboard-header-ambient-field__meteor dashboard-header-ambient-field__meteor--four" />
        {dashboardHeaderCategoryLevels.map((categoryActor, categoryActorIndex) => (
          <span
            className={`dashboard-header-category-actor dashboard-header-category-actor--${categoryActor.id}`}
            data-category-level={`${categoryActor.label} level ${categoryActor.level}`}
            key={categoryActor.id}
            style={
              {
                "--dashboard-header-category-appear-delay": `${
                  dashboardHeaderCategoryFloorSlots[
                    categoryActorIndex % dashboardHeaderCategoryFloorSlots.length
                  ].delay
                }s`,
                "--dashboard-header-category-color": categoryActor.color,
                "--dashboard-header-category-floor-left": `${
                  dashboardHeaderCategoryFloorSlots[
                    categoryActorIndex % dashboardHeaderCategoryFloorSlots.length
                  ].left
                }%`,
                "--dashboard-header-category-floor-top": `${
                  dashboardHeaderCategoryFloorSlots[
                    categoryActorIndex % dashboardHeaderCategoryFloorSlots.length
                  ].top
                }%`,
                "--dashboard-header-category-level": `${categoryActor.level}%`,
                "--dashboard-header-category-left": `${categoryActor.left}%`,
                "--dashboard-header-category-top": `${categoryActor.top}%`,
              } as CSSProperties
            }
          >
            <svg
              aria-hidden="true"
              className="dashboard-header-category-actor__figure"
              focusable="false"
              viewBox="0 0 64 64"
            >
              <line
                className="dashboard-header-category-actor__prop"
                x1="14"
                x2="50"
                y1="17"
                y2="17"
              />
              <g className="dashboard-header-category-actor__body">
                <circle
                  className="dashboard-header-category-actor__head"
                  cx="32"
                  cy="12"
                  r="4.4"
                />
                <line
                  className="dashboard-header-category-actor__torso"
                  x1="32"
                  x2="32"
                  y1="17"
                  y2="32"
                />
                <line
                  className="dashboard-header-category-actor__arm dashboard-header-category-actor__arm--front"
                  x1="32"
                  x2="20"
                  y1="22"
                  y2="31"
                />
                <line
                  className="dashboard-header-category-actor__arm dashboard-header-category-actor__arm--back"
                  x1="32"
                  x2="44"
                  y1="22"
                  y2="31"
                />
                <line
                  className="dashboard-header-category-actor__leg dashboard-header-category-actor__leg--front"
                  x1="32"
                  x2="22"
                  y1="32"
                  y2="50"
                />
                <line
                  className="dashboard-header-category-actor__leg dashboard-header-category-actor__leg--back"
                  x1="32"
                  x2="42"
                  y1="32"
                  y2="50"
                />
              </g>
              <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--squat-up">
                <line x1="14" x2="50" y1="16" y2="16" />
                <circle cx="32" cy="10.5" r="4.3" />
                <line x1="32" x2="32" y1="15" y2="31" />
                <line x1="32" x2="18" y1="20" y2="16" />
                <line x1="32" x2="46" y1="20" y2="16" />
                <polyline points="32 31 25 40 23 52" />
                <polyline points="32 31 39 40 41 52" />
                <line x1="20" x2="28" y1="52" y2="52" />
                <line x1="36" x2="44" y1="52" y2="52" />
              </g>
              <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--squat-down">
                <line x1="12" x2="52" y1="21" y2="21" />
                <circle cx="32" cy="15.5" r="4.3" />
                <line x1="32" x2="32" y1="20" y2="36" />
                <line x1="32" x2="17" y1="24" y2="21" />
                <line x1="32" x2="47" y1="24" y2="21" />
                <polyline points="32 36 22 43 17 52" />
                <polyline points="32 36 42 43 47 52" />
                <line x1="14" x2="24" y1="52" y2="52" />
                <line x1="40" x2="50" y1="52" y2="52" />
              </g>
              <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--jack-closed">
                <circle cx="32" cy="10.5" r="4.3" />
                <line x1="32" x2="32" y1="15" y2="32" />
                <line x1="32" x2="24" y1="21" y2="39" />
                <line x1="32" x2="40" y1="21" y2="39" />
                <line x1="32" x2="28" y1="32" y2="52" />
                <line x1="32" x2="36" y1="32" y2="52" />
              </g>
              <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--jack-open">
                <circle cx="32" cy="8.5" r="4.3" />
                <line x1="32" x2="32" y1="13" y2="31" />
                <line x1="32" x2="17" y1="20" y2="7" />
                <line x1="32" x2="47" y1="20" y2="7" />
                <line x1="32" x2="19" y1="31" y2="52" />
                <line x1="32" x2="45" y1="31" y2="52" />
              </g>
              <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--leg-extension-bent">
                <line x1="16" x2="49" y1="36" y2="36" />
                <circle cx="30" cy="13" r="4.3" />
                <line x1="30" x2="25" y1="17.5" y2="32" />
                <line x1="27" x2="18" y1="24" y2="36" />
                <line x1="27" x2="42" y1="33" y2="38" />
                <polyline points="42 38 44 47 50 52" />
                <line x1="18" x2="22" y1="36" y2="52" />
                <line x1="45" x2="49" y1="36" y2="52" />
              </g>
              <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--leg-extension-straight">
                <line x1="16" x2="49" y1="36" y2="36" />
                <circle cx="30" cy="13" r="4.3" />
                <line x1="30" x2="25" y1="17.5" y2="32" />
                <line x1="27" x2="18" y1="24" y2="36" />
                <line x1="27" x2="42" y1="33" y2="38" />
                <line x1="42" x2="56" y1="38" y2="37" />
                <line x1="18" x2="22" y1="36" y2="52" />
                <line x1="45" x2="49" y1="36" y2="52" />
              </g>
              <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--situp-down">
                <circle cx="18" cy="38" r="4.3" />
                <line x1="22" x2="42" y1="39" y2="42" />
                <polyline points="17 35 12 31 15 28" />
                <polyline points="19 36 15 31 18 28" />
                <polyline points="42 42 48 34 55 34" />
                <polyline points="42 42 51 48 57 48" />
              </g>
              <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--situp-up">
                <circle cx="28" cy="22" r="4.3" />
                <line x1="30" x2="42" y1="26" y2="41" />
                <polyline points="27 20 21 16 23 12" />
                <polyline points="29 20 25 15 28 12" />
                <polyline points="42 41 48 34 55 34" />
                <polyline points="42 41 51 48 57 48" />
              </g>
              <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--press-rack">
                <line x1="17" x2="47" y1="22" y2="22" />
                <circle cx="32" cy="12" r="4.3" />
                <line x1="32" x2="32" y1="16.5" y2="33" />
                <polyline points="32 23 23 28 17 22" />
                <polyline points="32 23 41 28 47 22" />
                <line x1="32" x2="25" y1="33" y2="52" />
                <line x1="32" x2="39" y1="33" y2="52" />
              </g>
              <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--press-overhead">
                <line x1="16" x2="48" y1="7" y2="7" />
                <circle cx="32" cy="17" r="4.3" />
                <line x1="32" x2="32" y1="21.5" y2="36" />
                <line x1="32" x2="22" y1="24" y2="7" />
                <line x1="32" x2="42" y1="24" y2="7" />
                <line x1="32" x2="25" y1="36" y2="52" />
                <line x1="32" x2="39" y1="36" y2="52" />
              </g>
              <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--pull-reach">
                <line x1="12" x2="52" y1="15" y2="15" />
                <circle cx="32" cy="24" r="4.3" />
                <line x1="32" x2="32" y1="28.5" y2="42" />
                <line x1="32" x2="22" y1="31" y2="16" />
                <line x1="32" x2="42" y1="31" y2="16" />
                <line x1="32" x2="25" y1="42" y2="54" />
                <line x1="32" x2="39" y1="42" y2="54" />
              </g>
              <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--pull-row">
                <line x1="12" x2="52" y1="15" y2="15" />
                <circle cx="32" cy="19" r="4.3" />
                <line x1="32" x2="32" y1="23.5" y2="39" />
                <line x1="32" x2="22" y1="27" y2="22" />
                <line x1="32" x2="42" y1="27" y2="22" />
                <line x1="32" x2="24" y1="39" y2="53" />
                <line x1="32" x2="40" y1="39" y2="53" />
              </g>
              <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--curl-low">
                <circle cx="32" cy="10.5" r="4.3" />
                <line x1="32" x2="32" y1="15" y2="32" />
                <line x1="32" x2="20" y1="21" y2="38" />
                <line x1="32" x2="44" y1="21" y2="38" />
                <line x1="32" x2="25" y1="32" y2="52" />
                <line x1="32" x2="39" y1="32" y2="52" />
                <line x1="18" x2="24" y1="39" y2="39" />
                <line x1="40" x2="46" y1="39" y2="39" />
              </g>
              <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--curl-high">
                <circle cx="32" cy="10.5" r="4.3" />
                <line x1="32" x2="32" y1="15" y2="32" />
                <polyline points="32 21 22 29 22 20" />
                <polyline points="32 21 42 29 42 20" />
                <line x1="32" x2="25" y1="32" y2="52" />
                <line x1="32" x2="39" y1="32" y2="52" />
                <line x1="19" x2="25" y1="20" y2="20" />
                <line x1="39" x2="45" y1="20" y2="20" />
              </g>
              <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--clean-pull">
                <line x1="17" x2="47" y1="42" y2="42" />
                <circle cx="29" cy="14" r="4.3" />
                <line x1="30" x2="35" y1="18.5" y2="34" />
                <line x1="33" x2="24" y1="25" y2="42" />
                <line x1="35" x2="44" y1="25" y2="42" />
                <polyline points="35 34 25 43 23 54" />
                <polyline points="35 34 43 43 45 54" />
              </g>
              <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--clean-rack">
                <line x1="17" x2="47" y1="23" y2="23" />
                <circle cx="32" cy="12" r="4.3" />
                <line x1="32" x2="32" y1="16.5" y2="34" />
                <polyline points="20 23 30 26 24 31" />
                <polyline points="44 23 34 26 40 31" />
                <line x1="32" x2="25" y1="34" y2="52" />
                <line x1="32" x2="39" y1="34" y2="52" />
              </g>
              <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--mobility-left">
                <circle cx="32" cy="11" r="4.3" />
                <line x1="32" x2="29" y1="15.5" y2="33" />
                <line x1="31" x2="18" y1="21" y2="12" />
                <line x1="31" x2="44" y1="21" y2="30" />
                <line x1="29" x2="20" y1="33" y2="52" />
                <line x1="29" x2="41" y1="33" y2="52" />
              </g>
              <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--mobility-right">
                <circle cx="32" cy="11" r="4.3" />
                <line x1="32" x2="35" y1="15.5" y2="33" />
                <line x1="33" x2="46" y1="21" y2="12" />
                <line x1="33" x2="20" y1="21" y2="30" />
                <line x1="35" x2="23" y1="33" y2="52" />
                <line x1="35" x2="44" y1="33" y2="52" />
              </g>
              <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--neck-center">
                <circle cx="32" cy="11" r="4.3" />
                <line x1="32" x2="32" y1="15.5" y2="34" />
                <line x1="32" x2="23" y1="22" y2="32" />
                <line x1="32" x2="41" y1="22" y2="32" />
                <line x1="32" x2="26" y1="34" y2="52" />
                <line x1="32" x2="38" y1="34" y2="52" />
                <path d="M25 8 C28 4 36 4 39 8" />
              </g>
              <g className="dashboard-header-category-actor__pose dashboard-header-category-actor__pose--neck-tilt">
                <circle cx="36" cy="12" r="4.3" />
                <line x1="33" x2="32" y1="16" y2="34" />
                <line x1="32" x2="23" y1="22" y2="32" />
                <line x1="32" x2="41" y1="22" y2="32" />
                <line x1="32" x2="26" y1="34" y2="52" />
                <line x1="32" x2="38" y1="34" y2="52" />
                <path d="M29 8 C32 5 39 6 42 11" />
              </g>
            </svg>
            <span className="dashboard-header-category-actor__label">
              {categoryActor.shortLabel}
            </span>
            <span className="dashboard-header-category-actor__meter">
              <span />
            </span>
            <span className="dashboard-header-category-actor__level">
              LV {Math.max(1, Math.round(categoryActor.level / 10))}
            </span>
          </span>
        ))}
        <span className="dashboard-header-ambient-field__node dashboard-header-ambient-field__node--one" />
        <span className="dashboard-header-ambient-field__node dashboard-header-ambient-field__node--two" />
        <span className="dashboard-header-ambient-field__node dashboard-header-ambient-field__node--three" />
        <span className="dashboard-header-ambient-field__node dashboard-header-ambient-field__node--four" />
      </div>
      <div aria-hidden="true" className="dashboard-header-category-overlay">
        {dashboardHeaderCategoryLevels.map((categoryActor, categoryActorIndex) => {
          const categoryActorFloorSlot =
            dashboardHeaderCategoryFloorSlots[
              categoryActorIndex % dashboardHeaderCategoryFloorSlots.length
            ];

          return (
            <span
              className={`dashboard-header-category-actor dashboard-header-category-actor--${categoryActor.id}`}
              data-category-level={`${categoryActor.label} level ${categoryActor.level}`}
              key={`dashboard-header-category-overlay-${categoryActor.id}`}
              style={
                {
                  "--dashboard-header-category-appear-delay": `${categoryActorFloorSlot.delay}s`,
                  "--dashboard-header-category-color": categoryActor.color,
                  "--dashboard-header-category-floor-left": `${categoryActorFloorSlot.left}%`,
                  "--dashboard-header-category-floor-top": `${categoryActorFloorSlot.top}%`,
                  "--dashboard-header-category-level": `${categoryActor.level}%`,
                  "--dashboard-header-category-left": `${categoryActor.left}%`,
                  "--dashboard-header-category-top": `${categoryActor.top}%`,
                } as CSSProperties
              }
            >
              {renderDashboardHeaderCategoryActorFigure()}
              <span className="dashboard-header-category-actor__label">
                {categoryActor.shortLabel}
              </span>
              <span className="dashboard-header-category-actor__meter">
                <span />
              </span>
              <span className="dashboard-header-category-actor__level">
                LV {Math.max(1, Math.round(categoryActor.level / 10))}
              </span>
            </span>
          );
        })}
      </div>
      <div aria-hidden="true" className="dashboard-header-idle-training-floor">
        <span className="dashboard-header-idle-training-floor__ground" />
        <span className="dashboard-header-idle-station-track">
          {dashboardHeaderIdleEquipmentStations.map((station) => {
            const stationCategory = dashboardHeaderCategoryLevels.find(
              (categoryActor) => categoryActor.id === station.categoryId,
            );

            return (
              <span
                className={`dashboard-header-idle-station dashboard-header-idle-station--${station.equipmentId} dashboard-header-idle-station--category-${station.categoryId}`}
                key={`dashboard-header-idle-station-${station.id}`}
                style={
                  {
                    "--dashboard-header-category-color":
                      stationCategory?.color ?? station.color,
                    "--dashboard-header-category-level": `${
                      stationCategory?.level ?? station.progress
                    }%`,
                    "--dashboard-header-idle-station-color": station.color,
                    "--dashboard-header-idle-station-delay": `${station.delay}s`,
                    "--dashboard-header-idle-station-left": `${station.left}%`,
                    "--dashboard-header-idle-station-level": `${station.progress}%`,
                  } as CSSProperties
                }
              >
                <span className="dashboard-header-idle-station__equipment">
                  {renderDashboardHeaderIdleEquipmentIcon(station.equipmentId)}
                </span>
                <span
                  className={`dashboard-header-idle-station__category dashboard-header-category-actor dashboard-header-category-actor--${station.categoryId}`}
                  data-category-level={`${
                    stationCategory?.label ?? station.label
                  } level ${station.progress}`}
                >
                  {renderDashboardHeaderCategoryActorFigure()}
                  <span className="dashboard-header-category-actor__label">
                    {stationCategory?.shortLabel ?? station.label}
                  </span>
                  <span className="dashboard-header-category-actor__meter">
                    <span />
                  </span>
                  <span className="dashboard-header-category-actor__level">
                    LV {station.level}
                  </span>
                </span>
                <span className="dashboard-header-idle-station__label">
                  {station.label}
                </span>
              </span>
            );
          })}
        </span>
        <span className="dashboard-header-idle-trainer">
          <span className="dashboard-header-idle-trainer__head" />
          <span className="dashboard-header-idle-trainer__torso" />
          <span className="dashboard-header-idle-trainer__arm dashboard-header-idle-trainer__arm--front" />
          <span className="dashboard-header-idle-trainer__arm dashboard-header-idle-trainer__arm--back" />
          <span className="dashboard-header-idle-trainer__leg dashboard-header-idle-trainer__leg--front" />
          <span className="dashboard-header-idle-trainer__leg dashboard-header-idle-trainer__leg--back" />
        </span>
      </div>
      {dashboardHeaderTimedOut && dashboardHeaderTimeoutPortalMeter ? (
        <div
          aria-hidden="true"
          className={`dashboard-header-timeout-meter-portal ${
            dashboardHeaderTimeoutPortalOpen
              ? "dashboard-header-timeout-meter-portal--open"
              : ""
          }`}
          data-meter-tone={dashboardHeaderTimeoutPortalMeter.tone}
          style={
            {
              "--dashboard-header-timeout-meter-left": `${dashboardHeaderTimeoutPortalPosition.x}%`,
              "--dashboard-header-timeout-meter-progress": `${dashboardHeaderTimeoutPortalMeter.progress}%`,
              "--dashboard-header-timeout-meter-top": `${dashboardHeaderTimeoutPortalPosition.y}%`,
            } as CSSProperties
          }
        >
          <div className="dashboard-header-timeout-meter-portal__vortex">
            <div className="dashboard-header-timeout-meter-portal__core" />
          </div>
          <div
            className="dashboard-header-timeout-meter-portal__card"
            key={dashboardHeaderTimeoutPortalMeter.id}
          >
            {renderDashboardHeaderTimeoutPortalMeter()}
          </div>
        </div>
      ) : null}
      <div className="relative mx-auto flex min-h-[88px] w-full max-w-[1840px] items-center gap-2 px-3 pb-7 pt-2.5 sm:gap-3 sm:px-4 sm:pb-8 sm:pt-3 md:px-6 xl:px-8 2xl:px-10">
        <Link
          aria-label="Open Sound Fitness dashboard"
          className="dashboard-header-home-logo relative isolate grid min-h-[58px] w-12 shrink-0 place-items-center overflow-visible rounded-[22px] border border-transparent bg-transparent px-1 py-2 transition hover:border-cyan-100/24 hover:bg-cyan-300/8"
          data-dashboard-tooltip="Sound Fitness"
          href={ROUTES.dashboard.home}
          style={activeDashboardHeaderTone.iconEffectStyle}
        >
          <span
            aria-hidden="true"
            className="dashboard-header-home-logo__field"
          />
          <Image
            alt="Sound Fitness"
            className="relative z-10 h-10 w-10 shrink-0 rounded-full object-contain"
            height={40}
            src="/sound-fitness-logo.png"
            width={40}
          />
        </Link>

        <div
          aria-label="Main header menu"
          className="dashboard-header-main-orbit-stage dashboard-header-main-orbit-stage--stable min-w-0 flex-1"
        >
        <div
          aria-label="Header block 1, dashboard menu"
          className={`dashboard-header-menu-block dashboard-header-menu-block--dashboard dashboard-header-menu-block--slot-${getDashboardHeaderMenuBlockSlot(
            0,
          )}`}
        >
          <div
            aria-label="Dashboard selector"
            className="ml-1 flex w-fit max-w-[calc(100vw-7.5rem)] shrink-0 select-none items-center gap-2 bg-transparent p-0 shadow-none md:max-w-[min(64vw,620px)] lg:max-w-none"
          >
          <div
            aria-label={`${activeDashboardHeaderLink.label} dashboard tab`}
            className={`dashboard-header-orbit-system dashboard-header-orbit-system--${dashboardHeaderVortexPhase} flex min-h-[62px] w-auto min-w-max shrink-0 items-center gap-3 rounded-[22px] border border-transparent bg-transparent px-1.5 py-2 text-left text-cyan-50 shadow-none transition ${
              dashboardHeaderSlideDirection === "right"
                ? "animate-[sessions-dashboard-chip-slide-from-right_220ms_ease-out]"
                : "animate-[sessions-dashboard-chip-slide-from-left_220ms_ease-out]"
            } ${
              dashboardHeaderVortexMode
                ? `dashboard-header-orbit-system--${dashboardHeaderVortexMode}`
                : ""
            }`}
            key={`${activeDashboardHeaderLink.label}-${dashboardHeaderSlideDirection}`}
            role="group"
          >
            {renderDashboardHeaderScrollControls()}
            <div className="flex min-w-[204px] shrink-0 items-center justify-center gap-1.5">
              <div
                className="dashboard-header-rail-pocket relative flex h-[4.35rem] min-w-[6.05rem] shrink-0 translate-x-3 items-center justify-center text-cyan-100"
                style={activeDashboardHeaderTone.iconEffectStyle}
              >
                <span
                  aria-hidden="true"
                  className="dashboard-header-rail-core-field pointer-events-none absolute left-[-0.86rem] top-[-1.02rem] h-[5.05rem] w-[6rem] rounded-[999px]"
                />
                {renderDashboardHeaderPageOrbitRail()}
                <div className="absolute left-[2.72rem] top-[0.08rem] z-20 flex items-center justify-center">
                  {renderDashboardHeaderJourneyTabs("points")}
                </div>
                <Link
                  aria-label={`Open ${activeDashboardHeaderLink.label}, ${activeDashboardHeaderLink.points.toLocaleString()} points`}
                  className="dashboard-header-rail-points-core absolute left-[2.02rem] top-[1.3rem] z-[4] inline-flex max-w-[3.9rem] -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 overflow-hidden whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[11px] font-black leading-none tracking-tight text-cyan-50 transition hover:brightness-125 active:scale-95"
                  draggable={false}
                  href={activeDashboardHeaderLink.href}
                  onClick={() =>
                    markDashboardDestinationVisited(activeDashboardHeaderLink.href)
                  }
                  onDragStart={(event) => event.preventDefault()}
                >
                  <span
                    aria-hidden="true"
                    className="dashboard-header-rail-points-core__vortex"
                  >
                    {Array.from({ length: 12 }).map((_, particleIndex) => (
                      <span
                        key={`points-vortex-particle-${particleIndex}`}
                        style={
                          {
                            "--dashboard-vortex-particle-angle": `${particleIndex * 30}deg`,
                            "--dashboard-vortex-particle-delay": `${particleIndex * -0.14}s`,
                            "--dashboard-vortex-particle-distance": `${0.34 + (particleIndex % 4) * 0.08}rem`,
                          } as CSSProperties
                        }
                      />
                    ))}
                  </span>
                  <DashboardTabIcon
                    className={`relative z-10 h-3.5 w-3.5 shrink-0 ${activeDashboardHeaderTone.pointsIcon}`}
                    name="performance"
                  />
                  <span className="relative z-10 truncate">
                    {activeDashboardHeaderLink.points.toLocaleString()}
                  </span>
                  <span
                    aria-hidden="true"
                    className="dashboard-header-rail-points-core__spark"
                  />
                </Link>
              </div>
              <Link
                aria-label={`Open ${activeDashboardHeaderLink.label}`}
                className="-ml-1 block whitespace-nowrap rounded-xl px-1 py-1 transition hover:-translate-y-0.5 hover:bg-white/[0.04]"
                draggable={false}
                href={activeDashboardHeaderLink.href}
                onClick={() =>
                  markDashboardDestinationVisited(activeDashboardHeaderLink.href)
                }
                onDragStart={(event) => event.preventDefault()}
              >
                <span className="block">
                  <span
                    className={`block text-[8px] font-black uppercase tracking-[0.1em] ${activeDashboardHeaderTone.metaText}`}
                  >
                    {activeDashboardHeaderLink.meta}
                  </span>
                  <span
                    className={`mt-0.5 block text-[10px] font-black uppercase tracking-[0.07em] sm:text-[11px] ${activeDashboardHeaderTone.labelText}`}
                  >
                    {activeDashboardHeaderLink.label}
                  </span>
                  <span
                    className={`mt-0.5 block max-w-[118px] truncate text-[7px] font-black uppercase tracking-[0.06em] ${activeDashboardHeaderTone.journeyText}`}
                  >
                    {getDashboardHeaderActiveJourneyStepLabel()}
                  </span>
                  <span
                    className={`mt-1 inline-flex max-w-[118px] items-center gap-1 rounded-full border px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[0.08em] ${activeDashboardHeaderUrgencyTone.ring} ${activeDashboardHeaderUrgencyTone.text}`}
                    data-dashboard-tooltip={activeDashboardHeaderUrgencyTone.label}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${activeDashboardHeaderUrgencyTone.dot}`}
                    />
                    <span className="truncate">
                      {activeDashboardHeaderUrgencyTone.label}
                    </span>
                  </span>
                </span>
              </Link>
            </div>
          </div>
          </div>
        </div>

        <div
          aria-label="Header block 2, achievements and PR table"
          className={`dashboard-header-menu-block dashboard-header-menu-block--rewards dashboard-header-menu-block--slot-${getDashboardHeaderMenuBlockSlot(
            1,
          )}`}
        >
        <div
          aria-label={`Compound lift PR meter. ${dashboardSummary.compoundLiftHighlights
            .map(
              (highlight) =>
                `${highlight.rank}. ${highlight.detail}: ${highlight.label}, ${highlight.windowLabel}, ${highlight.volumeLabel} relative volume, ${highlight.setsLabel} total sets completed`,
            )
            .join(". ")}`}
          className="dashboard-header-compound-pr-meter hidden h-[5.55rem] min-w-[10.2rem] shrink-0 flex-col items-stretch justify-start gap-1 bg-transparent px-0 text-cyan-50 xl:flex"
          data-dashboard-tooltip="Compound PR meter: 30 day best weight and date"
          role="group"
          style={
            {
              "--dashboard-header-pr-progress": `${dashboardSummary.prProgress}%`,
            } as CSSProperties
          }
        >
          <span className="dashboard-header-compound-pr-meter__header">
            <span
              aria-hidden="true"
              className="dashboard-header-compound-pr-meter__badge"
            >
              PR
            </span>
            <span className="dashboard-header-compound-pr-meter__heading-copy">
              <span className="dashboard-header-compound-pr-meter__eyebrow">
                30 Day Best
              </span>
              <span className="dashboard-header-compound-pr-meter__heading">
                Compound Lifts
              </span>
            </span>
          </span>
          <div
            aria-label="Drag or scroll through 30 day compound PR cards"
            className="dashboard-header-compound-pr-meter__orbiter"
            onClickCapture={(event) => {
              if (dashboardHeaderPrPointerMovedRef.current) {
                event.preventDefault();
                event.stopPropagation();
                dashboardHeaderPrPointerMovedRef.current = false;
              }
            }}
            onKeyDown={(event) =>
              handleDashboardOrbitKeyDown(event, rotateDashboardHeaderPrCards)
            }
            onPointerCancel={(event) => {
              dashboardHeaderPrPointerStartRef.current = null;
              if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
                event.currentTarget.releasePointerCapture?.(event.pointerId);
              }
            }}
            onPointerDown={(event) =>
              handleDashboardOrbitPointerDown(
                event,
                dashboardHeaderPrPointerStartRef,
                dashboardHeaderPrPointerMovedRef,
              )
            }
            onPointerMove={(event) =>
              handleDashboardOrbitPointerMove(
                event,
                dashboardHeaderPrPointerStartRef,
                dashboardHeaderPrPointerMovedRef,
                rotateDashboardHeaderPrCards,
                34,
              )
            }
            onPointerUp={(event) =>
              handleDashboardOrbitPointerUp(
                event,
                dashboardHeaderPrPointerStartRef,
                dashboardHeaderPrPointerMovedRef,
                rotateDashboardHeaderPrCards,
                setDashboardHeaderPrActiveIndex,
              )
            }
            onWheel={handleDashboardHeaderPrWheel}
            role="group"
            tabIndex={0}
          >
            <span className="dashboard-header-compound-pr-meter__list">
              {dashboardSummary.compoundLiftHighlights.map((highlight, index) => {
                const prCardSlot = getDashboardHeaderPrCardSlot(index);
                const isActivePrCard = prCardSlot === "center";

                return (
              <button
                aria-label={`${highlight.detail}: ${highlight.label}, ${highlight.windowLabel}, ${highlight.volumeLabel} relative volume, ${highlight.setsLabel} total sets completed`}
                aria-pressed={isActivePrCard}
                className={`dashboard-header-compound-pr-meter__item dashboard-header-compound-pr-meter__item--${highlight.tone} dashboard-header-compound-pr-meter__item--slot-${prCardSlot}`}
                data-dashboard-orbit-card-index={index}
                key={`dashboard-header-compound-pr-${highlight.tone}`}
                onClick={() => setDashboardHeaderPrActiveIndex(index)}
                tabIndex={isActivePrCard ? 0 : -1}
                type="button"
              >
                <span className="dashboard-header-compound-pr-meter__rank">
                  {highlight.rank}
                </span>
                <span className="dashboard-header-compound-pr-meter__copy">
                  <span className="dashboard-header-compound-pr-meter__title">
                    {highlight.label}
                  </span>
                  <span className="dashboard-header-compound-pr-meter__detail">
                    {highlight.detail}
                  </span>
                  <span className="dashboard-header-compound-pr-meter__stats">
                    <span className="dashboard-header-compound-pr-meter__stat">
                      <span className="dashboard-header-compound-pr-meter__stat-label">
                        Volume %
                      </span>
                      <span className="dashboard-header-compound-pr-meter__stat-value">
                        {highlight.volumeLabel}
                      </span>
                    </span>
                    <span className="dashboard-header-compound-pr-meter__stat">
                      <span className="dashboard-header-compound-pr-meter__stat-label">
                        Sets
                      </span>
                      <span className="dashboard-header-compound-pr-meter__stat-value">
                        {highlight.setsLabel}
                      </span>
                    </span>
                  </span>
                </span>
                <span
                  aria-label={`${highlight.detail} trend ${highlight.value}`}
                  className="dashboard-header-compound-pr-meter__value"
                >
                  {highlight.value}
                </span>
              </button>
                );
              })}
            </span>
          </div>
        </div>

        <Link
          aria-label={`Open achievements, ${headerAchievementsEarned} of ${headerAchievementTotal} earned, ${Math.round(
            headerAchievementProgress,
          )}% progress`}
          className={`dashboard-header-achievement-cloud-trigger dashboard-header-achievement-meter dashboard-header-achievement-meter--standalone ${
            dashboardHeaderAchievementRevealActive
              ? "dashboard-header-achievement-cloud-trigger--revealing"
              : ""
          } hidden h-[4.65rem] min-w-[12rem] shrink-0 flex-col items-center justify-center bg-transparent px-0 text-center text-amber-50 md:flex`}
          data-dashboard-tooltip={`Achievements: ${headerAchievementsEarned}/${headerAchievementTotal} earned${
            headerAchievementNext ? `, next ${headerAchievementNext.label}` : ""
          }. ${activeHeaderAchievementEstimate.fullLabel}`}
          href={ROUTES.dashboard.achievements}
          onClick={openDashboardAchievementsFromHeader}
        >
          <span
            aria-hidden="true"
            className="dashboard-header-achievement-cloud-trigger__light"
          />
          <span
            aria-hidden="true"
            className="dashboard-header-achievement-cloud-trigger__menu-flash"
          />
          <span
            aria-hidden="true"
            className="dashboard-header-achievement-cloud-trigger__clouds"
          >
            <span />
            <span />
            <span />
            <span />
          </span>
          <span
            aria-label={`${Math.round(headerAchievementProgress)} percent achievement progress`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.round(headerAchievementProgress)}
            className="dashboard-header-achievement-meter__progress-shell"
            role="meter"
            style={
              {
                "--dashboard-header-achievement-progress": `${headerAchievementProgress}%`,
                "--dashboard-header-achievement-active-duration": `${DASHBOARD_HEADER_ACHIEVEMENT_ROTATE_MS}ms`,
              } as CSSProperties
            }
          >
            <span
              aria-hidden="true"
              className="dashboard-header-achievement-meter__track"
            />
            <span
              aria-hidden="true"
              className="dashboard-header-achievement-meter__progress-list"
            >
              {activeHeaderAchievement ? (
                <span
                  aria-hidden="true"
                  className="dashboard-header-achievement-meter__progress-item"
                  key={`dashboard-header-achievement-active-${activeHeaderAchievement.label}`}
                  style={
                    {
                      "--dashboard-header-achievement-item-progress": `${activeHeaderAchievementProgress}%`,
                    } as CSSProperties
                  }
                >
                  <span className="dashboard-header-achievement-meter__progress-icon">
                    {activeHeaderAchievement.icon}
                  </span>
                  <span className="dashboard-header-achievement-meter__progress-copy">
                    <span className="dashboard-header-achievement-meter__progress-title">
                      {activeHeaderAchievement.label}
                    </span>
                    <span className="dashboard-header-achievement-meter__progress-meta">
                      <span>
                        {Math.round(activeHeaderAchievementProgress)}%{" "}
                        {activeHeaderAchievement.statusLabel}
                      </span>
                      <span>{activeHeaderAchievementEstimate.label}</span>
                    </span>
                    <span className="dashboard-header-achievement-meter__progress-bar">
                      <span />
                    </span>
                  </span>
                </span>
              ) : null}
            </span>
          </span>
        </Link>
        </div>

        <div className="dashboard-header-menu-spacer min-w-0 flex-1" />

        <div
          aria-label="Header block 3, sets and orbital meters"
          className={`dashboard-header-menu-block dashboard-header-menu-block--progress dashboard-header-menu-block--slot-${getDashboardHeaderMenuBlockSlot(
            2,
          )}`}
        >
        <div
          aria-label={`${dashboardSummary.dailySets} daily sets out of ${dashboardSummary.dailySetGoal} target sets. ${dashboardSummary.dailySetGroupSummary}`}
          aria-valuemax={dashboardSummary.dailySetGoal}
          aria-valuemin={0}
          aria-valuenow={Math.min(
            dashboardSummary.dailySets,
            dashboardSummary.dailySetGoal,
          )}
          className="dashboard-header-sets-meter dashboard-header-sets-meter--standalone relative hidden h-[4.65rem] min-w-[5.25rem] shrink-0 place-items-center overflow-visible bg-transparent px-0 text-center text-emerald-50 lg:grid"
          data-dashboard-tooltip={`${dashboardSummary.dailySets} daily sets. ${dashboardSummary.dailySetGroupSummary}`}
          role="meter"
        >
          <span className="dashboard-header-sets-meter__tower">
            <span className="dashboard-header-sets-meter__tallies">
              {dashboardSummary.dailySetTallyMarks.map((mark, markIndex) => (
                <span
                  aria-hidden="true"
                  className={`dashboard-header-sets-meter__tally dashboard-header-sets-meter__tally--${mark.group} ${
                    mark.filled
                      ? "dashboard-header-sets-meter__tally--filled"
                      : "dashboard-header-sets-meter__tally--empty"
                  }`}
                  key={`dashboard-header-daily-set-tally-${mark.id}-${markIndex}`}
                />
              ))}
            </span>
          </span>
          <span className="dashboard-header-sets-meter__value">
            {dashboardSummary.dailySets}
          </span>
          <span className="dashboard-header-sets-meter__label">Daily Sets</span>
          <span className="dashboard-header-meter-deadline dashboard-header-meter-deadline--sets">
            Goal {dashboardSummary.dailySetGoal}
          </span>
        </div>

        <div
          aria-label="Header progress meters"
          className={`dashboard-header-meter-scroller ${
            dashboardHeaderMeterRailActive
              && dashboardHeaderMenuActiveIndex ===
                DASHBOARD_HEADER_PROGRESS_BLOCK_INDEX
              ? "dashboard-header-meter-scroller--rail-active"
              : ""
          } hidden h-[5.45rem] shrink-0 md:block`}
        >
          <div className="dashboard-header-meter-scroller__track">
            <div
              aria-label={`${dashboardSummary.workoutsThisWeek} of ${dashboardSummary.weeklySessionGoal} weekly sessions logged, resets ${dashboardWeeklySessionResetFullLabel}`}
              aria-valuemax={dashboardSummary.weeklySessionGoal}
              aria-valuemin={0}
              aria-valuenow={Math.min(
                dashboardSummary.workoutsThisWeek,
                dashboardSummary.weeklySessionGoal,
              )}
              className={`dashboard-header-week-sessions dashboard-header-meter-scroller__meter dashboard-header-meter-scroller__meter--${getDashboardHeaderMeterSlot(
                1,
              )} hidden h-14 min-w-[6.8rem] shrink-0 flex-col items-center justify-center bg-transparent px-0 text-center text-emerald-50 md:flex`}
              data-dashboard-tooltip={`${dashboardSummary.workoutsThisWeek} of ${dashboardSummary.weeklySessionGoal} weekly sessions logged. Resets ${dashboardWeeklySessionResetFullLabel}`}
              role="meter"
              style={
                {
                  "--dashboard-week-session-bar": `${dashboardSummary.weeklySessionProgress}%`,
                } as CSSProperties
              }
            >
              <span
                aria-hidden="true"
                className="dashboard-header-week-sessions__graph"
              >
                <span
                  className={`dashboard-header-week-sessions__bar ${
                    dashboardSummary.workoutsThisWeek > 0
                      ? "dashboard-header-week-sessions__bar--active"
                      : ""
                  }`}
                >
                  <span className="dashboard-header-week-sessions__fill" />
                  <span
                    aria-hidden="true"
                    className="dashboard-header-week-sessions__goal-lines"
                  >
                    {Array.from(
                      { length: dashboardSummary.weeklySessionGoal },
                      (_, goalIndex) => (
                        <span
                          className={`dashboard-header-week-sessions__goal-section ${
                            goalIndex < dashboardSummary.workoutsThisWeek
                              ? "dashboard-header-week-sessions__goal-section--filled"
                              : ""
                          }`}
                          data-session-level={goalIndex + 1}
                          key={`weekly-session-goal-section-${goalIndex + 1}`}
                          style={
                            {
                              "--dashboard-week-session-section-bottom": `${
                                (goalIndex / dashboardSummary.weeklySessionGoal) *
                                100
                              }%`,
                              "--dashboard-week-session-section-height": `${
                                100 / dashboardSummary.weeklySessionGoal
                              }%`,
                            } as CSSProperties
                          }
                        />
                      ),
                    )}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="dashboard-header-week-sessions__opening-sheen"
                />
              </span>
              <span className="dashboard-header-week-sessions__label">
                Sessions / Week
              </span>
              <span
                aria-label={`Weekly session reset ${dashboardWeeklySessionResetFullLabel}`}
                className="dashboard-header-meter-deadline dashboard-header-meter-deadline--week"
              >
                Reset {dashboardWeeklySessionResetLabel}
              </span>
            </div>

            <div
              aria-label={`${dashboardPlanAttendanceDescription}, ${dashboardPlanSessionsRemaining} sessions remaining`}
              aria-valuemax={dashboardSummary.planSessionTarget}
              aria-valuemin={0}
              aria-valuenow={dashboardPlanSessionsAttended}
              className={`dashboard-header-plan-attendance dashboard-header-streak-fire dashboard-header-meter-scroller__meter dashboard-header-meter-scroller__meter--${getDashboardHeaderMeterSlot(
                0,
              )} relative hidden h-14 min-w-[6.6rem] shrink-0 place-items-center overflow-visible bg-transparent px-0 text-center text-amber-50 md:grid`}
              data-dashboard-tooltip={`${dashboardPlanAttendanceDescription}. ${dashboardPlanAttendanceCaption}.`}
              role="meter"
              style={
                {
                  "--dashboard-header-plan-attendance-progress": `${dashboardSummary.planSessionProgress}%`,
                } as CSSProperties
              }
            >
              <span
                aria-hidden="true"
                className="dashboard-header-streak-fire__flame"
              />
              <span
                aria-hidden="true"
                className="dashboard-header-streak-fire__embers"
              />
              <span
                aria-hidden="true"
                className="dashboard-header-streak-fire__gauge"
              >
                <svg
                  aria-hidden="true"
                  className="dashboard-header-streak-fire__gauge-svg"
                  viewBox="0 0 96 96"
                >
                  <circle
                    cx="48"
                    cy="48"
                    fill="rgba(2,6,23,0.42)"
                    r="41"
                    stroke="rgba(224,242,254,0.08)"
                    strokeWidth="1"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    fill="none"
                    pathLength={100}
                    r="35.5"
                    stroke="rgba(15,23,42,0.78)"
                    strokeWidth="10"
                  />
                  <circle
                    className="dashboard-header-plan-attendance__progress-ring"
                    cx="48"
                    cy="48"
                    fill="none"
                    pathLength={100}
                    r="35.5"
                    stroke="url(#dashboardHeaderPlanAttendanceGradient)"
                    strokeDasharray="100"
                    strokeDashoffset={100 - dashboardSummary.planSessionProgress}
                    strokeLinecap="round"
                    strokeWidth="10"
                    transform="rotate(-90 48 48)"
                  />
                  {Array.from({
                    length: dashboardSummary.planSessionTarget,
                  }).map((_, tickIndex) => {
                    const tickAngle =
                      tickIndex * (360 / dashboardSummary.planSessionTarget);
                    const isFilledTick =
                      tickIndex < dashboardPlanSessionsAttended;

                    return (
                      <line
                        key={`dashboard-header-plan-attendance-tick-${tickIndex}`}
                        stroke={
                          isFilledTick
                            ? "rgba(254,240,138,0.92)"
                            : "rgba(148,163,184,0.36)"
                        }
                        strokeLinecap="round"
                        strokeWidth={isFilledTick ? 2.1 : 1.25}
                        transform={`rotate(${tickAngle} 48 48)`}
                        x1="48"
                        x2="48"
                        y1="7"
                        y2={isFilledTick ? "18" : "15"}
                      />
                    );
                  })}
                  <circle
                    cx="48"
                    cy="48"
                    fill="rgba(2,6,23,0.86)"
                    r="25.5"
                    stroke="rgba(125,211,252,0.26)"
                    strokeWidth="1.4"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    fill="none"
                    r="30"
                    stroke="rgba(255,255,255,0.12)"
                    strokeDasharray="1.6 5.2"
                    strokeLinecap="round"
                    strokeWidth="1"
                  />
                  <circle
                    className="dashboard-header-plan-attendance__spark"
                    cx="48"
                    cy="12.5"
                    fill="rgb(250,204,21)"
                    opacity={dashboardPlanSessionsAttended > 0 ? 1 : 0}
                    r="3.2"
                    stroke="rgba(254,249,195,0.9)"
                    strokeWidth="1"
                    transform={`rotate(${
                      dashboardSummary.planSessionProgress * 3.6
                    } 48 48)`}
                  />
                  <defs>
                    <linearGradient
                      id="dashboardHeaderPlanAttendanceGradient"
                      x1="14"
                      x2="82"
                      y1="82"
                      y2="14"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor="rgb(34,211,238)" />
                      <stop offset="42%" stopColor="rgb(52,211,153)" />
                      <stop offset="72%" stopColor="rgb(250,204,21)" />
                      <stop offset="100%" stopColor="rgb(250,204,21)" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
              <span className="dashboard-header-streak-fire__content">
                <span className="dashboard-header-streak-fire__value">
                  {`${dashboardPlanSessionsAttended}/${dashboardSummary.planSessionTarget}`}
                </span>
                <span className="dashboard-header-streak-fire__label">
                  Plan Sessions
                </span>
              </span>
              <span
                aria-label={dashboardPlanAttendanceDescription}
                className="dashboard-header-meter-deadline dashboard-header-meter-deadline--streak"
              >
                {dashboardPlanAttendanceCaption}
              </span>
            </div>
          </div>
        </div>
        </div>

        <div
          aria-label="Header block 4, weekly calories and weight change"
          className={`dashboard-header-menu-block dashboard-header-menu-block--fuel dashboard-header-menu-block--slot-${getDashboardHeaderMenuBlockSlot(
            3,
          )}`}
        >
          <div className="dashboard-header-fuel-meters">
            <div
              aria-label={`${dashboardSummary.weeklyCaloriesDisplay} total weekly calories`}
              aria-valuemax={dashboardSummary.weeklyCaloriesGoal}
              aria-valuemin={0}
              aria-valuenow={dashboardSummary.weeklyCalories}
              className="dashboard-header-fuel-meter dashboard-header-fuel-meter--calories"
              data-dashboard-tooltip={`${dashboardSummary.weeklyCaloriesDisplay} total weekly calories`}
              role="meter"
              style={
                {
                  "--dashboard-header-fuel-progress": `${dashboardSummary.weeklyCaloriesProgress}%`,
                } as CSSProperties
              }
            >
              <span
                aria-hidden="true"
                className="dashboard-header-fuel-meter__ring"
              >
                <span className="dashboard-header-fuel-meter__value">
                  {dashboardSummary.weeklyCaloriesDisplay}
                </span>
              </span>
              <span className="dashboard-header-fuel-meter__label">
                Weekly Calories
              </span>
              <span className="dashboard-header-fuel-meter__meta">
                Total Week
              </span>
            </div>

            <div
              aria-label={`Weight change ${dashboardSummary.weightChangeLabel}, ${dashboardSummary.weightChangeTrendLabel}`}
              aria-valuemax={5}
              aria-valuemin={-5}
              aria-valuenow={Number(dashboardSummary.weightChange.toFixed(1))}
              className={`dashboard-header-fuel-meter dashboard-header-fuel-meter--weight dashboard-header-fuel-meter--${dashboardSummary.weightChangeTone}`}
              data-dashboard-tooltip={`Weight change ${dashboardSummary.weightChangeLabel}. ${dashboardSummary.weightChangeTrendLabel}`}
              role="meter"
              style={
                {
                  "--dashboard-header-fuel-progress": `${dashboardSummary.weightChangeProgress}%`,
                } as CSSProperties
              }
            >
              <span
                aria-hidden="true"
                className="dashboard-header-fuel-meter__ring"
              >
                <span className="dashboard-header-fuel-meter__value">
                  {dashboardSummary.weightChangeLabel}
                </span>
              </span>
              <span className="dashboard-header-fuel-meter__label">
                Weight +/-
              </span>
              <span className="dashboard-header-fuel-meter__meta">
                {dashboardSummary.weightChangeTrendLabel}
              </span>
            </div>
          </div>
        </div>

        <div
          aria-label="Header block 5, profile"
          className={`dashboard-header-menu-block dashboard-header-menu-block--profile dashboard-header-menu-block--slot-${getDashboardHeaderMenuBlockSlot(
            4,
          )} shrink-0 overflow-visible pb-3`}
          data-profile-actions-open={
            dashboardProfileActionsOpen ? "true" : "false"
          }
        >
          <div className="flex min-h-[58px] items-center gap-2">
            <button
              aria-controls="dashboard-profile-hub-orbital-overlay"
              aria-expanded={dashboardProfileHubOpen}
              aria-label={`Open profile hub, Sound Fitness level ${soundFitnessLevel}`}
              className="dashboard-profile-hub-trigger relative isolate flex min-h-[58px] shrink-0 items-center rounded-[22px] border border-transparent bg-transparent px-2 py-2 text-left text-slate-200 shadow-none transition hover:-translate-y-0.5 hover:bg-transparent"
              data-dashboard-tooltip={`Profile hub, level ${soundFitnessLevel}`}
              onClick={openDashboardProfileHub}
              type="button"
            >
              <span
                aria-hidden="true"
                className="dashboard-sound-level-badge relative isolate grid h-[3.25rem] w-[3.25rem] shrink-0 place-items-center overflow-hidden rounded-full border border-cyan-200/30 bg-slate-950 p-0.5 shadow-[0_0_20px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.12)]"
                style={
                  {
                    "--dashboard-sound-level-progress": `${Math.max(
                      10,
                      soundFitnessLevelProgress,
                    )}%`,
                  } as CSSProperties
                }
              >
                <Image
                  alt=""
                  className="relative z-10 h-11 w-11 rounded-full object-contain"
                  height={44}
                  src="/sound-fitness-logo.png"
                  width={44}
                />
                <span className="dashboard-sound-level-badge__band pointer-events-none absolute inset-x-0.5 bottom-0.5 z-20 h-[40%] rounded-b-full border-t border-cyan-200/35 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.38),rgba(15,23,42,0.42)_62%,rgba(2,6,23,0.78))] shadow-[0_-4px_14px_rgba(34,211,238,0.14),inset_0_1px_0_rgba(255,255,255,0.20)]" />
                <span
                  className="dashboard-sound-level-badge__fill pointer-events-none absolute bottom-0.5 left-0.5 z-20 h-[40%] overflow-hidden rounded-b-full bg-[linear-gradient(90deg,rgba(250,204,21,0.92),rgba(103,232,249,0.86))] opacity-90 shadow-[0_0_16px_rgba(250,204,21,0.42),0_0_20px_rgba(34,211,238,0.26)]"
                  style={{
                    width: `calc(var(--dashboard-sound-level-progress) - 0.25rem)`,
                  }}
                />
                <span className="dashboard-sound-level-badge__label pointer-events-none absolute bottom-[0.16rem] z-30 flex items-baseline justify-center gap-[0.08rem] font-black leading-none tracking-[0.04em] text-white [text-shadow:0_0_8px_rgba(2,6,23,0.96),0_0_10px_rgba(250,204,21,0.62)]">
                  <span className="text-[0.42rem]">LV</span>
                  <span className="text-[0.78rem]">{soundFitnessLevel}</span>
                </span>
              </span>
            </button>

            <div
              className="relative"
              ref={dashboardPointsDropdownRef}
            >
              <button
                aria-controls="dashboard-points-dropdown"
                aria-expanded={dashboardPointsDropdownOpen}
                aria-label={`Open Sound Points rewards, ${soundPoints.toLocaleString()} points, ${soundTokens.toLocaleString()} tokens, and ${soundEmeralds.toLocaleString()} emeralds`}
                className="dashboard-profile-points-trigger flex min-h-[68px] min-w-[88px] shrink-0 flex-col items-start justify-center gap-0.5 rounded-[18px] border border-transparent bg-transparent px-2 py-2 text-left text-slate-200 shadow-none transition hover:-translate-y-0.5 hover:border-emerald-200/18 hover:bg-emerald-300/8"
                data-dashboard-tooltip="Sound Points"
                onClick={toggleDashboardPointsDropdown}
                type="button"
              >
                <span className="flex items-center gap-1.5">
                  <span className="sr-only">Emeralds</span>
                  <span
                    aria-hidden="true"
                    className="dashboard-emerald-gem h-[1.125rem] w-[1.125rem]"
                  />
                  <span className="text-xs font-black leading-none text-white">
                    {soundEmeralds.toLocaleString()}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="sr-only">Tokens</span>
                  <Image
                    alt=""
                    className="h-8 w-8 rounded-full object-contain drop-shadow-[0_0_14px_rgba(34,211,238,0.28)]"
                    height={32}
                    src="/sound-token.png"
                    width={32}
                  />
                  <span className="text-sm font-black leading-none text-white">
                    {soundTokens.toLocaleString()}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="sr-only">Points</span>
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4 text-amber-200 drop-shadow-[0_0_12px_rgba(250,204,21,0.28)]"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M13.5 2 4.8 13.2h6.1L9.7 22 19.2 9.6h-6.4L13.5 2Z" />
                  </svg>
                  <span className="text-sm font-black leading-none text-white">
                    {soundPoints.toLocaleString()}
                  </span>
                </span>
              </button>

              {dashboardPointsDropdownOpen ? (
                <div
                  aria-label="Sound Points rewards"
                  className="dashboard-profile-points-dropdown absolute right-0 top-[calc(100%+0.55rem)] z-[160] w-[21rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[22px] border border-amber-200/24 bg-slate-950/92 p-3 text-slate-200 shadow-[0_22px_70px_rgba(0,0,0,0.46),0_0_34px_rgba(250,204,21,0.12),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl"
                  id="dashboard-points-dropdown"
                  role="region"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-100">
                        Sound Rewards
                      </div>
                      <div className="mt-1 text-[11px] font-bold leading-4 text-slate-400">
                        Level progress, Emeralds, Sound Coins, and Sound Points.
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-cyan-200/28 bg-cyan-300/10 text-cyan-50 shadow-[0_0_16px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.10)]">
                        <span className="flex flex-col items-center leading-none">
                          <span className="text-[8px] font-black uppercase tracking-[0.12em] text-cyan-100/74">
                            LV
                          </span>
                          <span className="mt-0.5 text-sm font-black">
                            {soundFitnessLevel}
                          </span>
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-[0.12em] text-slate-300">
                          <span>Level progress</span>
                          <span>{Math.round(soundFitnessLevelProgress)}%</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-900/80">
                          <span
                            className="block h-full rounded-full bg-[linear-gradient(90deg,rgba(250,204,21,0.92),rgba(103,232,249,0.92))] shadow-[0_0_14px_rgba(250,204,21,0.28)]"
                            style={{ width: `${soundFitnessLevelProgress}%` }}
                          />
                        </div>
                        <div className="mt-2 text-[10px] font-bold text-slate-400">
                          {soundPointsToNextLevel.toLocaleString()} points to LV{" "}
                          {soundFitnessLevel + 1}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-2">
                    <section className="rounded-2xl border border-emerald-200/22 bg-emerald-300/8 p-2.5">
                      <div className="flex items-start gap-3">
                        <div className="flex shrink-0 flex-col items-center gap-1">
                          <span
                            aria-hidden="true"
                            className="dashboard-emerald-cut-float"
                          >
                            <svg
                              className="dashboard-emerald-cut-gem"
                              viewBox="0 0 64 64"
                            >
                              <defs>
                                <linearGradient
                                  id="dashboardEmeraldOuter"
                                  x1="12"
                                  x2="54"
                                  y1="7"
                                  y2="58"
                                >
                                  <stop offset="0" stopColor="#ecfdf5" />
                                  <stop offset="0.24" stopColor="#5eead4" />
                                  <stop offset="0.56" stopColor="#10b981" />
                                  <stop offset="1" stopColor="#022c22" />
                                </linearGradient>
                                <linearGradient
                                  id="dashboardEmeraldTable"
                                  x1="20"
                                  x2="46"
                                  y1="12"
                                  y2="45"
                                >
                                  <stop offset="0" stopColor="#d1fae5" />
                                  <stop offset="0.44" stopColor="#34d399" />
                                  <stop offset="1" stopColor="#047857" />
                                </linearGradient>
                              </defs>
                              <path
                                d="M18 4h28l14 14v28L46 60H18L4 46V18L18 4Z"
                                fill="url(#dashboardEmeraldOuter)"
                              />
                              <path
                                d="M22 13h20l9 9v20l-9 9H22l-9-9V22l9-9Z"
                                fill="url(#dashboardEmeraldTable)"
                                opacity="0.94"
                              />
                              <path
                                d="M18 4 22 13 13 22 4 18Z"
                                fill="#a7f3d0"
                                opacity="0.88"
                              />
                              <path
                                d="M46 4 42 13 51 22 60 18Z"
                                fill="#6ee7b7"
                                opacity="0.78"
                              />
                              <path
                                d="M60 46 51 42 42 51 46 60Z"
                                fill="#065f46"
                                opacity="0.8"
                              />
                              <path
                                d="M4 46 13 42 22 51 18 60Z"
                                fill="#047857"
                                opacity="0.72"
                              />
                              <path
                                d="M22 13h20l-10 13Z"
                                fill="#ecfdf5"
                                opacity="0.54"
                              />
                              <path
                                d="M13 22 32 26 22 51Z"
                                fill="#059669"
                                opacity="0.56"
                              />
                              <path
                                d="M51 22 32 26 42 51Z"
                                fill="#14b8a6"
                                opacity="0.46"
                              />
                              <path
                                d="M22 51 32 26 42 51Z"
                                fill="#064e3b"
                                opacity="0.48"
                              />
                              <path
                                d="M18 4h28l14 14v28L46 60H18L4 46V18L18 4Z"
                                fill="none"
                                stroke="rgba(236,253,245,0.78)"
                                strokeWidth="2"
                              />
                              <path
                                d="M20 10 11 19"
                                fill="none"
                                stroke="rgba(255,255,255,0.72)"
                                strokeLinecap="round"
                                strokeWidth="3"
                              />
                            </svg>
                          </span>
                          <Image
                            alt=""
                            aria-hidden="true"
                            className="h-16 w-16 rounded-2xl object-cover drop-shadow-[0_0_20px_rgba(16,185,129,0.34)]"
                            height={64}
                            src="/sound-emerald-crystals.png"
                            width={64}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-emerald-100/72">
                                Emeralds
                              </div>
                              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-50/80">
                                Premium collectible
                              </div>
                            </div>
                            <div className="text-2xl font-black leading-none text-white">
                              {soundEmeralds.toLocaleString()}
                            </div>
                          </div>
                          <div className="mt-2 grid gap-1 text-[10px] font-bold leading-4 text-slate-300">
                            <div>
                              <span className="font-black uppercase tracking-[0.1em] text-emerald-100">
                                Earn:
                              </span>{" "}
                              Convert every 25 Sound Coins and unlock major milestones.
                            </div>
                            <div>
                              <span className="font-black uppercase tracking-[0.1em] text-emerald-100">
                                Use:
                              </span>{" "}
                              Redeem for top-tier perks, premium challenges, and rare rewards.
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-cyan-200/18 bg-cyan-300/8 p-2.5">
                      <div className="flex items-start gap-3">
                        <Image
                          alt=""
                          aria-hidden="true"
                          className="mt-0.5 h-9 w-9 shrink-0 rounded-full object-contain drop-shadow-[0_0_14px_rgba(34,211,238,0.28)]"
                          height={36}
                          src="/sound-token.png"
                          width={36}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100/72">
                                Sound Coins
                              </div>
                              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-cyan-50/80">
                                Training currency
                              </div>
                            </div>
                            <div className="text-2xl font-black leading-none text-white">
                              {soundTokens.toLocaleString()}
                            </div>
                          </div>
                          <div className="mt-2 grid gap-1 text-[10px] font-bold leading-4 text-slate-300">
                            <div>
                              <span className="font-black uppercase tracking-[0.1em] text-cyan-100">
                                Earn:
                              </span>{" "}
                              Complete workouts, save templates, and keep stats active.
                            </div>
                            <div>
                              <span className="font-black uppercase tracking-[0.1em] text-cyan-100">
                                Use:
                              </span>{" "}
                              Trade toward Emeralds, unlock boosts, and claim reward drops.
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-amber-200/18 bg-amber-300/8 p-2.5">
                      <div className="flex items-start gap-3">
                        <svg
                          aria-hidden="true"
                          className="mt-1 h-8 w-8 shrink-0 text-amber-200 drop-shadow-[0_0_12px_rgba(250,204,21,0.28)]"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M13.5 2 4.8 13.2h6.1L9.7 22 19.2 9.6h-6.4L13.5 2Z" />
                        </svg>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-100/72">
                                Sound Points
                              </div>
                              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-50/80">
                                Progress score
                              </div>
                            </div>
                            <div className="text-2xl font-black leading-none text-white">
                              {soundPoints.toLocaleString()}
                            </div>
                          </div>
                          <div className="mt-2 grid gap-1 text-[10px] font-bold leading-4 text-slate-300">
                            <div>
                              <span className="font-black uppercase tracking-[0.1em] text-amber-100">
                                Earn:
                              </span>{" "}
                              Log sets, complete sessions, build plans, and track progress.
                            </div>
                            <div>
                              <span className="font-black uppercase tracking-[0.1em] text-amber-100">
                                Use:
                              </span>{" "}
                              Raise your level, open achievements, and guide reward unlocks.
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-3">
                    <Link
                      aria-label="Open achievements"
                      className="inline-grid h-10 w-10 place-items-center bg-transparent text-amber-100 transition hover:-translate-y-0.5 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/55"
                      data-dashboard-tooltip="Achievements"
                      href={ROUTES.dashboard.achievements}
                      onClick={() => {
                        markDashboardDestinationVisited(
                          ROUTES.dashboard.achievements,
                        );
                        setDashboardPointsDropdownOpen(false);
                      }}
                    >
                      <DashboardTabIcon className="h-5 w-5" name="Achievements" />
                    </Link>
                    <Link
                      aria-label="Open stats"
                      className="inline-grid h-10 w-10 place-items-center bg-transparent text-cyan-100 transition hover:-translate-y-0.5 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/55"
                      data-dashboard-tooltip="Stats"
                      href={ROUTES.dashboard.stats}
                      onClick={() => {
                        markDashboardDestinationVisited(ROUTES.dashboard.stats);
                        setDashboardPointsDropdownOpen(false);
                      }}
                    >
                      <DashboardTabIcon className="h-5 w-5" name="Stats" />
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <button
            aria-expanded={dashboardProfileActionsOpen}
            aria-hidden={dashboardProfileActionsOpen}
            aria-label={
              dashboardProfileActionsOpen
                ? "Hide profile shortcuts"
                : "Show profile shortcuts"
            }
            className="dashboard-profile-action-gear"
            data-dashboard-tooltip={
              dashboardProfileActionsOpen
                ? "Hide shortcuts"
                : "Profile shortcuts"
            }
            onClick={() => {
              const nextOpen = !dashboardProfileActionsOpen;
              setDashboardProfileActionsOpen(nextOpen);
              setDashboardPointsDropdownOpen(false);
              setDashboardHeaderMeterMenuOpen(false);
              if (!nextOpen) {
                setDashboardMusicDropdownOpen(false);
              }
            }}
            style={{ left: "2.55rem" }}
            tabIndex={dashboardProfileActionsOpen ? -1 : 0}
            type="button"
          >
            <DashboardTabIcon className="h-3.5 w-3.5" name="Settings" />
          </button>

          <div
            aria-hidden={!dashboardProfileActionsOpen}
            aria-label="Profile community and program actions"
            className="dashboard-profile-upper-actions"
            data-profile-actions-open={
              dashboardProfileActionsOpen ? "true" : "false"
            }
            style={{ left: "-0.95rem" }}
          >
            <Link
              aria-label="Open groups"
              className="dashboard-profile-quick-action dashboard-profile-quick-action--top-left dashboard-profile-quick-action--groups"
              data-dashboard-tooltip="Groups"
              href={ROUTES.dashboard.social}
              onClick={() =>
                markDashboardDestinationVisited(ROUTES.dashboard.social)
              }
              tabIndex={dashboardProfileActionsOpen ? 0 : -1}
            >
              <DashboardTabIcon className="h-3.5 w-3.5" name="Groups" />
            </Link>
            <Link
              aria-label="Open programs and challenges"
              className="dashboard-profile-quick-action dashboard-profile-quick-action--top-right dashboard-profile-quick-action--programs"
              data-dashboard-tooltip="Programs and challenges"
              href={ROUTES.dashboard.myPlan}
              onClick={() =>
                markDashboardDestinationVisited(ROUTES.dashboard.myPlan)
              }
              tabIndex={dashboardProfileActionsOpen ? 0 : -1}
            >
              <DashboardTabIcon
                className="h-3.5 w-3.5"
                name="Programs and Challenges"
              />
            </Link>
          </div>

          <div
            aria-hidden={!dashboardProfileActionsOpen}
            aria-label="Profile quick actions"
            className="dashboard-profile-quick-actions"
            data-profile-actions-open={
              dashboardProfileActionsOpen ? "true" : "false"
            }
            style={{ left: "-0.95rem" }}
          >
            <div
              className="dashboard-music-control"
              ref={dashboardMusicDropdownRef}
            >
              <button
                aria-controls="dashboard-music-dropdown"
                aria-expanded={dashboardMusicDropdownOpen}
                aria-label={`${dashboardMusicDropdownOpen ? "Close" : "Open"} ${activeDashboardMusicBlendLabel} controls`}
                aria-pressed={dashboardMusicEnabled}
                className="dashboard-profile-quick-action dashboard-profile-quick-action--left dashboard-profile-quick-action--music"
                data-music-active={dashboardMusicEnabled ? "true" : "false"}
                onClick={toggleDashboardMusicDropdown}
                tabIndex={dashboardProfileActionsOpen ? 0 : -1}
                type="button"
              >
                <span className="dashboard-profile-quick-action__inner">
                  <DashboardTabIcon
                    className="dashboard-profile-quick-action__music-note h-3.5 w-3.5"
                    name="Music"
                  />
                  <span
                    aria-hidden="true"
                    className="dashboard-profile-quick-action__bars"
                  >
                    <span />
                    <span />
                    <span />
                  </span>
                </span>
              </button>
              <span
                aria-hidden="true"
                className="dashboard-profile-quick-action__station dashboard-profile-quick-action__station--floating"
              >
                <span>{activeDashboardMusicBlendShortLabel}</span>
                <span>FM</span>
              </span>

              {dashboardMusicDropdownOpen ? (
                <>
                  <div
                  aria-label="Music Now sound controls"
                  className="dashboard-music-dropdown"
                  data-mood-station={activeDashboardMusicMoodStation.id}
                  id="dashboard-music-dropdown"
                  role="region"
                >
                  <span
                    aria-hidden="true"
                    className="dashboard-music-mood-visualizer"
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-100">
                        Music Now
                      </div>
                      <div className="mt-1 text-[11px] font-bold leading-4 text-slate-400">
                        {activeDashboardMusicBlendHelper}
                      </div>
                    </div>
                    <span className="rounded-full border border-cyan-200/24 bg-cyan-300/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
                      {activeDashboardMusicBlendTempo}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-center gap-5">
                    <button
                      aria-label={
                        dashboardMusicEnabled
                          ? "Pause Music Now sequence"
                          : "Play Music Now sequence"
                      }
                      aria-pressed={dashboardMusicEnabled}
                      className={`grid h-12 w-12 place-items-center rounded-full transition hover:-translate-y-0.5 hover:bg-white/[0.06] ${
                        dashboardMusicEnabled
                          ? "bg-white/[0.16] text-white shadow-[0_0_24px_rgba(255,255,255,0.18)] ring-1 ring-white/35"
                          : "text-cyan-100"
                      }`}
                      onClick={() => {
                        void toggleDashboardMusic();
                      }}
                      type="button"
                    >
                      <DashboardTabIcon
                        className="h-5 w-5"
                        name={dashboardMusicEnabled ? "Pause" : "Play"}
                      />
                    </button>
                    <button
                      aria-label="Skip to next Music Now station"
                      className="grid h-12 w-12 place-items-center rounded-full text-slate-300 transition hover:-translate-y-0.5 hover:bg-white/[0.06] hover:text-amber-100"
                      onClick={handleDashboardMusicSkip}
                      type="button"
                    >
                      <DashboardTabIcon className="h-5 w-5" name="Skip" />
                    </button>
                  </div>

                  <div
                    className="dashboard-music-volume-row mt-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.12em] text-slate-300"
                    data-volume-muted={dashboardMusicMuted ? "true" : "false"}
                  >
                    <button
                      aria-label={
                        dashboardMusicMuted
                          ? "Unmute Music Now"
                          : "Mute Music Now"
                      }
                      aria-pressed={dashboardMusicMuted}
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition hover:-translate-y-0.5 hover:bg-white/[0.06] ${
                        dashboardMusicMuted ? "text-rose-100" : "text-cyan-100"
                      }`}
                      onClick={handleDashboardMusicMuteToggle}
                      type="button"
                    >
                      <DashboardTabIcon
                        className="h-3.5 w-3.5"
                        name={dashboardMusicMuted ? "Muted" : "Volume"}
                      />
                    </button>
                    <input
                      aria-label="Music Now volume"
                      aria-valuetext={dashboardMusicVolumeLabel}
                      className="dashboard-music-volume-slider min-w-0 flex-1"
                      max={100}
                      min={0}
                      onChange={handleDashboardMusicVolumeChange}
                      style={
                        {
                          "--dashboard-music-volume-percent": `${dashboardMusicVolumePercent}%`,
                        } as CSSProperties
                      }
                      type="range"
                      value={dashboardMusicVolumePercent}
                    />
                    <span className="w-10 text-right">
                      {dashboardMusicVolumeLabel}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-[0.12em] text-slate-300">
                    <span>Auto play</span>
                    <button
                      aria-label="Toggle Music Now auto play"
                      aria-pressed={dashboardMusicAutoplayMode === "on"}
                      className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] transition hover:-translate-y-0.5 hover:bg-white/[0.06] ${
                        dashboardMusicAutoplayMode === "on"
                          ? "text-amber-100"
                          : "text-slate-300 hover:text-cyan-100"
                      }`}
                      onClick={() =>
                        handleDashboardMusicAutoplayModeChange(
                          dashboardMusicAutoplayMode === "on" ? "off" : "on",
                        )
                      }
                      type="button"
                    >
                      {activeDashboardMusicAutoplayOption.label}
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                    <span>Sound stations</span>
                    <span
                      aria-label={`${safeActiveDashboardMusicStations
                        .map((station) => station.label)
                        .join(", ")} queued`}
                      className="flex items-center gap-1"
                    >
                      {safeActiveDashboardMusicStations.map((station) => (
                        <span
                          className="inline-flex text-amber-100 drop-shadow-[0_0_8px_rgba(250,204,21,0.42)]"
                          data-dashboard-tooltip={`${station.label} queued`}
                          key={`${station.id}-queued-station-icon`}
                        >
                          <DashboardTabIcon
                            className="h-3 w-3"
                            name={dashboardMusicStationIconNames[station.id]}
                          />
                        </span>
                      ))}
                    </span>
                  </div>
                </div>

                  <div
                    aria-label="Music Now station orbit selector"
                    className="dashboard-music-station-orbit"
                    style={{
                      height: "9.4rem",
                      left: "-11.3rem",
                      minHeight: 0,
                      position: "absolute",
                      top: "18.15rem",
                      width: "19.65rem",
                      zIndex: 220,
                    }}
                  >
                    <div
                      className="dashboard-music-station-orbit__stage cursor-grab select-none outline-none [touch-action:pan-y] active:cursor-grabbing"
                      onClickCapture={(event) => {
                        if (dashboardMusicStationPointerMovedRef.current) {
                          event.preventDefault();
                          event.stopPropagation();
                          dashboardMusicStationPointerMovedRef.current = false;
                        }
                      }}
                      onKeyDown={(event) =>
                        handleDashboardOrbitKeyDown(
                          event,
                          rotateDashboardMusicStationOrbit,
                        )
                      }
                      onPointerCancel={(event) => {
                        dashboardMusicStationPointerStartRef.current = null;
                        if (
                          event.currentTarget.hasPointerCapture?.(
                            event.pointerId,
                          )
                        ) {
                          event.currentTarget.releasePointerCapture?.(
                            event.pointerId,
                          );
                        }
                      }}
                      onPointerDown={(event) =>
                        handleDashboardOrbitPointerDown(
                          event,
                          dashboardMusicStationPointerStartRef,
                          dashboardMusicStationPointerMovedRef,
                        )
                      }
                      onPointerMove={(event) =>
                        handleDashboardOrbitPointerMove(
                          event,
                          dashboardMusicStationPointerStartRef,
                          dashboardMusicStationPointerMovedRef,
                          rotateDashboardMusicStationOrbit,
                          42,
                        )
                      }
                      onPointerUp={(event) => {
                        const startX =
                          dashboardMusicStationPointerStartRef.current;
                        dashboardMusicStationPointerStartRef.current = null;

                        if (
                          event.currentTarget.hasPointerCapture?.(
                            event.pointerId,
                          )
                        ) {
                          event.currentTarget.releasePointerCapture?.(
                            event.pointerId,
                          );
                        }

                        if (
                          startX === null ||
                          dashboardMusicStationPointerMovedRef.current
                        ) {
                          return;
                        }

                        const elementAtPoint =
                          event.currentTarget.ownerDocument.elementFromPoint(
                            event.clientX,
                            event.clientY,
                          );
                        const stationElement =
                          elementAtPoint instanceof HTMLElement
                            ? elementAtPoint.closest("[data-music-station-id]")
                            : null;
                        const stationId =
                          stationElement instanceof HTMLElement
                            ? stationElement.dataset.musicStationId
                            : undefined;

                        if (
                          stationId &&
                          stationId in dashboardMusicStationById
                        ) {
                          event.preventDefault();
                          event.stopPropagation();
                          handleDashboardMusicStationToggle(
                            stationId as DashboardMusicStationId,
                          );
                        }
                      }}
                      role="group"
                      style={{
                        height: "100%",
                        overflow: "visible",
                        perspective: "720px",
                        position: "relative",
                        transformStyle: "preserve-3d",
                        width: "100%",
                      }}
                      tabIndex={0}
                    >
                      {dashboardMusicStations.map((station, index) => {
                        const distance = getDashboardOrbitDistance(
                          index,
                          safeDashboardMusicStationOrbitIndex,
                          dashboardMusicStations.length,
                        );
                        const absDistance = Math.abs(distance);
                        const direction = Math.sign(distance);
                        const isCenteredStation = distance === 0;
                        const isOrbitVisible = absDistance <= 1;
                        const isActiveStation =
                          dashboardMusicStationIds.includes(station.id);
                        const slot = isCenteredStation
                          ? {
                              blur: 0,
                              opacity: 1,
                              rotateY: 0,
                              scale: 1,
                              x: 0,
                              y: 0,
                              zIndex: 30,
                            }
                          : {
                              blur: 0.36,
                              opacity: 0.68,
                              rotateY: 31,
                              scale: 0.72,
                              x: 120,
                              y: 8,
                              zIndex: 14,
                            };

                        return (
                          <button
                            aria-label={`${isActiveStation ? "Remove" : "Add"} ${station.label} from Music Now sequence`}
                            aria-pressed={isActiveStation}
                            className={`dashboard-music-station-orbit__card ${
                              isActiveStation
                                ? "dashboard-music-station-orbit__card--active"
                                : ""
                            }`}
                            data-orbit-center={
                              isCenteredStation ? "true" : "false"
                            }
                            data-orbit-visible={
                              isOrbitVisible ? "true" : "false"
                            }
                            data-music-station-id={station.id}
                            data-station-id={station.id}
                            key={station.id}
                            onClick={(event) => {
                              if (event.detail === 0) {
                                handleDashboardMusicStationToggle(station.id);
                              }
                            }}
                            style={{
                              background: "transparent",
                              border: "1px solid transparent",
                              borderRadius: "0.82rem",
                              boxShadow: "none",
                              color: isActiveStation
                                ? "rgb(254, 243, 199)"
                                : "rgb(203, 213, 225)",
                              filter: "none",
                              left: "50%",
                              minHeight: "4.35rem",
                              opacity: isOrbitVisible ? slot.opacity : 0,
                              overflow: "visible",
                              padding: "0.48rem",
                              pointerEvents: isOrbitVisible ? "auto" : "none",
                              position: "absolute",
                              textAlign: "center",
                              top: "34%",
                              transform: `translate(-50%, -50%) translateX(${
                                direction * slot.x
                              }px) translateY(${slot.y}px) scale(${
                                isOrbitVisible ? slot.scale : 0.52
                              }) rotateY(${direction * slot.rotateY}deg)`,
                              transformStyle: "preserve-3d",
                              transition:
                                "transform 420ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 260ms ease",
                              visibility: isOrbitVisible
                                ? "visible"
                                : "hidden",
                              width: "8.75rem",
                              zIndex: isOrbitVisible ? slot.zIndex : 0,
                            }}
                            tabIndex={isOrbitVisible ? 0 : -1}
                            type="button"
                          >
                            {isActiveStation && isCenteredStation ? (
                              <span
                                aria-hidden="true"
                                className="dashboard-music-station-orbit__card-glow"
                              />
                            ) : null}
                            <span className="dashboard-music-station-orbit__content relative z-[1] grid min-h-[3.35rem] place-items-center">
                              <span
                                className={`dashboard-music-station-orbit__label block text-[13px] font-black uppercase leading-none tracking-[0] ${
                                  isActiveStation
                                    ? "text-amber-50"
                                    : "text-cyan-50"
                                }`}
                              >
                                {station.label}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
            <Link
              aria-label="Open AI companion and coach messages"
              className="dashboard-profile-quick-action dashboard-profile-quick-action--center dashboard-profile-quick-action--messages"
              data-dashboard-tooltip="Messages"
              href={ROUTES.dashboard.coachMessaging}
              onClick={() =>
                markDashboardDestinationVisited(
                  ROUTES.dashboard.coachMessaging,
                )
              }
              tabIndex={dashboardProfileActionsOpen ? 0 : -1}
            >
              <DashboardTabIcon className="h-3.5 w-3.5" name="Messages" />
            </Link>
            <Link
              aria-label="Open AI companion tutorial, FAQ, and next steps"
              className="dashboard-profile-quick-action dashboard-profile-quick-action--right dashboard-profile-quick-action--help"
              data-dashboard-tooltip="Tutorial, FAQ, and what to do next"
              href={ROUTES.dashboard.help}
              onClick={() =>
                markDashboardDestinationVisited(ROUTES.dashboard.help)
              }
              tabIndex={dashboardProfileActionsOpen ? 0 : -1}
            >
              <DashboardTabIcon className="h-3.5 w-3.5" name="Question" />
            </Link>
          </div>
        </div>
      </div>
      <div
        className="dashboard-header-meter-menu-shell"
        ref={dashboardHeaderMeterMenuRef}
      >
        <button
          aria-controls="dashboard-header-meter-panel"
          aria-expanded={dashboardHeaderMeterMenuOpen}
          aria-label={
            dashboardHeaderMeterMenuOpen
              ? "Close header meter menu"
              : "Open header meter menu"
          }
          className="dashboard-header-meter-menu-trigger"
          data-dashboard-tooltip="Meters"
          onClick={() => {
            setDashboardProfileHubOpen(false);
            setDashboardProfileActionsOpen(false);
            setDashboardPointsDropdownOpen(false);
            setDashboardMusicDropdownOpen(false);
            setDashboardHeaderMeterMenuOpen((open) => !open);
          }}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="dashboard-header-meter-menu-trigger__icon"
            viewBox="0 0 48 48"
          >
            <path
              d="M13 35V21m11 14V12m11 23V18"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="4"
            />
            <path
              d="M9 38h30"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="3"
            />
          </svg>
          <span aria-hidden="true" className="dashboard-header-meter-menu-trigger__pulse" />
        </button>

        {dashboardHeaderMeterMenuOpen && typeof document !== "undefined"
          ? createPortal(
          <aside
            aria-label="Stacked dashboard meters"
            className="dashboard-header-meter-panel"
            id="dashboard-header-meter-panel"
            role="region"
          >
            <div className="dashboard-header-meter-panel__heading">
              <div>
                <div className="dashboard-header-meter-panel__eyebrow">
                  Meter Stack
                </div>
                <div className="dashboard-header-meter-panel__title">
                  Training Signals
                </div>
              </div>
              <button
                aria-label="Close meter menu"
                className="dashboard-header-meter-panel__close"
                onClick={() => setDashboardHeaderMeterMenuOpen(false)}
                type="button"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path
                    d="m7 7 10 10M17 7 7 17"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="2.4"
                  />
                </svg>
              </button>
            </div>

            <div className="dashboard-header-category-levels-menu">
              <div className="dashboard-header-category-levels-menu__summary">
                <span className="dashboard-header-category-levels-menu__summary-copy">
                  <span>Category Levels</span>
                  <span>All movement rings</span>
                </span>
                <span
                  aria-hidden="true"
                  className="dashboard-header-category-levels-menu__summary-count"
                >
                  {dashboardHeaderCategoryLevels.length}
                </span>
              </div>

              <div
                aria-label="Drag or scroll through category level animations"
                className="dashboard-header-category-levels-menu__orbit"
                id="dashboard-header-category-levels-orbit"
                onClickCapture={(event) => {
                  if (dashboardHeaderCategoryLevelPointerMovedRef.current) {
                    event.preventDefault();
                    event.stopPropagation();
                    dashboardHeaderCategoryLevelPointerMovedRef.current = false;
                  }
                }}
                onKeyDown={(event) =>
                  handleDashboardOrbitKeyDown(
                    event,
                    rotateDashboardHeaderCategoryLevels,
                  )
                }
                onPointerCancel={(event) => {
                  dashboardHeaderCategoryLevelPointerStartRef.current = null;
                  if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
                    event.currentTarget.releasePointerCapture?.(event.pointerId);
                  }
                }}
                onPointerDown={(event) =>
                  handleDashboardOrbitPointerDown(
                    event,
                    dashboardHeaderCategoryLevelPointerStartRef,
                    dashboardHeaderCategoryLevelPointerMovedRef,
                  )
                }
                onPointerMove={(event) =>
                  handleDashboardOrbitPointerMove(
                    event,
                    dashboardHeaderCategoryLevelPointerStartRef,
                    dashboardHeaderCategoryLevelPointerMovedRef,
                    rotateDashboardHeaderCategoryLevels,
                    24,
                  )
                }
                onPointerUp={(event) =>
                  handleDashboardOrbitPointerUp(
                    event,
                    dashboardHeaderCategoryLevelPointerStartRef,
                    dashboardHeaderCategoryLevelPointerMovedRef,
                    rotateDashboardHeaderCategoryLevels,
                    setDashboardHeaderCategoryLevelActiveIndex,
                  )
                }
                onWheel={handleDashboardHeaderCategoryLevelWheel}
                role="group"
                tabIndex={0}
              >
                {dashboardHeaderCategoryLevels.map((categoryLevel, index) => {
                  const categoryLevelNumber = Math.max(
                    1,
                    Math.round(categoryLevel.level / 10),
                  );
                  const categoryLevelSlot =
                    getDashboardHeaderCategoryLevelSlot(index);
                  const isActiveCategoryLevel = categoryLevelSlot === "center";

                  return (
                    <button
                      aria-label={`${categoryLevel.label}, level ${categoryLevelNumber}, ${categoryLevel.level}% progress`}
                      aria-pressed={isActiveCategoryLevel}
                      className={`dashboard-header-category-levels-menu__item dashboard-header-category-levels-menu__item--slot-${categoryLevelSlot}`}
                      data-dashboard-orbit-card-index={index}
                      key={`dashboard-header-category-levels-menu-${categoryLevel.id}`}
                      onClick={() =>
                        setDashboardHeaderCategoryLevelActiveIndex(index)
                      }
                      style={
                        {
                          "--dashboard-header-category-color":
                            categoryLevel.color,
                          "--dashboard-header-category-level": `${categoryLevel.level}%`,
                        } as CSSProperties
                      }
                      tabIndex={isActiveCategoryLevel ? 0 : -1}
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        className={`dashboard-header-category-levels-menu__actor dashboard-header-category-actor dashboard-header-category-actor--${categoryLevel.id}`}
                      >
                        <span className="dashboard-header-category-actor__meter">
                          <span />
                        </span>
                        {renderDashboardHeaderCategoryActorFigure()}
                      </span>
                      <span className="dashboard-header-category-levels-menu__item-copy">
                        <span className="dashboard-header-category-levels-menu__item-title">
                          <span>{categoryLevel.label}</span>
                          <span className="dashboard-header-category-levels-menu__level-text">
                            LV {categoryLevelNumber}
                          </span>
                        </span>
                        <span className="dashboard-header-category-levels-menu__item-meta">
                          {categoryLevel.level}% progress
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              aria-label="Drag or scroll through dashboard meter groups"
              className="dashboard-header-meter-panel__stack dashboard-header-meter-panel__stack--orbit"
              onClickCapture={(event) => {
                if (dashboardHeaderMeterPanelPointerMovedRef.current) {
                  event.preventDefault();
                  event.stopPropagation();
                  dashboardHeaderMeterPanelPointerMovedRef.current = false;
                }
              }}
              onKeyDown={(event) =>
                handleDashboardOrbitKeyDown(
                  event,
                  rotateDashboardHeaderMeterPanelSections,
                )
              }
              onPointerCancel={(event) => {
                dashboardHeaderMeterPanelPointerStartRef.current = null;
                if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
                  event.currentTarget.releasePointerCapture?.(event.pointerId);
                }
              }}
              onPointerDown={(event) =>
                handleDashboardOrbitPointerDown(
                  event,
                  dashboardHeaderMeterPanelPointerStartRef,
                  dashboardHeaderMeterPanelPointerMovedRef,
                )
              }
              onPointerMove={(event) =>
                handleDashboardOrbitPointerMove(
                  event,
                  dashboardHeaderMeterPanelPointerStartRef,
                  dashboardHeaderMeterPanelPointerMovedRef,
                  rotateDashboardHeaderMeterPanelSections,
                  38,
                )
              }
              onPointerUp={(event) =>
                handleDashboardOrbitPointerUp(
                  event,
                  dashboardHeaderMeterPanelPointerStartRef,
                  dashboardHeaderMeterPanelPointerMovedRef,
                  rotateDashboardHeaderMeterPanelSections,
                  setDashboardHeaderMeterPanelActiveIndex,
                )
              }
              onWheel={handleDashboardHeaderMeterPanelWheel}
              role="group"
              tabIndex={0}
            >
              <section
                aria-label="Achievements and compound PR meters"
                className={`dashboard-header-meter-panel__section dashboard-header-meter-panel__section--slot-${getDashboardHeaderMeterPanelSectionSlot(
                  0,
                )}`}
                data-dashboard-orbit-card-index={0}
              >
                <div className="dashboard-header-meter-panel__section-label">
                  Achievements + PR
                </div>
                <div
                  aria-label={`Compound lift PR meter. ${dashboardSummary.compoundLiftHighlights
                    .map(
                      (highlight) =>
                        `${highlight.rank}. ${highlight.detail}: ${highlight.label}, ${highlight.windowLabel}, ${highlight.volumeLabel} relative volume, ${highlight.setsLabel} total sets completed`,
                    )
                    .join(". ")}`}
                  className="dashboard-header-compound-pr-meter dashboard-header-meter-panel__wide-meter text-cyan-50"
                  data-dashboard-tooltip="Compound PR meter: 30 day best weight and date"
                  role="group"
                  style={
                    {
                      "--dashboard-header-pr-progress": `${dashboardSummary.prProgress}%`,
                    } as CSSProperties
                  }
                >
                  <span className="dashboard-header-compound-pr-meter__header">
                    <span
                      aria-hidden="true"
                      className="dashboard-header-compound-pr-meter__badge"
                    >
                      PR
                    </span>
                    <span className="dashboard-header-compound-pr-meter__heading-copy">
                      <span className="dashboard-header-compound-pr-meter__eyebrow">
                        30 Day Best
                      </span>
                      <span className="dashboard-header-compound-pr-meter__heading">
                        Compound Lifts
                      </span>
                    </span>
                  </span>
                  <div
                    aria-label="Drag or scroll through 30 day compound PR cards"
                    className="dashboard-header-compound-pr-meter__orbiter"
                    onClickCapture={(event) => {
                      if (dashboardHeaderPrPointerMovedRef.current) {
                        event.preventDefault();
                        event.stopPropagation();
                        dashboardHeaderPrPointerMovedRef.current = false;
                      }
                    }}
                    onKeyDown={(event) =>
                      handleDashboardOrbitKeyDown(
                        event,
                        rotateDashboardHeaderPrCards,
                      )
                    }
                    onPointerCancel={(event) => {
                      dashboardHeaderPrPointerStartRef.current = null;
                      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
                        event.currentTarget.releasePointerCapture?.(
                          event.pointerId,
                        );
                      }
                    }}
                    onPointerDown={(event) =>
                      handleDashboardOrbitPointerDown(
                        event,
                        dashboardHeaderPrPointerStartRef,
                        dashboardHeaderPrPointerMovedRef,
                      )
                    }
                    onPointerMove={(event) =>
                      handleDashboardOrbitPointerMove(
                        event,
                        dashboardHeaderPrPointerStartRef,
                        dashboardHeaderPrPointerMovedRef,
                        rotateDashboardHeaderPrCards,
                        34,
                      )
                    }
                    onPointerUp={(event) =>
                      handleDashboardOrbitPointerUp(
                        event,
                        dashboardHeaderPrPointerStartRef,
                        dashboardHeaderPrPointerMovedRef,
                        rotateDashboardHeaderPrCards,
                        setDashboardHeaderPrActiveIndex,
                      )
                    }
                    onWheel={handleDashboardHeaderPrWheel}
                    role="group"
                    tabIndex={0}
                  >
                    <span className="dashboard-header-compound-pr-meter__list">
                      {dashboardSummary.compoundLiftHighlights.map(
                        (highlight, index) => {
                          const prCardSlot = getDashboardHeaderPrCardSlot(index);
                          const isActivePrCard = prCardSlot === "center";

                          return (
                            <button
                              aria-label={`${highlight.detail}: ${highlight.label}, ${highlight.windowLabel}, ${highlight.volumeLabel} relative volume, ${highlight.setsLabel} total sets completed`}
                              aria-pressed={isActivePrCard}
                              className={`dashboard-header-compound-pr-meter__item dashboard-header-compound-pr-meter__item--${highlight.tone} dashboard-header-compound-pr-meter__item--slot-${prCardSlot}`}
                              data-dashboard-orbit-card-index={index}
                              key={`dashboard-header-meter-panel-compound-pr-${highlight.tone}`}
                              onClick={() =>
                                setDashboardHeaderPrActiveIndex(index)
                              }
                              tabIndex={isActivePrCard ? 0 : -1}
                              type="button"
                            >
                              <span className="dashboard-header-compound-pr-meter__rank">
                                {highlight.rank}
                              </span>
                              <span className="dashboard-header-compound-pr-meter__copy">
                                <span className="dashboard-header-compound-pr-meter__title">
                                  {highlight.label}
                                </span>
                                <span className="dashboard-header-compound-pr-meter__detail">
                                  {highlight.detail}
                                </span>
                                <span className="dashboard-header-compound-pr-meter__stats">
                                  <span className="dashboard-header-compound-pr-meter__stat">
                                    <span className="dashboard-header-compound-pr-meter__stat-label">
                                      Volume %
                                    </span>
                                    <span className="dashboard-header-compound-pr-meter__stat-value">
                                      {highlight.volumeLabel}
                                    </span>
                                  </span>
                                  <span className="dashboard-header-compound-pr-meter__stat">
                                    <span className="dashboard-header-compound-pr-meter__stat-label">
                                      Sets
                                    </span>
                                    <span className="dashboard-header-compound-pr-meter__stat-value">
                                      {highlight.setsLabel}
                                    </span>
                                  </span>
                                </span>
                              </span>
                              <span
                                aria-label={`${highlight.detail} trend ${highlight.value}`}
                                className="dashboard-header-compound-pr-meter__value"
                              >
                                {highlight.value}
                              </span>
                            </button>
                          );
                        },
                      )}
                    </span>
                  </div>
                </div>

                <Link
                  aria-label={`Open achievements, ${headerAchievementsEarned} of ${headerAchievementTotal} earned, ${Math.round(
                    headerAchievementProgress,
                  )}% progress`}
                  className={`dashboard-header-achievement-cloud-trigger dashboard-header-achievement-meter dashboard-header-achievement-meter--standalone ${
                    dashboardHeaderAchievementRevealActive
                      ? "dashboard-header-achievement-cloud-trigger--revealing"
                      : ""
                  } dashboard-header-meter-panel__wide-meter text-amber-50`}
                  data-dashboard-tooltip={`Achievements: ${headerAchievementsEarned}/${headerAchievementTotal} earned${
                    headerAchievementNext
                      ? `, next ${headerAchievementNext.label}`
                      : ""
                  }. ${activeHeaderAchievementEstimate.fullLabel}`}
                  href={ROUTES.dashboard.achievements}
                  onClick={openDashboardAchievementsFromHeader}
                >
                  <span
                    aria-hidden="true"
                    className="dashboard-header-achievement-cloud-trigger__light"
                  />
                  <span
                    aria-hidden="true"
                    className="dashboard-header-achievement-cloud-trigger__menu-flash"
                  />
                  <span
                    aria-hidden="true"
                    className="dashboard-header-achievement-cloud-trigger__clouds"
                  >
                    <span />
                    <span />
                    <span />
                    <span />
                  </span>
                  <span
                    aria-label={`${Math.round(headerAchievementProgress)} percent achievement progress`}
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={Math.round(headerAchievementProgress)}
                    className="dashboard-header-achievement-meter__progress-shell"
                    role="meter"
                    style={
                      {
                        "--dashboard-header-achievement-progress": `${headerAchievementProgress}%`,
                        "--dashboard-header-achievement-active-duration": `${DASHBOARD_HEADER_ACHIEVEMENT_ROTATE_MS}ms`,
                      } as CSSProperties
                    }
                  >
                    <span
                      aria-hidden="true"
                      className="dashboard-header-achievement-meter__track"
                    />
                    <span
                      aria-hidden="true"
                      className="dashboard-header-achievement-meter__progress-list"
                    >
                      {activeHeaderAchievement ? (
                        <span
                          aria-hidden="true"
                          className="dashboard-header-achievement-meter__progress-item"
                          key={`dashboard-header-meter-panel-achievement-${activeHeaderAchievement.label}`}
                          style={
                            {
                              "--dashboard-header-achievement-item-progress": `${activeHeaderAchievementProgress}%`,
                            } as CSSProperties
                          }
                        >
                          <span className="dashboard-header-achievement-meter__progress-icon">
                            {activeHeaderAchievement.icon}
                          </span>
                          <span className="dashboard-header-achievement-meter__progress-copy">
                            <span className="dashboard-header-achievement-meter__progress-title">
                              {activeHeaderAchievement.label}
                            </span>
                            <span className="dashboard-header-achievement-meter__progress-meta">
                              <span>
                                {Math.round(activeHeaderAchievementProgress)}%{" "}
                                {activeHeaderAchievement.statusLabel}
                              </span>
                              <span>{activeHeaderAchievementEstimate.label}</span>
                            </span>
                            <span className="dashboard-header-achievement-meter__progress-bar">
                              <span />
                            </span>
                          </span>
                        </span>
                      ) : null}
                    </span>
                  </span>
                </Link>
              </section>

              <section
                aria-label="Daily sets and plan session meters"
                className={`dashboard-header-meter-panel__section dashboard-header-meter-panel__section--slot-${getDashboardHeaderMeterPanelSectionSlot(
                  1,
                )}`}
                data-dashboard-orbit-card-index={1}
              >
                <div className="dashboard-header-meter-panel__section-label">
                  Daily + Plan
                </div>
                <div
                  aria-label={`${dashboardSummary.dailySets} daily sets out of ${dashboardSummary.dailySetGoal} target sets. ${dashboardSummary.dailySetGroupSummary}`}
                  aria-valuemax={dashboardSummary.dailySetGoal}
                  aria-valuemin={0}
                  aria-valuenow={Math.min(
                    dashboardSummary.dailySets,
                    dashboardSummary.dailySetGoal,
                  )}
                  className="dashboard-header-sets-meter dashboard-header-sets-meter--standalone dashboard-header-meter-panel__compact-meter text-emerald-50"
                  data-dashboard-tooltip={`${dashboardSummary.dailySets} daily sets. ${dashboardSummary.dailySetGroupSummary}`}
                  role="meter"
                >
                  <span className="dashboard-header-sets-meter__tower">
                    <span className="dashboard-header-sets-meter__tallies">
                      {dashboardSummary.dailySetTallyMarks.map(
                        (mark, markIndex) => (
                          <span
                            aria-hidden="true"
                            className={`dashboard-header-sets-meter__tally dashboard-header-sets-meter__tally--${mark.group} ${
                              mark.filled
                                ? "dashboard-header-sets-meter__tally--filled"
                                : "dashboard-header-sets-meter__tally--empty"
                            }`}
                            key={`dashboard-header-meter-panel-daily-set-tally-${mark.id}-${markIndex}`}
                          />
                        ),
                      )}
                    </span>
                  </span>
                  <span className="dashboard-header-sets-meter__value">
                    {dashboardSummary.dailySets}
                  </span>
                  <span className="dashboard-header-sets-meter__label">
                    Daily Sets
                  </span>
                  <span className="dashboard-header-meter-deadline dashboard-header-meter-deadline--sets">
                    Goal {dashboardSummary.dailySetGoal}
                  </span>
                </div>

                <div
                  aria-label="Header progress meters"
                  className={`dashboard-header-meter-scroller ${
                    dashboardHeaderMeterRailActive
                      ? "dashboard-header-meter-scroller--rail-active"
                      : ""
                  }`}
                >
                  <div className="dashboard-header-meter-scroller__track">
                    <div
                      aria-label={`${dashboardSummary.workoutsThisWeek} of ${dashboardSummary.weeklySessionGoal} weekly sessions logged, resets ${dashboardWeeklySessionResetFullLabel}`}
                      aria-valuemax={dashboardSummary.weeklySessionGoal}
                      aria-valuemin={0}
                      aria-valuenow={Math.min(
                        dashboardSummary.workoutsThisWeek,
                        dashboardSummary.weeklySessionGoal,
                      )}
                      className={`dashboard-header-week-sessions dashboard-header-meter-scroller__meter dashboard-header-meter-scroller__meter--${getDashboardHeaderMeterSlot(
                        1,
                      )} text-emerald-50`}
                      data-dashboard-tooltip={`${dashboardSummary.workoutsThisWeek} of ${dashboardSummary.weeklySessionGoal} weekly sessions logged. Resets ${dashboardWeeklySessionResetFullLabel}`}
                      role="meter"
                      style={
                        {
                          "--dashboard-week-session-bar": `${dashboardSummary.weeklySessionProgress}%`,
                        } as CSSProperties
                      }
                    >
                      <span
                        aria-hidden="true"
                        className="dashboard-header-week-sessions__graph"
                      >
                        <span
                          className={`dashboard-header-week-sessions__bar ${
                            dashboardSummary.workoutsThisWeek > 0
                              ? "dashboard-header-week-sessions__bar--active"
                              : ""
                          }`}
                        >
                          <span className="dashboard-header-week-sessions__fill" />
                          <span
                            aria-hidden="true"
                            className="dashboard-header-week-sessions__goal-lines"
                          >
                            {Array.from(
                              { length: dashboardSummary.weeklySessionGoal },
                              (_, goalIndex) => (
                                <span
                                  className={`dashboard-header-week-sessions__goal-section ${
                                    goalIndex < dashboardSummary.workoutsThisWeek
                                      ? "dashboard-header-week-sessions__goal-section--filled"
                                      : ""
                                  }`}
                                  data-session-level={goalIndex + 1}
                                  key={`meter-panel-weekly-session-goal-section-${goalIndex + 1}`}
                                  style={
                                    {
                                      "--dashboard-week-session-section-bottom": `${
                                        (goalIndex /
                                          dashboardSummary.weeklySessionGoal) *
                                        100
                                      }%`,
                                      "--dashboard-week-session-section-height": `${
                                        100 /
                                        dashboardSummary.weeklySessionGoal
                                      }%`,
                                    } as CSSProperties
                                  }
                                />
                              ),
                            )}
                          </span>
                        </span>
                        <span
                          aria-hidden="true"
                          className="dashboard-header-week-sessions__opening-sheen"
                        />
                      </span>
                      <span className="dashboard-header-week-sessions__label">
                        Sessions / Week
                      </span>
                      <span
                        aria-label={`Weekly session reset ${dashboardWeeklySessionResetFullLabel}`}
                        className="dashboard-header-meter-deadline dashboard-header-meter-deadline--week"
                      >
                        Reset {dashboardWeeklySessionResetLabel}
                      </span>
                    </div>

                    <div
                      aria-label={`${dashboardPlanAttendanceDescription}, ${dashboardPlanSessionsRemaining} sessions remaining`}
                      aria-valuemax={dashboardSummary.planSessionTarget}
                      aria-valuemin={0}
                      aria-valuenow={dashboardPlanSessionsAttended}
                      className={`dashboard-header-plan-attendance dashboard-header-streak-fire dashboard-header-meter-scroller__meter dashboard-header-meter-scroller__meter--${getDashboardHeaderMeterSlot(
                        0,
                      )} text-amber-50`}
                      data-dashboard-tooltip={`${dashboardPlanAttendanceDescription}. ${dashboardPlanAttendanceCaption}.`}
                      role="meter"
                      style={
                        {
                          "--dashboard-header-plan-attendance-progress": `${dashboardSummary.planSessionProgress}%`,
                        } as CSSProperties
                      }
                    >
                      <span
                        aria-hidden="true"
                        className="dashboard-header-streak-fire__flame"
                      />
                      <span
                        aria-hidden="true"
                        className="dashboard-header-streak-fire__embers"
                      />
                      <span
                        aria-hidden="true"
                        className="dashboard-header-streak-fire__gauge"
                      >
                        <svg
                          aria-hidden="true"
                          className="dashboard-header-streak-fire__gauge-svg"
                          viewBox="0 0 96 96"
                        >
                          <circle
                            cx="48"
                            cy="48"
                            fill="rgba(2,6,23,0.42)"
                            r="41"
                            stroke="rgba(224,242,254,0.08)"
                            strokeWidth="1"
                          />
                          <circle
                            cx="48"
                            cy="48"
                            fill="none"
                            pathLength={100}
                            r="35.5"
                            stroke="rgba(15,23,42,0.78)"
                            strokeWidth="10"
                          />
                          <circle
                            className="dashboard-header-plan-attendance__progress-ring"
                            cx="48"
                            cy="48"
                            fill="none"
                            pathLength={100}
                            r="35.5"
                            stroke="url(#dashboardHeaderPanelPlanAttendanceGradient)"
                            strokeDasharray="100"
                            strokeDashoffset={
                              100 - dashboardSummary.planSessionProgress
                            }
                            strokeLinecap="round"
                            strokeWidth="10"
                            transform="rotate(-90 48 48)"
                          />
                          {Array.from({
                            length: dashboardSummary.planSessionTarget,
                          }).map((_, tickIndex) => {
                            const tickAngle =
                              tickIndex *
                              (360 / dashboardSummary.planSessionTarget);
                            const isFilledTick =
                              tickIndex < dashboardPlanSessionsAttended;

                            return (
                              <line
                                key={`dashboard-header-meter-panel-plan-attendance-tick-${tickIndex}`}
                                stroke={
                                  isFilledTick
                                    ? "rgba(254,240,138,0.92)"
                                    : "rgba(148,163,184,0.36)"
                                }
                                strokeLinecap="round"
                                strokeWidth={isFilledTick ? 2.1 : 1.25}
                                transform={`rotate(${tickAngle} 48 48)`}
                                x1="48"
                                x2="48"
                                y1="7"
                                y2={isFilledTick ? "18" : "15"}
                              />
                            );
                          })}
                          <circle
                            cx="48"
                            cy="48"
                            fill="rgba(2,6,23,0.86)"
                            r="25.5"
                            stroke="rgba(125,211,252,0.26)"
                            strokeWidth="1.4"
                          />
                          <circle
                            cx="48"
                            cy="48"
                            fill="none"
                            r="30"
                            stroke="rgba(255,255,255,0.12)"
                            strokeDasharray="1.6 5.2"
                            strokeLinecap="round"
                            strokeWidth="1"
                          />
                          <circle
                            className="dashboard-header-plan-attendance__spark"
                            cx="48"
                            cy="12.5"
                            fill="rgb(250,204,21)"
                            opacity={dashboardPlanSessionsAttended > 0 ? 1 : 0}
                            r="3.2"
                            stroke="rgba(254,249,195,0.9)"
                            strokeWidth="1"
                            transform={`rotate(${
                              dashboardSummary.planSessionProgress * 3.6
                            } 48 48)`}
                          />
                          <defs>
                            <linearGradient
                              id="dashboardHeaderPanelPlanAttendanceGradient"
                              x1="14"
                              x2="82"
                              y1="82"
                              y2="14"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop offset="0%" stopColor="rgb(34,211,238)" />
                              <stop offset="42%" stopColor="rgb(52,211,153)" />
                              <stop offset="72%" stopColor="rgb(250,204,21)" />
                              <stop offset="100%" stopColor="rgb(250,204,21)" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </span>
                      <span className="dashboard-header-streak-fire__content">
                        <span className="dashboard-header-streak-fire__value">
                          {`${dashboardPlanSessionsAttended}/${dashboardSummary.planSessionTarget}`}
                        </span>
                        <span className="dashboard-header-streak-fire__label">
                          Plan Sessions
                        </span>
                      </span>
                      <span
                        aria-label={dashboardPlanAttendanceDescription}
                        className="dashboard-header-meter-deadline dashboard-header-meter-deadline--streak"
                      >
                        {dashboardPlanAttendanceCaption}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section
                aria-label="Fuel and body meters"
                className={`dashboard-header-meter-panel__section dashboard-header-meter-panel__section--slot-${getDashboardHeaderMeterPanelSectionSlot(
                  2,
                )}`}
                data-dashboard-orbit-card-index={2}
              >
                <div className="dashboard-header-meter-panel__section-label">
                  Fuel + Body
                </div>
                <div className="dashboard-header-fuel-meters">
                  <div
                    aria-label={`${dashboardSummary.weeklyCaloriesDisplay} total weekly calories`}
                    aria-valuemax={dashboardSummary.weeklyCaloriesGoal}
                    aria-valuemin={0}
                    aria-valuenow={dashboardSummary.weeklyCalories}
                    className="dashboard-header-fuel-meter dashboard-header-fuel-meter--calories"
                    data-dashboard-tooltip={`${dashboardSummary.weeklyCaloriesDisplay} total weekly calories`}
                    role="meter"
                    style={
                      {
                        "--dashboard-header-fuel-progress": `${dashboardSummary.weeklyCaloriesProgress}%`,
                      } as CSSProperties
                    }
                  >
                    <span
                      aria-hidden="true"
                      className="dashboard-header-fuel-meter__ring"
                    >
                      <span className="dashboard-header-fuel-meter__value">
                        {dashboardSummary.weeklyCaloriesDisplay}
                      </span>
                    </span>
                    <span className="dashboard-header-fuel-meter__label">
                      Weekly Calories
                    </span>
                    <span className="dashboard-header-fuel-meter__meta">
                      Total Week
                    </span>
                  </div>

                  <div
                    aria-label={`Weight change ${dashboardSummary.weightChangeLabel}, ${dashboardSummary.weightChangeTrendLabel}`}
                    aria-valuemax={5}
                    aria-valuemin={-5}
                    aria-valuenow={Number(
                      dashboardSummary.weightChange.toFixed(1),
                    )}
                    className={`dashboard-header-fuel-meter dashboard-header-fuel-meter--weight dashboard-header-fuel-meter--${dashboardSummary.weightChangeTone}`}
                    data-dashboard-tooltip={`Weight change ${dashboardSummary.weightChangeLabel}. ${dashboardSummary.weightChangeTrendLabel}`}
                    role="meter"
                    style={
                      {
                        "--dashboard-header-fuel-progress": `${dashboardSummary.weightChangeProgress}%`,
                      } as CSSProperties
                    }
                  >
                    <span
                      aria-hidden="true"
                      className="dashboard-header-fuel-meter__ring"
                    >
                      <span className="dashboard-header-fuel-meter__value">
                        {dashboardSummary.weightChangeLabel}
                      </span>
                    </span>
                    <span className="dashboard-header-fuel-meter__label">
                      Weight +/-
                    </span>
                    <span className="dashboard-header-fuel-meter__meta">
                      {dashboardSummary.weightChangeTrendLabel}
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </aside>,
              document.body,
            )
          : null}
      </div>
      </div>
      <div
        aria-label={`Dashboard chyron with coaching advice, athlete quotes, and training trivia for ${activeDashboardHeaderLink.label}. Current headline: ${dashboardHeaderNewsHeadlines[0]?.label || ""}. ${dashboardPlanAttendanceDescription}.`}
        className="dashboard-header-news-chyron"
      >
        <span aria-hidden="true" className="dashboard-header-news-chyron__gems">
          <span className="dashboard-header-news-chyron__gem dashboard-header-news-chyron__gem--one" />
          <span className="dashboard-header-news-chyron__gem dashboard-header-news-chyron__gem--two" />
          <span className="dashboard-header-news-chyron__gem dashboard-header-news-chyron__gem--three" />
          <span className="dashboard-header-news-chyron__gem dashboard-header-news-chyron__gem--rock" />
          <span className="dashboard-header-news-chyron__gem dashboard-header-news-chyron__gem--five" />
        </span>
        <span className="dashboard-header-news-chyron__label">SOUND</span>
        <span aria-hidden="true" className="dashboard-header-news-chyron__light" />
        <div
          aria-hidden="true"
          className="dashboard-header-news-chyron__viewport"
        >
          <span
            className="dashboard-header-news-chyron__kicker"
            data-news-tone={dashboardHeaderNewsHeadlines[0]?.tone || "default"}
            ref={dashboardHeaderNewsKickerRef}
          >
            {dashboardHeaderNewsHeadlines[0]?.category}
          </span>
          <span className="dashboard-header-news-chyron__divider" />
          <div className="dashboard-header-news-chyron__track">
            <span
              className="dashboard-header-news-chyron__item"
              data-news-tone={dashboardHeaderNewsHeadlines[0]?.tone || "default"}
              ref={dashboardHeaderNewsHeadlineRef}
            >
              {dashboardHeaderNewsHeadlines[0]?.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFavoriteWorkoutsCard = () => (
    <section className="relative z-10 mx-auto w-full max-w-[1080px] overflow-hidden rounded-[24px] border border-cyan-200/16 bg-[linear-gradient(135deg,rgba(15,23,42,0.68),rgba(2,6,23,0.54)),radial-gradient(circle_at_8%_0%,rgba(34,211,238,0.13),transparent_32%)] p-2.5 shadow-2xl shadow-black/15 backdrop-blur sm:p-3">
      <div className="flex flex-col gap-2 min-[760px]:flex-row min-[760px]:items-center">
        <div className="flex shrink-0 items-center justify-between gap-3 min-[760px]:w-[190px] min-[760px]:flex-col min-[760px]:items-start">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
              Favorite Workouts
            </div>
            <p className="mt-1 text-[11px] font-semibold text-slate-400">
              Fast launch saved sessions.
            </p>
          </div>
          <div className="hidden gap-1.5 min-[760px]:flex">
            <button
              aria-label="Scroll favorite workouts left"
              className="grid h-7 w-7 place-items-center rounded-xl border border-white/10 bg-slate-950/55 text-xs font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
              onClick={() => scrollFavoriteWorkouts("left")}
              type="button"
            >
              &lt;
            </button>
            <button
              aria-label="Scroll favorite workouts right"
              className="grid h-7 w-7 place-items-center rounded-xl border border-white/10 bg-slate-950/55 text-xs font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
              onClick={() => scrollFavoriteWorkouts("right")}
              type="button"
            >
              &gt;
            </button>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex justify-end gap-2 min-[760px]:hidden">
            <button
              aria-label="Scroll favorite workouts left"
              className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-slate-950/55 text-xs font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
              onClick={() => scrollFavoriteWorkouts("left")}
              type="button"
            >
              &lt;
            </button>
            <button
              aria-label="Scroll favorite workouts right"
              className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-slate-950/55 text-xs font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
              onClick={() => scrollFavoriteWorkouts("right")}
              type="button"
            >
              &gt;
            </button>
          </div>

          <div
            ref={favoriteWorkoutStripRef}
            className="flex max-w-full snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-1 scroll-smooth [scrollbar-color:rgba(34,211,238,0.38)_rgba(15,23,42,0.72)] [scrollbar-width:thin] [touch-action:pan-x] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/42 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/70"
          >
            {favoriteWorkoutTemplates.map((template) => {
              const isActive = activeSessionTemplate?.id === template.id;
              const exerciseCount = template.exercises.length;

              return (
                <Link
                  className={`group flex h-[72px] min-w-[220px] snap-start items-center gap-2.5 rounded-[18px] border p-2.5 transition hover:-translate-y-0.5 active:scale-[0.99] ${
                    isActive
                      ? "border-cyan-200/55 bg-cyan-300/14 shadow-[0_0_28px_rgba(34,211,238,0.18)]"
                      : "border-white/10 bg-slate-950/52 hover:border-cyan-200/35 hover:bg-cyan-300/8"
                  }`}
                  href={
                    isActive
                      ? ROUTES.dashboard.sessionWorkout
                      : buildTemplateWorkoutHref(template.id)
                  }
                  key={template.id}
                  onClick={() => {
                    if (!isActive) {
                      launchFavoriteWorkout(template);
                    }
                  }}
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border text-lg ${
                      isActive
                        ? "border-cyan-100/45 bg-cyan-300/16 text-cyan-50"
                        : "border-white/10 bg-white/[0.045] text-slate-100 group-hover:border-cyan-200/28 group-hover:bg-cyan-300/10"
                    }`}
                    aria-hidden="true"
                  >
                    {getWorkoutTemplateIcon(template)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-black text-white">
                        {template.title}
                      </span>
                      <span className="shrink-0 text-amber-200" aria-hidden="true">
                        *
                      </span>
                    </span>
                    <span className="mt-1 flex min-w-0 items-center gap-1.5">
                      <span className="max-w-[92px] truncate rounded-full border border-cyan-200/18 bg-cyan-300/8 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-cyan-100">
                        {getWorkoutTemplateTag(template)}
                      </span>
                      <span className="truncate text-[10px] font-bold text-slate-500">
                        {exerciseCount} move{exerciseCount === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span
                      className={`mt-1.5 inline-flex rounded-full border px-2.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] ${
                        isActive
                          ? "border-emerald-200/35 bg-emerald-300/12 text-emerald-100"
                          : "border-white/10 bg-white/[0.04] text-slate-300 group-hover:border-cyan-200/28 group-hover:text-cyan-100"
                      }`}
                    >
                      {isActive ? "Resume" : "Quick Start"}
                    </span>
                  </span>
                </Link>
              );
            })}

            <Link
              className="group flex h-[72px] min-w-[168px] snap-start items-center gap-2.5 rounded-[18px] border border-dashed border-cyan-200/24 bg-cyan-300/6 p-2.5 transition hover:-translate-y-0.5 hover:border-cyan-200/48 hover:bg-cyan-300/10 active:scale-[0.99]"
              href={ROUTES.workoutBuilder.home}
            >
              <span
                className="grid h-10 w-10 place-items-center rounded-2xl border border-cyan-200/24 bg-slate-950/54 text-lg text-cyan-100"
                aria-hidden="true"
              >
                +
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black text-white">
                  Add Favorite
                </span>
                <span className="mt-1 block text-[10px] font-bold text-slate-500">
                  Save a builder template
                </span>
              </span>
            </Link>

            <Link
              className="group flex h-[72px] min-w-[168px] snap-start items-center gap-2.5 rounded-[18px] border border-white/10 bg-slate-950/45 p-2.5 transition hover:-translate-y-0.5 hover:border-amber-200/35 hover:bg-amber-300/8 active:scale-[0.99]"
              href={ROUTES.dashboard.sessionHistory}
            >
              <span
                className="grid h-10 w-10 place-items-center rounded-2xl border border-amber-200/20 bg-amber-300/8 text-base text-amber-100"
                aria-hidden="true"
              >
                R
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black text-white">
                  Recently Used
                </span>
                <span className="mt-1 block text-[10px] font-bold text-slate-500">
                  Open session history
                </span>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );

  const renderDashboardHeroAchievementOrbit = () => (
    <div className="relative z-10 mt-2 grid gap-3 min-[760px]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] min-[760px]:items-end">
      <div className="relative h-[210px] min-w-0 overflow-hidden px-0 pb-5 pt-0 sm:h-[214px]">
        <div className="flex h-full min-w-0 flex-col items-center justify-end gap-0">
          <div className="isolate order-2 relative h-[154px] w-[284px] max-w-full shrink-0 sm:h-[158px] sm:w-[296px]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-x-8 -bottom-7 -top-4 -z-10 overflow-hidden rounded-[44px]"
            >
              <span
                className="absolute inset-0"
                style={momentumStreakBackdropStyle}
              />
              <span
                className="absolute bottom-0 left-1/2 h-36 w-72 origin-bottom rounded-[50%] mix-blend-screen"
                style={momentumStreakFlameStyle}
              />
              <span
                className="absolute inset-x-8 bottom-6 h-24 rounded-[50%] mix-blend-screen"
                style={momentumStreakEmberStyle}
              />
            </div>
            <span className="pointer-events-none absolute inset-x-6 bottom-6 top-7 -z-10 rounded-full bg-cyan-400/12 blur-2xl" />
            <span className="pointer-events-none absolute bottom-4 left-1/2 -z-10 h-20 w-20 -translate-x-1/2 rounded-full bg-yellow-300/18 blur-2xl" />
            <svg
              aria-hidden="true"
              className="absolute inset-0 h-full w-full overflow-visible"
              viewBox="0 0 220 148"
            >
              <path
                d="M26 112 A84 84 0 0 1 194 112"
                fill="none"
                pathLength={100}
                stroke="rgba(148,163,184,0.16)"
                strokeLinecap="round"
                strokeWidth="22"
              />
              <path
                d="M34 112 A76 76 0 0 1 186 112"
                fill="none"
                pathLength={100}
                stroke="rgba(15,23,42,0.74)"
                strokeLinecap="round"
                strokeWidth="9"
              />
              <path
                d="M26 112 A84 84 0 0 1 194 112"
                fill="none"
                pathLength={100}
                stroke="rgba(255,255,255,0.15)"
                strokeLinecap="round"
                strokeWidth="2"
              />
              <path
                d="M26 112 A84 84 0 0 1 194 112"
                fill="none"
                pathLength={100}
                stroke="url(#dashboardMomentumGaugeGradient)"
                strokeDasharray="100"
                strokeDashoffset={100 - momentumMeterScore}
                strokeLinecap="round"
                strokeWidth="22"
                filter="url(#dashboardMomentumGaugeGlow)"
              />
              {Array.from({ length: 9 }).map((_, tickIndex) => {
                const tickAngle = -90 + tickIndex * 22.5;
                const isMajorTick = tickIndex % 2 === 0;

                return (
                  <line
                    key={`momentum-tick-${tickIndex}`}
                    stroke={
                      isMajorTick
                        ? "rgba(224,242,254,0.58)"
                        : "rgba(148,163,184,0.34)"
                    }
                    strokeLinecap="round"
                    strokeWidth={isMajorTick ? 2.2 : 1.4}
                    transform={`rotate(${tickAngle} 110 112)`}
                    x1="110"
                    x2="110"
                    y1={isMajorTick ? 30 : 34}
                    y2="42"
                  />
                );
              })}
              <g
                style={{
                  transform: `rotate(${momentumNeedleAngle}deg)`,
                  transformOrigin: "110px 112px",
                }}
              >
                <line
                  stroke="url(#dashboardMomentumNeedleGradient)"
                  strokeLinecap="round"
                  strokeWidth="5"
                  x1="110"
                  x2="110"
                  y1="112"
                  y2="48"
                  filter="url(#dashboardMomentumNeedleGlow)"
                />
                <line
                  stroke="rgba(236,254,255,0.82)"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                  x1="110"
                  x2="110"
                  y1="110"
                  y2="54"
                />
              </g>
              <circle
                cx={momentumMeterNeedleTipX}
                cy={momentumMeterNeedleTipY}
                fill="rgb(250,204,21)"
                r="7"
                stroke="rgba(254,249,195,0.92)"
                strokeWidth="2"
                filter="url(#dashboardMomentumNeedleGlow)"
              />
              <circle
                cx="110"
                cy="112"
                fill="rgba(2,6,23,0.96)"
                r="14"
                stroke="rgba(125,211,252,0.45)"
                strokeWidth="4"
              />
              <circle
                cx="110"
                cy="112"
                fill="rgba(14,165,233,0.20)"
                r="8"
                stroke="rgba(224,242,254,0.45)"
                strokeWidth="1.5"
              />
              <text
                fill="rgba(203,213,225,0.56)"
                fontSize="9"
                fontWeight="900"
                textAnchor="middle"
                x="31"
                y="133"
              >
                0
              </text>
              <text
                fill="rgba(203,213,225,0.56)"
                fontSize="9"
                fontWeight="900"
                textAnchor="middle"
                x="189"
                y="133"
              >
                {momentumStreakTarget}
              </text>
              <defs>
                <linearGradient
                  id="dashboardMomentumGaugeGradient"
                  x1="24"
                  x2="196"
                  y1="112"
                  y2="112"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="rgb(56,189,248)" />
                  <stop offset="38%" stopColor="rgb(45,212,191)" />
                  <stop offset="64%" stopColor="rgb(250,204,21)" />
                  <stop offset="84%" stopColor="rgb(249,115,22)" />
                  <stop offset="100%" stopColor="rgb(239,68,68)" />
                </linearGradient>
                <linearGradient
                  id="dashboardMomentumNeedleGradient"
                  x1="110"
                  x2="110"
                  y1="112"
                  y2="48"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="rgb(14,165,233)" />
                  <stop offset="55%" stopColor="rgb(224,242,254)" />
                  <stop offset="100%" stopColor="rgb(250,204,21)" />
                </linearGradient>
                <filter
                  id="dashboardMomentumGaugeGlow"
                  x="-20%"
                  y="-40%"
                  width="140%"
                  height="180%"
                >
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feColorMatrix
                    in="blur"
                    type="matrix"
                    values="0 0 0 0 0.18 0 0 0 0 0.82 0 0 0 0 0.95 0 0 0 0.58 0"
                  />
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter
                  id="dashboardMomentumNeedleGlow"
                  x="-80%"
                  y="-80%"
                  width="260%"
                  height="260%"
                >
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
            </svg>
            <div className="absolute inset-x-0 bottom-[52px] text-center">
              <div className="text-[3.35rem] font-black leading-none text-white drop-shadow-[0_0_18px_rgba(125,211,252,0.30)]">
                {momentumEntryStreak}
              </div>
              <div className="mt-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                Day Streak
              </div>
            </div>
            <div className="absolute inset-x-4 bottom-0 grid grid-cols-2 gap-1.5 text-center">
              <div
                aria-label={momentumSignalTitle}
                className="rounded-full border border-cyan-300/18 bg-slate-950/48 px-2 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                data-dashboard-tooltip={momentumSignalTitle}
              >
                <span className="block text-[7px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Signal
                </span>
                <span className="block truncate text-[9px] font-black uppercase tracking-[0.08em] text-cyan-100">
                  {momentumSignalLabel}
                </span>
              </div>
              <div className="rounded-full border border-yellow-300/20 bg-slate-950/48 px-2 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <span className="block text-[7px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Goal
                </span>
                <span className="block truncate text-[9px] font-black uppercase tracking-[0.08em] text-yellow-100">
                  {momentumGoalLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="order-1 min-w-0 self-stretch px-1 text-center">
            <div className="truncate text-[9px] font-black uppercase tracking-[0.14em] text-cyan-50">
              {momentumMeterCaption}
            </div>
            <p className="mt-1 line-clamp-1 text-[10px] font-bold leading-4 text-slate-100">
              {momentumPrompt}
            </p>
          </div>
        </div>
      </div>
      <div className="relative min-w-0 overflow-hidden rounded-[30px] pb-5 pt-2 before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-[30px] before:bg-[radial-gradient(ellipse_at_10%_12%,rgba(250,204,21,0.10),transparent_34%),radial-gradient(ellipse_at_92%_24%,rgba(34,211,238,0.12),transparent_38%),radial-gradient(ellipse_at_50%_58%,rgba(14,165,233,0.13),transparent_48%),radial-gradient(ellipse_at_50%_78%,rgba(2,6,23,0.36),transparent_76%)] before:[mask-image:radial-gradient(ellipse_at_center,black_0%,black_54%,rgba(0,0,0,0.58)_75%,transparent_100%)] before:content-['']">
      <div className="sr-only">Progression rewards. Recent achievements.</div>
      <div
        aria-label="Dashboard achievement orbit"
        className="relative z-10 h-[184px] cursor-grab select-none overflow-visible [perspective:1000px] [touch-action:pan-y] active:cursor-grabbing sm:h-[190px]"
        onPointerCancel={(event) => {
          event.stopPropagation();
          finishHeroAchievementPointer(event);
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
          handleDashboardOrbitPointerDown(
            event,
            heroAchievementPointerStartRef,
            heroAchievementPointerMovedRef,
          );
        }}
        onPointerMove={(event) => {
          event.stopPropagation();
          handleDashboardOrbitPointerMove(
            event,
            heroAchievementPointerStartRef,
            heroAchievementPointerMovedRef,
            rotateHeroAchievement,
            58,
          );
        }}
        onPointerUp={(event) => {
          event.stopPropagation();
          finishHeroAchievementPointer(event);
        }}
        onWheel={handleHeroAchievementWheel}
        onWheelCapture={handleHeroAchievementWheel}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-[18] w-36 bg-gradient-to-r from-[#101927]/68 via-[#101927]/26 to-transparent"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-[18] w-36 bg-gradient-to-l from-[#101927]/68 via-[#101927]/26 to-transparent"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 top-0 z-[18] h-12 bg-gradient-to-b from-[#101927]/38 to-transparent"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 bottom-0 z-[18] h-12 bg-gradient-to-t from-[#101927]/42 to-transparent"
        />
        <button
          aria-label="Previous dashboard achievement"
          className="absolute left-0 top-1/2 z-40 grid h-10 w-6 -translate-y-1/2 place-items-center rounded-full border border-transparent bg-transparent text-lg font-black text-cyan-100/72 transition hover:-translate-x-0.5 hover:border-cyan-100/18 hover:bg-white/[0.045] hover:text-amber-100 active:scale-95"
          onClick={(event) => {
            event.stopPropagation();
            rotateHeroAchievement("left");
          }}
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
        >
          &lt;
        </button>
        <button
          aria-label="Next dashboard achievement"
          className="absolute right-0 top-1/2 z-40 grid h-10 w-6 -translate-y-1/2 place-items-center rounded-full border border-transparent bg-transparent text-lg font-black text-cyan-100/72 transition hover:translate-x-0.5 hover:border-cyan-100/18 hover:bg-white/[0.045] hover:text-amber-100 active:scale-95"
          onClick={(event) => {
            event.stopPropagation();
            rotateHeroAchievement("right");
          }}
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
        >
          &gt;
        </button>

        <div className="absolute inset-x-4 inset-y-4 z-20 overflow-visible [mask-image:radial-gradient(ellipse_at_center,black_0%,black_58%,rgba(0,0,0,0.72)_76%,transparent_100%)]">
        {heroAchievements.map((achievement, index) => {
          const distance = getHeroAchievementOrbitDistance(index);
          const absDistance = Math.abs(distance);
          const direction = Math.sign(distance);
          const slotIndex = Math.min(
            absDistance,
            dashboardHeroAchievementOrbitSlots.length - 1,
          );
          const baseSlot = dashboardHeroAchievementOrbitSlots[slotIndex];
          const shouldRestartOffEdge =
            absDistance > DASHBOARD_HERO_ACHIEVEMENT_VISIBLE_DISTANCE;
          const overflowDistance = Math.max(0, absDistance - slotIndex);
          const slot = overflowDistance
            ? {
                ...baseSlot,
                blur: baseSlot.blur + overflowDistance * 0.8,
                opacity: shouldRestartOffEdge
                  ? 0
                  : Math.max(0, baseSlot.opacity - overflowDistance * 0.08),
                rotateY: baseSlot.rotateY - overflowDistance * 8,
                scale: Math.max(0.26, baseSlot.scale - overflowDistance * 0.08),
                x: baseSlot.x + overflowDistance * 96,
                y: baseSlot.y + overflowDistance * 24,
                zIndex: Math.max(0, baseSlot.zIndex - overflowDistance * 4),
              }
            : baseSlot;
          const isActiveAchievement = index === activeHeroAchievementIndex;
          const resetDirection =
            heroAchievementSlideDirection === "right" ? 1 : -1;
          const isRestartingAcrossEdge =
            shouldRestartOffEdge && direction === resetDirection;
          const achievementProgress = Math.min(
            100,
            Math.max(
              0,
              achievement.progress ??
                (achievement.status === "completed"
                  ? 100
                  : achievement.status === "locked"
                    ? 0
                    : 50),
            ),
          );
          const achievementProgressLabel =
            achievement.statusLabel ||
            (achievementProgress >= 100
              ? "Completed"
              : achievement.status === "locked"
                ? "Locked"
                : `${Math.round(achievementProgress)}% complete`);
          const achievementEstimate = getHeaderAchievementEstimate(achievement);

          return (
            <Link
              aria-current={isActiveAchievement ? "step" : undefined}
              aria-label={`Open ${achievement.label} achievements, ${achievementEstimate.fullLabel}`}
              className={`group/hero-achievement absolute left-1/2 top-1/2 flex cursor-pointer flex-col items-center justify-center text-center transition duration-300 ${
                isActiveAchievement
                  ? "h-[136px] w-[min(52vw,184px)] overflow-visible rounded-[24px] border border-cyan-100/30 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.18),transparent_36%),radial-gradient(circle_at_88%_12%,rgba(250,204,21,0.13),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.88),rgba(2,6,23,0.74))] px-2.5 py-2 shadow-[0_18px_44px_rgba(0,0,0,0.30),0_0_28px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl sm:h-[140px]"
                  : "min-h-[92px] w-[min(42vw,122px)] hover:drop-shadow-[0_14px_34px_rgba(34,211,238,0.14)]"
              }`}
              draggable={false}
              href={achievement.href || ROUTES.dashboard.achievements}
              key={`${achievement.label}-dashboard-hero-orbit`}
              onClick={(event) => {
                event.stopPropagation();
                if (heroAchievementPointerMovedRef.current) {
                  event.preventDefault();
                  heroAchievementPointerMovedRef.current = false;
                }
              }}
              onDragStart={(event) => event.preventDefault()}
              style={{
                filter: `blur(${slot.blur}px)`,
                opacity: slot.opacity,
                pointerEvents: absDistance > 2 ? "none" : "auto",
                transform: `translate(-50%, -50%) translateX(${
                  direction * slot.x
                }px) translateY(${slot.y}px) scale(${slot.scale}) rotateY(${
                  direction * slot.rotateY
                }deg)`,
                transition: isRestartingAcrossEdge
                  ? "opacity 180ms ease, filter 180ms ease"
                  : "transform 520ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 320ms ease, filter 320ms ease",
                zIndex: slot.zIndex,
              }}
            >
              {isActiveAchievement ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-5 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-cyan-100/70 to-amber-100/55"
                />
              ) : null}
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute left-1/2 top-[42%] h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl transition ${
                  isActiveAchievement ? "bg-cyan-300/20" : "bg-cyan-300/8"
                }`}
              />
              <div
                className={`relative z-10 grid place-items-center transition duration-300 ${
                  isActiveAchievement ? "scale-100" : "scale-95"
                }`}
              >
                <SoundLogoAchievementBadge
                  compact
                  item={achievement}
                />
              </div>
              <h3
                className={`relative z-10 mt-1 max-w-[130px] text-center font-black uppercase leading-tight tracking-[0.1em] ${
                  isActiveAchievement
                    ? "text-xs text-white drop-shadow-[0_0_16px_rgba(34,211,238,0.24)]"
                    : "text-[9px] text-slate-300"
                }`}
              >
                {achievement.label}
              </h3>
              {isActiveAchievement ? (
                <div className="relative z-10 mt-0.5 w-full text-left">
                  {achievement.meta ? (
                    <p className="truncate text-center text-[9px] font-bold leading-4 text-slate-300">
                      {achievement.meta}
                    </p>
                  ) : null}
                  <div className="mt-1 flex items-center justify-center gap-1.5">
                    <span className="rounded-full border border-cyan-100/24 bg-cyan-300/12 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-cyan-100">
                      {achievement.category}
                    </span>
                    <span className="rounded-full border border-amber-100/24 bg-amber-300/12 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-amber-100">
                      {achievementProgressLabel}
                    </span>
                  </div>
                  {achievement.variant !== "cta" ? (
                    <p className="mt-1 truncate text-center text-[8px] font-black leading-3 text-emerald-100/85">
                      Plan {achievementEstimate.label}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </Link>
          );
        })}
        </div>
      </div>
      </div>
    </div>
  );

  const renderDashboardHeroRow = () => (
    <div
      aria-label="Dashboard hero row"
      data-dashboard-orbiter-row="0"
      className="relative z-10 mx-auto w-full max-w-[1080px] overflow-visible rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(15,23,42,0.72)),radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.14),transparent_34%),radial-gradient(circle_at_92%_18%,rgba(250,204,21,0.12),transparent_30%)] px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur sm:rounded-[30px] sm:px-5 sm:py-4 lg:px-6"
    >
      <div className="grid gap-4 min-[760px]:grid-cols-[minmax(0,1fr)_minmax(240px,300px)] min-[760px]:items-start">
        <div className="min-w-0">
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
            Sound Fitness Command Center
          </div>

          <h1 className="mt-2 break-words text-3xl font-black uppercase tracking-tight sm:text-4xl">
            Welcome back, <span className="text-sky-400">{firstName}</span>
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-5 text-slate-300">
            Start training, check your progress, back up your workout data,
            and jump into the next part of your plan from one place.
          </p>

          <details
            className="group relative mt-3 max-w-full"
            ref={dashboardStatusDetailsRef}
          >
            <summary
              className={`relative z-[51] inline-flex h-8 max-w-full cursor-pointer list-none items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] shadow-[0_0_22px_rgba(34,211,238,0.10)] transition hover:-translate-y-0.5 hover:border-cyan-100/42 hover:bg-cyan-300/12 group-open:rounded-b-lg group-open:border-cyan-100/50 group-open:bg-slate-950/72 [&::-webkit-details-marker]:hidden ${dashboardStatusPillTone}`}
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full bg-current shadow-[0_0_10px_currentColor]"
              />
              <span className="min-w-0 truncate">
                {dashboardStatusDropdownTitle}
              </span>
              <span className="ml-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border border-white/12 bg-slate-950/36 text-[8px] text-cyan-50 transition group-open:rotate-180">
                v
              </span>
            </summary>

            <div className="absolute left-0 top-0 z-[52] w-[min(540px,calc(100vw-7rem))] rounded-2xl border border-cyan-100/18 bg-[#101927]/95 px-2.5 pb-2.5 pt-0 shadow-[0_18px_46px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
              <button
                aria-label="Close dashboard status calendar"
                className={`flex min-h-10 w-full items-center gap-2 rounded-full border px-3 py-2 text-left transition hover:border-cyan-100/42 hover:bg-cyan-300/12 ${dashboardStatusPillTone}`}
                onClick={(event) => {
                  event.stopPropagation();
                  closeDashboardStatusDropdown();
                }}
                type="button"
              >
                <span className="sr-only">
                  Current dashboard status
                </span>
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full bg-current shadow-[0_0_10px_currentColor]"
                />
                <h2 className="min-w-0 truncate text-[9px] font-black uppercase tracking-[0.08em] text-white sm:text-[10px]">
                  {dashboardStatusDropdownTitle}
                </h2>
              </button>

              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {dashboardStatusDropdownItems.map((item) => (
                  <div
                    className="min-w-0 rounded-xl border border-white/10 bg-slate-950/42 px-3 py-2"
                    key={item.label}
                  >
                    <div className="truncate text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
                      {item.label}
                    </div>
                    <div className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.08em] text-white">
                      {item.value}
                    </div>
                    <div className="mt-0.5 truncate text-[9px] font-semibold text-slate-400">
                      {item.detail}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[8px] font-black uppercase tracking-[0.18em] text-cyan-100/72">
                    {dashboardTodayDropdownLabel}
                  </div>
                  <div className="mt-0.5 truncate text-[10px] font-black uppercase tracking-[0.08em] text-white">
                    {dashboardConsistencyCalendarTrainingDays} trained /{" "}
                    {dashboardConsistencyCalendarPlannedDays} planned
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-[7px] font-black uppercase tracking-[0.1em] text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(250,204,21,0.95),0_0_16px_rgba(251,191,36,0.48)]" />
                    Trained
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.86),0_0_16px_rgba(16,185,129,0.42)]" />
                    Recovery
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.88),0_0_16px_rgba(14,165,233,0.44)]" />
                    Planned
                  </span>
                </div>
              </div>

              <div
                aria-label="Training calendar month orbit"
                className="relative mt-2 h-[158px] overflow-hidden rounded-xl border border-white/8 bg-slate-950/28 px-8 py-2 [perspective:760px]"
              >
                <button
                  aria-label="Previous calendar month"
                  className="absolute left-1 top-1/2 z-30 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-cyan-100/18 bg-slate-950/72 text-sm font-black text-cyan-100 shadow-[0_10px_24px_rgba(0,0,0,0.28)] transition hover:border-cyan-100/42 hover:bg-cyan-300/14"
                  onClick={() => rotateDashboardConsistencyMonth(-1)}
                  type="button"
                >
                  &lt;
                </button>
                <div className="absolute inset-x-8 inset-y-2 [transform-style:preserve-3d]">
                  {dashboardConsistencyCalendarMonths.map((month, index) => {
                    const orbitDistance =
                      getDashboardConsistencyMonthOrbitDistance(index);
                    const orbitAbsDistance = Math.abs(orbitDistance);
                    const isActive = orbitDistance === 0;
                    const orbitOpacity = isActive ? 1 : 0.66;
                    const orbitScale = isActive ? 1 : 0.78;
                    const orbitTranslateX = orbitDistance * 144;
                    const orbitTranslateZ = isActive ? 58 : -74;
                    const orbitRotateY = orbitDistance * -28;

                    return (
                      <button
                        aria-label={`Show ${month.label} training calendar`}
                        aria-pressed={isActive}
                        className={`absolute left-1/2 top-1/2 w-[168px] rounded-xl border px-2 py-1.5 text-left transition-[border-color,background-color,box-shadow] duration-300 ${
                          isActive
                            ? "border-cyan-200/70 bg-cyan-300/14 text-cyan-50 shadow-[0_18px_36px_rgba(0,0,0,0.34),0_0_24px_rgba(34,211,238,0.20),inset_0_1px_0_rgba(255,255,255,0.11)]"
                            : "border-white/8 bg-slate-950/50 text-slate-300 shadow-[0_12px_28px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-cyan-100/30 hover:bg-cyan-300/10"
                        }`}
                        key={`dashboard-consistency-month-${month.label}`}
                        onClick={() =>
                          setActiveDashboardConsistencyMonthIndex(index)
                        }
                        style={{
                          opacity: orbitOpacity,
                          transform: `translate(-50%, -50%) translateX(${orbitTranslateX}px) translateZ(${orbitTranslateZ}px) rotateY(${orbitRotateY}deg) scale(${orbitScale})`,
                          transition:
                            "transform 520ms cubic-bezier(0.2, 0.82, 0.2, 1), opacity 260ms ease, border-color 220ms ease, background-color 220ms ease, box-shadow 220ms ease",
                          zIndex: 20 - orbitAbsDistance,
                        }}
                        type="button"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100">
                            {month.label}
                          </span>
                          <span className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-500">
                            {month.days.length}d
                          </span>
                        </div>
                        <div className="mt-1.5 grid grid-cols-7 gap-1 text-center">
                          {dashboardConsistencyCalendarWeekdays.map(
                            (weekday, weekdayIndex) => (
                              <span
                                className="text-[6px] font-black uppercase text-slate-500"
                                key={`${month.label}-weekday-${weekdayIndex}`}
                              >
                                {weekday}
                              </span>
                            ),
                          )}
                        </div>
                        <div className="mt-1 grid grid-cols-7 gap-x-1 gap-y-1">
                          {Array.from({ length: month.leadingBlankCount }).map(
                            (_, blankIndex) => (
                              <span
                                aria-hidden="true"
                                className="h-3"
                                key={`${month.label}-blank-${blankIndex}`}
                              />
                            ),
                          )}
                          {month.days.map((day) => {
                            const dayTone =
                              day.status === "trained"
                                ? "bg-amber-300 ring-1 ring-amber-100/45 shadow-[0_0_8px_rgba(250,204,21,0.95),0_0_18px_rgba(251,191,36,0.46)]"
                                : day.status === "recovery"
                                  ? "bg-emerald-300 ring-1 ring-emerald-100/35 shadow-[0_0_8px_rgba(52,211,153,0.86),0_0_16px_rgba(16,185,129,0.42)]"
                                  : day.status === "planned"
                                    ? "bg-sky-300 ring-1 ring-sky-100/35 shadow-[0_0_8px_rgba(56,189,248,0.88),0_0_16px_rgba(14,165,233,0.44)]"
                                    : day.status === "logged"
                                      ? "bg-amber-100/60 shadow-[0_0_6px_rgba(253,230,138,0.46)]"
                                      : day.status === "future"
                                        ? "bg-sky-100/18"
                                        : "bg-slate-600/75";

                            return (
                              <span
                                aria-label={`${day.label}: ${
                                  day.status === "trained"
                                    ? "trained"
                                    : day.status === "recovery"
                                      ? "recovery"
                                      : day.status === "planned"
                                        ? "planned"
                                        : day.status === "logged"
                                          ? "logged"
                                          : day.status === "future"
                                            ? "upcoming"
                                            : "no training"
                                }`}
                                className="grid h-3 place-items-center"
                                key={day.dateKey}
                                data-dashboard-tooltip={`${day.label}: ${
                                  day.status === "trained"
                                    ? "trained"
                                    : day.status === "recovery"
                                      ? "recovery"
                                      : day.status === "planned"
                                        ? "planned"
                                        : day.status === "logged"
                                          ? "logged"
                                          : day.status === "future"
                                            ? "upcoming"
                                            : "no training"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full transition ${
                                    day.isToday
                                      ? "ring-1 ring-cyan-100 ring-offset-1 ring-offset-[#101927]"
                                      : ""
                                  } ${dayTone}`}
                                />
                              </span>
                            );
                          })}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button
                  aria-label="Next calendar month"
                  className="absolute right-1 top-1/2 z-30 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-cyan-100/18 bg-slate-950/72 text-sm font-black text-cyan-100 shadow-[0_10px_24px_rgba(0,0,0,0.28)] transition hover:border-cyan-100/42 hover:bg-cyan-300/14"
                  onClick={() => rotateDashboardConsistencyMonth(1)}
                  type="button"
                >
                  &gt;
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Link
                  className="inline-flex min-h-9 items-center rounded-xl border border-cyan-200/24 bg-cyan-300/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:border-cyan-100/45 hover:bg-cyan-300/18"
                  href={nextAction.href}
                >
                  {nextAction.cta}
                </Link>
                <Link
                  className="inline-flex min-h-9 items-center rounded-xl border border-amber-200/24 bg-amber-300/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-amber-100 transition hover:border-amber-100/45 hover:bg-amber-300/18"
                  href={ROUTES.dashboard.goals}
                >
                  Plan goals
                </Link>
              </div>
            </div>
          </details>
        </div>

        <div className="grid gap-3 min-[760px]:w-[min(32vw,300px)] min-[760px]:justify-self-end">
          <div className="rounded-[24px] border border-white/10 bg-slate-950/36 p-3 shadow-inner shadow-white/5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Image
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full border border-cyan-100/28 bg-slate-950 object-contain p-1 shadow-[0_0_18px_rgba(34,211,238,0.16)]"
                  height={40}
                  src="/sound-fitness-logo.png"
                  width={40}
                />
                <div className="min-w-0">
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/72">
                    Active Profile
                  </div>
                  <div className="mt-0.5 truncate text-sm font-black text-white">
                    {firstName}
                  </div>
                  <div className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">
                    {dashboardConsistencyStage} stage
                  </div>
                </div>
              </div>
              <div className="shrink-0 rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-amber-100">
                {dashboardProfileHubCompletion}% ready
              </div>
            </div>

            <div className="mt-3 grid gap-2 border-t border-white/10 pt-2.5">
              <Link
                className="group block min-w-0 text-left transition hover:translate-x-0.5"
                href={ROUTES.dashboard.goals}
              >
                <span className="flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
                    Goal Focus
                  </span>
                  <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.12em] text-amber-100">
                    {dashboardFoundationProgress.goalsCompletion}% goals
                  </span>
                </span>
                <span className="mt-1 block truncate text-sm font-black text-white group-hover:text-cyan-100">
                  {dashboardActiveProfileGoalFocus}
                </span>
              </Link>

              <Link
                className="group block min-w-0 border-t border-white/10 pt-2 text-left transition hover:translate-x-0.5"
                href={dashboardActiveProfileNextHref}
              >
                <span className="flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
                    Position
                  </span>
                  <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
                    {dashboardActiveProfileNextStep}
                  </span>
                </span>
                <span className="mt-1 block truncate text-sm font-black text-white group-hover:text-cyan-100">
                  {masterJourneyCurrentFocus}
                </span>
                <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-400">
                  {dashboardActiveProfilePlanDetail}
                </span>
              </Link>
            </div>

          </div>
        </div>
      </div>

      {renderDashboardHeroAchievementOrbit()}
    </div>
  );

  const renderDashboardRowTitle = ({
    accentClassName,
    description,
    kicker,
    title,
  }: {
    accentClassName: string;
    description: string;
    kicker: string;
    title: string;
  }) => (
    <div className="pointer-events-none absolute left-36 top-5 z-30 w-[min(34rem,calc(100%-12rem))] min-w-0 sm:left-40 lg:left-44">
      <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-slate-950/54 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-300 shadow-[0_14px_34px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
        <span
          aria-hidden="true"
          className={`h-2 w-2 shrink-0 rounded-full ${accentClassName}`}
        />
        <span className="truncate">{kicker}</span>
      </div>
      <h2 className="mt-2 text-2xl font-black uppercase leading-none tracking-[0.08em] text-white [text-shadow:0_0_24px_rgba(34,211,238,0.12)] sm:text-3xl">
        {title}
      </h2>
      <p className="mt-1 max-w-[32rem] text-xs font-semibold leading-5 text-slate-300">
        {description}
      </p>
    </div>
  );

  const renderDashboardDailyToolsRow = () => {
    const getDailyToolOrbitDistance = (index: number) =>
      getDashboardOrbitDistance(
        index,
        activeDailyToolIndex,
        dashboardDailyToolCount,
      );
    const manualToolDistance = getDailyToolOrbitDistance(0);
    const videoToolDistance = getDailyToolOrbitDistance(1);
    const planToolDistance = getDailyToolOrbitDistance(2);
    const getDailyToolOrbitStyle = (distance: number): CSSProperties => {
      const clampedDistance = Math.max(-1, Math.min(1, distance));
      const absDistance = Math.abs(clampedDistance);
      const direction = Math.sign(clampedDistance);

      return {
        opacity: absDistance === 0 ? 1 : 0.56,
        transform: `translate(-50%, -50%) translateX(${
          direction * 235
        }px) translateZ(${absDistance === 0 ? 84 : 8}px) rotateY(${
          direction * -18
        }deg) scale(${absDistance === 0 ? 1 : 0.78})`,
        transition:
          "transform 560ms cubic-bezier(0.2, 0.82, 0.2, 1), opacity 260ms ease, border-color 220ms ease, background-color 220ms ease, box-shadow 220ms ease",
        zIndex: absDistance === 0 ? 30 : 18,
      };
    };

    return (
    <div
      aria-label="Daily Tools row"
      data-dashboard-orbiter-row="1"
      className={`relative flex min-h-0 items-start justify-center pl-36 pr-6 pt-20 transition-opacity duration-300 sm:pl-40 sm:pr-10 sm:pt-24 lg:pl-44 lg:pr-12 lg:pt-28 ${
        clampedDashboardOrbiterRow === 1
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-40"
      }`}
    >
      {renderDashboardRowTitle({
        accentClassName: "bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.65)]",
        description:
          "Quick logging, form checks, plan snapshot, imports, and recent saves.",
        kicker: "Daily command row",
        title: "Daily Tools",
      })}
      <div
        data-dashboard-orbiter-local-scroll="true"
        className="relative h-full w-full max-w-[1180px] overflow-visible pb-2 pr-1 [perspective:1100px]"
      >
        <section
          aria-label="Daily Tools horizontal 3D scroller"
          className="relative flex min-h-full items-center justify-center pb-4"
        >
          <button
            aria-label="Previous daily tool"
            className="absolute left-1 top-1/2 z-40 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/24 bg-slate-950/78 text-lg font-black text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.14)] backdrop-blur transition hover:-translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95"
            onClick={() => rotateDailyToolOrbit("left")}
            type="button"
          >
            &lt;
          </button>
          <button
            aria-label="Next daily tool"
            className="absolute right-1 top-1/2 z-40 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/24 bg-slate-950/78 text-lg font-black text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.14)] backdrop-blur transition hover:translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95"
            onClick={() => rotateDailyToolOrbit("right")}
            type="button"
          >
            &gt;
          </button>
          <div className="relative h-[320px] w-full max-w-[920px] [transform-style:preserve-3d]">
            <article
              className={`absolute left-1/2 top-1/2 flex overflow-hidden border border-cyan-300/24 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_92%_12%,rgba(250,204,21,0.12),transparent_30%),rgba(15,23,42,0.72)] shadow-2xl shadow-black/25 backdrop-blur transition-[height,width,border-radius,box-shadow] duration-300 ${
                manualStatsAdderCollapsed
                  ? "h-[220px] w-[min(86vw,24rem)] flex-col rounded-[28px] p-5 sm:h-[244px] sm:w-[24rem]"
                  : "h-[300px] w-[min(86vw,26rem)] flex-col rounded-[28px] p-4 sm:rounded-[34px] sm:p-5"
              }`}
              style={getDailyToolOrbitStyle(manualToolDistance)}
            >
            {manualStatsAdderCollapsed ? (
              <button
                type="button"
                aria-controls="dashboard-manual-stats-adder-body"
                aria-expanded="false"
                onClick={() => setManualStatsAdderCollapsed(false)}
                className="group relative z-10 flex h-full w-full flex-col items-stretch justify-between text-left"
              >
                <span className="flex items-start justify-between gap-3">
                  <span
                    className="grid h-16 w-16 shrink-0 place-items-center rounded-[24px] border border-cyan-100/35 bg-cyan-300/14 text-2xl font-black text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.16)]"
                    aria-hidden="true"
                  >
                    +
                  </span>
                  <span className="rounded-full border border-cyan-200/28 bg-cyan-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100">
                    Daily Tool
                  </span>
                </span>

                <span className="block min-w-0">
                  <span className="block text-2xl font-black tracking-tight text-white">
                    Manual Stats Adder
                  </span>
                  <span className="mt-2 block max-w-[18rem] text-sm font-semibold leading-5 text-slate-300">
                    Quick-log a stat or attach it to an Exercise Library card.
                  </span>
                </span>

                <span className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Sets", value: manualStatsDraft.sets || "3" },
                    { label: "Reps", value: manualStatsDraft.reps || "10" },
                    {
                      label: "Recent",
                      value: Math.min(manualStatsLogs.length, 6).toString(),
                    },
                  ].map((item) => (
                    <span
                      key={item.label}
                      className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/42 px-2.5 py-2"
                    >
                      <span className="block truncate text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block truncate text-sm font-black uppercase text-white">
                        {item.value}
                      </span>
                    </span>
                  ))}
                </span>
              </button>
            ) : (
              <>
            <span className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-cyan-200/70 to-amber-200/55" />
            <div className="relative flex min-h-0 flex-1 flex-col">
              <div className="grid gap-2">
                <div className="min-w-0 text-left">
                  <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                    Manual Stats Adder
                  </h2>
                  <p className="mt-1 max-w-[25rem] text-xs leading-5 text-slate-300">
                    Quick-log a generic stat or attach it to a referenced Exercise Library card.
                  </p>
                </div>

                <div className="flex max-w-full flex-wrap items-center justify-start gap-1.5">
                  <span className="flex w-full flex-wrap items-center justify-between gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
                      Import Tools
                    </span>
                    <button
                      type="button"
                      aria-controls="dashboard-manual-stats-adder-body"
                      aria-expanded={!manualStatsAdderCollapsed}
                      onClick={() =>
                        setManualStatsAdderCollapsed((collapsed) => !collapsed)
                      }
                      className="inline-flex min-h-[28px] items-center justify-center gap-1 rounded-full border border-cyan-200/24 bg-cyan-300/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-100/48 hover:bg-cyan-300/16 hover:text-cyan-50 active:scale-[0.98]"
                    >
                      {manualStatsAdderCollapsed ? "Expand" : "Collapse"}
                      <span aria-hidden="true">
                        {manualStatsAdderCollapsed ? "v" : "^"}
                      </span>
                    </button>
                  </span>
                  {dashboardUploadOptions.map((option) => {
                    const active = option.id === activeUploadType;

                    return (
                      <Link
                        key={option.id}
                        href={option.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => handleUploadOptionSelect(option.id)}
                        data-dashboard-tooltip={option.description}
                        className={`inline-flex min-h-[28px] items-center justify-center rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] transition hover:-translate-y-0.5 active:scale-[0.98] ${
                          active
                            ? "border-cyan-100/45 bg-cyan-300/16 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.18)]"
                            : "border-white/10 bg-slate-950/46 text-slate-300 hover:border-cyan-200/32 hover:bg-cyan-300/8 hover:text-cyan-100"
                        }`}
                      >
                        {option.label}
                      </Link>
                    );
                  })}
                  <Link
                    href="/stats/add/connect"
                    className="inline-flex min-h-[28px] items-center justify-center rounded-full border border-amber-200/28 bg-amber-300/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-amber-100 transition hover:-translate-y-0.5 hover:border-amber-100/50 hover:bg-amber-300/16 hover:text-amber-50 active:scale-[0.98]"
                  >
                    Wearables
                  </Link>
                </div>
              </div>

              <div
                data-dashboard-orbiter-local-scroll="true"
                className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1 scroll-smooth [scrollbar-color:rgba(34,211,238,0.38)_rgba(15,23,42,0.58)] [scrollbar-width:thin] [touch-action:pan-y] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/38 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/58"
              >
              {manualStatsAdderCollapsed ? (
                <div
                  id="dashboard-manual-stats-adder-body"
                  className="grid gap-2 rounded-[22px] border border-cyan-200/14 bg-slate-950/28 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:grid-cols-2"
                >
                  {[
                    { label: "Sets", value: manualStatsDraft.sets || "3" },
                    { label: "Reps", value: manualStatsDraft.reps || "10" },
                    {
                      label: "Load",
                      value: formatManualLoadDisplay(manualStatsDraft.load),
                    },
                    {
                      label: "Recent",
                      value: `${Math.min(manualStatsLogs.length, 6)} saved`,
                    },
                  ].map((item) => (
                    <span
                      key={item.label}
                      className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/46 px-3 py-2 text-left"
                    >
                      <span className="block truncate text-[8px] font-black uppercase tracking-[0.13em] text-slate-500">
                        {item.label}
                      </span>
                      <span className="mt-1 block truncate text-sm font-black uppercase text-cyan-50">
                        {item.value}
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <div id="dashboard-manual-stats-adder-body">
                  <div className="overflow-hidden rounded-[22px] border border-cyan-200/14 bg-slate-950/28 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <div
                    aria-label="Manual stats dashboard favorite selector"
                    className="mx-auto flex min-w-0 items-center gap-1.5"
                  >
                    <button
                      type="button"
                      aria-label="Previous favorites dashboard"
                      onClick={() => rotateManualFavoriteDashboard("left")}
                      className="grid h-9 w-8 shrink-0 place-items-center rounded-xl border border-transparent bg-transparent text-xs font-black text-cyan-100/80 transition hover:-translate-x-0.5 hover:border-amber-200/28 hover:bg-amber-300/8 hover:text-amber-100 active:scale-95"
                    >
                      &lt;
                    </button>
                    <Link
                      href={activeManualFavoriteDashboard.href}
                      className="group flex min-h-[50px] min-w-[230px] items-center justify-between gap-3 rounded-2xl border border-cyan-200/22 bg-cyan-300/8 px-3 py-2 text-left shadow-[0_0_18px_rgba(34,211,238,0.08)] transition hover:-translate-y-0.5 hover:border-cyan-200/42 hover:bg-cyan-300/12"
                    >
                      <span className="min-w-0">
                        <span className="block text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100/75">
                          {activeManualFavoriteDashboard.meta}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] font-black uppercase tracking-[0.11em] text-white">
                          {activeManualFavoriteDashboard.label}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full border border-white/10 bg-slate-950/48 px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-slate-300">
                        {activeManualFavoriteCountLabel}
                      </span>
                    </Link>
                    <button
                      type="button"
                      aria-label="Next favorites dashboard"
                      onClick={() => rotateManualFavoriteDashboard("right")}
                      className="grid h-9 w-8 shrink-0 place-items-center rounded-xl border border-transparent bg-transparent text-xs font-black text-cyan-100/80 transition hover:translate-x-0.5 hover:border-amber-200/28 hover:bg-amber-300/8 hover:text-amber-100 active:scale-95"
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                <div className="mx-auto mt-1.5 w-full max-w-full">
                  {activeManualFavoriteDashboard.id === "workout" ? (
                    <ManualExerciseLibraryPreview
                      activeCategoryId={activeManualExerciseCategoryId}
                      categories={manualExerciseLibraryCategories}
                      manualStatsDraft={manualStatsDraft}
                      onCategorySelect={setActiveManualExerciseCategoryId}
                      onCategoryShift={rotateManualExerciseCategory}
                      onExerciseSelect={selectExerciseReference}
                      onManualStatsDraftChange={updateManualStatsDraft}
                      onSaveManualStats={saveManualStatsLog}
                      selectedExerciseCue={selectedExercise?.cue}
                      selectedExerciseIds={selectedManualExerciseReferenceIds}
                    />
                  ) : (
                    <div className="mx-auto flex w-fit max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {activeDashboardLibraryFavoriteIds.length ? (
                        activeDashboardLibraryFavoriteIds.map((favoriteId) => (
                          <Link
                            key={`${activeManualFavoriteDashboard.id}-${favoriteId}`}
                            href={activeManualFavoriteDashboard.href}
                            className="flex min-h-[96px] min-w-[210px] shrink-0 flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.045] p-3 transition hover:-translate-y-0.5 hover:border-cyan-200/30 hover:bg-cyan-300/8"
                          >
                            <span>
                              <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100/80">
                                {activeManualFavoriteDashboard.label}
                              </span>
                              <span className="mt-1.5 block truncate text-sm font-black text-white">
                                {formatFavoriteIdLabel(favoriteId)}
                              </span>
                            </span>
                            <span className="mt-2 inline-flex w-fit rounded-full border border-white/10 bg-slate-950/45 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-slate-300">
                              Open dashboard
                            </span>
                          </Link>
                        ))
                      ) : (
                        <Link
                          href={activeManualFavoriteDashboard.href}
                          className="flex min-h-[96px] min-w-[230px] shrink-0 flex-col justify-between rounded-2xl border border-dashed border-cyan-200/24 bg-cyan-300/6 p-3 text-left transition hover:-translate-y-0.5 hover:border-cyan-200/48 hover:bg-cyan-300/10"
                        >
                          <span>
                            <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100">
                              No saved favorites
                            </span>
                            <span className="mt-1.5 block text-sm font-black text-white">
                              {activeManualFavoriteDashboard.label}
                            </span>
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {activeManualFavoriteDashboard.helper}
                          </span>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>

            <div className="mt-3">
              <div className="mb-2 flex flex-col items-center justify-center gap-2 text-center sm:flex-row">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Recently saved stats
                </p>
                <span className="rounded-full border border-cyan-200/18 bg-cyan-300/8 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
                  Last {Math.min(manualStatsLogs.length, 6) || 0}
                </span>
              </div>

              {manualStatsLogs.length ? (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {manualStatsLogs.slice(0, 6).map((entry) => {
                    const reference =
                      entry.references?.find(
                        (item) => item.referenceType === "exercise",
                      ) || entry.references?.[0];
                    const statTitle =
                      entry.sessionLabel?.trim() ||
                      reference?.referenceTitle ||
                      "Manual stat";
                    const statMeta = reference
                      ? `${reference.metadata.movementPattern || "Movement"} / ${
                          reference.metadata.equipment || "Equipment"
                        }`
                      : "Generic manual entry";
                    const statImage = reference?.metadata.image;
                    const statDate = formatCompactDateTime(
                      entry.loggedAt || entry.dateTime,
                    );
                    const statValues = [
                      { label: "Sets", value: entry.sets?.trim() || "0" },
                      { label: "Reps", value: entry.reps?.trim() || "0" },
                      {
                        label: "Load",
                        value: formatManualLoadDisplay(entry.load),
                      },
                      {
                        label: "RPE",
                        value: formatManualRpeDisplay(entry.rpe),
                      },
                    ];

                    return (
                      <article
                        key={entry.id}
                        className="relative isolate min-h-[132px] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/42 p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                      >
                        <span className="flex items-start gap-3">
                          {statImage ? (
                            <span
                              aria-hidden="true"
                              className="h-14 w-14 shrink-0 rounded-xl border border-cyan-100/16 bg-cover bg-center"
                              style={{
                                backgroundImage: `linear-gradient(180deg, rgba(2,6,23,0.08), rgba(2,6,23,0.32)), url(${statImage})`,
                              }}
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-cyan-100/16 bg-cyan-300/10 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100"
                            >
                              Stat
                            </span>
                          )}

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-black text-white">
                              {statTitle}
                            </span>
                            <span className="mt-1 block truncate text-[9px] font-black uppercase tracking-[0.11em] text-cyan-100/78">
                              {statMeta}
                            </span>
                            <span className="mt-1 block truncate text-[10px] font-semibold text-slate-400">
                              {statDate}
                            </span>
                          </span>
                        </span>

                        <span className="mt-3 grid grid-cols-4 gap-1.5">
                          {statValues.map((stat) => (
                            <span
                              key={stat.label}
                              className="min-w-0 rounded-xl border border-white/10 bg-slate-950/46 px-2 py-1"
                            >
                              <span className="block truncate text-[7px] font-black uppercase tracking-[0.1em] text-slate-500">
                                {stat.label}
                              </span>
                              <span className="mt-0.5 block truncate text-[10px] font-black uppercase text-cyan-50">
                                {stat.value}
                              </span>
                            </span>
                          ))}
                        </span>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-[74px] w-full items-center justify-center rounded-2xl border border-dashed border-cyan-200/22 bg-slate-950/36 px-4 py-3 text-center">
                  <p className="text-xs font-semibold text-slate-400">
                    Saved manual stats will appear here after you hit Save Stat.
                  </p>
                </div>
              )}
            </div>
                </div>
              )}
              </div>
          </div>
              </>
            )}
          </article>
          <Link
            aria-label="Open Video Review form checks"
            className="group absolute left-1/2 top-1/2 flex h-[220px] w-[min(82vw,21rem)] flex-col justify-between overflow-hidden rounded-[28px] border border-sky-300/24 bg-[radial-gradient(circle_at_18%_0%,rgba(56,189,248,0.20),transparent_34%),radial-gradient(circle_at_88%_16%,rgba(250,204,21,0.14),transparent_30%),rgba(15,23,42,0.72)] p-5 text-left shadow-2xl shadow-black/25 backdrop-blur transition hover:border-sky-200/48 hover:bg-sky-400/14 sm:h-[244px] sm:w-[22rem]"
            href={ROUTES.dashboard.videoReview}
            style={getDailyToolOrbitStyle(videoToolDistance)}
          >
            <span className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-sky-200/70 to-amber-200/55" />
            <span className="flex items-start justify-between gap-3">
              <span
                className="grid h-16 w-16 shrink-0 place-items-center rounded-[24px] border border-sky-100/35 bg-sky-300/14 text-sky-50 shadow-[0_0_22px_rgba(56,189,248,0.18)]"
                aria-hidden="true"
              >
                <DashboardTabIcon
                  className="h-8 w-8 drop-shadow-[0_0_12px_rgba(255,255,255,0.24)]"
                  label="Video Review"
                  name="form"
                />
              </span>
              <span className="rounded-full border border-sky-200/28 bg-sky-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-sky-100">
                Form Check
              </span>
            </span>

            <span className="block min-w-0">
              <span className="block text-2xl font-black tracking-tight text-white">
                Video Review
              </span>
              <span className="mt-2 block max-w-[18rem] text-sm font-semibold leading-5 text-slate-300">
                Submit a lift clip, link it to a workout, and queue coach feedback.
              </span>
            </span>

            <span className="grid grid-cols-3 gap-2">
              {[
                { label: "Mode", value: "Check" },
                { label: "Queue", value: "2" },
                { label: "Next", value: "Submit" },
              ].map((item) => (
                <span
                  key={item.label}
                  className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/42 px-2.5 py-2"
                >
                  <span className="block truncate text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-black uppercase text-white">
                    {item.value}
                  </span>
                </span>
              ))}
            </span>
          </Link>
          <Link
            aria-label="Open Current Week plan snapshot"
            className="group absolute left-1/2 top-1/2 flex h-[220px] w-[min(82vw,21rem)] flex-col justify-between overflow-hidden rounded-[28px] border border-amber-300/24 bg-[radial-gradient(circle_at_18%_0%,rgba(250,204,21,0.18),transparent_34%),radial-gradient(circle_at_88%_16%,rgba(34,211,238,0.14),transparent_30%),rgba(15,23,42,0.72)] p-5 text-left shadow-2xl shadow-black/25 backdrop-blur transition hover:border-amber-200/50 hover:bg-amber-300/12 sm:h-[244px] sm:w-[22rem]"
            href={ROUTES.dashboard.myPlan}
            style={getDailyToolOrbitStyle(planToolDistance)}
          >
            <span className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-amber-200/75 to-cyan-200/55" />
            <span className="flex items-start justify-between gap-3">
              <span
                className="grid h-16 w-16 shrink-0 place-items-center rounded-[24px] border border-amber-100/35 bg-amber-300/14 text-amber-50 shadow-[0_0_22px_rgba(250,204,21,0.18)]"
                aria-hidden="true"
              >
                <DashboardTabIcon
                  className="h-8 w-8 drop-shadow-[0_0_12px_rgba(255,255,255,0.24)]"
                  label="My Plan"
                  name="plan"
                />
              </span>
              <span className="rounded-full border border-amber-200/28 bg-amber-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-amber-100">
                Open Plan
              </span>
            </span>

            <span className="block min-w-0">
              <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-amber-200">
                Current Week
              </span>
              <span className="mt-1 block text-2xl font-black tracking-tight text-white">
                Plan snapshot
              </span>
              <span className="mt-2 block max-w-[18rem] text-sm font-semibold leading-5 text-slate-300">
                {planHighlights[0]?.value}
              </span>
            </span>

            <span className="grid grid-cols-2 gap-2">
              {planHighlights.slice(1).map((item) => (
                <span
                  key={item.label}
                  className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/42 px-2.5 py-2"
                >
                  <span className="block truncate text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-black text-white">
                    {item.value}
                  </span>
                </span>
              ))}
            </span>
          </Link>
          </div>
        </section>
      </div>
    </div>
    );
  };

  const renderDashboardWeeklyRecapRow = () => (
    <div
      aria-label="Weekly Recap row"
      data-dashboard-orbiter-row="2"
      className={`relative min-h-0 w-full overflow-hidden pl-36 pr-10 pt-20 transition-opacity duration-300 sm:pl-40 sm:pr-12 sm:pt-24 lg:pl-44 lg:pt-28 ${
        clampedDashboardOrbiterRow === 2
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-40"
      }`}
    >
      {renderDashboardRowTitle({
        accentClassName: "bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.62)]",
        description:
          "Last 7 days: training volume, nutrition consistency, readiness, and recent activity.",
        kicker: "7 day review row",
        title: "Weekly Recap",
      })}
      <button
        aria-label="Previous weekly recap card"
        className="absolute left-[5.75rem] top-[44%] z-40 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-200/24 bg-slate-950/60 text-2xl font-black text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.16)] backdrop-blur transition hover:-translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95 sm:left-[6.25rem] sm:h-14 sm:w-14 sm:text-3xl lg:left-[6.75rem] xl:left-[7.25rem]"
        onClick={() => rotateWeeklyRecap("left")}
        type="button"
      >
        &lt;
      </button>
      <button
        aria-label="Next weekly recap card"
        className="absolute right-2 top-[44%] z-40 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-200/24 bg-slate-950/60 text-2xl font-black text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.16)] backdrop-blur transition hover:translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95 sm:right-4 sm:h-14 sm:w-14 sm:text-3xl lg:right-6 xl:right-8"
        onClick={() => rotateWeeklyRecap("right")}
        type="button"
      >
        &gt;
      </button>

      <div className="sr-only">
        Weekly Recap. Last 7 days. Training volume, nutrition consistency,
        recovery readiness, and recent workout activity.
      </div>

      <div
        aria-label="Weekly recap orbit selector"
        className="relative z-10 mx-auto h-[410px] w-full max-w-[1120px] cursor-grab select-none overflow-hidden outline-none [perspective:1500px] [touch-action:pan-y] active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-cyan-200/45 sm:h-[460px]"
        onClickCapture={(event) => {
          if (weeklyRecapPointerMovedRef.current) {
            event.preventDefault();
            event.stopPropagation();
            weeklyRecapPointerMovedRef.current = false;
          }
        }}
        onKeyDown={(event) => handleDashboardOrbitKeyDown(event, rotateWeeklyRecap)}
        onPointerCancel={(event) => {
          weeklyRecapPointerStartRef.current = null;
          if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
            event.currentTarget.releasePointerCapture?.(event.pointerId);
          }
        }}
        onPointerDown={(event) =>
          handleDashboardOrbitPointerDown(
            event,
            weeklyRecapPointerStartRef,
            weeklyRecapPointerMovedRef,
          )
        }
        onPointerMove={(event) =>
          handleDashboardOrbitPointerMove(
            event,
            weeklyRecapPointerStartRef,
            weeklyRecapPointerMovedRef,
            rotateWeeklyRecap,
          )
        }
        onPointerUp={(event) =>
          handleDashboardOrbitPointerUp(
            event,
            weeklyRecapPointerStartRef,
            weeklyRecapPointerMovedRef,
            rotateWeeklyRecap,
            setActiveWeeklyRecapIndex,
          )
        }
        onWheel={(event) => handleDashboardOrbitWheel(event, rotateWeeklyRecap)}
        onWheelCapture={(event) =>
          handleDashboardOrbitWheel(event, rotateWeeklyRecap)
        }
        tabIndex={0}
      >
        {dashboardWeeklyRecapCards.map((card, index) => {
          const distance = getWeeklyRecapOrbitDistance(index);
          const absDistance = Math.abs(distance);
          const direction = Math.sign(distance);
          const orbitSlots = [
            { blur: 0, opacity: 1, rotateY: 0, scale: 1, x: 0, y: -8, zIndex: 42 },
            { blur: 0, opacity: 0.76, rotateY: -16, scale: 0.82, x: 238, y: 20, zIndex: 30 },
            { blur: 0.9, opacity: 0.38, rotateY: -30, scale: 0.64, x: 318, y: 58, zIndex: 16 },
          ];
          const slot = orbitSlots[Math.min(absDistance, orbitSlots.length - 1)];
          const tone = dashboardToneStyles[card.tone];
          const isActive = distance === 0;
          const isRecoveryLineGraph = card.title === "Recovery Readiness";
          const isNutritionLoadingBars =
            card.title === "Nutrition Consistency";
          const isRecentWorkoutActivity =
            card.title === "Recent Workout Activity";
          const lineGraphPoints = card.rows.map((row, rowIndex) => {
            const percent = getWeeklyRecapBarPercent(card, row);
            const x =
              18 +
              (card.rows.length > 1
                ? (rowIndex / (card.rows.length - 1)) * 244
                : 122);
            const y = 104 - (percent / 100) * 78;

            return { percent, row, x, y };
          });
          const lineGraphPath = lineGraphPoints
            .map((point, pointIndex) =>
              `${pointIndex === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
            )
            .join(" ");
          const lineGraphAreaPath = lineGraphPoints.length
            ? `M ${lineGraphPoints[0].x.toFixed(1)} 108 ${lineGraphPoints
                .map((point) => `L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
                .join(" ")} L ${lineGraphPoints[
                lineGraphPoints.length - 1
              ].x.toFixed(1)} 108 Z`
            : "";

          return (
            <article
              aria-label={
                isActive ? `${card.title} selected` : `Select ${card.title}`
              }
              aria-pressed={isActive}
              className={`dashboard-orbit-card group absolute left-1/2 top-1/2 w-[286px] overflow-hidden rounded-[28px] border p-4 text-left shadow-2xl transition-[border-color,background-color,box-shadow] duration-300 sm:w-[360px] ${
                isActive
                  ? "dashboard-orbit-card--active border-cyan-200/45 bg-slate-950/86 shadow-cyan-950/35"
                  : "border-white/10 bg-slate-950/64 shadow-black/30 hover:border-cyan-200/28 hover:bg-slate-950/78"
              }`}
              data-dashboard-orbit-card-index={index}
              key={card.title}
              onClick={() => {
                if (weeklyRecapPointerMovedRef.current) {
                  weeklyRecapPointerMovedRef.current = false;
                  return;
                }

                setActiveWeeklyRecapIndex(index);
              }}
              role="button"
              style={{
                ...dashboardEffectToneStyles[card.tone],
                filter: `blur(${slot.blur}px)`,
                opacity: slot.opacity,
                transform: `translate(-50%, -50%) translateX(${
                  direction * slot.x
                }px) translateY(${slot.y}px) scale(${slot.scale}) rotateY(${
                  direction * slot.rotateY
                }deg)`,
                transition:
                  "transform 560ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 360ms ease, filter 360ms ease",
                zIndex: slot.zIndex,
              }}
              tabIndex={0}
            >
              {isActive ? (
                <span
                  aria-hidden="true"
                  className="dashboard-orbit-card__effect"
                />
              ) : null}
              <span
                className={`absolute left-6 right-6 top-0 z-10 h-[2px] rounded-full ${tone.line}`}
              />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/72">
                    Weekly Recap
                  </div>
                  <h3 className="mt-1 text-xl font-black tracking-tight text-white">
                    {card.title}
                  </h3>
                </div>
                <span
                  className={`shrink-0 rounded-2xl border px-3 py-2 text-lg font-black ${
                    isActive
                      ? "border-cyan-200/35 bg-cyan-300/12 text-cyan-50"
                      : "border-white/10 bg-white/[0.04] text-slate-300"
                  }`}
                >
                  {card.metric}
                </span>
              </div>
              <p className="relative z-10 mt-2 text-xs font-semibold leading-5 text-slate-400">
                {card.description}
              </p>
              <div
                aria-label={`${card.title} ${
                  isRecoveryLineGraph
                    ? "horizontal line graph"
                    : isNutritionLoadingBars
                      ? "loading bars"
                      : isRecentWorkoutActivity
                        ? "activity summary"
                    : "vertical bar graph"
                }`}
                className="relative z-10 mt-4 rounded-3xl border border-white/10 bg-slate-950/34 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
                    {isRecoveryLineGraph
                      ? "7 day trend"
                      : isNutritionLoadingBars
                        ? "fuel loading bars"
                        : isRecentWorkoutActivity
                          ? "latest activity"
                        : "7 day chart"}
                  </span>
                  <span className={`h-1.5 w-12 rounded-full ${tone.line}`} />
                </div>
                {isRecoveryLineGraph ? (
                  <div className="relative h-[148px] overflow-hidden rounded-[22px] border border-white/8 bg-slate-950/42 px-1 pb-5 pt-1">
                    <svg
                      aria-label="Recovery readiness trend line"
                      className="h-full w-full overflow-visible"
                      role="img"
                      viewBox="0 0 280 122"
                    >
                      <defs>
                        <linearGradient
                          id={`weekly-recap-line-${index}`}
                          x1="0"
                          x2="1"
                          y1="0"
                          y2="0"
                        >
                          <stop offset="0%" stopColor="rgb(34, 211, 238)" />
                          <stop offset="55%" stopColor="rgb(250, 204, 21)" />
                          <stop offset="100%" stopColor="rgb(52, 211, 153)" />
                        </linearGradient>
                        <linearGradient
                          id={`weekly-recap-line-fill-${index}`}
                          x1="0"
                          x2="0"
                          y1="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="rgba(34, 211, 238, 0.26)"
                          />
                          <stop
                            offset="100%"
                            stopColor="rgba(15, 23, 42, 0)"
                          />
                        </linearGradient>
                      </defs>
                      {[28, 52, 76, 100].map((lineY) => (
                        <line
                          key={`${card.title}-grid-${lineY}`}
                          stroke="rgba(148, 163, 184, 0.13)"
                          strokeDasharray="4 7"
                          strokeWidth="1"
                          x1="14"
                          x2="266"
                          y1={lineY}
                          y2={lineY}
                        />
                      ))}
                      <path
                        d={lineGraphAreaPath}
                        fill={`url(#weekly-recap-line-fill-${index})`}
                      />
                      <path
                        d={lineGraphPath}
                        fill="none"
                        stroke={`url(#weekly-recap-line-${index})`}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="4"
                      />
                      {lineGraphPoints.map((point) => (
                        <g key={`${card.title}-${point.row.label}-point`}>
                          <circle
                            cx={point.x}
                            cy={point.y}
                            fill="rgba(15,23,42,0.92)"
                            r="6"
                            stroke="rgba(255,255,255,0.30)"
                            strokeWidth="1.4"
                          />
                          <circle
                            cx={point.x}
                            cy={point.y}
                            fill={
                              point.percent >= 80
                                ? "rgb(52,211,153)"
                                : point.percent >= 70
                                  ? "rgb(34,211,238)"
                                  : "rgb(250,204,21)"
                            }
                            r="3.4"
                          />
                        </g>
                      ))}
                    </svg>
                    <div className="pointer-events-none absolute inset-x-3 top-2 flex justify-between">
                      {lineGraphPoints.map((point) => (
                        <span
                          className="text-[8px] font-black text-white"
                          key={`${card.title}-${point.row.label}-value`}
                        >
                          {point.row.value}
                        </span>
                      ))}
                    </div>
                    <div className="absolute inset-x-3 bottom-2 flex justify-between">
                      {card.rows.map((row) => (
                        <span
                          className="text-[8px] font-black uppercase tracking-[0.08em] text-cyan-100"
                          key={`${card.title}-${row.label}-label`}
                        >
                          {row.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : isNutritionLoadingBars ? (
                  <div className="space-y-3">
                    {card.rows.map((row) => {
                      const barPercent = getWeeklyRecapBarPercent(card, row);
                      const isStrong = barPercent >= 80;
                      const isSteady = barPercent >= 50;
                      const barTone = isStrong
                        ? "from-emerald-300 via-cyan-200 to-cyan-100 shadow-[0_0_18px_rgba(52,211,153,0.28)]"
                        : isSteady
                          ? "from-cyan-300 via-sky-300 to-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.22)]"
                          : "from-amber-300 via-orange-300 to-cyan-100 shadow-[0_0_16px_rgba(251,191,36,0.26)]";

                      return (
                        <div
                          className="rounded-2xl border border-white/8 bg-slate-950/44 px-3 py-2.5"
                          key={`${card.title}-${row.label}-loading`}
                          data-dashboard-tooltip={`${row.label}: ${row.value} (${row.detail})`}
                        >
                          <div className="mb-1.5 flex items-center justify-between gap-3">
                            <span className="truncate text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
                              {row.label}
                            </span>
                            <span className="shrink-0 text-sm font-black text-white">
                              {row.value}
                            </span>
                          </div>
                          <div className="relative h-3 overflow-hidden rounded-full border border-white/10 bg-slate-950/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                            <span
                              aria-hidden="true"
                              className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${barTone}`}
                              style={{ width: `${barPercent}%` }}
                            />
                            <span
                              aria-hidden="true"
                              className="absolute inset-y-0 left-0 w-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)] opacity-40"
                            />
                          </div>
                          <div className="mt-1.5 flex items-center justify-between gap-2 text-[8px] font-bold text-slate-500">
                            <span>0%</span>
                            <span className="truncate text-right">
                              {row.detail}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : isRecentWorkoutActivity ? (
                  <div className="space-y-2">
                    {card.rows.slice(0, 4).map((row) => (
                      <div
                        className="rounded-2xl border border-white/8 bg-slate-950/44 px-3 py-2.5"
                        key={`${card.title}-${row.label}-activity`}
                        data-dashboard-tooltip={`${row.label}: ${row.value} (${row.detail})`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block truncate text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
                              {row.label}
                            </span>
                            <span className="mt-1 block truncate text-sm font-black text-white">
                              {row.value}
                            </span>
                          </span>
                          <span className="shrink-0 rounded-full border border-sky-200/22 bg-sky-300/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-sky-100">
                            {row.detail}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-[148px] items-end justify-between gap-2">
                    {card.rows.map((row) => {
                      const barPercent = getWeeklyRecapBarPercent(card, row);
                      const isStrong = barPercent >= 80;
                      const isSteady = barPercent >= 50;
                      const barTone = isStrong
                        ? "from-emerald-300 via-cyan-200 to-cyan-100 shadow-[0_0_18px_rgba(52,211,153,0.28)]"
                        : isSteady
                          ? "from-cyan-300 via-sky-300 to-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.22)]"
                          : "from-amber-300 via-orange-300 to-cyan-100 shadow-[0_0_16px_rgba(251,191,36,0.26)]";

                      return (
                        <div
                          className="flex min-w-0 flex-1 flex-col items-center justify-end"
                          key={`${card.title}-${row.label}`}
                          data-dashboard-tooltip={`${row.label}: ${row.value} (${row.detail})`}
                        >
                          <span className="mb-1 max-w-full truncate text-[8px] font-black text-white">
                            {row.value}
                          </span>
                          <span className="relative flex h-[96px] w-full max-w-8 items-end justify-center overflow-hidden rounded-full border border-white/10 bg-slate-950/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                            <span
                              aria-hidden="true"
                              className="absolute inset-x-1/2 top-2 h-[78px] w-px -translate-x-1/2 bg-white/8"
                            />
                            <span
                              aria-hidden="true"
                              className={`relative z-10 w-full rounded-full bg-gradient-to-t ${barTone}`}
                              style={{ height: `${barPercent}%` }}
                            />
                          </span>
                          <span className="mt-1 max-w-full truncate text-[8px] font-black uppercase tracking-[0.08em] text-cyan-100">
                            {row.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between gap-2 text-[8px] font-bold text-slate-500">
                  <span className="truncate">{card.rows[0]?.detail}</span>
                  <span className="truncate text-right">
                    {card.rows[card.rows.length - 1]?.detail}
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );

  const renderDashboardCalendarRow = () => (
    <div
      aria-label="Calendar row"
      data-dashboard-orbiter-row="4"
      className={`flex min-h-0 items-start justify-center pl-36 pr-6 pt-2 transition-opacity duration-300 sm:pl-40 sm:pr-10 sm:pt-3 lg:pl-44 lg:pr-12 lg:pt-4 ${
        clampedDashboardOrbiterRow === 4
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-40"
      }`}
    >
      <div
        data-dashboard-orbiter-local-scroll="true"
        className="h-full w-full max-w-[1180px] overflow-y-auto overscroll-contain pr-1 scroll-smooth [scrollbar-color:rgba(34,211,238,0.36)_rgba(15,23,42,0.56)] [scrollbar-width:thin] [touch-action:pan-y] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/38 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/58"
      >
        <section className="pb-4">
          <div className="mx-auto w-full max-w-[1120px]">
            <DashboardCalendar items={dashboardCalendarItems} />
          </div>
        </section>
      </div>
    </div>
  );

  const renderDashboardMySoundRow = () => (
    <div
      aria-label="My Sound row"
      data-dashboard-orbiter-row="5"
      className={`relative min-h-0 w-full overflow-hidden pl-36 pr-10 pt-20 transition-opacity duration-300 sm:pl-40 sm:pr-12 sm:pt-24 lg:pl-44 lg:pt-28 ${
        clampedDashboardOrbiterRow === 5
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-40"
      }`}
    >
      {renderDashboardRowTitle({
        accentClassName: "bg-fuchsia-300 shadow-[0_0_14px_rgba(217,70,239,0.58)]",
        description:
          "Personalized dashboard signals, content paths, and next-best actions.",
        kicker: "Personal insight row",
        title: "My Sound",
      })}
      <button
        aria-label="Previous My Sound insight"
        className="absolute left-[5.75rem] top-[44%] z-40 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-200/24 bg-slate-950/60 text-2xl font-black text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.16)] backdrop-blur transition hover:-translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95 sm:left-[6.25rem] sm:h-14 sm:w-14 sm:text-3xl lg:left-[6.75rem] xl:left-[7.25rem]"
        onClick={() => rotateMySound("left")}
        type="button"
      >
        &lt;
      </button>
      <button
        aria-label="Next My Sound insight"
        className="absolute right-2 top-[44%] z-40 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-200/24 bg-slate-950/60 text-2xl font-black text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.16)] backdrop-blur transition hover:translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95 sm:right-4 sm:h-14 sm:w-14 sm:text-3xl lg:right-6 xl:right-8"
        onClick={() => rotateMySound("right")}
        type="button"
      >
        &gt;
      </button>

      <div className="sr-only">
        My Sound. Personalized insights for dashboard content.
      </div>

      <div
        aria-label="My Sound insight orbit selector"
        className="relative z-10 mx-auto h-[410px] w-full max-w-[1120px] cursor-grab select-none overflow-hidden outline-none [perspective:1500px] [touch-action:pan-y] active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-cyan-200/45 sm:h-[460px]"
        onClickCapture={(event) => {
          if (mySoundPointerMovedRef.current) {
            event.preventDefault();
            event.stopPropagation();
            mySoundPointerMovedRef.current = false;
          }
        }}
        onKeyDown={(event) => handleDashboardOrbitKeyDown(event, rotateMySound)}
        onPointerCancel={(event) => {
          mySoundPointerStartRef.current = null;
          if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
            event.currentTarget.releasePointerCapture?.(event.pointerId);
          }
        }}
        onPointerDown={(event) =>
          handleDashboardOrbitPointerDown(
            event,
            mySoundPointerStartRef,
            mySoundPointerMovedRef,
          )
        }
        onPointerMove={(event) =>
          handleDashboardOrbitPointerMove(
            event,
            mySoundPointerStartRef,
            mySoundPointerMovedRef,
            rotateMySound,
          )
        }
        onPointerUp={(event) =>
          handleDashboardOrbitPointerUp(
            event,
            mySoundPointerStartRef,
            mySoundPointerMovedRef,
            rotateMySound,
            setActiveMySoundIndex,
          )
        }
        onWheel={(event) => handleDashboardOrbitWheel(event, rotateMySound)}
        onWheelCapture={(event) => handleDashboardOrbitWheel(event, rotateMySound)}
        tabIndex={0}
      >
        {dashboardMySoundCards.map((card, index) => {
          const distance = getMySoundOrbitDistance(index);
          const absDistance = Math.abs(distance);
          const direction = Math.sign(distance);
          const orbitSlots = [
            { blur: 0, opacity: 1, rotateY: 0, scale: 1, x: 0, y: -8, zIndex: 42 },
            { blur: 0, opacity: 0.75, rotateY: -16, scale: 0.82, x: 238, y: 20, zIndex: 30 },
            { blur: 0.8, opacity: 0.44, rotateY: -30, scale: 0.64, x: 318, y: 58, zIndex: 16 },
            { blur: 1.5, opacity: 0.2, rotateY: -42, scale: 0.48, x: 190, y: 96, zIndex: 8 },
          ];
          const slot = orbitSlots[Math.min(absDistance, orbitSlots.length - 1)];
          const tone = dashboardToneStyles[card.tone];
          const isActive = distance === 0;

          return (
            <article
              aria-label={
                isActive ? `${card.title} selected` : `Select ${card.title}`
              }
              aria-pressed={isActive}
              className={`dashboard-orbit-card group absolute left-1/2 top-1/2 w-[286px] overflow-hidden rounded-[28px] border p-4 text-left shadow-2xl transition-[border-color,background-color,box-shadow] duration-300 sm:w-[360px] ${
                isActive
                  ? "dashboard-orbit-card--active border-cyan-200/45 bg-slate-950/86 shadow-cyan-950/35"
                  : "border-white/10 bg-slate-950/64 shadow-black/30 hover:border-cyan-200/28 hover:bg-slate-950/78"
              }`}
              data-dashboard-orbit-card-index={index}
              key={card.title}
              onClick={() => {
                if (mySoundPointerMovedRef.current) {
                  mySoundPointerMovedRef.current = false;
                  return;
                }

                setActiveMySoundIndex(index);
              }}
              role="button"
              style={{
                ...dashboardEffectToneStyles[card.tone],
                filter: `blur(${slot.blur}px)`,
                opacity: slot.opacity,
                pointerEvents: absDistance > 2 ? "none" : "auto",
                transform: `translate(-50%, -50%) translateX(${
                  direction * slot.x
                }px) translateY(${slot.y}px) scale(${slot.scale}) rotateY(${
                  direction * slot.rotateY
                }deg)`,
                transition:
                  "transform 560ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 360ms ease, filter 360ms ease",
                zIndex: slot.zIndex,
              }}
              tabIndex={0}
            >
              {isActive ? (
                <span
                  aria-hidden="true"
                  className="dashboard-orbit-card__effect"
                />
              ) : null}
              <span
                className={`absolute left-6 right-6 top-0 z-10 h-[2px] rounded-full ${tone.line}`}
              />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <span
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-[20px] border ${
                    dashboardIconToneStyles[card.tone].active
                  }`}
                  aria-hidden="true"
                >
                  <DashboardTabIcon
                    className="h-6 w-6 drop-shadow-[0_0_10px_rgba(255,255,255,0.24)]"
                    label={card.title}
                    name={card.icon}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/72">
                    My Sound
                  </span>
                  <span className="mt-1 block truncate text-xl font-black tracking-tight text-white">
                    {card.title}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-2xl border px-3 py-2 text-sm font-black ${
                    isActive
                      ? "border-cyan-200/35 bg-cyan-300/12 text-cyan-50"
                      : "border-white/10 bg-white/[0.04] text-slate-300"
                  }`}
                >
                  {card.metric}
                </span>
              </div>
              <p className="relative z-10 mt-3 text-xs font-semibold leading-5 text-slate-400">
                {card.description}
              </p>
              <div className="relative z-10 mt-3 grid gap-1.5">
                {card.rows.map((row) => (
                  <span
                    className="grid grid-cols-[72px_minmax(0,1fr)] gap-2 rounded-2xl border border-white/8 bg-slate-950/48 px-3 py-2"
                    key={`${card.title}-${row.label}`}
                  >
                    <span className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">
                      {row.label}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[10px] font-black uppercase text-cyan-50">
                        {row.value}
                      </span>
                      <span className="mt-0.5 block truncate text-[9px] font-semibold text-slate-400">
                        {row.detail}
                      </span>
                    </span>
                  </span>
                ))}
              </div>
              <div className="relative z-10 mt-3 flex items-center justify-between gap-3">
                <span className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                  {isActive ? "Recommended path" : "Select insight"}
                </span>
                {isActive ? (
                  <Link
                    className="shrink-0 rounded-full border border-cyan-200/30 bg-cyan-300/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-50 transition hover:border-cyan-100/50 hover:bg-cyan-300/16"
                    href={card.href}
                    onClick={(event) => {
                      event.stopPropagation();
                      markDashboardDestinationVisited(card.href);
                    }}
                  >
                    Open Dashboard
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );

  const renderDashboardMasterJourneyRow = () => (
    <div
      aria-label="Master Training Journey row"
      data-dashboard-orbiter-row="7"
      className={`relative flex min-h-0 items-start justify-center pl-36 pr-6 pt-2 transition-opacity duration-300 sm:pl-40 sm:pr-10 sm:pt-3 lg:pl-44 lg:pr-12 lg:pt-4 ${
        clampedDashboardOrbiterRow === 7
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-40"
      }`}
    >
      <div className="pointer-events-none absolute left-36 top-6 z-20 min-w-0 pr-6 sm:left-40 lg:left-44">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">
          Master Training Journey
        </div>
        <p className="mt-1 max-w-[34rem] truncate text-[11px] font-semibold text-slate-400">
          Dynamic plan snapshot across the next training timeline.
        </p>
      </div>

      <div
        data-dashboard-orbiter-local-scroll="true"
        className="h-full w-full max-w-[1180px] overflow-y-auto overscroll-contain pb-3 pr-1 scroll-smooth [scrollbar-color:rgba(34,211,238,0.36)_rgba(15,23,42,0.56)] [scrollbar-width:thin] [touch-action:pan-y] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/38 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/58"
      >
        <section className="grid min-h-full items-center gap-4 pb-4 pt-16 lg:grid-cols-[minmax(250px,0.56fr)_minmax(0,1.44fr)] lg:pt-20">
          <aside className="relative overflow-hidden rounded-[30px] border border-cyan-100/18 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.14),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.76),rgba(2,6,23,0.58))] p-4 shadow-2xl shadow-black/25 backdrop-blur">
            <span className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-cyan-200/70 to-amber-200/55" />
            <div className="flex items-start justify-between gap-3">
              <span
                className="grid h-14 w-14 shrink-0 place-items-center rounded-[22px] border border-cyan-100/35 bg-cyan-300/14 text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.18)]"
                aria-hidden="true"
              >
                <DashboardTabIcon
                  className="h-7 w-7 drop-shadow-[0_0_12px_rgba(255,255,255,0.24)]"
                  label="Master Training Journey"
                  name="plan"
                />
              </span>
              <span className="rounded-full border border-amber-200/28 bg-amber-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-amber-100">
                {masterJourneyProgress}% mapped
              </span>
            </div>

            <h2 className="mt-5 text-2xl font-black uppercase tracking-tight text-white">
              Plan timeline
            </h2>
            <p className="mt-2 text-sm font-semibold leading-5 text-slate-300">
              Current focus:{" "}
              <span className="text-cyan-100">{masterJourneyCurrentFocus}</span>
            </p>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950/80">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-amber-300 shadow-[0_0_24px_rgba(34,211,238,0.28)]"
                style={{ width: `${masterJourneyProgress}%` }}
              />
            </div>

            <div className="mt-4 grid gap-2">
              {[
                {
                  label: "Plan source",
                  value: activeSessionTemplate
                    ? "Live workout"
                    : favoriteWorkoutTemplates.length
                      ? `${favoriteWorkoutTemplates.length} templates`
                      : "Setup path",
                },
                {
                  label: "Next action",
                  value: nextAction.cta,
                },
                {
                  label: "Training data",
                  value: `${dashboardSummary.totalLoggedEntries} logs`,
                },
              ].map((item) => (
                <span
                  className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/44 px-3 py-2"
                  key={item.label}
                >
                  <span className="truncate text-[8px] font-black uppercase tracking-[0.13em] text-slate-500">
                    {item.label}
                  </span>
                  <span className="truncate text-[10px] font-black uppercase tracking-[0.1em] text-cyan-50">
                    {item.value}
                  </span>
                </span>
              ))}
            </div>
          </aside>

          <section className="relative min-w-0 overflow-hidden rounded-[34px] border border-white/12 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_86%_12%,rgba(251,191,36,0.12),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.76),rgba(2,6,23,0.62))] shadow-[0_28px_90px_rgba(0,0,0,0.34),0_0_40px_rgba(34,211,238,0.08)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
              <span className="flex items-center gap-1.5" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-300/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/80" />
              </span>
              <span className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
                Current Plan Screenshot
              </span>
              <span className="rounded-full border border-cyan-200/20 bg-cyan-300/8 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-cyan-100">
                {dashboardMasterPlanTimeline.length} steps
              </span>
            </div>

            <div className="relative p-4 sm:p-5">
              <div className="pointer-events-none absolute left-8 right-8 top-[8.9rem] h-px bg-gradient-to-r from-transparent via-cyan-200/42 to-transparent shadow-[0_0_22px_rgba(34,211,238,0.24)]" />
              <div
                data-dashboard-orbiter-local-scroll="true"
                className="overflow-x-auto overscroll-x-contain pb-3 scroll-smooth [scrollbar-color:rgba(34,211,238,0.38)_rgba(15,23,42,0.72)] [scrollbar-width:thin] [touch-action:pan-x] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/42 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/70"
              >
                <div className="flex min-w-max items-stretch">
                  {dashboardMasterPlanTimeline.map((item, index) => {
                    const tone = dashboardToneStyles[item.tone];
                    const isFirst = index === 0;

                    return (
                      <div
                        className="flex items-center"
                        key={`${item.title}-${item.dateLabel}-${index}`}
                      >
                        <Link
                          className={`group relative flex min-h-[238px] w-[188px] flex-col justify-between rounded-[26px] border p-4 text-left transition hover:-translate-y-1 ${tone.border} ${tone.glow} ${
                            isFirst
                              ? "border-cyan-200/55 bg-cyan-300/12 shadow-[0_0_34px_rgba(34,211,238,0.18)]"
                              : "border-white/10 bg-slate-950/56 hover:bg-slate-950/72"
                          }`}
                          href={item.href}
                        >
                          <span
                            className={`absolute left-4 right-4 top-0 h-[2px] rounded-full ${tone.line}`}
                          />
                          <span className="flex items-start justify-between gap-3">
                            <span
                              className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${
                                dashboardIconToneStyles[item.tone][
                                  isFirst ? "active" : "idle"
                                ]
                              }`}
                              aria-hidden="true"
                            >
                              <DashboardTabIcon
                                className="h-6 w-6 drop-shadow-[0_0_10px_rgba(255,255,255,0.22)]"
                                label={item.title}
                                name={item.icon}
                              />
                            </span>
                            <span className="rounded-full border border-white/10 bg-slate-950/50 px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-slate-300">
                              {item.status}
                            </span>
                          </span>

                          <span className="block min-w-0">
                            <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/72">
                              {item.dateLabel}
                            </span>
                            <span className="mt-1.5 block text-lg font-black leading-5 text-white">
                              {item.title}
                            </span>
                            <span className="mt-2 block text-xs font-semibold leading-5 text-slate-400">
                              {item.detail}
                            </span>
                          </span>

                          <span className="inline-flex w-fit rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-cyan-100">
                            {item.metric}
                          </span>
                        </Link>

                        {index < dashboardMasterPlanTimeline.length - 1 ? (
                          <span className="mx-2 h-px w-12 shrink-0 bg-gradient-to-r from-cyan-300/48 via-amber-200/38 to-cyan-300/14 shadow-[0_0_16px_rgba(34,211,238,0.20)]" />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </section>
      </div>
    </div>
  );

  return (
    <>
      <main
        className="h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#020713] text-white"
        onBlurCapture={hideDashboardTooltip}
        onFocusCapture={(event) => {
          const target = getDashboardTooltipTarget(event.target);

          if (target) showDashboardTooltipForTarget(target);
        }}
        onPointerCancel={hideDashboardTooltip}
        onPointerLeave={hideDashboardTooltip}
        onPointerOut={(event) => {
          const target = getDashboardTooltipTarget(event.target);
          const relatedTarget = getDashboardTooltipTarget(event.relatedTarget);

          if (target && target !== relatedTarget) hideDashboardTooltip();
        }}
        onPointerOver={(event) => {
          const target = getDashboardTooltipTarget(event.target);
          const relatedTarget = getDashboardTooltipTarget(event.relatedTarget);

          if (target && target !== relatedTarget) {
            showDashboardTooltipForTarget(target);
          }
        }}
      >
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(14,165,233,0.18),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(16,185,129,0.13),transparent_26%),linear-gradient(180deg,#020713_0%,#07111f_48%,#020713_100%)]" />

      <div className="mx-auto flex h-full max-h-full max-w-7xl flex-col overflow-hidden px-4 pb-0 pt-0 sm:px-8">
        <section className="hidden">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex shrink-0 items-center justify-between gap-3 lg:w-[210px] lg:flex-col lg:items-start">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                  Favorite Workouts
                </div>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">
                  Fast launch saved sessions.
                </p>
              </div>
              <div className="hidden gap-2 lg:flex">
                <button
                  aria-label="Scroll favorite workouts left"
                  className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-slate-950/55 text-xs font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
                  onClick={() => scrollFavoriteWorkouts("left")}
                  type="button"
                >
                  &lt;
                </button>
                <button
                  aria-label="Scroll favorite workouts right"
                  className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-slate-950/55 text-xs font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
                  onClick={() => scrollFavoriteWorkouts("right")}
                  type="button"
                >
                  &gt;
                </button>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex justify-end gap-2 lg:hidden">
                <button
                  aria-label="Scroll favorite workouts left"
                  className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-slate-950/55 text-xs font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
                  onClick={() => scrollFavoriteWorkouts("left")}
                  type="button"
                >
                  &lt;
                </button>
                <button
                  aria-label="Scroll favorite workouts right"
                  className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-slate-950/55 text-xs font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
                  onClick={() => scrollFavoriteWorkouts("right")}
                  type="button"
                >
                  &gt;
                </button>
              </div>

              <div className="flex max-w-full snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-1 scroll-smooth [scrollbar-color:rgba(34,211,238,0.38)_rgba(15,23,42,0.72)] [scrollbar-width:thin] [touch-action:pan-x] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/42 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/70">
                {favoriteWorkoutTemplates.map((template) => {
                  const isActive = activeSessionTemplate?.id === template.id;
                  const exerciseCount = template.exercises.length;

                  return (
                    <Link
                      className={`group flex h-[82px] min-w-[236px] snap-start items-center gap-3 rounded-[20px] border p-3 transition hover:-translate-y-0.5 active:scale-[0.99] ${
                        isActive
                          ? "border-cyan-200/55 bg-cyan-300/14 shadow-[0_0_28px_rgba(34,211,238,0.18)]"
                          : "border-white/10 bg-slate-950/52 hover:border-cyan-200/35 hover:bg-cyan-300/8"
                      }`}
                      href={
                        isActive
                          ? ROUTES.dashboard.sessionWorkout
                          : buildTemplateWorkoutHref(template.id)
                      }
                      key={template.id}
                      onClick={() => {
                        if (!isActive) {
                          launchFavoriteWorkout(template);
                        }
                      }}
                    >
                      <span
                        className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border text-xl ${
                          isActive
                            ? "border-cyan-100/45 bg-cyan-300/16 text-cyan-50"
                            : "border-white/10 bg-white/[0.045] text-slate-100 group-hover:border-cyan-200/28 group-hover:bg-cyan-300/10"
                        }`}
                        aria-hidden="true"
                      >
                        {getWorkoutTemplateIcon(template)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-black text-white">
                            {template.title}
                          </span>
                          <span className="shrink-0 text-amber-200" aria-hidden="true">
                            ★
                          </span>
                        </span>
                        <span className="mt-1 flex min-w-0 items-center gap-1.5">
                          <span className="max-w-[92px] truncate rounded-full border border-cyan-200/18 bg-cyan-300/8 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-cyan-100">
                            {getWorkoutTemplateTag(template)}
                          </span>
                          <span className="truncate text-[10px] font-bold text-slate-500">
                            {exerciseCount} move{exerciseCount === 1 ? "" : "s"}
                          </span>
                        </span>
                        <span
                          className={`mt-1.5 inline-flex rounded-full border px-2.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] ${
                            isActive
                              ? "border-emerald-200/35 bg-emerald-300/12 text-emerald-100"
                              : "border-white/10 bg-white/[0.04] text-slate-300 group-hover:border-cyan-200/28 group-hover:text-cyan-100"
                          }`}
                        >
                          {isActive ? "Resume" : "Quick Start"}
                        </span>
                      </span>
                    </Link>
                  );
                })}

                <Link
                  className="group flex h-[82px] min-w-[180px] snap-start items-center gap-3 rounded-[20px] border border-dashed border-cyan-200/24 bg-cyan-300/6 p-3 transition hover:-translate-y-0.5 hover:border-cyan-200/48 hover:bg-cyan-300/10 active:scale-[0.99]"
                  href={ROUTES.workoutBuilder.home}
                >
                  <span
                    className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-200/24 bg-slate-950/54 text-xl text-cyan-100"
                    aria-hidden="true"
                  >
                    +
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-white">
                      Add Favorite
                    </span>
                    <span className="mt-1 block text-[10px] font-bold text-slate-500">
                      Save a builder template
                    </span>
                  </span>
                </Link>

                <Link
                  className="group flex h-[82px] min-w-[180px] snap-start items-center gap-3 rounded-[20px] border border-white/10 bg-slate-950/45 p-3 transition hover:-translate-y-0.5 hover:border-amber-200/35 hover:bg-amber-300/8 active:scale-[0.99]"
                  href={ROUTES.dashboard.sessionHistory}
                >
                  <span
                    className="grid h-12 w-12 place-items-center rounded-2xl border border-amber-200/20 bg-amber-300/8 text-lg text-amber-100"
                    aria-hidden="true"
                  >
                    ↺
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-white">
                      Recently Used
                    </span>
                    <span className="mt-1 block text-[10px] font-bold text-slate-500">
                      Open session history
                    </span>
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="hidden" aria-hidden="true">
          <div className="relative min-w-0 overflow-hidden rounded-[28px] border border-cyan-300/24 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_92%_12%,rgba(250,204,21,0.12),transparent_30%),rgba(15,23,42,0.72)] p-4 shadow-2xl shadow-black/25 backdrop-blur sm:rounded-[34px] sm:p-5 lg:p-6">
            <span className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-cyan-200/70 to-amber-200/55" />
            <div className="relative">
              <div className="mx-auto max-w-3xl min-w-0 text-center">
                <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  Manual Stats Adder
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Quick-log a generic stat or attach it to a referenced Exercise Library card.
                </p>

              </div>

              <div className="mx-auto mt-4 flex max-w-[680px] flex-wrap items-center justify-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
                  Import Tools
                </span>
                {dashboardUploadOptions.map((option) => {
                  const active = option.id === activeUploadType;

                  return (
                    <Link
                      key={option.id}
                      href={option.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => handleUploadOptionSelect(option.id)}
                      data-dashboard-tooltip={option.description}
                      className={`inline-flex min-h-[30px] items-center justify-center rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.1em] transition hover:-translate-y-0.5 active:scale-[0.98] ${
                        active
                          ? "border-cyan-100/45 bg-cyan-300/16 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.18)]"
                          : "border-white/10 bg-slate-950/46 text-slate-300 hover:border-cyan-200/32 hover:bg-cyan-300/8 hover:text-cyan-100"
                      }`}
                    >
                      {option.label}
                    </Link>
                  );
                })}
                <Link
                  href="/stats/add/connect"
                  className="inline-flex min-h-[30px] items-center justify-center rounded-full border border-amber-200/28 bg-amber-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-amber-100 transition hover:-translate-y-0.5 hover:border-amber-100/50 hover:bg-amber-300/16 hover:text-amber-50 active:scale-[0.98]"
                >
                  Wearables
                </Link>
              </div>

              <div className="mx-auto mt-5 max-w-[980px] overflow-hidden rounded-[22px] border border-cyan-200/14 bg-slate-950/28 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <div
                    aria-label="Manual stats dashboard favorite selector"
                    className="mx-auto flex min-w-0 items-center gap-1.5"
                  >
                    <button
                      type="button"
                      aria-label="Previous favorites dashboard"
                      onClick={() => rotateManualFavoriteDashboard("left")}
                      className="grid h-9 w-8 shrink-0 place-items-center rounded-xl border border-transparent bg-transparent text-xs font-black text-cyan-100/80 transition hover:-translate-x-0.5 hover:border-amber-200/28 hover:bg-amber-300/8 hover:text-amber-100 active:scale-95"
                    >
                      &lt;
                    </button>
                    <Link
                      href={activeManualFavoriteDashboard.href}
                      className="group flex min-h-[50px] min-w-[230px] items-center justify-between gap-3 rounded-2xl border border-cyan-200/22 bg-cyan-300/8 px-3 py-2 text-left shadow-[0_0_18px_rgba(34,211,238,0.08)] transition hover:-translate-y-0.5 hover:border-cyan-200/42 hover:bg-cyan-300/12"
                    >
                      <span className="min-w-0">
                        <span className="block text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100/75">
                          {activeManualFavoriteDashboard.meta}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] font-black uppercase tracking-[0.11em] text-white">
                          {activeManualFavoriteDashboard.label}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full border border-white/10 bg-slate-950/48 px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-slate-300">
                        {activeManualFavoriteCountLabel}
                      </span>
                    </Link>
                    <button
                      type="button"
                      aria-label="Next favorites dashboard"
                      onClick={() => rotateManualFavoriteDashboard("right")}
                      className="grid h-9 w-8 shrink-0 place-items-center rounded-xl border border-transparent bg-transparent text-xs font-black text-cyan-100/80 transition hover:translate-x-0.5 hover:border-amber-200/28 hover:bg-amber-300/8 hover:text-amber-100 active:scale-95"
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                <div className="mx-auto mt-1.5 w-full max-w-full">
                  {activeManualFavoriteDashboard.id === "workout" ? (
                    <ManualExerciseLibraryPreview
                      activeCategoryId={activeManualExerciseCategoryId}
                      categories={manualExerciseLibraryCategories}
                      manualStatsDraft={manualStatsDraft}
                      onCategorySelect={setActiveManualExerciseCategoryId}
                      onCategoryShift={rotateManualExerciseCategory}
                      onExerciseSelect={selectExerciseReference}
                      onManualStatsDraftChange={updateManualStatsDraft}
                      onSaveManualStats={saveManualStatsLog}
                      selectedExerciseCue={selectedExercise?.cue}
                      selectedExerciseIds={selectedManualExerciseReferenceIds}
                    />
                  ) : (
                    <div className="mx-auto flex w-fit max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {activeDashboardLibraryFavoriteIds.length ? (
                        activeDashboardLibraryFavoriteIds.map((favoriteId) => (
                          <Link
                            key={`${activeManualFavoriteDashboard.id}-${favoriteId}`}
                            href={activeManualFavoriteDashboard.href}
                            className="flex min-h-[96px] min-w-[210px] shrink-0 flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.045] p-3 transition hover:-translate-y-0.5 hover:border-cyan-200/30 hover:bg-cyan-300/8"
                          >
                            <span>
                              <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100/80">
                                {activeManualFavoriteDashboard.label}
                              </span>
                              <span className="mt-1.5 block truncate text-sm font-black text-white">
                                {formatFavoriteIdLabel(favoriteId)}
                              </span>
                            </span>
                            <span className="mt-2 inline-flex w-fit rounded-full border border-white/10 bg-slate-950/45 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-slate-300">
                              Open dashboard
                            </span>
                          </Link>
                        ))
                      ) : (
                        <Link
                          href={activeManualFavoriteDashboard.href}
                          className="flex min-h-[96px] min-w-[230px] shrink-0 flex-col justify-between rounded-2xl border border-dashed border-cyan-200/24 bg-cyan-300/6 p-3 text-left transition hover:-translate-y-0.5 hover:border-cyan-200/48 hover:bg-cyan-300/10"
                        >
                          <span>
                            <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100">
                              No saved favorites
                            </span>
                            <span className="mt-1.5 block text-sm font-black text-white">
                              {activeManualFavoriteDashboard.label}
                            </span>
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {activeManualFavoriteDashboard.helper}
                          </span>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mx-auto mt-4 max-w-[980px]">
              <div className="mb-2 flex flex-col items-center justify-center gap-2 text-center sm:flex-row">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Recently saved stats
                </p>
                <span className="rounded-full border border-cyan-200/18 bg-cyan-300/8 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
                  Last {Math.min(manualStatsLogs.length, 6) || 0}
                </span>
              </div>

              {manualStatsLogs.length ? (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {manualStatsLogs.slice(0, 6).map((entry) => {
                    const reference =
                      entry.references?.find(
                        (item) => item.referenceType === "exercise",
                      ) || entry.references?.[0];
                    const statTitle =
                      entry.sessionLabel?.trim() ||
                      reference?.referenceTitle ||
                      "Manual stat";
                    const statMeta = reference
                      ? `${reference.metadata.movementPattern || "Movement"} / ${
                          reference.metadata.equipment || "Equipment"
                        }`
                      : "Generic manual entry";
                    const statImage = reference?.metadata.image;
                    const statDate = formatCompactDateTime(
                      entry.loggedAt || entry.dateTime,
                    );
                    const statValues = [
                      {
                        label: "Sets",
                        value: entry.sets?.trim() || "0",
                      },
                      {
                        label: "Reps",
                        value: entry.reps?.trim() || "0",
                      },
                      {
                        label: "Load",
                        value: formatManualLoadDisplay(entry.load),
                      },
                      {
                        label: "RPE",
                        value: formatManualRpeDisplay(entry.rpe),
                      },
                    ];

                    return (
                      <article
                        key={entry.id}
                        className="relative isolate min-h-[132px] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/42 p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                      >
                        <span className="flex items-start gap-3">
                          {statImage ? (
                            <span
                              aria-hidden="true"
                              className="h-14 w-14 shrink-0 rounded-xl border border-cyan-100/16 bg-cover bg-center"
                              style={{
                                backgroundImage: `linear-gradient(180deg, rgba(2,6,23,0.08), rgba(2,6,23,0.32)), url(${statImage})`,
                              }}
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-cyan-100/16 bg-cyan-300/10 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100"
                            >
                              Stat
                            </span>
                          )}

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-black text-white">
                              {statTitle}
                            </span>
                            <span className="mt-1 block truncate text-[9px] font-black uppercase tracking-[0.11em] text-cyan-100/78">
                              {statMeta}
                            </span>
                            <span className="mt-1 block truncate text-[10px] font-semibold text-slate-400">
                              {statDate}
                            </span>
                          </span>
                        </span>

                        <span className="mt-3 grid grid-cols-4 gap-1.5">
                          {statValues.map((stat) => (
                            <span
                              key={stat.label}
                              className="min-w-0 rounded-xl border border-white/10 bg-slate-950/46 px-2 py-1"
                            >
                              <span className="block truncate text-[7px] font-black uppercase tracking-[0.1em] text-slate-500">
                                {stat.label}
                              </span>
                              <span className="mt-0.5 block truncate text-[10px] font-black uppercase text-cyan-50">
                                {stat.value}
                              </span>
                            </span>
                          ))}
                        </span>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="mx-auto flex min-h-[74px] w-full max-w-[980px] items-center justify-center rounded-2xl border border-dashed border-cyan-200/22 bg-slate-950/36 px-4 py-3 text-center">
                  <p className="text-xs font-semibold text-slate-400">
                    Saved manual stats will appear here after you hit Save Stat.
                  </p>
                </div>
              )}
            </div>

            <div className="hidden">
              <Link
                href={
                  activeSessionTemplate
                    ? ROUTES.dashboard.sessionWorkout
                    : nextAction.href
                }
                className="group flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-300 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.13em] text-slate-950 shadow-[0_0_34px_rgba(14,165,233,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_0_42px_rgba(34,211,238,0.35)] active:scale-[0.99]"
              >
                <span className="text-base leading-none" aria-hidden="true">
                  ▶
                </span>
                Resume Workout
              </Link>
              <Link
                href={ROUTES.dashboard.sessions}
                className="group flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-cyan-200/22 bg-slate-950/46 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.13em] text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200/50 hover:bg-cyan-300/10 hover:text-cyan-50 active:scale-[0.99]"
              >
                <span className="text-base leading-none" aria-hidden="true">
                  ➕
                </span>
                Start Workout
              </Link>
            </div>

            {exerciseSelectorOpen ? (
              <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/76 px-4 py-10 backdrop-blur-sm">
                <button
                  type="button"
                  aria-label="Close exercise selector"
                  className="absolute inset-0 cursor-default"
                  onClick={() => setExerciseSelectorOpen(false)}
                />
                <div className="relative w-full max-w-4xl overflow-hidden rounded-[28px] border border-cyan-200/22 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.16),transparent_34%),rgba(2,6,23,0.96)] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.52),0_0_48px_rgba(34,211,238,0.12)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
                        Exercise Library Reference
                      </p>
                      <h3 className="mt-1 text-2xl font-black text-white">
                        Select an exercise card
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExerciseSelectorOpen(false)}
                      className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.045] text-xs font-black text-slate-300 transition hover:border-cyan-200/35 hover:bg-cyan-300/10 hover:text-cyan-100"
                    >
                      X
                    </button>
                  </div>

                  <input
                    type="search"
                    value={exerciseReferenceSearch}
                    onChange={(event) => setExerciseReferenceSearch(event.target.value)}
                    placeholder="Search by exercise, pattern, muscle, equipment, or tag"
                    className="mt-4 w-full rounded-2xl border border-cyan-200/18 bg-slate-950/68 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-200/45 focus:bg-slate-950"
                  />

                  <div className="mt-4 grid max-h-[56vh] gap-3 overflow-y-auto pr-1 [scrollbar-color:rgba(34,211,238,0.42)_rgba(15,23,42,0.72)] [scrollbar-width:thin] sm:grid-cols-2">
                    {filteredExerciseReferences.map((exercise) => (
                      <button
                        key={exercise.id}
                        type="button"
                        onClick={() => selectExerciseReference(exercise)}
                        className="group flex gap-3 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/54 p-3 text-left transition hover:-translate-y-0.5 hover:border-cyan-200/36 hover:bg-cyan-300/8"
                      >
                        <img
                          alt=""
                          className="h-20 w-20 shrink-0 rounded-xl border border-white/10 object-cover"
                          src={exercise.image}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black text-white">
                            {exercise.name}
                          </span>
                          <span className="mt-1 block truncate text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100/80">
                            {exercise.pattern} / {exercise.equipment}
                          </span>
                          <span className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-slate-400">
                            {exercise.muscles}
                          </span>
                          <span className="mt-2 flex flex-wrap gap-1">
                            {[exercise.body, exercise.goal, exercise.level].map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-slate-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section
          aria-label="Dashboard vertical orbiter"
          className="relative left-1/2 -order-1 mb-0 flex h-full min-h-0 w-screen -translate-x-1/2 flex-col overflow-visible rounded-none border-y border-cyan-200/12 bg-[radial-gradient(circle_at_50%_18%,rgba(34,211,238,0.13),transparent_34%),radial-gradient(circle_at_82%_28%,rgba(250,204,21,0.09),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.62),rgba(2,6,23,0.72))] px-0 pb-0 pt-0 shadow-2xl shadow-black/20 outline-none backdrop-blur focus-visible:ring-2 focus-visible:ring-cyan-200/45"
          onClickCapture={(event) => {
            if (dashboardOrbiterPointerMovedRef.current) {
              event.preventDefault();
              event.stopPropagation();
              dashboardOrbiterPointerMovedRef.current = false;
            }
          }}
          onKeyDown={handleDashboardOrbiterKeyDown}
          onWheel={handleDashboardOrbiterWheel}
          tabIndex={0}
        >
          {renderDashboardOrbiterTopMenu()}
          {renderDashboardFloatingSnapshotHeader()}
          <div
            className={`dashboard-page-orbit-shell pointer-events-none absolute left-[-2.85rem] top-1/2 z-[70] h-[394px] w-36 -translate-y-1/2 overflow-visible sm:left-[-2.65rem] lg:left-[-2.35rem] ${
              dashboardPageAnalogActiveDirection || dashboardPageAnalogDragging
                ? "dashboard-page-orbit-shell--scrolling"
                : ""
            }`}
            style={
              {
                "--dashboard-page-orbit-progress": dashboardPageOrbitProgress,
                "--dashboard-page-orbit-fill":
                  0.08 + dashboardPageOrbitProgress * 0.92,
                "--dashboard-page-orbit-marker-y": `${
                  0.75 + dashboardPageOrbitProgress * 20.05
                }rem`,
              } as CSSProperties
            }
          >
            <span
              aria-hidden="true"
              className="dashboard-page-orbit-rail pointer-events-none absolute"
            />
            <span
              aria-hidden="true"
              className="dashboard-page-orbit-glow pointer-events-none absolute"
            />
            <div
              aria-label="Dashboard row orbit selector"
              className="absolute inset-0 [transform-style:preserve-3d]"
            >
              {dashboardOrbiterRows.map((row, index) => {
                const distance = index - clampedDashboardOrbiterRow;
                const rawAbsDistance = Math.abs(distance);
                const clampedDistance = Math.max(-2, Math.min(2, distance));
                const absDistance = Math.abs(clampedDistance);
                const isActive = distance === 0;
                const urgencyTone = getDashboardRowUrgencyTone(
                  row.completion,
                );
                const arcAngle = clampedDistance * 42;
                const arcAngleRadians = (arcAngle * Math.PI) / 180;
                const xOffset = Math.cos(arcAngleRadians) * 54;
                const yOffset = Math.sin(arcAngleRadians) * 132;
                const scale =
                  absDistance === 0
                    ? 1
                    : absDistance === 1
                      ? 0.78
                      : 0.58;
                const opacity =
                  rawAbsDistance > 2
                    ? 0
                    : absDistance === 0
                    ? 1
                    : absDistance === 1
                      ? 0.68
                      : 0.34;
                return (
                  <button
                    aria-label={`Show ${row.title} row`}
                    aria-pressed={isActive}
                    className={`dashboard-page-orbit-node pointer-events-auto absolute left-1/2 top-1/2 grid h-12 w-12 origin-center place-items-center overflow-hidden rounded-[18px] border p-1 text-left shadow-none transition-[border-color,background-color] duration-300 ${
                      isActive
                        ? `dashboard-page-orbit-node--active ${urgencyTone.ring} ${urgencyTone.text} border-cyan-100/34 shadow-none`
                        : "dashboard-page-orbit-node--ghost border-white/12 bg-slate-950/52 text-slate-300 hover:border-cyan-200/30 hover:bg-cyan-300/10 hover:text-cyan-100"
                    }`}
                    key={row.title}
                    onClick={() => setDashboardOrbiterRow(index)}
                    style={{
                      opacity,
                      pointerEvents: rawAbsDistance > 2 ? "none" : "auto",
                      transform: `translate(-50%, -50%) translateX(${xOffset}px) translateY(${yOffset}px) scale(${scale})`,
                      transition:
                        "transform 240ms ease, opacity 160ms ease, border-color 160ms ease, background-color 160ms ease",
                      zIndex: 40 - absDistance,
                    }}
                    data-dashboard-tooltip={row.helper}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute -inset-2 hidden rounded-[inherit] bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.18),transparent_60%),linear-gradient(90deg,transparent,rgba(250,204,21,0.12),transparent)] ${
                        isActive ? "opacity-70" : "opacity-40"
                      }`}
                    />
                    <span
                      aria-hidden="true"
                      className={`relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl border ${
                        isActive
                          ? "border-cyan-100/34 bg-cyan-300/14 text-cyan-50 shadow-none"
                          : "border-white/12 bg-slate-950/66 text-slate-300"
                      }`}
                    >
                      {row.logo === "sound" ? (
                        <Image
                          alt=""
                          className="h-7 w-7 object-contain"
                          height={28}
                          src="/sound-fitness-logo.png"
                          width={28}
                        />
                      ) : (
                        <DashboardTabIcon
                          className="h-4 w-4"
                          label={row.title}
                          name={row.icon}
                        />
                      )}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full text-[7px] font-black leading-none text-slate-950 ${
                          isActive
                            ? urgencyTone.dot
                            : `${urgencyTone.dot} opacity-70`
                        }`}
                      >
                        {urgencyTone.icon}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="dashboard-page-analog-dock pointer-events-none absolute left-[4.35rem] top-1/2 z-[76] -translate-x-1/2 -translate-y-1/2">
              <span
                aria-hidden="true"
                className="dashboard-page-analog-rail"
              />
              <span
                aria-hidden="true"
                className="dashboard-page-analog-rail__fill"
              />
              <span
                aria-hidden="true"
                className="dashboard-page-analog-rail__scanner"
              />
              {renderDashboardPageAnalog()}
            </div>
          </div>
          <div className="relative z-10 mt-4 min-h-0 flex-1 overflow-hidden sm:mt-5 lg:mt-5">
            <div
              className="grid transition-transform duration-[430ms] ease-[cubic-bezier(0.2,0.85,0.25,1)]"
              style={{
                gridTemplateRows: `repeat(${dashboardOrbiterRows.length}, minmax(0, 1fr))`,
                height: `${dashboardOrbiterRows.length * 100}%`,
                transform: `translateY(-${
                  clampedDashboardOrbiterRow *
                  (100 / dashboardOrbiterRows.length)
                }%)`,
              }}
            >
              <div
                className={`flex min-h-0 items-start justify-center pl-36 pr-6 pt-2 transition-opacity duration-300 sm:pl-40 sm:pr-10 sm:pt-3 lg:pl-44 lg:pr-12 lg:pt-4 ${
                  clampedDashboardOrbiterRow === 0
                    ? "pointer-events-auto opacity-100"
                    : "pointer-events-none opacity-40"
                }`}
              >
                <div
                  data-dashboard-orbiter-local-scroll="true"
                  className="flex h-full w-full max-w-[1120px] flex-col items-center gap-2 overflow-y-auto overscroll-contain pb-3 pr-1 sm:gap-3 [scrollbar-color:rgba(34,211,238,0.36)_rgba(15,23,42,0.56)] [scrollbar-width:thin] [touch-action:pan-y] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/38 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/58"
                >
                  {renderDashboardHeroRow()}
                  {renderFavoriteWorkoutsCard()}
                </div>
              </div>
              {renderDashboardDailyToolsRow()}
              {renderDashboardWeeklyRecapRow()}
              {renderDashboardOrbitCardRow({
                cards: dashboardCommandCenterCards,
                description:
                  "Rotate through training, fuel, recovery, performance, education, and Sound World command centers.",
                getDistance: getCommandCenterOrbitDistance,
                kicker: "Dashboards",
                pointerMovedRef: commandCenterPointerMovedRef,
                pointerStartRef: commandCenterPointerStartRef,
                rotateOrbit: rotateCommandCenter,
                rowIndex: 3,
                setActiveIndex: setActiveCommandCenterIndex,
                title: "Choose Your Command Center",
              })}
              {renderDashboardCalendarRow()}
              {renderDashboardMySoundRow()}
              {renderDashboardOrbitCardRow({
                cards: dashboardSystemCards,
                description:
                  "Goals, insights, stats, progress, appointments, messages, packages, and achievements live together here.",
                getDistance: getSystemCenterOrbitDistance,
                kicker: "Systems",
                pointerMovedRef: systemCenterPointerMovedRef,
                pointerStartRef: systemCenterPointerStartRef,
                rotateOrbit: rotateSystemCenter,
                rowIndex: 6,
                setActiveIndex: setActiveSystemCenterIndex,
                title: "System Row",
              })}
              {renderDashboardMasterJourneyRow()}
            </div>
          </div>
        </section>
        {renderDashboardProfileHubOverlay()}

      </div>
      </main>
      {dashboardTooltip ? (
        <div
          className={`dashboard-hover-tooltip dashboard-hover-tooltip--${dashboardTooltip.placement}`}
          style={
            {
              "--dashboard-tooltip-x": `${dashboardTooltip.x}px`,
              "--dashboard-tooltip-y": `${dashboardTooltip.y}px`,
            } as CSSProperties
          }
        >
          {dashboardTooltip.text}
        </div>
      ) : null}
    </>
  );
}

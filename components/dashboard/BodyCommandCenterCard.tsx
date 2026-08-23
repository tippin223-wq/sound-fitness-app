"use client";

import SoundFitnessAvatar, {
  defaultSoundFitnessAvatarAppearance,
  type SoundFitnessAvatarAppearance,
  type SoundFitnessAvatarBodyPart,
  type SoundFitnessAvatarBodyPreset,
  type SoundFitnessAvatarEmotePreset,
  type SoundFitnessAvatarFacePreset,
  type SoundFitnessAvatarGearPreset,
  type SoundFitnessAvatarHairPreset,
  type SoundFitnessAvatarOutfitPreset,
  type SoundFitnessAvatarSkinPreset,
} from "@/components/dashboard/SoundFitnessAvatar";
import {
  Accessibility,
  Activity,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleUserRound,
  ExternalLink,
  Glasses,
  Mars,
  MountainSnow,
  Palette,
  RotateCcw,
  Shirt,
  Smile,
  Sparkles,
  TreePalm,
  Venus,
  VenusAndMars,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { MuscleSlug } from "@/components/anatomy/exerciseMuscleMap";

type BodyStatTone = "blue" | "cyan" | "emerald" | "gold" | "lime" | "purple" | "rose" | "teal";

type SevenDayTrainingLoad = {
  completed: number;
  target: number;
  unit: "checks" | "sessions" | "sets";
};

type SevenDayTrainingStatus = "good" | "over" | "primed" | "urgent";

type BodyStatCardDefinition = {
  icon: string;
  label: string;
  load: SevenDayTrainingLoad;
  tone: BodyStatTone;
};

type BodyCommandCenterCardProps = {
  bodyMapHref: string;
  commandCenterSlot?: ReactNode;
};

type AvatarLabTab = "body" | "face" | "outfit" | "skin" | "hair" | "gear" | "motion";

type AvatarLabTabDefinition = {
  icon: LucideIcon;
  id: AvatarLabTab;
  label: string;
};

type AvatarScenePreset = "command" | "alpine" | "gym" | "palm";

type AvatarSceneDefinition = {
  accent: string;
  image: string;
  icon: LucideIcon;
  id: AvatarScenePreset;
  label: string;
  overlay: string;
};

const avatarLabStorageKey = "soundFitnessAvatarLabV1";
const avatarSceneStorageKey = "soundFitnessAvatarSceneV1";

const avatarSceneOptions: AvatarSceneDefinition[] = [
  {
    accent: "#67e8f9",
    image: "/avatar-scenes/avatar-command.jpg",
    icon: Sparkles,
    id: "command",
    label: "Command Grid",
    overlay:
      "linear-gradient(180deg, rgba(2,6,23,0.08), rgba(2,6,23,0.22) 52%, rgba(2,6,23,0.68))",
  },
  {
    accent: "#6ee7b7",
    image: "/avatar-scenes/avatar-palm.jpg",
    icon: TreePalm,
    id: "palm",
    label: "Palm Coast",
    overlay:
      "linear-gradient(180deg, rgba(6,78,59,0.02), rgba(2,44,34,0.12) 48%, rgba(2,6,23,0.62))",
  },
  {
    accent: "#fb7185",
    image: "/avatar-scenes/avatar-gym.jpg",
    icon: Activity,
    id: "gym",
    label: "Night Gym",
    overlay:
      "linear-gradient(180deg, rgba(15,23,42,0.02), rgba(2,6,23,0.18) 48%, rgba(2,6,23,0.7))",
  },
  {
    accent: "#bae6fd",
    image: "/avatar-scenes/avatar-alpine.jpg",
    icon: MountainSnow,
    id: "alpine",
    label: "Alpine Air",
    overlay:
      "linear-gradient(180deg, rgba(14,116,144,0.02), rgba(15,23,42,0.12) 50%, rgba(2,6,23,0.62))",
  },
];

const avatarLabTabs: AvatarLabTabDefinition[] = [
  { icon: VenusAndMars, id: "body", label: "Body" },
  { icon: Smile, id: "face", label: "Face" },
  { icon: Shirt, id: "outfit", label: "Suit" },
  { icon: Palette, id: "skin", label: "Skin" },
  { icon: CircleUserRound, id: "hair", label: "Hair" },
  { icon: Glasses, id: "gear", label: "Gear" },
  { icon: Activity, id: "motion", label: "Motion" },
];

const avatarBodyOptions: Array<{
  icon: LucideIcon;
  id: SoundFitnessAvatarBodyPreset;
  label: string;
}> = [
  { icon: Mars, id: "male", label: "Male" },
  { icon: Venus, id: "female", label: "Female" },
];

const avatarFaceOptions: Array<{
  id: SoundFitnessAvatarFacePreset;
  label: string;
}> = [
  { id: "relaxed", label: "Relaxed" },
  { id: "bright", label: "Bright" },
  { id: "focused", label: "Focused" },
  { id: "defined", label: "Defined" },
];

const avatarOutfitOptions: Array<{
  colors: [string, string];
  id: SoundFitnessAvatarOutfitPreset;
  label: string;
}> = [
  { colors: ["#67e8f9", "#0f766e"], id: "command", label: "Command" },
  { colors: ["#93c5fd", "#2563eb"], id: "ocean", label: "Ocean" },
  { colors: ["#fdba74", "#f97316"], id: "ember", label: "Ember" },
  { colors: ["#c4b5fd", "#8b5cf6"], id: "violet", label: "Violet" },
];

const avatarSkinOptions: Array<{
  color: string;
  id: SoundFitnessAvatarSkinPreset;
  label: string;
}> = [
  { color: "#d69b74", id: "warm", label: "Warm" },
  { color: "#c9894f", id: "golden", label: "Golden" },
  { color: "#7a4638", id: "deep", label: "Deep" },
  { color: "#b98278", id: "cool", label: "Cool" },
];

const avatarHairOptions: Array<{
  id: SoundFitnessAvatarHairPreset;
  label: string;
}> = [
  { id: "crop", label: "Close Crop" },
  { id: "swept", label: "Swept" },
  { id: "fade", label: "High Fade" },
];

const avatarGearOptions: Array<{
  id: SoundFitnessAvatarGearPreset;
  label: string;
}> = [
  { id: "none", label: "No Gear" },
  { id: "headband", label: "Headband" },
  { id: "visor", label: "Training Visor" },
  { id: "wristbands", label: "Wristbands" },
];

const avatarMotionOptions: Array<{
  icon: LucideIcon;
  id: SoundFitnessAvatarEmotePreset;
  label: string;
}> = [
  { icon: CircleUserRound, id: "calm", label: "Rest" },
  { icon: Accessibility, id: "wave", label: "Wave" },
  { icon: Check, id: "nod", label: "Nod" },
  { icon: Activity, id: "focus", label: "Focus" },
  { icon: Sparkles, id: "celebrate", label: "Celebrate" },
  { icon: Mars, id: "salute", label: "Salute" },
  { icon: VenusAndMars, id: "stretch", label: "Stretch" },
];

const avatarEmoteWheelPositions = [
  "left-1/2 top-2 -translate-x-1/2",
  "right-3 top-8",
  "right-1 top-1/2 -translate-y-1/2",
  "bottom-3 right-8",
  "bottom-3 left-8",
  "left-1 top-1/2 -translate-y-1/2",
  "left-3 top-8",
] as const;

// Training-category data now lives in MuscleGroupPanel (body-part driven).

const bodyCommandSupportStats: BodyStatCardDefinition[] = [
  {
    icon: "R",
    label: "Recovery",
    load: { completed: 4, target: 4, unit: "sessions" },
    tone: "emerald",
  },
  {
    icon: "M",
    label: "Mobility",
    load: { completed: 2, target: 4, unit: "sessions" },
    tone: "teal",
  },
  {
    icon: "C",
    label: "Core",
    load: { completed: 8, target: 6, unit: "sets" },
    tone: "rose",
  },
  {
    icon: "F",
    label: "Fuel",
    load: { completed: 6, target: 7, unit: "checks" },
    tone: "gold",
  },
  {
    icon: "RD",
    label: "Readiness",
    load: { completed: 3, target: 5, unit: "checks" },
    tone: "blue",
  },
];

const sevenDayStatusTheme: Record<
  SevenDayTrainingStatus,
  {
    activeBg: string;
    border: string;
    fillColor: string;
    label: string;
    ring: string;
    shadow: string;
    text: string;
  }
> = {
  urgent: {
    activeBg: "bg-amber-300/28",
    border: "border-amber-300/62",
    fillColor: "rgba(251,191,36,0.2)",
    label: "Under target",
    ring: "#fbbf24",
    shadow: "shadow-[0_0_20px_rgba(251,191,36,0.22)]",
    text: "text-amber-200",
  },
  good: {
    activeBg: "bg-emerald-300/28",
    border: "border-emerald-300/62",
    fillColor: "rgba(52,211,153,0.2)",
    label: "On target",
    ring: "#34d399",
    shadow: "shadow-[0_0_20px_rgba(52,211,153,0.22)]",
    text: "text-emerald-200",
  },
  primed: {
    activeBg: "bg-orange-400/28",
    border: "border-orange-300/64",
    fillColor: "rgba(251,146,60,0.2)",
    label: "Prime zone",
    ring: "#fb923c",
    shadow: "shadow-[0_0_20px_rgba(251,146,60,0.24)]",
    text: "text-orange-200",
  },
  over: {
    activeBg: "bg-rose-400/28",
    border: "border-rose-300/68",
    fillColor: "rgba(251,113,133,0.2)",
    label: "Over target",
    ring: "#fb7185",
    shadow: "shadow-[0_0_20px_rgba(251,113,133,0.24)]",
    text: "text-rose-200",
  },
};

function getSevenDayTrainingStatus({
  completed,
  target,
}: SevenDayTrainingLoad): SevenDayTrainingStatus {
  const ratio = target > 0 ? completed / target : 0;
  if (ratio < 0.8) return "urgent";
  if (ratio > 1.2) return "over";
  // Sets are in the bag without tipping into overwork.
  if (ratio >= 1) return "primed";
  return "good";
}

function getSevenDayFill({ completed, target }: SevenDayTrainingLoad) {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((completed / target) * 100));
}

const statToneClasses: Record<
  BodyStatTone,
  {
    fill: string;
    icon: string;
    rail: string;
    text: string;
  }
> = {
  blue: {
    fill: "from-sky-200 via-blue-300 to-cyan-300",
    icon: "border-sky-100/26 bg-sky-300/10 text-sky-100",
    rail: "bg-sky-950/52",
    text: "text-sky-100",
  },
  cyan: {
    fill: "from-cyan-200 via-sky-300 to-cyan-400",
    icon: "border-cyan-100/30 bg-cyan-300/12 text-cyan-100",
    rail: "bg-cyan-950/58",
    text: "text-cyan-100",
  },
  emerald: {
    fill: "from-emerald-200 via-teal-300 to-cyan-300",
    icon: "border-emerald-100/30 bg-emerald-300/12 text-emerald-100",
    rail: "bg-emerald-950/56",
    text: "text-emerald-100",
  },
  gold: {
    fill: "from-amber-200 via-yellow-200 to-cyan-200",
    icon: "border-amber-100/30 bg-amber-300/12 text-amber-100",
    rail: "bg-amber-950/46",
    text: "text-amber-100",
  },
  lime: {
    fill: "from-lime-200 via-lime-300 to-emerald-300",
    icon: "border-lime-100/30 bg-lime-300/12 text-lime-100",
    rail: "bg-lime-950/52",
    text: "text-lime-100",
  },
  purple: {
    fill: "from-fuchsia-200 via-violet-300 to-sky-300",
    icon: "border-fuchsia-100/30 bg-fuchsia-300/12 text-fuchsia-100",
    rail: "bg-fuchsia-950/48",
    text: "text-fuchsia-100",
  },
  rose: {
    fill: "from-rose-200 via-pink-300 to-cyan-200",
    icon: "border-rose-100/26 bg-rose-300/10 text-rose-100",
    rail: "bg-rose-950/44",
    text: "text-rose-100",
  },
  teal: {
    fill: "from-teal-200 via-teal-300 to-emerald-300",
    icon: "border-teal-100/30 bg-teal-300/12 text-teal-100",
    rail: "bg-teal-950/52",
    text: "text-teal-100",
  },
};

type ScrollAxis = "horizontal" | "vertical";

function useScrollControls(axis: ScrollAxis) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollBackward, setCanScrollBackward] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  const updateScrollAvailability = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;

    const position = axis === "horizontal" ? element.scrollLeft : element.scrollTop;
    const viewportSize = axis === "horizontal" ? element.clientWidth : element.clientHeight;
    const contentSize = axis === "horizontal" ? element.scrollWidth : element.scrollHeight;
    const remaining = contentSize - viewportSize - position;

    setCanScrollBackward(position > 2);
    setCanScrollForward(remaining > 2);
  }, [axis]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    updateScrollAvailability();
    element.addEventListener("scroll", updateScrollAvailability, { passive: true });

    const resizeObserver = new ResizeObserver(updateScrollAvailability);
    resizeObserver.observe(element);
    Array.from(element.children).forEach((child) => resizeObserver.observe(child));

    const mutationObserver = new MutationObserver(updateScrollAvailability);
    mutationObserver.observe(element, { childList: true, subtree: true });

    return () => {
      element.removeEventListener("scroll", updateScrollAvailability);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [updateScrollAvailability]);

  const scroll = useCallback(
    (direction: -1 | 1) => {
      const element = scrollRef.current;
      if (!element) return;

      const distance =
        axis === "horizontal"
          ? Math.max(96, element.clientWidth * 0.72)
          : Math.max(96, element.clientHeight * 0.72);

      element.scrollBy({
        behavior: "smooth",
        left: axis === "horizontal" ? distance * direction : 0,
        top: axis === "vertical" ? distance * direction : 0,
      });
    },
    [axis],
  );

  const scrollToIndex = useCallback(
    (index: number) => {
      const element = scrollRef.current;
      const item = element?.children.item(index) as HTMLElement | null;
      if (!element || !item) return;

      const target =
        axis === "horizontal"
          ? item.offsetLeft - (element.clientWidth - item.offsetWidth) / 2
          : item.getBoundingClientRect().top -
            element.getBoundingClientRect().top +
            element.scrollTop;

      element.scrollTo({
        behavior: "smooth",
        left: axis === "horizontal" ? target : 0,
        top: axis === "vertical" ? target : 0,
      });
    },
    [axis],
  );

  return {
    canScrollBackward,
    canScrollForward,
    scroll,
    scrollRef,
    scrollToIndex,
  };
}

function ScrollControlButton({
  disabled = false,
  direction,
  label,
  onClick,
  plain = false,
}: {
  disabled?: boolean;
  direction: "down" | "left" | "right" | "up";
  label: string;
  onClick: () => void;
  plain?: boolean;
}) {
  const Icon = {
    down: ChevronDown,
    left: ChevronLeft,
    right: ChevronRight,
    up: ChevronUp,
  }[direction];
  const tooltipLabel = label.replace(/^Highlight /, "");
  const tooltip = `${tooltipLabel.charAt(0).toUpperCase()}${tooltipLabel.slice(1)}`;

  return (
    <button
      aria-label={label}
      className={
        plain
          ? "relative z-50 grid h-7 w-7 shrink-0 touch-manipulation select-none place-items-center text-cyan-50 transition hover:text-cyan-200 active:scale-95 disabled:cursor-default disabled:text-slate-600"
          : "relative z-50 grid h-7 w-7 shrink-0 touch-manipulation select-none place-items-center rounded-full border border-cyan-100/38 bg-slate-950/88 text-cyan-50 shadow-[0_0_16px_rgba(34,211,238,0.24)] transition hover:border-cyan-100/75 hover:bg-cyan-300/18 active:scale-95 disabled:cursor-default disabled:border-white/10 disabled:bg-slate-950/48 disabled:text-slate-600 disabled:shadow-none disabled:hover:bg-slate-950/48"
      }
      disabled={disabled}
      data-dashboard-tooltip={tooltip}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onPointerCancel={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      type="button"
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.6} />
    </button>
  );
}

function BodyStatCard({
  highlighted = false,
  stat,
}: {
  highlighted?: boolean;
  stat: BodyStatCardDefinition;
}) {
  const tone = statToneClasses[stat.tone];
  const trainingStatus = getSevenDayTrainingStatus(stat.load);
  const statusTheme = sevenDayStatusTheme[trainingStatus];
  const fill = getSevenDayFill(stat.load);

  return (
    <div
      aria-current={highlighted ? "true" : undefined}
      className="relative grid min-h-[88px] min-w-0 place-items-center px-2 py-2"
    >
      <div
        aria-label={`${stat.label}, ${statusTheme.label}, ${stat.load.completed} of ${stat.load.target} planned ${stat.load.unit} in the last 7 days`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={fill}
        className={`relative grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full transition-[box-shadow,outline-color] duration-300 ${tone.icon} ${
          highlighted
            ? `${statusTheme.shadow}`
            : "shadow-[0_0_18px_rgba(34,211,238,0.09),inset_0_1px_0_rgba(255,255,255,0.08)]"
        } ${statusTheme.border}`}
        data-dashboard-tooltip={`${statusTheme.label}: ${stat.load.completed}/${stat.load.target} planned ${stat.load.unit} in 7 days`}
        role="progressbar"
      >
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full rotate-45"
          viewBox="0 0 72 72"
        >
          <circle
            cx="36"
            cy="36"
            fill="none"
            r="33"
            stroke="rgba(148,163,184,0.14)"
            strokeWidth="5"
          />
          <circle
            cx="36"
            cy="36"
            fill="none"
            pathLength="100"
            r="33"
            stroke={statusTheme.ring}
            strokeDasharray="100"
            strokeDashoffset={100 - fill}
            strokeLinecap="round"
            strokeWidth="5"
          />
        </svg>
        <span className="relative flex max-w-[58px] flex-col items-center text-center leading-none">
          <span className={`text-[9px] font-black uppercase tracking-normal ${tone.text}`}>
            {stat.label}
          </span>
          <span className={`mt-1 text-[7px] font-black uppercase leading-tight tracking-normal ${statusTheme.text}`}>
            {statusTheme.label}
            <span className="block text-[6px] text-slate-400">
              {stat.load.completed}/{stat.load.target} {stat.load.unit}
            </span>
          </span>
        </span>
      </div>
    </div>
  );
}

function BodyStatStack({
  compact = false,
  label,
  showLabel = true,
  stats,
  vertical = false,
}: {
  compact?: boolean;
  label: string;
  showLabel?: boolean;
  stats: BodyStatCardDefinition[];
  vertical?: boolean;
}) {
  const {
    scrollRef,
    scrollToIndex,
  } = useScrollControls(vertical ? "vertical" : "horizontal");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const activeTone = statToneClasses[stats[highlightedIndex]?.tone ?? "cyan"];

  const moveHighlight = (direction: -1 | 1) => {
    setHighlightedIndex((currentIndex) => {
      const nextIndex =
        (currentIndex + direction + stats.length) % stats.length;
      if (!compact) {
        window.requestAnimationFrame(() => scrollToIndex(nextIndex));
      }
      return nextIndex;
    });
  };

  const visibleStats = compact ? [stats[highlightedIndex]] : stats;

  const rail = (
    <div
      className={`flex min-w-0 snap-mandatory gap-2 rounded-[12px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${compact ? "snap-x justify-center overflow-hidden" : vertical ? "min-h-0 flex-1 snap-y flex-col items-center overflow-y-auto overscroll-y-contain border border-cyan-100/16 bg-cyan-300/[0.035] p-1 shadow-[inset_0_0_18px_rgba(34,211,238,0.05)]" : "snap-x overflow-x-auto overscroll-x-contain border border-cyan-100/16 bg-cyan-300/[0.035] p-1 shadow-[inset_0_0_18px_rgba(34,211,238,0.05)]"}`}
      ref={scrollRef}
    >
      {visibleStats.map((stat, index) => (
        <div
          className={`${vertical && !compact ? "w-full min-w-0 shrink-0 snap-start" : "w-[96px] min-w-[96px] snap-start"}`}
          key={stat.label}
        >
          <BodyStatCard highlighted={compact || index === highlightedIndex} stat={stat} />
        </div>
      ))}
    </div>
  );

  return (
    <div className={`min-w-0 ${vertical && !compact ? "flex min-h-0 flex-1 flex-col" : ""}`}>
      {showLabel ? (
        <div className="mb-1 flex items-center gap-2">
          <span className="h-px flex-1 bg-cyan-100/16" />
          <span className={`shrink-0 text-[9px] font-black uppercase tracking-[0.18em] ${activeTone.text}`}>
            {label}
          </span>
          <span className="h-px flex-1 bg-cyan-100/16" />
        </div>
      ) : null}
      {compact ? (
        <div className="flex min-w-0 flex-col gap-1">
          <div className="grid grid-cols-[24px_minmax(0,1fr)_24px] items-center gap-1">
            <ScrollControlButton
              direction="left"
              label={`Highlight previous ${label} item`}
              onClick={() => moveHighlight(-1)}
              plain
            />
            <span className={`flex flex-col text-center text-[9px] font-black uppercase leading-[1.2] tracking-normal ${activeTone.text}`}>
              {label.split(" ").map((word) => (
                <span key={word}>{word}</span>
              ))}
            </span>
            <ScrollControlButton
              direction="right"
              label={`Highlight next ${label} item`}
              onClick={() => moveHighlight(1)}
              plain
            />
          </div>
          {rail}
        </div>
      ) : vertical ? (
        <div className="flex min-h-0 flex-1 flex-col gap-1">
          <div className="relative z-30 flex shrink-0 items-center justify-between px-2">
            <ScrollControlButton
              direction="down"
              label={`Highlight next ${label} item`}
              onClick={() => moveHighlight(1)}
            />
            <ScrollControlButton
              direction="up"
              label={`Highlight previous ${label} item`}
              onClick={() => moveHighlight(-1)}
            />
          </div>
          {rail}
        </div>
      ) : (
        <div className="grid grid-cols-[24px_minmax(0,1fr)_24px] items-center gap-1">
          <span className="grid place-items-center">
            <ScrollControlButton
              direction="left"
              label={`Highlight previous ${label} item`}
              onClick={() => moveHighlight(-1)}
            />
          </span>
          {rail}
          <span className="grid place-items-center">
            <ScrollControlButton
              direction="right"
              label={`Highlight next ${label} item`}
              onClick={() => moveHighlight(1)}
            />
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Color key for the muscle displays, shown under the avatar's feet. These are
 * the exact colors sevenDayStatusTheme paints on the muscle rings and body-part
 * chips, so the legend explains what the reader is already seeing: amber is a
 * muscle partway through its planned sets (like quads at 5/10), green has hit
 * its window, red has gone past it. Heat framing on purpose — the red end is
 * exertion, not an error.
 */
const avatarHeatLegend = [
  {
    dot: "bg-emerald-300 shadow-[0_0_13px_rgba(52,211,153,0.85)]",
    label: "Cool",
    tooltip: "Green: on track — 80-100% of planned sets in the last 7 days",
  },
  {
    dot: "bg-amber-300 shadow-[0_0_13px_rgba(251,191,36,0.85)]",
    label: "Halfway",
    tooltip: "Yellow: partway through planned sets — under 80% in the last 7 days",
  },
  {
    dot: "bg-orange-400 shadow-[0_0_13px_rgba(251,146,60,0.9)]",
    label: "Prime",
    tooltip:
      "Orange: sets done without overdoing it — 100-120% of planned sets in the last 7 days",
  },
  {
    dot: "bg-rose-400 shadow-[0_0_13px_rgba(251,113,133,0.9)]",
    label: "Overworked",
    tooltip: "Red: over 120% of planned sets in the last 7 days",
  },
] as const;

function AvatarDetailLegend() {
  const railRef = useRef<HTMLDivElement>(null);
  const [activeTagIndex, setActiveTagIndex] = useState(0);

  const showNextTag = () => {
    const nextIndex = (activeTagIndex + 1) % avatarHeatLegend.length;
    const rail = railRef.current;
    const target = rail?.children.item(nextIndex) as HTMLElement | null;

    setActiveTagIndex(nextIndex);
    if (rail && target) {
      rail.scrollTo({
        behavior: "smooth",
        left: target.offsetLeft - rail.offsetLeft,
      });
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[300px] min-w-0 items-center gap-1 pt-0.5">
      <button
        aria-label="Show next heat legend entry"
        className="grid h-6 w-6 shrink-0 place-items-center text-cyan-100 drop-shadow-[0_0_8px_rgba(34,211,238,0.75)] transition hover:text-white active:scale-90 min-[760px]:hidden"
        onClick={(event) => {
          // Same pointer hygiene as ScrollControlButton: without it the hero
          // card's drag system captures the tap and swallows the click.
          event.stopPropagation();
          showNextTag();
        }}
        onPointerCancel={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onPointerMove={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        type="button"
      >
        <ChevronRight aria-hidden="true" className="h-4 w-4" strokeWidth={2.8} />
      </button>
      <div
        className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[760px]:justify-center min-[760px]:gap-3"
        ref={railRef}
      >
        {avatarHeatLegend.map((entry) => (
          <span
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[7px] font-black uppercase tracking-[0.1em] text-slate-300"
            data-dashboard-tooltip={entry.tooltip}
            key={entry.label}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${entry.dot}`}
            />
            {entry.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function HyperRealAvatarFigure({
  appearance,
  emotePreset,
  onSelectBodyPart,
  selectedBodyPart,
}: {
  appearance: SoundFitnessAvatarAppearance;
  emotePreset: SoundFitnessAvatarEmotePreset;
  onSelectBodyPart: (bodyPart: SoundFitnessAvatarBodyPart) => void;
  selectedBodyPart: SoundFitnessAvatarBodyPart;
}) {
  return (
    <div
      className="relative h-full min-h-[176px] w-full overflow-hidden bg-transparent pt-8 transition-[background] duration-500 min-[760px]:min-h-[208px]"
    >
      <SoundFitnessAvatar
        alignToFloor
        animationPreset="idle"
        appearance={appearance}
        className="relative z-10 h-full min-h-0 w-full max-w-none !overflow-visible !rounded-none !border-0 !bg-transparent !shadow-none ![background-image:none]"
        emotePreset={emotePreset}
        exerciseLabel="Sound Athlete"
        interactiveBodyParts
        onBodyPartSelect={onSelectBodyPart}
        selectedBodyPart={selectedBodyPart}
        showExerciseLabel={false}
        showSkeletonOverlay={false}
        showStageBackdrop={false}
      />
    </div>
  );
}

type BodyCommandMuscleSlug =
  | MuscleSlug
  | "upper-chest"
  | "mid-chest"
  | "lower-chest";

type BodyPartGroup = {
  id: string;
  label: string;
  side: "front" | "back";
  muscles: BodyCommandMuscleSlug[];
  tone: BodyStatTone;
};

// Body-part chips -> the muscle groups they reveal. Muscles line up with the
// clickable regions of the shared react-muscle-highlighter body.
const bodyPartGroups: BodyPartGroup[] = [
  {
    id: "legs",
    label: "Legs",
    side: "front",
    muscles: ["quadriceps", "hamstring", "gluteal", "calves", "adductors", "tibialis"],
    tone: "emerald",
  },
  {
    id: "back",
    label: "Back",
    side: "back",
    muscles: ["trapezius", "upper-back", "lower-back"],
    tone: "purple",
  },
  {
    id: "chest",
    label: "Chest",
    side: "front",
    muscles: ["upper-chest", "mid-chest", "lower-chest"],
    tone: "cyan",
  },
  {
    id: "shoulders",
    label: "Shoulders",
    side: "front",
    muscles: ["deltoids"],
    tone: "cyan",
  },
  {
    id: "arms",
    label: "Arms",
    side: "front",
    muscles: ["biceps", "triceps", "forearm"],
    tone: "gold",
  },
  {
    id: "core",
    label: "Core",
    side: "front",
    muscles: ["abs", "obliques"],
    tone: "rose",
  },
];

const muscleMeta: Record<
  BodyCommandMuscleSlug,
  {
    family: string;
    label: string;
    load: SevenDayTrainingLoad;
    status: string;
    tone: BodyStatTone;
  }
> = {
  chest: { family: "Upper push", label: "Chest", load: { completed: 8, target: 8, unit: "sets" }, status: "Pressing power", tone: "cyan" },
  "upper-chest": { family: "Upper push", label: "Upper Chest", load: { completed: 5, target: 8, unit: "sets" }, status: "Incline pressing", tone: "cyan" },
  "mid-chest": { family: "Upper push", label: "Mid Chest", load: { completed: 8, target: 8, unit: "sets" }, status: "Horizontal press", tone: "cyan" },
  "lower-chest": { family: "Upper push", label: "Lower Chest", load: { completed: 8, target: 6, unit: "sets" }, status: "Dips / decline", tone: "cyan" },
  deltoids: { family: "Upper push", label: "Deltoids", load: { completed: 5, target: 8, unit: "sets" }, status: "Overhead", tone: "cyan" },
  biceps: { family: "Arms", label: "Biceps", load: { completed: 8, target: 8, unit: "sets" }, status: "Elbow flexion", tone: "gold" },
  triceps: { family: "Arms", label: "Triceps", load: { completed: 10, target: 8, unit: "sets" }, status: "Lockout", tone: "gold" },
  forearm: { family: "Arms", label: "Forearms", load: { completed: 3, target: 6, unit: "sets" }, status: "Grip", tone: "gold" },
  abs: { family: "Core", label: "Abs", load: { completed: 7, target: 6, unit: "sets" }, status: "Anti-flexion", tone: "rose" },
  obliques: { family: "Core", label: "Obliques", load: { completed: 3, target: 6, unit: "sets" }, status: "Rotation", tone: "rose" },
  quadriceps: { family: "Lower compound", label: "Quads", load: { completed: 5, target: 10, unit: "sets" }, status: "Knee drive", tone: "emerald" },
  hamstring: { family: "Lower compound", label: "Hamstrings", load: { completed: 8, target: 8, unit: "sets" }, status: "Hip hinge", tone: "emerald" },
  gluteal: { family: "Lower compound", label: "Glutes", load: { completed: 10, target: 8, unit: "sets" }, status: "Extension", tone: "emerald" },
  calves: { family: "Lower isolation", label: "Calves", load: { completed: 3, target: 6, unit: "sets" }, status: "Ankle drive", tone: "lime" },
  trapezius: { family: "Upper pull", label: "Traps", load: { completed: 4, target: 6, unit: "sets" }, status: "Shrug / brace", tone: "purple" },
  "upper-back": { family: "Upper pull", label: "Upper Back", load: { completed: 8, target: 8, unit: "sets" }, status: "Rows", tone: "purple" },
  "lower-back": { family: "Upper pull", label: "Lower Back", load: { completed: 4, target: 4, unit: "sets" }, status: "Bracing", tone: "purple" },
  adductors: { family: "Lower isolation", label: "Adductors", load: { completed: 4, target: 4, unit: "sets" }, status: "Inner thigh", tone: "lime" },
  tibialis: { family: "Lower isolation", label: "Tibialis", load: { completed: 6, target: 4, unit: "sets" }, status: "Shin", tone: "lime" },
  "hip-flexors": { family: "Lower isolation", label: "Hip Flexors", load: { completed: 3, target: 4, unit: "sets" }, status: "Flexion", tone: "lime" },
};

const muscleDetailMeta: Partial<
  Record<
    BodyCommandMuscleSlug,
    {
      parts: string[];
      recentMovements: string[];
    }
  >
> = {
  quadriceps: {
    parts: ["Rectus femoris", "Vastus lateralis", "Vastus medialis", "Vastus intermedius"],
    recentMovements: ["Squat pattern", "Split squat", "Knee extension"],
  },
  hamstring: {
    parts: ["Biceps femoris", "Semitendinosus", "Semimembranosus"],
    recentMovements: ["Romanian deadlift", "Leg curl", "Hip hinge"],
  },
  gluteal: {
    parts: ["Glute max", "Glute med", "Glute min"],
    recentMovements: ["Hip thrust", "Squat pattern", "Hip abduction"],
  },
  calves: {
    parts: ["Gastrocnemius", "Soleus"],
    recentMovements: ["Standing calf raise", "Seated calf raise", "Loaded carry"],
  },
  adductors: {
    parts: ["Adductor magnus", "Adductor longus", "Adductor brevis"],
    recentMovements: ["Lateral lunge", "Hip adduction", "Sumo squat"],
  },
  tibialis: {
    parts: ["Tibialis anterior", "Deep dorsiflexors"],
    recentMovements: ["Tibialis raise", "Heel walk", "Ankle control"],
  },
  "upper-chest": {
    parts: ["Clavicular pec fibers", "Front delt assist"],
    recentMovements: ["Incline press", "Low-to-high fly", "Incline push-up"],
  },
  "mid-chest": {
    parts: ["Sternal pec fibers", "Horizontal adductors"],
    recentMovements: ["Flat press", "Push-up", "Chest fly"],
  },
  "lower-chest": {
    parts: ["Costal pec fibers", "Sternal lower fibers"],
    recentMovements: ["Dip", "Decline press", "High-to-low fly"],
  },
  deltoids: {
    parts: ["Front delt", "Lateral delt", "Rear delt"],
    recentMovements: ["Overhead press", "Lateral raise", "Reverse fly"],
  },
  biceps: {
    parts: ["Long head", "Short head", "Brachialis"],
    recentMovements: ["Supinated curl", "Hammer curl", "Incline curl"],
  },
  triceps: {
    parts: ["Long head", "Lateral head", "Medial head"],
    recentMovements: ["Pressdown", "Overhead extension", "Close-grip press"],
  },
  forearm: {
    parts: ["Wrist flexors", "Wrist extensors", "Grip complex"],
    recentMovements: ["Loaded carry", "Wrist curl", "Hammer curl"],
  },
  abs: {
    parts: ["Rectus abdominis", "Transverse abdominis"],
    recentMovements: ["Plank", "Dead bug", "Cable crunch"],
  },
  obliques: {
    parts: ["Internal obliques", "External obliques"],
    recentMovements: ["Pallof press", "Side plank", "Cable rotation"],
  },
  trapezius: {
    parts: ["Upper traps", "Mid traps", "Lower traps"],
    recentMovements: ["Row", "Face pull", "Loaded carry"],
  },
  "upper-back": {
    parts: ["Lats", "Rhomboids", "Rear delts"],
    recentMovements: ["Row", "Pulldown", "Reverse fly"],
  },
  "lower-back": {
    parts: ["Spinal erectors", "Multifidus", "Quadratus lumborum"],
    recentMovements: ["Hip hinge", "Back extension", "Loaded carry"],
  },
};

const muscleDetailOrder = bodyPartGroups.flatMap((group) => group.muscles);

function getMuscleTrainingInsight(slug: BodyCommandMuscleSlug) {
  const meta = muscleMeta[slug];
  const trainingStatus = getSevenDayTrainingStatus(meta.load);
  const difference = Math.abs(meta.load.target - meta.load.completed);

  if (trainingStatus === "urgent") {
    return `This area is below its seven-day plan target. Add ${difference} focused set${difference === 1 ? "" : "s"} with clean technique before the window closes.`;
  }
  if (trainingStatus === "over") {
    return `This area is above its planned seven-day volume. Keep the next exposure light or recovery-focused before adding more hard sets.`;
  }
  return "This area is tracking with the plan. Maintain the current dose and let performance and recovery determine the next increase.";
}

function getBodyPartGroupLoad(group: BodyPartGroup): SevenDayTrainingLoad {
  return group.muscles.reduce<SevenDayTrainingLoad>(
    (total, slug) => ({
      completed: total.completed + muscleMeta[slug].load.completed,
      target: total.target + muscleMeta[slug].load.target,
      unit: "sets",
    }),
    { completed: 0, target: 0, unit: "sets" },
  );
}

function AvatarBodyPicker({
  appearance,
  avatarSceneId,
  emotePreset,
  onAvatarSceneChange,
  onEmoteChange,
  onOpenAvatarLab,
  selectedGroupId,
  onSelectGroup,
}: {
  appearance: SoundFitnessAvatarAppearance;
  avatarSceneId: AvatarScenePreset;
  emotePreset: SoundFitnessAvatarEmotePreset;
  onAvatarSceneChange: (scene: AvatarScenePreset) => void;
  onEmoteChange: (emote: SoundFitnessAvatarEmotePreset) => void;
  onOpenAvatarLab: () => void;
  selectedGroupId: string;
  onSelectGroup: (id: string) => void;
}) {
  const [backgroundPickerOpen, setBackgroundPickerOpen] = useState(false);
  const [emoteWheelOpen, setEmoteWheelOpen] = useState(false);

  return (
    <div className="relative h-full min-h-0">
      <div className="absolute inset-x-1 top-1 z-30 flex items-center justify-center gap-1">
        <button
          aria-haspopup="dialog"
          aria-label="Open Avatar Lab"
          className="grid h-8 w-8 place-items-center bg-transparent text-amber-100 drop-shadow-[0_0_9px_rgba(251,191,36,0.65)] transition hover:-translate-y-0.5 hover:text-white active:scale-90"
          data-dashboard-tooltip="Avatar Lab"
          onClick={(event) => {
            event.stopPropagation();
            onOpenAvatarLab();
          }}
          onPointerCancel={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerMove={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          type="button"
        >
          <CircleUserRound aria-hidden="true" className="h-4.5 w-4.5" strokeWidth={2.1} />
        </button>
        <button
          aria-label="Change avatar dance"
          className="dashboard-avatar-emote-indicator grid h-8 w-8 place-items-center bg-transparent text-cyan-100 drop-shadow-[0_0_9px_rgba(34,211,238,0.72)] transition hover:-translate-y-0.5 hover:text-white active:scale-90"
          data-dashboard-tooltip="Choose emote"
          onClick={(event) => {
            event.stopPropagation();
            setBackgroundPickerOpen(false);
            setEmoteWheelOpen((open) => !open);
          }}
          onPointerCancel={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerMove={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          type="button"
        >
          <Accessibility aria-hidden="true" className="h-4 w-4" strokeWidth={2.1} />
        </button>
        <button
          aria-expanded={backgroundPickerOpen}
          aria-haspopup="menu"
          aria-label="Choose avatar background"
          className="grid h-8 w-8 place-items-center bg-transparent text-emerald-200 drop-shadow-[0_0_9px_rgba(52,211,153,0.7)] transition hover:-translate-y-0.5 hover:text-white active:scale-90"
          data-dashboard-tooltip="Avatar background"
          onClick={(event) => {
            event.stopPropagation();
            setEmoteWheelOpen(false);
            setBackgroundPickerOpen((open) => !open);
          }}
          onPointerCancel={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerMove={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          type="button"
        >
          <TreePalm aria-hidden="true" className="h-4.5 w-4.5" strokeWidth={2.1} />
        </button>
      </div>
      {backgroundPickerOpen ? (
        <div
          aria-label="Choose an avatar background"
          className="absolute left-1/2 top-10 z-50 w-[min(220px,calc(100%-0.75rem))] -translate-x-1/2 rounded-[8px] border border-emerald-100/28 bg-slate-950/76 p-2 shadow-[0_18px_44px_rgba(0,0,0,0.5),0_0_26px_rgba(52,211,153,0.18),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl"
          role="menu"
        >
          <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
            <span className="text-[7px] font-black uppercase tracking-[0.13em] text-emerald-100/80">
              Avatar Scene
            </span>
            <button
              aria-label="Close avatar background picker"
              className="grid h-6 w-6 place-items-center rounded-full text-slate-400 transition hover:bg-white/8 hover:text-white"
              onClick={() => setBackgroundPickerOpen(false)}
              type="button"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {avatarSceneOptions.map((scene) => {
              const active = scene.id === avatarSceneId;
              const SceneIcon = scene.icon;
              return (
                <button
                  aria-checked={active}
                  className={`relative min-h-12 overflow-hidden rounded-[6px] border p-1.5 text-left transition hover:-translate-y-0.5 ${
                    active
                      ? "border-emerald-100/72 text-white shadow-[0_0_18px_rgba(52,211,153,0.28)]"
                      : "border-white/12 text-slate-200 hover:border-emerald-100/42"
                  }`}
                  key={scene.id}
                  onClick={() => {
                    onAvatarSceneChange(scene.id);
                    setBackgroundPickerOpen(false);
                  }}
                  role="menuitemradio"
                  style={{
                    backgroundImage: `${scene.overlay}, url("${scene.image}")`,
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                  }}
                  type="button"
                >
                  <SceneIcon
                    aria-hidden="true"
                    className="mb-1 h-4 w-4"
                    style={{ color: scene.accent } as CSSProperties}
                    strokeWidth={2}
                  />
                  <span className="block text-[7px] font-black uppercase leading-tight tracking-[0.06em]">
                    {scene.label}
                  </span>
                  {active ? (
                    <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-emerald-200 text-slate-950">
                      <Check aria-hidden="true" className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {emoteWheelOpen ? (
        <div
          aria-label="Choose an avatar emote"
          className="absolute left-1/2 top-10 z-40 h-44 w-44 -translate-x-1/2 rounded-full border border-cyan-100/24 bg-[radial-gradient(circle,rgba(15,23,42,0.92)_0_34%,rgba(8,15,31,0.84)_68%,rgba(2,6,23,0.72)_100%)] shadow-[0_18px_46px_rgba(0,0,0,0.48),0_0_34px_rgba(34,211,238,0.18),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl"
          role="menu"
        >
          <span className="pointer-events-none absolute inset-[3.2rem] rounded-full border border-cyan-200/18 bg-cyan-300/6 shadow-[inset_0_0_20px_rgba(34,211,238,0.12)]" />
          {avatarMotionOptions.map((option, index) => {
            const active = option.id === emotePreset;
            const EmoteIcon = option.icon;
            return (
              <button
                aria-label={option.label}
                className={`absolute grid h-10 w-10 place-items-center rounded-full border text-[8px] font-black uppercase tracking-normal transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/70 ${avatarEmoteWheelPositions[index]} ${
                  active
                    ? "border-cyan-100/72 bg-cyan-300/24 text-white shadow-[0_0_22px_rgba(34,211,238,0.42)]"
                    : "border-white/14 bg-slate-950/84 text-cyan-100/78 hover:border-cyan-100/48 hover:bg-cyan-300/14"
                }`}
                data-dashboard-tooltip={option.label}
                key={option.id}
                onClick={() => {
                  onEmoteChange(option.id);
                  setEmoteWheelOpen(false);
                }}
                role="menuitem"
                type="button"
              >
                <EmoteIcon aria-hidden="true" className="h-4 w-4" strokeWidth={2.15} />
              </button>
            );
          })}
          <button
            aria-label="Close emote wheel"
            className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/12 bg-slate-950/88 text-cyan-100 transition hover:border-cyan-100/45 hover:bg-cyan-300/12"
            onClick={() => setEmoteWheelOpen(false)}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <HyperRealAvatarFigure
        appearance={appearance}
        emotePreset={emotePreset}
        onSelectBodyPart={onSelectGroup}
        selectedBodyPart={selectedGroupId as SoundFitnessAvatarBodyPart}
      />
    </div>
  );
}

function AvatarLabChoice({
  active,
  label,
  onClick,
  preview,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  preview: ReactNode;
}) {
  return (
    <button
      aria-pressed={active}
      className={`relative flex min-h-14 min-w-0 items-center gap-2 overflow-hidden rounded-[10px] border px-2.5 py-2 text-left transition ${
        active
          ? "border-cyan-200/72 bg-cyan-300/16 text-white shadow-[0_0_18px_rgba(34,211,238,0.22),inset_0_1px_0_rgba(255,255,255,0.1)]"
          : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-cyan-200/34 hover:bg-cyan-300/8"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border border-white/10 bg-slate-950/54">
        {preview}
      </span>
      <span className="min-w-0 flex-1 text-[9px] font-black uppercase tracking-[0.08em]">
        {label}
      </span>
      {active ? (
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-cyan-200 text-slate-950 shadow-[0_0_14px_rgba(103,232,249,0.54)]">
          <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      ) : null}
    </button>
  );
}

function AvatarLabMenu({
  appearance,
  bodyMapHref,
  emotePreset,
  onAppearanceChange,
  onClose,
  onEmoteChange,
  onReset,
}: {
  appearance: SoundFitnessAvatarAppearance;
  bodyMapHref: string;
  emotePreset: SoundFitnessAvatarEmotePreset;
  onAppearanceChange: (appearance: SoundFitnessAvatarAppearance) => void;
  onClose: () => void;
  onEmoteChange: (emote: SoundFitnessAvatarEmotePreset) => void;
  onReset: () => void;
}) {
  const [activeTab, setActiveTab] = useState<AvatarLabTab>("body");

  function updateAppearance<Key extends keyof SoundFitnessAvatarAppearance>(
    key: Key,
    value: SoundFitnessAvatarAppearance[Key],
  ) {
    onAppearanceChange({ ...appearance, [key]: value });
  }

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex min-h-0 items-center justify-center bg-slate-950/84 p-[clamp(8px,2vw,18px)] backdrop-blur-md">
      <section
        aria-label="Avatar Lab"
        aria-modal="true"
        className="relative flex max-h-[calc(100dvh-16px)] min-h-0 w-full max-w-[820px] flex-col overflow-hidden rounded-[18px] border border-cyan-100/34 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.2),transparent_32%),radial-gradient(circle_at_92%_12%,rgba(251,191,36,0.12),transparent_28%),linear-gradient(145deg,rgba(8,15,30,0.98),rgba(2,6,23,0.98))] shadow-[0_26px_80px_rgba(0,0,0,0.68),0_0_42px_rgba(34,211,238,0.18),inset_0_1px_0_rgba(255,255,255,0.12)]"
        role="dialog"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-cyan-100/28 bg-cyan-300/12 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.18)]">
              <Sparkles aria-hidden="true" className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[8px] font-black uppercase tracking-[0.2em] text-cyan-200/72">
                Character Customizer
              </span>
              <span className="block truncate text-lg font-black uppercase tracking-[0.04em] text-white">
                Avatar Lab
              </span>
            </span>
          </div>
          <button
            aria-label="Close Avatar Lab"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-white/12 bg-slate-950/52 text-slate-200 transition hover:border-cyan-100/42 hover:text-cyan-100"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-x-hidden overflow-y-auto [scrollbar-color:rgba(34,211,238,0.38)_rgba(15,23,42,0.36)] [scrollbar-width:thin] min-[700px]:grid-cols-2">
          <div className="relative min-h-[220px] border-b border-white/8 p-2 min-[700px]:border-b-0 min-[700px]:border-r">
            <SoundFitnessAvatar
              appearance={appearance}
              className="h-full min-h-[210px] w-full rounded-[14px]"
              emotePreset={emotePreset}
              exerciseLabel="Live Preview"
            />
            <div className="pointer-events-none absolute inset-x-5 bottom-4 z-20 flex flex-wrap justify-center gap-1">
              {[appearance.body, appearance.face, appearance.outfit, appearance.hair, appearance.gear].map((item) => (
                <span
                  className="rounded-full border border-white/12 bg-slate-950/72 px-2 py-1 text-[7px] font-black uppercase tracking-[0.09em] text-slate-200 backdrop-blur"
                  key={item}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="flex min-h-[240px] min-w-0 flex-col p-2.5">
            <div
              aria-label="Avatar customization categories"
              className="grid grid-cols-7 overflow-hidden rounded-[10px] border border-white/10 bg-slate-950/48"
              role="tablist"
            >
              {avatarLabTabs.map(({ icon: Icon, id, label }) => {
                const active = activeTab === id;
                return (
                  <button
                    aria-selected={active}
                    className={`grid min-h-12 min-w-0 place-items-center gap-0.5 border-r border-white/8 px-1 py-1.5 text-[7px] font-black uppercase tracking-[0.06em] transition last:border-r-0 ${
                      active
                        ? "bg-cyan-300/16 text-cyan-100 shadow-[inset_0_-2px_0_rgba(103,232,249,0.9)]"
                        : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-200"
                    }`}
                    key={id}
                    onClick={() => setActiveTab(id)}
                    role="tab"
                    type="button"
                  >
                    <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2.1} />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-2.5 min-h-0 flex-1">
              {activeTab === "body" ? (
                <>
                  <div className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/72">
                    Athlete Profile
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {avatarBodyOptions.map(({ icon: Icon, ...option }) => (
                      <AvatarLabChoice
                        active={appearance.body === option.id}
                        key={option.id}
                        label={option.label}
                        onClick={() => updateAppearance("body", option.id)}
                        preview={
                          <Icon
                            aria-hidden="true"
                            className="h-5 w-5 text-cyan-100"
                            strokeWidth={2.2}
                          />
                        }
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-[9px] leading-4 text-slate-400">
                    Both profiles share the same articulated joint rig, clothing system,
                    gear, and motion library.
                  </p>
                </>
              ) : null}

              {activeTab === "face" ? (
                <>
                  <div className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/72">
                    Facial Features
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {avatarFaceOptions.map((option) => (
                      <AvatarLabChoice
                        active={appearance.face === option.id}
                        key={option.id}
                        label={option.label}
                        onClick={() => updateAppearance("face", option.id)}
                        preview={
                          <Smile
                            aria-hidden="true"
                            className="h-5 w-5 text-cyan-100"
                            strokeWidth={2.2}
                          />
                        }
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-[9px] leading-4 text-slate-400">
                    Expressions adjust the brows, eyes, and mouth while natural blinking and gaze movement stay active.
                  </p>
                </>
              ) : null}

              {activeTab === "outfit" ? (
                <>
                  <div className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/72">
                    Suit Finish
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {avatarOutfitOptions.map((option) => (
                      <AvatarLabChoice
                        active={appearance.outfit === option.id}
                        key={option.id}
                        label={option.label}
                        onClick={() => updateAppearance("outfit", option.id)}
                        preview={
                          <span
                            className="h-5 w-5 rounded-[6px] border border-white/20"
                            style={{
                              background: `linear-gradient(135deg, ${option.colors[0]}, ${option.colors[1]})`,
                            }}
                          />
                        }
                      />
                    ))}
                  </div>
                </>
              ) : null}

              {activeTab === "skin" ? (
                <>
                  <div className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/72">
                    Skin Tone
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {avatarSkinOptions.map((option) => (
                      <AvatarLabChoice
                        active={appearance.skin === option.id}
                        key={option.id}
                        label={option.label}
                        onClick={() => updateAppearance("skin", option.id)}
                        preview={
                          <span
                            className="h-5 w-5 rounded-full border border-white/24 shadow-[inset_0_1px_2px_rgba(255,255,255,0.28)]"
                            style={{ backgroundColor: option.color }}
                          />
                        }
                      />
                    ))}
                  </div>
                </>
              ) : null}

              {activeTab === "hair" ? (
                <>
                  <div className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/72">
                    Hair Style
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {avatarHairOptions.map((option) => (
                      <AvatarLabChoice
                        active={appearance.hair === option.id}
                        key={option.id}
                        label={option.label}
                        onClick={() => updateAppearance("hair", option.id)}
                        preview={
                          <CircleUserRound
                            aria-hidden="true"
                            className="h-5 w-5 text-amber-100"
                            strokeWidth={2.2}
                          />
                        }
                      />
                    ))}
                  </div>
                </>
              ) : null}

              {activeTab === "gear" ? (
                <>
                  <div className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/72">
                    Training Gear
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {avatarGearOptions.map((option) => (
                      <AvatarLabChoice
                        active={appearance.gear === option.id}
                        key={option.id}
                        label={option.label}
                        onClick={() => updateAppearance("gear", option.id)}
                        preview={
                          option.id === "visor" ? (
                            <Glasses aria-hidden="true" className="h-5 w-5 text-cyan-100" />
                          ) : (
                            <Sparkles aria-hidden="true" className="h-5 w-5 text-amber-100" />
                          )
                        }
                      />
                    ))}
                  </div>
                </>
              ) : null}

              {activeTab === "motion" ? (
                <>
                  <div className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/72">
                    Emote Loop
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {avatarMotionOptions.map((option) => (
                      <AvatarLabChoice
                        active={emotePreset === option.id}
                        key={option.id}
                        label={option.label}
                        onClick={() => onEmoteChange(option.id)}
                        preview={
                          <Activity
                            aria-hidden="true"
                            className="h-5 w-5 text-emerald-100"
                            strokeWidth={2.2}
                          />
                        }
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-slate-950/46 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <button
              className="inline-flex min-h-9 items-center gap-1.5 rounded-[9px] border border-white/12 bg-white/[0.035] px-2.5 text-[8px] font-black uppercase tracking-[0.1em] text-slate-300 transition hover:border-amber-200/38 hover:text-amber-100"
              onClick={onReset}
              type="button"
            >
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
              Reset
            </button>
            <Link
              className="inline-flex min-h-9 items-center gap-1.5 rounded-[9px] border border-white/12 bg-white/[0.035] px-2.5 text-[8px] font-black uppercase tracking-[0.1em] text-slate-300 transition hover:border-cyan-200/38 hover:text-cyan-100"
              href={bodyMapHref}
            >
              Body Map
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </div>
          <button
            className="inline-flex min-h-9 items-center gap-2 rounded-[9px] border border-cyan-100/58 bg-cyan-300/18 px-4 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-50 shadow-[0_0_20px_rgba(34,211,238,0.2)] transition hover:bg-cyan-300/26"
            onClick={onClose}
            type="button"
          >
            Done
            <Check aria-hidden="true" className="h-4 w-4" strokeWidth={2.8} />
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function TrainingCategorySelector({
  centered = false,
  compact = false,
  selectedGroupId,
  onSelectGroup,
}: {
  centered?: boolean;
  /** Always use the centred active-plus-previews trio, never the wide rail. */
  compact?: boolean;
  selectedGroupId: string;
  onSelectGroup: (id: string) => void;
}) {
  const {
    canScrollBackward,
    canScrollForward,
    scrollRef,
    scrollToIndex,
  } = useScrollControls("horizontal");
  const selectedIndex = Math.max(
    0,
    bodyPartGroups.findIndex((group) => group.id === selectedGroupId),
  );
  const selectedGroup = bodyPartGroups[selectedIndex];
  const selectedTone = statToneClasses[selectedGroup.tone];

  const moveSelection = (direction: -1 | 1) => {
    const nextIndex =
      (selectedIndex + direction + bodyPartGroups.length) %
      bodyPartGroups.length;
    onSelectGroup(bodyPartGroups[nextIndex].id);
    window.requestAnimationFrame(() => scrollToIndex(nextIndex));
  };

  return (
    <div className="min-w-0">
      {/* Arrows flank the title instead of taking their own row below the
          chips, and render plain (no circular container) — saves a full row of
          card height. */}
      <div className="mb-1 flex items-center gap-1">
        <span className="h-px flex-1 bg-cyan-100/16" />
        <ScrollControlButton
          direction="left"
          label="Highlight previous training category"
          onClick={() => moveSelection(-1)}
          plain
        />
        <span
          className={`flex min-w-0 shrink flex-col items-center text-[7px] font-black uppercase leading-[1.15] tracking-[0.04em] min-[520px]:text-[9px] min-[520px]:tracking-[0.18em] ${selectedTone.text}`}
        >
          <span>Training</span>
          <span>Categories</span>
        </span>
        <ScrollControlButton
          direction="right"
          label="Highlight next training category"
          onClick={() => moveSelection(1)}
          plain
        />
        <span className="h-px flex-1 bg-cyan-100/16" />
      </div>

      <div className="min-w-0">
        <div
          className={`hidden min-w-0 snap-x snap-mandatory items-center gap-2 overflow-x-auto overscroll-x-contain rounded-[18px] border border-cyan-100/16 bg-cyan-300/[0.035] px-2 py-2 shadow-[inset_0_0_16px_rgba(34,211,238,0.05)] [scroll-padding-inline:0.5rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${compact ? "" : "min-[760px]:flex"} ${centered && !canScrollBackward && !canScrollForward ? "justify-center" : ""}`}
          ref={scrollRef}
        >
          {bodyPartGroups.map((group) => renderCategoryChip(group, "rail"))}
        </div>
        {/* Narrow widths: the selected category sits centred with one preview
            on each side, matching the hero orbit's indicator pattern, instead
            of a rail that clips whatever does not fit. */}
        <div
          className={`flex min-w-0 items-center justify-center gap-1.5 rounded-[18px] border border-cyan-100/16 bg-cyan-300/[0.035] px-1.5 py-2 shadow-[inset_0_0_16px_rgba(34,211,238,0.05)] ${compact ? "" : "min-[760px]:hidden"}`}
        >
          {renderCategoryChip(
            bodyPartGroups[
              (selectedIndex - 1 + bodyPartGroups.length) %
                bodyPartGroups.length
            ],
            "side",
          )}
          {renderCategoryChip(bodyPartGroups[selectedIndex], "center")}
          {renderCategoryChip(
            bodyPartGroups[(selectedIndex + 1) % bodyPartGroups.length],
            "side",
          )}
        </div>
      </div>
    </div>
  );

  function renderCategoryChip(
    group: BodyPartGroup,
    variant: "rail" | "center" | "side",
  ) {
    const active = group.id === selectedGroupId;
    const groupTone = statToneClasses[group.tone];
    // Already the sum of every muscle in the group, so the ring shows the
    // category's combined sets for the last 7 days.
    const groupLoad = getBodyPartGroupLoad(group);
    const groupStatus = getSevenDayTrainingStatus(groupLoad);
    const statusTheme = sevenDayStatusTheme[groupStatus];
    const fill = getSevenDayFill(groupLoad);
    const isSide = variant === "side";
    return (
      <button
        aria-current={active && !isSide ? "true" : undefined}
        aria-label={`${group.label}, ${statusTheme.label}, ${groupLoad.completed} of ${groupLoad.target} planned sets in the last 7 days`}
        className={`relative grid shrink-0 snap-start place-items-center rounded-full transition-[box-shadow,outline-color,opacity] duration-300 ${groupTone.icon} ${statusTheme.border} ${
          isSide
            ? "hidden h-11 w-11 opacity-60 min-[520px]:grid"
            : "h-14 w-14"
        } ${
          active && !isSide
            ? `${statusTheme.shadow}`
            : "shadow-[0_0_18px_rgba(34,211,238,0.09),inset_0_1px_0_rgba(255,255,255,0.08)]"
        }`}
        data-dashboard-tooltip={`${group.label}: ${statusTheme.label} — ${groupLoad.completed}/${groupLoad.target} sets in 7 days`}
        key={`${variant === "rail" ? "rail" : "trio"}-${isSide ? `side-${group.id}` : group.id}`}
        onClick={() => onSelectGroup(group.id)}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full rotate-45"
          viewBox="0 0 72 72"
        >
          <circle
            cx="36"
            cy="36"
            fill="none"
            r="33"
            stroke="rgba(148,163,184,0.14)"
            strokeWidth="5"
          />
          <circle
            cx="36"
            cy="36"
            fill="none"
            pathLength="100"
            r="33"
            stroke={statusTheme.ring}
            strokeDasharray="100"
            strokeDashoffset={100 - fill}
            strokeLinecap="round"
            strokeWidth="5"
          />
        </svg>
        <span className="relative flex max-w-[58px] flex-col items-center text-center leading-none">
          <span
            className={`block max-w-full truncate font-black uppercase leading-tight tracking-normal ${groupTone.text} ${isSide ? "text-[8px]" : "text-[9px]"}`}
          >
            {group.label}
          </span>
          {isSide ? null : (
            <span
              className={`mt-1 text-[8px] font-black uppercase leading-tight tracking-normal ${statusTheme.text}`}
            >
              {groupLoad.completed}/{groupLoad.target}
              <span className="ml-0.5 text-[6px] text-slate-400">sets</span>
            </span>
          )}
        </span>
      </button>
    );
  }
}

function MuscleDetailDialog({
  onClose,
  onNavigate,
  slug,
}: {
  onClose: () => void;
  onNavigate: (direction: -1 | 1) => void;
  slug: BodyCommandMuscleSlug;
}) {
  const meta = muscleMeta[slug];
  const details = muscleDetailMeta[slug] ?? {
    parts: [meta.label],
    recentMovements: [meta.status, "Compound support", "Controlled isolation"],
  };
  const categoryTone = statToneClasses[meta.tone];
  const trainingStatus = getSevenDayTrainingStatus(meta.load);
  const statusTheme = sevenDayStatusTheme[trainingStatus];
  const fill = getSevenDayFill(meta.load);
  const recentSessions = Math.max(1, Math.ceil(meta.load.completed / 4));
  const lastTrained = trainingStatus === "over" ? "Yesterday" : trainingStatus === "good" ? "2 days ago" : "5 days ago";

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/76 p-[clamp(10px,3vw,24px)] backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        aria-label={`${meta.label} training details`}
        aria-modal="true"
        className={`relative flex max-h-[calc(100dvh-20px)] w-full max-w-[620px] flex-col overflow-hidden rounded-[14px] border bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.13),transparent_34%),radial-gradient(circle_at_92%_16%,rgba(251,191,36,0.09),transparent_28%),linear-gradient(145deg,rgba(10,18,34,0.97),rgba(2,6,23,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.12)] ${statusTheme.border}`}
        role="dialog"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border text-[11px] font-black ${categoryTone.icon}`}>
              {meta.load.completed}/{meta.load.target}
            </span>
            <span className="min-w-0">
              <span className={`block text-[8px] font-black uppercase tracking-[0.16em] ${categoryTone.text}`}>
                {meta.family}
              </span>
              <span className="block truncate text-xl font-black uppercase tracking-[0.03em] text-white">
                {meta.label}
              </span>
            </span>
          </div>
          <button
            aria-label="Close muscle details"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.035] text-slate-300 transition hover:border-cyan-100/38 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 [scrollbar-color:rgba(34,211,238,0.38)_rgba(15,23,42,0.32)] [scrollbar-width:thin]">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["7-day sets", `${meta.load.completed}`],
              ["Plan target", `${meta.load.target}`],
              ["Sessions", `${recentSessions}`],
              ["Last trained", lastTrained],
            ].map(([label, value]) => (
              <div className="min-w-0 rounded-[8px] border border-white/9 bg-white/[0.035] px-2.5 py-2" key={label}>
                <span className="block text-[7px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
                <span className="mt-1 block truncate text-sm font-black text-slate-100">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-[10px] border border-white/10 bg-slate-950/38 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">Seven-day plan volume</span>
              <span className={`text-[8px] font-black uppercase tracking-[0.1em] ${statusTheme.text}`}>{statusTheme.label}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-950/80 ring-1 ring-white/8">
              <span
                className="block h-full rounded-full transition-[width] duration-500"
                style={{ backgroundColor: statusTheme.ring, width: `${fill}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[8px] font-bold text-slate-400">
              <span>{meta.load.completed} completed sets</span>
              <span>{meta.load.target} target sets</span>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <h3 className={`text-[8px] font-black uppercase tracking-[0.16em] ${categoryTone.text}`}>Muscle grouping</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {details.parts.map((part) => (
                  <span className={`rounded-full border px-2 py-1 text-[8px] font-black ${categoryTone.icon}`} key={part}>{part}</span>
                ))}
              </div>
            </div>
            <div>
              <h3 className={`text-[8px] font-black uppercase tracking-[0.16em] ${categoryTone.text}`}>Recent training</h3>
              <div className="mt-2 space-y-1.5">
                {details.recentMovements.map((movement, index) => (
                  <div className="flex items-center justify-between gap-3 rounded-[7px] border border-white/8 bg-white/[0.025] px-2 py-1.5" key={movement}>
                    <span className="text-[9px] font-bold text-slate-200">{movement}</span>
                    <span className="text-[7px] font-black uppercase text-slate-500">{Math.max(1, recentSessions - index)} touch{Math.max(1, recentSessions - index) === 1 ? "" : "es"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`mt-3 rounded-[10px] border p-3 ${categoryTone.icon}`}>
            <span className="block text-[8px] font-black uppercase tracking-[0.16em]">Plan insight</span>
            <p className="mt-1.5 text-[11px] font-semibold leading-relaxed text-slate-100">{getMuscleTrainingInsight(slug)}</p>
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-between border-t border-white/10 bg-slate-950/42 px-4 py-2.5">
          <button aria-label="Previous muscle group" className="grid h-9 w-9 place-items-center rounded-full border border-white/12 text-slate-200 transition hover:border-cyan-100/42 hover:text-cyan-100" onClick={() => onNavigate(-1)} type="button">
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <span className="text-center text-[8px] font-black uppercase tracking-[0.13em] text-slate-400">Browse muscle groups</span>
          <button aria-label="Next muscle group" className="grid h-9 w-9 place-items-center rounded-full border border-white/12 text-slate-200 transition hover:border-cyan-100/42 hover:text-cyan-100" onClick={() => onNavigate(1)} type="button">
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function MuscleGroupPanel({
  compact = false,
  showTitle = true,
  selectedGroupId,
}: {
  compact?: boolean;
  showTitle?: boolean;
  selectedGroupId: string;
}) {
  const selectedGroup =
    bodyPartGroups.find((group) => group.id === selectedGroupId) ??
    bodyPartGroups[0];
  const selectedTone = statToneClasses[selectedGroup.tone];
  const {
    scrollRef,
    scrollToIndex,
  } = useScrollControls("vertical");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [detailSlug, setDetailSlug] = useState<BodyCommandMuscleSlug | null>(null);
  const safeHighlightedIndex = Math.min(
    highlightedIndex,
    selectedGroup.muscles.length - 1,
  );

  useEffect(() => {
    if (!detailSlug) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailSlug(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [detailSlug]);

  const moveHighlight = (direction: -1 | 1) => {
    setHighlightedIndex((currentIndex) => {
      const nextIndex =
        (currentIndex + direction + selectedGroup.muscles.length) %
        selectedGroup.muscles.length;

      if (!compact) {
        window.requestAnimationFrame(() => scrollToIndex(nextIndex));
      }
      return nextIndex;
    });
  };

  const visibleMuscles = compact
    ? [{ index: safeHighlightedIndex, slug: selectedGroup.muscles[safeHighlightedIndex] }]
    : selectedGroup.muscles.map((slug, index) => ({ index, slug }));

  const navigateDetail = (direction: -1 | 1) => {
    if (!detailSlug) return;
    const currentIndex = muscleDetailOrder.indexOf(detailSlug);
    const nextIndex =
      (currentIndex + direction + muscleDetailOrder.length) % muscleDetailOrder.length;
    setDetailSlug(muscleDetailOrder[nextIndex]);
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {compact ? (
        <div className="mb-1 grid grid-cols-[24px_minmax(0,1fr)_24px] items-center gap-1">
          <ScrollControlButton
            direction="left"
            label="Highlight previous muscle level"
            onClick={() => moveHighlight(-1)}
            plain
          />
          <span className={`flex flex-col text-center text-[9px] font-black uppercase leading-[1.2] tracking-normal ${selectedTone.text}`}>
            <span>Muscle</span>
            <span>Levels</span>
          </span>
          <ScrollControlButton
            direction="right"
            label="Highlight next muscle level"
            onClick={() => moveHighlight(1)}
            plain
          />
        </div>
      ) : showTitle ? (
        <div className="mb-2 flex items-center gap-1">
          <span className="h-px flex-1 bg-cyan-100/16" />
          <span className={`shrink-0 text-[8px] font-black uppercase tracking-[0.1em] min-[760px]:text-[9px] min-[760px]:tracking-[0.18em] ${selectedTone.text}`}>
            Muscle Levels
          </span>
          <span className="h-px flex-1 bg-cyan-100/16" />
        </div>
      ) : null}

      <div className="relative flex min-h-0 flex-1 flex-col overflow-visible">
        {!compact ? (
          <div className="relative z-30 mb-1 flex shrink-0 items-center justify-between px-2">
            <ScrollControlButton
              direction="down"
              label="Highlight next muscle level"
              onClick={() => moveHighlight(1)}
            />
            <ScrollControlButton
              direction="up"
              label="Highlight previous muscle level"
              onClick={() => moveHighlight(-1)}
            />
          </div>
        ) : null}
        <div
          className={`grid min-h-0 flex-1 grid-cols-1 content-start gap-2 rounded-[14px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${compact ? "overflow-hidden" : "overflow-y-auto overscroll-y-contain border border-cyan-100/14 bg-cyan-300/[0.025] p-1 shadow-[inset_0_0_20px_rgba(34,211,238,0.045)] min-[760px]:grid-cols-2"}`}
          ref={scrollRef}
        >
          {visibleMuscles.map(({ index, slug }) => {
            const meta = muscleMeta[slug];
            const categoryTone = statToneClasses[meta.tone];
            const trainingStatus = getSevenDayTrainingStatus(meta.load);
            const statusTheme = sevenDayStatusTheme[trainingStatus];
            const fill = getSevenDayFill(meta.load);
            return (
              <div
                aria-current={index === highlightedIndex ? "true" : undefined}
                className="relative grid min-h-[92px] min-w-0 place-items-center px-1 py-2 min-[760px]:min-h-[104px] min-[760px]:px-2"
                key={slug}
              >
                <button
                  aria-label={`${meta.label}, ${meta.family}, ${statusTheme.label}, ${meta.load.completed} of ${meta.load.target} planned sets in the last 7 days`}
                  aria-haspopup="dialog"
                  className={`relative grid h-16 w-16 shrink-0 place-items-center rounded-full transition-[box-shadow,outline-color] duration-300 min-[760px]:h-[78px] min-[760px]:w-[78px] ${categoryTone.icon} ${statusTheme.border} ${
                    index === safeHighlightedIndex
                      ? `${statusTheme.shadow}`
                      : "shadow-[0_0_18px_rgba(34,211,238,0.09),inset_0_1px_0_rgba(255,255,255,0.08)]"
                  }`}
                  data-dashboard-tooltip={`${meta.label}: ${meta.load.completed}/${meta.load.target} sets. Open details.`}
                  onClick={() => {
                    setHighlightedIndex(index);
                    setDetailSlug(slug);
                  }}
                  type="button"
                >
                  <svg
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full rotate-45"
                    viewBox="0 0 72 72"
                  >
                    <circle
                      cx="36"
                      cy="36"
                      fill="none"
                      r="33"
                      stroke="rgba(148,163,184,0.14)"
                      strokeWidth="5"
                    />
                    <circle
                      cx="36"
                      cy="36"
                      fill="none"
                      pathLength="100"
                      r="33"
                      stroke={statusTheme.ring}
                      strokeDasharray="100"
                      strokeDashoffset={100 - fill}
                      strokeLinecap="round"
                      strokeWidth="5"
                    />
                  </svg>
                  <span className="relative flex max-w-[58px] flex-col items-center text-center leading-none">
                    <span className={`text-[9px] font-black uppercase leading-tight tracking-normal ${categoryTone.text}`}>
                      {meta.label}
                    </span>
                    <span className={`mt-1 text-[8px] font-black uppercase leading-tight tracking-normal ${statusTheme.text}`}>
                      {meta.load.completed}/{meta.load.target}
                      <span className="ml-0.5 text-[6px] text-slate-400">sets</span>
                    </span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
      {detailSlug ? (
        <MuscleDetailDialog
          onClose={() => setDetailSlug(null)}
          onNavigate={navigateDetail}
          slug={detailSlug}
        />
      ) : null}
    </div>
  );
}

export default function BodyCommandCenterCard({
  bodyMapHref,
  commandCenterSlot,
}: BodyCommandCenterCardProps) {
  // Shared between the avatar hotspots and the muscle-group panel.
  const [selectedGroupId, setSelectedGroupId] = useState<string>("legs");
  const [avatarLabOpen, setAvatarLabOpen] = useState(false);
  const [avatarStorageReady, setAvatarStorageReady] = useState(false);
  const [avatarAppearance, setAvatarAppearance] =
    useState<SoundFitnessAvatarAppearance>(defaultSoundFitnessAvatarAppearance);
  const [avatarEmotePreset, setAvatarEmotePreset] =
    useState<SoundFitnessAvatarEmotePreset>("calm");
  const [avatarSceneId, setAvatarSceneId] =
    useState<AvatarScenePreset>("command");

  useEffect(() => {
    const hydrateAvatar = () => {
      try {
        const storedSceneId = window.localStorage.getItem(
          avatarSceneStorageKey,
        ) as AvatarScenePreset | null;
        const hasStoredScene = avatarSceneOptions.some(
          (option) => option.id === storedSceneId,
        );
        if (hasStoredScene) {
          setAvatarSceneId(storedSceneId!);
        }

        const rawAvatarState = window.localStorage.getItem(avatarLabStorageKey);
        if (!rawAvatarState) {
          setAvatarStorageReady(true);
          return;
        }

        const stored = JSON.parse(rawAvatarState) as {
          appearance?: Partial<SoundFitnessAvatarAppearance>;
          emotePreset?: SoundFitnessAvatarEmotePreset;
          sceneId?: AvatarScenePreset;
        };
        const nextAppearance = { ...defaultSoundFitnessAvatarAppearance };

        if (avatarBodyOptions.some((option) => option.id === stored.appearance?.body)) {
          nextAppearance.body = stored.appearance!.body!;
        }
        if (avatarFaceOptions.some((option) => option.id === stored.appearance?.face)) {
          nextAppearance.face = stored.appearance!.face!;
        }
        if (avatarOutfitOptions.some((option) => option.id === stored.appearance?.outfit)) {
          nextAppearance.outfit = stored.appearance!.outfit!;
        }
        if (avatarSkinOptions.some((option) => option.id === stored.appearance?.skin)) {
          nextAppearance.skin = stored.appearance!.skin!;
        }
        if (avatarHairOptions.some((option) => option.id === stored.appearance?.hair)) {
          nextAppearance.hair = stored.appearance!.hair!;
        }
        if (avatarGearOptions.some((option) => option.id === stored.appearance?.gear)) {
          nextAppearance.gear = stored.appearance!.gear!;
        }

        setAvatarAppearance(nextAppearance);
        setAvatarEmotePreset("calm");
        if (
          !hasStoredScene &&
          avatarSceneOptions.some((option) => option.id === stored.sceneId)
        ) {
          setAvatarSceneId(stored.sceneId!);
        }
      } catch {
        window.localStorage.removeItem(avatarLabStorageKey);
      } finally {
        setAvatarStorageReady(true);
      }
    };

    const animationFrame = window.requestAnimationFrame(hydrateAvatar);
    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  useEffect(() => {
    if (!avatarStorageReady) return;

    window.localStorage.setItem(
      avatarLabStorageKey,
      JSON.stringify({
        appearance: avatarAppearance,
        emotePreset: avatarEmotePreset,
        sceneId: avatarSceneId,
      }),
    );
  }, [avatarAppearance, avatarEmotePreset, avatarSceneId, avatarStorageReady]);

  useEffect(() => {
    if (!avatarStorageReady) return;
    window.localStorage.setItem(avatarSceneStorageKey, avatarSceneId);
  }, [avatarSceneId, avatarStorageReady]);

  useEffect(() => {
    if (avatarEmotePreset === "calm") return;
    const restTimer = window.setTimeout(() => setAvatarEmotePreset("calm"), 4200);
    return () => window.clearTimeout(restTimer);
  }, [avatarEmotePreset]);

  useEffect(() => {
    if (!avatarLabOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAvatarLabOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [avatarLabOpen]);

  const activeAvatarScene =
    avatarSceneOptions.find((option) => option.id === avatarSceneId) ??
    avatarSceneOptions[0];

  return (
    <div
      aria-label="Body Command Center"
      className="dashboard-hero-card dashboard-hero-card--body-command relative z-10 flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden overscroll-contain rounded-[30px] border border-cyan-100/22 bg-[radial-gradient(circle_at_50%_-8%,rgba(34,211,238,0.24),transparent_34%),radial-gradient(circle_at_9%_32%,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_90%_22%,rgba(251,191,36,0.13),transparent_27%),linear-gradient(135deg,rgba(8,13,26,0.98),rgba(2,6,23,0.94))] p-3 shadow-[0_30px_82px_rgba(0,0,0,0.54),0_0_54px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 scale-[1.01] bg-cover transition-[background-image,background-position,filter] duration-700"
        style={{
          backgroundImage: `url("${activeAvatarScene.image}")`,
          backgroundPosition: "center bottom",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.62),rgba(2,6,23,0.43)_46%,rgba(2,6,23,0.56)),linear-gradient(180deg,rgba(2,6,23,0.2),rgba(2,6,23,0.08)_42%,rgba(2,6,23,0.48))]"
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(125,211,252,0.075)_1px,transparent_1px),linear-gradient(180deg,rgba(125,211,252,0.055)_1px,transparent_1px)] bg-[length:38px_38px] opacity-55" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/80 to-transparent" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-28 w-72 -translate-x-1/2 rounded-full bg-amber-300/8 blur-3xl" />

      <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
        {commandCenterSlot ? (
          <div className="min-w-[min(100%,18rem)] flex-1">{commandCenterSlot}</div>
        ) : null}
      </div>

      <div className="relative z-10 mt-3 grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-2">
        {/* Two columns: the avatar, then the category picker stacked directly
            above the muscle rings it filters — the picker decides which muscles
            appear below it, so it reads top-down. Support signals are
            independent of that selection, so they get the full-width strip. */}
        <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_112px] gap-2 min-[520px]:grid-cols-[minmax(0,1fr)_180px] min-[760px]:grid-cols-[minmax(220px,1fr)_minmax(264px,0.86fr)] min-[1000px]:gap-3">
          <div className="relative grid min-h-0 grid-rows-[minmax(0,1fr)_auto] content-stretch gap-1">
            <AvatarBodyPicker
              appearance={avatarAppearance}
              avatarSceneId={avatarSceneId}
              emotePreset={avatarEmotePreset}
              onAvatarSceneChange={setAvatarSceneId}
              onEmoteChange={setAvatarEmotePreset}
              onOpenAvatarLab={() => setAvatarLabOpen(true)}
              onSelectGroup={setSelectedGroupId}
              selectedGroupId={selectedGroupId}
            />
            <AvatarDetailLegend />
          </div>

          <div className="flex min-h-0 min-w-0 flex-col gap-2 overflow-hidden pr-1">
            <TrainingCategorySelector
              compact
              onSelectGroup={setSelectedGroupId}
              selectedGroupId={selectedGroupId}
            />
            <div className="flex min-h-0 min-w-0 flex-1 min-[760px]:hidden">
              <MuscleGroupPanel
                compact
                key={selectedGroupId}
                selectedGroupId={selectedGroupId}
                showTitle={false}
              />
            </div>
            <div className="hidden min-h-0 min-w-0 flex-1 min-[760px]:flex">
              <MuscleGroupPanel
                key={selectedGroupId}
                selectedGroupId={selectedGroupId}
              />
            </div>
          </div>
        </div>

        <div className="min-w-0 shrink-0 border-t border-cyan-100/10 pt-2">
          <div className="mx-auto w-full max-w-[760px] min-w-0">
            <BodyStatStack
              label="Support Signals"
              stats={bodyCommandSupportStats}
            />
          </div>
        </div>
      </div>

      {avatarLabOpen ? (
        <AvatarLabMenu
          appearance={avatarAppearance}
          bodyMapHref={bodyMapHref}
          emotePreset={avatarEmotePreset}
          onAppearanceChange={setAvatarAppearance}
          onClose={() => setAvatarLabOpen(false)}
          onEmoteChange={setAvatarEmotePreset}
          onReset={() => {
            setAvatarAppearance(defaultSoundFitnessAvatarAppearance);
            setAvatarEmotePreset("calm");
            setAvatarSceneId("command");
          }}
        />
      ) : null}
    </div>
  );
}

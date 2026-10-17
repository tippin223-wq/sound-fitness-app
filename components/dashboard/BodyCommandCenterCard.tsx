"use client";

import {
  defaultSoundFitnessAvatarAppearance,
  sanitizeSoundFitnessAvatarAppearance,
  soundFitnessAvatarEyesPalettes,
  soundFitnessAvatarFaces,
  soundFitnessAvatarGear,
  soundFitnessAvatarHairColorPalettes,
  soundFitnessAvatarHairStyles,
  soundFitnessAvatarPantsPalettes,
  soundFitnessAvatarShirtPalettes,
  soundFitnessAvatarShoesPalettes,
  soundFitnessAvatarSkinPalettes,
  type SoundFitnessAvatarAppearance,
  type SoundFitnessAvatarBodyPart,
  type SoundFitnessAvatarBodyPreset,
  type SoundFitnessAvatarEmotePreset,
  type SoundFitnessAvatarEyesPreset,
  type SoundFitnessAvatarFacePreset,
  type SoundFitnessAvatarGearPreset,
  type SoundFitnessAvatarGlowRegion,
  type SoundFitnessAvatarHairColorPreset,
  type SoundFitnessAvatarHairPreset,
  type SoundFitnessAvatarPantsPreset,
  type SoundFitnessAvatarShirtPreset,
  type SoundFitnessAvatarShoesPreset,
  type SoundFitnessAvatarSkinPreset,
} from "@/components/dashboard/soundFitnessAvatarAppearance";
import SoundFitnessAvatar3D from "@/components/dashboard/SoundFitnessAvatar3D";
import {
  BodyCommandRingFace,
  type BodyCommandGlyphName,
} from "@/components/dashboard/BodyCommandGlyph";
import { getSegmentedRingDashes } from "@/components/dashboard/segmentedRing";
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
  Info,
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
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useMemo,
  useSyncExternalStore,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type ReactNode,
} from "react";
import { bodyCommandEvidenceSnapshot, serverBodyCommandEvidence, type BodyCommandEvidence } from "@/lib/planning/bodyCommandEvidence";
import { subscribeDashboardPlanEvidence } from "@/lib/planning/dashboardPlanEvidence";
import { createPortal } from "react-dom";
import layoutStyles from "./BodyCommandCenterLayout.module.css";
import type { MuscleSlug } from "@/components/anatomy/exerciseMuscleMap";

type BodyStatTone = "blue" | "cyan" | "emerald" | "gold" | "lime" | "purple" | "rose" | "teal";

type SevenDayTrainingLoad = {
  completed: number;
  target: number;
  unit: "checks" | "sessions" | "sets";
};

type SevenDayTrainingStatus = "good" | "over" | "overworked" | "primed" | "urgent" | "unknown" | "recorded";

type BodyStatCardDefinition = {
  evidence?: "recorded" | "unavailable";
  evidenceMessage?: string;
  average: {
    ariaLabel: string;
    detail: string;
    value: string;
  };
  glyph: BodyCommandGlyphName;
  label: string;
  load: SevenDayTrainingLoad;
  ringAriaLabel?: string;
  ringLoad?: SevenDayTrainingLoad;
  status?: SevenDayTrainingStatus;
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

const avatarLabStorageKey = "soundFitnessAvatarLabV2";
// A fresh choice keeps its part lit on the figure this long (then fades).
const avatarSelectionPulseMs = 2600;
// A menu target previews on the figure once the pointer has rested on it
// this long, so passing across the rails lights and turns nothing.
const menuHoverIntentMs = 140;
const avatarLabLegacyStorageKey = "soundFitnessAvatarLabV1";
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
  { icon: Shirt, id: "outfit", label: "Outfit" },
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

const entries = <T extends string, V>(record: Record<T, V>) =>
  Object.entries(record) as Array<[T, V]>;

const avatarFaceOptions: Array<{
  id: SoundFitnessAvatarFacePreset;
  label: string;
}> = entries(soundFitnessAvatarFaces).map(([id, { label }]) => ({ id, label }));

const avatarEyeOptions: Array<{
  color: string;
  id: SoundFitnessAvatarEyesPreset;
  label: string;
}> = entries(soundFitnessAvatarEyesPalettes).map(([id, { iris, label }]) => ({
  color: iris,
  id,
  label,
}));

const avatarShirtOptions: Array<{
  colors: [string, string];
  id: SoundFitnessAvatarShirtPreset;
  label: string;
}> = entries(soundFitnessAvatarShirtPalettes).map(([id, { accent, base, label }]) => ({
  colors: [accent, base],
  id,
  label,
}));

const avatarPantsOptions: Array<{
  colors: [string, string];
  id: SoundFitnessAvatarPantsPreset;
  label: string;
}> = entries(soundFitnessAvatarPantsPalettes).map(([id, { base, label, trim }]) => ({
  colors: [trim, base],
  id,
  label,
}));

const avatarShoeOptions: Array<{
  colors: [string, string];
  id: SoundFitnessAvatarShoesPreset;
  label: string;
}> = entries(soundFitnessAvatarShoesPalettes).map(([id, { base, label, sole }]) => ({
  colors: [sole, base],
  id,
  label,
}));

const avatarSkinOptions: Array<{
  color: string;
  id: SoundFitnessAvatarSkinPreset;
  label: string;
}> = entries(soundFitnessAvatarSkinPalettes).map(([id, { base, label }]) => ({
  color: base,
  id,
  label,
}));

const avatarHairOptions: Array<{
  id: SoundFitnessAvatarHairPreset;
  label: string;
}> = entries(soundFitnessAvatarHairStyles).map(([id, { label }]) => ({ id, label }));

const avatarHairColorOptions: Array<{
  color: string;
  id: SoundFitnessAvatarHairColorPreset;
  label: string;
}> = entries(soundFitnessAvatarHairColorPalettes).map(([id, { base, label }]) => ({
  color: base,
  id,
  label,
}));

const avatarGearOptions: Array<{
  id: SoundFitnessAvatarGearPreset;
  label: string;
}> = entries(soundFitnessAvatarGear).map(([id, { label }]) => ({ id, label }));

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

// Support-signal rings use the same scale as the number printed in the loader
// so the visual fill reads as "current value / total" instead of old check-in
// completion data.
const bodyCommandSupportDefinitions: Array<{ glyph: keyof BodyCommandEvidence; label: string; tone: BodyStatTone }> = [
  { glyph: "sleep", label: "Sleep", tone: "blue" }, { glyph: "stress", label: "Stress", tone: "purple" },
  { glyph: "fatigue", label: "Fatigue", tone: "gold" }, { glyph: "soreness", label: "Soreness", tone: "rose" },
  { glyph: "recovery", label: "Recovery Sessions", tone: "emerald" }, { glyph: "core", label: "Core", tone: "cyan" },
  { glyph: "fuel", label: "Fuel", tone: "lime" }, { glyph: "hydration", label: "Hydration", tone: "teal" },
];
function createBodyCommandSupportStats(evidence: BodyCommandEvidence): BodyStatCardDefinition[] {
  return bodyCommandSupportDefinitions.map(definition => {
    const reading = evidence[definition.glyph];
    return { ...definition, average: { ariaLabel: reading.description, detail: reading.detail, value: reading.value },
      load: { completed: 0, target: 0, unit: "checks" }, ringAriaLabel: "No verified target comparison is available.",
      status: reading.recorded ? "recorded" : "unknown", evidence: reading.recorded ? "recorded" : "unavailable", evidenceMessage: reading.description };
  });
}

const sevenDayStatusTheme: Record<
  SevenDayTrainingStatus,
  {
    activeBg: string;
    aura: string;
    border: string;
    fillColor: string;
    label: string;
    ring: string;
    shadow: string;
    text: string;
  }
> = {
  unknown: {     activeBg: "bg-slate-300/10", aura: "", border: "border-slate-300/30", fillColor: "rgba(148,163,184,0.08)", ring: "#94a3b8", shadow: "", text: "text-slate-300", label: "Unavailable" },
  recorded: {     activeBg: "bg-slate-300/10", aura: "", border: "border-slate-300/30", fillColor: "rgba(148,163,184,0.08)", ring: "#94a3b8", shadow: "", text: "text-slate-300", label: "Recorded" },
  urgent: {
    activeBg: "bg-amber-300/28",
    aura: "",
    border: "border-amber-300/62",
    fillColor: "rgba(251,191,36,0.2)",
    label: "Under target",
    ring: "#fbbf24",
    shadow: "shadow-[0_0_20px_rgba(251,191,36,0.22)]",
    text: "text-amber-200",
  },
  good: {
    activeBg: "bg-emerald-300/28",
    aura: "drop-shadow-[0_0_8px_rgba(52,211,153,0.34)]",
    border: "border-emerald-300/62",
    fillColor: "rgba(52,211,153,0.2)",
    label: "On target",
    ring: "#34d399",
    shadow: "shadow-[0_0_20px_rgba(52,211,153,0.22)]",
    text: "text-emerald-200",
  },
  primed: {
    activeBg: "bg-orange-400/28",
    aura: "drop-shadow-[0_0_9px_rgba(251,146,60,0.38)]",
    border: "border-orange-300/64",
    fillColor: "rgba(251,146,60,0.2)",
    label: "Prime zone",
    ring: "#fb923c",
    shadow: "shadow-[0_0_20px_rgba(251,146,60,0.24)]",
    text: "text-orange-200",
  },
  over: {
    activeBg: "bg-orange-600/28",
    aura: "",
    border: "border-orange-400/72",
    fillColor: "rgba(249,115,22,0.2)",
    label: "Above target",
    ring: "#f97316",
    shadow: "shadow-[0_0_20px_rgba(249,115,22,0.24)]",
    text: "text-orange-200",
  },
  overworked: {
    activeBg: "bg-red-500/30",
    aura: "",
    border: "border-red-300/74",
    fillColor: "rgba(248,113,113,0.22)",
    label: "Overworked",
    ring: "#f87171",
    shadow: "shadow-[0_0_22px_rgba(248,113,113,0.28)]",
    text: "text-red-200",
  },
};

function getSevenDayTrainingStatus({
  completed,
  target,
}: SevenDayTrainingLoad): SevenDayTrainingStatus {
  if (target <= 0) return "unknown";
  const ratio = completed / target;
  if (ratio < 0.8) return "urgent";
  // Workout volume reads differently from recovery: adequate/near-complete
  // weekly sets are the orange prime zone, not green. Going above the
  // recommendation starts warning toward red; 25% over becomes overworked.
  if (ratio <= 1) return "primed";
  if (ratio < 1.25) return "over";
  return "overworked";
}

function getSupportSignalStatus({
  completed,
  target,
}: SevenDayTrainingLoad): SevenDayTrainingStatus {
  const ratio = target > 0 ? completed / target : 0;
  if (ratio < 0.8) return "urgent";
  if (ratio > 1.25) return "overworked";
  // For rest/recovery support signals, green is the healthy "adequate" state.
  return "good";
}

function formatTrainingLoad(load: SevenDayTrainingLoad) { return load.target > 0 ? `${load.completed}/${load.target}` : "—"; }
function describeTrainingLoad(load: SevenDayTrainingLoad) { return load.target > 0 ? `${load.completed} of ${load.target} planned sets in the last 7 days` : "Muscle-specific recorded sets and plan targets are not mapped"; }

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

    // Coalesce to one measurement per frame. A category step remounts the
    // muscle panel, which lands as dozens of subtree mutations plus a resize
    // per child; running the read (forced layout) and the two state sets for
    // each of them stacked into a ~100ms observer callback. (Speed audit.)
    let frame: number | null = null;
    const scheduleUpdate = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        updateScrollAvailability();
      });
    };

    element.addEventListener("scroll", scheduleUpdate, { passive: true });

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(element);
    Array.from(element.children).forEach((child) => resizeObserver.observe(child));

    const mutationObserver = new MutationObserver(scheduleUpdate);
    mutationObserver.observe(element, { childList: true, subtree: true });

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      element.removeEventListener("scroll", scheduleUpdate);
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

function useHorizontalDragScroll(scrollRef: RefObject<HTMLDivElement | null>) {
  const dragRef = useRef<{
    moved: boolean;
    pointerId: number;
    scrollLeft: number;
    startX: number;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const element = scrollRef.current;
      if (!element || element.scrollWidth <= element.clientWidth + 2) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      dragRef.current = {
        moved: false,
        pointerId: event.pointerId,
        scrollLeft: element.scrollLeft,
        startX: event.clientX,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
      event.stopPropagation();
    },
    [scrollRef],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      const element = scrollRef.current;
      if (!drag || drag.pointerId !== event.pointerId || !element) return;

      const deltaX = event.clientX - drag.startX;
      if (Math.abs(deltaX) > 3) {
        drag.moved = true;
        suppressClickRef.current = true;
        event.preventDefault();
      }

      element.scrollLeft = drag.scrollLeft - deltaX;
      event.stopPropagation();
    },
    [scrollRef],
  );

  const finishDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
    event.stopPropagation();
  }, []);

  const handleClickCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;

    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return {
    onClickCapture: handleClickCapture,
    onPointerCancel: finishDrag,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: finishDrag,
  };
}

type MenuHoverBinding = {
  onBlur: () => void;
  onFocus: (event: ReactFocusEvent<HTMLElement>) => void;
  onPointerEnter: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
};

/**
 * Menu hover with intent. A ring or arrow under the pointer previews on the
 * figure only after the pointer has rested on it for a moment, so passing
 * across the rails lights and turns nothing. A pointer that has not moved
 * since the last press is ignored: the rails remount under it after a pick
 * and the browser fires enter on whatever landed there. Keyboard focus
 * previews the same way; blur, leave and a press clear it.
 */
function useMenuHoverIntent<T>(report: (value: T | null) => void) {
  const reportRef = useRef(report);
  reportRef.current = report;
  const timerRef = useRef(0);
  const pendingRef = useRef<T | null>(null);
  const settledRef = useRef<T | null>(null);
  const pressPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastMoveRef = useRef<{ x: number; y: number } | null>(null);
  const clear = useCallback(() => {
    window.clearTimeout(timerRef.current);
    timerRef.current = 0;
    pendingRef.current = null;
    if (settledRef.current !== null) {
      settledRef.current = null;
      reportRef.current(null);
    }
  }, []);
  const arm = useCallback((value: T) => {
    if (pendingRef.current === value || settledRef.current === value) return;
    window.clearTimeout(timerRef.current);
    pendingRef.current = value;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = 0;
      pendingRef.current = null;
      settledRef.current = value;
      reportRef.current(value);
    }, menuHoverIntentMs);
  }, []);
  const movedSincePress = (event: ReactPointerEvent<HTMLElement>) => {
    const point = pressPointRef.current;
    return !point || Math.hypot(event.clientX - point.x, event.clientY - point.y) > 4;
  };
  // A boundary event at the last known pointer position is the browser
  // re-evaluating hover after a remount or a scroll, not the user arriving.
  const physicalMove = (event: ReactPointerEvent<HTMLElement>) => {
    const last = lastMoveRef.current;
    return !last || last.x !== event.clientX || last.y !== event.clientY;
  };
  useEffect(() => () => window.clearTimeout(timerRef.current), []);
  return {
    bind: (value: T): MenuHoverBinding => ({
      onBlur: clear,
      // A mouse press focuses the button too; only keyboard focus previews.
      onFocus: (event) => {
        if (event.currentTarget.matches(":focus-visible")) arm(value);
      },
      onPointerEnter: (event) => {
        if (physicalMove(event) && movedSincePress(event)) arm(value);
      },
      onPointerLeave: clear,
      onPointerMove: (event) => {
        lastMoveRef.current = { x: event.clientX, y: event.clientY };
        if (movedSincePress(event)) arm(value);
      },
    }),
    clear,
    /** For the rail's root: a pointer resting off every target after a remount. */
    clearIfOffTarget: (event: ReactPointerEvent<HTMLElement>) => {
      lastMoveRef.current = { x: event.clientX, y: event.clientY };
      if (!(event.target instanceof Element) || !event.target.closest("[data-menu-hover]")) {
        clear();
      }
    },
    /** For the rail's root, capture phase: where the last press landed. */
    notePress: (event: ReactPointerEvent<HTMLElement>) => {
      pressPointRef.current = { x: event.clientX, y: event.clientY };
      clear();
    },
  };
}

function ScrollControlButton({
  disabled = false,
  direction,
  hover,
  label,
  onClick,
  plain = false,
}: {
  disabled?: boolean;
  direction: "down" | "left" | "right" | "up";
  /** Resting on the arrow previews the current selection on the figure. */
  hover?: MenuHoverBinding;
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
  // No data-dashboard-tooltip on purpose. A chevron already says which way it
  // goes, and these are the one control you have to keep the pointer on while
  // using them — so the bubble sat over the very row being scrolled for the
  // whole interaction. The aria-label still carries the full description for
  // screen readers.

  return (
    <button
      aria-label={label}
      className={
        plain
          ? "relative z-50 grid h-7 w-7 shrink-0 touch-manipulation select-none place-items-center text-cyan-50 transition hover:text-cyan-200 active:scale-95 disabled:cursor-default disabled:text-slate-600"
          : "relative z-50 grid h-7 w-7 shrink-0 touch-manipulation select-none place-items-center rounded-full border border-cyan-100/38 bg-slate-950/88 text-cyan-50 shadow-[0_0_16px_rgba(34,211,238,0.24)] transition hover:border-cyan-100/75 hover:bg-cyan-300/18 active:scale-95 disabled:cursor-default disabled:border-white/10 disabled:bg-slate-950/48 disabled:text-slate-600 disabled:shadow-none disabled:hover:bg-slate-950/48"
      }
      data-menu-hover={hover ? "" : undefined}
      disabled={disabled}
      onBlur={hover?.onBlur}
      onClick={(event) => {
        event.stopPropagation();
        // The choice shows as the selection pulse; a later real move over
        // the arrow previews the new selection.
        hover?.onBlur();
        onClick();
      }}
      onFocus={hover?.onFocus}
      onPointerCancel={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerEnter={hover?.onPointerEnter}
      onPointerLeave={hover?.onPointerLeave}
      onPointerMove={(event) => {
        event.stopPropagation();
        hover?.onPointerMove(event);
      }}
      onPointerUp={(event) => event.stopPropagation()}
      type="button"
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.6} />
    </button>
  );
}

/**
 * Progress ring drawn as one notch per prescribed unit — set, rep, check or
 * session — so 5/10 reads as five of ten notches lit rather than a half-arc.
 * Notches run clockwise from 12 o'clock; completed ones take the status
 * colour, the rest stay as the faint track. Built from two dashed circles
 * (track: every slot; fill: the first `done` slots then a gap past the end)
 * so a 48-set category costs the same two elements as a 4-check signal.
 */
function SegmentedRing({
  fill,
  segments,
  stroke,
}: {
  fill: number;
  segments: number;
  stroke: string;
}) {
  const count = Math.max(1, Math.min(120, Math.round(segments)));
  const done = Math.round((Math.max(0, Math.min(100, fill)) / 100) * count);
  const { track, filled } = getSegmentedRingDashes(done, count);

  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full -rotate-90"
      viewBox="0 0 72 72"
    >
      <circle
        cx="36"
        cy="36"
        fill="none"
        pathLength="100"
        r="33"
        stroke="rgba(148,163,184,0.18)"
        strokeDasharray={track}
        strokeWidth="5"
      />
      <circle
        cx="36"
        cy="36"
        fill="none"
        pathLength="100"
        r="33"
        stroke={stroke}
        strokeDasharray={filled}
        strokeWidth="5"
      />
    </svg>
  );
}

type SetBlipDetail = {
  dateLabel: string;
  exercise: string;
  kind: "completed" | "extra" | "planned";
  setNumber: number;
  timeLabel: string;
  weight: string;
};

function SetBlipBar({
  hideStatusFooter = false,
  load,
  ringColor,
  scrollable = false,
  scrollLabel,
  setDetails,
  showLoadRatio = false,
  statusLabel,
  statusTextClassName,
  subject,
}: {
  hideStatusFooter?: boolean;
  load: SevenDayTrainingLoad;
  ringColor: string;
  scrollable?: boolean;
  scrollLabel?: string;
  setDetails: SetBlipDetail[];
  showLoadRatio?: boolean;
  statusLabel: string;
  statusTextClassName: string;
  subject: string;
}) {
  const totalSets = Math.max(load.completed, load.target, 1);
  const initialSetIndex = Math.max(0, Math.min(Math.max(load.completed, 1), totalSets) - 1);
  const [activeSetIndex, setActiveSetIndex] = useState(initialSetIndex);

  useEffect(() => {
    setActiveSetIndex((currentIndex) => Math.min(currentIndex, totalSets - 1));
  }, [totalSets]);

  const activeSetNumber = activeSetIndex + 1;
  const activeSetDetail =
    setDetails[activeSetIndex] ??
    ({
      dateLabel: "Not scheduled",
      exercise: subject,
      kind: activeSetNumber <= load.completed ? "completed" : "planned",
      setNumber: activeSetNumber,
      timeLabel: "TBD",
      weight: "TBD",
    } satisfies SetBlipDetail);
  const scrollSetBlips = useCallback(
    (direction: -1 | 1) => {
      setActiveSetIndex((currentIndex) =>
        Math.max(0, Math.min(totalSets - 1, currentIndex + direction)),
      );
    },
    [totalSets],
  );
  if (load.target <= 0) return <p className="py-3 text-xs text-slate-400">Muscle-specific recorded sets and targets are not mapped. No set history is inferred.</p>;
  const blipGapPx = totalSets > 36 ? 1 : 2;
  const blipGrid = (
    <div
      className="grid h-2.5 w-full items-center"
      style={{
        columnGap: `${blipGapPx}px`,
        gridTemplateColumns: `repeat(${totalSets}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: totalSets }).map((_, index) => {
        const setNumber = index + 1;
        const isActive = index === activeSetIndex;
        const isCompleted = setNumber <= load.completed;
        const isExtra = setNumber > load.target;
        const detail =
          setDetails[index] ??
          ({
            dateLabel: "Not scheduled",
            exercise: subject,
            kind: isCompleted ? "completed" : "planned",
            setNumber,
            timeLabel: "TBD",
            weight: "TBD",
          } satisfies SetBlipDetail);
        const blipColor = isCompleted ? ringColor : "rgba(148,163,184,0.24)";
        const detailLabel = isExtra
          ? `Set ${setNumber}: extra volume above target.`
          : isCompleted
            ? `Set ${setNumber}: completed.`
            : `Set ${setNumber}: planned.`;

        return (
          <button
            aria-label={`Select ${detailLabel} ${detail.dateLabel} ${detail.timeLabel}, ${detail.exercise}, ${detail.weight}.`}
            aria-pressed={isActive}
            className={`h-2 min-w-0 rounded-full transition-[background-color,box-shadow,opacity,transform] duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-100/80 ${
              isActive
                ? "scale-y-[1.75] opacity-100"
                : isCompleted
                  ? "opacity-90"
                  : "opacity-55"
            }`}
            data-dashboard-set-blip-index={index}
            key={setNumber}
            onClick={() => setActiveSetIndex(index)}
            onFocus={() => setActiveSetIndex(index)}
            style={{
              backgroundColor: blipColor,
              boxShadow: isActive ? `0 0 10px ${ringColor}` : undefined,
              filter: isExtra ? "saturate(1.2)" : undefined,
            }}
            type="button"
          />
        );
      })}
    </div>
  );

  return (
    <div className="mt-2" data-dashboard-set-blip-bar="true">
      <div
        aria-label={`${subject} set details. ${load.completed} completed of ${load.target} target sets. Click a blip to inspect that set.`}
        className="p-0"
        role="group"
      >
        {scrollable ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="flex w-5 shrink-0 flex-col items-center justify-center gap-0.5">
              <button
                aria-label={`Highlight previous ${scrollLabel ?? subject} set blip`}
                className="grid h-4 w-5 place-items-center rounded-full text-slate-300 transition hover:bg-white/[0.07] hover:text-cyan-100 active:scale-95"
                onClick={() => scrollSetBlips(-1)}
                type="button"
              >
                <ChevronLeft aria-hidden="true" className="h-2.5 w-2.5" />
              </button>
              <button
                aria-label={`Highlight next ${scrollLabel ?? subject} set blip`}
                className="grid h-4 w-5 place-items-center rounded-full text-slate-300 transition hover:bg-white/[0.07] hover:text-cyan-100 active:scale-95"
                onClick={() => scrollSetBlips(1)}
                type="button"
              >
                <ChevronRight aria-hidden="true" className="h-2.5 w-2.5" />
              </button>
            </div>
            <div
              className="min-w-0 flex-1 overflow-hidden"
              data-dashboard-set-blip-rail="true"
            >
              {blipGrid}
            </div>
          </div>
        ) : (
          blipGrid
        )}
      </div>
      {showLoadRatio ? (
        <div className="mt-1 flex justify-center text-[9px] font-black leading-none tracking-[0.08em] text-slate-200">
          {load.completed}/{load.target}
        </div>
      ) : null}
      <div className="mt-1.5 flex items-start justify-between gap-3 text-[8px] font-bold text-slate-400">
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-[9px] font-black uppercase tracking-[0.04em] text-slate-100">
            {activeSetDetail.exercise}
          </span>
          <span className="mt-0.5 block">
            Set {activeSetDetail.setNumber} · {activeSetDetail.dateLabel} ·{" "}
            {activeSetDetail.timeLabel} · {activeSetDetail.weight}
          </span>
        </span>
        {hideStatusFooter ? null : (
          <span className={`shrink-0 font-black uppercase ${statusTextClassName}`}>
            {statusLabel}
          </span>
        )}
      </div>
    </div>
  );
}

function BodyStatCard({
  highlighted = false,
  onSelect,
  showGlyph = false,
  stat,
}: {
  highlighted?: boolean;
  onSelect: () => void;
  showGlyph?: boolean;
  stat: BodyStatCardDefinition;
}) {
  const tone = statToneClasses[stat.tone];
  const ringLoad = stat.ringLoad ?? stat.load;
  const trainingStatus = stat.status ?? getSupportSignalStatus(stat.load);
  const statusTheme = sevenDayStatusTheme[trainingStatus];
  const fill = getSevenDayFill(ringLoad);
  const ringDescription =
    stat.ringAriaLabel ??
    `Target progress: ${stat.load.completed} of ${stat.load.target} planned ${stat.load.unit} in the last 7 days`;
  const actionLabel = highlighted
    ? "Open support signal details"
    : "Highlight support signal";

  return (
    <button
      aria-current={highlighted ? "true" : undefined}
      aria-haspopup="dialog"
      aria-label={`${stat.label}, ${statusTheme.label}; ${stat.average.ariaLabel}; ${ringDescription}. ${actionLabel}.`}
      className={`${layoutStyles.supportSignalCard} group relative grid min-h-[88px] min-w-0 cursor-pointer appearance-none place-items-center rounded-[18px] border-0 bg-transparent px-2 py-2 text-inherit outline-none transition-[filter,scale] duration-200 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-cyan-100/70 motion-reduce:transition-none motion-reduce:hover:scale-100`}
      data-dashboard-tooltip={`${stat.average.ariaLabel}. ${highlighted ? "Click to open details." : "Click to highlight."}`}
      onClick={onSelect}
      type="button"
    >
      <div
        aria-label={`${stat.label}, ${statusTheme.label}; ${stat.average.ariaLabel}; ${ringDescription}`}
        aria-valuemax={stat.evidence ? undefined : 100}
        aria-valuemin={stat.evidence ? undefined : 0}
        aria-valuenow={stat.evidence ? undefined : fill}
        className={`${layoutStyles.supportSignalRing} relative grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full transition-[box-shadow,outline-color] duration-300 ${tone.icon} ${
          highlighted
            ? `${statusTheme.shadow}`
            : "shadow-[0_0_18px_rgba(34,211,238,0.09),inset_0_1px_0_rgba(255,255,255,0.08)]"
        } ${statusTheme.border} ${statusTheme.aura}`}
        role={stat.evidence ? "img" : "progressbar"}
      >
        <SegmentedRing
          fill={fill}
          segments={ringLoad.target}
          stroke={statusTheme.ring}
        />
        <span className={`${layoutStyles.supportSignalFace} relative flex max-w-[70px] flex-col items-center text-center leading-none`}>
          <BodyCommandRingFace
            capGlyph
            glyph={stat.glyph}
            glyphClassName={`${layoutStyles.supportSignalGlyph} h-8 w-8`}
            caption={stat.label}
            captionClassName={`${layoutStyles.supportSignalCaption} ${tone.text}`}
            holdOutgoingGlyph={false}
            showGlyph={showGlyph}
            tone={stat.tone}
          >
            <span className={`${layoutStyles.supportSignalLoaderTitle} text-[11px] font-black uppercase leading-tight tracking-normal ${tone.text}`}>
              {stat.label}
            </span>
          </BodyCommandRingFace>
          <span className={`${layoutStyles.supportSignalStatus} mt-1 text-[8px] font-black uppercase leading-tight tracking-normal ${statusTheme.text}`}>
            {stat.average.value}
            <span className="block text-[7px] text-slate-400">
              {stat.average.detail}
            </span>
          </span>
        </span>
      </div>
    </button>
  );
}

const supportSignalDetailCopy: Partial<
  Record<
    BodyCommandGlyphName,
    { focus: string; next: string; warning?: string }
  >
> = {
  core: {
    focus: "Core work should support the big lifts without stealing recovery from them.",
    next: "Keep core sets crisp and stop before bracing quality fades.",
    warning: "Back off direct core volume if trunk fatigue is bleeding into squats or pulls.",
  },
  fatigue: {
    focus: "Fatigue blends training load, cardio, work stress, and general life cost.",
    next: "Keep hard work planned, but avoid stacking extra intensity on tired days.",
    warning: "Treat this as a recovery flag before adding more conditioning or heavy sets.",
  },
  fuel: {
    focus: "Fuel tracks whether daily calories are supporting the current training block.",
    next: "Keep meals predictable around sessions so output does not dip late in the week.",
    warning: "Bring calories back toward target before pushing session volume higher.",
  },
  hydration: {
    focus: "Hydration helps energy, pump, temperature control, and recovery rhythm.",
    next: "Front-load fluids earlier in the day and add electrolytes around sweaty sessions.",
    warning: "Close the hydration gap before hard conditioning or long heat exposure.",
  },
  recovery: {
    focus: "Recovery sessions keep joints moving and help the next hard day feel cleaner.",
    next: "Protect the easy session; it should leave you better, not more drained.",
    warning: "Schedule the recovery slot before another high-output workout.",
  },
  sleep: {
    focus: "Sleep is the base recovery signal for readiness, soreness, and training quality.",
    next: "Keep the bedtime window steady and protect the final hour before sleep.",
    warning: "Prioritize sleep before increasing intensity or adding extra sets.",
  },
  soreness: {
    focus: "Soreness is self-reported tissue feedback from the last few training days.",
    next: "Use warmups and range checks to decide whether to push or modify.",
    warning: "If soreness climbs, shift the next session toward technique and recovery.",
  },
  stress: {
    focus: "Stress captures the non-training load your body still has to recover from.",
    next: "Keep the plan flexible and use lower-friction sessions when stress is high.",
    warning: "Reduce optional intensity until stress comes back into range.",
  },
};

function SupportSignalLastSevenDays({ stat }: { stat: BodyStatCardDefinition; statusTheme: (typeof sevenDayStatusTheme)[SevenDayTrainingStatus] }) {
  return <div aria-label={stat.label + " recorded evidence"} className="rounded-[10px] border border-white/10 bg-slate-950/38 p-3" data-dashboard-support-last-seven-days="true">
    <p className="text-sm text-slate-200">{stat.evidenceMessage || "No verified daily history is linked."}</p>
    <p className="mt-2 text-xs text-slate-400">Daily history and target comparisons are unavailable.</p>
  </div>;
}

function getSupportSignalNextMove(
  stat: BodyStatCardDefinition,
  status: SevenDayTrainingStatus,
) {
  if (stat.evidence) return "Review or add saved records before making a training adjustment from this signal.";
  const copy = supportSignalDetailCopy[stat.glyph];
  if (status === "urgent") {
    return copy?.warning ?? `Bring ${stat.label.toLowerCase()} back toward target before adding more load.`;
  }
  if (status === "overworked") {
    return copy?.warning ?? `Pull ${stat.label.toLowerCase()} back and bias recovery today.`;
  }
  return copy?.next ?? `Keep ${stat.label.toLowerCase()} steady while the plan progresses.`;
}

type DetailMetricItem = {
  label: string;
  value: string;
};

function DetailHeaderControls({
  nextLabel,
  onNavigate,
  previousLabel,
}: {
  nextLabel: string;
  onNavigate: (direction: -1 | 1) => void;
  previousLabel: string;
}) {
  return (
    <div className="flex w-12 shrink-0 items-center justify-between">
      <button
        aria-label={previousLabel}
        className="grid h-6 w-6 place-items-center rounded-full text-slate-300 transition hover:bg-white/[0.07] hover:text-cyan-100 active:scale-95"
        onClick={() => onNavigate(-1)}
        type="button"
      >
        <ChevronLeft aria-hidden="true" className="h-3 w-3" />
      </button>
      <button
        aria-label={nextLabel}
        className="grid h-6 w-6 place-items-center rounded-full text-slate-300 transition hover:bg-white/[0.07] hover:text-cyan-100 active:scale-95"
        onClick={() => onNavigate(1)}
        type="button"
      >
        <ChevronRight aria-hidden="true" className="h-3 w-3" />
      </button>
    </div>
  );
}

function DetailMetricCarousel({
  children,
  items,
}: {
  children?: ReactNode;
  items: DetailMetricItem[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);
  const dragScrollHandlers = useHorizontalDragScroll(railRef);

  const highlightMetric = useCallback((nextIndex: number) => {
    const normalizedIndex = (nextIndex + items.length) % items.length;
    setActiveIndex(normalizedIndex);
    window.requestAnimationFrame(() => {
      const item = railRef.current?.children.item(normalizedIndex) as HTMLElement | null;
      item?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    });
  }, [items.length]);

  useEffect(() => {
    if (activeIndex < items.length) return;
    setActiveIndex(0);
  }, [activeIndex, items.length]);

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-stretch gap-2">
        <div className="flex w-7 shrink-0 flex-col items-center justify-center gap-1 py-1">
          <button
            aria-label="Highlight previous metric"
            className="grid h-6 w-6 place-items-center rounded-full text-slate-300 transition hover:bg-white/[0.07] hover:text-cyan-100 active:scale-95"
            onClick={() => highlightMetric(activeIndex - 1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="h-3 w-3" />
          </button>
          <button
            aria-label="Highlight next metric"
            className="grid h-6 w-6 place-items-center rounded-full text-slate-300 transition hover:bg-white/[0.07] hover:text-cyan-100 active:scale-95"
            onClick={() => highlightMetric(activeIndex + 1)}
            type="button"
          >
            <ChevronRight aria-hidden="true" className="h-3 w-3" />
          </button>
        </div>
        <div
          className="flex min-w-0 flex-1 cursor-grab snap-x gap-2 overflow-x-auto overscroll-x-contain pb-1 scroll-smooth [scrollbar-width:none] [touch-action:pan-x] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
          data-dashboard-detail-metric-rail="true"
          data-dashboard-orbiter-local-scroll="true"
          ref={railRef}
          {...dragScrollHandlers}
        >
          {items.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                aria-current={isActive ? "true" : undefined}
                className={`w-max min-w-[8.75rem] flex-none snap-center rounded-[8px] border px-2.5 py-2 text-left transition duration-200 ${
                  isActive
                    ? "border-cyan-100/40 bg-cyan-300/10 shadow-[0_0_22px_rgba(34,211,238,0.15)]"
                    : "border-white/9 bg-white/[0.035] hover:border-white/18 hover:bg-white/[0.055]"
                }`}
                key={item.label}
                onClick={() => highlightMetric(index)}
                type="button"
              >
                <span className="block whitespace-nowrap text-[7px] font-black uppercase tracking-[0.12em] text-slate-500">
                  {item.label}
                </span>
                <span className="mt-1 block whitespace-nowrap text-sm font-black text-slate-100">
                  {item.value}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}

function DetailInlineScrollSection({
  children,
  compactControls = false,
  nextLabel,
  previousLabel,
  title,
  titleClassName,
}: {
  children: ReactNode;
  compactControls?: boolean;
  nextLabel: string;
  previousLabel: string;
  title: string;
  titleClassName: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const dragScrollHandlers = useHorizontalDragScroll(railRef);

  const scrollRail = useCallback((direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;

    rail.scrollBy({
      behavior: "smooth",
      left: direction * Math.max(112, rail.clientWidth * 0.72),
    });
  }, []);
  const controlButtonClassName = compactControls
    ? "grid h-4 w-5 place-items-center rounded-full text-slate-300 transition hover:bg-white/[0.07] hover:text-cyan-100 active:scale-95"
    : "grid h-6 w-6 place-items-center rounded-full text-slate-300 transition hover:bg-white/[0.07] hover:text-cyan-100 active:scale-95";
  const controlIconClassName = compactControls ? "h-2.5 w-2.5" : "h-3 w-3";

  return (
    <div className="min-w-0">
      <h3 className={`text-[8px] font-black uppercase tracking-[0.16em] ${titleClassName}`}>
        {title}
      </h3>
      <div className="mt-2 flex min-w-0 items-stretch gap-2">
        <div className={`flex shrink-0 flex-col items-center justify-center ${compactControls ? "w-5 gap-0.5" : "w-6 gap-1"}`}>
          <button
            aria-label={previousLabel}
            className={controlButtonClassName}
            onClick={() => scrollRail(-1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" className={controlIconClassName} />
          </button>
          <button
            aria-label={nextLabel}
            className={controlButtonClassName}
            onClick={() => scrollRail(1)}
            type="button"
          >
            <ChevronRight aria-hidden="true" className={controlIconClassName} />
          </button>
        </div>
        <div
          className="flex min-w-0 flex-1 cursor-grab snap-x gap-1.5 overflow-x-auto overscroll-x-contain pb-1 scroll-smooth [scrollbar-width:none] [touch-action:pan-x] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
          data-dashboard-detail-inline-rail={title}
          data-dashboard-orbiter-local-scroll="true"
          ref={railRef}
          {...dragScrollHandlers}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function SupportSignalDetailDialog({
  onClose,
  onNavigate,
  stat,
}: {
  onClose: () => void;
  onNavigate: (direction: -1 | 1) => void;
  stat: BodyStatCardDefinition;
}) {
  const titleId = useId();
  const summaryId = useId();
  const tone = statToneClasses[stat.tone];
  const ringLoad = stat.ringLoad ?? stat.load;
  const status = stat.status ?? getSupportSignalStatus(stat.load);
  const statusTheme = sevenDayStatusTheme[status];
  const fill = getSevenDayFill(ringLoad);
  const copy = supportSignalDetailCopy[stat.glyph];
  const focus =
    stat.evidenceMessage ?? copy?.focus ??
    `${stat.label} shows whether your current habits are supporting the training plan.`;
  const nextMove = getSupportSignalNextMove(stat, status);

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/76 p-[clamp(10px,3vw,24px)] backdrop-blur-md"
      data-dashboard-wheel-lock="true"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        aria-describedby={summaryId}
        aria-labelledby={titleId}
        aria-modal="true"
        className={`relative flex max-h-[calc(100dvh-20px)] w-full max-w-[560px] flex-col overflow-hidden rounded-[14px] border bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.13),transparent_34%),radial-gradient(circle_at_92%_16%,rgba(251,191,36,0.09),transparent_28%),linear-gradient(145deg,rgba(10,18,34,0.97),rgba(2,6,23,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.12)] ${statusTheme.border}`}
        role="dialog"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex shrink-0 translate-y-1.5 flex-col items-center gap-1">
              <span className={`relative grid h-12 w-12 place-items-center rounded-full border ${tone.icon} ${statusTheme.shadow}`}>
                <SegmentedRing
                  fill={fill}
                  segments={ringLoad.target}
                  stroke={statusTheme.ring}
                />
                <BodyCommandRingFace
                  capGlyph
                  caption={stat.label}
                  captionClassName={`${tone.text} text-[7px]`}
                  glyph={stat.glyph}
                  glyphClassName="h-7 w-7"
                  showGlyph
                  tone={stat.tone}
                >
                  <span className={`text-[8px] font-black uppercase ${tone.text}`}>
                    {stat.label}
                  </span>
                </BodyCommandRingFace>
              </span>
              <DetailHeaderControls
                nextLabel="Next support signal"
                onNavigate={onNavigate}
                previousLabel="Previous support signal"
              />
            </div>
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-[8px] font-black uppercase tracking-[0.16em] ${tone.text}`}>
                Support Signal
              </span>
              <span
                className="block truncate text-xl font-black uppercase tracking-[0.03em] text-white"
                id={titleId}
              >
                {stat.label}
              </span>
              <span
                className={`mt-1 block text-[8px] font-black uppercase tracking-[0.11em] ${statusTheme.text}`}
                id={summaryId}
              >
                {statusTheme.label} · {stat.average.value} {stat.average.detail.toLowerCase()}
              </span>
            </span>
          </div>
          <button
            aria-label="Close support signal details"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.035] text-slate-300 transition hover:border-cyan-100/38 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 [scrollbar-color:rgba(34,211,238,0.38)_rgba(15,23,42,0.32)] [scrollbar-width:thin]"
          data-dashboard-orbiter-local-scroll="true"
        >
          <SupportSignalLastSevenDays
            stat={stat}
            statusTheme={statusTheme}
          />

          <div className="mt-3">
            <DetailInlineScrollSection
              compactControls
              nextLabel="Scroll support advice right"
              previousLabel="Scroll support advice left"
              title="Advice"
              titleClassName={tone.text}
            >
            <div
              className={`min-w-[13rem] max-w-[18rem] flex-none basis-[84%] snap-center rounded-[10px] border p-3 ${tone.icon}`}
              data-dashboard-support-advice-card="what-it-means"
            >
              <span className="block text-[8px] font-black uppercase tracking-[0.16em]">
                What it means
              </span>
              <p className="mt-1.5 text-[11px] font-semibold leading-relaxed text-slate-100">
                {focus}
              </p>
            </div>
            <div
              className={`min-w-[13rem] max-w-[18rem] flex-none basis-[84%] snap-center rounded-[10px] border p-3 ${statusTheme.border} bg-slate-950/36`}
              data-dashboard-support-advice-card="next-move"
            >
              <span className={`block text-[8px] font-black uppercase tracking-[0.16em] ${statusTheme.text}`}>
                Next move
              </span>
              <p className="mt-1.5 text-[11px] font-semibold leading-relaxed text-slate-100">
                {nextMove}
              </p>
            </div>
            </DetailInlineScrollSection>
          </div>
        </div>

      </section>
    </div>,
    document.body,
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
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const activeTone = statToneClasses[stats[highlightedIndex]?.tone ?? "cyan"];
  const supportArrowsInTitle = showLabel && !compact && !vertical;
  const supportItems = compact
    ? [{ originalIndex: highlightedIndex, stat: stats[highlightedIndex] }]
    : vertical
      ? stats.map((stat, index) => ({ originalIndex: index, stat }))
      : stats.map((_, offset) => {
          const originalIndex =
            (highlightedIndex - 2 + offset + stats.length) % stats.length;
          return {
            originalIndex,
            stat: stats[originalIndex],
          };
        });
  const activeSupportItemIndex = compact
    ? 0
    : vertical
      ? highlightedIndex
      : Math.min(2, supportItems.length - 1);

  const scrollToCenteredCardIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const scroller = scrollRef.current;
    const item = scroller?.children.item(index) as HTMLElement | null;
    if (!scroller || !item) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const targetRect =
      scroller.parentElement?.getBoundingClientRect() ?? scrollerRect;
    const itemRect = item.getBoundingClientRect();
    const nextLeft =
      scroller.scrollLeft +
      itemRect.left +
      itemRect.width / 2 -
      (targetRect.left + targetRect.width / 2);
    scroller.scrollTo({
      behavior,
      left: Math.max(0, nextLeft),
    });
  }, [scrollRef]);

  useEffect(() => {
    if (compact) return;
    if (vertical) scrollToIndex(highlightedIndex);
    else {
      window.requestAnimationFrame(() =>
        scrollToCenteredCardIndex(activeSupportItemIndex),
      );
    }
  }, [activeSupportItemIndex, compact, highlightedIndex, scrollToIndex, scrollToCenteredCardIndex, vertical]);

  const moveHighlight = (direction: -1 | 1) => {
    setHighlightedIndex((currentIndex) => {
      const nextIndex =
        (currentIndex + direction + stats.length) % stats.length;
      return nextIndex;
    });
  };
  const selectSupportSignal = (index: number) => {
    const alreadyHighlighted = index === highlightedIndex;
    setHighlightedIndex(index);
    if (alreadyHighlighted) {
      setDetailIndex(index);
    }
  };
  const navigateSupportDetail = (direction: -1 | 1) => {
    setDetailIndex((currentIndex) => {
      if (currentIndex === null) return currentIndex;
      const nextIndex =
        (currentIndex + direction + stats.length) % stats.length;
      setHighlightedIndex(nextIndex);
      return nextIndex;
    });
  };

  useEffect(() => {
    if (detailIndex === null) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailIndex(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [detailIndex]);

  const rail = (
    <div
      className={`${layoutStyles.supportSignalRail} flex min-w-0 gap-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${compact ? "snap-x snap-mandatory justify-center overflow-hidden pt-1" : vertical ? "min-h-0 flex-1 snap-y snap-mandatory flex-col items-center overflow-y-auto overscroll-y-contain px-1 pb-1 pt-1" : "mx-auto overflow-x-auto overscroll-x-contain px-1 pb-1 pt-1"}`}
      ref={scrollRef}
    >
      {supportItems.map(({ originalIndex, stat }, index) => (
        <div
          className={`${vertical && !compact ? "w-full min-w-0 shrink-0 snap-start" : "w-24 min-w-24 snap-center"}`}
          // Compact shows one card at a time: key it by slot so stepping
          // updates the same node and the glyph can hand off (see the trio).
          key={compact ? "compact-stat" : vertical ? stat.label : `support-slot-${index}`}
        >
          <BodyStatCard
            highlighted={compact || originalIndex === highlightedIndex}
            onSelect={() => selectSupportSignal(originalIndex)}
            showGlyph={compact || originalIndex === highlightedIndex}
            stat={stat}
          />
        </div>
      ))}
    </div>
  );

  // Keep the selected horizontal support signal truly centered. The side
  // padding gives first/last signals enough scrollable space to center too,
  // instead of forcing the highlight into a left/right slot.
  useLayoutEffect(() => {
    if (compact || vertical) return;
    const scroller = scrollRef.current;
    const host = scroller?.parentElement;
    if (!scroller || !host) return;
    let recenterFrame = 0;

    const fitWholeCards = () => {
      const firstCard = scroller.firstElementChild as HTMLElement | null;
      if (!firstCard) return;
      const available = host.clientWidth;
      if (available <= 0) return;
      const hostRect = host.getBoundingClientRect();
      const scrollerRect = scroller.getBoundingClientRect();
      const firstSignal = firstCard.querySelector(
        '[role="progressbar"]',
      ) as HTMLElement | null;
      const firstCardRect = firstCard.getBoundingClientRect();
      const firstSignalRect = firstSignal?.getBoundingClientRect();
      const firstSignalCenterInCard = firstSignalRect
        ? firstSignalRect.left + firstSignalRect.width / 2 - firstCardRect.left
        : firstCard.offsetWidth / 2;
      const sidePad = Math.max(
        12,
        hostRect.left +
          hostRect.width / 2 -
          scrollerRect.left -
          firstSignalCenterInCard,
      );
      scroller.style.width = `${available}px`;
      scroller.style.paddingLeft = `${sidePad}px`;
      scroller.style.paddingRight = `${sidePad}px`;
      scroller.style.scrollPaddingInline = `${sidePad}px`;
      window.cancelAnimationFrame(recenterFrame);
      recenterFrame = window.requestAnimationFrame(() =>
        scrollToCenteredCardIndex(activeSupportItemIndex, "auto"),
      );
    };

    fitWholeCards();
    const observer = new ResizeObserver(fitWholeCards);
    observer.observe(host);
    if (scroller.firstElementChild) {
      observer.observe(scroller.firstElementChild);
    }
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(recenterFrame);
      scroller.style.width = "";
      scroller.style.paddingLeft = "";
      scroller.style.paddingRight = "";
      scroller.style.scrollPaddingInline = "";
    };
  }, [activeSupportItemIndex, compact, scrollRef, scrollToCenteredCardIndex, vertical]);

  return (
    <div className={`min-w-0 ${!vertical && !compact ? layoutStyles.supportSignals : ""} ${vertical && !compact ? "flex min-h-0 flex-1 flex-col" : ""}`}>
      {showLabel ? (
        <div className={`${layoutStyles.supportSignalTitleRow} mb-0 flex items-center gap-2`}>
          <span className="h-px flex-1 bg-cyan-100/16" />
          {supportArrowsInTitle ? (
            <ScrollControlButton
              direction="left"
              label={`Highlight previous ${label} item`}
              onClick={() => moveHighlight(-1)}
              plain
            />
          ) : null}
          <span className={`${layoutStyles.supportSignalTitleText} shrink-0 text-[9px] font-black uppercase tracking-[0.18em] ${activeTone.text}`}>
            {label}
          </span>
          {supportArrowsInTitle ? (
            <ScrollControlButton
              direction="right"
              label={`Highlight next ${label} item`}
              onClick={() => moveHighlight(1)}
              plain
            />
          ) : null}
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
        <div className={`${layoutStyles.supportSignalViewport} min-w-0`}>{rail}</div>
      )}
      {detailIndex !== null && stats[detailIndex] ? (
        <SupportSignalDetailDialog
          onClose={() => setDetailIndex(null)}
          onNavigate={navigateSupportDetail}
          stat={stats[detailIndex]}
        />
      ) : null}
    </div>
  );
}

/**
 * Color key for the muscle displays, shown under the avatar's feet. These are
 * the exact colors sevenDayStatusTheme paints on the muscle rings and body-part
 * chips, so the legend explains what the reader is already seeing: yellow is
 * still under plan, orange is the prime weekly set zone, and red is overwork.
 */
const avatarHeatLegend = [
  {
    dot: "bg-emerald-300 shadow-[0_0_13px_rgba(52,211,153,0.85)]",
    label: "Cool",
    tooltip: "Color key only. Muscle-specific recorded workload and targets are not mapped.",
  },
  {
    dot: "bg-amber-300 shadow-[0_0_13px_rgba(251,191,36,0.85)]",
    label: "Halfway",
    tooltip: "Color key only. Muscle-specific recorded workload and targets are not mapped.",
  },
  {
    dot: "bg-orange-400 shadow-[0_0_13px_rgba(251,146,60,0.9)]",
    label: "Prime",
    tooltip:
      "Color key only. Muscle-specific recorded workload and targets are not mapped.",
  },
  {
    dot: "bg-red-400 shadow-[0_0_13px_rgba(248,113,113,0.9)]",
    label: "Overworked",
    tooltip: "Color key only. Muscle-specific recorded workload and targets are not mapped.",
  },
] as const;

function AvatarDetailLegend() {
  const railRef = useRef<HTMLDivElement>(null);
  const [activeTagIndex, setActiveTagIndex] = useState(0);
  const [allTagsFit, setAllTagsFit] = useState(false);

  const highlightTag = useCallback((nextIndex: number, behavior: ScrollBehavior = "smooth") => {
    const rail = railRef.current;
    const target = rail?.children.item(nextIndex) as HTMLElement | null;

    setActiveTagIndex(nextIndex);
    if (rail && target) {
      const railStyle = window.getComputedStyle(rail);
      const gap = Number.parseFloat(railStyle.columnGap || railStyle.gap || "0");
      const contentWidth = Array.from(rail.children).reduce(
        (total, child, index) =>
          total + (child as HTMLElement).offsetWidth + (index > 0 ? gap : 0),
        0,
      );
      const availableWidth =
        rail.parentElement?.clientWidth ?? rail.clientWidth;
      const allItemsFit = contentWidth <= availableWidth;
      setAllTagsFit(allItemsFit);
      if (allItemsFit) {
        rail.style.paddingLeft = "0px";
        rail.style.paddingRight = "0px";
        rail.scrollTo({ behavior, left: 0 });
        return;
      }

      rail.style.paddingLeft = "0px";
      rail.style.paddingRight = "0px";
      window.requestAnimationFrame(() => {
        const targetLeft = target.offsetLeft;
        const targetRight = targetLeft + target.offsetWidth;
        const visibleLeft = rail.scrollLeft;
        const visibleRight = visibleLeft + rail.clientWidth;
        const nextLeft =
          targetLeft < visibleLeft
            ? targetLeft
            : targetRight > visibleRight
              ? targetRight - rail.clientWidth
              : visibleLeft;
        rail.scrollTo({
          behavior,
          left: Math.max(0, nextLeft),
        });
      });
    }
  }, []);

  useLayoutEffect(() => {
    highlightTag(activeTagIndex, "auto");
  }, [activeTagIndex, highlightTag]);

  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail) return undefined;

    const resetIfAllFit = () => {
      const gap =
        Number.parseFloat(
          window.getComputedStyle(rail).columnGap ||
            window.getComputedStyle(rail).gap ||
            "0",
        ) || 0;
      const contentWidth = Array.from(rail.children).reduce(
        (total, child, index) =>
          total + (child as HTMLElement).offsetWidth + (index > 0 ? gap : 0),
        0,
      );
      const availableWidth =
        rail.parentElement?.clientWidth ?? rail.clientWidth;
      if (contentWidth <= availableWidth) {
        setAllTagsFit(true);
        setActiveTagIndex(0);
        rail.scrollTo({ behavior: "auto", left: 0 });
        return;
      }

      highlightTag(activeTagIndex, "auto");
    };

    const observer = new ResizeObserver(() => {
      resetIfAllFit();
    });
    observer.observe(rail);
    if (rail.parentElement) observer.observe(rail.parentElement);

    return () => observer.disconnect();
  }, [activeTagIndex, highlightTag]);

  const showNextTag = () => {
    highlightTag((activeTagIndex + 1) % avatarHeatLegend.length);
  };

  return (
    <div className={`${layoutStyles.coolnessLegend} mr-auto flex w-full max-w-[340px] min-w-0 items-center justify-start gap-1.5 pr-2 pt-0.5`}>
      {allTagsFit ? null : (
        <button
          aria-label={`Highlight next coolness indicator. Current: ${avatarHeatLegend[activeTagIndex].label}`}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-cyan-100 drop-shadow-[0_0_8px_rgba(34,211,238,0.75)] transition hover:text-white focus-visible:outline-none focus-visible:text-white active:scale-90"
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
      )}
      <div
        aria-label="Coolness indicators"
        className={`${layoutStyles.coolnessRail} flex min-w-0 flex-nowrap items-center justify-start gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[760px]:gap-3`}
        ref={railRef}
      >
        {avatarHeatLegend.map((entry, index) => {
          const active = index === activeTagIndex;
          return (
          <button
            aria-current={active ? "true" : undefined}
            aria-label={`Highlight ${entry.label} coolness indicator`}
            className={`${layoutStyles.coolnessItem} inline-flex shrink-0 items-center gap-1.5 px-1 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] transition-[color,opacity,filter,transform] duration-200 ${
              active
                ? "text-white opacity-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.36)]"
                : "text-slate-300/76 opacity-72 hover:text-slate-100 hover:opacity-100"
            }`}
            data-dashboard-tooltip={entry.tooltip}
            key={entry.label}
            onClick={(event) => {
              event.stopPropagation();
              highlightTag(index);
            }}
            onPointerCancel={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerMove={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            type="button"
          >
            <span
              aria-hidden="true"
              className={`${layoutStyles.coolnessDot} h-1.5 w-1.5 rounded-full transition-transform duration-200 ${active ? "scale-125" : ""} ${entry.dot}`}
            />
            {entry.label}
          </button>
          );
        })}
      </div>
    </div>
  );
}

function HyperRealAvatarFigure({
  appearance,
  emotePreset,
  glowFocus,
  glowMode,
  onHoverBodyPartChange,
  onSelectBodyPart,
  selectedBodyPart,
  viewOverride,
  zoneGlowActive,
  zoneGlowColors,
}: {
  appearance: SoundFitnessAvatarAppearance;
  emotePreset: SoundFitnessAvatarEmotePreset;
  glowFocus?: SoundFitnessAvatarGlowRegion | null;
  glowMode?: "whole" | "pieces";
  onHoverBodyPartChange?: (bodyPart: SoundFitnessAvatarBodyPart | null) => void;
  onSelectBodyPart: (bodyPart: SoundFitnessAvatarBodyPart) => void;
  selectedBodyPart: SoundFitnessAvatarBodyPart;
  viewOverride?: "front" | "back";
  zoneGlowActive: boolean;
  zoneGlowColors?: Partial<
    Record<SoundFitnessAvatarGlowRegion, string | undefined>
  >;
}) {
  return (
    <div
      // overflow-clip, not overflow-hidden: the avatar floor alignment
      // deliberately bleeds past this box, and the invisible body-part hit
      // paths are focusable — a hidden-overflow box is still a scroll
      // container, so focusing a shin used to scroll the figure up.
      className={`${layoutStyles.avatarViewport} relative h-full min-h-[176px] w-full overflow-clip bg-transparent pt-8 transition-[background] duration-500 min-[760px]:min-h-[208px]`}
      // The pointer merely being over the box lights nothing: the glow
      // follows the part under the pointer (raycast hover), a menu hover,
      // or a fresh choice. Leaving only clears a hover.
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          onHoverBodyPartChange?.(null);
        }
      }}
      onPointerLeave={() => {
        onHoverBodyPartChange?.(null);
      }}
    >
      {/* One avatar: the 3D figure carries the lab appearance, the
          muscle highlights and the body-part hover/click (raycast on the
          real parts, plus a screen-reader button set). The flat SVG that
          used to sit invisibly on top for hit paths is gone with its ten
          idle animations. */}
      <SoundFitnessAvatar3D
        active
        appearance={appearance}
        bodyPartGlowActive={zoneGlowActive}
        bodyPartGlowColors={zoneGlowColors}
        className="absolute inset-x-0 bottom-0 z-10 h-full w-full opacity-100 transition-opacity duration-500"
        emotePreset={emotePreset}
        glowFocus={glowFocus}
        glowMode={glowMode}
        interactive
        onBodyPartHover={onHoverBodyPartChange}
        onBodyPartSelect={onSelectBodyPart}
        selectedBodyPart={selectedBodyPart}
        viewOverride={viewOverride}
      />
    </div>
  );
}

type BodyCommandMuscleSlug =
  | MuscleSlug
  | "upper-chest"
  | "mid-chest"
  | "lower-chest"
  | "front-delt"
  | "lateral-delt"
  | "rear-delt"
  | "external-rotation"
  | "internal-rotation"
  | "lats"
  | "rhomboids"
  | "abductors"
  | "hip-rotators"
  | "neck-flexors"
  | "neck-extensors"
  | "neck-rotators"
  | "neck-lateral-flexors"
  | "neck";

type BodyPartGroup = {
  glyph: BodyCommandGlyphName;
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
    glyph: "legs",
    id: "legs",
    label: "Legs",
    side: "front",
    muscles: [
      "quadriceps",
      "hamstring",
      "gluteal",
      "calves",
      "adductors",
      "abductors",
      "hip-rotators",
      "tibialis",
    ],
    tone: "emerald",
  },
  {
    glyph: "back",
    id: "back",
    label: "Back",
    side: "back",
    muscles: ["trapezius", "rhomboids", "lats"],
    tone: "purple",
  },
  {
    glyph: "chest",
    id: "chest",
    label: "Chest",
    side: "front",
    muscles: ["upper-chest", "mid-chest", "lower-chest"],
    tone: "cyan",
  },
  {
    glyph: "shoulders",
    id: "shoulders",
    label: "Shoulders",
    side: "front",
    muscles: [
      "front-delt",
      "lateral-delt",
      "rear-delt",
      "external-rotation",
      "internal-rotation",
    ],
    tone: "cyan",
  },
  {
    glyph: "arms",
    id: "arms",
    label: "Arms",
    side: "front",
    muscles: ["biceps", "triceps", "forearm"],
    tone: "gold",
  },
  {
    glyph: "core",
    id: "core",
    label: "Core",
    side: "front",
    muscles: ["abs", "obliques", "lower-back"],
    tone: "rose",
  },
  {
    glyph: "neck",
    id: "neck",
    label: "Neck",
    side: "front",
    muscles: [
      "neck-flexors",
      "neck-extensors",
      "neck-rotators",
      "neck-lateral-flexors",
    ],
    tone: "teal",
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
  chest: { family: "Upper push", label: "Chest", load: { completed: 0, target: 0, unit: "sets" }, status: "Pressing power", tone: "cyan" },
  "upper-chest": { family: "Upper push", label: "Upper Chest", load: { completed: 0, target: 0, unit: "sets" }, status: "Incline pressing", tone: "cyan" },
  "mid-chest": { family: "Upper push", label: "Mid Chest", load: { completed: 0, target: 0, unit: "sets" }, status: "Horizontal press", tone: "cyan" },
  "lower-chest": { family: "Upper push", label: "Lower Chest", load: { completed: 0, target: 0, unit: "sets" }, status: "Dips / decline", tone: "cyan" },
  deltoids: { family: "Upper push", label: "Deltoids", load: { completed: 0, target: 0, unit: "sets" }, status: "Overhead", tone: "cyan" },
  "front-delt": { family: "Upper push", label: "Front Delt", load: { completed: 0, target: 0, unit: "sets" }, status: "Overhead press", tone: "cyan" },
  "lateral-delt": { family: "Upper push", label: "Lateral Delt", load: { completed: 0, target: 0, unit: "sets" }, status: "Abduction", tone: "cyan" },
  "rear-delt": { family: "Upper pull", label: "Rear Delt", load: { completed: 0, target: 0, unit: "sets" }, status: "Horizontal abduction", tone: "cyan" },
  "external-rotation": { family: "Rotator cuff", label: "Ext Rotation", load: { completed: 0, target: 0, unit: "sets" }, status: "Cuff external", tone: "cyan" },
  "internal-rotation": { family: "Rotator cuff", label: "Int Rotation", load: { completed: 0, target: 0, unit: "sets" }, status: "Cuff internal", tone: "cyan" },
  biceps: { family: "Arms", label: "Biceps", load: { completed: 0, target: 0, unit: "sets" }, status: "Elbow flexion", tone: "gold" },
  triceps: { family: "Arms", label: "Triceps", load: { completed: 0, target: 0, unit: "sets" }, status: "Lockout", tone: "gold" },
  forearm: { family: "Arms", label: "Forearms", load: { completed: 0, target: 0, unit: "sets" }, status: "Grip", tone: "gold" },
  abs: { family: "Core", label: "Abs", load: { completed: 0, target: 0, unit: "sets" }, status: "Anti-flexion", tone: "rose" },
  obliques: { family: "Core", label: "Obliques", load: { completed: 0, target: 0, unit: "sets" }, status: "Rotation", tone: "rose" },
  quadriceps: { family: "Lower compound", label: "Quads", load: { completed: 0, target: 0, unit: "sets" }, status: "Knee drive", tone: "emerald" },
  hamstring: { family: "Lower compound", label: "Hamstrings", load: { completed: 0, target: 0, unit: "sets" }, status: "Hip hinge", tone: "emerald" },
  gluteal: { family: "Lower compound", label: "Glutes", load: { completed: 0, target: 0, unit: "sets" }, status: "Extension", tone: "emerald" },
  calves: { family: "Lower isolation", label: "Calves", load: { completed: 0, target: 0, unit: "sets" }, status: "Ankle drive", tone: "lime" },
  trapezius: { family: "Upper pull", label: "Traps", load: { completed: 0, target: 0, unit: "sets" }, status: "Shrug / brace", tone: "purple" },
  rhomboids: { family: "Upper pull", label: "Rhomboids", load: { completed: 0, target: 0, unit: "sets" }, status: "Scapular retraction", tone: "purple" },
  lats: { family: "Upper pull", label: "Lats", load: { completed: 0, target: 0, unit: "sets" }, status: "Vertical pull", tone: "purple" },
  // Retired: it double-counted lats + rhomboids, which are now their own
  // entries, so it is in no group and never renders. The row stays only
  // because the shared MuscleSlug type makes this Record exhaustive.
  "upper-back": { family: "Upper pull", label: "Upper Back", load: { completed: 0, target: 0, unit: "sets" }, status: "Rows", tone: "purple" },
  "lower-back": { family: "Upper pull", label: "Lower Back", load: { completed: 0, target: 0, unit: "sets" }, status: "Bracing", tone: "purple" },
  adductors: { family: "Lower isolation", label: "Adductors", load: { completed: 0, target: 0, unit: "sets" }, status: "Inner thigh", tone: "lime" },
  abductors: { family: "Lower isolation", label: "Abductors", load: { completed: 0, target: 0, unit: "sets" }, status: "Outer hip", tone: "lime" },
  "hip-rotators": { family: "Lower isolation", label: "Hip Rotators", load: { completed: 0, target: 0, unit: "sets" }, status: "Deep hip", tone: "lime" },
  "neck-flexors": { family: "Neck", label: "Flexors", load: { completed: 0, target: 0, unit: "sets" }, status: "Deep flexion", tone: "teal" },
  "neck-extensors": { family: "Neck", label: "Extensors", load: { completed: 0, target: 0, unit: "sets" }, status: "Cervical extension", tone: "teal" },
  "neck-rotators": { family: "Neck", label: "Rotators", load: { completed: 0, target: 0, unit: "sets" }, status: "Rotation control", tone: "teal" },
  "neck-lateral-flexors": { family: "Neck", label: "Lateral Flexors", load: { completed: 0, target: 0, unit: "sets" }, status: "Side-bend control", tone: "teal" },
  neck: { family: "Upper pull", label: "Neck", load: { completed: 0, target: 0, unit: "sets" }, status: "Cervical", tone: "purple" },
  tibialis: { family: "Lower isolation", label: "Tibialis", load: { completed: 0, target: 0, unit: "sets" }, status: "Shin", tone: "lime" },
  "hip-flexors": { family: "Lower isolation", label: "Hip Flexors", load: { completed: 0, target: 0, unit: "sets" }, status: "Flexion", tone: "lime" },
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
  abductors: {
    parts: ["Gluteus medius", "Gluteus minimus", "Tensor fasciae latae"],
    recentMovements: ["Banded lateral walk", "Side-lying leg raise", "Cable hip abduction"],
  },
  "hip-rotators": {
    parts: ["Piriformis", "Deep external rotators", "Internal rotators"],
    recentMovements: ["90/90 hip switch", "Clamshell", "Seated hip rotation"],
  },
  "neck-flexors": {
    parts: ["Deep neck flexors", "Sternocleidomastoid", "Anterior scalenes"],
    recentMovements: ["Chin tuck", "Neck curl", "Isometric hold"],
  },
  "neck-extensors": {
    parts: ["Cervical extensors", "Splenius capitis", "Upper traps support"],
    recentMovements: ["Neck extension", "Prone neck extension", "Isometric hold"],
  },
  "neck-rotators": {
    parts: ["Sternocleidomastoid", "Suboccipital rotators", "Deep cervical rotators"],
    recentMovements: ["Cervical rotation", "Band neck rotation", "Isometric hold"],
  },
  "neck-lateral-flexors": {
    parts: ["Scalenes", "Levator scapulae", "Upper trap assist"],
    recentMovements: ["Lateral neck flexion", "Side neck isometric", "Isometric hold"],
  },
  neck: {
    parts: ["Cervical flexors", "Cervical extensors", "Sternocleidomastoid"],
    recentMovements: ["Neck curl", "Neck extension", "Isometric hold"],
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
  "front-delt": {
    parts: ["Anterior deltoid", "Clavicular head"],
    recentMovements: ["Overhead press", "Front raise", "Incline press"],
  },
  "lateral-delt": {
    parts: ["Middle deltoid", "Acromial head"],
    recentMovements: ["Lateral raise", "Upright row", "Overhead press"],
  },
  "rear-delt": {
    parts: ["Posterior deltoid", "Spinal head"],
    recentMovements: ["Reverse fly", "Face pull", "Wide row"],
  },
  "external-rotation": {
    parts: ["Infraspinatus", "Teres minor"],
    recentMovements: ["Cable external rotation", "Face pull", "Band no-money"],
  },
  "internal-rotation": {
    parts: ["Subscapularis", "Teres major assist"],
    recentMovements: ["Cable internal rotation", "Band press-out", "Belly press"],
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
  rhomboids: {
    parts: ["Rhomboid major", "Rhomboid minor", "Mid trapezius"],
    recentMovements: ["Face pull", "Wide row", "Scap retraction"],
  },
  lats: {
    parts: ["Latissimus dorsi", "Teres major"],
    recentMovements: ["Pull-up", "Pulldown", "Straight-arm pullover"],
  },
  "lower-back": {
    parts: ["Spinal erectors", "Multifidus", "Quadratus lumborum"],
    recentMovements: ["Hip hinge", "Back extension", "Loaded carry"],
  },
};

const musclePartExplainers: Record<string, { detail: string; focus: string }> = {
  "Rectus femoris": {
    detail: "The quad head that crosses the hip and knee, helping with knee extension and hip flexion.",
    focus: "Shows up most when squats, split squats, step-ups, and knee-extension work need a strong front-thigh drive.",
  },
  "Vastus lateralis": {
    detail: "The outer quad head that gives the thigh its lateral sweep and helps lock out knee extension.",
    focus: "Useful context for squat depth, leg press drive, and tracking whether the outer quad is getting enough volume.",
  },
  "Vastus medialis": {
    detail: "The inner quad head near the knee, often important for strong terminal knee extension.",
    focus: "Watch this when knee tracking, split-squat control, or leg-extension lockout is the training focus.",
  },
  "Vastus intermedius": {
    detail: "The deeper quad head under rectus femoris that quietly contributes to knee extension.",
    focus: "It benefits from the same squat, press, and extension work but is easier to miss visually.",
  },
  "Rectus abdominis": {
    detail: "The front abdominal wall that flexes the trunk and helps brace under load.",
    focus: "Relevant for crunch patterns, planks, and keeping the rib cage controlled during heavy lifts.",
  },
  "Transverse abdominis": {
    detail: "A deep corset-like core layer that supports bracing and pressure control.",
    focus: "Shows up in dead bugs, carries, loaded hinges, and any lift where the torso needs to stay quiet.",
  },
  "Latissimus dorsi": {
    detail: "The large back muscle that pulls the arm down and back while supporting shoulder position.",
    focus: "Track it with pulldowns, pull-ups, rows, and straight-arm pullover patterns.",
  },
  "Spinal erectors": {
    detail: "Long back extensors that help hold posture and resist spinal flexion.",
    focus: "Important for hinges, carries, back extensions, and keeping the torso stacked under load.",
  },
};

function getMusclePartExplainer(part: string, muscleLabel: string) {
  return (
    musclePartExplainers[part] ?? {
      detail: `${part} is one of the listed structures contributing to the ${muscleLabel} training target.`,
      focus: `Use this note to understand which specific tissue or sub-region the ${muscleLabel} loader is representing when the plan calls for focused work.`,
    }
  );
}

const muscleDetailOrder = bodyPartGroups.flatMap((group) => group.muscles);

function getMuscleTrainingInsight(slug: BodyCommandMuscleSlug) {
  const meta = muscleMeta[slug];
  if (meta.load.target <= 0) return "Muscle-specific workload and targets are unavailable. Review recorded workouts in History; no training dose or recovery status is inferred.";
  const trainingStatus = getSevenDayTrainingStatus(meta.load);
  const difference = Math.abs(meta.load.target - meta.load.completed);

  if (trainingStatus === "urgent") {
    return `This area is below its seven-day plan target. Add ${difference} focused set${difference === 1 ? "" : "s"} with clean technique before the window closes.`;
  }
  if (trainingStatus === "overworked") {
    return `This area is more than 25% above its seven-day max. Bias recovery and avoid adding hard sets until soreness and performance normalize.`;
  }
  if (trainingStatus === "over") {
    return `This area is above its recommended seven-day volume and trending toward overwork. Keep the next exposure light or recovery-focused.`;
  }
  return "This area is in the prime weekly set zone. Maintain the current dose and let performance and recovery determine the next increase.";
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
  onHoverBodyPartChange,
  onOpenAvatarLab,
  glowFocus,
  glowMode,
  selectedGroupId,
  onSelectGroup,
  viewOverride,
  zoneGlowActive,
  zoneGlowColors,
}: {
  appearance: SoundFitnessAvatarAppearance;
  avatarSceneId: AvatarScenePreset;
  emotePreset: SoundFitnessAvatarEmotePreset;
  onAvatarSceneChange: (scene: AvatarScenePreset) => void;
  onEmoteChange: (emote: SoundFitnessAvatarEmotePreset) => void;
  onHoverBodyPartChange?: (bodyPart: SoundFitnessAvatarBodyPart | null) => void;
  onOpenAvatarLab: () => void;
  glowFocus?: SoundFitnessAvatarGlowRegion | null;
  glowMode?: "whole" | "pieces";
  selectedGroupId: string;
  onSelectGroup: (id: string) => void;
  viewOverride?: "front" | "back";
  zoneGlowActive: boolean;
  zoneGlowColors?: Partial<
    Record<SoundFitnessAvatarGlowRegion, string | undefined>
  >;
}) {
  const [backgroundPickerOpen, setBackgroundPickerOpen] = useState(false);
  const [emoteWheelOpen, setEmoteWheelOpen] = useState(false);

  return (
    <div className="relative h-full min-h-0">
      <div className={`${layoutStyles.avatarActions} absolute inset-x-1 top-1 z-30 flex items-center justify-center gap-1`}>
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
        onHoverBodyPartChange={onHoverBodyPartChange}
        onSelectBodyPart={onSelectGroup}
        glowFocus={glowFocus}
        glowMode={glowMode}
        selectedBodyPart={selectedGroupId as SoundFitnessAvatarBodyPart}
        viewOverride={viewOverride}
        zoneGlowActive={zoneGlowActive}
        zoneGlowColors={zoneGlowColors}
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
  // The outfit tab is the only one with several option groups; without
  // programmatic group labels a screen reader hears twelve bare color names
  // (two of them literally "Ember") with no clue which garment each changes.
  const outfitSectionId = useId();

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
          <div className="relative flex min-h-[260px] flex-col border-b border-white/8 p-2 min-[700px]:border-b-0 min-[700px]:border-r">
            <SoundFitnessAvatar3D
              appearance={appearance}
              className="min-h-[210px] w-full flex-1 rounded-[14px]"
              emotePreset={emotePreset}
            />
            <div className="pointer-events-none relative z-20 mt-2 flex shrink-0 flex-wrap justify-center gap-1 px-3 pb-2">
              {/* Keyed by slot, not value — shirt and shoes both offer an
                  "ember" preset, so raw-value keys can collide. Labels come
                  from the option arrays so chips read "Sound Tee", not the
                  internal id. */}
              {(
                [
                  ["body", appearance.body, avatarBodyOptions],
                  ["face", appearance.face, avatarFaceOptions],
                  ["shirt", appearance.shirt, avatarShirtOptions],
                  ["pants", appearance.pants, avatarPantsOptions],
                  ["shoes", appearance.shoes, avatarShoeOptions],
                  ["hair", appearance.hair, avatarHairOptions],
                  ["gear", appearance.gear, avatarGearOptions],
                ] as Array<
                  [string, string, ReadonlyArray<{ id: string; label: string }>]
                >
              ).map(([slot, value, options]) => (
                <span
                  className="rounded-full border border-white/12 bg-slate-950/72 px-2 py-1 text-[7px] font-black uppercase tracking-[0.09em] text-slate-200 backdrop-blur"
                  key={slot}
                >
                  {options.find((option) => option.id === value)?.label ?? value}
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
                        onClick={() => {
                          // Picking Female while the hair is still the male
                          // default upgrades to Swept — the ponytail style —
                          // so she doesn't inherit the crop. An explicit
                          // non-default hair choice is left alone.
                          if (
                            option.id === "female" &&
                            appearance.hair === "crop"
                          ) {
                            onAppearanceChange({
                              ...appearance,
                              body: "female",
                              hair: "swept",
                            });
                            return;
                          }
                          updateAppearance("body", option.id);
                        }}
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
                  <div className="mb-2 mt-3 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/72">
                    Eyes
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {avatarEyeOptions.map((option) => (
                      <AvatarLabChoice
                        active={appearance.eyes === option.id}
                        key={option.id}
                        label={option.label}
                        onClick={() => updateAppearance("eyes", option.id)}
                        preview={
                          <span
                            className="h-5 w-5 rounded-full border border-white/24 shadow-[inset_0_1px_2px_rgba(255,255,255,0.28)]"
                            style={{ backgroundColor: option.color }}
                          />
                        }
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-[9px] leading-4 text-slate-400">
                    Expressions set the smile, cheeks and pupils; the figure keeps its idle sway.
                  </p>
                </>
              ) : null}

              {activeTab === "outfit" ? (
                <>
                  <div
                    className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/72"
                    id={`${outfitSectionId}-shirt`}
                  >
                    Sound Fitness Tee
                  </div>
                  <div
                    aria-labelledby={`${outfitSectionId}-shirt`}
                    className="grid grid-cols-2 gap-1.5"
                    role="group"
                  >
                    {avatarShirtOptions.map((option) => (
                      <AvatarLabChoice
                        active={appearance.shirt === option.id}
                        key={option.id}
                        label={option.label}
                        onClick={() => updateAppearance("shirt", option.id)}
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
                  <div
                    className="mb-2 mt-3 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/72"
                    id={`${outfitSectionId}-pants`}
                  >
                    Joggers
                  </div>
                  <div
                    aria-labelledby={`${outfitSectionId}-pants`}
                    className="grid grid-cols-2 gap-1.5"
                    role="group"
                  >
                    {avatarPantsOptions.map((option) => (
                      <AvatarLabChoice
                        active={appearance.pants === option.id}
                        key={option.id}
                        label={option.label}
                        onClick={() => updateAppearance("pants", option.id)}
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
                  <div
                    className="mb-2 mt-3 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/72"
                    id={`${outfitSectionId}-shoes`}
                  >
                    Trainers
                  </div>
                  <div
                    aria-labelledby={`${outfitSectionId}-shoes`}
                    className="grid grid-cols-2 gap-1.5"
                    role="group"
                  >
                    {avatarShoeOptions.map((option) => (
                      <AvatarLabChoice
                        active={appearance.shoes === option.id}
                        key={option.id}
                        label={option.label}
                        onClick={() => updateAppearance("shoes", option.id)}
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
                  <div className="mb-2 mt-3 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/72">
                    Hair Colour
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {avatarHairColorOptions.map((option) => (
                      <AvatarLabChoice
                        active={appearance.hairColor === option.id}
                        key={option.id}
                        label={option.label}
                        onClick={() => updateAppearance("hairColor", option.id)}
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
                          option.id === "visor" || option.id === "shades" ? (
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

/**
 * The centred trio and the compact stat rail only ever render the highlighted
 * ring, so "highlighted" never flips on a ring that already exists and the
 * icon/text swap would have nothing to animate. Instead, hold the incoming
 * label for a beat and then swap to the glyph — stepping quickly keeps the
 * names on screen, and settling leaves the icons.
 */
function useSettledGlyphSwap(token: string | number, enabled: boolean) {
  const [showGlyph, setShowGlyph] = useState(false);
  const [settledToken, setSettledToken] = useState(token);

  // Reset during render, not in the effect: an effect lands a frame late, so
  // the incoming ring would flash its glyph and then sink it back out before
  // the label ever rose.
  if (token !== settledToken) {
    setSettledToken(token);
    setShowGlyph(false);
  }

  useEffect(() => {
    if (!enabled) return;
    // Just past the 220ms ghost exit: the outgoing icon has sunk before the
    // incoming one rises, and the swap no longer reads as a lag (it used to
    // wait 620ms). (Speed audit, Sept 2026.)
    const timer = window.setTimeout(() => setShowGlyph(true), 280);
    return () => window.clearTimeout(timer);
  }, [enabled, token]);

  return showGlyph;
}

function TrainingCategorySelector({
  centered = false,
  compact = false,
  selectedGroupId,
  onHoverGroup,
  onSelectGroup,
}: {
  centered?: boolean;
  /** Always use the centred active-plus-previews trio, never the wide rail. */
  compact?: boolean;
  selectedGroupId: string;
  /** A ring or arrow the pointer rests on (or focus) previews its group. */
  onHoverGroup?: (id: string | null) => void;
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
  const groupHover = useMenuHoverIntent<string>((id) => onHoverGroup?.(id));
  // Clicking the already-highlighted category opens its breakdown dialog —
  // mirroring how the muscle rings open MuscleDetailDialog.
  const [detailGroupId, setDetailGroupId] = useState<string | null>(null);
  const [motionDirection, setMotionDirection] = useState<"left" | "right" | null>(null);
  const [motionToken, setMotionToken] = useState(0);
  const centerShowsGlyph = useSettledGlyphSwap(selectedGroupId, true);
  const categoryScrollFrameRef = useRef(0);

  useEffect(() => {
    if (!detailGroupId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailGroupId(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [detailGroupId]);

  const navigateDetail = (direction: -1 | 1) => {
    setDetailGroupId((currentId) => {
      const currentIndex = Math.max(
        0,
        bodyPartGroups.findIndex((group) => group.id === currentId),
      );
      const nextIndex =
        (currentIndex + direction + bodyPartGroups.length) %
        bodyPartGroups.length;
      return bodyPartGroups[nextIndex].id;
    });
  };

  const moveSelection = (direction: -1 | 1) => {
    const nextIndex =
      (selectedIndex + direction + bodyPartGroups.length) %
      bodyPartGroups.length;
    setMotionDirection(direction > 0 ? "left" : "right");
    setMotionToken((token) => token + 1);
    onSelectGroup(bodyPartGroups[nextIndex].id);
    window.requestAnimationFrame(() => scrollToIndex(nextIndex));
  };

  const highlightNearestScrolledCategory = () => {
    if (compact) return;
    const rail = scrollRef.current;
    if (!rail) return;

    window.cancelAnimationFrame(categoryScrollFrameRef.current);
    categoryScrollFrameRef.current = window.requestAnimationFrame(() => {
      const railRect = rail.getBoundingClientRect();
      const railCenter = railRect.left + railRect.width / 2;
      let nearestIndex = selectedIndex;
      let nearestDistance = Number.POSITIVE_INFINITY;

      Array.from(rail.children).forEach((child, index) => {
        const childRect = (child as HTMLElement).getBoundingClientRect();
        const childCenter = childRect.left + childRect.width / 2;
        const distance = Math.abs(childCenter - railCenter);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      const nextGroup = bodyPartGroups[nearestIndex];
      if (nextGroup && nextGroup.id !== selectedGroupId) {
        onSelectGroup(nextGroup.id);
      }
    });
  };

  useEffect(() => {
    return () => window.cancelAnimationFrame(categoryScrollFrameRef.current);
  }, []);

  return (
    <div
      className={`min-w-0 ${compact ? layoutStyles.categorySelector : ""}`}
      onPointerDownCapture={groupHover.notePress}
      onPointerLeave={groupHover.clear}
      onPointerMove={groupHover.clearIfOffTarget}
    >
      {/* Arrows flank the title instead of taking their own row below the
          chips, and render plain (no circular container) — saves a full row of
          card height. */}
      <div className={`${layoutStyles.controlTitleRow} mb-1 flex items-center gap-1`}>
        <span className="h-px flex-1 bg-cyan-100/16" />
        <ScrollControlButton
          direction="left"
          hover={groupHover.bind(selectedGroupId)}
          label="Highlight previous training category"
          onClick={() => moveSelection(-1)}
          plain
        />
        <span
          className={`flex min-w-0 shrink flex-col items-center text-[9px] font-black uppercase leading-[1.04] tracking-[0.06em] min-[520px]:text-[10px] min-[520px]:tracking-[0.11em] ${selectedTone.text}`}
        >
          <span>Training</span>
          <span>Areas</span>
        </span>
        <ScrollControlButton
          direction="right"
          hover={groupHover.bind(selectedGroupId)}
          label="Highlight next training category"
          onClick={() => moveSelection(1)}
          plain
        />
        <span className="h-px flex-1 bg-cyan-100/16" />
      </div>

      <div className={`min-w-0 ${compact ? layoutStyles.categoryBody : ""}`}>
        <div
          className={`hidden min-w-0 snap-x snap-mandatory items-center gap-2 overflow-x-auto overscroll-x-contain px-2 pt-7 pb-2 [scroll-padding-inline:0.5rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${compact ? "" : "min-[760px]:flex"} ${centered && !canScrollBackward && !canScrollForward ? "justify-center" : ""}`}
          onScroll={highlightNearestScrolledCategory}
          ref={scrollRef}
        >
          {bodyPartGroups.map((group) => renderCategoryChip(group, "rail"))}
        </div>
        {/* Narrow widths: the selected category sits centred with one preview
            on each side, matching the hero orbit's indicator pattern, instead
            of a rail that clips whatever does not fit. */}
        <div
          className={`flex min-w-0 items-center justify-center gap-1.5 px-1.5 py-2 min-[760px]:py-1 ${compact ? layoutStyles.categoryTrio : "min-[760px]:hidden"} ${motionDirection === "left" ? layoutStyles.motionScrollLeft : motionDirection === "right" ? layoutStyles.motionScrollRight : ""}`}
          key={`category-motion-${motionToken}`}
        >
          {renderCategoryChip(
            bodyPartGroups[
              (selectedIndex - 1 + bodyPartGroups.length) %
                bodyPartGroups.length
            ],
            "side",
            "left",
          )}
          {renderCategoryChip(bodyPartGroups[selectedIndex], "center")}
          {renderCategoryChip(
            bodyPartGroups[(selectedIndex + 1) % bodyPartGroups.length],
            "side",
            "right",
          )}
        </div>
      </div>
      {detailGroupId ? (
        <CategoryDetailDialog
          groupId={detailGroupId}
          onClose={() => setDetailGroupId(null)}
          onNavigate={navigateDetail}
        />
      ) : null}
    </div>
  );

  function renderCategoryChip(
    group: BodyPartGroup,
    variant: "rail" | "center" | "side",
    slot?: "left" | "right",
  ) {
    const active = group.id === selectedGroupId;
    // The rail keeps every category mounted, so its highlight genuinely moves
    // between rings and the swap plays on its own.
    const showGlyph = variant === "center" ? centerShowsGlyph : active;
    const groupTone = statToneClasses[group.tone];
    // Already the sum of every muscle in the group, so the ring shows the
    // category's combined sets for the last 7 days.
    const groupLoad = getBodyPartGroupLoad(group);
    const groupStatus = getSevenDayTrainingStatus(groupLoad);
    const statusTheme = sevenDayStatusTheme[groupStatus];
    const fill = getSevenDayFill(groupLoad);
    const isSide = variant === "side";
    const opensBreakdown = active && !isSide;
    return (
      <button
        aria-current={opensBreakdown ? "true" : undefined}
        aria-haspopup={opensBreakdown ? "dialog" : undefined}
        aria-label={`${group.label}, ${statusTheme.label}, ${describeTrainingLoad(groupLoad)}${opensBreakdown ? ". Open category breakdown" : ""}`}
        className={`relative grid shrink-0 snap-start place-items-center rounded-full transition-[box-shadow,outline-color,opacity] duration-300 ${groupTone.icon} ${statusTheme.border} ${statusTheme.aura} ${
          isSide
            ? `hidden h-11 w-11 opacity-60 min-[520px]:grid min-[760px]:h-[72px] min-[760px]:w-[72px] min-[760px]:opacity-70 ${
                compact ? layoutStyles.categoryPreview : ""
              }`
            : `h-[84px] w-[84px] min-[520px]:h-[72px] min-[520px]:w-[72px] ${
                compact
                  ? layoutStyles.categoryRing
                  : ""
              }`
        } ${
          active && !isSide
            ? `${statusTheme.shadow}`
            : "shadow-[0_0_18px_rgba(34,211,238,0.09),inset_0_1px_0_rgba(255,255,255,0.08)]"
        }`}
        data-dashboard-tooltip={
          opensBreakdown
            ? `${group.label}: ${describeTrainingLoad(groupLoad)}. Open breakdown.`
            : `${group.label}: ${statusTheme.label} — ${describeTrainingLoad(groupLoad)} in 7 days`
        }
        // The trio is keyed by SLOT, not by category: stepping then updates
        // the same three rings in place, so the centre ring's face can hand
        // off (old glyph out, new label in) instead of being torn down and
        // rebuilt. The rail keeps category keys — every ring is always there.
        key={
          variant === "rail"
            ? `rail-${group.id}`
            : `trio-${slot ?? "center"}`
        }
        onClick={() => {
          // The trio remounts under the pointer/focus, so the preview could
          // not report its own leave; the pulse shows the choice instead.
          groupHover.clear();
          if (opensBreakdown) {
            setDetailGroupId(group.id);
            return;
          }
          if (slot === "left" || slot === "right") {
            setMotionDirection(slot === "right" ? "left" : "right");
            setMotionToken((token) => token + 1);
          }
          onSelectGroup(group.id);
        }}
        {...groupHover.bind(group.id)}
        data-menu-hover=""
        type="button"
      >
        <SegmentedRing
          fill={fill}
          segments={groupLoad.target}
          stroke={statusTheme.ring}
        />
        <span className="relative flex max-w-[66px] flex-col items-center text-center leading-none min-[520px]:max-w-[62px]">
          <BodyCommandRingFace
            glyph={group.glyph}
            glyphClassName={
              isSide
                ? "h-7 w-7 translate-y-0.5"
                : "h-[46px] w-[46px] translate-y-[8px] min-[520px]:h-10 min-[520px]:w-10"
            }
            caption={group.label}
            captionClassName={`${groupTone.text} text-[10px] min-[520px]:text-[9px]`}
            showGlyph={showGlyph}
            tone={group.tone}
          >
            <span
              className={`block max-w-full truncate font-black uppercase leading-tight tracking-normal ${groupTone.text} text-[10px] min-[520px]:text-[9px]`}
            >
              {group.label}
            </span>
          </BodyCommandRingFace>
          {isSide ? null : (
            <span
              className={`mt-1 text-[9px] font-black uppercase leading-tight tracking-normal ${statusTheme.text}`}
            >
              {formatTrainingLoad(groupLoad)}
              <span className="ml-0.5 text-[7px] text-slate-400">sets</span>
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
  const recentSessions = "Not linked";
  const lastTrained = "Not recorded";
  const [activeGroupingPart, setActiveGroupingPart] = useState<string | null>(null);
  const groupingExplainerTitleId = useId();
  const activeGroupingExplainer = activeGroupingPart
    ? getMusclePartExplainer(activeGroupingPart, meta.label)
    : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/76 p-[clamp(10px,3vw,24px)] backdrop-blur-md"
      data-dashboard-wheel-lock="true"
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
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex shrink-0 translate-y-1.5 flex-col items-center gap-1">
              <span className={`relative grid h-12 w-12 place-items-center rounded-full border ${categoryTone.icon} ${statusTheme.shadow}`}>
                <SegmentedRing
                  fill={fill}
                  segments={meta.load.target}
                  stroke={statusTheme.ring}
                />
                <span className="relative flex flex-col items-center text-center leading-none">
                  <span className={`text-[10px] font-black uppercase leading-none ${categoryTone.text}`}>
                    {formatTrainingLoad(meta.load)}
                  </span>
                  <span className="mt-0.5 text-[6px] font-black uppercase tracking-[0.08em] text-slate-400">
                    sets
                  </span>
                </span>
              </span>
              <DetailHeaderControls
                nextLabel="Next muscle group"
                onNavigate={onNavigate}
                previousLabel="Previous muscle group"
              />
            </div>
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-[8px] font-black uppercase tracking-[0.16em] ${categoryTone.text}`}>
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

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 [scrollbar-color:rgba(34,211,238,0.38)_rgba(15,23,42,0.32)] [scrollbar-width:thin]"
          data-dashboard-orbiter-local-scroll="true"
        >
          <DetailMetricCarousel
            items={[
              { label: "7-day sets", value: "Not mapped" },
              { label: "Plan target", value: "Not mapped" },
              { label: "Sessions", value: `${recentSessions}` },
              { label: "Last trained", value: lastTrained },
            ]}
          >
            <div className="mt-3 rounded-[10px] border border-white/10 bg-slate-950/38 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">Seven-day plan volume</span>
                <span className={`text-[8px] font-black uppercase tracking-[0.1em] ${statusTheme.text}`}>{statusTheme.label}</span>
              </div>
              <SetBlipBar
                load={meta.load}
                ringColor={statusTheme.ring}
                setDetails={[]}
                statusLabel={statusTheme.label}
                statusTextClassName={statusTheme.text}
                subject={meta.label}
              />
              <div className="mt-1.5 flex items-center justify-between text-[8px] font-bold text-slate-400">
                <span>Recorded sets not mapped</span>
                <span>Targets not mapped</span>
              </div>
            </div>
          </DetailMetricCarousel>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <DetailInlineScrollSection
              compactControls
              nextLabel="Scroll muscle grouping right"
              previousLabel="Scroll muscle grouping left"
              title="Muscle grouping"
              titleClassName={categoryTone.text}
            >
                {details.parts.map((part) => (
                  <span
                    className={`inline-flex h-5 flex-none snap-start items-center gap-1 whitespace-nowrap rounded-full border py-0 pl-2 pr-1 text-[8px] font-black leading-none ${categoryTone.icon}`}
                    key={part}
                  >
                    <span>{part}</span>
                    <button
                      aria-label={`Explain ${part}`}
                      className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-white/[0.08] text-cyan-100/90 transition hover:bg-cyan-200/20 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveGroupingPart(part);
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                      type="button"
                    >
                      <Info aria-hidden="true" className="h-2.5 w-2.5" strokeWidth={2.5} />
                    </button>
                  </span>
                ))}
            </DetailInlineScrollSection>
            <DetailInlineScrollSection
              nextLabel="Scroll example movements right"
              previousLabel="Scroll example movements left"
              title="Example movements"
              titleClassName={categoryTone.text}
            >
                {details.recentMovements.map((movement) => (
                  <div
                    className="flex min-w-[9.4rem] flex-none snap-start items-center justify-between gap-3 rounded-[7px] border border-white/8 bg-white/[0.025] px-2.5 py-1.5"
                    key={movement}
                  >
                    <span className="min-w-0 truncate text-[9px] font-bold text-slate-200">{movement}</span>
                    <span className="shrink-0 text-[7px] font-black uppercase text-slate-500">
                      Example only
                    </span>
                  </div>
                ))}
            </DetailInlineScrollSection>
          </div>

          <div className={`mt-3 rounded-[10px] border p-3 ${categoryTone.icon}`}>
            <span className="block text-[8px] font-black uppercase tracking-[0.16em]">Plan insight</span>
            <p className="mt-1.5 text-[11px] font-semibold leading-relaxed text-slate-100">{getMuscleTrainingInsight(slug)}</p>
          </div>
        </div>

      </section>
      {activeGroupingPart && activeGroupingExplainer ? (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            event.stopPropagation();
            if (event.currentTarget === event.target) {
              setActiveGroupingPart(null);
            }
          }}
        >
          <section
            aria-labelledby={groupingExplainerTitleId}
            aria-modal="true"
            className={`w-full max-w-[340px] rounded-[14px] border bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.16),transparent_38%),linear-gradient(145deg,rgba(15,23,42,0.98),rgba(2,6,23,0.99))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.68),inset_0_1px_0_rgba(255,255,255,0.12)] ${categoryTone.icon}`}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className={`block text-[8px] font-black uppercase tracking-[0.16em] ${categoryTone.text}`}>
                  Muscle grouping
                </span>
                <span
                  className="mt-1 block text-base font-black uppercase tracking-[0.03em] text-white"
                  id={groupingExplainerTitleId}
                >
                  {activeGroupingPart}
                </span>
              </span>
              <button
                aria-label="Close muscle grouping explainer"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.035] text-slate-300 transition hover:border-cyan-100/38 hover:text-white"
                onClick={() => setActiveGroupingPart(null)}
                type="button"
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-3 text-[11px] font-semibold leading-relaxed text-slate-100">
              {activeGroupingExplainer.detail}
            </p>
            <p className="mt-2 text-[10px] font-bold leading-relaxed text-slate-300">
              {activeGroupingExplainer.focus}
            </p>
          </section>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}

function CategoryBreakdownRail({
  muscles,
  titleClassName,
}: {
  muscles: BodyCommandMuscleSlug[];
  titleClassName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);
  const dragScrollHandlers = useHorizontalDragScroll(railRef);

  const highlightMuscle = useCallback((nextIndex: number) => {
    const normalizedIndex = (nextIndex + muscles.length) % muscles.length;
    setActiveIndex(normalizedIndex);
    window.requestAnimationFrame(() => {
      const item = railRef.current?.children.item(normalizedIndex) as HTMLElement | null;
      item?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    });
  }, [muscles.length]);

  useEffect(() => {
    if (activeIndex < muscles.length) return;
    setActiveIndex(0);
  }, [activeIndex, muscles.length]);

  return (
    <div className="mt-3">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <h3 className={`min-w-0 text-[8px] font-black uppercase tracking-[0.16em] ${titleClassName}`}>
          Category breakdown
        </h3>
        <div
          aria-label={`${muscles.length} muscles in this category`}
          className="flex shrink-0 items-center gap-1"
          data-dashboard-category-breakdown-dots="true"
          role="group"
        >
          {muscles.map((slug, index) => {
            const meta = muscleMeta[slug];
            const muscleStatus = getSevenDayTrainingStatus(meta.load);
            const muscleTheme = sevenDayStatusTheme[muscleStatus];
            const isActive = index === activeIndex;

            return (
              <button
                aria-label={`${meta.label}: ${muscleTheme.label}, ${describeTrainingLoad(meta.load)}`}
                aria-pressed={isActive}
                className="grid h-4 w-4 place-items-center rounded-full transition active:scale-95"
                key={slug}
                onClick={() => highlightMuscle(index)}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={`block rounded-full transition-[height,width,box-shadow,opacity] duration-150 ${
                    isActive ? "h-2.5 w-2.5 opacity-100" : "h-1.5 w-1.5 opacity-70"
                  }`}
                  style={{
                    backgroundColor: muscleTheme.ring,
                    boxShadow: isActive ? `0 0 9px ${muscleTheme.ring}` : undefined,
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex min-w-0 items-stretch">
        <div
          className="flex min-w-0 flex-1 cursor-grab snap-x gap-2 overflow-x-auto overscroll-x-contain pb-1 scroll-smooth [scrollbar-width:none] [touch-action:pan-x] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
          data-dashboard-category-breakdown-rail="true"
          data-dashboard-orbiter-local-scroll="true"
          ref={railRef}
          {...dragScrollHandlers}
        >
          {muscles.map((slug, index) => {
            const meta = muscleMeta[slug];
            const muscleStatus = getSevenDayTrainingStatus(meta.load);
            const muscleTheme = sevenDayStatusTheme[muscleStatus];
            const isActive = index === activeIndex;

            return (
              <div
                aria-current={isActive ? "true" : undefined}
                aria-label={`${meta.label}, ${muscleTheme.label}, ${describeTrainingLoad(meta.load)}`}
                className={`min-w-[14rem] flex-[0_0_78%] snap-center rounded-[8px] border p-2.5 text-left transition duration-200 sm:flex-[0_0_15rem] ${
                  isActive
                    ? `${muscleTheme.border} bg-white/[0.055] shadow-[0_0_20px_rgba(255,255,255,0.08)]`
                    : "border-white/8 bg-white/[0.025] hover:border-white/16 hover:bg-white/[0.045]"
                }`}
                key={slug}
                onClick={() => highlightMuscle(index)}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {isActive ? (
                      <button
                        aria-label="Highlight previous category muscle"
                        className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-slate-300 transition hover:bg-white/[0.07] hover:text-cyan-100 active:scale-95"
                        onClick={(event) => {
                          event.stopPropagation();
                          highlightMuscle(activeIndex - 1);
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                        type="button"
                      >
                        <ChevronLeft aria-hidden="true" className="h-3 w-3" />
                      </button>
                    ) : null}
                    <span className="truncate text-[10px] font-black uppercase tracking-[0.04em] text-slate-100">
                      {meta.label}
                    </span>
                    {isActive ? (
                      <button
                        aria-label="Highlight next category muscle"
                        className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-slate-300 transition hover:bg-white/[0.07] hover:text-cyan-100 active:scale-95"
                        onClick={(event) => {
                          event.stopPropagation();
                          highlightMuscle(activeIndex + 1);
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                        type="button"
                      >
                        <ChevronRight aria-hidden="true" className="h-3 w-3" />
                      </button>
                    ) : null}
                  </span>
                  <span className={`shrink-0 text-[8px] font-black uppercase ${muscleTheme.text}`}>
                    {formatTrainingLoad(meta.load)} sets
                  </span>
                </span>
                <SetBlipBar
                  load={meta.load}
                  ringColor={muscleTheme.ring}
                  setDetails={[]}
                  statusLabel={muscleTheme.label}
                  statusTextClassName={muscleTheme.text}
                  subject={meta.label}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CategoryDetailDialog({
  groupId,
  onClose,
  onNavigate,
}: {
  groupId: string;
  onClose: () => void;
  onNavigate: (direction: -1 | 1) => void;
}) {
  const group =
    bodyPartGroups.find((candidate) => candidate.id === groupId) ??
    bodyPartGroups[0];
  const groupTone = statToneClasses[group.tone];
  const groupLoad = getBodyPartGroupLoad(group);
  const groupStatus = getSevenDayTrainingStatus(groupLoad);
  const statusTheme = sevenDayStatusTheme[groupStatus];
  const fill = getSevenDayFill(groupLoad);
  const insight =
    groupStatus === "unknown" ? "Muscle-specific set history and targets are not mapped. No plan dose or recovery adjustment is inferred." : groupStatus === "overworked"
      ? `${group.label} is overworked — it is more than 25% above the weekly max, so bias recovery before adding hard sets.`
      : groupStatus === "over"
        ? `${group.label} volume is above recommendation and starting to turn red — keep accessory work light this week.`
        : groupStatus === "primed"
          ? `${group.label} is close to perfect in the orange prime zone — keep the current split and set quality where it is.`
          : `${group.label} is behind plan — schedule its next session first so the week catches up.`;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/76 p-[clamp(10px,3vw,24px)] backdrop-blur-md"
      data-dashboard-wheel-lock="true"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        aria-label={`${group.label} category breakdown`}
        aria-modal="true"
        className={`relative flex max-h-[calc(100dvh-20px)] w-full max-w-[620px] flex-col overflow-hidden rounded-[14px] border bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.13),transparent_34%),radial-gradient(circle_at_92%_16%,rgba(251,191,36,0.09),transparent_28%),linear-gradient(145deg,rgba(10,18,34,0.97),rgba(2,6,23,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.12)] ${statusTheme.border}`}
        role="dialog"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex shrink-0 translate-y-1.5 flex-col items-center gap-1">
              <span className={`relative grid h-12 w-12 place-items-center rounded-full border ${groupTone.icon} ${statusTheme.shadow}`}>
                <SegmentedRing
                  fill={fill}
                  segments={groupLoad.target}
                  stroke={statusTheme.ring}
                />
                <BodyCommandRingFace
                  glyph={group.glyph}
                  glyphClassName="h-8 w-8"
                  showGlyph
                  tone={group.tone}
                >
                  <span className="sr-only">
                    {group.label}
                  </span>
                </BodyCommandRingFace>
              </span>
              <DetailHeaderControls
                nextLabel="Next training category"
                onNavigate={onNavigate}
                previousLabel="Previous training category"
              />
            </div>
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-[8px] font-black uppercase tracking-[0.16em] ${groupTone.text}`}>
                Training category
              </span>
              <span className="block truncate text-xl font-black uppercase tracking-[0.03em] text-white">
                {group.label}
              </span>
            </span>
          </div>
          <button
            aria-label="Close category breakdown"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.035] text-slate-300 transition hover:border-cyan-100/38 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 [scrollbar-color:rgba(34,211,238,0.38)_rgba(15,23,42,0.32)] [scrollbar-width:thin]"
          data-dashboard-orbiter-local-scroll="true"
        >
          <div className="rounded-[10px] border border-white/10 bg-slate-950/38 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">7day volume</span>
              <span className={`text-[9px] font-black uppercase tracking-[0.08em] ${statusTheme.text}`}>
                {formatTrainingLoad(groupLoad)}
              </span>
            </div>
            <SetBlipBar
              hideStatusFooter
              load={groupLoad}
              ringColor={statusTheme.ring}
              scrollable
              scrollLabel={`${group.label} category volume`}
              setDetails={[]}
              statusLabel={statusTheme.label}
              statusTextClassName={statusTheme.text}
              subject={group.label}
            />
          </div>

          <CategoryBreakdownRail
            muscles={group.muscles}
            titleClassName={groupTone.text}
          />

          <div className={`mt-3 rounded-[10px] border p-3 ${groupTone.icon}`}>
            <span className="block text-[8px] font-black uppercase tracking-[0.16em]">Plan insight</span>
            <p className="mt-1.5 text-[11px] font-semibold leading-relaxed text-slate-100">{insight}</p>
          </div>
        </div>

      </section>
    </div>,
    document.body,
  );
}

function MuscleGroupPanel({
  compact = false,
  onHighlightMuscle,
  onHoverMuscle,
  showTitle = true,
  selectedGroupId,
}: {
  compact?: boolean;
  /** Reports the muscle currently under the highlight so the card can turn
      the avatar around for posterior ones (rear delt, external rotators). */
  onHighlightMuscle?: (slug: BodyCommandMuscleSlug, userInitiated: boolean) => void;
  /** A ring or arrow the pointer rests on (or focus) previews its muscle. */
  onHoverMuscle?: (slug: BodyCommandMuscleSlug | null) => void;
  showTitle?: boolean;
  selectedGroupId: string;
}) {
  const selectedGroup =
    bodyPartGroups.find((group) => group.id === selectedGroupId) ??
    bodyPartGroups[0];
  const selectedTone = statToneClasses[selectedGroup.tone];
  const muscleHover = useMenuHoverIntent<BodyCommandMuscleSlug>((slug) =>
    onHoverMuscle?.(slug),
  );
  const {
    scrollRef,
    scrollToIndex,
  } = useScrollControls("vertical");

  // Whole rows only: the grid's flex height could end anywhere inside a row,
  // leaving a half-cut ring at the bottom. Cap the scroller at a whole number
  // of row strides (row height + gap, plus its own padding) whenever its host
  // or the cells resize; scroll-snap on the cells keeps scrolling on row
  // boundaries as well. Imperative style write, no re-render.
  useLayoutEffect(() => {
    if (compact) return;
    const scroller = scrollRef.current;
    const host = scroller?.parentElement;
    if (!scroller || !host) return;
    let currentRows = 0;
    let growTimer = 0;
    const measure = () => {
      const cell = scroller.firstElementChild as HTMLElement | null;
      if (!cell) return null;
      const styles = getComputedStyle(scroller);
      const gap = parseFloat(styles.rowGap) || 0;
      const padY =
        (parseFloat(styles.paddingTop) || 0) +
        (parseFloat(styles.paddingBottom) || 0);
      const stride = cell.offsetHeight + gap;
      if (stride <= 0) return null;
      const available = host.clientHeight - padY;
      const rows = Math.max(1, Math.floor((available + gap) / stride));
      return { gap, padY, rows, stride };
    };
    const apply = (m: NonNullable<ReturnType<typeof measure>>) => {
      currentRows = m.rows;
      scroller.style.maxHeight = `${m.rows * m.stride - m.gap + m.padY}px`;
    };
    const fit = () => {
      const m = measure();
      if (!m) return;
      // Shrink at once (a row that no longer fits must not linger half-cut),
      // but GROW only after the extra room has held for a beat: the host
      // changes height when the header opens/idles or deferred content
      // settles, and a row that popped in only to vanish again read as a
      // glitch. Better that it never appears than that it appears and goes.
      if (currentRows === 0 || m.rows < currentRows) {
        window.clearTimeout(growTimer);
        growTimer = 0;
        apply(m);
        return;
      }
      if (m.rows > currentRows && growTimer === 0) {
        growTimer = window.setTimeout(() => {
          growTimer = 0;
          const again = measure();
          if (again && again.rows > currentRows) apply(again);
        }, 600);
      }
    };
    fit();
    const observer = new ResizeObserver(() => fit());
    observer.observe(host);
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);
    return () => {
      observer.disconnect();
      window.clearTimeout(growTimer);
      scroller.style.maxHeight = "";
    };
  }, [compact, scrollRef, selectedGroup.muscles.length]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [detailSlug, setDetailSlug] = useState<BodyCommandMuscleSlug | null>(null);
  const [compactGrid, setCompactGrid] = useState({ columns: 3, rows: 1 });
  const [motionDirection, setMotionDirection] = useState<"left" | "right" | null>(null);
  const [motionToken, setMotionToken] = useState(0);
  const muscleScrollFrameRef = useRef(0);
  const safeHighlightedIndex = Math.min(
    highlightedIndex,
    selectedGroup.muscles.length - 1,
  );

  useLayoutEffect(() => {
    if (!compact) return;
    const rail = scrollRef.current;
    if (!rail) return;

    const fit = () => {
      const columns = rail.clientWidth < 240 ? 1 : Math.max(
        1,
        Math.min(
          selectedGroup.muscles.length,
          Math.floor((Math.max(0, rail.clientWidth) + 8) / 80),
        ),
      );
      // In the narrow lane, give the selected ring the available height.
      // Stacking a second row makes both rings small despite the tall column.
      const rows = rail.clientWidth >= 240 && rail.clientHeight >= 150 ? 2 : 1;
      setCompactGrid((current) =>
        current.columns === columns && current.rows === rows
          ? current
          : { columns, rows },
      );
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [compact, motionToken, scrollRef, selectedGroup.muscles.length]);

  useEffect(() => {
    if (!detailSlug) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailSlug(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [detailSlug]);

  // Report the highlighted muscle upward (the avatar turns for posterior
  // ones). Runs on group change too, so the reset to index 0 is reported.
  // The report also says whether it is the user stepping or just the panel
  // introducing its first muscle after mount — the parent uses that to keep
  // the avatar dark on load. Comparing against the mount-time slug (rather
  // than counting reports) keeps Strict Mode's double effect run honest.
  const highlightedSlug = selectedGroup.muscles[safeHighlightedIndex];
  // Flipped by the arrows and ring clicks. Until then every report is the
  // panel introducing its first muscle after mount (the category's whole-part
  // silhouette), not the user picking one. The old "differs from the mount
  // slug" test could never report the group's FIRST muscle (biceps, quads,
  // traps...) as picked, so the avatar stayed on the whole-arm glow for it.
  const userPickedRef = useRef(false);
  useEffect(() => {
    if (!highlightedSlug) return;
    onHighlightMuscle?.(highlightedSlug, userPickedRef.current);
  }, [highlightedSlug, onHighlightMuscle]);
  useEffect(() => {
    return () => window.cancelAnimationFrame(muscleScrollFrameRef.current);
  }, []);

  // Picking the muscle already under the highlight changes no state, so the
  // effect above stays silent — report every pick directly as well.
  const pickHighlight = (index: number) => {
    userPickedRef.current = true;
    setHighlightedIndex(index);
    onHighlightMuscle?.(selectedGroup.muscles[index], true);
  };

  const highlightNearestScrolledMuscle = () => {
    if (compact) return;
    const rail = scrollRef.current;
    if (!rail) return;

    window.cancelAnimationFrame(muscleScrollFrameRef.current);
    muscleScrollFrameRef.current = window.requestAnimationFrame(() => {
      const railRect = rail.getBoundingClientRect();
      const railCenter = railRect.top + railRect.height / 2;
      let nearestIndex = safeHighlightedIndex;
      let nearestDistance = Number.POSITIVE_INFINITY;

      Array.from(rail.children).forEach((child) => {
        const element = child as HTMLElement;
        const muscleIndex = Number(element.dataset.muscleIndex);
        if (!Number.isFinite(muscleIndex)) return;
        const childRect = element.getBoundingClientRect();
        const childCenter = childRect.top + childRect.height / 2;
        const distance = Math.abs(childCenter - railCenter);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = muscleIndex;
        }
      });

      if (nearestIndex !== safeHighlightedIndex) {
        pickHighlight(nearestIndex);
      }
    });
  };

  const moveHighlight = (direction: -1 | 1) => {
    const nextIndex =
      (safeHighlightedIndex + direction + selectedGroup.muscles.length) %
      selectedGroup.muscles.length;

    if (!compact) {
      window.requestAnimationFrame(() => scrollToIndex(nextIndex));
    } else {
      setMotionDirection(direction > 0 ? "left" : "right");
      setMotionToken((token) => token + 1);
    }
    pickHighlight(nextIndex);
  };

  const compactVisibleCount = compact
    ? Math.max(
        1,
        Math.min(
          selectedGroup.muscles.length,
          compactGrid.columns * compactGrid.rows,
        ),
      )
    : selectedGroup.muscles.length;
  const compactShowsAll =
    compact && compactVisibleCount >= selectedGroup.muscles.length;
  useEffect(() => {
    if (!compact || compactShowsAll) {
      setMotionDirection(null);
    }
  }, [compact, compactShowsAll]);
  const compactPreviewIndexes = compact
    ? compactShowsAll
      ? selectedGroup.muscles.map((_, index) => index)
      : Array.from({ length: compactVisibleCount }, (_, offset) => {
          const start =
            safeHighlightedIndex - Math.floor((compactVisibleCount - 1) / 2);
          return (
            (start + offset + selectedGroup.muscles.length) %
            selectedGroup.muscles.length
          );
        })
    : [];
  const visibleMuscles = compact
    ? compactPreviewIndexes.map((index) => ({
        index,
        slug: selectedGroup.muscles[index],
      }))
    : selectedGroup.muscles.map((slug, index) => ({ index, slug }));

  const navigateDetail = (direction: -1 | 1) => {
    if (!detailSlug) return;
    const currentIndex = muscleDetailOrder.indexOf(detailSlug);
    const nextIndex =
      (currentIndex + direction + muscleDetailOrder.length) % muscleDetailOrder.length;
    setDetailSlug(muscleDetailOrder[nextIndex]);
  };

  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 flex-col"
      onPointerDownCapture={muscleHover.notePress}
      onPointerLeave={muscleHover.clear}
      onPointerMove={muscleHover.clearIfOffTarget}
    >
      {compact ? (
        <div className={`mb-1 grid items-center gap-1 ${compactShowsAll ? "grid-cols-1" : "grid-cols-[24px_minmax(0,1fr)_24px]"}`}>
          {compactShowsAll ? null : (
            <ScrollControlButton
              direction="left"
              hover={muscleHover.bind(selectedGroup.muscles[safeHighlightedIndex])}
              label="Highlight previous muscle level"
              onClick={() => moveHighlight(-1)}
              plain
            />
          )}
          <span className={`flex flex-col text-center text-[9px] font-black uppercase leading-[1.2] tracking-normal ${selectedTone.text}`}>
            <span>Muscle</span>
            <span>Levels</span>
          </span>
          {compactShowsAll ? null : (
            <ScrollControlButton
              direction="right"
              hover={muscleHover.bind(selectedGroup.muscles[safeHighlightedIndex])}
              label="Highlight next muscle level"
              onClick={() => moveHighlight(1)}
              plain
            />
          )}
        </div>
      ) : showTitle ? (
        // Scroll arrows flank the title (same pattern as Training
        // Categories) instead of taking their own row — the saved height is
        // what lets a full ring row stay visible on short viewports.
        <div className="mb-1 flex items-center gap-1">
          <span className="h-px flex-1 bg-cyan-100/16" />
          <ScrollControlButton
            direction="down"
            hover={muscleHover.bind(selectedGroup.muscles[safeHighlightedIndex])}
            label="Highlight next muscle level"
            onClick={() => moveHighlight(1)}
            plain
          />
          <span className={`shrink-0 text-[8px] font-black uppercase tracking-[0.1em] min-[760px]:text-[9px] min-[760px]:tracking-[0.18em] ${selectedTone.text}`}>
            Muscle Levels
          </span>
          <ScrollControlButton
            direction="up"
            hover={muscleHover.bind(selectedGroup.muscles[safeHighlightedIndex])}
            label="Highlight previous muscle level"
            onClick={() => moveHighlight(-1)}
            plain
          />
          <span className="h-px flex-1 bg-cyan-100/16" />
        </div>
      ) : null}

      <div className="relative flex min-h-0 flex-1 flex-col overflow-visible">
        <div
          className={`grid min-h-0 flex-1 grid-cols-1 content-start gap-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${compact ? `${layoutStyles.compactMuscleRail} overflow-hidden ${!compactShowsAll && motionDirection === "left" ? layoutStyles.motionScrollLeft : !compactShowsAll && motionDirection === "right" ? layoutStyles.motionScrollRight : ""}` : "snap-y snap-mandatory overflow-y-auto overscroll-y-contain p-1 min-[760px]:grid-cols-2 min-[760px]:gap-1 min-[760px]:py-0"}`}
          key={compact ? `muscle-motion-${motionToken}` : undefined}
          onScroll={highlightNearestScrolledMuscle}
          ref={scrollRef}
          style={
            compact
              ? ({
                  "--compact-muscle-columns": compactGrid.columns,
                } as CSSProperties)
              : undefined
          }
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
                className={`relative grid min-w-0 snap-start place-items-center ${
                  compact
                    ? `h-full min-h-0 px-0 py-0 ${index === safeHighlightedIndex ? layoutStyles.compactMuscleActive : layoutStyles.compactMusclePreview}`
                    : "min-h-[104px] px-1 py-2 min-[520px]:min-h-[92px] min-[760px]:min-h-[80px] min-[760px]:px-2 min-[760px]:py-1"
                }`}
                data-muscle-index={index}
                key={slug}
              >
                <button
                  aria-label={`${meta.label}, ${meta.family}, ${statusTheme.label}, ${describeTrainingLoad(meta.load)}`}
                  aria-haspopup="dialog"
                  className={`relative grid shrink-0 place-items-center rounded-full transition-[box-shadow,outline-color] duration-300 ${compact ? "h-[72px] w-[72px]" : "h-[84px] w-[84px] min-[520px]:h-[72px] min-[520px]:w-[72px]"} ${categoryTone.icon} ${statusTheme.border} ${statusTheme.aura} ${
                    index === safeHighlightedIndex
                      ? `${statusTheme.shadow}`
                      : "shadow-[0_0_18px_rgba(34,211,238,0.09),inset_0_1px_0_rgba(255,255,255,0.08)]"
                  }`}
                  data-dashboard-tooltip={
                    index === safeHighlightedIndex
                      ? `${meta.label}: ${describeTrainingLoad(meta.load)}. Open details.`
                      : `${meta.label}: ${describeTrainingLoad(meta.load)}. Highlight muscle.`
                  }
                  onClick={() => {
                    muscleHover.clear();
                    const alreadyHighlighted = index === safeHighlightedIndex;
                    if (compact && !compactShowsAll && index !== safeHighlightedIndex) {
                      setMotionDirection(index > safeHighlightedIndex ? "left" : "right");
                      setMotionToken((token) => token + 1);
                    }
                    pickHighlight(index);
                    if (alreadyHighlighted) {
                      setDetailSlug(slug);
                    }
                  }}
                  {...muscleHover.bind(slug)}
                  data-menu-hover=""
                  type="button"
                >
                  <SegmentedRing
                    fill={fill}
                    segments={meta.load.target}
                    stroke={statusTheme.ring}
                  />
                  <span className={`relative flex flex-col items-center text-center leading-none ${compact ? "max-w-[52px]" : "max-w-[68px] min-[520px]:max-w-[58px]"}`}>
                    <span className={`text-[10px] font-black uppercase leading-tight tracking-normal min-[520px]:text-[9px] ${categoryTone.text}`}>
                      {meta.label}
                    </span>
                    <span className={`mt-1 text-[9px] font-black uppercase leading-tight tracking-normal min-[520px]:text-[8px] ${statusTheme.text}`}>
                      {formatTrainingLoad(meta.load)}
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
  const evidenceSnapshot = useSyncExternalStore(subscribeDashboardPlanEvidence, bodyCommandEvidenceSnapshot, serverBodyCommandEvidence);
  const bodyCommandSupportStats = useMemo(() => createBodyCommandSupportStats(JSON.parse(evidenceSnapshot) as BodyCommandEvidence), [evidenceSnapshot]);
  // Shared between the avatar hotspots and the muscle-group panel.
  const [selectedGroupId, setSelectedGroupId] = useState<string>("legs");
  // Reported up by MuscleGroupPanel — drives the posterior view flip below,
  // and re-arms the glow flash so stepping through muscles keeps showing
  // each one's status color.
  const [highlightedMuscle, setHighlightedMuscle] =
    useState<BodyCommandMuscleSlug | null>(null);
  // Whether the highlighted muscle was stepped to on purpose, as opposed to
  // being the panel's first muscle after a category change. Browsing
  // categories lights the whole body part as one silhouette; only a
  // deliberate step into Muscle Levels breaks it into individual muscles.
  const [highlightedMusclePicked, setHighlightedMusclePicked] = useState(false);
  // Menu previews: a group ring/arrow or a muscle ring/arrow the pointer is
  // resting on (or focus is on), reported by the rails' hover-intent hooks.
  const [menuHoveredGroup, setMenuHoveredGroup] =
    useState<SoundFitnessAvatarBodyPart | null>(null);
  const [menuHoveredMuscle, setMenuHoveredMuscle] =
    useState<BodyCommandMuscleSlug | null>(null);
  // The avatar glow stays dark on load: the default group and the panel's
  // first mount-time report are not the user choosing anything. A choice the
  // user makes lights the matching category briefly. An explicitly selected
  // muscle stays lit while it is being inspected; hover remains a preview.
  const [avatarSelectionPulseToken, setAvatarSelectionPulseToken] = useState(0);
  const pulseAvatarSelection = useCallback(() => {
    setAvatarSelectionPulseToken((token) => token + 1);
  }, []);
  const selectGroupFromUser = useCallback(
    (id: string) => {
      pulseAvatarSelection();
      setHighlightedMuscle(null);
      setHighlightedMusclePicked(false);
      setSelectedGroupId(id);
    },
    [pulseAvatarSelection],
  );
  const handleHighlightMuscle = useCallback(
    (slug: BodyCommandMuscleSlug, userInitiated: boolean) => {
      if (userInitiated) pulseAvatarSelection();
      setHighlightedMuscle(slug);
      setHighlightedMusclePicked(userInitiated);
    },
    [pulseAvatarSelection],
  );
  // The muscle rail remounts with the group, so a hovered ring could not
  // report its own leave; the preview is dropped with the group change and
  // only then (a same-group pick leaves the rail, and its hover, alone).
  useEffect(() => {
    setMenuHoveredMuscle(null);
  }, [selectedGroupId]);
  const [avatarSelectionPulse, setAvatarSelectionPulse] = useState(false);
  const [avatarHoveredBodyPart, setAvatarHoveredBodyPart] =
    useState<SoundFitnessAvatarBodyPart | null>(null);
  useEffect(() => {
    if (!avatarSelectionPulseToken) return;
    setAvatarSelectionPulse(true);
    const timer = window.setTimeout(
      () => setAvatarSelectionPulse(false),
      avatarSelectionPulseMs,
    );
    return () => window.clearTimeout(timer);
  }, [avatarSelectionPulseToken]);
  // Glow in the same seven-day status colors the legend under the avatar and
  // the muscle rings already use — green when cool/on target, amber under,
  // orange prime, rose over. Back and chest pass per-muscle colors so their
  // specific regions (traps, upper/lower back, upper/mid/lower chest) each
  // reflect their own status; the other groups glow with their aggregate.
  const muscleStatusRing = (slug: BodyCommandMuscleSlug) =>
    sevenDayStatusTheme[getSevenDayTrainingStatus(muscleMeta[slug].load)].ring;
  const groupStatusRing = (groupId: string) => {
    const group = bodyPartGroups.find((entry) => entry.id === groupId);
    if (!group) return undefined;
    return sevenDayStatusTheme[
      getSevenDayTrainingStatus(getBodyPartGroupLoad(group))
    ].ring;
  };
  const selectedBodyPartGroup =
    bodyPartGroups.find((entry) => entry.id === selectedGroupId) ??
    bodyPartGroups[0];
  // Which avatar region the scrolled muscle lights up. Muscles with no
  // dedicated region fall back to their group's region, so the group still
  // reads as selected even where the figure has no per-muscle silhouette.
  const avatarFocusRegionByMuscle: Partial<
    Record<BodyCommandMuscleSlug, SoundFitnessAvatarGlowRegion>
  > = {
    abs: "core",
    adductors: "adductors",
    abductors: "abductors",
    "hip-rotators": "hipRotators",
    neck: "neck",
    "neck-flexors": "neck",
    "neck-extensors": "neck",
    "neck-rotators": "neck",
    "neck-lateral-flexors": "neck",
    biceps: "biceps",
    forearm: "forearms",
    triceps: "triceps",
    calves: "calves",
    "external-rotation": "rotatorExternal",
    "front-delt": "frontDelt",
    gluteal: "glutes",
    hamstring: "hamstrings",
    "internal-rotation": "rotatorInternal",
    "lateral-delt": "lateralDelt",
    lats: "lats",
    "lower-back": "lowerBack",
    rhomboids: "rhomboids",
    "lower-chest": "lowerChest",
    "mid-chest": "midChest",
    obliques: "obliques",
    quadriceps: "quads",
    "rear-delt": "rearDelt",
    tibialis: "tibialis",
    trapezius: "traps",
    "upper-chest": "upperChest",
  };
  // Browsing a category lights it as one silhouette (no per-muscle focus);
  // stepping into a muscle switches to the individual regions with that one
  // bright and the rest dimmed.
  // A muscle ring the pointer rests on previews its region exactly like a
  // picked one; otherwise the picked muscle (if any) is the focus. A slug
  // from a previous group (the rail remounts) is ignored.
  const menuHoveredMuscleInGroup =
    menuHoveredMuscle && selectedBodyPartGroup.muscles.includes(menuHoveredMuscle)
      ? menuHoveredMuscle
      : null;
  const focusMuscle =
    menuHoveredMuscleInGroup ?? (highlightedMusclePicked ? highlightedMuscle : null);
  const avatarMuscleFocusActive =
    !!focusMuscle && selectedBodyPartGroup.muscles.includes(focusMuscle);
  const avatarGlowMode = avatarMuscleFocusActive ? "pieces" : "whole";
  const avatarGlowFocus =
    avatarMuscleFocusActive && focusMuscle
      ? (avatarFocusRegionByMuscle[focusMuscle] ?? null)
      : null;
  // Posterior muscles that sit inside a front-facing group: highlighting one
  // turns the figure around, otherwise its glow is on the hidden side and the
  // highlight looks broken. The Back group already turns via selectedBodyPart.
  // Any posterior muscle turns the figure around — otherwise its glow is on
  // the side facing away and scrolling to it looks like nothing happened.
  const posteriorMuscles = new Set<BodyCommandMuscleSlug>([
    "calves",
    "external-rotation",
    "gluteal",
    "hamstring",
    "hip-rotators",
    "lats",
    "lower-back",
    "neck-extensors",
    "rhomboids",
    "rear-delt",
    "trapezius",
    "triceps",
  ]);
  const avatarViewOverride =
    avatarMuscleFocusActive && focusMuscle && posteriorMuscles.has(focusMuscle)
      ? ("back" as const)
      : selectedBodyPartGroup.side;
  // An exact muscle selection takes priority over a broad category preview.
  // Closing its details must not replace it with the whole group when focus
  // returns to a category control. Choosing a new group clears the selection.
  const hoveredBodyPart = avatarMuscleFocusActive
    ? null
    : avatarHoveredBodyPart ?? menuHoveredGroup;
  const hoveredBodyPartGroup = hoveredBodyPart
    ? bodyPartGroups.find((entry) => entry.id === hoveredBodyPart)
    : null;
  const effectiveAvatarSelectedBodyPart =
    hoveredBodyPart ?? (selectedGroupId as SoundFitnessAvatarBodyPart);
  const effectiveAvatarGlowMode = hoveredBodyPart ? "whole" : avatarGlowMode;
  const effectiveAvatarGlowFocus = hoveredBodyPart ? null : avatarGlowFocus;
  const effectiveAvatarViewOverride =
    hoveredBodyPartGroup?.side ?? avatarViewOverride;
  const avatarZoneGlowColors = {
    arms: groupStatusRing("arms"),
    back: groupStatusRing("back"),
    chest: groupStatusRing("chest"),
    shoulders: groupStatusRing("shoulders"),
    // Per-muscle leg regions carry their own seven-day status colour.
    quads: muscleStatusRing("quadriceps"),
    hamstrings: muscleStatusRing("hamstring"),
    glutes: muscleStatusRing("gluteal"),
    calves: muscleStatusRing("calves"),
    adductors: muscleStatusRing("adductors"),
    abductors: muscleStatusRing("abductors"),
    hipRotators: muscleStatusRing("hip-rotators"),
    neck: groupStatusRing("neck"),
    tibialis: muscleStatusRing("tibialis"),
    biceps: muscleStatusRing("biceps"),
    triceps: muscleStatusRing("triceps"),
    forearms: muscleStatusRing("forearm"),
    // Core splits: the rectus column carries abs, the flanks carry obliques.
    core: muscleStatusRing("abs"),
    obliques: muscleStatusRing("obliques"),
    frontDelt: muscleStatusRing("front-delt"),
    lateralDelt: muscleStatusRing("lateral-delt"),
    rearDelt: muscleStatusRing("rear-delt"),
    rotatorExternal: muscleStatusRing("external-rotation"),
    rotatorInternal: muscleStatusRing("internal-rotation"),
    legs: groupStatusRing("legs"),
    lowerBack: muscleStatusRing("lower-back"),
    lowerChest: muscleStatusRing("lower-chest"),
    midChest: muscleStatusRing("mid-chest"),
    traps: muscleStatusRing("trapezius"),
    lats: muscleStatusRing("lats"),
    rhomboids: muscleStatusRing("rhomboids"),
    upperChest: muscleStatusRing("upper-chest"),
  };
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

        // V2 first; a V1 record (the flat avatar's schema) still hydrates —
        // every field is validated against the option tables, so presets
        // that no longer exist fall back to the default.
        const rawAvatarState =
          window.localStorage.getItem(avatarLabStorageKey) ??
          window.localStorage.getItem(avatarLabLegacyStorageKey);
        if (!rawAvatarState) {
          setAvatarStorageReady(true);
          return;
        }

        const stored = JSON.parse(rawAvatarState) as {
          appearance?: Partial<SoundFitnessAvatarAppearance>;
          emotePreset?: SoundFitnessAvatarEmotePreset;
          sceneId?: AvatarScenePreset;
        };
        setAvatarAppearance(
          sanitizeSoundFitnessAvatarAppearance(stored.appearance),
        );
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
      className={`${layoutStyles.card} dashboard-hero-card dashboard-hero-card--body-command relative z-10 flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden overscroll-contain rounded-[30px] border border-cyan-100/22 bg-[radial-gradient(circle_at_50%_-8%,rgba(34,211,238,0.24),transparent_34%),radial-gradient(circle_at_9%_32%,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_90%_22%,rgba(251,191,36,0.13),transparent_27%),linear-gradient(135deg,rgba(8,13,26,0.98),rgba(2,6,23,0.94))] p-3 shadow-[0_30px_82px_rgba(0,0,0,0.54),0_0_54px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.12)]`}
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

      <div className={`${layoutStyles.commandHeader} relative z-10 flex flex-wrap items-start justify-between gap-3`}>
        {commandCenterSlot ? (
          <div className={`${layoutStyles.commandSummarySlot} min-w-[min(100%,18rem)] flex-1`}>{commandCenterSlot}</div>
        ) : null}
      </div>

      <div className={`${layoutStyles.contentGrid} relative z-10 mt-3 grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-2 min-[700px]:grid-cols-[minmax(220px,1fr)_minmax(320px,0.9fr)] min-[700px]:grid-rows-[minmax(0,1fr)_auto] min-[1000px]:gap-3`}>
        {/* Two columns: the avatar, then the category picker stacked directly
            above the muscle rings it filters — the picker decides which muscles
            appear below it, so it reads top-down. On wide cards, Support
            Signals stays under those controls while the avatar spans both rows. */}
        <div className={`${layoutStyles.bodyStageGrid} grid h-full min-h-0 grid-cols-[minmax(0,1fr)_112px] gap-2 min-[520px]:grid-cols-[minmax(0,1fr)_180px] min-[700px]:contents`}>
          <div className={`${layoutStyles.avatarStage} relative grid min-h-0 grid-rows-[minmax(0,1fr)_auto] content-stretch gap-1 min-[700px]:row-span-2`}>
            <AvatarBodyPicker
              appearance={avatarAppearance}
              avatarSceneId={avatarSceneId}
              emotePreset={avatarEmotePreset}
              onAvatarSceneChange={setAvatarSceneId}
              onEmoteChange={setAvatarEmotePreset}
              onHoverBodyPartChange={setAvatarHoveredBodyPart}
              onOpenAvatarLab={() => setAvatarLabOpen(true)}
              onSelectGroup={selectGroupFromUser}
              selectedGroupId={effectiveAvatarSelectedBodyPart}
              glowFocus={effectiveAvatarGlowFocus}
              glowMode={effectiveAvatarGlowMode}
              viewOverride={effectiveAvatarViewOverride}
              zoneGlowActive={
                avatarSelectionPulse ||
                avatarMuscleFocusActive ||
                !!hoveredBodyPart ||
                !!menuHoveredMuscleInGroup
              }
              zoneGlowColors={avatarZoneGlowColors}
            />
            <AvatarDetailLegend />
          </div>

          <div className={`${layoutStyles.controlsHost} min-[700px]:min-w-[320px]`}>
          <div className={layoutStyles.controlsLayout}>
            <TrainingCategorySelector
              compact
              onHoverGroup={(id) =>
                setMenuHoveredGroup(id as SoundFitnessAvatarBodyPart | null)
              }
              onSelectGroup={selectGroupFromUser}
              selectedGroupId={selectedGroupId}
            />
            <div className={layoutStyles.compactMuscles}>
              <MuscleGroupPanel
                compact
                key={selectedGroupId}
                onHighlightMuscle={handleHighlightMuscle}
                onHoverMuscle={setMenuHoveredMuscle}
                selectedGroupId={selectedGroupId}
                showTitle={false}
              />
            </div>
            <div className={layoutStyles.expandedMuscles}>
              <MuscleGroupPanel
                key={selectedGroupId}
                onHighlightMuscle={handleHighlightMuscle}
                onHoverMuscle={setMenuHoveredMuscle}
                selectedGroupId={selectedGroupId}
              />
            </div>
          </div>
          </div>
        </div>

        <div className={`${layoutStyles.supportSignalsHost} min-w-0 shrink-0 border-t border-cyan-100/10 pt-2 min-[700px]:col-start-2 min-[700px]:row-start-2`}>
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

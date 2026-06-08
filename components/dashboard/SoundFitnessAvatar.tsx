"use client";

import { useId, type CSSProperties } from "react";

export type SoundFitnessAvatarExercisePreset =
  | "idle"
  | "squat"
  | "hinge"
  | "press"
  | "row"
  | "core";

export type SoundFitnessAvatarEmotePreset =
  | "calm"
  | "wave"
  | "nod"
  | "celebrate"
  | "focus";

export type SoundFitnessAvatarMuscleZone =
  | "chest"
  | "shoulders"
  | "upperBack"
  | "lats"
  | "arms"
  | "core"
  | "obliques"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "calves";

type MuscleZoneShape = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotate?: number;
};

type MuscleZoneDefinition = {
  color: string;
  label: string;
  labelPosition: {
    x: number;
    y: number;
  };
  shapes: MuscleZoneShape[];
};

export type SoundFitnessAvatarProps = {
  activeZones?: SoundFitnessAvatarMuscleZone[];
  animationPreset?: SoundFitnessAvatarExercisePreset;
  className?: string;
  emotePreset?: SoundFitnessAvatarEmotePreset;
  exerciseLabel?: string;
  showAnatomyHighlights?: boolean;
  showSkeletonOverlay?: boolean;
  showZoneLabels?: boolean;
};

const defaultAvatarZonesByPreset: Record<
  SoundFitnessAvatarExercisePreset,
  SoundFitnessAvatarMuscleZone[]
> = {
  core: ["core", "obliques", "shoulders"],
  hinge: ["hamstrings", "glutes", "core", "upperBack"],
  idle: ["core", "shoulders"],
  press: ["shoulders", "chest", "arms", "core"],
  row: ["upperBack", "lats", "arms", "core"],
  squat: ["quads", "glutes", "core", "calves"],
};

const avatarEmoteLabels: Record<SoundFitnessAvatarEmotePreset, string> = {
  calm: "Calm scan",
  celebrate: "Celebrate",
  focus: "Focused",
  nod: "Nod",
  wave: "Wave",
};

const legacyExerciseToEmote: Record<
  SoundFitnessAvatarExercisePreset,
  SoundFitnessAvatarEmotePreset
> = {
  core: "focus",
  hinge: "calm",
  idle: "calm",
  press: "wave",
  row: "nod",
  squat: "focus",
};

const muscleZoneDefinitions: Record<
  SoundFitnessAvatarMuscleZone,
  MuscleZoneDefinition
> = {
  arms: {
    color: "rgb(125,211,252)",
    label: "Arms",
    labelPosition: { x: 120, y: 176 },
    shapes: [
      { cx: 74, cy: 151, rx: 10, ry: 34, rotate: -14 },
      { cx: 166, cy: 151, rx: 10, ry: 34, rotate: 14 },
    ],
  },
  calves: {
    color: "rgb(34,211,238)",
    label: "Calves",
    labelPosition: { x: 120, y: 293 },
    shapes: [
      { cx: 100, cy: 277, rx: 8, ry: 28, rotate: 5 },
      { cx: 140, cy: 277, rx: 8, ry: 28, rotate: -5 },
    ],
  },
  chest: {
    color: "rgb(56,189,248)",
    label: "Chest",
    labelPosition: { x: 120, y: 126 },
    shapes: [
      { cx: 108, cy: 125, rx: 17, ry: 18, rotate: -8 },
      { cx: 132, cy: 125, rx: 17, ry: 18, rotate: 8 },
    ],
  },
  core: {
    color: "rgb(251,191,36)",
    label: "Core",
    labelPosition: { x: 120, y: 159 },
    shapes: [{ cx: 120, cy: 160, rx: 23, ry: 31 }],
  },
  glutes: {
    color: "rgb(52,211,153)",
    label: "Glutes",
    labelPosition: { x: 120, y: 208 },
    shapes: [
      { cx: 108, cy: 201, rx: 15, ry: 14, rotate: -8 },
      { cx: 132, cy: 201, rx: 15, ry: 14, rotate: 8 },
    ],
  },
  hamstrings: {
    color: "rgb(45,212,191)",
    label: "Hamstrings",
    labelPosition: { x: 120, y: 253 },
    shapes: [
      { cx: 105, cy: 246, rx: 10, ry: 35, rotate: 4 },
      { cx: 135, cy: 246, rx: 10, ry: 35, rotate: -4 },
    ],
  },
  lats: {
    color: "rgb(14,165,233)",
    label: "Lats",
    labelPosition: { x: 120, y: 145 },
    shapes: [
      { cx: 98, cy: 141, rx: 13, ry: 34, rotate: -13 },
      { cx: 142, cy: 141, rx: 13, ry: 34, rotate: 13 },
    ],
  },
  obliques: {
    color: "rgb(244,114,182)",
    label: "Obliques",
    labelPosition: { x: 120, y: 174 },
    shapes: [
      { cx: 101, cy: 163, rx: 9, ry: 28, rotate: -16 },
      { cx: 139, cy: 163, rx: 9, ry: 28, rotate: 16 },
    ],
  },
  quads: {
    color: "rgb(250,204,21)",
    label: "Quads",
    labelPosition: { x: 120, y: 237 },
    shapes: [
      { cx: 104, cy: 238, rx: 13, ry: 39, rotate: -3 },
      { cx: 136, cy: 238, rx: 13, ry: 39, rotate: 3 },
    ],
  },
  shoulders: {
    color: "rgb(103,232,249)",
    label: "Shoulders",
    labelPosition: { x: 120, y: 106 },
    shapes: [
      { cx: 89, cy: 109, rx: 14, ry: 15 },
      { cx: 151, cy: 109, rx: 14, ry: 15 },
    ],
  },
  upperBack: {
    color: "rgb(96,165,250)",
    label: "Upper back",
    labelPosition: { x: 120, y: 124 },
    shapes: [
      { cx: 108, cy: 122, rx: 16, ry: 28, rotate: 10 },
      { cx: 132, cy: 122, rx: 16, ry: 28, rotate: -10 },
    ],
  },
};

const getUniqueAvatarZones = (
  zones: SoundFitnessAvatarMuscleZone[],
): SoundFitnessAvatarMuscleZone[] =>
  zones.filter((zone, index) => zones.indexOf(zone) === index);

export default function SoundFitnessAvatar({
  activeZones,
  animationPreset = "idle",
  className = "",
  emotePreset,
  exerciseLabel,
  showAnatomyHighlights = true,
  showSkeletonOverlay = false,
  showZoneLabels = true,
}: SoundFitnessAvatarProps) {
  const avatarId = useId().replace(/:/g, "");
  const selectedEmote = emotePreset || legacyExerciseToEmote[animationPreset];
  const selectedZones = getUniqueAvatarZones(
    activeZones?.length
      ? activeZones
      : defaultAvatarZonesByPreset[animationPreset],
  );
  const presetLabel = exerciseLabel || avatarEmoteLabels[selectedEmote];

  return (
    <div
      aria-label={`Sound Fitness character avatar: ${presetLabel}`}
      className={`sound-fitness-avatar relative isolate overflow-hidden rounded-[26px] border border-cyan-100/14 bg-[radial-gradient(circle_at_42%_2%,rgba(255,255,255,0.12),transparent_17%),radial-gradient(circle_at_50%_4%,rgba(34,211,238,0.2),transparent_34%),radial-gradient(circle_at_72%_72%,rgba(251,191,36,0.1),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.36),rgba(2,6,23,0.64))] shadow-[0_20px_44px_rgba(0,0,0,0.25),0_0_34px_rgba(34,211,238,0.12),inset_0_1px_0_rgba(255,255,255,0.08)] [perspective:920px] ${className}`}
      data-anatomy-highlights={showAnatomyHighlights ? "enabled" : "disabled"}
      data-avatar-emote={selectedEmote}
      data-skeleton-overlay={showSkeletonOverlay ? "enabled" : "disabled"}
    >
      <style>{`
        .sound-fitness-avatar,
        .sound-fitness-avatar * {
          transform-box: fill-box;
        }

        .sound-fitness-avatar svg {
          shape-rendering: geometricPrecision;
          text-rendering: geometricPrecision;
          transform: rotateX(5deg) rotateY(-7deg);
          transform-origin: center;
        }

        .sound-fitness-avatar__character {
          animation: sound-fitness-avatar-breathe 4.8s ease-in-out infinite;
          transform-origin: 50% 74%;
        }

        .sound-fitness-avatar__head {
          animation: sound-fitness-avatar-head-idle 4.8s ease-in-out infinite;
          transform-origin: 50% 86%;
        }

        .sound-fitness-avatar__expression {
          animation: sound-fitness-avatar-expression 5.2s ease-in-out infinite;
          transform-origin: center;
        }

        .sound-fitness-avatar__armor-shine {
          animation: sound-fitness-avatar-armor-shine 4.2s ease-in-out infinite;
          opacity: 0.52;
        }

        .sound-fitness-avatar__rim-light {
          animation: sound-fitness-avatar-rim-pulse 3.8s ease-in-out infinite;
        }

        .sound-fitness-avatar__stage-orbit {
          animation: sound-fitness-avatar-stage-orbit 5.4s ease-in-out infinite;
          transform-origin: center;
        }

        .sound-fitness-avatar__left-arm,
        .sound-fitness-avatar__right-arm {
          transform-origin: 50% 18%;
        }

        .sound-fitness-avatar[data-avatar-emote="wave"] .sound-fitness-avatar__right-arm {
          animation: sound-fitness-avatar-wave 2.8s ease-in-out infinite;
        }

        .sound-fitness-avatar[data-avatar-emote="nod"] .sound-fitness-avatar__head {
          animation: sound-fitness-avatar-nod 2.8s ease-in-out infinite;
        }

        .sound-fitness-avatar[data-avatar-emote="celebrate"] .sound-fitness-avatar__left-arm {
          animation: sound-fitness-avatar-celebrate-left 3.4s ease-in-out infinite;
        }

        .sound-fitness-avatar[data-avatar-emote="celebrate"] .sound-fitness-avatar__right-arm {
          animation: sound-fitness-avatar-celebrate-right 3.4s ease-in-out infinite;
        }

        .sound-fitness-avatar[data-avatar-emote="focus"] .sound-fitness-avatar__visor {
          animation: sound-fitness-avatar-visor-focus 2.6s ease-in-out infinite;
        }

        .sound-fitness-avatar__zone-shell,
        .sound-fitness-avatar__zone-core,
        .sound-fitness-avatar__zone-edge {
          animation: sound-fitness-avatar-zone-pulse 2.6s ease-in-out infinite;
          transform-origin: center;
        }

        .sound-fitness-avatar__zone-shell {
          opacity: 0.2;
        }

        .sound-fitness-avatar__zone-core {
          mix-blend-mode: screen;
          opacity: 0.62;
        }

        .sound-fitness-avatar__zone-edge {
          opacity: 0.82;
          vector-effect: non-scaling-stroke;
        }

        .sound-fitness-avatar__zone-label {
          animation: sound-fitness-avatar-zone-label-pulse 2.6s ease-in-out infinite;
          opacity: 0;
          pointer-events: none;
          transform-origin: center;
        }

        .sound-fitness-avatar__zone-label text {
          paint-order: stroke;
          vector-effect: non-scaling-stroke;
        }

        .sound-fitness-avatar__anatomy-line {
          animation: sound-fitness-avatar-anatomy-scan 3.4s ease-in-out infinite;
          opacity: 0.62;
          vector-effect: non-scaling-stroke;
        }

        .sound-fitness-avatar[data-anatomy-highlights="disabled"] .sound-fitness-avatar__anatomy {
          opacity: 0;
        }

        .sound-fitness-avatar__energy-ring {
          animation: sound-fitness-avatar-ring-scan 3.8s ease-in-out infinite;
        }

        .sound-fitness-avatar__skeleton {
          opacity: 0;
          transition: opacity 180ms ease;
        }

        .sound-fitness-avatar[data-skeleton-overlay="enabled"] .sound-fitness-avatar__skeleton {
          opacity: 0.72;
        }

        @keyframes sound-fitness-avatar-breathe {
          0%, 100% { transform: translateY(0) scaleY(1); }
          50% { transform: translateY(-0.22rem) scaleY(1.012); }
        }

        @keyframes sound-fitness-avatar-head-idle {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-0.12rem) rotate(-1deg); }
        }

        @keyframes sound-fitness-avatar-expression {
          0%, 100% { opacity: 0.92; transform: translateY(0); }
          45% { opacity: 1; transform: translateY(0.04rem); }
        }

        @keyframes sound-fitness-avatar-armor-shine {
          0%, 100% { opacity: 0.34; transform: translateX(-0.12rem); }
          48% { opacity: 0.82; transform: translateX(0.18rem); }
        }

        @keyframes sound-fitness-avatar-rim-pulse {
          0%, 100% { opacity: 0.54; }
          48% { opacity: 0.95; }
        }

        @keyframes sound-fitness-avatar-stage-orbit {
          0%, 100% { opacity: 0.26; transform: scaleX(0.88) translateY(0); }
          48% { opacity: 0.68; transform: scaleX(1.08) translateY(-0.08rem); }
        }

        @keyframes sound-fitness-avatar-wave {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          22% { transform: rotate(-14deg) translateY(-0.16rem); }
          46% { transform: rotate(12deg) translateY(-0.2rem); }
          68% { transform: rotate(-10deg) translateY(-0.14rem); }
        }

        @keyframes sound-fitness-avatar-nod {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          30% { transform: rotate(4deg) translateY(0.18rem); }
          58% { transform: rotate(-2deg) translateY(-0.05rem); }
        }

        @keyframes sound-fitness-avatar-celebrate-left {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          45%, 62% { transform: rotate(-18deg) translateY(-0.46rem); }
        }

        @keyframes sound-fitness-avatar-celebrate-right {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          45%, 62% { transform: rotate(18deg) translateY(-0.46rem); }
        }

        @keyframes sound-fitness-avatar-visor-focus {
          0%, 100% { opacity: 0.62; }
          45% { opacity: 1; }
        }

        @keyframes sound-fitness-avatar-zone-pulse {
          0%, 100% { filter: brightness(1); transform: scale(0.99); }
          45% { filter: brightness(1.3) saturate(1.16); transform: scale(1.035); }
        }

        @keyframes sound-fitness-avatar-zone-label-pulse {
          0%, 27%, 100% { opacity: 0; transform: translateY(3px) scale(0.96); }
          40%, 58% { opacity: 0.98; transform: translateY(0) scale(1); }
        }

        @keyframes sound-fitness-avatar-anatomy-scan {
          0%, 100% { stroke-dashoffset: 0; opacity: 0.36; }
          48% { stroke-dashoffset: -14; opacity: 0.8; }
        }

        @keyframes sound-fitness-avatar-ring-scan {
          0%, 100% { opacity: 0.24; transform: scaleX(0.92); }
          48% { opacity: 0.64; transform: scaleX(1.06); }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(125,211,252,0.06)_1px,transparent_1px),linear-gradient(180deg,rgba(125,211,252,0.05)_1px,transparent_1px)] bg-[length:34px_34px] opacity-40" />
      <div className="absolute left-3 top-3 z-20 rounded-full border border-cyan-100/18 bg-slate-950/54 px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.14em] text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.12)]">
        {presetLabel}
      </div>

      <svg
        aria-hidden="true"
        className="relative z-10 h-full min-h-0 w-full"
        preserveAspectRatio="xMidYMid meet"
        viewBox="0 0 240 330"
      >
        <defs>
          <linearGradient id={`${avatarId}-skin`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(253,224,197,0.98)" />
            <stop offset="46%" stopColor="rgba(214,155,116,0.94)" />
            <stop offset="100%" stopColor="rgba(126,79,67,0.92)" />
          </linearGradient>
          <linearGradient id={`${avatarId}-suit`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(236,254,255,0.9)" />
            <stop offset="26%" stopColor="rgba(34,211,238,0.56)" />
            <stop offset="66%" stopColor="rgba(14,165,233,0.38)" />
            <stop offset="100%" stopColor="rgba(15,23,42,0.92)" />
          </linearGradient>
          <linearGradient id={`${avatarId}-suit-shadow`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(15,23,42,0.78)" />
            <stop offset="52%" stopColor="rgba(8,47,73,0.8)" />
            <stop offset="100%" stopColor="rgba(2,6,23,0.96)" />
          </linearGradient>
          <linearGradient id={`${avatarId}-gold`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(253,230,138,0.98)" />
            <stop offset="100%" stopColor="rgba(245,158,11,0.62)" />
          </linearGradient>
          <linearGradient id={`${avatarId}-boot`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(71,85,105,0.94)" />
            <stop offset="42%" stopColor="rgba(15,23,42,0.96)" />
            <stop offset="100%" stopColor="rgba(2,6,23,0.98)" />
          </linearGradient>
          <linearGradient id={`${avatarId}-armor-side`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(14,165,233,0.72)" />
            <stop offset="52%" stopColor="rgba(8,47,73,0.86)" />
            <stop offset="100%" stopColor="rgba(2,6,23,0.96)" />
          </linearGradient>
          <linearGradient id={`${avatarId}-armor-rim`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(236,254,255,0.16)" />
            <stop offset="46%" stopColor="rgba(103,232,249,0.88)" />
            <stop offset="100%" stopColor="rgba(251,191,36,0.44)" />
          </linearGradient>
          <radialGradient id={`${avatarId}-skin-lit`} cx="36%" cy="22%" r="78%">
            <stop offset="0%" stopColor="rgba(255,247,237,0.98)" />
            <stop offset="38%" stopColor="rgba(253,224,197,0.96)" />
            <stop offset="100%" stopColor="rgba(126,79,67,0.88)" />
          </radialGradient>
          <radialGradient id={`${avatarId}-chest-core`} cx="45%" cy="25%" r="72%">
            <stop offset="0%" stopColor="rgba(236,254,255,0.86)" />
            <stop offset="38%" stopColor="rgba(34,211,238,0.46)" />
            <stop offset="100%" stopColor="rgba(8,47,73,0.9)" />
          </radialGradient>
          <radialGradient id={`${avatarId}-hair-gloss`} cx="38%" cy="20%" r="88%">
            <stop offset="0%" stopColor="rgba(56,189,248,0.3)" />
            <stop offset="34%" stopColor="rgba(30,41,59,0.98)" />
            <stop offset="100%" stopColor="rgba(2,6,23,0.98)" />
          </radialGradient>
          <linearGradient id={`${avatarId}-visor-glass`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(236,254,255,0.24)" />
            <stop offset="46%" stopColor="rgba(34,211,238,0.84)" />
            <stop offset="100%" stopColor="rgba(251,191,36,0.38)" />
          </linearGradient>
          <filter id={`${avatarId}-cast-shadow`} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="8" floodColor="rgba(0,0,0,0.72)" floodOpacity="1" stdDeviation="5" />
          </filter>
          <filter id={`${avatarId}-soft-glow`} x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feColorMatrix
              in="blur"
              result="glow"
              type="matrix"
              values="0 0 0 0 0.15 0 0 0 0 0.78 0 0 0 0 0.9 0 0 0 0.72 0"
            />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`${avatarId}-zone-glow`} x="-65%" y="-65%" width="230%" height="230%">
            <feGaussianBlur stdDeviation="2.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ellipse
          className="sound-fitness-avatar__energy-ring"
          cx="120"
          cy="306"
          fill="none"
          rx="72"
          ry="15"
          stroke="rgba(103,232,249,0.36)"
          strokeWidth="2"
        />
        <ellipse
          className="sound-fitness-avatar__stage-orbit"
          cx="120"
          cy="297"
          fill="none"
          rx="83"
          ry="26"
          stroke="rgba(253,230,138,0.34)"
          strokeDasharray="8 10"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
        <ellipse
          cx="120"
          cy="309"
          fill="rgba(2,6,23,0.52)"
          filter={`url(#${avatarId}-cast-shadow)`}
          rx="55"
          ry="10"
        />

        <g className="sound-fitness-avatar__character" filter={`url(#${avatarId}-soft-glow)`}>
          <path
            d="M78 101 C94 83 146 83 162 101 C174 125 172 164 157 201 C139 214 101 214 83 201 C68 164 66 125 78 101Z"
            fill={`url(#${avatarId}-armor-side)`}
            opacity="0.62"
          />
          <path
            d="M72 113 C82 97 101 91 113 99 C105 113 96 126 82 134 C75 128 72 121 72 113Z"
            fill={`url(#${avatarId}-armor-side)`}
            stroke="rgba(103,232,249,0.42)"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
          <path
            d="M168 113 C158 97 139 91 127 99 C135 113 144 126 158 134 C165 128 168 121 168 113Z"
            fill={`url(#${avatarId}-armor-side)`}
            stroke="rgba(103,232,249,0.42)"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
          <path
            className="sound-fitness-avatar__rim-light"
            d="M75 112 C85 101 99 97 111 100 M165 112 C155 101 141 97 129 100 M94 95 C106 89 134 89 146 95"
            fill="none"
            stroke={`url(#${avatarId}-armor-rim)`}
            strokeLinecap="round"
            strokeWidth="2"
          />
          <g className="sound-fitness-avatar__legs">
            <path
              d="M101 190 C96 218 94 249 91 295"
              fill="none"
              stroke={`url(#${avatarId}-suit-shadow)`}
              strokeLinecap="round"
              strokeWidth="19"
            />
            <path
              d="M139 190 C144 218 146 249 149 295"
              fill="none"
              stroke={`url(#${avatarId}-suit-shadow)`}
              strokeLinecap="round"
              strokeWidth="19"
            />
            <path
              d="M98 197 C101 225 101 254 96 288"
              fill="none"
              stroke="rgba(34,211,238,0.44)"
              strokeLinecap="round"
              strokeWidth="5"
            />
            <path
              d="M142 197 C139 225 139 254 144 288"
              fill="none"
              stroke="rgba(34,211,238,0.44)"
              strokeLinecap="round"
              strokeWidth="5"
            />
            <path
              d="M86 201 C92 194 103 194 111 201 C110 214 106 224 99 232 C91 224 87 213 86 201Z"
              fill={`url(#${avatarId}-armor-side)`}
              opacity="0.82"
              stroke="rgba(207,250,254,0.2)"
              strokeLinejoin="round"
              strokeWidth="1"
            />
            <path
              d="M154 201 C148 194 137 194 129 201 C130 214 134 224 141 232 C149 224 153 213 154 201Z"
              fill={`url(#${avatarId}-armor-side)`}
              opacity="0.82"
              stroke="rgba(207,250,254,0.2)"
              strokeLinejoin="round"
              strokeWidth="1"
            />
            <ellipse
              cx="98"
              cy="235"
              fill={`url(#${avatarId}-armor-side)`}
              rx="12"
              ry="10"
              stroke="rgba(103,232,249,0.3)"
              strokeWidth="1"
              transform="rotate(-6 98 235)"
            />
            <ellipse
              cx="142"
              cy="235"
              fill={`url(#${avatarId}-armor-side)`}
              rx="12"
              ry="10"
              stroke="rgba(103,232,249,0.3)"
              strokeWidth="1"
              transform="rotate(6 142 235)"
            />
            <path
              d="M93 237 C97 240 103 240 107 237"
              fill="none"
              stroke={`url(#${avatarId}-gold)`}
              strokeLinecap="round"
              strokeWidth="2"
            />
            <path
              d="M133 237 C137 240 143 240 147 237"
              fill="none"
              stroke={`url(#${avatarId}-gold)`}
              strokeLinecap="round"
              strokeWidth="2"
            />
            <path
              d="M89 257 C96 253 106 254 111 260 C108 275 105 286 99 296 C91 286 88 272 89 257Z"
              fill={`url(#${avatarId}-boot)`}
              opacity="0.88"
              stroke="rgba(34,211,238,0.22)"
              strokeLinejoin="round"
              strokeWidth="1"
            />
            <path
              d="M151 257 C144 253 134 254 129 260 C132 275 135 286 141 296 C149 286 152 272 151 257Z"
              fill={`url(#${avatarId}-boot)`}
              opacity="0.88"
              stroke="rgba(34,211,238,0.22)"
              strokeLinejoin="round"
              strokeWidth="1"
            />
            <path
              d="M78 297 C86 291 101 291 107 299"
              fill="none"
              stroke={`url(#${avatarId}-gold)`}
              strokeLinecap="round"
              strokeWidth="8"
            />
            <path
              d="M132 299 C138 291 153 291 162 297"
              fill="none"
              stroke={`url(#${avatarId}-gold)`}
              strokeLinecap="round"
              strokeWidth="8"
            />
            <path
              d="M81 294 C91 289 104 292 110 301 C99 306 83 306 76 300Z"
              fill={`url(#${avatarId}-boot)`}
              stroke="rgba(253,230,138,0.28)"
              strokeLinejoin="round"
              strokeWidth="1.2"
            />
            <path
              d="M130 301 C136 292 149 289 159 294 L164 300 C157 306 141 306 130 301Z"
              fill={`url(#${avatarId}-boot)`}
              stroke="rgba(253,230,138,0.28)"
              strokeLinejoin="round"
              strokeWidth="1.2"
            />
          </g>

          <path
            d="M96 95 C106 88 134 88 144 95 C158 123 158 166 146 195 C133 203 107 203 94 195 C82 166 82 123 96 95Z"
            fill={`url(#${avatarId}-suit)`}
            stroke="rgba(207,250,254,0.68)"
            strokeLinejoin="round"
            strokeWidth="2.4"
          />
          <path
            d="M100 101 C110 92 130 92 140 101 C149 124 149 161 138 186 C130 191 110 191 102 186 C91 161 91 124 100 101Z"
            fill={`url(#${avatarId}-chest-core)`}
            opacity="0.78"
            stroke="rgba(34,211,238,0.46)"
            strokeLinejoin="round"
            strokeWidth="1.4"
          />
          <path
            d="M94 109 C83 126 82 167 96 194 C104 184 108 118 111 98 C105 99 99 103 94 109Z"
            fill="rgba(2,6,23,0.44)"
            opacity="0.9"
          />
          <path
            d="M146 109 C157 126 158 167 144 194 C136 184 132 118 129 98 C135 99 141 103 146 109Z"
            fill="rgba(255,255,255,0.08)"
            opacity="0.9"
          />
          <path
            className="sound-fitness-avatar__armor-shine"
            d="M104 103 C113 111 127 111 136 103 M103 139 C113 148 127 148 137 139 M109 171 C116 177 124 177 131 171"
            fill="none"
            stroke={`url(#${avatarId}-armor-rim)`}
            strokeLinecap="round"
            strokeWidth="2.2"
          />
          <path
            d="M120 100 C112 125 110 168 120 195 C130 168 128 125 120 100Z"
            fill="rgba(2,6,23,0.42)"
            stroke="rgba(251,191,36,0.52)"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
          <circle cx="120" cy="154" fill={`url(#${avatarId}-gold)`} r="4.5" />
          <circle cx="120" cy="154" fill="rgba(255,255,255,0.72)" r="1.2" />

          <g className="sound-fitness-avatar__left-arm">
            <path
              d="M97 105 C76 124 68 154 75 190"
              fill="none"
              stroke={`url(#${avatarId}-suit-shadow)`}
              strokeLinecap="round"
              strokeWidth="15"
            />
            <path
              d="M75 190 C76 199 84 204 90 198"
              fill="none"
              stroke={`url(#${avatarId}-skin)`}
              strokeLinecap="round"
              strokeWidth="9"
            />
            <path
              d="M88 112 C79 130 74 151 76 175"
              fill="none"
              stroke="rgba(34,211,238,0.42)"
              strokeLinecap="round"
              strokeWidth="3.6"
            />
            <ellipse
              cx="83"
              cy="152"
              fill={`url(#${avatarId}-armor-side)`}
              rx="10"
              ry="13"
              stroke="rgba(236,254,255,0.18)"
              strokeWidth="1"
              transform="rotate(-14 83 152)"
            />
            <path
              d="M71 185 C79 181 89 184 93 193 C88 204 74 202 70 191Z"
              fill={`url(#${avatarId}-gold)`}
              opacity="0.88"
              stroke="rgba(253,230,138,0.42)"
              strokeLinejoin="round"
              strokeWidth="1.2"
            />
          </g>

          <g className="sound-fitness-avatar__right-arm">
            <path
              d="M143 105 C164 124 172 154 165 190"
              fill="none"
              stroke={`url(#${avatarId}-suit-shadow)`}
              strokeLinecap="round"
              strokeWidth="15"
            />
            <path
              d="M165 190 C164 199 156 204 150 198"
              fill="none"
              stroke={`url(#${avatarId}-skin)`}
              strokeLinecap="round"
              strokeWidth="9"
            />
            <path
              d="M152 112 C161 130 166 151 164 175"
              fill="none"
              stroke="rgba(34,211,238,0.42)"
              strokeLinecap="round"
              strokeWidth="3.6"
            />
            <ellipse
              cx="157"
              cy="152"
              fill={`url(#${avatarId}-armor-side)`}
              rx="10"
              ry="13"
              stroke="rgba(236,254,255,0.18)"
              strokeWidth="1"
              transform="rotate(14 157 152)"
            />
            <path
              d="M169 185 C161 181 151 184 147 193 C152 204 166 202 170 191Z"
              fill={`url(#${avatarId}-gold)`}
              opacity="0.88"
              stroke="rgba(253,230,138,0.42)"
              strokeLinejoin="round"
              strokeWidth="1.2"
            />
          </g>

          {showAnatomyHighlights ? (
            <g
              aria-hidden="true"
              className="sound-fitness-avatar__anatomy"
              pointerEvents="none"
            >
              <path
                className="sound-fitness-avatar__anatomy-line"
                d="M99 111 C109 120 131 120 141 111 M99 134 C109 143 131 143 141 134"
                fill="none"
                stroke="rgba(207,250,254,0.66)"
                strokeDasharray="5 7"
                strokeLinecap="round"
                strokeWidth="1.25"
              />
              <path
                className="sound-fitness-avatar__anatomy-line"
                d="M120 111 V190 M105 150 C113 156 127 156 135 150 M107 171 C115 176 125 176 133 171"
                fill="none"
                stroke="rgba(251,191,36,0.64)"
                strokeDasharray="4 6"
                strokeLinecap="round"
                strokeWidth="1.2"
              />
              <path
                className="sound-fitness-avatar__anatomy-line"
                d="M100 199 C106 222 105 260 97 292 M140 199 C134 222 135 260 143 292"
                fill="none"
                stroke="rgba(34,211,238,0.62)"
                strokeDasharray="5 7"
                strokeLinecap="round"
                strokeWidth="1.2"
              />
            </g>
          ) : null}

          <g className="sound-fitness-avatar__zones">
            {selectedZones.map((zone, zoneIndex) =>
              muscleZoneDefinitions[zone].shapes.map((shape, shapeIndex) => {
                const zoneDefinition = muscleZoneDefinitions[zone];
                const transform = shape.rotate
                  ? `rotate(${shape.rotate} ${shape.cx} ${shape.cy})`
                  : undefined;
                const animationStyle = {
                  animationDelay: `${zoneIndex * 0.08 + shapeIndex * 0.12}s`,
                } as CSSProperties;

                return (
                  <g key={`${zone}-${shapeIndex}`} transform={transform}>
                    <ellipse
                      className="sound-fitness-avatar__zone-shell"
                      cx={shape.cx}
                      cy={shape.cy}
                      fill={zoneDefinition.color}
                      filter={`url(#${avatarId}-zone-glow)`}
                      rx={shape.rx + 7}
                      ry={shape.ry + 7}
                      style={animationStyle}
                    />
                    <ellipse
                      className="sound-fitness-avatar__zone-core"
                      cx={shape.cx}
                      cy={shape.cy}
                      fill={zoneDefinition.color}
                      rx={shape.rx}
                      ry={shape.ry}
                      style={animationStyle}
                    />
                    <ellipse
                      className="sound-fitness-avatar__zone-edge"
                      cx={shape.cx}
                      cy={shape.cy}
                      fill="none"
                      rx={shape.rx + 1.7}
                      ry={shape.ry + 1.7}
                      stroke={zoneDefinition.color}
                      strokeWidth="1.35"
                      style={animationStyle}
                    >
                      <title>{zoneDefinition.label}</title>
                    </ellipse>
                  </g>
                );
              }),
            )}
          </g>

          {showZoneLabels ? (
            <g aria-hidden="true" className="sound-fitness-avatar__zone-labels">
              {selectedZones.map((zone, zoneIndex) => {
                const zoneDefinition = muscleZoneDefinitions[zone];
                const animationStyle = {
                  animationDelay: `${zoneIndex * 0.08 + 0.18}s`,
                } as CSSProperties;

                return (
                  <g
                    className="sound-fitness-avatar__zone-label"
                    key={`label-${zone}`}
                    style={animationStyle}
                    transform={`translate(${zoneDefinition.labelPosition.x} ${zoneDefinition.labelPosition.y})`}
                  >
                    <rect
                      fill="rgba(2,6,23,0.78)"
                      height="15"
                      rx="7.5"
                      stroke={zoneDefinition.color}
                      strokeOpacity="0.55"
                      strokeWidth="0.9"
                      width="62"
                      x="-31"
                      y="-11"
                    />
                    <text
                      dominantBaseline="middle"
                      fill="rgba(248,250,252,0.96)"
                      fontSize="7.3"
                      fontWeight="900"
                      letterSpacing="0.8"
                      stroke="rgba(2,6,23,0.9)"
                      strokeWidth="2"
                      textAnchor="middle"
                      y="-3.1"
                    >
                      {zoneDefinition.label}
                    </text>
                    <circle cx="0" cy="7" fill={zoneDefinition.color} r="1.8" />
                  </g>
                );
              })}
            </g>
          ) : null}

          <g className="sound-fitness-avatar__head">
            <path
              d="M111 87 H130 L134 101 C127 107 114 107 106 101Z"
              fill={`url(#${avatarId}-skin)`}
              stroke="rgba(253,230,138,0.2)"
              strokeLinejoin="round"
              strokeWidth="1"
            />
            <ellipse
              cx="94"
              cy="66"
              fill={`url(#${avatarId}-skin)`}
              rx="5"
              ry="8"
              stroke="rgba(126,79,67,0.2)"
              strokeWidth="1"
            />
            <ellipse
              cx="150"
              cy="66"
              fill={`url(#${avatarId}-skin)`}
              rx="5"
              ry="8"
              stroke="rgba(126,79,67,0.2)"
              strokeWidth="1"
            />
            <path
              d="M93 60 C95 42 107 30 123 30 C139 31 150 43 151 61 C148 79 138 91 121 92 C104 91 95 78 93 60Z"
              fill={`url(#${avatarId}-skin-lit)`}
              stroke="rgba(253,230,138,0.32)"
              strokeWidth="1.8"
            />
            <path
              d="M137 39 C148 47 151 61 145 75 C141 84 133 90 122 91 C137 80 141 59 137 39Z"
              fill="rgba(92,51,44,0.22)"
            />
            <path
              d="M102 63 C104 54 110 47 119 45"
              fill="none"
              stroke="rgba(255,247,237,0.38)"
              strokeLinecap="round"
              strokeWidth="3"
            />
            <path
              d="M96 54 C101 35 114 25 129 29 C144 33 152 46 150 65 C143 54 132 50 119 51 C110 52 102 53 96 54Z"
              fill={`url(#${avatarId}-hair-gloss)`}
            />
            <path
              d="M101 49 C110 31 132 29 145 43 C139 37 129 36 117 39 C109 41 104 44 101 49Z"
              fill="rgba(56,189,248,0.18)"
            />
            <path
              d="M95 58 C101 51 110 48 121 49 C136 50 146 56 151 66"
              fill="none"
              stroke="rgba(34,211,238,0.26)"
              strokeLinecap="round"
              strokeWidth="2"
            />
            <g className="sound-fitness-avatar__expression">
              <path
                d="M104 58 C109 55 114 55 118 58 M126 58 C131 55 136 55 140 58"
                fill="none"
                stroke="rgba(15,23,42,0.78)"
                strokeLinecap="round"
                strokeWidth="2"
              />
              <path
                className="sound-fitness-avatar__visor"
                d="M103 62 C112 58 130 58 140 62"
                fill="none"
                stroke={`url(#${avatarId}-visor-glass)`}
                strokeLinecap="round"
                strokeWidth="2.4"
              />
              <ellipse
                cx="111"
                cy="65"
                fill="rgba(255,247,237,0.92)"
                rx="4.6"
                ry="3.5"
                stroke="rgba(15,23,42,0.32)"
                strokeWidth="0.8"
              />
              <ellipse
                cx="132"
                cy="65"
                fill="rgba(255,247,237,0.88)"
                rx="4.6"
                ry="3.5"
                stroke="rgba(15,23,42,0.32)"
                strokeWidth="0.8"
              />
              <circle cx="112" cy="65.2" fill="rgba(2,6,23,0.94)" r="2" />
              <circle cx="133" cy="65.2" fill="rgba(2,6,23,0.94)" r="2" />
              <circle cx="112.8" cy="64.2" fill="rgba(125,211,252,0.84)" r="0.7" />
              <circle cx="133.8" cy="64.2" fill="rgba(125,211,252,0.84)" r="0.7" />
              <path
                d="M113 76 C119 80 128 80 134 76"
                fill="none"
                stroke="rgba(88,28,14,0.78)"
                strokeLinecap="round"
                strokeWidth="2.2"
              />
              <path
                d="M122 67 C121 71 120 73 117 75"
                fill="none"
                stroke="rgba(126,79,67,0.56)"
                strokeLinecap="round"
                strokeWidth="1.4"
              />
              <path
                d="M108 83 C114 87 127 88 135 82"
                fill="none"
                stroke="rgba(255,247,237,0.2)"
                strokeLinecap="round"
                strokeWidth="1.2"
              />
              <circle cx="105" cy="72" fill="rgba(255,247,237,0.2)" r="4" />
              <circle cx="137" cy="72" fill="rgba(92,51,44,0.12)" r="4.5" />
            </g>
          </g>

          <g
            aria-hidden={!showSkeletonOverlay}
            className="sound-fitness-avatar__skeleton"
          >
            <path
              d="M120 91 V190 M120 112 L78 195 M120 112 L162 195 M120 190 L92 299 M120 190 L148 299"
              fill="none"
              stroke="rgba(236,254,255,0.78)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
            {[120, 78, 162, 92, 148].map((cx, index) => (
              <circle
                cx={cx}
                cy={[91, 195, 195, 299, 299][index]}
                fill="rgba(2,6,23,0.78)"
                key={`${cx}-${index}`}
                r="4"
                stroke="rgba(236,254,255,0.8)"
                strokeWidth="1.5"
              />
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}

"use client";

import { useId } from "react";

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

export default function SoundFitnessAvatar({
  animationPreset = "idle",
  className = "",
  emotePreset,
  exerciseLabel,
}: SoundFitnessAvatarProps) {
  const avatarId = useId().replace(/:/g, "");
  const selectedEmote = emotePreset || legacyExerciseToEmote[animationPreset];
  const presetLabel = exerciseLabel || avatarEmoteLabels[selectedEmote];

  return (
    <div
      aria-label={`Sound Fitness character avatar: ${presetLabel}`}
      className={`sound-fitness-avatar relative isolate overflow-hidden rounded-[26px] border border-cyan-100/14 bg-[radial-gradient(circle_at_42%_2%,rgba(255,255,255,0.12),transparent_17%),radial-gradient(circle_at_50%_4%,rgba(34,211,238,0.2),transparent_34%),radial-gradient(circle_at_72%_72%,rgba(251,191,36,0.1),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.36),rgba(2,6,23,0.64))] shadow-[0_20px_44px_rgba(0,0,0,0.25),0_0_34px_rgba(34,211,238,0.12),inset_0_1px_0_rgba(255,255,255,0.08)] [perspective:920px] ${className}`}
      data-anatomy-highlights="disabled"
      data-avatar-emote={selectedEmote}
    >
      <style>{`
        .sound-fitness-avatar,
        .sound-fitness-avatar * {
          transform-box: fill-box;
        }

        .sound-fitness-avatar svg {
          shape-rendering: geometricPrecision;
          text-rendering: geometricPrecision;
          transform: none;
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

        .sound-fitness-avatar__skin-detail,
        .sound-fitness-avatar__hair-strand {
          pointer-events: none;
          vector-effect: non-scaling-stroke;
        }

        .sound-fitness-avatar__skin-detail {
          opacity: 0.74;
        }

        .sound-fitness-avatar__hair-strand {
          opacity: 0.36;
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

      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(15,23,42,0.24),transparent_48%)]" />
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
            <stop offset="0%" stopColor="rgba(15,118,110,0.98)" />
            <stop offset="48%" stopColor="rgba(8,47,73,0.98)" />
            <stop offset="100%" stopColor="rgba(15,23,42,0.98)" />
          </linearGradient>
          <linearGradient id={`${avatarId}-suit-shadow`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(15,23,42,0.78)" />
            <stop offset="52%" stopColor="rgba(8,47,73,0.8)" />
            <stop offset="100%" stopColor="rgba(2,6,23,0.96)" />
          </linearGradient>
          <linearGradient id={`${avatarId}-gold`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(241,245,249,0.9)" />
            <stop offset="100%" stopColor="rgba(148,163,184,0.68)" />
          </linearGradient>
          <linearGradient id={`${avatarId}-boot`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(71,85,105,0.94)" />
            <stop offset="42%" stopColor="rgba(15,23,42,0.96)" />
            <stop offset="100%" stopColor="rgba(2,6,23,0.98)" />
          </linearGradient>
          <linearGradient id={`${avatarId}-armor-side`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(13,148,136,0.96)" />
            <stop offset="52%" stopColor="rgba(15,23,42,0.98)" />
            <stop offset="100%" stopColor="rgba(2,6,23,0.98)" />
          </linearGradient>
          <radialGradient id={`${avatarId}-skin-lit`} cx="36%" cy="22%" r="78%">
            <stop offset="0%" stopColor="rgba(255,247,237,0.98)" />
            <stop offset="38%" stopColor="rgba(253,224,197,0.96)" />
            <stop offset="100%" stopColor="rgba(126,79,67,0.88)" />
          </radialGradient>
          <radialGradient id={`${avatarId}-skin-rose`} cx="42%" cy="38%" r="70%">
            <stop offset="0%" stopColor="rgba(255,237,213,0.74)" />
            <stop offset="56%" stopColor="rgba(251,146,60,0.2)" />
            <stop offset="100%" stopColor="rgba(88,28,14,0)" />
          </radialGradient>
          <radialGradient id={`${avatarId}-hair-gloss`} cx="38%" cy="20%" r="88%">
            <stop offset="0%" stopColor="rgba(120,53,15,0.82)" />
            <stop offset="36%" stopColor="rgba(68,64,60,0.98)" />
            <stop offset="100%" stopColor="rgba(28,25,23,0.98)" />
          </radialGradient>
          <filter id={`${avatarId}-cast-shadow`} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="8" floodColor="rgba(0,0,0,0.72)" floodOpacity="1" stdDeviation="5" />
          </filter>
        </defs>

        <ellipse
          cx="120"
          cy="309"
          fill="rgba(2,6,23,0.52)"
          filter={`url(#${avatarId}-cast-shadow)`}
          rx="55"
          ry="10"
        />

        <g className="sound-fitness-avatar__character">
          <path
            d="M78 101 C94 83 146 83 162 101 C174 125 172 164 157 201 C139 214 101 214 83 201 C68 164 66 125 78 101Z"
            fill="rgba(15,23,42,0.5)"
          />
          <path
            d="M72 113 C82 97 101 91 113 99 C105 113 96 126 82 134 C75 128 72 121 72 113Z"
            fill={`url(#${avatarId}-armor-side)`}
            stroke="rgba(15,23,42,0.52)"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
          <path
            d="M168 113 C158 97 139 91 127 99 C135 113 144 126 158 134 C165 128 168 121 168 113Z"
            fill={`url(#${avatarId}-armor-side)`}
            stroke="rgba(15,23,42,0.52)"
            strokeLinejoin="round"
            strokeWidth="1.5"
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
              stroke="rgba(148,163,184,0.18)"
              strokeLinecap="round"
              strokeWidth="3"
            />
            <path
              d="M142 197 C139 225 139 254 144 288"
              fill="none"
              stroke="rgba(148,163,184,0.18)"
              strokeLinecap="round"
              strokeWidth="3"
            />
            <path
              d="M86 201 C92 194 103 194 111 201 C110 214 106 224 99 232 C91 224 87 213 86 201Z"
              fill={`url(#${avatarId}-armor-side)`}
              opacity="0.95"
              stroke="rgba(15,23,42,0.4)"
              strokeLinejoin="round"
              strokeWidth="1"
            />
            <path
              d="M154 201 C148 194 137 194 129 201 C130 214 134 224 141 232 C149 224 153 213 154 201Z"
              fill={`url(#${avatarId}-armor-side)`}
              opacity="0.95"
              stroke="rgba(15,23,42,0.4)"
              strokeLinejoin="round"
              strokeWidth="1"
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
              opacity="0.98"
              stroke="rgba(148,163,184,0.22)"
              strokeLinejoin="round"
              strokeWidth="1"
            />
            <path
              d="M151 257 C144 253 134 254 129 260 C132 275 135 286 141 296 C149 286 152 272 151 257Z"
              fill={`url(#${avatarId}-boot)`}
              opacity="0.98"
              stroke="rgba(148,163,184,0.22)"
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
            stroke="rgba(203,213,225,0.34)"
            strokeLinejoin="round"
            strokeWidth="2.4"
          />
          <path
            d="M94 109 C83 126 82 167 96 194 C104 184 108 118 111 98 C105 99 99 103 94 109Z"
            fill="rgba(2,6,23,0.28)"
          />
          <path
            d="M146 109 C157 126 158 167 144 194 C136 184 132 118 129 98 C135 99 141 103 146 109Z"
            fill="rgba(255,255,255,0.06)"
          />
          <g className="sound-fitness-avatar__left-arm">
            <path
              d="M97 105 C76 124 68 154 75 190"
              fill="none"
              stroke={`url(#${avatarId}-skin)`}
              strokeLinecap="round"
              strokeWidth="13"
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
              stroke="rgba(126,79,67,0.26)"
              strokeLinecap="round"
              strokeWidth="2.6"
            />
            <path
              d="M71 185 C79 181 89 184 93 193 C88 204 74 202 70 191Z"
              fill={`url(#${avatarId}-skin)`}
              stroke="rgba(126,79,67,0.32)"
              strokeLinejoin="round"
              strokeWidth="1.2"
            />
          </g>

          <g className="sound-fitness-avatar__right-arm">
            <path
              d="M143 105 C164 124 172 154 165 190"
              fill="none"
              stroke={`url(#${avatarId}-skin)`}
              strokeLinecap="round"
              strokeWidth="13"
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
              stroke="rgba(126,79,67,0.26)"
              strokeLinecap="round"
              strokeWidth="2.6"
            />
            <path
              d="M169 185 C161 181 151 184 147 193 C152 204 166 202 170 191Z"
              fill={`url(#${avatarId}-skin)`}
              stroke="rgba(126,79,67,0.32)"
              strokeLinejoin="round"
              strokeWidth="1.2"
            />
          </g>

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
              className="sound-fitness-avatar__hair-strand"
              d="M101 52 C109 39 124 34 139 39 M99 56 C112 47 129 45 146 55 M108 45 C119 37 132 36 143 43"
              fill="none"
              stroke="rgba(214,155,116,0.22)"
              strokeLinecap="round"
              strokeWidth="1.35"
            />
            <path
              d="M101 49 C110 31 132 29 145 43 C139 37 129 36 117 39 C109 41 104 44 101 49Z"
              fill="rgba(120,53,15,0.16)"
            />
            <g className="sound-fitness-avatar__expression">
              <path
                d="M104 58 C109 55 114 55 118 58 M126 58 C131 55 136 55 140 58"
                fill="none"
                stroke="rgba(15,23,42,0.78)"
                strokeLinecap="round"
                strokeWidth="2"
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
              <ellipse
                cx="108"
                cy="73"
                fill={`url(#${avatarId}-skin-rose)`}
                rx="9"
                ry="6"
              />
              <ellipse
                cx="136"
                cy="73"
                fill={`url(#${avatarId}-skin-rose)`}
                opacity="0.72"
                rx="9"
                ry="6"
              />
              <path
                className="sound-fitness-avatar__skin-detail"
                d="M109 69 C113 68 116 69 119 71 M126 71 C130 69 134 68 138 70 M115 78 C120 82 128 82 133 78"
                fill="none"
                stroke="rgba(88,28,14,0.22)"
                strokeLinecap="round"
                strokeWidth="1"
              />
              <path
                d="M108 83 C114 87 127 88 135 82"
                fill="none"
                stroke="rgba(255,247,237,0.2)"
                strokeLinecap="round"
                strokeWidth="1.2"
              />
            </g>
          </g>

        </g>
      </svg>
    </div>
  );
}

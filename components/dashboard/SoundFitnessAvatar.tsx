"use client";

import { useId, type KeyboardEvent } from "react";

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
  | "focus"
  | "salute"
  | "stretch";

export type SoundFitnessAvatarShirtPreset =
  | "sound"
  | "ocean"
  | "ember"
  | "violet";

export type SoundFitnessAvatarPantsPreset =
  | "graphite"
  | "navy"
  | "forest"
  | "maroon";

export type SoundFitnessAvatarShoesPreset =
  | "volt"
  | "frost"
  | "ember"
  | "shadow";

export type SoundFitnessAvatarSkinPreset =
  | "warm"
  | "golden"
  | "deep"
  | "cool";

export type SoundFitnessAvatarHairPreset =
  | "crop"
  | "swept"
  | "fade";

export type SoundFitnessAvatarFacePreset =
  | "relaxed"
  | "bright"
  | "focused"
  | "defined";

export type SoundFitnessAvatarGearPreset =
  | "none"
  | "headband"
  | "visor"
  | "wristbands";

export type SoundFitnessAvatarBodyPreset = "male" | "female";

export type SoundFitnessAvatarAppearance = {
  body: SoundFitnessAvatarBodyPreset;
  face: SoundFitnessAvatarFacePreset;
  gear: SoundFitnessAvatarGearPreset;
  hair: SoundFitnessAvatarHairPreset;
  pants: SoundFitnessAvatarPantsPreset;
  shirt: SoundFitnessAvatarShirtPreset;
  shoes: SoundFitnessAvatarShoesPreset;
  skin: SoundFitnessAvatarSkinPreset;
};

export const defaultSoundFitnessAvatarAppearance: SoundFitnessAvatarAppearance = {
  body: "male",
  face: "relaxed",
  gear: "none",
  hair: "crop",
  pants: "graphite",
  shirt: "sound",
  shoes: "volt",
  skin: "warm",
};

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

export type SoundFitnessAvatarBodyPart =
  | "arms"
  | "back"
  | "chest"
  | "core"
  | "legs"
  | "shoulders";

export type SoundFitnessAvatarProps = {
  activeZones?: SoundFitnessAvatarMuscleZone[];
  alignToFloor?: boolean;
  animationPreset?: SoundFitnessAvatarExercisePreset;
  appearance?: Partial<SoundFitnessAvatarAppearance>;
  className?: string;
  emotePreset?: SoundFitnessAvatarEmotePreset;
  exerciseLabel?: string;
  showExerciseLabel?: boolean;
  showAnatomyHighlights?: boolean;
  showSkeletonOverlay?: boolean;
  showZoneLabels?: boolean;
  interactiveBodyParts?: boolean;
  onBodyPartSelect?: (bodyPart: SoundFitnessAvatarBodyPart) => void;
  selectedBodyPart?: SoundFitnessAvatarBodyPart;
  /** Gate for the selected part's glow — selection state (view flip, aria)
      stays put when this is false, only the highlight hides. */
  bodyPartGlowActive?: boolean;
  /** Per-region highlight colors (defaults to cyan). Back and chest break
      into specific muscle regions so each can carry its own status color. */
  bodyPartGlowColors?: Partial<
    Record<SoundFitnessAvatarGlowRegion, string | undefined>
  >;
  showStageBackdrop?: boolean;
};

export type SoundFitnessAvatarGlowRegion =
  | "arms"
  | "core"
  | "legs"
  | "lowerBack"
  | "lowerChest"
  | "midChest"
  | "shoulders"
  | "traps"
  | "upperBack"
  | "upperChest";

// Every shirt is a Sound Fitness tee — the presets are colorways, and `logo`
// is the chest-print (and gear-tint) color chosen to contrast the fabric.
const avatarShirtPalettes: Record<
  SoundFitnessAvatarShirtPreset,
  { dark: string; deep: string; light: string; logo: string; mid: string }
> = {
  sound: {
    dark: "#1e293b",
    deep: "#0b1220",
    light: "#3b4a63",
    logo: "#67e8f9",
    mid: "#27344a",
  },
  ocean: {
    dark: "#1e40af",
    deep: "#101b3f",
    light: "#3b82f6",
    logo: "#bfdbfe",
    mid: "#1d4ed8",
  },
  ember: {
    dark: "#9a3412",
    deep: "#2a0e05",
    light: "#f97316",
    logo: "#fed7aa",
    mid: "#c2410c",
  },
  violet: {
    dark: "#5b21b6",
    deep: "#1e1038",
    light: "#8b5cf6",
    logo: "#ddd6fe",
    mid: "#6d28d9",
  },
};

const avatarPantsPalettes: Record<
  SoundFitnessAvatarPantsPreset,
  { dark: string; deep: string; light: string; mid: string }
> = {
  graphite: {
    dark: "#111827",
    deep: "#05070d",
    light: "#4b5563",
    mid: "#1f2937",
  },
  navy: {
    dark: "#172554",
    deep: "#080d24",
    light: "#1d4ed8",
    mid: "#1e3a8a",
  },
  forest: {
    dark: "#064e3b",
    deep: "#02150f",
    light: "#059669",
    mid: "#065f46",
  },
  maroon: {
    dark: "#4c0519",
    deep: "#180208",
    light: "#be123c",
    mid: "#881337",
  },
};

const avatarShoePalettes: Record<
  SoundFitnessAvatarShoesPreset,
  { dark: string; deep: string; sole: string; upper: string }
> = {
  volt: {
    dark: "#155e75",
    deep: "#082f3d",
    sole: "#67e8f9",
    upper: "#0e7490",
  },
  frost: {
    dark: "#94a3b8",
    deep: "#475569",
    sole: "#f8fafc",
    upper: "#cbd5e1",
  },
  ember: {
    dark: "#9a3412",
    deep: "#431407",
    sole: "#fdba74",
    upper: "#ea580c",
  },
  shadow: {
    dark: "#0f172a",
    deep: "#020617",
    sole: "#64748b",
    upper: "#1e293b",
  },
};

const avatarSkinPalettes: Record<
  SoundFitnessAvatarSkinPreset,
  { blush: string; highlight: string; mid: string; outline: string; shadow: string }
> = {
  warm: {
    blush: "#fb923c",
    highlight: "#fff7ed",
    mid: "#d69b74",
    outline: "#7e4f43",
    shadow: "#7e4f43",
  },
  golden: {
    blush: "#f59e0b",
    highlight: "#fde7c2",
    mid: "#c9894f",
    outline: "#70412f",
    shadow: "#80502f",
  },
  deep: {
    blush: "#fb7185",
    highlight: "#b9785e",
    mid: "#7a4638",
    outline: "#301b19",
    shadow: "#3f2521",
  },
  cool: {
    blush: "#f472b6",
    highlight: "#f4d7ca",
    mid: "#b98278",
    outline: "#66403f",
    shadow: "#684440",
  },
};

// Highlight/mid/shadow feed one radial gloss per style — the three stops need
// to stay in the same hue family or the bright stop reads as a bald patch on
// the crown at dashboard size (the old rust-on-slate crop did exactly that).
const avatarHairPalettes: Record<
  SoundFitnessAvatarHairPreset,
  { highlight: string; mid: string; shadow: string }
> = {
  crop: {
    highlight: "#5f4b3c",
    mid: "#3a2f27",
    shadow: "#17110d",
  },
  swept: {
    highlight: "#8a6a3b",
    mid: "#5b4222",
    shadow: "#241a10",
  },
  fade: {
    highlight: "#64748b",
    mid: "#334155",
    shadow: "#0f172a",
  },
};

const avatarEmoteLabels: Record<SoundFitnessAvatarEmotePreset, string> = {
  calm: "Calm scan",
  celebrate: "Celebrate",
  focus: "Focused",
  nod: "Nod",
  salute: "Salute",
  stretch: "Stretch",
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
  alignToFloor = false,
  animationPreset = "idle",
  appearance,
  bodyPartGlowActive = true,
  bodyPartGlowColors,
  className = "",
  emotePreset,
  exerciseLabel,
  interactiveBodyParts = false,
  onBodyPartSelect,
  selectedBodyPart,
  showExerciseLabel = true,
  showStageBackdrop = true,
}: SoundFitnessAvatarProps) {
  const avatarId = useId().replace(/:/g, "");
  const selectedEmote = emotePreset || legacyExerciseToEmote[animationPreset];
  const presetLabel = exerciseLabel || avatarEmoteLabels[selectedEmote];
  const resolvedAppearance = {
    ...defaultSoundFitnessAvatarAppearance,
    ...appearance,
  };
  const zoneColor = (region: SoundFitnessAvatarGlowRegion) =>
    bodyPartGlowColors?.[region] ?? "#67e8f9";
  const shirtPalette = avatarShirtPalettes[resolvedAppearance.shirt];
  const pantsPalette = avatarPantsPalettes[resolvedAppearance.pants];
  const shoePalette = avatarShoePalettes[resolvedAppearance.shoes];
  const skinPalette = avatarSkinPalettes[resolvedAppearance.skin];
  const hairPalette = avatarHairPalettes[resolvedAppearance.hair];
  const isFemale = resolvedAppearance.body === "female";
  const upperArmWidth = isFemale ? 11 : 13;
  const forearmWidth = isFemale ? 8 : 9;
  const thighWidth = isFemale ? 17 : 19;
  const shinWidth = isFemale ? 15 : 17;
  const selectBodyPart = (bodyPart: SoundFitnessAvatarBodyPart) => {
    if (interactiveBodyParts) onBodyPartSelect?.(bodyPart);
  };
  const bodyPartInteractionProps = (
    bodyPart: SoundFitnessAvatarBodyPart,
    label: string,
  ) => ({
    "aria-label": interactiveBodyParts ? `Select ${label}` : undefined,
    "aria-pressed": interactiveBodyParts ? selectedBodyPart === bodyPart : undefined,
    "data-avatar-body-part": bodyPart,
    onClick: () => selectBodyPart(bodyPart),
    onKeyDown: (event: KeyboardEvent<SVGPathElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectBodyPart(bodyPart);
      }
    },
    role: interactiveBodyParts ? ("button" as const) : undefined,
    tabIndex: interactiveBodyParts ? 0 : -1,
  });

  return (
    <div
      aria-label={`Sound Fitness character avatar: ${presetLabel}`}
      className={`sound-fitness-avatar relative isolate overflow-hidden rounded-[26px] border border-cyan-100/14 bg-[radial-gradient(circle_at_42%_2%,rgba(255,255,255,0.12),transparent_17%),radial-gradient(circle_at_50%_4%,rgba(34,211,238,0.2),transparent_34%),radial-gradient(circle_at_72%_72%,rgba(251,191,36,0.1),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.36),rgba(2,6,23,0.64))] shadow-[0_20px_44px_rgba(0,0,0,0.25),0_0_34px_rgba(34,211,238,0.12),inset_0_1px_0_rgba(255,255,255,0.08)] [perspective:920px] ${className}`}
      data-anatomy-highlights="disabled"
      data-avatar-body={resolvedAppearance.body}
      data-avatar-emote={selectedEmote}
      data-avatar-face={resolvedAppearance.face}
      data-avatar-gear={resolvedAppearance.gear}
      data-avatar-pants={resolvedAppearance.pants}
      data-avatar-shirt={resolvedAppearance.shirt}
      data-avatar-shoes={resolvedAppearance.shoes}
      data-avatar-view={selectedBodyPart === "back" ? "back" : "front"}
      data-body-parts={interactiveBodyParts ? "interactive" : "static"}
      style={
        alignToFloor
          ? {
              backgroundImage: "none",
              border: 0,
              borderRadius: 0,
              boxShadow: "none",
              overflow: "visible",
            }
          : undefined
      }
    >
      <style>{`
        .sound-fitness-avatar svg {
          shape-rendering: geometricPrecision;
          text-rendering: geometricPrecision;
          transform: rotateY(0deg);
          transform-origin: center;
          transform-style: preserve-3d;
          transition: transform 720ms cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform;
        }

        .sound-fitness-avatar[data-avatar-view="back"] svg {
          transform: rotateY(180deg);
        }

        .sound-fitness-avatar__character {
          animation: sound-fitness-avatar-breathe 4.8s ease-in-out infinite;
          transform-box: view-box;
          transform-origin: 120px 198px;
          will-change: transform;
        }

        .sound-fitness-avatar__rig-node {
          transform-box: view-box;
          will-change: transform;
        }

        .sound-fitness-avatar__head {
          animation: sound-fitness-avatar-head-idle 4.8s ease-in-out infinite;
          transform-box: view-box;
          transform-origin: 120px 99px;
          will-change: transform;
        }

        .sound-fitness-avatar__expression {
          animation: sound-fitness-avatar-expression 5.2s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }

        .sound-fitness-avatar__front-head,
        .sound-fitness-avatar__back-head {
          transition: opacity 190ms ease;
        }

        .sound-fitness-avatar__back-head {
          opacity: 0;
          pointer-events: none;
        }

        .sound-fitness-avatar[data-avatar-view="back"] .sound-fitness-avatar__front-head {
          opacity: 0;
          transition-delay: 100ms;
        }

        .sound-fitness-avatar[data-avatar-view="back"] .sound-fitness-avatar__back-head {
          opacity: 1;
          transition-delay: 330ms;
        }

        .sound-fitness-avatar__front-torso-detail,
        .sound-fitness-avatar__back-torso-detail,
        .sound-fitness-avatar__front-foot,
        .sound-fitness-avatar__back-foot {
          transition: opacity 190ms ease;
        }

        .sound-fitness-avatar__back-torso-detail,
        .sound-fitness-avatar__back-foot {
          opacity: 0;
          pointer-events: none;
        }

        .sound-fitness-avatar[data-avatar-view="back"] .sound-fitness-avatar__front-foot {
          opacity: 0;
          transition-delay: 100ms;
        }

        .sound-fitness-avatar[data-avatar-view="back"] .sound-fitness-avatar__back-foot {
          opacity: 1;
          transition-delay: 330ms;
        }

        .sound-fitness-avatar[data-avatar-view="back"] .sound-fitness-avatar__front-torso-detail {
          opacity: 0;
          transition-delay: 100ms;
        }

        .sound-fitness-avatar[data-avatar-view="back"] .sound-fitness-avatar__back-torso-detail {
          opacity: 1;
          transition-delay: 330ms;
        }

        .sound-fitness-avatar__eye {
          animation: sound-fitness-avatar-blink 6.2s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }

        .sound-fitness-avatar__pupil {
          animation: sound-fitness-avatar-gaze 7.4s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }

        .sound-fitness-avatar__left-upper-arm {
          transform-origin: 95px 108px;
        }

        .sound-fitness-avatar__left-forearm {
          transform-origin: 79px 151px;
        }

        .sound-fitness-avatar__right-upper-arm {
          transform-origin: 145px 108px;
        }

        .sound-fitness-avatar__right-forearm {
          transform-origin: 161px 151px;
        }

        .sound-fitness-avatar__left-thigh {
          transform-origin: 102px 193px;
        }

        .sound-fitness-avatar__left-shin {
          transform-origin: 98px 236px;
        }

        .sound-fitness-avatar__right-thigh {
          transform-origin: 138px 193px;
        }

        .sound-fitness-avatar__right-shin {
          transform-origin: 142px 236px;
        }

        .sound-fitness-avatar[data-avatar-emote="calm"] .sound-fitness-avatar__left-upper-arm {
          animation: sound-fitness-avatar-calm-left 5.2s ease-in-out infinite;
        }

        .sound-fitness-avatar[data-avatar-emote="calm"] .sound-fitness-avatar__right-upper-arm {
          animation: sound-fitness-avatar-calm-right 5.2s ease-in-out infinite;
        }

        .sound-fitness-avatar[data-avatar-emote="wave"] .sound-fitness-avatar__right-upper-arm {
          animation: sound-fitness-avatar-wave-shoulder 3.2s ease-in-out infinite;
        }

        .sound-fitness-avatar[data-avatar-emote="wave"] .sound-fitness-avatar__right-forearm {
          animation: sound-fitness-avatar-wave-elbow 3.2s ease-in-out infinite;
        }

        .sound-fitness-avatar[data-avatar-emote="nod"] .sound-fitness-avatar__head {
          animation: sound-fitness-avatar-nod 2.8s ease-in-out infinite;
        }

        .sound-fitness-avatar[data-avatar-emote="celebrate"] .sound-fitness-avatar__left-upper-arm {
          animation: sound-fitness-avatar-celebrate-left-shoulder 3.4s ease-in-out infinite;
        }

        .sound-fitness-avatar[data-avatar-emote="celebrate"] .sound-fitness-avatar__left-forearm {
          animation: sound-fitness-avatar-celebrate-left-elbow 3.4s ease-in-out infinite;
        }

        .sound-fitness-avatar[data-avatar-emote="celebrate"] .sound-fitness-avatar__right-upper-arm {
          animation: sound-fitness-avatar-celebrate-right-shoulder 3.4s ease-in-out infinite;
        }

        .sound-fitness-avatar[data-avatar-emote="celebrate"] .sound-fitness-avatar__right-forearm {
          animation: sound-fitness-avatar-celebrate-right-elbow 3.4s ease-in-out infinite;
        }

        .sound-fitness-avatar[data-avatar-emote="focus"] .sound-fitness-avatar__character {
          animation: sound-fitness-avatar-focus-stance 3.6s ease-in-out infinite;
        }

        .sound-fitness-avatar[data-avatar-emote="focus"] .sound-fitness-avatar__left-upper-arm {
          animation: sound-fitness-avatar-focus-left-arm 3.6s ease-in-out infinite;
        }

        .sound-fitness-avatar[data-avatar-emote="focus"] .sound-fitness-avatar__left-forearm {
          animation: sound-fitness-avatar-focus-left-forearm 3.6s ease-in-out infinite;
        }

        .sound-fitness-avatar[data-avatar-emote="focus"] .sound-fitness-avatar__right-upper-arm {
          animation: sound-fitness-avatar-focus-right-arm 3.6s ease-in-out infinite;
        }

        .sound-fitness-avatar[data-avatar-emote="focus"] .sound-fitness-avatar__right-forearm {
          animation: sound-fitness-avatar-focus-right-forearm 3.6s ease-in-out infinite;
        }

        .sound-fitness-avatar[data-avatar-emote="focus"] .sound-fitness-avatar__left-thigh {
          animation: sound-fitness-avatar-focus-left-thigh 3.6s ease-in-out infinite;
        }

        .sound-fitness-avatar[data-avatar-emote="focus"] .sound-fitness-avatar__left-shin {
          animation: sound-fitness-avatar-focus-left-shin 3.6s ease-in-out infinite;
        }

        .sound-fitness-avatar[data-avatar-emote="focus"] .sound-fitness-avatar__right-thigh {
          animation: sound-fitness-avatar-focus-right-thigh 3.6s ease-in-out infinite;
        }

        .sound-fitness-avatar[data-avatar-emote="focus"] .sound-fitness-avatar__right-shin {
          animation: sound-fitness-avatar-focus-right-shin 3.6s ease-in-out infinite;
        }

        .sound-fitness-avatar[data-avatar-emote="salute"] .sound-fitness-avatar__right-upper-arm {
          animation: sound-fitness-avatar-salute-shoulder 3.8s ease-in-out infinite;
        }

        .sound-fitness-avatar[data-avatar-emote="salute"] .sound-fitness-avatar__right-forearm {
          animation: sound-fitness-avatar-salute-elbow 3.8s ease-in-out infinite;
        }

        .sound-fitness-avatar[data-avatar-emote="stretch"] .sound-fitness-avatar__left-upper-arm {
          animation: sound-fitness-avatar-stretch-left-shoulder 4s ease-in-out infinite;
        }

        .sound-fitness-avatar[data-avatar-emote="stretch"] .sound-fitness-avatar__right-upper-arm {
          animation: sound-fitness-avatar-stretch-right-shoulder 4s ease-in-out infinite;
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

        .sound-fitness-avatar__eq-bar {
          animation: sound-fitness-avatar-eq 1.9s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }

        /* Back view hides the chest print with opacity only, which does not
           stop descendant animations — without this guard five EQ bars keep
           ticking invisibly (the chest-core this replaced had the same rule). */
        .sound-fitness-avatar[data-avatar-view="back"] .sound-fitness-avatar__eq-bar {
          animation: none;
        }

        .sound-fitness-avatar__gear {
          animation: sound-fitness-avatar-gear-glint 5s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }

        .sound-fitness-avatar__body-zone-glow {
          opacity: 0;
          pointer-events: none;
          transition: opacity 180ms ease, stroke-width 180ms ease;
        }

        .sound-fitness-avatar__body-zone-hit {
          cursor: default;
          fill: rgba(255,255,255,0.001);
          pointer-events: none;
          stroke: rgba(255,255,255,0.001);
        }

        .sound-fitness-avatar[data-body-parts="interactive"] .sound-fitness-avatar__body-zone-hit {
          cursor: pointer;
          pointer-events: all;
        }

        .sound-fitness-avatar__body-zone:hover .sound-fitness-avatar__body-zone-glow,
        .sound-fitness-avatar__body-zone:focus-within .sound-fitness-avatar__body-zone-glow {
          opacity: 0.58;
        }

        .sound-fitness-avatar__body-zone[data-active="true"] .sound-fitness-avatar__body-zone-glow {
          animation: sound-fitness-avatar-zone-pulse 2.1s ease-in-out infinite;
          opacity: 1;
        }

        @keyframes sound-fitness-avatar-breathe {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }

        @keyframes sound-fitness-avatar-head-idle {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-1px) rotate(-1deg); }
        }

        @keyframes sound-fitness-avatar-expression {
          0%, 100% { opacity: 0.92; transform: translateY(0); }
          45% { opacity: 1; transform: translateY(0.04rem); }
        }

        @keyframes sound-fitness-avatar-blink {
          0%, 43%, 47%, 82%, 86%, 100% { transform: scaleY(1); }
          45%, 84% { transform: scaleY(0.12); }
        }

        @keyframes sound-fitness-avatar-gaze {
          0%, 18%, 100% { transform: translateX(0); }
          34%, 48% { transform: translateX(1.4px); }
          64%, 78% { transform: translateX(-1.1px); }
        }

        @keyframes sound-fitness-avatar-calm-left {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(2.5deg); }
        }

        @keyframes sound-fitness-avatar-calm-right {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-2.5deg); }
        }

        @keyframes sound-fitness-avatar-wave-shoulder {
          0%, 10%, 88%, 100% { transform: rotate(0deg); }
          24%, 74% { transform: rotate(-122deg); }
        }

        @keyframes sound-fitness-avatar-wave-elbow {
          0%, 10%, 88%, 100% { transform: rotate(0deg); }
          24% { transform: rotate(8deg); }
          36% { transform: rotate(-20deg); }
          49% { transform: rotate(18deg); }
          62% { transform: rotate(-18deg); }
          74% { transform: rotate(10deg); }
        }

        @keyframes sound-fitness-avatar-nod {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          30% { transform: rotate(4deg) translateY(0.18rem); }
          58% { transform: rotate(-2deg) translateY(-0.05rem); }
        }

        @keyframes sound-fitness-avatar-celebrate-left-shoulder {
          0%, 12%, 88%, 100% { transform: rotate(0deg); }
          34%, 68% { transform: rotate(132deg); }
        }

        @keyframes sound-fitness-avatar-celebrate-left-elbow {
          0%, 12%, 88%, 100% { transform: rotate(0deg); }
          34%, 68% { transform: rotate(-28deg); }
        }

        @keyframes sound-fitness-avatar-celebrate-right-shoulder {
          0%, 12%, 88%, 100% { transform: rotate(0deg); }
          34%, 68% { transform: rotate(-132deg); }
        }

        @keyframes sound-fitness-avatar-celebrate-right-elbow {
          0%, 12%, 88%, 100% { transform: rotate(0deg); }
          34%, 68% { transform: rotate(28deg); }
        }

        @keyframes sound-fitness-avatar-focus-stance {
          0%, 100% { transform: translateY(0); }
          36%, 68% { transform: translateY(5px); }
        }

        @keyframes sound-fitness-avatar-focus-left-arm {
          0%, 100% { transform: rotate(0deg); }
          36%, 68% { transform: rotate(-13deg); }
        }

        @keyframes sound-fitness-avatar-focus-left-forearm {
          0%, 100% { transform: rotate(0deg); }
          36%, 68% { transform: rotate(-34deg); }
        }

        @keyframes sound-fitness-avatar-focus-right-arm {
          0%, 100% { transform: rotate(0deg); }
          36%, 68% { transform: rotate(13deg); }
        }

        @keyframes sound-fitness-avatar-focus-right-forearm {
          0%, 100% { transform: rotate(0deg); }
          36%, 68% { transform: rotate(34deg); }
        }

        @keyframes sound-fitness-avatar-focus-left-thigh {
          0%, 100% { transform: rotate(0deg); }
          36%, 68% { transform: rotate(5deg); }
        }

        @keyframes sound-fitness-avatar-focus-left-shin {
          0%, 100% { transform: rotate(0deg); }
          36%, 68% { transform: rotate(-10deg); }
        }

        @keyframes sound-fitness-avatar-focus-right-thigh {
          0%, 100% { transform: rotate(0deg); }
          36%, 68% { transform: rotate(-5deg); }
        }

        @keyframes sound-fitness-avatar-focus-right-shin {
          0%, 100% { transform: rotate(0deg); }
          36%, 68% { transform: rotate(10deg); }
        }

        @keyframes sound-fitness-avatar-salute-shoulder {
          0%, 12%, 86%, 100% { transform: rotate(0deg); }
          28%, 72% { transform: rotate(-76deg); }
        }

        @keyframes sound-fitness-avatar-salute-elbow {
          0%, 12%, 86%, 100% { transform: rotate(0deg); }
          28%, 72% { transform: rotate(-102deg); }
        }

        @keyframes sound-fitness-avatar-stretch-left-shoulder {
          0%, 12%, 88%, 100% { transform: rotate(0deg); }
          32%, 70% { transform: rotate(112deg); }
        }

        @keyframes sound-fitness-avatar-stretch-right-shoulder {
          0%, 12%, 88%, 100% { transform: rotate(0deg); }
          32%, 70% { transform: rotate(-112deg); }
        }

        @keyframes sound-fitness-avatar-eq {
          0%, 100% { transform: scaleY(0.55); }
          50% { transform: scaleY(1); }
        }

        @keyframes sound-fitness-avatar-gear-glint {
          0%, 72%, 100% { opacity: 0.88; }
          78% { opacity: 1; }
        }

        @keyframes sound-fitness-avatar-zone-pulse {
          0%, 100% { opacity: 0.76; }
          50% { opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .sound-fitness-avatar__character,
          .sound-fitness-avatar__head,
          .sound-fitness-avatar__expression,
          .sound-fitness-avatar__rig-node,
          .sound-fitness-avatar__eq-bar,
          .sound-fitness-avatar__gear {
            animation: none !important;
          }

          .sound-fitness-avatar svg {
            transition-duration: 1ms;
          }
        }

      `}</style>

      {showStageBackdrop ? (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(15,23,42,0.24),transparent_48%)]" />
      ) : null}
      {showExerciseLabel ? (
        <div className="absolute left-3 top-3 z-20 rounded-full border border-cyan-100/18 bg-slate-950/54 px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.14em] text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.12)]">
          {presetLabel}
        </div>
      ) : null}

      <svg
        aria-hidden={interactiveBodyParts ? undefined : true}
        className={
          alignToFloor
            ? // The drawn figure only spans the middle ~107 units of the
              // 240-unit canvas, so in a narrow column "meet" fits by width and
              // renders the athlete tiny under dead headroom. An oversized
              // viewport makes height the fitting axis — the athlete fills the
              // column top to bottom and the parent's overflow-clip crops only
              // empty canvas margin. Width and margin are explicit (not
              // left+right insets) because an svg's intrinsic ratio resolves an
              // over-constrained inset pair by dropping `right`, which parks
              // the athlete off-center. The viewBox itself must stay untouched:
              // the rig's px transform-origins resolve against it.
              "absolute -bottom-[3%] left-1/2 z-10 h-[108%] min-h-0 w-[216%] ml-[-108%]"
            : "relative z-10 h-full min-h-0 w-full"
        }
        preserveAspectRatio={alignToFloor ? "xMidYMax meet" : "xMidYMid meet"}
        viewBox="0 0 240 330"
      >
        <defs>
          <linearGradient id={`${avatarId}-skin`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={skinPalette.highlight} />
            <stop offset="46%" stopColor={skinPalette.mid} />
            <stop offset="100%" stopColor={skinPalette.shadow} />
          </linearGradient>
          <linearGradient id={`${avatarId}-shirt`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={shirtPalette.light} />
            <stop offset="48%" stopColor={shirtPalette.dark} />
            <stop offset="100%" stopColor={shirtPalette.deep} />
          </linearGradient>
          <linearGradient id={`${avatarId}-shirt-side`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={shirtPalette.mid} />
            <stop offset="52%" stopColor={shirtPalette.dark} />
            <stop offset="100%" stopColor={shirtPalette.deep} />
          </linearGradient>
          {/* userSpaceOnUse so every leg piece (thigh stroke, side panels,
              knee, calf, hip overlay) samples ONE continuous ramp — with the
              default per-shape gradient each piece restarted light-to-dark
              and the joggers read as separate thigh pads and shin guards. */}
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id={`${avatarId}-pants`}
            x1="88"
            x2="152"
            y1="180"
            y2="300"
          >
            <stop offset="0%" stopColor={pantsPalette.light} />
            <stop offset="52%" stopColor={pantsPalette.mid} />
            <stop offset="100%" stopColor={pantsPalette.deep} />
          </linearGradient>
          <linearGradient id={`${avatarId}-shoe`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={shoePalette.upper} />
            <stop offset="46%" stopColor={shoePalette.dark} />
            <stop offset="100%" stopColor={shoePalette.deep} />
          </linearGradient>
          <linearGradient id={`${avatarId}-sole`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor={shoePalette.sole} />
          </linearGradient>
          <radialGradient id={`${avatarId}-skin-lit`} cx="36%" cy="22%" r="78%">
            <stop offset="0%" stopColor={skinPalette.highlight} />
            <stop offset="38%" stopColor={skinPalette.mid} />
            <stop offset="100%" stopColor={skinPalette.shadow} />
          </radialGradient>
          <radialGradient id={`${avatarId}-skin-rose`} cx="42%" cy="38%" r="70%">
            <stop offset="0%" stopColor={skinPalette.highlight} stopOpacity="0.74" />
            <stop offset="56%" stopColor={skinPalette.blush} stopOpacity="0.24" />
            <stop offset="100%" stopColor={skinPalette.outline} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${avatarId}-hair-gloss`} cx="38%" cy="20%" r="88%">
            <stop offset="0%" stopColor={hairPalette.highlight} />
            <stop offset="36%" stopColor={hairPalette.mid} />
            <stop offset="100%" stopColor={hairPalette.shadow} />
          </radialGradient>
          <filter id={`${avatarId}-cast-shadow`} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="8" floodColor="rgba(0,0,0,0.72)" floodOpacity="1" stdDeviation="5" />
          </filter>
          <filter id={`${avatarId}-zone-glow`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
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
          <g
            className="sound-fitness-avatar__left-thigh sound-fitness-avatar__rig-node"
            data-avatar-joint="left-hip"
          >
            <path
              d="M102 193 C100 207 98 222 98 236"
              fill="none"
              stroke={`url(#${avatarId}-pants)`}
              strokeLinecap="round"
              strokeWidth={thighWidth}
            />
            <path
              d="M88 198 C93 191 104 191 112 198 C111 211 106 224 99 232 C92 224 88 212 88 198Z"
              fill={`url(#${avatarId}-pants)`}
            />
            <g
              className="sound-fitness-avatar__left-shin sound-fitness-avatar__rig-node"
              data-avatar-joint="left-knee"
            >
              <path
                d="M98 236 C98 254 96 276 94 294"
                fill="none"
                stroke={`url(#${avatarId}-pants)`}
                strokeLinecap="round"
                strokeWidth={shinWidth}
              />
              <path
                d="M87 258 C94 253 104 254 109 260 C106 276 102 288 96 297 C89 286 86 272 87 258Z"
                fill={`url(#${avatarId}-pants)`}
              />
              <g className="sound-fitness-avatar__front-foot">
                <path
                  d="M80 294 C91 289 104 292 110 301 C99 306 83 306 76 300Z"
                  fill={`url(#${avatarId}-shoe)`}
                  stroke="rgba(2,6,23,0.4)"
                  strokeLinejoin="round"
                  strokeWidth="1.2"
                />
                <path
                  d="M79 299 C87 294 100 294 106 301"
                  fill="none"
                  stroke={`url(#${avatarId}-sole)`}
                  strokeLinecap="round"
                  strokeWidth="4.5"
                />
              </g>
              {/* From behind only the heel cup and sole edge show — the
                  mirrored toe box read as feet still facing forward. */}
              <g className="sound-fitness-avatar__back-foot">
                <path
                  d="M83 293 C89 288 101 289 107 295 L107 301 C99 306 87 306 81 300Z"
                  fill={`url(#${avatarId}-shoe)`}
                  stroke="rgba(2,6,23,0.4)"
                  strokeLinejoin="round"
                  strokeWidth="1.2"
                />
                <path
                  d="M82 301 C91 305 101 305 108 300"
                  fill="none"
                  stroke={`url(#${avatarId}-sole)`}
                  strokeLinecap="round"
                  strokeWidth="4.5"
                />
              </g>
            </g>
          </g>

          <g
            className="sound-fitness-avatar__right-thigh sound-fitness-avatar__rig-node"
            data-avatar-joint="right-hip"
          >
            <path
              d="M138 193 C140 207 142 222 142 236"
              fill="none"
              stroke={`url(#${avatarId}-pants)`}
              strokeLinecap="round"
              strokeWidth={thighWidth}
            />
            <path
              d="M152 198 C147 191 136 191 128 198 C129 211 134 224 141 232 C148 224 152 212 152 198Z"
              fill={`url(#${avatarId}-pants)`}
            />
            <g
              className="sound-fitness-avatar__right-shin sound-fitness-avatar__rig-node"
              data-avatar-joint="right-knee"
            >
              <path
                d="M142 236 C142 254 144 276 146 294"
                fill="none"
                stroke={`url(#${avatarId}-pants)`}
                strokeLinecap="round"
                strokeWidth={shinWidth}
              />
              <path
                d="M153 258 C146 253 136 254 131 260 C134 276 138 288 144 297 C151 286 154 272 153 258Z"
                fill={`url(#${avatarId}-pants)`}
              />
              <g className="sound-fitness-avatar__front-foot">
                <path
                  d="M130 301 C136 292 149 289 160 294 L164 300 C157 306 141 306 130 301Z"
                  fill={`url(#${avatarId}-shoe)`}
                  stroke="rgba(2,6,23,0.4)"
                  strokeLinejoin="round"
                  strokeWidth="1.2"
                />
                <path
                  d="M134 301 C140 294 153 294 161 299"
                  fill="none"
                  stroke={`url(#${avatarId}-sole)`}
                  strokeLinecap="round"
                  strokeWidth="4.5"
                />
              </g>
              <g className="sound-fitness-avatar__back-foot">
                <path
                  d="M133 295 C139 289 151 288 157 293 L159 300 C153 306 141 306 133 301Z"
                  fill={`url(#${avatarId}-shoe)`}
                  stroke="rgba(2,6,23,0.4)"
                  strokeLinejoin="round"
                  strokeWidth="1.2"
                />
                <path
                  d="M132 300 C139 305 149 305 158 301"
                  fill="none"
                  stroke={`url(#${avatarId}-sole)`}
                  strokeLinecap="round"
                  strokeWidth="4.5"
                />
              </g>
            </g>
          </g>

          {/* One continuous glow silhouette per leg instead of separate
              thigh/shin strokes — the seam at the knee read as two broken
              highlights. Static shapes (outside the leg rig nodes) are fine:
              the flash is selection-driven and the legs only articulate
              during the focus emote. The hit shapes live here too so the
              whole leg is one click target. */}
          <g
            className="sound-fitness-avatar__body-zone"
            data-active={bodyPartGlowActive && selectedBodyPart === "legs"}
          >
            <path
              className="sound-fitness-avatar__body-zone-glow"
              d="M93 192 C98 187 107 187 111 192 C110 207 108 222 107 236 C106 255 103 275 101 291 C99 296 90 296 88 291 C88 275 89 255 90 236 C90 221 91 206 93 192Z"
              fill={zoneColor("legs")}
              fillOpacity="0.5"
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow"
              d="M147 192 C142 187 133 187 129 192 C130 207 132 222 133 236 C134 255 137 275 139 291 C141 296 150 296 152 291 C152 275 151 255 150 236 C150 221 149 206 147 192Z"
              fill={zoneColor("legs")}
              fillOpacity="0.5"
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              {...bodyPartInteractionProps("legs", "legs")}
              className="sound-fitness-avatar__body-zone-hit"
              d="M93 192 C98 187 107 187 111 192 C110 207 108 222 107 236 C106 255 103 275 101 291 C99 296 90 296 88 291 C88 275 89 255 90 236 C90 221 91 206 93 192Z"
            />
            <path
              {...bodyPartInteractionProps("legs", "legs")}
              className="sound-fitness-avatar__body-zone-hit"
              d="M147 192 C142 187 133 187 129 192 C130 207 132 222 133 236 C134 255 137 275 139 291 C141 296 150 296 152 291 C152 275 151 255 150 236 C150 221 149 206 147 192Z"
            />
          </g>

          <g
            className="sound-fitness-avatar__left-upper-arm sound-fitness-avatar__rig-node"
            data-avatar-joint="left-shoulder"
          >
            <path
              d="M95 108 C87 121 82 136 79 151"
              fill="none"
              stroke={`url(#${avatarId}-skin)`}
              strokeLinecap="round"
              strokeWidth={upperArmWidth}
            />
            <path
              d="M95 108 C91 115 88 123 85 132"
              fill="none"
              stroke={`url(#${avatarId}-shirt-side)`}
              strokeLinecap="round"
              strokeWidth={upperArmWidth + 3}
            />
            <path
              d="M79 128 C83 132 88 134 92 133"
              fill="none"
              stroke="rgba(2,6,23,0.38)"
              strokeLinecap="round"
              strokeWidth="1.3"
            />
            <g
              className="sound-fitness-avatar__body-zone"
              data-active={bodyPartGlowActive && selectedBodyPart === "shoulders"}
            >
              <path
                className="sound-fitness-avatar__body-zone-glow"
                d="M84 112 C86 100 97 96 104 102 C106 108 105 116 100 121 C93 122 86 119 84 112Z"
                fill={zoneColor("shoulders")}
                fillOpacity="0.45"
                filter={`url(#${avatarId}-zone-glow)`}
              />
              <path
                {...bodyPartInteractionProps("shoulders", "shoulders")}
                className="sound-fitness-avatar__body-zone-hit"
                d="M84 108 A11 11 0 1 0 106 108 A11 11 0 1 0 84 108"
                strokeWidth="6"
              />
            </g>
            <g
              className="sound-fitness-avatar__body-zone"
              data-active={bodyPartGlowActive && selectedBodyPart === "arms"}
            >
              <path
                className="sound-fitness-avatar__body-zone-glow"
                d="M92 114 C87 126 83 139 80 151"
                fill="none"
                filter={`url(#${avatarId}-zone-glow)`}
                stroke={zoneColor("arms")}
                strokeLinecap="round"
                strokeWidth={upperArmWidth + 3}
              />
              <path
                {...bodyPartInteractionProps("arms", "arms")}
                className="sound-fitness-avatar__body-zone-hit"
                d="M92 116 C87 127 83 139 80 149"
                fill="none"
                strokeWidth={upperArmWidth + 12}
              />
            </g>
            <g
              className="sound-fitness-avatar__left-forearm sound-fitness-avatar__rig-node"
              data-avatar-joint="left-elbow"
            >
              <path
                d="M79 151 C76 165 73 179 75 190"
                fill="none"
                stroke={`url(#${avatarId}-skin)`}
                strokeLinecap="round"
                strokeWidth={forearmWidth}
              />
              <path
                d="M77 155 C75 168 74 178 76 186"
                fill="none"
                stroke={skinPalette.outline}
                strokeLinecap="round"
                strokeOpacity="0.28"
                strokeWidth="2"
              />
              {resolvedAppearance.gear === "wristbands" ? (
                <path
                  className="sound-fitness-avatar__gear"
                  d="M70 177 C76 174 83 175 88 180 L86 189 C80 186 75 185 70 188Z"
                  fill={shirtPalette.logo}
                  fillOpacity="0.9"
                  stroke="#f8fafc"
                  strokeOpacity="0.46"
                  strokeWidth="1"
                />
              ) : null}
              <path
                d="M70 185 C77 181 87 183 91 191 C89 201 76 203 70 194Z"
                fill={`url(#${avatarId}-skin-lit)`}
                stroke={skinPalette.outline}
                strokeOpacity="0.38"
                strokeLinejoin="round"
                strokeWidth="1.1"
              />
              <g
                className="sound-fitness-avatar__body-zone"
                data-active={bodyPartGlowActive && selectedBodyPart === "arms"}
              >
                <path
                  className="sound-fitness-avatar__body-zone-glow"
                  d="M79 151 C76 165 74 179 76 189"
                  fill="none"
                  filter={`url(#${avatarId}-zone-glow)`}
                  stroke={zoneColor("arms")}
                  strokeLinecap="round"
                  strokeWidth={forearmWidth + 5}
                />
                <path
                  {...bodyPartInteractionProps("arms", "arms")}
                  className="sound-fitness-avatar__body-zone-hit"
                  d="M79 154 C76 166 74 178 76 188"
                  fill="none"
                  strokeWidth={forearmWidth + 12}
                />
              </g>
            </g>
          </g>

          <g
            className="sound-fitness-avatar__right-upper-arm sound-fitness-avatar__rig-node"
            data-avatar-joint="right-shoulder"
          >
            <path
              d="M145 108 C153 121 158 136 161 151"
              fill="none"
              stroke={`url(#${avatarId}-skin)`}
              strokeLinecap="round"
              strokeWidth={upperArmWidth}
            />
            <path
              d="M145 108 C149 115 152 123 155 132"
              fill="none"
              stroke={`url(#${avatarId}-shirt-side)`}
              strokeLinecap="round"
              strokeWidth={upperArmWidth + 3}
            />
            <path
              d="M161 128 C157 132 152 134 148 133"
              fill="none"
              stroke="rgba(2,6,23,0.38)"
              strokeLinecap="round"
              strokeWidth="1.3"
            />
            <g
              className="sound-fitness-avatar__body-zone"
              data-active={bodyPartGlowActive && selectedBodyPart === "shoulders"}
            >
              <path
                className="sound-fitness-avatar__body-zone-glow"
                d="M156 112 C154 100 143 96 136 102 C134 108 135 116 140 121 C147 122 154 119 156 112Z"
                fill={zoneColor("shoulders")}
                fillOpacity="0.45"
                filter={`url(#${avatarId}-zone-glow)`}
              />
              <path
                {...bodyPartInteractionProps("shoulders", "shoulders")}
                className="sound-fitness-avatar__body-zone-hit"
                d="M134 108 A11 11 0 1 0 156 108 A11 11 0 1 0 134 108"
                strokeWidth="6"
              />
            </g>
            <g
              className="sound-fitness-avatar__body-zone"
              data-active={bodyPartGlowActive && selectedBodyPart === "arms"}
            >
              <path
                className="sound-fitness-avatar__body-zone-glow"
                d="M148 114 C153 126 157 139 160 151"
                fill="none"
                filter={`url(#${avatarId}-zone-glow)`}
                stroke={zoneColor("arms")}
                strokeLinecap="round"
                strokeWidth={upperArmWidth + 3}
              />
              <path
                {...bodyPartInteractionProps("arms", "arms")}
                className="sound-fitness-avatar__body-zone-hit"
                d="M148 116 C153 127 157 139 160 149"
                fill="none"
                strokeWidth={upperArmWidth + 12}
              />
            </g>
            <g
              className="sound-fitness-avatar__right-forearm sound-fitness-avatar__rig-node"
              data-avatar-joint="right-elbow"
            >
              <path
                d="M161 151 C164 165 167 179 165 190"
                fill="none"
                stroke={`url(#${avatarId}-skin)`}
                strokeLinecap="round"
                strokeWidth={forearmWidth}
              />
              <path
                d="M163 155 C165 168 166 178 164 186"
                fill="none"
                stroke={skinPalette.outline}
                strokeLinecap="round"
                strokeOpacity="0.28"
                strokeWidth="2"
              />
              {resolvedAppearance.gear === "wristbands" ? (
                <path
                  className="sound-fitness-avatar__gear"
                  d="M170 177 C164 174 157 175 152 180 L154 189 C160 186 165 185 170 188Z"
                  fill={shirtPalette.logo}
                  fillOpacity="0.9"
                  stroke="#f8fafc"
                  strokeOpacity="0.46"
                  strokeWidth="1"
                />
              ) : null}
              <path
                d="M170 185 C163 181 153 183 149 191 C151 201 164 203 170 194Z"
                fill={`url(#${avatarId}-skin-lit)`}
                stroke={skinPalette.outline}
                strokeOpacity="0.38"
                strokeLinejoin="round"
                strokeWidth="1.1"
              />
              <g
                className="sound-fitness-avatar__body-zone"
                data-active={bodyPartGlowActive && selectedBodyPart === "arms"}
              >
                <path
                  className="sound-fitness-avatar__body-zone-glow"
                  d="M161 151 C164 165 166 179 164 189"
                  fill="none"
                  filter={`url(#${avatarId}-zone-glow)`}
                  stroke={zoneColor("arms")}
                  strokeLinecap="round"
                  strokeWidth={forearmWidth + 5}
                />
                <path
                  {...bodyPartInteractionProps("arms", "arms")}
                  className="sound-fitness-avatar__body-zone-hit"
                  d="M161 154 C164 166 166 178 164 188"
                  fill="none"
                  strokeWidth={forearmWidth + 12}
                />
              </g>
            </g>
          </g>

          <path
            d={
              isFemale
                ? "M82 104 C95 88 145 88 158 104 C169 130 164 169 151 202 C139 211 101 211 89 202 C76 169 71 130 82 104Z"
                : "M78 101 C94 83 146 83 162 101 C174 125 172 164 157 201 C139 214 101 214 83 201 C68 164 66 125 78 101Z"
            }
            fill="rgba(15,23,42,0.5)"
          />
          <path
            d={
              isFemale
                ? "M76 114 C85 99 101 94 112 100 C105 113 96 126 84 134 C78 129 76 122 76 114Z"
                : "M72 113 C82 97 101 91 113 99 C105 113 96 126 82 134 C75 128 72 121 72 113Z"
            }
            fill={`url(#${avatarId}-shirt-side)`}
            stroke="rgba(2,6,23,0.4)"
            strokeLinejoin="round"
            strokeWidth="1.2"
          />
          <path
            d={
              isFemale
                ? "M164 114 C155 99 139 94 128 100 C135 113 144 126 156 134 C162 129 164 122 164 114Z"
                : "M168 113 C158 97 139 91 127 99 C135 113 144 126 158 134 C165 128 168 121 168 113Z"
            }
            fill={`url(#${avatarId}-shirt-side)`}
            stroke="rgba(2,6,23,0.4)"
            strokeLinejoin="round"
            strokeWidth="1.2"
          />
          <path
            d={
              isFemale
                ? "M100 95 C108 89 132 89 140 95 C151 119 149 146 140 164 C138 176 144 188 147 197 C133 204 107 204 93 197 C96 188 102 176 100 164 C91 146 89 119 100 95Z"
                : "M96 95 C106 88 134 88 144 95 C158 123 158 166 146 195 C133 203 107 203 94 195 C82 166 82 123 96 95Z"
            }
            fill={`url(#${avatarId}-shirt)`}
            stroke="rgba(2,6,23,0.4)"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
          {/* Joggers' hip section painted over the tee's lower torso so the tee
              visually ends at a waistband. The shape traces just inside the
              torso silhouette so no pants color spills past the body edge, and
              it sits outside the front/back detail groups because pants show
              from both views. */}
          <path
            d={
              isFemale
                ? "M99 180 C113 188 127 188 140 180 L147 197 C133 204 107 204 93 197Z"
                : "M90 179 C110 188 130 188 150 179 L146 195 C133 203 107 203 94 195Z"
            }
            fill={`url(#${avatarId}-pants)`}
          />
          <path
            d={
              isFemale
                ? "M99 181 C113 189 127 189 140 181"
                : "M91 180 C110 189 130 189 149 180"
            }
            fill="none"
            stroke={pantsPalette.deep}
            strokeLinecap="round"
            strokeOpacity="0.85"
            strokeWidth="2.2"
          />
          {/* Front-only garment details carry the front-torso-detail class so
              the back view hides them — a drawstring and dipped neckline
              showing from behind read as the clothes having no back. */}
          <path
            className="sound-fitness-avatar__front-torso-detail"
            d="M117 187 L115 193 M123 187 L125 193"
            fill="none"
            stroke="rgba(248,250,252,0.4)"
            strokeLinecap="round"
            strokeWidth="1.1"
          />
          <path
            className="sound-fitness-avatar__front-torso-detail"
            d="M105 100 C112 108 128 108 135 100 C131 112 109 112 105 100Z"
            fill={shirtPalette.deep}
            stroke="rgba(248,250,252,0.16)"
            strokeLinejoin="round"
            strokeWidth="0.9"
          />
          <g aria-hidden="true" className="sound-fitness-avatar__front-torso-detail">
            {/* Sound Fitness chest print: a live EQ wave over the wordmark.
                aria-hidden because the svg itself joins the accessibility tree
                when body parts are interactive — without it, AT announces stray
                SOUND / FITNESS text between the body-part buttons (even in back
                view, where the print is only opacity-hidden). */}
            {[
              { delay: "0s", height: 7, x: 108.3 },
              { delay: "-0.9s", height: 12, x: 113.5 },
              { delay: "-0.3s", height: 17, x: 118.7 },
              { delay: "-1.2s", height: 12, x: 123.9 },
              { delay: "-0.6s", height: 7, x: 129.1 },
            ].map((bar) => (
              <rect
                className="sound-fitness-avatar__eq-bar"
                fill={shirtPalette.logo}
                height={bar.height}
                key={bar.x}
                rx="1.3"
                style={{ animationDelay: bar.delay }}
                width="2.6"
                x={bar.x}
                y={126 - bar.height / 2}
              />
            ))}
            <text
              fill={shirtPalette.logo}
              fontSize="5.5"
              fontWeight="800"
              letterSpacing="0.16em"
              opacity="0.92"
              textAnchor="middle"
              x="120.5"
              y="143"
            >
              SOUND
            </text>
            <text
              fill={shirtPalette.logo}
              fontSize="3.4"
              fontWeight="700"
              letterSpacing="0.3em"
              opacity="0.64"
              textAnchor="middle"
              x="120.6"
              y="149"
            >
              FITNESS
            </text>
          </g>
          <g className="sound-fitness-avatar__back-torso-detail">
            {/* The shirt's back: a high crew-neck band and a yoke seam, so the
                flipped view reads as the garment's rear rather than the front
                neckline seen through the head. */}
            <path
              d="M106 99 C113 104 127 104 134 99"
              fill="none"
              stroke={shirtPalette.deep}
              strokeLinecap="round"
              strokeWidth="3.4"
            />
            <path
              d="M103 109 C112 113 128 113 137 109"
              fill="none"
              stroke="rgba(2,6,23,0.34)"
              strokeLinecap="round"
              strokeWidth="1.3"
            />
            <path
              d={
                isFemale
                  ? "M108 103 C113 98 127 98 132 103"
                  : "M106 102 C112 97 128 97 134 102"
              }
              fill="none"
              stroke="rgba(2,6,23,0.42)"
              strokeLinecap="round"
              strokeWidth="1.6"
            />
            <path
              d={isFemale ? "M120 106 L120 166" : "M120 106 L120 171"}
              fill="none"
              stroke="rgba(2,6,23,0.44)"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
            <path
              d="M114 115 C110 110 103 110 100 115 C102 123 108 127 113 126 C115 123 115 119 114 115Z"
              fill="rgba(2,6,23,0.26)"
              stroke="rgba(2,6,23,0.4)"
              strokeLinejoin="round"
              strokeWidth="1.2"
            />
            <path
              d="M126 115 C130 110 137 110 140 115 C138 123 132 127 127 126 C125 123 125 119 126 115Z"
              fill="rgba(255,255,255,0.05)"
              stroke="rgba(2,6,23,0.4)"
              strokeLinejoin="round"
              strokeWidth="1.2"
            />
            <path
              d={
                isFemale
                  ? "M104 130 C107 143 109 153 111 161 M136 130 C133 143 131 153 129 161"
                  : "M103 132 C106 146 109 158 112 168 M137 132 C134 146 131 158 128 168"
              }
              fill="none"
              stroke="rgba(2,6,23,0.3)"
              strokeLinecap="round"
              strokeWidth="1.2"
            />
          </g>

          <g
            className="sound-fitness-avatar__body-zone"
            data-active={bodyPartGlowActive && selectedBodyPart === "back"}
          >
            {/* Specific back regions, each in its own muscle's status color:
                traps across the neck base, the upper back over the blades,
                and the lower back above the waist. */}
            <path
              className="sound-fitness-avatar__body-zone-glow"
              d="M104 100 C111 95 129 95 136 100 C133 107 127 112 120 113 C113 112 107 107 104 100Z"
              fill={zoneColor("traps")}
              fillOpacity="0.44"
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow"
              d="M100 114 C107 110 133 110 140 114 C141 128 138 140 133 146 C124 150 116 150 107 146 C102 140 99 128 100 114Z"
              fill={zoneColor("upperBack")}
              fillOpacity="0.4"
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow"
              d="M105 150 C113 147 127 147 135 150 C137 162 136 173 133 181 C124 185 116 185 107 181 C104 173 103 162 105 150Z"
              fill={zoneColor("lowerBack")}
              fillOpacity="0.4"
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              {...bodyPartInteractionProps("back", "back")}
              className="sound-fitness-avatar__body-zone-hit"
              d="M104 101 C111 96 129 96 136 101 L143 116 C137 122 129 125 120 125 C111 125 103 122 97 116Z"
              strokeLinejoin="round"
              strokeWidth="5"
            />
          </g>
          <g
            className="sound-fitness-avatar__body-zone"
            data-active={bodyPartGlowActive && selectedBodyPart === "chest"}
          >
            {/* Chest bands — upper, mid, lower pecs — each colored by its own
                muscle's seven-day status. */}
            <path
              className="sound-fitness-avatar__body-zone-glow"
              d="M98 116 C105 110 115 109 120 114 C125 109 135 110 142 116 C142 122 141 127 139 131 C127 126 113 126 101 131 C99 127 98 122 98 116Z"
              fill={zoneColor("upperChest")}
              fillOpacity="0.44"
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow"
              d="M100 133 C112 128 128 128 140 133 C140 139 139 144 137 147 C126 143 114 143 103 147 C101 144 100 139 100 133Z"
              fill={zoneColor("midChest")}
              fillOpacity="0.42"
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow"
              d="M103 149 C114 146 126 146 137 149 C136 154 134 158 131 160 C124 158 116 158 109 160 C106 158 104 154 103 149Z"
              fill={zoneColor("lowerChest")}
              fillOpacity="0.4"
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              {...bodyPartInteractionProps("chest", "chest")}
              className="sound-fitness-avatar__body-zone-hit"
              d="M96 119 C103 111 113 110 120 116 C127 110 137 111 144 119 L139 142 C132 146 126 146 120 141 C114 146 108 146 101 142Z"
              strokeLinejoin="round"
              strokeWidth="5"
            />
          </g>
          <g
            className="sound-fitness-avatar__body-zone"
            data-active={bodyPartGlowActive && selectedBodyPart === "core"}
          >
            <path
              className="sound-fitness-avatar__body-zone-glow"
              d="M106 148 C114 144 126 144 134 148 L137 184 C132 192 108 192 103 184Z"
              fill={zoneColor("core")}
              fillOpacity="0.34"
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              {...bodyPartInteractionProps("core", "core")}
              className="sound-fitness-avatar__body-zone-hit"
              d="M106 148 C114 144 126 144 134 148 L137 184 C132 192 108 192 103 184Z"
              strokeLinejoin="round"
              strokeWidth="5"
            />
          </g>

          <g className="sound-fitness-avatar__back-head sound-fitness-avatar__head">
            <path
              d={
                isFemale
                  ? "M112 86 H129 L132 101 C125 106 115 106 108 101Z"
                  : "M111 87 H130 L134 101 C127 107 114 107 106 101Z"
              }
              fill={`url(#${avatarId}-skin)`}
              stroke={skinPalette.outline}
              strokeOpacity="0.34"
              strokeLinejoin="round"
              strokeWidth="1"
            />
            {isFemale && resolvedAppearance.hair === "swept" ? (
              <>
                {/* Ponytail hanging down the back — drawn before the head
                    fill so the skull covers the tail's root. */}
                <path
                  d="M115 76 C110 92 109 108 113 126 C116 134 124 134 127 126 C131 108 130 92 125 76 C121 71 119 71 115 76Z"
                  fill={`url(#${avatarId}-hair-gloss)`}
                  stroke={hairPalette.shadow}
                  strokeOpacity="0.5"
                  strokeWidth="1.2"
                />
                <path
                  d="M114 82 C118 79 122 79 126 82 L125 88 C121 86 119 86 115 88Z"
                  fill={hairPalette.shadow}
                  fillOpacity="0.9"
                />
                <path
                  d="M117 92 C115 103 115 114 117 123 M123 92 C125 103 125 114 123 123"
                  fill="none"
                  stroke={hairPalette.highlight}
                  strokeLinecap="round"
                  strokeOpacity="0.4"
                  strokeWidth="1.1"
                />
              </>
            ) : null}
            <path
              d={
                isFemale
                  ? "M96 59 C98 41 108 31 121 29 C136 29 147 41 149 59 C148 79 137 92 121 93 C105 92 96 79 96 59Z"
                  : "M93 60 C95 42 107 30 123 30 C139 31 150 43 151 61 C148 79 138 91 121 92 C104 91 95 78 93 60Z"
              }
              fill={`url(#${avatarId}-hair-gloss)`}
              stroke={hairPalette.shadow}
              strokeOpacity="0.52"
              strokeWidth="1.8"
            />
            <path
              d={
                resolvedAppearance.hair === "swept"
                  ? "M99 47 C109 31 133 26 146 45 C150 57 146 78 137 88 C142 68 136 46 120 42 C111 40 104 43 99 47Z"
                  : resolvedAppearance.hair === "fade"
                    ? "M98 52 C105 35 119 29 135 35 C145 39 150 49 149 61 C138 53 128 50 116 51 C109 51 103 52 98 52Z"
                    : "M97 54 C102 35 115 27 131 31 C145 35 151 47 149 65 C139 54 128 50 116 51 C108 52 102 53 97 54Z"
              }
              fill={hairPalette.shadow}
              fillOpacity="0.82"
            />
            <path
              className="sound-fitness-avatar__hair-strand"
              d="M101 54 C111 43 128 40 143 48 M99 61 C112 52 132 51 146 60 M104 69 C116 62 132 62 143 69"
              fill="none"
              stroke={hairPalette.highlight}
              strokeLinecap="round"
              strokeWidth="1.4"
            />
            <path
              d="M112 87 C117 91 126 91 131 87"
              fill="none"
              stroke={skinPalette.outline}
              strokeLinecap="round"
              strokeOpacity="0.38"
              strokeWidth="1.2"
            />
          </g>

          <g className="sound-fitness-avatar__front-head sound-fitness-avatar__head">
            {isFemale && resolvedAppearance.hair === "swept" ? (
              <path
                d="M140 44 C153 49 158 62 154 77 C152 85 148 91 142 95 C147 78 145 61 136 49Z"
                fill={`url(#${avatarId}-hair-gloss)`}
                stroke={hairPalette.shadow}
                strokeOpacity="0.4"
                strokeWidth="1"
              />
            ) : null}
            <path
              d={
                isFemale
                  ? "M112 86 H129 L132 101 C125 106 115 106 108 101Z"
                  : "M111 87 H130 L134 101 C127 107 114 107 106 101Z"
              }
              fill={`url(#${avatarId}-skin)`}
              stroke="rgba(253,230,138,0.2)"
              strokeLinejoin="round"
              strokeWidth="1"
            />
            <ellipse
              cx={isFemale ? 96 : 94}
              cy="66"
              fill={`url(#${avatarId}-skin)`}
              rx="5"
              ry="8"
              stroke={skinPalette.outline}
              strokeOpacity="0.24"
              strokeWidth="1"
            />
            <ellipse
              cx={isFemale ? 148 : 150}
              cy="66"
              fill={`url(#${avatarId}-skin)`}
              rx="5"
              ry="8"
              stroke={skinPalette.outline}
              strokeOpacity="0.24"
              strokeWidth="1"
            />
            <path
              d={
                isFemale
                  ? "M96 59 C98 41 108 31 121 29 C136 29 147 41 149 59 C148 79 137 92 121 93 C105 92 96 79 96 59Z"
                  : "M93 60 C95 42 107 30 123 30 C139 31 150 43 151 61 C148 79 138 91 121 92 C104 91 95 78 93 60Z"
              }
              fill={`url(#${avatarId}-skin-lit)`}
              stroke="rgba(253,230,138,0.32)"
              strokeWidth="1.8"
            />
            <path
              d={
                isFemale
                  ? "M136 38 C146 47 149 61 144 76 C140 85 132 91 121 92 C136 80 140 58 136 38Z"
                  : "M137 39 C148 47 151 61 145 75 C141 84 133 90 122 91 C137 80 141 59 137 39Z"
              }
              fill="rgba(92,51,44,0.22)"
            />
            <path
              d="M102 63 C104 54 110 47 119 45"
              fill="none"
              stroke="rgba(255,247,237,0.14)"
              strokeLinecap="round"
              strokeWidth="2"
            />
            {/* Front hair caps are drawn as a slight outward offset of the
                skull's own upper arc — anchored at BOTH temples with even
                crown volume — so the hair reads as ON the head. The previous
                paths cut inside the skull on the upper-left and drooped low
                on the right, which read as the hair sliding off. */}
            {resolvedAppearance.hair === "fade" ? (
              <path
                d={
                  isFemale
                    ? "M94 51 C97 34 107 25 120 25 C135 25 147 36 150 52 C142 44 132 41 119 42 C108 42 100 45 94 51Z"
                    : "M93 50 C96 34 108 26 122 26 C138 26 150 38 152 52 C143 44 133 41 120 42 C109 42 100 45 93 50Z"
                }
                fill={`url(#${avatarId}-hair-gloss)`}
              />
            ) : resolvedAppearance.hair === "swept" ? (
              <path
                d={
                  isFemale
                    ? "M94 55 C97 34 108 24 123 25 C138 26 150 38 151 55 C144 47 136 43 126 44 C112 43 100 48 94 55Z"
                    : "M92 55 C94 36 107 25 124 26 C140 27 152 39 153 57 C147 48 138 44 128 45 C114 44 101 48 92 55Z"
                }
                fill={`url(#${avatarId}-hair-gloss)`}
              />
            ) : (
              <path
                d={
                  isFemale
                    ? "M94 56 C96 38 106 25 120 25 C136 25 148 38 151 56 C143 48 132 45 119 46 C107 46 99 49 94 56Z"
                    : "M91 57 C93 39 106 26 122 26 C139 26 151 40 153 58 C145 50 134 46 121 47 C108 47 98 50 91 57Z"
                }
                fill={`url(#${avatarId}-hair-gloss)`}
              />
            )}
            <path
              className="sound-fitness-avatar__hair-strand"
              d={
                resolvedAppearance.hair === "swept"
                  ? "M99 51 C113 35 132 32 147 41 M96 52 C112 42 130 40 148 48 M111 41 C124 32 138 32 147 38"
                  : resolvedAppearance.hair === "fade"
                    ? "M100 45 C112 35 126 33 142 39 M99 48 C114 40 130 39 146 46"
                    : "M100 49 C110 37 124 32 140 38 M97 53 C110 44 128 42 146 51 M108 41 C119 33 132 32 143 39"
              }
              fill="none"
              stroke={hairPalette.highlight}
              strokeOpacity="0.34"
              strokeLinecap="round"
              strokeWidth="1.35"
            />
            <g className="sound-fitness-avatar__expression">
              <path
                d={
                  resolvedAppearance.face === "focused"
                    ? "M104 57 C109 54 114 55 118 58 M126 58 C130 55 135 54 140 57"
                    : resolvedAppearance.face === "bright"
                      ? "M104 59 C109 55 114 55 118 57 M126 57 C131 55 136 55 140 59"
                      : resolvedAppearance.face === "defined"
                        ? "M103 57 C109 53 114 54 119 57 M125 57 C131 54 136 53 141 57"
                        : "M104 59 C109 56 114 56 118 58 M126 58 C131 56 136 56 140 59"
                }
                fill="none"
                stroke="rgba(15,23,42,0.78)"
                strokeLinecap="round"
                strokeWidth="2"
              />
              {isFemale ? (
                <path
                  d="M104 61 L101 59 M140 61 L143 59"
                  fill="none"
                  stroke="rgba(15,23,42,0.74)"
                  strokeLinecap="round"
                  strokeWidth="1.2"
                />
              ) : null}
              <ellipse
                className="sound-fitness-avatar__eye"
                cx="111"
                cy="65"
                fill="rgba(255,247,237,0.92)"
                rx="4.6"
                ry="3.5"
                stroke="rgba(15,23,42,0.32)"
                strokeWidth="0.8"
              />
              <ellipse
                className="sound-fitness-avatar__eye"
                cx="132"
                cy="65"
                fill="rgba(255,247,237,0.88)"
                rx="4.6"
                ry="3.5"
                stroke="rgba(15,23,42,0.32)"
                strokeWidth="0.8"
              />
              <circle className="sound-fitness-avatar__pupil" cx="112" cy="65.2" fill="rgba(2,6,23,0.94)" r="2" />
              <circle className="sound-fitness-avatar__pupil" cx="133" cy="65.2" fill="rgba(2,6,23,0.94)" r="2" />
              <path
                d={
                  resolvedAppearance.face === "focused"
                    ? "M115 78 C120 77 127 77 132 78"
                    : resolvedAppearance.face === "bright"
                      ? "M113 75 C119 82 129 82 135 75"
                      : resolvedAppearance.face === "defined"
                        ? "M114 77 C120 80 129 79 134 75"
                        : isFemale
                          ? "M114 76 C119 80 127 80 132 76"
                          : "M113 76 C119 81 128 81 134 76"
                }
                fill="none"
                stroke="rgba(88,28,14,0.78)"
                strokeLinecap="round"
                strokeWidth="2.2"
              />
              <path
                d="M122 67 C121 71 120 73 117 75"
                fill="none"
                stroke={skinPalette.outline}
                strokeLinecap="round"
                strokeOpacity="0.56"
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
                stroke={skinPalette.outline}
                strokeLinecap="round"
                strokeOpacity="0.26"
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

            {resolvedAppearance.gear === "headband" ? (
              <g className="sound-fitness-avatar__gear">
                <path
                  d="M96 54 C109 48 137 48 149 55"
                  fill="none"
                  stroke="#f8fafc"
                  strokeLinecap="round"
                  strokeWidth="6"
                />
                <path
                  d="M96 54 C109 48 137 48 149 55"
                  fill="none"
                  stroke={shirtPalette.logo}
                  strokeLinecap="round"
                  strokeWidth="3.8"
                />
              </g>
            ) : null}

            {resolvedAppearance.gear === "visor" ? (
              <g className="sound-fitness-avatar__gear">
                <path
                  d="M101 58 C111 54 135 54 143 59 L139 70 C129 74 112 73 103 69Z"
                  fill={shirtPalette.logo}
                  fillOpacity="0.28"
                  stroke={shirtPalette.logo}
                  strokeOpacity="0.92"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
                <path
                  d="M106 60 C116 57 132 57 139 60"
                  fill="none"
                  stroke="#f8fafc"
                  strokeLinecap="round"
                  strokeOpacity="0.64"
                  strokeWidth="1.2"
                />
              </g>
            ) : null}
          </g>
        </g>
      </svg>
    </div>
  );
}

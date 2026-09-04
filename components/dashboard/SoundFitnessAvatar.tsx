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
  | "neck"
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
  /** When set, only this region glows at full strength and every other
      region drops back — so stepping through a group's muscle list reads as
      that one muscle lighting up rather than the whole group. */
  bodyPartGlowFocus?: SoundFitnessAvatarGlowRegion | null;
  /** "whole" lights the selected body part as one continuous silhouette;
   *  "pieces" (default) lights its individual muscle regions. */
  bodyPartGlowMode?: "whole" | "pieces";
  showStageBackdrop?: boolean;
  /** Force the figure to face a given way. Without it the view follows the
      selected body part (only "back" turns it around) — but a posterior
      muscle inside a front-facing group (rear delt, external rotators)
      needs the figure turned to be visible at all. */
  viewOverride?: "front" | "back";
};

export type SoundFitnessAvatarGlowRegion =
  // "core" is the rectus column only — the obliques flank it in their own
  // region. The deltoid splits into its three heads (the cap is subdivided
  // the same way in both views: front+lateral facing forward, rear+lateral
  // from behind), and the rotator cuff is scapula-anchored, so its two
  // regions live on the torso rather than riding the arm rig.
  | "arms"
  | "back"
  | "chest"
  | "shoulders"
  | "core"
  | "frontDelt"
  | "lateralDelt"
  | "legs"
  | "lowerBack"
  | "lowerChest"
  | "midChest"
  | "adductors"
  | "biceps"
  | "calves"
  | "forearms"
  | "lats"
  | "glutes"
  | "hamstrings"
  | "obliques"
  | "quads"
  | "rearDelt"
  | "rhomboids"
  | "rotatorExternal"
  | "rotatorInternal"
  | "tibialis"
  | "traps"
  | "triceps"
  | "upperChest"
  | "abductors"
  | "hipRotators"
  | "neck";

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
  bodyPartGlowFocus,
  bodyPartGlowMode = "pieces",
  className = "",
  emotePreset,
  exerciseLabel,
  interactiveBodyParts = false,
  onBodyPartSelect,
  selectedBodyPart,
  showExerciseLabel = true,
  showStageBackdrop = true,
  viewOverride,
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
  // Regions other than the focused one stay faintly lit for context rather
  // than vanishing, so the body still reads as a whole.
  // In "whole" mode the per-muscle pieces go dark and the body part's single
  // silhouette carries the glow; in "pieces" mode it is the reverse, with a
  // focused muscle bright and its neighbours dimmed.
  const zoneOpacity = (region: SoundFitnessAvatarGlowRegion, base: number) =>
    bodyPartGlowMode === "whole"
      ? 0
      : !bodyPartGlowFocus || bodyPartGlowFocus === region
        ? base
        : base * 0.16;
  const wholeZoneOpacity = (base: number) =>
    bodyPartGlowMode === "whole" ? base : 0;
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
      data-avatar-view={
        viewOverride ?? (selectedBodyPart === "back" ? "back" : "front")
      }
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

        .sound-fitness-avatar__crest-glow {
          animation: sound-fitness-avatar-crest-glow 3.6s ease-in-out infinite;
        }

        /* Back view hides the chest print with opacity only, which does not
           stop descendant animations — without this guard five EQ bars keep
           ticking invisibly (the chest-core this replaced had the same rule). */
        .sound-fitness-avatar[data-avatar-view="back"] .sound-fitness-avatar__crest-glow {
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

        /* View-gated glow regions: posterior structures (rear delt, external
           rotators) exist only on the back view, anterior ones only on the
           front. The [data-active] rule above sets opacity through an
           ANIMATION, which outranks any ordinary declaration — so the hide
           has to be !important to win, and killing the animation with it
           stops a pulse nobody can see. */
        .sound-fitness-avatar:not([data-avatar-view="back"])
          .sound-fitness-avatar__zone-back-only,
        .sound-fitness-avatar[data-avatar-view="back"]
          .sound-fitness-avatar__zone-front-only {
          animation: none !important;
          opacity: 0 !important;
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

        @keyframes sound-fitness-avatar-crest-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.92; }
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
          .sound-fitness-avatar__crest-glow,
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
          {/* Soft aura behind the chest crest, in the colorway's accent so the
              print still changes with the shirt now that the crest itself is
              a fixed image. */}
          <radialGradient id={`${avatarId}-crest-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={shirtPalette.logo} stopOpacity="0.62" />
            <stop offset="55%" stopColor={shirtPalette.logo} stopOpacity="0.22" />
            <stop offset="100%" stopColor={shirtPalette.logo} stopOpacity="0" />
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
                  d="M110 301 C104 292 91 289 82 293 L78 298 C83 302 99 306 110 301Z"
                  fill={`url(#${avatarId}-shoe)`}
                  stroke="rgba(2,6,23,0.4)"
                  strokeLinejoin="round"
                  strokeWidth="1.2"
                />
                <path
                  d="M106 301 C100 294 88 294 82 297"
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
                  d="M88 292 C90 289 99 289 101 292 L103 302 C99 306 90 306 86 302Z"
                  fill={`url(#${avatarId}-shoe)`}
                  stroke="rgba(2,6,23,0.4)"
                  strokeLinejoin="round"
                  strokeWidth="1.2"
                />
                <path
                  d="M87 301 C92 304 97 304 102 301"
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
                  d="M130 301 C136 292 149 289 158 293 L162 298 C157 302 141 306 130 301Z"
                  fill={`url(#${avatarId}-shoe)`}
                  stroke="rgba(2,6,23,0.4)"
                  strokeLinejoin="round"
                  strokeWidth="1.2"
                />
                <path
                  d="M134 301 C140 294 152 294 158 297"
                  fill="none"
                  stroke={`url(#${avatarId}-sole)`}
                  strokeLinecap="round"
                  strokeWidth="4.5"
                />
              </g>
              <g className="sound-fitness-avatar__back-foot">
                <path
                  d="M139 292 C141 289 150 289 152 292 L154 302 C150 306 141 306 137 302Z"
                  fill={`url(#${avatarId}-shoe)`}
                  stroke="rgba(2,6,23,0.4)"
                  strokeLinejoin="round"
                  strokeWidth="1.2"
                />
                <path
                  d="M138 301 C143 304 148 304 153 301"
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
              fillOpacity={zoneOpacity("legs", 0.5)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow"
              d="M147 192 C142 187 133 187 129 192 C130 207 132 222 133 236 C134 255 137 275 139 291 C141 296 150 296 152 291 C152 275 151 255 150 236 C150 221 149 206 147 192Z"
              fill={zoneColor("legs")}
              fillOpacity={zoneOpacity("legs", 0.5)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            {/* Individual leg muscles, carved out of the same silhouette so
                scrolling the muscle list lights the specific one. Anterior
                and posterior heads are view-gated. */}
            {/* Whole-part silhouette: one continuous glow per leg, hip to
                ankle, shown while the category is browsed rather than a
                specific muscle. Both views. */}
            <path
              className="sound-fitness-avatar__body-zone-glow"
              d="M92 187 C98 183 108 183 113 188 C113 205 110 222 108 238 C107 254 105 270 103 285 C100 290 92 290 89 285 C88 270 88 254 89 238 C89 222 89 205 92 187Z"
              fill={zoneColor("legs")}
              fillOpacity={wholeZoneOpacity(0.5)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow"
              d="M148 187 C142 183 132 183 127 188 C127 205 130 222 132 238 C133 254 135 270 137 285 C140 290 148 290 151 285 C152 270 152 254 151 238 C151 222 151 205 148 187Z"
              fill={zoneColor("legs")}
              fillOpacity={wholeZoneOpacity(0.5)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-front-only"
              d="M93 191 C98 187 107 187 111 191 C110 206 108 221 107 235 C102 238 95 238 90 235 C91 220 91 205 93 191Z"
              fill={zoneColor("quads")}
              fillOpacity={zoneOpacity("quads", 0.52)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-front-only"
              d="M147 191 C142 187 133 187 129 191 C130 206 132 221 133 235 C138 238 145 238 150 235 C149 220 149 205 147 191Z"
              fill={zoneColor("quads")}
              fillOpacity={zoneOpacity("quads", 0.52)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-back-only"
              d="M93 191 C98 187 107 187 111 191 C110 207 108 222 107 237 C102 240 95 240 90 237 C91 221 91 206 93 191Z"
              fill={zoneColor("hamstrings")}
              fillOpacity={zoneOpacity("hamstrings", 0.52)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-back-only"
              d="M147 191 C142 187 133 187 129 191 C130 207 132 222 133 237 C138 240 145 240 150 237 C149 221 149 206 147 191Z"
              fill={zoneColor("hamstrings")}
              fillOpacity={zoneOpacity("hamstrings", 0.52)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-back-only"
              d="M92 190 C97 185 108 185 112 190 C111 199 110 208 109 214 C103 217 96 217 91 214 C91 206 91 198 92 190Z"
              fill={zoneColor("glutes")}
              fillOpacity={zoneOpacity("glutes", 0.54)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-back-only"
              d="M148 190 C143 185 132 185 128 190 C129 199 130 208 131 214 C137 217 144 217 149 214 C149 206 149 198 148 190Z"
              fill={zoneColor("glutes")}
              fillOpacity={zoneOpacity("glutes", 0.54)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-front-only"
              d="M105 194 C108 193 110 194 111 196 C110 210 109 222 108 232 C106 234 103 234 102 232 C103 219 104 206 105 194Z"
              fill={zoneColor("adductors")}
              fillOpacity={zoneOpacity("adductors", 0.54)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-front-only"
              d="M135 194 C132 193 130 194 129 196 C130 210 131 222 132 232 C134 234 137 234 138 232 C137 219 136 206 135 194Z"
              fill={zoneColor("adductors")}
              fillOpacity={zoneOpacity("adductors", 0.54)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            {/* Abductors: glute med / TFL on the outer hip, lateral enough to
                read from either side, so no view class. */}
            <path
              className="sound-fitness-avatar__body-zone-glow"
              d="M88 186 C93 184 98 186 100 191 C100 200 99 208 97 214 C93 216 89 215 87 211 C86 203 86 194 88 186Z"
              fill={zoneColor("abductors")}
              fillOpacity={zoneOpacity("abductors", 0.54)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow"
              d="M152 186 C147 184 142 186 140 191 C140 200 141 208 143 214 C147 216 151 215 153 211 C154 203 154 194 152 186Z"
              fill={zoneColor("abductors")}
              fillOpacity={zoneOpacity("abductors", 0.54)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            {/* Hip rotators: piriformis and the deep six sit under the glutes
                at the hip joint, so a small posterior band each side. */}
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-back-only"
              d="M96 197 C100 194 107 194 110 198 C110 204 107 208 102 208 C98 208 95 204 96 197Z"
              fill={zoneColor("hipRotators")}
              fillOpacity={zoneOpacity("hipRotators", 0.54)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-back-only"
              d="M144 197 C140 194 133 194 130 198 C130 204 133 208 138 208 C142 208 145 204 144 197Z"
              fill={zoneColor("hipRotators")}
              fillOpacity={zoneOpacity("hipRotators", 0.54)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-back-only"
              d="M90 240 C95 237 102 237 106 240 C105 254 104 268 102 282 C99 286 93 286 90 282 C89 268 89 254 90 240Z"
              fill={zoneColor("calves")}
              fillOpacity={zoneOpacity("calves", 0.54)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-back-only"
              d="M150 240 C145 237 138 237 134 240 C135 254 136 268 138 282 C141 286 147 286 150 282 C151 268 151 254 150 240Z"
              fill={zoneColor("calves")}
              fillOpacity={zoneOpacity("calves", 0.54)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-front-only"
              d="M92 242 C95 240 100 240 103 242 C102 256 101 269 100 281 C97 284 93 284 91 281 C91 268 91 255 92 242Z"
              fill={zoneColor("tibialis")}
              fillOpacity={zoneOpacity("tibialis", 0.54)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-front-only"
              d="M148 242 C145 240 140 240 137 242 C138 256 139 269 140 281 C143 284 147 284 149 281 C149 268 149 255 148 242Z"
              fill={zoneColor("tibialis")}
              fillOpacity={zoneOpacity("tibialis", 0.54)}
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
            {/* The shoulder zone used to live here, inside the arm rig — but
                the rig paints BEFORE the opaque sleeve panel and torso, so
                every delt glow was 100% occluded. It now sits at torso level
                beside the rotator cuff group. */}
            <g
              className="sound-fitness-avatar__body-zone"
              data-active={bodyPartGlowActive && selectedBodyPart === "arms"}
            >
              {/* Whole-arm glow rides the same centreline as the muscle
                  strokes so it follows the rig through every emote. */}
              <path
                className="sound-fitness-avatar__body-zone-glow"
                d="M92 114 C87 126 83 139 80 151"
                fill="none"
                filter={`url(#${avatarId}-zone-glow)`}
                stroke={zoneColor("arms")}
                strokeLinecap="round"
                strokeOpacity={wholeZoneOpacity(1)}
                strokeWidth={upperArmWidth + 3}
              />
              <path
                className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-front-only"
                d="M92 114 C87 126 83 139 80 151"
                fill="none"
                filter={`url(#${avatarId}-zone-glow)`}
                stroke={zoneColor("biceps")}
                strokeLinecap="round"
                strokeOpacity={zoneOpacity("biceps", 1)}
                strokeWidth={upperArmWidth + 3}
              />
              <path
                className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-back-only"
                d="M92 114 C87 126 83 139 80 151"
                fill="none"
                filter={`url(#${avatarId}-zone-glow)`}
                stroke={zoneColor("triceps")}
                strokeLinecap="round"
                strokeOpacity={zoneOpacity("triceps", 1)}
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
                  strokeOpacity={wholeZoneOpacity(1)}
                  strokeWidth={forearmWidth + 5}
                />
                <path
                  className="sound-fitness-avatar__body-zone-glow"
                  d="M79 151 C76 165 74 179 76 189"
                  fill="none"
                  filter={`url(#${avatarId}-zone-glow)`}
                  stroke={zoneColor("forearms")}
                  strokeLinecap="round"
                  strokeOpacity={zoneOpacity("forearms", 1)}
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
            {/* Right shoulder zone also relocated to torso level — see the
                note on the left side. */}
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
                strokeOpacity={wholeZoneOpacity(1)}
                strokeWidth={upperArmWidth + 3}
              />
              <path
                className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-front-only"
                d="M148 114 C153 126 157 139 160 151"
                fill="none"
                filter={`url(#${avatarId}-zone-glow)`}
                stroke={zoneColor("biceps")}
                strokeLinecap="round"
                strokeOpacity={zoneOpacity("biceps", 1)}
                strokeWidth={upperArmWidth + 3}
              />
              <path
                className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-back-only"
                d="M148 114 C153 126 157 139 160 151"
                fill="none"
                filter={`url(#${avatarId}-zone-glow)`}
                stroke={zoneColor("triceps")}
                strokeLinecap="round"
                strokeOpacity={zoneOpacity("triceps", 1)}
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
                  strokeOpacity={wholeZoneOpacity(1)}
                  strokeWidth={forearmWidth + 5}
                />
                <path
                  className="sound-fitness-avatar__body-zone-glow"
                  d="M161 151 C164 165 166 179 164 189"
                  fill="none"
                  filter={`url(#${avatarId}-zone-glow)`}
                  stroke={zoneColor("forearms")}
                  strokeLinecap="round"
                  strokeOpacity={zoneOpacity("forearms", 1)}
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
            pointerEvents="none"
          />
          <path
            d={
              isFemale
                ? "M76 114 C85 99 101 94 112 100 C105 113 96 126 84 134 C78 129 76 122 76 114Z"
                : "M72 113 C82 97 101 91 113 99 C105 113 96 126 82 134 C75 128 72 121 72 113Z"
            }
            fill={`url(#${avatarId}-shirt-side)`}
            pointerEvents="none"
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
            pointerEvents="none"
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
            // Garment paths paint over the body-part hit shapes; without this
            // the torso swallowed every shoulder/arm click (and most leg
            // clicks) because it is painted last and defaults to
            // pointer-events: visiblePainted.
            pointerEvents="none"
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
            pointerEvents="none"
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
            {/* Sound Fitness chest print: the crest over a breathing glow in
                the colorway's accent. aria-hidden because the svg itself joins
                the accessibility tree when body parts are interactive — without
                it, AT announces the print between the body-part buttons (even
                in back view, where it is only opacity-hidden). The glow is a
                separate element so only its opacity animates — cheap to
                composite, and nothing repaints the image every frame. */}
            <ellipse
              className="sound-fitness-avatar__crest-glow"
              cx="120.5"
              cy="133"
              fill={`url(#${avatarId}-crest-glow)`}
              rx="26.5"
              ry="27"
            />
            <image
              height="43.5"
              href="/sound-crest-avatar.png"
              preserveAspectRatio="xMidYMid meet"
              width="43.5"
              x="98.75"
              y="111.25"
            />
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
              d={isFemale ? "M120 106 L120 166" : "M120 106 L120 171"}
              fill="none"
              stroke="rgba(2,6,23,0.44)"
              strokeLinecap="round"
              strokeWidth="1.8"
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
            {/* Whole-part silhouette: the entire back from the nape to the
                waist as one glow, for browsing the Back category. */}
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-back-only"
              d="M104 97 C110 94 130 94 136 97 C140 101 143 108 146 118 C147 140 146 162 141 184 C128 190 112 190 99 184 C94 162 93 140 94 118 C97 108 100 101 104 97Z"
              fill={zoneColor("back")}
              fillOpacity={wholeZoneOpacity(0.5)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-back-only"
              d="M104 99 C110 96 130 96 136 99 C139 102 142 106 144 110 C138 114 131 117 126 120 L120 152 L114 120 C109 117 102 114 96 110 C98 106 101 102 104 99Z"
              fill={zoneColor("traps")}
              fillOpacity={zoneOpacity("traps", 0.44)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            {/* Lats sweep out to the axilla and down to the waist; the
                rhomboids sit between the blades, medial and higher. */}
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-back-only"
              d="M96 123 C94 136 94 150 99 161 C103 169 108 173 114 173 C116 160 115 145 111 133 C108 126 102 122 96 123Z"
              fill={zoneColor("lats")}
              fillOpacity={zoneOpacity("lats", 0.42)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-back-only"
              d="M144 123 C146 136 146 150 141 161 C137 169 132 173 126 173 C124 160 125 145 129 133 C132 126 138 122 144 123Z"
              fill={zoneColor("lats")}
              fillOpacity={zoneOpacity("lats", 0.42)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-back-only"
              d="M108 118 C114 115 126 115 132 118 C133 128 132 138 130 146 C124 149 116 149 110 146 C108 138 107 128 108 118Z"
              fill={zoneColor("rhomboids")}
              fillOpacity={zoneOpacity("rhomboids", 0.44)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-back-only"
              d="M108 146 C113 143 127 143 132 146 C135 158 135 170 134 182 C128 187 112 187 106 182 C105 170 105 158 108 146Z"
              fill={zoneColor("lowerBack")}
              fillOpacity={zoneOpacity("lowerBack", 0.4)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              {...bodyPartInteractionProps("back", "back")}
              className="sound-fitness-avatar__body-zone-hit"
              d="M101 112 C110 108 130 108 139 112 L141 130 C135 136 128 139 120 139 C112 139 105 136 99 130Z"
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
            {/* Whole-part silhouette: the full chest plate, collarbone to the
                lower pec line, as one glow for browsing the category. */}
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-front-only"
              d="M98 105 C105 100 114 102 120 108 C126 102 135 100 142 105 C143 120 141 137 136 150 C128 155 112 155 104 150 C99 137 97 120 98 105Z"
              fill={zoneColor("chest")}
              fillOpacity={wholeZoneOpacity(0.5)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-front-only"
              d="M98 106 C105 102 114 104 120 110 C126 104 135 102 142 106 C142 112 141 117 139 121 C128 116 112 116 101 121 C99 117 98 111 98 106Z"
              fill={zoneColor("upperChest")}
              fillOpacity={zoneOpacity("upperChest", 0.44)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-front-only"
              d="M100 124 C111 119 129 119 140 124 C140 129 139 133 137 136 C126 132 114 132 103 136 C101 133 100 128 100 124Z"
              fill={zoneColor("midChest")}
              fillOpacity={zoneOpacity("midChest", 0.42)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-front-only"
              d="M102 138 C113 135 127 135 138 138 C137 143 135 147 132 150 C125 148 115 148 108 150 C105 147 103 143 102 138Z"
              fill={zoneColor("lowerChest")}
              fillOpacity={zoneOpacity("lowerChest", 0.4)}
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
          {/* Deltoid heads — torso level, NOT inside the arm rig: the rig
              paints before the opaque sleeve panel and torso, so anything
              drawn there is fully occluded. The cap is split outboard/inboard;
              the outer slice is the lateral head (seen from either side) and
              the inner slice reads as the anterior head from the front. The
              posterior head sits ~5 units lower, since it originates on the
              scapular spine rather than the lateral clavicle. */}
          <g
            className="sound-fitness-avatar__body-zone"
            data-active={bodyPartGlowActive && selectedBodyPart === "shoulders"}
          >
            {/* Whole-part silhouettes: one cap over each shoulder joint,
                covering all three delt heads, for browsing the category. Both
                views, since the cap reads from either side. */}
            <path
              className="sound-fitness-avatar__body-zone-glow"
              d="M80 96 C86 91 97 91 104 98 C106 108 104 120 98 128 C90 130 82 126 80 116 C79 108 79 100 80 96Z"
              fill={zoneColor("shoulders")}
              fillOpacity={wholeZoneOpacity(0.5)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow"
              d="M160 96 C154 91 143 91 136 98 C134 108 136 120 142 128 C150 130 158 126 160 116 C161 108 161 100 160 96Z"
              fill={zoneColor("shoulders")}
              fillOpacity={wholeZoneOpacity(0.5)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow"
              d="M82 116 C83 105 87 97 93 96 C97 100 97 110 95 118 C90 125 82 124 82 116Z"
              fill={zoneColor("lateralDelt")}
              fillOpacity={zoneOpacity("lateralDelt", 0.45)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow"
              d="M158 116 C157 105 153 97 147 96 C143 100 143 110 145 118 C150 125 158 124 158 116Z"
              fill={zoneColor("lateralDelt")}
              fillOpacity={zoneOpacity("lateralDelt", 0.45)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-front-only"
              d="M94 96 C99 97 103 102 104 108 C104 116 100 122 95 124 C97 116 97 104 94 96Z"
              fill={zoneColor("frontDelt")}
              fillOpacity={zoneOpacity("frontDelt", 0.45)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-front-only"
              d="M146 96 C141 97 137 102 136 108 C136 116 140 122 145 124 C143 116 143 104 146 96Z"
              fill={zoneColor("frontDelt")}
              fillOpacity={zoneOpacity("frontDelt", 0.45)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-back-only"
              d="M94 101 C100 101 105 106 106 113 C106 120 102 126 96 128 C97 120 97 109 94 101Z"
              fill={zoneColor("rearDelt")}
              fillOpacity={zoneOpacity("rearDelt", 0.45)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-back-only"
              d="M146 101 C140 101 135 106 134 113 C134 120 138 126 144 128 C143 120 143 109 146 101Z"
              fill={zoneColor("rearDelt")}
              fillOpacity={zoneOpacity("rearDelt", 0.45)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              {...bodyPartInteractionProps("shoulders", "shoulders")}
              className="sound-fitness-avatar__body-zone-hit"
              d="M84 108 A11 11 0 1 0 106 108 A11 11 0 1 0 84 108"
              strokeWidth="6"
            />
            <path
              {...bodyPartInteractionProps("shoulders", "shoulders")}
              className="sound-fitness-avatar__body-zone-hit"
              d="M134 108 A11 11 0 1 0 156 108 A11 11 0 1 0 134 108"
              strokeWidth="6"
            />
          </g>
          {/* Rotator cuff. Anchored to the torso, not the arm rig, because
              the cuff runs off the scapula: external rotation (infraspinatus
              / teres minor) fills the infraspinous fossa, internal rotation
              (subscapularis) is deep to the blade, so its only honest
              front-view proxy is the tendon crossing the anterior joint
              line. Gated on the shoulders selection like the delts. */}
          <g
            className="sound-fitness-avatar__body-zone"
            data-active={bodyPartGlowActive && selectedBodyPart === "shoulders"}
          >
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-back-only"
              d="M99 120 C106 117 113 121 116 128 C114 136 106 140 99 136 C96 131 96 125 99 120Z"
              fill={zoneColor("rotatorExternal")}
              fillOpacity={zoneOpacity("rotatorExternal", 0.42)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-back-only"
              d="M141 120 C134 117 127 121 124 128 C126 136 134 140 141 136 C144 131 144 125 141 120Z"
              fill={zoneColor("rotatorExternal")}
              fillOpacity={zoneOpacity("rotatorExternal", 0.42)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-front-only"
              d="M97 108 C102 106 106 110 106 116 C105 122 100 124 96 120 C94 116 94 111 97 108Z"
              fill={zoneColor("rotatorInternal")}
              fillOpacity={zoneOpacity("rotatorInternal", 0.42)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow sound-fitness-avatar__zone-front-only"
              d="M143 108 C138 106 134 110 134 116 C135 122 140 124 144 120 C146 116 146 111 143 108Z"
              fill={zoneColor("rotatorInternal")}
              fillOpacity={zoneOpacity("rotatorInternal", 0.42)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
          </g>
          <g
            className="sound-fitness-avatar__body-zone"
            data-active={bodyPartGlowActive && selectedBodyPart === "core"}
          >
            {/* Rectus column down the middle with an oblique wedge on each
                flank — widest at the lower ribs, tapering into the hip —
                so trunk rotation work reads separately from anti-flexion. */}
            {/* Whole-part silhouette: rectus and both obliques as one trunk
                glow for browsing the Core category. */}
            <path
              className="sound-fitness-avatar__body-zone-glow"
              d="M100 138 C106 134 134 134 140 138 C142 152 141 170 136 187 C128 192 112 192 104 187 C99 170 98 152 100 138Z"
              fill={zoneColor("core")}
              fillOpacity={wholeZoneOpacity(0.5)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow"
              d="M110 140 C115 137 125 137 130 140 L128 184 C124 190 116 190 112 184Z"
              fill={zoneColor("core")}
              fillOpacity={zoneOpacity("core", 0.34)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow"
              d="M102 141 C99 149 98 159 99 170 C100 179 102 185 105 187 C108 184 109 178 109 171 L110 149 C108 143 106 140 102 141Z"
              fill={zoneColor("obliques")}
              fillOpacity={zoneOpacity("obliques", 0.34)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow"
              d="M138 141 C141 149 142 159 141 170 C140 179 138 185 135 187 C132 184 131 178 131 171 L130 149 C132 143 134 140 138 141Z"
              fill={zoneColor("obliques")}
              fillOpacity={zoneOpacity("obliques", 0.34)}
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

          <g
            className="sound-fitness-avatar__body-zone"
            data-active={bodyPartGlowActive && selectedBodyPart === "neck"}
          >
            {/* Neck: the column between jaw and collar. Flexors and SCM face
                front, extensors face back, so it shows in both views. Its own
                category, so its own group; the whole-part silhouette and the
                single muscle share the same outline. */}
            <path
              className="sound-fitness-avatar__body-zone-glow"
              d="M112 86 C116 84 124 84 128 86 C128 91 128 96 129 101 C123 103 117 103 111 101 C112 96 112 91 112 86Z"
              fill={zoneColor("neck")}
              fillOpacity={wholeZoneOpacity(0.5)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              className="sound-fitness-avatar__body-zone-glow"
              d="M112 86 C116 84 124 84 128 86 C128 91 128 96 129 101 C123 103 117 103 111 101 C112 96 112 91 112 86Z"
              fill={zoneColor("neck")}
              fillOpacity={zoneOpacity("neck", 0.54)}
              filter={`url(#${avatarId}-zone-glow)`}
            />
            <path
              {...bodyPartInteractionProps("neck", "neck")}
              className="sound-fitness-avatar__body-zone-hit"
              d="M110 85 C115 82 125 82 130 85 L131 102 C124 105 116 105 109 102Z"
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

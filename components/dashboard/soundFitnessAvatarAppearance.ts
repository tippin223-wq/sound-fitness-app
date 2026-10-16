// Sound Fitness avatar: appearance presets, palettes and body-part types.
// Shared by the 3D avatar (components/dashboard/SoundFitnessAvatar3D.tsx),
// the Avatar Lab in BodyCommandCenterCard.tsx and the lab's persistence.
// Every preset here maps onto a named material or mesh in
// public/models/sound-avatar.glb (or a procedural gear mesh), so adding an
// option is a matter of adding a palette entry.

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
  | "violet"
  | "storm"
  | "mint"
  | "gold";

export type SoundFitnessAvatarPantsPreset =
  | "graphite"
  | "navy"
  | "forest"
  | "maroon"
  | "onyx"
  | "sand";

export type SoundFitnessAvatarShoesPreset =
  | "volt"
  | "frost"
  | "ember"
  | "shadow"
  | "blaze"
  | "ice";

export type SoundFitnessAvatarSkinPreset =
  | "warm"
  | "golden"
  | "deep"
  | "cool"
  | "porcelain"
  | "olive";

export type SoundFitnessAvatarHairPreset =
  | "crop"
  | "swept"
  | "ponytail"
  | "bun"
  | "long"
  | "fade"
  | "buzz"
  | "bald";

export type SoundFitnessAvatarHairColorPreset =
  | "natural"
  | "ash"
  | "copper"
  | "jet"
  | "platinum";

export type SoundFitnessAvatarEyesPreset =
  | "amber"
  | "hazel"
  | "ocean"
  | "emerald"
  | "slate";

export type SoundFitnessAvatarFacePreset =
  | "relaxed"
  | "bright"
  | "focused"
  | "defined";

export type SoundFitnessAvatarGearPreset =
  | "none"
  | "headband"
  | "visor"
  | "wristbands"
  | "cap"
  | "shades"
  | "chain"
  | "kneeSleeves"
  | "belt"
  | "gloves";

export type SoundFitnessAvatarBodyPreset = "male" | "female";

export type SoundFitnessAvatarAppearance = {
  body: SoundFitnessAvatarBodyPreset;
  eyes: SoundFitnessAvatarEyesPreset;
  face: SoundFitnessAvatarFacePreset;
  gear: SoundFitnessAvatarGearPreset;
  hair: SoundFitnessAvatarHairPreset;
  hairColor: SoundFitnessAvatarHairColorPreset;
  pants: SoundFitnessAvatarPantsPreset;
  shirt: SoundFitnessAvatarShirtPreset;
  shoes: SoundFitnessAvatarShoesPreset;
  skin: SoundFitnessAvatarSkinPreset;
};

// The model ships with cyan wrist bands, so the default keeps them.
export const defaultSoundFitnessAvatarAppearance: SoundFitnessAvatarAppearance = {
  body: "male",
  eyes: "amber",
  face: "relaxed",
  gear: "wristbands",
  hair: "crop",
  hairColor: "natural",
  pants: "graphite",
  shirt: "sound",
  shoes: "volt",
  skin: "warm",
};

export type SoundFitnessAvatarBodyPart =
  | "arms"
  | "back"
  | "chest"
  | "core"
  | "legs"
  | "neck"
  | "shoulders";

export type SoundFitnessAvatarGlowRegion =
  // "core" is the rectus column only — the obliques flank it in their own
  // region. The deltoid splits into its three heads, and the rotator cuff is
  // scapula-anchored, so its two regions live on the torso.
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

// ---------------------------------------------------------------- palettes
// Hex strings; the 3D avatar feeds them to three.js Color, the lab uses them
// for swatches. `accent` is the emissive seam/crest/sole colour.

export type SoundFitnessAvatarShirtPalette = {
  accent: string;
  base: string;
  label: string;
  panel: string;
};

export const soundFitnessAvatarShirtPalettes: Record<
  SoundFitnessAvatarShirtPreset,
  SoundFitnessAvatarShirtPalette
> = {
  sound: { accent: "#67e8f9", base: "#0b1a2e", label: "Sound Tee", panel: "#12294a" },
  ocean: { accent: "#7dd3fc", base: "#1e3a8a", label: "Ocean Tee", panel: "#1d4ed8" },
  ember: { accent: "#fdba74", base: "#7c2d12", label: "Ember Tee", panel: "#9a3412" },
  violet: { accent: "#c4b5fd", base: "#4c1d95", label: "Violet Tee", panel: "#5b21b6" },
  storm: { accent: "#cbd5e1", base: "#1f2937", label: "Storm Tee", panel: "#334155" },
  mint: { accent: "#a7f3d0", base: "#064e3b", label: "Mint Tee", panel: "#047857" },
  gold: { accent: "#fde68a", base: "#3b2a06", label: "Gold Tee", panel: "#78500f" },
};

export const soundFitnessAvatarPantsPalettes: Record<
  SoundFitnessAvatarPantsPreset,
  { base: string; label: string; trim: string }
> = {
  graphite: { base: "#1f2937", label: "Graphite", trim: "#4b5563" },
  navy: { base: "#172554", label: "Navy", trim: "#1d4ed8" },
  forest: { base: "#064e3b", label: "Forest", trim: "#059669" },
  maroon: { base: "#4c0519", label: "Maroon", trim: "#be123c" },
  onyx: { base: "#05070d", label: "Onyx", trim: "#1e293b" },
  sand: { base: "#8a6a3a", label: "Sand", trim: "#d6b27a" },
};

export const soundFitnessAvatarShoesPalettes: Record<
  SoundFitnessAvatarShoesPreset,
  { base: string; label: string; sole: string }
> = {
  volt: { base: "#0b1220", label: "Volt", sole: "#67e8f9" },
  frost: { base: "#e2e8f0", label: "Frost", sole: "#94a3b8" },
  ember: { base: "#431407", label: "Ember", sole: "#fb923c" },
  shadow: { base: "#0f172a", label: "Shadow", sole: "#475569" },
  blaze: { base: "#7f1d1d", label: "Blaze", sole: "#fca5a5" },
  ice: { base: "#e0f2fe", label: "Ice", sole: "#38bdf8" },
};

export const soundFitnessAvatarSkinPalettes: Record<
  SoundFitnessAvatarSkinPreset,
  { base: string; cheek: string; highlight: string; label: string }
> = {
  warm: { base: "#c98b62", cheek: "#c9704a", highlight: "#e3a97f", label: "Warm" },
  golden: { base: "#c9894f", cheek: "#c96b3a", highlight: "#e6ad74", label: "Golden" },
  deep: { base: "#6b3a2a", cheek: "#7a3c30", highlight: "#8d5240", label: "Deep" },
  cool: { base: "#b98278", cheek: "#b46b66", highlight: "#d4a49b", label: "Cool" },
  porcelain: { base: "#efd2c1", cheek: "#e7a596", highlight: "#f8e5da", label: "Porcelain" },
  olive: { base: "#a8845c", cheek: "#a86d4e", highlight: "#c7a47a", label: "Olive" },
};

export const soundFitnessAvatarHairColorPalettes: Record<
  SoundFitnessAvatarHairColorPreset,
  { base: string; label: string; sheen: string }
> = {
  natural: { base: "#2a1a10", label: "Natural", sheen: "#5a3a22" },
  ash: { base: "#4b4a48", label: "Ash", sheen: "#8a8886" },
  copper: { base: "#7a3414", label: "Copper", sheen: "#c2622c" },
  jet: { base: "#07080c", label: "Jet", sheen: "#20242e" },
  platinum: { base: "#d9d2c2", label: "Platinum", sheen: "#f5efe0" },
};

export const soundFitnessAvatarEyesPalettes: Record<
  SoundFitnessAvatarEyesPreset,
  { iris: string; label: string }
> = {
  amber: { iris: "#7a4a1e", label: "Amber" },
  hazel: { iris: "#6b7a2a", label: "Hazel" },
  ocean: { iris: "#1d6fb8", label: "Ocean" },
  emerald: { iris: "#1c8a5a", label: "Emerald" },
  slate: { iris: "#5b6b7a", label: "Slate" },
};

export const soundFitnessAvatarHairStyles: Record<
  SoundFitnessAvatarHairPreset,
  { label: string }
> = {
  crop: { label: "Close Crop" },
  swept: { label: "Swept" },
  ponytail: { label: "Ponytail" },
  bun: { label: "Top Bun" },
  long: { label: "Long Flow" },
  fade: { label: "High Fade" },
  buzz: { label: "Buzz Cut" },
  bald: { label: "Clean Shave" },
};

export const soundFitnessAvatarFaces: Record<
  SoundFitnessAvatarFacePreset,
  { label: string }
> = {
  relaxed: { label: "Relaxed" },
  bright: { label: "Bright" },
  focused: { label: "Focused" },
  defined: { label: "Defined" },
};

export const soundFitnessAvatarGear: Record<
  SoundFitnessAvatarGearPreset,
  { label: string }
> = {
  none: { label: "No Gear" },
  wristbands: { label: "Wristbands" },
  headband: { label: "Headband" },
  visor: { label: "Training Visor" },
  cap: { label: "Team Cap" },
  shades: { label: "Sport Shades" },
  chain: { label: "Crest Chain" },
  kneeSleeves: { label: "Knee Sleeves" },
  belt: { label: "Lifting Belt" },
  gloves: { label: "Training Gloves" },
};

export const soundFitnessAvatarBodies: Record<
  SoundFitnessAvatarBodyPreset,
  { label: string }
> = {
  male: { label: "Male" },
  female: { label: "Female" },
};

export const soundFitnessAvatarEmotes: Record<
  SoundFitnessAvatarEmotePreset,
  { label: string }
> = {
  calm: { label: "Rest" },
  wave: { label: "Wave" },
  nod: { label: "Nod" },
  focus: { label: "Focus" },
  celebrate: { label: "Celebrate" },
  salute: { label: "Salute" },
  stretch: { label: "Stretch" },
};

// ---------------------------------------------------------------- validation
const optionIds = <T extends string>(record: Record<T, unknown>) =>
  Object.keys(record) as T[];

const pick = <T extends string>(
  record: Record<T, unknown>,
  value: unknown,
  fallback: T,
): T => (typeof value === "string" && value in record ? (value as T) : fallback);

/**
 * Every field validated against its option table, unknown values falling
 * back to the default: the lab stores this in localStorage, and a preset
 * that was renamed or removed must never reach the renderer.
 */
export function sanitizeSoundFitnessAvatarAppearance(
  value: unknown,
): SoundFitnessAvatarAppearance {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const d = defaultSoundFitnessAvatarAppearance;
  return {
    body: pick(soundFitnessAvatarBodies, source.body, d.body),
    eyes: pick(soundFitnessAvatarEyesPalettes, source.eyes, d.eyes),
    face: pick(soundFitnessAvatarFaces, source.face, d.face),
    gear: pick(soundFitnessAvatarGear, source.gear, d.gear),
    hair: pick(soundFitnessAvatarHairStyles, source.hair, d.hair),
    hairColor: pick(
      soundFitnessAvatarHairColorPalettes,
      source.hairColor,
      d.hairColor,
    ),
    pants: pick(soundFitnessAvatarPantsPalettes, source.pants, d.pants),
    shirt: pick(soundFitnessAvatarShirtPalettes, source.shirt, d.shirt),
    shoes: pick(soundFitnessAvatarShoesPalettes, source.shoes, d.shoes),
    skin: pick(soundFitnessAvatarSkinPalettes, source.skin, d.skin),
  };
}

export const soundFitnessAvatarEmoteIds = optionIds(soundFitnessAvatarEmotes);

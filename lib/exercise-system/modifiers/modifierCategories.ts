import type {
  ExerciseModifier,
  ExerciseModifierId,
  ModifierCategory,
  ModifierCategoryId,
} from "../types";

export const MODIFIER_CATEGORIES = [
  {
    id: "equipment",
    label: "Equipment",
    description:
      "External implement or loading source. BOSU and unstable surfaces are not equipment.",
    selectionMode: "single",
    displayOrder: 10,
  },
  {
    id: "grip",
    label: "Grip",
    description: "Hand, handle, or contact orientation.",
    selectionMode: "single",
    displayOrder: 20,
  },
  {
    id: "stance",
    label: "Stance",
    description: "Bilateral, unilateral, alternating, or offset stance strategy.",
    selectionMode: "single",
    displayOrder: 30,
  },
  {
    id: "loadPosition",
    label: "Load Position",
    description: "Where the resistance lives relative to the body.",
    selectionMode: "single",
    displayOrder: 40,
  },
  {
    id: "bodyPosition",
    label: "Body Position",
    description: "Body orientation, support, or setup position.",
    selectionMode: "single",
    displayOrder: 50,
  },
  {
    id: "structure",
    label: "Structure",
    description: "How multiple patterns are organized inside one movement.",
    selectionMode: "multi",
    displayOrder: 60,
  },
  {
    id: "direction",
    label: "Direction",
    description: "Directional emphasis such as rotational, vertical, or horizontal.",
    selectionMode: "single",
    displayOrder: 70,
  },
  {
    id: "angle",
    label: "Angle",
    description: "Bench, body, or implement angle.",
    selectionMode: "single",
    displayOrder: 80,
  },
  {
    id: "rom",
    label: "Range of Motion",
    description: "Range or endpoint constraint.",
    selectionMode: "single",
    displayOrder: 90,
  },
  {
    id: "tempo",
    label: "Tempo",
    description: "Rep speed, pause, or eccentric emphasis.",
    selectionMode: "single",
    displayOrder: 100,
  },
  {
    id: "stability",
    label: "Stability",
    description:
      "Surface and control challenge. BOSU, stability ball, pads, and reactive surfaces live here.",
    selectionMode: "single",
    displayOrder: 110,
  },
  {
    id: "athleticIntent",
    label: "Athletic Intent",
    description: "Power, plyometric, ballistic, sprint, throw, or carry emphasis.",
    selectionMode: "multi",
    displayOrder: 120,
  },
  {
    id: "movementIntent",
    label: "Movement Intent",
    description: "Training outcome or coaching emphasis.",
    selectionMode: "multi",
    displayOrder: 130,
  },
] satisfies ModifierCategory[];

const modifier = (
  categoryId: ModifierCategoryId,
  slug: string,
  label: string,
  displayOrder: number,
  options: Omit<
    ExerciseModifier,
    "id" | "categoryId" | "label" | "displayOrder"
  > = {},
): ExerciseModifier => ({
  id: `${categoryId}:${slug}`,
  categoryId,
  label,
  displayOrder,
  includeInGeneratedName: true,
  ...options,
});

export const EXERCISE_MODIFIERS = [
  modifier("equipment", "bodyweight", "Bodyweight", 10, {
    aliases: ["no equipment"],
  }),
  modifier("equipment", "dumbbell", "Dumbbell", 20),
  modifier("equipment", "kettlebell", "Kettlebell", 30),
  modifier("equipment", "barbell", "Barbell", 40),
  modifier("equipment", "trap-bar", "Trap Bar", 50),
  modifier("equipment", "cable", "Cable", 60),
  modifier("equipment", "machine", "Machine", 70),
  modifier("equipment", "band", "Band", 80),
  modifier("equipment", "medicine-ball", "Medicine Ball", 90),
  modifier("equipment", "box", "Box", 100),
  modifier("equipment", "sled", "Sled", 110),
  modifier("equipment", "pull-up-bar", "Pull-Up Bar", 120),
  modifier("equipment", "landmine", "Landmine", 130),
  modifier("equipment", "smith-machine", "Smith Machine", 140),
  modifier("equipment", "suspension", "Suspension Trainer", 150),
  modifier("equipment", "ab-wheel", "Ab Wheel", 160),

  modifier("grip", "close", "Close Grip", 10),
  modifier("grip", "neutral", "Neutral Grip", 20),
  modifier("grip", "overhand", "Overhand Grip", 30),
  modifier("grip", "underhand", "Underhand Grip", 40),
  modifier("grip", "wide", "Wide Grip", 50),

  modifier("stance", "bilateral", "Bilateral", 10),
  modifier("stance", "unilateral", "Unilateral", 20),
  modifier("stance", "alternating", "Alternating", 30),
  modifier("stance", "split-stance", "Split Stance", 40),
  modifier("stance", "staggered", "Staggered", 50),

  modifier("loadPosition", "goblet", "Goblet Load", 10),
  modifier("loadPosition", "front-loaded", "Front Loaded", 20),
  modifier("loadPosition", "back-loaded", "Back Loaded", 30),
  modifier("loadPosition", "offset-load", "Offset Load", 40),
  modifier("loadPosition", "suitcase", "Suitcase Load", 50),
  modifier("loadPosition", "rack", "Rack Position", 60),
  modifier("loadPosition", "overhead", "Overhead Load", 70),

  modifier("bodyPosition", "floor", "Floor", 10),
  modifier("bodyPosition", "incline", "Incline", 20),
  modifier("bodyPosition", "feet-elevated", "Feet Elevated", 30),
  modifier("bodyPosition", "lying", "Lying Position", 40),
  modifier("bodyPosition", "preacher", "Preacher Position", 50),
  modifier("bodyPosition", "plank", "Plank Position", 60),
  modifier("bodyPosition", "bent-over", "Bent Over", 70),
  modifier("bodyPosition", "standing", "Standing", 80),
  modifier("bodyPosition", "seated", "Seated", 90),
  modifier("bodyPosition", "half-kneeling", "Half-Kneeling", 100),
  modifier("bodyPosition", "rear-foot-elevated", "Rear Foot Elevated", 110),

  modifier("structure", "integrated", "Integrated", 10),
  modifier("structure", "floor-transfer", "Floor Transfer", 20),
  modifier("structure", "complex", "Complex", 30),

  modifier("direction", "rotational", "Rotational", 10),
  modifier("direction", "horizontal", "Horizontal", 20),
  modifier("direction", "vertical", "Vertical", 30),

  modifier("angle", "flat", "Flat", 10),
  modifier("angle", "incline", "Incline", 20),
  modifier("angle", "decline", "Decline", 30),

  modifier("rom", "full", "Full ROM", 10),
  modifier("rom", "partial", "Partial ROM", 20),
  modifier("rom", "deficit", "Deficit", 30),
  modifier("rom", "dead-stop", "Dead Stop", 40),

  modifier("tempo", "slow-eccentric", "Slow Eccentric", 10),
  modifier("tempo", "explosive", "Explosive", 20),
  modifier("tempo", "paused", "Paused", 30),
  modifier("tempo", "isometric", "Isometric", 40),

  modifier("stability", "stable", "Stable", 10, {
    includeInGeneratedName: false,
  }),
  modifier("stability", "unstable", "Unstable", 20),
  modifier("stability", "bosu", "BOSU", 30, {
    aliases: ["bosu ball"],
    semanticTags: ["unstable surface"],
  }),
  modifier("stability", "stability-ball", "Stability Ball", 40),
  modifier("stability", "stability-pad", "Stability Pad", 50),
  modifier("stability", "reactive-surface", "Reactive Surface", 60),
  modifier("stability", "shoulder-stability", "Shoulder Stability", 70),

  modifier("athleticIntent", "plyometric", "Plyometric", 10),
  modifier("athleticIntent", "ballistic", "Ballistic", 20),
  modifier("athleticIntent", "sprint", "Sprint", 30),
  modifier("athleticIntent", "throw", "Throw", 40),
  modifier("athleticIntent", "carry", "Carry", 50),
  modifier("athleticIntent", "crawl", "Crawl", 60),

  modifier("movementIntent", "strength", "Strength", 10),
  modifier("movementIntent", "hypertrophy", "Hypertrophy", 20),
  modifier("movementIntent", "power", "Power", 30),
  modifier("movementIntent", "rehab", "Rehab", 40),
  modifier("movementIntent", "mobility", "Mobility", 50),
  modifier("movementIntent", "conditioning", "Conditioning", 60),
  modifier("movementIntent", "stability", "Stability", 70),
] satisfies ExerciseModifier[];

export const MODIFIER_CATEGORY_BY_ID = Object.fromEntries(
  MODIFIER_CATEGORIES.map((category) => [category.id, category]),
) as unknown as Record<ModifierCategoryId, ModifierCategory>;

export const EXERCISE_MODIFIER_BY_ID = Object.fromEntries(
  EXERCISE_MODIFIERS.map((item) => [item.id, item]),
) as unknown as Record<ExerciseModifierId, ExerciseModifier>;

export const getModifiersByCategory = (categoryId: ModifierCategoryId) =>
  EXERCISE_MODIFIERS.filter((item) => item.categoryId === categoryId);

export const BOSU_STABILITY_MODIFIER_ID = "stability:bosu" as const;

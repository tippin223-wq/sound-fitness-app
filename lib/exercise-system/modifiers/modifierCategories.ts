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
    description: "Foot width or stance setup.",
    selectionMode: "single",
    displayOrder: 30,
  },
  {
    id: "executionStyle",
    label: "Execution Style",
    description: "How the movement is performed across limbs or sides.",
    selectionMode: "single",
    displayOrder: 35,
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
    description: "Surface challenge. BOSU is the only selectable stability modifier.",
    selectionMode: "single",
    displayOrder: 110,
  },
  {
    id: "assistanceResistance",
    label: "Assistance / Resistance",
    description: "Extra help, load, or resistance profile.",
    selectionMode: "multi",
    displayOrder: 115,
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
  modifier("equipment", "dumbbell", "Dumbbell", 20, {
    aliases: ["db", "dumbbells", "dumbell"],
  }),
  modifier("equipment", "kettlebell", "Kettlebell", 30, {
    aliases: ["kb", "kettle bell"],
  }),
  modifier("equipment", "barbell", "Barbell", 40, {
    aliases: ["bb"],
  }),
  modifier("equipment", "ez-bar", "EZ Bar", 45, {
    aliases: ["ez curl bar", "curl bar"],
  }),
  modifier("equipment", "trap-bar", "Trap Bar", 50),
  modifier("equipment", "safety-bar", "Safety Bar", 55, {
    aliases: ["safety squat bar", "ssb"],
  }),
  modifier("equipment", "cable", "Cable", 60),
  modifier("equipment", "machine", "Machine", 70),
  modifier("equipment", "band", "Band", 80),
  modifier("equipment", "medicine-ball", "Medicine Ball", 90),
  modifier("equipment", "slam-ball", "Slam Ball", 92, {
    aliases: ["dead ball"],
  }),
  modifier("equipment", "weight-plate", "Weight Plate", 95, {
    aliases: ["plate", "olympic plate", "iron plate", "bumper plate"],
  }),
  modifier("equipment", "sandbag", "Sandbag", 98, {
    aliases: ["sand bag"],
  }),
  modifier("equipment", "box", "Box", 100),
  modifier("equipment", "sled", "Sled", 110),
  modifier("equipment", "pull-up-bar", "Pull-Up Bar", 120),
  modifier("equipment", "landmine", "Landmine", 130),
  modifier("equipment", "smith-machine", "Smith Machine", 140, {
    aliases: ["smith"],
  }),
  modifier("equipment", "trx", "TRX", 150, {
    aliases: ["suspension trainer", "suspension training", "suspension"],
  }),
  modifier("equipment", "sliders", "Sliders", 160, {
    shortLabel: "Slider",
    aliases: ["slider", "glider", "gliders", "furniture slider", "furniture sliders"],
  }),
  modifier("equipment", "ab-wheel", "Ab Wheel", 170),

  modifier("grip", "close", "Close Grip", 10),
  modifier("grip", "neutral", "Neutral Grip", 20),
  modifier("grip", "overhand", "Overhand Grip", 30),
  modifier("grip", "underhand", "Underhand Grip", 40),
  modifier("grip", "wide", "Wide Grip", 50),

  modifier("stance", "narrow", "Narrow Stance", 40, {
    aliases: ["narrow", "narrow stance"],
  }),
  modifier("stance", "split-stance", "Split Stance", 60),
  modifier("stance", "staggered", "Staggered", 70),
  modifier("stance", "frog-stance", "Frog Stance", 80, {
    aliases: ["frog stance", "frog position"],
  }),

  modifier("executionStyle", "unilateral", "Unilateral", 20),
  modifier("executionStyle", "alternating", "Alternating", 30),

  modifier("loadPosition", "goblet", "Goblet", 10),
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
  modifier("bodyPosition", "supine", "Supine", 120),

  modifier("structure", "integrated", "Integrated", 10),
  modifier("structure", "floor-transfer", "Floor Transfer", 20),
  modifier("structure", "complex", "Complex", 30),

  modifier("direction", "rotational", "Rotational", 10),
  modifier("direction", "horizontal", "Horizontal", 20),
  modifier("direction", "vertical", "Vertical", 30),
  modifier("direction", "reverse", "Reverse", 40),
  modifier("direction", "forward", "Forward", 50),
  modifier("direction", "walking", "Walking", 60),
  modifier("direction", "lateral", "Lateral", 70),
  modifier("direction", "crossover", "Crossover", 80),

  modifier("angle", "flat", "Flat", 10),
  modifier("angle", "incline", "Incline", 20),
  modifier("angle", "decline", "Decline", 30),

  modifier("rom", "full", "Full ROM", 10, {
    aliases: ["extended rom", "complete range"],
    includeInGeneratedName: false,
  }),
  modifier("rom", "shortened-partial", "Shortened Partial", 30, {
    aliases: [
      "partial rom",
      "partial range",
      "top-half",
      "top half",
      "lockout partial",
      "partial near lockout",
      "shortened bias",
    ],
    semanticTags: ["partial reps near lockout", "top range partial"],
  }),
  modifier("rom", "lengthened-partial", "Lengthened Partial", 40, {
    aliases: [
      "partial rom",
      "partial range",
      "bottom-half",
      "bottom half",
      "stretch partial",
      "stretched partial",
      "partial near stretch",
      "lengthened bias",
    ],
    semanticTags: ["partial reps near stretch", "bottom range partial"],
  }),
  modifier("rom", "deficit", "Deficit", 50, {
    aliases: ["extended rom", "extended range"],
  }),
  modifier("rom", "dead-stop", "Dead Stop", 60),
  modifier("rom", "rom-limiter", "ROM Limiter", 70, {
    aliases: [
      "box rom",
      "box rom modifier",
      "limited rom",
      "limited range",
      "range limiter",
      "pins",
      "pin press",
      "blocks",
      "block pull",
      "boards",
      "board press",
      "rack pull",
      "safety bars",
      "depth limiter",
    ],
    semanticTags: ["external range constraint", "limited range of motion"],
  }),

  modifier("tempo", "slow-eccentric", "Slow Eccentric", 10),
  modifier("tempo", "explosive", "Explosive", 20),
  modifier("tempo", "paused", "Paused", 30),
  modifier("tempo", "isometric", "Isometric", 40),

  modifier("stability", "bosu", "BOSU", 30, {
    aliases: ["bosu ball"],
    semanticTags: ["unstable surface"],
  }),

  modifier("assistanceResistance", "assisted", "Assisted", 10),
  modifier("assistanceResistance", "chaotic", "Chaotic", 40, {
    aliases: [
      "chaos",
      "chaotic load",
      "oscillating load",
      "hanging plates",
      "hanging kettlebells",
      "band-suspended weight",
      "earthquake bar",
    ],
    semanticTags: ["load instability", "oscillating load"],
  }),
  modifier("assistanceResistance", "chains", "Chains", 50, {
    aliases: ["chain", "chains", "chain loaded", "chain resistance"],
    semanticTags: ["accommodating resistance", "variable resistance"],
  }),
  modifier("assistanceResistance", "variable-resistance", "Variable Resistance", 60),
  modifier("assistanceResistance", "contralateral", "Contralateral", 70),
  modifier("assistanceResistance", "ipsilateral", "Ipsilateral", 80),

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

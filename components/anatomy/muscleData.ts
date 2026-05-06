//region 🧠 SOUND FITNESS ADVANCED MUSCLE DATA MODEL

export type BodyView = "front" | "back";
export type BodyType = "male" | "female";
export type DetailLevel = "simple" | "advanced";

export type MuscleSide = "left" | "right" | "center" | "bilateral";

export type MuscleRegion =
  | "Chest"
  | "Shoulders"
  | "Arms"
  | "Forearms"
  | "Core"
  | "Back"
  | "Hips"
  | "Glutes"
  | "Legs"
  | "Calves"
  | "Neck";

export type MuscleId =
  | "upperChest"
  | "midChest"
  | "lowerChest"
  | "anteriorDelts"
  | "lateralDelts"
  | "biceps"
  | "brachialis"
  | "forearmsFront"
  | "upperAbs"
  | "lowerAbs"
  | "obliques"
  | "hipFlexors"
  | "adductors"
  | "quads"
  | "tibialisAnterior"
  | "traps"
  | "rearDelts"
  | "rhomboids"
  | "lats"
  | "spinalErectors"
  | "triceps"
  | "forearmsBack"
  | "gluteMax"
  | "gluteMed"
  | "hamstrings"
  | "calves";

export type MuscleDefinition = {
  id: MuscleId;
  label: string;
  shortLabel: string;
  region: MuscleRegion;
  view: BodyView;
  side: MuscleSide;
  simpleGroup: string;
  actions: string[];
  commonExercises: string[];
};

export const muscleDefinitions: MuscleDefinition[] = [
  {
    id: "upperChest",
    label: "Pectoralis Major — Clavicular Head",
    shortLabel: "Upper Chest",
    region: "Chest",
    view: "front",
    side: "bilateral",
    simpleGroup: "Chest",
    actions: ["Shoulder flexion", "Horizontal adduction"],
    commonExercises: ["Incline press", "Push-up", "Low-to-high cable fly"],
  },
  {
    id: "midChest",
    label: "Pectoralis Major — Sternal Fibers",
    shortLabel: "Mid Chest",
    region: "Chest",
    view: "front",
    side: "bilateral",
    simpleGroup: "Chest",
    actions: ["Horizontal adduction", "Pressing"],
    commonExercises: ["Bench press", "Push-up", "Chest fly"],
  },
  {
    id: "lowerChest",
    label: "Pectoralis Major — Lower Fibers",
    shortLabel: "Lower Chest",
    region: "Chest",
    view: "front",
    side: "bilateral",
    simpleGroup: "Chest",
    actions: ["Shoulder extension", "Adduction"],
    commonExercises: ["Decline press", "Dip", "High-to-low cable fly"],
  },
  {
    id: "anteriorDelts",
    label: "Anterior Deltoids",
    shortLabel: "Front Delts",
    region: "Shoulders",
    view: "front",
    side: "bilateral",
    simpleGroup: "Shoulders",
    actions: ["Shoulder flexion", "Pressing"],
    commonExercises: ["Overhead press", "Front raise", "Incline press"],
  },
  {
    id: "lateralDelts",
    label: "Lateral Deltoids",
    shortLabel: "Side Delts",
    region: "Shoulders",
    view: "front",
    side: "bilateral",
    simpleGroup: "Shoulders",
    actions: ["Shoulder abduction"],
    commonExercises: ["Lateral raise", "Upright row", "Overhead press"],
  },
  {
    id: "biceps",
    label: "Biceps Brachii",
    shortLabel: "Biceps",
    region: "Arms",
    view: "front",
    side: "bilateral",
    simpleGroup: "Arms",
    actions: ["Elbow flexion", "Supination"],
    commonExercises: ["Curl", "Chin-up", "Hammer curl"],
  },
  {
    id: "brachialis",
    label: "Brachialis",
    shortLabel: "Brachialis",
    region: "Arms",
    view: "front",
    side: "bilateral",
    simpleGroup: "Arms",
    actions: ["Elbow flexion"],
    commonExercises: ["Hammer curl", "Reverse curl"],
  },
  {
    id: "forearmsFront",
    label: "Anterior Forearm Flexors",
    shortLabel: "Forearms",
    region: "Forearms",
    view: "front",
    side: "bilateral",
    simpleGroup: "Forearms",
    actions: ["Grip", "Wrist flexion"],
    commonExercises: ["Farmer carry", "Deadlift", "Wrist curl"],
  },
  {
    id: "upperAbs",
    label: "Rectus Abdominis — Upper",
    shortLabel: "Upper Abs",
    region: "Core",
    view: "front",
    side: "center",
    simpleGroup: "Core",
    actions: ["Trunk flexion", "Anti-extension"],
    commonExercises: ["Crunch", "Dead bug", "Cable crunch"],
  },
  {
    id: "lowerAbs",
    label: "Rectus Abdominis — Lower",
    shortLabel: "Lower Abs",
    region: "Core",
    view: "front",
    side: "center",
    simpleGroup: "Core",
    actions: ["Posterior pelvic tilt", "Anti-extension"],
    commonExercises: ["Reverse crunch", "Hanging knee raise", "Dead bug"],
  },
  {
    id: "obliques",
    label: "Internal / External Obliques",
    shortLabel: "Obliques",
    region: "Core",
    view: "front",
    side: "bilateral",
    simpleGroup: "Core",
    actions: ["Rotation", "Anti-rotation", "Lateral flexion"],
    commonExercises: ["Pallof press", "Side plank", "Wood chop"],
  },
  {
    id: "hipFlexors",
    label: "Hip Flexors",
    shortLabel: "Hip Flexors",
    region: "Hips",
    view: "front",
    side: "bilateral",
    simpleGroup: "Hips",
    actions: ["Hip flexion"],
    commonExercises: ["March", "Hanging knee raise", "Step-up"],
  },
  {
    id: "adductors",
    label: "Hip Adductors",
    shortLabel: "Adductors",
    region: "Hips",
    view: "front",
    side: "bilateral",
    simpleGroup: "Hips",
    actions: ["Hip adduction", "Pelvic control"],
    commonExercises: ["Copenhagen plank", "Lateral lunge", "Sumo squat"],
  },
  {
    id: "quads",
    label: "Quadriceps",
    shortLabel: "Quads",
    region: "Legs",
    view: "front",
    side: "bilateral",
    simpleGroup: "Legs",
    actions: ["Knee extension", "Squatting"],
    commonExercises: ["Squat", "Split squat", "Leg extension"],
  },
  {
    id: "tibialisAnterior",
    label: "Tibialis Anterior",
    shortLabel: "Tibialis",
    region: "Calves",
    view: "front",
    side: "bilateral",
    simpleGroup: "Calves",
    actions: ["Dorsiflexion"],
    commonExercises: ["Tib raise", "Heel walk"],
  },
  {
    id: "traps",
    label: "Trapezius",
    shortLabel: "Traps",
    region: "Back",
    view: "back",
    side: "bilateral",
    simpleGroup: "Back",
    actions: ["Scapular elevation", "Retraction", "Upward rotation"],
    commonExercises: ["Shrug", "Row", "Farmer carry"],
  },
  {
    id: "rearDelts",
    label: "Posterior Deltoids",
    shortLabel: "Rear Delts",
    region: "Shoulders",
    view: "back",
    side: "bilateral",
    simpleGroup: "Shoulders",
    actions: ["Shoulder horizontal abduction", "External rotation support"],
    commonExercises: ["Rear delt fly", "Face pull", "Row"],
  },
  {
    id: "rhomboids",
    label: "Rhomboids",
    shortLabel: "Rhomboids",
    region: "Back",
    view: "back",
    side: "bilateral",
    simpleGroup: "Back",
    actions: ["Scapular retraction"],
    commonExercises: ["Row", "Face pull", "Band pull-apart"],
  },
  {
    id: "lats",
    label: "Latissimus Dorsi",
    shortLabel: "Lats",
    region: "Back",
    view: "back",
    side: "bilateral",
    simpleGroup: "Back",
    actions: ["Shoulder extension", "Adduction", "Pulling"],
    commonExercises: ["Lat pulldown", "Pull-up", "Row"],
  },
  {
    id: "spinalErectors",
    label: "Spinal Erectors",
    shortLabel: "Erectors",
    region: "Back",
    view: "back",
    side: "center",
    simpleGroup: "Back",
    actions: ["Spinal extension", "Anti-flexion"],
    commonExercises: ["Deadlift", "RDL", "Back extension"],
  },
  {
    id: "triceps",
    label: "Triceps Brachii",
    shortLabel: "Triceps",
    region: "Arms",
    view: "back",
    side: "bilateral",
    simpleGroup: "Arms",
    actions: ["Elbow extension", "Pressing"],
    commonExercises: ["Pushdown", "Dip", "Close-grip press"],
  },
  {
    id: "forearmsBack",
    label: "Posterior Forearm Extensors",
    shortLabel: "Forearms",
    region: "Forearms",
    view: "back",
    side: "bilateral",
    simpleGroup: "Forearms",
    actions: ["Grip", "Wrist extension"],
    commonExercises: ["Farmer carry", "Reverse curl", "Deadlift"],
  },
  {
    id: "gluteMax",
    label: "Gluteus Maximus",
    shortLabel: "Glute Max",
    region: "Glutes",
    view: "back",
    side: "bilateral",
    simpleGroup: "Glutes",
    actions: ["Hip extension", "Power production"],
    commonExercises: ["Hip thrust", "Squat", "Deadlift"],
  },
  {
    id: "gluteMed",
    label: "Gluteus Medius",
    shortLabel: "Glute Med",
    region: "Glutes",
    view: "back",
    side: "bilateral",
    simpleGroup: "Glutes",
    actions: ["Hip abduction", "Pelvic stability"],
    commonExercises: ["Lateral band walk", "Side plank", "Step-down"],
  },
  {
    id: "hamstrings",
    label: "Hamstrings",
    shortLabel: "Hamstrings",
    region: "Legs",
    view: "back",
    side: "bilateral",
    simpleGroup: "Legs",
    actions: ["Knee flexion", "Hip extension"],
    commonExercises: ["RDL", "Leg curl", "Deadlift"],
  },
  {
    id: "calves",
    label: "Gastrocnemius / Soleus",
    shortLabel: "Calves",
    region: "Calves",
    view: "back",
    side: "bilateral",
    simpleGroup: "Calves",
    actions: ["Plantarflexion"],
    commonExercises: ["Calf raise", "Jump rope", "Sled push"],
  },
];

export const defaultMuscleWorkload: Record<MuscleId, number> = {
  upperChest: 78,
  midChest: 82,
  lowerChest: 66,
  anteriorDelts: 74,
  lateralDelts: 68,
  biceps: 58,
  brachialis: 46,
  forearmsFront: 42,
  upperAbs: 54,
  lowerAbs: 44,
  obliques: 39,
  hipFlexors: 32,
  adductors: 28,
  quads: 52,
  tibialisAnterior: 22,
  traps: 63,
  rearDelts: 48,
  rhomboids: 51,
  lats: 55,
  spinalErectors: 46,
  triceps: 61,
  forearmsBack: 44,
  gluteMax: 38,
  gluteMed: 35,
  hamstrings: 34,
  calves: 31,
};

export function getMusclesByView(view: BodyView) {
  return muscleDefinitions.filter((muscle) => muscle.view === view);
}

export function getMuscleById(id: MuscleId) {
  return muscleDefinitions.find((muscle) => muscle.id === id);
}

//endregion

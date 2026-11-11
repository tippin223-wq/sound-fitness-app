export const trainingLocationIconBank = [
  { id: "building", label: "Building" },
  { id: "dumbbell", label: "Gym" },
  { id: "home", label: "Home" },
  { id: "trees", label: "Outdoors" },
  { id: "kettlebell", label: "Studio" },
  { id: "trophy", label: "Sports club" },
] as const;

export const trainingLocationColors = [
  { id: "cyan", label: "Cyan", color: "#67e8f9" },
  { id: "green", label: "Green", color: "#6ee7b7" },
  { id: "gold", label: "Gold", color: "#fcd34d" },
  { id: "purple", label: "Purple", color: "#c4b5fd" },
  { id: "rose", label: "Rose", color: "#fda4af" },
  { id: "blue", label: "Blue", color: "#93c5fd" },
] as const;

export type TrainingLocationAppearance = {
  icon?: typeof trainingLocationIconBank[number]["id"];
  color?: typeof trainingLocationColors[number]["id"];
};

export function resolveTrainingLocationAppearance(value?: TrainingLocationAppearance) {
  return {
    icon: trainingLocationIconBank.find(icon => icon.id === value?.icon)?.id,
    color: trainingLocationColors.find(color => color.id === value?.color)?.color || trainingLocationColors[0].color,
  };
}

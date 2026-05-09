import type { ProgressionNode } from "../types";

export const PROGRESSION_NODES = [
  {
    id: "push-up:incline",
    exerciseId: "incline-push-up",
    label: "Incline Push-Up",
    difficultyTier: "beginner",
    regressionIds: [],
    progressionIds: ["push-up:standard"],
  },
  {
    id: "push-up:standard",
    exerciseId: "push-up",
    label: "Push-Up",
    difficultyTier: "beginner",
    regressionIds: ["push-up:incline"],
    progressionIds: ["push-up:diamond", "push-up:decline"],
  },
  {
    id: "push-up:diamond",
    exerciseId: "diamond-push-up",
    label: "Diamond Push-Up",
    difficultyTier: "intermediate",
    regressionIds: ["push-up:standard"],
    progressionIds: [],
  },
  {
    id: "push-up:decline",
    exerciseId: "decline-push-up",
    label: "Decline Push-Up",
    difficultyTier: "intermediate",
    regressionIds: ["push-up:standard"],
    progressionIds: [],
  },
  {
    id: "hinge:rdl",
    exerciseId: "romanian-deadlift",
    label: "Romanian Deadlift",
    difficultyTier: "intermediate",
    regressionIds: [],
    progressionIds: ["hinge:deadlift", "hinge:swing"],
  },
  {
    id: "hinge:deadlift",
    exerciseId: "conventional-deadlift",
    label: "Conventional Deadlift",
    difficultyTier: "intermediate",
    regressionIds: ["hinge:rdl"],
    progressionIds: ["hinge:trap-bar", "hinge:swing"],
  },
  {
    id: "hinge:trap-bar",
    exerciseId: "trap-bar-deadlift",
    label: "Trap Bar Deadlift",
    difficultyTier: "beginner",
    regressionIds: ["hinge:rdl"],
    progressionIds: ["hinge:deadlift"],
  },
  {
    id: "hinge:swing",
    exerciseId: "kettlebell-swing",
    label: "Kettlebell Swing",
    difficultyTier: "intermediate",
    regressionIds: ["hinge:rdl"],
    progressionIds: [],
    notes: "Power progression after hinge mechanics are crisp.",
  },
  {
    id: "anti-rotation:pallof",
    exerciseId: "pallof-press",
    label: "Pallof Press",
    difficultyTier: "beginner",
    regressionIds: [],
    progressionIds: ["anti-rotation:renegade-row", "anti-rotation:suitcase"],
  },
  {
    id: "anti-rotation:renegade-row",
    exerciseId: "renegade-row",
    label: "Renegade Row",
    difficultyTier: "advanced",
    regressionIds: ["anti-rotation:pallof"],
    progressionIds: [],
  },
  {
    id: "anti-rotation:suitcase",
    exerciseId: "suitcase-carry",
    label: "Suitcase Carry",
    difficultyTier: "beginner",
    regressionIds: ["anti-rotation:pallof"],
    progressionIds: [],
  },
] satisfies ProgressionNode[];

export const PROGRESSION_NODE_BY_ID = Object.fromEntries(
  PROGRESSION_NODES.map((node) => [node.id, node]),
) as unknown as Record<string, ProgressionNode>;

export const getProgressionNode = (nodeId: string) =>
  PROGRESSION_NODE_BY_ID[nodeId] || null;

export const getProgressionsForExercise = (exerciseId: string) =>
  PROGRESSION_NODES.filter((node) => node.exerciseId === exerciseId);

export const getProgressionPath = (nodeId: string) => {
  const node = getProgressionNode(nodeId);
  if (!node) return [];

  const regressions = node.regressionIds
    .map(getProgressionNode)
    .filter(Boolean) as ProgressionNode[];
  const progressions = node.progressionIds
    .map(getProgressionNode)
    .filter(Boolean) as ProgressionNode[];

  return [...regressions, node, ...progressions];
};

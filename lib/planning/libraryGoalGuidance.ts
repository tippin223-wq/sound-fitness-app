import { normalizeGoalId, type GoalId } from "./goals";

type GoalGuidance = { emphasisLabel: string; goalCue: string };
/** Exhaustive canonical choices; library labels cannot create or change a saved goal. */
const guidance: Record<GoalId, GoalGuidance> = {
  "Build Muscle": { emphasisLabel: "Muscle training volume", goalCue: "Review recorded sets and muscle coverage alongside your saved plan." },
  "Lose Fat": { emphasisLabel: "Training consistency", goalCue: "Use your saved session and set targets to organize repeatable training." },
  Maintain: { emphasisLabel: "Maintain your routine", goalCue: "Keep your saved schedule visible and compare recorded activity across weeks." },
  Strength: { emphasisLabel: "Recorded load progression", goalCue: "Use recorded-unit load history and your saved progression settings." },
  "General Health": { emphasisLabel: "Consistent activity", goalCue: "Use your saved goals and availability to organize consistent activity." },
  Mobility: { emphasisLabel: "Mobility practice", goalCue: "Review selected mobility movements, practice frequency, and saved constraints." },
  Conditioning: { emphasisLabel: "Conditioning activity", goalCue: "Follow the conditioning movements and activity targets in your saved plan." },
  Recovery: { emphasisLabel: "Recovery planning", goalCue: "Use saved readiness observations and constraints when reviewing your plan." },
  Performance: { emphasisLabel: "Performance benchmarks", goalCue: "Use saved benchmarks and movement selections to track your plan." },
};

export function libraryGoalGuidance(value: unknown) {
  const goalId = normalizeGoalId(value);
  return goalId ? { goalId, ...guidance[goalId] } : { goalId: null, emphasisLabel: "Set goals first", goalCue: "Save a supported primary goal and weekly targets in Goals to connect training guidance." };
}

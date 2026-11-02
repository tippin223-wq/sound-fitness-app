export type ChallengeDefinition = { metric: string; target: number; label: string; href: string };
export type ChallengeMetric = { value: number | null; source: string; issue?: string };
export type ChallengeMetrics = Record<string, ChallengeMetric>;
const stages = ["Foundation", "Momentum", "Practice", "Rhythm", "Commitment", "Development", "Endurance", "Mastery", "Excellence", "Summit"];
const sessions = [1, 2, 4, 6, 9, 12, 16, 21, 27, 35];
const days = [1, 2, 4, 6, 9, 12, 16, 21, 27, 35];
const sets = [3, 8, 16, 28, 42, 60, 85, 115, 150, 200];
type Track = readonly [metric: string, label: string, targets: readonly number[], href: string];
const milestoneLabel = (label: string, target: number) => {
  const text = label.replace("{n}", String(target));
  return target === 1 ? text.replace(/\b(sessions|workouts|days|weeks|check-ins|lessons|checks|modules|activities|contributions|events)\b/g,
    word => word === "activities" ? "activity" : word.slice(0, -1)) : text;
};
const tracks: Record<string, readonly Track[]> = {
  strength: [
    ["strength.sessions", "Complete {n} strength sessions", sessions, "/dashboard/sessions"],
    ["strength.sets", "Log {n} strength sets", sets, "/dashboard/sessions/workout"],
    ["strength.reps", "Log {n} strength reps", [10,30,60,100,160,240,340,460,600,800], "/dashboard/sessions/workout"],
  ],
  cardio: [
    ["cardio.sessions", "Complete {n} cardio sessions", sessions, "/dashboard/sessions"],
    ["cardio.minutes", "Record {n} cardio minutes", [10,25,50,90,140,200,280,380,500,650], "/dashboard/sessions"],
    ["cardio.days", "Train cardio on {n} different days", days, "/dashboard/sessions"],
  ],
  mobility: [
    ["mobility.sessions", "Complete {n} mobility sessions", sessions, "/dashboard/sessions"],
    ["mobility.sets", "Log {n} mobility sets", sets, "/dashboard/sessions/workout"],
    ["mobility.days", "Practice mobility on {n} different days", days, "/dashboard/sessions"],
  ],
  recovery: [
    ["recovery.checks", "Save {n} weekly check-ins", sessions, "/dashboard/progress/check-in"],
    ["recovery.weeks", "Check in across {n} different weeks", [1,2,3,4,6,8,10,13,17,22], "/dashboard/progress/check-in"],
    ["recovery.notes", "Include recovery notes in {n} check-ins", [1,2,3,4,5,7,9,12,16,20], "/dashboard/progress/check-in"],
  ],
  consistency: [
    ["training.sessions", "Complete {n} logged workouts", sessions, "/dashboard/sessions"],
    ["training.days", "Train on {n} different days", days, "/dashboard/sessions"],
    ["training.weeks", "Train across {n} different weeks", [1,2,3,4,5,7,9,12,16,20], "/dashboard/sessions"],
  ],
  nutrition: [
    ["nutrition.meals", "Log meals on {n} different days", days, "/nutrition/meals"],
    ["nutrition.water", "Log water on {n} different days", days, "/nutrition/hydration"],
    ["nutrition.protein", "Record protein on {n} different days", days, "/nutrition/meals"],
  ],
  performance: [
    ["performance.sessions", "Complete {n} athletic training sessions", sessions, "/dashboard/sessions"],
    ["performance.sets", "Log {n} athletic movement sets", sets, "/dashboard/sessions/workout"],
    ["performance.days", "Practice athletic movements on {n} different days", days, "/dashboard/sessions"],
  ],
  learning: [
    ["learning.lessons", "Complete {n} training lessons", sessions, "/dashboard/education"],
    ["learning.quizzes", "Pass {n} knowledge checks", [1,2,3,4,6,8,10,13,17,22], "/dashboard/education"],
    ["learning.modules", "Finish {n} learning modules", [1,2,3,4,5,6,8,10,13,16], "/dashboard/education"],
  ],
  community: [
    ["community.activities", "Complete {n} community activities", sessions, "/dashboard/social"],
    ["community.contributions", "Share {n} community contributions", [1,2,3,5,7,10,14,19,25,32], "/dashboard/social"],
    ["community.events", "Participate in {n} group events", [1,2,3,4,5,6,8,10,13,16], "/dashboard/social"],
  ],
};
/** Increasing lifetime milestones, not per-session exercise prescriptions. */
export const challengeSets = Object.fromEntries(Object.entries(tracks).map(([category, items]) => [category,
  stages.map((name, index) => ({ name, challenges: items.map(([metric, label, targets, href]) => ({ metric, target: targets[index], label: milestoneLabel(label, targets[index]), href })) })),
])) as Record<string, { name: string; challenges: ChallengeDefinition[] }[]>;

export function currentChallengeSet(category: string, metrics: ChallengeMetrics) {
  const sets = challengeSets[category] ?? [];
  const done = (challenge: ChallengeDefinition) => {
    const metric = metrics[challenge.metric];
    return typeof metric?.value === "number" && Number.isFinite(metric.value) && !metric.issue && metric.value >= challenge.target;
  };
  const active = sets.findIndex(set => !set.challenges.every(done));
  const index = active < 0 ? Math.max(0, sets.length - 1) : active;
  return { index, finished: sets.length > 0 && active < 0, completed: index * 3 + (sets[index]?.challenges.filter(done).length ?? 0),
    name: sets[index]?.name ?? "", challenges: sets[index]?.challenges.map(challenge => {
      const metric = metrics[challenge.metric];
      const value = metric && !metric.issue && typeof metric.value === "number" && Number.isFinite(metric.value) && metric.value >= 0 ? metric.value : null;
      return { ...challenge, value, complete: done(challenge), source: metric?.source ?? "Tracking not connected yet", issue: metric?.issue,
        progress: value === null ? null : Math.min(100, value / challenge.target * 100) };
    }) ?? [] };
}

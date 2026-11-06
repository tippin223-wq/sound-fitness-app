export type ProgramActivity = {
  id: string; week: number; day: number; title: string;
  kind: "workout" | "recovery" | "technique" | "lesson" | "meal" | "hydration" | "review";
  points: number; prescription: string; signal: { title: string; action: string; evidence: string };
  exercises?: Array<{ name: string; sets: number; reps: string; restSeconds: number }>;
};
export type SharedProgram = {
  id: string; version: number; title: string; category: string; goal: string;
  weeks: number; sessionsPerWeek: number; totalLevels: number; pointsPerLevel: 100;
  status: "review" | "published"; audience: string; equipment: string[];
  progression: string[]; activities: ProgramActivity[];
  dietaryPreferences: string[]; exclusions: string[]; nutritionPolicy: string;
  sources: string[];
  rewards: Array<{ id: string; level: number; kind: "currency" | "cosmetic";
    asset: string; amount: number; name: string; fulfillment: "ready" | "design" }>;
};

import type { EntityId, EntityTimestamps, ISODateString } from "./common";
import type { ProfileId } from "./profile";

export type ExerciseId = EntityId;

export type ExercisePattern =
  | "squat"
  | "hinge"
  | "push"
  | "pull"
  | "core"
  | "carry"
  | "lunge"
  | "rotation"
  | "mobility"
  | "conditioning"
  | "other";

export type ExerciseGoal =
  | "strength"
  | "hypertrophy"
  | "stability"
  | "mobility"
  | "recovery"
  | "power"
  | "conditioning";

export type ExerciseLevel = "beginner" | "intermediate" | "advanced";

export type ExerciseSource = "system" | "custom" | "coach" | "imported";

export type ExerciseCatalogItem = {
  id: ExerciseId;
  name: string;
  body: string;
  muscles: string;
  pattern: string;
  goal: string;
  equipment: string;
  level: string;
  image: string;
  cue: string;
};

export type ExerciseRecord = EntityTimestamps & {
  id: ExerciseId;
  name: string;
  body_region: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  pattern: ExercisePattern;
  goal: ExerciseGoal;
  equipment: string;
  level: ExerciseLevel;
  image_url: string | null;
  video_url: string | null;
  cue: string | null;
  notes: string | null;
  source: ExerciseSource;
  created_by_profile_id: ProfileId | null;
  is_active: boolean;
};

export type CustomExercise = EntityTimestamps & {
  id: ExerciseId;
  profile_id: ProfileId;
  name: string;
  body: string;
  muscles: string;
  pattern: string;
  goal: string;
  equipment: string;
  level: string;
  image: string | null;
  cue: string | null;
  custom: true;
};

export type LocalCustomExercise = Omit<
  CustomExercise,
  "profile_id" | keyof EntityTimestamps
> & {
  image?: string;
};

export type ExerciseStatSource = "exercise-library" | "workout-session";

export type ExerciseStatEntry = EntityTimestamps & {
  id: EntityId;
  profile_id: ProfileId;
  exercise_id: ExerciseId;
  exercise_name: string;
  body: string | null;
  pattern: string | null;
  equipment: string | null;
  weight: number | null;
  reps: number | null;
  sets: number | null;
  performed_at: ISODateString;
  source: ExerciseStatSource;
  workout_log_id: EntityId | null;
};

export type LocalExerciseStatEntry = {
  exerciseId: ExerciseId;
  exerciseName: string;
  body?: string;
  pattern?: string;
  equipment?: string;
  weight: string;
  reps: string;
  sets: string;
  date: ISODateString;
  source?: ExerciseStatSource;
};

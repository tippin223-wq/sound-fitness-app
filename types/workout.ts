import type { EntityId, EntityTimestamps, ISODateString } from "./common";
import type { ExerciseId } from "./exercise";
import type { ProfileId } from "./profile";

export type WorkoutTemplateId = EntityId;
export type WorkoutLogId = EntityId;

export type TrainingPlanMode = "coach" | "custom" | "hybrid";
export type WorkoutVisibility = "private" | "coach" | "shared";
export type WorkoutTemplateStatus = "draft" | "active" | "archived";
export type WorkoutLogStatus = "planned" | "in_progress" | "completed";

export type WorkoutTemplateExercise = {
  id: EntityId;
  exercise_id: ExerciseId | null;
  exercise_name: string;
  order_index: number;
  section: string | null;
  target_sets: number | null;
  target_reps: string | null;
  target_rest_seconds: number | null;
  tempo: string | null;
  notes: string | null;
};

export type WorkoutTemplate = EntityTimestamps & {
  id: WorkoutTemplateId;
  owner_profile_id: ProfileId | null;
  title: string;
  goal: string | null;
  level: string | null;
  duration_minutes: number | null;
  visibility: WorkoutVisibility;
  status: WorkoutTemplateStatus;
  tags: string[];
  notes: string | null;
  exercises: WorkoutTemplateExercise[];
};

export type TrainingPlanDay = {
  day: string;
  workout_template_id: WorkoutTemplateId | null;
  workout_title: string;
  detail: string | null;
};

export type TrainingPlan = EntityTimestamps & {
  id: EntityId;
  profile_id: ProfileId;
  coach_profile_id: ProfileId | null;
  name: string;
  mode: TrainingPlanMode;
  goal: string | null;
  weekly_target: string | null;
  split: string | null;
  focus: string | null;
  active: boolean;
  week: TrainingPlanDay[];
};

export type WorkoutSetLog = {
  id: EntityId;
  exercise_id: ExerciseId | null;
  exercise_name: string;
  set_index: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  notes: string | null;
  completed: boolean;
};

export type WorkoutLog = EntityTimestamps & {
  id: WorkoutLogId;
  profile_id: ProfileId;
  coach_profile_id: ProfileId | null;
  template_id: WorkoutTemplateId | null;
  training_plan_id: EntityId | null;
  title: string;
  status: WorkoutLogStatus;
  started_at: ISODateString | null;
  completed_at: ISODateString | null;
  duration_minutes: number | null;
  readiness_score: number | null;
  session_notes: string | null;
  sets: WorkoutSetLog[];
};

export type LocalWorkoutTemplateSummary = {
  id?: EntityId | number;
  title: string;
  type?: string;
  goal?: string;
  level?: string;
  duration?: string;
  exercises?: number;
  favorite?: boolean;
  note?: string;
};

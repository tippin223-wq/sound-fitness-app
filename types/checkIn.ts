import type { EntityId, EntityTimestamps, ISODateString } from "./common";
import type { ProfileId } from "./profile";

export type CheckInType =
  | "onboarding"
  | "intake"
  | "daily"
  | "weekly"
  | "recovery";

export type CheckInRatingKey =
  | "readiness"
  | "energy"
  | "sleep"
  | "stress"
  | "soreness"
  | "pain"
  | "confidence";

export type CheckInRatings = Partial<Record<CheckInRatingKey, number>>;

export type CheckInHabit = {
  key: string;
  label: string;
  completed: boolean;
};

export type CheckInEntry = EntityTimestamps & {
  id: EntityId;
  profile_id: ProfileId;
  type: CheckInType;
  ratings: CheckInRatings;
  habits: CheckInHabit[];
  notes: string | null;
  completed_at: ISODateString;
};

export type OnboardingAssessment = EntityTimestamps & {
  id: EntityId;
  profile_id: ProfileId | null;
  first_name: string | null;
  age_range: string | null;
  goal: string | null;
  struggle: string | null;
  pain_area: string | null;
  pain_severity: string | null;
  experience: string | null;
  confidence: string | null;
  training_place: string | null;
  sessions_per_week: string | null;
  days_available: string | null;
  recommendation_title: string | null;
};

export type PainLogStatus = "new" | "improving" | "stable" | "watch" | "worse";

export type PainLog = EntityTimestamps & {
  id: EntityId;
  profile_id: ProfileId;
  area: string;
  level: number;
  status: PainLogStatus;
  notes: string | null;
  triggers: string | null;
  relievers: string | null;
  logged_at: ISODateString;
};

export type LocalPainAreaNote = {
  area: string;
  status: "Improving" | "Watch" | "Stable";
  note: string;
};

import type { EntityId, EntityTimestamps, ISODateString } from "./common";

export type ProfileId = EntityId;
export type ProfileRole = "member" | "coach" | "admin";
export type ProfileStatus = "active" | "invited" | "disabled";

export type Profile = EntityTimestamps & {
  id: ProfileId;
  role: ProfileRole;
  status: ProfileStatus;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  last_seen_at: ISODateString | null;
};

export type ProfileSummary = Pick<
  Profile,
  "id" | "role" | "status" | "email" | "full_name" | "phone"
>;

export type ClientBio = EntityTimestamps & {
  id: ProfileId;
  preferred_name: string | null;
  age: string | null;
  phone: string | null;
  emergency_contact: string | null;
  location: string | null;
  occupation: string | null;
  primary_goal: string | null;
  motivation: string | null;
  injuries: string | null;
  medications: string | null;
  training_experience: string | null;
  coaching_style: string | null;
  equipment: string | null;
  availability: string | null;
  nutrition_focus: string | null;
  sleep: string | null;
  stress: string | null;
  notes: string | null;
};

export type ClientBioDraft = Omit<ClientBio, keyof EntityTimestamps>;

import type { EntityId, EntityTimestamps, ISODateString } from "./common";
import type { ProfileId } from "./profile";

export type LeadId = EntityId;

export type LeadStatus =
  | "new"
  | "contacted"
  | "booked"
  | "trial_done"
  | "package_offered"
  | "closed"
  | "client"
  | "lost";

export type LeadSource =
  | "website"
  | "referral"
  | "social"
  | "nextdoor"
  | "google"
  | "email"
  | "manual"
  | "other";

export type Lead = EntityTimestamps & {
  id: LeadId;
  name: string;
  email: string | null;
  phone: string | null;
  source: LeadSource;
  source_label: string | null;
  address: string | null;
  city: string | null;
  status: LeadStatus;
  notes: string | null;
  lat: number | null;
  lon: number | null;
  estimated_value_cents: number | null;
  assigned_to_profile_id: ProfileId | null;
  converted_profile_id: ProfileId | null;
  next_follow_up_at: ISODateString | null;
};

export type LeadEventType =
  | "created"
  | "contacted"
  | "note"
  | "status_changed"
  | "appointment_booked"
  | "converted"
  | "lost";

export type LeadEvent = EntityTimestamps & {
  id: EntityId;
  lead_id: LeadId;
  actor_profile_id: ProfileId | null;
  type: LeadEventType;
  note: string | null;
  from_status: LeadStatus | null;
  to_status: LeadStatus | null;
};

export type FollowUp = EntityTimestamps & {
  id: EntityId;
  lead_id: LeadId | null;
  profile_id: ProfileId | null;
  assigned_to_profile_id: ProfileId | null;
  title: string;
  due_at: ISODateString;
  completed_at: ISODateString | null;
  notes: string | null;
};

export type LocalLeadMapLead = {
  id: LeadId;
  name: string;
  phone: string;
  source: string;
  address: string;
  city: string;
  status: "New" | "Contacted" | "Booked" | "Client" | "Lost";
  notes: string;
  lat?: number;
  lon?: number;
};

export type LocalPipelineLead = {
  name: string;
  stage:
    | "New Lead"
    | "Contacted"
    | "Intro Booked"
    | "Trial Done"
    | "Package Offered"
    | "Closed";
  value: string;
};

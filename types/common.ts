export type EntityId = string;
export type ISODateString = string;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type EntityTimestamps = {
  created_at: ISODateString;
  updated_at: ISODateString;
};

export type SyncSource = "seed" | "local_storage" | "supabase" | "manual";

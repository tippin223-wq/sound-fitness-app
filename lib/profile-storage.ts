import { planningAccountGeneration, planningOwner, planningKeys, planningRecordVersion, readPlanning, writePlanning } from "@/lib/planning/store";

export const SOUND_FITNESS_PROFILE_STORAGE_KEY = "soundFitnessProfile";
export const SOUND_FITNESS_PROFILE_UPDATED_EVENT = "soundFitnessProfileUpdated";
export const SOUND_PROFILE_UPDATED_EVENT = "sound-profile-updated";

const profileSubscribers = new Set<(profile: unknown) => void>();

export type SharedProfileSnapshot = {
  displayName: string;
  email: string;
  initials: string;
  memberStatus: string;
  profileImage: string;
  soundPoints: number;
  username: string;
};

type SnapshotOptions = {
  authAvatar?: string;
  authName?: string;
  current?: Partial<SharedProfileSnapshot>;
  email?: string;
  profileRecord?: unknown;
};

type ProfileDisplayAuthUser = {
  email?: string | null;
  user_metadata?: unknown;
};

export function safeJsonParse(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readString(...values: unknown[]) {
  const found = values.find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
  return typeof found === "string" ? found.trim() : "";
}

export function getProfileInitials(name: string, email = "") {
  const source = name.trim() || email.split("@")[0] || "Member";
  const words = source
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const initials =
    words.length >= 2 ? `${words[0][0]}${words[1][0]}` : source.slice(0, 2);
  return initials.toUpperCase();
}

export function getProfileDisplay(
  profileValue: unknown,
  authUser?: ProfileDisplayAuthUser | null,
) {
  const profile = asRecord(profileValue);
  const metadata = asRecord(authUser?.user_metadata);
  const email = readString(profile.email, authUser?.email);
  const name =
    readString(
      profile.displayName,
      profile.username,
      profile.fullName,
      profile.full_name,
      profile.handle,
      metadata.full_name,
      metadata.name,
    ) ||
    (email ? email.split("@")[0] : "Member");
  const avatarUrl = readString(
    profile.profileImage,
    profile.avatarUrl,
    profile.avatar_url,
    metadata.avatar_url,
  );

  return {
    avatarUrl,
    email,
    initials: getProfileInitials(name, email),
    name,
  };
}

function notifyProfileSubscribers(profile: unknown) {
  profileSubscribers.forEach((callback) => {
    try {
      callback(profile);
    } catch {
      // A bad listener must not block profile save or other subscribers.
    }
  });
}

export function subscribeToProfileStore(callback: (profile: unknown) => void) {
  profileSubscribers.add(callback);
  return () => profileSubscribers.delete(callback);
}

export function readSoundFitnessProfileRecord() {
  // Legacy browser data requires explicit import into the current account.
  return planningOwner() ? asRecord(readPlanning(planningKeys.profile, {})) : {};
}

export function readSoundFitnessProfile() {
  return readSoundFitnessProfileRecord();
}

export function readSoundFitnessPoints() {
  const value = readNumber(readSoundFitnessProfileRecord().soundPoints);
  return Math.max(0, Math.round(value ?? 0));
}

export function readSharedProfileSnapshot({
  authAvatar = "",
  authName = "",
  current,
  email = "",
  profileRecord,
}: SnapshotOptions = {}): SharedProfileSnapshot {
  const eventProfile = asRecord(profileRecord);
  const profile = Object.keys(eventProfile).length
    ? eventProfile
    : readSoundFitnessProfileRecord();
  const storedEmail = readString(profile.email);
  const safeEmail = email || storedEmail || current?.email || "";
  const username = readString(profile.username, profile.handle, current?.username);
  const displayName =
    readString(
      profile.displayName,
      profile.fullName,
      profile.full_name,
      username,
      authName,
      current?.displayName,
    ) ||
    (safeEmail ? safeEmail.split("@")[0] : "Member");
  const hasStoredProfileImage = Object.prototype.hasOwnProperty.call(
    profile,
    "profileImage",
  );
  // SUPABASE FIRST. authAvatar is user_metadata.avatar_url, which the
  // website writes when a member sets their account photo, so it is the
  // one value shared across devices and surfaces. It used to come last,
  // behind whatever this browser had cached, which meant a photo set
  // anywhere else was invisible here for as long as a local copy existed.
  // The local copies stay as the fallback for members who have not set one
  // remotely yet, and for offline reads.
  const profileImage =
    readString(authAvatar) ||
    (hasStoredProfileImage
      ? typeof profile.profileImage === "string"
        ? profile.profileImage
        : ""
      : readString(
          profile.avatarUrl,
          profile.avatar_url,
          current?.profileImage,
        ));
  const memberStatus = readString(
    profile.memberStatus,
    profile.memberType,
    current?.memberStatus,
  );

  return {
    displayName,
    email: safeEmail,
    initials: getProfileInitials(displayName, safeEmail),
    memberStatus,
    profileImage,
    soundPoints: readSoundFitnessPoints(),
    username,
  };
}

export function writeSoundFitnessProfile<T>(profile: T, expectedOwner: string | null, expectedVersion: string | undefined, expectedGeneration: number) {
  if (!expectedOwner) throw new Error("Profile data is still loading. Try again.");
  if (planningOwner() !== expectedOwner || planningAccountGeneration() !== expectedGeneration) throw new Error("Your account changed. Reload your profile before saving.");
  if (expectedVersion !== undefined && planningRecordVersion(planningKeys.profile) !== expectedVersion) throw new Error("Profile changed since you opened it. Your edits are still here. Copy them before reloading the saved profile.");
  // Storage must succeed before announcing the new profile to any UI.
  writePlanning(planningKeys.profile, profile);
  notifyProfileSubscribers(profile);
  return profile;
}

export function subscribeToProfileUpdates(callback: (event?: Event) => void) {
  if (typeof window === "undefined") return () => {};

  const unsubscribeStore = subscribeToProfileStore((profile) => {
    callback(new CustomEvent(SOUND_PROFILE_UPDATED_EVENT, { detail: profile }));
  });
  const handleStorage = (event: StorageEvent) => {
    if (
      !event.key ||
      event.key === SOUND_FITNESS_PROFILE_STORAGE_KEY ||
      event.key === "soundFitnessPoints"
    ) {
      callback(event);
    }
  };
  const handleEvent = (event: Event) => callback(event);

  window.addEventListener("storage", handleStorage);
  window.addEventListener("focus", handleEvent);
  window.addEventListener(SOUND_FITNESS_PROFILE_UPDATED_EVENT, handleEvent);
  window.addEventListener(SOUND_PROFILE_UPDATED_EVENT, handleEvent);

  return () => {
    unsubscribeStore();
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("focus", handleEvent);
    window.removeEventListener(SOUND_FITNESS_PROFILE_UPDATED_EVENT, handleEvent);
    window.removeEventListener(SOUND_PROFILE_UPDATED_EVENT, handleEvent);
  };
}

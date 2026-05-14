export const SOUND_FITNESS_PROFILE_STORAGE_KEY = "soundFitnessProfile";
export const SOUND_FITNESS_PROFILE_UPDATED_EVENT = "soundFitnessProfileUpdated";
export const SOUND_PROFILE_UPDATED_EVENT = "sound-profile-updated";

let inMemoryProfileFallback: unknown = null;
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
  const memory = asRecord(inMemoryProfileFallback);
  if (typeof window === "undefined") return memory;

  try {
    const stored = asRecord(
      safeJsonParse(window.localStorage.getItem(SOUND_FITNESS_PROFILE_STORAGE_KEY)),
    );
    return Object.keys(memory).length ? { ...stored, ...memory } : stored;
  } catch {
    return memory;
  }
}

export function readSoundFitnessProfile() {
  return readSoundFitnessProfileRecord();
}

export function readSoundFitnessPoints() {
  if (typeof window === "undefined") return 0;

  try {
    const direct = safeJsonParse(window.localStorage.getItem("soundFitnessPoints"));
    const directRecord = asRecord(direct);
    const profile = readSoundFitnessProfileRecord();
    const candidates = [
      readNumber(direct),
      readNumber(directRecord.points),
      readNumber(directRecord.total),
      readNumber(directRecord.available),
      readNumber(profile.soundPoints),
    ];
    return Math.max(0, Math.round(candidates.find((item) => item !== null) ?? 0));
  } catch {
    return 0;
  }
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
  const profileImage = hasStoredProfileImage
    ? typeof profile.profileImage === "string"
      ? profile.profileImage
      : ""
    : readString(profile.avatarUrl, profile.avatar_url, authAvatar, current?.profileImage);
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

export function writeSoundFitnessProfile<T>(profile: T) {
  inMemoryProfileFallback = profile;

  if (typeof window === "undefined") return profile;

  try {
    window.localStorage.setItem(
      SOUND_FITNESS_PROFILE_STORAGE_KEY,
      JSON.stringify(profile),
    );
  } catch {
    // localStorage can fail from private mode, quota limits, or large avatar data.
    // Keep the in-memory fallback so the current app session stays stable.
    const record = asRecord(profile);
    if (typeof record.profileImage === "string" && record.profileImage.length > 0) {
      try {
        window.localStorage.setItem(
          SOUND_FITNESS_PROFILE_STORAGE_KEY,
          JSON.stringify({ ...record, profileImage: "" }),
        );
      } catch {
        // If even the trimmed profile cannot persist, the event below still syncs UI.
      }
    }
  }

  try {
    const eventInit = { detail: profile };
    window.dispatchEvent(new CustomEvent(SOUND_FITNESS_PROFILE_UPDATED_EVENT, eventInit));
    window.dispatchEvent(new CustomEvent(SOUND_PROFILE_UPDATED_EVENT, eventInit));
  } catch {
    // Header sync is helpful, but it must never block profile rendering/saving.
  }

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

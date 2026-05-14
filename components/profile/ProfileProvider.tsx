"use client";

import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  asRecord,
  readSoundFitnessProfile,
  subscribeToProfileUpdates,
  writeSoundFitnessProfile,
} from "@/lib/profile-storage";

type ProfileRecord = Record<string, unknown>;

type ProfileContextValue = {
  profile: ProfileRecord;
  setProfile: Dispatch<SetStateAction<ProfileRecord>>;
  updateProfile: <T extends object>(nextProfile: T) => T;
};

const ProfileContext = createContext<ProfileContextValue>({
  profile: {},
  setProfile: () => {},
  updateProfile: (nextProfile) => nextProfile,
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<ProfileRecord>({});

  useEffect(() => {
    setProfile(readSoundFitnessProfile());

    return subscribeToProfileUpdates((event) => {
      const eventProfile =
        event && "detail" in event ? asRecord((event as CustomEvent<unknown>).detail) : {};

      setProfile(
        Object.keys(eventProfile).length ? eventProfile : readSoundFitnessProfile(),
      );
    });
  }, []);

  const updateProfile = useCallback(<T extends object>(nextProfile: T) => {
    setProfile(asRecord(nextProfile));
    writeSoundFitnessProfile(nextProfile);
    return nextProfile;
  }, []);

  const value = useMemo(
    () => ({
      profile,
      setProfile,
      updateProfile,
    }),
    [profile, updateProfile],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}

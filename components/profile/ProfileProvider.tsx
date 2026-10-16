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
import { planningOwner } from "@/lib/planning/store";
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
  updateProfile: <T extends object>(nextProfile: T, expectedVersion: string | undefined, expectedGeneration: number) => T;
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

    return subscribeToProfileUpdates(() => {
      setProfile(readSoundFitnessProfile());
    });
  }, []);

  const account = planningOwner();
  const updateProfile = useCallback(<T extends object>(nextProfile: T, expectedVersion: string | undefined, expectedGeneration: number) => {
    writeSoundFitnessProfile(nextProfile, account, expectedVersion, expectedGeneration);
    setProfile(asRecord(nextProfile));
    return nextProfile;
  }, [account]);

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

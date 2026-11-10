"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { planningAccountGeneration, planningOnlineSaveState, planningOwner, planningKeys, readPlanning, subscribePlanning, syncPlanning } from "@/lib/planning/store";

export default function ProfileCloudStatus({ hasUnsavedChanges = false }: { hasUnsavedChanges?: boolean }) {
  const [state, setState] = useState(planningOnlineSaveState);
  const [identityError, setIdentityError] = useState("");
  const [identitySaved, setIdentitySaved] = useState(false);
  const [retry, setRetry] = useState(0);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [initialVersion] = useState(() => state.pending ? null : JSON.stringify(readPlanning(planningKeys.profile, {})));
  const mirroredProfile = useRef<string | null>(initialVersion);
  const mirrorOwner = useRef(planningOwner());
  useEffect(() => subscribePlanning(() => { setIdentitySaved(false); setState(planningOnlineSaveState()); }), []);
  useEffect(() => {
    if (hasUnsavedChanges || state.pending || state.status !== "Synced") return;
    const account = planningOwner(), generation = planningAccountGeneration();
    if (!account || account === "local-preview") return;
    let live = true;
    const profile = readPlanning<Record<string, unknown>>(planningKeys.profile, {});
    const profileVersion = JSON.stringify(profile);
    if (mirrorOwner.current !== account) {
      mirrorOwner.current = account; mirroredProfile.current = profileVersion;
      setIdentityError(""); setIdentitySaved(true); return;
    }
    // Opening an old app tab must not overwrite a photo changed on the website.
    if (profileVersion === mirroredProfile.current && !identityError) { setIdentitySaved(true); return; }
    const data: Record<string, string | null> = {};
    if (typeof profile.displayName === "string" && profile.displayName.trim()) data.full_name = profile.displayName.trim();
    const photo = profile.profileImage;
    const avatarBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/`;
    if (typeof photo === "string" && (photo === "" || photo.startsWith(avatarBase))) { data.avatar_url = photo || null; data.sf_avatar_updated_at = typeof profile.updatedAt === "string" ? profile.updatedAt : new Date().toISOString(); }
    const syncIdentity = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || session.user.id !== account || generation !== planningAccountGeneration() || !live) return;
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
          method: "PUT", headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ data }),
        });
        if (!response.ok) throw new Error("Profile saved online. Website identity sync needs a retry.");
        if (live && generation === planningAccountGeneration()) { mirroredProfile.current = profileVersion; setIdentityError(""); setIdentitySaved(true); }
      } catch { if (live) setIdentityError("Profile saved online. Website identity sync needs a retry."); }
    };
    void syncIdentity();
    return () => { live = false; };
  }, [state, retry, hasUnsavedChanges]);
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    setAwaitingConfirmation(true);
    setShowConfirmation(false);
  }, [hasUnsavedChanges]);
  useEffect(() => {
    if (!awaitingConfirmation || hasUnsavedChanges || state.pending || state.status !== "Synced" || !identitySaved || identityError) return;
    setAwaitingConfirmation(false);
    setShowConfirmation(true);
  }, [awaitingConfirmation, hasUnsavedChanges, state, identitySaved, identityError]);
  useEffect(() => {
    if (!showConfirmation) return;
    const timer = window.setTimeout(() => setShowConfirmation(false), 3000);
    return () => window.clearTimeout(timer);
  }, [showConfirmation]);
  const saveProblem = /Retry|Not saved|Sync conflict|needs review/i.test(state.status);
  if (!awaitingConfirmation && !showConfirmation && !saveProblem && !identityError) return null;
  const text = planningOwner() === "local-preview" ? "Local preview · sign in to save online" : hasUnsavedChanges ? "Preparing online save…" : identityError || (saveProblem ? state.status : state.pending ? state.deviceCacheFull ? "Saving online — keep this page open" : "Saving profile online…" : state.status === "Synced" ? identitySaved ? "Saved online" : "Syncing website profile…" : state.status);
  return <div role="status" aria-live="polite" className="fixed bottom-5 left-1/2 z-[100020] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl border border-cyan-100/20 bg-slate-950/95 px-4 py-2 text-center text-sm text-cyan-100 shadow-lg">
    {showConfirmation && !saveProblem && !identityError && !hasUnsavedChanges ? "Changes saved" : text}
    {(identityError || state.status.includes("Retry") || state.status.startsWith("Not saved")) && <button type="button" className="ml-2 underline" onClick={() => { void syncPlanning(); setRetry(value => value + 1); }}>Retry save</button>}
  </div>;
}

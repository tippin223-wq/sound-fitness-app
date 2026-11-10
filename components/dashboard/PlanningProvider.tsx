"use client";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import loadingStyles from "./DashboardLoading.module.css";
import { syncPreloaderAura } from "./preloaderAura";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import { publishWeeklyRewards } from "@/lib/planning/weeklyRewardBalances";
import { initializePlanning, subscribePlanning, planningStatus, legacyAvailable, importLegacyPlanning, dismissLegacy, syncPlanning, resolvePlanningConflict, refreshPlanningFromStorage, planningAccountGeneration, exportPlanningBackup, planningOnlineSaveState } from "@/lib/planning/store";
import { readWorkoutBuilderTemplates } from "@/lib/localData/workoutBuilderData";
import { readPlanningLogs, planningLogUploadConfirmed } from "@/lib/planning/logs";
import { syncPendingPlanningWorkouts, syncPendingWorkoutTemplates } from "@/lib/data/workoutPersistence";
import { refreshBookedSessions, bookingRefreshStatus } from "@/lib/planning/bookings";
import { refreshCloudWorkoutHistory, resetCloudWorkoutHistory } from "@/lib/planning/cloudHistory";
import WorkoutTemplateConflicts from "./WorkoutTemplateConflicts";

export default function PlanningProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState(planningStatus);
  const [legacy, setLegacy] = useState(false);
  const [account, setAccount] = useState("");
  const [accountGeneration, setAccountGeneration] = useState<number | null>(null);
  const [pending, setPending] = useState(0);
  const [pendingTemplates, setPendingTemplates] = useState(0);
  const [templateError, setTemplateError] = useState("");
  const [startupError, setStartupError] = useState("");
  const [bookingStatus, setBookingStatus] = useState("");
  const [exportMessage, setExportMessage] = useState<{ account: string; generation: number | null; text: string } | null>(null);
  useEffect(() => {
    let live = true;
    let request = 0;
    publishWeeklyRewards(null, null);
    const refresh = async () => {
      if (!account || account === "local-preview") return;
      const ticket = ++request;
      try {
        const { data, error } = await supabase.rpc("member_reward_balances");
        if (live && ticket === request && !error) publishWeeklyRewards(account, data);
      } catch { /* Retain the last verified balance; retry on reconnect/focus. */ }
    };
    void refresh();
    const visible = () => { if (!document.hidden) void refresh(); };
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => {
      live = false; request++;
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [account]);
  const downloadPlanning = () => {
    try {
      const backup = exportPlanningBackup(account, new Date(), accountGeneration);
      const url = URL.createObjectURL(new Blob([backup], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = `sound-fitness-planning-${new Date().toISOString().slice(0, 10)}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportMessage({ account, generation: accountGeneration, text: "Planning backup prepared for download. It contains this device's current account planning records." });
    } catch (cause) { setExportMessage({ account, generation: accountGeneration, text: cause instanceof Error ? cause.message : "Planning export could not be created. Your saved records are preserved." }); }
  };
  useEffect(() => {
    let live = true;
    let sequence = 0;
    let current: string | null | undefined;
    const unsubscribe = subscribePlanning(() => { setStatus(planningStatus); setLegacy(legacyAvailable); setPending(readPlanningLogs().filter(log => !planningLogUploadConfirmed(log)).length); setBookingStatus(bookingRefreshStatus()); setPendingTemplates(readWorkoutBuilderTemplates().filter(template => template.syncPending).length); setTemplateError(readWorkoutBuilderTemplates().find(template => template.syncPending && template.syncError)?.syncError || ""); });
    const load = async (id: string | null) => {
      if (current === id) return;
      current = id;
      const request = ++sequence;
      setReady(false);
      if (!id) {
        setStartupError("Sign in to load your saved account.");
        router.replace("/login");
        return;
      }
      resetCloudWorkoutHistory();
      try { await initializePlanning(id); if (live && request === sequence) { void syncPendingPlanningWorkouts(); void syncPendingWorkoutTemplates(); void refreshBookedSessions(); void refreshCloudWorkoutHistory(); } }
      finally { if (live && request === sequence) { setAccount(id || "local-preview"); setAccountGeneration(planningAccountGeneration()); setReady(true); } }
    };
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) throw error;
      if (live && current === undefined) void load(data.session?.user.id || null);
    }).catch(() => { if (live) setStartupError("Your account could not be loaded. Check your connection and try again."); });
    const { data: auth } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer Supabase queries outside its auth callback lock.
      queueMicrotask(() => { if (live) void load(session?.user.id || null); });
    });
    const online = () => { void syncPlanning(); void syncPendingPlanningWorkouts(); void syncPendingWorkoutTemplates(); void refreshBookedSessions(); void refreshCloudWorkoutHistory(); };
    const focus = () => { void refreshBookedSessions(); void refreshCloudWorkoutHistory(); };
    window.addEventListener("online", online);
    window.addEventListener("focus", focus);
    window.addEventListener("storage", refreshPlanningFromStorage);
    return () => { live = false; unsubscribe(); auth.subscription.unsubscribe(); window.removeEventListener("online", online); window.removeEventListener("focus", focus); window.removeEventListener("storage", refreshPlanningFromStorage); };
  }, [router]);
  useEffect(() => {
    const protectPendingProfile = (event: BeforeUnloadEvent) => {
      const state = planningOnlineSaveState();
      if (state.deviceCacheFull && state.pending) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", protectPendingProfile);
    return () => window.removeEventListener("beforeunload", protectPendingProfile);
  }, []);
  if (!ready) return <div ref={syncPreloaderAura} className={loadingStyles.page}>
    <Image src="/sound-crest-avatar.png" alt="Sound Fitness" width={160} height={160} priority unoptimized className={loadingStyles.crest} />
    <p role="status" className={loadingStyles.label}>{startupError || "Getting your dashboard ready"}</p>
    {startupError && <button type="button" className="rounded-lg border border-cyan-200/40 px-4 py-2 text-sm" onClick={() => window.location.reload()}>Retry loading account</button>}
  </div>;
  return <>
    <div key={account}>{children}</div>
    {pathname !== "/dashboard/profile" && planningOnlineSaveState().deviceCacheFull && planningOnlineSaveState().pending && <div role="alert" className="fixed inset-x-3 bottom-3 z-[9999] rounded-xl bg-slate-950 p-3 text-sm text-amber-100">
      {status}. Keep this page open until saved online.
      <button type="button" className="ml-3 underline" onClick={() => void syncPlanning()}>Retry save</button>
      <button type="button" className="ml-3 underline" onClick={downloadPlanning}>Download backup</button>
    </div>}
    {pathname === "/dashboard/settings" && <details key={`planning-tools:${account}`} className="bg-slate-950 px-4 py-2 text-xs text-slate-300">
      <summary className="cursor-pointer">Data &amp; backups</summary>
      <div className="mt-3 flex flex-wrap items-center gap-3" role="status">
      <span>Goals & Plan: {status}</span>
      <button type="button" onClick={downloadPlanning}>Export planning backup</button>
      {exportMessage?.account === account && exportMessage.generation === accountGeneration && <span>{exportMessage.text}</span>}
      {bookingStatus.includes("unavailable") && <span>{bookingStatus}</span>}
      <button type="button" disabled={bookingStatus.startsWith("Refreshing")} onClick={() => void refreshBookedSessions()}>Refresh website bookings</button>
      {pending > 0 && <><span>{pending} workout{pending === 1 ? "" : "s"} saved · awaiting workout sync</span><button type="button" onClick={() => void syncPendingPlanningWorkouts()}>Retry workout sync</button><a href="/dashboard/sessions/history#pending-workout-uploads">Review pending uploads</a></>}
      {pendingTemplates > 0 && <><span>{pendingTemplates} saved template{pendingTemplates === 1 ? "" : "s"} awaiting sync</span><button type="button" onClick={() => void syncPendingWorkoutTemplates()}>Retry template sync</button></>}
      {templateError && <span>{templateError}</span>}
      {status.includes("Retry") && <button type="button" onClick={() => void syncPlanning()}>Retry sync</button>}
      {status.startsWith("Sync conflict") && <><button type="button" onClick={() => void resolvePlanningConflict(false)}>Use cloud copy</button><button type="button" onClick={() => void resolvePlanningConflict(true)}>Keep this device’s changes</button></>}
      {legacy && <><span>Older browser planning data found. Import only if it belongs to this account.</span><button type="button" onClick={importLegacyPlanning}>Import my browser data</button><button type="button" onClick={dismissLegacy}>Skip import</button></>}
      </div>
    </details>}
    <WorkoutTemplateConflicts key={`template-conflicts:${account}`} />
  </>;
}

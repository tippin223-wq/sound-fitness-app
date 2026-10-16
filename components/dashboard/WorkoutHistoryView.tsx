"use client";

import { useState, useSyncExternalStore } from "react";
import { planningOwner, planningAccountGeneration, planningSnapshot, subscribePlanning } from "@/lib/planning/store";
import { readAvailableWorkoutLogs, readPlanningLogs, planningLogUploadConfirmed, pendingWorkoutUploads, exportPendingWorkoutUploads } from "@/lib/planning/logs";
import { cloudHistorySnapshot, serverCloudHistory, workoutCompletionConflicts } from "@/lib/planning/availableLogs";
import { refreshCloudWorkoutHistory } from "@/lib/planning/cloudHistory";
import { workoutHistory, filterWorkoutHistory, exportWorkoutHistory, workoutEntryIssues, workoutRecordedValue, workoutRecordedLoad, workoutEntries, workoutEntriesIssue } from "@/lib/planning/history";
import { workoutSemanticReview } from "@/lib/planning/workoutSemanticReview";
import { workoutChronologyIssue } from "@/lib/planning/workoutChronology";
import { sessionReportLogs } from "@/lib/planning/sessionReporting";
import { activityTimestamp, localDate } from "@/lib/planning/dates";
import { captureWorkoutHistoryRecovery, exportWorkoutHistoryRecovery, captureWorkoutDateReview, exportWorkoutDateReview } from "@/lib/planning/workoutHistoryRecovery";

const clientReady = () => true;
const serverReady = () => false;
const subscribeReady = () => () => {};
const requestedSession = () => window.location.hash.slice(1);
const serverSession = () => "";
function subscribeSession(callback: () => void) {
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  return () => { window.removeEventListener("hashchange", callback); window.removeEventListener("popstate", callback); };
}
export default function WorkoutHistoryView({ latest = false }: { latest?: boolean }) {
  useSyncExternalStore(subscribePlanning, planningSnapshot, planningSnapshot);
  const cloud = useSyncExternalStore(subscribePlanning, cloudHistorySnapshot, serverCloudHistory);
  const ready = useSyncExternalStore(subscribeReady, clientReady, serverReady);
  const requested = useSyncExternalStore(subscribeSession, requestedSession, serverSession);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exportError, setExportError] = useState("");
  if (!ready) return <p role="status" className="p-6 text-slate-300">Loading saved workout history…</p>;
  const recovery = captureWorkoutHistoryRecovery();
  if (recovery.issues.length) return <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
    <section className="mx-auto max-w-3xl space-y-4 rounded-[28px] border border-amber-300/30 p-6" aria-label="Workout history recovery">
      <h1 className="text-3xl font-bold">Review saved workout history</h1>
      <p className="text-slate-300">Your original records remain saved. History totals and session selection are paused until these records can be reviewed.</p>
      <ul className="list-disc space-y-2 pl-5 text-amber-200">{recovery.issues.map(issue => <li key={issue}>{issue}</li>)}</ul>
      <p className="text-sm text-slate-400">This export includes the complete original workout collection for the current account. It does not repair, remove, or upload records.</p>
      <button type="button" className="text-sky-300" onClick={() => {
        try {
          const url = URL.createObjectURL(new Blob([exportWorkoutHistoryRecovery(recovery)], { type: "application/json" }));
          const link = document.createElement("a"); link.href = url; link.download = `sound-fitness-workout-recovery-${localDate(new Date())}.json`; link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000); setExportError("");
        } catch (cause) { setExportError(cause instanceof Error ? cause.message : "Export could not be created. Your original records remain saved."); }
      }}>Export original workout history as JSON</button>
      {exportError && <p role="alert" className="text-rose-300">{exportError}</p>}
      <details><summary className="cursor-pointer text-sky-300">Preview original records</summary>
        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs text-slate-300">{JSON.stringify(recovery.original, null, 2)?.slice(0, 12000)}</pre>
        <p className="mt-2 text-xs text-slate-400">Preview limited to 12,000 characters. Export includes the complete collection.</p>
      </details>
      <a href="/dashboard/my-plan" className="block text-sky-300">Open My Plan</a>
    </section>
  </main>;
  const dateReview = captureWorkoutDateReview();
  const availableLogs = readAvailableWorkoutLogs();
  const historyVersion = JSON.stringify(availableLogs);
  const history = workoutHistory(availableLogs);
  const account = planningOwner();
  const generation = planningAccountGeneration();
  const conflicts = workoutCompletionConflicts(readPlanningLogs(), cloud.logs);
  const conflictVersion = JSON.stringify(conflicts);
  const pending = pendingWorkoutUploads(readPlanningLogs());
  const pendingVersion = JSON.stringify(pending);
  let error = "";
  let visible = history;
  try { visible = latest ? requested ? history.filter(log => log.id === decodeURIComponent(requested)) : history.slice(0, 1) : filterWorkoutHistory(history, search, from, to); }
  catch (cause) { visible = []; error = cause instanceof Error ? cause.message : "Invalid filter."; }
  const month = localDate(new Date()).slice(0, 7);
  const durations = history.flatMap(log => log.durationMinutes == null ? [] : [log.durationMinutes]);
  const stats = [
    ["Saved Workouts", String(history.length)],
    ["This Month", String(history.filter(log => log.date.startsWith(month)).length)],
    ["Logged Sets", String(history.reduce((sum, log) => sum + log.loggedSets, 0))],
    ["Average Elapsed Time", durations.length ? `${Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)} min` : "Not recorded"],
  ];
  const download = () => {
    try {
      if (planningOwner() !== account || planningAccountGeneration() !== generation || JSON.stringify(readAvailableWorkoutLogs()) !== historyVersion)
        throw new Error("Workout history or account session changed. Review the current history before exporting.");
      const url = URL.createObjectURL(new Blob([exportWorkoutHistory(visible)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = `sound-fitness-workouts-${localDate(new Date())}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); setExportError("");
    } catch (cause) { setExportError(cause instanceof Error ? cause.message : "Export could not be created in this browser. Your history remains saved."); }
  };
  const downloadConflicts = () => {
    try {
      if (planningOwner() !== account || planningAccountGeneration() !== generation || JSON.stringify(workoutCompletionConflicts(readPlanningLogs(), cloudHistorySnapshot().logs)) !== conflictVersion)
        throw new Error("Workout records changed. Review the current versions before exporting.");
      const url = URL.createObjectURL(new Blob([JSON.stringify({ schemaVersion: 1, source: "Sound Fitness workout completion conflicts", conflicts }, null, 2)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = `sound-fitness-workout-conflicts-${localDate(new Date())}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); setExportError("");
    } catch (cause) { setExportError(cause instanceof Error ? cause.message : "Conflict export could not be created. Both versions remain saved."); }
  };
  const downloadPending = () => {
    try {
      if (planningOwner() !== account || planningAccountGeneration() !== generation || JSON.stringify(pendingWorkoutUploads(readPlanningLogs())) !== pendingVersion)
        throw new Error("Pending workouts changed. Review the current records before exporting.");
      const url = URL.createObjectURL(new Blob([exportPendingWorkoutUploads(pending)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = `sound-fitness-pending-workouts-${localDate(new Date())}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); setExportError("");
    } catch (cause) { setExportError(cause instanceof Error ? cause.message : "Pending workout export could not be created. Your records remain saved."); }
  };
  return <main className="min-h-screen bg-slate-950 px-5 py-8 text-white">
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6">
        <p className="text-xs uppercase tracking-widest text-sky-300">Sound Fitness</p>
        <h1 className="mt-3 text-4xl font-bold">{latest ? visible.length ? requested ? "Saved workout" : "Latest saved workout" : "No matching saved workout" : "Workout History"}</h1>
        <p className="mt-3 text-slate-300">Completed sessions from your saved planning records and loaded cloud workout history. Account sync status appears above.</p>
        <p role="status" className="mt-2 text-sm text-slate-400">{cloud.status}</p>
        <p className="mt-2 text-sm text-slate-400">Elapsed time uses recorded start/end timestamps and may include breaks. It is shown only when both were recorded.</p>
        <div className="mt-5 flex flex-wrap gap-4">
          <a href="/dashboard/my-plan" className="text-sky-300">Open My Plan</a>
          <a href="/dashboard/workout-builder" className="text-sky-300">Build a Workout</a>
          <a href="/dashboard/progress" className="text-sky-300">View Progress</a>
          <a href="/dashboard/progress/journal" className="text-sky-300">Write a Journal Entry</a>
          <button type="button" disabled={cloud.status.startsWith("Loading") || account === "local-preview"} onClick={() => void refreshCloudWorkoutHistory()} className="text-sky-300 disabled:text-slate-500">Refresh Cloud History</button>
          {latest && <a href="/dashboard/sessions/history" className="text-sky-300">All Workout History</a>}
          <button type="button" disabled={!visible.length || Boolean(error)} onClick={download} className="text-sky-300 disabled:text-slate-500">Export {latest ? "Session" : "Filtered History"} as JSON</button>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Workout history totals">
        {stats.map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 p-5"><h2 className="text-sm text-slate-400">{label}</h2><p className="mt-2 text-2xl font-bold">{value}</p></div>)}
      </section>
      {!latest && <section className="flex flex-wrap gap-4 rounded-2xl border border-white/10 p-5" aria-label="Filter workout history">
        <label className="flex flex-col gap-2">Search workouts or exercises<input value={search} onChange={event => setSearch(event.target.value)} type="search" className="rounded-xl bg-slate-800 p-3" /></label>
        <label className="flex flex-col gap-2">From<input type="date" value={from} onChange={event => setFrom(event.target.value)} className="rounded-xl bg-slate-800 p-3" /></label>
        <label className="flex flex-col gap-2">Through<input type="date" value={to} onChange={event => setTo(event.target.value)} className="rounded-xl bg-slate-800 p-3" /></label>
        <button type="button" onClick={() => { setSearch(""); setFrom(""); setTo(""); }}>Clear filters</button>
      </section>}
      {(error || exportError) && <p role="alert" className="text-rose-300">{error || exportError}</p>}
      {pending.length > 0 && <section id="pending-workout-uploads" className="space-y-4 rounded-2xl border border-amber-300/30 p-5" aria-label="Pending workout uploads">
        <h2 className="text-2xl font-bold">{pending.length} workout{pending.length === 1 ? "" : "s"} awaiting upload</h2>
        <p className="text-sm text-slate-300">These original account planning records have no confirmed workout upload. This queue is independent of History dates and filters, including records excluded from reporting. Use Retry workout sync above when connected; records with conflicts or invalid values need review.</p>
        <button type="button" onClick={downloadPending} className="text-sky-300">Export pending originals as JSON</button>
        {pending.map(log => <details key={log.id} className="rounded-xl border border-white/10 p-3">
          <summary className="cursor-pointer text-amber-200">{workoutRecordedValue(log.title)} · {log.syncError ? "Upload needs attention" : "Awaiting confirmation"}</summary>
          {log.syncError && <p className="mt-3 text-sm text-amber-200">{workoutRecordedValue(log.syncError)}</p>}
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs text-slate-300">{JSON.stringify(log, null, 2).slice(0, 12000)}</pre>
          <p className="mt-1 text-xs text-slate-400">Preview limited to 12,000 characters. Export includes the complete original record.</p>
        </details>)}
      </section>}
      {dateReview.excluded.length > 0 && <section aria-label="Workout dates need review" className="space-y-3 rounded-2xl border border-amber-300/30 p-5">
        <h2 className="text-2xl font-bold">Review saved workout dates</h2>
        <p className="text-sm text-amber-200">{dateReview.excluded.length} source record(s) have invalid or future completion dates. These records remain saved and are excluded from dated history totals and session selection.</p>
        <p className="text-sm text-slate-400">Export includes all original local and loaded cloud workout sources, including records outside the current filters. No dates are repaired or records removed.</p>
        <button type="button" className="text-sky-300" onClick={() => {
          try {
            const json = exportWorkoutDateReview(dateReview);
            const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
            const link = document.createElement("a"); link.href = url; link.download = "sound-fitness-workout-date-review.json"; link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000); setExportError("");
          } catch (cause) { setExportError(cause instanceof Error ? cause.message : "Export could not be created. Original workout sources remain saved."); }
        }}>Export original workout sources as JSON</button>
        <details><summary className="cursor-pointer text-sky-300">Preview records with dates to review</summary>
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs text-slate-300">{JSON.stringify(dateReview.excluded, null, 2).slice(0, 12000)}</pre>
          <p className="mt-2 text-xs text-slate-400">Preview limited to 12,000 characters. Export includes the complete original sources.</p>
        </details>
      </section>}
      {conflicts.length > 0 && <section className="space-y-4 rounded-2xl border border-amber-300/30 p-5" aria-label="Workout completion conflicts">
        <h2 className="text-2xl font-bold">Workout records need review</h2>
        <p className="text-sm text-amber-200">Workout versions disagree about their saved values or session and plan links. Both versions are preserved below. History and Progress count the saved planning version once; these additional cloud versions do not add to totals. Review and export the records before making a correction.</p>
        <p className="text-sm text-slate-400">This review covers loaded cloud records and is independent of the history filters. Refresh Cloud History to check for newer records.</p>
        <button type="button" onClick={downloadConflicts} className="text-sky-300">Export both versions as JSON</button>
        {conflicts.map((conflict, index) => <details key={`${conflict.assignmentId}:${conflict.planning.id}:${conflict.cloud.id}:${index}`} className="rounded-xl border border-white/10 p-3">
          <summary className="cursor-pointer text-amber-200">{conflict.kind === "identity" ? "Review workout identity and assignment links" : conflict.kind === "content" ? "Review different saved workout values" : `Review assignment ${conflict.assignmentId}`}</summary>
          {([['Saved planning version', conflict.planning], ['Loaded cloud version', conflict.cloud]] as const).map(([label, record]) => <div key={label} className="mt-3">
            <h3 className="font-semibold">{label}</h3>
            <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs text-slate-300">{JSON.stringify(record, null, 2).slice(0, 12000)}</pre>
            <p className="mt-1 text-xs text-slate-400">Preview limited to 12,000 characters. JSON export includes the full original record.</p>
          </div>)}
        </details>)}
      </section>}
      {!visible.length && !error && <p>{latest && requested ? "This session is unavailable in the current account's saved history. Open All Workout History or retry account sync above." : history.length ? "No workouts match these filters." : "Complete and save a workout to see its actual record here."}</p>}
      {visible.map(log => { const chronologyIssue = workoutChronologyIssue(workoutEntries(log), log.completedAt, { startedAt: log.startedAt }); const needsReview = sessionReportLogs([log]).length !== 1 || conflicts.some(conflict => conflict.planning.id === log.id || conflict.cloud.id === log.id); return <section key={log.id} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-2xl font-bold">{workoutRecordedValue(log.title)}</h2>
        <p className="mt-2 text-sm text-slate-300">{log.completedAt.includes("T") ? new Date(activityTimestamp(log.completedAt)).toLocaleString() : log.date} · {needsReview ? "Needs history review" : "Completed"} · {log.loggedSets} logged sets</p>
        <p className="mt-2 text-sm text-slate-400">Elapsed time: {log.durationMinutes == null ? "Not recorded" : `${log.durationMinutes} min`} · {planningLogUploadConfirmed(log) ? "Workout upload confirmed" : "Saved in account planning data"}</p>
        <p className="mt-2 break-all text-sm text-slate-400">Recorded start: {workoutRecordedValue(log.startedAt)} · Recorded finish: {workoutRecordedValue(log.completedAt)}</p>
        {chronologyIssue && <p role="status" className="mt-2 text-sm text-amber-300">Recorded times need review: {chronologyIssue}</p>}
        {!planningLogUploadConfirmed(log) && log.syncError && <p role="status" className="mt-2 text-sm text-amber-300">Upload needs attention: {workoutRecordedValue(log.syncError)}</p>}
        {workoutEntriesIssue(log) && <div className="mt-2 text-sm text-amber-300"><p>{workoutEntriesIssue(log)}</p><pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-all">{workoutRecordedValue(log.entries)}</pre></div>}
        {workoutEntries(log).some(entry => workoutEntryIssues(entry).length > 0) && <p className="mt-2 text-sm text-amber-300">Some saved exercise values need review below. Invalid set counts are excluded from totals. Original values remain saved and included in JSON exports.</p>}
        <details open={latest} className="mt-4">
          <summary className="cursor-pointer text-sky-300">Review {workoutEntries(log).length} readable exercise entries</summary>
          <div className="mt-3 space-y-3">{workoutEntries(log).map((entry, index) => { const semantic = workoutSemanticReview(entry); return <div key={`${entry?.exerciseId}:${index}`} className="rounded-xl border border-white/10 p-3">
            <h3 className="font-semibold">{workoutRecordedValue(entry?.exerciseName)}</h3>
            <p className="mt-1 break-all text-sm text-slate-300">Sets: {workoutRecordedValue(entry?.sets)} · Reps: {workoutRecordedValue(entry?.reps)} · Recorded load: {workoutRecordedLoad(entry)}</p>
            <p className="mt-1 break-all text-sm text-slate-400">Recorded activity time: {workoutRecordedValue(entry?.date)}</p>
            {semantic.details.length > 0 && <dl className="mt-2 space-y-1 break-all text-sm text-slate-300">{semantic.details.map(detail => <div key={detail.label}><dt className="inline font-semibold">{detail.label}: </dt><dd className="inline">{detail.value}</dd></div>)}</dl>}
            {semantic.issue && <p role="status" className="mt-2 text-sm text-amber-300">{semantic.issue}</p>}
            {workoutEntryIssues(entry).map(issue => <p key={issue.field} className="mt-1 text-sm text-amber-300">{issue.message}</p>)}
          </div>; })}</div>
        </details>
      </section>; })}
    </div>
  </main>;
}

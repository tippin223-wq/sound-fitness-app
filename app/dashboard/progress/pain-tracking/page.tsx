"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { planningAccountGeneration, planningOwner, planningSnapshot, subscribePlanning } from "@/lib/planning/store";
import { inspectPainRecords, painRecordsVersion, exportPainRecords, savePainLog, readPainDraft, painDraftVersion, savePainDraft, clearPainDraft, type PainDraft } from "@/lib/planning/painLogs";

export default function PainTrackingPage() {
  useSyncExternalStore(subscribePlanning, planningSnapshot, planningSnapshot);
  const records = inspectPainRecords(); const { logs } = records;
  const recordsVersion = painRecordsVersion();
  const [initial] = useState(() => records.draft);
  const [painLevel, setPainLevel] = useState<number | null>(initial?.level ?? null);
  const [area, setArea] = useState(initial?.area ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");
  const [status, setStatus] = useState(initial ? "Recovered unfinished report. Save Pain Log to add it to history." : "Changes are saved as a draft. Reports enter history only when you save the pain log.");
  const account = useRef(planningOwner());
  const generation = useRef(planningAccountGeneration());
  const reportId = useRef<string | null>(initial?.id ?? null);
  const draftVersion = useRef(painDraftVersion());
  const save = () => {
    try {
      reportId.current ||= crypto.randomUUID();
      savePainLog({ id: reportId.current, level: painLevel, area, notes }, account.current, generation.current, new Date(), draftVersion.current);
      draftVersion.current = painDraftVersion();
      reportId.current = null; setPainLevel(null); setArea(""); setNotes(""); setError("");
      setStatus("Report saved on this device. Account sync status appears above.");
    } catch (cause) { setStatus(""); setError(cause instanceof Error ? cause.message : "Could not save. Your report remains here."); }
  };
  const update = (patch: Partial<Omit<PainDraft, "id">>) => {
    const next = { level: painLevel, area, notes, ...patch };
    setPainLevel(next.level); setArea(next.area); setNotes(next.notes);
    try {
      reportId.current ||= crypto.randomUUID();
      draftVersion.current = savePainDraft({ id: reportId.current, ...next }, draftVersion.current, account.current, generation.current);
      setError(""); setStatus("Draft saved on this device. Account sync status appears above.");
    } catch (cause) { setStatus("These changes are only on this screen. Copy your report before leaving."); setError(cause instanceof Error ? cause.message : "Draft could not be saved."); }
  };
  const reload = (clear = false) => {
    try {
      if (account.current !== planningOwner()) throw new Error("Your account changed. Reload pain tracking first.");
      const current = inspectPainRecords();
      if (current.issue) throw new Error(current.issue);
      if (clear) clearPainDraft(draftVersion.current, account.current, generation.current);
      const draft = readPainDraft();
      generation.current = planningAccountGeneration();
      reportId.current = draft?.id ?? null; draftVersion.current = painDraftVersion();
      setPainLevel(draft?.level ?? null); setArea(draft?.area ?? ""); setNotes(draft?.notes ?? ""); setError("");
      setStatus(draft ? "Recovered unfinished report. Save Pain Log to add it to history." : "Draft is empty. Saved reports remain in history.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load the draft. Your answers remain here."); }
  };

  const exportRecords = () => {
    try {
      const json = exportPainRecords(recordsVersion, account.current, generation.current);
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      try { const link = document.createElement("a"); link.href = url; link.download = "sound-fitness-pain-reports.json"; link.click(); }
      finally { URL.revokeObjectURL(url); }
      setError(""); setStatus("Pain report originals exported. Saved answers are unchanged.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not export pain reports. Originals remain saved."); }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-8 text-white">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
            Pain Tracking
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Track discomfort before it becomes a setback.
          </h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Record your pain rating, body area, and notes for later review.
            Saving does not send a coach message or automatically change your plan.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-amber-300">
              New Pain Report
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              How does your body feel?
            </h2>

            <div className="mt-6 rounded-[28px] border border-white/10 bg-slate-950/60 p-6 text-center">
              <p className="text-4xl font-bold text-sky-300">{painLevel == null ? "Not reported" : `${painLevel}/10`}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2" role="group" aria-label="Pain rating">
                {Array.from({ length: 11 }, (_, level) => <button key={level} type="button" aria-label={`Pain: ${level} out of 10`} aria-pressed={painLevel === level} onClick={() => update({ level })} className={`rounded-xl border px-3 py-2 ${painLevel === level ? "border-sky-400 bg-sky-500 text-slate-950" : "border-white/10 text-slate-300"}`}>{level}</button>)}
              </div>

              <div className="mt-3 flex justify-between text-xs text-slate-500">
                <span>No pain</span>
                <span>Severe</span>
              </div>
            </div>
            <label className="mt-5 block text-sm text-slate-300" htmlFor="pain-area">Body area</label>
            <input id="pain-area" value={area} onChange={event => update({ area: event.target.value })} maxLength={80} placeholder="For example, left knee" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 p-3" />
            <button type="button" onClick={() => update({ area: "No specific area" })} className="mt-2 text-sm text-sky-300">No specific area</button>

            <textarea
              aria-label="Pain report notes"
              value={notes}
              onChange={event => update({ notes: event.target.value })}
              maxLength={4000}
              placeholder="Add notes: where, when, what made it better or worse..."
              className="mt-5 min-h-32 w-full rounded-[24px] border border-white/10 bg-slate-950/70 p-4 text-white outline-none focus:border-sky-400"
            />

            {records.issue && <p role="alert" className="mt-3 text-amber-200">{records.issue}</p>}
            <button type="button" onClick={exportRecords} className="mt-3 text-sm text-sky-300">Export pain report records</button>
            {error && <p role="alert" className="mt-3 text-rose-300">{error}</p>}
            {status && <p role="status" className="mt-3 text-slate-300">{status}</p>}
            <button disabled={Boolean(records.issue)} onClick={save} className="mt-4 w-full rounded-2xl bg-sky-500 px-5 py-4 font-bold text-slate-950 hover:bg-sky-400">
              Save Pain Log
            </button>
            <button type="button" disabled={Boolean(records.issue)} onClick={() => reload()} className="mt-3 block text-sm text-sky-300">Reload saved draft (replaces answers on this screen)</button>
            <button type="button" disabled={Boolean(records.issue)} onClick={() => reload(true)} className="mt-3 block text-sm text-slate-300">Clear draft and unsaved answers</button>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">
              Saved Reports
            </p>

            <h2 className="mt-3 text-2xl font-bold">Your reported history</h2>

            <div className="mt-5 space-y-3">
              {!records.issue && !logs.length && <p className="text-slate-300">No saved pain reports yet.</p>}
              {logs.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[24px] border border-white/10 bg-slate-950/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">{item.area}</h3>
                      <p className="mt-1 text-xs text-slate-400">{new Date(item.recordedAt).toLocaleString()}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-400">{item.notes || "No notes added."}</p>
                    </div>

                    <span
                      className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-sky-300"
                    >
                      {item.level}/10
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[28px] border border-sky-400/20 bg-sky-500/10 p-5">
              <h3 className="text-lg font-bold">Review with your coach</h3>
              <p className="mt-2 text-sm text-slate-200">
                These are your recorded reports. Use coach messaging when you want to share an update or ask about your training.
              </p>
              <a href="/dashboard/coach-messaging" className="mt-3 inline-block text-sky-300">Open Coach Messaging</a>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

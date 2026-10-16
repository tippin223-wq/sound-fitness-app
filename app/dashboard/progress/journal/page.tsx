"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { planningAccountGeneration, planningOwner, planningSnapshot, subscribePlanning } from "@/lib/planning/store";
import { inspectJournalRecords, journalRecordsVersion, exportJournalRecords, journalDraftVersion, saveJournalDraft, saveJournalEntry } from "@/lib/planning/journal";

export default function JournalPage() {
  useSyncExternalStore(subscribePlanning, planningSnapshot, planningSnapshot);
  const records = inspectJournalRecords(); const { entries } = records;
  const recordsVersion = journalRecordsVersion();
  const [entry, setEntry] = useState(() => records.draft?.text || "");
  const [error, setError] = useState("");
  const [status, setStatus] = useState(() => records.draft ? "Saved draft restored." : "");
  const account = useRef(planningOwner());
  const generation = useRef(planningAccountGeneration());
  const draftId = useRef(records.draft?.id || crypto.randomUUID());
  const draftVersion = useRef(journalDraftVersion());
  const updateEntry = (text: string) => {
    setEntry(text);
    try {
      draftVersion.current = saveJournalDraft({ id: draftId.current, text }, draftVersion.current, account.current, generation.current);
      setStatus("Draft saved on this device; account sync status appears above."); setError("");
    } catch (cause) { setStatus(""); setError(cause instanceof Error ? cause.message : "Draft is in this tab only. Storage is unavailable."); }
  };
  const save = () => {
    try {
      saveJournalEntry({ id: draftId.current, text: entry }, draftVersion.current, account.current, generation.current);
      setEntry(""); draftVersion.current = journalDraftVersion(); draftId.current = crypto.randomUUID();
      setError(""); setStatus("Entry saved on this device; account sync status appears above.");
    } catch (cause) { setStatus(""); setError(cause instanceof Error ? cause.message : "Entry could not be saved. Your text remains here."); }
  };
  const reloadDraft = () => {
    if (account.current !== planningOwner()) { setStatus(""); setError("Your account changed. Reload the page before loading the journal."); return; }
    const current = inspectJournalRecords();
    if (current.issue) { setStatus(""); setError(current.issue); return; }
    generation.current = planningAccountGeneration();
    const draft = current.draft; setEntry(draft?.text || ""); draftId.current = draft?.id || crypto.randomUUID(); draftVersion.current = journalDraftVersion(); setError(""); setStatus("Saved draft loaded.");
  };

  const exportRecords = () => {
    try {
      const json = exportJournalRecords(recordsVersion, account.current, generation.current);
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      try { const link = document.createElement("a"); link.href = url; link.download = "sound-fitness-journal.json"; link.click(); }
      finally { URL.revokeObjectURL(url); }
      setError(""); setStatus("Journal originals exported. Saved text is unchanged.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not export journal records. Original text remains saved."); }
  };

  const prompts = [
    "How did your workout feel?",
    "What improved today?",
    "Any pain or tightness?",
    "Energy level (1–10)?",
    "Biggest win today?",
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-8 text-white">
      <section className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        {/* LEFT SIDE */}
        <div className="space-y-6">
          <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
              Training Journal
            </p>

            <h1 className="mt-3 text-4xl font-bold">
              Capture what actually happened.
            </h1>

            <p className="mt-3 text-slate-300">
              Progress isn’t just numbers. Track how you felt, what improved,
              and what needs attention.
            </p>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">
              Quick Prompts
            </p>

            <div className="mt-5 space-y-3">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => updateEntry(entry ? `${entry}\n\n${prompt} ` : `${prompt} `)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-left text-sm font-semibold text-slate-200 hover:bg-white/10"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-sky-400/20 bg-sky-500/10 p-6 shadow-xl">
            <h2 className="text-xl font-bold">Why this matters</h2>

            <p className="mt-3 text-sm text-slate-200">
              Writing things down helps you notice patterns: better workouts,
              recurring pain, energy trends, and what’s actually working.
            </p>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="space-y-6">
          {/* NEW ENTRY */}
          <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            <h2 className="text-2xl font-bold">New Entry</h2>

            <textarea
              aria-label="Journal entry"
              maxLength={10000}
              value={entry}
              onChange={(e) => updateEntry(e.target.value)}
              placeholder="Write about your workout, how you felt, what improved..."
              className="mt-4 min-h-40 w-full resize-none rounded-[26px] border border-white/10 bg-slate-950/70 p-4 text-white outline-none placeholder:text-slate-500 focus:border-sky-400"
            />

            <button
              onClick={save}
              disabled={Boolean(records.issue) || !entry.trim()}
              className="mt-4 w-full rounded-2xl bg-sky-500 px-5 py-4 font-bold text-slate-950 hover:bg-sky-400"
            >
              Save Entry
            </button>
            <p className="mt-3 text-sm text-slate-300">Saved to your account. This does not send a coach message.</p>
            {records.issue && <p role="alert" className="mt-3 text-amber-200">{records.issue}</p>}
            <button type="button" onClick={exportRecords} className="mt-3 text-sm text-sky-300">Export journal records</button>
            {error && <p role="alert" className="mt-3 text-rose-300">{error}</p>}
            {status && <p role="status" className="mt-3 text-slate-300">{status}</p>}
            <button disabled={Boolean(records.issue)} onClick={reloadDraft} className="mt-3 text-sm text-sky-300">Reload saved draft (replaces unsaved text)</button>
          </div>

          {/* PAST ENTRIES */}
          <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-amber-300">
              Recent Entries
            </p>

            <div className="mt-5 space-y-4">
              {!records.issue && !entries.length && <p className="text-slate-300">No saved journal entries yet.</p>}
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-[26px] border border-white/10 bg-slate-950/60 p-4"
                >
                  <p className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{entry.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

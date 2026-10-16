"use client";

import React, { useRef, useState, useSyncExternalStore } from "react";
import { CHECK_IN_HABITS as habits, checkInWeek, currentWeeklyCheckIn, checkInVersion, emptyCheckIn, checkInReadiness, saveWeeklyCheckIn, inspectWeeklyCheckInRecords, weeklyCheckInRecordsVersion, exportWeeklyCheckInRecords, readWeeklyCheckInDraft, weeklyDraftVersion, saveWeeklyCheckInDraft, discardWeeklyCheckInDraft, type WeeklyCheckInDraft } from "@/lib/planning/checkIns";
import { planningAccountGeneration, planningOwner, planningSnapshot, subscribePlanning } from "@/lib/planning/store";

export default function WeeklyCheckInPage() {
  useSyncExternalStore(subscribePlanning, planningSnapshot, planningSnapshot);
  const records = inspectWeeklyCheckInRecords(); const { history, drafts: unfinished } = records;
  const recordsVersion = weeklyCheckInRecordsVersion();
  const [week, setWeek] = useState(checkInWeek);
  const [savedInitial] = useState(() => records.history.find(item => item.weekStart === week));
  const [recovered] = useState(() => records.drafts[week] ?? null);
  const initial = recovered || savedInitial;
  const account = useRef(planningOwner());
  const generation = useRef(planningAccountGeneration());
  const draftVersion = useRef(records.issue ? "null" : weeklyDraftVersion(week));
  const version = useRef(recovered ? recovered.baseVersion ?? undefined : records.issue ? undefined : checkInVersion(week));
  const [energy, setEnergy] = useState<number | null>(initial?.energy ?? null);
  const [sleep, setSleep] = useState<number | null>(initial?.sleep ?? null);
  const [stress, setStress] = useState<number | null>(initial?.stress ?? null);
  const [soreness, setSoreness] = useState<number | null>(initial?.soreness ?? null);
  const [checked, setChecked] = useState<string[]>(initial?.habits ?? []);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState(savedInitial?.savedAt ?? "");
  const [draftStatus, setDraftStatus] = useState(recovered ? "Recovered unfinished answers. Save Check-In to record them in history." : "Changes are saved as a recoverable draft; use Save Check-In to record weekly feedback.");
  const readiness = checkInReadiness({ energy, sleep, stress, soreness, habits: checked, notes });
  const ratingText = (value: number | null) => value == null ? "Not reported" : `${value}/10`;
  const save = () => {
    try {
      const saved = saveWeeklyCheckIn({ energy, sleep, stress, soreness, habits: checked, notes }, week, version.current, new Date(), { account: account.current, generation: generation.current, draftVersion: draftVersion.current });
      version.current = checkInVersion(week); draftVersion.current = weeklyDraftVersion(week); setSavedAt(saved.savedAt); setError(""); setDraftStatus("Check-in recorded. The matching recoverable draft was cleared.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save. Your answers remain here."); }
  };
  const update = (patch: Partial<WeeklyCheckInDraft>) => {
    const next = { energy, sleep, stress, soreness, habits: checked, notes, ...patch };
    setEnergy(next.energy); setSleep(next.sleep); setStress(next.stress); setSoreness(next.soreness); setChecked(next.habits); setNotes(next.notes);
    try {
      draftVersion.current = saveWeeklyCheckInDraft(next, week, draftVersion.current, version.current, account.current, generation.current);
      setError(""); setDraftStatus("Draft saved on this device. Account sync status appears above; weekly history updates only when you save the check-in.");
    } catch (cause) { setDraftStatus("These changes are only on this screen. Copy your answers before leaving."); setError(cause instanceof Error ? cause.message : "Draft could not be saved."); }
  };
  const reload = (useDraft = true) => {
    try {
      if (account.current !== planningOwner()) throw new Error("Your account changed. Reload the page before loading answers.");
      const currentRecords = inspectWeeklyCheckInRecords();
      if (currentRecords.issue) throw new Error(currentRecords.issue);
      const currentWeek = checkInWeek();
      if (!useDraft) discardWeeklyCheckInDraft(currentWeek, currentWeek === week ? draftVersion.current : weeklyDraftVersion(currentWeek), account.current, generation.current);
      const saved = currentWeeklyCheckIn(currentWeek); const recoveredDraft = useDraft ? readWeeklyCheckInDraft(currentWeek) : null;
      const draft = recoveredDraft || saved || emptyCheckIn();
      generation.current = planningAccountGeneration();
      setWeek(currentWeek); version.current = recoveredDraft ? recoveredDraft.baseVersion ?? undefined : checkInVersion(currentWeek); draftVersion.current = weeklyDraftVersion(currentWeek);
      setEnergy(draft.energy); setSleep(draft.sleep); setStress(draft.stress); setSoreness(draft.soreness); setChecked(draft.habits); setNotes(draft.notes); setSavedAt(saved?.savedAt ?? ""); setError("");
      setDraftStatus(recoveredDraft ? "Recovered unfinished answers. Save Check-In to record them in history." : "Loaded saved answers. Changes will become a recoverable draft.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load answers. Your answers remain here."); }
  };
  const exportRecords = () => {
    try {
      const json = exportWeeklyCheckInRecords(recordsVersion, account.current, generation.current);
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      try { const link = document.createElement("a"); link.href = url; link.download = "sound-fitness-weekly-check-ins.json"; link.click(); }
      finally { URL.revokeObjectURL(url); }
      setError(""); setDraftStatus("Weekly check-in originals exported. Saved answers are unchanged.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not export weekly check-ins. Originals remain saved."); }
  };
  function toggleHabit(habit: string) {
    update({ habits: checked.includes(habit) ? checked.filter(item => item !== habit) : [...checked, habit] });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_30%),radial-gradient(circle_at_80%_10%,_rgba(249,115,22,0.14),_transparent_26%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <section className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/25 backdrop-blur lg:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
                    Weekly Check-In
                  </div>

                  <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                    Tune the plan before it breaks you.
                  </h1>

                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                    Save weekly feedback to your account and review it with your coach.
                    Your week begins {week}. Saving does not send a coach message.
                  </p>
                </div>

                <div className="rounded-[28px] border border-sky-400/20 bg-sky-500/10 p-5 text-center shadow-lg shadow-sky-500/10">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-sky-200">
                    Readiness
                  </div>
                  <div className="mt-2 text-5xl font-bold tracking-tight">
                    {ratingText(readiness)}
                  </div>
                  <div className="mt-2 text-xs text-slate-300">
                    {readiness == null ? "Complete all four ratings" : "Personal feedback summary from your ratings"}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MiniStat
                label="Energy"
                value={ratingText(energy)}
                color="text-sky-300"
              />
              <MiniStat
                label="Sleep"
                value={ratingText(sleep)}
                color="text-emerald-300"
              />
              <MiniStat
                label="Stress"
                value={ratingText(stress)}
                color="text-amber-300"
              />
              <MiniStat
                label="Soreness"
                value={ratingText(soreness)}
                color="text-violet-300"
              />
            </section>

            <section className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="mb-5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">
                  Body + Recovery
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  Rate this week
                </h2>
              </div>

              <Rating label="Energy" value={energy} setValue={value => update({ energy: value })} />
              <Rating label="Sleep Quality" value={sleep} setValue={value => update({ sleep: value })} />
              <Rating
                label="Stress Level"
                value={stress}
                setValue={value => update({ stress: value })}
              />
              <Rating
                label="Soreness / Fatigue"
                value={soreness}
                setValue={value => update({ soreness: value })}
              />
            </section>

            <section className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="mb-5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                  Consistency
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  What got done?
                </h2>
              </div>

              <div className="grid gap-3">
                {habits.map((habit) => (
                  <button
                    key={habit}
                    aria-pressed={checked.includes(habit)}
                    onClick={() => toggleHabit(habit)}
                    className={`flex items-center justify-between rounded-[22px] border p-4 text-left transition ${
                      checked.includes(habit)
                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                        : "border-white/10 bg-slate-950/45 text-slate-300 hover:bg-white/[0.07]"
                    }`}
                  >
                    <span className="text-sm font-medium">{habit}</span>
                    <span className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-white/5 text-sm">
                      {checked.includes(habit) ? "✓" : ""}
                    </span>
                  </button>
                ))}
              </div>
            </section>
            <section className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6">
              <h2 className="text-2xl font-bold">Saved weekly check-ins</h2>
              {!records.issue && !history.length && <p className="mt-3 text-slate-300">No saved weekly check-ins yet.</p>}
              {Object.values(unfinished).filter(draft => draft.weekStart !== week).map(draft => <details key={draft.weekStart} className="mt-4 border-t border-white/10 pt-3"><summary className="cursor-pointer">Unfinished draft · week of {draft.weekStart}</summary><p className="mt-2 text-sm text-slate-300">Energy {ratingText(draft.energy)} · Sleep {ratingText(draft.sleep)} · Stress {ratingText(draft.stress)} · Soreness {ratingText(draft.soreness)}</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{draft.notes || "No notes added."}</p><p className="mt-2 text-sm text-slate-400">Habits: {draft.habits.join(", ") || "None selected"}. This draft was never recorded as weekly feedback.</p></details>)}
              {[...history].sort((a, b) => b.weekStart.localeCompare(a.weekStart)).map(item => <details key={item.id} className="mt-4 border-t border-white/10 pt-3">
                <summary className="cursor-pointer">Week of {item.weekStart} · saved {new Date(item.savedAt).toLocaleString()}</summary>
                <p className="mt-3 text-sm text-slate-300">Energy {item.energy}/10 · Sleep {item.sleep}/10 · Stress {item.stress}/10 · Soreness {item.soreness}/10</p>
                <p className="mt-2 text-sm text-slate-300">Habits: {item.habits.join(", ") || "None selected"}</p>
                {item.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{item.notes}</p>}
              </details>)}
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300">
                Coach Context
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Notes for your review
              </h2>

              <textarea
                aria-label="Weekly check-in notes"
                value={notes}
                onChange={event => update({ notes: event.target.value })}
                maxLength={4000}
                placeholder="Pain, schedule changes, wins, fatigue, stress, soreness, missed workouts, or anything that should affect next week..."
                className="mt-5 min-h-[210px] w-full resize-y rounded-[26px] border border-white/10 bg-slate-950/55 p-5 text-sm leading-6 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
              />
            </section>

            <section className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-violet-300">
                Coach Notes
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Why this matters
              </h2>

              <div className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
                <p>
                  This keeps training from becoming random. Your check-in helps
                  adjust volume, intensity, exercise selection, and recovery
                  recommendations.
                </p>

                <div className="rounded-[26px] border border-sky-400/20 bg-sky-500/10 p-5">
                  <div className="font-semibold text-white">Best practice</div>
                  <p className="mt-2 text-slate-200">
                    Be honest, not impressive. A lower score helps the plan fit
                    better.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-sky-300">
                Next Step
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Save your check-in
              </h2>

              <div className="mt-5 flex flex-col gap-3">
                {records.issue && <p role="alert" className="text-amber-200">{records.issue}</p>}
                <button type="button" onClick={exportRecords} className="text-sm text-sky-300">Export weekly check-in records</button>
                {error && <p role="alert" className="text-rose-300">{error}</p>}
                <p role="status" className="text-sm text-slate-300">{draftStatus}</p>
                {savedAt && <p role="status">Last saved {new Date(savedAt).toLocaleString()}. Changes require saving again.</p>}
                <button disabled={Boolean(records.issue)} onClick={save} className="rounded-[24px] bg-sky-500 px-5 py-4 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400">
                  Save Weekly Check-In
                </button>
                <button type="button" disabled={Boolean(records.issue)} onClick={() => reload()} className="text-sm text-sky-300">Reload recoverable draft (replaces answers on this screen)</button>
                <button type="button" disabled={Boolean(records.issue)} onClick={() => reload(false)} className="text-sm text-slate-300">Use saved answers (clears this week’s draft and replaces unsaved edits)</button>
                <a href="/dashboard/coach-messaging" className="text-sm text-sky-300">Message your coach separately</a>

                <a
                  href="/dashboard/progress"
                  className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4 text-center text-sm font-medium text-slate-200 hover:bg-white/10"
                >
                  Back to Progress
                </a>

                <a
                  href="/dashboard"
                  className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4 text-center text-sm font-medium text-slate-400 hover:bg-white/10"
                >
                  Return to Dashboard
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.055] p-5 shadow-xl shadow-black/15 backdrop-blur">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className={`mt-3 text-3xl font-bold tracking-tight ${color}`}>
        {value}
      </div>
    </div>
  );
}

function Rating({
  label,
  value,
  setValue,
}: {
  label: string;
  value: number | null;
  setValue: (value: number) => void;
}) {
  return (
    <div className="mb-6 last:mb-0">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium text-slate-300">{label}</div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-sky-200">
          {value == null ? "Not reported" : `${value}/10`}
        </div>
      </div>

      <div className="grid grid-cols-10 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
          <button
            key={num}
            aria-label={`${label}: ${num} out of 10`}
            aria-pressed={value === num}
            onClick={() => setValue(num)}
            className={`rounded-2xl border px-2 py-3 text-sm font-semibold transition ${
              value === num
                ? "border-transparent bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20"
                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
}

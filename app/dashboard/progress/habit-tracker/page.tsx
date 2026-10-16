"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { planningAccountGeneration, planningOwner, planningSnapshot, subscribePlanning } from "@/lib/planning/store";
import { addHabit, archiveHabit, habitDayVersion, habitHistory, habitVersion, markHabitDay, exportHabitRecords, habitRecordsVersion, inspectHabitRecords, renameHabit } from "@/lib/planning/habits";
import { validDateOnly } from "@/lib/planning/dates";

import { usePlanningDay } from "@/lib/planning/usePlanningDay";

const clientReady = () => true;
const serverReady = () => false;
const subscribeReady = () => () => {};
export default function HabitTrackerPage() {
  useSyncExternalStore(subscribePlanning, planningSnapshot, planningSnapshot);
  const ready = useSyncExternalStore(subscribeReady, clientReady, serverReady);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; title: string; version: string | undefined } | null>(null);
  const account = useRef(planningOwner());
  const generation = useRef(planningAccountGeneration());
  const newId = useRef<string | null>(null);
  const today = usePlanningDay();
  if (!ready || !today) return <p role="status" className="p-6 text-slate-300">Loading your habits…</p>;
  const selected = date || today;
  const records = inspectHabitRecords(); const { habits, days } = records;
  const recordsVersion = habitRecordsVersion();
  const active = habits.filter(habit => !habit.archived);
  const recent = validDateOnly(selected) && selected <= today ? habitHistory(days, selected) : [];
  const act = (action: () => void, message: string) => {
    try { action(); setError(""); setStatus(message); }
    catch (cause) { setStatus(""); setError(cause instanceof Error ? cause.message : "Could not save. Your previous records remain saved."); }
  };
  return <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-8 text-white">
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6">
        <p className="text-xs uppercase tracking-widest text-sky-300">Habit Tracker</p>
        <h1 className="mt-3 text-4xl font-bold">Build habits you choose.</h1>
        <p className="mt-3 text-slate-300">Record daily answers for your own habits. Unanswered days stay Not reported. This does not mark workouts complete, send coach messages, or award points.</p>
        <div className="mt-4 flex flex-wrap gap-4"><a href="/dashboard/progress" className="text-sky-300">View Progress</a><a href="/dashboard/progress/check-in" className="text-sky-300">Weekly Check-In</a><a href="/dashboard/my-plan" className="text-sky-300">My Plan</a></div>
      </section>
      {records.issue && <p role="alert" className="rounded-2xl border border-amber-300/30 p-4 text-amber-200">{records.issue}</p>}
      <button type="button" className="text-sky-300" onClick={() => act(() => {
        const json = exportHabitRecords(recordsVersion, account.current, generation.current);
        const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
        try { const link = document.createElement("a"); link.href = url; link.download = "sound-fitness-habit-records.json"; link.click(); }
        finally { URL.revokeObjectURL(url); }
      }, "Habit originals exported. Saved records are unchanged.")}>Export habit records</button>
      <section className="rounded-[28px] border border-white/10 p-6">
        <h2 className="text-2xl font-bold">Add a habit</h2>
        <form onSubmit={event => { event.preventDefault(); act(() => { newId.current ||= crypto.randomUUID(); addHabit(newId.current, title, account.current, generation.current); newId.current = null; setTitle(""); }, "Habit added. Account sync status appears above."); }} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="grow text-sm text-slate-300">Habit name<input value={title} onChange={event => { setTitle(event.target.value); newId.current = null; }} maxLength={80} placeholder="For example, take a short walk" className="mt-2 block w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white" /></label>
          <button type="submit" disabled={Boolean(records.issue)} className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950">Add Habit</button>
        </form>
        {error && <p role="alert" className="mt-3 text-rose-300">{error}</p>}
        {status && <p role="status" className="mt-3 text-slate-300">{status}</p>}
        {renaming && <form aria-label="Rename habit" className="mt-4 space-y-3 rounded-xl border border-sky-300/30 p-4" onSubmit={event => { event.preventDefault(); act(() => { renameHabit(renaming.id, renaming.title, renaming.version, account.current, generation.current); setRenaming(null); }, "Habit renamed. Its creation date and daily answers are unchanged."); }}>
          <p className="text-sm text-slate-300">Rename this habit without starting over. History displays the updated name. Changes stay on screen until you save.</p>
          <label className="block text-sm">New habit name<input required maxLength={80} value={renaming.title} onChange={event => setRenaming({ ...renaming, title: event.target.value })} className="mt-2 block w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white" /></label>
          <div className="flex gap-3"><button type="submit" disabled={Boolean(records.issue)} className="rounded-xl bg-sky-500 px-4 py-2 font-semibold text-slate-950">Save habit name</button><button type="button" onClick={() => { setRenaming(null); setError(""); setStatus("Rename cancelled. Saved habit is unchanged."); }} className="rounded-xl border border-white/20 px-4 py-2">Cancel rename</button></div>
        </form>}
      </section>
      {!records.issue && <>
      <section className="rounded-[28px] border border-white/10 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4"><h2 className="text-2xl font-bold">Daily answers</h2><label className="text-sm text-slate-300">Local date<input type="date" value={selected} max={today} onChange={event => setDate(event.target.value)} className="ml-3 rounded-xl border border-white/10 bg-slate-950 p-3 text-white" /></label><button type="button" onClick={() => setDate("")} className="text-sky-300">Today</button></div>
        {!active.length && <p className="mt-4 text-slate-300">No active habits yet. Add a habit to start recording daily answers.</p>}
        {active.map(habit => {
          const baseline = habitVersion(habit.id); const dayBaseline = habitDayVersion(habit.id, selected);
          const answer = days.find(day => day.habitId === habit.id && day.date === selected);
          const eligible = validDateOnly(selected) && selected >= habit.createdOn && selected <= today;
          return <article key={habit.id} className="mt-4 rounded-2xl border border-white/10 p-4">
            <h3 className="text-lg font-semibold">{habit.title}</h3><p className="mt-1 text-sm text-slate-400">Added {habit.createdOn} · {eligible ? answer ? answer.done ? "Done" : "Not done" : "Not reported" : "Choose a date from when this habit was added through today"}</p>
            <button type="button" disabled={Boolean(renaming)} onClick={() => { setError(""); setStatus(""); setRenaming({ id: habit.id, title: habit.title, version: baseline }); }} className="mt-3 text-sm text-sky-300 disabled:opacity-40">Rename habit</button>
            <div className="mt-3 flex flex-wrap gap-3" role="group" aria-label={habit.title + " daily answer"}>{([{ label: "Done", value: true }, { label: "Not done", value: false }, { label: "Not reported", value: null }] as const).map(option => <button key={option.label} type="button" disabled={!eligible} aria-pressed={option.value === null ? !answer : answer?.done === option.value} onClick={() => act(() => markHabitDay(habit.id, selected, option.value, dayBaseline, baseline, account.current, generation.current), "Daily answer saved. Account sync status appears above.")} className="rounded-xl border border-white/20 px-4 py-2 aria-pressed:border-sky-400 aria-pressed:bg-sky-500/20 disabled:opacity-40">{option.label}</button>)}<button type="button" onClick={() => act(() => archiveHabit(habit.id, true, baseline, account.current, generation.current), "Habit archived. Its daily records remain in history.")} className="ml-auto text-sm text-slate-400">Archive</button></div>
          </article>;
        })}
      </section>
      <section className="rounded-[28px] border border-white/10 p-6">
        <h2 className="text-2xl font-bold">Seven-day reported history</h2>
        <p className="mt-3 text-slate-300">Through {selected}: {recent.filter(day => day.done).length} Done · {recent.filter(day => !day.done).length} Not done. Counts include only explicit answers, including archived habits.</p>
        {!recent.length && <p className="mt-3 text-slate-400">No daily answers recorded in this period.</p>}
        <ul className="mt-4 space-y-2">{recent.map(day => <li key={day.habitId + ":" + day.date} className="rounded-xl border border-white/10 p-3">{day.date} · {habits.find(habit => habit.id === day.habitId)?.title || "Unavailable habit"} · {day.done ? "Done" : "Not done"}</li>)}</ul>
      </section>
      <section className="rounded-[28px] border border-white/10 p-6">
        <h2 className="text-2xl font-bold">Archived habits</h2><p className="mt-2 text-sm text-slate-400">Restore a habit to record or correct its daily answers. Archiving preserves history.</p>
        {!habits.some(habit => habit.archived) && <p className="mt-3 text-slate-400">No archived habits.</p>}
        {habits.filter(habit => habit.archived).map(habit => { const baseline = habitVersion(habit.id); return <div key={habit.id} className="mt-3 flex flex-wrap justify-between gap-3 rounded-xl border border-white/10 p-3">
          <span>{habit.title}</span>
          <div className="flex gap-3"><button type="button" disabled={Boolean(renaming)} onClick={() => { setError(""); setStatus(""); setRenaming({ id: habit.id, title: habit.title, version: baseline }); }} className="text-sky-300 disabled:opacity-40">Rename habit</button><button type="button" onClick={() => act(() => archiveHabit(habit.id, false, baseline, account.current, generation.current), "Habit restored.")} className="text-sky-300">Restore</button></div>
        </div>; })}
      </section>
      </>}
    </div>
  </main>;
}

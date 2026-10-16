"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { planningAccountGeneration, planningOwner, planningSnapshot, subscribePlanning } from "@/lib/planning/store";
import { readEligibleGoals } from "@/lib/planning/goals";
import { goalNumber } from "@/lib/planning/goalNumbers";
import { localDate, validDateOnly } from "@/lib/planning/dates";
import { usePlanningDay } from "@/lib/planning/usePlanningDay";
import { exportWaterHistory, inspectWaterDraft, inspectWaterHistory, waterHistoryVersion, removeWaterEntry, saveWaterEntry, waterMillilitres, waterTotals, waterVersion, saveWaterDraft, clearWaterDraft, waterDraftVersion, type WaterEntry, type WaterDraft, type WaterUnit } from "@/lib/planning/hydration";

const field = "mt-2 block w-full rounded-xl border border-white/20 bg-slate-950 p-3 text-white";
const button = "rounded-xl border border-cyan-300/30 px-4 py-2 text-cyan-100 disabled:opacity-40";
const format = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);

export default function HydrationPage() {
  useSyncExternalStore(subscribePlanning, planningSnapshot, planningSnapshot);
  const today = usePlanningDay();
  const account = useRef(planningOwner());
  const generation = useRef(planningAccountGeneration());
  const [draft, setDraft] = useState<WaterDraft>(() => inspectWaterDraft().draft || { id: "", date: localDate(), amount: "", unit: "ml", notes: "", baseVersion: null });
  const draftBaseline = useRef(waterDraftVersion());
  const [date, setDate] = useState("");
  const { amount, unit, notes } = draft;
  const editing = draft.baseVersion !== null;
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  if (!today) return <p role="status">Loading your water entries…</p>;
  const savedDraft = inspectWaterDraft();
  const history = inspectWaterHistory(); const historyVersion = waterHistoryVersion();
  const selected = date || today;
  const entries = history.entries;
  const daily = entries.filter(entry => entry.date === selected).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  const total = daily.reduce((sum, entry) => sum + waterMillilitres(entry.amount, entry.unit), 0);
  const goals = readEligibleGoals();
  const targetOz = goalNumber(goals?.waterGoal) ?? 0;
  const target = Number.isFinite(targetOz) && targetOz >= 1 && targetOz <= 500 ? waterMillilitres(targetOz, "us-fl-oz") : null;
  const recent = !history.issue && validDateOnly(selected) && selected <= today ? waterTotals(entries, selected) : [];
  const reset = (nextDate = selected) => { setDraft({ id: "", date: nextDate, amount: "", unit: "ml", notes: "", baseVersion: null }); draftBaseline.current = waterDraftVersion(); };
  const act = (action: () => void, message: string) => {
    try { action(); setError(""); setStatus(message); }
    catch (cause) { setStatus(""); setError(cause instanceof Error ? cause.message : "Could not save. Your previous records remain saved."); }
  };
  const update = (patch: Partial<WaterDraft>) => {
    const next = { ...draft, ...patch, id: draft.id || crypto.randomUUID() }; setDraft(next);
    try { draftBaseline.current = saveWaterDraft(next, draftBaseline.current, account.current, generation.current); setError(""); setStatus("Unfinished entry saved on this device. Save water entry to include it in your totals."); }
    catch (cause) { setStatus("These changes are only on this screen. Copy them before leaving."); setError(cause instanceof Error ? cause.message : "Draft could not be saved."); }
  };
  const reload = (clear = false) => act(() => {
    if (account.current !== planningOwner()) throw new Error("Your account changed. Reload hydration first.");
    if (clear) clearWaterDraft(draftBaseline.current, account.current, generation.current);
    const review = inspectWaterDraft();
    if (review.issue) throw new Error(review.issue);
    generation.current = planningAccountGeneration();
    const saved = review.draft; if (saved) setDraft(saved); else reset(); draftBaseline.current = waterDraftVersion();
  }, clear ? "Draft discarded. Saved water entries remain in history." : "Saved draft loaded, replacing the screen form. Save water entry to include it in totals.");
  const edit = (entry: WaterEntry) => act(() => {
    const next: WaterDraft = { id: entry.id, date: entry.date, amount: String(entry.amount), unit: entry.unit, notes: entry.notes, baseVersion: waterVersion(entry.id) ?? null };
    draftBaseline.current = saveWaterDraft(next, draftBaseline.current, account.current, generation.current); setDraft(next); setDate(entry.date);
  }, "Correction draft saved. Totals change only when you save the correction.");
  return <main className="space-y-5">
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
      <p className="text-xs uppercase tracking-widest text-cyan-200">Nutrition · Hydration</p>
      <h1 className="mt-3 text-4xl font-bold">Your water log</h1>
      <p className="mt-3 text-slate-300">Record water you drank, using your local calendar date. Days without entries stay unreported; partial logs may not represent your full intake.</p>
      <div className="mt-4 flex flex-wrap gap-4"><Link href="/nutrition" className="text-cyan-200">Fuel Dashboard</Link><Link href="/dashboard/goals" className="text-cyan-200">Set water goal</Link></div>
    </section>
    {history.issue && <p role="alert" className="rounded-2xl border border-amber-300/30 p-4 text-amber-200">{history.issue}</p>}
    {savedDraft.issue && <p role="alert" className="rounded-2xl border border-amber-300/30 p-4 text-amber-200">{savedDraft.issue}</p>}
    <button type="button" className={button} onClick={() => act(() => {
      const json = exportWaterHistory(historyVersion, account.current, generation.current);
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      try { const anchor = document.createElement("a"); anchor.href = url; anchor.download = "sound-fitness-water-history.json"; anchor.click(); }
      finally { URL.revokeObjectURL(url); }
    }, "Water history and saved draft download requested. Saved values are unchanged.")}>Export water history</button>
    <section className="rounded-[28px] border border-white/10 p-6">
      <h2 className="text-2xl font-bold">{editing ? "Correct water entry" : "Add water"}</h2>
      <p className="mt-2 text-sm text-slate-300">Unfinished entries and corrections recover after refresh. Drafts enter totals only when saved. Reload replaces this screen’s form; copy any unsaved changes first.</p>
      <form className="mt-4 space-y-4" onSubmit={event => { event.preventDefault(); act(() => { const id = draft.id || crypto.randomUUID(); saveWaterEntry({ id, date: draft.date, amount: amount.trim() ? Number(amount) : NaN, unit, notes }, draft.baseVersion ?? undefined, account.current, generation.current, new Date(), draftBaseline.current); setDate(draft.date); reset(draft.date); }, "Water entry saved. Account sync status appears above."); }}>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm text-slate-300">Local date<input required type="date" max={today} value={draft.date} onChange={event => update({ date: event.target.value })} className={field} /></label>
          <label className="text-sm text-slate-300">Amount<input required type="number" min="0.01" step="any" inputMode="decimal" value={amount} onChange={event => update({ amount: event.target.value })} className={field} /></label>
          <label className="text-sm text-slate-300">Unit<select value={unit} onChange={event => update({ unit: event.target.value as WaterUnit })} className={field}><option value="ml">Millilitres (ml)</option><option value="us-fl-oz">US fluid ounces (fl oz)</option></select></label>
        </div>
        <label className="block text-sm text-slate-300">Notes (optional)<textarea maxLength={1000} value={notes} onChange={event => update({ notes: event.target.value })} className={field} /></label>
        <div className="flex flex-wrap gap-3"><button type="submit" disabled={Boolean(history.issue) || Boolean(savedDraft.issue)} className={button}>{editing ? "Save correction" : "Save water entry"}</button><button type="button" onClick={() => reload()} className={button}>Reload saved draft</button><button type="button" onClick={() => reload(true)} className={button}>Discard draft and screen changes</button></div>
        {error && <p role="alert" className="text-rose-300">{error} Your form stays here so you can review or copy it.</p>}
        {status && <p role="status" className="text-slate-300">{status}</p>}
      </form>
    </section>
    {!history.issue && <><section className="rounded-[28px] border border-white/10 p-6">
      <div className="flex flex-wrap justify-between gap-3"><h2 className="text-2xl font-bold">Reported water · {selected}</h2><button type="button" onClick={() => setDate("")} className={button}>Today</button></div>
      <p className="mt-3 text-lg text-cyan-100">{daily.length ? `${format(total)} ml · ${format(total / 29.5735295625)} US fl oz · ${daily.length} entries` : "No water reported for this date."}</p>
      <p className="mt-2 text-sm text-slate-300">{target ? `Your saved daily goal: ${format(targetOz)} US fl oz (${format(target)} ml).${daily.length ? ` Reported intake: ${format(total / target * 100)}% of your goal.` : ""}` : "No daily water goal saved. Set your own target on Goals."}</p>
      {draft.id && <p className="mt-3 text-sm text-slate-400">Finish or discard the current draft before correcting another entry.</p>}
      <ul className="mt-4 space-y-3">{daily.map(entry => { const baseline = waterVersion(entry.id); return <li key={entry.id} className="rounded-2xl border border-white/10 p-4"><p className="font-semibold">{format(entry.amount)} {entry.unit === "ml" ? "ml" : "US fl oz"}</p>{entry.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{entry.notes}</p>}<div className="mt-3 flex gap-3"><button type="button" disabled={Boolean(draft.id) || Boolean(savedDraft.issue)} onClick={() => edit(entry)} className={button}>Correct entry</button><button type="button" disabled={Boolean(editing)} onClick={() => act(() => removeWaterEntry(entry.id, baseline, account.current, generation.current), "Water entry removed.")} className={button}>Remove entry</button></div></li>; })}</ul>
    </section>
    <section className="rounded-[28px] border border-white/10 p-6"><h2 className="text-2xl font-bold">Seven-day reported history</h2><p className="mt-2 text-sm text-slate-400">Through {selected}. Totals count recorded water only.</p><label className="mt-3 block text-sm text-slate-300">History through date<input type="date" max={today} value={selected} onChange={event => setDate(event.target.value)} className={field} /></label><ul className="mt-4 space-y-2">{recent.map(day => <li key={day.date} className="rounded-xl border border-white/10 p-3"><button type="button" onClick={() => setDate(day.date)} className="text-cyan-200">{day.date}</button> · {day.count ? `${format(day.millilitres)} ml · ${day.count} entries` : "Not reported"}</li>)}</ul></section>
    </>}
  </main>;
}

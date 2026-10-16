"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { planningAccountGeneration, planningOwner, planningSnapshot, subscribePlanning } from "@/lib/planning/store";
import { usePlanningDay } from "@/lib/planning/usePlanningDay";
import { clearMealDraft, emptyMealDraft, exportMealHistory, inspectMealDraft, inspectMealHistory, mealHistoryVersion, mealDraftVersion, mealInputFromDraft, mealKinds, mealTotals, mealVersion, nutrientFields, removeMeal, saveMeal, saveMealDraft, type MealDraft, type MealEntry } from "@/lib/planning/meals";

import { inspectMealTemplateLibrary, mealTemplateId, mealTemplateVersion, saveMealAsTemplate } from "@/lib/planning/mealTemplates";

const field = "mt-2 block w-full rounded-xl border border-white/20 bg-slate-950 p-3 text-white";
const button = "rounded-xl border border-cyan-300/30 px-4 py-2 text-cyan-100 disabled:opacity-40";
const labels = { calories: "Energy (kcal)", protein: "Protein (g)", carbs: "Carbohydrate (g)", fat: "Fat (g)" };
const format = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);

export default function MealLog({ historyOnly = false }: { historyOnly?: boolean }) {
  useSyncExternalStore(subscribePlanning, planningSnapshot, planningSnapshot);
  const today = usePlanningDay();
  const account = useRef(planningOwner());
  const generation = useRef(planningAccountGeneration());
  const [draft, setDraft] = useState(() => inspectMealDraft().draft || emptyMealDraft());
  const baseline = useRef(mealDraftVersion());
  const [editorOpen, setEditorOpen] = useState(!historyOnly);
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  if (!today) return <p role="status">Loading your meals…</p>;
  const savedDraft = inspectMealDraft();
  const templateLibrary = inspectMealTemplateLibrary();
  const history = inspectMealHistory(); const historyVersion = mealHistoryVersion();
  const meals = history.meals;
  const filtered = meals.filter(meal => (!date || meal.date === date) && `${meal.title} ${meal.notes} ${meal.kind}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time) || b.recordedAt.localeCompare(a.recordedAt));
  const totals = mealTotals(meals.filter(meal => meal.date === today));
  const act = (action: () => void, message: string) => {
    try { action(); setError(""); setStatus(message); }
    catch (cause) { setStatus(""); setError(cause instanceof Error ? cause.message : "Could not save. Copy any unsaved changes before leaving."); }
  };
  const update = (patch: Partial<MealDraft>) => {
    const next = { ...draft, ...patch, id: draft.id || crypto.randomUUID() }; setDraft(next);
    try { baseline.current = saveMealDraft(next, baseline.current, account.current, generation.current); setError(""); setStatus("Draft saved on this device. Save meal to include it in history and totals."); }
    catch (cause) { setStatus("These changes are only on this screen. Copy them before leaving."); setError(cause instanceof Error ? cause.message : "Draft could not be saved."); }
  };
  const reload = (clear = false) => act(() => {
    if (account.current !== planningOwner()) throw new Error("Your account changed. Reload meals first.");
    if (clear) clearMealDraft(baseline.current, account.current, generation.current);
    const current = inspectMealDraft();
    if (current.issue) throw new Error(current.issue);
    generation.current = planningAccountGeneration();
    setDraft(current.draft || emptyMealDraft()); baseline.current = mealDraftVersion(); setEditorOpen(true);
  }, clear ? "Draft discarded. Saved meals remain in history." : "Saved draft loaded, replacing the screen form.");
  const edit = (meal: MealEntry) => act(() => {
    const next: MealDraft = { ...meal, calories: meal.calories === null ? "" : String(meal.calories), protein: meal.protein === null ? "" : String(meal.protein), carbs: meal.carbs === null ? "" : String(meal.carbs), fat: meal.fat === null ? "" : String(meal.fat), baseVersion: mealVersion(meal.id) ?? null };
    baseline.current = saveMealDraft(next, baseline.current, account.current, generation.current); setDraft(next); setEditorOpen(true);
  }, "Correction draft saved. History changes only when you save the meal.");
  return <main className="space-y-5">
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
      <p className="text-xs uppercase tracking-widest text-cyan-200">Nutrition · Meals</p><h1 className="mt-3 text-4xl font-bold">{historyOnly ? "Meal history" : "Your meal log"}</h1>
      <p className="mt-3 text-slate-300">Log meals already eaten. Nutrition values are optional amounts for the whole meal. Unknown values stay unreported; recorded meals may not cover your full daily intake.</p>
      <div className="mt-4 flex flex-wrap gap-4"><Link href="/nutrition" className="text-cyan-200">Fuel Dashboard</Link><Link href="/nutrition/meals/builder" className="text-cyan-200">Log a meal</Link><Link href="/nutrition/meals/history" className="text-cyan-200">Meal history</Link><Link href="/nutrition/hydration" className="text-cyan-200">Water log</Link><Link href="/nutrition/meals/templates" className="text-cyan-200">Meal templates</Link></div>
    </section>
    {savedDraft.issue && <p role="alert" className="rounded-2xl border border-amber-300/30 p-4 text-amber-200">{savedDraft.issue}</p>}
    {history.issue && <p role="alert" className="rounded-2xl border border-amber-300/30 p-4 text-amber-200">{history.issue}</p>}
    <button type="button" className={button} onClick={() => act(() => {
      const json = exportMealHistory(historyVersion, account.current, generation.current);
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      try { const anchor = document.createElement("a"); anchor.href = url; anchor.download = "sound-fitness-meal-history.json"; anchor.click(); }
      finally { URL.revokeObjectURL(url); }
    }, "Meal history and saved draft download requested. Saved values are unchanged.")}>Export meal history</button>
    {!history.issue && <section className="rounded-[28px] border border-white/10 p-6"><h2 className="text-2xl font-bold">Today’s reported nutrition · {today}</h2><div className="mt-4 grid gap-3 sm:grid-cols-4">{nutrientFields.map(key => <div key={key} className="rounded-2xl border border-white/10 p-4"><p className="text-sm text-slate-400">{labels[key]}</p><p className="mt-2 text-xl text-cyan-100">{totals[key].value === null ? "Not reported" : format(totals[key].value)}</p><p className="mt-1 text-xs text-slate-400">Reported for {totals[key].reported} of {totals[key].meals} saved meals</p></div>)}</div></section>}
    {!editorOpen && <button type="button" onClick={() => setEditorOpen(true)} className={button}>{draft.id ? "Continue meal draft" : "Log a meal"}</button>}
    {editorOpen && <section className="rounded-[28px] border border-white/10 p-6">
      <h2 className="text-2xl font-bold">{draft.baseVersion === null ? "Add meal" : "Correct meal"}</h2><p className="mt-2 text-sm text-slate-300">Your unfinished form recovers after refresh. Reload replaces the screen form; copy unsaved changes first. Nutrition is entered manually from information you have.</p>
      <form className="mt-4 space-y-4" onSubmit={event => { event.preventDefault(); act(() => { saveMeal(mealInputFromDraft({ ...draft, id: draft.id || crypto.randomUUID() }), draft.baseVersion ?? undefined, account.current, generation.current, new Date(), baseline.current); baseline.current = mealDraftVersion(); setDraft(emptyMealDraft(draft.date)); }, "Meal saved. Account sync status appears above."); }}>
        <div className="grid gap-4 sm:grid-cols-3"><label className="text-sm text-slate-300">Local date<input required type="date" max={today} value={draft.date} onChange={event => update({ date: event.target.value })} className={field} /></label><label className="text-sm text-slate-300">Local time (optional)<input type="time" value={draft.time} onChange={event => update({ time: event.target.value })} className={field} /></label><label className="text-sm text-slate-300">Meal type (optional)<select value={draft.kind} onChange={event => update({ kind: event.target.value as MealDraft["kind"] })} className={field}>{mealKinds.map(kind => <option key={kind} value={kind}>{kind || "Not specified"}</option>)}</select></label></div>
        <label className="block text-sm text-slate-300">Meal name<input required maxLength={120} value={draft.title} onChange={event => update({ title: event.target.value })} className={field} /></label>
        <label className="block text-sm text-slate-300">Foods, portions, or notes (optional)<textarea maxLength={2000} value={draft.notes} onChange={event => update({ notes: event.target.value })} className={field} /></label>
        <div className="grid gap-4 sm:grid-cols-4">{nutrientFields.map(key => <label key={key} className="text-sm text-slate-300">{labels[key]}<input type="number" inputMode="decimal" min="0" max={key === "calories" ? 10000 : 2000} step="any" placeholder="Unknown" value={draft[key]} onChange={event => update({ [key]: event.target.value })} className={field} /></label>)}</div>
        <div className="flex flex-wrap gap-3"><button type="submit" disabled={Boolean(history.issue) || Boolean(savedDraft.issue)} className={button}>{draft.baseVersion === null ? "Save meal" : "Save correction"}</button><button type="button" onClick={() => reload()} className={button}>Reload saved draft</button><button type="button" onClick={() => reload(true)} className={button}>Discard draft and screen changes</button></div>
      </form>
    </section>}
    {templateLibrary.issue && <p role="alert" className="rounded-2xl border border-amber-300/30 p-4 text-amber-200">{templateLibrary.issue} <Link href="/nutrition/meals/templates" className="underline">Review and export meal templates</Link></p>}
    {error && <p role="alert" className="text-rose-300">{error} Your form remains here.</p>}{status && <p role="status" className="text-slate-300">{status}</p>}
    <section className="rounded-[28px] border border-white/10 p-6"><h2 className="text-2xl font-bold">Saved meals</h2><div className="mt-4 flex flex-wrap gap-4"><label className="grow text-sm text-slate-300">Search meals<input type="search" value={search} onChange={event => setSearch(event.target.value)} className={field} /></label><label className="text-sm text-slate-300">Filter local date<input type="date" max={today} value={date} onChange={event => setDate(event.target.value)} className={field} /></label><button type="button" onClick={() => { setDate(""); setSearch(""); }} className={button}>Show all meals</button></div>
      {!history.issue && !filtered.length && <p className="mt-4 text-slate-300">{meals.length ? "No meals match these filters." : "No meals saved yet. Drafts appear here only after you save them."}</p>}
      {draft.id && <p className="mt-3 text-sm text-slate-400">Finish or discard the current draft before correcting another meal.</p>}
      <ul className="mt-4 space-y-3">{filtered.map(meal => { const version = mealVersion(meal.id); const templateId = mealTemplateId(meal.id); const templateVersion = templateLibrary.issue ? undefined : mealTemplateVersion(templateId); const hasTemplate = templateLibrary.templates.some(item => item.id === templateId); return <li key={meal.id} className="rounded-2xl border border-white/10 p-4"><h3 className="text-xl font-semibold">{meal.title}</h3><p className="mt-1 text-sm text-slate-400">{meal.date} · {meal.time || "Time not reported"} · {meal.kind || "Type not specified"}</p>{meal.notes && <p className="mt-3 whitespace-pre-wrap text-slate-300">{meal.notes}</p>}<dl className="mt-3 grid gap-2 sm:grid-cols-4">{nutrientFields.map(key => <div key={key}><dt className="text-xs text-slate-400">{labels[key]}</dt><dd>{meal[key] === null ? "Not reported" : format(meal[key])}</dd></div>)}</dl><div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={Boolean(templateLibrary.issue)} onClick={() => act(() => { saveMealAsTemplate(meal.id, version, templateVersion, account.current, generation.current); }, "Meal template saved. This does not record another meal; open Meal templates to reuse it.")} className={button}>{hasTemplate ? "Update template from this meal" : "Save as template"}</button><button type="button" disabled={Boolean(draft.id) || Boolean(savedDraft.issue)} onClick={() => edit(meal)} className={button}>Correct meal</button><button type="button" disabled={draft.baseVersion !== null} onClick={() => act(() => removeMeal(meal.id, version, account.current, generation.current), "Meal removed.")} className={button}>Remove meal</button></div></li>; })}</ul>
    </section>
  </main>;
}

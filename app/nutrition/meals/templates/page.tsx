"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { planningAccountGeneration, planningOwner, planningSnapshot, subscribePlanning } from "@/lib/planning/store";
import { usePlanningDay } from "@/lib/planning/usePlanningDay";
import { emptyMealDraft, mealDraftVersion, mealInputFromDraft, mealKinds, nutrientFields, readMealDraft, type MealDraft } from "@/lib/planning/meals";
import { createMealTemplate, exportMealTemplateLibrary, inspectMealTemplateLibrary, mealTemplateLibraryVersion, mealTemplateVersion, setMealTemplateArchived, startMealDraftFromTemplate, updateMealTemplate } from "@/lib/planning/mealTemplates";

const button = "rounded-xl border border-cyan-300/30 px-4 py-2 text-cyan-100 disabled:opacity-40";
const labels = { calories: "Energy (kcal)", protein: "Protein (g)", carbs: "Carbohydrate (g)", fat: "Fat (g)" };
export default function MealTemplatesPage() {
  useSyncExternalStore(subscribePlanning, planningSnapshot, planningSnapshot);
  const today = usePlanningDay();
  const account = useRef(planningOwner());
  const generation = useRef(planningAccountGeneration());
  const [search, setSearch] = useState("");
  const [archived, setArchived] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<{ version: string | undefined; libraryVersion?: string; draft: MealDraft } | null>(null);
  if (!today) return <p role="status">Loading meal templates…</p>;
  const library = inspectMealTemplateLibrary(); const libraryVersion = mealTemplateLibraryVersion();
  const templates = library.templates; const draft = readMealDraft(); const draftVersion = mealDraftVersion();
  const visible = templates.filter(item => item.archived === archived && `${item.title} ${item.kind} ${item.notes}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
  const act = (action: () => void, message: string) => {
    try { action(); setError(""); setStatus(message); }
    catch (cause) { setStatus(""); setError(cause instanceof Error ? cause.message : "Could not save. Your saved templates are preserved."); }
  };
  return <main className="space-y-5">
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-6">
      <p className="text-xs uppercase tracking-widest text-cyan-200">Nutrition · Meals</p><h1 className="mt-3 text-4xl font-bold">Your meal templates</h1>
      <p className="mt-3 text-slate-300">Create a template for a future meal, or save a reported meal as a reusable template from Meal history. Values describe the whole meal and stay as you reported them. Using a template starts a new draft for today; review its portions and nutrition before saving the meal you actually ate.</p>
      <div className="mt-4 flex flex-wrap gap-4"><Link href="/nutrition/meals/history" className="text-cyan-200">Meal history · save templates</Link><Link href="/nutrition/meals/builder" className="text-cyan-200">Open meal draft</Link><Link href="/nutrition" className="text-cyan-200">Fuel Dashboard</Link></div>
      <p className="mt-3 text-sm text-slate-400">Templates and drafts do not count toward intake totals. Updating or archiving a template does not change previously saved meals.</p>
    </section>
    {library.issue && <p role="alert" className="rounded-2xl border border-amber-300/30 p-4 text-amber-200">{library.issue}</p>}
    <button type="button" disabled={Boolean(editing) || Boolean(library.issue)} className={button} onClick={() => { setError(""); setStatus(""); setEditing({ version: undefined, libraryVersion: mealTemplateLibraryVersion(), draft: { ...emptyMealDraft(today), id: crypto.randomUUID() } }); }}>Create meal template</button>
    <button type="button" className={button} onClick={() => act(() => {
      const json = exportMealTemplateLibrary(libraryVersion, account.current, generation.current);
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      try { const anchor = document.createElement("a"); anchor.href = url; anchor.download = "sound-fitness-meal-templates.json"; anchor.click(); }
      finally { URL.revokeObjectURL(url); }
    }, "Meal template library download requested. Saved values are unchanged.")}>Export template library</button>
    {error && <p role="alert" className="text-rose-300">{error}</p>}{status && <p role="status" className="text-slate-300">{status}</p>}
    {editing && <section aria-label={editing.libraryVersion === undefined ? "Edit meal template" : "Create meal template"} className="rounded-[28px] border border-cyan-300/30 p-6">
      <h2 className="text-2xl font-bold">{editing.libraryVersion === undefined ? "Edit template" : "Create template"}</h2>
      <p className="mt-2 text-sm text-slate-300">Changes stay on this screen until you save. Nutrition describes the whole meal; leave unknown amounts blank. Saved meals and your current meal draft stay unchanged.</p>
      <form className="mt-4 space-y-4" onSubmit={event => { event.preventDefault(); act(() => {
        const input = mealInputFromDraft(editing.draft);
        const changes = { title: input.title, kind: input.kind, notes: input.notes, calories: input.calories, protein: input.protein, carbs: input.carbs, fat: input.fat };
        if (editing.libraryVersion !== undefined) createMealTemplate(input.id, changes, editing.libraryVersion, account.current, generation.current);
        else updateMealTemplate(input.id, changes, editing.version, account.current, generation.current);
        setEditing(null);
      }, "Template saved. Saved meals and the current meal draft are unchanged."); }}>
        <label className="block text-sm">Template name<input required maxLength={120} value={editing.draft.title} onChange={event => setEditing({ ...editing, draft: { ...editing.draft, title: event.target.value } })} className="mt-2 block w-full rounded-xl border border-white/20 bg-slate-950 p-3" /></label>
        <label className="block text-sm">Meal type<select value={editing.draft.kind} onChange={event => setEditing({ ...editing, draft: { ...editing.draft, kind: event.target.value as MealDraft["kind"] } })} className="mt-2 block w-full rounded-xl border border-white/20 bg-slate-950 p-3">{mealKinds.map(kind => <option key={kind} value={kind}>{kind || "Not specified"}</option>)}</select></label>
        <div className="grid gap-4 sm:grid-cols-4">{nutrientFields.map(key => <label key={key} className="text-sm">{labels[key]}<input type="number" min={0} max={key === "calories" ? 10000 : 2000} step="any" value={editing.draft[key]} onChange={event => setEditing({ ...editing, draft: { ...editing.draft, [key]: event.target.value } })} className="mt-2 block w-full rounded-xl border border-white/20 bg-slate-950 p-3" /></label>)}</div>
        <label className="block text-sm">Ingredients, portions and preparation notes<textarea maxLength={2000} value={editing.draft.notes} onChange={event => setEditing({ ...editing, draft: { ...editing.draft, notes: event.target.value } })} className="mt-2 block w-full rounded-xl border border-white/20 bg-slate-950 p-3" /></label>
        <div className="flex flex-wrap gap-3"><button type="submit" disabled={Boolean(library.issue)} className={button}>{editing.libraryVersion === undefined ? "Save template changes" : "Save new template"}</button><button type="button" className={button} onClick={() => { setEditing(null); setError(""); setStatus("Template edits cancelled. Saved values are unchanged."); }}>Cancel template edits</button></div>
      </form>
    </section>}
    {draft && <p className="rounded-2xl border border-cyan-300/20 p-4">A meal draft is already saved. <Link href="/nutrition/meals/builder" className="text-cyan-200 underline">Continue or discard it in the meal log</Link> before using another template.</p>}
    <section className="rounded-[28px] border border-white/10 p-6">
      <h2 className="text-2xl font-bold">{archived ? "Archived templates" : "Saved templates"}</h2>
      <div className="mt-4 flex flex-wrap gap-4"><label className="grow text-sm text-slate-300">Search templates<input type="search" value={search} onChange={event => setSearch(event.target.value)} className="mt-2 block w-full rounded-xl border border-white/20 bg-slate-950 p-3 text-white" /></label><label className="flex items-center gap-2"><input type="checkbox" checked={archived} onChange={event => setArchived(event.target.checked)} />Show archived templates</label></div>
      {!library.issue && !visible.length && <p className="mt-4 text-slate-300">{templates.length ? "No templates match this view." : "No templates saved yet. Create a future meal template here, or save one from Meal history."}</p>}
      <ul className="mt-4 space-y-3">{visible.map(item => { const version = mealTemplateVersion(item.id); return <li key={item.id} className="rounded-2xl border border-white/10 p-4">
        <h3 className="text-xl font-semibold">{item.title}</h3><p className="mt-1 text-sm text-slate-400">{item.kind || "Type not specified"} · {item.archived ? "Archived" : "Ready to reuse"}</p>
        {item.notes && <p className="mt-3 whitespace-pre-wrap text-slate-300">{item.notes}</p>}
        <dl className="mt-3 grid gap-2 sm:grid-cols-4">{nutrientFields.map(key => <div key={key}><dt className="text-xs text-slate-400">{labels[key]}</dt><dd>{item[key] === null ? "Not reported" : new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(item[key])}</dd></div>)}</dl>
        <div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={Boolean(editing)} className={button} onClick={() => { setError(""); setStatus(""); setEditing({ version, draft: { id: item.id, date: today, time: "", title: item.title, kind: item.kind, notes: item.notes, calories: item.calories === null ? "" : String(item.calories), protein: item.protein === null ? "" : String(item.protein), carbs: item.carbs === null ? "" : String(item.carbs), fat: item.fat === null ? "" : String(item.fat), baseVersion: null } }); }}>Edit template</button>{!item.archived && <button type="button" disabled={Boolean(draft) || Boolean(editing)} onClick={() => act(() => { startMealDraftFromTemplate(item.id, version, crypto.randomUUID(), draftVersion, account.current, generation.current, today); }, "New meal draft saved for today. Open meal draft to review portions, date/time, and nutrition, then Save meal only after eating.")} className={button}>Use template for today</button>}<button type="button" disabled={Boolean(editing)} onClick={() => act(() => setMealTemplateArchived(item.id, !item.archived, version, account.current, generation.current), item.archived ? "Template restored." : "Template archived. Saved meals are unchanged.")} className={button}>{item.archived ? "Restore template" : "Archive template"}</button></div>
      </li>; })}</ul>
    </section>
  </main>;
}

"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRef, useState, useSyncExternalStore } from "react";
import { planningAccountGeneration, planningOwner, planningSnapshot, planningStatus, subscribePlanning } from "@/lib/planning/store";
import { localDate } from "@/lib/planning/dates";
import { inspectWaterHistory, saveWaterEntry } from "@/lib/planning/hydration";
import { inspectMealHistory, saveMeal } from "@/lib/planning/meals";
import { inspectSupportRecords, saveSupportRecord } from "@/lib/planning/supportSignalRecords";
import { supportKinds, type SupportKind } from "@/lib/planning/supportSignalValidation";
import { WEEKLY_CHECK_INS_KEY, type WeeklyCheckIn } from "@/lib/planning/checkIns";
import { validatePlanningImport } from "@/lib/planning/importValidation";
import { bodyCommandEvidenceSnapshot, serverBodyCommandEvidence, type BodyCommandEvidence } from "@/lib/planning/bodyCommandEvidence";

const field = "mt-1 w-full rounded-lg border border-white/20 bg-slate-950 p-2 text-sm text-white";
const ProfileSignalQuestions = dynamic(() => import("@/components/profile/ProfileExperience"), { loading: () => <p className="p-3 text-sm text-cyan-100" role="status">Loading your questions…</p> });
const button = "rounded-lg border border-cyan-200/30 px-3 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-40";
export default function SupportSignalLog({ kind, onPendingChange }: { kind: string; onPendingChange?: (pending: boolean) => void }) {
  const owner = useSyncExternalStore(subscribePlanning, planningOwner, () => null);
  const generation = useSyncExternalStore(subscribePlanning, planningAccountGeneration, () => -1);
  if (kind === "readiness") return <ReadinessSignal account={owner} generation={generation} onPendingChange={onPendingChange} />;
  if (kind === "weight" || kind === "measurements" || kind === "benchmarks") return <ProfileSignalQuestions key={`${owner}:${generation}:${kind}`} supportSection={kind} onPendingChange={onPendingChange} />;
  if (kind === "photos") return <ProfileSignalQuestions key={`${owner}:${generation}:${kind}`} supportSection="measurements" onPendingChange={onPendingChange} />;
  if (["protein", "carbs", "fat", "meals"].includes(kind)) return <section className="space-y-3 p-2 text-sm text-slate-200"><p>Review today’s food records and log meals in Nutrition. Nutrient totals update from your saved meals.</p><Link className={`${button} inline-flex`} href="/dashboard/nutrition">View and log food</Link></section>;
  if (kind === "fatigue") return <div className="space-y-4"><AccountLog key={`${owner}:${generation}:fatigue`} kind={kind} account={owner} generation={generation} /><ProfileSignalQuestions supportSection="fatigue" onPendingChange={onPendingChange} /></div>;
  return <AccountLog key={`${owner}:${generation}:${kind}`} kind={kind} account={owner} generation={generation} />;
}
function ReadinessSignal({ account, generation, onPendingChange }: { account: string | null; generation: number; onPendingChange?: (pending: boolean) => void }) {
  const snapshot = useSyncExternalStore(subscribePlanning, bodyCommandEvidenceSnapshot, serverBodyCommandEvidence);
  const evidence = JSON.parse(snapshot) as BodyCommandEvidence;
  const [input, setInput] = useState<"sleep" | "stress" | "soreness" | "fatigue">("sleep");
  return <section className="space-y-4 text-sm text-slate-200">
    <p className="text-3xl font-black text-emerald-100">{evidence.readiness.value}</p>
    <p>{evidence.readiness.description}</p>
    <div className="grid grid-cols-2 gap-2">{(["sleep", "stress", "soreness", "fatigue"] as const).map(kind => <div key={kind} className="rounded-lg bg-white/5 p-3"><span className="capitalize">{kind}</span><strong className="block text-lg">{evidence[kind].value}</strong></div>)}</div>
    <label className="block">Update a daily signal<select className={field} value={input} onChange={event => setInput(event.target.value as typeof input)}>{["sleep", "stress", "soreness", "fatigue"].map(kind => <option key={kind} value={kind}>{kind[0].toUpperCase() + kind.slice(1)}</option>)}</select></label>
    <AccountLog key={`${account}:${generation}:${input}`} kind={input} account={account} generation={generation} />
    <ProfileSignalQuestions supportSection="readiness" onPendingChange={onPendingChange} />
  </section>;
}
function AccountLog({ kind, account, generation }: { kind: string; account: string | null; generation: number }) {
  useSyncExternalStore(subscribePlanning, () => JSON.stringify(planningSnapshot()), () => "{}");
  const [tab, setTab] = useState<"entry" | "history">("entry");
  const [date, setDate] = useState(() => localDate());
  const [value, setValue] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const id = useRef("");
  const committed = useRef(false);
  const water = inspectWaterHistory(), meals = inspectMealHistory(), support = inspectSupportRecords();
  const rating = ["sleep", "stress", "soreness", "fatigue"].includes(kind);
  const units = kind === "caffeine" ? "mg" : kind === "bloodPressure" ? "mmHg" : kind === "hydration" ? "ml" : kind === "fuel" ? "kcal" : kind === "recovery" ? "minutes" : kind === "core" ? "sets" : "/10";
  const label = kind === "caffeine" ? "Caffeine consumed (mg)" : kind === "bloodPressure" ? "Systolic (mmHg)" : kind === "sleep" ? "Sleep quality (1 poor · 10 excellent)" : rating ? `${kind[0].toUpperCase()}${kind.slice(1)} (1 low · 10 high)` : kind === "hydration" ? "Water consumed (ml)" : kind === "fuel" ? "Meal calories (kcal)" : kind === "recovery" ? "Recovery completed (minutes)" : "Core sets completed";
  const checkRaw = planningSnapshot()[WEEKLY_CHECK_INS_KEY] ?? [];
  const checkIssue = validatePlanningImport({ [WEEKLY_CHECK_INS_KEY]: checkRaw });
  const checks = !checkIssue && Array.isArray(checkRaw) ? checkRaw as WeeklyCheckIn[] : [];
  const issue = kind === "hydration" ? water.issue : kind === "fuel" ? meals.issue : support.issue || (["sleep","stress","soreness"].includes(kind) && checkIssue ? "Weekly check-in history needs review." : "");
  const rows: { id: string; date: string; value: string; notes: string; source: string }[] = kind === "hydration"
    ? water.entries.map(row => ({ ...row, value: `${row.amount} ${row.unit === "ml" ? "ml" : "US fl oz"}`, source: "Water log" }))
    : kind === "fuel" ? meals.meals.map(row => ({ ...row, value: row.calories === null ? "Not reported" : `${row.calories} kcal`, notes: `${row.title}${row.notes ? ` · ${row.notes}` : ""}`, source: "Meal log" }))
    : [...support.rows.filter(row => row.kind === kind).map(row => ({ ...row, value: `${row.value}${row.kind === "bloodPressure" ? `/${row.diastolic}` : ""} ${units}`, source: "Daily entry" })),
      ...(["sleep", "stress", "soreness"].includes(kind) ? checks.map(row => ({ id: row.id, date: localDate(new Date(row.savedAt)), value: `${row[kind as "sleep" | "stress" | "soreness"]}/10`, notes: row.notes, source: "Weekly check-in" })) : [])];
  rows.sort((a,b) => b.date.localeCompare(a.date));
  function save() {
    if (committed.current) return;
    try {
      if (!value.trim()) throw Error("Enter a value before saving.");
      if (issue) throw Error(issue);
      id.current ||= crypto.randomUUID();
      const common = { id: id.current, date, notes };
      if (kind === "hydration") saveWaterEntry({ ...common, amount: Number(value), unit: "ml" }, undefined, account, generation);
      else if (kind === "fuel") saveMeal({ ...common, title, time: "", kind: "", calories: Number(value), protein: null, carbs: null, fat: null }, undefined, account, generation);
      else if (supportKinds.includes(kind as SupportKind)) saveSupportRecord({ ...common, kind: kind as SupportKind, value: Number(value), ...(kind === "bloodPressure" ? { diastolic: Number(diastolic) } : {}) }, account, generation);
      else throw Error("This meter cannot be recorded yet.");
      committed.current = true; setSaved(true); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save this entry."); }
  }
  return <section className="mb-4 rounded-xl border border-white/15 bg-white/[0.025] p-3" aria-label="Support signal records">
    <div className="mb-3 flex gap-2"><button type="button" className={button} aria-pressed={tab === "entry"} onClick={() => setTab("entry")}>Add record</button><button type="button" className={button} aria-pressed={tab === "history"} onClick={() => setTab("history")}>History ({rows.length})</button></div>
    {issue && <p role="alert" className="mb-2 text-sm text-amber-200">{issue}</p>}
    {tab === "entry" ? <form onSubmit={event => { event.preventDefault(); save(); }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3"><label className="text-xs">Date<input type="date" value={date} max={localDate()} required disabled={saved} onChange={event => setDate(event.target.value)} className={field} /></label><label className="text-xs">{label}<input type="number" inputMode="decimal" min={rating ? 1 : kind === "hydration" || kind === "recovery" ? 1 : 0} max={kind === "bloodPressure" ? 300 : rating ? 10 : kind === "core" ? 200 : kind === "recovery" ? 1440 : 10000} step={kind === "recovery" || kind === "hydration" || kind === "fuel" ? "any" : 1} value={value} required disabled={saved} onChange={event => setValue(event.target.value)} className={field} /></label></div>
      {kind === "bloodPressure" && <label className="block text-sm">Diastolic (mmHg)<input type="number" inputMode="numeric" min={20} max={200} value={diastolic} required disabled={saved} onChange={event => setDiastolic(event.target.value)} className={field} /></label>}
      {kind === "fuel" && <label className="block text-xs">Meal name<input value={title} required maxLength={120} disabled={saved} onChange={event => setTitle(event.target.value)} className={field} /></label>}
      <label className="block text-xs">Notes (optional)<input value={notes} maxLength={1000} disabled={saved} onChange={event => setNotes(event.target.value)} className={field} /></label>
      {error && <p role="alert" className="text-sm text-rose-200">{error}</p>}
      {saved ? <div role="status" className="space-y-2 text-sm text-emerald-200"><p>Recorded. {planningStatus}</p><button type="button" className={button} onClick={() => { id.current = ""; committed.current = false; setSaved(false); setValue(""); setNotes(""); setTitle(""); }}>Add another</button></div> : <button type="submit" disabled={!account || Boolean(issue)} className={button}>Save record</button>}
      {(kind === "core" || kind === "recovery") && <p className="text-xs text-slate-400">Log each activity once. These direct entries are separate from workout completion records.</p>}
    </form> : <div className="max-h-72 overflow-auto" data-dashboard-orbiter-local-scroll="true"><table className="w-full text-left text-xs"><caption className="sr-only">Saved {kind} records</caption><thead className="sticky top-0 bg-slate-950"><tr>{["Date", "Value", "Notes", "Source"].map(text => <th key={text} className="p-2">{text}</th>)}</tr></thead><tbody>{rows.map((row,index) => <tr key={`${row.source}:${row.id}:${index}`} className="border-t border-white/10"><td className="whitespace-nowrap p-2">{row.date}</td><td className="whitespace-nowrap p-2">{row.value}</td><td className="min-w-24 break-words p-2">{row.notes || "—"}</td><td className="p-2">{row.source}</td></tr>)}</tbody></table>{!rows.length && <p className="p-3 text-sm text-slate-400">No saved records yet.</p>}</div>}
  </section>;
}

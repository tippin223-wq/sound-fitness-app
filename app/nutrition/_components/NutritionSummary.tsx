"use client";
import Link from "next/link";
import { useState } from "react";
import { useNutritionSummary } from "./useNutritionSummary";
import { nutrientFields } from "@/lib/planning/meals";

export const formatNutrition = (value: number | null, unit = "") => value === null ? "Not reported" : `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value)}${unit ? ` ${unit}` : ""}`;
export const nutrientLabels = { calories: "Energy", protein: "Protein", carbs: "Carbohydrate", fat: "Fat" };
export function NutritionRecoveryNotice({ issues }: { issues: Array<{ label: string; href: string; issue: string }> }) {
  return <section role="alert" aria-label="Nutrition records need review" className="rounded-3xl border border-amber-300/30 p-6 text-amber-200">
    <h1 className="text-2xl font-bold">Review your saved nutrition records</h1>
    <p className="mt-3">Nutrition totals are paused. Original meal and water records remain saved; review and export them before making changes.</p>
    <ul className="mt-4 space-y-3">{issues.map(item => <li key={item.href}><Link href={item.href} className="underline">Review and export {item.label}</Link><p className="mt-1 text-sm">{item.issue}</p></li>)}</ul>
    <Link href="/dashboard/goals" className="mt-4 block underline">Review your nutrition goals</Link>
  </section>;
}
export default function NutritionSummary({ mode }: { mode: "macros" | "calories" | "progress" }) {
  const [date, setDate] = useState("");
  const { today, day, week, targets, issues } = useNutritionSummary(date);
  if (today && issues.length) return <NutritionRecoveryNotice issues={issues} />;
  if (!today || !day) return <p role="status">Loading your reported nutrition…</p>;
  const fields = mode === "calories" ? ["calories"] as const : nutrientFields;
  return <main className="space-y-5">
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-6"><p className="text-xs uppercase tracking-widest text-cyan-200">Nutrition · Reported intake</p><h1 className="mt-3 text-4xl font-bold">{mode === "macros" ? "Your reported macros" : mode === "calories" ? "Your reported energy" : "Your nutrition history"}</h1><p className="mt-3 text-slate-300">Totals include saved meal and water entries only. Unknown values stay unreported. Logging some meals does not establish full daily intake or adherence.</p><div className="mt-4 flex flex-wrap gap-4"><Link href="/nutrition/meals/builder" className="text-cyan-200">Log a meal</Link><Link href="/nutrition/meals/history" className="text-cyan-200">Review meals</Link><Link href="/nutrition/hydration" className="text-cyan-200">Log water</Link><Link href="/dashboard/goals" className="text-cyan-200">Set nutrition goals</Link></div></section>
    <section className="rounded-[28px] border border-white/10 p-6"><div className="flex flex-wrap items-end justify-between gap-4"><h2 className="text-2xl font-bold">Reported on {day.date}</h2><label className="text-sm text-slate-300">Local date<input type="date" max={today} value={day.date} onChange={event => setDate(event.target.value)} className="ml-3 rounded-xl border border-white/20 bg-slate-950 p-3 text-white" /></label><button type="button" onClick={() => setDate("")} className="text-cyan-200">Today</button></div><p className="mt-3 text-slate-400">{day.mealCount} saved meals · {day.waterCount} water entries</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-4">{fields.map(key => <div key={key} className="rounded-2xl border border-white/10 p-4"><h3 className="text-sm text-slate-400">{nutrientLabels[key]}</h3><p className="mt-2 text-xl text-cyan-100">{formatNutrition(day.nutrients[key].value, key === "calories" ? "kcal" : "g")}</p><p className="mt-2 text-xs text-slate-400">Reported for {day.nutrients[key].reported} of {day.mealCount} meals</p></div>)}<div className="rounded-2xl border border-white/10 p-4"><h3 className="text-sm text-slate-400">Water</h3><p className="mt-2 text-xl text-cyan-100">{formatNutrition(day.waterMl, "ml")}</p><p className="mt-2 text-xs text-slate-400">{day.waterCount} reported entries</p></div></div>
      <p className="mt-4 text-sm text-slate-300">Current saved protein goal: {targets.proteinG === null ? "Not set" : `${targets.proteinG} g/day`}. Current saved water goal: {targets.waterOz === null ? "Not set" : `${targets.waterOz} US fl oz/day`}. These are your current targets, including when viewing older records.</p>{mode === "calories" && <p className="mt-3 text-sm text-slate-400">Energy is entered manually for saved meals. Exercise expenditure, energy balance, and a calorie target have not been recorded here.</p>}
    </section>
    <section className="rounded-[28px] border border-white/10 p-6"><h2 className="text-2xl font-bold">Seven-day reported history</h2><p className="mt-2 text-sm text-slate-400">Through {day.date}. Unreported days do not count as missed goals.</p><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Saved nutrition by local day, with coverage for each nutrient</caption><thead className="text-slate-400"><tr><th className="p-3">Date</th><th className="p-3">Meals</th>{fields.map(key => <th key={key} className="p-3">{nutrientLabels[key]}</th>)}<th className="p-3">Water</th></tr></thead><tbody>{week.map(row => <tr key={row.date} className="border-t border-white/10"><td className="p-3"><button type="button" onClick={() => setDate(row.date)} className="text-cyan-200">{row.date}</button></td><td className="p-3">{row.mealCount || "Not reported"}</td>{fields.map(key => <td key={key} className="p-3 whitespace-nowrap">{formatNutrition(row.nutrients[key].value, key === "calories" ? "kcal" : "g")}<span className="mt-1 block text-xs text-slate-400">{row.nutrients[key].reported}/{row.mealCount} meals</span></td>)}<td className="p-3 whitespace-nowrap">{formatNutrition(row.waterMl, "ml")}</td></tr>)}</tbody></table></div></section>
  </main>;
}

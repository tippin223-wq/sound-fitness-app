"use client";

import { usePublishedContent } from "@/lib/usePublishedContent";
import { Palette, Check, X } from "lucide-react";
import { useId, useSyncExternalStore } from "react";
import { planningOwner, subscribePlanning } from "@/lib/planning/store";
import { CALENDAR_THEMES, calendarScrim, clampCalendarOpacity, resolveCalendarTheme } from "@/lib/calendar-themes";

const changed = "sf-calendar-appearance-changed";
const empty = () => "";
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(changed, listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener(changed, listener); };
}

export function useCalendarAppearance(monthKey: string) {
  const releases=usePublishedContent("themes");
  const themes=CALENDAR_THEMES.map(base=>{const live=releases.find(item=>item.source_key===`calendar:${base.id}`);return live?{...base,label:live.title,src:live.fields?.["Asset URL"]||base.src,accent:live.fields?.Accent||base.accent,today:live.fields?.Today||base.today,seasonal:base.seasonal&&live.fields?.["Asset URL"]===base.src}:base;});
  const owner = useSyncExternalStore(subscribePlanning, planningOwner, () => null);
  const key = `sf-app-calendar-appearance:${owner ?? "local"}`;
  const raw = useSyncExternalStore(subscribe, () => { try { return localStorage.getItem(key) ?? ""; } catch { return ""; } }, empty);
  let saved: { theme?: string; opacity?: number } = {};
  try { saved = JSON.parse(raw || "{}"); } catch { /* Ignore invalid browser preferences. */ }
  const selected = themes.find(theme => theme.id === saved?.theme) ?? CALENDAR_THEMES[1];
  const opacity = typeof saved?.opacity === "number" ? clampCalendarOpacity(saved.opacity) : 0.4;
  const theme = resolveCalendarTheme(selected, monthKey);
  function choose(patch: { theme?: string; opacity?: number }) {
    try { localStorage.setItem(key, JSON.stringify({ theme: selected.id, opacity, ...patch })); } catch { /* Storage may be unavailable. */ }
    window.dispatchEvent(new Event(changed));
  }
  return { theme, selected, opacity, choose, themes };
}

export function CalendarBackdrop({ appearance }: { appearance: ReturnType<typeof useCalendarAppearance> }) {
  const { theme, opacity } = appearance;
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit] bg-[#030916]">
    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${theme.src.startsWith("https://")?theme.src:"https://www.thesoundfitness.com"+theme.src}")`, opacity }} />
    <div className="absolute inset-0" style={{ backgroundImage: calendarScrim(opacity) }} />
    <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 18% 8%, ${theme.accent}25, transparent 55%)` }} />
  </div>;
}

export function CalendarAppearancePicker({ appearance, monthKey }: { appearance: ReturnType<typeof useCalendarAppearance>; monthKey: string }) {
  const id = useId();
  const { selected, opacity, choose } = appearance;
  return <>
    <button type="button" popoverTarget={id} aria-label={`Calendar appearance, currently ${selected.label}`} title="Calendar appearance" className="grid size-10 shrink-0 place-items-center rounded-full text-cyan-200 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-200"><Palette className="size-6" /></button>
    <div id={id} popover="auto" aria-label="Calendar appearance" className="fixed inset-0 m-auto max-h-[80dvh] w-[min(340px,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-cyan-200/25 bg-slate-950/95 p-4 text-white shadow-2xl backdrop:bg-black/35">
      <div className="mb-4 flex items-center justify-between"><h3 className="font-bold">Calendar appearance</h3><button type="button" popoverTarget={id} popoverTargetAction="hide" aria-label="Close calendar appearance" className="grid size-9 place-items-center rounded-full hover:bg-white/10"><X className="size-5" /></button></div>
      <label className="mb-4 block text-sm">Photo opacity <output className="float-right font-mono">{Math.round(opacity * 100)}%</output><input type="range" min="0" max="100" step="1" value={Math.round(opacity * 100)} onChange={event => choose({ opacity: Number(event.target.value) / 100 })} className="mt-3 block w-full accent-cyan-300" /></label>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Calendar backgrounds">{appearance.themes.map(entry => {
        const preview = resolveCalendarTheme(entry, monthKey);
        return <button type="button" key={entry.id} aria-pressed={entry.id === selected.id} onClick={() => choose({ theme: entry.id })} className={`relative overflow-hidden rounded-xl border p-2 text-left text-xs ${entry.id === selected.id ? "border-cyan-200 bg-cyan-200/10" : "border-white/15 hover:border-white/45"}`}>
          <span aria-hidden="true" className="mb-2 block h-16 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url("${preview.src.startsWith("https://")?preview.src:"https://www.thesoundfitness.com"+preview.src}")` }} />
          {entry.label}{entry.id === selected.id && <Check aria-hidden="true" className="absolute right-2 top-2 size-5 rounded-full bg-slate-950 text-cyan-200" />}
        </button>;
      })}</div>
    </div>
  </>;
}

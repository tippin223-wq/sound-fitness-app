"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { calendarDateKey, calendarWeekStart } from "@/lib/dashboard-calendar";
import { calendarMonthColor } from "@/lib/calendar-themes";
import { planningSnapshot, subscribePlanning } from "@/lib/planning/store";
import { cloudHistorySnapshot } from "@/lib/planning/availableLogs";
import { recordedTrainingDays } from "@/lib/planning/recordedTrainingDays";
import styles from "./TrainingWeekDotPicker.module.css";

export default function TrainingWeekDotPicker({ today, selectedWeek, onSelect }: { today: Date; selectedWeek: Date; onSelect: (day: Date) => void }) {
  const snapshot = useSyncExternalStore(subscribePlanning, () => JSON.stringify({ values: planningSnapshot(), cloud: cloudHistorySnapshot().logs }), () => '{"values":{},"cloud":[]}');
  const recorded = useMemo(() => { const data = JSON.parse(snapshot); return recordedTrainingDays(data.values, data.cloud, today); }, [snapshot, today]);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(selectedWeek.getFullYear());
  const host = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const selectedKey = calendarDateKey(selectedWeek);
  const todayKey = calendarDateKey(today);
  useEffect(() => {
    if (!open) return;
    popup.current?.focus();
    const outside = (event: PointerEvent) => { if (!host.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  useEffect(() => {
    if (!open || !rail.current) return;
    const month = year === selectedWeek.getFullYear() ? selectedWeek.getMonth() : year === today.getFullYear() ? today.getMonth() : 0;
    const target = rail.current.children.item(Math.max(0, month - 1)) as HTMLElement | null;
    if (target) rail.current.scrollLeft = target.offsetLeft;
  }, [open, year, selectedKey]);
  return <span ref={host} className={styles.host} onPointerDown={event => event.stopPropagation()} onPointerUp={event => event.stopPropagation()} onPointerMove={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
    <button ref={trigger} type="button" aria-label="Choose training week" aria-expanded={open} aria-haspopup="dialog" onClick={() => { if (!open) setYear(selectedWeek.getFullYear()); setOpen(value => !value); }} className={styles.trigger}><ChevronDown aria-hidden="true" size={17} style={{ rotate: open ? "180deg" : "0deg" }} /></button>
    {open && <div ref={popup} role="dialog" aria-label="Choose a day to view its training week" tabIndex={-1} className={styles.popup} data-dashboard-orbiter-local-scroll="true" data-dashboard-wheel-lock="true">
      <div className={styles.toolbar}>
        <button type="button" aria-label="Previous year" onClick={() => setYear(value => value - 1)}><ChevronLeft size={18} /></button>
        <strong>{year}</strong>
        <button type="button" aria-label="Next year" disabled={year >= today.getFullYear()} onClick={() => setYear(value => Math.min(today.getFullYear(), value + 1))}><ChevronRight size={18} /></button>
        <button type="button" className={styles.close} onClick={() => { setOpen(false); trigger.current?.focus(); }}>Done</button>
      </div>
      <div ref={rail} className={styles.rail} aria-label="Months, scroll horizontally">
        {Array.from({ length: 12 }, (_, month) => <section key={month} className={styles.month} style={{ "--month-color": calendarMonthColor(month) } as React.CSSProperties}>
          <h4>{new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(year, month, 1))}</h4>
          <div className={styles.days}>
            {Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, index) => {
              const date = new Date(year, month, index + 1);
              const key = calendarDateKey(date);
              const selected = calendarDateKey(calendarWeekStart(date)) === selectedKey;
              return <button type="button" key={key} title={`${new Intl.DateTimeFormat("en-US", { dateStyle: "full" }).format(date)} · ${key > todayKey ? "Future date" : recorded.has(key) ? "Data recorded" : "No data recorded"}`} aria-label={new Intl.DateTimeFormat("en-US", { dateStyle: "full" }).format(date)} aria-pressed={selected} aria-current={key === todayKey ? "date" : undefined} data-recorded={recorded.has(key) ? "true" : "false"} data-future={key > todayKey ? "true" : "false"} disabled={key > todayKey} onClick={() => { onSelect(date); setOpen(false); trigger.current?.focus(); }} style={{ gridColumnStart: index === 0 ? (date.getDay() || 7) : undefined }}><span /></button>;
            })}
          </div>
        </section>)}
      </div>
      <div className={styles.legend}><span><i data-kind="recorded" />Recorded</span><span><i data-kind="empty" />No entries</span><span><i data-kind="future" />Future</span></div>
    </div>}
  </span>;
}

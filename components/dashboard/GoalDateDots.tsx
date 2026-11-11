"use client";

import { useId, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { calendarMonthColor } from "@/lib/calendar-themes";
import { localDate } from "@/lib/planning/dates";
import { goalDateMilestones } from "@/lib/planning/goalDateMilestones";
import styles from "@/app/dashboard/goals/goals.module.css";

export default function GoalDateDots({value, onChange, today}: {value: string; onChange: (date: string) => void; today: Date}) {
  const rail = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const calendarId = useId();
  const [open, setOpen] = useState(false);
  const startYear = today.getFullYear();
  const selected = value ? new Date(`${value}T12:00:00`) : null;
  const firstYear = Math.min(startYear, selected && Number.isFinite(selected.getTime()) ? selected.getFullYear() : startYear);
  const lastYear = Math.max(startYear + 1, selected && Number.isFinite(selected.getTime()) ? selected.getFullYear() : startYear);
  const months = Array.from({length: (lastYear - firstYear + 1) * 12}, (_, index) => new Date(firstYear, index, 1));
  const initialMonth = selected && Number.isFinite(selected.getTime()) ? selected : today;
  const milestones = goalDateMilestones(today, (lastYear - startYear + 1) * 12);
  const target = selected && Number.isFinite(selected.getTime()) ? selected : null;
  const daysAway = target
    ? (Date.parse(localDate(target)) - Date.parse(localDate(today))) / 86400000
    : 0;
  const dayUnit = Math.abs(daysAway) === 1 ? "day" : "days";
  const distanceLabel = daysAway === 0 ? "days away · today" : `${dayUnit} ${daysAway > 0 ? "away" : "ago"}`;

  function chooseDate(date: string) {
    onChange(date);
    setOpen(false);
    trigger.current?.focus();
  }

  return <section className={styles.goalDatePicker} aria-label="Goal review date" onKeyDown={event => {
    if (event.key !== "Escape" || !open) return;
    event.stopPropagation();
    setOpen(false);
    trigger.current?.focus();
  }}>
    <h3><CalendarDays aria-hidden="true" />Set your target date</h3>
    <button ref={trigger} type="button" className={styles.goalDateTrigger} aria-expanded={open} aria-controls={calendarId} onClick={() => setOpen(!open)}>
      <span className={styles.goalDateReadout} aria-live="polite">
        <span className={styles.goalDateReadoutItem}>
          <small>Target date</small>
          <strong>{target ? target.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric"}) : "Please choose a date"}</strong>
        </span>
        <span className={styles.goalDateReadoutItem}>
          <small>{target ? distanceLabel : "Days away"}</small>
          <strong>{target ? Math.abs(daysAway) : "—"}</strong>
        </span>
      </span>
      <ChevronDown aria-hidden="true" />
    </button>
    <div id={calendarId} hidden={!open}>
    {open && <>
    <p className={styles.goalDateHint}>Milestones count from today.</p>
    <div ref={rail} className={styles.goalMonthRail} role="group" aria-label="Choose a review date by month">
      {months.map(month => <section key={localDate(month)} ref={node => {
        if (node && month.getFullYear() === initialMonth.getFullYear() && month.getMonth() === initialMonth.getMonth() && rail.current && !rail.current.dataset.initialized) {
          rail.current.scrollLeft = node.offsetLeft; rail.current.dataset.initialized = "true";
        }
      }} className={styles.goalDotMonth} style={{"--month-accent": calendarMonthColor(month.getMonth())} as React.CSSProperties}>
        <h4>{month.toLocaleDateString("en-US", {month: "long"})} <span>{month.getFullYear()}</span></h4>
        <div className={styles.goalDotGrid}>
          {["S","M","T","W","T","F","S"].map((day,index) => <span key={index} aria-hidden="true">{day}</span>)}
          {Array.from({length:month.getDay()},(_,index)=><span key={`blank-${index}`} />)}
          {Array.from({length:new Date(month.getFullYear(),month.getMonth()+1,0).getDate()},(_,index)=>{
            const date = new Date(month.getFullYear(),month.getMonth(),index+1);
            const iso = localDate(date);
            const milestone = milestones.find(item => item.date === iso);
            return <button type="button" key={iso} data-milestone={milestone ? "true" : undefined} title={milestone ? `${milestone.label} from today` : undefined} aria-label={`${date.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}${milestone ? ` — ${milestone.label} from today` : ""}`} aria-pressed={value===iso} aria-current={iso===localDate(today)?"date":undefined} onClick={()=>chooseDate(iso)}>{index+1}{milestone && <span className={styles.goalDotBadge} aria-hidden="true">{milestone.short}</span>}</button>;
          })}
        </div>
        <div className={styles.goalMonthMilestones}>{milestones.filter(item => item.date.startsWith(localDate(month).slice(0,7))).map(item => <button type="button" key={item.date} onClick={()=>chooseDate(item.date)}><strong>{item.label}</strong><span>{new Date(`${item.date}T12:00:00`).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span></button>)}</div>
      </section>)}
    </div>
    <nav className={styles.goalQuestionArrows} aria-label="Browse review months">
      <button type="button" aria-label="Earlier months" onClick={()=>rail.current?.scrollBy({left:-rail.current.clientWidth,behavior:"smooth"})}><ChevronLeft aria-hidden="true" /></button>
      <button type="button" aria-label="Later months" onClick={()=>rail.current?.scrollBy({left:rail.current.clientWidth,behavior:"smooth"})}><ChevronRight aria-hidden="true" /></button>
    </nav>
    </>}
    </div>
  </section>;
}

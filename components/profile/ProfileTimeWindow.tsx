"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarClock, Pencil, ChevronRight, Baby, School, Users, Moon } from "lucide-react";
import { AvailabilityGrid } from "./ProfileAvailabilityGrid";

export function parseProfileTimeWindow(value: string): { start: string; end: string } {
  const parts = value.trim().split(/\s*(?:[-–—]|\bto\b)\s*/i);
  const time = (part = "") => {
    const match = part.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (!match) return "";
    if (!match[2] && !match[3]) return "";
    let hour = Number(match[1]);
    const minute = Number(match[2] || 0);
    if (minute > 59 || (match[3] ? hour < 1 || hour > 12 : hour > 23)) return "";
    if (match[3]) hour = hour % 12 + (match[3].toLowerCase() === "pm" ? 12 : 0);
    return `${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}`;
  };
  return parts.length === 2 ? { start: time(parts[0]), end: time(parts[1]) } : { start: "", end: "" };
}

export function summarizeWorkHours(hours: string[]): string[] {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const time = (hour: number) => `${hour % 12 || 12} ${hour % 24 >= 12 ? "PM" : "AM"}`;
  const groups: { days: string[]; ranges: string }[] = [];
  for (const day of days) {
    const selected = [...new Set(hours.flatMap(slot => {
      if (!slot.startsWith(`${day} `)) return [];
      const match = slot.slice(day.length + 1).match(/^(\d{1,2}):00 (AM|PM)$/);
      return match ? [Number(match[1]) % 12 + (match[2] === "PM" ? 12 : 0)] : [];
    }))].sort((a, b) => a - b);
    if (!selected.length) continue;
    const ranges: string[] = [];
    let start = selected[0], end = start + 1;
    for (const hour of selected.slice(1)) {
      if (hour === end) end++;
      else { ranges.push(`${time(start)}–${time(end)}`); start = hour; end = hour + 1; }
    }
    ranges.push(`${time(start)}–${time(end)}`);
    const text = ranges.join(", ");
    const existing = groups.find(group => group.ranges === text);
    if (existing) existing.days.push(day.slice(0, 3));
    else groups.push({ days: [day.slice(0, 3)], ranges: text });
  }
  return groups.map(group => `${group.days.join(", ")}: ${group.ranges}`);
}

export default function ProfileTimeWindow({ label, value, previousEntry, weeklyHours, onWeeklyHoursChange }: {
  label: string; value: string; previousEntry?: string; weeklyHours?: string[]; onWeeklyHoursChange: (updater: (current: string[]) => string[]) => void;
}) {
  const legacy = previousEntry || value.trim();
  const selected = Array.isArray(weeklyHours) ? weeklyHours : [];
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isWork = label === "Work Schedule";
  const isSleep = label === "Sleep Window";
  const titleId = useId();
  const subject = isSleep ? "sleep window" : isWork ? "work schedule" : `${label.toLowerCase()} times`;
  const heading = isSleep ? "Your sleep routine" : isWork ? "Your work week" : `${label} times`;
  const Icon = isSleep ? Moon : label === "Childcare" ? Baby : label === "School" ? School : label === "Family Caregiving" ? Users : CalendarClock;
  const summary = summarizeWorkHours(selected);
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, [open]);
  const sheet = <>
    <p className="text-xs text-slate-300">Tap or drag to select your usual {subject}.</p>
    <AvailabilityGrid label={`${label} weekly hours`} value={selected} onChange={onWeeklyHoursChange} wide />
    {legacy && <p className="whitespace-pre-wrap text-sm text-slate-400">Previous entry: {legacy}</p>}
  </>;
  return <section className="profile-weekly-hours relative min-w-0 text-white" aria-label={label}
    onPointerDown={event => event.stopPropagation()} onPointerMove={event => event.stopPropagation()} onPointerUp={event => event.stopPropagation()} onWheel={event => event.stopPropagation()}>
    {<>
      <button type="button" aria-label={`Click to update your ${subject}`} aria-haspopup="dialog" onClick={() => setOpen(true)} className="profile-work-schedule-action">
        <Icon aria-hidden="true" className="profile-work-schedule-action__watermark" />
        <span className="profile-work-schedule-action__heading">
          <Icon aria-hidden="true" size={22} />
          <span>{heading}</span>
          <Pencil aria-hidden="true" size={16} />
        </span>
        <span className="profile-work-schedule-action__summary">
          {summary.length ? summary.map(line => {
            const split = line.indexOf(":");
            return <span className="profile-work-schedule-action__shift" key={line}>
              <span className="profile-work-schedule-action__days">{line.slice(0, split)}</span>
              <span>{line.slice(split + 2)}</span>
            </span>;
          }) : legacy || `No ${subject} added yet`}
        </span>
        <span className="profile-work-schedule-action__edit">Update {subject} <ChevronRight aria-hidden="true" size={16} /></span>
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <dialog ref={dialogRef} className="profile-schedule-dialog profile-weekly-hours" aria-labelledby={titleId} onCancel={() => setOpen(false)} onClose={() => setOpen(false)}>
          <div className="profile-schedule-dialog__content">
            <header className="flex shrink-0 items-center justify-between gap-4">
              <h2 id={titleId} className="text-xl font-bold text-sky-100">{label}</h2>
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-lg px-4 font-semibold text-sky-100 hover:bg-sky-400/15">Done</button>
            </header>
            {sheet}
          </div>
        </dialog>, document.body)}
    </>}
  </section>;
}

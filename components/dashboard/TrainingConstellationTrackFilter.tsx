"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Filter, type LucideIcon } from "lucide-react";
import type { TrainingConstellationLane } from "@/lib/training-constellation";

type TrackOption = {
  id: TrainingConstellationLane;
  label: string;
  icon: LucideIcon;
  color: string;
  soft: string;
  border: string;
};

type Props = {
  options: readonly TrackOption[];
  selectedIds: readonly TrainingConstellationLane[];
  onChange: (ids: TrainingConstellationLane[]) => void;
};

export default function TrainingConstellationTrackFilter({
  options, selectedIds, onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const popupId = useId();
  const selectedCount = options.filter((option) => selectedIds.includes(option.id)).length;
  const allSelected = selectedCount === options.length;
  const label = allSelected ? "All Tracks" : selectedCount ? `${selectedCount} ${selectedCount === 1 ? "Track" : "Tracks"}` : "No Tracks";

  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const popup = popupRef.current;
    if (!trigger || !popup) return;

    let frame = 0;
    const positionPopup = () => {
      const viewport = window.visualViewport;
      const leftEdge = (viewport?.offsetLeft ?? 0) + 10;
      const topEdge = (viewport?.offsetTop ?? 0) + 10;
      const rightEdge = leftEdge + (viewport?.width ?? window.innerWidth) - 20;
      const bottomEdge = topEdge + (viewport?.height ?? window.innerHeight) - 20;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(280, rightEdge - leftEdge);
      popup.style.width = `${width}px`;
      const below = Math.max(0, bottomEdge - rect.bottom - 8);
      const above = Math.max(0, rect.top - topEdge - 8);
      const showBelow = popup.scrollHeight <= below || below >= above;
      const availableHeight = showBelow ? below : above;
      popup.style.maxHeight = `${availableHeight}px`;
      const height = Math.min(popup.scrollHeight, availableHeight);
      popup.style.left = `${Math.max(leftEdge, Math.min(rect.left, rightEdge - width))}px`;
      popup.style.top = `${Math.max(topEdge, Math.min(showBelow ? rect.bottom + 8 : rect.top - height - 8, bottomEdge - height))}px`;
      popup.style.visibility = "visible";
    };
    const schedulePosition = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(positionPopup);
    };
    const isInside = (target: EventTarget | null) => target instanceof Node && (
      trigger.contains(target) || popup.contains(target)
    );
    const dismissOutside = (event: Event) => {
      if (!isInside(event.target)) setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      trigger.focus({ preventScroll: true });
    };

    // Position before paint, outside the clipped/transformed orbit card.
    positionPopup();
    popup.querySelector<HTMLInputElement>('input[type="checkbox"]')?.focus({ preventScroll: true });
    const observer = new ResizeObserver(schedulePosition);
    observer.observe(trigger);
    observer.observe(popup);
    window.addEventListener("resize", schedulePosition);
    window.addEventListener("scroll", schedulePosition, true);
    window.visualViewport?.addEventListener("resize", schedulePosition);
    window.visualViewport?.addEventListener("scroll", schedulePosition);
    document.addEventListener("pointerdown", dismissOutside, true);
    document.addEventListener("focusin", dismissOutside);
    document.addEventListener("keydown", handleEscape, true);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedulePosition);
      window.removeEventListener("scroll", schedulePosition, true);
      window.visualViewport?.removeEventListener("resize", schedulePosition);
      window.visualViewport?.removeEventListener("scroll", schedulePosition);
      document.removeEventListener("pointerdown", dismissOutside, true);
      document.removeEventListener("focusin", dismissOutside);
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [open]);

  const toggleTrack = (id: TrainingConstellationLane) => {
    const nextSelected = new Set(selectedIds);
    if (nextSelected.has(id)) nextSelected.delete(id);
    else nextSelected.add(id);
    onChange(options.filter((option) => nextSelected.has(option.id)).map((option) => option.id));
  };

  return (
    <div
      className="relative inline-flex shrink-0"
      data-dashboard-orbiter-local-scroll="true"
      data-training-track-filter="true"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <button
        aria-controls={open ? popupId : undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Filter training tracks: ${label}`}
        className="inline-flex min-h-8 items-center gap-2 rounded-xl border border-cyan-200/20 bg-slate-950/80 px-3 py-2 text-[9px] font-black uppercase tracking-[0.13em] text-cyan-100 transition hover:border-cyan-200/45 hover:bg-cyan-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        ref={triggerRef}
        type="button"
      >
        <Filter aria-hidden="true" className="h-3.5 w-3.5 text-cyan-200" />
        {label}
        <ChevronDown aria-hidden="true" className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && createPortal(
        <div
          aria-describedby={`${popupId}-hint`}
          aria-labelledby={`${popupId}-title`}
          className="fixed overflow-y-auto overscroll-contain rounded-2xl border border-cyan-200/20 bg-slate-950 p-3 text-slate-100 shadow-[0_18px_60px_rgba(0,0,0,0.65),0_0_24px_rgba(34,211,238,0.08)]"
          data-dashboard-orbiter-local-scroll="true"
          data-training-track-filter="true"
          id={popupId}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerMove={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
          ref={popupRef}
          role="dialog"
          style={{ zIndex: 10000, visibility: "hidden", scrollbarWidth: "thin" }}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100" id={`${popupId}-title`}>Training Tracks</span>
            <span className="text-[10px] font-semibold text-slate-400">{selectedCount}/{options.length}</span>
          </div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[10px] leading-snug text-slate-400" id={`${popupId}-hint`}>Show any combination.</p>
            <div className="flex shrink-0 gap-3">
              <button className="rounded text-[10px] font-bold text-cyan-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:opacity-35" disabled={allSelected} onClick={() => onChange(options.map((option) => option.id))} type="button">Select All</button>
              <button className="rounded text-[10px] font-bold text-slate-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:opacity-35" disabled={!selectedCount} onClick={() => onChange([])} type="button">Clear</button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {options.map((option) => {
              const checked = selectedIds.includes(option.id);
              const Icon = option.icon;
              return (
                <label
                  className="group relative flex min-h-10 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition hover:brightness-125 focus-within:ring-2 focus-within:ring-cyan-200"
                  key={option.id}
                  style={{
                    background: checked ? option.soft : "rgba(255,255,255,0.025)",
                    borderColor: checked ? option.border : "rgba(255,255,255,0.075)",
                    boxShadow: checked ? `inset 3px 0 0 ${option.color}` : "none",
                  }}
                >
                  <input aria-label={option.label} checked={checked} className="peer sr-only" onChange={() => toggleTrack(option.id)} type="checkbox" />
                  <Icon aria-hidden="true" className="h-4 w-4 shrink-0" style={{ color: option.color, opacity: checked ? 1 : 0.55 }} />
                  <span className={`flex-1 text-xs font-bold ${checked ? "text-slate-100" : "text-slate-400"}`}>{option.label}</span>
                  <span aria-hidden="true" className="grid h-4 w-4 shrink-0 place-items-center rounded border" style={{ borderColor: checked ? option.color : "rgba(148,163,184,0.4)", background: checked ? option.color : "transparent" }}>
                    {checked && <Check className="h-3 w-3 text-slate-950" strokeWidth={3} />}
                  </span>
                </label>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

"use client";

import { useRef } from "react";
import { dialAngle, dialAngleDelta, dialDragValue, dialPointValue } from "@/lib/profileDial";
import { painLevelColor } from "@/lib/trainingAreaCare";
import styles from "./TrainingAreaSelector.module.css";

export default function AreaPainDial({label, value, onChange}: {label: string; value?: number; onChange: (value: number) => void}) {
  const drag = useRef<{id: number; x: number; y: number; angle: number; delta: number; start: number; circular: boolean; moved: boolean} | null>(null);
  const latest = useRef({value, onChange});
  latest.current = {value, onChange};
  const commit = (next: number) => {
    const clamped = Math.max(1, Math.min(10, Math.round(next)));
    if (latest.current.value === clamped) return;
    latest.current.value = clamped; latest.current.onChange(clamped);
  };
  const color = painLevelColor(value);
  return <div role="slider" tabIndex={0} aria-label={`${label} pain level`} aria-valuemin={1} aria-valuemax={10} aria-valuenow={value ?? 1} aria-valuetext={value === undefined ? "Not set" : `${value} of 10`} className={styles.careMeter}
    style={{background: `conic-gradient(${color} ${(value || 0) * 10}%, #33415566 0)`}}
    onPointerDown={event => {
      if (event.button !== 0) return;
      event.preventDefault(); event.stopPropagation();
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2, y = event.clientY - rect.top - rect.height / 2;
      drag.current = {id: event.pointerId, x: event.clientX, y: event.clientY, angle: dialAngle(x, y), delta: 0, start: latest.current.value ?? 1, circular: Math.hypot(x, y) > rect.width * .25, moved: false};
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event => {
      const state = drag.current;
      if (!state || state.id !== event.pointerId) return;
      event.preventDefault(); event.stopPropagation();
      const dx = event.clientX - state.x, dy = event.clientY - state.y;
      if (!state.moved && Math.hypot(dx, dy) < 5) return;
      state.moved = true;
      const rect = event.currentTarget.getBoundingClientRect();
      const angle = dialAngle(event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2);
      state.delta = Math.max((1 - state.start) * 36, Math.min((10 - state.start) * 36, state.delta + dialAngleDelta(state.angle, angle)));
      state.angle = angle;
      commit(state.circular ? dialDragValue(state.start, state.delta, 1, 10) : state.start + (dx - dy) / 12);
    }}
    onPointerUp={event => {
      const state = drag.current;
      if (!state || state.id !== event.pointerId) return;
      event.stopPropagation();
      if (!state.moved) commit(state.circular ? dialPointValue(state.angle, 1, 10) : latest.current.value ?? 1);
      drag.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }}
    onPointerCancel={() => {drag.current = null;}}
    onLostPointerCapture={() => {drag.current = null;}}
    onKeyDown={event => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      commit(event.key === "Home" ? 1 : event.key === "End" ? 10 : (latest.current.value ?? 1) + (["ArrowUp", "ArrowRight"].includes(event.key) ? 1 : -1));
    }}>
    <div><span>{label}</span><small>Pain level</small><strong style={{color}}>{value ?? "—"}<small>/10</small></strong></div>
  </div>;
}

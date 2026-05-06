"use client";

import type { MuscleId } from "./muscleData";
import { getHeatColor, getHeatGlow } from "./heatColor";

type Props = {
  workload: Record<MuscleId, number>;
  selectedMuscle?: MuscleId | null;
  onSelectMuscle?: (id: MuscleId) => void;
};

function Muscle({ id, d, workload, selectedMuscle, onSelectMuscle }: any) {
  const value = workload[id] ?? 0;
  const active = selectedMuscle === id;

  return (
    <path
      d={d}
      fill={getHeatColor(value)}
      stroke={active ? "#fff" : "rgba(255,255,255,0.25)"}
      strokeWidth={active ? 2.5 : 1}
      style={{ filter: getHeatGlow(value) }}
      className="cursor-pointer transition hover:brightness-110"
      onClick={() => onSelectMuscle?.(id)}
    />
  );
}

export default function MaleFrontMap({
  workload,
  selectedMuscle,
  onSelectMuscle,
}: Props) {
  return (
    <svg viewBox="0 0 400 900" className="w-full max-w-[420px]">
      {/* 🔵 subtle glow */}
      <circle cx="200" cy="420" r="320" fill="rgba(34,211,238,0.08)" />

      {/* 🧍 HEAD */}
      <circle cx="200" cy="80" r="40" fill="#94a3b8" />

      {/* 🧍 BODY BASE (lighter, less chunky) */}
      <path
        d="M170 120 C190 140 210 140 230 120 
           L240 180 C220 200 180 200 160 180 Z"
        fill="#cbd5e1"
        opacity="0.6"
      />

      {/* TORSO */}
      <path
        d="M150 180 
           C120 250 130 420 170 520
           C190 560 210 560 230 520
           C270 420 280 250 250 180 Z"
        fill="#e2e8f0"
        opacity="0.6"
      />

      {/* ================= CHEST ================= */}

      <Muscle
        id="upperChest"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M165 185 C180 165 220 165 235 185 C225 215 175 215 165 185 Z"
      />

      <Muscle
        id="midChest"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M165 215 C185 230 215 230 235 215 C230 255 170 255 165 215 Z"
      />

      <Muscle
        id="lowerChest"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M175 260 C190 275 210 275 225 260 C220 295 180 295 175 260 Z"
      />

      {/* ================= SHOULDERS ================= */}

      <Muscle
        id="anteriorDelts"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M130 200 C100 220 95 260 120 290 C150 260 150 220 130 200 Z"
      />

      <Muscle
        id="anteriorDelts"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M270 200 C300 220 305 260 280 290 C250 260 250 220 270 200 Z"
      />

      {/* ================= ARMS ================= */}

      <Muscle
        id="biceps"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M120 300 C95 340 110 430 140 470 C160 430 155 350 120 300 Z"
      />

      <Muscle
        id="biceps"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M280 300 C305 340 290 430 260 470 C240 430 245 350 280 300 Z"
      />

      <Muscle
        id="forearmsFront"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M135 470 C110 520 120 600 150 640 C165 600 165 520 135 470 Z"
      />

      <Muscle
        id="forearmsFront"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M265 470 C290 520 280 600 250 640 C235 600 235 520 265 470 Z"
      />

      {/* ================= CORE ================= */}

      <Muscle
        id="upperAbs"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M185 300 C195 290 205 290 215 300 C215 330 185 330 185 300 Z"
      />

      <Muscle
        id="lowerAbs"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M190 335 C200 325 210 325 220 335 C220 370 190 370 190 335 Z"
      />

      <Muscle
        id="obliques"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M150 300 C140 360 145 450 165 500 C130 470 120 350 150 300 Z"
      />

      <Muscle
        id="obliques"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M250 300 C260 360 255 450 235 500 C270 470 280 350 250 300 Z"
      />

      {/* ================= LEGS ================= */}

      <Muscle
        id="quads"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M165 520 C135 600 140 750 180 800 C205 740 200 600 165 520 Z"
      />

      <Muscle
        id="quads"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M235 520 C265 600 260 750 220 800 C195 740 200 600 235 520 Z"
      />

      <Muscle
        id="tibialisAnterior"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M180 800 C160 830 165 880 190 900 C205 860 205 820 180 800 Z"
      />

      <Muscle
        id="tibialisAnterior"
        workload={workload}
        selectedMuscle={selectedMuscle}
        onSelectMuscle={onSelectMuscle}
        d="M220 800 C240 830 235 880 210 900 C195 860 195 820 220 800 Z"
      />
    </svg>
  );
}

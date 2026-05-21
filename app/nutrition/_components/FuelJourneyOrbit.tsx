"use client";

import Link from "next/link";
import {
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type FuelJourneyStageStatus =
  | "Complete"
  | "Current"
  | "Next"
  | "Unlocked"
  | "Locked";

type FuelJourneyStage = {
  helper: string;
  href: string;
  icon: string;
  nextAction: string;
  progress: number;
  status: FuelJourneyStageStatus;
  title: string;
};

type FuelJourneyOrbitProps = {
  stages: FuelJourneyStage[];
};

const FUEL_JOURNEY_LAYER_SPACING = 265;

const fuelJourneyOrbitStatusStyles: Record<
  FuelJourneyStageStatus,
  {
    badge: string;
    card: string;
    marker: string;
  }
> = {
  Complete: {
    badge: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
    card:
      "border-emerald-300/30 bg-emerald-300/10 text-emerald-50 shadow-[0_0_24px_rgba(16,185,129,0.12)]",
    marker: "border-emerald-200/45 bg-emerald-300 text-slate-950",
  },
  Current: {
    badge: "border-cyan-200/35 bg-cyan-300/14 text-cyan-50",
    card:
      "border-cyan-200/55 bg-cyan-300/14 text-cyan-50 shadow-[0_0_38px_rgba(34,211,238,0.24)] ring-1 ring-cyan-200/20",
    marker:
      "border-cyan-100/70 bg-cyan-300 text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.34)]",
  },
  Next: {
    badge: "border-amber-300/28 bg-amber-300/12 text-amber-100",
    card:
      "border-amber-300/30 bg-amber-300/9 text-amber-50 shadow-[0_0_24px_rgba(251,191,36,0.12)]",
    marker: "border-amber-200/45 bg-amber-300/18 text-amber-100",
  },
  Unlocked: {
    badge: "border-white/10 bg-white/[0.045] text-slate-300",
    card:
      "border-white/10 bg-slate-950/58 text-slate-300 hover:border-cyan-200/32 hover:bg-cyan-300/8 hover:text-white",
    marker: "border-white/12 bg-slate-950/72 text-slate-300",
  },
  Locked: {
    badge: "border-white/10 bg-white/[0.03] text-slate-500",
    card:
      "border-white/10 bg-white/[0.025] text-slate-500 opacity-65 hover:opacity-85",
    marker: "border-white/10 bg-slate-950/70 text-slate-500",
  },
};

const getFuelJourneyUrgencyDotClass = (
  status: FuelJourneyStageStatus,
  isActive: boolean,
) => {
  const shape = isActive ? "h-2.5 w-7" : "h-2.5 w-2.5";
  const tone =
    status === "Complete"
      ? "border-emerald-200/40 bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.45)]"
      : status === "Current"
        ? "border-cyan-100/55 bg-cyan-200 shadow-[0_0_14px_rgba(103,232,249,0.58)]"
        : status === "Next"
          ? "border-amber-100/50 bg-amber-200 shadow-[0_0_14px_rgba(250,204,21,0.55)]"
          : status === "Unlocked"
            ? "border-slate-300/22 bg-slate-300/55"
            : "border-rose-200/20 bg-rose-300/38";

  return `${shape} rounded-full border transition-all duration-300 ${tone}`;
};

const getFuelJourneyVerticalUrgencyDotClass = (
  status: FuelJourneyStageStatus,
  isActive: boolean,
) => {
  const shape = isActive ? "h-7 w-2.5" : "h-2.5 w-2.5";
  const tone =
    status === "Complete"
      ? "border-emerald-200/40 bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.45)]"
      : status === "Current"
        ? "border-cyan-100/55 bg-cyan-200 shadow-[0_0_14px_rgba(103,232,249,0.58)]"
        : status === "Next"
          ? "border-amber-100/50 bg-amber-200 shadow-[0_0_14px_rgba(250,204,21,0.55)]"
          : status === "Unlocked"
            ? "border-slate-300/22 bg-slate-300/55"
            : "border-rose-200/20 bg-rose-300/38";

  return `${shape} rounded-full border transition-all duration-300 ${tone}`;
};

const getFuelJourneyRowUrgencyStatus = (
  rowStages: FuelJourneyStage[],
): FuelJourneyStageStatus => {
  if (rowStages.some((stage) => stage.status === "Current")) return "Current";
  if (rowStages.some((stage) => stage.status === "Next")) return "Next";
  if (rowStages.some((stage) => stage.status === "Unlocked")) return "Unlocked";
  if (rowStages.some((stage) => stage.status === "Locked")) return "Locked";

  return "Complete";
};

export default function FuelJourneyOrbit({ stages }: FuelJourneyOrbitProps) {
  const fuelJourneyPointerStartRef = useRef<{
    x: number;
    y: number;
  } | null>(null);
  const fuelJourneyPointerMovedRef = useRef(false);
  const fuelJourneyRows = useMemo(
    () =>
      [
        {
          helper: "Fuel overview and dashboard command center",
          label: "Fuel Dashboard Hero",
          layerLabel: "Fuel Dashboard",
          startIndex: 0,
          stages: stages.slice(0, 1),
          tone: "border-emerald-200/26 bg-emerald-300/10 text-emerald-100",
        },
        {
          helper: "Meal structure, hydration, calories, protein",
          label: "Daily Fuel Row",
          layerLabel: "Daily Fuel",
          startIndex: 1,
          stages: stages.slice(1, 5),
          tone: "border-cyan-200/26 bg-cyan-300/10 text-cyan-100",
        },
        {
          helper: "Grocery, tracking, AI progress, libraries",
          label: "Plan + Insight Row",
          layerLabel: "Plan + Insight",
          startIndex: 5,
          stages: stages.slice(5),
          tone: "border-amber-200/26 bg-amber-300/10 text-amber-100",
        },
      ]
        .filter((row) => row.stages.length > 0)
        .map((row, layer) => ({ ...row, layer })),
    [stages],
  );
  const getStageRow = (index: number) =>
    fuelJourneyRows.find(
      (row) =>
        index >= row.startIndex && index < row.startIndex + row.stages.length,
    ) || fuelJourneyRows[0];
  const getStageLayer = (index: number) => getStageRow(index)?.layer || 0;
  const getStagePosition = (index: number) => {
    const row = getStageRow(index);

    return row ? index - row.startIndex : 0;
  };
  const initialStageIndex = Math.max(
    0,
    stages.findIndex(
      (stage) => stage.status === "Current" || stage.status === "Next",
    ),
  );
  const initialLayer = getStageLayer(initialStageIndex);
  const initialPositions = useMemo(() => {
    const positions = Array.from(
      { length: Math.max(1, fuelJourneyRows.length) },
      () => 0,
    );

    positions[initialLayer] = getStagePosition(initialStageIndex);

    return positions;
  }, [fuelJourneyRows.length, initialLayer, initialStageIndex]);
  const [activeFuelLayer, setActiveFuelLayer] = useState(initialLayer);
  const [activeFuelPositions, setActiveFuelPositions] =
    useState(initialPositions);
  const totalLayers = Math.max(1, fuelJourneyRows.length);
  const activeFuelRow = fuelJourneyRows[activeFuelLayer] || fuelJourneyRows[0];
  const activeFuelPosition = activeFuelPositions[activeFuelLayer] || 0;
  const activeFuelIndex = Math.min(
    (activeFuelRow?.startIndex || 0) + activeFuelPosition,
    activeFuelRow
      ? activeFuelRow.startIndex + activeFuelRow.stages.length - 1
      : Math.max(0, stages.length - 1),
  );
  const activeFuelStage = stages[Math.min(
    activeFuelIndex,
    Math.max(0, stages.length - 1),
  )] || stages[0];
  const getLayerSize = (layer: number) =>
    Math.max(1, fuelJourneyRows[layer]?.stages.length || 1);
  const getOrbitDistance = (index: number) => {
    const stageLayer = getStageLayer(index);
    const layerSize = getLayerSize(stageLayer);
    const activePosition = Math.min(
      activeFuelPositions[stageLayer] || 0,
      layerSize - 1,
    );
    const stagePosition = getStagePosition(index);
    const rawDistance = stagePosition - activePosition;

    if (rawDistance > layerSize / 2) {
      return rawDistance - layerSize;
    }

    if (rawDistance < -layerSize / 2) {
      return rawDistance + layerSize;
    }

    return rawDistance;
  };
  const getLayerOffset = (index: number) =>
    getStageLayer(index) - activeFuelLayer;
  const rotateFuelJourney = (direction: "left" | "right" | "up" | "down") => {
    if (!stages.length) return;

    if (direction === "up" || direction === "down") {
      setActiveFuelLayer((currentLayer) =>
        direction === "up"
          ? Math.max(0, currentLayer - 1)
          : Math.min(totalLayers - 1, currentLayer + 1),
      );
      return;
    }

    setActiveFuelPositions((currentPositions) => {
      const layerSize = getLayerSize(activeFuelLayer);
      const currentPosition = Math.min(
        currentPositions[activeFuelLayer] || 0,
        layerSize - 1,
      );
      const nextPosition =
        direction === "left" ? currentPosition - 1 : currentPosition + 1;
      const wrappedPosition = (nextPosition + layerSize) % layerSize;
      const nextPositions = [...currentPositions];

      nextPositions[activeFuelLayer] = wrappedPosition;

      return nextPositions;
    });
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      rotateFuelJourney("left");
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      rotateFuelJourney("right");
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      rotateFuelJourney("up");
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      rotateFuelJourney("down");
    }
  };
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    fuelJourneyPointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    fuelJourneyPointerMovedRef.current = false;
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = fuelJourneyPointerStartRef.current;
    if (!start) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const horizontalIntent = Math.abs(deltaX) > Math.abs(deltaY) * 1.1;
    const primaryDelta = horizontalIntent ? deltaX : deltaY;
    if (Math.abs(primaryDelta) < 72) return;

    event.preventDefault();
    event.stopPropagation();
    fuelJourneyPointerMovedRef.current = true;
    rotateFuelJourney(
      horizontalIntent
        ? deltaX > 0
          ? "left"
          : "right"
        : deltaY > 0
          ? "up"
          : "down",
    );
    fuelJourneyPointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
  };
  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    fuelJourneyPointerStartRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  };

  useEffect(() => {
    setActiveFuelLayer((currentLayer) => Math.min(currentLayer, totalLayers - 1));
    setActiveFuelPositions((currentPositions) => {
      const nextPositions = [...currentPositions];

      for (let layer = 0; layer < totalLayers; layer += 1) {
        nextPositions[layer] = Math.min(
          nextPositions[layer] || 0,
          getLayerSize(layer) - 1,
        );
      }

      return nextPositions;
    });
  }, [stages.length, totalLayers]);

  if (!activeFuelStage) return null;

  return (
    <div className="relative left-1/2 mt-6 w-[calc(100%+2rem)] -translate-x-1/2 overflow-hidden px-0 pb-3 pt-0 sm:w-[calc(100%+2.5rem)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[74%] w-[94%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/10 shadow-[0_0_92px_rgba(34,211,238,0.10)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[48%] w-[76%] -translate-x-1/2 -translate-y-1/2 rounded-full border-t border-amber-200/18"
      />

      <div className="relative z-10 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
            Fuel Journey Orbit
          </p>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-400">
            Left and right rotate the active fuel layer. Up and down move
            between the fuel dashboard hero, daily fuel systems, and planning,
            tracking, and insight systems.
          </p>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-slate-950/58 p-3 lg:min-w-[260px]">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Active Layer
            </span>
            <span className="text-sm font-black uppercase tracking-[0.12em] text-cyan-100">
              {activeFuelRow?.layerLabel || "Fuel Journey"}
            </span>
          </div>
          <p className="mt-2 text-xs font-bold text-slate-400">
            Current focus:{" "}
            <span className="text-cyan-100">{activeFuelStage.title}</span>
          </p>
        </div>
      </div>

      <button
        aria-label="Move fuel journey orbit up"
        className="absolute left-1/2 top-[128px] z-30 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-amber-200/28 bg-slate-950/70 text-xl font-black text-amber-100 shadow-[0_0_30px_rgba(250,204,21,0.14)] backdrop-blur transition hover:-translate-y-0.5 hover:border-cyan-200/45 hover:bg-cyan-300/10 hover:text-cyan-50 active:scale-95 sm:h-12 sm:w-12 sm:text-2xl"
        onClick={() => rotateFuelJourney("up")}
        type="button"
      >
        ^
      </button>
      <button
        aria-label="Move fuel journey orbit down"
        className="absolute bottom-[104px] left-1/2 z-30 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-amber-200/28 bg-slate-950/70 text-xl font-black text-amber-100 shadow-[0_0_30px_rgba(250,204,21,0.14)] backdrop-blur transition hover:translate-y-0.5 hover:border-cyan-200/45 hover:bg-cyan-300/10 hover:text-cyan-50 active:scale-95 sm:h-12 sm:w-12 sm:text-2xl"
        onClick={() => rotateFuelJourney("down")}
        type="button"
      >
        v
      </button>
      <div
        aria-label="Fuel journey vertical row selector"
        className="absolute right-3 top-[42%] z-40 flex -translate-y-1/2 flex-col items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/54 px-2 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:right-5"
      >
        {fuelJourneyRows.map((row) => {
          const isActiveRow = row.layer === activeFuelLayer;
          const rowUrgencyStatus = getFuelJourneyRowUrgencyStatus(row.stages);

          return (
            <button
              aria-label={`Show ${row.label}: ${rowUrgencyStatus}`}
              aria-pressed={isActiveRow}
              className={`grid h-9 w-8 place-items-center rounded-xl border transition hover:border-cyan-200/35 hover:bg-cyan-300/10 ${
                isActiveRow
                  ? "border-cyan-100/35 bg-cyan-300/12"
                  : "border-white/10 bg-white/[0.035]"
              }`}
              key={`${row.label}-vertical-selector`}
              onClick={() => setActiveFuelLayer(row.layer)}
              title={`${row.label}: ${rowUrgencyStatus}`}
              type="button"
            >
              <span
                aria-hidden="true"
                className={getFuelJourneyVerticalUrgencyDotClass(
                  rowUrgencyStatus,
                  isActiveRow,
                )}
              />
            </button>
          );
        })}
      </div>
      <button
        aria-label="Previous fuel journey stage"
        className="absolute left-1 top-[58%] z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-200/24 bg-slate-950/64 text-2xl font-black text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.16)] backdrop-blur transition hover:-translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95 sm:left-3 sm:h-14 sm:w-14 sm:text-3xl"
        onClick={() => rotateFuelJourney("left")}
        type="button"
      >
        &lsaquo;
      </button>
      <button
        aria-label="Next fuel journey stage"
        className="absolute right-1 top-[58%] z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-200/24 bg-slate-950/64 text-2xl font-black text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.16)] backdrop-blur transition hover:translate-x-0.5 hover:border-amber-200/45 hover:bg-amber-300/10 hover:text-amber-100 active:scale-95 sm:right-3 sm:h-14 sm:w-14 sm:text-3xl"
        onClick={() => rotateFuelJourney("right")}
        type="button"
      >
        &rsaquo;
      </button>

      <div
        aria-label="Fuel journey orbit selector"
        className="relative z-10 h-[860px] w-full cursor-grab select-none overflow-visible outline-none [perspective:1500px] [touch-action:none] active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-cyan-200/45 sm:h-[920px] lg:h-[940px]"
        onClickCapture={(event) => {
          if (fuelJourneyPointerMovedRef.current) {
            event.preventDefault();
            event.stopPropagation();
            fuelJourneyPointerMovedRef.current = false;
          }
        }}
        onKeyDown={handleKeyDown}
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        tabIndex={0}
      >
        {fuelJourneyRows.map((row) => {
          const isActiveRow = row.layer === activeFuelLayer;
          const rowLayerOffset = row.layer - activeFuelLayer;
          const rowCenterOffset =
            -8 + rowLayerOffset * FUEL_JOURNEY_LAYER_SPACING;
          const unclampedLabelOffset =
            rowCenterOffset - (isActiveRow ? 262 : 220);
          const labelOffset = Math.max(
            -430,
            Math.min(340, unclampedLabelOffset),
          );

          return (
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute left-1/2 top-1/2 z-40 w-[min(90%,420px)] rounded-2xl border px-3 py-2 text-center shadow-[0_16px_44px_rgba(0,0,0,0.30)] backdrop-blur ${row.tone}`}
              key={row.label}
              style={{
                opacity: isActiveRow ? 1 : 0.78,
                transform: `translate(-50%, ${labelOffset}px)`,
                transition: "opacity 360ms ease, transform 560ms cubic-bezier(0.2, 0.8, 0.2, 1)",
              }}
            >
              <div className="text-[9px] font-black uppercase tracking-[0.16em]">
                {row.label}
              </div>
              <div className="mt-1 text-[10px] font-bold leading-4 text-slate-300">
                {row.helper}
              </div>
              <div className="mt-2 flex items-center justify-center gap-1.5 border-t border-white/10 pt-2">
                {row.stages.map((stage, stageIndex) => {
                  const stageGlobalIndex = row.startIndex + stageIndex;
                  const isActiveStageDot = stageGlobalIndex === activeFuelIndex;

                  return (
                    <span
                      aria-hidden="true"
                      className={getFuelJourneyUrgencyDotClass(
                        stage.status,
                        isActiveStageDot,
                      )}
                      key={`${row.label}-${stage.title}-urgency-dot`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {stages.map((stage, index) => {
          const styles = fuelJourneyOrbitStatusStyles[stage.status];
          const isCurrent = stage.status === "Current";
          const isNext = stage.status === "Next";
          const isComplete = stage.status === "Complete";
          const distance = getOrbitDistance(index);
          const absDistance = Math.abs(distance);
          const direction = Math.sign(distance);
          const layerOffset = getLayerOffset(index);
          const absLayerOffset = Math.abs(layerOffset);
          const orbitSlots = [
            { blur: 0, opacity: 1, rotateY: 0, scale: 1, x: 0, y: -8, zIndex: 44 },
            { blur: 0.1, opacity: 0.8, rotateY: -16, scale: 0.74, x: 342, y: 34, zIndex: 32 },
            { blur: 0.95, opacity: 0.34, rotateY: -30, scale: 0.5, x: 520, y: 106, zIndex: 18 },
            { blur: 1.8, opacity: 0.16, rotateY: -40, scale: 0.38, x: 390, y: 150, zIndex: 10 },
            { blur: 2.4, opacity: 0.08, rotateY: -50, scale: 0.32, x: 180, y: 180, zIndex: 6 },
          ];
          const slot = orbitSlots[Math.min(absDistance, orbitSlots.length - 1)];
          const isActiveOrbit = index === activeFuelIndex;
          const isLayerLeadCard = absDistance === 0;
          const isFocusedLayer = absLayerOffset === 0;
          const layerScale = isActiveOrbit
            ? 1.04
            : isLayerLeadCard
              ? isFocusedLayer
                ? 1
                : 0.74
              : absLayerOffset === 0
                ? 1
                : 0.68;
          const layerOpacity = isActiveOrbit
            ? 1
              : isLayerLeadCard
                ? isFocusedLayer
                  ? 1
                  : 0.6
              : absLayerOffset === 0
                ? slot.opacity
                : Math.min(slot.opacity, 0.28);
          const layerBlur = isLayerLeadCard ? absLayerOffset * 0.35 : slot.blur + absLayerOffset * 1.1;
          const layerY = slot.y + layerOffset * FUEL_JOURNEY_LAYER_SPACING;
          const stageRow = getStageRow(index);

          return (
            <Link
              aria-current={isCurrent ? "step" : undefined}
              aria-label={`Open ${stage.title}`}
              className={`group absolute left-1/2 top-1/2 flex min-h-[304px] w-[270px] flex-col justify-between overflow-hidden rounded-[28px] border p-4 text-left shadow-2xl transition-[border-color,background-color,box-shadow] duration-300 sm:w-[340px] ${
                isActiveOrbit
                  ? `${styles.card} !border-cyan-100/75 !bg-slate-950/92 ring-2 ring-cyan-100/45 shadow-[0_30px_94px_rgba(0,0,0,0.58),0_0_48px_rgba(34,211,238,0.34)]`
                  : styles.card
              } ${
                isLayerLeadCard && !isActiveOrbit
                  ? "ring-1 ring-white/15 shadow-[0_26px_78px_rgba(0,0,0,0.46),0_0_34px_rgba(34,211,238,0.18)]"
                  : ""
              }`}
              href={stage.href}
              key={stage.title}
              style={{
                filter: `blur(${layerBlur}px)`,
                opacity: layerOpacity,
                transform: `translate(-50%, -50%) translateX(${
                  direction * slot.x
                }px) translateY(${layerY}px) scale(${
                  slot.scale * layerScale
                }) rotateY(${direction * slot.rotateY}deg)`,
                transition:
                  "transform 560ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 360ms ease, filter 360ms ease",
                zIndex: slot.zIndex - absLayerOffset * 14,
              }}
              title={`${stage.title} - ${stage.nextAction}`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 ${
                  isLayerLeadCard
                    ? isActiveOrbit
                      ? "bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.20),transparent_34%),linear-gradient(180deg,rgba(2,6,23,0.88),rgba(2,6,23,0.72))]"
                      : "bg-slate-950/52"
                    : "bg-slate-950/16"
                }`}
              />
              <span className="pointer-events-none absolute inset-x-4 top-0 h-px rounded-full bg-gradient-to-r from-cyan-200/70 via-amber-200/45 to-transparent" />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-2xl border text-xl ${styles.marker}`}
                    aria-hidden="true"
                  >
                    {isComplete ? "✓" : stage.icon}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${styles.badge}`}
                  >
                    {stage.status}
                  </span>
                </div>

                <h3
                  className={`mt-4 font-black uppercase tracking-tight ${
                    isActiveOrbit
                      ? "text-xl text-white drop-shadow-[0_0_14px_rgba(34,211,238,0.18)]"
                      : "text-lg text-white"
                  }`}
                >
                  {stage.title}
                </h3>
                <span
                  className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${
                    stageRow?.layerLabel === "Fuel Dashboard"
                      ? "border-emerald-200/24 bg-emerald-300/10 text-emerald-100"
                      : stageRow?.layerLabel === "Daily Fuel"
                        ? "border-cyan-200/24 bg-cyan-300/10 text-cyan-100"
                        : "border-amber-200/24 bg-amber-300/10 text-amber-100"
                  }`}
                >
                  {stageRow?.layerLabel || "Fuel Journey"}
                </span>
                <p
                  className={`mt-2 font-semibold ${
                    isActiveOrbit
                      ? "line-clamp-3 text-sm leading-6 text-slate-100"
                      : isLayerLeadCard
                        ? "line-clamp-2 text-xs leading-5 text-slate-200"
                        : "line-clamp-2 text-xs leading-5 text-slate-400"
                  }`}
                >
                  {stage.helper}
                </p>
              </div>

              <div className="relative z-10 mt-4">
                <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                  <span>{stage.progress}%</span>
                  {isCurrent ? (
                    <span className="rounded-full border border-cyan-200/30 bg-cyan-300/12 px-2 py-1 text-cyan-100">
                      Current Focus
                    </span>
                  ) : isNext ? (
                    <span className="rounded-full border border-amber-200/30 bg-amber-300/12 px-2 py-1 text-amber-100">
                      Next
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-1 text-slate-300">
                      {stage.nextAction}
                    </span>
                  )}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-950/80">
                  <span
                    className={`block h-full rounded-full ${
                      isComplete
                        ? "bg-emerald-300"
                        : isCurrent
                          ? "bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.38)]"
                          : isNext
                            ? "bg-amber-300"
                            : "bg-white/20"
                    }`}
                    style={{ width: `${stage.progress}%` }}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="relative z-10 mt-3 flex flex-wrap items-center justify-center gap-2">
        {stages.map((stage, index) => {
          const isActive = index === activeFuelIndex;

          return (
            <button
              aria-label={`Select ${stage.title}`}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                isActive
                  ? "w-8 bg-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.55)]"
                  : "w-2.5 bg-white/18 hover:bg-white/36"
              }`}
              key={`${stage.title}-dot`}
              onClick={() => {
                const targetLayer = getStageLayer(index);
                const targetPosition = getStagePosition(index);

                setActiveFuelLayer(targetLayer);
                setActiveFuelPositions((currentPositions) => {
                  const nextPositions = [...currentPositions];

                  nextPositions[targetLayer] = targetPosition;

                  return nextPositions;
                });
              }}
              type="button"
            />
          );
        })}
      </div>
    </div>
  );
}

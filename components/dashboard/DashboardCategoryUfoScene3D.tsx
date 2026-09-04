"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { BufferGeometry, Material, Object3D } from "three";
import {
  createDashboardWebGlRenderer,
  loadDashboardThree,
  setDashboardWebGlCanvasActive,
} from "./dashboardWebGlRenderer";

type ThreeModule = typeof import("three");

type GeometryObject = Object3D & {
  geometry?: BufferGeometry;
};

type MaterialObject = Object3D & {
  material?: Material | Material[];
};

export type DashboardCategoryUfoChyronItem = {
  color: string;
  id: string;
  level: number;
  levelNumber: number;
  recommendedLabel: string;
  recommendedStatus: string;
  repsLabel: string;
  shortLabel: string;
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const smoothStepNumber = (value: number) => {
  const clampedValue = clampNumber(value, 0, 1);

  return clampedValue * clampedValue * (3 - 2 * clampedValue);
};

// The chyron steps between category tabs instead of crawling: a quick eased
// hop, then a long dead-still hold so the text is actually readable. During
// each hold the centered tab replays its level-progress sweep.
const DASHBOARD_CATEGORY_UFO_CHYRON_HOLD_SECONDS = 10;
const DASHBOARD_CATEGORY_UFO_CHYRON_SLIDE_SECONDS = 0.9;
const DASHBOARD_CATEGORY_UFO_CHYRON_SWEEP_SECONDS = 2.4;
// Redraws per second for the settled part of the hold (see the quantiser in
// the render loop). 4Hz keeps the scanline shimmer alive at ~1/4 the cost.
const DASHBOARD_CATEGORY_UFO_CHYRON_HOLD_REDRAW_HZ = 4;
// Idle time after a manual scrub before the band resumes auto-advancing.
const DASHBOARD_CATEGORY_UFO_CHYRON_MANUAL_HOLD_MS = 10000;
const DASHBOARD_CATEGORY_UFO_CHYRON_PERIOD_SECONDS =
  DASHBOARD_CATEGORY_UFO_CHYRON_HOLD_SECONDS +
  DASHBOARD_CATEGORY_UFO_CHYRON_SLIDE_SECONDS;
// Frozen highlight states show a mid-hold frame: tab centered, sweep
// settled, scrim fully in.
const DASHBOARD_CATEGORY_UFO_CHYRON_PIN_SECONDS =
  DASHBOARD_CATEGORY_UFO_CHYRON_HOLD_SECONDS * 0.55;
const DASHBOARD_CATEGORY_UFO_MAX_DELTA_SECONDS = 1 / 30;
// How long the tractor beam takes to switch off before the ship departs.
const DASHBOARD_CATEGORY_UFO_CLOSE_LIGHT_OUT_SECONDS = 0.16;
// Cap this heavy ambient scene to ~30fps. Motion is delta-timed so it animates
// at the same speed, but doing half the per-frame work keeps the meter menu
// responsive while it is open.
const DASHBOARD_CATEGORY_UFO_MIN_FRAME_MS = 1000 / 32;
const DASHBOARD_CATEGORY_UFO_ACTIVE_CHYRON_TEXTURE_MS = 64;
// During the quick hop the band moves a full tab in under a second — redraw
// near the scene's ~32fps cap so the slide reads smooth, not steppy.
const DASHBOARD_CATEGORY_UFO_SLIDE_CHYRON_TEXTURE_MS = 33;
const DASHBOARD_CATEGORY_UFO_INACTIVE_CHYRON_TEXTURE_MS = 220;
const DASHBOARD_CATEGORY_UFO_TENDRIL_GEOMETRY_MS = 34;
// Matches DashboardTornadoEmeralds3D: after a lost WebGL context, wait briefly
// before rebuilding the whole scene via the contextResetToken effect re-run.
const WEBGL_CONTEXT_RESTART_DELAY_MS = 220;
// When no renderer budget slot is available, retry a rebuild a little later
// instead of giving up until a full page reload — but only a couple of times.
const WEBGL_BUDGET_RETRY_DELAY_MS = 4000;
const WEBGL_BUDGET_RETRY_LIMIT = 2;

const colorToRgba = (color: string, alpha: number) => {
  const rgbMatch = color.match(/rgba?\(([^)]+)\)/i);
  if (rgbMatch) {
    const [red = 103, green = 232, blue = 249] = rgbMatch[1]
      .split(",")
      .map((part) => Number.parseFloat(part.trim()));

    return `rgba(${Math.round(red)}, ${Math.round(green)}, ${Math.round(
      blue,
    )}, ${alpha})`;
  }

  const hexValue = color.trim().replace("#", "");
  if (/^[0-9a-f]{3}$/i.test(hexValue)) {
    const red = Number.parseInt(hexValue[0] + hexValue[0], 16);
    const green = Number.parseInt(hexValue[1] + hexValue[1], 16);
    const blue = Number.parseInt(hexValue[2] + hexValue[2], 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  if (/^[0-9a-f]{6}$/i.test(hexValue)) {
    const red = Number.parseInt(hexValue.slice(0, 2), 16);
    const green = Number.parseInt(hexValue.slice(2, 4), 16);
    const blue = Number.parseInt(hexValue.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  return `rgba(103, 232, 249, ${alpha})`;
};

const createRoundedRectPath = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const resolvedRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + resolvedRadius, y);
  context.lineTo(x + width - resolvedRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + resolvedRadius);
  context.lineTo(x + width, y + height - resolvedRadius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - resolvedRadius,
    y + height,
  );
  context.lineTo(x + resolvedRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - resolvedRadius);
  context.lineTo(x, y + resolvedRadius);
  context.quadraticCurveTo(x, y, x + resolvedRadius, y);
  context.closePath();
};

const ellipsizeCanvasText = (
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) => {
  if (context.measureText(text).width <= maxWidth) return text;

  let shortenedText = text.trim();
  while (
    shortenedText.length > 3 &&
    context.measureText(`${shortenedText}...`).width > maxWidth
  ) {
    shortenedText = shortenedText.slice(0, -1).trimEnd();
  }

  return `${shortenedText || text.slice(0, 1)}...`;
};

const drawWrappedCanvasText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
      return;
    }

    if (currentLine) lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) lines.push(currentLine);

  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines && visibleLines.length > 0) {
    visibleLines[visibleLines.length - 1] = ellipsizeCanvasText(
      context,
      visibleLines[visibleLines.length - 1],
      maxWidth,
    );
  }

  visibleLines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight, maxWidth);
  });
};

type DashboardChyronActorShape =
  | { cx: number; cy: number; kind: "circle"; r: number }
  | { kind: "line"; x1: number; x2: number; y1: number; y2: number }
  | { kind: "polyline"; points: Array<[number, number]> };

const dashboardChyronActorPoses: Record<string, DashboardChyronActorShape[]> = {
  cleanPull: [
    { kind: "line", x1: 17, x2: 47, y1: 42, y2: 42 },
    { cx: 29, cy: 14, kind: "circle", r: 4.3 },
    { kind: "line", x1: 30, x2: 35, y1: 18.5, y2: 34 },
    { kind: "line", x1: 33, x2: 24, y1: 25, y2: 42 },
    { kind: "line", x1: 35, x2: 44, y1: 25, y2: 42 },
    { kind: "polyline", points: [[35, 34], [25, 43], [23, 54]] },
    { kind: "polyline", points: [[35, 34], [43, 43], [45, 54]] },
  ],
  cleanRack: [
    { kind: "line", x1: 17, x2: 47, y1: 23, y2: 23 },
    { cx: 32, cy: 12, kind: "circle", r: 4.3 },
    { kind: "line", x1: 32, x2: 32, y1: 16.5, y2: 34 },
    { kind: "polyline", points: [[20, 23], [30, 26], [24, 31]] },
    { kind: "polyline", points: [[44, 23], [34, 26], [40, 31]] },
    { kind: "line", x1: 32, x2: 25, y1: 34, y2: 52 },
    { kind: "line", x1: 32, x2: 39, y1: 34, y2: 52 },
  ],
  curlHigh: [
    { cx: 32, cy: 10.5, kind: "circle", r: 4.3 },
    { kind: "line", x1: 32, x2: 32, y1: 15, y2: 32 },
    { kind: "polyline", points: [[32, 21], [22, 29], [22, 20]] },
    { kind: "polyline", points: [[32, 21], [42, 29], [42, 20]] },
    { kind: "line", x1: 32, x2: 25, y1: 32, y2: 52 },
    { kind: "line", x1: 32, x2: 39, y1: 32, y2: 52 },
    { kind: "line", x1: 19, x2: 25, y1: 20, y2: 20 },
    { kind: "line", x1: 39, x2: 45, y1: 20, y2: 20 },
  ],
  curlLow: [
    { cx: 32, cy: 10.5, kind: "circle", r: 4.3 },
    { kind: "line", x1: 32, x2: 32, y1: 15, y2: 32 },
    { kind: "line", x1: 32, x2: 20, y1: 21, y2: 38 },
    { kind: "line", x1: 32, x2: 44, y1: 21, y2: 38 },
    { kind: "line", x1: 32, x2: 25, y1: 32, y2: 52 },
    { kind: "line", x1: 32, x2: 39, y1: 32, y2: 52 },
    { kind: "line", x1: 18, x2: 24, y1: 39, y2: 39 },
    { kind: "line", x1: 40, x2: 46, y1: 39, y2: 39 },
  ],
  jackClosed: [
    { cx: 32, cy: 10.5, kind: "circle", r: 4.3 },
    { kind: "line", x1: 32, x2: 32, y1: 15, y2: 32 },
    { kind: "line", x1: 32, x2: 24, y1: 21, y2: 39 },
    { kind: "line", x1: 32, x2: 40, y1: 21, y2: 39 },
    { kind: "line", x1: 32, x2: 28, y1: 32, y2: 52 },
    { kind: "line", x1: 32, x2: 36, y1: 32, y2: 52 },
  ],
  jackOpen: [
    { cx: 32, cy: 8.5, kind: "circle", r: 4.3 },
    { kind: "line", x1: 32, x2: 32, y1: 13, y2: 31 },
    { kind: "line", x1: 32, x2: 17, y1: 20, y2: 7 },
    { kind: "line", x1: 32, x2: 47, y1: 20, y2: 7 },
    { kind: "line", x1: 32, x2: 19, y1: 31, y2: 52 },
    { kind: "line", x1: 32, x2: 45, y1: 31, y2: 52 },
  ],
  legExtensionBent: [
    { kind: "line", x1: 16, x2: 49, y1: 36, y2: 36 },
    { cx: 30, cy: 13, kind: "circle", r: 4.3 },
    { kind: "line", x1: 30, x2: 25, y1: 17.5, y2: 32 },
    { kind: "line", x1: 27, x2: 18, y1: 24, y2: 36 },
    { kind: "line", x1: 27, x2: 42, y1: 33, y2: 38 },
    { kind: "polyline", points: [[42, 38], [44, 47], [50, 52]] },
    { kind: "line", x1: 18, x2: 22, y1: 36, y2: 52 },
    { kind: "line", x1: 45, x2: 49, y1: 36, y2: 52 },
  ],
  legExtensionStraight: [
    { kind: "line", x1: 16, x2: 49, y1: 36, y2: 36 },
    { cx: 30, cy: 13, kind: "circle", r: 4.3 },
    { kind: "line", x1: 30, x2: 25, y1: 17.5, y2: 32 },
    { kind: "line", x1: 27, x2: 18, y1: 24, y2: 36 },
    { kind: "line", x1: 27, x2: 42, y1: 33, y2: 38 },
    { kind: "line", x1: 42, x2: 56, y1: 38, y2: 37 },
    { kind: "line", x1: 18, x2: 22, y1: 36, y2: 52 },
    { kind: "line", x1: 45, x2: 49, y1: 36, y2: 52 },
  ],
  mobilityLeft: [
    { cx: 32, cy: 11, kind: "circle", r: 4.3 },
    { kind: "line", x1: 32, x2: 29, y1: 15.5, y2: 33 },
    { kind: "line", x1: 31, x2: 18, y1: 21, y2: 12 },
    { kind: "line", x1: 31, x2: 44, y1: 21, y2: 30 },
    { kind: "line", x1: 29, x2: 20, y1: 33, y2: 52 },
    { kind: "line", x1: 29, x2: 41, y1: 33, y2: 52 },
  ],
  mobilityRight: [
    { cx: 32, cy: 11, kind: "circle", r: 4.3 },
    { kind: "line", x1: 32, x2: 35, y1: 15.5, y2: 33 },
    { kind: "line", x1: 33, x2: 46, y1: 21, y2: 12 },
    { kind: "line", x1: 33, x2: 20, y1: 21, y2: 30 },
    { kind: "line", x1: 35, x2: 23, y1: 33, y2: 52 },
    { kind: "line", x1: 35, x2: 44, y1: 33, y2: 52 },
  ],
  neckCenter: [
    { cx: 32, cy: 11, kind: "circle", r: 4.3 },
    { kind: "line", x1: 32, x2: 32, y1: 15.5, y2: 34 },
    { kind: "line", x1: 32, x2: 23, y1: 22, y2: 32 },
    { kind: "line", x1: 32, x2: 41, y1: 22, y2: 32 },
    { kind: "line", x1: 32, x2: 26, y1: 34, y2: 52 },
    { kind: "line", x1: 32, x2: 38, y1: 34, y2: 52 },
    { kind: "polyline", points: [[25, 8], [28, 4], [36, 4], [39, 8]] },
  ],
  neckTilt: [
    { cx: 36, cy: 12, kind: "circle", r: 4.3 },
    { kind: "line", x1: 33, x2: 32, y1: 16, y2: 34 },
    { kind: "line", x1: 32, x2: 23, y1: 22, y2: 32 },
    { kind: "line", x1: 32, x2: 41, y1: 22, y2: 32 },
    { kind: "line", x1: 32, x2: 26, y1: 34, y2: 52 },
    { kind: "line", x1: 32, x2: 38, y1: 34, y2: 52 },
    { kind: "polyline", points: [[29, 8], [32, 5], [39, 6], [42, 11]] },
  ],
  pressOverhead: [
    { kind: "line", x1: 16, x2: 48, y1: 7, y2: 7 },
    { cx: 32, cy: 17, kind: "circle", r: 4.3 },
    { kind: "line", x1: 32, x2: 32, y1: 21.5, y2: 36 },
    { kind: "line", x1: 32, x2: 22, y1: 24, y2: 7 },
    { kind: "line", x1: 32, x2: 42, y1: 24, y2: 7 },
    { kind: "line", x1: 32, x2: 25, y1: 36, y2: 52 },
    { kind: "line", x1: 32, x2: 39, y1: 36, y2: 52 },
  ],
  pressRack: [
    { kind: "line", x1: 17, x2: 47, y1: 22, y2: 22 },
    { cx: 32, cy: 12, kind: "circle", r: 4.3 },
    { kind: "line", x1: 32, x2: 32, y1: 16.5, y2: 33 },
    { kind: "polyline", points: [[32, 23], [23, 28], [17, 22]] },
    { kind: "polyline", points: [[32, 23], [41, 28], [47, 22]] },
    { kind: "line", x1: 32, x2: 25, y1: 33, y2: 52 },
    { kind: "line", x1: 32, x2: 39, y1: 33, y2: 52 },
  ],
  pullReach: [
    { kind: "line", x1: 12, x2: 52, y1: 15, y2: 15 },
    { cx: 32, cy: 24, kind: "circle", r: 4.3 },
    { kind: "line", x1: 32, x2: 32, y1: 28.5, y2: 42 },
    { kind: "line", x1: 32, x2: 22, y1: 31, y2: 16 },
    { kind: "line", x1: 32, x2: 42, y1: 31, y2: 16 },
    { kind: "line", x1: 32, x2: 25, y1: 42, y2: 54 },
    { kind: "line", x1: 32, x2: 39, y1: 42, y2: 54 },
  ],
  pullRow: [
    { kind: "line", x1: 12, x2: 52, y1: 15, y2: 15 },
    { cx: 32, cy: 19, kind: "circle", r: 4.3 },
    { kind: "line", x1: 32, x2: 32, y1: 23.5, y2: 39 },
    { kind: "line", x1: 32, x2: 22, y1: 27, y2: 22 },
    { kind: "line", x1: 32, x2: 42, y1: 27, y2: 22 },
    { kind: "line", x1: 32, x2: 24, y1: 39, y2: 53 },
    { kind: "line", x1: 32, x2: 40, y1: 39, y2: 53 },
  ],
  situpDown: [
    { cx: 18, cy: 38, kind: "circle", r: 4.3 },
    { kind: "line", x1: 22, x2: 42, y1: 39, y2: 42 },
    { kind: "polyline", points: [[17, 35], [12, 31], [15, 28]] },
    { kind: "polyline", points: [[19, 36], [15, 31], [18, 28]] },
    { kind: "polyline", points: [[42, 42], [48, 34], [55, 34]] },
    { kind: "polyline", points: [[42, 42], [51, 48], [57, 48]] },
  ],
  situpUp: [
    { cx: 28, cy: 22, kind: "circle", r: 4.3 },
    { kind: "line", x1: 30, x2: 42, y1: 26, y2: 41 },
    { kind: "polyline", points: [[27, 20], [21, 16], [23, 12]] },
    { kind: "polyline", points: [[29, 20], [25, 15], [28, 12]] },
    { kind: "polyline", points: [[42, 41], [48, 34], [55, 34]] },
    { kind: "polyline", points: [[42, 41], [51, 48], [57, 48]] },
  ],
  squatDown: [
    { kind: "line", x1: 12, x2: 52, y1: 21, y2: 21 },
    { cx: 32, cy: 15.5, kind: "circle", r: 4.3 },
    { kind: "line", x1: 32, x2: 32, y1: 20, y2: 36 },
    { kind: "line", x1: 32, x2: 17, y1: 24, y2: 21 },
    { kind: "line", x1: 32, x2: 47, y1: 24, y2: 21 },
    { kind: "polyline", points: [[32, 36], [22, 43], [17, 52]] },
    { kind: "polyline", points: [[32, 36], [42, 43], [47, 52]] },
    { kind: "line", x1: 14, x2: 24, y1: 52, y2: 52 },
    { kind: "line", x1: 40, x2: 50, y1: 52, y2: 52 },
  ],
  squatUp: [
    { kind: "line", x1: 14, x2: 50, y1: 16, y2: 16 },
    { cx: 32, cy: 10.5, kind: "circle", r: 4.3 },
    { kind: "line", x1: 32, x2: 32, y1: 15, y2: 31 },
    { kind: "line", x1: 32, x2: 18, y1: 20, y2: 16 },
    { kind: "line", x1: 32, x2: 46, y1: 20, y2: 16 },
    { kind: "polyline", points: [[32, 31], [25, 40], [23, 52]] },
    { kind: "polyline", points: [[32, 31], [39, 40], [41, 52]] },
    { kind: "line", x1: 20, x2: 28, y1: 52, y2: 52 },
    { kind: "line", x1: 36, x2: 44, y1: 52, y2: 52 },
  ],
};

const dashboardChyronActorMotionByCategory: Record<
  string,
  { poses: [string, string]; speed: number }
> = {
  "arm-isolation": { poses: ["curlLow", "curlHigh"], speed: 2.7 },
  athletic: { poses: ["jackClosed", "jackOpen"], speed: 5.8 },
  cervical: { poses: ["neckCenter", "neckTilt"], speed: 2.4 },
  core: { poses: ["situpDown", "situpUp"], speed: 2.9 },
  integrated: { poses: ["cleanPull", "cleanRack"], speed: 2.6 },
  "lower-compound": { poses: ["squatUp", "squatDown"], speed: 3.4 },
  "lower-isolation": {
    poses: ["legExtensionBent", "legExtensionStraight"],
    speed: 3.1,
  },
  mobility: { poses: ["mobilityLeft", "mobilityRight"], speed: 2.5 },
  "upper-pull": { poses: ["pullReach", "pullRow"], speed: 2.8 },
  "upper-push": { poses: ["pressRack", "pressOverhead"], speed: 2.7 },
};

const drawDashboardChyronActorPose = (
  context: CanvasRenderingContext2D,
  pose: DashboardChyronActorShape[],
  size: number,
  opacity: number,
) => {
  context.save();
  context.globalAlpha *= opacity;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = size * 0.062;

  const resolveX = (value: number) => (value - 32) * (size / 64);
  const resolveY = (value: number) => (value - 32) * (size / 64);

  pose.forEach((shape) => {
    if (shape.kind === "circle") {
      context.beginPath();
      context.arc(
        resolveX(shape.cx),
        resolveY(shape.cy),
        shape.r * (size / 64),
        0,
        Math.PI * 2,
      );
      context.fill();
      context.stroke();
      return;
    }

    context.beginPath();
    if (shape.kind === "line") {
      context.moveTo(resolveX(shape.x1), resolveY(shape.y1));
      context.lineTo(resolveX(shape.x2), resolveY(shape.y2));
    } else {
      shape.points.forEach(([pointX, pointY], index) => {
        if (index === 0) {
          context.moveTo(resolveX(pointX), resolveY(pointY));
          return;
        }

        context.lineTo(resolveX(pointX), resolveY(pointY));
      });
    }
    context.stroke();
  });

  context.restore();
};

const drawDashboardChyronActor = (
  context: CanvasRenderingContext2D,
  categoryId: string,
  x: number,
  y: number,
  size: number,
  color: string,
  alpha: number,
  seconds: number,
) => {
  context.save();
  context.translate(x, y);
  context.globalAlpha *= 0.66 + alpha * 0.34;

  context.strokeStyle = "rgba(248, 250, 252, 0.98)";
  context.fillStyle = "rgba(248, 250, 252, 0.98)";
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = size * 0.06;
  context.shadowBlur = size * 0.22;
  context.shadowColor = colorToRgba(color, 1);

  const motion =
    dashboardChyronActorMotionByCategory[categoryId] ||
    dashboardChyronActorMotionByCategory.mobility;
  const motionPhase = 0.5 + Math.sin(seconds * motion.speed) * 0.5;
  const easedPhase = smoothStepNumber(motionPhase);
  const firstPose =
    dashboardChyronActorPoses[motion.poses[0]] ||
    dashboardChyronActorPoses.mobilityLeft;
  const secondPose =
    dashboardChyronActorPoses[motion.poses[1]] ||
    dashboardChyronActorPoses.mobilityRight;

  context.save();
  context.globalAlpha *= 0.52 + alpha * 0.28;
  context.strokeStyle = colorToRgba(color, 0.98);
  context.fillStyle = colorToRgba(color, 0.86);
  context.lineWidth = size * 0.092;
  context.shadowBlur = size * 0.46;
  context.shadowColor = colorToRgba(color, 1);
  drawDashboardChyronActorPose(context, firstPose, size * 1.08, 1 - easedPhase);
  drawDashboardChyronActorPose(context, secondPose, size * 1.08, easedPhase);
  context.restore();

  context.save();
  context.globalAlpha *= 0.28 + alpha * 0.18;
  context.strokeStyle = "rgba(255, 255, 255, 0.96)";
  context.fillStyle = "rgba(255, 255, 255, 0.88)";
  context.lineWidth = size * 0.084;
  context.shadowBlur = size * 0.34;
  context.shadowColor = "rgba(255, 255, 255, 0.78)";
  drawDashboardChyronActorPose(context, firstPose, size * 1.02, 1 - easedPhase);
  drawDashboardChyronActorPose(context, secondPose, size * 1.02, easedPhase);
  context.restore();

  drawDashboardChyronActorPose(context, firstPose, size, 1 - easedPhase);
  drawDashboardChyronActorPose(context, secondPose, size, easedPhase);

  context.restore();
};

const drawDashboardCategoryUfoChyronTexture = ({
  activeCategoryId,
  canvas,
  context,
  items,
  manual,
  seconds,
}: {
  activeCategoryId?: string;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  items: DashboardCategoryUfoChyronItem[];
  /** Manual scrub: pins the band to `base` and slides by a signed
      progress (-1..1) instead of running off the auto clock. */
  manual?: { base: number; progress: number } | null;
  seconds: number;
}) => {
  const width = canvas.width;
  const height = canvas.height;
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.id === activeCategoryId),
  );
  const itemCount = Math.max(1, items.length);
  const tabFrameBleed = 18;
  const tabWidth = width - 48 + tabFrameBleed * 2;
  const tabStep = tabWidth;
  const tabHeight = 552;
  const tabY = 12;
  const holdSeconds = DASHBOARD_CATEGORY_UFO_CHYRON_HOLD_SECONDS;
  const slideSeconds = DASHBOARD_CATEGORY_UFO_CHYRON_SLIDE_SECONDS;
  const periodSeconds = DASHBOARD_CATEGORY_UFO_CHYRON_PERIOD_SECONDS;
  // Manual scrub pins the cycle and drives the hop itself; otherwise the
  // position comes off the auto clock. A settled manual hold reports a phase
  // past the sweep so the band renders in its readable resting state.
  const cycleCount = manual ? manual.base : Math.floor(seconds / periodSeconds);
  const phaseSeconds = manual
    ? manual.progress !== 0
      ? holdSeconds + Math.abs(manual.progress) * slideSeconds
      : 3.2
    : seconds - cycleCount * periodSeconds;
  // Quick eased hop between tabs; the rest of the period is a readable hold.
  const slideProgress = manual
    ? manual.progress
    : phaseSeconds > holdSeconds
      ? smoothStepNumber((phaseSeconds - holdSeconds) / slideSeconds)
      : 0;
  const rawPosition = cycleCount + slideProgress;
  // Level-progress sweep replays at the start of each hold; the readability
  // overlay (scrim, sweep edge, percent counter) eases in with it and eases
  // out just before the next hop.
  const holdSweepProgress = smoothStepNumber(phaseSeconds / 2.2);
  const holdOverlayAlpha =
    slideProgress !== 0
      ? 0
      : smoothStepNumber(phaseSeconds / 0.7) *
        (1 -
          smoothStepNumber((phaseSeconds - (holdSeconds - 0.45)) / 0.45));
  const cyclePosition =
    itemCount > 1
      ? ((rawPosition % itemCount) + itemCount) % itemCount
      : 0;
  const centeredItemIndex =
    itemCount > 1
      ? (activeIndex + Math.round(cyclePosition)) % itemCount
      : activeIndex;
  const activeAccent =
    items[centeredItemIndex]?.color || "rgba(103, 232, 249, 1)";

  context.clearRect(0, 0, width, height);
  context.save();

  const shellGradient = context.createLinearGradient(0, 0, width, height);
  shellGradient.addColorStop(0, "rgba(2, 6, 23, 0)");
  shellGradient.addColorStop(0.18, colorToRgba(activeAccent, 0.28));
  shellGradient.addColorStop(0.5, "rgba(2, 6, 23, 0.88)");
  shellGradient.addColorStop(0.82, colorToRgba(activeAccent, 0.24));
  shellGradient.addColorStop(1, "rgba(2, 6, 23, 0)");
  context.fillStyle = shellGradient;
  createRoundedRectPath(context, 20, 10, width - 40, height - 20, 46);
  context.fill();

  context.globalAlpha = 0.54;
  context.strokeStyle = colorToRgba(activeAccent, 0.54);
  context.lineWidth = 4;
  context.stroke();
  context.globalAlpha = 1;

  const drawEntries = items
    .map((item, index) => {
      let relativePosition = index - activeIndex - cyclePosition;

      if (itemCount > 1) {
        relativePosition =
          ((((relativePosition + itemCount / 2) % itemCount) + itemCount) %
            itemCount) -
          itemCount / 2;
      }

      return {
        centerX: width / 2 + relativePosition * tabStep,
        item,
        relativePosition,
      };
    })
    .filter(
      ({ relativePosition }) =>
        itemCount <= 2 || Math.abs(relativePosition) <= 2.12,
    )
    .sort(
      (leftEntry, rightEntry) =>
        Math.abs(rightEntry.relativePosition) -
        Math.abs(leftEntry.relativePosition),
    );

  const scanOffset = (seconds * 28) % 54;
  context.save();
  createRoundedRectPath(context, 24, 8, width - 48, height - 16, 34);
  context.clip();

  const frameBaseGradient = context.createLinearGradient(0, 8, width, height - 8);
  frameBaseGradient.addColorStop(0, colorToRgba(activeAccent, 0.34));
  frameBaseGradient.addColorStop(0.5, "rgba(2, 6, 23, 0.72)");
  frameBaseGradient.addColorStop(1, colorToRgba(activeAccent, 0.34));
  context.fillStyle = frameBaseGradient;
  context.fillRect(0, 8, width, height - 16);

  for (const { centerX, item, relativePosition } of drawEntries) {
    const underlayX = centerX - tabWidth / 2 - tabFrameBleed * 3;
    const underlayWidth = tabWidth + tabFrameBleed * 6;
    const underlayStrength = clampNumber(
      1 - Math.abs(relativePosition) / 1.45,
      0.18,
      0.86,
    );
    const underlayGradient = context.createLinearGradient(
      underlayX,
      0,
      underlayX + underlayWidth,
      0,
    );

    underlayGradient.addColorStop(0, colorToRgba(item.color, 0.18));
    underlayGradient.addColorStop(0.18, colorToRgba(item.color, 0.38));
    underlayGradient.addColorStop(0.5, colorToRgba(item.color, 0.62));
    underlayGradient.addColorStop(0.82, colorToRgba(item.color, 0.38));
    underlayGradient.addColorStop(1, colorToRgba(item.color, 0.18));

    context.save();
    context.globalAlpha = underlayStrength;
    context.fillStyle = underlayGradient;
    context.fillRect(underlayX, 8, underlayWidth, height - 16);
    context.restore();
  }

  context.lineWidth = 2;
  for (let x = -54 + scanOffset; x < width + 54; x += 54) {
    context.strokeStyle = "rgba(255, 255, 255, 0.09)";
    context.beginPath();
    context.moveTo(x, 8);
    context.lineTo(x + 24, height - 8);
    context.stroke();
  }

  const flashX = (seconds * 96) % (width + 420) - 210;
  const flashGradient = context.createLinearGradient(
    flashX - 180,
    0,
    flashX + 180,
    0,
  );
  flashGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
  flashGradient.addColorStop(0.5, colorToRgba(activeAccent, 0.42));
  flashGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = flashGradient;
  context.fillRect(flashX - 180, 10, 360, height - 20);

  for (const { centerX, item, relativePosition } of drawEntries) {
    const distanceStrength = clampNumber(
      1 - Math.abs(centerX - width / 2) / (tabStep * 1.42),
      0.12,
      1,
    );
    const x = centerX - tabWidth / 2;
    // The centered, held tab replays its level sweep each hold. The tab
    // sliding in from the right drains as it arrives so it lands empty and
    // the sweep reads as a build, not a one-frame reset. Everything else
    // shows the settled fill.
    const isHeldEntry =
      slideProgress === 0 && Math.abs(relativePosition) < 0.03;
    // The tab travelling toward centre is on the right when sliding forward
    // and on the left when scrubbing backward.
    const isIncomingEntry =
      slideProgress !== 0 &&
      (slideProgress > 0
        ? relativePosition > 0.001 && relativePosition < 1.001
        : relativePosition < -0.001 && relativePosition > -1.001);
    const fillReveal = isHeldEntry
      ? holdSweepProgress
      : isIncomingEntry
        ? 1 - Math.abs(slideProgress)
        : 1;
    const progressWidth =
      tabWidth * clampNumber(item.level / 100, 0.04, 1) * fillReveal;
    const depthScale = 0.74 + distanceStrength * 0.26;
    const depthY = (tabHeight * (1 - depthScale)) / 2;
    const depthDrop = (1 - distanceStrength) * 30;

    context.save();
    context.globalAlpha = 0.18 + distanceStrength * 0.82;
    context.translate(x, tabY + depthY + depthDrop);
    context.scale(1, depthScale);

    const tabGradient = context.createLinearGradient(0, 0, tabWidth, tabHeight);
    tabGradient.addColorStop(0, colorToRgba(item.color, 0.64));
    tabGradient.addColorStop(0.45, colorToRgba(item.color, 0.22));
    tabGradient.addColorStop(0.58, "rgba(2, 6, 23, 0.8)");
    tabGradient.addColorStop(1, colorToRgba(item.color, 0.36));
    context.fillStyle = tabGradient;
    context.fillRect(0, 0, tabWidth, tabHeight);

    const fillGradient = context.createLinearGradient(0, 0, progressWidth, 0);
    fillGradient.addColorStop(0, colorToRgba(item.color, 0.96));
    fillGradient.addColorStop(0.55, colorToRgba(item.color, 0.72));
    fillGradient.addColorStop(1, colorToRgba(item.color, 0.22));
    context.fillStyle = fillGradient;
    context.shadowBlur = 22 + distanceStrength * 20;
    context.shadowColor = colorToRgba(item.color, 0.95);
    context.fillRect(0, 0, progressWidth, tabHeight);
    context.shadowBlur = 0;

    context.strokeStyle = colorToRgba(item.color, 0.86);
    context.lineWidth = 4;
    context.strokeRect(0, 0, tabWidth, tabHeight);

    context.strokeStyle = "rgba(255, 255, 255, 0.16)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, 4);
    context.lineTo(tabWidth, 4);
    context.moveTo(0, tabHeight - 5);
    context.lineTo(tabWidth, tabHeight - 5);
    context.stroke();

    if (isHeldEntry && holdOverlayAlpha > 0.01) {
      // Dark glass so the copy reads over the level fill while the tab is
      // held still. It spans the WHOLE tab: an inset scrim starting partway
      // across dimmed only the fill beyond that point, which read as the
      // level bar stopping there — a false edge at ~22% of the tab that had
      // nothing to do with the real level.
      context.save();
      context.globalAlpha = 0.58 * holdOverlayAlpha;
      const scrimGradient = context.createLinearGradient(0, 0, 0, tabHeight);
      scrimGradient.addColorStop(0, "rgba(2, 6, 23, 0.68)");
      scrimGradient.addColorStop(0.5, "rgba(2, 6, 23, 0.5)");
      scrimGradient.addColorStop(1, "rgba(2, 6, 23, 0.68)");
      context.fillStyle = scrimGradient;
      createRoundedRectPath(context, 20, 18, tabWidth - 40, tabHeight - 36, 30);
      context.fill();
      context.restore();

      // Re-lay the filled portion over the glass so the bar still reads as
      // filled to its true level — the glass dims everything equally, this
      // puts the level's own brightness back on top of it.
      context.save();
      context.globalAlpha = 0.42 * holdOverlayAlpha;
      const litFill = context.createLinearGradient(0, 0, progressWidth, 0);
      litFill.addColorStop(0, colorToRgba(item.color, 0.95));
      litFill.addColorStop(0.62, colorToRgba(item.color, 0.72));
      litFill.addColorStop(1, colorToRgba(item.color, 0.4));
      context.fillStyle = litFill;
      createRoundedRectPath(
        context,
        20,
        18,
        Math.max(0, progressWidth - 20),
        tabHeight - 36,
        30,
      );
      context.fill();
      context.restore();

      // Sweep edge: a glowing seek-line that rides the fill as it grows to
      // the current level, then pulses softly in place.
      const edgeX = clampNumber(progressWidth, 6, tabWidth - 6);
      const edgePulse = 0.68 + 0.32 * Math.sin(seconds * 4.2);
      context.save();
      context.globalAlpha = holdOverlayAlpha * edgePulse;
      const edgeGlow = context.createLinearGradient(
        edgeX - 46,
        0,
        edgeX + 46,
        0,
      );
      edgeGlow.addColorStop(0, "rgba(255, 255, 255, 0)");
      edgeGlow.addColorStop(0.5, "rgba(255, 255, 255, 0.5)");
      edgeGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
      context.fillStyle = edgeGlow;
      context.fillRect(edgeX - 46, 8, 92, tabHeight - 16);
      context.fillStyle = "rgba(255, 255, 255, 0.95)";
      context.fillRect(edgeX - 4, 8, 8, tabHeight - 16);
      context.restore();
    }

    const actorX = 300;
    const textX = tabWidth * 0.52;
  
    drawDashboardChyronActor(
      context,
      item.id,
      actorX,
      tabHeight / 2,
      395,
      item.color,
      distanceStrength,
      seconds,
    );

    if (isHeldEntry && holdOverlayAlpha > 0.01) {
      // Live percent counter ticking up with the sweep — the explicit
      // level-progress readout. Drawn after the actor so athletic poses
      // can't glow-wash it.
      const levelPercent = Math.round(
        clampNumber(item.level, 0, 100) * holdSweepProgress,
      );
      context.save();
      context.globalAlpha = holdOverlayAlpha;
      context.textAlign = "left";
      context.textBaseline = "middle";
      context.font = "950 87px Arial, sans-serif";
      context.shadowBlur = 26;
      context.shadowColor = "rgba(2, 6, 23, 0.95)";
      context.fillStyle = "rgba(255, 255, 255, 0.98)";
      context.fillText(`${levelPercent}%`, 76, 84);
      context.restore();
    }

    context.textAlign = "center";
    context.textBaseline = "middle";
    context.shadowBlur = 58;
    context.shadowColor = colorToRgba(item.color, 0.96);
    context.fillStyle = "rgba(255, 255, 255, 0.99)";
    context.font = "950 132px Arial, sans-serif";
    context.fillText(
      ellipsizeCanvasText(
        context,
        `${item.shortLabel} LV ${item.levelNumber}`,
        1400,
      ),
      textX,
      212,
      1420,
    );

    // Reps remaining now carries this row on its own — the recommendation
    // copy that used to sit here was dropped, so it gets the full width and
    // a much larger face.
    context.shadowBlur = 46;
    context.shadowColor = colorToRgba(item.color, 0.96);
    context.fillStyle = "rgba(240, 253, 250, 0.98)";
    context.font = "950 112px Arial, sans-serif";
    context.fillText(item.repsLabel, textX, 350, 1320);

    context.restore();
  }

  const edgeDepthGradient = context.createLinearGradient(0, 0, width, 0);
  edgeDepthGradient.addColorStop(0, "rgba(2, 6, 23, 0.72)");
  edgeDepthGradient.addColorStop(0.18, "rgba(2, 6, 23, 0.08)");
  edgeDepthGradient.addColorStop(0.5, "rgba(255, 255, 255, 0)");
  edgeDepthGradient.addColorStop(0.82, "rgba(2, 6, 23, 0.08)");
  edgeDepthGradient.addColorStop(1, "rgba(2, 6, 23, 0.72)");
  context.fillStyle = edgeDepthGradient;
  context.fillRect(0, 0, width, height);

  const centerLensGradient = context.createRadialGradient(
    width / 2,
    height * 0.5,
    0,
    width / 2,
    height * 0.5,
    width * 0.42,
  );
  centerLensGradient.addColorStop(0, colorToRgba(activeAccent, 0.18));
  centerLensGradient.addColorStop(0.34, "rgba(255, 255, 255, 0.05)");
  centerLensGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = centerLensGradient;
  context.fillRect(0, 0, width, height);

  context.restore();
  context.restore();
};

const parseThreeColor = (THREE: ThreeModule, color: string) => {
  const parsedColor = new THREE.Color("#67e8f9");

  try {
    parsedColor.setStyle(color);
  } catch {
    parsedColor.set("#67e8f9");
  }

  return parsedColor;
};

const disposeObject = (object: Object3D) => {
  object.traverse((child) => {
    const geometry = (child as GeometryObject).geometry;
    if (geometry) geometry.dispose();

    const material = (child as MaterialObject).material;
    if (!material) return;

    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose());
    } else {
      material.dispose();
    }
  });
};

export default function DashboardCategoryUfoScene3D({
  activeCategoryId,
  beamColor,
  chyronItems = [],
  color,
  isActive = true,
  isOpen = true,
  progress,
}: {
  activeCategoryId?: string;
  beamColor?: string;
  chyronItems?: DashboardCategoryUfoChyronItem[];
  color: string;
  isActive?: boolean;
  isOpen?: boolean;
  progress: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [contextResetToken, setContextResetToken] = useState(0);
  const budgetRetryCountRef = useRef(0);
  const activeCategoryIdRef = useRef(activeCategoryId);
  const beamColorRef = useRef(beamColor || color);
  const chyronItemsRef = useRef(chyronItems);
  const colorRef = useRef(color);
  const isActiveRef = useRef(isActive);
  const isOpenRef = useRef(isOpen);
  const progressRef = useRef(progress);

  useEffect(() => {
    activeCategoryIdRef.current = activeCategoryId;
    chyronItemsRef.current = chyronItems;
  }, [activeCategoryId, chyronItems]);

  useEffect(() => {
    beamColorRef.current = beamColor || color;
    colorRef.current = color;
    progressRef.current = progress;
  }, [beamColor, color, progress]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    let contextRestartId = 0;

    const scheduleContextRestart = (delayMs: number) => {
      if (contextRestartId !== 0) {
        window.clearTimeout(contextRestartId);
      }
      contextRestartId = window.setTimeout(() => {
        contextRestartId = 0;
        setContextResetToken((token) => token + 1);
      }, delayMs);
    };

    const startScene = async () => {
      if (canvasRef.current) {
        setDashboardWebGlCanvasActive(
          canvasRef.current,
          isOpenRef.current && isActiveRef.current,
        );
      }
      const THREE = await loadDashboardThree();
      if (cancelled || !canvasRef.current) return;
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });
      if (cancelled || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 24);
      camera.position.set(0, -0.1, 5.6);
      camera.lookAt(0, -0.36, 0);

      const renderer = createDashboardWebGlRenderer(THREE, canvas, {
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
      });
      if (!renderer) {
        canvas.dataset.categoryUfoRenderer = "unavailable";
        canvas.style.opacity = "0";
        // A renderer budget slot may open up later (another scene unmounting
        // or losing its context frees one). Retry a full rebuild a couple of
        // times instead of leaving an empty UFO slot until a page reload.
        if (budgetRetryCountRef.current < WEBGL_BUDGET_RETRY_LIMIT) {
          budgetRetryCountRef.current += 1;
          scheduleContextRestart(WEBGL_BUDGET_RETRY_DELAY_MS);
        }
        return;
      }

      budgetRetryCountRef.current = 0;
      canvas.dataset.categoryUfoRenderer = "three";
      canvas.dataset.categoryUfoInstance = String(Math.round(performance.now()));
      canvas.style.opacity = "";
      renderer.setClearColor(0x000000, 0);
      renderer.setClearAlpha(0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.14));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const accentColor = parseThreeColor(THREE, colorRef.current);
      const beamAccent = parseThreeColor(THREE, beamColorRef.current);
      const paleAccent = accentColor.clone().lerp(new THREE.Color("#ffffff"), 0.6);
      const targetAccent = accentColor.clone();
      const targetBeamAccent = beamAccent.clone();
      const whiteColor = new THREE.Color("#ffffff");
      const darkColor = new THREE.Color("#020617");
      const alienGreen = new THREE.Color("#bbf7d0");

      scene.add(new THREE.AmbientLight(new THREE.Color("#dff8ff"), 1.25));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
      keyLight.position.set(-1.8, 2.6, 3.4);
      scene.add(keyLight);

      const rimLight = new THREE.PointLight(accentColor, 2.7, 5.4);
      rimLight.position.set(1.6, -0.18, 2.2);
      scene.add(rimLight);

      const cockpitLight = new THREE.PointLight(paleAccent, 1.55, 3.6);
      cockpitLight.position.set(0, 0.86, 1.3);
      scene.add(cockpitLight);

      const ship = new THREE.Group();
      ship.scale.setScalar(0.66);
      scene.add(ship);

      const hullMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.96,
        clearcoatRoughness: 0.08,
        color: new THREE.Color("#e2e8f0"),
        emissive: accentColor.clone().multiplyScalar(0.18),
        emissiveIntensity: 0.18,
        metalness: 0.72,
        roughness: 0.2,
      });
      const undersideMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.62,
        color: accentColor.clone().lerp(new THREE.Color("#020617"), 0.54),
        emissive: accentColor.clone().multiplyScalar(0.38),
        emissiveIntensity: 0.34,
        metalness: 0.34,
        opacity: 0.86,
        roughness: 0.24,
        transparent: true,
      });
      const chyronCradleMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.78,
        clearcoatRoughness: 0.1,
        color: beamAccent.clone().lerp(new THREE.Color("#020617"), 0.46),
        emissive: beamAccent.clone().multiplyScalar(0.5),
        emissiveIntensity: 0.5,
        metalness: 0.46,
        opacity: 0.92,
        roughness: 0.16,
        side: THREE.DoubleSide,
        transparent: true,
      });
      const upperHullFairingMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.92,
        clearcoatRoughness: 0.05,
        color: accentColor.clone().lerp(new THREE.Color("#e0f2fe"), 0.16),
        emissive: accentColor.clone().multiplyScalar(0.42),
        emissiveIntensity: 0.42,
        metalness: 0.56,
        opacity: 0.7,
        roughness: 0.1,
        side: THREE.DoubleSide,
        transparent: true,
      });
      const domeMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        color: paleAccent,
        emissive: accentColor.clone().multiplyScalar(0.24),
        emissiveIntensity: 0.32,
        metalness: 0.02,
        opacity: 0.68,
        roughness: 0.04,
        transparent: true,
      });
      const cockpitHaloMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: paleAccent,
        depthWrite: false,
        opacity: 0.34,
        transparent: true,
      });
      const cockpitCrownMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        color: accentColor.clone().lerp(new THREE.Color("#e0f2fe"), 0.3),
        emissive: accentColor.clone().multiplyScalar(0.52),
        emissiveIntensity: 0.42,
        metalness: 0.5,
        opacity: 0.76,
        roughness: 0.12,
        transparent: true,
      });

      const createLowerHullScoopGeometry = () => {
        const xSegments = 56;
        const zSegments = 12;
        const xMax = 1.72;
        const zMin = 0.16;
        const zMax = 0.7;
        const positions: number[] = [];
        const indices: number[] = [];

        for (let zIndex = 0; zIndex <= zSegments; zIndex += 1) {
          const zProgress = zIndex / zSegments;
          const z = zMin + (zMax - zMin) * zProgress;

          for (let xIndex = 0; xIndex <= xSegments; xIndex += 1) {
            const xProgress = xIndex / xSegments;
            const x = -xMax + xMax * 2 * xProgress;
            const edgeLift = Math.pow(Math.abs(x) / xMax, 2.15) * 0.2;
            const frontLift = Math.pow(zProgress, 1.35) * 0.18;
            const centerDip =
              (1 - Math.pow(Math.abs(x) / xMax, 1.7)) *
              (1 - zProgress * 0.38) *
              0.045;
            const y = -0.62 + edgeLift + frontLift - centerDip;

            positions.push(x, y, z);
          }
        }

        for (let zIndex = 0; zIndex < zSegments; zIndex += 1) {
          for (let xIndex = 0; xIndex < xSegments; xIndex += 1) {
            const current = zIndex * (xSegments + 1) + xIndex;
            const next = current + xSegments + 1;

            indices.push(current, next, current + 1);
            indices.push(current + 1, next, next + 1);
          }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(positions, 3),
        );
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        return geometry;
      };

      const createUpperHullFairingGeometry = () => {
        const xSegments = 64;
        const zSegments = 12;
        const xMax = 1.84;
        const zMin = 0.52;
        const zMax = 0.73;
        const positions: number[] = [];
        const indices: number[] = [];

        for (let zIndex = 0; zIndex <= zSegments; zIndex += 1) {
          const zProgress = zIndex / zSegments;
          const z = zMin + (zMax - zMin) * zProgress;

          for (let xIndex = 0; xIndex <= xSegments; xIndex += 1) {
            const xProgress = xIndex / xSegments;
            const x = -xMax + xMax * 2 * xProgress;
            const edgeLift = Math.pow(Math.abs(x) / xMax, 2.15) * 0.018;
            const centerCrown =
              (1 - Math.pow(Math.abs(x) / xMax, 1.65)) *
              Math.sin(zProgress * Math.PI) *
              0.018;
            const y = 0.132 + zProgress * 0.052 + edgeLift + centerCrown;

            positions.push(x, y, z);
          }
        }

        for (let zIndex = 0; zIndex < zSegments; zIndex += 1) {
          for (let xIndex = 0; xIndex < xSegments; xIndex += 1) {
            const current = zIndex * (xSegments + 1) + xIndex;
            const next = current + xSegments + 1;

            indices.push(current, next, current + 1);
            indices.push(current + 1, next, next + 1);
          }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(positions, 3),
        );
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        return geometry;
      };

      const hull = new THREE.Mesh(new THREE.SphereGeometry(0.86, 64, 22), hullMaterial);
      hull.position.set(0, 0.43, 0);
      hull.scale.set(2.82, 0.28, 0.66);
      ship.add(hull);

      const underside = new THREE.Mesh(
        new THREE.SphereGeometry(0.68, 48, 16),
        undersideMaterial,
      );
      underside.position.set(0, -0.20, 0.04);
      underside.scale.set(2.6, 0.82, 0.5);
      ship.add(underside);

      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(1.82, 0.038, 12, 112),
        hullMaterial,
      );
      rim.position.set(0, 0.28, 0.04);
      rim.rotation.x = Math.PI / 2;
      rim.scale.set(1, 0.31, 1);
      ship.add(rim);

      const upperHullFairing = new THREE.Mesh(
        createUpperHullFairingGeometry(),
        upperHullFairingMaterial,
      );
      upperHullFairing.renderOrder = 38;
      ship.add(upperHullFairing);

      const chyronCradle = new THREE.Mesh(
        new THREE.SphereGeometry(0.74, 64, 16),
        chyronCradleMaterial,
      );
      chyronCradle.position.set(0, -0.72, 0.18);
      chyronCradle.scale.set(0.88, 0.11, 0.23);
      ship.add(chyronCradle);

      const chyronCradleRim = new THREE.Mesh(
        new THREE.TorusGeometry(1.36, 0.03, 10, 112),
        hullMaterial,
      );
      chyronCradleRim.position.set(0, -0.62, 0.38);
      chyronCradleRim.rotation.x = Math.PI / 2;
      chyronCradleRim.scale.set(0.72, 0.16, 1);
      ship.add(chyronCradleRim);

      const lowerHullScoop = new THREE.Mesh(
        createLowerHullScoopGeometry(),
        chyronCradleMaterial,
      );
      lowerHullScoop.renderOrder = 36;
      ship.add(lowerHullScoop);

      const lowerHullLipMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: beamAccent.clone(),
        depthTest: false,
        depthWrite: false,
        opacity: 0.44,
        transparent: true,
      });
      const frontChyronClampMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.92,
        clearcoatRoughness: 0.08,
        color: new THREE.Color("#e2e8f0"),
        depthTest: false,
        depthWrite: false,
        emissive: beamAccent.clone().multiplyScalar(0.24),
        emissiveIntensity: 0.28,
        metalness: 0.62,
        opacity: 0.46,
        roughness: 0.16,
        transparent: true,
      });
      const lowerHullLipGroup = new THREE.Group();
      lowerHullLipGroup.renderOrder = 48;
      ship.add(lowerHullLipGroup);

      const lowerHullFrontLip = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(-1.52, -0.52, 0.62),
            new THREE.Vector3(-0.76, -0.62, 0.72),
            new THREE.Vector3(0, -0.66, 0.74),
            new THREE.Vector3(0.76, -0.62, 0.72),
            new THREE.Vector3(1.52, -0.52, 0.62),
          ]),
          72,
          0.018,
          8,
          false,
        ),
        lowerHullLipMaterial,
      );
      lowerHullLipGroup.add(lowerHullFrontLip);

      [-1, 1].forEach((side) => {
        const sideLip = new THREE.Mesh(
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3([
              new THREE.Vector3(side * 1.42, -0.73, 0.24),
              new THREE.Vector3(side * 1.58, -0.64, 0.42),
              new THREE.Vector3(side * 1.54, -0.54, 0.58),
              new THREE.Vector3(side * 1.34, -0.43, 0.66),
            ]),
            44,
            0.017,
            8,
            false,
          ),
          lowerHullLipMaterial,
        );
        lowerHullLipGroup.add(sideLip);
      });

      const frontChyronClampGroup = new THREE.Group();
      frontChyronClampGroup.renderOrder = 58;
      ship.add(frontChyronClampGroup);

      const upperChyronClamp = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(-1.66, 0.022, 0.5),
            new THREE.Vector3(-0.84, 0.012, 0.54),
            new THREE.Vector3(0, 0.006, 0.565),
            new THREE.Vector3(0.84, 0.012, 0.54),
            new THREE.Vector3(1.66, 0.022, 0.5),
          ]),
          96,
          0.014,
          10,
          false,
        ),
        frontChyronClampMaterial,
      );
      upperChyronClamp.renderOrder = 58;
      frontChyronClampGroup.add(upperChyronClamp);

      const lowerChyronClamp = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(-1.66, -0.62, 0.52),
            new THREE.Vector3(-0.84, -0.628, 0.575),
            new THREE.Vector3(0, -0.636, 0.6),
            new THREE.Vector3(0.84, -0.628, 0.575),
            new THREE.Vector3(1.66, -0.62, 0.52),
          ]),
          96,
          0.014,
          10,
          false,
        ),
        frontChyronClampMaterial,
      );
      lowerChyronClamp.renderOrder = 59;
      frontChyronClampGroup.add(lowerChyronClamp);

      [-1, 1].forEach((side) => {
        const sideChyronClamp = new THREE.Mesh(
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3([
              new THREE.Vector3(side * 1.66, 0.022, 0.5),
              new THREE.Vector3(side * 1.68, -0.20, 0.525),
              new THREE.Vector3(side * 1.68, -0.42, 0.53),
              new THREE.Vector3(side * 1.66, -0.62, 0.52),
            ]),
            56,
            0.014,
            10,
            false,
          ),
          frontChyronClampMaterial,
        );
        sideChyronClamp.renderOrder = 59;
        frontChyronClampGroup.add(sideChyronClamp);
      });

      const tornadoGlowMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: beamAccent.clone(),
        depthWrite: false,
        opacity: 0.36,
        transparent: true,
      });
      const chyronCradleGlow = new THREE.Mesh(
        new THREE.TorusGeometry(1.08, 0.02, 8, 96),
        tornadoGlowMaterial,
      );
      chyronCradleGlow.position.set(0, -0.82, 0.18);
      chyronCradleGlow.rotation.x = Math.PI / 2;
      chyronCradleGlow.scale.set(0.72, 0.28, 1);
      ship.add(chyronCradleGlow);

      const cockpitCrown = new THREE.Mesh(
        new THREE.TorusGeometry(0.58, 0.022, 10, 112),
        cockpitCrownMaterial,
      );
      cockpitCrown.position.set(0, 0.62, 0.06);
      cockpitCrown.rotation.x = Math.PI / 2;
      cockpitCrown.scale.set(1.18, 0.48, 1);
      ship.add(cockpitCrown);

      const cockpitHalo = new THREE.Mesh(
        new THREE.TorusGeometry(0.74, 0.012, 8, 128),
        cockpitHaloMaterial,
      );
      cockpitHalo.position.set(0, 0.63, 0.08);
      cockpitHalo.rotation.x = Math.PI / 2;
      cockpitHalo.scale.set(1.18, 0.42, 1);
      ship.add(cockpitHalo);

      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.48, 48, 20), domeMaterial);
      dome.position.set(0, 0.72, 0.04);
      dome.scale.set(1.24, 0.72, 0.82);
      ship.add(dome);

      const alienMaterial = new THREE.MeshPhysicalMaterial({
        color: accentColor.clone().lerp(new THREE.Color("#bbf7d0"), 0.38),
        emissive: accentColor.clone().multiplyScalar(0.12),
        emissiveIntensity: 0.26,
        metalness: 0.02,
        roughness: 0.34,
      });
      const eyeMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color("#020617"),
      });
      const smileMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color("#020617"),
      });
      const cheekMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: paleAccent,
        depthWrite: false,
        opacity: 0.18,
        transparent: true,
      });
      const alien = new THREE.Group();
      alien.position.set(0, 0.635, 0.39);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 14), alienMaterial);
      head.scale.set(1.08, 1.42, 0.82);
      alien.add(head);
      const eyeBaseXs = [-0.058, 0.058];
      const eyes = eyeBaseXs.map((x) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 6), eyeMaterial);
        eye.position.set(x, 0.03, 0.128);
        eye.scale.set(1.24, 0.72, 0.5);
        alien.add(eye);
        return eye;
      });
      const smileCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.064, -0.034, 0.132),
        new THREE.Vector3(0, -0.058, 0.146),
        new THREE.Vector3(0.064, -0.034, 0.132),
      ]);
      const smile = new THREE.Mesh(
        new THREE.TubeGeometry(smileCurve, 18, 0.0055, 6, false),
        smileMaterial,
      );
      smile.scale.set(1, 0.82, 1);
      alien.add(smile);
      const cheeks = [-0.09, 0.09].map((x) => {
        const cheek = new THREE.Mesh(
          new THREE.SphereGeometry(0.018, 12, 8),
          cheekMaterial,
        );
        cheek.position.set(x, -0.026, 0.128);
        cheek.scale.set(1.25, 0.5, 0.38);
        alien.add(cheek);
        return cheek;
      });
      ship.add(alien);

      const lightMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: paleAccent,
        depthTest: false,
        depthWrite: false,
        opacity: 0.88,
        transparent: true,
      });
      const lightGeometry = new THREE.SphereGeometry(0.045, 14, 8);
      const lights = [-1.16, -0.58, 0, 0.58, 1.16].map((x) => {
        const light = new THREE.Mesh(lightGeometry, lightMaterial);
        light.position.set(x, 0.165, 0.66);
        light.renderOrder = 78;
        ship.add(light);
        return light;
      });

      const chyronCanvas = document.createElement("canvas");
      chyronCanvas.width = 2048;
      chyronCanvas.height = 576;
      const chyronContext = chyronCanvas.getContext("2d");
      const chyronTexture = new THREE.CanvasTexture(chyronCanvas);
      chyronTexture.colorSpace = THREE.SRGBColorSpace;
      chyronTexture.magFilter = THREE.LinearFilter;
      chyronTexture.minFilter = THREE.LinearFilter;
      chyronTexture.needsUpdate = true;

      const chyronDisplayMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.NormalBlending,
        depthTest: false,
        depthWrite: false,
        map: chyronTexture,
        opacity: 0.92,
        side: THREE.DoubleSide,
        transparent: true,
      });
      const chyronDisplay = new THREE.Mesh(
        new THREE.PlaneGeometry(3.18, 0.66, 18, 1),
        chyronDisplayMaterial,
      );
      chyronDisplay.position.set(0, -0.293, 0.62);
      chyronDisplay.renderOrder = 56;
      ship.add(chyronDisplay);

      const projectorMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: beamAccent,
        depthTest: false,
        depthWrite: false,
        opacity: 0.24,
        transparent: true,
      });
      const projectorReflectorMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        color: beamAccent.clone().lerp(whiteColor, 0.26),
        depthTest: false,
        depthWrite: false,
        emissive: beamAccent.clone().multiplyScalar(0.72),
        emissiveIntensity: 0.66,
        metalness: 0.88,
        opacity: 0.8,
        roughness: 0.07,
        transparent: true,
      });
      const emitterThroatMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.86,
        clearcoatRoughness: 0.06,
        color: beamAccent.clone().lerp(whiteColor, 0.18),
        depthTest: false,
        depthWrite: false,
        emissive: beamAccent.clone().multiplyScalar(0.78),
        emissiveIntensity: 0.72,
        metalness: 0.42,
        opacity: 0.24,
        roughness: 0.1,
        side: THREE.DoubleSide,
        transparent: true,
      });
      const emitterBeamMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: beamAccent,
        depthTest: false,
        depthWrite: false,
        opacity: 0.035,
        side: THREE.DoubleSide,
        transparent: true,
      });
      const pickupLaserMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: beamAccent,
        depthTest: false,
        depthWrite: false,
        opacity: 0,
        side: THREE.DoubleSide,
        transparent: true,
      });
      const vortexRibbonMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.92,
        clearcoatRoughness: 0.04,
        color: beamAccent.clone().lerp(whiteColor, 0.2),
        depthTest: false,
        depthWrite: false,
        emissive: beamAccent.clone().multiplyScalar(0.72),
        emissiveIntensity: 0.68,
        metalness: 0.28,
        opacity: 0.72,
        roughness: 0.08,
        transparent: true,
      });
      const vortexRingMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        color: beamAccent.clone().lerp(whiteColor, 0.28),
        depthTest: false,
        depthWrite: false,
        emissive: beamAccent.clone().multiplyScalar(0.82),
        emissiveIntensity: 0.72,
        metalness: 0.58,
        opacity: 0.64,
        roughness: 0.08,
        transparent: true,
      });
      const vortexCoreMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: beamAccent,
        depthTest: false,
        depthWrite: false,
        opacity: 0.16,
        transparent: true,
      });
      const pickupEffectRenderOrder = 90;
      const projectorReflector = new THREE.Mesh(
        new THREE.TorusGeometry(0.5, 0.028, 12, 128),
        projectorReflectorMaterial,
      );
      projectorReflector.position.set(0, -0.73, 0.08);
      projectorReflector.rotation.x = Math.PI / 2;
      projectorReflector.scale.set(0.82, 0.38, 1);
      projectorReflector.renderOrder = pickupEffectRenderOrder;
      ship.add(projectorReflector);
      const projector = new THREE.Mesh(
        new THREE.TorusGeometry(0.38, 0.017, 8, 96),
        projectorMaterial,
      );
      projector.position.set(0, -0.81, 0.08);
      projector.rotation.x = Math.PI / 2;
      projector.scale.set(0.8, 0.38, 1);
      projector.renderOrder = pickupEffectRenderOrder + 1;
      ship.add(projector);

      const emitterThroatHalfHeight = 0.06;
      const emitterThroat = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.3,
          0.36,
          emitterThroatHalfHeight * 2,
          64,
          1,
          true,
        ),
        emitterThroatMaterial,
      );
      emitterThroat.position.set(0, -0.9, 0.08);
      emitterThroat.scale.set(1, 1, 0.36);
      emitterThroat.renderOrder = pickupEffectRenderOrder + 2;
      ship.add(emitterThroat);

      const emitterBeamHalfHeight = 0.48;
      const emitterBeam = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.06,
          0.34,
          emitterBeamHalfHeight * 2,
          64,
          1,
          true,
        ),
        emitterBeamMaterial,
      );
      emitterBeam.position.set(0, -1.3, 0.08);
      emitterBeam.scale.set(1, 1, 0.22);
      emitterBeam.renderOrder = pickupEffectRenderOrder + 3;
      ship.add(emitterBeam);

      const pickupLaserHalfHeight = 3.1;
      const pickupLaser = new THREE.Mesh(
        new THREE.ConeGeometry(
          0.58,
          pickupLaserHalfHeight * 2,
          64,
          1,
          true,
        ),
        pickupLaserMaterial,
      );
      pickupLaser.position.set(0, -3.58, 0.12);
      pickupLaser.scale.set(0.72, 1, 0.22);
      pickupLaser.renderOrder = pickupEffectRenderOrder + 14;
      pickupLaser.visible = false;
      ship.add(pickupLaser);

      const grabObjectMaterials = [
        new THREE.MeshPhysicalMaterial({
          clearcoat: 0.9,
          color: new THREE.Color("#f0abfc"),
          depthTest: false,
          depthWrite: false,
          emissive: new THREE.Color("#ec4899"),
          emissiveIntensity: 0.46,
          metalness: 0.34,
          roughness: 0.18,
        }),
        new THREE.MeshPhysicalMaterial({
          clearcoat: 0.86,
          color: new THREE.Color("#fde68a"),
          depthTest: false,
          depthWrite: false,
          emissive: new THREE.Color("#f59e0b"),
          emissiveIntensity: 0.34,
          metalness: 0.56,
          roughness: 0.2,
        }),
        new THREE.MeshPhysicalMaterial({
          clearcoat: 1,
          color: new THREE.Color("#a7f3d0"),
          depthTest: false,
          depthWrite: false,
          emissive: new THREE.Color("#14b8a6"),
          emissiveIntensity: 0.42,
          metalness: 0.22,
          roughness: 0.12,
          transparent: true,
        }),
      ];
      const grabObjectLineMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color("#e0f2fe"),
        depthTest: false,
        depthWrite: false,
        opacity: 0.62,
        transparent: true,
      });
      const grabObjectGlowMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: beamAccent.clone(),
        depthTest: false,
        depthWrite: false,
        opacity: 0.3,
        transparent: true,
      });
      const grabFloorPadMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: beamAccent.clone(),
        depthTest: false,
        depthWrite: false,
        opacity: 0.2,
        transparent: true,
      });
      const grabObjectGroup = new THREE.Group();
      grabObjectGroup.renderOrder = pickupEffectRenderOrder + 8;
      ship.add(grabObjectGroup);

      const grabFloorY = -6.62;
      const grabObjectRestPositions = [
        new THREE.Vector3(-0.52, grabFloorY + 0.065, 0.62),
        new THREE.Vector3(0.06, grabFloorY + 0.075, 0.58),
        new THREE.Vector3(0.58, grabFloorY + 0.06, 0.64),
      ];
      const grabFloorPads = grabObjectRestPositions.map((restPosition) => {
        const pad = new THREE.Mesh(
          new THREE.TorusGeometry(0.2, 0.01, 8, 56),
          grabFloorPadMaterial,
        );
        pad.position.set(restPosition.x, grabFloorY, restPosition.z);
        pad.rotation.x = Math.PI / 2;
        pad.scale.set(1.28, 0.44, 1);
        pad.renderOrder = pickupEffectRenderOrder + 8;
        grabObjectGroup.add(pad);

        return pad;
      });
      const grabObjects = grabObjectRestPositions.map((restPosition, index) => {
        const object = new THREE.Group();
        object.position.copy(restPosition);
        object.renderOrder = pickupEffectRenderOrder + 10;

        if (index === 0) {
          const prism = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.16, 0),
            grabObjectMaterials[index],
          );
          prism.renderOrder = pickupEffectRenderOrder + 10;
          object.add(prism);

          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.18, 0.012, 8, 42),
            grabObjectGlowMaterial,
          );
          ring.rotation.x = Math.PI / 2;
          ring.renderOrder = pickupEffectRenderOrder + 11;
          object.add(ring);
        } else if (index === 1) {
          const crate = new THREE.Mesh(
            new THREE.BoxGeometry(0.23, 0.19, 0.23),
            grabObjectMaterials[index],
          );
          crate.rotation.set(0.32, 0.26, 0.14);
          crate.renderOrder = pickupEffectRenderOrder + 10;
          object.add(crate);

          const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(crate.geometry),
            grabObjectLineMaterial,
          );
          edges.renderOrder = pickupEffectRenderOrder + 11;
          object.add(edges);
        } else {
          const orb = new THREE.Mesh(
            new THREE.SphereGeometry(0.14, 24, 14),
            grabObjectMaterials[index],
          );
          orb.renderOrder = pickupEffectRenderOrder + 10;
          object.add(orb);

          const orbit = new THREE.Mesh(
            new THREE.TorusGeometry(0.21, 0.011, 8, 48),
            grabObjectGlowMaterial,
          );
          orbit.rotation.x = Math.PI / 2.35;
          orbit.renderOrder = pickupEffectRenderOrder + 11;
          object.add(orbit);
        }

        grabObjectGroup.add(object);

        return object;
      });

      const tractorGrabMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: beamAccent.clone(),
        depthTest: false,
        depthWrite: false,
        opacity: 0,
        transparent: true,
      });
      const tractorGrabBeam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.12, 1, 32, 1, true),
        tractorGrabMaterial,
      );
      tractorGrabBeam.renderOrder = pickupEffectRenderOrder + 12;
      tractorGrabBeam.visible = false;
      ship.add(tractorGrabBeam);

      const tractorClawMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: beamAccent.clone(),
        depthTest: false,
        depthWrite: false,
        opacity: 0,
        transparent: true,
      });
      const tractorClaw = new THREE.Mesh(
        new THREE.TorusGeometry(0.18, 0.018, 8, 56),
        tractorClawMaterial,
      );
      tractorClaw.rotation.x = Math.PI / 2;
      tractorClaw.renderOrder = pickupEffectRenderOrder + 13;
      tractorClaw.visible = false;
      ship.add(tractorClaw);

      const tractorTendrils = Array.from({ length: 6 }, (_, index) => {
        const segments = 30;
        const positions = new Float32Array((segments + 1) * 3);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(positions, 3),
        );
        const material = new THREE.LineBasicMaterial({
          blending: THREE.AdditiveBlending,
          color: beamAccent.clone().lerp(whiteColor, 0.22),
          depthTest: false,
          depthWrite: false,
          opacity: 0,
          transparent: true,
        });
        const line = new THREE.Line(geometry, material);
        line.renderOrder = pickupEffectRenderOrder + 14 + index;
        line.visible = false;
        ship.add(line);

        return {
          geometry,
          line,
          material,
          phase: (index / 6) * Math.PI * 2,
          positions,
          segments,
        };
      });

      const grabBeamStartPoint = new THREE.Vector3();
      const grabBeamEndPoint = new THREE.Vector3();
      const grabBeamMidPoint = new THREE.Vector3();
      const grabBeamDirection = new THREE.Vector3();
      const grabBeamUnitDirection = new THREE.Vector3();
      const grabBeamSideAxis = new THREE.Vector3();
      const grabBeamNormalAxis = new THREE.Vector3();
      const grabBeamReferenceAxis = new THREE.Vector3(0, 0, 1);
      const grabBeamFallbackAxis = new THREE.Vector3(1, 0, 0);
      const grabBeamUp = new THREE.Vector3(0, 1, 0);
      const grabTendrilStartPoint = new THREE.Vector3();
      const grabTendrilEndPoint = new THREE.Vector3();
      const grabTendrilPoint = new THREE.Vector3();
      const grabbedObjectDockPoint = new THREE.Vector3(0, -0.86, 0.5);

      const vortexGroup = new THREE.Group();
      vortexGroup.position.set(0, -0.86, 0.06);
      vortexGroup.renderOrder = pickupEffectRenderOrder + 4;
      ship.add(vortexGroup);

      const createVortexRibbon = (phase: number) => {
        const points = Array.from({ length: 74 }, (_, index) => {
          const progressValue = index / 73;
          const angle = phase + progressValue * Math.PI * 4.6;
          const radius = 0.3 - progressValue * 0.21;

          return new THREE.Vector3(
            Math.cos(angle) * radius,
            -progressValue * 0.82,
            0.06 + Math.sin(angle) * radius * 0.34,
          );
        });

        const ribbon = new THREE.Mesh(
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(points),
            110,
            0.011,
            6,
            false,
          ),
          vortexRibbonMaterial,
        );
        ribbon.renderOrder = pickupEffectRenderOrder + 4;
        vortexGroup.add(ribbon);

        return ribbon;
      };

      const vortexRibbons = [
        createVortexRibbon(0),
        createVortexRibbon((Math.PI * 2) / 3),
        createVortexRibbon((Math.PI * 4) / 3),
      ];
      const vortexCore = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.16, 0.86, 48, 1, true),
        vortexCoreMaterial,
      );
      vortexCore.position.set(0, -0.42, 0.06);
      vortexCore.scale.set(1, 1, 0.28);
      vortexCore.renderOrder = pickupEffectRenderOrder + 7;
      vortexGroup.add(vortexCore);
      const vortexRings = Array.from({ length: 5 }, (_, index) => {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.3 - index * 0.043, 0.01, 8, 72),
          vortexRingMaterial,
        );
        ring.position.set(0, -0.08 - index * 0.16, 0.06);
        ring.rotation.x = Math.PI / 2;
        ring.scale.set(1, 0.36 + index * 0.025, 1);
        ring.renderOrder = pickupEffectRenderOrder + 5;
        vortexGroup.add(ring);

        return ring;
      });

      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(1, Math.floor(rect.width));
        const height = Math.max(1, Math.floor(rect.height));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        // The grab objects hang 6.62 ship-units below the hull, so their
        // vertical framing is far more sensitive to this scale than their
        // apparent size is: world y = 0.55 - 6.62 * scale, against a frustum
        // that bottoms out near -2.44. Past a scale of ~0.4546 they drop off
        // the bottom edge and the pickup plays out of sight. The canvas is
        // min(620px, 100vh - 2.2rem), so any viewport shorter than ~600px was
        // landing there. Capping the multiplier at 0.66 holds the maximum
        // scale at 0.4356 and keeps the pickup in frame; taller canvases are
        // below the cap and render exactly as before.
        ship.scale.setScalar(0.66 * clampNumber(390 / height, 0.56, 0.66));
      };

      const observer = new ResizeObserver(resize);
      observer.observe(canvas);
      resize();

      const handleContextLost = (event: Event) => {
        event.preventDefault();
        canvas.dataset.categoryUfoRenderer = "lost";
        canvas.style.opacity = "0";
        cleanup();
        // cleanup() disposed the renderer (which also detached the shared
        // restored handler), so rebuild the whole scene after a short delay —
        // same restart-token pattern as DashboardTornadoEmeralds3D.
        scheduleContextRestart(WEBGL_CONTEXT_RESTART_DELAY_MS);
      };
      canvas.addEventListener("webglcontextlost", handleContextLost);

      let frameId = 0;
      const startedAt = performance.now();
      let lastFrameTime = startedAt;
      let lastDrawTime = 0;
      let activeSeconds = 0;
      let presence = 0;
      // Exit choreography: on close the tractor beam shuts down BEFORE the
      // hull leaves. Ramps 0->1 while the panel is closing and resets the
      // instant it reopens, so a fast re-open never starts mid-shutdown.
      let closeLightOut = 0;
      let ufoThroatPresence = isActiveRef.current ? 1 : 0;
      let lastChyronTextureUpdate = 0;
      let lastTargetAccentStyle = colorRef.current;
      let lastTargetBeamAccentStyle = beamColorRef.current;
      let lastTendrilGeometryUpdate = 0;
      let lastCanvasOpacity = -1;
      let canvasLive = false;
      let hasChyronAdvancedAfterDock = false;
      // Wall-clock accumulator (see realDeltaSeconds) plus the zero point for
      // the chyron's hold/hop cycle. On dock the cycle starts at phase 0 so
      // the active category's level sweep plays first; on a later UFO
      // reselect the rebase credits the previously held tab so the band
      // resumes where the frozen frame left it and hops to a new tab.
      let chyronClockSeconds = 0;
      let chyronTimelineStartSeconds = 0;
      // Last hold-settled frame shown while the UFO was live — frozen
      // highlight states render this instead of a canonical pin so
      // deselecting the UFO never teleports the band.
      let chyronHeldSeconds =
        DASHBOARD_CATEGORY_UFO_CHYRON_PIN_SECONDS +
        DASHBOARD_CATEGORY_UFO_CHYRON_PERIOD_SECONDS;
      // Manual scrub state. chyronManualBase is the pinned cycle index;
      // while a step animates, chyronManualSlide runs -1..1 toward the
      // neighbour, then commits into the base. Auto resumes once the page
      // has been idle for DASHBOARD_CATEGORY_UFO_CHYRON_MANUAL_HOLD_MS.
      let chyronManualActive = false;
      let chyronManualBase = 0;
      let chyronManualSlide = 0;
      let chyronManualDir = 0;
      let chyronManualSlideStartMs = 0;
      let chyronManualLastInputMs = 0;
      let lastChyronDrawnManualKey = "";
      let lastChyronDrawnSeconds = -1;
      let lastChyronDrawnItemsKey = "";
      let lastChyronDrawnCategoryId: string | undefined;
      let activeGrabCycle = -1;
      let activeGrabObjectIndex = 0;
      // The grab sequence runs on its own clock, zeroed every time the panel
      // becomes live. activeSeconds cannot be used directly: it is cumulative
      // open time and never resets, so closing the panel froze the 92s cycle
      // and reopening resumed it wherever it stopped. Land in the stretch
      // where the claw has arrived but the pull has not started and the gem
      // just sits there at full size — which is exactly what it looked like.
      // activeSeconds itself must keep running: the hull's attitude, the
      // hover and the whole vortex phase are derived from it, and zeroing it
      // would snap all of them on every open.
      let grabTimelineStartSeconds = 0;
      let previousGrabLiveState = false;
      const setUfoCanvasLive = (live: boolean) => {
        if (canvasLive === live) return;

        canvasLive = live;
        setDashboardWebGlCanvasActive(canvas, live);
      };

      setUfoCanvasLive(isOpenRef.current && isActiveRef.current);

      // Horizontal scroll (and horizontal drags) scrub the level band by one
      // category per gesture. Only while the UFO holds the highlight, so the
      // wheel keeps its normal meaning everywhere else.
      const stepChyron = (dir: -1 | 1) => {
        if (!isActiveRef.current || !isOpenRef.current) return;
        const now = performance.now();
        chyronManualLastInputMs = now;
        if (chyronManualSlide !== 0) return; // a hop is already running
        if (!chyronManualActive) {
          chyronManualActive = true;
          // Adopt whatever tab the auto cycle is showing so the hand-off does
          // not jump.
          const live = Math.max(0, chyronClockSeconds - chyronTimelineStartSeconds);
          chyronManualBase = Math.floor(
            live / DASHBOARD_CATEGORY_UFO_CHYRON_PERIOD_SECONDS,
          );
        }
        chyronManualDir = dir;
        chyronManualSlideStartMs = now;
      };
      const handleChyronWheel = (event: WheelEvent) => {
        if (!isActiveRef.current || !isOpenRef.current) return;
        if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
        event.preventDefault();
        if (performance.now() - chyronManualLastInputMs < 260) {
          chyronManualLastInputMs = performance.now();
          return;
        }
        stepChyron(event.deltaX > 0 ? 1 : -1);
      };
      let chyronDragX: number | null = null;
      const handleChyronPointerDown = (event: PointerEvent) => {
        chyronDragX = event.clientX;
      };
      const handleChyronPointerMove = (event: PointerEvent) => {
        if (chyronDragX === null) return;
        const dx = event.clientX - chyronDragX;
        if (Math.abs(dx) < 42) return;
        chyronDragX = event.clientX;
        stepChyron(dx < 0 ? 1 : -1);
      };
      const endChyronDrag = () => {
        chyronDragX = null;
      };
      // Explicit scrub request (the panel's horizontal arrow keys dispatch
      // this so they drive the same path as the wheel/drag gesture).
      const handleChyronStepEvent = (event: Event) => {
        const dir = (event as CustomEvent<{ dir?: number }>).detail?.dir;
        if (dir === 1 || dir === -1) stepChyron(dir);
      };
      canvas.addEventListener("sf-chyron-step", handleChyronStepEvent);
      canvas.addEventListener("wheel", handleChyronWheel, { passive: false });
      canvas.addEventListener("pointerdown", handleChyronPointerDown);
      canvas.addEventListener("pointermove", handleChyronPointerMove);
      canvas.addEventListener("pointerup", endChyronDrag);
      canvas.addEventListener("pointercancel", endChyronDrag);
      canvas.addEventListener("pointerleave", endChyronDrag);

      const render = (time: number) => {
        // ~30fps frame-rate cap (see DASHBOARD_CATEGORY_UFO_MIN_FRAME_MS). The
        // rAF keeps firing at display rate but we only do scene work on ~half
        // the frames; delta-timing below keeps the motion speed identical.
        if (time - lastDrawTime < DASHBOARD_CATEGORY_UFO_MIN_FRAME_MS) {
          frameId = window.requestAnimationFrame(render);
          return;
        }
        lastDrawTime = time;

        const deltaSeconds = Math.min(
          DASHBOARD_CATEGORY_UFO_MAX_DELTA_SECONDS,
          Math.max(0, (time - lastFrameTime) / 1000),
        );
        // Wall-clock delta for the chyron cadence: deltaSeconds is capped at
        // 1/30 for motion stability, which dilates scene time whenever frames
        // arrive slower than 30fps — but the chyron's hold/hop rhythm is
        // specified in real seconds, so it runs on its own uncapped clock.
        const realDeltaSeconds = Math.min(
          0.5,
          Math.max(0, (time - lastFrameTime) / 1000),
        );
        lastFrameTime = time;
        const isOpenNow = isOpenRef.current;
        // Restart the grab sequence whenever the scene becomes live again.
        // Keyed on live rather than open because the renderer freezes this
        // canvas to a still image ~1s after the panel highlights a different
        // meter, and the clock would otherwise keep burning through the
        // sequence behind that still.
        const isGrabLiveNow = isOpenNow && isActiveRef.current;
        if (isGrabLiveNow !== previousGrabLiveState) {
          previousGrabLiveState = isGrabLiveNow;
          if (isGrabLiveNow) {
            grabTimelineStartSeconds = activeSeconds;
            // Resume from the tab the frozen frame was showing (its cycle is
            // encoded in chyronHeldSeconds) at the start of its hop, so the
            // band slides straight to a new tab with no backwards jump. On a
            // fresh open the dock rebase below overwrites this.
            chyronTimelineStartSeconds =
              chyronClockSeconds -
              (chyronHeldSeconds - DASHBOARD_CATEGORY_UFO_CHYRON_PIN_SECONDS) -
              DASHBOARD_CATEGORY_UFO_CHYRON_HOLD_SECONDS;
            // Force a fresh object pick on the first frame of the new run.
            activeGrabCycle = -1;
          }
        }
        if (isOpenNow) {
          activeSeconds += deltaSeconds;
          chyronClockSeconds += realDeltaSeconds;
        }
        const seconds = activeSeconds;
        const tornadoMotionSeconds = seconds * 0.36;
        const tornadoDeltaSeconds = deltaSeconds * 0.36;
        const isUfoSelected = isActiveRef.current;
        setUfoCanvasLive(isOpenNow && isUfoSelected);
        const targetPresence = isOpenNow ? 1 : 0;
        // Shut the beam off first, then fly away. Presence used to start
        // decaying the moment the panel closed, so the hull climbed out while
        // the throat was still deployed and the beam stretched away with it
        // instead of switching off. Hold the ship in place for the light-out,
        // then release it. The panel fades over 520ms with a slow-start
        // easing, so the light-out is kept brief enough to be seen.
        if (isOpenNow) {
          closeLightOut = 0;
        } else {
          closeLightOut = Math.min(
            1,
            closeLightOut +
              Math.max(deltaSeconds, 1 / 60) /
                DASHBOARD_CATEGORY_UFO_CLOSE_LIGHT_OUT_SECONDS,
          );
        }
        if (isOpenNow || closeLightOut >= 0.995) {
          presence +=
            (targetPresence - presence) * (isOpenNow ? 0.18 : 0.2);
        }
        const flyEase = 1 - Math.pow(1 - presence, 3);
        // The throat/pickup column (emitter throat, beam, laser, vortex,
        // projector kit) deploys only while the UFO holds the highlight —
        // deployed over the meter states it painted a shady cone on top of
        // the meter cards.
        ufoThroatPresence +=
          ((isUfoSelected ? 1 : 0) - ufoThroatPresence) * 0.14;
        const tornadoDeployProgress =
          smoothStepNumber((flyEase - 0.82) / 0.16) *
          smoothStepNumber(ufoThroatPresence) *
          (1 - smoothStepNumber(closeLightOut));
        if (isOpenNow && !hasChyronAdvancedAfterDock && flyEase > 0.985) {
          hasChyronAdvancedAfterDock = true;
          // Cycle starts at phase 0: the active category holds first and
          // plays its level sweep, continuing seamlessly from the pre-dock
          // phase-0 pin.
          chyronTimelineStartSeconds = chyronClockSeconds;
        }

        // The meter menu is closed and the fly-out has fully settled — the
        // canvas is invisible. Skip the entire scene update and GL draw so this
        // (the heaviest dashboard scene) stops burning CPU/GPU while it is off
        // screen, which is almost all the time. The loop keeps ticking cheaply
        // and resumes the instant the menu reopens.
        if (!isOpenNow && presence < 0.004) {
          // Re-arm the dock choreography only once fully parked — resetting
          // it on the close transition snapped the band to its pre-dock
          // frame while the ship was still visibly flying out.
          hasChyronAdvancedAfterDock = false;
          if (lastCanvasOpacity !== 0) {
            canvas.style.opacity = "0";
            lastCanvasOpacity = 0;
          }
          frameId = window.requestAnimationFrame(render);
          return;
        }

        const hover = Math.sin(seconds * 0.86) * 0.014 * flyEase;
        const levelGlow = Math.max(
          0.4,
          Math.min(1, progressRef.current / 100),
        );
        const tornadoSync =
          0.5 + Math.sin((tornadoMotionSeconds * Math.PI * 2) / 42) * 0.5;
        const grabCycleSeconds = 92;
        // Phase 0 is now the moment the panel goes live rather than an
        // arbitrary point in a free-running clock, so this starts the cycle at
        // its beginning: a short lead, then the reveal, then the pickup. The
        // old 82 was an offset into a clock that never restarted; keeping it
        // here would have meant waiting 21s of open time to see anything.
        const grabCycleOffsetSeconds = 0;
        const grabRevealLeadSeconds = 4.2;
        const grabActiveDurationSeconds = 19.8;
        const grabTimelineSeconds =
          seconds - grabTimelineStartSeconds + grabCycleOffsetSeconds;
        const grabCycleIndex = Math.floor(grabTimelineSeconds / grabCycleSeconds);
        const grabCyclePhase = grabTimelineSeconds % grabCycleSeconds;
        if (grabCycleIndex !== activeGrabCycle) {
          activeGrabCycle = grabCycleIndex;
          activeGrabObjectIndex = Math.floor(Math.random() * grabObjects.length);
        }
        const grabObjectIsRevealed =
          tornadoDeployProgress > 0.96 &&
          grabCyclePhase < grabRevealLeadSeconds + grabActiveDurationSeconds;
        const grabActionPhase = Math.max(
          0,
          grabCyclePhase - grabRevealLeadSeconds,
        );
        const grabIsActive =
          tornadoDeployProgress > 0.96 &&
          grabCyclePhase >= grabRevealLeadSeconds &&
          grabCyclePhase < grabRevealLeadSeconds + grabActiveDurationSeconds;
        const grabReachProgress = grabIsActive
          ? smoothStepNumber(grabActionPhase / 5.6)
          : 0;
        // Starts the instant the claw finishes reaching (5.6s), not 1.6s
        // after it. That gap left the gem sitting motionless under a fully
        // extended beam, which read as the beam having failed to pick it up.
        const grabPullProgress = grabIsActive
          ? smoothStepNumber((grabActionPhase - 5.6) / 8.2)
          : 0;
        const grabFadeProgress = grabIsActive
          ? smoothStepNumber((grabActionPhase - 15.6) / 4.2)
          : 0;
        const grabRevealProgress = grabObjectIsRevealed
          ? smoothStepNumber(grabCyclePhase / grabRevealLeadSeconds)
          : 0;
        const grabGlow =
          grabIsActive && grabReachProgress > 0
            ? (1 - grabFadeProgress * 0.72) *
              (0.72 + Math.sin(tornadoMotionSeconds * 6.5) * 0.12)
            : 0;
        const grabThroatProgress = grabIsActive
          ? smoothStepNumber(grabActionPhase / 2.8) *
            (1 - grabFadeProgress * 0.82)
          : 0;
        const emitterThroatY =
          -1.09 -
          tornadoDeployProgress * 0.07 +
          tornadoSync * 0.01 -
          grabReachProgress * 0.1;
        const emitterThroatScaleX =
          0.52 + tornadoDeployProgress * (0.42 + tornadoSync * 0.045);
        const emitterThroatScaleY =
          0.26 +
          tornadoDeployProgress *
            (0.46 + tornadoSync * 0.035 + grabReachProgress * 0.86);
        const emitterThroatScaleZ =
          0.16 + tornadoDeployProgress * (0.16 + tornadoSync * 0.035);
        const throatExitY =
          emitterThroatY - emitterThroatHalfHeight * emitterThroatScaleY - 0.01;
        const throatExitZ = 0.08;
        const pickupEmitterAnchorY =
          -0.82 -
          tornadoDeployProgress * 0.05 +
          tornadoSync * 0.012 -
          grabReachProgress * 0.08;
        const pickupColumnTopY = pickupEmitterAnchorY + 0.015;
        const pickupColumnFloorY = grabFloorY + 0.04;
        const pickupColumnLength = Math.max(
          0.1,
          pickupColumnTopY - pickupColumnFloorY,
        );
        const pickupColumnDeployScale =
          0.12 + tornadoDeployProgress * 0.88;
        const pickupColumnBottomY =
          pickupColumnTopY - pickupColumnLength * pickupColumnDeployScale;
        const rawChyronItems = chyronItemsRef.current;
        const resolvedChyronItems =
          rawChyronItems.length > 0
            ? rawChyronItems
            : [
                {
                  color: colorRef.current,
                  id: "active",
                  level: progressRef.current,
                  levelNumber: Math.max(
                    1,
                    Math.round(progressRef.current / 10),
                  ),
                  recommendedLabel: "Recommended pattern",
                  recommendedStatus: "Needs reps",
                  repsLabel: "Next reps",
                  shortLabel: "Category",
                },
              ];

        // Advance a manual hop, and hand control back to the auto cycle once
        // the band has been left alone. The hand-back rebases the auto clock
        // onto the tab currently shown so it continues from here rather than
        // snapping to wherever the free-running clock had got to.
        if (chyronManualActive) {
          if (chyronManualDir !== 0) {
            const slideMs =
              DASHBOARD_CATEGORY_UFO_CHYRON_SLIDE_SECONDS * 1000;
            const t = Math.min(
              1,
              (time - chyronManualSlideStartMs) / slideMs,
            );
            chyronManualSlide = chyronManualDir * smoothStepNumber(t);
            if (t >= 1) {
              chyronManualBase += chyronManualDir;
              chyronManualDir = 0;
              chyronManualSlide = 0;
            }
          }
          if (
            chyronManualDir === 0 &&
            time - chyronManualLastInputMs >
              DASHBOARD_CATEGORY_UFO_CHYRON_MANUAL_HOLD_MS
          ) {
            chyronManualActive = false;
            chyronManualSlide = 0;
            chyronTimelineStartSeconds =
              chyronClockSeconds -
              chyronManualBase * DASHBOARD_CATEGORY_UFO_CHYRON_PERIOD_SECONDS;
          }
        }

        // Pre-dock the clock pins at phase 0 (empty fill, no overlay) so the
        // dock rebase continues seamlessly into the active tab's level sweep.
        // While the UFO is live the clock runs in wall time: 10s hold with
        // the sweep, quick hop, next tab. Other highlight states freeze on
        // the last hold-settled frame.
        let chyronSeconds: number;
        if (!hasChyronAdvancedAfterDock) {
          chyronSeconds = 0;
        } else if (isUfoSelected) {
          const liveChyronSeconds = Math.max(
            0,
            chyronClockSeconds - chyronTimelineStartSeconds,
          );
          const chyronPhase =
            liveChyronSeconds -
            Math.floor(
              liveChyronSeconds / DASHBOARD_CATEGORY_UFO_CHYRON_PERIOD_SECONDS,
            ) *
              DASHBOARD_CATEGORY_UFO_CHYRON_PERIOD_SECONDS;
          // Once the level sweep has settled, the only pixels still moving in
          // the band are the decorative scanline and flash. Quantising the
          // clock there lets the identical-frame guard below skip most
          // redraws: the 2048x384 rasterize + upload was measured at ~9.2M
          // texture pixels/sec and cost ~5fps of the open panel by itself.
          const inSettledHold =
            chyronPhase > DASHBOARD_CATEGORY_UFO_CHYRON_SWEEP_SECONDS &&
            chyronPhase <= DASHBOARD_CATEGORY_UFO_CHYRON_HOLD_SECONDS;
          chyronSeconds = inSettledHold
            ? Math.floor(
                liveChyronSeconds * DASHBOARD_CATEGORY_UFO_CHYRON_HOLD_REDRAW_HZ,
              ) / DASHBOARD_CATEGORY_UFO_CHYRON_HOLD_REDRAW_HZ
            : liveChyronSeconds;
          chyronHeldSeconds =
            Math.floor(
              liveChyronSeconds / DASHBOARD_CATEGORY_UFO_CHYRON_PERIOD_SECONDS,
            ) *
              DASHBOARD_CATEGORY_UFO_CHYRON_PERIOD_SECONDS +
            DASHBOARD_CATEGORY_UFO_CHYRON_PIN_SECONDS;
        } else {
          chyronSeconds = chyronHeldSeconds;
        }
        const chyronPhaseSeconds =
          chyronSeconds -
          Math.floor(
            chyronSeconds / DASHBOARD_CATEGORY_UFO_CHYRON_PERIOD_SECONDS,
          ) *
            DASHBOARD_CATEGORY_UFO_CHYRON_PERIOD_SECONDS;
        const chyronUpdateInterval = chyronManualDir !== 0
          ? DASHBOARD_CATEGORY_UFO_SLIDE_CHYRON_TEXTURE_MS
          : !isUfoSelected
          ? DASHBOARD_CATEGORY_UFO_INACTIVE_CHYRON_TEXTURE_MS
          : chyronPhaseSeconds >
              DASHBOARD_CATEGORY_UFO_CHYRON_HOLD_SECONDS - 0.1
            ? DASHBOARD_CATEGORY_UFO_SLIDE_CHYRON_TEXTURE_MS
            : DASHBOARD_CATEGORY_UFO_ACTIVE_CHYRON_TEXTURE_MS;
        if (chyronContext && time - lastChyronTextureUpdate > chyronUpdateInterval) {
          const chyronCategoryId = activeCategoryIdRef.current;
          // Pinned/frozen frames produce identical pixels — skip the 2048x384
          // rasterize + GPU upload unless something actually changed.
          //
          // The items comparison is a CONTENT signature, not object identity.
          // The page rebuilds the chyron items array on every render, and the
          // empty-items fallback above is a fresh literal each frame, so an
          // identity check reported "changed" every time and silently
          // defeated this guard — re-rasterising the band on every interval.
          // Building the key costs a few string concats, and only on the
          // frames that already passed the redraw interval.
          let chyronItemsKey = "";
          for (const item of resolvedChyronItems) {
            chyronItemsKey +=
              item.id +
              "|" +
              item.level +
              "|" +
              item.levelNumber +
              "|" +
              item.shortLabel +
              "|" +
              item.repsLabel +
              "|" +
              item.recommendedLabel +
              "|" +
              item.recommendedStatus +
              "|" +
              item.color +
              ";";
          }
          const chyronManualKey = chyronManualActive
            ? chyronManualBase + ":" + chyronManualSlide.toFixed(3)
            : "";
          if (
            chyronManualKey !== lastChyronDrawnManualKey ||
            chyronSeconds !== lastChyronDrawnSeconds ||
            chyronItemsKey !== lastChyronDrawnItemsKey ||
            chyronCategoryId !== lastChyronDrawnCategoryId
          ) {
            drawDashboardCategoryUfoChyronTexture({
              activeCategoryId: chyronCategoryId,
              canvas: chyronCanvas,
              context: chyronContext,
              items: resolvedChyronItems,
              manual: chyronManualActive
                ? { base: chyronManualBase, progress: chyronManualSlide }
                : null,
              seconds: chyronSeconds,
            });
            chyronTexture.needsUpdate = true;
            lastChyronDrawnManualKey = chyronManualKey;
            lastChyronDrawnSeconds = chyronSeconds;
            lastChyronDrawnItemsKey = chyronItemsKey;
            lastChyronDrawnCategoryId = chyronCategoryId;
          }
          lastChyronTextureUpdate = time;
        }

        const nextAccentStyle = colorRef.current;
        if (nextAccentStyle !== lastTargetAccentStyle) {
          try {
            targetAccent.setStyle(nextAccentStyle);
          } catch {
            targetAccent.set("#67e8f9");
          }
          lastTargetAccentStyle = nextAccentStyle;
        }
        const nextBeamAccentStyle = beamColorRef.current;
        if (nextBeamAccentStyle !== lastTargetBeamAccentStyle) {
          try {
            targetBeamAccent.setStyle(nextBeamAccentStyle);
          } catch {
            targetBeamAccent.set("#60a5fa");
          }
          lastTargetBeamAccentStyle = nextBeamAccentStyle;
        }

        accentColor.lerp(targetAccent, 0.085);
        beamAccent.lerp(targetBeamAccent, 0.1);
        paleAccent.copy(accentColor).lerp(whiteColor, 0.6);
        rimLight.color.copy(accentColor);
        cockpitLight.color.copy(paleAccent);
        hullMaterial.emissive.copy(accentColor).multiplyScalar(0.18);
        undersideMaterial.color.copy(accentColor).lerp(darkColor, 0.54);
        undersideMaterial.emissive.copy(accentColor).multiplyScalar(0.38);
        undersideMaterial.emissiveIntensity =
          0.3 + levelGlow * 0.08 + tornadoSync * 0.07;
        upperHullFairingMaterial.color.copy(beamAccent).lerp(whiteColor, 0.16);
        upperHullFairingMaterial.emissive
          .copy(beamAccent)
          .multiplyScalar(0.48 + tornadoSync * 0.18);
        upperHullFairingMaterial.emissiveIntensity =
          0.42 + levelGlow * 0.12 + tornadoSync * 0.22;
        upperHullFairingMaterial.opacity =
          0.58 + levelGlow * 0.08 + tornadoSync * 0.12;
        chyronCradleMaterial.color.copy(beamAccent).lerp(darkColor, 0.46);
        chyronCradleMaterial.emissive.copy(beamAccent).multiplyScalar(0.52);
        chyronCradleMaterial.emissiveIntensity =
          0.44 + levelGlow * 0.16 + tornadoSync * 0.22;
        domeMaterial.color.copy(paleAccent);
        domeMaterial.emissive.copy(accentColor).multiplyScalar(0.24);
        cockpitCrownMaterial.color.copy(accentColor).lerp(whiteColor, 0.3);
        cockpitCrownMaterial.emissive.copy(accentColor).multiplyScalar(0.52);
        cockpitCrownMaterial.emissiveIntensity =
          0.34 + levelGlow * 0.14 + tornadoSync * 0.14;
        cockpitHaloMaterial.color.copy(paleAccent);
        cockpitHaloMaterial.opacity = 0.2 + levelGlow * 0.05 + tornadoSync * 0.09;
        alienMaterial.color.copy(accentColor).lerp(alienGreen, 0.38);
        alienMaterial.emissive.copy(accentColor).multiplyScalar(0.12);
        cheekMaterial.color.copy(paleAccent).lerp(alienGreen, 0.16);
        lightMaterial.color.copy(paleAccent);
        tornadoGlowMaterial.color
          .copy(beamAccent)
          .lerp(whiteColor, 0.12 + tornadoSync * 0.14);
        tornadoGlowMaterial.opacity =
          (0.24 + levelGlow * 0.12 + tornadoSync * 0.18) *
          tornadoDeployProgress;
        lowerHullLipMaterial.color
          .copy(beamAccent)
          .lerp(whiteColor, 0.12 + tornadoSync * 0.16);
        lowerHullLipMaterial.opacity =
          0.34 + levelGlow * 0.08 + tornadoSync * 0.16;
        frontChyronClampMaterial.color
          .copy(beamAccent)
          .lerp(whiteColor, 0.24 + tornadoSync * 0.08);
        frontChyronClampMaterial.emissive
          .copy(beamAccent)
          .multiplyScalar(0.5 + tornadoSync * 0.28);
        frontChyronClampMaterial.emissiveIntensity =
          0.42 + levelGlow * 0.08 + tornadoSync * 0.24;
        frontChyronClampMaterial.opacity =
          0.42 + levelGlow * 0.08 + tornadoSync * 0.1;
        grabObjectGlowMaterial.color
          .copy(beamAccent)
          .lerp(whiteColor, 0.12 + tornadoSync * 0.12);
        grabObjectGlowMaterial.opacity = 0.32 + tornadoSync * 0.22;
        grabFloorPadMaterial.color
          .copy(beamAccent)
          .lerp(whiteColor, 0.08 + tornadoSync * 0.12);
        grabFloorPadMaterial.opacity = 0.16 + tornadoSync * 0.12;
        tractorGrabMaterial.color
          .copy(beamAccent)
          .lerp(whiteColor, 0.18 + grabGlow * 0.22);
        tractorGrabMaterial.opacity = grabGlow * 0.92;
        tractorClawMaterial.color
          .copy(beamAccent)
          .lerp(whiteColor, 0.26 + grabGlow * 0.2);
        tractorClawMaterial.opacity = grabGlow;
        tractorTendrils.forEach(({ material }, index) => {
          material.color
            .copy(beamAccent)
            .lerp(whiteColor, 0.24 + grabGlow * 0.22 + index * 0.01);
          material.opacity = grabGlow * (0.48 + index * 0.035);
        });
        projectorReflectorMaterial.color.copy(beamAccent).lerp(
          whiteColor,
          0.22 + tornadoSync * 0.12,
        );
        projectorReflectorMaterial.emissive.copy(beamAccent).multiplyScalar(
          0.66 + tornadoSync * 0.22,
        );
        projectorReflectorMaterial.emissiveIntensity =
          0.62 + levelGlow * 0.22 + tornadoSync * 0.44;
        projectorReflectorMaterial.opacity =
          (0.74 + levelGlow * 0.08 + tornadoSync * 0.14) *
          tornadoDeployProgress;
        projectorMaterial.color
          .copy(beamAccent)
          .lerp(whiteColor, 0.18 + tornadoSync * 0.1);
        emitterThroatMaterial.color.copy(beamAccent).lerp(
          whiteColor,
          0.18 + tornadoSync * 0.12,
        );
        emitterThroatMaterial.emissive.copy(beamAccent).multiplyScalar(
          0.72 + tornadoSync * 0.32,
        );
        emitterThroatMaterial.emissiveIntensity =
          0.78 + levelGlow * 0.22 + tornadoSync * 0.44;
        emitterThroatMaterial.opacity =
          (0.34 + levelGlow * 0.08 + tornadoSync * 0.18) *
          tornadoDeployProgress *
          grabThroatProgress;
        emitterBeamMaterial.color
          .copy(beamAccent)
          .lerp(whiteColor, 0.08 + tornadoSync * 0.1);
        vortexRibbonMaterial.color.copy(beamAccent).lerp(
          whiteColor,
          0.18 + tornadoSync * 0.14,
        );
        vortexRibbonMaterial.emissive.copy(beamAccent).multiplyScalar(
          0.74 + tornadoSync * 0.28,
        );
        vortexRibbonMaterial.emissiveIntensity =
          0.56 + levelGlow * 0.18 + tornadoSync * 0.42;
        vortexRibbonMaterial.opacity =
          (0.5 + levelGlow * 0.08 + tornadoSync * 0.16) *
          tornadoDeployProgress *
          grabThroatProgress;
        vortexRingMaterial.color.copy(beamAccent).lerp(
          whiteColor,
          0.26 + tornadoSync * 0.16,
        );
        vortexRingMaterial.emissive.copy(beamAccent).multiplyScalar(
          0.82 + tornadoSync * 0.28,
        );
        vortexRingMaterial.emissiveIntensity =
          0.58 + levelGlow * 0.2 + tornadoSync * 0.44;
        vortexRingMaterial.opacity =
          (0.44 + levelGlow * 0.08 + tornadoSync * 0.18) *
          tornadoDeployProgress *
          grabThroatProgress;
        vortexCoreMaterial.color
          .copy(beamAccent)
          .lerp(whiteColor, 0.1 + tornadoSync * 0.08);

        ship.position.set(
          (1 - flyEase) * 1.35,
          0.55 + hover + (1 - flyEase) * 0.38,
          0,
        );
        ship.rotation.set(
          Math.sin(seconds * 0.62) * 0.008,
          (1 - flyEase) * -0.5 + Math.sin(seconds * 0.48) * 0.018,
          (1 - flyEase) * 0.14 + Math.sin(seconds * 0.56) * 0.006,
        );
        grabFloorPads.forEach((pad, index) => {
          const isSelected =
            index === activeGrabObjectIndex && grabIsActive;
          const padPulse = isSelected
            ? 1 +
              grabReachProgress * 0.38 +
              Math.sin(tornadoMotionSeconds * 4.2) * 0.05
            : 1;

          pad.scale.set(1.28 * padPulse, 0.44 * padPulse, 1);
          pad.rotation.z =
            tornadoMotionSeconds * (isSelected ? 0.36 : 0.08) + index;
          pad.visible =
            isSelected && grabReachProgress > 0.035 && grabFadeProgress < 0.98;
        });
        grabObjects.forEach((grabObject, index) => {
          const restPosition = grabObjectRestPositions[index];
          const idleBob =
            Math.sin(tornadoMotionSeconds * 0.72 + index * 1.8) *
            0.004 *
            grabRevealProgress;
          const idleDrift =
            Math.cos(tornadoMotionSeconds * 0.48 + index * 1.25) *
            0.008 *
            grabRevealProgress;
          const isSelected = index === activeGrabObjectIndex;
          const capturedBetweenCycles =
            isSelected &&
            grabCyclePhase >=
              grabRevealLeadSeconds + grabActiveDurationSeconds * 0.78 &&
            grabCyclePhase < grabCycleSeconds - grabRevealLeadSeconds;

          grabObject.position.set(
            restPosition.x + idleDrift,
            restPosition.y + idleBob,
            restPosition.z,
          );
          grabObject.rotation.x += tornadoDeltaSeconds * (0.42 + index * 0.08);
          grabObject.rotation.y += tornadoDeltaSeconds * (0.54 + index * 0.09);
          grabObject.rotation.z += tornadoDeltaSeconds * (0.28 + index * 0.05);
          grabObject.scale.setScalar(0.72 + grabRevealProgress * 0.28);
          grabObject.visible =
            isSelected &&
            grabIsActive &&
            grabRevealProgress > 0.02 &&
            !capturedBetweenCycles;

          if (isSelected && grabIsActive) {
            grabObject.position.lerp(grabbedObjectDockPoint, grabPullProgress);
            grabObject.scale.setScalar(
              Math.max(0.08, 1 - grabPullProgress * 0.68),
            );
            grabObject.visible = grabPullProgress < 0.96;
          }
        });

        const shouldUpdateTendrilGeometry =
          grabIsActive &&
          grabReachProgress > 0.01 &&
          time - lastTendrilGeometryUpdate >=
            DASHBOARD_CATEGORY_UFO_TENDRIL_GEOMETRY_MS;

        if (grabIsActive && grabReachProgress > 0.01) {
          const selectedObject = grabObjects[activeGrabObjectIndex];
          grabBeamStartPoint.set(0, pickupColumnTopY + 0.02, 0.44);
          grabBeamEndPoint.copy(selectedObject.position);
          grabBeamEndPoint.y += 0.025;
          grabBeamEndPoint.lerp(grabBeamStartPoint, 1 - grabReachProgress);
          grabBeamDirection.subVectors(grabBeamEndPoint, grabBeamStartPoint);
          const grabBeamLength = Math.max(0.001, grabBeamDirection.length());
          grabBeamUnitDirection.copy(grabBeamDirection).normalize();
          grabBeamSideAxis.crossVectors(
            grabBeamUnitDirection,
            grabBeamReferenceAxis,
          );
          if (grabBeamSideAxis.lengthSq() < 0.0001) {
            grabBeamSideAxis.crossVectors(
              grabBeamUnitDirection,
              grabBeamFallbackAxis,
            );
          }
          grabBeamSideAxis.normalize();
          grabBeamNormalAxis
            .crossVectors(grabBeamSideAxis, grabBeamUnitDirection)
            .normalize();

          grabBeamMidPoint
            .copy(grabBeamStartPoint)
            .addScaledVector(grabBeamDirection, 0.5);
          tractorGrabBeam.visible = true;
          tractorGrabBeam.position.copy(grabBeamMidPoint);
          tractorGrabBeam.scale.set(1 + grabGlow * 0.42, grabBeamLength, 1);
          tractorGrabBeam.quaternion.setFromUnitVectors(
            grabBeamUp,
            grabBeamUnitDirection,
          );

          tractorClaw.visible = true;
          tractorClaw.position.copy(grabBeamEndPoint);
          tractorClaw.scale.setScalar(0.86 + grabReachProgress * 0.42);
          tractorClaw.rotation.x = Math.PI / 2;
          tractorClaw.rotation.z = tornadoMotionSeconds * 1.25;

          tractorTendrils.forEach(
            ({ geometry, line, phase, positions, segments }, index) => {
              if (shouldUpdateTendrilGeometry) {
                const orbit =
                  phase + tornadoMotionSeconds * (0.74 + index * 0.035);
                const gripOrbit =
                  orbit +
                  Math.PI * 1.12 +
                  Math.sin(grabActionPhase * 0.42) * 0.2;
                const startRadius = 0.18 + grabGlow * 0.055;
                const gripRadius = 0.045 + (1 - grabPullProgress) * 0.065;
                grabTendrilStartPoint
                  .copy(grabBeamStartPoint)
                  .addScaledVector(
                    grabBeamSideAxis,
                    Math.cos(orbit) * startRadius,
                  )
                  .addScaledVector(
                    grabBeamNormalAxis,
                    Math.sin(orbit) * startRadius * 0.62,
                  )
                  .addScaledVector(
                    grabBeamUnitDirection,
                    grabReachProgress * 0.02,
                  );
                grabTendrilEndPoint
                  .copy(grabBeamEndPoint)
                  .addScaledVector(
                    grabBeamSideAxis,
                    Math.cos(gripOrbit) * gripRadius,
                  )
                  .addScaledVector(
                    grabBeamNormalAxis,
                    Math.sin(gripOrbit) * gripRadius * 0.72,
                  )
                  .addScaledVector(
                    grabBeamUnitDirection,
                    -0.022 * (1 - grabPullProgress),
                  );

                for (let segment = 0; segment <= segments; segment += 1) {
                  const progressValue = segment / segments;
                  const curl = Math.sin(progressValue * Math.PI);
                  const hook = smoothStepNumber((progressValue - 0.72) / 0.28);
                  const wave =
                    Math.sin(
                      tornadoMotionSeconds * 3.4 + phase + progressValue * 5.2,
                    ) *
                    0.052 *
                    curl *
                    (1 - grabPullProgress * 0.38);
                  const side =
                    Math.cos(
                      tornadoMotionSeconds * 1.7 + phase + progressValue * 2.6,
                    ) *
                    0.032 *
                    curl;

                  grabTendrilPoint
                    .copy(grabTendrilStartPoint)
                    .lerp(grabTendrilEndPoint, progressValue);
                  grabTendrilPoint
                    .addScaledVector(
                      grabBeamSideAxis,
                      Math.cos(orbit + progressValue * Math.PI * 1.7) *
                        (wave + side) -
                        Math.cos(phase) * hook * 0.032,
                    )
                    .addScaledVector(
                      grabBeamNormalAxis,
                      Math.sin(orbit + progressValue * Math.PI * 1.4) *
                        (wave * 0.68 + side * 0.5),
                    )
                    .addScaledVector(
                      grabBeamUnitDirection,
                      curl *
                        (0.035 + grabReachProgress * 0.035) *
                        grabPullProgress,
                    );

                  const offset = segment * 3;
                  positions[offset] = grabTendrilPoint.x;
                  positions[offset + 1] = grabTendrilPoint.y;
                  positions[offset + 2] = grabTendrilPoint.z;
                }

                geometry.attributes.position.needsUpdate = true;
              }

              line.visible = grabGlow > 0.025 && grabReachProgress > 0.05;
            },
          );

          if (shouldUpdateTendrilGeometry) {
            lastTendrilGeometryUpdate = time;
          }
        } else {
          tractorGrabBeam.visible = false;
          tractorClaw.visible = false;
          tractorTendrils.forEach(({ line }) => {
            line.visible = false;
          });
        }
        dome.scale.y = 0.72 + Math.sin(seconds * 1.1) * 0.018;
        cockpitCrown.scale.set(
          1.18 + tornadoSync * 0.03,
          0.48 + tornadoSync * 0.018,
          1,
        );
        cockpitHalo.scale.set(
          1.18 + tornadoSync * 0.055,
          0.42 + tornadoSync * 0.028,
          1,
        );
        cockpitHalo.rotation.z = seconds * 0.05;
        const blinkCycle = seconds % 4.8;
        const blink =
          blinkCycle > 4.42
            ? Math.sin(((blinkCycle - 4.42) / 0.38) * Math.PI)
            : 0;
        const moodPulse = 0.5 + Math.sin(seconds * 0.72) * 0.5;
        const glance = Math.sin(seconds * 0.54) * 0.006;
        alien.position.y = 0.635 + moodPulse * 0.008;
        alien.rotation.y = Math.sin(seconds * 0.78) * 0.06;
        head.scale.set(
          1.08 + moodPulse * 0.025,
          1.42 + moodPulse * 0.05,
          0.82,
        );
        eyes.forEach((eye, index) => {
          eye.position.x = eyeBaseXs[index] + glance;
          eye.position.y = 0.03 - blink * 0.004;
          eye.scale.set(
            1.24 + moodPulse * 0.08,
            Math.max(0.08, 0.72 * (1 - blink)),
            0.5,
          );
        });
        smile.scale.set(1 + moodPulse * 0.16, 0.78 + moodPulse * 0.24, 1);
        smile.position.y = -0.002 + moodPulse * 0.003;
        cheekMaterial.opacity = 0.1 + levelGlow * 0.06 + moodPulse * 0.14;
        cheeks.forEach((cheek, index) => {
          cheek.scale.set(
            1.12 + moodPulse * 0.18,
            0.42 + moodPulse * 0.16,
            0.34,
          );
          cheek.position.x = (index === 0 ? -0.09 : 0.09) + glance * 0.42;
        });
        cockpitLight.intensity = 1.25 + Math.sin(seconds * 2.2) * 0.22;
        upperHullFairing.position.y = tornadoSync * 0.006;
        upperHullFairing.scale.set(
          1 + tornadoSync * 0.008,
          1 + tornadoSync * 0.018,
          1,
        );
        chyronDisplay.visible = true;
        chyronDisplay.position.y = -0.30 + tornadoSync * 0.003;
        chyronDisplay.position.z = 0.62 + tornadoSync * 0.006;
        chyronDisplay.scale.set(
          1 + tornadoSync * 0.005,
          1 + tornadoSync * 0.008,
          1,
        );
        chyronDisplayMaterial.opacity =
          0.74 + levelGlow * 0.08 + tornadoSync * 0.05;
        lowerHullScoop.position.y = -0.065 + tornadoSync * 0.006;
        lowerHullScoop.scale.set(
          1 + tornadoSync * 0.014,
          1 + tornadoSync * 0.035,
          1 + tornadoSync * 0.018,
        );
        lowerHullLipGroup.position.y = -0.62 + tornadoSync * 0.006;
        lowerHullLipGroup.scale.set(
          1 + tornadoSync * 0.01,
          1 + tornadoSync * 0.025,
          1,
        );
        frontChyronClampGroup.visible = true;
        frontChyronClampGroup.position.y = tornadoSync * 0.004;
        frontChyronClampGroup.scale.set(
          1 + tornadoSync * 0.006,
          1 + tornadoSync * 0.01,
          1,
        );
        const tornadoIsDeployed = tornadoDeployProgress > 0.025;
        chyronCradle.position.y = -0.98 + tornadoSync * 0.008;
        chyronCradle.scale.set(
          0.88 + tornadoSync * 0.032,
          0.105 + tornadoSync * 0.014,
          0.23 + tornadoSync * 0.022,
        );
        chyronCradleRim.position.y = -0.86 + tornadoSync * 0.006;
        chyronCradleRim.scale.set(
          0.72 + tornadoSync * 0.022,
          0.16 + tornadoSync * 0.022,
          1,
        );
        chyronCradleGlow.visible = tornadoIsDeployed;
        chyronCradleGlow.position.y =
          -1.16 - tornadoDeployProgress * 0.045 + tornadoSync * 0.008;
        chyronCradleGlow.scale.set(
          (0.5 + tornadoDeployProgress * 0.22 + tornadoSync * 0.04) *
            Math.max(0.2, tornadoDeployProgress),
          0.12 + tornadoDeployProgress * (0.14 + tornadoSync * 0.045),
          1,
        );
        chyronCradleGlow.rotation.z = -tornadoMotionSeconds * 0.055;
        projectorReflector.visible = tornadoIsDeployed;
        projectorReflector.rotation.z = -tornadoMotionSeconds * 0.075;
        projectorReflector.position.y =
          -1 - tornadoDeployProgress * 0.03 + tornadoSync * 0.01;
        projectorReflector.scale.set(
          0.54 + tornadoDeployProgress * (0.26 + tornadoSync * 0.04),
          0.2 + tornadoDeployProgress * (0.16 + tornadoSync * 0.045),
          1,
        );
        projector.visible = tornadoIsDeployed;
        projector.rotation.z = tornadoMotionSeconds * 0.06;
        projector.position.y =
          -1.07 - tornadoDeployProgress * 0.035 + tornadoSync * 0.012;
        projector.scale.set(
          0.5 + tornadoDeployProgress * (0.28 + tornadoSync * 0.05),
          0.18 + tornadoDeployProgress * (0.18 + tornadoSync * 0.045),
          1,
        );
        projectorMaterial.opacity =
          (0.32 + levelGlow * 0.14 + tornadoSync * 0.18) *
          tornadoDeployProgress;
        const grabThroatIsVisible =
          tornadoIsDeployed && grabThroatProgress > 0.025;
        emitterThroat.visible = grabThroatIsVisible;
        emitterThroat.position.y = emitterThroatY;
        emitterThroat.scale.set(
          emitterThroatScaleX,
          emitterThroatScaleY,
          emitterThroatScaleZ,
        );
        const emitterBeamTopY = pickupEmitterAnchorY + 0.12;
        const emitterBeamBottomY = pickupColumnTopY - 0.035;
        const emitterBeamScaleY = Math.max(
          0.08,
          (emitterBeamTopY - emitterBeamBottomY) /
            (emitterBeamHalfHeight * 2),
        );
        emitterBeam.visible = tornadoIsDeployed;
        emitterBeam.position.y = (emitterBeamTopY + emitterBeamBottomY) / 2;
        emitterBeam.scale.set(
          0.34 + tornadoDeployProgress * (0.36 + tornadoSync * 0.08),
          emitterBeamScaleY,
          0.1 + tornadoDeployProgress * (0.12 + tornadoSync * 0.035),
        );
        emitterBeamMaterial.opacity =
          (0.075 + levelGlow * 0.025 + tornadoSync * 0.07) *
          tornadoDeployProgress;
        const pickupLaserScaleY =
          (pickupColumnTopY - pickupColumnBottomY) /
          (pickupLaserHalfHeight * 2);
        pickupLaser.visible = tornadoIsDeployed;
        pickupLaser.position.y = (pickupColumnTopY + pickupColumnBottomY) / 2;
        pickupLaser.scale.set(
          0.62 + tornadoDeployProgress * (0.2 + tornadoSync * 0.05),
          pickupLaserScaleY,
          0.18 + tornadoDeployProgress * 0.08,
        );
        pickupLaserMaterial.color
          .copy(beamAccent)
          .lerp(whiteColor, 0.12 + tornadoSync * 0.12);
        pickupLaserMaterial.opacity =
          (0.1 + levelGlow * 0.035 + tornadoSync * 0.075) *
          tornadoDeployProgress;
        vortexGroup.visible = grabThroatIsVisible;
        vortexGroup.position.set(0, pickupColumnTopY - 0.018, throatExitZ - 0.02);
        vortexGroup.rotation.y = tornadoMotionSeconds * 0.095;
        vortexGroup.scale.set(
          0.4 + tornadoDeployProgress * (0.5 + tornadoSync * 0.055),
          Math.max(
            0.12,
            (pickupColumnLength / 0.82) *
              (0.12 + tornadoDeployProgress * (1.72 + tornadoSync * 0.04)),
          ),
          0.4 + tornadoDeployProgress * (0.5 + tornadoSync * 0.045),
        );
        vortexCore.rotation.y = -tornadoMotionSeconds * 0.14;
        vortexCore.scale.set(
          0.38 + tornadoDeployProgress * (0.44 + tornadoSync * 0.12),
          0.16 + tornadoDeployProgress * (0.58 + tornadoSync * 0.055),
          0.1 + tornadoDeployProgress * (0.12 + tornadoSync * 0.04),
        );
        vortexCoreMaterial.opacity =
          (0.08 + levelGlow * 0.03 + tornadoSync * 0.08) *
          tornadoDeployProgress *
          grabThroatProgress;
        vortexRibbons.forEach((ribbon, index) => {
          ribbon.rotation.y =
            (index % 2 === 0 ? 1 : -1) * tornadoMotionSeconds * 0.07 +
            index * 0.18;
          ribbon.rotation.z =
            Math.sin(tornadoMotionSeconds * 0.08 + index) * 0.035;
          ribbon.scale.setScalar(
            0.22 + tornadoDeployProgress * (0.56 + tornadoSync * 0.06),
          );
        });
        vortexRings.forEach((ring, index) => {
          ring.position.y =
            -0.06 -
            index * 0.12 +
            Math.sin(tornadoMotionSeconds * 0.18 + index) * 0.007;
          ring.rotation.z =
            (index % 2 === 0 ? 1 : -1) * tornadoMotionSeconds * 0.11 +
            index * 0.38;
          ring.scale.set(
            0.34 +
              tornadoDeployProgress *
                (0.56 + tornadoSync * 0.1 - index * 0.025),
            0.14 +
              tornadoDeployProgress *
                (0.18 + index * 0.035 + tornadoSync * 0.045),
            1,
          );
        });
        const canvasOpacity = Math.max(0, Math.min(0.98, flyEase));
        if (Math.abs(canvasOpacity - lastCanvasOpacity) > 0.004) {
          canvas.style.opacity = canvasOpacity.toFixed(3);
          lastCanvasOpacity = canvasOpacity;
        }

        lights.forEach((light, index) => {
          light.scale.setScalar(
            0.82 +
              tornadoSync * 0.1 +
              Math.sin(tornadoMotionSeconds * 4.2 + index * 0.7) * 0.18,
          );
        });

        renderer.render(scene, camera);
        frameId = window.requestAnimationFrame(render);
      };

      frameId = window.requestAnimationFrame(render);

      cleanup = () => {
        if (frameId !== 0) {
          window.cancelAnimationFrame(frameId);
        }
        setDashboardWebGlCanvasActive(canvas, false);
        canvas.removeEventListener("webglcontextlost", handleContextLost);
        canvas.removeEventListener("sf-chyron-step", handleChyronStepEvent);
        canvas.removeEventListener("wheel", handleChyronWheel);
        canvas.removeEventListener("pointerdown", handleChyronPointerDown);
        canvas.removeEventListener("pointermove", handleChyronPointerMove);
        canvas.removeEventListener("pointerup", endChyronDrag);
        canvas.removeEventListener("pointercancel", endChyronDrag);
        canvas.removeEventListener("pointerleave", endChyronDrag);
        observer.disconnect();
        disposeObject(scene);
        chyronTexture.dispose();
        renderer.dispose();
      };
    };

    void startScene();

    return () => {
      cancelled = true;
      cleanup();
      // Guard against setting state after unmount: cancel any pending scene
      // restart scheduled by handleContextLost or the budget retry above.
      if (contextRestartId !== 0) {
        window.clearTimeout(contextRestartId);
        contextRestartId = 0;
      }
    };
  }, [contextResetToken]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="dashboard-header-category-levels-menu__ufo-webgl"
      // Keyed so each context-loss restart mounts a NEW canvas element:
      // getContext() on the old one can only return the same dead context,
      // which made every rebuild a silent no-op.
      key={contextResetToken}
      data-category-ufo-active={isActive ? "true" : "false"}
      data-category-ufo-renderer="pending"
      data-category-ufo-state={isOpen ? "open" : "closing"}
      height={420}
      style={
        {
          "--dashboard-header-category-color": color,
        } as CSSProperties
      }
      width={720}
    />
  );
}

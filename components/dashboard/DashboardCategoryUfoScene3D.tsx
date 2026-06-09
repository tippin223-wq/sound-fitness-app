"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { BufferGeometry, Material, Object3D } from "three";
import {
  createDashboardWebGlRenderer,
  loadDashboardThree,
  waitForDashboardWebGlStart,
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

const DASHBOARD_CATEGORY_UFO_CHYRON_STEP_SECONDS = 16;

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
  seconds,
}: {
  activeCategoryId?: string;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  items: DashboardCategoryUfoChyronItem[];
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
  const tabHeight = 368;
  const tabY = 8;
  const stepSeconds = DASHBOARD_CATEGORY_UFO_CHYRON_STEP_SECONDS;
  const rawPosition = seconds / stepSeconds;
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

  for (const { centerX, item } of drawEntries) {
    const distanceStrength = clampNumber(
      1 - Math.abs(centerX - width / 2) / (tabStep * 1.42),
      0.12,
      1,
    );
    const x = centerX - tabWidth / 2;
    const progressWidth =
      tabWidth * clampNumber(item.level / 100, 0.04, 1);
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

    const actorX = 286;
    const textX = tabWidth * 0.52;
    const repsX = tabWidth - 170;

    drawDashboardChyronActor(
      context,
      item.id,
      actorX,
      tabHeight / 2,
      282,
      item.color,
      distanceStrength,
      seconds,
    );

    context.textAlign = "center";
    context.textBaseline = "middle";
    context.shadowBlur = 58;
    context.shadowColor = colorToRgba(item.color, 0.96);
    context.fillStyle = "rgba(255, 255, 255, 0.99)";
    context.font = "950 104px Arial, sans-serif";
    context.fillText(
      ellipsizeCanvasText(
        context,
        `${item.shortLabel} LV ${item.levelNumber}`,
        1120,
      ),
      textX,
      86,
      1140,
    );

    context.shadowBlur = 40;
    context.shadowColor = colorToRgba(item.color, 1);
    context.fillStyle = colorToRgba(item.color, 1);
    context.font = "900 48px Arial, sans-serif";
    context.fillText("RECOMMENDED", textX, 166, 1080);

    context.shadowBlur = 46;
    context.shadowColor = colorToRgba(item.color, 0.96);
    context.fillStyle = "rgba(240, 253, 250, 0.98)";
    context.font = "950 64px Arial, sans-serif";
    drawWrappedCanvasText(
      context,
      item.recommendedLabel,
      textX,
      238,
      1140,
      68,
      2,
    );

    context.textAlign = "right";
    context.shadowBlur = 42;
    context.shadowColor = colorToRgba(item.color, 1);
    context.fillStyle = "rgba(255, 255, 255, 0.96)";
    context.font = "950 58px Arial, sans-serif";
    context.fillText(item.repsLabel, repsX, 206, 360);

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

    const startScene = async () => {
      await waitForDashboardWebGlStart();
      if (cancelled || !canvasRef.current) return;

      const THREE = await loadDashboardThree();
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
        return;
      }

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
      underside.position.set(0, 0.23, 0.04);
      underside.scale.set(2.6, 0.17, 0.5);
      ship.add(underside);

      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(1.82, 0.038, 12, 112),
        hullMaterial,
      );
      rim.position.set(0, 0.37, 0.04);
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
      chyronCradle.position.set(0, -0.66, 0.18);
      chyronCradle.scale.set(0.88, 0.11, 0.23);
      ship.add(chyronCradle);

      const chyronCradleRim = new THREE.Mesh(
        new THREE.TorusGeometry(1.36, 0.03, 10, 112),
        hullMaterial,
      );
      chyronCradleRim.position.set(0, -0.56, 0.38);
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
            new THREE.Vector3(-1.66, 0.002, 0.5),
            new THREE.Vector3(-0.84, -0.008, 0.54),
            new THREE.Vector3(0, -0.014, 0.565),
            new THREE.Vector3(0.84, -0.008, 0.54),
            new THREE.Vector3(1.66, 0.002, 0.5),
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
            new THREE.Vector3(-1.66, -0.43, 0.52),
            new THREE.Vector3(-0.84, -0.438, 0.575),
            new THREE.Vector3(0, -0.446, 0.6),
            new THREE.Vector3(0.84, -0.438, 0.575),
            new THREE.Vector3(1.66, -0.43, 0.52),
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
              new THREE.Vector3(side * 1.66, 0.002, 0.5),
              new THREE.Vector3(side * 1.68, -0.14, 0.525),
              new THREE.Vector3(side * 1.68, -0.29, 0.53),
              new THREE.Vector3(side * 1.66, -0.43, 0.52),
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
      chyronCradleGlow.position.set(0, -0.76, 0.18);
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
      chyronCanvas.height = 384;
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
        new THREE.PlaneGeometry(3.18, 0.44, 18, 1),
        chyronDisplayMaterial,
      );
      chyronDisplay.position.set(0, -0.205, 0.62);
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

      const grabFloorY = -5.88;
      const grabObjectRestPositions = [
        new THREE.Vector3(-0.52, grabFloorY + 0.14, 0.62),
        new THREE.Vector3(0.06, grabFloorY + 0.16, 0.58),
        new THREE.Vector3(0.58, grabFloorY + 0.13, 0.64),
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

      const grabBeamStartPoint = new THREE.Vector3();
      const grabBeamEndPoint = new THREE.Vector3();
      const grabBeamMidPoint = new THREE.Vector3();
      const grabBeamDirection = new THREE.Vector3();
      const grabBeamUp = new THREE.Vector3(0, 1, 0);
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
        ship.scale.setScalar(0.66 * clampNumber(390 / height, 0.56, 1));
      };

      const observer = new ResizeObserver(resize);
      observer.observe(canvas);
      resize();

      const handleContextLost = (event: Event) => {
        event.preventDefault();
        canvas.dataset.categoryUfoRenderer = "lost";
        canvas.style.opacity = "0";
        cleanup();
      };
      canvas.addEventListener("webglcontextlost", handleContextLost);

      let frameId = 0;
      const startedAt = performance.now();
      let lastFrameTime = startedAt;
      let activeSeconds = 0;
      let presence = 0;
      let lastChyronTextureUpdate = 0;
      let hasChyronAdvancedAfterDock = false;
      let previousOpenState = isOpenRef.current;
      let activeGrabCycle = -1;
      let activeGrabObjectIndex = 0;
      const render = (time: number) => {
        const deltaSeconds = Math.min(
          0.06,
          Math.max(0, (time - lastFrameTime) / 1000),
        );
        lastFrameTime = time;
        const isOpenNow = isOpenRef.current;
        if (isOpenNow !== previousOpenState) {
          hasChyronAdvancedAfterDock = false;
          previousOpenState = isOpenNow;
        }
        if (isOpenNow) {
          activeSeconds += deltaSeconds;
        }
        const seconds = activeSeconds;
        const isUfoSelected = isActiveRef.current;
        const targetPresence = isOpenNow ? 1 : 0;
        presence +=
          (targetPresence - presence) * (isOpenNow ? 0.18 : 0.2);
        const flyEase = 1 - Math.pow(1 - presence, 3);
        const tornadoDeployProgress = smoothStepNumber((flyEase - 0.82) / 0.16);
        if (isOpenNow && !hasChyronAdvancedAfterDock && flyEase > 0.985) {
          hasChyronAdvancedAfterDock = true;
        }
        const hover = Math.sin(seconds * 0.86) * 0.014 * flyEase;
        const levelGlow = Math.max(
          0.4,
          Math.min(1, progressRef.current / 100),
        );
        const tornadoSync = 0.5 + Math.sin((seconds * Math.PI * 2) / 42) * 0.5;
        const grabCycleSeconds = 60;
        const grabCycleOffsetSeconds = 54;
        const grabRevealLeadSeconds = 2.4;
        const grabActiveDurationSeconds = 12.6;
        const grabTimelineSeconds = seconds + grabCycleOffsetSeconds;
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
          ? smoothStepNumber(grabActionPhase / 3.2)
          : 0;
        const grabPullProgress = grabIsActive
          ? smoothStepNumber((grabActionPhase - 3.1) / 5.4)
          : 0;
        const grabFadeProgress = grabIsActive
          ? smoothStepNumber((grabActionPhase - 9.1) / 2.6)
          : 0;
        const grabRevealProgress = grabObjectIsRevealed
          ? smoothStepNumber(grabCyclePhase / grabRevealLeadSeconds)
          : 0;
        const grabGlow =
          grabIsActive && grabReachProgress > 0
            ? (1 - grabFadeProgress * 0.72) *
              (0.72 + Math.sin(seconds * 10.5) * 0.12)
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
        const pickupColumnTopY = throatExitY + 0.03;
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

        const chyronUpdateInterval = isUfoSelected ? 28 : 180;
        if (chyronContext && time - lastChyronTextureUpdate > chyronUpdateInterval) {
          const chyronSeconds =
            (isUfoSelected ? seconds : 0) +
            (hasChyronAdvancedAfterDock && resolvedChyronItems.length > 1
              ? DASHBOARD_CATEGORY_UFO_CHYRON_STEP_SECONDS
              : 0);

          drawDashboardCategoryUfoChyronTexture({
            activeCategoryId: activeCategoryIdRef.current,
            canvas: chyronCanvas,
            context: chyronContext,
            items: resolvedChyronItems,
            seconds: chyronSeconds,
          });
          chyronTexture.needsUpdate = true;
          lastChyronTextureUpdate = time;
        }

        try {
          targetAccent.setStyle(colorRef.current);
        } catch {
          targetAccent.set("#67e8f9");
        }
        try {
          targetBeamAccent.setStyle(beamColorRef.current);
        } catch {
          targetBeamAccent.set("#60a5fa");
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
          tornadoDeployProgress;
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
          tornadoDeployProgress;
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
          tornadoDeployProgress;
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
            index === activeGrabObjectIndex && grabObjectIsRevealed;
          const padPulse = isSelected
            ? 1 + grabReachProgress * 0.38 + Math.sin(seconds * 7.2) * 0.05
            : 1;

          pad.scale.set(1.28 * padPulse, 0.44 * padPulse, 1);
          pad.rotation.z = seconds * (isSelected ? 0.36 : 0.08) + index;
          pad.visible = isSelected && grabRevealProgress > 0.02;
        });
        grabObjects.forEach((grabObject, index) => {
          const restPosition = grabObjectRestPositions[index];
          const idleBob =
            Math.sin(seconds * 0.72 + index * 1.8) * 0.004 * grabRevealProgress;
          const idleDrift =
            Math.cos(seconds * 0.48 + index * 1.25) *
            0.008 *
            grabRevealProgress;
          const isSelected = index === activeGrabObjectIndex;
          const capturedBetweenCycles =
            isSelected &&
            grabCyclePhase >= grabRevealLeadSeconds + 10.2 &&
            grabCyclePhase < 53.2;

          grabObject.position.set(
            restPosition.x + idleDrift,
            restPosition.y + idleBob,
            restPosition.z,
          );
          grabObject.rotation.x += deltaSeconds * (0.42 + index * 0.08);
          grabObject.rotation.y += deltaSeconds * (0.54 + index * 0.09);
          grabObject.rotation.z += deltaSeconds * (0.28 + index * 0.05);
          grabObject.scale.setScalar(0.72 + grabRevealProgress * 0.28);
          grabObject.visible =
            isSelected &&
            grabObjectIsRevealed &&
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

        if (grabIsActive && grabReachProgress > 0.01) {
          const selectedObject = grabObjects[activeGrabObjectIndex];
          grabBeamStartPoint.set(0, throatExitY, 0.44);
          grabBeamEndPoint.copy(selectedObject.position);
          grabBeamEndPoint.y += 0.025;
          grabBeamEndPoint.lerp(grabBeamStartPoint, 1 - grabReachProgress);
          grabBeamDirection.subVectors(grabBeamEndPoint, grabBeamStartPoint);
          const grabBeamLength = Math.max(0.001, grabBeamDirection.length());

          grabBeamMidPoint
            .copy(grabBeamStartPoint)
            .addScaledVector(grabBeamDirection, 0.5);
          tractorGrabBeam.visible = true;
          tractorGrabBeam.position.copy(grabBeamMidPoint);
          tractorGrabBeam.scale.set(1 + grabGlow * 0.42, grabBeamLength, 1);
          tractorGrabBeam.quaternion.setFromUnitVectors(
            grabBeamUp,
            grabBeamDirection.normalize(),
          );

          tractorClaw.visible = true;
          tractorClaw.position.copy(grabBeamEndPoint);
          tractorClaw.scale.setScalar(0.86 + grabReachProgress * 0.42);
          tractorClaw.rotation.x = Math.PI / 2;
          tractorClaw.rotation.z = seconds * 1.25;
        } else {
          tractorGrabBeam.visible = false;
          tractorClaw.visible = false;
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
        chyronDisplay.position.y = -0.212 + tornadoSync * 0.003;
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
        lowerHullLipGroup.position.y = -0.095 + tornadoSync * 0.006;
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
        chyronCradle.position.y = -0.82 + tornadoSync * 0.008;
        chyronCradle.scale.set(
          0.88 + tornadoSync * 0.032,
          0.105 + tornadoSync * 0.014,
          0.23 + tornadoSync * 0.022,
        );
        chyronCradleRim.position.y = -0.72 + tornadoSync * 0.006;
        chyronCradleRim.scale.set(
          0.72 + tornadoSync * 0.022,
          0.16 + tornadoSync * 0.022,
          1,
        );
        chyronCradleGlow.visible = tornadoIsDeployed;
        chyronCradleGlow.position.y =
          -1.02 - tornadoDeployProgress * 0.045 + tornadoSync * 0.008;
        chyronCradleGlow.scale.set(
          (0.5 + tornadoDeployProgress * 0.22 + tornadoSync * 0.04) *
            Math.max(0.2, tornadoDeployProgress),
          0.12 + tornadoDeployProgress * (0.14 + tornadoSync * 0.045),
          1,
        );
        chyronCradleGlow.rotation.z = -seconds * 0.055;
        projectorReflector.visible = tornadoIsDeployed;
        projectorReflector.rotation.z = -seconds * 0.075;
        projectorReflector.position.y =
          -1 - tornadoDeployProgress * 0.03 + tornadoSync * 0.01;
        projectorReflector.scale.set(
          0.54 + tornadoDeployProgress * (0.26 + tornadoSync * 0.04),
          0.2 + tornadoDeployProgress * (0.16 + tornadoSync * 0.045),
          1,
        );
        projector.visible = tornadoIsDeployed;
        projector.rotation.z = seconds * 0.06;
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
        emitterThroat.visible = tornadoIsDeployed;
        emitterThroat.position.y = emitterThroatY;
        emitterThroat.scale.set(
          emitterThroatScaleX,
          emitterThroatScaleY,
          emitterThroatScaleZ,
        );
        const emitterBeamScaleY =
          0.13 + tornadoDeployProgress * (0.5 + tornadoSync * 0.05);
        emitterBeam.visible = tornadoIsDeployed;
        emitterBeam.position.y =
          throatExitY - emitterBeamHalfHeight * emitterBeamScaleY + 0.018;
        emitterBeam.scale.set(
          0.3 + tornadoDeployProgress * (0.3 + tornadoSync * 0.1),
          emitterBeamScaleY,
          0.08 + tornadoDeployProgress * (0.1 + tornadoSync * 0.04),
        );
        emitterBeamMaterial.opacity =
          (0.045 + levelGlow * 0.02 + tornadoSync * 0.055) *
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
        vortexGroup.visible = tornadoIsDeployed;
        vortexGroup.position.set(0, pickupColumnTopY - 0.018, throatExitZ - 0.02);
        vortexGroup.rotation.y = seconds * 0.095;
        vortexGroup.scale.set(
          0.4 + tornadoDeployProgress * (0.5 + tornadoSync * 0.055),
          Math.max(
            0.12,
            (pickupColumnLength / 0.82) *
              (0.12 + tornadoDeployProgress * (0.88 + tornadoSync * 0.025)),
          ),
          0.4 + tornadoDeployProgress * (0.5 + tornadoSync * 0.045),
        );
        vortexCore.rotation.y = -seconds * 0.14;
        vortexCore.scale.set(
          0.38 + tornadoDeployProgress * (0.44 + tornadoSync * 0.12),
          0.16 + tornadoDeployProgress * (0.58 + tornadoSync * 0.055),
          0.1 + tornadoDeployProgress * (0.12 + tornadoSync * 0.04),
        );
        vortexCoreMaterial.opacity =
          (0.08 + levelGlow * 0.03 + tornadoSync * 0.08) *
          tornadoDeployProgress;
        vortexRibbons.forEach((ribbon, index) => {
          ribbon.rotation.y =
            (index % 2 === 0 ? 1 : -1) * seconds * 0.07 + index * 0.18;
          ribbon.rotation.z = Math.sin(seconds * 0.08 + index) * 0.035;
          ribbon.scale.setScalar(
            0.22 + tornadoDeployProgress * (0.56 + tornadoSync * 0.06),
          );
        });
        vortexRings.forEach((ring, index) => {
          ring.position.y =
            -0.06 - index * 0.12 + Math.sin(seconds * 0.18 + index) * 0.007;
          ring.rotation.z =
            (index % 2 === 0 ? 1 : -1) * seconds * 0.11 + index * 0.38;
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
        canvas.style.opacity = String(Math.max(0, Math.min(0.98, flyEase)));

        lights.forEach((light, index) => {
          light.scale.setScalar(
            0.82 +
              tornadoSync * 0.1 +
              Math.sin(seconds * 4.2 + index * 0.7) * 0.18,
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
        canvas.removeEventListener("webglcontextlost", handleContextLost);
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
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="dashboard-header-category-levels-menu__ufo-webgl"
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

"use client";

import { useEffect, useRef } from "react";
import type { BufferGeometry, Material, Object3D } from "three";
import {
  createDashboardWebGlRenderer,
  loadDashboardThree,
  waitForDashboardWebGlStart,
} from "./dashboardWebGlRenderer";

type ThreeModule = typeof import("three");

type MaterialObject = Object3D & {
  material?: Material | Material[];
};

type GeometryObject = Object3D & {
  geometry?: BufferGeometry;
};

export type DashboardSoundPointsTurbineItem = {
  count: number;
  id: string;
  label: string;
  progress?: number;
};

type DashboardSoundPointsTeslaCoil3DProps = {
  className?: string;
  paused?: boolean;
  points: number;
  turbines: readonly DashboardSoundPointsTurbineItem[];
  weeklyProgress?: number;
};

type DashboardSoundPointsTerraceDeck = {
  depth: number;
  opacity: number;
  width: number;
  y: number;
  z: number;
};

type DashboardStageIlluminationTarget = {
  baseEmissiveIntensity?: number;
  baseOpacity: number;
  color: string;
  materials: DashboardIlluminatedMaterial[];
  object: MaterialObject;
  peakEmissiveIntensity?: number;
  peakOpacity: number;
  y: number;
};

type DashboardIlluminatedMaterial = Material & {
  color?: { set: (color: string) => void };
  emissive?: { set: (color: string) => void };
  emissiveIntensity?: number;
  opacity?: number;
};

const turbineToneColors: Record<string, string> = {
  consistency: "#facc15",
  intensity: "#fb7185",
  knowledge: "#a78bfa",
  recovery: "#34d399",
  technique: "#fb923c",
  volume: "#7dd3fc",
};

const turbineLayouts: Record<
  string,
  { position: [number, number, number]; scale: number; tilt: number; yaw: number }
> = {
  consistency: { position: [1.12, 0.3, -0.64], scale: 0.56, tilt: 0.025, yaw: -0.08 },
  intensity: { position: [-1.12, 0.3, -0.64], scale: 0.56, tilt: -0.025, yaw: 0.08 },
  knowledge: { position: [1.68, -0.34, -0.18], scale: 0.72, tilt: 0.035, yaw: -0.16 },
  recovery: { position: [-1.68, -0.34, -0.18], scale: 0.72, tilt: -0.035, yaw: 0.16 },
  technique: { position: [1.14, -1.12, 0.3], scale: 0.86, tilt: 0.045, yaw: -0.2 },
  volume: { position: [-1.14, -1.12, 0.3], scale: 0.86, tilt: -0.045, yaw: 0.2 },
};

const stageTerraceDecks: DashboardSoundPointsTerraceDeck[] = [
  { depth: 0.76, opacity: 0.58, width: 4.92, y: -1.5, z: 0.42 },
  { depth: 0.62, opacity: 0.56, width: 4.14, y: -0.76, z: -0.1 },
  { depth: 0.48, opacity: 0.5, width: 3.02, y: -0.08, z: -0.56 },
];

const getTurbineTopCharge = (levelProgress: number) =>
  Math.pow(Math.max(0, (levelProgress - 0.72) / 0.28), 1.45);

const getTurbinePowerCharge = (levelProgress: number, count: number) =>
  Math.min(
    1,
    Math.max(
      getTurbineTopCharge(levelProgress),
      Math.pow(Math.min(1, Math.max(0, count) / 8), 1.08) * 0.92,
      levelProgress * 0.58,
    ),
  );

const getTurbineRotorSpeed = (levelProgress: number, index: number) => {
  const chargedCurve = Math.pow(levelProgress, 2.05);
  const nearLevelBoost = getTurbineTopCharge(levelProgress);

  return 0.16 + chargedCurve * 3.12 + nearLevelBoost * 7.4 + index * 0.018;
};

const LIGHTNING_ARC_POINT_COUNT = 12;
const LIGHTNING_ARC_SEGMENT_COUNT = LIGHTNING_ARC_POINT_COUNT - 1;
const LIGHTNING_ARC_SPARK_COUNT = 8;
const TESLA_ORB_CROWN_ARC_COUNT = 7;
const TESLA_ORB_CROWN_POINT_COUNT = 5;
const STAGE_CHASE_STEP_SECONDS = 0.18;
const STAGE_CHASE_PAUSE_SECONDS = 0.22;
const TESLA_ACTIVE_FRAME_INTERVAL_MS = 1000 / 42;
const TESLA_IDLE_FRAME_INTERVAL_MS = 1000 / 24;
const TESLA_OPENING_RENDER_SECONDS = 6.6;
const STAGE_CHASE_COLORS = [
  "#22d3ee",
  "#a78bfa",
  "#34d399",
  "#facc15",
  "#fb7185",
  "#7dd3fc",
  "#f0abfc",
];

const getIlluminatedMaterials = (object: MaterialObject) => {
  const material = object.material;
  if (!material) return [];

  return (Array.isArray(material) ? material : [material]).map(
    (item) => item as DashboardIlluminatedMaterial,
  );
};

const setIlluminationTargetPulse = (
  target: DashboardStageIlluminationTarget,
  pulse: number,
) => {
  const clampedPulse = Math.max(0, Math.min(1, pulse));
  target.materials.forEach((illuminated) => {
    const nextOpacity =
      target.baseOpacity +
      (target.peakOpacity - target.baseOpacity) * clampedPulse;

    if (typeof illuminated.opacity === "number") {
      illuminated.opacity = nextOpacity;
    }
    if (typeof illuminated.emissiveIntensity === "number") {
      illuminated.emissiveIntensity =
        (target.baseEmissiveIntensity ?? 0.12) +
        ((target.peakEmissiveIntensity ?? 0.8) -
          (target.baseEmissiveIntensity ?? 0.12)) *
          clampedPulse;
    }
  });
};

const updateStageIlluminationTargets = (
  targets: DashboardStageIlluminationTarget[] | undefined,
  seconds: number,
) => {
  if (!targets?.length) return;

  const count = targets.length;
  const upDuration = count * STAGE_CHASE_STEP_SECONDS;
  const downStart = upDuration + STAGE_CHASE_PAUSE_SECONDS;
  const downDuration = count * STAGE_CHASE_STEP_SECONDS;
  const chaseEnd = downStart + downDuration;

  targets.forEach((target, index) => {
    const idlePulse =
      seconds > chaseEnd
        ? Math.max(0, Math.sin(seconds * 1.42 + index * 0.88)) * 0.12
        : 0;
    let chasePulse = 0;

    if (seconds < upDuration) {
      const cursor = seconds / STAGE_CHASE_STEP_SECONDS;
      chasePulse = Math.max(0, 1 - Math.abs(cursor - index) / 0.52);
    } else if (seconds >= downStart && seconds < chaseEnd) {
      const cursor =
        count - 1 - (seconds - downStart) / STAGE_CHASE_STEP_SECONDS;
      chasePulse = Math.max(0, 1 - Math.abs(cursor - index) / 0.52);
    }

    setIlluminationTargetPulse(target, Math.max(chasePulse, idlePulse));
  });
};

const createStageFloorTexture = (THREE: ThreeModule) => {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 288;

  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    const baseGlow = context.createLinearGradient(0, 0, 0, canvas.height);
    baseGlow.addColorStop(0, "rgba(12, 74, 110, 0.1)");
    baseGlow.addColorStop(0.32, "rgba(14, 165, 233, 0.28)");
    baseGlow.addColorStop(0.7, "rgba(6, 78, 96, 0.36)");
    baseGlow.addColorStop(1, "rgba(2, 6, 23, 0.72)");
    context.fillStyle = baseGlow;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.save();
    context.globalCompositeOperation = "lighter";
    context.lineCap = "round";

    context.fillStyle = "rgba(8, 47, 73, 0.42)";
    context.beginPath();
    context.ellipse(
      canvas.width * 0.5,
      canvas.height * 0.66,
      canvas.width * 0.46,
      canvas.height * 0.34,
      0,
      0,
      Math.PI * 2,
    );
    context.fill();

    for (let index = 0; index < 7; index += 1) {
      context.strokeStyle =
        index % 2 === 0
          ? "rgba(125, 211, 252, 0.28)"
          : "rgba(255, 255, 255, 0.16)";
      context.lineWidth = index === 0 ? 2.6 : 1.1;
      context.beginPath();
      context.ellipse(
        canvas.width * 0.5,
        canvas.height * 0.66,
        canvas.width * (0.45 - index * 0.046),
        canvas.height * (0.3 - index * 0.03),
        0,
        0,
        Math.PI * 2,
      );
      context.stroke();
    }

    const vanishingX = canvas.width * 0.5;
    const vanishingY = canvas.height * 0.08;
    context.lineWidth = 1;
    for (let index = -8; index <= 8; index += 1) {
      const x = canvas.width * 0.5 + index * 48;
      context.strokeStyle =
        index % 2 === 0
          ? "rgba(125, 211, 252, 0.34)"
          : "rgba(34, 211, 238, 0.18)";
      context.beginPath();
      context.moveTo(vanishingX, vanishingY);
      context.lineTo(x, canvas.height - 4);
      context.stroke();
    }

    for (let index = 0; index < 10; index += 1) {
      const y = 64 + index * 18 + index * index * 0.82;
      const inset = index * 27;
      context.strokeStyle =
        index % 2 === 0
          ? "rgba(191, 219, 254, 0.24)"
          : "rgba(14, 165, 233, 0.18)";
      context.lineWidth = index < 3 ? 1 : 1.15;
      context.beginPath();
      context.moveTo(inset, y);
      context.lineTo(canvas.width - inset, y);
      context.stroke();
    }

    context.setLineDash([12, 14]);
    context.strokeStyle = "rgba(255, 255, 255, 0.18)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(46, 214);
    context.bezierCurveTo(220, 184, 530, 188, 722, 214);
    context.stroke();
    context.setLineDash([]);

    for (let index = 0; index < 24; index += 1) {
      const x = 50 + ((index * 67) % 668);
      const y = 148 + ((index * 37) % 102);
      const size = 4 + (index % 4) * 2;
      context.fillStyle =
        index % 3 === 0
          ? "rgba(191, 219, 254, 0.34)"
          : "rgba(45, 212, 191, 0.26)";
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + size * 1.7, y + size * 0.35);
      context.lineTo(x + size * 0.8, y + size);
      context.lineTo(x - size * 0.7, y + size * 0.65);
      context.closePath();
      context.fill();
    }

    context.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
  return texture;
};

const createConnectedFloorTexture = (THREE: ThreeModule) => {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 384;

  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.globalCompositeOperation = "source-over";

    const centerX = canvas.width * 0.5;
    const centerY = canvas.height * 0.56;
    const radiusX = canvas.width * 0.44;
    const radiusY = canvas.height * 0.34;

    const floorGradient = context.createRadialGradient(
      centerX,
      centerY,
      radiusY * 0.05,
      centerX,
      centerY,
      radiusX,
    );
    floorGradient.addColorStop(0, "rgba(125, 211, 252, 0.34)");
    floorGradient.addColorStop(0.36, "rgba(14, 165, 233, 0.22)");
    floorGradient.addColorStop(0.7, "rgba(20, 184, 166, 0.12)");
    floorGradient.addColorStop(1, "rgba(8, 47, 73, 0)");

    context.fillStyle = floorGradient;
    context.beginPath();
    context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.fill();

    context.globalCompositeOperation = "lighter";
    for (let index = 0; index < 7; index += 1) {
      const inset = index * 0.07;
      context.strokeStyle =
        index === 0
          ? "rgba(191, 219, 254, 0.5)"
          : "rgba(125, 211, 252, 0.18)";
      context.lineWidth = index === 0 ? 2.5 : 1.15;
      context.beginPath();
      context.ellipse(
        centerX,
        centerY,
        radiusX * (1 - inset),
        radiusY * (1 - inset * 0.82),
        0,
        0,
        Math.PI * 2,
      );
      context.stroke();
    }

    for (let index = -5; index <= 5; index += 1) {
      const xOffset = index * 48;
      context.strokeStyle =
        index === 0
          ? "rgba(255, 255, 255, 0.2)"
          : "rgba(45, 212, 191, 0.12)";
      context.lineWidth = index === 0 ? 1.4 : 1;
      context.beginPath();
      context.moveTo(centerX + xOffset * 0.28, centerY - radiusY * 0.86);
      context.quadraticCurveTo(
        centerX + xOffset,
        centerY,
        centerX + xOffset * 1.18,
        centerY + radiusY * 0.84,
      );
      context.stroke();
    }

    for (let index = 0; index < 5; index += 1) {
      const y = centerY - radiusY * 0.56 + index * radiusY * 0.28;
      const widthRatio = 1 - Math.abs(index - 2) * 0.12;
      context.strokeStyle =
        index === 2
          ? "rgba(255, 255, 255, 0.2)"
          : "rgba(125, 211, 252, 0.12)";
      context.lineWidth = index === 2 ? 1.4 : 1;
      context.beginPath();
      context.moveTo(centerX - radiusX * widthRatio, y);
      context.quadraticCurveTo(centerX, y + 14, centerX + radiusX * widthRatio, y);
      context.stroke();
    }

    for (let index = 0; index < 20; index += 1) {
      const angle = (index / 20) * Math.PI * 2;
      const ring = 0.28 + (index % 5) * 0.13;
      const x = centerX + Math.cos(angle) * radiusX * ring;
      const y = centerY + Math.sin(angle) * radiusY * ring;
      const size = 3 + (index % 3) * 1.5;
      context.fillStyle =
        index % 2 === 0
          ? "rgba(191, 219, 254, 0.28)"
          : "rgba(45, 212, 191, 0.2)";
      context.beginPath();
      context.moveTo(x, y - size);
      context.lineTo(x + size * 1.3, y);
      context.lineTo(x, y + size);
      context.lineTo(x - size * 1.3, y);
      context.closePath();
      context.fill();
    }

    context.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
};

const addStageTerraceGeometry = (
  THREE: ThreeModule,
  group: Object3D,
) => {
  const stairChaseTargets: DashboardStageIlluminationTarget[] = [];
  const registerStairTarget = (
    object: MaterialObject,
    y: number,
    baseOpacity: number,
    peakOpacity: number,
    baseEmissiveIntensity?: number,
    peakEmissiveIntensity?: number,
  ) => {
    stairChaseTargets.push({
      baseEmissiveIntensity,
      baseOpacity,
      color: "#22d3ee",
      materials: getIlluminatedMaterials(object),
      object,
      peakEmissiveIntensity,
      peakOpacity,
      y,
    });
  };

  const deckMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.86,
    clearcoatRoughness: 0.14,
    color: new THREE.Color("#155e75"),
    depthWrite: false,
    emissive: new THREE.Color("#22d3ee"),
    emissiveIntensity: 0.48,
    metalness: 0.48,
    opacity: 0.52,
    roughness: 0.24,
    transparent: true,
  });
  const edgeMaterial = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: new THREE.Color("#a5f3fc"),
    depthWrite: false,
    opacity: 0.42,
    transparent: true,
  });
  const riserMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.52,
    clearcoatRoughness: 0.18,
    color: new THREE.Color("#0e3f55"),
    depthWrite: false,
    emissive: new THREE.Color("#0891b2"),
    emissiveIntensity: 0.36,
    metalness: 0.34,
    opacity: 0.32,
    roughness: 0.3,
    transparent: true,
  });

  stageTerraceDecks.forEach((deck, index) => {
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.54, 0.075, 64),
      deckMaterial.clone(),
    );
    const platformMaterial = platform.material as Material & { opacity?: number };
    platformMaterial.opacity = deck.opacity;
    platform.position.set(0, deck.y, deck.z);
    platform.scale.set(deck.width, 1, deck.depth);
    platform.renderOrder = -1 + index * 0.01;
    group.add(platform);
    registerStairTarget(
      platform,
      deck.y,
      deck.opacity,
      Math.min(0.96, deck.opacity + 0.34),
      0.48,
      1.18,
    );

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.0065, 8, 64),
      edgeMaterial.clone(),
    );
    const rimMaterial = rim.material as Material & { opacity?: number };
    const rimOpacity = Math.min(0.86, deck.opacity + 0.24);
    rimMaterial.opacity = rimOpacity;
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, deck.y + 0.044, deck.z);
    rim.scale.set(deck.width, deck.depth, 1);
    rim.renderOrder = 0;
    group.add(rim);
    registerStairTarget(rim, deck.y + 0.044, rimOpacity, 1);
  });

  const coilPlatformMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.88,
    clearcoatRoughness: 0.12,
    color: new THREE.Color("#0e7490"),
    depthWrite: false,
    emissive: new THREE.Color("#67e8f9"),
    emissiveIntensity: 0.42,
    metalness: 0.58,
    opacity: 0.68,
    roughness: 0.18,
    transparent: true,
  });
  const coilPlatform = new THREE.Mesh(
    new THREE.CylinderGeometry(0.56, 0.72, 0.13, 72),
    coilPlatformMaterial,
  );
  coilPlatform.position.set(0, -0.76, 0.14);
  coilPlatform.scale.set(1.22, 1, 0.42);
  coilPlatform.renderOrder = 0.08;
  group.add(coilPlatform);
  registerStairTarget(coilPlatform, -0.76, 0.68, 0.98, 0.42, 1.24);

  const coilPlatformRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.58, 0.009, 8, 64),
    edgeMaterial.clone(),
  );
  const coilPlatformRimMaterial = coilPlatformRim.material as Material & {
    opacity?: number;
  };
  coilPlatformRimMaterial.opacity = 0.82;
  coilPlatformRim.rotation.x = Math.PI / 2;
  coilPlatformRim.position.set(0, -0.685, 0.14);
  coilPlatformRim.scale.set(1.22, 0.42, 1);
  coilPlatformRim.renderOrder = 0.12;
  group.add(coilPlatformRim);
  registerStairTarget(coilPlatformRim, -0.685, 0.82, 1);

  const coilPlatformGlow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.92, 0.022, 72),
    new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: new THREE.Color("#bae6fd"),
      depthWrite: false,
      opacity: 0.2,
      transparent: true,
    }),
  );
  coilPlatformGlow.position.set(0, -0.66, 0.14);
  coilPlatformGlow.scale.set(1.14, 1, 0.42);
  coilPlatformGlow.renderOrder = 0.1;
  group.add(coilPlatformGlow);
  registerStairTarget(coilPlatformGlow, -0.66, 0.2, 0.76);

  const risers = [
    {
      depth: 0.1,
      height: stageTerraceDecks[1].y - stageTerraceDecks[0].y,
      width: 4.18,
      y: (stageTerraceDecks[1].y + stageTerraceDecks[0].y) / 2,
      z: 0.16,
    },
    {
      depth: 0.085,
      height: stageTerraceDecks[2].y - stageTerraceDecks[1].y,
      width: 3.18,
      y: (stageTerraceDecks[2].y + stageTerraceDecks[1].y) / 2,
      z: -0.36,
    },
  ];

  risers.forEach((riser, riserIndex) => {
    const face = new THREE.Mesh(
      new THREE.BoxGeometry(riser.width, riser.height, riser.depth),
      riserMaterial.clone(),
    );
    face.position.set(0, riser.y, riser.z);
    face.renderOrder = -2;
    group.add(face);
    registerStairTarget(face, riser.y, 0.32, 0.74, 0.36, 1.08);

    const stepCount = riserIndex === 0 ? 5 : 4;
    for (let stepIndex = 1; stepIndex < stepCount; stepIndex += 1) {
      const stepLine = new THREE.Mesh(
        new THREE.BoxGeometry(riser.width * (1 - stepIndex * 0.055), 0.012, 0.018),
        edgeMaterial.clone(),
      );
      const stepMaterial = stepLine.material as Material & { opacity?: number };
      stepMaterial.opacity = 0.24 + stepIndex * 0.055;
      stepLine.position.set(
        0,
        riser.y - riser.height / 2 + (riser.height * stepIndex) / stepCount,
        riser.z + 0.058,
      );
      stepLine.renderOrder = -0.5;
      group.add(stepLine);
      registerStairTarget(
        stepLine,
        stepLine.position.y,
        stepMaterial.opacity ?? 0.28,
        0.96,
      );
    }
  });

  stairChaseTargets
    .sort((a, b) => a.y - b.y)
    .forEach((target, index) => {
      target.color = STAGE_CHASE_COLORS[index % STAGE_CHASE_COLORS.length];
      target.materials.forEach((material) => {
        material.color?.set(target.color);
        material.emissive?.set(target.color);
      });
    });

  return { stairChaseTargets };
};

const createStageFloorGroup = (THREE: ThreeModule) => {
  const group = new THREE.Group();
  const floorTexture = createStageFloorTexture(THREE);
  const connectedFloorTexture = createConnectedFloorTexture(THREE);

  const connectedFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(6.18, 2.86, 1, 1),
    new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      map: connectedFloorTexture,
      opacity: 0,
      transparent: true,
    }),
  );
  connectedFloor.rotation.x = -Math.PI / 2 + 0.18;
  connectedFloor.position.set(0, -1.68, -0.22);
  connectedFloor.renderOrder = -6;
  group.add(connectedFloor);

  const platformMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.72,
    clearcoatRoughness: 0.16,
    color: new THREE.Color("#083344"),
    depthWrite: false,
    emissive: new THREE.Color("#0e7490"),
    emissiveIntensity: 0.2,
    metalness: 0.52,
    opacity: 0,
    roughness: 0.22,
    transparent: true,
  });
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(2.56, 2.86, 0.07, 72),
    platformMaterial,
  );
  platform.position.set(0, -1.7, 0.16);
  platform.scale.set(1, 1, 0.46);
  platform.renderOrder = -2;
  group.add(platform);

  const floorAura = new THREE.Mesh(
    new THREE.CircleGeometry(1, 72),
    new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: new THREE.Color("#22d3ee"),
      depthTest: false,
      depthWrite: false,
      opacity: 0,
      transparent: true,
    }),
  );
  floorAura.position.set(0, -1.46, -0.16);
  floorAura.scale.set(3.08, 0.58, 1);
  floorAura.renderOrder = -1;
  group.add(floorAura);

  const innerFloorAura = new THREE.Mesh(
    new THREE.CircleGeometry(1, 56),
    new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: new THREE.Color("#bae6fd"),
      depthTest: false,
      depthWrite: false,
      opacity: 0,
      transparent: true,
    }),
  );
  innerFloorAura.position.set(0, -1.45, -0.14);
  innerFloorAura.scale.set(1.9, 0.3, 1);
  innerFloorAura.renderOrder = -1;
  group.add(innerFloorAura);

  const floorMaterial = new THREE.MeshBasicMaterial({
    map: floorTexture,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(5.58, 2.08, 1, 1),
    floorMaterial,
  );
  floor.rotation.x = -Math.PI / 2 + 0.2;
  floor.position.set(0, -1.58, 0.08);
  floor.renderOrder = -3;
  group.add(floor);

  const terraceGeometry = addStageTerraceGeometry(THREE, group);
  group.userData.stairChaseTargets = terraceGeometry.stairChaseTargets;

  const railMaterial = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: new THREE.Color("#67e8f9"),
    depthWrite: false,
    opacity: 0,
    transparent: true,
  });

  const frontRail = new THREE.Mesh(
    new THREE.BoxGeometry(5.92, 0.026, 0.035),
    railMaterial,
  );
  frontRail.position.set(0, -1.565, 0.98);
  group.add(frontRail);

  const rearRail = new THREE.Mesh(
    new THREE.BoxGeometry(4.8, 0.018, 0.024),
    railMaterial.clone(),
  );
  rearRail.position.set(0, -1.575, -0.76);
  group.add(rearRail);

  const centerRail = new THREE.Mesh(
    new THREE.BoxGeometry(3.35, 0.018, 0.024),
    railMaterial.clone(),
  );
  centerRail.position.set(0, -1.568, 0.08);
  group.add(centerRail);

  return group;
};

const disposeObject = (object: Object3D) => {
  object.traverse((child) => {
    const geometry = (child as GeometryObject).geometry;
    if (geometry) geometry.dispose();

    const material = (child as MaterialObject).material;
    if (!material) return;

    if (Array.isArray(material)) {
      material.forEach((item) => {
        (item as Material & { map?: { dispose: () => void } }).map?.dispose();
        item.dispose();
      });
    } else {
      (material as Material & { map?: { dispose: () => void } }).map?.dispose();
      material.dispose();
    }
  });
};

const createTeslaOrbCrownArc = (
  THREE: ThreeModule,
  index: number,
) => {
  const positions = new Float32Array(TESLA_ORB_CROWN_POINT_COUNT * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const color =
    index % 3 === 0 ? "#bfdbfe" : index % 3 === 1 ? "#38bdf8" : "#2563eb";
  const material = new THREE.LineBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: new THREE.Color(color),
    depthWrite: false,
    opacity: 0.36,
    transparent: true,
  });
  const line = new THREE.Line(geometry, material);
  line.renderOrder = 6;

  return {
    line,
    material,
    phase: (index / TESLA_ORB_CROWN_ARC_COUNT) * Math.PI * 2,
    positions,
  };
};

const updateTeslaOrbCrownArcs = (
  arcs: ReturnType<typeof createTeslaOrbCrownArc>[],
  seconds: number,
  intensity: number,
) => {
  arcs.forEach((arc, arcIndex) => {
    const flash =
      Math.max(0, Math.sin(seconds * 8.6 + arc.phase * 1.7)) *
      Math.max(0, Math.sin(seconds * 13.2 + arcIndex * 2.1));
    const angleBase =
      arc.phase +
      Math.sin(seconds * 1.15 + arcIndex * 0.8) * 0.18 +
      Math.sin(seconds * 3.1 + arc.phase) * 0.05;
    const branchReach =
      0.18 + intensity * 0.04 + flash * 0.1 + (arcIndex % 2) * 0.035;

    for (let pointIndex = 0; pointIndex < TESLA_ORB_CROWN_POINT_COUNT; pointIndex += 1) {
      const ratio = pointIndex / (TESLA_ORB_CROWN_POINT_COUNT - 1);
      const taper = 1 - Math.abs(ratio - 0.5) * 1.2;
      const jitter =
        Math.sin(seconds * 15.5 + arc.phase * 2.2 + pointIndex * 2.7) *
        0.035 *
        Math.max(0.2, taper);
      const sideJitter =
        Math.cos(seconds * 12.4 + arcIndex * 1.9 + pointIndex * 3.1) *
        0.022 *
        Math.max(0.12, taper);
      const angle = angleBase + jitter;
      const radius = 0.12 + branchReach * ratio;
      const y =
        0.025 +
        ratio * (0.13 + flash * 0.1) +
        Math.sin(seconds * 10.2 + pointIndex + arc.phase) * 0.014;
      const cursor = pointIndex * 3;

      arc.positions[cursor] =
        Math.cos(angle) * radius + Math.cos(angle + Math.PI / 2) * sideJitter;
      arc.positions[cursor + 1] = y;
      arc.positions[cursor + 2] =
        Math.sin(angle) * radius * 0.58 +
        Math.sin(angle + Math.PI / 2) * sideJitter * 0.56;
    }

    arc.material.opacity = Math.min(
      0.92,
      0.08 + intensity * 0.12 + flash * (0.52 + intensity * 0.2),
    );
    arc.line.geometry.attributes.position.needsUpdate = true;
  });
};

const createTurbineGroup = (
  THREE: ThreeModule,
  toneColor: string,
  side: "left" | "right",
) => {
  const color = new THREE.Color(toneColor);
  const group = new THREE.Group();
  group.rotation.y = side === "left" ? -0.22 : 0.22;

  const metalMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.72,
    clearcoatRoughness: 0.16,
    color: new THREE.Color("#1f3d4d"),
    emissive: new THREE.Color("#062635"),
    emissiveIntensity: 0.14,
    metalness: 0.86,
    roughness: 0.22,
  });
  const casingMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.8,
    clearcoatRoughness: 0.14,
    color: color.clone().lerp(new THREE.Color("#dffaff"), 0.18),
    emissive: color,
    emissiveIntensity: 0.22,
    metalness: 0.42,
    roughness: 0.18,
  });
  const glowMaterial = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color,
    depthWrite: false,
    opacity: 0.14,
    transparent: true,
  });
  const bladeMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.68,
    clearcoatRoughness: 0.18,
    color: new THREE.Color("#e0f7ff").lerp(color, 0.28),
    emissive: color,
    emissiveIntensity: 0.28,
    metalness: 0.48,
    roughness: 0.2,
  });
  const fillMaterial = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: color.clone().lerp(new THREE.Color("#ffffff"), 0.28),
    depthWrite: false,
    opacity: 0.46,
    transparent: true,
  });
  const darkFillMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#01040d"),
    depthWrite: false,
    opacity: 0.74,
    transparent: true,
  });

  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.066, 0.12, 1.02, 22),
    casingMaterial,
  );
  mast.position.set(0, 0.02, -0.02);
  group.add(mast);

  const lowerRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.028, 8, 34),
    metalMaterial,
  );
  lowerRing.rotation.x = Math.PI / 2;
  lowerRing.position.y = -0.45;
  group.add(lowerRing);

  const upperRing = lowerRing.clone();
  upperRing.position.y = 0.46;
  group.add(upperRing);

  const glowColumn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.28, 1.08, 22),
    glowMaterial,
  );
  glowColumn.position.set(0, -0.02, -0.02);
  group.add(glowColumn);

  const darkChargeTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.155, 0.205, 0.94, 22),
    darkFillMaterial,
  );
  darkChargeTube.position.set(0, -0.04, 0.055);
  darkChargeTube.renderOrder = 1;
  group.add(darkChargeTube);

  const chargeFill = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.17, 0.92, 18),
    fillMaterial,
  );
  chargeFill.position.set(0, -0.46, 0.06);
  chargeFill.renderOrder = 2;
  chargeFill.scale.y = 0.04;
  group.add(chargeFill);

  const rotor = new THREE.Group();
  rotor.position.set(0, 0.64, 0);
  group.add(rotor);

  const rotorPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.052, 0.34, 18),
    casingMaterial,
  );
  rotorPost.position.y = -0.12;
  rotor.add(rotorPost);

  for (let index = 0; index < 2; index += 1) {
    const signFace = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.13, 0.044),
      bladeMaterial,
    );
    signFace.rotation.y = (Math.PI / 2) * index;
    rotor.add(signFace);

    const signRidge = new THREE.Mesh(
      new THREE.BoxGeometry(0.91, 0.022, 0.052),
      casingMaterial,
    );
    signRidge.position.y = 0.082;
    signRidge.rotation.y = signFace.rotation.y;
    rotor.add(signRidge);

    const signTail = signRidge.clone();
    signTail.position.y = -0.082;
    rotor.add(signTail);
  }

  const hub = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 20, 12),
    casingMaterial,
  );
  hub.position.y = 0.005;
  rotor.add(hub);

  const footShadow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.72, 0.018, 36),
    glowMaterial.clone(),
  );
  footShadow.position.set(0, -0.53, 0.02);
  footShadow.scale.set(1.28, 1, 0.32);
  group.add(footShadow);

  const halo = new THREE.Mesh(
    new THREE.BoxGeometry(1.02, 0.38, 0.075),
    glowMaterial,
  );
  halo.position.set(0, 0.64, 0.02);
  group.add(halo);

  return { chargeFill, darkChargeTube, group, halo, rotor };
};

const createTeslaCoilGroup = (THREE: ThreeModule) => {
  const group = new THREE.Group();

  const metalMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.88,
    clearcoatRoughness: 0.12,
    color: new THREE.Color("#9dc7d3"),
    emissive: new THREE.Color("#062434"),
    emissiveIntensity: 0.07,
    metalness: 0.9,
    roughness: 0.16,
  });
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.82,
    clearcoatRoughness: 0.08,
    color: new THREE.Color("#a5f3fc"),
    emissive: new THREE.Color("#1d4ed8"),
    emissiveIntensity: 0.16,
    metalness: 0.08,
    opacity: 0.28,
    roughness: 0.08,
    transparent: true,
  });
  const energyMaterial = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: new THREE.Color("#60a5fa"),
    depthWrite: false,
    opacity: 0.16,
    transparent: true,
  });
  const progressMaterial = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: new THREE.Color("#7dd3fc"),
    depthWrite: false,
    opacity: 0.34,
    transparent: true,
  });

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.56, 0.18, 48),
    metalMaterial,
  );
  base.position.y = -0.66;
  group.add(base);

  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.092, 1.24, 36),
    metalMaterial,
  );
  tower.position.y = -0.02;
  group.add(tower);

  const chargeColumn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.062, 0.086, 1.05, 28),
    progressMaterial.clone(),
  );
  chargeColumn.position.y = -0.11;
  group.add(chargeColumn);

  const topOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 30, 16),
    glassMaterial,
  );
  topOrb.position.y = 0.69;
  topOrb.renderOrder = 4.5;
  group.add(topOrb);

  const orbAura = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 28, 14),
    new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: new THREE.Color("#93c5fd"),
      depthWrite: false,
      opacity: 0.22,
      transparent: true,
    }),
  );
  orbAura.position.y = 0.69;
  orbAura.renderOrder = 4;
  group.add(orbAura);

  const orbCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.068, 22, 14),
    new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: new THREE.Color("#f8fafc"),
      depthWrite: false,
      opacity: 0.68,
      transparent: true,
    }),
  );
  orbCore.position.y = 0.69;
  orbCore.renderOrder = 5;
  group.add(orbCore);

  const orbPointLight = new THREE.PointLight(
    new THREE.Color("#7dd3fc"),
    0.9,
    2.45,
    1.4,
  );
  orbPointLight.position.y = 0.72;
  group.add(orbPointLight);

  const orbGlow = new THREE.Group();
  orbGlow.position.y = 0.69;
  const crownRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.01, 8, 48),
    energyMaterial,
  );
  crownRing.rotation.x = Math.PI / 2;
  orbGlow.add(crownRing);

  const verticalRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.008, 8, 44),
    energyMaterial,
  );
  verticalRing.rotation.y = Math.PI / 2;
  orbGlow.add(verticalRing);
  group.add(orbGlow);

  const orbCrown = new THREE.Group();
  orbCrown.position.y = 0.69;
  const orbCrownArcs = Array.from(
    { length: TESLA_ORB_CROWN_ARC_COUNT },
    (_, index) => createTeslaOrbCrownArc(THREE, index),
  );
  orbCrownArcs.forEach((arc) => orbCrown.add(arc.line));
  group.add(orbCrown);

  const progressRungs: MaterialObject[] = [];
  for (let index = 0; index < 5; index += 1) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.34 + index * 0.055, 0.018, 8, 44),
      metalMaterial,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.46 + index * 0.22;
    group.add(ring);

    const progressRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.34 + index * 0.055, 0.011, 8, 44),
      progressMaterial.clone(),
    );
    progressRing.rotation.x = Math.PI / 2;
    progressRing.position.y = ring.position.y;
    group.add(progressRing);
    progressRungs.push(progressRing);
  }

  return {
    chargeColumn,
    group,
    orbAura,
    orbCore,
    orbCrown,
    orbCrownArcs,
    orbGlow,
    orbPointLight,
    progressRungs,
    topOrb,
  };
};

const createLightningArc = (
  THREE: ThreeModule,
  color: string,
  from: [number, number, number],
  to: [number, number, number],
  phase: number,
) => {
  const positions = new Float32Array(LIGHTNING_ARC_POINT_COUNT * 3);
  const segmentPositions = new Float32Array(LIGHTNING_ARC_SEGMENT_COUNT * 6);
  const segmentGeometry = new THREE.BufferGeometry();
  segmentGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(segmentPositions, 3),
  );
  const ribbonPositions = new Float32Array(LIGHTNING_ARC_SEGMENT_COUNT * 18);
  const ribbonGeometry = new THREE.BufferGeometry();
  ribbonGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(ribbonPositions, 3),
  );
  const sparkPositions = new Float32Array(LIGHTNING_ARC_SPARK_COUNT * 6);
  const sparkGeometry = new THREE.BufferGeometry();
  sparkGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(sparkPositions, 3),
  );

  const material = new THREE.LineBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: new THREE.Color(color),
    depthWrite: false,
    opacity: 0.68,
    transparent: true,
  });
  const glowMaterial = new THREE.LineBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.16),
    depthWrite: false,
    opacity: 0.18,
    transparent: true,
  });
  const ribbonMaterial = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.08),
    depthWrite: false,
    opacity: 0.16,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const sparkMaterial = new THREE.LineBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.28),
    depthWrite: false,
    opacity: 0.52,
    transparent: true,
  });

  const line = new THREE.LineSegments(segmentGeometry, material);
  const glowLine = new THREE.LineSegments(segmentGeometry, glowMaterial);
  const ribbon = new THREE.Mesh(ribbonGeometry, ribbonMaterial);
  const sparkLine = new THREE.LineSegments(sparkGeometry, sparkMaterial);
  ribbon.renderOrder = 1.5;
  glowLine.renderOrder = 2;
  line.renderOrder = 3;
  sparkLine.renderOrder = 4;

  return {
    from,
    glowLine,
    glowMaterial,
    line,
    material,
    phase,
    positions,
    ribbon,
    ribbonMaterial,
    ribbonPositions,
    segmentPositions,
    sparkLine,
    sparkMaterial,
    sparkPositions,
    to,
  };
};

const updateLightningArc = (
  arc: ReturnType<typeof createLightningArc>,
  seconds: number,
  strength: number,
  beamWidth = 0.035,
  beamOutput = 1,
) => {
  for (let index = 0; index < LIGHTNING_ARC_POINT_COUNT; index += 1) {
    const ratio = index / LIGHTNING_ARC_SEGMENT_COUNT;
    const middleWeight = Math.max(0.08, 1 - Math.abs(ratio - 0.5) * 1.6);
    const jitter =
      Math.sin(seconds * 4.1 + arc.phase + index * 1.7) *
      0.085 *
      Math.max(0.18, middleWeight);
    const jitterY =
      Math.cos(seconds * 3.6 + arc.phase + index * 1.1) *
      0.075 *
      Math.max(0.12, middleWeight);
    const snap =
      Math.sin(seconds * 8.2 + arc.phase * 1.4 + index * 2.9) *
      Math.sin(seconds * 2.15 + arc.phase + index * 3.7) *
      0.034 *
      middleWeight;
    const crossSnap =
      Math.cos(seconds * 7.4 + arc.phase * 0.8 + index * 3.25) *
      0.026 *
      middleWeight;

    arc.positions[index * 3] =
      arc.from[0] +
      (arc.to[0] - arc.from[0]) * ratio +
      (jitter + snap) * strength;
    arc.positions[index * 3 + 1] =
      arc.from[1] +
      (arc.to[1] - arc.from[1]) * ratio +
      (jitterY + crossSnap) * strength;
    arc.positions[index * 3 + 2] =
      arc.from[2] + (arc.to[2] - arc.from[2]) * ratio;
  }

  const output = Math.max(0, Math.min(1, beamOutput));
  const gapAmount = Math.max(0, 1 - output);
  for (let index = 0; index < LIGHTNING_ARC_SEGMENT_COUNT; index += 1) {
    const pointA = index * 3;
    const pointB = (index + 1) * 3;
    const x1 = arc.positions[pointA];
    const y1 = arc.positions[pointA + 1];
    const z1 = arc.positions[pointA + 2];
    const x2 = arc.positions[pointB];
    const y2 = arc.positions[pointB + 1];
    const z2 = arc.positions[pointB + 2];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.max(0.001, Math.hypot(dx, dy));
    const halfWidth =
      beamWidth *
      (0.58 + Math.sin(seconds * 2.8 + arc.phase + index * 0.86) * 0.12);
    const offsetX = (-dy / length) * halfWidth;
    const offsetY = (dx / length) * halfWidth;
    const flickerGate =
      Math.sin(seconds * 1.35 + arc.phase + index * 1.17) * 0.56 +
      Math.sin(seconds * 0.82 + arc.phase * 0.72 + index * 2.31) * 0.44;
    const gapFlash = Math.max(
      0,
      Math.sin(seconds * 3.8 + arc.phase * 0.8 + index * 1.46),
    );
    const gapThreshold = -0.82 + gapAmount * 0.34;
    const lowOutputGap =
      index > 0 &&
      index < LIGHTNING_ARC_SEGMENT_COUNT - 1 &&
      output < 0.78 &&
      gapFlash > 0.82 - gapAmount * 0.16 &&
      flickerGate < gapThreshold;
    const dashCenter =
      0.22 +
      ((Math.sin(seconds * 1.7 + arc.phase * 0.9 + index * 3.9) + 1) / 2) *
        0.56;
    const dashHalfLength =
      0.018 + output * 0.024 + Math.abs(flickerGate) * 0.005;
    const drawStart = lowOutputGap
      ? Math.max(0, dashCenter - dashHalfLength)
      : 0;
    const drawEnd = lowOutputGap
      ? Math.min(1, dashCenter + dashHalfLength)
      : 1;
    const drawX1 = x1 + dx * drawStart;
    const drawY1 = y1 + dy * drawStart;
    const drawZ1 = z1 + (z2 - z1) * drawStart;
    const drawX2 = x1 + dx * drawEnd;
    const drawY2 = y1 + dy * drawEnd;
    const drawZ2 = z1 + (z2 - z1) * drawEnd;
    const drawWidthScale = lowOutputGap ? 0.14 + output * 0.22 : 1;
    const drawOffsetX = offsetX * drawWidthScale;
    const drawOffsetY = offsetY * drawWidthScale;
    const segmentCursor = index * 6;
    const cursor = index * 18;

    arc.segmentPositions.set(
      [drawX1, drawY1, drawZ1, drawX2, drawY2, drawZ2],
      segmentCursor,
    );

    arc.ribbonPositions.set(
      [
        drawX1 - drawOffsetX,
        drawY1 - drawOffsetY,
        drawZ1 - 0.006,
        drawX1 + drawOffsetX,
        drawY1 + drawOffsetY,
        drawZ1 - 0.006,
        drawX2 + drawOffsetX,
        drawY2 + drawOffsetY,
        drawZ2 - 0.006,
        drawX1 - drawOffsetX,
        drawY1 - drawOffsetY,
        drawZ1 - 0.006,
        drawX2 + drawOffsetX,
        drawY2 + drawOffsetY,
        drawZ2 - 0.006,
        drawX2 - drawOffsetX,
        drawY2 - drawOffsetY,
        drawZ2 - 0.006,
      ],
      cursor,
    );
  }

  for (let sparkIndex = 0; sparkIndex < LIGHTNING_ARC_SPARK_COUNT; sparkIndex += 1) {
    const pathRatio =
      (sparkIndex + 0.5) / LIGHTNING_ARC_SPARK_COUNT +
      Math.sin(seconds * 0.9 + arc.phase + sparkIndex * 1.6) * 0.025;
    const clampedRatio = Math.max(0.02, Math.min(0.98, pathRatio));
    const pathPosition = clampedRatio * LIGHTNING_ARC_SEGMENT_COUNT;
    const segmentIndex = Math.min(
      LIGHTNING_ARC_SEGMENT_COUNT - 1,
      Math.floor(pathPosition),
    );
    const localRatio = pathPosition - segmentIndex;
    const pointA = segmentIndex * 3;
    const pointB = (segmentIndex + 1) * 3;
    const x1 = arc.positions[pointA];
    const y1 = arc.positions[pointA + 1];
    const z1 = arc.positions[pointA + 2];
    const x2 = arc.positions[pointB];
    const y2 = arc.positions[pointB + 1];
    const z2 = arc.positions[pointB + 2];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.max(0.001, Math.hypot(dx, dy));
    const tangentX = dx / length;
    const tangentY = dy / length;
    const normalX = -tangentY;
    const normalY = tangentX;
    const baseX = x1 + dx * localRatio;
    const baseY = y1 + dy * localRatio;
    const baseZ = z1 + (z2 - z1) * localRatio + 0.012;
    const sparkGate =
      Math.sin(seconds * 5.4 + arc.phase * 1.2 + sparkIndex * 2.6) +
      Math.sin(seconds * 3.2 + arc.phase + sparkIndex * 5.3) * 0.44;
    const sparkActive = sparkGate > 0.72 - gapAmount * 0.42;
    const side =
      Math.sin(arc.phase + sparkIndex * 12.989 + seconds * 0.7) >= 0 ? 1 : -1;
    const branchLength =
      (0.044 +
        gapAmount * 0.076 +
        Math.max(0, Math.sin(seconds * 9.6 + sparkIndex * 3.1)) * 0.034) *
      strength;
    const forwardKick =
      Math.sin(seconds * 6.8 + arc.phase * 0.6 + sparkIndex * 4.7) * 0.035;
    const endX =
      baseX + normalX * side * branchLength + tangentX * forwardKick;
    const endY =
      baseY + normalY * side * branchLength + tangentY * forwardKick;
    const endZ =
      baseZ +
      0.006 +
      Math.sin(seconds * 8.8 + arc.phase + sparkIndex * 1.9) * 0.012;
    const cursor = sparkIndex * 6;

    arc.sparkPositions.set(
      sparkActive
        ? [baseX, baseY, baseZ, endX, endY, endZ]
        : [baseX, baseY, baseZ, baseX, baseY, baseZ],
      cursor,
    );
  }

  arc.line.geometry.attributes.position.needsUpdate = true;
  arc.ribbon.geometry.attributes.position.needsUpdate = true;
  arc.sparkLine.geometry.attributes.position.needsUpdate = true;
};

export default function DashboardSoundPointsTeslaCoil3D({
  className = "",
  paused = false,
  points,
  turbines,
  weeklyProgress = 0,
}: DashboardSoundPointsTeslaCoil3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(paused);
  const pointsRef = useRef(points);
  const turbinesRef = useRef(turbines);
  const turbineStateByIdRef = useRef(
    new Map(turbines.map((item) => [item.id, item])),
  );
  const weeklyProgressRef = useRef(weeklyProgress);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  useEffect(() => {
    turbinesRef.current = turbines;
    turbineStateByIdRef.current = new Map(
      turbines.map((item) => [item.id, item]),
    );
  }, [turbines]);

  useEffect(() => {
    weeklyProgressRef.current = weeklyProgress;
  }, [weeklyProgress]);

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
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
      camera.position.set(0, 0.04, 6.85);
      camera.lookAt(0, 0.02, 0);

      const handleContextLost = (event: Event) => {
        event.preventDefault();
      };
      canvas.addEventListener("webglcontextlost", handleContextLost, false);

      const renderer = createDashboardWebGlRenderer(THREE, canvas, {
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      });
      if (!renderer) {
        canvas.removeEventListener("webglcontextlost", handleContextLost, false);
        return;
      }
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.05));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      scene.add(new THREE.AmbientLight(new THREE.Color("#dff8ff"), 1.14));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
      keyLight.position.set(-2.6, 2.8, 4.2);
      scene.add(keyLight);

      const blueLight = new THREE.PointLight(
        new THREE.Color("#38bdf8"),
        1.28,
        6.2,
      );
      blueLight.position.set(0.2, 0.4, 2.5);
      scene.add(blueLight);

      const warmLight = new THREE.PointLight(
        new THREE.Color("#facc15"),
        0.9,
        5.4,
      );
      warmLight.position.set(1.6, -1.4, 2.2);
      scene.add(warmLight);

      const stageGlow = new THREE.Mesh(
        new THREE.CylinderGeometry(3.05, 3.3, 0.06, 72),
        new THREE.MeshBasicMaterial({
          blending: THREE.AdditiveBlending,
          color: new THREE.Color("#0ea5e9"),
          depthWrite: false,
          opacity: 0.012,
          transparent: true,
        }),
      );
      stageGlow.rotation.x = Math.PI / 2;
      stageGlow.position.set(0, -1.68, -0.16);
      scene.add(stageGlow);

      const stageFloor = createStageFloorGroup(THREE);
      scene.add(stageFloor);

      const coil = createTeslaCoilGroup(THREE);
      coil.group.position.set(0, 0.05, 0.16);
      coil.group.scale.setScalar(1.03);
      scene.add(coil.group);

      const turbineEntries = turbinesRef.current.map((item, index) => {
        const color = turbineToneColors[item.id] ?? "#7dd3fc";
        const layout =
          turbineLayouts[item.id] ??
          (index % 2 === 0
            ? {
                position: [-1.86, 0, 0] as [number, number, number],
                scale: 0.86,
                tilt: -0.04,
                yaw: 0.18,
              }
            : {
                position: [1.86, 0, 0] as [number, number, number],
                scale: 0.86,
                tilt: 0.04,
                yaw: -0.18,
              });
        const position = layout.position;
        const side = position[0] < 0 ? "left" : "right";
        const turbine = createTurbineGroup(THREE, color, side);
        turbine.group.position.set(...position);
        const baseScale = layout.scale + Math.min(3, item.count) * 0.025;
        turbine.group.scale.setScalar(baseScale);
        scene.add(turbine.group);

        return {
          baseScale,
          chargeFill: turbine.chargeFill,
          darkChargeTube: turbine.darkChargeTube,
          darkFillMaterial: turbine.darkChargeTube.material as Material & {
            opacity?: number;
          },
          color,
          count: item.count,
          fillMaterial: turbine.chargeFill.material as Material & {
            opacity?: number;
          },
          group: turbine.group,
          halo: turbine.halo,
          id: item.id,
          position,
          rotor: turbine.rotor,
          tilt: layout.tilt,
          yaw: layout.yaw,
        };
      });

      const arcs = turbineEntries.map((entry, index) => {
        const arc = createLightningArc(
          THREE,
          entry.color,
          [0, 0.72, 0.22],
          [entry.position[0] * 0.86, entry.position[1] + 0.24, 0.16],
          index * 1.37,
        );
        scene.add(arc.ribbon);
        scene.add(arc.glowLine);
        scene.add(arc.line);
        scene.add(arc.sparkLine);
        return arc;
      });

      const turbineChargeLevels = new Float32Array(turbineEntries.length);
      const turbinePowerLevels = new Float32Array(turbineEntries.length);
      const stairChaseTargets = stageFloor.userData.stairChaseTargets as
        | DashboardStageIlluminationTarget[]
        | undefined;
      const chargeMaterial = coil.chargeColumn.material as Material & {
        opacity?: number;
      };
      const progressRungMaterials = coil.progressRungs.map(
        (rung) => rung.material as Material & { opacity?: number },
      );
      const topOrbMaterial = coil.topOrb.material as DashboardIlluminatedMaterial;
      const orbAuraMaterial = coil.orbAura.material as DashboardIlluminatedMaterial;
      const orbCoreMaterial = coil.orbCore.material as DashboardIlluminatedMaterial;
      topOrbMaterial.emissive?.set("#38bdf8");

      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(1, Math.floor(rect.width));
        const height = Math.max(1, Math.floor(rect.height));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };

      const observer = new ResizeObserver(resize);
      observer.observe(canvas);
      resize();

      let frameId = 0;
      const startedAt = performance.now();
      let lastFrameTime = startedAt;
      let lastRenderTime = startedAt - TESLA_ACTIVE_FRAME_INTERVAL_MS;

      const renderFrame = (time: number) => {
        frameId = window.requestAnimationFrame(renderFrame);
        const seconds = (time - startedAt) / 1000;
        const targetFrameInterval =
          seconds < TESLA_OPENING_RENDER_SECONDS
            ? TESLA_ACTIVE_FRAME_INTERVAL_MS
            : TESLA_IDLE_FRAME_INTERVAL_MS;

        if (time - lastRenderTime < targetFrameInterval) {
          return;
        }

        const frameDelta = Math.min(0.05, (time - lastFrameTime) / 1000);
        lastFrameTime = time;
        lastRenderTime = time;

        if (!pausedRef.current) {
          const pointCharge = Math.min(1.4, Math.max(0.62, pointsRef.current / 1200));
          coil.group.rotation.y += frameDelta * 0.42;
          const orbOpenSurge = Math.max(0, 1 - seconds / 2.35);
          const orbPulse = 0.5 + Math.sin(seconds * 4.8) * 0.5;
          const orbFlicker =
            Math.max(0, Math.sin(seconds * 9.4)) *
            Math.max(0, Math.sin(seconds * 5.6 + 0.7));
          const orbIntensity =
            0.72 + pointCharge * 0.22 + orbPulse * 0.24 + orbOpenSurge * 0.58;
          coil.topOrb.scale.setScalar(
            1.02 + orbPulse * 0.052 + orbFlicker * 0.035 + orbOpenSurge * 0.12,
          );
          topOrbMaterial.opacity = Math.min(0.72, 0.34 + orbIntensity * 0.16);
          if (typeof topOrbMaterial.emissiveIntensity === "number") {
            topOrbMaterial.emissiveIntensity = 0.24 + orbIntensity * 0.38;
          }
          coil.orbAura.scale.setScalar(
            0.92 + orbPulse * 0.22 + orbOpenSurge * 0.42 + pointCharge * 0.08,
          );
          orbAuraMaterial.opacity = Math.min(
            0.7,
            0.16 + orbPulse * 0.2 + orbFlicker * 0.08 + orbOpenSurge * 0.24,
          );
          coil.orbCore.scale.setScalar(
            0.86 + orbPulse * 0.18 + orbFlicker * 0.16 + orbOpenSurge * 0.24,
          );
          orbCoreMaterial.opacity = Math.min(
            0.96,
            0.58 + orbPulse * 0.22 + orbFlicker * 0.12 + orbOpenSurge * 0.12,
          );
          coil.orbPointLight.intensity =
            0.82 + orbPulse * 0.64 + orbFlicker * 0.34 + orbOpenSurge * 1.1;
          coil.orbGlow.scale.setScalar(
            0.92 +
              Math.sin(seconds * 4.1) * 0.025 * pointCharge +
              orbOpenSurge * 0.18,
          );
          coil.orbGlow.rotation.y += frameDelta * 0.74;
          coil.orbCrown.rotation.y -= frameDelta * (1.1 + orbFlicker * 1.6);
          updateTeslaOrbCrownArcs(
            coil.orbCrownArcs,
            seconds,
            Math.min(2.2, orbIntensity + orbFlicker + orbOpenSurge * 0.8),
          );

          const weeklyCharge = Math.max(
            0,
            Math.min(1, weeklyProgressRef.current / 100),
          );
          const chargeHeight = 1.05 * Math.max(0.04, weeklyCharge);
          coil.chargeColumn.scale.y = Math.max(0.04, weeklyCharge);
          coil.chargeColumn.position.y = -0.62 + chargeHeight * 0.5;
          chargeMaterial.opacity = 0.08 + weeklyCharge * 0.24;

          coil.progressRungs.forEach((_, index) => {
            const rungMaterial = progressRungMaterials[index];
            const rungFill = Math.max(
              0,
              Math.min(1, weeklyCharge * coil.progressRungs.length - index),
            );
            rungMaterial.opacity =
              rungFill * (0.18 + Math.sin(seconds * 3.6 + index) * 0.035);
          });

          turbineEntries.forEach((entry, index) => {
            const latestItem = turbineStateByIdRef.current.get(entry.id);
            const latestCount = latestItem?.count ?? entry.count;
            const levelProgress = Math.max(
              0,
              Math.min(1, (latestItem?.progress ?? 0) / 100),
            );
            const topCharge = getTurbineTopCharge(levelProgress);
            const powerCharge = getTurbinePowerCharge(
              levelProgress,
              latestCount,
            );
            turbineChargeLevels[index] = levelProgress;
            turbinePowerLevels[index] = powerCharge;
            const countPulse = Math.min(3, latestCount) * 0.004;
            entry.rotor.rotation.y +=
              frameDelta * getTurbineRotorSpeed(levelProgress, index);
            entry.group.rotation.y =
              entry.yaw +
              Math.sin(seconds * 0.55 + index * 0.7) * 0.025;
            entry.group.rotation.z =
              entry.tilt + Math.sin(seconds * 0.72 + index) * 0.006;
            entry.group.position.z =
              entry.position[2] + Math.sin(seconds * 0.8 + index) * 0.012;
            const turbineBaseScale =
              entry.baseScale + Math.sin(seconds * 1.6 + index) * countPulse;
            entry.group.scale.setScalar(turbineBaseScale);
            entry.rotor.scale.setScalar(1);
            entry.halo.scale.setScalar(
              1.01 +
                levelProgress * 0.08 +
                powerCharge * 0.16 +
                Math.sin(seconds * (2.1 + topCharge * 5) + index) *
                  (0.02 + topCharge * 0.026),
            );
            const fillHeight = 0.92 * Math.max(0.04, levelProgress);
            entry.chargeFill.scale.y = Math.max(0.04, levelProgress);
            entry.chargeFill.position.y = -0.51 + fillHeight * 0.5;
            entry.darkFillMaterial.opacity =
              0.8 - levelProgress * 0.34 + Math.sin(seconds * 1.4 + index) * 0.012;
            entry.fillMaterial.opacity = Math.min(
              0.88,
              0.12 +
                levelProgress * 0.44 +
                topCharge * 0.18 +
                Math.sin(seconds * (3 + topCharge * 6) + index) *
                  (0.025 + topCharge * 0.035),
            );
          });

          arcs.forEach((arc, index) => {
            const levelProgress = turbineChargeLevels[index] ?? 0;
            const powerCharge = turbinePowerLevels[index] ?? levelProgress;
            const topCharge = getTurbineTopCharge(levelProgress);
            const beamSeconds = seconds * 0.62;
            const beamPulse = Math.sin(
              beamSeconds * 4.2 + index * 0.9,
            );
            updateLightningArc(
              arc,
              beamSeconds,
              0.76 + (index % 3) * 0.12 + levelProgress * 0.18 + topCharge * 0.82,
              0.026 + levelProgress * 0.014 + powerCharge * 0.086 + topCharge * 0.044,
              powerCharge,
            );
            arc.material.opacity = Math.max(
              0.08,
              Math.min(
                1,
                0.24 +
                  levelProgress * 0.38 +
                  topCharge * 0.42 +
                  pointCharge * 0.07 +
                  beamPulse * (0.1 + topCharge * 0.16),
              ),
            );
            arc.glowMaterial.opacity = Math.max(
              0.04,
              Math.min(
                0.92,
                0.08 +
                  levelProgress * 0.2 +
                  powerCharge * 0.28 +
                  topCharge * 0.34 +
                  Math.sin(beamSeconds * 3.4 + index * 1.3) *
                    (0.045 + topCharge * 0.08),
              ),
            );
            arc.ribbonMaterial.opacity = Math.max(
              0.06,
              Math.min(
                0.72,
                0.1 +
                  levelProgress * 0.16 +
                  powerCharge * 0.36 +
                  topCharge * 0.12 +
                  Math.sin(beamSeconds * 3.8 + index * 1.1) *
                    (0.035 + powerCharge * 0.06),
              ),
            );
            arc.sparkMaterial.opacity = Math.max(
              0.08,
              Math.min(
                0.82,
                0.12 +
                  (1 - powerCharge) * 0.34 +
                  levelProgress * 0.12 +
                  topCharge * 0.2 +
                  Math.sin(beamSeconds * 8.2 + index * 1.8) *
                    (0.08 + (1 - powerCharge) * 0.1),
              ),
            );
          });

          stageGlow.scale.setScalar(1 + Math.sin(seconds * 1.6) * 0.025);
          stageGlow.rotation.z += frameDelta * 0.18;
          updateStageIlluminationTargets(stairChaseTargets, seconds);
          stageFloor.rotation.y = Math.sin(seconds * 0.42) * 0.012;
        }

        renderer.render(scene, camera);
      };

      frameId = window.requestAnimationFrame(renderFrame);

      cleanup = () => {
        if (frameId !== 0) {
          window.cancelAnimationFrame(frameId);
        }
        canvas.removeEventListener(
          "webglcontextlost",
          handleContextLost,
          false,
        );
        observer.disconnect();
        disposeObject(scene);
        renderer.forceContextLoss();
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
      aria-hidden="true"
      className={className}
      data-sound-points-tesla-renderer="three"
      ref={canvasRef}
    />
  );
}

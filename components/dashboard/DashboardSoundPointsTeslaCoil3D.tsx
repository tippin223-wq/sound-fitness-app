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
  consistency: { position: [1.12, 0.64, -0.64], scale: 0.56, tilt: 0.025, yaw: -0.08 },
  intensity: { position: [-1.12, 0.64, -0.64], scale: 0.56, tilt: -0.025, yaw: 0.08 },
  knowledge: { position: [1.68, -0.1, -0.18], scale: 0.72, tilt: 0.035, yaw: -0.16 },
  recovery: { position: [-1.68, -0.1, -0.18], scale: 0.72, tilt: -0.035, yaw: 0.16 },
  technique: { position: [1.14, -1.06, 0.3], scale: 0.86, tilt: 0.045, yaw: -0.2 },
  volume: { position: [-1.14, -1.06, 0.3], scale: 0.86, tilt: -0.045, yaw: 0.2 },
};

const getTurbineRotorSpeed = (levelProgress: number, index: number) => {
  const chargedCurve = Math.pow(levelProgress, 2.05);
  const nearLevelBoost = Math.max(0, (levelProgress - 0.78) / 0.22);

  return 0.14 + chargedCurve * 2.72 + nearLevelBoost * 0.82 + index * 0.018;
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
      opacity: 0.36,
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
    opacity: 0.42,
    roughness: 0.22,
    transparent: true,
  });
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(2.56, 2.86, 0.07, 96),
    platformMaterial,
  );
  platform.position.set(0, -1.7, 0.16);
  platform.scale.set(1, 1, 0.46);
  platform.renderOrder = -2;
  group.add(platform);

  const floorAura = new THREE.Mesh(
    new THREE.CircleGeometry(1, 96),
    new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: new THREE.Color("#22d3ee"),
      depthTest: false,
      depthWrite: false,
      opacity: 0.18,
      transparent: true,
    }),
  );
  floorAura.position.set(0, -1.46, -0.16);
  floorAura.scale.set(3.08, 0.58, 1);
  floorAura.renderOrder = -1;
  group.add(floorAura);

  const innerFloorAura = new THREE.Mesh(
    new THREE.CircleGeometry(1, 72),
    new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: new THREE.Color("#bae6fd"),
      depthTest: false,
      depthWrite: false,
      opacity: 0.06,
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
    opacity: 0.76,
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

  const railMaterial = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: new THREE.Color("#67e8f9"),
    depthWrite: false,
    opacity: 0.14,
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
    new THREE.SphereGeometry(0.19, 38, 22),
    glassMaterial,
  );
  topOrb.position.y = 0.69;
  group.add(topOrb);

  const orbGlow = new THREE.Group();
  orbGlow.position.y = 0.69;
  const crownRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.01, 8, 64),
    energyMaterial,
  );
  crownRing.rotation.x = Math.PI / 2;
  orbGlow.add(crownRing);

  const verticalRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.008, 8, 58),
    energyMaterial,
  );
  verticalRing.rotation.y = Math.PI / 2;
  orbGlow.add(verticalRing);
  group.add(orbGlow);

  const progressRungs: MaterialObject[] = [];
  for (let index = 0; index < 5; index += 1) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.34 + index * 0.055, 0.018, 8, 58),
      metalMaterial,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.46 + index * 0.22;
    group.add(ring);

    const progressRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.34 + index * 0.055, 0.011, 8, 58),
      progressMaterial.clone(),
    );
    progressRing.rotation.x = Math.PI / 2;
    progressRing.position.y = ring.position.y;
    group.add(progressRing);
    progressRungs.push(progressRing);
  }

  return { chargeColumn, group, orbGlow, progressRungs, topOrb };
};

const createLightningArc = (
  THREE: ThreeModule,
  color: string,
  from: [number, number, number],
  to: [number, number, number],
  phase: number,
) => {
  const positions = new Float32Array(18);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: new THREE.Color(color),
    depthWrite: false,
    opacity: 0.68,
    transparent: true,
  });

  const line = new THREE.Line(geometry, material);
  return { from, line, phase, positions, to };
};

const updateLightningArc = (
  arc: ReturnType<typeof createLightningArc>,
  seconds: number,
  strength: number,
) => {
  for (let index = 0; index < 6; index += 1) {
    const ratio = index / 5;
    const middleWeight = 1 - Math.abs(ratio - 0.5) * 1.6;
    const jitter =
      Math.sin(seconds * 8.6 + arc.phase + index * 1.7) *
      0.085 *
      Math.max(0.18, middleWeight);
    const jitterY =
      Math.cos(seconds * 7.1 + arc.phase + index * 1.1) *
      0.075 *
      Math.max(0.12, middleWeight);

    arc.positions[index * 3] =
      arc.from[0] + (arc.to[0] - arc.from[0]) * ratio + jitter * strength;
    arc.positions[index * 3 + 1] =
      arc.from[1] + (arc.to[1] - arc.from[1]) * ratio + jitterY * strength;
    arc.positions[index * 3 + 2] =
      arc.from[2] + (arc.to[2] - arc.from[2]) * ratio;
  }

  arc.line.geometry.attributes.position.needsUpdate = true;
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
  const weeklyProgressRef = useRef(weeklyProgress);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  useEffect(() => {
    turbinesRef.current = turbines;
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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.18));
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
        new THREE.CylinderGeometry(3.05, 3.3, 0.06, 96),
        new THREE.MeshBasicMaterial({
          blending: THREE.AdditiveBlending,
          color: new THREE.Color("#0ea5e9"),
          depthWrite: false,
          opacity: 0.038,
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
          color,
          count: item.count,
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
        scene.add(arc.line);
        return arc;
      });

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

      const renderFrame = (time: number) => {
        const seconds = (time - startedAt) / 1000;
        const frameDelta = Math.min(0.05, (time - lastFrameTime) / 1000);
        lastFrameTime = time;

        if (!pausedRef.current) {
          const pointCharge = Math.min(1.4, Math.max(0.62, pointsRef.current / 1200));
          coil.group.rotation.y += frameDelta * 0.42;
          coil.topOrb.scale.setScalar(1 + Math.sin(seconds * 3.4) * 0.045);
          coil.orbGlow.scale.setScalar(
            0.92 + Math.sin(seconds * 4.1) * 0.025 * pointCharge,
          );
          coil.orbGlow.rotation.y += frameDelta * 0.74;

          const weeklyCharge = Math.max(
            0,
            Math.min(1, weeklyProgressRef.current / 100),
          );
          const chargeHeight = 1.05 * Math.max(0.04, weeklyCharge);
          coil.chargeColumn.scale.y = Math.max(0.04, weeklyCharge);
          coil.chargeColumn.position.y = -0.62 + chargeHeight * 0.5;
          const chargeMaterial = coil.chargeColumn.material as Material & {
            opacity?: number;
          };
          chargeMaterial.opacity = 0.08 + weeklyCharge * 0.24;

          coil.progressRungs.forEach((rung, index) => {
            const rungMaterial = rung.material as Material & { opacity?: number };
            const rungFill = Math.max(
              0,
              Math.min(1, weeklyCharge * coil.progressRungs.length - index),
            );
            rungMaterial.opacity =
              rungFill * (0.18 + Math.sin(seconds * 3.6 + index) * 0.035);
          });

          turbineEntries.forEach((entry, index) => {
            const latestItem = turbinesRef.current.find(
              (item) => item.id === entry.id,
            );
            const latestCount = latestItem?.count ?? entry.count;
            const levelProgress = Math.max(
              0,
              Math.min(1, (latestItem?.progress ?? 0) / 100),
            );
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
            entry.group.scale.setScalar(
              entry.baseScale + Math.sin(seconds * 1.6 + index) * countPulse,
            );
            entry.halo.scale.setScalar(
              1.01 + levelProgress * 0.08 + Math.sin(seconds * 2.1 + index) * 0.02,
            );
            const fillHeight = 0.92 * Math.max(0.04, levelProgress);
            entry.chargeFill.scale.y = Math.max(0.04, levelProgress);
            entry.chargeFill.position.y = -0.51 + fillHeight * 0.5;
            const darkFillMaterial = entry.darkChargeTube.material as Material & {
              opacity?: number;
            };
            darkFillMaterial.opacity =
              0.8 - levelProgress * 0.34 + Math.sin(seconds * 1.4 + index) * 0.012;
            const fillMaterial = entry.chargeFill.material as Material & {
              opacity?: number;
            };
            fillMaterial.opacity =
              0.12 + levelProgress * 0.44 + Math.sin(seconds * 3 + index) * 0.025;
          });

          arcs.forEach((arc, index) => {
            updateLightningArc(arc, seconds, 0.8 + (index % 3) * 0.12);
            const material = arc.line.material as Material & { opacity?: number };
            material.opacity =
              0.42 + Math.sin(seconds * 5.4 + index * 0.9) * 0.2 + pointCharge * 0.08;
          });

          stageGlow.scale.setScalar(1 + Math.sin(seconds * 1.6) * 0.025);
          stageGlow.rotation.z += frameDelta * 0.18;
          stageFloor.rotation.y = Math.sin(seconds * 0.42) * 0.012;
        }

        renderer.render(scene, camera);
        frameId = window.requestAnimationFrame(renderFrame);
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

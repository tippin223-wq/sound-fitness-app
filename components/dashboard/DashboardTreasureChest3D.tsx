"use client";

import { useEffect, useRef } from "react";
import type {
  BufferGeometry,
  Material,
  Object3D,
  Texture,
} from "three";
import {
  createDashboardWebGlRenderer,
  loadDashboardThree,
  setDashboardWebGlCanvasActive,
  waitForDashboardWebGlStart,
} from "./dashboardWebGlRenderer";

type ThreeModule = typeof import("three");

type MaterialObject = Object3D & {
  material?: Material | Material[];
};

type GeometryObject = Object3D & {
  geometry?: BufferGeometry;
};

type DashboardTreasureChest3DProps = {
  className?: string;
  open?: boolean;
  paused?: boolean;
  variant?: "icon" | "showcase";
};

type DashboardSpinningSoundCoin3DProps = {
  className?: string;
  paused?: boolean;
};

const coinTextureSources = {
  black: "/sound-coins/sound-coin-black.png?v=2",
  blue: "/sound-coins/sound-coin-blue.png?v=2",
  cyan: "/sound-coins/sound-coin-cyan.png?v=2",
  gold: "/sound-coins/sound-coin-gold.png?v=2",
  green: "/sound-coins/sound-coin-green.png?v=2",
  orange: "/sound-coins/sound-coin-orange.png?v=2",
  pink: "/sound-coins/sound-coin-pink.png?v=2",
  purple: "/sound-coins/sound-coin-purple.png?v=2",
  red: "/sound-coins/sound-coin-red.png?v=2",
} as const;

const configureSoundCoinTexture = (THREE: ThreeModule, texture: Texture) => {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.center.set(0.5, 0.5);
  texture.rotation = Math.PI / 2;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
};

const overflowCoinSpecs = [
  { tone: "gold", x: -0.94, y: -0.14, z: 1.02, rx: 1.42, ry: -0.08, rz: -0.26, scale: 0.7 },
  { tone: "blue", x: -0.28, y: -0.08, z: 1.12, rx: 1.5, ry: 0.14, rz: 0.14, scale: 0.76 },
  { tone: "orange", x: 0.42, y: -0.12, z: 1.08, rx: 1.4, ry: -0.18, rz: 0.24, scale: 0.72 },
  { tone: "cyan", x: 1.02, y: -0.18, z: 0.98, rx: 1.5, ry: 0.12, rz: -0.14, scale: 0.68 },
] as const;

const TREASURE_CHEST_LID_CLOSED_ROTATION = 0.04;
const TREASURE_CHEST_LID_OPEN_ROTATION = -0.68;
const GIFT_BOX_LID_CLOSED_ROTATION = 0.02;
const GIFT_BOX_LID_OPEN_ROTATION = -0.16;
const TREASURE_ROOM_FLOOR_SCALE = 1.72;
const TREASURE_ROOM_WALL_SCALE = 1.82;
const SOUND_COIN_REST_ROTATION = {
  x: -0.06,
  y: 0,
  z: 0,
} as const;

const getShortestRotationDelta = (delta: number) =>
  Math.atan2(Math.sin(delta), Math.cos(delta));

const settleRotation = (current: number, target: number, ease: number) => {
  const delta = getShortestRotationDelta(target - current);
  if (Math.abs(delta) < 0.004) return target;
  return current + delta * ease;
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

const makeBox = (
  THREE: ThreeModule,
  width: number,
  height: number,
  depth: number,
  material: Material,
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0],
) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  return mesh;
};

const makeRoundedBox = (
  THREE: ThreeModule,
  width: number,
  height: number,
  depth: number,
  radius: number,
  material: Material,
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0],
) => {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const cornerRadius = Math.min(radius, halfWidth - 0.01, halfHeight - 0.01);
  const shape = new THREE.Shape();

  shape.moveTo(-halfWidth + cornerRadius, -halfHeight);
  shape.lineTo(halfWidth - cornerRadius, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + cornerRadius);
  shape.lineTo(halfWidth, halfHeight - cornerRadius);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - cornerRadius, halfHeight);
  shape.lineTo(-halfWidth + cornerRadius, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - cornerRadius);
  shape.lineTo(-halfWidth, -halfHeight + cornerRadius);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + cornerRadius, -halfHeight);

  const bevelSize = Math.min(cornerRadius * 0.38, depth * 0.16);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: true,
    bevelSegments: 7,
    bevelSize,
    bevelThickness: bevelSize,
    depth,
    steps: 1,
  });
  geometry.translate(0, 0, -depth / 2);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  return mesh;
};

const makeDomedLid = (
  THREE: ThreeModule,
  width: number,
  radius: number,
  material: Material,
  position: [number, number, number],
) => {
  const geometry = new THREE.CylinderGeometry(
    radius,
    radius,
    width,
    64,
    1,
    false,
    0,
    Math.PI,
  );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.z = Math.PI / 2;
  return mesh;
};

const createTreasureFloorTexture = (THREE: ThreeModule) => {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;

  const context = canvas.getContext("2d");
  if (context) {
    const baseGradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    baseGradient.addColorStop(0, "#dbeafe");
    baseGradient.addColorStop(0.18, "#2f6f8f");
    baseGradient.addColorStop(0.48, "#0c3045");
    baseGradient.addColorStop(0.82, "#071827");
    baseGradient.addColorStop(1, "#cbd5e1");
    context.fillStyle = baseGradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.globalCompositeOperation = "screen";
    for (let index = 0; index < 48; index += 1) {
      const x = (index * 67) % canvas.width;
      const y = 34 + ((index * 43) % 170);
      const width = 18 + ((index * 11) % 34);
      const height = 4 + ((index * 7) % 14);
      const alpha = 0.12 + ((index % 5) * 0.025);

      context.save();
      context.translate(x, y);
      context.rotate(((index % 7) - 3) * 0.08);
      context.fillStyle =
        index % 3 === 0
          ? `rgba(250, 204, 21, ${alpha + 0.04})`
          : `rgba(56, 189, 248, ${alpha + 0.04})`;
      context.beginPath();
      context.moveTo(-width * 0.5, 0);
      context.lineTo(-width * 0.18, -height);
      context.lineTo(width * 0.5, -height * 0.2);
      context.lineTo(width * 0.22, height);
      context.closePath();
      context.fill();
      context.restore();
    }

    context.strokeStyle = "rgba(226, 232, 240, 0.28)";
    context.lineWidth = 1;
    for (let row = 0; row < 7; row += 1) {
      const y = 24 + row * 32;
      context.beginPath();
      context.moveTo(0, y);
      context.bezierCurveTo(128, y - 18, 304, y + 20, canvas.width, y - 8);
      context.stroke();
    }

    for (let lane = 0; lane < 7; lane += 1) {
      const x = -80 + lane * 112;
      const laneGradient = context.createLinearGradient(x, 0, x + 96, 0);
      laneGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
      laneGradient.addColorStop(0.5, "rgba(226, 232, 240, 0.24)");
      laneGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      context.fillStyle = laneGradient;
      context.save();
      context.translate(x, canvas.height * 0.52);
      context.rotate(-0.14);
      context.fillRect(0, -canvas.height, 36, canvas.height * 2);
      context.restore();
    }

    const horizonGlow = context.createLinearGradient(0, 92, 0, 160);
    horizonGlow.addColorStop(0, "rgba(255, 255, 255, 0)");
    horizonGlow.addColorStop(0.48, "rgba(56, 189, 248, 0.34)");
    horizonGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = horizonGlow;
    context.fillRect(0, 78, canvas.width, 98);

    const glow = context.createRadialGradient(
      canvas.width * 0.5,
      canvas.height * 0.44,
      12,
      canvas.width * 0.5,
      canvas.height * 0.44,
      canvas.width * 0.48,
    );
    glow.addColorStop(0, "rgba(250, 204, 21, 0.2)");
    glow.addColorStop(0.45, "rgba(56, 189, 248, 0.12)");
    glow.addColorStop(1, "rgba(2, 6, 23, 0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = "source-over";
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(1.28, 1);
  return texture;
};

const createTreasureChestScene = (
  THREE: ThreeModule,
  textures: Record<keyof typeof coinTextureSources, Texture>,
  open: boolean,
  variant: "icon" | "showcase",
) => {
  const iconVariant = variant === "icon";
  const group = new THREE.Group();
  group.rotation.set(-0.04, iconVariant ? -0.14 : -0.22, 0);
  group.position.set(0, iconVariant ? -0.24 : -0.02, 0);

  const wood = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.98,
    clearcoatRoughness: 0.06,
    color: new THREE.Color(iconVariant ? "#f4f7fb" : "#cbd5e1"),
    emissive: new THREE.Color(iconVariant ? "#1aa7b8" : "#0f3a4f"),
    emissiveIntensity: iconVariant ? 0.26 : 0.12,
    metalness: iconVariant ? 0.82 : 0.92,
    roughness: 0.12,
  });
  const darkWood = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.9,
    clearcoatRoughness: 0.08,
    color: new THREE.Color(iconVariant ? "#516274" : "#263241"),
    emissive: new THREE.Color(iconVariant ? "#0f3f55" : "#061827"),
    emissiveIntensity: iconVariant ? 0.22 : 0.1,
    metalness: 0.9,
    roughness: 0.14,
  });
  const goldMetal = new THREE.MeshPhysicalMaterial({
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    color: new THREE.Color(iconVariant ? "#fff7d6" : "#f8fafc"),
    emissive: new THREE.Color(iconVariant ? "#facc15" : "#38bdf8"),
    emissiveIntensity: iconVariant ? 0.34 : 0.12,
    metalness: 0.98,
    roughness: 0.08,
  });
  const deepGold = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.95,
    clearcoatRoughness: 0.07,
    color: new THREE.Color(iconVariant ? "#fef08a" : "#5eead4"),
    emissive: new THREE.Color(iconVariant ? "#f59e0b" : "#0891b2"),
    emissiveIntensity: iconVariant ? 0.36 : 0.18,
    metalness: 0.9,
    roughness: 0.1,
  });
  const interior = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.7,
    color: new THREE.Color("#06121f"),
    emissive: new THREE.Color("#0e7490"),
    emissiveIntensity: 0.16,
    metalness: 0.72,
    roughness: 0.22,
  });
  const floorTexture = createTreasureFloorTexture(THREE);
  const floorMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.96,
    clearcoatRoughness: 0.08,
    color: new THREE.Color("#dbeafe"),
    emissive: new THREE.Color("#0e7490"),
    emissiveIntensity: 0.16,
    map: floorTexture,
    metalness: 0.82,
    roughness: 0.16,
    side: THREE.DoubleSide,
  });
  const floorRimMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    color: new THREE.Color("#e0f2fe"),
    emissive: new THREE.Color("#22d3ee"),
    emissiveIntensity: 0.2,
    metalness: 0.88,
    roughness: 0.12,
  });

  const floorGroup = new THREE.Group();
  floorGroup.position.set(0, -1.08, 0.82);
  floorGroup.rotation.set(-1.06, 0, 0.025);
  floorGroup.scale.set(TREASURE_ROOM_FLOOR_SCALE, 1.42, 1);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.9, 96), floorMaterial);
  floor.scale.set(2.12, 0.56, 1);
  floorGroup.add(floor);
  const floorRim = new THREE.Mesh(
    new THREE.RingGeometry(1.76, 1.9, 96),
    floorRimMaterial,
  );
  floorRim.scale.set(2.12, 0.56, 1);
  floorRim.position.z = 0.012;
  floorGroup.add(floorRim);
  const floorMirrorMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#e0f2fe"),
    depthWrite: false,
    opacity: 0.24,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const floorShadowMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#020617"),
    depthWrite: false,
    opacity: 0.34,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const centerReflection = new THREE.Mesh(
    new THREE.PlaneGeometry(4.55, 0.3),
    floorShadowMaterial,
  );
  centerReflection.position.set(0.08, -0.02, 0.026);
  centerReflection.rotation.z = -0.015;
  floorGroup.add(centerReflection);
  [
    [-2.9, 0.42, 1.2, 0.04, -0.04, 0.22],
    [-1.48, -0.5, 1.82, 0.03, 0.08, 0.26],
    [0.12, 0.46, 2.08, 0.034, -0.04, 0.22],
    [1.58, -0.46, 1.68, 0.032, -0.1, 0.24],
    [2.92, 0.34, 1.12, 0.038, 0.05, 0.2],
  ].forEach(([x, y, width, height, rotation, opacity]) => {
    const stripMaterial = floorMirrorMaterial.clone();
    stripMaterial.opacity = opacity;
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      stripMaterial,
    );
    strip.position.set(x, y, 0.045);
    strip.rotation.z = rotation;
    floorGroup.add(strip);
  });
  [
    [-3.08, -0.36, 0.12, 0.54, 0.025],
    [-1.62, -0.52, 0.1, 0.42, -0.18],
    [1.58, -0.5, 0.1, 0.48, 0.14],
    [3.06, -0.32, 0.12, 0.54, -0.08],
  ].forEach(([x, y, z, width, rotation]) => {
    const facet = new THREE.Mesh(
      new THREE.PlaneGeometry(width, 0.1),
      floorRimMaterial,
    );
    facet.position.set(x, y, z);
    facet.rotation.z = rotation;
    floorGroup.add(facet);
  });
  if (!iconVariant) {
    group.add(floorGroup);
  }

  const roomGroup = new THREE.Group();
  roomGroup.position.set(0, -0.04, -1.18);
  roomGroup.scale.set(TREASURE_ROOM_WALL_SCALE, 1.54, 1);
  const roomPanelMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#93c5fd"),
    depthWrite: false,
    opacity: 0.17,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const roomSideMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#67e8f9"),
    depthWrite: false,
    opacity: 0.14,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const roomLineMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#e0f2fe"),
    depthWrite: false,
    opacity: 0.3,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const roomGlowMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#67e8f9"),
    depthWrite: false,
    opacity: 0.12,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(5.9, 2.65), roomPanelMaterial);
  backWall.position.set(0, 0.16, 0);
  roomGroup.add(backWall);
  const backWallGlow = new THREE.Mesh(
    new THREE.CircleGeometry(1.72, 64),
    roomGlowMaterial,
  );
  backWallGlow.position.set(0.12, 0.05, 0.024);
  backWallGlow.scale.set(1.72, 0.52, 1);
  roomGroup.add(backWallGlow);
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.45), roomSideMaterial);
  leftWall.position.set(-3.02, 0.03, 0.48);
  leftWall.rotation.y = 0.7;
  roomGroup.add(leftWall);
  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.45), roomSideMaterial);
  rightWall.position.set(3.02, 0.03, 0.48);
  rightWall.rotation.y = -0.7;
  roomGroup.add(rightWall);
  for (let index = 0; index < 5; index += 1) {
    const wallLine = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2 - index * 0.44, 0.018),
      roomLineMaterial,
    );
    wallLine.position.set(0, -0.72 + index * 0.42, 0.018);
    roomGroup.add(wallLine);
  }
  [-2.18, -1.08, 1.08, 2.18].forEach((x) => {
    const wallLine = new THREE.Mesh(
      new THREE.PlaneGeometry(0.018, 2.2),
      roomLineMaterial,
    );
    wallLine.position.set(x, 0.08, 0.02);
    roomGroup.add(wallLine);
  });
  if (!iconVariant) {
    group.add(roomGroup);
  }

  const contactShadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.55, 56),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color("#020617"),
      depthWrite: false,
      opacity: 0.32,
      side: THREE.DoubleSide,
      transparent: true,
    }),
  );
  contactShadow.position.set(0.08, -0.82, 1.08);
  contactShadow.rotation.set(-1.08, 0, 0.02);
  contactShadow.scale.set(2.34, 0.42, 1);
  if (!iconVariant) {
    group.add(contactShadow);
  }

  const floorGlow = new THREE.Mesh(
    new THREE.CircleGeometry(2.08, 72),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color("#22d3ee"),
      depthWrite: false,
      opacity: 0.18,
      side: THREE.DoubleSide,
      transparent: true,
    }),
  );
  floorGlow.position.set(0, -0.9, 1.16);
  floorGlow.rotation.set(-1.08, 0, 0.02);
  floorGlow.scale.set(2.84, 0.42, 1);
  if (!iconVariant) {
    group.add(floorGlow);
  }

  const floorShardMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
    color: new THREE.Color("#a5f3fc"),
    emissive: new THREE.Color("#0e7490"),
    emissiveIntensity: 0.2,
    metalness: 0.18,
    opacity: 0.68,
    roughness: 0.18,
    transparent: true,
  });
  [
    [-3.72, -0.88, 1.18, 0.08, -0.3],
    [-2.04, -0.9, 1.36, 0.058, 0.24],
    [2.0, -0.9, 1.28, 0.07, -0.16],
    [3.84, -0.88, 1.12, 0.064, 0.32],
  ].forEach(([x, y, z, size, rotation]) => {
    const shard = new THREE.Mesh(
      new THREE.OctahedronGeometry(size, 0),
      floorShardMaterial,
    );
    shard.position.set(x, y, z);
    shard.rotation.set(0.36, rotation, 0.18);
    shard.scale.y = 0.36;
    if (!iconVariant) {
      group.add(shard);
    }
  });

  const chestGroup = new THREE.Group();
  chestGroup.position.set(0, iconVariant ? 0.16 : 0.36, -0.06);
  chestGroup.scale.setScalar(iconVariant ? 1.08 : 0.94);
  group.add(chestGroup);

  const base = new THREE.Group();
  base.add(makeRoundedBox(THREE, 3.8, 1.18, 1.92, 0.32, wood, [0, -0.72, 0]));
  base.add(makeRoundedBox(THREE, 3.92, 0.16, 2.04, 0.08, goldMetal, [0, -0.16, 0.04]));
  base.add(makeRoundedBox(THREE, 3.92, 0.18, 2.04, 0.09, deepGold, [0, -1.25, 0.04]));
  base.add(makeRoundedBox(THREE, 0.22, 1.24, 2.02, 0.1, goldMetal, [-1.38, -0.7, 0.04]));
  base.add(makeRoundedBox(THREE, 0.22, 1.24, 2.02, 0.1, goldMetal, [1.38, -0.7, 0.04]));
  base.add(makeRoundedBox(THREE, 0.24, 1.26, 2.04, 0.1, deepGold, [0, -0.7, 0.04]));
  base.add(makeRoundedBox(THREE, 3.28, 0.12, 0.08, 0.04, darkWood, [0, -0.74, 1.02]));
  base.add(makeRoundedBox(THREE, 3.28, 0.12, 0.08, 0.04, darkWood, [0, -0.94, 1.02]));
  base.add(makeBox(THREE, 3.12, 0.34, 1.42, interior, [0, -0.08, -0.02]));
  const frontPanelMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.96,
    clearcoatRoughness: 0.08,
    color: new THREE.Color("#94a3b8"),
    emissive: new THREE.Color("#0e7490"),
    emissiveIntensity: 0.14,
    metalness: 0.9,
    roughness: 0.12,
  });
  base.add(makeRoundedBox(THREE, 2.86, 0.52, 0.09, 0.16, frontPanelMaterial, [0, -0.72, 1.08]));
  base.add(makeRoundedBox(THREE, 2.62, 0.08, 0.1, 0.04, goldMetal, [0, -0.42, 1.13]));
  base.add(makeRoundedBox(THREE, 2.62, 0.08, 0.1, 0.04, deepGold, [0, -1.02, 1.13]));
  base.add(makeRoundedBox(THREE, 0.12, 0.5, 0.1, 0.05, goldMetal, [-1.08, -0.72, 1.14]));
  base.add(makeRoundedBox(THREE, 0.12, 0.5, 0.1, 0.05, goldMetal, [1.08, -0.72, 1.14]));
  chestGroup.add(base);

  const lid = new THREE.Group();
  lid.position.set(0, 0.32, -0.72);
  lid.rotation.x = open
    ? TREASURE_CHEST_LID_OPEN_ROTATION
    : TREASURE_CHEST_LID_CLOSED_ROTATION;
  lid.add(makeDomedLid(THREE, 3.96, 0.9, wood, [0, -0.28, 0]));
  lid.add(makeDomedLid(THREE, 3.58, 0.72, darkWood, [0, -0.18, 0.05]));
  lid.add(makeRoundedBox(THREE, 4.08, 0.18, 1.94, 0.1, goldMetal, [0, -0.38, 0]));
  lid.add(makeRoundedBox(THREE, 0.22, 0.72, 1.9, 0.1, goldMetal, [-1.46, -0.02, 0]));
  lid.add(makeRoundedBox(THREE, 0.22, 0.72, 1.9, 0.1, goldMetal, [1.46, -0.02, 0]));
  lid.add(makeRoundedBox(THREE, 4.0, 0.12, 0.14, 0.06, deepGold, [0, -0.28, 0.9]));
  lid.add(makeRoundedBox(THREE, 3.35, 0.08, 0.14, 0.04, goldMetal, [0, 0.22, 0.7]));
  chestGroup.add(lid);

  const lock = new THREE.Group();
  lock.add(makeRoundedBox(THREE, 0.56, 0.6, 0.1, 0.14, goldMetal, [0, -0.62, 1.04]));
  const keyhole = new THREE.Mesh(
    new THREE.CircleGeometry(0.07, 18),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#3b1602") }),
  );
  keyhole.position.set(0, -0.57, 1.09);
  lock.add(keyhole);
  chestGroup.add(lock);

  const sideMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.58,
    clearcoatRoughness: 0.18,
    color: new THREE.Color("#facc15"),
    emissive: new THREE.Color("#7c2d12"),
    emissiveIntensity: 0.14,
    metalness: 0.74,
    roughness: 0.22,
  });
  const rimMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.92,
    clearcoatRoughness: 0.12,
    color: new THREE.Color("#fff1a8"),
    emissive: new THREE.Color("#a16207"),
    emissiveIntensity: 0.14,
    metalness: 0.82,
    roughness: 0.18,
  });
  const coinFaceMaterials = (
    Object.keys(textures) as Array<keyof typeof coinTextureSources>
  ).reduce(
    (materials, tone) => {
      const texture = textures[tone];
      materials[tone] = new THREE.MeshPhysicalMaterial({
        bumpMap: texture,
        bumpScale: 0.008,
        clearcoat: 0.72,
        clearcoatRoughness: 0.16,
        color: new THREE.Color("#ffffff"),
        emissive: new THREE.Color("#ffffff"),
        emissiveIntensity: 0.025,
        map: texture,
        metalness: 0.24,
        roughness: 0.24,
      });
      return materials;
    },
    {} as Record<keyof typeof coinTextureSources, Material>,
  );
  const coinGeometry = new THREE.CylinderGeometry(0.28, 0.28, 0.075, 56);
  const coinRimGeometry = new THREE.TorusGeometry(0.283, 0.012, 8, 52);

  const addCoin = (
    tone: keyof typeof coinTextureSources,
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number,
    scale: number,
  ) => {
    const coin = new THREE.Mesh(coinGeometry, [
      sideMaterial,
      coinFaceMaterials[tone],
      coinFaceMaterials[tone],
    ]);
    coin.position.set(x, y, z);
    coin.rotation.set(rx, ry, rz);
    coin.scale.setScalar(scale);
    const frontRim = new THREE.Mesh(coinRimGeometry, rimMaterial);
    frontRim.rotation.x = Math.PI / 2;
    frontRim.position.y = 0.041;
    const backRim = new THREE.Mesh(coinRimGeometry, rimMaterial);
    backRim.rotation.x = Math.PI / 2;
    backRim.position.y = -0.041;
    coin.add(frontRim, backRim);
    chestGroup.add(coin);
    return coin;
  };

  for (let layer = 0; layer < 3; layer += 1) {
    const coinCount = layer === 0 ? 8 : layer === 1 ? 6 : 4;
    for (let index = 0; index < coinCount; index += 1) {
      const angle = (index / coinCount) * Math.PI * 2 + layer * 0.46;
      const radius = 1.04 - layer * 0.16 + (index % 2) * 0.08;
      const toneKeys = Object.keys(coinTextureSources) as Array<
        keyof typeof coinTextureSources
      >;
      addCoin(
        toneKeys[(index + layer) % toneKeys.length],
        Math.cos(angle) * radius,
        -0.1 + layer * 0.16,
        Math.sin(angle) * 0.42 + 0.16,
        0.02 + (index % 3) * 0.06,
        angle,
        (index % 5) * 0.18,
        0.66 + layer * 0.05,
      );
    }
  }

  overflowCoinSpecs.forEach((coin) => {
    addCoin(
      coin.tone,
      coin.x,
      coin.y,
      coin.z,
      coin.rx,
      coin.ry,
      coin.rz,
      coin.scale,
    );
  });

  const glintMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#fff7d6"),
    opacity: 0.82,
    transparent: true,
  });
  const glints = [
    new THREE.Vector3(-1.24, 0.68, 0.52),
    new THREE.Vector3(0.72, 0.84, 0.26),
    new THREE.Vector3(1.42, 0.28, 0.88),
  ].map((position) => {
    const glint = new THREE.Mesh(new THREE.TetrahedronGeometry(0.09, 0), glintMaterial);
    glint.position.copy(position);
    chestGroup.add(glint);
    return glint;
  });

  group.scale.setScalar(iconVariant ? 1.02 : 0.78);
  return { glints, group, lid, textures: [...Object.values(textures), floorTexture] };
};

const createGiftBoxScene = (THREE: ThreeModule) => {
  const group = new THREE.Group();
  group.position.set(0, -0.04, 0);
  group.rotation.set(-0.14, -0.28, 0.08);
  group.scale.setScalar(0.68);

  const boxMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.9,
    clearcoatRoughness: 0.1,
    color: new THREE.Color("#b8892f"),
    emissive: new THREE.Color("#3a2409"),
    emissiveIntensity: 0.07,
    metalness: 0.46,
    roughness: 0.22,
  });
  const sideMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.82,
    clearcoatRoughness: 0.14,
    color: new THREE.Color("#6f4c16"),
    emissive: new THREE.Color("#251506"),
    emissiveIntensity: 0.06,
    metalness: 0.38,
    roughness: 0.26,
  });
  const lidMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.94,
    clearcoatRoughness: 0.08,
    color: new THREE.Color("#cba45d"),
    emissive: new THREE.Color("#4a2b08"),
    emissiveIntensity: 0.08,
    metalness: 0.48,
    roughness: 0.18,
  });
  const ribbonMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.82,
    clearcoatRoughness: 0.12,
    color: new THREE.Color("#8f1d1d"),
    emissive: new THREE.Color("#3f0707"),
    emissiveIntensity: 0.12,
    metalness: 0.28,
    roughness: 0.24,
  });
  const bowMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.9,
    clearcoatRoughness: 0.1,
    color: new THREE.Color("#b82b24"),
    emissive: new THREE.Color("#5b0d0d"),
    emissiveIntensity: 0.14,
    metalness: 0.25,
    roughness: 0.2,
  });
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#d6b35f"),
    depthWrite: false,
    opacity: 0.12,
    side: THREE.DoubleSide,
    transparent: true,
  });

  const base = makeRoundedBox(THREE, 2.25, 1.5, 1.72, 0.18, boxMaterial, [0, -0.38, 0]);
  group.add(base);

  const sideShade = makeRoundedBox(THREE, 0.08, 1.34, 1.58, 0.04, sideMaterial, [1.16, -0.38, 0.02]);
  sideShade.rotation.y = -0.02;
  group.add(sideShade);

  const lidGroup = new THREE.Group();
  group.add(lidGroup);

  const lid = makeRoundedBox(THREE, 2.58, 0.42, 1.94, 0.14, lidMaterial, [0, 0.52, 0.02]);
  lidGroup.add(lid);

  const verticalRibbon = makeRoundedBox(THREE, 0.32, 1.72, 1.86, 0.05, ribbonMaterial, [0, -0.27, 0.08]);
  group.add(verticalRibbon);

  const horizontalRibbon = makeRoundedBox(THREE, 2.66, 0.28, 1.98, 0.05, ribbonMaterial, [0, -0.14, 0.1]);
  group.add(horizontalRibbon);

  const lidRibbon = makeRoundedBox(THREE, 0.34, 0.5, 2.04, 0.05, ribbonMaterial, [0, 0.55, 0.08]);
  lidGroup.add(lidRibbon);

  const bowCore = new THREE.Mesh(new THREE.SphereGeometry(0.22, 28, 20), bowMaterial);
  bowCore.position.set(0, 0.92, 0.32);
  bowCore.scale.set(0.9, 0.66, 0.54);
  lidGroup.add(bowCore);

  const leftLoop = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.07, 16, 40), bowMaterial);
  leftLoop.position.set(-0.3, 0.94, 0.28);
  leftLoop.rotation.set(0.4, 0.18, -0.48);
  leftLoop.scale.set(1.04, 0.68, 0.62);
  lidGroup.add(leftLoop);

  const rightLoop = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.07, 16, 40), bowMaterial);
  rightLoop.position.set(0.3, 0.94, 0.28);
  rightLoop.rotation.set(0.4, -0.18, 0.48);
  rightLoop.scale.set(1.04, 0.68, 0.62);
  lidGroup.add(rightLoop);

  const leftTail = makeRoundedBox(THREE, 0.16, 0.54, 0.1, 0.05, ribbonMaterial, [-0.22, 0.66, 0.54], [0.08, 0, 0.34]);
  const rightTail = makeRoundedBox(THREE, 0.16, 0.54, 0.1, 0.05, ribbonMaterial, [0.22, 0.66, 0.54], [0.08, 0, -0.34]);
  lidGroup.add(leftTail, rightTail);

  const floorGlow = new THREE.Mesh(new THREE.CircleGeometry(1.42, 56), glowMaterial);
  floorGlow.position.set(0, -1.18, 0.22);
  floorGlow.rotation.set(-1.12, 0, 0.04);
  floorGlow.scale.set(1.5, 0.42, 1);
  group.add(floorGlow);

  const glintMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#fef3c7"),
    opacity: 0.72,
    transparent: true,
  });
  const glints = [
    new THREE.Vector3(-0.72, 0.34, 0.88),
    new THREE.Vector3(0.56, 0.6, 0.86),
    new THREE.Vector3(0.04, 1.18, 0.48),
  ].map((position) => {
    const glint = new THREE.Mesh(new THREE.TetrahedronGeometry(0.08, 0), glintMaterial);
    glint.position.copy(position);
    group.add(glint);
    return glint;
  });

  return { glints, group, lid: lidGroup, textures: [] as Texture[] };
};

export function DashboardSpinningSoundCoin3D({
  className,
  paused = false,
}: DashboardSpinningSoundCoin3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
    setDashboardWebGlCanvasActive(canvasRef.current, !paused);
  }, [paused]);

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
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
      camera.position.set(0, 0.04, 3.15);
      camera.lookAt(0, 0, 0);

      const renderer = createDashboardWebGlRenderer(THREE, canvas, {
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      });
      if (!renderer) return;
      setDashboardWebGlCanvasActive(canvas, !pausedRef.current);
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const textureLoader = new THREE.TextureLoader();
      const coinTexture = configureSoundCoinTexture(
        THREE,
        textureLoader.load(coinTextureSources.gold),
      );

      scene.add(new THREE.AmbientLight(new THREE.Color("#fff4cc"), 1.22));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
      keyLight.position.set(-1.5, 2.2, 3.2);
      scene.add(keyLight);

      const warmLight = new THREE.PointLight(new THREE.Color("#f59e0b"), 2.4, 4.6);
      warmLight.position.set(0.9, -0.6, 2.2);
      scene.add(warmLight);

      const blueRimLight = new THREE.PointLight(new THREE.Color("#38bdf8"), 0.9, 3.2);
      blueRimLight.position.set(-1.3, 0.4, 2.4);
      scene.add(blueRimLight);

      const coinGroup = new THREE.Group();
      coinGroup.rotation.set(-0.1, -0.35, 0.14);
      scene.add(coinGroup);

      const sideMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.72,
        clearcoatRoughness: 0.12,
        color: new THREE.Color("#f6b21f"),
        emissive: new THREE.Color("#8a3d05"),
        emissiveIntensity: 0.14,
        metalness: 0.82,
        roughness: 0.18,
      });
      const faceMaterial = new THREE.MeshPhysicalMaterial({
        bumpMap: coinTexture,
        bumpScale: 0.008,
        clearcoat: 0.76,
        clearcoatRoughness: 0.15,
        color: new THREE.Color("#ffffff"),
        emissive: new THREE.Color("#ffffff"),
        emissiveIntensity: 0.025,
        map: coinTexture,
        metalness: 0.24,
        roughness: 0.23,
      });
      const rimMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.94,
        clearcoatRoughness: 0.1,
        color: new THREE.Color("#fff1a8"),
        emissive: new THREE.Color("#a16207"),
        emissiveIntensity: 0.16,
        metalness: 0.88,
        roughness: 0.14,
      });
      const glintMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color("#fff7d6"),
        opacity: 0.86,
        transparent: true,
      });

      const coin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.72, 0.72, 0.16, 72),
        [sideMaterial, faceMaterial, faceMaterial],
      );
      coin.rotation.x = Math.PI / 2;
      coinGroup.add(coin);

      const frontRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.72, 0.034, 10, 72),
        rimMaterial,
      );
      frontRim.position.z = 0.086;
      coinGroup.add(frontRim);

      const backRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.72, 0.034, 10, 72),
        rimMaterial,
      );
      backRim.position.z = -0.086;
      coinGroup.add(backRim);

      const glint = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.105, 0),
        glintMaterial,
      );
      glint.position.set(-0.36, 0.33, 0.14);
      coinGroup.add(glint);

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
      let lastFrameTime = 0;
      let coinSpinRotation: number = SOUND_COIN_REST_ROTATION.y;
      let coinPulseTime = 0;
      const renderFrame = (time: number) => {
        const frameDelta =
          lastFrameTime > 0 ? Math.min(48, time - lastFrameTime) : 16.67;
        lastFrameTime = time;

        if (!pausedRef.current) {
          coinPulseTime += frameDelta;
          coinSpinRotation += frameDelta * 0.0022;
          coinGroup.rotation.y = coinSpinRotation;
          coinGroup.rotation.x =
            -0.08 + Math.sin(coinPulseTime * 0.0014) * 0.06;
          coinGroup.rotation.z =
            0.14 + Math.sin(coinPulseTime * 0.0018) * 0.05;
          glint.scale.setScalar(
            0.78 + Math.sin(coinPulseTime * 0.0042) * 0.22,
          );
          glint.rotation.y += 0.04;
        } else {
          coinGroup.rotation.x +=
            (SOUND_COIN_REST_ROTATION.x - coinGroup.rotation.x) * 0.14;
          coinGroup.rotation.y = settleRotation(
            coinGroup.rotation.y,
            SOUND_COIN_REST_ROTATION.y,
            0.16,
          );
          coinGroup.rotation.z = settleRotation(
            coinGroup.rotation.z,
            SOUND_COIN_REST_ROTATION.z,
            0.14,
          );
          coinSpinRotation = coinGroup.rotation.y;
          glint.scale.setScalar(0.84 + Math.sin(time * 0.002) * 0.06);
        }

        renderer.render(scene, camera);
        frameId = window.requestAnimationFrame(renderFrame);
      };

      frameId = window.requestAnimationFrame(renderFrame);

      cleanup = () => {
        window.cancelAnimationFrame(frameId);
        observer.disconnect();
        disposeObject(scene);
        coinTexture.dispose();
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
      data-sound-coin-renderer="three"
      ref={canvasRef}
    />
  );
}

export default function DashboardTreasureChest3D({
  className,
  open = true,
  paused = false,
  variant = "showcase",
}: DashboardTreasureChest3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const openRef = useRef(open);
  const pausedRef = useRef(paused);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

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
      const camera = new THREE.PerspectiveCamera(variant === "icon" ? 26 : 32, 1, 0.1, 40);
      camera.position.set(0, variant === "icon" ? 0.5 : 1.05, variant === "icon" ? 5.15 : 6.6);
      camera.lookAt(0, variant === "icon" ? -0.28 : -0.28, 0);

      const renderer = createDashboardWebGlRenderer(THREE, canvas, {
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      });
      if (!renderer) return;
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.85));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const textures =
        variant === "icon"
          ? ({} as Record<keyof typeof coinTextureSources, Texture>)
          : (Object.fromEntries(
              Object.entries(coinTextureSources).map(([tone, src]) => {
                const texture = configureSoundCoinTexture(
                  THREE,
                  new THREE.TextureLoader().load(src),
                );
                return [tone, texture];
              }),
            ) as Record<keyof typeof coinTextureSources, Texture>);

      scene.add(new THREE.AmbientLight(new THREE.Color("#fff7d6"), variant === "icon" ? 2.05 : 1.32));

      const keyLight = new THREE.DirectionalLight(0xffffff, variant === "icon" ? 3.4 : 2.25);
      keyLight.position.set(-2.4, 4.2, 4.4);
      scene.add(keyLight);

      const warmLight = new THREE.PointLight(new THREE.Color("#fbbf24"), variant === "icon" ? 3.6 : 2.2, 7.5);
      warmLight.position.set(0, 1.1, 2.8);
      scene.add(warmLight);

      const blueRim = new THREE.PointLight(new THREE.Color("#38bdf8"), variant === "icon" ? 1.35 : 2.15, 6);
      blueRim.position.set(2.4, 0.2, 2.2);
      scene.add(blueRim);

      if (variant !== "icon") {
        const chromeSweep = new THREE.PointLight(new THREE.Color("#e0f2fe"), 1.65, 5.4);
        chromeSweep.position.set(-1.8, -0.42, 3.2);
        scene.add(chromeSweep);
      }

      const {
        glints,
        group,
        lid,
        textures: usedTextures,
      } =
        variant === "icon"
          ? createGiftBoxScene(THREE)
          : createTreasureChestScene(
              THREE,
              textures,
              openRef.current,
              variant,
            );
      scene.add(group);

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
      const renderFrame = (time: number) => {
        const lidTarget =
          variant === "icon"
            ? openRef.current
              ? GIFT_BOX_LID_OPEN_ROTATION
              : GIFT_BOX_LID_CLOSED_ROTATION
            : openRef.current
              ? TREASURE_CHEST_LID_OPEN_ROTATION
              : TREASURE_CHEST_LID_CLOSED_ROTATION;

        if (pausedRef.current) {
          lid.rotation.x = lidTarget;
        } else {
          const lidEase = openRef.current ? 0.075 : 0.11;
          lid.rotation.x += (lidTarget - lid.rotation.x) * lidEase;
        }

        if (!pausedRef.current) {
          group.rotation.y = -0.22 + Math.sin(time * 0.00045) * 0.07;
          glints.forEach((glint, index) => {
            const pulse = 0.72 + Math.sin(time * 0.0022 + index * 1.7) * 0.22;
            glint.scale.setScalar(pulse);
            glint.rotation.y += 0.018 + index * 0.004;
          });
        }

        renderer.render(scene, camera);
        frameId = window.requestAnimationFrame(renderFrame);
      };

      frameId = window.requestAnimationFrame(renderFrame);

      cleanup = () => {
        window.cancelAnimationFrame(frameId);
        observer.disconnect();
        disposeObject(scene);
        usedTextures.forEach((texture) => texture.dispose());
        renderer.forceContextLoss();
        renderer.dispose();
      };
    };

    void startScene();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [variant]);

  return (
    <canvas
      aria-label="3D treasure chest overflowing with Sound Coins"
      className={className}
      data-treasure-chest-open={open ? "true" : "false"}
      data-treasure-chest-renderer="three"
      data-treasure-chest-variant={variant}
      ref={canvasRef}
      role="img"
    />
  );
}

"use client";

import { useEffect, useRef } from "react";
import type { BufferGeometry, Material, Object3D, Texture } from "three";

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
const TREASURE_ROOM_FLOOR_SCALE = 1.72;
const TREASURE_ROOM_WALL_SCALE = 1.82;

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
) => {
  const group = new THREE.Group();
  group.rotation.set(-0.04, -0.22, 0);
  group.position.set(0, -0.02, 0);

  const wood = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.98,
    clearcoatRoughness: 0.06,
    color: new THREE.Color("#cbd5e1"),
    emissive: new THREE.Color("#0f3a4f"),
    emissiveIntensity: 0.12,
    metalness: 0.92,
    roughness: 0.12,
  });
  const darkWood = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.9,
    clearcoatRoughness: 0.08,
    color: new THREE.Color("#263241"),
    emissive: new THREE.Color("#061827"),
    emissiveIntensity: 0.1,
    metalness: 0.9,
    roughness: 0.14,
  });
  const goldMetal = new THREE.MeshPhysicalMaterial({
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    color: new THREE.Color("#f8fafc"),
    emissive: new THREE.Color("#38bdf8"),
    emissiveIntensity: 0.12,
    metalness: 0.98,
    roughness: 0.08,
  });
  const deepGold = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.95,
    clearcoatRoughness: 0.07,
    color: new THREE.Color("#5eead4"),
    emissive: new THREE.Color("#0891b2"),
    emissiveIntensity: 0.18,
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
  group.add(floorGroup);

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
  group.add(roomGroup);

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
  group.add(contactShadow);

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
  group.add(floorGlow);

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
    group.add(shard);
  });

  const chestGroup = new THREE.Group();
  chestGroup.position.set(0, 0.36, -0.06);
  chestGroup.scale.set(0.94, 1.02, 0.94);
  group.add(chestGroup);

  const base = new THREE.Group();
  base.add(makeBox(THREE, 3.8, 1.18, 1.92, wood, [0, -0.72, 0]));
  base.add(makeBox(THREE, 3.92, 0.14, 2.04, goldMetal, [0, -0.16, 0.04]));
  base.add(makeBox(THREE, 3.92, 0.16, 2.04, deepGold, [0, -1.25, 0.04]));
  base.add(makeBox(THREE, 0.16, 1.28, 2.06, goldMetal, [-1.38, -0.7, 0.04]));
  base.add(makeBox(THREE, 0.16, 1.28, 2.06, goldMetal, [1.38, -0.7, 0.04]));
  base.add(makeBox(THREE, 0.2, 1.34, 2.08, deepGold, [0, -0.7, 0.04]));
  base.add(makeBox(THREE, 3.28, 0.12, 0.08, darkWood, [0, -0.74, 1.02]));
  base.add(makeBox(THREE, 3.28, 0.12, 0.08, darkWood, [0, -0.94, 1.02]));
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
  base.add(makeBox(THREE, 2.86, 0.5, 0.07, frontPanelMaterial, [0, -0.72, 1.08]));
  base.add(makeBox(THREE, 2.62, 0.07, 0.1, goldMetal, [0, -0.42, 1.13]));
  base.add(makeBox(THREE, 2.62, 0.07, 0.1, deepGold, [0, -1.02, 1.13]));
  base.add(makeBox(THREE, 0.1, 0.5, 0.1, goldMetal, [-1.08, -0.72, 1.14]));
  base.add(makeBox(THREE, 0.1, 0.5, 0.1, goldMetal, [1.08, -0.72, 1.14]));
  chestGroup.add(base);

  const lid = new THREE.Group();
  lid.position.set(0, 0.32, -0.72);
  lid.rotation.x = open
    ? TREASURE_CHEST_LID_OPEN_ROTATION
    : TREASURE_CHEST_LID_CLOSED_ROTATION;
  lid.add(makeBox(THREE, 3.96, 0.52, 1.76, wood, [0, 0, 0]));
  lid.add(makeBox(THREE, 4.08, 0.12, 1.86, goldMetal, [0, 0.27, 0]));
  lid.add(makeBox(THREE, 3.58, 0.08, 1.5, darkWood, [0, 0.05, 0.05]));
  lid.add(makeBox(THREE, 0.16, 0.62, 1.9, goldMetal, [-1.46, 0, 0]));
  lid.add(makeBox(THREE, 0.16, 0.62, 1.9, goldMetal, [1.46, 0, 0]));
  lid.add(makeBox(THREE, 4.0, 0.1, 0.12, deepGold, [0, -0.26, 0.9]));
  lid.add(makeBox(THREE, 3.35, 0.07, 0.12, goldMetal, [0, 0.28, 0.7]));
  chestGroup.add(lid);

  const lock = new THREE.Group();
  lock.add(makeBox(THREE, 0.52, 0.6, 0.08, goldMetal, [0, -0.62, 1.04]));
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

  group.scale.setScalar(0.78);
  return { glints, group, lid, textures: [...Object.values(textures), floorTexture] };
};

export function DashboardSpinningSoundCoin3D({
  className,
  paused = false,
}: DashboardSpinningSoundCoin3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};

    const startScene = async () => {
      const THREE = await import("three");
      if (cancelled || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
      camera.position.set(0, 0.04, 3.15);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      });
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
      const renderFrame = (time: number) => {
        if (!pausedRef.current) {
          coinGroup.rotation.y = -0.35 + time * 0.0022;
          coinGroup.rotation.x = -0.08 + Math.sin(time * 0.0014) * 0.06;
          coinGroup.rotation.z = 0.14 + Math.sin(time * 0.0018) * 0.05;
          glint.scale.setScalar(0.78 + Math.sin(time * 0.0042) * 0.22);
          glint.rotation.y += 0.04;
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
      const THREE = await import("three");
      if (cancelled || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
      camera.position.set(0, 1.05, 6.6);
      camera.lookAt(0, -0.28, 0);

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.85));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const textureLoader = new THREE.TextureLoader();
      const textures = Object.fromEntries(
        Object.entries(coinTextureSources).map(([tone, src]) => {
          const texture = configureSoundCoinTexture(THREE, textureLoader.load(src));
          return [tone, texture];
        }),
      ) as Record<keyof typeof coinTextureSources, Texture>;

      scene.add(new THREE.AmbientLight(new THREE.Color("#e0f2fe"), 1.32));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.25);
      keyLight.position.set(-2.4, 4.2, 4.4);
      scene.add(keyLight);

      const warmLight = new THREE.PointLight(new THREE.Color("#fbbf24"), 2.2, 7.5);
      warmLight.position.set(0, 1.1, 2.8);
      scene.add(warmLight);

      const blueRim = new THREE.PointLight(new THREE.Color("#38bdf8"), 2.15, 6);
      blueRim.position.set(2.4, 0.2, 2.2);
      scene.add(blueRim);

      const chromeSweep = new THREE.PointLight(new THREE.Color("#e0f2fe"), 1.65, 5.4);
      chromeSweep.position.set(-1.8, -0.42, 3.2);
      scene.add(chromeSweep);

      const {
        glints,
        group,
        lid,
        textures: usedTextures,
      } = createTreasureChestScene(
        THREE,
        textures,
        openRef.current,
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
        const lidTarget = openRef.current
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
  }, []);

  return (
    <canvas
      aria-label="3D treasure chest overflowing with Sound Coins"
      className={className}
      data-treasure-chest-open={open ? "true" : "false"}
      data-treasure-chest-renderer="three"
      ref={canvasRef}
      role="img"
    />
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { BufferGeometry, Material, Object3D } from "three";
import {
  createDashboardWebGlRenderer,
  loadDashboardThree,
  setDashboardWebGlCanvasActive,
  waitForDashboardWebGlStart,
} from "@/components/dashboard/dashboardWebGlRenderer";

type ThreeModule = typeof import("three");

export type AssessmentIconGlyph =
  | "activity"
  | "alert"
  | "arrow-left"
  | "arrow-right"
  | "bed"
  | "bolt"
  | "calendar"
  | "check"
  | "chevron"
  | "clipboard"
  | "clock"
  | "dumbbell"
  | "globe"
  | "heart"
  | "home"
  | "leaf"
  | "mail"
  | "message"
  | "person"
  | "phone"
  | "pin"
  | "ruler"
  | "scale"
  | "shield"
  | "spark"
  | "target"
  | "trophy"
  | "users";

export type AssessmentIconTone = "amber" | "emerald" | "rose" | "sky" | "slate";

type AssessmentWebGlIconProps = {
  active?: boolean;
  className?: string;
  glyph?: AssessmentIconGlyph;
  paused?: boolean;
  tone?: AssessmentIconTone;
};

type MaterialObject = Object3D & {
  material?: Material | Material[];
};

type GeometryObject = Object3D & {
  geometry?: BufferGeometry;
};

type AssessmentMaterials = {
  accent: Material;
  dark: Material;
  glass: Material;
  glow: Material;
  primary: Material;
  secondary: Material;
  white: Material;
};

type VectorTuple = readonly [number, number, number];

type ExtrudedShapeOptions = {
  depth?: number;
  position?: VectorTuple;
  rotationZ?: number;
  scale?: number;
};

const tonePalette: Record<
  AssessmentIconTone,
  { accent: string; emissive: string; glow: string; primary: string; secondary: string }
> = {
  amber: {
    accent: "#fff7ad",
    emissive: "#f59e0b",
    glow: "#facc15",
    primary: "#fde68a",
    secondary: "#fb923c",
  },
  emerald: {
    accent: "#d1fae5",
    emissive: "#059669",
    glow: "#34d399",
    primary: "#6ee7b7",
    secondary: "#22d3ee",
  },
  rose: {
    accent: "#ffe4e6",
    emissive: "#e11d48",
    glow: "#fb7185",
    primary: "#fda4af",
    secondary: "#f0abfc",
  },
  sky: {
    accent: "#ecfeff",
    emissive: "#0284c7",
    glow: "#22d3ee",
    primary: "#67e8f9",
    secondary: "#bfdbfe",
  },
  slate: {
    accent: "#f8fafc",
    emissive: "#334155",
    glow: "#94a3b8",
    primary: "#cbd5e1",
    secondary: "#38bdf8",
  },
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

const createRoundedRectShape = (
  THREE: ThreeModule,
  width: number,
  height: number,
  radius: number,
) => {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();

  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  shape.closePath();

  return shape;
};

const createBubbleShape = (THREE: ThreeModule) => {
  const shape = createRoundedRectShape(THREE, 0.92, 0.58, 0.12);
  shape.moveTo(-0.22, -0.29);
  shape.lineTo(-0.42, -0.55);
  shape.lineTo(0.02, -0.29);
  shape.closePath();
  return shape;
};

const createHeartShape = (THREE: ThreeModule) => {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.5);
  shape.bezierCurveTo(-0.78, -0.06, -0.82, 0.54, -0.34, 0.67);
  shape.bezierCurveTo(-0.1, 0.74, 0, 0.56, 0, 0.44);
  shape.bezierCurveTo(0, 0.56, 0.1, 0.74, 0.34, 0.67);
  shape.bezierCurveTo(0.82, 0.54, 0.78, -0.06, 0, -0.5);
  shape.closePath();
  return shape;
};

const createShieldShape = (THREE: ThreeModule) => {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.72);
  shape.lineTo(0.54, 0.48);
  shape.lineTo(0.44, -0.18);
  shape.bezierCurveTo(0.32, -0.52, 0.12, -0.72, 0, -0.82);
  shape.bezierCurveTo(-0.12, -0.72, -0.32, -0.52, -0.44, -0.18);
  shape.lineTo(-0.54, 0.48);
  shape.closePath();
  return shape;
};

const createBoltShape = (THREE: ThreeModule) => {
  const shape = new THREE.Shape();
  const points = [
    [0.1, 0.78],
    [-0.44, 0.02],
    [-0.12, 0.02],
    [-0.32, -0.74],
    [0.48, -0.04],
    [0.16, -0.04],
  ] as const;

  shape.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => shape.lineTo(x, y));
  shape.closePath();
  return shape;
};

const createStarShape = (THREE: ThreeModule) => {
  const shape = new THREE.Shape();
  const points = Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? 0.58 : 0.23;
    const angle = -Math.PI / 2 + index * (Math.PI / 5);
    return [Math.cos(angle) * radius, Math.sin(angle) * radius] as const;
  });

  shape.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => shape.lineTo(x, y));
  shape.closePath();
  return shape;
};

const createLeafShape = (THREE: ThreeModule) => {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.66);
  shape.bezierCurveTo(0.68, 0.28, 0.44, -0.48, 0, -0.7);
  shape.bezierCurveTo(-0.44, -0.48, -0.68, 0.28, 0, 0.66);
  shape.closePath();
  return shape;
};

const addExtrudedShape = (
  THREE: ThreeModule,
  group: InstanceType<ThreeModule["Group"]>,
  shape: InstanceType<ThreeModule["Shape"]>,
  material: Material,
  options: ExtrudedShapeOptions = {},
) => {
  const {
    depth = 0.12,
    position = [0, 0, 0.18],
    rotationZ = 0,
    scale = 1,
  } = options;

  const geometry = new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: true,
    bevelSegments: 7,
    bevelSize: 0.018,
    bevelThickness: 0.026,
    depth,
  });
  geometry.center();

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.rotation.z = rotationZ;
  mesh.scale.setScalar(scale);
  group.add(mesh);
};

const addTube = (
  THREE: ThreeModule,
  group: InstanceType<ThreeModule["Group"]>,
  material: Material,
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  radius = 0.035,
) => {
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.LineCurve3(
        new THREE.Vector3(from[0], from[1], from[2]),
        new THREE.Vector3(to[0], to[1], to[2]),
      ),
      8,
      radius,
      12,
      false,
    ),
    material,
  );
  group.add(mesh);
};

const addBox = (
  THREE: ThreeModule,
  group: InstanceType<ThreeModule["Group"]>,
  material: Material,
  size: readonly [number, number, number],
  position: readonly [number, number, number],
  rotation: readonly [number, number, number] = [0, 0, 0],
) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  group.add(mesh);
};

const addSphere = (
  THREE: ThreeModule,
  group: InstanceType<ThreeModule["Group"]>,
  material: Material,
  radius: number,
  position: readonly [number, number, number],
) => {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 28, 18), material);
  mesh.position.set(position[0], position[1], position[2]);
  group.add(mesh);
};

const addRing = (
  THREE: ThreeModule,
  group: InstanceType<ThreeModule["Group"]>,
  material: Material,
  radius: number,
  tube: number,
  position: readonly [number, number, number] = [0, 0, 0.18],
) => {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 14, 72), material);
  mesh.position.set(position[0], position[1], position[2]);
  group.add(mesh);
};

const addPerson = (
  THREE: ThreeModule,
  group: InstanceType<ThreeModule["Group"]>,
  materials: AssessmentMaterials,
  offsetX: number,
  scale: number,
) => {
  addSphere(THREE, group, materials.white, 0.17 * scale, [
    offsetX,
    0.28 * scale,
    0.2,
  ]);
  addExtrudedShape(
    THREE,
    group,
    createRoundedRectShape(THREE, 0.42 * scale, 0.46 * scale, 0.2 * scale),
    materials.primary,
    {
      position: [offsetX, -0.18 * scale, 0.16],
      scale: 1,
    },
  );
};

const buildGlyph = (
  THREE: ThreeModule,
  group: InstanceType<ThreeModule["Group"]>,
  glyph: AssessmentIconGlyph,
  materials: AssessmentMaterials,
) => {
  switch (glyph) {
    case "activity":
      addTube(THREE, group, materials.primary, [-0.62, -0.04, 0.2], [-0.3, -0.04, 0.2]);
      addTube(THREE, group, materials.primary, [-0.3, -0.04, 0.2], [-0.16, 0.34, 0.2]);
      addTube(THREE, group, materials.primary, [-0.16, 0.34, 0.2], [0.12, -0.42, 0.2]);
      addTube(THREE, group, materials.primary, [0.12, -0.42, 0.2], [0.28, 0.02, 0.2]);
      addTube(THREE, group, materials.primary, [0.28, 0.02, 0.2], [0.62, 0.02, 0.2]);
      return;
    case "alert":
      addRing(THREE, group, materials.accent, 0.5, 0.045);
      addTube(THREE, group, materials.primary, [0, 0.26, 0.2], [0, -0.1, 0.2], 0.04);
      addSphere(THREE, group, materials.primary, 0.055, [0, -0.34, 0.2]);
      return;
    case "arrow-left":
      addTube(THREE, group, materials.primary, [0.48, 0, 0.2], [-0.46, 0, 0.2], 0.045);
      addTube(THREE, group, materials.primary, [-0.46, 0, 0.2], [-0.12, 0.28, 0.2], 0.045);
      addTube(THREE, group, materials.primary, [-0.46, 0, 0.2], [-0.12, -0.28, 0.2], 0.045);
      return;
    case "arrow-right":
      addTube(THREE, group, materials.primary, [-0.48, 0, 0.2], [0.46, 0, 0.2], 0.045);
      addTube(THREE, group, materials.primary, [0.46, 0, 0.2], [0.12, 0.28, 0.2], 0.045);
      addTube(THREE, group, materials.primary, [0.46, 0, 0.2], [0.12, -0.28, 0.2], 0.045);
      return;
    case "bed":
      addBox(THREE, group, materials.primary, [1.0, 0.2, 0.16], [0, -0.08, 0.18]);
      addBox(THREE, group, materials.glass, [0.32, 0.28, 0.18], [-0.34, 0.16, 0.18]);
      addBox(THREE, group, materials.secondary, [0.5, 0.2, 0.14], [0.18, 0.12, 0.18]);
      addTube(THREE, group, materials.white, [-0.56, -0.34, 0.18], [0.56, -0.34, 0.18], 0.035);
      return;
    case "bolt":
      addExtrudedShape(THREE, group, createBoltShape(THREE), materials.primary, {
        scale: 0.94,
      });
      return;
    case "calendar":
      addExtrudedShape(
        THREE,
        group,
        createRoundedRectShape(THREE, 0.82, 0.72, 0.08),
        materials.glass,
        { depth: 0.1 },
      );
      addBox(THREE, group, materials.primary, [0.82, 0.12, 0.15], [0, 0.25, 0.23]);
      [-0.22, 0.02, 0.26].forEach((x) => {
        addBox(THREE, group, materials.white, [0.11, 0.08, 0.12], [x, -0.04, 0.25]);
      });
      [-0.16, 0.12].forEach((x) => {
        addBox(THREE, group, materials.secondary, [0.12, 0.08, 0.12], [x, -0.24, 0.25]);
      });
      return;
    case "check":
      addTube(THREE, group, materials.primary, [-0.42, -0.04, 0.2], [-0.12, -0.34, 0.2], 0.055);
      addTube(THREE, group, materials.primary, [-0.12, -0.34, 0.2], [0.52, 0.34, 0.2], 0.055);
      return;
    case "chevron":
      addTube(THREE, group, materials.primary, [-0.32, 0.16, 0.2], [0, -0.14, 0.2], 0.05);
      addTube(THREE, group, materials.primary, [0, -0.14, 0.2], [0.32, 0.16, 0.2], 0.05);
      return;
    case "clipboard":
      addExtrudedShape(
        THREE,
        group,
        createRoundedRectShape(THREE, 0.72, 0.86, 0.08),
        materials.glass,
        { depth: 0.1 },
      );
      addBox(THREE, group, materials.primary, [0.32, 0.11, 0.14], [0, 0.42, 0.24]);
      [-0.1, -0.28].forEach((y) => {
        addTube(THREE, group, materials.white, [-0.24, y, 0.24], [0.28, y, 0.24], 0.025);
      });
      addTube(THREE, group, materials.secondary, [-0.24, 0.08, 0.24], [0.16, 0.08, 0.24], 0.025);
      return;
    case "clock":
      addRing(THREE, group, materials.primary, 0.47, 0.045);
      addTube(THREE, group, materials.white, [0, 0, 0.2], [0, 0.27, 0.2], 0.03);
      addTube(THREE, group, materials.white, [0, 0, 0.2], [0.25, -0.14, 0.2], 0.03);
      return;
    case "dumbbell":
      addTube(THREE, group, materials.primary, [-0.5, 0, 0.2], [0.5, 0, 0.2], 0.045);
      [-0.58, -0.42, 0.42, 0.58].forEach((x) => {
        addBox(THREE, group, materials.white, [0.1, 0.42, 0.17], [x, 0, 0.2]);
      });
      return;
    case "globe": {
      const globe = new THREE.Mesh(
        new THREE.SphereGeometry(0.44, 32, 18),
        materials.glass,
      );
      globe.position.z = 0.15;
      group.add(globe);
      addRing(THREE, group, materials.primary, 0.46, 0.026);
      addTube(THREE, group, materials.white, [-0.44, 0, 0.48], [0.44, 0, 0.48], 0.02);
      return;
    }
    case "heart":
      addExtrudedShape(THREE, group, createHeartShape(THREE), materials.primary, {
        scale: 0.9,
      });
      return;
    case "home":
      addExtrudedShape(
        THREE,
        group,
        createRoundedRectShape(THREE, 0.64, 0.5, 0.06),
        materials.glass,
        { position: [0, -0.18, 0.16] },
      );
      addTube(THREE, group, materials.primary, [-0.48, 0.08, 0.22], [0, 0.48, 0.22], 0.05);
      addTube(THREE, group, materials.primary, [0, 0.48, 0.22], [0.48, 0.08, 0.22], 0.05);
      addBox(THREE, group, materials.secondary, [0.16, 0.28, 0.14], [0, -0.31, 0.24]);
      return;
    case "leaf":
      addExtrudedShape(THREE, group, createLeafShape(THREE), materials.primary, {
        rotationZ: -0.48,
        scale: 0.88,
      });
      addTube(THREE, group, materials.white, [-0.18, -0.38, 0.26], [0.28, 0.38, 0.26], 0.021);
      return;
    case "mail":
      addExtrudedShape(
        THREE,
        group,
        createRoundedRectShape(THREE, 0.92, 0.62, 0.08),
        materials.glass,
        { depth: 0.1 },
      );
      addTube(THREE, group, materials.primary, [-0.42, 0.2, 0.24], [0, -0.06, 0.24], 0.025);
      addTube(THREE, group, materials.primary, [0.42, 0.2, 0.24], [0, -0.06, 0.24], 0.025);
      addTube(THREE, group, materials.white, [-0.42, -0.24, 0.24], [-0.08, 0.02, 0.24], 0.02);
      addTube(THREE, group, materials.white, [0.42, -0.24, 0.24], [0.08, 0.02, 0.24], 0.02);
      return;
    case "message":
      addExtrudedShape(THREE, group, createBubbleShape(THREE), materials.glass, {
        depth: 0.1,
      });
      [-0.16, 0.12].forEach((y) => {
        addTube(THREE, group, materials.primary, [-0.26, y, 0.24], [0.3, y, 0.24], 0.025);
      });
      return;
    case "person":
      addPerson(THREE, group, materials, 0, 1.2);
      return;
    case "phone":
      addExtrudedShape(
        THREE,
        group,
        createRoundedRectShape(THREE, 0.46, 0.9, 0.11),
        materials.glass,
        { rotationZ: -0.32, scale: 0.95 },
      );
      addTube(THREE, group, materials.primary, [-0.04, 0.32, 0.24], [0.14, 0.32, 0.24], 0.018);
      addSphere(THREE, group, materials.primary, 0.035, [0.1, -0.34, 0.24]);
      return;
    case "pin": {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.72, 32), materials.primary);
      cone.rotation.x = Math.PI;
      cone.position.set(0, -0.1, 0.19);
      group.add(cone);
      addSphere(THREE, group, materials.white, 0.18, [0, 0.22, 0.24]);
      return;
    }
    case "ruler":
      addExtrudedShape(
        THREE,
        group,
        createRoundedRectShape(THREE, 1.0, 0.22, 0.06),
        materials.glass,
        { rotationZ: -0.62, scale: 1.02 },
      );
      [-0.32, -0.12, 0.08, 0.28].forEach((x) => {
        addTube(THREE, group, materials.primary, [x, 0.04, 0.26], [x, -0.09, 0.26], 0.014);
      });
      return;
    case "scale":
      addTube(THREE, group, materials.primary, [-0.54, 0.2, 0.2], [0.54, 0.2, 0.2], 0.035);
      addTube(THREE, group, materials.white, [0, 0.2, 0.2], [0, -0.44, 0.2], 0.034);
      addTube(THREE, group, materials.secondary, [-0.34, 0.2, 0.2], [-0.5, -0.18, 0.2], 0.018);
      addTube(THREE, group, materials.secondary, [0.34, 0.2, 0.2], [0.5, -0.18, 0.2], 0.018);
      addBox(THREE, group, materials.glass, [0.42, 0.07, 0.12], [-0.5, -0.22, 0.2]);
      addBox(THREE, group, materials.glass, [0.42, 0.07, 0.12], [0.5, -0.22, 0.2]);
      return;
    case "shield":
      addExtrudedShape(THREE, group, createShieldShape(THREE), materials.glass, {
        scale: 0.84,
      });
      addTube(THREE, group, materials.primary, [-0.22, -0.04, 0.26], [-0.05, -0.24, 0.26], 0.032);
      addTube(THREE, group, materials.primary, [-0.05, -0.24, 0.26], [0.28, 0.22, 0.26], 0.032);
      return;
    case "target":
      addRing(THREE, group, materials.primary, 0.5, 0.04);
      addRing(THREE, group, materials.white, 0.28, 0.032);
      addSphere(THREE, group, materials.secondary, 0.09, [0, 0, 0.21]);
      return;
    case "trophy":
      addBox(THREE, group, materials.primary, [0.56, 0.42, 0.18], [0, 0.16, 0.18]);
      addTube(THREE, group, materials.white, [-0.32, 0.2, 0.2], [-0.58, 0.02, 0.2], 0.035);
      addTube(THREE, group, materials.white, [0.32, 0.2, 0.2], [0.58, 0.02, 0.2], 0.035);
      addTube(THREE, group, materials.secondary, [0, -0.08, 0.2], [0, -0.5, 0.2], 0.04);
      addBox(THREE, group, materials.glass, [0.46, 0.1, 0.14], [0, -0.58, 0.2]);
      return;
    case "users":
      addPerson(THREE, group, materials, -0.22, 0.84);
      addPerson(THREE, group, materials, 0.24, 0.94);
      return;
    case "spark":
    default:
      addExtrudedShape(THREE, group, createStarShape(THREE), materials.primary, {
        scale: 0.78,
      });
  }
};

const createMaterials = (
  THREE: ThreeModule,
  tone: AssessmentIconTone,
): AssessmentMaterials => {
  const palette = tonePalette[tone];

  return {
    accent: new THREE.MeshPhysicalMaterial({
      clearcoat: 0.86,
      color: new THREE.Color(palette.accent),
      emissive: new THREE.Color(palette.glow),
      emissiveIntensity: 0.08,
      metalness: 0.48,
      roughness: 0.14,
    }),
    dark: new THREE.MeshPhysicalMaterial({
      clearcoat: 0.52,
      color: new THREE.Color("#07111f"),
      emissive: new THREE.Color("#082f49"),
      emissiveIntensity: 0.08,
      metalness: 0.42,
      roughness: 0.26,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      clearcoat: 0.9,
      color: new THREE.Color(palette.secondary),
      emissive: new THREE.Color(palette.emissive),
      emissiveIntensity: 0.07,
      metalness: 0.42,
      roughness: 0.16,
      transmission: 0.08,
    }),
    glow: new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: new THREE.Color(palette.glow),
      depthWrite: false,
      opacity: 0.13,
      transparent: true,
    }),
    primary: new THREE.MeshPhysicalMaterial({
      clearcoat: 0.86,
      color: new THREE.Color(palette.primary),
      emissive: new THREE.Color(palette.emissive),
      emissiveIntensity: 0.16,
      metalness: 0.58,
      roughness: 0.12,
    }),
    secondary: new THREE.MeshPhysicalMaterial({
      clearcoat: 0.76,
      color: new THREE.Color(palette.secondary),
      emissive: new THREE.Color(palette.glow),
      emissiveIntensity: 0.09,
      metalness: 0.5,
      roughness: 0.16,
    }),
    white: new THREE.MeshPhysicalMaterial({
      clearcoat: 0.74,
      color: new THREE.Color("#ecfeff"),
      emissive: new THREE.Color("#38bdf8"),
      emissiveIntensity: 0.04,
      metalness: 0.38,
      roughness: 0.17,
    }),
  };
};

export default function AssessmentWebGlIcon({
  active = false,
  className = "",
  glyph = "spark",
  paused = false,
  tone = "sky",
}: AssessmentWebGlIconProps) {
  const activeRef = useRef(active);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(paused);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

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
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 12);
      camera.position.set(0, 0.04, 4.25);
      camera.lookAt(0, 0, 0);

      const renderer = createDashboardWebGlRenderer(THREE, canvas, {
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      });
      if (!renderer) return;

      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio || 1, 1.3), 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const palette = tonePalette[tone];
      scene.add(new THREE.AmbientLight(new THREE.Color("#e0f7ff"), 1.15));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.65);
      keyLight.position.set(-1.4, 2.3, 3.5);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(new THREE.Color(palette.glow), 2.25);
      rimLight.position.set(2.1, 1.25, 2.8);
      scene.add(rimLight);

      const warmLight = new THREE.PointLight(new THREE.Color("#fde68a"), 1.4, 4.2);
      warmLight.position.set(-0.9, -0.45, 2.2);
      scene.add(warmLight);

      const group = new THREE.Group();
      group.rotation.set(-0.15, -0.28, -0.025);
      scene.add(group);

      const materials = createMaterials(THREE, tone);

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.94, 0.98, 0.14, 72),
        materials.dark,
      );
      base.rotation.x = Math.PI / 2;
      base.position.z = -0.04;
      group.add(base);

      const glowDisk = new THREE.Mesh(new THREE.CircleGeometry(0.9, 72), materials.glow);
      glowDisk.position.z = -0.1;
      group.add(glowDisk);

      addRing(THREE, group, materials.primary, 0.84, 0.038, [0, 0, 0.06]);
      buildGlyph(THREE, group, glyph, materials);

      const halo = new THREE.Mesh(
        new THREE.RingGeometry(0.9, 0.96, 72),
        new THREE.MeshBasicMaterial({
          blending: THREE.AdditiveBlending,
          color: new THREE.Color(palette.glow),
          depthWrite: false,
          opacity: 0.08,
          transparent: true,
        }),
      );
      halo.position.z = -0.12;
      scene.add(halo);

      let frameId = 0;
      let visible = true;
      let renderedOnce = false;

      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        const size = Math.max(1, Math.min(rect.width || 1, rect.height || 1));
        renderer.setSize(size, size, false);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
      };

      const observer =
        typeof IntersectionObserver !== "undefined"
          ? new IntersectionObserver(
              ([entry]) => {
                visible = Boolean(entry?.isIntersecting);
                setDashboardWebGlCanvasActive(canvas, visible);
              },
              { threshold: 0.01 },
            )
          : null;
      observer?.observe(canvas);
      setDashboardWebGlCanvasActive(canvas, true);

      const render = (now: number) => {
        if (visible && !pausedRef.current) {
          const t = now * 0.001;
          const boost = activeRef.current ? 1.18 : 1;
          group.rotation.y = -0.3 + Math.sin(t * 0.82) * 0.12 * boost;
          group.rotation.x = -0.16 + Math.sin(t * 0.62) * 0.035;
          group.position.y = Math.sin(t * 1.08) * 0.035 * boost;
          halo.rotation.z = t * 0.24;
          halo.scale.setScalar(1 + Math.sin(t * 1.45) * 0.045 * boost);
          renderer.render(scene, camera);

          if (!renderedOnce) {
            renderedOnce = true;
            canvas.dataset.webglReady = "true";
            setReady(true);
          }
        }

        frameId = window.requestAnimationFrame(render);
      };

      resize();
      window.addEventListener("resize", resize);
      frameId = window.requestAnimationFrame(render);

      cleanup = () => {
        window.cancelAnimationFrame(frameId);
        window.removeEventListener("resize", resize);
        observer?.disconnect();
        setDashboardWebGlCanvasActive(canvas, false);
        disposeObject(scene);
        renderer.dispose();
      };
    };

    void startScene();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [glyph, tone]);

  return (
    <span
      aria-hidden="true"
      className={[
        "dashboard-webgl-snapshot-host relative inline-flex shrink-0 items-center justify-center overflow-visible",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-assessment-webgl-icon={glyph}
    >
      <canvas
        className={[
          "absolute inset-0 h-full w-full transition-opacity duration-300",
          ready ? "opacity-100" : "opacity-0",
        ].join(" ")}
        data-assessment-icon-renderer={`${glyph}:${tone}`}
        data-dashboard-webgl-snapshot-key={`assessment-icon:${glyph}:${tone}`}
        ref={canvasRef}
      />
      <span
        className={[
          "absolute inset-[14%] rounded-full border border-cyan-200/28 bg-[radial-gradient(circle_at_35%_22%,rgba(255,255,255,0.5),rgba(125,211,252,0.34)_34%,rgba(15,23,42,0.95)_78%)] shadow-[0_0_18px_rgba(34,211,238,0.22),inset_0_1px_0_rgba(255,255,255,0.22)] transition-opacity duration-300",
          ready ? "opacity-0" : "opacity-100",
        ].join(" ")}
      />
    </span>
  );
}

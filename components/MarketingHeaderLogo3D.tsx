"use client";

import { useEffect, useRef, useState } from "react";
import type { BufferGeometry, Material, Object3D, Texture } from "three";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";
import {
  createDashboardWebGlRenderer,
  loadDashboardThree,
  setDashboardWebGlCanvasActive,
  waitForDashboardPriorityWebGlRetry,
  waitForDashboardWebGlStart,
} from "./dashboard/dashboardWebGlRenderer";

type ThreeModule = typeof import("three");

type TextGeometryCtor = new (
  text: string,
  parameters: {
    bevelEnabled?: boolean;
    bevelSegments?: number;
    bevelSize?: number;
    bevelThickness?: number;
    curveSegments?: number;
    depth?: number;
    font: Font;
    size?: number;
  },
) => BufferGeometry;

type MarketingHeaderLogo3DProps = {
  active?: boolean;
  /**
   * Keep the logo in its full "at top" state regardless of scroll. The
   * shrink-on-scroll behaviour only earns its keep under a sticky header —
   * anywhere else (a static header, a footer) the logo should just stay open.
   */
  alwaysOpen?: boolean;
  className?: string;
  highlighted?: boolean;
  paused?: boolean;
};

type MaterialObject = Object3D & {
  material?: Material | Material[];
};

type GeometryObject = Object3D & {
  geometry?: BufferGeometry;
};

const HEADER_TOP_SCROLL_TOLERANCE_PX = 48;
const HEADER_WORDMARK_ASPECT = 784 / 528;
const SOUND_WORD_ANGLE = 0.105;
const BARBELL_TILT_ANGLE = SOUND_WORD_ANGLE * 0.4;
// The wordmark is a brand mark, not decoration — if it loses the WebGL budget
// race to the decorative canvases on a busy page, keep asking rather than
// giving up and leaving the flat text fallback on screen forever.
const HEADER_LOGO_WEBGL_MAX_START_ATTEMPTS = 8;

const disposeObject = (object: Object3D) => {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();

  object.traverse((child) => {
    const geometry = (child as GeometryObject).geometry;
    if (geometry) geometries.add(geometry);

    const material = (child as MaterialObject).material;
    if (!material) return;

    if (Array.isArray(material)) {
      material.forEach((item) => materials.add(item));
    } else {
      materials.add(material);
    }
  });

  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
};

const centerGeometry = (geometry: BufferGeometry) => {
  geometry.computeBoundingBox();
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
};

const ignoreLogoBounds = <T extends Object3D>(object: T) => {
  object.userData.ignoreMarketingHeaderLogoBounds = true;
  return object;
};

const createTextMesh = ({
  THREE,
  TextGeometry,
  depth,
  faceMaterial,
  font,
  letterScaleX = 1,
  rotateZ = 0,
  sideMaterial,
  size,
  text,
  x,
  y,
  z = 0,
}: {
  THREE: ThreeModule;
  TextGeometry: TextGeometryCtor;
  depth: number;
  faceMaterial: Material;
  font: Font;
  letterScaleX?: number;
  rotateZ?: number;
  sideMaterial: Material;
  size: number;
  text: string;
  x: number;
  y: number;
  z?: number;
}) => {
  const geometry = centerGeometry(
    new TextGeometry(text, {
      bevelEnabled: true,
      bevelSegments: size > 0.3 ? 4 : 2,
      bevelSize: size * 0.018,
      bevelThickness: size * 0.02,
      curveSegments: 8,
      depth,
      font,
      size,
    }),
  );
  const mesh = new THREE.Mesh(geometry, [faceMaterial, sideMaterial]);
  mesh.position.set(x, y, z);
  mesh.rotation.z = rotateZ;
  mesh.scale.x = letterScaleX;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
};

type CrestGlyph = "D" | "O" | "S" | "U" | "n";

const createCrestGlyphShape = (THREE: ThreeModule, glyph: CrestGlyph) => {
  const shape = new THREE.Shape();

  if (glyph === "S") {
    const centerline: Array<{ x: number; y: number }> = [];
    const appendPoint = (x: number, y: number) => {
      const lastPoint = centerline[centerline.length - 1];
      if (!lastPoint || Math.hypot(x - lastPoint.x, y - lastPoint.y) > 0.0001) {
        centerline.push({ x, y });
      }
    };
    const addLine = (
      from: { x: number; y: number },
      to: { x: number; y: number },
      steps = 10,
    ) => {
      for (let index = 0; index <= steps; index += 1) {
        const t = index / steps;
        appendPoint(
          from.x + (to.x - from.x) * t,
          from.y + (to.y - from.y) * t,
        );
      }
    };
    const addQuarterTurn = (
      centerX: number,
      centerY: number,
      radius: number,
      startAngle: number,
      endAngle: number,
    ) => {
      for (let index = 0; index <= 12; index += 1) {
        const t = index / 12;
        const angle = startAngle + (endAngle - startAngle) * t;
        appendPoint(
          centerX + Math.cos(angle) * radius,
          centerY + Math.sin(angle) * radius,
        );
      }
    };

    addLine({ x: 0.68, y: 0.88 }, { x: 0.22, y: 0.88 });
    addQuarterTurn(0.22, 0.76, 0.12, Math.PI / 2, Math.PI);
    addLine({ x: 0.1, y: 0.76 }, { x: 0.1, y: 0.61 });
    addQuarterTurn(0.22, 0.61, 0.12, Math.PI, Math.PI * 1.5);
    addLine({ x: 0.22, y: 0.49 }, { x: 0.55, y: 0.49 });
    addQuarterTurn(0.55, 0.37, 0.12, Math.PI / 2, 0);
    addLine({ x: 0.67, y: 0.37 }, { x: 0.67, y: 0.22 });
    addQuarterTurn(0.55, 0.22, 0.12, 0, -Math.PI / 2);
    addLine({ x: 0.55, y: 0.1 }, { x: 0.1, y: 0.1 });

    const halfStroke = 0.09;
    const leftEdge: Array<{ x: number; y: number }> = [];
    const rightEdge: Array<{ x: number; y: number }> = [];

    centerline.forEach((point, index) => {
      const previousPoint = centerline[Math.max(0, index - 1)];
      const nextPoint = centerline[Math.min(centerline.length - 1, index + 1)];
      const tangentX = nextPoint.x - previousPoint.x;
      const tangentY = nextPoint.y - previousPoint.y;
      const tangentLength = Math.hypot(tangentX, tangentY) || 1;
      const normalX = -tangentY / tangentLength;
      const normalY = tangentX / tangentLength;

      leftEdge.push({
        x: point.x + normalX * halfStroke,
        y: point.y + normalY * halfStroke,
      });
      rightEdge.push({
        x: point.x - normalX * halfStroke,
        y: point.y - normalY * halfStroke,
      });
    });

    shape.moveTo(leftEdge[0].x, leftEdge[0].y);
    leftEdge.slice(1).forEach((point) => shape.lineTo(point.x, point.y));
    rightEdge.reverse().forEach((point) => shape.lineTo(point.x, point.y));
    shape.closePath();
    return shape;
  }

  if (glyph === "O") {
    const width = 0.78;
    const outerRadius = 0.15;
    const innerLeft = 0.18;
    const innerRight = width - innerLeft;
    const innerBottom = 0.19;
    const innerTop = 1 - innerBottom;
    const innerRadius = 0.07;

    shape.moveTo(outerRadius, 0);
    shape.lineTo(width - outerRadius, 0);
    shape.quadraticCurveTo(width, 0, width, outerRadius);
    shape.lineTo(width, 1 - outerRadius);
    shape.quadraticCurveTo(width, 1, width - outerRadius, 1);
    shape.lineTo(outerRadius, 1);
    shape.quadraticCurveTo(0, 1, 0, 1 - outerRadius);
    shape.lineTo(0, outerRadius);
    shape.quadraticCurveTo(0, 0, outerRadius, 0);

    const hole = new THREE.Path();
    hole.moveTo(innerLeft, innerBottom + innerRadius);
    hole.lineTo(innerLeft, innerTop - innerRadius);
    hole.quadraticCurveTo(innerLeft, innerTop, innerLeft + innerRadius, innerTop);
    hole.lineTo(innerRight - innerRadius, innerTop);
    hole.quadraticCurveTo(innerRight, innerTop, innerRight, innerTop - innerRadius);
    hole.lineTo(innerRight, innerBottom + innerRadius);
    hole.quadraticCurveTo(innerRight, innerBottom, innerRight - innerRadius, innerBottom);
    hole.lineTo(innerLeft + innerRadius, innerBottom);
    hole.quadraticCurveTo(innerLeft, innerBottom, innerLeft, innerBottom + innerRadius);
    shape.holes.push(hole);
    return shape;
  }

  if (glyph === "U") {
    shape.moveTo(0, 1);
    shape.lineTo(0, 0.22);
    shape.quadraticCurveTo(0, 0, 0.2, 0);
    shape.lineTo(0.58, 0);
    shape.quadraticCurveTo(0.78, 0, 0.78, 0.22);
    shape.lineTo(0.78, 1);
    shape.lineTo(0.58, 1);
    shape.lineTo(0.58, 0.26);
    shape.quadraticCurveTo(0.58, 0.18, 0.5, 0.18);
    shape.lineTo(0.28, 0.18);
    shape.quadraticCurveTo(0.2, 0.18, 0.2, 0.26);
    shape.lineTo(0.2, 1);
    shape.closePath();
    return shape;
  }

  if (glyph === "D") {
    shape.moveTo(0, 0);
    shape.lineTo(0.46, 0);
    shape.quadraticCurveTo(0.78, 0, 0.78, 0.32);
    shape.lineTo(0.78, 0.68);
    shape.quadraticCurveTo(0.78, 1, 0.46, 1);
    shape.lineTo(0, 1);
    shape.closePath();

    const hole = new THREE.Path();
    hole.moveTo(0.2, 0.19);
    hole.lineTo(0.2, 0.81);
    hole.lineTo(0.43, 0.81);
    hole.quadraticCurveTo(0.58, 0.81, 0.58, 0.66);
    hole.lineTo(0.58, 0.34);
    hole.quadraticCurveTo(0.58, 0.19, 0.43, 0.19);
    hole.closePath();
    shape.holes.push(hole);
    return shape;
  }

  shape.moveTo(0, 0);
  shape.lineTo(0, 1);
  shape.lineTo(0.62, 1);
  shape.quadraticCurveTo(0.88, 1, 0.88, 0.72);
  shape.lineTo(0.88, 0);
  shape.lineTo(0.66, 0);
  shape.lineTo(0.66, 0.69);
  shape.quadraticCurveTo(0.66, 0.78, 0.57, 0.78);
  shape.lineTo(0.22, 0.78);
  shape.lineTo(0.22, 0);
  shape.closePath();
  return shape;
};

const createCrestGlyphMesh = ({
  THREE,
  depth,
  faceMaterial,
  glyph,
  letterScaleX,
  sideMaterial,
  size,
  x,
  y,
  z,
}: {
  THREE: ThreeModule;
  depth: number;
  faceMaterial: Material;
  glyph: CrestGlyph;
  letterScaleX: number;
  sideMaterial: Material;
  size: number;
  x: number;
  y: number;
  z: number;
}) => {
  const geometry = new THREE.ExtrudeGeometry(createCrestGlyphShape(THREE, glyph), {
    bevelEnabled: true,
    bevelSegments: size > 0.3 ? 4 : 2,
    bevelSize: 0.018,
    bevelThickness: size * 0.02,
    curveSegments: 8,
    depth,
  });
  geometry.scale(size, size, 1);
  centerGeometry(geometry);

  const mesh = new THREE.Mesh(geometry, [faceMaterial, sideMaterial]);
  mesh.position.set(x, y, z);
  mesh.scale.x = letterScaleX;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
};

const createCurvedSoundTextGroup = ({
  THREE,
  TextGeometry,
  depth,
  faceMaterial,
  font,
  letterScaleX = 1,
  sideMaterial,
  size,
  soundFont,
  x,
  y,
  z = 0,
}: {
  THREE: ThreeModule;
  TextGeometry: TextGeometryCtor;
  depth: number;
  faceMaterial: Material;
  font: Font;
  letterScaleX?: number;
  sideMaterial: Material;
  size: number;
  soundFont?: Font;
  x: number;
  y: number;
  z?: number;
}) => {
  const group = new THREE.Group();
  const soundWordRise = 0.0675;
  const letterArc = [
    { letter: "S", rotateZ: SOUND_WORD_ANGLE, y: soundWordRise * -2 },
    { letter: "O", rotateZ: SOUND_WORD_ANGLE, y: soundWordRise * -1 },
    { letter: "U", rotateZ: SOUND_WORD_ANGLE, y: 0 },
    { letter: "n", rotateZ: SOUND_WORD_ANGLE, y: soundWordRise },
    { letter: "D", rotateZ: SOUND_WORD_ANGLE, y: soundWordRise * 1.52 },
  ];
  const arcScale = size / 0.62;
  const targetGlyphWidth = size * letterScaleX * 0.77;
  const glyphGap = size * 0.16;
  const laidOutGlyphs = letterArc.map(({ letter, rotateZ, y: letterY }) => {
    const mesh =
      letter === "S" ||
      letter === "O" ||
      letter === "U" ||
      letter === "n" ||
      letter === "D"
        ? createCrestGlyphMesh({
            THREE,
            depth,
            faceMaterial,
            glyph: letter,
            letterScaleX,
            sideMaterial,
            size,
            x: 0,
            y: letterY * arcScale,
            z: 0,
          })
        : createTextMesh({
            THREE,
            TextGeometry,
            depth,
            faceMaterial,
            font: soundFont ?? font,
            letterScaleX,
            sideMaterial,
            size,
            text: letter,
            x: 0,
            y: letterY * arcScale,
            z: 0,
          });
    mesh.rotation.z = rotateZ;

    for (let pass = 0; pass < 3; pass += 1) {
      mesh.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(mesh);
      const renderedWidth = bounds.max.x - bounds.min.x;
      if (renderedWidth > 0) mesh.scale.x *= targetGlyphWidth / renderedWidth;
    }

    mesh.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(mesh);
    return {
      bounds,
      mesh,
      width: bounds.max.x - bounds.min.x,
    };
  });

  const totalWidth =
    laidOutGlyphs.reduce((sum, glyph) => sum + glyph.width, 0) +
    glyphGap * (laidOutGlyphs.length - 1);
  let cursor = -totalWidth / 2;

  laidOutGlyphs.forEach(({ bounds, mesh, width }) => {
    mesh.position.x = cursor - bounds.min.x;
    cursor += width + glyphGap;
    group.add(mesh);
  });

  group.position.set(x, y, z);
  return group;
};

const createBar = ({
  THREE,
  color,
  depth,
  height,
  opacity = 1,
  width,
  x,
  y,
  z,
}: {
  THREE: ThreeModule;
  color: string;
  depth: number;
  height: number;
  opacity?: number;
  width: number;
  x: number;
  y: number;
  z: number;
}) => {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.7,
    clearcoatRoughness: 0.18,
    color: new THREE.Color(color),
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.28,
    metalness: 0.62,
    opacity,
    roughness: 0.2,
    transparent: opacity < 1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  return mesh;
};

const createBarbell = (
  THREE: ThreeModule,
  x: number,
  y: number,
  z: number,
) => {
  const group = new THREE.Group();
  const barMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
    color: new THREE.Color("#e2e8f0"),
    emissive: new THREE.Color("#38bdf8"),
    emissiveIntensity: 0.16,
    metalness: 0.92,
    roughness: 0.16,
  });
  const plateMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.72,
    clearcoatRoughness: 0.18,
    color: new THREE.Color("#334155"),
    emissive: new THREE.Color("#0e7490"),
    emissiveIntensity: 0.18,
    metalness: 0.82,
    roughness: 0.24,
  });
  const firstPlateMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.72,
    clearcoatRoughness: 0.18,
    color: new THREE.Color("#3f3f46"),
    emissive: new THREE.Color("#27272a"),
    emissiveIntensity: 0.16,
    metalness: 0.88,
    roughness: 0.24,
  });
  const barbellWidthScale = 1.8;
  const weightPlateFaceScale = 1.65 * 3;
  const weightPlateDepthScale = 2.8 * 3;
  const plateRadius = 0.11 * weightPlateFaceScale;
  const plateDepth = 0.09 * weightPlateDepthScale;
  const platesPerSide = 3;
  const plateGap = 0.055;
  const plateStackDepth = plateDepth * 2;
  const singlePlateDepth =
    (plateStackDepth - plateGap * (platesPerSide - 1)) / platesPerSide;
  const collarOffset = 0.96 * barbellWidthScale + 0.02;
  const collarDepth = 0.08;
  const collarRadius = 0.075;

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.016,
      0.016,
      3.72 * barbellWidthScale,
      16,
    ),
    barMaterial,
  );
  shaft.rotation.z = Math.PI / 2;
  shaft.position.set(x, y, z);
  group.add(shaft);

  const plateSpecs: Array<{
    depth: number;
    isFirst: boolean;
    offset: number;
    radius: number;
  }> = [];
  const firstPlateOffset =
    collarOffset + collarDepth / 2 + singlePlateDepth / 2;

  [-1, 1].forEach((side) => {
    for (let plateIndex = 0; plateIndex < platesPerSide; plateIndex += 1) {
      if (plateIndex > 0) {
        continue;
      }

      plateSpecs.push({
        depth: singlePlateDepth,
        isFirst: plateIndex === 0,
        offset:
          side * (firstPlateOffset + plateIndex * (singlePlateDepth + plateGap)),
        radius: plateRadius,
      });
    }
  });

  plateSpecs.forEach(({ depth, isFirst, offset, radius }) => {
    const material = isFirst ? firstPlateMaterial : plateMaterial;
    const capDepth = Math.min(0.1, depth / 2 - 0.02);
    const coreDepth = depth - capDepth * 2;
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, coreDepth, 48),
      material,
    );
    plate.rotation.z = Math.PI / 2;
    plate.position.set(x + offset, y, z + 0.02);
    group.add(plate);

    [-1, 1].forEach((side) => {
      const plateCap = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 48, 24),
        material,
      );
      plateCap.scale.set(capDepth / radius, 1, 1);
      plateCap.position.set(
        x + offset + side * (coreDepth / 2),
        y,
        z + 0.02,
      );
      group.add(plateCap);
    });
  });

  [-collarOffset, collarOffset].forEach((offset) => {
    const collarZ = z + 0.08;
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(collarRadius, collarRadius, collarDepth, 24),
      barMaterial,
    );
    collar.rotation.z = Math.PI / 2;
    collar.position.set(x + offset, y, collarZ);
    group.add(collar);

    const collarEdge = new THREE.Mesh(
      new THREE.TorusGeometry(collarRadius * 0.9, 0.012, 10, 24),
      barMaterial,
    );
    collarEdge.rotation.y = Math.PI / 2;
    collarEdge.position.set(
      x + offset + Math.sign(offset) * collarDepth / 2,
      y,
      collarZ,
    );
    group.add(collarEdge);
  });

  group.rotation.y = -0.24;
  group.rotation.z = BARBELL_TILT_ANGLE;

  return group;
};

const normalizeMarkGroup = (THREE: ThreeModule, markGroup: Object3D) => {
  const box = new THREE.Box3();
  markGroup.updateWorldMatrix(true, true);
  markGroup.traverse((child) => {
    if (child.userData.ignoreMarketingHeaderLogoBounds) return;
    if (!(child as GeometryObject).geometry) return;
    box.expandByObject(child);
  });

  if (box.isEmpty()) {
    box.setFromObject(markGroup);
  }

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  markGroup.position.sub(center);
  const scale = Math.min(5.72 / Math.max(size.x, 0.01), 3.51 / Math.max(size.y, 0.01));
  markGroup.scale.setScalar(scale);
};

const createHeaderLogoGroup = async (THREE: ThreeModule) => {
  const [{ TextGeometry }, { FontLoader }, fontDataModule, soundFontDataModule] =
    await Promise.all([
    import("three/examples/jsm/geometries/TextGeometry.js"),
    import("three/examples/jsm/loaders/FontLoader.js"),
    import("three/examples/fonts/helvetiker_bold.typeface.json"),
    import("three/examples/fonts/optimer_bold.typeface.json"),
  ]);

  const fontData = "default" in fontDataModule ? fontDataModule.default : fontDataModule;
  const font = new FontLoader().parse(fontData);
  const soundFontData =
    "default" in soundFontDataModule ? soundFontDataModule.default : soundFontDataModule;
  const soundFont = new FontLoader().parse(soundFontData);
  const root = new THREE.Group();
  const mark = new THREE.Group();

  const mainFaceMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.92,
    clearcoatRoughness: 0.1,
    color: new THREE.Color("#f8fbff"),
    emissive: new THREE.Color("#bae6fd"),
    emissiveIntensity: 0.2,
    metalness: 0.55,
    roughness: 0.14,
  });

  const mainSideMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.74,
    clearcoatRoughness: 0.16,
    color: new THREE.Color("#1e3a8a"),
    emissive: new THREE.Color("#0e7490"),
    emissiveIntensity: 0.18,
    metalness: 0.72,
    roughness: 0.22,
  });

  const soundOrangeBorderMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.78,
    clearcoatRoughness: 0.14,
    color: new THREE.Color("#f97316"),
    emissive: new THREE.Color("#f59e0b"),
    emissiveIntensity: 0.34,
    metalness: 0.6,
    roughness: 0.18,
  });

  const soundOrangeSideMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.55,
    clearcoatRoughness: 0.2,
    color: new THREE.Color("#7c2d12"),
    emissive: new THREE.Color("#7c2d12"),
    emissiveIntensity: 0.22,
    metalness: 0.66,
    roughness: 0.24,
  });

  const soundOrangeGlowMaterial = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: new THREE.Color("#fb923c"),
    depthWrite: false,
    opacity: 0.22,
    transparent: true,
  });

  const fitnessFaceMaterial = mainFaceMaterial.clone();
  fitnessFaceMaterial.color = new THREE.Color("#f3f7ff");
  fitnessFaceMaterial.emissive = new THREE.Color("#93c5fd");
  fitnessFaceMaterial.emissiveIntensity = 0.16;

  const subtitleFaceMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.7,
    clearcoatRoughness: 0.18,
    color: new THREE.Color("#ecfeff"),
    emissive: new THREE.Color("#22d3ee"),
    emissiveIntensity: 0.22,
    metalness: 0.38,
    roughness: 0.18,
  });

  const subtitleCyanMaterial = subtitleFaceMaterial.clone();
  subtitleCyanMaterial.color = new THREE.Color("#7dd3fc");
  subtitleCyanMaterial.emissive = new THREE.Color("#0891b2");
  subtitleCyanMaterial.emissiveIntensity = 0.35;

  const barbell = createBarbell(THREE, 0, -0.25, 0.1);

  const subtitleSideMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#075985"),
    emissive: new THREE.Color("#082f49"),
    emissiveIntensity: 0.16,
    metalness: 0.62,
    roughness: 0.24,
  });

  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#020617"),
    opacity: 0.58,
    transparent: true,
  });

  const makeShadowText = (
    text: string,
    size: number,
    letterScaleX: number,
    x: number,
    y: number,
    z: number,
    rotateZ: number,
  ) =>
    createTextMesh({
      THREE,
      TextGeometry,
      depth: 0.035,
      faceMaterial: shadowMaterial,
      font,
      letterScaleX,
      rotateZ,
      sideMaterial: shadowMaterial,
      size,
      text,
      x,
      y,
      z,
    });

  const soundEchoes = [
    { color: "#22d3ee", emissive: "#0e7490", peakOpacity: 0.82 },
    { color: "#fbbf24", emissive: "#b45309", peakOpacity: 0.64 },
    { color: "#fb7185", emissive: "#9f1239", peakOpacity: 0.46 },
  ].map(({ color, emissive, peakOpacity }) => {
    const material = new THREE.MeshPhysicalMaterial({
      clearcoat: 0.48,
      clearcoatRoughness: 0.2,
      color: new THREE.Color(color),
      depthWrite: false,
      emissive: new THREE.Color(emissive),
      emissiveIntensity: 0.1,
      metalness: 0.58,
      opacity: 0,
      roughness: 0.28,
      transparent: true,
    });
    const echo = createCurvedSoundTextGroup({
      THREE,
      TextGeometry,
      depth: 0.26,
      faceMaterial: material,
      font,
      letterScaleX: 1.18,
      sideMaterial: material,
      size: 0.62,
      soundFont,
      x: 0,
      y: 0.6,
      z: -0.14,
    });

    echo.traverse((child) => ignoreLogoBounds(child));
    echo.visible = false;

    return { echo, material, peakOpacity };
  });

  mark.add(
    ...soundEchoes.map(({ echo }) => echo),
    createCurvedSoundTextGroup({
      THREE,
      TextGeometry,
      depth: 0.035,
      faceMaterial: shadowMaterial,
      font,
      letterScaleX: 1.18,
      sideMaterial: shadowMaterial,
      size: 0.62,
      soundFont,
      x: 0.08,
      y: 0.56,
      z: -0.18,
    }),
    makeShadowText("FITNESS", 0.35, 1.16, 0.08, -0.01, -0.17, 0.035),
    createCurvedSoundTextGroup({
      THREE,
      TextGeometry,
      depth: 0.29,
      faceMaterial: soundOrangeGlowMaterial,
      font,
      letterScaleX: 1.23,
      sideMaterial: soundOrangeGlowMaterial,
      size: 0.655,
      soundFont,
      x: 0.02,
      y: 0.585,
      z: -0.09,
    }),
    createCurvedSoundTextGroup({
      THREE,
      TextGeometry,
      depth: 0.3,
      faceMaterial: soundOrangeBorderMaterial,
      font,
      letterScaleX: 1.215,
      sideMaterial: soundOrangeSideMaterial,
      size: 0.645,
      soundFont,
      x: 0.012,
      y: 0.588,
      z: -0.045,
    }),
    createCurvedSoundTextGroup({
      THREE,
      TextGeometry,
      depth: 0.24,
      faceMaterial: mainFaceMaterial,
      font,
      letterScaleX: 1.18,
      sideMaterial: mainSideMaterial,
      size: 0.62,
      soundFont,
      x: 0,
      y: 0.6,
      z: 0.03,
    }),
    createTextMesh({
      THREE,
      TextGeometry,
      depth: 0.19,
      faceMaterial: fitnessFaceMaterial,
      font,
      letterScaleX: 1.16,
      rotateZ: 0.035,
      sideMaterial: mainSideMaterial,
      size: 0.35,
      text: "FITNESS",
      x: 0,
      y: 0.03,
      z: 0.05,
    }),
    createTextMesh({
      THREE,
      TextGeometry,
      depth: 0.06,
      faceMaterial: subtitleFaceMaterial,
      font,
      letterScaleX: 1.02,
      sideMaterial: subtitleSideMaterial,
      size: 0.145,
      text: "IN-HOME TRAINING",
      x: -0.02,
      y: -0.42,
      z: 0.08,
    }),
    createTextMesh({
      THREE,
      TextGeometry,
      depth: 0.05,
      faceMaterial: subtitleFaceMaterial,
      font,
      letterScaleX: 1,
      sideMaterial: subtitleSideMaterial,
      size: 0.108,
      text: "AND",
      x: 0,
      y: -0.62,
      z: 0.08,
    }),
    createTextMesh({
      THREE,
      TextGeometry,
      depth: 0.075,
      faceMaterial: subtitleCyanMaterial,
      font,
      letterScaleX: 1.04,
      sideMaterial: subtitleSideMaterial,
      size: 0.19,
      text: "ASSISTED STRETCH",
      x: 0,
      y: -0.84,
      z: 0.08,
    }),
    createBar({
      THREE,
      color: "#e0f2fe",
      depth: 0.04,
      height: 0.018,
      width: 0.48,
      x: -0.42,
      y: -0.62,
      z: 0.07,
    }),
    createBar({
      THREE,
      color: "#e0f2fe",
      depth: 0.04,
      height: 0.018,
      width: 0.48,
      x: 0.42,
      y: -0.62,
      z: 0.07,
    }),
    barbell,
  );

  normalizeMarkGroup(THREE, mark);
  root.add(mark);
  root.rotation.set(-0.05, 0.24, -0.015);

  return {
    barbell,
    mainFaceMaterial,
    mark,
    soundEchoes,
    soundOrangeBorderMaterial,
    soundOrangeGlowMaterial,
    root,
    subtitleCyanMaterial,
  };
};

export default function MarketingHeaderLogo3D({
  active = true,
  alwaysOpen = false,
  className = "",
  highlighted = false,
  paused = false,
}: MarketingHeaderLogo3DProps) {
  const activeRef = useRef(active);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const externalHighlightRef = useRef(highlighted);
  const highlightRef = useRef(false);
  const pausedRef = useRef(paused);
  const [isAtScrollTop, setIsAtScrollTop] = useState(true);
  const [webglReady, setWebglReady] = useState(false);
  // Only true once 3D has definitively failed (no WebGL, or we never won a
  // context). The flat text is a last resort, not a loading state — showing it
  // while the canvas warms up is what made the logo flash a smaller white
  // wordmark before the real one appeared.
  const [webglFailed, setWebglFailed] = useState(false);
  const [transitionsReady, setTransitionsReady] = useState(false);

  // Apply the initial (at-top) sizing instantly on mount, then enable the
  // 560ms transitions. Otherwise the logo visibly grows/settles into place on
  // open — which reads as a glitch when the header first appears.
  useEffect(() => {
    let second = 0;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => setTransitionsReady(true));
    });
    return () => {
      window.cancelAnimationFrame(first);
      if (second) window.cancelAnimationFrame(second);
    };
  }, []);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    externalHighlightRef.current = highlighted;
  }, [highlighted]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    // Pinned open: nothing to track, so don't listen to scroll at all.
    if (alwaysOpen) return;

    let frameId = 0;

    const updateScrollState = () => {
      frameId = 0;
      setIsAtScrollTop(window.scrollY <= HEADER_TOP_SCROLL_TOLERANCE_PX);
    };

    const requestUpdate = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(updateScrollState);
    };

    updateScrollState();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [alwaysOpen]);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};

    const startScene = async () => {
      let startAttempt = 0;

      while (!cancelled && canvasRef.current) {
        await waitForDashboardWebGlStart({ priority: true });
        if (cancelled || !canvasRef.current) return;

        const THREE = await loadDashboardThree();
        if (cancelled || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const renderer = createDashboardWebGlRenderer(
          THREE,
          canvas,
          {
            alpha: true,
            antialias: true,
            powerPreference: "high-performance",
            preserveDrawingBuffer: false,
          },
          // The wordmark is the brand mark — it gets the slot reserved for
          // priority callers rather than losing it to decorative canvases.
          { priority: true },
        );
        // Budget denied us a context. Wait for one to free up and ask again —
        // bailing here is what stranded the flat text fallback on screen.
        if (!renderer) {
          if (startAttempt >= HEADER_LOGO_WEBGL_MAX_START_ATTEMPTS) {
            // Out of attempts: 3D isn't happening, so let the text through.
            setWebglFailed(true);
            return;
          }

          await waitForDashboardPriorityWebGlRetry(startAttempt);
          startAttempt += 1;
          continue;
        }

      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(
        Math.min(Math.max(window.devicePixelRatio || 1, 1.4), 2),
      );
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      // Filmic tonemapping keeps the emissive orange and bright chrome from
      // clipping to flat white where highlights stack up.
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;

      const scene = new THREE.Scene();

      // The wordmark is mostly high-metalness MeshPhysicalMaterial — with no
      // environment to reflect, metal renders flat and lifeless. A tiny
      // procedural room gives every bevel real reflections. Generated once.
      let envTarget: { texture: Texture; dispose: () => void } | null = null;
      try {
        const { RoomEnvironment } = await import(
          "three/examples/jsm/environments/RoomEnvironment.js"
        );
        const pmrem = new THREE.PMREMGenerator(renderer);
        envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
        scene.environment = envTarget.texture;
        scene.environmentIntensity = 0.55;
        pmrem.dispose();
      } catch {
        // Env map is a polish layer — the light rig below still works alone.
      }

      const camera = new THREE.PerspectiveCamera(
        30,
        HEADER_WORDMARK_ASPECT,
        0.1,
        14,
      );
      camera.position.set(0, 0.03, 5.3);
      camera.lookAt(0, 0, 0);

      scene.add(new THREE.AmbientLight(new THREE.Color("#dff7ff"), 0.85));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
      keyLight.position.set(-1.6, 2.6, 3.4);
      scene.add(keyLight);

      // Rim light from behind pulls the lettering off the dark header instead
      // of letting its edges melt into the background.
      const rimLight = new THREE.DirectionalLight(new THREE.Color("#7dd3fc"), 1.5);
      rimLight.position.set(0.6, -1.2, -3);
      scene.add(rimLight);

      const cyanLight = new THREE.PointLight(new THREE.Color("#38bdf8"), 2.8, 5.5);
      cyanLight.position.set(-1.2, 0.3, 2.2);
      scene.add(cyanLight);

      const amberLight = new THREE.PointLight(new THREE.Color("#f59e0b"), 1.6, 4.8);
      amberLight.position.set(1.55, 0.9, 2.5);
      scene.add(amberLight);

      const {
        barbell,
        mainFaceMaterial,
        mark,
        root,
        soundEchoes,
        soundOrangeBorderMaterial,
        soundOrangeGlowMaterial,
        subtitleCyanMaterial,
      } = await createHeaderLogoGroup(THREE);

      if (cancelled || !canvasRef.current) {
        disposeObject(root);
        envTarget?.dispose();
        renderer.forceContextLoss();
        renderer.dispose();
        return;
      }

      scene.add(root);

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
      let hasRendered = false;
      const startedAt = performance.now();
      let echoStrength = 0;

      const renderFrame = (time: number) => {
        const seconds = (time - startedAt) / 1000;
        const charge = activeRef.current && !pausedRef.current ? 1 : 0;
        setDashboardWebGlCanvasActive(canvas, charge > 0);

        root.rotation.x = -0.05 + Math.sin(seconds * 0.7) * 0.012 * charge;
        root.rotation.y = 0.24 + Math.sin(seconds * 0.52) * 0.045 * charge;
        root.rotation.z = -0.015 + Math.sin(seconds * 0.46) * 0.01 * charge;
        // Keep the exposed shaft ends visually matched while the mark gently yaws.
        barbell.rotation.y = -root.rotation.y;
        root.position.y = Math.sin(seconds * 0.64) * 0.018 * charge;
        mark.position.x = Math.sin(seconds * 0.42) * 0.012 * charge;
        const targetEchoStrength =
          (highlightRef.current || externalHighlightRef.current) && charge > 0
            ? 1
            : 0;
        echoStrength +=
          (targetEchoStrength - echoStrength) * (targetEchoStrength ? 0.18 : 0.1);
        soundEchoes.forEach(({ echo, material, peakOpacity }, index) => {
          const strength = Math.max(0, echoStrength - index * 0.12);
          const pulse = 0.76 + Math.sin(seconds * 9.2 - index * 0.78) * 0.24;
          const layer = index + 1;
          const scale = 1 + layer * 0.025 * strength;

          echo.visible = strength > 0.006;
          material.opacity = peakOpacity * strength * pulse;
          echo.position.set(
            -layer * 0.24 * strength,
            0.6 - layer * 0.12 * strength,
            -0.16 - layer * 0.58 * strength,
          );
          echo.rotation.z = -layer * 0.026 * strength;
          echo.scale.setScalar(scale);
        });
        mainFaceMaterial.emissiveIntensity = 0.2 + Math.sin(seconds * 1.15) * 0.035;
        soundOrangeBorderMaterial.emissiveIntensity =
          0.34 + Math.max(0, Math.sin(seconds * 1.9 + 0.6)) * 0.18;
        soundOrangeGlowMaterial.opacity =
          0.18 + Math.max(0, Math.sin(seconds * 1.7 + 0.9)) * 0.16;
        subtitleCyanMaterial.emissiveIntensity =
          0.34 + Math.max(0, Math.sin(seconds * 1.7)) * 0.16;

        cyanLight.intensity = 2.5 + Math.max(0, Math.sin(seconds * 1.4)) * 0.9;
        amberLight.intensity = 1.35 + Math.max(0, Math.sin(seconds * 1.1 + 1.4)) * 0.55;
        renderer.render(scene, camera);

        if (!hasRendered) {
          hasRendered = true;
          setWebglReady(true);
        }

        frameId = window.requestAnimationFrame(renderFrame);
      };

      frameId = window.requestAnimationFrame(renderFrame);

      cleanup = () => {
        window.cancelAnimationFrame(frameId);
        observer.disconnect();
        disposeObject(scene);
        envTarget?.dispose();
        renderer.forceContextLoss();
        renderer.dispose();
      };

        // Running — stop retrying.
        return;
      }
    };

    void startScene();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return (
    <span
      aria-hidden="true"
      className={`marketing-header-logo-3d relative block overflow-visible ${
        alwaysOpen || isAtScrollTop ? "marketing-header-logo-3d--at-top" : ""
      } ${transitionsReady ? "" : "marketing-header-logo-3d--instant"} ${className}`}
      data-marketing-header-logo-3d="rebuilt-text"
      onPointerEnter={() => {
        highlightRef.current = true;
      }}
      onPointerLeave={() => {
        highlightRef.current = false;
      }}
      onPointerCancel={() => {
        highlightRef.current = false;
      }}
      style={{ aspectRatio: `${HEADER_WORDMARK_ASPECT}` }}
    >
      <style>{`
        @keyframes marketing-header-logo-fire-drift {
          0%,
          100% {
            opacity: 0.36;
            transform: translate3d(-2%, 1%, 0) scale(1) rotate(-1deg);
          }

          48% {
            opacity: 0.58;
            transform: translate3d(2%, -1%, 0) scale(1.025) rotate(0.8deg);
          }
        }

        @keyframes marketing-header-logo-stars-drift {
          0% {
            opacity: 0.28;
            transform: translate3d(-2%, 1%, 0);
          }

          52% {
            opacity: 0.52;
          }

          100% {
            opacity: 0.34;
            transform: translate3d(2%, -1.5%, 0);
          }
        }

        @keyframes marketing-header-logo-space-color-drift {
          0%,
          100% {
            filter: blur(7px) saturate(1.62) brightness(1.14) hue-rotate(0deg);
          }

          34% {
            filter: blur(7px) saturate(1.72) brightness(1.18) hue-rotate(-14deg);
          }

          68% {
            filter: blur(7px) saturate(1.6) brightness(1.1) hue-rotate(-42deg);
          }
        }

        .marketing-header-logo-3d {
          --marketing-header-logo-lift: 0rem;
          --marketing-header-logo-root-scale: 0.985;
          --marketing-header-logo-root-y: 0rem;
          --marketing-header-logo-visual-scale: 0.98;
          overflow: visible;
          position: relative;
          transform: translate3d(0, var(--marketing-header-logo-root-y), 0)
            scale(var(--marketing-header-logo-root-scale));
          transform-origin: center bottom;
          z-index: 1;
          transition:
            filter 560ms cubic-bezier(0.19, 1, 0.22, 1),
            transform 560ms cubic-bezier(0.19, 1, 0.22, 1),
            width 560ms cubic-bezier(0.19, 1, 0.22, 1);
          will-change: transform, width;
        }

        .marketing-header-logo-3d--instant,
        .marketing-header-logo-3d--instant .marketing-header-logo-3d__wordmark,
        .marketing-header-logo-3d--instant .marketing-header-logo-3d__fire,
        .marketing-header-logo-3d--instant .marketing-header-logo-3d__stars {
          transition: none !important;
        }

        /* This logo already has its own styled text fallback for the
           not-yet-rendered case, so the shared WebGL snapshot layer has no
           sizing rules here and would paint a second, unpositioned copy of the
           wordmark over the real one. Suppress it, same as
           .marketing-section-heading-3d does. */
        .marketing-header-logo-3d > .dashboard-webgl-snapshot-layer {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
        }

        .marketing-header-logo-3d--at-top {
          --marketing-header-logo-lift: -0.12rem;
          --marketing-header-logo-root-scale: 1.025;
          --marketing-header-logo-root-y: -0.16rem;
          --marketing-header-logo-visual-scale: 1.1;
          filter:
            drop-shadow(0 0 16px rgba(125, 211, 252, 0.14))
            drop-shadow(0 0 24px rgba(249, 115, 22, 0.12));
          width: clamp(9.85rem, 13.8vw, 11rem);
        }

        .marketing-header-logo-3d__wordmark {
          bottom: auto;
          filter:
            drop-shadow(0 0 12px rgba(125, 211, 252, 0.18))
            drop-shadow(0 0 18px rgba(249, 115, 22, 0.1));
          height: calc(100% + 0.38rem);
          left: 50%;
          right: auto;
          top: 50%;
          transform:
            translate(-50%, -50%)
            translateY(var(--marketing-header-logo-lift))
            scale(var(--marketing-header-logo-visual-scale));
          transform-origin: center;
          transition:
            filter 560ms cubic-bezier(0.19, 1, 0.22, 1),
            opacity 300ms ease,
            transform 560ms cubic-bezier(0.19, 1, 0.22, 1);
          will-change: transform, opacity, filter;
          width: calc(100% + 0.64rem);
          z-index: 10;
        }

        .marketing-header-logo-3d__fire,
        .marketing-header-logo-3d__stars {
          pointer-events: none;
          position: absolute;
          transition:
            filter 560ms cubic-bezier(0.19, 1, 0.22, 1),
            inset 560ms cubic-bezier(0.19, 1, 0.22, 1),
            opacity 560ms cubic-bezier(0.19, 1, 0.22, 1);
          z-index: 0;
        }

        .marketing-header-logo-3d__fire {
          animation:
            marketing-header-logo-fire-drift 7.8s ease-in-out infinite,
            marketing-header-logo-space-color-drift 12s ease-in-out infinite;
          background:
            radial-gradient(ellipse at 8% 38%, rgba(249, 115, 22, 0.6), transparent 34%),
            radial-gradient(ellipse at 94% 38%, rgba(14, 165, 233, 0.46), transparent 36%),
            radial-gradient(ellipse at 70% 78%, rgba(16, 185, 129, 0.24), transparent 30%),
            radial-gradient(ellipse at 44% 4%, rgba(251, 191, 36, 0.3), transparent 30%),
            conic-gradient(from 214deg at 44% 48%, transparent 0deg, rgba(251, 146, 60, 0.3) 36deg, rgba(56, 189, 248, 0.24) 78deg, transparent 136deg);
          filter: blur(7px) saturate(1.62) brightness(1.14);
          inset: -27% -31% -13% -28%;
          mask-image: radial-gradient(ellipse at 48% 45%, black 0 48%, rgba(0, 0, 0, 0.72) 62%, transparent 82%);
          mix-blend-mode: screen;
          opacity: 0.5;
          border-radius: 999px;
          -webkit-mask-image: radial-gradient(ellipse at 48% 45%, black 0 48%, rgba(0, 0, 0, 0.72) 62%, transparent 82%);
        }

        .marketing-header-logo-3d__fire::before,
        .marketing-header-logo-3d__fire::after {
          content: none;
          display: none;
        }

        .marketing-header-logo-3d__stars {
          animation: marketing-header-logo-stars-drift 11s ease-in-out infinite alternate;
          background-image:
            radial-gradient(circle at 8% 26%, rgba(255, 255, 255, 0.95) 0 1px, transparent 2px),
            radial-gradient(circle at 14% 48%, rgba(186, 230, 253, 0.96) 0 1.1px, transparent 2.2px),
            radial-gradient(circle at 24% 34%, rgba(255, 255, 255, 0.92) 0 0.9px, transparent 2px),
            radial-gradient(circle at 20% 72%, rgba(254, 240, 138, 0.92) 0 0.9px, transparent 2px),
            radial-gradient(circle at 30% 78%, rgba(125, 211, 252, 0.92) 0 1px, transparent 2px),
            radial-gradient(circle at 36% 12%, rgba(186, 230, 253, 0.96) 0 1px, transparent 2px),
            radial-gradient(circle at 58% 64%, rgba(255, 255, 255, 0.94) 0 0.95px, transparent 2px),
            radial-gradient(circle at 67% 34%, rgba(254, 240, 138, 0.94) 0 1px, transparent 2px),
            radial-gradient(circle at 72% 20%, rgba(125, 211, 252, 0.95) 0 1px, transparent 2px),
            radial-gradient(circle at 78% 56%, rgba(255, 255, 255, 0.94) 0 1.1px, transparent 2px),
            radial-gradient(circle at 86% 70%, rgba(125, 211, 252, 0.92) 0 0.9px, transparent 2px),
            radial-gradient(circle at 90% 42%, rgba(255, 255, 255, 0.9) 0 1px, transparent 2px),
            linear-gradient(108deg, transparent 0 10%, rgba(251, 146, 60, 0.26) 18%, transparent 32% 100%),
            linear-gradient(116deg, transparent 0 48%, rgba(125, 211, 252, 0.22) 58%, transparent 72% 100%);
          filter:
            drop-shadow(0 0 5px rgba(250, 204, 21, 0.32))
            drop-shadow(0 0 8px rgba(56, 189, 248, 0.32));
          inset: -24% -28% -10% -24%;
          mask-image: radial-gradient(ellipse at 50% 47%, transparent 0 32%, rgba(0, 0, 0, 0.68) 54%, transparent 84%);
          mix-blend-mode: screen;
          opacity: 0.4;
          border-radius: 999px;
          -webkit-mask-image: radial-gradient(ellipse at 50% 47%, transparent 0 32%, rgba(0, 0, 0, 0.68) 54%, transparent 84%);
        }

        .marketing-header-logo-3d--at-top .marketing-header-logo-3d__fire {
          inset: -31% -35% -15% -32%;
          opacity: 0.52;
        }

        .marketing-header-logo-3d--at-top .marketing-header-logo-3d__stars {
          opacity: 0.46;
        }

        @media (max-width: 559px) {
          .marketing-header-logo-3d--at-top {
            --marketing-header-logo-lift: -0.08rem;
            --marketing-header-logo-root-scale: 1.015;
            --marketing-header-logo-root-y: -0.1rem;
            --marketing-header-logo-visual-scale: 1.05;
            width: min(9.2rem, calc(100vw - 6rem));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .marketing-header-logo-3d,
          .marketing-header-logo-3d__wordmark,
          .marketing-header-logo-3d__fire,
          .marketing-header-logo-3d__stars {
            animation: none;
            transition: none;
          }
        }
      `}</style>
      <span aria-hidden="true" className="marketing-header-logo-3d__fire" />
      <span aria-hidden="true" className="marketing-header-logo-3d__stars" />
      <span
        className={`marketing-header-logo-3d__wordmark absolute flex flex-col items-center justify-center text-center uppercase text-white transition-opacity duration-300 ${
          webglFailed && !webglReady ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="text-[1.42rem] font-black leading-[0.74] tracking-[-0.02em] text-slate-100 drop-shadow-[0_0_8px_rgba(125,211,252,0.5)]">
          Sound
        </span>
        <span className="text-[0.95rem] font-black leading-none tracking-[0.02em] text-slate-100 drop-shadow-[0_0_8px_rgba(125,211,252,0.45)]">
          Fitness
        </span>
        <span className="mt-1 text-[0.38rem] font-black leading-none tracking-[0.08em] text-cyan-100">
          In-home training
        </span>
        <span className="mt-0.5 text-[0.34rem] font-black leading-none tracking-[0.08em] text-cyan-200">
          Assisted stretch
        </span>
      </span>
      <canvas
        aria-hidden="true"
        className={`marketing-header-logo-3d__wordmark absolute transition-opacity duration-300 ${
          webglReady ? "opacity-100" : "opacity-0"
        }`}
        data-logo-renderer="header-wordmark-rebuilt-text"
        ref={canvasRef}
      />
    </span>
  );
}

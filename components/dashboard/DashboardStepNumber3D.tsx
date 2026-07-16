"use client";

import { useEffect, useMemo, useRef } from "react";
import type { BufferGeometry, Material, Object3D } from "three";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";
import {
  createDashboardWebGlRenderer,
  loadDashboardThree,
  waitForDashboardWebGlStart,
} from "./dashboardWebGlRenderer";

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

type DashboardStepNumber3DProps = {
  active?: boolean;
  className?: string;
  number: string;
  paused?: boolean;
  styleVariant?: "segment" | "slab";
};

type MaterialObject = Object3D & {
  material?: Material | Material[];
};

type GeometryObject = Object3D & {
  geometry?: BufferGeometry;
};

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

type SegmentName =
  | "top"
  | "upperRight"
  | "lowerRight"
  | "bottom"
  | "lowerLeft"
  | "upperLeft"
  | "middle";

type SegmentSpec = {
  height: number;
  width: number;
  x: number;
  y: number;
};

const DIGIT_SEGMENTS: Record<string, SegmentName[]> = {
  "0": ["top", "upperRight", "lowerRight", "bottom", "lowerLeft", "upperLeft"],
  "1": ["upperRight", "lowerRight"],
  "2": ["top", "upperRight", "middle", "lowerLeft", "bottom"],
  "3": ["top", "upperRight", "middle", "lowerRight", "bottom"],
  "4": ["upperLeft", "upperRight", "middle", "lowerRight"],
  "5": ["top", "upperLeft", "middle", "lowerRight", "bottom"],
  "6": ["top", "upperLeft", "middle", "lowerRight", "bottom", "lowerLeft"],
  "7": ["top", "upperRight", "lowerRight"],
  "8": [
    "top",
    "upperRight",
    "lowerRight",
    "bottom",
    "lowerLeft",
    "upperLeft",
    "middle",
  ],
  "9": ["top", "upperRight", "lowerRight", "bottom", "upperLeft", "middle"],
};

const DIGIT_WIDTH = 0.72;
const DIGIT_HEIGHT = 1.34;
const SEGMENT_THICKNESS = 0.16;
const SEGMENT_DEPTH = 0.28;
const DIGIT_SPACING = 0.86;

const createRoundedRectShape = (
  THREE: ThreeModule,
  width: number,
  height: number,
  radius: number,
) => {
  const x = -width / 2;
  const y = -height / 2;
  const right = width / 2;
  const bottom = height / 2;
  const clampedRadius = Math.min(radius, width / 2, height / 2);
  const shape = new THREE.Shape();

  shape.moveTo(x + clampedRadius, y);
  shape.lineTo(right - clampedRadius, y);
  shape.quadraticCurveTo(right, y, right, y + clampedRadius);
  shape.lineTo(right, bottom - clampedRadius);
  shape.quadraticCurveTo(right, bottom, right - clampedRadius, bottom);
  shape.lineTo(x + clampedRadius, bottom);
  shape.quadraticCurveTo(x, bottom, x, bottom - clampedRadius);
  shape.lineTo(x, y + clampedRadius);
  shape.quadraticCurveTo(x, y, x + clampedRadius, y);
  shape.closePath();

  return shape;
};

const createSegmentGeometry = (
  THREE: ThreeModule,
  width: number,
  height: number,
) => {
  const geometry = new THREE.ExtrudeGeometry(
    createRoundedRectShape(THREE, width, height, SEGMENT_THICKNESS * 0.42),
    {
      bevelEnabled: true,
      bevelSegments: 5,
      bevelSize: 0.024,
      bevelThickness: 0.032,
      depth: SEGMENT_DEPTH,
    },
  );
  geometry.translate(0, 0, -SEGMENT_DEPTH / 2);
  return geometry;
};

const createSegmentSpecs = (): Record<SegmentName, SegmentSpec> => {
  const horizontalWidth = DIGIT_WIDTH;
  const verticalHeight = (DIGIT_HEIGHT - SEGMENT_THICKNESS * 1.5) / 2;
  const topY = DIGIT_HEIGHT / 2 - SEGMENT_THICKNESS / 2;
  const bottomY = -topY;
  const middleY = 0;
  const leftX = -DIGIT_WIDTH / 2 + SEGMENT_THICKNESS / 2;
  const rightX = -leftX;
  const upperY = DIGIT_HEIGHT / 4 - SEGMENT_THICKNESS / 8;
  const lowerY = -upperY;

  return {
    bottom: {
      height: SEGMENT_THICKNESS,
      width: horizontalWidth,
      x: 0,
      y: bottomY,
    },
    lowerLeft: {
      height: verticalHeight,
      width: SEGMENT_THICKNESS,
      x: leftX,
      y: lowerY,
    },
    lowerRight: {
      height: verticalHeight,
      width: SEGMENT_THICKNESS,
      x: rightX,
      y: lowerY,
    },
    middle: {
      height: SEGMENT_THICKNESS,
      width: horizontalWidth * 0.92,
      x: 0,
      y: middleY,
    },
    top: {
      height: SEGMENT_THICKNESS,
      width: horizontalWidth,
      x: 0,
      y: topY,
    },
    upperLeft: {
      height: verticalHeight,
      width: SEGMENT_THICKNESS,
      x: leftX,
      y: upperY,
    },
    upperRight: {
      height: verticalHeight,
      width: SEGMENT_THICKNESS,
      x: rightX,
      y: upperY,
    },
  };
};

const createDigitGroup = (
  THREE: ThreeModule,
  digit: string,
  material: Material[],
) => {
  const group = new THREE.Group();
  const activeSegments = DIGIT_SEGMENTS[digit] ?? DIGIT_SEGMENTS["0"];
  const specs = createSegmentSpecs();

  activeSegments.forEach((segmentName) => {
    const spec = specs[segmentName];
    const segment = new THREE.Mesh(
      createSegmentGeometry(THREE, spec.width, spec.height),
      material,
    );
    segment.position.set(spec.x, spec.y, 0);
    segment.castShadow = false;
    segment.receiveShadow = false;
    group.add(segment);
  });

  return group;
};

const createNumberTextGeometry = (
  TextGeometry: TextGeometryCtor,
  font: Font,
  text: string,
) =>
  centerGeometry(
    new TextGeometry(text, {
      bevelEnabled: true,
      bevelSegments: 4,
      bevelSize: 0.026,
      bevelThickness: 0.038,
      curveSegments: 6,
      depth: 0.24,
      font,
      size: 0.82,
    }),
  );

const createSlabNumberGroup = (
  THREE: ThreeModule,
  TextGeometry: TextGeometryCtor,
  font: Font,
  text: string,
  frontMaterial: Material,
  sideMaterial: Material,
  cyanInsetMaterial: Material,
  cyanSideMaterial: Material,
  amberInsetMaterial: Material,
  amberSideMaterial: Material,
) => {
  const textGeometry = createNumberTextGeometry(TextGeometry, font, text);
  const group = new THREE.Group();

  const amberShadow = new THREE.Mesh(textGeometry.clone(), [
    amberInsetMaterial,
    amberSideMaterial,
  ]);
  amberShadow.position.set(-0.072, -0.072, -0.18);
  amberShadow.scale.setScalar(1.026);
  group.add(amberShadow);

  const cyanShadow = new THREE.Mesh(textGeometry.clone(), [
    cyanInsetMaterial,
    cyanSideMaterial,
  ]);
  cyanShadow.position.set(0.064, -0.036, -0.09);
  cyanShadow.scale.setScalar(1.018);
  group.add(cyanShadow);

  const face = new THREE.Mesh(textGeometry, [frontMaterial, sideMaterial]);
  face.position.set(0, 0, 0.04);
  group.add(face);

  const underlineMaterial = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: new THREE.Color("#67e8f9"),
    depthWrite: false,
    opacity: 0.42,
    transparent: true,
  });
  const underline = new THREE.Mesh(new THREE.PlaneGeometry(1.86, 0.034), underlineMaterial);
  underline.position.set(0.08, -0.58, -0.14);
  underline.rotation.z = -0.035;
  group.add(underline);

  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const scale = Math.min(2.02 / Math.max(size.x, 0.01), 1.36 / Math.max(size.y, 0.01));
  group.scale.setScalar(scale);

  const fittedBox = new THREE.Box3().setFromObject(group);
  const center = fittedBox.getCenter(new THREE.Vector3());
  group.position.sub(center);

  return group;
};

export default function DashboardStepNumber3D({
  active = false,
  className = "",
  number,
  paused = false,
  styleVariant = "slab",
}: DashboardStepNumber3DProps) {
  const activeRef = useRef(active);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(paused);
  const snapshotKey = useMemo(
    () => `${styleVariant}-${number}`,
    [number, styleVariant],
  );

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

      let TextGeometry: TextGeometryCtor | null = null;
      let font: Font | null = null;

      if (styleVariant === "slab") {
        const [
          { TextGeometry: LoadedTextGeometry },
          { FontLoader },
          fontModule,
        ] = await Promise.all([
          import("three/examples/jsm/geometries/TextGeometry.js"),
          import("three/examples/jsm/loaders/FontLoader.js"),
          import("three/examples/fonts/helvetiker_bold.typeface.json"),
        ]);

        if (cancelled || !canvasRef.current) return;

        TextGeometry = LoadedTextGeometry;
        font = new FontLoader().parse(
          "default" in fontModule ? fontModule.default : fontModule,
        );
      }

      const canvas = canvasRef.current;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 12);
      camera.position.set(0, 0, 4.35);
      camera.lookAt(0, 0, 0);

      const renderer = createDashboardWebGlRenderer(THREE, canvas, {
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      });
      if (!renderer) return;

      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(
        Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2.1),
      );
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      scene.add(new THREE.AmbientLight(new THREE.Color("#e0f2fe"), 1.25));

      const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
      keyLight.position.set(-1.6, 2.35, 3.4);
      scene.add(keyLight);

      const rimLight = new THREE.PointLight(new THREE.Color("#22d3ee"), 3, 5);
      rimLight.position.set(1.2, -0.7, 2.5);
      scene.add(rimLight);

      const goldLight = new THREE.PointLight(new THREE.Color("#fde68a"), 1.25, 4);
      goldLight.position.set(-1.3, 1.1, 2.2);
      scene.add(goldLight);

      const group = new THREE.Group();
      group.rotation.set(0.08, -0.19, -0.025);
      scene.add(group);

      const digitFrontMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.92,
        clearcoatRoughness: 0.1,
        color: new THREE.Color("#f8fbff"),
        emissive: new THREE.Color("#38bdf8"),
        emissiveIntensity: 0.42,
        metalness: 0.42,
        roughness: 0.16,
      });

      const digitSideMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.74,
        clearcoatRoughness: 0.16,
        color: new THREE.Color("#0ea5e9"),
        emissive: new THREE.Color("#075985"),
        emissiveIntensity: 0.18,
        metalness: 0.72,
        roughness: 0.2,
      });

      const cyanInsetMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.76,
        clearcoatRoughness: 0.18,
        color: new THREE.Color("#0891b2"),
        emissive: new THREE.Color("#22d3ee"),
        emissiveIntensity: 0.36,
        metalness: 0.58,
        opacity: 0.78,
        roughness: 0.2,
        transparent: true,
      });

      const cyanSideMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#083344"),
        emissive: new THREE.Color("#0e7490"),
        emissiveIntensity: 0.26,
        metalness: 0.7,
        opacity: 0.72,
        roughness: 0.24,
        transparent: true,
      });

      const amberInsetMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.72,
        clearcoatRoughness: 0.14,
        color: new THREE.Color("#f59e0b"),
        emissive: new THREE.Color("#f97316"),
        emissiveIntensity: 0.38,
        metalness: 0.62,
        opacity: 0.7,
        roughness: 0.18,
        transparent: true,
      });

      const amberSideMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#431407"),
        emissive: new THREE.Color("#ea580c"),
        emissiveIntensity: 0.24,
        metalness: 0.64,
        opacity: 0.62,
        roughness: 0.22,
        transparent: true,
      });

      const digitMaterial = [digitFrontMaterial, digitSideMaterial];
      const digits = [...number].filter((character) => /\d/.test(character));
      const visibleDigits = digits.length > 0 ? digits : ["0"];
      const numberGroup =
        styleVariant === "slab" && TextGeometry && font
          ? createSlabNumberGroup(
              THREE,
              TextGeometry,
              font,
              visibleDigits.join(""),
              digitFrontMaterial,
              digitSideMaterial,
              cyanInsetMaterial,
              cyanSideMaterial,
              amberInsetMaterial,
              amberSideMaterial,
            )
          : new THREE.Group();

      if (numberGroup.children.length === 0) {
        const centerOffset = ((visibleDigits.length - 1) * DIGIT_SPACING) / 2;

        visibleDigits.forEach((digit, index) => {
          const digitGroup = createDigitGroup(THREE, digit, digitMaterial);
          digitGroup.position.x = index * DIGIT_SPACING - centerOffset;
          numberGroup.add(digitGroup);
        });

        numberGroup.scale.set(1.04, 1.04, 1.04);
      }

      group.add(numberGroup);

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
      let charge = 0;
      const renderFrame = (time: number) => {
        const frameDelta =
          lastFrameTime > 0 ? Math.min(48, time - lastFrameTime) : 16.67;
        lastFrameTime = time;

        const seconds = time / 1000;
        const targetCharge = activeRef.current && !pausedRef.current ? 1 : 0;
        charge += (targetCharge - charge) * Math.min(1, frameDelta * 0.012);

        group.position.y = Math.sin(seconds * 1.25) * 0.012 * charge;
        group.rotation.x = 0.08 + Math.sin(seconds * 1.1) * 0.018 * charge;
        group.rotation.y = -0.19 + Math.sin(seconds * 0.8) * 0.095 * charge;
        group.rotation.z = -0.025 + Math.sin(seconds * 1.35) * 0.014 * charge;
        digitFrontMaterial.emissiveIntensity = 0.42 + charge * 0.22;
        digitSideMaterial.emissiveIntensity = 0.18 + charge * 0.12;
        cyanInsetMaterial.emissiveIntensity = 0.36 + charge * 0.2;
        amberInsetMaterial.emissiveIntensity = 0.38 + charge * 0.16;
        rimLight.intensity = 2.2 + charge * 1.2;

        renderer.render(scene, camera);
        frameId = window.requestAnimationFrame(renderFrame);
      };

      frameId = window.requestAnimationFrame(renderFrame);

      cleanup = () => {
        window.cancelAnimationFrame(frameId);
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
  }, [number, styleVariant]);

  return (
    <canvas
      aria-hidden="true"
      className={className}
      data-step-number-renderer={snapshotKey}
      ref={canvasRef}
    />
  );
}

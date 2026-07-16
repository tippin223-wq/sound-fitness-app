"use client";

import { useEffect, useMemo, useRef } from "react";
import type { BufferGeometry, Material, Object3D } from "three";
import {
  createDashboardWebGlRenderer,
  loadDashboardThree,
  setDashboardWebGlCanvasActive,
  waitForDashboardWebGlStart,
} from "./dashboard/dashboardWebGlRenderer";

type ThreeModule = typeof import("three");

type MarketingEnergyLine3DProps = {
  active?: boolean;
  className?: string;
  lineKey: string;
  paused?: boolean;
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

const createSparkField = (THREE: ThreeModule) => {
  const particleCount = 22;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const cyan = new THREE.Color("#67e8f9");
  const amber = new THREE.Color("#fbbf24");
  const white = new THREE.Color("#f8fafc");

  for (let index = 0; index < particleCount; index += 1) {
    const color = index % 5 === 0 ? amber : index % 3 === 0 ? white : cyan;
    positions[index * 3] = -2.72 + ((index * 53) % 544) / 100;
    positions[index * 3 + 1] = -0.06 + ((index * 19) % 12) / 100;
    positions[index * 3 + 2] = -0.08 + ((index * 17) % 22) / 100;
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.48,
    size: 0.026,
    transparent: true,
    vertexColors: true,
  });

  return new THREE.Points(geometry, material);
};

const createBladeShape = (
  THREE: ThreeModule,
  length: number,
  height: number,
) => {
  const tip = Math.min(length * 0.075, height * 2.65);
  const halfLength = length / 2;
  const halfHeight = height / 2;
  const shape = new THREE.Shape();

  shape.moveTo(-halfLength, 0);
  shape.lineTo(-halfLength + tip, halfHeight);
  shape.lineTo(halfLength - tip, halfHeight);
  shape.lineTo(halfLength, 0);
  shape.lineTo(halfLength - tip, -halfHeight);
  shape.lineTo(-halfLength + tip, -halfHeight);
  shape.closePath();

  return shape;
};

const createBlade = (
  THREE: ThreeModule,
  color: string,
  opacity: number,
  length: number,
  height: number,
  xOffset = 0,
  yOffset = 0,
  zOffset = 0,
) => {
  const geometry = new THREE.ShapeGeometry(createBladeShape(THREE, length, height));
  const material = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: new THREE.Color(color),
    depthWrite: false,
    opacity,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(xOffset, yOffset, zOffset);
  return mesh;
};

const createDiagonalNick = (
  THREE: ThreeModule,
  color: string,
  opacity: number,
  xOffset: number,
) => {
  const geometry = new THREE.PlaneGeometry(0.36, 0.024);
  const material = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: new THREE.Color(color),
    depthWrite: false,
    opacity,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(xOffset, 0.012, 0.16);
  mesh.rotation.z = -0.34;
  return mesh;
};

export default function MarketingEnergyLine3D({
  active = true,
  className = "",
  lineKey,
  paused = false,
}: MarketingEnergyLine3DProps) {
  const activeRef = useRef(active);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(paused);
  const snapshotKey = useMemo(() => `marketing-energy-line:${lineKey}`, [lineKey]);

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
      const renderer = createDashboardWebGlRenderer(THREE, canvas, {
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      });
      if (!renderer) return;

      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(
        Math.min(Math.max(window.devicePixelRatio || 1, 1.35), 1.9),
      );
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-3.12, 3.12, 0.58, -0.58, 0.1, 6);
      camera.position.set(0, 0, 3);
      camera.lookAt(0, 0, 0);

      const root = new THREE.Group();
      scene.add(root);

      const outerGlow = createBlade(THREE, "#0ea5e9", 0.18, 5.92, 0.22, 0, 0, -0.05);
      const cyanGlow = createBlade(THREE, "#22d3ee", 0.34, 5.62, 0.108, 0, 0, 0.02);
      const iceCore = createBlade(THREE, "#e0f2fe", 0.92, 5.14, 0.032, 0, 0, 0.08);
      const lowerEdge = createBlade(THREE, "#0284c7", 0.72, 5.36, 0.024, 0.06, -0.052, 0.1);
      const amberEdge = createBlade(THREE, "#f59e0b", 0.5, 1.56, 0.026, -1.35, 0.052, 0.12);
      const farEdge = createBlade(THREE, "#bae6fd", 0.44, 1.08, 0.018, 1.82, 0.044, 0.12);
      const nickA = createDiagonalNick(THREE, "#fef3c7", 0.54, -0.38);
      const nickB = createDiagonalNick(THREE, "#7dd3fc", 0.44, 0.98);
      root.add(outerGlow, cyanGlow, iceCore, lowerEdge, amberEdge, farEdge, nickA, nickB);

      const flareMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#fef9c3"),
        depthWrite: false,
        opacity: 0.64,
        transparent: true,
      });
      const flare = createBlade(THREE, "#fef9c3", 0.62, 0.64, 0.072, 0, 0, 0.2);
      flare.material = flareMaterial;
      root.add(flare);

      const sparks = createSparkField(THREE);
      sparks.position.z = 0.05;
      root.add(sparks);

      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        renderer.setSize(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)), false);
        camera.updateProjectionMatrix();
      };

      const observer = new ResizeObserver(resize);
      observer.observe(canvas);
      resize();

      let frameId = 0;
      const startedAt = performance.now();

      const renderFrame = (time: number) => {
        const seconds = (time - startedAt) / 1000;
        const isActive = activeRef.current && !pausedRef.current;
        setDashboardWebGlCanvasActive(canvas, isActive);

        const sweep = ((seconds * 0.62) % 1) * 5.36 - 2.68;
        flare.position.set(sweep, 0.004 + Math.sin(seconds * 2.2) * 0.006, 0.2);
        flareMaterial.opacity = isActive
          ? 0.44 + Math.max(0, Math.sin(seconds * 3.8)) * 0.28
          : 0.32;
        outerGlow.scale.y = 0.92 + Math.max(0, Math.sin(seconds * 1.55)) * 0.22;
        cyanGlow.scale.y = 0.94 + Math.max(0, Math.sin(seconds * 1.86)) * 0.12;
        amberEdge.position.x = -1.35 + Math.sin(seconds * 0.82) * 0.04;
        farEdge.position.x = 1.82 + Math.sin(seconds * 0.74) * 0.035;
        nickA.material.opacity = 0.38 + Math.max(0, Math.sin(seconds * 2.2)) * 0.18;
        nickB.material.opacity = 0.32 + Math.max(0, Math.sin(seconds * 2.6 + 0.8)) * 0.16;
        sparks.position.x = Math.sin(seconds * 0.62) * 0.035;

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
  }, []);

  return (
    <canvas
      aria-hidden="true"
      className={className}
      data-marketing-energy-line-renderer={snapshotKey}
      ref={canvasRef}
    />
  );
}

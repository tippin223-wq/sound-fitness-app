"use client";

import { useEffect, useRef } from "react";
import type { BufferGeometry, Material, Object3D } from "three";

type ThreeModule = typeof import("three");

type MaterialObject = Object3D & {
  material?: Material | Material[];
};

type GeometryObject = Object3D & {
  geometry?: BufferGeometry;
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

const createTrophyGroup = (THREE: ThreeModule) => {
  const trophy = new THREE.Group();

  const silver = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.95,
    clearcoatRoughness: 0.16,
    color: new THREE.Color("#f8fafc"),
    emissive: new THREE.Color("#94a3b8"),
    emissiveIntensity: 0.08,
    metalness: 0.64,
    roughness: 0.18,
  });
  const darkSilver = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.7,
    clearcoatRoughness: 0.28,
    color: new THREE.Color("#94a3b8"),
    emissive: new THREE.Color("#1e293b"),
    emissiveIntensity: 0.06,
    metalness: 0.58,
    roughness: 0.32,
  });
  const innerMetal = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.75,
    clearcoatRoughness: 0.24,
    color: new THREE.Color("#64748b"),
    emissive: new THREE.Color("#172033"),
    emissiveIntensity: 0.08,
    metalness: 0.56,
    roughness: 0.26,
  });
  const glintMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#ffffff"),
    opacity: 0.78,
    transparent: true,
  });
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color("#f8fafc"),
    opacity: 0.36,
    transparent: true,
  });

  const cupPoints = [
    new THREE.Vector2(0.18, -0.36),
    new THREE.Vector2(0.32, -0.18),
    new THREE.Vector2(0.48, 0.2),
    new THREE.Vector2(0.58, 0.48),
    new THREE.Vector2(0.64, 0.64),
  ];
  const cupGeometry = new THREE.LatheGeometry(cupPoints, 56);
  const cup = new THREE.Mesh(cupGeometry, silver);

  const cupEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(cupGeometry, 24),
    edgeMaterial,
  );

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.64, 0.052, 14, 72),
    silver,
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.64;

  const inner = new THREE.Mesh(new THREE.CircleGeometry(0.52, 56), innerMetal);
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.642;

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.095, 0.13, 0.62, 28),
    darkSilver,
  );
  stem.position.y = -0.68;

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.58, 0.16, 36),
    darkSilver,
  );
  base.position.y = -1.05;

  const baseRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.045, 12, 52),
    silver,
  );
  baseRim.rotation.x = Math.PI / 2;
  baseRim.position.y = -0.96;

  const createHandle = (side: -1 | 1) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.55, 0.44, 0),
      new THREE.Vector3(side * 0.86, 0.34, -0.02),
      new THREE.Vector3(side * 0.9, 0.02, -0.03),
      new THREE.Vector3(side * 0.55, -0.12, 0),
    ]);
    const handle = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 36, 0.038, 10, false),
      silver,
    );
    const handleEdge = new THREE.LineSegments(
      new THREE.EdgesGeometry(handle.geometry, 20),
      edgeMaterial,
    );
    handle.add(handleEdge);
    return handle;
  };

  const frontGlint = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 12, 8),
    glintMaterial,
  );
  frontGlint.position.set(-0.2, 0.46, 0.48);
  frontGlint.scale.set(1, 0.62, 0.72);

  const bodyGlint = new THREE.Mesh(
    new THREE.SphereGeometry(0.036, 12, 8),
    glintMaterial,
  );
  bodyGlint.position.set(0.17, 0.04, 0.47);
  bodyGlint.scale.set(0.72, 1.45, 0.5);

  trophy.add(
    cup,
    cupEdges,
    rim,
    inner,
    createHandle(-1),
    createHandle(1),
    stem,
    base,
    baseRim,
    frontGlint,
    bodyGlint,
  );
  trophy.scale.setScalar(0.98);
  trophy.position.set(0, -0.04, 0);

  return trophy;
};

export default function DashboardTrophy3D({
  paused = false,
}: {
  paused?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};

    const startScene = async () => {
      const THREE = await import("three");
      if (cancelled || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
      camera.position.set(0, 0.02, 5.15);
      camera.lookAt(0, -0.02, 0);

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

      scene.add(new THREE.AmbientLight(new THREE.Color("#e0f2fe"), 1.62));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.35);
      keyLight.position.set(-1.4, 2.95, 3.4);
      scene.add(keyLight);

      const rimLight = new THREE.PointLight(
        new THREE.Color("#bae6fd"),
        2.8,
        5.4,
      );
      rimLight.position.set(1.6, 0.2, 2.4);
      scene.add(rimLight);

      const coolBackLight = new THREE.PointLight(
        new THREE.Color("#38bdf8"),
        1.05,
        4.2,
      );
      coolBackLight.position.set(-1.2, -1.2, -0.9);
      scene.add(coolBackLight);

      const trophy = createTrophyGroup(THREE);
      scene.add(trophy);

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
      const render = (time: number) => {
        const seconds = (time - startedAt) / 1000;
        trophy.rotation.set(
          -0.15 + Math.sin(seconds * 0.26) * 0.014,
          seconds * 0.18,
          Math.sin(seconds * 0.22) * 0.009,
        );
        renderer.render(scene, camera);
        if (paused) return;

        frameId = window.requestAnimationFrame(render);
      };

      if (paused) {
        render(startedAt);
      } else {
        frameId = window.requestAnimationFrame(render);
      }
      cleanup = () => {
        if (frameId !== 0) {
          window.cancelAnimationFrame(frameId);
        }
        observer.disconnect();
        disposeObject(trophy);
        renderer.forceContextLoss();
        renderer.dispose();
      };
    };

    startScene();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [paused]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="dashboard-header-trophy-3d"
      data-trophy-paused={paused ? "true" : "false"}
      data-trophy-renderer="three"
      style={{
        display: "block",
        filter:
          "drop-shadow(0 0 0.36rem rgba(226,232,240,0.66)) drop-shadow(0 0 0.72rem rgba(34,211,238,0.22))",
        height: "100%",
        pointerEvents: "none",
        width: "100%",
      }}
    />
  );
}

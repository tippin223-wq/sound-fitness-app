"use client";

import { useEffect, useRef } from "react";
import type { BufferGeometry, Material, Object3D } from "three";
import {
  createDashboardWebGlRenderer,
  loadDashboardThree,
  setDashboardWebGlCanvasActive,
  waitForDashboardPriorityWebGlRetry,
  waitForDashboardWebGlStart,
} from "./dashboardWebGlRenderer";

type ThreeModule = typeof import("three");

type MaterialObject = Object3D & {
  material?: Material | Material[];
};

type GeometryObject = Object3D & {
  geometry?: BufferGeometry;
};

const TROPHY_REST_ROTATION = {
  x: -0.045,
  y: -0.22,
  z: 0.018,
} as const;
const TROPHY_WEBGL_MAX_START_ATTEMPTS = 8;

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

const createTrophyGroup = (THREE: ThreeModule) => {
  const trophy = new THREE.Group();

  const silver = new THREE.MeshPhysicalMaterial({
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    color: new THREE.Color("#d8e4ee"),
    emissive: new THREE.Color("#0f2233"),
    emissiveIntensity: 0.04,
    metalness: 0.86,
    roughness: 0.22,
  });
  const darkSilver = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.86,
    clearcoatRoughness: 0.2,
    color: new THREE.Color("#46586b"),
    emissive: new THREE.Color("#07111d"),
    emissiveIntensity: 0.05,
    metalness: 0.78,
    roughness: 0.31,
  });
  const innerMetal = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.9,
    clearcoatRoughness: 0.18,
    color: new THREE.Color("#203248"),
    emissive: new THREE.Color("#04111f"),
    emissiveIntensity: 0.08,
    metalness: 0.7,
    roughness: 0.28,
  });
  const cyanGlass = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: new THREE.Color("#38dfff"),
    depthWrite: false,
    opacity: 0.1,
    transparent: true,
  });
  const cyanEdge = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: new THREE.Color("#7dd3fc"),
    depthWrite: false,
    opacity: 0.22,
    transparent: true,
  });
  const reflectionMaterial = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: new THREE.Color("#bff6ff"),
    depthWrite: false,
    opacity: 0.44,
    transparent: true,
  });
  const glintMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#ffffff"),
    opacity: 0.46,
    transparent: true,
  });
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color("#d8f3ff"),
    opacity: 0.2,
    transparent: true,
  });

  const backGlow = new THREE.Mesh(new THREE.CircleGeometry(1.1, 64), cyanGlass);
  backGlow.position.set(0, -0.08, -0.52);

  const backRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.92, 0.018, 8, 72),
    cyanEdge,
  );
  backRing.position.set(0, -0.08, -0.5);

  const cupPoints = [
    new THREE.Vector2(0.16, -0.4),
    new THREE.Vector2(0.27, -0.32),
    new THREE.Vector2(0.38, -0.05),
    new THREE.Vector2(0.53, 0.32),
    new THREE.Vector2(0.61, 0.6),
    new THREE.Vector2(0.66, 0.68),
  ];
  const cupGeometry = new THREE.LatheGeometry(cupPoints, 72);
  const cup = new THREE.Mesh(cupGeometry, silver);

  const cupEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(cupGeometry, 28),
    edgeMaterial,
  );

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.66, 0.052, 16, 84),
    silver,
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.68;

  const lowerCupBand = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.028, 12, 56),
    darkSilver,
  );
  lowerCupBand.rotation.x = Math.PI / 2;
  lowerCupBand.position.y = -0.38;

  const inner = new THREE.Mesh(new THREE.CircleGeometry(0.54, 72), innerMetal);
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.688;

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.135, 0.58, 36),
    darkSilver,
  );
  stem.position.y = -0.7;

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.47, 0.59, 0.17, 48),
    darkSilver,
  );
  base.position.y = -1.05;

  const basePlinth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.72, 0.13, 48),
    darkSilver,
  );
  basePlinth.position.y = -1.2;

  const baseRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.49, 0.044, 12, 64),
    silver,
  );
  baseRim.rotation.x = Math.PI / 2;
  baseRim.position.y = -0.96;

  const footGlow = new THREE.Mesh(
    new THREE.TorusGeometry(0.68, 0.018, 8, 72),
    cyanEdge,
  );
  footGlow.rotation.x = Math.PI / 2;
  footGlow.position.y = -1.11;

  const createHandle = (side: -1 | 1) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.57, 0.5, -0.02),
      new THREE.Vector3(side * 0.88, 0.37, -0.08),
      new THREE.Vector3(side * 0.92, 0.02, -0.08),
      new THREE.Vector3(side * 0.56, -0.16, -0.02),
    ]);
    const handle = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 44, 0.036, 12, false),
      silver,
    );
    const handleEdge = new THREE.LineSegments(
      new THREE.EdgesGeometry(handle.geometry, 20),
      edgeMaterial,
    );
    handle.add(handleEdge);
    return handle;
  };

  const faceReflection = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 16, 8),
    reflectionMaterial,
  );
  faceReflection.position.set(-0.23, 0.27, 0.52);
  faceReflection.scale.set(0.68, 2.5, 0.22);
  faceReflection.rotation.z = -0.35;

  const rimReflection = new THREE.Mesh(
    new THREE.SphereGeometry(0.042, 12, 8),
    reflectionMaterial,
  );
  rimReflection.position.set(0.24, 0.58, 0.48);
  rimReflection.scale.set(1.6, 0.52, 0.2);

  const frontGlint = new THREE.Mesh(
    new THREE.SphereGeometry(0.038, 12, 8),
    glintMaterial,
  );
  frontGlint.position.set(-0.32, 0.5, 0.48);
  frontGlint.scale.set(1, 0.62, 0.72);

  const bodyGlint = new THREE.Mesh(
    new THREE.SphereGeometry(0.028, 12, 8),
    glintMaterial,
  );
  bodyGlint.position.set(0.14, -0.08, 0.48);
  bodyGlint.scale.set(0.72, 1.45, 0.5);

  trophy.add(
    backGlow,
    backRing,
    cup,
    cupEdges,
    rim,
    lowerCupBand,
    inner,
    createHandle(-1),
    createHandle(1),
    stem,
    base,
    basePlinth,
    baseRim,
    footGlow,
    faceReflection,
    rimReflection,
    frontGlint,
    bodyGlint,
  );
  trophy.scale.setScalar(0.88);
  trophy.position.set(0, -0.02, 0);
  trophy.rotation.set(
    TROPHY_REST_ROTATION.x,
    TROPHY_REST_ROTATION.y,
    TROPHY_REST_ROTATION.z,
  );

  return trophy;
};

export default function DashboardTrophy3D({
  paused = false,
}: {
  paused?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameIdRef = useRef(0);
  const pausedRef = useRef(paused);
  const renderFrameRef = useRef<((time: number) => void) | null>(null);

  useEffect(() => {
    pausedRef.current = paused;

    setDashboardWebGlCanvasActive(canvasRef.current, true);
    if (frameIdRef.current === 0 && renderFrameRef.current) {
      frameIdRef.current = window.requestAnimationFrame(renderFrameRef.current);
    }
  }, [paused]);

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
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
        camera.position.set(0, 0.02, 5.15);
        camera.lookAt(0, -0.02, 0);

        const renderer = createDashboardWebGlRenderer(THREE, canvas, {
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
          preserveDrawingBuffer: false,
        });
        if (!renderer) {
          if (startAttempt >= TROPHY_WEBGL_MAX_START_ATTEMPTS) return;

          await waitForDashboardPriorityWebGlRetry(startAttempt);
          startAttempt += 1;
          continue;
        }
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.85));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      scene.add(new THREE.HemisphereLight("#d9f7ff", "#020617", 1.08));
      scene.add(new THREE.AmbientLight(new THREE.Color("#dbeafe"), 0.72));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.35);
      keyLight.position.set(-1.55, 2.9, 3.3);
      scene.add(keyLight);

      const sideShade = new THREE.DirectionalLight(
        new THREE.Color("#0ea5e9"),
        0.72,
      );
      sideShade.position.set(2.2, -0.8, 1.35);
      scene.add(sideShade);

      const rimLight = new THREE.PointLight(
        new THREE.Color("#bae6fd"),
        2.4,
        5.4,
      );
      rimLight.position.set(1.6, 0.2, 2.4);
      scene.add(rimLight);

      const coolBackLight = new THREE.PointLight(
        new THREE.Color("#38bdf8"),
        1.35,
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

      const startedAt = performance.now();
      let lastFrameTime = 0;

      const scheduleRender = () => {
        if (frameIdRef.current !== 0) return;
        frameIdRef.current = window.requestAnimationFrame(render);
      };

      const render = (time: number) => {
        frameIdRef.current = 0;

        const frameDeltaSeconds =
          lastFrameTime > 0 ? Math.min(0.048, (time - lastFrameTime) / 1000) : 0.0167;
        lastFrameTime = time;
        const seconds = (time - startedAt) / 1000;
        const isPaused = pausedRef.current;
        if (isPaused) {
          trophy.rotation.x = settleRotation(
            trophy.rotation.x,
            TROPHY_REST_ROTATION.x,
            0.22,
          );
          trophy.rotation.y = settleRotation(
            trophy.rotation.y,
            TROPHY_REST_ROTATION.y,
            0.28,
          );
          trophy.rotation.z = settleRotation(
            trophy.rotation.z,
            TROPHY_REST_ROTATION.z,
            0.24,
          );
        } else {
          trophy.rotation.set(
            Math.sin(seconds * 0.26) * 0.018,
            trophy.rotation.y + frameDeltaSeconds * 0.18,
            Math.sin(seconds * 0.22) * 0.009,
          );
        }

        const restingForward =
          isPaused &&
          Math.abs(getShortestRotationDelta(TROPHY_REST_ROTATION.x - trophy.rotation.x)) < 0.008 &&
          Math.abs(getShortestRotationDelta(TROPHY_REST_ROTATION.y - trophy.rotation.y)) < 0.008 &&
          Math.abs(getShortestRotationDelta(TROPHY_REST_ROTATION.z - trophy.rotation.z)) < 0.008;
        if (restingForward) {
          trophy.rotation.set(
            TROPHY_REST_ROTATION.x,
            TROPHY_REST_ROTATION.y,
            TROPHY_REST_ROTATION.z,
          );
        }

        setDashboardWebGlCanvasActive(canvas, true);
        renderer.render(scene, camera);

        if (!isPaused || !restingForward) {
          scheduleRender();
        }
      };

      renderFrameRef.current = render;
      scheduleRender();

      cleanup = () => {
        if (frameIdRef.current !== 0) {
          window.cancelAnimationFrame(frameIdRef.current);
          frameIdRef.current = 0;
        }
        renderFrameRef.current = null;
        observer.disconnect();
        disposeObject(trophy);
        renderer.forceContextLoss();
        renderer.dispose();
      };
      return;
      }
    };

    startScene();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

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
          "drop-shadow(0 0.16rem 0.24rem rgba(2,6,23,0.52)) drop-shadow(0 0 0.42rem rgba(56,189,248,0.3))",
        height: "100%",
        pointerEvents: "none",
        width: "100%",
      }}
    />
  );
}

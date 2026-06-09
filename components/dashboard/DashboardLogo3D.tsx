"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { BufferGeometry, Material, Object3D, Texture } from "three";
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

const LOGO_REST_ROTATION = {
  x: -0.08,
  y: -0.15,
  z: 0.025,
} as const;
const LOGO_WEBGL_MAX_START_ATTEMPTS = 8;

const settleValue = (current: number, target: number, ease: number) => {
  const delta = target - current;
  if (Math.abs(delta) < 0.0015) return target;
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

const createLogoGroup = (THREE: ThreeModule, texture: Texture) => {
  const logoGroup = new THREE.Group();
  const image = texture.image as HTMLImageElement | undefined;
  const aspect =
    image && image.naturalHeight > 0 ? image.naturalWidth / image.naturalHeight : 1;
  const logoHeight = 2.24;
  const logoWidth = logoHeight * aspect;
  const planeGeometry = new THREE.PlaneGeometry(logoWidth, logoHeight);

  const createLogoPlane = (
    color: string,
    opacity: number,
    z: number,
    x: number,
    y: number,
    scale: number,
  ) => {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      depthWrite: false,
      map: texture,
      opacity,
      transparent: true,
    });
    const mesh = new THREE.Mesh(planeGeometry, material);
    mesh.position.set(x, y, z);
    mesh.renderOrder = Math.round((z + 1) * 100);
    mesh.scale.setScalar(scale);
    return mesh;
  };

  const glow = createLogoPlane("#67e8f9", 0.2, -0.34, 0, 0, 1.09);
  const shadow = createLogoPlane("#020617", 0.5, -0.28, 0.13, -0.12, 1.045);
  const cyanDepth = createLogoPlane("#0891b2", 0.5, -0.14, 0.06, -0.055, 1.02);
  const front = createLogoPlane("#ffffff", 1, 0, 0, 0, 1);

  const glintMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#ffffff"),
    opacity: 0.58,
    transparent: true,
  });
  const glint = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), glintMaterial);
  glint.position.set(-0.36, 0.72, 0.08);
  glint.scale.set(1.6, 0.62, 0.42);
  glint.renderOrder = 120;

  logoGroup.add(glow, shadow, cyanDepth, front, glint);
  logoGroup.rotation.set(-0.08, -0.15, 0.025);
  return logoGroup;
};

export default function DashboardLogo3D({
  className = "",
  heroActive = false,
  paused = false,
  sizeRem,
}: {
  className?: string;
  heroActive?: boolean;
  paused?: boolean;
  sizeRem?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameIdRef = useRef(0);
  const pausedRef = useRef(paused);
  const renderFrameRef = useRef<((time: number) => void) | null>(null);
  const logoSize = sizeRem ?? (heroActive ? 4.75 : 3.65);

  useEffect(() => {
    pausedRef.current = paused;

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
        const renderer = createDashboardWebGlRenderer(THREE, canvas, {
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
          preserveDrawingBuffer: false,
        });
        if (!renderer) {
          if (startAttempt >= LOGO_WEBGL_MAX_START_ATTEMPTS) return;

          await waitForDashboardPriorityWebGlRetry(startAttempt);
          startAttempt += 1;
          continue;
        }

        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.85));
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        let texture: Texture | null = null;

        try {
          texture = await new THREE.TextureLoader().loadAsync(
            "/sound-fitness-logo.png",
          );
        } catch {
          renderer.forceContextLoss();
          renderer.dispose();
          return;
        }

        if (cancelled || !canvasRef.current) {
          texture.dispose();
          renderer.forceContextLoss();
          renderer.dispose();
          return;
        }

        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(
          renderer.capabilities.getMaxAnisotropy(),
          8,
        );

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 18);
        camera.position.set(0, 0, 5.2);
        camera.lookAt(0, 0, 0);

        const logoGroup = createLogoGroup(THREE, texture);
        scene.add(logoGroup);

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
        const renderFrame = (time: number) => {
          frameIdRef.current = 0;
          const seconds = (time - startedAt) / 1000;
          const isPaused = pausedRef.current;
          setDashboardWebGlCanvasActive(canvas, !isPaused);

          if (isPaused) {
            logoGroup.rotation.set(
              settleValue(logoGroup.rotation.x, LOGO_REST_ROTATION.x, 0.18),
              settleValue(logoGroup.rotation.y, LOGO_REST_ROTATION.y, 0.22),
              settleValue(logoGroup.rotation.z, LOGO_REST_ROTATION.z, 0.18),
            );
            logoGroup.position.y = settleValue(logoGroup.position.y, 0, 0.22);
          } else {
            logoGroup.rotation.set(
              LOGO_REST_ROTATION.x + Math.sin(seconds * 0.68) * 0.012,
              LOGO_REST_ROTATION.y + Math.sin(seconds * 0.54) * 0.045,
              LOGO_REST_ROTATION.z + Math.sin(seconds * 0.46) * 0.012,
            );
            logoGroup.position.y = Math.sin(seconds * 0.72) * 0.018;
          }

          renderer.render(scene, camera);

          const restingForward =
            isPaused &&
            logoGroup.rotation.x === LOGO_REST_ROTATION.x &&
            logoGroup.rotation.y === LOGO_REST_ROTATION.y &&
            logoGroup.rotation.z === LOGO_REST_ROTATION.z &&
            logoGroup.position.y === 0;

          if (!isPaused || !restingForward) {
            frameIdRef.current = window.requestAnimationFrame(renderFrame);
          }
        };

        renderFrameRef.current = renderFrame;
        frameIdRef.current = window.requestAnimationFrame(renderFrame);

        cleanup = () => {
          if (frameIdRef.current !== 0) {
            window.cancelAnimationFrame(frameIdRef.current);
            frameIdRef.current = 0;
          }
          renderFrameRef.current = null;
          observer.disconnect();
          disposeObject(logoGroup);
          texture?.dispose();
          renderer.forceContextLoss();
          renderer.dispose();
        };
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
      className={`dashboard-header-logo-3d ${className}`}
      data-logo-hero-active={heroActive ? "true" : "false"}
      data-logo-paused={paused ? "true" : "false"}
      data-logo-renderer="three"
      style={{
        height: `${logoSize}rem`,
        width: `${logoSize}rem`,
      }}
    >
      <span className="dashboard-header-logo-3d__depth dashboard-header-logo-3d__depth--back" />
      <span className="dashboard-header-logo-3d__depth dashboard-header-logo-3d__depth--mid" />
      <Image
        alt=""
        className="dashboard-header-logo-3d__image"
        draggable={false}
        height={96}
        priority={heroActive}
        src="/sound-fitness-logo.png"
        width={96}
      />
      <span className="dashboard-header-logo-3d__sheen" />
      <canvas
        aria-hidden="true"
        className="dashboard-header-logo-3d__webgl"
        data-logo-renderer="three"
        ref={canvasRef}
      />
    </span>
  );
}

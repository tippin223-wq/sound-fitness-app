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
  waitForDashboardWebGlStart,
} from "./dashboardWebGlRenderer";

type ThreeModule = typeof import("three");

type MaterialObject = Object3D & {
  material?: Material | Material[];
};

type GeometryObject = Object3D & {
  geometry?: BufferGeometry;
};

type DashboardBasketball3DDirection = "down" | "left" | "right" | "up";

const createSoundOrbTexture = (THREE: ThreeModule) =>
  new Promise<Texture>((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.height = 256;
    canvas.width = 256;

    const context = canvas.getContext("2d");
    if (!context) {
      resolve(new THREE.Texture());
      return;
    }

    const finishTexture = () => {
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      texture.needsUpdate = true;
      resolve(texture);
    };

    const drawBase = () => {
      const baseGradient = context.createRadialGradient(
        74,
        58,
        10,
        142,
        148,
        202,
      );
      baseGradient.addColorStop(0, "#e0f7ff");
      baseGradient.addColorStop(0.18, "#38bdf8");
      baseGradient.addColorStop(0.52, "#0284c7");
      baseGradient.addColorStop(0.78, "#075985");
      baseGradient.addColorStop(1, "#031525");
      context.fillStyle = baseGradient;
      context.fillRect(0, 0, canvas.width, canvas.height);

      const rimGradient = context.createRadialGradient(
        72,
        54,
        12,
        164,
        178,
        180,
      );
      rimGradient.addColorStop(0, "rgba(255, 255, 255, 0.42)");
      rimGradient.addColorStop(0.32, "rgba(34, 211, 238, 0.18)");
      rimGradient.addColorStop(0.72, "rgba(8, 47, 73, 0.26)");
      rimGradient.addColorStop(1, "rgba(2, 6, 23, 0.42)");
      context.fillStyle = rimGradient;
      context.fillRect(0, 0, canvas.width, canvas.height);
    };

    const drawLogo = (logo: HTMLImageElement) => {
      const logoDrawHeight = 108;
      const logoDrawWidth = 82;
      const logoCenterX = 86;
      const logoCenterY = 128;

      context.save();
      context.fillStyle = "rgba(2, 6, 23, 0.18)";
      context.shadowBlur = 18;
      context.shadowColor = "rgba(34, 211, 238, 0.46)";
      context.beginPath();
      context.arc(logoCenterX, logoCenterY, 58, 0, Math.PI * 2);
      context.fill();
      context.restore();

      context.save();
      context.beginPath();
      context.arc(logoCenterX, logoCenterY, 62, 0, Math.PI * 2);
      context.clip();
      context.globalAlpha = 0.92;
      context.drawImage(
        logo,
        logoCenterX - logoDrawWidth / 2,
        logoCenterY - logoDrawHeight / 2,
        logoDrawWidth,
        logoDrawHeight,
      );
      context.restore();
    };

    drawBase();

    const logo = new Image();
    logo.onload = () => {
      drawLogo(logo);
      finishTexture();
    };
    logo.onerror = finishTexture;
    logo.src = "/sound-fitness-logo.png";
  });

const createSoundOrbGroup = (THREE: ThreeModule, texture: Texture) => {
  const group = new THREE.Group();
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 40),
    new THREE.MeshPhysicalMaterial({
      clearcoat: 0.52,
      clearcoatRoughness: 0.36,
      color: new THREE.Color("#0ea5e9"),
      emissive: new THREE.Color("#082f49"),
      emissiveIntensity: 0.12,
      map: texture,
      metalness: 0.02,
      roughness: 0.5,
    }),
  );

  const sheen = new THREE.Mesh(
    new THREE.SphereGeometry(1.006, 48, 30),
    new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: new THREE.Color("#67e8f9"),
      depthWrite: false,
      opacity: 0.12,
      transparent: true,
    }),
  );

  group.add(sphere, sheen);
  return group;
};

export default function DashboardBasketball3D({
  active = false,
  className = "",
  direction = null,
}: {
  active?: boolean;
  className?: string;
  direction?: DashboardBasketball3DDirection | null;
}) {
  const activeRef = useRef(active);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const directionRef = useRef<DashboardBasketball3DDirection | null>(direction);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

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
      camera.position.set(0, 0.02, 4.15);
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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      scene.add(new THREE.AmbientLight(new THREE.Color("#dff8ff"), 1.2));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
      keyLight.position.set(-1.8, 2.7, 3.4);
      scene.add(keyLight);

      const rimLight = new THREE.PointLight(
        new THREE.Color("#67e8f9"),
        1.8,
        4.8,
      );
      rimLight.position.set(1.6, -0.25, 2.5);
      scene.add(rimLight);

      const warmLight = new THREE.PointLight(
        new THREE.Color("#fbbf24"),
        0.72,
        4.2,
      );
      warmLight.position.set(-1.25, -1.2, 1.4);
      scene.add(warmLight);

      const texture = await createSoundOrbTexture(THREE);
      if (cancelled) {
        texture.dispose();
        return;
      }

      const soundOrb = createSoundOrbGroup(THREE, texture);
      soundOrb.rotation.set(0.18, -0.5, -0.08);
      soundOrb.scale.setScalar(1.18);
      scene.add(soundOrb);

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
      let spinX = 0;
      let spinY = 0;
      let spinZ = 0;
      const render = (time: number) => {
        const seconds = (time - startedAt) / 1000;
        const frameDelta = Math.min(0.05, (time - lastFrameTime) / 1000);
        lastFrameTime = time;

        if (!activeRef.current) {
          spinX = 0;
          spinY = 0;
          spinZ = 0;
        } else {
          const activeDirection = directionRef.current;
          const spinSpeed = activeDirection ? 2.08 : 0.72;

          if (activeDirection === "up") {
            spinX -= frameDelta * spinSpeed;
          } else if (activeDirection === "down") {
            spinX += frameDelta * spinSpeed;
          } else if (activeDirection === "left") {
            spinY -= frameDelta * spinSpeed;
          } else if (activeDirection === "right") {
            spinY += frameDelta * spinSpeed;
          } else {
            spinY += frameDelta * spinSpeed;
            spinZ += Math.sin(seconds * 1.35) * frameDelta * 0.18;
          }
        }

        const activeLift = activeRef.current ? 1 : 0;
        soundOrb.rotation.set(
          0.18 + spinX + Math.sin(seconds * 1.2) * 0.035 * activeLift,
          -0.5 + spinY,
          spinZ + Math.cos(seconds * 0.9) * 0.026 * activeLift,
        );
        soundOrb.scale.setScalar(
          1.16 + Math.sin(seconds * 1.45) * 0.025 * activeLift,
        );
        renderer.render(scene, camera);
        frameId = window.requestAnimationFrame(render);
      };

      frameId = window.requestAnimationFrame(render);

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
        soundOrb.traverse((object) => {
          const objectGeometry = (object as GeometryObject).geometry;
          if (objectGeometry) objectGeometry.dispose();

          const material = (object as MaterialObject).material;
          if (material) {
            if (Array.isArray(material)) {
              material.forEach((item) => item.dispose());
            } else {
              material.dispose();
            }
          }
        });
        texture.dispose();
        renderer.forceContextLoss();
        renderer.dispose();
      };
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
      className={`dashboard-header-scroll-button__basketball-3d ${className}`}
      data-basketball-renderer="three"
      height={96}
      style={{
        display: "block",
        filter:
          "drop-shadow(0 0 0.36rem rgba(34,211,238,0.34)) drop-shadow(0 0.24rem 0.28rem rgba(0,0,0,0.34))",
        height: "calc(100% + 0.26rem)",
        inset: "-0.13rem",
        pointerEvents: "none",
        position: "absolute",
        width: "calc(100% + 0.26rem)",
        zIndex: 7,
      }}
      width={96}
    />
  );
}

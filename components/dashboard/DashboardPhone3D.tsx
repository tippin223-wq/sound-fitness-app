"use client";

import { useEffect, useRef } from "react";
import type { BufferGeometry, Material, Object3D } from "three";
import {
  createDashboardWebGlRenderer,
  loadDashboardThree,
  waitForDashboardWebGlStart,
} from "./dashboardWebGlRenderer";

type ThreeModule = typeof import("three");

type DashboardPhone3DProps = {
  active?: boolean;
  className?: string;
  paused?: boolean;
};

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
  shape.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius,
    y + height,
  );
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  shape.closePath();

  return shape;
};

export default function DashboardPhone3D({
  active = false,
  className = "",
  paused = false,
}: DashboardPhone3DProps) {
  const activeRef = useRef(active);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(paused);

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
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 14);
      camera.position.set(0, 0.02, 4.15);
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

      scene.add(new THREE.AmbientLight(new THREE.Color("#e0f2fe"), 1.12));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
      keyLight.position.set(-1.5, 2.3, 3.3);
      scene.add(keyLight);

      const cyanLight = new THREE.PointLight(new THREE.Color("#22d3ee"), 2.7, 5);
      cyanLight.position.set(-0.8, 0.35, 2.2);
      scene.add(cyanLight);

      const greenLight = new THREE.PointLight(new THREE.Color("#34d399"), 1.9, 4.5);
      greenLight.position.set(1.2, -0.45, 2.5);
      scene.add(greenLight);

      const group = new THREE.Group();
      group.scale.setScalar(0.86);
      group.rotation.set(0.03, -0.16, 0.02);
      scene.add(group);

      const bodyGeometry = new THREE.ExtrudeGeometry(
        createRoundedRectShape(THREE, 0.82, 1.48, 0.15),
        {
          bevelEnabled: true,
          bevelSegments: 9,
          bevelSize: 0.026,
          bevelThickness: 0.04,
          depth: 0.18,
        },
      );
      bodyGeometry.center();

      const bodyMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.82,
        clearcoatRoughness: 0.14,
        color: new THREE.Color("#dbeafe"),
        emissive: new THREE.Color("#0369a1"),
        emissiveIntensity: 0.08,
        metalness: 0.64,
        roughness: 0.18,
      });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      group.add(body);

      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(bodyGeometry, 18),
        new THREE.LineBasicMaterial({
          color: new THREE.Color("#f0f9ff"),
          opacity: 0.44,
          transparent: true,
        }),
      );
      edge.position.z = 0.012;
      group.add(edge);

      const screenGlowMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#22d3ee"),
        depthWrite: false,
        opacity: 0.2,
        transparent: true,
      });
      const screenGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(0.62, 1.02),
        screenGlowMaterial,
      );
      screenGlow.position.set(0, 0.08, 0.13);
      group.add(screenGlow);

      const screenMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color("#02111f"),
        opacity: 0.96,
        transparent: true,
      });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.92), screenMaterial);
      screen.position.set(0, 0.08, 0.145);
      group.add(screen);

      const homeDot = new THREE.Mesh(
        new THREE.CircleGeometry(0.038, 24),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color("#bae6fd"),
          opacity: 0.86,
          transparent: true,
        }),
      );
      homeDot.position.set(0, -0.61, 0.17);
      group.add(homeDot);

      const appElements = [
        { color: "#67e8f9", h: 0.035, phase: 0.1, w: 0.38, x: 0, y: 0.39 },
        { color: "#34d399", h: 0.12, phase: 0.9, w: 0.055, x: -0.16, y: 0.18 },
        { color: "#fef08a", h: 0.2, phase: 1.6, w: 0.055, x: -0.05, y: 0.14 },
        { color: "#22d3ee", h: 0.28, phase: 2.2, w: 0.055, x: 0.06, y: 0.1 },
        { color: "#60a5fa", h: 0.18, phase: 2.9, w: 0.055, x: 0.17, y: 0.15 },
        { color: "#bae6fd", h: 0.035, phase: 3.5, w: 0.34, x: 0.02, y: -0.18 },
        { color: "#67e8f9", h: 0.035, phase: 4.1, w: 0.24, x: -0.03, y: -0.31 },
      ].map(({ color, h, phase, w, x, y }) => {
        const material = new THREE.MeshBasicMaterial({
          color: new THREE.Color(color),
          opacity: 0.74,
          transparent: true,
        });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
        mesh.position.set(x, y, 0.18);
        mesh.userData.baseScaleY = 1;
        mesh.userData.phase = phase;
        group.add(mesh);
        return mesh;
      });

      const scanDot = new THREE.Mesh(
        new THREE.CircleGeometry(0.035, 24),
        new THREE.MeshBasicMaterial({
          blending: THREE.AdditiveBlending,
          color: new THREE.Color("#a7f3d0"),
          opacity: 0.8,
          transparent: true,
        }),
      );
      scanDot.position.set(-0.2, -0.02, 0.19);
      group.add(scanDot);

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
        charge += (targetCharge - charge) * Math.min(1, frameDelta * 0.01);

        group.position.y = Math.sin(seconds * 1.2) * 0.025 * charge;
        group.rotation.x = 0.03 + Math.sin(seconds * 1.1) * 0.025 * charge;
        group.rotation.y = -0.16 + Math.sin(seconds * 0.85) * 0.16 * charge;
        group.rotation.z = 0.02 + Math.sin(seconds * 1.5) * 0.018 * charge;

        bodyMaterial.emissiveIntensity =
          0.08 + charge * (0.12 + Math.sin(seconds * 2.2) * 0.02);
        screenGlowMaterial.opacity =
          0.12 + charge * (0.18 + Math.sin(seconds * 3.4) * 0.04);
        cyanLight.intensity = 2.2 + charge * 1.1;
        greenLight.intensity = 1.4 + charge * 0.8;

        appElements.forEach((element) => {
          const material = element.material as Material & { opacity: number };
          const phase = element.userData.phase as number;
          const pulse = 0.62 + Math.max(0, Math.sin(seconds * 2.8 + phase)) * 0.38;
          material.opacity = 0.32 + charge * pulse * 0.58;
          element.scale.y = 0.82 + charge * (0.12 + pulse * 0.18);
        });

        const scan = (Math.sin(seconds * 1.9) + 1) / 2;
        scanDot.position.x = -0.2 + scan * 0.4;
        scanDot.position.y = -0.04 + Math.sin(seconds * 3.8) * 0.05;
        scanDot.scale.setScalar(0.7 + charge * (0.42 + Math.sin(seconds * 4.5) * 0.12));

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
      data-phone-renderer="three"
      ref={canvasRef}
    />
  );
}

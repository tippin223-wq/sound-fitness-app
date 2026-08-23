"use client";

import { useEffect, useRef } from "react";
import type { BufferGeometry, Material, Object3D } from "three";
import {
  createDashboardWebGlRenderer,
  loadDashboardThree,
  waitForDashboardWebGlStart,
} from "./dashboardWebGlRenderer";

type ThreeModule = typeof import("three");

type DashboardSparkles3DProps = {
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

const createSparkShape = (
  THREE: ThreeModule,
  outerRadius: number,
  innerRadius: number,
) => {
  const shape = new THREE.Shape();
  const points = 8;

  for (let index = 0; index <= points; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (index / points) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    if (index === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }

  shape.closePath();
  return shape;
};

export default function DashboardSparkles3D({
  active = true,
  className = "",
  paused = false,
}: DashboardSparkles3DProps) {
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
      await waitForDashboardWebGlStart({ canvas: canvasRef.current });
      if (cancelled || !canvasRef.current) return;

      const THREE = await loadDashboardThree();
      if (cancelled || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 12);
      camera.position.set(0, 0.02, 4.05);
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
        Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2.15),
      );
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      scene.add(new THREE.AmbientLight(new THREE.Color("#fff7ed"), 1.06));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
      keyLight.position.set(-1.4, 2.2, 3.2);
      scene.add(keyLight);

      const cyanLight = new THREE.PointLight(new THREE.Color("#67e8f9"), 2.4, 4);
      cyanLight.position.set(1.1, 0.35, 2.2);
      scene.add(cyanLight);

      const goldLight = new THREE.PointLight(new THREE.Color("#fde68a"), 2.2, 4);
      goldLight.position.set(-0.9, -0.25, 2.1);
      scene.add(goldLight);

      const group = new THREE.Group();
      group.rotation.set(-0.12, -0.22, 0.04);
      scene.add(group);

      const sparkGeometry = new THREE.ExtrudeGeometry(
        createSparkShape(THREE, 0.58, 0.16),
        {
          bevelEnabled: true,
          bevelSegments: 7,
          bevelSize: 0.022,
          bevelThickness: 0.038,
          depth: 0.13,
        },
      );
      sparkGeometry.center();

      const smallSparkGeometry = new THREE.ExtrudeGeometry(
        createSparkShape(THREE, 0.27, 0.075),
        {
          bevelEnabled: true,
          bevelSegments: 6,
          bevelSize: 0.012,
          bevelThickness: 0.024,
          depth: 0.075,
        },
      );
      smallSparkGeometry.center();

      const goldMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.88,
        clearcoatRoughness: 0.12,
        color: new THREE.Color("#fef08a"),
        emissive: new THREE.Color("#f59e0b"),
        emissiveIntensity: 0.2,
        metalness: 0.62,
        roughness: 0.16,
      });

      const cyanMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.76,
        clearcoatRoughness: 0.14,
        color: new THREE.Color("#a5f3fc"),
        emissive: new THREE.Color("#0891b2"),
        emissiveIntensity: 0.16,
        metalness: 0.54,
        roughness: 0.18,
      });

      const mainSpark = new THREE.Mesh(sparkGeometry, goldMaterial);
      mainSpark.position.set(-0.08, 0.04, 0.05);
      group.add(mainSpark);

      const smallSparkA = new THREE.Mesh(smallSparkGeometry, cyanMaterial);
      smallSparkA.position.set(0.54, 0.48, 0.04);
      smallSparkA.rotation.z = 0.24;
      group.add(smallSparkA);

      const smallSparkB = new THREE.Mesh(smallSparkGeometry.clone(), goldMaterial.clone());
      smallSparkB.position.set(-0.56, -0.46, 0.02);
      smallSparkB.rotation.z = -0.18;
      smallSparkB.scale.setScalar(0.72);
      group.add(smallSparkB);

      const ringGeometry = new THREE.TorusGeometry(0.54, 0.012, 10, 80);
      const ringMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#fde68a"),
        depthWrite: false,
        opacity: 0.14,
        transparent: true,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.z = -0.1;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      const glowMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#fef3c7"),
        depthWrite: false,
        opacity: 0.12,
        transparent: true,
      });
      const glow = new THREE.Mesh(sparkGeometry.clone(), glowMaterial);
      glow.position.copy(mainSpark.position);
      glow.position.z = -0.05;
      glow.scale.setScalar(1.22);
      group.add(glow);

      const dotGeometry = new THREE.SphereGeometry(0.025, 12, 8);
      const dotMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#e0f2fe"),
        depthWrite: false,
        opacity: 0.24,
        transparent: true,
      });

      const dots = [
        [-0.7, 0.28, 0.2, 0],
        [0.68, -0.22, 0.22, 1.2],
        [0.16, -0.66, 0.2, 2.4],
      ].map(([x, y, z, phase]) => {
        const dot = new THREE.Mesh(dotGeometry, dotMaterial.clone());
        dot.position.set(x, y, z);
        dot.userData.phase = phase;
        group.add(dot);
        return dot;
      });

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
      let charge = activeRef.current ? 1 : 0;
      const renderFrame = (time: number) => {
        const frameDelta =
          lastFrameTime > 0 ? Math.min(48, time - lastFrameTime) : 16.67;
        lastFrameTime = time;

        const seconds = time / 1000;
        const targetCharge = activeRef.current && !pausedRef.current ? 1 : 0;
        charge += (targetCharge - charge) * Math.min(1, frameDelta * 0.012);

        const shimmer = 0.5 + Math.sin(seconds * 2.6) * 0.5;
        group.rotation.y = -0.22 + Math.sin(seconds * 0.85) * 0.12 * charge;
        group.rotation.z = 0.04 + Math.sin(seconds * 1.1) * 0.035 * charge;
        group.scale.setScalar(0.82 + shimmer * 0.035 * charge);

        mainSpark.rotation.z = Math.sin(seconds * 1.4) * 0.04 * charge;
        smallSparkA.rotation.z = 0.24 - Math.sin(seconds * 1.9) * 0.08 * charge;
        smallSparkB.rotation.z = -0.18 + Math.sin(seconds * 1.7) * 0.08 * charge;

        goldMaterial.emissiveIntensity = 0.18 + shimmer * 0.34 * charge;
        cyanMaterial.emissiveIntensity = 0.12 + shimmer * 0.28 * charge;
        glowMaterial.opacity = 0.08 + shimmer * 0.2 * charge;
        ringMaterial.opacity = 0.08 + shimmer * 0.16 * charge;
        ring.rotation.z = seconds * 0.22;

        dots.forEach((dot) => {
          const phase = dot.userData.phase as number;
          const pulse = Math.max(0, Math.sin(seconds * 2.9 + phase));
          dot.scale.setScalar(0.72 + pulse * 1.45 * charge);
          const material = dot.material as Material & { opacity: number };
          material.opacity = 0.08 + pulse * 0.48 * charge;
        });

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
      data-dashboard-sparkles-renderer="three"
      ref={canvasRef}
    />
  );
}

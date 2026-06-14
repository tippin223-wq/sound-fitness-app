"use client";

import { useEffect, useRef } from "react";
import type { BufferGeometry, Material, Object3D } from "three";
import {
  createDashboardWebGlRenderer,
  loadDashboardThree,
  waitForDashboardWebGlStart,
} from "./dashboardWebGlRenderer";

type ThreeModule = typeof import("three");

type DashboardWhistle3DProps = {
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

const createWhistleShape = (THREE: ThreeModule) => {
  const shape = new THREE.Shape();

  shape.moveTo(-0.94, -0.3);
  shape.bezierCurveTo(-1.16, -0.24, -1.17, 0.2, -0.92, 0.36);
  shape.bezierCurveTo(-0.64, 0.54, -0.2, 0.47, 0.12, 0.31);
  shape.lineTo(0.9, 0.22);
  shape.lineTo(1.2, 0.08);
  shape.lineTo(1.2, -0.1);
  shape.lineTo(0.94, -0.22);
  shape.lineTo(0.14, -0.19);
  shape.bezierCurveTo(-0.22, -0.43, -0.66, -0.49, -0.94, -0.3);
  shape.closePath();

  return shape;
};

export default function DashboardWhistle3D({
  active = false,
  className = "",
  paused = false,
}: DashboardWhistle3DProps) {
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
      camera.position.set(0, 0.02, 4.2);
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

      scene.add(new THREE.AmbientLight(new THREE.Color("#e0f2fe"), 1.15));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.7);
      keyLight.position.set(-1.8, 2.4, 3.2);
      scene.add(keyLight);

      const cyanLight = new THREE.PointLight(new THREE.Color("#38bdf8"), 2.9, 5);
      cyanLight.position.set(-0.8, 0.5, 2.2);
      scene.add(cyanLight);

      const goldLight = new THREE.PointLight(new THREE.Color("#fde68a"), 1.8, 4.4);
      goldLight.position.set(1.2, 0.2, 2.5);
      scene.add(goldLight);

      const group = new THREE.Group();
      group.scale.setScalar(1.02);
      group.rotation.set(0.02, -0.16, -0.07);
      scene.add(group);

      const whistleGeometry = new THREE.ExtrudeGeometry(createWhistleShape(THREE), {
        bevelEnabled: true,
        bevelSegments: 4,
        bevelSize: 0.026,
        bevelThickness: 0.042,
        depth: 0.28,
      });
      whistleGeometry.center();

      const whistleMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.85,
        clearcoatRoughness: 0.15,
        color: new THREE.Color("#dbeafe"),
        emissive: new THREE.Color("#075985"),
        emissiveIntensity: 0.1,
        metalness: 0.62,
        roughness: 0.18,
      });
      const whistle = new THREE.Mesh(whistleGeometry, whistleMaterial);
      group.add(whistle);

      const glowMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#7dd3fc"),
        depthWrite: false,
        opacity: 0.15,
        transparent: true,
      });
      const glow = new THREE.Mesh(whistleGeometry.clone(), glowMaterial);
      glow.position.z = -0.08;
      glow.scale.set(1.12, 1.12, 1.02);
      group.add(glow);

      const openingMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color("#020617"),
        opacity: 0.88,
        transparent: true,
      });
      const opening = new THREE.Mesh(
        new THREE.CircleGeometry(0.21, 40),
        openingMaterial,
      );
      opening.position.set(-0.41, 0.01, 0.16);
      group.add(opening);

      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.22, 0.025, 12, 48),
        new THREE.MeshPhysicalMaterial({
          clearcoat: 0.82,
          color: new THREE.Color("#bfdbfe"),
          emissive: new THREE.Color("#0ea5e9"),
          emissiveIntensity: 0.12,
          metalness: 0.7,
          roughness: 0.16,
        }),
      );
      rim.position.set(-0.41, 0.01, 0.18);
      group.add(rim);

      const pea = new THREE.Mesh(
        new THREE.SphereGeometry(0.072, 24, 16),
        new THREE.MeshPhysicalMaterial({
          clearcoat: 0.5,
          color: new THREE.Color("#fde68a"),
          emissive: new THREE.Color("#f59e0b"),
          emissiveIntensity: 0.18,
          metalness: 0.28,
          roughness: 0.24,
        }),
      );
      pea.position.set(-0.35, -0.02, 0.2);
      group.add(pea);

      const slot = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.05, 0.024),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color("#082f49"),
          opacity: 0.9,
          transparent: true,
        }),
      );
      slot.position.set(0.58, 0.14, 0.19);
      slot.rotation.z = -0.06;
      group.add(slot);

      const mouthpieceCut = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.07, 0.032),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color("#020617"),
          opacity: 0.64,
          transparent: true,
        }),
      );
      mouthpieceCut.position.set(0.96, -0.02, 0.205);
      mouthpieceCut.rotation.z = -0.03;
      group.add(mouthpieceCut);

      const mouthpieceHighlight = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.022, 0.02),
        new THREE.MeshBasicMaterial({
          blending: THREE.AdditiveBlending,
          color: new THREE.Color("#e0f2fe"),
          opacity: 0.55,
          transparent: true,
        }),
      );
      mouthpieceHighlight.position.set(0.72, 0.23, 0.22);
      mouthpieceHighlight.rotation.z = -0.07;
      group.add(mouthpieceHighlight);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.22, 0.026, 12, 48),
        new THREE.MeshPhysicalMaterial({
          clearcoat: 0.7,
          color: new THREE.Color("#e0f2fe"),
          emissive: new THREE.Color("#38bdf8"),
          emissiveIntensity: 0.16,
          metalness: 0.76,
          roughness: 0.18,
        }),
      );
      ring.position.set(-0.87, 0.39, 0.02);
      ring.rotation.z = -0.08;
      group.add(ring);

      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(whistleGeometry, 10),
        new THREE.LineBasicMaterial({
          color: new THREE.Color("#f0f9ff"),
          opacity: 0.56,
          transparent: true,
        }),
      );
      edge.position.z = 0.015;
      group.add(edge);

      const waveMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#bae6fd"),
        depthWrite: false,
        opacity: 0.18,
        transparent: true,
      });
      const waves = [0.18, 0.3, 0.42].map((height, index) => {
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(0.9, 0.08, 0.08),
          new THREE.Vector3(1.08 + index * 0.07, height, 0.08),
          new THREE.Vector3(1.18 + index * 0.1, -0.02 + index * 0.03, 0.08),
        );
        const wave = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 16, 0.008, 8, false),
          waveMaterial.clone(),
        );
        wave.userData.phase = index * 0.9;
        group.add(wave);
        return wave;
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
      let charge = 0;
      const renderFrame = (time: number) => {
        const frameDelta =
          lastFrameTime > 0 ? Math.min(48, time - lastFrameTime) : 16.67;
        lastFrameTime = time;

        const seconds = time / 1000;
        const targetCharge = activeRef.current && !pausedRef.current ? 1 : 0;
        charge += (targetCharge - charge) * Math.min(1, frameDelta * 0.01);

        group.position.y = Math.sin(seconds * 1.1) * 0.025 * charge;
        group.rotation.x = 0.02 + Math.sin(seconds * 1.35) * 0.04 * charge;
        group.rotation.y = -0.16 + Math.sin(seconds * 0.9) * 0.16 * charge;
        group.rotation.z = -0.07 + Math.sin(seconds * 1.2) * 0.025 * charge;

        whistleMaterial.emissiveIntensity =
          0.08 + charge * (0.16 + Math.sin(seconds * 2.8) * 0.03);
        glowMaterial.opacity = 0.09 + charge * (0.1 + Math.sin(seconds * 2.6) * 0.02);
        cyanLight.intensity = 2.1 + charge * 1.1;
        goldLight.intensity = 1.35 + charge * 0.6;

        pea.position.x = -0.35 + Math.sin(seconds * 3.1) * 0.018 * charge;
        pea.position.y = -0.02 + Math.cos(seconds * 2.8) * 0.012 * charge;

        waves.forEach((wave) => {
          const material = wave.material as Material & { opacity: number };
          const pulse = Math.max(0, Math.sin(seconds * 2.4 + wave.userData.phase));
          material.opacity = 0.05 + charge * (0.1 + pulse * 0.22);
          wave.scale.setScalar(0.88 + charge * (0.08 + pulse * 0.18));
          wave.position.x = pulse * 0.035 * charge;
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
      data-whistle-renderer="three"
      ref={canvasRef}
    />
  );
}

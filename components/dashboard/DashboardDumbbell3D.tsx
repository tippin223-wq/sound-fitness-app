"use client";

import { useEffect, useRef } from "react";
import type { BufferGeometry, Material, Object3D } from "three";
import {
  createDashboardWebGlRenderer,
  loadDashboardThree,
  waitForDashboardWebGlStart,
} from "./dashboardWebGlRenderer";

type DashboardDumbbell3DProps = {
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

export default function DashboardDumbbell3D({
  active = false,
  className = "",
  paused = false,
}: DashboardDumbbell3DProps) {
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
      const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 14);
      camera.position.set(0, 0.04, 4.9);
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

      scene.add(new THREE.AmbientLight(new THREE.Color("#dbeafe"), 1.2));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
      keyLight.position.set(-2.2, 2.7, 3.6);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(new THREE.Color("#7dd3fc"), 2.1);
      rimLight.position.set(2.2, 1.4, 2.8);
      scene.add(rimLight);

      const goldLight = new THREE.PointLight(new THREE.Color("#fde68a"), 1.25, 4.6);
      goldLight.position.set(-1.4, -0.5, 2.2);
      scene.add(goldLight);

      const group = new THREE.Group();
      group.position.set(0.04, -0.02, 0);
      group.rotation.set(-0.18, -0.38, -0.16);
      scene.add(group);

      const steelMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.92,
        clearcoatRoughness: 0.13,
        color: new THREE.Color("#dbeafe"),
        emissive: new THREE.Color("#075985"),
        emissiveIntensity: 0.07,
        metalness: 0.82,
        roughness: 0.15,
      });

      const darkSteelMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.78,
        clearcoatRoughness: 0.18,
        color: new THREE.Color("#64748b"),
        emissive: new THREE.Color("#082f49"),
        emissiveIntensity: 0.05,
        metalness: 0.74,
        roughness: 0.2,
      });

      const gripMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.5,
        color: new THREE.Color("#1e293b"),
        emissive: new THREE.Color("#0e7490"),
        emissiveIntensity: 0.1,
        metalness: 0.58,
        roughness: 0.28,
      });

      const glowMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#67e8f9"),
        depthWrite: false,
        opacity: 0.08,
        transparent: true,
      });

      const makeCylinder = (
        geometry: BufferGeometry,
        material: Material,
        x: number,
        scaleY = 1,
        scaleZ = 1,
      ) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = x;
        mesh.rotation.z = Math.PI / 2;
        mesh.scale.set(1, scaleY, scaleZ);
        group.add(mesh);
        return mesh;
      };

      const barGeometry = new THREE.CylinderGeometry(0.055, 0.055, 2.66, 40, 1);
      const gripGeometry = new THREE.CylinderGeometry(0.09, 0.09, 0.78, 40, 1);
      const collarGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.16, 48, 1);
      const shoulderPlateGeometry = new THREE.CylinderGeometry(
        0.46,
        0.46,
        0.2,
        64,
        1,
      );
      const innerPlateGeometry = new THREE.CylinderGeometry(0.47, 0.47, 0.22, 64, 1);
      const outerPlateGeometry = new THREE.CylinderGeometry(0.52, 0.52, 0.25, 72, 1);
      const endCapGeometry = new THREE.CylinderGeometry(0.31, 0.31, 0.08, 56, 1);

      const bar = makeCylinder(barGeometry, steelMaterial, 0);
      const grip = makeCylinder(gripGeometry, gripMaterial, 0);

      [-0.26, -0.13, 0, 0.13, 0.26].forEach((x) => {
        const ridge = makeCylinder(
          new THREE.CylinderGeometry(0.102, 0.102, 0.018, 32, 1),
          steelMaterial,
          x,
        );
        ridge.scale.set(1, 1, 1);
      });

      [-1, 1].forEach((side) => {
        makeCylinder(collarGeometry, steelMaterial, side * 0.72, 1, 0.96);
        makeCylinder(shoulderPlateGeometry, darkSteelMaterial, side * 0.89, 1, 0.92);
        makeCylinder(innerPlateGeometry, steelMaterial, side * 1.05, 1, 0.88);
        makeCylinder(outerPlateGeometry, darkSteelMaterial, side * 1.24, 1, 0.84);
        makeCylinder(endCapGeometry, steelMaterial, side * 1.42, 1, 0.78);

        const rim = new THREE.Mesh(
          new THREE.TorusGeometry(0.52, 0.018, 12, 72),
          steelMaterial,
        );
        rim.position.x = side * 1.36;
        rim.rotation.y = Math.PI / 2;
        rim.scale.z = 0.76;
        group.add(rim);

        const plateInset = new THREE.Mesh(
          new THREE.TorusGeometry(0.3, 0.012, 10, 56),
          darkSteelMaterial,
        );
        plateInset.position.x = side * 1.43;
        plateInset.rotation.y = Math.PI / 2;
        plateInset.scale.z = 0.76;
        group.add(plateInset);
      });

      const edgeMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color("#f8fafc"),
        opacity: 0.24,
        transparent: true,
      });
      [bar, grip].forEach((mesh) => {
        const edge = new THREE.LineSegments(
          new THREE.EdgesGeometry(mesh.geometry, 20),
          edgeMaterial,
        );
        edge.position.copy(mesh.position);
        edge.rotation.copy(mesh.rotation);
        edge.scale.copy(mesh.scale);
        group.add(edge);
      });

      const glowOrbs = [-1, 1].map((side) => {
        const glow = new THREE.Mesh(
          new THREE.SphereGeometry(0.5, 32, 16),
          glowMaterial,
        );
        glow.position.set(side * 1.12, -0.01, -0.16);
        glow.scale.set(1, 0.7, 0.38);
        group.add(glow);
        return glow;
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
      let charge = active ? 1 : 0.34;

      const renderFrame = (time: number) => {
        const frameDelta =
          lastFrameTime > 0 ? Math.min(48, time - lastFrameTime) : 16.67;
        lastFrameTime = time;

        const seconds = time / 1000;
        const targetCharge = activeRef.current && !pausedRef.current ? 1 : 0.34;
        charge += (targetCharge - charge) * Math.min(1, frameDelta * 0.01);

        const drift = pausedRef.current ? 0 : 1;
        group.rotation.x = -0.18 + Math.sin(seconds * 0.42) * 0.035 * drift;
        group.rotation.y = -0.38 + Math.sin(seconds * 0.36) * 0.065 * drift;
        group.rotation.z = -0.16 + Math.sin(seconds * 0.3) * 0.018 * drift;
        group.scale.setScalar(0.86 + charge * 0.06);

        steelMaterial.emissiveIntensity = 0.06 + charge * 0.08;
        darkSteelMaterial.emissiveIntensity = 0.04 + charge * 0.05;
        gripMaterial.emissiveIntensity = 0.08 + charge * 0.08;
        glowMaterial.opacity = 0.035 + charge * 0.06;
        glowOrbs.forEach((glow, index) => {
          glow.scale.setScalar(0.92 + charge * 0.16);
          glow.scale.y = 0.62 + charge * 0.1;
          glow.scale.z = 0.34 + charge * 0.08;
          glow.position.y = Math.sin(seconds * 0.45 + index) * 0.012 * drift;
        });
        rimLight.intensity = 1.7 + charge * 0.8;

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
  }, [active]);

  return (
    <canvas
      aria-hidden="true"
      className={className}
      data-dashboard-dumbbell-renderer="three"
      ref={canvasRef}
    />
  );
}

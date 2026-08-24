"use client";

import { useMemo, useRef } from "react";
import type { BufferGeometry, Material, Object3D } from "three";
import DashboardWebGlWidget from "./DashboardWebGlWidget";
import type {
  DashboardWidgetBuilder,
  DashboardWidgetInstance,
} from "./dashboardWebGlStage";

type DashboardProfileIcon3DProps = {
  active?: boolean;
  className?: string;
  levelProgress?: number;
  paused?: boolean;
};

type DashboardGearIcon3DProps = {
  active?: boolean;
  className?: string;
  paused?: boolean;
  spinSpeed?: number;
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

const clampNumber = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export default function DashboardProfileIcon3D({
  active = false,
  className = "",
  levelProgress = 0,
  paused = false,
}: DashboardProfileIcon3DProps) {
  const activeRef = useRef(active);
  activeRef.current = active;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const progressRef = useRef(levelProgress);
  progressRef.current = levelProgress;

  const build = useMemo<DashboardWidgetBuilder>(
    () =>
      ({ THREE }): DashboardWidgetInstance => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 14);
      camera.position.set(0, 0.02, 4.6);
      camera.lookAt(0, 0, 0);

      scene.add(new THREE.AmbientLight(new THREE.Color("#dff8ff"), 1.18));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
      keyLight.position.set(-1.4, 2.2, 3.2);
      scene.add(keyLight);

      const cyanLight = new THREE.PointLight(new THREE.Color("#22d3ee"), 2.5, 5);
      cyanLight.position.set(-0.6, 0.35, 2.4);
      scene.add(cyanLight);

      const goldLight = new THREE.PointLight(new THREE.Color("#facc15"), 1.25, 4);
      goldLight.position.set(1.15, -0.85, 2.2);
      scene.add(goldLight);

      const root = new THREE.Group();
      root.position.y = 0.04;
      scene.add(root);

      const glassMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        color: new THREE.Color("#0f172a"),
        emissive: new THREE.Color("#083344"),
        emissiveIntensity: 0.3,
        metalness: 0.16,
        opacity: 0.52,
        roughness: 0.08,
        transparent: true,
      });
      const headMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.86,
        clearcoatRoughness: 0.1,
        color: new THREE.Color("#e0f2fe"),
        emissive: new THREE.Color("#38bdf8"),
        emissiveIntensity: 0.2,
        metalness: 0.18,
        roughness: 0.18,
      });
      const bodyMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.82,
        color: new THREE.Color("#38bdf8"),
        emissive: new THREE.Color("#0284c7"),
        emissiveIntensity: 0.28,
        metalness: 0.28,
        roughness: 0.18,
      });
      const ringMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.9,
        color: new THREE.Color("#67e8f9"),
        emissive: new THREE.Color("#0891b2"),
        emissiveIntensity: 0.34,
        metalness: 0.6,
        roughness: 0.16,
      });
      const progressMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#facc15"),
        depthWrite: false,
        opacity: 0.58,
        transparent: true,
      });
      const auraMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#67e8f9"),
        depthWrite: false,
        opacity: 0.18,
        transparent: true,
      });

      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.94, 56, 28), glassMaterial);
      orb.scale.set(1, 1, 0.28);
      root.add(orb);

      const aura = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 18), auraMaterial);
      aura.scale.set(1.12, 1.12, 0.08);
      aura.position.z = -0.16;
      root.add(aura);

      const outerRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.98, 0.035, 12, 96),
        ringMaterial,
      );
      outerRing.position.z = 0.08;
      root.add(outerRing);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 32, 18), headMaterial);
      head.position.set(0, 0.2, 0.23);
      head.scale.set(1, 1.08, 0.82);
      root.add(head);

      const shoulders = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 36, 18),
        bodyMaterial,
      );
      shoulders.position.set(0, -0.36, 0.2);
      shoulders.scale.set(1.1, 0.52, 0.42);
      root.add(shoulders);

      const tickGeometry = new THREE.BoxGeometry(0.034, 0.14, 0.035);
      const progressTicks = Array.from({ length: 28 }, (_, index) => {
        const tick = new THREE.Mesh(tickGeometry, progressMaterial);
        const angle = (index / 28) * Math.PI * 2;
        tick.position.set(Math.sin(angle) * 0.96, Math.cos(angle) * 0.96, 0.18);
        tick.rotation.z = -angle;
        root.add(tick);
        return tick;
      });

      let charge = 0;
      const update = (elapsed: number, delta: number) => {
        const frameDelta = delta * 1000;
        const seconds = elapsed;
        const activeMotion = activeRef.current && !pausedRef.current;
        charge += ((activeMotion ? 1 : 0) - charge) * Math.min(1, frameDelta * 0.014);
        const progress = clampNumber(progressRef.current / 100, 0.08, 1);

        root.rotation.y = Math.sin(seconds * 0.72) * 0.12 + charge * Math.sin(seconds * 1.35) * 0.18;
        root.rotation.x = -0.05 + Math.sin(seconds * 0.58) * 0.035 * (0.45 + charge);
        root.scale.setScalar(0.94 + charge * 0.08 + Math.sin(seconds * 4.2) * 0.015 * charge);
        aura.scale.setScalar(1.12 + charge * 0.16 + Math.sin(seconds * 3.8) * 0.035 * charge);
        aura.scale.z = 0.08;
        auraMaterial.opacity = 0.12 + charge * (0.2 + Math.sin(seconds * 5.2) * 0.04);
        glassMaterial.emissiveIntensity = 0.26 + charge * 0.26;
        ringMaterial.emissiveIntensity = 0.28 + charge * 0.48;
        head.rotation.y = Math.sin(seconds * 1.4) * 0.12 * charge;
        shoulders.rotation.y = -head.rotation.y * 0.45;

        progressTicks.forEach((tick, index) => {
          const lit = index / progressTicks.length <= progress;
          const pulse = Math.max(0, Math.sin(seconds * 4.6 + index * 0.36));
          tick.visible = lit;
          tick.scale.setScalar(0.78 + charge * 0.22 + pulse * 0.16 * charge);
        });
        progressMaterial.opacity = 0.34 + charge * 0.36;

        cyanLight.intensity = 2.1 + charge * 1.8;
        goldLight.intensity = 0.85 + charge * 1.35;

        // Ambient idle motion (charge-independent sine terms on root rotation)
        // keeps this scene animating even when inactive/paused.
        return true;
      };

      return {
        scene,
        camera,
        update,
        dispose: () => {
          disposeObject(scene);
        },
      };
      },
    [],
  );

  return <DashboardWebGlWidget build={build} className={className} />;
}

export function DashboardGearIcon3D({
  active = false,
  className = "",
  paused = false,
  spinSpeed = 1,
}: DashboardGearIcon3DProps) {
  const activeRef = useRef(active);
  activeRef.current = active;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const spinSpeedRef = useRef(clampNumber(spinSpeed, 0, 2));
  spinSpeedRef.current = clampNumber(spinSpeed, 0, 2);

  const build = useMemo<DashboardWidgetBuilder>(
    () =>
      ({ THREE }): DashboardWidgetInstance => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 14);
      camera.position.set(0, 0.02, 4.4);
      camera.lookAt(0, 0, 0);

      scene.add(new THREE.AmbientLight(new THREE.Color("#e0f2fe"), 1.05));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
      keyLight.position.set(-1.4, 2.2, 3.4);
      scene.add(keyLight);

      const cyanLight = new THREE.PointLight(new THREE.Color("#67e8f9"), 2.3, 4.8);
      cyanLight.position.set(-0.7, 0.2, 2.2);
      scene.add(cyanLight);

      const goldLight = new THREE.PointLight(new THREE.Color("#facc15"), 0.9, 4);
      goldLight.position.set(1.1, -0.6, 2.2);
      scene.add(goldLight);

      const root = new THREE.Group();
      root.rotation.set(0.18, -0.18, 0);
      scene.add(root);

      const gearMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.86,
        clearcoatRoughness: 0.12,
        color: new THREE.Color("#cbd5e1"),
        emissive: new THREE.Color("#164e63"),
        emissiveIntensity: 0.2,
        metalness: 0.66,
        roughness: 0.18,
      });
      const rimMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.92,
        color: new THREE.Color("#67e8f9"),
        emissive: new THREE.Color("#0891b2"),
        emissiveIntensity: 0.28,
        metalness: 0.62,
        roughness: 0.16,
      });
      const glowMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#67e8f9"),
        depthWrite: false,
        opacity: 0.12,
        transparent: true,
      });

      const outerRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.58, 0.11, 16, 72),
        gearMaterial,
      );
      outerRing.position.z = 0.02;
      root.add(outerRing);

      const innerRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.28, 0.045, 12, 56),
        rimMaterial,
      );
      innerRing.position.z = 0.08;
      root.add(innerRing);

      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.19, 0.18, 40),
        gearMaterial,
      );
      hub.rotation.x = Math.PI / 2;
      hub.position.z = 0.07;
      root.add(hub);

      const toothGeometry = new THREE.BoxGeometry(0.16, 0.28, 0.18, 2, 2, 1);
      const teeth = Array.from({ length: 10 }, (_, index) => {
        const tooth = new THREE.Mesh(toothGeometry, gearMaterial);
        const angle = (index / 10) * Math.PI * 2;
        tooth.position.set(Math.sin(angle) * 0.7, Math.cos(angle) * 0.7, 0.02);
        tooth.rotation.z = -angle;
        root.add(tooth);
        return tooth;
      });

      const glow = new THREE.Mesh(new THREE.CircleGeometry(0.92, 56), glowMaterial);
      glow.position.z = -0.1;
      root.add(glow);

      let charge = 0;
      let spin = 0;
      const update = (elapsed: number, delta: number) => {
        const frameDelta = delta * 1000;
        const seconds = elapsed;
        const activeMotion = activeRef.current && !pausedRef.current;
        charge += ((activeMotion ? 1 : 0) - charge) * Math.min(1, frameDelta * 0.016);
        spin += frameDelta * (0.00022 + charge * 0.0034) * spinSpeedRef.current;

        const prevRootRotationZ = root.rotation.z;
        const prevRootRotationX = root.rotation.x;
        const prevRootRotationY = root.rotation.y;
        const prevRootScale = root.scale.x;
        const prevGearEmissive = gearMaterial.emissiveIntensity;
        const prevRimEmissive = rimMaterial.emissiveIntensity;
        const prevGlowOpacity = glowMaterial.opacity;
        const prevCyanIntensity = cyanLight.intensity;
        const prevGoldIntensity = goldLight.intensity;

        root.rotation.z = spin;
        root.rotation.x = 0.18 + Math.sin(seconds * 2.2) * 0.08 * charge;
        root.rotation.y = -0.18 + Math.cos(seconds * 1.8) * 0.1 * charge;
        root.scale.setScalar(0.88 + charge * 0.16 + Math.sin(seconds * 5.4) * 0.025 * charge);
        gearMaterial.emissiveIntensity = 0.16 + charge * 0.38;
        rimMaterial.emissiveIntensity = 0.24 + charge * 0.52;
        glowMaterial.opacity = 0.1 + charge * (0.28 + Math.sin(seconds * 4.8) * 0.04);

        let teethMoving = false;
        teeth.forEach((tooth, index) => {
          const pulse = Math.max(0, Math.sin(seconds * 5.6 + index * 0.7));
          const nextToothScale = 1 + charge * pulse * 0.08;
          if (tooth.scale.x !== nextToothScale) teethMoving = true;
          tooth.scale.setScalar(nextToothScale);
        });

        cyanLight.intensity = 1.8 + charge * 2.4;
        goldLight.intensity = 0.55 + charge * 1.6;

        const stillMoving =
          teethMoving ||
          root.rotation.z !== prevRootRotationZ ||
          root.rotation.x !== prevRootRotationX ||
          root.rotation.y !== prevRootRotationY ||
          root.scale.x !== prevRootScale ||
          gearMaterial.emissiveIntensity !== prevGearEmissive ||
          rimMaterial.emissiveIntensity !== prevRimEmissive ||
          glowMaterial.opacity !== prevGlowOpacity ||
          cyanLight.intensity !== prevCyanIntensity ||
          goldLight.intensity !== prevGoldIntensity;
        return stillMoving;
      };

      return {
        scene,
        camera,
        update,
        dispose: () => {
          disposeObject(scene);
        },
      };
      },
    [],
  );

  return <DashboardWebGlWidget build={build} className={className} />;
}

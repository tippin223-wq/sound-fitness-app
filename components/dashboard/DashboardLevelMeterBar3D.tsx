"use client";

import { useMemo, useRef } from "react";
import type {
  BufferGeometry,
  Material,
  Object3D,
  OrthographicCamera,
} from "three";
import DashboardWebGlWidget from "./DashboardWebGlWidget";
import type {
  DashboardWidgetBuilder,
  DashboardWidgetInstance,
} from "./dashboardWebGlStage";

type ThreeModule = typeof import("three");

type DashboardLevelMeterBar3DProps = {
  active?: boolean;
  className?: string;
  paused?: boolean;
  progress: number;
};

type MaterialObject = Object3D & {
  material?: Material | Material[];
};

type GeometryObject = Object3D & {
  geometry?: BufferGeometry;
};

const RAIL_HEIGHT = 4.86;

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

const clampProgress = (progress: number) =>
  Math.max(0, Math.min(1, progress / 100));

const createHelixGeometry = (
  THREE: ThreeModule,
  radius: number,
  phase: number,
) => {
  const points = [];
  const turns = 8.2;
  const pointCount = 168;

  for (let index = 0; index <= pointCount; index += 1) {
    const ratio = index / pointCount;
    const angle = phase + ratio * Math.PI * 2 * turns;
    points.push(
      new THREE.Vector3(
        Math.cos(angle) * radius,
        -RAIL_HEIGHT / 2 + ratio * RAIL_HEIGHT,
        Math.sin(angle) * radius,
      ),
    );
  }

  return new THREE.BufferGeometry().setFromPoints(points);
};

export default function DashboardLevelMeterBar3D({
  active = false,
  className = "",
  paused = false,
  progress,
}: DashboardLevelMeterBar3DProps) {
  const activeRef = useRef(active);
  activeRef.current = active;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const progressRef = useRef(clampProgress(progress));
  progressRef.current = clampProgress(progress);

  const build = useMemo<DashboardWidgetBuilder>(
    () =>
      ({ THREE }): DashboardWidgetInstance => {
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-0.78, 0.78, 2.95, -2.95, 0.1, 20);
      camera.position.set(0.56, 0.18, 7.4);
      camera.lookAt(0, 0, 0);

      scene.add(new THREE.AmbientLight(new THREE.Color("#dbeafe"), 1.2));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
      keyLight.position.set(-1.8, 3.2, 4.5);
      scene.add(keyLight);

      const cyanLight = new THREE.PointLight(new THREE.Color("#22d3ee"), 3.2, 6.4);
      cyanLight.position.set(0.1, 0.1, 2.6);
      scene.add(cyanLight);

      const goldLight = new THREE.PointLight(new THREE.Color("#facc15"), 1.3, 5.2);
      goldLight.position.set(-0.58, -1.9, 2.8);
      scene.add(goldLight);

      const root = new THREE.Group();
      root.rotation.set(0.04, -0.18, 0.015);
      scene.add(root);

      const glassMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        color: new THREE.Color("#082f49"),
        emissive: new THREE.Color("#0e7490"),
        emissiveIntensity: 0.12,
        metalness: 0.42,
        opacity: 0.34,
        roughness: 0.1,
        side: THREE.DoubleSide,
        transparent: true,
        transmission: 0.15,
      });

      const railSideMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.95,
        clearcoatRoughness: 0.08,
        color: new THREE.Color("#020617"),
        emissive: new THREE.Color("#075985"),
        emissiveIntensity: 0.16,
        metalness: 0.68,
        opacity: 0.72,
        roughness: 0.18,
        transparent: true,
      });

      const fillMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.82,
        clearcoatRoughness: 0.08,
        color: new THREE.Color("#67e8f9"),
        emissive: new THREE.Color("#22d3ee"),
        emissiveIntensity: 0.86,
        metalness: 0.32,
        roughness: 0.12,
      });

      const glowMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#22d3ee"),
        depthWrite: false,
        opacity: 0.22,
        transparent: true,
      });

      const topGlowMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#fef3c7"),
        depthWrite: false,
        opacity: 0.82,
        transparent: true,
      });

      const electricMaterialA = new THREE.LineBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#e0f2fe"),
        depthWrite: false,
        opacity: 0.72,
        transparent: true,
      });

      const electricMaterialB = new THREE.LineBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#facc15"),
        depthWrite: false,
        opacity: 0.48,
        transparent: true,
      });

      const railGroup = new THREE.Group();
      root.add(railGroup);

      const shell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.28, RAIL_HEIGHT, 56, 8, true),
        glassMaterial,
      );
      railGroup.add(shell);

      const rearCore = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.2, RAIL_HEIGHT * 0.98, 42, 1, true),
        railSideMaterial,
      );
      rearCore.position.z = -0.025;
      railGroup.add(rearCore);

      const ringMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.9,
        clearcoatRoughness: 0.08,
        color: new THREE.Color("#bae6fd"),
        emissive: new THREE.Color("#0284c7"),
        emissiveIntensity: 0.35,
        metalness: 0.74,
        roughness: 0.15,
      });

      const topRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 10, 72), ringMaterial);
      topRing.rotation.x = Math.PI / 2;
      topRing.position.y = RAIL_HEIGHT / 2;
      railGroup.add(topRing);

      const bottomRing = topRing.clone();
      bottomRing.position.y = -RAIL_HEIGHT / 2;
      railGroup.add(bottomRing);

      const fill = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.16, RAIL_HEIGHT, 44, 8, false),
        fillMaterial,
      );
      railGroup.add(fill);

      const fillGlow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.32, RAIL_HEIGHT, 44, 1, true),
        glowMaterial,
      );
      railGroup.add(fillGlow);

      const topMarker = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.018, 8, 74), topGlowMaterial);
      topMarker.rotation.x = Math.PI / 2;
      railGroup.add(topMarker);

      const helixGroup = new THREE.Group();
      const helixA = new THREE.Line(createHelixGeometry(THREE, 0.21, 0), electricMaterialA);
      const helixB = new THREE.Line(createHelixGeometry(THREE, 0.18, Math.PI), electricMaterialB);
      helixGroup.add(helixA, helixB);
      railGroup.add(helixGroup);

      const tickMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#bae6fd"),
        depthWrite: false,
        opacity: 0.32,
        transparent: true,
      });

      [0.25, 0.5, 0.75].forEach((tick) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.265, 0.006, 5, 40), tickMaterial);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -RAIL_HEIGHT / 2 + RAIL_HEIGHT * tick;
        railGroup.add(ring);
      });

      const particleGeometry = new THREE.SphereGeometry(0.022, 10, 8);
      const particleMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#e0f2fe"),
        depthWrite: false,
        opacity: 0.74,
        transparent: true,
      });
      const particles = Array.from({ length: 14 }, (_, index) => {
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        railGroup.add(particle);
        return {
          angle: index * 1.77,
          mesh: particle,
          phase: (index * 0.137) % 1,
          radius: 0.17 + (index % 4) * 0.025,
          speed: 0.12 + (index % 5) * 0.025,
        };
      });

      const resize = (cssWidth: number, cssHeight: number) => {
        const aspect = Math.max(1, cssWidth) / Math.max(1, cssHeight);
        const halfHeight = 2.95;
        const halfWidth = Math.max(0.68, halfHeight * aspect);
        camera.left = -halfWidth;
        camera.right = halfWidth;
        camera.top = halfHeight;
        camera.bottom = -halfHeight;
        camera.updateProjectionMatrix();
      };

      let renderedProgress = progressRef.current;
      let charge = activeRef.current && !pausedRef.current ? 1 : 0;

      const update = (elapsed: number, delta: number) => {
        const seconds = elapsed;
        const targetProgress = Math.max(0.015, progressRef.current);
        renderedProgress +=
          (targetProgress - renderedProgress) * Math.min(1, delta * 10);

        charge +=
          ((activeRef.current && !pausedRef.current ? 1 : 0.22) - charge) *
          Math.min(1, delta * 11);

        const activeHeight = RAIL_HEIGHT * renderedProgress;
        const centerY = -RAIL_HEIGHT / 2 + activeHeight / 2;
        const topY = -RAIL_HEIGHT / 2 + activeHeight;

        fill.scale.y = renderedProgress;
        fill.position.y = centerY;
        fillGlow.scale.y = renderedProgress;
        fillGlow.position.y = centerY;
        helixGroup.scale.y = renderedProgress;
        helixGroup.position.y = centerY;
        topMarker.position.y = topY;

        railGroup.rotation.y = -0.06 + Math.sin(seconds * 0.86) * 0.035 * charge;
        railGroup.rotation.z = Math.sin(seconds * 0.64) * 0.012 * charge;
        helixGroup.rotation.y = seconds * (0.78 + renderedProgress * 1.18);
        topMarker.rotation.z = seconds * 1.8;
        fillMaterial.emissiveIntensity = 0.72 + renderedProgress * 0.66 + charge * 0.16;
        glowMaterial.opacity = 0.14 + renderedProgress * 0.24 + charge * 0.06;
        electricMaterialA.opacity = 0.34 + charge * 0.38;
        electricMaterialB.opacity = 0.2 + charge * 0.34;
        cyanLight.intensity = 2.1 + renderedProgress * 2.2 + charge * 0.7;
        goldLight.intensity = 0.7 + renderedProgress * 1.25;

        particles.forEach((particle, index) => {
          const range = Math.max(0.12, activeHeight);
          const travel = (particle.phase + seconds * particle.speed) % 1;
          const angle = particle.angle + seconds * (0.74 + index * 0.018);
          particle.mesh.position.set(
            Math.cos(angle) * particle.radius,
            -RAIL_HEIGHT / 2 + travel * range,
            Math.sin(angle) * particle.radius,
          );
          const pulse = 0.44 + Math.sin(seconds * 2.4 + index) * 0.26;
          particle.mesh.scale.setScalar(0.78 + pulse * 0.28);
        });
      };

      return {
        scene,
        camera,
        update,
        resize,
        dispose: () => {
          disposeObject(scene);
        },
      };
      },
    [],
  );

  return <DashboardWebGlWidget build={build} className={className} />;
}

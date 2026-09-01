"use client";

import { useMemo, useRef } from "react";
import type { BufferGeometry, Material, Object3D } from "three";
import DashboardWebGlWidget from "./DashboardWebGlWidget";
import type {
  DashboardWidgetBuilder,
  DashboardWidgetInstance,
} from "./dashboardWebGlStage";

type ThreeModule = typeof import("three");

type DashboardMeterMenuIcon3DProps = {
  active?: boolean;
  className?: string;
  frameless?: boolean;
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

const getShortestRotationDelta = (delta: number) =>
  Math.atan2(Math.sin(delta), Math.cos(delta));

const settleRotation = (current: number, target: number, ease: number) => {
  const delta = getShortestRotationDelta(target - current);
  if (Math.abs(delta) < 0.003) return target;
  return current + delta * ease;
};

const METER_MENU_ICON_ANIMATION_SPEED = 0.2;

const createRoundedBox = (
  THREE: ThreeModule,
  width: number,
  height: number,
  depth: number,
  material: Material,
) =>
  new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth, 3, 3, 1),
    material,
  );

export default function DashboardMeterMenuIcon3D({
  active = false,
  className = "",
  frameless = false,
  paused = false,
}: DashboardMeterMenuIcon3DProps) {
  const activeRef = useRef(active);
  activeRef.current = active;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const framelessRef = useRef(frameless);
  framelessRef.current = frameless;

  const build = useMemo<DashboardWidgetBuilder>(
    () =>
      ({ THREE }): DashboardWidgetInstance => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 18);
      camera.position.set(0, 0.02, 5.1);
      camera.lookAt(0, 0, 0);

      scene.add(new THREE.AmbientLight(new THREE.Color("#e0f2fe"), 1.18));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.7);
      keyLight.position.set(-1.6, 2.7, 3.6);
      scene.add(keyLight);

      const cyanLight = new THREE.PointLight(new THREE.Color("#22d3ee"), 2.4, 5.6);
      cyanLight.position.set(0, 0.2, 2.8);
      scene.add(cyanLight);

      const warmLight = new THREE.PointLight(new THREE.Color("#facc15"), 0.7, 4.5);
      warmLight.position.set(1.3, -0.8, 2.4);
      scene.add(warmLight);

      const root = new THREE.Group();
      root.scale.setScalar(1);
      scene.add(root);

      const flipGroup = new THREE.Group();
      root.add(flipGroup);

      const frontFaceMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.9,
        clearcoatRoughness: 0.12,
        color: new THREE.Color("#020617"),
        emissive: new THREE.Color("#083344"),
        emissiveIntensity: 0.28,
        metalness: 0.4,
        roughness: 0.18,
      });
      const backFaceMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.86,
        clearcoatRoughness: 0.12,
        color: new THREE.Color("#020617"),
        emissive: new THREE.Color("#082f49"),
        emissiveIntensity: 0.22,
        metalness: 0.34,
        roughness: 0.2,
      });
      const ringMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.95,
        clearcoatRoughness: 0.08,
        color: new THREE.Color("#22d3ee"),
        emissive: new THREE.Color("#0891b2"),
        emissiveIntensity: 0.38,
        metalness: 0.74,
        roughness: 0.16,
      });
      const sideWallMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.8,
        color: new THREE.Color("#061827"),
        emissive: new THREE.Color("#164e63"),
        emissiveIntensity: 0.22,
        metalness: 0.72,
        roughness: 0.22,
      });
      const edgeGeometry = new THREE.CylinderGeometry(
        1.22,
        1.22,
        0.34,
        96,
        1,
        true,
      );
      edgeGeometry.rotateX(Math.PI / 2);
      const edgeWall = new THREE.Mesh(edgeGeometry, sideWallMaterial);
      edgeWall.visible = !frameless;
      flipGroup.add(edgeWall);

      const frontGroup = new THREE.Group();
      frontGroup.position.z = 0.18;
      flipGroup.add(frontGroup);

      const backGroup = new THREE.Group();
      backGroup.position.z = -0.18;
      backGroup.rotation.y = Math.PI;
      flipGroup.add(backGroup);

      const faceGeometry = new THREE.CircleGeometry(1.14, 96);
      const frontFace = new THREE.Mesh(faceGeometry, frontFaceMaterial);
      frontFace.position.z = -0.025;
      frontFace.visible = !frameless;
      frontFace.renderOrder = 1;
      frontGroup.add(frontFace);

      const backFace = new THREE.Mesh(faceGeometry, backFaceMaterial);
      backFace.position.z = -0.025;
      backFace.visible = !frameless;
      backFace.renderOrder = 1;
      backGroup.add(backFace);

      const frontOuterRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.16, 0.06, 14, 96),
        ringMaterial,
      );
      frontOuterRing.position.z = 0.015;
      frontOuterRing.visible = !frameless;
      frontOuterRing.renderOrder = 2;
      frontGroup.add(frontOuterRing);

      const backOuterRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.16, 0.06, 14, 96),
        ringMaterial,
      );
      backOuterRing.position.z = 0.015;
      backOuterRing.visible = !frameless;
      backOuterRing.renderOrder = 2;
      backGroup.add(backOuterRing);

      const innerRingMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#67e8f9"),
        depthWrite: false,
        opacity: 0.2,
        transparent: true,
      });
      const frontInnerRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.84, 0.018, 8, 72),
        innerRingMaterial,
      );
      frontInnerRing.position.z = 0.02;
      frontInnerRing.visible = !frameless;
      frontGroup.add(frontInnerRing);

      const backInnerRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.84, 0.018, 8, 72),
        innerRingMaterial,
      );
      backInnerRing.position.z = 0.02;
      backInnerRing.visible = !frameless;
      backGroup.add(backInnerRing);

      const barMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.78,
        clearcoatRoughness: 0.14,
        color: new THREE.Color("#cffafe"),
        emissive: new THREE.Color("#0891b2"),
        emissiveIntensity: 0.22,
        metalness: 0.42,
        roughness: 0.2,
      });
      const baseMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.5,
        color: new THREE.Color("#67e8f9"),
        emissive: new THREE.Color("#155e75"),
        emissiveIntensity: 0.14,
        metalness: 0.34,
        roughness: 0.28,
      });
      const glowMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#22d3ee"),
        depthWrite: false,
        opacity: 0.12,
        transparent: true,
      });

      const base = createRoundedBox(THREE, 1.22, 0.1, 0.14, baseMaterial);
      base.position.set(0, -0.62, 0.05);
      frontGroup.add(base);

      const barSpecs = [
        { baseHeight: 0.58, phase: 0.2, x: -0.42 },
        { baseHeight: 0.98, phase: 1.7, x: 0 },
        { baseHeight: 0.74, phase: 2.9, x: 0.42 },
      ];
      const bars = barSpecs.map((spec) => {
        const bar = createRoundedBox(
          THREE,
          0.18,
          spec.baseHeight,
          0.2,
          barMaterial,
        );
        bar.position.set(spec.x, -0.6 + spec.baseHeight / 2, 0.08);
        bar.userData.baseHeight = spec.baseHeight;
        bar.userData.phase = spec.phase;
        frontGroup.add(bar);
        return bar;
      });

      const frontGlow = new THREE.Mesh(
        new THREE.CircleGeometry(1.16, 48),
        glowMaterial,
      );
      frontGlow.position.set(0, -0.04, 0);
      frontGlow.scale.set(0.86, 0.64, 1);
      frontGlow.visible = !frameless;
      frontGroup.add(frontGlow);

      const saucerMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.88,
        clearcoatRoughness: 0.1,
        color: new THREE.Color("#94a3b8"),
        emissive: new THREE.Color("#164e63"),
        emissiveIntensity: 0.18,
        metalness: 0.62,
        roughness: 0.18,
      });
      const domeMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.82,
        color: new THREE.Color("#bae6fd"),
        emissive: new THREE.Color("#38bdf8"),
        emissiveIntensity: 0.3,
        metalness: 0.08,
        opacity: 0.8,
        roughness: 0.1,
        transparent: true,
      });
      const beamMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#67e8f9"),
        depthWrite: false,
        opacity: 0.16,
        transparent: true,
      });
      const itemMaterials = [
        "#fef08a",
        "#67e8f9",
        "#34d399",
        "#f472b6",
      ].map(
        (color) =>
          new THREE.MeshPhysicalMaterial({
            clearcoat: 0.5,
            color: new THREE.Color(color),
            emissive: new THREE.Color(color),
            emissiveIntensity: 0.22,
            metalness: 0.18,
            roughness: 0.28,
          }),
      );

      const ufoGroup = new THREE.Group();
      ufoGroup.position.set(0, 0.36, 0.08);
      backGroup.add(ufoGroup);

      if (frameless) {
        frontGroup.scale.setScalar(1.26);
        backGroup.scale.setScalar(1.16);
      }

      const saucer = new THREE.Mesh(
        new THREE.SphereGeometry(0.58, 48, 18),
        saucerMaterial,
      );
      saucer.scale.set(1.32, 0.22, 0.52);
      ufoGroup.add(saucer);

      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 36, 16),
        domeMaterial,
      );
      dome.position.y = 0.18;
      dome.scale.set(1, 0.54, 0.82);
      ufoGroup.add(dome);

      const beam = new THREE.Mesh(
        new THREE.ConeGeometry(0.46, 1.02, 28, 1, true),
        beamMaterial,
      );
      beam.position.set(0, -0.64, 0);
      beam.rotation.x = Math.PI;
      backGroup.add(beam);

      const itemGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15, 2, 2, 2);
      const items = Array.from({ length: 6 }, (_, index) => {
        const item = new THREE.Mesh(
          itemGeometry,
          itemMaterials[index % itemMaterials.length],
        );
        item.userData.phase = index / 6;
        item.userData.x = (index % 3 - 1) * 0.2;
        item.position.set(item.userData.x, 0.02, 0.08);
        backGroup.add(item);
        return item;
      });

      let charge = 0;
      let flipRotation = 0;
      const update = (elapsed: number, delta: number) => {
        const prevCharge = charge;
        const prevFlipRotation = flipRotation;
        const frameDeltaMs = delta * 1000;
        const motionDelta = frameDeltaMs * METER_MENU_ICON_ANIMATION_SPEED;

        const seconds = elapsed * METER_MENU_ICON_ANIMATION_SPEED;
        const activeMotion = activeRef.current && !pausedRef.current;
        charge += ((activeMotion ? 1 : 0) - charge) * Math.min(1, frameDeltaMs * 0.014);
        // Epsilon-snap the ease so `charge === prevCharge` can land: the
        // geometric decay alone never reaches its target exactly, which kept
        // the atRest gate below returning "changed" for tens of seconds of
        // invisible motion after every hover.
        if (!activeMotion && charge < 0.002) {
          charge = 0;
        } else if (activeMotion && charge > 0.998) {
          charge = 1;
        }

        if (activeMotion) {
          flipRotation += motionDelta * 0.0046;
        } else {
          flipRotation = settleRotation(flipRotation, 0, 0.26);
        }

        const restingForward =
          !activeMotion &&
          Math.abs(getShortestRotationDelta(flipRotation)) < 0.01 &&
          charge < 0.025;
        if (restingForward) {
          flipRotation = 0;
        }

        flipGroup.rotation.y = flipRotation;
        flipGroup.rotation.x = Math.sin(seconds * 1.8) * 0.03 * charge;
        const prevRootScale = root.scale.x;
        root.scale.setScalar(
          (framelessRef.current ? 1.1 : 1.08) +
            Math.sin(seconds * 8) * 0.022 * charge,
        );
        ringMaterial.emissiveIntensity =
          0.54 + charge * (0.58 + Math.sin(seconds * 8.6) * 0.12);
        sideWallMaterial.emissiveIntensity = 0.22 + charge * 0.34;
        frontFaceMaterial.emissiveIntensity = 0.28 + charge * 0.26;
        backFaceMaterial.emissiveIntensity = 0.22 + charge * 0.24;
        innerRingMaterial.opacity = 0.24 + charge * 0.24;

        bars.forEach((bar, index) => {
          const baseHeight = bar.userData.baseHeight as number;
          const phase = bar.userData.phase as number;
          const jumble =
            charge *
            (0.68 + Math.max(0, Math.sin(seconds * (7.6 + index) + phase)) * 0.62);
          const height = baseHeight * (1 + (jumble - 0.68) * 0.28);
          bar.scale.y = Math.max(0.45, height / baseHeight);
          bar.position.y =
            -0.6 + (baseHeight * bar.scale.y) / 2 + Math.sin(seconds * 8 + phase) * 0.045 * charge;
          bar.rotation.z = Math.sin(seconds * 6.4 + phase) * 0.07 * charge;
        });

        frontGlow.material.opacity = 0.1 + charge * 0.22;
        barMaterial.emissiveIntensity = 0.18 + charge * 0.52;
        beamMaterial.opacity = 0.06 + charge * (0.22 + Math.sin(seconds * 6.5) * 0.04);
        ufoGroup.rotation.y = Math.sin(seconds * 2.3) * 0.14 * charge;
        ufoGroup.position.y = 0.36 + Math.sin(seconds * 3.2) * 0.05 * charge;

        items.forEach((item, index) => {
          const phase = item.userData.phase as number;
          const cycle = (seconds * 0.95 + phase) % 1;
          const x = (item.userData.x as number) + Math.sin(seconds * 2.4 + index) * 0.08;
          item.position.set(x, 0.08 - cycle * 0.96, 0.1);
          item.rotation.set(
            seconds * (1.1 + index * 0.08),
            seconds * (1.6 + index * 0.1),
            seconds * (1.25 + index * 0.06),
          );
          const opacity = charge * (cycle < 0.86 ? 1 : Math.max(0, 1 - (cycle - 0.86) / 0.14));
          item.scale.setScalar((0.46 + Math.sin(cycle * Math.PI) * 0.54) * Math.max(0.1, opacity));
        });

        cyanLight.intensity = 2.1 + charge * 2.1;
        warmLight.intensity = 0.55 + charge * 1.4;

        // The falling items above tumble on every frame regardless of charge.
        // In frameless mode nothing occludes them, so never report "at rest".
        // WARNING: this makes the frameless variant a PERPETUAL stage
        // animator — while mounted and unpaused it forces a full shared-stage
        // present every frame. No dashboard usage mounts it today; give it a
        // real settle path before wiring it into the stage.
        if (frameless) return true;
        // Framed mode: at rest the items sit behind the opaque front face, so
        // they cannot affect the rendered image. Everything else in this update
        // is a pure function of charge, flipRotation, and the root scale
        // (framelessRef), so the frame changed nothing visible once those are
        // all at their fixed points.
        const atRest =
          !activeMotion &&
          charge === prevCharge &&
          prevFlipRotation === 0 &&
          flipRotation === 0 &&
          root.scale.x === prevRootScale;
        return !atRest;
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

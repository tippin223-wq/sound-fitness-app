"use client";

import { useMemo, useRef } from "react";
import type { BufferGeometry, Material, Object3D } from "three";
import DashboardWebGlWidget from "./DashboardWebGlWidget";
import type {
  DashboardWidgetBuilder,
  DashboardWidgetInstance,
} from "./dashboardWebGlStage";

type DashboardScrollButtonDirection = "down" | "left" | "right" | "up";
type DashboardScrollButtonTone =
  | "amber"
  | "cyan"
  | "emerald"
  | "fuchsia"
  | "sky"
  | "violet";

type DashboardScrollButton3DProps = {
  active?: boolean;
  activeDirection?: DashboardScrollButtonDirection | null;
  className?: string;
  compact?: boolean;
  horizontal?: boolean;
  paused?: boolean;
  showDown?: boolean;
  showUp?: boolean;
  tone?: DashboardScrollButtonTone;
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

const toneColors: Record<
  DashboardScrollButtonTone,
  { accent: string; core: string; soft: string; spark: string }
> = {
  amber: {
    accent: "#fb923c",
    core: "#facc15",
    soft: "#fbbf24",
    spark: "#fef08a",
  },
  cyan: {
    accent: "#7dd3fc",
    core: "#22d3ee",
    soft: "#0ea5e9",
    spark: "#cffafe",
  },
  emerald: {
    accent: "#2dd4bf",
    core: "#34d399",
    soft: "#10b981",
    spark: "#a7f3d0",
  },
  fuchsia: {
    accent: "#f472b6",
    core: "#d946ef",
    soft: "#be185d",
    spark: "#f5d0fe",
  },
  sky: {
    accent: "#22d3ee",
    core: "#38bdf8",
    soft: "#0ea5e9",
    spark: "#bae6fd",
  },
  violet: {
    accent: "#d946ef",
    core: "#a78bfa",
    soft: "#8b5cf6",
    spark: "#ddd6fe",
  },
};

const createArrowShape = (THREE: typeof import("three")) => {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.22);
  shape.lineTo(-0.18, -0.16);
  shape.lineTo(0, -0.08);
  shape.lineTo(0.18, -0.16);
  shape.closePath();
  return shape;
};

export default function DashboardScrollButton3D({
  active = false,
  activeDirection = null,
  className = "",
  compact = false,
  horizontal = false,
  paused = false,
  showDown = true,
  showUp = true,
  tone = "cyan",
}: DashboardScrollButton3DProps) {
  const activeDirectionRef = useRef(activeDirection);
  activeDirectionRef.current = activeDirection;
  const activeRef = useRef(active);
  activeRef.current = active;
  const toneRef = useRef(tone);
  toneRef.current = tone;
  const showUpRef = useRef(showUp);
  showUpRef.current = showUp;
  const showDownRef = useRef(showDown);
  showDownRef.current = showDown;

  const build = useMemo<DashboardWidgetBuilder>(
    () =>
      ({ THREE }): DashboardWidgetInstance => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 16);
      camera.position.set(0, 0.08, compact ? 5.2 : 5);
      camera.lookAt(0, 0, 0);

      scene.add(new THREE.AmbientLight(new THREE.Color("#e0f2fe"), 1.18));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
      keyLight.position.set(-1.8, 2.4, 3.3);
      scene.add(keyLight);

      const accentLight = new THREE.PointLight(new THREE.Color("#22d3ee"), 2.5, 5.4);
      accentLight.position.set(-0.8, 0.5, 2.5);
      scene.add(accentLight);

      const warmLight = new THREE.PointLight(new THREE.Color("#facc15"), 1, 4.5);
      warmLight.position.set(1.1, -0.8, 2.4);
      scene.add(warmLight);

      const root = new THREE.Group();
      root.scale.setScalar(1);
      scene.add(root);

      const fieldMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.9,
        clearcoatRoughness: 0.08,
        color: new THREE.Color("#e0f2fe"),
        emissive: new THREE.Color("#083344"),
        emissiveIntensity: 0.08,
        metalness: 0.04,
        opacity: 0.16,
        roughness: 0.04,
        transparent: true,
      });
      const orbMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        color: new THREE.Color("#e0f2fe"),
        emissive: new THREE.Color("#0891b2"),
        emissiveIntensity: 0.22,
        metalness: 0.02,
        opacity: 0.42,
        roughness: 0.02,
        transparent: true,
      });
      const ringMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        color: new THREE.Color("#cffafe"),
        emissive: new THREE.Color("#0891b2"),
        emissiveIntensity: 0.16,
        metalness: 0.04,
        opacity: 0.34,
        roughness: 0.04,
        transparent: true,
      });
      const coreMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#fef08a"),
        depthWrite: false,
        opacity: 0.46,
        transparent: true,
      });
      const sparkMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#fef08a"),
        depthWrite: false,
        opacity: 0.5,
        transparent: true,
      });
      const arrowMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 1,
        color: new THREE.Color("#e0f2fe"),
        emissive: new THREE.Color("#38bdf8"),
        emissiveIntensity: 0.16,
        metalness: 0.02,
        opacity: 0.68,
        roughness: 0.06,
        transparent: true,
      });
      const bubbleFilmMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#bae6fd"),
        depthWrite: false,
        opacity: 0.16,
        transparent: true,
      });
      const bubbleHighlightMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#ffffff"),
        depthWrite: false,
        opacity: 0.46,
        transparent: true,
      });

      const field = new THREE.Mesh(
        new THREE.CylinderGeometry(1.24, 1.24, 0.12, 80),
        fieldMaterial,
      );
      field.rotation.x = Math.PI / 2;
      field.scale.set(horizontal ? 1.46 : 1.08, horizontal ? 0.62 : 1.08, 1);
      field.position.z = -0.18;
      root.add(field);

      const orbGroup = new THREE.Group();
      root.add(orbGroup);

      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.58, 48, 24), orbMaterial);
      orb.scale.set(compact ? 0.72 : 1, compact ? 0.72 : 1, compact ? 0.72 : 1);
      orbGroup.add(orb);

      const bubbleFilm = new THREE.Mesh(
        new THREE.SphereGeometry(0.62, 48, 24),
        bubbleFilmMaterial,
      );
      bubbleFilm.scale.set(
        compact ? 0.78 : 1.08,
        compact ? 0.78 : 1.08,
        compact ? 0.78 : 1.08,
      );
      orbGroup.add(bubbleFilm);

      const bubbleHighlight = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 20, 10),
        bubbleHighlightMaterial,
      );
      bubbleHighlight.position.set(-0.22, 0.22, 0.44);
      bubbleHighlight.scale.set(1.15, 0.62, 0.18);
      orbGroup.add(bubbleHighlight);

      const longitudeRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.62, 0.012, 8, 72),
        ringMaterial,
      );
      longitudeRing.rotation.y = Math.PI / 2;
      orbGroup.add(longitudeRing);

      const latitudeRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.48, 0.01, 8, 72),
        ringMaterial,
      );
      latitudeRing.rotation.x = Math.PI / 2;
      latitudeRing.scale.y = 0.42;
      orbGroup.add(latitudeRing);

      const diagonalRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.64, 0.008, 8, 72),
        ringMaterial,
      );
      diagonalRing.rotation.set(Math.PI / 2.8, Math.PI / 3.6, 0);
      orbGroup.add(diagonalRing);

      const core = new THREE.Mesh(new THREE.SphereGeometry(0.14, 28, 14), coreMaterial);
      core.position.z = 0.38;
      orbGroup.add(core);

      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 8), sparkMaterial);
      orbGroup.add(spark);

      const arrowGeometry = new THREE.ExtrudeGeometry(createArrowShape(THREE), {
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.012,
        bevelThickness: 0.02,
        depth: 0.08,
      });
      arrowGeometry.center();

      const arrows = {
        down: new THREE.Mesh(arrowGeometry, arrowMaterial),
        left: new THREE.Mesh(arrowGeometry, arrowMaterial),
        right: new THREE.Mesh(arrowGeometry, arrowMaterial),
        up: new THREE.Mesh(arrowGeometry, arrowMaterial),
      };
      arrows.up.position.set(0, compact ? 0.82 : 1.06, 0.2);
      arrows.up.rotation.z = 0;
      arrows.down.position.set(0, compact ? -0.82 : -1.06, 0.2);
      arrows.down.rotation.z = Math.PI;
      arrows.left.position.set(horizontal ? -1.23 : -1.06, 0, 0.2);
      arrows.left.rotation.z = Math.PI / 2;
      arrows.right.position.set(horizontal ? 1.23 : 1.06, 0, 0.2);
      arrows.right.rotation.z = -Math.PI / 2;
      Object.values(arrows).forEach((arrow) => root.add(arrow));
      arrows.up.visible = showUpRef.current && !horizontal;
      arrows.down.visible = showDownRef.current && !horizontal;

      let charge = 0;
      const update = (elapsed: number, delta: number) => {
        const frameDelta = delta * 1000;
        arrows.up.visible = showUpRef.current && !horizontal;
        arrows.down.visible = showDownRef.current && !horizontal;

        const seconds = elapsed;
        const toneColorsForFrame = toneColors[toneRef.current] ?? toneColors.cyan;
        const activeDirectionForFrame = activeDirectionRef.current;
        const activeMotion =
          activeRef.current || Boolean(activeDirectionForFrame);
        charge += ((activeMotion ? 1 : 0) - charge) * Math.min(1, frameDelta * 0.016);

        orbMaterial.color.set(toneColorsForFrame.core);
        orbMaterial.emissive.set(toneColorsForFrame.soft);
        ringMaterial.color.set(toneColorsForFrame.spark);
        ringMaterial.emissive.set(toneColorsForFrame.accent);
        coreMaterial.color.set(toneColorsForFrame.spark);
        sparkMaterial.color.set(toneColorsForFrame.core);
        arrowMaterial.emissive.set(toneColorsForFrame.core);
        accentLight.color.set(toneColorsForFrame.core);
        warmLight.color.set(toneColorsForFrame.spark);

        root.rotation.x = Math.sin(seconds * 0.72) * 0.035 * (1 + charge);
        root.rotation.y = Math.sin(seconds * 0.56) * 0.08 * (0.5 + charge);
        orbGroup.rotation.y += frameDelta * (0.00055 + charge * 0.0024);
        orbGroup.rotation.x = Math.sin(seconds * 1.1) * 0.16 * charge;
        orbGroup.position.x =
          activeDirectionForFrame === "left"
            ? -0.16
            : activeDirectionForFrame === "right"
              ? 0.16
              : 0;
        orbGroup.position.y =
          activeDirectionForFrame === "up"
            ? 0.16
            : activeDirectionForFrame === "down"
              ? -0.16
              : 0;
        orbGroup.scale.setScalar(0.94 + charge * 0.08);

        fieldMaterial.emissiveIntensity = 0.06 + charge * 0.12;
        fieldMaterial.opacity = 0.1 + charge * 0.1;
        orbMaterial.emissiveIntensity = 0.18 + charge * 0.38;
        orbMaterial.opacity = 0.34 + charge * 0.18;
        ringMaterial.emissiveIntensity = 0.12 + charge * 0.34;
        ringMaterial.opacity = 0.22 + charge * 0.24;
        bubbleFilmMaterial.color.set(toneColorsForFrame.accent);
        bubbleFilmMaterial.opacity =
          0.12 + charge * (0.16 + Math.sin(seconds * 2.8) * 0.025);
        bubbleHighlightMaterial.opacity =
          0.38 + charge * (0.16 + Math.sin(seconds * 3.4) * 0.04);
        coreMaterial.opacity = 0.28 + charge * 0.28;
        sparkMaterial.opacity = 0.32 + charge * 0.34;

        longitudeRing.rotation.z = seconds * (0.42 + charge * 1.1);
        latitudeRing.rotation.z = -seconds * (0.38 + charge * 0.85);
        diagonalRing.rotation.z = seconds * (0.24 + charge * 0.75);
        spark.position.set(
          Math.sin(seconds * 2.4) * (0.28 + charge * 0.16),
          Math.cos(seconds * 2.1) * (0.22 + charge * 0.1),
          0.42,
        );

        Object.entries(arrows).forEach(([direction, arrow]) => {
          const highlighted = activeDirectionForFrame === direction;
          const pulse = highlighted ? 1 + Math.sin(seconds * 8) * 0.08 : 1;
          arrowMaterial.emissiveIntensity = 0.22 + charge * 0.42;
          arrow.scale.setScalar((highlighted ? 1.32 : 1) * pulse);
        });

        accentLight.intensity = 1.9 + charge * 2.2;
        warmLight.intensity = 0.7 + charge * 1.6;
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
    // compact/horizontal are fixed per instance; showUp/showDown are read live.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <>
      <span
        aria-hidden="true"
        className="dashboard-header-scroll-button__bubble-fallback"
        data-active={active || Boolean(activeDirection) ? "true" : "false"}
        data-compact={compact ? "true" : "false"}
        data-direction={activeDirection ?? "idle"}
        data-horizontal={horizontal ? "true" : "false"}
        data-paused={paused && !active && !activeDirection ? "true" : "false"}
      />
      <DashboardWebGlWidget build={build} className={className} />
    </>
  );
}

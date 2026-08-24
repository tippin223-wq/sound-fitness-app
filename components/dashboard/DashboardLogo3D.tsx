"use client";

import Image from "next/image";
import { useMemo, useRef } from "react";
import type {
  BufferGeometry,
  Material,
  Object3D,
  Texture,
} from "three";
import DashboardWebGlWidget from "./DashboardWebGlWidget";
import type {
  DashboardWidgetBuilder,
  DashboardWidgetInstance,
} from "./dashboardWebGlStage";

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
  domOnly = false,
  heroActive = false,
  paused = false,
  sizeRem,
}: {
  className?: string;
  /** Skip the shared-canvas layer and render only the DOM art. Use when the
      crest sits inside a CSS-animated container: the canvas redraws on the
      main thread and visibly lags compositor-driven transitions. */
  domOnly?: boolean;
  heroActive?: boolean;
  paused?: boolean;
  sizeRem?: number;
}) {
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const logoSize = sizeRem ?? (heroActive ? 4 : 3.65);

  // Drawn on the shared WebGL stage into this widget's anchor rectangle. The
  // crest texture loads async, so the group is added to the scene once it's
  // ready; the animation loop simply no-ops until then.
  const build = useMemo<DashboardWidgetBuilder>(
    () =>
      ({ THREE }): DashboardWidgetInstance => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 18);
        camera.position.set(0, 0, 5.2);
        camera.lookAt(0, 0, 0);

        // Build the crest materials synchronously with a placeholder texture so
        // the shared stage can capture and dim them immediately. Previously the
        // whole group was added only after the image loaded, which let the crest
        // arrive after the header's inactive-material pass and remain bright.
        const texture = new THREE.Texture();
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 8;
        const logoGroup = createLogoGroup(THREE, texture);
        scene.add(logoGroup);

        new THREE.TextureLoader().load("/sound-fitness-logo.png", (loaded) => {
          texture.copy(loaded);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = 8;
          texture.needsUpdate = true;
          loaded.dispose();
        });

        return {
          scene,
          camera,
          update: (elapsed) => {
            if (pausedRef.current) {
              const nextRotationX = settleValue(
                logoGroup.rotation.x,
                LOGO_REST_ROTATION.x,
                0.18,
              );
              const nextRotationY = settleValue(
                logoGroup.rotation.y,
                LOGO_REST_ROTATION.y,
                0.22,
              );
              const nextRotationZ = settleValue(
                logoGroup.rotation.z,
                LOGO_REST_ROTATION.z,
                0.18,
              );
              const nextPositionY = settleValue(logoGroup.position.y, 0, 0.22);
              const stillMoving =
                nextRotationX !== logoGroup.rotation.x ||
                nextRotationY !== logoGroup.rotation.y ||
                nextRotationZ !== logoGroup.rotation.z ||
                nextPositionY !== logoGroup.position.y;
              logoGroup.rotation.set(nextRotationX, nextRotationY, nextRotationZ);
              logoGroup.position.y = nextPositionY;
              return stillMoving;
            }
            logoGroup.rotation.set(
              LOGO_REST_ROTATION.x + Math.sin(elapsed * 0.68) * 0.012,
              LOGO_REST_ROTATION.y + Math.sin(elapsed * 0.54) * 0.045,
              LOGO_REST_ROTATION.z + Math.sin(elapsed * 0.46) * 0.012,
            );
            logoGroup.position.y = Math.sin(elapsed * 0.72) * 0.018;
            return true;
          },
          dispose: () => {
            disposeObject(logoGroup);
            texture.dispose();
          },
        };
      },
    [],
  );

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
      {domOnly ? null : (
        <DashboardWebGlWidget
          build={build}
          className="dashboard-header-logo-3d__webgl"
        />
      )}
    </span>
  );
}

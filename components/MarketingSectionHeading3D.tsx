"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BufferGeometry, Material, Object3D } from "three";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";
import {
  createDashboardWebGlRenderer,
  loadDashboardThree,
  setDashboardWebGlCanvasActive,
  waitForDashboardWebGlStart,
} from "./dashboard/dashboardWebGlRenderer";

type ThreeModule = typeof import("three");

type TextGeometryCtor = new (
  text: string,
  parameters: {
    bevelEnabled?: boolean;
    bevelSegments?: number;
    bevelSize?: number;
    bevelThickness?: number;
    curveSegments?: number;
    depth?: number;
    font: Font;
    size?: number;
  },
) => BufferGeometry;

type MarketingSectionHeading3DProps = {
  className?: string;
  deferMs?: number;
  effects?: "full" | "starfield";
  label: string;
  density?: "normal" | "tight";
  letterMotion?: "none" | "pivot";
  lines: string[];
  live?: boolean;
  scale?: "section" | "hero" | "eyebrow";
  variant?: "cyan" | "ice";
  weight?: "normal" | "heavy";
};

type MarketingHeadingScale = NonNullable<MarketingSectionHeading3DProps["scale"]>;

type HeadingPresentation = {
  bevelSegments: number;
  bevelSizeFactor: number;
  bevelThicknessFactor: number;
  cameraFitPadding: number;
  cameraFov: number;
  depth: number;
  lineGapMultiplier: number;
  minCameraZ: number;
  rootRotation: [number, number, number];
  size: number;
  sparkHeight: number;
  sparkOpacity: number;
  sparkSize: number;
  sparkWidth: number;
  targetHeight: number;
  targetWidth: number;
  titleRim: boolean;
};

type MaterialObject = Object3D & {
  material?: Material | Material[];
};

type GeometryObject = Object3D & {
  geometry?: BufferGeometry;
};

type HeadingLineObject = {
  letters: Object3D[];
  object: Object3D;
  width: number;
};

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

const centerGeometry = (geometry: BufferGeometry) => {
  geometry.computeBoundingBox();
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
};

const getHeadingPresentation = (
  scale: MarketingHeadingScale,
  lineCount: number,
  density: NonNullable<MarketingSectionHeading3DProps["density"]> = "normal",
  weight: NonNullable<MarketingSectionHeading3DProps["weight"]> = "normal",
): HeadingPresentation => {
  const isTight = density === "tight";
  const isHeavy = weight === "heavy";
  const isMultiLineHero = scale === "hero" && lineCount > 2;

  if (scale === "hero") {
    return {
      bevelSegments: 5,
      bevelSizeFactor: isHeavy ? 0.026 : 0.022,
      bevelThicknessFactor: isHeavy ? 0.056 : 0.044,
      cameraFitPadding: isMultiLineHero ? 0.82 : isTight ? 0.88 : 0.84,
      cameraFov: 31,
      depth: isHeavy ? 0.32 : 0.26,
      lineGapMultiplier: isMultiLineHero ? (isTight ? 1.14 : 1.22) : isTight ? 0.94 : 1.04,
      minCameraZ: 3.9,
      rootRotation: [-0.07, 0.24, -0.014],
      size: isMultiLineHero ? (isHeavy ? 0.54 : 0.58) : 0.76,
      sparkHeight: 2.35,
      sparkOpacity: 0.58,
      sparkSize: 0.034,
      sparkWidth: 7.4,
      targetHeight: isMultiLineHero ? (isTight ? 2.38 : 2.56) : 1.46,
      targetWidth: 7.2,
      titleRim: true,
    };
  }

  if (scale === "eyebrow") {
    return {
      bevelSegments: 3,
      bevelSizeFactor: 0.02,
      bevelThicknessFactor: 0.038,
      cameraFitPadding: 0.82,
      cameraFov: 29,
      depth: 0.1,
      lineGapMultiplier: 1.05,
      minCameraZ: 1.75,
      rootRotation: [-0.04, 0.16, -0.01],
      size: 0.32,
      sparkHeight: 0.74,
      sparkOpacity: 0.46,
      sparkSize: 0.016,
      sparkWidth: 4.2,
      targetHeight: 0.62,
      targetWidth: 4.25,
      titleRim: false,
    };
  }

  return {
    bevelSegments: 4,
    bevelSizeFactor: 0.018,
    bevelThicknessFactor: 0.028,
    cameraFitPadding: 0.86,
    cameraFov: 32,
    depth: 0.12,
    lineGapMultiplier: 1.04,
    minCameraZ: 5.6,
    rootRotation: [-0.06, 0.18, -0.012],
    size: lineCount > 2 ? 0.5 : 0.58,
    sparkHeight: 1.55,
    sparkOpacity: 0.5,
    sparkSize: 0.026,
    sparkWidth: 5.4,
    targetHeight: lineCount > 2 ? 1.82 : 1.06,
    targetWidth: 4.85,
    titleRim: false,
  };
};

const createSectionSparkField = (
  THREE: ThreeModule,
  variant: "cyan" | "ice",
  presentation: HeadingPresentation,
) => {
  const particleCount = presentation.titleRim ? 154 : presentation.targetHeight < 1 ? 58 : 96;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const cyan = new THREE.Color("#38bdf8");
  const blue = new THREE.Color("#2563eb");
  const amber = new THREE.Color("#f59e0b");
  const white = new THREE.Color("#f8fafc");

  for (let index = 0; index < particleCount; index += 1) {
    const band = index % 5;
    const color =
      variant === "ice"
        ? band === 0
          ? white
          : band === 1
            ? amber
            : cyan
        : band === 0
          ? amber
          : band === 1
            ? blue
            : cyan;

    positions[index * 3] =
      -presentation.sparkWidth / 2 +
      ((index * 37) % Math.max(1, Math.round(presentation.sparkWidth * 100))) /
        100;
    positions[index * 3 + 1] =
      -presentation.sparkHeight / 2 +
      ((index * 19) % Math.max(1, Math.round(presentation.sparkHeight * 100))) /
        100 +
      (band === 0 ? presentation.sparkHeight * 0.18 : band === 1 ? -presentation.sparkHeight * 0.12 : 0);
    positions[index * 3 + 2] = -0.65 + ((index * 17) % 130) / 100;
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: presentation.sparkOpacity,
    size: presentation.sparkSize,
    transparent: true,
    vertexColors: true,
  });

  return new THREE.Points(geometry, material);
};

const createLineMesh = ({
  THREE,
  TextGeometry,
  depth,
  faceMaterial,
  font,
  line,
  presentation,
  sideMaterial,
  size,
}: {
  THREE: ThreeModule;
  TextGeometry: TextGeometryCtor;
  depth: number;
  faceMaterial: Material;
  font: Font;
  line: string;
  presentation: HeadingPresentation;
  sideMaterial: Material;
  size: number;
}) => {
  const geometry = centerGeometry(
    new TextGeometry(line.toUpperCase(), {
      bevelEnabled: true,
      bevelSegments: presentation.bevelSegments,
      bevelSize: size * presentation.bevelSizeFactor,
      bevelThickness: size * presentation.bevelThicknessFactor,
      curveSegments: presentation.titleRim ? 10 : 8,
      depth,
      font,
      size,
    }),
  );

  geometry.computeBoundingBox();
  const width =
    (geometry.boundingBox?.max.x ?? 0) - (geometry.boundingBox?.min.x ?? 0);
  const mesh = new THREE.Mesh(geometry, [faceMaterial, sideMaterial]);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return { mesh, width };
};

const createWholeLineObject = (
  options: Parameters<typeof createLineMesh>[0],
): HeadingLineObject => {
  const { mesh, width } = createLineMesh(options);
  return {
    letters: [],
    object: mesh,
    width,
  };
};

const createLetterLineObject = (
  options: Parameters<typeof createLineMesh>[0],
): HeadingLineObject => {
  const { THREE, line, size } = options;
  const group = new THREE.Group();
  const letters: Object3D[] = [];
  const tracking = size * 0.028;
  const spaceWidth = size * 0.44;
  let cursor = 0;

  line.toUpperCase().split("").forEach((character) => {
    if (character.trim().length === 0) {
      cursor += spaceWidth;
      return;
    }

    const { mesh, width } = createLineMesh({
      ...options,
      line: character,
    });

    mesh.position.x = cursor + width / 2;
    mesh.userData.marketingHeadingLetter = true;
    group.add(mesh);
    letters.push(mesh);
    cursor += width + tracking;
  });

  const width = Math.max(cursor - tracking, 0.01);
  group.children.forEach((child) => {
    child.position.x -= width / 2;
  });

  return {
    letters,
    object: group,
    width,
  };
};

const createHeadingGroup = async (
  THREE: ThreeModule,
  lines: string[],
  scale: MarketingHeadingScale,
  variant: "cyan" | "ice",
  letterMotion: NonNullable<MarketingSectionHeading3DProps["letterMotion"]>,
  density: NonNullable<MarketingSectionHeading3DProps["density"]>,
  weight: NonNullable<MarketingSectionHeading3DProps["weight"]>,
) => {
  const [
    { TextGeometry },
    { FontLoader },
    fontModule,
  ] = await Promise.all([
    import("three/examples/jsm/geometries/TextGeometry.js"),
    import("three/examples/jsm/loaders/FontLoader.js"),
    import("three/examples/fonts/helvetiker_bold.typeface.json"),
  ]);

  const font = new FontLoader().parse(
    "default" in fontModule ? fontModule.default : fontModule,
  );
  const presentation = getHeadingPresentation(scale, lines.length, density, weight);
  const warmHeroRim = presentation.titleRim && variant === "ice";
  const heavyHero = weight === "heavy" && presentation.titleRim;

  const faceMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: presentation.titleRim ? 0.94 : 0.86,
    clearcoatRoughness: 0.1,
    color: new THREE.Color(
      warmHeroRim ? "#f7fbff" : variant === "ice" ? "#f8fbff" : "#dff7ff",
    ),
    emissive: new THREE.Color(
      warmHeroRim
        ? "#dff7ff"
        : presentation.titleRim
          ? "#bae6fd"
          : variant === "ice"
            ? "#38bdf8"
            : "#0ea5e9",
    ),
    emissiveIntensity: warmHeroRim
      ? 0.42
      : presentation.titleRim
        ? 0.34
        : variant === "ice"
          ? 0.22
          : 0.3,
    metalness: presentation.titleRim ? 0.62 : 0.42,
    roughness: presentation.titleRim ? 0.12 : 0.16,
  });

  const sideMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: presentation.titleRim ? 0.74 : 0.64,
    clearcoatRoughness: 0.18,
    color: new THREE.Color(
      warmHeroRim
        ? "#082f49"
        : presentation.titleRim
          ? "#0f2f76"
          : variant === "ice"
            ? "#0f3a57"
            : "#075985",
    ),
    emissive: new THREE.Color(
      warmHeroRim ? "#0c4a6e" : presentation.titleRim ? "#0e7490" : "#082f49",
    ),
    emissiveIntensity: warmHeroRim ? 0.32 : presentation.titleRim ? 0.28 : 0.2,
    metalness: presentation.titleRim ? 0.86 : 0.78,
    roughness: presentation.titleRim ? 0.18 : 0.22,
  });

  const rimMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: warmHeroRim ? 0.9 : 0.78,
    clearcoatRoughness: warmHeroRim ? 0.08 : 0.12,
    color: new THREE.Color(warmHeroRim ? "#fb923c" : "#f97316"),
    emissive: new THREE.Color(warmHeroRim ? "#f97316" : "#f59e0b"),
    emissiveIntensity: warmHeroRim ? 0.58 : 0.35,
    metalness: warmHeroRim ? 0.76 : 0.62,
    roughness: warmHeroRim ? 0.12 : 0.18,
  });

  const rimSideMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: warmHeroRim ? 0.68 : 0.58,
    clearcoatRoughness: 0.2,
    color: new THREE.Color(warmHeroRim ? "#9a3412" : "#7c2d12"),
    emissive: new THREE.Color(warmHeroRim ? "#ea580c" : "#7c2d12"),
    emissiveIntensity: warmHeroRim ? 0.34 : 0.22,
    metalness: warmHeroRim ? 0.78 : 0.68,
    roughness: warmHeroRim ? 0.2 : 0.24,
  });

  const glowMaterial = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: new THREE.Color(warmHeroRim ? "#f97316" : "#38bdf8"),
    depthWrite: false,
    opacity: warmHeroRim ? 0.24 : presentation.titleRim ? 0.18 : 0,
    transparent: true,
  });

  const textGroup = new THREE.Group();
  const size = presentation.size;
  const depth = presentation.depth;
  const lineGap = size * presentation.lineGapMultiplier;
  const useLetterPivot = letterMotion === "pivot" && presentation.titleRim;

  const lineMeshes = lines.map((line) =>
    (useLetterPivot ? createLetterLineObject : createWholeLineObject)({
      THREE,
      TextGeometry,
      depth,
      faceMaterial,
      font,
      line,
      presentation,
      sideMaterial,
      size,
    }),
  );
  const maxWidth = Math.max(...lineMeshes.map(({ width }) => width), 1);
  const letterMeshes = lineMeshes.flatMap(({ letters }) => letters);

  if (presentation.titleRim) {
    const glowMeshes = lines.map((line) =>
      createLineMesh({
        THREE,
        TextGeometry,
        depth: 0.08,
        faceMaterial: glowMaterial,
        font,
        line,
        presentation,
        sideMaterial: glowMaterial,
        size,
      }),
    );

    glowMeshes.forEach(({ mesh, width }, index) => {
      mesh.position.x = -maxWidth / 2 + width / 2;
      mesh.position.y = -index * lineGap;
      mesh.position.z = -0.18;
      mesh.scale.x *= heavyHero ? 1.062 : 1.045;
      mesh.scale.y = heavyHero ? 1.105 : 1.08;
      textGroup.add(mesh);
    });

    const rimMeshes = lines.map((line) =>
      createLineMesh({
        THREE,
        TextGeometry,
        depth: depth * 0.86,
        faceMaterial: rimMaterial,
        font,
        line,
        presentation,
        sideMaterial: rimSideMaterial,
        size,
      }),
    );

    rimMeshes.forEach(({ mesh, width }, index) => {
      mesh.position.x = -maxWidth / 2 + width / 2;
      mesh.position.y =
        -index * lineGap - size * (warmHeroRim ? 0.04 : 0.026);
      mesh.position.z = warmHeroRim ? -0.1 : -0.08;
      mesh.scale.x *= heavyHero ? 1.058 : warmHeroRim ? 1.036 : 1.018;
      mesh.scale.y = heavyHero ? 1.092 : warmHeroRim ? 1.06 : 1.034;
      textGroup.add(mesh);
    });
  }

  lineMeshes.forEach(({ object, width }, index) => {
    object.position.x = -maxWidth / 2 + width / 2;
    object.position.y = -index * lineGap;
    textGroup.add(object);
  });

  const root = new THREE.Group();
  root.add(textGroup);

  const box = new THREE.Box3().setFromObject(textGroup);
  const center = new THREE.Vector3();
  const sizeVector = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(sizeVector);
  textGroup.position.sub(center);

  const textScale = Math.min(
    presentation.targetWidth / sizeVector.x,
    presentation.targetHeight / sizeVector.y,
  );
  textGroup.scale.setScalar(textScale * (useLetterPivot ? 1.02 : 1));

  const sparks = createSectionSparkField(THREE, variant, presentation);
  sparks.position.set(0, 0, -0.36);
  root.add(sparks);

  root.rotation.set(...presentation.rootRotation);

  return {
    faceMaterial,
    glowMaterial,
    letterMeshes,
    presentation,
    rimMaterial,
    root,
    sideMaterial,
    sparks,
  };
};

export default function MarketingSectionHeading3D({
  className = "",
  density = "normal",
  deferMs = 0,
  effects = "full",
  label,
  letterMotion = "none",
  lines,
  live = true,
  scale = "section",
  variant = "cyan",
  weight = "normal",
}: MarketingSectionHeading3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [webglReady, setWebglReady] = useState(false);
  const snapshotKey = useMemo(
    () =>
      `marketing-section-heading:${scale}:${effects}:${letterMotion}:${density}:${weight}:${label}`,
    [density, effects, label, letterMotion, scale, weight],
  );

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    let startTimeoutId: number | null = null;

    const startScene = async () => {
      await waitForDashboardWebGlStart();
      if (cancelled || !canvasRef.current) return;

      const THREE = await loadDashboardThree();
      if (cancelled || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const renderer = createDashboardWebGlRenderer(THREE, canvas, {
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      });
      if (!renderer) return;

      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(
        Math.min(Math.max(window.devicePixelRatio || 1, 1.45), 2),
      );
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      const presentation = getHeadingPresentation(
        scale,
        lines.length,
        density,
        weight,
      );
      const camera = new THREE.PerspectiveCamera(
        presentation.cameraFov,
        2.42,
        0.1,
        14,
      );
      camera.position.set(0, 0.02, 5.6);
      camera.lookAt(0, 0, 0);

      scene.add(
        new THREE.AmbientLight(
          new THREE.Color("#dff7ff"),
          scale === "hero" ? 1.25 : 1.1,
        ),
      );

      const keyLight = new THREE.DirectionalLight(0xffffff, scale === "hero" ? 4.15 : 3.3);
      keyLight.position.set(-1.8, 2.5, 3.4);
      scene.add(keyLight);

      const cyanLight = new THREE.PointLight(
        new THREE.Color("#38bdf8"),
        scale === "hero" ? 4 : 3,
        5.5,
      );
      cyanLight.position.set(-1.6, 0.45, 2.2);
      scene.add(cyanLight);

      const amberLight = new THREE.PointLight(
        new THREE.Color("#f59e0b"),
        scale === "hero" ? 2.25 : 1.65,
        5,
      );
      amberLight.position.set(1.7, 0.85, 2.8);
      scene.add(amberLight);

      const {
        faceMaterial,
        glowMaterial,
        letterMeshes,
        presentation: headingPresentation,
        rimMaterial,
        root,
        sideMaterial,
        sparks,
      } = await createHeadingGroup(
        THREE,
        lines,
        scale,
        variant,
        letterMotion,
        density,
        weight,
      );

      if (cancelled || !canvasRef.current) {
        disposeObject(root);
        renderer.forceContextLoss();
        renderer.dispose();
        return;
      }

      scene.add(root);

      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(1, Math.floor(rect.width));
        const height = Math.max(1, Math.floor(rect.height));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        const fovRadians = THREE.MathUtils.degToRad(camera.fov);
        const tangent = Math.tan(fovRadians / 2);
        const widthDistance =
          headingPresentation.targetWidth /
          (2 * tangent * camera.aspect * headingPresentation.cameraFitPadding);
        const heightDistance =
          headingPresentation.targetHeight /
          (2 * tangent * headingPresentation.cameraFitPadding);
        camera.position.z = Math.max(
          headingPresentation.minCameraZ,
          widthDistance,
          heightDistance,
        );
        camera.updateProjectionMatrix();
      };

      const observer = new ResizeObserver(resize);
      observer.observe(canvas);
      resize();

      let frameId = 0;
      let hasRendered = false;
      const startedAt = performance.now();
      const warmHeroRimFrame = scale === "hero" && variant === "ice";

      const renderFrame = (time: number) => {
        const seconds = (time - startedAt) / 1000;
        if (live) {
          setDashboardWebGlCanvasActive(canvas, true);
        }

        root.rotation.x = -0.06 + Math.sin(seconds * 0.72) * 0.018;
        root.rotation.y = 0.18 + Math.sin(seconds * 0.54) * 0.075;
        root.rotation.z = -0.012 + Math.sin(seconds * 0.44) * 0.012;
        root.position.y = Math.sin(seconds * 0.68) * 0.018;

        letterMeshes.forEach((letter, index) => {
          const phase = seconds * 1.18 + index * 0.41;
          const swing = Math.sin(phase);
          letter.rotation.y = swing * 0.024;
          letter.rotation.z = Math.sin(phase * 0.72) * 0.004;
          letter.position.z = Math.max(0, swing) * 0.007;
        });

        sparks.rotation.z = seconds * 0.012;
        sparks.position.x = Math.sin(seconds * 0.32) * 0.035;
        faceMaterial.emissiveIntensity =
          (warmHeroRimFrame
            ? 0.42
            : scale === "hero"
              ? 0.34
              : variant === "ice"
                ? 0.22
                : 0.3) +
          Math.max(0, Math.sin(seconds * 1.22)) * (scale === "hero" ? 0.14 : 0.1);
        sideMaterial.emissiveIntensity =
          (warmHeroRimFrame ? 0.32 : scale === "hero" ? 0.26 : 0.18) +
          Math.max(0, Math.sin(seconds * 1.1 + 0.7)) * 0.08;
        rimMaterial.emissiveIntensity =
          (warmHeroRimFrame ? 0.52 : 0.34) +
          Math.max(0, Math.sin(seconds * 1.9 + 0.6)) *
            (warmHeroRimFrame ? 0.22 : 0.16);
        glowMaterial.opacity =
          warmHeroRimFrame
            ? 0.18 + Math.max(0, Math.sin(seconds * 1.7 + 0.9)) * 0.12
            : scale === "hero"
            ? 0.14 + Math.max(0, Math.sin(seconds * 1.7 + 0.9)) * 0.1
            : 0;
        cyanLight.intensity =
          (scale === "hero" ? 3.25 : 2.5) +
          Math.max(0, Math.sin(seconds * 1.2)) * (scale === "hero" ? 1.1 : 0.9);
        amberLight.intensity =
          (scale === "hero" ? 1.8 : 1.35) +
          Math.max(0, Math.sin(seconds * 1.05 + 1.3)) * 0.58;

        renderer.render(scene, camera);

        if (!hasRendered) {
          hasRendered = true;
          setWebglReady(true);
        }

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

    if (deferMs > 0) {
      startTimeoutId = window.setTimeout(() => {
        void startScene();
      }, deferMs);
    } else {
      void startScene();
    }

    return () => {
      cancelled = true;
      if (startTimeoutId !== null) {
        window.clearTimeout(startTimeoutId);
      }
      cleanup();
    };
  }, [
    deferMs,
    density,
    effects,
    label,
    letterMotion,
    lines,
    live,
    scale,
    variant,
    weight,
  ]);

  return (
    <span
      aria-label={label}
      className={`marketing-section-heading-3d ${
        webglReady ? "marketing-section-heading-3d--ready" : ""
      } marketing-section-heading-3d--${scale} marketing-section-heading-3d--${variant} marketing-section-heading-3d--${density} marketing-section-heading-3d--${weight} relative block w-full overflow-visible ${className}`}
    >
      <style>{`
        .marketing-section-heading-3d {
          aspect-ratio: 2.9 / 1;
          isolation: isolate;
        }

        .marketing-section-heading-3d--hero {
          aspect-ratio: 3.35 / 1;
        }

        .marketing-section-heading-3d--eyebrow {
          aspect-ratio: 5.1 / 1;
        }

        .marketing-section-heading-3d > .dashboard-webgl-snapshot-layer {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
        }

        .marketing-section-heading-3d__canvas {
          display: block;
          height: 100%;
          opacity: 0;
          transition: opacity 260ms ease;
          width: 100%;
        }

        .marketing-section-heading-3d--ready .marketing-section-heading-3d__canvas {
          opacity: 1;
        }

        .marketing-section-heading-3d__fallback {
          color: #dbeafe;
          font-size: clamp(2.25rem, 6.2vw, 4.75rem);
          font-weight: 900;
          inset: 0;
          letter-spacing: 0;
          line-height: 0.92;
          opacity: 1;
          position: absolute;
          text-transform: uppercase;
          transition: opacity 180ms ease;
        }

        .marketing-section-heading-3d--hero .marketing-section-heading-3d__fallback {
          font-size: clamp(2.35rem, 5.4vw, 4.2rem);
          line-height: 0.96;
        }

        .marketing-section-heading-3d--hero.marketing-section-heading-3d--tight .marketing-section-heading-3d__fallback {
          line-height: 0.9;
        }

        .marketing-section-heading-3d--hero.marketing-section-heading-3d--ice .marketing-section-heading-3d__fallback {
          -webkit-text-stroke: 0.055em rgba(249, 115, 22, 0.82);
          color: #f8fbff;
          text-shadow:
            0.06em 0.055em 0 rgba(12, 74, 110, 0.92),
            0.095em 0.09em 0 rgba(249, 115, 22, 0.7),
            0 0 22px rgba(56, 189, 248, 0.34),
            0 0 28px rgba(249, 115, 22, 0.22);
        }

        .marketing-section-heading-3d--hero.marketing-section-heading-3d--heavy.marketing-section-heading-3d--ice .marketing-section-heading-3d__fallback {
          -webkit-text-stroke-width: 0.068em;
          text-shadow:
            0.07em 0.06em 0 rgba(12, 74, 110, 0.94),
            0.11em 0.1em 0 rgba(249, 115, 22, 0.78),
            0 0 24px rgba(56, 189, 248, 0.38),
            0 0 32px rgba(249, 115, 22, 0.26);
        }

        .marketing-section-heading-3d--eyebrow .marketing-section-heading-3d__fallback {
          color: #38bdf8;
          font-size: clamp(0.92rem, 2.35vw, 1.28rem);
          letter-spacing: 0.14em;
          line-height: 1;
          text-shadow:
            0 0 12px rgba(56, 189, 248, 0.45),
            0 0 20px rgba(245, 158, 11, 0.12);
        }

        .marketing-section-heading-3d--ready .marketing-section-heading-3d__fallback {
          opacity: 0;
        }
      `}</style>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="marketing-section-heading-3d__canvas"
        data-marketing-section-heading-renderer="three"
        data-dashboard-webgl-snapshot-key={snapshotKey}
      />
      <span
        aria-hidden="true"
        className={[
          "marketing-section-heading-3d__fallback",
          webglReady ? "opacity-0" : "",
        ].join(" ")}
      >
        {lines.map((line) => (
          <span className="block" key={line}>
            {line}
          </span>
        ))}
      </span>
    </span>
  );
}

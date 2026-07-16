"use client";

import { useEffect, useRef, useState } from "react";
import type { BufferGeometry, Material, Object3D } from "three";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";
import {
  createDashboardWebGlRenderer,
  loadDashboardThree,
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

type MemberPreviewRowLabels3DProps = {
  className?: string;
  labels: string[];
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

const createLabelGeometry = (
  TextGeometry: TextGeometryCtor,
  font: Font,
  label: string,
  size: number,
  depth: number,
) => {
  const geometry = new TextGeometry(label.toUpperCase(), {
    bevelEnabled: true,
    bevelSegments: 4,
    bevelSize: size * 0.026,
    bevelThickness: size * 0.054,
    curveSegments: 8,
    depth,
    font,
    size,
  });

  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (box) {
    geometry.translate(-box.min.x, -box.max.y, 0);
  }
  geometry.computeVertexNormals();
  return geometry;
};

const addLabel = ({
  THREE,
  TextGeometry,
  accentMaterial,
  faceMaterial,
  font,
  height,
  label,
  maxWidth,
  sideMaterial,
  size,
  width,
  x,
  y,
}: {
  THREE: ThreeModule;
  TextGeometry: TextGeometryCtor;
  accentMaterial: Material;
  faceMaterial: Material;
  font: Font;
  height: number;
  label: string;
  maxWidth: number;
  sideMaterial: Material;
  size: number;
  width: number;
  x: number;
  y: number;
}) => {
  const group = new THREE.Group();
  const geometry = createLabelGeometry(TextGeometry, font, label, size, 2.9);
  geometry.computeBoundingBox();
  const labelWidth =
    (geometry.boundingBox?.max.x ?? 0) - (geometry.boundingBox?.min.x ?? 0);
  const scale = Math.min(1, maxWidth / Math.max(labelWidth, 1));

  const rim = new THREE.Mesh(geometry.clone(), [accentMaterial, accentMaterial]);
  rim.position.set(1.8, -1.4, -2.8);
  rim.scale.set(scale * 1.026, scale * 1.035, 1);
  group.add(rim);

  const mesh = new THREE.Mesh(geometry, [faceMaterial, sideMaterial]);
  mesh.scale.setScalar(scale);
  group.add(mesh);

  group.position.set(x - width / 2, height / 2 - y, 0);
  group.rotation.set(-0.045, 0.12, -0.01);
  return group;
};

export default function MemberPreviewRowLabels3D({
  className = "",
  labels,
}: MemberPreviewRowLabels3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    let retryTimeoutId: number | null = null;
    let resizeTimeoutId: number | null = null;
    let cleanup = () => {};

    const scheduleRetry = (attempt: number) => {
      if (attempt >= 6 || cancelled) return;
      retryTimeoutId = window.setTimeout(
        () => void renderLabels(attempt + 1),
        800 + attempt * 500,
      );
    };

    const renderLabels = async (attempt = 0) => {
      if (!canvasRef.current || !hostRef.current) return;

      await waitForDashboardWebGlStart({ priority: attempt > 2 });
      if (cancelled || !canvasRef.current || !hostRef.current) return;

      const rect = hostRef.current.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      if (width < 120 || height < 80) {
        scheduleRetry(attempt);
        return;
      }

      const THREE = await loadDashboardThree();
      if (cancelled || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const renderer = createDashboardWebGlRenderer(THREE, canvas, {
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
        preserveDrawingBuffer: true,
      });

      if (!renderer) {
        scheduleRetry(attempt);
        return;
      }

      const [{ TextGeometry }, { FontLoader }, fontModule] = await Promise.all([
        import("three/examples/jsm/geometries/TextGeometry.js"),
        import("three/examples/jsm/loaders/FontLoader.js"),
        import("three/examples/fonts/helvetiker_bold.typeface.json"),
      ]);

      if (cancelled) {
        renderer.forceContextLoss();
        renderer.dispose();
        return;
      }

      const font = new FontLoader().parse(
        "default" in fontModule ? fontModule.default : fontModule,
      );
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(
        -width / 2,
        width / 2,
        height / 2,
        -height / 2,
        -100,
        1000,
      );
      camera.position.set(0, 0, 240);
      camera.lookAt(0, 0, 0);

      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio || 1, 1), 2));
      renderer.setSize(width, height, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      scene.add(new THREE.AmbientLight(new THREE.Color("#e0f2fe"), 1.18));

      const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
      keyLight.position.set(-80, 130, 180);
      scene.add(keyLight);

      const cyanLight = new THREE.PointLight(new THREE.Color("#38bdf8"), 2.4, 480);
      cyanLight.position.set(-width * 0.22, height * 0.08, 150);
      scene.add(cyanLight);

      const amberLight = new THREE.PointLight(new THREE.Color("#f59e0b"), 1.7, 420);
      amberLight.position.set(width * 0.2, height * 0.12, 170);
      scene.add(amberLight);

      const faceMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.84,
        clearcoatRoughness: 0.12,
        color: new THREE.Color("#e0f7ff"),
        emissive: new THREE.Color("#0ea5e9"),
        emissiveIntensity: 0.25,
        metalness: 0.42,
        roughness: 0.16,
      });

      const sideMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.52,
        clearcoatRoughness: 0.18,
        color: new THREE.Color("#075985"),
        emissive: new THREE.Color("#082f49"),
        emissiveIntensity: 0.2,
        metalness: 0.72,
        roughness: 0.22,
      });

      const accentMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.58,
        clearcoatRoughness: 0.18,
        color: new THREE.Color("#f97316"),
        emissive: new THREE.Color("#f59e0b"),
        emissiveIntensity: 0.32,
        metalness: 0.58,
        roughness: 0.2,
      });

      const isStacked = width < 640;
      const columns = isStacked ? 1 : 2;
      const colWidth = width / columns;
      const rowCount = isStacked ? labels.length : Math.ceil(labels.length / 2);
      const rowHeight = height / Math.max(rowCount, 1);
      const fontSize = isStacked ? 12 : 13.5;

      labels.forEach((label, index) => {
        const column = isStacked ? 0 : index % 2;
        const row = isStacked ? index : Math.floor(index / 2);
        const iconOffset = index === 0 && !isStacked ? 92 : 68;
        const x = column * colWidth + iconOffset;
        const y = row * rowHeight + (index === 0 && !isStacked ? 32 : 25);
        const maxWidth = colWidth - iconOffset - 24;

        scene.add(
          addLabel({
            THREE,
            TextGeometry,
            accentMaterial,
            faceMaterial,
            font,
            height,
            label,
            maxWidth,
            sideMaterial,
            size: fontSize,
            width,
            x,
            y,
          }),
        );
      });

      renderer.render(scene, camera);

      try {
        const snapshot = canvas.toDataURL("image/png");
        if (!cancelled && snapshot.startsWith("data:image/png")) {
          setSnapshotUrl(snapshot);
        }
      } catch {
        // If snapshot capture is blocked, the fallback labels remain visible.
      }

      cleanup();
      cleanup = () => {
        disposeObject(scene);
        renderer.forceContextLoss();
        renderer.dispose();
      };
      cleanup();
      cleanup = () => {};
    };

    const observer = new ResizeObserver(() => {
      if (resizeTimeoutId !== null) {
        window.clearTimeout(resizeTimeoutId);
      }
      resizeTimeoutId = window.setTimeout(() => {
        setSnapshotUrl("");
        void renderLabels();
      }, 160);
    });

    if (hostRef.current) {
      observer.observe(hostRef.current);
    }

    void renderLabels();

    return () => {
      cancelled = true;
      observer.disconnect();
      if (retryTimeoutId !== null) window.clearTimeout(retryTimeoutId);
      if (resizeTimeoutId !== null) window.clearTimeout(resizeTimeoutId);
      cleanup();
    };
  }, [labels]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-visible ${className}`}
      data-member-preview-row-labels-ready={snapshotUrl ? "true" : "false"}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full opacity-0"
        data-member-preview-row-labels-renderer="three"
      />
      {snapshotUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_0_14px_rgba(34,211,238,0.28)]"
          decoding="async"
          draggable={false}
          src={snapshotUrl}
        />
      ) : null}
    </div>
  );
}

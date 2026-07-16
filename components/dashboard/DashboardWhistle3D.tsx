"use client";

import { useEffect, useRef, useState } from "react";
import type { BufferGeometry, Material, Object3D } from "three";
import {
  createDashboardWebGlRenderer,
  loadDashboardThree,
  setDashboardWebGlCanvasActive,
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

const createCircleShape = (
  THREE: ThreeModule,
  radius: number,
  segments = 72,
) => {
  const shape = new THREE.Shape();

  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
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

const createMouthpieceShape = (THREE: ThreeModule) => {
  const shape = new THREE.Shape();

  shape.moveTo(-1.36, -0.52);
  shape.lineTo(-0.98, 0.04);
  shape.quadraticCurveTo(-0.86, 0.18, -0.66, 0.19);
  shape.lineTo(0.28, 0.08);
  shape.quadraticCurveTo(0.44, 0.06, 0.5, -0.06);
  shape.lineTo(0.26, -0.44);
  shape.quadraticCurveTo(0.17, -0.56, -0.02, -0.58);
  shape.lineTo(-1.18, -0.66);
  shape.quadraticCurveTo(-1.34, -0.66, -1.36, -0.52);
  shape.closePath();

  return shape;
};

const createTopWindowRimShape = (THREE: ThreeModule) => {
  const shape = new THREE.Shape();

  shape.moveTo(-0.46, 0.07);
  shape.lineTo(-0.26, 0.37);
  shape.quadraticCurveTo(-0.18, 0.48, -0.02, 0.49);
  shape.lineTo(0.58, 0.45);
  shape.quadraticCurveTo(0.74, 0.43, 0.82, 0.32);
  shape.lineTo(0.9, 0.2);
  shape.lineTo(0.72, 0.04);
  shape.quadraticCurveTo(0.64, -0.03, 0.48, -0.02);
  shape.lineTo(-0.32, 0.02);
  shape.quadraticCurveTo(-0.42, 0.02, -0.46, 0.07);
  shape.closePath();

  return shape;
};

const createTopWindowBlackShape = (THREE: ThreeModule) => {
  const shape = new THREE.Shape();

  shape.moveTo(-0.32, 0.12);
  shape.lineTo(-0.16, 0.31);
  shape.quadraticCurveTo(-0.1, 0.38, 0.02, 0.39);
  shape.lineTo(0.5, 0.36);
  shape.quadraticCurveTo(0.6, 0.35, 0.65, 0.28);
  shape.lineTo(0.7, 0.21);
  shape.lineTo(0.58, 0.11);
  shape.quadraticCurveTo(0.52, 0.07, 0.42, 0.075);
  shape.lineTo(-0.22, 0.1);
  shape.quadraticCurveTo(-0.29, 0.1, -0.32, 0.12);
  shape.closePath();

  return shape;
};

const createTopStemShape = (THREE: ThreeModule) => {
  const shape = new THREE.Shape();

  shape.moveTo(0.46, 0.38);
  shape.bezierCurveTo(0.48, 0.54, 0.58, 0.66, 0.74, 0.69);
  shape.bezierCurveTo(0.9, 0.7, 0.99, 0.61, 0.98, 0.49);
  shape.bezierCurveTo(0.95, 0.34, 0.83, 0.24, 0.68, 0.22);
  shape.bezierCurveTo(0.54, 0.22, 0.47, 0.28, 0.46, 0.38);
  shape.closePath();

  return shape;
};

const createTipOpeningShape = (THREE: ThreeModule) => {
  const shape = new THREE.Shape();

  shape.moveTo(-1.22, -0.56);
  shape.lineTo(-0.82, -0.54);
  shape.lineTo(-0.72, -0.43);
  shape.lineTo(-1.13, -0.45);
  shape.closePath();

  return shape;
};

const createEmbossShape = (THREE: ThreeModule) => {
  const shape = new THREE.Shape();

  shape.moveTo(-0.78, -0.3);
  shape.bezierCurveTo(-0.88, -0.28, -0.93, -0.22, -0.91, -0.15);
  shape.bezierCurveTo(-0.86, -0.04, -0.64, -0.03, -0.54, -0.1);
  shape.lineTo(-0.6, -0.17);
  shape.bezierCurveTo(-0.68, -0.13, -0.79, -0.14, -0.82, -0.18);
  shape.bezierCurveTo(-0.84, -0.22, -0.81, -0.26, -0.74, -0.28);
  shape.closePath();

  return shape;
};

const createExtrudedShape = (
  THREE: ThreeModule,
  shape: import("three").Shape,
  depth: number,
  bevelSize: number,
  bevelThickness: number,
  bevelSegments: number,
) =>
  centerGeometry(
    new THREE.ExtrudeGeometry(shape, {
      bevelEnabled: true,
      bevelSegments,
      bevelSize,
      bevelThickness,
      curveSegments: 12,
      depth,
    }),
  );

export default function DashboardWhistle3D({
  active = false,
  className = "",
  paused = false,
}: DashboardWhistle3DProps) {
  const activeRef = useRef(active);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(paused);
  const [webglReady, setWebglReady] = useState(false);

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
      await waitForDashboardWebGlStart({ priority: true });
      if (cancelled || !canvasRef.current) return;

      const THREE = await loadDashboardThree();
      if (cancelled || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 14);
      camera.position.set(0.1, 0.06, 4.2);
      camera.lookAt(0, -0.02, 0);

      const renderer = createDashboardWebGlRenderer(
        THREE,
        canvas,
        {
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
          preserveDrawingBuffer: false,
        },
        { priority: true },
      );
      if (!renderer) return;

      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(
        Math.min(Math.max(window.devicePixelRatio || 1, 1.65), 2.35),
      );
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      scene.add(new THREE.AmbientLight(new THREE.Color("#e0f2fe"), 1.25));

      const keyLight = new THREE.DirectionalLight(0xffffff, 3.45);
      keyLight.position.set(-1.8, 2.7, 4.2);
      scene.add(keyLight);

      const rimLight = new THREE.PointLight(new THREE.Color("#38bdf8"), 3.1, 5);
      rimLight.position.set(-1.2, 0.35, 2.4);
      scene.add(rimLight);

      const warmLight = new THREE.PointLight(new THREE.Color("#fde68a"), 1.8, 4.5);
      warmLight.position.set(1.1, 0.75, 2.7);
      scene.add(warmLight);

      const group = new THREE.Group();
      group.scale.set(1.3, 1.3, 1);
      group.rotation.set(-0.08, -0.34, -0.08);
      scene.add(group);

      const whiteMetal = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.98,
        clearcoatRoughness: 0.09,
        color: new THREE.Color("#f8fbff"),
        emissive: new THREE.Color("#0e7490"),
        emissiveIntensity: 0.08,
        metalness: 0.82,
        roughness: 0.14,
      });

      const sideMetal = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.88,
        clearcoatRoughness: 0.12,
        color: new THREE.Color("#9bd7ef"),
        emissive: new THREE.Color("#075985"),
        emissiveIntensity: 0.1,
        metalness: 0.86,
        roughness: 0.16,
      });

      const darkWindow = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.7,
        clearcoatRoughness: 0.18,
        color: new THREE.Color("#020617"),
        emissive: new THREE.Color("#000000"),
        emissiveIntensity: 0,
        metalness: 0.18,
        roughness: 0.32,
      });

      const amberEdge = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.82,
        clearcoatRoughness: 0.13,
        color: new THREE.Color("#f8fafc"),
        emissive: new THREE.Color("#f59e0b"),
        emissiveIntensity: 0.16,
        metalness: 0.72,
        roughness: 0.18,
      });

      const mouthpieceGeometry = createExtrudedShape(
        THREE,
        createMouthpieceShape(THREE),
        0.32,
        0.026,
        0.04,
        5,
      );
      const mouthpiece = new THREE.Mesh(mouthpieceGeometry, [whiteMetal, sideMetal]);
      mouthpiece.position.set(-0.28, -0.08, 0);
      mouthpiece.rotation.z = -0.025;
      group.add(mouthpiece);

      const bodyGeometry = createExtrudedShape(
        THREE,
        createCircleShape(THREE, 0.49),
        0.42,
        0.034,
        0.052,
        8,
      );
      const body = new THREE.Mesh(bodyGeometry, [whiteMetal, sideMetal]);
      body.position.set(0.38, -0.05, 0.08);
      group.add(body);

      const bodyFace = new THREE.Mesh(
        new THREE.CircleGeometry(0.43, 72),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color("#f8fafc"),
          opacity: 0.34,
          transparent: true,
        }),
      );
      bodyFace.position.set(0.38, -0.05, 0.32);
      bodyFace.scale.set(0.98, 0.98, 1);
      group.add(bodyFace);

      const topRimGeometry = createExtrudedShape(
        THREE,
        createTopWindowRimShape(THREE),
        0.12,
        0.016,
        0.024,
        5,
      );
      const topRim = new THREE.Mesh(topRimGeometry, [whiteMetal, amberEdge]);
      topRim.position.set(0.04, 0.2, 0.34);
      topRim.rotation.z = -0.02;
      group.add(topRim);

      const topWindowGeometry = createExtrudedShape(
        THREE,
        createTopWindowBlackShape(THREE),
        0.08,
        0.006,
        0.01,
        3,
      );
      const topWindow = new THREE.Mesh(topWindowGeometry, darkWindow);
      topWindow.position.set(0.04, 0.2, 0.43);
      topWindow.rotation.z = -0.02;
      group.add(topWindow);

      const topWindowInnerGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(0.78, 0.12),
        new THREE.MeshBasicMaterial({
          blending: THREE.AdditiveBlending,
          color: new THREE.Color("#020617"),
          depthWrite: false,
          opacity: 0.62,
          transparent: true,
        }),
      );
      topWindowInnerGlow.position.set(0.16, 0.38, 0.49);
      topWindowInnerGlow.rotation.z = -0.04;
      topWindowInnerGlow.scale.set(1, 0.64, 1);
      group.add(topWindowInnerGlow);

      const topStemGeometry = createExtrudedShape(
        THREE,
        createTopStemShape(THREE),
        0.22,
        0.018,
        0.028,
        5,
      );
      const topStem = new THREE.Mesh(topStemGeometry, [whiteMetal, sideMetal]);
      topStem.position.set(0.16, 0.05, 0.24);
      topStem.rotation.z = -0.02;
      group.add(topStem);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.21, 0.027, 16, 64),
        sideMetal,
      );
      ring.position.set(0.94, 0.36, 0.2);
      ring.rotation.set(0.58, 0.95, -0.06);
      group.add(ring);

      const ringConnector = new THREE.Mesh(
        new THREE.TorusGeometry(0.08, 0.018, 12, 36, Math.PI * 1.22),
        sideMetal,
      );
      ringConnector.position.set(0.74, 0.38, 0.25);
      ringConnector.rotation.set(0.42, 0.85, 0.15);
      group.add(ringConnector);

      const tipOpeningGeometry = createExtrudedShape(
        THREE,
        createTipOpeningShape(THREE),
        0.035,
        0.004,
        0.006,
        2,
      );
      const tipOpening = new THREE.Mesh(tipOpeningGeometry, darkWindow);
      tipOpening.position.set(-0.28, -0.08, 0.35);
      tipOpening.rotation.z = -0.025;
      group.add(tipOpening);

      const embossGeometry = createExtrudedShape(
        THREE,
        createEmbossShape(THREE),
        0.02,
        0.004,
        0.006,
        2,
      );
      const emboss = new THREE.Mesh(
        embossGeometry,
        new THREE.MeshBasicMaterial({
          blending: THREE.AdditiveBlending,
          color: new THREE.Color("#bae6fd"),
          opacity: 0.52,
          transparent: true,
        }),
      );
      emboss.position.set(-0.3, -0.08, 0.37);
      emboss.rotation.z = -0.025;
      group.add(emboss);

      const topHighlight = new THREE.Mesh(
        new THREE.PlaneGeometry(0.86, 0.028),
        new THREE.MeshBasicMaterial({
          blending: THREE.AdditiveBlending,
          color: new THREE.Color("#f8fafc"),
          depthWrite: false,
          opacity: 0.5,
          transparent: true,
        }),
      );
      topHighlight.position.set(0.12, 0.5, 0.51);
      topHighlight.rotation.z = -0.04;
      group.add(topHighlight);

      const lowerSeam = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.62, -0.55, 0.34),
            new THREE.Vector3(-0.16, -0.47, 0.36),
            new THREE.Vector3(0.42, -0.48, 0.35),
          ]),
          48,
          0.012,
          8,
          false,
        ),
        new THREE.MeshBasicMaterial({
          blending: THREE.AdditiveBlending,
          color: new THREE.Color("#bae6fd"),
          opacity: 0.35,
          transparent: true,
        }),
      );
      group.add(lowerSeam);

      const glowMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#7dd3fc"),
        depthWrite: false,
        opacity: 0.06,
        transparent: true,
      });
      const glow = new THREE.Mesh(new THREE.CircleGeometry(0.92, 72), glowMaterial);
      glow.position.set(0.02, -0.04, -0.24);
      glow.scale.set(1.65, 0.72, 1);
      group.add(glow);

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
      let didRender = false;
      const renderFrame = (time: number) => {
        const frameDelta =
          lastFrameTime > 0 ? Math.min(48, time - lastFrameTime) : 16.67;
        lastFrameTime = time;

        const seconds = time / 1000;
        const isActive = activeRef.current && !pausedRef.current;
        const targetCharge = isActive ? 1 : 0;
        charge += (targetCharge - charge) * Math.min(1, frameDelta * 0.012);
        setDashboardWebGlCanvasActive(canvas, isActive);

        group.position.y = Math.sin(seconds * 1.05) * 0.022 * charge;
        group.rotation.x = -0.08 + Math.sin(seconds * 1.24) * 0.028 * charge;
        group.rotation.y = -0.34 + Math.sin(seconds * 0.82) * 0.1 * charge;
        group.rotation.z = -0.08 + Math.sin(seconds * 1.16) * 0.018 * charge;

        whiteMetal.emissiveIntensity =
          0.08 + charge * (0.1 + Math.max(0, Math.sin(seconds * 2.7)) * 0.035);
        sideMetal.emissiveIntensity =
          0.1 + charge * (0.1 + Math.max(0, Math.sin(seconds * 2.3 + 0.7)) * 0.035);
        glowMaterial.opacity =
          0.045 + charge * (0.055 + Math.sin(seconds * 2.2) * 0.012);
        rimLight.intensity = 2.35 + charge * 1.05;
        warmLight.intensity = 1.35 + charge * 0.55;

        renderer.render(scene, camera);
        if (!didRender) {
          didRender = true;
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

    void startScene();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return (
    <span
      aria-hidden="true"
      className={`dashboard-whistle-3d ${
        webglReady ? "dashboard-whistle-3d--ready" : ""
      } relative inline-block overflow-visible ${className}`}
    >
      <style>{`
        .dashboard-whistle-3d__fallback {
          filter:
            drop-shadow(0 0 0.72rem rgba(125, 211, 252, 0.32))
            drop-shadow(0 0 1rem rgba(250, 204, 21, 0.1));
          opacity: 0.96;
          transition: opacity 220ms ease;
        }

        .dashboard-whistle-3d--ready .dashboard-whistle-3d__fallback {
          opacity: 0.12;
        }

        .dashboard-whistle-3d__canvas {
          display: block;
          height: 100%;
          inset: 0;
          opacity: 0;
          position: absolute;
          transition: opacity 220ms ease;
          width: 100%;
          z-index: 2;
        }

        .dashboard-whistle-3d--ready .dashboard-whistle-3d__canvas {
          opacity: 1;
        }

        .dashboard-whistle-3d__canvas[data-webgl-fallback="true"] {
          opacity: 0 !important;
          visibility: hidden !important;
        }
      `}</style>
      <svg
        aria-hidden="true"
        className="dashboard-whistle-3d__fallback absolute inset-0 h-full w-full"
        viewBox="0 0 220 140"
      >
        <defs>
          <linearGradient id="dashboard-whistle-top-hole-metal" x1="34" x2="184" y1="20" y2="116">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="38%" stopColor="#bae6fd" />
            <stop offset="70%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#f8fafc" />
          </linearGradient>
          <linearGradient id="dashboard-whistle-top-hole-shine" x1="72" x2="158" y1="30" y2="56">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="45%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#7dd3fc" />
          </linearGradient>
        </defs>
        <path
          d="M36 94 L77 36 Q86 24 105 26 L151 34 Q172 38 184 58 Q195 77 185 95 Q175 113 151 116 L64 112 Q42 111 36 94 Z"
          fill="url(#dashboard-whistle-top-hole-metal)"
          opacity="0.95"
        />
        <circle
          cx="150"
          cy="75"
          fill="#f8fafc"
          opacity="0.78"
          r="43"
        />
        <path
          d="M67 36 L36 94 L120 97 L104 48 Q99 34 84 33 Z"
          fill="url(#dashboard-whistle-top-hole-metal)"
          opacity="0.92"
        />
        <path
          d="M77 26 L91 52 L160 47 L173 31 Q142 19 110 18 Q91 18 77 26 Z"
          fill="url(#dashboard-whistle-top-hole-shine)"
        />
        <path
          d="M91 33 L101 45 L152 41 L160 32 Q134 25 107 26 Q96 27 91 33 Z"
          fill="#020617"
          opacity="0.94"
        />
        <path
          d="M70 105 L106 106 L96 95 L58 93 Z"
          fill="#020617"
          opacity="0.76"
        />
        <path
          d="M88 48 Q111 38 148 44"
          fill="none"
          opacity="0.46"
          stroke="#f8fafc"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <path
          d="M155 25 Q168 11 183 24"
          fill="none"
          opacity="0.78"
          stroke="#e0f2fe"
          strokeLinecap="round"
          strokeWidth="8"
        />
        <circle
          cx="187"
          cy="34"
          fill="none"
          opacity="0.72"
          r="18"
          stroke="#bae6fd"
          strokeWidth="6"
        />
      </svg>
      <canvas
        aria-hidden="true"
        className="dashboard-whistle-3d__canvas"
        data-whistle-renderer="classic-top-hole-v2"
        ref={canvasRef}
      />
    </span>
  );
}

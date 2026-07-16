"use client";

import { useEffect, useRef } from "react";
import type { BufferGeometry, Material, Object3D } from "three";
import {
  createDashboardWebGlRenderer,
  loadDashboardThree,
  waitForDashboardPriorityWebGlRetry,
  waitForDashboardWebGlStart,
} from "./dashboardWebGlRenderer";

type ThreeModule = typeof import("three");

type DashboardRealLifeIconVariant =
  | "chat"
  | "clipboard"
  | "home"
  | "lock"
  | "wave";

type DashboardRealLifeIcon3DProps = {
  active?: boolean;
  className?: string;
  paused?: boolean;
  priority?: boolean;
  variant: DashboardRealLifeIconVariant;
};

type PublicIconProps = Omit<DashboardRealLifeIcon3DProps, "variant">;

const DASHBOARD_REAL_LIFE_PRIORITY_MAX_START_ATTEMPTS = 3;

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

const createRoundedRectShape = (
  THREE: ThreeModule,
  width: number,
  height: number,
  radius: number,
) => {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();

  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius,
    y + height,
  );
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  shape.closePath();

  return shape;
};

const createBubbleShape = (
  THREE: ThreeModule,
  width: number,
  height: number,
  radius: number,
) => {
  const x = -width / 2;
  const y = -height / 2;
  const shape = createRoundedRectShape(THREE, width, height, radius);
  shape.moveTo(x + width * 0.22, y);
  shape.lineTo(x + width * 0.1, y - height * 0.24);
  shape.lineTo(x + width * 0.38, y);
  shape.closePath();
  return shape;
};

const createExtrudedShape = (
  THREE: ThreeModule,
  shape: InstanceType<ThreeModule["Shape"]>,
  material: Material,
  depth = 0.13,
) => {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: true,
    bevelSegments: 8,
    bevelSize: 0.018,
    bevelThickness: 0.032,
    depth,
  });
  geometry.center();
  return new THREE.Mesh(geometry, material);
};

const addTube = (
  THREE: ThreeModule,
  group: InstanceType<ThreeModule["Group"]>,
  material: Material,
  from: InstanceType<ThreeModule["Vector3"]>,
  to: InstanceType<ThreeModule["Vector3"]>,
  radius = 0.036,
) => {
  const curve = new THREE.LineCurve3(from, to);
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 8, radius, 14, false),
    material,
  );
  group.add(mesh);
  return mesh;
};

function DashboardRealLifeIcon3D({
  active = false,
  className = "",
  paused = false,
  priority = false,
  variant,
}: DashboardRealLifeIcon3DProps) {
  const activeRef = useRef(active);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(paused);
  const variantRef = useRef(variant);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    variantRef.current = variant;
  }, [variant]);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};

    const startScene = async () => {
      let startAttempt = 0;
      let renderer: ReturnType<typeof createDashboardWebGlRenderer> = null;
      let THREE: ThreeModule | null = null;
      let canvas: HTMLCanvasElement | null = null;

      while (!cancelled && canvasRef.current) {
        await waitForDashboardWebGlStart({ priority });
        if (cancelled || !canvasRef.current) return;

        THREE = await loadDashboardThree();
        if (cancelled || !canvasRef.current) return;

        canvas = canvasRef.current;
        renderer = createDashboardWebGlRenderer(
          THREE,
          canvas,
          {
            alpha: true,
            antialias: true,
            powerPreference: "high-performance",
            preserveDrawingBuffer: false,
          },
          { priority },
        );

        if (renderer || !priority) break;
        if (startAttempt >= DASHBOARD_REAL_LIFE_PRIORITY_MAX_START_ATTEMPTS) {
          break;
        }

        await waitForDashboardPriorityWebGlRetry(startAttempt);
        startAttempt += 1;
      }

      if (!renderer) return;
      if (!THREE || !canvas) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 14);
      camera.position.set(0, 0.02, 3.35);
      camera.lookAt(0, 0, 0);

      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(
        Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2.1),
      );
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      scene.add(new THREE.AmbientLight(new THREE.Color("#dbeafe"), 1.18));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.7);
      keyLight.position.set(-1.9, 2.6, 3.2);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(new THREE.Color("#67e8f9"), 2.1);
      rimLight.position.set(2, 1.4, 2.4);
      scene.add(rimLight);

      const goldLight = new THREE.PointLight(new THREE.Color("#fde68a"), 1.4, 4.2);
      goldLight.position.set(-1.2, -0.6, 2);
      scene.add(goldLight);

      const cyanLight = new THREE.PointLight(new THREE.Color("#22d3ee"), 2.4, 4.8);
      cyanLight.position.set(1.1, 0.35, 2.4);
      scene.add(cyanLight);

      const group = new THREE.Group();
      group.rotation.set(-0.12, -0.28, -0.04);
      scene.add(group);

      const glassMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.92,
        clearcoatRoughness: 0.1,
        color: new THREE.Color("#dff6ff"),
        emissive: new THREE.Color("#0e7490"),
        emissiveIntensity: 0.08,
        metalness: 0.42,
        roughness: 0.14,
        transmission: 0.14,
      });

      const cyanMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.82,
        clearcoatRoughness: 0.12,
        color: new THREE.Color("#7dd3fc"),
        emissive: new THREE.Color("#0891b2"),
        emissiveIntensity: 0.1,
        metalness: 0.62,
        roughness: 0.18,
      });

      const silverMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.88,
        clearcoatRoughness: 0.08,
        color: new THREE.Color("#dbe5ee"),
        emissive: new THREE.Color("#93a4b3"),
        emissiveIntensity: 0.035,
        metalness: 0.86,
        roughness: 0.16,
      });

      const accentMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.7,
        clearcoatRoughness: 0.15,
        color: new THREE.Color("#fde68a"),
        emissive: new THREE.Color("#facc15"),
        emissiveIntensity: 0.05,
        metalness: 0.58,
        roughness: 0.22,
      });

      const shadowMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#22d3ee"),
        depthWrite: false,
        opacity: 0.08,
        transparent: true,
      });

      if (variant === "home") {
        const wall = createExtrudedShape(
          THREE,
          createRoundedRectShape(THREE, 1.04, 0.72, 0.12),
          glassMaterial,
          0.16,
        );
        wall.position.set(0, -0.26, 0);
        group.add(wall);

        const roofShape = new THREE.Shape();
        roofShape.moveTo(-0.66, -0.12);
        roofShape.lineTo(0, 0.5);
        roofShape.lineTo(0.66, -0.12);
        roofShape.lineTo(0.5, -0.24);
        roofShape.lineTo(0, 0.2);
        roofShape.lineTo(-0.5, -0.24);
        roofShape.closePath();

        const roof = createExtrudedShape(THREE, roofShape, cyanMaterial, 0.14);
        roof.position.set(0, 0.2, 0.1);
        group.add(roof);

        const chimney = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.38, 0.14),
          accentMaterial,
        );
        chimney.position.set(0.38, 0.38, 0.12);
        chimney.rotation.z = -0.04;
        group.add(chimney);

        const door = createExtrudedShape(
          THREE,
          createRoundedRectShape(THREE, 0.24, 0.42, 0.08),
          accentMaterial,
          0.08,
        );
        door.position.set(-0.22, -0.38, 0.18);
        group.add(door);

        const windowFrame = createExtrudedShape(
          THREE,
          createRoundedRectShape(THREE, 0.3, 0.26, 0.07),
          cyanMaterial,
          0.07,
        );
        windowFrame.position.set(0.24, -0.25, 0.2);
        group.add(windowFrame);

        const windowGlow = new THREE.Mesh(
          new THREE.PlaneGeometry(0.2, 0.16),
          new THREE.MeshBasicMaterial({
            blending: THREE.AdditiveBlending,
            color: new THREE.Color("#e0f2fe"),
            opacity: 0.34,
            transparent: true,
          }),
        );
        windowGlow.position.set(0.24, -0.25, 0.25);
        group.add(windowGlow);

        const roofRidge = [
          [new THREE.Vector3(-0.69, 0.08, 0.26), new THREE.Vector3(0, 0.7, 0.3)],
          [new THREE.Vector3(0, 0.7, 0.3), new THREE.Vector3(0.69, 0.08, 0.26)],
          [new THREE.Vector3(-0.62, -0.02, 0.23), new THREE.Vector3(0.62, -0.02, 0.23)],
        ] as const;
        roofRidge.forEach(([start, end]) => {
          addTube(THREE, group, cyanMaterial, start, end, 0.035);
        });

        addTube(
          THREE,
          group,
          accentMaterial,
          new THREE.Vector3(-0.56, -0.62, 0.2),
          new THREE.Vector3(0.56, -0.62, 0.2),
          0.035,
        );

        const halo = new THREE.Mesh(
          new THREE.RingGeometry(0.74, 0.78, 64),
          shadowMaterial,
        );
        halo.position.set(0, -0.36, -0.08);
        halo.scale.set(1.16, 0.46, 1);
        group.add(halo);
      }

      if (variant === "clipboard") {
        const board = createExtrudedShape(
          THREE,
          createRoundedRectShape(THREE, 1.02, 1.36, 0.14),
          glassMaterial,
          0.16,
        );
        board.position.y = -0.04;
        group.add(board);

        const clip = createExtrudedShape(
          THREE,
          createRoundedRectShape(THREE, 0.5, 0.22, 0.07),
          accentMaterial,
          0.11,
        );
        clip.position.set(0, 0.62, 0.13);
        group.add(clip);

        [-0.18, -0.02, 0.14].forEach((y, index) => {
          const line = new THREE.Mesh(
            new THREE.BoxGeometry(index === 2 ? 0.52 : 0.66, 0.035, 0.055),
            cyanMaterial,
          );
          line.position.set(0.05, y, 0.16);
          group.add(line);
        });

        addTube(
          THREE,
          group,
          accentMaterial,
          new THREE.Vector3(-0.34, -0.42, 0.2),
          new THREE.Vector3(-0.12, -0.62, 0.2),
          0.04,
        );
        addTube(
          THREE,
          group,
          accentMaterial,
          new THREE.Vector3(-0.12, -0.62, 0.2),
          new THREE.Vector3(0.38, -0.25, 0.2),
          0.04,
        );
      }

      if (variant === "chat") {
        const backBubble = createExtrudedShape(
          THREE,
          createBubbleShape(THREE, 0.9, 0.62, 0.13),
          glassMaterial,
          0.13,
        );
        backBubble.position.set(0.28, 0.25, -0.08);
        backBubble.rotation.z = 0.04;
        group.add(backBubble);

        const frontBubble = createExtrudedShape(
          THREE,
          createBubbleShape(THREE, 1.08, 0.72, 0.15),
          cyanMaterial,
          0.15,
        );
        frontBubble.position.set(-0.16, -0.12, 0.1);
        frontBubble.rotation.z = -0.03;
        group.add(frontBubble);

        [-0.18, 0, 0.18].forEach((x, index) => {
          const dot = new THREE.Mesh(
            new THREE.SphereGeometry(0.055, 24, 16),
            index === 1 ? accentMaterial : glassMaterial,
          );
          dot.position.set(x - 0.16, -0.12, 0.28);
          group.add(dot);
        });
      }

      if (variant === "lock") {
        const body = createExtrudedShape(
          THREE,
          createRoundedRectShape(THREE, 1.08, 0.82, 0.18),
          glassMaterial,
          0.18,
        );
        body.position.set(0, -0.26, 0.04);
        group.add(body);

        const shackleCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.42, 0.08, 0.1),
          new THREE.Vector3(-0.38, 0.52, 0.13),
          new THREE.Vector3(0, 0.76, 0.18),
          new THREE.Vector3(0.38, 0.52, 0.13),
          new THREE.Vector3(0.42, 0.08, 0.1),
        ]);
        const shackle = new THREE.Mesh(
          new THREE.TubeGeometry(shackleCurve, 34, 0.07, 18, false),
          silverMaterial,
        );
        group.add(shackle);

        const keyhole = new THREE.Group();
        const keyTop = new THREE.Mesh(
          new THREE.SphereGeometry(0.095, 28, 18),
          accentMaterial,
        );
        keyTop.position.set(0, -0.22, 0.2);
        keyhole.add(keyTop);

        const keyStem = new THREE.Mesh(
          new THREE.BoxGeometry(0.075, 0.28, 0.08),
          accentMaterial,
        );
        keyStem.position.set(0, -0.42, 0.2);
        keyhole.add(keyStem);
        group.add(keyhole);

        const shine = addTube(
          THREE,
          group,
          glassMaterial,
          new THREE.Vector3(-0.34, -0.03, 0.24),
          new THREE.Vector3(0.32, 0.1, 0.24),
          0.022,
        );
        shine.scale.y = 0.6;
      }

      if (variant === "wave") {
        const waveGroup = new THREE.Group();
        waveGroup.rotation.z = -0.12;
        waveGroup.scale.set(1.16, 1.08, 1);
        group.add(waveGroup);

        const deepCyanMaterial = new THREE.MeshPhysicalMaterial({
          clearcoat: 0.96,
          clearcoatRoughness: 0.08,
          color: new THREE.Color("#0ea5e9"),
          emissive: new THREE.Color("#0891b2"),
          emissiveIntensity: 0.18,
          metalness: 0.5,
          roughness: 0.12,
        });

        const foamMaterial = new THREE.MeshPhysicalMaterial({
          clearcoat: 0.9,
          clearcoatRoughness: 0.08,
          color: new THREE.Color("#ecfeff"),
          emissive: new THREE.Color("#22d3ee"),
          emissiveIntensity: 0.08,
          metalness: 0.3,
          roughness: 0.16,
          transmission: 0.08,
        });

        const primaryWavePath = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.96, -0.22, 0.1),
          new THREE.Vector3(-0.58, 0.22, 0.18),
          new THREE.Vector3(-0.12, -0.02, 0.24),
          new THREE.Vector3(0.36, 0.28, 0.2),
          new THREE.Vector3(0.9, -0.08, 0.12),
        ]);
        const primaryWave = new THREE.Mesh(
          new THREE.TubeGeometry(primaryWavePath, 72, 0.088, 24, false),
          deepCyanMaterial,
        );
        waveGroup.add(primaryWave);

        const crestPath = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.76, -0.02, 0.3),
          new THREE.Vector3(-0.48, 0.28, 0.34),
          new THREE.Vector3(-0.12, 0.14, 0.36),
          new THREE.Vector3(0.22, 0.34, 0.33),
          new THREE.Vector3(0.58, 0.08, 0.28),
        ]);
        const crestWave = new THREE.Mesh(
          new THREE.TubeGeometry(crestPath, 48, 0.032, 14, false),
          foamMaterial,
        );
        waveGroup.add(crestWave);

        const underWavePath = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.88, -0.5, 0.02),
          new THREE.Vector3(-0.36, -0.24, 0.08),
          new THREE.Vector3(0.16, -0.38, 0.1),
          new THREE.Vector3(0.74, -0.16, 0.06),
        ]);
        const underWave = new THREE.Mesh(
          new THREE.TubeGeometry(underWavePath, 48, 0.054, 18, false),
          glassMaterial,
        );
        waveGroup.add(underWave);

        const arrowHead = new THREE.Mesh(
          new THREE.ConeGeometry(0.2, 0.42, 3, 1),
          accentMaterial,
        );
        arrowHead.position.set(0.96, -0.06, 0.17);
        arrowHead.rotation.z = -Math.PI / 2.25;
        arrowHead.scale.set(1.08, 0.86, 0.72);
        waveGroup.add(arrowHead);

        [
          [-0.66, -0.02, 0.064],
          [0.02, 0.1, 0.086],
          [0.56, 0.02, 0.064],
        ].forEach(([x, y, radius], index) => {
          const node = new THREE.Mesh(
            new THREE.SphereGeometry(radius, 24, 16),
            index === 1 ? accentMaterial : glassMaterial,
          );
          node.position.set(x, y, 0.24);
          waveGroup.add(node);
        });
      }

      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.98, 48, 24),
        shadowMaterial,
      );
      glow.scale.set(1.15, 0.58, 0.18);
      glow.position.z = -0.32;
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
      let charge = active ? 1 : 0.34;

      const renderFrame = (time: number) => {
        const frameDelta =
          lastFrameTime > 0 ? Math.min(48, time - lastFrameTime) : 16.67;
        lastFrameTime = time;

        const seconds = time / 1000;
        const targetCharge = activeRef.current && !pausedRef.current ? 1 : 0.34;
        charge += (targetCharge - charge) * Math.min(1, frameDelta * 0.01);

        const drift = pausedRef.current ? 0 : 1;
        group.rotation.x = -0.12 + Math.sin(seconds * 0.34) * 0.035 * drift;
        group.rotation.y = -0.28 + Math.sin(seconds * 0.29) * 0.08 * drift;
        group.rotation.z = -0.04 + Math.sin(seconds * 0.24) * 0.025 * drift;
        group.scale.setScalar(1.02 + charge * 0.13);

        cyanMaterial.emissiveIntensity = 0.08 + charge * 0.1;
        glassMaterial.emissiveIntensity = 0.06 + charge * 0.08;
        accentMaterial.emissiveIntensity = 0.04 + charge * 0.08;
        shadowMaterial.opacity = 0.08 + charge * 0.12;
        rimLight.intensity = 1.75 + charge * 0.8;

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
  }, [active, priority, variant]);

  return (
    <canvas
      aria-hidden="true"
      className={className}
      data-dashboard-real-life-icon-renderer={variantRef.current}
      ref={canvasRef}
    />
  );
}

export function DashboardHomeIcon3D(props: PublicIconProps) {
  return <DashboardRealLifeIcon3D {...props} variant="home" />;
}

export function DashboardClipboardIcon3D(props: PublicIconProps) {
  return <DashboardRealLifeIcon3D {...props} variant="clipboard" />;
}

export function DashboardChatIcon3D(props: PublicIconProps) {
  return <DashboardRealLifeIcon3D {...props} variant="chat" />;
}

export function DashboardLockIcon3D(props: PublicIconProps) {
  return <DashboardRealLifeIcon3D {...props} variant="lock" />;
}

export function DashboardWaveIcon3D(props: PublicIconProps) {
  return <DashboardRealLifeIcon3D {...props} variant="wave" />;
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { BufferGeometry, Group, Material, Object3D } from "three";

type ThreeModule = typeof import("three");
export type DashboardTornadoGemTone = "green" | "red" | "yellow" | "blue";

type TornadoEmeraldMesh = {
  group: Group;
  phase: number;
  spin: number;
};

type MaterialObject = Object3D & {
  material?: Material | Material[];
};

type GeometryObject = Object3D & {
  geometry?: BufferGeometry;
};

type VectorTuple = readonly [number, number, number];

const emeraldOrbiters = [
  { phase: 0.04, spin: 0.92 },
  { phase: 0.54, spin: 1.08 },
] as const;

const EMERALD_ORBIT_SECONDS = 42;
const EMERALD_SPIN_RADIANS_PER_SECOND = 0.22;
const EMERALD_START_Y = -0.78;
const EMERALD_RISE_Y = 2.3;
const WEBGL_CONTEXT_RESTART_DELAY_MS = 220;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const gemTonePalettes: Record<
  DashboardTornadoGemTone,
  {
    ambient: string;
    dark: string;
    edge: string;
    emissive: string;
    glint: string;
    light: string;
    mid: string;
    rim: string;
    top: string;
    warm: string;
  }
> = {
  green: {
    ambient: "#72f3d0",
    dark: "#045c43",
    edge: "#dffff6",
    emissive: "#023b2f",
    glint: "#ffffff",
    light: "#70f3c8",
    mid: "#0fb981",
    rim: "#25f3c2",
    top: "#eafff6",
    warm: "#f8e68c",
  },
  red: {
    ambient: "#fecdd3",
    dark: "#7f1d1d",
    edge: "#ffe4e6",
    emissive: "#450a0a",
    glint: "#fff7f7",
    light: "#fb7185",
    mid: "#dc2626",
    rim: "#f43f5e",
    top: "#fff1f2",
    warm: "#fecaca",
  },
  yellow: {
    ambient: "#fde68a",
    dark: "#854d0e",
    edge: "#fff7ad",
    emissive: "#422006",
    glint: "#fffdf2",
    light: "#fde047",
    mid: "#facc15",
    rim: "#f59e0b",
    top: "#fffbea",
    warm: "#fef08a",
  },
  blue: {
    ambient: "#bfdbfe",
    dark: "#172554",
    edge: "#dbeafe",
    emissive: "#0f172a",
    glint: "#f8fbff",
    light: "#60a5fa",
    mid: "#2563eb",
    rim: "#38bdf8",
    top: "#eff6ff",
    warm: "#bae6fd",
  },
};

const createEmeraldGeometry = (
  THREE: ThreeModule,
  palette: (typeof gemTonePalettes)[DashboardTornadoGemTone],
) => {
  const ring = (width: number, depth: number, y: number) => [
    [-width * 0.5, y, depth * 0.5],
    [width * 0.5, y, depth * 0.5],
    [width * 0.62, y, 0],
    [width * 0.5, y, -depth * 0.5],
    [-width * 0.5, y, -depth * 0.5],
    [-width * 0.62, y, 0],
  ];

  const table = ring(0.62, 0.32, 0.48);
  const crown = ring(0.96, 0.5, 0.2);
  const girdle = ring(1.16, 0.58, -0.06);
  const pavilion = ring(0.62, 0.3, -0.42);
  const tip = [[0, -0.72, 0]];
  const vertices = [...table, ...crown, ...girdle, ...pavilion, ...tip];
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const color = new THREE.Color();
  const topColor = new THREE.Color(palette.top);
  const lightColor = new THREE.Color(palette.light);
  const midColor = new THREE.Color(palette.mid);
  const darkColor = new THREE.Color(palette.dark);
  const warmColor = new THREE.Color(palette.warm);

  const addTriangle = (
    a: number,
    b: number,
    c: number,
    shade: InstanceType<ThreeModule["Color"]>,
    highlight = 0,
  ) => {
    const va = new THREE.Vector3(...(vertices[a] as [number, number, number]));
    const vb = new THREE.Vector3(...(vertices[b] as [number, number, number]));
    const vc = new THREE.Vector3(...(vertices[c] as [number, number, number]));
    const normal = new THREE.Vector3()
      .subVectors(vb, va)
      .cross(new THREE.Vector3().subVectors(vc, va))
      .normalize();
    color.copy(shade).lerp(warmColor, highlight);

    for (const vertex of [va, vb, vc]) {
      positions.push(vertex.x, vertex.y, vertex.z);
      normals.push(normal.x, normal.y, normal.z);
      colors.push(color.r, color.g, color.b);
    }
  };

  addTriangle(0, 1, 5, topColor, 0.1);
  addTriangle(1, 2, 5, topColor, 0.18);
  addTriangle(2, 3, 5, lightColor, 0.08);
  addTriangle(3, 4, 5, topColor, 0.04);

  for (let index = 0; index < 6; index += 1) {
    const next = (index + 1) % 6;
    const shade = index < 2 ? lightColor : index < 4 ? midColor : darkColor;
    addTriangle(index, next, 6 + next, shade, index === 1 ? 0.22 : 0);
    addTriangle(index, 6 + next, 6 + index, shade, index === 5 ? 0.12 : 0);
  }

  for (let index = 0; index < 6; index += 1) {
    const next = (index + 1) % 6;
    const shade = index % 2 === 0 ? midColor : darkColor;
    addTriangle(6 + index, 6 + next, 12 + next, shade, index === 0 ? 0.12 : 0);
    addTriangle(6 + index, 12 + next, 12 + index, shade, index === 4 ? 0.08 : 0);
  }

  for (let index = 0; index < 6; index += 1) {
    const next = (index + 1) % 6;
    const shade = index % 2 === 0 ? midColor : darkColor;
    addTriangle(12 + index, 12 + next, 18 + next, shade, index === 2 ? 0.12 : 0);
    addTriangle(12 + index, 18 + next, 18 + index, shade);
  }

  for (let index = 0; index < 6; index += 1) {
    const next = (index + 1) % 6;
    addTriangle(18 + index, 18 + next, 24, index % 2 === 0 ? darkColor : midColor);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  return geometry;
};

const createEmeraldGroup = (
  THREE: ThreeModule,
  geometry: BufferGeometry,
  palette: (typeof gemTonePalettes)[DashboardTornadoGemTone],
) => {
  const group = new THREE.Group();
  const material = new THREE.MeshPhysicalMaterial({
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    emissive: new THREE.Color(palette.emissive),
    emissiveIntensity: 0.16,
    metalness: 0.05,
    opacity: 0.9,
    roughness: 0.2,
    transparent: true,
    vertexColors: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = false;
  mesh.receiveShadow = false;

  const edgeMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color(palette.edge),
    opacity: 0.46,
    transparent: true,
  });
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 18), edgeMaterial);

  const glintMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(palette.glint),
    opacity: 0.75,
    transparent: true,
  });
  const glint = new THREE.Mesh(
    new THREE.TetrahedronGeometry(0.075, 0),
    glintMaterial,
  );
  glint.position.set(-0.18, 0.34, 0.22);

  group.add(mesh, edges, glint);
  return group;
};

export default function DashboardTornadoEmeralds3D({
  paused = false,
  tone = "green",
}: {
  paused?: boolean;
  tone?: DashboardTornadoGemTone;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [contextResetToken, setContextResetToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    let contextRestartId = 0;

    const startScene = async () => {
      const THREE = await import("three");
      if (cancelled || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const handleContextLost = (event: Event) => {
        event.preventDefault();
        cleanup();
        if (contextRestartId !== 0) {
          window.clearTimeout(contextRestartId);
        }
        contextRestartId = window.setTimeout(() => {
          setContextResetToken((token) => token + 1);
        }, WEBGL_CONTEXT_RESTART_DELAY_MS);
      };
      canvas.addEventListener("webglcontextlost", handleContextLost);

      const palette = gemTonePalettes[tone] || gemTonePalettes.green;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
      camera.position.set(0, 0.08, 5.2);
      camera.lookAt(0, 0.08, 0);

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(
        Math.min(Math.max(window.devicePixelRatio || 1, 2), 3),
      );
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      scene.add(new THREE.AmbientLight(new THREE.Color(palette.ambient), 1.25));
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
      keyLight.position.set(-1.8, 3.2, 3.4);
      scene.add(keyLight);
      const rimLight = new THREE.PointLight(new THREE.Color(palette.rim), 2.4, 5.8);
      rimLight.position.set(1.4, -0.8, 2.6);
      scene.add(rimLight);
      const warmLight = new THREE.PointLight(new THREE.Color(palette.warm), 0.8, 4.4);
      warmLight.position.set(-1.5, -1.2, 1.6);
      scene.add(warmLight);

      const geometry = createEmeraldGeometry(THREE, palette);
      const emeralds: TornadoEmeraldMesh[] = emeraldOrbiters.map(({ phase, spin }) => {
        const group = createEmeraldGroup(THREE, geometry, palette);
        scene.add(group);
        return { group, phase, spin };
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
      const startedAt = performance.now();
      const render = (time: number) => {
        const seconds = (time - startedAt) / 1000;

        emeralds.forEach(({ group, phase, spin }, index) => {
          const orbitProgress = (seconds / EMERALD_ORBIT_SECONDS + phase) % 1;
          const angle = orbitProgress * Math.PI * 7.8;
          const taper = 1 - orbitProgress;
          const radius = 0.42 + taper * 0.88;
          const y = EMERALD_START_Y + orbitProgress * EMERALD_RISE_Y;
          const x = Math.cos(angle) * radius * 0.74;
          const z = Math.sin(angle) * radius * 0.7;
          const depthScale = 0.78 + ((z + 0.9) / 1.8) * 0.38;
          const entranceFade = clamp01(orbitProgress / 0.14);
          const exitFade = clamp01((1 - orbitProgress) / 0.12);
          const depthFade = 0.68 + (z > 0 ? 0.18 : 0);
          const gemOpacity = Math.min(0.92, depthFade * entranceFade * exitFade);

          group.position.set(x, y, z);
          group.rotation.set(
            0.18 * Math.sin(angle * 0.38),
            seconds * spin * EMERALD_SPIN_RADIANS_PER_SECOND + phase * Math.PI * 2,
            0.08 * Math.cos(angle * 0.46),
          );
          group.scale.setScalar((0.18 + index * 0.008) * depthScale);
          group.visible = gemOpacity > 0.04;
          group.children.forEach((child) => {
            const material = (child as MaterialObject).material;
            if (material && !Array.isArray(material) && "opacity" in material) {
              material.opacity = gemOpacity;
            }
          });
        });

        renderer.render(scene, camera);
        if (paused) return;

        frameId = window.requestAnimationFrame(render);
      };

      if (paused) {
        render(startedAt);
      } else {
        frameId = window.requestAnimationFrame(render);
      }

      cleanup = () => {
        if (frameId !== 0) {
          window.cancelAnimationFrame(frameId);
        }
        canvas.removeEventListener("webglcontextlost", handleContextLost);
        if (contextRestartId !== 0) {
          window.clearTimeout(contextRestartId);
          contextRestartId = 0;
        }
        observer.disconnect();
        emeralds.forEach(({ group }) => {
          group.traverse((object) => {
            const geometry = (object as GeometryObject).geometry;
            if (geometry) geometry.dispose();

            const material = (object as MaterialObject).material;
            if (material) {
              if (Array.isArray(material)) {
                material.forEach((item) => item.dispose());
              } else {
                material.dispose();
              }
            }
          });
        });
        geometry.dispose();
        renderer.dispose();
      };
    };

    startScene();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [contextResetToken, paused, tone]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="dashboard-header-meter-tornado__emeralds-3d"
      data-emerald-count={emeraldOrbiters.length}
      data-emerald-paused={paused ? "true" : "false"}
      data-gem-tone={tone}
    />
  );
}

export function DashboardEmerald3D({
  className = "",
  paused = false,
  tone = "green",
}: {
  className?: string;
  paused?: boolean;
  tone?: DashboardTornadoGemTone;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [contextResetToken, setContextResetToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    let contextRestartId = 0;

    const startScene = async () => {
      const THREE = await import("three");
      if (cancelled || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const handleContextLost = (event: Event) => {
        event.preventDefault();
        cleanup();
        if (contextRestartId !== 0) {
          window.clearTimeout(contextRestartId);
        }
        contextRestartId = window.setTimeout(() => {
          setContextResetToken((token) => token + 1);
        }, WEBGL_CONTEXT_RESTART_DELAY_MS);
      };
      canvas.addEventListener("webglcontextlost", handleContextLost);

      const palette = gemTonePalettes[tone] || gemTonePalettes.green;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
      camera.position.set(0, 0.02, 4.4);
      camera.lookAt(0, 0.02, 0);

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      scene.add(new THREE.AmbientLight(new THREE.Color(palette.ambient), 1.35));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.25);
      keyLight.position.set(-1.5, 2.9, 3.2);
      scene.add(keyLight);

      const rimLight = new THREE.PointLight(new THREE.Color(palette.rim), 2.1, 5);
      rimLight.position.set(1.3, -0.3, 2.3);
      scene.add(rimLight);

      const warmLight = new THREE.PointLight(new THREE.Color(palette.warm), 0.75, 3.8);
      warmLight.position.set(-1.2, -1.1, 1.4);
      scene.add(warmLight);

      const geometry = createEmeraldGeometry(THREE, palette);
      const emerald = createEmeraldGroup(THREE, geometry, palette);
      emerald.scale.setScalar(1.16);
      emerald.rotation.set(0.18, -0.42, -0.08);
      scene.add(emerald);

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
      const startedAt = performance.now();
      const render = (time: number) => {
        const seconds = (time - startedAt) / 1000;
        emerald.rotation.set(
          0.18 + Math.sin(seconds * 0.9) * 0.06,
          -0.42 + seconds * 0.86,
          -0.08 + Math.cos(seconds * 0.7) * 0.05,
        );
        emerald.scale.setScalar(1.12 + Math.sin(seconds * 1.1) * 0.035);
        renderer.render(scene, camera);
        if (paused) return;

        frameId = window.requestAnimationFrame(render);
      };

      if (paused) {
        render(startedAt);
      } else {
        frameId = window.requestAnimationFrame(render);
      }

      cleanup = () => {
        if (frameId !== 0) {
          window.cancelAnimationFrame(frameId);
        }
        canvas.removeEventListener("webglcontextlost", handleContextLost);
        if (contextRestartId !== 0) {
          window.clearTimeout(contextRestartId);
          contextRestartId = 0;
        }
        observer.disconnect();
        emerald.traverse((object) => {
          const objectGeometry = (object as GeometryObject).geometry;
          if (objectGeometry) objectGeometry.dispose();

          const material = (object as MaterialObject).material;
          if (material) {
            if (Array.isArray(material)) {
              material.forEach((item) => item.dispose());
            } else {
              material.dispose();
            }
          }
        });
        geometry.dispose();
        renderer.dispose();
      };
    };

    startScene();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [contextResetToken, paused, tone]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`dashboard-header-emerald-3d ${className}`}
      data-emerald-paused={paused ? "true" : "false"}
      data-gem-tone={tone}
      height={64}
      style={{
        display: "block",
        height: "100%",
        maxHeight: "100%",
        maxWidth: "100%",
        width: "100%",
      }}
      width={64}
    />
  );
}

export function DashboardEmeraldCluster3D({
  className = "",
  paused = false,
}: {
  className?: string;
  paused?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [contextResetToken, setContextResetToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    let contextRestartId = 0;

    const startScene = async () => {
      const THREE = await import("three");
      if (cancelled || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const handleContextLost = (event: Event) => {
        event.preventDefault();
        cleanup();
        if (contextRestartId !== 0) {
          window.clearTimeout(contextRestartId);
        }
        contextRestartId = window.setTimeout(() => {
          setContextResetToken((token) => token + 1);
        }, WEBGL_CONTEXT_RESTART_DELAY_MS);
      };
      canvas.addEventListener("webglcontextlost", handleContextLost);

      const palette = gemTonePalettes.green;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 20);
      camera.position.set(0, 0.1, 5);
      camera.lookAt(0, 0.02, 0);

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      scene.add(new THREE.AmbientLight(new THREE.Color(palette.ambient), 1.28));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.35);
      keyLight.position.set(-1.7, 3, 3.4);
      scene.add(keyLight);

      const fillLight = new THREE.PointLight(new THREE.Color(palette.light), 2.3, 5);
      fillLight.position.set(1.2, -0.25, 2.5);
      scene.add(fillLight);

      const rimLight = new THREE.PointLight(new THREE.Color(palette.rim), 2.7, 5.8);
      rimLight.position.set(1.6, 1.1, 2.4);
      scene.add(rimLight);

      const cluster = new THREE.Group();
      scene.add(cluster);

      const geometry = createEmeraldGeometry(THREE, palette);
      const crystalSpecs: Array<{
        position: VectorTuple;
        rotation: VectorTuple;
        scale: VectorTuple;
        spin: number;
      }> = [
        {
          position: [-0.08, 0.03, 0.05],
          rotation: [0.04, -0.35, -0.03],
          scale: [0.58, 1.08, 0.58],
          spin: 0.54,
        },
        {
          position: [-0.45, -0.1, 0.13],
          rotation: [0.2, -0.78, 0.28],
          scale: [0.38, 0.74, 0.38],
          spin: 0.4,
        },
        {
          position: [0.42, -0.12, 0.02],
          rotation: [0.12, 0.62, -0.24],
          scale: [0.34, 0.68, 0.34],
          spin: 0.46,
        },
        {
          position: [-0.18, -0.3, 0.36],
          rotation: [0.34, -1.12, 0.58],
          scale: [0.26, 0.48, 0.26],
          spin: 0.34,
        },
        {
          position: [0.2, -0.31, 0.28],
          rotation: [0.3, 1.02, -0.44],
          scale: [0.24, 0.42, 0.24],
          spin: 0.3,
        },
      ];

      const crystals = crystalSpecs.map((spec) => {
        const crystal = createEmeraldGroup(THREE, geometry, palette);
        crystal.position.set(...spec.position);
        crystal.rotation.set(...spec.rotation);
        crystal.scale.set(...spec.scale);
        cluster.add(crystal);
        return { crystal, spec };
      });

      const baseMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.8,
        clearcoatRoughness: 0.22,
        color: new THREE.Color("#0f8f68"),
        emissive: new THREE.Color("#06372d"),
        emissiveIntensity: 0.22,
        metalness: 0.02,
        opacity: 0.74,
        roughness: 0.28,
        transparent: true,
      });
      const baseGeometry = new THREE.TetrahedronGeometry(0.32, 0);
      const baseStones: Array<{
        position: VectorTuple;
        rotation: VectorTuple;
        scale: VectorTuple;
      }> = [
        { position: [-0.42, -0.64, 0.22], rotation: [0.2, 0.7, 0.24], scale: [1.1, 0.42, 0.62] },
        { position: [-0.05, -0.66, 0.12], rotation: [-0.18, -0.32, 0.58], scale: [1.35, 0.48, 0.7] },
        { position: [0.38, -0.63, 0.18], rotation: [0.15, -0.82, -0.18], scale: [1.0, 0.42, 0.6] },
      ];

      baseStones.forEach((spec) => {
        const stone = new THREE.Mesh(baseGeometry, baseMaterial);
        stone.position.set(...spec.position);
        stone.rotation.set(...spec.rotation);
        stone.scale.set(...spec.scale);
        cluster.add(stone);
      });

      const glow = new THREE.Mesh(
        new THREE.CircleGeometry(1.05, 40),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(palette.rim),
          opacity: 0.18,
          transparent: true,
        }),
      );
      glow.position.set(0, -0.72, -0.1);
      glow.rotation.x = -Math.PI / 2;
      glow.scale.set(1.1, 0.42, 1);
      cluster.add(glow);

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
      const startedAt = performance.now();
      const render = (time: number) => {
        const seconds = (time - startedAt) / 1000;
        cluster.rotation.set(
          -0.12 + Math.sin(seconds * 0.72) * 0.035,
          -0.34 + Math.sin(seconds * 0.38) * 0.16,
          0.05 + Math.cos(seconds * 0.6) * 0.025,
        );
        cluster.position.y = Math.sin(seconds * 0.82) * 0.025;

        crystals.forEach(({ crystal, spec }, index) => {
          crystal.rotation.y =
            spec.rotation[1] + Math.sin(seconds * spec.spin + index) * 0.16;
          crystal.rotation.z =
            spec.rotation[2] + Math.cos(seconds * (spec.spin + 0.08)) * 0.035;
        });

        renderer.render(scene, camera);
        if (paused) return;

        frameId = window.requestAnimationFrame(render);
      };

      if (paused) {
        render(startedAt);
      } else {
        frameId = window.requestAnimationFrame(render);
      }

      cleanup = () => {
        if (frameId !== 0) {
          window.cancelAnimationFrame(frameId);
        }
        canvas.removeEventListener("webglcontextlost", handleContextLost);
        if (contextRestartId !== 0) {
          window.clearTimeout(contextRestartId);
          contextRestartId = 0;
        }
        observer.disconnect();
        cluster.traverse((object) => {
          const objectGeometry = (object as GeometryObject).geometry;
          if (objectGeometry && objectGeometry !== geometry) {
            objectGeometry.dispose();
          }

          const material = (object as MaterialObject).material;
          if (material) {
            if (Array.isArray(material)) {
              material.forEach((item) => item.dispose());
            } else {
              material.dispose();
            }
          }
        });
        geometry.dispose();
        renderer.dispose();
      };
    };

    startScene();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [contextResetToken, paused]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`dashboard-emerald-cluster-3d ${className}`}
      data-emerald-paused={paused ? "true" : "false"}
      height={192}
      style={{
        display: "block",
      }}
      width={192}
    />
  );
}

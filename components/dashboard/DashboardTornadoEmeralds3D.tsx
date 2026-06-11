"use client";

import { useEffect, useRef, useState } from "react";
import type {
  BufferGeometry,
  Group,
  Material,
  Object3D,
} from "three";
import {
  createDashboardWebGlRenderer,
  loadDashboardThree,
  setDashboardWebGlCanvasActive,
  waitForDashboardWebGlStart,
} from "./dashboardWebGlRenderer";

type ThreeModule = typeof import("three");
export type DashboardTornadoGemTone = "green" | "red" | "yellow" | "blue";

type TornadoEmeraldMesh = {
  group: Group;
  phase: number;
  spin: number;
};

type TornadoParticleSpec = {
  phase: number;
  progress: number;
  radius: number;
  speed: number;
  twist: number;
  wobble: number;
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
] as const;

const EMERALD_ORBIT_SECONDS = 82;
const EMERALD_SPIN_RADIANS_PER_SECOND = 0.09;
const EMERALD_START_Y = -0.78;
const EMERALD_RISE_Y = 2.3;
const TORNADO_MIST_PARTICLE_COUNT = 260;
const TORNADO_SPARK_PARTICLE_COUNT = 64;
const TORNADO_STREAM_COUNT = 4;
const TORNADO_STREAM_SEGMENTS = 92;
const TORNADO_WEBGL_MOTION_RATE = 0.27;
const WEBGL_CONTEXT_RESTART_DELAY_MS = 220;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const seededNoise = (index: number, salt: number) => {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
};

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
  options: { sharpTop?: boolean } = {},
) => {
  const sharpTop = options.sharpTop ?? false;
  const segmentCount = 8;
  const ring = (width: number, depth: number, y: number, phase = Math.PI / 8) =>
    Array.from({ length: segmentCount }, (_, index) => {
      const angle = phase + (index / segmentCount) * Math.PI * 2;
      const shoulder = index % 2 === 0 ? 1 : 0.92;
      return [
        Math.cos(angle) * width * 0.5 * shoulder,
        y,
        Math.sin(angle) * depth * 0.5 * (index % 2 === 0 ? 0.9 : 1),
      ];
    });

  const tableY = sharpTop ? 0.64 : 0.5;
  const table = ring(
    sharpTop ? 0.28 : 0.48,
    sharpTop ? 0.2 : 0.34,
    tableY,
  );
  const crown = ring(
    sharpTop ? 0.96 : 0.92,
    sharpTop ? 0.64 : 0.62,
    sharpTop ? 0.18 : 0.2,
    Math.PI / 8 + Math.PI / segmentCount / 2,
  );
  const girdle = ring(1.18, 0.78, -0.08);
  const pavilion = ring(0.5, 0.36, -0.46, Math.PI / 8 + Math.PI / segmentCount / 2);
  const topCenterIndex = segmentCount * 4;
  const tipIndex = topCenterIndex + 1;
  const vertices = [
    ...table,
    ...crown,
    ...girdle,
    ...pavilion,
    [0, tableY, 0],
    [0, -0.84, 0],
  ];
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

  for (let index = 0; index < segmentCount; index += 1) {
    const next = (index + 1) % segmentCount;
    addTriangle(topCenterIndex, index, next, topColor, index % 3 === 1 ? 0.2 : 0.08);
  }

  for (let index = 0; index < segmentCount; index += 1) {
    const next = (index + 1) % segmentCount;
    const shade =
      index % 4 === 0
        ? lightColor
        : index % 4 === 1
          ? topColor
          : index % 4 === 2
            ? midColor
            : darkColor;
    addTriangle(index, next, segmentCount + next, shade, index === 1 ? 0.24 : 0.04);
    addTriangle(index, segmentCount + next, segmentCount + index, shade, index === 6 ? 0.16 : 0);
  }

  for (let index = 0; index < segmentCount; index += 1) {
    const next = (index + 1) % segmentCount;
    const shade =
      index % 4 === 0
        ? midColor
        : index % 4 === 1
          ? lightColor
          : index % 4 === 2
            ? darkColor
            : midColor;
    addTriangle(segmentCount + index, segmentCount + next, segmentCount * 2 + next, shade, index === 0 ? 0.16 : 0);
    addTriangle(segmentCount + index, segmentCount * 2 + next, segmentCount * 2 + index, shade, index === 5 ? 0.1 : 0);
  }

  for (let index = 0; index < segmentCount; index += 1) {
    const next = (index + 1) % segmentCount;
    const shade = index % 2 === 0 ? midColor : darkColor;
    addTriangle(segmentCount * 2 + index, segmentCount * 2 + next, segmentCount * 3 + next, shade, index === 2 ? 0.14 : 0);
    addTriangle(segmentCount * 2 + index, segmentCount * 3 + next, segmentCount * 3 + index, shade);
  }

  for (let index = 0; index < segmentCount; index += 1) {
    const next = (index + 1) % segmentCount;
    addTriangle(
      segmentCount * 3 + index,
      segmentCount * 3 + next,
      tipIndex,
      index % 2 === 0 ? darkColor : midColor,
      index === 1 ? 0.08 : 0,
    );
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
    depthTest: true,
    depthWrite: false,
    emissive: new THREE.Color(palette.emissive),
    emissiveIntensity: 0.16,
    metalness: 0.05,
    opacity: 0.96,
    roughness: 0.2,
    side: THREE.DoubleSide,
    transparent: true,
    vertexColors: true,
  });
  material.forceSinglePass = true;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.renderOrder = 2;

  const edgeMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color(palette.edge),
    depthTest: true,
    depthWrite: false,
    opacity: 0.46,
    transparent: true,
  });
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 18), edgeMaterial);
  edges.renderOrder = 3;

  const glintMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(palette.glint),
    depthTest: true,
    depthWrite: false,
    opacity: 0.75,
    transparent: true,
  });
  const glint = new THREE.Mesh(
    new THREE.TetrahedronGeometry(0.075, 0),
    glintMaterial,
  );
  glint.position.set(-0.18, 0.34, 0.22);
  glint.renderOrder = 4;

  group.add(mesh, edges, glint);
  return group;
};

const createRoundedPanelGeometry = (
  THREE: ThreeModule,
  width: number,
  height: number,
  depth: number,
  radius: number,
  bevelSize: number,
) => {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const cornerRadius = Math.min(radius, halfWidth, halfHeight);
  const shape = new THREE.Shape();

  shape.moveTo(-halfWidth + cornerRadius, -halfHeight);
  shape.lineTo(halfWidth - cornerRadius, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + cornerRadius);
  shape.lineTo(halfWidth, halfHeight - cornerRadius);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - cornerRadius, halfHeight);
  shape.lineTo(-halfWidth + cornerRadius, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - cornerRadius);
  shape.lineTo(-halfWidth, -halfHeight + cornerRadius);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + cornerRadius, -halfHeight);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: true,
    bevelSegments: 7,
    bevelSize,
    bevelThickness: bevelSize * 1.25,
    curveSegments: 16,
    depth,
    steps: 1,
  });
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
};

export default function DashboardTornadoEmeralds3D({
  paused = false,
  tone = "green",
}: {
  paused?: boolean;
  tone?: DashboardTornadoGemTone;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(paused);
  const toneRef = useRef(tone);
  const [contextResetToken, setContextResetToken] = useState(0);

  useEffect(() => {
    pausedRef.current = paused;
    toneRef.current = tone;
  }, [paused, tone]);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    let contextRestartId = 0;

    const startScene = async () => {
      await waitForDashboardWebGlStart();
      if (cancelled || !canvasRef.current) return;

      const THREE = await loadDashboardThree();
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

      let currentTone = toneRef.current;
      let palette = gemTonePalettes[currentTone] || gemTonePalettes.green;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 22);
      camera.position.set(0, 0.08, 5.05);
      camera.lookAt(0, 0.02, 0);

      const renderer = createDashboardWebGlRenderer(THREE, canvas, {
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
      });
      if (!renderer) {
        canvas.removeEventListener("webglcontextlost", handleContextLost);
        return;
      }
      renderer.setClearColor(0x000000, 0);
      renderer.setClearAlpha(0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const ambientLight = new THREE.AmbientLight(new THREE.Color(palette.ambient), 1.25);
      scene.add(ambientLight);
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
      keyLight.position.set(-1.8, 3.2, 3.4);
      scene.add(keyLight);
      const rimLight = new THREE.PointLight(new THREE.Color(palette.rim), 2.4, 5.8);
      rimLight.position.set(1.4, -0.8, 2.6);
      scene.add(rimLight);
      const warmLight = new THREE.PointLight(new THREE.Color(palette.warm), 0.8, 4.4);
      warmLight.position.set(-1.5, -1.2, 1.6);
      scene.add(warmLight);

      const tornadoGroup = new THREE.Group();
      tornadoGroup.position.set(0, -0.04, 0);
      scene.add(tornadoGroup);

      const disposables: Array<BufferGeometry | Material> = [];
      const funnelMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color(palette.mid),
        depthWrite: false,
        opacity: 0.32,
        transparent: true,
        wireframe: true,
      });
      const funnelGeometry = new THREE.CylinderGeometry(
        0.22,
        1.16,
        2.62,
        96,
        12,
        true,
      );
      const funnel = new THREE.Mesh(funnelGeometry, funnelMaterial);
      funnel.position.set(0, 0.04, -0.06);
      funnel.scale.set(0.88, 1, 0.6);
      funnel.renderOrder = 1;
      tornadoGroup.add(funnel);
      disposables.push(funnelGeometry, funnelMaterial);

      const floorRings = [0.62, 0.94, 1.24].map((radius, index) => {
        const ringMaterial = new THREE.MeshBasicMaterial({
          blending: THREE.AdditiveBlending,
          color: new THREE.Color(index === 2 ? palette.warm : palette.rim),
          depthWrite: false,
          opacity: 0.34 - index * 0.042,
          transparent: true,
        });
        const ringGeometry = new THREE.TorusGeometry(radius, 0.012, 8, 112);
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.set(0, -1.18 + index * 0.018, 0.03);
        ring.rotation.x = Math.PI / 2;
        ring.scale.set(1, 0.54 + index * 0.06, 1);
        ring.renderOrder = 0;
        tornadoGroup.add(ring);
        disposables.push(ringGeometry, ringMaterial);
        return {
          material: ringMaterial,
          mesh: ring,
          phase: index * 1.3,
          speed: 0.58 + index * 0.18,
        };
      });

      const streamGroup = new THREE.Group();
      tornadoGroup.add(streamGroup);
      const spiralStreams = Array.from({ length: TORNADO_STREAM_COUNT }, (_, index) => {
        const phase = (index / TORNADO_STREAM_COUNT) * Math.PI * 2;
        const streamPoints = Array.from(
          { length: TORNADO_STREAM_SEGMENTS + 1 },
          (_item, segmentIndex) => {
            const progress = segmentIndex / TORNADO_STREAM_SEGMENTS;
            const taper = 1 - progress;
            const radius =
              0.2 + taper * (0.96 + index * 0.035) + Math.sin(progress * Math.PI) * 0.08;
            const angle =
              progress * Math.PI * (7.2 + index * 0.38) +
              phase +
              Math.sin(progress * Math.PI * 2) * 0.18;
            return new THREE.Vector3(
              Math.cos(angle) * radius * 0.78,
              -1.08 + progress * 2.42,
              Math.sin(angle) * radius * 0.56,
            );
          },
        );
        const streamGeometry = new THREE.BufferGeometry().setFromPoints(streamPoints);
        const streamMaterial = new THREE.LineBasicMaterial({
          blending: THREE.AdditiveBlending,
          color: new THREE.Color(index % 2 === 0 ? palette.light : palette.warm),
          depthWrite: false,
          opacity: index % 2 === 0 ? 0.72 : 0.5,
          transparent: true,
        });
        const stream = new THREE.Line(streamGeometry, streamMaterial);
        stream.renderOrder = 2;
        streamGroup.add(stream);
        disposables.push(streamGeometry, streamMaterial);
        return {
          index,
          material: streamMaterial,
          phase,
          speed: 0.42 + index * 0.085,
          stream,
        };
      });

      const createParticleSpecs = (
        count: number,
        salt: number,
        speedBase: number,
      ): TornadoParticleSpec[] =>
        Array.from({ length: count }, (_item, index) => ({
          phase: seededNoise(index, salt) * Math.PI * 2,
          progress: seededNoise(index, salt + 1),
          radius: 0.74 + seededNoise(index, salt + 2) * 0.46,
          speed: speedBase + seededNoise(index, salt + 3) * 0.13,
          twist: seededNoise(index, salt + 4) * 1.9,
          wobble: seededNoise(index, salt + 5) * 0.34,
        }));

      const mistSpecs = createParticleSpecs(TORNADO_MIST_PARTICLE_COUNT, 2, 0.028);
      const sparkSpecs = createParticleSpecs(TORNADO_SPARK_PARTICLE_COUNT, 9, 0.038);
      const mistPositions = new Float32Array(TORNADO_MIST_PARTICLE_COUNT * 3);
      const mistColors = new Float32Array(TORNADO_MIST_PARTICLE_COUNT * 3);
      const sparkPositions = new Float32Array(TORNADO_SPARK_PARTICLE_COUNT * 3);
      const sparkColors = new Float32Array(TORNADO_SPARK_PARTICLE_COUNT * 3);

      const mistGeometry = new THREE.BufferGeometry();
      const mistPositionAttribute = new THREE.BufferAttribute(mistPositions, 3);
      const mistColorAttribute = new THREE.BufferAttribute(mistColors, 3);
      mistGeometry.setAttribute("position", mistPositionAttribute);
      mistGeometry.setAttribute("color", mistColorAttribute);
      const sparkGeometry = new THREE.BufferGeometry();
      const sparkPositionAttribute = new THREE.BufferAttribute(sparkPositions, 3);
      const sparkColorAttribute = new THREE.BufferAttribute(sparkColors, 3);
      sparkGeometry.setAttribute("position", sparkPositionAttribute);
      sparkGeometry.setAttribute("color", sparkColorAttribute);

      const particleColor = new THREE.Color();
      const mistBaseColor = new THREE.Color(palette.mid);
      const mistLightColor = new THREE.Color(palette.light);
      const sparkBaseColor = new THREE.Color(palette.rim);
      const sparkWarmColor = new THREE.Color(palette.warm);

      const updateParticleColors = () => {
        mistBaseColor.set(palette.mid);
        mistLightColor.set(palette.light);
        sparkBaseColor.set(palette.rim);
        sparkWarmColor.set(palette.warm);

        mistSpecs.forEach((_spec, index) => {
          const offset = index * 3;
          particleColor
            .copy(mistBaseColor)
            .lerp(mistLightColor, 0.24 + seededNoise(index, 12) * 0.58);
          mistColors[offset] = particleColor.r;
          mistColors[offset + 1] = particleColor.g;
          mistColors[offset + 2] = particleColor.b;
        });

        sparkSpecs.forEach((_spec, index) => {
          const offset = index * 3;
          particleColor
            .copy(sparkBaseColor)
            .lerp(sparkWarmColor, 0.18 + seededNoise(index, 18) * 0.64);
          sparkColors[offset] = particleColor.r;
          sparkColors[offset + 1] = particleColor.g;
          sparkColors[offset + 2] = particleColor.b;
        });

        mistColorAttribute.needsUpdate = true;
        sparkColorAttribute.needsUpdate = true;
      };

      updateParticleColors();

      const disposeEmeraldMeshes = (emeralds: TornadoEmeraldMesh[]) => {
        emeralds.forEach(({ group }) => {
          tornadoGroup.remove(group);
          group.traverse((object) => {
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
        });
      };

      let geometry: BufferGeometry | null = null;
      let emeralds: TornadoEmeraldMesh[] = [];
      const buildEmeraldMeshes = () => {
        geometry = createEmeraldGeometry(THREE, palette);
        emeralds = emeraldOrbiters.map(({ phase, spin }) => {
          const group = createEmeraldGroup(THREE, geometry as BufferGeometry, palette);
          tornadoGroup.add(group);
          return { group, phase, spin };
        });
      };
      buildEmeraldMeshes();

      const applyTone = (nextTone: DashboardTornadoGemTone) => {
        currentTone = nextTone;
        palette = gemTonePalettes[currentTone] || gemTonePalettes.green;
        ambientLight.color.set(palette.ambient);
        rimLight.color.set(palette.rim);
        warmLight.color.set(palette.warm);
        funnelMaterial.color.set(palette.mid);
        floorRings.forEach(({ material }, index) => {
          material.color.set(index === 2 ? palette.warm : palette.rim);
        });
        spiralStreams.forEach(({ index, material }) => {
          material.color.set(index % 2 === 0 ? palette.light : palette.warm);
        });
        updateParticleColors();
        disposeEmeraldMeshes(emeralds);
        if (geometry) {
          geometry.dispose();
          geometry = null;
        }
        buildEmeraldMeshes();
      };

      const mistMaterial = new THREE.PointsMaterial({
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.96,
        size: 0.058,
        sizeAttenuation: true,
        transparent: true,
        vertexColors: true,
      });
      const sparkMaterial = new THREE.PointsMaterial({
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 1,
        size: 0.084,
        sizeAttenuation: true,
        transparent: true,
        vertexColors: true,
      });
      const mistParticles = new THREE.Points(mistGeometry, mistMaterial);
      const sparkParticles = new THREE.Points(sparkGeometry, sparkMaterial);
      mistParticles.renderOrder = 3;
      sparkParticles.renderOrder = 4;
      tornadoGroup.add(mistParticles, sparkParticles);
      disposables.push(mistGeometry, mistMaterial, sparkGeometry, sparkMaterial);

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
      let previousFrameTime = performance.now();
      let elapsedSeconds = 0;

      const updateParticlePositions = (
        positions: Float32Array,
        specs: TornadoParticleSpec[],
        time: number,
        positionAttribute: InstanceType<ThreeModule["BufferAttribute"]>,
        radiusBoost: number,
      ) => {
        specs.forEach((spec, index) => {
          const travel = (spec.progress + time * spec.speed) % 1;
          const taper = 1 - travel;
          const radius =
            (0.18 + taper * 1.02) * spec.radius +
            Math.sin(travel * Math.PI) * radiusBoost;
          const angle =
            spec.phase +
            travel * Math.PI * (8.4 + spec.twist) +
            time * (1.08 + spec.speed * 8);
          const wobble = Math.sin(time * 1.7 + spec.phase * 1.6) * spec.wobble;
          const offset = index * 3;

          positions[offset] = Math.cos(angle) * radius * 0.78;
          positions[offset + 1] = -1.12 + travel * 2.42 + wobble * 0.16;
          positions[offset + 2] = Math.sin(angle) * radius * 0.56;
        });
        positionAttribute.needsUpdate = true;
      };

      const render = (time: number) => {
        const nextTone = toneRef.current;
        if (nextTone !== currentTone) {
          applyTone(nextTone);
        }

        const frameDeltaSeconds = Math.min(
          0.05,
          Math.max(0, (time - previousFrameTime) / 1000),
        );
        previousFrameTime = time;
        if (!pausedRef.current) {
          elapsedSeconds += frameDeltaSeconds;
        }
        const seconds = elapsedSeconds;
        const tornadoSeconds = seconds * TORNADO_WEBGL_MOTION_RATE;

        tornadoGroup.rotation.z = Math.sin(tornadoSeconds * 0.72) * 0.018;
        funnel.rotation.y = tornadoSeconds * 0.95;
        funnelMaterial.opacity = 0.28 + Math.sin(tornadoSeconds * 1.3) * 0.05;
        streamGroup.rotation.y = tornadoSeconds * 1.15;
        streamGroup.position.x = Math.sin(tornadoSeconds * 0.9) * 0.035;
        mistParticles.rotation.y = tornadoSeconds * 0.56;
        sparkParticles.rotation.y = tornadoSeconds * 0.82;

        spiralStreams.forEach(({ material, phase, speed, stream }) => {
          stream.rotation.y = tornadoSeconds * speed + phase * 0.22;
          stream.rotation.z = Math.sin(tornadoSeconds * 0.86 + phase) * 0.024;
          material.opacity = 0.54 + Math.sin(tornadoSeconds * 1.18 + phase) * 0.14;
        });

        floorRings.forEach(({ material, mesh, phase, speed }) => {
          const pulse = 1 + Math.sin(tornadoSeconds * speed + phase) * 0.045;
          mesh.scale.x = pulse;
          mesh.scale.y =
            0.54 + Math.sin(tornadoSeconds * (speed + 0.14) + phase) * 0.04;
          material.opacity = 0.18 + Math.sin(tornadoSeconds * speed + phase) * 0.05;
        });

        updateParticlePositions(
          mistPositions,
          mistSpecs,
          tornadoSeconds,
          mistPositionAttribute,
          0.16,
        );
        updateParticlePositions(
          sparkPositions,
          sparkSpecs,
          tornadoSeconds * 1.08,
          sparkPositionAttribute,
          0.22,
        );

        emeralds.forEach(({ group, phase, spin }, index) => {
          const orbitProgress = (seconds / EMERALD_ORBIT_SECONDS + phase) % 1;
          const angle = orbitProgress * Math.PI * 8.4;
          const taper = 1 - orbitProgress;
          const radius = 0.36 + taper * 0.94;
          const y = EMERALD_START_Y + orbitProgress * EMERALD_RISE_Y;
          const x = Math.cos(angle) * radius * 0.78;
          const z = Math.sin(angle) * radius * 0.62;
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
          group.scale.setScalar((0.15 + (index % 4) * 0.008) * depthScale);
          group.visible = gemOpacity > 0.04;
          group.children.forEach((child) => {
            const material = (child as MaterialObject).material;
            if (material && !Array.isArray(material) && "opacity" in material) {
              material.opacity = gemOpacity;
            }
          });
        });

        renderer.render(scene, camera);
        frameId = window.requestAnimationFrame(render);
      };

      frameId = window.requestAnimationFrame(render);

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
        disposeEmeraldMeshes(emeralds);
        if (geometry) geometry.dispose();
        disposables.forEach((disposable) => disposable.dispose());
        renderer.dispose();
      };
    };

    startScene();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [contextResetToken]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="dashboard-header-meter-tornado__emeralds-3d"
      data-emerald-count={emeraldOrbiters.length}
      data-emerald-paused={paused ? "true" : "false"}
      data-gem-tone={tone}
      data-particle-count={TORNADO_MIST_PARTICLE_COUNT + TORNADO_SPARK_PARTICLE_COUNT}
      data-tornado-renderer="webgl"
      style={{
        bottom: "auto",
        filter:
          "drop-shadow(0 0 0.44rem var(--dashboard-meter-tornado-gem-glow-soft)) drop-shadow(0 0 1rem var(--dashboard-meter-tornado-gem-glow)) drop-shadow(0 0 1.75rem rgba(125, 211, 252, 0.22))",
        height: "112%",
        left: "-6%",
        mixBlendMode: "screen",
        opacity: 1,
        pointerEvents: "none",
        position: "absolute",
        right: "auto",
        top: "-6%",
        width: "112%",
        zIndex: 5,
      }}
    />
  );
}

const DEFAULT_SHARED_GEM_TONES: readonly DashboardTornadoGemTone[] = [
  "blue",
  "green",
  "yellow",
  "red",
];

const isDashboardGemTone = (tone: string): tone is DashboardTornadoGemTone =>
  tone in gemTonePalettes;

export function DashboardGemStage3D({
  className = "",
  onProminentToneChange,
  paused = false,
  tones = DEFAULT_SHARED_GEM_TONES,
  vaultOpen = false,
  variant = "trigger",
}: {
  className?: string;
  onProminentToneChange?: (tone: DashboardTornadoGemTone) => void;
  paused?: boolean;
  tones?: readonly DashboardTornadoGemTone[];
  vaultOpen?: boolean;
  variant?: "reserves" | "trigger";
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [contextResetToken, setContextResetToken] = useState(0);
  const tonesKey = tones.join("|");
  const onProminentToneChangeRef = useRef(onProminentToneChange);
  const pausedRef = useRef(paused);
  const prominentToneRef = useRef<DashboardTornadoGemTone | null>(null);
  const vaultOpenRef = useRef(vaultOpen);

  useEffect(() => {
    onProminentToneChangeRef.current = onProminentToneChange;
  }, [onProminentToneChange]);

  useEffect(() => {
    pausedRef.current = paused;
    setDashboardWebGlCanvasActive(
      canvasRef.current,
      !paused || vaultOpenRef.current,
    );
  }, [paused]);

  useEffect(() => {
    vaultOpenRef.current = vaultOpen;
    setDashboardWebGlCanvasActive(
      canvasRef.current,
      !pausedRef.current || vaultOpen,
    );
  }, [vaultOpen]);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    let contextRestartId = 0;

    const startScene = async () => {
      await waitForDashboardWebGlStart();
      if (cancelled || !canvasRef.current) return;

      const THREE = await loadDashboardThree();
      if (cancelled || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const stageTones = tonesKey
        .split("|")
        .filter(isDashboardGemTone);
      const resolvedTones =
        stageTones.length > 0 ? stageTones : [...DEFAULT_SHARED_GEM_TONES];
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        variant === "reserves" ? 42 : 34,
        1,
        0.1,
        24,
      );
      camera.position.set(0, variant === "reserves" ? -0.72 : 0.03, 6.34);
      camera.lookAt(0, variant === "reserves" ? -0.98 : 0, 0);

      const renderer = createDashboardWebGlRenderer(THREE, canvas, {
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      });
      if (!renderer) return;
      setDashboardWebGlCanvasActive(
        canvas,
        !pausedRef.current || vaultOpenRef.current,
      );
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, variant === "reserves" ? 1.28 : 1.15),
      );
      renderer.outputColorSpace = THREE.SRGBColorSpace;

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

      scene.add(new THREE.AmbientLight(0xffffff, variant === "reserves" ? 1.18 : 1.05));
      const keyLight = new THREE.DirectionalLight(0xffffff, variant === "reserves" ? 2.4 : 1.95);
      keyLight.position.set(-1.7, 3, 3.6);
      scene.add(keyLight);
      const rimLight = new THREE.PointLight(0x5eead4, variant === "reserves" ? 2.6 : 1.8, 6);
      rimLight.position.set(1.9, 0.15, 2.8);
      scene.add(rimLight);
      const warmLight = new THREE.PointLight(0xfef3c7, variant === "reserves" ? 1.1 : 0.62, 4.2);
      warmLight.position.set(-2, -1.2, 2.2);
      scene.add(warmLight);

      const geometries = new Map<string, BufferGeometry>();
      const getGeometry = (tone: DashboardTornadoGemTone, sharpTop = false) => {
        const key = `${tone}:${sharpTop ? "sharp" : "normal"}`;
        const existing = geometries.get(key);
        if (existing) return existing;

        const geometry = createEmeraldGeometry(THREE, gemTonePalettes[tone], {
          sharpTop,
        });
        geometries.set(key, geometry);
        return geometry;
      };

      const setGroupOpacity = (group: Group, opacity: number) => {
        group.traverse((object) => {
          const material = (object as MaterialObject).material;
          const applyOpacity = (item: Material) => {
            if (!("opacity" in item)) return;
            const baseOpacity =
              typeof item.userData.dashboardBaseOpacity === "number"
                ? item.userData.dashboardBaseOpacity
                : item.opacity;
            item.userData.dashboardBaseOpacity = baseOpacity;
            item.opacity = Math.max(0, Math.min(1, baseOpacity * opacity));
          };

          if (Array.isArray(material)) {
            material.forEach(applyOpacity);
          } else if (material) {
            applyOpacity(material);
          }
        });
      };
      const setGroupRenderOrder = (group: Group, renderOrder: number) => {
        group.traverse((object) => {
          object.renderOrder = renderOrder;
        });
      };

      const animatedGems: Array<{
        group: Group;
        phase: number;
        spin: number;
        tone: DashboardTornadoGemTone;
      }> = [];
      const clusterGems: Array<{
        basePosition: VectorTuple;
        baseRotation: VectorTuple;
        group: Group;
        spin: number;
      }> = [];
      let reservesVaultGroup: Group | null = null;
      let reservesVaultDoorGroup: Group | null = null;
      let reservesVaultDialGroup: Group | null = null;

      if (variant === "reserves") {
        const chamberGroup = new THREE.Group();
        chamberGroup.position.set(0.18, 0.08, -0.2);
        chamberGroup.rotation.set(-0.05, 0.02, 0);

        const chamberGlassMaterial = new THREE.MeshPhysicalMaterial({
          clearcoat: 1,
          clearcoatRoughness: 0.08,
          color: 0x8fe9ff,
          depthWrite: false,
          emissive: new THREE.Color(0x0b5b75),
          emissiveIntensity: 0.16,
          metalness: 0.08,
          opacity: 0.24,
          roughness: 0.18,
          transparent: true,
        });
        const chamberWarmMaterial = new THREE.MeshBasicMaterial({
          color: 0xfde68a,
          depthWrite: false,
          opacity: 0.18,
          transparent: true,
        });
        const safeMetalMaterial = new THREE.MeshPhysicalMaterial({
          clearcoat: 1,
          clearcoatRoughness: 0.18,
          color: 0x0f3f5f,
          emissive: new THREE.Color(0x06162a),
          emissiveIntensity: 0.12,
          metalness: 0.68,
          roughness: 0.28,
        });
        const safeFrameMaterial = new THREE.MeshPhysicalMaterial({
          clearcoat: 1,
          clearcoatRoughness: 0.12,
          color: 0x55c7df,
          emissive: new THREE.Color(0x092b45),
          emissiveIntensity: 0.18,
          metalness: 0.78,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
          roughness: 0.2,
        });
        const safeDoorMaterial = new THREE.MeshPhysicalMaterial({
          clearcoat: 1,
          clearcoatRoughness: 0.1,
          color: 0x155e75,
          emissive: new THREE.Color(0x062238),
          emissiveIntensity: 0.18,
          metalness: 0.56,
          roughness: 0.24,
        });
        const safeGlassMaterial = new THREE.MeshPhysicalMaterial({
          clearcoat: 1,
          clearcoatRoughness: 0.04,
          color: 0x5eead4,
          depthWrite: false,
          emissive: new THREE.Color(0x0e7490),
          emissiveIntensity: 0.2,
          metalness: 0,
          opacity: 0.2,
          roughness: 0.04,
          transparent: true,
        });
        const safeInteriorMaterial = new THREE.MeshPhysicalMaterial({
          clearcoat: 0.7,
          clearcoatRoughness: 0.18,
          color: 0x031325,
          emissive: new THREE.Color(0x0f766e),
          emissiveIntensity: 0.28,
          metalness: 0.22,
          roughness: 0.36,
        });
        const safeBoltMaterial = new THREE.MeshPhysicalMaterial({
          clearcoat: 1,
          color: 0xfef3c7,
          emissive: new THREE.Color(0x5f3b08),
          emissiveIntensity: 0.12,
          metalness: 0.82,
          roughness: 0.2,
        });
        const safeGroup = new THREE.Group();
        safeGroup.position.set(0.18, -0.46, -0.54);
        safeGroup.rotation.set(-0.04, -0.24, 0.02);
        safeGroup.scale.set(0.98, 0.98, 0.98);
        chamberGroup.add(safeGroup);
        reservesVaultGroup = safeGroup;

        const safeBody = new THREE.Mesh(
          createRoundedPanelGeometry(THREE, 2.76, 1.02, 0.54, 0.13, 0.04),
          safeMetalMaterial,
        );
        safeBody.position.set(0, 0, 0);
        safeGroup.add(safeBody);

        const safeCapSpecs: Array<{ position: VectorTuple; scale: VectorTuple }> = [
          { position: [0, 0.56, 0.34], scale: [2.58, 0.08, 0.08] },
          { position: [0, -0.56, 0.34], scale: [2.58, 0.08, 0.08] },
          { position: [-1.42, 0, 0.34], scale: [0.09, 0.9, 0.08] },
          { position: [1.42, 0, 0.34], scale: [0.09, 0.9, 0.08] },
        ];

        safeCapSpecs.forEach(({ position, scale }) => {
          const cap = new THREE.Mesh(
            createRoundedPanelGeometry(
              THREE,
              scale[0],
              scale[1],
              scale[2],
              Math.min(scale[0], scale[1]) * 0.42,
              0.006,
            ),
            safeFrameMaterial,
          );
          cap.position.set(...position);
          safeGroup.add(cap);
        });

        const safeInterior = new THREE.Mesh(
          createRoundedPanelGeometry(THREE, 2.22, 0.7, 0.06, 0.08, 0.012),
          safeInteriorMaterial,
        );
        safeInterior.position.set(0.06, -0.02, 0.36);
        safeGroup.add(safeInterior);

        const safeInteriorGlow = new THREE.Mesh(
          createRoundedPanelGeometry(THREE, 1.78, 0.48, 0.02, 0.07, 0.006),
          safeGlassMaterial,
        );
        safeInteriorGlow.position.set(-0.08, 0.02, 0.42);
        safeGroup.add(safeInteriorGlow);

        const safeBottomLip = new THREE.Mesh(
          createRoundedPanelGeometry(THREE, 2.52, 0.22, 0.18, 0.08, 0.012),
          safeFrameMaterial,
        );
        safeBottomLip.position.set(0.06, -0.5, 0.68);
        safeGroup.add(safeBottomLip);

        const safeBottomShadow = new THREE.Mesh(
          createRoundedPanelGeometry(THREE, 2.38, 0.22, 0.12, 0.07, 0.01),
          safeMetalMaterial,
        );
        safeBottomShadow.position.set(0.06, -0.62, 0.52);
        safeGroup.add(safeBottomShadow);

        const safeDoorGroup = new THREE.Group();
        safeDoorGroup.position.set(-1.2, -0.01, 0.42);
        safeGroup.add(safeDoorGroup);
        reservesVaultDoorGroup = safeDoorGroup;

        const safeDoor = new THREE.Mesh(
          createRoundedPanelGeometry(THREE, 2.38, 0.82, 0.18, 0.1, 0.025),
          safeDoorMaterial,
        );
        safeDoor.position.set(1.24, 0, 0);
        safeDoorGroup.add(safeDoor);

        const safeWindow = new THREE.Mesh(
          createRoundedPanelGeometry(THREE, 1.38, 0.5, 0.04, 0.07, 0.008),
          safeGlassMaterial,
        );
        safeWindow.position.set(0.92, 0.03, 0.14);
        safeDoorGroup.add(safeWindow);

        const safeFrameSpecs: Array<{ position: VectorTuple; scale: VectorTuple }> = [
          { position: [1.24, 0.47, 0.15], scale: [2.36, 0.058, 0.07] },
          { position: [1.24, -0.47, 0.15], scale: [2.36, 0.058, 0.07] },
          { position: [0, 0, 0.15], scale: [0.06, 0.84, 0.07] },
          { position: [2.48, 0, 0.15], scale: [0.06, 0.84, 0.07] },
        ];

        safeFrameSpecs.forEach(({ position, scale }) => {
          const framePiece = new THREE.Mesh(
            createRoundedPanelGeometry(
              THREE,
              scale[0],
              scale[1],
              scale[2],
              Math.min(scale[0], scale[1]) * 0.45,
              0.005,
            ),
            safeFrameMaterial,
          );
          framePiece.position.set(...position);
          safeDoorGroup.add(framePiece);
        });

        const safeDialGroup = new THREE.Group();
        safeDialGroup.position.set(2.16, 0.03, 0.22);
        safeDoorGroup.add(safeDialGroup);
        reservesVaultDialGroup = safeDialGroup;

        const safeRim = new THREE.Mesh(
          new THREE.TorusGeometry(0.25, 0.032, 10, 56),
          chamberGlassMaterial,
        );
        safeDialGroup.add(safeRim);

        const safeDial = new THREE.Mesh(
          new THREE.CylinderGeometry(0.17, 0.19, 0.11, 32),
          safeBoltMaterial,
        );
        safeDial.rotation.x = Math.PI / 2;
        safeDialGroup.add(safeDial);

        [0, Math.PI / 3, (Math.PI * 2) / 3].forEach((rotation) => {
          const dialSpoke = new THREE.Mesh(
            new THREE.BoxGeometry(0.46, 0.032, 0.036),
            chamberWarmMaterial,
          );
          dialSpoke.position.z = 0.08;
          dialSpoke.rotation.z = rotation;
          safeDialGroup.add(dialSpoke);
        });

        const safeBoltPositions: VectorTuple[] = [
          [0.26, 0.32, 0.17],
          [1.64, 0.32, 0.17],
          [0.26, -0.3, 0.17],
          [1.64, -0.3, 0.17],
        ];

        safeBoltPositions.forEach((position) => {
          const bolt = new THREE.Mesh(
            new THREE.CylinderGeometry(0.045, 0.052, 0.038, 16),
            safeBoltMaterial,
          );
          bolt.position.set(...position);
          bolt.rotation.x = Math.PI / 2;
          safeDoorGroup.add(bolt);
        });

        [-0.31, 0, 0.31].forEach((y) => {
          const hinge = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.22, 18),
            safeFrameMaterial,
          );
          hinge.position.set(-1.42, y, 0.46);
          hinge.rotation.z = Math.PI / 2;
          safeGroup.add(hinge);
        });

        const rockMaterial = new THREE.MeshPhysicalMaterial({
          clearcoat: 0.5,
          color: 0x87c7dc,
          emissive: new THREE.Color(0x082d44),
          emissiveIntensity: 0.12,
          metalness: 0.08,
          roughness: 0.36,
        });

        scene.add(chamberGroup);

        const reserveClusterConfigs: Array<{
          origin: VectorTuple;
          scale: number;
          tone: DashboardTornadoGemTone;
        }> = [
          { origin: [-1.34, -1.88, -0.34], scale: 0.76, tone: "blue" },
          { origin: [0.02, -1.8, 0.02], scale: 0.9, tone: "yellow" },
          { origin: [1.34, -1.88, 0.2], scale: 0.74, tone: "red" },
        ];

        const reserveBedMaterial = new THREE.MeshPhysicalMaterial({
          clearcoat: 0.54,
          clearcoatRoughness: 0.22,
          color: 0x15556b,
          depthWrite: false,
          emissive: new THREE.Color(0x0a3349),
          emissiveIntensity: 0.24,
          flatShading: true,
          metalness: 0.16,
          opacity: 0.66,
          roughness: 0.46,
          side: THREE.DoubleSide,
          transparent: true,
        });
        const reserveBaseMaterial = new THREE.MeshPhysicalMaterial({
          clearcoat: 0.72,
          clearcoatRoughness: 0.18,
          color: 0x0e4a5f,
          depthWrite: false,
          emissive: new THREE.Color(0x07364d),
          emissiveIntensity: 0.34,
          flatShading: true,
          metalness: 0.24,
          opacity: 0.88,
          roughness: 0.4,
          transparent: true,
        });
        const reserveBaseRimMaterial = new THREE.MeshBasicMaterial({
          blending: THREE.AdditiveBlending,
          color: new THREE.Color(0x7dd3fc),
          depthWrite: false,
          opacity: 0.36,
          transparent: true,
        });
        const reserveDustMaterial = new THREE.MeshPhysicalMaterial({
          clearcoat: 1,
          clearcoatRoughness: 0.08,
          color: 0x9bf3ff,
          depthWrite: false,
          emissive: new THREE.Color(0x0e7490),
          emissiveIntensity: 0.18,
          metalness: 0.08,
          opacity: 0.58,
          roughness: 0.18,
          transparent: true,
          transmission: 0.1,
        });
        const alienMossMaterial = new THREE.MeshPhysicalMaterial({
          clearcoat: 0.4,
          clearcoatRoughness: 0.28,
          color: 0x083344,
          depthWrite: false,
          emissive: new THREE.Color(0x0f766e),
          emissiveIntensity: 0.38,
          metalness: 0.08,
          opacity: 0.76,
          roughness: 0.42,
          side: THREE.DoubleSide,
          transparent: true,
        });
        const alienDesertMaterial = new THREE.MeshPhysicalMaterial({
          clearcoat: 0.36,
          clearcoatRoughness: 0.24,
          color: 0xcaa15b,
          depthWrite: false,
          emissive: new THREE.Color(0x6f3b12),
          emissiveIntensity: 0.22,
          metalness: 0.04,
          opacity: 0.7,
          roughness: 0.56,
          side: THREE.DoubleSide,
          transparent: true,
        });
        const alienWaterMaterial = new THREE.MeshPhysicalMaterial({
          clearcoat: 1,
          clearcoatRoughness: 0.04,
          color: 0x67e8f9,
          depthWrite: false,
          emissive: new THREE.Color(0x0891b2),
          emissiveIntensity: 0.48,
          metalness: 0.02,
          opacity: 0.56,
          roughness: 0.08,
          side: THREE.DoubleSide,
          transparent: true,
        });
        const alienFlowerStemMaterial = new THREE.MeshBasicMaterial({
          color: new THREE.Color("#5eead4"),
          depthWrite: false,
          opacity: 0.72,
          transparent: true,
        });
        const alienFlowerCenterMaterial = new THREE.MeshBasicMaterial({
          color: new THREE.Color("#fff7ad"),
          depthWrite: false,
          opacity: 0.9,
          transparent: true,
        });
        const alienFlowerPetalMaterials = [
          new THREE.MeshBasicMaterial({
            color: new THREE.Color("#67e8f9"),
            depthWrite: false,
            opacity: 0.82,
            transparent: true,
          }),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color("#c4b5fd"),
            depthWrite: false,
            opacity: 0.78,
            transparent: true,
          }),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color("#f0abfc"),
            depthWrite: false,
            opacity: 0.74,
            transparent: true,
          }),
        ];
        const alienFlowerStemGeometry = new THREE.CylinderGeometry(
          0.014,
          0.02,
          1,
          6,
        );
        const alienFlowerPetalGeometry = new THREE.SphereGeometry(0.034, 12, 8);
        const alienFlowerCenterGeometry = new THREE.SphereGeometry(0.027, 12, 8);
        const reserveBedShardSpecs: Array<
          readonly [number, number, number, number, number]
        > = [
          [-0.48, -0.02, -0.16, 0.08, 0.22],
          [-0.25, 0.01, 0.18, 0.058, -0.44],
          [0.3, -0.01, -0.18, 0.07, 0.36],
          [0.52, 0, 0.1, 0.052, -0.24],
        ];
        const createReserveBedGeometry = (clusterIndex: number) => {
          const center: VectorTuple = [0.04, 0.02, -0.28];
          const points: VectorTuple[] = [
            [-1.12, -0.02, -0.34],
            [-0.58, 0.02, -0.6],
            [0.1, -0.01, -0.64],
            [1.06, 0.02, -0.42],
            [0.92, 0, -0.14],
            [0.26, -0.02, 0.02],
            [-0.68, 0.01, -0.02],
            [-1.2, -0.01, -0.16],
          ].map(([x, y, z], pointIndex) => [
            x + Math.sin(pointIndex * 1.7 + clusterIndex) * 0.04,
            y,
            z + Math.cos(pointIndex * 1.2 + clusterIndex) * 0.03,
          ]);
          const positions: number[] = [];
          const normals: number[] = [];

          points.forEach((point, pointIndex) => {
            const next = points[(pointIndex + 1) % points.length];
            [center, point, next].forEach(([x, y, z]) => {
              positions.push(x, y, z);
              normals.push(0, 1, 0);
            });
          });

          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(positions, 3),
          );
          geometry.setAttribute(
            "normal",
            new THREE.Float32BufferAttribute(normals, 3),
          );
          geometry.computeBoundingSphere();
          return geometry;
        };
        const reserveBackdropPositions: number[] = [];
        const reserveBackdropNormals: number[] = [];
        const reserveBackdropColumns = [-2.45, -1.62, -0.72, 0.16, 1.04, 1.9, 2.54];
        const reserveBackdropRows = [
          { y: -2.42, z: -0.82 },
          { y: -2.34, z: -0.5 },
          { y: -2.44, z: -0.18 },
        ];
        const reserveBackdropVertices: VectorTuple[] = [];
        reserveBackdropRows.forEach((row, rowIndex) => {
          reserveBackdropColumns.forEach((x, columnIndex) => {
            reserveBackdropVertices.push([
              x + Math.sin(rowIndex + columnIndex * 0.7) * 0.05,
              row.y + Math.cos(columnIndex * 1.1 + rowIndex) * 0.035,
              row.z + Math.sin(columnIndex * 1.4) * 0.025,
            ]);
          });
        });

        for (let row = 0; row < reserveBackdropRows.length - 1; row += 1) {
          for (
            let column = 0;
            column < reserveBackdropColumns.length - 1;
            column += 1
          ) {
            const topLeft =
              reserveBackdropVertices[row * reserveBackdropColumns.length + column];
            const topRight =
              reserveBackdropVertices[
                row * reserveBackdropColumns.length + column + 1
              ];
            const bottomLeft =
              reserveBackdropVertices[
                (row + 1) * reserveBackdropColumns.length + column
              ];
            const bottomRight =
              reserveBackdropVertices[
                (row + 1) * reserveBackdropColumns.length + column + 1
              ];
            [
              [topLeft, bottomLeft, topRight],
              [topRight, bottomLeft, bottomRight],
            ].forEach((triangle) => {
              const [a, b, c] = triangle;
              const va = new THREE.Vector3(...a);
              const vb = new THREE.Vector3(...b);
              const vc = new THREE.Vector3(...c);
              const normal = new THREE.Vector3()
                .subVectors(vb, va)
                .cross(new THREE.Vector3().subVectors(vc, va))
                .normalize();
              [a, b, c].forEach(([x, y, z]) => {
                reserveBackdropPositions.push(x, y, z);
                reserveBackdropNormals.push(normal.x, normal.y, normal.z);
              });
            });
          }
        }

        const reserveBackdropGeometry = new THREE.BufferGeometry();
        reserveBackdropGeometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(reserveBackdropPositions, 3),
        );
        reserveBackdropGeometry.setAttribute(
          "normal",
          new THREE.Float32BufferAttribute(reserveBackdropNormals, 3),
        );
        reserveBackdropGeometry.computeBoundingSphere();
        const reserveBackdrop = new THREE.Mesh(
          reserveBackdropGeometry,
          reserveBedMaterial,
        );
        reserveBackdrop.position.set(0.12, 0, 0);
        reserveBackdrop.rotation.set(-0.02, 0.04, 0.015);
        reserveBackdrop.renderOrder = -12;
        scene.add(reserveBackdrop);

        const reserveClusterCrystalSpecs: Array<{
          offset: VectorTuple;
          rotation: VectorTuple;
          scale: VectorTuple;
          spin: number;
        }> = [
          {
            offset: [0, 0, 0],
            rotation: [0.04, -0.35, -0.03],
            scale: [0.4, 0.7, 0.4],
            spin: 0.44,
          },
          {
            offset: [-0.3, -0.2, 0.12],
            rotation: [0.22, -0.82, 0.26],
            scale: [0.26, 0.42, 0.26],
            spin: 0.36,
          },
          {
            offset: [0.3, -0.2, 0.08],
            rotation: [0.12, 0.72, -0.26],
            scale: [0.26, 0.42, 0.26],
            spin: 0.4,
          },
          {
            offset: [0, -0.28, 0.26],
            rotation: [0.26, -0.18, 0.12],
            scale: [0.16, 0.22, 0.16],
            spin: 0.28,
          },
        ];

        const reserveBackgroundClusterConfigs: Array<{
          origin: VectorTuple;
          palette: (typeof gemTonePalettes)[DashboardTornadoGemTone];
          rotation: number;
          scale: number;
        }> = [
          {
            origin: [-2.02, -1.91, -0.5],
            palette: gemTonePalettes.green,
            rotation: 0.22,
            scale: 0.42,
          },
          {
            origin: [-0.74, -1.86, -0.58],
            palette: {
              ambient: "#f5d0fe",
              dark: "#701a75",
              edge: "#fae8ff",
              emissive: "#4a044e",
              glint: "#fff7ff",
              light: "#f0abfc",
              mid: "#d946ef",
              rim: "#f472b6",
              top: "#fdf4ff",
              warm: "#fbcfe8",
            },
            rotation: -0.1,
            scale: 0.38,
          },
          {
            origin: [0.74, -1.88, -0.58],
            palette: {
              ambient: "#cffafe",
              dark: "#164e63",
              edge: "#ecfeff",
              emissive: "#083344",
              glint: "#ffffff",
              light: "#67e8f9",
              mid: "#06b6d4",
              rim: "#22d3ee",
              top: "#f0fdff",
              warm: "#a5f3fc",
            },
            rotation: 0.12,
            scale: 0.4,
          },
          {
            origin: [2.02, -1.92, -0.48],
            palette: {
              ambient: "#ddd6fe",
              dark: "#3b0764",
              edge: "#ede9fe",
              emissive: "#2e1065",
              glint: "#fbfaff",
              light: "#c084fc",
              mid: "#8b5cf6",
              rim: "#a855f7",
              top: "#f5f3ff",
              warm: "#e9d5ff",
            },
            rotation: -0.24,
            scale: 0.39,
          },
        ];

        const reserveBackgroundCrystalSpecs: Array<{
          offset: VectorTuple;
          rotation: VectorTuple;
          scale: VectorTuple;
          spin: number;
        }> = [
          {
            offset: [0, 0, 0],
            rotation: [0.1, -0.24, -0.04],
            scale: [0.34, 0.56, 0.34],
            spin: 0.26,
          },
          {
            offset: [-0.24, -0.18, 0.08],
            rotation: [0.22, -0.72, 0.22],
            scale: [0.2, 0.34, 0.2],
            spin: 0.22,
          },
          {
            offset: [0.26, -0.2, 0.06],
            rotation: [0.16, 0.64, -0.22],
            scale: [0.2, 0.32, 0.2],
            spin: 0.24,
          },
        ];

        reserveBackgroundClusterConfigs.forEach((clusterConfig, clusterIndex) => {
          const palette = clusterConfig.palette;
          const backgroundPatchGroup = new THREE.Group();
          backgroundPatchGroup.position.set(...clusterConfig.origin);
          backgroundPatchGroup.rotation.y = clusterConfig.rotation;
          backgroundPatchGroup.scale.setScalar(clusterConfig.scale);
          scene.add(backgroundPatchGroup);

          const backgroundBaseMaterial = new THREE.MeshPhysicalMaterial({
            clearcoat: 0.88,
            clearcoatRoughness: 0.12,
            color: new THREE.Color(palette.mid),
            depthWrite: false,
            emissive: new THREE.Color(palette.dark),
            emissiveIntensity: 0.48,
            flatShading: true,
            metalness: 0.1,
            opacity: 0.82,
            roughness: 0.3,
            transparent: true,
          });
          const backgroundBaseLightMaterial = new THREE.MeshPhysicalMaterial({
            clearcoat: 1,
            clearcoatRoughness: 0.08,
            color: new THREE.Color(palette.light),
            depthWrite: false,
            emissive: new THREE.Color(palette.rim),
            emissiveIntensity: 0.34,
            flatShading: true,
            metalness: 0.1,
            opacity: 0.66,
            roughness: 0.22,
            transparent: true,
          });
          const backgroundBaseGlowMaterial = new THREE.MeshBasicMaterial({
            blending: THREE.AdditiveBlending,
            color: new THREE.Color(palette.rim),
            depthWrite: false,
            opacity: 0.16,
            transparent: true,
          });

          const backgroundBase = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.42, 0),
            backgroundBaseMaterial,
          );
          backgroundBase.position.set(0, -0.46, -0.08);
          backgroundBase.rotation.set(0.12, clusterIndex * 0.34, -0.04);
          backgroundBase.scale.set(1.36, 0.24, 0.62);
          backgroundBase.renderOrder = 1;
          backgroundPatchGroup.add(backgroundBase);

          const backgroundBaseCap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.36, 0.48, 0.12, 8),
            backgroundBaseLightMaterial,
          );
          backgroundBaseCap.position.set(0.02, -0.39, -0.06);
          backgroundBaseCap.rotation.set(0.08, Math.PI / 8, -0.04);
          backgroundBaseCap.scale.set(1.22, 0.4, 0.58);
          backgroundBaseCap.renderOrder = 2;
          backgroundPatchGroup.add(backgroundBaseCap);

          const backgroundBaseGlow = new THREE.Mesh(
            new THREE.CircleGeometry(0.72, 44),
            backgroundBaseGlowMaterial,
          );
          backgroundBaseGlow.position.set(0, -0.52, -0.08);
          backgroundBaseGlow.rotation.x = -Math.PI / 2;
          backgroundBaseGlow.scale.set(1.18, 0.38, 1);
          backgroundBaseGlow.renderOrder = 0;
          backgroundPatchGroup.add(backgroundBaseGlow);

          const backgroundGeometry = createEmeraldGeometry(THREE, palette, {
            sharpTop: true,
          });

          reserveBackgroundCrystalSpecs.forEach((spec, specIndex) => {
            const connector = new THREE.Mesh(
              new THREE.OctahedronGeometry(0.18, 0),
              specIndex === 0 ? backgroundBaseLightMaterial : backgroundBaseMaterial,
            );
            connector.position.set(
              spec.offset[0] * 0.82,
              -0.36 + specIndex * 0.004,
              spec.offset[2] * 0.72 - 0.06,
            );
            connector.rotation.set(
              0.28 + specIndex * 0.1,
              spec.rotation[1] * 0.34,
              spec.rotation[2] * 0.5,
            );
            connector.scale.set(1, 0.26, 0.52);
            connector.renderOrder = 3;
            backgroundPatchGroup.add(connector);

            const group = createEmeraldGroup(THREE, backgroundGeometry, palette);
            const clusterPosition: VectorTuple = [
              clusterConfig.origin[0] + spec.offset[0] * clusterConfig.scale,
              clusterConfig.origin[1] + spec.offset[1] * clusterConfig.scale,
              clusterConfig.origin[2] + spec.offset[2] * clusterConfig.scale,
            ];
            const clusterScale: VectorTuple = [
              spec.scale[0] * clusterConfig.scale,
              spec.scale[1] * clusterConfig.scale,
              spec.scale[2] * clusterConfig.scale,
            ];
            group.position.set(...clusterPosition);
            group.rotation.set(...spec.rotation);
            group.scale.set(...clusterScale);
            setGroupOpacity(group, 0.78);
            setGroupRenderOrder(group, 9);
            scene.add(group);
            clusterGems.push({
              basePosition: clusterPosition,
              baseRotation: spec.rotation,
              group,
              spin: spec.spin + clusterIndex * 0.02,
            });
          });
        });

        reserveClusterConfigs.forEach((clusterConfig, clusterIndex) => {
          const palette = gemTonePalettes[clusterConfig.tone];
          const patchGroup = new THREE.Group();
          const bedOffsetX = [-0.12, 0.08, 0.16][clusterIndex] ?? 0;
          patchGroup.position.set(...clusterConfig.origin);
          patchGroup.rotation.y = (clusterIndex - 1) * 0.12;
          patchGroup.scale.setScalar(clusterConfig.scale);
          scene.add(patchGroup);

          const thickBase = new THREE.Mesh(
            new THREE.CylinderGeometry(0.82, 1.02, 0.32, 56),
            reserveBaseMaterial,
          );
          thickBase.position.set(bedOffsetX, -0.78, -0.42);
          thickBase.rotation.set(0.04, -0.18 + clusterIndex * 0.16, 0.02);
          thickBase.scale.set(1.42, 1, 0.5);
          thickBase.renderOrder = -10;
          patchGroup.add(thickBase);

          const thickBaseRim = new THREE.Mesh(
            new THREE.TorusGeometry(0.84, 0.035, 10, 64),
            reserveBaseRimMaterial,
          );
          thickBaseRim.position.set(bedOffsetX, -0.61, -0.42);
          thickBaseRim.rotation.set(
            Math.PI / 2,
            0,
            -0.18 + clusterIndex * 0.16,
          );
          thickBaseRim.scale.set(1.42, 0.5, 1);
          thickBaseRim.renderOrder = -9;
          patchGroup.add(thickBaseRim);

          const reservePlatform = new THREE.Mesh(
            createReserveBedGeometry(clusterIndex),
            reserveBedMaterial,
          );
          reservePlatform.position.set(bedOffsetX, -0.6, -0.42);
          reservePlatform.rotation.set(
            0.04,
            -0.18 + clusterIndex * 0.16,
            0.02,
          );
          reservePlatform.scale.set(1.34, 1, 1.02);
          reservePlatform.renderOrder = -8;
          patchGroup.add(reservePlatform);

          const clusterGlow = new THREE.Mesh(
            new THREE.CircleGeometry(1, 48),
            new THREE.MeshBasicMaterial({
              color: new THREE.Color(palette.rim),
              depthWrite: false,
              opacity: 0.075,
              transparent: true,
            }),
          );
          clusterGlow.position.set(bedOffsetX * 0.45, -0.62, -0.28);
          clusterGlow.rotation.x = -Math.PI / 2;
          clusterGlow.scale.set(0.96, 0.24, 1);
          clusterGlow.renderOrder = -7;
          patchGroup.add(clusterGlow);

          const crystalBaseMaterial = new THREE.MeshPhysicalMaterial({
            clearcoat: 0.86,
            clearcoatRoughness: 0.12,
            color: new THREE.Color(palette.mid),
            emissive: new THREE.Color(palette.dark),
            emissiveIntensity: 0.52,
            flatShading: true,
            metalness: 0.1,
            opacity: 0.88,
            roughness: 0.28,
            transparent: true,
          });
          const crystalBaseLightMaterial = new THREE.MeshPhysicalMaterial({
            clearcoat: 1,
            clearcoatRoughness: 0.08,
            color: new THREE.Color(palette.light),
            emissive: new THREE.Color(palette.rim),
            emissiveIntensity: 0.38,
            flatShading: true,
            metalness: 0.12,
            opacity: 0.72,
            roughness: 0.2,
            transparent: true,
          });
          const crystalBaseGlowMaterial = new THREE.MeshBasicMaterial({
            blending: THREE.AdditiveBlending,
            color: new THREE.Color(palette.rim),
            depthWrite: false,
            opacity: 0.18,
            transparent: true,
          });
          const crystalBaseGroup = new THREE.Group();
          crystalBaseGroup.position.set(bedOffsetX * 0.3, -0.49, 0.08);
          crystalBaseGroup.rotation.set(0.06, 0.1 - clusterIndex * 0.08, -0.02);
          crystalBaseGroup.renderOrder = 3;
          patchGroup.add(crystalBaseGroup);

          const crystalBaseCore = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.42, 0),
            crystalBaseMaterial,
          );
          crystalBaseCore.position.set(0, -0.02, 0);
          crystalBaseCore.rotation.set(0.18, 0.46 + clusterIndex * 0.2, 0.08);
          crystalBaseCore.scale.set(1.42, 0.26, 0.68);
          crystalBaseCore.renderOrder = 3;
          crystalBaseGroup.add(crystalBaseCore);

          const crystalBaseCap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.38, 0.5, 0.13, 8),
            crystalBaseLightMaterial,
          );
          crystalBaseCap.position.set(0.02, 0.05, 0.01);
          crystalBaseCap.rotation.set(
            0.08,
            Math.PI / 8 + clusterIndex * 0.18,
            -0.03,
          );
          crystalBaseCap.scale.set(1.32, 0.44, 0.6);
          crystalBaseCap.renderOrder = 4;
          crystalBaseGroup.add(crystalBaseCap);

          const crystalBaseGlow = new THREE.Mesh(
            new THREE.CircleGeometry(0.74, 48),
            crystalBaseGlowMaterial,
          );
          crystalBaseGlow.position.set(0, -0.09, 0);
          crystalBaseGlow.rotation.x = -Math.PI / 2;
          crystalBaseGlow.scale.set(1.24, 0.44, 1);
          crystalBaseGlow.renderOrder = 2;
          crystalBaseGroup.add(crystalBaseGlow);

          reserveClusterCrystalSpecs.forEach((spec, specIndex) => {
            const connector = new THREE.Mesh(
              new THREE.OctahedronGeometry(0.22, 0),
              specIndex === 0 ? crystalBaseLightMaterial : crystalBaseMaterial,
            );
            connector.position.set(
              spec.offset[0] * 0.9,
              -0.01 + specIndex * 0.006,
              spec.offset[2] * 0.72,
            );
            connector.rotation.set(
              0.34 + specIndex * 0.12,
              spec.rotation[1] * 0.34,
              spec.rotation[2] * 0.48,
            );
            connector.scale.set(
              1.12 - Math.min(specIndex, 2) * 0.1,
              0.28,
              0.58 + specIndex * 0.04,
            );
            connector.renderOrder = 5;
            crystalBaseGroup.add(connector);
          });

          const desertPatch = new THREE.Mesh(
            new THREE.CircleGeometry(1, 42, Math.PI * 0.1, Math.PI * 1.62),
            alienDesertMaterial,
          );
          desertPatch.position.set(-0.18 + bedOffsetX * 0.42, -0.605, -0.35);
          desertPatch.rotation.set(-Math.PI / 2, 0, -0.16 + clusterIndex * 0.18);
          desertPatch.scale.set(0.9, 0.23, 1);
          desertPatch.renderOrder = -6;
          patchGroup.add(desertPatch);

          const waterPatch = new THREE.Mesh(
            new THREE.CircleGeometry(1, 42, -Math.PI * 0.05, Math.PI * 1.32),
            alienWaterMaterial,
          );
          waterPatch.position.set(0.26 + bedOffsetX * 0.26, -0.595, -0.28);
          waterPatch.rotation.set(-Math.PI / 2, 0, 0.12 - clusterIndex * 0.08);
          waterPatch.scale.set(0.5, 0.13, 1);
          waterPatch.renderOrder = -5;
          patchGroup.add(waterPatch);

          [-0.54, -0.36, 0.58].forEach((x, ridgeIndex) => {
            const dune = new THREE.Mesh(
              new THREE.PlaneGeometry(0.34 - ridgeIndex * 0.04, 0.018),
              new THREE.MeshBasicMaterial({
                color: new THREE.Color("#fde68a"),
                depthWrite: false,
                opacity: 0.34,
                transparent: true,
              }),
            );
            dune.position.set(x + bedOffsetX * 0.34, -0.574, -0.47 + ridgeIndex * 0.12);
            dune.rotation.set(-Math.PI / 2, 0, -0.16 + ridgeIndex * 0.18);
            dune.renderOrder = -4;
            patchGroup.add(dune);
          });

          [-0.08, 0.08, 0.24].forEach((x, rippleIndex) => {
            const ripple = new THREE.Mesh(
              new THREE.PlaneGeometry(0.24 - rippleIndex * 0.04, 0.014),
              new THREE.MeshBasicMaterial({
                color: new THREE.Color("#ecfeff"),
                depthWrite: false,
                opacity: 0.42,
                transparent: true,
              }),
            );
            ripple.position.set(x + bedOffsetX * 0.24, -0.566, -0.23 + rippleIndex * 0.038);
            ripple.rotation.set(-Math.PI / 2, 0, 0.08 - rippleIndex * 0.12);
            ripple.renderOrder = -3;
            patchGroup.add(ripple);
          });

          const alienMoss = new THREE.Mesh(
            new THREE.CircleGeometry(1, 42),
            alienMossMaterial,
          );
          alienMoss.position.set(bedOffsetX * 0.36, -0.59, -0.34);
          alienMoss.rotation.x = -Math.PI / 2;
          alienMoss.scale.set(0.86, 0.2, 1);
          alienMoss.renderOrder = -6;
          patchGroup.add(alienMoss);

          const alienFlowerSpecs: Array<{
            height: number;
            lean: number;
            materialIndex: number;
            x: number;
            z: number;
          }> = [
            { height: 0.24, lean: -0.3, materialIndex: 0, x: -0.72, z: -0.38 },
            { height: 0.18, lean: 0.2, materialIndex: 1, x: -0.56, z: -0.22 },
            { height: 0.28, lean: -0.14, materialIndex: 2, x: -0.34, z: -0.5 },
            { height: 0.22, lean: 0.26, materialIndex: 0, x: 0.42, z: -0.44 },
            { height: 0.17, lean: -0.2, materialIndex: 1, x: 0.62, z: -0.22 },
          ];

          alienFlowerSpecs.forEach(({ height, lean, materialIndex, x, z }, flowerIndex) => {
            const flower = new THREE.Group();
            flower.position.set(x + bedOffsetX * 0.36, -0.56, z);
            flower.rotation.set(0.08, 0.16 * flowerIndex, lean);
            flower.renderOrder = -2;

            const stem = new THREE.Mesh(
              alienFlowerStemGeometry,
              alienFlowerStemMaterial,
            );
            stem.position.y = height * 0.5;
            stem.scale.set(1, height, 1);
            stem.renderOrder = -2;
            flower.add(stem);

            const bloomY = height + 0.012;
            const petalCount = 5;
            for (let petalIndex = 0; petalIndex < petalCount; petalIndex += 1) {
              const angle = (petalIndex / petalCount) * Math.PI * 2;
              const petal = new THREE.Mesh(
                alienFlowerPetalGeometry,
                alienFlowerPetalMaterials[
                  (materialIndex + petalIndex) % alienFlowerPetalMaterials.length
                ],
              );
              petal.position.set(
                Math.cos(angle) * 0.044,
                bloomY + Math.sin(angle) * 0.014,
                0.014 + Math.cos(angle) * 0.01,
              );
              petal.rotation.set(0.18, angle * 0.24, angle);
              petal.scale.set(1.75, 0.7, 0.54);
              petal.renderOrder = -1;
              flower.add(petal);
            }

            const center = new THREE.Mesh(
              alienFlowerCenterGeometry,
              alienFlowerCenterMaterial,
            );
            center.position.set(0, bloomY, 0.026);
            center.renderOrder = 0;
            flower.add(center);

            patchGroup.add(flower);
          });

          [
            [-0.42, -0.52, -0.34, 0.08],
            [-0.22, -0.54, -0.1, 0.06],
            [0.36, -0.53, -0.24, 0.07],
            [0.24, -0.55, -0.42, 0.055],
          ].forEach(([x, y, z, scale]) => {
            const rock = new THREE.Mesh(
              new THREE.DodecahedronGeometry(scale, 0),
              rockMaterial,
            );
            rock.position.set(x + bedOffsetX * 0.36, y, z);
            rock.rotation.set(0.3 + x, 0.4 + z, 0.2);
            rock.renderOrder = -4;
            patchGroup.add(rock);
          });
          reserveBedShardSpecs.forEach(([x, y, z, scale, rotation]) => {
            const shard = new THREE.Mesh(
              new THREE.OctahedronGeometry(scale, 0),
              reserveDustMaterial,
            );
            shard.position.set(x + bedOffsetX * 0.5, -0.5 + y, z - 0.28);
            shard.rotation.set(0.38, rotation, 0.18 + x * 0.08);
            shard.scale.y = 0.36;
            shard.renderOrder = -3;
            patchGroup.add(shard);
          });

          reserveClusterCrystalSpecs.forEach((spec) => {
            const group = createEmeraldGroup(
              THREE,
              getGeometry(clusterConfig.tone, true),
              palette,
            );
            const clusterPosition: VectorTuple = [
              clusterConfig.origin[0] + spec.offset[0] * clusterConfig.scale,
              clusterConfig.origin[1] + spec.offset[1] * clusterConfig.scale,
              clusterConfig.origin[2] + spec.offset[2] * clusterConfig.scale,
            ];
            const clusterScale: VectorTuple = [
              spec.scale[0] * clusterConfig.scale,
              spec.scale[1] * clusterConfig.scale,
              spec.scale[2] * clusterConfig.scale,
            ];
            group.position.set(...clusterPosition);
            group.rotation.set(...spec.rotation);
            group.scale.set(...clusterScale);
            setGroupRenderOrder(group, 12);
            scene.add(group);
            clusterGems.push({
              basePosition: clusterPosition,
              baseRotation: spec.rotation,
              group,
              spin: spec.spin + clusterIndex * 0.03,
            });
          });

          const glow = new THREE.Mesh(
            new THREE.CircleGeometry(1.05, 36),
            new THREE.MeshBasicMaterial({
              color: new THREE.Color(palette.rim),
              depthWrite: false,
            opacity: 0.14,
              transparent: true,
            }),
          );
          glow.position.set(
            clusterConfig.origin[0],
            clusterConfig.origin[1] - 0.62 * clusterConfig.scale,
            clusterConfig.origin[2] - 0.24,
          );
          glow.rotation.x = -Math.PI / 2;
          glow.scale.set(0.54 * clusterConfig.scale, 0.16 * clusterConfig.scale, 1);
          glow.renderOrder = -6;
          scene.add(glow);
        });
      }

      resolvedTones.forEach((tone, index) => {
        const palette = gemTonePalettes[tone];
        const group = createEmeraldGroup(THREE, getGeometry(tone), palette);
        scene.add(group);
        animatedGems.push({
          group,
          phase: index / Math.max(1, resolvedTones.length),
          spin: 0.72 + index * 0.08,
          tone,
        });
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
      let previousFrameTime = 0;
      let vaultOpenAmount = vaultOpenRef.current ? 1 : 0;
      let vaultOpenRequestedAt = vaultOpenRef.current ? performance.now() : 0;
      const startedAt = performance.now();
      let orbitElapsedSeconds = 0;
      const render = (time: number) => {
        const frameDeltaSeconds =
          previousFrameTime === 0 ? 0 : Math.min(0.033, (time - previousFrameTime) / 1000);
        previousFrameTime = time;
        const seconds = (time - startedAt) / 1000;
        const wantsVaultOpen = variant === "reserves" && vaultOpenRef.current;
        if (wantsVaultOpen && vaultOpenRequestedAt === 0) {
          vaultOpenRequestedAt = time;
        } else if (!wantsVaultOpen) {
          vaultOpenRequestedAt = 0;
        }
        const vaultOpenDelaySeconds = 0.72;
        const vaultOpenDurationSeconds = 1.72;
        const vaultCloseDurationSeconds = 0.46;
        const vaultOpeningAllowed =
          wantsVaultOpen &&
          vaultOpenRequestedAt !== 0 &&
          (time - vaultOpenRequestedAt) / 1000 >= vaultOpenDelaySeconds;
        const targetVaultOpen = vaultOpeningAllowed ? 1 : 0;
        const vaultStep =
          frameDeltaSeconds /
          (targetVaultOpen > vaultOpenAmount
            ? vaultOpenDurationSeconds
            : vaultCloseDurationSeconds);
        if (targetVaultOpen > vaultOpenAmount) {
          vaultOpenAmount = Math.min(1, vaultOpenAmount + vaultStep);
        } else if (targetVaultOpen < vaultOpenAmount) {
          vaultOpenAmount = Math.max(0, vaultOpenAmount - vaultStep);
        }
        const reservesRevealActive =
          variant === "reserves" && (wantsVaultOpen || vaultOpenAmount > 0.01);
        const orbitalMotionPaused = pausedRef.current && !reservesRevealActive;
        if (!orbitalMotionPaused) {
          orbitElapsedSeconds += frameDeltaSeconds;
        }
        const orbitSeconds = orbitElapsedSeconds;
        const isSingleTriggerGem =
          variant === "trigger" && resolvedTones.length === 1;
        const orbitSpeed = variant === "reserves" ? 1 / 6.8 : 1 / 4.8;
        const orbitCenterX = variant === "reserves" ? 0.2 : 0;
        const radiusX = isSingleTriggerGem
          ? 0
          : variant === "reserves"
            ? 0.48
            : 0.78;
        const radiusY = isSingleTriggerGem
          ? 0
          : variant === "reserves"
            ? 0.16
            : 0.38;
        const vaultOpenProgress = vaultOpenAmount;
        const vaultOpenEase = 1 - (1 - vaultOpenProgress) ** 3;

        if (reservesVaultGroup) {
          reservesVaultGroup.rotation.set(
            -0.04 + Math.sin(seconds * 0.6) * 0.008,
            -0.24 + Math.sin(seconds * 0.5) * 0.016,
            0.02 + Math.cos(seconds * 0.45) * 0.006,
          );
        }

        if (reservesVaultDoorGroup) {
          const doorSettle = Math.sin(vaultOpenProgress * Math.PI) * 0.07;
          reservesVaultDoorGroup.rotation.y = -1.46 * vaultOpenEase - doorSettle;
          reservesVaultDoorGroup.rotation.z = -0.03 * vaultOpenEase;
          reservesVaultDoorGroup.position.z = 0.42 + vaultOpenEase * 0.08;
        }

        if (reservesVaultDialGroup) {
          reservesVaultDialGroup.rotation.z =
            vaultOpenEase * Math.PI * 1.35 + seconds * 0.22;
        }

        clusterGems.forEach(({ basePosition, baseRotation, group, spin }, index) => {
          group.rotation.set(
            baseRotation[0] + Math.sin(seconds * 0.7 + index) * 0.025,
            baseRotation[1] + Math.sin(seconds * spin) * 0.12,
            baseRotation[2] + Math.cos(seconds * 0.5 + index) * 0.022,
          );
          group.position.set(
            basePosition[0],
            basePosition[1] + Math.sin(seconds * 0.8 + index) * 0.025,
            basePosition[2],
          );
        });

        let prominentTone: DashboardTornadoGemTone | null = null;
        let prominentScore = -Infinity;

        animatedGems.forEach(({ group, phase, spin, tone }, index) => {
          const progress = orbitalMotionPaused
            ? phase
            : (phase + orbitSeconds * orbitSpeed) % 1;
          const angle = Math.PI / 2 - progress * Math.PI * 2;
          const front = isSingleTriggerGem ? 1 : (Math.sin(angle) + 1) / 2;
          const vaultIngress =
            variant === "reserves" ? clamp01((0.56 - front) / 0.56) : 0;
          const x = orbitCenterX + Math.cos(angle) * radiusX;
          const y =
            (isSingleTriggerGem ? 0.02 : Math.sin(angle) * radiusY) +
            (variant === "reserves" ? -0.52 : 0);
          const z =
            isSingleTriggerGem
              ? 0.28
              : variant === "reserves"
              ? -0.28 + Math.sin(angle) * 0.14
              : Math.sin(angle) * 0.58;
          const visibleX =
            variant === "reserves"
              ? orbitCenterX + (x - orbitCenterX) * (1 - vaultIngress * 0.52)
              : x;
          const visibleY = variant === "reserves" ? y - vaultIngress * 0.54 : y;
          const visibleZ = variant === "reserves" ? z - vaultIngress * 0.42 : z;
          const scaleBase =
            (variant === "reserves" ? 0.31 : isSingleTriggerGem ? 0.72 : 0.32) +
            front * (variant === "reserves" ? 0.1 : isSingleTriggerGem ? 0.12 : 0.1);
          const scale =
            variant === "reserves"
              ? scaleBase * (1 - vaultIngress * 0.18)
              : scaleBase;
          const opacity =
            variant === "reserves"
              ? 0.92 + front * 0.08
              : 0.46 + front * 0.54;
          const hiddenBehindSafeLip =
            variant === "reserves" && front < 0.54;

          if (variant === "reserves" && !hiddenBehindSafeLip && front > prominentScore) {
            prominentScore = front;
            prominentTone = tone;
          }

          group.position.set(visibleX, visibleY, visibleZ);
          group.rotation.set(
            isSingleTriggerGem
              ? 0.06
              : 0.1 + Math.sin(orbitSeconds * 0.78 + index) * 0.05,
            orbitSeconds * (isSingleTriggerGem ? spin * 1.5 : spin) +
              phase * Math.PI * 2,
            isSingleTriggerGem
              ? -0.02
              : -0.04 + Math.cos(orbitSeconds * 0.62 + index) * 0.05,
          );
          group.scale.setScalar(scale);
          group.visible = !hiddenBehindSafeLip;
          setGroupOpacity(group, opacity);
        });

        if (
          variant === "reserves" &&
          prominentTone &&
          prominentToneRef.current !== prominentTone
        ) {
          prominentToneRef.current = prominentTone;
          onProminentToneChangeRef.current?.(prominentTone);
        }

        renderer.render(scene, camera);
        frameId = window.requestAnimationFrame(render);
      };

      frameId = window.requestAnimationFrame(render);

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
        scene.traverse((object) => {
          const objectGeometry = (object as GeometryObject).geometry;
          if (objectGeometry && !Array.from(geometries.values()).includes(objectGeometry)) {
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
        geometries.forEach((geometry) => geometry.dispose());
        renderer.dispose();
      };
    };

    startScene();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [contextResetToken, tonesKey, variant]);

  return (
    <canvas
      aria-hidden="true"
      className={`dashboard-shared-gem-stage-3d ${className}`}
      data-gem-stage-paused={paused ? "true" : "false"}
      data-gem-stage-variant={variant}
      data-vault-open={vaultOpen ? "true" : "false"}
      ref={canvasRef}
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
      await waitForDashboardWebGlStart();
      if (cancelled || !canvasRef.current) return;

      const THREE = await loadDashboardThree();
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

      const renderer = createDashboardWebGlRenderer(THREE, canvas, {
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      });
      if (!renderer) {
        canvas.removeEventListener("webglcontextlost", handleContextLost);
        return;
      }
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
      await waitForDashboardWebGlStart();
      if (cancelled || !canvasRef.current) return;

      const THREE = await loadDashboardThree();
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

      const renderer = createDashboardWebGlRenderer(THREE, canvas, {
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      });
      if (!renderer) {
        canvas.removeEventListener("webglcontextlost", handleContextLost);
        return;
      }
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

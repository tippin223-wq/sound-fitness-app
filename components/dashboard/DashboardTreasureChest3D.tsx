"use client";

import { useEffect, useRef } from "react";
import type { BufferGeometry, Material, Object3D, Texture } from "three";

type ThreeModule = typeof import("three");

type MaterialObject = Object3D & {
  material?: Material | Material[];
};

type GeometryObject = Object3D & {
  geometry?: BufferGeometry;
};

type DashboardTreasureChest3DProps = {
  className?: string;
  paused?: boolean;
};

const coinTextureSources = {
  black: "/sound-coins/sound-coin-black.png",
  blue: "/sound-coins/sound-coin-blue.png",
  cyan: "/sound-coins/sound-coin-cyan.png",
  gold: "/sound-coins/sound-coin-gold.png",
  orange: "/sound-coins/sound-coin-orange.png",
} as const;

const overflowCoinSpecs = [
  { tone: "gold", x: -1.18, y: -0.28, z: 1.02, rx: 1.42, ry: -0.08, rz: -0.34, scale: 0.82 },
  { tone: "blue", x: -0.46, y: -0.18, z: 1.16, rx: 1.5, ry: 0.14, rz: 0.16, scale: 0.9 },
  { tone: "orange", x: 0.44, y: -0.22, z: 1.12, rx: 1.4, ry: -0.18, rz: 0.3, scale: 0.84 },
  { tone: "cyan", x: 1.14, y: -0.32, z: 1.0, rx: 1.5, ry: 0.12, rz: -0.16, scale: 0.78 },
  { tone: "gold", x: -1.52, y: -0.55, z: 1.34, rx: 1.5, ry: 0.08, rz: 0.18, scale: 0.74 },
  { tone: "black", x: 1.48, y: -0.58, z: 1.26, rx: 1.44, ry: -0.14, rz: -0.26, scale: 0.7 },
] as const;

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

const makeBox = (
  THREE: ThreeModule,
  width: number,
  height: number,
  depth: number,
  material: Material,
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0],
) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  return mesh;
};

const createTreasureChestScene = (
  THREE: ThreeModule,
  textures: Record<keyof typeof coinTextureSources, Texture>,
) => {
  const group = new THREE.Group();
  group.rotation.set(-0.04, -0.22, 0);
  group.position.set(0, -0.2, 0);

  const wood = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.36,
    clearcoatRoughness: 0.3,
    color: new THREE.Color("#a84f12"),
    emissive: new THREE.Color("#2b1105"),
    emissiveIntensity: 0.1,
    metalness: 0.08,
    roughness: 0.38,
  });
  const darkWood = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.18,
    color: new THREE.Color("#552100"),
    emissive: new THREE.Color("#1a0700"),
    emissiveIntensity: 0.08,
    metalness: 0.04,
    roughness: 0.48,
  });
  const goldMetal = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.72,
    clearcoatRoughness: 0.14,
    color: new THREE.Color("#f6b21f"),
    emissive: new THREE.Color("#8a3d05"),
    emissiveIntensity: 0.18,
    metalness: 0.72,
    roughness: 0.2,
  });
  const deepGold = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.46,
    color: new THREE.Color("#a95a09"),
    emissive: new THREE.Color("#4a1b02"),
    emissiveIntensity: 0.12,
    metalness: 0.58,
    roughness: 0.28,
  });
  const interior = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#140907"),
    emissive: new THREE.Color("#f59e0b"),
    emissiveIntensity: 0.12,
    metalness: 0.04,
    roughness: 0.54,
  });

  const base = new THREE.Group();
  base.add(makeBox(THREE, 3.8, 1.18, 1.92, wood, [0, -0.72, 0]));
  base.add(makeBox(THREE, 3.92, 0.14, 2.04, goldMetal, [0, -0.16, 0.04]));
  base.add(makeBox(THREE, 3.92, 0.16, 2.04, deepGold, [0, -1.25, 0.04]));
  base.add(makeBox(THREE, 0.16, 1.28, 2.06, goldMetal, [-1.38, -0.7, 0.04]));
  base.add(makeBox(THREE, 0.16, 1.28, 2.06, goldMetal, [1.38, -0.7, 0.04]));
  base.add(makeBox(THREE, 0.2, 1.34, 2.08, deepGold, [0, -0.7, 0.04]));
  base.add(makeBox(THREE, 3.58, 0.18, 0.08, darkWood, [0, -0.74, 1.02]));
  base.add(makeBox(THREE, 3.58, 0.18, 0.08, darkWood, [0, -0.94, 1.02]));
  base.add(makeBox(THREE, 3.12, 0.34, 1.42, interior, [0, -0.08, -0.02]));
  group.add(base);

  const lid = new THREE.Group();
  lid.position.set(0, 0.24, -0.76);
  lid.rotation.x = -0.72;
  lid.add(makeBox(THREE, 3.96, 0.52, 1.76, wood, [0, 0, 0]));
  lid.add(makeBox(THREE, 4.08, 0.12, 1.86, goldMetal, [0, 0.27, 0]));
  lid.add(makeBox(THREE, 0.16, 0.62, 1.9, goldMetal, [-1.46, 0, 0]));
  lid.add(makeBox(THREE, 0.16, 0.62, 1.9, goldMetal, [1.46, 0, 0]));
  lid.add(makeBox(THREE, 4.0, 0.1, 0.12, deepGold, [0, -0.26, 0.9]));
  group.add(lid);

  const lock = new THREE.Group();
  lock.add(makeBox(THREE, 0.52, 0.6, 0.08, goldMetal, [0, -0.62, 1.04]));
  const keyhole = new THREE.Mesh(
    new THREE.CircleGeometry(0.07, 18),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#3b1602") }),
  );
  keyhole.position.set(0, -0.57, 1.09);
  lock.add(keyhole);
  group.add(lock);

  const sideMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.58,
    clearcoatRoughness: 0.18,
    color: new THREE.Color("#facc15"),
    emissive: new THREE.Color("#7c2d12"),
    emissiveIntensity: 0.14,
    metalness: 0.74,
    roughness: 0.22,
  });
  const rimMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 0.92,
    clearcoatRoughness: 0.12,
    color: new THREE.Color("#fff1a8"),
    emissive: new THREE.Color("#a16207"),
    emissiveIntensity: 0.14,
    metalness: 0.82,
    roughness: 0.18,
  });
  const coinFaceMaterials = (
    Object.keys(textures) as Array<keyof typeof coinTextureSources>
  ).reduce(
    (materials, tone) => {
      const texture = textures[tone];
      materials[tone] = new THREE.MeshPhysicalMaterial({
        bumpMap: texture,
        bumpScale: 0.018,
        clearcoat: 0.82,
        clearcoatRoughness: 0.12,
        color: new THREE.Color(tone === "black" ? "#e7e5e4" : "#ffffff"),
        emissive: new THREE.Color(tone === "blue" ? "#1d4ed8" : "#8a3d05"),
        emissiveIntensity: tone === "blue" ? 0.14 : 0.09,
        map: texture,
        metalness: 0.64,
        roughness: 0.18,
      });
      return materials;
    },
    {} as Record<keyof typeof coinTextureSources, Material>,
  );
  const coinGeometry = new THREE.CylinderGeometry(0.28, 0.28, 0.075, 56);
  const coinRimGeometry = new THREE.TorusGeometry(0.283, 0.012, 8, 52);

  const addCoin = (
    tone: keyof typeof coinTextureSources,
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number,
    scale: number,
  ) => {
    const coin = new THREE.Mesh(coinGeometry, [
      sideMaterial,
      coinFaceMaterials[tone],
      coinFaceMaterials[tone],
    ]);
    coin.position.set(x, y, z);
    coin.rotation.set(rx, ry, rz);
    coin.scale.setScalar(scale);
    const frontRim = new THREE.Mesh(coinRimGeometry, rimMaterial);
    frontRim.rotation.x = Math.PI / 2;
    frontRim.position.y = 0.041;
    const backRim = new THREE.Mesh(coinRimGeometry, rimMaterial);
    backRim.rotation.x = Math.PI / 2;
    backRim.position.y = -0.041;
    coin.add(frontRim, backRim);
    group.add(coin);
    return coin;
  };

  for (let layer = 0; layer < 4; layer += 1) {
    const coinCount = layer === 0 ? 11 : layer === 1 ? 9 : layer === 2 ? 7 : 5;
    for (let index = 0; index < coinCount; index += 1) {
      const angle = (index / coinCount) * Math.PI * 2 + layer * 0.46;
      const radius = 1.34 - layer * 0.18 + (index % 2) * 0.1;
      const toneKeys = Object.keys(coinTextureSources) as Array<
        keyof typeof coinTextureSources
      >;
      addCoin(
        toneKeys[(index + layer) % toneKeys.length],
        Math.cos(angle) * radius,
        -0.14 + layer * 0.18,
        Math.sin(angle) * 0.54 + 0.18,
        0.02 + (index % 3) * 0.06,
        angle,
        (index % 5) * 0.18,
        0.8 + layer * 0.05,
      );
    }
  }

  overflowCoinSpecs.forEach((coin) => {
    addCoin(
      coin.tone,
      coin.x,
      coin.y,
      coin.z,
      coin.rx,
      coin.ry,
      coin.rz,
      coin.scale,
    );
  });

  const glintMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#fff7d6"),
    opacity: 0.82,
    transparent: true,
  });
  const glints = [
    new THREE.Vector3(-1.24, 0.68, 0.52),
    new THREE.Vector3(0.72, 0.84, 0.26),
    new THREE.Vector3(1.42, 0.28, 0.88),
  ].map((position) => {
    const glint = new THREE.Mesh(new THREE.TetrahedronGeometry(0.09, 0), glintMaterial);
    glint.position.copy(position);
    group.add(glint);
    return glint;
  });

  group.scale.setScalar(0.78);
  return { glints, group, textures: Object.values(textures) };
};

export default function DashboardTreasureChest3D({
  className,
  paused = false,
}: DashboardTreasureChest3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};

    const startScene = async () => {
      const THREE = await import("three");
      if (cancelled || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
      camera.position.set(0, 1.05, 6.6);
      camera.lookAt(0, -0.28, 0);

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas,
        powerPreference: "high-performance",
        preserveDrawingBuffer: true,
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.85));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const textureLoader = new THREE.TextureLoader();
      const textures = Object.fromEntries(
        Object.entries(coinTextureSources).map(([tone, src]) => {
          const texture = textureLoader.load(src);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = 4;
          return [tone, texture];
        }),
      ) as Record<keyof typeof coinTextureSources, Texture>;

      scene.add(new THREE.AmbientLight(new THREE.Color("#fff1c7"), 1.2));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.25);
      keyLight.position.set(-2.4, 4.2, 4.4);
      scene.add(keyLight);

      const warmLight = new THREE.PointLight(new THREE.Color("#f59e0b"), 4.2, 7.5);
      warmLight.position.set(0, 1.1, 2.8);
      scene.add(warmLight);

      const blueRim = new THREE.PointLight(new THREE.Color("#38bdf8"), 1.6, 6);
      blueRim.position.set(2.4, 0.2, 2.2);
      scene.add(blueRim);

      const { glints, group, textures: usedTextures } = createTreasureChestScene(
        THREE,
        textures,
      );
      scene.add(group);

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
      const renderFrame = (time: number) => {
        if (!pausedRef.current) {
          group.rotation.y = -0.22 + Math.sin(time * 0.00045) * 0.07;
          glints.forEach((glint, index) => {
            const pulse = 0.72 + Math.sin(time * 0.0022 + index * 1.7) * 0.22;
            glint.scale.setScalar(pulse);
            glint.rotation.y += 0.018 + index * 0.004;
          });
        }

        renderer.render(scene, camera);
        frameId = window.requestAnimationFrame(renderFrame);
      };

      frameId = window.requestAnimationFrame(renderFrame);

      cleanup = () => {
        window.cancelAnimationFrame(frameId);
        observer.disconnect();
        disposeObject(scene);
        usedTextures.forEach((texture) => texture.dispose());
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
    <canvas
      aria-label="3D treasure chest overflowing with Sound Coins"
      className={className}
      data-treasure-chest-renderer="three"
      ref={canvasRef}
      role="img"
    />
  );
}

"use client";

import { useEffect, useRef } from "react";
import type { BufferGeometry, Material, Object3D } from "three";
import {
  createDashboardWebGlRenderer,
  loadDashboardThree,
  waitForDashboardWebGlStart,
} from "./dashboardWebGlRenderer";

type ThreeModule = typeof import("three");

export type DashboardFeatureRowIconVariant =
  | "calendar"
  | "checkins"
  | "goals"
  | "library"
  | "messaging"
  | "nutrition"
  | "plan"
  | "profile"
  | "progress"
  | "recovery"
  | "rewards"
  | "sessions"
  | "strength"
  | "technique"
  | "wins";

type DashboardFeatureRowIcon3DProps = {
  active?: boolean;
  className?: string;
  paused?: boolean;
  variant: DashboardFeatureRowIconVariant;
};

type PublicIconProps = Omit<DashboardFeatureRowIcon3DProps, "variant">;

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
  const shape = createRoundedRectShape(THREE, width, height, radius);
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + width * 0.24, y);
  shape.lineTo(x + width * 0.08, y - height * 0.28);
  shape.lineTo(x + width * 0.42, y);
  shape.closePath();
  return shape;
};

const createHeartShape = (THREE: ThreeModule) => {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.54);
  shape.bezierCurveTo(-0.8, -0.03, -0.82, 0.58, -0.38, 0.7);
  shape.bezierCurveTo(-0.12, 0.78, 0, 0.58, 0, 0.46);
  shape.bezierCurveTo(0, 0.58, 0.12, 0.78, 0.38, 0.7);
  shape.bezierCurveTo(0.82, 0.58, 0.8, -0.03, 0, -0.54);
  shape.closePath();
  return shape;
};

const createBoltShape = (THREE: ThreeModule) => {
  const shape = new THREE.Shape();
  const points = [
    [0.06, 0.86],
    [-0.54, 0.02],
    [-0.18, 0.02],
    [-0.38, -0.78],
    [0.56, -0.08],
    [0.18, -0.08],
  ] as const;

  shape.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => shape.lineTo(x, y));
  shape.closePath();
  return shape;
};

const createExtrudedShape = (
  THREE: ThreeModule,
  shape: InstanceType<ThreeModule["Shape"]>,
  material: Material,
  depth = 0.12,
) => {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: true,
    bevelSegments: 7,
    bevelSize: 0.018,
    bevelThickness: 0.026,
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
  radius = 0.028,
) => {
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.LineCurve3(from, to), 8, radius, 12, false),
    material,
  );
  group.add(mesh);
  return mesh;
};

const addBox = (
  THREE: ThreeModule,
  group: InstanceType<ThreeModule["Group"]>,
  material: Material,
  size: [number, number, number],
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0],
) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  group.add(mesh);
  return mesh;
};

function buildIcon(
  THREE: ThreeModule,
  group: InstanceType<ThreeModule["Group"]>,
  variant: DashboardFeatureRowIconVariant,
  materials: {
    amber: Material;
    cyan: Material;
    dark: Material;
    emerald: Material;
    glow: Material;
    glass: Material;
    rose: Material;
    white: Material;
  },
) {
  const {
    amber,
    cyan,
    emerald,
    glow,
    glass,
    rose,
    white,
  } = materials;
  const vector = (x: number, y: number, z: number) =>
    new THREE.Vector3(x, y, z);

  if (variant === "plan") {
    const board = createExtrudedShape(
      THREE,
      createRoundedRectShape(THREE, 1.02, 1.2, 0.08),
      glass,
      0.12,
    );
    group.add(board);
    addBox(THREE, group, cyan, [0.44, 0.09, 0.16], [0, 0.46, 0.1]);
    [-0.18, 0.08, 0.34].forEach((y, index) => {
      addBox(THREE, group, index === 1 ? amber : white, [0.58, 0.055, 0.16], [0.08, y, 0.12]);
      addBox(THREE, group, cyan, [0.11, 0.11, 0.16], [-0.34, y, 0.12]);
    });
    return;
  }

  if (variant === "library") {
    [-0.32, 0, 0.32].forEach((x, index) => {
      const mat = index === 1 ? amber : index === 2 ? emerald : cyan;
      addBox(THREE, group, mat, [0.2, 1.1 - index * 0.12, 0.18], [x, -0.03, 0], [0, 0, index === 0 ? -0.12 : 0.1]);
      addBox(THREE, group, white, [0.1, 0.055, 0.19], [x, 0.24 - index * 0.08, 0.13]);
    });
    return;
  }

  if (variant === "sessions" || variant === "calendar") {
    const calendar = createExtrudedShape(
      THREE,
      createRoundedRectShape(THREE, 1.12, 0.98, 0.09),
      glass,
      0.12,
    );
    group.add(calendar);
    addBox(THREE, group, cyan, [1.02, 0.16, 0.15], [0, 0.36, 0.1]);
    [-0.32, 0, 0.32].forEach((x) => {
      addBox(THREE, group, white, [0.12, 0.12, 0.16], [x, 0.03, 0.12]);
      addBox(THREE, group, amber, [0.12, 0.12, 0.16], [x, -0.26, 0.12]);
    });
    return;
  }

  if (variant === "strength") {
    addTube(THREE, group, cyan, vector(-0.72, 0, 0), vector(0.72, 0, 0), 0.055);
    [-0.82, -0.62, 0.62, 0.82].forEach((x) => {
      const plate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.26, 0.12, 36),
        x < 0 ? glass : white,
      );
      plate.position.set(x, 0, 0);
      plate.rotation.z = Math.PI / 2;
      group.add(plate);
    });
    return;
  }

  if (variant === "messaging") {
    const back = createExtrudedShape(THREE, createBubbleShape(THREE, 0.88, 0.54, 0.12), glass, 0.1);
    back.position.set(0.18, 0.16, -0.04);
    const front = createExtrudedShape(THREE, createBubbleShape(THREE, 0.94, 0.6, 0.12), cyan, 0.1);
    front.position.set(-0.16, -0.08, 0.12);
    group.add(back, front);
    return;
  }

  if (variant === "technique") {
    const body = createExtrudedShape(THREE, createRoundedRectShape(THREE, 0.9, 0.58, 0.1), glass, 0.12);
    group.add(body);
    const lens = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.5, 4), cyan);
    lens.position.set(0.66, 0, 0.02);
    lens.rotation.z = -Math.PI / 4;
    group.add(lens);
    addBox(THREE, group, amber, [0.18, 0.18, 0.15], [-0.24, 0.01, 0.12]);
    return;
  }

  if (variant === "recovery") {
    const heart = createExtrudedShape(THREE, createHeartShape(THREE), rose, 0.16);
    heart.scale.set(0.98, 0.98, 0.98);
    heart.rotation.z = Math.PI;
    group.add(heart);
    addTube(THREE, group, white, vector(-0.5, -0.03, 0.18), vector(-0.18, -0.03, 0.18), 0.022);
    addTube(THREE, group, white, vector(-0.18, -0.03, 0.18), vector(-0.04, 0.18, 0.18), 0.022);
    addTube(THREE, group, white, vector(-0.04, 0.18, 0.18), vector(0.14, -0.18, 0.18), 0.022);
    addTube(THREE, group, white, vector(0.14, -0.18, 0.18), vector(0.48, -0.18, 0.18), 0.022);
    return;
  }

  if (variant === "checkins") {
    const doc = createExtrudedShape(THREE, createRoundedRectShape(THREE, 0.86, 1.08, 0.08), glass, 0.12);
    group.add(doc);
    addTube(THREE, group, emerald, vector(-0.28, -0.1, 0.16), vector(-0.08, -0.32, 0.16), 0.035);
    addTube(THREE, group, emerald, vector(-0.08, -0.32, 0.16), vector(0.36, 0.24, 0.16), 0.035);
    addBox(THREE, group, cyan, [0.48, 0.055, 0.15], [0.08, 0.36, 0.14]);
    return;
  }

  if (variant === "profile") {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 20), glass);
    head.position.set(0, 0.32, 0);
    group.add(head);
    const shoulders = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 16, 48, Math.PI), cyan);
    shoulders.position.set(0, -0.36, 0);
    shoulders.rotation.z = Math.PI;
    group.add(shoulders);
    addTube(THREE, group, amber, vector(-0.38, -0.36, 0.03), vector(0.38, -0.36, 0.03), 0.035);
    return;
  }

  if (variant === "progress") {
    addTube(THREE, group, white, vector(-0.58, -0.52, 0), vector(-0.58, 0.5, 0), 0.025);
    addTube(THREE, group, white, vector(-0.62, -0.52, 0), vector(0.68, -0.52, 0), 0.025);
    [-0.34, 0.02, 0.38].forEach((x, index) => {
      addBox(THREE, group, [cyan, emerald, amber][index] as Material, [0.22, 0.42 + index * 0.18, 0.16], [x, -0.29 + index * 0.09, 0.06]);
    });
    return;
  }

  if (variant === "nutrition") {
    addTube(THREE, group, cyan, vector(-0.34, -0.58, 0), vector(-0.34, 0.52, 0), 0.03);
    [-0.48, -0.34, -0.2].forEach((x) => {
      addTube(THREE, group, cyan, vector(x, 0.22, 0), vector(x, 0.58, 0), 0.022);
    });
    const droplet = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 20), emerald);
    droplet.scale.set(0.7, 1.05, 0.62);
    droplet.position.set(0.32, -0.02, 0);
    group.add(droplet);
    const cup = createExtrudedShape(THREE, createRoundedRectShape(THREE, 0.42, 0.5, 0.08), glass, 0.09);
    cup.position.set(0.34, -0.22, 0.1);
    group.add(cup);
    return;
  }

  if (variant === "goals") {
    [0.56, 0.36, 0.16].forEach((radius, index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.035, 14, 56),
        [cyan, amber, white][index] as Material,
      );
      group.add(ring);
    });
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.07, 24, 16), emerald);
    center.position.z = 0.07;
    group.add(center);
    addTube(THREE, group, amber, vector(0.34, 0.34, 0.08), vector(0.72, 0.72, 0.08), 0.027);
    return;
  }

  if (variant === "wins") {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.24, 0.54, 36), amber);
    cup.position.set(0, 0.15, 0);
    group.add(cup);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.42, 28), glass);
    stem.position.set(0, -0.36, 0);
    group.add(stem);
    addBox(THREE, group, glass, [0.7, 0.12, 0.16], [0, -0.62, 0]);
    [-0.42, 0.42].forEach((x) => {
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.028, 12, 36, Math.PI), cyan);
      handle.position.set(x, 0.18, 0);
      handle.rotation.z = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      group.add(handle);
    });
    return;
  }

  if (variant === "rewards") {
    const envelope = createExtrudedShape(THREE, createRoundedRectShape(THREE, 1.08, 0.72, 0.08), glass, 0.1);
    group.add(envelope);
    addTube(THREE, group, cyan, vector(-0.48, 0.22, 0.14), vector(0, -0.12, 0.14), 0.025);
    addTube(THREE, group, cyan, vector(0, -0.12, 0.14), vector(0.48, 0.22, 0.14), 0.025);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 1), emerald);
    gem.position.set(0.42, -0.22, 0.24);
    gem.rotation.set(0.2, 0.46, 0.1);
    group.add(gem);
    return;
  }

  const bolt = createExtrudedShape(THREE, createBoltShape(THREE), glow, 0.16);
  group.add(bolt);
}

function DashboardFeatureRowIcon3D({
  active = false,
  className = "",
  paused = false,
  variant,
}: DashboardFeatureRowIcon3DProps) {
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
      await waitForDashboardWebGlStart();
      if (cancelled || !canvasRef.current) return;

      const THREE = await loadDashboardThree();
      if (cancelled || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 14);
      camera.position.set(0, 0.03, 4.05);
      camera.lookAt(0, 0, 0);

      const renderer = createDashboardWebGlRenderer(THREE, canvas, {
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      });
      if (!renderer) return;

      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(
        Math.min(Math.max(window.devicePixelRatio || 1, 1.4), 2),
      );
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      scene.add(new THREE.AmbientLight(new THREE.Color("#dff7ff"), 1.08));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
      keyLight.position.set(-1.7, 2.4, 3.4);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(new THREE.Color("#67e8f9"), 2.2);
      rimLight.position.set(2.2, 1.2, 2.8);
      scene.add(rimLight);

      const goldLight = new THREE.PointLight(new THREE.Color("#fde68a"), 1.6, 4.4);
      goldLight.position.set(-0.9, -0.5, 2.1);
      scene.add(goldLight);

      const cyanLight = new THREE.PointLight(new THREE.Color("#22d3ee"), 2.1, 4.6);
      cyanLight.position.set(1.1, 0.2, 2.3);
      scene.add(cyanLight);

      const group = new THREE.Group();
      group.rotation.set(-0.12, -0.28, -0.03);
      scene.add(group);

      const materials = {
        amber: new THREE.MeshPhysicalMaterial({
          clearcoat: 0.78,
          color: new THREE.Color("#fde68a"),
          emissive: new THREE.Color("#f59e0b"),
          emissiveIntensity: 0.08,
          metalness: 0.64,
          roughness: 0.2,
        }),
        cyan: new THREE.MeshPhysicalMaterial({
          clearcoat: 0.82,
          color: new THREE.Color("#67e8f9"),
          emissive: new THREE.Color("#0891b2"),
          emissiveIntensity: 0.11,
          metalness: 0.5,
          roughness: 0.17,
        }),
        dark: new THREE.MeshPhysicalMaterial({
          clearcoat: 0.45,
          color: new THREE.Color("#0f172a"),
          emissive: new THREE.Color("#082f49"),
          emissiveIntensity: 0.06,
          metalness: 0.34,
          roughness: 0.25,
        }),
        emerald: new THREE.MeshPhysicalMaterial({
          clearcoat: 0.9,
          color: new THREE.Color("#6ee7b7"),
          emissive: new THREE.Color("#10b981"),
          emissiveIntensity: 0.12,
          metalness: 0.38,
          roughness: 0.12,
          transmission: 0.18,
        }),
        glow: new THREE.MeshPhysicalMaterial({
          clearcoat: 0.84,
          color: new THREE.Color("#38bdf8"),
          emissive: new THREE.Color("#0284c7"),
          emissiveIntensity: 0.16,
          metalness: 0.46,
          roughness: 0.14,
        }),
        glass: new THREE.MeshPhysicalMaterial({
          clearcoat: 0.9,
          color: new THREE.Color("#bfdbfe"),
          emissive: new THREE.Color("#0e7490"),
          emissiveIntensity: 0.06,
          metalness: 0.38,
          roughness: 0.16,
          transmission: 0.12,
        }),
        rose: new THREE.MeshPhysicalMaterial({
          clearcoat: 0.75,
          color: new THREE.Color("#f9a8d4"),
          emissive: new THREE.Color("#ec4899"),
          emissiveIntensity: 0.12,
          metalness: 0.34,
          roughness: 0.18,
        }),
        white: new THREE.MeshPhysicalMaterial({
          clearcoat: 0.68,
          color: new THREE.Color("#ecfeff"),
          emissive: new THREE.Color("#38bdf8"),
          emissiveIntensity: 0.04,
          metalness: 0.38,
          roughness: 0.18,
        }),
      };

      buildIcon(THREE, group, variant, materials);

      const halo = new THREE.Mesh(
        new THREE.RingGeometry(0.82, 0.88, 64),
        new THREE.MeshBasicMaterial({
          blending: THREE.AdditiveBlending,
          color: new THREE.Color("#22d3ee"),
          depthWrite: false,
          opacity: 0.08,
          transparent: true,
        }),
      );
      halo.rotation.x = -Math.PI / 2.6;
      halo.position.set(0, -0.72, -0.08);
      scene.add(halo);

      let frameId = 0;
      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        const size = Math.max(1, Math.min(rect.width || 1, rect.height || 1));
        renderer.setSize(size, size, false);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
      };

      const render = (now: number) => {
        if (!pausedRef.current) {
          const t = now * 0.001;
          const boost = activeRef.current ? 1.14 : 1;
          group.rotation.y = -0.32 + Math.sin(t * 0.8) * 0.13 * boost;
          group.rotation.x = -0.14 + Math.sin(t * 0.58) * 0.035;
          group.position.y = Math.sin(t * 1.05) * 0.045 * boost;
          halo.rotation.z = t * 0.22;
          halo.scale.setScalar(1 + Math.sin(t * 1.4) * 0.05);
          renderer.render(scene, camera);
        }

        frameId = window.requestAnimationFrame(render);
      };

      resize();
      window.addEventListener("resize", resize);
      frameId = window.requestAnimationFrame(render);

      cleanup = () => {
        window.cancelAnimationFrame(frameId);
        window.removeEventListener("resize", resize);
        disposeObject(scene);
        renderer.dispose();
      };
    };

    void startScene();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [variant]);

  return (
    <canvas
      aria-hidden="true"
      className={["block", className].filter(Boolean).join(" ")}
      data-dashboard-feature-row-icon-renderer={variant}
      data-dashboard-feature-row-icon-variant={variant}
      ref={canvasRef}
    />
  );
}

export function DashboardPlanRowIcon3D(props: PublicIconProps) {
  return <DashboardFeatureRowIcon3D {...props} variant="plan" />;
}

export function DashboardLibraryRowIcon3D(props: PublicIconProps) {
  return <DashboardFeatureRowIcon3D {...props} variant="library" />;
}

export function DashboardSessionsRowIcon3D(props: PublicIconProps) {
  return <DashboardFeatureRowIcon3D {...props} variant="sessions" />;
}

export function DashboardStrengthRowIcon3D(props: PublicIconProps) {
  return <DashboardFeatureRowIcon3D {...props} variant="strength" />;
}

export function DashboardMessagingRowIcon3D(props: PublicIconProps) {
  return <DashboardFeatureRowIcon3D {...props} variant="messaging" />;
}

export function DashboardTechniqueRowIcon3D(props: PublicIconProps) {
  return <DashboardFeatureRowIcon3D {...props} variant="technique" />;
}

export function DashboardRecoveryRowIcon3D(props: PublicIconProps) {
  return <DashboardFeatureRowIcon3D {...props} variant="recovery" />;
}

export function DashboardCheckinsRowIcon3D(props: PublicIconProps) {
  return <DashboardFeatureRowIcon3D {...props} variant="checkins" />;
}

export function DashboardProfileRowIcon3D(props: PublicIconProps) {
  return <DashboardFeatureRowIcon3D {...props} variant="profile" />;
}

export function DashboardProgressRowIcon3D(props: PublicIconProps) {
  return <DashboardFeatureRowIcon3D {...props} variant="progress" />;
}

export function DashboardNutritionRowIcon3D(props: PublicIconProps) {
  return <DashboardFeatureRowIcon3D {...props} variant="nutrition" />;
}

export function DashboardGoalsRowIcon3D(props: PublicIconProps) {
  return <DashboardFeatureRowIcon3D {...props} variant="goals" />;
}

export function DashboardWinsRowIcon3D(props: PublicIconProps) {
  return <DashboardFeatureRowIcon3D {...props} variant="wins" />;
}

export function DashboardRewardsRowIcon3D(props: PublicIconProps) {
  return <DashboardFeatureRowIcon3D {...props} variant="rewards" />;
}

export default DashboardFeatureRowIcon3D;

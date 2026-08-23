"use client";

import { useMemo, useRef } from "react";
import type { BufferGeometry, Material, Object3D } from "three";
import DashboardWebGlWidget from "./DashboardWebGlWidget";
import type {
  DashboardWidgetBuilder,
  DashboardWidgetInstance,
} from "./dashboardWebGlStage";

type ThreeModule = typeof import("three");

type DashboardLightningBolt3DProps = {
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

const createBoltShape = (THREE: ThreeModule) => {
  const shape = new THREE.Shape();
  const points = [
    [0.08, 1.14],
    [-0.66, 0.08],
    [-0.2, 0.08],
    [-0.47, -1],
    [0.68, -0.1],
    [0.21, -0.1],
  ] as const;

  shape.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => shape.lineTo(x, y));
  shape.closePath();
  return shape;
};

export default function DashboardLightningBolt3D({
  active = false,
  className = "",
  paused = false,
}: DashboardLightningBolt3DProps) {
  const activeRef = useRef(active);
  activeRef.current = active;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const build = useMemo<DashboardWidgetBuilder>(
    () =>
      ({ THREE }): DashboardWidgetInstance => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 14);
      camera.position.set(0, 0.02, 4.35);
      camera.lookAt(0, 0, 0);

      scene.add(new THREE.AmbientLight(new THREE.Color("#e0f2fe"), 1.05));

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
      keyLight.position.set(-1.6, 2.4, 3.4);
      scene.add(keyLight);

      const cyanLight = new THREE.PointLight(new THREE.Color("#38bdf8"), 3.2, 5.2);
      cyanLight.position.set(-0.7, 0.4, 2.2);
      scene.add(cyanLight);

      const blueLight = new THREE.PointLight(new THREE.Color("#2563eb"), 2.1, 4.2);
      blueLight.position.set(1.2, -0.7, 2.6);
      scene.add(blueLight);

      const group = new THREE.Group();
      group.position.y = -0.08;
      group.rotation.set(0.04, 0.04, 0);
      scene.add(group);

      const boltGeometry = new THREE.ExtrudeGeometry(createBoltShape(THREE), {
        bevelEnabled: true,
        bevelSegments: 7,
        bevelSize: 0.038,
        bevelThickness: 0.046,
        depth: 0.22,
      });
      boltGeometry.center();

      const boltMaterial = new THREE.MeshPhysicalMaterial({
        clearcoat: 0.78,
        clearcoatRoughness: 0.16,
        color: new THREE.Color("#38bdf8"),
        emissive: new THREE.Color("#0284c7"),
        emissiveIntensity: 0.34,
        metalness: 0.5,
        roughness: 0.18,
      });

      const bolt = new THREE.Mesh(boltGeometry, boltMaterial);
      bolt.rotation.z = 0;
      group.add(bolt);

      const glowMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#7dd3fc"),
        depthWrite: false,
        opacity: 0.18,
        transparent: true,
      });
      const glow = new THREE.Mesh(boltGeometry.clone(), glowMaterial);
      glow.position.z = -0.06;
      glow.scale.set(1.12, 1.12, 1.02);
      group.add(glow);

      const auraGroup = new THREE.Group();
      auraGroup.position.z = -0.12;
      auraGroup.scale.setScalar(0.68);
      group.add(auraGroup);

      const makeAuraShard = (
        color: string,
        height: number,
        width: number,
        y: number,
        rotation: number,
        phase: number,
      ) => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(
            [0, height * 0.5, 0, -width * 0.5, -height * 0.5, 0, width * 0.5, -height * 0.5, 0],
            3,
          ),
        );
        geometry.computeVertexNormals();

        const material = new THREE.MeshBasicMaterial({
          blending: THREE.AdditiveBlending,
          color: new THREE.Color(color),
          depthWrite: false,
          opacity: 0,
          side: THREE.DoubleSide,
          transparent: true,
        });
        const shard = new THREE.Mesh(geometry, material);
        shard.position.y = y;
        shard.rotation.z = rotation;
        shard.userData.baseRotation = rotation;
        shard.userData.phase = phase;
        auraGroup.add(shard);
        return shard;
      };

      const auraShards = [
        makeAuraShard("#fef08a", 0.96, 0.18, 0.12, 0, 0),
        makeAuraShard("#bae6fd", 0.84, 0.13, 0.02, -0.52, 1.1),
        makeAuraShard("#bae6fd", 0.84, 0.13, 0.02, 0.52, 2.2),
        makeAuraShard("#60a5fa", 0.7, 0.1, -0.12, -0.82, 3.0),
        makeAuraShard("#60a5fa", 0.7, 0.1, -0.12, 0.82, 3.8),
      ];

      const edgeGeometry = new THREE.EdgesGeometry(boltGeometry, 18);
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color("#e0f2fe"),
        opacity: 0.42,
        transparent: true,
      });
      const edge = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      edge.position.z = 0.015;
      group.add(edge);

      const sparkMaterial = new THREE.MeshBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: new THREE.Color("#bae6fd"),
        opacity: 0.14,
        transparent: true,
      });
      const sparkGeometry = new THREE.SphereGeometry(0.025, 12, 8);
      const sparks = [
        { phase: 0.1, x: -0.52, y: 0.58 },
        { phase: 1.3, x: 0.44, y: 0.34 },
        { phase: 2.1, x: -0.28, y: -0.54 },
        { phase: 3.0, x: 0.58, y: -0.34 },
      ].map(({ phase, x, y }) => {
        const spark = new THREE.Mesh(sparkGeometry, sparkMaterial.clone());
        spark.position.set(x, y, 0.22);
        spark.userData.phase = phase;
        group.add(spark);
        return spark;
      });

      let charge = 0;
      const update = (elapsed: number, delta: number) => {
        const seconds = elapsed;
        const targetCharge = activeRef.current && !pausedRef.current ? 1 : 0;
        charge += (targetCharge - charge) * Math.min(1, delta * 12);

        const pulse = charge * (0.026 + Math.sin(seconds * 8.2) * 0.01);
        group.scale.setScalar(0.78 + pulse);
        group.rotation.x = 0.04 + Math.sin(seconds * 1.8) * 0.014 * charge;
        group.rotation.y = 0.04 + Math.sin(seconds * 1.45) * 0.012 * charge;
        group.rotation.z = 0;

        boltMaterial.emissiveIntensity =
          0.28 + charge * (0.74 + Math.sin(seconds * 10.5) * 0.12);
        glowMaterial.opacity =
          0.12 + charge * (0.2 + Math.sin(seconds * 7) * 0.05);
        edgeMaterial.opacity = 0.34 + charge * 0.24;
        cyanLight.intensity = 2.6 + charge * 1.8;
        blueLight.intensity = 1.7 + charge * 1.1;

        auraGroup.scale.setScalar(
          0.82 + charge * (0.24 + Math.sin(seconds * 7.6) * 0.04),
        );
        auraShards.forEach((shard, index) => {
          const material = shard.material as Material & { opacity: number };
          const shardPhase = shard.userData.phase as number;
          const baseRotation = shard.userData.baseRotation as number;
          const flicker = Math.max(0, Math.sin(seconds * 8.4 + shardPhase));
          material.opacity = charge * (0.12 + flicker * (index === 0 ? 0.28 : 0.2));
          shard.rotation.z =
            baseRotation + Math.sin(seconds * 5.2 + shardPhase) * 0.035 * charge;
          shard.scale.y = 0.92 + charge * (0.16 + flicker * 0.12);
          shard.scale.x = 0.86 + charge * 0.12;
        });

        sparks.forEach((spark, index) => {
          const sparkPhase = spark.userData.phase as number;
          const sparkPulse = Math.max(
            0,
            Math.sin(seconds * 5.8 + sparkPhase),
          );
          const sparkCharge = charge * sparkPulse;
          spark.scale.setScalar(0.58 + sparkCharge * (1.4 + index * 0.12));
          spark.position.z = 0.2 + sparkCharge * 0.1;
          const material = spark.material as Material & { opacity: number };
          material.opacity = 0.08 + sparkCharge * 0.62;
        });
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
    [],
  );

  return <DashboardWebGlWidget build={build} className={className} />;
}

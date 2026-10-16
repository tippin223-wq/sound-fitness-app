"use client";

import { useEffect, useRef } from "react";
import type {
  BufferGeometry,
  Group,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Plane,
  Raycaster,
  Scene,
  Vector2,
  WebGLRenderer,
} from "three";
import {
  defaultSoundFitnessAvatarAppearance,
  soundFitnessAvatarEyesPalettes,
  soundFitnessAvatarHairColorPalettes,
  soundFitnessAvatarPantsPalettes,
  soundFitnessAvatarShirtPalettes,
  soundFitnessAvatarShoesPalettes,
  soundFitnessAvatarSkinPalettes,
  type SoundFitnessAvatarAppearance,
  type SoundFitnessAvatarBodyPart,
  type SoundFitnessAvatarEmotePreset,
  type SoundFitnessAvatarGlowRegion,
} from "./soundFitnessAvatarAppearance";
import {
  createDashboardWebGlRenderer,
  loadDashboardThree,
  markDashboardWebGlFallback,
  setDashboardWebGlCanvasActive,
  waitForDashboardWebGlStart,
} from "./dashboardWebGlRenderer";

/**
 * The Sound Fitness avatar: a procedural GLB (59 named part meshes, 17 named
 * materials, no rig) drawn on its own canvas. Everything that used to need
 * the flat SVG twin — appearance from the Avatar Lab, body-part hover and
 * click, muscle highlights, emotes — is done here on the real geometry:
 *
 * - Appearance recolours materials by name and toggles part meshes; gear is
 *   procedural and sized from the parts it sits on.
 * - Highlights are shells of the actual part geometry (cloned, scaled ~4%,
 *   additive), cut to sub-regions (biceps = upper front half of the arm) by
 *   clipping planes derived from each part's bounding box, so a highlight
 *   can never sit off the body.
 * - Hover/click raycast the part meshes; the torso splits into chest, core
 *   and back by hit point.
 * - Emotes rotate arm and head pivots re-parented at the joints.
 *
 * The scene is built once per mount; prop changes update it in place (the
 * previous version reloaded the model on every highlight change).
 */

type SoundFitnessAvatar3DProps = {
  active?: boolean;
  appearance?: Partial<SoundFitnessAvatarAppearance>;
  bodyPartGlowActive?: boolean;
  /** Per-region highlight colours (hex); regions without one use a default. */
  bodyPartGlowColors?: Partial<
    Record<SoundFitnessAvatarGlowRegion, string | undefined>
  >;
  className?: string;
  emotePreset?: SoundFitnessAvatarEmotePreset;
  glowFocus?: SoundFitnessAvatarGlowRegion | null;
  glowMode?: "whole" | "pieces";
  /** Body-part hover/click on the model (plus a screen-reader button set). */
  interactive?: boolean;
  onBodyPartHover?: (bodyPart: SoundFitnessAvatarBodyPart | null) => void;
  onBodyPartSelect?: (bodyPart: SoundFitnessAvatarBodyPart) => void;
  onReadyChange?: (ready: boolean) => void;
  paused?: boolean;
  selectedBodyPart?: SoundFitnessAvatarBodyPart;
  viewOverride?: "front" | "back";
};

type ThreeModule = typeof import("three");
type MaterialObject = Object3D & { material?: Material | Material[] };
type GeometryObject = Object3D & { geometry?: BufferGeometry };
type Frac = [number, number];

const SOUND_AVATAR_MODEL_URL = "/models/sound-avatar.glb";
const SOUND_AVATAR_MODEL_SCALE = 0.79;
const SOUND_AVATAR_BASE_Y = -1.18;
// Highlight shells fade over this long when the glow turns off; bounded, so
// it is not a standing animation.
const HIGHLIGHT_FADE_MS = 350;

// Garment profiles as [radius, y] in root space, bottom to top. The tee and
// pelvis come in two cuts that carry the body profile.
type LatheProfile = Array<[number, number]>;
const TEE_PROFILES: Record<"male" | "female", LatheProfile> = {
  // V taper: wide shoulder line, narrow hem, worn out over the joggers.
  male: [
    [0, 1.44], [0.48, 1.44], [0.53, 1.5], [0.5, 1.62], [0.475, 1.76], [0.5, 1.96],
    [0.555, 2.16], [0.585, 2.34], [0.595, 2.46], [0.56, 2.57], [0.44, 2.66],
    [0.28, 2.71], [0.18, 2.73], [0, 2.73],
  ],
  // Tucked at the waist so the hip curve shows; narrower shoulder line;
  // the bust is sculpted in afterwards.
  female: [
    [0, 1.6], [0.45, 1.6], [0.45, 1.66], [0.43, 1.76], [0.42, 1.86], [0.45, 2.02],
    [0.5, 2.2], [0.525, 2.36], [0.52, 2.48], [0.48, 2.57], [0.39, 2.66],
    [0.26, 2.71], [0.17, 2.73], [0, 2.73],
  ],
};
const PELVIS_PROFILES: Record<"male" | "female", LatheProfile> = {
  male: [
    [0, 1.22], [0.38, 1.22], [0.45, 1.32], [0.48, 1.46], [0.485, 1.6], [0.47, 1.72],
    [0.45, 1.8], [0.42, 1.83], [0, 1.83],
  ],
  // Widest below the tee's tucked hem, waist tucked under it.
  female: [
    [0, 1.22], [0.4, 1.22], [0.5, 1.32], [0.545, 1.44], [0.55, 1.54], [0.52, 1.64],
    [0.44, 1.74], [0.42, 1.83], [0, 1.83],
  ],
};
// Along the arm: 0 is the shoulder joint, negative runs down the arm.
const SLEEVE_PROFILE: LatheProfile = [
  [0, -0.4], [0.14, -0.4], [0.165, -0.36], [0.19, -0.24], [0.21, -0.1],
  [0.215, 0.03], [0.19, 0.14], [0.12, 0.21], [0, 0.23],
];
// The two leg tubes meet at the knee (y 0.74-0.76) instead of overlapping.
const THIGH_PROFILE: LatheProfile = [
  [0, 0.74], [0.15, 0.74], [0.155, 0.78], [0.17, 0.9], [0.185, 1.06], [0.185, 1.22],
  [0.15, 1.32], [0, 1.32],
];
const SHIN_PROFILE: LatheProfile = [
  [0, 0.08], [0.1, 0.08], [0.115, 0.12], [0.12, 0.26], [0.135, 0.44], [0.145, 0.62],
  [0.15, 0.76], [0, 0.76],
];
const CREST_ONLY_SHIRT_DECORATION_NAMES = [
  "performance seam",
  "performance piping",
  "sleeve cuff stripe",
  "v collar stripe",
  "small left chest crest",
  "subtle chest speed slash",
];
const CREST_ONLY_SHIRT_ALLOWED_DECORATION_NAMES = [
  "sound crest navy shield mark",
  "sound crest cyan diagonal",
];

const bodyPartLabels: Record<SoundFitnessAvatarBodyPart, string> = {
  arms: "Arms",
  back: "Back",
  chest: "Chest",
  core: "Core",
  legs: "Legs",
  neck: "Neck",
  shoulders: "Shoulders",
};

const bodyPartDefaultColors: Record<SoundFitnessAvatarBodyPart, string> = {
  arms: "#67e8f9",
  back: "#a78bfa",
  chest: "#38bdf8",
  core: "#f59e0b",
  legs: "#34d399",
  neck: "#fbbf24",
  shoulders: "#fb7185",
};

const regionDefaultColors: Partial<Record<SoundFitnessAvatarGlowRegion, string>> = {
  abductors: "#34d399",
  adductors: "#34d399",
  biceps: "#67e8f9",
  calves: "#34d399",
  forearms: "#67e8f9",
  frontDelt: "#fb7185",
  glutes: "#34d399",
  hamstrings: "#34d399",
  hipRotators: "#34d399",
  lats: "#a78bfa",
  lateralDelt: "#fb7185",
  lowerBack: "#a78bfa",
  lowerChest: "#38bdf8",
  midChest: "#38bdf8",
  obliques: "#f59e0b",
  quads: "#34d399",
  rearDelt: "#fb7185",
  rhomboids: "#a78bfa",
  rotatorExternal: "#a78bfa",
  rotatorInternal: "#fb7185",
  tibialis: "#34d399",
  traps: "#a78bfa",
  triceps: "#67e8f9",
  upperChest: "#38bdf8",
};

// ---------------------------------------------------------------- part names
const UPPER_ARMS = ["left upper arm", "right upper arm"];
const HANDS = ["left hand", "right hand"];
const WRIST_BANDS = ["left wrist band", "right wrist band"];
const SHOULDERS = ["left shoulder", "right shoulder"];
const TORSO = ["torso shirt core"];
const HIPS = ["hips"];
const THIGHS = ["left thigh", "right thigh"];
const SHINS = ["left shin", "right shin"];
const NECK = ["neck"];
const LEFT_LEG_PARTS = ["left thigh", "left shin", "left shoe", "left shoe sole glow"];
const RIGHT_LEG_PARTS = ["right thigh", "right shin", "right shoe", "right shoe sole glow"];
const CREST_PARTS = [
  "sound fitness small left chest crest",
  "sound crest navy shield mark",
  "sound crest cyan diagonal",
];
// Everything that rides on the torso and scales with the body profile.
const TORSO_ATTACHED_PARTS = [
  ...TORSO,
  ...SHOULDERS,
  ...CREST_PARTS,
  "upper chest shoulder yoke",
  "left shirt side plane",
  "right shirt side plane",
  "relaxed lower shirt drape",
  "front shirt hem overhang",
  "left shirt hem fold",
  "right shirt hem fold",
  "left side performance piping",
  "right side performance piping",
  "left v collar stripe",
  "right v collar stripe",
  "left shoulder performance seam",
  "right shoulder performance seam",
  "subtle chest speed slash",
];

/**
 * A highlight is a set of part meshes plus optional fractions of each
 * part's own bounding box: `x`/`y`/`z` are model-space fractions (0 = min,
 * 1 = max), `lateral` runs from the body's midline (0) outward (1) so one
 * spec serves both sides, and `x` may list two ranges (obliques flank the
 * rectus column). The shells are the parts' real geometry, so the glow
 * hugs the figure and is occluded by it from behind.
 */
type HighlightSpec = {
  /** Extra shell scale for parts buried under their neighbours. */
  grow?: number;
  lateral?: Frac;
  parts: string[];
  x?: Frac | Frac[];
  y?: Frac;
  z?: Frac;
};

const wholeBodyPartSpecs: Record<SoundFitnessAvatarBodyPart, HighlightSpec[]> = {
  arms: [{ parts: [...UPPER_ARMS, ...HANDS, ...WRIST_BANDS] }],
  back: [{ parts: TORSO, y: [0.04, 0.97], z: [0, 0.42] }],
  chest: [{ parts: TORSO, y: [0.45, 0.86], z: [0.5, 1] }],
  core: [{ parts: TORSO, x: [0.08, 0.92], y: [0.04, 0.45], z: [0.5, 1] }],
  // Cut at the knee plane so the two tube shells meet instead of stacking
  // into a bright seam.
  legs: [
    { parts: THIGHS, y: [0.02, 1] },
    { parts: SHINS, y: [0, 0.985] },
  ],
  // The neck mesh is enclosed by the head and torso; the collar band on
  // the torso carries the visible glow.
  neck: [
    { grow: 1.28, parts: NECK },
    { parts: TORSO, y: [0.86, 0.97] },
  ],
  shoulders: [{ parts: SHOULDERS }],
};

const regionSpecs: Partial<Record<SoundFitnessAvatarGlowRegion, HighlightSpec[]>> = {
  abductors: [{ lateral: [0.58, 1], parts: THIGHS, y: [0.35, 0.96] }],
  adductors: [{ lateral: [0, 0.42], parts: THIGHS, y: [0.1, 0.9] }],
  biceps: [{ parts: UPPER_ARMS, y: [0.5, 0.98], z: [0.5, 1] }],
  calves: [{ parts: SHINS, y: [0.36, 0.95], z: [0, 0.5] }],
  forearms: [{ parts: UPPER_ARMS, y: [0.02, 0.5] }],
  frontDelt: [{ parts: SHOULDERS, z: [0.56, 1] }],
  glutes: [{ parts: HIPS, y: [0.08, 0.92], z: [0, 0.46] }],
  hamstrings: [{ parts: THIGHS, y: [0.06, 0.96], z: [0, 0.5] }],
  hipRotators: [{ lateral: [0.5, 1], parts: HIPS, y: [0.1, 0.9], z: [0, 0.55] }],
  lateralDelt: [{ lateral: [0.52, 1], parts: SHOULDERS }],
  lats: [{ parts: TORSO, x: [[0.02, 0.32], [0.68, 0.98]], y: [0.2, 0.62], z: [0, 0.42] }],
  lowerBack: [{ parts: TORSO, x: [0.24, 0.76], y: [0.03, 0.28], z: [0, 0.42] }],
  lowerChest: [{ parts: TORSO, y: [0.45, 0.58], z: [0.58, 1] }],
  midChest: [{ parts: TORSO, y: [0.58, 0.72], z: [0.58, 1] }],
  obliques: [{ parts: TORSO, x: [[0.06, 0.32], [0.68, 0.94]], y: [0.06, 0.45], z: [0.58, 1] }],
  quads: [{ parts: THIGHS, y: [0.06, 0.96], z: [0.5, 1] }],
  rearDelt: [{ parts: SHOULDERS, z: [0, 0.44] }],
  rhomboids: [{ parts: TORSO, x: [0.3, 0.7], y: [0.5, 0.74], z: [0, 0.42] }],
  rotatorExternal: [{ parts: TORSO, x: [[0.08, 0.32], [0.68, 0.92]], y: [0.6, 0.78], z: [0, 0.42] }],
  rotatorInternal: [{ parts: TORSO, x: [[0.06, 0.3], [0.7, 0.94]], y: [0.58, 0.76], z: [0.58, 1] }],
  tibialis: [{ parts: SHINS, y: [0.3, 0.9], z: [0.5, 1] }],
  traps: [{ parts: TORSO, x: [0.18, 0.82], y: [0.74, 0.98], z: [0, 0.42] }],
  triceps: [{ parts: UPPER_ARMS, y: [0.5, 0.98], z: [0, 0.5] }],
  upperChest: [{ parts: TORSO, y: [0.72, 0.86], z: [0.58, 1] }],
  core: [{ parts: TORSO, x: [0.32, 0.68], y: [0.04, 0.45], z: [0.58, 1] }],
};

// ---------------------------------------------------------------- helpers
const disposeObject = (object: Object3D) => {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  object.traverse((child) => {
    const geometry = (child as GeometryObject).geometry;
    if (geometry) geometries.add(geometry);
    const material = (child as MaterialObject).material;
    if (!material) return;
    if (Array.isArray(material)) material.forEach((item) => materials.add(item));
    else materials.add(material);
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
};

// GLTFLoader sanitises node names ("left wrist band" -> "left_wrist_band");
// every lookup and comparison goes through this so the specs can use the
// names as authored in the model.
const normalizeName = (name: string) =>
  name.toLowerCase().replace(/[_\s]+/g, " ").trim();

const simplifyShirtToCrestOnly = (root: Object3D) => {
  root.traverse((child) => {
    const name = normalizeName(child.name);
    const material = (child as MaterialObject).material;
    const materialName = Array.isArray(material)
      ? material.map((entry) => entry.name.toLowerCase()).join(" ")
      : (material?.name.toLowerCase() ?? "");
    const allowed = CREST_ONLY_SHIRT_ALLOWED_DECORATION_NAMES.some((fragment) =>
      name.includes(fragment),
    );
    if (
      !allowed &&
      (CREST_ONLY_SHIRT_DECORATION_NAMES.some((fragment) => name.includes(fragment)) ||
        materialName.includes("cyan performance shirt seams"))
    ) {
      child.visible = false;
    }
  });
};

const includesAny = (name: string, fragments: string[]) =>
  fragments.some((fragment) => name.includes(fragment));


const HEAD_PART_FRAGMENTS = [
  "head sculpt",
  "face highlight",
  "cheek",
  "hair",
  "crown",
  "temple",
  "eye white",
  "iris",
  "pupil",
  "nose",
  "smile",
];

const partForHit = (
  name: string,
  point: { x: number; y: number; z: number },
  chestFloorY: number,
): SoundFitnessAvatarBodyPart | null => {
  // The shirt yoke is torso, not the shoulder spheres.
  if (name.includes("shoulder") && !name.includes("yoke")) return "shoulders";
  if (includesAny(name, ["upper arm", "hand", "wrist band", "sleeve cuff"])) return "arms";
  if (includesAny(name, ["thigh", "shin", "shoe"])) return "legs";
  if (name === "neck") return "neck";
  if (name === "hips") return point.z < 0 ? "legs" : "core";
  if (includesAny(name, HEAD_PART_FRAGMENTS)) return null;
  // Everything else is torso and shirt decoration.
  if (point.z < 0) return "back";
  return point.y >= chestFloorY ? "chest" : "core";
};

const parseColor = (THREE: ThreeModule, value: string | undefined, fallback: string) => {
  const color = new THREE.Color();
  if (value) {
    const rgb = value.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
    if (rgb) {
      color.setRGB(Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255);
      return color;
    }
    try {
      color.set(value);
      return color;
    } catch {
      /* fall through to the default */
    }
  }
  color.set(fallback);
  return color;
};

type EmotePose = {
  head: [number, number, number];
  leftArm: [number, number];
  rightArm: [number, number];
};

const restPose: EmotePose = { head: [0, 0, 0], leftArm: [0, 0], rightArm: [0, 0] };

// Arm pivots sit at the shoulder joint; z rotates the arm out to the side
// (right arm positive, left negative raises), x swings it forward.
const emotePoses: Record<SoundFitnessAvatarEmotePreset, EmotePose> = {
  calm: restPose,
  celebrate: { head: [-0.08, 0, 0], leftArm: [0, -2.55], rightArm: [0, 2.55] },
  focus: { head: [0.16, 0, 0], leftArm: [0.38, -0.12], rightArm: [0.38, 0.12] },
  nod: restPose,
  salute: { head: [0, 0, 0], leftArm: [0, 0], rightArm: [0.95, 1.85] },
  stretch: { head: [-0.14, 0, 0], leftArm: [0, -2.95], rightArm: [0, 2.95] },
  wave: { head: [0, 0, 0.08], leftArm: [0, 0], rightArm: [0, 2.35] },
};

export default function SoundFitnessAvatar3D({
  active = true,
  appearance,
  bodyPartGlowActive = false,
  bodyPartGlowColors,
  className,
  emotePreset = "calm",
  glowFocus,
  glowMode = "whole",
  interactive = false,
  onBodyPartHover,
  onBodyPartSelect,
  onReadyChange,
  paused = false,
  selectedBodyPart,
  viewOverride,
}: SoundFitnessAvatar3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const resolvedAppearance = { ...defaultSoundFitnessAvatarAppearance, ...appearance };
  const appearanceKey = JSON.stringify(resolvedAppearance);
  const highlightKey = JSON.stringify({
    active: bodyPartGlowActive,
    colors: bodyPartGlowColors ?? null,
    focus: glowMode === "pieces" ? (glowFocus ?? null) : null,
    part: selectedBodyPart ?? null,
  });
  const resolvedView =
    viewOverride ?? (selectedBodyPart === "back" ? "back" : "front");

  // Latest props for the render loop and the imperative updaters.
  const latest = useRef({
    active,
    appearance: resolvedAppearance,
    bodyPartGlowActive,
    bodyPartGlowColors,
    emotePreset,
    glowFocus,
    glowMode,
    interactive,
    onBodyPartHover,
    onBodyPartSelect,
    paused,
    selectedBodyPart,
    view: resolvedView,
  });
  latest.current = {
    active,
    appearance: resolvedAppearance,
    bodyPartGlowActive,
    bodyPartGlowColors,
    emotePreset,
    glowFocus,
    glowMode,
    interactive,
    onBodyPartHover,
    onBodyPartSelect,
    paused,
    selectedBodyPart,
    view: resolvedView,
  };
  // Imperative updaters installed once the scene exists.
  const updaters = useRef<{
    applyAppearance: () => void;
    applyHighlight: () => void;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let disposed = false;
    let cleanup = () => {};
    onReadyChange?.(false);

    const start = async () => {
      try {
        await waitForDashboardWebGlStart({ canvas, priority: true });
        if (disposed) return;
        const [THREE, { GLTFLoader }] = await Promise.all([
          loadDashboardThree(),
          import("three/examples/jsm/loaders/GLTFLoader.js"),
        ]);
        if (disposed) return;

        let renderer: WebGLRenderer | null = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          renderer = createDashboardWebGlRenderer(
            THREE,
            canvas,
            {
              alpha: true,
              antialias: true,
              powerPreference: "high-performance",
              preserveDrawingBuffer: true,
            },
            { priority: true },
          );
          if (renderer || disposed) break;
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, 260 + attempt * 240);
          });
          await waitForDashboardWebGlStart({ canvas, priority: true });
        }
        if (!renderer || disposed) {
          onReadyChange?.(false);
          return;
        }
        const gl = renderer;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.setClearColor(0x000000, 0);
        gl.localClippingEnabled = true;

        const scene: Scene = new THREE.Scene();
        const camera: PerspectiveCamera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
        camera.position.set(0, 0.98, 7.05);
        camera.lookAt(0, 0.46, 0);

        scene.add(new THREE.HemisphereLight(0xbdefff, 0x172033, 1.75));
        const keyLight = new THREE.DirectionalLight(0xffffff, 2.55);
        keyLight.position.set(-2.8, 4.2, 4.8);
        scene.add(keyLight);
        const rimLight = new THREE.DirectionalLight(0x67e8f9, 1.15);
        rimLight.position.set(3.2, 2.2, -3.4);
        scene.add(rimLight);
        const fillLight = new THREE.PointLight(0x38bdf8, 1.25, 6);
        fillLight.position.set(0.8, 1.1, 2.1);
        scene.add(fillLight);

        const gltf = await new GLTFLoader().loadAsync(SOUND_AVATAR_MODEL_URL);
        if (disposed) {
          disposeObject(gltf.scene);
          return;
        }
        const root: Object3D = gltf.scene;
        root.name = "Sound Fitness 3D Avatar";
        simplifyShirtToCrestOnly(root);
        root.position.set(0, SOUND_AVATAR_BASE_Y, 0);
        root.scale.setScalar(SOUND_AVATAR_MODEL_SCALE);
        scene.add(root);

        // ---- part index: mesh by name, bounding box in root space ----
        const parts = new Map<string, Mesh>();
        const partBoxes = new Map<string, InstanceType<ThreeModule["Box3"]>>();
        // The parts are unit geometries sized by their node scale, so every
        // resize below multiplies this baseline instead of overwriting it.
        const baseScales = new Map<string, InstanceType<ThreeModule["Vector3"]>>();
        // Root-space rest transform of every part, captured before the joint
        // pivots re-parent the limbs; the highlight cuts read its axis signs.
        const partRestMatrices = new Map<string, Matrix4>();
        const materialsByName = new Map<string, MeshStandardMaterial>();
        // The loader leaves TRS node matrices at identity until the first
        // world update, so the boxes are built from the resolved transforms.
        root.updateMatrixWorld(true);
        const rootInverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
        root.traverse((child) => {
          const mesh = child as Mesh;
          if (!mesh.isMesh) return;
          const key = normalizeName(mesh.name);
          parts.set(key, mesh);
          baseScales.set(key, mesh.scale.clone());
          const rest = new THREE.Matrix4().copy(rootInverse).multiply(mesh.matrixWorld);
          partRestMatrices.set(key, rest);
          mesh.geometry.computeBoundingBox();
          const box = new THREE.Box3().copy(mesh.geometry.boundingBox!);
          box.applyMatrix4(rest);
          partBoxes.set(key, box);
          const material = mesh.material as MeshStandardMaterial;
          if (material && !Array.isArray(material)) {
            materialsByName.set(material.name.toLowerCase(), material);
          }
        });
        const part = (name: string) => parts.get(name) ?? null;
        const partBox = (name: string) => partBoxes.get(name) ?? null;
        const scalePart = (name: string, x: number, y = x, z = x) => {
          const mesh = part(name);
          const base = baseScales.get(name);
          if (!mesh || !base) return;
          mesh.scale.set(base.x * x, base.y * y, base.z * z);
        };

        // ---- joint pivots (world transforms preserved by attach) ----
        const makePivot = (name: string, x: number, y: number, z: number, members: string[]) => {
          const pivot: Group = new THREE.Group();
          pivot.name = name;
          pivot.position.set(x, y, z);
          root.add(pivot);
          for (const member of members) {
            const mesh = part(member);
            if (mesh) pivot.attach(mesh);
          }
          return pivot;
        };
        // Joints come from the indexed boxes: the model's group node carries
        // an offset, so authored heights would land near the elbows.
        const jointCentre = (name: string, fallback: [number, number, number]) => {
          const box = partBox(name);
          return box
            ? ([(box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, (box.min.z + box.max.z) / 2] as const)
            : fallback;
        };
        const leftShoulder = jointCentre("left shoulder", [-0.55, 2.44, 0]);
        const rightShoulder = jointCentre("right shoulder", [0.55, 2.44, 0]);
        const headBox = partBox("head sculpt");
        const headBaseY = headBox ? headBox.min.y + 0.08 : 2.6;
        const leftArmPivot = makePivot("left arm pivot", leftShoulder[0], leftShoulder[1], leftShoulder[2], [
          "left upper arm",
          "left wrist band",
          "left hand",
          "left sleeve cuff stripe",
        ]);
        const rightArmPivot = makePivot("right arm pivot", rightShoulder[0], rightShoulder[1], rightShoulder[2], [
          "right upper arm",
          "right wrist band",
          "right hand",
          "right sleeve cuff stripe",
        ]);
        const headPivot = makePivot(
          "head pivot",
          0,
          headBaseY,
          0.02,
          Array.from(parts.keys()).filter((name) =>
            includesAny(name, HEAD_PART_FRAGMENTS),
          ),
        );

        // Anything worn on the head rides this group: it sits under the head
        // pivot but is offset back to the root's origin, so attachments are
        // placed in the same coordinates as the part boxes and still turn
        // with the head.
        const headAttachGroup: Group = new THREE.Group();
        headAttachGroup.name = "head attachments";
        headAttachGroup.position.set(0, -headBaseY, -0.02);
        headPivot.add(headAttachGroup);
        const hairGroup: Group = new THREE.Group();
        hairGroup.name = "hair";
        headAttachGroup.add(hairGroup);
        const headGearGroup: Group = new THREE.Group();
        headGearGroup.name = "head gear";
        headAttachGroup.add(headGearGroup);

        // ---- body profile rig ----
        // The torso cluster and the hips scale about their own centres, so
        // the shirt, its decorations and the shoulders move as one.
        const torsoCentre = jointCentre("torso shirt core", [0, 2.14, 0]);
        const hipsCentre = jointCentre("hips", [0, 1.54, 0]);
        const torsoPivot = makePivot("torso pivot", 0, torsoCentre[1], 0, TORSO_ATTACHED_PARTS);
        const hipsPivot = makePivot("hips pivot", 0, hipsCentre[1], 0, HIPS);
        // ---- garments: cloth over the primitive figure ----
        // The model's torso, hips, shoulders and legs are bare ellipsoids and
        // capsules. The tee, sleeves and joggers are smooth lathes in the same
        // materials, sized to the part boxes; each replaces its primitive in
        // the part index (highlights, hit-testing and gear follow the cloth)
        // and the primitive is hidden. The tee, pelvis and head each have a
        // second geometry for the female profile.
        const shirtMaterial =
          materialsByName.get("sound navy performance shirt") ??
          new THREE.MeshStandardMaterial({ color: "#1e293b" });
        const joggerMaterial =
          materialsByName.get("charcoal training joggers") ??
          new THREE.MeshStandardMaterial({ color: "#1f2937" });
        const latheGeometry = (profile: LatheProfile, zRatio: number) => {
          const geometry = new THREE.LatheGeometry(
            profile.map(([r, y]) => new THREE.Vector2(r, y)),
            48,
          );
          // Bodies are wider than they are deep.
          geometry.scale(1, 1, zRatio);
          geometry.computeVertexNormals();
          geometry.computeBoundingBox();
          return geometry;
        };
        // A soft bust raised out of the tee's front, no separate shapes.
        const sculptBust = (geometry: BufferGeometry) => {
          const position = geometry.getAttribute("position");
          for (let i = 0; i < position.count; i += 1) {
            const z = position.getZ(i);
            if (z <= 0) continue;
            const across = Math.exp(-((Math.abs(position.getX(i)) - 0.17) ** 2) / (2 * 0.085 ** 2));
            const along = Math.exp(-((position.getY(i) - 2.24) ** 2) / (2 * 0.12 ** 2));
            position.setZ(i, z + 0.11 * across * along);
          }
          position.needsUpdate = true;
          geometry.computeVertexNormals();
          geometry.computeBoundingBox();
          return geometry;
        };
        // The head sculpt is a unit sphere; the lower half narrows toward
        // the chin (and recedes a little at the front) for a smaller jaw.
        const taperJaw = (source: BufferGeometry) => {
          const geometry = source.clone();
          const position = geometry.getAttribute("position");
          for (let i = 0; i < position.count; i += 1) {
            const y = position.getY(i);
            if (y >= 0) continue;
            const depth = Math.pow(-y, 1.3);
            position.setX(i, position.getX(i) * (1 - 0.24 * depth));
            const z = position.getZ(i);
            if (z > 0) position.setZ(i, z * (1 - 0.12 * depth));
          }
          position.needsUpdate = true;
          geometry.computeVertexNormals();
          geometry.computeBoundingBox();
          return geometry;
        };
        // The female chest glow uses one broad, soft hump across the front
        // (higher than the bust) so the band covers the bust as one surface
        // instead of outlining it or being pierced by it.
        const sculptChestBand = (geometry: BufferGeometry) => {
          const position = geometry.getAttribute("position");
          for (let i = 0; i < position.count; i += 1) {
            const z = position.getZ(i);
            if (z <= 0) continue;
            const across = Math.exp(-(position.getX(i) ** 2) / (2 * 0.3 ** 2));
            const along = Math.exp(-((position.getY(i) - 2.24) ** 2) / (2 * 0.15 ** 2));
            position.setZ(i, z + 0.135 * across * along);
          }
          position.needsUpdate = true;
          geometry.computeVertexNormals();
          geometry.computeBoundingBox();
          return geometry;
        };
        const teeGeometries = {
          female: sculptBust(latheGeometry(TEE_PROFILES.female, 0.6)),
          femaleShell: sculptChestBand(latheGeometry(TEE_PROFILES.female, 0.6)),
          male: latheGeometry(TEE_PROFILES.male, 0.6),
        };
        const pelvisGeometries = {
          female: latheGeometry(PELVIS_PROFILES.female, 0.7),
          male: latheGeometry(PELVIS_PROFILES.male, 0.66),
        };
        const headSculpt = part("head sculpt");
        const headGeometries = headSculpt
          ? { female: taperJaw(headSculpt.geometry), male: headSculpt.geometry }
          : null;
        const replacePart = (key: string, mesh: Mesh, parent: Object3D) => {
          const original = part(key);
          if (original) original.visible = false;
          mesh.name = key;
          parent.add(mesh);
          root.updateMatrixWorld(true);
          const rest = new THREE.Matrix4().copy(rootInverse).multiply(mesh.matrixWorld);
          parts.set(key, mesh);
          baseScales.set(key, mesh.scale.clone());
          partRestMatrices.set(key, rest);
          partBoxes.set(key, new THREE.Box3().copy(mesh.geometry.boundingBox!).applyMatrix4(rest));
        };
        const refreshPartBox = (key: string) => {
          const mesh = part(key);
          const rest = partRestMatrices.get(key);
          if (!mesh || !rest) return;
          mesh.geometry.computeBoundingBox();
          partBoxes.set(key, new THREE.Box3().copy(mesh.geometry.boundingBox!).applyMatrix4(rest));
        };
        const tee: Mesh = new THREE.Mesh(teeGeometries.male, shirtMaterial);
        tee.position.y = -torsoCentre[1];
        replacePart("torso shirt core", tee, torsoPivot);
        const pelvis: Mesh = new THREE.Mesh(pelvisGeometries.male, joggerMaterial);
        pelvis.position.y = -hipsCentre[1];
        replacePart("hips", pelvis, hipsPivot);
        for (const [side, pivot, shoulder] of [
          ["left", leftArmPivot, leftShoulder],
          ["right", rightArmPivot, rightShoulder],
        ] as const) {
          // Sleeve: aimed from the shoulder joint through the upper arm, so
          // it caps the shoulder, hugs the arm and turns with it.
          const sleeve = new THREE.Mesh(latheGeometry(SLEEVE_PROFILE, 1), shirtMaterial);
          const arm = partBox(`${side} upper arm`);
          if (arm) {
            const down = new THREE.Vector3(
              (arm.min.x + arm.max.x) / 2 - shoulder[0],
              (arm.min.y + arm.max.y) / 2 - shoulder[1],
              (arm.min.z + arm.max.z) / 2 - shoulder[2],
            ).normalize();
            sleeve.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), down);
          }
          replacePart(`${side} shoulder`, sleeve, pivot);
          const x = side === "left" ? -0.23 : 0.23;
          const thigh = new THREE.Mesh(latheGeometry(THIGH_PROFILE, 0.92), joggerMaterial);
          thigh.position.x = x;
          replacePart(`${side} thigh`, thigh, root);
          const shin = new THREE.Mesh(latheGeometry(SHIN_PROFILE, 0.92), joggerMaterial);
          shin.position.x = x;
          replacePart(`${side} shin`, shin, root);
        }
        // Sculpting that shaped the old ellipsoid would float off the cloth.
        for (const name of [
          "relaxed lower shirt drape",
          "front shirt hem overhang",
          "left shirt hem fold",
          "right shirt hem fold",
          "left shirt side plane",
          "right shirt side plane",
          "left shoulder performance seam",
          "right shoulder performance seam",
          "left side performance piping",
          "right side performance piping",
        ]) {
          const mesh = part(name);
          if (mesh) mesh.visible = false;
        }
        const wearGarments = (female: boolean) => {
          tee.geometry = female ? teeGeometries.female : teeGeometries.male;
          // The glow is a band the bust rises out of, not an outline of it.
          if (female) highlightGeometryFor.set("torso shirt core", teeGeometries.femaleShell);
          else highlightGeometryFor.delete("torso shirt core");
          refreshPartBox("torso shirt core");
          pelvis.geometry = female ? pelvisGeometries.female : pelvisGeometries.male;
          refreshPartBox("hips");
          if (headSculpt && headGeometries) {
            headSculpt.geometry = female ? headGeometries.female : headGeometries.male;
          }
        };

        // Rest positions inside their pivots, for parts the profile shifts.
        const basePositions = new Map<string, InstanceType<ThreeModule["Vector3"]>>();
        parts.forEach((mesh, key) => basePositions.set(key, mesh.position.clone()));
        const offsetPart = (name: string, x: number, y: number, z: number) => {
          const mesh = part(name);
          const base = basePositions.get(name);
          if (mesh && base) mesh.position.set(base.x + x, base.y + y, base.z + z);
        };

        const shadow = new THREE.Mesh(
          new THREE.CircleGeometry(1.08, 64),
          new THREE.MeshBasicMaterial({ color: 0x020617, opacity: 0.38, transparent: true }),
        );
        shadow.name = "soft floor shadow";
        shadow.position.set(0, -1.34, 0);
        shadow.rotation.x = -Math.PI / 2;
        shadow.scale.set(1.25, 0.36, 1);
        scene.add(shadow);

        // ---- appearance ----
        const gearGroup: Group = new THREE.Group();
        gearGroup.name = "gear";
        root.add(gearGroup);
        const setColor = (materialName: string, hex: string, emissive?: string) => {
          const material = materialsByName.get(materialName);
          if (!material) return;
          material.color.set(hex);
          if (emissive !== undefined && material.emissive) {
            material.emissive.set(emissive);
          }
        };
        const setVisible = (names: string[], visible: boolean) => {
          for (const name of names) {
            const mesh = part(name);
            if (mesh) mesh.visible = visible;
          }
        };
        const gearMaterial = (hex: string, emissive = "#000000", metalness = 0.15) =>
          new THREE.MeshStandardMaterial({
            color: hex,
            emissive,
            emissiveIntensity: 0.9,
            metalness,
            roughness: 0.5,
          });
        const addGear = (name: string, mesh: Mesh, onHead = false) => {
          mesh.name = name;
          (onHead ? headGearGroup : gearGroup).add(mesh);
        };
        // Styles the model has no mesh for are built here from the head's own
        // box, so they sit on the scalp at whatever size the profile makes it.
        const hairMaterial = (hex: string, sheen: string) =>
          new THREE.MeshStandardMaterial({
            color: hex,
            emissive: sheen,
            emissiveIntensity: 0.16,
            metalness: 0.05,
            roughness: 0.62,
          });
        const buildHair = (appearanceNow: SoundFitnessAvatarAppearance) => {
          disposeObject(hairGroup);
          hairGroup.clear();
          const style = appearanceNow.hair;
          if (style !== "ponytail" && style !== "bun" && style !== "long") return;
          const head = partBox("head sculpt");
          if (!head) return;
          const colour = soundFitnessAvatarHairColorPalettes[appearanceNow.hairColor];
          const material = hairMaterial(colour.base, colour.sheen);
          const cx = (head.min.x + head.max.x) / 2;
          const cy = (head.min.y + head.max.y) / 2;
          const cz = (head.min.z + head.max.z) / 2;
          const rx = (head.max.x - head.min.x) / 2;
          const ry = (head.max.y - head.min.y) / 2;
          const rz = (head.max.z - head.min.z) / 2;
          const add = (name: string, mesh: Mesh) => {
            mesh.name = name;
            mesh.material = material;
            hairGroup.add(mesh);
          };
          if (style === "ponytail") {
            // Tied at the back of the crown, falling down and back.
            const tilt = 0.26;
            const tie = new THREE.Mesh(new THREE.TorusGeometry(rx * 0.24, rx * 0.07, 10, 24), material);
            tie.position.set(cx, cy + ry * 0.24, cz - rz * 0.86);
            tie.rotation.x = Math.PI / 2 + tilt;
            add("ponytail tie", tie);
            const tail = new THREE.Mesh(
              new THREE.CylinderGeometry(rx * 0.29, rx * 0.14, ry * 1.34, 18, 1),
              material,
            );
            tail.position.set(cx, cy - ry * 0.42, cz - rz * 1.2);
            tail.rotation.x = tilt;
            add("ponytail tail", tail);
            const tip = new THREE.Mesh(new THREE.SphereGeometry(rx * 0.14, 16, 12), material);
            tip.position.set(cx, cy - ry * 1.06, cz - rz * 1.38);
            add("ponytail tip", tip);
          } else if (style === "bun") {
            const bun = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), material);
            bun.position.set(cx, cy + ry * 0.68, cz - rz * 0.72);
            bun.scale.set(rx * 0.44, ry * 0.34, rz * 0.44);
            add("hair bun", bun);
            const tie = new THREE.Mesh(new THREE.TorusGeometry(rx * 0.3, rx * 0.06, 10, 24), material);
            tie.position.set(cx, cy + ry * 0.44, cz - rz * 0.6);
            tie.rotation.x = Math.PI / 2 + 0.5;
            add("bun tie", tie);
          } else {
            // Long: a fall behind the head with a curtain down each side.
            const fall = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), material);
            fall.position.set(cx, cy - ry * 0.3, cz - rz * 0.5);
            fall.scale.set(rx * 1.02, ry * 0.92, rz * 0.8);
            add("hair fall", fall);
            for (const [name, side] of [["left", -1], ["right", 1]] as const) {
              const curtain = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), material);
              curtain.position.set(cx + side * rx * 0.86, cy - ry * 0.34, cz - rz * 0.06);
              curtain.scale.set(rx * 0.3, ry * 0.86, rz * 0.62);
              add(`${name} hair curtain`, curtain);
            }
          }
          if (style === "ponytail" || style === "bun") {
            // Tied back, but a little hair still frames the temples so the
            // style reads from the front as well as the back.
            for (const [name, side] of [["left", -1], ["right", 1]] as const) {
              const sweep = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), material);
              sweep.position.set(cx + side * rx * 0.84, cy - ry * 0.08, cz - rz * 0.12);
              sweep.scale.set(rx * 0.2, ry * 0.46, rz * 0.5);
              add(`${name} hair sweep`, sweep);
            }
          }
        };
        const faceDetailGroup: Group = new THREE.Group();
        faceDetailGroup.name = "face details";
        headAttachGroup.add(faceDetailGroup);
        const buildFaceDetails = (appearanceNow: SoundFitnessAvatarAppearance) => {
          disposeObject(faceDetailGroup);
          faceDetailGroup.clear();
          if (appearanceNow.body !== "female") return;
          // A lash line arched over each eye; the eyes are model parts.
          const lashMaterial = new THREE.MeshStandardMaterial({ color: "#1c1917", roughness: 0.7 });
          for (const side of ["left", "right"] as const) {
            const eye = partBox(`${side} eye white`);
            if (!eye) continue;
            const half = (eye.max.x - eye.min.x) / 2;
            const lash = new THREE.Mesh(
              new THREE.TorusGeometry(half * 1.08, half * 0.17, 6, 14, Math.PI),
              lashMaterial,
            );
            lash.position.set(
              (eye.min.x + eye.max.x) / 2,
              (eye.min.y + eye.max.y) / 2 + half * 0.1,
              eye.max.z + 0.012,
            );
            lash.scale.set(1, 0.6, 1);
            lash.name = `${side} lash`;
            faceDetailGroup.add(lash);
          }
        };
        const smileBaseMaterial = part("smile")?.material ?? null;
        const lipMaterial = new THREE.MeshStandardMaterial({ color: "#c2606c", roughness: 0.5 });
        const gloveMaterial = gearMaterial("#0f172a", "#000000", 0.05);
        const handBaseMaterials = new Map<string, Material | Material[]>();
        const buildGear = (appearanceNow: SoundFitnessAvatarAppearance) => {
          disposeObject(gearGroup);
          gearGroup.clear();
          disposeObject(headGearGroup);
          headGearGroup.clear();
          const shirt = soundFitnessAvatarShirtPalettes[appearanceNow.shirt];
          const head = partBox("head sculpt");
          const neck = partBox("neck");
          const hips = partBox("hips");
          const torso = partBox("torso shirt core");
          const leftShin = partBox("left shin");
          const rightShin = partBox("right shin");
          const accent = shirt.accent;
          const dark = "#0b1220";
          const gear = appearanceNow.gear;
          const wristbands = gear === "wristbands" || gear === "gloves";
          setVisible(WRIST_BANDS, wristbands);
          if (head && (gear === "headband" || gear === "visor" || gear === "cap")) {
            const cx = (head.min.x + head.max.x) / 2;
            const cz = (head.min.z + head.max.z) / 2;
            const radius = (head.max.x - head.min.x) / 2 + 0.02;
            const bandY = head.min.y + (head.max.y - head.min.y) * 0.7;
            if (gear !== "cap") {
              const band = new THREE.Mesh(
                new THREE.TorusGeometry(radius, 0.045, 12, 48),
                gearMaterial(accent, accent, 0.05),
              );
              band.position.set(cx, bandY, cz);
              band.rotation.x = Math.PI / 2 + 0.16;
              band.scale.set(1, 1.02, 1);
              addGear(`${gear} band`, band, true);
            }
            if (gear === "visor" || gear === "cap") {
              // A flattened half dome: the camera sits nearly level with
              // the head, where a flat plate vanishes edge-on.
              const brimMaterial = gearMaterial(accent, accent, 0.1);
              brimMaterial.side = THREE.DoubleSide;
              const brim = new THREE.Mesh(
                new THREE.SphereGeometry(radius * 1.3, 32, 12, 0, Math.PI),
                brimMaterial,
              );
              brim.position.set(cx, bandY - 0.03, cz + 0.02);
              brim.scale.set(1, 0.07, 1);
              brim.rotation.x = 0.3;
              addGear(`${gear} brim`, brim, true);
            }
            if (gear === "cap") {
              const crown = new THREE.Mesh(
                new THREE.SphereGeometry(radius + 0.01, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
                gearMaterial(dark, "#000000", 0.05),
              );
              crown.position.set(cx, bandY - 0.02, cz);
              crown.scale.set(1, 0.95, 1.02);
              addGear("cap crown", crown, true);
              const badge = new THREE.Mesh(
                new THREE.CircleGeometry(0.075, 24),
                gearMaterial(accent, accent, 0),
              );
              // Just proud of the crown's front surface at this height.
              const badgeY = bandY + 0.12;
              const crownDy = (badgeY - (bandY - 0.02)) / ((radius + 0.01) * 0.95);
              badge.position.set(
                cx,
                badgeY,
                cz + (radius + 0.01) * 1.02 * Math.sqrt(Math.max(0, 1 - crownDy * crownDy)) + 0.012,
              );
              badge.rotation.x = -0.34;
              addGear("cap badge", badge, true);
            }
          }
          if (head && gear === "shades") {
            const y = head.min.y + (head.max.y - head.min.y) * 0.55;
            const z = head.max.z + 0.02;
            const lens = () =>
              new THREE.Mesh(
                new THREE.BoxGeometry(0.19, 0.11, 0.03),
                gearMaterial("#06090f", "#0f172a", 0.6),
              );
            const left = lens();
            left.position.set(-0.15, y, z);
            addGear("left lens", left, true);
            const right = lens();
            right.position.set(0.15, y, z);
            addGear("right lens", right, true);
            const bridge = new THREE.Mesh(
              new THREE.BoxGeometry(0.42, 0.022, 0.02),
              gearMaterial(accent, accent, 0.3),
            );
            bridge.position.set(0, y + 0.045, z);
            addGear("shades bridge", bridge, true);
          }
          if (neck && gear === "chain") {
            const chain = new THREE.Mesh(
              new THREE.TorusGeometry(0.36, 0.02, 10, 48),
              gearMaterial("#facc15", "#7c5a06", 0.85),
            );
            // Lies around the collar with the front hanging onto the chest.
            chain.position.set(0, neck.min.y + 0.16, 0.06);
            chain.rotation.x = Math.PI / 2 + 0.35;
            chain.scale.set(1.2, 1.25, 1);
            addGear("chain", chain);
            const pendant = new THREE.Mesh(
              new THREE.CircleGeometry(0.07, 24),
              gearMaterial(accent, accent, 0.2),
            );
            pendant.position.set(0, neck.min.y - 0.1, (torso?.max.z ?? 0.34) + 0.03);
            addGear("chain pendant", pendant);
          }
          if (hips && gear === "belt") {
            const belt = new THREE.Mesh(
              new THREE.CylinderGeometry(0.53, 0.53, 0.11, 40, 1, true),
              gearMaterial(dark, "#000000", 0.2),
            );
            // The tee hangs over the waistband, so the belt reads at its hem.
            const beltY = (torso?.min.y ?? hips.min.y) + 0.05;
            belt.position.set(0, beltY, 0);
            belt.scale.set(1.1, 1, 0.68);
            addGear("belt", belt);
            const buckle = new THREE.Mesh(
              new THREE.BoxGeometry(0.13, 0.09, 0.03),
              gearMaterial(accent, accent, 0.5),
            );
            buckle.position.set(0, beltY, 0.53 * 0.68 + 0.02);
            addGear("belt buckle", buckle);
          }
          if (leftShin && rightShin && gear === "kneeSleeves") {
            for (const box of [leftShin, rightShin]) {
              const sleeve = new THREE.Mesh(
                new THREE.CylinderGeometry(0.17, 0.155, 0.3, 24, 1, true),
                gearMaterial(shirt.base, accent, 0.1),
              );
              sleeve.position.set(
                (box.min.x + box.max.x) / 2,
                box.max.y - 0.08,
                (box.min.z + box.max.z) / 2,
              );
              addGear("knee sleeve", sleeve);
            }
          }
          // Hands share the skin material with the face and arms, so the
          // glove is a material swap on the hands alone.
          for (const name of HANDS) {
            const hand = part(name);
            if (!hand) continue;
            const base = handBaseMaterials.get(name) ?? hand.material;
            handBaseMaterials.set(name, base);
            hand.material = gear === "gloves" ? gloveMaterial : base;
          }
        };
        const applyAppearance = () => {
          const a = latest.current.appearance;
          const shirt = soundFitnessAvatarShirtPalettes[a.shirt];
          const pants = soundFitnessAvatarPantsPalettes[a.pants];
          const shoes = soundFitnessAvatarShoesPalettes[a.shoes];
          const skin = soundFitnessAvatarSkinPalettes[a.skin];
          const hair = soundFitnessAvatarHairColorPalettes[a.hairColor];
          const eyes = soundFitnessAvatarEyesPalettes[a.eyes];
          setColor("sound navy performance shirt", shirt.base);
          setColor("shirt side panel", shirt.panel);
          setColor("cyan performance shirt seams", shirt.accent, shirt.accent);
          setColor("sound crest glow", shirt.accent, shirt.accent);
          setColor("soft white shirt crest ink", "#f8fafc", shirt.accent);
          setColor("charcoal training joggers", pants.base);
          setColor("cyan-lit training shoes", shoes.base);
          setColor("shoe cyan sole glow", shoes.sole, shoes.sole);
          setColor("warm athletic skin", skin.base);
          setColor("soft skin highlights", skin.highlight);
          setColor("subtle cheek warmth", skin.cheek);
          setColor("full close-cropped hair cap", hair.base);
          setColor("soft hair crown highlight", hair.sheen);
          setColor("amber brown iris", eyes.iris);
          // Hair style = which caps are visible.
          const crown = ["continuous crown hair cap"];
          const front = ["raised front hairline cap"];
          const tapers = ["soft left hairline taper", "soft right hairline taper"];
          const temples = ["left temple coverage", "right temple coverage"];
          const back = ["back hair coverage"];
          const sheen = ["subtle crown sheen"];
          const all = [...crown, ...front, ...tapers, ...temples, ...back, ...sheen];
          setVisible(all, false);
          switch (a.hair) {
            case "crop":
              setVisible([...crown, ...tapers, ...temples, ...back, ...sheen], true);
              break;
            case "swept":
              setVisible(all, true);
              break;
            case "ponytail":
            case "bun":
            case "long":
              // The scalp comes from the model; the length is built below.
              setVisible([...crown, ...tapers, ...temples, ...back, ...sheen], true);
              break;
            case "fade":
              setVisible([...crown, ...front, ...tapers, ...sheen], true);
              break;
            case "buzz":
              setVisible([...crown, ...back], true);
              break;
            case "bald":
              break;
          }
          // Face: the smile and cheek warmth carry the expression.
          const smile = part("smile");
          const cheeks = ["left cheek warmth", "right cheek warmth"];
          if (smile) {
            smile.visible = a.face === "relaxed" || a.face === "bright";
            if (smileBaseMaterial) {
              smile.material = a.body === "female" ? lipMaterial : smileBaseMaterial;
            }
            scalePart("smile", a.face === "bright" ? 1.3 : 1);
          }
          setVisible(cheeks, a.face === "bright" || a.face === "relaxed" || a.face === "defined");
          for (const name of ["left pupil", "right pupil"]) {
            scalePart(name, a.face === "focused" ? 1.25 : 1);
          }
          // Body profile. Female: narrower shoulders, neck and torso, slimmer
          // arms and shins, wider hips (an hourglass step below the shirt)
          // and a bust, with the crest floated onto it.
          const female = a.body === "female";
          // The tee and joggers carry the torso and hip silhouette (V taper
          // for male, narrow waist over wider hips for female) and the head
          // sculpt swaps to the tapered jaw; boxes refresh so highlights and
          // gear stay fitted.
          wearGarments(female);
          for (const pivot of [leftArmPivot, rightArmPivot]) {
            pivot.scale.set(female ? 0.85 : 1, 1, female ? 0.85 : 1);
          }
          for (const name of SHOULDERS) {
            scalePart(name, female ? 0.93 : 1, female ? 0.92 : 1, female ? 0.95 : 1);
          }
          for (const name of NECK) scalePart(name, female ? 0.86 : 1, 1, female ? 0.86 : 1);
          for (const name of SHINS) scalePart(name, female ? 0.9 : 1, 1, female ? 0.9 : 1);
          for (const name of THIGHS) scalePart(name, female ? 1.08 : 1, 1, 1);
          // A slightly wider stance carries the hip width, not just the disc.
          for (const [names, dx] of [[LEFT_LEG_PARTS, -0.03], [RIGHT_LEG_PARTS, 0.03]] as const) {
            for (const name of names) offsetPart(name, female ? dx : 0, 0, 0);
          }
          // A slightly smaller, narrower head reads feminine at this scale
          // without a second sculpt; the eyes stay a touch larger to match.
          headPivot.scale.set(female ? 0.94 : 1, female ? 0.985 : 1, female ? 0.965 : 1);
          for (const name of ["left eye white", "right eye white"]) {
            scalePart(name, female ? 1.1 : 1);
          }
          for (const name of ["left iris", "right iris"]) {
            scalePart(name, female ? 1.08 : 1);
          }
          for (const name of CREST_PARTS) offsetPart(name, 0, 0, female ? 0.07 : 0);
          buildHair(a);
          buildFaceDetails(a);
          buildGear(a);
          canvas.dataset.soundAvatarGear = `${a.gear}:${gearGroup.children.length + headGearGroup.children.length}`;
          canvas.dataset.soundAvatarWristbands = String(part("left wrist band")?.visible ?? "missing");
          canvas.dataset.soundAvatarHair = `${a.hair}:${hairGroup.children.length}`;
          // Body profile and face presets rescale parts; refit the shells.
          applyHighlight();
        };

        // ---- highlights ----
        // Parts whose glow shell should use a different geometry than the
        // part itself (the sculpted female tee glows with the smooth tee).
        const highlightGeometryFor = new Map<string, BufferGeometry>();
        // Shells are the parts' own geometry, parented beside each part so
        // they follow the joint pivots through emotes. The cut planes are
        // authored in root space at the rest pose and carried to world
        // space every frame by each part's own transform.
        let highlightShells: Mesh[] = [];
        let highlightPlanes: Array<{
          local: Plane;
          mesh: Mesh;
          restInverse: Matrix4;
          world: Plane;
        }> = [];
        const highlightCarry = new THREE.Matrix4();
        const specsFor = (
          bodyPart: SoundFitnessAvatarBodyPart,
          focus: SoundFitnessAvatarGlowRegion | null,
        ): HighlightSpec[] => {
          if (focus) {
            const regional = regionSpecs[focus];
            if (regional) return regional;
            if (focus in wholeBodyPartSpecs) {
              return wholeBodyPartSpecs[focus as SoundFitnessAvatarBodyPart];
            }
          }
          return wholeBodyPartSpecs[bodyPart];
        };
        const rangeOf = (
          box: InstanceType<ThreeModule["Box3"]>,
          axis: "x" | "y" | "z",
          frac: Frac,
        ): Frac => {
          const min = box.min[axis];
          const size = box.max[axis] - min;
          return [min + size * frac[0], min + size * frac[1]];
        };
        const clearHighlight = () => {
          for (const shell of highlightShells) {
            shell.removeFromParent();
            (shell.material as Material).dispose();
          }
          highlightShells = [];
          highlightPlanes = [];
        };
        const syncHighlightPlanes = () => {
          if (!highlightPlanes.length) return;
          root.updateMatrixWorld(true);
          for (const pair of highlightPlanes) {
            highlightCarry.copy(pair.mesh.matrixWorld).multiply(pair.restInverse);
            pair.world.copy(pair.local).applyMatrix4(highlightCarry);
          }
        };
        let highlightFadeStart: number | null = null;
        const applyHighlight = () => {
          const state = latest.current;
          const bodyPart = state.selectedBodyPart;
          if (!state.bodyPartGlowActive || !bodyPart) {
            // Let the render loop fade the shells rather than cutting them.
            if (highlightShells.length && highlightFadeStart === null) {
              highlightFadeStart = performance.now();
            }
            return;
          }
          highlightFadeStart = null;
          clearHighlight();
          const focus = state.glowMode === "pieces" ? (state.glowFocus ?? null) : null;
          const colorKey = (focus ?? bodyPart) as SoundFitnessAvatarGlowRegion;
          const color = parseColor(
            THREE,
            state.bodyPartGlowColors?.[colorKey],
            regionDefaultColors[colorKey] ?? bodyPartDefaultColors[bodyPart],
          );
          const specs = specsFor(bodyPart, focus);
          for (const spec of specs) {
            const xRanges: Frac[] = Array.isArray(spec.x?.[0])
              ? (spec.x as Frac[])
              : spec.x
                ? [spec.x as Frac]
                : [[0, 1]];
            const grow = spec.grow ?? 1;
            for (const partName of spec.parts) {
              const mesh = part(partName);
              const box = partBox(partName);
              const rest = partRestMatrices.get(partName);
              const parent = mesh?.parent;
              if (!mesh || !box || !rest || !parent || !mesh.visible) continue;
              const restInverse = new THREE.Matrix4().copy(rest).invert();
              const centreX = (box.min.x + box.max.x) / 2;
              for (const xFrac of xRanges) {
                const planes: Plane[] = [];
                // An open end (fraction 0 or 1) gets no plane: the shells
                // are scaled up a little and would otherwise be cut where
                // they poke past the part's own box.
                const addRange = (axis: "x" | "y" | "z", frac: Frac) => {
                  const [lo, hi] = rangeOf(box, axis, frac);
                  const normal = new THREE.Vector3();
                  normal[axis] = 1;
                  if (frac[0] > 0) planes.push(new THREE.Plane(normal.clone(), -lo));
                  if (frac[1] < 1) planes.push(new THREE.Plane(normal.clone().negate(), hi));
                };
                if (spec.x) addRange("x", xFrac);
                if (spec.lateral) {
                  // 0 = midline side of this part, 1 = its outer edge.
                  const [f0, f1] = spec.lateral;
                  addRange("x", centreX < 0 ? [1 - f1, 1 - f0] : [f0, f1]);
                }
                if (spec.y) addRange("y", spec.y);
                if (spec.z) addRange("z", spec.z);
                const worldPlanes = planes.map((local) => {
                  const world = local.clone();
                  highlightPlanes.push({ local, mesh, restInverse, world });
                  return world;
                });
                // Stand-off in model units, so thin limbs get the same
                // clearance as the torso instead of a sliver that loses the
                // depth test.
                const halfExtent = (axis: "x" | "y" | "z") =>
                  Math.max(0.02, (box.max[axis] - box.min[axis]) / 2);
                const shellFor = (margin: number, opacity: number) => {
                  const material = new THREE.MeshBasicMaterial({
                    blending: THREE.AdditiveBlending,
                    clippingPlanes: worldPlanes.length ? worldPlanes : null,
                    color,
                    depthTest: true,
                    depthWrite: false,
                    opacity,
                    transparent: true,
                  });
                  const shell = new THREE.Mesh(
                    highlightGeometryFor.get(partName) ?? mesh.geometry,
                    material,
                  );
                  shell.name = `${partName} glow`;
                  shell.position.copy(mesh.position);
                  shell.quaternion.copy(mesh.quaternion);
                  shell.scale.set(
                    mesh.scale.x * (1 + margin / halfExtent("x")) * grow,
                    mesh.scale.y * (1 + margin / halfExtent("y")) * grow,
                    mesh.scale.z * (1 + margin / halfExtent("z")) * grow,
                  );
                  shell.renderOrder = 10;
                  parent.add(shell);
                  shell.userData.baseOpacity = opacity;
                  highlightShells.push(shell);
                };
                shellFor(0.028, 0.42);
                shellFor(0.085, 0.12);
              }
            }
          }
          syncHighlightPlanes();
        };

        // ---- pointer hit testing ----
        const raycaster: Raycaster = new THREE.Raycaster();
        const pointer: Vector2 = new THREE.Vector2();
        const hitTargets = Array.from(parts.values());
        // Torso presses above this line are chest, below it core (the
        // chest highlight starts at the same fraction of the torso).
        const chestFloorY = () => {
          const torsoBox = partBox("torso shirt core");
          return torsoBox
            ? torsoBox.min.y + (torsoBox.max.y - torsoBox.min.y) * 0.45
            : 2.07;
        };
        let hoverPart: SoundFitnessAvatarBodyPart | null = null;
        let pendingPointer: { x: number; y: number } | null = null;
        let pointerFrame = 0;
        const hitAt = (clientX: number, clientY: number) => {
          const rect = canvas.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return null;
          pointer.set(
            ((clientX - rect.left) / rect.width) * 2 - 1,
            -((clientY - rect.top) / rect.height) * 2 + 1,
          );
          raycaster.setFromCamera(pointer, camera);
          const hits = raycaster.intersectObjects(hitTargets, false);
          const hit = hits.find((entry) => entry.object.visible);
          if (!hit) return null;
          const local = root.worldToLocal(hit.point.clone());
          return partForHit(normalizeName(hit.object.name), local, chestFloorY());
        };
        // Dev-only hooks for the headless verification scripts: the raw
        // raycast under a client point, a part's root-space box, and where
        // the gear pieces landed.
        if (process.env.NODE_ENV !== "production") {
          const dev = canvas as HTMLCanvasElement & {
            soundAvatarGear?: () => string[];
            soundAvatarShells?: () => string[];
            soundAvatarPartBox?: (name: string) => number[][] | null;
            soundAvatarProbe?: (clientX: number, clientY: number) => string[];
          };
          dev.soundAvatarProbe = (clientX, clientY) => {
            const rect = canvas.getBoundingClientRect();
            pointer.set(
              ((clientX - rect.left) / rect.width) * 2 - 1,
              -((clientY - rect.top) / rect.height) * 2 + 1,
            );
            raycaster.setFromCamera(pointer, camera);
            return raycaster.intersectObjects(hitTargets, false).map((entry) => {
              const local = root.worldToLocal(entry.point.clone());
              const resolved = partForHit(normalizeName(entry.object.name), local, chestFloorY());
              return `${entry.object.name}@${entry.distance.toFixed(2)} y=${local.y.toFixed(2)} z=${local.z.toFixed(2)} -> ${resolved}${entry.object.visible ? "" : " (hidden)"}`;
            });
          };
          dev.soundAvatarPartBox = (name) => {
            const box = partBox(normalizeName(name));
            return box ? [box.min.toArray(), box.max.toArray()] : null;
          };
          dev.soundAvatarShells = () =>
            highlightShells.map(
              (shell) =>
                `${shell.name}@${shell.position.toArray().map((v) => v.toFixed(2)).join(",")} s=${shell.scale.toArray().map((v) => v.toFixed(2)).join(",")} clip=${(shell.material as MeshBasicMaterial).clippingPlanes?.length ?? 0} parent=${shell.parent?.name ?? "none"}`,
            );
          dev.soundAvatarGear = () =>
            gearGroup.children.map(
              (child) => `${child.name}@${child.position.toArray().map((v) => v.toFixed(2)).join(",")}`,
            );
        }
        const setHover = (next: SoundFitnessAvatarBodyPart | null) => {
          if (next === hoverPart) return;
          hoverPart = next;
          canvas.style.cursor = next ? "pointer" : "";
          latest.current.onBodyPartHover?.(next);
        };
        const onPointerMove = (event: PointerEvent) => {
          if (!latest.current.interactive) return;
          pendingPointer = { x: event.clientX, y: event.clientY };
          if (pointerFrame) return;
          pointerFrame = window.requestAnimationFrame(() => {
            pointerFrame = 0;
            if (!pendingPointer) return;
            setHover(hitAt(pendingPointer.x, pendingPointer.y));
          });
        };
        // Selection is a press-and-release on the same spot, resolved on a
        // window-level pointerup: the card around the figure captures the
        // pointer on pointerdown (it is a drag surface), which retargets
        // pointerup and click away from the canvas and fires a pointerleave
        // here mid-press. A plain click listener never saw the release.
        let press: {
          part: SoundFitnessAvatarBodyPart | null;
          pointerId: number;
          t: number;
          x: number;
          y: number;
        } | null = null;
        const onPointerLeave = () => {
          pendingPointer = null;
          if (press) return;
          setHover(null);
        };
        const onPointerDown = (event: PointerEvent) => {
          if (!latest.current.interactive || event.button !== 0) return;
          press = {
            part: hitAt(event.clientX, event.clientY),
            pointerId: event.pointerId,
            t: performance.now(),
            x: event.clientX,
            y: event.clientY,
          };
        };
        // Window-level so the release still arrives when an ancestor captured
        // the pointer; only the pressed pointer counts.
        const onWindowPointerUp = (event: PointerEvent) => {
          if (!press || event.pointerId !== press.pointerId) return;
          const { part: hit, t, x, y } = press;
          press = null;
          const moved = Math.hypot(event.clientX - x, event.clientY - y);
          if (hit && moved < 8 && performance.now() - t < 700) {
            latest.current.onBodyPartSelect?.(hit);
          }
          if (!latest.current.interactive) return;
          // The card drops its copy of the hover while the hero orbit holds
          // the pointer capture, so the release point is always re-reported,
          // even when it is the same part.
          hoverPart = null;
          canvas.style.cursor = "";
          setHover(hitAt(event.clientX, event.clientY));
        };
        const onWindowPointerCancel = (event: PointerEvent) => {
          if (!press || event.pointerId !== press.pointerId) return;
          press = null;
          setHover(null);
        };
        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerleave", onPointerLeave);
        canvas.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("pointerup", onWindowPointerUp, true);
        window.addEventListener("pointercancel", onWindowPointerCancel, true);

        // ---- frame loop ----
        const resize = () => {
          const rect = canvas.getBoundingClientRect();
          const width = Math.max(1, Math.round(rect.width));
          const height = Math.max(1, Math.round(rect.height));
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          gl.setSize(width, height, false);
          gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.45));
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(canvas);
        resize();
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

        let animationFrame = 0;
        let lastTime = performance.now();
        let yaw = latest.current.view === "back" ? Math.PI - 0.08 : -0.08;
        const pose = { head: [0, 0, 0], leftArm: [0, 0], rightArm: [0, 0] };
        const render = (time: number) => {
          if (disposed) return;
          const state = latest.current;
          const dt = Math.min(0.05, Math.max(0, (time - lastTime) / 1000));
          lastTime = time;
          const live = state.active && !state.paused;
          setDashboardWebGlCanvasActive(canvas, live);
          const seconds = time / 1000;
          const still = reducedMotion.matches || !live;
          const ease = still ? 1 : 1 - Math.exp(-dt * 7);

          const targetYaw = state.view === "back" ? Math.PI - 0.08 : -0.08;
          yaw += (targetYaw - yaw) * (still ? 1 : 1 - Math.exp(-dt * 5));
          const sway = still ? 0 : Math.sin(seconds * 0.7) * 0.045;
          root.rotation.y = yaw + sway;

          const target = emotePoses[state.emotePreset] ?? restPose;
          let bob = still ? 0 : Math.sin(seconds * 1.45) * 0.014;
          let leftZ = target.leftArm[1];
          let rightZ = target.rightArm[1];
          let headX = target.head[0];
          if (!still) {
            switch (state.emotePreset) {
              case "wave":
                rightZ += Math.sin(seconds * 6) * 0.28;
                break;
              case "nod":
                headX = 0.16 * (0.5 + 0.5 * Math.sin(seconds * 5));
                break;
              case "celebrate":
                bob += Math.abs(Math.sin(seconds * 4)) * 0.06;
                leftZ += Math.sin(seconds * 4) * 0.12;
                rightZ -= Math.sin(seconds * 4) * 0.12;
                break;
              case "stretch":
                leftZ += Math.sin(seconds * 1.5) * 0.14;
                rightZ -= Math.sin(seconds * 1.5) * 0.14;
                bob += 0.02;
                break;
              default:
                break;
            }
          }
          pose.leftArm[0] += (target.leftArm[0] - pose.leftArm[0]) * ease;
          pose.leftArm[1] += (leftZ - pose.leftArm[1]) * ease;
          pose.rightArm[0] += (target.rightArm[0] - pose.rightArm[0]) * ease;
          pose.rightArm[1] += (rightZ - pose.rightArm[1]) * ease;
          pose.head[0] += (headX - pose.head[0]) * ease;
          pose.head[1] += (target.head[1] - pose.head[1]) * ease;
          pose.head[2] += (target.head[2] - pose.head[2]) * ease;
          leftArmPivot.rotation.set(pose.leftArm[0], 0, pose.leftArm[1]);
          rightArmPivot.rotation.set(pose.rightArm[0], 0, pose.rightArm[1]);
          headPivot.rotation.set(pose.head[0], pose.head[1], pose.head[2]);
          root.position.y = SOUND_AVATAR_BASE_Y + bob;

          if (highlightFadeStart !== null) {
            // rAF stamps can trail performance.now(); never brighten first.
            const progress = Math.max(0, (time - highlightFadeStart) / HIGHLIGHT_FADE_MS);
            if (progress >= 1) {
              highlightFadeStart = null;
              clearHighlight();
            } else {
              for (const shell of highlightShells) {
                (shell.material as MeshBasicMaterial).opacity =
                  (shell.userData.baseOpacity as number) * (1 - progress);
              }
            }
          }
          syncHighlightPlanes();
          gl.render(scene, camera);
          animationFrame = window.requestAnimationFrame(render);
        };

        updaters.current = { applyAppearance, applyHighlight };
        applyAppearance();
        applyHighlight();
        // Test hooks: what the scene currently carries.
        canvas.dataset.soundAvatarParts = String(parts.size);
        onReadyChange?.(true);
        animationFrame = window.requestAnimationFrame(render);

        cleanup = () => {
          updaters.current = null;
          window.cancelAnimationFrame(animationFrame);
          window.cancelAnimationFrame(pointerFrame);
          canvas.removeEventListener("pointermove", onPointerMove);
          canvas.removeEventListener("pointerleave", onPointerLeave);
          canvas.removeEventListener("pointerdown", onPointerDown);
          window.removeEventListener("pointerup", onWindowPointerUp, true);
          window.removeEventListener("pointercancel", onWindowPointerCancel, true);
          canvas.style.cursor = "";
          resizeObserver.disconnect();
          setDashboardWebGlCanvasActive(canvas, false);
          disposeObject(scene);
          gl.dispose();
          onReadyChange?.(false);
        };
      } catch {
        if (!disposed) {
          markDashboardWebGlFallback(canvas);
          onReadyChange?.(false);
        }
      }
    };

    void start();
    return () => {
      disposed = true;
      cleanup();
    };
    // The scene is built once; everything below updates it in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onReadyChange]);

  useEffect(() => {
    updaters.current?.applyAppearance();
  }, [appearanceKey]);

  useEffect(() => {
    updaters.current?.applyHighlight();
    // Test hook: the glow props as the figure last received them.
    if (canvasRef.current) canvasRef.current.dataset.soundAvatarGlow = highlightKey;
  }, [highlightKey]);

  return (
    <>
      <canvas
        aria-hidden="true"
        className={className}
        data-sound-avatar-renderer="three"
        ref={canvasRef}
      />
      {interactive ? (
        <div className="sr-only">
          {(Object.keys(bodyPartLabels) as SoundFitnessAvatarBodyPart[]).map((bodyPart) => (
            <button
              aria-pressed={selectedBodyPart === bodyPart}
              key={bodyPart}
              onBlur={() => onBodyPartHover?.(null)}
              onClick={() => onBodyPartSelect?.(bodyPart)}
              onFocus={() => onBodyPartHover?.(bodyPart)}
              type="button"
            >
              {bodyPartLabels[bodyPart]}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}

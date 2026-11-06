"use client";

import { createAvatarCapDetails, createAvatarCapBadgeGeometry, createAvatarCapBrimGeometry, createAvatarCapGeometry, fitAvatarHeadgear } from "./soundFitnessAvatarHeadgear";
import { createAvatarNecklace } from "./soundFitnessAvatarNecklace";
import { createSaluteRig } from "./soundFitnessSaluteRig";

import { useEffect, useRef, useState } from "react";
import loadingStyles from "./DashboardLoading.module.css";
import { exerciseAnatomyRegionVisuals } from "@/lib/anatomy/exerciseAnatomyColors";
import { createSoundFitnessMuscleOverlays, isAvatarMuscleSelected, type AvatarMuscleOverlay } from "./soundFitnessAvatarAnatomy";
import { soundFitnessAvatarIdleMotion } from "./soundFitnessAvatarMotion";
import { authoredHumanRegion, createSoundFitnessHuman } from "./soundFitnessAvatarHuman";
import { createAvatarShirtPrintTexture, createAvatarSurfaceMaterials } from "./soundFitnessAvatarMaterials";
import type {
  BufferGeometry,
  Group,
  Material,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  WebGLRenderer,
} from "three";
import {
  sanitizeSoundFitnessAvatarAppearance,
  soundFitnessAvatarEyesPalettes,
  soundFitnessAvatarHairColorPalettes,
  soundFitnessAvatarPantsPalettes,
  soundFitnessAvatarShirtPalettes,
  soundFitnessAvatarClothingColors,
  soundFitnessAvatarShoesPalettes,
  soundFitnessAvatarSkinPalettes,
  type SoundFitnessAvatarAppearance,
  type SoundFitnessAvatarBodyPart,
  type SoundFitnessAvatarEmotePreset,
  type SoundFitnessAvatarGlowRegion,
} from "./soundFitnessAvatarAppearance";
import {
  clearDashboardWebGlFallback,
  createDashboardWebGlRenderer,
  loadDashboardThree,
  markDashboardWebGlFallback,
  setDashboardWebGlCanvasActive,
  waitForDashboardWebGlStart,
} from "./dashboardWebGlRenderer";

/**
 * The Sound Fitness avatar: an adult-proportioned GLB drawn on its own canvas.
 * Named parts form shoulder/elbow and hip/knee joint chains. Everything that used to need
 * the flat SVG twin — appearance from the Avatar Lab, body-part hover and
 * click, muscle highlights, emotes — is done here on the real geometry:
 *
 * - Appearance recolours materials by name and toggles part meshes; gear is
 *   procedural and sized from the parts it sits on.
 * - Highlights use authored superficial muscle contours, projected onto
 *   the actual curved part geometry and carried by its joint chain.
 * - Hover/click raycast the part meshes; the torso splits into chest, core
 *   and back by hit point.
 * - Emotes rotate articulated arm, leg and head pivots.
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
  emoteReplay?: number;
  allowOverheadOverflow?: boolean;
  portrait?: boolean;
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

const SOUND_AVATAR_MODEL_URL = "/models/sound-avatar.glb?v=authored-human-v61-shaped-feet";
const SOUND_AVATAR_MODEL_SCALE = 0.79;
const SOUND_AVATAR_BASE_Y = -1.18;
// Highlight shells fade over this long when the glow turns off; bounded, so
// it is not a standing animation.
const HIGHLIGHT_FADE_MS = 350;

// Garment profiles as [radius, y] in root space, bottom to top. The tee and
// pelvis come in two cuts that carry the body profile.
type LatheProfile = Array<[number, number]>;
const TEE_PROFILES: Record<"male" | "female", LatheProfile> = {
  male: [[0,1.83],[.30,1.83],[.32,1.91],[.31,2.05],[.33,2.20],[.39,2.42],[.43,2.62],[.40,2.73],[.30,2.83],[.15,2.88],[0,2.88]],
  female: [[0,1.87],[.29,1.87],[.30,1.98],[.27,2.10],[.30,2.27],[.36,2.48],[.38,2.63],[.35,2.74],[.27,2.84],[.14,2.88],[0,2.88]],
};
const PELVIS_PROFILES: Record<"male" | "female", LatheProfile> = {
  male: [[0,1.57],[.14,1.63],[.26,1.70],[.33,1.81],[.32,1.93],[.30,2.04],[0,2.04]],
  female: [[0,1.57],[.15,1.63],[.28,1.70],[.36,1.81],[.33,1.93],[.29,2.04],[0,2.04]],
};
const SLEEVE_PROFILE: LatheProfile = [[0,-.33],[.076,-.33],[.085,-.28],[.10,-.16],[.108,-.04],[.095,.02],[.06,.055],[0,.08]];
const THIGH_PROFILE: LatheProfile = [[0,.91],[.079,.95],[.085,1.02],[.112,1.14],[.145,1.35],[.16,1.58],[.15,1.76],[.115,1.86],[0,1.90]];
const SHIN_PROFILE: LatheProfile = [[0,.12],[.047,.15],[.052,.23],[.065,.36],[.087,.55],[.099,.68],[.094,.79],[.080,.94],[.080,1.04],[0,1.09]];
export const UPPER_ARM_PROFILE: LatheProfile = [[0,-.28],[.045,-.26],[.058,-.21],[.08,-.10],[.088,.06],[.08,.17],[.055,.25],[0,.27]];
export const FOREARM_PROFILE: LatheProfile = [[0,-.25],[.038,-.23],[.044,-.17],[.055,-.05],[.069,.10],[.06,.20],[.045,.25],[0,.27]];
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

const regionColorGroups: Record<SoundFitnessAvatarGlowRegion, string> = {
  "arms": "Arms",
  "back": "Back",
  "chest": "Chest",
  "core": "Core",
  "legs": "Quads",
  "neck": "Neck/Traps",
  "shoulders": "Shoulders",
  "abductors": "Glutes/Hips",
  "adductors": "Glutes/Hips",
  "biceps": "Arms",
  "calves": "Calves/Tibialis",
  "forearms": "Arms",
  "frontDelt": "Shoulders",
  "glutes": "Glutes/Hips",
  "hamstrings": "Hamstrings",
  "hipRotators": "Glutes/Hips",
  "lats": "Back",
  "lateralDelt": "Shoulders",
  "lowerBack": "Back",
  "lowerChest": "Chest",
  "midChest": "Chest",
  "obliques": "Core",
  "quads": "Quads",
  "rearDelt": "Shoulders",
  "rhomboids": "Back",
  "rotatorExternal": "Shoulders",
  "rotatorInternal": "Shoulders",
  "tibialis": "Calves/Tibialis",
  "traps": "Neck/Traps",
  "triceps": "Arms",
  "upperChest": "Chest"
};

// ---------------------------------------------------------------- part names
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
  "eyebrow",
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
  if (name.startsWith("authored ")) return authoredHumanRegion(name,point);
  // The shirt yoke is torso, not the shoulder spheres.
  if (name.includes("shoulder") && !name.includes("yoke")) return "shoulders";
  if (includesAny(name, ["upper arm", "forearm", "hand", "wrist band", "sleeve cuff"])) return "arms";
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
  const candidate = value ?? fallback;
  if (candidate) {
    const rgb = candidate.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
    if (rgb) {
      color.setRGB(Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255, THREE.SRGBColorSpace);
      return color;
    }
    try {
      color.set(candidate);
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

const restPose: EmotePose = { head: [0, 0, 0], leftArm: [0.025, 0.12], rightArm: [0.025, -0.12] };

// Arm pivots sit at the shoulder joint; z rotates the arm out to the side
// (right arm positive, left negative raises), x swings it forward.
const emotePoses: Record<SoundFitnessAvatarEmotePreset, EmotePose> = {
  calm: restPose,
  bow: { head: [.18, 0, 0], leftArm: restPose.leftArm, rightArm: restPose.rightArm },
  celebrate: { head: [-0.07, 0, -.025], leftArm: [0.05, -1.08], rightArm: [0.05, 1.18] },
  focus: { head: [0.16, 0, 0], leftArm: [0.38, -0.12], rightArm: [0.38, 0.12] },
  nod: restPose,
  salute: { head: [0, 0, 0], leftArm: restPose.leftArm, rightArm: [0.08, 2.15] },
  stretch: { head: [-0.06, 0, 0], leftArm: [-0.12, -2.65], rightArm: [-0.12, 2.65] },
  wave: { head: [0, 0, 0.03], leftArm: restPose.leftArm, rightArm: [0.08, .65] },
};

export default function SoundFitnessAvatar3D({
  active = true,
  appearance,
  bodyPartGlowActive = false,
  bodyPartGlowColors,
  className,
  emotePreset = "calm",
  emoteReplay = 0,
  allowOverheadOverflow = false,
  portrait = false,
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
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [sceneAttempt, setSceneAttempt] = useState(0);
  const recoveryAttempts = useRef(0);
  const resolvedAppearance = sanitizeSoundFitnessAvatarAppearance(appearance);
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
    emoteReplay,
    portrait,
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
    emoteReplay,
    portrait,
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
    resize: () => void;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let disposed = false;
    let cleanup = () => {};
    let contextLost = false;
    let recoveryTimer: number | undefined;
    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      setLoadState("loading");
      onReadyChange?.(false);
      // A reclaimed context may never restore in an embedded browser. Rebuild
      // on a fresh canvas rather than keeping a permanently blank ready scene.
      if (recoveryTimer !== undefined) window.clearTimeout(recoveryTimer);
      recoveryTimer = window.setTimeout(() => {
        if (disposed) return;
        if (recoveryAttempts.current >= 3) {
          setLoadState("error");
          return;
        }
        recoveryAttempts.current += 1;
        setSceneAttempt(attempt => attempt + 1);
      }, 1200);
    };
    const onContextRestored = () => {
      contextLost = false;
      if (recoveryTimer !== undefined) window.clearTimeout(recoveryTimer);
      clearDashboardWebGlFallback(canvas);
      setDashboardWebGlCanvasActive(canvas, latest.current.active && !latest.current.paused);
      setLoadState("ready");
      onReadyChange?.(true);
    };
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    canvas.dataset.soundAvatarReady = "false";
    const loadTimeout = window.setTimeout(() => {
      if (!disposed && canvas.dataset.soundAvatarReady !== "true") {
        setLoadState("error");
        markDashboardWebGlFallback(canvas);
      }
    }, 20000);
    onReadyChange?.(false);

    const start = async () => {
      setLoadState("loading");
      try {
        await waitForDashboardWebGlStart({ canvas, priority: true });
        if (disposed) return;
        const [THREE, { GLTFLoader }, { RoomEnvironment }] = await Promise.all([
          loadDashboardThree(),
          import("three/examples/jsm/loaders/GLTFLoader.js"),
          import("three/examples/jsm/environments/RoomEnvironment.js"),
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
          setLoadState("error");
          return;
        }
        const gl = renderer;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.95;
        gl.setClearColor(0x000000, 0);
        gl.localClippingEnabled = true;

        const scene: Scene = new THREE.Scene();
        const camera: PerspectiveCamera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
        camera.position.set(0, 0.25, 5.8);
        camera.lookAt(0, 0.16, 0);

        scene.add(new THREE.HemisphereLight(0xe6efff, 0x39302a, 1.2));
        const keyLight = new THREE.DirectionalLight(0xfff0de, 1.9);
        keyLight.position.set(-2.8, 4.2, 4.8);
        scene.add(keyLight);
        const rimLight = new THREE.DirectionalLight(0xa8d8ef, .55);
        rimLight.position.set(3.2, 2.2, -3.4);
        scene.add(rimLight);
        const fillLight = new THREE.PointLight(0xdde8ff, .65, 6);
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
        const authoredSources: Mesh<BufferGeometry, MeshStandardMaterial>[] = [];
        // The loader leaves TRS node matrices at identity until the first
        // world update, so the boxes are built from the resolved transforms.
        root.updateMatrixWorld(true);
        const rootInverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
        root.traverse((child) => {
          const mesh = child as Mesh;
          if (!mesh.isMesh) return;
          const key = normalizeName(mesh.name);
          if (mesh.userData.authoredHuman) {
            authoredSources.push(mesh as Mesh<BufferGeometry, MeshStandardMaterial>);
            return;
          }
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
        const [skinTexture,shirtPrintTexture,cottonColor,cottonNormal,cottonRoughness]=await Promise.all([
          new THREE.TextureLoader().loadAsync("/models/textures/human-skin.webp"),
          Promise.all([...new Set(["sound" as const,latest.current.appearance.shirt])].map(async id => [id, await createAvatarShirtPrintTexture(THREE, id)] as const)).then(entries => Object.fromEntries(entries)),
          new THREE.TextureLoader().loadAsync("/models/textures/cotton-color.webp"),
          new THREE.TextureLoader().loadAsync("/models/textures/cotton-normal.webp"),
          new THREE.TextureLoader().loadAsync("/models/textures/cotton-roughness.webp"),
        ]);
        if(disposed){for(const texture of [skinTexture,...Object.values(shirtPrintTexture),cottonColor,cottonNormal,cottonRoughness])texture.dispose();disposeObject(scene);gl.dispose();return;}
        const pendingShirtPrints=new Map<string,Promise<void>>();
        const applyShirtPrint=(id:keyof typeof soundFitnessAvatarShirtPalettes)=>{
          if(shirtPrintTexture[id]){humanRig?.setShirtPrint(shirtPrintTexture[id]);return;}
          if(pendingShirtPrints.has(id))return;
          const pending=createAvatarShirtPrintTexture(THREE,id).then(texture=>{
            if(disposed){texture.dispose();return;}
            shirtPrintTexture[id]=texture;
            // A late download must not replace a more recently selected style.
            if(latest.current.appearance.shirt===id)humanRig?.setShirtPrint(texture);
          }).catch(()=>{
            if(latest.current.appearance.shirt===id)printedShirt=null;
          }).finally(()=>pendingShirtPrints.delete(id));
          pendingShirtPrints.set(id,pending);
        };
        const disposeSurfaceMaps=createAvatarSurfaceMaterials(THREE,materialsByName,skinTexture,{color:cottonColor,normal:cottonNormal,roughness:cottonRoughness});
        const studio=new RoomEnvironment();
        const pmrem=new THREE.PMREMGenerator(gl);
        const studioEnvironment=pmrem.fromScene(studio,.04,.1,100,{size:128});
        scene.environment=studioEnvironment.texture;scene.environmentIntensity=.45;
        studio.dispose();pmrem.dispose();
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
            name === "neck" || includesAny(name, HEAD_PART_FRAGMENTS),
          ),
        );

        // The elbow carries the forearm, wrist and hand as one articulated chain.
        const elbows = [leftArmPivot, rightArmPivot].map((armPivot, index) => {
          const side = index === 0 ? "left" : "right";
          const forearm = partBox(side + " forearm");
          const location = new THREE.Vector3(0, .24, 0);
          const rest = partRestMatrices.get(side + " forearm");
          if (rest) location.applyMatrix4(rest);
          else location.set(index === 0 ? -.55 : .55, (forearm?.max.y ?? 2.28) - .04, 0);
          const elbow = makePivot(side + " elbow pivot", location.x, location.y, location.z, [side+" forearm",side+" wrist band",side+" hand"]);
          armPivot.attach(elbow);
          return elbow;
        });

        // Independent wrist articulation makes greetings hand-led rather
        // than swinging the shoulder or treating the whole arm as a paddle.
        const wrists = elbows.map((elbow, index) => {
          const side = index === 0 ? "left" : "right";
          const wrist = makePivot(side + " wrist pivot", index === 0 ? -.60 : .60, 1.79, .015, [side + " hand"]);
          elbow.attach(wrist);
          return wrist;
        });

        const saluteRig = createSaluteRig(THREE, root, rightArmPivot, elbows[1], wrists[1]);

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
          geometry.userData.soundAvatarDepthRatio = zRatio;
          geometry.computeVertexNormals();
          geometry.computeBoundingBox();
          return geometry;
        };
        // A soft bust raised out of the tee's front, no separate shapes.
        const sculptBust = (geometry: BufferGeometry) => {
          geometry.userData.soundAvatarBust = true;
          const position = geometry.getAttribute("position");
          for (let i = 0; i < position.count; i += 1) {
            const z = position.getZ(i);
            if (z <= 0) continue;
            const across = Math.exp(-((Math.abs(position.getX(i)) - 0.17) ** 2) / (2 * 0.085 ** 2));
            const along = Math.exp(-((position.getY(i) - 2.53) ** 2) / (2 * 0.12 ** 2));
            position.setZ(i, z + 0.045 * across * along);
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
        const teeGeometries = {
          female: sculptBust(latheGeometry(TEE_PROFILES.female, 0.6)),
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
          const x = side === "left" ? -0.19 : 0.19;
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
          "upper chest shoulder yoke",
        ]) {
          const mesh = part(name);
          if (mesh) mesh.visible = false;
        }
        const wearGarments = (female: boolean) => {
          tee.geometry = female ? teeGeometries.female : teeGeometries.male;
          // Surface overlays are rebuilt when the body profile changes.
          refreshPartBox("torso shirt core");
          pelvis.geometry = female ? pelvisGeometries.female : pelvisGeometries.male;
          refreshPartBox("hips");
          if (headSculpt && headGeometries) {
            headSculpt.geometry = female ? headGeometries.female : headGeometries.male;
            if (headSculpt.morphTargetInfluences) headSculpt.morphTargetInfluences[0] = female ? 1 : 0;
          const scalp=part("continuous crown hair cap");
            if(scalp?.morphTargetInfluences)scalp.morphTargetInfluences[0]=female?1:0;
          }
        };

        const legPivots = ["left", "right"].map((side,index) => {
          const x=index===0 ? -.19 : .19;
          const hip=makePivot(side+" hip pivot",x,1.78,0,[side+" thigh",side+" shin",side+" shoe",side+" shoe sole glow"]);
          const knee=makePivot(side+" knee pivot",x,.99,0,[side+" shin",side+" shoe",side+" shoe sole glow"]);
          hip.attach(knee);
          return {hip,knee};
        });

        // Rest positions inside their pivots, for parts the profile shifts.
        const basePositions = new Map<string, InstanceType<ThreeModule["Vector3"]>>();
        parts.forEach((mesh, key) => basePositions.set(key, mesh.position.clone()));
        const offsetPart = (name: string, x: number, y: number, z: number) => {
          const mesh = part(name);
          const base = basePositions.get(name);
          if (mesh && base) mesh.position.set(base.x + x, base.y + y, base.z + z);
        };

        // Soft contact shadow: a feathered alpha mask, never a solid fabric-like disc.
        const shadowPixels = new Uint8Array(64 * 64 * 4);
        for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
          const radius = Math.hypot((x - 31.5) / 31.5, (y - 31.5) / 31.5);
          const alpha = Math.pow(Math.max(0, 1 - radius * radius), 3);
          const index = (y * 64 + x) * 4;
          shadowPixels[index + 3] = Math.round(alpha * 100);
        }
        const shadowTexture = new THREE.DataTexture(shadowPixels, 64, 64);
        shadowTexture.needsUpdate = true;
        const shadow = new THREE.Mesh(
          new THREE.PlaneGeometry(1.7, .75),
          new THREE.MeshBasicMaterial({ map: shadowTexture, color: 0x000000, transparent: true, depthWrite: false }),
        );
        shadow.name = "soft floor shadow";
        root.updateMatrixWorld(true);
        const shoe = part("left shoe");
        const footPlaneY = shoe ? new THREE.Box3().setFromObject(shoe).min.y : SOUND_AVATAR_BASE_Y;
        shadow.position.set(0, footPlaneY - .004, 0);
        shadow.rotation.x = -Math.PI / 2;
        scene.add(shadow);
        if (!allowOverheadOverflow) {
          const platform = new THREE.Mesh(
            new THREE.RingGeometry(.73, .745, 64),
            new THREE.MeshBasicMaterial({ color: 0x9ee9ff, transparent: true, opacity: .42, side: THREE.DoubleSide, depthWrite: false }),
          );
          platform.name = "avatar contact platform";
          platform.rotation.x = -Math.PI / 2;
          platform.position.y = footPlaneY - .006;
          scene.add(platform);
        }

        // ---- appearance ----
        const gearGroup: Group = new THREE.Group();
        const jointGear: Mesh[] = [];
        let necklace: Group | undefined;
        torsoPivot.updateMatrix();
        const necklaceTorsoRestInverse=torsoPivot.matrix.clone().invert();
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
        const hairMaterial = (hex: string, sheen: string) => {
          const material = materialsByName.get("full close-cropped hair cap")!.clone();
          material.color.set(hex);material.emissive.set(sheen);material.emissiveIntensity=0;
          return material;
        };
        const buildHair = (appearanceNow: SoundFitnessAvatarAppearance) => {
          disposeObject(hairGroup);
          hairGroup.clear();
          const style = appearanceNow.hair;
          if (style !== "ponytail" && style !== "bun" && style !== "long") return;
          const head = partBox(appearanceNow.body === "female" ? "female full hair cap" : "head sculpt");
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
            // Start inside the actual scalp shell and curve continuously down the back.
            const anchor = new THREE.Vector3(cx, head.max.y - .095, head.min.z + .025);
            const path = new THREE.CatmullRomCurve3([
              anchor,
              anchor.clone().add(new THREE.Vector3(0,-.035,-.09)),
              anchor.clone().add(new THREE.Vector3(.035,-.22,-.15)),
              anchor.clone().add(new THREE.Vector3(.015,-.48,-.08)),
            ]);
            // A bundle of overlapping locks supplies the volume; there is no
            // solid central tube hiding their contours or joining their tips.
            for(let lock=0;lock<38;lock++) {
              const angle=lock*2.399963;
              const radius=Math.sqrt((lock+.5)/38);
              const spreadX=Math.cos(angle)*radius;
              const spreadZ=Math.sin(angle)*radius;
              const length=.43+.065*Math.sin(lock*1.73)+.025*Math.cos(lock*.8);
              const strandPath=new THREE.CatmullRomCurve3([
                anchor.clone().add(new THREE.Vector3(spreadX*.012,0,spreadZ*.010)),
                anchor.clone().add(new THREE.Vector3(spreadX*.050,-.065,-.095+spreadZ*.035)),
                anchor.clone().add(new THREE.Vector3(.025+spreadX*.078,-.22,-.16+spreadZ*.055)),
                anchor.clone().add(new THREE.Vector3(.018+spreadX*.055,-length*.78,-.14+spreadZ*.046)),
                anchor.clone().add(new THREE.Vector3(.004+spreadX*.045,-length,-.07+spreadZ*.034)),
              ]);
              const radialSegments=8,segments=40;
              const strandGeometry=new THREE.TubeGeometry(strandPath,segments,.014+(1-radius)*.007,radialSegments,false);
              const positions=strandGeometry.attributes.position;
              for(let ring=0;ring<=segments;ring++) {
                const t=ring/segments,center=strandPath.getPointAt(t);
                const taper=(.025+.975*Math.pow(1-t,.65))*(.65+.35*Math.sin(Math.min(1,t*4)*Math.PI/2));
                for(let j=0;j<=radialSegments;j++) {
                  const index=ring*(radialSegments+1)+j;
                  const point=new THREE.Vector3().fromBufferAttribute(positions,index).sub(center).multiplyScalar(taper);
                  point.z*=.65;point.add(center);
                  positions.setXYZ(index,point.x,point.y,point.z);
                  strandGeometry.attributes.uv.setXY(index,j/radialSegments+lock*.137,t);
                }
              }
              strandGeometry.computeVertexNormals();
              const strandMesh=new THREE.Mesh(strandGeometry,material);
              add(`ponytail flowing lock ${lock}`,strandMesh);
              const strandMaterial=material.clone();
              strandMaterial.color.multiplyScalar(.88+.22*(.5+.5*Math.sin(lock*2.7)));
              strandMaterial.roughness=.72;
              strandMesh.material=strandMaterial;
            }
            const tie=new THREE.Mesh(new THREE.TorusGeometry(.036,.006,12,32),material);
            tie.position.copy(path.getPoint(.12));tie.rotation.x=Math.PI/2;
            add("ponytail tie",tie);
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

        };
        const faceDetailGroup: Group = new THREE.Group();
        faceDetailGroup.name = "face details";
        headAttachGroup.add(faceDetailGroup);
        // Skin-coloured upper lids cover the actual eye geometry during a blink.
        // They share the skin material and head pivot, including all appearance changes.
        const eyelids = ["left", "right"].flatMap((side) => {
          const eye = partBox(`${side} eye white`);
          if (!eye || !headSculpt) return [];
          const lid = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshStandardMaterial({color:(headSculpt.material as MeshStandardMaterial).color,roughness:.72}));
          const height = (eye.max.y - eye.min.y) * 0.58;
          const centerY = (eye.min.y + eye.max.y) / 2;
          lid.name = `${side} blinking eyelid`;
          lid.position.set((eye.min.x + eye.max.x) / 2, centerY, eye.max.z + 0.007);
          lid.scale.set((eye.max.x - eye.min.x) * 0.57, height, 0.009);
          lid.visible = false;
          headAttachGroup.add(lid);
          const lowerLid=lid.clone();lowerLid.material=lid.material.clone();lowerLid.name=`${side} lower eyelid`;
          headAttachGroup.add(lowerLid);
          return [
            { lid, height, centerY, side, centerX: lid.position.x, centerZ: lid.position.z, lower:false },
            { lid:lowerLid, height, centerY, side, centerX: lid.position.x, centerZ: lid.position.z, lower:true },
          ];
        });
        const eyeOffsets: Record<string, [number, number, number]> = { left: [0,0,0], right: [0,0,0] };
        const buildFaceDetails = (appearanceNow: SoundFitnessAvatarAppearance) => {
          disposeObject(faceDetailGroup);
          faceDetailGroup.clear();
          if (appearanceNow.body !== "female") return;
          // Keep the actual eyelid/sclera contour; the old floating torus
          // lashes sat in front of the sockets and made the eyes look detached.

        };
        const smileBaseMaterial = part("smile")?.material ?? null;
        const lipMaterial = new THREE.MeshStandardMaterial({ color: "#c2606c", roughness: 0.5 });
        const gloveMaterial = gearMaterial("#0f172a", "#000000", 0.05);
        const handBaseMaterials = new Map<string, Material | Material[]>();
        const buildGear = (appearanceNow: SoundFitnessAvatarAppearance) => {
          for (const mesh of jointGear) { disposeObject(mesh); mesh.removeFromParent(); }
          jointGear.length = 0;
          disposeObject(gearGroup);
          gearGroup.clear();
          necklace=undefined;
          disposeObject(headGearGroup);
          headGearGroup.clear();
          const shirt = soundFitnessAvatarClothingColors[appearanceNow.gearColor];
          const head = partBox("head sculpt");
          const neck = partBox("neck");
          const hips = partBox("hips");
          const torso = partBox("torso shirt core");
          const leftShin = partBox("left shin");
          const rightShin = partBox("right shin");
          const accent = shirt.accent;
          const dark = shirt.base;
          const gear = appearanceNow.gear;
          const capFabricMaterial = (color: string) => {
            const material=gearMaterial(color, "#000000", 0);
            material.roughness=.96;
            material.normalMap=cottonNormal;
            material.normalScale.set(.22,.22);
            material.roughnessMap=cottonRoughness;
            return material;
          };
          const wristbands = gear === "wristbands" || gear === "gloves";
          setVisible(WRIST_BANDS, wristbands);
          if (head && (gear === "headband" || gear === "visor" || gear === "cap")) {
            const fit = fitAvatarHeadgear(THREE, headSculpt!.geometry, partRestMatrices.get("head sculpt")!, appearanceNow.body === "female", gear === "cap");
            const {cx, cz, radius, depth, bandY, crownHeight} = fit;
            const capGeometry = gear === "cap" ? createAvatarCapGeometry(THREE, headSculpt!.geometry, partRestMatrices.get("head sculpt")!, appearanceNow.body === "female", bandY) : undefined;

            if (gear !== "cap") {
              const band = new THREE.Mesh(
                new THREE.TorusGeometry(radius, .006, 12, 64),
                gearMaterial(shirt.base, "#000000", 0),
              );
              band.position.set(cx, bandY, cz);
              band.rotation.x = Math.PI / 2;
              band.scale.set(1, depth / radius, 1);
              addGear(`${gear} band`, band, true);
            }
            if (gear === "visor" || gear === "cap") {
              // A flattened half dome: the camera sits nearly level with
              // the head, where a flat plate vanishes edge-on.
              const brimMaterial = capFabricMaterial(shirt.base);
              brimMaterial.side = THREE.DoubleSide;
              const brim = new THREE.Mesh(
                createAvatarCapBrimGeometry(THREE, fit, capGeometry),
                brimMaterial,
              );
              // Curved bill geometry is already fitted in root coordinates.
              addGear(`${gear} brim`, brim, true);
            }
            if (gear === "cap") {
              const crown = new THREE.Mesh(
                capGeometry!,
                capFabricMaterial(dark),
              );
              // Crown vertices already follow the morphed scalp in root space.
              addGear("cap crown", crown, true);
              const bill=headGearGroup.getObjectByName("cap brim") as Mesh<BufferGeometry>;
              if(bill) headGearGroup.add(createAvatarCapDetails(THREE,crown.geometry,bill.geometry,fit));
              const badgeMaterial=gearMaterial("#ffffff", "#000000", 0);
              badgeMaterial.map=shirtPrintTexture.sound;
              badgeMaterial.transparent=true;
              badgeMaterial.alphaTest=.04;
              badgeMaterial.depthWrite=false;
              badgeMaterial.roughness=.95;
              const badge = new THREE.Mesh(
                createAvatarCapBadgeGeometry(THREE, crown.geometry, fit),
                badgeMaterial,
              );
              addGear("cap badge", badge, true);
            }
          }
          if (head && gear === "shades") {
            const y = head.min.y + (head.max.y - head.min.y) * 0.55;
            const z = head.max.z + 0.006;
            const faceWidth = (head.max.x - head.min.x) * .78;
            const lens = () =>
              new THREE.Mesh(
                new THREE.BoxGeometry(faceWidth * .32, faceWidth * .17, .008),
                gearMaterial("#06090f", "#0f172a", 0.6),
              );
            const left = lens();
            left.position.set(-faceWidth * .19, y, z);
            addGear("left lens", left, true);
            const right = lens();
            right.position.set(faceWidth * .19, y, z);
            addGear("right lens", right, true);
            const bridge = new THREE.Mesh(
              new THREE.BoxGeometry(faceWidth * .74, .008, .008),
              gearMaterial(accent, accent, 0.3),
            );
            bridge.position.set(0, y + faceWidth * .07, z);
            addGear("shades bridge", bridge, true);
          }
          if (neck && gear === "chain" && humanRig) {
            necklace = createAvatarNecklace(THREE,humanRig.meshes,appearanceNow.body === "female",neck,shirtPrintTexture.sound,shirt.base);
            gearGroup.add(necklace);
          }
          if (hips && gear === "belt") {
            const belt = new THREE.Mesh(
              new THREE.CylinderGeometry((hips.max.x-hips.min.x)/2+.012, (hips.max.x-hips.min.x)/2+.012, 0.07, 40, 1, true),
              gearMaterial(dark, "#000000", 0.2),
            );
            // The tee hangs over the waistband, so the belt reads at its hem.
            const beltY = (torso?.min.y ?? hips.min.y) + 0.05;
            belt.position.set(0, beltY, 0);
            belt.scale.set(1, 1, 0.68);
            addGear("belt", belt);
            const buckle = new THREE.Mesh(
              new THREE.BoxGeometry(0.13, 0.09, 0.03),
              gearMaterial(accent, accent, 0.5),
            );
            buckle.position.set(0, beltY, 0.53 * 0.68 + 0.02);
            addGear("belt buckle", buckle);
          }
          if (leftShin && rightShin && gear === "kneeSleeves") {
            for (const [index] of [leftShin, rightShin].entries()) {
              const sleeve = new THREE.Mesh(
                new THREE.CylinderGeometry(0.11, 0.105, 0.22, 24, 1, true),
                gearMaterial(shirt.base, accent, 0.1),
              );
              sleeve.name = "knee sleeve";
              sleeve.position.set(appearanceNow.body === "female" ? (index === 0 ? -.03 : .03) : 0, -.06, 0);
              legPivots[index].knee.add(sleeve);
              jointGear.push(sleeve);
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
          const shirt = soundFitnessAvatarClothingColors[a.shirtColor];
          gloveMaterial.color.set(soundFitnessAvatarClothingColors[a.gearColor].base);
          const pants = soundFitnessAvatarPantsPalettes[a.pants];
          const shoes = soundFitnessAvatarShoesPalettes[a.shoes];
          const skin = soundFitnessAvatarSkinPalettes[a.skin];
          const hair = soundFitnessAvatarHairColorPalettes[a.hairColor];
          const eyes = soundFitnessAvatarEyesPalettes[a.eyes];
          setColor("sound navy performance shirt", shirt.base);
          setColor("shirt side panel", shirt.panel);
          setColor("cyan performance shirt seams", shirt.accent, shirt.accent);
          setColor("sound crest glow", soundFitnessAvatarClothingColors[a.gearColor].base);
          setColor("soft white shirt crest ink", "#f8fafc", shirt.accent);
          setColor("charcoal training joggers", pants.base);
          setColor("cyan-lit training shoes", shoes.base);
          setColor("shoe cyan sole glow", shoes.sole, shoes.sole);
          setColor("warm athletic skin", skin.base);
          setColor("soft skin highlights", skin.highlight);
          setColor("subtle cheek warmth", skin.cheek);
          setColor("full close-cropped hair cap", hair.base);
          setColor("female swept hair", hair.base);
          setColor("soft hair crown highlight", hair.sheen);
          setColor("amber brown iris", eyes.iris);
          const irisMaterial = materialsByName.get("amber brown iris");
          if (irisMaterial) irisMaterial.color.multiplyScalar(.48);
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
          const fullFemaleHair = a.body === "female" && ["ponytail", "bun", "long", "swept"].includes(a.hair);
          setVisible(["female full hair cap", "female hairline fibers", "female swept hair sections"], fullFemaleHair);
          if (fullFemaleHair) setVisible(all, false);
          const scalp=part("continuous crown hair cap");
          if(scalp?.morphTargetInfluences)scalp.morphTargetInfluences[1]=a.hair==="swept"?1:a.hair==="crop"?.25:0;
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
            scalePart(name, 1);
          }
          // Body profile. Female: narrower shoulders, neck and torso, slimmer
          // arms and shins, wider hips (an hourglass step below the shirt)
          // and a bust, with the crest floated onto it.
          const female = a.body === "female";
          const skinDetail=materialsByName.get("warm athletic skin")?.userData.detailStrength;
          if(skinDetail) skinDetail.value=female ? .12 : .74;
          // The tee and joggers carry the torso and hip silhouette (V taper
          // for male, narrow waist over wider hips for female) and the head
          // sculpt swaps to the tapered jaw; boxes refresh so highlights and
          // gear stay fitted.
          wearGarments(female);
          for (const name of ["left eyebrow", "right eyebrow"]) scalePart(name, female ? .90 : 1, female ? 1.05 : 1, 1);
          for (const [index,name] of WRIST_BANDS.entries()) {
            scalePart(name, female ? .72 : .9, female ? .8 : .9, female ? .72 : .9);
            offsetPart(name, (index === 0 ? -1 : 1) * (female ? -.035 : 0), .025, .015);
          }
          for (const pivot of [leftArmPivot, rightArmPivot]) {
            pivot.scale.set(female ? 0.90 : 1, 1, female ? 0.90 : 1);
          }
          for (const name of SHOULDERS) {
            scalePart(name, female ? 0.93 : 1, female ? 0.92 : 1, female ? 0.95 : 1);
          }
          // The authored neck shares its upper seam with the head; independent scaling opens that seam.
          for (const name of NECK) scalePart(name, 1);
          for (const name of SHINS) scalePart(name, female ? 0.9 : 1, 1, female ? 0.9 : 1);
          for (const name of THIGHS) scalePart(name, female ? 1.08 : 1, 1, 1);
          // A slightly wider stance carries the hip width, not just the disc.
          for (const [names, dx] of [[LEFT_LEG_PARTS, -0.03], [RIGHT_LEG_PARTS, 0.03]] as const) {
            for (const name of names) offsetPart(name, female ? dx : 0, 0, 0);
          }
          // Keep adult head proportions balanced; avoid a squeezed face and oversized eyes.
          headPivot.scale.set(1, 1, 1);
          const maleEyes = headSculpt?.userData.eyePositions as number[][] | undefined;
          const femaleEyes = headSculpt?.userData.femaleEyePositions as number[][] | undefined;
          for (const [index, side] of ["left", "right"].entries()) {
            const shift = [0,1,2].map(axis => female && femaleEyes && maleEyes ? femaleEyes[index][axis] - maleEyes[index][axis] : 0) as [number,number,number];
            eyeOffsets[side] = shift;
            for (const feature of ["eye white", "iris", "pupil", "eyebrow"]) {
              offsetPart(`${side} ${feature}`, ...shift);
              refreshPartBox(`${side} ${feature}`);
            }
          }
          for (const name of ["left eye white", "right eye white"]) {
            scalePart(name, female ? .96 : 1, female ? 1.02 : 1, 1);
          }
          for (const name of ["left iris", "right iris"]) {
            scalePart(name, female ? .86 : 1, female ? .78 : 1, female ? .8 : 1);
          }
          for (const name of ["left pupil", "right pupil"]) scalePart(name, female ? .86 : 1, female ? .86 : 1, 1);
          for (const name of CREST_PARTS) offsetPart(name, 0, 0, female ? 0.07 : 0);
          rebuildGarments(a.body);
          if (printedShirt !== a.shirt) { applyShirtPrint(a.shirt); printedShirt = a.shirt; }
          rebuildAnatomy(a.body);
          buildHair(a);
          buildFaceDetails(a);
          buildGear(a);
          humanRig?.setGloves(a.gear === "gloves", gloveMaterial.color);
          for(const {lid} of eyelids)(lid.material as MeshStandardMaterial).color.copy(materialsByName.get("warm athletic skin")!.color);
          setVisible(CREST_PARTS,false);
          // Authored hands/neck are part of the continuous human surface.
          setVisible(["left hand", "right hand", "neck"], false);
          canvas.dataset.soundAvatarGear = `${a.gear}:${gearGroup.children.length + headGearGroup.children.length + jointGear.length}`;
          canvas.dataset.soundAvatarWristbands = String(part("left wrist band")?.visible ?? "missing");
          canvas.dataset.soundAvatarHair = `${a.hair}:${hairGroup.children.length}`;
          // Body profile and face presets rescale parts; refit the shells.
          applyHighlight();
        };

        let humanRig: ReturnType<typeof createSoundFitnessHuman> | null = null;
        let garments: Array<{ update: () => void; dispose: () => void; bindOverlay: (mesh: Mesh<BufferGeometry, MeshStandardMaterial>) => AvatarMuscleOverlay["mesh"] }> = [];
        let garmentBody: string | null = null;
        let printedShirt: string | null = null;
        const rebuildGarments = (body: string) => {
          if (garmentBody === body) return;
          const female = body === "female";
          humanRig ??= createSoundFitnessHuman(THREE, root, authoredSources, parts, partRestMatrices);
          humanRig.setBody(female);
          humanRig.setShirtPrint(shirtPrintTexture[latest.current.appearance.shirt]??shirtPrintTexture.sound);
          const rig = humanRig;
          const surface = (name: string) => rig.meshes.findIndex(mesh => normalizeName(mesh.name) === name);
          const shirt = surface("authored performance shirt"), pants = surface("authored training pants"), skin = surface("authored human skin");
          garments = [shirt,pants,skin,skin].map((surfaceIndex,index) => ({
            update: index === 0 ? rig.update : () => {},
            dispose: index === 0 ? rig.dispose : () => {},
            bindOverlay: mesh => rig.bindOverlay(mesh,surfaceIndex),
          }));
          for (const name of ["torso shirt core", "hips", ...SHOULDERS, ...THIGHS, ...SHINS, "left upper arm", "right upper arm", "left forearm", "right forearm"]) {
            const mesh = part(name)!;
            // Keep the source's children and raycast surface available; only
            // its own render material is hidden beneath the sewn garment.
            if (!mesh.userData.garmentProxy) {
              const material = (mesh.material as MeshStandardMaterial).clone();
              material.visible = false;
              mesh.material = material;
              mesh.userData.garmentProxy = true;
            }
          }
          garmentBody = body;
          canvas.dataset.soundAvatarGarments = "authored-shirt:authored-pants";
          canvas.dataset.soundAvatarBody = "makehuman-cc0";
        };

        // Muscle surfaces follow each parent part through every joint pose.
        // Appearance changes rebuild them only when the underlying body changes.
        let anatomy: AvatarMuscleOverlay[] = [];
        let anatomyBody: string | null = null;
        let highlightShells: Mesh[] = [];
        let highlightFadeStart: number | null = null;
        const rebuildAnatomy = (body: string) => {
          if (anatomyBody !== body) {
            for (const {mesh} of anatomy) { mesh.removeFromParent(); mesh.geometry.dispose(); mesh.material.dispose(); }
            anatomy = createSoundFitnessMuscleOverlays(THREE, parts);
            anatomy = anatomy.map(overlay => {
              const part = overlay.definition.part;
              const garment = part === "torso shirt core" || SHOULDERS.includes(part) ? garments[0]
                : part === "hips" || THIGHS.includes(part) || SHINS.includes(part) ? garments[1]
                : part.endsWith("upper arm") || part.endsWith("forearm") || part === "neck" ? garments[part.startsWith("left") ? 2 : 3] : null;
              return garment ? { ...overlay, mesh: garment.bindOverlay(overlay.mesh) } : overlay;
            });
            anatomyBody = body;
            highlightShells = [];
            highlightFadeStart = null;
          }
          for (const {mesh, definition} of anatomy) {
            const source=parts.get(definition.part)!;
            const material=source.material as MeshStandardMaterial;
            if (source.userData.garmentProxy) material.color.copy(
              (source.name === "hips" || source.name.includes("thigh") || source.name.includes("shin") ? joggerMaterial : source.name.endsWith("arm") ? materialsByName.get("warm athletic skin")! : shirtMaterial).color,
            );
            mesh.userData.neutralColor=material.color.clone().lerp(new THREE.Color("#8ba2b5"),.14);
          }
          canvas.dataset.soundAvatarAnatomy = String(anatomy.length);
        };
        const clearHighlight = () => {
          for (const {mesh} of anatomy) {
            mesh.material.color.copy(mesh.userData.neutralColor);
            mesh.material.emissive.set(0x000000);
            mesh.material.opacity=.12;
            mesh.renderOrder=2;
            mesh.visible=mesh.userData.neutralVisible;
          }
          highlightShells=[];
        };
        const applyHighlight = () => {
          const state=latest.current;
          if (!state.bodyPartGlowActive || !state.selectedBodyPart) {
            if (highlightShells.length && highlightFadeStart===null) highlightFadeStart=performance.now();
            else if (!highlightShells.length) clearHighlight();
            return;
          }
          highlightFadeStart=null;
          clearHighlight();
          const focus=state.glowMode==="pieces" ? state.glowFocus ?? null : null;
          for (const {mesh,definition} of anatomy) {
            if (!isAvatarMuscleSelected(definition,state.selectedBodyPart,focus)) continue;
            // Whole groups retain each muscle's exercise-library color.
            const key = definition.region;
            const color = parseColor(
              THREE,
              state.bodyPartGlowColors?.[key] ?? state.bodyPartGlowColors?.[state.selectedBodyPart],
              exerciseAnatomyRegionVisuals[regionColorGroups[key]].selectedFill,
            );
            mesh.visible=true;
            mesh.material.color.copy(color);
            mesh.material.emissive.copy(color);
            mesh.material.emissiveIntensity=.12;
            mesh.material.opacity=.88;
            mesh.renderOrder=10;
            mesh.userData.baseOpacity=.88;
            highlightShells.push(mesh);
          }
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
          const hits = raycaster.intersectObjects([...hitTargets,...(humanRig?.meshes??[])], false);
          const hit = hits.find((entry) => entry.object.visible && (entry.object as Mesh<BufferGeometry,MeshStandardMaterial>).material.visible);
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
                `${shell.name} vertices=${shell.geometry.getAttribute("position").count} parent=${shell.parent?.name ?? "none"}`,
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
          if (press?.dragged) return;
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
        let manualYaw = 0;
        let lastView = latest.current.view;
        let suppressClick = false;
        let press: {
          part: SoundFitnessAvatarBodyPart | null;
          pointerId: number;
          t: number;
          x: number;
          y: number;
          yaw: number;
          dragged: boolean;
        } | null = null;
        const onPointerLeave = () => {
          pendingPointer = null;
          if (press) return;
          setHover(null);
        };
        const onPointerDown = (event: PointerEvent) => {
          if (!latest.current.interactive || event.button !== 0) return;
          event.stopPropagation();
          canvas.setPointerCapture?.(event.pointerId);
          press = {
            part: hitAt(event.clientX, event.clientY),
            pointerId: event.pointerId,
            t: performance.now(),
            x: event.clientX,
            y: event.clientY,
            yaw: manualYaw,
            dragged: false,
          };
        };
        const onDragMove = (event: PointerEvent) => {
          if (!press || event.pointerId !== press.pointerId) return;
          const dx = event.clientX - press.x;
          if (!press.dragged && Math.abs(dx) < 6) return;
          press.dragged = true;
          event.stopPropagation();
          manualYaw = press.yaw + dx / Math.max(120, canvas.getBoundingClientRect().width) * Math.PI * 2;
          pendingPointer = null;
          setHover(null);
          canvas.style.cursor = "grabbing";
        };
        // Window-level so the release still arrives when an ancestor captured
        // the pointer; only the pressed pointer counts.
        const onWindowPointerUp = (event: PointerEvent) => {
          if (!press || event.pointerId !== press.pointerId) return;
          const { part: hit, t, x, y, dragged } = press;
          press = null;
          suppressClick = dragged;
          if (dragged) event.stopPropagation();
          if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
          const moved = Math.hypot(event.clientX - x, event.clientY - y);
          if (!dragged && hit && moved < 8 && performance.now() - t < 700) {
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
        const onCanvasClick = (event: MouseEvent) => {
          if (!suppressClick) return;
          suppressClick = false;
          event.preventDefault();
          event.stopPropagation();
        };
        canvas.style.touchAction = "pan-y";
        canvas.addEventListener("click", onCanvasClick);
        window.addEventListener("pointermove", onDragMove, true);
        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerleave", onPointerLeave);
        canvas.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("pointerup", onWindowPointerUp, true);
        window.addEventListener("pointercancel", onWindowPointerCancel, true);

        // Camera and expression targets change in place; switching tabs never rebuilds the scene.
        let cameraInitialized = false;
        const cameraTarget = { y: .25, z: camera.position.z, aimY: .16 };
        let cameraAimY = .16;
        const resize = () => {
          const rect = canvas.getBoundingClientRect();
          const width = Math.max(1, Math.round(rect.width));
          const height = Math.max(1, Math.round(rect.height));
          const baseHeight = allowOverheadOverflow ? height / 1.5 : height;
          camera.aspect = width / baseHeight;
          // Fit the full athlete using both dimensions, including narrow
          // phone canvases. A nearly level camera avoids shortening the legs.
          const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
          const poseWidth = 1.38;
          const closeUp = latest.current.portrait;
          const showNecklace = closeUp && latest.current.appearance.gear === "chain";
          cameraTarget.y = closeUp ? (showNecklace ? 1.29 : 1.39) : .25;
          cameraTarget.z = Math.max((closeUp ? (showNecklace ? 1.08 : .8) : allowOverheadOverflow ? 2.72 : 3.5) / (2 * Math.tan(halfFov) * .91),
            (closeUp ? .65 : poseWidth) / (2 * Math.tan(halfFov) * camera.aspect * .88));
          cameraTarget.aimY = closeUp ? (showNecklace ? 1.17 : 1.30) : .16;
          if (!cameraInitialized) {
            camera.position.set(0, cameraTarget.y, cameraTarget.z);
            cameraAimY = cameraTarget.aimY;
            camera.lookAt(0, cameraAimY, 0);
            cameraInitialized = true;
          }
          if (allowOverheadOverflow) camera.setViewOffset(width, baseHeight, 0, -baseHeight * .5, width, height);
          camera.updateProjectionMatrix();
          gl.setSize(width, height, false);
          gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.45));
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(canvas);
        resize();
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

        let animationFrame = 0;
        let readyReported = false;
        let avatarInViewport = typeof IntersectionObserver === "undefined";
        let canvasActive: boolean | null = null;
        const viewportObserver = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
          avatarInViewport = entry.isIntersecting;
        });
        viewportObserver?.observe(canvas);
        let lastTime = performance.now();
        let yaw = latest.current.view === "back" ? Math.PI - 0.08 : -0.08;
        const pose = { head: [...restPose.head], leftArm: [...restPose.leftArm], rightArm: [...restPose.rightArm] };
        let idleSeconds = 0;
        let emoteSeconds = 0;
        let backFlexAmount = 0;
        let currentEmote = latest.current.emotePreset;
        let currentReplay = latest.current.emoteReplay;
        const upperBodyJoints = [headPivot, leftArmPivot, rightArmPivot].map(joint => ({ joint, restX: joint.position.x, restY: joint.position.y, restZ: joint.position.z }));
        const expressionSmile = part("smile");
        const smileRestScale = baseScales.get("smile");
        const facialFeatures = ["left", "right"].flatMap(side =>
          ["iris", "pupil", "eyebrow"].map(feature => {
            const name = `${side} ${feature}`;
            return { mesh: part(name), base: basePositions.get(name), side, eyebrow: feature === "eyebrow" };
          }),
        );
        const render = (time: number) => {
          if (disposed) return;
          const state = latest.current;
          const visible = avatarInViewport && !document.hidden && state.active;
          const live = visible && state.active && !state.paused;
          if (canvasActive !== live) {
            canvasActive = live;
            setDashboardWebGlCanvasActive(canvas, live);
            canvas.dataset.soundAvatarAnimating = String(live);
          }
          // The shared renderer skips hidden GPU draws, but the rig and
          // clothing deformation are CPU work too. Skip both offscreen.
          // Prepare one frame even if another hero is selected on arrival;
          // otherwise its startup deadline could expire while safely hidden.
          if ((!visible && readyReported) || contextLost) {
            lastTime = time;
            animationFrame = window.requestAnimationFrame(render);
            return;
          }
          // Idle skin deformation is expensive and the shared stage already
          // draws at a limited cadence. Keep gestures, turns and zooms fluid,
          // while avoiding a full mesh update on every idle display refresh.
          const turning = Math.abs(yaw - ((state.view === "back" ? Math.PI - .08 : -.08) + manualYaw)) > .01;
          const zooming = Math.abs(camera.position.z-cameraTarget.z) > .01 || Math.abs(camera.position.y-cameraTarget.y) > .01;
          const wantsBackFlex = state.bodyPartGlowActive && state.selectedBodyPart === "back" && state.glowMode === "whole";
          const backFlexTarget = wantsBackFlex ? 1 : 0;
          const gesturing = Math.abs(backFlexTarget - backFlexAmount) > .001 || wantsBackFlex || state.emotePreset !== currentEmote || state.emoteReplay !== currentReplay || (state.emotePreset !== "calm" && emoteSeconds < 6.5);
          if (readyReported && live && !reducedMotion.matches && !turning && !zooming && !gesturing && time-lastTime < 1000/30) {
            animationFrame = window.requestAnimationFrame(render);
            return;
          }
          const dt = Math.min(0.05, Math.max(0, (time - lastTime) / 1000));
          backFlexAmount += (backFlexTarget - backFlexAmount) * (1 - Math.exp(-dt * 4));
          lastTime = time;
          const still = reducedMotion.matches || !live;
          if (!still) idleSeconds += dt;
          if (state.emotePreset !== currentEmote || state.emoteReplay !== currentReplay) {
            currentReplay = state.emoteReplay;
            currentEmote = state.emotePreset;
            emoteSeconds = 0;
          }
          if (!still) emoteSeconds += dt;
          const seconds = emoteSeconds;
          const idle = soundFitnessAvatarIdleMotion(idleSeconds, !still);
          const ease = still ? 1 : 1 - Math.exp(-dt * 7);

          if (state.view !== lastView) {
            manualYaw = 0;
            lastView = state.view;
          }
          const targetYaw = (state.view === "back" ? Math.PI - 0.08 : -0.08) + manualYaw;
          yaw += (targetYaw - yaw) * (still ? 1 : 1 - Math.exp(-dt * 5));
          const sway = idle.weightShift * 0.65;
          root.rotation.y = yaw + sway;

          // Each gesture has an anticipation, readable hold and soft release.
          // A completed gesture returns to breathing idle rather than cycling forever.
          const duration = state.emotePreset === "stretch" ? 6 : state.emotePreset === "focus" ? 5 : state.emotePreset === "salute" ? 5.2 : 3.8;
          const smooth = (value: number) => {
            const t = Math.max(0, Math.min(1, value));
            return t * t * (3 - 2 * t);
          };
          const gesture = still ? 1 : smooth(seconds / .7) * (1 - smooth((seconds - duration + .9) / .9));
          // Bow leads with the gaze, then hinges at the hips, pauses and
          // releases slowly. The head and shoulders follow the same hinge.
          const bowAmount = state.emotePreset === "bow"
            ? (still ? 1 : smooth((seconds - .15) / .9) * (1 - smooth((seconds - 2.2) / 1.4))) : 0;
          const bowPitch = .42 * bowAmount;
          const waveEnergy = state.emotePreset === "wave" && !still ? gesture : 0;
          const wavePhase = Math.max(0, seconds - .65) * 4.4;
          const waveFollow = Math.sin(wavePhase - .35) * waveEnergy;
          const cheer = state.emotePreset === "celebrate" ? gesture : 0;
          const cheerPhase = Math.max(0, Math.min(1, (seconds - .8) / 1.8)) * Math.PI * 4;
          const cheerPump = still ? 0 : Math.sin(cheerPhase) * cheer;
          const requested = emotePoses[state.emotePreset] ?? restPose;
          const target: EmotePose = {
            head: restPose.head.map((v, i) => v + (requested.head[i] - v) * gesture) as EmotePose["head"],
            leftArm: restPose.leftArm.map((v, i) => v + (requested.leftArm[i] - v) * gesture) as EmotePose["leftArm"],
            rightArm: restPose.rightArm.map((v, i) => v + (requested.rightArm[i] - v) * gesture) as EmotePose["rightArm"],
          };
          let leftZ = target.leftArm[1];
          let rightZ = target.rightArm[1];
          let headX = target.head[0] + idle.headPitch;
          if (!still) {
            switch (state.emotePreset) {
              case "wave":
                rightZ += Math.sin(wavePhase - .65) * .025 * waveEnergy;
                break;
              case "nod":
                headX += .16 * Math.pow(Math.sin(seconds * 2.8), 2) * gesture;
                break;
              case "celebrate":
                leftZ -= .10 * cheerPump;
                rightZ += .13 * cheerPump;
                headX -= .025 * cheerPump;
                break;
              case "stretch":
                leftZ += Math.sin(seconds * 1.2) * 0.04 * gesture;
                rightZ -= Math.sin(seconds * 1.2) * 0.04 * gesture;
                break;
              default:
                break;
            }
          }
          pose.leftArm[0] += (target.leftArm[0] + idle.armSwing - pose.leftArm[0]) * ease;
          pose.leftArm[1] += (leftZ - pose.leftArm[1]) * ease;
          pose.rightArm[0] += (target.rightArm[0] - idle.armSwing * 0.7 - pose.rightArm[0]) * ease;
          pose.rightArm[1] += (rightZ - pose.rightArm[1]) * ease;
          pose.head[0] += (headX - pose.head[0]) * ease;
          pose.head[1] += (target.head[1] + idle.headYaw + .045 * waveEnergy - pose.head[1]) * ease;
          pose.head[2] += (target.head[2] + idle.headRoll + .025 * waveFollow - pose.head[2]) * ease;
          // Rotate the humerus outward as the arms rise, then bring the
          // hands toward each other overhead instead of lifting rigid paddles.
          const stretchTurn = state.emotePreset === "stretch" ? Math.PI * .65 * gesture : 0;
          // Apply elevation first, then twist around the arm's own long axis.
          // XYZ made the yaw act in the wrong frame as the arm rose overhead.
          leftArmPivot.rotation.order = state.emotePreset === "stretch" ? "ZXY" : "XYZ";
          rightArmPivot.rotation.order = state.emotePreset === "stretch" ? "ZXY" : "XYZ";
          leftArmPivot.rotation.set(pose.leftArm[0], stretchTurn, pose.leftArm[1]);
          rightArmPivot.rotation.set(pose.rightArm[0], -stretchTurn, pose.rightArm[1]);
          headPivot.rotation.set(pose.head[0] + bowPitch, pose.head[1], pose.head[2]);
          // Breathe through the chest instead of floating the entire athlete.
          torsoPivot.scale.set(1 + idle.breath * 0.003, 1 + idle.breath * 0.004, 1 + idle.breath * 0.015);
          torsoPivot.rotation.x = bowPitch;
          const hipHeight = 1.78;
          const torsoHeight = torsoCentre[1] - hipHeight;
          torsoPivot.position.y = hipHeight + Math.cos(bowPitch) * torsoHeight;
          torsoPivot.position.z = Math.sin(bowPitch) * torsoHeight;
          torsoPivot.rotation.z = idle.weightShift + .015 * waveFollow + .018 * cheerPump;
          if (necklace) {
            torsoPivot.updateMatrix();
            necklace.matrixAutoUpdate=false;
            necklace.matrix.multiplyMatrices(torsoPivot.matrix,necklaceTorsoRestInverse);
          }
          hipsPivot.rotation.z = -idle.weightShift * 0.25;
          for (const { joint, restX, restY, restZ } of upperBodyJoints) {
            joint.position.x = restX - idle.weightShift * Math.max(0, restY - torsoCentre[1]);
            joint.position.y = hipHeight + Math.cos(bowPitch) * (restY - hipHeight) - Math.sin(bowPitch) * restZ + idle.breath * 0.007;
            joint.position.z = Math.sin(bowPitch) * (restY - hipHeight) + Math.cos(bowPitch) * restZ;
          }
          const stretchExpression = state.emotePreset === "stretch" ? gesture * .32 : state.emotePreset === "bow" ? bowAmount * .42 : state.emotePreset === "wave" ? gesture * .12 : state.emotePreset === "celebrate" ? gesture * .30 : 0;
          if (expressionSmile && smileRestScale) {
            const warmth = state.emotePreset === "bow" ? bowAmount : state.emotePreset === "stretch" ? gesture * .65 : state.emotePreset === "wave" ? gesture : state.emotePreset === "celebrate" ? gesture * 1.6 : 0;
            const faceScale = state.appearance.face === "bright" ? 1.3 : 1;
            expressionSmile.scale.set(smileRestScale.x * faceScale * (1 + .12 * warmth), smileRestScale.y * faceScale * (1 + .14 * warmth), smileRestScale.z * faceScale);
          }
          for (const { lid, height, centerY, side, centerX, centerZ, lower } of eyelids) {
            const eyeScale = state.appearance.body === "female" ? 1.12 : 1;
            const blink = lower ? (state.appearance.body === "female" ? .16 : .06) : Math.max(state.appearance.body === "female" ? .17 : .08, idle.blink, stretchExpression);
            lid.visible = blink > 0.001;
            lid.scale.y = height * eyeScale * Math.max(0.001, blink);
            const shift = eyeOffsets[side] ?? [0,0,0];
            if (side) { lid.position.x = centerX + shift[0]; lid.position.z = centerZ + shift[2]; }
            lid.position.y = centerY + shift[1] + (lower ? -1 : 1) * height * eyeScale * (1 - blink);
          }
          for (const { mesh, base, eyebrow, side } of facialFeatures) {
            if (mesh && base) {
              const shift = eyeOffsets[side] ?? [0,0,0];
              mesh.position.x = base.x + shift[0] + (eyebrow ? 0 : idle.gaze);
              mesh.position.z = base.z + shift[2];
              mesh.position.y = base.y + shift[1] + (eyebrow ? idle.brow + stretchExpression * .045 : 0);
            }
          }
          const requestedElbow=state.emotePreset==="focus" ? -.65 : state.emotePreset==="stretch" ? -.12 : state.emotePreset==="celebrate" ? -.16 : -.08;
          const elbowBend = -.08 + (requestedElbow + .08) * gesture;
          elbows[0].rotation.x += (elbowBend-elbows[0].rotation.x)*ease;
          const rightBend = state.emotePreset === "wave" ? -.08 - .12 * gesture : state.emotePreset === "salute" ? -.08 - .2 * gesture : elbowBend;
          elbows[1].rotation.x += (rightBend-elbows[1].rotation.x)*ease;
          // Bend toward the brow in the shoulder plane, rather than pointing
          // the forearm straight at the camera.
          const rightFold = state.emotePreset === "salute" ? 2.15 * gesture : state.emotePreset === "wave" ? 1.9 * gesture + .075 * waveFollow : state.emotePreset === "celebrate" ? 1.35 * cheer - .12 * cheerPump : 0;
          elbows[1].rotation.z += (rightFold - elbows[1].rotation.z) * ease;
          elbows[0].rotation.z += (-1.25 * cheer + .10 * cheerPump - elbows[0].rotation.z) * ease;
          // Share the rotation between shoulder and forearm, keeping the
          // wrists straight and palms facing each other at the overhead hold.
          const forearmTurn = state.emotePreset === "stretch" ? Math.PI * .35 * gesture : 0;
          elbows[0].rotation.order = cheer > 0 ? "ZXY" : "XYZ";
          elbows[0].rotation.y += (forearmTurn - .9 * cheer - elbows[0].rotation.y) * ease;
          elbows[1].rotation.order = state.emotePreset === "wave" || state.emotePreset === "celebrate" || state.emotePreset === "salute" ? "ZXY" : "XYZ";
          const salutePalm = 0;
          const wavePalm = state.emotePreset === "wave" ? Math.PI / 2 * gesture : 0;
          elbows[1].rotation.y += (wavePalm + salutePalm - forearmTurn + .9 * cheer - elbows[1].rotation.y) * ease;
          const waveBeat = state.emotePreset === "wave" && !still
            ? (Math.sin(wavePhase) + .12 * Math.sin(wavePhase * 2)) * .18 * gesture : 0;
          wrists[0].rotation.z += (0 - wrists[0].rotation.z) * ease;
          const saluteHandTurn = state.emotePreset === "salute" ? Math.PI * gesture : 0;
          wrists[1].rotation.y += (saluteHandTurn - wrists[1].rotation.y) * ease;
          const saluteWrist = 0;
          wrists[1].rotation.z += (waveBeat + saluteWrist - wrists[1].rotation.z) * ease;
          // Small delayed wrist flex prevents a rigid, single-axis metronome.
          const wristFlex = .055 * Math.sin(wavePhase - .5) * waveEnergy;
          wrists[1].rotation.x += (wristFlex - wrists[1].rotation.x) * ease;
          saluteRig(state.emotePreset === "salute" ? gesture : 0);
          // A rear double-biceps silhouette follows the Back highlight without
          // changing or persisting the member's chosen emote. Damped blending
          // also releases smoothly when the highlight ends or changes region.
          humanRig?.setFist(backFlexAmount);
          if (backFlexAmount > .001) {
            const blend = (value: number, target: number) => value + (target - value) * backFlexAmount;
            leftArmPivot.rotation.order = rightArmPivot.rotation.order = "XYZ";
            leftArmPivot.rotation.set(blend(leftArmPivot.rotation.x, -.10), blend(leftArmPivot.rotation.y, -.12), blend(leftArmPivot.rotation.z, -1.48));
            rightArmPivot.rotation.set(blend(rightArmPivot.rotation.x, -.10), blend(rightArmPivot.rotation.y, .12), blend(rightArmPivot.rotation.z, 1.48));
            elbows[0].rotation.order = elbows[1].rotation.order = "ZXY";
            elbows[0].rotation.set(blend(elbows[0].rotation.x, -.08), blend(elbows[0].rotation.y, -1.10), blend(elbows[0].rotation.z, -2.05));
            elbows[1].rotation.set(blend(elbows[1].rotation.x, -.08), blend(elbows[1].rotation.y, 1.10), blend(elbows[1].rotation.z, 2.05));
            wrists.forEach((wrist, index) => {
              wrist.rotation.x = blend(wrist.rotation.x, -.22);
              wrist.rotation.y = blend(wrist.rotation.y, index === 0 ? -.35 : .35);
              wrist.rotation.z = blend(wrist.rotation.z, index === 0 ? -.08 : .08);
            });
          }
          for (const {hip,knee} of legPivots) {
            const bend=0;
            hip.rotation.x=-bend*.5;
            knee.rotation.x=bend;
          }
          root.position.y = SOUND_AVATAR_BASE_Y;

          if (highlightFadeStart !== null) {
            // rAF stamps can trail performance.now(); never brighten first.
            const progress = Math.max(0, (time - highlightFadeStart) / HIGHLIGHT_FADE_MS);
            if (progress >= 1) {
              highlightFadeStart = null;
              clearHighlight();
            } else {
              for (const shell of highlightShells) {
                (shell.material as MeshStandardMaterial).opacity =
                  (shell.userData.baseOpacity as number) * (1 - progress);
              }
            }
          }
          const transition = reducedMotion.matches ? 1 : 1 - Math.exp(-dt * 8);
          camera.position.y += (cameraTarget.y - camera.position.y) * transition;
          camera.position.z += (cameraTarget.z - camera.position.z) * transition;
          cameraAimY += (cameraTarget.aimY - cameraAimY) * transition;
          camera.lookAt(0, cameraAimY, 0);
          const expressionWeights = headSculpt?.morphTargetInfluences;
          if (expressionWeights) {
            for (const [index, preset] of [[1, "bright"], [2, "focused"], [3, "defined"]] as const) {
              expressionWeights[index] += ((state.appearance.face === preset ? 1 : 0) - expressionWeights[index]) * transition;
            }
          }
          for (const garment of garments) garment.update();
          gl.render(scene, camera);
          if (!readyReported) {
            readyReported = true;
            clearDashboardWebGlFallback(canvas);
            setDashboardWebGlCanvasActive(canvas, live);
            canvas.dataset.soundAvatarReady = "true";
            window.clearTimeout(loadTimeout);
            setLoadState("ready");
            onReadyChange?.(true);
          }
          animationFrame = window.requestAnimationFrame(render);
        };

        updaters.current = { applyAppearance, applyHighlight, resize };
        applyAppearance();
        applyHighlight();
        // Test hooks: what the scene currently carries.
        canvas.dataset.soundAvatarParts = String(parts.size);
        animationFrame = window.requestAnimationFrame(render);

        cleanup = () => {
          updaters.current = null;
          window.cancelAnimationFrame(animationFrame);
          window.cancelAnimationFrame(pointerFrame);
          canvas.removeEventListener("pointermove", onPointerMove);
          canvas.removeEventListener("pointerleave", onPointerLeave);
          canvas.removeEventListener("pointerdown", onPointerDown);
          canvas.removeEventListener("click", onCanvasClick);
          window.removeEventListener("pointermove", onDragMove, true);
          window.removeEventListener("pointerup", onWindowPointerUp, true);
          window.removeEventListener("pointercancel", onWindowPointerCancel, true);
          canvas.style.cursor = "";
          resizeObserver.disconnect();
          viewportObserver?.disconnect();
          setDashboardWebGlCanvasActive(canvas, false);
          shadowTexture.dispose();
          garments.forEach(garment => garment.dispose());
          disposeObject(scene);
          disposeSurfaceMaps();Object.values(shirtPrintTexture).forEach(texture => texture.dispose());
          studioEnvironment.dispose();
          gl.dispose();
          onReadyChange?.(false);
        };
      } catch {
        if (!disposed) {
          markDashboardWebGlFallback(canvas);
          onReadyChange?.(false);
          setLoadState("error");
        }
      }
    };

    void start();
    return () => {
      disposed = true;
      if (recoveryTimer !== undefined) window.clearTimeout(recoveryTimer);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      window.clearTimeout(loadTimeout);
      cleanup();
    };
    // The scene is built once; everything below updates it in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onReadyChange, sceneAttempt]);

  useEffect(() => {
    updaters.current?.applyAppearance();
  }, [appearanceKey]);

  useEffect(() => {
    updaters.current?.resize();
  }, [emotePreset, portrait, resolvedAppearance.gear]);

  useEffect(() => {
    updaters.current?.applyHighlight();
    // Test hook: the glow props as the figure last received them.
    if (canvasRef.current) canvasRef.current.dataset.soundAvatarGlow = highlightKey;
  }, [highlightKey]);

  return (
    <div className={`${loadingStyles.avatarHost} ${className || ""}`} data-avatar-load-state={loadState} aria-busy={loadState === "loading"}>
      <canvas
        key={sceneAttempt}
        aria-hidden="true"
        className={`${loadingStyles.canvas} ${allowOverheadOverflow ? loadingStyles.overheadCanvas : ""}`}
        data-sound-avatar-renderer="three"
        ref={canvasRef}
      />
      <div className={`${loadingStyles.avatar} ${loadState === "ready" ? loadingStyles.complete : ""}`}
        role={loadState === "ready" ? undefined : "status"} aria-hidden={loadState === "ready"}>
        {loadState === "loading" ? <span className={loadingStyles.spinner} aria-hidden="true" /> : null}
        <span className={loadingStyles.label}>{loadState === "error" ? "Avatar unavailable" : "Preparing your avatar"}</span>
        {loadState === "error" ? <button type="button" onClick={() => {
          recoveryAttempts.current = 0;
          setLoadState("loading");
          setSceneAttempt(attempt => attempt + 1);
        }}>Retry avatar</button> : null}
      </div>
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
    </div>
  );
}

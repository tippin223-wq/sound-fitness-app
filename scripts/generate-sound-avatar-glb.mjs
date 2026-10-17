import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  BoxGeometry,
  BufferGeometry,
  CapsuleGeometry,
  Group,
  Float32BufferAttribute,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  Scene,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

globalThis.FileReader ??= class FileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(
      (buffer) => {
        this.result = buffer;
        this.onloadend?.();
      },
      (error) => {
        this.error = error;
        this.onerror?.(error);
      },
    );
  }
};

const outputPath = resolve("public/models/sound-avatar.glb");

const material = (name, color, options = {}) => {
  const item = new MeshStandardMaterial({
    color,
    metalness: 0.08,
    roughness: 0.58,
    ...options,
  });
  item.name = name;
  return item;
};

const skin = material("warm athletic skin", 0x8f5538, {
  metalness: 0,
  roughness: 0.48,
});
const skinHighlight = material("soft skin highlights", 0xc9865d, {
  metalness: 0,
  roughness: 0.52,
});
const blush = material("subtle cheek warmth", 0xbb6a54, {
  metalness: 0,
  roughness: 0.7,
  transparent: true,
  opacity: 0.56,
});
const hair = material("full close-cropped hair cap", 0x2b1c11, {
  metalness: 0,
  roughness: 0.62,
});
const hairHighlight = material("soft hair crown highlight", 0x4a3321, {
  metalness: 0,
  roughness: 0.7,
});
const shirt = material("sound navy performance shirt", 0x0f2538, {
  roughness: 0.46,
});
const shirtStripe = material("cyan performance shirt seams", 0x67e8f9, {
  emissive: 0x0ea5e9,
  emissiveIntensity: 0.16,
  metalness: 0.04,
  roughness: 0.32,
});
const shirtPrint = material("soft white shirt crest ink", 0xdff7ff, {
  emissive: 0x38bdf8,
  emissiveIntensity: 0.08,
  metalness: 0.02,
  roughness: 0.36,
});
const shirtInk = material("deep crest shirt ink", 0x082f49, {
  metalness: 0.08,
  roughness: 0.4,
});
const shirtPanel = material("shirt side panel", 0x183b54, {
  roughness: 0.5,
});
const pants = material("charcoal training joggers", 0x263241, {
  roughness: 0.52,
});
const shoe = material("cyan-lit training shoes", 0x102032, {
  roughness: 0.38,
});
const shoeGlow = material("shoe cyan sole glow", 0x8ff5ff, {
  emissive: 0x19d3ff,
  emissiveIntensity: 0.8,
  metalness: 0.02,
  roughness: 0.28,
});
const eyeWhite = material("warm eye sclera", 0xf8ead8, {
  metalness: 0,
  roughness: 0.38,
});
const iris = material("amber brown iris", 0x61432d, {
  metalness: 0,
  roughness: 0.22,
});
const pupil = material("soft pupil", 0x111827, {
  metalness: 0,
  roughness: 0.2,
});
const logoGlow = material("sound crest glow", 0x7dd3fc, {
  emissive: 0x0ea5e9,
  emissiveIntensity: 0.55,
  metalness: 0.12,
  roughness: 0.24,
});

const scene = new Scene();
scene.name = "Sound Fitness starter avatar asset";

const avatar = new Group();
avatar.name = "Sound Fitness Procedural Avatar";
scene.add(avatar);

const add = (name, geometry, mat, position, scale = [1, 1, 1], rotation = [0, 0, 0]) => {
  const mesh = new Mesh(geometry, mat);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  avatar.add(mesh);
  return mesh;
};

const sphere = (segments = 48) => new SphereGeometry(1, segments, Math.max(16, segments / 2));
const capsule = (radius, length, segments = 24) =>
  new CapsuleGeometry(radius, length, segments, segments * 2);

add("hips", sphere(), pants, [0, 1.02, 0], [0.5, 0.24, 0.34]);
add("torso shirt core", sphere(), shirt, [0, 1.62, 0], [0.55, 0.74, 0.34]);
add("upper chest shoulder yoke", capsule(0.11, 0.78, 24), shirt, [0, 1.9, 0.01], [1, 1, 0.92], [0, 0, Math.PI / 2]);
add("left shirt side plane", sphere(32), shirtPanel, [-0.39, 1.58, 0.02], [0.15, 0.55, 0.16]);
add("right shirt side plane", sphere(32), shirtPanel, [0.39, 1.58, 0.02], [0.15, 0.55, 0.16]);
add("relaxed lower shirt drape", sphere(48), shirt, [0, 1.1, 0.08], [0.5, 0.18, 0.32]);
add("front shirt hem overhang", new BoxGeometry(0.78, 0.12, 0.075), shirt, [0, 0.98, 0.28], [1, 1, 1], [0.04, 0, 0]);
add("left shirt hem fold", new BoxGeometry(0.17, 0.1, 0.06), shirtPanel, [-0.33, 1, 0.27], [1, 1, 1], [0.02, 0, -0.12]);
add("right shirt hem fold", new BoxGeometry(0.17, 0.1, 0.06), shirtPanel, [0.33, 1, 0.27], [1, 1, 1], [0.02, 0, 0.12]);
add("neck", capsule(0.13, 0.18), skin, [0, 2.18, 0], [1, 1, 0.86]);
add("head sculpt", sphere(64), skin, [0, 2.55, 0.02], [0.42, 0.5, 0.36]);
add("face highlight plane", sphere(48), skinHighlight, [-0.08, 2.61, 0.29], [0.22, 0.26, 0.045]);
add("right cheek warmth", sphere(32), blush, [0.19, 2.5, 0.33], [0.08, 0.05, 0.018]);
add("left cheek warmth", sphere(32), blush, [-0.19, 2.5, 0.33], [0.08, 0.05, 0.018]);
add("continuous crown hair cap", sphere(64), hair, [0, 2.82, 0.005], [0.45, 0.24, 0.37]);
add("raised front hairline cap", sphere(48), hair, [0, 2.745, 0.265], [0.36, 0.085, 0.095], [0.1, 0, 0]);
add("soft left hairline taper", sphere(32), hair, [-0.2, 2.695, 0.23], [0.14, 0.095, 0.07], [0.08, -0.16, 0.08]);
add("soft right hairline taper", sphere(32), hair, [0.2, 2.695, 0.23], [0.14, 0.095, 0.07], [0.08, 0.16, -0.08]);
add("left temple coverage", sphere(32), hair, [-0.35, 2.64, 0.055], [0.075, 0.17, 0.09], [0.05, -0.12, 0.03]);
add("right temple coverage", sphere(32), hair, [0.35, 2.64, 0.055], [0.075, 0.17, 0.09], [0.05, 0.12, -0.03]);
add("back hair coverage", sphere(48), hair, [0, 2.675, -0.235], [0.39, 0.18, 0.13]);
add("subtle crown sheen", sphere(32), hairHighlight, [-0.12, 2.88, 0.15], [0.2, 0.045, 0.065], [0.12, -0.08, -0.12]);

add("left eye white", sphere(32), eyeWhite, [-0.14, 2.6, 0.345], [0.055, 0.033, 0.014]);
add("right eye white", sphere(32), eyeWhite, [0.14, 2.6, 0.345], [0.055, 0.033, 0.014]);
add("left iris", sphere(32), iris, [-0.14, 2.598, 0.359], [0.025, 0.025, 0.008]);
add("right iris", sphere(32), iris, [0.14, 2.598, 0.359], [0.025, 0.025, 0.008]);
add("left pupil", sphere(16), pupil, [-0.14, 2.596, 0.368], [0.011, 0.011, 0.004]);
add("right pupil", sphere(16), pupil, [0.14, 2.596, 0.368], [0.011, 0.011, 0.004]);
add("nose bridge", capsule(0.018, 0.1, 16), skinHighlight, [0, 2.525, 0.365], [0.68, 1, 0.44], [0.18, 0, 0]);
add("nose tip", sphere(24), skinHighlight, [0, 2.47, 0.37], [0.045, 0.028, 0.02]);
add("smile", new TorusGeometry(0.095, 0.008, 8, 48, Math.PI), pupil, [0, 2.405, 0.366], [1, 0.36, 0.16], [Math.PI, 0, 0]);

add("left shoulder", sphere(32), shirt, [-0.55, 1.92, 0], [0.19, 0.18, 0.2]);
add("right shoulder", sphere(32), shirt, [0.55, 1.92, 0], [0.19, 0.18, 0.2]);
add("left upper arm", capsule(0.095, 0.5), skin, [-0.68, 1.56, 0], [0.95, 1, 0.92], [0, 0, -0.1]);
add("right upper arm", capsule(0.095, 0.5), skin, [0.68, 1.56, 0], [0.95, 1, 0.92], [0, 0, 0.1]);
add("left wrist band", capsule(0.103, 0.06, 16), logoGlow, [-0.72, 1.24, 0.02], [1, 1, 0.9], [0, 0, -0.1]);
add("right wrist band", capsule(0.103, 0.06, 16), logoGlow, [0.72, 1.24, 0.02], [1, 1, 0.9], [0, 0, 0.1]);
add("left hand", sphere(32), skin, [-0.74, 1.08, 0.02], [0.11, 0.13, 0.1]);
add("right hand", sphere(32), skin, [0.74, 1.08, 0.02], [0.11, 0.13, 0.1]);

add("left thigh", capsule(0.14, 0.74), pants, [-0.22, 0.55, 0], [0.96, 1, 0.9], [0.04, 0, -0.04]);
add("right thigh", capsule(0.14, 0.74), pants, [0.22, 0.55, 0], [0.96, 1, 0.9], [0.04, 0, 0.04]);
add("left shin", capsule(0.115, 0.62), pants, [-0.24, -0.04, 0], [0.9, 1, 0.86], [0.03, 0, 0.02]);
add("right shin", capsule(0.115, 0.62), pants, [0.24, -0.04, 0], [0.9, 1, 0.86], [0.03, 0, -0.02]);
add("left shoe", new BoxGeometry(0.34, 0.1, 0.22), shoe, [-0.26, -0.44, 0.06], [1, 1, 1], [0, -0.09, 0]);
add("right shoe", new BoxGeometry(0.34, 0.1, 0.22), shoe, [0.26, -0.44, 0.06], [1, 1, 1], [0, 0.09, 0]);
add("left shoe sole glow", new BoxGeometry(0.3, 0.025, 0.24), shoeGlow, [-0.26, -0.505, 0.07], [1, 1, 1], [0, -0.09, 0]);
add("right shoe sole glow", new BoxGeometry(0.3, 0.025, 0.24), shoeGlow, [0.26, -0.505, 0.07], [1, 1, 1], [0, 0.09, 0]);
add("left shoulder performance seam", new BoxGeometry(0.3, 0.024, 0.018), shirtStripe, [-0.34, 1.95, 0.332], [1, 1, 1], [0, 0, -0.18]);
add("right shoulder performance seam", new BoxGeometry(0.3, 0.024, 0.018), shirtStripe, [0.34, 1.95, 0.332], [1, 1, 1], [0, 0, 0.18]);
add("left side performance piping", new BoxGeometry(0.026, 0.62, 0.018), shirtStripe, [-0.37, 1.5, 0.334], [1, 1, 1], [0, 0, -0.035]);
add("right side performance piping", new BoxGeometry(0.026, 0.62, 0.018), shirtStripe, [0.37, 1.5, 0.334], [1, 1, 1], [0, 0, 0.035]);
add("left sleeve cuff stripe", new BoxGeometry(0.22, 0.025, 0.018), shirtStripe, [-0.56, 1.82, 0.2], [1, 1, 1], [0, 0, 0.38]);
add("right sleeve cuff stripe", new BoxGeometry(0.22, 0.025, 0.018), shirtStripe, [0.56, 1.82, 0.2], [1, 1, 1], [0, 0, -0.38]);
add("left v collar stripe", new BoxGeometry(0.22, 0.032, 0.021), shirtStripe, [-0.08, 1.98, 0.34], [1, 1, 1], [0, 0, -0.66]);
add("right v collar stripe", new BoxGeometry(0.22, 0.032, 0.021), shirtStripe, [0.08, 1.98, 0.34], [1, 1, 1], [0, 0, 0.66]);
add("sound fitness small left chest crest", sphere(32), shirtPrint, [-0.18, 1.69, 0.354], [0.095, 0.095, 0.016]);
add("sound crest navy shield mark", new BoxGeometry(0.066, 0.076, 0.026), shirtInk, [-0.18, 1.69, 0.371], [1, 1, 1], [0, 0, Math.PI / 4]);
add("sound crest cyan diagonal", new BoxGeometry(0.13, 0.02, 0.03), shirtStripe, [-0.18, 1.69, 0.386], [1, 1, 1], [0, 0, -0.58]);
add("subtle chest speed slash", new BoxGeometry(0.34, 0.024, 0.018), shirtStripe, [0.14, 1.5, 0.347], [1, 1, 1], [0, 0, -0.12]);

// Adult proportions in one shared coordinate system: sole 0, knee .98,
// hip 1.8, shoulder 2.75, crown 3.41. The runtime garments use these landmarks.
const byName = (name) => avatar.children.find((mesh) => mesh.name === name);
const place = (name, position, scale) => {
  const mesh = byName(name);
  if (!mesh) return;
  mesh.position.set(...position);
  if (scale) mesh.scale.set(...scale);
};
for (const mesh of avatar.children) {
  if (["head sculpt", "face highlight", "cheek", "hair", "crown", "temple", "eye white", "iris", "pupil", "nose", "smile"].some((fragment) => mesh.name.includes(fragment))) {
    mesh.position.set(mesh.position.x*.43, 3.18+(mesh.position.y-2.55)*.46, .02+(mesh.position.z-.02)*.5);
    mesh.scale.multiply({x:.43,y:.46,z:.5});
  }
}
// Authored human facial topology, derived from the MakeHuman CC0 core mesh.
// The local subset includes only head faces and carries pinned provenance.
const head = byName("head sculpt");
const headSource=JSON.parse(await readFile(new URL('./assets/makehuman-head/head.json',import.meta.url),'utf8'));
head.geometry.dispose();
head.geometry=new BufferGeometry();
head.geometry.setAttribute('position',new Float32BufferAttribute(headSource.positions,3));
head.geometry.setIndex(headSource.indices);
head.geometry.computeVertexNormals();
head.userData.source='MakeHuman Community CC0 head topology';
for(const name of ['face highlight plane','nose bridge','nose tip','smile']) {
  const feature=byName(name);
  feature.geometry.dispose();
  avatar.remove(feature);
}
for(const [side,sign] of [['left',-1],['right',1]]) {
  const eye=headSource.eyes[sign<0?'right':'left'];
  const position=[eye[0]*head.scale.x,3.18+eye[1]*head.scale.y,.02+eye[2]*head.scale.z];
  place(`${side} eye white`,position,[.028,.014,.014]);
  place(`${side} iris`,[position[0],position[1],position[2]+.014],[.010,.010,.003]);
  place(`${side} pupil`,[position[0],position[1],position[2]+.017],[.006,.006,.002]);
  add(`${side} eyebrow`,new TorusGeometry(.029,.0035,6,20,Math.PI),hair,[position[0],position[1]+.022,position[2]+.013],[1,.3,1]);
  place(`${side} cheek warmth`,[sign*.09,3.13,.15],[.024,.014,.006]);
}
const crown=byName("continuous crown hair cap");
crown.geometry.dispose();
crown.geometry=new SphereGeometry(1,40,24,0,Math.PI*2,0,Math.PI*.55);
crown.position.set(0,3.27,.005);
crown.scale.set(.17,.14,.165);
const limb = (profile) => new LatheGeometry(profile.map(([r,y])=>new Vector2(r,y)),32);
place("hips",[0,1.8,0],[.36,.23,.24]);
place("torso shirt core",[0,2.35,0],[.45,.52,.25]);
place("neck",[0,2.94,0],[.72,.72,.72]);
place("upper chest shoulder yoke",[0,2.76,0],[.92,.92,.75]);
for (const [side,sign] of [["left",-1],["right",1]]) {
  place(`${side} shoulder`,[sign*.48,2.75,0],[.145,.155,.155]);
  const upper=byName(`${side} upper arm`);
  upper.geometry.dispose();
  upper.geometry=limb([[0,-.25],[.055,-.25],[.066,-.21],[.09,-.10],[.095,.06],[.086,.17],[.06,.25],[0,.25]]);
  upper.position.set(sign*.565,2.5,0);
  upper.rotation.z=sign*.16;
  upper.scale.set(1,1,1);
  add(`${side} forearm`,limb([[0,-.23],[.042,-.23],[.047,-.17],[.058,-.05],[.077,.10],[.075,.18],[.057,.23],[0,.23]]),skin,[sign*.66,2.04,0],[1,1,.92],[0,0,sign*.1]);
  place(`${side} wrist band`,[sign*.697,1.82,0],[.67,.67,.67]);
  const hand=byName(`${side} hand`);
  const palm=sphere(24).scale(.065,.085,.032);
  const handPieces=[palm];
  for (let finger=0;finger<4;finger++) {
    const length=[.13,.16,.15,.12][finger];
    handPieces.push(capsule(.015,length,8).translate((finger-1.5)*.032,-.085-length/2,.002));
  }
  handPieces.push(capsule(.018,.10,8).rotateZ(sign*.55).translate(sign*.078,-.045,.015));
  hand.geometry.dispose();
  hand.geometry=mergeGeometries(handPieces);
  handPieces.forEach((geometry)=>geometry.dispose());
  hand.position.set(sign*.71,1.73,0);
  hand.scale.set(1,1,1);
  hand.rotation.z=sign*.06;
  place(`${side} thigh`,[sign*.19,1.43,0],[1,1,1]);
  place(`${side} shin`,[sign*.19,.55,0],[1,1,1]);
  const shoe=byName(`${side} shoe`),sole=byName(`${side} shoe sole glow`);
  shoe.geometry.dispose();
  shoe.geometry=sphere(24).scale(.105,.07,.25);
  shoe.position.set(sign*.19,.085,.08);
  shoe.scale.set(1,1,1);
  shoe.rotation.y=sign*.08;
  sole.geometry.dispose();
  sole.geometry=sphere(24).scale(.106,.018,.251);
  sole.position.set(sign*.19,.03,.08);
  sole.scale.set(1,1,1);
  sole.rotation.y=sign*.08;
}
// Keep the chest crest fitted to the new shirt instead of floating at its
// former mascot-height waistline. Appearance material names stay compatible.
place("sound fitness small left chest crest",[-.15,2.55,.259],[.045,.045,.009]);
place("sound crest navy shield mark",[-.15,2.55,.269],[.5,.5,.5]);
place("sound crest cyan diagonal",[-.15,2.55,.279],[.5,.5,.5]);
avatar.position.y = 0;

const exporter = new GLTFExporter();
const arrayBuffer = await exporter.parseAsync(scene, {
  binary: true,
  includeCustomExtensions: false,
  onlyVisible: true,
  trs: false,
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, Buffer.from(arrayBuffer));

console.log(`Wrote ${outputPath}`);

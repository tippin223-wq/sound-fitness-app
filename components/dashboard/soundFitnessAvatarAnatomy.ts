import type * as Three from "three";
import type { SoundFitnessAvatarBodyPart, SoundFitnessAvatarGlowRegion } from "./soundFitnessAvatarAppearance";
type Point = [
    number,
    number
];
type Surface = "front" | "back" | "outer";
type Muscle = {
    name: string;
    part: string;
    group: SoundFitnessAvatarBodyPart;
    region: SoundFitnessAvatarGlowRegion;
    surface: Surface;
    outline: Point[];
};
// Hand-authored superficial silhouettes, expressed in each part's geometry
// bounds. These are selection surfaces, never health/strength measurements.
// Each vertex is projected onto the actual curved body mesh below.
const pec: Point[] = [[.08, .86], [.24, .94], [.45, .90], [.48, .66], [.38, .57], [.16, .60], [.04, .74]];
const lat: Point[] = [[.06, .73], [.25, .66], [.44, .54], [.44, .16], [.29, .29], [.13, .48]];
const muscleLeaf: Point[] = [[.48, .95], [.85, .76], [1, .46], [.72, .15], [.48, .03], [.12, .22], [0, .54], [.15, .82]];
const mirror = (outline: Point[]): Point[] => outline.map(([x, y]) => [1 - x, y]);
const fit = (outline: Point[], x0: number, x1: number, y0 = 0, y1 = 1): Point[] => outline.map(([x, y]) => [x0 + x * (x1 - x0), y0 + y * (y1 - y0)]);
export function soundFitnessMuscleSurfaces(): Muscle[] {
    const surfaces: Muscle[] = [];
    const add = (name: string, part: string, group: SoundFitnessAvatarBodyPart, region: SoundFitnessAvatarGlowRegion, surface: Surface, outline: Point[]) => surfaces.push({ name, part, group, region, surface, outline });
    for (const [side, sign] of [["left", -1], ["right", 1]] as const) {
        const reflect = (outline: Point[]) => sign < 0 ? outline : mirror(outline);
        add(`${side} pectoral`, "torso shirt core", "chest", "chest", "front", reflect(pec));
        // Individual chest selections use shaped subsets of the same pec footprint.
        for (const [region, lo, hi] of [["upperChest", .77, .92], ["midChest", .65, .78], ["lowerChest", .57, .67]] as const) {
            add(`${side} ${region}`, "torso shirt core", "chest", region, "front", reflect([[.09, hi - .02], [.25, hi], [.45, hi - .025], [.46, lo + .03], [.36, lo], [.17, lo + .02]]));
        }
        add(`${side} latissimus`, "torso shirt core", "back", "lats", "back", reflect(lat));
        add(`${side} trapezius`, "torso shirt core", "back", "traps", "back", reflect([[.48, .98], [.34, .94], [.08, .84], [.31, .76], [.47, .58]]));
        add(`${side} rhomboid`, "torso shirt core", "back", "rhomboids", "back", reflect([[.46, .75], [.32, .82], [.22, .71], [.40, .55], [.47, .59]]));
        add(`${side} spinal erector`, "torso shirt core", "back", "lowerBack", "back", reflect([[.41, .52], [.47, .52], [.47, .11], [.35, .12], [.38, .30]]));
        add(`${side} oblique`, "torso shirt core", "core", "obliques", "front", reflect([[.12, .53], [.29, .53], [.33, .19], [.25, .10], [.15, .25]]));
        add(`${side} external cuff`, "torso shirt core", "back", "rotatorExternal", "back", reflect([[.12, .79], [.25, .80], [.30, .73], [.17, .68], [.07, .72]]));
        // Internal rotators are deep: show the shoulder region, not an invented
        // exposed internal muscle drawn on the torso's front.
        add(`${side} internal cuff region`, `${side} shoulder`, "shoulders", "rotatorInternal", "front", fit(muscleLeaf, .2, .8, .1, .7));
        for (const [surface, region] of [["front", "frontDelt"], ["outer", "lateralDelt"], ["back", "rearDelt"]] as const) {
            add(`${side} ${region}`, `${side} shoulder`, "shoulders", region, surface, fit(muscleLeaf, .14, .86, .08, .94));
        }
        add(`${side} biceps`, `${side} upper arm`, "arms", "biceps", "front", fit(muscleLeaf, .13, .87, .12, .92));
        add(`${side} triceps`, `${side} upper arm`, "arms", "triceps", "back", fit(muscleLeaf, .12, .88, .10, .94));
        add(`${side} forearm flexors`, `${side} forearm`, "arms", "forearms", "front", fit(muscleLeaf, .18, .82, .14, .94));
        add(`${side} forearm extensors`, `${side} forearm`, "arms", "forearms", "back", fit(muscleLeaf, .22, .78, .12, .92));
        // Three distinct quad silhouettes, with a medial teardrop above the knee.
        add(`${side} rectus femoris`, `${side} thigh`, "legs", "quads", "front", fit(muscleLeaf, .30, .70, .14, .95));
        add(`${side} vastus lateralis`, `${side} thigh`, "legs", "quads", "front", fit(muscleLeaf, sign < 0 ? .02 : .58, sign < 0 ? .42 : .98, .16, .91));
        add(`${side} vastus medialis`, `${side} thigh`, "legs", "quads", "front", fit(muscleLeaf, sign < 0 ? .60 : .02, sign < 0 ? .98 : .40, .04, .48));
        for (const [index, lo, hi] of [[1, .12, .46], [2, .53, .87]]) {
            add(`${side} hamstring ${index}`, `${side} thigh`, "legs", "hamstrings", "back", fit(muscleLeaf, lo, hi, .10, .94));
            add(`${side} gastrocnemius ${index}`, `${side} shin`, "legs", "calves", "back", fit(muscleLeaf, lo, hi, .33, .94));
        }
        add(`${side} tibialis`, `${side} shin`, "legs", "tibialis", "front", fit(muscleLeaf, .27, .48, .12, .88));
        add(`${side} adductor`, `${side} thigh`, "legs", "adductors", "front", fit(muscleLeaf, sign < 0 ? .67 : .06, sign < 0 ? .94 : .33, .46, .96));
        const glute: Point[] = [[.08, .63], [.20, .88], [.42, .85], [.48, .50], [.42, .21], [.20, .17], [.06, .33]];
        add(`${side} gluteus`, "hips", "legs", "glutes", "back", reflect(glute));
        add(`${side} hip abductor`, "hips", "legs", "abductors", "front", reflect([[.05, .77], [.16, .91], [.24, .78], [.21, .55], [.07, .44]]));
        add(`${side} hip rotator region`, "hips", "legs", "hipRotators", "back", reflect([[.08, .68], [.21, .77], [.33, .66], [.25, .50], [.08, .43]]));
        add(`${side} neck`, "neck", "neck", "neck", "front", reflect(fit(muscleLeaf, .04, .46, .05, .95)));
        add(`${side} neck extensors`, "neck", "neck", "neck", "back", reflect(fit(muscleLeaf, .04, .46, .05, .95)));
        for (let row = 0; row < 3; row++) {
            add(`${side} rectus ${row + 1}`, "torso shirt core", "core", "core", "front", reflect([[.35, .52 - row * .12], [.47, .53 - row * .12], [.47, .43 - row * .12], [.36, .42 - row * .12], [.33, .47 - row * .12]]));
        }
    }
    return surfaces;
}
export type AvatarMuscleOverlay = {
    mesh: Three.Mesh<Three.BufferGeometry, Three.MeshStandardMaterial>;
    definition: Muscle;
};
export function createSoundFitnessMuscleOverlays(THREE: typeof Three, parts: Map<string, Three.Mesh>): AvatarMuscleOverlay[] {
    const overlays: AvatarMuscleOverlay[] = [];
    const probeMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const ray = new THREE.Raycaster();
    const direction = new THREE.Vector3();
    for (const definition of soundFitnessMuscleSurfaces()) {
        const body = parts.get(definition.part);
        if (!body)
            continue;
        body.geometry.computeBoundingBox();
        const box = body.geometry.boundingBox!;
        const size = box.getSize(new THREE.Vector3());
        const probe = new THREE.Mesh(body.geometry, probeMaterial);
        probe.updateMatrixWorld(true);
        const outer = definition.surface === "outer";
        const back = definition.surface === "back";
        const sign = outer ? (definition.part.startsWith("left") ? -1 : 1) : back ? -1 : 1;
        const axis = outer ? "x" : "z";
        const across = outer ? "z" : "x";
        const profile = (body.geometry as Three.LatheGeometry).parameters?.points;
        const depthRatio = body.geometry.userData.soundAvatarDepthRatio ?? size.z / size.x;
        const sampleSurface = (origin: Three.Vector3): {point: Three.Vector3} | undefined => {
            // A lathe's cross-section has an exact elliptical surface. This
            // avoids thousands of triangle ray tests on each profile switch.
            if (profile) {
                let radius: number | undefined;
                for (let i = 1; i < profile.length; i++) {
                    const low = profile[i-1], high = profile[i];
                    if (high.y <= low.y || origin.y < low.y || origin.y > high.y) continue;
                    radius = low.x + (high.x-low.x)*(origin.y-low.y)/(high.y-low.y);
                    break;
                }
                if (radius === undefined) return undefined;
                const transverse = outer ? origin.z / depthRatio : origin.x;
                const square = radius*radius-transverse*transverse;
                if (square < 0) return undefined;
                const point = origin.clone();
                point[axis] = sign*Math.sqrt(square)*(outer ? 1 : depthRatio);
                if (!outer && sign > 0 && body.geometry.userData.soundAvatarBust) {
                    point.z += .045*Math.exp(-((Math.abs(point.x)-.17)**2)/(2*.085**2))*Math.exp(-((point.y-2.53)**2)/(2*.12**2));
                }
                return {point};
            }
            ray.set(origin,direction);
            return ray.intersectObject(probe,false)[0];
        };
        direction.set(0, 0, 0);
        direction[axis] = -sign;
        const points = definition.outline.map(([x, y]) => new THREE.Vector3(x, y, 0));
        const curve = new THREE.CatmullRomCurve3(points, true, "centripetal");
        const boundary = curve.getPoints(48).slice(0, -1);
        const centre = boundary.reduce((sum, p) => sum.add(p), new THREE.Vector3()).multiplyScalar(1 / boundary.length);
        const vertices: number[] = [], indices: number[] = [], colors: number[] = [];
        let missingSurface = false;
        // Concentric rings preserve curved boundaries and follow the surface,
        // unlike a flat polygon stretched across a rounded chest or thigh.
        for (let ring = 0; ring <= 7; ring++) {
            for (const edge of boundary) {
                const p = centre.clone().lerp(edge, ring / 7);
                const origin = new THREE.Vector3();
                origin[across] = box.min[across] + p.x * size[across];
                origin.y = box.min.y + p.y * size.y;
                origin[axis] = sign > 0 ? box.max[axis] + 1 : box.min[axis] - 1;
                let hit = sampleSurface(origin);
                // A silhouette may approach a tapered limb edge. Pull its transverse
                // coordinate toward the centre until it intersects the actual limb.
                for (let attempt = 0; !hit && attempt < 8; attempt++) {
                    origin[across] += ((box.min[across] + box.max[across]) / 2 - origin[across]) * .24;
                    hit = sampleSurface(origin);
                }
                if (!hit) {
                    missingSurface = true;
                    break;
                }
                const surface = hit.point.clone();
                surface[axis] += sign * .004;
                vertices.push(surface.x, surface.y, surface.z);
                const shade = 1 - .24 * (ring / 7) ** 2;
                colors.push(shade, shade, shade);
            }
        }
        if (missingSurface)
            continue;
        const count = boundary.length;
        for (let ring = 0; ring < 7; ring++)
            for (let i = 0; i < count; i++) {
                const a = ring * count + i, b = ring * count + (i + 1) % count, c = (ring + 1) * count + i, d = (ring + 1) * count + (i + 1) % count;
                indices.push(a, c, b, b, c, d);
            }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        const material = new THREE.MeshStandardMaterial({ color: 0x192d40, vertexColors: true, roughness: .65, metalness: .08, side: THREE.DoubleSide, transparent: true, opacity: .34, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = definition.name + " anatomy surface";
        mesh.renderOrder = 2;
        // Regional subsets overlap the full pectoral/hip surface: keep them
        // hidden until selected so neutral anatomy never stacks duplicate fills.
        mesh.visible = !["upperChest", "midChest", "lowerChest", "rotatorInternal", "rotatorExternal", "hipRotators"].includes(definition.region);
        mesh.userData.neutralVisible = mesh.visible;
        body.add(mesh);
        overlays.push({ mesh, definition });
    }
    probeMaterial.dispose();
    return overlays;
}
export function isAvatarMuscleSelected(definition: Muscle, group: SoundFitnessAvatarBodyPart, focus: SoundFitnessAvatarGlowRegion | null): boolean {
    if (focus === "core")
        return definition.region === "core";
    if (focus && !["arms", "back", "chest", "core", "legs", "neck", "shoulders"].includes(focus))
        return definition.region === focus;
    return definition.group === (focus ?? group) && !["upperChest", "midChest", "lowerChest", "rotatorInternal", "rotatorExternal", "hipRotators"].includes(definition.region);
}

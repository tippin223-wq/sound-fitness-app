import type * as Three from "three";

type GarmentPart = { mesh: Three.Mesh; profile: Array<[number, number]>; depth: number };
/** Smooth union of fitted cloth volumes, bound to the existing articulated parts. */
export function createSoundFitnessGarment(
  THREE: typeof Three,
  root: Three.Object3D,
  sources: GarmentPart[],
  material: Three.Material,
  name: string,
  blend = .055,
) {
  root.updateMatrixWorld(true);
  const rootInverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const bindings = sources.map(source => {
    const rest = new THREE.Matrix4().multiplyMatrices(rootInverse, source.mesh.matrixWorld);
    const bone = new THREE.Bone();
    bone.matrixAutoUpdate = false;
    bone.matrix.copy(rest);
    root.add(bone);
    return { ...source, rest, inverse: rest.clone().invert(), bone };
  });
  const point = new THREE.Vector3();
  const sample = new THREE.Vector3();
  const distances = (x: number, y: number, z: number) => bindings.map(binding => {
    sample.set(x, y, z).applyMatrix4(binding.inverse);
    const profile = binding.profile;
    let radius = 0;
    for (let i = 1; i < profile.length; i++) {
      const [r0, y0] = profile[i - 1], [r1, y1] = profile[i];
      if (sample.y >= y0 && sample.y <= y1) {
        radius = y1 === y0 ? Math.max(r0, r1) : r0 + (r1 - r0) * (sample.y - y0) / (y1 - y0);
        break;
      }
    }
    let front = sample.z;
    if (binding.mesh.geometry.userData.soundAvatarBust && front > 0) {
      front -= .045 * Math.exp(-((Math.abs(sample.x) - .17) ** 2) / (2 * .085 ** 2)) * Math.exp(-((sample.y - 2.53) ** 2) / (2 * .12 ** 2));
    }
    return Math.max(
      (Math.hypot(sample.x, front / binding.depth) - radius) * Math.min(1, binding.depth),
      profile[0][1] - sample.y,
      sample.y - profile[profile.length - 1][1],
    );
  });
  const field = (x: number, y: number, z: number) => distances(x, y, z).reduce((a, b) => {
    const h = Math.max(0, blend - Math.abs(a - b)) / blend;
    return Math.min(a, b) - h * h * blend * .25;
  });
  const bounds = new THREE.Box3();
  for (const binding of bindings) {
    binding.mesh.geometry.computeBoundingBox();
    bounds.union(binding.mesh.geometry.boundingBox!.clone().applyMatrix4(binding.rest));
  }
  bounds.expandByScalar(.075);
  const step = .035;
  const size = bounds.getSize(new THREE.Vector3());
  const nx = Math.ceil(size.x / step), ny = Math.ceil(size.y / step), nz = Math.ceil(size.z / step);
  const index = (x: number, y: number, z: number) => (x * (ny + 1) + y) * (nz + 1) + z;
  const values = new Float32Array((nx + 1) * (ny + 1) * (nz + 1));
  for (let x = 0; x <= nx; x++) for (let y = 0; y <= ny; y++) for (let z = 0; z <= nz; z++) {
    values[index(x, y, z)] = field(bounds.min.x + x * step, bounds.min.y + y * step, bounds.min.z + z * step);
  }
  const positions: number[] = [], triangles: number[] = [], skinIndices: number[] = [], skinWeights: number[] = [];
  const vertices = new Map<string, number>();
  const vertex = (p: number[]) => {
    const key = p.map(v => Math.round(v * 1e6)).join(",");
    const existing = vertices.get(key);
    if (existing !== undefined) return existing;
    const id = positions.length / 3;
    vertices.set(key, id); positions.push(...p);
    const nearest = distances(p[0], p[1], p[2]).map((d, i) => ({ i, d })).sort((a, b) => a.d - b.d).slice(0, 4);
    const weights = nearest.map(item => Math.exp(-(item.d - nearest[0].d) / .045));
    const total = weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < 4; i++) { skinIndices.push(nearest[i]?.i ?? 0); skinWeights.push((weights[i] ?? 0) / total); }
    return id;
  };
  const corners = [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
  const tetrahedra = [[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6],[0,5,1,6]];
  const triangle = (a: number[], b: number[], c: number[]) => {
    const ab = new THREE.Vector3(b[0]-a[0], b[1]-a[1], b[2]-a[2]);
    const ac = new THREE.Vector3(c[0]-a[0], c[1]-a[1], c[2]-a[2]);
    const normal = ab.cross(ac).normalize();
    const center = a.map((v, i) => (v + b[i] + c[i]) / 3);
    const outward = field(center[0]+normal.x*.003, center[1]+normal.y*.003, center[2]+normal.z*.003) >= field(...center as [number, number, number]);
    triangles.push(vertex(a), vertex(outward ? b : c), vertex(outward ? c : b));
  };
  for (let x=0;x<nx;x++) for(let y=0;y<ny;y++) for(let z=0;z<nz;z++) {
    const samples = corners.map(([dx,dy,dz]) => ({ p: [bounds.min.x+(x+dx)*step,bounds.min.y+(y+dy)*step,bounds.min.z+(z+dz)*step], d: values[index(x+dx,y+dy,z+dz)] }));
    if (samples.every(p=>p.d>=0) || samples.every(p=>p.d<0)) continue;
    for (const tet of tetrahedra) {
      const inside=tet.filter(i=>samples[i].d<0), outside=tet.filter(i=>samples[i].d>=0);
      if (!inside.length || !outside.length) continue;
      const edge=(a:number,b:number) => { const t=samples[a].d/(samples[a].d-samples[b].d); return samples[a].p.map((v,i)=>v+(samples[b].p[i]-v)*t); };
      if (inside.length===1) triangle(...outside.map(b=>edge(inside[0],b)) as [number[],number[],number[]]);
      else if (inside.length===3) triangle(...inside.map(a=>edge(a,outside[0])) as [number[],number[],number[]]);
      else {
        const a=edge(inside[0],outside[0]),b=edge(inside[0],outside[1]),c=edge(inside[1],outside[0]),d=edge(inside[1],outside[1]);
        triangle(a,b,c); triangle(b,d,c);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices,4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights,4));
  geometry.setIndex(triangles); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  const mesh = new THREE.SkinnedMesh(geometry,material);
  mesh.name = name;
  mesh.frustumCulled = false;
  root.add(mesh); root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bindings.map(binding=>binding.bone));
  mesh.bind(skeleton);
  const update = () => {
    root.updateMatrixWorld(true);
    rootInverse.copy(root.matrixWorld).invert();
    for (const binding of bindings) {
      binding.bone.matrix.multiplyMatrices(rootInverse,binding.mesh.matrixWorld);
      binding.bone.updateMatrixWorld(true);
    }
  };
  const dispose = () => { mesh.removeFromParent(); geometry.dispose(); skeleton.dispose(); bindings.forEach(binding=>binding.bone.removeFromParent()); };
  const bindOverlay = (overlay: Three.Mesh<Three.BufferGeometry, Three.MeshStandardMaterial>) => {
    overlay.updateWorldMatrix(true, false);
    const transform = new THREE.Matrix4().multiplyMatrices(rootInverse, overlay.matrixWorld);
    const surface = overlay.geometry.clone();
    const position = surface.getAttribute("position");
    const indices: number[] = [], weights: number[] = [];
    const normal = new THREE.Vector3();
    for (let i=0;i<position.count;i++) {
      point.fromBufferAttribute(position,i).applyMatrix4(transform);
      // Lift the selection onto the union surface, including the sewn joins.
      for(let attempt=0;attempt<10;attempt++) {
        const distance=field(point.x,point.y,point.z);
        if(distance>=.006) break;
        const x=point.x,y=point.y,z=point.z,e=.001;
        normal.set(field(x+e,y,z)-field(x-e,y,z),field(x,y+e,z)-field(x,y-e,z),field(x,y,z+e)-field(x,y,z-e)).normalize();
        point.set(x,y,z).addScaledVector(normal,.006-distance);
      }
      const px=point.x,py=point.y,pz=point.z;
      position.setXYZ(i,px,py,pz);
      const nearest=distances(px,py,pz).map((d,j)=>({j,d})).sort((a,b)=>a.d-b.d).slice(0,4);
      const values=nearest.map(item=>Math.exp(-(item.d-nearest[0].d)/.045)),total=values.reduce((a,b)=>a+b,0);
      for(let j=0;j<4;j++){indices.push(nearest[j]?.j??0);weights.push((values[j]??0)/total);}
    }
    surface.setAttribute("skinIndex",new THREE.Uint16BufferAttribute(indices,4));
    surface.setAttribute("skinWeight",new THREE.Float32BufferAttribute(weights,4));
    surface.computeVertexNormals(); surface.computeBoundingSphere();
    const selection=new THREE.SkinnedMesh(surface,overlay.material);
    selection.name=overlay.name;selection.userData={...overlay.userData};selection.visible=overlay.visible;selection.renderOrder=overlay.renderOrder;selection.frustumCulled=false;
    root.add(selection);root.updateMatrixWorld(true);selection.bind(skeleton,mesh.bindMatrix);
    overlay.removeFromParent();overlay.geometry.dispose();
    return selection;
  };
  return { mesh, update, dispose, bindOverlay };
}

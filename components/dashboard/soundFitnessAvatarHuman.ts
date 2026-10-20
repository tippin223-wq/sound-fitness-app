import type * as Three from "three";
import type { SoundFitnessAvatarBodyPart } from "./soundFitnessAvatarAppearance";

export function authoredHumanRegion(name: string, point: {x:number;y:number;z:number}): SoundFitnessAvatarBodyPart | null {
  if (name.includes("pants")) return point.y>1.75 && point.z>=0 ? "core" : "legs";
  if (name.includes("skin")) return point.y>2.83 ? "neck" : "arms";
  if (Math.abs(point.x)>.37 && point.y>2.48) return "shoulders";
  if (Math.abs(point.x)>.41) return "arms";
  if (point.z<0) return "back";
  return point.y>=2.30 ? "chest" : "core";
}

/** Bind authored CC0 human/clothing topology to the dashboard's existing joint controls. */
export function createSoundFitnessHuman(
  THREE: typeof Three,
  root: Three.Object3D,
  sources: Three.Mesh<Three.BufferGeometry, Three.MeshStandardMaterial>[],
  parts: Map<string, Three.Mesh>,
  restMatrices: Map<string, Three.Matrix4>,
) {
  root.updateMatrixWorld(true);
  const inverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const names = sources[0].userData.bindings as string[];
  const bones = names.map(name => {
    const bone = new THREE.Bone();
    bone.name = `human ${name}`;
    bone.matrixAutoUpdate = false;
    bone.matrix.copy(restMatrices.get(name)!);
    root.add(bone);
    return bone;
  });
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  const skinMaterial = sources.find(mesh => mesh.name.includes("skin"))!.material;
  const meshes = sources.map(source => {
    const mesh = new THREE.SkinnedMesh(source.geometry, source === sources.find(mesh => mesh.name.includes("skin")) ? source.material.clone() : source.material);
    mesh.name = source.name;
    mesh.material.onBeforeCompile=source.material.onBeforeCompile;
    mesh.material.customProgramCacheKey=source.material.customProgramCacheKey;
    mesh.userData = { ...source.userData };
    mesh.frustumCulled = false;
    root.add(mesh);
    root.updateMatrixWorld(true);
    mesh.bind(skeleton);
    source.removeFromParent();
    return mesh;
  });
  let female = false;
  const targets = new Map<number, {geometry: Three.BufferGeometry; bands: Map<number, Three.Mesh>}>();
  const clearTargets = () => {
    for (const {geometry,bands} of targets.values()) {geometry.dispose();for(const mesh of bands.values())mesh.geometry.dispose();}
    targets.clear();
  };
  const update = () => {
    root.updateMatrixWorld(true);
    inverse.copy(root.matrixWorld).invert();
    names.forEach((name, i) => {
      bones[i].matrix.multiplyMatrices(inverse, parts.get(name)!.matrixWorld);
      bones[i].updateMatrixWorld(true);
    });
  };
  const setBody = (value: boolean) => {
    if (female !== value) clearTargets();
    female = value;
    for (const mesh of meshes) if (mesh.morphTargetInfluences) mesh.morphTargetInfluences[0] = value ? 1 : 0;
  };
  const setGloves = (enabled: boolean, color: Three.Color) => {
    const skin = meshes.find(mesh => mesh.name.includes("skin"))!;
    skin.material.color.copy(skinMaterial.color);
    skin.material.vertexColors = true;
    const indices=skin.geometry.getAttribute("skinIndex"), weights=skin.geometry.getAttribute("skinWeight");
    const colors:number[]=[];
    const ratio=color.clone().setRGB(color.r/Math.max(.001,skinMaterial.color.r),color.g/Math.max(.001,skinMaterial.color.g),color.b/Math.max(.001,skinMaterial.color.b));
    for(let i=0;i<indices.count;i++) {
      let hand=0;for(let j=0;j<4;j++)if(indices.getComponent(i,j)===4||indices.getComponent(i,j)===7)hand+=weights.getComponent(i,j);
      const blend=enabled?THREE.MathUtils.smoothstep(hand,.25,.8):0;
      colors.push(1+(ratio.r-1)*blend,1+(ratio.g-1)*blend,1+(ratio.b-1)*blend);
    }
    skin.geometry.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
    skin.material.needsUpdate = true;
  };
  let print: Three.SkinnedMesh<Three.BufferGeometry,Three.MeshStandardMaterial> | null = null;
  const bindOverlay = (overlay: Three.Mesh<Three.BufferGeometry, Three.MeshStandardMaterial>, surfaceIndex: number) => {
    // Fit selections to the actual garment, then copy its skin weights. This
    // keeps the selected muscle on the fabric through arm and leg movement.
    const source = meshes[surfaceIndex];
    let cached = targets.get(surfaceIndex);
    if (!cached) {
    const targetGeometry = source.geometry.clone();
    const position = targetGeometry.getAttribute("position");
    const morph = targetGeometry.morphAttributes.position?.[0];
    if (female && morph) {
      for (let i=0;i<position.count;i++) {
        const base = new THREE.Vector3().fromBufferAttribute(position,i);
        const delta = new THREE.Vector3().fromBufferAttribute(morph,i);
        position.setXYZ(i, ...(targetGeometry.morphTargetsRelative ? base.add(delta) : delta).toArray() as [number,number,number]);
      }
    }
    targetGeometry.computeBoundingSphere();
    targetGeometry.computeVertexNormals();
    // Index triangles into horizontal bands once per profile. A selection
    // only tests triangles at its height instead of scanning the whole body.
    const slices = new Map<number,number[]>();
    const index = targetGeometry.index!;
    for(let i=0;i<index.count;i+=3) {
      const triangle=[index.getX(i),index.getX(i+1),index.getX(i+2)];
      const ys=triangle.map(id=>position.getY(id));
      for(let band=Math.floor(Math.min(...ys)*20);band<=Math.floor(Math.max(...ys)*20);band++) {
        if(!slices.has(band))slices.set(band,[]);
        slices.get(band)!.push(...triangle);
      }
    }
    const bands = new Map<number,Three.Mesh>();
    for(const [key,indices] of slices) {
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute("position",position);geometry.setIndex(indices);
      geometry.computeBoundingSphere();
      const target=new THREE.Mesh(geometry,source.material);target.updateMatrixWorld(true);bands.set(key,target);
    }
    cached={geometry:targetGeometry,bands};targets.set(surfaceIndex,cached);
    }
    const position = cached.geometry.getAttribute("position");
    overlay.updateWorldMatrix(true,false);
    const parentName = overlay.parent!.name.toLowerCase().replaceAll("_"," ");
    overlay.updateMatrix();
    const transform = new THREE.Matrix4().multiplyMatrices(restMatrices.get(parentName)!,overlay.matrix);
    const geometry = overlay.geometry.clone();
    geometry.applyMatrix4(transform);
    const points = geometry.getAttribute("position");
    const joints: number[] = [], weights: number[] = [];
    const ray = new THREE.Raycaster();
    const p = new THREE.Vector3(), bary = new THREE.Vector3();
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const sourceIndices = source.geometry.getAttribute("skinIndex"), sourceWeights = source.geometry.getAttribute("skinWeight");
    let fitted = 0;
    for (let i=0;i<points.count;i++) {
      p.fromBufferAttribute(points,i);
      const band = Math.floor(p.y*20);
      const target = cached.bands.get(band) ?? cached.bands.get([...cached.bands.keys()].sort((a,b)=>Math.abs(a-band)-Math.abs(b-band))[0]);
      const sign = p.z >= 0 ? 1 : -1;
      ray.set(new THREE.Vector3(p.x,p.y,sign*3),new THREE.Vector3(0,0,-sign));
      let hit: {point: Three.Vector3; face?: {a:number;b:number;c:number;normal:Three.Vector3} | null} | undefined = target ? ray.intersectObject(target,false)[0] : undefined;
      if (!hit && target) {
        const side = p.x < 0 ? -1 : 1;
        ray.set(new THREE.Vector3(side*3,p.y,p.z),new THREE.Vector3(-side,0,0));
        hit = ray.intersectObject(target,false)[0];
      }
      if (!hit && target) {
        const indices=target.geometry.index!;
        const triangle=new THREE.Triangle(),closest=new THREE.Vector3();
        let distance=Infinity;
        for(let j=0;j<indices.count;j+=3) {
          const ia=indices.getX(j),ib=indices.getX(j+1),ic=indices.getX(j+2);
          triangle.a.fromBufferAttribute(position,ia);triangle.b.fromBufferAttribute(position,ib);triangle.c.fromBufferAttribute(position,ic);
          triangle.closestPointToPoint(p,closest);
          const candidate=closest.distanceToSquared(p);
          if(candidate<distance){distance=candidate;hit={point:closest.clone(),face:{a:ia,b:ib,c:ic,normal:triangle.getNormal(new THREE.Vector3())}};}
        }
      }
      if (hit?.face) {
        const face=hit.face;
        a.fromBufferAttribute(position,face.a);b.fromBufferAttribute(position,face.b);c.fromBufferAttribute(position,face.c);
        THREE.Triangle.getBarycoord(hit.point,a,b,c,bary);
        p.copy(hit.point).addScaledVector(face.normal,.008);
        const influence = new Map<number,number>();
        [face.a,face.b,face.c].forEach((vertex,j) => {
          const contribution = bary.getComponent(j);
          for(let k=0;k<4;k++) {
            const index=sourceIndices.getComponent(vertex,k);
            influence.set(index,(influence.get(index)??0)+sourceWeights.getComponent(vertex,k)*contribution);
          }
        });
        const sorted=[...influence].sort((x,y)=>y[1]-x[1]).slice(0,4),total=sorted.reduce((sum,[,w])=>sum+w,0);
        for(let k=0;k<4;k++){joints.push(sorted[k]?.[0]??0);weights.push((sorted[k]?.[1]??0)/total);}
        fitted++;
      } else {
        joints.push(0,0,0,0);weights.push(1,0,0,0);
      }
      points.setXYZ(i,p.x,p.y,p.z);
    }
    geometry.setAttribute("skinIndex",new THREE.Uint16BufferAttribute(joints,4));
    geometry.setAttribute("skinWeight",new THREE.Float32BufferAttribute(weights,4));
    geometry.computeVertexNormals();geometry.computeBoundingSphere();
    const selection=new THREE.SkinnedMesh(geometry,overlay.material);
    selection.name=overlay.name;
    selection.userData={...overlay.userData,neutralVisible:false,fittedVertices:fitted};
    selection.visible=false;selection.frustumCulled=false;
    root.add(selection);root.updateMatrixWorld(true);selection.bind(skeleton,meshes[0].bindMatrix);
    overlay.removeFromParent();overlay.geometry.dispose();
    return selection;
  };
  const setShirtPrint = (texture: Three.Texture, columns = 28) => {
    if(print){print.removeFromParent();print.geometry.dispose();print.material.dispose();}
    const material=new THREE.MeshStandardMaterial({map:texture,color:0xffffff,transparent:true,alphaTest:.02,roughness:.91,metalness:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
    const geometry=new THREE.PlaneGeometry(.63,.20,columns,Math.round(columns*12/28));
    geometry.translate(0,2.49,.45).applyMatrix4(restMatrices.get("torso shirt core")!.clone().invert());
    const patch=new THREE.Mesh(geometry,material);
    patch.name="Sound Fitness training shirt print";
    parts.get("torso shirt core")!.add(patch);
    print=bindOverlay(patch,meshes.findIndex(mesh=>mesh.name.includes("shirt")));
    print.visible=true;print.renderOrder=3;
  };
  return {meshes,update,setBody,setGloves,setShirtPrint,bindOverlay,dispose:()=>{
    if(print){print.removeFromParent();print.geometry.dispose();print.material.dispose();}
    clearTargets();meshes.find(mesh=>mesh.name.includes("skin"))!.material.dispose();
    for(const mesh of meshes){mesh.removeFromParent();mesh.geometry.dispose();}
    skeleton.dispose();bones.forEach(bone=>bone.removeFromParent());
  }};
}

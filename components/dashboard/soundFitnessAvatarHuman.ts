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
  // The authored hand has no finger bones. Add a reversible fist morph in
  // each hand's bind frame, leaving the wrist/palm seam anchored.
  const ownedGeometry = (source: Three.Mesh<Three.BufferGeometry, Three.MeshStandardMaterial>) => {
    const geometry = source.geometry.clone();
    const position = geometry.getAttribute("position");
    const indices = geometry.getAttribute("skinIndex"), weights = geometry.getAttribute("skinWeight");
    if (!indices || !weights) return geometry;
    const torsoIndex = names.indexOf("torso shirt core");
    // Keep the spine and scapular fabric attached to the rib cage as arms
    // rise. Shoulder weighting ramps up only toward the outer shoulder.
    if (source.name.includes("shirt") || source.name.includes("skin")) {
      for (let i = 0; i < position.count; i++) {
        const x = Math.abs(position.getX(i)), y = position.getY(i), z = position.getZ(i);
        if (z >= -.015 || y < 2.12 || y > 2.66 || x > .45) continue;
        const retain = THREE.MathUtils.smoothstep(x, .20, .46);
        let torsoSlot = -1;
        for (let j = 0; j < 4; j++) if (indices.getComponent(i,j) === torsoIndex) torsoSlot = j;
        if (torsoSlot < 0) continue;
        let returned = 0;
        for (let j = 0; j < 4; j++) {
          const binding = names[indices.getComponent(i,j)];
          if (binding !== "left upper arm" && binding !== "right upper arm") continue;
          const old = weights.getComponent(i,j), next = old * retain;
          weights.setComponent(i,j,next); returned += old - next;
        }
        weights.setComponent(i,torsoSlot,weights.getComponent(i,torsoSlot)+returned);
      }
    }
    if (!source.name.includes("skin")) return geometry;
    const deltas = new Float32Array(position.count * 3);
    const vertex = new THREE.Vector3(), local = new THREE.Vector3(), curled = new THREE.Vector3();
    for (const side of ["left", "right"]) {
      const handIndex = names.indexOf(side + " hand"), rest = restMatrices.get(side + " hand")!;
      const inverseHand = rest.clone().invert(), bounds = new THREE.Box3();
      for (let i=0;i<position.count;i++) {
        let weight=0; for(let j=0;j<4;j++) if(indices.getComponent(i,j)===handIndex)weight+=weights.getComponent(i,j);
        if(weight < .8)continue;
        bounds.expandByPoint(vertex.fromBufferAttribute(position,i).applyMatrix4(inverseHand));
      }
      if(bounds.isEmpty())continue;
      const length=bounds.max.y-bounds.min.y, hinge=bounds.max.y-length*.43, radius=length*.16;
      const centerX=(bounds.min.x+bounds.max.x)/2;
      for(let i=0;i<position.count;i++) {
        let weight=0;for(let j=0;j<4;j++)if(indices.getComponent(i,j)===handIndex)weight+=weights.getComponent(i,j);
        if(weight < .1)continue;
        vertex.fromBufferAttribute(position,i);local.copy(vertex).applyMatrix4(inverseHand);
        const t=THREE.MathUtils.clamp((hinge-local.y)/(length*.55),0,1);
        if(t===0)continue;
        const angle=t*Math.PI*1.45;
        curled.copy(local);curled.y=hinge-Math.sin(angle)*radius;
        curled.z=local.z+radius*(1-Math.cos(angle));
        curled.x=centerX+(local.x-centerX)*(1-.25*t);
        curled.applyMatrix4(rest).sub(vertex).multiplyScalar(THREE.MathUtils.smoothstep(weight,.1,.85));
        deltas[i*3]=curled.x;deltas[i*3+1]=curled.y;deltas[i*3+2]=curled.z;
      }
    }
    const targets=geometry.morphAttributes.position || [];
    const fistIndex=targets.length;
    const fist=new THREE.Float32BufferAttribute(deltas,3);
    if(!geometry.morphTargetsRelative)for(let i=0;i<position.count;i++)fist.setXYZ(i,position.getX(i)+deltas[i*3],position.getY(i)+deltas[i*3+1],position.getZ(i)+deltas[i*3+2]);
    geometry.morphAttributes.position=[...targets,fist];
    // Match the position morph count when the source also supplies normals.
    if(geometry.morphAttributes.normal)geometry.morphAttributes.normal.push(geometry.morphTargetsRelative ? new THREE.Float32BufferAttribute(new Float32Array(position.count*3),3) : geometry.getAttribute("normal").clone());
    geometry.userData.fistIndex=fistIndex;
    return geometry;
  };
  const meshes = sources.map(source => {
    const mesh = new THREE.SkinnedMesh(ownedGeometry(source), source === sources.find(mesh => mesh.name.includes("skin")) ? source.material.clone() : source.material);
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
  const setFist = (amount: number) => {
    const skin=meshes.find(mesh=>mesh.name.includes("skin"))!;
    const index=skin.geometry.userData.fistIndex as number;
    if(skin.morphTargetInfluences && Number.isInteger(index))skin.morphTargetInfluences[index]=THREE.MathUtils.clamp(amount,0,1);
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
  const printedShirt=meshes.find(mesh=>mesh.name.includes("shirt"))!;
  const shirtMaterial=printedShirt.material;
  const previousCompile=shirtMaterial.onBeforeCompile;
  const previousCacheKey=shirtMaterial.customProgramCacheKey;
  const artwork={texture:{value:null as Three.Texture|null},size:{value:new THREE.Vector2(.50,.17)},front:{value:new THREE.Vector2(0,2.49)},back:{value:new THREE.Vector4(0,2.44,.53,.53)},atlas:{value:0},backEnabled:{value:0}};
  shirtMaterial.userData.shirtArtwork=artwork;
  shirtMaterial.onBeforeCompile=(shader,renderer)=>{
    previousCompile.call(shirtMaterial,shader,renderer);
    shader.uniforms.soundShirtArtwork=artwork.texture;
    shader.uniforms.soundShirtArtworkSize=artwork.size;
    shader.uniforms.soundShirtFront=artwork.front;
    shader.uniforms.soundShirtBack=artwork.back;
    shader.uniforms.soundShirtAtlas=artwork.atlas;
    shader.uniforms.soundShirtBackEnabled=artwork.backEnabled;
    shader.vertexShader="varying vec3 vSoundShirtArtworkPosition; varying float vSoundShirtArtworkFacing;\n"+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace("#include <skinning_vertex>","vSoundShirtArtworkPosition=transformed; vSoundShirtArtworkFacing=normal.z;\n#include <skinning_vertex>");
    shader.fragmentShader="uniform sampler2D soundShirtArtwork; uniform vec2 soundShirtArtworkSize; uniform vec2 soundShirtFront; uniform vec4 soundShirtBack; uniform float soundShirtAtlas; uniform float soundShirtBackEnabled; varying vec3 vSoundShirtArtworkPosition; varying float vSoundShirtArtworkFacing;\n"+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace("#include <color_fragment>",`#include <color_fragment>
      vec2 artworkUv=(vSoundShirtArtworkPosition.xy-soundShirtFront)/soundShirtArtworkSize+0.5;
      if(vSoundShirtArtworkPosition.z>0.0 && vSoundShirtArtworkFacing>0.45 && all(greaterThanEqual(artworkUv,vec2(0.0))) && all(lessThanEqual(artworkUv,vec2(1.0)))) {
        vec4 artworkSample=texture2D(soundShirtArtwork,vec2(artworkUv.x*mix(1.0,0.5,soundShirtAtlas),artworkUv.y));
        diffuseColor.rgb=mix(diffuseColor.rgb,artworkSample.rgb,artworkSample.a);
      }
      vec2 backUv=(vec2(-vSoundShirtArtworkPosition.x,vSoundShirtArtworkPosition.y)-soundShirtBack.xy)/soundShirtBack.zw+0.5;
      if(soundShirtBackEnabled>0.5 && vSoundShirtArtworkFacing< -0.45 && all(greaterThanEqual(backUv,vec2(0.0))) && all(lessThanEqual(backUv,vec2(1.0)))) {
        vec4 backSample=texture2D(soundShirtArtwork,vec2(0.5+backUv.x*0.5,backUv.y));
        diffuseColor.rgb=mix(diffuseColor.rgb,backSample.rgb,backSample.a);
      }
    `);
  };
  shirtMaterial.customProgramCacheKey=()=>previousCacheKey.call(shirtMaterial)+":fabric-artwork-v3";
  shirtMaterial.needsUpdate=true;
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
  const setShirtPrint = (texture: Three.Texture) => {
    const image=texture.image as {width?:number;height?:number}|undefined;
    const square=(image?.width ?? 0)>0 && image?.width===image?.height;
    artwork.texture.value=texture;
    artwork.size.value.set(square ? .48 : .50,square ? .48 : .17);
    const layout=texture.userData.shirtLayout as {atlas:boolean;front:number[];back:number[]|null}|undefined;
    artwork.atlas.value=layout?.atlas?1:0;
    artwork.backEnabled.value=layout?.back?1:0;
    artwork.front.value.set(layout?.front[0]??0,layout?.front[1]??2.49);
    if(layout)artwork.size.value.set(layout.front[2],layout.front[3]);
    if(layout?.back)artwork.back.value.set(...layout.back as [number,number,number,number]);
  };
  return {meshes,update,setBody,setFist,setGloves,setShirtPrint,bindOverlay,dispose:()=>{
    shirtMaterial.onBeforeCompile=previousCompile;
    shirtMaterial.customProgramCacheKey=previousCacheKey;
    delete shirtMaterial.userData.shirtArtwork;
    shirtMaterial.needsUpdate=true;
    clearTargets();meshes.find(mesh=>mesh.name.includes("skin"))!.material.dispose();
    for(const mesh of meshes){mesh.removeFromParent();mesh.geometry.dispose();}
    skeleton.dispose();bones.forEach(bone=>bone.removeFromParent());
  }};
}

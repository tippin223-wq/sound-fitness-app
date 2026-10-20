import type * as Three from "three";

export async function createAvatarShirtPrintTexture(THREE: typeof Three) {
  const [crest,wordmark]=await Promise.all([
    new THREE.ImageLoader().loadAsync("/sound-fitness-logo.png"),
    new THREE.ImageLoader().loadAsync("/models/textures/sound-shirt-wordmark.webp"),
  ]);
  const canvas=document.createElement("canvas");canvas.width=1024;canvas.height=320;
  const context=canvas.getContext("2d")!;
  // Match the existing Client Gear shirt: crest beside the two-line wordmark.
  context.drawImage(crest,8,0,320,320);
  context.drawImage(wordmark,0,0,240,88,346,44,650,238);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  return texture;
}

/** Small repeating surface maps: visible material response without large GPU textures. */
export function createAvatarSurfaceMaterials(THREE: typeof Three, materials: Map<string,Three.MeshStandardMaterial>, skinTexture: Three.Texture | null, cotton: {color: Three.Texture; normal: Three.Texture; roughness: Three.Texture}) {
  const maps: Three.Texture[] = [];
  const texture = (kind: "skin" | "fabric" | "hair") => {
    const canvas=document.createElement("canvas");canvas.width=canvas.height=128;
    const context=canvas.getContext("2d")!;
    const pixels=context.createImageData(128,128);
    for(let y=0;y<128;y++)for(let x=0;x<128;x++) {
      const noise=((Math.imul(x+17,374761393)^Math.imul(y+31,668265263))>>>0)%256;
      const level=kind==="fabric" ? 128+Math.sin(x*Math.PI/2)*15+Math.sin(y*Math.PI/2)*12+noise*.035
        : kind==="hair" ? 95+Math.sin(x*1.4+Math.sin(y*.07))*34+noise*.08 : 135+noise*.10;
      const i=(y*128+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=level;pixels.data[i+3]=255;
    }
    context.putImageData(pixels,0,0);
    const map=new THREE.CanvasTexture(canvas);map.wrapS=map.wrapT=THREE.RepeatWrapping;
    map.repeat.set(kind==="skin"?28:kind==="hair"?12:32,kind==="skin"?28:kind==="hair"?4:32);
    map.anisotropy=4;maps.push(map);return map;
  };
  const skin=materials.get("warm athletic skin")!;
  skin.metalness=0;skin.roughness=.57;skin.bumpMap=texture("skin");skin.bumpScale=.001;
  if(skinTexture) {
    skin.map=skinTexture;skinTexture.colorSpace=THREE.SRGBColorSpace;
    // Preserve Avatar Lab skin colors while borrowing the photographed fine
    // facial detail; an unadjusted diffuse map would multiply dark skin twice.
    skin.onBeforeCompile=shader=>{
      shader.fragmentShader=shader.fragmentShader.replace("#include <map_fragment>",`#ifdef USE_MAP
        vec4 skinSample=texture2D(map,vMapUv);
        vec3 skinDetail=clamp(skinSample.rgb/vec3(.095,.041,.022),vec3(.18),vec3(2.8));
        diffuseColor.rgb*=mix(vec3(1.0),skinDetail,.74);
      #endif`);
      shader.fragmentShader=shader.fragmentShader.replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
        #ifdef USE_MAP
          float skinLuminance=dot(skinSample.rgb,vec3(.2126,.7152,.0722));
          roughnessFactor=clamp(roughnessFactor+.12*(1.0-clamp(skinLuminance*5.0,0.0,1.0)),.43,.80);
        #endif`);
    };
    skin.customProgramCacheKey=()=>"sound-human-skin-detail-v2";
    maps.push(skinTexture);
  }
  for(const map of [cotton.color,cotton.normal,cotton.roughness]) {
    map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(6,6);map.anisotropy=4;maps.push(map);
  }
  cotton.color.colorSpace=THREE.SRGBColorSpace;
  for(const name of ["sound navy performance shirt","charcoal training joggers"]) {
    const material=materials.get(name)!;
    material.metalness=0;material.roughness=.92;material.map=cotton.color;material.normalMap=cotton.normal;material.normalScale.set(.32,.32);material.roughnessMap=cotton.roughness;material.bumpMap=null;
    material.onBeforeCompile=shader=>{
      shader.fragmentShader=shader.fragmentShader.replace("#include <map_fragment>",`#ifdef USE_MAP
        vec3 cottonSample=texture2D(map,vMapUv).rgb;
        float cottonDetail=dot(cottonSample,vec3(.2126,.7152,.0722));
        diffuseColor.rgb*=clamp(.70+cottonDetail*.65,.70,1.18);
      #endif`);
    };
    material.customProgramCacheKey=()=>"sound-cotton-jersey-v1";
    material.needsUpdate=true;
  }
  const hair=materials.get("full close-cropped hair cap")!;hair.metalness=0;hair.roughness=.80;hair.bumpMap=texture("hair");hair.bumpScale=.002;hair.emissiveIntensity=0;
  hair.map=hair.bumpMap;
  hair.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace("#include <map_fragment>",`#ifdef USE_MAP
      float strand=texture2D(map,vMapUv).r;
      diffuseColor.rgb*=.62+strand*.85;
    #endif`);
  };
  hair.customProgramCacheKey=()=>"sound-short-hair-fibers-v1";
  skin.needsUpdate=true;hair.needsUpdate=true;
  return ()=>maps.forEach(map=>map.dispose());
}

import type * as Three from "three";
import type { SoundFitnessAvatarShirtPreset } from "./soundFitnessAvatarAppearance";

export async function createAvatarShirtPrintTexture(THREE: typeof Three, design: SoundFitnessAvatarShirtPreset = "sound") {
  if(design!=="sound" && design!=="storm") {
    const dual=design==="orbit"||design==="trainer"||design==="energy";
    const art=await new THREE.ImageLoader().loadAsync(`/models/textures/shirts/${design}.png`);
    const front=dual ? await new THREE.ImageLoader().loadAsync(design==="orbit"?"/sound-fitness-logo.png":design==="trainer"?"/models/textures/sound-shirt-wordmark.webp":"/models/textures/shirts/energy-front.png") : art;
    const canvas=document.createElement("canvas");canvas.width=1024;canvas.height=512;
    const context=canvas.getContext("2d")!;
    const draw=(image:HTMLImageElement,offset:number)=>{
      const ratio=image.width/image.height;
      const w=ratio>=1?512:512*ratio,h=ratio>=1?512/ratio:512;
      context.drawImage(image,offset+(512-w)/2,(512-h)/2,w,h);
    };
    draw(front,0);if(dual)draw(art,512);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
    texture.userData.shirtLayout={atlas:true,front:dual?[.18,2.59,.22,.22]:[0,2.49,.50,.50],back:dual?[0,2.44,.53,.53]:null};
    return texture;
  }
  const [crest,wordmark]=await Promise.all([
    new THREE.ImageLoader().loadAsync("/sound-fitness-logo.png"),
    new THREE.ImageLoader().loadAsync("/models/textures/sound-shirt-wordmark.webp"),
  ]);
  const canvas=document.createElement("canvas");canvas.width=design === "sound" ? 512 : 1024;canvas.height=design === "sound" ? 512 : 320;
  const context=canvas.getContext("2d")!;
  // Keep the existing crest and wordmark assets unchanged.
  if(design === "sound") context.drawImage(crest,32,32,448,448);
  else context.drawImage(wordmark,0,0,240,88,32,0,960,320);
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
        : kind==="hair" ? 125+Math.sin(x*1.4+Math.sin(y*.025)*.8)*24+Math.sin(x*3.3+y*.018)*10+noise*.025 : 135+noise*.10;
      const i=(y*128+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=level;pixels.data[i+3]=255;
    }
    context.putImageData(pixels,0,0);
    const map=new THREE.CanvasTexture(canvas);map.wrapS=map.wrapT=THREE.RepeatWrapping;
    map.repeat.set(kind==="skin"?28:kind==="hair"?3:32,kind==="skin"?28:kind==="hair"?1:32);
    map.anisotropy=4;maps.push(map);return map;
  };
  const skin=materials.get("warm athletic skin")!;
  skin.metalness=0;skin.roughness=.57;skin.bumpMap=texture("skin");skin.bumpScale=.001;
  if(skinTexture) {
    skin.map=skinTexture;skinTexture.colorSpace=THREE.SRGBColorSpace;
    // Preserve Avatar Lab skin colors while borrowing the photographed fine
    // facial detail; an unadjusted diffuse map would multiply dark skin twice.
    const detailStrength={value:.74};
    skin.userData.detailStrength=detailStrength;
    skin.onBeforeCompile=shader=>{
      shader.uniforms.soundSkinDetail=detailStrength;
      shader.fragmentShader="uniform float soundSkinDetail;\n"+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace("#include <map_fragment>",`#ifdef USE_MAP
        vec4 skinSample=texture2D(map,vMapUv);
        vec3 skinDetail=clamp(skinSample.rgb/vec3(.095,.041,.022),vec3(.18),vec3(2.8));
        diffuseColor.rgb*=mix(vec3(1.0),skinDetail,soundSkinDetail);
      #endif`);
      shader.fragmentShader=shader.fragmentShader.replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
        #ifdef USE_MAP
          float skinLuminance=dot(skinSample.rgb,vec3(.2126,.7152,.0722));
          roughnessFactor=clamp(roughnessFactor+.12*(1.0-clamp(skinLuminance*5.0,0.0,1.0)),.43,.80);
        #endif`);
    };
    skin.customProgramCacheKey=()=>"sound-human-skin-detail-v3";
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
  const hair=materials.get("full close-cropped hair cap")!;hair.metalness=0;hair.roughness=.74;hair.bumpMap=texture("hair");hair.bumpScale=.002;hair.emissiveIntensity=0;
  hair.map=hair.bumpMap;
  hair.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace("#include <map_fragment>",`#ifdef USE_MAP
      float strand=texture2D(map,vMapUv).r;
      diffuseColor.rgb*=.42+strand*1.25;
    #endif`);
  };
  hair.customProgramCacheKey=()=>"sound-short-hair-fibers-v2";
  const femaleHair=materials.get("female swept hair");
  if(femaleHair){
    femaleHair.map=hair.map;femaleHair.bumpMap=hair.bumpMap;femaleHair.bumpScale=hair.bumpScale;
    femaleHair.roughness=hair.roughness;femaleHair.metalness=0;femaleHair.emissiveIntensity=0;
    femaleHair.transparent=true;femaleHair.depthWrite=false;
    femaleHair.onBeforeCompile=(shader,renderer)=>{
      hair.onBeforeCompile(shader,renderer);
      shader.vertexShader="attribute float _haircoverage; varying float vHairCoverage;\n"+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>\nvHairCoverage=_haircoverage;");
      shader.fragmentShader="varying float vHairCoverage;\n"+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace("#include <alphatest_fragment>","diffuseColor.a*=smoothstep(0.0,1.0,vHairCoverage);\n#include <alphatest_fragment>");
    };
    femaleHair.customProgramCacheKey=()=>"sound-feathered-hairline-v1";femaleHair.needsUpdate=true;
  }

  skin.needsUpdate=true;hair.needsUpdate=true;
  return ()=>maps.forEach(map=>map.dispose());
}

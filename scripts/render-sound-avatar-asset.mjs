// Offline geometry review only; the dashboard screenshot is captured separately.
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import sharp from 'sharp';
import ts from 'typescript';
const bytes=await readFile('public/models/sound-avatar.glb');
const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
scene.updateMatrixWorld(true);
const parts=new Map(),sources=[],rest=new Map();
scene.traverse(mesh=>{
  if(!mesh.isMesh)return;
  if(mesh.userData.authoredHuman){sources.push(mesh);return;}
  const name=mesh.name.replaceAll('_',' ').toLowerCase();parts.set(name,mesh);rest.set(name,mesh.matrixWorld.clone());
});
const api={};
new Function('exports',ts.transpileModule(await readFile('components/dashboard/soundFitnessAvatarHuman.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(api);
const rig=api.createSoundFitnessHuman(THREE,scene,sources,parts,rest);
const crest=await sharp('public/sound-fitness-logo.png').resize(320,320).png().toBuffer();
const wordmark=await sharp('public/models/textures/sound-shirt-wordmark.webp').extract({left:0,top:0,width:240,height:88}).resize(650,238).png().toBuffer();
const print=await sharp({create:{width:1024,height:320,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:crest,left:8,top:0},{input:wordmark,left:346,top:44}]).png().toBuffer();
const printPixels=await sharp(print).raw().toBuffer({resolveWithObject:true});
const skinPixels=await sharp('public/models/textures/human-skin.webp').ensureAlpha().raw().toBuffer({resolveWithObject:true});
rig.setShirtPrint(new THREE.Texture(),128);rig.update();scene.updateMatrixWorld(true);rig.meshes[0].skeleton.update();
const sample=(image,u,v)=>{
  const x=Math.min(image.info.width-1,Math.max(0,Math.round(u*(image.info.width-1))));
  const y=Math.min(image.info.height-1,Math.max(0,Math.round((1-v)*(image.info.height-1))));
  const offset=(y*image.info.width+x)*4;
  return [image.data[offset],image.data[offset+1],image.data[offset+2],image.data[offset+3]].map(v=>v/255);
};
const triangles=[],light=new THREE.Vector3(-.5,.6,1).normalize();
scene.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const name=mesh.name.replaceAll('_',' ');
  if(!mesh.userData.authoredHuman&&!/head sculpt|eye white|iris|pupil|eyebrow|hair cap|shoe|training shirt print/.test(name))return;
  const position=mesh.geometry.attributes.position,index=mesh.geometry.index?.array??Array.from({length:position.count},(_,i)=>i);
  const vertices=Array.from({length:position.count},(_,i)=>mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld).applyAxisAngle(new THREE.Vector3(0,1,0),-.20));
  for(let i=0;i<index.length;i+=3) {
    const a=vertices[index[i]],b=vertices[index[i+1]],c=vertices[index[i+2]],normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    if(normal.z<0)continue;
    const shade=.40+.55*Math.max(0,normal.dot(light));
    const base=mesh.material.color.clone();
    const uv=mesh.geometry.attributes.uv;
    if(uv) {
      const u=(uv.getX(index[i])+uv.getX(index[i+1])+uv.getX(index[i+2]))/3,v=(uv.getY(index[i])+uv.getY(index[i+1])+uv.getY(index[i+2]))/3;
      if(name.includes('training shirt print')) {
        const pixel=sample(printPixels,u,v);if(pixel[3]<.2)continue;
        base.setRGB(pixel[0],pixel[1],pixel[2],THREE.SRGBColorSpace);
      } else if(name==='head sculpt'||name==='authored human skin') {
        const pixel=sample(skinPixels,u,v),color=new THREE.Color().setRGB(pixel[0],pixel[1],pixel[2],THREE.SRGBColorSpace);
        const detail=color.r*.2126+color.g*.7152+color.b*.0722;
        base.multiplyScalar(Math.max(.48,Math.min(1.12,.88+(detail-.16)*.85)));
      }
    }
    const color=base.multiplyScalar(shade).getStyle();
    const points=[a,b,c].map(p=>`${250+p.x*210},${780-p.y*210}`).join(' ');
    triangles.push({z:(a.z+b.z+c.z)/3,polygon:`<polygon points="${points}" fill="${color}" stroke="${color}" stroke-width=".35"/>`});
  }
});
triangles.sort((a,b)=>a.z-b.z);
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="500" height="820"><rect width="500" height="820" fill="#101827"/>${triangles.map(t=>t.polygon).join('')}</svg>`;
await sharp(Buffer.from(svg)).png().toFile('test-results/avatar-authored-asset-preview.png');
console.log('Rendered test-results/avatar-authored-asset-preview.png');
rig.dispose();

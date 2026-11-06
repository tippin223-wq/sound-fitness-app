// Update only the four shoe meshes in the current authored asset. Preserve
// unrelated head, clothing, skin weights, materials and appearance work.
import { readFile, writeFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { avatarShoeGeometry } from './avatar-shoe-geometry.mjs';
globalThis.FileReader ??= class FileReader {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}
  readAsDataURL(blob){blob.arrayBuffer().then(result=>{this.result=`data:${blob.type};base64,${Buffer.from(result).toString('base64')}`;this.onloadend?.();});}
};
const file=new URL('../public/models/sound-avatar.glb',import.meta.url);
const bytes=await readFile(file);
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
let changed=0;
gltf.scene.traverse(mesh=>{
  const name=mesh.name.toLowerCase().replaceAll('_',' ');
  if(!mesh.isMesh||!['left shoe','right shoe','left shoe sole glow','right shoe sole glow'].includes(name))return;
  mesh.geometry.dispose();mesh.geometry=avatarShoeGeometry(name.includes('sole'));changed++;
});
if(changed!==4)throw Error('Expected both uppers and soles; original asset was not changed');
const result=await new GLTFExporter().parseAsync(gltf.scene,{binary:true,animations:gltf.animations});
await writeFile(file,Buffer.from(result));
console.log('Refined both shoe uppers and soles; retained all other avatar meshes.');

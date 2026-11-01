const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');
function load(path){const exports={};new Function('exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(exports);return exports;}
const api=load('components/dashboard/soundFitnessAvatarAppearance.ts');
test('retired porcelain migrates to cocoa and body profiles normalize incompatible hair',()=>{
 assert.equal(api.soundFitnessAvatarSkinPalettes.porcelain,undefined);
 for(const skin of ['cocoa','umber'])assert.equal(api.sanitizeSoundFitnessAvatarAppearance({skin}).skin,skin);
 assert.equal(api.sanitizeSoundFitnessAvatarAppearance({skin:'porcelain'}).skin,'cocoa');
 assert.equal(api.sanitizeSoundFitnessAvatarAppearance({body:'female',hair:'fade'}).hair,'ponytail');
 assert.equal(api.sanitizeSoundFitnessAvatarAppearance({body:'male',hair:'ponytail'}).hair,'crop');
 for(const body of ['male','female'])for(const hair of api.soundFitnessAvatarHairByBody[body])assert.equal(api.sanitizeSoundFitnessAvatarAppearance({body,hair}).hair,hair);
});
test('each shirt produces a distinct print layout from the approved artwork',async()=>{
 const {createAvatarShirtPrintTexture}=load('components/dashboard/soundFitnessAvatarMaterials.ts');
 const previous=global.document;global.document={createElement(){const ops=[];const context=new Proxy({}, {get:(o,key)=>o[key]??((...args)=>ops.push([key,...args])),set:(o,key,value)=>(o[key]=value,true)});return {ops,getContext:()=>context};}};
 const THREE={ImageLoader:class{async loadAsync(url){return {url,width:1024,height:512};}},CanvasTexture:class{constructor(canvas){this.canvas=canvas;this.userData={};}},SRGBColorSpace:'srgb'};
 try{const prints=[];for(const id of Object.keys(api.soundFitnessAvatarShirtPalettes)){const texture=await createAvatarShirtPrintTexture(THREE,id);prints.push(JSON.stringify(texture.canvas.ops));assert.equal(texture.colorSpace,'srgb');}
 assert.equal(new Set(prints).size,Object.keys(api.soundFitnessAvatarShirtPalettes).length);
 }finally{global.document=previous;}
});

test('only approved prints remain and retired invented shirts migrate safely',()=>{
 assert.deepEqual(Object.keys(api.soundFitnessAvatarShirtPalettes),['sound','storm','swoosh','compact','service','waves','orbit','echo','waterline','mountain','trainer','energy']);
 for(const shirt of ['ocean','ember','violet','mint','gold'])assert.equal(api.sanitizeSoundFitnessAvatarAppearance({shirt}).shirt,'sound');
 assert.equal(api.sanitizeSoundFitnessAvatarAppearance({shirt:'storm'}).shirt,'storm');
});

test('style and color persist independently, with backward-compatible shirt colors',()=>{
 assert.equal(api.sanitizeSoundFitnessAvatarAppearance({shirt:'storm'}).shirtColor,'berry');
 assert.equal(api.sanitizeSoundFitnessAvatarAppearance({shirt:'sound'}).shirtColor,'navy');
 for(const shirt of Object.keys(api.soundFitnessAvatarShirtPalettes))for(const gear of ['cap','visor','headband','gloves'])for(const color of Object.keys(api.soundFitnessAvatarClothingColors)){
  const saved={...api.defaultSoundFitnessAvatarAppearance,shirt,gear,shirtColor:color,gearColor:'sand'};
  assert.deepEqual(api.sanitizeSoundFitnessAvatarAppearance(JSON.parse(JSON.stringify(saved))),saved);
 }
 const invalid=api.sanitizeSoundFitnessAvatarAppearance({shirtColor:'invalid',gearColor:'invalid'});
 assert.equal(invalid.shirtColor,'navy');assert.equal(invalid.gearColor,'onyx');
});

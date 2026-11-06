const fs = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');
const ts = require('typescript');
const load = path => {
  const api={};
  new Function('exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(api);
  return api;
};
async function fixture() {
  const THREE=await import('three');
  const {GLTFLoader}=await import('three/examples/jsm/loaders/GLTFLoader.js');
  const bytes=fs.readFileSync('public/models/sound-avatar.glb');
  const {scene:root}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const parts=new Map(),sources=[],rest=new Map();
  root.position.set(.3,-1.2,.15);root.scale.setScalar(.79);root.rotation.y=.13;root.updateMatrixWorld(true);
  const inverse=root.matrixWorld.clone().invert();
  root.traverse(mesh=>{
    if(!mesh.isMesh)return;
    if(mesh.userData.authoredHuman){sources.push(mesh);return;}
    const key=mesh.name.replaceAll('_',' ').toLowerCase();parts.set(key,mesh);rest.set(key,new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld));
  });
  const {createSoundFitnessHuman}=load('components/dashboard/soundFitnessAvatarHuman.ts');
  const rig=createSoundFitnessHuman(THREE,root,sources,parts,rest);
  return {THREE,root,parts,rig};
}

test('authored body has human hands, sewn clothing, bounded proportions and normalized skin weights',async()=>{
  const {rig,THREE}=await fixture();
  assert.equal(rig.meshes.length,3);
  for(const mesh of rig.meshes) {
    assert.equal(mesh.userData.license,'CC0-1.0');
    const p=mesh.geometry.attributes.position,weights=mesh.geometry.attributes.skinWeight,indices=mesh.geometry.attributes.skinIndex;
    assert.ok(p.count>800);
    for(let i=0;i<p.count;i++) {
      assert.ok(Math.abs(p.getX(i))<.9,'no stretched hands or disconnected A-pose fingers');
      assert.ok(Number.isFinite(p.getY(i))&&Number.isFinite(p.getZ(i)));
      let sum=0;for(let j=0;j<4;j++){const weight=weights.getComponent(i,j);assert.ok(weight>=0&&weight<=1);assert.ok(indices.getComponent(i,j)<13);sum+=weight;}
      assert.ok(Math.abs(sum-1)<1e-5);
    }
  }
  const shirt=rig.meshes.find(m=>m.name.includes('shirt')),pants=rig.meshes.find(m=>m.name.includes('pants'));
  const sb=new THREE.Box3().setFromBufferAttribute(shirt.geometry.attributes.position),pb=new THREE.Box3().setFromBufferAttribute(pants.geometry.attributes.position);
  assert.ok(sb.min.y>1.5&&sb.max.y>2.8,'shirt remains a complete garment');
  assert.ok(pb.min.y<.2&&pb.max.y>1.8,'pants retain the waistband and both full legs');
  assert.ok(sb.min.y<pb.max.y,'shirt hem overlaps the waistband');
  rig.dispose();
});

test('actual skeleton preserves rest shape under a transformed root and deforms authored elbow and wrist together',async()=>{
  const {THREE,root,parts,rig}=await fixture();
  rig.update();root.updateMatrixWorld(true);rig.meshes[0].skeleton.update();
  const skin=rig.meshes.find(m=>m.name.includes('skin')),position=skin.geometry.attributes.position;
  const point=new THREE.Vector3();
  for(let i=0;i<position.count;i+=17){skin.getVertexPosition(i,point);assert.ok(point.distanceTo(new THREE.Vector3().fromBufferAttribute(position,i))<1e-5,'rest binding does not double the root transform');}
  const elbow=new THREE.Group();elbow.position.set(-.55,2.25,0);root.add(elbow);root.updateMatrixWorld(true);
  for(const name of ['left forearm','left hand'])elbow.attach(parts.get(name));
  const before=Array.from({length:position.count},(_,i)=>skin.getVertexPosition(i,new THREE.Vector3()));
  elbow.rotation.x=-.65;rig.update();root.updateMatrixWorld(true);skin.skeleton.update();
  let changed=0,still=0;
  for(let i=0;i<position.count;i++) {
    skin.getVertexPosition(i,point);assert.ok(point.toArray().every(Number.isFinite));
    if(point.distanceTo(before[i])>.01)changed++;else still++;
  }
  assert.ok(changed>150,'forearm and individual fingers follow the elbow');
  assert.ok(still>1000,'the rest of the body stays independent');
  rig.setBody(true);assert.ok(rig.meshes.every(m=>m.morphTargetInfluences[0]===1));
  rig.setBody(false);assert.ok(rig.meshes.every(m=>m.morphTargetInfluences[0]===0));
  rig.dispose();
});

test('all muscle regions transfer to authored clothing with finite normalized deformation weights',async()=>{
  const {THREE,parts,rig,root}=await fixture();
  const anatomy=load('components/dashboard/soundFitnessAvatarAnatomy.ts').createSoundFitnessMuscleOverlays(THREE,parts);
  let fitted=0,total=0;
  for(const overlay of anatomy) {
    const name=overlay.definition.part;
    const target=rig.meshes.findIndex(m=>m.name.includes(name==='hips'||/thigh|shin/.test(name)?'pants':/upper arm|forearm|neck/.test(name)?'skin':'shirt'));
    const mesh=rig.bindOverlay(overlay.mesh,target);
    assert.equal(mesh.userData.neutralVisible,false,'no segmented idle anatomy outlines');
    const p=mesh.geometry.attributes.position,w=mesh.geometry.attributes.skinWeight;
    total+=p.count;fitted+=mesh.userData.fittedVertices;
    for(let i=0;i<p.count;i++) {
      assert.ok([p.getX(i),p.getY(i),p.getZ(i)].every(Number.isFinite));
      assert.ok(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-5);
    }
    mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();
  }
  assert.equal(anatomy.length,70);
  assert.ok(fitted/total>.95,`${fitted}/${total} selection vertices fitted to actual triangles`);
  rig.dispose();assert.ok(!root.children.some(m=>m.isSkinnedMesh),'dispose removes owned meshes');
});

test('shirt artwork is part of the fabric material and survives idle, profile and print changes',async()=>{
  const {THREE,root,rig}=await fixture();
  const texture=new THREE.Texture();rig.setShirtPrint(texture);
  const shirt=rig.meshes.find(mesh=>mesh.name.includes('shirt'));
  const artwork=shirt.material.userData.shirtArtwork;
  assert.equal(artwork.texture.value,texture);
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
  shirt.material.onBeforeCompile(shader,{});
  assert.match(shader.vertexShader,/vSoundShirtArtworkPosition=transformed/);
  assert.match(shader.fragmentShader,/diffuseColor.rgb=mix/);
  assert.equal(shader.uniforms.soundShirtArtwork,artwork.texture,'compiled shader keeps a live texture uniform');
  for(let i=0;i<3600;i++)rig.update();
  rig.setBody(true);rig.update();assert.equal(shader.uniforms.soundShirtArtwork.value,texture);
  const next=new THREE.Texture();rig.setShirtPrint(next);
  assert.equal(shader.uniforms.soundShirtArtwork.value,next,'changing shirts updates an already compiled material');
  next.userData.shirtLayout={atlas:true,front:[.18,2.59,.22,.22],back:[0,2.44,.53,.53]};
  rig.setShirtPrint(next);
  assert.equal(shader.uniforms.soundShirtBackEnabled.value,1);
  assert.deepEqual(artwork.size.value.toArray(),[.22,.22]);
  assert.match(shader.fragmentShader,/vec2\(-vSoundShirtArtworkPosition.x/,'back print reads correctly from behind');
  rig.setShirtPrint(texture);
  assert.equal(shader.uniforms.soundShirtBackEnabled.value,0,'plain front shirts clear the previous back print');
  assert.deepEqual(artwork.front.value.toArray(),[0,2.49]);
  assert.ok(!root.children.some(mesh=>mesh.name==='Sound Fitness training shirt print'),'no separate decal can hide behind the garment');
  rig.dispose();assert.equal(shirt.material.userData.shirtArtwork,undefined);texture.dispose();next.dispose();
});

test('authored scalp clears the adult head on both body profiles and the torso/legs stay covered',async()=>{
  const {THREE,parts,rig}=await fixture();
  const scalp=parts.get('continuous crown hair cap').geometry,head=parts.get('head sculpt').geometry;
  const point=(geometry,id,female)=>{
    const p=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,id);
    if(female){const m=new THREE.Vector3().fromBufferAttribute(geometry.morphAttributes.position[0],id);geometry.morphTargetsRelative?p.add(m):p.copy(m);}
    return p;
  };
  for(const female of [false,true])for(const id of new Set(scalp.index.array)) {
    assert.ok(point(scalp,id,female).distanceTo(point(head,id,female))>.008,'scalp sits outside the actual facial mesh');
  }
  const skin=rig.meshes.find(mesh=>mesh.name.includes('skin')),p=skin.geometry.attributes.position;
  for(let i=0;i<p.count;i++)assert.ok(p.getY(i)>2.70||Math.abs(p.getX(i))>.35,'covered torso and leg skin is absent');
  const before=parts.get('head sculpt').material.color.clone();
  rig.setGloves(true,new THREE.Color('#0f172a'));
  assert.ok(Math.min(...skin.geometry.attributes.color.array)<.2,'glove color reaches the authored fingers');
  assert.ok(parts.get('head sculpt').material.color.equals(before),'gloves do not recolor the face');
  rig.setGloves(false,new THREE.Color('#0f172a'));
  assert.ok([...skin.geometry.attributes.color.array].every(value=>value===1));rig.dispose();
});

test('actual authored surfaces keep body-part picking for front, back, shoulders, hands and legs',()=>{
  const {authoredHumanRegion:region}=load('components/dashboard/soundFitnessAvatarHuman.ts');
  assert.equal(region('authored performance shirt',{x:0,y:2.5,z:.2}),'chest');
  assert.equal(region('authored performance shirt',{x:0,y:2.5,z:-.2}),'back');
  assert.equal(region('authored performance shirt',{x:.45,y:2.65,z:.1}),'shoulders');
  assert.equal(region('authored human skin',{x:.6,y:1.6,z:.1}),'arms');
  assert.equal(region('authored human skin',{x:0,y:2.95,z:.1}),'neck');
  assert.equal(region('authored training pants',{x:.2,y:1.2,z:.1}),'legs');
});

test('shared renderer completes studio-environment passes while keeping a hidden canvas asleep',()=>{
  const source=fs.readFileSync('components/dashboard/dashboardWebGlRenderer.ts','utf8');
  const ast=ts.createSourceFile('renderer.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  let render;
  function visit(node){if(ts.isBinaryExpression(node)&&node.left.getText(ast)==='renderer.render')render=node.right.getText(ast);ts.forEachChild(node,visit);}
  visit(ast);assert.ok(render);
  const code=ts.transpileModule('exports.render='+render,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const renderer={getRenderTarget:()=>({})},canvas={dataset:{dashboardWebglOffscreen:'true',dashboardWebglStill:'true'}};
  let draws=0;const api={};
  new Function('exports','renderer','canvas','releasedStillContext','originalRender',code)(api,renderer,canvas,false,()=>draws++);
  api.render({},{});assert.equal(draws,1,'offscreen environment render bypasses canvas sleeping and snapshots');
  renderer.getRenderTarget=()=>null;api.render({},{});assert.equal(draws,1,'hidden onscreen canvas still skips drawing');
  assert.equal(canvas.dataset.webglReady,undefined,'environment does not mark the avatar visible/ready');
});


test('pants have no arm influences and stay planted during overhead gestures', async () => {
  const {THREE, root, parts, rig} = await fixture();
  const pants = rig.meshes.find(mesh => mesh.name.includes('pants'));
  const weights = pants.geometry.attributes.skinWeight, indices = pants.geometry.attributes.skinIndex;
  for (let i = 0; i < weights.count; i++) for (let j = 0; j < 4; j++) {
    const bone = indices.getComponent(i, j);
    assert.ok(!(bone >= 2 && bone <= 7 && weights.getComponent(i,j) > 1e-6), 'trouser vertices must never follow an arm bone');
  }
  rig.update(); root.updateMatrixWorld(true); pants.skeleton.update();
  const before = Array.from({length: weights.count}, (_, i) => pants.getVertexPosition(i, new THREE.Vector3()));
  for (const name of ['left upper arm', 'right upper arm', 'left forearm', 'right forearm']) parts.get(name).rotation.z = 2.6;
  rig.update(); root.updateMatrixWorld(true); pants.skeleton.update();
  for (let i=0;i<before.length;i++) assert.ok(pants.getVertexPosition(i,new THREE.Vector3()).distanceTo(before[i]) < 1e-5);
  rig.dispose();
});


test('overhead canvas extension preserves athlete screen size and foot position', async () => {
  const THREE = await import('three');
  const camera = new THREE.PerspectiveCamera(31, 117/160, .1, 100);
  camera.position.set(0,.25,5.8);camera.lookAt(0,.16,0);camera.updateMatrixWorld(true);
  const screen = (point,height,top) => { const p=point.clone().project(camera);return [(p.x+1)*117/2,(1-p.y)*height/2+top]; };
  const landmarks=[new THREE.Vector3(0,-1.18,0),new THREE.Vector3(0,1.45,0)];
  const before=landmarks.map(p=>screen(p,160,0));
  camera.setViewOffset(117,160,0,-80,117,240);
  landmarks.forEach((p,i)=>{const after=screen(p,240,-80);assert.ok(Math.abs(after[0]-before[i][0])<1e-6);assert.ok(Math.abs(after[1]-before[i][1])<1e-6);});
});


test('salute targets eyebrow height with a flat palm facing the floor', async () => {
  const THREE=await import('three');
  const {createSaluteRig}=load('components/dashboard/soundFitnessSaluteRig.ts');
  const root=new THREE.Group(), shoulder=new THREE.Group(), elbow=new THREE.Group(), wrist=new THREE.Group();
  root.add(shoulder);shoulder.position.set(.45,2.72,0);shoulder.add(elbow);elbow.position.set(.1,-.47,0);elbow.add(wrist);wrist.position.set(.05,-.46,.015);
  shoulder.rotation.z=2.15;elbow.rotation.z=2.15;
  const solve=createSaluteRig(THREE,root,shoulder,elbow,wrist);solve(1);root.updateMatrixWorld(true);
  const position=root.worldToLocal(wrist.getWorldPosition(new THREE.Vector3()));
  assert.ok(Math.abs(position.y-3.14)<.06,'wrist reaches eyebrow level');
  assert.ok(Math.abs(position.x-.44)<.06,'fingertips can reach the temple from a flat hand');
  const palm=new THREE.Vector3(-1,0,0).applyQuaternion(wrist.getWorldQuaternion(new THREE.Quaternion()));
  assert.ok(palm.y<-.99,'palm faces down rather than backward');
  assert.ok(wrist.quaternion.angleTo(new THREE.Quaternion()) < .8,'flat hand does not require a broken-looking half-turn at the wrist');
  const fingers=new THREE.Vector3(0,-1,0).applyQuaternion(wrist.getWorldQuaternion(new THREE.Quaternion()));
  assert.ok(fingers.x<-.99 && Math.abs(fingers.y)<.01,'fingers stay flat and point toward the brow');
});


test('female shirt has narrower shoulders and a continuous shaped chest',async()=>{
  const {rig}=await fixture();
  const shirt=rig.meshes.find(mesh=>mesh.name.includes('shirt'));
  const base=shirt.geometry.attributes.position,morph=shirt.geometry.morphAttributes.position[0];
  const points=female=>Array.from({length:base.count},(_,i)=>({x:base.getX(i)+(female?morph.getX(i):0),y:base.getY(i)+(female?morph.getY(i):0),z:base.getZ(i)+(female?morph.getZ(i):0)}));
  const male=points(false),female=points(true);
  const shoulder=points=>Math.max(...points.filter(p=>p.y>2.58&&p.y<2.82).map(p=>Math.abs(p.x)));
  assert.ok(shoulder(female)<shoulder(male)*.94,'female shoulders are visibly narrower');
  const chest=points=>Math.max(...points.filter(p=>p.y>2.4&&p.y<2.66&&Math.abs(p.x)>.07&&Math.abs(p.x)<.28).map(p=>p.z));
  assert.ok(chest(female)>chest(male)+.035,`chest contour: female ${chest(female)}, male ${chest(male)}`);
  rig.dispose();
});


test('eye socket landmarks are available for both authored face profiles',async()=>{
  const {parts,rig}=await fixture();
  const head=parts.get('head sculpt');
  for(const key of ['eyePositions','femaleEyePositions']) {
    const eyes=head.userData[key];assert.equal(eyes.length,2);
    for(const eye of eyes){assert.ok(eye.every(Number.isFinite));assert.ok(eye[1]>2.9&&eye[1]<3.4);}
    assert.ok(eyes[0][0]<eyes[1][0],'left/right eyes preserve their order');
  }
  rig.dispose();
});


test('face choices deform the authored face rather than only changing labels',async()=>{
  const {parts,rig}=await fixture();
  const geometry=parts.get('head sculpt').geometry;
  assert.equal(geometry.morphAttributes.position.length,4);
  for(const [index,label] of [[1,'Bright'],[2,'Focused'],[3,'Defined']]) {
    const morph=geometry.morphAttributes.position[index];
    let displacement=0;
    for(let i=0;i<morph.count;i++) displacement=Math.max(displacement,Math.hypot(morph.getX(i),morph.getY(i),morph.getZ(i)));
    assert.ok(displacement>.01,`${label} has a visible facial shape change`);
  }
  rig.dispose();
});


test('head and neck use continuous shading at their shared seam',async()=>{
  const {parts,rig}=await fixture();
  const head=parts.get('head sculpt').geometry,skin=rig.meshes.find(mesh=>mesh.name.includes('skin')).geometry;
  const key=(p,i)=>[p.getX(i),p.getY(i),p.getZ(i)].map(n=>n.toFixed(5)).join(':');
  const positions=new Map();
  for(let i=0;i<head.attributes.position.count;i++)positions.set(key(head.attributes.position,i),i);
  let shared=0;
  for(let i=0;i<skin.attributes.position.count;i++){
    const h=positions.get(key(skin.attributes.position,i));if(h===undefined)continue;
    shared++;
    for(const axis of ['getX','getY','getZ'])assert.ok(Math.abs(head.attributes.normal[axis](h)-skin.attributes.normal[axis](i))<1e-5,'seam normals match');
  }
  assert.ok(shared>10,'checks the actual shared neck boundary');rig.dispose();
});


test('female head has a tapered lower face and a full temple-to-nape hair cap',async()=>{
  const {parts,rig}=await fixture();const head=parts.get('head sculpt').geometry,p=head.attributes.position,f=head.morphAttributes.position[0];
  const width=female=>{let w=0;for(let i=0;i<p.count;i++){const y=p.getY(i)+(female?f.getY(i):0);if(y>3.025&&y<3.10)w=Math.max(w,Math.abs(p.getX(i)+(female?f.getX(i):0)));}return w;};
  assert.ok(width(true)<width(false)*.90,'female jaw is visibly tapered rather than a scaled male head');
  assert.equal(head.morphAttributes.normal.length,4,'female shape has matching shading instead of male normals');
  assert.ok(Array.from(head.morphAttributes.normal[0].array).some(n=>Math.abs(n)>.05),'female surface changes the lighting directions');
  const cap=parts.get('female full hair cap').geometry,c=cap.attributes.position;
  let nape=false,temple=false;
  for(const id of new Set(cap.index.array)){if(c.getZ(id)<.02&&c.getY(id)<3.15)nape=true;if(Math.abs(c.getX(id))>.10&&c.getY(id)<3.23)temple=true;}
  assert.ok(nape&&temple,'hair covers sides and nape instead of inheriting a fade');rig.dispose();
});


test('Bright lifts the lip corners without pulling the nose upward',async()=>{
  const {parts,rig}=await fixture();const g=parts.get('head sculpt').geometry,p=g.attributes.position,m=g.morphAttributes.position[1];
  let lips=0,nose=0,cheekWidth=0,cheekLift=0;
  for(let i=0;i<p.count;i++){
    const x=Math.abs(p.getX(i)),y=p.getY(i),z=p.getZ(i);if(z<.20)continue;
    if(x>.035&&x<.085&&y>3.045&&y<3.095)lips=Math.max(lips,m.getY(i));
    if(x<.025&&y>3.12&&y<3.15)nose=Math.max(nose,m.getY(i));
    if(x>.09&&y>3.105&&y<3.17){cheekWidth=Math.max(cheekWidth,Math.abs(m.getX(i)));cheekLift=Math.max(cheekLift,Math.abs(m.getY(i)));}
  }
  assert.ok(lips>.008,'the actual lip corners lift');assert.ok(nose<lips*.5,'the smile does not lift the nose');
  assert.ok(cheekWidth<.001,'smiling does not inflate the outer cheeks');
  assert.ok(cheekLift<.002,'the outer cheek stays below the lip-corner lift');rig.dispose();
});

test('headgear stays within head proportions on both body profiles',async()=>{
 const {THREE,parts,root}=await fixture();
 const src=fs.readFileSync('components/dashboard/SoundFitnessAvatar3D.tsx','utf8');
 const ast=ts.createSourceFile('avatar.tsx',src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let build;
 function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='buildGear')build=node.initializer.getText(ast);ts.forEachChild(node,visit);}visit(ast);
 const api={};const gearGroup=new THREE.Group(),headGearGroup=new THREE.Group();
 const head=parts.get('head sculpt');root.updateMatrixWorld(true);
 const rest=new THREE.Matrix4().multiplyMatrices(root.matrixWorld.clone().invert(),head.matrixWorld);
 let box;
 const fitApi=load("components/dashboard/soundFitnessAvatarHeadgear.ts");
 const env={THREE,necklace:undefined,soundFitnessAvatarClothingColors:{navy:{accent:"#67e8f9",base:"#0b1a2e"}},shirtPrintTexture:{sound:new THREE.Texture()},cottonNormal:new THREE.Texture(),cottonRoughness:new THREE.Texture(),fitAvatarHeadgear:fitApi.fitAvatarHeadgear,createAvatarCapGeometry:fitApi.createAvatarCapGeometry,createAvatarCapBrimGeometry:fitApi.createAvatarCapBrimGeometry,createAvatarCapBadgeGeometry:fitApi.createAvatarCapBadgeGeometry,createAvatarCapDetails:fitApi.createAvatarCapDetails,headSculpt:head,partRestMatrices:new Map([["head sculpt",rest]]),jointGear:[],disposeObject:()=>{},gearGroup,headGearGroup,soundFitnessAvatarShirtPalettes:{sound:{accent:'#67e8f9',base:'#0b1a2e'}},partBox:name=>name==='head sculpt'?box:null,setVisible:()=>{},WRIST_BANDS:[],gearMaterial:()=>new THREE.MeshStandardMaterial(),addGear:(name,mesh)=>{mesh.name=name;headGearGroup.add(mesh);},HANDS:[],part:()=>null};
 new Function('exports',...Object.keys(env),ts.transpileModule('exports.build='+build,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(api,...Object.values(env));
 for(const female of [false,true]){
  box=new THREE.Box3();const geometry=head.geometry,p=geometry.attributes.position,m=geometry.morphAttributes.position[0];
  for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i);if(female){const delta=new THREE.Vector3().fromBufferAttribute(m,i);geometry.morphTargetsRelative?v.add(delta):v.copy(delta);}box.expandByPoint(v.applyMatrix4(rest));}
  for(const gear of ['headband','visor','cap','shades']){
   api.build({body:female?'female':'male',shirt:'sound',gear,gearColor:'navy'});
   const bounds=new THREE.Box3().setFromObject(headGearGroup),size=bounds.getSize(new THREE.Vector3()),headSize=box.getSize(new THREE.Vector3());
   assert.ok(size.x<headSize.x*(gear==='cap'?1.15:1.05),gear+' stays proportionate with a small fabric allowance');
   assert.ok(bounds.max.y<box.max.y+.045,gear+' sits on the head rather than floating above it');
   assert.ok(size.toArray().every(Number.isFinite));
  }
 }
});

test('cap crown clears the scalp around both profiles including the side and back',async()=>{
 const {THREE,parts,root}=await fixture();const {fitAvatarHeadgear,createAvatarCapGeometry}=load('components/dashboard/soundFitnessAvatarHeadgear.ts');
 const head=parts.get('head sculpt');root.updateMatrixWorld(true);const rest=new THREE.Matrix4().multiplyMatrices(root.matrixWorld.clone().invert(),head.matrixWorld);
 for(const female of [false,true]) {
  const fit=fitAvatarHeadgear(THREE,head.geometry,rest,female),crown=createAvatarCapGeometry(THREE,head.geometry,rest,female,fit.bandY);
  const scalp=head.geometry.clone(),p=scalp.attributes.position,m=head.geometry.morphAttributes.position[0];
  for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i);if(female)v.add(new THREE.Vector3().fromBufferAttribute(m,i));v.applyMatrix4(rest);p.setXYZ(i,v.x,v.y,v.z);}scalp.morphAttributes={};
  const mesh=new THREE.Mesh(scalp,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.updateMatrixWorld(true);
  const origin=new THREE.Vector3(fit.cx,fit.bandY+.025,fit.cz),ray=new THREE.Raycaster(),cp=crown.attributes.position;
  let samples=0;
  for(let i=0;i<cp.count;i+=3){const v=new THREE.Vector3().fromBufferAttribute(cp,i);if(v.y<fit.bandY+.012)continue;const direction=v.clone().sub(origin),distance=direction.length();ray.set(origin,direction.normalize());const hit=ray.intersectObject(mesh)[0];if(!hit)continue;assert.ok(distance-hit.distance>.002,'crown stays outside scalp, including side/back samples');samples++;}
  assert.ok(samples>30);crown.dispose();scalp.dispose();mesh.material.dispose();
 }
});

test('cap bill joins the crown, crest follows its surface, and rear opening stays clear',async()=>{
 const {THREE,parts,root}=await fixture();const api=load('components/dashboard/soundFitnessAvatarHeadgear.ts');const head=parts.get('head sculpt');root.updateMatrixWorld(true);const rest=new THREE.Matrix4().multiplyMatrices(root.matrixWorld.clone().invert(),head.matrixWorld);
 for(const female of [false,true]){
  const fit=api.fitAvatarHeadgear(THREE,head.geometry,rest,female,true),crown=api.createAvatarCapGeometry(THREE,head.geometry,rest,female,fit.bandY),brim=api.createAvatarCapBrimGeometry(THREE,fit,crown),badge=api.createAvatarCapBadgeGeometry(THREE,crown,fit);
  const mesh=new THREE.Mesh(crown,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.updateMatrixWorld(true);const ray=new THREE.Raycaster();
  for(const col of [0,40])for(let row=1;row<=8;row++){
    const root=new THREE.Vector3().fromBufferAttribute(brim.attributes.position,col),edge=new THREE.Vector3().fromBufferAttribute(brim.attributes.position,row*41+col);
    assert.ok(root.distanceTo(edge)<1e-6,'outer bill corners stay attached instead of flaring out at the sides');
  }
  const rearCenter=new THREE.Vector3().fromBufferAttribute(brim.attributes.position,20),frontCenter=new THREE.Vector3().fromBufferAttribute(brim.attributes.position,8*41+20);
  assert.ok(frontCenter.z-rearCenter.z>.11,'bill projects forward');
  for(const col of [10,30]){
    const shoulder=new THREE.Vector3().fromBufferAttribute(brim.attributes.position,8*41+col);
    assert.ok(Math.abs(frontCenter.z-shoulder.z)<.075,'rounded U-shaped bill remains broad across the front');
  }
  for(let col=0;col<=40;col++){const p=new THREE.Vector3().fromBufferAttribute(brim.attributes.position,col);ray.set(new THREE.Vector3(p.x,fit.bandY+.004,fit.cz+1),new THREE.Vector3(0,0,-1));const hit=ray.intersectObject(mesh)[0];assert.ok(hit && p.distanceTo(hit.point)<.025,'bill rear edge overlaps crown seam');}
  for(let i=0;i<badge.attributes.position.count;i+=7){const p=new THREE.Vector3().fromBufferAttribute(badge.attributes.position,i);ray.set(p.clone().add(new THREE.Vector3(0,0,.1)),new THREE.Vector3(0,0,-1));const hit=ray.intersectObject(mesh)[0];assert.ok(hit && p.distanceTo(hit.point)<.003,'crest is flush with actual cap surface');}
  ray.set(new THREE.Vector3(fit.cx,fit.bandY+.05,fit.cz-1),new THREE.Vector3(0,0,1));const hit=ray.intersectObject(mesh)[0];assert.ok(hit && hit.point.z>fit.cz,'rear arch is open rather than blocked by cap fabric');
  for(const g of [crown,brim,badge]){assert.ok(g.attributes.uv);g.dispose();}mesh.material.dispose();
 }
});

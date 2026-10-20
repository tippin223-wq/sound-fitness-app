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

test('training shirt print follows the shirt surface and replacing the body leaves one print',async()=>{
  const {THREE,root,rig}=await fixture();
  const texture=new THREE.Texture();rig.setShirtPrint(texture);
  const print=()=>root.children.filter(mesh=>mesh.name==='Sound Fitness training shirt print');
  assert.equal(print().length,1);assert.ok(print()[0].visible);
  const box=new THREE.Box3().setFromBufferAttribute(print()[0].geometry.attributes.position);
  assert.ok(box.min.y>2.3&&box.max.y<2.7,'chest print stays below the collar');
  assert.ok(box.min.z>0,'print is fitted to the front of the garment');
  assert.ok(box.max.x-box.min.x>.5,'crest and wordmark span the chest');
  rig.setBody(true);rig.setShirtPrint(texture);assert.equal(print().length,1);
  rig.dispose();assert.equal(print().length,0);texture.dispose();
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

const assert=require('node:assert/strict');
const fs=require('node:fs');
const test=require('node:test');
const ts=require('typescript');
const source=fs.readFileSync('components/dashboard/soundFitnessAvatarAnatomy.ts','utf8');
const moduleCode=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const api={};
new Function('exports',moduleCode)(api);

async function sceneParts() {
  const THREE=await import('three');
  const {GLTFLoader}=await import('three/examples/jsm/loaders/GLTFLoader.js');
  const bytes=fs.readFileSync('public/models/sound-avatar.glb');
  const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const parts=new Map();
  scene.traverse(mesh=>{if(mesh.isMesh)parts.set(mesh.name.toLowerCase().replaceAll('_',' '),mesh);});
  const rendererSource=fs.readFileSync('components/dashboard/SoundFitnessAvatar3D.tsx','utf8');
  const ast=ts.createSourceFile('avatar.tsx',rendererSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const declarations=[];
  function visit(node) {
    if(ts.isVariableDeclaration(node)&&['TEE_PROFILES','PELVIS_PROFILES','SLEEVE_PROFILE','THIGH_PROFILE','SHIN_PROFILE','sculptBust'].includes(node.name.getText(ast)))declarations.push('const '+node.getText(ast)+';');
    ts.forEachChild(node,visit);
  }
  visit(ast);
  const profiles={};
  new Function('exports',ts.transpileModule(declarations.join('\n')+'\nexports.data={TEE_PROFILES,PELVIS_PROFILES,SLEEVE_PROFILE,THIGH_PROFILE,SHIN_PROFILE,sculptBust};',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(profiles);
  return {THREE,parts,profiles:profiles.data,scene};
}

test('adult model preserves named appearance parts and balanced body landmarks',async()=>{
  const {THREE,parts,scene}=await sceneParts();
  scene.updateMatrixWorld(true);
  const box=name=>new THREE.Box3().setFromObject(parts.get(name));
  const head=box('head sculpt'),sole=box('left shoe sole glow');
  const height=head.max.y-sole.min.y,headHeight=head.max.y-head.min.y;
  assert.ok(parts.get('head sculpt').geometry.getAttribute('position').count>=4000,'authored facial topology');
  assert.match(parts.get('head sculpt').userData.source,/MakeHuman Community/);
  assert.ok(height/headHeight>6.7 && height/headHeight<7.2,`enlarged adult head ratio ${height/headHeight}`);
  assert.ok(box('left hand').min.y<1.7);
  assert.ok(box('left forearm').min.y>box('left hand').min.y);
  assert.ok(box('neck').max.y>head.min.y);
  for(const name of ['left upper arm','right upper arm','left forearm','right forearm','left thigh','right thigh','left shin','right shin','sound crest cyan diagonal'])assert.ok(parts.has(name),name);
  assert.ok(parts.get('left hand').geometry.getAttribute('position').count>500,'palm and individual fingers');
});

test('idle motion has brief complete blinks, bounded secondary motion and a neutral reduced-motion frame',()=>{
  const motionCode=ts.transpileModule(fs.readFileSync('components/dashboard/soundFitnessAvatarMotion.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const motionApi={};new Function('exports',motionCode)(motionApi);
  const frame=motionApi.soundFitnessAvatarIdleMotion;
  assert.ok(frame(3.175,true).blink>.999);
  assert.equal(frame(3,true).blink,0);
  assert.equal(frame(3.35,true).blink,0);
  assert.ok(frame(7.835,true).blink>.999,'occasional double blink');
  for(let t=0;t<24;t+=.01){
    const sample=frame(t,true);
    assert.ok(Object.values(sample).every(Number.isFinite));
    assert.ok(sample.blink>=0&&sample.blink<=1);
    assert.ok(Math.abs(sample.headYaw)<=.034);
    assert.ok(Math.abs(sample.weightShift)<=.012);
    assert.ok(Math.abs(sample.breath)<=1);
  }
  assert.ok(Object.values(frame(3.175,false)).every(value=>value===0),'all autonomous motion stops');
  assert.notEqual(frame(1,true).breath,frame(3,true).breath);
  assert.deepEqual(frame(3.175,true),frame(3.175,true),'stable frame independent of refresh rate');
});

test('actual render loop animates the face and chest, preserves emotes, and stops idle movement when paused or reduced',()=>{
  const renderer=fs.readFileSync('components/dashboard/SoundFitnessAvatar3D.tsx','utf8');
  const ast=ts.createSourceFile('avatar.tsx',renderer,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),nodes={};
  function visit(node){if(ts.isVariableDeclaration(node)&&['render','restPose','emotePoses'].includes(node.name.getText(ast)))nodes[node.name.getText(ast)]=node.initializer;ts.forEachChild(node,visit);}visit(ast);
  const motionApi={};new Function('exports',ts.transpileModule(fs.readFileSync('components/dashboard/soundFitnessAvatarMotion.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(motionApi);
  const vector=()=>({x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z;}});
  const joint=()=>({position:vector(),rotation:vector(),scale:vector()});
  const head=joint(),left=joint(),right=joint(),torso=joint(),hips=joint(),root=joint(),lid=joint(),feature=joint();
  const state={active:true,paused:false,view:'front',emotePreset:'calm',appearance:{body:'male'}},reducedMotion={matches:false};
  let frames=0;
  const env={...motionApi,disposed:false,latest:{current:state},lastTime:0,idleSeconds:3.1,yaw:-.08,pose:{head:[0,0,0],leftArm:[.025,.22],rightArm:[.025,-.22]},reducedMotion,root,canvas:{},setDashboardWebGlCanvasActive:()=>{},headPivot:head,leftArmPivot:left,rightArmPivot:right,torsoPivot:torso,hipsPivot:hips,upperBodyJoints:[head,left,right].map(joint=>({joint,restY:3})),eyelids:[{lid,height:.015,centerY:3.2}],facialFeatures:[{mesh:feature,base:{x:.05,y:3.2},eyebrow:false}],elbows:[joint(),joint()],legPivots:[{hip:joint(),knee:joint()}],SOUND_AVATAR_BASE_Y:-1.18,highlightFadeStart:null,gl:{render:()=>frames++},scene:{},camera:{},window:{requestAnimationFrame:()=>1},animationFrame:0};
  const exported={};
  const code=ts.transpileModule(`const restPose=${nodes.restPose.getText(ast)};const emotePoses=${nodes.emotePoses.getText(ast)};const render=${nodes.render.getText(ast)};exports.render=render;`,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('exports',...Object.keys(env),code)(exported,...Object.values(env));
  exported.render(50);
  assert.ok(lid.visible,'actual eyelid closes during blink');
  assert.notEqual(torso.scale.z,1,'chest breathes');
  assert.notEqual(head.rotation.y,0,'head looks around');
  assert.notEqual(feature.position.x,.05,'eyes shift gaze');
  reducedMotion.matches=true;exported.render(100);
  assert.equal(lid.visible,false);assert.equal(torso.scale.z,1);assert.equal(head.rotation.y,0);
  assert.equal(left.rotation.z,.22,'neutral arms stay close to the body');
  state.emotePreset='wave';exported.render(150);
  assert.equal(right.rotation.z,2.35,'explicit wave still articulates');
  reducedMotion.matches=false;state.paused=true;state.emotePreset='calm';exported.render(200);
  assert.equal(lid.visible,false);assert.equal(torso.rotation.z,0);assert.equal(feature.position.x,.05);
  assert.equal(frames,4);
});

test('muscle surfaces cover every selection with finite, fitted front/back geometry on both body profiles',async()=>{
  const {THREE,parts,profiles}=await sceneParts();
  for(const body of ['male','female']) {
    const lathe=(profile,z)=>new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),48).scale(1,1,z);
    parts.get('torso shirt core').geometry=lathe(profiles.TEE_PROFILES[body],.6);
    if(body==='female') profiles.sculptBust(parts.get('torso shirt core').geometry);
    parts.get('hips').geometry=lathe(profiles.PELVIS_PROFILES[body],.66);
    for(const side of ['left','right']) {
      parts.get(side+' shoulder').geometry=lathe(profiles.SLEEVE_PROFILE,1);
      parts.get(side+' thigh').geometry=lathe(profiles.THIGH_PROFILE,.92);
      parts.get(side+' shin').geometry=lathe(profiles.SHIN_PROFILE,.92);
    }
    const overlays=api.createSoundFitnessMuscleOverlays(THREE,parts);
    const definitions=api.soundFitnessMuscleSurfaces();
    assert.equal(overlays.length,definitions.length,`${body}: every authored surface must project`);
    for(const region of new Set(definitions.map(item=>item.region))) {
      assert.ok(overlays.some(({definition})=>api.isAvatarMuscleSelected(definition,definition.group,region)),region);
    }
    for(const {mesh,definition} of overlays) {
      const positions=mesh.geometry.getAttribute('position');
      assert.ok([...positions.array].every(Number.isFinite),definition.name);
      assert.ok(mesh.parent===parts.get(definition.part));
      // Highlights are real surface meshes, without clipping-plane bands.
      assert.equal(mesh.material.clippingPlanes,null);
      assert.ok(positions.count>=300);
      assert.ok(mesh.geometry.index.count>1000);
      // Check the direct-profile projection against triangle intersections,
      // including the sculpted female chest, rather than testing its formula.
      const axis=definition.surface==='outer'?'x':'z';
      const sign=definition.surface==='back'||(definition.surface==='outer'&&definition.part.startsWith('left'))?-1:1;
      const probe=new THREE.Mesh(mesh.parent.geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
      probe.updateMatrixWorld(true);
      for(const index of [0,Math.floor(positions.count/2),positions.count-1]) {
        const point=new THREE.Vector3().fromBufferAttribute(positions,index),origin=point.clone(),direction=new THREE.Vector3();
        origin[axis]+=sign*2;direction[axis]=-sign;
        const hit=new THREE.Raycaster(origin,direction).intersectObject(probe,false)[0];
        assert.ok(hit,definition.name+' intersects the actual mesh');
        assert.ok(point.distanceTo(hit.point)<.025,definition.name+' hugs the actual curved surface');
      }
      probe.material.dispose();
    }
    assert.ok(overlays.filter(({definition})=>definition.region==='quads').length===6);
    assert.ok(overlays.filter(({definition})=>definition.region==='hamstrings').length===4);
    assert.ok(overlays.filter(({definition})=>definition.region==='lats').every(({definition})=>definition.surface==='back'));
    for(const {mesh} of overlays){mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}
  }
});

test('an explicitly selected muscle stays illuminated after the selection pulse expires',()=>{
  const card=fs.readFileSync('components/dashboard/BodyCommandCenterCard.tsx','utf8');
  const ast=ts.createSourceFile('card.tsx',card,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let expression,hoverExpression;
  function visit(node){
    if(ts.isJsxAttribute(node)&&node.name.getText(ast)==='zoneGlowActive'&&node.initializer?.expression?.getText(ast).includes('avatarSelectionPulse'))expression=node.initializer.expression.getText(ast);
    if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='hoveredBodyPart')hoverExpression=node.initializer.getText(ast);
    ts.forEachChild(node,visit);
  }
  visit(ast);
  assert.ok(expression);
  const active=new Function('avatarSelectionPulse','avatarMuscleFocusActive','hoveredBodyPart','menuHoveredMuscleInGroup','return '+expression);
  assert.equal(active(false,true,null,null),true);
  assert.equal(active(false,false,null,null),false);
  assert.equal(active(false,false,'back',null),true);
  const hover=new Function('avatarMuscleFocusActive','avatarHoveredBodyPart','menuHoveredGroup','return '+hoverExpression);
  assert.equal(hover(true,'back','back'),null,'restored category focus cannot replace the selected lat');
  assert.equal(hover(false,'back',null),'back');
});

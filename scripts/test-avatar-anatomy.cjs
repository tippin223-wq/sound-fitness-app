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
    if(ts.isVariableDeclaration(node)&&['TEE_PROFILES','PELVIS_PROFILES','SLEEVE_PROFILE','THIGH_PROFILE','SHIN_PROFILE','UPPER_ARM_PROFILE','FOREARM_PROFILE','sculptBust'].includes(node.name.getText(ast)))declarations.push('const '+node.getText(ast)+';');
    ts.forEachChild(node,visit);
  }
  visit(ast);
  const profiles={};
  new Function('exports',ts.transpileModule(declarations.join('\n')+'\nexports.data={TEE_PROFILES,PELVIS_PROFILES,SLEEVE_PROFILE,THIGH_PROFILE,SHIN_PROFILE,UPPER_ARM_PROFILE,FOREARM_PROFILE,sculptBust};',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(profiles);
  return {THREE,parts,profiles:profiles.data,scene};
}

test('adult model preserves named appearance parts and balanced body landmarks',async()=>{
  const {THREE,parts,scene}=await sceneParts();
  scene.updateMatrixWorld(true);
  const box=name=>new THREE.Box3().setFromObject(parts.get(name),true);
  const head=box('head sculpt'),sole=box('left shoe sole glow');
  const height=head.max.y-sole.min.y,headHeight=head.max.y-head.min.y;
  assert.ok(parts.get('head sculpt').geometry.getAttribute('position').count>=4000,'authored facial topology');
  assert.match(parts.get('head sculpt').userData.source,/MakeHuman Community/);
  assert.ok(height/headHeight>7.1 && height/headHeight<7.9,`authored adult head ratio ${height/headHeight}`);
  assert.ok(box('left hand').min.y<1.7);
  assert.ok(box('left forearm').min.y>box('left hand').min.y);
  assert.ok(box('neck').max.y>head.min.y);
  for(const name of ['left upper arm','right upper arm','left forearm','right forearm','left thigh','right thigh','left shin','right shin','sound crest cyan diagonal'])assert.ok(parts.has(name),name);
  assert.ok(parts.get('left hand').geometry.getAttribute('position').count>500,'palm and individual fingers');
});

test('relaxed hands face inward with forward thumbs and elbow surfaces form one continuous arm',async()=>{
  const {THREE,parts,profiles,scene}=await sceneParts();
  scene.updateMatrixWorld(true);
  const garmentApi={};new Function('exports',ts.transpileModule(fs.readFileSync('components/dashboard/soundFitnessAvatarGarments.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(garmentApi);
  const skin=new THREE.MeshStandardMaterial();
  for(const [side,sign] of [['left',-1],['right',1]]) {
    const hand=parts.get(side+' hand'),palm=new THREE.Vector3(0,0,1).transformDirection(hand.matrixWorld),thumb=new THREE.Vector3(sign,0,0).transformDirection(hand.matrixWorld);
    assert.ok(palm.x*-sign>.9,'palm faces the thigh');assert.ok(thumb.z>.9,'thumb points forward');
    const upper=new THREE.Box3().setFromObject(parts.get(side+' upper arm')),forearm=new THREE.Box3().setFromObject(parts.get(side+' forearm'));
    assert.ok(forearm.max.y-upper.min.y>.03,'joint surfaces overlap at the actual elbow');
    const arm=garmentApi.createSoundFitnessGarment(THREE,scene,[{mesh:parts.get(side+' upper arm'),profile:profiles.UPPER_ARM_PROFILE,depth:1},{mesh:parts.get(side+' forearm'),profile:profiles.FOREARM_PROFILE,depth:1}],skin,'test continuous arm',.018);
    const indices=arm.mesh.geometry.index.array,count=arm.mesh.geometry.getAttribute('position').count,adjacency=Array.from({length:count},()=>new Set());
    for(let i=0;i<indices.length;i+=3){const a=indices[i],b=indices[i+1],c=indices[i+2];adjacency[a].add(b).add(c);adjacency[b].add(a).add(c);adjacency[c].add(a).add(b);}
    const reached=new Set([0]),queue=[0];while(queue.length)for(const next of adjacency[queue.pop()])if(!reached.has(next)){reached.add(next);queue.push(next);}
    assert.equal(reached.size,count,'no detached elbow pieces');arm.dispose();
  }
  assert.ok(Math.max(...profiles.SLEEVE_PROFILE.map(([r])=>r))<.115,'soft sleeve cap');
  assert.ok(2.88-(2.72+profiles.SLEEVE_PROFILE.at(-1)[1])>.07,'shoulder slopes down from collar');
  skin.dispose();
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
    assert.ok(Math.abs(sample.weightShift)<=.035);
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
  let frames=0,garmentUpdates=0,activityWrites=0;
  const env={...motionApi,necklace:undefined,contextLost:false,clearDashboardWebGlFallback:()=>{},disposed:false,readyReported:false,loadTimeout:0,setLoadState:()=>{},onReadyChange:()=>{},avatarInViewport:true,canvasActive:null,document:{hidden:false},latest:{current:state},lastTime:0,idleSeconds:3.1,emoteSeconds:0,currentEmote:state.emotePreset,currentReplay:state.emoteReplay,manualYaw:0,lastView:state.view,yaw:-.08,pose:{head:[0,0,0],leftArm:[.025,.12],rightArm:[.025,-.12]},reducedMotion,root,canvas:{dataset:{}},setDashboardWebGlCanvasActive:()=>activityWrites++,headPivot:head,leftArmPivot:left,rightArmPivot:right,torsoPivot:torso,hipsPivot:hips,torsoCentre:[0,2.35,0],garments:[{update:()=>garmentUpdates++}],upperBodyJoints:[head,left,right].map(joint=>({joint,restX:0,restY:3,restZ:0})),eyelids:[{lid,height:.015,centerY:3.2}],eyeOffsets:{},expressionSmile:null,smileRestScale:null,facialFeatures:[{mesh:feature,base:{x:.05,y:3.2},eyebrow:false}],elbows:[joint(),joint()],wrists:[joint(),joint()],saluteRig:()=>{},legPivots:[{hip:joint(),knee:joint()}],SOUND_AVATAR_BASE_Y:-1.18,highlightFadeStart:null,gl:{render:()=>frames++},scene:{},cameraTarget:{y:.25,z:5.8,aimY:.16},cameraAimY:.16,headSculpt:{morphTargetInfluences:[0,0,0,0]},camera:{fov:31,aspect:1,position:{x:0,y:.25,z:5.8},lookAt:()=>{}},window:{requestAnimationFrame:()=>1,clearTimeout:()=>{}},animationFrame:0};
  const exported={};
  const code=ts.transpileModule(`const restPose=${nodes.restPose.getText(ast)};const emotePoses=${nodes.emotePoses.getText(ast)};const render=${nodes.render.getText(ast)};exports.render=render;exports.setVisibility=value=>avatarInViewport=value;`,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('exports',...Object.keys(env),code)(exported,...Object.values(env));
  state.appearance.face='bright';
  env.cameraTarget.y=1.39;env.cameraTarget.z=2;env.cameraTarget.aimY=1.3;
  exported.render(50);
  assert.ok(env.camera.position.y>.25 && env.camera.position.y<1.39,'portrait zoom advances smoothly');
  assert.ok(env.headSculpt.morphTargetInfluences[1]>0 && env.headSculpt.morphTargetInfluences[1]<1,'smile blends rather than flashing');
  env.cameraTarget.y=.25;env.cameraTarget.z=5.8;env.cameraTarget.aimY=.16;
  assert.ok(lid.visible,'actual eyelid closes during blink');
  assert.notEqual(torso.scale.z,1,'chest breathes');
  assert.notEqual(head.rotation.y,0,'head looks around');
  assert.notEqual(feature.position.x,.05,'eyes shift gaze');
  assert.ok(Math.abs(head.position.x)>.005,'visible upper-body weight shift');
  assert.equal(root.position.y,-1.18,'the resting sway does not lift the shoes');
  reducedMotion.matches=true;exported.render(100);
  assert.ok(lid.visible && lid.scale.y<.005,'resting upper lids soften the open eyes');assert.equal(torso.scale.z,1);assert.equal(head.rotation.y,0);
  assert.equal(left.rotation.z,.12,'neutral arms stay close to the body');
  state.emotePreset='wave';exported.render(150);
  assert.equal(right.rotation.z,.65,'wave keeps the shoulder relaxed below head height');
  assert.equal(env.elbows[1].rotation.z,1.9,'wave lifts the forearm from a bent elbow');
  assert.equal(env.elbows[1].rotation.y,Math.PI/2,'wave turns the palm toward the viewer');
  assert.equal(env.wrists[1].rotation.z,0,'reduced-motion wave keeps a steady wrist');
  state.emotePreset='celebrate';exported.render(175);
  assert.equal(root.position.y,env.SOUND_AVATAR_BASE_Y,'celebration keeps the athlete planted');
  assert.ok(env.elbows[0].rotation.z < -1 && env.elbows[1].rotation.z > 1,'celebration uses bent elbows rather than a rigid T pose');
  assert.equal(env.elbows[0].rotation.order,'ZXY','celebration palm turn preserves the elbow plane');
  assert.ok(lid.visible,'celebration carries a joyful eye expression');
  reducedMotion.matches=false;state.paused=true;state.emotePreset='calm';exported.render(200);
  assert.ok(lid.visible && lid.scale.y<.005);assert.equal(torso.rotation.z,0);assert.equal(feature.position.x,.05);
  assert.equal(frames,5);
  assert.equal(env.canvas.dataset.soundAvatarReady,'true','readiness follows the first actual render');
  state.paused=false;exported.setVisibility(false);
  const writesBeforeHiddenFrames=activityWrites;
  exported.render(250);exported.render(300);
  assert.equal(frames,5,'offscreen avatar skips GPU submission');
  assert.equal(garmentUpdates,5,'offscreen avatar skips CPU clothing deformation');
  assert.equal(activityWrites,writesBeforeHiddenFrames,'hidden frames do not repeat DOM activity writes');
  exported.setVisibility(true);exported.render(350);
  assert.equal(frames,6,'returning to the avatar resumes rendering');
  assert.equal(garmentUpdates,6);
  env.document.hidden=true;exported.render(400);
  assert.equal(frames,6,'background document skips rig and render work');
  env.document.hidden=false;exported.render(450);
  assert.equal(frames,7,'foreground resumes without rebuilding the scene');
  reducedMotion.matches=true;state.emotePreset='stretch';exported.render(500);
  assert.equal(left.rotation.y,Math.PI*.65,'left shoulder turns in the corrected stretch direction');
  assert.equal(right.rotation.y,-Math.PI*.65,'right shoulder mirrors the corrected stretch rotation');
  assert.equal(root.position.y,env.SOUND_AVATAR_BASE_Y,'stretch keeps both feet grounded');
  assert.equal(left.rotation.order,'ZXY','stretch applies local axial rotation after elevation');
  assert.equal(env.camera.position.z,5.8,'stretch never zooms the athlete smaller');
  assert.ok(lid.visible && lid.scale.y > 0,'stretch carries a gentle eye expression');
  state.emotePreset='bow';exported.render(550);
  assert.equal(torso.rotation.x,.42,'Bow is a visible torso gesture rather than an idle/reset action');
  assert.ok(head.position.z > .4,'head follows the hip hinge instead of floating upright');
  assert.ok(head.position.y < 3,'head lowers with the bow');
  assert.ok(head.rotation.x > torso.rotation.x,'head leads the respectful downward gaze');
  assert.equal(root.position.y,env.SOUND_AVATAR_BASE_Y,'bow never lifts the feet');
  reducedMotion.matches=false;state.emotePreset='wave';
  let wristTravel=0;
  for(let t=600;t<=2600;t+=50){exported.render(t);wristTravel=Math.max(wristTravel,Math.abs(env.wrists[1].rotation.z));}
  assert.ok(wristTravel>.08 && wristTravel<.21,'wave has a small hand-led wrist movement');
  assert.equal(env.elbows[1].rotation.order,'ZXY','palm turn follows the elbow bend rather than changing its plane');
  assert.ok(right.rotation.z<.72,'shoulder stays restrained while the wrist waves');
  reducedMotion.matches=true;state.emotePreset='salute';exported.render(2650);
  assert.equal(env.elbows[1].rotation.z,2.15,'salute folds the forearm toward the brow');
  assert.ok(Math.abs(env.wrists[1].rotation.z)<.05,'salute keeps the wrist straight rather than bending it backward');
  assert.equal(left.rotation.z,.12,'non-saluting arm stays relaxed');
  assert.ok(Math.abs(env.elbows[1].rotation.y)<.05,'salute preserves the forearm plane');
  assert.ok(Math.abs(env.wrists[1].rotation.y-Math.PI)<1e-8,'salute orients the palm without backward wrist flexion');
  reducedMotion.matches=false;state.emotePreset='calm';
  Object.assign(env.camera.position,env.cameraTarget);
  exported.render(2700);
  const idleFrames=frames,idleUpdates=garmentUpdates;
  exported.render(2716);
  assert.equal(frames,idleFrames,'idle skips redundant 60 Hz draw submissions');
  assert.equal(garmentUpdates,idleUpdates,'idle skips redundant mesh deformation');
  exported.render(2750);
  assert.equal(frames,idleFrames+1,'idle still updates at its lower cadence');
  state.active=false;exported.render(2800);
  assert.equal(frames,idleFrames+1,'retained inactive hero does not draw');
  state.active=true;exported.render(2850);
  assert.equal(frames,idleFrames+2,'returning to retained hero resumes the same scene');

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

test('selected and hovered muscle highlights expire without clearing the inspected muscle',()=>{
  const card=fs.readFileSync('components/dashboard/BodyCommandCenterCard.tsx','utf8');
  const ast=ts.createSourceFile('card.tsx',card,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let expression,hoverExpression,pulseEffect;
  function visit(node){
    if(ts.isJsxAttribute(node)&&node.name.getText(ast)==='zoneGlowActive'&&node.initializer?.expression?.getText(ast).includes('avatarSelectionPulse'))expression=node.initializer.expression.getText(ast);
    if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='hoveredBodyPart')hoverExpression=node.initializer.getText(ast);
    if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'&&node.arguments[0]?.getText(ast).includes('avatarSelectionPulseMs'))pulseEffect=node.arguments[0].getText(ast);
    ts.forEachChild(node,visit);
  }
  visit(ast);
  assert.ok(expression);
  const active=new Function('avatarSelectionPulse','avatarMuscleFocusActive','hoveredBodyPart','menuHoveredMuscleInGroup','return '+expression);
  assert.equal(active(false,true,null,null),false);
  assert.equal(active(true,true,null,null),true);
  assert.equal(active(false,false,null,null),false);
  assert.equal(active(false,false,'back',null),false);
  assert.equal(active(false,true,'back','lats'),false,'neither selection nor stationary hover bypasses expiry');
  let lit=false,expired,delay,cleared=false;
  const window={setTimeout(fn,ms){expired=fn;delay=ms;return 1;},clearTimeout(){cleared=true;}};
  const effect=new Function('window','setAvatarSelectionPulse','avatarSelectionPulseToken','avatarHoveredBodyPart','menuHoveredGroup','menuHoveredMuscle','avatarSelectionPulseMs','return ('+pulseEffect+')()');
  const cleanup=effect(window,value=>{lit=value;},1,null,null,'lats',2600);
  assert.equal(lit,true);assert.equal(delay,2600);expired();assert.equal(lit,false);
  cleanup();assert.equal(cleared,true,'a new selection cancels the old timer');
  effect(window,value=>{lit=value;},0,'chest',null,null,2600);
  assert.equal(lit,true,'hover alone starts a bounded preview');expired();assert.equal(lit,false);
  lit=true;
  effect(window,value=>{lit=value;},0,null,null,null,2600);
  assert.equal(lit,false,'leaving an initial hover cannot strand a cancelled preview');
  const hover=new Function('avatarMuscleFocusActive','avatarHoveredBodyPart','menuHoveredGroup','return '+hoverExpression);
  assert.equal(hover(true,'back','back'),null,'restored category focus cannot replace the selected lat');
  assert.equal(hover(false,'back',null),'back');
});

test('shirt and pants are connected skinned surfaces which stay bound through joint motion on both profiles',async()=>{
  const garmentApi={};new Function('exports',ts.transpileModule(fs.readFileSync('components/dashboard/soundFitnessAvatarGarments.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(garmentApi);
  for(const body of ['male','female']) {
    const {THREE,parts,profiles,scene}=await sceneParts();
    scene.position.set(.1,-1.18,0);scene.scale.setScalar(.79);scene.rotation.y=-.08;
    const material=new THREE.MeshStandardMaterial();
    const source=(name,profile,depth,x=0,y=0,angle=0)=>{
      const mesh=parts.get(name);mesh.geometry=new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),48).scale(1,1,depth);
      mesh.position.set(x,y,0);mesh.scale.set(1,1,1);mesh.rotation.set(0,0,angle);
      return {mesh,profile,depth};
    };
    const shirt=[source('torso shirt core',profiles.TEE_PROFILES[body],.6),...['left','right'].map((side,index)=>source(side+' shoulder',profiles.SLEEVE_PROFILE,1,index===0?-.48:.48,2.75,index===0?-.33:.33))];
    const pants=[source('hips',profiles.PELVIS_PROFILES[body],.66),...['left','right'].flatMap((side,index)=>[source(side+' thigh',profiles.THIGH_PROFILE,.92,index===0?-.19:.19),source(side+' shin',profiles.SHIN_PROFILE,.92,index===0?-.19:.19)])];
    for(const sources of [shirt,pants]) {
      const garment=garmentApi.createSoundFitnessGarment(THREE,scene,sources,material,'test garment');
      const geometry=garment.mesh.geometry,position=geometry.getAttribute('position'),weights=geometry.getAttribute('skinWeight'),indices=geometry.index.array;
      assert.ok(position.count>1000&&position.count<30000,'bounded smooth mesh');
      assert.ok([...position.array].every(Number.isFinite));
      const neighbours=Array.from({length:position.count},()=>new Set());
      for(let i=0;i<indices.length;i+=3){const [a,b,c]=[indices[i],indices[i+1],indices[i+2]];neighbours[a].add(b).add(c);neighbours[b].add(a).add(c);neighbours[c].add(a).add(b);}
      const reached=new Set([0]),queue=[0];while(queue.length){for(const next of neighbours[queue.pop()])if(!reached.has(next)){reached.add(next);queue.push(next);}}
      assert.equal(reached.size,position.count,'one continuous garment, no detached body-part islands');
      for(let i=0;i<position.count;i+=137){assert.ok(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)-1)<1e-6);}
      garment.update();garment.mesh.skeleton.update();
      const overlay=new THREE.Mesh(new THREE.PlaneGeometry(.15,.12,2,2),new THREE.MeshBasicMaterial());
      overlay.position.set(0,sources===shirt?2.65:1.8,.1);sources[0].mesh.add(overlay);
      const selection=garment.bindOverlay(overlay);
      assert.equal(selection.skeleton,garment.mesh.skeleton,'highlights use the clothing joints');
      const selectedPosition=selection.geometry.getAttribute('position');
      assert.ok([...selectedPosition.array].every(Number.isFinite));
      assert.ok(selectedPosition.getZ(4)>.15,'highlight is projected out of the body onto the cloth');
      scene.updateMatrixWorld(true);garment.mesh.skeleton.update();
      const selectedPoint=new THREE.Vector3().fromBufferAttribute(selectedPosition,4).applyMatrix4(scene.matrixWorld),outward=new THREE.Vector3(0,0,1).transformDirection(scene.matrixWorld);
      const hit=new THREE.Raycaster(selectedPoint.clone().addScaledVector(outward,.5),outward.clone().negate()).intersectObject(garment.mesh,false)[0];
      assert.ok(hit&&hit.distance>.501,'the actual cloth triangles do not occlude the selection');
      const originals=[];for(let i=0;i<position.count;i+=137){const point=new THREE.Vector3().fromBufferAttribute(position,i);assert.ok(garment.mesh.applyBoneTransform(i,point.clone()).distanceTo(point)<1e-5,'rest binding preserves cloth position');originals.push({i,point});}
      sources[1].mesh.rotation.z+=.7;garment.update();garment.mesh.skeleton.update();
      assert.ok(originals.some(({i,point})=>garment.mesh.applyBoneTransform(i,point.clone()).distanceTo(point)>.01),'the continuous cloth follows the articulated source');
      assert.equal(geometry.index.array,indices,'joint movement never opens a mesh seam');
      garment.dispose();assert.equal(garment.mesh.parent,null);
      selection.removeFromParent();selection.geometry.dispose();selection.material.dispose();
    }
    material.dispose();
  }
});


test('avatar highlights use per-muscle workload status independently of library category colors',()=>{
  const source=fs.readFileSync('components/dashboard/BodyCommandCenterCard.tsx','utf8');
  const ast=ts.createSourceFile('card.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const names=new Set(['sevenDayStatusTheme','bodyPartGroups','muscleMeta','muscleStatusRing','groupStatusRing']);
  let declarations='',colors='';
  function visit(node){
    if(ts.isVariableDeclaration(node)&&names.has(node.name.getText(ast)))declarations+='const '+node.getText(ast)+';\n';
    if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='avatarZoneGlowColors')colors=node.initializer.getText(ast);
    if(ts.isFunctionDeclaration(node)&&['getSevenDayTrainingStatus','getBodyPartGroupLoad'].includes(node.name?.getText(ast)))declarations+=node.getText(ast)+'\n';
    ts.forEachChild(node,visit);
  }
  visit(ast);
  const api={};
  new Function('exports',ts.transpileModule(declarations+'exports.meta=muscleMeta;exports.colors=()=>('+colors+');',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(api);
  assert.equal(api.colors().quads,'#94a3b8','unavailable workload stays neutral');
  api.meta.quadriceps.load={completed:10,target:10,unit:'sets'};
  api.meta.hamstring.load={completed:14,target:10,unit:'sets'};
  assert.equal(api.colors().quads,'#fb923c','target volume uses the prime color');
  assert.equal(api.colors().hamstrings,'#f87171','overworked muscle uses red within the same leg group');
  assert.equal(api.colors().calves,'#94a3b8','missing calf data cannot inherit a sibling status');
});

test('avatar context recovery rebuilds a fresh scene, cancels on restore, and bounds retries',()=>{
  const src=fs.readFileSync('components/dashboard/SoundFitnessAvatar3D.tsx','utf8');
  const ast=ts.createSourceFile('avatar.tsx',src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const declarations=[];
  function visit(node){if(ts.isVariableDeclaration(node)&&['onContextLost','onContextRestored'].includes(node.name.getText(ast)))declarations.push(node.getText(ast));ts.forEachChild(node,visit);}visit(ast);
  const timers=new Map();let next=0,attempt=0,state,ready,cleared=0;
  const window={setTimeout(fn){timers.set(++next,fn);return next;},clearTimeout(id){timers.delete(id);}};
  const recoveryAttempts={current:0},canvas={dataset:{}},exported={};
  const code=ts.transpileModule('let contextLost=false,recoveryTimer;const '+declarations.join(';const ')+';exports.lost=onContextLost;exports.restored=onContextRestored;exports.isLost=()=>contextLost;',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('exports','window','disposed','setLoadState','onReadyChange','recoveryAttempts','setSceneAttempt','clearDashboardWebGlFallback','canvas','setDashboardWebGlCanvasActive','latest',code)(exported,window,false,v=>state=v,v=>ready=v,recoveryAttempts,fn=>attempt=fn(attempt),()=>cleared++,canvas,()=>{}, {current:{active:true,paused:false}});
  const event={preventDefault(){}};
  exported.lost(event);assert.equal(state,'loading');assert.equal(ready,false);assert.equal(exported.isLost(),true);
  exported.restored();assert.equal(timers.size,0);assert.equal(state,'ready');assert.equal(exported.isLost(),false);assert.equal(cleared,1);
  for(let i=0;i<4;i++){exported.lost(event);const fn=timers.get(next);timers.delete(next);fn();}
  assert.equal(attempt,3);assert.equal(state,'error','persistent failures expose manual retry rather than looping forever');
});

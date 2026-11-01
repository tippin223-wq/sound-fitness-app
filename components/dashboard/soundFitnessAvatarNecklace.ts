import type * as Three from "three";

/** Root-space, linked necklace fitted to both skin and clothing at rest. */
export function createAvatarNecklace(THREE: typeof Three, sources: Three.Mesh<Three.BufferGeometry>[], female: boolean, neck: Three.Box3, crest: Three.Texture, color: string) {
  const targets = sources.filter(mesh=>/shirt|skin/.test(mesh.name)).map(source=>{
    const geometry=source.geometry.clone();
    const positions=geometry.getAttribute("position"), morph=geometry.morphAttributes.position?.[0];
    if(female && morph) for(let i=0;i<positions.count;i++) {
      const p=new THREE.Vector3().fromBufferAttribute(positions,i), m=new THREE.Vector3().fromBufferAttribute(morph,i);
      geometry.morphTargetsRelative ? p.add(m) : p.copy(m);
      positions.setXYZ(i,p.x,p.y,p.z);
    }
    geometry.morphAttributes={}; geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.updateMatrixWorld(true);return mesh;
  });
  const ray=new THREE.Raycaster();
  const cx=(neck.min.x+neck.max.x)/2, cz=(neck.min.z+neck.max.z)/2;
  const width=(neck.max.x-neck.min.x)*.54+.015, depth=(neck.max.z-neck.min.z)*.54+.015;
  const top=neck.min.y+.15, drop=.36;
  function surface(x:number,y:number,front:boolean,fallback:number) {
    const sign=front ? 1 : -1;
    ray.set(new THREE.Vector3(x,y,sign*1.5),new THREE.Vector3(0,0,-sign));
    const hits=ray.intersectObjects(targets,false);
    return hits.length ? hits[0].point.z+sign*.025 : fallback;
  }
  // Trace outward around the whole neck, including the side silhouette.
  // Front/back-only rays jumped across the sides and buried the upper links.
  const points=Array.from({length:160},(_,i)=>{
    const angle=i/160*Math.PI*2, dx=Math.sin(angle), dz=Math.cos(angle);
    // The nape sits higher; both sides settle gently toward the collarbone.
    const y=top-drop*Math.pow(Math.max(0,dz),1.35)-.040*dx*dx;
    ray.set(new THREE.Vector3(cx+dx*1.5,y,cz+dz*1.5),new THREE.Vector3(-dx,0,-dz));
    const hit=ray.intersectObjects(targets,false)[0];
    const x=cx+width*dx;
    const frontFit=new THREE.Vector3(x,y,surface(x,y,dz>=0,cz+depth*dz));
    // Use silhouette clearance only as the chain turns around the sides.
    // Chest rays must retain the narrow drape instead of spreading onto shoulders.
    const sideFit=hit ? hit.point.clone().add(new THREE.Vector3(dx*.018,0,dz*.018)) : frontFit.clone();
    const frontBlend=dz > 0 ? THREE.MathUtils.smoothstep(dz,.05,.35) : 0;
    return sideFit.lerp(frontFit,frontBlend);
  });
  // Relax small surface-sampling bumps around the neck without changing
  // the hanging front or the pendant attachment point.
  for(let pass=0;pass<4;pass++) {
    const previous=points.map(p=>p.clone());
    for(let i=0;i<points.length;i++) {
      const facing=Math.cos(i/points.length*Math.PI*2);
      const aroundSide=facing < 0 ? 1 : 1-THREE.MathUtils.smoothstep(facing,.25,.65);
      const average=previous[(i+points.length-1)%points.length].clone().add(previous[(i+1)%points.length]).multiplyScalar(.5);
      points[i].lerp(average,.4*aroundSide);
    }
  }
  const curve=new THREE.CatmullRomCurve3(points,true,"centripetal");
  const group=new THREE.Group();group.name="linked crest necklace";
  const metal=new THREE.MeshStandardMaterial({color,metalness:.92,roughness:.28});
  // Fine deterministic hammered finish, without another downloaded texture.
  metal.onBeforeCompile=shader=>{
    shader.vertexShader="varying vec3 vNecklacePosition;\n"+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>\nvNecklacePosition=position;");
    shader.fragmentShader="varying vec3 vNecklacePosition;\n"+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace("#include <roughnessmap_fragment>","#include <roughnessmap_fragment>\nroughnessFactor+=.07*sin(vNecklacePosition.x*1900.0)*sin(vNecklacePosition.y*1700.0);");
  };
  metal.customProgramCacheKey=()=>"necklace-brushed-metal-v1";
  const linkGeometry=new THREE.TorusGeometry(.009,.0028,7,16);
  linkGeometry.scale(.74,1.18,1);
  const count=Math.max(48,Math.ceil(curve.getLength()/.014));
  const links=new THREE.InstancedMesh(linkGeometry,metal,count);links.name="interlocking oval chain links";links.frustumCulled=false;
  const dummy=new THREE.Object3D();
  for(let i=0;i<count;i++) {
    const t=i/count;dummy.position.copy(curve.getPointAt(t));
    dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),curve.getTangentAt(t).normalize());
    dummy.rotateY(i%2 ? Math.PI/3 : -Math.PI/3);dummy.updateMatrix();links.setMatrixAt(i,dummy.matrix);
  }
  links.instanceMatrix.needsUpdate=true;group.add(links);
  const bottom=points[0];
  // A closed bail overlaps both the lowest chain link and the pendant eyelet.
  const bail=new THREE.Mesh(new THREE.TorusGeometry(.012,.0035,8,24),metal.clone());
  bail.position.copy(bottom).add(new THREE.Vector3(0,-.012,.003));group.add(bail);
  const shield=new THREE.Shape();
  shield.moveTo(-.034,.034);shield.lineTo(.034,.034);shield.lineTo(.030,-.015);shield.quadraticCurveTo(.022,-.035,0,-.045);shield.quadraticCurveTo(-.022,-.035,-.030,-.015);shield.closePath();
  const backing=new THREE.Mesh(new THREE.ExtrudeGeometry(shield,{depth:.006,bevelEnabled:true,bevelSize:.002,bevelThickness:.0015,bevelSegments:2,steps:1}),metal.clone());
  backing.scale.set(1.35,1.35,1);
  backing.position.set(cx,bottom.y-.070,Math.max(bottom.z,surface(cx,bottom.y-.070,true,bottom.z))+.010);group.add(backing);
  const eyelet=new THREE.Mesh(new THREE.TorusGeometry(.006,.0025,7,16),metal.clone());
  eyelet.position.set(cx,bottom.y-.025,backing.position.z+.004);group.add(eyelet);
  const connector=new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(cx,bottom.y-.020,bottom.z+.003),
    new THREE.Vector3(cx,bottom.y-.028,(bottom.z+backing.position.z)/2),
    new THREE.Vector3(cx,bottom.y-.020,backing.position.z+.004)),12,.0032,7,false),metal.clone());
  connector.name="pendant connecting bail";group.add(connector);
  const badge=new THREE.Mesh(new THREE.PlaneGeometry(.094,.108),new THREE.MeshStandardMaterial({color:"#ffffff",map:crest,transparent:true,alphaTest:.03,metalness:.15,roughness:.38,depthWrite:false}));
  badge.name="Sound Fitness crest pendant face";badge.position.copy(backing.position).add(new THREE.Vector3(0,-.003,.009));group.add(badge);
  group.userData.linkCount=count;
  group.userData.frontPoints=points.filter((_,i)=>Math.cos(i/160*Math.PI*2)>=0).map(p=>p.toArray());
  for(const target of targets){target.geometry.dispose();target.material.dispose();}
  return group;
}

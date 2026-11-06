import type * as Three from "three";

/** Sample the selected head morph at forehead height, excluding ears and neck. */
export function fitAvatarHeadgear(THREE: typeof Three, geometry: Three.BufferGeometry, rest: Three.Matrix4, female: boolean, cap = false) {
  const positions=geometry.attributes.position, morph=geometry.morphAttributes.position?.[0];
  const points: Three.Vector3[]=[];
  const bounds=new THREE.Box3();
  for(let i=0;i<positions.count;i++) {
    const point=new THREE.Vector3().fromBufferAttribute(positions,i);
    if(female && morph) {const target=new THREE.Vector3().fromBufferAttribute(morph,i);geometry.morphTargetsRelative ? point.add(target) : point.copy(target);}
    point.applyMatrix4(rest);points.push(point);bounds.expandByPoint(point);
  }
  const bandY=bounds.max.y-(bounds.max.y-bounds.min.y)*(cap ? .36 : .27);
  const section=new THREE.Box3();
  for(const point of points)if(Math.abs(point.y-bandY)<.015)section.expandByPoint(point);
  const center=section.getCenter(new THREE.Vector3());
  return {cx:center.x,cz:center.z,bandY,radius:(section.max.x-section.min.x)/2+.003,depth:(section.max.z-section.min.z)/2+.003,crownHeight:bounds.max.y-bandY+.004};
}

/** Build the crown from the selected scalp surface instead of an intersecting ellipsoid. */
export function createAvatarCapGeometry(THREE: typeof Three, geometry: Three.BufferGeometry, rest: Three.Matrix4, female: boolean, bandY: number) {
  const surface=geometry.clone();
  const source=geometry.attributes.position, morph=geometry.morphAttributes.position?.[0];
  const positions=new Float32Array(source.count*3);
  for(let i=0;i<source.count;i++) {
    const p=new THREE.Vector3().fromBufferAttribute(source,i);
    if(female && morph) {const target=new THREE.Vector3().fromBufferAttribute(morph,i);geometry.morphTargetsRelative ? p.add(target) : p.copy(target);}
    p.applyMatrix4(rest).toArray(positions,i*3);
  }
  surface.setAttribute('position',new THREE.BufferAttribute(positions,3));
  surface.morphAttributes={};surface.computeVertexNormals();
  const normal=surface.attributes.normal,index=surface.index;
  const fit=fitAvatarHeadgear(THREE,geometry,rest,female,true);
  const output:number[]=[];
  const point=(i:number)=>{
    const p=new THREE.Vector3().fromBufferAttribute(surface.attributes.position,i)
      .addScaledVector(new THREE.Vector3().fromBufferAttribute(normal,i),.012);
    // Structured fabric has room at the temples and crown, unlike a swim cap.
    p.x=fit.cx+(p.x-fit.cx)*1.10;
    p.z=fit.cz+(p.z-fit.cz)*1.07;
    p.y=bandY+(p.y-bandY)*1.10;
    return p;
  };
  for(let i=0;i<(index?.count ?? source.count);i+=3) {
    const polygon=[0,1,2].map(j=>point(index ? index.getX(i+j) : i+j));
    const clipped:Three.Vector3[]=[];
    for(let j=0;j<3;j++) {
      const a=polygon[j],b=polygon[(j+1)%3];
      if(a.y>=bandY)clipped.push(a);
      if((a.y>=bandY)!==(b.y>=bandY))clipped.push(a.clone().lerp(b,(bandY-a.y)/(b.y-a.y)));
    }
    // Open-bottom rear arch lets the ponytail pass through the cap.
    const outside=(p:Three.Vector3)=>p.z>fit.cz-fit.depth*.40 ? 1 : ((p.x-fit.cx)/.065)**2+((p.y-bandY)/.13)**2-1;
    const notched:Three.Vector3[]=[];
    for(let j=0;j<clipped.length;j++) {
      const a=clipped[j],b=clipped[(j+1)%clipped.length],fa=outside(a),fb=outside(b);
      if(fa>=0)notched.push(a);
      if((fa>=0)!==(fb>=0))notched.push(a.clone().lerp(b,fa/(fa-fb)));
    }
    clipped.splice(0,clipped.length,...notched);
    for(let j=1;j<clipped.length-1;j++)for(const p of [clipped[0],clipped[j],clipped[j+1]])output.push(p.x,p.y,p.z);
    // Turn the cut edge inward and down to give the hat a visible sewn rim.
    for(let j=0;j<clipped.length;j++) {
      const a=clipped[j],b=clipped[(j+1)%clipped.length];
      if(Math.abs(a.y-bandY)>1e-6 || Math.abs(b.y-bandY)>1e-6)continue;
      const inner=(p:Three.Vector3)=>new THREE.Vector3(fit.cx+(p.x-fit.cx)*.965,bandY-.012,fit.cz+(p.z-fit.cz)*.965);
      const ai=inner(a),bi=inner(b);
      for(const p of [a,ai,b,b,ai,bi])output.push(p.x,p.y,p.z);
    }
  }
  surface.dispose();
  // Weld shared triangle corners so the scalp-derived crown shades smoothly.
  const unique:number[]=[],indices:number[]=[],lookup=new Map<string,number>();
  for(let i=0;i<output.length;i+=3) {
    const key=output.slice(i,i+3).map(v=>Math.round(v*1e6)).join(',');
    let id=lookup.get(key);
    if(id===undefined){id=unique.length/3;lookup.set(key,id);unique.push(...output.slice(i,i+3));}
    indices.push(id);
  }
  const uv:number[]=[];
  for(let i=0;i<unique.length;i+=3)uv.push(.5+Math.atan2(unique[i]-fit.cx,unique[i+2]-fit.cz)/(Math.PI*2),(unique[i+1]-bandY)/fit.crownHeight);
  const crown=new THREE.BufferGeometry();crown.setAttribute('position',new THREE.Float32BufferAttribute(unique,3));crown.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));crown.setIndex(indices);crown.computeVertexNormals();
  return crown;
}

/** A curved, solid bill, with its rear edge following the forehead arc. */
export function createAvatarCapBrimGeometry(THREE: typeof Three, fit: ReturnType<typeof fitAvatarHeadgear>, crown?: Three.BufferGeometry) {
  const crownMesh=crown ? new THREE.Mesh(crown,new THREE.MeshBasicMaterial({side:THREE.DoubleSide})) : null;
  crownMesh?.updateMatrixWorld(true);
  const ray=new THREE.Raycaster();
  const positions:number[]=[],uv:number[]=[],indices:number[]=[],segments=40,rows=8;
  const attachmentZ=(x:number)=>{
    let z=fit.cz+fit.depth*Math.sqrt(Math.max(0,1-(x/(fit.radius*.94))**2*.83));
    if(crownMesh){ray.set(new THREE.Vector3(fit.cx+x,fit.bandY+.004,fit.cz+1),new THREE.Vector3(0,0,-1));const hit=ray.intersectObject(crownMesh)[0];if(hit)z=hit.point.z-.020;}
    return z;
  };
  const halfWidth=fit.radius*.94;
  const cornerZ=(attachmentZ(-halfWidth)+attachmentZ(halfWidth))/2;
  const arcDepth=fit.cz+fit.depth+.155-cornerZ;
  for(let layer=0;layer<2;layer++)for(let row=0;row<=rows;row++)for(let col=0;col<=segments;col++) {
    const angle=(col/segments-.5)*Math.PI,t=row/rows;
    const x=Math.sin(angle)*halfWidth,round=Math.max(0,Math.cos(angle)),travel=t*round;
    const rootZ=attachmentZ(x);
    // One analytic ellipse defines the entire front edge, independent of the
    // sampled forehead mesh. No blended shoulders, point, or flat middle.
    const frontZ=cornerZ+arcDepth*round;
    positions.push(fit.cx+x,fit.bandY+.008*(1-travel)-.008*(x/halfWidth)**2*travel-.018*travel*travel-layer*.007,rootZ+(frontZ-rootZ)*t);
    uv.push(col/segments,t);
  }
  const stride=segments+1,layerSize=(rows+1)*stride;
  for(let layer=0;layer<2;layer++)for(let row=0;row<rows;row++)for(let col=0;col<segments;col++) {
    const a=layer*layerSize+row*stride+col,b=a+1,c=a+stride,d=c+1;
    indices.push(...(layer===0?[a,c,b,b,c,d]:[a,b,c,b,d,c]));
  }
  const edge:number[]=[];
  for(let c=0;c<=segments;c++)edge.push(c);
  for(let r=1;r<=rows;r++)edge.push(r*stride+segments);
  for(let c=segments-1;c>=0;c--)edge.push(rows*stride+c);
  for(let r=rows-1;r>0;r--)edge.push(r*stride);
  for(let i=0;i<edge.length;i++){const a=edge[i],b=edge[(i+1)%edge.length];indices.push(a,b,a+layerSize,b,b+layerSize,a+layerSize);}
  crownMesh?.material.dispose();
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

/** Project the badge onto the real curved crown instead of placing a floating disc. */
export function createAvatarCapBadgeGeometry(THREE: typeof Three, crown: Three.BufferGeometry, fit: ReturnType<typeof fitAvatarHeadgear>) {
  const badge=new THREE.RingGeometry(0,fit.radius*.32,48,8);
  const mesh=new THREE.Mesh(crown,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(),p=badge.attributes.position;
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i)+fit.cx,y=p.getY(i)+fit.bandY+fit.crownHeight*.40;
    ray.set(new THREE.Vector3(x,y,fit.cz+1),new THREE.Vector3(0,0,-1));
    const hit=ray.intersectObject(mesh)[0];
    const v=hit ? hit.point.clone().addScaledVector(hit.face!.normal,.001) : new THREE.Vector3(x,y,fit.cz+fit.depth);
    p.setXYZ(i,v.x,v.y,v.z);
  }
  mesh.material.dispose();badge.computeVertexNormals();return badge;
}

/** Raised panel stitching, lower welt, top button, and rear snap closure. */
export function createAvatarCapDetails(THREE: typeof Three, crown: Three.BufferGeometry, brim: Three.BufferGeometry, fit: ReturnType<typeof fitAvatarHeadgear>) {
  const group=new THREE.Group();group.name='snapback details';
  const thread=new THREE.MeshStandardMaterial({color:'#354253',roughness:1,metalness:0});
  const fabric=new THREE.MeshStandardMaterial({color:'#111b2a',roughness:.98,metalness:0});
  const surface=new THREE.Mesh(crown,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));surface.updateMatrixWorld(true);
  crown.computeBoundingBox();const top=crown.boundingBox!.max.y;
  const ray=new THREE.Raycaster();
  const trace=(angle:number,y:number)=>{
    const dir=new THREE.Vector3(Math.sin(angle),0,Math.cos(angle));
    ray.set(new THREE.Vector3(fit.cx+dir.x,y,fit.cz+dir.z),dir.clone().negate());
    const hit=ray.intersectObject(surface)[0];
    return hit ? hit.point.clone().addScaledVector(hit.face!.normal,.0015) : null;
  };
  const line=(name:string,points:Three.Vector3[],radius=.0011)=>{
    if(points.length<2)return;
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(12,points.length*2),radius,5,false),thread);mesh.name=name;group.add(mesh);
  };
  for(let panel=0;panel<6;panel++){
    const points:Three.Vector3[]=[];
    for(let i=0;i<24;i++){const p=trace((panel+.5)*Math.PI/3,fit.bandY+.014+(top-fit.bandY-.018)*i/23);if(p)points.push(p);}
    line('cap panel seam '+panel,points);
  }
  let welt:Three.Vector3[]=[];
  for(let i=0;i<=96;i++){const p=trace(i/96*Math.PI*2,fit.bandY+.005);if(p)welt.push(p);else{line('cap lower welt',welt,.0017);welt=[];}}
  line('cap lower welt',welt,.0017);
  for(const row of [5,7]){const points:Three.Vector3[]=[];for(let col=1;col<40;col++)points.push(new THREE.Vector3().fromBufferAttribute(brim.attributes.position,row*41+col).add(new THREE.Vector3(0,.0015,0)));line('bill stitch row '+row,points,.0008);}
  const button=new THREE.Mesh(new THREE.SphereGeometry(.009,20,10),fabric);button.scale.y=.45;button.position.set(fit.cx,top+.002,fit.cz);button.name='cap top button';group.add(button);
  const strap=new THREE.Mesh(new THREE.BoxGeometry(.125,.018,.008),fabric);strap.position.set(fit.cx,fit.bandY+.002,fit.cz-fit.depth*1.10);strap.name='rear snapback strap';group.add(strap);
  for(let i=0;i<6;i++){const snap=new THREE.Mesh(new THREE.SphereGeometry(.0022,8,6),thread);snap.position.set(fit.cx-.042+i*.016,fit.bandY+.002,strap.position.z-.005);snap.name='snapback adjustment stud';group.add(snap);}
  surface.material.dispose();return group;
}

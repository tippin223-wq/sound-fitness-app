import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute, Mesh, Vector3, Quaternion } from 'three';

// Only CC0 asset data is used. No MakeHuman application code is incorporated.
const directory = new URL('./assets/makehuman-head/', import.meta.url);
export const bodyBindings = ['torso shirt core','hips','left upper arm','left forearm','left hand','right upper arm','right forearm','right hand','left thigh','left shin','right thigh','right shin','neck'];
const smooth = (a,b,x) => { const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t); };
function parseObj(text) {
  const positions=[], uvs=[], groups={};let group='default';
  for(const line of text.split(/\r?\n/)) {
    if(line.startsWith('v ')) positions.push(line.slice(2).trim().split(/\s+/).map(Number));
    else if(line.startsWith('vt ')) uvs.push(line.slice(3).trim().split(/\s+/).map(Number));
    else if(line.startsWith('g ')) group=line.slice(2).trim();
    else if(line.startsWith('f ')) {
      const corners=line.slice(2).trim().split(/\s+/).map(v=>v.split('/').map(Number));
      const face=corners.map(v=>v[0]-1);face.uv=corners.map(v=>v[1]-1);(groups[group]??=[]).push(face);
    }
  }
  return {positions,uvs,groups};
}
export async function addAuthoredBody(avatar, materials) {
  const provenance=JSON.parse(await readFile(new URL('body-provenance.json',directory),'utf8'));
  for(const [name,hash] of Object.entries(provenance.files)) {
    const bytes=await readFile(new URL(name,directory));
    if(createHash('sha256').update(bytes).digest('hex')!==hash)throw Error(`Unexpected authored asset: ${name}`);
  }
  const source=await readFile(new URL('base.obj',directory),'utf8');
  if(createHash('sha256').update(source).digest('hex')!=='8e761e6624b8f54536409135d1636da63b32486a90d4897f84e121d144f6fb4c') throw Error('Unexpected MakeHuman base mesh');
  const base=parseObj(source), clothing=parseObj(await readFile(new URL('male_casualsuit06.obj',directory),'utf8'));
  const fitting=await readFile(new URL('male_casualsuit06.mhclo',directory),'utf8');
  const fits=fitting.split('verts 0')[1].split('delete_verts')[0].trim().split(/\r?\n/).filter(l=>/^\d/.test(l)).map(l=>l.trim().split(/\s+/).map(Number));
  const landmarks=Object.fromEntries(Object.entries(base.groups).filter(([k])=>k.startsWith('joint-')).map(([k,faces])=>[k,[...new Set(faces.flat())]]));
  const profiles={};
  for(const sex of ['male','female']) {
    const vertices=base.positions.map(v=>v.slice());
    for(const file of [`african-${sex}-young.target`,`universal-${sex}-young-averagemuscle-averageweight.target`]) {
      for(const line of (await readFile(new URL(file,directory),'utf8')).split(/\r?\n/)) {
        if(!/^\d/.test(line)) continue;
        const [id,...delta]=line.trim().split(/\s+/).map(Number);delta.forEach((v,i)=>vertices[id][i]+=v);
      }
    }
    const ids=[...new Set(base.groups.body.flat())];
    const bottom=Math.min(...ids.map(id=>vertices[id][1])),top=Math.max(...ids.map(id=>vertices[id][1]));
    const scale=3.40/(top-bottom);
    const normalize=v=>new Vector3(v[0]*scale,(v[1]-bottom)*scale,v[2]*scale);
    const joint=name=>landmarks[name].reduce((sum,id)=>sum.add(new Vector3(...vertices[id])),new Vector3()).multiplyScalar(1/landmarks[name].length);
    const arms=[-1,1].map(sign=>{
      const sourceSide=sign<0?'r':'l';
      const s=normalize(joint(`joint-${sourceSide}-shoulder`).toArray()),e=normalize(joint(`joint-${sourceSide}-elbow`).toArray()),w=normalize(joint(`joint-${sourceSide}-hand`).toArray());
      const ts=new Vector3(sign*.45,2.72,0),te=new Vector3(sign*.55,2.25,0),tw=new Vector3(sign*.60,1.79,.015);
      const mapping=(a,b,c,d)=>{const from=b.clone().sub(a),to=d.clone().sub(c);return p=>p.clone().sub(a).applyQuaternion(new Quaternion().setFromUnitVectors(from.clone().normalize(),to.clone().normalize())).multiplyScalar(to.length()/from.length()).add(c);};
      return {s,e,w,upper:mapping(s,e,ts,te),lower:mapping(e,w,te,tw)};
    });
    const transform=raw=>{
      const p=normalize(raw),sign=p.x<0?-1:1,arm=arms[sign<0?0:1];
      const armAmount=smooth(.28,.43,Math.abs(p.x)) * Math.max(smooth(1.85,2.1,p.y),smooth(.48,.58,Math.abs(p.x)));
      const axis=arm.e.clone().sub(arm.s),along=p.clone().sub(arm.s).dot(axis)/axis.lengthSq();
      const elbow=smooth(.76,1.19,along);
      const posed=arm.upper(p).lerp(arm.lower(p),elbow);
      const center=p.clone();center.x*=sex==='female'?1:1.06;
      // Bring the original wide A-stance under the hips, leaving feet planted.
      if(center.y<1.83) center.x-=sign*(1-smooth(.12,1.83,center.y))*.20;
      center.lerp(posed,armAmount);
      return {point:center,armAmount,elbow,wrist:smooth(1.60,1.80,along),sign};
    };
    const weights=raw=>{
      const {point:p,armAmount,elbow,wrist,sign}=transform(raw), result=new Map();
      const put=(id,w)=>result.set(id,(result.get(id)??0)+w);
      const offset=sign<0?2:5;
      put(offset,armAmount*(1-elbow));put(offset+1,armAmount*elbow*(1-wrist));put(offset+2,armAmount*elbow*wrist);
      const rest=1-armAmount;
      if(p.y>2.83) {const neck=smooth(2.83,2.98,p.y);put(12,rest*neck);put(0,rest*(1-neck));}
      else if(p.y>1.76) {const torso=smooth(1.76,2.05,p.y);put(0,rest*torso);put(1,rest*(1-torso));}
      else {const hip=smooth(1.55,1.80,p.y),knee=smooth(.90,1.10,p.y),leg=sign<0?8:10;put(1,rest*hip);put(leg,rest*(1-hip)*knee);put(leg+1,rest*(1-hip)*(1-knee));}
      const sorted=[...result].filter(([,w])=>w>0).sort((a,b)=>b[1]-a[1]).slice(0,4),total=sorted.reduce((s,[,w])=>s+w,0);
      return Array.from({length:4},(_,i)=>[sorted[i]?.[0]??0,(sorted[i]?.[1]??0)/total]);
    };
    const scales=['x','y','z'].map((axis,i)=>{const match=fitting.match(new RegExp(`${axis}_scale (\\d+) (\\d+) ([\\d.]+)`));return match?Math.abs(vertices[Number(match[1])][i]-vertices[Number(match[2])][i])/Number(match[3]):1;});
    const cloth=fits.map(row=>row.length===1?vertices[row[0]].slice():[0,1,2].map(i=>vertices[row[0]][i]*row[3]+vertices[row[1]][i]*row[4]+vertices[row[2]][i]*row[5]+row[6+i]*scales[i]));
    profiles[sex]={vertices,cloth,transform,weights,eyes:[-1,1].map(sign=>transform(joint(`joint-${sign<0?'r':'l'}-eye`).toArray()).point.toArray())};
  }
  const triangulate=faces=>faces.flatMap(f=>Array.from({length:f.length-2},(_,i)=>{const face=[f[0],f[i+1],f[i+2]];face.uv=[f.uv[0],f.uv[i+1],f.uv[i+2]];return face;}));
  const hidden=new Set();
  const mask=(fitting.split('delete_verts')[1]??'').trim().split(/\s+/);
  for(let i=0;i<mask.length;i++) {
    const start=Number(mask[i]);if(!Number.isInteger(start))continue;
    if(mask[i+1]==='-'){const end=Number(mask[i+2]);for(let id=start;id<=end;id++)hidden.add(id);i+=2;}
    else hidden.add(start);
  }
  const bodyFaces=triangulate(base.groups.body).filter(face=>
    !face.every(id=>profiles.male.transform(profiles.male.vertices[id]).point.y>2.96) &&
    face.every(id=>{const {point,armAmount}=profiles.male.transform(profiles.male.vertices[id]);return (armAmount>.65&&!hidden.has(id))||point.y>2.78;}));
  const clothFaces=triangulate(Object.values(clothing.groups).flat());
  const neighbors=Array.from({length:clothing.positions.length},()=>new Set());
  for(const [a,b,c] of clothFaces){neighbors[a].add(b).add(c);neighbors[b].add(a).add(c);neighbors[c].add(a).add(b);}
  const shirtVertices=new Set(),seen=new Set();
  for(let i=0;i<neighbors.length;i++) {
    if(seen.has(i))continue;
    const component=[],queue=[i];seen.add(i);
    while(queue.length){const id=queue.pop();component.push(id);for(const next of neighbors[id])if(!seen.has(next)){seen.add(next);queue.push(next);}}
    if(Math.max(...component.map(id=>profiles.male.transform(profiles.male.cloth[id]).point.y))>2.35)component.forEach(id=>shirtVertices.add(id));
  }
  for(const [name,faces,kind,material] of [
    ['head sculpt',triangulate(base.groups.body).filter(face=>face.every(id=>profiles.male.transform(profiles.male.vertices[id]).point.y>2.96)),'vertices',materials.skin],
    ['authored human skin',bodyFaces,'vertices',materials.skin],
    ['authored performance shirt',clothFaces.filter(f=>shirtVertices.has(f[0])),'cloth',materials.shirt],
    ['authored training pants',clothFaces.filter(f=>!shirtVertices.has(f[0])),'cloth',materials.pants],
  ]) {
    const lookup=new Map(),used=[],triangles=[];
    for(const face of faces)for(let i=0;i<3;i++) {
      const id=face[i],uv=face.uv[i],key=`${id}:${uv}`;
      if(!lookup.has(key)){lookup.set(key,used.length);used.push({id,uv});}
      triangles.push(lookup.get(key));
    }
    const positions=sex=>used.flatMap(({id})=>profiles[sex].transform(profiles[sex][kind][id]).point.toArray());
    const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions('male'),3));
    geometry.setIndex(triangles);
    geometry.setAttribute('uv',new Float32BufferAttribute(used.flatMap(({uv})=>(kind==='cloth'?clothing:base).uvs[uv].slice(0,2)),2));
    const pairs=used.map(({id})=>profiles.male.weights(profiles.male[kind][id]));
    geometry.setAttribute('skinIndex',new Uint16BufferAttribute(pairs.flatMap(v=>v.map(([id])=>id)),4));
    geometry.setAttribute('skinWeight',new Float32BufferAttribute(pairs.flatMap(v=>v.map(([,w])=>w)),4));
    geometry.morphAttributes.position=[new Float32BufferAttribute(positions('female'),3)];
    geometry.computeVertexNormals();
    // Preserve smooth shading across texture seams.
    const normal=geometry.attributes.normal,sums=new Map();
    used.forEach(({id},i)=>{const sum=sums.get(id)??new Vector3();sum.add(new Vector3().fromBufferAttribute(normal,i));sums.set(id,sum);});
    used.forEach(({id},i)=>normal.setXYZ(i,...sums.get(id).normalize().toArray()));
    if(name==='head sculpt') {
      const head=avatar.children.find(mesh=>mesh.name===name);
      head.geometry.dispose();head.geometry=geometry;head.position.set(0,0,0);head.scale.set(1,1,1);head.rotation.set(0,0,0);head.updateMorphTargets();
      head.userData={source:'MakeHuman Community CC0 adult facial topology',eyePositions:profiles.male.eyes,authoredFace:true};
      continue;
    }
    const mesh=new Mesh(geometry,material);mesh.name=name;mesh.updateMorphTargets();
    mesh.userData={authoredHuman:true,bindings:bodyBindings,source:'MakeHuman CC0 body and male_casualsuit06',license:'CC0-1.0'};
    avatar.add(mesh);
    console.log(`${name}: ${used.length} vertices / ${faces.length} triangles`);
  }
  return {eyes:profiles.male.eyes};
}

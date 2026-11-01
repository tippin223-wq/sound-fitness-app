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
    if(sex==='female') {
      // Relax the cheek surface itself, retaining the eyes, lips and neck
      // boundary. Moving a single band only leaves a ridge beside it.
      const adjacent=Array.from({length:vertices.length},()=>new Set());
      for(const face of base.groups.body)for(let i=0;i<face.length;i++) {
        const a=face[i],b=face[(i+1)%face.length];
        adjacent[a].add(b);adjacent[b].add(a);
      }
      for(let pass=0;pass<2;pass++) {
        const previous=vertices.map(v=>v.slice());
        for(const id of ids) {
          const [x,y,z]=previous[id].map((v,i)=>i===1?(v-bottom)*scale:v*scale);
          const sideWeight=.22*smooth(.025,.065,Math.abs(x));
          const mouthWeight=.12*(1-smooth(.025,.065,Math.abs(x)))*(1-smooth(3.10,3.14,y));
          const amount=(sideWeight+mouthWeight)*(1-smooth(.15,.20,Math.abs(x)))*smooth(2.985,3.025,y)*(1-smooth(3.145,3.18,y))*smooth(.04,.13,z);
          if(!amount||!adjacent[id].size)continue;
          for(let axis=0;axis<3;axis++) {
            const average=[...adjacent[id]].reduce((sum,n)=>sum+previous[n][axis],0)/adjacent[id].size;
            vertices[id][axis]=previous[id][axis]+amount*(average-previous[id][axis]);
          }
        }
      }
    }
    const normalize=v=>new Vector3(v[0]*scale,(v[1]-bottom)*scale,v[2]*scale);
    const joint=name=>landmarks[name].reduce((sum,id)=>sum.add(new Vector3(...vertices[id])),new Vector3()).multiplyScalar(1/landmarks[name].length);
    const arms=[-1,1].map(sign=>{
      const sourceSide=sign<0?'r':'l';
      const s=normalize(joint(`joint-${sourceSide}-shoulder`).toArray()),e=normalize(joint(`joint-${sourceSide}-elbow`).toArray()),w=normalize(joint(`joint-${sourceSide}-hand`).toArray());
      const ts=new Vector3(sign*.45,2.72,0),te=new Vector3(sign*.55,2.25,0),tw=new Vector3(sign*.60,1.79,.015);
      const mapping=(a,b,c,d)=>{const from=b.clone().sub(a),to=d.clone().sub(c);return p=>p.clone().sub(a).applyQuaternion(new Quaternion().setFromUnitVectors(from.clone().normalize(),to.clone().normalize())).multiplyScalar(to.length()/from.length()).add(c);};
      return {s,e,w,upper:mapping(s,e,ts,te),lower:mapping(e,w,te,tw)};
    });
    const femaleEyeHeight=normalize(joint('joint-r-eye').toArray()).y;
    const mouthHeight=(normalize(joint('joint-mouth').toArray()).y+normalize(joint('joint-jaw').toArray()).y)/2;
    const transform=(raw, allowArms=true, fabric=false)=>{
      const p=normalize(raw),sign=p.x<0?-1:1,arm=arms[sign<0?0:1];
      const armAmount=(allowArms ? 1 : 0)*smooth(.28,.43,Math.abs(p.x)) * Math.max(smooth(1.85,2.1,p.y),smooth(.48,.58,Math.abs(p.x)));
      const axis=arm.e.clone().sub(arm.s),along=p.clone().sub(arm.s).dot(axis)/axis.lengthSq();
      const elbow=smooth(.76,1.19,along);
      const posed=arm.upper(p).lerp(arm.lower(p),elbow);
      const center=p.clone();center.x*=sex==='female'?1:1.06;
      // Bring the original wide A-stance under the hips, leaving feet planted.
      if(center.y<1.83) center.x-=sign*(1-smooth(.12,1.83,center.y))*.20;
      center.lerp(posed,armAmount);
      if (sex === 'female') {
        // Shape body and fabric together, with smooth transitions through
        // the sleeve/chest seam instead of attaching separate bust meshes.
        const upper = smooth(2.15,2.60,center.y) * (1-smooth(2.84,2.98,center.y));
        center.x *= 1 - .12 * upper;
        center.x -= sign * .035 * armAmount * (1-smooth(2.84,2.98,center.y));
        const waist = Math.exp(-Math.pow((center.y-2.15)/.20,2));
        center.x *= 1 - .035 * waist * (1-armAmount);
        // Keep supported chest volume above the lower ribs. A soft depth
        // taper below it avoids a projecting shelf in the side silhouette.
        const lowerRibs = Math.exp(-Math.pow((center.y-2.28)/.145,2)) * (1-armAmount);
        center.z = .06 + (center.z-.06) * (1-.16*lowerRibs);
        const chest = Math.exp(-Math.pow((center.y-2.52)/.185,2)) * smooth(2.22,2.43,center.y);
        // Rounded, modest contours with a soft fabric span between them.
        const bust = Math.exp(-Math.pow((Math.abs(center.x)-.165)/.17,2));
        const front = smooth(.02,.14,center.z);
        const shirtBridge = fabric ? .035 * Math.exp(-Math.pow(center.x/.12,2)) : 0;
        center.z += (.125 * bust + shirtBridge) * chest * front * (1-armAmount);
        // Sculpt the female head from her own eye landmarks, not fixed male heights.
        // Keep the boundary untouched so the continuous neck remains closed.
        // Rain turnaround: a distinct cranium over a tapered neck, with a
        // compact, softly rounded lower face rather than a long pinched jaw.
        const neck=smooth(2.80,2.89,center.y)*(1-smooth(2.98,3.035,center.y));
        const neckCenter=1-smooth(.13,.22,Math.abs(center.x));
        center.x*=1-.18*neck*neckCenter;
        center.z=.08+(center.z-.08)*(1-.14*neck*neckCenter);
        // Preserve the authored female facial planes and lip anatomy.
        // Stacked local cheek, chin and lip warps created competing ridges.
        const seam=smooth(2.965,3.025,center.y);
        const lowerFace=1-smooth(3.025,3.20,center.y);
        center.x*=1-.22*lowerFace*seam;
        const oralRegion=Math.exp(-Math.pow((center.y-mouthHeight)/.065,2))*Math.exp(-Math.pow(center.x/.095,4))*smooth(.05,.15,center.z);
        center.z-=.020*oralRegion;



      }
      return {point:center,armAmount,elbow,wrist:smooth(1.60,1.80,along),sign};
    };
    const weights=(raw, allowArms=true)=>{
      const {point:p,armAmount,elbow,wrist,sign}=transform(raw,allowArms), result=new Map();
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
    profiles[sex]={vertices,cloth,transform,weights,mouth:[0,mouthHeight,0],eyes:[-1,1].map(sign=>transform(joint(`joint-${sign<0?'r':'l'}-eye`).toArray()).point.toArray())};
  }
  const triangulate=faces=>faces.flatMap(f=>Array.from({length:f.length-2},(_,i)=>{const face=[f[0],f[i+1],f[i+2]];face.uv=[f.uv[0],f.uv[i+1],f.uv[i+2]];return face;}));
  // Compute skin normals across the complete surface before separating the head.
  // Recomputing each cut piece independently creates a dark collar at the shared seam.
  const fullSkin = new BufferGeometry();
  fullSkin.setAttribute('position',new Float32BufferAttribute(profiles.male.vertices.flatMap(v=>profiles.male.transform(v).point.toArray()),3));
  fullSkin.setIndex(triangulate(base.groups.body).flatMap(face=>Array.from(face)));
  fullSkin.computeVertexNormals();
  const fullSkinNormals=fullSkin.attributes.normal;
  const femaleSkin=new BufferGeometry();
  femaleSkin.setAttribute('position',new Float32BufferAttribute(profiles.female.vertices.flatMap(v=>profiles.female.transform(v).point.toArray()),3));
  femaleSkin.setIndex(fullSkin.index.clone());femaleSkin.computeVertexNormals();
  const femaleNormals=femaleSkin.attributes.normal;

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
    const positions=sex=>used.flatMap(({id})=>profiles[sex].transform(profiles[sex][kind][id],name!=='authored training pants',name==='authored performance shirt').point.toArray());
    const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions('male'),3));
    geometry.setIndex(triangles);
    geometry.setAttribute('uv',new Float32BufferAttribute(used.flatMap(({uv})=>(kind==='cloth'?clothing:base).uvs[uv].slice(0,2)),2));
    const pairs=used.map(({id})=>profiles.male.weights(profiles.male[kind][id],name!=='authored training pants'));
    geometry.setAttribute('skinIndex',new Uint16BufferAttribute(pairs.flatMap(v=>v.map(([id])=>id)),4));
    geometry.setAttribute('skinWeight',new Float32BufferAttribute(pairs.flatMap(v=>v.map(([,w])=>w)),4));
    geometry.morphAttributes.position=[new Float32BufferAttribute(positions('female'),3)];
    geometry.computeVertexNormals();
    // Preserve smooth shading across texture seams.
    const normal=geometry.attributes.normal,sums=new Map();
    used.forEach(({id},i)=>{const sum=sums.get(id)??new Vector3();sum.add(new Vector3().fromBufferAttribute(normal,i));sums.set(id,sum);});
    used.forEach(({id},i)=>normal.setXYZ(i,...sums.get(id).normalize().toArray()));
    if(kind==='vertices')used.forEach(({id},i)=>normal.setXYZ(i,fullSkinNormals.getX(id),fullSkinNormals.getY(id),fullSkinNormals.getZ(id)));
    if(kind==='vertices')geometry.morphAttributes.normal=[new Float32BufferAttribute(used.flatMap(({id})=>[femaleNormals.getX(id),femaleNormals.getY(id),femaleNormals.getZ(id)]),3)];

    if(name==='head sculpt') {
      const head=avatar.children.find(mesh=>mesh.name===name);
      // Expressions deform the authored lips/cheeks/brow, not an old overlay smile.
      const eyeY=profiles.male.eyes[0][1], mouthY=profiles.male.mouth[1];
      for(const expression of ['bright','focused','defined']) {
        const delta=[];
        for(let i=0;i<geometry.attributes.position.count;i++) {
          const x=geometry.attributes.position.getX(i),y=geometry.attributes.position.getY(i),z=geometry.attributes.position.getZ(i);
          const front=smooth(.04,.15,z);
          const mouth=Math.exp(-Math.pow((y-mouthY)/.032,2))*Math.exp(-Math.pow(x/.090,4))*front;
          const corner=smooth(0,.09,Math.abs(x));
          const cheek=Math.exp(-Math.pow((y-(eyeY-.07))/.065,2))*Math.exp(-Math.pow((Math.abs(x)-.10)/.055,2))*front;
          const jaw=Math.exp(-Math.pow((y-(mouthY-.09))/.09,2))*smooth(2.98,3.04,y);
          const brow=Math.exp(-Math.pow((y-(eyeY+.045))/.035,2))*front;
          const lipCenter=Math.exp(-Math.pow(x/.055,2))*mouth;
          delta.push(expression==='defined'?x*.13*jaw:expression==='bright'?x*.020*mouth:0,
            expression==='bright'?.017*mouth*corner:expression==='focused'?-.012*brow*Math.exp(-Math.pow(x/.09,2))-.004*mouth:expression==='defined'?.010*mouth*corner+.014*brow:0,
            expression==='bright'?-.004*mouth*corner:expression==='focused'?-.004*lipCenter:expression==='defined'?.012*jaw*front+.003*cheek:0);
        }
        geometry.morphAttributes.position.push(new Float32BufferAttribute(delta,3));
      }
      // GLTF export converts absolute morphs to deltas; match the existing absolute female target.
      for(let target=1;target<geometry.morphAttributes.position.length;target++) {
        const morph=geometry.morphAttributes.position[target],base=geometry.attributes.position;
        for(let i=0;i<base.count;i++)morph.setXYZ(i,morph.getX(i)+base.getX(i),morph.getY(i)+base.getY(i),morph.getZ(i)+base.getZ(i));
      }
      // The smile moves the lips and their adjoining surface. Reuse of the
      // resting normals makes the moved lip edge shade like a raised ridge.
      for(let target=1;target<=3;target++) {
        const expressionGeometry=new BufferGeometry();
        expressionGeometry.setAttribute('position',geometry.morphAttributes.position[target].clone());
        expressionGeometry.setIndex(geometry.index.clone());
        expressionGeometry.computeVertexNormals();
        const expressionNormals=expressionGeometry.attributes.normal;
        // Preserve the common head/neck boundary normals.
        for(let i=0;i<expressionNormals.count;i++)if(geometry.attributes.position.getY(i)<3.015)expressionNormals.setXYZ(i,geometry.attributes.normal.getX(i),geometry.attributes.normal.getY(i),geometry.attributes.normal.getZ(i));
        geometry.morphAttributes.normal.push(expressionNormals.clone());
        expressionGeometry.dispose();
      }
      head.geometry.dispose();head.geometry=geometry;head.position.set(0,0,0);head.scale.set(1,1,1);head.rotation.set(0,0,0);head.updateMorphTargets();
      head.userData={source:'MakeHuman Community CC0 adult facial topology',eyePositions:profiles.male.eyes,femaleEyePositions:profiles.female.eyes,authoredFace:true};
      continue;
    }
    const mesh=new Mesh(geometry,material);mesh.name=name;mesh.updateMorphTargets();
    mesh.userData={authoredHuman:true,bindings:bodyBindings,source:'MakeHuman CC0 body and male_casualsuit06',license:'CC0-1.0'};
    avatar.add(mesh);
    console.log(`${name}: ${used.length} vertices / ${faces.length} triangles`);
  }
  fullSkin.dispose();femaleSkin.dispose();
  return {eyes:profiles.male.eyes};
}

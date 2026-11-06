import { BufferGeometry, Float32BufferAttribute } from 'three';

// Local Z runs heel to toe. Upper and sole share an outline, rather than
// two long ellipsoids that leave a bulbous rear and an indistinct toe.
const outline = [
  [-.215,.012,.010],[-.196,.046,.040],[-.155,.061,.065],
  [-.090,.067,.090],[-.025,.074,.086],[.055,.087,.064],
  [.130,.090,.038],[.200,.075,.025],[.242,.040,.012],[.255,.008,.001],
];
export function avatarShoeGeometry(sole=false) {
  const vertices=[],indices=[],segments=32;
  for(const [z,width,height] of outline) {
    for(let i=0;i<segments;i++) {
      const angle=i/segments*Math.PI*2;
      const t=(Math.sin(angle)+1)/2;
      const bottom=sole?-.018:-.040;
      const top=sole?.014:height;
      vertices.push(Math.cos(angle)*(width+(sole?.002:0)),bottom+(top-bottom)*t,z);
    }
  }
  for(let ring=0;ring<outline.length-1;ring++)for(let i=0;i<segments;i++) {
    const a=ring*segments+i,b=ring*segments+(i+1)%segments,c=a+segments,d=b+segments;
    indices.push(a,b,c,b,d,c);
  }
  // Seal the heel and toe, avoiding open seams in side/rear views.
  for(const [ring,reverse] of [[0,true],[outline.length-1,false]]) {
    const center=vertices.length/3;
    const start=ring*segments;
    vertices.push(0,sole?-.002:(-.040+outline[ring][2])/2,outline[ring][0]);
    for(let i=0;i<segments;i++) {
      const a=start+i,b=start+(i+1)%segments;
      indices.push(center,reverse?b:a,reverse?a:b);
    }
  }
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

import { BoxGeometry, BufferGeometry, CanvasTexture, Color, CylinderGeometry, Float32BufferAttribute, Group, LatheGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SphereGeometry, SRGBColorSpace, TorusGeometry, Vector2 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { EffectName } from './play-state';

/** An explicitly imagined miniature stage, not a reconstruction of the real grounds. */
export function createDiorama(kind:EffectName,label?:string){
  const group=new Group(),parts:BufferGeometry[]=[];
  const palette=kind==='hats'?{base:'#b67b59',top:'#dfc7a4',edge:'#ead9ba',green:'#788b65'}:kind==='party'?{base:'#40324e',top:'#78667d',edge:'#d8b693',green:'#725b7d'}:{base:'#526e66',top:'#7ea89a',edge:'#bdceb0',green:'#577c64'};
  function add(g:BufferGeometry,color:string,x=0,y=0,z=0,sx=1,sy=1,sz=1,ry=0){
    g.scale(sx,sy,sz);g.rotateY(ry);g.translate(x,y,z);g.deleteAttribute('uv');const c=new Color(color),v=new Float32Array(g.getAttribute('position').count*3);
    for(let i=0;i<v.length;i+=3){v[i]=c.r;v[i+1]=c.g;v[i+2]=c.b;}g.setAttribute('color',new Float32BufferAttribute(v,3));parts.push(g);
  }
  const profile=[[0,-.22],[1.40,-.22],[1.62,-.14],[1.68,-.02],[1.68,.06],[1.60,.14],[0,.14]].map(([x,y])=>new Vector2(x,y));
  add(new LatheGeometry(profile,64),palette.base);
  add(new CylinderGeometry(1.59,1.62,.055,64),palette.edge,0,.145);
  add(new CylinderGeometry(1.55,1.55,.028,64),palette.top,0,.179);
  const rim=new TorusGeometry(1.60,.015,8,80);rim.rotateX(Math.PI/2);add(rim,palette.edge,0,.17);
  function tree(x:number,z:number,s:number){
    add(new CylinderGeometry(.035,.05,.46,10),'#826447',x,.42,z);
    add(new SphereGeometry(.18,16,12),palette.green,x,.75,z,s,1.2*s,s);
    add(new SphereGeometry(.13,14,10),'#93a178',x+.1*s,.64,z+.035,s,s,s);
    add(new SphereGeometry(.13,14,10),'#6b825f',x-.09*s,.63,z-.025,s,s,s);
    add(new CylinderGeometry(.25,.25,.02,24),'#9da97d',x,.206,z,1,.8,.8);
  }
  if(kind==='hats'){
    tree(-1.02,-.4,1.1);tree(.7,-1.02,.85);tree(-1.05,.65,.65);
    for(let i=0;i<8;i++)add(new BoxGeometry(.2,.012,.1),'#efe0bc',-.69+i*.2,.205,1.10);
    for(const x of [-.93,.87]){add(new BoxGeometry(.38,.045,.13),'#846849',x,.36,.5);for(const dx of [-.13,.13])add(new BoxGeometry(.03,.16,.06),'#57493d',x+dx,.27,.5);}
    add(new CylinderGeometry(.03,.035,.56,12),'#806546',.99,.48,.66);
    add(new BoxGeometry(.47,.22,.048),'#e5d4b3',.99,.75,.66,1,1,1,-.2);
  }else if(kind==='party'){
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2;add(new BoxGeometry(.09,.016,.21),i%2?'#d5bea0':'#44374c',Math.cos(a)*1.35,.212,Math.sin(a)*1.35,1,1,1,-a);}
    for(const x of [-1.14,1.14]){add(new BoxGeometry(.16,.7,.16),'#b09588',x,.54,-.18);add(new SphereGeometry(.11,16,12),'#e5c5a0',x,.98,-.18);}
    for(let i=0;i<7;i++)add(new BoxGeometry(.20,.06,.15),'#aa8d81',-.60+i*.2,.26,1.2);
  }else{
    for(let i=0;i<11;i++)add(new BoxGeometry(.18,.07,.65),i%2?'#b6996e':'#c5aa7c',-.90+i*.18,.29,.68);
    for(const x of [-.98,.98])for(const z of [.4,.92])add(new CylinderGeometry(.028,.036,.42,10),'#6d7960',x,.34,z);
    tree(-1.1,-.45,.8);tree(.94,-.65,.9);
    for(let i=0;i<7;i++){const a=i*.88;add(new SphereGeometry(.12,12,8),'#8baca1',Math.cos(a)*1.3,.22,Math.sin(a)*1.3,1.1,.45,.8);}
  }
  const geometry=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());if(!geometry)throw Error('Diorama merge failed');
  const material=new MeshStandardMaterial({vertexColors:true,roughness:.72,metalness:.05});const mesh=new Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=128;const ctx=canvas.getContext('2d')!;
  ctx.clearRect(0,0,768,128);ctx.fillStyle=kind==='party'?'#f2d1af':'#594736';ctx.font='500 43px Georgia';ctx.textAlign='center';ctx.fillText(label??(kind==='hats'?'P A R I S ,  T E X A S':kind==='party'?'L A S  V E G A S':'R A W A  P E N I N G'),384,81,720);
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;
  const plaque=new Mesh(new CylinderGeometry(1.684,1.684,.14,32,1,true,-.36,.72),new MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));plaque.position.y=-.025;group.add(plaque);
  group.userData.ownedTextures=[texture];return group;
}

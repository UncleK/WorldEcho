import { BufferGeometry, Color, ConeGeometry, Float32BufferAttribute, Group, LatheGeometry, Mesh, MeshPhysicalMaterial, SphereGeometry, SplineCurve, TorusGeometry, Vector2 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export const HAT_NAMES = ['绅士礼帽', '森林蘑菇', '小小王冠', '星星巫师', '假日草帽', '云朵主厨', '宇宙旅客'];
const PALETTES = [['#bd4d48','#f2c987','#6e302e'],['#518f86','#e5cf9c','#2c5854'],['#7972ac','#ebc79d','#454261'],['#d1a452','#fbebbb','#82623d'],['#4c789e','#d9e0c9','#2c425d'],['#c88591','#fae4c0','#714450'],['#839560','#f0dba7','#4c5a3b']];
/** Sculpted collectible hats. One material/batch, independent of the real tower. */
export function createPlayHat(kind:number,palette:number,detail:'overview'|'detail'='overview'):Group {
  const [main,accent,dark]=PALETTES[palette%7], n=detail==='detail'?40:20;
  const parts:BufferGeometry[]=[];
  function add(g:BufferGeometry,color:string,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,rz=0){
    g.scale(sx,sy,sz);g.rotateX(rx);g.rotateZ(rz);g.translate(x,y,z);g.deleteAttribute('uv');
    const c=new Color(color),values=new Float32Array(g.getAttribute('position').count*3);
    for(let i=0;i<values.length;i+=3){values[i]=c.r;values[i+1]=c.g;values[i+2]=c.b;}
    g.setAttribute('color',new Float32BufferAttribute(values,3));parts.push(g);
  }
  function lathe(points:number[][],color:string){const curve=new SplineCurve(points.map(([x,y])=>new Vector2(x,y)));add(new LatheGeometry(curve.getPoints(detail==='detail'?22:12),n),color);}
  function ring(r:number,y:number,t:number,color:string,sx=1,sz=1){add(new TorusGeometry(r,t,6,n),color,0,y,0,sx,sz,1,Math.PI/2);}
  function brim(radius:number,color:string,curve=.015,stretch=1){
    const p:number[]=[],idx:number[]=[],rows=detail==='detail'?7:4;
    for(let j=0;j<=rows;j++)for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,r=.065+(radius-.065)*j/rows;p.push(Math.cos(a)*r*stretch,.008+(j/rows)**2*(curve*(.35+Math.cos(a*2))),Math.sin(a)*r);}
    for(let j=0;j<rows;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;idx.push(a,b,a+1,a+1,b,b+1);}
    const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();const lower=g.clone();lower.translate(0,-.008,0);add(g,color);add(lower,dark);
  }
  if(kind===0){
    brim(.175,main,.012,1.12);lathe([[.096,.005],[.107,.035],[.09,.17],[.092,.235],[.075,.246],[.003,.246]],main);
    lathe([[.109,.033],[.109,.04],[.105,.076],[.101,.081]],dark);ring(.106,.047,.005,accent);add(new TorusGeometry(.018,.004,5,12),accent,0,.057,.108,1,1.15);
  }else if(kind===1){
    lathe([[.063,0],[.072,.015],[.063,.10],[.025,.12]],accent);lathe([[.004,.215],[.047,.213],[.12,.173],[.176,.08],[.181,.063],[.149,.047],[.068,.054]],main);
    for(let i=0;i<9;i++){const a=i*2.399,r=.065+(i%3)*.027,y=.205-(r/.18)**2*.14;add(new SphereGeometry(.021,10,7),accent,Math.cos(a)*r,y,Math.sin(a)*r,1,.26);}
  }else if(kind===2){
    lathe([[.11,0],[.127,.012],[.131,.057],[.126,.075]],main);ring(.127,.02,.009,accent);ring(.13,.065,.005,accent);
    for(let i=0;i<7;i++){const a=i/7*Math.PI*2,x=Math.cos(a),z=Math.sin(a);add(new ConeGeometry(.033,.12,4),main,x*.12,.112,z*.12,1,1,1,0,-x*.1);add(new SphereGeometry(.014,10,7),accent,x*.12,.178,z*.12);add(new SphereGeometry(.013,8,6),dark,x*.132,.045,z*.132,1,1.25);}
  }else if(kind===3){
    brim(.19,main,.02,1.13);const g=new ConeGeometry(.114,.37,n,6),p=g.getAttribute('position');for(let i=0;i<p.count;i++){const h=(p.getY(i)+.185)/.37;p.setX(i,p.getX(i)+h**3*.078);}g.computeVertexNormals();add(g,main,0,.183);
    ring(.111,.037,.013,dark);ring(.11,.049,.004,accent);for(let i=0;i<5;i++)add(new SphereGeometry(.009,8,6),accent,Math.sin(i*2.1)*(.1-i*.015),.08+i*.044,Math.cos(i*2.1)*(.1-i*.015));add(new SphereGeometry(.014,10,7),accent,.078,.375);
  }else if(kind===4){
    brim(.23,main,-.014,1.09);lathe([[.113,.004],[.115,.033],[.10,.116],[.071,.147],[.005,.152]],main);ring(.111,.045,.015,dark);ring(.214,-.007,.003,accent,1.09);
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;add(new SphereGeometry(.018,10,6),accent,.115+Math.cos(a)*.015,.048+Math.sin(a)*.016,.045,1,1,.4);}add(new SphereGeometry(.012,8,6),dark,.115,.048,.058);
  }else if(kind===5){
    lathe([[.084,0],[.10,.007],[.099,.106],[.089,.136]],accent);ring(.1,.016,.005,main);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;add(new SphereGeometry(.071,n/2,9),main,Math.cos(a)*.057,.171,Math.sin(a)*.057,1,1.08);}add(new SphereGeometry(.081,n/2,9),main,0,.217,0,1,1.02);for(let i=0;i<3;i++)add(new SphereGeometry(.008,8,6),dark,0,.039+i*.024,.099,1,1,.28);
  }else{
    lathe([[.061,0],[.083,.03],[.087,.13],[.066,.204],[.03,.247],[.002,.258]],main);ring(.078,.057,.006,accent);ring(.059,.006,.01,dark);add(new SphereGeometry(.032,16,10),dark,0,.144,.081,1,1,.3);add(new TorusGeometry(.033,.005,6,20),accent,0,.144,.085);
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3;add(new ConeGeometry(.038,.106,3),accent,Math.cos(a)*.088,.037,Math.sin(a)*.088);}add(new ConeGeometry(.037,.077,12),accent,0,-.028,0,1,1,1,Math.PI);
  }
  const geometry=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());if(!geometry)throw Error('Hat geometry merge failed');
  const material=new MeshPhysicalMaterial({vertexColors:true,roughness:.43,metalness:.12,clearcoat:.28,clearcoatRoughness:.38,side:2});
  const mesh=new Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;const group=new Group();group.add(mesh);group.userData.playHat=true;return group;
}
export function disposePlayObject(group:Group):void{
  const geometries=new Set<BufferGeometry>(),materials=new Set<import('three').Material>();
  group.traverse(o=>{if(o instanceof Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, BufferGeometry, CircleGeometry, Color, Float32BufferAttribute, Group, PMREMGenerator, ShaderMaterial, Vector2 } from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { EffectName } from './play-state';
export interface PlayClock { seconds:number; started:Record<EffectName,number> }

export function Studio(){
  const {gl,scene,invalidate}=useThree();
  useEffect(()=>{
    const generator=new PMREMGenerator(gl),room=new RoomEnvironment(),map=generator.fromScene(room,.06);
    scene.environment=map.texture;scene.environmentIntensity=.45;room.dispose();generator.dispose();invalidate();
    return()=>{scene.environment=null;map.dispose();};
  },[gl,scene,invalidate]);return null;
}
export function Glow(){
  const {gl,scene,camera,size}=useThree();const compositor=useRef<EffectComposer|null>(null);
  useEffect(()=>{
    const composer=new EffectComposer(gl),render=new RenderPass(scene,camera),bloom=new UnrealBloomPass(new Vector2(size.width,size.height),.38,.28,2.0),output=new OutputPass();
    composer.addPass(render);composer.addPass(bloom);composer.addPass(output);composer.setPixelRatio(Math.min(1.25,gl.getPixelRatio()));composer.setSize(size.width,size.height);compositor.current=composer;const previousReset=gl.info.autoReset;gl.info.autoReset=false;
    return()=>{gl.info.autoReset=previousReset;compositor.current=null;bloom.dispose();output.dispose();composer.dispose();};
  },[gl,scene,camera,size.width,size.height]);
  useFrame(()=>{gl.info.reset();if(compositor.current)compositor.current.render();else gl.render(scene,camera);Object.assign(gl.domElement.dataset,{playCalls:String(gl.info.render.calls),playTriangles:String(gl.info.render.triangles),playGeometries:String(gl.info.memory.geometries),playTextures:String(gl.info.memory.textures)});},1);return null;
}
export function Starfield(){
  const geometry=useMemo(()=>{
    const p:number[]=[],c:number[]=[];for(let i=0;i<180;i++){const a=i*2.399,y=Math.sin(i*9.73),r=18+(i%7);p.push(Math.cos(a)*Math.sqrt(1-y*y)*r,y*r,Math.sin(a)*Math.sqrt(1-y*y)*r);const s=.35+(i%5)*.08;c.push(s*.82,s*.9,s);}
    const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(p,3));g.setAttribute('color',new Float32BufferAttribute(c,3));return g;
  },[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <points geometry={geometry} dispose={null}><pointsMaterial size={.024} transparent opacity={.7} vertexColors sizeAttenuation depthWrite={false}/></points>;
}
export function WaterSurface({clock,active,reduced}:{clock:PlayClock;active:boolean;reduced:boolean}){
  const [water,setWater]=useState<{mesh:Reflector;material:ShaderMaterial}|null>(null);
  useEffect(()=>{const next=new Reflector(new CircleGeometry(1.5,64),{textureWidth:512,textureHeight:512,color:'#426b67',clipBias:.003}),material=next.material as ShaderMaterial;next.rotation.x=-Math.PI/2;next.position.y=.217;next.raycast=()=>{};material.uniforms.playTime={value:0};material.uniforms.playStrength={value:0};
    material.fragmentShader='uniform float playTime;uniform float playStrength;\n'+material.fragmentShader.replace('texture2DProj( tDiffuse, vUv )','texture2DProj( tDiffuse, vUv + vec4(sin(vUv.y*56.-playTime*2.),cos(vUv.x*43.+playTime*1.4),0.,0.)*.0025*playStrength )').replace('vec4( blendOverlay( base.rgb, color ), 1.0 )','vec4( mix(vec3(.12,.30,.27),blendOverlay(base.rgb,color),.55),1.0 )');
    setWater({mesh:next,material});return()=>{next.getRenderTarget().dispose();next.geometry.dispose();material.dispose();};},[]);
  useFrame(()=>{if(water){water.material.uniforms.playTime.value=reduced?0:clock.seconds;water.material.uniforms.playStrength.value=active?1:.12;}});
  return water?<primitive object={water.mesh} dispose={null}/>:null;
}
export function StageLights({clock,reduced}:{clock:PlayClock;reduced:boolean}){
  const group=useRef<Group>(null);
  const beams=useMemo(()=>[-1,1].map(side=>new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,side:2,
    uniforms:{tint:{value:new Color(side===1?'#c99bf0':'#89bbdd')}},
    vertexShader:'varying float height;varying vec3 n;varying vec3 eye;void main(){height=(1.4-position.y)/2.8;n=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);eye=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'varying float height;varying vec3 n;varying vec3 eye;uniform vec3 tint;void main(){float edge=pow(abs(dot(normalize(n),normalize(eye))),1.8);float fade=pow(1.-clamp(height,0.,1.),1.6);gl_FragColor=vec4(tint*1.6,edge*fade*.12);}'
  })),[]);
  useEffect(()=>()=>beams.forEach(m=>m.dispose()),[beams]);
  useFrame(()=>{if(group.current)group.current.rotation.y=reduced?0:Math.sin(clock.seconds*.5)*.25;});
  return <group ref={group}>{[-1,1].map((side)=><group key={side} position={[side*1.15,.2,-.35]} rotation={[0,0,side*-.25]}>
    <mesh position={[0,1.4,0]} rotation={[Math.PI,0,0]} material={beams[side===1?1:0]} raycast={()=>{}}><coneGeometry args={[.40,2.8,32,1,true]}/></mesh>
    <mesh position={[0,.09,0]}><sphereGeometry args={[.09,16,12]}/><meshStandardMaterial color="#e8d9be" emissive={side===1?'#e58ffc':'#8bbff5'} emissiveIntensity={3}/></mesh>
  </group>)}</group>;
}

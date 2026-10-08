import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, CanvasTexture, Color, Float32BufferAttribute, Group, ShaderMaterial, TubeGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HAT_FLIGHT_DURATION, HAT_FLIGHT_END, HAT_FLIGHT_START, hatFlightProgress, type HatFlightPlan } from './hat-flight';
import type { PlayRuntime } from './TowerPlay';

export default function HatLightTrail({plan,runtime,reduced}:{plan:HatFlightPlan;runtime:PlayRuntime;reduced:boolean}){
  const root=useRef<Group>(null),head=useRef<Group>(null);
  const assets=useMemo(()=>{
    const tube=(curve:HatFlightPlan['curve'],width:number,steps:number,departure:number,duration:number)=>{
      const g=new TubeGeometry(curve,steps,width,5,false),count=g.attributes.position.count;
      g.setAttribute('departure',new Float32BufferAttribute(new Float32Array(count).fill(departure),1));
      g.setAttribute('duration',new Float32BufferAttribute(new Float32Array(count).fill(duration),1));return g;
    };
    const main=tube(plan.curve,.0009,600,HAT_FLIGHT_START,HAT_FLIGHT_DURATION);
    const mainGlow=tube(plan.curve,.0038,600,HAT_FLIGHT_START,HAT_FLIGHT_DURATION);
    const branches=Array.from(plan.visits.values()).map(v=>tube(v.curve,.00065,32,v.departure,v.arrival-v.departure));
    const branchesGlow=Array.from(plan.visits.values()).map(v=>tube(v.curve,.0026,32,v.departure,v.arrival-v.departure));
    const branch=branches.length?mergeGeometries(branches):null,branchGlow=branchesGlow.length?mergeGeometries(branchesGlow):null;branches.forEach(g=>g.dispose());branchesGlow.forEach(g=>g.dispose());
    const material=(glow:boolean,branch:boolean)=>new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,toneMapped:false,
      uniforms:{age:{value:0},tint:{value:new Color(glow?'#f5a244':'#fff4da')},gain:{value:glow?.19:.95},branch:{value:branch?1:0}},
      vertexShader:'attribute float departure;attribute float duration;varying float along;varying float start;varying float span;void main(){along=uv.x;start=departure;span=duration;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:'uniform float age;uniform vec3 tint;uniform float gain;uniform float branch;varying float along;varying float start;varying float span;void main(){float head=(age-start)/span;float behind=head-along;float tail=mix(.20,1.1,branch);float a=smoothstep(0.,.015,behind)*(1.-smoothstep(tail*.18,tail,behind));float fade=1.-smoothstep(1.,1.65,head);float shimmer=.85+.15*sin(along*170.-age*22.);gl_FragColor=vec4(tint*1.5,a*gain*fade*shimmer);}'
    });
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const context=canvas.getContext('2d')!;
    const gradient=context.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'#fffce8');gradient.addColorStop(.15,'#ffe4a8dd');gradient.addColorStop(.45,'#ffb34f55');gradient.addColorStop(1,'#ff9c3000');context.fillStyle=gradient;context.fillRect(0,0,64,64);
    return {main,mainGlow,branch,branchGlow,materials:[material(false,false),material(true,false),material(false,true),material(true,true)],texture:new CanvasTexture(canvas)};
  },[plan]);
  useEffect(()=>()=>{assets.main.dispose();assets.mainGlow.dispose();assets.branch?.dispose();assets.branchGlow?.dispose();assets.materials.forEach(m=>m.dispose());assets.texture.dispose();},[assets]);
  useFrame(()=>{
    const active=!reduced&&runtime.effect==='hats'&&runtime.age>=HAT_FLIGHT_START&&runtime.age<HAT_FLIGHT_END+1.4;
    if(root.current)root.current.visible=active;
    assets.materials.forEach(m=>{m.uniforms.age.value=runtime.age;});
    if(head.current){head.current.visible=active&&runtime.age<HAT_FLIGHT_END+.15;head.current.position.copy(plan.curve.getPointAt(hatFlightProgress(runtime.age)));}
  });
  return <group ref={root} visible={false} userData={{echoTrail:true}}>
    <mesh geometry={assets.mainGlow} material={assets.materials[1]} raycast={()=>{}} dispose={null}/>
    <mesh geometry={assets.main} material={assets.materials[0]} raycast={()=>{}} dispose={null}/>
    {assets.branchGlow&&<mesh geometry={assets.branchGlow} material={assets.materials[3]} raycast={()=>{}} dispose={null}/>}
    {assets.branch&&<mesh geometry={assets.branch} material={assets.materials[2]} raycast={()=>{}} dispose={null}/>}
    <group ref={head}>
      <sprite scale={[.045,.045,1]} raycast={()=>{}}><spriteMaterial map={assets.texture} transparent opacity={.8} blending={AdditiveBlending} depthWrite={false} toneMapped={false}/></sprite>
      <pointLight color="#ffcf85" intensity={.6} distance={.38} decay={2}/>
    </group>
  </group>;
}

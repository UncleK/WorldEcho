import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { CameraControls, CameraControlsImpl } from '@react-three/drei';
import { BackSide, Box3, DoubleSide, Group, Mesh, MeshStandardMaterial, ShaderMaterial, Vector3 } from 'three';
import type { SceneTower } from '../types';
import { createTowerModel, updateTowerIllumination } from '../scene/tower-model';
import { createPlanetSurface } from '../scene/planet';
import type { LandData } from '../scene/earth-geometry';
import { angularDistance, clusterTowers, exhibitTowerHeight } from '../scene/density';
import { geoNormal, geoNorth, geoEast, geoPosition, geoRotation, isPointVisibleFromCamera } from '../scene/geo';
import { CHARACTERS, advanceClock, hatChoice, type EffectName, type PlayState } from './play-state';
import { createPlayHat, disposePlayObject } from './hat-models';
import { createDiorama } from './diorama';
import { Glow, StageLights, Starfield, Studio, WaterSurface, type PlayClock } from './stage-fx';
import landSource from '../../data/geography/ne_110m_land.geojson?raw';
export interface PlayAction { effect:EffectName; revision:number; strength?:number }
export interface WorldProps {
  towers:SceneTower[];state:PlayState;action:PlayAction|null;reduced:boolean;paused:boolean;charge:number;charging:boolean;
  onSelect:(id:string)=>void;onActivate:(effect:EffectName)=>void;onReveal:()=>void;
  onHoldStart:()=>void;onHoldEnd:()=>void;onHoldCancel:()=>void;
  onHotspot:(x:number,y:number,visible:boolean)=>void;
  clickOnly?: boolean;
}
function useModel(tower:SceneTower,detail:'overview'|'detail',night:boolean,shadow=false){
  const [model,setModel]=useState<Group|null>(null);
  useEffect(()=>{
    if(!tower.modelKey)return;
    const next=createTowerModel(tower.modelKey,detail,night?'illuminated':'heritage');
    next.traverse(o=>{if(o instanceof Mesh){o.castShadow=shadow;o.receiveShadow=shadow;}});setModel(next);
    return()=>disposePlayObject(next);
  },[tower.modelKey,detail,night,shadow]);return model;
}
function ClockDriver({clock,props}:{clock:PlayClock;props:WorldProps}){
  const {invalidate,gl,size}=useThree();const continuous=props.state.effects.some(e=>e!=='hats');
  useEffect(()=>{
    let timer:ReturnType<typeof setInterval>|undefined,previous=performance.now();
    function publish(){Object.assign(gl.domElement.dataset,{playSeconds:clock.seconds.toFixed(3),playTimer:timer?'1':'0',playPause:document.hidden?'hidden':props.paused?'manual':props.reduced?'reduced-motion':timer?'running':'idle'});}
    function resume(){
      if(timer)clearInterval(timer);timer=undefined;previous=performance.now();
      if((props.state.effects.length||props.charging)&&!props.reduced&&!props.paused&&!document.hidden)timer=setInterval(()=>{
        const now=performance.now();clock.seconds+=advanceClock(previous,now,false);previous=now;
        if(!continuous&&!props.charging&&clock.seconds>=clock.started.hats+8.5&&timer){clearInterval(timer);timer=undefined;}
        publish();invalidate();
      },1000/(size.width<700?24:30));publish();invalidate();
    }
    resume();document.addEventListener('visibilitychange',resume);return()=>{if(timer)clearInterval(timer);document.removeEventListener('visibilitychange',resume);gl.domElement.dataset.playTimer='0';};
  },[clock,gl,invalidate,size.width,continuous,props.state.effects.length,props.action?.revision,props.paused,props.reduced,props.charging]);return null;
}
function Rig({tower,close,reduced,charging}:{tower:SceneTower;close:boolean;reduced:boolean;charging:boolean}){
  const control=useRef<CameraControlsImpl>(null),initialized=useRef(false);const {camera,size}=useThree();
  useEffect(()=>{
    const mobile=size.width<700,viewLon=tower.lon+(tower.lon>0?-30:35),viewLat=tower.lat>0?tower.lat*.5:15,normal=geoNormal(viewLat,viewLon),east=geoEast(viewLon),north=geoNorth(viewLat,viewLon);
    const target=close?new Vector3(mobile?0:-1.4,mobile?1.7:1.15,0):east.clone().multiplyScalar(mobile?0:-.85);
    if(mobile&&!close)target.y=.58;
    const fit=(mobile?1.38:1.52)/Math.sin(Math.min(38*Math.PI/360,Math.atan(Math.tan(38*Math.PI/360)*size.width/size.height)));
    const position=close?new Vector3(mobile?6.2:5.25,mobile?4.3:4.0,mobile?8.1:6.9):normal.multiplyScalar(Math.max(3.55,fit)).addScaledVector(north,.25);
    camera.up.set(0,1,0);control.current?.updateCameraUp();control.current?.setLookAt(position.x,position.y,position.z,target.x,target.y,target.z,!reduced&&initialized.current);initialized.current=true;
  },[tower.id,tower.lat,tower.lon,close,reduced,camera,size.width]);
  return <CameraControls ref={control} makeDefault enabled={!charging} minDistance={close?3.7:2.4} maxDistance={close?14:12} minPolarAngle={.3} maxPolarAngle={Math.PI*.49} smoothTime={reduced?0:.40} draggingSmoothTime={reduced?0:.13}/>;
}
function SculptedHat({seed,id,detail=false,clock,delay=0,reduced,hero=false}:{seed:string;id:string;detail?:boolean;clock:PlayClock;delay?:number;reduced:boolean;hero?:boolean}){
  const choice=hatChoice(seed,id),root=useRef<Group>(null);const [hat,setHat]=useState<Group|null>(null);
  useEffect(()=>{const next=createPlayHat(choice.kind,choice.palette,detail?'detail':'overview');setHat(next);return()=>disposePlayObject(next);},[choice.kind,choice.palette,detail]);
  useFrame(()=>{if(!root.current)return;const age=reduced?20:clock.seconds-clock.started.hats,progress=Math.min(1,Math.max(0,(age-delay-1.8)/.8)),ease=1-(1-progress)**3;
    root.current.visible=progress>0;root.current.position.y=(hero?1.005:1.014)+(1-ease)*.8;root.current.scale.setScalar(.68*Math.max(.001,ease));root.current.rotation.set(0,choice.tilt*2,choice.tilt+Math.sin(progress*Math.PI*3)*(1-progress)*.25);
  });return <group ref={root} position={[0,1.014,0]}>{hat&&<primitive object={hat} dispose={null}/>}</group>;
}
function GlobalTower({tower,origin,props,clock}:{tower:SceneTower;origin:SceneTower;props:WorldProps;clock:PlayClock}){
  const night=props.state.effects.includes('party'),model=useModel(tower,'overview',night),root=useRef<Group>(null),height=(exhibitTowerHeight(tower,1.35)??.12);
  const point=useMemo(()=>geoPosition(tower.lat,tower.lon,1.005+height*1.4),[tower.lat,tower.lon,height]);
  useFrame(({camera})=>{if(root.current)root.current.visible=isPointVisibleFromCamera(camera.position,point,1);if(model&&night)updateTowerIllumination(model,props.reduced?2:clock.seconds-clock.started.party+hatChoice(props.state.seed,tower.id).palette*.45,!props.reduced);});
  return <group ref={root} position={geoPosition(tower.lat,tower.lon,1.006).toArray()} quaternion={geoRotation(tower.lat,tower.lon)} scale={height} onClick={e=>{if(e.delta<5&&isPointVisibleFromCamera(e.camera.position,e.point,1)){e.stopPropagation();props.onSelect(tower.id);}}}>
    {model&&<primitive object={model} dispose={null}/>} {props.state.effects.includes('hats')&&<SculptedHat seed={props.state.seed} id={tower.id} clock={clock} delay={angularDistance(origin,tower)*.85} reduced={props.reduced}/>}
    <mesh position={[0,.60,0]}><boxGeometry args={[.40,1.25,.40]}/><meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false}/></mesh>
  </group>;
}
export function Hero({tower,props,clock}:{tower:SceneTower;props:WorldProps;clock:PlayClock}){
  const kind=CHARACTERS.find(c=>c.id===tower.id)?.effect??'hats',night=props.state.effects.includes('party');
  const model=useModel(tower,'detail',night,true),actor=useRef<Group>(null),hatMotion=useRef<Group>(null),hotspot=useRef<Mesh>(null),holdRing=useRef<Mesh>(null);
  const [stage,setStage]=useState<Group|null>(null),[liftedHat,setLiftedHat]=useState<{object:Group;center:Vector3}|null>(null);
  const {gl}=useThree();
  useEffect(()=>{const next=createDiorama(kind,CHARACTERS.some(c=>c.id===tower.id)?undefined:tower.name);setStage(next);return()=>{for(const t of next.userData.ownedTextures??[])t.dispose();disposePlayObject(next);};},[kind,tower.id,tower.name]);
  useEffect(()=>{
    if(!model||tower.id!==CHARACTERS[0].id){setLiftedHat(null);return;}
    const source=model.children.find(o=>o.name==='texas-enamel') as Mesh|undefined;if(!source)return;
    const bounds=new Box3().setFromObject(source),center=bounds.getCenter(new Vector3()),mesh=new Mesh(source.geometry.clone(),(source.material as MeshStandardMaterial).clone());
    mesh.geometry.translate(-center.x,-center.y,-center.z);mesh.castShadow=true;const group=new Group();group.add(mesh);source.visible=false;setLiftedHat({object:group,center});
    return()=>{source.visible=true;disposePlayObject(group);};
  },[model,tower.id]);
  useEffect(()=>{if(model)gl.domElement.dataset.playHero=tower.id;},[model,tower.id,gl]);
  useFrame(({camera})=>{
    if(model&&night)updateTowerIllumination(model,props.reduced?2:clock.seconds-clock.started.party,!props.reduced);
    const age=clock.seconds-clock.started.hats,playing=props.action?.effect==='hats'&&age<2;
    if(actor.current){actor.current.rotation.z=kind!=='hats'||props.reduced?0:props.charge*Math.sin(clock.seconds*15)*.022;actor.current.scale.y=kind==='hats'?1-props.charge*.035:1;}
    if(hatMotion.current&&liftedHat){
      const p=props.reduced||!playing?0:Math.max(0,age-.18),power=props.action?.strength??.7;
      hatMotion.current.position.copy(liftedHat.center);hatMotion.current.position.y+=playing?p*(1.4+power):props.charge*.04;
      hatMotion.current.position.x+=playing?Math.sin(p*2)*p*.22:0;hatMotion.current.rotation.set(playing?p*2:0,playing?p*5:0,props.charge*.18);hatMotion.current.scale.setScalar(playing?1+p*.3:1+props.charge*.08);
    }
    if(holdRing.current){holdRing.current.scale.setScalar(1+props.charge*.7);(holdRing.current.material as import('three').MeshBasicMaterial).opacity=.18+props.charge*.55;}
    if(hotspot.current){const point=hotspot.current.getWorldPosition(new Vector3()).project(camera),rect=gl.domElement.getBoundingClientRect(),x=(point.x+1)*rect.width/2,y=(1-point.y)*rect.height/2;props.onHotspot(x,y,point.z<1&&!playing);gl.domElement.dataset.playHotspotTarget=JSON.stringify({x:rect.x+x,y:rect.y+y,effect:kind});}
  });
  function start(e:ThreeEvent<PointerEvent>){e.stopPropagation();(e.target as unknown as {setPointerCapture?:(id:number)=>void}).setPointerCapture?.(e.pointerId);props.onHoldStart();}
  function end(e:ThreeEvent<PointerEvent>){e.stopPropagation();props.onHoldEnd();}
  const y=kind==='hats'?.96:kind==='party'?.43:.015;
  return <group>
    {stage&&<primitive object={stage} dispose={null}/>}
    {kind==='water'&&<WaterSurface clock={clock} active={props.state.effects.includes('water')} reduced={props.reduced}/>}
    {night&&<StageLights clock={clock} reduced={props.reduced}/>}
    <group position={[0,kind==='water'?.224:.202,0]} scale={2.65}>
      <group ref={actor}>
        {model&&<primitive object={model} dispose={null}/>}
        {liftedHat&&<group ref={hatMotion} position={liftedHat.center.toArray()}><primitive object={liftedHat.object} dispose={null}/></group>}
        {props.state.effects.includes('hats')&&tower.id!==CHARACTERS[0].id&&<SculptedHat seed={props.state.seed} id={tower.id} clock={clock} reduced={props.reduced} detail hero/>}
      </group>
      {kind==='party'&&<mesh position={[0,.43,.13]} raycast={()=>{}}><sphereGeometry args={[.025,16,12]}/><meshStandardMaterial color="#f1dcc0" emissive="#e2bb7a" emissiveIntensity={2.4}/></mesh>}
      <mesh ref={hotspot} position={[0,y,0]} onPointerDown={props.clickOnly?undefined:start} onPointerUp={props.clickOnly?undefined:end} onPointerCancel={props.onHoldCancel} onClick={props.clickOnly?e=>{if(e.button===0&&e.delta<5){e.stopPropagation();props.onActivate(kind);}}:undefined} onPointerOver={()=>{gl.domElement.style.cursor=props.clickOnly?'pointer':'grab';}} onPointerOut={()=>{gl.domElement.style.cursor='';}}>
        <boxGeometry args={[kind==='water'?.8:.30,kind==='hats'?.16:.25,.3]}/><meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false}/>
      </mesh>
      <mesh ref={holdRing} position={[0,.008,0]} rotation={[-Math.PI/2,0,0]} raycast={()=>{}}><ringGeometry args={[.33,.34,64]}/><meshBasicMaterial color={kind==='hats'?'#efc38a':kind==='party'?'#dbabff':'#91e6d9'} transparent opacity={.22} toneMapped={false}/></mesh>
    </group>
  </group>;
}
function WorldShell({clock,water,reduced,origin}:{clock:PlayClock;water:boolean;reduced:boolean;origin:Vector3}){
  const mat=useMemo(()=>new ShaderMaterial({side:BackSide,transparent:true,depthWrite:false,uniforms:{t:{value:0},water:{value:0},origin:{value:origin}},
    vertexShader:'varying vec3 p;varying vec3 n;varying vec3 v;void main(){p=normalize(position);n=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);v=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'varying vec3 p;varying vec3 n;varying vec3 v;uniform vec3 origin;uniform float t;uniform float water;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(v))),3.);float a=acos(clamp(dot(p,origin),-1.,1.));float radius=mod(t*.55,3.7);float d0=(a-radius)*40.;float d1=(a-radius+.13)*45.;float d2=(a-radius+.25)*48.;float waves=(exp(-d0*d0)+.36*exp(-d1*d1)+.14*exp(-d2*d2))*water;gl_FragColor=vec4(mix(vec3(.25,.68,.70),vec3(.64,.92,.87),water),rim*.30+waves*.44);}'
  }),[origin]);useEffect(()=>()=>mat.dispose(),[mat]);useFrame(()=>{mat.uniforms.t.value=reduced?0:clock.seconds-clock.started.water;mat.uniforms.water.value=water?1:0;});
  useEffect(()=>{mat.side=water?DoubleSide:BackSide;mat.needsUpdate=true;},[water,mat]);
  return <mesh material={mat} raycast={()=>{}}><sphereGeometry args={[water?1.035:1.018,64,48]}/></mesh>;
}
function Contents(props:WorldProps){
  const {gl,invalidate}=useThree(),selected=props.towers.find(t=>t.id===props.state.selectedId)??props.towers[0];
  const origin=props.towers.find(t=>t.id===CHARACTERS[0].id)??selected;
  const lake=props.towers.find(t=>t.id===CHARACTERS[2].id)??selected;
  const clock=useMemo<PlayClock>(()=>({seconds:20,started:{hats:0,party:0,water:0}}),[]),revealed=useRef(-1);
  const heroGroup=useRef<Group>(null),worldGroup=useRef<Group>(null),closeBlend=useRef(props.state.close?1:0);
  const [planet,setPlanet]=useState<ReturnType<typeof createPlanetSurface>|null>(null);
  useEffect(()=>{const p=createPlanetSurface(null,null,false,'porcelain',JSON.parse(landSource) as LandData);p.material.color.set('#397f83');p.material.roughness=.42;p.material.metalness=.16;if(p.land){p.land.material.color.set('#adc5aa');p.land.material.roughness=.73;}if(p.coast)p.coast.material.color.set('#789990');setPlanet(p);return()=>p.dispose();},[]);
  const exhibited=useMemo(()=>clusterTowers(props.towers,selected.id,1.35).map(c=>c.representative),[props.towers,selected.id]);
  const lakeOrigin=useMemo(()=>geoNormal(lake.lat,lake.lon),[lake.lat,lake.lon]);
  useEffect(()=>{if(props.action)clock.started[props.action.effect]=clock.seconds;invalidate();},[props.action,clock,invalidate]);
  useEffect(()=>{Object.assign(gl.domElement.dataset,{playReady:planet?'1':'0',playModels:String(exhibited.length),playPlaces:String(props.towers.length),playEffects:props.state.effects.join('.'),playSeed:props.state.seed,playSelected:selected.id,playView:props.state.close?'diorama':'globe'});invalidate();},[gl,invalidate,planet,exhibited.length,props.state,props.towers.length,selected.id]);
  useFrame(()=>{
    const target=props.state.close?1:0;
    closeBlend.current=props.reduced?target:closeBlend.current+(target-closeBlend.current)*.14;
    if(Math.abs(closeBlend.current-target)<.002)closeBlend.current=target;else invalidate();
    const blend=closeBlend.current;
    if(planet){planet.material.color.set(props.state.effects.includes('party')?'#153e50':props.state.effects.includes('water')?'#347c82':'#397f83');if(planet.land)planet.land.material.color.set(props.state.effects.includes('party')?'#577775':'#adc5aa');}
    if(heroGroup.current){heroGroup.current.visible=blend>.001;heroGroup.current.scale.setScalar(Math.max(.001,blend));heroGroup.current.position.y=-(1-blend)*.7;}
    if(worldGroup.current){worldGroup.current.visible=blend<.999;worldGroup.current.scale.setScalar(1-.25*blend);}
    if(props.action&&props.state.close&&revealed.current!==props.action.revision&&(props.reduced||clock.seconds-clock.started[props.action.effect]>1.9)){revealed.current=props.action.revision;props.onReveal();}
  });
  const party=props.state.effects.includes('party'),water=props.state.effects.includes('water');
  return <>
    <Studio/><Starfield/><Glow/><Rig tower={selected} close={props.state.close} reduced={props.reduced} charging={props.charging}/><ClockDriver clock={clock} props={props}/>
    <ambientLight intensity={party?.12:.25}/><hemisphereLight args={['#c7daec','#604941',party?.4:.75]}/>
    <directionalLight position={[4,7,5]} intensity={party?.75:2.3} color="#ffe1b9" castShadow={props.state.close} shadow-mapSize={[2048,2048]} shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={5} shadow-camera-bottom={-2} shadow-normalBias={.012} shadow-bias={-.0002}/>
    <directionalLight position={[-4,3,-3]} intensity={party?1.8:1.1} color={party?'#be8fec':'#94c9df'}/>
    <directionalLight position={[1,2,-4]} intensity={1.4} color="#dac4e4"/>
    <group ref={heroGroup} visible={props.state.close}><Hero tower={selected} props={props} clock={clock}/></group>
    <group ref={worldGroup} visible={!props.state.close}>
      {planet&&<><mesh geometry={planet.geometry} material={planet.material} dispose={null}/>{planet.land&&<mesh geometry={planet.land.geometry} material={planet.land.material} dispose={null}/>} {planet.coast&&<mesh geometry={planet.coast.geometry} material={planet.coast.material} dispose={null}/>}</>}
      {exhibited.map(t=><GlobalTower key={t.id} tower={t} origin={origin} props={props} clock={clock}/>)}
      <WorldShell clock={clock} water={water} reduced={props.reduced} origin={lakeOrigin}/>
    </group>
  </>;
}
export default function PlayWorld(props:WorldProps){return <Canvas frameloop="demand" shadows dpr={[1,1.5]} camera={{position:[4.7,3.65,6.2],fov:38,near:.03,far:60}} gl={{alpha:true,antialias:true,powerPreference:'high-performance'}}><Contents {...props}/></Canvas>;}

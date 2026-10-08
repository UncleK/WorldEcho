import {useEffect,useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import {AdditiveBlending,NormalBlending,ConeGeometry,DoubleSide,InstancedBufferAttribute,InstancedMesh,Matrix4,RingGeometry,ShaderMaterial,Vector3} from 'three';
import {geoPosition,geoRotation} from './geo';
import {hashIdentity} from '../playground/play-state';
import {effectSeconds,type PlayRuntime} from './play-runtime';
import type {HatFlightTower} from './hat-flight';
import type {WorldShowPlan} from './world-shows';

export function WorldShowField({plan,runtime,reduced}:{plan:WorldShowPlan;runtime:PlayRuntime;reduced:boolean}){
  const water=plan.kind==='water';
  const material=useMemo(()=>new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,toneMapped:false,
    uniforms:{age:{value:0},origin:{value:plan.normal},extent:{value:plan.extent},water:{value:water?1:0}},
    vertexShader:'varying vec3 p;varying vec3 n;varying vec3 eye;void main(){p=normalize(position);n=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);eye=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader:`uniform float age;uniform float extent;uniform float water;uniform vec3 origin;varying vec3 p;varying vec3 n;varying vec3 eye;
      void main(){float a=acos(clamp(dot(p,origin),-1.,1.));float travel=mix(4.7,6.3,water);float first=max(0.,age-.35)/travel*extent;
        float front=mix(first,mod(max(0.,age-.35),11.)/6.3*extent,water);float reached=smoothstep(a-.04,a+.04,first);
        float d=(a-front)*mix(48.,72.,water);float ring=exp(-d*d);
        float d2=(a-front+.07)*80.;float d3=(a-front+.14)*95.;ring+=water*(.5*exp(-d2*d2)+.2*exp(-d3*d3));
        float rim=pow(1.-abs(dot(normalize(n),normalize(eye))),2.4);
        vec3 color=mix(mix(vec3(.62,.20,.92),vec3(.22,.76,.94),.5+.5*sin(a*5.-age*.9)),vec3(.32,.85,.80),water);
        float partyFade=1.-smoothstep(5.1,6.3,age);float caustic=pow(.5+.5*sin(p.x*43.+age*.5+sin(p.z*39.-age*.7)),8.);
        float alpha=ring*mix(.58*partyFade,.55,water)+reached*(water*(.045+.065*rim+.035*caustic)+(1.-water)*rim*.08);
        gl_FragColor=vec4(color,alpha);}`
  }),[plan,water]);
  useEffect(()=>()=>material.dispose(),[material]);
  useFrame(()=>{material.uniforms.age.value=effectSeconds(runtime,plan.kind,reduced);});
  return <mesh material={material} raycast={()=>{}} userData={{echoShowField:plan.kind}}><sphereGeometry args={[1.0075,144,112]}/></mesh>;
}

/** All displayed models get an instance. Count and transforms come from the live filtered scene. */
export function WorldShowInstances({plan,towers,runtime,reduced}:{plan:WorldShowPlan;towers:HatFlightTower[];runtime:PlayRuntime;reduced:boolean}){
  const water=plan.kind==='water';
  const assets=useMemo(()=>{
    const geometry=water?new RingGeometry(.002,1,48,8):new ConeGeometry(.21,1,24,1,true);
    if(water)geometry.rotateX(-Math.PI/2);else{geometry.rotateZ(Math.PI);geometry.translate(0,.5,0);}
    geometry.setAttribute('showArrival',new InstancedBufferAttribute(Float32Array.from(towers,t=>plan.arrivals.get(t.id)??0),1));
    geometry.setAttribute('showPhase',new InstancedBufferAttribute(Float32Array.from(towers,t=>(hashIdentity(t.id)%1000)/1000*Math.PI*2),1));
    const material=new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,blending:water?NormalBlending:AdditiveBlending,toneMapped:false,
      uniforms:{age:{value:0},water:{value:water?1:0}},
      vertexShader:`attribute float showArrival;attribute float showPhase;uniform float age;uniform float water;varying vec2 vUv;varying float arrived;varying float phase;varying float h;varying vec3 n;varying vec3 eye;
        void main(){vUv=uv;arrived=showArrival;phase=showPhase;h=position.y;vec3 p=position;
          if(water<.5){p.x+=sin(age*.7+phase)*p.y*.32;p.z+=cos(age*.5+phase)*p.y*.25;}
          vec4 world=instanceMatrix*vec4(p,1.);if(water>.5)world.xyz=normalize(world.xyz)*length(instanceMatrix[3].xyz);
          vec4 mv=modelViewMatrix*world;n=normalize(normalMatrix*mat3(instanceMatrix)*normal);eye=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`uniform float age;uniform float water;varying vec2 vUv;varying float arrived;varying float phase;varying float h;varying vec3 n;varying vec3 eye;
        void main(){float gate=smoothstep(arrived,arrived+.65,age);vec3 color=mix(vec3(.53,.30,.94),vec3(.19,.75,.94),.5+.5*sin(phase+age*.35));float alpha;
          if(water>.5){float r=length(vUv-.5)*2.;float wave=pow(.5+.5*sin(r*28.-age*2.2+phase),12.);float edge=1.-smoothstep(.75,1.,r);color=mix(vec3(.10,.37,.43),vec3(.52,.94,.87),wave);alpha=(.08+wave*.42)*edge*gate;}
          else{float face=pow(abs(dot(normalize(n),normalize(eye))),.8);alpha=smoothstep(0.,.06,h)*pow(max(0.,1.-h),1.7)*face*.32*gate;}
          gl_FragColor=vec4(color,alpha);}`
    });
    const mesh=new InstancedMesh(geometry,material,towers.length),matrix=new Matrix4();mesh.raycast=()=>{};mesh.frustumCulled=false;
    towers.forEach((tower,i)=>{
      const scale=water?Math.max(.012,tower.height*.46):Math.max(.085,tower.height*2.2);
      matrix.compose(geoPosition(tower.lat,tower.lon,tower.radius+(water?.0018:tower.height*.08)),geoRotation(tower.lat,tower.lon),new Vector3(scale,scale,scale));mesh.setMatrixAt(i,matrix);
    });mesh.instanceMatrix.needsUpdate=true;mesh.userData.echoInstances=plan.kind;
    return {mesh,geometry,material};
  },[plan,towers,water]);
  useEffect(()=>()=>{assets.mesh.dispose();assets.geometry.dispose();assets.material.dispose();},[assets]);
  useFrame(()=>{assets.material.uniforms.age.value=effectSeconds(runtime,plan.kind,reduced);});
  return <primitive object={assets.mesh} dispose={null}/>;
}

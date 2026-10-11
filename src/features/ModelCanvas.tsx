import { useEffect, useRef, useState } from 'react';
import type { TowerRenderStyle } from '../types';
import { t } from '../i18n';
import { useTheme } from '../theme';
import { useReducedMotion } from '../domain/useReducedMotion';

/** Shared live model renderer used by archive cards and the standalone viewer. */
export default function ModelCanvas({ modelKey, style, className='model-viewer-canvas', name }: {modelKey:string;style:TowerRenderStyle;className?:string;name:string}) {
  const mount=useRef<HTMLDivElement>(null),theme=useTheme(),reducedMotion=useReducedMotion();
  const [error,setError]=useState('');
  useEffect(()=>{
    let dispose=()=>{};let cancelled=false;setError('');
    Promise.all([import('three'),import('three/addons/controls/OrbitControls.js'),import('three/addons/environments/RoomEnvironment.js'),import('../scene/tower-model')]).then(([THREE,{OrbitControls},{RoomEnvironment},{createTowerModel,getTowerIllumination,updateTowerIllumination}])=>{
      if(cancelled||!mount.current)return;const element=mount.current;
      const nightScheme=getTowerIllumination(modelKey);
      const natural=['ca-beloeil-cypress-tree','us-kings-island-ohio-eiffel-tower-topiary','us-gasquet-gasquet-market'].includes(modelKey);
      const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(element.clientWidth,element.clientHeight);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
      renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
      // Tower and studio lights stay fixed while the visitor orbits. Bake the
      // depth map once; the animated emissive programme needs no shadow redraw.
      renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;element.append(renderer.domElement);
      const preventMiddleScroll=(event:PointerEvent)=>{if(event.button===1)event.preventDefault();};renderer.domElement.addEventListener('pointerdown',preventMiddleScroll);
      const scene=new THREE.Scene();scene.background=new THREE.Color(theme==='light'&&style!=='illuminated'?'#e7eef4':style==='illuminated'?'#050916':'#0c1825');
      const environment=new RoomEnvironment();const generator=new THREE.PMREMGenerator(renderer);const texture=generator.fromScene(environment).texture;scene.environment=texture;scene.environmentIntensity=style==='illuminated'?.12:natural?.23:.42;environment.dispose();generator.dispose();
      const tower=createTowerModel(modelKey,'detail',style);scene.add(tower);
      scene.add(new THREE.HemisphereLight('#dceafa','#51483d',style==='illuminated'?.22:natural?.38:.65));
      const key=new THREE.DirectionalLight('#fff0db',style==='illuminated'?.6:2.7);key.position.set(-1.5,2.2,2);key.target.position.set(0,.4,0);scene.add(key,key.target);
      key.castShadow=true;key.shadow.mapSize.set(2048,2048);
      Object.assign(key.shadow.camera,{left:-.75,right:.75,top:.8,bottom:-.8,near:.1,far:6});key.shadow.camera.updateProjectionMatrix();
      key.shadow.bias=-.000015;key.shadow.normalBias=.00025;
      const rim=new THREE.DirectionalLight('#c7ddf5',style==='illuminated'?.15:.55);rim.position.set(1.4,1.3,-1.8);scene.add(rim);
      // Transparent shadow catcher represents only a neutral display plane,
      // not a fabricated site, pedestal or change to the normalized tower.
      const groundGeometry=new THREE.PlaneGeometry(12,12),groundMaterial=new THREE.ShadowMaterial({color:'#07101b',opacity:style==='illuminated'?.22:theme==='light'?.30:.38});
      const footprint=new THREE.Box3().setFromObject(tower).getSize(new THREE.Vector3());
      const shadowInner=Math.max(footprint.x,footprint.z)*.7,shadowOuter=shadowInner+.55;
      groundMaterial.onBeforeCompile=shader=>{
        shader.vertexShader='varying vec2 vGroundPosition;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGroundPosition=position.xy;');
        shader.fragmentShader='varying vec2 vGroundPosition; uniform vec2 groundFade;\n'+shader.fragmentShader;
        shader.uniforms.groundFade={value:new THREE.Vector2(shadowInner,shadowOuter)};
        shader.fragmentShader=shader.fragmentShader.replace('#include <tonemapping_fragment>','gl_FragColor.a *= 1.0-smoothstep(groundFade.x,groundFade.y,length(vGroundPosition));\n#include <tonemapping_fragment>');
      };
      groundMaterial.customProgramCacheKey=()=> 'worldecho-viewer-ground-fade-v1';
      const ground=new THREE.Mesh(groundGeometry,groundMaterial);ground.rotation.x=-Math.PI/2;ground.position.y=-.0006;ground.receiveShadow=true;scene.add(ground);
      const camera=new THREE.PerspectiveCamera(35,element.clientWidth/element.clientHeight,.001,30);
      const framing=Math.max(1,Math.max(footprint.x,footprint.z)/(camera.aspect*1.05));
      camera.position.set(framing,.5+.18*framing,1.8*framing);
      const controls=new OrbitControls(camera,renderer.domElement);controls.mouseButtons.MIDDLE=THREE.MOUSE.PAN;controls.target.set(0,.5,0);controls.minDistance=.35;controls.maxDistance=Math.max(5,framing*4);controls.enableDamping=false;controls.update();
      let elapsed=0,previous=performance.now();
      let animationTimer:number|undefined;
      let visibilityChanged: (()=>void)|undefined;
      const render=()=>{const now=performance.now();if(!document.hidden)elapsed+=Math.max(0,now-previous)/1000;previous=now;if(style==='illuminated')updateTowerIllumination(tower,elapsed,!reducedMotion);renderer.render(scene,camera);};
      controls.addEventListener('change',render);render();
      if(style==='illuminated'&&!reducedMotion&&nightScheme.programme.mode!=='static'){
        const interval=matchMedia('(max-width:760px), (pointer:coarse)').matches?1000/12:1000/24;
        const tick=()=>{if(document.hidden)return;render();animationTimer=window.setTimeout(tick,interval);};
        visibilityChanged=()=>{window.clearTimeout(animationTimer);previous=performance.now();if(!document.hidden)animationTimer=window.setTimeout(tick,interval);};
        document.addEventListener('visibilitychange',visibilityChanged);visibilityChanged();
      }
      const observer=new ResizeObserver(()=>{renderer.setSize(element.clientWidth,element.clientHeight);camera.aspect=element.clientWidth/element.clientHeight;camera.updateProjectionMatrix();render();});observer.observe(element);
      dispose=()=>{window.clearTimeout(animationTimer);if(visibilityChanged)document.removeEventListener('visibilitychange',visibilityChanged);observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('pointerdown',preventMiddleScroll);tower.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();for(const material of Array.isArray(object.material)?object.material:[object.material])material.dispose();}});groundGeometry.dispose();groundMaterial.dispose();key.shadow.dispose();texture.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
    }).catch(error=>{if(!cancelled){console.error('WorldEcho model viewer failed',error);setError(t('三维暂未能打开，仍可查看照片与来源。'));}});
    return()=>{cancelled=true;dispose();};
  },[modelKey,style,reducedMotion,theme]);
  return <div className={className} ref={mount} aria-label={t('{0}三维模型',name)}>{error&&<p role="alert">{error}</p>}</div>;
}

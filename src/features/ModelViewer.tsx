import { useEffect, useRef, useState } from 'react';
import { Flag, X } from 'lucide-react';
import { t, useLanguage } from '../i18n';
import CommunityForm from './CommunityForm';
import type { TowerRenderStyle } from '../types';
import type { ModelCollection } from '../domain/catalog';
import { useReducedMotion } from '../domain/useReducedMotion';
import { useTheme } from '../theme';
import './model-viewer.css';
export default function ModelViewer({ modelKey, towerId, name, partial=false, modelCollection, modelContext, initialStyle='heritage', onClose }: { modelKey:string;towerId:string;name:string;partial?:boolean;modelCollection?:ModelCollection;modelContext?:'tower-body'|'inferred-completion';initialStyle?:TowerRenderStyle;onClose:()=>void }) {
  useLanguage();const theme=useTheme(),dialog=useRef<HTMLDialogElement>(null), mount=useRef<HTMLDivElement>(null);
  const [style,setStyle]=useState<TowerRenderStyle>(initialStyle),[error,setError]=useState('');
  const [feedbackOpen,setFeedbackOpen]=useState(false);
  const reducedMotion=useReducedMotion();
  useEffect(()=>{const opener=document.activeElement;dialog.current?.showModal();return()=>{dialog.current?.close();if(opener instanceof HTMLElement && opener.isConnected)opener.focus();};},[]);
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
    }).catch(()=>{if(!cancelled)setError(t('三维暂未能打开，仍可查看照片与来源。'));});
    return()=>{cancelled=true;dispose();};
  },[modelKey,style,reducedMotion,theme,partial]);
  return <dialog ref={dialog} className="model-viewer" onCancel={onClose} aria-labelledby="model-viewer-title" onClick={event=>{if(event.target===event.currentTarget)onClose();}}><header><div><h2 id="model-viewer-title">{name}</h2><p>{modelContext==='inferred-completion'?(modelCollection==='related'?t('相关建筑参考 · 含推测补全 · 自由旋转'):t('根据实景与比例推测补全 · 自由旋转')):modelCollection==='other'?t('其他类型 · 保留的简化模型 · 自由旋转'):modelCollection==='related'?t("相关建筑参考 · 地方改造轮廓 · 自由旋转"):partial?t("仅可见塔段的模型 · 统一展示尺寸 · 自由旋转"):t('实景依据的简化模型 · 统一展示高度 · 自由旋转')}</p>{modelContext==='tower-body'&&<p>{t('模型仅包含塔体，未包含实景高台座。')}</p>}</div><button onClick={onClose} aria-label={t('关闭')}><X size={22}/></button></header><div className="model-viewer-canvas" ref={mount}>{error&&<p role="alert">{error}</p>}</div><footer><select aria-label={t('建筑渲染风格')} value={style} onChange={event=>setStyle(event.target.value as TowerRenderStyle)}>{(['heritage','metal','porcelain','blueprint','illuminated'] as const).map((value,index)=><option key={value} value={value}>{t(['实景色','金属','瓷器','线稿','灯光夜景'][index])}</option>)}</select><span>{t('拖动旋转 · 滚轮缩放 · 中键或右键平移')}</span><button className="model-feedback" onClick={()=>setFeedbackOpen(true)} title={t('发现资料有误？告诉我们')}><Flag size={15}/>{t('反馈')}</button></footer>{feedbackOpen&&<CommunityForm mode={{type:'feedback',towerId,name}} onClose={()=>setFeedbackOpen(false)}/>}</dialog>;
}
